---
name: ci-cd-pipeline-design
description: Implements modern CI/CD pipeline architectures (GitHub Actions, GitLab CI, ArgoCD) with security gates, artifact management, and zero-downtime deployment strategies for production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: CI/CD pipeline, continuous integration, continuous deployment, github actions, gitlab ci, build automation, artifact management, security scanning, canary deployment, blue-green deployment, SLSA provenance, container registry, ArgoCD, Helm charts
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - quick hack
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: platform-engineering, iac-engineering, secure-release-pipeline, production-readiness
---

# CI/CD Pipeline Design

Implements end-to-end continuous integration and delivery pipelines that automate building, testing, security scanning, and deploying software with zero-downtime strategies and verifiable supply chain provenance.

## TL;DR Checklist

- [ ] Define pipeline stages: source → build → test → scan → package → deploy
- [ ] Use reusable workflow templates or composite actions to eliminate duplication
- [ ] Inject secrets via OIDC federation or secret stores — never in plaintext
- [ ] Generate SBOM and SLSA provenance for every artifact
- [ ] Implement deployment gates with automated rollback on failure
- [ ] Cache dependencies and build artifacts to reduce execution time

---

## When to Use

- Designing a new CI/CD pipeline from scratch for a monorepo or polyrepo
- Migrating legacy shell-based builds to modern YAML-driven pipelines
- Adding security scanning (SAST, DAST, dependency audit) to an existing pipeline
- Implementing zero-downtime deployment strategies (canary, blue-green, rolling)
- Enforcing supply chain security with SBOM generation and provenance attestation

---

## When NOT to Use

- For infrastructure provisioning — use `iac-engineering` instead
- For runtime monitoring or observability setup — use `production-readiness` instead
- For platform engineering decisions (IDP, golden paths) — use `platform-engineering` instead

---

## Core Workflow

1. **Map Pipeline Stages** — Define the sequential phases: Source Control → Build/Compile → Test (unit/integration/e2e) → Security Scan → Package/Registry → Deploy (staging → production).
   **Checkpoint:** Each stage must be independent and idempotent. A failure in one stage aborts downstream stages immediately.

2. **Configure CI Engine** — Select the runner technology (GitHub Actions, GitLab CI, Jenkins declarative pipelines) and define parallel execution for test suites and build matrices. Use self-hosted runners for sensitive workloads or GPU workloads.
   **Checkpoint:** Runner isolation is enforced — each job runs in a fresh container or VM with no state leakage between executions.

3. **Implement Security Gates** — Insert static analysis (SAST), dependency vulnerability scanning (SCA), and container image scanning into the pipeline before deployment. Block promotion to production if critical/high vulnerabilities are detected.
   **Checkpoint:** Security scan results must be stored as pipeline artifacts for audit trails. No bypass tokens exist in the repo.

4. **Package and Attest** — Build container images or binary artifacts, push to a private registry with access controls, generate CycloneDX/SPDX SBOM, and sign artifacts using cosign or sigstore. Attach SLSA provenance attestation.
   **Checkpoint:** Artifact digests are immutable. The deployment stage references the digest, not a mutable tag.

5. **Deploy with Zero-Downtime Strategy** — Route traffic through a canary analysis or blue-green switch managed by ArgoCD, Flagger, or custom automation. Monitor error rates and latency before full promotion.
   **Checkpoint:** Automated rollback triggers on SLI/SLO violations (error rate > 1%, p95 latency > 500ms) within 60 seconds of detection.

---

## Implementation Patterns

### Pattern 1: GitHub Actions Reusable Workflow with Security Gates

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  id-token: write        # For OIDC token-based registry auth
  security-events: write # For SARIF upload

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npm test -- --coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4

  security-scan:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  package-and-attest:
    needs: security-scan
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build and push container image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: registry.example.com/app:${{ github.sha }}
          sbom: true
          provenance: mode=max
      - name: Attest artifact with cosign
        uses: sigstore/cosign-installer@v3.6.0
        with:
          cosign-release: 'v2.4.0'
      - run: |
          cosign sign --yes registry.example.com/app@${{ github.sha }}

  deploy-production:
    needs: package-and-attest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy via ArgoCD
        run: |
          argocd app set myapp --revision ${{ github.sha }}
          argocd app sync myapp --wait
