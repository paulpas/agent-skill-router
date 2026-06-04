---




name: "framework-evaluation"
description: Evaluates and scores competing frameworks using weighted criteria matrices,
  AHP decision-making, risk assessment, and migration planning to select the optimal
  technology stack for project requirements.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework selection, tech stack evaluation, weighted scoring matrix, AHP decision, framework comparison, technology assessment, framework criteria, evaluate frameworks decision
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
  related-skills: framework-requirements, software-architecture, hexagonal-architecture




---




# Framework Selection Engine

Evaluates and scores competing frameworks using weighted criteria matrices, AHP (Analytic Hierarchy Process) decision-making, risk assessment, and migration planning. This skill turns subjective framework debates into data-driven selection decisions backed by quantitative scoring and documented trade-offs.

## TL;DR Checklist

- [ ] Define weighted evaluation criteria based on project requirements (not opinions)
- [ ] Build a scoring matrix with numeric scores for each framework against each criterion
- [ ] Calculate weighted totals and identify the leading candidate
- [ ] Run risk assessment: maturity, community support, lock-in potential, performance bottlenecks
- [ ] Document trade-offs in an Architecture Decision Record (ADR)
- [ ] Plan integration path: dependency injection, abstraction layers, migration strategy

---

## When to Use

- Comparing multiple frameworks for a new project or major rewrite (e.g., FastAPI vs. Flask vs. Django REST)
- Selecting a frontend framework for a greenfield application (React vs. Vue vs. Svelte vs. Solid)
- Evaluating database access layers, ORM choices, or serialization libraries
- Deciding between competing infrastructure frameworks (Terraform vs. Pulumi vs. CDK)
- Re-evaluating an existing framework due to performance issues, maintenance burden, or ecosystem decline

## When NOT to Use

- When a single clear winner exists and the team is already aligned — use a quick technical spike instead
- For micro-decisions (e.g., "which linter") — apply team conventions or automated tooling
- When the project timeline doesn't allow for proper evaluation — document the decision as a temporary choice

---

## Core Workflow

### Step 1: Define Evaluation Criteria from Requirements

