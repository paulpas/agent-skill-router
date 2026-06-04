---
name: cicd-build-orchestration
description: Orchestrates builds in CI/CD pipelines with multi-stage builds, artifact caching, containerized builds, build matrices, parallel execution, and automated deployment strategies (GitHub Actions, GitLab CI, Jenkins) for efficient and reliable software delivery.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - design phase
  - conceptual planning
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: CI/CD pipeline, build artifact, docker build, github actions, deployment pipeline, containerized builds, build orchestration, artifact management
  related-skills: makefile-best-practices, secure-release-pipeline, test-driven-development, git-branching-strategies
---

# CI/CD Build Orchestration

Orchestrates builds in continuous integration and delivery pipelines, managing artifact generation, dependency caching, multi-environment builds with matrix strategies, containerized execution, and automated promotion to deployment environments. Focuses on build infrastructure patterns, not on Makefile authoring (see makefile-best-practices for that).

## TL;DR Checklist

- [ ] Define build stages as independent, idempotent jobs that can run in parallel
- [ ] Implement dependency caching at the package manager level (pip, npm, maven, etc.)
- [ ] Use build matrices to test across multiple OS/language versions in a single job definition
- [ ] Separate build (artifact generation) from deploy (environment promotion) into distinct stages
- [ ] Pin all tool versions, base images, and action references to specific SHA digests (never `latest`)
- [ ] Generate container image layer cache on every build for sub-1-minute rebuilds
- [ ] Tag artifacts with both commit SHA and semantic version for full traceability
- [ ] Implement automated rollback triggered by health check failures after deployment

---

## When to Use

Use this skill when:

- Setting up a GitHub Actions, GitLab CI, or Jenkins pipeline for a new project or team
- Optimizing build time for slow pipelines by introducing caching, parallelism, or build matrices
- Designing a build artifact strategy that supports multiple target environments (dev, staging, production)
- Implementing containerized builds with Docker or Podman and managing image layer caching
- Coordinating multi-stage builds where outputs from one stage feed into the next (e.g., compile → test → package → deploy)
- Orchestrating builds across multiple operating systems or language versions (e.g., Python 3.10, 3.11, 3.12 on Ubuntu, macOS, Windows)
- Automating artifact tagging, registry push, and environment promotion decisions

---

## When NOT to Use

Avoid this skill for:

- Learning Makefile syntax or how to write build rules — use makefile-best-practices instead
- Writing individual build scripts (shell, Python, Ruby) without a CI/CD engine orchestrating them
- Creating Docker images for development/prototyping — this focuses on production artifact pipelines
- Troubleshooting specific GitHub Actions/GitLab CI API errors without understanding pipeline architecture
- One-off builds or local machine builds — CI/CD orchestration assumes a central, repeatable platform
- Simple projects with no parallel execution needs or cross-platform requirements

---

## Core Workflow

### 1. Define Pipeline Architecture
Map the overall flow: **Source (trigger) → Build/Compile → Test (unit/integration/e2e) → Package → Deploy (staging → production)**. Identify which stages can run in parallel (all tests can run in parallel; packaging depends on build completion). Decide on your CI/CD engine (GitHub Actions, GitLab CI, Jenkins) and runner infrastructure.

**Checkpoint:** Pipeline diagram exists (even ASCII art) showing stages, dependencies, and parallel execution points. No circular dependencies exist between stages.

### 2. Implement Build Stage with Caching
Configure the compiler/build tool with dependency caching at two levels: (a) package manager cache (pip, npm, maven), (b) build artifact cache (compiled objects, bundled assets). Use the CI engine's native caching actions (GitHub Actions `actions/cache`, GitLab CI `cache:` keyword) to store and restore between runs.

**Checkpoint:** Build time is measured before and after caching implementation. Expect 3–5x speedup for projects with heavy dependencies. Subsequent builds complete in under 2 minutes.

### 3. Design Build Matrix for Multiple Environments
Define a build matrix that tests across multiple OS/language/version combinations in a single job definition. The CI engine creates a job for each combination without manual duplication. Examples: Python 3.10/3.11/3.12 on Ubuntu/macOS, Node 18/20/22 on Ubuntu/Windows.

