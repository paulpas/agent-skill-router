---




name: mage-build-tool
description: Implements Mage build automation using Go code as build scripts, providing type-safe targets, aliases, build flags, environment-aware builds, and cross-compilation for development workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mage, magefile, go build tool, mg package, main.go targets, how do i write build scripts in go, golang build automation, type-safe makefile
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
  related-skills: makefile, just-task-runner, coding-make, linux-make-build-system




---





# Mage — Go-Based Build Tool

Acts as a senior Go developer who designs build scripts using Mage, leveraging Go's type system and standard library for reliable, maintainable build automation. When this skill is active, the model creates structured `magefile.go` with typed target functions, aliases, error handling patterns, and cross-compilation support.

## TL;DR Checklist

- [ ] Install Mage via `go install github.com/magefile/mage@latest` and verify with `mage --version`
- [ ] Create `magefile.go` or `mage/` directory at project root with target functions
- [ ] Name public targets starting with uppercase (e.g., `func Build() error`), private helpers in lowercase
- [ ] Use `//mage:alias` comments for short ergonomic command names (e.g., `//mage:alias s=Serve`)
- [ ] Return `error` from targets instead of calling `os.Exit` for proper Mage error reporting
- [ ] Set `BUILD_OS` and `BUILD_ARCH` environment variables before running mage for cross-compilation
- [ ] Run `mage -l` to list all available targets after adding new ones

---

## When to Use

Use this skill when:

- You have a Go project and want build logic in actual Go code instead of shell commands embedded in Makefiles or shell scripts
- Team wants type-safe build scripts with IDE autocomplete, refactoring support, and compile-time error detection
- Need cross-compilation controlled by environment variables (`BUILD_OS`, `BUILD_ARCH`, `GOOS`, `GOARCH`) without manual flag management
- Want to use Go's standard library (`os/exec`, `io/ioutil`, `net/http`) for build tasks instead of shelling out to external tools
- Building CLI tools or developer experience tooling for a Go codebase that benefits from aliased short commands

---

## When NOT to Use

Avoid this skill for:

- You are not using Go — Mage requires Go runtime (use Just or Make instead)
- Need shell-specific features like pattern rules (`%.o: %.c`) or automatic dependency tracking based on file timestamps
- CI/CD environment cannot install Go toolchain — the overhead of downloading and caching Go may outweigh benefits for simple projects
- Simple projects where a shell script or justfile would suffice — Mage adds a dependency layer that creates friction for minimal workflows

---

## Core Workflow

1. **Installation and Project Setup** — Install the Mage binary via `go install github.com/magefile/mage@latest`. Verify installation with `mage --version`. For Go modules projects, add a `go.mod` file if one doesn't exist. Initialize Mage in your project with `mage -i` to install the binary globally or use it as a dependency.
   **Checkpoint:** Run `mage -l` and confirm it lists all target functions. The command must succeed before adding more targets.

2. **Create magefile.go with Target Functions** — Write target functions in `magefile.go` at project root. Each public target must be a function named with an initial uppercase letter, accepting no arguments (except optional context), and returning `error`. Use the `mg` package for common operations like directory creation and file copying. Define a `Default` variable to set the default target when running `mage` without arguments.
   **Checkpoint:** Run `mage -l` after every addition to verify new targets appear and aliases are correct.

3. **Aliases and Short Names** — Add `//mage:alias` comments above target functions to create ergonomic short names. Aliases let team members type `mage s` instead of `mage Serve`. Use aliases for frequently-run operations like `serve`, `test`, `build`, `clean`. Never shadow built-in Mage flags (`-l`, `-f`, `--help`).
   **Checkpoint:** Verify `mage -l` shows both the full name and alias in parentheses.

