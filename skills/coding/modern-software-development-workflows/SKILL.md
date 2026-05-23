---
name: modern-software-development-workflows
description: >-
  Implements end-to-end software development workflows including CI/CD pipelines, automated testing strategies, code quality gates, observability integration, and production deployment patterns for modern software delivery.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software development, CI/CD pipeline, continuous integration, automated testing, code quality gates, deployment strategy, release management, DevOps workflow
  archetypes:
    - orchestration
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
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
    - examples
    - do-dont
  related-skills: coding-test-driven-development, coding-code-review, coding-performance-optimization, coding-security-review, coding-observability-patterns
---

# Modern Software Development Workflows

Implements end-to-end software delivery workflows that connect version control through production deployment. When loaded, the model designs CI/CD pipelines with proper stage gating, configures automated testing strategies across unit/integration/e2e layers, enforces code quality gates before merge, integrates observability into every release, and applies safe deployment patterns (blue-green, canary, feature flags) to ship software with confidence and rollback capability.

## TL;DR Checklist

- [ ] Verify CI pipeline has at least 4 stages: lint → test → build → deploy with explicit failure gates
- [ ] Confirm branch protection rules block merges when required status checks fail
- [ ] Check that unit tests run in parallel with a coverage threshold of ≥ 80% enforced as a quality gate
- [ ] Validate integration tests target a disposable staging environment, not production or shared test DBs
- [ ] Ensure deployment uses a safe pattern (blue-green, canary, or feature flags) with automated rollback
- [ ] Verify observability metrics and health checks are injected into every release artifact before promotion
- [ ] Confirm all secrets flow through a vault (e.g., SOPS, HashiCorp Vault) — never via environment variables in CI logs

---

## When to Use

Use this skill when:

- Designing or refactoring a CI/CD pipeline from scratch for a new application repository
- A team needs to establish quality gates (linting, testing, security scanning) as merge-blocking requirements
- Migrating from manual deployments or ad-hoc shell scripts to automated, auditable release pipelines
- Integrating observability (metrics, health checks, tracing) into the build artifacts before they reach production
- Implementing a safe deployment strategy (blue-green, canary, feature flags) to reduce blast radius of releases
- Conducting a DevOps maturity assessment and identifying gaps in the current software delivery lifecycle
- Setting up automated rollback triggers based on post-deployment health metric thresholds

---

## When NOT to Use

Avoid this skill for:

- Implementing SOLID or DRY principles — that belongs in `coding-software-engineering-principles`
- Writing unit test methodology or TDD discipline — use `coding-test-driven-development` instead
- Analyzing code for security vulnerabilities — use `coding-security-review` instead
- Simple single-file scripts or proof-of-concept projects where a full pipeline adds more overhead than value

---

## Core Workflow

1. **Audit Current Delivery Pipeline** — Inventory every step from code commit to production: version control branching model, CI triggers, test execution, artifact storage, deployment targets, and rollback mechanisms. Map existing tools (GitHub Actions, GitLab CI, Jenkins) and identify gaps where manual steps or missing quality gates create delivery risk.
   **Checkpoint:** Produce a pipeline map listing each stage, its duration, failure rate, and whether it has an automated rollback path.

2. **Design Branching Model and Merge Policy** — Select a branching strategy (trunk-based development with feature flags for fast flow, or GitFlow for regulated environments). Configure branch protection rules: require pull request reviews from at least one approved reviewer, enforce required status checks (lint passes, unit tests pass, build succeeds), and disable force pushes to protected branches. Set up automatic squashing of merge commits to keep history linear on `main`.
   **Checkpoint:** Push a test commit to the protected branch and verify that all required checks block the merge when any stage fails.

3. **Configure CI Pipeline Stages** — Define the pipeline in `.github/workflows/ci.yml` (or equivalent) with explicit stages: lint (`ruff check`, `mypy --strict`), unit test (`pytest tests/unit/` with coverage enforcement), integration test (`pytest tests/integration/` against disposable infrastructure), build artifact creation (Docker image with SBOM), and security scanning (`trivy`, `gitleaks`). Each stage must fail-fast — subsequent stages skip on upstream failure using `if: success()` conditions.
   **Checkpoint:** Trigger a pipeline run with an intentional lint error and verify that test and build stages are skipped, not failed.

4. **Establish Code Quality Gates** — Define pass/fail thresholds as gate criteria that block merging: code coverage ≥ 80% (tracked via `pytest-cov`), zero critical/severe vulnerabilities in dependency scanning (trivy), zero secrets leaked (gitleaks), type checking passes (`mypy --strict` with no ignored errors). Configure SonarQube or equivalent for static analysis quality gate enforcement — block merges on new code covering less than the threshold, technical debt ratio under 5%, and zero bugs.
   **Checkpoint:** Run `sonar-scanner` locally and verify it fails when coverage drops below threshold or vulnerabilities are introduced.

