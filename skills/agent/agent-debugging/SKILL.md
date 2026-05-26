---
name: agent-debugging
description: Implements systematic debugging workflows for LLM agent failures including hallucination detection, infinite loop recovery, context window exhaustion, tool call errors, and cascading failure diagnosis using distributed tracing patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: agent debugging, LLM agent failure, hallucination detection, infinite loop recovery, context window exhaustion, tool call error, how do i debug an agent
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  related-skills: observability-patterns, agentic-evaluation, multi-agent-orchestration
  archetypes: [tactical, diagnostic]
  anti_triggers: brainstorming, vague ideation, long-form architecture planning
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Agent Debugging Toolkit

Diagnoses and resolves LLM agent failures using systematic debugging workflows. Covers hallucination detection, infinite loop recovery, context window management, tool call validation, and cascading failure diagnosis through distributed tracing patterns.

## TL;DR for Code Generation

- Always create and propagate a correlation `run_id` via `contextvars` across async boundaries before any agent step
- Wrap every tool invocation with structured logging that records arguments, output, latency, and status
- Track tool call sequences to detect infinite loops — trigger a circuit breaker after 10 identical or near-identical iterations
- Count tokens per step; when usage exceeds 80% of context budget, activate sliding-window summarization
- Validate every tool name against the registered schema before execution to catch hallucinations early

---

## When to Use

Use this skill when:

- An agent is stuck in an infinite loop of retries or repeated tool calls with identical arguments
- The LLM hallucinates non-existent tool names, parameters, or output fields causing repeated failures
- Context window overflow causes the agent to lose early system instructions and produce erratic behavior
- Tool call argument mismatches between the registered schema and actual input cause silent failures
- Multiple agents in a multi-agent pipeline fail cascadingly and you need to isolate the root failure point
- Latency degradation is accelerating — each iteration takes progressively longer due to context bloat

---

## When NOT to Use

Avoid this skill for:

- Production monitoring, dashboards, and metric collection — use `observability-patterns` instead
- Systematic quality evaluation and regression testing of agent outputs — use `agentic-evaluation` instead
- Prompt design and system instruction optimization — use a prompt engineering skill instead
- High-level architectural debugging (e.g., microservice topology issues) — route to `multi-agent-orchestration` for cross-boundary coordination problems

---

## Core Workflow

1. **Generate Run ID** — Create a unique correlation ID for the agent invocation using `uuid4()` and propagate it via `contextvars.ContextVar` across all async boundaries. **Checkpoint:** Ensure every log line, trace span, and error message includes the run ID so you can reconstruct the full execution timeline.

2. **Map Execution Path** — Trace the full sequence: user input → router decision → tool selection → tool execution → LLM response. Instrument each step with timing metadata. **Checkpoint:** Identify the exact step where behavior diverges from expected output — do not assume the first visible symptom is the root cause.

3. **Classify Failure Tier** — Determine if the failure is Tier 1 (high-frequency: hallucination, incorrect tool use, infinite loops), Tier 2 (structural: missing context, prompt injection, cascading failures), or Tier 3 (operational: unbounded token spend, latency degradation, resource exhaustion). **Checkpoint:** Each tier requires distinct diagnostic patterns — do not apply a Tier 1 fix to a Tier 2 structural problem.

4. **Apply Targeted Diagnostic** — Select the implementation pattern matching your failure tier (see Implementation Patterns below). Apply the fix in an isolated test context before deploying to production. **Checkpoint:** Verify the fix resolves the original failure without introducing regressions in related paths.

5. **Validate Fix** — Re-run the agent with the fix applied across 3+ diverse test inputs covering edge cases. Confirm correct behavior, bounded iteration counts, and stable token usage. **Checkpoint:** All metrics (iterations, token count, tool call success rate) must remain within defined thresholds before clearing the incident.

---

## Implementation Patterns

### Pattern 1: Run ID Propagation with `contextvars`

Create and propagate a correlation run ID across async boundaries using Python's `contextvars`. This enables full trace reconstruction from any single log line.

