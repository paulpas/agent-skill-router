---
name: technical-debt-management
description: Tracks, categorizes, and systematically reduces technical debt across
  codebases using quantitative scoring, prioritization matrices, and automated refactoring
  strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: technical debt, code quality, refactoring strategy, legacy code, debt
    tracking, interest rate, how do i reduce technical debt, debt inventory
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
  - do-dont
  - examples
  related-skills: engineering-principles, refactoring-techniques, code-quality-policies
------
# Technical Debt Manager

Tracks, classifies, scores, and plans the systematic reduction of technical debt across software systems. Models as a senior engineer who treats debt like financial debt — distinguishing prudent from reckless borrowing, measuring interest rates, prioritizing payoff based on cost-of-delay, and establishing prevention guardrails so new debt is caught before it compounds into architectural decay.

## TL;DR Checklist

- [ ] Classify every identified issue as reckless or prudent, structural or incidental
- [ ] Assign an interest rate (degradation speed) — how fast does each item slow the team down?
- [ ] Build a debt inventory with severity, effort, and cost-of-delay scores before prioritizing
- [ ] Apply the Debt Matrix: high-interest + low-effort items first, defer low-interest + high-effort
- [ ] Pair every refactoring change with regression tests — never refactor without a safety net
- [ ] Establish prevention rules in CI/CD: static analysis gates, PR checklist, architecture review triggers

---

## When to Use

Use this skill when:

- An engineering team is overwhelmed by legacy code and needs a structured approach to identifying and reducing debt
- A codebase has accumulated complexity that slows feature delivery and needs a prioritized payoff plan
- A team wants to stop the bleeding — establish prevention patterns so new debt does not accumulate faster than it is paid down
- You are planning a refactor sprint and need data-driven prioritization (not opinion-based)
- Onboarding a new project with an unclear technical history and you need to map its debt landscape
- Conducting an architectural health assessment before a major system redesign or migration
- A team is debating whether to refactor or rewrite and needs quantitative comparison of cost-of-delay

---

## When NOT to Use

Avoid this skill for:

- Brand-new projects with less than two weeks of accumulated code — let the design stabilize first, then assess
- One-off scripts, throwaway prototypes, or hackathon code where maintainability is irrelevant
- Situations requiring a full rewrite decision — use a dedicated cost-benefit analysis instead of debt scoring alone
- Micro-corrections that are better handled inline during feature work without a formal inventory process

---

## Core Workflow

1. **Build the Debt Inventory** — Scan the codebase using static analysis tools (linter, cyclomatic complexity, duplication detectors), manual inspection of hot paths, and developer interviews about pain points. Record each debt item with: ID, category, file location, description, and initial severity estimate.
   **Checkpoint:** Coverage must include at least 80% of production modules — ignore test files and generated code for now.

2. **Classify Each Item** — Assign two axes to every inventory item:
   - **Debt Type:** Reckless (avoidable mistake, violated known standard) vs. Prudent (informed tradeoff under constraints like deadline or uncertainty).
   - **Debt Structure:** Structural (architecture-level, affects many modules) vs. Incidental (local, contained to one module or function).
   **Checkpoint:** Every item must have both axes assigned — no unclassified debt should appear in the prioritization matrix.

3. **Score Interest Rate** — For each item, estimate the interest rate: how much slower does this piece of debt make the team? Use a 1–5 scale:
   - 5 (critical): Blocks multiple features per sprint, causes daily rework, or introduces production bugs
   - 4 (high): Causes noticeable drag on feature velocity; developers avoid touching related code
   - 3 (moderate): Annoying but manageable; only affects experienced developers working nearby
   - 2 (low): Minor inconvenience that most developers work around without friction
   - 1 (minimal): Cosmetic or near-obsolete with negligible impact on current operations
   **Checkpoint:** Score must reference concrete evidence (bug history, developer survey data, cycle-time metrics), not gut feelings.

4. **Estimate Effort and Cost-of-Delay** — For each item, estimate:
   - **Effort Score (E):** Person-days required to fully resolve the issue (1 = under a day, 5 = multi-week effort).
   - **Cost-of-Delay (CoD):** Weekly revenue or productivity loss if the debt remains unpaid.
   Calculate a **Debt Payoff Score** using: `PayoffScore = (InterestRate × CoD) / Effort`. Items with the highest scores deliver the best return on investment.
   **Checkpoint:** Validate that effort estimates were produced by at least two engineers or derived from comparable past refactors.

