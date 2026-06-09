---
name: exception-handling-recovery
description: Implements agent resilience patterns including retry logic with exponential backoff, fallback handler chains, state rollback, graceful degradation, and error escalation to maintain reliability under failure conditions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: exception handling, retry logic, fallback handlers, state rollback, graceful degradation, error recovery, how do i make agents resilient, ADK fallback
  related-skills: tool-use-function-calling,planning-patterns,agent-architecture-patterns
  archetypes:
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Exception Handling and Recovery Pattern

Implements resilience mechanisms for AI agents so they detect operational failures, apply structured recovery strategies, and maintain functionality under adverse conditions. This skill makes the model design error detection pipelines, retry logic with exponential backoff, primary/fallback handler chains (such as Google ADK SequentialAgent patterns), state rollback procedures, and escalation paths that prevent cascading failures in production agent systems.

Exception handling is not a single safety net — it is a layered defense spanning detection (validating tool outputs and API responses), response (logging, retries with backoff, fallback functions), recovery (state rollback, self-correction through replanning), and escalation (human-in-the-loop handoff) that together ensure agents remain reliable when the real world fails.

## TL;DR Checklist

- [ ] Wrap every external tool call in a try/except with structured error logging
- [ ] Classify each dependency as transient-retryable, permanent-fail, or idempotent-safe
- [ ] Implement exponential backoff with jitter for retry logic — never fixed delays
- [ ] Design primary/fallback handler chains using SequentialAgent or equivalent pattern
- [ ] Define graceful degradation paths that return fallback data instead of crashing
- [ ] Register state rollback hooks before any mutable operation in agent workflows
- [ ] Configure error escalation thresholds — when to alert humans vs. self-correct

---

### Exception Handling Flow Diagram

```
                    ┌─────────────┐
                    │  Agent Task  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Tool/API    │
                    │ Call        │
                    └──────┬──────┘
                           │
                   ┌───────▼────────┐
                   │ Error?         │
                   └───┬───────┬────┘
              No ↓     │       │ ↑ Yes
                │   ┌──┴──┐  ┌─┴──────┐
                │   │ Log │  │ Classify│
                │   │Err  │  │ Error   │
                │   └──┬──┘  └─┬──────┘
                │      │       └──┬───────┐
                │      │          │        │
           ┌────┴──┐    │    ┌───▼───┐ ┌──▼────┐
           │Return │    │    │Retries│ │ Escalate│
           │Result │    │    │(max N)│ │(human / │
           │       │    │    └───┬───┘ │ fallback)│
           └────────┘    │        │     └─────────┘
                         │   ┌────▼────────┐
                         │   │Fallback      │
                         │   │Handler Chain  │
                         │   │(SequentialAgent)│
                         │   └────┬──────────┘
                         │        │
                   ┌─────▼────────▼────────┐
                   │State Rollback if Failed│
                   └────────────────────────┘
```

## When to Use

Use this skill when:

- An AI agent calls external tools, APIs, or services that may fail intermittently (network timeouts, 5xx errors, rate limits)
- Building a chatbot that must handle database outages without crashing the entire conversation flow
- Designing a trading bot that encounters "insufficient funds," "market closed," or exchange API failures
- Implementing multi-step agent workflows where one step's failure must not corrupt downstream state
- An agent orchestrates smart home devices, web scrapers, or robotics systems where physical components can malfunction
- A data processing agent encounters corrupted files, malformed JSON, or encoding errors in a batch pipeline

---

## When NOT to Use

Avoid this skill for:

- Simple scripts with no external dependencies that run in controlled environments (no network, no tools) — add overhead only where failure is real
- Read-only queries against trusted internal services with guaranteed 100% uptime and zero latency variance
- Prototyping or throwaway code where reliability does not matter — keep it minimal until production readiness
- Operations where retrying would cause duplicate side effects (non-idempotent writes, financial trades) without confirmation logic — use single-attempt with immediate escalation instead

---

## Core Workflow

1. **Classify External Dependencies** — Map every tool, API, or service the agent calls to a failure profile: transient (temporary network/API failures that retries can resolve), permanent (invalid inputs, authorization errors, resource not found), or destructive (writes/trades where retrying causes duplicates). Categorize each by criticality: critical (system cannot function), important (system degrades but remains operational), nice-to-have (fully recoverable without this dependency). **Checkpoint:** Every external call in the agent architecture has exactly one failure profile and criticality tier assigned — no uncategorized dependencies.

