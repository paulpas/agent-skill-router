---
name: skill-documentation-best-practices
description: Writes high-fidelity SKILL.md documentation using instruction engineering patterns, typed code examples with BAD vs GOOD comparisons, and enforceable constraint design for AI agent skill systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill documentation, SKILL.md writing, instruction engineering, constraint writing, code example patterns, skill content design, prompt design for skills
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: skill-engineering, skill-trigger-engineering, writing-skills
------

# Skill Documentation Best Practices

Writes high-fidelity SKILL.md documentation using instruction engineering patterns, typed code examples with BAD vs GOOD comparisons, and enforceable constraint design. When loaded, this skill makes the model act as a documentation architect — crafting every section of a SKILL.md to steer AI agent behavior precisely, prevent generic prose, and ensure each code example demonstrates a real, runnable pattern.

## TL;DR Checklist

- [ ] Frontmatter `name` matches directory kebab-case exactly; description starts with active verb and includes 1–2 domain terms
- [ ] H1 title is human-readable English (not the kebab-case identifier)
- [ ] Purpose paragraph states what the model DOES when this skill fires, not what the topic IS about
- [ ] TL;DR Checklist has 5–7 concrete checkbox items the model can verify before delivering output
- [ ] Core Workflow has 4–6 numbered steps with domain-specific action names and **Checkpoint:** notes
- [ ] Implementation Patterns include ≥2 real code blocks with typed signatures, docstrings, and guard clauses
- [ ] BAD vs GOOD comparison pairs present for at least one pattern category
- [ ] MUST DO / MUST NOT DO constraints are specific and testable — no "follow best practices" language
- [ ] Output Template describes the exact structure of model responses when this skill is active

---

## When to Use

Use this skill when:

- Writing a new SKILL.md from scratch and needing concrete patterns for instruction engineering, code examples, and constraint design
- Reviewing an existing SKILL.md that reads as generic prose — refactoring workflow steps into domain-specific actions with checkpoints
- Improving trigger sets that fail the calibration heuristic (too broad, too narrow, or missing conversational variants)
- Ensuring code examples in implementation skills have typed signatures, docstrings, and guard clauses rather than placeholder pseudocode
- Designing MUST DO / MUST NOT DO sections that actually constrain model behavior instead of stating abstract principles
- Training other team members on the zero-tolerance quality standards through educational guidance with concrete examples

---

## When NOT to Use

Avoid this skill for:

- Implementing domain logic at runtime — this skill designs documentation, not production code execution; use `coding-*` or domain-specific skills instead
- Writing general-purpose README files, API documentation, or user-facing guides — use `writing-skills` or similar technical writing skills
- Debugging runtime agent behavior unrelated to SKILL.md content quality — use diagnostic skills for behavioral issues
- Creating skills for topics with no actionable workflow or concrete implementation patterns (e.g., purely theoretical concepts without code examples)

---

## Core Workflow

1. **Audit the Target Skill Structure** — Read the existing SKILL.md (or brief description if creating from scratch). Extract all YAML frontmatter fields and map them against the required format spec: name, description, triggers, archetypes, role, scope, output-format. Identify missing or weak sections.
   **Checkpoint:** Confirm every required frontmatter field is present and correctly typed. Flag any enum values that don't match allowed sets (`implementation`, `reference`, `orchestration`, `review`).

2. **Engineer the Frontmatter** — Rewrite the description to start with an active verb and include domain-specific terms (not topic labels). Build the trigger set using the Two-Tier Strategy: technical precision + conversational discovery. Set archetypes and response_profile to values matching the skill's actual behavior.
   **Checkpoint:** Description is under 200 characters, starts with a verb like `Implements`, `Selects`, or `Designs`. Triggers between 5–8 terms. Archetypes include at least one of `[tactical, educational, diagnostic]`.

3. **Craft H1 Title and Purpose Paragraph** — Write a human-readable title (never the kebab-case name). The purpose paragraph must describe what loading this skill makes the model *do*, written from the model's perspective. One to three sentences.
   **Checkpoint:** Title reads like English, not `skill-documentation-best-practices`. Purpose paragraph contains an action verb and describes specific model behavior (e.g., "writes constraint patterns," "validates code examples").