5. **Plot the Debt Matrix and Prioritize** — Plot all items on a 2×2 matrix (Interest Rate vs. Effort) and assign priority buckets:
   - **Quick Wins (High Interest, Low Effort):** Do these immediately. They build team momentum and deliver fast ROI.
   - **Major Projects (High Interest, High Effort):** Plan as structured initiatives with milestones and dedicated sprint capacity.
   - **Fill-Ins (Low Interest, Low Effort):** Tackle during downtime or alongside feature work — no separate sprint needed.
   - **Thankless Tasks (Low Interest, High Effort):** Defer or accept; these rarely justify the investment.
   **Checkpoint:** At least 20% of the backlog should be in Quick Wins to maintain team morale and demonstrate progress within two sprints.

6. **Create the Reduction Plan** — For each prioritized item, define:
   - The specific refactoring technique (extract module, replace inheritance, introduce strategy pattern, etc.).
   - The test coverage required before and after the change.
   - Acceptance criteria that prove the debt is paid (no new code smells, performance not degraded).
   **Checkpoint:** Every plan item must be completable within one sprint — if it cannot fit, break it into smaller sub-items with intermediate verification points.

7. **Establish Prevention Guardrails** — After addressing existing debt, install controls that prevent accumulation:
   - Static analysis gates (linter failures block PR merge).
   - Cyclomatic complexity thresholds enforced in CI (e.g., max 10 per function).
   - Architecture Decision Records (ADRs) for every significant structural change.
   - Code review checklist requiring debt assessment for any new code smell introduction.
   **Checkpoint:** Prevention rules must be automated — if they rely on human compliance, they will fail within two quarters.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Debt Inventory Builder

Systematically scan and catalog technical debt across a codebase using Python with typed signatures.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class DebtType(Enum):
    RECKLESS = "reckless"      # Avoidable mistake, violated known standard
    PRUDENT = "prudent"        # Informed tradeoff under constraints


class DebtStructure(Enum):
    STRUCTURAL = "structural"  # Architecture-level, affects many modules
    INCIDENTAL = "incidental"  # Local, contained to one module/function


@dataclass
class TechnicalDebtItem:
    """Represents a single piece of identified technical debt."""
    item_id: str
    category: str                  # e.g., "duplication", "complexity", "security", "documentation"
    file_path: str
    description: str
    debt_type: DebtType
    debt_structure: DebtStructure
    interest_rate: int = 1         # 1–5 scale
    effort_score: int = 1          # 1–5 scale (person-days)
    cost_of_delay: float = 0.0     # Weekly productivity loss estimate
    tags: list[str] = field(default_factory=list)

    @property
    def payoff_score(self) -> float:
        """Calculate Debt Payoff Score: (Interest × CostOfDelay) / Effort.

        Higher scores indicate better ROI for paying down this debt first.
        Items with payoff_score > 2.0 are typically Quick Wins.
        """
        if self.effort_score == 0:
            return float('inf')
        return (self.interest_rate * self.cost_of_delay) / self.effort_score

    def priority_bucket(self) -> str:
        """Assign a priority bucket based on Interest Rate vs. Effort."""
        if self.interest_rate >= 4 and self.effort_score <= 2:
            return "quick_win"
        elif self.interest_rate >= 4 and self.effort_score >= 4:
            return "major_project"
        elif self.interest_rate <= 2 and self.effort_score <= 2:
            return "fill_in"
        else:
            return "thankless_task"

    def __post_init__(self) -> None:
        if not (1 <= self.interest_rate <= 5):
            raise ValueError(f"Interest rate must be 1-5, got {self.interest_rate}")
        if not (1 <= self.effort_score <= 5):
            raise ValueError(f"Effort score must be 1-5, got {self.effort_score}")


def build_debt_inventory(
    items: list[TechnicalDebtItem]
) -> dict[str, list[TechnicalDebtItem]]:
    """Group debt items by priority bucket and sort within each.

    Returns a dictionary mapping priority buckets to sorted lists of
    debt items (highest payoff_score first). Only includes non-None
    buckets from items that have been scored.
    """
    buckets: dict[str, list[TechnicalDebtItem]] = {
        "quick_win": [],
        "major_project": [],
        "fill_in": [],
        "thankless_task": [],
    }

    for item in items:
        bucket = item.priority_bucket()
        buckets[bucket].append(item)

    # Sort each bucket by payoff_score descending
    for bucket_name in buckets:
        buckets[bucket_name].sort(key=lambda x: x.payoff_score, reverse=True)

    return buckets