```python
import uuid
import contextvars
import functools
import time
import logging
from typing import Any, Callable, TypeVar, ParamSpec

logger = logging.getLogger(__name__)

# Singleton context variable for run ID propagation across async boundaries
_run_id: contextvars.ContextVar[str] = contextvars.ContextVar("run_id", default="")
_task_name: contextvars.ContextVar[str] = contextvars.ContextVar("task_name", default="")

P = ParamSpec("P")
R = TypeVar("R")


def generate_run_id() -> str:
    """Generate a unique correlation ID for an agent invocation.

    Returns:
        A UUID4 string formatted as run-<uuid>.
    """
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    _run_id.set(run_id)
    logger.info("Generated new run ID: %s", run_id)
    return run_id


def get_run_id() -> str:
    """Retrieve the current run ID from context.

    Returns:
        The active run ID string, or 'no-run-id' if none is set.
    """
    current = _run_id.get()
    return current if current else "no-run-id"


def with_tracing(task_name: str):
    """Decorator that instruments a function with tracing metadata.

    Wraps the decorated function to log entry/exit, duration, and any exceptions,
    all tagged with the active run ID.

    Args:
        task_name: Human-readable label for this execution step.

    Returns:
        A decorator that adds tracing instrumentation.
    """
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            run_id = get_run_id()
            _task_name.set(task_name)
            start = time.perf_counter()

            logger.info(
                "[run=%s] START task=%s",
                run_id,
                task_name,
                extra={"args_count": len(args), "kwargs_keys": list(kwargs.keys())},
            )

            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.perf_counter() - start) * 1000
                logger.info(
                    "[run=%s] DONE task=%s duration=%.1fms",
                    run_id,
                    task_name,
                    duration_ms,
                )
                return result
            except Exception as exc:
                duration_ms = (time.perf_counter() - start) * 1000
                logger.exception(
                    "[run=%s] FAIL task=%s duration=%.1fms error=%s",
                    run_id,
                    task_name,
                    duration_ms,
                    type(exc).__name__,
                )
                raise

        return wrapper  # type: ignore[return-value]
    return decorator
```

Usage — attach to LLM call and tool execution functions:

```python
@with_tracing("llm_completion")
async def call_llm(messages: list[dict[str, str]], model: str) -> dict[str, Any]:
    """LLM API wrapper tagged with run ID and timing."""
    ...


@with_tracing("search_database")
async def search_database(query: str) -> list[dict]:
    """Tool execution with full trace logging."""
    ...
```

---

### Pattern 2: Infinite Loop Detection and Circuit Breaker

Tracks tool call sequences and detects repetition using exact-match and argument-similarity checks. Triggers a circuit breaker that forces fallback behavior after N consecutive repeats.

```python
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ToolCallRecord:
    """Immutable snapshot of a single tool invocation."""
    tool_name: str
    arguments: tuple[Any, ...]
    output_hash: str
    timestamp: float = field(default_factory=time.time)
    success: bool = True

    def to_tuple(self) -> tuple[str, tuple[Any, ...], str]:
        """Serialize for comparison and hashing."""
        return (self.tool_name, self.arguments, self.output_hash)


class CircuitBreakerError(Exception):
    """Raised when the circuit breaker opens due to repeated failures."""

    def __init__(self, message: str, failed_tool: str | None = None) -> None:
        self.failed_tool = failed_tool
        super().__init__(message)


class InfiniteLoopDetector:
    """Detects infinite loops by tracking tool call sequences and enforcing a
    circuit breaker when repeated patterns exceed a threshold.

    Attributes:
        max_repeats: Max consecutive identical-or-near-identical calls before breaking.
        window_size: Number of recent calls to compare against for similarity detection.
    """

    def __init__(
        self,
        max_repeats: int = 3,
        window_size: int = 5,
        fallback_handler: Optional[Any] = None,
    ) -> None:
        self._max_repeats = max_repeats
        self._window_size = window_size
        self._fallback_handler = fallback_handler
        self._call_history: deque[ToolCallRecord] = deque(maxlen=window_size)
        self._repeat_count = 0

    def record_call(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        output_hash: str,
        success: bool = True,
    ) -> ToolCallRecord:
        """Record a tool call and check for infinite loop conditions.

        Args:
            tool_name: Name of the tool being called.
            arguments: Dictionary of arguments passed to the tool.
            output_hash: Hash of the tool's output for change detection.
            success: Whether the tool call succeeded.

        Returns:
            The recorded ToolCallRecord.

        Raises:
            CircuitBreakerError: If repeated identical calls exceed threshold.
        """
        args_tuple = tuple(sorted(arguments.items()))
        record = ToolCallRecord(
            tool_name=tool_name,
            arguments=args_tuple,
            output_hash=output_hash,
            success=success,
        )

        self._call_history.append(record)

        if len(self._call_history) < 2:
            return record

        # Check for exact repeat: same tool + same args + same output
        recent = list(self._call_history)[-self._max_repeats:]
        is_repeat = all(
            r.tool_name == record.tool_name
            and r.arguments == record.arguments
            for r in recent[:-1]  # compare with all but the newest
        )

        if is_repeat:
            self._repeat_count += 1
            run_id = get_run_id()
            logger.warning(
                "[run=%s] LOOP DETECTED: tool='%s' repeated %d/%d times",
                run_id,
                tool_name,
                self._repeat_count,
                self._max_repeats,
            )
        else:
            # Reset counter on any non-repeating call
            self._repeat_count = 0

        if self._repeat_count >= self._max_repeats:
            run_id = get_run_id()
            logger.error(
                "[run=%s] CIRCUIT BREAKER OPEN after %d repeats of tool='%s'",
                run_id,
                self._repeat_count,
                tool_name,
            )
            if self._fallback_handler:
                return self._fallback_handler(tool_name, arguments)
            raise CircuitBreakerError(
                f"Tool '{tool_name}' repeated {self._max_repeats} times with identical "
                f"arguments — circuit breaker opened. Possible infinite loop."
            )

        return record

    def reset(self) -> None:
        """Reset the detector state after a successful recovery."""
        self._call_history.clear()
        self._repeat_count = 0
        run_id = get_run_id()
        logger.info("[run=%s] Circuit breaker reset", run_id)
```

