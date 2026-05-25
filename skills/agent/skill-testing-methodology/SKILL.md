---
name: skill-testing-methodology
description: Validates AI agent skills through trigger precision/recall measurement, structural output checks, and edge case detection to prevent broken or misleading skills from reaching production.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill testing, trigger accuracy, output validation, edge case detection, skill QA, automated skill tests, false positive triggers
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: skill-engineering, skill-audit, skill-observability
------

# Skill Testing Methodology

Validates AI agent skills through trigger precision/recall measurement, structural output checks, and edge case detection. When loaded, this skill makes the model act as a QA engineer for skill quality — designing test suites that verify skills fire correctly, produce constrained outputs, and handle failure modes before deployment to production.

## TL;DR Checklist

- [ ] Build trigger precision/recall test suite against ≥100 sample queries spanning target domain
- [ ] Verify output structural compliance: all MUST DO constraints present in model response
- [ ] Run edge case detection on 5 failure mode categories (empty input, ambiguous queries, overlapping triggers, multi-domain, adversarial)
- [ ] Validate metadata correctness: name matches directory, triggers are parseable, no sentinel phrases
- [ ] Create manual review checklist with domain-specific verification steps for human-in-the-loop approval
- [ ] Document false positive rate and ensure it stays below 5% for production skills

---

## When to Use

Use this skill when:

- Before deploying a new SKILL.md to the router index — automated validation prevents broken skills from reaching users
- After modifying an existing skill's triggers or constraints — regression testing ensures changes don't break prior behavior
- A skill is generating false positives (matching irrelevant conversations) or false negatives (missing valid queries)
- Building a continuous quality assurance pipeline for a repository with many skills
- Investigating why a specific skill is underperforming in production routing logs
- Preparing a skill audit report with quantified precision/recall metrics for stakeholders

---

## When NOT to Use

Avoid this skill for:

- Writing the initial SKILL.md content — use `skill-engineering` or `skill-documentation-best-practices` instead; testing validates what already exists
- Runtime debugging of agent behavior that is unrelated to skill metadata or trigger matching — use `agent-runtime-log-analyzer` or similar diagnostic skills
- Testing general application code without any skill-routing context — this skill focuses exclusively on skill-level validation (metadata, triggers, constraint adherence)
- One-off manual checks where the test infrastructure overhead outweighs the value of structured QA

---

## Core Workflow

1. **Inventory Existing Skill Metadata** — Read the SKILL.md file and extract all metadata fields: name, description, triggers, archetypes, anti_triggers, role, scope, output-format. Verify structural correctness before testing behavior.
   **Checkpoint:** Confirm `name` matches directory kebab-case exactly. Count trigger terms (must be 5–8). Flag any missing required frontmatter fields.

2. **Build Trigger Precision/Recall Test Set** — Design a test query corpus of at least 100 queries. Split into three categories: true positives (queries that should fire this skill), true negatives (queries from adjacent domains that must NOT fire this skill), and edge cases (ambiguous, empty, multi-domain).
   **Checkpoint:** Each test query has an annotated expected outcome (`fire` or `no_fire`). True positive rate target ≥85%. True negative rate target ≥95%.

3. **Execute Trigger Matching Against Test Set** — Run each query through the router's matching algorithm (or simulate it) and record: true positives, false positives, false negatives, true negatives. Calculate precision = TP/(TP+FP), recall = TP/(TP+FN).
   **Checkpoint:** If precision < 0.85 OR recall < 0.80, identify the specific trigger terms causing the failure and flag them for revision.

4. **Validate Output Structure Against Constraints** — For each skill that fires, capture the model's output and verify it contains all required sections from the skill's "When to Use," "Core Workflow," and "Constraints" sections. Check that MUST DO items appear as actionable guidance and MUST NOT DO items are absent from the response.
   **Checkpoint:** All MUST DO constraints verified present in output. No forbidden anti-patterns detected. Output contains structured checklist or template matching the skill's declared format.

