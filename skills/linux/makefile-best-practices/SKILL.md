---




name: makefile-best-practices
description: Implements portable, maintainable Makefiles with proper variable scope, dependency management, error handling, and parallel execution patterns for reliable build automation across Unix-like systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  triggers: makefile, make, build automation, target rules, parallel builds, make dependencies, error handling, .PHONY targets
  related-skills: ""
  archetypes:
    - tactical
    - implementation
  anti_triggers:
    - brainstorming
    - vague architecture
    - long-form design
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational




---





# Writing Effective Makefiles

**Role:** Teaches developers to author Makefiles that are portable, maintainable, and robust across different Unix-like systems. When this skill is loaded, the model produces Makefile implementations that follow GNU Make best practices, handle errors gracefully, support parallel execution, and integrate seamlessly with modern CI/CD pipelines.

The skill emphasizes defensive coding patterns: guard against common pitfalls (undefined variables, circular dependencies, race conditions), use declarative rule definitions rather than imperative shell scripts, and structure targets to be independently testable and cacheable.

---

## TL;DR Checklist

- [ ] Define `.PHONY` targets to mark non-file targets (clean, test, all, etc.)
- [ ] Use `:=` for immediate variable expansion; use `=` only when recursive expansion is needed
- [ ] Always place `set -e` in shell commands to halt on errors; use `set +e` only when intentional
- [ ] Add `.DELETE_ON_ERROR` to clean up partial artifacts on recipe failure
- [ ] Declare dependencies explicitly for each target; never rely on implicit ordering
- [ ] Test parallel builds with `make -j4` to catch hidden race conditions
- [ ] Use `$@` (target), `$<` (first dependency), `$^` (all dependencies) for portable rules

---

## When to Use

Use this skill when:

- Writing a new Makefile from scratch for a project (C, Go, Node, Python, etc.)
- Refactoring or modernizing an existing Makefile with technical debt
- Debugging failing builds or parallel execution race conditions
- Integrating Makefile-based builds with CI/CD systems (GitHub Actions, GitLab CI, Jenkins)
- Ensuring Makefiles work portably across Linux, macOS, and CI containers
- Teaching team members Makefile best practices and patterns

---

## When NOT to Use

Avoid this skill for:

- Non-build automation use cases (use shell scripts or Python instead)
- Projects that already use language-native build tools exclusively (Gradle, Cargo, npm)
- One-off, disposable scripts that won't be maintained or shared
- Complex orchestration beyond build/test/deploy (use Kubernetes, Ansible, or task runners)
- When a Makefile would obscure clarity for team members unfamiliar with Make syntax

---

## Core Workflow

### 1. Declare File Targets and Phony Targets

First, identify which targets represent actual files (objects, binaries, archives) and which are actions (test, clean, install). Declare all non-file targets with `.PHONY` to prevent Make from checking for files with those names.

**Checkpoint:** Run `make -n` (dry-run) to verify target rules print correctly; no rules should execute.

### 2. Define Variables with Appropriate Scope

Establish variables at the top of the Makefile for compiler flags, directories, file lists, and tool names. Use `:=` for most variables (immediate expansion); use `=` only when recursive expansion is truly needed (rare). Always quote variables and use late-binding `=` for tool detection conditionals.

**Checkpoint:** Run `make -p | grep "^[A-Z]"` to audit all variable assignments; verify scope is correct.

### 3. Write Explicit Dependency Chains

For each target, declare every file dependency it requires. Use automatic variables (`$@`, `$<`, `$^`) to reference target and dependencies portably. Avoid hardcoded paths.

**Checkpoint:** Run `make --dry-run target` and verify the dependency graph is correct; dependencies should be listed in the correct order.

### 4. Implement Error Handling and Cleanup

Add `set -e` at the start of complex shell recipes to halt on errors. Add `.DELETE_ON_ERROR` to the Makefile to automatically remove partially-built artifacts if a recipe fails. Use explicit exit codes.

**Checkpoint:** Deliberately break a recipe (e.g., create a compile error) and verify the partial artifact is deleted; verify error message is clear.

