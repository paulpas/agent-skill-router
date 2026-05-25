---
name: platform-engineering
description: Designs internal developer platforms (IDPs) with golden paths, self-service
  infrastructure portals, template-driven deployments, and developer experience metrics
  to reduce cognitive load and accelerate feature delivery.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: platform engineering, internal developer platform, IDP, golden paths,
    self-service infrastructure, Backstage.io, developer experience metrics, how do
    i build a developer platform
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
  - examples
  - do-dont
  related-skills: coding-cloud-native-architecture, cncf-kubernetes, coding-software-delivery-pipelines,
    coding-security-review
------
# Platform Engineering Framework

Acting as a platform engineer who designs and implements internal developer platforms that reduce cognitive load and accelerate feature delivery. This skill makes the model create self-service infrastructure solutions, golden path templates, platform team operating models, and Developer Experience metrics — treating developers as the product whose friction is systematically eliminated.

## TL;DR Checklist

- [ ] Define the platform product's user personas and their top 3 pain points before designing any solution
- [ ] Implement at least one golden path template per common workload type (web service, API, data pipeline)
- [ ] Ensure self-service capabilities cover: provisioning, configuration, observability setup, and deployment
- [ ] Measure Developer Experience metrics (dORA metrics + custom friction scores) before and after platform changes
- [ ] Document every template with examples, constraints, upgrade paths, and when NOT to use it
- [ ] Review each platform capability against the 80/20 rule — does it solve the majority of cases or just niche ones?

---

## When to Use

Use this skill when:

- Designing an internal developer platform (IDP) from scratch for a growing engineering organization (typically 15+ engineers spread across multiple teams)
- Reducing onboarding time for new developers by creating golden path templates for common workload types (web services, microservices, batch jobs)
- Implementing self-service infrastructure so developers can provision databases, caches, and queues without waiting for ops requests
- Building a developer portal (e.g., using Backstage.io) to consolidate service catalogs, documentation, and tooling into one interface
- Evaluating whether the organization is ready for a dedicated platform team vs. continuing with existing DevOps patterns
- Designing scaffolding tools that generate project boilerplate following organizational standards for security, observability, and CI/CD

---

## When NOT to Use

Avoid this skill for:

- A small startup (<10 engineers) where direct communication replaces the need for platform tooling — overhead outweighs benefit
- Solving a single team's problem — platform engineering serves multiple teams with common patterns; use domain-specific solutions instead
- As a replacement for fixing broken deployment pipelines — fix fundamentals (reliable CI/CD, missing observability) first, add platform capabilities after

---

## Core Workflow

1. **Identify Developer Pain Points** — Survey engineering teams to find the top 3 most time-consuming tasks that are NOT core product work (e.g., setting up CI/CD pipelines, provisioning databases, configuring monitoring dashboards). Rank each by frequency × effort. Conduct at least one structured interview per team and aggregate results. **Checkpoint:** Each pain point must have measurable cost: "Developers spend X hours per week on Y" rather than "setting up services is annoying."

2. **Design Golden Path Templates** — Create opinionated templates for the most common workload types identified in step 1. Each template must include: project scaffolding with standardized structure, CI/CD pipeline configuration (GitHub Actions, GitLab CI, or Jenkins), structured logging setup, monitoring dashboards (Prometheus/Grafana or equivalent), security scanning (SAST/DAST integration), and deployment manifests for the target platform (Kubernetes, serverless, or VMs). **Checkpoint:** Every golden path template must be usable by a new developer with zero platform knowledge — they should be able to copy the template, fill in 3–5 variables, and have a working service in production within a single day.

3. **Implement Self-Service Portal** — Build or configure a portal (Backstage.io is the industry standard) that exposes golden paths as self-service actions. The portal must allow developers to: scaffold new projects from templates with parameterized inputs, provision infrastructure resources via IaC-backed wizards, view existing services and their health status, access documentation through embedded links, and submit platform support requests with automatic ticketing. **Checkpoint:** After provisioning through the portal, the developer's service must be fully operational (code running in staging, monitoring active with default dashboards, alerts configured for basic SLOs) — not just a code directory with no pipeline or observability.