**Checkpoint:** Matrix is defined in the pipeline YAML without manual job duplication. At least 3 combinations are tested per project (e.g., multiple language versions or operating systems).

### 4. Orchestrate Multi-Stage Build
For containerized builds, design Docker multi-stage Dockerfiles where intermediate stages (build, test) produce artifacts that are passed to the final production stage. Layer caching is used to skip unchanged steps on subsequent builds. Build context is minimized (use `.dockerignore`) to reduce upload time.

**Checkpoint:** Dockerfile has at least 3 stages (base/dependencies → build → test → production). Layer caching is verified by running two builds and confirming the second completes in under 30 seconds.

### 5. Tag and Publish Artifacts
After successful build/test, tag the artifact with both the commit SHA (for full traceability) and a semantic version (for user-friendly version naming). Push to a private registry (GitHub Container Registry, GitLab Container Registry, Docker Hub, ECR, etc.). Immutability is enforced: once an artifact is tagged, it cannot be overwritten.

**Checkpoint:** Artifact registry contains multiple versions. A lookup by SHA returns exactly one artifact. A lookup by version tag returns the same artifact consistently.

### 6. Deploy Through Environment Stages
Promote artifacts from dev → staging → production with automated testing and manual approval gates at each step. Dev deployments are automatic. Staging deployments require all tests to pass. Production deployments require explicit human approval via GitHub Environments or equivalent.

**Checkpoint:** Deployment history is recorded (artifact version, deployer, timestamp, environment). Production deployments cannot proceed without approval evidence in the audit trail.

### 7. Implement Automated Rollback
After deployment, monitor health checks (HTTP health endpoints, Kubernetes readiness probes, error rates from observability systems). If health checks fail or error rates exceed threshold within 5 minutes of deployment, trigger automatic rollback to the previous version.

**Checkpoint:** Automated rollback has been tested in staging. Recovery from a failed deployment takes under 1 minute.

---

## Implementation Patterns

### Pattern 1: GitHub Actions Workflow with Multi-OS Build Matrix

A production-grade GitHub Actions workflow that builds and tests a Python package across multiple Python versions and operating systems in parallel. Demonstrates dependency caching, parallel test execution, and artifact packaging.