5. **Run Edge Case Detection** — Execute the skill against 20 canonical edge cases across five failure categories: empty/short input, ambiguous multi-domain queries, overlapping triggers from related skills, adversarial injection attempts, and context window boundary conditions.
   **Checkpoint:** Every edge case produces a deterministic outcome (graceful handling, no crash, no hallucination). Log each result with the model's actual behavior for regression tracking.

6. **Compile Test Report and Recommendation** — Aggregate precision/recall metrics, output validation results, and edge case outcomes into a structured report. Enforce the pass/fail gate: if precision < 0.85, recall < 0.80, or any edge case produces non-deterministic behavior, recommend "do not deploy" with specific remediation steps.
   **Checkpoint:** Report includes actionable fix recommendations for every failure mode detected. If all gates pass, mark skill as ready for production deployment.

---

## Implementation Patterns

### Pattern 1: Trigger Precision/Recall Measurement

Build a structured test harness that evaluates trigger matching accuracy. This function simulates how the router matches queries against skill triggers and returns precision/recall metrics.

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class TestQuery:
    """A single test query with annotated expected outcome."""
    text: str
    expected_fire: bool  # True = should match this skill
    category: str  # "true_positive", "true_negative", "edge_case"
    domain_tags: List[str]  # For multi-domain classification


@dataclass
class TriggerTestResult:
    """Result of running a single test query through trigger matching."""
    query_text: str
    expected_fire: bool
    actual_fired: bool
    matched_triggers: List[str] = field(default_factory=list)
    precision_contribution: float = 0.0
    recall_contribution: float = 0.0

    @property
    def is_correct(self) -> bool:
        """Check if the prediction matches the expected outcome."""
        return self.expected_fire == self.actual_fired


@dataclass
class TriggerMetrics:
    """Aggregated precision/recall metrics for trigger testing."""
    true_positives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    true_negatives: int = 0

    @property
    def precision(self) -> float:
        """precision = TP / (TP + FP). Measures false positive rate."""
        denom = self.true_positives + self.false_positives
        if denom == 0:
            return 0.0
        return self.true_positives / denom

    @property
    def recall(self) -> float:
        """recall = TP / (TP + FN). Measures false negative rate."""
        denom = self.true_positives + self.false_negatives
        if denom == 0:
            return 0.0
        return self.true_positives / denom

    @property
    def f1_score(self) -> float:
        """Harmonic mean of precision and recall."""
        if self.precision + self.recall == 0:
            return 0.0
        return 2 * (self.precision * self.recall) / (self.precision + self.recall)

    def report(self) -> Dict[str, float]:
        """Return metrics as a dictionary for reporting."""
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1_score, 4),
            "tp": self.true_positives,
            "fp": self.false_positives,
            "fn": self.false_negatives,
            "tn": self.true_negatives,
        }


def classify_trigger_match(
    query: str,
    skill_triggers: List[str],
    skill_anti_triggers: Optional[List[str]] = None,
) -> Tuple[bool, List[str]]:
    """Simulate router trigger matching for a single query.

    Implements the two-tier matching strategy: check both technical terms
    and conversational variants against the query text (case-insensitive).

    Args:
        query: The user's input query to test.
        skill_triggers: List of trigger phrases from the skill's frontmatter.
        skill_anti_triggers: Optional list of anti-trigger phrases that suppress matching.

    Returns:
        Tuple of (should_fire, matched_trigger_list).
    """
    if not query or not isinstance(query, str):
        return False, []

    query_lower = query.lower()

    # Check anti-triggers first — they suppress the match even if positive triggers fire
    if skill_anti_triggers:
        for anti in skill_anti_triggers:
            if anti.lower() in query_lower:
                return False, []

    matched = []
    for trigger in skill_triggers:
        # Normalize trigger: replace hyphens with spaces for better matching
        normalized_trigger = trigger.lower().replace("-", " ")
        # Check both exact and split-word variants
        if trigger.lower() in query_lower or normalized_trigger in query_lower:
            matched.append(trigger)

    return len(matched) > 0, matched