5. **Set Up CD with Safe Deployment Pattern** — Implement deployment in stages: first deploy to a staging environment for automated smoke tests, then promote to production using blue-green (two identical environments with traffic switch via load balancer) or canary (route 5-10% of traffic to new version, monitor error rates and latency, gradually increase). Configure feature flags using LaunchDarkly or Unleash so features ship behind toggles independent of deployments. Define automated rollback triggers: if error rate exceeds 1% for more than 2 minutes post-deploy, automatically revert to the previous revision.
   **Checkpoint:** Deploy a canary release and verify that elevated error rates trigger an automatic rollback within the defined SLA window.

6. **Inject Observability into Release Artifacts** — Ensure every built artifact includes health check endpoints (`/health` returning HTTP 200 with service status, `/ready` for readiness probe), structured JSON logging (not plain text), OpenTelemetry tracing instrumentation, and Prometheus metrics exposure at `/metrics`. Register the service in the monitoring stack so dashboards auto-create. Configure alert rules that fire on SLO violations: error budget burn rate > 2x baseline, p99 latency exceeding threshold, or availability below 99.9%.
   **Checkpoint:** Hit the `/health` and `/ready` endpoints of a deployed container and verify both return correct status before enabling traffic.

7. **Configure Release Management and Rollback** — Implement semantic versioning with automated changelog generation from conventional commit messages (`standard-version --release-version`). Tag every production deployment with a git tag matching the release version. Maintain a deploy history log in a structured format (JSON lines) recording: version, deployer, timestamp, commit SHA, rollback status, and post-deploy health check results. Define runbook procedures for common failure scenarios with explicit `kubectl` commands or API calls to execute rollback within 5 minutes.
   **Checkpoint:** Execute a full rollback from production staging back to the previous version and verify all traffic routes correctly within the SLA window.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Complete CI/CD Pipeline Configuration (GitHub Actions)

A production-grade CI/CD pipeline with staged execution, artifact caching, dependency scanning, Docker build with SBOM, and environment-aware deployment gates.

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        default: "staging"
        type: choice
        options: [staging, production]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  contents: read
  packages: write
  security-events: write

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements-dev.txt
          pip install ruff mypy bandit safety

      - name: Run linter (ruff)
        run: ruff check src/ tests/ --output-format=github

      - name: Run type checker (mypy --strict)
        run: mypy --strict src/ --config-file mypy.ini

      - name: Check dependency vulnerabilities (safety)
        run: safety check -r requirements.txt --json > safety-report.json || true

  unit-test:
    name: Unit Tests & Coverage
    runs-on: ubuntu-latest
    needs: [lint]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements-dev.txt

      - name: Run unit tests with coverage
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
        run: |
          pytest tests/unit/ \
            --cov=src \
            --cov-branch \
            --cov-report=term-missing \
            --cov-report=json:coverage.json \
            --cov-fail-under=80 \
            -v

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage.json
          retention-days: 5

  integration-test:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-test]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: integrationdb
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install --upgrade pip && pip install -r requirements-dev.txt

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/integrationdb
          REDIS_URL: redis://localhost:6379/0
        run: |
          pytest tests/integration/ \
            --durations=10 \
            -v \
            -m "not slow"

      - name: Upload test results on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/
          retention-days: 3

  build:
    name: Build & Security Scan
    runs-on: ubuntu-latest
    needs: [unit-test, integration-test]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH"
          exit-code: "1"

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "trivy-results.sarif"

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging using Helm
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG_STAGING }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig
          helm upgrade --install app ./helm-chart \
            --namespace=staging \
            --set image.tag=${{ github.sha }} \
            --set environment=staging \
            --wait --timeout=300s

      - name: Run smoke tests against staging
        run: |
          curl -sf https://app-staging.example.com/health || exit 1
          curl -sf https://app-staging.example.com/ready || exit 1

  deploy-production:
    name: Deploy to Production (Canary)
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main' && github.event_name != 'workflow_dispatch'
    environment: production
    concurrency: production-deploy

    steps:
      - uses: actions/checkout@v4

      - name: Canary deployment using Argo Rollouts
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig
          kubectl apply -f argo-rollouts/canary-deployment.yaml

      - name: Wait for canary analysis
        run: |
          sleep 120
          kubectl get rollouts app-rollout -n production -o jsonpath='{.status.phase}'

      - name: Promote canary to full rollout
        if: success()
        run: |
          export KUBECONFIG=/tmp/kubeconfig
          kubectl argo rollouts promote app-rollout -n production

      - name: Record deployment in deploy log
        run: |
          echo "{\"version\":\"${{ github.sha }}\",\"deployer\":\"ci\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"status\":\"success\"}" >> /tmp/deploy-log.json
