---
name: microservice-resilience-patterns
description: Implements production-ready resilience patterns (circuit breaker, retry
  with exponential backoff, bulkhead isolation, timeout enforcement, graceful fallback)
  to prevent cascading failures in distributed microservice systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: circuit breaker, retry pattern, bulkhead pattern, resilience, fault tolerance,
    timeout handling, graceful degradation, fallback strategy, cascading failure,
    exponential backoff
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
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
  - do-dont
  - examples
  related-skills: microservices-architecture, idempotent-distributed-operations, observability-patterns,
    event-driven-patterns
------
# Microservice Resilience Patterns

Implements production-ready resilience patterns to prevent cascading failures in distributed microservice systems. When loaded, this skill makes the model design, implement, and validate circuit breakers, retry strategies with jitter, bulkhead isolation, timeout enforcement, and graceful degradation mechanisms — all tailored to the specific failure modes of the target architecture.

## TL;DR Checklist

- [ ] Implement a three-state circuit breaker (Closed → Open → Half-Open) with configurable thresholds
- [ ] Add retry logic with exponential backoff and jitter using `random.uniform` for avalanche prevention
- [ ] Isolate critical paths via bulkhead pools — separate thread/executor per downstream dependency
- [ ] Enforce hard timeouts on all inter-service calls; never use infinite waits
- [ ] Provide meaningful fallback responses that degrade gracefully, not silently fail

---

## When to Use

Use this skill when:

- Designing inter-service communication layers in a microservice architecture where failures are inevitable
- Adding resilience guards around HTTP/gRPC calls to downstream dependencies (databases, external APIs, message queues)
- Investigating or preventing cascading failure chains observed in production incidents
- Implementing fault isolation between critical and non-critical service paths
- Building API gateways or service meshes that require unified retry, timeout, and circuit-breaking policies
- Conducting architecture reviews to assess whether a system has adequate resilience against partial outages

## When NOT to Use

Avoid this skill for:

- Single-process applications with no network dependencies — resilience patterns add complexity only worth the cost in distributed systems
- Implementing idempotency or data consistency guarantees — use `idempotent-distributed-operations` instead
- Setting up observability infrastructure (tracing, metrics, logging) — use `observability-patterns` for those concerns; resilience and observability are complementary but distinct

---

## Core Workflow

1. **Map Dependencies & Failure Modes** — Audit every inter-service call in the system. Classify each dependency by its SLA tier (Tier-1: core revenue path, Tier-2: supporting functionality, Tier-3: best-effort). Identify single points of failure and latency-sensitive calls that could trigger cascade chains. **Checkpoint:** Produce a dependency matrix listing every service-to-service call, its timeout, retry policy, and circuit breaker configuration before proceeding.

2. **Select Resilience Patterns Per Dependency** — Apply the pattern selector based on each dependency's characteristics:
   - Read-only, idempotent calls → Retry with backoff only
   - Write operations → Timeout + fallback (no blind retry)
   - High-latency dependencies (>500ms p99) → Circuit breaker with fast-fail
   - Critical path with expensive failures → Bulkhead isolation to contain blast radius
   **Checkpoint:** Every service call in the matrix has an assigned pattern. No dependency is left unguarded.

3. **Implement Circuit Breaker Per Dependency** — Deploy a three-state circuit breaker for every non-trivial outbound call. Configure `failure_threshold` (default 5), `success_threshold` (default 3 for half-open recovery), and `timeout_seconds` (default 30s). Integrate per-metric monitoring: success rate, failure count, state transitions, and latency percentiles. **Checkpoint:** Circuit breaker states are observable via metrics; state transitions log at INFO level with dependency name and reason.

