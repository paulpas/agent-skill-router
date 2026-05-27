---
name: build-performance-optimization
description: Profiles, analyzes, and optimizes slow builds through bottleneck identification, incremental compilation strategies, intelligent caching, and parallelization techniques for C++, Java, Python, TypeScript, and Go projects.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: build performance, compilation time, build profiling, incremental build, parallel build, bottleneck analysis, build cache, build speed
  related-skills: makefile-best-practices,cicd-build-orchestration
  archetypes: tactical, diagnostic
  anti_triggers: vague build questions, general build overview, build system migration
  response_profile:
    verbosity: high
    directive_strength: high
    abstraction_level: operational
---

# Build Performance Optimization

When a build takes 20 minutes and should take 2, the problem isn't how you're running it—it's what you're building and how. This skill teaches you to **measure precisely, identify bottlenecks ruthlessly, and optimize systematically**. We focus on profiling tools, dependency analysis, caching strategies, and parallelization that actually work.

## TL;DR Checklist

- [ ] **Profile first:** Generate build timing reports before attempting any optimization. Use `--verbose --profile` flags or custom timing instrumentation.
- [ ] **Identify the bottleneck:** Is it compilation (C++/Rust), linking, test execution, or something else? Profile output tells you.
- [ ] **Measure baselines:** Record clean build time, incremental build time (single file change), and full rebuild. Compare before/after.
- [ ] **Enable parallelization:** Use `-j$(nproc)` (Make), `--parallel` (Gradle), `-j` (Ninja), compiler flags for parallel codegen.
- [ ] **Implement content-addressed caching:** Cache object files, compiled modules, and binaries keyed by source hash (not timestamp).
- [ ] **Optimize link-time compilation:** For C++, use `-fuse-ld=mold` or `lld`, reduce debug symbol bloat with `split-dwarf`, parallelize linking with `-Wl,--threads`.
- [ ] **Track incremental builds:** Measure single-file-change rebuild time. If >30 seconds for small repos, investigate header dependencies or heavy templates.
- [ ] **Validate improvements:** Run automated benchmark suite (3+ consecutive builds) to confirm optimization didn't regress.

---

## When to Use

Use this skill when:

- A clean build takes >5 minutes for a reasonably-sized project (C++, Java, TypeScript, Go, Rust)
- Incremental builds (changing one file) take as long as clean builds—indicates bad dependency tracking
- Developers report "random" build failures on incremental rebuilds—suggests cache invalidation is broken
- CI/CD pipelines spend >50% of job time building instead of testing
- Link time dominates (Ninja reports "Linking [target]" taking >60 seconds)
- Header dependencies in C++ are causing cascading recompilations
- Test suites run sequentially when they could parallelize
- Build artifacts aren't being cached effectively between CI jobs
- You're using timestamp-based caching (fragile, breaks with clock skew)
- Pre-built binaries or caches are being rebuilt unnecessarily

---

## When NOT to Use

Avoid this skill for:

- **Writing Makefiles or build files themselves** (use `makefile-best-practices` instead)
- **Setting up CI/CD orchestration** (use `cicd-build-orchestration` instead)
- **Optimizing runtime performance** of your application (that's a different domain)
- **One-off micro-optimizations** that save <1 second total build time (effort not justified)
- **Projects where build time is not a developer pain point** (premature optimization)
- **Replacing a broken build system with a new one** without understanding the actual bottleneck

---

## Core Workflow

### 1. **Establish Baseline Metrics**

Before touching any optimization, you must have numbers. Run a timing harness that captures:
- Clean build time (full from-scratch compile)
- Incremental build time (change one file, rebuild)
- Link time (if applicable—often hidden in total)
- Parallelization factor (how much speedup from `-j4` vs `-j1`)

**Checkpoint:** You have a spreadsheet or JSON file with at least 3 runs of each metric. Standard deviation is <10%.

### 2. **Profile the Build Process**

Use your build system's native profiling:
- **Make:** `time make -j$(nproc)` + `make --debug=b` for detailed tracing
- **CMake/Ninja:** `ninja -d stats` to dump build profile
- **Gradle:** `gradle build --profile` generates HTML report
- **TypeScript:** `tsc --diagnostics` shows compilation time per file
- **Go:** `go build -x` shows all commands; time each with custom wrapper
- **Bazel:** `bazel build --profile=/tmp/profile.json` then analyze with `bazel analyze-profile`

Parse the output to identify which **phase** is slowest:
- Compilation (per-file compile time)
- Linking (final link step)
- Header scanning / dependency resolution
- Test execution (usually separate)

**Checkpoint:** You have a ranked list of top 5 slowest compilation units or link phases, with times.

### 3. **Diagnose Root Causes**

For the top bottleneck, drill deeper:

**If compilation is slow:**
- Run compiler with timing flags: `clang++ -ftime-trace` (C++), `javac -verbose` (Java), `tsc --extendedDiagnostics` (TypeScript)
- Check for heavy template instantiations (C++), excessive macro expansion, or large generated files
- Verify compiler flags aren't disabling optimizations unintentionally (e.g., `-O0` instead of `-O2`)

**If linking is slow:**
- Use `nm --size-sort` on object files to find the largest ones (often opportunities for lazy linking)
- Check for `--whole-archive` or equivalent that's forcing all symbols to be linked
- Profile the linker: `ld.lld --time-trace-file=/tmp/lld.json` (if using lld)

**If incremental builds are slow (proportional to clean builds):**
- Check header dependency tracking. Run `make -n -j1` and count headers included per translation unit
- Look for forced rebuilds: files with timestamp-based rules or missing dependency declarations
- For C++: use `gcc -MM` or `clang++ -M` to dump dependencies; look for headers included by everything

**Checkpoint:** You have identified the specific, measurable bottleneck (e.g., "linking takes 45 seconds", "header template.hpp is included 342 times").

### 4. **Apply Targeted Optimizations**

Based on the bottleneck type:

**Compilation Bottleneck:**
- Enable parallelization: `-j$(nproc)` or `build --jobs=auto`
- Reduce template instantiation: use explicit instantiation, pre-compiled headers, or module imports (C++20)
- Profile per-file: identify the 2-3 slowest files and refactor their dependencies
- Consider distributed compilation: ccache, distcc, or Icecream

**Linking Bottleneck:**
- Switch to faster linker: `fuse-ld=mold` (GNU gold alternative, 10-20x faster), `lld` (LLVM), or `zld` (Mach-O)
- Enable parallelization in linker: `-Wl,--threads` (GNU gold), already parallel in lld/mold
- Reduce debug symbols: `-gsplit-dwarf` separates debug info from binaries (Clang/GCC)
- Use thin LTO instead of fat LTO: `-flto=thin` reduces linker overhead

**Incremental Build Bottleneck:**
- Fix dependency tracking: ensure build system sees all header dependencies
- Remove forced rebuilds: replace timestamp rules with content-based invalidation
- Cache intermediate artifacts: ccache (C/C++), Gradle build cache, Bazel (native)
- Split monolithic targets: if one target depends on 200 files, split into 20 libraries

**Parallelization Not Working:**
- Verify task graph has sufficient parallelism: `ninja -d graph` or `bazel query 'deps(...)'`
- Check for serializing dependencies: ensure headers don't create artificial ordering
- Increase parallelism: start with `-j8` on 4-core, observe wall time

**Checkpoint:** You've applied 1-2 targeted optimizations and re-measured. Verify improvement is >15% (noise floor). If <15%, revert and try next bottleneck.

### 5. **Validate and Benchmark**

Once optimizations are in place, run a formal benchmark:
- Run 5 consecutive clean builds. Report min/max/mean times.
- Run 5 incremental builds (change one file between each). Report timing.
- Compare to baseline. Verify improvement is reproducible (not noise).
- Check that output binaries are **identical**: `sha256sum` or `cmp` object files before/after.

**Checkpoint:** Benchmark results are reproducible, improvement is documented (e.g., "15% faster on incremental builds"), and no artifacts changed.

### 6. **Document and Automate**

Create a build-optimization checklist for your team:
- How to run the profiler (`ninja -d stats`, etc.)
- Which optimizations are currently active and why
- Known bottlenecks and their current status
- Benchmarking procedure (so others can validate regressions)

Automate checks in CI: run a `build-time-benchmark` step that fails if incremental builds exceed a threshold (e.g., >60 seconds).

---

## Implementation Patterns

### Pattern 1: Build Profiler Script (Python + Bash)

This script measures clean build, incremental build, and parallelization gains. Provides a baseline for all optimizations.

```python
#!/usr/bin/env python3
"""
Build profiler: measures clean build time, incremental build time, and parallelization factor.
Outputs JSON for comparison across builds.
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from hashlib import sha256

def run_command(cmd, cwd=None):
    """Run command, return (exit_code, stdout, stderr, elapsed_seconds)."""
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=cwd,
        shell=isinstance(cmd, str),
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    return result.returncode, result.stdout, result.stderr, elapsed

def clean_build(build_dir, build_cmd, runs=3):
    """Run clean build N times, return mean time in seconds."""
    times = []
    for i in range(runs):
        # Remove build artifacts
        subprocess.run(f"rm -rf {build_dir}", shell=True, check=True)
        
        # Run clean build
        _, _, _, elapsed = run_command(build_cmd)
        times.append(elapsed)
        print(f"  Clean build {i+1}: {elapsed:.2f}s")
    
    return {
        "mean": sum(times) / len(times),
        "min": min(times),
        "max": max(times),
        "runs": times,
    }

def incremental_build(build_dir, build_cmd, source_file, runs=3):
    """
    Run a clean build, then modify a source file and rebuild N times.
    Measures incremental rebuild time.
    """
    # Ensure clean state
    subprocess.run(f"rm -rf {build_dir}", shell=True, check=True)
    _, _, _, _ = run_command(build_cmd)
    
    # Get a source file to touch
    if not Path(source_file).exists():
        print(f"Warning: {source_file} not found, skipping incremental build test")
        return None
    
    times = []
    original_mtime = Path(source_file).stat().st_mtime
    
    for i in range(runs):
        # Touch source file to trigger rebuild
        Path(source_file).touch()
        time.sleep(0.1)  # Ensure new mtime
        
        _, _, _, elapsed = run_command(build_cmd)
        times.append(elapsed)
        print(f"  Incremental build {i+1}: {elapsed:.2f}s")
    
    # Restore original mtime
    Path(source_file).utime((original_mtime, original_mtime))
    
    return {
        "mean": sum(times) / len(times),
        "min": min(times),
        "max": max(times),
        "runs": times,
    }

def parallelization_factor(build_cmd, num_jobs_list=[1, 2, 4, 8, 16]):
    """
    Measure build time with different -j values.
    Returns dict of job_count -> elapsed_seconds.
    """
    results = {}
    for jobs in num_jobs_list:
        cmd = build_cmd.replace("$(nproc)", str(jobs)).replace("-j", f"-j{jobs}")
        _, _, _, elapsed = run_command(cmd)
        results[jobs] = elapsed
        print(f"  -j{jobs}: {elapsed:.2f}s")
    
    # Calculate speedup relative to -j1
    if 1 in results:
        baseline = results[1]
        speedup = {jobs: baseline / elapsed for jobs, elapsed in results.items()}
        results["speedup_vs_j1"] = speedup
    
    return results

def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <build_dir> <build_command> [source_file]")
        print(f"Example: {sys.argv[0]} build 'ninja -C build -j$(nproc)' src/main.cpp")
        sys.exit(1)
    
    build_dir = sys.argv[1]
    build_cmd = sys.argv[2]
    source_file = sys.argv[3] if len(sys.argv) > 3 else None
    
    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "build_command": build_cmd,
        "build_dir": build_dir,
    }
    
    print("\n=== Clean Build Profile ===")
    results["clean_build"] = clean_build(build_dir, build_cmd, runs=3)
    print(f"Mean: {results['clean_build']['mean']:.2f}s")
    
    if source_file:
        print("\n=== Incremental Build Profile ===")
        results["incremental_build"] = incremental_build(
            build_dir, build_cmd, source_file, runs=3
        )
        print(f"Mean: {results['incremental_build']['mean']:.2f}s")
        ratio = results["incremental_build"]["mean"] / results["clean_build"]["mean"]
        print(f"Incremental/Clean ratio: {ratio:.2%}")
    
    print("\n=== Parallelization Factor ===")
    results["parallelization"] = parallelization_factor(build_cmd)
    
    print("\n=== Results (JSON) ===")
    print(json.dumps(results, indent=2))
    
    # Save to file for comparison
    output_file = Path("build_profile.json")
    output_file.write_text(json.dumps(results, indent=2))
    print(f"\nResults saved to {output_file}")

if __name__ == "__main__":
    main()
```

**Usage:**
```bash
./build_profiler.py build "ninja -C build -j$(nproc)" src/main.cpp
```

**Output:** JSON with clean build time, incremental build time, parallelization speedup curves, and statistical measures.

---

### Pattern 2: BAD vs. GOOD — Comparison of Optimization Mistakes

#### ❌ BAD: Serial Linking + Missing Incremental Dependencies

```makefile
# BAD: Serializes linking, no cache, forces full relink on any change
CC = g++
CFLAGS = -std=c++17 -O0  # -O0 disables optimizations by accident!
LDFLAGS = -Wl,--whole-archive  # Forces all symbols linked
SRCS = $(wildcard src/*.cpp)
OBJS = $(SRCS:.cpp=.o)

app: $(OBJS)
	$(CC) $(LDFLAGS) -o app $(OBJS) -lm  # Serial link, no -j

%.o: %.cpp
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) app
```

**Problems:**
- No parallelization in compilation or linking
- `-O0` means slow code generation
- No caching; touching any `.cpp` forces relink of entire app
- Linking is single-threaded
- No incremental tracking

**Measured impact:** Clean build 45 seconds, incremental 38 seconds (should be <2 seconds for one file change).

---

#### ✅ GOOD: Parallel Compilation + Fast Linker + Incremental Caching

```makefile
# GOOD: Parallel build, fast linker, ccache integration, incremental checks
CC = ccache g++  # Cache compiled objects
CXX_FLAGS = -std=c++17 -O2 -fuse-ld=mold  # mold is 10x faster than GNU ld
LDFLAGS = -Wl,--threads -flto=thin  # Parallel link, thin LTO for speed
SRCS = $(wildcard src/*.cpp)
OBJS = $(SRCS:.cpp=.o)
DEPS = $(OBJS:.o=.d)

-include $(DEPS)  # Include generated dependencies

app: $(OBJS)
	@echo "Linking $@..."
	$(CC) $(LDFLAGS) -o app $(OBJS) -lm

%.o: %.cpp
	@echo "Building $<..."
	$(CC) $(CXX_FLAGS) -MMD -MP -c $< -o $@

clean:
	rm -f $(OBJS) $(DEPS) app

# Validate incremental rebuild time
benchmark:
	@echo "Clean build:"
	@time make clean && time make -j$$(nproc)
	@echo "\nIncremental (touch one file):"
	@touch src/main.cpp && time make -j$$(nproc)
```

**Improvements:**
- **ccache** caches object files; identical compilations are instant
- **mold** linker is 10x faster than GNU ld
- **Parallel linking** with `-Wl,--threads`
- **Thin LTO** reduces linker overhead
- **Dependency tracking** (`-MMD -MP`) makes incremental builds accurate
- **Benchmark target** allows easy before/after comparison

**Measured impact:** Clean build 8 seconds (5.6x faster), incremental 0.3 seconds (127x faster).

---

### Pattern 3: Incremental Build Optimization with Header Dependency Analysis

For C++ projects where headers are recompiled excessively, analyze and fix dependency chains.

```bash
#!/bin/bash
# analyze_header_deps.sh - Find which headers are slowing incremental builds

TARGET_SOURCE="${1:-src/main.cpp}"
BUILD_DIR="${2:-.}"

if [ ! -f "$TARGET_SOURCE" ]; then
    echo "Usage: $0 <source_file> [build_dir]"
    exit 1
fi

echo "=== Header Dependency Analysis for $TARGET_SOURCE ==="
echo ""

# Step 1: Dump all included headers using preprocessor
echo "Step 1: Extracting included headers..."
gcc -E -H "$TARGET_SOURCE" 2>&1 | grep "^ " | sed 's/^ //' > /tmp/headers.txt
HEADER_COUNT=$(wc -l < /tmp/headers.txt)
echo "Total headers included: $HEADER_COUNT"

# Step 2: Find headers included in multiple compilation units
echo ""
echo "Step 2: Headers included in every compilation unit (likely culprits)..."
for src in src/*.cpp; do
    gcc -E -H "$src" 2>&1 | grep "^ " | sed 's/^ //'
done | sort | uniq -c | sort -rn | head -20 > /tmp/shared_headers.txt

echo "Top 20 most-included headers:"
cat /tmp/shared_headers.txt | awk '{print $2, "(" $1 " files)"}'

# Step 3: Analyze size and compile time of problematic headers
echo ""
echo "Step 3: Identifying expensive headers (large, heavily templated)..."
while read count header; do
    if [ -f "$header" ]; then
        size=$(wc -l < "$header")
        echo "$header: $size lines (included in $count files)"
    fi
done < /tmp/shared_headers.txt | sort -t: -k2 -rn | head -10

# Step 4: Suggest remediation
echo ""
echo "Step 4: Remediation suggestions:"
echo "- Use forward declarations instead of full includes where possible"
echo "- Consider splitting headers: separate interface (forward decls) from impl (definitions)"
echo "- Use precompiled headers for headers included >50 times"
echo "- Consider using C++20 modules to replace header includes entirely"

# Step 5: Measure impact
echo ""
echo "Step 5: Measuring incremental build impact..."
echo "Touch a single .cpp file and measure rebuild time:"
original_mtime=$(stat -c %Y "$TARGET_SOURCE")
touch "$TARGET_SOURCE"
sleep 0.1
echo "  Before optimization: (run benchmark now)"
time make clean && time make -j$(nproc)
# Restore
touch -d "@$original_mtime" "$TARGET_SOURCE"
```

**Usage:**
```bash
./analyze_header_deps.sh src/main.cpp build/
```

**Output:** Lists the 20 most-included headers, their sizes, and suggests which to optimize (precompiled headers, forward declarations, C++20 modules).

---

## Constraints

### MUST DO

- **Profile before optimizing.** Run a baseline measurement (clean, incremental, parallelization) and document it. "Feeling slow" is not data.
- **Measure incremental builds independently.** Distinguish between "change one file → rebuild takes X" vs. "clean build takes Y". They have different bottlenecks.
- **Validate parallelization factor.** Measure wall time (not CPU time) with `-j1`, `-j2`, `-j4`, `-j8`. Identify the speedup curve and scaling limits.
- **Use content-addressed caching.** Cache key should be file hash, not timestamp. Timestamp-based caches break with clock skew and distributed builds.
- **Verify outputs are identical.** After optimization, ensure compiled binaries and object files are byte-for-byte identical to unoptimized versions. Use `sha256sum` or `cmp`.
- **Document bottlenecks and fixes.** Create a README in your build system listing: current bottleneck, optimization applied, before/after metrics, and remediation status.
- **Benchmark on your actual hardware.** Don't assume a 16-core machine behaves like a 4-core CI runner. Profile on both.
- **Lock down compiler and linker versions.** Switching compilers can change performance unpredictably. Document which versions are tested.

### MUST NOT DO

- **Don't optimize prematurely.** If clean builds are <2 minutes and incremental builds are <10 seconds, spend time on tests or features instead.
- **Don't use timestamp-based cache invalidation.** It's fragile (clock skew, NFS), races on distributed systems, and breaks incremental builds.
- **Don't ignore the linker.** Linking is often 30-50% of total build time and is frequently overlooked. Profile it explicitly.
- **Don't enable "maximum optimization" flags by default.** `-O3`, full LTO, and debug symbol stripping trade build time for runtime performance. Choose based on context (CI vs. local dev).
- **Don't parallelize beyond the task graph's width.** `-j32` on a 4-core machine wastes resources and can thrash. Use `-j$(nproc)` or measure your optimal `-j` value.
- **Don't assume header dependencies are tracked.** Test it: change a header, rebuild, and verify all dependent files recompiled. Missing dependencies cause "phantom" incremental builds.
- **Don't conflate "faster compilation" with "better caching".** Sometimes a 10% compile time reduction + aggressive caching beats a 30% compile time reduction with no caching.
- **Don't skip validation when switching build tools.** Swapping from `make` to `ninja` or `bazel` changes parallelization behavior. Always benchmark before/after.
- **Don't commit optimization changes without CI validation.** Ensure your benchmark runs in CI and fails if incremental builds exceed threshold (e.g., >60 seconds).

---

## Common Patterns and Solutions

### Pattern: Incremental Builds Are Slow (Almost as Slow as Clean Builds)

**Root Cause:** Missing header dependencies or forced rebuilds.

**Diagnosis:**
```bash
# Does every .cpp recompile when you change main.cpp?
touch src/main.cpp
time make -j$(nproc)  # Should be <2 seconds for one file change
```

**Solution:**
1. Ensure build system tracks header includes. In CMake: use `target_include_directories(... PUBLIC)`. In Make: use `-MMD -MP` flags.
2. Check for forced rebuilds: files with no dependencies listed (in Makefile, CMakeLists.txt, etc.).
3. For C++: use `gcc -MM src/main.cpp` to dump actual dependencies; compare to build system's understanding.
4. Use precompiled headers (PCH) for headers included >100 times.

---

### Pattern: Linking Takes Longer Than Compilation

**Root Cause:** Slow linker (GNU ld) or too many symbols.

**Diagnosis:**
```bash
ninja -d stats  # Shows Linking [target] time
# If linking is >30% of total time for a moderately-sized project, optimize.
```

**Solution:**
1. Switch to faster linker: `-fuse-ld=mold` (recommended), `-fuse-ld=lld`, or `-fuse-ld=gold`.
2. Enable parallel linking: `-Wl,--threads` (GNU gold/mold) or use lld (already parallel).
3. Reduce debug symbols: `-gsplit-dwarf` (separates debug from binary).
4. For C++: avoid `--whole-archive` (forces all symbols linked). Use `.a` static libraries with selective symbol export.

---

### Pattern: Compilation Is Slow but Can't Parallelize More

**Root Cause:** Insufficient task graph parallelism or heavy per-file compilation.

**Diagnosis:**
```bash
# Check task graph width
ninja -d graph build.ninja | grep -c "digraph"  # Number of nodes
# If total nodes < 10, not enough parallelism.

# Check per-file compilation time
ninja -d stats | grep "ms" | sort -k3 -rn | head -5  # Slowest files
```

**Solution:**
1. Split monolithic source files: a single 10,000-line file compiles slower than 10 × 1,000-line files (due to optimization passes).
2. For C++: reduce template instantiation overhead:
   - Use explicit instantiation (`extern template`)
   - Avoid heavy `<iostream>`, `<regex>` includes (use precompiled headers)
   - Consider C++20 modules (eliminates header parsing entirely)
3. Use ccache + distributed compilation (distcc, Icecream) for network parallelization.
4. Profile the compiler itself: `clang++ -ftime-trace=profile.json` shows where time is spent (parsing, codegen, optimization).

---

### Pattern: ccache / Gradle Build Cache Not Working (Low Hit Rate)

**Root Cause:** Cache key is incorrect or includes non-deterministic data.

**Diagnosis:**
```bash
# For ccache
ccache -s  # Shows hit/miss ratio
# Expect >50% hit rate on incremental CI builds.

# For Gradle
gradle build --build-cache --info | grep "cache"
```

**Solution:**
1. Ensure cache keys include:
   - Source file content hash (not timestamp)
   - Compiler version
   - Compiler flags (all of them, exactly)
   - Include paths and library versions
2. Exclude non-deterministic data:
   - Timestamps (use `-D__TIME__` suppression in compiler flags)
   - Build directory paths (use `-ffile-prefix-map` in GCC/Clang)
   - Hostname, PID, random seeds
3. For CI: share cache across jobs if possible (ccache local socket in Docker, Gradle build cache backend).

---

## Live References

- **GNU Make profiling:** `make --debug=b` (shows all recipes executed)
- **CMake/Ninja:** `ninja -d stats` (outputs timing per target)
- **Clang/GCC profiling:** `clang++ -ftime-trace` (JSON output) or `gcc -ftime-report`
- **Java/Gradle:** `gradle build --profile` (HTML report with task timing)
- **Go:** `go build -x` (shows all commands); wrap with `time` for each
- **TypeScript:** `tsc --diagnostics --listFilesOnly`
- **ccache documentation:** https://ccache.dev (C/C++ object caching)
- **Mold linker:** https://github.com/rui314/mold (10x faster than GNU ld)
- **LLVM lld linker:** https://lld.llvm.org (alternative fast linker)
- **Icecream (distcc alternative):** https://github.com/icecc/icecream (distributed C++ compilation)
- **Bazel build profiling:** `bazel analyze-profile <profile.json>`
- **C++ header dependency analysis:** `gcc -MM` or `clang++ -M`
- **Precompiled headers (GCC/Clang):** https://gcc.gnu.org/onlinedocs/gcc/Precompiled-Headers.html

---

## Related Skills

| Skill | Purpose |
|---|---|
| `makefile-best-practices` | How to structure Makefiles, declare dependencies correctly, and write portable build recipes |
| `cicd-build-orchestration` | How to cache and parallelize builds across CI/CD jobs, orchestrate build pipelines |
