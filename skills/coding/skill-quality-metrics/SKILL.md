---
name: skill-quality-metrics
description: Scores SKILL.md files across seven dimensions (content depth, code quality, trigger design, structural completeness, constraint specificity, domain compliance, stub resistance) using a Python-based calculator for objective quality assessment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: skill quality metrics, skill scoring, quality rubric, skill evaluation framework, skill health score, how do i measure skill quality, skill audit checklist, skill grading system
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-skill-testing-validation, coding-skill-lifecycle-management, agent-skill-optimizer
---

# Skill Quality Metrics Framework

Scores SKILL.md files across seven measurable dimensions using a weighted rubric system. When loaded, this skill makes the model act as a quality auditor — evaluating skills objectively against quantifiable criteria, producing a numerical score with breakdown by dimension and actionable improvement recommendations.

## TL;DR Checklist

- [ ] Compute content depth score (word count, code blocks, examples)
- [ ] Evaluate code block quality (typed signatures, docstrings, guard clauses, real implementations)
- [ ] Score trigger design (technical vs conversational balance, specificity calibration)
- [ ] Verify structural completeness (all required sections present per domain rules)
- [ ] Check constraint specificity (each rule testable by inspection, no abstract principles)
- [ ] Confirm domain compliance (agent has ASCII flow diagram, cncf has YAML manifests, etc.)
- [ ] Run stub resistance scan (zero sentinel phrases, zero generic workflow patterns)
- [ ] Produce final weighted score with per-dimension breakdown and improvement actions

---

## When to Use

Use this skill when:

- Auditing a batch of existing skills for quality consistency across the repository
- Reviewing a PR that adds or modifies a SKILL.md before approving the merge
- Benchmarking your own skill against objective criteria before committing
- Building a CI/CD gate that scores every skill and flags those below a threshold
- Comparing two competing skill designs to select the better implementation

## When NOT to Use

Avoid this skill for:

- Testing whether an AI agent correctly uses a skill in a live session — use `coding-skill-testing-validation` for integration testing
- Managing version bumps or deprecation schedules — use `coding-skill-lifecycle-management` instead
- Generating new skills from scratch — start with `coding-skill-development-workflow` first
- Reviewing the domain logic inside a skill's code examples — this evaluates structure and quality, not mathematical correctness

---

## Core Workflow

1. **Load and Parse Target SKILL.md** — Read the full file content. Extract YAML frontmatter using regex or a YAML parser. Separate the markdown body from metadata. Record raw file size in bytes.
   **Checkpoint:** Frontmatter must parse cleanly. If YAML is malformed, report the exact line and column of the error before scoring.

2. **Score Content Depth (Dimension 1)** — Count total words in the markdown body (excluding frontmatter). Count fenced code blocks. Count BAD vs GOOD example pairs. Compute score: `(word_count / 3000) * 40 + min(code_blocks / 2, 1.0) * 20 + min(bad_good_pairs / 1, 1.0) * 20`, capped at 100.
   **Checkpoint:** Minimum threshold is 60 — any skill scoring below 60 on content depth alone must be expanded before further evaluation proceeds.

3. **Evaluate Code Block Quality (Dimension 2)** — For each code block, check for: type hints in signatures (weight: 0.25), docstrings or inline comments explaining purpose (weight: 0.25), guard clauses or input validation (weight: 0.25), absence of placeholder patterns like `pass`, `# TODO`, `return {}` (weight: 0.25). Average across all blocks.
   **Checkpoint:** An implementation-role skill with any code block containing `pass` as the sole body receives an automatic zero for that block.

4. **Score Trigger Design (Dimension 3)** — Parse `metadata.triggers`. Count total trigger terms (valid range: 5-8). Check for presence of technical terms vs conversational phrases. Flag any single-word generic triggers (`code`, `data`, `risk`, `pattern`). Compute score based on count compliance, diversity ratio, and absence of generics.
   **Checkpoint:** A trigger set with fewer than 4 terms or more than 1 generic single-word term receives a maximum score of 50 for this dimension.

