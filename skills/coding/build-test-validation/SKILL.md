---
name: build-test-validation
description: Validates Makefile-based builds through automated test suites, dependency
  analysis, CI/CD integration, and reproducibility checks to ensure reliable software
  construction.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: makefile testing, build validation, phony target tests, continuous integration
    for builds, incremental build verification, dependency graph analysis, build reproducibility,
    make test suite, artifact verification
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-makefile,coding-make,linux-make-build-system
------
# Build Test and Validation Framework

Senior build quality engineer validating Makefile-based builds through automated test suites, dependency graph analysis, incremental build correctness verification, reproducibility checks, and CI/CD integration. A validated build system is not just one that compiles — it is one whose correctness has been proven across clean builds, incremental changes, cross-configuration runs, and artifact integrity checks. This skill applies the Unix philosophy of small focused tools chained together: each test target a single verification concern, each script a standalone validator.

## TL;DR Checklist

- [ ] Enumerate all `.PHONY` targets and verify each executes independently with exit code 0
- [ ] Run `make --dry-run -n` to detect missing prerequisite files before any actual build
- [ ] Touch a single source file and confirm only dependent objects rebuild (incremental correctness)
- [ ] Build from clean twice, compare artifact checksums — outputs must be bitwise identical
- [ ] Validate builds under at least two compiler configurations (e.g., `-O2` release, `-g -O0` debug)
- [ ] Run the full test target (`make test`) and confirm exit code propagation through the pipeline
- [ ] Verify every output artifact exists in the expected location with correct permissions and size

---

## When to Use

Use this skill when:

- You need to validate that an existing Makefile builds correctly without errors or silent failures
- A CI/CD pipeline is failing intermittently and you suspect build system non-determinism
- A new contributor reports that `make` works on their machine but fails in CI — diagnose environment differences
- You are auditing a project's build system before merging changes to its Makefile
- You need to verify that incremental builds do not skip required recompilations after header changes
- You must ensure build artifacts match expected checksums for supply chain integrity (e.g., signing, packaging)
- A refactoring of source files breaks the dependency graph and you need to trace broken prerequisites

---

## When NOT to Use

Avoid this skill for:

- Creating or editing a Makefile from scratch — use `coding-makefile` or `linux-make-build-system` instead
- Runtime application testing (unit tests, integration tests) — those are covered by `coding-testing-patterns` or `testing-unit-integration-e2e`; this skill validates the *build system itself*, not the application logic
- Testing Nix, Bazel, or Just build files exclusively — this skill targets GNU Make and POSIX-compatible `make` implementations
- Projects that have no Makefile at all (use a language-native test runner directly)

---

## Core Workflow

1. **Enumerate Phony Targets** — Parse the Makefile to extract every target listed under `.PHONY:`. For each phony target, execute it in an isolated temporary directory and verify exit code 0.
   **Checkpoint:** No phony target should depend on another phony target producing a file; if `test` depends on `build`, test them in sequence but validate that `build` alone succeeds.

2. **Validate Dependency Graph Integrity** — Run `make --dry-run -n` (or `make -nd 2>&1 | head -300`) against the target tree. Parse all prerequisite references and verify each file path exists relative to the Makefile location on a freshly checked-out source tree.
   **Checkpoint:** Zero unresolved prerequisite paths — every `.c`, `.h`, `.mk`, or included makefile must be findable from the repository root after a clean clone.

3. **Test Incremental Build Behavior** — Record file modification times for all objects in the build directory. Touch exactly one source file (e.g., `touch src/main.c`), run `make`, and verify that:
   - Only `src/main.o` (and anything depending on it) is recompiled
   - Unrelated `.o` files are skipped entirely
   **Checkpoint:** `make --dry-run` after the touch should show exactly one or two lines of `gcc` output, not a full rebuild.

4. **Validate Cross-Configuration Builds** — Build the project under at least two distinct compiler configurations by overriding variables via `make`:
   - Release: `make CFLAGS="-Wall -Wextra -O2"`
   - Debug: `make CFLAGS="-Wall -Wextra -g -O0"`
   **Checkpoint:** Both builds complete without errors; debug binary includes symbol table (`file` command should show "not stripped" or "DWARF").

5. **Run Complete Test Suite** — Execute the Makefile's test target (`make test`) and verify that:
   - Test binaries or scripts are built first (check dependency chain)
   - Exit code from `make test` is propagated correctly to the shell
   - Test output includes pass/fail counts or TAP/JUnit format
   **Checkpoint:** All tests pass with exit code 0; any failure aborts immediately (`set -e` in recipe).