### 5. Test Parallel Execution

Build with `make -j4` (or higher) to catch hidden race conditions caused by missing dependencies or shared resource access. Add `.NOTPARALLEL` only if truly necessary; redesign targets to be parallel-safe instead.

**Checkpoint:** Run `make -j8 clean all` at least 5 times; verify no failures or inconsistencies occur.

### 6. Integrate with CI/CD and Version Control

Ensure Makefile targets map to CI pipeline stages (test, build, deploy). Support `make install` for artifact installation, `make clean` for teardown. Use environment variables for CI-specific configuration (e.g., `CI`, `BUILD_NUMBER`, `GIT_COMMIT`).

**Checkpoint:** Run Makefile in CI environment with minimal setup; verify `make test` and `make build` succeed independently.

---

## Implementation Patterns

### Pattern 1: Foundational Makefile Structure with Proper Rules and Variables

This pattern demonstrates the minimum viable Makefile structure with correct variable scope, target declaration, and dependency management.

```makefile
# Makefile for a C project
# Best practice: immediate variable assignment, explicit dependencies, .PHONY targets

.PHONY: all build test clean install help

# Compiler and tool configuration (immediate expansion with :=)
CC := gcc
CFLAGS := -Wall -Werror -std=c99 -O2
LDFLAGS := -lm
RM := rm -f
MKDIR := mkdir -p

# Directory structure (immediate expansion)
SRC_DIR := src
BUILD_DIR := build
BIN_DIR := bin
TEST_DIR := test

# Source and object files (immediate expansion, explicit lists)
SOURCES := $(SRC_DIR)/main.c $(SRC_DIR)/utils.c $(SRC_DIR)/config.c
OBJECTS := $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))
TEST_SOURCES := $(TEST_DIR)/test_utils.c
TEST_OBJECTS := $(BUILD_DIR)/test_utils.o
TEST_BIN := $(BIN_DIR)/test_runner
MAIN_BIN := $(BIN_DIR)/app

# Error handling: halt on recipe failure, delete partial artifacts
.DELETE_ON_ERROR:
SHELL := /bin/bash
.SHELLFLAGS := -e -u -o pipefail -c

# Default target
all: $(MAIN_BIN)

# Main binary: depends on all objects
# $@ = target name, $^ = all dependencies
$(MAIN_BIN): $(OBJECTS) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ Built $@"

# Object files: one rule for all .c → .o conversions
# $< = first (and only) dependency
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c -o $@ $<

# Test binary
$(TEST_BIN): $(TEST_OBJECTS) $(filter-out $(BUILD_DIR)/main.o,$(OBJECTS)) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(BUILD_DIR)/test_utils.o: $(TEST_DIR)/test_utils.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c -o $@ $<

# Create directories (order-only dependency with |)
$(BUILD_DIR) $(BIN_DIR):
	$(MKDIR) $@

# Test target (phony, depends on test binary)
test: $(TEST_BIN)
	@echo "Running tests..."
	./$<
	@echo "✓ All tests passed"

# Clean: remove build artifacts
clean:
	$(RM) -r $(BUILD_DIR) $(BIN_DIR)
	@echo "✓ Cleaned build artifacts"

# Install: copy binary to system location (respects PREFIX for portability)
install: $(MAIN_BIN)
	$(MKDIR) $(DESTDIR)$(PREFIX)/bin
	install -m 0755 $(MAIN_BIN) $(DESTDIR)$(PREFIX)/bin/
	@echo "✓ Installed to $(DESTDIR)$(PREFIX)/bin/"

# Help target: lists all available targets
help:
	@echo "Available targets:"
	@echo "  all       - Build the main application (default)"
	@echo "  build     - Alias for all"
	@echo "  test      - Run unit tests"
	@echo "  clean     - Remove build artifacts"
	@echo "  install   - Install binary (respects PREFIX and DESTDIR)"
	@echo "  help      - Display this help message"

# Alias for convenience
build: all
```