4. **Add Retry Logic with Exponential Backoff + Jitter** — For idempotent operations, implement retry with a configurable max attempt count (default 3), base delay (default 1s), and exponential multiplier (default 2.0). Apply jitter using `random.uniform(base_delay * factor / 2, base_delay * factor)` to prevent thundering herd. Classify exceptions into retryable (timeout, connection error) vs non-retryable (4xx validation errors, serialization errors). **Checkpoint:** Retry logs capture attempt number, delay applied, and exception type. No retries on non-idempotent operations without explicit owner sign-off.

5. **Apply Bulkhead Isolation to Contain Blast Radius** — For high-cardinality dependencies or shared resources, create dedicated thread pools or executor groups per downstream service. Set explicit `max_concurrent` limits and overflow behavior (reject immediately vs queue with timeout). Use the bulkhead pattern on any endpoint where a single slow dependency could starve the entire thread pool. **Checkpoint:** Monitor bulkhead rejection rates; configure alerts when rejections exceed 1% of total calls to that dependency.

6. **Enforce Timeouts & Implement Graceful Fallbacks** — Wrap every outbound call in a hard timeout (connect + read). Define fallback behavior for each guarded call: cached data, stale values, default responses, or user-facing error messages. Never let a downstream timeout propagate as an unhandled exception to the client. Integrate fallback responses into metrics so degradation is visible. **Checkpoint:** Every protected endpoint returns a valid HTTP response (2xx/4xx) under any failure scenario — no 500s from cascaded timeouts.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Circuit Breaker (Three-State Model)

A circuit breaker prevents repeated calls to a failing downstream service by transitioning through three states: **Closed** (normal, counting failures), **Open** (fast-fail after threshold exceeded), and **Half-Open** (testing recovery with limited probe traffic). This pattern follows the principle of fail-fast over slow degradation.

```python
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, TypeVar
import threading
import time

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"          # Normal: requests pass through, failures counted
    OPEN = "open"              # Tripped: all requests fail fast immediately
    HALF_OPEN = "half_open"    # Testing recovery: allow limited probe requests


@dataclass
class CircuitBreakerConfig:
    """Configuration for a circuit breaker instance."""
    failure_threshold: int = 5           # Failures before tripping to Open
    success_threshold: int = 3           # Successes in Half-Open before closing
    timeout_seconds: float = 30.0        # How long Open stays before moving to Half-Open
    half_open_max_calls: int = 3         # Max probe calls allowed in Half-Open state


class CircuitBreakerError(Exception):
    """Raised when a call is rejected by an open circuit breaker."""
    def __init__(self, dependency: str, elapsed_open_seconds: float) -> None:
        self.dependency = dependency
        self.elapsed_open_seconds = elapsed_open_seconds
        super().__init__(
            f"Circuit breaker OPEN for '{dependency}' — "
            f"rejected after {elapsed_open_seconds:.1f}s in open state"
        )


class CircuitBreaker:
    """Three-state circuit breaker with thread-safe state management.

    Transitions:
      Closed --(failure_threshold reached)--> Open
      Open   --(timeout expires)------------> Half-Open
      Half-Open --(success_threshold met)--> Closed
      Half-Open --(any failure)-------------> Open
    """

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None) -> None:
        self.name = name
        self._config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count: int = 0
        self._success_count: int = 0
        self._half_open_calls: int = 0
        self._last_failure_time: datetime | None = None
        self._opened_at: datetime | None = None
        self._lock = threading.RLock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            # Auto-transition from Open to Half-Open when timeout expires
            if self._state == CircuitState.OPEN and self._opened_at:
                elapsed = (datetime.utcnow() - self._opened_at).total_seconds()
                if elapsed >= self._config.timeout_seconds:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    self._half_open_calls = 0
            return self._state

    @property
    def failure_count(self) -> int:
        with self._lock:
            return self._failure_count

    def record_success(self) -> None:
        """Record a successful call. Resets failure count in Closed state."""
        with self._lock:
            if self._state == CircuitState.CLOSED:
                self._failure_count = 0
            elif self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self._config.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0

    def record_failure(self) -> None:
        """Record a failed call. May trip the circuit to Open or reopen from Half-Open."""
        with self._lock:
            now = datetime.utcnow()
            self._last_failure_time = now
            if self._state == CircuitState.CLOSED:
                self._failure_count += 1
                if self._failure_count >= self._config.failure_threshold:
                    self._state = CircuitState.OPEN
                    self._opened_at = now
            elif self._state == CircuitState.HALF_OPEN:
                # Any failure in Half-Open immediately re-trips the circuit
                self._state = CircuitState.OPEN
                self._opened_at = now

    def allow_request(self) -> bool:
        """Check whether an outbound request is permitted.

        Returns True if the call should proceed, False if it must be rejected.
        Raises CircuitBreakerError when the circuit is tripped and caller should
        invoke fallback logic immediately.
        """
        current_state = self.state  # Triggers Open→Half-Open transition check

        if current_state == CircuitState.CLOSED:
            return True
        elif current_state == CircuitState.OPEN:
            raise CircuitBreakerError(
                dependency=self.name,
                elapsed_open_seconds=(
                    (datetime.utcnow() - self._opened_at).total_seconds()
                    if self._opened_at else 0.0
                ),
            )
        else:  # HALF_OPEN
            with self._lock:
                if self._half_open_calls < self._config.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: T) -> T:
        """Execute a function through the circuit breaker with automatic state management.

        Usage:
            cb = CircuitBreaker("payment-service")
            result = cb.execute(call_payment_service, user_id=42)
        """
        if not self.allow_request():
            raise CircuitBreakerError(
                dependency=self.name,
                elapsed_open_seconds=(
                    (datetime.utcnow() - self._opened_at).total_seconds()
                    if self._opened_at else 0.0
                ),
            )

        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as exc:
            self.record_failure()
            raise
```

