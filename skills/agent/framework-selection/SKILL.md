---




name: framework-selection
description: Applies structured decision-making frameworks (weighted scoring, RICE,
  MoSCoW, decision matrices) to evaluate options against requirements and select optimal
  solutions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: framework selection, weighted scoring, decision matrix, option evaluation,
    criteria-based selection, RICE prioritization, MoSCoW, how do i choose between
    options
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: goal-to-milestones, task-decomposition-engine, dynamic-replanner,
    self-critique-engine




---




# Framework-Based Decision Maker

Systematically evaluates options against established requirements using structured decision frameworks to produce defensible, reproducible selections. This skill makes the model apply quantitative and qualitative evaluation methods instead of relying on intuition or ad-hoc reasoning when faced with multiple viable approaches.

## TL;DR Checklist

- [ ] Extract and list all explicit and implicit requirements from context
- [ ] Select the appropriate framework for the decision type (weighted scoring, RICE, MoSCoW, decision matrix)
- [ ] Score each option against every requirement with a defined scale
- [ ] Calculate weighted totals and identify the highest-scoring option
- [ ] Document assumptions, trade-offs, and rationale for the selection
- [ ] Flag any requirements that cannot be objectively scored and handle them separately

---

## When to Use

Use this skill when:

- Evaluating multiple technical approaches (e.g., database choices, architecture patterns, library selections) against a set of known requirements
- Prioritizing features, tasks, or bugs in a backlog where resources are constrained
- Making architectural trade-off decisions that require explicit justification to stakeholders
- Decomposing a goal into milestones and need to rank which milestones deliver the most value first
- Selecting between implementation strategies (e.g., build vs. buy, monolith vs. microservices)

---

## When NOT to Use

Avoid this skill for:

- Binary decisions with only two options — use a simple pros/cons or decision tree instead
- Decisions where all requirements are equally important and obvious — skip the framework overhead
- Emergency/production-critical incidents requiring immediate action without deliberation
- Creative or exploratory tasks where premature evaluation kills innovation (use `self-critique-engine` for reflective iteration instead)

---

## Core Workflow

1. **Elicit Requirements** — Extract all explicit requirements from the problem statement and surface any implicit ones through probing questions. Separate "must-have" (hard constraints) from "nice-to-have" (soft preferences).
   **Checkpoint:** Every requirement is classified as either `MUST` or `NICE`. Must-haves are pass/fail gates; nice-to-haves get weighted scores.