**Key Points:**
- **Variable scope:** All variables use `:=` (immediate expansion) for deterministic behavior
- **.PHONY targets:** all, test, clean, install, help, build are declared phony to prevent file conflicts
- **Order-only dependencies:** `| $(BUILD_DIR)` ensures directories are created before files
- **Automatic variables:** `$@` (target), `$<` (first dep), `$^` (all deps) make rules portable
- **Error handling:** `.DELETE_ON_ERROR` removes partial objects if compilation fails
- **Shell options:** `set -e -u -o pipefail` ensures errors in pipes and undefined variables halt the recipe
- **Explicit dependencies:** Every target lists all its direct dependencies

---

### Pattern 2: BAD vs GOOD — Error Handling, Variable Scope, and Dependency Management

This pattern contrasts poor practices with correct ones, highlighting common mistakes.

```makefile
# ❌ BAD EXAMPLE — Multiple errors

# ERROR 1: Recursive expansion causes subtle bugs and slow evaluation
COMPILER = gcc  # Uses = instead of :=
CFLAGS = -Wall -O2 $(COMPILER)FLAGS  # Recursive expansion, hard to debug
WARNINGS = -Wall $(WARNINGS) -Wextra  # INFINITE RECURSION (hidden until expansion)

# ERROR 2: Missing .PHONY, so "clean" target conflicts with clean file if it exists
clean:
	rm -f *.o app
	echo "Cleaned"

# ERROR 3: No .DELETE_ON_ERROR, partial artifacts remain on failure
app: main.o utils.o
	gcc -o app main.o utils.o

# ERROR 4: Shell recipe without set -e; errors silently ignored
main.o: main.c
	gcc -c main.c
	cp main.o /tmp/backup  # If this fails, no error is raised!

# ERROR 5: Missing dependencies or implicit ordering
build: app
	echo "Build done"
app:
	gcc -c main.c -o main.o   # Depends on main.c, but not declared!
	gcc -o app main.o

# ERROR 6: Hardcoded paths reduce portability
install:
	cp app /usr/local/bin/app  # Ignores PREFIX, fails without sudo

---

# ✅ GOOD EXAMPLE — Correct patterns

.PHONY: all clean build test install help

# Immediate expansion with := for deterministic, fast evaluation
CC := gcc
CFLAGS := -Wall -Werror -std=c99 -O2
LDFLAGS := -lm
RM := rm -f

# Explicit file lists (no implicit ordering, no globbing bugs)
SOURCES := src/main.c src/utils.c
OBJECTS := $(SOURCES:.c=.o)
BIN := app

# Error handling: delete partial artifacts on failure
.DELETE_ON_ERROR:
SHELL := /bin/bash
.SHELLFLAGS := -e -u -o pipefail -c

# Default target
all: $(BIN)

# Explicit dependencies, automatic variables for portability
$(BIN): $(OBJECTS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ Built $(BIN)"

# Pattern rule for all .c → .o conversions
%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<
	@echo "  Compiled $<"

# Phony targets clearly marked
clean:
	$(RM) $(OBJECTS) $(BIN)
	@echo "✓ Cleaned artifacts"

# Install respects PREFIX for system-wide configuration
install: $(BIN)
	mkdir -p $(DESTDIR)$(PREFIX)/bin
	install -m 0755 $(BIN) $(DESTDIR)$(PREFIX)/bin/
	@echo "✓ Installed to $(DESTDIR)$(PREFIX)/bin/"

# Test target with explicit shell error handling
test: $(BIN)
	@echo "Running tests..."
	set -e; \
	./$(BIN) --test || { echo "Tests failed"; exit 1; }
	@echo "✓ Tests passed"

help:
	@echo "Targets: all clean install test help"
```

**Comparison:**

| Issue | BAD | GOOD |
|-------|-----|------|
| **Variable Expansion** | `=` (recursive, slow) | `:=` (immediate, fast) |
| **.PHONY Declaration** | Missing | Declared at top |
| **.DELETE_ON_ERROR** | Missing | Present |
| **Error Handling** | No `set -e` | `set -e -u -o pipefail` |
| **Dependencies** | Implicit/missing | Explicit for each target |
| **Portability** | Hardcoded paths | Respects `PREFIX`, `DESTDIR` |
| **Debugging** | Cryptic variable state | Clear, predictable |

