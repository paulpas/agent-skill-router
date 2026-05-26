---
name: skill-trigger-engineering
description: Designs optimized trigger sets using a two-tier strategy combining technical terms with conversational variants, prevents false-positive activation, and ensures discoverability across expert and non-technical audiences.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill triggers, trigger engineering, auto-loading keywords, how do i design triggers, conversational discovery, trigger overlap, two-tier strategy, skill discoverability
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming vague ideation
    - generic keyword stuffing
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: agent-skill-ecosystem-design, prompt-engineering-patterns
---

# Skill Trigger Engineering

The model designs precision trigger sets for AI agent skills that balance technical accuracy with conversational accessibility, preventing false-positive activations while maximizing auto-loading discovery. It applies the two-tier trigger strategy — pairing exact domain terminology (product names, abbreviations, acronyms) with natural-language phrases that non-expert users actually type — and validates every trigger against overlap analysis and calibration heuristics before finalizing.

## TL;DR Checklist

- [ ] Extract at least 3 technical-tier terms from the skill's domain vocabulary before writing any conversational variants
- [ ] Generate at least 2 "how do I..." phrases using the exact grammar patterns from the two-tier template (not invented phrasing)
- [ ] Calculate Jaccard similarity between the candidate trigger set and every related skill's triggers — reject if any pair exceeds 0.30 overlap
- [ ] Run the calibration heuristic on each trigger: "would a real person say this exact phrase when asking for help?" — remove any that fail
- [ ] Verify final trigger count is between 5 and 8 inclusive, with at least one term from each tier
- [ ] Validate YAML frontmatter `triggers` field uses comma-separated plain strings (not quoted arrays) matching the Python output exactly
- [ ] Test triggers against a sample of natural queries: "how do I set up monitoring" should fire the relevant skill; "monitor my code" should not

---

## When to Use

Use this skill when:

- Creating a new `SKILL.md` and its `metadata.triggers` field is empty or contains only generic terms like `code`, `data`, or `pattern`
- A skill's auto-loading rate is abnormally low — you suspect the trigger set doesn't match what users actually type
- You are auditing an existing skill's triggers for false-positive risk (overlap > 30% with a related skill)
- Migrating a skill from manual-only loading (`/skill <name>`) to auto-loading by defining discoverable keywords
- Designing triggers for a skill that spans two user communities (e.g., SREs who know `PromQL` and managers who say "monitor systems")

---

## When NOT to Use

Avoid this skill for:

- **Designing the skill's implementation logic** — This skill only handles trigger set engineering, not code, workflows, or patterns. Use `prompt-engineering-patterns` for system prompt design instead.
- **Adding more than 8 triggers** — If your candidate list exceeds 8 terms, you are covering too many topics. Split the skill into two atomic skills with separate trigger sets (see AGENTS.md monolith split criteria).
- **Skills with no related domain vocabulary** — If a skill's entire audience uses only one word to describe it, there is nothing for this skill to optimize. Skip directly to a 3-term minimal set.

---

## Orchestration Flow

```
Skill Definition (domain + purpose)
              ↓
   ┌──────────────────────┐
   │ Tier 1: Technical     │ ← Product names, abbreviations, acronyms
   │ Extract Terms         │   ATR, PromQL, k8s, OWASP, VWAP
   └──────────┬───────────┘
              ↓
   ┌──────────────────────┐
   │ Tier 2: Conversational│ ← "how do I..." phrases, business language,
   │ Extract Phrases       │   colloquialisms, adjacent tasks
   └──────────┬───────────┘
              ↓
   ┌──────────────────────┐
   │ Merge & Deduplicate  │ ← Combine tiers, remove near-duplicates,
   │ to Candidate Set     │   cap at 8 terms
   └──────────┬───────────┘
              ↓
   ┌──────────────────────┐
   │ Overlap Analysis      │ ← Jaccard similarity against all related
   │ (Jaccard < 0.30)     │   skills' trigger sets; remove or replace
   │                      │   terms that exceed threshold
   └──────────┬───────────┘
              ↓
   ┌──────────────────────┐
   │ Calibration Heuristic │ ← Plausibility test: "would someone actually
   │ (Plausibility Check)  │   say this?" — remove any failing terms
   └──────────┬───────────┘
              ↓
   ┌──────────────────────┐
   │ Final Validation      │ ← Count ∈ [5,8], both tiers present,
   │ & Frontmatter Output  │   YAML format correct, reciprocal links set
   └──────────────────────┘
```

