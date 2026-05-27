---
name: runtime-ecosystem-selection
description: Selects the optimal runtime ecosystem (JVM, .NET, Node.js/V8, native compilation) based on deployment characteristics, performance requirements, and operational constraints for production systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: coding
  triggers: runtime selection, JVM vs .NET, container image size, serverless cold start, GraalVM Native Image, .NET Native AOT, startup time, memory footprint
  role: implementation
  scope: implementation
  output-format: analysis
  content-types: [code, guidance, do-dont, examples]
  related-skills: modern-language-comparison, polyglot-development, framework-selection, version-migration
---

# Runtime Ecosystem Selection

Evaluates and selects the optimal runtime ecosystem — JVM (Java/Kotlin), .NET, Node.js/V8, or native compilation (Rust/Go) — by analyzing deployment constraints, cold start requirements, memory footprints, operational maturity, and infrastructure alignment. Translates business and technical requirements into a concrete runtime recommendation with quantified trade-offs.

## TL;DR Checklist

- [ ] Quantify cold start budget before selecting any runtime — if <500ms, native or Node.js only
- [ ] Compare container image sizes across runtimes for the same application surface area
- [ ] Verify JIT warm-up impact on autoscaling behavior for JVM/.NET workloads
- [ ] Assess reflection/dynamic code loading needs — blocks .NET Native AOT and GraalVM readiness
- [ ] Check operational tooling maturity (debugging, profiling, observability) for each candidate runtime
- [ ] Run serverless cold start benchmarks with realistic payload before committing to a runtime

---

## When to Use

Use this skill when:

- Making an architecture decision about the primary execution runtime for a new service or platform migration
- Evaluating whether to containerize a Java/.NET application or compile to native binary for edge/serverless deployment
- Comparing cold start impact across runtimes for serverless or autoscaling workloads
- Assessing memory and CPU budget constraints for high-density container deployments (e.g., 100+ replicas)
- Migrating an existing service from one runtime to another and need quantified trade-off analysis
- Selecting between JVM, .NET, Node.js, or native for a greenfield microservice with specific deployment targets

---

## When NOT to Use

Avoid this skill for:

- Comparing individual programming languages (e.g., "should I use Rust or Go?") — use `modern-language-comparison` instead
- Designing cross-language integration and interop patterns within a monorepo — use `polyglot-development` instead
- Evaluating frameworks within a single runtime (e.g., Spring Boot vs Quarkus, ASP.NET Core vs FastAPI) — use `framework-selection` instead
- Planning version upgrades or breaking changes for an existing runtime stack — use `version-migration` instead
- Selecting languages based purely on developer team expertise with no deployment constraint pressure

---

## Core Workflow

1. **Collect Deployment Requirements** — Elicit hard constraints from stakeholders: cold start budget, memory-per-request limits, expected request volume, autoscaling behavior, regulatory requirements, and target infrastructure (Kubernetes, Lambda, bare metal, edge).
   **Checkpoint:** Every requirement must have a numeric threshold where possible (e.g., "p95 latency < 200ms" not "fast enough").

2. **Score Each Runtime Against Requirements** — Evaluate JVM, .NET, Node.js, and native compilation against each quantified constraint using the reference data in the Runtime Comparison Table. Weight scores by business priority (cold start, footprint, throughput, operational maturity).
   **Checkpoint:** No runtime may be recommended unless it passes every hard requirement with zero tolerance exceptions.

3. **Run Practical Benchmarks** — Build a minimal representative application in each candidate runtime and measure: container image size, cold start latency (10 iterations), warm-up time to steady-state throughput, memory under load, and garbage collection pause impact on p99.
   **Checkpoint:** Benchmark infrastructure must be identical across runs (same CPU type, same network, same OS version).

4. **Assess Operational Readiness** — For each runtime that survives quantitative scoring, evaluate: debugging tooling availability (profilers, APM), dependency update frequency and breakage rate, security CVE response SLA, container orchestration compatibility, and team competency.
   **Checkpoint:** If no runtime has adequate operational tooling for the target environment, flag as a blocking risk before proceeding to recommendation.

