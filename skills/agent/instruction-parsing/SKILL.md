---




name: instruction-parsing
description: Parses natural language instructions to extract structured intent, constraints, and parameters for reliable skill routing in AI agent systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - vague ideation
  - brainstorming
  - generic planning
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  triggers: instruction parsing, intent extraction, prompt understanding, input analysis, constraint extraction, query decomposition, semantic routing, natural language processing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: confidence-based-selector, task-decomposition-engine, context-window-management




---





# Instruction Parser for AI Agents

Parses natural language instructions into structured query objects by extracting intent, constraints, parameters, and contextual metadata — producing a normalized representation that downstream skill routers can use to select the best-matching capability. This skill makes the model act as a senior NLP engineer building deterministic parsing pipelines that transform ambiguous user requests into machine-interpretable specifications.

## TL;DR Checklist

- [ ] Run guard clause on empty/whitespace-only input before any parsing
- [ ] Tokenize the instruction and identify action verbs, target nouns, and scope indicators
- [ ] Classify intent against the taxonomy with confidence scoring (threshold ≥ 0.6)
- [ ] Extract explicit constraints (time limits, budget caps, environment tags) using regex patterns
- [ ] Decompose multi-part instructions into discrete sub-task objects with dependency edges
- [ ] Validate all numeric values have associated units and all required fields are present
- [ ] Assemble the final structured query conforming to the output schema

---

## When to Use

Use this skill when:

- A raw natural language instruction needs to be converted into a structured query object for routing to downstream agents or skills
- Parsing ambiguous user requests in conversational AI systems (chatbots, agent coordinators, CLI tools)
- Decomposing compound instructions ("deploy the service and run tests") into discrete executable sub-tasks
- Extracting constraints (budget caps, SLA limits, environment targets) from unstructured text for policy enforcement
- Building an input validation layer before a skill router or task dispatcher to prevent routing errors from malformed queries

---

## When NOT to Use

Avoid this skill for:

- **Static template filling** — If the instruction structure is fixed and predictable (e.g., "add new user with name={name}"), use parameterized templates instead of NLP parsing
- **Natural language generation** — This skill parses input; it does not generate responses. Use an LLM call for output generation after routing
- **Simple keyword matching** — If the query space is small (< 10 intents) and can be solved with exact string matching, a regex classifier is lighter-weight
- **Multilingual parsing** — This pipeline assumes English. For other languages, implement locale-specific tokenizers before passing to this parser

---

## Core Workflow

### Orchestration Flow

```
Raw Natural Language Input
         ↓
┌──────────────────────┐
│ 1. Guard & Validate  │ ── empty/invalid ──► Return parse error
│    Pre-Flight Check  │
└──────────┬───────────┘
           ↓ valid
┌──────────────────────┐
│ 2. Tokenize & Segment│ ── detect command verbs, nouns, modifiers
│    & Identify Tokens │   (verbs → actions, nouns → targets)
└──────────┬───────────┘
           ↓ tokens extracted
┌──────────────────────┐
│ 3. Classify Intent   │ ── score against taxonomy
│    with Confidence   │     threshold < 0.6 ──► Request clarification
└──────────┬───────────┘
           ↓ intent classified (conf ≥ 0.6)
┌──────────────────────┐
│ 4. Extract Constraints│ ── regex-based extraction of
│    & Parameters      │   budgets, time limits, env tags
└──────────┬───────────┘
           ↓ constraints extracted
┌──────────────────────┐
│ 5. Decompose Query   │ ── multi-part → sub-tasks with
│    into Sub-Tasks    │   dependency edges (DAG)
└──────────┬───────────┘
           ↓ sub-tasks built
┌──────────────────────┐
│ 6. Validate & Emit   │ ── check required fields, units,
│    Structured Output │   schema conformance
└──────────┬───────────┘
           ↓ validated
    StructuredQueryOutput
```

1. **Pre-Flight Validation** — Check input for emptiness, excessive length (> 5000 characters), and invalid encoding. Return a structured parse error immediately if any check fails. **Checkpoint:** Verify `input_text` is non-empty, non-whitespace, and under the character limit before tokenizing.