## Core Workflow

1. **Map the Domain Audience** — Identify every user segment that would search for this skill. For each segment, list the language they use: technical users (e.g., SREs) say `PromQL` and `alerting rules`; business users say "monitor our systems" and "cost savings." Write a table with columns: `{audience_type, technical_terms, conversational_phrases}`. **Checkpoint:** You must have at least two distinct audience types identified before proceeding. If only one exists, the skill's scope may be too narrow to justify auto-loading complexity.

2. **Extract Technical-Tier Terms** — From the skill's domain description and implementation patterns, pull exact product names, abbreviations, acronyms, and domain-specific jargon. For example: a monitoring skill yields `prometheus`, `promql`, `kubernetes`, `alertmanager`, `grafana`. Exclude internal class names, file paths, or proprietary identifiers. **Checkpoint:** The technical tier must contain at least 3 distinct terms. If it has fewer, you are either too broad (merge with another skill) or missing domain vocabulary (research the field).

3. **Generate Conversational-Tier Terms** — Apply these four templates to produce natural-language triggers:
   - `"how do I" + [primary action]`: "how do I monitor systems", "how do I set up backups"
   - `"help with" + [operational concern]`: "help with alerting", "help with performance tuning"
   - Business-value phrases: "cost savings", "security audit", "compliance reporting"
   - Adjacent-task bridging: terms users search when they don't know the product name yet ("container management" → Kubernetes skill)
   
   Each phrase must use the exact grammar shown — do not invent variants. **Checkpoint:** The conversational tier must contain at least 2 phrases, and each must be a complete natural-language expression (not a single word).

4. **Run Overlap Analysis** — Load the trigger sets of every skill listed in `related-skills` from their frontmatter. Compute Jaccard similarity between your candidate set and each related skill's triggers: `J(A,B) = |A ∩ B| / |A ∪ B|`. Any pair exceeding 0.30 overlap means those terms are too generic — either remove the overlapping term or replace it with a more specific one. **Checkpoint:** After this step, no remaining trigger may share >25% of its words with any related skill's triggers. If you cannot resolve overlaps, reconsider whether these skills should be atomic or merged.

5. **Validate Final Set Against Calibration Heuristic** — For each of the 5–8 final triggers, run the plausibility test: imagine a real user typing this exact phrase into a search box when they need help. Would it match? Reject any trigger that:
   - Is an internal identifier (class name, file path, API endpoint)
   - Requires domain expertise to understand (e.g., `pg_replication_slots` for a general database skill)
   - Could match a completely unrelated topic (e.g., "scaling" matches both app scaling and data pipeline scaling)
   
   **Checkpoint:** All remaining triggers must pass the plausibility test. The final set must contain between 5 and 8 terms inclusive, with at least one from each tier. Write the result into the frontmatter `triggers` field as a comma-separated string.

---

## Implementation Patterns

### Pattern 1: Two-Tier Trigger Extractor

Takes a structured domain description and outputs categorized trigger sets for both technical and conversational tiers, enforcing minimum term counts per tier.

