---
name: observability-patterns
description: Implements tracing, cost tracking, and latency monitoring patterns for AI agent systems to debug failures, control token spend, and optimize response times across multi-agent workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: agent observability, AI tracing, LLM cost tracking, token spend monitoring, latency monitoring, agent debugging, OpenTelemetry agents, Phoenix tracing, LangSmith tracing
  archetypes: [diagnostic, tactical]
  anti_triggers: [vague ideation, brainstorming]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: ai-framework-comparison, protocol-first-agent-design, framework-utilization
---

# AI Agent Observability Patterns

Implements comprehensive observability for AI agent systems including distributed tracing across agent-tool-model interactions, token-level cost tracking with per-step budgets, and latency profiling to identify bottlenecks in multi-agent workflows. Enables debugging non-deterministic LLM calls, preventing runaway token spend, and optimizing end-to-end response times.

## TL;DR Checklist

- [ ] Instrument every LLM call with OpenTelemetry spans containing model, tokens, and timing data
- [ ] Implement token budget guards that halt agent execution when spending exceeds thresholds
- [ ] Profile latency per workflow stage (routing → tool → LLM) to identify bottlenecks
- [ ] Add structured logging with correlation IDs for tracing individual agent runs end-to-end
- [ ] Build cost dashboard showing spend by model, feature flag, and user session

---

## When to Use

Use this skill when:

- Debugging non-deterministic LLM behavior — need to trace exact input/output/token counts per call
- Controlling production costs — token spend is unpredictable and needs per-step budget guards
- Optimizing agent latency — need to profile where time is spent (tool calls vs. LLM inference)
- Multi-agent workflows require cross-agent tracing to understand end-to-end request paths
- Building dashboards for cost monitoring and performance SLAs

## When NOT to Use

Avoid this skill for:
- Local development with mock/placeholder LLMs — overhead outweighs benefits
- One-off, throwaway experiments where observability data is never reviewed
- Simple single-prompt applications without tool calls or multi-step workflows

---

## Core Workflow

1. **Instrument LLM Calls with Tracing Spans** — Wrap every LLM invocation with an OpenTelemetry span that captures model name, provider, input tokens (prompt), output tokens (completion), temperature, and wall-clock timing. Use a decorator pattern (`@instrumented_llm_call`) to avoid scattering trace code across agent logic. Export spans to a tracing backend (Phoenix, LangSmith, or Jaeger) via the OpenTelemetry SDK with appropriate sampling rates (head-based 10% for production).

2. **Implement Token Budget Guards** — Create a `TokenBudgetManager` that tracks cumulative token usage per agent run and per workflow step. Set per-step budgets (e.g., 50,000 tokens max per step) and total budgets (e.g., 500,000 tokens per complete workflow). When a budget is exceeded, raise `TokenBudgetExceededError` that the agent can catch to trigger fallback behavior — summarization, caching, or route to a cheaper model. Implement cost estimation before calling the LLM by comparing input token count against known price-per-token rates.

3. **Profile Latency Per Workflow Stage** — Measure end-to-end latency broken down by stage: request routing (10–50ms), tool execution (50–2000ms depending on tool), LLM inference (200–10000ms depending on model), and orchestration overhead. Use a `LatencyProfiler` that records timestamps at each stage boundary and produces a latency breakdown dict per workflow step. Aggregate over time to identify which stages are consistently slow — typically LLM inference for large context windows, or external tool calls with network timeouts.

4. **Add Structured Logging with Correlation IDs** — Generate a unique `run_id` for every top-level agent invocation and propagate it through all nested calls (sub-agents, tool calls, LLM invocations). Use this correlation ID in every log line so that individual runs can be traced across distributed logs. Include key metadata: model name, token counts at each step, latency, and whether the call succeeded or failed with error type.

5. **Build Cost Dashboard Aggregation** — Create a cost aggregation module that reads trace data (or structured logs) to compute spend by model family (GPT-4o vs Claude Sonnet), by feature flag, and per user session. Use known price-per-token rates from each provider's pricing page to calculate costs in real-time during the run and accumulate historical spend for dashboard reporting. Alert when daily or monthly spend exceeds thresholds.

