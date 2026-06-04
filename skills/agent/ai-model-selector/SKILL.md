---
name: ai-model-selector
description: Selects the optimal LLM model for a specific task by evaluating capability requirements against cost, latency, context window, and quality needs across all major providers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: ai model selection, GPT-4o vs Claude, choose AI model, model comparison, best model for task, LLM routing, o3 vs sonnet, how do i choose an LLM
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types: [guidance, examples, do-dont, diagrams]
  related-skills: ai-framework-selector, framework-selection, multi-model-routing, tool-use-function-calling
---

# AI Model Selector

Selects the optimal LLM model for a specific task by analyzing task complexity, latency requirements, cost constraints, and quality expectations. When this skill is active, the model acts as an AI infrastructure architect who evaluates all available models against project requirements and produces a defensible selection with routing strategy.

## TL;DR Checklist

- [ ] Decompose task into dimensions: complexity, latency budget, volume, context length
- [ ] Evaluate at least 3 candidate models across different providers — never select from one vendor alone
- [ ] Separate task capability needs from cost and latency as independent scoring dimensions
- [ ] Apply the Task-Type Decision Tree to narrow candidates before scoring
- [ ] Build a Capability Scoring Matrix with explicit weights per dimension
- [ ] Document benchmark-your-workload principle — leaderboards don't predict real-world performance
- [ ] Recommend a fallback model for every selection decision
- [ ] Validate provider API availability and rate limits before finalizing

---

## When to Use

Use this skill when:

- Choosing between GPT-4o, Claude Sonnet/Opus, Gemini 2.5 Pro, or o3 for a coding task and you need a data-driven recommendation
- Selecting a model for a RAG pipeline that requires long context windows (>200K tokens)
- Deciding on the appropriate cost tier for high-volume classification or summarization workloads
- Planning a multi-model fallback architecture with degradation paths
- Evaluating open-source models (Llama, Qwen, Mistral) against hosted options for privacy or cost reasons
- Comparing latency-sensitive vs. quality-focused model choices for production inference
- Justifying model selection to stakeholders with explicit trade-off analysis

---

## When NOT to Use

Avoid this skill for:

- **Framework selection** — Choose the application framework (LangChain, LlamaIndex, etc.) instead → use `ai-framework-selector`
- **Software framework comparison** — Selecting between React, Vue, or Angular → use `framework-selection`
- **Already provider-locked scenarios** — When a single vendor contract covers all models and no cross-vendor evaluation is needed
- **Model training/fine-tuning decisions** — This skill covers inference-time model selection, not pre-training or fine-tuning strategy
- **Hardware/infrastructure provisioning** — Choosing GPUs, TPUs, or cloud instances → that's an infrastructure concern

---

## Core Workflow

```
  ┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
  │ Task Requirements│────►│ Capability           │────►│ Candidate        │
  │ (complexity,     │     │ Classification       │     │ Shortlist        │
  │  latency, cost)  │     │ (coding, reasoning,  │     │ (3+ cross-       │
  │                 │     │  RAG, creative, etc.) │     │  provider models)│
  └─────────────────┘     └──────────────────────┘     └────────┬─────────┘
                                                                │
                                                                ▼
  ┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
  │ Fallback Model  │◄────│ Selection Decision   │◄────│ Capability       │
  │ Recommendation  │     │ (winner, runner-up,  │     │ Scoring Matrix   │
  │ & Degradation   │     │  score gap)          │     │ (model × dim)    │
  └─────────────────┘     └──────────────────────┘     └──────────────────┘
```

1. **Gather Task Requirements** — Elicit or infer: task type, expected complexity, latency budget, daily request volume, context window needs, output length constraints, and cost ceiling. **Checkpoint:** All five dimensions must have concrete values before proceeding. If any dimension is unknown, flag it explicitly in the output and proceed with assumptions noted.

2. **Classify Task Capabilities** — Map the task to one or more capability categories from the Task-Type Decision Tree (section below). A task may span multiple categories (e.g., coding + long-document review). **Checkpoint:** The primary category drives the initial candidate narrowing; secondary categories inform scoring weights.