2. **Tokenize & Segment** — Split the instruction into tokens using whitespace + punctuation boundaries. Classify each token: action verb (`deploy`, `create`, `run`, `fix`), target noun (`service`, `database`, `pipeline`), scope indicator (`all`, `production`, `staging`), or modifier (`quickly`, `with tests`, `under 50MB`). **Checkpoint:** At least one action verb and one target noun must be identified. If not, flag for clarification mode.

3. **Classify Intent** — Match the token set against the intent taxonomy using pattern scoring: regex keyword hits contribute +0.15 each, verb-noun co-occurrence contributes +0.25, and context-window history provides a prior of +0.10 to known domains. Normalize all scores so they sum to 1.0. **Checkpoint:** The top intent must have confidence ≥ 0.6 or the pipeline halts with a clarification request listing the top 3 candidate intents with their scores.

4. **Extract Constraints & Parameters** — Apply regex patterns to extract typed constraints from natural language:
   - Time limits: `within\s+(\d+)\s+(minutes?|hours?)` → `(duration, unit)`
   - Budget caps: `under\s+\$(\d+)` or `budget.*?(\d+)` → `(amount, currency)`
   - Environment tags: `in\s+(production|staging|development|test)` → `environment`
   - Resource limits: `with\s+(\d+)\s+(vcpu|cores|gb|mb)` → `(quantity, unit)`
   
   **Checkpoint:** Every numeric constraint value must have an associated unit. Reject any bare number without a unit (e.g., "deploy with 4" → ask "4 what? cores? GB? replicas?").

5. **Decompose Multi-Part Instructions** — Split compound instructions at conjunction boundaries (`and`, `or`, `then`, `after that`, `also`). Each clause becomes a sub-task object with an index, its own parsed intent, and dependency edges to sibling tasks. Build a simple DAG by marking sequential clauses as `[parent] → [child]`. **Checkpoint:** Every sub-task must have at least one action verb and target noun before being emitted.

6. **Validate & Emit** — Run the assembled `StructuredQueryOutput` against the output schema validator. Check that all required fields are present (`intent`, `constraints`, `sub_tasks`), numeric values have units, and intent confidence meets the threshold. On success, emit the structured object. On failure, return a validation report listing missing or malformed fields. **Checkpoint:** Output must conform exactly to the schema defined in Implementation Patterns before being returned.

---

## Implementation Patterns

### Pattern 1: Intent Classifier with Confidence Scoring

A deterministic intent classifier that combines regex keyword matching, verb-noun co-occurrence detection, and historical priors into a single confidence score. Rejects low-confidence classifications instead of guessing.