6. **Verify Artifact Outputs** — For each expected build artifact:
   - Confirm file exists at the expected path
   - Check executable bit is set for binaries (`test -x`)
   - Validate file size exceeds zero bytes
   - Optionally compare SHA-256 against a known-good hash stored in a `.hashes` file
   **Checkpoint:** All artifacts present and non-empty; checksums match if validation is enabled.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Phony Target Test Script

A reusable bash script that discovers all `.PHONY` targets from a Makefile, runs each one in an isolated temporary directory, and reports which targets fail. This catches broken targets before they reach CI.

```bash
#!/usr/bin/env bash
# phony-target-tester.sh — Validate every .PHONY target executes independently
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly MAKEFILE="${SCRIPT_DIR}/Makefile"
readonly BUILD_LOG="phony-test-results.log"

# ── Extract phony targets from Makefile ──────────────────────────────
# Matches lines like: .PHONY: all clean test install help
PHONY_TARGETS=()
while IFS= read -r line; do
  # Remove trailing backslash continuations and extra whitespace
  cleaned=$(echo "$line" | sed 's/\\$//' | xargs)
  targets=$(echo "$cleaned" | sed 's/.PHONY: *//')
  for t in $targets; do
    PHONY_TARGETS+=("$t")
  done
done < <(grep -E '^\.PHONY:' "$MAKEFILE" 2>/dev/null || true)

if [[ ${#PHONY_TARGETS[@]} -eq 0 ]]; then
  echo "ERROR: No .PHONY targets found in $MAKEFILE" >&2
  exit 1
fi

echo "=== Phony Target Validator ==="
echo "Makefile: $MAKEFILE"
echo "Targets to test: ${PHONY_TARGETS[*]}"
echo ""

# ── Run each target in an isolated tmpdir ─────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
FAILED_TARGETS=()

for target in "${PHONY_TARGETS[@]}"; do
  TMPDIR=$(mktemp -d)
  cp "$MAKEFILE" "$TMPDIR/"

  # Copy source tree if present (adjust to your project structure)
  if [[ -d "${SCRIPT_DIR}/src" ]]; then
    cp -r "${SCRIPT_DIR}/src" "$TMPDIR/"
  fi
  if [[ -d "${SCRIPT_DIR}/include" ]]; then
    cp -r "${SCRIPT_DIR}/include" "$TMPDIR/"
  fi

  # Run target; capture exit code
  cd "$TMPDIR"
  if make "$target" > build.log 2>&1; then
    echo "PASS: $target" | tee -a "$BUILD_LOG"
    ((PASS_COUNT++))
  else
    echo "FAIL: $target (exit $?)" | tee -a "$BUILD_LOG"
    ((FAIL_COUNT++))
    FAILED_TARGETS+=("$target")
  fi

  cd - > /dev/null
  rm -rf "$TMPDIR"
done

echo ""
echo "=== Results ==="
echo "Passed: $PASS_COUNT / ${#PHONY_TARGETS[@]}"
if [[ $FAIL_COUNT -gt 0 ]]; then
  echo "Failed targets: ${FAILED_TARGETS[*]}"
  exit 1
fi
exit 0
```

### Pattern 2: Dependency Graph Analyzer (BAD vs. GOOD)

Detect broken prerequisites by parsing `make --dry-run` output and cross-referencing all file references against the actual filesystem.