### Pattern 1b: Circuit Breaker — Usage Example

Below shows how to wire the circuit breaker into a real service call with fallback.

```python
# breaker = CircuitBreaker("inventory-service", CircuitBreakerConfig(
#     failure_threshold=3, success_threshold=2, timeout_seconds=15.0
# ))
# try:
#     stock = breaker.execute(fetch_inventory, sku="PROD-123")
# except CircuitBreakerError:
#     stock = get_cached_inventory(sku="PROD-123")  # fallback
```

### Pattern 2: Retry with Exponential Backoff and Jitter

Retrying every failed call causes thundering herd problems. Exponential backoff spreads retries over time, while jitter adds randomness to prevent synchronized retry storms. This pattern is critical for maintaining stability under partial outages.

```python
import asyncio
import random
import logging
from dataclasses import dataclass
from typing import Callable, TypeVar, Set, Type

T = TypeVar("T")

logger = logging.getLogger(__name__)


@dataclass
class RetryConfig:
    """Configuration for retry with exponential backoff and jitter."""
    max_attempts: int = 3                    # Total attempts including the first try
    base_delay: float = 1.0                  # Base delay in seconds
    max_delay: float = 60.0                  # Cap on delay to prevent excessive waits
    backoff_multiplier: float = 2.0          # Multiplier applied each retry
    jitter_factor: float = 0.5               # Randomness range: [0, jitter_factor * computed_delay]
    retryable_exceptions: Set[Type[Exception]] | None = None
    # Defaults to (TimeoutError, ConnectionError, OSError) if None


class RetryExhaustedError(Exception):
    """Raised when all retry attempts have been exhausted."""

    def __init__(self, operation: str, final_exception: Exception,
                 attempts: int, total_elapsed_seconds: float) -> None:
        self.operation = operation
        self.final_exception = final_exception
        self.attempts = attempts
        self.total_elapsed_seconds = total_elapsed_seconds
        super().__init__(
            f"Operation '{operation}' exhausted {attempts} attempts "
            f"over {total_elapsed_seconds:.1f}s — last error: {final_exception}"
        )


def _compute_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for a given attempt number using exponential backoff with jitter.

    Formula: min(base_delay * (multiplier ** attempt), max_delay) + random jitter.
    The jitter is uniformly distributed in [0, jitter_factor * computed_base_delay].
    """
    computed = config.base_delay * (config.backoff_multiplier ** attempt)
    capped = min(computed, config.max_delay)
    jitter = random.uniform(0, config.jitter_factor * capped)
    return capped + jitter


async def retry_with_backoff(
    func: Callable[..., T],
    *args: Any,
    config: RetryConfig | None = None,
    operation_name: str = "unknown",
    **kwargs: Any,
) -> T:
    """Execute an async function with retry logic using exponential backoff and jitter.

    Args:
        func: The async callable to retry.
        *args: Positional arguments passed to the function.
        config: Retry configuration. Uses defaults if None.
        operation_name: Human-readable label for logging and error reporting.
        **kwargs: Keyword arguments passed to the function.

    Returns:
        The result of the successful call.

    Raises:
        RetryExhaustedError: If all attempts fail with retryable exceptions.
        Exception: Any non-retryable exception is raised immediately (no retry).

    Usage:
        config = RetryConfig(max_attempts=5, base_delay=0.5, max_delay=30.0)
        result = await retry_with_backoff(
            fetch_user_profile, user_id=42, config=config, operation_name="profile-api"
        )
    """
    cfg = config or RetryConfig()

    # Set default retryable exceptions if none specified
    if cfg.retryable_exceptions is None:
        retryable = {TimeoutError, ConnectionError, OSError}
    else:
        retryable = cfg.retryable_exceptions

    last_exception: Exception | None = None
    total_elapsed = 0.0

    for attempt in range(cfg.max_attempts):
        start_time = time.monotonic()

        try:
            # Support both sync and async callables
            import inspect
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            return result

        except Exception as exc:
            last_exception = exc
            elapsed = time.monotonic() - start_time
            total_elapsed += elapsed

            # Non-retryable exception — fail fast immediately
            if not isinstance(exc, retryable):
                logger.error(
                    "Non-retryable exception '%s' for '%s' — aborting without retry",
                    type(exc).__name__, operation_name, exc_info=exc,
                )
                raise

            # Log the failure and remaining attempts
            logger.warning(
                "Attempt %d/%d failed for '%s': %s (%.1fs elapsed) — "
                "retrying in %.2fs",
                attempt + 1, cfg.max_attempts, operation_name,
                type(exc).__name__, elapsed, _compute_delay(attempt, cfg),
            )

            # Don't sleep after the last attempt
            if attempt < cfg.max_attempts - 1:
                delay = _compute_delay(attempt, cfg)
                await asyncio.sleep(delay)

    raise RetryExhaustedError(
        operation=operation_name,
        final_exception=last_exception,
        attempts=cfg.max_attempts,
        total_elapsed_seconds=total_elapsed,
    )


# --- Usage example ---
# config = RetryConfig(max_attempts=5, base_delay=0.5, max_delay=30.0)
# result = await retry_with_backoff(
#     fetch_user_profile, user_id=42, config=config, operation_name="profile-api"
# )
```