---

### Pattern 3: Advanced Makefile with Parallel Builds, Conditional Compilation, and Cross-Platform Support

This pattern demonstrates production-ready features: parallel-safe targets, conditional variable assignment, dependency generation, and platform detection.

```makefile
# Advanced Makefile for a cross-platform C project
# Supports: Linux, macOS, parallel builds (-j), automatic dependency generation

.PHONY: all build test clean install uninstall lint check help

# ========== Platform Detection ==========
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

ifeq ($(UNAME_S),Linux)
  OS := linux
  LDFLAGS += -ldl
else ifeq ($(UNAME_S),Darwin)
  OS := macos
  CFLAGS += -fPIC
else
  OS := unknown
  $(warning Unknown OS: $(UNAME_S))
endif

# ========== Tool Configuration ==========
CC := gcc
CFLAGS := -Wall -Werror -Wextra -std=c99 -O2 -fstack-protector-strong
CFLAGS += -D_DEFAULT_SOURCE -D_POSIX_C_SOURCE=200809L
LDFLAGS := -lm -lpthread
AR := ar
RANLIB := ranlib
INSTALL := install

# For CI environments: stricter flags
ifdef CI
  CFLAGS += -Werror=unused-variable -Werror=shadow
  LDFLAGS += -Wl,-z,relro,-z,now
endif

# ========== Directory Structure ==========
SRC_DIR := src
TEST_DIR := test
BUILD_DIR := build/$(OS)-$(UNAME_M)
BIN_DIR := $(BUILD_DIR)/bin
LIB_DIR := $(BUILD_DIR)/lib
OBJ_DIR := $(BUILD_DIR)/obj
DEP_DIR := $(BUILD_DIR)/dep

# ========== Version and Metadata ==========
VERSION := 1.0.0
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u +"%Y-%m-%d %H:%M:%S UTC")

# Embed version info at compile time
CFLAGS += -DVERSION=\"$(VERSION)\" -DGIT_COMMIT=\"$(GIT_COMMIT)\" -DBUILD_DATE=\"$(BUILD_DATE)\"

# ========== Source Files (Explicit, No Globbing) ==========
CORE_SOURCES := \
  $(SRC_DIR)/main.c \
  $(SRC_DIR)/utils.c \
  $(SRC_DIR)/config.c \
  $(SRC_DIR)/logging.c

LIB_SOURCES := $(CORE_SOURCES)
TEST_SOURCES := $(TEST_DIR)/test_runner.c $(TEST_DIR)/test_utils.c

# Object file mapping
CORE_OBJECTS := $(patsubst $(SRC_DIR)/%.c,$(OBJ_DIR)/%.o,$(CORE_SOURCES))
TEST_OBJECTS := $(patsubst $(TEST_DIR)/%.c,$(OBJ_DIR)/%.o,$(TEST_SOURCES))

# Binaries
APP_BIN := $(BIN_DIR)/myapp
LIB_STATIC := $(LIB_DIR)/libmylib.a
TEST_BIN := $(BIN_DIR)/test_runner

# ========== Error Handling ==========
.DELETE_ON_ERROR:
SHELL := /bin/bash
.SHELLFLAGS := -e -u -o pipefail -c

# ========== Dependency Generation ==========
# Automatically generate .d dependency files during compilation
DEPFLAGS = -MT $@ -MMD -MP -MF $(DEP_DIR)/$*.d

# Include all .d files (loads dependency graph)
-include $(CORE_OBJECTS:.o=.d)
-include $(TEST_OBJECTS:.o=.d)

# ========== Main Targets ==========

all: $(APP_BIN) $(LIB_STATIC)

$(APP_BIN): $(CORE_OBJECTS) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ Built $@ ($(OS)-$(UNAME_M))"

$(LIB_STATIC): $(LIB_SOURCES:.c=.o) | $(LIB_DIR)
	$(RM) $@
	$(AR) rcs $@ $(filter-out $(OBJ_DIR)/main.o,$^)
	$(RANLIB) $@
	@echo "✓ Created static library $@"

# ========== Object Files with Dependency Generation ==========

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c | $(OBJ_DIR) $(DEP_DIR)
	$(CC) $(CFLAGS) $(DEPFLAGS) -c -o $@ $<
	@echo "  [$(OS)] Compiled $<"

$(OBJ_DIR)/%.o: $(TEST_DIR)/%.c | $(OBJ_DIR) $(DEP_DIR)
	$(CC) $(CFLAGS) $(DEPFLAGS) -c -o $@ $<

# ========== Test Target ==========

test: $(TEST_BIN)
	@echo "Running tests on $(OS)-$(UNAME_M)..."
	./$<
	@echo "✓ All tests passed"

$(TEST_BIN): $(TEST_OBJECTS) $(filter-out $(OBJ_DIR)/main.o,$(CORE_OBJECTS)) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

# ========== Directory Creation ==========

$(BIN_DIR) $(LIB_DIR) $(OBJ_DIR) $(DEP_DIR):
	mkdir -p $@

# ========== Code Quality Targets ==========

lint:
	@echo "Linting source files..."
	@cppcheck --enable=all --error-exitcode=1 $(SRC_DIR) || true
	@splint -preprocess $(CFLAGS) $(CORE_SOURCES) 2>/dev/null || echo "splint not available"

check: lint
	@echo "✓ Code quality checks passed"

# ========== Install and Uninstall ==========

# Support PREFIX (system-wide) and DESTDIR (staging) for package managers
PREFIX := /usr/local
DESTDIR :=

install: $(APP_BIN) $(LIB_STATIC)
	mkdir -p $(DESTDIR)$(PREFIX)/bin
	mkdir -p $(DESTDIR)$(PREFIX)/lib
	mkdir -p $(DESTDIR)$(PREFIX)/include
	$(INSTALL) -m 0755 $(APP_BIN) $(DESTDIR)$(PREFIX)/bin/
	$(INSTALL) -m 0644 $(LIB_STATIC) $(DESTDIR)$(PREFIX)/lib/
	$(INSTALL) -m 0644 include/*.h $(DESTDIR)$(PREFIX)/include/
	@echo "✓ Installed to $(DESTDIR)$(PREFIX)"

uninstall:
	rm -f $(DESTDIR)$(PREFIX)/bin/$(notdir $(APP_BIN))
	rm -f $(DESTDIR)$(PREFIX)/lib/$(notdir $(LIB_STATIC))
	@echo "✓ Uninstalled"

# ========== Cleaning ==========

clean:
	rm -rf $(BUILD_DIR)
	@echo "✓ Cleaned $(BUILD_DIR)"

distclean: clean
	find . -name "*.o" -delete
	find . -name "*.d" -delete
	@echo "✓ Removed all generated files"

# ========== Build Info ==========

info:
	@echo "Build Configuration:"
	@echo "  OS:        $(OS)"
	@echo "  Arch:      $(UNAME_M)"
	@echo "  Compiler:  $(CC) ($(shell $(CC) --version | head -1))"
	@echo "  Version:   $(VERSION)"
	@echo "  Commit:    $(GIT_COMMIT)"
	@echo "  Build:     $(BUILD_DATE)"

# ========== Help ==========

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  all        - Build app and static library (default)"
	@echo "  test       - Build and run unit tests"
	@echo "  clean      - Remove build directory"
	@echo "  distclean  - Remove all generated files"
	@echo "  install    - Install app and library (respects PREFIX, DESTDIR)"
	@echo "  uninstall  - Remove installed files"
	@echo "  lint       - Run code quality checks"
	@echo "  check      - Run lint (alias)"
	@echo "  info       - Display build configuration"
	@echo "  help       - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make all                    # Build with defaults"
	@echo "  make -j8 test               # Parallel test build"
	@echo "  make PREFIX=/opt install    # Install to custom location"
	@echo "  make CI=1 all               # Build with CI flags"

# Ensure .PHONY targets don't conflict with files
.PHONY: all build test clean distclean install uninstall lint check help info
```