3. **Build Candidate Shortlist** — Select at least 3 models across different providers that cover your capability requirements. Never shortlist only from a single vendor ecosystem. Include at least one open-source option if on-premise or cost-sensitive deployment is in scope. **Checkpoint:** If no model meets the minimum latency requirement, escalate to discuss architecture changes (caching, pre-processing, smaller models).

4. **Score Each Candidate** — Build a Capability Scoring Matrix using weighted dimensions:
   - **Task Fit** (weight 0–1): How well the model excels at this specific capability category
   - **Latency Adequacy** (weight 0–1): Whether the model's typical p50 latency meets the budget
   - **Cost Efficiency** (weight 0–1): Cost per million tokens relative to expected volume budget
   - **Context Window** (weight 0–1): Whether the context window accommodates worst-case input + output
   - **Ecosystem Maturity** (weight 0–1): SDK support, community size, known production issues

   **Checkpoint:** The winner must have a score gap of at least 0.15 over the runner-up on the primary dimension. If scores are too close (<0.10 gap), recommend A/B testing with real workload data.

5. **Make Selection Decision** — Choose the model with highest composite score weighted by your priority dimensions. Document the winner, runner-up, and exact score gap. Note any concerns about the selected model's reliability or known limitations.

6. **Design Fallback Architecture** — Select a degradation path:
   - **Primary → Secondary**: Slightly slower or more expensive alternative for quality fallback
   - **Primary → Tertiary (fast path)**: Cheaper, faster model for degraded throughput during primary outages
   - **Circuit breaker**: Define failure thresholds that trigger automatic model switching
   **Checkpoint:** Every production model selection must include at least one fallback. No exceptions.

### Fallback & Error Routing

```
                  ┌─────────────────────┐
                  │  Model API Call     │
                  └──────────┬──────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
          Success      Rate Limit    Server Error
           (200)     (429 / quota)  (5xx / timeout)
                │            │            │
                ▼            ▼            ▼
          Return       Check circuit   Retry once with
          Result       breaker state   exponential backoff
                             │            │
                      Open? ──► Yes ──► Fallback Model
                      No  ──►     │
                    (retry)      ▼
                          Circuit Opens
                          after N failures
                              │
                              ▼
                      Tertiary / Fast-Path
                      Degraded Model
```

**Fallback model rules:**
- If primary model hits rate limits: switch to secondary model from same provider (same API key, no re-auth)
- If primary model server errors persist (>3 consecutive): activate tertiary fast-path model
- If both primary and secondary are unavailable: use cached responses or queue with exponential backoff
- Always log fallback activation with timestamp, error type, and duration for post-mortem analysis

---

## 2026 Model Landscape

### Hosted Models

**OpenAI:**
| Model | Context | Best For | Input / Output ($/1M) |
|-------|---------|----------|----------------------|
| GPT-4.1 | 1M tokens | Long-document, RAG, coding | $0.60 / $2.40 |
| GPT-4.1 Nano | 1M tokens | High-volume classification, cheap long-context | $0.075 / $0.30 |
| GPT-4o | 128K tokens | Balanced coding, writing, general-purpose | $2.50 / $10.00 |
| GPT-4.1 Mini | 1M tokens | Mid-tier long-context tasks | $0.15 / $0.60 |
| o3 | 200K tokens | Complex reasoning, math, proofs | $15.00 / $60.00 |
| o3-mini | 200K tokens | Budget reasoning tasks | $1.10 / $4.40 |

**Anthropic:**
| Model | Context | Best For | Input / Output ($/1M) |
|-------|---------|----------|----------------------|
| Claude Opus 3.5 | 200K tokens | Complex reasoning, strategic analysis | $15.00 / $75.00 |
| Sonnet 4 | 200K tokens | Coding, structured output, tool use | $3.00 / $15.00 |
| Sonnet 4 Standard | 200K tokens | Balanced cost/quality (new mid-tier) | $1.25 / $6.25 |
| Haiku 4 | 200K tokens | Fast classification, summarization, routing | $0.80 / $4.00 |