### Pattern 2b: Retry — Synchronous Variant

For non-async contexts (e.g., synchronous HTTP clients, Celery tasks), use this variant:

```python
# --- Synchronous variant for non-async contexts ---
def retry_with_backoff_sync(
    func: Callable[..., T],
    *args: Any,
    config: RetryConfig | None = None,
    operation_name: str = "unknown",
    **kwargs: Any,
) -> T:
    """Synchronous version of retry_with_backoff for use outside async contexts."""
    cfg = config or RetryConfig()

    if cfg.retryable_exceptions is None:
        retryable = {TimeoutError, ConnectionError, OSError}
    else:
        retryable = cfg.retryable_exceptions

    last_exception: Exception | None = None
    total_elapsed = 0.0

    for attempt in range(cfg.max_attempts):
        start_time = time.monotonic()

        try:
            result = func(*args, **kwargs)
            return result

        except Exception as exc:
            last_exception = exc
            elapsed = time.monotonic() - start_time
            total_elapsed += elapsed

            if not isinstance(exc, retryable):
                logger.error(
                    "Non-retryable exception '%s' for '%s' — aborting",
                    type(exc).__name__, operation_name, exc_info=exc,
                )
                raise

            logger.warning(
                "Attempt %d/%d failed for '%s': %s — retrying in %.2fs",
                attempt + 1, cfg.max_attempts, operation_name,
                type(exc).__name__, _compute_delay(attempt, cfg),
            )

            if attempt < cfg.max_attempts - 1:
                time.sleep(_compute_delay(attempt, cfg))

    raise RetryExhaustedError(
        operation=operation_name,
        final_exception=last_exception,
        attempts=cfg.max_attempts,
        total_elapsed_seconds=total_elapsed,
    )
```

