---
name: make-build-system
description: Implements GNU Make build automation including dependency graphs, phony targets, variable scoping, pattern rules, and cross-compilation for reproducible software builds.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  triggers: makefile, GNU make, build automation, incremental builds, phony targets, make variables, dependency graph, cross-compilation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: linux-services, coding-test-driven-development
---

# GNU Make Build System

Implements reproducible, incremental software builds using GNU Make. Makefiles are not just lists of commands — they are declarative dependency graphs that encode build logic, variable scoping rules, and platform detection to automate compilation, testing, packaging, and deployment workflows.

## TL;DR Checklist

- [ ] Define all non-file targets as `phony` if they don't produce files with that exact name
- [ ] Use explicit pattern rules (`%.o: %.c`) instead of hardcoded recipes
- [ ] Separate build variables by scope (global vs target-specific)
- [ ] Validate dependency graphs for correctness before committing Makefiles
- [ ] Use automatic variables ($@, $<, $?^) to keep recipes DRY
- [ ] Test builds with `make -n` (dry-run) and `make clean` before automation

---

## When to Use

Use this skill when:

- Writing or maintaining a `Makefile` for a C/C++ project or any language build pipeline
- Refactoring manual build commands into an automated, incremental build system
- Implementing cross-compilation workflows for embedded or multi-platform targets
- Setting up build pipelines that require deterministic output and dependency tracking
- Teaching build automation best practices to junior engineers

---

## When NOT to Use

Avoid this skill for:

- Simple one-off shell commands — use a script or alias instead of introducing Make overhead
- Language-specific ecosystems with built-in build tools (e.g., `Cargo` for Rust, `npm` for Node.js, `pip`/`setuptools` for Python) unless you need cross-language orchestration
- Projects requiring IDE-integrated incremental builds that understand compiler caches (ccache) natively

---

## Core Workflow

1. **Define the Dependency Graph** — Map source files to their object/file dependencies. Each recipe must declare its inputs and outputs explicitly.
   **Checkpoint:** Every target that produces a file must list prerequisites. Missing dependencies cause silent rebuild failures.

2. **Declare Phony Targets** — Mark targets like `all`, `clean`, `test`, `install` with `.PHONY`. These do not produce files named after the target.
   **Checkpoint:** Any target name matching an actual file on disk must NOT be marked phony, or Make will skip it incorrectly.

3. **Set Variable Scope** — Choose between global (`VAR = value`), target-specific (`target: VAR = value`), and environment-inherited scope. Use `?=` for safe defaults.
   **Checkpoint:** Global variables leak across targets. Target-specific scoping prevents cross-contamination in multi-component builds.

4. **Write Pattern Rules** — Use `%` patterns (`%.o: %.c`) to generalize recipes instead of hardcoding file names. Combine with automatic variables ($@, $<, $?).
   **Checkpoint:** Pattern rules must match file extensions consistently. Mismatches cause Make to fall back to built-in rules or fail silently.

5. **Implement Conditional Logic** — Use `ifeq`, `ifdef`, `ifneq` for platform detection, compiler selection, and feature flags. Leverage `MAKEFLAGS` for recursive builds.
   **Checkpoint:** Conditionals must be evaluated at parse time. Runtime decisions belong in shell recipes, not Make directives.

6. **Validate and Test** — Run `make -n target` to dry-run, `make -p` to dump parsed rules, and `make V=1` for verbose execution before committing.
   **Checkpoint:** A valid Makefile must pass dry-run without errors and produce deterministic output across clean builds.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Project Structure Layout

A well-structured Makefile separates configuration, compilation, testing, and deployment into logical sections with clear variable defaults.

```makefile
# === Configuration (override via `make VAR=value`) ===
CC         ?= gcc
CFLAGS     ?= -Wall -Wextra -O2
LDFLAGS    ?=
TARGET     ?= myapp
SRCDIR     ?= src
BUILDDIR   ?= build
BINDIR     ?= /usr/local/bin

# === Source Discovery ===
SRC        := $(wildcard $(SRCDIR)/*.c)
OBJS       := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRC))
DEPS       := $(OBJS:.o=.d)

# === Phony Targets ===
.PHONY: all clean install test uninstall

# === Default Target ===
all: $(TARGET)

# === Link Step ===
$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

# === Compile Step (Pattern Rule) ===
$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -MMD -MP -c -o $@ $<

# === Directory Creation (Order-Only Prerequisite) ===
$(BUILDDIR):
	mkdir -p $@

# === Clean ===
clean:
	rm -rf $(BUILDDIR) $(TARGET) *.d

# === Auto-included Dependencies ===
-include $(DEPS)
```

### Pattern 2: Cross-Compilation Support (BAD vs. GOOD)