```python
"""Two-tier trigger set extraction for skill auto-loading design.

Parses a domain specification into technical terms (exact names,
abbreviations, acronyms) and conversational phrases (natural-language
queries users would type), then enforces tier-specific constraints.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TriggerTier:
    """A categorized set of trigger terms for a single tier."""
    name: str  # "technical" or "conversational"
    terms: list[str] = field(default_factory=list)

    def add(self, term: str) -> None:
        """Add a term if not already present (case-insensitive dedup)."""
        lower = term.lower().strip()
        if lower and lower not in [t.lower() for t in self.terms]:
            self.terms.append(term.strip())

    @property
    def size(self) -> int:
        return len(self.terms)

    def __len__(self) -> int:
        return self.size


@dataclass
class TriggerSet:
    """Complete trigger set with both tiers and metadata."""
    technical: TriggerTier = field(default_factory=lambda: TriggerTier("technical"))
    conversational: TriggerTier = field(default_factory=lambda: TriggerTier("conversational"))
    merged: list[str] = field(default_factory=list)
    source_domain: str = ""

    @property
    def total_size(self) -> int:
        return len(self.technical) + len(self.conversational)

    @property
    def yaml_string(self) -> str:
        """Return comma-separated string for YAML frontmatter."""
        return ", ".join(
            self.technical.terms + self.conversational.terms
        )


# Template phrases for conversational tier generation.
CONVERSATIONAL_TEMPLATES: list[tuple[str, str]] = [
    ("how do I", "perform the primary action of the skill"),
    ("help with", "an operational concern related to the domain"),
    ("what is", "the core concept this skill implements"),
    ("best practices for", "common tasks within this domain"),
]


def extract_two_tier_triggers(
    domain_description: str,
    technical_terms: list[str],
    action_verb: str,
    domain_name: str,
    adjacent_concerns: Optional[list[str]] = None,
) -> TriggerSet:
    """Extract categorized trigger sets from a domain description.

    Generates both technical-tier terms (exact names, abbreviations) and
    conversational-tier phrases using standardized templates. Enforces
    minimum counts per tier and deduplicates across tiers.

    Args:
        domain_description: One-sentence description of what the skill does.
        technical_terms: Domain-specific exact terms to include verbatim.
        action_verb: The primary action the skill performs (e.g., "monitor", "deploy").
        domain_name: The core concept or product name (e.g., "Prometheus", "Kubernetes").
        adjacent_concerns: Optional list of related operational tasks users might search.

    Returns:
        TriggerSet with populated technical and conversational tiers,
        merged deduplicated list, and YAML frontmatter string.

    Raises:
        ValueError: If fewer than 2 technical terms or no action verb provided.
    """
    if len(technical_terms) < 2:
        raise ValueError(
            f"Need at least 2 technical terms, got {len(technical_terms)}. "
            "Include product names, abbreviations, and domain acronyms."
        )
    if not action_verb or not domain_name:
        raise ValueError("Both action_verb and domain_name are required.")

    triggers = TriggerSet(source_domain=domain_name)

    # Tier 1: Technical terms — exact, no transformation
    for term in technical_terms:
        triggers.technical.add(term)

    # Tier 2: Conversational phrases using templates
    base_phrase = f"{action_verb} {domain_name.lower()}".strip()

    for prefix, instruction in CONVERSATIONAL_TEMPLATES:
        if prefix == "how do I":
            triggers.conversational.add(f"how do I {base_phrase}")
        elif prefix == "help with":
            # Derive from domain name + action verb
            conversationally_named = f"{domain_name.lower()} {action_verb}"
            triggers.conversational.add(f"help with {conversationally_named}")
        elif prefix == "what is":
            triggers.conversational.add(f"what is {domain_name}")
        elif prefix == "best practices for":
            triggers.conversational.add(f"best practices for {domain_name.lower()}")

    # Add adjacent concern phrases if provided
    if adjacent_concerns:
        for concern in adjacent_concerns[:2]:  # Cap at 2 to stay within limit
            triggers.conversational.add(
                f"help with {action_verb} and {concern.lower()}"
            )

    # Merge and deduplicate across tiers
    seen: set[str] = set()
    for tier in (triggers.technical, triggers.conversational):
        for term in tier.terms:
            key = term.lower().strip()
            if key not in seen:
                triggers.merged.append(term)
                seen.add(key)

    # Enforce minimums
    if triggers.technical.size < 3:
        raise ValueError(
            f"Technical tier has only {triggers.technical.size} terms (minimum 3). "
            "Add product names, abbreviations, or domain acronyms."
        )
    if triggers.conversational.size < 2:
        raise ValueError(
            f"Conversational tier has only {triggers.conversational.size} phrases (minimum 2). "
            "Ensure templates generate full natural-language queries."
        )

    return triggers


# --- Example usage ---

if __name__ == "__main__":
    # Example: Designing triggers for a Prometheus monitoring skill
    result = extract_two_tier_triggers(
        domain_description=(
            "Collects and queries time-series metrics from Kubernetes "
            "services with alerting and dashboard configuration."
        ),
        technical_terms=["prometheus", "promql", "kubernetes", "alertmanager"],
        action_verb="monitor",
        domain_name="Prometheus",
        adjacent_concerns=["performance tuning", "cost optimization"],
    )

    print(f"Source domain: {result.source_domain}")
    print(f"Technical tier ({result.technical.size} terms):")
    for t in result.technical.terms:
        print(f"  - {t}")
    print(f"Conversational tier ({result.conversational.size} phrases):")
    for t in result.conversational.terms:
        print(f"  - {t}")
    print(f"\nMerged set ({len(result.merged)} terms): {', '.join(result.merged)}")
    print(f"\nYAML frontmatter triggers:")
    print(f'  triggers: {result.yaml_string}')
```