**Advanced Features:**

1. **Platform Detection:** Auto-detects OS and architecture; applies platform-specific flags
2. **Automatic Dependency Generation:** Generates `.d` files during compilation; includes them to track header dependencies
3. **Conditional Variables:** Uses `ifdef CI` to apply stricter flags in CI environments
4. **Metadata Embedding:** Captures version, git commit, build date at compile time
5. **Parallel-Safe:** All targets are properly declared phony; no race conditions on parallel builds
6. **Installation:** Respects `PREFIX` and `DESTDIR` for system-wide and staged installations
7. **Code Quality:** Includes lint targets with optional cppcheck and splint integration
8. **Help and Info:** Documents all targets and build configuration

---

## Constraints

### MUST DO

- **Declare all phony targets at the top** with `.PHONY: target1 target2 ...` to prevent file conflicts
- **Use `:=` (immediate expansion) for all variables** unless recursive expansion is explicitly needed (rare); document the exception
- **Add `.DELETE_ON_ERROR:` and shell flags** (`set -e -u -o pipefail -c`) to halt on errors and clean up partial artifacts
- **Declare all dependencies explicitly** for each target; never rely on implicit ordering or globbing
- **Use automatic variables** (`$@`, `$<`, `$^`) instead of hardcoding target/dependency names; this ensures portable, maintainable rules
- **Test with `make -j4` or higher** before shipping; catch hidden race conditions caused by missing dependencies
- **Support `PREFIX` and `DESTDIR`** in install targets to respect package manager conventions and staged installations
- **Document targets in a help target** explaining purpose, usage examples, and how to override variables