2. **Instrument Error Detection** — Before implementing recovery, ensure errors are detectable. Validate tool outputs against expected schemas (check for None, malformed JSON, missing required fields), inspect HTTP status codes (4xx vs 5xx distinction), enforce timeouts on all network calls, and monitor for behavioral anomalies (e.g., an LLM returning empty strings or hallucinated data). Log each error with structured metadata: operation name, input payload, error type, timestamp, attempt count. **Checkpoint:** The agent can distinguish between a transient API failure, a permanent validation failure, and a malformed response from the model — each requires a different recovery strategy.

3. **Implement Retry Logic with Backoff** — For transient-retryable dependencies, apply exponential backoff with jitter. Base delay starts at 1 second, doubles per attempt (up to a configurable maximum), with random jitter added to prevent thundering herd. Limit retries based on dependency criticality: 5 attempts for critical services, 3 for important, 2 for nice-to-have. Non-idempotent operations (writes, trades, state mutations) receive at most a single retry — never auto-retry without confirmation that the first attempt succeeded. **Checkpoint:** The retry policy is configured per-operation-type with max retries, base delay, max delay, exponent factor, and jitter — no bare `while True` loops or fixed-interval retries anywhere in the agent system.

4. **Design Fallback Handler Chains** — For every critical tool call, define a fallback handler that can execute when the primary fails. The fallback must inspect shared state (e.g., `state["primary_failed"]`) to determine whether it should activate, and must return partial or degraded data rather than raising its own errors. Use SequentialAgent or equivalent patterns where sub-agents run in sequence: primary agent attempts the operation, fallback agent checks error state and executes alternative logic, response agent presents final results regardless of which handler succeeded. **Checkpoint:** Each fallback handler has a clear activation condition, returns structured data (never throws), and the sequential chain guarantees that a response is always produced — even if degraded.

5. **Register State Rollback Hooks** — Before any mutable state change in an agent workflow, register a rollback function that reverses the operation on failure. For example: if an agent writes to a database, sends a notification, and updates a trade position, each step must have a corresponding undo function registered before execution begins. On any error during the workflow, execute registered rollbacks in reverse order (LIFO) to restore pre-operation state. **Checkpoint:** Every workflow that modifies external state has rollback hooks registered before the first operation executes, and rollback execution follows strict reverse-order guarantees.

6. **Configure Error Escalation Paths** — Define thresholds for when self-recovery is insufficient and escalation is required. Examples: after max retries exhausted on a critical dependency, after 3 consecutive failures in the same hour, or when error rate exceeds a per-minute threshold. Escalation actions include: sending structured alerts to human operators with full error context, switching to a simplified model variant, entering offline mode, or pausing all non-essential operations. **Checkpoint:** Every escalation path specifies the trigger condition, the escalation target (human, alternate system, fallback mode), and the required context payload — no silent failures or vague "something went wrong" messages.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Primary/Fallback Handler Chain with SequentialAgent

Use a sequence of agents where each stage handles a specific responsibility: primary attempt, fallback activation, and final response formatting. This pattern is native to Google ADK's `SequentialAgent` and can be adapted to other agent orchestration frameworks.

```python
from google.adk.agents import Agent, SequentialAgent
from typing import Any


def create_resilient_location_agent() -> SequentialAgent:
    """Build a resilient location lookup with primary/fallback/response chain.

    The primary handler attempts precise geocoding. If it fails (detected via
    state flag), the fallback handler falls back to city-level lookup. The
    response agent always produces user-facing output regardless of outcome.
    """

    primary_handler = Agent(
        name="primary_location_lookup",
        model="gemini-2.0-flash-exp",
        instruction="""\
Your job is to get precise location information using the
get_precise_location_info tool with the user's provided address.

If the tool call succeeds, store the result in state["location_result"].
If the tool call fails or returns None, set state["primary_failed"] = True
and leave state["location_result"] empty.\
""",
        tools=[get_precise_location_info],
    )

    fallback_handler = Agent(
        name="fallback_area_lookup",
        model="gemini-2.0-flash-exp",
        instruction="""\
Check if the primary location lookup failed by inspecting
state["primary_failed"].

If it is True, extract the city from state["user_query"] and call
get_general_area_info to retrieve a broader location result.
Store the result in state["location_result"] with a "source": "fallback" tag.

If primary_failed is not set or is False, do nothing.\
""",
        tools=[get_general_area_info],
    )

    response_agent = Agent(
        name="location_response_formatter",
        model="gemini-2.0-flash-exp",
        instruction="""\
Review state["location_result"]. Present the location information
clearly and concisely to the user. If the source is "fallback", add a note
that this is approximate area-level data rather than precise coordinates.

If state["location_result"] does not exist or is empty, apologize and
explain that the service could not retrieve location data at this time.\
""",
        tools=[],  # Pure reasoning — no external tool calls
    )

    return SequentialAgent(
        name="robust_location_agent",
        sub_agents=[primary_handler, fallback_handler, response_agent],
    )


# Usage: the agent executes the full chain automatically
location_agent = create_resilient_location_agent()
result = location_agent.generate_content("Show me weather for 1600 Pennsylvania Ave")
```

