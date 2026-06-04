---
name: trigger-engineering
description: Engineers precision trigger sets for AI agent skills using two-tier discovery patterns, anti-trigger calibration, archetype alignment, and hybrid scoring optimization to maximize auto-loading accuracy while minimizing false positive rates.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: trigger engineering, trigger design, auto-load triggers, two-tier strategy, anti-triggers, hybrid scoring, archetype matching
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - generic trigger lists
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
  related-skills: skill-architecture-design, skill-testing-methodology, skill-router
---

# Trigger Engineering for AI Agent Skills

Engineers precision trigger sets for AI agent skills using two-tier discovery patterns, anti-trigger calibration, archetype alignment, and hybrid scoring optimization. When loaded, this skill makes the model act as a trigger engineer — designing trigger keyword sets that maximize auto-loading accuracy (recall ≥ 85%) while minimizing false positive rates (FPR < 15%) through systematic testing of technical and conversational trigger variants against real-world query patterns.

## TL;DR Checklist

- [ ] Include core topic name + most common abbreviation in triggers
- [ ] Design two-tier trigger set: technical terms for experts + conversational phrases for non-experts
- [ ] Validate each trigger with the calibration heuristic (would someone plausibly need this skill saying this word?)
- [ ] Ensure 5–8 total terms; flag any that are ultra-generic or redundant
- [ ] Add anti-triggers to prevent matching queries where this skill should NOT load
- [ ] Align archetypes with expected query intent types

---

## When to Use

Use this skill when:

- Designing trigger sets for new SKILL.md files — ensures triggers follow two-tier discovery strategy and hybrid scoring optimization
- Revising existing skills that suffer from false positives (matching irrelevant conversations) or false negatives (missing valid queries)
- Building a new domain of skills where trigger overlap between sibling skills could confuse the router
- Evaluating whether a skill's trigger set is too broad (generic terms), too narrow (misses natural phrasing), or missing conversational variants
- Optimizing trigger performance after observing routing analytics showing low confidence scores or high zero-match rates

---

## When NOT to Use

Avoid this skill for:

- Designing overall skill architecture or determining what topics a skill should cover — use `skill-architecture-design` instead
- Testing triggers against real query corpora — use `skill-testing-methodology` for quantitative precision/recall measurement
- Debugging general agent behavior unrelated to trigger matching — use diagnostic skills focused on runtime analysis
- One-off manual prompt engineering where the structured trigger design process is unnecessary overhead

---

## Core Workflow

1. **Identify Target Domain and Audience** — Determine who will search for this skill: technical practitioners (who use exact product names, abbreviations, API terms), business users (who use natural language like "how do I..."), or both. Document the primary audience and secondary audience segments.
   **Checkpoint:** Identify at least two distinct user personas (e.g., "SRE who types 'promql alerting' and a manager who types 'help with monitoring systems'").

2. **Generate Tier 1: Technical Triggers** — List all exact domain terminology used by practitioners: product names, abbreviations, API endpoints, configuration patterns, framework terms, standard acronyms (e.g., ATR, PromQL, k8s, VWAP). These are the precise terms found in documentation, official product names, and technical discussions.
   **Checkpoint:** Each Tier 1 trigger must be a real, documented term — not an internal class name or implementation detail.

3. **Generate Tier 2: Conversational Triggers** — List natural language phrases that non-technical users or the business would use when searching for help with this domain. Include "how do I..." variants, "help with..." phrasing, and everyday terms (e.g., "cloud server" for EC2, "database" for PostgreSQL). At least one trigger should be a "how do I..." variant.
   **Checkpoint:** Read each conversational trigger aloud — if it sounds like something you'd type into Slack or Stack Overflow to ask for help, it qualifies.

4. **Select and Prioritize 5–8 Final Triggers** — Combine Tier 1 and Tier 2 candidates, prioritizing ruthlessly within the 5–8 term limit. MUST INCLUDE: core topic name + most common abbreviation. SHOULD INCLUDE: 1–2 conversational variants matching typical user questions + 1 "how do I..." variant. COULD INCLUDE: adjacent technology terms or misspelling variants if space allows.
   **Checkpoint:** Count final triggers — must be between 5 and 8 inclusive. Remove any that are ultra-generic or near-duplicates.

