---
name: software-delivery-pipelines
description: Implements CI/CD pipelines with build automation, test orchestration,
  blue-green/canary deployments, artifact management, and environment promotion for
  reliable software delivery.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: CI/CD pipeline, continuous integration, continuous deployment, deployment
    strategy, blue-green deployment, canary release, how do i set up CI/CD
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
  - config
  - do-dont
  - examples
  related-skills: secure-release-pipeline, test-driven-development, semver-automation,
    git-branching-strategies, python-package-publishing, javascript-package-workflows
---
# Software Delivery Pipeline Manager

Implements CI/CD pipeline patterns including build automation, test orchestration, deployment strategies (blue-green, canary, rolling), artifact management, and environment promotion to move code reliably from commit to production.

## TL;DR Checklist

- [ ] Define all stages: build → test → deploy with explicit success criteria per stage
- [ ] Configure parallel test execution with caching for sub-10-minute feedback loops
- [ ] Select deployment strategy matching risk tolerance (blue-green, canary, or rolling)
- [ ] Set up environment promotion gates with manual approval for production
- [ ] Pin all tool versions and container base images in pipeline definitions
- [ ] Implement artifact retention policy (e.g., 90 days, max 100 builds)
- [ ] Ensure every deploy produces an auditable record: commit SHA, artifacts, timestamp

---

## When to Use

Use this skill when:

- Designing a new CI/CD pipeline from scratch for a project or service
- Migrating from manual or ad-hoc deployments to an automated pipeline
- Adding deployment strategies (blue-green, canary) to an existing pipeline
- Setting up environment promotion workflows (dev → staging → prod) with quality gates
- Implementing artifact management and build caching for faster pipelines
- Troubleshooting slow pipelines and optimizing build/test execution times
- Integrating infrastructure-as-code into the deployment flow

---

## When NOT to Use

Avoid this skill for:

- Writing application logic or business domain code (use `software-design-principles` instead)
- Designing system architecture patterns like hexagonal, layered, or event-driven (use `software-architecture`)
- Adding security scanning, CVE checks, or quality gates specifically — use `secure-release-pipeline` instead
- Prototyping throwaway branches with no intention of merging to main
- One-off manual deployments where pipeline overhead outweighs benefits

---

## Core Workflow

1. **Define Pipeline Stages** — Map the code lifecycle: checkout → build → test → package → deploy. Each stage must have explicit pass/fail criteria.
   **Checkpoint:** Every stage exits non-zero on failure, causing the pipeline to halt immediately.

2. **Configure Build Automation** — Set up dependency caching, parallel compilation, and artifact generation. Pin tool versions in a lockfile or explicit version field.
   **Checkpoint:** Build time is measured and targeted under 5 minutes for the build stage alone.

3. **Orchestrate Tests** — Organize tests into tiers (unit → integration → e2e) with parallel execution within each tier. Use cached dependency layers and test result aggregation.
   **Checkpoint:** Unit tests complete in under 3 minutes; total pipeline feedback loop stays under 10 minutes.

4. **Package and Push Artifacts** — Build container images or binaries, tag them with the commit SHA and semantic version, push to a registry or artifact repository.
   **Checkpoint:** Artifact tags are immutable once pushed; the same tag always refers to the same build.

5. **Promote Through Environments** — Deploy to dev → staging → production with manual approval gates between stages. Each environment must validate health checks before promotion.
   **Checkpoint:** Production deployment requires explicit human approval and a documented change record.

6. **Execute Deployment Strategy** — Apply the chosen strategy (blue-green, canary, or rolling) based on risk profile and team maturity.
   **Checkpoint:** Automated rollback triggers if error rate exceeds threshold during or after deployment.

7. **Record and Monitor** — Log every deployment event with commit SHA, artifact version, deployer, and timestamps. Feed metrics into dashboards for trend analysis.

---

## Implementation Patterns / Reference Guide

### Pattern 1: GitHub Actions CI/CD Pipeline

