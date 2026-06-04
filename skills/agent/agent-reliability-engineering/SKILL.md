---
name: agent-reliability-engineering
description: Implements fault-tolerance mechanisms for AI agent systems including
  circuit breakers, exponential backoff retries, graceful degradation, health checks,
  dead letter queues, and timeout management with observability hooks.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: fault tolerance, circuit breaker, retry strategy, exponential backoff,
    graceful degradation, health check, dead letter queue, timeout management, reliability
    engineering, agent resilience
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: agent-architecture-patterns, workflow-patterns, failure-mode-analysis
---
# Agent Reliability Engineering

Implements fault-tolerance mechanisms for AI agent systems to ensure graceful operation under partial failure. This skill guides the model in applying circuit breakers, retry strategies, degradation patterns, health monitoring, and observability primitives that keep agent systems operational when external dependencies fail.

Reliability is not a single pattern — it is a layered defense spanning detection (health checks), prevention (circuit breakers), recovery (retries with backoff), mitigation (graceful degradation), learning (dead letter queues), and visibility (observability hooks) that together prevent cascading failures from taking down the entire agent system.

## TL;DR Checklist

- [ ] Configure circuit breakers per external dependency with domain-appropriate thresholds
- [ ] Implement exponential backoff with jitter for all retryable operations
- [ ] Design graceful degradation paths for each critical service dependency
- [ ] Register health checks (startup, readiness, liveness) in correct lifecycle order
- [ ] Set up dead letter queues for failed operations requiring manual review
- [ ] Wire observability hooks at every failure boundary for metrics collection

---

## When to Use

Use this skill when:

- Implementing fault tolerance for an agent system that depends on external APIs or services
- Designing retry strategies with appropriate backoff policies for transient failures
- Building circuit breakers to prevent cascading failures across agent dependencies
- Creating graceful degradation paths when downstream services are unavailable
- Setting up health checks and monitoring for agent lifecycle management
- Implementing dead letter queues for failed operations that need later analysis or reprocessing
- Adding observability hooks (metrics, tracing, logging) at failure boundaries

## When NOT to Use

Avoid this skill for:

- Internal in-process failures — use exception handling patterns instead of circuit breakers
- Operations where idempotency guarantees exist and simple retry without backoff suffices
- Read-only operations with cached results — add cache invalidation strategies instead
- As a substitute for fixing root causes — reliability patterns mask symptoms, they do not cure them

---

## Core Workflow

1. **Classify External Dependencies** — Categorize every external dependency by failure impact and recovery expectation:
   - Critical: System cannot function without this (e.g., primary LLM provider). Requires circuit breaker + retry + degradation path.
   - Important: System degrades but remains operational (e.g., secondary data source). Requires circuit breaker + retry with shorter timeout.
   - Nice-to-have: System continues fully without this (e.g., telemetry enrichment). Requires retry with aggressive timeout only.

2. **Configure Circuit Breakers** — Set per-dependency thresholds based on dependency classification:
   - Critical dependencies: `failure_threshold=3`, `recovery_timeout=30s`, `half_open_max_calls=1`
   - Important dependencies: `failure_threshold=5`, `recovery_timeout=60s`, `half_open_max_calls=3`
   - Nice-to-have dependencies: `failure_threshold=10`, `recovery_timeout=120s`, `half_open_max_calls=5`

3. **Implement Retry with Backoff** — Apply the appropriate retry policy per dependency type:
   - Transient errors (5xx, timeouts): exponential backoff with jitter starting at 1 second, max 5 retries, max 60 seconds total
   - Idempotent operations: fixed-window retry up to 3 attempts with 2-second intervals
   - Non-idempotent operations (writes, trades): single retry with 1-second delay only — never auto-retry without explicit confirmation

4. **Design Degradation Paths** — For each critical dependency, define what "graceful degradation" means:
   - Primary LLM down → fall back to cached responses or simplified model
   - Market data feed unavailable → use last-known prices with staleness markers
   - External API rate-limited → queue requests and retry at reduced throughput

