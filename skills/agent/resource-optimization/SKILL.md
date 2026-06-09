---
name: resource-optimization
description: Dynamically routes agent work based on cost, budget constraints, latency requirements, and query complexity using LLM-driven model selection with feedback-loop optimization for efficient resource utilization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: resource optimization, model routing, cost-aware agents, budget constraints, latency optimization, query complexity, how do i optimize agent costs, feedback-driven optimization
  related-skills: routing-patterns, parallelization, planning-patterns
  archetypes: tactical, orchestration, generation
  anti_triggers: brainstorming, vague ideation, one-off scripts
  response_profile:
      verbosity: medium
      directive_strength: high
---

# Resource-Aware Optimization Pattern

Dynamically routes and executes agent workloads by classifying query complexity, selecting the most appropriate LLM model for each task, and continuously optimizing resource allocation through a critique-feedback loop. This skill makes the model implement cost-aware routing architectures that balance response quality against computational, temporal, and financial constraints.

## TL;DR Checklist

- [ ] Classify every incoming query into exactly one category: `simple`, `reasoning`, or `internet_search`
- [ ] Route simple queries to lightweight models (e.g., gpt-4o-mini, gemini-flash)
- [ ] Route reasoning queries to powerful models (e.g., o4-mini, gemini-pro)
- [ ] Route internet_search queries to capable models with search context injected
- [ ] Implement fallback mechanisms for model failures and rate limits
- [ ] Log routing decisions with cost, latency, and quality metrics
- [ ] Review critique feedback to refine router classification thresholds

---

## When to Use

Use this skill when:

- Building agentic systems where API costs are a primary concern and need systematic reduction
- Designing multi-agent architectures that span models of different capability tiers (e.g., Gemini Flash + Gemini Pro, or gpt-4o-mini + o4-mini)
- Operating under strict financial budgets for LLM calls or constrained computational resources on edge devices
- Building latency-sensitive applications where response time matters more than maximum reasoning quality for straightforward queries
- Deploying agents that must gracefully degrade when primary models are throttled, overloaded, or unavailable
- Implementing learned resource allocation policies that improve routing accuracy over time via feedback

---

## When NOT to Use

Avoid this skill for:

- Single-turn, one-off scripts where routing overhead exceeds the cost savings (a simple if/else suffices)
- Tasks where response quality is non-negotiable regardless of cost — always route to the best model unconditionally
- Environments without an LLM API available to perform the classification step (the classifier itself costs tokens)
- Ultra-low-latency systems (<100ms response budget) where even lightweight model routing adds unacceptable delay

---

## Core Workflow

1. **Ingest and Classify Query** — Receive the user prompt, send it through a classification LLM (e.g., gpt-4o at temperature 0) that returns one of three categories: `simple` (direct factual answers), `reasoning` (logic, math, multi-step inference), or `internet_search` (current events, recent data). Use structured JSON output for reliable parsing. **Checkpoint:** Verify the classification response contains a valid `classification` key matching one of the three allowed values before proceeding.

2. **Select Model and Tooling** — Based on the classification, choose the model tier:
   - `simple` → lightweight, cost-effective model (e.g., gpt-4o-mini) with no search context
   - `reasoning` → powerful reasoning model (e.g., o4-mini or gemini-pro) with full prompt context
   - `internet_search` → capable model (e.g., gpt-4o) with web search results injected as context
   If the task involves external tool use, select the most efficient API based on cost, latency, and execution time. **Checkpoint:** Confirm the selected model is available and within budget before making the call.

3. **Execute with Fallback Chain** — Attempt the primary model selection. If it fails (rate limit, timeout, service unavailable), automatically retry through a pre-defined fallback chain (e.g., gpt-4o-mini → gpt-4o → gemini-flash). Implement exponential backoff between retries. **Checkpoint:** Verify the response is non-empty and well-formed before returning; if all fallbacks fail, return a graceful degradation message with partial results.

