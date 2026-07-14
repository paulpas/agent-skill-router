---
name: dual-provider-reasoning-routing
description: Routes reasoning workloads between multiple LLM providers based on task complexity, cost constraints, and latency requirements with real-time fallback chains.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: dual provider routing, multi-provider LLM, model routing, Gemini Claude routing, cost-performance analysis, how do i route between LLM providers, fallback chain
  archetypes: [orchestration, tactical]
  anti_triggers:
    - single-model setup only
    - prompt engineering
    - reasoning method selection (CoT/ToT)
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-optimization, reasoning-engine-internals, budget-aware-cost-management
---

# Dual Provider Reasoning Routing Pattern

Routes reasoning workloads between multiple LLM providers based on task complexity, cost constraints, and latency requirements. This skill makes the model implement dynamic routing logic that classifies incoming requests before dispatch, manages fallback chains when primary provider degrades or exceeds budget, and reconciles divergent answers from different providers.

## TL;DR Checklist

- [ ] Profile each available provider (reasoning depth, token limits, domain strengths)
- [ ] Implement query classifier that routes to the optimal provider
- [ ] Set up fallback chains with latency-aware switching
- [ ] Track cost-performance metrics per provider in real-time
- [ ] Implement divergence detection when multiple providers give different answers
- [ ] Add circuit breaker for degraded providers

---

## When to Use

Use this skill when:

- Running multiple LLM providers (e.g., Gemini + Claude + OpenAI) and need to route workloads intelligently
- Cost optimization is critical and you want to use cheaper models for simple tasks
- Latency SLAs vary by request type — some need fast answers, others need deep reasoning
- You need resilience against provider outages or rate limits via automatic fallback
- A single provider cannot handle all task types in your agent's workflow

## When NOT to Use

Avoid this skill for:

- Single-provider setups with no cost/latency trade-offs to manage
- Ultra-simple agents where the overhead of routing exceeds the benefit
- Tasks where provider differences don't matter (e.g., all providers perform equally)
- Environments where switching between providers introduces security/compliance issues

---

## Core Workflow

1. **Provider Profiling** — Build a capability profile for each available LLM provider including: max tokens, reasoning depth rating (1–5), domain strengths (code, math, creative writing, general knowledge), average latency, cost per 1K tokens, and rate limits. Update profiles quarterly or when providers release new models. **Checkpoint:** Each provider must have at least 3 measured performance data points before being added to the routing pool.

2. **Query Classification** — Implement a classifier that analyzes each incoming request and assigns it to a category (`simple_factual`, `complex_reasoning`, `creative_generation`, `code_task`, `analysis`) with a confidence score. The classifier can be rule-based (keyword matching) or LLM-based (send a small sample to a router model). **Checkpoint:** Classification must complete in < 5ms for rule-based or < 100ms for LLM-based classifiers.

3. **Routing Decision Engine** — Given a classified query and its priority, select the best provider using a scoring function: `score = (reasoning_depth * complexity_match) - (cost_penalty) - (latency_penalty)`. Select the provider with the highest score among those within budget and SLA. **Checkpoint:** Routing decisions must be logged with the chosen provider, score breakdown, and alternative candidates considered.

4. **Fallback Chain Setup** — For each query type, define an ordered list of fallback providers. If the primary fails (timeout, rate limit, error response), try the next in chain. Each fallback has a maximum retry count and a minimum confidence threshold. **Checkpoint:** Fallback chains must not include providers with worse cost-performance ratios for the same query type.

5. **Divergence Detection** — When multiple providers are queried (for high-stakes tasks), compare outputs and flag disagreements. Use a reconciliation strategy: majority vote, highest-confidence provider wins, or escalate to human review. **Checkpoint:** Divergence detection must run in parallel with provider calls — do not wait for one result before starting the other.

6. **Circuit Breaker Monitoring** — Monitor each provider's error rate and latency. When a provider's error rate exceeds the threshold (> 10% failures over 5 minutes), open its circuit breaker and stop routing to it until recovery. **Checkpoint:** Circuit breaker state must be observable via metrics (success/failure counts, last failure timestamp).

---

## Implementation Patterns

### Pattern 1: Provider Router with Query Classification

Routes queries to the optimal LLM provider based on classification and profiling. This is the core dispatch logic that every multi-provider setup needs.