A comprehensive multi-stage pipeline that covers build, test, package, and deploy to a staging environment. This example uses Python but the structure applies to any language.

```yaml
# .github/workflows/ci-cd-pipeline.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  PYTHON_VERSION: "3.12"
  CACHE_KEY_PREFIX: v1

jobs:
  # ── Stage 1: Build ──────────────────────────────────────
  build:
    name: Build & Test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for semver extraction

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"
          cache-dependency-path: "requirements.txt"

      - name: Cache dependencies
        uses: actions/cache@v4
        id: dep-cache
        with:
          path: ~/.cache/pip
          key: ${{ env.CACHE_KEY_PREFIX }}-${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
          restore-keys: |
            ${{ env.CACHE_KEY_PREFIX }}-${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

      - name: Lint with ruff
        uses: astral-sh/ruff-action@v2
        with:
          args: "check --exit-non-zero-on-fix"

      # ── Stage 2: Test (parallel tiers) ────────────────────
      - name: Run unit tests
        run: |
          pytest tests/unit/ \
            --cov=src \
            --cov-report=xml \
            --junitxml=test-results/unit.xml \
            -v

      - name: Run integration tests
        run: |
          pytest tests/integration/ \
            --junitxml=test-results/integration.xml \
            -v

    # ── Stage 3: Package ──────────────────────────────────
      - name: Build container image
        if: github.ref == 'refs/heads/main'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Stage 4: Deploy to Staging (auto) ───────────────────
  deploy-staging:
    name: Deploy to Staging
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to staging via Helm
        run: |
          helm upgrade --install app ./charts/app \
            --namespace=staging \
            --set image.tag=${{ github.sha }} \
            --set strategy.type=blue-green \
            --wait --timeout=300s

      - name: Health check
        run: |
          for i in $(seq 1 12); do
            if curl -sf https://staging.example.com/health > /dev/null; then
              echo "Health check passed"
              exit 0
            fi
            sleep 5
          done
          echo "Health check failed after 60 seconds"
          exit 1

  # ── Stage 5: Deploy to Production (manual approval) ────
  deploy-production:
    name: Deploy to Production
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production  # requires manual approval via GitHub Environments

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production with canary strategy
        run: |
          helm upgrade --install app ./charts/app \
            --namespace=production \
            --set image.tag=${{ github.sha }} \
            --set strategy.type=canary \
            --set canary.weight=10 \
            --wait --timeout=300s

      - name: Canary smoke tests
        run: |
          pytest tests/smoke/ -v || { echo "Canary smoke tests failed"; exit 1; }

      - name: Promote canary to full rollout
        if: success()
        run: |
          helm upgrade --install app ./charts/app \
            --namespace=production \
            --set image.tag=${{ github.sha }} \
            --set strategy.type=blue-green \
            --wait --timeout=600s

      - name: Rollback on failure
        if: failure()
        run: |
          helm rollback app 1 -n production
          echo "Production deployment rolled back" >> "$GITHUB_STEP_SUMMARY"
```

---

### Pattern 2: Blue-Green Deployment (BAD vs. GOOD)

Blue-green deployment swaps traffic between two identical environments. The key is atomic switching and verified rollback capability.