**Google:**
| Model | Context | Best For | Input / Output ($/1M) |
|-------|---------|----------|----------------------|
| Gemini 2.5 Pro | 1M tokens | Long-document RAG, multimodal, factual QA | $1.25 / $10.00 |
| Gemini 2.5 Flash | 1M tokens | Fast long-context tasks, cost-efficient scaling | $0.10 / $0.40 |
| Gemini 2.5 Ultra | 1M tokens | Maximum quality multimodal & reasoning | $3.75 / $15.00 |

### Open Source Models (self-hosted via vLLM, TGI, Ollama, Groq)

| Model | Params | Best For | Cost (per 1M input, self-hosted) |
|-------|--------|----------|---------------------------------|
| Llama 3.3 70B | 70B | Best open model per-dollar, coding, reasoning | ~$0.20 (Groq), near-zero (own infra) |
| Llama 4 Maverick | ~100B+ | Next-gen open reasoning & multilingual | Varies by deployment |
| Qwen 2.5 72B | 72B | Strong multilingual, coding, math | ~$0.30 (Groq) |
| Qwen 3 (latest) | Various | Cutting-edge open benchmark leader | Varies |
| Mistral Large 2 | 123B | European compliance, multilingual, coding | ~$0.30–$1.00 depending on provider |
| Llama 3.2 3B/11B | 3B / 11B | Edge devices, on-device inference | Near-zero (local) |

---

## Task-Type Routing Decision Tree

```
Task Type ──► Primary Recommendation ──► Alternatives
─────────────────────────────────────────────────────
Coding & Code Review     GPT-4.1         Claude Sonnet 4, o3-mini
                         Claude Sonnet 4  Llama 3.3 70B (self-hosted)

Complex Reasoning/Math   o3              Claude Opus 3.5
                         Claude Opus 3.5 Gemini 2.5 Pro

Long Document / RAG      Gemini 2.5 Pro  GPT-4.1 (1M context)
(>200K tokens)           GPT-4.1         Llama 3.3 + RAG infra

Creative/Writing         Claude Opus 3.5 GPT-4o, Sonnet 4
                         GPT-4o          Gemini 2.5 Ultra

Factual QA w/ Grounding  Gemini 2.5 Pro  GPT-4.1
                         GPT-4.1         Claude Sonnet 4

Multimodal (Video)       Gemini 2.5 Pro* Gemini 2.5 Ultra only
(only Google supports*)   Gemini 2.5 Ultra
                         *(as of early 2026, only Google offers native video understanding)

Edge / On-Device         Llama 3.2 8B    Qwen 2.5 7B
                         Qwen 2.5 7B     Mistral 7B Instruct

Fast Classification/     Haiku 4         GPT-4o-mini, Gemini 2.5 Flash,
Routing                   Llama 3.2       Llama 3.3 on Groq (high throughput)

Budget-Critical          Llama 3.3       GPT-4.1 Nano, Qwen 2.5,
Production               70B self-hosted Gemini 2.5 Flash
```

**Key insight:** The "best" model for any single task-type category varies based on your secondary requirements. A coding task that also requires 500K token context should go to GPT-4.1 over Claude Sonnet 4 despite both being strong coders, simply because the context window requirement is non-negotiable.

---

## Cost-Performance Matrix

```
Budget Tier       Models                          When to Choose
───────────────────────────────────────────────────────────
Ultra-Low         GPT-4o-mini ($0.15/M in)    >1M daily requests, simple classification
(<$0.15/M)        Haiku 4                       High-volume intent routing
                  Llama 3.2                     On-device or air-gapped deployment

Low               GPT-4.1 Nano ($0.075/M in)   Long-context at near-ultra-low cost
($0.08–$0.60/M)   Qwen 2.5                      Multilingual open-source option
                  Llama 3.3 on Groq             High-throughput self-hosted coding

Mid               GPT-4o ($2.50/M in)           General-purpose, balanced quality/cost
($0.60–$3.00/M)   Claude Sonnet 4               Structured output, tool use, API reliability
                  Gemini 2.5 Flash                Long-context at reasonable cost

High              Claude Opus 3.5 ($15/M in)      Maximum reasoning quality, strategic analysis
($3.00–$15.00/M)  o3                             Math, proofs, complex multi-step reasoning
                  Gemini 2.5 Pro                    Multimodal + long-context combined

Premium (peak     Same as High tier                When the task has zero tolerance for errors —
performance)                                          budget is secondary to correctness
```