Extract concrete technical and business requirements. Translate each requirement into an evaluatable criterion with an explicit weight reflecting its importance to the project. Use the MoSCoW method (Must have, Should have, Could have, Won't have) to filter noise.

**Checkpoint:** Every criterion must be measurable. "Good performance" is not measurable — "handles 10k concurrent connections under 50ms P95 latency" is.

Example criteria for a REST API framework:
- **REST support quality (weight: 20%)** — Built-in routing, serialization, validation, OpenAPI generation
- **Performance / throughput (weight: 18%)** — Requests per second, memory footprint under load
- **Ecosystem maturity (weight: 15%)** — Available middleware, plugins, community packages
- **Learning curve / team familiarity (weight: 12%)** — Onboarding time for new developers
- **Type safety (weight: 10%)** — Static typing support, generics, compile-time guarantees
- **Async support (weight: 10%)** — Native async/await, connection pooling, non-blocking I/O
- **Testing tooling (weight: 8%)** — Built-in test client, mocking capabilities, coverage tools
- **Deployment model compatibility (weight: 7%)** — Container readiness, serverless support, process management

### Step 2: Score Each Framework Against Criteria

For each framework candidate, assign a score from 1–10 for each criterion. Scores must be justified with evidence: benchmarks, documentation analysis, community metrics, or hands-on spikes. Never score from opinion alone.

**Evidence sources to prioritize:**
- Published benchmarks (Artillery, k6, wrk)
- GitHub stars / forks growth trend (last 12 months)
- Package ecosystem size and update frequency (npm/PyPI downloads per month)
- Issue resolution time and release cadence
- Hands-on spike results (time to build a comparable feature)

**Checkpoint:** Cross-validate scores. If two people score independently, variance on any criterion should be ≤ 2 points. Larger variance means the criterion needs clarification or the scoring evidence is insufficient.

### Step 3: Calculate Weighted Scoring Matrix

Compute weighted totals for each framework. The highest-scoring candidate is the data-driven recommendation. Use the implementation patterns below to build this computation.

**Checkpoint:** Verify that weights sum to exactly 1.0 (or 100%). Re-check arithmetic before presenting results.

### Step 4: Run Risk Assessment on Top Candidates

Even the highest-scoring framework may carry hidden risks. For each top candidate (usually the top 2), perform a structured risk assessment across these dimensions:

**Maturity Risk** — How long has the framework been in production use? Are major releases stable? Check CVE history, breaking change frequency, and deprecation policies.

**Community & Maintenance Risk** — Is there an active maintainer or organization behind it? What is the issue response time? Check contributor activity patterns: are 1–2 people doing all commits (bus factor risk)?

**Vendor / Lock-in Risk** — Does using this framework create hard-to-reverse migration paths? Evaluate how tightly business logic couples to framework-specific APIs. Frameworks that require deep integration with proprietary tooling pose higher lock-in risk.

**Performance Risk** — Can the framework handle projected load? Review benchmark ceilings, known performance bottlenecks, and scalability limits documented in production case studies.

### Step 5: Document Trade-offs in an ADR

Every framework selection must be documented as an Architecture Decision Record (ADR). An ADR captures the context, the options considered, the decision made, and the consequences — both positive and negative. This creates institutional knowledge that survives team turnover.

Required ADR sections:
1. **Context** — What problem are we solving? What requirements drove this decision?
2. **Options Considered** — All frameworks evaluated with brief rationale for inclusion
3. **Decision** — The chosen framework and the primary reasons
4. **Consequences** — Trade-offs accepted, risks acknowledged, mitigation plans
5. **Alternatives Rejected** — Which candidates were eliminated and why

**Checkpoint:** An ADR without "Alternatives Rejected" is incomplete. Every option that scored above 60% of the winner must be documented with explicit rejection reasons.

### Step 6: Plan Integration Path

Framework selection is not the end — it's the beginning of implementation planning. Document how the chosen framework will be integrated to minimize coupling and maximize testability.

Key integration considerations:
- Dependency injection strategy for decoupling framework-specific code from domain logic
- Configuration management approach (environment variables, config files, secret stores)
- Extension mechanisms: middleware, hooks, plugins — how custom behavior plugs in
- Testing strategy: mocking framework internals vs. integration testing the real framework
- Migration path if the framework fails or becomes unsupportable

**Checkpoint:** If you cannot write a test that exercises core business logic without importing the framework, the coupling is too tight. Design for testability from day one.

---

## Implementation Patterns

### Pattern 1: Weighted Criteria Scoring Engine

This Python class implements the weighted scoring matrix computation. It handles criteria definition, score entry with justification, and weighted total calculation with validation.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Criterion:
    """A single evaluation criterion with its weight and name."""
    name: str
    weight: float  # 0.0 to 1.0, must sum to 1.0 across all criteria
    description: str
    category: str  # "must-have", "should-have", "could-have", "won't-have"


@dataclass
class ScoreEntry:
    """A scored framework against a single criterion, with evidence."""
    framework: str
    criterion: str
    score: int  # 1-10 integer scale
    justification: str  # Evidence or rationale for the score
    evidence_source: Optional[str] = None  # URL, benchmark name, spike notes


@dataclass
class FrameworkScore:
    """Aggregated weighted score for a single framework."""
    name: str
    raw_scores: dict[str, int]  # criterion_name -> score
    weighted_total: float  # sum of (criterion.weight * criterion_score / 10)
    rank: int


class FrameworkScorer:
    """Computes weighted scoring matrices for framework evaluation."""

    def __init__(self, criteria: list[Criterion]):
        self.criteria = {c.name: c for c in criteria}
        total_weight = sum(c.weight for c in criteria)
        if abs(total_weight - 1.0) > 1e-9:
            raise ValueError(
                f"Criteria weights must sum to 1.0, got {total_weight:.4f}"
            )

    def add_scores(self, framework_name: str, scores: list[ScoreEntry]) -> FrameworkScore:
        """Add scored entries for a framework and compute weighted total."""
        raw_scores: dict[str, int] = {}
        weighted_total = 0.0

        for entry in scores:
            if entry.criterion not in self.criteria:
                raise KeyError(f"Unknown criterion '{entry.criterion}'")
            if not 1 <= entry.score <= 10:
                raise ValueError(
                    f"Score for {framework_name} / {entry.criterion} must be 1-10, "
                    f"got {entry.score}"
                )

            raw_scores[entry.criterion] = entry.score
            criterion_weight = self.criteria[entry.criterion].weight
            weighted_total += criterion_weight * (entry.score / 10)

        return FrameworkScore(
            name=framework_name,
            raw_scores=raw_scores,
            weighted_total=round(weighted_total * 10, 2),  # Scale to 0-10 for readability
            rank=0,  # Set after all frameworks scored
        )

    def compute_matrix(self) -> dict[str, FrameworkScore]:
        """Return all scored frameworks sorted by weighted total (descending)."""
        ranked = sorted(
            self._frameworks.values(),
            key=lambda f: f.weighted_total,
            reverse=True,
        )
        for rank_idx, framework in enumerate(ranked, start=1):
            framework.rank = rank_idx

        return {f.name: f for f in ranked}

    _frameworks: dict[str, FrameworkScore] = field(default_factory=dict)
```

### Pattern 2: Risk Assessment Matrix

This pattern implements a structured risk assessment for the top-ranked framework candidates. Each dimension is scored independently and produces an overall risk profile.

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class RiskDimension:
    name: str
    score: int  # 1 (critical) to 5 (negligible)
    evidence: str
    mitigation: Optional[str] = None


@dataclass
class FrameworkRiskProfile:
    framework_name: str
    maturity: RiskDimension
    community: RiskDimension
    lock_in: RiskDimension
    performance: RiskDimension

    @property
    def average_risk_score(self) -> float:
        """Higher score = lower risk. 5 is best (negligible)."""
        dimensions = [self.maturity, self.community, self.lock_in, self.performance]
        return sum(d.score for d in dimensions) / len(dimensions)

    def summary(self) -> str:
        """Generate human-readable risk summary."""
        avg = self.average_risk_score
        if avg >= 4.0:
            level = "LOW"
        elif avg >= 3.0:
            level = "MODERATE"
        elif avg >= 2.0:
            level = "HIGH"
        else:
            level = "CRITICAL"

        lines = [f"Framework: {self.framework_name}", f"Overall Risk Level: {level} ({avg:.1f}/5)"]
        for dim in [self.maturity, self.community, self.lock_in, self.performance]:
            lines.append(f"  {dim.name}: {dim.score}/5 — {dim.evidence}")
            if dim.mitigation:
                lines.append(f"    Mitigation: {dim.mitigation}")
        return "\n".join(lines)


def assess_risks(
    framework_name: str,
    maturity_years: int,
    monthly_downloads: Optional[int] = None,
    primary_maintainers: int = 1,
    has_proven_lock_in_paths: bool = False,
    benchmark_rps_cap: Optional[int] = None,
) -> FrameworkRiskProfile:
    """Compute risk profile from observable framework metrics."""

    # Maturity scoring based on years of production use
    maturity_score = min(5, max(1, 1 + (maturity_years // 2)))

    # Community scoring based on maintainer count and activity
    community_base = min(5, primary_maintainers)
    if monthly_downloads and monthly_downloads > 1_000_000:
        community_score = max(community_base, 4)
    elif monthly_downloads and monthly_downloads > 100_000:
        community_score = max(community_base, 3)
    else:
        community_score = community_base

    # Lock-in scoring
    lock_in_score = 2 if has_proven_lock_in_paths else 5

    # Performance scoring
    if benchmark_rps_cap is None:
        performance_score = 3  # Unknown = moderate risk
    elif benchmark_rps_cap >= 50_000:
        performance_score = 4
    elif benchmark_rps_cap >= 10_000:
        performance_score = 3
    else:
        performance_score = 2

    return FrameworkRiskProfile(
        framework_name=framework_name,
        maturity=RiskDimension(
            name="Maturity",
            score=maturity_score,
            evidence=f"Production use for {maturity_years} years",
        ),
        community=RiskDimension(
            name="Community & Maintenance",
            score=community_score,
            evidence=(
                f"{primary_maintainers} primary maintainer(s)"
                + (f", {monthly_downloads:,} monthly downloads" if monthly_downloads else "")
            ),
            mitigation=(
                "Cross-train at least 2 developers on framework internals to reduce bus factor"
                if primary_maintainers <= 2
                else None
            ),
        ),
        lock_in=RiskDimension(
            name="Lock-in Risk",
            score=lock_in_score,
            evidence=(
                "Framework has documented migration paths and low vendor-specific coupling"
                if not has_proven_lock_in_paths
                else "Framework couples business logic to proprietary tooling/APIs"
            ),
        ),
        performance=RiskDimension(
            name="Performance Risk",
            score=performance_score,
            evidence=(
                f"Benchmark ceiling: {benchmark_rps_cap:,} rps"
                if benchmark_rps_cap
                else "No published benchmark data available"
            ),
        ),
    )
```

### Pattern 3: ADR Documentation Generator

Generates a structured Architecture Decision Record from evaluation results.

```python
from datetime import date


def generate_adr(
    title: str,
    context: str,
    options: list[str],
    decision: str,
    rationale: list[str],
    consequences: list[str],
    rejected_alternatives: dict[str, str],
    authors: Optional[list[str]] = None,
    status: str = "proposed",  # proposed | accepted | deprecated | superseded
) -> str:
    """Generate a Markdown ADR from evaluation data."""

    lines = [
        f"# {title}",
        "",
        f"**Status:** {status}  ",
        f"**Date:** {date.today().isoformat()}  ",
        *(f"**Authors:** {', '.join(authors)}" if authors else ""),
        "",
        "---",
        "",
        "## Context",
        context,
        "",
        "## Options Considered",
    ]

    for opt in options:
        lines.append(f"- `{opt}`")

    lines.extend(["", "## Decision", decision, ""])

    lines.append("### Rationale")
    for reason in rationale:
        lines.append(f"- {reason}")

    lines.append("")
    lines.append("### Consequences")
    for consequence in consequences:
        lines.append(f"- {consequence}")

    if rejected_alternatives:
        lines.extend(["", "## Alternatives Rejected"])
        for alternative, reason in rejected_alternatives.items():
            lines.extend([f"- **{alternative}:** {reason}"])

    return "\n".join(lines) + "\n"


# Example usage:
def example_adr():
    """Demonstrate ADR generation from a framework evaluation."""

    return generate_adr(
        title="Select FastAPI over Flask and Django REST for REST API Framework",
        context=(
            "We are building a high-throughput REST API service that must handle 10k concurrent "
            "connections with P95 latency under 50ms. The team has experience with Python web "
            "frameworks but no deep expertise in async frameworks."
        ),
        options=["FastAPI", "Flask + gunicorn", "Django REST Framework"],
        decision="We select FastAPI as the primary REST API framework.",
        rationale=[
            "Highest weighted score (8.7/10) driven by superior async support and type safety",
            "Native Pydantic validation eliminates a dependency layer",
            "OpenAPI/Swagger auto-generation reduces documentation overhead",
            "Benchmark spike showed 3.2x throughput over Flask under equivalent load",
        ],
        consequences=[
            "Positive: Automatic API docs reduce frontend-backend integration friction",
            "Positive: Type hints catch errors at development time, not runtime",
            "Risk: Team has less async Python experience — allocate 1-week training spike",
            "Risk: Smaller ecosystem than Flask — verify needed plugins exist before full commit",
        ],
        rejected_alternatives={
            "Flask + gunicorn": (
                "Lower throughput in benchmarks (3x slower async handling). "
                "No built-in type safety or OpenAPI generation."
            ),
            "Django REST Framework": (
                "Heavy ORM dependency creates lock-in risk for a service that needs only API layer. "
                "Higher memory footprint unsuitable for containerized deployment constraints."
            ),
        },
        authors=["Backend Team Lead", "Principal Engineer"],
    )
```

### Pattern 4: Analytic Hierarchy Process (AHP) Pairwise Comparison

For complex decisions with many criteria, use AHP to compute criterion weights from expert pairwise judgments rather than arbitrary weight assignment. This is more rigorous for multi-criteria decisions where relative importance is hard to quantify directly.

```python
from typing import Optional


def ahp_pairwise_consistency_check(matrix: list[list[float]]) -> float:
    """
    Compute the Consistency Ratio (CR) for an AHP pairwise comparison matrix.
    
    CR < 0.10 indicates acceptable consistency. Higher values mean judgments
    are contradictory and the evaluator should reconsider their comparisons.
    
    Args:
        matrix: n x n pairwise comparison matrix where matrix[i][j] = 
                relative importance of criterion i vs criterion j.
                Values use Saaty scale: 1 (equal), 3 (moderate), 5 (strong),
                7 (very strong), 9 (extreme). Reciprocals used for inverse comparisons.
    
    Returns:
        Consistency Ratio (CR). < 0.10 = acceptable consistency.
    """
    import math

    n = len(matrix)

    # Step 1: Compute column sums
    col_sums = [sum(matrix[row][col] for row in range(n)) for col in range(n)]

    # Step 2: Normalize matrix (divide each element by its column sum)
    normalized = []
    for row in range(n):
        norm_row = [matrix[row][col] / col_sums[col] if col_sums[col] > 0 else 0
                    for col in range(n)]
        normalized.append(norm_row)

    # Step 3: Compute weight vector (average of each row)
    weights = [sum(row) / n for row in normalized]

    # Step 4: Compute lambda_max (maximum eigenvalue)
    Aw = [sum(matrix[row][col] * weights[col] for col in range(n)) for row in range(n)]
    lambda_max = sum(Aw[row] / weights[row] if weights[row] > 0 else 0
                     for row in range(n)) / n

    # Step 5: Compute Consistency Index and Ratio
    CI = (lambda_max - n) / (n - 1) if n > 1 else 0

    # Random Index table for standard AHP sizes
    random_indices = {2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24,
                      7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
    RI = random_indices.get(n, 1.49)

    CR = CI / RI if RI > 0 else 0
    return round(CR, 4)


def ahp_compute_weights(pairs: dict[tuple[str, str], float]) -> tuple[dict[str, float], float]:
    """
    Compute AHP weights from pairwise comparison judgments.
    
    Args:
        pairs: Dictionary mapping (criterion_a, criterion_b) tuples to their 
               relative importance on the Saaty scale (1-9).
    
    Returns:
        Tuple of (normalized weight dict for each criterion, Consistency Ratio).
    
    Example:
        pairs = {
            ("Performance", "Ecosystem"): 3,   # Performance is moderately more important
            ("Type Safety", "Async Support"): 5, # Type safety is strongly more important
        }
    """
    import math

    criterion_names = set()
    for (a, b) in pairs:
        criterion_names.add(a)
        criterion_names.add(b)
    criteria = sorted(criterion_names)
    idx = {name: i for i, name in enumerate(criteria)}
    n = len(criteria)

    matrix = [[1.0] * n for _ in range(n)]
    for (a, b), val in pairs.items():
        if a in idx and b in idx:
            i, j = idx[a], idx[b]
            matrix[i][j] = val
            matrix[j][i] = 1.0 / val

    # Compute normalized weights
    col_sums = [sum(matrix[r][c] for r in range(n)) for c in range(n)]
    weights: dict[str, float] = {}
    for row in range(n):
        avg = sum(matrix[row][col] / col_sums[col] if col_sums[col] > 0 else 0
                  for col in range(n)) / n
        weights[criteria[row]] = round(avg, 4)

    # Verify consistency
    CR = ahp_pairwise_consistency_check(matrix)
    return weights, CR
```

---

## Constraints

### MUST DO
- Always ground scores in evidence (benchmarks, spikes, metrics), never opinions alone
- Require all criteria to be measurable and quantifiable — no subjective "gut feel" scoring
- Ensure criteria weights sum to exactly 1.0 before computing final scores
- Document rejected alternatives with explicit reasoning — every option above 60% of the winner must be addressed
- Perform risk assessment on top candidates, not just the winner
- Write tests for the scoring engine and risk assessment to ensure reproducibility

### MUST NOT DO
- Do not use subjective adjectives ("good", "mature", "popular") without quantifying them
- Do not weight all criteria equally — if everything is equally important, nothing is important
- Do not skip the ADR documentation step — undocumented decisions become tribal knowledge
- Do not let team seniority override data — a principal engineer's opinion carries no more weight than the evidence
- Do not select a framework that cannot be tested without importing its internals
- Do not ignore lock-in risk — frameworks that tightly couple business logic to proprietary APIs create expensive migration costs later

---

## Output Template

When this skill is active, produce:

1. **Criteria Definition** — Table of all evaluation criteria with weights (summing to 1.0) and categories (Must/Should/Could/Won't)
2. **Scoring Matrix** — Raw scores table (frameworks × criteria) with evidence annotations for each score
3. **Weighted Results** — Computed weighted totals, rankings, and gap analysis between candidates
4. **Risk Profile** — Risk assessment summary for top 2 candidates with mitigation plans
5. **ADR Draft** — Complete Architecture Decision Record ready for team review
6. **Integration Notes** — Key integration considerations for the chosen framework (dependency injection, testing strategy)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements` | Defines project requirements before selection; feeds into this skill's criteria definition step |
| `software-architecture` | Evaluates architectural patterns that may influence framework choice |
| `hexagonal-architecture` | Designs abstraction layers around the selected framework to minimize coupling and lock-in |

---

## Example: Full Evaluation in Practice

### Project Context
Building a real-time WebSocket notification service requiring 50k concurrent connections, sub-second message delivery, and Python type safety for a team experienced with Django but new to async frameworks.

### Defined Criteria

| Criterion | Weight | Category | Measurable Definition |
|---|---|---|---|
| Concurrent connection handling | 20% | Must-have | Sustained connections per process/thread model |
| Message delivery latency | 18% | Must-have | P95 latency from publish to subscriber receive |
| Type safety support | 12% | Should-have | Native type hints, compile-time checks, protocol definitions |
| Async ecosystem maturity | 10% | Should-have | Available async middleware, connection pooling, backpressure handling |
| Team learning curve | 10% | Could-have | Hours to build a production-ready endpoint after first exposure |
| Deployment model fit | 8% | Must-have | Container readiness, process supervisor compatibility |
| Monitoring / observability | 7% | Should-have | Structured logging, metrics export, tracing support |
| Testing tooling quality | 5% | Could-have | Built-in test client, mock capabilities, coverage integration |

### Scoring Matrix (Illustrative)

| Framework | Connections | Latency | Type Safety | Async Ecosystem | Learning Curve | Deploy Fit | Observability | Testing | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| FastAPI | 8 | 9 | 9 | 7 | 5 | 8 | 8 | 8 | **8.15** |
| Django Channels | 6 | 6 | 4 | 5 | 8 | 7 | 7 | 7 | **6.20** |
| Starlette | 9 | 9 | 5 | 3 | 3 | 6 | 4 | 5 | **6.05** |

Winner: FastAPI at 8.15/10 with significant margin over Django Channels (6.20) and Starlette (6.05).

### Risk Assessment for FastAPI

- **Maturity:** 3/5 — Production use since 2018, but async ecosystem still evolving
- **Community:** 4/5 — Active maintainer (Sebastián Ramírez), 3M+ monthly PyPI downloads
- **Lock-in:** 4/5 — Starlette-based but business logic can be decoupled via Protocol interfaces
- **Performance:** 4/5 — Benchmarks show >100k rps for simple endpoints, well above requirements

Overall risk: LOW (3.75/5). Mitigation: Cross-train one additional developer on async patterns before production rollout.

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Gartner — Software Development Frameworks](https://www.gartner.com/en/information-technology/insights/software-development-frameworks)
- [State of the Developer Ecosystem (JetBrains)](https://www.jetbrains.com/lp/devecosystem/)
- [AWS Architecture Center — Framework Selection Guide](https://aws.amazon.com/architecture/)
- [CNCF Cloud Native Landscape](https://landscape.cncf.io/)
- [Tech Radar by ThoughtWorks](https://www.thoughtworks.com/radar)