### Pattern 2: Trigger Overlap Analyzer (Jaccard Similarity)

Computes Jaccard similarity between two trigger sets, identifies overlapping terms, and suggests replacements when overlap exceeds a configurable threshold.

```python
"""Trigger overlap analysis using Jaccard similarity for skill relationship auditing.

Detects excessive overlap between a candidate trigger set and existing skills'
triggers, preventing false-positive activations where one skill masks another.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OverlapReport:
    """Result of comparing two trigger sets."""
    jaccard_similarity: float
    overlapping_terms: list[str] = field(default_factory=list)
    unique_to_set_a: list[str] = field(default_factory=list)
    unique_to_set_b: list[str] = field(default_factory=list)
    exceeds_threshold: bool = False
    threshold: float = 0.30
    recommendation: str = ""

    def __str__(self) -> str:
        status = "EXCEEDS" if self.exceeds_threshold else "OK"
        return (
            f"[{status}] Jaccard={self.jaccard_similarity:.3f} | "
            f"Overlap: {', '.join(self.overlapping_terms) or 'none'} | "
            f"{len(self.unique_to_set_a)} unique to A, "
            f"{len(self.unique_to_set_b)} unique to B"
        )


def compute_jaccard_similarity(
    set_a: list[str],
    set_b: list[str],
) -> float:
    """Compute Jaccard similarity between two trigger sets.

    J(A, B) = |A ∩ B| / |A ∪ B|. Returns 0.0 if both sets are empty.
    Uses case-insensitive comparison for robustness.

    Args:
        set_a: First trigger set (e.g., candidate skill's triggers).
        set_b: Second trigger set (e.g., related skill's triggers).

    Returns:
        Jaccard similarity coefficient in [0.0, 1.0].
        0.0 = no overlap, 1.0 = identical sets.
    """
    a_lower = {t.strip().lower() for t in set_a if t.strip()}
    b_lower = {t.strip().lower() for t in set_b if t.strip()}

    if not a_lower and not b_lower:
        return 0.0

    union = a_lower | b_lower
    intersection = a_lower & b_lower

    return len(intersection) / len(union) if union else 0.0


def analyze_overlap(
    candidate_triggers: list[str],
    existing_trigger_set: dict[str, list[str]],
    threshold: float = 0.30,
) -> list[OverlapReport]:
    """Analyze overlap between a candidate trigger set and multiple existing sets.

    Compares the candidate triggers against every known skill's trigger set
    from the repository index, generating per-skill overlap reports.

    Args:
        candidate_triggers: The new trigger terms to validate.
        existing_trigger_set: Dict mapping skill names to their trigger lists
            (from frontmatter metadata).
        threshold: Maximum acceptable Jaccard similarity (default 0.30).

    Returns:
        List of OverlapReport, one per related skill. Sorted by similarity descending.
    """
    reports: list[OverlapReport] = []

    for skill_name, existing_triggers in existing_trigger_set.items():
        sim = compute_jaccard_similarity(candidate_triggers, existing_triggers)

        a_lower = {t.strip().lower() for t in candidate_triggers}
        b_lower = {t.strip().lower() for t in existing_triggers}
        intersection = a_lower & b_lower
        overlapping = list(intersection)

        report = OverlapReport(
            jaccard_similarity=round(sim, 4),
            overlapping_terms=overlapping,
            unique_to_set_a=list(a_lower - b_lower),
            unique_to_set_b=list(b_lower - a_lower),
            exceeds_threshold=sim > threshold,
            threshold=threshold,
        )

        if sim > threshold:
            report.recommendation = (
                f"Trigger overlap {sim:.2%} with '{skill_name}' exceeds "
                f"threshold {threshold:.0%}. Replace these overlapping terms "
                f"with more specific alternatives: {', '.join(overlapping)}"
            )
        else:
            report.recommendation = (
                f"Overlap {sim:.2%} is within threshold. No action needed."
            )

        reports.append(report)

    # Sort by similarity descending for quick identification of worst offenders
    reports.sort(key=lambda r: r.jaccard_similarity, reverse=True)
    return reports


def suggest_replacements(
    overlapping_terms: list[str],
    domain_vocabulary: Optional[list[str]] = None,
) -> dict[str, str]:
    """Suggest more specific replacements for overlapping trigger terms.

    When two skills share a generic term (e.g., "monitoring" appears in both
    a monitoring-skill and a logging-skill), this function returns candidate
    replacements keyed by the original overlapping term.

    Args:
        overlapping_terms: Terms that appear in both trigger sets.
        domain_vocabulary: Optional list of specific terms from the skill's domain.

    Returns:
        Dict mapping each overlapping term to a suggested replacement phrase.
        Returns empty dict if no vocabulary provided to differentiate.
    """
    replacements: dict[str, str] = {}

    if not domain_vocabulary:
        return replacements

    for term in overlapping_terms:
        # Heuristic: find the most specific domain term that contains the overlap
        term_lower = term.lower()
        best_match = None
        best_len = 0

        for vocab_term in domain_vocabulary:
            if term_lower in vocab_term.lower() and len(vocab_term) > best_len:
                best_match = vocab_term
                best_len = len(vocab_term)

        if best_match:
            replacements[term] = best_match

    return replacements


# --- Example usage ---

if __name__ == "__main__":
    # Scenario: Designing triggers for a "Prometheus Monitoring" skill
    # and checking against an existing "Grafana Dashboard" skill
    candidate = [
        "prometheus", "promql", "kubernetes", "alertmanager",
        "how do I monitor systems", "help with monitoring",
        "time-series database", "metrics scraping",
    ]

    existing_index = {
        "grafana-dashboard": [
            "grafana", "dashboards", "visualization", "how do I create dashboards",
            "alerting rules", "monitoring", "kubernetes",
        ],
        "prometheus-operator": [
            "prometheus", "prometheus-operator", "promql", "kubernetes",
            "servicemonitor", "alertmanager", "metrics scraping",
        ],
    }

    reports = analyze_overlap(candidate, existing_index)

    for report in reports:
        print(f"\nComparing against: {report.recommendation}")

    # Identify problematic overlaps and suggest replacements
    for report in reports:
        if report.exceeds_threshold:
            replacements = suggest_replacements(
                report.overlapping_terms,
                domain_vocabulary=["prometheus alerting", "PromQL queries",
                                   "container metrics collection"],
            )
            print(f"\nOverlap with '{report.jaccard_similarity:.2%}':"
                  f" {', '.join(report.overlapping_terms)}")
            for orig, repl in replacements.items():
                print(f"  Replace '{orig}' → '{repl}'")
```