# --- Example usage ---
if __name__ == "__main__":
    inventory = build_debt_inventory([
        TechnicalDebtItem(
            item_id="TD-001",
            category="duplication",
            file_path="src/auth/token_validator.py",
            description="Duplicate token validation logic in 3 modules",
            debt_type=DebtType.RECKLESS,
            debt_structure=DebtStructure.STRUCTURAL,
            interest_rate=4,
            effort_score=2,
            cost_of_delay=150.0,
        ),
        TechnicalDebtItem(
            item_id="TD-002",
            category="complexity",
            file_path="src/billing/invoice_generator.py",
            description="Cyclomatic complexity of 34 in generate_invoice()",
            debt_type=DebtType.RECKLESS,
            debt_structure=DebtStructure.INCIDENTAL,
            interest_rate=3,
            effort_score=4,
            cost_of_delay=50.0,
        ),
    ])

    for bucket, items in inventory.items():
        if items:
            print(f"\n=== {bucket.upper().replace('_', ' ')} ===")
            for item in items:
                print(f"  [{item.item_id}] Score={item.payoff_score:.1f} - {item.description}")
```

### Pattern 2: Debt Classification Engine (BAD vs. GOOD)

Correctly classifying debt determines whether you blame the developer or the process. This pattern prevents misclassification — reckless debt is a process failure, prudent debt is a leadership decision that should be tracked and revisited.

```python
# ❌ BAD: Classifying by gut feeling without criteria — leads to blame culture
def bad_classify_debt(description: str) -> dict:
    """Vague classification that produces inconsistent results."""
    if "old" in description.lower():
        return {"type": "reckless", "structure": "incidental"}
    if len(description) > 100:
        return {"type": "prudent", "structure": "structural"}
    # Default guess — no criteria, just coincidence
    return {"type": "reckless", "structure": "structural"}


# ✅ GOOD: Criteria-driven classification with explicit decision rules
def classify_debt(
    description: str,
    violated_standard: Optional[str] = None,
    deadline_constraint: bool = False,
    affected_modules_count: int = 1,
    original_documentation: Optional[str] = None,
) -> TechnicalDebtItem:
    """Classify a debt item using explicit decision criteria.

    Classification follows these rules:
    - Reckless: Violated a known standard or best practice without documentation.
      Prudent: An informed tradeoff with documented reasoning (ADR, ticket, etc.).
    - Structural: Affects 3+ modules or requires multi-module coordination to fix.
      Incidental: Confined to a single file or function.

    Args:
        description: Human-readable description of the debt item.
        violated_standard: Name of the standard/practice that was violated,
                          if any (e.g., "DRY", "OWASP-A01", team convention).
        deadline_constraint: True if the original decision was made under
                            a hard deadline with no alternative timeline.
        affected_modules_count: Number of modules impacted by this debt.
        original_documentation: Path or URL to any ADR, ticket, or design doc
                               explaining the original tradeoff decision.

    Returns:
        A TechnicalDebtItem with correctly classified type and structure.
    """
    # Debt Type Classification: Reckless vs. Prudent
    if violated_standard and not original_documentation:
        debt_type = DebtType.RECKLESS
        rationale = (
            f"Violated '{violated_standard}' without documented justification — "
            f"this is a process failure, not a strategic tradeoff."
        )
    elif original_documentation or deadline_constraint:
        debt_type = DebtType.PRUDENT
        rationale = (
            f"Documented tradeoff{' under deadline' if deadline_constraint else ''}. "
            f"Should be tracked and revisited when constraints change."
        )
    else:
        # Default to reckless — absence of documentation is the default state
        debt_type = DebtType.RECKLESS
        rationale = "No documentation found for tradeoff; assumed reckless."

    # Debt Structure Classification: Structural vs. Incidental
    if affected_modules_count >= 3:
        debt_structure = DebtStructure.STRUCTURAL
    else:
        debt_structure = DebtStructure.INCIDENTAL

    return TechnicalDebtItem(
        item_id="TD-CLASSIFIED",
        category="classification_engine",
        file_path="",
        description=description,
        debt_type=debt_type,
        debt_structure=debt_structure,
        tags=[debt_type.value, debt_structure.value],
    )


