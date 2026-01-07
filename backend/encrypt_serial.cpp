#include "common.hpp"
#include <fstream>
#include <iostream>
#include <vector>
#include <algorithm>

int main(int argc, char** argv) {
    try {
        Args a = parseArgs(argc, argv);

        std::uint64_t size = fileSizeBytes(a.inPath);
        if (!prepareOutputFile(a.outPath, size)) {
            std::cerr << "Failed to create output file\n";
            return 1;
        }

        std::ifstream in(a.inPath, std::ios::binary);
        std::fstream out(a.outPath, std::ios::binary | std::ios::in | std::ios::out);
        if (!in || !out) {
            std::cerr << "Failed to open files\n";
            return 1;
        }

        std::vector<unsigned char> buf;
        buf.resize(static_cast<std::size_t>(a.chunkSize));

        std::uint64_t numChunks = (size + a.chunkSize - 1) / a.chunkSize;

        double t0 = nowSeconds();

        for (std::uint64_t i = 0; i < numChunks; i++) {
            std::uint64_t offset = i * a.chunkSize;
            std::size_t n = static_cast<std::size_t>(
                std::min<std::uint64_t>(a.chunkSize, size - offset)
            );

            in.seekg(static_cast<std::streamoff>(offset));
            in.read(reinterpret_cast<char*>(buf.data()), static_cast<std::streamsize>(n));

            transformBuffer(buf.data(), n, a.key, a.mode);

            out.seekp(static_cast<std::streamoff>(offset));
            out.write(reinterpret_cast<const char*>(buf.data()), static_cast<std::streamsize>(n));
        }

        double t1 = nowSeconds();
        double sec = t1 - t0;
        double mb = static_cast<double>(size) / (1024.0 * 1024.0);
        double thr = (sec > 0) ? (mb / sec) : 0.0;

        std::cout << "SERIAL done. Time(s)=" << sec
                  << "  Throughput(MB/s)=" << thr << "\n";
        return 0;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}