4. **Critique and Log** — Run a Critique Agent that evaluates the generated response against the original query for factual accuracy, completeness, and relevance. Log every decision point: classification result, model selected, tokens consumed, latency, critique score, and whether a fallback was triggered. Store this in a structured format (e.g., JSON lines file or database) for training future routing improvements. **Checkpoint:** Ensure at least the following fields are recorded per execution: `query_hash`, `classification`, `model`, `tokens_input`, `tokens_output`, `latency_ms`, `fallback_used`, `critique_score`.

5. **Refine Router via Feedback** — Periodically analyze logged routing decisions to identify misrouted queries (e.g., simple queries that hit the Pro model, or complex queries routed to Flash that produced inadequate responses). Adjust classification thresholds, add prompt engineering refinements, or fine-tune the classifier on corrected examples. Implement learned resource allocation policies that shift weight toward historically successful routing patterns. **Checkpoint:** Validate that feedback-driven adjustments reduce overall cost per query by at least 5% compared to the previous routing policy.

---

## Implementation Patterns

### Pattern 1: LLM-Driven Query Router with OpenAI

Classify incoming prompts using a dedicated classifier endpoint, then route to the optimal model based on complexity category. This pattern uses OpenAI's API with structured JSON output for reliable parsing.

```python
"""Resource-aware query router using OpenAI API for classification and model selection."""

import os
import json
import time
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional
from openai import OpenAI


# --- Configuration ---
@dataclass
class RoutingConfig:
    """Configuration for resource-aware routing decisions."""
    simple_model: str = "gpt-4o-mini"
    reasoning_model: str = "o4-mini"
    search_model: str = "gpt-4o"
    classifier_model: str = "gpt-4o"
    max_fallback_attempts: int = 3
    base_retry_delay_ms: int = 500


# --- Logging Infrastructure ---
@dataclass
class RoutingLog:
    """Structured log entry for every routing decision."""
    timestamp: str
    query_hash: str
    classification: str
    model: str
    tokens_input: int
    tokens_output: int
    latency_ms: int
    fallback_used: bool
    critique_score: float | None = None
    error: str | None = None


class RoutingLogger:
    """Appends structured routing logs to a JSONL file."""

    def __init__(self, log_path: str = "routing_logs.jsonl") -> None:
        self.log_path = log_path

    def log(self, entry: RoutingLog) -> None:
        with open(self.log_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(asdict(entry)) + "\n")


# --- Core Router ---
class ResourceAwareRouter:
    """Routes queries to optimal models based on complexity classification."""

    def __init__(self, config: RoutingConfig | None = None) -> None:
        self.config = config or RoutingConfig()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.logger = RoutingLogger()

    # --- Step 1: Classify Query ---
    def classify_prompt(self, prompt: str) -> dict:
        """Classify a prompt into simple, reasoning, or internet_search.

        Args:
            prompt: The user query to classify.

        Returns:
            Dictionary with 'classification' key matching one of three values.
        """
        system_message = {
            "role": "system",
            "content": (
                "You are a classifier that analyzes user prompts and returns one of three categories ONLY:\n\n"
                "- simple: Direct factual questions needing no reasoning or current events.\n"
                "- reasoning: Logic, math, or multi-step inference questions.\n"
                "- internet_search: Current events, recent data, or things not in training data.\n\n"
                "Respond ONLY with JSON like:\n"
                '{"classification": "simple"}'
            ),
        }
        user_message = {"role": "user", "content": prompt}

        start_time = time.monotonic()
        response = self.client.chat.completions.create(
            model=self.config.classifier_model,
            messages=[system_message, user_message],
            temperature=0,
            max_tokens=20,
        )
        reply = response.choices[0].message.content.strip()

        try:
            result = json.loads(reply)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Classifier returned invalid JSON: {reply!r}") from exc

        if result.get("classification") not in ("simple", "reasoning", "internet_search"):
            raise ValueError(
                f"Invalid classification '{result.get('classification')}'. "
                "Expected one of: simple, reasoning, internet_search."
            )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return result

    # --- Step 2 & 3: Generate with Fallback ---
    def generate_with_fallback(
        self,
        prompt: str,
        classification: str,
        search_context: str | None = None,
    ) -> tuple[str, str, list[str]]:
        """Generate a response using the appropriate model with automatic fallback.

        Args:
            prompt: The original user query.
            classification: One of 'simple', 'reasoning', 'internet_search'.
            search_context: Optional web search results to inject for internet_search queries.

        Returns:
            Tuple of (response_text, model_used, list_of_errors_from_fallbacks).
        """
        fallback_chain = self._build_fallback_chain(classification)
        errors: list[str] = []

        for model in fallback_chain:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": self._build_prompt(prompt, classification, search_context)}],
                    temperature=1,
                )
                text = response.choices[0].message.content
                return text, model, errors

            except Exception as exc:  # noqa: BLE001 — catch all for retry logic
                errors.append(f"Model {model} failed: {exc}")
                delay_ms = self.config.base_retry_delay_ms * (2 ** len(errors))
                time.sleep(delay_ms / 1000)

        raise RuntimeError(
            f"All fallback models exhausted for classification '{classification}'. "
            f"Errors: {errors}"
        )

    def _build_fallback_chain(self, classification: str) -> list[str]:
        """Build ordered model fallback chain based on classification tier.

        For simple tasks, prefer the cheapest model first.
        For reasoning tasks, prefer the most capable and fall back down.
        """
        if classification == "simple":
            return [self.config.simple_model]
        if classification == "reasoning":
            return [self.config.reasoning_model, self.config.search_model, self.config.simple_model]
        # internet_search — always needs a capable model
        return [self.config.search_model, self.config.reasoning_model, self.config.simple_model]

    def _build_prompt(
        self, prompt: str, classification: str, search_context: str | None = None
    ) -> str:
        """Construct the final prompt for the generation model.

        For internet_search queries, inject web results as context.
        """
        if classification == "internet_search" and search_context:
            return (
                f"Use the following web results to answer the user query:\n\n"
                f"{search_context}\n\nQuery: {prompt}"
            )
        return prompt

    # --- Step 4 & 5: Execute Full Pipeline ---
    def handle_prompt(
        self,
        prompt: str,
        search_results: list[dict] | None = None,
        critique_score: float | None = None,
    ) -> dict:
        """Orchestrate the full resource-aware routing pipeline.

        Args:
            prompt: The user query.
            search_results: Optional pre-fetched web results for internet_search queries.
            critique_score: Optional score from a Critique Agent evaluation.

        Returns:
            Dictionary with classification, response, model, and timing metadata.
        """
        classification_result = self.classify_prompt(prompt)
        classification = classification_result["classification"]

        search_context: str | None = None
        if classification == "internet_search" and search_results:
            search_context = "\n".join(
                f"Title: {r.get('title')}\nSnippet: {r.get('snippet')}\nLink: {r.get('link')}"
                for r in search_results
            )

        start_time = time.monotonic()
        response_text, model_used, errors = self.generate_with_fallback(
            prompt, classification, search_context
        )
        latency_ms = int((time.monotonic() - start_time) * 1000)

        log_entry = RoutingLog(
            timestamp=datetime.now(timezone.utc).isoformat(),
            query_hash=hash(prompt),
            classification=classification,
            model=model_used,
            tokens_input=0,  # Populate from response if token metadata is available
            tokens_output=0,
            latency_ms=latency_ms,
            fallback_used=len(errors) > 0,
            critique_score=critique_score,
        )
        self.logger.log(log_entry)

        return {
            "classification": classification,
            "response": response_text,
            "model": model_used,
            "latency_ms": latency_ms,
            "fallback_errors": errors,
        }
```