5. **Calibrate with Anti-Triggers** — Identify terms that indicate the skill should NOT load for certain queries. This prevents generic skills from dominating specific task queries. List 1–3 anti-triggers (e.g., "brainstorming" for implementation-focused skills, "vague ideation" for tactical tasks).
   **Checkpoint:** Anti-trigger match results in -0.15 penalty per match (max -0.5) in hybrid scoring — choose terms that genuinely indicate the wrong intent.

6. **Test Trigger Precision/Recall** — For each trigger term, apply the calibration heuristic: "If someone says this word/phrase in conversation, would they plausibly need this skill?" If no for 2+ triggers, revise them. Check that at least one trigger is technical, one is conversational, and one is task-oriented.
   **Checkpoint:** Diversity test passes — triggers include at least one technical term, at least one conversational/user phrase, and at least one task-oriented term.

7. **Align Archetypes with Query Intent** — Map the skill to one or more query archetypes: tactical (implementation/debugging), strategic (design/architecture), diagnostic (troubleshooting), orchestration (multi-step workflows), educational (learning/explanation), enforcement (compliance/policy), generation (code scaffolding). The router boosts skills whose archetypes match the inferred query intent type.
   **Checkpoint:** For implementation skills, declare at least one of: tactical, diagnostic. For reference skills, declare at least one of: educational, strategic.

---

## Trigger Design Patterns

### Pattern 1: Two-Tier Trigger Framework

This function implements the two-tier trigger design framework, generating candidate triggers from technical and conversational perspectives, then scoring them for precision and recall potential.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TriggerTier(Enum):
    """Trigger discovery tier classification."""
    TECHNICAL = "technical"         # Exact domain terminology
    CONVERSATIONAL = "conversational"  # Natural language phrases


class TriggerRole(Enum):
    """The functional role of a trigger within a skill's trigger set."""
    CORE_NAME = "core_name"           # Primary product/concept name
    ABBREVIATION = "abbreviation"     # Common shorthand or acronym
    HOW_DO_I = "how_do_i"             # Conversational question variant
    HELP_WITH = "help_with"           # Request-style phrasing
    OPERATIONAL_TASK = "operational_task"  # Action-oriented phrase
    ADJACENT_TECH = "adjacent_tech"   # Related technology term
    MARKET_CONTEXT = "market_context" # Domain-specific context (crypto, forex, etc.)
    RISK_LANGUAGE = "risk_language"   # Risk/compliance terminology


@dataclass
class TriggerCandidate:
    """A single trigger candidate with its tier and role metadata."""
    phrase: str
    tier: TriggerTier
    role: TriggerRole
    priority: int  # 1=highest, 5=lowest

    def to_yaml_trigger(self) -> str:
        """Format as a YAML-ready trigger string."""
        return self.phrase

    def __repr__(self) -> str:
        return f"Trigger('{self.phrase}', tier={self.tier.value}, role={self.role.value})"


@dataclass
class TriggerSet:
    """Complete trigger set for a single skill with metadata."""
    core_name: str
    technical_triggers: list[TriggerCandidate] = field(default_factory=list)
    conversational_triggers: list[TriggerCandidate] = field(default_factory=list)
    anti_triggers: list[str] = field(default_factory=list)
    archetypes: list[str] = field(default_factory=list)

    @property
    def all_triggers(self) -> list[str]:
        """All trigger phrases combined."""
        return (
            [t.phrase for t in self.technical_triggers] +
            [t.phrase for t in self.conversational_triggers]
        )

    @property
    def total_count(self) -> int:
        return len(self.all_triggers)

    @property
    def has_conversational_variant(self) -> bool:
        """Check if at least one trigger is a conversational variant."""
        return any(
            t.role in (TriggerRole.HOW_DO_I, TriggerRole.HELP_WITH)
            for t in self.conversational_triggers
        )

    def to_frontmatter_yaml(self) -> str:
        """Generate YAML frontmatter block for triggers."""
        lines = ["triggers: " + ", ".join(self.all_triggers)]
        if self.anti_triggers:
            lines.append("  anti_triggers:")
            for anti in self.anti_triggers:
                lines.append(f"    - {anti}")
        else:
            lines.append("  anti_triggers: []")

        if self.archetypes:
            lines.append("  archetypes:")
            for arch in self.archetypes:
                lines.append(f"    - {arch}")
        return "\n".join(lines)


