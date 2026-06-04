---
name: query-intent-classifier
description: Classifies incoming natural language queries into intent archetypes (tactical, strategic, diagnostic, orchestration, educational, enforcement, generation) using keyword patterns, structural signals, and heuristics for accurate routing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: intent classification, query archetype, tactical query, strategic planning, diagnostic debugging, orchestration workflow, educational explanation, how do i classify a query
  archetypes:
    - orchestration
    - diagnostic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types: [guidance, examples, do-dont, diagrams]
  related-skills: intelligent-skill-selection, query-feature-extraction, confidence-based-selector
---

# Query Intent Classifier

Classifies incoming natural language queries into one of seven intent archetypes (tactical, strategic, diagnostic, orchestration, educational, enforcement, generation) using keyword patterns, structural signals, and heuristic scoring. This skill makes the model act as a query routing analyst that transforms ambiguous user requests into machine-interpretable intent classifications with confidence scores, enabling downstream skill routers to select the best-matching capability.

## TL;DR Checklist

- [ ] Run guard clause on empty, whitespace-only, or overly-short input before any classification
- [ ] Extract action verbs and question patterns (imperative vs interrogative mood) from the raw query
- [ ] Score the query against all 7 archetype signal definitions using keyword, structural, and modifier heuristics
- [ ] Apply specificity boost for domain-specific queries; apply anti-trigger penalty if brainstorming/vague ideation terms are present
- [ ] Resolve mixed-intent conflicts: pick the dominant archetype or return a ranked list of up to 3 candidates
- [ ] Enforce minimum confidence threshold (≥ 0.50); below threshold → request clarification with candidate intents
- [ ] Assemble the JSON output with archetype, confidence, matched signals, and routing recommendation

---

## When to Use

Use this skill when:

- A raw natural language query needs an intent label before routing to a downstream skill or agent
- The same query could be interpreted as multiple archetypes (e.g., "how do I fix my deployment" is both diagnostic and tactical) and you need disambiguation
- Building the intent classification layer of a skill router pipeline — it runs first, then feature extraction feeds into scoring
- Evaluating whether a user's request requires code generation, explanation, debugging help, or architectural planning
- Monitoring agent routing decisions to audit which archetypes are most common and identify gaps in skill coverage

---

## When NOT to Use

Avoid this skill for:

- **Raw text classification without routing intent** — If you only need sentiment analysis or topic labeling, use a dedicated NLP classifier instead of an intent archetype system
- **Already-classified queries** — If the input already has an explicit `intent` field from a prior step (e.g., from `query-feature-extraction`), do not re-run classification; pass through the existing label
- **Single-intent domains** — If your system only ever receives one type of query (e.g., a pure troubleshooting bot), skip the full 7-archetype matrix and use a simpler binary classifier
- **Creative brainstorming sessions** — This skill is designed for structured queries. Brainstorming and vague ideation fall under anti-triggers and should be routed to generative or educational skills instead

---

## Orchestration Flow

```
Raw Natural Language Query
            ↓
┌───────────────────────┐
│ 1. Guard & Pre-Flight │ ── empty/short input ──► Return "clarification required"
└───────────┬───────────┘
            ↓ valid input
┌───────────────────────┐
│ 2. Tokenize & Detect  │ ── extract verbs, question patterns,
│    Structural Signals │   mood (imperative/interrogative)
└───────────┬───────────┘
            ↓ tokens + signals
┌───────────────────────┐
│ 3. Score All 7        │ ── keyword overlap (+0.15 each),
│    Archetype Signals  │   structural bonus (+0.25), modifier (-0.10 per anti-trigger)
└───────────┬───────────┘
            ↓ raw scores for all archetypes
┌───────────────────────┐
│ 4. Normalize &        │ ── softmax normalization, pick top-1,
│    Resolve Conflicts  │   list top-3 if mixed intent detected
└───────────┬───────────┘
            ↓ classified intent + confidence
┌───────────────────────┐
│ 5. Apply Confidence   │ ── threshold ≥ 0.50 or request
│    Threshold Gate     │   clarification with candidates
└───────────┬───────────┘
            ↓ accepted classification
┌───────────────────────┐
│ 6. Emit JSON Output   │ ── archetype, confidence, signals,
│    with Routing Info  │   recommendation, disambiguation list
└───────────────────────┘
```