### Pattern 3: Calibration Heuristic Validator

Scores each trigger on a plausibility scale (0.0–1.0) answering the question "would a real person actually type this exact phrase when asking for help?" Uses keyword pattern checks, jargon detection, and specificity analysis.

```python
"""Calibration heuristic validator for trigger set quality assurance.

Scores individual triggers on plausibility using multiple signals:
- Is it a complete natural-language expression or a fragmented fragment?
- Does it contain internal identifiers (class names, file paths)?
- Is it overly generic and likely to cause false positives?
- Does it use the right grammar patterns ("how do I" vs invented phrasing)?
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TriggerScore:
    """Plausibility score for a single trigger term."""
    trigger: str
    plausibility_score: float  # 0.0 (reject) to 1.0 (strong candidate)
    is_technical_tier: bool
    reasoning: list[str] = field(default_factory=list)

    @property
    def passes(self) -> bool:
        return self.plausibility_score >= 0.50

    @property
    def is_suspicious(self) -> bool:
        return self.plausibility_score < 0.30


def score_trigger_plausibility(
    trigger: str,
    is_technical: bool = True,
    domain_terms: Optional[list[str]] = None,
) -> TriggerScore:
    """Score a single trigger term for plausibility and auto-loading risk.

    Evaluates the trigger against multiple quality signals: completeness of
    phrasing, jargon exposure, specificity, grammar correctness, and generic-ness.
    Technical-tier terms (exact product names) are held to different criteria
    than conversational phrases.

    Args:
        trigger: The candidate trigger term or phrase.
        is_technical: True if this is a technical-tier term (product name, acronym).
            Technical terms pass with lower phrasing requirements.
        domain_terms: Optional list of known domain terms for specificity checking.

    Returns:
        TriggerScore with plausibility_score, reasoning flags, and pass/fail verdict.
    """
    stripped = trigger.strip()
    score = 1.0
    reasons: list[str] = []

    if not stripped:
        return TriggerScore(
            trigger=trigger,
            plausibility_score=0.0,
            is_technical_tier=is_technical,
            reasoning=["Empty trigger term — must be rejected"],
        )

    # Signal 1: Check for internal identifiers (class names, file paths, API endpoints)
    internal_patterns = [
        r"[A-Z][a-z]+[A-Z]",   # CamelCase class name
        r"^src[/\\]",           # File path
        r"/api/",              # API endpoint
        r"^[a-z_]+\.[a-z]+$",  # package.module pattern
        r"\d{3,}",             # Long numeric sequences (likely IDs)
    ]

    for pattern in internal_patterns:
        if is_technical:
            break  # Technical terms may contain CamelCase or abbreviations
        if _matches_pattern(stripped, pattern):
            score -= 0.40
            reasons.append(f"Contains internal identifier pattern matching '{pattern}'")
            break

    # Signal 2: Check for overly generic single words (only penalize conversational tier)
    if not is_technical and " " not in stripped:
        short_words = {"code", "data", "risk", "pattern", "system", "design",
                       "deploy", "manage", "build", "fix", "monitor"}
        if stripped.lower() in short_words:
            score -= 0.50
            reasons.append(
                f"Single generic word '{stripped}' — will cause false-positive activation"
            )

    # Signal 3: Check grammar for conversational tier
    if not is_technical:
        valid_patterns = [
            r"^how do i\b",
            r"^help with\b",
            r"^what is\b",
            r"^best practices for\b",
        ]
        has_valid_pattern = any(_matches_pattern(stripped, p) for p in valid_patterns)
        if not has_valid_pattern and len(stripped.split()) > 2:
            # Multi-word phrase that doesn't match any known pattern
            score -= 0.30
            reasons.append(
                "Multi-word conversational phrase does not match standard grammar patterns"
            )

    # Signal 4: Check specificity for technical tier
    if is_technical and len(stripped.split()) > 1:
        # Technical multi-word terms should be well-known abbreviations or compound names
        known_compounds = {
            "prometheus operator", "kube state metrics", "alert manager",
            "service monitor", "cross exchange", "stop loss",
        }
        if stripped.lower() not in known_compounds:
            score -= 0.15
            reasons.append(
                f"Multi-word technical term '{stripped}' — verify it is a known domain compound"
            )

    # Signal 5: Length check
    token_count = len(stripped.split())
    if token_count == 1:
        score -= 0.10  # Single words are acceptable for technical tier only
    elif token_count > 6:
        score -= 0.20
        reasons.append(f"Trigger is too long ({token_count} tokens) — likely too specific")

    # Technical tier gets a bonus for being a recognized domain term
    if is_technical and domain_terms:
        for dt in domain_terms:
            if stripped.lower() == dt.lower():
                score += 0.10
                reasons.append("Matches known domain term exactly")
                break

    # Floor at 0.0, cap at 1.0
    final_score = max(0.0, min(1.0, round(score, 2)))

    return TriggerScore(
        trigger=trigger,
        plausibility_score=final_score,
        is_technical_tier=is_technical,
        reasoning=reasons if reasons else ["Passes all quality checks"],
    )


def validate_full_trigger_set(
    candidate_triggers: list[str],
    technical_terms: Optional[list[str]] = None,
    min_pass_rate: float = 0.75,
) -> dict:
    """Validate an entire trigger set against calibration heuristics.

    Scores every trigger individually, aggregates pass/fail rates, and
    returns actionable feedback for rejected terms.

    Args:
        candidate_triggers: Full list of candidate trigger terms (both tiers).
        technical_terms: List of known technical-tier terms for scoring reference.
        min_pass_rate: Minimum fraction of triggers that must pass to approve the set.

    Returns:
        Dict with 'scores' (list of TriggerScore), 'pass_count', 'fail_count',
        'pass_rate', 'approved' (boolean), and 'rejected_terms'.
    """
    scores: list[TriggerScore] = []

    for trigger in candidate_triggers:
        # Classify: if it contains "how do I" or "help with", it's conversational
        is_tech = not ("how do i" in trigger.lower()
                        or "help with" in trigger.lower()
                        or "what is" in trigger.lower()
                        or "best practices for" in trigger.lower())
        score = score_trigger_plausibility(trigger, is_technical=is_tech, domain_terms=technical_terms)
        scores.append(score)

    pass_count = sum(1 for s in scores if s.passes)
    fail_count = len(scores) - pass_count
    pass_rate = pass_count / len(scores) if scores else 0.0

    rejected = [s.trigger for s in scores if not s.passes]

    return {
        "scores": scores,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_rate": round(pass_rate, 3),
        "approved": pass_rate >= min_pass_rate and len(scores) >= 5,
        "rejected_terms": rejected,
    }


def _matches_pattern(text: str, regex_pattern: str) -> bool:
    """Simple regex match wrapper for pattern checking."""
    import re
    return bool(re.search(regex_pattern, text, re.IGNORECASE))


# --- Example usage ---

if __name__ == "__main__":
    # Testing a candidate trigger set with known good and bad terms
    candidates = [
        ("prometheus", True),           # Good technical term
        ("promql", True),               # Good acronym
        ("how do I monitor systems", False),  # Good conversational phrase
        ("help with alerting", False),          # Good conversational phrase
        ("code", True),                 # BAD: too generic even as technical
        ("DeploymentController", True),    # BAD: internal class name
        ("kubernetes monitoring and observability infrastructure at scale", False),  # BAD: too long
    ]

    technical_terms = ["prometheus", "promql", "alertmanager", "kube-state-metrics"]
    results = validate_full_trigger_set(
        [c[0] for c in candidates],
        technical_terms=technical_terms,
    )

    print(f"Trigger Set Validation")
    print(f"{'=' * 60}")
    print(f"Total: {len(results['scores'])} | Passed: {results['pass_count']} "
          f"| Failed: {results['fail_count']} | Rate: {results['pass_rate']:.0%}")
    print(f"Approved: {'YES' if results['approved'] else 'NO'}")
    print()

    for score in results["scores"]:
        status = "✓ PASS" if score.passes else "✗ FAIL"
        print(f"  [{status}] {score.plausibility_score:.2f} — {score.trigger}")
        if score.reasoning and not score.is_suspicious:
            for reason in score.reasoning[:1]:
                print(f"         {reason}")
        elif score.is_suspicious:
            for reason in score.reasoning:
                print(f"         ⚠ {reason}")

    if results["rejected_terms"]:
        print(f"\nRejected terms ({len(results['rejected_terms'])}):")
        for term in results["rejected_terms"]:
            print(f"  - {term}")
```