**Cost optimization rule:** Always calculate estimated monthly cost = (input tokens/month × input price) + (output tokens/month × output price). Model selection based on raw per-request quality without volume context is the #1 cause of AI infrastructure budget overruns.

---

## Latency vs. Quality Grid

```
Latency Budget  │ Recommended Tier              │ Example Models
────────────────┼───────────────────────────────┼────────────────────
<200ms          │ Ultra-Low / Low               │ GPT-4o-mini, Haiku 4, Llama 3.2 on Groq
200–500ms       │ Low / Mid                     │ GPT-4.1 Nano, Sonnet 4, Gemini 2.5 Flash
500ms–2s        │ Mid                           │ GPT-4o, Claude Sonnet 4, Llama 3.3 70B
2–5s            │ High                        │ Claude Opus 3.5, Gemini 2.5 Pro
5–15s           │ Premium (reasoning models)  │ o3, o3-mini
>15s            │ Reasoning only (async)      │ o3 complex reasoning mode
```

**Latency note:** These are p50 estimates for text completion at moderate output lengths (~500 tokens). Code generation and tool-calling workflows add 2–5× latency. Always measure p95 latency in your environment — network hops to the provider significantly affect tail latency.

---

## Model Evaluation Example

The following demonstrates the scoring methodology. It is a practical reference for building model selection into production systems.