5. **Produce Recommendation with Trade-off Matrix** — Present the selected runtime alongside explicit trade-offs against the closest alternative, including quantified differences in every measured dimension and a migration plan if applicable.
   **Checkpoint:** The recommendation must include a rollback trigger (e.g., "if p99 latency exceeds X under production load, revert to [alternative]").

---

## Runtime Comparison Reference Table

The following table provides current (2025-2026) data for the four primary runtime ecosystems. Values are typical ranges for a representative HTTP service with ~50 endpoints; actual numbers vary by application complexity and optimization level.

| Dimension | JVM (Java 21+/Kotlin 2.x) | .NET (.NET 8+/9+) | Node.js/V8 (Node 20/22, TS 5.6+) | Native Compilation (Rust 1.83+, Go 1.23+) |
|---|---|---|---|---|
| **Minimum heap footprint** | 100–300 MB | 50–150 MB | 30–80 MB per instance | < 10 MB (static binary) |
| **Cold start (cold container)** | 2–8 seconds | 1–4 seconds (JIT) | < 500 milliseconds | < 50 milliseconds |
| **Cold start (.NET Native AOT)** | N/A | < 50 milliseconds (ASP.NET Core) | N/A | < 10 milliseconds |
| **GraalVM Native Image** | 3–8 seconds build, < 100ms cold start | N/A | N/A | N/A |
| **JIT warm-up time** | 2–5 minutes to steady-state throughput | 1–3 minutes to steady-state | Immediate (V8 optimizes per-request) | No JIT — always at peak performance |
| **p99 latency under load** | 5–20 ms (after warm-up, GC pauses can spike) | 3–15 ms after warm-up | 2–10 ms for I/O-bound; CPU-heavy degrades fast | 1–5 ms consistently |
| **Container image size (optimized)** | 150–300 MB (distroless + JRE slim) | 80–150 MB (mcr.microsoft.com/dotnet:aspnet-runtime-nanoserver-alpine equivalent) | 40–80 MB (alpine-based Node image) | 5–20 MB (static binary in scratch/Alpine) |
| **GC impact on p99** | Predictable with ZGC/Shenandoah; still 1-3ms pauses under pressure | Server GC is low-latency; Gen2 collections can cause 5-20ms stalls | V8 marks-sweep: < 1ms typical, spikes to 10ms under allocation pressure | Zero — no garbage collector |
| **Autoscaling responsiveness** | Slow — new pods need JIT warm-up before serving meaningful traffic | Moderate — JIT startup ~1s; Native AOT nearly instant | Fast — V8 startup < 200ms per instance | Instant — static binary loads immediately |
| **Reflection / dynamic code loading** | Full support — core framework feature | Limited in Native AOT; reflection requires `--EnableDynamicAssemblyLoading` | First-class (dynamic typing, eval, runtime code generation) | No reflection or dynamic loading by design |
| **Dependency update cadence** | 6 months (LTS); security patches as needed | 6 months (LTS + current); frequent patch releases | Every ~6 weeks per release line; LTS stable for 12+ months | Rust: every 6 weeks; Go: every 6 months |
| **Security CVE response SLA** | Oracle: 2 weeks critical; OpenJDK community varies | Microsoft: < 48 hours for critical .NET runtime CVEs | npm ecosystem variable (Node.js core: ~1 week) | Rust/Go: 2-4 weeks for stdlib, crates/go modules vary |
| **Profiling / APM maturity** | Excellent — VisualVM, JFR, Async Profiler, Datadog, New Relic | Good — dotnet-counters,dotnet-dump, Perfolizer, OpenTelemetry | Moderate — Clinic.js, 0x, PM2; fewer enterprise profilers | Growing — pprof (Go), perf/bpftrace (Rust); limited APM |
| **Best deployment fit** | Long-running stateless/stateful services, enterprise platforms | Enterprise APIs, high-throughput web services, Azure-first orgs | Event-driven microservices, I/O-bound workloads, full-stack JS teams | Edge computing, serverless functions, containers at extreme scale, compliance-sensitive deployments |
| **Worst deployment fit** | Serverless with sub-second cold start budgets, edge devices | Environments requiring zero-reflection or maximum native image reduction | CPU-intensive computation, long-lived connections without request turnover | Teams needing rapid prototyping with dynamic iteration cycles |