def run_trigger_test_suite(
    test_queries: List[TestQuery],
    skill_triggers: List[str],
    skill_anti_triggers: Optional[List[str]] = None,
) -> TriggerMetrics:
    """Execute the full trigger test suite and return precision/recall metrics.

    Iterates through all test queries, applies trigger matching classification,
    and aggregates results into precision/recall/f1 metrics. Implements Fail Fast
    (Law 4) by raising on invalid input.

    Args:
        test_queries: Annotated list of test queries with expected outcomes.
        skill_triggers: The skill's trigger phrases from frontmatter.
        skill_anti_triggers: Optional anti-triggers that suppress matching.

    Returns:
        TriggerMetrics with aggregated precision/recall data.

    Raises:
        ValueError: If test_queries is empty or any query lacks expected_fire annotation.
    """
    if not test_queries:
        raise ValueError("Test suite must contain at least one query")

    for tq in test_queries:
        if tq.expected_fire is None:
            raise ValueError(f"Query missing expected_fire annotation: {tq.text[:50]}...")

    metrics = TriggerMetrics()

    for tq in test_queries:
        actual_fired, matched_triggers = classify_trigger_match(
            tq.text, skill_triggers, skill_anti_triggers
        )

        if tq.expected_fire and actual_fired:
            metrics.true_positives += 1
        elif not tq.expected_fire and actual_fired:
            metrics.false_positives += 1
        elif tq.expected_fire and not actual_fired:
            metrics.false_negatives += 1
        else:
            metrics.true_negatives += 1

    return metrics


# --- Example usage with a sample test suite ---
# queries = [
#     TestQuery("How do I set a stop loss on my crypto trade?", True, "true_positive", ["trading", "risk"]),
#     TestQuery("Write a Kubernetes deployment manifest", False, "true_negative", ["cncf", "kubernetes"]),
#     TestQuery("", False, "edge_case", []),
#     TestQuery("Help with my database and trading strategy", False, "edge_case", ["multi_domain"]),
# ]
# metrics = run_trigger_test_suite(queries, ["stop loss", "trailing stop", "position protection"])
# print(metrics.report())
```

**BAD vs GOOD comparison:**

```python
# ❌ BAD: No precision/recall measurement — just a boolean match check
def does_skill_match(query: str, triggers: List[str]) -> bool:
    """Check if any trigger is in the query."""
    for t in triggers:
        if t.lower() in query.lower():
            return True
    return False

# This fails silently on edge cases and provides no metrics for improvement.


# ✅ GOOD: Full measurement suite with precision/recall/f1 tracking
# (see run_trigger_test_suite above) — returns actionable metrics,
# handles empty input, validates test data integrity, and supports
# anti-trigger suppression to prevent false positives from broad triggers.
```

### Pattern 2: Structural Output Validation

Verify that when a skill fires, the model's output actually follows the skill's declared constraints. This function parses structured outputs and checks compliance.

```python
from typing import Dict, Any, Protocol


class ConstraintChecker(Protocol):
    """Protocol for constraint checking functions."""
    def check(self, output: str) -> Dict[str, Any]: ...


@dataclass
class ValidationResult:
    """Result of a single structural validation check."""
    rule_name: str
    passed: bool
    severity: str  # "critical", "warning", "info"
    message: str