```python
from __future__ import annotations

import enum
import math
from dataclasses import dataclass, field
from typing import Any, Optional


class ModelProvider(str, enum.Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    META_SELFHOSTED = "meta_self_hosted"


class TaskCategory(str, enum.Enum):
    """Primary task categories for model matching."""
    CODING = "coding"
    REASONING = "reasoning"
    RAG_LONG_CONTEXT = "rag_long_context"
    CREATIVE_WRITING = "creative_writing"
    FACTUAL_QA = "factual_qa"
    MULTIMODAL_VIDEO = "multimodal_video"
    EDGE_INFERENCE = "edge_inference"
    FAST_CLASSIFICATION = "fast_classification"


@dataclass
class TaskRequirements:
    """Explicit task requirements that drive model selection.

    All five dimensions must be populated before scoring can proceed.
    Missing dimensions should use None, which will be handled by the scorer
    as a neutral (1.0) weight contribution.
    """

    category: TaskCategory
    max_latency_ms: Optional[int] = None  # p50 latency budget
    max_input_tokens: int = 128_000       # worst-case context window needed
    daily_volume: Optional[int] = None    # estimated requests per day
    monthly_budget_usd: Optional[float] = None
    output_length_estimate: int = 500     # expected output tokens per request


@dataclass
class ModelCandidate:
    """Represents a candidate model for evaluation."""

    name: str
    provider: ModelProvider
    input_price_per_1m: float      # USD per million input tokens
    output_price_per_1m: float     # USD per million output tokens
    max_context_tokens: int        # context window size
    typical_latency_ms: float      # median p50 latency for standard tasks
    capability_scores: dict[str, float]  # category → quality score (0.0–1.0)

    @property
    def is_open_source(self) -> bool:
        return self.provider == ModelProvider.META_SELFHOSTED


@dataclass
class CapabilityScore:
    """Weighted capability breakdown for a model on a task."""

    task_fit: float
    latency_adequacy: float
    cost_efficiency: float
    context_window: float
    ecosystem_maturity: float
    composite: float


def calculate_score(
    requirements: TaskRequirements,
    candidate: ModelCandidate,
    dimension_weights: Optional[dict[str, float]] = None,
) -> CapabilityScore:
    """Calculate weighted capability score for a model on a specific task.

    Implements the five-dimension scoring system defined in Core Workflow step 4.
    Scores are independent — task fit does not influence latency or cost scores,
    ensuring early-exit evaluation of hard constraints before soft trade-offs.

    Args:
        requirements: The task's decomposed requirements across five dimensions.
        candidate: A ModelCandidate representing a model under consideration.
        dimension_weights: Optional custom weights (default: equal weighting).

    Returns:
        CapabilityScore with per-dimension and composite scores.
    """
    # Default equal weights when no customization provided
    if dimension_weights is None:
        dimension_weights = {
            "task_fit": 0.35,
            "latency_adequacy": 0.20,
            "cost_efficiency": 0.15,
            "context_window": 0.20,
            "ecosystem_maturity": 0.10,
        }

    # --- Hard constraint: context window check (Law 1 — Early Exit) ---
    if candidate.max_context_tokens < requirements.max_input_tokens:
        return CapabilityScore(
            task_fit=0.0,
            latency_adequacy=0.0,
            cost_efficiency=0.0,
            context_window=0.0,
            ecosystem_maturity=dimension_weights.get("ecosystem_maturity", 0.10),
            composite=0.0,
        )

    # --- Task fit score (capability match) ---
    task_fit = candidate.capability_scores.get(requirements.category.value, 0.5)

    # --- Latency adequacy (how well it fits the latency budget) ---
    if requirements.max_latency_ms is not None:
        if candidate.typical_latency_ms <= requirements.max_latency_ms * 0.7:
            latency_adequacy = 1.0
        elif candidate.typical_latency_ms <= requirements.max_latency_ms:
            latency_adequacy = 0.6
        else:
            # Exceeds budget but not catastrophically — penalize proportionally
            overshoot_ratio = requirements.max_latency_ms / candidate.typical_latency_ms
            latency_adequacy = max(0.1, overshoot_ratio)
    else:
        latency_adequacy = 1.0  # No constraint → neutral

    # --- Cost efficiency (normalized against budget) ---
    if requirements.daily_volume is not None and requirements.monthly_budget_usd:
        estimated_monthly_cost = (
            (requirements.daily_volume * 30 * requirements.max_input_tokens
             * candidate.input_price_per_1m / 1_000_000) +
            (requirements.daily_volume * 30 * requirements.output_length_estimate
             * candidate.output_price_per_1m / 1_000_000)
        )
        cost_ratio = estimated_monthly_cost / requirements.monthly_budget_usd
        if cost_ratio <= 0.8:
            cost_efficiency = 1.0
        elif cost_ratio <= 1.2:
            cost_efficiency = max(0.3, 1.0 - (cost_ratio - 0.8) * 0.75)
        else:
            cost_efficiency = 0.1  # Significantly over budget
    else:
        cost_efficiency = 0.7  # No constraint → slightly positive

    # --- Context window adequacy ---
    if candidate.max_context_tokens >= requirements.max_input_tokens * 2:
        context_window = 1.0
    elif candidate.max_context_tokens >= requirements.max_input_tokens:
        context_window = 0.6 + 0.4 * (
            candidate.max_context_tokens - requirements.max_input_tokens
        ) / requirements.max_input_tokens
    else:
        context_window = 0.0

    # --- Ecosystem maturity heuristic ---
    ecosystem_maturity = dimension_weights.get("ecosystem_maturity", 0.10)
    if candidate.provider == ModelProvider.OPENAI:
        ecosystem_maturity = max(ecosystem_maturity, 0.9)
    elif candidate.provider == ModelProvider.ANTHROPIC:
        ecosystem_maturity = max(ecosystem_maturity, 0.85)
    elif candidate.provider == ModelProvider.GOOGLE:
        ecosystem_maturity = max(ecosystem_maturity, 0.85)
    else:
        # Self-hosted: maturity depends on community adoption
        if "3.3" in candidate.name or "3" in candidate.name:
            ecosystem_maturity = max(ecosystem_maturity, 0.7)
        else:
            ecosystem_maturity = max(ecosystem_maturity, 0.5)

    # --- Composite score (weighted sum) ---
    composite = (
        task_fit * dimension_weights["task_fit"]
        + latency_adequacy * dimension_weights["latency_adequacy"]
        + cost_efficiency * dimension_weights["cost_efficiency"]
        + context_window * dimension_weights["context_window"]
        + ecosystem_maturity * dimension_weights["ecosystem_maturity"]
    )

    return CapabilityScore(
        task_fit=round(task_fit, 3),
        latency_adequacy=round(latency_adequacy, 3),
        cost_efficiency=round(cost_efficiency, 3),
        context_window=round(context_window, 3),
        ecosystem_maturity=round(ecosystem_maturity, 3),
        composite=round(composite, 3),
    )


def select_best_model(
    requirements: TaskRequirements,
    candidates: list[ModelCandidate],
) -> tuple[ModelCandidate, CapabilityScore, ModelCandidate | None]:
    """Select the best model from a candidate pool and identify the fallback.

    Applies Early Exit (Law 1): models that fail hard constraints are filtered
    before scoring. Then selects the highest-scoring candidate with a fallback.

    Args:
        requirements: Task decomposed into five requirement dimensions.
        candidates: At least 3 ModelCandidate objects from different providers.

    Returns:
        Tuple of (best_model, best_score, fallback_model_or_None).
        If only one candidate passes hard constraints, fallback is None.

    Raises:
        ValueError: If fewer than 2 candidates are provided.
    """
    if len(candidates) < 2:
        raise ValueError("At least 2 candidates required for model selection")

    # Evaluate all candidates
    scored_candidates: list[tuple[ModelCandidate, CapabilityScore]] = []
    for candidate in candidates:
        score = calculate_score(requirements, candidate)
        if score.composite > 0:  # Hard constraint filter (context window check)
            scored_candidates.append((candidate, score))

    if len(scored_candidates) < 2:
        raise ValueError(
            f"No models pass hard constraints. Need at least 2 viable candidates. "
            f"Consider relaxing context requirements or adding longer-context models."
        )

    # Sort by composite score descending
    scored_candidates.sort(key=lambda x: x[1].composite, reverse=True)

    best_candidate, best_score = scored_candidates[0]
    fallback_candidate, _ = scored_candidates[1]

    return best_candidate, best_score, fallback_candidate


# --- Concrete usage example ---

def demonstrate_model_selection() -> None:
    """Demonstrate model selection for a coding + long-document task.

    This is the kind of analysis you produce when loading this skill.
    It covers three providers, balances latency and cost constraints,
    and identifies both a primary selection and a fallback model.
    """
    requirements = TaskRequirements(
        category=TaskCategory.CODING,
        max_latency_ms=1500,
        max_input_tokens=300_000,  # Needs >200K for long codebase review
        daily_volume=5000,
        monthly_budget_usd=800.0,
        output_length_estimate=1000,
    )

    candidates = [
        ModelCandidate(
            name="GPT-4.1 (OpenAI)",
            provider=ModelProvider.OPENAI,
            input_price_per_1m=0.60,
            output_price_per_1m=2.40,
            max_context_tokens=1_000_000,
            typical_latency_ms=800.0,
            capability_scores={
                "coding": 0.92,
                "reasoning": 0.78,
                "rag_long_context": 0.95,
                "creative_writing": 0.75,
                "factual_qa": 0.80,
                "fast_classification": 0.65,
            },
        ),
        ModelCandidate(
            name="Claude Sonnet 4 (Anthropic)",
            provider=ModelProvider.ANTHROPIC,
            input_price_per_1m=3.00,
            output_price_per_1m=15.00,
            max_context_tokens=200_000,
            typical_latency_ms=600.0,
            capability_scores={
                "coding": 0.90,
                "reasoning": 0.82,
                "rag_long_context": 0.70,  # Fails context requirement — excluded by hard constraint
                "creative_writing": 0.85,
                "factual_qa": 0.83,
                "fast_classification": 0.70,
            },
        ),
        ModelCandidate(
            name="Gemini 2.5 Pro (Google)",
            provider=ModelProvider.GOOGLE,
            input_price_per_1m=1.25,
            output_price_per_1m=10.00,
            max_context_tokens=1_000_000,
            typical_latency_ms=900.0,
            capability_scores={
                "coding": 0.78,
                "reasoning": 0.85,
                "rag_long_context": 0.95,
                "creative_writing": 0.72,
                "factual_qa": 0.93,
                "fast_classification": 0.68,
            },
        ),
    ]

    best, score, fallback = select_best_model(requirements, candidates)

    print(f"Primary: {best.name} (composite: {score.composite})")
    print(f"  Task fit: {score.task_fit} | Latency: {score.latency_adequacy} | "
          f"Cost: {score.cost_efficiency} | Context: {score.context_window}")
    if fallback:
        print(f"Fallback: {fallback.name}")


if __name__ == "__main__":
    demonstrate_model_selection()
```

