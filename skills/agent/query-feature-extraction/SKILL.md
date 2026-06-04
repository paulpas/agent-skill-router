---
name: query-feature-extraction
description: Extracts structured signals (action verbs, domain indicators, complexity markers, urgency signals, entity types) from natural language queries as preprocessing for intent classification and skill routing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: feature extraction, query parsing, action verb detection, domain detection, entity extraction, natural language processing, NLP preprocessing, how do i parse a query
  archetypes:
    - tactical
    - orchestration
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: query-intent-classifier, intelligent-skill-selection, instruction-parsing
---

# Query Feature Extractor

Extracts structured signals from raw natural language text — including action verbs, domain indicators, complexity markers, urgency signals, and entity types — to feed into downstream intent classification and skill routing systems. This skill makes the model act as a feature engineering specialist that transforms ambiguous user requests into machine-readable feature vectors through deterministic NLP preprocessing.

## TL;DR Checklist

- [ ] Normalize input: lowercase, strip whitespace, split into tokens with punctuation awareness
- [ ] Detect action verbs and query mood (imperative vs interrogative vs declarative) using a lexicon
- [ ] Map technical terms to domain categories (infra, code, data, security, network, etc.) via term dictionary
- [ ] Calculate complexity score (1–5) based on dependency count, clause nesting, and token span
- [ ] Identify urgency signals: SLA mentions, error codes, time constraints, system names, emergency keywords
- [ ] Extract entity types: service names, file paths, environment tags, protocol identifiers
- [ ] Assemble all features into the structured extraction output conforming to the JSON schema

---

## When to Use

Use this skill when:

- A raw natural language query needs feature-level decomposition before intent classification runs
- Building the preprocessing pipeline for a skill router — feature extraction feeds directly into the `query-intent-classifier`
- You need to extract structured signals (verbs, domains, urgency) from user messages for logging, analytics, or routing decisions
- Implementing an NLP feature extraction layer that must be deterministic (no LLM calls required)
- Analyzing query distributions over time — features provide the granularity needed for trend analysis beyond simple intent labels

---

## When NOT to Use

Avoid this skill for:

- **Intent classification** — This skill only extracts features; it does not classify. Pass extracted features to `query-intent-classifier` for archetype scoring
- **Sentiment or emotion analysis** — Feature extraction identifies structural signals, not user sentiment or tone
- **Text summarization or generation** — This skill reads and parses input; it never produces new prose or summaries
- **Simple keyword searching** — If you only need to check whether a single term appears in text, regex matching is lighter-weight than the full feature extraction pipeline

---

## Core Workflow

1. **Normalize and Tokenize the Input** — Convert the raw query to lowercase, strip leading/trailing whitespace, and split into tokens using whitespace boundaries with punctuation-aware splitting. Remove English stop words (`the`, `a`, `is`, `in`, `on`, `at`, `to`, `for`, `of`) that do not carry signal value. **Checkpoint:** After normalization, the token list must contain at least 2 meaningful (non-stop-word) tokens. If fewer remain, return an empty feature set with a warning flag and let downstream classification handle it.

2. **Identify Action Verbs and Question Patterns** — Classify each token against an action verb lexicon to identify verbs like `deploy`, `fix`, `create`, `debug`, `explain`. Detect the query mood: imperative (command form, e.g., "deploy the service"), interrogative (question markers like "how do I", "what is", "why does"), or declarative (statement form). **Checkpoint:** At least one of — an action verb or a question pattern — must be detected. If neither is found, set `mood: "unknown"` and `action_verbs: []` in the output to signal ambiguity.

3. **Extract Domain Indicators** — Scan tokens against the domain term dictionary to map technical terms to domain categories (`infra`, `code`, `data`, `security`, `network`, `testing`, `devops`). Each matched term becomes a `{term, domain}` pair. Support compound terms like `Kubernetes` → `infra`, `PostgreSQL` → `data`, `OWASP` → `security`. **Checkpoint:** If zero domain matches are found, set `domains: []` — this is valid for non-technical queries and should not trigger an error.

4. **Detect Complexity Markers** — Calculate a complexity score (1–5) by examining three factors: dependency count (how many distinct services/components/dependencies are mentioned), clause nesting (presence of subordinate clauses indicated by `that`, `which`, `because`, `while`, `after`), and token span (total meaningful tokens). Score breakdown: 1 = single task, no dependencies; 2 = one dependency or simple question; 3 = multiple components or compound question; 4 = multi-step with nested conditions; 5 = enterprise-scale architecture planning. **Checkpoint:** The complexity score must always be an integer from 1 to 5 — never return a float or unbounded value.