---

## TL;DR for Code Generation

- Use guard clauses to validate trigger count bounds (5–8) before processing — Early Exit
- Return new TriggerSet instances, never mutate the input domain_description — Atomic Predictability
- Apply Jaccard similarity floor at 0.0 to prevent negative scores from penalty over-application — Fail Fast
- Classify each candidate as technical or conversational using grammar pattern detection before scoring
- Compute overlap against ALL related skills, not just the first one found — completeness matters
- Validate YAML frontmatter output string format (comma-separated, no trailing comma) before writing

---

## Constraints

### MUST DO

- Generate both technical-tier and conversational-tier terms — never produce a trigger set with only one tier. The two-tier strategy is the core design principle.
- Enforce the 5–8 term cap on the final merged trigger set — exceeding 8 dilutes signal; having fewer than 5 risks missing natural query phrasings.
- Calculate Jaccard similarity against every related skill's triggers before finalizing — any overlap > 0.30 must be resolved by removing or replacing the overlapping terms.
- Run the plausibility calibration heuristic on every trigger — reject terms that are internal identifiers, single generic words, or don't match standard grammar patterns.
- Make related-skills reciprocal — if skill A lists B as related, B must list A. Verify reciprocity before committing.
- Write triggers as a comma-separated string in frontmatter `metadata.triggers`, not as a YAML array. The auto-loader splits on commas.
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing the extraction logic: parse domain input at boundaries, fail fast on invalid tier counts, and return new data structures without mutating the original domain description.

