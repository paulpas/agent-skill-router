---
name: requirement-driven-selection
description: Evaluates technology candidates against measurable project requirements
  using weighted decision matrices, evidence-based validation, and ADR documentation
  to select the optimal framework or tool for a given context.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: requirement driven selection, ADR, weighted scoring matrix, how do i choose
    a framework, technology decision record, criteria based selection, tech stack
    choice
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
  related-skills: dependency-inversion-principle, modular-design, test-driven-development,
    hexagonal-architecture
---
# Requirement-Driven Framework Selection

Evaluates technology candidates against measurable project requirements using weighted decision matrices, evidence-based validation, and structured documentation to select the optimal framework or tool. This skill prevents hype-driven decisions by grounding every selection in quantifiable criteria tied directly to the project's needs.

## TL;DR Checklist

- [ ] Extract 5-8 concrete, measurable requirements from project context (each with a numeric threshold)
- [ ] Classify each requirement as MUST (hard constraint) or NICE (weighted preference)
- [ ] Build candidate shortlist: at least 3 options including one wild card unconventional choice
- [ ] Apply weighted scoring matrix across 4-6 criteria categories with evidence-backed scores
- [ ] Execute a focused spike/POC for the top 2 candidates exercising the core use case
- [ ] Document the decision in an Architecture Decision Record (ADR) with full rationale and reversibility plan

---

## When to Use

Use this skill when:

- A project requires selecting between multiple technology candidates (frameworks, libraries, databases, runtimes)
- The team is facing analysis paralysis and needs a structured evaluation process
- Stakeholders disagree on technology choices and need an evidence-based decision framework
- Migrating from an existing technology and need to justify the switch with measurable criteria
- Onboarding teams that will be accountable for long-term maintenance of the technology

---

## When NOT to Use

Avoid this skill for:

- Binary decisions where one option clearly dominates (e.g., "Do we use TypeScript or not?" — if the project mandates type safety, there's no comparison)
- Situations where requirements have not been defined yet — go back to requirement elicitation first
- Emergency hotfixes or critical bug patches — use whatever the team already knows
- Internal tooling with negligible long-term impact (a one-off script does not need a weighted decision matrix)

---

## Core Workflow

### Step 1: Elicit Concrete Requirements

Extract requirements from project context. Every requirement must be measurable and falsifiable. Vague requirements ("good performance," "easy to use") produce vague decisions. Convert each into a format with a numeric threshold.

**Bad (vague):** "The app needs to be fast"
**Good (concrete):** "API endpoints serve P95 latency under 100ms on a single container (2 vCPU, 4GB RAM) handling sustained load of 5,000 requests/second."

**Bad:** "Good developer experience"
**Good:** "A new graduate-level engineer adds a CRUD endpoint in under 30 minutes using only official documentation."

**Bad:** "Scalable architecture"
**Good:** "System handles 10x current load by adding horizontal replicas without code changes or configuration rework."

**Required requirement categories** (select the top 5-8 that apply):

| Category | What to Measure | Example Threshold |
|---|---|---|
| Performance | Throughput, latency, resource utilization | P95 < 100ms, memory < 200MB |
| Team Velocity | Time to build features using the tool | Feature in under 2 hours per engineer |
| Operational Complexity | Monitoring, deployment, debugging effort | Deployable via single command with health checks |
| Ecosystem Needs | Required libraries, integrations, standards | OAuth2/OIDC library available and maintained |
| Time-to-MVP | Weeks to production-ready minimum viable product | MVP deployable within 6 weeks |
| Learning Curve | Hours for team to reach productive usage | Team reaches baseline productivity in <40 hours |
| Security Posture | CVE history, license compliance, supply chain | Zero critical CVEs in last 12 months |
| Hiring Availability | Pool of qualified candidates in your market | At least 50 active job postings regionally |

**Checkpoint:** Every requirement must pass this test: "Can I write a script or test that verifies this requirement is met?" If the answer is no, rephrase the requirement until it can be tested.

### Step 2: Build the Candidate Shortlist

Identify candidate frameworks/libraries/tools. The shortlist must include at least 3 options and follow these composition rules:

- **3-5 candidates max** — more than 5 triggers diminishing returns (the Paradox of Choice effect shows teams evaluating 8+ options are 40% less satisfied)
- **At least one wild card** — a less conventional but viable option that may score poorly on some criteria but excel elsewhere
- **Incumbent included if migrating** — always compare against what you already have

**Screening checklist per candidate:**

```bash
# Quick viability check — fails any of these and the candidate is disqualified
☐ Released within last 6 months (or has LTS branch with recent patches)
☐ License is OSI-approved and compatible with project licensing model
☐ Supports required runtime/platform (Go 1.21+, Linux/Windows, arm64/x86_64)
☐ Has documented migration path or upgrade guide (for incumbent replacements)
```

**Red flags that disqualify immediately:**
- No release in 12+ months → Remove; note as abandoned
- Copyleft license (GPL, AGPL) on proprietary project → Remove unless legal approves
- Single maintainer with no recent contributions → Keep only as wild card if team accepts risk

### Step 3: Define Evaluation Criteria and Weights

Map each requirement to an evaluation criterion. Group related requirements into categories. Assign weights that sum to 1.0. Never assign equal weights without explicit justification.

**Default criteria weight template:**

| Category | Weight Range | What It Captures |
|---|---|---|
| Technical Fit | 25-35% | API design, type safety, feature completeness |
| Team Readiness | 10-20% | Learning curve, existing expertise, training cost |
| Ecosystem Maturity | 15-25% | Community size, package quality, documentation |
| Operational Concerns | 10-20% | Performance profile, deployment model, monitoring |
| Strategic Fit | 10-15% | Licensing, vendor lock-in risk, roadmap alignment |

**Scoring scale (must define what each level means):**

```python
# Scoring scale definitions — include these in your decision document
SCORE_DEFINITIONS = {
    1: "Does not meet minimum threshold. Fails one or more must-have requirements.",
    2: "Below expectations. Meets basic requirements but has notable gaps requiring workarounds.",
    3: "Meets expectations. Solid option with no major concerns in this category.",
    4: "Above expectations. Notable strengths documented by benchmark, case study, or team spike.",
    5: "Exceeds expectations. Best-in-class for this criterion with independent verification.",
}
```

**Checkpoint:** Verify all weights sum to exactly 1.0 (or 100%). If you find yourself assigning equal weight to 8 categories, revisit and differentiate the priorities.

### Step 4: Score Candidates With Evidence

Score each candidate on every criterion using the defined scale. Every score must be justified with evidence — opinion alone is insufficient.

**Evidence tiers by reliability:**

| Tier | Types | Reliability |
|---|---|---|
| **Tier 1** | Independent benchmarks, production case studies, A/B spike results | High |
| **Tier 2** | Official documentation examples, community tutorials, conference talks | Medium-High |
| **Tier 3** | Team opinions from engineers who have used it, Stack Overflow trends | Medium |
| **Tier 4** | Vendor marketing claims, hype-based reputation | Low (use only as tiebreaker) |

```python
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Criterion:
    """Single evaluation criterion with weight and must-have status."""
    name: str
    weight: float          # 0.0 to 1.0; all weights must sum to 1.0
    category: str          # "technical", "team", "ecosystem", "operational", "strategic"
    is_must: bool = False  # If True, candidate must score >= min_pass_score or is disqualified
    min_pass_score: int = 3  # Minimum acceptable score on 1-5 scale

    def __post_init__(self):
        if not (0.0 < self.weight <= 1.0):
            raise ValueError(f"Criterion '{self.name}' weight must be between 0 and 1, got {self.weight}")


@dataclass
class CandidateResult:
    """Complete evaluation result for one candidate."""
    candidate: str
    scores: Dict[str, int]           # criterion_name -> score (1-5)
    evidence: Dict[str, str]         # criterion_name -> evidence description
    weighted_total: float
    failed_musts: List[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return len(self.failed_musts) == 0


def evaluate_candidates(
    candidates: List[str],
    criteria: List[Criterion],
    raw_scores: Dict[str, Dict[str, int]],
    evidence_map: Dict[str, Dict[str, str]],
) -> List[CandidateResult]:
    """
    Evaluate technology candidates using weighted scoring matrix.

    Args:
        candidates: Names of candidate technologies.
        criteria: Evaluation criteria with weights and must-have flags.
        raw_scores: {candidate: {criterion: score (1-5)}}
        evidence_map: {candidate: {criterion: evidence description}}

    Returns:
        Ranked list of CandidateResult, highest weighted total first.
        Invalid candidates (failed must-haves) appear at the end.
    """
    criteria_by_name = {c.name: c for c in criteria}

    total_weight = sum(c.weight for c in criteria)
    if abs(total_weight - 1.0) > 1e-9:
        raise ValueError(f"Criteria weights must sum to 1.0, got {total_weight}")

    results: List[CandidateResult] = []

    for candidate in candidates:
        opt_scores = raw_scores.get(candidate, {})
        failed_musts: List[str] = []

        for criterion in criteria:
            score = opt_scores.get(criterion.name)
            if score is None:
                raise ValueError(
                    f"Candidate '{candidate}' missing score for '{criterion.name}'"
                )
            if criterion.is_must and score < criterion.min_pass_score:
                failed_musts.append(criterion.name)

        weighted_total = sum(
            opt_scores[c.name] * c.weight
            for c in criteria
            if c.name in opt_scores
        )

        results.append(CandidateResult(
            candidate=candidate,
            scores=opt_scores,
            evidence=evidence_map.get(candidate, {}),
            weighted_total=round(weighted_total, 2),
            failed_musts=failed_musts,
        ))

    # Sort: valid first (descending total), then invalid (descending total)
    results.sort(key=lambda r: (-r.is_valid, -r.weighted_total))
    return results


# --- Example usage ---
if __name__ == "__main__":
    criteria = [
        Criterion(name="api_design",            weight=0.20, category="technical", is_must=True),
        Criterion(name="type_safety",           weight=0.15, category="technical"),
        Criterion(name="learning_curve",        weight=0.12, category="team"),
        Criterion(name="community_size",        weight=0.10, category="ecosystem"),
        Criterion(name="performance",           weight=0.15, category="operational", is_must=True),
        Criterion(name="documentation_quality", weight=0.10, category="ecosystem"),
    ]

    raw_scores = {
        "Next.js 15": {"api_design": 4, "type_safety": 4, "learning_curve": 3,
                       "community_size": 5, "performance": 4, "documentation_quality": 5},
        "Remix":      {"api_design": 3, "type_safety": 5, "learning_curve": 2,
                       "community_size": 3, "performance": 5, "documentation_quality": 4},
    }

    evidence_map = {
        "Next.js 15": {"api_design": "Vercel case studies; team spike confirmed intuitive routing"},
        "Remix":      {"type_safety": "Fully TypeScript-first; types auto-generated from loaders/actions"},
    }

    ranked = evaluate_candidates(
        candidates=["Next.js 15", "Remix"],
        criteria=criteria,
        raw_scores=raw_scores,
        evidence_map=evidence_map,
    )

    for i, r in enumerate(ranked, 1):
        status = "VALID" if r.is_valid else f"INVALID ({', '.join(r.failed_musts)})"
        print(f"{i}. {r.candidate} — {r.weighted_total:.2f}/5.0 [{status}]")

```

**Checkpoint:** Cross-validate scores between evaluators. If two people score independently, variance on any criterion should be ≤ 1 point. Larger variance means the scoring evidence is insufficient.

### Step 5: Execute Focused Proof-of-Concept Spike

For the top 2 candidates, build a minimal proof-of-concept exercising the core use case under realistic conditions. The POC must be equivalent in scope for both candidates.

**POC requirements:**
- Use production-equivalent data volumes (real schemas, not toy examples)
- Test at least one error path and one edge case per candidate
- Measure time-to-first-working-result and documentation quality
- Document pain points and breakthrough moments

```python
from dataclasses import dataclass


@dataclass
class SpikeResult:
    """Result of a focused proof-of-concept spike."""
    candidate: str
    time_to_first_working_hours: float
    lines_of_code: int
    documentation_quality: int     # 1-5
    pain_points: List[str]         # Specific frustrations encountered
    breakthrough_moments: List[str]  # Specific moments of clarity

    @property
    def developer_experience_score(self) -> int:
        dx = 3  # Start at baseline
        if self.time_to_first_working_hours <= 4:
            dx += 2
        elif self.time_to_first_working_hours <= 8:
            dx += 1
        if self.documentation_quality >= 4:
            dx += 1
        if len(self.pain_points) == 0:
            dx += 1
        return min(5, max(1, dx))


# --- Example spike comparison ---
if __name__ == "__main__":
    spikes = [
        SpikeResult(
            candidate="FastAPI",
            time_to_first_working_hours=3.5,
            lines_of_code=120,
            documentation_quality=5,
            pain_points=["Configuring dependency injection for auth middleware took 45 min"],
            breakthrough_moments=["Auto-generated OpenAPI docs saved significant frontend work"],
        ),
        SpikeResult(
            candidate="Django REST",
            time_to_first_working_hours=2.0,
            lines_of_code=95,
            documentation_quality=4,
            pain_points=["Auth integration required third-party package (django-rest-framework-jwt)"],
            breakthrough_moments=["Built-in admin panel provided instant operational tooling"],
        ),
    ]

    for s in spikes:
        print(f"{s.candidate}: DX={s.developer_experience_score}/5, "
              f"time={s.time_to_first_working_hours}h, docs={s.documentation_quality}/5")

```

**Spike timebox:** Set a hard limit. Industry standard: 14 days maximum for evaluation. If you can't decide within 14 days — pick the best available option and set a 60-day review date.

### Step 6: Document the Decision as an ADR

Record using Architecture Decision Record format. Make it defensible to someone who didn't participate in the evaluation.

```markdown
<!-- ADR template -->
# ADR-{NNN}: Select {Technology} for {Project/Feature}

**Status:** Accepted | Proposed | Superseded by [ADR-NNN]
**Date:** YYYY-MM-DD
**Decision-Makers:** [names]

## Context
[Brief description of the problem and requirements driving this decision.]

**Key requirements:**
1. {Requirement 1 with numeric threshold}
2. {Requirement 2 with numeric threshold}

## Decision
We have selected **{Technology}** over:
- {Rejected option 1}: {Reason based on evaluation scores}
- {Rejected option 2}: {Reason based on evaluation scores}

| Option | Score | Risk | Strength | Weakness |
|---|---|---|---|---|
| {Chosen} | X.XX | LOW/MODERATE/HIGH | {strength} | {weakness} |
| {Rejected 1} | X.XX | LOW/MODERATE/HIGH | ... | ... |

## Consequences

### Positive
- [Measurable benefit 1]
- [Measurable benefit 2]

### Negative
- [Measurable trade-off 1]
- [Mitigation for trade-off 1]

## Reversibility
This is a **Type 2 (reversible)** decision:
- Estimated migration effort: {X hours/days}
- Migration path: {high-level strategy}
- Review date: {YYYY-MM-DD, typically 60 days from adoption}
```

---

## Implementation Patterns

### Pattern 1: Technology Decision Document Generator

```python
from datetime import date, timedelta


def generate_decision_document(
    project_name: str,
    requirements: list[dict],
    candidates: list[dict],
    selected: str,
) -> str:
    """Generate a formatted decision document from structured inputs."""

    lines = [
        f"# Technology Decision: {project_name}",
        "",
        f"**Selected:** {selected}  ",
        f"**Date:** {date.today().isoformat()}  ",
        f"**Review Date:** {(date.today() + timedelta(days=60)).isoformat()}  ",
        "",
        "---",
        "",
        "## Requirements",
    ]

    for req in requirements:
        must_tag = " [MUST]" if req.get("must_or_nice") == "must" else ""
        lines.append(f"- **{req['name']}** (w:{req['weight']}{must_tag}): {req['threshold']}")

    lines.extend(["", "## Candidates Evaluated", "| Option | Score | Risk | Status |"])
    for cand in candidates:
        status = "**SELECTED**" if cand["name"] == selected else "Rejected"
        lines.append(f"| {cand['name']} | {cand['score']}/5.0 | {cand['risk']} | {status} |")

    # Score gap analysis
    scores = [c["score"] for c in candidates if isinstance(c.get("score"), (int, float))]
    if len(scores) >= 2:
        top = max(scores)
        second = max(s for s in scores if s != top)
        gap_pct = ((top - second) / top * 100) if top else 0

        lines.append("")
        if gap_pct < 10:
            lines.append(f"⚠️ **Decision sensitive** — only {gap_pct:.1f}% gap between top candidates.")
        else:
            lines.append(f"✅ Clear winner with {gap_pct:.1f}% score gap over runner-up.")

    lines.extend([
        "",
        "## Next Steps",
        f"Proceed to phased adoption. Review date: {(date.today() + timedelta(days=60)).isoformat()}.",
    ])

    return "\n".join(lines) + "\n"


# --- Example usage ---
if __name__ == "__main__":
    requirements = [
        {"name": "API latency", "weight": 0.25, "must_or_nice": "must", "threshold": "P95 < 100ms"},
        {"name": "Team productivity", "weight": 0.20, "must_or_nice": "nice", "threshold": "CRUD in <30 min"},
        {"name": "Ecosystem coverage", "weight": 0.15, "must_or_nice": "must", "threshold": "OAuth2 lib available"},
    ]

    candidates = [
        {"name": "FastAPI", "score": 8.4, "risk": "LOW"},
        {"name": "Django REST", "score": 7.1, "risk": "LOW"},
        {"name": "Go + Gin", "score": 7.8, "risk": "ELEVATED"},
    ]

    print(generate_decision_document(
        project_name="Customer API Service",
        requirements=requirements,
        candidates=candidates,
        selected="FastAPI",
    ))
```

### Pattern 2: Anti-Pattern Detection in Selection Process

Detects common anti-patterns and raises warnings before they corrupt the decision.

```python
# Anti-pattern detection — run this against your evaluation process
HYPHE_INDICATORS = {
    "trigger_phrases": [
        "everyone is using", "the new hot thing", "must learn now",
        "disruptive", "next big thing", "revolutionary", "industry standard",
    ],
    "behavioral_signals": [
        "No evaluation matrix created before recommendation",
        "Decision based solely on conference talk or blog post",
        "Competitor X is using it — primary justification",
        "Timeline pressure overrides analysis",
        "No spike or POC was attempted",
    ],
}


def check_for_selection_antipatterns(evidence_sources: list[str]) -> list[str]:
    """Check if the selection process exhibits common anti-patterns."""
    warnings = []

    if len(evidence_sources) == 0:
        warnings.append(
            "⚠️ ANTIPATTERN: No evidence sources documented. "
            "Build a weighted scoring matrix before recommending."
        )

    tier_1_or_2 = any(
        "benchmark" in e.lower() or "case study" in e.lower() or
        "spike" in e.lower() or "poc" in e.lower()
        for e in evidence_sources
    )
    if not tier_1_or_2 and len(evidence_sources) > 0:
        warnings.append(
            "⚠️ ANTIPATTERN: Only opinion-based evidence used. "
            "At least one Tier 1 source (benchmark, spike result, or production case study) is required."
        )

    return warnings


# --- Example ---
if __name__ == "__main__":
    print("Good eval:", check_for_selection_antipatterns([
        "2-week spike with benchmark results",
        "Production case study from migration blog",
    ]))
    # Output: []

    print("Bad eval:", check_for_selection_antipatterns([
        "Our competitor is using it successfully",
        "The creator gave a great talk at Conference 2025",
    ]))
    # Output: [warning about opinion-based evidence]
```

### Pattern 3: Decision Reversibility Assessment

Classifies decisions as Type 1 (hard to reverse) or Type 2 (easily reversible) and adjusts evaluation intensity accordingly. This is the single most effective guard against analysis paralysis.

```python
from enum import Enum


class DecisionType(Enum):
    TYPE_1 = "type_1"   # Irreversible — invest significant evaluation time (2+ weeks)
    TYPE_2 = "type_2"   # Reversible — decide quickly, accept suboptimal choice


def assess_reversibility(
    affected_teams: int,
    estimated_rollback_hours: float,
    data_portable: bool,
) -> DecisionType:
    """Classify a technology decision based on reversibility."""
    if not data_portable and estimated_rollback_hours > 40:
        return DecisionType.TYPE_1
    if affected_teams <= 1 and estimated_rollback_hours <= 20 and data_portable:
        return DecisionType.TYPE_2
    # Everything else gets moderate evaluation
    return DecisionType.TYPE_2


def adjust_evaluation_timebox(decision_type: DecisionType) -> dict:
    """Return adjusted time allocation based on decision type."""
    if decision_type == DecisionType.TYPE_1:
        return {"max_days": 14, "review_days": 90}
    return {"max_days": 7, "review_days": 30}


# --- Example ---
if __name__ == "__main__":
    dt = assess_reversibility(affected_teams=1, estimated_rollback_hours=8, data_portable=True)
    tb = adjust_evaluation_timebox(dt)
    print(f"Type: {dt.value}, Window: {tb['max_days']} days, Review in: {tb['review_days']} days")
```

---

## Constraints

### MUST DO
- Ground every technology recommendation in measurable requirements, never in popularity or trend analysis alone
- Require at least one Tier 1 evidence source (benchmark, spike result, or production case study) for the top candidate
- Always include adoption risk scoring alongside fit scoring — a perfect-fit technology with high adoption risk can sink a project
- Classify every requirement as MUST (hard constraint) or NICE (weighted preference) before scoring begins
- Document rejected alternatives with explicit reasoning based on evaluation scores, not just "we chose X"
- Execute a spike/POC for the top 2 candidates before making an adoption commitment
- Set a 60-day review date at the time of decision — no exceptions
- Verify team learning bandwidth matches the technology's complexity before recommending it

### MUST NOT DO
- Do not recommend a technology without checking its last 6 months of release history and activity level
- Do not skip phased rollout planning — "big bang" migrations are the single most common cause of technology adoption failures
- Do not let a team member's personal preference override evidence from the decision matrix
- Do not evaluate technologies using only vendor-published information — always cross-reference with independent sources
- Do not use equal weights across all criteria without explicit written justification
- Do not adopt bleeding-edge technology (less than 6 months since first stable release) for production systems without explicit executive risk acceptance documented in the ADR
- Do not allow the evaluation to run longer than 14 days — if you cannot decide by then, pick the best available option and set a 60-day review

---

## Output Template

When this skill is active, produce:

1. **Requirements Summary** — Numbered list of 5-8 concrete, measurable requirements with weights summing to 1.0; each classified as MUST or NICE
2. **Candidate Shortlist** — 3-5 options with screening results and wild card justification (if applicable)
3. **Decision Matrix** — Ranked candidates with weighted scores, adoption risk levels, capability breakdowns, and evidence for each score
4. **Spike Results** — POC findings: time-to-first-working, pain points, breakthroughs, developer experience scores
5. **ADR Document** — Formatted Architecture Decision Record with context, decision, consequences, reversibility classification, and review date
6. **Anti-Pattern Report** — Detection results for hype-driven selection, analysis paralysis, and other common traps

---

## Related Skills

| Skill | Purpose |
|---|---|
| `dependency-inversion-principle` | Once a framework is selected, apply dependency inversion to keep it abstracted from core logic |
| `modular-design` | Structure the codebase around module boundaries that make framework swaps easier if needed |
| `test-driven-development` | Define testable requirements during spike phase to validate framework selection empirically |
| `hexagonal-architecture` | Architecture pattern that isolates framework choices behind ports, enabling future replacements |

---

## Live References

> Authoritative documentation and resources for framework selection methodology.

- [Architecture Decision Records (ADR) — Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — Influential technology selection model with 2025 requirement-tagging adaptation
- ["Empirical Study on Framework Selection Decision-Making" — IEEE Software, Jan 2025](https://ieeexplore.ieee.org/document/10789432)
- [Decision Matrix Methodology — Multi-Criteria Decision Analysis](https://en.wikipedia.org/wiki/Multi-criteria_decision_analysis)
- [Team Topologies (3rd Edition, 2024) — Framework selection aligned with cognitive load boundaries](https://teamtopologies.com/)
- [Amazon Leadership Principles — Two-Way Door Decision Taxonomy](https://www.amazon.jobs/en/principles/amazon-leadership-principles)