4. **Establish Platform Team Operating Model** — Define the platform team's mission as an internal product team serving engineering teams as customers. Set up: a public roadmap accessible to all engineers, SLA commitments for platform requests (typically 2 weeks for new golden path features, 24 hours for critical bugs), feedback channels including quarterly developer satisfaction surveys and monthly office hours, and a contribution model where product teams can submit RFCs and improvements to golden paths via pull requests. **Checkpoint:** The platform team's success metric should be demonstrable developer productivity improvement over time — measured via dORA trends and friction score reduction — not the number of tickets resolved or services onboarded.

5. **Measure Developer Experience** — Track Google's dORA metrics (Deployment Frequency, Lead Time for Changes, Change Failure Rate, Mean Time to Recovery) plus custom friction indicators: days from idea to production deployment, percentage of time developers spend on platform tasks vs. product features, developer satisfaction scores from quarterly surveys. Report findings quarterly to engineering leadership and correlate specific platform improvements with delivery speed gains. **Checkpoint:** Every platform capability released must have a measurable impact on at least one dORA or friction metric — if you cannot measure improvement after 60 days, the capability has not been validated and should be re-evaluated.

---

## Implementation Patterns

### Pattern 1: Golden Path Template Structure

A golden path template is a repository that contains everything a developer needs to ship a specific workload type with zero platform knowledge. The template includes scaffolding files, CI/CD pipeline configuration, Kubernetes manifests, observability setup, and security scanning — all pre-configured to organizational standards.

Here is the directory structure for a Python web service golden path:

```
python-web-service-template/
├── .github/
│   └── workflows/
│       ├── ci.yaml                  # Lint, test, SAST scan
│       ├── cd-staging.yaml          # Deploy to staging on merge
│       └── cd-production.yaml       # Promote to production with approval
├── docker/
│   ├── Dockerfile                   # Multi-stage build, non-root user
│   └── .dockerignore
├── k8s/
│   ├── deployment.yaml              # Deployment with resource limits
│   ├── service.yaml                 # ClusterIP service
│   ├── ingress.yaml                 # TLS-enabled ingress
│   └── hpa.yaml                     # Horizontal Pod Autoscaler config
├── observability/
│   ├── dashboards/
│   │   └── app-overview.json        # Grafana dashboard JSON
│   └── alerts/
│       └── service-alerts.yaml      # Prometheus alerting rules
├── security/
│   └── sast-config.yaml             # SAST scanner configuration
├── src/
│   ├── app.py
│   ├── config.py
│   └── health.py                    # Readiness/liveness probes
├── tests/
│   ├── test_app.py
│   └── conftest.py
├── Makefile                         # dev-up, build, test targets
├── README.md                        # Template usage instructions
├── variables.yaml                   # Developer-configurable variables
└── scaffolder-template.yaml         # Backstage scaffolding definition
```

**Key variable file (`variables.yaml`)** — the only file a developer needs to edit:

```yaml
# Developer-facing configuration. Fill in these 5 fields to customize the template.
service:
  name: my-api                       # Unique service identifier (kebab-case)
  port: 8080                         # HTTP listening port
  replicas:                          # Defaults overridden by HPA in production
    min: 2
    max: 10

environment: staging                 # staging | production

# Observability defaults — rarely need changing
observability:
  enable_tracing: true               # OpenTelemetry auto-instrumentation
  log_level: info                    # debug | info | warn | error
  metrics_path: /metrics             # Prometheus scrape endpoint

# Security settings — do not disable without platform team approval
security:
  enable_scanning: true              # SAST scan on every CI run
  require_signing: true              # Image signing with cosign
```

### Pattern 2: Developer Experience Metric Calculator (BAD vs. GOOD)

Tracking the wrong metrics destroys platform credibility. The BAD example tracks vanity numbers that look good but tell you nothing about actual developer productivity.