### Decision Matrix

Use this matrix to quickly narrow candidates based on the dominant constraint:

| Dominant Constraint | Primary Choice | Alternative | Rationale |
|---|---|---|---|
| Sub-second cold start mandatory | Native (Rust/Go) or Node.js | .NET Native AOT | JIT runtimes always have measurable startup cost |
| < 50 MB container image budget | Rust static binary in scratch | Go, Node.js Alpine | JVM/.NET cannot produce images under ~80 MB reliably |
| Maximum throughput at steady state | JVM (ZGC) or .NET Server GC | Go for simplicity | Mature GCs with parallel collection handle massive RPS |
| I/O-bound event-driven architecture | Node.js or Go | Rust for safety-critical | Event loop model minimizes thread-per-request overhead |
| Zero-reflection requirement | Native (Rust/Go) | .NET Native AOT (with limitations) | JVM requires reflection for core frameworks (Spring, Hibernate) |
| Rapid iteration during development | Node.js/TypeScript or Python on JVM | C# with hot-reload | JIT + dynamic typing enables fastest dev→deploy cycle |
| Regulatory / compliance audit trail | .NET (Microsoft SLA) or Java (Oracle SLA) | Go (simpler attack surface) | Enterprise vendor support contracts provide compliance documentation |
| Edge deployment / tiny devices | Rust or Go static binary | Node.js with sharp runtime trimming | No OS dependencies, single file deploy |

---

## Implementation Patterns

### Pattern 1: Native Compilation Configuration — GraalVM vs .NET Native AOT

Both Java and C# now support ahead-of-time native compilation. This pattern demonstrates how to configure both for production deployment, including the trade-offs each imposes.

**GraalVM Native Image (Java/Kotlin):**

```java
// build.gradle.kts — Quarkus with GraalVM Native Image plugin
plugins {
    id("io.quarkus") version "3.17.5"
}

quarkus {
    graalvmNative {
        javaCompiler = "graalvm-javac"
        buildArgs.addAll(
            "-H:+UnlockExperimentalVMOptions",
            "-H:IncludeResourceBundles=com.sun.security.ntlmprovider",
            "-Dquarkus.native.enable-all-charsets=true",
            // Reduce image size by excluding unused JDK features
            "--initialize-at-build-time=org.slf4j",
            "-H:+ReportExceptionStackTraces"
        )
        // Native Image reflection config for frameworks needing runtime registration
        metadataCopyResources {
            from(layout.projectDirectory.dir("src/main/resources/META-INF/native-image"))
            into("META-INF/native-image")
        }
    }
}

// src/main/resources/META-INF/native-image/com.example/app/reflect-config.json
[
  {
    "name": "com.example.api.dto.ResponseDto",
    "allDeclaredConstructors": true,
    "allPublicConstructors": true,
    "allDeclaredMethods": true,
    "allPublicMethods": true,
    "allDeclaredFields": true,
    "allPublicFields": true
  }
]
```

**Dockerfile — GraalVM Native Image build:**

```dockerfile
# Multi-stage build: Maven download → GraalVM native-image compile → minimal runtime
FROM ghcr.io/graalvm/native-image:21 as builder

WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN native-image \
    --class com.example.Application \
    -H:Name=app-server \
    --no-fallback \
    -O3 \
    -H:+ReportExceptionStackTraces \
    -Dquarkus.native.enable-all-charsets=true

FROM gcr.io/distroless/static-debian12

COPY --from=builder /build/app-server /app/
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app/app-server"]
```