## Implementation Patterns

### Pattern 1: Tracing Decorator with Token Capture

```python
"""OpenTelemetry-based LLM call instrumentation."""

import time
import functools
from contextlib import contextmanager
from typing import Any, Callable
from dataclasses import dataclass, field


@dataclass
class LLMTraceData:
    """Captured trace data for a single LLM call."""
    run_id: str
    model_name: str
    provider: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: float = 0.0
    temperature: float | None = None
    success: bool = True
    error_type: str | None = None
    cost_usd: float = 0.0


# Provider pricing (per million tokens) — update from provider docs as rates change
MODEL_PRICING = {
    "gpt-4o":      {"input": 2.50, "output": 10.00},
    "gpt-4o-mini":  {"input": 0.15, "output": 0.60},
    "claude-sonnet": {"input": 3.00, "output": 15.00},
    "claude-haiku":  {"input": 0.25, "output": 1.25},
    "gemini-1.5-pro":{"input": 1.25, "output": 5.00},
}


def estimate_cost(
    model_name: str, input_tokens: int, output_tokens: int
) -> float:
    """Estimate cost in USD based on known per-million-token pricing."""
    pricing = MODEL_PRICING.get(model_name, {"input": 1.0, "output": 3.0})
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000


@contextmanager
def trace_llm_call(
    run_id: str, model_name: str, provider: str = "openai"
):
    """Context manager that records a complete LLM trace span.

    Yields a dict that the caller populates with token counts after the call.

    Usage:
        with trace_llm_call(run_id="abc123", model_name="gpt-4o") as trace_data:
            response = client.chat.completions.create(...)
            trace_data["input_tokens"] = response.usage.prompt_tokens
            trace_data["output_tokens"] = response.usage.completion_tokens
    """
    start_time = time.perf_counter()
    try:
        yield {}  # Caller fills in token counts here
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        trace_entry = LLMTraceData(
            run_id=run_id, model_name=model_name, provider=provider,
            latency_ms=elapsed_ms, success=False, error_type=type(e).__name__,
        )
        # In production, export to OpenTelemetry:
        # tracer.start_span(f"llm.{model_name}").end()
        raise
    finally:
        elapsed_ms = (time.perf_counter() - start_time) * 1000


def instrumented_llm_call(run_id: str):
    """Decorator that wraps LLM calls with tracing, cost estimation, and budget checking."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = time.perf_counter()
            model_name = kwargs.get("model", args[1] if len(args) > 1 else "unknown")

            with trace_llm_call(run_id=run_id, model_name=model_name) as trace_data:
                try:
                    result = func(*args, **kwargs)

                    # Extract token counts from response (works for OpenAI-style responses)
                    if hasattr(result, "usage"):
                        trace_data["input_tokens"] = result.usage.prompt_tokens
                        trace_data["output_tokens"] = result.usage.completion_tokens
                        trace_data["total_tokens"] = result.usage.total_tokens
                        trace_data["cost_usd"] = estimate_cost(
                            model_name,
                            trace_data["input_tokens"],
                            trace_data["output_tokens"],
                        )

                    return result
                except Exception as e:
                    raise
                finally:
                    trace_data.setdefault("latency_ms", (time.perf_counter() - start_time) * 1000)
                    trace_data.setdefault("success", True)
        return wrapper
    return decorator
```

### Pattern 2: Token Budget Manager (BAD vs. GOOD)