4. **Build Core Workflow with Domain-Specific Checkpoints** — Write 4–6 numbered steps. Each step names a concrete action (e.g., "Calculate trigger overlap score" not "Apply pattern") and ends with a **Checkpoint:** line specifying the exact verification condition.
   **Checkpoint:** No step begins with "Identify," "Apply," "Analyze," or "Validate" as a standalone action. Every checkpoint is a concrete test, not a vague quality statement.

5. **Write Implementation Patterns with Real Code** — Add 2+ pattern subsections. Each must include a descriptive name, a brief explanation of when to use it, and a real code block with: typed function signatures (including type hints on all parameters and return values), docstrings with Args/Returns sections, guard clauses at the top, and actual working logic — no `pass` bodies, no `return {}`, no `# TODO` comments.
   **Checkpoint:** All function signatures include Python type hints. Every function has a docstring. At least one BAD vs GOOD comparison pair exists in this section.

6. **Design Constraints (MUST DO / MUST NOT DO)** — Write 6–8 specific rules per subsection. Each constraint must be verifiable by inspection of the output file. Reference `code-philosophy` laws where relevant for data flow, error handling, and constraint architecture.
   **Checkpoint:** Zero constraints use vague language like "follow best practices," "ensure quality," or "make it maintainable." Every rule could be checked by reading a file without additional context.

7. **Define Output Template** — Describe the exact sections the model's response should contain when this skill is active. Include numbered items with bold section names matching the template structure.
   **Checkpoint:** Each output item has a specific purpose, not just a heading name. The template mirrors what the Core Workflow produces.

---

## Implementation Patterns

### Pattern 1: Constraint Validation Logic

Write constraints that are specific and enforceable. This function demonstrates how constraint design should work: it validates that a skill's constraint content meets quality standards rather than accepting vague statements.