```python
"""Intent classification for instruction parsing.

Provides multi-signal intent scoring combining keyword patterns,
verb-noun co-occurrence, and historical priors to classify
natural language instructions into structured intents.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class IntentResult:
    """Structured result of intent classification."""
    intent: str
    confidence: float
    matched_patterns: list[str] = field(default_factory=list)
    candidate_intents: list[dict] = field(default_factory=list)
    requires_clarification: bool = False


@dataclass
class TokenizedInput:
    """Tokenized representation of parsed instruction."""
    tokens: list[str]
    action_verbs: list[str] = field(default_factory=list)
    target_nouns: list[str] = field(default_factory=list)
    scope_indicators: list[str] = field(default_factory=list)


@dataclass
class IntentTaxonomy:
    """Registry of known intent patterns with keyword signatures."""
    intents: dict[str, dict] = field(default_factory=lambda: {
        "create_task": {
            "keywords": ["create", "add", "build", "setup", "new"],
            "targets": ["task", "ticket", "issue", "project", "pipeline", "workflow"],
        },
        "deploy_service": {
            "keywords": ["deploy", "release", "ship", "push", "publish"],
            "targets": ["service", "app", "application", "api", "container", "image"],
        },
        "run_tests": {
            "keywords": ["test", "run", "execute", "verify", "validate"],
            "targets": ["tests", "test suite", "unit test", "integration", "e2e"],
        },
        "fix_bug": {
            "keywords": ["fix", "repair", "resolve", "patch", "debug", "hotfix"],
            "targets": ["bug", "issue", "error", "crash", "failure", "race condition"],
        },
        "analyze_config": {
            "keywords": ["check", "review", "audit", "inspect", "validate", "scan"],
            "targets": ["config", "configuration", "settings", "yaml", "manifest", "policy"],
        },
    })


def tokenize_instruction(input_text: str) -> TokenizedInput:
    """Tokenize a natural language instruction into structured components.

    Splits the input on whitespace and punctuation boundaries, then classifies
    each token as an action verb, target noun, scope indicator, or modifier.

    Args:
        input_text: Raw natural language instruction string.

    Returns:
        TokenizedInput with classified tokens grouped by role.
    """
    import re

    # Known lexicons for classification (in production, load from config)
    action_verbs = {"deploy", "create", "add", "build", "setup", "run", "test",
                    "fix", "debug", "resolve", "analyze", "review", "check",
                    "deploy", "release", "push", "stop", "restart", "scale"}
    target_nouns = {"service", "app", "application", "api", "database", "container",
                    "image", "pipeline", "task", "ticket", "issue", "bug", "error",
                    "crash", "test", "config", "settings", "manifest", "policy",
                    "server", "cluster", "deployment"}
    scope_indicators = {"production", "staging", "development", "test", "all",
                        "prod", "dev", "stage", "global", "specific", "local"}

    # Remove punctuation but keep it for splitting
    tokens = re.findall(r"[a-zA-Z0-9\-]+(?:\s[a-zA-Z0-9\-]+)*", input_text.lower())

    result = TokenizedInput(tokens=tokens)
    for token in tokens:
        clean = token.strip().rstrip(",.")
        if clean in action_verbs:
            result.action_verbs.append(clean)
        elif clean in target_nouns:
            result.target_nouns.append(clean)
        elif clean in scope_indicators:
            result.scope_indicators.append(clean)

    return result


def classify_intent(
    tokenized: TokenizedInput,
    taxonomy: IntentTaxonomy,
    historical_prior: Optional[dict[str, float]] = None,
    confidence_threshold: float = 0.6
) -> IntentResult:
    """Classify a tokenized instruction into a known intent with confidence scoring.

    Combines three signal sources:
    - Keyword hits from action verb overlap (+0.15 each)
    - Verb-noun co-occurrence bonus (+0.25 if any verb and target match same intent)
    - Historical prior from previous classifications (up to +0.10)

    Args:
        tokenized: Pre-tokenized instruction with classified verbs and nouns.
        taxonomy: Registry of intent keyword signatures.
        historical_prior: Optional dict mapping intent → past success rate (0.0–1.0).
        confidence_threshold: Minimum confidence to accept a classification.

    Returns:
        IntentResult with the best-match intent, confidence score, and metadata.

    Raises:
        ValueError: If no action verbs or target nouns were identified in input.
    """
    if not tokenized.action_verbs:
        raise ValueError(
            f"No action verb found in tokens: {tokenized.tokens}. "
            f"Cannot classify intent without an action."
        )

    if not tokenized.target_nouns:
        raise ValueError(
            f"No target noun found in tokens: {tokenized.tokens}. "
            f"Cannot classify intent without a target object."
        )

    scores: dict[str, list[float]] = {}

    for intent_name, pattern in taxonomy.intents.items():
        keyword_score = 0.0
        matched_kw: list[str] = []

        # Signal 1: Keyword overlap (+0.15 per matching keyword)
        for verb in tokenized.action_verbs:
            if verb in pattern["keywords"]:
                keyword_score += 0.15
                matched_kw.append(f"verb:{verb}")

        for noun in tokenized.target_nouns:
            if noun in pattern["targets"]:
                keyword_score += 0.15
                matched_kw.append(f"target:{noun}")

        # Signal 2: Verb-noun co-occurrence bonus (+0.25)
        has_verb_match = any(v in pattern["keywords"] for v in tokenized.action_verbs)
        has_noun_match = any(n in pattern["targets"] for n in tokenized.target_nouns)
        if has_verb_match and has_noun_match:
            keyword_score += 0.25

        # Signal 3: Historical prior (up to +0.10)
        history_boost = 0.0
        if historical_prior and intent_name in historical_prior:
            history_boost = min(historical_prior[intent_name] * 0.10, 0.10)

        scores[intent_name] = [keyword_score, history_boost]

    # Normalize to probability distribution
    total = sum(kw for kw, _ in scores.values())
    if total == 0:
        return IntentResult(
            intent="unknown",
            confidence=0.0,
            requires_clarification=True,
            candidate_intents=[{"name": n, "score": 0} for n in taxonomy.intents],
        )

    normalized = {
        intent: (kw + hist) / total
        for intent, (kw, hist) in scores.items()
    }

    # Find best match
    best_intent = max(normalized, key=normalized.get)
    best_confidence = normalized[best_intent]

    # Determine if clarification is needed
    requires_clarification = best_confidence < confidence_threshold

    # Build candidate list (top 3 for disambiguation)
    sorted_candidates = sorted(
        normalized.items(), key=lambda x: x[1], reverse=True
    )[:3]
    candidates = [
        {"name": intent, "score": round(conf, 3)}
        for intent, conf in sorted_candidates
    ]

    return IntentResult(
        intent=best_intent if not requires_clarification else "unknown",
        confidence=round(best_confidence, 3),
        matched_patterns=[f"{best_intent}: {best_confidence:.2f}"] + [
            f"{name}: {score:.2f}" for name, score in candidates[1:]
        ],
        candidate_intents=candidates,
        requires_clarification=requires_clarification,
    )


# --- BAD vs. GOOD comparison ---

# ❌ BAD: Simple string match without confidence scoring — fails silently on partial matches
def bad_intent_classifier(text: str) -> str:
    if "deploy" in text:
        return "deploy_service"  # No confidence metric, no fallback
    if "test" in text:
        return "run_tests"
    return "unknown"  # Silent failure — caller has no idea how reliable this is

# ✅ GOOD: Uses the classify_intent function above with confidence thresholding,
# candidate intent reporting for disambiguation, and explicit clarification mode.
```