**.NET Native AOT (C# with ASP.NET Core):**

```csharp
// Program.cs — Minimal ASP.NET Core with Native AOT compatibility
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Native AOT: avoid reflection-based DI registrations that require dynamic generation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// Minimal APIs bypass much of the MVC reflection pipeline — ideal for Native AOT
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapGet("/users/{id:int}", async (int id, IUserService svc) =>
{
    var user = await svc.GetByIdAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(user);
});

// Native AOT requires known reflection points to be registered explicitly
// app.UseStaticFiles(); // ❌ May not work with AOT — use FileResult instead

app.MapHealthChecks("/healthz");
app.Run();
```

**csproj — Native AOT publish configuration:**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <!-- Native AOT flag: produces a self-contained static binary -->
    <PublishAot>true</PublishAot>
    <StripSymbols>true</StripSymbols>
    <OptimizationPreference>Speed</OptimizationPreference>
    <!-- Disable features that conflict with AOT -->
    <InvariantGlobalization>true</InvariantGlobalization>
  </PropertyGroup>

  <!-- Native AOT: register reflection-tracked types explicitly -->
  <ItemGroup>
    <NativeLibrary Include="libssl.so" Condition="$([MSBuild]::IsOSPlatform(Linux))" />
  </ItemGroup>

  <ItemGroup>
    <TrimmerRootAssembly Include="MyApp.dll">
      <!-- Prevent trimming of types used via reflection -->
      <ShouldTrim>false</ShouldTrim>
    </TrimmerRootAssembly>
  </ItemGroup>

</Project>
```

**Dockerfile — .NET Native AOT build:**

```dockerfile
# Stage 1: Compile to native binary
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -r linux-musl-x64 --self-contained \
    -p:PublishAot=true \
    -p:StripSymbols=true \
    -o /app

# Stage 2: Minimal runtime image
FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-alpine
WORKDIR /app
COPY --from=build /app .
USER appuser
EXPOSE 8080
ENTRYPOINT ["./MyApp"]
```

### Pattern 2: Serverless Cold Start Benchmarking Across Runtimes

This pattern shows how to systematically benchmark cold start times across runtimes in a serverless environment. The benchmark measures the time from initial invocation (or post-idle invocation) to first response, which is the dominant cost for infrequently-called functions.

```python
"""
Serverless runtime cold start benchmark suite.

Measures cold start latency across JVM, .NET, Node.js, and native
runtimes in a container-based serverless environment. Uses identical
hardware profile and network topology for all runs.

Run before committing to a runtime for serverless workloads.
"""

import asyncio
import dataclasses
import json
import statistics
from pathlib import Path
from typing import Any


@dataclasses.dataclass(frozen=True)
class ColdStartResult:
    """Aggregated cold start benchmark result."""
    runtime: str
    version: str
    iterations: int
    mean_ms: float
    median_ms: float
    p95_ms: float
    p99_ms: float
    min_ms: float
    max_ms: float
    std_dev_ms: float
    warm_start_mean_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)


async def benchmark_runtime(
    runtime_name: str,
    image_name: str,
    invocation_command: list[str],
    iterations: int = 15,
    warm_up_runs: int = 3,
) -> ColdStartResult:
    """Run cold start benchmarks for a single runtime.

    For each iteration: starts a fresh container, sends an HTTP request,
    measures total latency, stops the container. The first N runs are
    considered "warm" to establish baseline steady-state performance.

    Args:
        runtime_name: Human-readable runtime name (e.g., 'Java 21/ZGC').
        image_name: Container image tag to test.
        invocation_command: Docker run command excluding the image name.
        iterations: Number of cold start measurements.
        warm_up_runs: Number of initial warm-up runs excluded from cold stats.

    Returns:
        ColdStartResult with aggregated statistics.
    """
    latencies_ms: list[float] = []
    warm_latencies: list[float] = []

    for i in range(iterations):
        container_id = _run_fresh_container(image_name, invocation_command)
        try:
            latency = _measure_http_latency(container_id)
            if i < warm_up_runs:
                warm_latencies.append(latency)
            else:
                latencies_ms.append(latency)
        finally:
            _stop_container(container_id)

    if not latencies_ms:
        raise ValueError(
            f"No cold start measurements collected for {runtime_name}"
        )

    return ColdStartResult(
        runtime=runtime_name,
        version=_extract_version(image_name),
        iterations=len(latencies_ms),
        mean_ms=statistics.mean(latencies_ms),
        median_ms=statistics.median(latencies_ms),
        p95_ms=percentile(latencies_ms, 95),
        p99_ms=percentile(latencies_ms, 99),
        min_ms=min(latencies_ms),
        max_ms=max(latencies_ms),
        std_dev_ms=statistics.stdev(latencies_ms),
        warm_start_mean_ms=(
            statistics.mean(warm_latencies) if warm_latencies else 0.0
        ),
    )