5. **Verify Structural Completeness (Dimension 4)** — Scan the markdown body for required sections: H1 title, role/purpose paragraph, "When to Use", "When NOT to Use", Core Workflow, Constraints. For domain-specific requirements: agent skills need ASCII flow diagram; cncf skills need YAML manifests; coding/trading need BAD vs GOOD pairs. Score as percentage of required sections found.
   **Checkpoint:** Missing a single mandatory section (H1 title or Core Workflow) caps this dimension at 40 points regardless of other sections present.

6. **Check Constraint Specificity (Dimension 5)** — Extract MUST DO and MUST NOT DO sections. For each constraint, evaluate whether it is testable by inspection: does it contain a specific behavior, pattern, or condition that can be verified without subjective judgment? Score as percentage of constraints passing the testability check.
   **Checkpoint:** Any constraint containing the phrase "best practices" or "follow conventions" is flagged as non-testable and excluded from the positive count.

7. **Confirm Domain Compliance (Dimension 6)** — Apply domain-specific rules: agent skills must reference `code-philosophy`; coding skills must reference a standard (OWASP, SOLID, DRY, KISS); go skills must use `%w` error wrapping; linux skills must have `set -euo pipefail` in shell scripts; trading skills must include APEX platform path conventions. Score as binary pass/fail per rule with partial credit for partial compliance.
   **Checkpoint:** If the skill's domain is unrecognized, skip this dimension and score it as 100 (pass through) — the skill belongs to a domain not yet in scope.

8. **Run Stub Resistance Scan (Dimension 7)** — Apply all five zero-tolerance checks: file size ≥ 3000 bytes, zero stub sentinel phrases, ≥ 2 real code blocks for implementation skills, no generic workflow patterns ("identify → apply → validate"), trigger quality above minimum threshold. Score as percentage of checks passed (5/5 = 100).
   **Checkpoint:** Any single fatal violation (stub sentinel present OR file under 3000 bytes) caps this dimension at 20 points regardless of other passes.

9. **Compute Weighted Final Score** — Apply domain-specific weights to each dimension:

```
Content Depth       × 0.15
Code Block Quality  × 0.20
Trigger Design      × 0.15
Structural Completeness × 0.15
Constraint Specificity × 0.10
Domain Compliance   × 0.10
Stub Resistance     × 0.15

Final Score = Σ(dimension_score × dimension_weight)
```

**Checkpoint:** Final score below 70 triggers a detailed improvement action list. Final score below 50 requires full rewrite — the skill cannot be salvaged with incremental fixes.

---

## Python Quality Metrics Calculator

This calculator implements all seven dimensions and the weighted scoring system. Use it as a standalone tool or integrate into CI/CD pipelines.