```

### Pattern 2: Comprehensive Testing Strategy Framework with Coverage Enforcement

A complete testing framework covering unit, integration, and smoke test layers with pytest configuration, fixture management, coverage thresholds, and a test execution runner.

```python
"""testing/strategy.py — Multi-layer test execution framework with quality gates."""

from __future__ import annotations

import sys
import subprocess
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CoverageThreshold:
    """Coverage thresholds per test layer that must be met to pass quality gate.

    Attributes:
        lines_pct: Minimum percentage of total lines covered (0.0–1.0).
        branches_pct: Minimum percentage of branches covered (0.0–1.0).
        missing_functions: List of function names excluded from coverage minimums.
    """
    lines_pct: float = 0.80
    branches_pct: float = 0.60
    missing_functions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class TestResult:
    """Immutable result of a test layer execution."""
    layer: str
    passed: bool
    total: int
    failed: int
    skipped: int
    duration_seconds: float
    coverage_lines_pct: float | None = None
    errors: list[str] = field(default_factory=list)

    @property
    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return (
            f"[{status}] {self.layer}: "
            f"{self.failed} failed, {self.skipped} skipped, "
            f"{self.duration_seconds:.1f}s, "
            f"coverage: {self.coverage_lines_pct:.1f}%{' ' if self.coverage_lines_pct else ''}"
        )


class TestLayer(Protocol):
    """Protocol for a test layer (unit, integration, smoke) that can be executed."""

    def execute(self) -> TestResult: ...


class UnitTestRunner:
    """Executes unit tests with coverage enforcement and parallel execution.

    Uses pytest-cov to measure line and branch coverage. Fails fast if
    the configured coverage threshold is not met. Skips integration markers
    by default using -m "not integration".
    """

    def __init__(
        self,
        src_path: str = "src",
        test_path: str = "tests/unit",
        coverage_threshold: CoverageThreshold | None = None,
        parallel_workers: int = 4,
    ) -> None:
        self.src_path = src_path
        self.test_path = test_path
        self.coverage_threshold = coverage_threshold or CoverageThreshold()
        self.parallel_workers = parallel_workers

    def execute(self) -> TestResult:
        cmd = [
            sys.executable, "-m", "pytest",
            self.test_path,
            f"--cov={self.src_path}",
            "--cov-branch",
            "--cov-report=json:.coverage.json",
            "--cov-report=term-missing",
            "-m", "not integration and not e2e",
            "-n", str(self.parallel_workers),
            "--dist=loadfile",
            "-v",
        ]

        logger.info("Running unit tests: %s", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True)
        output_lines = result.stdout.splitlines()

        # Extract coverage from JSON report if available
        coverage_pct: float | None = None
        coverage_file = Path(".coverage.json")
        if coverage_file.exists():
            with open(coverage_file) as f:
                cov_data = json.load(f)
            coverage_pct = round(cov_data.get("summary", {}).get("percent_covered", 0.0), 1)

        # Extract test counts from pytest output
        passed = sum(1 for line in output_lines if " PASSED" in line)
        failed = sum(1 for line in output_lines if " FAILED" in line)
        skipped = sum(1 for line in output_lines if " SKIPPED" in line or " xfailed" in line)

        duration = 0.0
        for line in output_lines:
            if "Total test time:" in line or "duration:" in line.lower():
                parts = line.split(":")
                if len(parts) >= 2:
                    try:
                        duration = float(parts[-1].strip().split(" ")[0])
                    except ValueError:
                        pass

        passed = result.returncode == 0

        errors = [l.strip() for l in result.stderr.splitlines()[-10:] if l.strip()] if not passed else []

        return TestResult(
            layer="unit",
            passed=passed and (coverage_pct is None or coverage_pct >= self.coverage_threshold.lines_pct),
            total=passed + failed + skipped,
            failed=failed if not passed else 0,
            skipped=skipped,
            duration_seconds=duration,
            coverage_lines_pct=coverage_pct,
            errors=errors,
        )


class IntegrationTestRunner:
    """Executes integration tests against disposable service instances.

    Spins up required services via Docker Compose, runs integration test suite,
    then tears down all infrastructure. Each test is isolated with unique
    database schemas or namespaces to prevent cross-test contamination.
    """

    def __init__(self, compose_file: str = "docker-compose.test.yml") -> None:
        self.compose_file = compose_file
        self.services_dir = Path("/tmp/test-services")

    def execute(self) -> TestResult:
        # Start disposable infrastructure
        subprocess.run(
            ["docker", "compose", "-f", self.compose_file, "up", "-d"],
            check=True, capture_output=True, text=True,
        )

        try:
            cmd = [
                sys.executable, "-m", "pytest",
                "tests/integration/",
                "-v",
                "-m", "integration",
                "--timeout=60",
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)

            passed = result.returncode == 0
            output_lines = result.stdout.splitlines() if result.stdout else []
            failed = sum(1 for l in output_lines if " FAILED" in l)
            skipped = sum(1 for l in output_lines if " SKIPPED" in l or " xfailed" in l)

            return TestResult(
                layer="integration",
                passed=passed,
                total=len(output_lines),
                failed=failed if not passed else 0,
                skipped=skipped,
                duration_seconds=0.0,
                errors=[l.strip() for l in result.stderr.splitlines()[-5:]] if not passed else [],
            )

        finally:
            subprocess.run(
                ["docker", "compose", "-f", self.compose_file, "down", "--volumes"],
                check=False, capture_output=True, text=True,
            )


