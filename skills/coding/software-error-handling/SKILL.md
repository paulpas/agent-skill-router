---




name: software-error-handling
description: Implements structured error handling (custom exception hierarchies, retry
  with backoff, circuit breaker, graceful degradation) for resilient, diagnosable,
  and recoverable software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: error handling, exception design, retry logic, circuit breaker, graceful
    degradation, error recovery, resilience patterns, how do i handle errors in software
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
  related-skills: software-engineering-principles, refactoring-techniques, software-testing-strategy,
    observability-patterns




---




# Error Handling & Resilience Patterns

Implements systematic, production-grade error handling that distinguishes between recoverable and unrecoverable failures, provides actionable error messages, and implements resilience patterns (retry with backoff, circuit breaker, fallback) to keep systems functional under adverse conditions. Grounded in SOLID principles — particularly the Open/Closed Principle for extensibility and the Single Responsibility Principle so error handling code is isolated from business logic.

## TL;DR Checklist

- [ ] Define a custom exception hierarchy rooted at `ApplicationError` with domain-specific subclasses
- [ ] Tag every exception as recoverable or unrecoverable using metadata (not bare exceptions)
- [ ] Implement retry with exponential backoff and jitter — never fixed intervals
- [ ] Deploy a circuit breaker before every external dependency call (API, database, file I/O)
- [ ] Provide graceful degradation / fallback for every critical path, even if degraded output
- [ ] Attach structured context (correlation ID, operation, payload hash) to every error log
- [ ] Never swallow exceptions — at minimum, log and wrap them in a domain exception

---

## When to Use

Use this skill when:

- Designing the error handling strategy for a new service or API endpoint
- Refactoring a codebase with bare `except Exception` or `pass` blocks into structured error handling
- Adding resilience (retry, circuit breaker) to external dependency calls (HTTP APIs, databases, message queues)
- Implementing graceful degradation for non-critical features when upstream services fail
- Building an internal SDK that other teams will consume — they need predictable exception hierarchies
- Reviewing error handling in a pull request and finding untyped exceptions or swallowed errors

---

## When NOT to Use

Avoid this skill for:

- Simple script-level error handling with no external dependencies — standard Python exceptions are sufficient
- Performance-critical hot paths where exception overhead is unacceptable (use preconditions / validation instead)
- Situations requiring synchronous failure propagation across network boundaries (use the circuit breaker pattern here, but pair it with observability-patterns for tracing)

---

## Core Workflow

1. **Classify Every Failure** — Determine whether a failure is recoverable (transient network error, temporary DB lock) or unrecoverable (invalid input, missing configuration). **Checkpoint:** Each exception in the hierarchy must be annotatable as `recoverable: bool` via its class attribute.

2. **Design the Exception Hierarchy** — Build a rooted tree of custom exceptions. The root is `ApplicationError` with subclasses for each bounded context (`ValidationError`, `ExternalServiceError`, `InfrastructureError`, `ConfigurationError`). **Checkpoint:** No bare `except Exception` in production code — catch specific hierarchy members or re-raise at the boundary.

3. **Wrap External Calls with Resilience** — Before calling any external system, apply retry (exponential backoff + jitter) and circuit breaker. **Checkpoint:** Circuit breaker half-open state must attempt a probe request before fully restoring traffic.

4. **Implement Fallbacks** — For every critical path, define a degradation strategy: cached response, default value, or partial data. **Checkpoint:** Fallback responses must be explicitly marked as degraded so consumers know data quality is reduced.

5. **Enrich Errors with Structured Context** — Every caught exception must carry: correlation ID, operation name, relevant payload hash (never raw PII), and a human-readable message. **Checkpoint:** Error serialization must produce JSON-structured logs compatible with observability-patterns for downstream tracing.

6. **Surface Errors at Boundaries** — At API boundaries, translate internal exceptions into appropriate HTTP status codes with consistent error envelopes. **Checkpoint:** Never leak stack traces or internal details to clients — use a mapped error envelope instead.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Custom Exception Hierarchy (BAD vs. GOOD)

A well-designed exception hierarchy makes error handling predictable, type-safe, and easy to reason about at every layer.

```python
# ❌ BAD: Flat, untyped exceptions with no structure — callers must guess
def process_order(order_id: str):
    try:
        ...
    except Exception as e:
        print(f"Error: {e}")  # swallowed, no context, impossible to distinguish recoverable
```