```python
# ──────────────────────────────────────────────────────────────
# ❌ BAD: Fragile blue-green with no health verification before swap
# ──────────────────────────────────────────────────────────────
def bad_blue_green_deploy(
    new_version: str,
    current_env: dict,
) -> None:
    """Fragile deployment — swaps without verifying the new environment is healthy."""

    # Deploy to inactive environment (green)
    deploy_to_environment(current_env["inactive"], new_version)

    # Immediate traffic swap — if green is broken, users see it instantly
    switch_traffic(current_env["active"], current_env["inactive"])

    current_env["active"] = current_env["inactive"]  # swap roles


# ──────────────────────────────────────────────────────────────
# ✅ GOOD: Verified blue-green with health checks and atomic rollback
# ──────────────────────────────────────────────────────────────
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class HealthStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class DeploymentResult:
    success: bool
    strategy: str
    previous_version: Optional[str] = None
    new_version: Optional[str] = None
    health_checks_passed: bool = False
    rolled_back: bool = False

    def to_summary(self) -> str:
        status = "SUCCESS" if self.success else "FAILED"
        if self.rolled_back:
            status += " (ROLLED BACK)"
        return f"[{status}] {self.strategy}: {self.previous_version} → {self.new_version} | Health: {'PASS' if self.health_checks_passed else 'FAIL'}"


class BlueGreenDeployer:
    """Blue-green deployment with health verification and automatic rollback."""

    def __init__(
        self,
        registry: str = "ghcr.io",
        health_endpoint: str = "/healthz",
        max_health_check_attempts: int = 12,
        health_check_interval_seconds: int = 5,
        error_rate_threshold: float = 0.05,
    ):
        self.registry = registry
        self.health_endpoint = health_endpoint
        self.max_health_check_attempts = max_health_check_attempts
        self.health_check_interval = health_check_interval_seconds
        self.error_rate_threshold = error_rate_threshold

    def deploy(
        self,
        app_name: str,
        target_namespace: str,
        new_version: str,
        previous_version: Optional[str] = None,
    ) -> DeploymentResult:
        """Execute a blue-green deployment with full health verification.

        Args:
            app_name: Application name for kubectl/helm references
            target_namespace: Kubernetes namespace (staging or production)
            new_version: Container image tag for the new version
            previous_version: The currently running version (for rollback reference)

        Returns:
            DeploymentResult with status and details
        """
        inactive_env = f"{app_name}-green" if previous_version else f"{app_name}-blue"

        # Step 1: Deploy new version to inactive environment
        self._deploy_to_inactive(inactive_env, target_namespace, new_version)

        # Step 2: Verify health of new environment
        healthy = self._verify_health(inactive_env, target_namespace)
        if not healthy:
            return DeploymentResult(
                success=False,
                strategy="blue-green",
                previous_version=previous_version,
                new_version=new_version,
                rolled_back=True,
            )

        # Step 3: Atomic traffic switch
        self._switch_traffic(app_name, inactive_env)

        # Step 4: Verify error rate after switch
        if not self._verify_error_rate(app_name):
            self._rollback(app_name, target_namespace, previous_version)
            return DeploymentResult(
                success=False,
                strategy="blue-green",
                previous_version=previous_version,
                new_version=new_version,
                rolled_back=True,
            )

        return DeploymentResult(
            success=True,
            strategy="blue-green",
            previous_version=previous_version,
            new_version=new_version,
            health_checks_passed=True,
        )

    def _deploy_to_inactive(self, env_name: str, namespace: str, version: str) -> None:
        """Deploy the new version to the inactive environment."""
        # In practice this calls helm or kubectl
        print(f"Deploying {version} to {env_name} in {namespace}")
        # kubectl set image deployment/{env_name} app={self.registry}/{app_name}:{version} -n {namespace}

    def _verify_health(self, env_name: str, namespace: str) -> bool:
        """Run health checks on the new environment before switching traffic."""
        for attempt in range(1, self.max_health_check_attempts + 1):
            status = self._get_health_status(env_name, namespace)
            if status == HealthStatus.HEALTHY:
                print(f"Health check passed (attempt {attempt})")
                return True
            print(f"Health check attempt {attempt}/{self.max_health_check_attempts}: {status.value}")
            time.sleep(self.health_check_interval)
        return False

    def _get_health_status(self, env_name: str, namespace: str) -> HealthStatus:
        """Simulate health check — replace with actual HTTP probe or k8s readiness."""
        # In practice: curl -sf http://{env_name}.{namespace}/healthz
        import random
        return HealthStatus.HEALTHY if random.random() > 0.3 else HealthStatus.UNHEALTHY

    def _switch_traffic(self, app_name: str, new_env: str) -> None:
        """Atomically switch service selector to point at the new environment."""
        print(f"Switching traffic for {app_name} → {new_env}")
        # kubectl patch service/{app_name} -p '{"spec":{"selector":{"version": "{new_env}"}}}'

    def _verify_error_rate(self, app_name: str) -> bool:
        """Check that error rate stays below threshold after deployment."""
        # In practice: query Prometheus for 5xx error rate in last 60 seconds
        current_error_rate = 0.02  # simulated
        print(f"Error rate check: {current_error_rate:.4f} (threshold: {self.error_rate_threshold})")
        return current_error_rate < self.error_rate_threshold

    def _rollback(self, app_name: str, namespace: str, version_to_restore: Optional[str]) -> None:
        """Roll back to the previous version."""
        if not version_to_restore:
            print(f"⚠  No previous version known for rollback of {app_name}")
            return
        print(f"Rolling back {app_name} in {namespace} → {version_to_restore}")
        # kubectl set image deployment/{app_name} app={self.registry}/{app_name}:{version_to_restore} -n {namespace}


# ── Usage example ─────────────────────────────────────────────

if __name__ == "__main__":
    deployer = BlueGreenDeployer(
        health_endpoint="/healthz",
        max_health_check_attempts=12,
        error_rate_threshold=0.05,
    )

    result = deployer.deploy(
        app_name="my-service",
        target_namespace="production",
        new_version="sha-a1b2c3d",
        previous_version="sha-9e8f7g6",
    )

    print(result.to_summary())
    # Example output: [SUCCESS] blue-green: sha-9e8f7g6 → sha-a1b2c3d | Health: PASS
```