### MUST NOT DO

- Include single generic words like `code`, `data`, `risk`, `pattern`, `system`, or `design` — these will fire on nearly any conversation and corrupt the router index for every other skill.
- Use internal class names, file paths, API endpoints, or proprietary identifiers as triggers — they are invisible to users who type natural queries.
- Create trigger phrases that don't follow standard grammar patterns — "how do I", "help with", "what is" are the four accepted conversational templates. Invented phrasing like "trigger engineering for ai agents" will not match user searches.
- Set overlap threshold higher than 0.30 — this allows too much ambiguity between related skills and causes false-positive activations where one skill masks another.
- Commit a trigger set with fewer than 3 technical terms or fewer than 2 conversational phrases — the minimum tier counts ensure both expert and non-expert discovery paths exist.
- Use hyphenated and non-hyphenated duplicates (e.g., both `stop loss` and `stop-loss`) in the same set unless both are genuinely common in your domain. The deduplication logic should catch these, but manual review prevents missed cases.

---

## Output Template

When this skill is applied, produce:

1. **Candidate Trigger Set** — List all 5–8 triggers with tier label (T = technical, C = conversational) and plausibility score
2. **Overlap Analysis Report** — Jaccard similarity scores against every related skill's triggers, with specific recommendations for terms to replace if overlap exceeds threshold
3. **Calibration Summary** — Pass/fail count per trigger with rejection reasons for any term scoring below 0.50
4. **Frontmatter Snippet** — The complete `metadata.triggers` YAML line ready to paste into the SKILL.md frontmatter
5. **Reciprocal Link Verification** — Confirmation that all related-skills entries point back to this skill