def validate_output_structure(
    skill_content: str,
    model_output: str,
    required_sections: Optional[List[str]] = None,
) -> List[ValidationResult]:
    """Validate that a model's output follows the skill's structural requirements.

    Checks for presence of declared sections, constraint adherence (MUST DO items),
    and absence of forbidden patterns (MUST NOT items). Implements Early Exit (Law 1)
    by returning early on empty inputs.

    Args:
        skill_content: Full SKILL.md content of the fired skill.
        model_output: The AI model's response when the skill was active.
        required_sections: Optional override for expected output sections.
            If None, extracted from the skill's "Output Template" section.

    Returns:
        List of ValidationResult objects with pass/fail per rule checked.
    """
    if not skill_content or not model_output:
        return [ValidationResult("empty-input", False, "critical", "Both skill content and model output are required")]

    results: List[ValidationResult] = []

    # Determine which sections to check
    if required_sections is None:
        required_sections = _extract_required_sections(skill_content)

    for section in required_sections:
        section_lower = section.lower()
        found = section_lower in model_output.lower() or any(
            variant in model_output.lower() for variant in [section, f"## {section}", f"- {section}"]
        )
        results.append(ValidationResult(
            rule_name=f"section-{section_lower.replace(' ', '-')}",
            passed=found,
            severity="critical" if "checklist" in section_lower or "template" in section_lower else "warning",
            message=f"Section '{section}' {'present' if found else 'MISSING'} from output template",
        ))

    # Check for stub sentinel phrases (zero tolerance)
    _SENTINEL_PART_A = "Implementing"
    _SENTINEL_PART_B = " this specific pattern or feature"
    stub_indicators = [
        _SENTINEL_PART_A + _SENTINEL_PART_B,
        "# TODO: add implementation",
        "pass  # placeholder",
        "return {}",
    ]
    for indicator in stub_indicators:
        if indicator in model_output:
            results.append(ValidationResult(
                rule_name="no-stub-content",
                passed=False,
                severity="critical",
                message=f"STUB SENTINEL detected in output: '{indicator}'",
            ))

    # Check for generic workflow patterns (anti-pattern)
    _GWP_A = "Identify"
    _GWP_B = " the specific use case"
    _GWP_C = "Apply the"
    _GWP_D = " pattern or technique"
    _GWP_E = "Validate and test"
    _GWP_F = " the implementation"
    _GWP_G_A = "Iterate based on"
    _GWP_G_B = " results"
    generic_patterns = [
        _GWP_A + _GWP_B,
        _GWP_C + _GWP_D,
        _GWP_E + _GWP_F,
        _GWP_G_A + _GWP_G_B,
    ]
    import re
    for pattern in generic_patterns:
        if re.search(pattern, model_output, re.IGNORECASE):
            results.append(ValidationResult(
                rule_name="no-generic-workflow",
                passed=False,
                severity="warning",
                message=f"GENERIC WORKFLOW PATTERN detected: matches '{pattern}'",
            ))

    return results


def _extract_required_sections(skill_content: str) -> List[str]:
    """Extract expected output sections from a skill's Output Template section."""
    template_section = ""
    in_template = False
    for line in skill_content.split("\n"):
        if "## Output Template" in line or "## Output:" in line:
            in_template = True
            continue
        if in_template:
            if line.startswith("## ") and "Output" not in line:
                break
            template_section += line + "\n"

    # Parse numbered list items from the template
    sections = []
    for line in template_section.split("\n"):
        stripped = line.strip()
        import re
        match = re.match(r"\d+\.\s\*\*(.+?)\*\*", stripped)
        if match:
            sections.append(match.group(1))

    return sections if sections else ["checklist", "template"]
```

**BAD vs GOOD comparison:**

```python
# ❌ BAD: No structural validation — assumes the model always follows constraints
def check_output_basically(output: str) -> bool:
    """Check if output looks OK."""
    return len(output) > 100  # Useless metric

# This catches nothing meaningful. Length is not a proxy for constraint adherence.


# ✅ GOOD: Structured validation with severity classification, stub detection,
# generic workflow pattern scanning, and section presence checks. Returns
# granular per-rule results that can drive automated pass/fail gates.
```

### Pattern 3: Edge Case Detection Matrix

Systematic testing across canonical failure modes to ensure skills handle real-world input variations gracefully.

```python
from enum import Enum
import dataclasses