```yaml
# .github/workflows/build-and-test.yml
name: Build & Test (Multi-Platform Matrix)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  PYTHON_CACHE_VERSION: v1

jobs:
  build-matrix:
    name: Python ${{ matrix.python-version }} on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Complete all combinations even if one fails
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        python-version: ["3.10", "3.11", "3.12"]
    timeout-minutes: 30

    steps:
      # ─────────────────────────────────────────────────────────
      # Step 1: Checkout and environment setup
      # ─────────────────────────────────────────────────────────
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for version detection

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"
          cache-dependency-path: "requirements*.txt"

      # ─────────────────────────────────────────────────────────
      # Step 2: Dependency caching (critical for speed)
      # ─────────────────────────────────────────────────────────
      - name: Cache pip packages
        uses: actions/cache@v4
        id: cache-pip
        with:
          path: ~/.cache/pip
          key: ${{ env.PYTHON_CACHE_VERSION }}-${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
          restore-keys: |
            ${{ env.PYTHON_CACHE_VERSION }}-${{ runner.os }}-pip-

      # ─────────────────────────────────────────────────────────
      # Step 3: Install dependencies
      # ─────────────────────────────────────────────────────────
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip setuptools wheel
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f requirements-dev.txt ]; then pip install -r requirements-dev.txt; fi
        shell: bash

      # ─────────────────────────────────────────────────────────
      # Step 4: Build (compile, packaging)
      # ─────────────────────────────────────────────────────────
      - name: Build distribution package
        run: |
          python -m pip install build
          python -m build

      # ─────────────────────────────────────────────────────────
      # Step 5: Run unit tests (parallel within tier)
      # ─────────────────────────────────────────────────────────
      - name: Run unit tests
        run: |
          python -m pytest tests/unit/ \
            -v \
            --tb=short \
            --cov=src \
            --cov-report=term-missing \
            --cov-report=xml \
            --junitxml=test-results/unit-${{ matrix.os }}-${{ matrix.python-version }}.xml

      # ─────────────────────────────────────────────────────────
      # Step 6: Run integration tests (serial, require external services)
      # ─────────────────────────────────────────────────────────
      - name: Run integration tests
        if: matrix.os == 'ubuntu-latest'  # Only on Linux to save time
        run: |
          python -m pytest tests/integration/ \
            -v \
            --tb=short \
            --junitxml=test-results/integration-${{ matrix.os }}.xml

      # ─────────────────────────────────────────────────────────
      # Step 7: Upload test results and coverage
      # ─────────────────────────────────────────────────────────
      - name: Upload coverage to Codecov
        if: matrix.os == 'ubuntu-latest' && matrix.python-version == '3.12'
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
          flags: unittests
          name: codecov-umbrella

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.os }}-${{ matrix.python-version }}
          path: test-results/
          retention-days: 30

  # ─────────────────────────────────────────────────────────
  # Aggregation stage: fail only if *all* builds pass, any failure fails aggregate
  # ─────────────────────────────────────────────────────────
  build-matrix-final:
    name: Build Matrix Complete
    runs-on: ubuntu-latest
    needs: build-matrix
    if: always()
    steps:
      - name: Check build status
        if: needs.build-matrix.result != 'success'
        run: |
          echo "❌ Build matrix failed for at least one platform/version combination"
          exit 1
      - name: Check build success
        if: needs.build-matrix.result == 'success'
        run: echo "✅ All platform/version combinations passed"

  # ─────────────────────────────────────────────────────────
  # Artifact packaging stage: runs only after all builds pass
  # ─────────────────────────────────────────────────────────
  package-artifact:
    name: Package and Push Container Image
    needs: build-matrix-final
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # ─────────────────────────────────────────────────────────
      # Build container image with layer caching
      # ─────────────────────────────────────────────────────────
      - name: Extract metadata (version, tags)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-
            type=raw,value=${{ github.sha }}

      - name: Build and push container image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: mode=max  # Generate SLSA provenance

      - name: Generate SBOM
        run: |
          echo "Container image built: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}"
          echo "SBOM generation would be performed by a separate action or tool"
```

---

### Pattern 2: BAD vs. GOOD — Artifact Caching, Dependency Management, and Parallel Execution

**❌ BAD: Slow Build with No Caching, Sequential Test Tiers, Duplicate Matrix Jobs**

```yaml
# ─────────────────────────────────────────────────────────
# ❌ BAD: Every build installs all dependencies from scratch
# ─────────────────────────────────────────────────────────
name: CI (Slow, No Optimization)

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ❌ PROBLEM: No caching at all — full pip install every time
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          # ❌ cache: 'pip' is MISSING

      - run: pip install -r requirements.txt

      # ❌ PROBLEM: Build and test are in the same job (can't parallelize)
      - run: python -m build

      # ❌ PROBLEM: Tests run sequentially (unit → integration → e2e)
      - run: pytest tests/unit/
      - run: pytest tests/integration/
      - run: pytest tests/e2e/

  # ❌ PROBLEM: Matrix job duplicated for every OS manually
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: python -m build
      - run: pytest tests/unit/
      # Repeat test jobs...

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: python -m build
      - run: pytest tests/unit/
      # Repeat test jobs...

# ❌ PROBLEM: No artifact publication — images not pushed to registry
```

**Result:** A single push triggers ~10 minutes of CI time per platform. No artifacts available for promotion. Dependencies are re-downloaded on every build even if requirements.txt hasn't changed.

---

**✅ GOOD: Fast Build with Multi-Level Caching, Parallel Test Tiers, Matrix Strategy**