---

## BAD vs GOOD Examples

### ❌ BAD — Selecting a model based on provider loyalty alone

```python
# BAD: Choosing GPT-4o for everything because "we use OpenAI"
PREFERRED_MODEL = "gpt-4.1"  # Hardcoded, no evaluation

def get_model_for_task(task_type: str) -> str:
    """Returns the same model regardless of task requirements.
    This ignores cost optimization, latency needs, and quality fit."""
    return PREFERRED_MODEL  # Always GPT-4.1, even for fast classification

# Problems:
# - Wastes money on expensive models for simple tasks (cost waste from over-modeling)
# - May exceed latency budgets on slower models where faster ones suffice
# - No fallback if OpenAI has an outage
# - Violates the principle of separating task needs from cost/latency constraints
```

### ✅ GOOD — Evaluating candidates against decomposed requirements

```python
# GOOD: Model selection driven by explicit requirement decomposition
def select_model_for_task(task_type: TaskCategory) -> SelectedModel:
    """Select model based on decomposed task requirements, not preference.

    Follows the Core Workflow: gather requirements → classify → shortlist → score → decide.
    References code-philosophy Law 1 (Early Exit): models that fail hard constraints
    are rejected before any scoring computation.
    """
    # Step 1: Gather concrete requirements for this task type
    requirements = _resolve_requirements(task_type)

    # Step 2: Get cross-provider shortlist (minimum 3 candidates, different providers)
    candidates = get_cross_provider_shortlist(requirements.category)

    # Step 3: Score and select with fallback
    best, score, fallback = select_best_model(requirements, candidates)

    return SelectedModel(
        primary=best,
        primary_score=score,
        fallback=fallback,
        reasoning=(
            f"Selected {best.name} over {fallback.name} "
            f"(score gap: {score.composite - fallback_score.score:.2f})"
        ),
    )
```