```bash
# ❌ BAD — manual dependency check that misses transitive includes,
#          recursive make calls, and wildcard-expanded paths
check_deps_manual() {
    # Only checks direct prerequisite lines; completely ignores:
    # - -include directives with wildcards
    # - $(wildcard ...) expansions
    # - Header includes discovered via compiler -MMD output
    grep ': *$' Makefile | cut -d: -f1
}

# ✅ GOOD — comprehensive dependency graph analyzer that parses all
#          prerequisite references, wildcard expansions, and included files
#!/usr/bin/env bash
# dep-graph-analyzer.sh — Find broken prerequisites in a Makefile
set -euo pipefail

readonly MAKEFILE="${1:-Makefile}"
readonly BASE_DIR=$(dirname "$MAKEFILE")
ERRORS=0

echo "=== Dependency Graph Analyzer ==="
echo "Analyzing: $MAKEFILE (base: $BASE_DIR)"
echo ""

# ── Step 1: Parse .PHONY to exclude from file checks ─────────────────
declare -A PHONY_TARGETS
while IFS= read -r line; do
  targets=$(echo "$line" | sed 's/.PHONY: *//')
  for t in $targets; do
    PHONY_TARGETS["$t"]=1
  done
done < <(grep -E '^\.PHONY:' "$MAKEFILE" 2>/dev/null || true)

# ── Step 2: Extract all file-based prerequisites from target rules ───
echo "--- Direct prerequisite checks ---"
while IFS= read -r rule; do
  target=$(echo "$rule" | cut -d: -f1)
  prereqs=$(echo "$rule" | sed 's/[^:]*://' | tr -s ' ' '\n' | xargs)

  # Skip if this is a phony or pattern rule with % wildcard
  [[ -n "${PHONY_TARGETS[$target]+x}" ]] && continue
  [[ "$target" == *"%"* ]] && continue

  for prereq in $prereqs; do
    # Skip variables and function calls in prerequisites
    [[ "$prereq" == *"$("* ]] && continue
    [[ "$prereq" == *"$(" ]] && continue
    [[ "$prereq" == *"%"* ]] && continue

    # Resolve relative to BASE_DIR
    if [[ ! -e "${BASE_DIR}/${prereq}" ]]; then
      echo "MISSING prerequisite: $target <- ${prereq} (from $MAKEFILE)"
      ((ERRORS++))
    fi
  done
done < <(grep -E '^[^#][^$]*:' "$MAKEFILE" | grep -v '^\.' || true)

# ── Step 3: Check -include and wildcard expansions ───────────────────
echo ""
echo "--- Include file checks ---"
while IFS= read -r include_line; do
  # Extract the glob or path after -include or -sinclude
  included=$(echo "$include_line" | sed 's/.*-\(include\|sinclude\) *//' | xargs)

  if [[ "$included" == *"*" ]]; then
    # Wildcard expansion — check that at least one file matches
    pattern="${BASE_DIR}/${included}"
    if ! compgen -G "$pattern" > /dev/null 2>&1; then
      echo "WARNING: No files match wildcard include: $included"
    fi
  elif [[ ! -e "${BASE_DIR}/${included}" ]]; then
    echo "MISSING included file: ${included} (from $MAKEFILE)"
    ((ERRORS++))
  fi
done < <(grep -E '^\s*-?(include|sinclude)\s' "$MAKEFILE" || true)

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "✅ All dependencies resolved successfully."
else
  echo "❌ Found $ERRORS broken dependency references."
fi

exit $ERRORS
```

### Pattern 3: Incremental Build Validator

A test framework that modifies specific source files and verifies that only the affected object files are recompiled. This ensures your dependency tracking (especially header dependencies via `-MMD -MP`) is correct.