5. **Register Health Checks** — Implement three-level health check hierarchy:
   - Startup: verify local resources (file access, port binding, config validity)
   - Readiness: verify all critical dependencies are reachable and responding
   - Liveness: periodic heartbeat that confirms the process is not in a zombie state

6. **Wire Observability Hooks** — At every failure boundary, emit structured telemetry:
   - Failure events with dependency name, error code, attempt count, retry delay
   - Circuit breaker state transitions (closed → open → half_open → closed)
   - Health check results at each level (startup/ready/live) with timestamps
   - Dead letter queue depths and processing rates

---

## Implementation Patterns

### Pattern 1: Circuit Breaker with State Machine

```python
from enum import Enum
import time
import threading


class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation — requests flow freely
    OPEN = "open"           # Failure threshold exceeded — requests fail fast
    HALF_OPEN = "half_open" # Recovery probe — limited requests allowed to test restoration


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open and request is rejected."""

    def __init__(self, dependency: str, state: CircuitState) -> None:
        self.dependency = dependency
        self.state = state
        super().__init__(f"Circuit breaker for '{dependency}' is {state.value}")


class CircuitBreaker:
    """State-machine circuit breaker with configurable thresholds.

    Transitions:
      CLOSED → OPEN:     when failure_count >= failure_threshold within monitoring_window
      OPEN → HALF_OPEN:  when recovery_timeout_seconds has elapsed since opening
      HALF_OPEN → CLOSED: when half_open_successes successes occur in a row
      HALF_OPEN → OPEN:  on any failure during half-open probing
    """

    def __init__(
        self,
        dependency: str,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 30.0,
        half_open_max_calls: int = 1,
        half_open_successes: int = 2,
        monitoring_window_seconds: float = 60.0,
    ) -> None:
        self.dependency = dependency
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.half_open_max_calls = half_open_max_calls
        self.half_open_successes = half_open_successes

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count_since_failure = 0
        self._half_open_calls = 0
        self._opened_at: float = 0.0
        self._lock = threading.Lock()
        self._history: list[dict] = []

    @property
    def state(self) -> CircuitState:
        """Current circuit breaker state with auto-transition from OPEN to HALF_OPEN."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - self._opened_at
                if elapsed >= self.recovery_timeout_seconds:
                    self._transition(CircuitState.HALF_OPEN)
            return self._state

    def _transition(self, new_state: CircuitState) -> None:
        """Record state transition in history and reset per-state counters."""
        old_state = self._state
        self._state = new_state
        self._history.append({
            "from": old_state.value,
            "to": new_state.value,
            "timestamp": time.time(),
        })

        if new_state == CircuitState.CLOSED:
            self._failure_count = 0
            self._success_count_since_failure = 0
            self._half_open_calls = 0
        elif new_state == CircuitState.OPEN:
            self._opened_at = time.monotonic()
            self._half_open_calls = 0
        elif new_state == CircuitState.HALF_OPEN:
            self._half_open_calls = 0

    def record_success(self) -> None:
        """Record a successful request. May transition HALF_OPEN → CLOSED."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count_since_failure += 1
                if self._success_count_since_failure >= self.half_open_successes:
                    logger.info(
                        "CircuitBreaker(%s): %d successes in half-open → CLOSED",
                        self.dependency, self.half_open_successes,
                    )
                    self._transition(CircuitState.CLOSED)

    def record_failure(self) -> None:
        """Record a failed request. May transition to OPEN or stay OPEN."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.warning(
                    "CircuitBreaker(%s): failure in half-open → OPEN",
                    self.dependency,
                )
                self._transition(CircuitState.OPEN)
                return

            self._failure_count += 1
            if self._failure_count >= self.failure_threshold:
                logger.warning(
                    "CircuitBreaker(%s): %d failures in %.0fs window → OPEN",
                    self.dependency, self.failure_count, self.monitoring_window_seconds,
                )
                self._transition(CircuitState.OPEN)

    def allow_request(self) -> bool:
        """Check if a request should be allowed through the circuit breaker.

        Returns True if the request may proceed. Raises CircuitBreakerError if rejected.
        """
        current_state = self.state  # Triggers auto-transition check

        if current_state == CircuitState.CLOSED:
            return True

        if current_state == CircuitState.HALF_OPEN:
            with self._lock:
                if self._half_open_calls < self.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
            raise CircuitBreakerError(self.dependency, CircuitState.HALF_OPEN)

        # OPEN state — reject immediately
        raise CircuitBreakerError(self.dependency, CircuitState.OPEN)

    def get_status(self) -> dict:
        """Return current circuit breaker status as a serializable dict."""
        return {
            "dependency": self.dependency,
            "state": self.state.value,
            "failure_count": self._failure_count,
            "success_count_since_failure": self._success_count_since_failure,
            "half_open_calls": self._half_open_calls,
            "transition_history": self._history[-10:],  # Last 10 transitions
        }

    def reset(self) -> None:
        """Manually reset circuit breaker to closed state."""
        with self._lock:
            self._transition(CircuitState.CLOSED)


# Example usage: per-dependency circuit breakers in an agent system
llm_circuit = CircuitBreaker(
    dependency="openai_api",
    failure_threshold=3,
    recovery_timeout_seconds=30.0,
    half_open_max_calls=1,
    half_open_successes=2,
)

data_circuit = CircuitBreaker(
    dependency="market_data_feed",
    failure_threshold=5,
    recovery_timeout_seconds=60.0,
    half_open_max_calls=3,
    half_open_successes=2,
)


async def call_llm_with_breaker(prompt: str) -> str:
    """LLM call wrapped with circuit breaker protection."""
    if not llm_circuit.allow_request():
        raise CircuitBreakerError("openai_api", llm_circuit.state)

    try:
        response = await fetch_llm_response(prompt)  # external API call
        llm_circuit.record_success()
        return response
    except Exception as e:
        llm_circuit.record_failure()
        raise


async def fetch_market_data(symbol: str) -> dict:
    """Market data fetch with its own circuit breaker."""
    if not data_circuit.allow_request():
        # Degradation path: return last-known price instead of failing
        return {"symbol": symbol, "price": None, "source": "cached_stale"}

    try:
        data = await fetch_from_feed(symbol)  # external API call
        data_circuit.record_success()
        return data
    except Exception:
        data_circuit.record_failure()
        raise
```