**Key differences:**
- BAD uses a hardcoded single model; GOOD evaluates at least 3 candidates across providers
- BAD ignores cost, latency, and context constraints; GOOD decomposes requirements explicitly
- BAD has no fallback path; GOOD includes a named fallback model in every selection
- BAD cannot explain its reasoning; GOOD documents score gap and rationale

---

## Constraints

### MUST DO

- **Separate dimensions before scoring** — Decompose task complexity, latency budget, cost ceiling, and context needs as independent dimensions. Never mix these into a single heuristic judgment.
- **Cross-provider shortlisting** — Evaluate at least 3 candidate models from different providers before selecting. Never select based on a single model or same-provider alternatives alone.
- **Benchmark your specific workload** — Public leaderboards (Chatbot Arena, LMSYS) do not predict real-world performance on your data distribution. Always document the "benchmark your workload" principle in selection reports.
- **Include a fallback recommendation** — Every model selection must include at least one fallback model with a clear degradation path. This is non-negotiable for production systems.
- **Validate API availability** — Check provider status pages and rate limit tiers before finalizing. A perfect model is useless if it's under heavy rate limiting or experiencing outages.
- **Calculate real monthly cost** — Estimate (daily volume × 30 × avg tokens × price per M) for both input and output. Model selection based on quality alone without volume context causes budget overruns.

### MUST NOT DO

- **Never recommend a model in maintenance mode** — Do not suggest deprecated models (original AutoGen v0.x, Claude 2.x, GPT-3.5 Turbo beyond EOL dates). Always recommend actively supported models with clear roadmap visibility.
- **Select without checking API availability and rate limits** — A model's theoretical capability means nothing if the provider's API is throttling your tier. Check status pages and documented rate limits.
- **Recommend premium models for tasks that cheap models handle adequately** — Using Claude Opus 3.5 for simple sentiment classification is cost waste from over-modeling — the #1 budget killer in AI systems. Apply Law 1 (Early Exit) from `code-philosophy`: if a $0.15/M model achieves 97% of the quality at 10× the throughput, use it and exit early.
- **Present model scores as absolute truth** — Scores are estimates that require real-workload validation. Always qualify recommendations with "based on public benchmarks; validate against your data."