def design_two_tier_triggers(
    skill_topic: str,
    domain: str,
    audience_technical_terms: list[str],
    audience_conversational_phrases: list[str],
) -> TriggerSet:
    """Design a two-tier trigger set for an AI agent skill.

    Combines technical precision with conversational accessibility to
    maximize auto-loading accuracy across all user personas.

    Args:
        skill_topic: The kebab-case topic name of the skill (e.g., "stop-loss").
        domain: The skill's domain category (agent, coding, trading, etc.).
        audience_technical_terms: Pre-collected technical terms from domain experts.
        audience_conversational_phrases: Pre-collected natural language phrases from users.

    Returns:
        TriggerSet with categorized triggers, anti-triggers, and archetypes.
    """
    trigger_set = TriggerSet(core_name=skill_topic)

    # Build core name trigger (MUST INCLUDE — non-negotiable)
    core_phrase = skill_topic.replace("-", " ").title()
    trigger_set.technical_triggers.append(TriggerCandidate(
        phrase=skill_topic,  # kebab-case form is the primary match
        tier=TriggerTier.TECHNICAL,
        role=TriggerRole.CORE_NAME,
        priority=1,
    ))

    # Add technical term triggers
    for term in audience_technical_terms[:4]:  # Cap at 4 technical terms
        trigger_set.technical_triggers.append(TriggerCandidate(
            phrase=term.strip(),
            tier=TriggerTier.TECHNICAL,
            role=_infer_trigger_role(term, domain),
            priority=2,
        ))

    # Add conversational triggers (at least 1 "how do I" required)
    how_do_i_found = False
    for phrase in audience_conversational_phrases:
        phrase_lower = phrase.lower().strip()
        if not how_do_i_found and ("how do i" in phrase_lower or "how to" in phrase_lower):
            trigger_set.conversational_triggers.append(TriggerCandidate(
                phrase=phrase.strip(),
                tier=TriggerTier.CONVERSATIONAL,
                role=TriggerRole.HOW_DO_I,
                priority=1,
            ))
            how_do_i_found = True
        elif "help with" in phrase_lower:
            trigger_set.conversational_triggers.append(TriggerCandidate(
                phrase=phrase.strip(),
                tier=TriggerTier.CONVERSATIONAL,
                role=TriggerRole.HELP_WITH,
                priority=2,
            ))
        else:
            trigger_set.conversational_triggers.append(TriggerCandidate(
                phrase=phrase.strip(),
                tier=TriggerTier.CONVERSATIONAL,
                role=TriggerRole.OPERATIONAL_TASK,
                priority=3,
            ))

    # Select final triggers: prioritize by role importance then priority score
    trigger_set = _prioritize_final_triggers(trigger_set)

    return trigger_set


def _infer_trigger_role(phrase: str, domain: str) -> TriggerRole:
    """Infer the functional role of a technical trigger phrase."""
    phrase_lower = phrase.lower().strip()

    # Check for common abbreviations/acronyms
    if len(phrase.strip()) <= 5 and phrase.isupper():
        return TriggerRole.ABBREVIATION

    # Check for operational task keywords
    task_keywords = ["deploy", "configure", "monitor", "scrape", "alert", "scale", "backup"]
    if any(kw in phrase_lower for kw in task_keywords):
        return TriggerRole.OPERATIONAL_TASK

    # Check for market context (trading domain)
    market_terms = ["crypto", "forex", "stocks", "options", "futures", "equities"]
    if any(mt in phrase_lower for mt in market_terms):
        return TriggerRole.MARKET_CONTEXT

    return TriggerRole.CORE_NAME