### Pattern 2: Constraint Extractor

Extracts typed constraints from natural language using regex pattern matching with unit validation. Rejects bare numbers that lack context.

```python
"""Constraint extraction from natural language instructions.

Parses budget limits, time boundaries, environment targets, resource caps,
and priority signals from unstructured text using regex patterns.
Validates that all numeric values carry units before emission.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ExtractedConstraint:
    """A single typed constraint extracted from instruction text."""
    name: str           # e.g., "budget_cap", "time_limit", "environment"
    value: float | int  # numeric or integer value
    unit: str           # e.g., "dollars", "minutes", "production"
    confidence: float   # regex match quality (0.0–1.0)


@dataclass
class ConstraintExtractionResult:
    """Aggregated constraint extraction with metadata."""
    constraints: list[ExtractedConstraint] = field(default_factory=list)
    missing_units: list[str] = field(default_factory=list)  # bare numbers found
    raw_text_span: dict[str, tuple[int, int]] = field(default_factory=dict)


# Regex pattern definitions for constraint extraction.
# Each pattern captures a name, numeric value, and optional unit group.
_CONSTRAINT_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "time_limit",
        re.compile(
            r"(?:within|in\s+under|by\s+)?(?:(\d+)\s*(?:minutes?|mins?|hours?|hrs?))"
            r"|(?:in\s+(\d+)\s*(?:minutes?|mins?|hours?|hrs?))"
        ),
    ),
    (
        "budget_cap",
        re.compile(
            r"(?:budget|max|under|cost.*?limit)\s*\$?\s*(\d+)[,.]?\s*(\w{0,3})?"
        ),
    ),
    (
        "environment",
        re.compile(
            r"in\s+(production|prod|staging|stage|development|dev|test)",
            re.IGNORECASE,
        ),
    ),
    (
        "resource_limit",
        re.compile(
            r"(?:with|using|allocate)\s+(\d+)\s*(vcpu|cores?|gb|mb|cpu|memory)"
            r"|(?:(\d+)\s*(?:replicas?|workers?)\s+of?\s+(\w+))",
        ),
    ),
    (
        "priority",
        re.compile(
            r"(?:high|medium|low)\s+(?:priority|urgency)?",
            re.IGNORECASE,
        ),
    ),
    (
        "max_cost_per_call",
        re.compile(
            r"cost.*?(?:per\s+)?call.*?(\d+[,.]?\d*)\s*(?:tokens?|credits?|\$)",
            re.IGNORECASE,
        ),
    ),
]


def extract_constraints(
    input_text: str,
    patterns: list[tuple[str, re.Pattern]] | None = None
) -> ConstraintExtractionResult:
    """Extract typed constraints from natural language instruction text.

    Applies regex pattern matching against known constraint types (time, budget,
    environment, resources, priority) and validates that every numeric value has
    an associated unit or context.

    Args:
        input_text: The raw instruction to parse.
        patterns: Optional override of constraint pattern list. Defaults to
            _CONSTRAINT_PATTERNS.

    Returns:
        ConstraintExtractionResult with all extracted constraints, any bare
        numbers flagged for clarification, and text span locations.

    Raises:
        ValueError: If any extracted numeric value lacks a unit context.
    """
    if patterns is None:
        patterns = _CONSTRAINT_PATTERNS

    result = ConstraintExtractionResult()

    for constraint_name, pattern in patterns:
        match = pattern.search(input_text.lower()) or pattern.search(input_text)
        if not match:
            continue

        # Extract groups based on pattern type
        groups = [g for g in match.groups() if g is not None]
        value: float | int | None = None
        unit: str = ""
        confidence = 0.85  # Base confidence for a regex hit

        if constraint_name == "time_limit":
            # Format: "within 30 minutes" or "in 2 hours"
            numeric_str = groups[0] if groups else None
            unit = groups[1].rstrip("s") if len(groups) > 1 and groups[1] in ("minute", "hour", "min", "hr") else ""
            if numeric_str:
                value = int(numeric_str)
            if not unit and value is not None:
                result.missing_units.append(f"time_limit={value}")

        elif constraint_name == "budget_cap":
            numeric_str = groups[0]
            unit = groups[1] if len(groups) > 1 else "dollars"
            if numeric_str:
                value = float(numeric_str.replace(",", ""))

        elif constraint_name == "environment":
            # Environment is categorical — stores the matched tag as both value and unit
            value = 1.0
            unit = groups[0]

        elif constraint_name == "resource_limit":
            # Format: "with 4 vcpu" or "4 replicas of service"
            if len(groups) >= 2:
                value = float(groups[0])
                unit = groups[1].rstrip("s")
            else:
                continue

        elif constraint_name == "priority":
            priority_map = {"high": 3, "medium": 2, "low": 1}
            keyword = groups[0]
            value = float(priority_map.get(keyword, 2))
            unit = "priority_scale"

        elif constraint_name == "max_cost_per_call":
            value = float(groups[0].replace(",", ""))
            unit = "cost_unit"

        if value is not None and unit:
            result.constraints.append(ExtractedConstraint(
                name=constraint_name,
                value=value,
                unit=unit,
                confidence=confidence,
            ))
            result.raw_text_span[constraint_name] = (match.start(), match.end())

    # Validate: reject if bare numbers were found without units
    if result.missing_units:
        raise ValueError(
            f"Unresolved numeric constraints (missing units): {result.missing_units}. "
            f"Please specify units for each numeric value."
        )

    return result


# --- BAD vs. GOOD comparison ---

# ❌ BAD: Naive string split without regex — misses compound phrases, no unit validation
def bad_constraint_extractor(text: str) -> dict:
    """Extract constraints by naive word matching."""
    result = {}
    if "budget" in text:
        result["budget"] = 0  # Hardcoded default — no extraction from text
    if "time" in text:
        result["time_limit"] = 60  # Magic number, no parsing from input
    return result  # No validation, no unit checking

# ✅ GOOD: Uses extract_constraints() above with typed regex patterns,
# unit validation on all numeric values, and structured error reporting.
```