```python
from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class ConstraintRule:
    """A single constraint rule extracted from MUST DO or MUST NOT DO section."""
    text: str
    category: str  # "must_do" or "must_not_do"
    is_actionable: bool = False
    actionable_reason: str = ""
    references_law: bool = False

    def short_label(self) -> str:
        """One-line summary for reporting."""
        prefix = "DO" if self.category == "must_do" else "DON'T"
        return f"[{prefix}] {self.text[:80]}{'...' if len(self.text) > 80 else ''}"


@dataclass
class ConstraintAudit:
    """Results of auditing a skill's constraint section."""
    rules: List[ConstraintRule] = field(default_factory=list)
    must_do_count: int = 0
    must_not_do_count: int = 0
    actionable_count: int = 0
    vague_count: int = 0
    vague_rules: List[str] = field(default_factory=list)

    @property
    def actionability_ratio(self) -> float:
        """Fraction of constraints that are specific and testable."""
        total = self.must_do_count + self.must_not_do_count
        if total == 0:
            return 0.0
        return self.actionable_count / total


# Vague constraint patterns that signal low-quality documentation
_VAGUE_PATTERNS: List[Tuple[str, str]] = [
    (r"\bfollow\s+best\s+practices\b", "Abstract — could mean anything"),
    (r"\bensure\s+(quality|good|proper)\b", "Vague quality claim without specifics"),
    (r"\bmake\s+it\s+(maintainable|clean|readable)\b", "Subjective goal without verification method"),
    (r"\bhandle\s+errors?\s+appropriately\b", "No specific error handling strategy stated"),
    (r"\boptimize\s+for\s+(performance|speed|efficiency)\b", "Performance claim without measurable target"),
    (r"\bfollow\s+(the\s+)?(5\s+laws|guidelines|principles)\b.*without\s+specific\s+reference", "References principles but doesn't state which ones"),
]

# Specific, testable constraint patterns that signal high-quality documentation
_GOOD_PATTERNS: List[Tuple[str, str]] = [
    (r"\bparse\s+(input|parameter|field).*with.*type\b", "Includes explicit type handling"),
    (r"\breturn\s+early.*on\s+(invalid|missing|null)\b", "Early exit / guard clause pattern"),
    (r"\braise\s+(\w+)?Error\b.*with\s+(descriptive|specific|explicit)", "Explicit error raising with context"),
    (r"\bnever\s+(mutate|modify)\s+(input|parameter|original)", "Immutable data flow constraint"),
    (r"\bfail\s+(fast|immediately).*\w+\b", "Fail-fast enforcement pattern"),
]

import re


def audit_constraint_quality(constraint_text: str) -> ConstraintAudit:
    """Audit the quality of a skill's MUST DO / MUST NOT DO sections.

    Parses constraint text, classifies each rule as actionable or vague,
    and flags rules that need rewriting. Implements Atomic Predictability (Law 3)
    by producing pure function output — no side effects, deterministic results.

    Args:
        constraint_text: The full content of the MUST DO / MUST NOT DO sections
            extracted from a SKILL.md file. Each rule should start with a bullet point.

    Returns:
        ConstraintAudit with per-rule classification and aggregate metrics.
    """
    if not constraint_text or not isinstance(constraint_text, str):
        return ConstraintAudit()

    audit = ConstraintAudit()

    # Parse individual rules from markdown bullet list
    lines = [line.strip().lstrip("- *").strip() for line in constraint_text.split("\n") if line.strip()]
    category = "must_do"  # Default assumption; caller should pass both sections separately

    for line in lines:
        rule = ConstraintRule(text=line, category=category)

        # Check for vague patterns
        is_vague = False
        for pattern, reason in _VAGUE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                is_vague = True
                audit.vague_rules.append(f"'{line[:60]}...' — {reason}")
                break

        # Check for good patterns
        is_actionable = False
        for pattern, reason in _GOOD_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                is_actionable = True
                rule.actionable_reason = reason
                break

        # Check for law references
        rule.references_law = "Law" in line or "5 Laws" in line

        rule.is_actionable = is_actionable and not is_vague

        if is_vague:
            audit.vague_count += 1
        else:
            audit.actionable_count += 1

        if category == "must_do":
            audit.must_do_count += 1
        else:
            audit.must_not_do_count += 1

        audit.rules.append(rule)

    return audit


def write_constraint_rule(
    intent: str,
    domain_context: str,
    law_reference: str = "",
) -> str:
    """Generate a specific, testable constraint rule from an abstract intent.

    Converts vague desires ("handle errors well") into concrete, inspectable
    rules that can be verified by reading the skill file. Implements Intentional
    Naming (Law 5) — the output reads like a natural English sentence.

    Args:
        intent: The desired behavior in plain language.
        domain_context: The domain this applies to (e.g., "trading," "Kubernetes").
        law_reference: Optional code-philosophy law reference for documentation.

    Returns:
        A specific, testable constraint sentence suitable for MUST DO / MUST NOT DO.
    """
    if not intent or not domain_context:
        raise ValueError("Both intent and domain_context are required")

    # Intent-to-rule template mapping (demonstrating concrete generation)
    templates = {
        "error_handling": f"Raise specific exception types ({domain_context}) with descriptive error messages including the parameter name and expected format",
        "input_validation": f"Parse all inputs at the boundary with explicit type checking before any domain logic executes",
        "data_flow": f"Never mutate input parameters in {domain_context} context; construct and return new data structures instead",
        "early_exit": f"Return early on missing or invalid parameters before executing any {domain_context}-specific logic",
    }

    # Simple keyword-based selection (in production, use a more sophisticated classifier)
    intent_lower = intent.lower()
    for key, template in templates.items():
        if key in intent_lower:
            rule = template
            if law_reference:
                rule += f" ({law_reference})"
            return rule

    # Fallback: generate a specific version from the generic intent
    return f"When working with {domain_context}: {intent} — verify this condition explicitly before proceeding"
```

**BAD vs GOOD constraint writing comparison:**

```python
# ❌ BAD: Abstract, unverifiable constraints
"""
MUST DO:
- Follow best practices for error handling
- Ensure the code is maintainable
- Handle edge cases appropriately
- Make it readable and clean

MUST NOT DO:
- Write bad code
- Be inefficient
- Ignore user input validation
"""

# This provides zero actionable guidance. A reviewer cannot determine
# whether these constraints are met by reading the file alone.


# ✅ GOOD: Specific, testable constraints (generated via write_constraint_rule)
"""
MUST DO:
- Parse all inputs at the boundary with explicit type checking before any domain logic executes
- Return early on missing or invalid parameters before executing any skill-routing specific logic
- Raise specific exception types with descriptive error messages including the parameter name and expected format
- Never mutate input parameters; construct and return new data structures instead

MUST NOT DO:
- Use bare except clauses — always catch specific exception types like ValueError, TypeError
- Hard-code configuration values (trigger lists, thresholds); make them function arguments or constants
- Return None implicitly from public API functions; either return a well-typed value or raise an explicit error
"""

# Every constraint above is verifiable by file inspection. No additional
# context needed to determine compliance.
```