```yaml
# ─────────────────────────────────────────────────────────
# ✅ GOOD: Caching at multiple levels, parallel test tiers, matrix strategy
# ─────────────────────────────────────────────────────────
name: CI (Optimized)

on: [push]

env:
  CACHE_VERSION: v1

jobs:
  # ═══════════════════════════════════════════════════════
  # Stage 1: Build (single job, uses matrix internally)
  # ═══════════════════════════════════════════════════════
  build:
    name: Build Python ${{ matrix.python-version }} on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4

      # ✅ GOOD: Cache pip dependencies at package manager level
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'  # ← Enables automatic pip cache
          cache-dependency-path: 'requirements*.txt'

      # ✅ GOOD: Additional fine-grained cache for build artifacts
      - uses: actions/cache@v4
        with:
          path: .build-cache
          key: ${{ env.CACHE_VERSION }}-${{ runner.os }}-build-${{ hashFiles('setup.py', 'pyproject.toml') }}
          restore-keys: |
            ${{ env.CACHE_VERSION }}-${{ runner.os }}-build-

      - run: pip install -r requirements.txt

      # ✅ GOOD: Build to cache directory for reuse
      - run: python -m build --outdir .build-cache

      # ✅ GOOD: Upload build artifacts for use in deploy stage
      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.os }}-${{ matrix.python-version }}
          path: dist/

  # ═══════════════════════════════════════════════════════
  # Stage 2: Test — split into parallel tiers
  # ═══════════════════════════════════════════════════════
  test-unit:
    name: Unit Tests Python ${{ matrix.python-version }}
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
          cache-dependency-path: 'requirements-dev.txt'

      - run: pip install -r requirements-dev.txt

      # ✅ GOOD: Unit tests run in parallel (same step, different Python versions)
      - run: pytest tests/unit/ -v --cov --cov-report=xml

      - uses: codecov/codecov-action@v4

  test-integration:
    name: Integration Tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: 'pip'
          cache-dependency-path: 'requirements-dev.txt'

      - run: pip install -r requirements-dev.txt

      # ✅ GOOD: Integration tests run in parallel with unit tests
      - run: pytest tests/integration/ -v

  test-e2e:
    name: E2E Tests
    needs: test-integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: 'pip'
          cache-dependency-path: 'requirements-dev.txt'

      - run: pip install -r requirements-dev.txt

      # ✅ GOOD: E2E tests run after integration (depends on live system)
      - run: pytest tests/e2e/ -v

  # ═══════════════════════════════════════════════════════
  # Stage 3: Artifact Publication
  # ═══════════════════════════════════════════════════════
  publish:
    name: Publish Artifacts
    needs: [test-unit, test-integration, test-e2e]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4

      # ✅ GOOD: Set up buildx for efficient Docker layer caching
      - uses: docker/setup-buildx-action@v3

      # ✅ GOOD: Use GitHub Actions cache for Docker layer caching
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha  # ← Use GitHub Actions cache backend
          cache-to: type=gha,mode=max
```

**Result:** Full build matrix (9 combinations: 3 OS × 3 Python versions) completes in ~4 minutes due to:
- ✅ Parallel test tiers (unit, integration, e2e run concurrently)
- ✅ Pip cache hits reduce install time from 60s to 10s
- ✅ Matrix strategy eliminates manual job duplication
- ✅ Build artifacts passed between stages
- ✅ Docker layer caching from GitHub Actions backend

---

### Pattern 3: Docker Multi-Stage Build with Artifact Passing

A production Dockerfile that separates concerns across stages: dependencies → build → test → production. Layer caching ensures fast rebuilds.

