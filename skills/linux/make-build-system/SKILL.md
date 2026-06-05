---




name: make-build-system
description: Implements GNU Make build automation including dependency graphs, phony targets, variable scoping, pattern rules, automatic variables, cross-compilation, and CI/CD integration for reproducible software builds.
license: MIT
compatibility: opencode
metadata:
  version: "2.0.0"
  domain: linux
  triggers: makefile, GNU make, build automation, incremental builds, phony targets, pattern rules, automatic variables, how do i automate builds with make
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: coding-just-task-runner, coding-mage-build-tool, linux-systemd-services, coding-test-driven-development




---





# GNU Make Build System

Implements reproducible, incremental software builds using GNU Make. Makefiles are not just lists of commands — they are declarative dependency graphs that encode build logic, variable scoping rules, platform detection, and automated workflows for compilation, testing, packaging, and deployment across diverse development environments.

## TL;DR Checklist

- [ ] Define all non-file targets as `.PHONY`
- [ ] Use explicit pattern rules (`%.o: %.c`) instead of hardcoded recipes
- [ ] Separate build variables by scope (global vs target-specific)
- [ ] Validate dependency graphs with `make -n` before committing Makefiles
- [ ] Use automatic variables (`$@`, `$<`, `$^`, `${?}`) to keep recipes DRY
- [ ] Include `.PHONY: all clean install test build` at the top
- [ ] Use `$(shell ...)` only when make itself cannot determine a value from file timestamps

---

## When to Use

Use this skill when:

- Writing or refactoring a Makefile for a C, C++, Go, Rust, or general-purpose project build pipeline
- Automating repetitive development workflows (compile, test, lint, package, deploy) into a single `make` command
- Setting up cross-compilation targets for different architectures or platforms
- Integrating Make-based builds into CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Migrating from manual shell scripts to structured, dependency-aware build automation
- Creating portable build systems that work across Linux, macOS, and WSL environments

---

## When NOT to Use

Avoid GNU Make when:

- Building complex software projects with deep dependency resolution — use `cmake`, `ninja`, or language-specific build tools (Maven, Gradle, cargo) instead
- Working with pure Go projects — use `Mage` (`coding-mage-build-tool`) which provides type-safe targets in Go code
- You need a cross-platform task runner without Make's tab-parsing quirks — use `just` (`coding-just-task-runner`) instead
- The project is Python-based with no compiled components — use `uv run`, `pyproject.toml scripts`, or plain shell for simplicity
- Build logic exceeds 500 lines in a single Makefile — split into multiple `.mk` include files or consider a dedicated build system

---

## Core Workflow

1. **Analyze the project structure** — Identify source directories, target binary names, test frameworks, and any existing build scripts. Determine whether the project needs cross-compilation or is single-platform only.
2. **Define core targets first** — Start with `all`, `clean`, `build`, `test` as `.PHONY` targets. Each must have an explicit recipe or dependency chain. **Checkpoint:** Run `make -n all` to verify the dependency graph produces the expected build sequence without executing commands.
3. **Add pattern rules** — Replace hardcoded compilation recipes with pattern rules (`%.o: %.c`). Use automatic variables so the rule works for every file without modification. **Checkpoint:** Verify that adding a new `.c` source file to `SRCS` automatically includes it in the build.
4. **Configure variable scoping** — Separate global variables (compiler flags, install prefix) from target-specific variables (per-target CFLAGS). Use `override` only when an external environment variable must be superseded by Makefile logic. **Checkpoint:** Run `make -p | grep "CFLAGS"` to verify no unintended global override of target-specific flags.
5. **Add cross-compilation and platform detection** — Detect the host OS via `$(OS)` or `$(shell uname -s)`. Define architecture-specific toolchain variables (`CC`, `CXX`) that can be overridden from the command line. **Checkpoint:** Cross-compile for a different target using `make CROSS_COMPILE=arm-linux-gnu- ARCH=arm64`.
6. **Add CI/CD integration targets** — Create dedicated targets like `ci`, `lint`, `coverage`, `docker-build` that mirror what the CI pipeline runs locally. This ensures local and CI builds stay in sync. **Checkpoint:** Run `make ci` on a clean checkout and confirm it matches CI output exactly.