### Pattern 3: Query Decomposer

Breaks multi-part compound instructions into discrete sub-task objects with dependency edges, enabling parallel or sequential execution by downstream agents.

```python
"""Query decomposition for multi-part natural language instructions.

Splits compound instructions at conjunction boundaries into independent
sub-tasks represented as a Directed Acyclic Graph (DAG), with each node
carrying its own parsed intent and constraint set.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SubTask:
    """A single decomposed sub-task from a multi-part instruction."""
    index: int
    action_verb: str
    target_noun: str
    intent: str
    constraints: list[ExtractedConstraint] = field(default_factory=list)
    dependencies: list[int] = field(default_factory=list)  # indices of parent tasks


@dataclass
class DecompositionResult:
    """Result of decomposing a compound instruction."""
    sub_tasks: list[SubTask]
    has_dependencies: bool
    execution_mode: str  # "parallel" or "sequential"


# Conjunction patterns that signal task boundaries.
_SEQUENTIAL_MARKERS = [
    r"\band\s+(?:then|also|additionally)",
    r"\bthen\b",
    r"\bafter\s+that\b",
    r"\bnext\b",
    r";\s*(?:and|also)\s*",
    r"\bfollowed\s+by\b",
]

_PARALLEL_MARKERS = [
    r"\band\s+similarly\b",
    r"\b(?:both\s+)?(?:X|the\s+\w+)\s+as\s+well\b",
    r"\balso\b",
]


def decompose_query(
    input_text: str,
    intent_result: IntentResult,
    constraint_result: ConstraintExtractionResult,
) -> DecompositionResult:
    """Decompose a multi-part instruction into independent sub-task objects.

    Detects conjunction boundaries to split compound instructions and assigns
    each clause its own intent classification with dependency edges forming a DAG.

    Args:
        input_text: The original raw instruction text.
        intent_result: Result from classify_intent() for the overall instruction.
        constraint_result: Result from extract_constraints() for parameter extraction.

    Returns:
        DecompositionResult containing sub-tasks, dependency info, and execution mode.

    Raises:
        ValueError: If no action verbs found in any clause after splitting.
    """
    clauses: list[tuple[str, str]] = []  # (separator_type, clause_text)

    for marker_pattern in _SEQUENTIAL_MARKERS:
        parts = re.split(marker_pattern, input_text, flags=re.IGNORECASE)
        if len(parts) > 2:
            clauses.append(("sequential", " ".join(parts[1:])))
            break

    else:
        # No sequential markers found — check for parallel indicators
        for marker_pattern in _PARALLEL_MARKERS:
            parts = re.split(marker_pattern, input_text, flags=re.IGNORECASE)
            if len(parts) > 2:
                clauses.append(("parallel", " ".join(parts[1:])))
                break

    # Single clause — return as-is
    if not clauses:
        tokens = tokenize_instruction(input_text)
        sub_task = SubTask(
            index=0,
            action_verb=tokens.action_verbs[0] if tokens.action_verbs else "execute",
            target_noun=tokens.target_nouns[0] if tokens.target_nouns else "system",
            intent=intent_result.intent if not intent_result.requires_clarification else "unknown",
            constraints=constraint_result.constraints,
        )
        return DecompositionResult(
            sub_tasks=[sub_task],
            has_dependencies=False,
            execution_mode="single",
        )

    # Build sub-tasks from split clauses
    sub_tasks: list[SubTask] = []
    prev_index = 0

    for sep_type, clause_text in clauses:
        tokens = tokenize_instruction(clause_text)

        if not tokens.action_verbs and not tokens.target_nouns:
            continue  # Skip malformed clauses

        action_verb = tokens.action_verbs[0] if tokens.action_verbs else "execute"
        target_noun = tokens.target_nouns[0] if tokens.target_nouns else "system"

        # Inherit constraints from parent, scoped to this clause
        sub_constraints = list(constraint_result.constraints)

        sub_task = SubTask(
            index=len(sub_tasks),
            action_verb=action_verb,
            target_noun=target_noun,
            intent=intent_result.intent if not intent_result.requires_clarification else "unknown",
            constraints=sub_constraints,
            dependencies=[prev_index] if sep_type == "sequential" else [],
        )
        sub_tasks.append(sub_task)
        prev_index = sub_task.index

    # Add the original (pre-split) instruction as a meta-task if it has distinct intent
    if len(sub_tasks) > 0:
        meta_task = SubTask(
            index=len(sub_tasks),
            action_verb=intent_result.intent.split("_")[0] if "_" in intent_result.intent else "process",
            target_noun="orchestration",
            intent="orchestrate",
            dependencies=[t.index for t in sub_tasks],  # All sub-tasks feed into orchestration
        )
        sub_tasks.append(meta_task)

    execution_mode = (
        "sequential" if any(t.dependencies for t in sub_tasks) else "parallel"
    )

    return DecompositionResult(
        sub_tasks=sub_tasks,
        has_dependencies=any(len(t.dependencies) > 0 for t in sub_tasks),
        execution_mode=execution_mode,
    )


# --- Example usage demonstrating end-to-end pipeline ---

def parse_instruction(input_text: str) -> dict:
    """Full parsing pipeline: tokenize → classify → extract → decompose → validate.

    Orchestrates the complete instruction parsing workflow and returns a
    structured query object suitable for downstream skill routing.

    Args:
        input_text: Raw natural language instruction to parse.

    Returns:
        Dict conforming to the StructuredQueryOutput schema with intent,
        constraints, sub-tasks, metadata, and confidence scores.

    Raises:
        ValueError: On pre-flight validation failure or unresolvable constraints.
    """
    # Step 1: Pre-flight guard
    if not input_text or not input_text.strip():
        raise ValueError("Input text is empty — cannot parse a blank instruction.")
    if len(input_text) > 5000:
        raise ValueError(
            f"Input too long ({len(input_text)} chars). "
            "Maximum instruction length is 5000 characters."
        )

    # Step 2: Tokenize
    tokens = tokenize_instruction(input_text)

    # Step 3: Classify intent
    taxonomy = IntentTaxonomy()
    intent_result = classify_intent(tokens, taxonomy)

    if intent_result.requires_clarification:
        candidates = "; ".join(
            f"{c['name']} ({c['score']})" for c in intent_result.candidate_intents[:3]
        )
        return {
            "status": "clarification_required",
            "intent": None,
            "confidence": 0.0,
            "candidates": intent_result.candidate_intents,
            "message": (
                f"Low confidence classification ({intent_result.confidence:.2f}). "
                f"Did you mean: {candidates}?"
            ),
        }

    # Step 4: Extract constraints
    try:
        constraint_result = extract_constraints(input_text)
    except ValueError as e:
        return {
            "status": "clarification_required",
            "intent": intent_result.intent,
            "confidence": intent_result.confidence,
            "message": str(e),
        }

    # Step 5: Decompose multi-part instructions
    decomposed = decompose_query(input_text, intent_result, constraint_result)

    # Step 6: Assemble structured output
    return {
        "status": "parsed",
        "intent": intent_result.intent,
        "confidence": intent_result.confidence,
        "constraints": [
            {"name": c.name, "value": c.value, "unit": c.unit}
            for c in constraint_result.constraints
        ],
        "sub_tasks": [
            {
                "index": st.index,
                "action": st.action_verb,
                "target": st.target_noun,
                "intent": st.intent,
                "dependencies": st.dependencies,
                "constraints": [
                    {"name": c.name, "value": c.value, "unit": c.unit}
                    for c in st.constraints
                ],
            }
            for st in decomposed.sub_tasks
        ],
        "execution_mode": decomposed.execution_mode,
        "token_summary": {
            "total_tokens": len(tokens.tokens),
            "verbs_found": tokens.action_verbs,
            "nouns_found": tokens.target_nouns,
            "scopes_found": tokens.scope_indicators,
        },
    }


# --- End-to-end example ---

if __name__ == "__main__":
    # Example 1: Simple single-part instruction
    result = parse_instruction("Deploy the API service to production under $200 budget")
    print(f"Intent: {result['intent']}, Confidence: {result['confidence']}")
    print(f"Constraints: {result['constraints']}")

    # Example 2: Multi-part instruction
    result = parse_instruction(
        "Run the integration tests and then deploy the service to staging"
    )
    print(f"\nExecution mode: {result['execution_mode']}")
    print(f"Sub-tasks: {len(result['sub_tasks'])}")
    for st in result["sub_tasks"]:
        print(f"  Task {st['index']}: {st['action']} {st['target']} "
              f"(deps: {st['dependencies']})")

    # Example 3: Low confidence — triggers clarification
    ambiguous = parse_instruction("Set it up properly")
    if ambiguous["status"] == "clarification_required":
        print(f"\n{ambiguous['message']}")
```