### Pattern 2: Trigger Quality Scoring Algorithm

Evaluate trigger sets for quality using keyword specificity, conversational coverage, and overlap analysis against related skills.

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Set


@dataclass
class TriggerQualityScore:
    """Composite quality score for a skill's trigger set."""
    overall_score: float  # 0.0 to 1.0
    specificity_score: float  # How domain-specific are the terms?
    conversational_coverage: float  # Fraction of Tier 2 (conversational) triggers present
    overlap_with_related: float  # Overlap ratio with related skills' triggers (lower is better)
    term_count: int
    issues: List[str] = field(default_factory=list)

    @property
    def passes_quality_gate(self) -> bool:
        """Pass if score >= 0.7 and no critical issues."""
        critical_issues = [i for i in self.issues if "critical" in i.lower()]
        return self.overall_score >= 0.7 and len(critical_issues) == 0


# Generic single-word triggers that signal poor trigger design
_GENERIC_TRIGGERS: Set[str] = {
    "code", "data", "risk", "pattern", "system", "management",
    "implementation", "development", "testing", "quality", "design",
    "build", "deploy", "monitor", "optimize", "configure", "setup",
}

# Conversational query templates for Tier 2 trigger evaluation
_CONVERSATIONAL_TEMPLATES: List[str] = [
    "how do i", "what is", "help with", "how to", "why does",
    "when should i", "where do i", "can i", "should i", "best way to",
]


def score_trigger_set(
    triggers: List[str],
    related_skill_triggers: Optional[Dict[str, List[str]]] = None,
) -> TriggerQualityScore:
    """Evaluate the quality of a skill's trigger set.

    Calculates specificity (domain-specific vs generic terms), conversational
    coverage (presence of Tier 2 "how do I" phrases), and overlap with related
    skills. Returns composite score and diagnostic issue list.

    Implements Atomic Predictability (Law 3) — pure function, no side effects.

    Args:
        triggers: The skill's trigger phrases from frontmatter metadata.
        related_skill_triggers: Optional dict mapping related skill names to
            their trigger lists, for overlap analysis.

    Returns:
        TriggerQualityScore with composite metrics and diagnostic issues.
    """
    if not triggers or len(triggers) == 0:
        return TriggerQualityScore(
            overall_score=0.0,
            specificity_score=0.0,
            conversational_coverage=0.0,
            overlap_with_related=1.0,
            term_count=0,
            issues=["critical: empty trigger set — skill will never auto-load"],
        )

    if len(triggers) < 3 or len(triggers) > 8:
        issues = [f"critical: trigger count {len(triggers)} outside valid range 5-8"]
    else:
        issues = []

    # Score component 1: Specificity (avoid generic single words)
    trigger_lower = [t.lower() for t in triggers]
    generic_hits = [t for t in trigger_lower if t in _GENERIC_TRIGGERS and len(t) < 6]
    specificity_score = 1.0 - (len(generic_hits) / max(len(triggers), 1))
    issues.extend(
        [f"warning: generic trigger '{g}' may match irrelevant conversations" for g in generic_hits]
    )

    # Score component 2: Conversational coverage (Tier 2 triggers)
    has_conversational = any(
        any(template.lower() in t.lower() for template in _CONVERSATIONAL_TEMPLATES)
        for t in trigger_lower
    )
    conversational_coverage = 1.0 if has_conversational else 0.3

    # Score component 3: Overlap with related skills
    overlap_count = 0
    total_related_terms = 0
    if related_skill_triggers:
        for skill_name, rel_triggers in related_skill_triggers.items():
            for trigger in triggers:
                if trigger.lower() in [rt.lower() for rt in rel_triggers]:
                    overlap_count += 1
            total_related_terms += len(rel_triggers)

    overlap_ratio = overlap_count / max(total_related_terms, 1)
    # Low overlap is good — we penalize HIGH overlap (trigger conflicts between skills)
    overlap_score = max(0.0, 1.0 - overlap_ratio)

    # Composite score with weighted components
    overall_score = (
        specificity_score * 0.4 +
        conversational_coverage * 0.3 +
        overlap_score * 0.2 +
        (1.0 if 5 <= len(triggers) <= 8 else 0.0) * 0.1
    )

    if generic_hits:
        issues.append(
            f"warning: {len(generic_hits)} generic trigger(s) found — replace with domain-specific phrases"
        )
    if not has_conversational:
        issues.append("critical: no conversational variant triggers (Tier 2) — add 'how do I...' phrase")

    return TriggerQualityScore(
        overall_score=round(overall_score, 4),
        specificity_score=round(specificity_score, 4),
        conversational_coverage=round(conversational_coverage, 4),
        overlap_with_related=round(overlap_ratio, 4),
        term_count=len(triggers),
        issues=issues,
    )