## Core Workflow

1. **Pre-Flight Guard** — Check the raw input for emptiness (zero characters), whitespace-only content, or queries shorter than 3 words. Return an immediate classification error with a structured "clarification_required" status. Also check for anti-trigger terms (`brainstorming`, `vague ideation`) and flag them early to prevent wasted scoring. **Checkpoint:** Input must be at least 3 non-whitespace tokens. If it is shorter, emit `{status: "clarification_required", reason: "input_too_short"}` immediately.

2. **Tokenize & Detect Structural Signals** — Convert the query to lowercase and extract: action verbs (e.g., `implement`, `deploy`, `debug`, `design`), question markers (`how do I`, `what is`, `why does`, `can you`), imperative markers (`fix this`, `set up`, `create a`), and scope indicators (`production`, `all services`, `the auth module`). Classify the query mood: imperative (command) vs interrogative (question). **Checkpoint:** At least one action verb or question marker must be identified. If neither is present, flag as "unknown_intents" and request clarification.

3. **Score All Seven Archetypes** — For each archetype (tactical, strategic, diagnostic, orchestration, educational, enforcement, generation), compute a raw signal score by summing: keyword overlap (+0.15 per matching trigger word or pattern from the archetype table below), structural bonus (+0.25 if imperative mood with concrete action verb + specific noun), modifier penalty (-0.10 for each anti-trigger term found). Do not normalize yet — keep raw scores to preserve relative ranking. **Checkpoint:** Every archetype must have a non-negative score after penalties are applied (floor at 0.00).

4. **Normalize, Resolve Mixed Intent, and Pick Winner** — Apply softmax normalization across all 7 archetypes so scores sum to 1.0. Identify whether the query has mixed intent: if the top two candidates share within 15 percentage points of each other (e.g., tactical at 0.38 and diagnostic at 0.26), label it as mixed and include both in the output. Otherwise, pick the single highest-scoring archetype as the primary intent. **Checkpoint:** The winner's normalized score must be ≥ 0.50 or the query enters clarification mode listing the top 3 candidates with scores.

5. **Apply Confidence Threshold Gate and Emit Output** — If the winning confidence is below 0.50, set `requires_clarification: true` and populate the `candidates` array with the top 3 intents and their normalized scores. If above threshold, assemble the final JSON output with primary archetype, confidence score, matched signal types, routing recommendation (which downstream skill or category to forward to), and a disambiguation note if mixed intent was detected. **Checkpoint:** The emitted JSON must conform exactly to the Output Template schema before being returned.

---

## Archetype Scoring Heuristics

For each of the seven intent archetypes, this section defines the signal types, trigger word patterns, and structural cues used for scoring.

### 1. Tactical

Specific, concrete implementation or debugging tasks with actionable outcomes.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `fix`, `implement`, `build`, `add`, `configure`, `set up`, `deploy`, `write` | "how do I implement a stop loss in my trading bot" → tactical (0.42) |
| Structural | Imperative mood + specific noun phrase | "fix the authentication bug" → tactical (0.55) |
| Modifier | Short, direct phrasing; few nested clauses | "deploy service to prod" → tactical (0.38) |

### 2. Strategic

Design, architecture, or planning decisions with long-term implications.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `design`, `architect`, `plan`, `evaluate`, `compare`, `roadmap`, `strategy` | "what is the best event bus architecture for microservices" → strategic (0.51) |
| Structural | Interrogative mood with "how do I architect" or "what should we design" | "should we use Kafka or RabbitMQ for our platform" → strategic (0.48) |
| Modifier | Phrases like "long-term", "scalable", "future-proof", "at scale" | "design a scalable event bus for 10M events/day" → strategic (0.56) |

### 3. Diagnostic

Root cause analysis, debugging, or troubleshooting issues.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `debug`, `why does`, `error`, `crash`, `fail`, `broken`, `troubleshoot` | "my pod keeps crashing with OOM errors" → diagnostic (0.61) |
| Structural | Interrogative mood starting with "why" or "how come"; presence of error codes | "why is my deployment failing at step 3" → diagnostic (0.54) |
| Modifier | Words like `broken`, `not working`, `regression`, `issue`, `root cause` | "the API started returning 500 after the last deploy" → diagnostic (0.58) |