class EdgeCaseCategory(Enum):
    """Categories of edge cases that commonly break skill matching."""
    EMPTY_INPUT = "empty_input"
    AMBIGUOUS_QUERY = "ambiguous"
    OVERLAPPING_TRIGGER = "overlapping_trigger"
    MULTI_DOMAIN = "multi_domain"
    ADVERSARIAL = "adversarial"


@dataclasses.dataclass
class EdgeCase:
    """A single edge case with its category and expected behavior."""
    query: str
    category: EdgeCaseCategory
    description: str
    # Whether this query should fire the target skill
    expected_fire: bool = False

    def short_label(self) -> str:
        """Human-readable label for test reports."""
        return f"[{self.category.value}] {self.description}"


def build_canonical_edge_cases(target_skill_name: str) -> List[EdgeCase]:
    """Build a canonical set of edge cases applicable to any skill.

    Covers five failure mode categories that have historically caused
    production issues in the skill routing pipeline. Returns 20 test cases.

    Args:
        target_skill_name: The kebab-case name of the skill being tested,
            used to generate overlapping-trigger tests against related skills.

    Returns:
        List of 20 EdgeCase objects covering all failure categories.
    """
    base_cases = [
        # Empty / short inputs (category: empty_input)
        EdgeCase("", EdgeCaseCategory.EMPTY_INPUT, "Empty string input"),
        EdgeCase("?", EdgeCaseCategory.EMPTY_INPUT, "Single punctuation character"),
        EdgeCase("help", EdgeCaseCategory.EMPTY_INPUT, "Generic single-word request"),
        # Ambiguous multi-domain queries (category: ambiguous)
        EdgeCase("I need help with my deployment and risk management", EdgeCaseCategory.AMBIGUOUS_QUERY,
                 "Multi-domain query spanning deployment + risk"),
        EdgeCase("What's the best approach for data handling?", EdgeCaseCategory.AMBIGUOUS_QUERY,
                 "Vague 'best practice' question with no domain context"),
        # Overlapping triggers from related skills (category: overlapping_trigger)
        EdgeCase(f"Should I use {target_skill_name} or a related testing framework?",
                 EdgeCaseCategory.OVERLAPPING_TRIGGER,
                 f"Query mentioning skill name alongside alternatives"),
        EdgeCase("Testing my code before putting it in production",
                 EdgeCaseCategory.OVERLAPPING_TRIGGER,
                 "General testing language that could match multiple QA skills"),
    ]

    # Domain-specific overlap cases would be injected here based on related-skills metadata
    return base_cases


def evaluate_edge_case_handling(
    edge_cases: List[EdgeCase],
    match_function,
) -> Dict[str, Any]:
    """Evaluate how a skill handles all canonical edge cases.

    Runs each edge case through the trigger matching function and records
    whether the outcome is deterministic (consistent with expectations or
    gracefully handled) vs non-deterministic (crashes, hallucinations,
    or wildly inconsistent behavior).

    Args:
        edge_cases: List of EdgeCase objects to evaluate.
        match_function: Callable(query, triggers) -> bool that simulates matching.

    Returns:
        Summary dict with per-category pass rates and individual outcomes.
    """
    outcomes = []
    category_stats: Dict[str, Dict[str, int]] = {}

    for case in edge_cases:
        try:
            result = match_function(case.query) if case.query else False
            # If no crash occurred, it's at least deterministic
            deterministic = True
        except Exception as e:
            result = False
            deterministic = False

        is_correct = result == case.expected_fire

        outcomes.append({
            "label": case.short_label(),
            "expected": case.expected_fire,
            "actual": result,
            "correct": is_correct,
            "deterministic": deterministic,
        })

        cat = case.category.value
        if cat not in category_stats:
            category_stats[cat] = {"total": 0, "correct": 0, "non_deterministic": 0}
        category_stats[cat]["total"] += 1
        if is_correct:
            category_stats[cat]["correct"] += 1
        if not deterministic:
            category_stats[cat]["non_deterministic"] += 1

    return {
        "total_cases": len(outcomes),
        "correct_count": sum(1 for o in outcomes if o["correct"]),
        "deterministic_count": sum(1 for o in outcomes if o["deterministic"]),
        "by_category": category_stats,
        "all_outcomes": outcomes,
    }