5. **Identify Urgency Signals and Entity Types** — Scan for urgency indicators: SLA mentions (`"SLA"`, `"response time"`, `"critical"`), error codes (`"500"`, `"OOM"`, `"timeout"`, `"panic"`), time constraints (`"ASAP"`, `"within 1 hour"`, `"right now"`), and emergency keywords (`"production down"`, "`breaking"`, "`data loss`"). Also extract entity types: service names (capitalized words near action verbs), file paths (`/etc/...`, `./src/...`), environment tags (`production`, `staging`, `dev`, `prod`), protocol identifiers (`HTTPS`, `gRPC`, `REST`). **Checkpoint:** Every urgency signal must include the original text span (the matched string) so downstream systems can trace back to the source query.

---

## Feature Extraction Patterns

### Pattern 1: Action Verb & Mood Detection

Detects action verbs from a defined lexicon and classifies the query mood (imperative, interrogative, declarative).

```python
"""Action verb detection and query mood classification.

Identifies action verbs from a curated lexicon and determines the
grammatical mood of a natural language query (imperative command,
interrogative question, or declarative statement).
"""

import re
from dataclasses import dataclass
from typing import Optional


# Curated action verb lexicon for common developer operations.
ACTION_VERBS: set[str] = {
    # Implementation verbs
    "implement", "build", "create", "write", "develop", "code", "design",
    "configure", "set up", "deploy", "migrate", "refactor", "optimize",
    # Debugging verbs
    "fix", "debug", "troubleshoot", "resolve", "patch", "repair",
    # Analysis verbs
    "analyze", "review", "audit", "scan", "inspect", "verify", "check",
    # Monitoring verbs
    "monitor", "alert", "log", "trace", "profile", "benchmark",
    # Management verbs
    "scale", "restart", "stop", "start", "reload", "update", "upgrade",
    "rollback", "backup", "restore",
    # Learning verbs
    "explain", "teach", "learn", "understand", "clarify",
    # Automation verbs
    "automate", "schedule", "trigger", "execute", "run",
    # Generation verbs
    "generate", "scaffold", "prototype", "template",
}

# Question patterns that indicate interrogative mood.
QUESTION_PATTERNS: list[str] = [
    "how do i", "how does", "how can", "how would",
    "what is", "what's", "what are", "what should",
    "why does", "why did", "why is", "why would",
    "can you", "could you", "would you", "should i",
    "is there a way", "are there any",
]


@dataclass
class VerbAndMoodResult:
    """Results of action verb detection and mood classification."""
    action_verbs: list[str] = field(default_factory=list)
    mood: str = "declarative"  # imperative, interrogative, declarative, or unknown
    is_question: bool = False
    question_markers: list[str] = field(default_factory=list)


def detect_verbs_and_mood(input_text: str) -> VerbAndMoodResult:
    """Detect action verbs in text and classify query mood.

    Scans the input for action verbs from a curated lexicon and determines
    whether the query is imperative (command), interrogative (question),
    or declarative (statement).

    Args:
        input_text: Raw natural language query string.

    Returns:
        VerbAndMoodResult with identified verbs, mood classification,
        question flags, and matched question markers.
    """
    text_lower = input_text.lower().strip()
    tokens = re.findall(r"[a-zA-Z0-9\-]+", text_lower)

    # Detect action verbs from token list
    found_verbs: list[str] = []
    for token in tokens:
        clean = token.strip(".,!?;:")
        if clean in ACTION_VERBS:
            found_verbs.append(clean)

    # Remove duplicates while preserving order
    seen: set[str] = set()
    unique_verbs: list[str] = []
    for v in found_verbs:
        if v not in seen:
            seen.add(v)
            unique_verbs.append(v)

    # Detect mood from question patterns
    mood = "declarative"
    is_question = False
    markers: list[str] = []

    for pattern in QUESTION_PATTERNS:
        if pattern in text_lower:
            mood = "interrogative"
            is_question = True
            markers.append(pattern)

    # Imperative detection: has verbs but no question markers
    if not is_question and len(unique_verbs) > 0:
        mood = "imperative"

    return VerbAndMoodResult(
        action_verbs=unique_verbs,
        mood=mood,
        is_question=is_question,
        question_markers=markers,
    )


# --- BAD vs. GOOD examples ---

# ❌ BAD: No verb detection, always returns declarative
def bad_mood_detector(text: str) -> dict:
    return {"mood": "declarative", "verbs": []}  # Never detects verbs or questions

# ✅ GOOD: Uses detect_verbs_and_mood() above with full lexicon lookup
# and pattern-based mood classification across imperative, interrogative,
# and declarative categories.
```

### Pattern 2: Domain Indicator Mapping

Maps technical terms to domain categories using a comprehensive term dictionary.

```python
"""Domain indicator mapping from technical terms.

Scans input text for domain-specific technical terms and maps each match
to a structured domain category for downstream intent routing.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DomainMatch:
    """A single matched term mapped to its domain category."""
    term: str           # The original matched term (as found in text)
    domain: str         # One of the domain categories defined below


# Comprehensive technical term → domain mapping.
# Each key is a lowercase term; each value is the canonical domain tag.
DOMAIN_DICTIONARY: dict[str, str] = {
    # Infrastructure / Cloud
    "kubernetes": "infra", "k8s": "infra", "docker": "infra", "container": "infra",
    "ecs": "infra", "eks": "infra", "gke": "infra", "aks": "infra",
    "terraform": "infra", "ansible": "infra", "pulumi": "infra",
    "aws": "infra", "azure": "infra", "gcp": "infra", "cloud": "infra",
    "vm": "infra", "virtual machine": "infra", "ec2": "infra",
    "helm": "infra", "istio": "infra", "envoy": "infra", "nginx": "infra",
    # Code / Application
    "python": "code", "javascript": "code", "typescript": "code", "go": "code",
    "rust": "code", "java": "code", "golang": "code", "react": "code",
    "next.js": "code", "node.js": "code", "express": "code", "fastapi": "code",
    "django": "code", "flask": "code", "rails": "code", "spring": "code",
    "microservice": "code", "microservice architecture": "code", "monolith": "code",
    # Data / Database
    "postgresql": "data", "postgres": "data", "mysql": "data", "sqlite": "data",
    "mongodb": "data", "redis": "data", "dynamodb": "data", "cassandra": "data",
    "elasticsearch": "data", "solr": "data", "s3": "data", "database": "data",
    "sql": "data", "nosql": "data", "data warehouse": "data",
    # Security
    "owasp": "security", "jwt": "security", "oauth": "security", "tls": "security",
    "ssl": "security", "certificate": "security", "encryption": "security",
    "auth": "security", "authentication": "security", "authorization": "security",
    "rbac": "security", "gdpr": "security", "soc2": "security", "compliance": "security",
    "firewall": "security", "vulnerability": "security",
    # Network
    "dns": "network", "load balancer": "network", "lb": "network",
    "https": "network", "http": "network", "rest api": "network", "graphql": "network",
    "websocket": "network", "grpc": "network", "tcp": "network", "udp": "network",
    "ip address": "network", "subnet": "network", "vpc": "network",
    # Testing / QA
    "pytest": "testing", "jest": "testing", "mocha": "testing", "cypress": "testing",
    "selenium": "testing", "k6": "testing", "load test": "testing",
    "unit test": "testing", "integration test": "testing", "e2e": "testing",
    # DevOps / CI-CD
    "github actions": "devops", "gitlab ci": "devops", "jenkins": "devops",
    "circleci": "devops", "travis": "devops", "argocd": "devops",
    "deployment": "devops", "pipeline": "devops", "ci/cd": "devops",
    "monitoring": "devops", "prometheus": "devops", "grafana": "devops",
    "logging": "devops", "opentelemetry": "devops",
}


def extract_domain_indicators(input_text: str) -> list[DomainMatch]:
    """Extract domain indicators by scanning for technical terms.

    Scans the input text (case-insensitive) against a comprehensive
    term-to-domain dictionary and returns all matched {term, domain} pairs.
    Supports compound terms (e.g., "github actions" maps to "devops").

    Args:
        input_text: Raw natural language query string.

    Returns:
        List of DomainMatch objects with the original matched term
        and its canonical domain category. Empty list if no matches found.
    """
    text_lower = input_text.lower()
    matches: list[DomainMatch] = []
    seen_terms: set[str] = set()

    # Sort by length (longest first) to match compound terms before substrings
    sorted_terms = sorted(DOMAIN_DICTIONARY.keys(), key=len, reverse=True)

    for term in sorted_terms:
        if term in text_lower and term not in seen_terms:
            matches.append(DomainMatch(
                term=term,
                domain=DOMAIN_DICTIONARY[term],
            ))
            seen_terms.add(term)

    return matches


# --- BAD vs. GOOD examples ---

# ❌ BAD: Hardcodes a single domain category — no flexibility for different terms
def bad_domain_extractor(text: str) -> list[str]:
    domains = []
    if "docker" in text:
        domains.append("infra")  # Only one hardcoded mapping
    return domains

# ✅ GOOD: Uses extract_domain_indicators() above with a comprehensive 80+ term
# dictionary covering all major domain categories, longest-first matching to
# avoid partial compound-term mismatches.
```

### Pattern 3: Complexity & Urgency Scoring

Calculates complexity score (1–5) and urgency score (1–5) based on extracted features.

```python
"""Complexity and urgency scoring from extracted query features.

Computes a complexity score (1-5 scale) and urgency score (1-5 scale)
based on dependency count, clause nesting, token span, SLA mentions,
error codes, time constraints, and emergency keywords.
"""

from dataclasses import dataclass, field
from typing import Optional


# Complexity-relevant subordinating conjunctions and connectors.
_SUBORDINATING_CONJUNCTIVES: list[str] = [
    "that", "which", "because", "while", "after", "before", "when",
    "although", "if", "unless", "whereas", "since", "until",
]

# Common dependency connectors (lists multiple components).
_DEPENDENCY_CONNECTORS: list[str] = [
    "and", "with", "including", "along with", "plus", "also needs",
]

# Urgency keywords and patterns.
_URGENCY_KEYWORDS: list[str] = [
    "asap", "urgent", "critical", "emergency", "immediately",
    "right now", "down", "outage", "broken", "breaking",
    "data loss", "production down", "site is down", "on fire",
]

# SLA and time constraint patterns.
_SLA_PATTERNS: list[str] = [
    "sla", "response time", "mttr", "rto", "rpo", "uptime guarantee",
]

_TIME_CONSTRAINTS: list[str] = [
    "within 1 hour", "within an hour", "today", "this week",
    "by end of day", "eod", "by tomorrow", "deadline",
    "asap", "right now", "immediately",
]

# Error code patterns.
_ERROR_CODE_PATTERNS: list[str] = [
    "500", "502", "503", "404", "oomkilled", "oom kill",
    "panic", "segfault", "timeout", "connection refused",
    "dns resolution failed", "certificate expired",
]


@dataclass
class ComplexityScore:
    """Computed complexity score with breakdown."""
    score: int = 1           # Always 1-5 integer
    dependency_count: int = 0
    clause_depth: int = 0
    token_span: int = 0
    reasoning: str = ""


@dataclass
class UrgencyScore:
    """Computed urgency score with breakdown."""
    score: int = 1           # Always 1-5 integer
    has_urgency_keyword: bool = False
    has_sla_mention: bool = False
    has_time_constraint: bool = False
    has_error_code: bool = False
    signals: list[str] = field(default_factory=list)


def calculate_complexity(
    meaningful_tokens: int,
    dependency_count: int,
    clause_depth: int,
) -> ComplexityScore:
    """Calculate a complexity score (1-5) from extracted features.

    Combines three factors into a single integer score:
    - Token span (number of meaningful tokens in the query)
    - Dependency count (distinct services/components mentioned)
    - Clause depth (number of subordinate clauses)

    Score breakdown:
      1 = Single task, no dependencies, simple question (< 8 tokens)
      2 = One dependency or simple compound question (8-15 tokens)
      3 = Multiple components or compound question (16-25 tokens)
      4 = Multi-step with nested conditions or multiple constraints
      5 = Enterprise-scale planning, architecture decisions (> 25 tokens)

    Args:
        meaningful_tokens: Count of non-stop-word tokens in the query.
        dependency_count: Number of distinct services/components mentioned.
        clause_depth: Number of subordinate clauses detected.

    Returns:
        ComplexityScore with integer score (1-5) and supporting metrics.
    """
    # Base complexity from token span
    if meaningful_tokens < 8:
        base = 1
    elif meaningful_tokens < 16:
        base = 2
    elif meaningful_tokens < 26:
        base = 3
    elif meaningful_tokens < 40:
        base = 4
    else:
        base = 5

    # Modifier from dependency count
    dep_modifier = min(dependency_count, 2)  # Max +2 from dependencies

    # Modifier from clause depth
    clause_modifier = min(clause_depth, 1)  # Max +1 from nesting

    raw_score = base + dep_modifier + clause_modifier
    score = max(1, min(5, raw_score))  # Clamp to 1-5 range

    reasoning_parts: list[str] = []
    if meaningful_tokens < 8:
        reasoning_parts.append(f"short query ({meaningful_tokens} tokens)")
    elif meaningful_tokens < 26:
        reasoning_parts.append(f"moderate length ({meaningful_tokens} tokens)")
    else:
        reasoning_parts.append(f"long query ({meaningful_tokens} tokens)")

    if dependency_count > 0:
        reasoning_parts.append(f"{dependency_count} dependencies detected")
    if clause_depth > 0:
        reasoning_parts.append(f"{clause_depth} subordinate clauses")

    return ComplexityScore(
        score=score,
        dependency_count=dependency_count,
        clause_depth=clause_depth,
        token_span=meaningful_tokens,
        reasoning="; ".join(reasoning_parts) if reasoning_parts else "minimal complexity",
    )


def calculate_urgency(input_text: str) -> UrgencyScore:
    """Calculate an urgency score (1-5) from query content.

    Scans for urgency indicators including emergency keywords, SLA mentions,
    time constraints, and error codes to determine how urgently the query
    should be processed.

    Score breakdown:
      1 = No urgency signals present
      2 = One mild signal (e.g., "today" deadline)
      3 = Multiple mild signals or one moderate signal (e.g., "within 1 hour")
      4 = Strong signals (error code + time constraint, or SLA mention)
      5 = Critical emergency (production down, data loss, ASAP + error)

    Args:
        input_text: Raw natural language query string to analyze.

    Returns:
        UrgencyScore with integer score (1-5), signal flags, and details.
    """
    text_lower = input_text.lower()
    signals: list[str] = []
    has_urgency_kw = False
    has_sla = False
    has_time_constraint = False
    has_error_code = False

    # Check urgency keywords (weighted heavily)
    for kw in _URGENCY_KEYWORDS:
        if kw in text_lower:
            has_urgency_kw = True
            signals.append(f"urgency_keyword:{kw}")

    # Check SLA mentions
    for pattern in _SLA_PATTERNS:
        if pattern in text_lower:
            has_sla = True
            signals.append(f"sla_mention:{pattern}")

    # Check time constraints
    for pattern in _TIME_CONSTRAINTS:
        if pattern in text_lower:
            has_time_constraint = True
            signals.append(f"time_constraint:{pattern}")

    # Check error codes
    for pattern in _ERROR_CODE_PATTERNS:
        if pattern in text_lower:
            has_error_code = True
            signals.append(f"error_code:{pattern}")

    # Calculate score from signal combinations
    score = 1
    if has_urgency_kw:
        score += 2
    if has_sla:
        score += 1
    if has_time_constraint:
        score += 1
    if has_error_code:
        score += 1

    # Emergency override: production down + error code = automatic 5
    if "production" in text_lower and "down" in text_lower and has_error_code:
        score = 5

    # ASAP with any signal = at least 4
    if "asap" in text_lower and (has_error_code or has_urgency_kw):
        score = max(score, 4)

    score = max(1, min(5, score))

    return UrgencyScore(
        score=score,
        has_urgency_keyword=has_urgency_kw,
        has_sla_mention=has_sla,
        has_time_constraint=has_time_constraint,
        has_error_code=has_error_code,
        signals=signals,
    )


# --- Example usage demonstrating the scoring pipeline ---

if __name__ == "__main__":
    test_queries = [
        ("Fix auth bug", 6, 1, 0),
        ("Deploy the API service to production with rate limiting and health checks", 14, 3, 0),
        ("Why is my Kubernetes pod crashing with OOMKilled while the database connections are timing out after SLA breach?", 22, 2, 2),
        ("How do I architect a multi-region microservice mesh with observability, compliance, and zero-downtime migrations?", 16, 4, 3),
    ]

    for query, tokens, deps, clauses in test_queries:
        complexity = calculate_complexity(tokens, deps, clauses)
        urgency = calculate_urgency(query)
        print(f"Query: {query}")
        print(f"  Complexity: {complexity.score}/5 — {complexity.reasoning}")
        print(f"  Urgency:    {urgency.score}/5 — {', '.join(urgency.signals) or 'none'}")
        print()
```

---

## Constraints

### MUST DO

- Always normalize input to lowercase and strip whitespace before any tokenization — this ensures deterministic matching against the domain dictionary and verb lexicon
- Remove English stop words after tokenization but only for signal extraction — preserve the original text span for downstream reference and tracing
- Detect both action verbs AND query mood (imperative/interrogative/declarative) — never return an empty `action_verbs` list without flagging it as ambiguous in the output
- Use longest-first matching when scanning the domain dictionary — this prevents compound terms like `github actions` from being partially matched by sub-components like `actions` alone
- Clamp complexity and urgency scores to the integer range 1–5 — never return floats, unbounded values, or negative scores
- Include original text spans for every urgency signal so downstream systems can trace back to the source query without ambiguity
- Support compound terms in the domain dictionary (e.g., `github actions` → `devops`, `rate limit policy` → `security`) — always check longer terms before shorter substrings

### MUST NOT DO

- Use this skill for intent classification or routing decisions — it only extracts features; pass them to `query-intent-classifier` for archetype scoring
- Accept input with fewer than 2 meaningful tokens after stop-word removal without returning an empty feature set with a warning flag — always return valid output, even if minimal
- Hardcode domain categories directly in extraction functions instead of using the `DOMAIN_DICTIONARY` lookup — this makes the mapping uninspectable and unmaintainable
- Return complexity scores based solely on token count — always incorporate dependency count and clause nesting as modifier factors alongside token span
- Skip urgency signal detection for queries containing error codes or production-related keywords — every query must be scanned for emergency indicators regardless of apparent benignness
- Use regex lookbehinds or complex backreferences in pattern matching — keep all patterns simple, anchored, and deterministic to avoid performance regressions on long queries

---

## Output Template

When this skill is applied, the model produces a structured extraction object with the following JSON schema:

```json
{
  "normalized_text": "how do i implement a stop-loss in my trading bot",
  "action_verbs": ["implement"],
  "mood": "interrogative",
  "is_question": true,
  "question_markers": ["how do i"],
  "domains": [
    {"term": "trading", "domain": "code"},
    {"term": "bot", "domain": "code"}
  ],
  "complexity_score": {
    "score": 2,
    "dependency_count": 1,
    "clause_depth": 0,
    "token_span": 9,
    "reasoning": "moderate length (9 tokens); 1 dependencies detected"
  },
  "urgency_score": {
    "score": 1,
    "has_urgency_keyword": false,
    "has_sla_mention": false,
    "has_time_constraint": false,
    "has_error_code": false,
    "signals": []
  },
  "entities": [
    {"type": "concept", "value": "stop-loss"}
  ],
  "warnings": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `normalized_text` | string | Lowercased, whitespace-stripped version of the original input |
| `action_verbs` | string[] | List of detected action verbs from the lexicon |
| `mood` | string | Query mood: `imperative`, `interrogative`, `declarative`, or `unknown` |
| `is_question` | boolean | True when interrogative mood is detected |
| `question_markers` | string[] | The specific question patterns matched (e.g., `"how do i"`) |
| `domains` | object[] | Domain matches with `{term, domain}` pairs |
| `complexity_score.score` | int | Integer complexity score (1–5) |
| `complexity_score.reasoning` | string | Human-readable breakdown of the complexity factors |
| `urgency_score.score` | int | Integer urgency score (1–5) |
| `urgency_score.signals` | string[] | List of detected urgency signal descriptors |
| `entities` | object[] | Extracted entity types (service names, paths, environments) |
| `warnings` | string[] | Non-fatal warnings (e.g., "few tokens after normalization") |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `query-intent-classifier` | Takes extracted features from this skill and classifies them into intent archetypes for routing |
| `intelligent-skill-selection` | Uses the classified intent plus confidence scores to select the best individual skill for dispatch |
| `instruction-parsing` | Complements feature extraction by parsing structured constraints, parameters, and multi-part task decomposition |

---

## Live References

- [Python dataclasses — Standard Library Documentation](https://docs.python.org/3/library/dataclasses.html)
- [NLTK Tokenization and Stop Words — Natural Language Toolkit Docs](https://www.nltk.org/book/ch03.html)
- [Regular Expressions in Python — re Module Documentation](https://docs.python.org/3/library/re.html)
- [Named Entity Recognition Patterns — spaCy Documentation](https://spacy.io/usage/linguistic-features#named-entities)
- [Text Preprocessing for NLP Pipelines — Hugging Face Course](https://huggingface.co/course/chapter7/1)
- [Query Classification and Feature Engineering — Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