def _prioritize_final_triggers(trigger_set: TriggerSet) -> TriggerSet:
    """Select the final 5–8 triggers from candidates, prioritized by role importance."""
    # Sort all triggers by priority (lower = higher priority), then by tier preference
    all_candidates = (
        sorted(trigger_set.technical_triggers, key=lambda t: t.priority) +
        sorted(trigger_set.conversational_triggers, key=lambda t: t.priority)
    )

    # Build final set with deduplication
    final: list[TriggerCandidate] = []
    seen_phrases: set[str] = set()

    for candidate in all_candidates:
        normalized = candidate.phrase.lower().strip()
        if normalized in seen_phrases:
            continue
        seen_phrases.add(normalized)
        final.append(candidate)
        if len(final) >= 8:
            break

    # Ensure minimum: at least 1 technical + at least 1 conversational
    has_tech = any(f.tier == TriggerTier.TECHNICAL for f in final)
    has_conv = any(f.tier == TriggerTier.CONVERSATIONAL for f in final)
    if not has_tech and final:
        # Reinsert first technical trigger
        for t in sorted(trigger_set.technical_triggers, key=lambda x: x.priority):
            if t.phrase.lower().strip() not in seen_phrases:
                final.insert(0, t)
                break
    if not has_conv and final:
        for c in sorted(trigger_set.conversational_triggers, key=lambda x: x.priority):
            if c.phrase.lower().strip() not in seen_phrases:
                final.append(c)
                break

    # Re-categorize into trigger_set
    trigger_set.technical_triggers = [f for f in final if f.tier == TriggerTier.TECHNICAL]
    trigger_set.conversational_triggers = [f for f in final if f.tier == TriggerTier.CONVERSATIONAL]

    return trigger_set


# --- Example usage ---
# triggers = design_two_tier_triggers(
#     skill_topic="stop-loss",
#     domain="trading",
#     audience_technical_terms=["ATR stop", "trailing stop", "support/resistance levels", "volatility adjustment"],
#     audience_conversational_phrases=[
#         "how do i limit losses on a trade",
#         "help with exit strategy for positions",
#         "protect capital from downside risk",
#     ],
# )
# print(triggers.to_frontmatter_yaml())
```

### BAD vs GOOD: Trigger Design Examples

```python
# ❌ BAD — All technical, no conversational variants (misses 70% of users)
triggers: "kubernetes, k8s, deployment, orchestration, container"
# Problem: Only expert terminology. A manager typing "how do i scale my apps" will never find this skill.

# ✅ GOOD — Balanced two-tier set (expert + non-expert coverage)
triggers: "kubernetes, k8s, container orchestration, managing containers, deploying applications, scaling apps, helm"
# Covers: expert terms (kubernetes, k8s), category name (container orchestration),
# operational tasks (managing containers, deploying applications, scaling apps), adjacent tech (helm)


# ❌ BAD — All generic terms (fires on nearly everything)
triggers: "risk, trading, loss, price"
# Problem: `risk` fires on every conversation mentioning risk management.
# `code` would fire on every coding discussion. These are useless as triggers.

# ✅ GOOD — Specific domain phrases (precision targeting)
triggers: "stop loss, trailing stop, ATR stop, stop placement, position protection, how do i limit losses, emergency stop"
# Covers: core concepts (stop loss), variants (trailing stop, ATR stop), operational tasks (stop placement),
# conversational (how do i limit losses), context (position protection, emergency stop)


# ❌ BAD — Internal jargon only (not user-facing vocabulary)
triggers: "DeploymentController, KubeletConfig, pod-scheduler-latency"
# Problem: These are internal implementation details, not terms users search for.

# ✅ GOOD — Publicly documented terms matching user search behavior
triggers: "deployment scheduling, pod latency, how do i troubleshoot slow deployments, kubernetes performance"
# Matches how both SREs and managers would describe the same problem.
```

### Pattern 2: Trigger Calibration Test Suite

This function validates trigger sets against calibration heuristics, measuring precision/recall potential and flagging problematic triggers for revision.

```python
from typing import List


