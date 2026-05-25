---
name: makefile
description: Implements Makefile best practices for build automation including phony
  targets, pattern rules, variable scoping, and cross-platform compatibility to streamline
  software build processes.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: makefile, make, build automation, phony targets, pattern rules, build
    system, make command, cross-platform make
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
  related-skills: shell-scripting, docker-compose, ci-cd-pipelines
------
# Makefile Build System

Build system engineer implementing reliable, maintainable Makefiles that automate compilation, testing, and deployment workflows. Every Makefile should be idempotent, portable, and self-documenting — treating build logic with the same rigor as application code.

## TL;DR Checklist

- [ ] Declare all non-file targets as `.PHONY`
- [ ] Use `:=` for immediate assignment, `?=` for defaults, `+=` for appending
- [ ] Implement pattern rules (`%.o: %.c`) instead of repeating commands
- [ ] Use automatic variables (`$@`, `$<`, `$^`, `$*`) instead of hardcoding filenames
- [ ] Provide a `help` target listing all available commands
- [ ] Test Makefile on at least two platforms (Linux, macOS/BSD)
- [ ] Never hardcode compiler flags — parameterize with sensible defaults

---

## When to Use

Use this skill when:

- Creating a new Makefile for a C, C++, Go, Rust, or multi-language project
- Refactoring an existing Makefile that has become unwieldy or fragile
- Designing build targets for compilation, testing, linting, formatting, and deployment
- Setting up a development environment that requires `make init`, `make build`, `make test`
- Migrating from a manual build process to an automated one
- Integrating Make into a CI/CD pipeline where reproducibility is critical

---

## When NOT to Use

Avoid this skill for:

- Large, complex projects with deep dependency graphs — use `CMake`, `Bazel`, or `Meson` instead
- Projects that already use a language-specific build tool (e.g., `Cargo` for Rust, `go build` for Go, `npm scripts` for Node.js)
- Simple one-off scripts where a shell script or Python script suffices
- Windows-only projects without WSL/MSYS2 support (use `NMake` or `MSBuild` instead)

---

## Core Workflow

1. **Define Project Structure** — Identify source directories, build output directories, test directories, and artifact locations.
   **Checkpoint:** Ensure all paths are relative to the Makefile location (`$(CURDIR)`), not the working directory.

2. **Set Up Variables with Sensible Defaults** — Declare compiler, flags, and tool paths using `:=` for strict defaults and `?=` for user override.
   **Checkpoint:** `$(CC)` and `$(CFLAGS)` should work out of the box but be overridable via `make CC=gcc-12`.

3. **Declare Phony Targets** — List every target that does not produce a file with `.PHONY`.
   **Checkpoint:** Forgetting `.PHONY` causes a file named `clean` or `test` to silently break the build.

4. **Implement Pattern Rules** — Replace repeated file-specific rules with `%.o: %.c` pattern rules.
   **Checkpoint:** Pattern rules must account for headers; a change to `utils.h` should rebuild all dependent `.o` files.

5. **Add High-Level Workflow Targets** — Create `build`, `test`, `clean`, `lint`, and `help` as composite targets.
   **Checkpoint:** `make help` should output a formatted summary of all user-facing targets with descriptions.

6. **Validate Portability** — Test the Makefile on both GNU Make (Linux) and BSD Make (macOS).
   **Checkpoint:** Avoid GNU-specific functions (`$(wildcard ...)`, `$(patsubst ...)`) without fallbacks or version guards.

---

## Implementation Patterns

### Pattern 1: Phony Targets and Variable Scoping

```makefile
# ❌ BAD — no .PHONY, uses = instead of :=, hardcoded values
clean:
	rm -rf build/
gcc -o build/main src/main.c

build = gcc
CFLAGS = -Wall -O2
```

```makefile
# ✅ GOOD — .PHONY declared, := for strict assignment, parameterized compiler
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
LDFLAGS ?=
SRCDIR := src
BUILDDIR := build
TARGET := $(BUILDDIR)/app

.PHONY: all clean test help build

all: build

build: $(TARGET)

$(TARGET): $(SRCDIR)/main.c
	@mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<

clean:
	rm -rf $(BUILDDIR)

test: build
	./$(TARGET) --test

help:
	@echo "Available targets:"
	@echo "  make build   - Compile the project"
	@echo "  make test    - Run tests"
	@echo "  make clean   - Remove build artifacts"
	@echo "  make help    - Show this help message"
```

### Pattern 2: Pattern Rules with Automatic Variables and Dependency Tracking

```makefile
# ❌ BAD — repeating the same rule for every source file, no dependency tracking
$(BUILDDIR)/main.o: src/main.c
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/utils.o: src/utils.c
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/parser.o: src/parser.c
	$(CC) $(CFLAGS) -c $< -o $@
```