Usage — wrap tool calls in an agent loop:

```python
detector = InfiniteLoopDetector(max_repeats=3, window_size=5)

async def agent_step(user_input: str, tools: dict[str, Callable]) -> str:
    """Single agent iteration with circuit breaker protection."""
    llm_response = await call_llm(
        [{"role": "user", "content": user_input}],
        model="gpt-4o",
    )

    for action in llm_response.get("actions", []):
        tool_name = action["tool"]
        arguments = action["arguments"]

        if tool_name not in tools:
            raise ValueError(f"Unknown tool: {tool_name} — possible hallucination")

        try:
            output = await tools[tool_name](**arguments)
            detector.record_call(
                tool_name=tool_name,
                arguments=arguments,
                output_hash=hash(str(output)),
                success=True,
            )
        except CircuitBreakerError:
            return f"Circuit breaker triggered. Falling back to safe mode for tool '{tool_name}'."
        except Exception as exc:
            detector.record_call(
                tool_name=tool_name,
                arguments=arguments,
                output_hash="",
                success=False,
            )
            raise

    return llm_response.get("response", "")
```

---

### Pattern 3: Context Window Exhaustion Prevention

Monitors token usage per step and activates a sliding-window summarization fallback when approaching context limits. Prevents silent data loss from truncation.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class TokenBudget:
    """Tracks token usage against a configurable context budget.

    Attributes:
        max_tokens: Maximum tokens allowed in the conversation window.
        warning_threshold_pct: Percentage at which to trigger proactive summarization (0.0–1.0).
        emergency_threshold_pct: Percentage at which truncation becomes mandatory (0.0–1.0).
    """
    max_tokens: int = 128_000
    warning_threshold_pct: float = 0.75
    emergency_threshold_pct: float = 0.90

    current_usage: int = field(default=0, init=False)
    budget_exhausted: bool = field(default=False, init=False)

    @property
    def warning_threshold(self) -> int:
        return int(self.max_tokens * self.warning_threshold_pct)

    @property
    def emergency_threshold(self) -> int:
        return int(self.max_tokens * self.emergency_threshold_pct)

    def usage_percent(self) -> float:
        """Return current usage as a fraction of the budget."""
        if self.budget_exhausted:
            return 1.0
        return self.current_usage / self.max_tokens

    def add_usage(self, tokens: int) -> None:
        """Add consumed tokens and check thresholds.

        Args:
            tokens: Number of tokens consumed by the latest step.

        Raises:
            BudgetExhaustionError: When emergency threshold is exceeded.
        """
        self.current_usage += tokens
        pct = self.usage_percent()

        if pct >= 1.0 and not self.budget_exhausted:
            self.budget_exhausted = True
            run_id = get_run_id()
            logger.error(
                "[run=%s] CONTEXT BUDGET EXHAUSTED: %d/%d tokens",
                run_id,
                self.current_usage,
                self.max_tokens,
            )
            raise BudgetExhaustionError(
                f"Context window full: {self.current_usage}/{self.max_tokens} tokens. "
                "Summarize history or truncate messages immediately."
            )

        if pct >= 0.90 and not self.budget_exhausted:
            logger.warning(
                "[run=%s] EMERGENCY threshold reached: %d/%d (%.0f%%)",
                get_run_id(),
                self.current_usage,
                self.max_tokens,
                pct * 100,
            )

        elif pct >= 0.75 and not self.budget_exhausted:
            logger.warning(
                "[run=%s] WARNING threshold reached: %d/%d (%.0f%%)",
                get_run_id(),
                self.current_usage,
                self.max_tokens,
                pct * 100,
            )

    def reset(self) -> None:
        """Reset counters after a summarization cycle."""
        old_usage = self.current_usage
        self.current_usage = 0
        self.budget_exhausted = False
        logger.info(
            "[run=%s] Token budget reset (freed ~%d tokens from summarization)",
            get_run_id(),
            old_usage,
        )