```python
# ✅ GOOD: Rooted hierarchy with typed subclasses and recovery metadata
import logging
import uuid
from typing import ClassVar

logger = logging.getLogger(__name__)


class ApplicationError(Exception):
    """Root exception for all application-level errors.
    
    Every custom exception must inherit from this class to enable
    universal catch-all handling at infrastructure boundaries (API layers, job queues).
    """

    recoverable: ClassVar[bool] = False
    http_status: ClassVar[int] = 500

    def __init__(
        self,
        message: str,
        *,
        context: dict | None = None,
        cause: Exception | None = None,
        correlation_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.context = context or {}
        self.cause = cause
        self.correlation_id = correlation_id or str(uuid.uuid4())

    def __str__(self) -> str:
        parts = [f"[{self.__class__.__name__}] {self.message}"]
        if self.correlation_id:
            parts.append(f"corr_id={self.correlation_id}")
        return " | ".join(parts)


class ValidationError(ApplicationError):
    """User provided invalid input. Recoverable — fix input and retry."""

    recoverable: ClassVar[bool] = True
    http_status: ClassVar[int] = 422

    def __init__(self, field: str, value: object, detail: str) -> None:
        super().__init__(
            message=f"Validation failed for field '{field}': {detail}",
            context={"field": field, "value": repr(value), "detail": detail},
        )


class ExternalServiceError(ApplicationError):
    """Call to an external system (API, database, queue) failed."""

    recoverable: ClassVar[bool] = True
    http_status: ClassVar[int] = 502

    def __init__(self, service_name: str, operation: str, *args, **kwargs) -> None:
        kwargs.setdefault("context", {})["service"] = service_name
        kwargs.setdefault("context", {})["operation"] = operation
        super().__init__(*args, **kwargs)


class ConfigurationError(ApplicationError):
    """Missing or invalid application configuration. Unrecoverable — requires fix."""

    recoverable: ClassVar[bool] = False
    http_status: ClassVar[int] = 500


class InfrastructureError(ApplicationError):
    """Underlying infrastructure failure (disk full, connection pool exhausted)."""

    recoverable: ClassVar[bool] = True
    http_status: ClassVar[int] = 503
```

### Pattern 2: Retry with Exponential Backoff and Jitter

Never use fixed-delay retry — it causes thundering herd problems when many clients retry simultaneously. Add jitter to spread retries across time, and use exponential growth to give downstream systems time to recover.

```python
import asyncio
import random
import time
from typing import TypeVar, Callable, Any

T = TypeVar("T")


class RetryExhaustedError(ApplicationError):
    """All retry attempts exhausted. Wraps the last exception."""

    def __init__(self, attempt_count: int, last_exception: Exception) -> None:
        super().__init__(
            message=f"All {attempt_count} retry attempts exhausted",
            context={"attempts": attempt_count, "last_error": str(last_exception)},
            cause=last_exception,
        )


async def retry_with_backoff(
    func: Callable[..., T],
    *,
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_multiplier: float = 2.0,
    jitter_factor: float = 0.5,
    recoverable_exceptions: tuple[type[Exception], ...] | None = None,
) -> T:
    """Execute *func* with exponential backoff and random jitter.

    Implements the "full jitter" strategy described by AWS:
        delay = min(max_delay, random.uniform(0, base_delay * multiplier ** attempt))

    Args:
        func: Async callable to execute.
        max_attempts: Total number of execution attempts (1 initial + retries).
        base_delay: Initial delay in seconds between attempts.
        max_delay: Maximum cap on delay regardless of backoff growth.
        backoff_multiplier: Factor by which delay grows per attempt.
        jitter_factor: Randomization range — actual jitter is uniform(0, jitter_factor * computed_delay).
        recoverable_exceptions: Tuple of exception types that trigger retry.
            Defaults to catching only ApplicationError subclasses marked recoverable.

    Returns:
        The result of *func*.

    Raises:
        RetryExhaustedError: When all attempts are exhausted.
        Exception: Any non-recoverable error raised immediately.
    """
    if recoverable_exceptions is None:
        recoverable_exceptions = (ExternalServiceError, InfrastructureError)

    last_exception: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            result = func()
            # Ensure awaited if coroutine
            if asyncio.iscoroutine(result):
                result = await result
            return result  # type: ignore[return-value]

        except Exception as exc:
            last_exception = exc

            # Immediately retry non-recoverable errors (they'll fail fast)
            is_application_error = isinstance(exc, ApplicationError)
            is_recoverable = getattr(exc, "recoverable", False)

            if not (is_application_error and is_recoverable):
                # Non-application or explicitly unrecoverable — don't retry
                raise

            if attempt == max_attempts:
                break

            # Full jitter strategy: delay in [0, computed_delay]
            computed_delay = min(max_delay, base_delay * (backoff_multiplier ** (attempt - 1)))
            jitter = random.uniform(0, jitter_factor * computed_delay)
            await asyncio.sleep(jitter)

    raise RetryExhaustedError(max_attempts, last_exception)  # type: ignore[arg-type]


# ── Usage Example ────────────────────────────────────────────────
async def fetch_user_from_api(user_id: str) -> dict[str, Any]:
    """Fetch user data with automatic retry on transient failures."""

    async def _do_request() -> dict[str, Any]:
        # Simulated HTTP call — in production: httpx.AsyncClient.get(...)
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"https://api.example.com/users/{user_id}")
            if resp.status_code == 429:
                # Rate limited — retryable
                raise ExternalServiceError(
                    service_name="user-api",
                    operation="GET user",
                    message=f"Rate limited (HTTP 429) for user {user_id}",
                )
            resp.raise_for_status()
            return resp.json()

    return await retry_with_backoff(
        _do_request,
        max_attempts=5,
        base_delay=0.5,
        jitter_factor=0.7,
    )
```