### 4. Orchestration

Multi-step workflows, automation, or coordination across systems/components.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `automate`, `pipeline`, `workflow`, `coordinate`, `integrate`, `deploy and test` | "how do I set up CI/CD for my Kubernetes cluster" → orchestration (0.49) |
| Structural | Multiple action verbs joined by conjunctions; mentions of "then", "after that", "also" | "set up monitoring then alerting then dashboards" → orchestration (0.53) |
| Modifier | Words like `end-to-end`, `automated`, `scheduled`, `recurring` | "build an end-to-end deployment pipeline" → orchestration (0.57) |

### 5. Educational

Learning, explanation, or tutorial requests.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `explain`, `what is`, `how does`, `tutorial`, `learn`, `introduction to`, `basics of` | "explain how Kubernetes pods work" → educational (0.63) |
| Structural | Interrogative mood with "what is" or "how do I learn" | "what is the difference between DFS and BFS" → educational (0.59) |
| Modifier | Words like `beginner`, `fundamentals`, `concept of`, `understand` | "help me understand GraphQL vs REST APIs" → educational (0.61) |

### 6. Enforcement

Compliance, security audits, policy checks, or regulatory concerns.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `audit`, `compliance`, `security check`, `policy`, `regulation`, `GDPR`, `SOC2` | "run a security audit on our container images" → enforcement (0.52) |
| Structural | Imperative mood with audit/compliance verbs; mentions of standards | "check if our API follows OWASP guidelines" → enforcement (0.56) |
| Modifier | Words like `must comply`, `required by`, "policy violation", "access control" | "verify all endpoints have rate limiting per company policy" → enforcement (0.48) |

### 7. Generation

Code scaffolding, boilerplate generation, or artifact creation.

| Signal Type | Trigger Words / Patterns | Example Classification |
|-------------|-------------------------|----------------------|
| Keyword | `generate`, `scaffold`, `create a new`, `boilerplate`, `starter`, `template` | "generate a REST API scaffold with authentication" → generation (0.58) |
| Structural | Imperative mood + noun phrase describing an artifact to create | "scaffold a Next.js project with TypeScript and Tailwind" → generation (0.62) |
| Modifier | Words like `boilerplate`, `starter kit`, `template project`, `new service` | "create a boilerplate for microservice architecture" → generation (0.54) |

---

## Mixed-Intent Resolution

When a query scores high on multiple archetypes, apply these resolution rules:

| Scenario | Resolution Rule | Example Output |
|----------|----------------|---------------|
| Top two within 15pp | Label as "mixed"; include both candidates in ranked list; recommend primary for routing | Primary: tactical (0.38), Secondary: diagnostic (0.26) → route to tactical, note diagnostic context |
| All scores below 0.30 | Classification is unreliable; enter clarification mode with all scored candidates | "Low confidence. Did you mean: educational (0.22), generation (0.18), tactical (0.15)?" |
| Diagnostic + Tactical overlap | Prefer diagnostic when error codes, crash logs, or "why/broken" signals are present; prefer tactical for "how do I implement" phrasing | "fix my auth module after it started crashing" → diagnostic wins (error context) |
| Orchestration + Generation overlap | Prefer orchestration when multiple steps/workflows are mentioned; prefer generation when a single artifact is requested | "scaffold a service and set up CI/CD" → orchestration wins (multi-step workflow) |
| Educational + Diagnostic overlap | Prefer educational for "explain why X happens"; prefer diagnostic for "my system is doing Y incorrectly" | "why does my deployment keep failing with OOM" → diagnostic (active failure) vs "explain OOM in Kubernetes" → educational |

---

## Implementation Patterns

### Pattern 1: IntentClassifier — Archetype Definitions, Scoring, and Classification

A complete intent classifier that defines all seven archetype signal patterns, scores raw queries against them using keyword overlap + structural bonuses + anti-trigger penalties, normalizes with softmax, and applies the confidence threshold gate.