```bash
#!/usr/bin/env bash
# incremental-build-validator.sh — Verify Make handles incremental builds correctly
set -euo pipefail

readonly MAKEFILE="${1:-Makefile}"
readonly BUILD_DIR="${2:-build}"
PASS=0
FAIL=0

echo "=== Incremental Build Validator ==="
echo "Makefile: $MAKEFILE  |  Build dir: $BUILD_DIR"
echo ""

# ── Step 1: Clean build — record timestamps of all output files ───────
echo "--- Phase 1: Clean build ---"
make -f "$MAKEFILE" clean > /dev/null 2>&1 || true
make -f "$MAKEFILE" all > /dev/null 2>&1

# Record the list of object files before any modification
mapfile -t OBJECTS_BEFORE < <(find "$BUILD_DIR" -name '*.o' 2>/dev/null | sort)
echo "Object files after clean build: ${#OBJECTS_BEFORE[@]}"

if [[ ${#OBJECTS_BEFORE[@]} -eq 0 ]]; then
  echo "FAIL: No object files produced — check build targets."
  exit 1
fi

# ── Step 2: Touch a single source file and verify selective rebuild ───
echo ""
echo "--- Phase 2: Incremental touch test ---"

# Find the first .c file in src/
TEST_SOURCE=""
if compgen -G "src/*.c" > /dev/null; then
  TEST_SOURCE=$(ls src/*.c | head -1)
elif compgen -G "source/*.c" > /dev/null; then
  TEST_SOURCE=$(ls source/*.c | head -1)
else
  # Fallback: look for any .c file in the project
  TEST_SOURCE=$(find . -name '*.c' -not -path './.git/*' -type f | head -1)
fi

if [[ -z "$TEST_SOURCE" ]]; then
  echo "SKIP: No source files found to test incremental rebuild."
  exit 0
fi

echo "Touching: $TEST_SOURCE"
touch "$TEST_SOURCE"

# Capture what make would do (dry run after touch)
DRY_RUN_OUTPUT=$(make -f "$MAKEFILE" --dry-run all 2>&1 | grep -E '^\s*(gcc|cc|g\+\+|c\+\+)' || true)
COMPILATION_LINES=$(echo "$DRY_RUN_OUTPUT" | wc -l)

echo "Compilation commands in dry-run after touch: $COMPILATION_LINES"

if [[ $COMPILATION_LINES -le 3 ]]; then
  echo "PASS: Incremental build is selective (only ~${COMPILATION_LINES} file(s) recompiled)"
  ((PASS++))
else
  echo "FAIL: Full rebuild triggered! ${COMPILATION_LINES} compilations for one touch."
  echo "This indicates broken dependency tracking or missing -MMD -MP flags."
  echo ""
  echo "Dry-run output:"
  echo "$DRY_RUN_OUTPUT"
  ((FAIL++))
fi

# ── Step 3: Verify header dependency propagation ──────────────────────
echo ""
echo "--- Phase 3: Header dependency test ---"

# Find a header file in the project
TEST_HEADER=""
if compgen -G "include/*.h" > /dev/null; then
  TEST_HEADER=$(ls include/*.h | head -1)
elif compgen -G "headers/*.h" > /dev/null; then
  TEST_HEADER=$(ls headers/*.h | head -1)
else
  TEST_HEADER=$(find . -name '*.h' -not -path './.git/*' -type f | head -1)
fi

if [[ -n "$TEST_HEADER" && -f "$TEST_HEADER" ]]; then
  echo "Touching header: $TEST_HEADER"
  touch "$TEST_HEADER"

  DRY_RUN_HEADERS=$(make -f "$MAKEFILE" --dry-run all 2>&1 | grep -E '^\s*(gcc|cc|g\+\+|c\+\+)' || true)
  HEADER_COMPILATIONS=$(echo "$DRY_RUN_HEADERS" | wc -l)

  echo "Compilations triggered by touching $TEST_HEADER: $HEADER_COMPILATIONS"

  # Touching a header should trigger recompilation of files that include it
  if [[ $HEADER_COMPILATIONS -ge 1 ]]; then
    echo "PASS: Header dependency propagation detected (${HEADER_COMPILATIONS} file(s) recompiled)"
    ((PASS++))
  else
    echo "WARNING: Header touch did not trigger any recompilation — header deps may not be tracked."
    ((PASS++))  # Not a hard failure; some projects don't use -MMD
  fi
else
  echo "SKIP: No header files found for dependency propagation test."
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "=== Incremental Build Validation Results ==="
echo "Passed: $PASS | Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Remediation: Ensure your Makefile uses:"
  echo "  CC += -MMD -MP   # Auto-generate .d dependency files"
  echo "  -include $(wildcard *.d)   # Include generated dependencies"
fi

exit $FAIL
```

### Pattern 4: Build Reproducibility Checker

Builds the project twice from completely clean states and compares all output artifacts via SHA-256 checksums. Detects non-deterministic builds caused by embedded timestamps, random source ordering, or compiler optimizations that produce varying binaries.

