---
name: deployment-patterns
description: Deploys Go applications with build optimization, multi-stage Docker builds,
  binary sizing, and deployment strategies for cloud and on-prem.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go deployment, go docker build, multi stage build, go binary optimization,
    go cross compilation, go build tags
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cloud-development, best-practices, modular-design
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Go Deployment Patterns

Senior DevOps engineer deploying optimized Go applications with multi-stage Docker builds, binary sizing, cross-compilation, and deployment strategies. This skill covers building minimal binaries, container optimization, and production deployment patterns.

## TL;DR Checklist

- [ ] Use multi-stage Docker builds — never include source code or build tools in the final image
- [ ] Enable Go build optimizations: `-ldflags "-s -w"`, `CGO_ENABLED=0`, `GOOS=linux`
- [ ] Use a minimal base image (`distroless`, `scratch`, or `alpine`) for the final stage
- [ ] Cross-compile for target platforms — never build on the deployment machine
- [ ] Run the binary as a non-root user in the container
- [ ] Use build tags to conditionally include platform-specific code

---

## When to Use

Use this skill when:

- Building Docker images for Go applications
- Optimizing binary size for deployment
- Cross-compiling for different platforms
- Setting up CI/CD pipelines for Go applications
- Configuring build tags for feature flags or platform-specific code

---

## When NOT to Use

Avoid this skill for:

- Simple scripts that are run directly on the host (no containerization needed)
- Development builds where debugging symbols are needed (don't strip in dev)
- Applications that require CGO — `CGO_ENABLED=0` is not compatible

---

## Core Workflow

1. **Optimize the Build** — Enable compiler optimizations and strip debug symbols.
   **Checkpoint:** Binary is stripped and smaller than 20MB for simple applications.

2. **Create a Multi-Stage Dockerfile** — Build in one stage, copy only the binary in the final stage.
   **Checkpoint:** Final image contains only the binary and required certificates.

3. **Cross-Compile for Target Platforms** — Build for the deployment target, not the build machine.
   **Checkpoint:** `GOOS=linux GOARCH=amd64 CGO_ENABLED=0` produces a portable binary.

4. **Configure the Runtime Environment** — Set non-root user, health check, and resource limits.
   **Checkpoint:** Container runs as non-root, has a health check, and respects resource limits.

5. **Use Build Tags for Variants** — Conditionally include code for different environments.
   **Checkpoint:** Build tags don't create circular dependencies or break imports.

---

## Implementation Patterns

### Pattern 1: Multi-Stage Docker Build (❌ BAD vs ✅ GOOD)

Multi-stage builds produce minimal deployment images.

#### ❌ BAD — Single-Stage Docker Build

```dockerfile
# ❌ BAD: includes Go toolchain, source code, and all build dependencies
FROM golang:1.22

# Set working directory
WORKDIR /app

# Copy everything (including .git, tests, docs)
COPY . .

# Install dependencies (cache is not optimized)
RUN go mod download

# Build with no optimizations
RUN go build -o myapp

# Run the app (as root!)
CMD ["./myapp"]
```

**What's wrong:**
- Final image is ~1GB (includes Go toolchain, source code, all dependencies)
- Source code and `.git` directory are in the image — security risk
- No optimization flags — binary includes debug symbols
- Runs as root — container security risk
- No health check — Kubernetes cannot monitor liveness

#### ✅ GOOD — Multi-Stage Docker Build

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder

# Install build dependencies (only what's needed)
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files first (leverage Docker layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations
# -ldflags "-s -w" strips debug symbols and DWARF info
# -ldflags "-X main.Version=1.2.3" embeds version info
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildTime=${BUILD_TIME}" \
    -o /usr/local/bin/myapp \
    ./cmd/server/

# Stage 2: Runtime
FROM gcr.io/distroless/static-debian12:nonroot

# Copy the binary from the builder stage
COPY --from=builder /usr/local/bin/myapp /usr/local/bin/myapp

# Distroless images run as non-root by default (uid 1000)
# No shell, no package manager — minimal attack surface

# Expose the HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/myapp", "health"]

# Run the application
ENTRYPOINT ["/usr/local/bin/myapp"]
```

**Why this works:**
- Final image is ~20MB (binary + CA certificates) — 50x smaller than single-stage
- No source code, no Go toolchain, no shell in the final image
- `CGO_ENABLED=0` produces a fully static binary — no libc dependency
- `-ldflags="-s -w"` strips debug symbols — smaller binary
- `EXPOSE 8080` documents the port
- `HEALTHCHECK` enables Kubernetes liveness/probe
- Runs as non-root (uid 1000) — container security

---

### Pattern 2: Binary Optimization and Sizing (❌ BAD vs ✅ GOOD)

Build flags control binary size and runtime behavior.

#### ❌ BAD — Default Build

```bash
# ❌ BAD: default build — includes debug symbols, DWARF info, and race detector
go build -o myapp ./cmd/server/
# Binary size: ~15MB with debug info
# No version info embedded
# Includes race detector overhead (if -race flag is used)
```

**What's wrong:**
- Binary includes debug symbols — unnecessarily large
- No version information — cannot identify which version is running
- No build metadata — no timestamp or git commit for traceability
- `-race` flag adds ~10x memory overhead — only for testing
- `CGO_ENABLED=1` (default) produces dynamically linked binary — not portable

#### ✅ GOOD — Optimized Production Build

```bash
# Production build with all optimizations
VERSION=$(git describe --tags --always)
COMMIT=$(git rev-parse --short HEAD)
BUILD_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

CGO_ENABLED=0 \
GOOS=linux \
GOARCH=amd64 \
go build \
  -trimpath \
  -ldflags="-s -w \
    -X main.Version=${VERSION} \
    -X main.Commit=${COMMIT} \
    -X main.BuildTime=${BUILD_TIME} \
    -extldflags '-static'" \
  -o dist/myapp \
  ./cmd/server/

# Binary size: ~8-12MB (stripped, static, no debug info)
```

**Build flags explained:**

| Flag | Effect |
|------|--------|
| `-trimpath` | Removes file system paths from the binary — builds are reproducible |
| `-s` | Strips symbol table — smaller binary, no debug info |
| `-w` | Strips DWARF debug information — smaller binary |
| `-X main.Version=...` | Sets a `main.Version` variable at link time — embeds version info |
| `-extldflags '-static'` | Links all C libraries statically (requires CGO_ENABLED=0 for full static) |
| `CGO_ENABLED=0` | Disables CGO — produces fully static, portable binary |
| `GOOS=linux GOARCH=amd64` | Cross-compiles for Linux AMD64 |

```go
// package: main

// Build-time variables set via -ldflags
var (
	Version   = "dev"
	Commit    = "unknown"
	BuildTime = "unknown"
)

// VersionInfo returns structured version information for the /version endpoint.
func VersionInfo() map[string]string {
	return map[string]string{
		"version":   Version,
		"commit":    Commit,
		"build_time": BuildTime,
		"go_version": runtime.Version(),
		"os":        runtime.GOOS,
		"arch":      runtime.GOARCH,
	}
}
```

**Why this works:**
- `-trimpath` makes builds reproducible — same source produces the same binary
- `-s -w` strips all debug info — binary is 30-40% smaller
- `-X` flags embed build metadata — version info is available at runtime
- `CGO_ENABLED=0` produces a fully static binary — no libc dependency, fully portable
- `VersionInfo()` serves structured version data for `/version` endpoint

---

### Pattern 3: Cross-Compilation and Build Tags (❌ BAD vs ✅ GOOD)

Cross-compilation and build tags enable platform-specific builds.

#### ❌ BAD — Platform-Specific Build Scripts

```bash
# ❌ BAD: separate build scripts for each platform — hard to maintain
# build-linux.sh
go build -o myapp-linux ./cmd/server/

# build-darwin.sh
go build -o myapp-darwin ./cmd/server/

# build-windows.sh
go build -o myapp-windows.exe ./cmd/server/

# build-arm.sh
go build -o myapp-arm ./cmd/server/
```

**What's wrong:**
- Four separate scripts — changes to build flags must be applied in all four
- No build tag support — platform-specific code requires runtime checks
- Hard to automate — CI/CD needs to run four separate builds
- No version consistency — each script could use different flags
- Windows build produces a `.exe` — Linux builds don't

#### ✅ GOOD — Unified Cross-Compilation with Build Tags

```bash
# build.sh — unified cross-compilation script
#!/usr/bin/env bash
set -euo pipefail

VERSION=$(git describe --tags --always)
COMMIT=$(git rev-parse --short HEAD)

# Target platforms: os:arch:output
PLATFORMS=(
  "linux:amd64:myapp"
  "linux:arm64:myapp-arm64"
  "darwin:amd64:myapp-darwin"
  "darwin:arm64:myapp-darwin-arm64"
  "windows:amd64:myapp.exe"
)

for platform in "${PLATFORMS[@]}"; do
  IFS=':' read -r goos goarch output <<< "$platform"

  # Normalize the architecture
  case "$goarch" in
    amd64) goarch="amd64" ;;
    arm64) goarch="arm64" ;;
  esac

  # Construct the target name
  target="${goos}_${goarch}"

  echo "Building for ${target} -> ${output}..."

  # Set environment variables for cross-compilation
  CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
    go build \
      -trimpath \
      -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT}" \
      -tags="${BUILD_TAGS:-}" \
      -o "dist/${output}" \
      ./cmd/server/

  # Show binary size
  ls -lh "dist/${output}" | awk '{print "  Size: " $5}'