```makefile
# ❌ BAD — Hardcoded cross-compiler, no environment override, missing sysroot
CC = arm-linux-gnueabihf-gcc
CFLAGS = -O2

myapp: main.o
	$(CC) -o $@ $^

main.o: main.c
	$(CC) $(CFLAGS) -c -o $@ $<

# ✅ GOOD — Environment-driven, configurable toolchain, sysroot support, conditional logic
CC       ?= gcc
CROSS    ?=
HOST     := $(shell uname -s | tr '[:upper:]' '[:lower:]')

ifeq ($(TARGET_ARCH), arm)
    CROSS   := arm-linux-gnueabihf-
    CC      := $(CROSS)gcc
    CFLAGS  += -march=armv7-a -mfloat-abi=hard
    LDFLAGS += --sysroot=/opt/arm/sysroot
endif

ifeq ($(HOST), darwin)
    # macOS-specific adjustments (e.g., libtool, BSD sed)
    SED      ?= gsed
    INSTALL  = cp -p
else
    INSTALL  = install -m 755
endif

.PHONY: all clean install

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -MMD -MP -c -o $@ $<

install: $(TARGET)
	$(INSTALL) $(TARGET) $(DESTDIR)/$(BINDIR)/
```

### Pattern 3: Recipe-Level Error Handling & Shell Integration

Makefile recipes execute in `/bin/sh`. Always enforce strict error handling within recipe blocks to match Linux best practices.

```makefile
# ❌ BAD — Silent failures, no quoting, no error propagation
build:
	rm -rf output/
	cp src/*.h output/
	gcc -o app main.o utils.o

# ✅ GOOD — Safe shell execution with set -euo pipefail, proper quoting, and failure isolation
build: $(OBJS)
	@set -euo pipefail; \
	set -x; \
	rm -rf "$(BUILDDIR)/" && mkdir -p "$(BUILDDIR)"; \
	cp "$(SRCDIR)"/*.h "$(BUILDDIR)/" || { echo "Header copy failed" >&2; exit 1; }; \
	$(CC) $(LDFLAGS) -o "$(TARGET)" $(OBJS) || { echo "Link step failed" >&2; exit 1; }; \
	echo "Build successful: $(TARGET)"
```

### Pattern 4: Recursive Build Orchestration

Use `-C` and `MAKE` variables for subdirectory builds, with proper parallelism control.

```makefile
SUBDIRS := lib/ core/ apps/

.PHONY: all clean $(SUBDIRS)

all clean: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)

# === Clean with guaranteed directory iteration ===
clean:
	for dir in $(SUBDIRS); do \
		$(MAKE) -C $$dir clean || exit 1; \
	done
	rm -rf build/ dist/ *.o

# === Parallel-safe variable passing ===
export CC CFLAGS LDFLAGS TARGET_ARCH DESTDIR
```

---

## Constraints

### MUST DO
- Declare all non-file targets as `.PHONY` to prevent stale builds
- Use automatic variables (`$@`, `$<`, `$?`, `$^`) to avoid hardcoding file names in recipes
- Include `-MMD -MP` compiler flags for automatic dependency generation (`.d` files)
- Use order-only prerequisites (`| dir`) for directory creation targets to avoid unnecessary rebuilds
- Provide a `clean` target that removes all build artifacts and caches
- Support variable override from the command line using `?=` defaults
- Wrap multi-line shell recipes in `set -euo pipefail` for failure isolation

### MUST NOT DO
- Hardcode file names in pattern rules — always use `%`, `$@`, or `$<`
- Use tabs inconsistently — recipes MUST begin with a single tab character, not spaces
- Mark actual output files as `.PHONY` — this causes Make to skip valid targets that match the filename
- Embed complex shell logic without quoting — unquoted variables expand late and cause word-splitting bugs
- Rely on implicit built-in rules for production builds — always declare explicit dependencies and recipes
- Use backticks for command substitution inside recipes — use `$(shell ...)` or POSIX `$()` instead
- Place recipe commands after target definitions without tab indentation

---

## Output Template

When implementing or reviewing a Makefile, produce:

1. **Project Layout** — Source directory structure and build output paths
2. **Target Dependency Graph** — Explicit listing of targets, prerequisites, and recipe flow
3. **Variable Scope Map** — Global defaults vs target-specific overrides with `?=` usage
4. **Pattern Rules** — Generalized compilation/linking rules with automatic variable justification
5. **Validation Steps** — Commands to dry-run (`make -n`), dump rules (`make -p`), and test parallel builds (`make -j$(nproc)`)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `linux-services` | Deploy built artifacts as systemd services after successful `make install` |
| `coding-test-driven-development` | Integrate `make test` targets into TDD workflows and CI pipelines |