### MUST NOT DO

- **Never use recursive variable expansion (`=`)** for most variables; only use when late binding is explicitly needed and documented
- **Never omit `.PHONY` declarations** for non-file targets; this causes silent failures if files with those names exist
- **Never rely on command output without checking exit codes** (use `set -e` or explicit error checks)
- **Never hardcode absolute paths** (e.g., `/usr/bin/gcc`, `/tmp/build`); use variables and environment conventions
- **Never ignore errors in pipes or commands**; always use `set -e` or `set -o pipefail` in complex recipes
- **Never create circular dependencies** (A depends on B, B depends on A); Make will hang or error
- **Never use `.NOTPARALLEL` unless absolutely necessary**; instead, fix missing dependencies or add proper synchronization
- **Never commit large binary artifacts** to version control if Makefile can rebuild them; use .gitignore for build directories
- **Never assume specific Make version or extensions** without testing; stick to POSIX Make features or document GNU Make requirements

---

## Live References

The following authoritative sources document GNU Make and best practices:

1. **GNU Make Manual** (Official)
   https://www.gnu.org/software/make/manual/make.html
   - Complete reference for all Make features, variables, and functions
   - Section 3.1: "What a Rule Looks Like"
   - Section 4: "Writing Rules"
   - Section 8: "How to Use Variables"

2. **Paul Smith's Make Tutorial** (Expert Guide)
   https://www.gnu.org/software/make/manual/html_node/index.html
   - Deep dive into Make semantics, variable expansion, and common pitfalls
   - Covers order-only dependencies, pattern rules, and automatic variables

3. **Recursive Make Considered Harmful** (John Lakos)
   https://www.conifersystems.com/whitepapers/Recursive_Make_Considered_Harmful.html
   - Explains why recursive Make (calling Make from Make) causes problems
   - Advocates for flat Makefiles with proper dependencies

4. **GNU Coding Standards** — Make Conventions
   https://www.gnu.org/prep/standards/html_node/Makefile-Conventions.html
   - Standard conventions for Makefile variables (CC, CFLAGS, PREFIX, etc.)
   - Describes expected targets (all, install, clean, etc.)

5. **CMake vs Make Comparison** (Actual Best Practices)
   https://cmake.org/cmake/help/latest/guide/tutorial/index.html
   - Modern alternative (CMake) for complex projects
   - Useful to understand when to use Make vs. higher-level tools