```python
from dataclasses import dataclass, field
from enum import Enum


class QueryType(Enum):
    """Categories of queries for routing purposes."""

    SIMPLE_FACTUAL = "simple_factual"
    COMPLEX_REASONING = "complex_reasoning"
    CREATIVE_GENERATION = "creative_generation"
    CODE_TASK = "code_task"
    ANALYSIS = "analysis"


@dataclass
class ProviderProfile:
    """Performance and cost profile for an LLM provider.

    Attributes:
        name: Unique identifier for this provider (e.g., 'gemini-2.5-pro', 'claude-opus-4').
        max_tokens: Maximum context window size in tokens.
        reasoning_depth: Reasoning capability rating from 1.0 (shallow) to 5.0 (deep).
        domain_strengths: Mapping of query type to strength score (0.0–1.0).
        avg_latency_ms: Average response time measured in milliseconds.
        cost_per_1k_tokens: Cost in USD per 1,000 tokens (input + output combined).
        rate_limit_per_minute: Maximum requests allowed per minute before throttling.
    """

    name: str
    max_tokens: int
    reasoning_depth: float  # 1.0–5.0
    domain_strengths: dict[str, float]  # task_type -> strength (0.0-1.0)
    avg_latency_ms: float  # Average response time in milliseconds
    cost_per_1k_tokens: float  # USD
    rate_limit_per_minute: int


@dataclass
class RouteDecision:
    """The routing decision for a single query.

    Attributes:
        provider: The selected provider name.
        query_type: The classified type of the incoming query.
        confidence: Confidence score of the classification (0.0–1.0).
        score_breakdown: Numeric breakdown of why this provider was chosen.
        alternatives: Up to 2 alternative providers considered, with their scores.
    """

    provider: str
    query_type: QueryType
    confidence: float
    score_breakdown: dict[str, float]
    alternatives: list[tuple[str, float]]  # (provider_name, score)


class ProviderRouter:
    """Routes queries to the optimal LLM provider based on classification and profiling.

    The router maintains profiles for each available provider and uses a scoring
    function that weighs domain strength, reasoning match, cost, and latency to
    select the best candidate for each incoming query.
    """

    def __init__(self, providers: list[ProviderProfile]) -> None:
        """Initialize the router with a list of provider profiles.

        Args:
            providers: List of ProviderProfile objects describing available LLMs.
        """
        self._providers: dict[str, ProviderProfile] = {p.name: p for p in providers}
        self._query_patterns: dict[str, str] = {
            QueryType.SIMPLE_FACTUAL.value: r"(what|who|when|where|how many)\b",
            QueryType.COMPLEX_REASONING.value: r"(explain|compare|analyze|reason about|why does?)\b",
            QueryType.CODE_TASK.value: r"(write|generate|debug|refactor|implement)\b.*(?:code|function|class|script)",
            QueryType.CREATIVE_GENERATION.value: r"(write|create|compose|design|imagine)\b.*(?:story|poem|essay|article|content)",
            QueryType.ANALYSIS.value: r"(summarize|evaluate|assess|critique|review)\b",
        }

    def classify_query(self, text: str) -> tuple[QueryType, float]:
        """Classify a query into a type using keyword matching.

        Scans the query text against predefined regex patterns and returns the
        best match with a confidence score based on pattern specificity.

        Args:
            text: The raw query string to classify.

        Returns:
            A tuple of (QueryType, confidence) where confidence is 0.3–1.0.
        """
        import re

        best_match = QueryType.ANALYSIS  # Default fallback
        confidence = 0.3  # Low default for unmatched queries

        for qtype, pattern in self._query_patterns.items():
            if re.search(pattern, text.lower()):
                best_match = qtype
                confidence = max(confidence, 0.7)

        return best_match, confidence

    def route_query(
        self,
        query_text: str,
        max_cost_per_1k: float = 0.10,
        max_latency_ms: float = 5000,
    ) -> RouteDecision:
        """Route a query to the best available provider within budget and SLA constraints.

        Filters providers by cost and latency budgets, computes a composite score
        for each candidate, and returns the highest-scoring one.

        Args:
            query_text: The incoming query to route.
            max_cost_per_1k: Maximum acceptable cost per 1K tokens in USD.
            max_latency_ms: Maximum acceptable average latency in milliseconds.

        Returns:
            A RouteDecision with the selected provider, score breakdown, and alternatives.
        """
        query_type, classification_confidence = self.classify_query(query_text)
        complexity = query_type_complexity_score(query_type)

        candidates: list[tuple[str, float]] = []

        for name, profile in self._providers.items():
            # Early exit: skip providers exceeding budget constraints
            if profile.cost_per_1k_tokens > max_cost_per_1k:
                continue
            if profile.avg_latency_ms > max_latency_ms:
                continue

            # Compute composite routing score
            domain_strength = profile.domain_strengths.get(query_type.value, 0.5)
            reasoning_match = min(1.0, profile.reasoning_depth / complexity)
            cost_penalty = profile.cost_per_1k_tokens / max_cost_per_1k
            latency_penalty = profile.avg_latency_ms / max_latency_ms

            score = (domain_strength * reasoning_match) - (cost_penalty * 0.3) - (latency_penalty * 0.2)

            candidates.append((name, round(score, 3)))

        # Sort by score descending — highest score wins
        candidates.sort(key=lambda x: x[1], reverse=True)

        return RouteDecision(
            provider=candidates[0][0] if candidates else "default",
            query_type=query_type,
            confidence=classification_confidence,
            score_breakdown={"query_type": query_type.value},
            alternatives=candidates[1:3],  # Top 2 alternatives
        )


def query_type_complexity_score(qtype: QueryType) -> float:
    """Return the expected reasoning depth for a query type.

    Maps each query category to a complexity score (1.0–5.0) that represents
    how much deep reasoning the task typically requires.

    Args:
        qtype: The classified query type.

    Returns:
        A float between 1.0 (factual lookup) and 5.0 (deep analysis).
    """
    complexity_map: dict[QueryType, float] = {
        QueryType.SIMPLE_FACTUAL: 1.0,
        QueryType.CODE_TASK: 3.0,
        QueryType.ANALYSIS: 3.5,
        QueryType.CREATIVE_GENERATION: 2.0,
        QueryType.COMPLEX_REASONING: 5.0,
    }
    return complexity_map[qtype]
```