**BAD:** Single agent with no fallback — any tool failure crashes the conversation.

```python
# ❌ BAD — no resilience, single point of failure
single_agent = Agent(
    name="fragile_location_agent",
    model="gemini-2.0-flash-exp",
    instruction="Look up the location and show weather.",  # Too vague
    tools=[get_precise_location_info],
)
# If get_precise_location_info raises an exception, the entire agent fails.
# No fallback, no error handling, no graceful degradation.
```

### Pattern 2: Retry with Exponential Backoff and Jitter

Implement a generic retry decorator that classifies errors as retryable or permanent, applies exponential backoff with jitter, and tracks attempt counts for structured logging.

```python
import asyncio
import functools
import logging
import random
import time
from typing import Any, Callable, TypeVar, ParamSpec

logger = logging.getLogger(__name__)

T = TypeVar("T")
P = ParamSpec("P")


class RetryableError(Exception):
    """Wrappable error indicating the operation may succeed on retry."""
    pass


class PermanentError(Exception):
    """Wrappable error indicating the operation will not succeed on retry."""
    pass


def retry_with_backoff(
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponent_factor: float = 2.0,
    jitter_base: float | None = None,
    retryable_exceptions: tuple[type[Exception], ...] | None = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Decorator that retries a function with exponential backoff and jitter.

    Args:
        max_retries: Maximum number of retry attempts (default 5).
        base_delay: Initial delay in seconds before first retry (default 1.0).
        max_delay: Cap on delay to prevent excessively long waits (default 60.0).
        exponent_factor: Base for exponential growth per attempt (default 2.0).
        jitter_base: Maximum jitter added uniformly [0, jitter_base) in seconds.
            Defaults to half of base_delay if not specified.
        retryable_exceptions: Tuple of exception types that trigger a retry.
            Non-matching exceptions are raised immediately without retry.

    Returns:
        Wrapped function with retry logic applied.

    Raises:
        MaxRetriesExceededError: When all retry attempts are exhausted.
        PermanentError: If the wrapped function raises a permanently-failing error.
    """
    if jitter_base is None:
        jitter_base = base_delay * 0.5
    if retryable_exceptions is None:
        retryable_exceptions = (ConnectionError, TimeoutError, OSError, RetryableError)

    def decorator(fn: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_error: Exception | None = None

            for attempt in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except PermanentError as e:
                    logger.error(
                        "Permanent failure during '%s' on attempt %d/%d: %s",
                        fn.__name__, attempt + 1, max_retries + 1, e,
                    )
                    raise  # Do not retry permanent errors
                except retryable_exceptions as e:
                    last_error = e
                    if attempt < max_retries:
                        delay = min(max_delay, base_delay * (exponent_factor ** attempt))
                        jitter = random.uniform(0, jitter_base)
                        total_delay = delay + jitter
                        logger.warning(
                            "Retryable error on '%s' attempt %d/%d (%s), "
                            "retrying in %.1fs",
                            fn.__name__, attempt + 1, max_retries + 1,
                            type(e).__name__, total_delay,
                        )
                        time.sleep(total_delay)
                    else:
                        logger.error(
                            "All %d retries exhausted for '%s'. Last error: %s",
                            max_retries, fn.__name__, last_error,
                        )
                        raise MaxRetriesExceededError(
                            operation=fn.__name__,
                            last_error=last_error,
                            total_attempts=max_retries + 1,
                        ) from last_error
                except Exception as e:
                    # Catch-all for unexpected errors — log and re-raise without retry
                    logger.exception(
                        "Unexpected error during '%s' attempt %d/%d: %s",
                        fn.__name__, attempt + 1, max_retries + 1, e,
                    )
                    raise

            # Should never reach here, but type-checkers need it
            raise RuntimeError(f"Unreachable: {fn.__name__}") from last_error  # type: ignore[misc]

        return wrapper  # type: ignore[return-value]

    return decorator


class MaxRetriesExceededError(Exception):
    """Raised after all retry attempts have been exhausted."""

    def __init__(self, operation: str, last_error: Exception, total_attempts: int) -> None:
        self.operation = operation
        self.last_error = last_error
        self.total_attempts = total_attempts
        super().__init__(
            f"Operation '{operation}' failed after {total_attempts} attempts. "
            f"Last error: {last_error}"
        )


# --- Concrete examples ---

@retry_with_backoff(
    max_retries=5,
    base_delay=1.0,
    max_delay=30.0,
    jitter_base=0.5,
)
def fetch_customer_data(customer_id: str) -> dict[str, Any]:
    """Fetch customer data from the database with full retry protection."""
    # Raises ConnectionError on network failure, PermanentError on 404
    response = http_get(f"/api/customers/{customer_id}")
    if response.status_code == 404:
        raise PermanentError(f"Customer {customer_id} not found")
    response.raise_for_status()
    return response.json()


@retry_with_backoff(
    max_retries=1,  # Single retry only — non-idempotent write
    base_delay=1.0,
    jitter_base=0.25,
)
def execute_trade(symbol: str, side: str, quantity: float) -> str:
    """Execute a trade with exactly one retry attempt for transient failures."""
    order = submit_order(symbol, side, quantity)
    # Non-idempotent — never auto-retry without confirmation of the first attempt
    if order.get("status") == "confirmed":
        return order["order_id"]
    raise RetryableError(f"Trade execution ambiguous: {order}")
```

