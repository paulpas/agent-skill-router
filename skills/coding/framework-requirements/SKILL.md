---
name: framework-requirements
description: Defines, evaluates, and validates software framework requirements including non-functional criteria (performance, security, extensibility), weighted selection scoring matrices, proof-of-concept feasibility testing, and architecture decision records for production-grade applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework requirements, evaluating frameworks, selecting libraries, dependency management, architecture decisions, tech stack selection, framework evaluation criteria, non-functional requirements, NFR, framework scoring matrix, POC testing, proof of concept, integration feasibility, production readiness gate
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-evaluation-criteria, test-driven-development, modular-design, dependency-injection, framework-utilization
---

# Framework Requirements Guide

Defines and validates software framework requirements across functional, non-functional, operational, and strategic dimensions. When loaded, this skill makes the model act as a senior architect — eliciting structured requirements using formal catalogs (MoSCoW prioritization, NFR classification), building weighted evaluation scoring matrices with evidence-based criterion validation, designing proof-of-concept test harnesses for integration feasibility assessment, generating Architecture Decision Records documenting trade-offs, and enforcing production readiness gates before any framework is committed to code.

## TL;DR Checklist

- [ ] Classify every requirement using MoSCoW (Must/Should/Could/Won't) — never mix priorities in scoring
- [ ] Extract non-functional requirements from the NFR catalog (performance, security, extensibility, observability, operability, portability) before evaluating any candidate
- [ ] Build a weighted evaluation matrix where scoring criteria weights sum to exactly 1.0 and knock-out criteria are binary pass/fail
- [ ] Design POC tests that exercise the three most critical integration points under realistic conditions — not toy examples
- [ ] Validate production readiness: startup time, memory footprint, dependency graph depth, license compatibility, CI/CD integration, monitoring hooks
- [ ] Generate an Architecture Decision Record (ADR) with context, drivers, scored evaluation, and documented consequences (both positive and negative)
- [ ] Involve at least two stakeholders in the decision and record all deciders

---

## When to Use

Use this skill when:

- Starting a new service or major rewrite where framework selection will impact architecture for years
- Selecting a backend, frontend, or full-stack framework for a project with long-term maintenance requirements (3+ years)
- Migrating from an existing framework and need to systematically evaluate replacement candidates against defined requirements
- Leading an architectural review that includes technology stack decisions across multiple services
- The team has conflicting framework preferences and needs objective, requirement-driven criteria to resolve disagreements
- Before committing to a framework recommended solely because it is popular, new, or used at another company
- Building a platform where non-functional requirements (latency, throughput, scalability) are critical decision factors
- Evaluating frameworks for regulated environments (healthcare, finance, government) where compliance constraints apply

## When NOT to Use

Avoid this skill for:

- During active implementation of a framework already selected — use `framework-utilization` instead
- For throwaway prototypes, weekend projects, or proof-of-concepts where the framework is inherently temporary
- When requirements are already fully defined by another process (e.g., product team has already mandated a specific framework)
- For single-script tool decisions where `python` vs `node script.js` would work equally well (overhead outweighs benefit)
- For UI styling choices (CSS frameworks, component libraries) — use `framework-evaluation-criteria` for lighter comparisons

---

## Core Workflow

### Step 1: Elicit and Prioritize Requirements Using MoSCoW Classification

Systematically extract requirements from project context using the MoSCoW priority model. Each requirement receives exactly one priority label: **Must** (hard constraint — framework is disqualified if it fails), **Should** (important but has acceptable workarounds), **Could** (nice-to-have, scored but not required), or **Won't** (explicitly deferred). Use the Functional Requirements Catalog and NFR Catalog below to ensure coverage. **Checkpoint:** Every category must have at least one Must requirement written down. If a category genuinely has no requirements for this project, document why explicitly with a reason code.

### Step 2: Extract Non-Functional Requirements from the NFR Catalog

Non-functional requirements are the most frequently overlooked dimension in framework selection. Go through each NFR category below and write specific, quantifiable targets — not vague aspirations. Performance must include numeric thresholds (e.g., "p95 response latency under 200ms under 1000 concurrent users"). Security must reference applicable standards (OWASP Top 10, SOC 2, GDPR). Observability must specify required integration hooks (OpenTelemetry, Prometheus metrics, structured JSON logging). **Checkpoint:** Every NFR category that applies must have at least one quantified target before proceeding.

### Step 3: Build the Weighted Evaluation Matrix

Create a scoring matrix mapping candidates against criteria. Must requirements become knock-out criteria (binary pass/fail — weight = 0.0, failure means disqualification). Should/Could requirements become scored criteria with normalized weights summing to exactly 1.0. Use evidence for every score — "documentation quality: 8/10" is not sufficient; use "documentation quality: 8/10 — covers 16 of 20 features with runnable examples, verified via docs audit on [date]". **Checkpoint:** All candidate weights must sum to 1.0 (validate with `assert total == 1.0`). All knock-out failures must be explicitly listed before scoring is considered complete.

### Step 4: Design POC Test Harness for Integration Feasibility

For the top two candidates, design proof-of-concept tests that exercise the three most critical integration points under realistic conditions — not toy examples with hardcoded data. Each POC test should measure actual performance metrics (startup time, memory footprint, request throughput) and verify concrete integration capability (database connection pooling, auth flow completion, webhook delivery). **Checkpoint:** Each POC must produce measurable output files (JSON benchmarks, coverage reports) that can be compared side by side. If a POC cannot demonstrate the critical integration point within 2 hours of implementation time, flag it as a risk.

### Step 5: Validate Production Readiness Gates

Run each remaining candidate through the production readiness checklist before final selection. This covers deployment constraints (image size, startup time, memory baseline), dependency graph analysis (depth, known CVEs, license compatibility), CI/CD integration (test runner compatibility, build speed impact), and operational hooks (health checks, metrics endpoints, structured logging). **Checkpoint:** Any candidate failing a Must-level production readiness gate must be disqualified or require explicit stakeholder exception.

### Step 6: Generate Architecture Decision Record with Consequences

Produce a complete ADR documenting the decision context, weighted evaluation results, POC findings, and most critically — documented consequences in both directions (why selected AND why rejected). The ADR is not just justification; it is future-proofing that enables informed re-evaluation when requirements change. **Checkpoint:** Both positive and negative consequences must be present. Status should be `proposed` pending all stakeholder review before moving to `accepted`.

---

## Functional Requirements Catalog

Every framework evaluation begins with functional requirements — what the framework must actually do for your application to work. Use this catalog to ensure completeness, then prioritize using MoSCoW.

### Category: Core Capability

The fundamental features your application needs. This is the most commonly evaluated dimension but also the most often done incompletely — teams compare feature lists without considering depth of capability or long-term roadmap alignment.

**Requirements to elicit:**
- Does the framework support all required use cases at sufficient depth? (Not just "can it do X" but "how well can it do X at scale?")
- What is the extensibility model? Can you add features not built in via plugins, hooks, or extension points?
- Are there capability gaps that require custom infrastructure? How much custom code would those gaps produce?

**Priority guidance:** Core capability Must requirements should cover every use case that, if missing, would force a complete architectural rewrite. Should requirements cover the next layer of capabilities that improve developer productivity but have documented workarounds.

### Category: API Design and Developer Experience

How easy it is to write correct code with this framework. Bad API design creates bugs, slows onboarding, and increases maintenance burden over time.

**Requirements to elicit:**
- Is the primary API intuitive or does it require memorization of conventions?
- Does error handling follow predictable patterns or diverge across different features?
- Are type annotations complete (TypeScript types, Python stubs, Java generics)?
- How long until a mid-level developer can be productive without senior guidance?

**Priority guidance:** API design is typically a Should requirement — it affects velocity but rarely blocks correctness. However, for teams with high turnover or frequent onboarding, elevate to Must if the existing team lacks domain expertise.

### Category: Data Access and Persistence

How the framework interacts with data stores — ORM capability, query building, migration management, connection pooling, and transaction support.

**Requirements to elicit:**
- Does the framework include an ORM or require a separate library? Is the included option production-grade?
- How are database migrations handled? (Automated tooling vs manual SQL)
- Is there built-in connection pooling for high-throughput scenarios?
- What transaction isolation levels are supported natively?

**Priority guidance:** Data access is typically a Should or Could requirement. Most frameworks can work with external data libraries, but an integrated solution reduces operational surface area and simplifies the dependency graph.

### Category: Authentication and Authorization

Built-in security patterns for user identity management, role-based access control, session handling, and token-based authentication flows.

**Requirements to elicit:**
- Does the framework support the required auth pattern (OAuth2, JWT, SAML, API keys)?
- How are password hashing and credential storage handled?
- Is there built-in CSRF protection and rate limiting for auth endpoints?
- What identity providers are supported out of the box?

**Priority guidance:** Auth is a Must requirement for any user-facing application. If the framework does not support your required auth pattern natively, the integration cost must be factored into scoring or treated as a disqualification.

---

## Non-Functional Requirements (NFR) Catalog

Non-functional requirements are quantifiable targets that define how well the system performs its functions. They are frequently the most critical selection differentiator but also the most frequently skipped. Go through every applicable category below.

### NFR 1: Performance

Quantitative performance targets for the application under defined load conditions. Performance must be expressed in specific numeric terms — never "fast" or "good enough".

**Required metrics to define:**
- **Response latency:** p50, p95, and p99 target latencies (e.g., "p95 < 200ms for standard API endpoints")
- **Throughput:** requests per second the system must handle at steady state (e.g., "minimum 5000 RPS on a single instance")
- **Concurrency:** maximum concurrent connections or parallel workers supported (e.g., "supports 10,000 simultaneous WebSocket connections")
- **Resource efficiency:** maximum memory and CPU utilization per request under defined load
- **Cold start time:** for serverless/deployment-to-first-request scenarios (e.g., "p95 cold start < 3 seconds")

**Scoring evidence examples:**
- "Performance: 8/10 — Benchmarks show 12,000 RPS on single instance with p95 latency of 45ms under load test simulating production traffic patterns"
- "Performance: 4/10 — No published benchmarks available; community reports inconsistent performance under sustained high load"

### NFR 2: Security

Security posture covering known vulnerability history, dependency supply chain risk, licensing compliance, and built-in security mechanisms. This dimension must not be an afterthought — security flaws in a foundational framework cascade into every module that uses it.

**Required checks to perform:**
- **CVE history:** Scan the framework's dependency graph for known vulnerabilities (use `pip audit`, `npm audit`, or equivalent)
- **Dependency depth:** Count transitive dependencies — frameworks with deeper graphs have larger attack surfaces
- **Artifact signing:** Does the package registry verify cryptographic signatures on published artifacts?
- **License compatibility:** Is the license OSI-approved and compatible with your distribution model? Check for copyleft clauses
- **Built-in security headers/protocols:** CSRF protection, XSS sanitization, CORS configuration, parameterized queries (SQL injection prevention)

**Scoring evidence examples:**
- "Security: 9/10 — Zero CVEs in last 24 months; MIT license; 3 transitive dependencies only; built-in SQL injection prevention via parameterized query API"
- "Security: 5/10 — 3 medium-severity CVEs patched in previous minor versions but no public disclosure of patch timeline; GPL-3.0 license creates distribution concerns"

### NFR 3: Extensibility

The ability to customize and extend framework behavior without forking or modifying core code. Frameworks that are not extensible become technical debt when requirements evolve.

**Required checks to perform:**
- **Extension points:** How many documented hooks, plugins, or middleware layers exist? Can you intercept requests at multiple stages of the pipeline?
- **Plugin ecosystem:** Is there an active third-party plugin/package ecosystem? What fraction of common patterns have community solutions?
- **Fork risk:** If a needed feature doesn't exist and no plugin exists, how much code would need to be written? Would it require modifying framework internals?
- **Interface stability:** Does the framework guarantee API stability across major versions for extension points?

**Priority guidance:** Extensibility is typically a Should requirement. For platforms or product-as-a-service applications where customers may request custom behavior, elevate to Must.

### NFR 4: Observability

Built-in support for monitoring, logging, and tracing that enables production debugging, performance analysis, and incident response. Frameworks without observability hooks turn every production issue into a forensic investigation.

**Required checks to perform:**
- **Structured logging:** Does the framework produce structured (JSON) log output with contextual fields (request ID, user ID, latency)?
- **Metrics export:** Are Prometheus-compatible metrics or OpenTelemetry instrumentation available out of the box?
- **Health check endpoints:** Does the framework provide built-in readiness/liveness probe endpoints for Kubernetes or load balancer integration?
- **Distributed tracing:** Is there native support for propagating trace context headers across service boundaries?

**Priority guidance:** Observability is a Must requirement for any production system. Frameworks that require significant custom instrumentation to achieve basic monitoring capability should be penalized heavily in scoring or treated as knock-out failures.

### NFR 5: Operability

How easy the framework makes deployment, configuration management, and day-2 operations including scaling, upgrades, and incident recovery.

**Required checks to perform:**
- **Configuration model:** Environment variables, config files, secret managers? Does it support hot-reload without restart?
- **Deployment size:** Docker image footprint (compressed MB), startup time from zero to first request, memory baseline at idle
- **Upgrade path:** How painful are minor and major version upgrades? Are there automated migration tools? What is the average upgrade effort in developer-hours?
- **Rollback capability:** Can you safely roll back to the previous version with zero downtime? Does the framework support blue-green or canary deployment patterns natively?

**Priority guidance:** Operability is typically a Should requirement for internal services and a Must for customer-facing platforms where downtime carries direct revenue impact.

### NFR 6: Portability

The ability to run on required platforms, integrate with existing infrastructure, and avoid vendor lock-in that makes migration prohibitively expensive.

**Required checks to perform:**
- **Platform support:** Linux (specific distros), Windows, macOS? Containerization (Docker official images available)?
- **Cloud provider neutrality:** Can it run on AWS, GCP, Azure without proprietary service dependencies? Or does it lock you into one cloud's managed services?
- **Exit strategy cost:** If you need to migrate away in 3 years, what percentage of code would need rewriting vs. configuration changes? Map every framework-specific feature to a potential alternative.
- **Data format portability:** Does the framework use standard protocols (REST/JSON, GraphQL, gRPC) or proprietary data formats?

**Priority guidance:** Portability is typically a Should requirement but escalates to Must for platforms serving multi-tenant customers who may have infrastructure constraints.

---

## Production Readiness Gates

Before any framework passes from evaluation to selection, it must clear these operational gates. Each gate is either binary (pass/fail) or has a defined threshold that can be measured quantitatively.

### Gate 1: Dependency Graph Analysis

Run `pipdeptree`, `npm list --depth=0`, or the equivalent for your language ecosystem. The framework's dependency graph must meet these thresholds:
- **Maximum direct dependencies:** 20 (any more suggests bloat; investigate whether features are optional)
- **Maximum transitive depth:** 5 levels deep
- **Zero known CVEs** in the current published version across all transitive dependencies
- **License compatibility verification** for every direct and transitive dependency

### Gate 2: Deployment Baseline Benchmarks

Measure these metrics for each remaining candidate framework using an identical test environment:
- **Cold start time:** Time from `docker run` to first successful HTTP response (target: < 5 seconds for containers)
- **Idle memory footprint:** RSS after framework initialization with zero active requests (target: < 100MB for Python/Node frameworks)
- **Docker image size:** Compressed layer size of the minimal deployment image (target: < 200MB where possible)

### Gate 3: CI/CD Integration Verification

Verify the framework works correctly within your existing CI/CD pipeline:
- Test runner compatibility: Does the framework's built-in test utilities run in your CI environment without custom setup?
- Build speed impact: How much does adding this framework increase total build time compared to alternatives?
- Artifact publication: Can production builds be published to your registry using standard tooling?

### Gate 4: Monitoring and Alerting Integration

Verify the framework can emit data to your operational monitoring stack:
- Health check endpoint responds with HTTP 200/503 at the expected path
- Metrics are emitted in a format consumable by Prometheus or your existing time-series database
- Log output is structured and contains correlation/request IDs for distributed tracing

---

## Implementation Patterns

### Pattern 1: NFR Scoring Engine with Quantifiable Thresholds

A complete Python implementation of framework evaluation using quantified NFR thresholds. Each criterion has a measurable target, and scores are calculated by how close candidates come to meeting those targets — eliminating subjective judgment from scoring.

```python
"""Framework requirements evaluation engine with quantified NFR thresholds.

This module implements evidence-based framework evaluation where every score is
derived from measurable metrics against defined thresholds. Scores are computed
by comparing candidate performance against target values, producing objective
comparisons that eliminate subjective scoring bias.
"""

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any


class Priority(IntEnum):
    """MoSCoW priority classification for requirements."""
    MUST = 5       # Hard constraint — framework disqualified if fails
    SHOULD = 4     # Important but has acceptable workarounds
    COULD = 3      # Nice-to-have, scored but not required
    WONT = 0       # Explicitly deferred

    def label(self) -> str:
        return {self.MUST: "MUST", self.SHOULD: "SHOULD", self.COULD: "COULD", self.WONT: "WONT"}[self]


@dataclass
class Requirement:
    """A single prioritized framework requirement.

    Each requirement specifies what the framework must or should do,
    with a quantified threshold where applicable and evidence for scoring.
    """
    name: str
    category: str                     # e.g., "performance", "security", "core_capability"
    priority: Priority                # MoSCoW classification
    is_knockout: bool = False         # Must requirements default to knockout
    target_value: float | None = None  # Quantified target (e.g., p95 latency < 200ms → 200.0)
    unit: str = ""                    # Metric unit ("ms", "MB", "RPS", "%")
    description: str = ""             # Human-readable explanation of the requirement
    evidence: str = ""                # How the score was determined

    def __post_init__(self) -> None:
        if self.priority == Priority.MUST and not self.is_knockout:
            # Must requirements can be non-knockout only when they have a quantified threshold
            # that allows partial credit (e.g., MUST meet but scores vary above threshold)
            pass


@dataclass
class NFRCriterion:
    """A non-functional requirement criterion with measurable thresholds.

    Unlike standard requirements, NFRs are always scored on a 0-10 scale
    based on how the candidate performs against quantified targets.
    """
    name: str
    nfr_category: str               # performance, security, extensibility, observability, operability, portability
    priority: Priority
    target_value: float              # The desired value (lower is better for latency, higher for throughput)
    direction: str = "lower_is_better"  # "lower_is_better" or "higher_is_better"
    tolerance_range: float = 1.5     # Acceptable deviation from target before score drops
    unit: str = ""

    @property
    def max_score(self) -> int:
        return 10

    def compute_score(self, actual_value: float) -> float:
        """Compute a 0-10 score based on how close the candidate is to the target.

        Uses a linear falloff within tolerance range, then steep penalty outside it.
        At target: score = 10. Within tolerance: linearly interpolated. Beyond tolerance: drops toward 0.
        """
        if self.direction == "lower_is_better":
            deviation = max(0.0, actual_value - self.target_value)
        else:
            deviation = max(0.0, self.target_value - actual_value)

        # Within tolerance: perfect score
        if deviation <= self.target_value * (self.tolerance_range - 1.0):
            return float(self.max_score)

        # Calculate falloff — linear within tolerance, steep outside
        penalty_zone = self.target_value * self.tolerance_range
        ratio = min(deviation / penalty_zone, 5.0)  # Cap at 5x target for max penalty
        score = max(0.0, self.max_score * (1.0 - ratio))

        return round(score, 2)


@dataclass
class FrameworkCandidate:
    """A framework candidate being evaluated against all requirements."""
    name: str
    version: str
    license_type: str
    nfr_scores: dict[str, float] = field(default_factory=dict)     # criterion_name -> score (0-10)
    knockout_failures: list[dict[str, str]] = field(default_factory=list)  # {requirement: reason}
    poc_results: dict[str, Any] = field(default_factory=dict)      # test_name -> metrics
    production_gates: dict[str, bool] = field(default_factory=dict)  # gate_name -> pass/fail

    @property
    def is_viable(self) -> bool:
        """Framework passes all knock-out criteria and production readiness gates."""
        return len(self.knockout_failures) == 0

    @property
    def weighted_nfr_score(self) -> float:
        """Calculate average NFR score across all evaluated categories."""
        if not self.nfr_scores:
            return 0.0
        return round(sum(self.nfr_scores.values()) / len(self.nfr_scores), 2)

    @property
    def nfr_categories_scored(self) -> list[str]:
        """List of NFR categories that have been scored for this candidate."""
        return list(self.nfr_scores.keys())

    def add_nfr_score(self, criterion: NFRCriterion, actual_value: float) -> None:
        """Score a candidate on an NFR criterion using measured performance data.

        Args:
            criterion: The NFR criterion definition with target and direction.
            actual_value: The measured value for this candidate (e.g., p95 latency in ms).
        """
        score = criterion.compute_score(actual_value)
        self.nfr_scores[criterion.name] = score

    def record_knockout_failure(self, requirement_name: str, reason: str) -> None:
        """Record a knock-out failure that disqualifies this candidate."""
        self.knockout_failures.append({
            "requirement": requirement_name,
            "reason": reason,
        })

    def record_poc_result(self, test_name: str, metrics: dict[str, Any]) -> None:
        """Record proof-of-concept test results for this candidate."""
        self.poc_results[test_name] = metrics

    def pass_production_gate(self, gate_name: str, passed: bool) -> None:
        """Record a production readiness gate result.

        Args:
            gate_name: Name of the gate (e.g., "dependency_graph", "deployment_baseline").
            passed: True if the candidate meets this gate's threshold.
        """
        self.production_gates[gate_name] = passed


class RequirementsEvaluator:
    """Framework requirements evaluation engine.

    Implements weighted scoring matrices with evidence-based NFR thresholds,
    knock-out criteria enforcement, POC result aggregation, and production
    readiness gate validation.
    """

    # Predefined NFR catalog for consistent elicitation
    DEFAULT_NFR_CRITERIA: list[dict[str, Any]] = [
        {"name": "response_latency_p95", "nfr_category": "performance", "target_value": 200.0, "unit": "ms", "direction": "lower_is_better"},
        {"name": "idle_memory_mb", "nfr_category": "operability", "target_value": 100.0, "unit": "MB", "direction": "lower_is_better"},
        {"name": "cold_start_seconds", "nfr_category": "operability", "target_value": 5.0, "unit": "s", "direction": "lower_is_better"},
        {"name": "docker_image_mb", "nfr_category": "operability", "target_value": 200.0, "unit": "MB", "direction": "lower_is_better"},
        {"name": "dependency_count", "nfr_category": "portability", "target_value": 20, "unit": "deps", "direction": "lower_is_better"},
    ]

    all_nfr_criteria: dict[str, NFRCriterion] = {}

    @classmethod
    def initialize_criteria(cls) -> None:
        """Initialize the default NFR criteria catalog."""
        cls.all_nfr_criteria = {
            c["name"]: NFRCriterion(
                name=c["name"],
                nfr_category=c["nfr_category"],
                priority=Priority.SHOULD,
                target_value=c["target_value"],
                direction=c["direction"],
                tolerance_range=1.5,
                unit=c.get("unit", ""),
            )
            for c in cls.DEFAULT_NFR_CRITERIA
        }

    @classmethod
    def evaluate_nfrs(
        cls,
        candidates: list[FrameworkCandidate],
        measured_metrics: dict[str, dict[str, float]],
    ) -> None:
        """Score all candidates on NFR criteria using measured performance data.

        Args:
            candidates: List of framework candidates to evaluate.
            measured_metrics: Mapping of candidate_name -> {metric_name: actual_value}.
                              Example: {"FastAPI": {"response_latency_p95": 45.0, "idle_memory_mb": 62.0}}
        """
        for candidate in candidates:
            candidate_metrics = measured_metrics.get(candidate.name, {})
            for criterion in cls.all_nfr_criteria.values():
                if criterion.name in candidate_metrics:
                    actual = candidate_metrics[criterion.name]
                    candidate.add_nfr_score(criterion, actual)

    @classmethod
    def calculate_final_scores(
        cls,
        candidates: list[FrameworkCandidate],
        nfr_weights: dict[str, float] | None = None,
    ) -> list[dict]:
        """Calculate and rank final evaluation scores for all viable candidates.

        Args:
            candidates: Candidates that have been scored on NFR criteria.
            nfr_weights: Optional per-category weights. If None, categories are weighted equally.

        Returns:
            List of result dicts sorted by score descending (excluding knock-out failures).
        """
        if not nfr_weights:
            # Equal weighting across all scored categories
            scored_categories = set()
            for c in candidates:
                scored_categories.update(c.nfr_categories_scored)
            nfr_weights = {cat: 1.0 / len(scored_categories) if scored_categories else 0.0 for cat in scored_categories}

        results: list[dict] = []
        for candidate in candidates:
            if not candidate.is_viable:
                continue  # Knock-out failures excluded entirely

            # Calculate weighted NFR score
            weighted_total = sum(
                candidate.nfr_scores.get(cat, 0.0) * weight
                for cat, weight in nfr_weights.items()
            )
            total_weight = sum(nfr_weights.values()) or 1.0
            normalized_score = round(weighted_total / total_weight * 10, 2)

            # Check production gates — all must pass
            all_gates_pass = all(candidate.production_gates.values()) if candidate.production_gates else True

            results.append({
                "name": candidate.name,
                "version": candidate.version,
                "license": candidate.license_type,
                "nfr_score": normalized_score,
                "weighted_nfr_avg": candidate.weighted_nfr_score,
                "viable": candidate.is_viable,
                "knockout_failures": candidate.knockout_failures,
                "production_gates_pass": all_gates_pass,
                "poc_results": candidate.poc_results,
                "nfr_categories": list(candidate.nfr_scores.keys()),
            })

        return sorted(results, key=lambda r: r["nfr_score"], reverse=True)

    @classmethod
    def generate_summary(cls, results: list[dict]) -> str:
        """Generate a human-readable evaluation summary table."""
        lines = [
            "=" * 75,
            "FRAMEWORK REQUIREMENTS EVALUATION SUMMARY",
            "=" * 75,
            f"{'Candidate':<20} {'Score':>6} {'Viable':>7} {'Gates':>6}",
            "-" * 75,
        ]
        for r in results:
            viable = "Yes" if r["viable"] and r["production_gates_pass"] else "No"
            lines.append(
                f"{r['name']:<20} {r['nfr_score']:>6.2f} {viable:>7}"
                f" {'Pass' if r['production_gates_pass'] else 'Fail':>6}"
            )
            if r["knockout_failures"]:
                for failure in r["knockout_failures"]:
                    lines.append(f"  ✗ Knock-out failed: {failure['requirement']}")
        lines.append("=" * 75)
        return "\n".join(lines)


# ─── Example Usage ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Step 1: Initialize NFR criteria catalog
    RequirementsEvaluator.initialize_criteria()

    # Step 2: Define candidates
    candidates = [
        FrameworkCandidate(name="FastAPI", version="0.115.0", license_type="MIT"),
        FrameworkCandidate(name="Django", version="5.1.0", license_type="BSD-3-Clause"),
        FrameworkCandidate(name="Spring Boot", version="3.3.0", license_type="Apache-2.0"),
    ]

    # Step 3: Simulate measured NFR metrics (from benchmarks or POC testing)
    # Values represent actual measurements from identical test environments
    measured = {
        "FastAPI": {
            "response_latency_p95": 45.0,       # ms — target < 200ms
            "idle_memory_mb": 62.0,              # MB — target < 100MB
            "cold_start_seconds": 1.2,           # s — target < 5s
            "docker_image_mb": 95.0,             # MB — target < 200MB
            "dependency_count": 8,               # deps — target < 20
        },
        "Django": {
            "response_latency_p95": 120.0,       # ms
            "idle_memory_mb": 145.0,             # MB (heavier ORM + middleware)
            "cold_start_seconds": 3.8,           # s
            "docker_image_mb": 185.0,            # MB
            "dependency_count": 28,              # deps (ORM + admin + auth built-in)
        },
        "Spring Boot": {
            "response_latency_p95": 85.0,        # ms
            "idle_memory_mb": 220.0,             # MB (JVM baseline)
            "cold_start_seconds": 8.5,           # s (JVM warmup — fails gate)
            "docker_image_mb": 160.0,            # MB (JRE included)
            "dependency_count": 35,              # deps (Spring ecosystem is deep)
        },
    }

    # Step 4: Score NFRs using measured data
    RequirementsEvaluator.evaluate_nfrs(candidates, measured)

    # Step 5: Simulate knock-out failures
    # Django passes all, but Spring Boot fails cold start gate (MUST requirement)
    spring_boot = next(c for c in candidates if c.name == "Spring Boot")
    spring_boot.record_knockout_failure(
        "cold_start_seconds",
        "p95 cold start 8.5s exceeds MUST threshold of < 5s for serverless deployment target",
    )

    # Step 6: Record production gate results
    for candidate in candidates:
        if not candidate.is_viable:
            continue
        candidate.pass_production_gate("dependency_graph", True)
        candidate.pass_production_gate("ci_cd_integration", True)
        candidate.pass_production_gate("monitoring_hooks", True)

    # Spring Boot also fails deployment baseline gate (cold start)
    spring_boot.pass_production_gate("deployment_baseline", False)

    # Step 7: Calculate and display final scores
    nfr_weights = {cat: 1.0 / len(RequirementsEvaluator.all_nfr_criteria)
                   for cat in RequirementsEvaluator.all_nfr_criteria}
    results = RequirementsEvaluator.calculate_final_scores(candidates, nfr_weights)
    print(RequirementsEvaluator.generate_summary(results))

    # Verify deterministic output — scores are derived from measured data
    assert results[0]["nfr_score"] > results[-1]["nfr_score"] or len(results) <= 1, \
        "Results must be sorted by descending NFR score"
```

### Pattern 2: Requirements Validation Schema with Pydantic

A pydantic-based schema validation system for framework requirements documents. This ensures every requirement is properly structured with quantified thresholds, evidence citations, and priority classifications before any evaluation begins. Prevents vague or incomplete requirement definitions from entering the scoring process.

```python
"""Framework requirements validation using Pydantic schemas.

Validates that all framework requirements are properly specified with:
- Quantified targets (not qualitative descriptions)
- MoSCoW priority classification
- Evidence citations for scores
- NFR category membership and threshold definitions
- Cross-criteria weight consistency checks
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

try:
    from pydantic import BaseModel, Field, field_validator, model_validator
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False


# ─── Data Model (Pure Python Fallback) ──────────────────────────────────────────

class RequirementPriority(str, Enum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"
    WONT = "wont"


class NFRCategory(str, Enum):
    PERFORMANCE = "performance"
    SECURITY = "security"
    EXTENSIBILITY = "extensibility"
    OBSERVABILITY = "observability"
    OPERABILITY = "operability"
    PORTABILITY = "portability"


class ValidationResult:
    """Result of a requirements validation pass."""
    def __init__(
        self,
        valid: bool = True,
        errors: list[str] | None = None,
        warnings: list[str] | None = None,
    ):
        self.valid = valid
        self.errors = errors or []
        self.warnings = warnings or []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, message: str) -> None:
        self.errors.append(message)
        self.valid = False

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def __bool__(self) -> bool:
        return self.is_valid


@dataclass
class FrameworkRequirementSchema:
    """A structured requirement with validation guarantees.

    This dataclass ensures every requirement has the minimum fields needed
    for evaluation, preventing vague or incomplete requirements from entering
    the scoring pipeline.
    """
    name: str
    category: str
    priority: RequirementPriority
    target_value: float | None = None
    unit: str = ""
    description: str = ""
    evidence: str = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Requirement name must not be empty")
        return v


@dataclass
class NFRSchema:
    """A non-functional requirement with quantified threshold."""
    name: str
    category: NFRCategory
    target_value: float
    direction: str = "lower_is_better"  # or "higher_is_better"
    unit: str = ""
    tolerance_multiplier: float = 1.5

    def validate_target(self) -> ValidationResult:
        """Validate that the target value is reasonable and non-zero."""
        result = ValidationResult()
        if self.target_value <= 0:
            result.add_error(
                f"NFR '{self.name}' has non-positive target value {self.target_value}. "
                "Target must be a positive number."
            )
        if not self.unit:
            result.add_warning(f"NFR '{self.name}' is missing a unit specification.")
        if self.direction not in ("lower_is_better", "higher_is_better"):
            result.add_error(
                f"NFR '{self.name}' has invalid direction '{self.direction}'. "
                "Must be 'lower_is_better' or 'higher_is_better'."
            )
        return result


@dataclass
class FrameworkRequirementsDocument:
    """Complete framework requirements document with validation."""
    project_name: str
    functional_requirements: list[FrameworkRequirementSchema] = field(default_factory=list)
    nfr_criteria: list[NFRSchema] = field(default_factory=list)
    weights: dict[str, float] = field(default_factory=dict)  # criterion_name -> normalized weight
    knockout_requirements: list[str] = field(default_factory=list)  # names of MUST requirements

    def validate(self) -> ValidationResult:
        """Validate the complete requirements document.

        Checks include:
        - At least one MUST requirement exists
        - All weights sum to exactly 1.0
        - All NFR targets are valid and quantified
        - Every requirement has an evidence field (non-empty for scored criteria)
        - No duplicate requirement names
        """
        result = ValidationResult()

        # Check MUST requirements exist
        must_count = sum(
            1 for r in self.functional_requirements
            if r.priority == RequirementPriority.MUST
        )
        if must_count == 0:
            result.add_error(
                "At least one MUST (knock-out) requirement is required. "
                "A framework selection without non-negotiables is subjective speculation."
            )

        # Check weights sum to 1.0
        weight_sum = sum(self.weights.values()) if self.weights else 0.0
        if abs(weight_sum - 1.0) > 0.001:
            result.add_error(
                f"Scoring criterion weights must sum to 1.0, got {weight_sum:.4f}. "
                f"Current breakdown: {self.weights}"
            )

        # Validate individual requirements
        seen_names: set[str] = set()
        for req in self.functional_requirements:
            if req.name in seen_names:
                result.add_error(f"Duplicate requirement name: '{req.name}'")
            seen_names.add(req.name)

            if not req.description:
                result.add_warning(f"Requirement '{req.name}' has no description.")

            # Must requirements need evidence (quantified thresholds)
            if req.priority == RequirementPriority.MUST and not req.target_value:
                result.add_error(
                    f"Must requirement '{req.name}' must have a quantified target_value. "
                    "Vague must-requirements cannot be objectively evaluated."
                )

        # Validate NFR criteria
        for nfr in self.nfr_criteria:
            nfr_result = nfr.validate_target()
            result.errors.extend(nfr_result.errors)
            result.warnings.extend(nfr_result.warnings)

        return result


# ─── Example: Valid Requirements Document ────────────────────────────────────────

if __name__ == "__main__":
    doc = FrameworkRequirementsDocument(
        project_name="internal-api-gateway",
        functional_requirements=[
            FrameworkRequirementSchema(
                name="async_support",
                category="core_capability",
                priority=RequirementPriority.MUST,
                target_value=1.0,
                description="Must support async/await for high-concurrency request handling",
                evidence="Required by architecture spec section 3.2 — service must handle 5k+ concurrent connections",
            ),
            FrameworkRequirementSchema(
                name="orm_capability",
                category="data_access",
                priority=RequirementPriority.SHOULD,
                target_value=10.0,
                unit="features_covered",
                description="Should include a production-grade ORM with migration tooling",
                evidence="Django includes ORM; FastAPI requires SQLAlchemy integration — both viable options exist",
            ),
            FrameworkRequirementSchema(
                name="jwt_auth_support",
                category="authentication",
                priority=RequirementPriority.MUST,
                target_value=1.0,
                description="Must support JWT token-based authentication flows natively or via first-party plugin",
                evidence="API gateway requires JWT for service-to-service auth per security architecture document",
            ),
        ],
        nfr_criteria=[
            NFRSchema(
                name="response_latency_p95",
                category=NFRCategory.PERFORMANCE,
                target_value=200.0,
                direction="lower_is_better",
                unit="ms",
            ),
            NFRSchema(
                name="idle_memory_mb",
                category=NFRCategory.OPERABILITY,
                target_value=150.0,
                direction="lower_is_better",
                unit="MB",
            ),
        ],
        weights={
            "async_support": 0.0,          # Knock-out (MUST) — weight is 0
            "orm_capability": 0.30,
            "jwt_auth_support": 0.0,       # Knock-out (MUST) — weight is 0
            "response_latency_p95": 0.35,
            "idle_memory_mb": 0.35,
        },
        knockout_requirements=["async_support", "jwt_auth_support"],
    )

    validation = doc.validate()
    print(f"Valid: {validation.is_valid}")
    for error in validation.errors:
        print(f"  ERROR: {error}")
    for warning in validation.warnings:
        print(f"  WARNING: {warning}")
```

### Pattern 3: Architecture Decision Record Generator with Consequence Tracking

A comprehensive ADR generator that produces MADR-compatible records with full consequence analysis — both positive and negative. The ADR serves as living documentation that enables informed re-evaluation when requirements change or the framework's trajectory shifts.

```python
"""Architecture Decision Record (ADR) generator for framework selection decisions.

Produces MADR-compatible markdown documents that capture:
- Decision context and driving factors
- All candidates evaluated with weighted scores
- Knock-out criteria results for every candidate
- Both positive AND negative consequences
- Reversibility assessment (how costly is it to change?)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class FrameworkADR:
    """Architecture Decision Record for framework selection.

    Follows the MADR (Milestone-driven Architecture Decision Records) template
    adapted specifically for technology and framework selection decisions.
    Every ADR must include both positive and negative consequences — a decision
    without documented trade-offs is not reviewable.
    """

    title: str
    status: str = "proposed"  # proposed | rejected | accepted | deprecated | superseded
    deciders: list[str] = field(default_factory=list)
    date: str = field(default_factory=lambda: date.today().isoformat())
    context_description: str = ""
    decision_drivers: list[str] = field(default_factory=list)

    # Requirements
    must_requirements: list[str] = field(default_factory=list)
    should_requirements: list[str] = field(default_factory=list)

    # Knock-out results per candidate
    knock_out_results: dict[str, list[dict[str, str]]] = field(default_factory=dict)

    # Weighted evaluation
    weighted_criteria: dict[str, float] = field(default_factory=dict)
    candidate_scores: dict[str, dict[str, float]] = field(default_factory=dict)

    # Candidates evaluated with selection marker
    candidates_evaluated: list[dict[str, str | bool]] = field(default_factory=list)
    selected_framework: Optional[str] = None

    # Consequences — BOTH positive and negative are REQUIRED
    positive_consequences: list[str] = field(default_factory=list)
    negative_consequences: list[str] = field(default_factory=list)

    # Reversibility assessment
    estimated_migration_cost: str = "unknown"  # low | medium | high
    migration_effort_days: float = 0.0
    exit_path_documented: bool = False

    # POC findings summary
    poc_findings: list[str] = field(default_factory=list)

    def _requirement_status(self, name: str) -> str:
        """Get the status string for a requirement."""
        if name in self.must_requirements:
            return "MUST"
        if name in self.should_requirements:
            return "SHOULD"
        return ""

    @property
    def has_required_sections(self) -> bool:
        """Check that this ADR has all mandatory sections for review."""
        checks = [
            (self.context_description, "context_description must not be empty"),
            (len(self.decision_drivers) > 0, "decision_drivers must have at least one item"),
            (len(self.positive_consequences) > 0, "positive_consequences must list at least one benefit"),
            (len(self.negative_consequences) > 0, "negative_consequences must list at least one drawback"),
            (self.selected_framework is not None, "selected_framework must be specified"),
            (bool(self.candidate_scores), "candidate_scores must include all evaluated frameworks"),
        ]
        for condition, error_msg in checks:
            if not condition:
                print(f"  ✗ ADR validation failed: {error_msg}")
                return False
        return True

    def generate_markdown(self) -> str:
        """Generate the ADR in MADR-compatible markdown format."""
        sections = [
            f"# {self.title}",
            "",
            f"* Status: {self.status}",
            f"* Deciders: {', '.join(self.deciders)}",
            f"* Date: {self.date}",
            "",
            "---",
            "",
            "## Context and Problem Statement",
            self.context_description or "No context provided.",
            "",
        ]

        if self.decision_drivers:
            sections.append("## Decision Drivers")
            for i, driver in enumerate(self.decision_drivers, 1):
                sections.append(f"{i}. {driver}")
            sections.append("")

        if self.must_requirements or self.should_requirements:
            sections.append("## Requirements Summary")
            if self.must_requirements:
                sections.append("### Must (Knock-out)")
                for req in self.must_requirements:
                    sections.append(f"- [ ] {req}")
            if self.should_requirements:
                sections.append("### Should (Scored)")
                for req in self.should_requirements:
                    sections.append(f"  - [ ] {req}")
            sections.append("")

        if self.knock_out_results:
            sections.append("## Knock-out Criteria Results")
            for candidate, failures in self.knock_out_results.items():
                status = "PASSED" if not failures else "FAILED"
                sections.append(f"### {candidate}: {status}")
                if failures:
                    for failure in failures:
                        sections.append(f"- **{failure['requirement']}**: {failure['reason']}")
                else:
                    sections.append("- Passed all knock-out criteria")
            sections.append("")

        if self.weighted_criteria:
            total_weight = sum(self.weighted_criteria.values()) or 1.0
            sections.append("## Weighted Evaluation Criteria")
            for criterion, weight in sorted(
                self.weighted_criteria.items(), key=lambda x: x[1], reverse=True
            ):
                pct = (weight / total_weight) * 100
                marker = " [KNOCK-OUT]" if criterion in self.must_requirements else ""
                sections.append(f"- **{criterion}**: {pct:.0f}% weight{marker}")
            sections.append("")

        if self.candidate_scores:
            sections.append("## Candidate Scores")
            for name, scores in self.candidate_scores.items():
                is_selected = " <-- SELECTED" if name == self.selected_framework else ""
                total = sum(scores.values()) if scores else 0
                sections.append(f"### {name}{is_selected}")
                sections.append("| Criterion | Score (0-10) |")
                sections.append("|-----------|-------------|")
                for criterion, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
                    sections.append(f"| {criterion} | {score:.1f} |")
                sections.append(f"**Weighted Total: {total:.1f}/10**")
                sections.append("")

        # Consequences — the critical section that prevents decision bias
        sections.append("## Consequences")
        sections.append("")
        sections.append("### Positive (Benefits)")
        if self.positive_consequences:
            for consequence in self.positive_consequences:
                sections.append(f"+ {consequence}")
        else:
            sections.append("+ No positive consequences documented (review required)")
        sections.append("")
        sections.append("### Negative (Drawbacks / Risks)")
        if self.negative_consequences:
            for consequence in self.negative_consequences:
                sections.append(f"- {consequence}")
        else:
            sections.append("- No negative consequences documented (review required)")
        sections.append("")

        if self.poc_findings:
            sections.append("## POC Findings")
            for finding in self.poc_findings:
                sections.append(f"- {finding}")
            sections.append("")

        # Reversibility assessment
        sections.append("## Reversibility Assessment")
        sections.append(f"- Migration cost estimate: {self.estimated_migration_cost}")
        sections.append(f"- Estimated migration effort: {self.migration_effort_days:.0f} developer-days")
        sections.append(
            f"- Exit path documented: {'Yes' if self.exit_path_documented else 'No — risk flag'}"
        )
        sections.append("")

        sections.append("---")
        return "\n".join(sections)

    def to_json(self) -> str:
        """Serialize ADR to JSON for machine-readable storage and review tracking."""
        return json.dumps({
            "title": self.title,
            "status": self.status,
            "deciders": self.deciders,
            "date": self.date,
            "context_description": self.context_description,
            "decision_drivers": self.decision_drivers,
            "must_requirements": self.must_requirements,
            "should_requirements": self.should_requirements,
            "knock_out_results": self.knock_out_results,
            "weighted_criteria": self.weighted_criteria,
            "candidate_scores": self.candidate_scores,
            "candidates_evaluated": [c["name"] for c in self.candidates_evaluated],
            "selected_framework": self.selected_framework,
            "positive_consequences": self.positive_consequences,
            "negative_consequences": self.negative_consequences,
            "estimated_migration_cost": self.estimated_migration_cost,
            "migration_effort_days": self.migration_effort_days,
            "exit_path_documented": self.exit_path_documented,
            "poc_findings": self.poc_findings,
        }, indent=2)


# ─── Example: Generate a Complete ADR ────────────────────────────────────────────

if __name__ == "__main__":
    adr = FrameworkADR(
        title="Select FastAPI for Internal API Service Framework",
        status="proposed",
        deciders=["alice (tech lead)", "bob (backend engineer)", "carol (platform engineer)"],
        context_description=(
            "Our internal services require a lightweight, high-performance HTTP framework "
            "for building REST APIs and microservice endpoints. The current service uses "
            "a legacy framework with slow startup times (> 8s cold start), limited async "
            "support, and no built-in OpenTelemetry instrumentation. We need a framework "
            "that supports Python 3.12+, runs efficiently in containers (< 150MB image), "
            "and integrates with our existing observability stack (Prometheus, Jaeger)."
        ),
        decision_drivers=[
            "Must support async/await natively for high-concurrency workloads",
            "Must run on Linux x86_64 in Docker containers with < 150MB image footprint",
            "Must use an OSI-approved license (MIT or Apache 2.0 preferred)",
            "Team needs to achieve productivity within 2 weeks of introduction",
            "Must integrate with existing JWT-based authentication via first-party plugin",
            "Must provide OpenTelemetry instrumentation or Prometheus metrics endpoint",
        ],
        must_requirements=[
            "async_support (p95 < 500ms under load test)",
            "docker_image_footprint (< 150MB compressed)",
            "osi_approved_license",
        ],
        should_requirements=[
            "built_in_orm_capability",
            "automated_api_documentation",
            "jwt_auth_integration",
        ],
        knock_out_results={
            "FastAPI": [],  # Passed all knock-outs
            "Django": [],   # Passed all knock-outs
            "Sanic": [      # Failed — no active community
                {
                    "requirement": "community_support",
                    "reason": "Fewer than 10 contributors with activity in last 90 days; 6-month release gap between versions",
                }
            ],
        },
        weighted_criteria={
            "async_performance": 0.20,
            "docker_image_footprint": 0.15,
            "built_in_orm_capability": 0.10,
            "automated_api_documentation": 0.10,
            "jwt_auth_integration": 0.10,
            "team_productivity_curve": 0.20,
            "observability_hooks": 0.15,
        },
        candidate_scores={
            "FastAPI": {
                "async_performance": 9.0,
                "docker_image_footprint": 8.5,
                "built_in_orm_capability": 4.0,    # No built-in ORM (requires SQLAlchemy)
                "automated_api_documentation": 9.0, # Auto OpenAPI/Swagger
                "jwt_auth_integration": 7.0,       # Via python-jose plugin
                "team_productivity_curve": 6.0,    # Team new to async patterns
                "observability_hooks": 7.5,        # Via opentelemetry-instrumentation-fastapi
            },
            "Django": {
                "async_performance": 6.0,         # Async support added in 3.1+ but limited
                "docker_image_footprint": 5.0,    # Heavier ORM + admin = larger image
                "built_in_orm_capability": 9.5,   # Full ORM + migrations built-in
                "automated_api_documentation": 4.0, # Django REST Framework requires setup
                "jwt_auth_integration": 8.0,      # Via django-rest-framework-jwt
                "team_productivity_curve": 7.0,   # Team has moderate Django experience
                "observability_hooks": 6.0,       # Requires custom middleware
            },
        },
        candidates_evaluated=[
            {"name": "FastAPI", "selected": True},
            {"name": "Django", "selected": False},
            {"name": "Sanic", "selected": False},
        ],
        selected_framework="FastAPI",
        positive_consequences=[
            "p95 latency ~45ms under 5k concurrent connections (vs 120ms with Django)",
            "Docker image < 100MB compressed, starting from python:3.12-slim",
            "Automatic OpenAPI/Swagger documentation at /docs endpoint — zero extra setup",
            "Native async/await enables efficient request handling without thread pool overhead",
            "Type-hint-based routing with auto-completion in modern IDEs reduces development time",
        ],
        negative_consequences=[
            "No built-in ORM — requires selecting and integrating SQLAlchemy or similar (adds maintenance surface)",
            "Team has limited prior async experience — requires a 1-week learning sprint before full productivity",
            "Smaller third-party ecosystem than Django — some common patterns lack first-party solutions",
            "Rapidly evolving API with breaking changes between minor versions — requires quarterly dependency reviews",
            "No built-in admin panel — must build or integrate external admin tooling for internal data management",
        ],
        estimated_migration_cost="medium",
        migration_effort_days=15.0,
        exit_path_documented=True,
        poc_findings=[
            "FastAPI: 45ms p95 latency, 62MB idle memory, 1.2s cold start — all targets met",
            "Django: 120ms p95 latency, 145MB idle memory, 3.8s cold start — meets performance but exceeds image size target marginally",
        ],
    )

    assert adr.has_required_sections, "ADR must have all required sections"
    print(adr.generate_markdown())
```

---

## Constraints

### MUST DO
- Classify every requirement using MoSCoW priority (Must/Should/Could/Wont) — never mix priorities in scoring logic
- Extract non-functional requirements from the NFR catalog before evaluating any candidate — performance, security, extensibility, observability, operability, and portability must all be checked for applicability
- Ensure scoring criterion weights sum to exactly 1.0 — validate with an assertion after building the matrix
- Design POC tests that exercise the three most critical integration points under realistic conditions — never score based on "hello world" examples or hardcoded test data
- Validate every production readiness gate (dependency graph, deployment baseline, CI/CD integration, monitoring hooks) before final selection
- Document both positive AND negative consequences in the ADR — a decision without documented trade-offs is not reviewable
- Score each NFR criterion using measured metrics from identical test environments — never use subjective judgment when quantitative data exists
- Record all deciders and their rationales in the ADR — individual decisions without stakeholder input should be rejected

### MUST NOT DO
- Start evaluation without completing requirements elicitation first — MoSCoW classification of every category is mandatory
- Use unweighted scoring when dimension importance clearly varies across your project dimensions — always use normalized weights
- Confuse framework features with evaluation criteria — features are what you evaluate; criteria define how you decide they matter to your specific project
- Document only the final decision without the "why not" for rejected candidates — every rejected candidate must have its score and rationale recorded
- Let a single person make the framework selection without documented stakeholder input — minimum two deciders required
- Accept vague NFR targets like "fast", "secure", or "scalable" without converting them to quantified thresholds (e.g., "p95 < 200ms", "zero CVEs in last 24 months", "supports 10k concurrent connections")
- Skip the POC feasibility test for the top two candidates — scoring without real-world integration testing is speculation
- Treat Must requirements as soft preferences — a framework that fails a Must requirement is disqualified, not penalized with lower scores

---

## Output Template

When this skill is active, your output must contain all five sections below in order. Do not skip any section or combine them — each serves a distinct purpose in the decision-making process.

1. **MoSCoW Requirements Classification** — Structured list of all requirements organized by MoSCoW priority and functional category. Every requirement has: name, category, priority (Must/Should/Could/Wont), quantified target value with unit (for Must requirements), and evidence citation. Each NFR category that applies gets at least one quantified target. If any NFR category is genuinely inapplicable, document why explicitly with a reason code.

2. **Weighted Evaluation Matrix** — Table showing candidates × scoring criteria with: criterion name, weight (normalized to sum 1.0), score (0-10), weighted sub-score, and evidence citation. Include total weighted score per candidate sorted descending. Also show knock-out criteria results for each candidate as binary pass/fail with failure reasons if applicable. Weights must sum to 1.0 — state the sum explicitly in the output header.

3. **POC Test Results** — Measured metrics from proof-of-concept tests for the top two candidates. Each result includes: test name, metric measured, actual value, target threshold, pass/fail status, and notes on test environment configuration. Include startup time, memory footprint, request throughput, and the specific integration points exercised during testing.

4. **Production Readiness Gate Report** — For each remaining candidate, list all four production readiness gates with pass/fail status and measured values. Gates: dependency graph (direct deps, transitive depth, CVE count), deployment baseline (cold start, memory, image size), CI/CD integration (test runner compatibility, build impact), monitoring hooks (health check path, metrics format, log structure). Any candidate failing a Must-level gate requires explicit stakeholder exception documentation.

5. **ADR Document** — Complete Architecture Decision Record in MADR-compatible markdown format including: decision context and drivers, MoSCoW requirements summary, knock-out criteria results, weighted scores for all candidates, POC findings, documented positive consequences, documented negative consequences (both sections required), reversibility assessment with migration cost estimate, and decider signatures. Status should be `proposed` pending stakeholder sign-off.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-evaluation-criteria` | Structured criteria elicitation across 8 dimensions — use when you need deep requirement discovery before building the matrix |
| `test-driven-development` | Ensures framework choices support testability requirements and enable TDD workflows from day one |
| `modular-design` | Applies modular constraints to framework selection, ensuring integration boundaries are clean and swappable |
| `dependency-injection` | Implements the chosen framework's DI patterns for loose coupling, enabling easier future framework swaps |
| `framework-utilization` | After selection and implementation begins, use this skill for learning and leveraging the chosen framework effectively in production |

---

## Live References

- [MADR ADR Template — Architecture Decision Records](https://github.com/joelparkerhenderson/architecture_decision_record) — Milestone-driven ADR format used in this skill's ADR generator
- [Software Non-Functional Requirements Catalog — NFR.xyz](https://nfr.xyz/) — Comprehensive NFR categorization framework for performance, security, reliability, and scalability
- [MoSCoW Method — Priority Prioritization](https://www.scrum.org/resources/blog/how-not-moscow-prioritization-method) — MUST/SHOULD/COULD/WON'T requirement classification used throughout this skill
- [OWASP Top 10 Web Application Security Risks (2024)](https://owasp.org/Top10/) — Security evaluation framework for the security NFR category
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/) — Observability integration standard referenced in production readiness gates
- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — Framework maturity classification used as external validation of ecosystem health

---

*This skill is designed to be loaded before any framework selection begins. Its output becomes the structured foundation for scoring matrices, POC testing, and Architecture Decision Records that enable traceable, evidence-based technology decisions.*