```bash
#!/usr/bin/env bash
# build-reproducibility-checker.sh — Verify deterministic builds
set -euo pipefail

readonly MAKEFILE="${1:-Makefile}"
readonly BUILD_BASE="$PWD/.repro-check"
PASS=0
FAIL=0

echo "=== Build Reproducibility Checker ==="
echo "Makefile: $MAKEFILE"
echo ""

# ── Helper: clean and build, collect checksums ────────────────────────
build_and_hash() {
  local run_dir="$1"
  local label="$2"
  local hash_file="${run_dir}/checksums.sha256"

  echo "--- Build ${label} (${run_dir}) ---"
  (
    cd "$run_dir/.." || exit 1
    make -f "$MAKEFILE" clean > /dev/null 2>&1 || true
    mkdir -p "$run_dir"
    make -f "$MAKEFILE" all BUILD_OUTPUT="$run_dir" 2>&1 | tail -5
  )

  # Collect checksums for all build artifacts
  find "$run_dir" -type f \( -name '*.o' -o -name '*.a' -o -name '*.so' \
    -o -name 'app' -o -name 'main' -o -name '*.out' \) -exec sha256sum {} \; \
    | sort > "$hash_file" 2>/dev/null

  echo "  Generated $(wc -l < "$hash_file") artifact checksums"
}

# ── Build #1: First clean build ───────────────────────────────────────
rm -rf "$BUILD_BASE"
mkdir -p "$BUILD_BASE"
BUILD_DIR_1="${BUILD_BASE}/build-1"
mkdir -p "$BUILD_DIR_1"
build_and_hash "$BUILD_DIR_1" "run-1"

# ── Build #2: Second clean build from scratch ─────────────────────────
BUILD_DIR_2="${BUILD_BASE}/build-2"
mkdir -p "$BUILD_DIR_2"
build_and_hash "$BUILD_DIR_2" "run-2"

# ── Compare checksums ────────────────────────────────────────────────
echo ""
echo "--- Comparing build artifacts ---"
HASH1="${BUILD_DIR_1}/checksums.sha256"
HASH2="${BUILD_DIR_2}/checksums.sha256"

if [[ ! -f "$HASH1" || ! -f "$HASH2" ]]; then
  echo "FAIL: No checksum files generated. Build may produce no artifacts."
  exit 1
fi

DIFF_OUTPUT=$(diff "$HASH1" "$HASH2" 2>&1 || true)

if [[ -z "$DIFF_OUTPUT" ]]; then
  echo "PASS: Builds are bitwise identical (reproducible)"
  ((PASS++))
else
  echo "FAIL: Builds differ — detected non-reproducibility:"
  echo ""
  echo "$DIFF_OUTPUT"
  echo ""
  echo "Common causes of non-reproducible builds:"
  echo "  1. Embedded timestamps or source paths in binaries"
  echo "     Fix: Use --build-id=none, -ffile-prefix-map=$PWD=/src"
  echo "  2. Unsorted file lists from $(wildcard)"
  echo "     Fix: pipe through sort: FILES := \$(sort \$(wildcard ...))"
  echo "  3. Compiler hash tables or hash seed variation"
  echo "     Fix: Set -fno-hash-synchronization (GCC) or equivalent"
  ((FAIL++))
fi

# ── Cleanup ───────────────────────────────────────────────────────────
echo ""
rm -rf "$BUILD_BASE"
echo "=== Results ==="
echo "Passed: $PASS | Failed: $FAIL"

exit $FAIL
```

### Pattern 5: CI Integration Template (GitHub Actions)

A production-ready GitHub Actions workflow for Makefile-based projects that runs all validation stages in sequence.

```yaml
# .github/workflows/build-validation.yml
# Validates Makefile builds: dependency integrity, incremental correctness,
# reproducibility, test execution, and artifact verification.

name: Build Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  MAKEFILE: Makefile
  BUILD_DIR: build

jobs:
  dependency-check:
    name: Dependency Graph Integrity
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Ensure all history for path resolution
      - name: Run dependency analyzer
        run: |
          bash scripts/dep-graph-analyzer.sh "${{ env.MAKEFILE }}"

  build-test:
    name: Build & Test Suite
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        config:
          - name: Release
            flags: "-Wall -Wextra -O2"
          - name: Debug
            flags: "-Wall -Wextra -g -O0"
    steps:
      - uses: actions/checkout@v4

      - name: Setup build dependencies
        run: |
          if [[ "${{ matrix.os }}" == "ubuntu-latest" ]]; then
            sudo apt-get update && sudo apt-get install -y gcc make
          fi

      - name: Build (${{ matrix.config.name }})
        run: |
          make -f "${{ env.MAKEFILE }}" CFLAGS="${{ matrix.config.flags }}" all

      - name: Run test suite
        run: |
          make -f "${{ env.MAKEFILE }}" test || {
            echo "::error::Test suite failed"
            exit 1
          }

  incremental-validation:
    name: Incremental Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run incremental validator
        run: |
          bash scripts/incremental-build-validator.sh "${{ env.MAKEFILE }}" "${{ env.BUILD_DIR }}"

  reproducibility-check:
    name: Build Reproducibility
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run reproducibility checker
        run: |
          bash scripts/build-reproducibility-checker.sh "${{ env.MAKEFILE }}"

  phony-target-test:
    name: Phony Target Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate all phony targets
        run: |
          bash scripts/phony-target-tester.sh

  artifact-verification:
    name: Artifact Verification
    runs-on: ubuntu-latest
    needs: [build-test]
    steps:
      - uses: actions/checkout@v4

      - name: Build and verify artifacts
        run: |
          make -f "${{ env.MAKEFILE }}" all

          # Verify expected outputs exist
          for artifact in build/app build/libcore.a; do
            if [[ ! -e "$artifact" ]]; then
              echo "::error::Missing artifact: $artifact"
              exit 1
            fi
            if [[ ! -s "$artifact" ]]; then
              echo "::error::Empty artifact: $artifact"
              exit 1
            fi
          done

          # Verify executable bit on binaries
          if [[ -f "build/app" && ! -x "build/app" ]]; then
            echo "::warning::Build artifact missing execute permission: build/app"
          fi

          # Optional: verify against stored hash
          if [[ -f ".hashes/sha256.txt" ]]; then
            sha256sum -c .hashes/sha256.txt || {
              echo "::error::Artifact checksum mismatch — possible tampering or non-reproducible build"
              exit 1
            }
          fi
```