---

## Constraints

### MUST DO

- Always validate input at the boundary before any parsing — empty, whitespace-only, or overflow inputs must be rejected with a structured error (Early Exit)
- Require at least one action verb and one target noun for intent classification; otherwise return clarification candidates (Fail Fast)
- Enforce the confidence threshold of ≥ 0.6 — never route on a classification below this without listing disambiguation candidates
- Validate all numeric constraint values have associated units before emitting the output schema; bare numbers must trigger clarification requests
- Decompose compound instructions at conjunction boundaries (`and`, `then`, `after that`) into sub-task objects with explicit dependency edges forming a DAG
- Use typed dataclasses (not dicts) for internal representation throughout the pipeline — only convert to dict at the final emission boundary
- Apply regex patterns with named groups and anchored anchors to avoid false-positive matches on unrelated text

### MUST NOT DO

- Guess an intent when confidence is below the threshold — always request clarification with candidate intents listed by score
- Accept bare numeric values without units (e.g., "deploy with 4" or "cost is 50") — these must be rejected and clarified
- Merge constraints from different clauses of a decomposed query into a single constraint set — each sub-task owns its own scoped constraints
- Use `try/except` as control flow for intent classification — regex matching failures should be handled by conditional guards, not exceptions
- Hardcode intent keywords inline in functions — they must live in the `IntentTaxonomy` dataclass so the pattern set is inspectable and extensible
- Skip sub-task validation — every decomposed sub-task must have at least one action verb before being emitted to avoid orphaned execution nodes