def run_pipeline(layers: list[TestLayer], fail_fast: bool = True) -> list[TestResult]:
    """Execute test layers in sequence with optional fail-fast behavior.

    Returns a list of TestResults for each layer. If fail_fast is True,
    stops executing remaining layers when a prior layer fails.

    Args:
        layers: Ordered list of test layer runners to execute.
        fail_fast: When True, skip subsequent layers if any layer fails.

    Returns:
        List of TestResult objects in execution order.
    """
    results: list[TestResult] = []

    for layer_runner in layers:
        result = layer_runner.execute()
        results.append(result)
        logger.info("Layer complete: %s", result.summary)

        if not result.passed and fail_fast:
            logger.warning("Fail-fast triggered — skipping remaining layers after %s failure", result.layer)
            break

    return results


# --- BAD vs GOOD: Coverage Enforcement Pattern ---

# ❌ BAD: Coverage check is a separate manual step with no enforcement.
# The team runs coverage locally but CI allows merging regardless of threshold.
def bad_coverage_check() -> None:  # type: ignore[no-untyped-def]
    import subprocess
    subprocess.run(["pytest", "--cov=src", "tests/unit/"])
    print("Coverage run complete — please verify it's above 80%")  # No enforcement!


# ✅ GOOD: Coverage threshold is enforced programmatically with clear failure mode.
# pytest-cov's --cov-fail-under exits non-zero when below the threshold,
# causing CI to block the merge automatically.
def good_coverage_check(threshold: float = 0.80) -> None:
    """Run unit tests and enforce minimum coverage threshold.

    Args:
        threshold: Minimum required coverage percentage (e.g., 0.80 for 80%).

    Raises:
        RuntimeError: If coverage falls below the enforced threshold.
    """
    import subprocess

    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/unit/",
         f"--cov=src", "--cov-branch",
         f"--cov-fail-under={int(threshold * 100)}", "-v"],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        coverage_line = [l for l in result.stdout.splitlines() if "TOTAL" in l]
        actual = coverage_line[0].split()[-1] if coverage_line else "unknown"
        raise RuntimeError(
            f"Coverage gate FAILED: {actual} is below the {int(threshold * 100)}% threshold.\n"
            f"Add tests or update src/ to improve coverage."
        )

    print(f"Coverage gate PASSED: >= {int(threshold * 100)}%")
```

### Pattern 3: Code Quality Gate Enforcement with Multi-Tool Scanning

Enforces quality gates across multiple tools (ruff, mypy, bandit, safety, trivy) with a unified pass/fail report and configurable severity thresholds.

```python
"""quality/gates.py — Unified code quality gate enforcement for CI merge protection."""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Protocol

logger = logging.getLogger(__name__)