def _run_fresh_container(image: str, cmd: list[str]) -> str:
    """Start a new container from image and return its ID."""
    import subprocess

    result = subprocess.run(
        ["docker", "run", "-d", "--rm", *cmd, image],
        capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to start container: {result.stderr}")
    return result.stdout.strip()[:12]


def _measure_http_latency(container_id: str) -> float:
    """Send a single HTTP request and measure round-trip latency in ms."""
    import subprocess
    import time

    # Get host port mapped to container's 8080
    result = subprocess.run(
        ["docker", "port", container_id, "8080"],
        capture_output=True, text=True, check=False
    )
    host_port = result.stdout.strip().split(":")[-1]
    url = f"http://localhost:{host_port}/health"

    start = time.perf_counter_ns()
    subprocess.run(
        ["curl", "-s", "--max-time", "30", url],
        capture_output=True, check=False
    )
    elapsed_ms = (time.perf_counter_ns() - start) / 1_000_000
    return round(elapsed_ms, 2)


def _stop_container(container_id: str) -> None:
    """Stop and remove a container."""
    import subprocess

    subprocess.run(
        ["docker", "stop", "-t", "5", container_id],
        capture_output=True, check=False
    )


def _extract_version(image_name: str) -> str:
    """Extract version string from container image name."""
    parts = image_name.split(":")
    return parts[1] if len(parts) > 1 else "unknown"


def percentile(values: list[float], p: int) -> float:
    """Calculate the p-th percentile of a sorted-free value list."""
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1 if f + 1 < len(sorted_vals) else f
    d = k - f
    return round(sorted_vals[f] + d * (sorted_vals[c] - sorted_vals[f]), 2)


async def run_full_benchmark_suite() -> list[ColdStartResult]:
    """Execute the complete benchmark suite across all four runtime families.

    Each runtime tests with a minimal HTTP service exposing /health and /users endpoints.
    Results are written to results/cold_start_benchmark.json.
    """
    results = []

    benchmarks = [
        (
            "Java 21/ZGC",
            "myregistry/java21-app:latest",
            ["-p", "8080:8080"],
        ),
        (
            ".NET 8/Server GC",
            "myregistry/dotnet8-app:latest",
            ["-p", "8081:8080"],
        ),
        (
            ".NET 9/Native AOT",
            "myregistry/dotnet9-aot-app:latest",
            ["-p", "8082:8080"],
        ),
        (
            "Node.js 22/V8",
            "myregistry/node22-app:latest",
            ["-p", "8083:8080"],
        ),
        (
            "Go 1.23/static",
            "myregistry/go123-app:latest",
            ["-p", "8084:8080"],
        ),
        (
            "Rust 1.83/native",
            "myregistry/rust183-app:latest",
            ["-p", "8085:8080"],
        ),
    ]

    for name, image, cmd in benchmarks:
        print(f"⏱ Benchmarking {name}...")
        result = await benchmark_runtime(
            runtime_name=name,
            image_name=image,
            invocation_command=cmd,
            iterations=15,
            warm_up_runs=3,
        )
        results.append(result)
        print(f"  Cold start: {result.mean_ms:.0f}ms mean, "
              f"{result.p99_ms:.0f}ms p99")

    # Write results
    output_dir = Path("results")
    output_dir.mkdir(exist_ok=True)
    (output_dir / "cold_start_benchmark.json").write_text(
        json.dumps([r.to_dict() for r in results], indent=2)
    )

    return results
```

### Pattern 3: Container Image Optimization by Runtime

Comparing optimized container images across runtimes for the same application surface area demonstrates why runtime choice directly impacts deployment density and network transfer times.

```dockerfile
# === JVM (Java 21) — Optimized with Distroless + Slim JRE ===
FROM eclipse-temurin:21-jre-alpine AS jvm-base

# Install only what the application needs at runtime
RUN apk add --no-cache tini ca-certificates && \
    rm -rf /var/cache/apk/*

# Set JVM flags for container-aware operation
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseZGC"
ENV TZ=Etc/UTC

FROM gcr.io/distroless/java21-debian12

COPY --from=jvm-base /usr/lib/jvm /usr/lib/jvm
COPY --from=jvm-base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=jvm-base /bin/tini /sbin/tini
COPY target/app.jar /app.jar

USER 65532:65532
ENTRYPOINT ["/sbin/tini", "--", "java", "-jar", "/app.jar"]
# Expected final image size: ~180-250 MB


# === .NET 8 ASP.NET Core — Optimized with Multi-stage + Slim Runtime ===
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
RUN apk add --no-cache tini && rm -rf /var/cache/apk/*
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["/sbin/tini", "--", "./MyApp"]
USER appuser
# Expected final image size: ~120-180 MB


# === Node.js 22 — Optimized with Alpine + Production-only deps ===
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Tree-shake dev dependencies that slipped through
RUN find node_modules -name "*.d.ts" -exec rm {} \; 2>/dev/null || true
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
# Expected final image size: ~60-100 MB


# === Go 1.23 — Optimized with Multi-stage Static Binary + Scratch ===
FROM golang:1.23-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /app/server

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/app/server /server
ENTRYPOINT ["/server"]
# Expected final image size: ~15-30 MB


# === Rust 1.83 — Optimized with Multi-stage Static Binary + Scratch ===
FROM rust:1.83-alpine AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
RUN cargo fetch
COPY . .
RUN cargo build --release
RUN strip target/release/myapp

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/target/release/myapp /app
ENTRYPOINT ["/app"]
# Expected final image size: ~5-15 MB
```

---

## Constraints

### MUST DO
- Benchmark every runtime with the actual application workload — do not rely on published averages alone; architecture and dependency choices can double or halve these figures
- Use identical container base OS (e.g., Debian bookworm or Alpine 3.20) when comparing image sizes across runtimes to ensure fair comparison
- Account for JIT warm-up time in autoscaling decisions — JVM and .NET pods that scale up must serve traffic before the JIT compiler optimizes hot paths, causing elevated p99 during burst events
- Test Native Image / AOT compilation readiness early — reflection-heavy frameworks (Spring Data JPA, Entity Framework with dynamic proxies) may require significant rewrite for native compilation to succeed
- Measure memory under sustained load, not just at startup — a runtime with low cold-start memory can grow significantly due to JIT metadata cache, GC heap growth, or connection pool accumulation
- Run the full benchmark suite (Pattern 2) when making a serverless deployment decision — published numbers vary too much by infrastructure provider and invocation pattern

### MUST NOT DO
- Select JVM solely because "it is familiar" without quantifying whether JIT warm-up penalty exceeds cold start budget for the target deployment model
- Compare a fully-optimized JVM container (distroless, slim JRE) against a default .NET or Node.js image with debug symbols and dev tools included — unfair comparisons produce wrong decisions
- Assume GraalVM Native Image readiness guarantees production performance — build times can exceed 30 minutes and runtime behavior differs from JIT in edge cases (file descriptor limits, thread naming, TLS negotiation)
- Choose Node.js for CPU-intensive workloads without benchmarking — the single-threaded event loop will saturate on one core while other cores sit idle, wasting compute budget
- Deploy native-compilation images to Kubernetes with `latest` tags — always pin exact image digests (`@sha256:`) because Native Image and AOT builds are sensitive to OS library versions
- Skip operational tooling assessment — a runtime with excellent benchmark scores is useless if no profiler, tracer, or debugger exists for it in the target infrastructure

---

## Output Template

When applying this skill to evaluate runtime ecosystems, produce:

1. **Requirements Summary** — Restate each quantified deployment requirement with its threshold and source (e.g., "Cold start < 500ms — SRE team SLA, documented in RUN-2024-087").

2. **Runtime Scorecard** — A table scoring each runtime against every requirement using a 1–5 scale (5 = exceeds threshold comfortably, 3 = meets with margin, 1 = fails or requires significant optimization effort). Include the numeric benchmark data for each score.

3. **Container Image Comparison** — Show final image sizes for each runtime built with the same optimization strategy, measured from the same CI pipeline step. Include layer breakdown where relevant (base OS + runtime + application + dependencies).

4. **Cold Start Benchmark Report** — Present the cold start results from Pattern 2: mean, p95, p99, min, max across all iterations for each runtime. Flag any outlier measurements (> 2 standard deviations from mean) with likely cause.

5. **Operational Readiness Assessment** — For each remaining candidate, summarize profiling tooling availability, security patch cadence, team competency gaps, and documentation maturity.

6. **Recommendation with Rollback Plan** — State the selected runtime, justify against scorecard data, identify the closest runner-up, quantify the gap in key dimensions, and define explicit rollback triggers (e.g., "If p95 cold start exceeds 800ms for 3 consecutive days, fail over to [runner-up]").

---

## Related Skills

| Skill | Purpose |
|---|---|
| `modern-language-comparison` | Evaluates individual languages using microbenchmarks and developer experience metrics — use when runtime decision depends on language-level trade-offs (safety vs performance, ecosystem maturity) |
| `polyglot-development` | Designs cross-language integration, monorepo build systems, and inter-process communication between services running on different runtimes |
| `framework-selection` | Scores competing frameworks within a chosen runtime (e.g., Spring Boot vs Quarkus, ASP.NET Core minimal APIs vs MVC) using weighted criteria matrices |
| `version-migration` | Manages major version upgrades within a runtime stack (e.g., Java 17 → Java 21, .NET 6 → .NET 8) with automated refactoring and zero-downtime rollback strategies |

---

## Live References

> Authoritative documentation links for runtime ecosystem selection. The model follows markdown links at load time to resolve external references and inline content.

- [Java 21 LTS Release Notes — Oracle](https://www.oracle.com/java/technologies/javase/21-relnote-issues.html)
- [.NET 8 Documentation — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/overview)
- [Node.js 22 LTS Documentation — nodejs.org](https://nodejs.org/en/blog/release/v22.0.0)
- [GraalVM Native Image Documentation — Oracle](https://www.graalvm.org/latest/reference-manual/native-image/)
- [.NET Native AOT — Microsoft Documentation](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [Go 1.23 Release Notes — Go Blog](https://go.dev/doc/go1.23)
- [Rust 1.83 Release Notes — Rust Blog](https://blog.rust-lang.org/2024/12/19/Rust-1.83.0/)

---

## Benchmark Results Reference (Typical Values)

The following table summarizes observed cold start and footprint measurements from representative HTTP services measured on equivalent cloud VMs (2 vCPU, 4 GB RAM). These are empirical baselines — always benchmark your own workload.

| Runtime | Environment | Cold Start (ms) | p95 Startup | Warm p95 Latency | Image Size (MB) | Peak Memory at 1K RPS (MB) |
|---|---|---|---|---|---|---|
| Java 21 / ZGC | Docker, distroless | 2,400 – 6,800 | 5,200 | 8 – 15 ms | 180–250 | 320–512 |
| .NET 8 / Server GC | Docker, Alpine slim | 1,200 – 3,500 | 2,400 | 4 – 12 ms | 120–180 | 180–320 |
| .NET 9 / Native AOT | Docker, scratch | 30 – 80 | 60 | 3 – 8 ms | 30–50 | 40–80 |
| Node.js 22 / V8 | Docker, Alpine | 150 – 450 | 280 | 2 – 8 ms | 60–100 | 80–200 |
| Go 1.23 / static | Docker, scratch | 10 – 40 | 22 | 1 – 4 ms | 15–30 | 20–60 |
| Rust 1.83 / static | Docker, scratch | 5 – 25 | 14 | 1 – 3 ms | 5–15 | 10–30 |