```python
#!/usr/bin/env python3
"""Skill quality metrics calculator for SKILL.md files.

Evaluates skills across seven dimensions with domain-aware weighting.
Produces a final score (0-100) with per-dimension breakdown and
actionable improvement recommendations.
"""

import re
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DimensionScore:
    name: str
    raw_score: float  # 0-100
    weight: float
    weighted_score: float = 0.0
    issues: list[str] = field(default_factory=list)

    @property
    def passes_threshold(self) -> bool:
        return self.weighted_score >= (self.weight * 70)


@dataclass
class QualityReport:
    file_path: str
    dimensions: list[DimensionScore] = field(default_factory=list)
    final_score: float = 0.0
    grade: str = "F"
    recommendations: list[str] = field(default_factory=list)

    @property
    def passes(self) -> bool:
        return self.final_score >= 70

    @property
    def fails_critical(self) -> bool:
        return self.final_score < 50


STUB_SENTINELS = [
    "implementing this specific pattern or feature",
    "# TODO: implement",
    "replace with actual implementation",
    "your code here",
]

GENERIC_WORKFLOW_PATTERNS = [
    r"[Ii]dentify the use case",
    r"[Aa]pply the pattern",
    r"[Vv]alidate and test the implementation",
    r"[Ii]terate based on results",
    r"follow best practices",
]

GENERIC_TRIGGER_WORDS = {
    "code", "data", "risk", "pattern", "testing", "design",
    "security", "system", "management", "implementation",
}

DOMAIN_REQUIREMENTS = {
    "agent": ["ascii_flow_diagram", "fallback_routing", "code_philosophy_reference"],
    "cncf": ["yaml_manifest_example", "purpose_section", "architecture_section"],
    "coding": ["bad_good_comparison", "standard_reference", "constraints_section"],
    "go": ["error_wrapping_percent_w", "goroutine_lifecycle", "context_propagation"],
    "linux": ["set_euo_pipefail", "security_considerations", "idempotent_operations"],
    "trading": ["python_typed_signatures", "risk_constraints", "apex_path_conventions"],
}


def load_skill(path: str) -> tuple[str, str]:
    """Load SKILL.md and split into frontmatter YAML and markdown body."""
    content = Path(path).read_text(encoding="utf-8")
    if not content.startswith("---"):
        raise ValueError(f"Missing YAML frontmatter delimiter in {path}")
    parts = content.split("---", 2)
    if len(parts) < 3:
        raise ValueError(f"Malformed frontmatter in {path}")
    return parts[1].strip(), parts[2].strip()


def parse_frontmatter(fm: str) -> dict[str, str]:
    """Simple YAML field extractor for flat metadata."""
    fields = {}
    for line in fm.split("\n"):
        if ":" in line and not line.startswith(" "):
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields


def score_content_depth(body: str, code_blocks: list[str]) -> DimensionScore:
    """Dimension 1: Content depth — word count, code blocks, examples."""
    words = len(body.split())
    block_count = len(code_blocks)
    bad_good_pairs = len(re.findall(r"# [✖❌]", body))

    word_score = min(words / 3000, 1.0) * 40
    block_score = min(block_count / 2, 1.0) * 20
    pair_score = min(bad_good_pairs, 1.0) * 20
    total = word_score + block_score + pair_score

    issues = []
    if words < 3000:
        issues.append(f"Only {words} words — minimum recommended is 3000")
    if block_count < 2:
        issues.append(f"Only {block_count} code blocks — need at least 2 for implementation skills")
    if bad_good_pairs < 1:
        issues.append("No BAD vs GOOD comparison pair found")

    return DimensionScore(
        name="Content Depth", raw_score=total, weight=0.15,
        issues=issues,
    )


def score_code_quality(code_blocks: list[str]) -> DimensionScore:
    """Dimension 2: Code block quality — type hints, docstrings, guard clauses, no placeholders."""
    scores = []
    for i, block in enumerate(code_blocks):
        block_score = 0.0
        has_types = bool(re.search(r":\s*(int|float|str|bool|list\[|dict\[|tuple\[|Optional\])", block))
        has_docstring = '"""' in block or "'''" in block or "#" in block[:80]
        has_guard = bool(re.search(r"if\s+.*is\s+(None|\w+)\s*:", block) or "assert" in block)
        has_placeholder = any(p in block.lower() for p in ["pass", "# todo", "return {}", "..."])

        if has_types:
            block_score += 25
        if has_docstring:
            block_score += 25
        if has_guard:
            block_score += 25
        if not has_placeholder:
            block_score += 25

        scores.append(block_score)

    avg = sum(scores) / len(scores) if scores else 0
    issues = []
    for i, s in enumerate(scores):
        if s < 50:
            issues.append(f"Code block {i+1} scored only {s}/100 — add type hints, docstrings, and guard clauses")
        if any(p in code_blocks[i].lower() for p in ["pass", "# todo"]):
            issues.append(f"Code block {i+1} contains placeholder — replace with real implementation")

    return DimensionScore(
        name="Code Block Quality", raw_score=avg, weight=0.20,
        issues=issues,
    )


def score_trigger_design(triggers_str: str) -> DimensionScore:
    """Dimension 3: Trigger design — count, diversity, absence of generics."""
    if not triggers_str or not triggers_str.strip():
        return DimensionScore(name="Trigger Design", raw_score=0.0, weight=0.15,
                              issues=["No triggers defined"])

    triggers = [t.strip() for t in triggers_str.split(",") if t.strip()]
    count = len(triggers)
    generic_words = [t for t in triggers if t.lower() in GENERIC_TRIGGER_WORDS and len(t) < 8]
    has_conversational = any(
        t.startswith(("how do", "what is", "help with", "when to", "why use"))
        for t in triggers
    )

    score = 0.0
    issues = []

    # Count scoring (5-8 is ideal)
    if 5 <= count <= 8:
        score += 40
    elif 3 <= count <= 10:
        score += 25
    else:
        issues.append(f"Trigger count ({count}) outside optimal range of 5-8")

    # Diversity scoring
    if has_conversational:
        score += 30
    else:
        issues.append("No conversational trigger found — add at least one 'how do I...' variant")

    # Generic penalty
    if len(generic_words) == 0:
        score += 30
    elif len(generic_words) <= 1:
        score += 15
        issues.append(f"Generic single-word trigger(s): {', '.join(generic_words)}")
    else:
        score -= 15
        issues.append(f"Too many generic triggers ({len(generic_words)}) — narrow each to domain-specific phrases")

    return DimensionScore(name="Trigger Design", raw_score=score, weight=0.15, issues=issues)


def score_structural_completeness(body: str, frontmatter: dict[str, str]) -> DimensionScore:
    """Dimension 4: All required sections present."""
    required_sections = [
        (r"^#\s+", "H1 title"),
        (r"##\s+When to Use", "When to Use"),
        (r"##\s+When NOT to Use", "When NOT to Use"),
        (r"##\s+Core Workflow", "Core Workflow"),
        (r"##\s+Constraints", "Constraints"),
    ]

    found = []
    for pattern, label in required_sections:
        if re.search(pattern, body, re.MULTILINE):
            found.append(label)

    score = (len(found) / len(required_sections)) * 100
    missing = [label for _, label in required_sections if label not in found]

    issues = []
    if "H1 title" in missing or "Core Workflow" in missing:
        score = min(score, 40)  # Cap at 40 if critical sections missing
        issues.append("Critical section missing — caps dimension score at 40")
    issues.extend([f"Missing section: {s}" for s in missing])

    return DimensionScore(name="Structural Completeness", raw_score=score, weight=0.15, issues=issues)


def score_constraint_specificity(body: str) -> DimensionScore:
    """Dimension 5: Each constraint must be testable by inspection."""
    do_dont_sections = re.findall(
        r"### (MUST DO|MUST NOT DO)\s*\n((?:[^#]|\n(?!###))+)", body
    )

    if not do_dont_sections:
        return DimensionScore(name="Constraint Specificity", raw_score=0.0, weight=0.10,
                              issues=["No MUST DO or MUST NOT DO sections found"])

    total_rules = 0
    testable_rules = 0
    non_testable_examples = []

    abstract_patterns = [
        r"best practices",
        r"follow .* conventions",
        r"ensure quality",
        r"make it (maintainable|scalable|clean)",
        r"write (good|proper|correct) code",
        r"handle errors appropriately",
    ]

    for section_label, section_body in do_dont_sections:
        rules = [r.strip() for r in re.split(r"\n\s*[-•]\s*", section_body.strip()) if r.strip()]
        for rule in rules:
            total_rules += 1
            is_testable = not any(re.search(p, rule, re.IGNORECASE) for p in abstract_patterns)
            if is_testable:
                testable_rules += 1
            else:
                non_testable_examples.append(f"  - '{rule[:80]}...' — too abstract")

    pct = (testable_rules / total_rules * 100) if total_rules > 0 else 0
    issues = [f"{testable_rules}/{total_rules} constraints are testable by inspection"] + (non_testable_examples or [])

    return DimensionScore(name="Constraint Specificity", raw_score=pct, weight=0.10, issues=issues)


def score_domain_compliance(body: str, domain: str) -> DimensionScore:
    """Dimension 6: Domain-specific requirements."""
    if domain not in DOMAIN_REQUIREMENTS:
        return DimensionScore(name="Domain Compliance", raw_score=100.0, weight=0.10,
                              issues=[f"Unknown domain '{domain}' — passing through"])

    rules = DOMAIN_REQUIREMENTS[domain]
    checks = {
        "ascii_flow_diagram": bool(re.search(r"\|.*\|.*\|", body) and re.search(r"├|└|▼|→", body)),
        "yaml_manifest_example": bool(re.search(r"```yaml\n.*kind:", body, re.DOTALL)),
        "purpose_section": bool(re.search(r"##\s+Purpose\s+", body, re.IGNORECASE)),
        "architecture_section": bool(re.search(r"##\s+(Architecture|Design)\s", body, re.IGNORECASE)),
        "fallback_routing": bool(re.search(r"fallback|FallbackSkill|else.*route", body, re.IGNORECASE)),
        "code_philosophy_reference": "code-philosophy" in body.lower() or "5 laws of elegant defense" in body.lower(),
        "bad_good_comparison": bool(re.search(r"[✖❌].*BAD|###?\s+.*\bBAD\b", body, re.IGNORECASE)),
        "standard_reference": any(std in body.lower() for std in ["owasp", "solid", "dry", "kiss"]),
        "constraints_section": bool(re.search(r"###\s+MUST\s+DO", body)),
        "error_wrapping_percent_w": bool(re.search(r"%w", body)),
        "goroutine_lifecycle": bool(re.search(r"context.*cancel|waitgroup|goroutine", body, re.IGNORECASE)),
        "context_propagation": bool(re.search(r"NewRequestWithContext|ctx\s*\.", body)),
        "set_euo_pipefail": "set -euo pipefail" in body,
        "security_considerations": bool(re.search(r"(permission|chmod|least.privilege|SELinux)", body)),
        "idempotent_operations": bool(re.search(r"idempotent|backup.*before|restore", body)),
        "python_typed_signatures": bool(re.search(r"def\s+\w+\([^)]*:\s*(int|float|str|bool)\s*->\s*\w+", body)),
        "risk_constraints": bool(re.search(r"(emergency.stop|max.loss|risk.limit)", body, re.IGNORECASE)),
        "apex_path_conventions": any(path in body for path in ["risk_engine/", "execution/", "data_pipeline/"]),
    }

    passed = sum(1 for rule in rules if checks.get(rule, False))
    failed_rules = [r for r in rules if not checks.get(r, False)]

    score = (passed / len(rules)) * 100 if rules else 100
    issues = [] if failed_rules else []
    if failed_rules:
        issues.append(f"Missing domain requirements: {', '.join(failed_rules)}")

    return DimensionScore(name="Domain Compliance", raw_score=score, weight=0.10, issues=issues)