### Pattern 2: Fallback Chain with Circuit Breaker

Manages ordered fallback chains for provider redundancy. When the primary provider fails (timeout, rate limit, error), the chain advances to the next provider automatically. Includes a circuit breaker that opens when a provider's consecutive failures exceed a threshold, preventing cascading retries against a broken service.

```python
import time
from collections import deque
from typing import Optional


@dataclass
class CircuitBreakerState:
    """Circuit breaker state for an LLM provider.

    Implements the circuit breaker pattern to prevent repeated calls to a degraded
    provider. Transitions: Closed (normal) → Open (failing) → Half-Open (testing recovery).

    Attributes:
        closed: True if the circuit allows requests, False if it is open (tripped).
        failure_count: Total cumulative failures observed for this provider.
        consecutive_failures: Number of sequential failures since last success.
        last_failure_time: Unix timestamp of the most recent failure event.
        recovery_threshold_minutes: Minutes to wait before attempting recovery.
    """

    closed: bool = True  # Closed = normal, Open = failing
    failure_count: int = 0
    consecutive_failures: int = 0
    last_failure_time: float = 0.0
    recovery_threshold_minutes: float = 5.0


class FallbackChain:
    """Manages ordered fallback chains for provider redundancy.

    Iterates through a list of providers in priority order, executing the request
    against each until one succeeds or all are exhausted. Tracks per-provider
    circuit breaker state to automatically skip degraded providers.
    """

    def __init__(
        self,
        providers: list[str],
        circuit_breakers: dict[str, CircuitBreakerState],
    ) -> None:
        """Initialize the fallback chain with provider names and their breakers.

        Args:
            providers: Ordered list of provider names to try in sequence.
            circuit_breakers: Mapping of provider name to its CircuitBreakerState.
        """
        self._order = providers
        self._breakers = circuit_breakers

    def execute_with_fallback(
        self,
        query_text: str,
        llm_fn,
        max_retries: int = 2,
    ) -> Optional[str]:
        """Try providers in order, falling back on failure.

        Iterates through the provider list, skipping any with an open circuit
        breaker that hasn't reached its recovery window. Records success or
        failure metrics for each attempt.

        Args:
            query_text: The query to send to the LLM provider.
            llm_fn: Callable accepting (provider_name, query_text) -> response string.
            max_retries: Maximum number of fallback attempts before giving up.

        Returns:
            The successful result string, or None if all providers failed.

        Raises:
            ProviderError: If all providers in the chain fail after retries are exhausted.
        """
        for i, provider_name in enumerate(self._order):
            breaker = self._breakers[provider_name]

            # Skip if circuit is open and recovery period hasn't elapsed
            if not breaker.closed:
                elapsed = time.time() - breaker.last_failure_time
                if elapsed < breaker.recovery_threshold_minutes * 60:
                    continue
                else:
                    # Recovery attempt: close circuit temporarily
                    breaker.closed = True

            try:
                start = time.time()
                result = llm_fn(provider_name, query_text)
                latency = (time.time() - start) * 1000

                # Success — reset failure counters for this provider
                self._record_success(provider_name, latency)
                return result

            except Exception as e:
                self._record_failure(provider_name)

                if i == len(self._order) - 1 or max_retries <= 0:
                    raise ProviderError(
                        f"All fallback providers failed. Last error: {e}"
                    ) from e

    def _record_success(self, provider: str, latency_ms: float) -> None:
        """Record a successful request for metrics tracking.

        Resets consecutive failure counters and reduces the overall failure count
        to improve the provider's health score over time.

        Args:
            provider: The provider name that succeeded.
            latency_ms: The measured response latency in milliseconds.
        """
        breaker = self._breakers[provider]
        breaker.consecutive_failures = 0
        breaker.failure_count = max(0, breaker.failure_count - 1)

    def _record_failure(self, provider: str) -> None:
        """Record a failed request and potentially trip the circuit breaker.

        Increments failure counters. If consecutive failures reach the threshold
        (3 by default), opens the circuit to block further requests for the
        recovery period.

        Args:
            provider: The provider name that failed.
        """
        breaker = self._breakers[provider]
        breaker.consecutive_failures += 1
        breaker.last_failure_time = time.time()

        # Open circuit after 3 consecutive failures — stop routing here
        if breaker.consecutive_failures >= 3:
            breaker.closed = False


class ProviderError(Exception):
    """Raised when all providers in a fallback chain fail.

    This exception indicates that the request could not be fulfilled by any
    available provider, meaning either all circuits are open or all retries
    have been exhausted.
    """
```