### Pattern 3: Bulkhead Isolation

Bulkhead isolation partitions thread pools or executor groups so that a failure in one dependency does not exhaust resources available to others. This is critical for the Single Responsibility Principle and preventing thread pool starvation.

```python
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass
from typing import Callable, Any, TypeVar
from enum import Enum

T = TypeVar("T")


class BulkheadPolicy(Enum):
    REJECT_IMMEDIATELY = "reject_immediately"  # Fast-fail when pool exhausted
    QUEUE_WITH_TIMEOUT = "queue_with_timeout"   # Queue with bounded wait


@dataclass
class BulkheadConfig:
    """Configuration for a bulkhead isolation boundary."""
    max_concurrent: int = 10             # Max concurrent calls to this dependency
    queue_size: int = 20                 # Max queued requests (for QUEUE_WITH_TIMEOUT)
    queue_timeout_seconds: float = 5.0   # How long a queued request waits
    policy: BulkheadPolicy = BulkheadPolicy.REJECT_IMMEDIATELY


class BulkheadRejectedError(Exception):
    """Raised when the bulkhead cannot accept a new call."""

    def __init__(self, dependency: str, concurrent_count: int, max_concurrent: int) -> None:
        self.dependency = dependency
        self.concurrent_count = concurrent_count
        self.max_concurrent = max_concurrent
        super().__init__(
            f"Bulkhead for '{dependency}' full — "
            f"{concurrent_count}/{max_concurrent} slots in use, policy rejects immediately"
        )


class Bulkhead:
    """Thread-pool bulkhead that isolates a single downstream dependency.

    Each Bulkhead owns its own ThreadPoolExecutor, ensuring that slow or
    failed calls to one dependency never consume threads from other services.

    Usage:
        bulkhead = Bulkhead("payment-api", max_concurrent=8)
        result = bulkhead.execute(process_payment, order_id=12345)
        bulkhead.shutdown()
    """

    def __init__(
        self,
        dependency_name: str,
        config: BulkheadConfig | None = None,
    ) -> None:
        self._config = config or BulkheadConfig()
        self._dependency = dependency_name
        self._executor: ThreadPoolExecutor = ThreadPoolExecutor(
            max_workers=self._config.max_concurrent,
            thread_name_prefix=f"bulkhead-{self._dependency}",
        )
        self._semaphore = threading.Semaphore(self._config.max_concurrent)
        self._active_count: int = 0
        self._rejected_count: int = 0
        self._lock = threading.Lock()

    @property
    def active_count(self) -> int:
        with self._lock:
            return self._active_count

    @property
    def rejected_count(self) -> int:
        with self._lock:
            return self._rejected_count

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute a callable within this bulkhead's isolation boundary.

        If the maximum concurrent count is reached:
          - REJECT_IMMEDIATELY: raises BulkheadRejectedError immediately
          - QUEUE_WITH_TIMEOUT: queues the call and waits up to queue_timeout_seconds
        """
        if self._config.policy == BulkheadPolicy.REJECT_IMMEDIATELY:
            acquired = self._semaphore.acquire(timeout=0)
            if not acquired:
                with self._lock:
                    self._rejected_count += 1
                raise BulkheadRejectedError(
                    dependency=self._dependency,
                    concurrent_count=self._active_count,
                    max_concurrent=self._config.max_concurrent,
                )
        else:
            acquired = self._semaphore.acquire(
                timeout=self._config.queue_timeout_seconds
            )
            if not acquired:
                with self._lock:
                    self._rejected_count += 1
                raise TimeoutError(
                    f"Bulkhead queue timeout for '{self._dependency}' "
                    f"after {self._config.queue_timeout_seconds}s"
                )

        try:
            future = self._executor.submit(func, *args, **kwargs)
            with self._lock:
                self._active_count += 1
            try:
                return future.result()
            finally:
                with self._lock:
                    self._active_count -= 1
        finally:
            self._semaphore.release()
```