---

### Pattern 3: Canary Deployment with Gradual Traffic Shifting

Canary deployments roll out to a small percentage of users first, then gradually increase traffic based on error metrics.

```yaml
# ──────────────────────────────────────────────
# Kubernetes manifest for canary deployment strategy
# ──────────────────────────────────────────────
# charts/app/templates/canary-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-canary
  namespace: production
  labels:
    app: my-service
    track: canary
spec:
  replicas: 2  # Small subset of total traffic
  selector:
    matchLabels:
      app: my-service
      track: canary
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime guaranteed
  template:
    metadata:
      labels:
        app: my-service
        track: canary
        version: {{ .Values.image.tag }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
        - name: app
          image: "{{ .Values.registry }}/my-service:{{ .Values.image.tag }}"
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
---
# Service routes traffic based on weight labels
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    app: my-service  # Matches both stable and canary pods
  ports:
    - port: 80
      targetPort: 8080
---
# Istio VirtualService for weighted traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
    - my-service.example.com
  http:
    - route:
        # Start with 90/10 split, gradually shift to 100% canary
        - destination:
            host: my-service
            subset: stable
          weight: 90
        - destination:
            host: my-service
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service
  subsets:
    - name: stable
      labels:
        track: stable
    - name: canary
      labels:
        track: canary
```

**Gradual promotion schedule (managed by CI/CD):**