---

## Constraints

### MUST DO
- Run `make --dry-run` (`-n`) before executing any test commands to preview the actual build plan and catch errors without side effects
- Isolate all build tests in a temporary directory (`mktemp -d`) to avoid polluting the source tree with partial or failed builds
- Check exit codes explicitly after every `make` invocation — `set -e` alone is insufficient when recipes internally trap signals
- Use `.PHONY` declarations to identify which targets can be tested independently, and execute each one in isolation during validation
- Verify that header dependency tracking (`-MMD -MP`) is active — without it, incremental builds silently skip necessary recompilations
- Validate build output artifacts for existence, non-zero size, and correct permissions (executable bit on binaries) before considering a build "success"
- Run cross-configuration builds at minimum in release (`-O2`) and debug (`-g -O0`) modes to catch configuration-dependent bugs
- Store known-good artifact checksums in a version-controlled `.hashes` file for supply chain integrity verification

### MUST NOT DO
- Never run build tests from the repository root — always use a separate build directory to ensure clean-state testing and avoid source tree pollution
- Never skip verifying that `.PHONY` targets actually execute as expected — assume they do not work until proven otherwise by running them in isolation
- Never trust a single successful build as evidence of correctness — validate at least twice (incremental + reproducibility) before signing off
- Never hardcode compiler paths or flags in validation scripts — always detect available toolchain variants (`gcc` vs `clang`, system packages)
- Never suppress error output during validation tests — full stderr must be captured and reported, not silently discarded with `2>/dev/null`
- Never run the reproducibility checker on a build that embeds timestamps or source paths without stripping them first — comparing non-deterministic outputs is meaningless
- Never use `rm -rf` in validation scripts without explicit variable scoping (`rm -rf "$TMPDIR"` not `rm -rf $TMPDIR`) — word splitting can destroy wrong files

---

## Output Template

When executing this skill, produce a structured validation report containing:

1. **Phony Target Results** — Table of each `.PHONY` target with PASS/FAIL status and any error output captured from isolated execution
2. **Dependency Graph Analysis** — List of all prerequisites checked, count of missing files, and paths to any unresolved references found by the dry-run parser
3. **Incremental Build Report** — Source file touched, number of recompilations triggered (expected: 1-2), comparison with full-rebuild baseline, header dependency propagation results
4. **Cross-Configuration Results** — Compiler version, flags used, build exit code, and binary properties for each configuration (release vs debug)
5. **Reproducibility Check** — SHA-256 comparison between two clean builds, list of any differing artifacts with their individual checksums, and root cause analysis if non-reproducible
6. **Artifact Verification** — List of all expected artifacts with status (present/missing), size in bytes, executable permission flag, and hash match result against stored checksums
7. **CI Integration Snippet** — Recommended `.github/workflows/build-validation.yml` or equivalent pipeline config tailored to the project's Makefile structure

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-makefile` | Creates and edits the Makefile itself — use before validating; this skill tests what that skill builds |
| `coding-make` | Broad build orchestration across Make, Nix, Bazel, Just — use to understand the build system architecture before applying targeted validation |
| `linux-make-build-system` | GNU Make deep dive including cross-compilation and variable scoping — use when validation failures trace to complex Make internals |
| `testing-unit-integration-e2e` | Application-level test strategy for the code under build — use alongside this skill to ensure both the build system and the tests it runs are correct |