### Pattern 2: Exponential Backoff Retry with Jitter

```python
import asyncio
import random
from typing import Any, Callable, TypeVar

T = TypeVar("T")


class MaxRetriesExceededError(Exception):
    """Raised when all retry attempts have been exhausted."""

    def __init__(
        self, operation: str, last_error: Exception, total_attempts: int,
        total_elapsed_seconds: float,
    ) -> None:
        self.operation = operation
        self.last_error = last_error
        self.total_attempts = total_attempts
        self.total_elapsed_seconds = total_elapsed_seconds
        super().__init__(
            f"Operation '{operation}' failed after {total_attempts} attempts "
            f"in {total_elapsed_seconds:.1f}s. Last error: {last_error}"
        )


class RetryPolicy:
    """Configurable retry policy with exponential backoff and jitter.

    Backoff formula: min(max_delay, base_delay * (exponent_factor ^ attempt) + random_jitter)

    The jitter prevents thundering herd problems when many agents retry simultaneously.
    Random jitter is uniformly distributed between 0 and base_delay * 0.5.
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponent_factor: float = 2.0,
        jitter_base: float | None = None,
        retryable_exceptions: tuple[type[Exception], ...] | None = None,
    ) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponent_factor = exponent_factor
        self.jitter_base = jitter_base if jitter_base is not None else base_delay * 0.5
        self.retryable_exceptions = retryable_exceptions or (
            ConnectionError, TimeoutError, OSError, RuntimeError
        )

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for a given attempt number (0-indexed)."""
        exponential = self.base_delay * (self.exponent_factor ** attempt)
        jitter = random.uniform(0, self.jitter_base)
        return min(self.max_delay, exponential + jitter)

    async def execute(
        self, operation: str, fn: Callable[..., Any], *args: Any, **kwargs: Any
    ) -> T:
        """Execute an async function with retry logic.

        Args:
            operation: Human-readable name for error reporting.
            fn: Async callable to execute with retries.
            *args, **kwargs: Arguments passed to the callable.

        Returns:
            The result of fn(*args, **kwargs) on success.

        Raises:
            MaxRetriesExceededError: After all retry attempts are exhausted.
        """
        last_error: Exception | None = None
        total_start = asyncio.get_event_loop().time()

        for attempt in range(self.max_retries + 1):
            try:
                if asyncio.iscoroutinefunction(fn):
                    return await fn(*args, **kwargs)
                else:
                    return fn(*args, **kwargs)  # type: ignore[misc]
            except self.retryable_exceptions as e:
                last_error = e
                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.info(
                        "RetryPolicy(%s): attempt %d failed (%s), retrying in %.1fs",
                        operation, attempt + 1, type(e).__name__, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    elapsed = asyncio.get_event_loop().time() - total_start
                    raise MaxRetriesExceededError(
                        operation, e, self.max_retries + 1, elapsed,
                    ) from e

            except Exception as e:
                # Non-retryable exception — fail immediately
                raise


class FixedWindowRetryPolicy(RetryPolicy):
    """Fixed-window retry policy for idempotent operations.

    Unlike exponential backoff, uses a constant delay between retries.
    Appropriate when the operation is idempotent and rapid recovery is desired.
    """

    def __init__(self, max_retries: int = 3, fixed_delay: float = 2.0) -> None:
        super().__init__(
            max_retries=max_retries,
            base_delay=fixed_delay,
            max_delay=fixed_delay,
            exponent_factor=1.0,  # No exponential growth
            jitter_base=fixed_delay * 0.1,  # Small jitter only
        )


# Example usage: retry strategies for different operation types
async def fetch_with_retry(url: str) -> dict:
    """Fetch remote data with exponential backoff — for transient failures."""
    policy = RetryPolicy(
        max_retries=5,
        base_delay=1.0,
        max_delay=30.0,
        exponent_factor=2.0,
        jitter_base=0.5,
    )

    return await policy.execute(
        operation=f"fetch_{url}",
        fn=lambda: asyncio.get_event_loop().run_in_executor(None, _http_get, url),
    )


async def submit_order_with_retry(order_id: str, side: str, quantity: float) -> str:
    """Submit order with single retry — non-idempotent, must not over-execute."""
    policy = RetryPolicy(
        max_retries=1,          # Only one retry
        base_delay=1.0,
        max_delay=1.0,
        jitter_base=0.25,       # Minimal jitter for quick feedback
    )

    return await policy.execute(
        operation=f"submit_order_{order_id}",
        fn=lambda: _execute_trade(order_id, side, quantity),
    )
```