### Pattern 3: Circuit Breaker Pattern

The circuit breaker prevents cascading failures by stopping calls to a failing service until it has time to recover. States: **closed** (normal), **open** (failing — reject immediately), **half-open** (testing recovery with probe requests).

```python
import enum
import threading
import time
from typing import Callable, TypeVar
from dataclasses import dataclass, field

T = TypeVar("T")


class CircuitState(enum.Enum):
    CLOSED = "closed"        # Normal operation — requests flow through
    OPEN = "open"            # Service failing — reject immediately without calling it
    HALF_OPEN = "half_open"  # Testing recovery — allow one probe request through


@dataclass
class CircuitBreakerMetrics:
    """Track circuit breaker statistics for observability."""

    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    state_transitions: int = 0
    last_failure_time: float = 0.0

    def failure_rate(self) -> float:
        if self.total_calls == 0:
            return 0.0
        return self.failed_calls / self.total_calls


class CircuitBreakerError(ApplicationError):
    """Circuit breaker is open — requests are rejected to prevent cascading failure."""

    recoverable: ClassVar[bool] = True
    http_status: ClassVar[int] = 503


@dataclass
class CircuitBreaker:
    """Implements the circuit breaker pattern with state machine semantics.

    State transitions:
        CLOSED → OPEN:   When failure_rate > threshold within the sliding window.
        OPEN → HALF_OPEN: After recovery_timeout seconds, allow one probe request.
        HALF_OPEN → CLOSED:   If probe succeeds, resume normal operation.
        HALF_OPEN → OPEN:     If probe fails, reopen with doubled recovery_timeout.
    """

    failure_threshold: float = 0.5         # 50% failure rate triggers open
    recovery_timeout: float = 30.0         # Seconds before transitioning to half-open
    minimum_calls: int = 10                # Minimum requests before evaluating threshold
    probe_success_threshold: int = 1       # Probes required in half-open to close

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _metrics: CircuitBreakerMetrics = field(default_factory=CircuitBreakerMetrics, init=False)
    _last_failure_time: float = 0.0
    _half_open_successes: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    # --- State Management ---

    @property
    def state(self) -> CircuitState:
        """Return the current circuit state, handling automatic transitions."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - self._last_failure_time
                if elapsed >= self.recovery_timeout:
                    self._transition_to(CircuitState.HALF_OPEN)
            return self._state

    def _transition_to(self, new_state: CircuitState) -> None:
        old_state = self._state
        self._state = new_state
        self._metrics.state_transitions += 1

        if new_state == CircuitState.CLOSED:
            self._half_open_successes = 0
            self._metrics.failed_calls = 0
            self._metrics.total_calls = 0
        elif new_state == CircuitState.HALF_OPEN:
            self._half_open_successes = 0

    # --- Public API ---

    def record_success(self) -> None:
        """Record a successful call to the protected service."""
        with self._lock:
            self._metrics.total_calls += 1
            self._metrics.successful_calls += 1

            if self._state == CircuitState.HALF_OPEN:
                self._half_open_successes += 1
                if self._half_open_successes >= self.probe_success_threshold:
                    self._transition_to(CircuitState.CLOSED)

    def record_failure(self) -> None:
        """Record a failed call to the protected service."""
        with self._lock:
            self._metrics.total_calls += 1
            self._metrics.failed_calls += 1
            self._last_failure_time = time.monotonic()

            if self._state == CircuitState.HALF_OPEN:
                # Probe failed — reopen immediately
                self.recovery_timeout *= 2  # Exponential backoff on recovery
                self._transition_to(CircuitState.OPEN)
                return

            if self._state != CircuitState.CLOSED:
                return

            if (self._metrics.total_calls >= self.minimum_calls and
                    self._metrics.failure_rate() >= self.failure_threshold):
                self._transition_to(CircuitState.OPEN)

    def reject(self) -> None:
        """Reject a call without invoking the protected service."""
        with self._lock:
            self._metrics.rejected_calls += 1
            raise CircuitBreakerError(
                message="Circuit breaker is open — request rejected",
                context={
                    "state": self._state.value,
                    "failure_rate": self._metrics.failure_rate(),
                    "total_calls": self._metrics.total_calls,
                    "recovery_timeout_remaining": max(
                        0, self.recovery_timeout - (time.monotonic() - self._last_failure_time)
                    ),
                },
            )

    def call(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute a function through the circuit breaker.

        Args:
            func: Callable to protect.
            *args, **kwargs: Arguments passed to *func*.

        Returns:
            Result of *func* if the call succeeds.

        Raises:
            CircuitBreakerError: When the circuit is open and rejecting traffic.
        """
        current_state = self.state  # Triggers automatic state transitions

        if current_state == CircuitState.OPEN:
            self.reject()

        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as exc:
            self.record_failure()
            raise


# ── Usage Example ────────────────────────────────────────────────
async def call_payment_gateway(amount: float) -> dict[str, Any]:
    """Process a payment through the gateway with circuit breaker protection."""

    payment_cb = CircuitBreaker(
        failure_threshold=0.6,
        recovery_timeout=15.0,
        minimum_calls=5,
    )

    async def _do_payment() -> dict[str, Any]:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.payment-gateway.com/v1/charge",
                json={"amount": amount},
            )
            if resp.status_code >= 500:
                raise ExternalServiceError(
                    service_name="payment-gateway",
                    operation="POST charge",
                    message=f"HTTP {resp.status_code} from payment gateway",
                )
            return resp.json()

    return await retry_with_backoff(
        lambda: payment_cb.call(_do_payment),
        max_attempts=3,
        base_delay=1.0,
    )
```