def generate_trigger_suggestions(
    topic: str,
    domain: str,
    current_triggers: Optional[List[str]] = None,
) -> List[str]:
    """Suggest improved trigger terms for a skill based on domain and topic.

    Generates two-tier trigger sets (technical + conversational) following
    the domain-specific guidelines from AGENTS.md. Returns up to 8 suggestions
    that fit within the 5-8 term limit.

    Args:
        topic: The kebab-case topic name of the skill (e.g., "skill-testing").
        domain: The domain category (agent, cncf, coding, trading, etc.).
        current_triggers: Optional list of existing triggers to improve upon.

    Returns:
        List of 5-8 suggested trigger phrases ranked by priority.
    """
    if not topic or not domain:
        raise ValueError("topic and domain are required")

    # Domain-specific suggestion templates (demonstrating structured generation)
    domain_suggestions: Dict[str, List[List[str]]] = {
        "agent": [
            ["task routing", "skill selection", "orchestration", "how do i automate this"],  # Tier 1 + Tier 2
            ["agent dispatch", "parallel execution", "workflow orchestration", "how do i run tasks in parallel"],
            ["fallback chain", "delegation pattern", "agent coordination"],  # Tier 1 only (supplementary)
        ],
        "coding": [
            ["code review", "pull request", "quality check", "how do i review code"],
            ["security audit", "OWASP", "architectural review", "peer review process"],
            ["testing standards", "integration testing", "mocking patterns"],
        ],
    }

    suggestions = domain_suggestions.get(domain, [])

    # Flatten and deduplicate
    all_suggestions: List[str] = []
    seen: Set[str] = set()
    for tier_group in suggestions:
        for term in tier_group:
            if term.lower() not in seen:
                all_suggestions.append(term)
                seen.add(term.lower())

    # If current triggers provided, prefer keeping good ones and adding missing categories
    if current_triggers:
        result = []
        for t in current_triggers:
            if t.lower() in seen or len(all_suggestions) < 5:
                result.append(t)
                all_suggestions.remove(t) if t in all_suggestions else None
        result.extend(all_suggestions[:max(0, 8 - len(result))])
        return result[:8]

    # Return top terms from the suggestion templates
    return all_suggestions[:8]
```

**BAD vs GOOD trigger quality scoring comparison:**

```python
# ❌ BAD: No scoring — just count triggers and check they exist
def check_triggers_simple(triggers: List[str]) -> bool:
    """Check if triggers are present."""
    return len(triggers) >= 3  # Way too permissive, no quality assessment