def score_stub_resistance(body: str, code_blocks: list[str], frontmatter_str: str) -> DimensionScore:
    """Dimension 7: Zero-tolerance stub policy checks."""
    body_lower = body.lower()

    # Check 1: Stub sentinels
    has_sentinels = any(s in body_lower for s in STUB_SENTINELS)

    # Check 2: File size
    file_size = len(body.encode("utf-8"))
    passes_size = file_size >= 3000

    # Check 3: Generic workflow patterns
    found_generic = [p for p in GENERIC_WORKFLOW_PATTERNS if re.search(p, body)]

    # Check 4: Code block quality (no placeholders)
    has_pass_bodies = any("pass" in block.strip() and len(block.strip()) <= 20 for block in code_blocks)

    # Check 5: Trigger quality
    triggers_match = re.search(r"triggers:\s*(.+)", frontmatter_str)
    triggers_pass = True
    if triggers_match:
        triggers = [t.strip().lower() for t in triggers_match.group(1).split(",") if t.strip()]
        triggers_pass = all(len(t) > 5 or t not in GENERIC_TRIGGER_WORDS for t in triggers)

    checks_passed = sum([not has_sentinels, passes_size, len(found_generic) < 2, not has_pass_bodies, triggers_pass])
    score = (checks_passed / 5) * 100

    issues = []
    if has_sentinels:
        issues.append("Stub sentinel phrase found — MUST remove immediately")
    if not passes_size:
        issues.append(f"File size {file_size} bytes < 3000 minimum")
    if len(found_generic) >= 2:
        issues.append(f"Generic workflow pattern detected ({len(found_generic)} matches)")
    if has_pass_bodies:
        issues.append("Code block contains bare 'pass' — must be replaced with real implementation")
    if not triggers_pass:
        issues.append("Trigger set contains generic terms or too few specific phrases")

    return DimensionScore(name="Stub Resistance", raw_score=score, weight=0.15, issues=issues)