---

## Implementation Patterns

### Pattern 1: Variable Scoping and Automatic Variables

GNU Make supports multiple variable types. Understanding scope prevents subtle bugs where flags leak between targets or environment variables override intended defaults.

```makefile
# Global build configuration — defaults that can be overridden from command line
CC           ?= gcc
CXX          ?= g++
AR           ?= ar
CFLAGS       ?= -Wall -Wextra -Wpedantic -O2
CXXFLAGS     ?= $(CFLAGS)
LDFLAGS      ?= -lm
PREFIX       ?= /usr/local

# Directory layout (relative paths — portable across systems)
SRCDIR       := src
BUILDDIR     := build
INCDIR       := include
BINDIR       := bin

# Collect all sources and derive object file paths automatically
SRCS         := $(wildcard $(SRCDIR)/*.c)
OBJS         := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))
TARGET       := $(BINDIR)/myapp

# Automatic variables in pattern rules:
#   $@  — target filename (the thing on the left side of :)
#   $<  — first prerequisite (leftmost dependency)
#   $^  — all prerequisites, deduplicated
#   $?  — only prerequisites newer than target
#   $*  — stem from pattern rule matching (%.c -> stem is the part before .c)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -I$(INCDIR) -c $< -o $@
```

**Why this works:** The `| $(BUILDDIR)` order-only prerequisite ensures the build directory exists before compilation starts, but changes to the directory itself do not trigger recompilation. Pattern rules apply automatically to every `.c` file in `SRCDIR`, so adding new sources requires no Makefile changes.

### Pattern 2: Phony Targets and Dependency Chains

Phony targets represent actions that do not produce output files. They must be declared explicitly or Make may confuse them with real files.

```makefile
# Declare all phony targets at the top of the file — this is critical
.PHONY: all clean install uninstall test lint docker-build ci help

# Default target — builds everything
all: $(TARGET)
	@echo "Build complete: $(TARGET)"

# Binary depends on all object files
$(TARGET): $(OBJS)
	$(CC) $^ $(LDFLAGS) -o $@

# Build directory creation (order-only prerequisite for .o targets)
$(BUILDDIR):
	mkdir -p $@

$(BINDIR):
	mkdir -p $@

# Clean — remove all generated artifacts
clean:
	rm -rf $(BUILDDIR) $(BINDIR)

# Install — copy binary to PREFIX/bin
install: $(TARGET)
	install -d $(PREFIX)/bin
	install -m 755 $(TARGET) $(PREFIX)/bin/

# Uninstall — remove installed files
uninstall:
	rm -f $(PREFIX)/bin/$(notdir $(TARGET))

# Test — compile and run the test suite
test: $(TARGET)
	./run_tests.sh --verbose

# Help — display usage information
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  all          Build the project (default)"
	@echo "  clean        Remove all generated files"
	@echo "  install      Install to $(PREFIX)/bin/"
	@echo "  uninstall    Remove installed binary"
	@echo "  test         Run the test suite"
	@echo "  lint         Run static analysis (requires clang-tidy)"
	@echo "  docker-build Build Docker image"
	@echo "  ci           Full CI pipeline (lint + test + build)"
	@echo "  help         Show this help message"
```

**Why this works:** The `help` target uses `@echo` with no recipe dependencies, making it a pure documentation tool. Targets are ordered by dependency — `all` → `$(TARGET)` → objects — so running `make` alone produces a complete build. Each target is independent; running `make test` after `make clean` still rebuilds the binary first because of the dependency chain.

### Pattern 3: Cross-Compilation with Platform Detection