4. **Error Handling Patterns** — Implement consistent error handling across all targets. Return errors for recoverable failures (missing config, failed tests) so Mage reports them with stack traces. Use `log.Fatalf()` only for unrecoverable errors where continuing makes no sense (e.g., invalid command-line flags). Always wrap errors with context using `fmt.Errorf("context: %w", err)`.
   **Checkpoint:** Every target must either return `nil` on success or return a wrapped error — never silently ignore failures.

5. **Build Flags and Cross-Compilation** — Set `BUILD_OS`, `BUILD_ARCH`, `GOOS`, and `GOARCH` environment variables to control cross-compilation. Use `ldflags` to embed version, commit hash, and build timestamp into the binary. Read these variables in your magefile and pass them to `go build` via `-ldflags`.
   **Checkpoint:** Verify cross-compiled binaries run on target platforms using Docker or VMs before merging.

---

## Implementation Patterns

### Pattern 1: Target Functions with Error Handling

Public targets start with an uppercase letter and return `error`. Use the `mg` package helpers (`mg.Deps`, `mg.SerialDeps`) for dependency ordering between targets. Always wrap errors with context for debuggable failure messages.

```go
package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

// Default specifies the default target to run when mage is invoked without arguments.
var Default = Build

// Build compiles the application with version information embedded via ldflags.
func Build() error {
	fmt.Println("Building application...")

	version := getVersion()
	commit := getCommit()
	timestamp := getTimestamp()

	ldflags := fmt.Sprintf("-X main.version=%s -X main.commit=%s -X main.timestamp=%s",
		version, commit, timestamp)

	cmd := exec.Command("go", "build", "-ldflags", ldflags, "-o", binPath(), "./cmd/app")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("build failed: %w", err)
	}

	fmt.Printf("Build complete: %s\n", binPath())
	return nil
}

// Run starts the application locally with hot-reload for development.
func Run() error {
	mg.SerialDeps(EnsureDeps, Build)

	cmd := exec.Command(filepath.Join(".", binName()), "--config", "config.yaml")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = projectRoot()

	fmt.Println("Starting application...")
	return cmd.Run()
}

// Test runs all unit and integration tests with coverage reporting.
func Test() error {
	mg.SerialDeps(EnsureDeps)

	fmt.Println("Running unit tests...")
	if err := sh.RunV("go", "test", "-race", "-coverprofile=coverage.out", "./..."); err != nil {
		return fmt.Errorf("unit tests failed: %w", err)
	}

	fmt.Println("Running integration tests...")
	if err := sh.RunV("go", "test", "-tags=integration", "-count=1", "./internal/integration/..."); err != nil {
		return fmt.Errorf("integration tests failed: %w", err)
	}

	fmt.Println("Generating coverage report...")
	return sh.RunV("go", "tool", "cover", "-html=coverage.out", "-o", "coverage.html")
}
```

### Pattern 2: Aliases and Short Command Names

Use `//mage:alias` comments to create short ergonomic command names. This is the primary way Mage compensates for Go's verbose function naming convention. Group aliases by frequency — daily operations get the shortest names.

```go
package main

import (
	"github.com/magefile/mage/mg"
)

// Serve starts the development server with hot reload.
//mage:alias s
func Serve() error {
	mg.SerialDeps(EnsureDeps, Build)
	return sh.RunV("go", "run", "./cmd/app")
}

// Test runs unit tests for the current package only.
//mage:alias t
func Test() error {
	return runTests("unit")
}

// TestAll runs all tests including integration suites.
//mage:alias ta
func TestAll() error {
	return runTests("all")
}

// Build compiles the binary for the current platform.
//mage:alias b
func Build() error {
	return buildBinary("")
}

// Clean removes all generated files and binaries.
//mage:alias c
func Clean() error {
	return sh.RunV("go", "clean", "-cache", "-testcache", "-modcache")
}

// Deploy pushes the application to the target environment.
//mage:alias d
func Deploy() error {
	mg.SerialDeps(EnsureDeps, Test)
	fmt.Println("Deploying to production...")
	return sh.RunV("./scripts/deploy.sh")
}

// Lint checks code style and runs static analysis.
//mage:alias l
func Lint() error {
	if err := sh.RunV("golangci-lint", "run", "./..."); err != nil {
		return fmt.Errorf("lint failed: %w", err)
	}
	fmt.Println("Lint passed ✓")
	return nil
}

// All runs the full CI pipeline locally (lint → test → build).
//mage:alias a
func All() error {
	mg.SerialDeps(Lint, Test, Build)
	fmt.Println("All checks passed ✓")
	return nil
}
```