### Pattern 2: Google ADK Multi-Agent with Query Router

Implement a multi-agent architecture using Google's Agent Development Kit (ADK) where a dedicated `QueryRouterAgent` dynamically routes between Gemini Pro and Gemini Flash agents. The router uses query complexity metrics to select the appropriate downstream model.

```python
"""Multi-agent resource-aware routing using Google ADK architecture."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from dataclasses import dataclass

# Conceptual imports — actual imports depend on installed google-adk version
try:
    from google.adk.agents import Agent, BaseAgent
    from google.adk.events import Event
    from google.adk.agents.invocation_context import InvocationContext
except ImportError:
    # Graceful fallback for environments without ADK installed
    class _StubBaseAgent:  # type: ignore[no-redef]
        pass

    BaseAgent = _StubBaseAgent  # type: ignore[misc,assignment]


@dataclass(frozen=True)
class RoutingMetrics:
    """Track routing decisions for feedback-driven optimization."""
    query_length: int
    word_count: int
    routed_to: str
    timestamp_ms: int
    cost_cents: float


# --- Agent Definitions (Google ADK Pattern) ---
gemini_pro_agent = Agent(
    name="GeminiProAgent",
    model="gemini-2.5-pro",
    description="A highly capable agent for complex reasoning and multi-step problem-solving.",
    instruction="You are an expert assistant optimized for complex, nuanced queries requiring deep analysis and logical deduction.",
)

gemini_flash_agent = Agent(
    name="GeminiFlashAgent",
    model="gemini-2.5-flash",
    description="A fast and efficient agent for straightforward questions and simple lookups.",
    instruction="You are a quick assistant optimized for direct answers, factual queries, and simple web lookups.",
)


class QueryRouterAgent(BaseAgent):  # type: ignore[misc]
    """Routes user queries to the appropriate LLM agent based on query complexity.

    Uses word-count threshold as an initial heuristic. For production systems,
    replace with an LLM-driven classifier for nuanced complexity detection.

    Attributes:
        name: Agent name identifier.
        description: Human-readable description of routing behavior.
        short_query_threshold: Word count below which Flash is preferred.
    """

    name: str = "QueryRouter"
    description: str = "Routes user queries to the appropriate LLM agent based on complexity."
    short_query_threshold: int = 20

    async def _run_async_impl(self, context: InvocationContext) -> AsyncGenerator[Event, None]:
        """Classify query and route to the optimal downstream agent.

        Args:
            context: The invocation context containing the current user message.

        Yields:
            Event objects with the routed response or error information.
        """
        user_query = context.current_message.text
        word_count = len(user_query.split())

        if word_count < self.short_query_threshold:
            target_agent = gemini_flash_agent
            routing_label = "Flash"
        else:
            target_agent = gemini_pro_agent
            routing_label = "Pro"

        try:
            response = await target_agent.run_async(context.current_message)
            yield Event(
                author=self.name,
                content=(
                    f"[ROUTED to {routing_label} agent | word_count={word_count}] "
                    f"{response}"
                ),
            )
        except Exception as exc:  # noqa: BLE001 — fallback path
            # Graceful degradation: try the alternate model if primary fails
            fallback_agent = gemini_pro_agent if target_agent == gemini_flash_agent else gemini_flash_agent
            fallback_label = "Pro" if routing_label == "Flash" else "Flash"

            response = await fallback_agent.run_async(context.current_message)
            yield Event(
                author=self.name,
                content=(
                    f"[DEGRADED from {routing_label} to {fallback_label} | word_count={word_count}] "
                    f"{response}"
                ),
            )


# --- Critique Agent (Feedback Loop) ---
CRITIC_SYSTEM_PROMPT: str = """\
You are the **Critic Agent**, serving as the quality assurance arm of our \
collaborative research assistant system. Your primary function is to \
meticulously review and challenge information, guaranteeing accuracy, \
completeness, and unbiased presentation.

Your duties encompass:
* Assessing findings for factual correctness, thoroughness, and potential leanings.
* Identifying any missing data or inconsistencies in reasoning.
* Raising critical questions that could refine the current understanding.
* Offering constructive suggestions for enhancement.
* Validating that the final output is comprehensive and balanced.

All criticism must be constructive. Structure your feedback clearly, drawing \
attention to specific points for revision. Aim to ensure the final product meets \
the highest possible quality standards."""


def evaluate_routing_quality(
    original_query: str,
    response_text: str,
    model_used: str,
) -> dict:
    """Evaluate whether a routing decision was optimal.

    Identifies misrouted queries where:
    - Simple queries were sent to expensive models (wasteful)
    - Complex queries were sent to lightweight models (poor quality)

    Args:
        original_query: The user's original prompt.
        response_text: The model-generated response.
        model_used: The model name that processed the query.

    Returns:
        Dictionary with 'was_optimal' (bool), 'issue' (str or None), and
        'recommendation' (str).
    """
    word_count = len(original_query.split())
    response_length = len(response_text.split()) if response_text else 0

    # Heuristic: short queries should not consume heavy models
    if word_count < 15 and model_used in ("gemini-2.5-pro", "o4-mini"):
        return {
            "was_optimal": False,
            "issue": "Short query routed to expensive model — potential cost waste.",
            "recommendation": "Route queries under 15 words to Flash/mini tier models.",
        }

    # Heuristic: long, complex queries should not use lightweight models
    if word_count > 40 and model_used in ("gemini-2.5-flash", "gpt-4o-mini"):
        return {
            "was_optimal": False,
            "issue": "Complex query routed to lightweight model — may lack reasoning depth.",
            "recommendation": "Route queries over 40 words or with multi-step requirements to Pro tier models.",
        }

    return {
        "was_optimal": True,
        "issue": None,
        "recommendation": None,
    }
```