```python
"""Query intent classification for skill routing.

Classifies natural language queries into seven intent archetypes using
keyword pattern matching, structural signal detection, and heuristic
scoring. Normalizes scores via softmax and enforces a confidence gate.
"""

from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class IntentClassification:
    """Result of classifying a single query into an intent archetype."""
    primary_archetype: str
    confidence: float
    requires_clarification: bool = False
    candidates: list[dict] = field(default_factory=list)
    mixed_intent: bool = False
    matched_signals: list[str] = field(default_factory=list)
    routing_recommendation: str = ""


@dataclass
class ArchetypeSignals:
    """Signal definitions for a single intent archetype."""
    name: str
    keywords: list[str] = field(default_factory=list)
    structural_patterns: list[tuple[str, float]] = field(default_factory=list)
    modifier_bonus: float = 0.0


# Complete signal definitions for all seven intent archetypes.
ARCHETYPES: dict[str, ArchetypeSignals] = {
    "tactical": ArchetypeSignals(
        name="tactical",
        keywords=[
            "fix", "implement", "build", "add", "configure", "set up", "deploy",
            "create", "write code", "modify", "patch", "update", "migrate",
            "optimize", "refactor", "clean up", "wire up",
        ],
        structural_patterns=[("imperative", 0.25)],
        modifier_bonus=0.0,
    ),
    "strategic": ArchetypeSignals(
        name="strategic",
        keywords=[
            "design", "architect", "plan", "evaluate", "compare", "roadmap",
            "strategy", "choose between", "trade off", "long-term", "scalable",
            "architecture", "framework selection", "technology decision",
        ],
        structural_patterns=[("interrogative_long_form", 0.25)],
        modifier_bonus=0.10,
    ),
    "diagnostic": ArchetypeSignals(
        name="diagnostic",
        keywords=[
            "debug", "why does", "error", "crash", "fail", "broken",
            "troubleshoot", "root cause", "issue", "regression", "not working",
            "500", "timeout", "OOM", "panic", "stack trace", "exception",
        ],
        structural_patterns=[("why_question", 0.25), ("error_code_present", 0.15)],
        modifier_bonus=0.0,
    ),
    "orchestration": ArchetypeSignals(
        name="orchestration",
        keywords=[
            "automate", "pipeline", "workflow", "coordinate", "integrate",
            "deploy and test", "CI/CD", "end-to-end", "scheduled job",
            "automation", "recurring task", "multi-step", "then also",
        ],
        structural_patterns=[("multiple_actions", 0.25)],
        modifier_bonus=0.10,
    ),
    "educational": ArchetypeSignals(
        name="educational",
        keywords=[
            "explain", "what is", "how does", "tutorial", "learn",
            "introduction to", "basics of", "concept of", "difference between",
            "teach me", "help me understand", "primer", "overview of",
        ],
        structural_patterns=[("what_is_question", 0.25), ("how_does_question", 0.20)],
        modifier_bonus=0.0,
    ),
    "enforcement": ArchetypeSignals(
        name="enforcement",
        keywords=[
            "audit", "compliance", "security check", "policy", "regulation",
            "GDPR", "SOC2", "HIPAA", "access control", "rate limit policy",
            "security review", "vulnerability scan", "penetration test",
        ],
        structural_patterns=[("imperative_audit", 0.25)],
        modifier_bonus=0.10,
    ),
    "generation": ArchetypeSignals(
        name="generation",
        keywords=[
            "generate", "scaffold", "create a new", "boilerplate", "starter",
            "template", "prototype", "MVP", "example project", "code generation",
        ],
        structural_patterns=[("imperative_artifact", 0.25)],
        modifier_bonus=0.10,
    ),
}

ANTI_TRIGGERS: list[str] = ["brainstorming", "vague ideation"]


def tokenize_and_mood(input_text: str) -> dict:
    """Tokenize input and detect query mood (imperative vs interrogative).

    Args:
        input_text: Raw natural language query.

    Returns:
        Dict with tokens list, action verbs found, question markers found,
        and detected mood ("imperative", "interrogative", or "declarative").
    """
    text = input_text.lower()
    tokens = text.split()
    verbs = {"fix", "implement", "build", "add", "configure", "set up",
             "deploy", "create", "write", "modify", "patch", "design",
             "debug", "explain", "generate", "automate", "audit"}
    questions = ["how do i", "what is", "why does", "can you", "could you",
                 "is there a way", "how to"]

    mood = "declarative"
    for q_pattern in questions:
        if q_pattern in text:
            mood = "interrogative"
            break

    found_verbs = [t.strip(".,!?") for t in tokens if t.strip(".,!?") in verbs]

    return {
        "tokens": tokens,
        "action_verbs": found_verbs,
        "mood": mood,
        "is_question": mood == "interrogative",
    }


def score_archetype(
    query_mood: dict,
    archetype: ArchetypeSignals,
    anti_trigger_count: int,
) -> float:
    """Score a single query against one archetype's signal definitions.

    Combines keyword overlap (+0.15 per hit), structural pattern bonus
    (+0.25 for matching mood-based patterns), and anti-trigger penalty.

    Args:
        query_mood: Tokenization result from tokenize_and_mood().
        archetype: The ArchetypeSignals definition to score against.
        anti_trigger_count: Number of anti-trigger terms found in the query.

    Returns:
        Raw signal score (floored at 0.0). Anti-trigger penalty applied.
    """
    text = " ".join(query_mood["tokens"])
    score = 0.0

    # Signal 1: Keyword overlap (+0.15 per matching keyword)
    for kw in archetype.keywords:
        if kw.lower() in text:
            score += 0.15

    # Signal 2: Structural pattern bonus
    mood = query_mood["mood"]
    for pattern, bonus in archetype.structural_patterns:
        if pattern == "imperative" and mood == "imperative" and len(query_mood["action_verbs"]) > 0:
            score += bonus
        elif pattern == "interrogative_long_form" and mood == "interrogative":
            score += bonus
        elif pattern in ("why_question",) and "why" in text[:20]:
            score += bonus
        elif pattern in ("what_is_question",) and ("what is" in text or "what's" in text):
            score += bonus
        elif pattern in ("how_does_question",) and "how does" in text:
            score += bonus
        elif pattern in ("error_code_present",) and any(
            c.isdigit() for c in text if text.index(c) < 50 and any(d in text[text.index(c):] for d in ["500", "404", "OOM", "OOMKilled"])
        ):
            score += bonus
        elif pattern == "multiple_actions" and (" and " in text or "; " in text):
            score += bonus
        elif pattern == "imperative_audit" and mood == "imperative" and any(
            w in text for w in ["audit", "check", "verify", "review"]
        ):
            score += bonus
        elif pattern == "imperative_artifact" and mood == "imperative" and len(query_mood["action_verbs"]) > 0:
            score += bonus

    # Apply anti-trigger penalty (-0.15 per match, max -0.45)
    penalty = min(anti_trigger_count * 0.15, 0.45)
    score -= penalty

    return max(score, 0.0)


def softmax(scores: dict[str, float]) -> dict[str, float]:
    """Apply softmax normalization to a dict of archetype → raw scores.

    Args:
        scores: Dict mapping archetype names to raw signal scores.

    Returns:
        Normalized probabilities summing to 1.0.
    """
    if not scores:
        return {}

    max_score = max(scores.values())
    exp_scores = {k: math.exp(v - max_score) for k, v in scores.items()}
    total = sum(exp_scores.values())
    if total == 0:
        # Uniform distribution as fallback
        n = len(scores)
        return {k: 1.0 / n for k in scores}

    return {k: v / total for k, v in exp_scores.items()}


def classify(input_text: str, confidence_threshold: float = 0.50) -> IntentClassification:
    """Classify a raw natural language query into an intent archetype.

    Applies pre-flight validation, tokenization, multi-archetype scoring,
    softmax normalization, mixed-intent detection, and confidence gating.

    Args:
        input_text: The raw natural language query to classify.
        confidence_threshold: Minimum normalized confidence to accept classification.

    Returns:
        IntentClassification with primary archetype, confidence, candidates,
        and routing recommendation. Sets requires_clarification=True if below threshold.

    Raises:
        ValueError: If input is empty, whitespace-only, or too short (< 3 tokens).
    """
    # Pre-flight guard
    stripped = input_text.strip()
    if not stripped:
        raise ValueError("Input text is empty — cannot classify a blank query.")

    tokens = stripped.split()
    if len(tokens) < 3:
        raise ValueError(
            f"Input too short ({len(tokens)} tokens, minimum 3). "
            "Cannot determine intent from such brief input."
        )

    # Tokenize and detect mood
    query_mood = tokenize_and_mood(stripped)

    # Count anti-triggers
    text_lower = stripped.lower()
    anti_trigger_count = sum(1 for at in ANTI_TRIGGERS if at in text_lower)

    # Score all archetypes
    raw_scores: dict[str, float] = {}
    matched_signals: list[str] = []

    for name, archetype in ARCHETYPES.items():
        score = score_archetype(query_mood, archetype, anti_trigger_count)
        if score > 0:
            signal_labels = []
            for kw in archetype.keywords:
                if kw.lower() in text_lower:
                    signal_labels.append(f"keyword:{kw}")
                    break
            for pattern, _ in archetype.structural_patterns:
                matched_signals.append(f"structural:{pattern}")
            raw_scores[name] = score
            matched_signals.extend(signal_labels[:2])

    # Normalize via softmax
    normalized = softmax(raw_scores)

    if not normalized:
        return IntentClassification(
            primary_archetype="unknown",
            confidence=0.0,
            requires_clarification=True,
            routing_recommendation="request_clarification",
        )

    # Find winner and detect mixed intent
    sorted_results = sorted(normalized.items(), key=lambda x: x[1], reverse=True)
    primary_name, primary_conf = sorted_results[0]
    secondary_name, secondary_conf = sorted_results[1] if len(sorted_results) > 1 else (None, 0.0)

    # Mixed intent: top two within 15 percentage points
    mixed_intent = (primary_conf - secondary_conf) < 0.15 if secondary_conf else False

    # Build candidates list (top 3)
    candidates = [
        {"archetype": name, "confidence": round(conf, 3)}
        for name, conf in sorted_results[:3]
    ]

    # Confidence threshold gate
    requires_clarification = primary_conf < confidence_threshold
    routing_rec = (
        f"route_to_{primary_name}" if not requires_clarification else "request_clarification"
    )

    return IntentClassification(
        primary_archetype=primary_name,
        confidence=round(primary_conf, 3),
        requires_clarification=requires_clarification,
        candidates=candidates,
        mixed_intent=mixed_intent and not requires_clarification,
        matched_signals=list(set(matched_signals))[:5],
        routing_recommendation=routing_rec,
    )


# --- Example usage ---

if __name__ == "__main__":
    test_queries = [
        "How do I implement a stop-loss in my trading bot?",
        "Why does my Kubernetes pod keep crashing with OOMKilled?",
        "What is the best event bus architecture for microservices at scale?",
        "Set up CI/CD pipeline for our service then add monitoring and alerting",
        "Explain how Docker container networking works",
        "Run a security audit on our production API endpoints",
        "Generate a REST API scaffold with authentication and rate limiting",
    ]

    print("=" * 70)
    for i, query in enumerate(test_queries, 1):
        try:
            result = classify(query)
            status = "clarification" if result.requires_clarification else "classified"
            mixed_note = " [MIXED]" if result.mixed_intent else ""
            print(f"\n{i}. [{status}]{mixed_note}")
            print(f"   Query: {query}")
            print(f"   Primary: {result.primary_archetype} ({result.confidence:.3f})")
            if result.candidates:
                for c in result.candidates[:3]:
                    bar = "█" * int(c["confidence"] * 30)
                    print(f"     - {c['archetype']:15s} {c['confidence']:.3f} {bar}")
        except ValueError as e:
            print(f"\n{i}. ERROR: {e}")
```