6. **Error Handling in Makefiles** (Bash Best Practices)
   https://mywiki.wooledge.org/BashGuide/Practices#Error_handling
   - How `set -e`, `set -o pipefail`, and error checking interact with Make

7. **Portable Shell Scripting**
   https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
   - POSIX shell reference for recipes; ensures portability across Unix systems

---

## Recommended Workflow

### Step 1: Scaffold the Makefile Structure

Create a new Makefile with the foundational pattern above. Define:
- Compiler and tool variables with `:=`
- Directory variables (SRC_DIR, BUILD_DIR, etc.)
- .PHONY target list
- `.DELETE_ON_ERROR` and SHELL settings

**Checkpoint:** Run `make help` and verify output is clear.

### Step 2: Declare Explicit Dependencies

List all source files in `SOURCES` or similar. Use pattern rules (`%.o: %.c`) to generate object files. Declare the final binary target and its dependencies.

**Checkpoint:** Run `make --dry-run` to verify the dependency graph is correct; no actual compilation should occur.

### Step 3: Add Error Handling

Wrap complex shell recipes in `set -e`. Test intentional failures (break a source file) and verify the partial artifact is deleted.

**Checkpoint:** Deliberately break a source file, run `make`, verify error message is clear and partial artifacts are cleaned.

### Step 4: Test Parallel Execution

Run `make -j8 clean all` multiple times. Verify consistent results; no race conditions or flaky builds.

**Checkpoint:** Run `for i in {1..10}; do make -j8 clean all || exit 1; done` to stress-test parallelism.

### Step 5: Integrate with CI/CD

Add Makefile targets that map to CI stages: `make test`, `make build`, `make install`. Ensure CI environment can run these independently.

**Checkpoint:** Run in CI environment (GitHub Actions, GitLab CI, Jenkins) and verify all targets succeed.

### Step 6: Document and Maintain

Add a `help` target. Document any non-obvious variables or targets. Add comments explaining complex rules or dependency chains.

**Checkpoint:** New team members should understand the Makefile's purpose and targets by reading `make help` and comments.

---

## Common Pitfalls and Solutions

### Pitfall 1: Undefined Variables Silently Evaluated

**Problem:** A typo in a variable name (e.g., `$(OBJDIR)` instead of `$(OBJ_DIR)`) silently expands to an empty string, causing unexpected behavior.

**Solution:** Add `--warn-undefined-variables` flag to Make:
```bash
make --warn-undefined-variables all
```

Better: Use `.SHELLFLAGS := -e -u -o pipefail -c` to catch undefined shell variables (in recipes).

### Pitfall 2: Race Conditions in Parallel Builds

**Problem:** Two rules try to create the same output file simultaneously, or a rule depends on an output it doesn't declare.

**Solution:**
- Explicitly declare all dependencies for each target
- Test with `make -j8` and `make -j16` to stress-test parallelism
- Use order-only dependencies (`|`) for directory creation

### Pitfall 3: Circular Dependencies

**Problem:** Target A depends on B, which depends on A. Make hangs or errors.

**Solution:**
- Use `make -d` (debug) to trace dependency resolution
- Simplify the dependency graph; separate build, test, and install phases
- Use intermediate targets or pattern rules instead of explicit rules for every source file

### Pitfall 4: Non-Portable Shell Features

**Problem:** Makefile works on Linux with bash but fails on macOS or in minimal containers (dash, busybox).

**Solution:**
- Stick to POSIX shell features: `[[ ]]` → `[ ]`, bash arrays → loops, `${var@Q}` → none of these
- Test in containers: `docker run --rm -v $(pwd):/work bash:latest make -C /work all`
- Use `set -o posix` in recipes to enforce POSIX compatibility

### Pitfall 5: Incremental Builds Fail After Source Changes

**Problem:** Changing a header file doesn't trigger recompilation of dependent .c files.