# --- Example usage demonstrating correct classification ---
if __name__ == "__main__":
    # Reckless: violated DRY with no documentation
    reckless = classify_debt(
        description="Duplicate validation logic in 3 auth modules",
        violated_standard="DRY principle",
        deadline_constraint=False,
        affected_modules_count=3,
    )

    # Prudent: made under deadline with ADR
    prudent = classify_debt(
        description="Monolithic billing service instead of event-driven",
        violated_standard=None,
        deadline_constraint=True,
        affected_modules_count=5,
        original_documentation="docs/adrs/003-billing-architecture.md",
    )

    print(f"Reckless item: type={reckless.debt_type.value}, "
          f"structure={reckless.debt_structure.value}, "
          f"payoff_score={reckless.payoff_score:.2f}")
    print(f"Prudent item: type={prudent.debt_type.value}, "
          f"structure={prudent.debt_structure.value}, "
          f"payoff_score={prudent.payoff_score:.2f}")
```

### Pattern 3: CI/CD Prevention Gate

Prevent new debt from accumulating by enforcing quality gates in the continuous integration pipeline.

```python
"""CI/CD prevention gate that blocks merges when new technical debt is introduced.

This module runs as a pre-merge check and enforces:
- Cyclomatic complexity limits per function
- Maximum code duplication percentage
- Linter violation thresholds
- New dependency license compliance checks
"""

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class GateResult:
    """Represents the outcome of a single quality gate check."""
    gate_name: str
    passed: bool
    severity: int            # 1=info, 2=warning, 3=blocking
    message: str
    suggestion: Optional[str] = None


class QualityGate(Protocol):
    """Interface for any quality gate that can be run during CI."""

    def check(self) -> list[GateResult]: ...


@dataclass
class ComplexityGate(QualityGate):
    """Enforces maximum cyclomatic complexity per function.

    Following the McCabe standard, functions with complexity > 10
    become difficult to test thoroughly and are prone to undetected bugs.
    """

    max_complexity: int = 10

    def check(self) -> list[GateResult]:
        # In production, this would invoke a cyclomatic complexity tool
        # like radon or mccabe on the codebase. This example shows the
        # gate logic with simulated results.
        results: list[GateResult] = []

        # Simulated findings (replaced by actual tool output in production)
        simulated_findings = [
            {"function": "process_payment", "complexity": 18, "file": "src/billing/processor.py"},
            {"function": "validate_input", "complexity": 7, "file": "src/common/validation.py"},
            {"function": "transform_record", "complexity": 24, "file": "src/data/pipeline.py"},
        ]

        for finding in simulated_findings:
            if finding["complexity"] > self.max_complexity:
                results.append(GateResult(
                    gate_name="cyclomatic_complexity",
                    passed=False,
                    severity=3,  # Blocking
                    message=(
                        f"Function '{finding['function']}' in "
                        f"{finding['file']} has complexity {finding['complexity']} "
                        f"(limit: {self.max_complexity})"
                    ),
                    suggestion=(
                        f"Break '{finding['function']}' into smaller functions, "
                        f"each with complexity ≤ {self.max_complexity}. "
                        f"Use early-return guard clauses to reduce nesting."
                    ),
                ))

        if not results:
            results.append(GateResult(
                gate_name="cyclomatic_complexity",
                passed=True,
                severity=0,
                message="All functions within complexity threshold.",
            ))

        return results


@dataclass
class DuplicationGate(QualityGate):
    """Enforces maximum allowed code duplication percentage.

    Duplicated logic violates DRY and means bug fixes or security patches
    must be applied in multiple locations — increasing the chance of missed updates.
    """

    max_duplication_pct: float = 5.0

    def check(self) -> list[GateResult]:
        # Simulated duplication scan results
        # In production, use tools like pmd-cpd, jscpd, or semgrep rules
        simulated_results = [
            {"duplication_pct": 3.2, "blocks_affected": 4, "files": ["src/auth/", "src/api/"]},
            {"duplication_pct": 8.7, "blocks_affected": 12, "files": ["src/billing/", "src/reporting/"]},
        ]

        results: list[GateResult] = []

        for scan in simulated_results:
            if scan["duplication_pct"] > self.max_duplication_pct:
                results.append(GateResult(
                    gate_name="code_duplication",
                    passed=False,
                    severity=3,
                    message=(
                        f"Duplication at {scan['duplication_pct']}% across "
                        f"{scan['blocks_affected']} blocks in {', '.join(scan['files'])} "
                        f"(limit: {self.max_duplication_pct}%)"
                    ),
                    suggestion="Extract shared logic into a common utility module or service class.",
                ))

        return results