### Pattern 3: Divergence Detection and Reconciliation

Compares outputs from multiple providers for high-stakes tasks, detecting significant disagreements and applying a reconciliation strategy (confidence-weighted selection or human review escalation).

```python
from typing import Any


def detect_divergence(
    provider_a_result: str,
    provider_b_result: str,
    similarity_threshold: float = 0.8,
) -> dict[str, Any]:
    """Compare results from two providers and detect significant divergence.

    Uses token-level Jaccard similarity to determine whether two provider outputs
    agree closely enough to trust a single result. Below the threshold, the results
    are flagged as divergent and require reconciliation.

    Args:
        provider_a_result: The output string from the first provider.
        provider_b_result: The output string from the second provider.
        similarity_threshold: Minimum Jaccard similarity (0.0–1.0) to consider results consistent. Defaults to 0.8.

    Returns:
        A dict with keys: divergent (bool), similarity (float), unique_to_a (int), unique_to_b (int).
    """
    # Token-level set comparison for divergence signal
    tokens_a = set(provider_a_result.lower().split())
    tokens_b = set(provider_b_result.lower().split())

    if not tokens_a or not tokens_b:
        return {"divergent": True, "similarity": 0.0}

    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    similarity = len(intersection) / len(union) if union else 0.0

    return {
        "divergent": similarity < similarity_threshold,
        "similarity": round(similarity, 3),
        "unique_to_a": len(tokens_a - tokens_b),
        "unique_to_b": len(tokens_b - tokens_a),
    }


def reconcile_results(
    provider_a: str,
    result_a: str,
    confidence_a: float,
    provider_b: str,
    result_b: str,
    confidence_b: float,
    divergence_info: dict[str, Any],
) -> dict[str, Any]:
    """Reconcile divergent results from two LLM providers.

    Applies a tiered reconciliation strategy:
      1. If results agree (below divergence threshold), pick the higher-confidence provider.
      2. If results diverge but one confidence is significantly higher (>1.5×), use that provider.
      3. If results diverge with comparable confidences, flag for human review.

    Args:
        provider_a: Name of the first provider.
        result_a: Output from the first provider.
        confidence_a: Confidence score of the first provider's output (0.0–1.0).
        provider_b: Name of the second provider.
        result_b: Output from the second provider.
        confidence_b: Confidence score of the second provider's output (0.0–1.0).
        divergence_info: Output from detect_divergence() indicating similarity level.

    Returns:
        A dict with reconciled outcome: winner, confidence, result (if resolved),
        or needs_human_review flag (if unresolved).
    """
    # If results agree — pick the higher-confidence provider
    if not divergence_info["divergent"]:
        winner = provider_a if confidence_a > confidence_b else provider_b
        return {
            "reconciled": True,
            "winner": winner,
            "confidence": max(confidence_a, confidence_b),
            "result": result_a if confidence_a >= confidence_b else result_b,
        }

    # Results diverge — use confidence-weighted selection with 1.5× margin
    if confidence_a > confidence_b * 1.5:
        return {
            "reconciled": True,
            "winner": provider_a,
            "confidence": confidence_a,
            "result": result_a,
        }

    if confidence_b > confidence_a * 1.5:
        return {
            "reconciled": True,
            "winner": provider_b,
            "confidence": confidence_b,
            "result": result_b,
        }

    # Similar confidence with divergence — escalate to human review
    return {
        "reconciled": False,
        "needs_human_review": True,
        "provider_a": {"name": provider_a, "result": result_a, "confidence": confidence_a},
        "provider_b": {"name": provider_b, "result": result_b, "confidence": confidence_b},
        "similarity": divergence_info["similarity"],
    }
```