### Pattern 3: State Rollback with Context Manager

Use a context manager to register rollback hooks before mutable operations and execute them in reverse order on any failure. This follows the resource acquisition is initialization (RAII) pattern adapted for agentic workflows.

```python
import contextlib
from typing import Callable


class StateRollbackManager:
    """Context manager that registers and executes state rollback hooks.

    Usage:
        with StateRollbackManager() as rm:
            rm.register(lambda: undo_step_1())
            rm.register(lambda: undo_step_2())
            # ... perform operations that may fail ...

    If any operation raises, all registered rollbacks execute in reverse (LIFO) order.
    Rollback errors themselves are caught and logged — they never mask the original error.
    """

    def __init__(self, name: str = "rollback_context") -> None:
        self.name = name
        self._hooks: list[tuple[str, Callable[[], None]]] = []
        self._rolled_back: bool = False

    def register(self, label: str, rollback_fn: Callable[[], None]) -> None:
        """Register a rollback hook with a descriptive label.

        Args:
            label: Human-readable name for the operation being rolled back.
            rollback_fn: Zero-argument callable that reverses the operation.
        """
        self._hooks.append((label, rollback_fn))

    def __enter__(self) -> "StateRollbackManager":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> bool:
        if exc_type is None:
            # No exception — do nothing
            return False

        logger.error(
            "StateRollbackManager(%s): exception detected (%s), executing rollbacks...",
            self.name, exc_type.__name__,
        )

        original_error = exc_val
        rollback_errors: list[Exception] = []

        # Execute in reverse LIFO order
        for label, rollback_fn in reversed(self._hooks):
            try:
                logger.info("Rolling back: %s", label)
                rollback_fn()
            except Exception as rb_err:
                rollback_errors.append(rb_err)
                logger.error(
                    "Rollback FAILED for '%s': %s", label, rb_err, exc_info=True,
                )

        if rollback_errors:
            # Log all rollback errors but still raise the original error
            logger.critical(
                "StateRollbackManager(%s): %d rollback(s) failed after primary error",
                self.name, len(rollback_errors),
            )

        return False  # Do not suppress the exception


# --- Concrete example: multi-step order workflow with state rollback ---

def process_order_with_rollback(order_data: dict[str, Any]) -> str:
    """Process an order through multiple steps with automatic rollback on failure."""
    with StateRollbackManager(name="order_processing") as rm:
        # Step 1: Validate and reserve inventory
        inventory_reservation = reserve_inventory(order_data["items"])
        rm.register(
            "reserve_inventory",
            lambda r=inventory_reservation: release_reservation(r),
        )

        # Step 2: Process payment
        payment_result = process_payment(order_data["payment_info"])
        rm.register(
            "process_payment",
            lambda p=payment_result: refund_payment(p),
        )

        # Step 3: Create shipping label
        shipping_label = create_shipping_label(order_data["shipping_address"])
        rm.register(
            "create_shipping_label",
            lambda s=shipping_label: cancel_shipping(s),
        )

    # All three steps succeeded — return order confirmation
    return f"Order confirmed: {payment_result['confirmation_id']}"


# Step 3 fails → rollbacks execute in reverse:
#   1. cancel_shipping(shipping_label)
#   2. refund_payment(payment_result)
#   3. release_reservation(inventory_reservation)
```