**Solution:**
- Use automatic dependency generation (see Pattern 3: `DEPFLAGS` and `-include *.d`)
- Or explicitly declare header dependencies: `main.o: main.c config.h utils.h`

---

## Testing Your Makefile

### Test 1: Dry Run (No Execution)

```bash
make --dry-run all
# Verify output shows all commands without executing them
```

### Test 2: Parallel Execution

```bash
make clean && make -j8 all
# Run multiple times to catch race conditions
for i in {1..10}; do
  make clean && make -j8 all || exit 1
done
```

### Test 3: Error Handling

```bash
# Deliberately break a source file
sed -i 's/return 0;/return/' src/main.c
make all
# Verify: clear error message, partial artifacts deleted
ls -la build/obj/main.o 2>&1 | grep "cannot access"
# Restore the file
git checkout src/main.c
```

### Test 4: Portability

```bash
# Test on multiple platforms/containers
docker run --rm -v $(pwd):/work ubuntu:22.04 bash -c "apt-get update && apt-get install -y build-essential && cd /work && make all"
docker run --rm -v $(pwd):/work alpine:latest bash -c "apk add build-base && cd /work && make all"
```

---

## Integration with Modern Build Systems

### Option 1: Makefile as Orchestrator (Recommended for Simple Projects)

Use Makefile for top-level targets (build, test, deploy) that delegate to language-native tools:

```makefile
.PHONY: all test build lint clean

all: build test lint

build:
	cargo build --release

test:
	cargo test

lint:
	cargo fmt -- --check
	cargo clippy

clean:
	cargo clean
```

**Advantage:** Consistent interface across polyglot projects (Rust, Go, Node, Python).

### Option 2: Makefile with Custom Recipes

For projects without native build tools (C, shell scripts):

```makefile
# See Pattern 3 above
```

### Option 3: CMake, Bazel, or Meson for Complex Projects

For large, multi-platform projects, consider CMake:

```bash
cmake -B build
cmake --build build -j8
cmake --install build --prefix /usr/local
```

Makefiles remain useful as thin wrappers:

```makefile
.PHONY: all build test clean install

all: build

build:
	cmake -B build && cmake --build build -j8

test:
	cmake --build build --target test

install:
	cmake --install build --prefix /usr/local

clean:
	rm -rf build
```

---

## Makefile for Go Projects

Go has built-in build support (`go build`, `go test`), but Makefiles provide a consistent interface:

```makefile
.PHONY: all build test lint fmt clean install

BINARY := myapp
VERSION := $(shell git describe --tags --always 2>/dev/null || echo "dev")
LDFLAGS := -ldflags "-X main.Version=$(VERSION)"

all: fmt lint test build

build:
	go build $(LDFLAGS) -o $(BINARY) .

test:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func coverage.out

lint:
	golangci-lint run ./...

fmt:
	go fmt ./...
	goimports -w .

clean:
	rm -f $(BINARY) *.out

install: build
	go install $(LDFLAGS) .
```

---

## Makefile for Node.js/TypeScript Projects

Node projects often use npm/yarn, but Makefile provides consistency:

```makefile
.PHONY: all install build test lint clean

NODE_MODULES := node_modules
PKG_MANAGER := npm  # or yarn, pnpm

all: install build test

install:
	$(PKG_MANAGER) install

build: install
	$(PKG_MANAGER) run build

test: install
	$(PKG_MANAGER) test -- --coverage

lint: install
	$(PKG_MANAGER) run lint

clean:
	rm -rf dist coverage .next
	$(PKG_MANAGER) run clean || true
```

---

## Summary

An effective Makefile is:

1. **Declarative:** Rules state dependencies; Make infers execution order
2. **Portable:** Uses standard variables (CC, CFLAGS, PREFIX); works across Unix systems
3. **Robust:** Error handling, cleanup, parallel-safe
4. **Maintainable:** Clear targets, documented variables, help output
5. **Testable:** Explicit dependencies make incremental and full rebuilds predictable

Follow the patterns in this skill, test thoroughly with `make -j`, and integrate with CI/CD for reliable, portable builds across your project's lifecycle.