Portable Makefiles detect the host platform and allow overrides for cross-compilation targets. This pattern works on Linux, macOS, and WSL without modification.

```makefile
# Platform detection — works on Linux, macOS, and WSL
ifeq ($(OS),Windows_NT)
    HOST_OS := windows
    RM      := del /Q /F
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        HOST_OS := linux
        RM      := rm -f
    endif
    ifeq ($(UNAME_S),Darwin)
        HOST_OS := darwin
        RM      := rm -f
    endif
endif

# Cross-compilation support — override these from command line:
#   make CROSS_COMPILE=arm-linux-gnu- ARCH=arm64
CROSS_COMPILE ?=
CC            := $(CROSS_COMPILE)gcc
CXX           := $(CROSS_COMPILE)g++
AR            := $(CROSS_COMPILE)ar

# Architecture-specific flags
ifeq ($(ARCH),arm64)
    CFLAGS += -march=armv8-a+fp+simd
else ifeq ($(ARCH),riscv64)
    CFLAGS += -march=rv64gc
endif

# Docker cross-compile target — builds inside a container for reproducible results
docker-build:
	docker build --build-arg ARCH=$(ARCH) -t $(TARGET):$(ARCH) .

# Native build with verbose output (for debugging build failures)
V ?= 0
ifeq ($(V),1)
    Q :=
    VERBOSE := | tee build.log
else
    Q := @
    VERBOSE :=
endif

quiet-build:
	$(Q)$(MAKE) all $(VERBOSE)
```

**Why this works:** The `CROSS_COMPILE` prefix pattern matches how the Linux kernel and most toolchains handle cross-compilation. Platform detection uses `uname -s` output, which is reliable across POSIX systems. The `V=1` variable allows on-demand verbose builds without modifying the Makefile, following the convention used by the Linux kernel build system.

### Pattern 4: CI/CD Integration and Advanced Patterns

Production Makefiles include linting, coverage tracking, Docker image building, and environment-aware behavior that mirrors CI pipeline execution locally.

```makefile
# Coverage tracking with gcov/lcov (GCC projects)
COVERAGE_DIR := $(BUILDDIR)/coverage
COVERAGE_FLAGS := -fprofile-arcs -ftest-coverage

test-coverage: CFLAGS += $(COVERAGE_FLAGS)
test-coverage: $(TARGET)
	$(Q)mkdir -p $(COVERAGE_DIR)
	$(Q)cd $(BUILDDIR) && lcov --capture --directory . --output-file coverage.info
	$(Q)genhtml coverage.info --output-directory $(COVERAGE_DIR)/report

# Linting target — requires clang-tidy and shellcheck
lint:
	@command -v clang-tidy >/dev/null 2>&1 || { echo "Error: clang-tidy not found" >&2; exit 1; }
	$(Q)clang-tidy $(SRCS) -- -I$(INCDIR) $(CFLAGS) --quiet
	$(Q)shellcheck scripts/*.sh || true

# Docker image build with multi-stage support
docker-build:
	docker build --pull --target production -t $(TARGET):latest .
	docker tag $(TARGET):latest $(TARGET):$(shell git rev-parse --short HEAD)

# CI pipeline target — runs everything the CI server runs
ci: lint test-coverage all docker-build
	@echo "CI pipeline complete"

# Environment variable injection for build-time configuration
BUILD_VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "unknown")
BUILD_DATE    ?= $(shell date +%Y-%m-%dT%H:%M:%S%z)
CFLAGS        += -DBUILD_VERSION=\"$(BUILD_VERSION)\" \
                 -DBUILD_DATE=\"$(BUILD_DATE)\"

# Include external makefiles for modular build logic (project split pattern)
# Create separate .mk files for subsystems: src/core.mk, tests/unit.mk, etc.
-include $(wildcard mk/*.mk)

# Dry-run — show what make would do without executing
.PHONY: dryrun
dryrun:
	$(info === Makefile variables ===)
	$(info CC=$(CC), CFLAGS=$(CFLAGS))
	$(info SRCS=$(SRCS))
	$(info OBJS=$(OBJS))
	$(info TARGET=$(TARGET))
	$(info HOST_OS=$(HOST_OS))
	@echo ""
	@echo "=== Build plan (dry-run) ==="
	@make -n all
```