### Pattern 4: Graceful Degradation / Fallback Strategy

Critical paths must continue working in degraded mode when dependencies fail. A fallback is not an excuse for poor error handling — it is a deliberate strategy that prioritizes partial availability over total outage.

```python
import functools
import hashlib
from typing import TypeVar, Callable, Any

T = TypeVar("T")


class DegradedResponseError(ApplicationError):
    """A fallback/degraded response was returned instead of live data."""

    recoverable: ClassVar[bool] = True
    http_status: ClassVar[int] = 206  # Partial Content — signals degraded state

    def __init__(self, fallback_source: str, original_exception: Exception | None = None) -> None:
        super().__init__(
            message=f"Returning degraded response from {fallback_source}",
            context={
                "fallback_source": fallback_source,
                "original_error": str(original_exception) if original_exception else None,
            },
            cause=original_exception,
        )


def with_fallback(
    fallback_factory: Callable[[], T],
    *,
    degraded_status: int | None = 206,
    log_degraded: bool = True,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator that wraps a function with a fallback strategy.

    If the wrapped function raises any exception, the fallback factory is called
    instead and a DegradedResponseError is raised to signal the consumer.

    Args:
        fallback_factory: Zero-argument callable producing a fallback value.
            Can return cached data, defaults, or partial results.
        degraded_status: HTTP status code to associate with the degraded response.
            206 (Partial Content) signals "we have some data but not all of it."
        log_degraded: Whether to log at WARNING level when fallback activates.

    Returns:
        Decorated function that falls back on failure.
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                result = func(*args, **kwargs)
                if asyncio.iscoroutine(result):
                    result = await result
                return result  # type: ignore[return-value]

            except Exception as exc:
                logger.warning(
                    "Function %s.%s failed — activating fallback",
                    func.__module__,
                    func.__qualname__,
                    exc_info=True,
                    extra={"original_error": str(exc), "correlation_id": getattr(exc, "correlation_id", None)},
                )

                try:
                    fallback_value = fallback_factory()
                    if asyncio.iscoroutine(fallback_value):
                        fallback_value = await fallback_value
                except Exception as fallback_exc:
                    # Fallback itself failed — escalate with the original error
                    raise ApplicationError(
                        message=f"Primary function {func.__qualname__} and fallback both failed",
                        cause=exc,
                        context={"fallback_error": str(fallback_exc)},
                    ) from fallback_exc

                error = DegradedResponseError(
                    fallback_source=getattr(fallback_factory, "__name__", "unknown"),
                    original_exception=exc,
                )
                raise error

        return wrapper  # type: ignore[return-value]

    return decorator


# ── Usage Example: Product Catalog with Cache Fallback ───────────

_cache: dict[str, dict[str, Any]] = {}


def _load_from_cache(product_id: str) -> dict[str, Any]:
    """Return cached product data if available and fresh (< 5 minutes old)."""
    entry = _cache.get(product_id)
    if entry is None:
        raise KeyError(f"No cached data for product {product_id}")
    # In production: check expiry timestamp here
    return entry.copy()


def _default_product_data(product_id: str) -> dict[str, Any]:
    """Return minimal fallback when no cache exists."""
    return {
        "id": product_id,
        "name": "Product Unavailable",
        "price": 0.0,
        "description": "This product is currently being updated.",
        "in_stock": False,
        "degraded": True,
    }


@with_fallback(
    lambda: _default_product_data(product_id),
    degraded_status=206,
)
async def get_product_details(product_id: str) -> dict[str, Any]:
    """Fetch product details from the catalog service with cache fallback.

    If the catalog service is unavailable, returns cached data (if fresh)
    or a minimal default response indicating degradation.
    """
    import httpx

    # First try to load from cache — don't hit the external API unnecessarily
    if product_id in _cache:
        return await retry_with_backoff(
            lambda: _load_from_cache(product_id),
            max_attempts=1,  # Cache is local, no retries needed
        )

    # Fetch fresh data from catalog service
    async def _fetch() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://api.catalog.example.com/products/{product_id}"
            )
            if resp.status_code == 404:
                return _default_product_data(product_id)
            resp.raise_for_status()
            data = resp.json()
            # Update cache
            _cache[product_id] = data.copy()
            return data

    return await _fetch()
```