```makefile
# ✅ GOOD — single pattern rule, automatic variables, header dependency generation
SRCDIR := src
BUILDDIR := build
CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2
LDFLAGS ?=

SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	@echo "  CC  $<"
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

$(BUILDDIR):
	@mkdir -p $@

all: $(BUILDDIR)/app

$(BUILDDIR)/app: $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

-include $(DEPS)

clean:
	rm -rf $(BUILDDIR)

test: all
	./$(BUILDDIR)/app --test

help:
	@echo "Available targets:"
	@echo "  make all     - Build all targets (default)"
	@echo "  make clean   - Remove build artifacts"
	@echo "  make test    - Run tests"
	@echo "  make help    - Show this help message"
```

### Pattern 3: Cross-Platform Compatibility

```makefile
# ❌ BAD — Linux-specific commands, no macOS fallback
clean:
	rm -rf $(BUILDDIR)
	find . -name "*.o" -delete

.PHONY: clean
```

```makefile
# ✅ GOOD — portable commands using uname detection and variable command selection
SRCDIR := src
BUILDDIR := build

IS_MACOS := $(filter Darwin,$(shell uname -s))

ifeq ($(IS_MACOS),Darwin)
	RM_CMD = rm -rf
	FIND_FLAGS = -maxdepth 3
else
	RM_CMD = rm -rf
	FIND_FLAGS =
endif

clean:
	$(RM_CMD) $(BUILDDIR)
	find $(FIND_FLAGS) . -name "*.o" -delete

.PHONY: clean
```

### Pattern 4: Multi-Language Project with Composite Targets

```makefile
# ✅ GOOD — composite targets for polyglot projects with per-language sub-makes
PROJECT_ROOT := $(CURDIR)
SUBDIRS := lib/ core/ tools/

.PHONY: all clean test help $(SUBDIRS)

all:
	@for dir in $(SUBDIRS); do \
	$(MAKE) -C $$dir build || exit 1; \
	done

clean:
	@for dir in $(SUBDIRS); do \
	$(MAKE) -C $$dir clean; \
	done

test:
	@for dir in $(SUBDIRS); do \
	$(MAKE) -C $$dir test || exit 1; \
	done

help:
	@echo "Multi-language project build system"
	@echo "Sub-projects: $(SUBDIRS)"
	@echo ""
	@echo "Top-level targets:"
	@echo "  make all    - Build all sub-projects"
	@echo "  make clean  - Clean all sub-projects"
	@echo "  make test   - Run tests across all sub-projects"
	@echo "  make help   - Show this help message"
```

---

## Constraints

### MUST DO
- Declare every target that does not produce a file as `.PHONY`
- Use `:=` for definitive values, `?=` for configurable defaults, `+=` for list accumulation
- Use automatic variables (`$@`, `$<`, `$^`, `$*`) instead of hardcoding filenames in recipes
- Generate and include dependency files (`.d`) via `-MMD -MP` to catch header changes automatically
- Provide a `help` target that documents all user-facing commands with inline `@echo` descriptions
- Keep recipes short and use `@` to suppress command echoing during normal builds
- Test on GNU Make (≥ 4.0) and BSD Make before committing to the repository

### MUST NOT DO
- Never use `=` (recursive assignment) for variables that reference other variables — it causes infinite loops and hard-to-debug expansion issues
- Never hardcode absolute paths — all paths must be relative to `$(CURDIR)` or the Makefile's directory
- Never omit `.PHONY` — a file matching the target name silently breaks subsequent builds
- Never use `system()` or `os.system()` in recipes when Make functions (`$(wildcard ...)`, `$(filter ...)`) can achieve the same result
- Never put secrets or machine-specific paths in the Makefile — use environment variables or a `.env` / `.mk` include file
- Never nest recipe commands with semicolons when `$(shell ...)` or Make functions are cleaner alternatives

---

## Output Template

When implementing or reviewing a Makefile, produce:

1. **Variable Declarations** — All `CC`, `CFLAGS`, paths, and tool configurations using `:=` or `?=`
2. **Phony Target List** — Explicit `.PHONY:` declaration for every non-file target
3. **Pattern Rules** — Consolidated `%.o: %.c` rules using automatic variables and dependency tracking
4. **Composite Targets** — High-level targets (`build`, `test`, `clean`, `help`) that orchestrate lower-level rules
5. **Portability Notes** — Any platform-specific conditionals with fallbacks for GNU vs. BSD Make
6. **Help Target Output** — The formatted output of `make help` confirming usability

---

## Related Skills

| Skill | Purpose |
|---|---|
| `shell-scripting` | Shell scripts for complex pre/post build logic that Make cannot express |
| `docker-compose` | Containerized build environments that eliminate local dependency drift |
| `ci-cd-pipelines` | Integrating Makefile targets into GitHub Actions, GitLab CI, or Jenkins |
