# Enigma — A Custom Cryptography Library
**Author:** dsainvg  
**Repository:** [github.com/dsainvg/enigma](https://github.com/dsainvg/enigma)  
**Live Docs:** [dev.dsainvg.me/enigma](http://dev.dsainvg.me/enigma/)  
**PyPI Package:** [enigma-encryption](https://pypi.org/project/enigma-encryption/) — `pip install enigma-encryption`

---

## What This Project Is

Enigma is a custom cryptography library built from scratch in C++, with a Python extension and a standalone command-line tool. It implements a custom password hashing algorithm and a symmetric file encryption cipher — both designed and written without any external cryptographic dependencies like OpenSSL or libsodium. The library is published on PyPI, ships pre-built binary wheels for Windows, macOS, and Linux across Python 3.10–3.13, has a full test suite, benchmarks, and formal documentation.

The project was not a tutorial follow-along. The algorithm is original, the architecture was designed iteratively, and every layer — from the low-level bit operations in C++ to the Python packaging pipeline — was built by hand.

---

## The Journey — Four Iterations

What makes this project worth talking about is not just the final product, but how it got there. Enigma went through four distinct generations, each one exposing a gap and motivating a better decision.

**Generation 1 — Python prototype on Streamlit.** The algorithm started as a pure Python implementation, deployed as a live Streamlit web app. This was intentional: Streamlit's interactive UI made it easy to test encryption round-trips in real time without building any infrastructure. The goal at this stage was to validate that the algorithm was logically sound — if you could encrypt something and decrypt it back perfectly in a browser, the math worked.

**Generation 2 — C++ CLI rewrite.** Once the algorithm was validated, it was rewritten entirely in C++. This was a deliberate performance decision: iterative password hashing in pure Python is simply too slow to be practical. The C++ version, named `mycrypt-cli`, matched the Python algorithm exactly and came with 190 unit tests (hash and encryption) plus a shell-based integration test suite. This is also where the project gained engineering discipline — build instructions, architecture docs, and a proper Makefile.

**Generation 3 — A failed GUI application.** An attempt was made to wrap the CLI into a full desktop application. It did not ship. The lesson was clear in hindsight: the CLI was a monolithic binary, not a reusable library. You cannot embed a tool; you can only embed a library. This failure directly defined the architecture of what came next.

**Generation 4 — The Enigma monorepo.** The final design separates everything cleanly: a single C++ core library holds all cryptographic logic, and two independent consumers link against it — the CLI binary and the Python extension. The failure in generation 3 made the right architecture obvious because the wrong one had already been tried.

---

## Technical Skills Demonstrated

**C++ (C++17):** The entire cryptographic core is written in C++. This includes the password hashing algorithm, the block cipher, bitwise whole-buffer rotation, CSPRNG salt generation, and chunked file streaming. The code targets C++17 and compiles cleanly on MSVC, Apple Clang, and GCC.

**Python extension development (pybind11):** The Python module is a native C++ extension bound using pybind11, not a subprocess wrapper or ctypes hack. C++ exceptions are translated into Python exceptions at the binding layer, and the GIL is explicitly released during file I/O so that multi-threaded Python code can encrypt files in true parallel.

**Cross-platform build systems (CMake):** The project uses a unified CMake configuration that manages three targets from one root — the static C++ library, the CLI executable, and the Python extension. All three link the same core library, guaranteeing identical output.

**Python packaging and CI/CD:** Packaging is handled by `scikit-build-core`, which bridges CMake and Python's build toolchain. `cibuildwheel` runs on GitHub Actions and builds wheels for all supported platforms and Python versions automatically on every version tag. Wheels are published to PyPI using Trusted Publishing — no stored API keys. The full pipeline from a Git tag to a live `pip install` is automated.

**Testing:** The project maintains parallel test suites — GoogleTest for the C++ layer and Pytest for the Python layer. A cross-compatibility test explicitly verifies that the CLI binary and Python module produce identical output for the same inputs, enforcing that the two consumers never diverge.

**Documentation:** The project has a full documentation site (Material for MkDocs) covering installation, the CLI reference, the Python API, performance tuning, security warnings, the repository architecture, the cryptographic algorithms, and benchmarks. This was written to the standard of a real open-source library, not a README afterthought.

---

## Architecture Decisions Worth Highlighting

**Zero external runtime dependencies.** The library ships with no runtime dependencies — no OpenSSL, no libsodium, nothing. This was a deliberate design constraint. It makes the binary trivially portable and eliminates supply-chain risk. The only build-time dependency is pybind11, which is fetched and compiled during the build — it does not need to be installed on the user's system.

**Constant-memory streaming.** The file encryption engine processes data in configurable chunks. A 500 MB file never loads more than a few megabytes into RAM at once. This is confirmed by the benchmarks: peak RSS scales with the I/O buffer size, not the file size.

**Variable-depth cipher rounds per block.** The cipher applies between 10 and 15 processing rounds per 1 KB block, varying by block index. This was a deliberate choice to break repeating patterns across the ciphertext — a static round count would make encrypted output more susceptible to pattern analysis.

**Password verification at the file header.** Every encrypted file has a compact verification tag stored in its header. When decryption begins, the engine checks this tag immediately and rejects a wrong password before processing any actual data. This prevents the common case of producing gigabytes of garbage output before discovering the password was wrong.

---

## Performance

Benchmarks were run on a 22-core Windows machine with Python 3.13.

**Hashing** at the default cost factor (`cost=10`) takes approximately 70–150 ms depending on password length. Cost can be tuned — every increase of 2 roughly quadruples the time, giving a configurable brute-force barrier. Crucially, password length has almost no effect on hash time: a 512-character password hashes in roughly the same time as an 8-character one. The cost factor is the only meaningful variable.

**File encryption** scales well with thread count. On a single thread, a 1 MB file encrypts at around 9 MB/s. Four threads push that to 18–19 MB/s. All 22 cores get to 22 MB/s with only 1.4 MB of RAM used — confirming the streaming design works as intended. For large files, the library recommends `threads=0` (auto-detect all cores) as the practical default.

---

## Security Honesty

The documentation is explicit about what Enigma is and is not. The password hashing is iterative and memory-hard — it defends against automated dictionary attacks and GPU-parallel brute-force. The cipher is original and has not undergone formal academic cryptanalysis. There is no authenticated encryption layer (no MAC), meaning the library cannot detect if an encrypted file was tampered with.

These limitations are documented clearly, with explicit guidance to use AES-GCM or Argon2id for any system that handles financial data, health records, or public authentication. Enigma is positioned for personal encryption, utility-grade credential storage, and educational exploration of cryptographic construction — use cases where it genuinely delivers, not ones where it would be the wrong tool.

Knowing the boundaries of your own work is part of engineering maturity, and the project demonstrates it.

---

## Summary

Enigma is a full-stack software engineering project: a novel algorithm, a C++ library, a Python package on PyPI, a CLI binary, a CI/CD pipeline, a test suite, benchmarks, and documentation. It was built iteratively — including one failed attempt that taught the right architecture — and every layer was implemented by hand. The skills it demonstrates span systems programming, Python ecosystem tooling, cross-platform build systems, software packaging, and technical writing.

---

*Live documentation: [dev.dsainvg.me/enigma](http://dev.dsainvg.me/enigma/) — Package: [enigma-encryption on PyPI](https://pypi.org/project/enigma-encryption/) — `pip install enigma-encryption`*