### Pattern 3: Environment-Aware Build Configuration with Cross-Compilation

Use environment variables `BUILD_OS`, `BUILD_ARCH`, `BUILD_GOOS`, and `BUILD_GOARCH` to control cross-compilation. Inject version information via `-ldflags`. Use conditional logic based on these variables to customize build output.

```go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// CrossCompile builds the application for a different OS/ARCH than the host.
// Set BUILD_OS and BUILD_ARCH environment variables before running:
//   BUILD_OS=linux BUILD_ARCH=amd64 mage crossCompile
func CrossCompile() error {
	targetOS := os.Getenv("BUILD_OS")
	if targetOS == "" {
		targetOS = runtime.GOOS
	}

	targetArch := os.Getenv("BUILD_ARCH")
	if targetArch == "" {
		targetArch = runtime.GOARCH
	}

	fmt.Printf("Cross-compiling for %s/%s\n", targetOS, targetArch)

	// Validate supported targets
	validTargets := map[string]map[string]bool{
		"darwin":  {"amd64": true, "arm64": true},
		"linux":   {"amd64": true, "arm64": true, "386": true},
		"windows": {"amd64": true, "386": true},
	}

	if !validTargets[targetOS][targetArch] {
		return fmt.Errorf("unsupported target: %s/%s (supported: %+v)",
			targetOS, targetArch, validTargets)
	}

	version := getVersion()
	commit := getCommit()
	timestamp := getTimestamp()

	outputDir := filepath.Join("dist", fmt.Sprintf("%s-%s", targetOS, targetArch))
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("create output dir: %w", err)
	}

	binaryName := appName()
	if targetOS == "windows" {
		binaryName += ".exe"
	}

	outputPath := filepath.Join(outputDir, binaryName)

	ldflags := fmt.Sprintf("-X main.version=%s -X main.commit=%s -X main.timestamp=%s",
		version, commit, timestamp)

	env := os.Environ()
	cmd := exec.Command("go", "build",
		"-o", outputPath,
		"-ldflags", ldflags,
		"-GOOS="+targetOS,
		"-GOARCH="+targetArch,
		"./cmd/app",
	)
	cmd.Env = append(env,
		fmt.Sprintf("GOOS=%s", targetOS),
		fmt.Sprintf("GOARCH=%s", targetArch),
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("cross-compile %s/%s: %w", targetOS, targetArch, err)
	}

	fmt.Printf("Binary written to: %s\n", outputPath)
	return nil
}

// getVersion returns the application version from git tags or a default.
func getVersion() string {
	if v := os.Getenv("BUILD_VERSION"); v != "" {
		return v
	}
	out, err := exec.Command("git", "describe", "--tags", "--always").Output()
	if err != nil {
		return "dev"
	}
	return strings.TrimSpace(string(out))
}

// getCommit returns the current git commit hash.
func getCommit() string {
	out, err := exec.Command("git", "rev-parse", "--short", "HEAD").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

// getTimestamp returns the build timestamp in RFC3339 format.
func getTimestamp() string {
	out, err := exec.Command("date", "-u", "+%Y-%m-%dT%H:%M:%SZ").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

// appName returns the application name from the module path.
func appName() string {
	return filepath.Base(projectRoot())
}

// projectRoot returns the project root directory (parent of magefile.go).
func projectRoot() string {
	return filepath.Dir(".")
}
```

### Pattern 4: Helper Functions and Shared Utilities