---

## Configuration Recommendations

Apply these inference parameters based on task type:

| Task Category | Temperature | Top-p | Top-k | Max Tokens |
|---------------|-------------|-------|-------|------------|
| Coding / Code Generation | 0.0–0.2 | 0.9 | — | Varies (set explicit limit) |
| Complex Reasoning (o3) | N/A (uses reasoning effort) | — | — | High (16K+) |
| RAG / Factual QA | 0.0 | 0.95 | 40 | Moderate (2K–4K) |
| Creative Writing | 0.7–0.9 | 0.95 | — | Varies |
| Fast Classification / Routing | 0.0 | 0.95 | 1 | Low (256–512) |
| Structured Output (JSON) | 0.0 | 0.9 | — | Set explicit JSON length limit |
| Summarization | 0.1–0.3 | 0.95 | — | Moderate (4K–8K) |

**Structured output tip:** When producing JSON, use providers with JSON mode guarantees (OpenAI response_format, Anthropic tool_use). Always validate output with a schema checker before consuming downstream.

---

## Output Template

When performing AI model selection, produce:

1. **Requirements Summary** — Task type, complexity level, latency budget, daily volume estimate, context window needs, and monthly budget constraint
2. **Candidate Model List** — At least 3 models from different providers, each with a one-sentence positioning statement (e.g., "GPT-4.1: best long-context coding model with 1M token window")
3. **Capability Scoring Matrix** — Table of model × capability dimensions (task fit, latency adequacy, cost efficiency, context window, ecosystem maturity) with scores and weights
4. **Selection Decision** — Winner name, runner-up name, composite score gap, and explicit reasoning citing which dimension(s) drove the decision
5. **Fallback Architecture** — Primary → secondary (quality fallback) → tertiary (fast-path degradation), including activation triggers for each switch
6. **Configuration Recommendations** — Suggested temperature, top-p, and max tokens per task type
7. **Benchmarking Plan** — How to validate the selection against real workload data: what test set to use, which metrics to track (quality score, latency p95, cost per successful request), and decision threshold for re-evaluation

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `ai-framework-selector` | Select the application framework (LangChain, LlamaIndex, etc.) — use when choosing between frameworks rather than models |
| `framework-selection` | Compare general software frameworks — use when evaluating React vs Vue vs Angular or similar non-AI decisions |
| `multi-model-routing` | Design production routing logic across multiple models with circuit breakers and traffic splitting |
| `tool-use-function-calling` | Implement function calling and tool use patterns that may influence which model you choose (not all models support tools equally) |

---

## Live References

- [OpenAI Models](https://platform.openai.com/docs/models) — Official model catalog with pricing, capabilities, and context window details
- [Anthropic Claude Documentation](https://docs.anthropic.com/en/docs/about-claude/models) — Claude model comparison, API reference, and feature matrix
- [Google Gemini Models](https://ai.google.dev/gemini-api/docs/models/gemini) — Gemini 2.5 Pro, Flash, and Ultra specifications with multimodal capabilities
- [Meta Llama Models](https://www.llama.com/) — Official Llama model page with licensing, parameter counts, and self-hosting guidance
- [Vercel AI SDK Model Abstraction](https://sdk.vercel.ai/providers/ai-sdk-providers) — Unified model interface across OpenAI, Anthropic, Google, and others
- [Martin Fowler — Evaluating Technical Tools](https://martinfowler.com/articles/is-quality-stable-and-deterministic.html) — Framework for comparing technical options without over-generalizing from benchmarks
- [Groq Inference Platform](https://groq.com/) — Ultra-low-latency inference for open-source models (Llama, Qwen) with hardware-accelerated serving

---

> This skill references `code-philosophy` (5 Laws of Elegant Defense), particularly Law 1 (Early Exit): when a cheap model handles a task adequately, exit the expensive-path consideration immediately rather than continuing to evaluate premium alternatives. This prevents over-engineered multi-model architectures on simple tasks and keeps infrastructure costs proportional to task complexity.