### Pattern 3: Graceful Degradation System

```python
from abc import ABC, abstractmethod
from typing import Any


class DegradationMode(Enum):
    FULL = "full"           # All services operational
    LIMITED = "limited"     # Some non-critical services degraded
    MINIMAL = "minimal"     # Only core functionality available
    OFFLINE = "offline"     # System cannot serve requests


class ServiceHealth:
    """Tracks health status of an individual service."""

    def __init__(self, name: str, tier: str = "critical") -> None:
        self.name = name
        self.tier = tier  # "critical", "important", "optional"
        self.healthy = True
        self.last_check: float = 0.0
        self.error_count = 0
        self.fallback_active = False

    def mark_healthy(self) -> None:
        self.healthy = True
        self.last_check = __import__("time").time()
        if self.error_count > 0:
            logger.info("ServiceHealth(%s): recovered from %d errors", self.name, self.error_count)
            self.error_count = 0

    def mark_unhealthy(self) -> None:
        self.healthy = False
        self.last_check = __import__("time").time()
        self.error_count += 1


class DegradationManager:
    """Manages graceful degradation across the agent system.

    Evaluates overall system health and activates appropriate degradation mode.
    Each service can provide a fallback function that returns degraded results
    when the primary path is unavailable.
    """

    def __init__(self) -> None:
        self._services: dict[str, ServiceHealth] = {}
        self._fallbacks: dict[str, Callable] = {}
        self._current_mode = DegradationMode.FULL
        self._mode_change_history: list[dict] = []

    def register_service(
        self, name: str, tier: str = "critical", fallback: Callable | None = None
    ) -> ServiceHealth:
        """Register a service with its dependency tier and optional fallback."""
        health = ServiceHealth(name, tier)
        self._services[name] = health
        if fallback:
            self._fallbacks[name] = fallback
        return health

    def evaluate(self) -> DegradationMode:
        """Evaluate overall system health and determine current degradation mode.

        Rules:
          - OFFLINE: any critical service is unhealthy
          - MINIMAL: all critical services OK, but important services degraded
          - LIMITED: all critical + important OK, optional services degraded
          - FULL: everything healthy
        """
        critical_healthy = all(
            h.healthy for n, h in self._services.items() if h.tier == "critical"
        )
        important_healthy = all(
            h.healthy for n, h in self._services.items() if h.tier == "important"
        )

        new_mode = DegradationMode.FULL
        if not critical_healthy:
            new_mode = DegradationMode.MINIMAL
        elif not important_healthy:
            new_mode = DegradationMode.LIMITED

        if new_mode != self._current_mode:
            old_mode = self._current_mode
            self._current_mode = new_mode
            self._mode_change_history.append({
                "from": old_mode.value,
                "to": new_mode.value,
                "timestamp": __import__("time").time(),
            })
            logger.info("DegradationManager: %s → %s", old_mode.value, new_mode.value)

        return self._current_mode

    @property
    def current_mode(self) -> DegradationMode:
        return self.evaluate()

    def call_with_fallback(
        self, service_name: str, fallback_default: Any = None
    ) -> Any:
        """Call a service if healthy, otherwise use fallback.

        Returns the fallback default when the service is unhealthy and a fallback exists.
        """
        health = self._services.get(service_name)
        if not health or health.healthy:
            # Service is available — caller should invoke the real function directly
            return None  # Signal to use primary path

        fallback_fn = self._fallbacks.get(service_name)
        if fallback_fn:
            try:
                return fallback_fn()
            except Exception as e:
                logger.warning("Fallback for '%s' also failed: %s", service_name, e)
                return fallback_default

        return fallback_default

    def get_health_report(self) -> dict:
        """Return comprehensive health report for all registered services."""
        mode = self.evaluate()
        services = {
            name: {
                "tier": h.tier,
                "healthy": h.healthy,
                "error_count": h.error_count,
                "fallback_active": h.fallback_active,
            }
            for name, h in self._services.items()
        }
        return {
            "mode": mode.value,
            "total_services": len(services),
            "healthy_count": sum(1 for s in services.values() if s["healthy"]),
            "services": services,
            "mode_change_history": self._mode_change_history[-5:],
        }

    def simulate_failure(self, service_name: str) -> None:
        """Mark a service as unhealthy (for testing)."""
        health = self._services.get(service_name)
        if health:
            health.mark_unhealthy()


# Example usage in an agent system with concrete degradation paths
manager = DegradationManager()

manager.register_service("openai_api", tier="critical", fallback=lambda: "⚠️ Using cached response (LLM unavailable)")
manager.register_service("market_data_feed", tier="important", fallback=lambda: {"status": "stale_data"})
manager.register_service("telemetry_enricher", tier="optional")


async def generate_strategy(signal: str) -> str:
    """Generate trading signal with full LLM + degraded cached fallback."""
    result = manager.call_with_fallback("openai_api", fallback_default="[CACHED] Previous signal analysis available")
    if result is not None:
        return f"DEGRADED: {result}"

    # Primary path — call real LLM
    return await _call_openai_for_signal(signal)  # type: ignore[name-defined]


async def get_market_data(symbol: str) -> dict:
    """Fetch market data with stale-data fallback."""
    result = manager.call_with_fallback("market_data_feed", fallback_default={"price": None, "note": "no_data"})
    if result is not None and isinstance(result, dict) and "source" in result:
        return result  # Already has fallback structure

    data = await _fetch_real_market_data(symbol)
    if "price" not in data or data["price"] is None:
        manager._services["market_data_feed"].mark_unhealthy()

    return data
```