**Why this works:** The `-include $(wildcard mk/*.mk)` pattern allows splitting large Makefiles into modular subsystems without breaking compatibility — if the directory doesn't exist, the include is silently ignored (the `-` prefix suppresses errors). Build-time version injection via `$(shell ...)` captures git metadata at build time for reproducible traceability. The `dryrun` target uses Make's built-in `$(info ...)` function to print variable states alongside a dry-run of the actual build commands, which is invaluable for debugging complex dependency graphs.

---

## Constraints

### MUST DO
- Declare every non-file-producing target as `.PHONY` — this prevents stale builds when a file with that name exists
- Use `$(wildcard ...)` and `$(patsubst ...)` to auto-discover sources instead of maintaining hardcoded source lists
- Prefer automatic variables (`$@`, `$<`, `$^`) over hardcoded paths in recipes — they adapt to any file names
- Separate build directories from source using the `|` order-only prerequisite syntax (e.g., `$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)`)
- Use `?=` for variables that may be overridden from the environment or command line, and `:=` for computed values set by the Makefile
- Include a `help` target that documents all available targets — every production Makefile needs this
- Run `make -n` (dry-run) after any Makefile change to verify dependency resolution before committing

### MUST NOT DO
- Do not use tab characters inconsistently — Makefile recipes MUST begin with a tab, not spaces. Mixing tabs and spaces is the #1 Makefile error source.
- Do not hardcode absolute paths in recipes — use variables (`$(BINDIR)`, `$(PREFIX)`) for portability across developer machines and CI environments
- Do not place logic-heavy shell commands inline in recipes when a separate script file would be cleaner — move complex logic to `.sh` scripts and invoke them via Make targets
- Do not forget `.PHONY` declarations — without them, Make treats target names as files and skips execution if a file with that name exists in the directory
- Do not use recursive `$(MAKE)` calls (`$(MAKE) clean`) unless necessary — it obscures dependency tracking and makes `make -j` parallel builds unreliable
- Do not define targets without recipe or dependency — an empty target with no prerequisites is silently skipped, creating silent failures

---

## Output Template

When this skill is active, the model's output must contain:

1. **Complete Makefile content** — a fully functional, copy-paste-ready Makefile with all targets declared as `.PHONY`
2. **Variable definitions** — clear separation of compiler settings, directory layout, source discovery, and platform detection variables
3. **Pattern rules** — at least one explicit pattern rule using automatic variables (`$@`, `$<`, `$^`)
4. **Dependency chain explanation** — a brief description of how `all` → build targets → sources connect
5. **CI/CD integration target** — a combined target (e.g., `ci`) that runs lint, test, and build in sequence

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-just-task-runner` | Cross-platform task runner for projects where Make's tab/space parsing is problematic; supports named arguments and runsets |
| `coding-mage-build-tool` | Type-safe build tool in Go — ideal when project is already Go-based and you want compile-time target validation |
| `linux-systemd-services` | Define systemd unit files for deploying applications built via Make as persistent services |
| `coding-test-driven-development` | TDD workflow patterns that pair naturally with `make test` targets for automated quality gates |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html)
- [GNU Make — Directory Variables](https://www.gnu.org/software/make/manual/html_node/Directory_002fTarget-Specific.html)
- [GNU Make — Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Pattern-Rules.html)
- [GNU Make — Automatic Variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html)
- [GNU Make — Phony Targets](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)
- [Makefile Rules for C/C++ Projects](https://www.gnu.org/software/make/manual/make.html#C_002b_002b-Example)
