---




name: skill-trigger-design
description: Implements comprehensive trigger engineering for AI skills with two-tier keyword design, domain-specific patterns, and automated validation scripts to maximize conversational discoverability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: trigger engineering, skill discovery, keyword matching, auto-loading triggers, two-tier strategy, trigger calibration, how do i design triggers, conversational keywords
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, vague ideation]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: coding-skill-development-workflow, agent-skill-engineering, coding-skill-testing-validation




---





# Trigger Engineering Framework for AI Skills

Acts as a trigger engineer designing keyword sets for SKILL.md auto-loading. Analyzes conversation language patterns across eight domain categories to produce calibrated trigger lists that maximize conversational discoverability — matching both expert technical queries and natural user questions. Builds validation tooling to verify trigger quality before commit.

## TL;DR Checklist

- [ ] Collect primary topic name, abbreviations, and hyphenated variants
- [ ] Separate triggers into Tier 1 (technical terms) and Tier 2 (conversational variants)
- [ ] Apply domain-specific guidelines for the target domain category
- [ ] Prioritize using MUST/SHOULD/COULD framework within 5–8 term limit
- [ ] Validate each trigger passes the "would someone actually type this?" test
- [ ] Check precision: does each trigger narrow enough to avoid false positives?
- [ ] Check diversity: include at least one technical, one conversational, and one task-oriented term
- [ ] Run validate_skill.sh with --llm flag to verify quality before committing

---

## When to Use

Use this skill when:

- Designing `metadata.triggers` for a new SKILL.md that needs auto-loading
- Calibrating triggers on an existing skill that fires too broadly or too narrowly
- Creating domain-specific trigger sets for CNCF, trading, coding, agent, programming, Go, Linux, or writing skills
- Building automated validation scripts for trigger quality checking
- Auditing a skill catalog for trigger consistency and coverage gaps
- Explaining trigger engineering methodology to other skill authors

---

## When NOT to Use

Avoid this skill for:

- Writing the SKILL.md body content itself (use coding-skill-development-workflow instead)
- Testing or validating skills programmatically (use coding-skill-testing-validation instead)
- Designing agent orchestration flows beyond trigger logic (use agent-skill-engineering instead)
- Vague brainstorming sessions where the target skill domain is undefined
- Tasks about routing scores, embedding models, or LLM ranking mechanics

---

## Core Workflow

1. **Identify Target Domain** — Determine which of the 8 domains applies: `agent`, `cncf`, `coding`, `go`, `linux`, `programming`, `trading`, or `writing`. Each domain has unique audience vocabulary and search patterns.
   **Checkpoint:** Confirm domain matches the SKILL.md directory structure (`skills/<domain>/<topic>/`). If uncertain, check whether the skill's primary code examples use the domain's characteristic language or tools.

2. **Extract Technical Tier (Tier 1)** — List 3–4 precise technical terms:
   - Primary product/concept name (e.g., `kubernetes`, `PostgreSQL`, `ATR`)
   - Common abbreviations (e.g., `k8s`, `postgres`, `VWAP`)
   - Hyphenated and non-hyphenated variants when both are common
   - Domain-specific acronyms used by practitioners
   **Checkpoint:** Every Tier 1 term must appear in official documentation, source code comments, or practitioner conversations. No internal class names or file-local terminology.

3. **Extract Conversational Tier (Tier 2)** — List 2–4 natural-language phrases non-technical users would type:
   - "how do I..." variants for task-solving skills
   - "what is..." variants for concept-explaining skills
   - "help with..." for operational concerns
   - Business value phrases where relevant (e.g., `cost savings`, `security`)
   **Checkpoint:** Read each conversational trigger aloud — does it sound like a message you'd see in Slack or a Stack Overflow question title?

4. **Apply Domain-Specific Guidelines** — Enrich triggers using the domain patterns below. Add 1–2 bridge terms (adjacent tech, operational tasks) specific to the domain category.
   **Checkpoint:** Triggers must span at least two tiers (one technical, one conversational) and include at least one task-oriented or operational term.