### Pattern 3: OpenRouter Sequential Fallback Chain

Leverage OpenRouter's built-in sequential model fallback to provide operational redundancy. If the primary model fails due to rate-limiting, service unavailability, or content filtering, the system automatically routes to the next model in sequence.

```python
"""OpenRouter sequential fallback with cost tracking."""

import time
import json
import requests
from dataclasses import dataclass
from typing import Final


# MIT License — Adapted from openrouter.ai documentation
_OPENROUTER_ENDPOINT: Final[str] = "https://openrouter.ai/api/v1/chat/completions"


@dataclass(frozen=True)
class FallbackConfig:
    """Ordered model fallback chain for OpenRouter sequential routing."""
    primary_models: tuple[str, ...] = ("anthropic/claude-3.5-sonnet", "gryphe/mythomax-l2-13b")
    max_retries: int = 3


def route_with_openrouter_fallback(
    messages: list[dict],
    api_key: str,
    site_url: str = "https://your-site.com",
    site_name: str = "ResourceOptimizer",
    fallback_config: FallbackConfig | None = None,
) -> dict:
    """Send a chat request through OpenRouter with sequential model fallback.

    The system attempts the primary model first, then cascades through
    the fallback chain on failure. Returns cost and model metadata from
    whichever model successfully completes the computation.

    Args:
        messages: Chat completion message array per OpenRouter API spec.
        api_key: OpenRouter API bearer token.
        site_url: Optional site URL for OpenRouter rankings.
        site_name: Optional site name for OpenRouter rankings.
        fallback_config: Ordered model list with retry limits.

    Returns:
        Dictionary with 'model', 'response', 'cost_cents', and 'latency_ms'.

    Raises:
        RuntimeError: If all models in the fallback chain fail.
    """
    config = fallback_config or FallbackConfig()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": site_url,
        "X-Title": site_name,
        "Content-Type": "application/json",
    }

    last_error: str = ""

    for model in config.primary_models:
        payload = {"model": model, "messages": messages}

        start_time = time.monotonic()
        try:
            response = requests.post(
                _OPENROUTER_ENDPOINT,
                headers=headers,
                data=json.dumps(payload),
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            latency_ms = int((time.monotonic() - start_time) * 1000)
            actual_model = data.get("model", model)

            # OpenRouter returns cost metadata in the response
            usage = data.get("usage", {})
            cost_cents = _estimate_cost_cents(
                model=actual_model,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
            )

            return {
                "model": actual_model,
                "response": data["choices"][0]["message"]["content"],
                "cost_cents": cost_cents,
                "latency_ms": latency_ms,
                "fallback_used": False,
            }

        except requests.exceptions.RequestException as exc:  # noqa: BLE001
            last_error = str(exc)
            continue

    raise RuntimeError(
        f"All {len(config.primary_models)} models in fallback chain failed. "
        f"Last error: {last_error}"
    )


def _estimate_cost_cents(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate API cost in cents based on model and token counts.

    Approximate per-token pricing — adjust for your provider's actual rates.
    """
    pricing = {
        "openrouter/auto": {"prompt": 0.001, "completion": 0.002},
        "anthropic/claude-3.5-sonnet": {"prompt": 0.003, "completion": 0.015},
    }

    rates = pricing.get(model, {"prompt": 0.001, "completion": 0.002})
    return (prompt_tokens * rates["prompt"] + completion_tokens * rates["completion"]) / 100
```