```python
# ❌ BAD — no budget control, token spend is unpredictable and unbounded
def run_agent_unbudgeted(messages: list[dict]) -> str:
    # Each step calls the LLM without any cost or token limits
    response = call_llm(messages)  # Could be 10M tokens with no guard
    return response.choices[0].message.content


# ✅ GOOD — bounded budget with per-step and total limits, graceful fallbacks
@dataclass
class TokenBudget:
    """Configurable token budget with per-step and total limits."""
    max_input_tokens_per_step: int = 50_000
    max_total_tokens: int = 500_000
    cost_alert_threshold_usd: float = 10.0

    def __post_init__(self):
        if self.max_input_tokens_per_step <= 0:
            raise ValueError("max_input_tokens_per_step must be positive")


class TokenBudgetExceededError(RuntimeError):
    """Raised when token budget limits are exceeded during agent execution."""
    pass


class TokenBudgetManager:
    """Tracks and enforces token budgets across agent workflow steps."""

    def __init__(self, budget: TokenBudget | None = None, run_id: str = ""):
        self.budget = budget or TokenBudget()
        self.run_id = run_id
        self._total_tokens = 0
        self._step_tokens = 0
        self._total_cost_usd = 0.0
        self._alerts_triggered: list[dict] = []

    def check_before_call(self, estimated_input_tokens: int) -> None:
        """Validate that a planned LLM call fits within budget constraints.

        Raises TokenBudgetExceededError if the call would exceed limits.

        Args:
            estimated_input_tokens: Expected token count for the prompt input.
        """
        # Per-step check
        if self._step_tokens + estimated_input_tokens > self.budget.max_input_tokens_per_step:
            raise TokenBudgetExceededError(
                f"Step budget exceeded: would use {self._step_tokens + estimated_input_tokens:,} tokens "
                f"(limit: {self.budget.max_input_tokens_per_step:,})"
            )

        # Total check with 10% headroom for output tokens
        estimated_total = estimated_input_tokens + int(estimated_input_tokens * 0.5)  # ~50% output ratio
        if self._total_tokens + estimated_total > self.budget.max_total_tokens:
            raise TokenBudgetExceededError(
                f"Total budget exceeded: would use {self._total_tokens + estimated_total:,} tokens "
                f"(limit: {self.budget.max_total_tokens:,})"
            )

    def record_usage(self, input_tokens: int, output_tokens: int, cost_usd: float) -> None:
        """Record actual token usage after an LLM call completes."""
        self._step_tokens += input_tokens + output_tokens
        self._total_tokens += input_tokens + output_tokens
        self._total_cost_usd += cost_usd

        # Alert on significant spend milestones
        if self._total_cost_usd >= self.budget.cost_alert_threshold_usd:
            self._alerts_triggered.append({
                "event": "cost_alert",
                "run_id": self.run_id,
                "total_cost_usd": round(self._total_cost_usd, 4),
                "threshold_usd": self.budget.cost_alert_threshold_usd,
            })

    def get_summary(self) -> dict[str, Any]:
        """Return budget status summary for logging/dashboarding."""
        return {
            "run_id": self.run_id,
            "total_tokens_used": f"{self._total_tokens:,}",
            "step_tokens_used": f"{self._step_tokens:,}",
            "total_cost_usd": round(self._total_cost_usd, 6),
            "alerts_triggered": len(self._alerts_triggered),
        }


# Example usage in agent workflow:
# manager = TokenBudgetManager(TokenBudget(max_input_tokens_per_step=30_000))
# manager.check_before_call(estimated_input_tokens=25_000)
# response = call_llm(messages, model="gpt-4o-mini")  # Cheaper fallback
# manager.record_usage(response.usage.prompt_tokens, response.usage.completion_tokens, cost_usd)
```

### Pattern 3: Latency Stage Profiler