### Pattern 3b: Bulkhead — BAD Example (No Isolation)

Without bulkheads, all services share a single thread pool. A slow downstream call starves everything else.

```python
# ❌ BAD — No bulkhead isolation. All services share one thread pool.
# A slow inventory service can starve the entire application of threads.
shared_executor = ThreadPoolExecutor(max_workers=20)

def handle_order_request_bad(order_id: str) -> dict[str, Any]:
    """Processes an order with NO bulkhead isolation."""
    # If inventory-service hangs, payment-service threads are blocked too
    stock = shared_executor.submit(fetch_inventory, sku="PROD-1").result(timeout=60)
    payment = shared_executor.submit(process_payment, order_id=order_id).result(timeout=30)
    shipping = shared_executor.submit(calculate_shipping, items=stock).result(timeout=30)
    return {"stock": stock, "payment": payment, "shipping": shipping}
```

### Pattern 3c: Bulkhead — GOOD Example (Isolated Pools)

Each dependency gets its own thread pool with bounded concurrency. Failures are contained to their own bulkhead.

```python
# ✅ GOOD — Bulkhead isolation per dependency. Each service has its own pool.
inventory_bulkhead = Bulkhead("inventory-service", BulkheadConfig(max_concurrent=5))
payment_bulkhead = Bulkhead("payment-service", BulkheadConfig(max_concurrent=8))
shipping_bulkhead = Bulkhead("shipping-service", BulkheadConfig(max_concurrent=4))

def handle_order_request_good(order_id: str) -> dict[str, Any]:
    """Processes an order with bulkhead isolation per dependency."""
    # Each service is isolated — inventory timeout does not affect payment threads
    try:
        stock = inventory_bulkhead.execute(fetch_inventory, sku="PROD-1")
    except (BulkheadRejectedError, TimeoutError):
        stock = get_cached_stock_fallback("PROD-1")  # Graceful degradation

    try:
        payment = payment_bulkhead.execute(process_payment, order_id=order_id)
    except (BulkheadRejectedError, TimeoutError):
        raise PaymentUnavailableError("Payment service is at capacity")

    try:
        shipping = shipping_bulkhead.execute(calculate_shipping, items=[stock])
    except (BulkheadRejectedError, TimeoutError):
        shipping = {"rate": 0, "carrier": "unknown", "estimated_days": None}  # Default fallback

    return {"stock": stock, "payment": payment, "shipping": shipping}
```

### Pattern 4: Timeout Enforcement and Graceful Fallback (Async)

Hard timeouts prevent indefinite waits on slow dependencies. Every outbound call must have both a connect timeout and a read deadline. When a timeout occurs, the system falls back to a pre-defined degradation strategy rather than propagating raw errors.