def run_all_gates(gates: list[QualityGate]) -> dict[str, bool]:
    """Execute all quality gates and return pass/fail status.

    If any gate returns a severity-3 (blocking) result, the merge is blocked.
    Returns a mapping of gate_name to whether it passed overall.

    Args:
        gates: List of QualityGate implementations to run.

    Returns:
        Dictionary mapping gate names to pass/fail booleans.

    Raises:
        RuntimeError: If any gate has blocking (severity=3) failures,
                     indicating new debt was introduced in this PR.
    """
    all_passed = True
    findings_by_gate: dict[str, list[GateResult]] = {}

    for gate in gates:
        results = gate.check()
        findings_by_gate[type(gate).__name__] = results

        # A gate fails if any result has severity 3 and passed=False
        gate_passed = all(
            r.severity != 3 or r.passed
            for r in results
        )
        if not gate_passed:
            all_passed = False

    if not all_passed:
        blocking_issues = [
            r
            for results in findings_by_gate.values()
            for r in results
            if r.severity == 3 and not r.passed
        ]
        issue_list = "\n".join(f"  - {i.message}" for i in blocking_issues)
        raise RuntimeError(
            f"Quality gates blocked merge. Issues found:\n{issue_list}\n\n"
            "Address these before merging to prevent new debt accumulation."
        )

    return {name: True for name in findings_by_gate}


# --- Example usage in CI pipeline ---
if __name__ == "__main__":
    gates = [
        ComplexityGate(max_complexity=10),
        DuplicationGate(max_duplication_pct=5.0),
    ]

    try:
        results = run_all_gates(gates)
        for gate_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{status} — {gate_name}")
        print("\n✅ All gates passed. Merge is safe.")
    except RuntimeError as e:
        print(f"\n🚫 MERGE BLOCKED: {e}")
```

### Pattern 4: Refactoring Payoff Tracker

Track progress on debt reduction with measurable outcomes.

```python
"""Measures the impact of debt reduction efforts using velocity and quality metrics."""

from dataclasses import dataclass, field
from datetime import date


@dataclass
class SprintMetrics:
    """Tracks engineering metrics for a single sprint to measure debt reduction impact."""
    sprint_id: str
    start_date: date
    end_date: date
    feature_points_completed: int
    bug_count: int
    refactoring_items_completed: int
    new_debt_items_introduced: int
    average_cyclomatic_complexity: float = 0.0
    code_coverage_pct: float = 0.0

    @property
    def net_debt_change(self) -> int:
        """Net change in debt items this sprint (positive = reduction)."""
        return self.refactoring_items_completed - self.new_debt_items_introduced

    @property
    def velocity_trend(self) -> str:
        """Returns the trend direction of feature delivery."""
        if self.feature_points_completed >= 10:
            return "improving"
        elif self.feature_points_completed <= 4:
            return "declining"
        return "stable"


@dataclass
class DebtReductionReport:
    """Comprehensive report of debt reduction progress over a period."""
    period_start: date
    period_end: date
    total_debt_items_opened: int
    total_debt_items_closed: int
    average_interest_rate_paid_down: float = 0.0
    new_debt_items_introduced: int = 0
    prevention_gates_enforced: int = 0
    sprint_metrics: list[SprintMetrics] = field(default_factory=list)

    @property
    def debt_reduction_rate(self) -> float:
        """Percentage of opened debt items that were closed."""
        if self.total_debt_items_opened == 0:
            return 0.0
        return (self.total_debt_items_closed / self.total_debt_items_opened) * 100

    @property
    def net_debt_flow(self) -> int:
        """Net change: positive = more debt paid than created."""
        return self.total_debt_items_closed - self.new_debt_items_introduced

    def generate_summary(self) -> str:
        """Generate a human-readable summary of the debt reduction period."""
        lines = [
            f"=== Technical Debt Reduction Report ({self.period_start} to {self.period_end})",
            f"  Total items opened:   {self.total_debt_items_opened}",
            f"  Total items closed:   {self.total_debt_items_closed}",
            f"  Reduction rate:       {self.debt_reduction_rate:.1f}%",
            f"  New debt introduced:  {self.new_debt_items_introduced}",
            f"  Net flow:             {'+' if self.net_debt_flow >= 0 else ''}{self.net_debt_flow}",
            f"  Prevention gates run: {self.prevention_gates_enforced}",
        ]

        if self.sprint_metrics:
            lines.append("\n  Sprint Breakdown:")
            for sm in self.sprint_metrics:
                lines.append(
                    f"    Sprint {sm.sprint_id}: "
                    f"features={sm.feature_points_completed}, "
                    f"bugs={sm.bug_count}, "
                    f"refactors={sm.refactoring_items_completed}, "
                    f"net_debt={sm.net_debt_change:+d}, "
                    f"velocity={sm.velocity_trend}"
                )

        return "\n".join(lines)