# ✅ GOOD: Multi-dimensional scoring with specificity, conversational coverage,
# overlap analysis, and actionable issue reporting. Returns a composite score
# that can drive automated pass/fail gates in CI/CD pipelines.
```

---

## Constraints

### MUST DO
- Write every Core Workflow step as a concrete action (e.g., "Calculate trigger overlap score") ending with a **Checkpoint:** line — never use generic verbs like "Identify," "Apply," or "Validate" as standalone step names
- Include typed function signatures with docstrings (Args + Returns) on ALL code examples in Implementation Patterns; no untyped pseudocode allowed
- Provide at least one BAD vs GOOD comparison pair per major pattern category to demonstrate the quality bar for that section type
- Write MUST DO / MUST NOT DO constraints that are verifiable by file inspection — if a reviewer needs additional context to determine compliance, the constraint is too vague
- Set `archetypes` and `response_profile` in frontmatter to values matching the skill's actual behavior (tactical/educational for documentation skills, low verbosity/high directive_strength)
- Design trigger sets using the Two-Tier Strategy: include both technical terms and at least one "how do I..." or "help with" conversational variant
- Include a TL;DR Checklist with 5–7 concrete checkbox items that map to specific quality gates, not generic topic headings
- Keep descriptions under 200 characters starting with an active verb (`Implements`, `Selects`, `Designs`) followed by domain-specific terms

### MUST NOT DO
- Use the exact stub sentinel phrase (the one starting with "Implementing..." and referencing a "specific pattern or feature") anywhere in the file — it triggers immediate rejection
- Write workflow steps that read like "identify → apply → validate" generic patterns — each step must describe a domain-specific action
- Include placeholder code (`pass` bodies, `return {}`, `# TODO: add implementation`) in any code block
- Set metadata.triggers to single ultra-generic words (`code`, `data`, `risk`, `pattern`) without domain-specific phrases
- Write an H1 title equal to the kebab-case directory name (e.g., `# skill-documentation-best-practices`) — always use human-readable English
- List more than 4 related skills (dilutes focus) or skip "When NOT to Use" for any skill with non-obvious boundaries

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Frontmatter Audit** — Complete YAML frontmatter block with pass/fail per required field (name match, description verb check, trigger count 5–8, archetype assignment, response_profile values)
2. **Trigger Quality Report** — Composite score breakdown: specificity score, conversational coverage ratio, overlap analysis with related skills, and actionable improvement suggestions ranked by priority
3. **Workflow Step Refactor** — Original step vs rewritten step for each Core Workflow entry, with justification showing how the new version is domain-specific and includes a checkpoint
4. **Code Example Review** — Per-block assessment: type hints present ✓/✗, docstring present ✓/✗, guard clauses present ✓/✗, real logic ✓/✗ (not placeholder), with rewritten versions for any failures
5. **Constraint Rewrite** — Original MUST DO/MUST NOT DO vs improved version showing vague rules replaced with specific, testable constraints
6. **Complete SKILL.md Draft** — Full assembled file ready for commit, incorporating all improvements from previous sections

---

## Related Skills

| Skill | Purpose |
|---|---|
| `skill-engineering` | Broader skill creation and refinement that encompasses documentation as one component; this skill focuses specifically on documentation quality patterns |
| `skill-trigger-engineering` | Deep-dive into trigger set design and calibration — complementary to the trigger scoring in this skill's patterns |
| `writing-skills` | General technical writing guidance for non-skill documentation; use when documenting APIs, READMEs, or user guides |

---

## Appendix: Section-by-Section Quality Reference

Use this reference when deciding what belongs in each section of a SKILL.md:

### Required Sections (every skill)
| Section | Purpose | Minimum Content |
|---------|---------|-----------------|
| H1 Title | Human-readable skill name | Not the kebab-case identifier |
| Role paragraph | What the model DOES when loaded | 1–3 sentences, active verb |
| TL;DR Checklist | Quick verification before output delivery | 5–7 concrete checkbox items |
| When to Use | Specific situations triggering this skill | 4–6 concrete bullets |
| When NOT to Use | Exclusion criteria | 3–5 exclusion cases |
| Core Workflow | Domain-specific execution steps | 4–6 numbered steps with Checkpoints |

### Conditional Sections (only if applicable)
| Section | Required When | Content |
|---------|---------------|---------|
| Implementation Patterns | `role = implementation` or `role = review` | 2+ patterns with real code blocks |
| Constraints | All skills | MUST DO and MUST NOT DO subsections |
| Output Template | Skills producing structured output | Numbered template sections |
| Related Skills Table | `related-skills` metadata is non-empty | Table with skill name + purpose |
| Architecture Diagram | Complex multi-step workflows | ASCII flow diagram showing data/control flow |