---

## BAD vs GOOD Examples

### Pattern Classification — BAD vs GOOD

```python
# ❌ BAD — No classification, always use the most expensive model
def handle_query_bad(query: str) -> str:
    """Always routes to the most capable model regardless of complexity."""
    response = client.chat.completions.create(
        model="gpt-4o",  # Expensive for every single query
        messages=[{"role": "user", "content": query}],
    )
    return response.choices[0].message.content


# ✅ GOOD — Classify first, then route to the optimal model tier
def handle_query_good(query: str) -> dict:
    """Classifies complexity and routes to cost-appropriate models."""
    classification = classify_prompt(query)["classification"]

    if classification == "simple":
        model = "gpt-4o-mini"      # Cheapest tier — 1/10th the cost
    elif classification == "reasoning":
        model = "o4-mini"           # Reasoning-optimized
    else:
        model = "gpt-4o"            # Capable model for search queries

    return {"model": model, "classification": classification}
```

### Fallback Handling — BAD vs GOOD

```python
# ❌ BAD — No fallback; single failure point causes total system outage
def generate_response_no_fallback(prompt: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",  # Only one model — fails hard if throttled
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


# ✅ GOOD — Cascading fallback with exponential backoff and graceful degradation
def generate_response_with_fallback(prompt: str, budget_tier: str) -> tuple[str, str]:
    """Try primary model, cascade through fallbacks on failure."""
    models = _get_fallback_chain(budget_tier)  # e.g., ["gpt-4o", "gpt-4o-mini", "gemini-flash"]

    for attempt, model in enumerate(models):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content, model
        except Exception as exc:
            delay_ms = 500 * (2 ** attempt)
            time.sleep(delay_ms / 1000)

    # All models exhausted — degrade gracefully
    return "Service temporarily unavailable. Please retry shortly.", "degraded"
```