### Pattern 2: Batch Classification with Routing Instructions

Processes multiple queries at once and maps each archetype to its routing instruction for downstream dispatch.

```python
"""Batch intent classification for skill routing pipelines.

Provides batch processing of queries with archetype-to-routing mappings,
enabling bulk classification of incoming user requests for distributed
skill dispatch in multi-agent orchestration systems.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BatchResult:
    """Aggregated result from classifying multiple queries."""
    total_processed: int
    classified: int
    clarification_required: int
    results: list[IntentClassification] = field(default_factory=list)


# Mapping of intent archetypes to routing destinations in the skill router.
ARCHETYPE_ROUTING: dict[str, str] = {
    "tactical": "routing:tactical-impl",
    "strategic": "routing:strategic-planning",
    "diagnostic": "routing:diagnostic-debug",
    "orchestration": "routing:workflow-automation",
    "educational": "routing:explain-teach",
    "enforcement": "routing:security-audit",
    "generation": "routing:code-generation",
}

ARCHETYPE_DESCRIPTIONS: dict[str, str] = {
    "tactical": "Specific implementation or debugging task with actionable outcome",
    "strategic": "Design/architecture/planning with long-term implications",
    "diagnostic": "Root cause analysis or troubleshooting of failures",
    "orchestration": "Multi-step workflow or automation coordination",
    "educational": "Learning request, explanation, or tutorial",
    "enforcement": "Compliance audit, security check, or policy enforcement",
    "generation": "Code scaffolding, boilerplate, or artifact creation",
}


def classify_batch(
    queries: list[str],
    confidence_threshold: float = 0.50,
) -> BatchResult:
    """Classify a batch of natural language queries into intent archetypes.

    Processes each query through the classifier and aggregates results
    into a BatchResult with summary statistics and per-query classifications.

    Args:
        queries: List of raw natural language query strings to classify.
        confidence_threshold: Minimum confidence for accepting classification.

    Returns:
        BatchResult with total processed count, clarification counts,
        and full classification results for each query.

    Raises:
        ValueError: If any individual query fails pre-flight validation.
    """
    results: list[IntentClassification] = []
    clarification_count = 0

    for query in queries:
        try:
            result = classify(query, confidence_threshold)
            if result.requires_clarification:
                clarification_count += 1
            results.append(result)
        except ValueError as e:
            # Count pre-flight failures as clarification-required
            clarification_count += 1
            results.append(IntentClassification(
                primary_archetype="error",
                confidence=0.0,
                requires_clarification=True,
                candidates=[{"archetype": "pre_flight_failed", "confidence": 1.0}],
                routing_recommendation="request_clarification",
            ))

    return BatchResult(
        total_processed=len(queries),
        classified=sum(1 for r in results if not r.requires_clarification),
        clarification_required=clarification_count,
        results=results,
    )


def get_routing_instruction(classification: IntentClassification) -> dict:
    """Convert an intent classification into a routing instruction dictionary.

    Maps the primary archetype to its routing destination and includes
    confidence score, mixed-intent flag, and description for logging.

    Args:
        classification: An IntentClassification from classify().

    Returns:
        Dict with `destination`, `archetype`, `confidence`, `mixed_intent`,
        `description`, and `clarification_required` keys for dispatch.
    """
    primary = classification.primary_archetype
    description = ARCHETYPE_DESCRIPTIONS.get(primary, "Unknown intent")

    return {
        "destination": ARCHETYPE_ROUTING.get(primary, "routing:default"),
        "archetype": primary,
        "confidence": classification.confidence,
        "mixed_intent": classification.mixed_intent,
        "description": description,
        "clarification_required": classification.requires_clarification,
        "candidates": classification.candidates[:3],
    }


# --- Example usage ---

if __name__ == "__main__":
    batch_queries = [
        "How do I implement a stop-loss in my trading bot?",
        "Why does my Kubernetes pod keep crashing with OOMKilled?",
        "Set up CI/CD pipeline for our service then add monitoring",
    ]

    batch_result = classify_batch(batch_queries)
    print(f"Processed {batch_result.total_processed} queries")
    print(f"Classified: {batch_result.classified}")
    print(f"Clarification needed: {batch_result.clarification_required}\n")

    for i, result in enumerate(batch_result.results, 1):
        routing = get_routing_instruction(result)
        print(f"{i}. [{routing['destination']}] {routing['archetype']} "
              f"(confidence={routing['confidence']})")
```

