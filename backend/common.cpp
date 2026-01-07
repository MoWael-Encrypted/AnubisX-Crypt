#include "common.hpp"
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <vector>

// ------------------------------------------------------------------
// Usage Helper
// ------------------------------------------------------------------
static void usage() {
    std::cout <<
    "Usage:\n"
    "  --in <file> --out <file> --mode enc|dec [--key N] [--chunk BYTES] [--threads N]\n"
    "\n"
    "Examples:\n"
    "  --in logs/a.log --out outputs/a.enc --mode enc --key 3 --chunk 4194304\n"
    "  --in outputs/a.enc --out outputs/a.dec --mode dec --key 3\n";
}

// ------------------------------------------------------------------
// Argument Parsing
// ------------------------------------------------------------------
Args parseArgs(int argc, char** argv) {
    Args a;
    for (int i = 1; i < argc; i++) {
        std::string s = argv[i];

        auto needValue = [&](const std::string& opt) {
            if (i + 1 >= argc) {
                usage();
                throw std::runtime_error("Missing value for " + opt);
            }
            return std::string(argv[++i]);
        };

        if (s == "--in") {
            a.inPath = needValue("--in");
        } else if (s == "--out") {
            a.outPath = needValue("--out");
        } else if (s == "--mode") {
            std::string m = needValue("--mode");
            if (m == "enc") a.mode = Mode::Encrypt;
            else if (m == "dec") a.mode = Mode::Decrypt;
            else {
                usage();
                throw std::runtime_error("Invalid --mode (use enc or dec)");
            }
        } else if (s == "--key") {
            a.key = std::stoi(needValue("--key"));
        } else if (s == "--chunk") {
            a.chunkSize = static_cast<std::uint64_t>(std::stoull(needValue("--chunk")));
        } else if (s == "--threads") {
            a.threads = std::stoi(needValue("--threads"));
        } else if (s == "--help" || s == "-h") {
            usage();
            std::exit(0);
        } else {
            usage();
            throw std::runtime_error("Unknown option: " + s);
        }
    }

    if (a.inPath.empty() || a.outPath.empty()) {
        usage();
        throw std::runtime_error("You must provide --in and --out");
    }
    if (a.chunkSize == 0) throw std::runtime_error("--chunk must be > 0");
    return a;
}

// ------------------------------------------------------------------
// File Helpers
// ------------------------------------------------------------------
std::uint64_t fileSizeBytes(const std::string& path) {
    std::error_code ec;
    auto sz = std::filesystem::file_size(path, ec);
    if (ec) throw std::runtime_error("Cannot get file size: " + path);
    return static_cast<std::uint64_t>(sz);
}

// ------------------------------------------------------------------
// CORE PROCESSING LOGIC
// ------------------------------------------------------------------
void transformBuffer(unsigned char* data, std::size_t n, int key, Mode mode) {
    // Normalize key to [0,255]
    int k = key % 256;
    if (k < 0) k += 256;

    // LOOP: Process every byte
    #pragma omp parallel for
    for (long long i = 0; i < (long long)n; i++) {
        
        // -------------------------------------------------------------
        // ARTIFICIAL CPU LOAD
        // -------------------------------------------------------------
        // The 'volatile' keyword prevents the compiler from optimizing 
        // away this "useless" math. This forces the CPU to spend time 
        // on every byte, simulating a complex encryption algorithm (like AES).
        //
        // 50 iterations is chosen as a balance:
        // - Enough to make Serial slow (~seconds).
        // - Enough to allow OpenMP to show speedup.
        // - Not so much that it times out the web server.
        // -------------------------------------------------------------
        volatile int heavy = 0;
        for (int j = 0; j < 50; j++) { 
            heavy += (data[i] * j) ^ k;
        }

        // -------------------------------------------------------------
        // Actual Encryption / Decryption
        // -------------------------------------------------------------
        if (mode == Mode::Encrypt) {
            data[i] = static_cast<unsigned char>(data[i] + k);
        } else {
            data[i] = static_cast<unsigned char>(data[i] - k);
        }
    }
}

// ------------------------------------------------------------------
// Timing
// ------------------------------------------------------------------
double nowSeconds() {
    using clock = std::chrono::steady_clock;
    static const auto t0 = clock::now();
    auto dt = std::chrono::duration<double>(clock::now() - t0);
    return dt.count();
}

// ------------------------------------------------------------------
// Disk Allocation
// ------------------------------------------------------------------
bool prepareOutputFile(const std::string& outPath, std::uint64_t size) {
    std::ofstream out(outPath, std::ios::binary | std::ios::trunc);
    if (!out) return false;

    if (size == 0) return true;

    // Seek to end and write a byte to force OS to allocate space
    out.seekp(static_cast<std::streamoff>(size - 1));
    char zero = 0;
    out.write(&zero, 1);
    
    return static_cast<bool>(out);
}