```yaml
# .github/workflows/canary-promotion.yml
name: Canary Promotion Pipeline

on:
  workflow_dispatch:  # Manual trigger for each stage
  schedule:
    - cron: "0 */2 * * *"  # Auto-advance every 2 hours during promotion

env:
  CANARY_STAGES: |
    {"name": "initial", "canary_weight": 5, "duration_minutes": 15}
    {"name": "early_adopters", "canary_weight": 20, "duration_minutes": 30}
    {"name": "partial", "canary_weight": 50, "duration_minutes": 60}
    {"name": "full", "canary_weight": 100, "duration_minutes": 0}

jobs:
  promote-canary:
    name: Promote Canary ${{ matrix.stage.name }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - stage: initial
            weight: 5
            duration: 15
          - stage: early_adopters
            weight: 20
            duration: 30
          - stage: partial
            weight: 50
            duration: 60
          - stage: full
            weight: 100
            duration: 0

    steps:
      - name: Update canary traffic weight
        run: |
          # Patch Istio VirtualService to adjust weights
          CURRENT_STABLE=$(( 100 - ${{ matrix.weight }} ))
          kubectl patch virtualservice my-service \
            -n production \
            --type='merge' \
            -p="{\"spec\":{\"http\":[{\"route\":[{\"destination\":{\"host\":\"my-service\",\"subset\":\"stable\"},\"weight\":${CURRENT_STABLE}},{\"destination\":{\"host\":\"my-service\",\"subset\":\"canary\"},\"weight\":${{ matrix.weight }}}]}]}"

      - name: Monitor error rate during promotion
        if: ${{ matrix.weight < 100 }}
        run: |
          # Check Prometheus for error rate in the canary subset
          PROMQL='sum(rate(http_requests_total{status=~"5..",subset="canary"}[2m])) / sum(rate(http_requests_total{subset="canary"}[2m]))'
          ERROR_RATE=$(curl -sf "http://prometheus:9090/api/v1/query?query=${PROMQL}" | jq '.data.result[0].value[1]')

          THRESHOLD=0.05  # 5% error rate threshold
          if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
            echo "❌ Error rate ${ERROR_RATE} exceeds threshold ${THRESHOLD} — halting promotion"
            exit 1
          fi
          echo "✅ Error rate ${ERROR_RATE} within threshold"

      - name: Wait for monitoring period
        if: ${{ matrix.weight < 100 && matrix.duration > 0 }}
        run: |
          echo "Waiting ${{ matrix.duration }} minutes for monitoring..."
          sleep $(( ${{ matrix.duration }} * 60 ))

      - name: Log promotion event
        run: |
          echo "Canary promoted to ${{ matrix.stage.name }} (${{ matrix.weight }}% traffic)" \
            >> "$GITHUB_STEP_SUMMARY"
```

---

### Pattern 4: Docker Build with Multi-Stage Builds and Layer Caching

Efficient container builds reduce pipeline time and minimize artifact size.

```dockerfile
# ──────────────────────────────────────────────
# Dockerfile — multi-stage build for Python service
# ──────────────────────────────────────────────
FROM python:3.12-slim AS base

# Install system dependencies only once
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Stage 1: Dependencies (cached independently) ──
FROM base AS deps

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 2: Build ──
FROM deps AS build

COPY pyproject.toml .
COPY src/ ./src/
COPY tests/ ./tests/

# Run linter and tests in the build stage (fail fast)
RUN pip install ruff pytest pytest-cov && \
    ruff check src/ && \
    pytest tests/unit/ --tb=short -q

# ── Stage 3: Production — minimal image ──
FROM python:3.12-slim AS production

LABEL org.opencontainers.image.source="https://github.com/${IMAGE_OWNER}/${IMAGE_REPO}"
LABEL org.opencontainers.image.description="Production runtime"

WORKDIR /app

# Copy only built application and dependencies (not test files)
COPY --from=deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY --from=build /app/src/ ./src/
COPY --from=build /app/pyproject.toml ./

RUN useradd --create-home appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8080/healthz || exit 1

CMD ["python", "-m", "src.main"]
```

---

### Pattern 5: Environment Promotion Flow with Quality Gates

A Python model for managing environment promotion from dev through staging to production.