---

## Constraints

### MUST DO

- Always validate input at the boundary before any scoring — empty, whitespace-only, or queries shorter than 3 words must be rejected with a structured error (Early Exit)
- Score all seven archetypes for every valid query — never skip or short-circuit based on partial keyword matches
- Apply anti-trigger penalties (-0.15 per match, max -0.45) to prevent generic brainstorming queries from being miscategorized as high-confidence tactical intents
- Enforce the confidence threshold of ≥ 0.50 — never accept a classification below this without listing disambiguation candidates with their scores
- Detect mixed intent when top-two archetype scores fall within 15 percentage points — always include both in the output's candidate list and note the mixed status
- Use softmax normalization (not simple min-max or linear scaling) to ensure all seven archetype scores sum to exactly 1.0 for consistent ranking across queries
- Always set `routing_recommendation` based on the primary archetype using the `ARCHETYPE_ROUTING` mapping — never leave this field empty in output

### MUST NOT DO

- Guess an intent when confidence is below the threshold — always enter clarification mode with candidate intents and scores listed by descending rank
- Use a single keyword match as sufficient for classification — minimum two signal types (keyword + structural, or two keywords) must align before accepting
- Merge mixed-intent candidates into the primary archetype label — keep them separate in the `candidates` array so downstream routers can make their own decision
- Apply anti-trigger penalties to queries that do not contain any of the defined anti-trigger terms (`brainstorming`, `vague ideation`) — only penalize when matches exist
- Hardcode archetype keyword lists inline outside the `ARCHETYPES` dataclass definitions — they must be inspectable and extensible for future expansion
- Skip mixed-intent detection — if two archetypes are within 15pp, the output must always include a `mixed_intent: true` flag regardless of which is primary