```
Trigger Set for: <skill-name>
─────────────────────────────
  [T] prometheus        (0.95) ✓
  [T] promql            (0.92) ✓
  [T] alertmanager      (0.88) ✓
  [C] how do I monitor systems  (0.87) ✓
  [C] help with alerting        (0.84) ✓
  [C] what is Prometheus        (0.79) ✓

Overlap: prometheus-skill (Jaccard=0.12) — OK
Overlap: grafana-skill (Jaccard=0.28) — OK
No replacements needed.

Frontmatter line:
  triggers: prometheus, promql, alertmanager, how do I monitor systems, help with alerting, what is Prometheus
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-skill-ecosystem-design` | Designs the overall skill catalog architecture — determines which skills exist, their atomic boundaries, and reciprocal relationships. Trigger engineering populates each individual skill's discoverability layer on top of this architecture. |
| `prompt-engineering-patterns` | Crafts high-quality system prompts and agent instructions with chain-of-thought, few-shot, and structured output patterns. Trigger engineering handles the discovery layer (auto-loading keywords); prompt engineering handles the execution layer (what the model does once loaded). |

---

## Live References

- [Two-Tier Trigger Strategy — AGENTS.md](https://github.com/anthropics/agent-skill-routing-system/blob/main/AGENTS.md#trigger-engineering-for-conversational-discovery)
- [Trigger Calibration Heuristic — AGENTS.md](https://github.com/anthropics/agent-skill-routing-system/blob/main/SKILL_FORMAT_SPEC.md#trigger-calibration-heuristic)
- [Hybrid Scoring Pipeline — Router Documentation](https://github.com/anthropics/agent-skill-routing-system/blob/main/agent-skill-routing-system/README.md)
- [Python dataclasses — Standard Library Reference](https://docs.python.org/3/library/dataclasses.html)
- [Jaccard Similarity — Wikipedia](https://en.wikipedia.org/wiki/Jaccard_index)
- [Regular Expressions for Pattern Matching — Python re Module](https://docs.python.org/3/library/re.html)