```python
"""
Environment Promotion Manager

Manages the flow of artifacts through environments (dev → staging → prod)
with quality gates between each stage. Follows the principle that every
deployment must be traceable back to a single immutable artifact.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Callable
from datetime import datetime


class Environment(Enum):
    DEV = "dev"
    STAGING = "staging"
    PRODUCTION = "production"


class GateResult(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"  # Not applicable for this environment transition


class PromotionStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DEPLOYED = "deployed"
    ROLLED_BACK = "rolled_back"
    BLOCKED = "blocked"


@dataclass
class Artifact:
    """Immutable build artifact — once created, cannot be modified."""
    id: str
    commit_sha: str
    version: str
    image_tag: str
    built_at: datetime
    metadata: dict = field(default_factory=dict)

    @property
    def name(self) -> str:
        return f"{self.image_tag}"


@dataclass
class QualityGate:
    """A quality gate that must pass before promotion."""
    name: str
    required_for: List[Environment]
    check_fn: Callable[[Artifact], bool]

    def evaluate(self, artifact: Artifact) -> GateResult:
        return GateResult.PASS if self.check_fn(artifact) else GateResult.FAIL


class EnvironmentPromoter:
    """Manages environment promotion with configurable quality gates.

    Flow: dev (auto) → staging (auto after gate) → production (manual + gate)

    Example usage:
        promoter = EnvironmentPromoter()
        artifact = Artifact("build-123", "abc123", "v1.2.3", "ghcr.io/app:v1.2.3")
        promotion = promoter.promote(artifact, Environment.PRODUCTION)
    """

    def __init__(self):
        self.gates: List[QualityGate] = [
            QualityGate("unit-tests-pass", [Environment.DEV, Environment.STAGING, Environment.PRODUCTION],
                        lambda a: True),  # Replace with actual test status check
            QualityGate("lint-clean", [Environment.DEV, Environment.STAGING, Environment.PRODUCTION],
                        lambda a: True),
            QualityGate("security-scan-clean", [Environment.STAGING, Environment.PRODUCTION],
                        lambda a: True),
            QualityGate("integration-tests-pass", [Environment.STAGING, Environment.PRODUCTION],
                        lambda a: True),
            QualityGate("smoke-tests-pass", [Environment.PRODUCTION],
                        lambda a: True),
            QualityGate("manual-approval", [Environment.PRODUCTION],
                        lambda a: True),  # Replaced by explicit approval call
        ]

    def promote(
        self,
        artifact: Artifact,
        target_env: Environment,
        approver: Optional[str] = None,
        previous_artifact: Optional[Artifact] = None,
    ) -> dict:
        """Promote an artifact to the target environment.

        Args:
            artifact: The build artifact to deploy
            target_env: Target environment
            approver: Required for production deployments
            previous_artifact: Currently running version (for rollback tracking)

        Returns:
            Promotion result dict with status, gates evaluated, and actions taken
        """
        history = self._get_deployment_history()

        # Determine required gates for this transition
        prev_env = self._current_environment(artifact.commit_sha, history)
        required_gates = [
            g for g in self.gates
            if target_env in g.required_for
        ]

        # Evaluate all gates
        gate_results = {}
        for gate in required_gates:
            result = gate.evaluate(artifact)
            gate_results[gate.name] = result

        blocked_gates = [name for name, result in gate_results.items() if result == GateResult.FAIL]

        if blocked_gates:
            return {
                "status": PromotionStatus.BLOCKED.value,
                "artifact": artifact.name,
                "target_env": target_env.value,
                "blocked_by": blocked_gates,
                "gates": gate_results,
            }

        # Production requires explicit human approval
        if target_env == Environment.PRODUCTION and not approver:
            return {
                "status": PromotionStatus.PENDING.value,
                "artifact": artifact.name,
                "target_env": target_env.value,
                "requires_approval": True,
                "message": "Production deployment requires manual approval",
            }

        # Execute deployment
        self._execute_deploy(artifact, target_env)
        self._record_deployment(artifact, target_env, approver, previous_artifact)

        return {
            "status": PromotionStatus.DEPLOYED.value,
            "artifact": artifact.name,
            "target_env": target_env.value,
            "deployed_by": approver or "pipeline",
            "gates_passed": list(gate_results.keys()),
            "deployed_at": datetime.now().isoformat(),
        }

    def rollback(self, env: Environment, artifact: Artifact) -> dict:
        """Roll back to the previous artifact in the given environment."""
        history = self._get_deployment_history()
        prev_artifact = self._find_previous_version(env, artifact.commit_sha, history)

        if not prev_artifact:
            return {"status": "error", "message": f"No previous version found for {env.value}"}

        self._execute_deploy(prev_artifact, env)
        self._record_deployment(prev_artifact, env, approver="rollback-automation")

        return {
            "status": PromotionStatus.ROLLED_BACK.value,
            "environment": env.value,
            "from_version": artifact.name,
            "to_version": prev_artifact.name,
        }

    def _execute_deploy(self, artifact: Artifact, env: Environment) -> None:
        """Execute the actual deployment (calls helm/kubectl)."""
        print(f"Deploying {artifact.name} to {env.value}")
        # In practice: kubectl set image deployment/app app={artifact.image_tag} -n {env.value}

    def _record_deployment(
        self, artifact: Artifact, env: Environment, approver: str, previous: Optional[Artifact] = None
    ) -> None:
        """Record the deployment event for audit trail."""
        print(f"Recorded: {artifact.name} → {env.value} by {approver}")

    def _get_deployment_history(self) -> list:
        return []

    def _current_environment(self, commit_sha: str, history: list) -> Environment:
        return Environment.DEV

    def _find_previous_version(self, env: Environment, current_sha: str, history: list) -> Optional[Artifact]:
        return None


# ── Example promotion flow ────────────────────────────────
if __name__ == "__main__":
    promoter = EnvironmentPromoter()

    artifact = Artifact(
        id="build-456",
        commit_sha="def789",
        version="v2.1.0",
        image_tag="ghcr.io/myorg/myapp:v2.1.0",
        built_at=datetime.now(),
    )

    # 1. Dev deployment — automatic
    dev_result = promoter.promote(artifact, Environment.DEV)
    print(f"Dev: {dev_result['status']}")

    # 2. Staging deployment — automatic after gates pass
    staging_result = promoter.promote(artifact, Environment.STAGING)
    print(f"Staging: {staging_result['status']}")

    # 3. Production deployment — requires approver
    prod_pending = promoter.promote(artifact, Environment.PRODUCTION)
    if prod_pending["requires_approval"]:
        print(f"Pending approval for production ({prod_pending['artifact']})")
        # In real implementation: send Slack/Teams notification, wait for human click

    prod_result = promoter.promote(artifact, Environment.PRODUCTION, approver="alice@company.com")
    print(f"Production: {prod_result['status']}")
```