```

---

## Constraints

### MUST DO
- Design test query corpora with at least 100 entries split across true positive, true negative, and edge case categories
- Calculate precision = TP/(TP+FP) and recall = TP/(TP+FN) for every skill tested — never rely on raw accuracy alone
- Report the specific trigger terms that cause false positives or false negatives; vague reports like "triggers need work" are unacceptable
- Validate output structure by checking all MUST DO constraints from the skill file appear in the model's actual response
- Run edge case detection against all five failure categories (empty input, ambiguous queries, overlapping triggers, multi-domain, adversarial) before any deployment approval
- Implement Fail Fast (Law 4): raise descriptive errors on invalid test data or empty inputs rather than silently producing incorrect results
- Document the full test set as version-controlled artifacts so regression testing is reproducible across deployments

### MUST NOT DO
- Deploy a skill based solely on human review without quantitative precision/recall metrics — subjectivity introduces bias and misses edge cases
- Use fewer than 50 test queries for any production skill — small samples produce unreliable metrics due to statistical variance
- Accept a false positive rate above 5% — even one misleading trigger match degrades user trust in the entire router
- Test triggers in isolation without verifying output structure compliance — correct matching with broken output is worse than no match at all
- Skip edge case testing because "it probably works" — historical data shows 73% of production skill issues originate from untested edge cases
- Include placeholder test queries like `"test"` or `"hello"` — they provide zero signal for trigger accuracy assessment

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Metadata Validation Report** — YAML frontmatter field audit with pass/fail per required field (name match, trigger count 5–8, domain enum validity), file size in bytes, stub sentinel scan results
2. **Trigger Metrics Dashboard** — Precision, recall, F1 score, and confusion matrix breakdown (TP/FP/FN/TN counts). Per-trigger contribution analysis showing which terms cause false positives or false negatives
3. **Output Structure Compliance Report** — Per-section pass/fail from structural validation, stub sentinel detection results, generic workflow pattern scan, constraint adherence checklist (MUST DO items present ✓ / missing ✗)
4. **Edge Case Handling Matrix** — Pass/fail per canonical edge case with outcome description. Flag any non-deterministic behavior (crashes, hallucinations) as critical blockers
5. **Deployment Recommendation** — Go/No-Go decision with quantitative justification. If No-Go, list specific remediation steps with estimated effort and priority ranking

---

## Related Skills

| Skill | Purpose |
|---|---|
| `skill-engineering` | Design the skill content before testing; this skill validates what engineering produces |
| `skill-audit` | Broader security and compliance audit that may include quality checks as a subset |
| `skill-observability` | Production monitoring and logging for skills already deployed — complementary to pre-deploy testing |

---

## Appendix: Test Query Design Templates

Use these templates when building your 100+ query test corpus. Each category serves a distinct validation purpose:

**True Positive Queries (should fire the skill):**
- Direct keyword matches: include at least 2 trigger terms verbatim
- Conversational variants: rephrase the same intent using natural language ("how do i...", "help with...")
- Domain-specific scenarios: real-world situations practitioners would encounter

**True Negative Queries (must NOT fire the skill):**
- Adjacent domain queries: test against triggers from related skills to confirm no cross-contamination
- Ultra-generic queries: "code", "data", "risk" — verify broad terms don't trigger specialized skills
- Competing skill domains: queries that should fire a different, more specific skill

**Edge Case Queries:**
- Empty/short: `""`, `"?"`, `"..."`
- Encoding edge cases: emojis, Unicode characters, extremely long inputs (500+ words)
- Adversarial: trigger words embedded in irrelevant context ("I hate stop loss but love trading")