### Pattern 4: Dead Letter Queue with Replay Support

```python
import queue
import json
import time
from typing import Any


class DeadLetterEntry:
    """Represents a failed operation stored in the dead letter queue."""

    def __init__(self, operation: str, payload: dict, error: Exception, timestamp: float | None = None) -> None:
        self.operation = operation
        self.payload = payload
        self.error = error
        self.timestamp = timestamp or time.time()
        self.attempt_count = 0
        self.retried = False

    def to_dict(self) -> dict:
        return {
            "operation": self.operation,
            "payload": self.payload,
            "error": str(type(self.error).__name__) + ": " + str(self.error),
            "timestamp": self.timestamp,
            "attempt_count": self.attempt_count,
            "retried": self.retried,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DeadLetterEntry":
        return cls(
            operation=data["operation"],
            payload=data["payload"],
            error=RuntimeError(data.get("error", "unknown")),
            timestamp=data.get("timestamp", 0),
        )


class DeadLetterQueue:
    """Persistent dead letter queue for failed agent operations.

    Stores failed operations with full context (operation name, input payload, error).
    Supports manual replay of individual entries and bulk reprocessing with configurable
    limits to prevent overwhelming downstream services during recovery.
    """

    def __init__(self, max_size: int = 10000) -> None:
        self._queue: queue.Queue[DeadLetterEntry] = queue.Queue(maxsize=max_size)
        self._processed: list[DeadLetterEntry] = []

    def push(
        self, operation: str, payload: dict, error: Exception, attempt_count: int = 1
    ) -> DeadLetterEntry:
        """Add a failed operation to the dead letter queue.

        Returns the created entry regardless of queue capacity. If full,
        oldest entry is evicted and returned (lost).
        """
        entry = DeadLetterEntry(operation, payload, error)
        entry.attempt_count = attempt_count

        try:
            self._queue.put_nowait(entry)
        except queue.Full:
            evicted = self._queue.get_nowait()
            logger.warning("DeadLetterQueue: full — evicted oldest entry for '%s'", evicted.operation)
            self._queue.put_nowait(entry)

        return entry

    def pop(self, count: int = 1) -> list[DeadLetterEntry]:
        """Remove and return up to `count` entries for replay."""
        entries = []
        for _ in range(count):
            try:
                entry = self._queue.get_nowait()
                entries.append(entry)
            except queue.Empty:
                break
        return entries

    def replay(self, entry: DeadLetterEntry, handler: Callable[[dict], Any]) -> Any:
        """Replay a single dead letter entry through the provided handler.

        Args:
            entry: The failed operation to retry.
            handler: Callable that processes the payload (the original function).

        Returns:
            The result of calling handler(entry.payload).

        Raises:
            Exception: If replay also fails, re-queues the entry.
        """
        entry.retried = True
        try:
            result = handler(entry.payload)
            logger.info("DeadLetterQueue: successfully replayed '%s'", entry.operation)
            self._processed.append(entry)
            return result
        except Exception as e:
            logger.error("DeadLetterQueue: replay of '%s' also failed: %s", entry.operation, e)
            try:
                self._queue.put_nowait(entry)
            except queue.Full:
                pass
            raise

    def bulk_replay(self, handler: Callable[[dict], Any], max_retries: int = 100) -> dict[str, int]:
        """Replay up to `max_retries` entries. Returns counts by status."""
        results = {"replayed": 0, "failed": 0, "empty_queue": 0}

        entries = self.pop(max_retries)
        if not entries:
            results["empty_queue"] = 1
            return results

        for entry in entries:
            try:
                handler(entry.payload)
                results["replayed"] += 1
                self._processed.append(entry)
            except Exception:
                results["failed"] += 1
                try:
                    self._queue.put_nowait(entry)
                except queue.Full:
                    pass

        return results

    @property
    def size(self) -> int:
        return self._queue.qsize()

    @property
    def processed_count(self) -> int:
        return len(self._processed)

    def get_stats(self) -> dict:
        """Return queue statistics for monitoring."""
        return {
            "pending": self._queue.qsize(),
            "max_size": 10000,
            "total_processed": self.processed_count,
        }


# Example usage with concrete failure handling
dlq = DeadLetterQueue(max_size=5000)


async def process_trade_with_dlq(payload: dict) -> str:
    """Process a trade that may fail — failures go to dead letter queue."""
    try:
        result = await submit_order(payload["symbol"], payload["side"], payload["quantity"])  # type: ignore[name-defined]
        return result
    except Exception as e:
        entry = dlq.push("trade_execution", payload, e)
        logger.error("Trade execution failed for %s — stored in DLQ (depth: %d)", payload.get("symbol"), dlq.size)
        raise


# After market data recovers, replay failed trades
def trade_handler(payload: dict) -> str:
    return _execute_trade_sync(payload["symbol"], payload["side"], payload["quantity"])

stats = dlq.bulk_replay(trade_handler, max_retries=50)
logger.info("DLQ replay complete: %d succeeded, %d failed", stats["replayed"], stats["failed"])
```