class BudgetExhaustionError(Exception):
    """Raised when the context window token budget is exceeded."""

    def __init__(self, current_tokens: int, max_tokens: int, stage: str = "unknown") -> None:
        self.current_tokens = current_tokens
        self.max_tokens = max_tokens
        self.stage = stage
        super().__init__(f"Token budget exceeded at '{stage}': {current_tokens}/{max_tokens}")


class ContextWindowManager:
    """Manages conversation history to prevent context window exhaustion.

    Implements a sliding window strategy: when usage exceeds the warning threshold,
    older messages are summarized and replaced with a condensed version, preserving
    key decisions and extracted facts while freeing tokens.
    """

    def __init__(self, max_tokens: int = 128_000) -> None:
        self.budget = TokenBudget(max_tokens=max_tokens)
        self.message_history: list[dict[str, str]] = []
        self.summary_buffer: list[str] = []

    def add_message(
        self,
        role: str,
        content: str,
        estimate_tokens: Optional[int] = None,
    ) -> None:
        """Add a message to the context window with optional token tracking.

        Args:
            role: Message role ('system', 'user', 'assistant', 'tool').
            content: Message text content.
            estimate_tokens: Pre-computed token count. If None, uses rough estimate
                           of 4 chars per token for logging purposes only.
        """
        token_cost = estimate_tokens or len(content) // 4

        # Check if we need to trigger summarization before adding
        if self.budget.current_usage + token_cost > self.budget.warning_threshold:
            self._summarize_old_messages()

        self.message_history.append({"role": role, "content": content})
        self.budget.add_usage(token_cost)

    def _summarize_old_messages(self) -> None:
        """Condense the oldest third of conversation history via summary.

        Replaces raw messages with a single system message containing the
        key facts, decisions, and extracted information.
        """
        if len(self.message_history) < 6:
            return  # Too few messages to summarize meaningfully

        cutoff = len(self.message_history) // 3
        old_messages = self.message_history[:cutoff]
        self.message_history = self.message_history[cutoff:]

        summary_parts = []
        for msg in old_messages:
            if msg["role"] == "user":
                summary_parts.append(f"USER: {msg['content'][:200]}")
            elif msg["role"] == "assistant":
                summary_parts.append(f"ASSISTANT: {msg['content'][:300]}")

        summary = "\n".join(summary_parts)
        self.summary_buffer.append(summary)

        run_id = get_run_id()
        logger.info(
            "[run=%s] SUMMARIZED %d messages, keeping %d in active window",
            run_id,
            cutoff,
            len(self.message_history),
        )

    def get_active_window(self) -> list[dict[str, str]]:
        """Return the current active message window, prepended with summary if available."""
        result: list[dict[str, str]] = []

        if self.summary_buffer:
            combined_summary = "\n--- Previous conversation summary ---\n".join(
                self.summary_buffer[-3:]  # Keep last 3 summaries
            )
            result.append({
                "role": "system",
                "content": combined_summary,
            })

        result.extend(self.message_history)
        return result

    def reset(self) -> None:
        """Clear all state after a successful summarization cycle."""
        self.message_history.clear()
        self.summary_buffer.clear()
        self.budget.reset()
