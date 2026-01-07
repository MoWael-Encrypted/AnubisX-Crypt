// encrypt_mpi.cpp
#include "common.hpp"

#include <mpi.h>
#ifdef _OPENMP
#include <omp.h>
#endif
#include <fstream>
#include <iostream>
#include <vector>
#include <algorithm>
#include <cstdint>

int main(int argc, char** argv) {
    // IMPORTANT: initialize MPI first, so all ranks see the same argc/argv
    MPI_Init(&argc, &argv);

    int rank = 0, nprocs = 1;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &nprocs);

    try {
        // Parse arguments on ALL ranks
        Args a = parseArgs(argc, argv);

        #ifdef _OPENMP
        if (a.threads > 0) omp_set_num_threads(a.threads);
        #endif

        // Rank 0 gets file size and prepares output file, then broadcasts size.
        std::uint64_t fsize = 0;
        if (rank == 0) {
            fsize = fileSizeBytes(a.inPath);

            if (!prepareOutputFile(a.outPath, fsize)) {
                std::cerr << "Failed to create output file: " << a.outPath << "\n";
                MPI_Abort(MPI_COMM_WORLD, 1);
            }
        }

        // Share file size with all ranks
        MPI_Bcast(&fsize, 1, MPI_UINT64_T, 0, MPI_COMM_WORLD);

        // Make sure output file exists before other ranks try to open it
        MPI_Barrier(MPI_COMM_WORLD);

        if (fsize == 0) {
            if (rank == 0) std::cout << "MPI done. Empty file.\n";
            MPI_Finalize();
            return 0;
        }

        const std::uint64_t chunk = a.chunkSize;
        const std::uint64_t numChunks = (fsize + chunk - 1) / chunk;

        // Timing: start on rank 0
        double t0 = 0.0;
        if (rank == 0) t0 = nowSeconds();

        // Open input and output file streams once per rank
            std::ifstream in(a.inPath, std::ios::binary);
            std::fstream out(a.outPath, std::ios::binary | std::ios::in | std::ios::out);
        // Each rank handles chunk indices: rank, rank+nprocs, rank+2*nprocs, ...
        for (std::uint64_t i = static_cast<std::uint64_t>(rank); i < numChunks; i += static_cast<std::uint64_t>(nprocs)) {
            std::uint64_t offset = i * chunk;
            std::size_t n = static_cast<std::size_t>(std::min<std::uint64_t>(chunk, fsize - offset));


            if (!in || !out) {
                // If any rank cannot open files, abort so you notice the failure.
                if (rank == 0) {
                    std::cerr << "Failed to open input/output files on rank " << rank << "\n";
                }
                MPI_Abort(MPI_COMM_WORLD, 1);
            }

            std::vector<unsigned char> buf(n);

            // Read chunk
            in.seekg(static_cast<std::streamoff>(offset));
            in.read(reinterpret_cast<char*>(buf.data()), static_cast<std::streamsize>(n));

            // Transform in-place (encrypt/decrypt)
            transformBuffer(buf.data(), n, a.key, a.mode);

            // Write chunk back to same offset
            out.seekp(static_cast<std::streamoff>(offset));
            out.write(reinterpret_cast<const char*>(buf.data()), static_cast<std::streamsize>(n));
        }

        // Everyone finish
        MPI_Barrier(MPI_COMM_WORLD);

        // Print stats on rank 0
        if (rank == 0) {
            double t1 = nowSeconds();
            double sec = t1 - t0;
            double mb = static_cast<double>(fsize) / (1024.0 * 1024.0);
            double thr = (sec > 0.0) ? (mb / sec) : 0.0;

            std::cout << "MPI done. Processes=" << nprocs
                      << " Time(s)=" << sec
                      << " Throughput(MB/s)=" << thr << "\n";
        }

        MPI_Finalize();
        return 0;

    } catch (const std::exception& e) {
        if (rank == 0) std::cerr << "Error: " << e.what() << "\n";
        MPI_Abort(MPI_COMM_WORLD, 1);
        // MPI_Abort does not return normally, but keep return for compilers:
        return 1;
    }
}