class Severity(str, Enum):
    """Severity levels for quality gate findings."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class GateConfig:
    """Configuration for a single quality gate.

    Attributes:
        tool: Name of the scanning tool (ruff, mypy, bandit, safety, trivy).
        severity_threshold: Minimum severity to consider as a violation.
        allow_fixme: If True, findings marked with "noqa" or "# type: ignore" are exempt.
    """
    tool: str
    severity_threshold: Severity = Severity.HIGH
    allow_fixme: bool = True


@dataclass(frozen=True)
class GateResult:
    """Result from a single quality gate evaluation."""
    config: GateConfig
    passed: bool
    findings_count: int
    critical_count: int
    high_count: int
    details: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return (
            f"[{status}] {self.config.tool}: "
            f"{self.findings_count} findings "
            f"({self.critical_count} critical, {self.high_count} high)"
        )


class QualityTool(Protocol):
    """Protocol for a quality scanning tool."""

    def scan(self, config: GateConfig) -> GateResult: ...


class RuffScanner:
    """Runs ruff linter and checks for violations above the severity threshold.

    Uses ruff's --output-format=json output to parse individual findings
    with their severity levels (E = error/warning, F = fatal).
    """

    def __init__(self, src_dirs: list[str] | None = None) -> None:
        self.src_dirs = src_dirs or ["src/", "tests/"]

    def scan(self, config: GateConfig) -> GateResult:
        if config.tool != "ruff":
            return GateResult(
                config=config, passed=True, findings_count=0,
                critical_count=0, high_count=0,
                details=["Scanning skipped: tool mismatch"],
            )

        cmd = [sys.executable, "-m", "ruff", "check"] + self.src_dirs + [
            "--output-format=json",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        findings: list[dict] = []
        if result.stdout.strip():
            try:
                findings = json.loads(result.stdout)
            except json.JSONDecodeError:
                return GateResult(
                    config=config, passed=False, findings_count=1,
                    critical_count=1, high_count=0,
                    details=[f"Failed to parse ruff JSON output: {result.stderr[:200]}"],
                )

        severity_map = {"F": Severity.CRITICAL, "E": Severity.HIGH, "W": Severity.MEDIUM}
        threshold_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
        max_severity_idx = threshold_order.get(config.severity_threshold, 1)

        critical_count = 0
        high_count = 0
        details: list[str] = []

        for finding in findings:
            code = finding.get("code", "")
            rule_type = code[0] if code else ""
            severity = severity_map.get(rule_type, Severity.LOW)
            idx = threshold_order.get(severity, 3)

            if config.allow_fixme and "noqa" in finding.get("message", "").lower():
                continue

            details.append(f"{finding['filename']}:{finding.get('line_no', '?')}:{finding.get('column', '?')} [{code}] {finding.get('message', '')}")

            if idx <= max_severity_idx:
                if severity == Severity.CRITICAL:
                    critical_count += 1
                elif severity == Severity.HIGH:
                    high_count += 1

        total_violations = sum(
            1 for f in findings
            if not (config.allow_fixme and "noqa" in f.get("message", "").lower())
        )
        threshold_foundings = critical_count + high_count
        passed = threshold_foundings == 0

        return GateResult(
            config=config,
            passed=passed,
            findings_count=total_violations,
            critical_count=critical_count,
            high_count=high_count,
            details=details[:10],  # Cap details to avoid flooding output
        )


class MypyScanner:
    """Runs mypy type checker with strict mode and checks for violations."""

    def __init__(self, src_dirs: list[str] | None = None) -> None:
        self.src_dirs = src_dirs or ["src/"]

    def scan(self, config: GateConfig) -> GateResult:
        if config.tool != "mypy":
            return GateResult(
                config=config, passed=True, findings_count=0,
                critical_count=0, high_count=0,
                details=["Scanning skipped: tool mismatch"],
            )

        cmd = [sys.executable, "-m", "mypy"] + self.src_dirs + [
            "--strict",
            "--show-error-codes",
            "--show-traceback",
        ]
        if Path("mypy.ini").exists():
            cmd.extend(["--config-file", "mypy.ini"])

        result = subprocess.run(cmd, capture_output=True, text=True)
        errors = [l.strip() for l in result.stdout.splitlines() if "->" in l or ":" in l]

        # Strict mode: any error is a critical finding
        passed = result.returncode == 0 and len(errors) == 0

        return GateResult(
            config=config,
            passed=passed,
            findings_count=len(errors),
            critical_count=len(errors),
            high_count=0,
            details=errors[:10],
        )


class BanditScanner:
    """Runs bandit security linter on Python source files."""

    def __init__(self, src_dirs: list[str] | None = None) -> None:
        self.src_dirs = src_dirs or ["src/"]

    def scan(self, config: GateConfig) -> GateResult:
        if config.tool != "bandit":
            return GateResult(
                config=config, passed=True, findings_count=0,
                critical_count=0, high_count=0,
                details=["Scanning skipped: tool mismatch"],
            )

        cmd = [sys.executable, "-m", "bandit"] + self.src_dirs + [
            "--json",
            "--severity-level", config.severity_threshold.value,
            "--exit-zero",  # Don't fail — we parse results ourselves
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        findings: list[dict] = []
        if result.stdout.strip():
            try:
                data = json.loads(result.stdout)
                findings = data.get("results", [])
            except json.JSONDecodeError:
                return GateResult(
                    config=config, passed=False, findings_count=1,
                    critical_count=1, high_count=0,
                    details=["Failed to parse bandit JSON output"],
                )

        critical = sum(1 for f in findings if f.get("issue_severity") == "CRITICAL")
        high = sum(1 for f in findings if f.get("issue_severity") == "HIGH")

        passed = critical == 0 and high == 0

        return GateResult(
            config=config,
            passed=passed,
            findings_count=len(findings),
            critical_count=critical,
            high_count=high,
            details=[f"{f.get('filename', '?')}:{f.get('line_number', '?')} [{f.get('issue_id', '?')}] {f.get('issue_text', '')}" for f in findings[:5]],
        )


def run_quality_gates(gate_configs: list[GateConfig] | None = None) -> list[GateResult]:
    """Execute all configured quality gates and return results.

    All gates must pass for the pipeline to continue. A single failing gate
    blocks the merge/commit and produces a structured report.

    Args:
        gate_configs: List of gate configurations. Uses defaults if None.

    Returns:
        List of GateResult objects in execution order.
    """
    configs = gate_configs or [
        GateConfig(tool="ruff", severity_threshold=Severity.HIGH),
        GateConfig(tool="mypy", severity_threshold=Severity.CRITICAL),
        GateConfig(tool="bandit", severity_threshold=Severity.HIGH),
    ]

    scanners: dict[str, QualityTool] = {
        "ruff": RuffScanner(),
        "mypy": MypyScanner(),
        "bandit": BanditScanner(),
    }

    results: list[GateResult] = []

    for config in configs:
        scanner = scanners.get(config.tool)
        if not scanner:
            logger.warning("No scanner registered for tool: %s", config.tool)
            continue

        result = scanner.scan(config)
        results.append(result)
        logger.info("Gate result: %s", result)

    all_passed = all(r.passed for r in results)
    failed_gates = [r for r in results if not r.passed]

    if failed_gates:
        logger.error(
            "%d/%d quality gates FAILED: %s",
            len(failed_gates), len(results),
            ", ".join(r.config.tool for r in failed_gates),
        )
    else:
        logger.info("All %d quality gates PASSED", len(results))

    return results


# --- Usage example ---
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    results = run_quality_gates()

    exit_code = 0 if all(r.passed for r in results) else 1
    for r in results:
        print(str(r))

    sys.exit(exit_code)
```

### Pattern 4: Deployment Health Monitor with Automated Rollback Triggers

Monitors post-deployment health metrics and triggers automated rollback when SLOs are violated. Integrates with Prometheus alerting rules for real-time detection.

```python
"""deploy/health_monitor.py — Post-deployment health monitoring with automated rollback."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol

logger = logging.getLogger(__name__)


class RollbackStatus(str, Enum):
    """Status of a rollback operation."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_NEEDED = "not_needed"


@dataclass(frozen=True)
class SLOViolation:
    """Recorded SLO violation that triggered rollback consideration.

    Attributes:
        metric: The Prometheus metric name that violated its threshold.
        current_value: The observed value at violation time.
        threshold: The configured alerting threshold.
        duration_seconds: How long the violation persisted before triggering.
        window_minutes: The evaluation window for the SLO check.
    """
    metric: str
    current_value: float
    threshold: float
    duration_seconds: int
    window_minutes: int


@dataclass(frozen=True)
class HealthCheckResult:
    """Result of a single health check against a deployed service.

    Attributes:
        endpoint: The URL or path checked.
        http_status: HTTP status code returned (0 if unreachable).
        response_time_ms: Time taken for the request in milliseconds.
        passed: True when all health criteria are met.
    """
    endpoint: str
    http_status: int
    response_time_ms: float
    passed: bool


class HealthChecker(Protocol):
    """Protocol for checking service health endpoints."""

    def check_health(self, service_name: str) -> list[HealthCheckResult]: ...
    def check_slo_metrics(self, service_name: str, window_minutes: int = 5) -> list[SLOViolation]: ...


class PrometheusHealthChecker:
    """Checks service health by querying Prometheus for metrics and HTTP endpoints.

    Uses the Prometheus API to evaluate SLO conditions: error budget burn rate,
    p99 latency, and availability percentage. Also performs HTTP-level health
    check probing against the deployed /health endpoint.
    """

    def __init__(self, prometheus_url: str, timeout_seconds: float = 10.0) -> None:
        self.prometheus_url = prometheus_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def _query_prometheus(self, query: str) -> dict | list[dict]:  # type: ignore[type-arg]
        """Execute a PromQL query against the Prometheus API."""
        import urllib.request
        import json

        url = f"{self.prometheus_url}/api/v1/query?query={urllib.parse.quote(query)}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            data = json.loads(resp.read())

        if data.get("status") != "success":
            raise RuntimeError(f"Prometheus query failed: {data}")

        return data["data"]

    def check_health(self, service_name: str) -> list[HealthCheckResult]:
        """Check HTTP health and readiness endpoints for the service.

        Args:
            service_name: The Kubernetes service name to probe.

        Returns:
            List of health check results for each endpoint checked.
        """
        import urllib.request
        import urllib.error

        endpoints = ["/health", "/ready"]
        base_url = f"http://{service_name}"
        results: list[HealthCheckResult] = []

        for endpoint in endpoints:
            url = f"{base_url}{endpoint}"
            start = time.monotonic()
            try:
                req = urllib.request.Request(url, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                    status = resp.status
                    elapsed_ms = (time.monotonic() - start) * 1000

                results.append(HealthCheckResult(
                    endpoint=url,
                    http_status=status,
                    response_time_ms=round(elapsed_ms, 2),
                    passed=status == 200 and elapsed_ms < 500,
                ))
            except (urllib.error.URLError, TimeoutError) as e:
                results.append(HealthCheckResult(
                    endpoint=url,
                    http_status=0,
                    response_time_ms=round((time.monotonic() - start) * 1000, 2),
                    passed=False,
                ))
                logger.warning("Health check failed for %s: %s", url, e)

        return results

    def check_slo_metrics(self, service_name: str, window_minutes: int = 5) -> list[SLOViolation]:
        """Check SLO metrics via PromQL queries.

        Monitors error budget burn rate, p99 latency, and availability.
        Triggers on sustained violations for the evaluation window.

        Args:
            service_name: Service identifier matching Prometheus labels.
            window_minutes: Time window for SLO evaluation in minutes.

        Returns:
            List of SLO violations found (empty if all SLOs are met).
        """
        now = int(time.time())
        queries = {
            "error_rate": (
                f'sum(rate(http_requests_total{{service="{service_name}",'
                f'code=~"5.."}}[{window_minutes}m])) / '
                f'sum(rate(http_requests_total{{service="{service_name}"}}[{window_minutes}m]))'
            ),
            "p99_latency": (
                f'histogram_quantile(0.99, '
                f'sum(rate(http_request_duration_seconds_bucket{{service="{service_name}"}}'
                f'[{window_minutes}m])) by (le))'
            ),
            "availability": (
                f'(sum(rate(up{{service="{service_name}"}}[{window_minutes}m])) / '
                f'sum(1 - rate(up{{service="{service_name}"}}[{window_minutes}m])))'
            ),
        }

        violations: list[SLOViolation] = []
        thresholds = {
            "error_rate": 0.01,       # Error rate must be < 1%
            "p99_latency": 2.0,       # P99 latency must be < 2 seconds
            "availability": 0.99,     # Availability must be > 99.9% (inverted check below)
        }

        for metric_name, promql_query in queries.items():
            try:
                data = self._query_prometheus(promql_query)
                if not data.get("result"):
                    continue

                value = float(data["result"][0]["value"][1])
                threshold = thresholds[metric_name]

                # For availability, we invert the comparison since it's a ratio
                violated = False
                if metric_name == "availability":
                    violated = value < threshold  # Below threshold is bad
                else:
                    violated = value > threshold  # Above threshold is bad

                if violated:
                    violations.append(SLOViolation(
                        metric=metric_name,
                        current_value=round(value, 6),
                        threshold=threshold,
                        duration_seconds=window_minutes * 60,
                        window_minutes=window_minutes,
                    ))
                    logger.warning(
                        "SLO violation: %s = %.4f (threshold: %.4f)",
                        metric_name, value, threshold,
                    )

            except Exception as e:  # noqa: BLE001 — Prometheus query failures are non-fatal
                logger.error("Failed to check SLO metric %s: %s", metric_name, e)

        return violations


def monitor_deployment(
    checker: HealthChecker,
    service_name: str,
    max_check_cycles: int = 20,
    check_interval_seconds: float = 15.0,
    rollback_on_slo_violation: bool = True,
) -> RollbackStatus:
    """Monitor a deployment for health and SLO compliance over a defined window.

    Runs health checks at regular intervals. If health passes but SLOs are violated
    persistently, triggers rollback. Returns the final rollback status.

    Args:
        checker: HealthChecker implementation (e.g., PrometheusHealthChecker).
        service_name: Name of the deployed service to monitor.
        max_check_cycles: Maximum number of check cycles before declaring stable.
        check_interval_seconds: Time between health checks in seconds.
        rollback_on_slo_violation: If True, auto-rollback on persistent SLO violations.

    Returns:
        RollbackStatus indicating the outcome of monitoring.
    """
    consecutive_failures = 0
    slo_violations_consecutive = 0

    for cycle in range(1, max_check_cycles + 1):
        health_results = checker.check_health(service_name)
        all_health_passed = all(hp.passed for hp in health_results)

        if not all_health_passed:
            failed_endpoints = [f"{r.endpoint} ({r.http_status})" for r in health_results if not r.passed]
            logger.warning(
                "Health check cycle %d/%d FAILED — endpoints down: %s",
                cycle, max_check_cycles, ", ".join(failed_endpoints),
            )
            consecutive_failures += 1

            if consecutive_failures >= 2:
                logger.error("Persistent health failures — triggering rollback")
                return _execute_rollback(service_name)

        slo_violations = checker.check_slo_metrics(service_name)
        if slo_violations and rollback_on_slo_violation:
            for violation in slo_violations:
                logger.warning(
                    "SLO violation (cycle %d): %s=%.4f > %.4f over %dm",
                    cycle, violation.metric, violation.current_value,
                    violation.threshold, violation.window_minutes,
                )
            slo_violations_consecutive += 1

            if slo_violations_consecutive >= 3:
                logger.error("Persistent SLO violations — triggering rollback")
                return _execute_rollback(service_name)
        else:
            slo_violations_consecutive = 0

        healthy_services = sum(1 for r in health_results if r.passed)
        total_checks = len(health_results) if health_results else 1
        logger.info(
            "Health check cycle %d/%d — %d/%d endpoints healthy",
            cycle, max_check_cycles, healthy_services, total_checks,
        )

        if consecutive_failures == 0 and slo_violations_consecutive == 0:
            time.sleep(check_interval_seconds)

    logger.info("Monitoring window complete — deployment appears stable")
    return RollbackStatus.NOT_NEEDED


def _execute_rollback(service_name: str) -> RollbackStatus:
    """Execute the rollback procedure for a service.

    In production, this calls Kubernetes APIs or Helm to revert to the previous
    revision. For demonstration, it logs the rollback action and returns success.

    Args:
        service_name: The service to roll back.

    Returns:
        RollbackStatus indicating rollback outcome.
    """
    logger.info("Executing rollback for %s — reverting to last stable revision", service_name)
    # In production, this would be:
    #   kubectl rollout undo deployment/{service_name} -n production
    #   or Helm: helm upgrade --install {name} ./chart --set image.tag={prev_tag}
    return RollbackStatus.COMPLETED
```

---

## Constraints

### MUST DO
- Design every CI pipeline with explicit failure gates — lint must pass before tests run, tests must pass before build runs, and builds must pass before deployment proceeds
- Enforce code coverage thresholds as a merge-blocking quality gate using `--cov-fail-under` in pytest configuration
- Use disposable infrastructure for integration tests — spin up containers per test run, never reuse shared databases between CI jobs
- Store all pipeline secrets in a vault (SOPS with age keys, HashiCorp Vault, or AWS Secrets Manager) and inject them as environment variables at runtime — never commit secrets to source control
- Implement automated rollback triggers based on post-deployment health metrics — if error rate exceeds the threshold for more than N minutes, automatically revert to the previous stable revision
- Inject structured JSON logging and OpenTelemetry tracing into every service before it reaches production; plain text logging in containers is a release blocker
- Tag every production deployment with a git tag matching semantic versioning (MAJOR.MINOR.PATCH) and maintain a structured deploy log recording version, timestamp, commit SHA, and rollback status

### MUST NOT DO
- Never skip tests or lint stages to "save time" — this creates technical debt that compounds across releases and causes outages in production
- Never deploy directly to production from the merge queue — always promote through staging first with automated smoke tests validating the build artifact
- Never use hardcoded credentials, API keys, or tokens in pipeline configuration files — any secret visible in a CI log must be considered compromised
- Never disable canary analysis or blue-green promotion gates for "urgent" hotfixes — safe deployment patterns are non-negotiable even under pressure
- Never mix development and production infrastructure in the same cluster without explicit namespace isolation and network policies
- Never allow merge requests with failing required status checks — branch protection rules must be enforced programmatically, not relied upon human discipline

---

## Output Template

When implementing or reviewing a software development workflow, produce:

1. **Pipeline Architecture Diagram** — ASCII flow showing each stage (commit → lint → test → build → security scan → deploy-staging → canary-analysis → promote-production) with explicit failure paths and rollback triggers between stages
2. **Pipeline Configuration Files** — Complete `.github/workflows/ci.yml` (or equivalent) with all stages, environment variables, secrets references, caching configuration, and deployment steps using the patterns shown above
3. **Quality Gate Report** — Structured output listing each quality tool executed (ruff, mypy, bandit), findings count by severity, pass/fail status, and specific file:line references for any violations that would block the merge
4. **Deployment Strategy Document** — Description of the deployment pattern used (blue-green / canary / feature flags), rollback criteria with exact metric thresholds and duration windows, and the automated rollback procedure including relevant Kubernetes commands
5. **Observability Integration Checklist** — List of health endpoints exposed (`/health`, `/ready`), metrics registered (Prometheus counters/histograms for request rate, error rate, latency), tracing spans configured, and alert rules defined with their thresholds

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-test-driven-development` | TDD discipline and red-green-refactor cycle that drives test-first development within the pipeline |
| `coding-code-review` | Pull request review process and quality feedback that complements automated CI gates |
| `coding-security-review` | In-depth security vulnerability analysis for code reviews and dependency audits |
| `coding-performance-optimization` | Performance profiling and optimization patterns to ensure deployments meet latency SLOs |
| `coding-observability-patterns` | Deep observability integration with distributed tracing, log correlation, and SLO dashboarding |

---

## Live References

> Authoritative documentation links for modern software development workflows. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Best Practices](https://docs.docker.com/build/compare/tutorials/)
- [Kubernetes Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [OpenTelemetry Instrumentation](https://opentelemetry.io/docs/languages/python/instrumenting/)
- [Argo Rollouts Canary Deployments](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [pytest-cov Coverage Configuration](https://pytest-cov.readthedocs.io/en/latest/config.html)
- [Snyk Security Scanning for CI/CD](https://docs.snyk.io/integrations/ci-cd-integrations)