# --- Example: Generate a report from sprint data ---
if __name__ == "__main__":
    report = DebtReductionReport(
        period_start=date(2026, 1, 6),
        period_end=date(2026, 3, 28),
        total_debt_items_opened=47,
        total_debt_items_closed=35,
        average_interest_rate_paid_down=3.4,
        new_debt_items_introduced=8,
        prevention_gates_enforced=24,
        sprint_metrics=[
            SprintMetrics(
                sprint_id="S14",
                start_date=date(2026, 1, 6),
                end_date=date(2026, 1, 17),
                feature_points_completed=8,
                bug_count=3,
                refactoring_items_completed=5,
                new_debt_items_introduced=2,
            ),
            SprintMetrics(
                sprint_id="S15",
                start_date=date(2026, 1, 20),
                end_date=date(2026, 2, 7),
                feature_points_completed=6,
                bug_count=5,
                refactoring_items_completed=8,
                new_debt_items_introduced=3,
            ),
        ],
    )

    print(report.generate_summary())
```

---

## Constraints

### MUST DO

- Classify every debt item on both axes (reckless/prudent AND structural/incidental) before prioritizing — incomplete classification leads to misallocated effort
- Score interest rates based on measurable evidence: bug frequency, developer survey data, cycle-time impact — not opinions or feelings
- Include at least 20% of the backlog as Quick Wins in the first two sprints to build team momentum and demonstrate tangible ROI
- Run prevention gates in CI/CD automatically — if debt detection relies on manual checks, it will not catch issues before they ship
- Pair every refactoring change with regression tests or property-based tests that verify unchanged behavior
- Document prudent debt decisions as Architecture Decision Records (ADRs) so future teams understand the tradeoff context
- Measure and report net debt flow each sprint — you cannot manage what you do not measure
- Follow SOLID and DRY principles when designing the refactoring — do not create new violations while fixing old ones

### MUST NOT DO

- Never blame individual developers for reckless debt — it is always a process or cultural failure, never a personal one. The team owns the codebase collectively.
- Do not treat all debt equally — a complexity spike in a rarely-modified utility function has near-zero interest rate; the same spike in a daily-used API handler is critical
- Do not refactor without tests — this is how "improvements" introduce production regressions that become even harder to fix
- Do not use technical debt as an excuse to delay shipping all features — balance debt payoff with feature delivery; dedicate 10–20% of sprint capacity to debt reduction
- Do not allow new reckless debt into the codebase by approving PRs that bypass linting, complexity gates, or code review standards
- Do not estimate effort without calibrating against past refactors — uncalibrated estimates lead to unrealistic sprints and abandoned plans
- Do not let the debt inventory become stale — audit and update it at least once per quarter as the codebase evolves

---

## Output Template

When applying this skill, produce output in the following structure:

1. **Debt Inventory Summary** — Count of items by category (duplication, complexity, security, documentation, test coverage), with total count
2. **Classification Breakdown** — Table showing counts for each quadrant: Reckless/Structural, Reckless/Incidental, Prudent/Structural, Prudent/Incidental
3. **Priority Matrix** — Items organized into the four buckets (Quick Wins, Major Projects, Fill-Ins, Thankless Tasks) with payoff scores
4. **Top 5 Payoff Items** — The highest-scoring items with: description, interest rate, effort estimate, cost-of-delay, and recommended refactoring technique
5. **Prevention Recommendations** — Specific CI/CD gates and review checklist items tailored to the codebase's most common debt patterns
6. **Sprint Plan** — Concrete actions for the next sprint (items to tackle, expected outcomes, success metrics)

---

## Related Skills

| Skill                     | Purpose                                                            |
| -----------------------   | ------------------------------------------------------------------ |
| `engineering-principles`  | Foundational principles (SOLID, DRY, KISS) that prevent new debt   |
| `refactoring-techniques`  | Specific transformations to apply when paying down identified debt |
| `code-quality-policies`   | Policies and thresholds for automated quality gates in CI/CD       |