5. **Prioritize to 5–8 Terms** — Apply the MUST/SHOULD/COULD framework:
   - **MUST INCLUDE** (non-negotiable): Primary name + most common abbreviation
   - **SHOULD INCLUDE**: 1–2 conversational variants, 1 "how do I..." if task-oriented, 1 operational task
   - **COULD INCLUDE** (if space after 7 terms): Alternative spelling, business value phrase, one adjacent technology
   **Checkpoint:** Final list is between 5 and 8 terms. No near-duplicates (e.g., don't include both `kubernetes` and `k8s` if you also have "how do I run containers").

6. **Validate Precision and Coverage** — Run the calibration heuristic:
   - Question 1: If someone says this word/phrase, would they plausibly need this skill? → Keep if yes
   - Question 2: Is this word used heavily in other unrelated contexts? → Remove or be more specific if yes
   - Question 3: Is this a natural abbreviation or shorthand for the topic? → Keep if yes
   - Question 4: Is this only used internally (class name, file name)? → Remove if yes
   **Checkpoint:** At least 2 triggers would NOT match unrelated conversations. No trigger is so broad it fires on generic "code", "data", or "risk" discussions.

7. **Test Against Adjacent Skills** — Compare your trigger set against related skills to avoid overlap:
   - `coding-skill-development-workflow` — should not use identical triggers for the skill creation process itself
   - `agent-skill-engineering` — should not duplicate routing/selection terms unless your skill specifically handles those
   - `coding-skill-testing-validation` — should not share test-related trigger terms
   **Checkpoint:** Read all three related skills' trigger sets. If 3+ terms overlap with a single related skill, differentiate by adding more domain-specific terms.

8. **Generate Validation Script** — Produce or update the YAML frontmatter block and run `validate_skill.sh` to confirm stub-free status and structural compliance.
   **Checkpoint:** The script exits with code 0 (PASS). For LLM-powered validation, run with `--llm` flag.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Two-Tier Trigger Calculator

A Python utility that analyzes a domain's vocabulary and produces balanced trigger sets by separating technical terms from conversational variants.

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Final


class DomainCategory(str, Enum):
    """The 8 skill domains with their default characteristics."""
    AGENT = "agent"
    CNCF = "cncf"
    CODING = "coding"
    GO = "go"
    LINUX = "linux"
    PROGRAMMING = "programming"
    TRADING = "trading"
    WRITING = "writing"


@dataclass(frozen=True)
class TriggerTier:
    """A single tier of triggers (technical or conversational)."""
    tier_label: str
    terms: list[str]

    def __str__(self) -> str:
        return f"{self.tier_label}: {', '.join(self.terms)}"


@dataclass
class TriggerSet:
    """Complete trigger set for a skill, organized by tier and priority."""
    domain: DomainCategory
    topic: str
    technical_tier: list[str] = field(default_factory=list)
    conversational_tier: list[str] = field(default_factory=list)
    bridge_terms: list[str] = field(default_factory=list)
    _priority: str = "MUST"

    def all_triggers(self) -> list[str]:
        """Return deduplicated, prioritized trigger list."""
        seen: set[str] = set()
        result: list[str] = []
        for tier in [self.technical_tier, self.conversational_tier, self.bridge_terms]:
            for term in tier:
                normalized = term.lower().strip()
                if normalized not in seen and len(result) < 8:
                    seen.add(normalized)
                    result.append(term)
        return result

    @property
    def count(self) -> int:
        """Current trigger count."""
        return len(self.all_triggers())

    def validate(self) -> list[str]:
        """Validate trigger set quality. Returns list of issues found."""
        issues: list[str] = []
        triggers = self.all_triggers()

        if not triggers:
            issues.append("ERROR: No triggers defined")
        elif len(triggers) < 3:
            issues.append(f"WARNING: Only {len(triggers)} triggers (minimum 3)")
        elif len(triggers) > 8:
            issues.append(f"ERROR: {len(triggers)} triggers exceeds maximum of 8")

        if not self.technical_tier:
            issues.append("WARNING: No technical tier terms — skill won't match expert queries")
        if not self.conversational_tier:
            issues.append("WARNING: No conversational tier terms — skill won't match natural language queries")

        # Check for ultra-generic terms
        generic_terms = {"code", "data", "risk", "pattern", "solution", "tool"}
        for t in triggers:
            if t.lower() in generic_terms:
                issues.append(f"WARNING: '{t}' is too generic — may fire on unrelated conversations")

        return issues


def build_domain_template(domain: DomainCategory) -> dict[str, list[str]]:
    """Return domain-specific trigger template patterns for reference."""
    templates = {
        DomainCategory.AGENT: [
            "task routing", "agent selection", "orchestration",
            "how do i automate this", "workflow automation", "agent dispatch",
        ],
        DomainCategory.CNCF: [
            "kubernetes, container orchestration, managing containers, "
            "deploying applications, scaling apps, helm"
        ][0].split(", "),
        DomainCategory.CODING: [
            "code review, pull request, quality checks",
            "how do i review code, testing standards"
        ],
        DomainCategory.GO: [
            "goroutine pool, worker pool, go concurrency",
            "how do i manage goroutines, sync, semaphore"
        ],
        DomainCategory.LINUX: [
            "systemd, service management, how do i create a systemd service",
            "unit files, systemctl, daemon"
        ],
        DomainCategory.PROGRAMMING: [
            "sorting algorithms, quicksort, mergesort",
            "how do i sort data efficiently, algorithm optimization"
        ],
        DomainCategory.TRADING: [
            "stop loss, trailing stop, ATR stop, position protection",
            "how do i limit losses, emergency stop"
        ],
        DomainCategory.WRITING: [
            "technical documentation, how do i write docs",
            "API reference, user guide, documentation structure"
        ],
    }
    return templates


def calibrate_triggers(
    domain: DomainCategory,
    topic_name: str,
    abbreviation: str | None = None,
) -> TriggerSet:
    """Build a calibrated trigger set using two-tier strategy.

    Args:
        domain: The skill's domain category.
        topic_name: Primary topic name in kebab-case.
        abbreviation: Common abbreviation for the topic (optional).

    Returns:
        A validated TriggerSet ready for SKILL.md frontmatter.

    Raises:
        ValueError: If topic_name is empty or contains invalid characters.
    """
    if not topic_name or not topic_name.strip():
        raise ValueError("topic_name must be a non-empty string")
    if not isinstance(domain, DomainCategory):
        raise TypeError(f"domain must be a DomainCategory enum, got {type(domain).__name__}")

    template = build_domain_template(domain)
    set_obj = TriggerSet(
        domain=domain,
        topic=topic_name,
        technical_tier=[topic_name],
        conversational_tier=[],
        bridge_terms=[],
    )

    if abbreviation:
        set_obj.technical_tier.append(abbreviation)

    # Add template-based terms as bridge guidance
    template_terms = template.get(domain, [])
    for term in template_terms[:3]:
        stripped = term.strip()
        if stripped and len(stripped) > 1:
            set_obj.bridge_terms.append(stripped)

    return set_obj


# Example usage
if __name__ == "__main__":
    # Build triggers for a hypothetical Kubernetes skill
    k8s_triggers = calibrate_triggers(
        domain=DomainCategory.CNCF,
        topic_name="kubernetes",
        abbreviation="k8s",
    )

    # Manually enrich with domain-specific terms
    k8s_triggers.technical_tier.extend([
        "container orchestration",
        "pod management",
        "deployment",
    ])
    k8s_triggers.conversational_tier.extend([
        "how do i run containers",
        "managing containers",
        "deploying applications",
    ])
    k8s_triggers.bridge_terms.append("scaling apps")

    print(k8s_triggers)
    print(f"All triggers: {', '.join(k8s_triggers.all_triggers())}")
    print(f"Validation: {k8s_triggers.validate()}")
```

### Pattern 2: Trigger Quality Validator (BAD vs. GOOD Comparison)

Demonstrates how to evaluate trigger sets for common pitfalls — overly broad, too narrow, missing variants.

```python
from typing import NamedTuple


class TriggerQualityReport(NamedTuple):
    """Structured result of trigger quality evaluation."""
    triggers: list[str]
    score: float  # 0.0 to 1.0
    issues: list[str]
    recommendations: list[str]


def evaluate_trigger_quality(
    triggers: list[str],
    domain: str = "general",
) -> TriggerQualityReport:
    """Evaluate a trigger set against quality criteria.

    Scoring breakdown:
        - Tier diversity (0–30 points): Must have both technical and conversational
        - Precision score (0–30 points): No ultra-generic terms, no duplicates
        - Coverage score (0–25 points): Has abbreviations, variants, task-oriented terms
        - Count validation (0–15 points): 5–8 terms is optimal

    Args:
        triggers: List of trigger keywords/phrases to evaluate.
        domain: Target domain for context-specific checks.

    Returns:
        A TriggerQualityReport with score, issues, and recommendations.
    """
    issues: list[str] = []
    recommendations: list[str] = []
    score_components: list[float] = []

    normalized = [t.strip().lower() for t in triggers if t.strip()]
    unique_triggers = list(dict.fromkeys(normalized))  # Deduplicate, preserve order
    has_hyphen_variants = any("-" in t for t in normalized)

    # --- Tier Diversity (max 30 points) ---
    technical_keywords = {"api", "database", "container", "goroutine", "pod",
                          "kubernetes", "trading", "algorithm", "function"}
    conversational_markers = ["how do i", "what is", "help with", "managing",
                              "deploying", "scaling", "monitoring"]

    has_tech = any(any(tk in t for tk in technical_keywords) for t in normalized)
    has_conversational = any(
        any(marker in t for marker in conversational_markers) for t in normalized
    )

    tier_score = 0.0
    if has_tech and has_conversational:
        tier_score = 30.0
    elif has_tech or has_conversational:
        tier_score = 15.0
        missing_tier = "technical" if not has_tech else "conversational"
        issues.append(f"Missing {missing_tier} tier — skill visibility reduced by ~40%")
        recommendations.append(
            f"Add {'technical' if not has_tech else 'conversational'} triggers "
            f"matching the missing tier"
        )
    else:
        issues.append("No recognized technical or conversational terms detected")
        recommendations.append(
            "Ensure triggers include domain-specific product names AND natural-language phrases"
        )
    score_components.append(tier_score)

    # --- Precision Score (max 30 points) ---
    generic_terms = {"code", "data", "risk", "pattern", "solution", "tool",
                     "best practices", "guide", "tutorial"}
    precision_issues = []
    for t in unique_triggers:
        if t in generic_terms:
            precision_issues.append(t)

    precision_score = 30.0
    if precision_issues:
        penalty = min(30.0, len(precision_issues) * 12.0)
        precision_score = max(0.0, precision_score - penalty)
        issues.append(
            f"Too-generic triggers may cause false positives: {', '.join(precision_issues)}"
        )
        recommendations.append(
            "Replace generic terms with domain-specific alternatives "
            "(e.g., 'PostgreSQL' instead of 'database')"
        )

    # Check for near-duplicates (terms that differ only by hyphens/spaces)
    normalized_variants = {t.replace("-", " ").replace("_", " ") for t in unique_triggers}
    if len(normalized_variants) < len(unique_triggers):
        duplicates = len(unique_triggers) - len(normalized_variants)
        precision_score -= min(10.0, duplicates * 5.0)
        issues.append(f"Found {duplicates} near-duplicate terms (hyphen/spacing variants)")

    score_components.append(precision_score)

    # --- Coverage Score (max 25 points) ---
    coverage_score = 0.0
    if abbreviation_found := any(
        t.isupper() or (len(t) < len(t.replace(" ", "")) and len(t) <= 8)
        for t in unique_triggers
    ):
        coverage_score += 8.0
    else:
        recommendations.append(
            "Consider adding common abbreviations (e.g., 'k8s' for kubernetes, 'ATR' for trading)"
        )

    if has_hyphen_variants:
        coverage_score += 5.0
    else:
        # Check if topic name could benefit from hyphen variant
        space_terms = [t for t in unique_triggers if " " in t and "-" not in t]
        if space_terms:
            recommendations.append(
                f"Add hyphenated variants of multi-word terms: "
                f"{', '.join(t.replace(' ', '-') for t in space_terms)}"
            )

    task_oriented = any(
        kw in t.lower()
        for t in unique_triggers
        for kw in ["deploy", "scale", "monitor", "configure", "build", "test", "fix"]
    )
    if task_oriented:
        coverage_score += 7.0

    # Check for conversational patterns
    has_how_do_i = any("how do i" in t for t in unique_triggers)
    if has_how_do_i:
        coverage_score += 5.0
    else:
        recommendations.append(
            "Consider adding at least one 'how do I...' variant for discovery"
        )

    score_components.append(coverage_score)

    # --- Count Validation (max 15 points) ---
    count_score = 0.0
    total = len(unique_triggers)
    if 5 <= total <= 8:
        count_score = 15.0
    elif 3 <= total < 5:
        count_score = 7.0
        recommendations.append(
            f"Expand to 5–8 terms for optimal balance (currently {total})"
        )
    elif total > 8:
        count_score = 5.0
        recommendations.append(
            f"Trim from {total} to 5–8 terms — excess triggers dilute signal quality"
        )
    else:
        issues.append(f"Only {total} triggers defined (minimum recommended: 5)")

    score_components.append(count_score)

    final_score = sum(score_components) / 100.0

    return TriggerQualityReport(
        triggers=triggers,
        score=round(final_score, 3),
        issues=issues,
        recommendations=recommendations,
    )


def compare_trigger_sets(before: list[str], after: list[str]) -> dict:
    """Compare two trigger sets and quantify improvement.

    Args:
        before: Original trigger set.
        after: Revised trigger set.

    Returns:
        Dictionary with scores, delta, and change summary.
    """
    before_report = evaluate_trigger_quality(before)
    after_report = evaluate_trigger_quality(after)
    delta = after_report.score - before_report.score

    new_terms = [t for t in after if t not in before]
    removed_terms = [t for t in before if t not in after]

    return {
        "before_score": before_report.score,
        "after_score": after_report.score,
        "delta": round(delta, 3),
        "new_triggers": new_terms,
        "removed_triggers": removed_terms,
        "improvement_direction": "up" if delta > 0 else ("down" if delta < 0 else "no change"),
    }


# --- Usage Examples: BAD vs. GOOD trigger sets ---

if __name__ == "__main__":
    # ❌ BAD — too broad, only generic terms
    bad_triggers = ["risk", "trading", "code", "data", "pattern"]
    bad_report = evaluate_trigger_quality(bad_triggers)
    print(f"BAD trigger score: {bad_report.score}")
    print(f"  Issues: {bad_report.issues}")

    # ✅ GOOD — balanced two-tier set with domain specificity
    good_triggers = [
        "stop loss",                # Primary technical term
        "trailing stop",           # Domain-specific variant
        "ATR stop",                # Abbreviation/acronym-based
        "stop placement",          # Operational task
        "position protection",     # Business value phrase
        "how do i limit losses",   # Conversational variant
        "emergency stop",          # Edge case / risk context
    ]
    good_report = evaluate_trigger_quality(good_triggers)
    print(f"\nGOOD trigger score: {good_report.score}")
    print(f"  Issues: {good_report.issues or 'None'}")

    # Comparison
    comparison = compare_trigger_sets(bad_triggers, good_triggers)
    print(f"\nImprovement: {comparison['before_score']} → {comparison['after_score']} (delta: {comparison['delta']})")
```

### Pattern 3: Domain-Specific Trigger Templates

Reference implementations showing the trigger engineering patterns for each of the 8 domains. Use these as starting points when designing triggers for domain-specific skills.

```python
# ── CNCF (Cloud Infrastructure) ─────────────────────────────────────
# Strategy: product name + category, operational tasks, deployment patterns, adjacent tech
cncf_templates = {
    "kubernetes": [
        "kubernetes",           # MUST: Primary technical term
        "k8s",                  # MUST: Most common abbreviation
        "container orchestration",  # SHOULD: Category name (matches broader searches)
        "how do i run containers",  # SHOULD: Conversational variant
        "deploying applications",     # SHOULD: Operational task
        "scaling apps",           # COULD: Adjacent operational concern
        "managing pods",          # COULD: Task-specific phrasing
    ],
    "prometheus": [
        "prometheus",
        "promql",                   # Abbreviation — power users search this
        "time-series database",     # Category term
        "metrics monitoring",       # Operational task
        "how do i monitor systems", # Conversational variant
        "alerting",                 # Adjacent operational concern
        "grafana",                  # Adjacent tech bridge
    ],
}

# ── Trading (Algorithmic & Quantitative) ────────────────────────────
# Strategy: technical terms + financial concepts, market context, execution concepts, risk language
trading_templates = {
    "stop-loss": [
        "stop loss",                # MUST: Primary term
        "trailing stop",            # MUST: Common variant
        "ATR stop",                 # SHOULD: Domain-specific tool
        "position protection",      # SHOULD: Business concept
        "how do i limit losses",    # SHOULD: Conversational question
        "emergency stop",           # COULD: Risk context
        "stop-loss",                # Hyphenated variant
    ],
    "vwap-execution": [
        "vwap",                     # MUST: Acronym — standard financial term
        "volume-weighted average price",  # MUST: Full name
        "execution algorithm",      # SHOULD: Category
        "how do i execute large orders",  # SHOULD: Task question
        "minimal market impact",    # COULD: Execution goal
        "order execution",          # COULD: Operational term
    ],
}

# ── Coding (Implementation & Patterns) ──────────────────────────────
# Strategy: design patterns + implementation approach, learning variants, use cases, quality concerns
coding_templates = {
    "code-review": [
        "code review",              # MUST: Primary term
        "pull request",             # MUST: Adjacent concept — nearly synonymous
        "PR review",                # SHOULD: Common abbreviation
        "how do i review code",     # SHOULD: Conversational variant
        "security audit",           # COULD: Quality concern bridge
        "code quality",             # COULD: Non-functional concern
    ],
}

# ── Agent (Orchestration & Routing) ─────────────────────────────────
# Strategy: routing/selection concepts, decision-making language, multi-step workflows
agent_templates = {
    "task-routing": [
        "task routing",             # MUST: Primary concept
        "agent selection",          # MUST: Core action
        "orchestration",            # SHOULD: Category term
        "how do i automate this",   # SHOULD: Conversational task question
        "workflow automation",      # COULD: Business value phrase
        "agent dispatch",           # COULD: Technical variant
    ],
}

# ── Go (Language-Specific) ──────────────────────────────────────────
# Strategy: Go-specific terms, concurrency concepts, idiomatic patterns, operational language
go_templates = {
    "goroutine-pool": [
        "goroutine pool",           # MUST: Primary concept
        "worker pool",              # MUST: Common synonym
        "go concurrency",           # SHOULD: Broader category
        "how do i manage goroutines",  # SHOULD: Task question
        "sync",                     # COULD: Standard library reference
        "semaphore",                # COULD: Implementation detail
    ],
}

# ── Linux (OS-Specific) ─────────────────────────────────────────────
# Strategy: OS-specific terms, operational tasks, troubleshooting, administration concepts
linux_templates = {
    "systemd-services": [
        "systemd",                  # MUST: Primary term
        "service management",       # MUST: Core operation
        "how do i create a systemd service",  # SHOULD: Task question
        "unit files",               # COULD: Technical artifact
        "systemctl",                # COULD: Command-line tool name
        "daemon",                   # COULD: Concept term
    ],
}

# ── Programming (CS Fundamentals) ───────────────────────────────────
# Strategy: algorithm names + problem categories, learning variants, complexity concerns
programming_templates = {
    "sorting-algorithms": [
        "sorting algorithms",       # MUST: Primary category
        "quicksort",                # MUST: Most well-known example
        "mergesort",                # MUST: Second most common
        "how do i sort data efficiently",   # SHOULD: Task question
        "algorithm optimization",   # COULD: Quality concern
        "time complexity",          # COULD: CS fundamental concept
    ],
}

# ── Writing (Technical Documentation) ───────────────────────────────
# Strategy: writing-specific terms, document types, quality concerns, format language
writing_templates = {
    "technical-documentation": [
        "technical documentation",  # MUST: Primary term
        "how do i write docs",      # MUST: Conversational variant
        "API reference",            # SHOULD: Common document type
        "user guide",               # COULD: Document category
        "documentation structure",  # COULD: Quality concern
    ],
}

# ── Domain Template Selection Logic ─────────────────────────────────
def get_domain_template(domain: str, skill_name: str) -> list[str]:
    """Look up domain-specific trigger template by domain and skill name.

    Args:
        domain: One of the 8 domain categories.
        skill_name: The kebab-case skill topic name.

    Returns:
        List of suggested trigger terms, or empty list if no template found.
    """
    all_templates = {
        "cncf": cncf_templates,
        "trading": trading_templates,
        "coding": coding_templates,
        "agent": agent_templates,
        "go": go_templates,
        "linux": linux_templates,
        "programming": programming_templates,
        "writing": writing_templates,
    }

    domain_map = all_templates.get(domain)
    if not domain_map:
        return []

    # Try exact match first, then try without hyphens/underscores
    candidates = [skill_name, skill_name.replace("-", ""), skill_name.replace("_", "")]
    for candidate in candidates:
        if candidate in domain_map:
            return domain_map[candidate]

    return []
```

---

## Constraints

### MUST DO
- Always include the primary technical term as the first trigger
- Always pair every technical term with at least one conversational variant from a different tier
- Keep total trigger count between 5 and 8 terms — this is a hard limit
- Use kebab-case for compound words that appear in multiple triggers (e.g., `stop-loss`)
- Include common abbreviations when they are widely used by practitioners in the domain
- Validate each trigger against the precision heuristic before including it
- Run `validate_skill.sh` with static checks on every SKILL.md commit
- Check for overlap with related skills to prevent false-positive routing collisions
- Design triggers that would appear in actual Slack messages, Stack Overflow questions, or Jira tickets

### MUST NOT DO
- Include ultra-generic terms like `code`, `data`, `risk`, `pattern`, `solution`, or `tool`
- Use internal class names, file names, or repository-local terminology as triggers
- Create triggers that differ only by hyphenation from existing triggers (near-duplicates)
- Exceed 8 triggers — excess dilutes signal quality and causes false positives
- Design triggers using only one tier (all technical OR all conversational)
- Skip validation — every trigger set must pass the calibration heuristic before commit
- Assume a skill's name is sufficient as a trigger — add abbreviations and variants explicitly

---

## Output Template

When applying this skill to design or audit triggers for a SKILL.md, produce:

1. **Domain Assessment** — Target domain category with justification (why this domain fits the skill)
2. **Two-Tier Analysis** — Table showing Tier 1 (technical) terms and Tier 2 (conversational) terms separately
3. **Final Trigger Set** — Comma-separated list of 5–8 triggers ready for YAML frontmatter, ordered by priority
4. **Calibration Report** — Precision scores for each trigger with pass/fail against the heuristic questions
5. **Overlap Check** — Comparison against related skills' trigger sets with any identified conflicts
6. **Validation Output** — Results from `validate_skill.sh` run (exit code and any warnings)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-skill-development-workflow` | Full SKILL.md creation workflow — use this for body content, triggers are just one step |
| `agent-skill-engineering` | Agent orchestration and skill routing design — overlapping on dispatch/routing concepts |
| `coding-skill-testing-validation` | Automated testing of skills — validates trigger sets programmatically after design |

---

## Live References

> Authoritative documentation for skill format validation, YAML parsing, and the skill-router system.

- [SKILL Format Specification](https://github.com/levity-labs/agent-skill-router/blob/main/SKILL_FORMAT_SPEC.md) — Complete SKILL.md structure reference
- [YAML Lint Validator](https://www.yamllint.com/) — Online YAML syntax checker for frontmatter validation
- [Skill Router System README](https://github.com/levity-labs/agent-skill-router/blob/main/agent-skill-routing-system/README.md) — Router architecture and routing algorithm documentation
- [AGENTS.md — Adding New Skills](https://github.com/levity-labs/agent-skill-router/blob/main/AGENTS.md) — Full guide to creating, validating, and maintaining skills