---

## Output Template

When this skill is applied, the model produces a structured query object with the following sections:

1. **Intent** — The classified intent label (e.g., `deploy_service`, `fix_bug`) with a confidence score (0.0–1.0). If below threshold, include `status: "clarification_required"` with candidate intents.
2. **Constraints** — A list of typed constraint objects, each with `name`, `value`, and `unit`. All numeric values must have units attached.
3. **Sub-Tasks** — An array of decomposed task objects, each with `action`, `target`, `intent`, `dependencies` (indices), and scoped constraints. Present for multi-part instructions only.
4. **Execution Mode** — One of `"single"`, `"parallel"`, `"sequential"`, or `"clarification_required"` indicating how downstream agents should execute.
5. **Token Summary** — Metadata about the tokenization result: total tokens, identified verbs, nouns, and scope indicators for debugging and auditing.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `confidence-based-selector` | Selects the best skill after intent is parsed and routed to the downstream router |
| `task-decomposition-engine` | Takes sub-tasks from this parser and further decomposes them into executable units |
| `context-window-management` | Maintains conversation context windows during multi-step parsing of long instructions |

---

## Live References

- [Python dataclasses — Standard Library Documentation](https://docs.python.org/3/library/dataclasses.html)
- [Re (Regular Expression) — Standard Library Documentation](https://docs.python.org/3/library/re.html)
- [Structured Output from LLMs — LangChain Documentation](https://python.langchain.com/docs/modules/model_io/output_parsers/)
- [Prompt Engineering Guide — PromptEngineering.org](https://www.promptingguide.ai/)
- [Intent Classification for Conversational AI — Stanford CS224N Notes](https://web.stanford.edu/class/cs224n/)
- [Text Preprocessing and Tokenization — NLTK Documentation](https://www.nltk.org/book/ch03.html)
- [Dependency Parsing and DAG Construction — Allen NLP Tutorial](https://allennlp.org/tutorials)
