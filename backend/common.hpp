#pragma once
#include <cstdint>
#include <string>

enum class Mode { Encrypt, Decrypt };

struct Args {
    std::string inPath;
    std::string outPath;
    Mode mode = Mode::Encrypt;
    int key = 3;
    std::uint64_t chunkSize = 4ull * 1024 * 1024; // 4 MiB
    int threads = 0; // for OpenMP only, 0 = auto
};

Args parseArgs(int argc, char** argv);
std::uint64_t fileSizeBytes(const std::string& path);

// Encrypt/decrypt a buffer in-place (Caesar byte shift)
void transformBuffer(unsigned char* data, std::size_t n, int key, Mode mode);

// Returns seconds elapsed (high resolution)
double nowSeconds();

// Ensures output file exists and is exactly "size" bytes
bool prepareOutputFile(const std::string& outPath, std::uint64_t size);