def assign_grade(score: float) -> str:
    """Assign letter grade based on weighted score."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"


def generate_recommendations(report: QualityReport) -> list[str]:
    """Generate prioritized improvement recommendations from dimension scores."""
    recs = []
    for dim in sorted(report.dimensions, key=lambda d: d.weighted_score):
        if dim.raw_score < 70:
            severity = "CRITICAL" if dim.raw_score < 50 else "WARNING"
            recs.append(
                f"[{severity}] {dim.name}: scored {dim.raw_score:.0f}/100 "
                f"(weight {dim.weight}) — {dim.issues[0] if dim.issues else 'Needs improvement'}"
            )
    return recs


def calculate_quality_metrics(file_path: str) -> QualityReport:
    """Run the full seven-dimension quality metrics analysis on a SKILL.md file."""
    report = QualityReport(file_path=file_path)

    try:
        fm_str, body = load_skill(file_path)
    except ValueError as e:
        report.dimensions.append(DimensionScore(name="Load Error", raw_score=0, weight=1.0, issues=[str(e)]))
        return report

    meta = parse_frontmatter(fm_str)
    domain = meta.get("domain", "")
    triggers = meta.get("triggers", "")
    role = meta.get("role", "")

    # Extract code blocks (content between triple backticks)
    code_blocks = re.findall(r"```(?:\w*)\n(.*?)```", body, re.DOTALL)

    # Run all dimensions
    report.dimensions.append(score_content_depth(body, code_blocks))
    report.dimensions.append(score_code_quality(code_blocks))
    report.dimensions.append(score_trigger_design(triggers))
    report.dimensions.append(score_structural_completeness(body, meta))
    report.dimensions.append(score_constraint_specificity(body))
    report.dimensions.append(score_domain_compliance(body, domain))
    report.dimensions.append(score_stub_resistance(body, code_blocks, fm_str))

    # Compute weighted score
    total = sum(d.raw_score * d.weight for d in report.dimensions)
    report.final_score = round(total, 1)
    report.grade = assign_grade(report.final_score)
    report.recommendations = generate_recommendations(report)

    return report


def print_report(report: QualityReport):
    """Pretty-print a quality metrics report."""
    print(f"\n{'='*70}")
    print(f"  SKILL QUALITY METRICS REPORT")
    print(f"  File: {report.file_path}")
    print(f"  Final Score: {report.final_score}/100  |  Grade: {report.grade}")
    print(f"  {'='*70}")

    for dim in report.dimensions:
        status = "OK" if dim.raw_score >= 70 else ("WARN" if dim.raw_score >= 50 else "FAIL")
        print(f"\n  [{status}] {dim.name}: {dim.raw_score:.0f}/100 (weight: {dim.weight})")
        for issue in dim.issues[:3]:
            print(f"      - {issue}")

    print(f"\n{'-'*70}")
    if report.recommendations:
        print("  PRIORITY RECOMMENDATIONS:")
        for i, rec in enumerate(report.recommendations, 1):
            print(f"    {i}. {rec}")
    else:
        print("  OK — No recommendations — skill meets quality threshold.")

    print(f"\n  {'PASS' if report.passes else 'FAIL'} (threshold: 70/100)")
    if report.fails_critical:
        print("  WARNING: Score below 50 — full rewrite recommended")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 skill_quality_metrics.py <path/to/SKILL.md>")
        sys.exit(1)

    for path in sys.argv[1:]:
        report = calculate_quality_metrics(path)
        print_report(report)
        sys.exit(0 if report.passes and not report.fails_critical else 1)
```

## Bash Integration Wrapper

Embed this wrapper into your pre-commit hooks or CI pipeline to enforce quality gates automatically.

```bash
#!/usr/bin/env bash
# Pre-commit skill quality gate — fails the commit if any SKILL.md scores below threshold
set -euo pipefail

SKILL_FILE="${1:?Usage: quality-gate <path/to/SKILL.md>}"
THRESHOLD=${2:-70}

echo "=== Skill Quality Gate ==="
echo "File: $SKILL_FILE"
echo "Threshold: $THRESHOLD/100"
echo ""

if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found — cannot run quality gate"
    exit 1
fi

python3 "$(dirname "$0")/skill_quality_metrics.py" "$SKILL_FILE" || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo ""
        echo "ERROR: Quality gate FAILED — score is below threshold of $THRESHOLD/100"
        echo "   Fix the issues listed above and try again."
        exit 1
    fi
}

echo ""
echo "OK: Quality gate PASSED — skill meets minimum quality threshold"
```

## Scoring Rubric Reference Table

Use this table to calibrate your expectations when writing or auditing skills.

| Score Range | Grade | Interpretation | Action Required |
|-------------|-------|----------------|-----------------|
| 90-100      | A     | Production-ready — all dimensions strong, ready for deployment | None |
| 80-89       | B     | Good — minor gaps in one or two dimensions, easily fixable | Address warnings before merge |
| 70-79       | C     | Acceptable with conditions — passes threshold but needs work on flagged items | Fix all critical issues listed in recommendations |
| 60-69       | D     | Below standard — multiple dimension failures, significant gaps | Substantial rewrite needed; do not merge without senior review |
| 50-59       | E     | Poor — structural or content deficiencies make the skill unreliable | Fix before any further work; consider redesign |
| 0-49        | F     | Critical failure — stub-level quality, multiple zero-tolerance violations | Full rewrite from scratch; do not attempt incremental fixes |

## Constraints

### MUST DO
- Run `python3 scripts/skill_quality_metrics.py` on every SKILL.md before committing to track score over time
- Ensure Content Depth scores at least 60 — skills with under 3000 words cannot provide sufficient context for AI models
- Score Trigger Design above 50 — skills with poorly calibrated triggers waste tokens matching irrelevant conversations
- Include at least one BAD vs GOOD code example pair for every implementation-role skill to demonstrate concrete patterns
- Write constraints as testable rules that can be verified by scanning the generated output without additional interpretation
- Reference domain standards (OWASP, SOLID, DRY, KISS for coding; 5 Laws of Elegant Defense for agent skills) in documentation

### MUST NOT DO
- Accept a final score below 70 as "good enough" — this is the minimum threshold for production use in any automated pipeline
- Manipulate scores by padding prose with filler content that inflates word count without adding actionable information
- Use single generic triggers (`code`, `data`, `risk`) in trigger sets — they create noise across the entire router index
- Skip domain compliance checks even if the score would be high otherwise — a well-scored skill in the wrong format is worse than no skill at all
- Report scores without providing actionable recommendations — every report must include specific, prioritized improvement steps

---

## Output Template

When applying this skill to audit a SKILL.md file, produce:

1. **File Metadata** — Domain, role, version, trigger count, code block count, word count, total byte size
2. **Dimension Scores Table** — Seven rows with dimension name, raw score (0-100), weight, weighted contribution, and pass/fail status
3. **Final Score & Grade** — Weighted total across all dimensions with letter grade (A-F)
4. **Critical Issues** — Any dimension scoring below 50, listed in priority order with the most impactful fix first
5. **Improvement Recommendations** — Prioritized list of specific actions to raise the score above 70, each tied to a dimension and including expected score improvement estimate

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-skill-testing-validation` | Complements metrics by running integration and trigger-matching tests; metrics scores structure quality while testing validates runtime behavior |
| `coding-skill-lifecycle-management` | Use metrics as input to lifecycle decisions — skills scoring below 60 may be candidates for deprecation or major version bumps |
| `agent-skill-optimizer` | Takes the output of this metrics tool and automatically rewrites flagged sections to improve specific dimension scores |