## Constraints

### MUST DO

1. Profile each provider with actual performance measurements — do not rely on published specs alone. Run benchmark queries across query types and record real latencies, error rates, and output quality scores.
2. Classify every query before routing — never send an unknown query type to a random provider. Unrecognized queries fall back to the ANALYSIS category with low confidence (0.3).
3. Maintain fallback chains for all critical queries — at least 2 providers per query type. Single-provider paths are single points of failure.
4. Log every routing decision with score breakdown, alternatives considered, and final choice. Logging is essential for post-hoc optimization and auditing.
5. Track real-time metrics per provider (latency, error rate, cost) and adjust routing thresholds accordingly. Stale profiles produce suboptimal routing.
6. Implement divergence detection for high-stakes tasks — compare outputs from at least 2 providers when the answer impacts business operations or financial decisions.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): early exit on budget exceedance, fail fast with circuit breaker on provider degradation, parse data at boundaries and trust it internally.
8. Document provider capabilities quarterly and retire profiles that have not been updated in > 90 days. Stale profiles degrade routing quality silently.

### MUST NOT DO

1. Route based solely on cost — the cheapest provider may produce poor-quality outputs for complex queries, causing downstream rework that negates any savings.
2. Include a single-provider fallback chain — if there is only one option, it is not a chain; it is a bottleneck waiting to fail.
3. Let a degraded provider stay in the active pool — circuit breaker must open automatically after threshold breaches (default: 3 consecutive failures or >10% error rate over 5 minutes).
4. Compare results from providers with different model generations (e.g., compare GPT-4 against GPT-4o-mini) — use equivalent tiers for fair divergence detection.
5. Skip logging of routing decisions — without observability, you cannot optimize your routing strategy or debug provider quality regressions.
6. Hard-code provider names in business logic — always route through the router. Direct provider calls bypass cost controls, fallback chains, and circuit breakers.

---

## Output Template

When this skill is active, deliver:

1. **Provider profiles** — Measured performance and cost data for each available LLM provider, including reasoning depth, domain strengths, latency benchmarks, and rate limits
2. **Query classifier** — Classification function with regex patterns and confidence scoring for at least 5 query types
3. **Routing decision engine** — Scoring function with configurable weights for domain strength, reasoning match, cost penalty, and latency penalty
4. **Fallback chains** — Ordered provider lists per query type with circuit breaker configuration (thresholds, recovery window)
5. **Divergence detection** — Comparison and reconciliation logic for multi-provider outputs, including Jaccard similarity and confidence-weighted selection
6. **Observability dashboard spec** — Metrics to track: per-provider latency distribution, error rate over rolling windows, cost per query type, routing distribution (% of queries sent to each provider), divergence rate

---

## Related Skills

| Skill | Purpose |
|---|---|
| `resource-optimization` | Broader model routing and resource allocation; this skill is specifically about multi-provider redundancy and fallback chains |
| `reasoning-engine-internals` | Explains how reasoning engines work under the hood; this skill routes between them at an external orchestration layer |
| `budget-aware-cost-management` | Tracks costs across providers and enforces spending limits; this skill makes the routing decisions that determine those costs |

> 📖 skill(local cache): resource-optimization, reasoning-engine-internals, budget-aware-cost-management