```python
import asyncio
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

T = TypeVar("T")


@dataclass
class TimeoutFallbackConfig:
    """Defines timeout boundaries and fallback behavior for an async call."""
    connect_timeout: float = 2.0     # Time to establish connection
    read_timeout: float = 10.0       # Time to receive first response byte
    total_timeout: float = 15.0      # Absolute ceiling for the entire call

    has_fallback: bool = True
    fallback_source: str = "cache"   # Where to get degraded data


class CallTimeoutError(Exception):
    """Raised when a call exceeds its timeout boundary."""
    pass


async def enforce_timeout_with_fallback(
    operation: Callable[..., Any],
    *args: Any,
    connect_timeout: float = 2.0,
    read_timeout: float = 10.0,
    total_timeout: float = 15.0,
    fallback_fn: Callable[..., T] | None = None,
    fallback_source_name: str = "cache",
    operation_label: str = "unknown",
) -> T:
    """Execute an async operation with layered timeout enforcement and graceful fallback.

    Applies three layers of timeout:
      1. Connect timeout — time to establish the network connection
      2. Read timeout — time to receive the first byte of response
      3. Total timeout — absolute ceiling regardless of intermediate progress

    If any timeout triggers and a fallback function is provided, the fallback
    is invoked instead of propagating the exception to the caller.

    Args:
        operation: Async callable to execute with timeout protection.
        *args: Arguments to pass to the operation.
        connect_timeout: Maximum seconds to wait for connection establishment.
        read_timeout: Maximum seconds to wait after connection for response data.
        total_timeout: Hard ceiling — operation cannot exceed this duration.
        fallback_fn: Optional callable returning degraded data when timeout occurs.
        fallback_source_name: Label for metrics/logging (e.g., "stale cache", "default").
        operation_label: Human-readable name of the guarded operation.

    Returns:
        The result from either the primary call or the fallback function.

    Raises:
        CallTimeoutError: Only if no fallback is available.

    Usage:
        async def fetch_user(user_id: int) -> dict: ...
        user = await enforce_timeout_with_fallback(
            fetch_user, 42,
            connect_timeout=1.0, read_timeout=5.0, total_timeout=8.0,
            fallback_fn=lambda uid: get_cached_user(uid),
            fallback_source_name="stale-cache",
            operation_label="user-profile-api",
        )
    """
    # Wrap the operation with nested timeouts using asyncio.wait_for
    try:
        # Layer 1 & 2: Connect + Read timeout via wrapper
        async def _with_connect_and_read_timeout() -> Any:
            loop = asyncio.get_running_loop()

            async def _coro() -> Any:
                return await operation(*args)

            # Use asyncio.wait_for to enforce the read deadline
            # The connect happens implicitly when the coroutine first runs
            return await asyncio.wait_for(_coro(), timeout=read_timeout)

        # Layer 3: Total timeout wraps everything
        result = await asyncio.wait_for(
            _with_connect_and_read_timeout(),
            timeout=total_timeout,
        )
        return result  # type: ignore[return-value]

    except (asyncio.TimeoutError, TimeoutError):
        if fallback_fn is not None:
            logger.info(
                "Timeout on '%s' (%.1fs total) — using fallback from '%s'",
                operation_label, total_timeout, fallback_source_name,
            )
            return await fallback_fn(*args) if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn(*args)  # type: ignore[misc]
        raise CallTimeoutError(
            f"Operation '{operation_label}' timed out after {total_timeout}s "
            f"(connect={connect_timeout}s, read={read_timeout}s)"
        )


async def timeout_guarded_http_call(
    url: str,
    method: str = "GET",
    connect_timeout: float = 1.0,
    read_timeout: float = 5.0,
    total_timeout: float = 8.0,
    fallback_response: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute an HTTP call with timeout enforcement and structured fallback.

    This is a concrete example showing how timeouts and fallbacks integrate
    in a real-world microservice calling another via HTTP.
    """
    async def _do_call() -> dict[str, Any]:
        # Pseudo-code for illustrative purposes — use httpx or aiohttp in production
        import aiohttp
        timeout = aiohttp.ClientTimeout(
            total=total_timeout,
            connect=connect_timeout,
        )
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.request(method, url) as resp:
                return {"status": resp.status, "body": await resp.json()}

    try:
        result = await asyncio.wait_for(_do_call(), timeout=total_timeout)
        return result
    except (asyncio.TimeoutError, TimeoutError):
        if fallback_response is not None:
            logger.warning("HTTP call to '%s' timed out — returning stale response", url)
            return {**fallback_response, "_degraded": True}
        raise


# --- Usage example ---
# cached_user = {"id": 42, "name": "cached-value", "updated_at": "2026-01-01T00:00:00Z"}
# user_data = await enforce_timeout_with_fallback(
#     fetch_user_profile, user_id=42,
#     connect_timeout=1.0, read_timeout=5.0, total_timeout=8.0,
#     fallback_fn=lambda uid: cached_user,
#     fallback_source_name="stale-cache",
#     operation_label="user-profile-api",
# )
```