```

### Pattern 2: Canary Deployment with Automated Rollback

```python
import requests
import time
from dataclasses import dataclass
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"

@dataclass
class CanaryMetrics:
    error_rate: float
    p95_latency_ms: float
    requests_count: int

def evaluate_canary_release(
    canary_url: str,
    prod_url: str,
    threshold_error_rate: float = 0.01,
    threshold_latency_ms: float = 500,
    evaluation_interval: int = 30,
    max_evaluations: int = 20
) -> HealthStatus:
    """Evaluate canary deployment health and return current status.
    
    Performs rolling comparisons between canary and production metrics.
    Triggers rollback if SLI/SLO thresholds are violated consistently.
    """
    consecutive_failures = 0
    
    for i in range(max_evaluations):
        try:
            # Sample both canary and production endpoints
            canary_resp = requests.get(f"{canary_url}/health", timeout=5)
            prod_resp = requests.get(prod_url, timeout=5)
            
            # Extract metrics from response headers or health endpoint
            canary_error_rate = float(canary_resp.headers.get("X-Error-Rate", 0))
            canary_p95 = float(canary_resp.headers.get("X-P95-Latency-Ms", 0))
            
            if canary_error_rate > threshold_error_rate:
                consecutive_failures += 1
            elif canary_p95 > threshold_latency_ms:
                consecutive_failures += 1
            else:
                consecutive_failures = 0
            
            if consecutive_failures >= 3:
                print("Canary SLI violation detected — initiating rollback")
                return HealthStatus.FAILED
                
            time.sleep(evaluation_interval)
            
        except requests.RequestException as exc:
            print(f"Health check failed: {exc}")
            return HealthStatus.FAILED
    
    return HealthStatus.HEALTHY

def promote_canary_to_production():
    """Switch traffic from canary to full production after successful evaluation."""
    print("Canary metrics stable — promoting 100% to production")
```

---

## Constraints

### MUST DO
- Use OIDC federation for cloud provider authentication instead of long-lived credentials
- Pin all action and base image versions to specific SHA digests, not mutable tags
- Generate SBOM for every build artifact and store it alongside the image manifest
- Implement pipeline-level timeout limits to prevent hung jobs from consuming resources
- Store deployment history and rollback triggers in version-controlled configuration

### MUST NOT DO
- Hardcode API keys, tokens, or secrets in pipeline YAML files or scripts
- Deploy directly to production without passing through a staging environment with automated tests
- Use `latest` tags for container images in any deployment manifest
- Disable security scan failures — never add `continue-on-error: true` to scanning steps
- Bypass canary analysis by manually promoting before evaluation period completes

---

## Output Template

When implementing or reviewing a CI/CD pipeline, the output must contain:

1. **Pipeline Architecture Diagram** — ASCII flow showing stages, parallel jobs, and gate conditions
2. **Configuration File** — Complete YAML/script for the chosen CI engine with all stages defined
3. **Security Gate Specification** — List of scans (SAST/DAST/SCA), thresholds, and enforcement policy
4. **Deployment Strategy** — Rollout method (canary/blue-green/rolling) with rollback criteria and automation commands

---

## Related Skills

| Skill | Purpose |
|---|---|
| `platform-engineering` | Internal developer platforms and golden path pipelines |
| `iac-engineering` | Infrastructure provisioning that CI/CD deploys into |
| `secure-release-pipeline` | Supply chain security and release signing processes |
| `production-readiness` | Observability, SLOs, and runtime monitoring post-deployment |

---

## Live References

> Authoritative documentation links for CI/CD pipeline engineering.

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Configuration](https://docs.gitlab.com/ee/ci/)
- [ArgoCD User Manual](https://argo-cd.readthedocs.io/en/stable/)
- [SLSA Framework Provenance](https://slsa.dev/spec/v1/provenance)
- [CycloneDX SBOM Specification](https://cyclonedx.org/specification/overview/)
- [Sigstore/Cosign Artifact Signing](https://docs.sigstore.dev/cosign/overview/)
