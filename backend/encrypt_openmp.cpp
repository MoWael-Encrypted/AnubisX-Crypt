#include "common.hpp"
#include <fstream>
#include <iostream>
#include <vector>
#include <algorithm>

#ifdef _OPENMP
#include <omp.h>
#endif

int main(int argc, char** argv) {
    try {
        Args a = parseArgs(argc, argv);

        std::uint64_t size = fileSizeBytes(a.inPath);
        if (!prepareOutputFile(a.outPath, size)) {
            std::cerr << "Failed to create output file\n";
            return 1;
        }

        std::uint64_t numChunks = (size + a.chunkSize - 1) / a.chunkSize;

#ifdef _OPENMP
        if (a.threads > 0) omp_set_num_threads(a.threads);
#endif

        // Inside main in encrypt_openmp.cpp
        double t0 = nowSeconds();

        #pragma omp parallel
        {
            // Open streams ONCE per thread instead of once per chunk
            std::ifstream in(a.inPath, std::ios::binary);
            std::fstream out(a.outPath, std::ios::binary | std::ios::in | std::ios::out);

            #pragma omp for schedule(static)
            for (long long i = 0; i < (long long)numChunks; i++) {
                std::uint64_t offset = (std::uint64_t)i * a.chunkSize;
                std::size_t n = (std::size_t)std::min<std::uint64_t>(a.chunkSize, size - offset);

                std::vector<unsigned char> buf(n);
                in.seekg((std::streamoff)offset);
                in.read((char*)buf.data(), (std::streamsize)n);

                transformBuffer(buf.data(), n, a.key, a.mode);

                out.seekp((std::streamoff)offset);
                out.write((const char*)buf.data(), (std::streamsize)n);
            }
        }
        double t1 = nowSeconds();
        double sec = t1 - t0;
        double mb = (double)size / (1024.0 * 1024.0);
        double thr = (sec > 0) ? (mb / sec) : 0.0;

        std::cout << "OPENMP done. Time(s)=" << sec
                  << " Throughput(MB/s)=" << thr << "\n";
        return 0;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}