---

## Constraints

### MUST DO
- Pin all tool versions, base images, and action references to specific versions or SHA hashes — never use `latest` or untagged references in production pipelines
- Ensure every stage has explicit success/fail criteria; a pipeline must never pass with partial failures (e.g., lint warnings should not mask test failures)
- Run tests in parallel within each tier to achieve sub-10-minute total feedback loops
- Tag container images and artifacts with both the commit SHA and semantic version for full traceability
- Require manual approval gates before any production deployment, documented via environment protection rules (GitHub Environments, GitLab Protected Environments)
- Implement automated rollback triggered by error rate thresholds or health check failures after deployment
- Retain build artifacts per a defined policy (e.g., last 100 builds or 90 days — whichever is longer)
- Log every deployment event with commit SHA, artifact version, deployer identity, and timestamp for audit compliance

### MUST NOT DO
- Hardcode secrets in pipeline YAML files; use secret managers (GitHub Secrets, AWS Secrets Manager, HashiCorp Vault)
- Skip or bypass any quality gate stage — automation must enforce completeness, not convenience
- Deploy the same artifact version to two environments simultaneously without version differentiation in deployment records
- Use shell scripts as the primary orchestration mechanism in CI/CD; prefer native pipeline actions (GitHub Actions steps, GitLab CI jobs, Jenkins declarative stages)
- Enable automatic production promotion without human approval — this is the single most common cause of uncontrolled production incidents
- Mix artifact building and deployment in a single step; keep build (immutable) separate from deploy (stateful)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `secure-release-pipeline` | Security gates, CVE scanning, and quality checks integrated into the pipeline flow |
| `test-driven-development` | Test-first practices that produce the unit and integration tests orchestrated by CI pipelines |
| `semver-automation` | Semantic versioning and changelog automation used in artifact tagging |
| `git-branching-strategies` | Branch models (GitHub Flow, GitFlow) that determine pipeline trigger conditions |

---

> 📖 skill(local cache): secure-release-pipeline, test-driven-development, semver-automation, git-branching-strategies