```python
# ❌ BAD: Tracking vanity metrics that don't indicate developer productivity
class BadDevExMetrics:
    """Vanity metrics — looks impressive in a slide deck, useless for decision-making."""
    
    def report(self) -> dict:
        return {
            "services_created": 47,          # Vanity — doesn't measure quality or speed
            "templates_used": 12,             # Volume ≠ value; 1 template used by 50 teams is better
            "platform_tickets_opened": 89,    # More tickets could mean more confusion, not less
            "portal_page_views": 1243,        # Page views with no engagement depth signal
        }

# ✅ GOOD: dORA-aligned metrics with actionable insights and clear improvement targets
from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class DevExScore:
    """Developer Experience score aligned with Google's DORA framework.
    
    Ranges from 0.0 (severe friction) to 100.0 (optimized delivery).
    Calculated monthly per engineering team or org-wide.
    
    Implements the 5 Laws of Elegant Defense:
    - Law 1 (Early Exit): Returns zero score immediately if any required metric is missing
    - Law 3 (Atomic Predictability): Frozen dataclass — immutable once created, reproducible
    - Law 4 (Fail Fast): Constructor validates all inputs before computing the score
    """
    deployment_frequency_score: float      # 0-25 points: How often do teams deploy?
    lead_time_score: float                 # 0-25 points: Days from commit to production
    change_failure_score: float            # 0-25 points: What % of deployments cause incidents?
    mttr_score: float                      # 0-25 points: How fast do we recover from failures?

    @property
    def overall(self) -> float:
        """Return the composite DevEx score (0.0 to 100.0)."""
        total = sum([
            self.deployment_frequency_score,
            self.lead_time_score,
            self.change_failure_score,
            self.mttr_score,
        ])
        return round(min(100.0, max(0.0, total)), 1)

    @classmethod
    def from_pipeline_data(cls, pipeline_runs: list[dict]) -> "DevExScore":
        """Calculate DevEx score from CI/CD pipeline data.
        
        Args:
            pipeline_runs: List of dicts with keys: 'deploy_time', 'lead_time_hours',
                          'caused_incident' (bool), 'mttr_minutes' (or None if no incident)
        
        Returns:
            DevExScore computed from the provided pipeline data.
        
        Raises:
            ValueError: If fewer than 10 pipeline runs are provided (insufficient data).
        """
        if len(pipeline_runs) < 10:
            raise ValueError(
                f"Insufficient data: need >= 10 pipeline runs, got {len(pipeline_runs)}"
            )

        # Deployment frequency: score = min(runs_in_month / target_runs * 25, 25)
        deploy_count = len(pipeline_runs)
        monthly_target = 50  # "on-demand" deployment frequency benchmark
        freq_score = min((deploy_count / max(monthly_target, 1)) * 25.0, 25.0)

        # Lead time: score based on median days from commit to production
        lead_times_hours = [r["lead_time_hours"] for r in pipeline_runs if r.get("lead_time_hours")]
        if lead_times_hours:
            median_lead_hours = statistics.median(lead_times_hours)
            median_lead_days = median_lead_hours / 24.0
            # < 1 day → 25pts, < 1 week → 18pts, < 1 month → 10pts, > 6 months → 0pts
            if median_lead_days <= 1:
                lead_score = 25.0
            elif median_lead_days <= 7:
                lead_score = 18.0
            elif median_lead_days <= 30:
                lead_score = 10.0
            elif median_lead_days <= 180:
                lead_score = 5.0
            else:
                lead_score = 0.0
        else:
            lead_score = 0.0

        # Change failure rate: score = max(25 - failure_rate_pct * 25, 0)
        incidents = sum(1 for r in pipeline_runs if r.get("caused_incident"))
        failure_rate = incidents / len(pipeline_runs) if pipeline_runs else 1.0
        failure_score = max(25.0 - (failure_rate * 100 * 25.0), 0.0)

        # MTTR: score based on median recovery time
        mttr_values = [r["mttr_minutes"] for r in pipeline_runs if r.get("mttr_minutes") is not None]
        if mttr_values:
            median_mttr = statistics.median(mttr_values)
            if median_mttr <= 60:      # < 1 hour → 25pts
                mttr_score = 25.0
            elif median_mttr <= 240:   # < 4 hours → 18pts
                mttr_score = 18.0
            elif median_mttr <= 1440:  # < 1 day → 10pts
                mttr_score = 10.0
            else:                       # > 1 day → 0pts
                mttr_score = 0.0
        else:
            # No incidents recorded — assume excellent recovery
            mttr_score = 25.0

        return cls(
            deployment_frequency_score=freq_score,
            lead_time_score=lead_score,
            change_failure_score=failure_score,
            mttr_score=mttr_score,
        )


@dataclass(frozen=True)
class FrictionIndicator:
    """Custom friction metrics that complement dORA with platform-specific signals."""
    idea_to_production_days: float           # Median days from first commit to production deploy
    platform_vs_product_hours_ratio: float   # Hours on platform work / hours on product work
    developer_satisfaction_score: float      # 1-5 scale from quarterly survey
    self_service_automation_pct: float       # % of provisioning done via portal (not manual)

    @property
    def friction_summary(self) -> str:
        """Human-readable summary of the team's current friction profile."""
        if self.platform_vs_product_hours_ratio > 0.4:
            status = "HIGH friction — too much platform overhead"
        elif self.idea_to_production_days > 14:
            status = "ELEVATED friction — delivery pipeline is slow"
        else:
            status = "LOW friction — delivering efficiently"
        return f"Friction: {status} (satisfaction: {self.developer_satisfaction_score}/5)"
```