```python
"""Latency profiling for agent workflow stages."""

from dataclasses import dataclass, field
from enum import Enum


class WorkflowStage(str, Enum):
    ROUTING = "routing"        # Agent routing / task decomposition
    TOOL_CALL = "tool_call"     # External tool execution
    LLM_INFERENCE = "llm"      # LLM model inference
    ORCHESTRATION = "orch"     # Framework overhead (state updates, etc.)


@dataclass
class StageLatency:
    """Latency measurement for a single workflow stage."""
    stage: WorkflowStage
    duration_ms: float
    detail: str = ""
    error: str | None = None


@dataclass
class StepProfile:
    """Complete latency profile for one agent workflow step."""
    step_index: int
    run_id: str
    stages: list[StageLatency] = field(default_factory=list)

    @property
    def total_latency_ms(self) -> float:
        return sum(s.duration_ms for s in self.stages)

    @property
    def dominant_stage(self) -> WorkflowStage | None:
        if not self.stages:
            return None
        return max(self.stages, key=lambda s: s.duration_ms).stage


class LatencyProfiler:
    """Profiles latency across agent workflow stages."""

    def __init__(self):
        self._profiles: list[StepProfile] = []

    @contextmanager
    def profile_stage(self, step_index: int, run_id: str, stage: WorkflowStage):
        """Context manager to measure duration of a single workflow stage."""
        start = time.perf_counter()
        try:
            yield
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            profile_entry = StageLatency(stage=stage, duration_ms=elapsed_ms, error=type(e).__name__)
            self._finalize_step(step_index, run_id, [profile_entry])
            raise
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000

    def _finalize_step(self, step_index: int, run_id: str, stages: list[StageLatency]):
        profile = StepProfile(step_index=step_index, run_id=run_id, stages=stages)
        self._profiles.append(profile)

    def get_report(self) -> dict[str, Any]:
        """Generate latency report with per-stage averages and dominant stage analysis."""
        if not self._profiles:
            return {"error": "No profiles recorded"}

        total_latency = sum(p.total_latency_ms for p in self._profiles)
        stage_totals: dict[WorkflowStage, float] = {s: 0.0 for s in WorkflowStage}
        stage_counts: dict[WorkflowStage, int] = {s: 0 for s in WorkflowStage}

        for profile in self._profiles:
            for stage_latency in profile.stages:
                stage_totals[stage_latency.stage] += stage_latency.duration_ms
                stage_counts[stage_latency.stage] += 1

        stage_averages = {
            stage.name: round(stage_totals[stage] / max(count, 1), 2)
            for stage, count in stage_counts.items()
        }

        dominant_stages = [p.dominant_stage.name if p.dominant_stage else "none" for p in self._profiles]
        most_common_dominant = max(set(dominant_stages), key=dominant_stages.count)

        return {
            "total_steps": len(self._profiles),
            "avg_total_latency_ms": round(total_latency / len(self._profiles), 2),
            "stage_averages_ms": stage_averages,
            "most_dominant_stage": most_common_dominant,
        }
```

---

## Constraints

### MUST DO
- Wrap EVERY LLM call with tracing — even calls that seem "simple" because non-deterministic behavior hides in the details
- Use per-step budgets to prevent runaway token spend in loops and recursive agent patterns
- Record correlation IDs (run_id) in every log line for end-to-end traceability across multi-agent workflows
- Profile latency by stage, not just end-to-end — you cannot optimize what you do not measure

### MUST NOT DO
- Rely on print statements or basic logging for production debugging — use structured tracing with OpenTelemetry spans
- Set budgets so low that legitimate agent work gets blocked — test budgets under realistic load before deploying
- Skip cost estimation for high-volume models (GPT-4o, Claude Opus) where each call can cost $0.01–$0.10+

---

## Output Template

When using this skill, produce the following output:

1. **Tracing Implementation** — Instrumented LLM call decorator and context managers with full OpenTelemetry integration
2. **Budget Configuration** — Token budget thresholds per step and total, with budget manager class and error handling
3. **Latency Profile Report** — Stage-level latency breakdown with dominant stage analysis for recent workflow runs
4. **Logging Setup** — Structured logger configuration with correlation ID propagation across all agent calls

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-framework-comparison` | Choose a framework that has good native observability support |
| `protocol-first-agent-design` | Implement observability at protocol boundaries for cross-framework tracing |
| `framework-utilization` | Apply framework-specific observability features alongside generic patterns |

## Live References

> Authoritative documentation links for AI agent observability.

- [OpenTelemetry Python Documentation](https://opentelemetry.io/docs/languages/python/)
- [Phoenix (Arize) Tracing for LLMs](https://docs.arize.com/phoenix/)
- [LangSmith Observability](https://www.langchain.com/langsmith)
- [AgentOps Framework](https://github.com/AgentOps-AI/agentops)
- [OpenAI Usage API — Token Tracking](https://platform.openai.com/docs/guides/utilization-metrics)
- [Anthropic Token Counting Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