Private helper functions stay lowercase so Mage ignores them. Use them to factor out common build logic — file path computation, directory creation, dependency installation. Keep the helper package scoped to `magefile.go`.

```go
package main

import (
	"fmt"
	"os"
	"path/filepath"
)

// ensureDeps checks that required tools and directories exist before running targets.
func ensureDeps() error {
	required := []string{"golangci-lint"}
	for _, tool := range required {
		if !toolExists(tool) {
			fmt.Printf("Warning: %s not found, some targets may fail\n", tool)
		}
	}

	dirs := []string{binDir(), distDir()}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("ensure directory %s: %w", dir, err)
		}
	}

	return nil
}

func toolExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// Path helpers — always use filepath.Join for cross-platform compatibility.
func binDir() string  { return filepath.Join(projectRoot(), "bin") }
func distDir() string { return filepath.Join(projectRoot(), "dist") }
func binPath() string { return filepath.Join(binDir(), appName()) }
func binName() string {
	if runtime.GOOS == "windows" {
		return appName() + ".exe"
	}
	return appName()
}
```

---

## Constraints

### MUST DO
- Name public target functions starting with an uppercase letter so Mage recognizes them as executable targets
- Return `error` from targets instead of calling `os.Exit` — this gives Mage proper error reporting and stack traces
- Use `//mage:alias` comments for creating short names that are more ergonomic than full function names (e.g., `//mage:alias s=Serve`)
- Set `BUILD_OS` and `BUILD_ARCH` environment variables before running mage for cross-compilation builds
- Include a `Default` variable in the magefile to specify the default target when running `mage` without arguments

### MUST NOT DO
- Don't put private helper functions with uppercase names — Mage will try to execute them as targets. Use lowercase for helpers or prefix with `_` (e.g., `_helper()`)
- Don't ignore errors in target functions — always return `err` so Mage reports failures correctly; bare `if err != nil {}` without returning is a silent failure
- Don't use raw shell strings without `os/exec` — prefer Go's `os/exec` or `github.com/magefile/mage/sh` package for cross-platform compatibility over string concatenation with backticks or `sh -c`
- Don't hardcode platform-specific paths — always use `filepath.Join()` instead of string concatenation with `/` or `\`
- Don't create aliases that shadow standard Mage commands like `-l`, `-f`, `--help`, or `--version`

---

## Output Template

When this skill is active, produce the following output structure:

1. **Project Analysis** — Identify Go version, module structure (`go.mod`), existing build scripts (Makefile, shell scripts), and current CI pipeline configuration
2. **Magefile Draft** — Complete `magefile.go` with target functions, aliases, error handling, and helper utilities matching the project's needs
3. **Alias Map** — Table mapping short command names to full function names for team reference (e.g., `s → Serve`, `ta → TestAll`)
4. **Build Configuration** — Environment variables needed (`BUILD_OS`, `BUILD_ARCH`, `BUILD_VERSION`), ldflags injection strategy, and cross-compilation matrix
5. **CI/CD Integration** — Pipeline configuration showing how to install and run Mage in CI (GitHub Actions, GitLab CI, or Jenkins)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `makefile` | GNU Make for projects not using Go or needing pattern rules and file dependency tracking |
| `just-task-runner` | Cross-platform task runner when you prefer YAML-style recipes over Go code |
| `linux-make-build-system` | GNU Make with cross-compilation support and complex dependency graphs |

---

## Live References

> Authoritative documentation links for the Mage build tool. The model follows markdown links at load time to resolve external references and inline content.

- [Mage Official Documentation](https://magefile.org/)
- [Mage GitHub Repository](https://github.com/magefile/mage)
- [Mage Quick Start Guide](https://github.com/magefile/mage#quick-start)
- [Mage Examples Repository](https://github.com/magefile/mage/tree/master/examples)
- [Mage mg Package Reference](https://pkg.go.dev/github.com/magefile/mage/mg)