### Pattern 3: Backstage.io Component Template Definition

Backstage.io is the industry-standard developer portal. This example shows a real `scaffolder-template.yaml` that defines a golden path for a new Python microservice. Developers select this template from the Backstage "Create" page, fill in parameters, and get a fully operational service scaffold with CI/CD, observability, and Kubernetes manifests — all following organizational standards.

```yaml
# scaffolder-template.yaml — Backstage Scaffolder v1 API
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: python-microservice
  title: Python Microservice (Golden Path)
  description: |
    Creates a new Python microservice with golden path scaffolding.
    Includes CI/CD pipelines, Kubernetes manifests, observability, and security scanning.
spec:
  owner: platform-team
  type: service

  # Developer-facing parameters — the "3-5 variables" of the golden path contract
  parameters:
    - title: Provide basic service information
      required:
        - name
      properties:
        name:
          title: Service Name
          description: Unique kebab-case identifier for your service
          type: string
          ui:autofocus: true
          ui:options:
            pattern: "^[a-z][a-z0-9-]*[a-z0-9]$"
            placeholder: "my-api-service"
        owner:
          title: Owner Team
          description: The team that owns this service
          type: string
          ui:field: OwnershipPicker
        language:
          title: Runtime Language
          description: Primary language/runtime for the service
          type: string
          enum:
            - python
            - nodejs
          default: python
        deploymentTarget:
          title: Deployment Target
          description: Where this service will run
          type: string
          enum:
            - kubernetes
            - serverless-aws
            - serverless-gcp
          default: kubernetes

    - title: Configure observability
      required: []
      properties:
        enable_tracing:
          title: Enable Distributed Tracing
          type: boolean
          default: true
        log_level:
          title: Default Log Level
          type: string
          enum: [debug, info, warn, error]
          default: info

  # The actions that execute when the template is run
  actions:
    - id: scaffold
      name: Scaffold Project
      actionId: "builtin:scaffolder:shell"
      input:
        cmd: "bash"
        args:
          - "-c"
          |
          mkdir -p $(pwd)/{{ parameters.name }}/src &&
          cp -r /templates/python-service/* $(pwd)/{{ parameters.name }}/ &&
          sed -i "s/{{{ name }}}/{{ parameters.name }}/" \
            $(pwd)/{{ parameters.name }}/variables.yaml

    - id: publish
      name: Push to Repository
      actionId: "github:actions:create-development-pull-request"
      input:
        repoUrl: "github.com?owner=org-name&repo=services"
        branchName: "{{ parameters.name }}"
        title: "Initial scaffold of {{ parameters.name }} service"
        description: |
          Auto-generated service scaffold from the Python Microservice golden path template.
          
          Includes: CI/CD pipeline, Kubernetes manifests, observability setup, security scanning.
        
    - id: register
      name: Register with Catalog
      actionId: "backstage:catalog:register"
      input:
        catalogInfoUrl: "./{{ parameters.name }}/catalog-info.yaml"

  # Output information shown to the developer after creation
  output:
    links:
      - title: View Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Backstage Catalog
        url: ${{ steps.register.output.catalogEntityRef }}
```