```dockerfile
# ─────────────────────────────────────────────────────────
# Dockerfile: Multi-stage build for Python service
# ─────────────────────────────────────────────────────────
# Build time: ~120s cold, ~8s warm (cached layers)

# ─ Stage 1: Base image with system dependencies ─────────
FROM python:3.12-slim as base

LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY}"
LABEL org.opencontainers.image.description="Base image with system dependencies"

# ✅ GOOD: Install system dependencies once in base stage
# These layers are shared by all downstream stages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─ Stage 2: Dependencies layer (cached independently) ────
FROM base as dependencies

LABEL description="Python dependencies layer"

# ✅ GOOD: Copy only requirements files first (layer cache key)
# If requirements change, only this layer is rebuilt
COPY requirements.txt requirements-dev.txt ./

# ✅ GOOD: Install to user directory to avoid sudo issues
RUN python -m pip install --no-cache-dir --user \
    --upgrade pip setuptools && \
    pip install --no-cache-dir --user \
    -r requirements.txt && \
    pip install --no-cache-dir --user \
    -r requirements-dev.txt

# ─ Stage 3: Build & Test stage ────────────────────────
FROM dependencies as build

LABEL description="Build and test stage"

# ✅ GOOD: Copy source code after dependencies
# Source code changes don't invalidate dependency cache
COPY . .

# ✅ GOOD: Run lint and tests in build stage (fail fast)
RUN python -m ruff check src/ && \
    python -m pytest tests/unit/ --tb=short -q

# ✅ GOOD: Compile Python bytecode for faster startup
RUN python -m compileall src/

# ─ Stage 4: Production runtime (minimal image) ─────────
FROM base as production

LABEL org.opencontainers.image.title="MyService"
LABEL org.opencontainers.image.version="latest"
LABEL description="Production runtime with minimal footprint"

# ✅ GOOD: Don't include dev dependencies (pip, ruff, pytest, etc.)
# Only copy dependencies and compiled bytecode from build stage

# ✅ GOOD: Copy only built dependencies (not all build tools)
COPY --from=dependencies /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# ✅ GOOD: Copy compiled source code (no source in production)
COPY --from=build /app/src /app/src
COPY --from=build /app/pyproject.toml /app/

# ✅ GOOD: Create non-root user for security
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

# ✅ GOOD: Health check built into image
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8080/healthz || exit 1

CMD ["python", "-m", "src.main"]

# ─────────────────────────────────────────────────────────
# Build command to maximize layer caching:
#
#   docker buildx build \
#     --cache-from=type=registry,ref=ghcr.io/myorg/myapp:buildcache \
#     --cache-to=type=registry,ref=ghcr.io/myorg/myapp:buildcache,mode=max \
#     --tag ghcr.io/myorg/myapp:latest \
#     --tag ghcr.io/myorg/myapp:${GIT_SHA} \
#     .
# ─────────────────────────────────────────────────────────
```

**Layer Cache Behavior:**
- **First build (cold):** ~120 seconds (downloads base image, installs dependencies, runs tests)
- **Subsequent build with no source change:** ~8 seconds (all layers hit from cache)
- **Build with requirements.txt change:** ~45 seconds (stages 1–2 cached, stages 3–4 rebuilt)
- **Build with only source code change:** ~15 seconds (stages 1–2 cached, stage 3 rebuilt, stage 4 quick)

---

### Pattern 4: Kubernetes-Based Deployment with Automated Rollback

A Python orchestrator that manages promotion from staging to production with automated health checks and rollback.