---

## Output Template

When this skill is applied, the model produces a structured classification with the following JSON schema:

```json
{
  "status": "classified",
  "primary_archetype": "tactical",
  "confidence": 0.423,
  "requires_clarification": false,
  "mixed_intent": true,
  "matched_signals": [
    "keyword:implement",
    "structural:imperative"
  ],
  "candidates": [
    {"archetype": "tactical", "confidence": 0.423},
    {"archetype": "diagnostic", "confidence": 0.281},
    {"archetype": "educational", "confidence": 0.157}
  ],
  "routing_recommendation": "route_to_tactical_impl"
}
```

| Field | Type | When Present | Description |
|-------|------|-------------|-------------|
| `status` | string | Always | `"classified"` or `"clarification_required"` |
| `primary_archetype` | string | Always | One of: tactical, strategic, diagnostic, orchestration, educational, enforcement, generation |
| `confidence` | float | Always | Normalized probability (0.0–1.0) for the primary archetype |
| `requires_clarification` | boolean | Always | True when confidence < 0.50 or pre-flight fails |
| `mixed_intent` | boolean | Always | True when top-two candidates are within 15 percentage points |
| `matched_signals` | string[] | When classification succeeds | List of signal types that drove the score (e.g., `keyword:deploy`, `structural:imperative`) |
| `candidates` | object[] | Always | Up to 3 ranked candidate intents with normalized confidence scores |
| `routing_recommendation` | string | Always | Destination routing key for downstream dispatch |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `intelligent-skill-selection` | Selects the best individual skill after intent classification determines the routing domain |
| `query-feature-extraction` | Preprocessing step that extracts structured signals (verbs, domains, complexity) before this classifier runs |
| `confidence-based-selector` | Post-classification confidence gating and fallback strategy when archetype selection is uncertain |

---

## Live References

- [Query Archetype Routing System — agent-skill-router GitHub](https://github.com/anthropics/agent-skill-routing-system/blob/main/README.md)
- [Hybrid Scoring Pipeline Architecture — agent-skill-router docs](https://github.com/anthropics/agent-skill-routing-system/blob/main/docs/routing-pipeline.md)
- [Python dataclasses — Standard Library Documentation](https://docs.python.org/3/library/dataclasses.html)
- [Softmax Function and Numerical Stability — Stanford CS231n Notes](https://cs231n.github.io/numerical-optimization/)
- [Intent Classification for Conversational AI — Stanford CS224N](https://web.stanford.edu/class/cs224n/)
- [Regular Expressions for Text Pattern Matching — Python re Module Docs](https://docs.python.org/3/library/re.html)