def calibrate_trigger_set(
    skill_name: str,
    triggers: List[str],
    anti_triggers: List[str],
    domain: str,
) -> dict:
    """Validate a trigger set against calibration heuristics.

    Applies the five-tier calibration framework to ensure each trigger
    meets quality standards before being committed to SKILL.md frontmatter.

    Args:
        skill_name: The kebab-case name of the skill for error messages.
        triggers: The candidate trigger phrases (5-8 terms).
        anti_triggers: Anti-trigger phrases that suppress matching.
        domain: The skill's domain category.

    Returns:
        Dictionary with validation results per trigger and overall pass/fail.
    """
    results = {
        "skill_name": skill_name,
        "trigger_count": len(triggers),
        "count_pass": 3 <= len(triggers) <= 8,
        "triggers": [],
        "anti_triggers_valid": True,
        "overall_score": 0.0,
    }

    generic_terms = {"code", "data", "risk", "pattern", "system", "tool", "api", "management"}

    has_technical = False
    has_conversational = False
    has_task_oriented = False
    quality_issues = []

    for i, trigger in enumerate(triggers):
        trigger_lower = trigger.lower().strip()

        # Check: Is it a generic term?
        is_generic = trigger_lower in generic_terms
        if is_generic:
            quality_issues.append(f"Trigger #{i+1} '{trigger}' is an ultra-generic term")

        # Check: Does it contain conversational markers?
        has_conversational_marker = any(
            marker in trigger_lower
            for marker in ["how do i", "how to", "help with", "what is", "best practice"]
        )
        if has_conversational_marker:
            has_conversational = True

        # Check: Does it contain task/action verbs?
        task_verbs = ["deploy", "configure", "monitor", "scale", "backup", "implement", "fix", "debug"]
        is_task = any(v in trigger_lower for v in task_verbs) or any(
            w in trigger_lower for w in ["deploying", "configuring", "monitoring", "scaling"]
        )
        if is_task:
            has_task_oriented = True

        # Check: Is it hyphenated (good for matching variants)?
        is_hyphenated = "-" in trigger or "_" in trigger
        if is_hyphenated and " " in trigger:
            quality_issues.append(
                f"Trigger '#{trigger}' uses both hyphens and spaces — "
                f"consider standardizing to one format"
            )

        results["triggers"].append({
            "phrase": trigger,
            "is_generic": is_generic,
            "has_conversational_marker": has_conversational_marker,
            "is_task_oriented": is_task,
            "issues": [q for q in quality_issues if f"Trigger #{i+1}" in q],
        })

    # Check anti-triggers
    if len(anti_triggers) > 0 and len(anti_triggers) > 3:
        results["anti_triggers_valid"] = False
        results.setdefault("issues", []).append(
            "Anti-triggers should be limited to 1-3 terms"
        )

    # Calculate overall quality score (0.0 - 1.0)
    issues_count = len([t for t in results["triggers"] if t["is_generic"]])
    diversity_pass = has_technical and has_conversational and has_task_oriented
    count_valid = results["count_pass"]

    score = 1.0
    score -= issues_count * 0.2
    if not count_valid:
        score -= 0.3
    if not diversity_pass:
        score -= 0.2
    if not results["anti_triggers_valid"]:
        score -= 0.1

    results["overall_score"] = round(max(0.0, min(score, 1.0)), 2)
    results["diversity_test"] = {
        "has_technical": has_technical or not is_generic,
        "has_conversational": has_conversational,
        "has_task_oriented": has_task_oriented,
    }

    return results


def evaluate_trigger_quality(trigger_set: dict) -> str:
    """Produce a human-readable quality evaluation for a trigger set."""
    score = trigger_set["overall_score"]
    count = trigger_set["trigger_count"]

    if score >= 0.8:
        grade = "A"
        recommendation = "Excellent trigger set — ready for deployment"
    elif score >= 0.6:
        grade = "B"
        recommendation = "Good but has minor issues to address before production"
    elif score >= 0.4:
        grade = "C"
        recommendation = "Needs significant revision — multiple quality concerns detected"
    else:
        grade = "F"
        recommendation = "FAIL: This trigger set should not be deployed without major overhaul"

    lines = [
        f"Grade: {grade} (score: {trigger_set['overall_score']})",
        f"Trigger count: {count}/5-8 range",
        f"Recommendation: {recommendation}",
        "",
    ]

    diversity = trigger_set.get("diversity_test", {})
    lines.append("Diversity test:")
    for key, value in diversity.items():
        symbol = "PASS" if value else "FAIL"
        lines.append(f"  [{symbol}] {key}")
    lines.append("")

    for t in trigger_set["triggers"]:
        issues = ", ".join(t["issues"]) if t["issues"] else "OK"
        marker = "⚠️" if t["is_generic"] else "✅"
        lines.append(f"  {marker} '{t['phrase']}' — {issues}")

    return "\n".join(lines)