```

Usage — integrate into the agent's message management loop:

```python
ctx_manager = ContextWindowManager(max_tokens=128_000)
ctx_manager.add_message("system", "You are a helpful assistant with access to tools.", estimate_tokens=50)

async def agent_loop(user_query: str, tools: dict[str, Callable]) -> str:
    """Agent loop that manages context window automatically."""
    ctx_manager.add_message("user", user_query, estimate_tokens=len(user_query) // 4)

    for iteration in range(10):  # Bounded by circuit breaker elsewhere
        active_messages = ctx_manager.get_active_window()

        response = await call_llm(active_messages, model="gpt-4o")
        ctx_manager.add_message("assistant", response["response"], estimate_tokens=response.get("usage", {}).get("completion_tokens", 0))

        for action in response.get("actions", []):
            tool_name = action["tool"]
            output = await tools[tool_name](**action["arguments"])
            ctx_manager.add_message(
                "tool",
                str(output)[:4000],  # Truncate long outputs to save tokens
                role="tool",
                estimate_tokens=len(str(output)) // 4,
            )

    return response.get("response", "")
```

---

### Pattern 4: Hallucination Detection in Tool Calls

Validates tool names and arguments against the registered schema before execution. Cross-references LLM output claims against retrieved context to catch factual hallucinations.

```python
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class HallucinationSeverity(Enum):
    """Severity levels for detected hallucinations."""
    LOW = "low"        # Minor: incorrect detail in non-critical output
    MEDIUM = "medium"  # Structural: wrong tool parameter names or missing required args
    CRITICAL = "critical"  # Dangerous: hallucinated tool name, fabricated output claims


@dataclass
class HallucinationReport:
    """Record of a detected hallucination for diagnostics."""
    severity: HallucinationSeverity
    description: str
    location: str  # Where the hallucination was detected (e.g., "tool_name", "output_field")
    llm_claim: str
    expected_pattern: str


class ToolSchemaValidator:
    """Validates tool calls against registered schemas to catch hallucinations.

    Each tool is registered with a schema defining its name, required parameters,
    parameter types, and output field specifications. The validator checks both
    the tool call request and the resulting output before passing them through.
    """

    def __init__(self) -> None:
        self._registered_tools: dict[str, dict[str, Any]] = {}
        self._hallucinations: list[HallucinationReport] = []

    def register_tool(
        self,
        name: str,
        parameters: dict[str, dict[str, Any]],
        required: list[str],
        returns: Optional[list[str]] = None,
    ) -> None:
        """Register a tool's schema for validation.

        Args:
            name: Canonical tool name as defined in the system prompt.
            parameters: Parameter definitions mapping param names to type specs.
                        e.g., {"query": {"type": "string", "description": "..."}}
            required: List of parameter names that must be present.
            returns: Optional list of expected output field names.
        """
        self._registered_tools[name] = {
            "parameters": parameters,
            "required": required,
            "returns": returns or [],
        }

    def validate_tool_call(self, tool_name: str, arguments: dict[str, Any]) -> list[HallucinationReport]:
        """Validate a tool call against registered schemas.

        Checks:
        1. Tool name exists in registered tools (catches hallucinated tool names)
        2. All required parameters are present (catches missing args)
        3. Parameter types match declared schema (catches type mismatches)

        Args:
            tool_name: The tool the LLM intends to call.
            arguments: The arguments passed by the LLM.

        Returns:
            List of HallucinationReport entries (empty if valid).
        """
        reports: list[HallucinationReport] = []

        # Check 1: Tool existence — most common hallucination type
        if tool_name not in self._registered_tools:
            registered_names = list(self._registered_tools.keys())
            report = HallucinationReport(
                severity=HallucinationSeverity.CRITICAL,
                description=f"Tool '{tool_name}' does not exist. Registered tools: {registered_names}",
                location="tool_name",
                llm_claim=tool_name,
                expected_pattern=f"One of: {', '.join(registered_names)}",
            )
            reports.append(report)
            self._hallucinations.append(report)

            run_id = get_run_id()
            logger.critical(
                "[run=%s] HALLUCINATION CRITICAL: tool_name='%s' not in registered tools",
                run_id,
                tool_name,
            )
            return reports  # Skip further validation if tool doesn't exist

        schema = self._registered_tools[tool_name]

        # Check 2: Required parameter presence
        for req_param in schema["required"]:
            if req_param not in arguments:
                report = HallucinationReport(
                    severity=HallucinationSeverity.MEDIUM,
                    description=f"Missing required parameter '{req_param}' for tool '{tool_name}'",
                    location="missing_parameter",
                    llm_claim=f"Called {tool_name} without '{req_param}'",
                    expected_pattern=f"Required params: {schema['required']}",
                )
                reports.append(report)

        # Check 3: Type validation for provided parameters
        param_types = schema["parameters"]
        type_map: dict[str, type] = {
            "string": str,
            "str": str,
            "integer": int,
            "int": int,
            "number": (int, float),
            "float": float,
            "boolean": bool,
            "bool": bool,
            "array": list,
            "list": list,
            "object": dict,
            "dict": dict,
        }

        for param_name, value in arguments.items():
            if param_name in param_types:
                expected_type_name = param_types[param_name].get("type", "string")
                expected_python_type = type_map.get(expected_type_name)
                if expected_python_type and not isinstance(value, expected_python_type):
                    report = HallucinationReport(
                        severity=HallucinationSeverity.MEDIUM,
                        description=(
                            f"Parameter '{param_name}' for tool '{tool_name}' has wrong type: "
                            f"expected {expected_type_name}, got {type(value).__name__}"
                        ),
                        location=f"parameter.{param_name}",
                        llm_claim=f"{param_name}={json.dumps(value)}",
                        expected_pattern=f"type={expected_type_name}",
                    )
                    reports.append(report)

        self._hallucinations.extend(reports)
        return reports

    def get_reports(self) -> list[HallucinationReport]:
        """Return all accumulated hallucination reports."""
        return self._hallucinations

    def clear_reports(self) -> None:
        """Clear accumulated reports after a debug session."""
        self._hallucinations.clear()


class FactualityChecker:
    """LLM-as-judge pattern for checking output claims against retrieved context.

    After a tool produces output, this checker verifies that factual claims in the
    LLM's response are grounded in the tool's actual output rather than hallucinated.
    """

    def score_factual_accuracy(
        self,
        llm_response: str,
        source_context: str,
        max_samples: int = 5,
    ) -> dict[str, Any]:
        """Score how well the LLM's response is grounded in source context.

        Performs a lightweight extraction and cross-reference check: extracts
        factual claims from the LLM response and verifies each against source
        context using simple string containment for non-LLM mode. For higher
        accuracy, integrate with an actual LLM-as-judge call.

        Args:
            llm_response: The model's generated response text.
            source_context: Retrieved context or tool output that should ground the response.
            max_samples: Maximum number of sentences to sample for checking.

        Returns:
            Dictionary with score (0.0–1.0), grounded claims, and hallucinated claims.
        """
        # Extract sentences as candidate claims
        sentences = [
            s.strip()
            for s in llm_response.replace("\n", " ").split(". ")
            if len(s.strip()) > 20
        ][:max_samples]

        grounded = []
        hallucinated = []

        source_lower = source_context.lower()

        for sentence in sentences:
            sentence_lower = sentence.lower()
            # Simple containment check — production systems should use embedding similarity
            if any(word in source_lower for word in sentence_lower.split()[:5]):
                grounded.append(sentence)
            else:
                hallucinated.append(sentence)

        total = len(grounded) + len(hallucinated)
        score = len(grounded) / max(total, 1)

        run_id = get_run_id()
        if hallucinated:
            logger.warning(
                "[run=%s] FACTUALITY CHECK: score=%.2f — %d/%d claims ungrounded",
                run_id,
                score,
                len(hallucinated),
                total,
            )

        return {
            "score": round(score, 3),
            "total_claims_checked": total,
            "grounded": grounded,
            "hallucinated": hallucinated,
            "status": "flagged" if score < 0.7 else "passed",
        }
```

Usage — integrate validation into the agent's tool execution pipeline:

```python
validator = ToolSchemaValidator()

# Register tools before starting the agent
validator.register_tool(
    name="search_database",
    parameters={
        "query": {"type": "string"},
        "limit": {"type": "integer"},
        "filters": {"type": "object"},
    },
    required=["query"],
    returns=["results", "total_count", "took_ms"],
)

validator.register_tool(
    name="update_record",
    parameters={
        "id": {"type": "string"},
        "fields": {"type": "object"},
    },
    required=["id", "fields"],
    returns=["updated_id"],
)


async def execute_tool_safely(
    tool_name: str,
    arguments: dict[str, Any],
    tools: dict[str, Callable],
    source_context: str = "",
) -> tuple[Any | None, list[HallucinationReport]]:
    """Execute a tool with full hallucination detection and validation.

    Args:
        tool_name: The tool the LLM wants to call.
        arguments: Arguments from the LLM's action block.
        tools: Registry of callable tool functions.
        source_context: Retrieved context or prior tool output for factuality checking.

    Returns:
        Tuple of (tool_output_or_none, hallucination_reports).
    """
    # Step 1: Validate against schema
    reports = validator.validate_tool_call(tool_name, arguments)

    if not reports:
        # No issues — execute normally
        tool_fn = tools.get(tool_name)
        if tool_fn is None:
            report = HallucinationReport(
                severity=HallucinationSeverity.CRITICAL,
                description=f"Tool '{tool_name}' not found in callable registry",
                location="tool_registry",
                llm_claim=tool_name,
                expected_pattern="Registered callable tool",
            )
            return None, [report]

        output = await tool_fn(**arguments)

        # Step 2: Optionally check factual grounding if source context available
        if source_context and reports is not None:
            checker = FactualityChecker()
            factuality = checker.score_factual_accuracy(
                llm_response=str(output)[:2000],
                source_context=source_context,
            )
            if factuality["status"] == "flagged":
                logger.warning(
                    "[run=%s] Output may contain hallucinations (score=%.2f)",
                    get_run_id(),
                    factuality["score"],
                )

        return output, reports

    # Step 3: Block execution on critical hallucinations
    has_critical = any(r.severity == HallucinationSeverity.CRITICAL for r in reports)
    if has_critical:
        run_id = get_run_id()
        logger.error(
            "[run=%s] BLOCKED: %d hallucinations detected before tool '%s' execution",
            run_id,
            len(reports),
            tool_name,
        )
        return None, reports

    # Step 4: Warn on medium-severity issues but allow with correction
    for report in reports:
        if report.severity == HallucinationSeverity.MEDIUM:
            logger.warning(
                "[run=%s] WARNING: %s",
                get_run_id(),
                report.description,
            )

    # Attempt to execute anyway after logging warnings — the tool may still work
    tool_fn = tools.get(tool_name)
    if tool_fn:
        output = await tool_fn(**arguments)
        return output, reports

    return None, reports
```

---

## Constraints

### MUST DO
- Always generate a correlation run ID before the first agent step using `generate_run_id()`
- Log every tool call with its arguments, output hash, latency, and success/failure status using structured logging (not print)
- Classify failures by tier (Tier 1/2/3) before applying diagnostics — mixing approaches wastes debugging time
- Implement circuit breakers for any external dependency with more than 2 retry attempts
- Track token usage per step to prevent context window exhaustion — summarize when past 75% budget

### MUST NOT DO
- Use `print()` statements instead of structured logging with run IDs — makes trace reconstruction impossible
- Let an agent loop more than 10 iterations without a circuit breaker checking for repetition
- Disable or bypass circuit breakers "temporarily" for debugging — they protect against runaway costs
- Ignore tool call argument mismatches between schema and actual input — these are early hallucination signals
- Route to this skill for production monitoring and dashboards — use `observability-patterns` instead
- Apply a Tier 1 (high-frequency) fix to a Tier 2 (structural) problem without proper classification first

---

## Related Skills

| Skill | Purpose |
|---|---|
| `observability-patterns` | Production tracing, metrics collection, and dashboarding — this skill is for actively debugging failures, not monitoring them |
| `agentic-evaluation` | Systematic quality evaluation, regression testing, and benchmarking of agent outputs after fixes are applied |
| `multi-agent-orchestration` | Multi-agent coordination patterns when failures span agent boundaries or require cross-pipeline diagnosis |

---

*This skill provides operational debugging tooling for LLM agents. When a failure occurs, follow the Core Workflow in order — classify first, then apply the matching Implementation Pattern.*