### Pattern 4: Graceful Degradation System

Design a degradation manager that evaluates system health, activates fallback data paths, and tracks the current operational mode (full/limited/minimal/offline). This enables agents to serve partial results instead of failing entirely.

```python
from enum import Enum
import time
from typing import Any, Callable


class DegradationMode(Enum):
    FULL = "full"           # All services operational
    LIMITED = "limited"     # Non-critical services degraded
    MINIMAL = "minimal"     # Only core functionality available
    OFFLINE = "offline"     # System cannot serve requests


class ServiceHealth:
    """Tracks health status and fallback configuration for a single service."""

    def __init__(self, name: str, tier: str) -> None:
        self.name = name
        self.tier = tier  # "critical", "important", "optional"
        self.healthy = True
        self.fallback_active = False
        self.last_check = time.time()

    def mark_healthy(self) -> None:
        self.healthy = True
        self.fallback_active = False
        self.last_check = time.time()

    def mark_unhealthy(self) -> None:
        self.healthy = False
        self.fallback_active = True
        self.last_check = time.time()


class GracefulDegradationManager:
    """Manages degradation decisions and fallback activation across services."""

    def __init__(self) -> None:
        self._services: dict[str, ServiceHealth] = {}
        self._fallbacks: dict[str, Callable[[], Any]] = {}
        self._current_mode = DegradationMode.FULL

    def register_service(
        self,
        name: str,
        tier: str,
        fallback_fn: Callable[[], Any] | None = None,
    ) -> ServiceHealth:
        health = ServiceHealth(name, tier)
        self._services[name] = health
        if fallback_fn is not None:
            self._fallbacks[name] = fallback_fn
        return health

    def evaluate_mode(self) -> DegradationMode:
        """Determine the overall system degradation mode based on service health.

        Rules:
          - OFFLINE: no critical services healthy
          - MINIMAL: at least one critical service unhealthy
          - LIMITED: all critical healthy, but important services degraded
          - FULL: everything healthy
        """
        critical_healthy = all(
            h.healthy for h in self._services.values() if h.tier == "critical"
        )
        important_healthy = all(
            h.healthy for h in self._services.values() if h.tier == "important"
        )

        if not critical_healthy:
            return DegradationMode.MINIMAL
        elif not important_healthy:
            return DegradationMode.LIMITED
        return DegradationMode.FULL

    def call_with_fallback(
        self, service_name: str, fallback_default: Any = None
    ) -> tuple[Any, bool]:
        """Call a primary function if healthy; otherwise execute its fallback.

        Returns:
            Tuple of (result, used_fallback) where used_fallback indicates whether
            the fallback path was activated.
        """
        health = self._services.get(service_name)
        if not health or health.healthy:
            # Primary path — caller invokes real function directly
            return None, False

        fallback_fn = self._fallbacks.get(service_name)
        if fallback_fn:
            try:
                result = fallback_fn()
                return result, True
            except Exception as e:
                logger.error(
                    "Fallback for '%s' also failed: %s", service_name, e, exc_info=True,
                )
                return fallback_default, True

        return fallback_default, True


# --- Concrete example: agent system with multiple degraded paths ---

degradation = GracefulDegradationManager()

degradation.register_service(
    name="customer_database",
    tier="critical",
    fallback_fn=lambda: {"error": "Database unavailable", "mode": "cached"},
)
degradation.register_service(
    name="payment_gateway",
    tier="important",
    fallback_fn=lambda: {"status": "pending_manual_review", "note": "Payment queued"},
)
degradation.register_service(
    name="recommendation_engine",
    tier="optional",
    fallback_fn=lambda: [],  # Empty recommendations are acceptable degradation
)


def process_customer_request(customer_id: str) -> dict[str, Any]:
    """Process a customer request with full graceful degradation."""
    mode = degradation.evaluate_mode()
    result: dict[str, Any] = {"mode": mode.value, "customer_id": customer_id}

    # Database call with fallback
    db_data, used_fallback = degradation.call_with_fallback("customer_database")
    if db_data is not None:
        result["data_source"] = "fallback" if used_fallback else "live"
        result["customer"] = db_data
    else:
        # Primary path — call real database directly
        result["customer"] = _fetch_customer_from_db(customer_id)  # type: ignore[name-defined]

    return result
```