---

## Constraints

### MUST DO
- Create a custom exception hierarchy rooted at `ApplicationError` — never use bare `Exception` or `BaseException` for application errors
- Tag every custom exception with a `recoverable` class attribute so callers can programmatically distinguish retryable from permanent failures
- Always add jitter to exponential backoff (`random.uniform(0, factor * delay)`) to prevent thundering herd on retry
- Deploy a circuit breaker on every external dependency boundary (HTTP API, database connection pool, message queue consumer/producer)
- Implement fallback strategies for all critical paths — degraded availability is better than total outage
- Enrich errors with structured context: correlation ID, operation name, relevant payload hash (never raw PII or secrets)
- Wrap infrastructure-level errors at the boundary layer and translate them into domain exceptions before bubbling up
- Log every error at the appropriate level (`ERROR` for unrecoverable, `WARNING` for recoverable + degraded response)

### MUST NOT DO
- Swallow exceptions with bare `except: pass` or `except Exception:` without re-raising, logging, or wrapping — this is the single biggest source of production debugging blindness
- Return empty responses silently when a failure occurs — always signal degradation explicitly via status codes or dedicated error types
- Use fixed-delay retry loops (e.g., `for i in range(5): sleep(1)`) — they create thundering herd and provide no resilience benefit
- Log raw user input, API keys, tokens, or PII as error context — hash payloads for identification but never store sensitive values
- Let internal stack traces leak to API clients — always translate exceptions into a consistent, mapped error envelope at the boundary
- Retry on `ValidationError` or `ConfigurationError` — these are permanent failures; retrying wastes resources and masks real problems
- Set circuit breaker thresholds so low that normal transient noise trips them open (minimum_calls ≥ 10, failure_threshold ≥ 0.4)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-engineering-principles` | SOLID principles and design guidelines that govern how error handling should be structured across modules |
| `refactoring-techniques` | Strategies for incrementally introducing error handling into legacy code with bare `except` blocks |
| `software-testing-strategy` | Testing patterns for resilience — chaos engineering, fault injection tests for retry and circuit breaker paths |
| `observability-patterns` | Structured logging, distributed tracing, and metrics integration that pair with error handling for production diagnostics |