done

echo "Build complete. Artifacts in dist/"
ls -lh dist/
```

```go
// package: internal/platform

//go:build linux

// Platform-specific initialization for Linux.
func initPlatform() error {
	// Linux-specific setup (e.g., cgroups, epoll)
	return nil
}

//go:build darwin

// Platform-specific initialization for macOS.
func initPlatform() error {
	// macOS-specific setup
	return nil
}

//go:build windows

// Platform-specific initialization for Windows.
func initPlatform() error {
	// Windows-specific setup
	return nil
}
```

**Why this works:**
- Single build script handles all platforms — consistent build flags
- Build tags (`//go:build linux`) enable platform-specific code
- `CGO_ENABLED=0` ensures all targets produce static binaries
- `GOOS` and `GOARCH` control cross-compilation — no need for native toolchain
- Build artifacts are version-consistent — same `-ldflags` across all platforms
- Binary sizes are shown — easy to spot unexpected bloat

---

## Constraints

### MUST DO

- **MUST** use multi-stage Docker builds — never include the Go toolchain in the final image
- **MUST** set `CGO_ENABLED=0` for all production builds — produces static, portable binaries
- **MUST** use `-ldflags="-s -w"` for all production builds — strip debug symbols
- **MUST** use `-trimpath` for reproducible builds — removes file system paths from the binary
- **MUST** use a minimal base image (`distroless`, `scratch`, or `alpine`) for the final Docker stage
- **MUST** run the container as a non-root user
- **MUST** include a `HEALTHCHECK` directive in the Dockerfile

### MUST NOT DO

- **MUST NOT** include source code, `.git`, or test files in the Docker image
- **MUST NOT** use `golang` as the final base image — it includes the toolchain (~800MB)
- **MUST NOT** run the container as root — use `USER 1000` or distroless's default non-root
- **MUST NOT** use `CGO_ENABLED=1` in production unless absolutely necessary (CGO binaries are not portable)
- **MUST NOT** commit build scripts that hardcode platform-specific paths
- **MUST NOT** skip the `-trimpath` flag — builds must be reproducible

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `cloud-development` | Cloud-native deployment with Kubernetes manifests and rolling updates |
| `best-practices` | Go idioms and code organization for maintainable applications |
| `modular-design` | Package structure that supports build tags and platform-specific code |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Go Deployment Guide](https://go.dev/doc/deploy)
- [Docker and Go Applications](https://docs.docker.com/language/golang/build-images/)
- [Go Binary Distribution](https://go.dev/doc/install/source)
- [CI/CD for Go Projects](https://go.dev/blog/ci)
- [Go Production Deployment Checklist](https://go.dev/doc/deploy)