---

## Constraints

### MUST DO
- Configure circuit breakers per external dependency with thresholds matching that dependency's criticality tier
- Use exponential backoff with jitter for all retryable transient failures — never use fixed delays for retrying non-idempotent operations
- Design explicit degradation paths for every critical service dependency — "graceful failure" means returning useful fallback data, not throwing errors everywhere
- Register health checks at startup, readiness, and liveness levels in that exact order during the agent lifecycle
- Store failed operations in a dead letter queue with full payload context before giving up — do not silently drop failures
- Wire observability hooks at every failure boundary: circuit breaker transitions, retry attempts, health check results, DLQ depth

### MUST NOT DO
- Retry non-idempotent operations more than once without confirmation that the first attempt did not succeed
- Set circuit breaker recovery timeout below 10 seconds — this causes rapid oscillation between open and closed states
- Implement a fallback function that itself throws exceptions without handling — degraded paths must always return something useful
- Use bare `except Exception` in retry wrappers without logging the specific error type
- Bypass the circuit breaker for critical dependencies just because it is "open" — this defeats the purpose entirely
- Store dead letter entries with truncated payloads — the full context needed to diagnose and replay failures
- Set max retries above 5 without a business justification documented alongside the configuration

---

## Output Template

When implementing or reviewing agent reliability mechanisms, produce:

1. **Dependency Classification** — List of all external dependencies with tier assignment (critical/important/nice-to-have)
2. **Circuit Breaker Configuration** — Per-dependency settings: failure threshold, recovery timeout, half-open parameters
3. **Retry Policy Specification** — Max retries, base delay, max delay, exponent factor, jitter config per operation type
4. **Degradation Map** — For each critical dependency: primary function → fallback function → fallback return value
5. **Health Check Registry** — Startup checks, readiness checks (with timeout per dependency), liveness heartbeat interval
6. **DLQ Configuration** — Max queue size, retention policy, replay handler registration, bulk replay limits
7. **Observability Plan** — Metrics collected, log format for failure events, alert thresholds for circuit breaker states

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-architecture-patterns` | Structural architecture that reliability mechanisms are layered on top of |
| `workflow-patterns` | Linear workflows with built-in error handling paths at each step |
| `failure-mode-analysis` | Systematic analysis of failure modes to determine which dependencies need circuit breakers |