---

## Constraints

### MUST DO
- Always set explicit timeouts on every outbound call — never use `timeout=None` or omit the timeout parameter. Default connect timeout is 2s, default read timeout is 10s.
- Apply jitter to all retry delays using `random.uniform(base * factor / 2, base * factor)` to prevent thundering herd when a dependency recovers and hundreds of clients retry simultaneously.
- Use three-state circuit breakers (Closed → Open → Half-Open) rather than simple open/closed toggles — the Half-Open state is essential for detecting service recovery automatically.
- Isolate critical paths with bulkhead pools sized to your deployment capacity — size `max_concurrent` as `(total_threads / num_dependencies)` minus a 20% safety margin.
- Define fallback responses for every protected call and verify that fallback data is explicitly marked (e.g., `_degraded: True`) so downstream consumers know the response quality.

### MUST NOT DO
- Never retry non-idempotent operations (POST, PUT, DELETE) without explicit written approval from the service owner — blind retries on write operations cause duplicate charges, double orders, and data corruption.
- Do not use fixed-delay retries — they create synchronized retry storms that amplify the problem instead of resolving it. Always apply exponential backoff with jitter.
- Never let a timeout propagate as a raw exception to the client — every timeout must be caught and translated into either a fallback response or a user-friendly error code.
- Do not share thread pools across unrelated dependencies in bulkhead implementations — each downstream service gets its own executor to prevent cross-contamination of thread starvation.
- Never implement a circuit breaker without metrics integration — if you cannot observe state transitions, failure rates, and recovery events via Prometheus/Grafana, the circuit breaker is invisible to operators.

---

## Output Template

When applying this skill, produce output containing:

1. **Dependency Analysis Table** — List each downstream dependency with its SLA tier, current timeout settings, and recommended resilience pattern assignment
2. **Pattern Implementation Code** — Full Python implementations of selected patterns with typed signatures, docstrings, and proper exception classes
3. **Configuration Parameters** — Concrete values for `failure_threshold`, `timeout_seconds`, `max_attempts`, `base_delay`, `max_concurrent` based on the specific architecture context
4. **Fallback Strategy Matrix** — For each guarded endpoint, document what fallback is used (cache, default value, stale data) and how degraded responses are marked
5. **Monitoring & Alerting Requirements** — Metrics to expose (circuit state, retry count, bulkhead rejections, timeout rate) and alert thresholds for each resilience component

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Broader microservice design principles that inform where to apply resilience patterns in your architecture |
| `idempotent-distributed-operations` | Ensures operations are safely retriable — required prerequisite before adding retry logic with exponential backoff |
| `observability-patterns` | Metrics, tracing, and logging infrastructure needed to monitor circuit breaker states, retry rates, and bulkhead utilization |
| `event-driven-patterns` | Alternative resilience approach using event sourcing and outbox patterns for eventual consistency across services |

> 📖 skill(local cache): microservice-resilience-patterns