### Pattern 4: Platform Self-Service Capability Matrix Generator

Track what your platform can do today vs. what it promises — the matrix below is a real pattern for maintaining visibility into capability gaps.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class CapabilityStatus(StrEnum):
    PLANNED = "planned"
    PARTIAL = "partial"
    IMPLEMENTED = "implemented"
    DEPRECATED = "deprecated"


@dataclass(frozen=True)
class PlatformCapability:
    """A single self-service capability provided by the platform.
    
    Each capability maps a developer task to a platform action, with clear
    ownership and status tracking (implements Early Exit via status checks).
    """
    name: str                          # Human-readable capability name
    description: str                   # What the developer gets when they use it
    status: CapabilityStatus = field(default=CapabilityStatus.PLANNED)
    owner_team: str                    # Platform team subgroup responsible for this
    sla_hours: int | None = None       # Expected response time in hours (None = best effort)
    dora_metric_impact: list[str] = field(default_factory=list)
        # Which dORA metric(s) this capability improves

    @property
    def is_production_ready(self) -> bool:
        """Early exit: only implemented capabilities affect developer velocity."""
        return self.status == CapabilityStatus.IMPLEMENTED

    @property
    def has_sla_commitment(self) -> bool:
        """Check whether this capability has an SLA (MUST NOT do without SLA = unreliable)."""
        return self.sla_hours is not None and self.is_production_ready


def build_capability_matrix(
    capabilities: list[PlatformCapability],
    team_count: int = 1,
) -> dict[str, list[str]]:
    """Build a summary matrix grouped by status.
    
    Returns a dict mapping each status to the list of capability names
    at that status. Used for quarterly platform reviews and roadmap planning.
    """
    matrix: dict[str, list[str]] = {s.value: [] for s in CapabilityStatus}
    
    for cap in capabilities:
        matrix[cap.status].append(cap.name)
    
    # Early exit: if no implemented capabilities, flag immediately
    if not matrix[CapabilityStatus.IMPLEMENTED]:
        print("WARNING: No capabilities are production-ready. Developers cannot self-serve.")
    
    total_capabilities = len(capabilities) or 1  # Avoid division by zero
    implementation_rate = len(matrix[CapabilityStatus.IMPLEMENTED]) / total_capabilities
    
    print(f"Platform Capability Matrix ({team_count} teams served):")
    print(f"  Implementation rate: {implementation_rate:.0%}")
    for status, names in matrix.items():
        print(f"  {status.upper()}: {len(names)} capabilities")
    
    return matrix