# --- Example usage ---
# calibration = calibrate_trigger_set(
#     skill_name="stop-loss",
#     triggers=[
#         "stop loss", "trailing stop", "ATR stop", "position protection",
#         "how do i limit losses", "emergency stop", "volatility-adjusted"
#     ],
#     anti_triggers=["brainstorming", "vague ideation"],
#     domain="trading",
# )
# print(evaluate_trigger_quality(calibration))
```

---

## Constraints

### MUST DO
- Include the core topic name (kebab-case or natural language) as the primary trigger — this is non-negotiable
- Design triggers in two tiers: at least one technical term AND at least one conversational variant ("how do I...", "help with...")
- Keep total triggers between 5 and 8 terms — fewer misses valid queries, more creates false positives
- Include at least one hyphenated variant when both forms are common (e.g., `stop-loss` alongside `stop loss`)
- Add 1–3 anti-triggers that genuinely indicate the wrong intent for this skill's purpose
- Align archetypes with expected query intent: tactical for implementation, educational for reference materials

### MUST NOT DO
- Use ultra-generic terms like "code", "data", "risk", "pattern", or "system" as standalone triggers — they fire on nearly everything
- Create trigger sets that are purely internal jargon (class names, method names) — users don't search with these terms
- List more than 8 triggers — dilution of signal causes false positives and wastes router scoring budget
- Inherit parent triggers when splitting a skill — each sub-skill needs its own domain-specific trigger set
- Add anti-triggers for common legitimate use cases — over-aggressive anti-triggers suppress valid matches

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Trigger Design Report** — Two-tier breakdown showing technical triggers vs conversational triggers, with role classification (core_name, abbreviation, how_do_i, operational_task, etc.) for each term
2. **Calibration Analysis** — Per-trigger validation results including generic-term detection, conversational-marker presence, and task-orientation score
3. **Diversity Test Results** — Pass/fail for three diversity dimensions: technical terms present, conversational variants present, task-oriented terms present
4. **Anti-Trigger Recommendations** — 1–3 anti-triggers with justification for why each query pattern should be excluded
5. **Final YAML Frontmatter Block** — Ready-to-copy YAML block containing triggers, anti_triggers, and archetypes in the correct frontmatter format

---

## Related Skills

| Skill | Purpose |
|---|---|
| `skill-architecture-design` | Architecture design defines the skill structure; trigger engineering populates the metadata for auto-discovery |
| `skill-testing-methodology` | Validates trigger precision/recall with quantitative testing after implementation |
| `skill-router` | Implements the routing infrastructure that uses these triggers — complementary to trigger design |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenCode Documentation](https://opencode.ai/docs)
- [LangChain Prompting Best Practices](https://python.langchain.com/docs/concepts/prompt_templates/)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [Google Gemini System Instructions](https://ai.google.dev/gemini-api/docs/system-instructions)
- [MCP (Model Context Protocol) Specification](https://modelcontextprotocol.io/)

## Appendix: Domain-Specific Trigger Templates

Use these templates as starting points when designing triggers for each domain. Adapt terms to your specific skill topic.

### Trading Skills Template
```yaml
# Technical Tier (practitioner vocabulary)
- stop loss                    # Core concept
- trailing stop                # Variant type
- ATR stop                    # Technical abbreviation
- position protection          # Domain-specific operational task

# Conversational Tier (how users actually search)
- how do i limit losses       # Primary conversational variant
- exit strategy for positions  # Execution vocabulary
- capital protection           # Business/risk language
```

### CNCF/Cloud-Native Skills Template
```yaml
# Technical Tier
- prometheus                   # Core product name
- promql                       # Common abbreviation
- kube-state-metrics           # Adjacent infrastructure term

# Conversational Tier
- how do i monitor systems     # Primary operational question
- metrics alerting configuration  # Task-oriented phrasing
- grafana dashboards for alerts   # Adjacent tech bridge term
```

### Coding Skills Template
```yaml
# Technical Tier
- code review                  # Core practice name
- security audit               # Quality concern
- OWASP                        # Standard reference

# Conversational Tier
- how do i review code         # Primary learning variant
- pull request quality checks  # Operational task phrasing
- architectural review process  # Strategy-level question
```

### Agent/Orchestration Skills Template
```yaml
# Technical Tier
- skill routing                # Core concept
- confidence scoring           # Algorithm term
- agent dispatch               # Pattern name

# Conversational Tier
- how do i automate this task  # Primary discovery variant
- parallel execution of tasks   # Operational concern
- fallback when agents fail     # Error handling language
```