### Context Management — BAD vs GOOD

```python
# ❌ BAD — Send entire conversation history every time; wastes tokens and increases cost
def chat_bad(conversation_history: list[dict], new_query: str) -> str:
    # No pruning — context grows unbounded, costs escalate with each turn
    full_context = conversation_history + [{"role": "user", "content": new_query}]
    return client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_context,  # Grows linearly — O(n) token cost per turn
    ).choices[0].message.content


# ✅ GOOD — Summarize and prune history to retain only relevant context
def chat_good(conversation_history: list[dict], new_query: str) -> tuple[str, list[dict]]:
    """Prune conversation history to manage token budget while retaining key context."""
    if len(conversation_history) <= 6:
        # Small context — keep all turns
        full_context = conversation_history + [{"role": "user", "content": new_query}]
    else:
        # Large context — summarize older turns, retain recent ones
        recent_turns = conversation_history[-4:]  # Last 2 exchanges
        summary_prompt = f"Summarize the following conversation in 3 sentences:\n{conversation_history[:2]}"
        summary_resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": summary_prompt}],
        )
        summary = summary_resp.choices[0].message.content
        full_context = [{"role": "system", "content": f"Conversation summary: {summary}"}] + recent_turns
        full_context.append({"role": "user", "content": new_query})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=full_context,
    )
    updated_history = conversation_history + [{"role": "user", "content": new_query}, {"role": "assistant", "content": response.choices[0].message.content}]
    return response.choices[0].message.content, updated_history
```

---

## Constraints

### MUST DO

1. **Classify every query** before model selection — never skip the routing step even for single-agent deployments. The classifier adds ~$0.001 per call but saves 5–80% on model costs depending on workload distribution. Reference `code-philosophy` law of Early Exit: guard clause for empty or malformed queries before classification.

2. **Maintain a fallback chain** with at least one alternate model per tier. When the primary model fails (rate limit, timeout, service unavailable), automatically cascade to the next available model. Reference `code-philosophy` law of Fail Fast: invalid states halt with descriptive errors — never leave the user hanging.

3. **Log every routing decision** with classification result, model used, tokens consumed, latency, and whether a fallback was triggered. Store in a structured format for feedback-loop analysis and router refinement. Reference `code-philosophy` law of Parse Don't Validate: parse at boundaries (JSON responses from classifier), trust the validated internal representation.