---

## Constraints

### MUST DO
- Wrap every external tool call (API, database, file I/O, LLM inference) in a try/except with structured logging that captures operation name, input payload, error type, and attempt count — following the "fail fast" law from `code-philosophy` to halt on invalid states immediately
- Classify each error as transient-retryable, permanent-fail, or destructive before choosing a recovery strategy — never use the same retry policy for all error types
- Apply exponential backoff with jitter (`random.uniform(0, base_delay * 0.5)`) for all retryable transient failures — fixed delays cause thundering herd problems under load
- Design fallback handlers that inspect shared state to determine activation and always return structured data (never throw their own errors) — graceful degradation means returning partial results, not cascading exceptions
- Register state rollback hooks in reverse-order-safe context managers before any mutable operation executes — this implements the "early exit" law from `code-philosophy` by handling the failure path explicitly at the top of every workflow
- Configure escalation thresholds with explicit trigger conditions and context payloads — when max retries are exhausted or error rate exceeds a per-minute threshold, escalate to human operators or switch to offline mode
- Validate tool outputs against expected schemas before passing them downstream — detect malformed responses, empty strings, hallucinated data, or missing required fields before they propagate through the agent system

### MUST NOT DO
- Retry non-idempotent operations more than once without confirmation that the first attempt did not succeed — duplicate trades, double charges, and corrupted writes are worse than missed operations
- Set circuit breaker recovery timeout below 10 seconds or retry base delay below 500ms — rapid oscillation between states wastes resources and amplifies failures
- Implement a fallback function that itself throws exceptions without handling — degraded paths must always return something useful to the caller, following the "parse don't validate" law from `code-philosophy` by producing well-formed outputs even under failure
- Use bare `except Exception: pass` anywhere in error handling code — silent failures destroy observability and make debugging impossible; every caught exception must be logged with structured context
- Bypass retry logic for critical dependencies just because the system "feels slow" — this defeats the entire resilience architecture; use observability metrics to tune thresholds instead of removing safeguards

- Assume an LLM's response is valid without schema validation — hallucinated tool arguments, empty content blocks, and malformed JSON from the model must be caught and retried with refined prompts (reflective recovery)

---

## Output Template

When implementing or reviewing exception handling and recovery for an AI agent system, produce:

1. **Dependency Failure Map** — Table listing every external dependency with columns: name, tool/API, failure profile (transient/repermanent/destructive), criticality tier (critical/important/nice-to-have), retry policy applied
2. **Error Detection Rules** — Schema validation rules for each tool output, HTTP status code handling strategy, timeout configurations per endpoint, and behavioral anomaly detection criteria for LLM responses
3. **Retry Configuration** — Per-operation retry settings: max_retries, base_delay, max_delay, exponent_factor, jitter_base, retryable_exceptions list — with justification for each choice
4. **Fallback Handler Specification** — For each primary tool call: the fallback agent/function name, activation condition (state flag or error type), return data structure, and degradation impact on user experience
5. **Rollback Registration Plan** — List of all mutable operations in each workflow paired with their registered rollback functions and execution order guarantees
6. **Escalation Matrix** — Trigger conditions (retry exhaustion, error rate thresholds, consecutive failure counts), escalation targets (human operator ID, fallback system, offline mode), and required context payloads for each path

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | External tool integration — exception handling wraps every tool call defined in this skill |
| `planning-patterns` | Multi-step plan execution — recovery strategies apply when plan steps fail mid-execution |
| `agent-architecture-patterns` | Agent system structure — resilience mechanisms are layered on top of architectural patterns |