```

---

## Constraints

### MUST DO
- Treat developers as internal customers — their satisfaction and productivity are the primary success metrics, not platform technology preferences (see `code-philosophy` Law 1: Early Exit, by removing platform friction at the boundary)
- Design every platform capability with an 80/20 mindset: does it solve the most common cases for the majority of teams? Reject features that only serve a niche use case (Law 2: Parse Don't Validate — parse the actual workflow patterns, don't validate against hypothetical edge cases)
- Make golden paths genuinely easy to use (zero platform knowledge required) AND powerful enough to customize when needed through documented extension points and override mechanisms
- Document upgrade paths, deprecation policies, and breaking change procedures for every template and tool — developers must never be surprised by a breaking change in their CI/CD pipeline or deployment manifests
- Integrate security scanning into golden paths by default (SAST on every PR, image scanning on every build) — developers should not need to think about security setup; it follows them everywhere (Law 4: Fail Fast, failing builds before bad code ships)
- Measure everything: dORA metrics baseline, developer satisfaction surveys, time-to-production, platform team response times. Report quarterly and correlate platform improvements with delivery speed gains
- Ensure self-service capabilities produce fully operational services after provisioning — code running, monitoring active, alerts configured, documentation linked (Law 5: Don't Hide Failures by making invisible infrastructure visible)

### MUST NOT DO
- Build a platform team that becomes a bottleneck by requiring approval for every resource request — self-service means the developer does not wait for human approval to provision standard resources
- Create templates so opinionated that teams cannot customize them — balance guardrails with flexibility through documented override mechanisms and extension points; use Law 3 (Atomic Predictability) by keeping template core immutable but allowing composable layers
- Invest in platform capabilities before fixing broken fundamentals: unreliable CI/CD pipelines, missing observability, or absent security scanning must be solved first
- Design platforms based on technology preferences rather than developer pain points — start with measured problems ("developers spend 12 hours per week setting up databases"), not tools ("everyone wants to use Backstage")
- Launch a developer portal without a content strategy — empty portals destroy trust faster than no portal at all; every service listed in the catalog must have owners, documentation links, health status, and team contact information
- Treat the platform as a cost center — measure and report its value in terms of developer time saved, deployment frequency increased, and incident recovery accelerated. Use dORA data to justify platform investment

---

## Output Template

When applying this skill, produce:

1. **Platform Requirements Document** — Developer personas (e.g., "new backend engineer", "data pipeline maintainer"), pain points ranked by frequency × effort score, and target capabilities with priority ordering
2. **Golden Path Template Specification** — Directory structure, configuration files, variables required (with defaults), sample output after scaffolding, and constraints for each workload type covered
3. **Self-Service Capability Matrix** — Table mapping developer tasks to platform capabilities (implemented / partial / planned) with ownership, SLA commitments, and dORA metric impact for each capability
4. **DevEx Measurement Plan** — Baseline dORA metrics for current state, custom friction indicators (idea-to-production days, platform-vs-product time ratio), reporting cadence (monthly internal, quarterly leadership), and 6-month improvement targets
5. **Platform Team Operating Model** — Mission statement (internal product team serving engineering teams), SLA commitments by severity tier, roadmap process (quarterly planning with RFC contributions), and contribution model for product teams to improve golden paths

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-cloud-native-architecture` | Cloud-native design patterns that platform templates should enforce (service mesh patterns, sidecar injection, config management) |
| `cncf-kubernetes` | Kubernetes expertise needed for infrastructure templates, self-service provisioning, and Helm chart generation |
| `coding-software-delivery-pipelines` | CI/CD pipeline design — the core capability every golden path template includes as the deployment backbone |

---

## Live References

> Authoritative documentation and guides for platform engineering practices. The model follows these links at load time to resolve external references.

- [Backstage.io Documentation](https://backstage.io/docs) — Developer portal and scaffolding tool reference
- [Google DevEx Measurement Guide](https://cloud.google.com/blog/products/application-development/measuring-developer-experience) — Google's framework for measuring developer experience and dORA alignment
- [Platform Engineering Community (CNCF)](https://platformengineering.org) — CNCF-led platform engineering community with maturity models and best practices
- [The Platform Engineer's Handbook](https://www.oreilly.com/library/view/the-platform-engineers/9781098153727/) — O'Reilly reference for platform team operating models
- [DORA State of DevOps Report](https://cloud.google.com/devops/state-of-devops) — Annual research on high-performing engineering organizations and their practices