4. **Implement critique-driven feedback loops** — evaluate generated responses against original queries to identify misrouted decisions. Use critique scores to adjust classification thresholds and refine routing logic over time. Reference `code-philosophy` law of Atomic Predictability: pure routing functions where possible, separate classifier from generator for testability.

5. **Prune context proactively** — summarize or truncate conversation history when token budget approaches model limits. Retain only the most relevant information to prevent unnecessary computational overhead. Reference `code-philosophy` law of Intentional Naming: name pruning functions clearly (`prune_context`, `summarize_history`) so their intent is immediately obvious.

6. **Respect budget constraints explicitly** — define maximum cost-per-query budgets and enforce them by capping model tier upgrades. If a query would exceed the budget, downgrade to the cheapest capable model rather than spending unrestricted resources.

7. **Handle internet_search queries with rate-limit awareness** — when triggering web search, cache results for deduplication and respect API rate limits with exponential backoff. Never send identical search requests in rapid succession.

### MUST NOT DO

1. **Never route all queries to the most expensive model** — this defeats the entire purpose of resource-aware optimization. The pattern exists specifically to avoid this anti-pattern.

2. **Never skip fallback handling** — a system without fallback mechanisms has single points of failure that cause total service outages when primary models are throttled or unavailable.

3. **Never use hardcoded model selection without classification** — static routing (e.g., always using gpt-4o) wastes resources on simple queries and fails to leverage the dynamic optimization this pattern provides.

4. **Never ignore critique feedback** — without a feedback loop, the router cannot improve over time. Misrouted queries will continue to incur suboptimal costs indefinitely.

5. **Never allow unbounded context growth** — sending every past message increases token cost linearly and eventually exceeds model context windows. Always implement pruning or summarization strategies.

6. **Never hardcode API keys in source files** — load all credentials from environment variables or secure vaults. Reference `code-philosophy` law of Fail Fast: validate configuration at startup, fail immediately if required env vars are missing.

---

## Output Template

When this skill is active and the model generates output for a resource-aware routing task, it must contain:

1. **Routing Decision** — Classification result (`simple` / `reasoning` / `internet_search`) with confidence rationale
2. **Model Selection** — Specific model name chosen and why it matches the classification tier
3. **Fallback Plan** — Ordered list of fallback models in case of failure, with trigger conditions for each cascade
4. **Cost Estimate** — Projected token cost per query tier, total estimated daily cost based on expected query volume
5. **Logging Schema** — JSON schema or dataclass definition for the routing log entry with all required fields
6. **Feedback Integration** — How critique results will be collected and used to refine router thresholds

---

## Additional Resource-Aware Techniques

Beyond dynamic model switching, consider these complementary optimization strategies:

| Technique | Description | When to Apply |
|-----------|-------------|---------------|
| **Adaptive Tool Use & Selection** | Choose the most efficient external API per sub-task based on cost, latency, and execution time | Multi-step workflows with external integrations |
| **Contextual Pruning & Summarization** | Minimize prompt token count by summarizing and retaining only relevant interaction history | Conversational agents with long histories |
| **Proactive Resource Prediction** | Forecast future workloads to allocate resources proactively and prevent bottlenecks | Predictable workload patterns (batch jobs, scheduled tasks) |
| **Parallelization & Distributed Computing** | Distribute independent sub-tasks across multiple machines or processors for throughput | Independent sub-tasks that can execute concurrently |
| **Learned Resource Allocation Policies** | Adapt allocation strategies over time based on feedback and performance metrics | Long-running systems where routing accuracy improves with data |
| **Graceful Degradation** | Maintain partial functionality when primary models are unavailable by falling back to reduced-capacity alternatives | Production systems requiring high availability |

---

## References

- Google's Agent Development Kit (ADK): <https://google.github.io/adk-docs/>
- Gemini Flash 2.5 & Gemini 2.5 Pro: <https://aistudio.google.com/>
- OpenRouter API Docs: <https://openrouter.ai/docs/quickstart>
- OpenRouter Rankings: <https://openrouter.ai/rankings>