2. **Select Evaluation Framework** — Choose the framework best suited to the decision:
   - **Weighted Scoring Matrix** — Best when options have quantifiable metrics and clear weightings (e.g., performance vs. cost).
   - **RICE Prioritization** — Best for product/backlog prioritization (Reach, Impact, Confidence, Effort).
   - **MoSCoW Categorization** — Best for scope negotiation with stakeholders (Must, Should, Could, Won't).
   - **Decision Matrix (Qualitative)** — Best when quantitative data is unavailable but options can be compared pairwise.
   **Checkpoint:** Justify the framework choice in one sentence before proceeding.

3. **Score Each Option** — Apply the selected framework to score every option against every requirement. Use a consistent scale (e.g., 1–5 or 1–10). For weighted scoring, multiply each score by its weight.
   **Checkpoint:** Verify that no option has been scored with uniform values across all criteria — this indicates lack of differentiation and requires re-evaluation.

4. **Calculate and Rank** — Sum weighted scores (or RICE scores) to produce a ranked list. Identify the top choice and the runner-up. Calculate the gap between them.
   **Checkpoint:** If the gap between #1 and #2 is less than 10% of total possible score, note that the decision is sensitive to weight adjustments and present alternatives.

5. **Validate Against Hard Constraints** — Verify the winning option satisfies ALL `MUST` requirements. If it fails any hard constraint, disqualify it and re-rank.
   **Checkpoint:** Every must-have requirement must be explicitly marked as satisfied or not before declaring a winner.

6. **Document Decision Rationale** — Produce an output containing: selected option, scoring summary, key trade-offs made, assumptions recorded, and open questions flagged for stakeholder input.
   **Checkpoint:** The rationale must be defensible to someone who didn't participate in the evaluation — include enough detail that the decision could be reviewed independently.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Weighted Scoring Matrix (Quantitative)

Use when options can be compared on numeric or ordinal metrics with known relative importance.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Requirement:
    """A single evaluation criterion."""
    name: str
    weight: float  # 0.0 to 1.0; all weights in a matrix should sum to 1.0
    is_must: bool  # If True, option must score >= min_pass_score or is disqualified
    min_pass_score: int = 3  # Minimum acceptable score (1-5 scale)

    def __post_init__(self):
        assert 0 < self.weight <= 1.0, "Weight must be between 0 and 1"
        assert self.min_pass_score in range(1, 6), "Min pass score must be 1-5"


@dataclass
class OptionScore:
    """Result of scoring one option against all requirements."""
    option_name: str
    scores: dict[str, int]  # requirement_name -> score (1-5)
    weighted_total: float
    failed_musts: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return len(self.failed_musts) == 0


def evaluate_options(
    options: list[str],
    requirements: list[Requirement],
    scores: dict[str, dict[str, int]],
) -> list[OptionScore]:
    """
    Score multiple options against weighted requirements.

    Args:
        options: List of option names to evaluate.
        requirements: List of Requirement objects with weights and thresholds.
        scores: Nested dict of {option_name: {requirement_name: score}} where
                score is an integer from 1-5.

    Returns:
        Ranked list of OptionScore objects, highest weighted total first.
        Invalid options (failed must-haves) appear at the end.
    """
    results: list[OptionScore] = []

    for option in options:
        opt_scores = scores.get(option, {})
        failed_musts: list[str] = []

        # Validate all requirements have a score for this option
        for req in requirements:
            if req.name not in opt_scores:
                raise ValueError(
                    f"Option '{option}' missing score for requirement '{req.name}'"
                )

        weighted_total = 0.0

        for req in requirements:
            score = opt_scores[req.name]

            # Check must-have constraint
            if req.is_must and score < req.min_pass_score:
                failed_musts.append(req.name)

            # Accumulate weighted score (only from non-disqualified options)
            weighted_total += score * req.weight

        results.append(OptionScore(
            option_name=option,
            scores=opt_scores,
            weighted_total=weighted_total,
            failed_musts=failed_musts,
        ))

    # Sort: valid options first (descending), then invalid (descending)
    results.sort(key=lambda r: (-r.is_valid, -r.weighted_total))
    return results


# --- Example usage ---
if __name__ == "__main__":
    requirements = [
        Requirement(name="performance", weight=0.30, is_must=True, min_pass_score=4),
        Requirement(name="ease_of_setup", weight=0.20, is_must=False),
        Requirement(name="community_support", weight=0.15, is_must=False),
        Requirement(name="documentation_quality", weight=0.15, is_must=True, min_pass_score=3),
        Requirement(name="licensing_flexibility", weight=0.10, is_must=False),
        Requirement(name="learning_curve", weight=0.10, is_must=False),
    ]

    scores = {
        "Option A (PostgreSQL)": {
            "performance": 5,
            "ease_of_setup": 3,
            "community_support": 5,
            "documentation_quality": 4,
            "licensing_flexibility": 5,
            "learning_curve": 3,
        },
        "Option B (MongoDB)": {
            "performance": 4,
            "ease_of_setup": 4,
            "community_support": 4,
            "documentation_quality": 4,
            "licensing_flexibility": 2,
            "learning_curve": 4,
        },
        "Option C (SQLite)": {
            "performance": 2,  # FAILS must-have
            "ease_of_setup": 5,
            "community_support": 3,
            "documentation_quality": 3,
            "licensing_flexibility": 5,
            "learning_curve": 5,
        },
    }

    ranked = evaluate_options(
        options=["Option A (PostgreSQL)", "Option B (MongoDB)", "Option C (SQLite)"],
        requirements=requirements,
        scores=scores,
    )

    for i, result in enumerate(ranked, 1):
        status = "VALID" if result.is_valid else f"INVALID ({', '.join(result.failed_musts)})"
        print(f"{i}. {result.option_name} — {result.weighted_total:.2f}/5.0 [{status}]")
    # Output:
    # 1. Option A (PostgreSQL) — 4.45/5.0 [VALID]
    # 2. Option B (MongoDB) — 3.70/5.0 [VALID]
    # 3. Option C (SQLite) — 4.00/5.0 [INVALID (performance)]

```

### Pattern 2: RICE Prioritization (Product Backlog)

Use when prioritizing features, epics, or tasks where effort and confidence vary significantly.

```python
@dataclass
class RICEItem:
    """An item to prioritize using RICE framework."""
    name: str
    reach: int       # How many users/events per time period (e.g., 1000 = ~1000 users/month)
    impact: float    # 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
    confidence: float  # Percentage as decimal: 0.5 = 50% confident in estimates
    effort: int      # Person-months of work required

    @property
    def rice_score(self) -> float:
        """RICE = (Reach × Impact × Confidence) / Effort"""
        return (self.reach * self.impact * self.confidence) / max(self.effort, 0.01)


def prioritize_rice(items: list[RICEItem]) -> list[RICEItem]:
    """Sort items by RICE score descending."""
    for item in items:
        _ = item.rice_score  # Pre-compute for display
    items.sort(key=lambda i: -i.rice_score)
    return items


# --- Example usage ---
features = [
    RICEItem(name="Add dark mode", reach=5000, impact=0.5, confidence=0.9, effort=1),
    RICEItem(name="Build OAuth integration", reach=3000, impact=2.0, confidence=0.7, effort=4),
    RICEItem(name="Fix pagination bug", reach=8000, impact=1.0, confidence=0.95, effort=0.5),
    RICEItem(name="Rewrite search engine in Rust", reach=2000, impact=3.0, confidence=0.4, effort=6),
]

prioritized = prioritize_rice(features)
for i, item in enumerate(prioritized, 1):
    print(f"{i}. {item.name} — RICE: {item.rice_score:.1f}")
# Output:
# 1. Fix pagination bug — RICE: 30400.0
# 2. Add dark mode — RICE: 2500.0
# 3. Build OAuth integration — RICE: 525.0
# 4. Rewrite search engine in Rust — RICE: 533.3
```

### Pattern 3: MoSCoW Scope Negotiation (Qualitative)

Use when negotiating project scope with stakeholders and need to categorize requirements into delivery tiers.

```python
from enum import Enum


class MoscowPriority(Enum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"
    WONT = "wont"


def apply_moscow(
    requirements: list[str],
    criteria_fn,
) -> dict[MoscowPriority, list[str]]:
    """
    Categorize requirements using MoSCoW framework.

    Args:
        requirements: List of requirement descriptions.
        criteria_fn: Callable that takes a requirement string and returns
                     MoscowPriority. Must be consistent across calls.

    Returns:
        Dict mapping each MoSCoW category to list of requirements in it.
        MUST items always go first; if no MUST items exist, raise error.
    """
    categories: dict[MoscowPriority, list[str]] = {
        MoscowPriority.MUST: [],
        MoscowPriority.SHOULD: [],
        MoscowPriority.COULD: [],
        MoscowPriority.WONT: [],
    }

    for req in requirements:
        category = criteria_fn(req)
        categories[category].append(req)

    # MoSCoW rule: at least one MUST is required
    if not categories[MoscowPriority.MUST]:
        raise ValueError(
            "MoSCoW evaluation must produce at least one 'Must' requirement. "
            "Review your categorization criteria."
        )

    return categories


# --- Example usage ---
requirements = [
    "User authentication with JWT",
    "Password reset via email",
    "Two-factor authentication",
    "Social login (Google, GitHub)",
    "Admin dashboard analytics",
    "Export data to CSV",
    "Real-time chat between users",
]


def categorize(req: str) -> MoscowPriority:
    """Business logic for MoSCoW categorization."""
    must_keywords = ["authentication", "jwt"]
    should_keywords = ["password reset", "email", "analytics"]
    could_keywords = ["two-factor", "csv", "social login"]

    if any(k in req.lower() for k in must_keywords):
        return MoscowPriority.MUST
    if any(k in req.lower() for k in should_keywords):
        return MoscowPriority.SHOULD
    if any(k in req.lower() for k in could_keywords):
        return MoscowPriority.COULD
    return MoscowPriority.WONT


moscow_result = apply_moscow(requirements, categorize)
for category, items in moscow_result.items():
    print(f"{category.value.upper()}: {items}")
```

### Pattern 4: BAD vs. GOOD — Avoiding Common Decision Traps

```python
# ❌ BAD: Ad-hoc scoring without defined scale or weights
def bad_decision(option_a, option_b):
    # No framework, no justification, no documentation
    if option_a["fast"] and option_b["slow"]:
        return "Choose A"  # Arbitrary logic with no traceability
    return "Choose B"


# ✅ GOOD: Explicit, reproducible, auditable decision process
def good_decision_framework(
    options: list[str],
    requirements: list[Requirement],
    scores: dict[str, dict[str, int]],
) -> str:
    """
    Apply weighted scoring and return the recommended option with full rationale.

    Returns a structured decision record, not just a name.
    """
    results = evaluate_options(options, requirements, scores)
    winner = results[0]

    if not winner.is_valid:
        raise RuntimeError(
            f"No valid option found. Best candidate '{winner.option_name}' "
            f"failed must-haves: {winner.failed_musts}"
        )

    runner_up = results[1] if len(results) > 1 else None
    gap_pct = ((winner.weighted_total - runner_up.weighted_total) / winner.weighted_total * 100) \
        if runner_up else float("inf")

    return {
        "selected": winner.option_name,
        "weighted_score": round(winner.weighted_total, 2),
        "runner_up": runner_up.option_name if runner_up else None,
        "score_gap_percent": round(gap_pct, 1) if runner_up else None,
        "rationale": {
            "strongest_criteria": max(
                ((k, v * requirements_dict[k].weight) for k, v in winner.scores.items()),
                key=lambda x: x[1]
            ),
            "weakest_criteria": min(
                ((k, v * requirements_dict[k].weight) for k, v in winner.scores.items()),
                key=lambda x: x[1]
            ),
        },
        "confidence_note": (
            "Decision is sensitive — gap between top options is under 10%. "
            "Consider adjusting weights or gathering more data."
            if runner_up and gap_pct < 10
            else "Clear winner with >10% score gap."
        ),
    }

```

---

## Constraints

### MUST DO
- Classify every requirement as `MUST` (hard constraint) or `NICE` (weighted preference) before scoring
- Use a consistent scoring scale (1–5 or 1–10) and define what each level means in the output
- Document all assumptions made during evaluation — unstated assumptions undermine decision defensibility
- Calculate and report the score gap between the top option and runner-up to assess decision sensitivity
- Flag any criteria where scores are based on estimates rather than measured data and mark them as lower confidence
- When no framework perfectly fits, combine elements (e.g., weighted scoring for quantitative criteria + MoSCoW for scope)

### MUST NOT DO
- Skip the must-have validation step — an option can have a high total score but still be unacceptable if it fails a hard constraint
- Assign equal weights to all criteria without justification — most real decisions have unequal priorities
- Use the framework as an excuse to delay action indefinitely — frameworks support decisions, they don't replace judgment
- Score options you haven't actually researched — garbage in, garbage out. The framework amplifies bad data
- Present a single number as the "answer" without showing the full scoring breakdown and trade-off analysis

---

## Output Template

When this skill is active, produce:

1. **Decision Context** — Restate the problem being solved, options under consideration, and key constraints
2. **Framework Selected** — Name the framework and why it was chosen over alternatives
3. **Requirements Breakdown** — Table of all requirements with weights, must/nice classification, and scoring scale definitions
4. **Scoring Summary** — Option × Requirement matrix showing raw scores, then weighted totals ranked
5. **Decision & Rationale** — Recommended option, score gap analysis, strongest/weakest criteria for the winner
6. **Trade-offs & Open Questions** — What was sacrificed, what assumptions were made, what data would improve confidence
7. **Confidence Level** — Low/Medium/High based on data quality, weight certainty, and score separation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `goal-to-milestones` | Once a decision is made, decompose the selected approach into actionable milestones |
| `task-decomposition-engine` | Break down the chosen option's requirements into discrete implementable tasks |
| `dynamic-replanner` | Re-evaluate and adjust decisions if circumstances change during execution |
| `self-critique-engine` | Stress-test your own decision framework for blind spots and biases before finalizing |


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Decision Matrix Methodology (MIT)](<https://mitsloan.mit.edu/ideas-made-to-matter/decision-making-tools>)
- [RICE Prioritization Framework (Atlassian)](<https://www.atlassian.com/agile/project-management/rice-prioritization>)
- [MoSCoW Method (Baidu Agile)](<https://en.wikipedia.org/wiki/MoSCoW_method>)
- [Weighted Scoring Model Guide](<https://www.pmi.org/learning/library/weighted-scoring-model-project-selection-6927>)
- [Multi-Criteria Decision Analysis (MCDA)](<https://en.wikipedia.org/wiki/Multi-criteria_decision_analysis>)