```python
"""
Deployment Orchestrator with Automated Rollback

Manages deployment through environments with health verification
and automated rollback on failure. Demonstrates build artifact
traceability: every deployment references a specific commit SHA
and immutable artifact version.
"""

import asyncio
import httpx
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DeploymentPhase(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    VERIFICATION = "verification"
    COMPLETE = "complete"
    ROLLED_BACK = "rolled_back"


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class Artifact:
    """Immutable build artifact — traceability key."""
    commit_sha: str
    version: str
    image_tag: str
    registry: str
    built_at: datetime

    @property
    def full_tag(self) -> str:
        return f"{self.registry}/{self.image_tag}"

    def __str__(self) -> str:
        return f"{self.version} (sha: {self.commit_sha[:8]})"


@dataclass
class DeploymentRecord:
    """Audit trail entry for every deployment."""
    artifact: Artifact
    environment: str
    phase: DeploymentPhase
    deployer: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    previous_artifact: Optional[Artifact] = None

    def duration_seconds(self) -> Optional[int]:
        if self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None


class HealthChecker:
    """Verifies deployment health through HTTP and Kubernetes probes."""

    def __init__(
        self,
        health_endpoint: str = "/healthz",
        readiness_endpoint: str = "/ready",
        max_attempts: int = 12,
        check_interval_seconds: int = 5,
        error_rate_threshold: float = 0.01,
    ):
        self.health_endpoint = health_endpoint
        self.readiness_endpoint = readiness_endpoint
        self.max_attempts = max_attempts
        self.check_interval = check_interval_seconds
        self.error_rate_threshold = error_rate_threshold

    async def verify_deployment(
        self, service_url: str, timeout_seconds: int = 60
    ) -> tuple[bool, Optional[str]]:
        """Verify that deployed service is healthy within timeout.

        Returns:
            (success, error_message)
        """
        async with httpx.AsyncClient(timeout=5) as client:
            for attempt in range(1, self.max_attempts + 1):
                try:
                    # Check readiness probe first
                    ready_response = await client.get(
                        f"{service_url}{self.readiness_endpoint}"
                    )
                    if ready_response.status_code != 200:
                        print(
                            f"Attempt {attempt}: Service not ready "
                            f"(status {ready_response.status_code})"
                        )
                        await asyncio.sleep(self.check_interval)
                        continue

                    # Check health endpoint
                    health_response = await client.get(
                        f"{service_url}{self.health_endpoint}"
                    )
                    if health_response.status_code == 200:
                        print(f"✅ Health check passed (attempt {attempt})")
                        return True, None

                    print(f"Attempt {attempt}: Health check failed")
                    await asyncio.sleep(self.check_interval)

                except httpx.RequestError as exc:
                    print(f"Attempt {attempt}: Request failed: {exc}")
                    if attempt < self.max_attempts:
                        await asyncio.sleep(self.check_interval)
                    continue

        return False, f"Health checks failed after {self.max_attempts * self.check_interval}s"

    async def verify_error_rate(
        self, service_url: str, duration_seconds: int = 30
    ) -> tuple[bool, float]:
        """Monitor error rate during deployment (simulate from metrics system).

        In production, this would query Prometheus or a similar system.
        """
        await asyncio.sleep(2)
        # Simulated error rate check
        current_error_rate = 0.002  # Would be fetched from observability system
        passed = current_error_rate < self.error_rate_threshold
        return passed, current_error_rate


class DeploymentOrchestrator:
    """Orchestrates deployment with traceability and automated rollback."""

    def __init__(self):
        self.health_checker = HealthChecker()
        self.deployment_history: List[DeploymentRecord] = []

    async def deploy(
        self,
        artifact: Artifact,
        environment: str,
        service_url: str,
        deployer: str,
        previous_artifact: Optional[Artifact] = None,
    ) -> DeploymentRecord:
        """Deploy artifact to environment with health verification.

        Flow:
          1. Create deployment record (audit trail)
          2. Update Kubernetes deployment / configuration
          3. Wait for rollout and health checks
          4. Verify error rates during canary period
          5. Complete or rollback
        """
        record = DeploymentRecord(
            artifact=artifact,
            environment=environment,
            phase=DeploymentPhase.PENDING,
            deployer=deployer,
            previous_artifact=previous_artifact,
            started_at=datetime.now(),
        )

        print(f"🚀 Deploying {artifact} to {environment}")
        print(f"   Deployer: {deployer}")
        print(f"   Image: {artifact.full_tag}")

        try:
            # Step 1: Mark as in-progress
            record.phase = DeploymentPhase.IN_PROGRESS
            await self._apply_deployment(artifact, environment)
            print(f"   Rollout initiated...")

            # Step 2: Verify health
            record.phase = DeploymentPhase.VERIFICATION
            healthy, error_msg = await self.health_checker.verify_deployment(
                service_url
            )
            if not healthy:
                print(f"   ❌ Health check failed: {error_msg}")
                record.phase = DeploymentPhase.ROLLED_BACK
                record.error_message = error_msg
                record.completed_at = datetime.now()

                # Rollback if previous version exists
                if previous_artifact:
                    await self._rollback(previous_artifact, environment)
                    print(f"   ↩️  Rolled back to {previous_artifact}")

                self.deployment_history.append(record)
                return record

            # Step 3: Verify error rates during monitoring period
            error_rate_ok, error_rate = await self.health_checker.verify_error_rate(
                service_url
            )
            if not error_rate_ok:
                print(f"   ⚠️  Error rate {error_rate:.2%} exceeds threshold")
                record.phase = DeploymentPhase.ROLLED_BACK
                record.error_message = f"Error rate {error_rate:.2%}"
                record.completed_at = datetime.now()

                if previous_artifact:
                    await self._rollback(previous_artifact, environment)

                self.deployment_history.append(record)
                return record

            # Step 4: Success
            print(f"   ✅ Deployment verified (error rate: {error_rate:.2%})")
            record.phase = DeploymentPhase.COMPLETE
            record.completed_at = datetime.now()

            self.deployment_history.append(record)
            return record

        except Exception as exc:
            print(f"   ❌ Deployment failed: {exc}")
            record.phase = DeploymentPhase.ROLLED_BACK
            record.error_message = str(exc)
            record.completed_at = datetime.now()

            if previous_artifact:
                await self._rollback(previous_artifact, environment)

            self.deployment_history.append(record)
            return record

    async def _apply_deployment(self, artifact: Artifact, environment: str) -> None:
        """Apply Kubernetes deployment (kubectl set image, helm upgrade, etc.)."""
        # In production: subprocess call to kubectl or helm
        print(f"   → kubectl set image deployment/app app={artifact.full_tag} -n {environment}")

    async def _rollback(self, artifact: Artifact, environment: str) -> None:
        """Roll back to previous artifact."""
        print(
            f"   → kubectl set image deployment/app app={artifact.full_tag} -n {environment}"
        )

    def get_audit_trail(self, environment: Optional[str] = None) -> List[DeploymentRecord]:
        """Retrieve deployment history (audit trail)."""
        if environment:
            return [r for r in self.deployment_history if r.environment == environment]
        return self.deployment_history


# ───────────────────────────────────────────────────────────
# Example usage
# ───────────────────────────────────────────────────────────
async def main():
    orchestrator = DeploymentOrchestrator()

    artifact_new = Artifact(
        commit_sha="abc123def456",
        version="v2.1.0",
        image_tag="myapp:v2.1.0",
        registry="ghcr.io/myorg",
        built_at=datetime.now(),
    )

    artifact_previous = Artifact(
        commit_sha="9e8f7g6h5i4j",
        version="v2.0.1",
        image_tag="myapp:v2.0.1",
        registry="ghcr.io/myorg",
        built_at=datetime.now(),
    )

    # Deploy to staging (automatic)
    staging_result = await orchestrator.deploy(
        artifact=artifact_new,
        environment="staging",
        service_url="https://staging.example.com",
        deployer="github-actions",
        previous_artifact=artifact_previous,
    )

    print(
        f"\nStaging deployment: {staging_result.phase.value} "
        f"({staging_result.duration_seconds()}s)"
    )

    # Deploy to production (requires human approval)
    if staging_result.phase == DeploymentPhase.COMPLETE:
        prod_result = await orchestrator.deploy(
            artifact=artifact_new,
            environment="production",
            service_url="https://api.example.com",
            deployer="alice@company.com",
            previous_artifact=artifact_previous,
        )

        print(
            f"\nProduction deployment: {prod_result.phase.value} "
            f"({prod_result.duration_seconds()}s)"
        )

    # Print audit trail
    print("\n── Deployment Audit Trail ──")
    for record in orchestrator.get_audit_trail():
        print(
            f"{record.environment:12} | {record.artifact.version:10} | "
            f"{record.phase.value:15} | {record.deployer:20}"
        )


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Constraints

### MUST DO

- **Pin all tool versions to specific SHA digests or version tags** — Never use `latest` or floating tags in production pipelines. Pin GitHub Actions to exact versions: `actions/checkout@v4.1.7` (not `v4`). Pin base images: `python:3.12.5-slim` (not `3.12` or `latest`).

- **Separate build (artifact generation) from deploy (environment promotion)** — Keep these as distinct, independent stages. Build produces immutable artifacts. Deploy consumes artifacts and handles stateful changes (traffic switching, database migrations).

- **Implement dependency caching at package manager and artifact levels** — Use `actions/cache` for pip, npm, maven. Store compiled/bundled artifacts in `.build-cache`. Cache keys must be deterministic (based on dependency files, not timestamps).

- **Use build matrices instead of manual job duplication** — Define `strategy.matrix` to test across multiple OS/language versions. Never manually create separate jobs for each combination.

- **Tag artifacts with both commit SHA and semantic version** — Enable traceability: `ghcr.io/myorg/app:v1.2.0` and `ghcr.io/myorg/app:sha-abc123def456`. The same artifact must be referenceable by both.

- **Require explicit approval gates before production deployment** — Configure GitHub Environments with required reviewers or use equivalent protection rules in GitLab/Jenkins. Document the approver in audit logs.

- **Implement automated health checks within 5 minutes of deployment** — Run health endpoint checks, error rate monitoring, and latency checks. Trigger automatic rollback if thresholds are exceeded.

- **Log every deployment with commit SHA, artifact version, deployer, and timestamp** — Generate audit trail entries. Store in version control or central logging system for compliance.

---

### MUST NOT DO

- **Do not hardcode secrets, API keys, or tokens in pipeline YAML files** — Use GitHub Secrets, GitLab CI Variables, Jenkins Credentials, or HashiCorp Vault. Reference via variable interpolation.

- **Do not skip or bypass quality gates on production deployments** — Every deployment must pass all security scans, tests, and health checks. Do not add `continue-on-error: true` to critical stages.

- **Do not use `latest` tags for container images in any deployment manifest** — This breaks reproducibility and traceability. Always reference by specific version or commit SHA.

- **Do not mix artifact building and environment-specific deployment in a single job** — Build once, deploy many times. A single artifact should be deployable to dev, staging, and production without rebuilding.

- **Do not deploy to production without passing through staging with the exact same artifact** — Staging must be bit-identical to production. No rebuilds or environment-specific compilation steps.

- **Do not enable automatic promotion to production without human approval** — This is the single most common cause of uncontrolled production incidents. Production promotions must have explicit, logged approvals.

- **Do not cache sensitive data (secrets, credentials) in build artifact caches** — Ensure caches do not leak authentication tokens, private keys, or other credentials. Clear caches before archiving.

---

## Live References

Authoritative documentation for CI/CD orchestration tools and artifact management:

- **GitHub Actions:** https://docs.github.com/en/actions
  - Workflow syntax, events, contexts, expressions
  - Actions for caching, artifact management, container publishing
  - OIDC federation for cloud provider authentication

- **GitHub Actions: Caching Dependencies:** https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows

- **GitLab CI/CD:** https://docs.gitlab.com/ee/ci/
  - `.gitlab-ci.yml` syntax, stages, jobs, variables
  - Docker/container executor, layer caching
  - Artifact management and cache policies

- **Jenkins Pipeline:** https://www.jenkins.io/doc/book/pipeline/
  - Declarative and scripted pipeline syntax
  - Parallel execution, matrix builds
  - Artifact archiving and fingerprinting

- **Docker Multi-Stage Builds:** https://docs.docker.com/build/building/multi-stage/
  - Layer caching behavior and optimization
  - BuildKit syntax for advanced caching

- **Kubernetes Deployment Strategies:** https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy
  - Rolling updates, blue-green, canary patterns
  - Health checks and readiness probes

- **SLSA Framework - Supply Chain Levels for Software Artifacts:** https://slsa.dev/
  - Artifact attestation, provenance verification
  - Supply chain integrity best practices

---

## Related Skills

| Skill | Purpose |
|---|---|
| `makefile-best-practices` | How to WRITE Makefiles correctly (grammar, patterns, conventions). This skill focuses on USING Makefiles in CI/CD pipelines. |
| `secure-release-pipeline` | Security gates (SAST, DAST, SCA), vulnerability scanning, and compliance checks integrated into CI/CD. |
| `test-driven-development` | Test-first practices that produce the unit and integration tests orchestrated by build pipelines. |
| `git-branching-strategies` | Branch models (GitHub Flow, GitFlow) that determine trigger conditions and promotion gates. |
