---
name: error-handling-patterns
description: Implements modern error handling patterns (Result types, error wrapping, retry with backoff, circuit breakers, panic recovery) to eliminate unchecked exceptions and silent failures in production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: error handling, Result type, error wrapping, circuit breaker, retry pattern, exception safety, how do i handle errors properly, panic recovery
  archetypes:
  - tactical
  - diagnostic
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
  related-skills: ports-patterns, monolith-refactoring, production-readiness, input-validation
---

# Modern Error Handling Patterns

Acts as a senior engineer implementing robust error handling strategies that eliminate unchecked exceptions, silent failures, and lost context in production systems. When loaded, the model designs typed result types using Rust-style `Result` patterns in Python/TypeScript, wraps errors with actionable context chains, implements retry logic with exponential backoff and jitter integrated with circuit breakers, and builds panic recovery mechanisms for unhandled runtime errors.

## TL;DR Checklist

- [ ] Replace bare `raise / catch` at system boundaries with a typed `Result[E, T]` or `Either` wrapper
- [ ] Wrap every caught exception with context — never swallow the original traceback; use `raise ... from exc` in Python or `cause` chains in TypeScript
- [ ] Implement retry with exponential backoff (`delay * 2^attempt + jitter`) capped at a maximum number of attempts and total duration
- [ ] Integrate circuit breaker (Closed → Open → Half-Open) around all external calls — never retry a failing dependency without a breaker
- [ ] Add a top-level panic/unhandled exception handler that logs full context, returns a user-safe error message, and triggers alerting
- [ ] Use `from __future__ import annotations` for forward-ref-friendly type hints on Result types to avoid circular imports
- [ ] Never use bare `except:` or `catch (e) {}` — always narrow the exception type to something specific

---

## When to Use

Use this skill when:

- Designing a new service or library where error boundaries must be explicit from day one rather than bolted on later
- Refactoring a legacy codebase that relies on bare `raise / catch` with lost context and inconsistent error shapes across modules
- Building an integration layer (HTTP client, message queue consumer, database connector) that needs retry and circuit-breaking guarantees
- Adding observability to an existing system — structured error wrapping provides the exact context needed for tracing and alerting
- Onboarding engineers to a team standard that mandates typed error handling, explicit retries, and no silent failures

---

## When NOT to Use

Avoid this skill for:

- **Simple scripts or throwaway tooling** — A bare `try/except` with a print statement is sufficient; Result types add indirection without benefit
- **Performance-critical inner loops where Result type overhead is measurable** — If profiling confirms that wrapping/unwrapping in hot paths adds >1% latency, fall back to exceptions and document the trade-off
- **UI event handlers in interactive desktop apps** — Modal dialogs and user prompts require different error presentation; use this skill for the business logic layer underneath, not the UI surface

---

## Core Workflow

1. **Audit existing error handling** — Search the codebase for bare `except:`, bare `catch`, and places where exceptions are logged but not propagated. Record each site as a finding with its file path, line number, and whether context is preserved or lost.
   **Checkpoint:** Every audit finding must be classified as (a) boundary-level handler (safe to wrap), (b) library call site (needs retry/circuit breaker), or (c) swallowed exception (must be fixed immediately).

2. **Define a Result type for the domain** — Create a generic `Result[E, T]` that carries either a successful value or an error. Use Python's `typing.Union` with discriminated unions or the `returns` library; in TypeScript use a tagged union (`{ ok: true, value: T } | { ok: false, error: E }`). The Result type becomes the return type of every function that can fail — no exceptions escape the function signature.
   **Checkpoint:** Every public API function that can fail must return `Result[AppError, Outcome]` instead of raising. Internal helpers may still use exceptions if they are called only after preconditions guarantee safety.

3. **Wrap errors at integration boundaries** — At every call site to external systems (HTTP clients, databases, message brokers), catch the low-level exception, attach contextual metadata (request ID, endpoint URL, payload hash, timestamp), and re-raise as your domain error type. Use Python's `raise from` or TypeScript `Error.cause`.
   **Checkpoint:** The original traceback must remain inspectable. In Python: `raise AppError("Failed to fetch user", context) from exc`. In TypeScript: `throw new AppError(..., { cause: original })`.

4. **Add retry with exponential backoff + jitter + circuit breaker** — For every external call that is idempotent or has a well-defined retry policy, wrap it in a retry decorator/function. Use the formula `delay = base_delay * (2 ^ attempt) + random(0, jitter_ms)`. Integrate a circuit breaker: when failure rate exceeds the configured threshold within the sliding window, trip to Open state and fail fast without calling the dependency.
   **Checkpoint:** Verify that every retryable call has both a maximum-attempt cap AND a total-timeout cap. A call with no timeout will block indefinitely during cascading failures.

5. **Install top-level panic recovery** — At the entry point of every service (HTTP server, message consumer, CLI), register an unhandled exception handler that captures the full stack trace, serializes contextual metadata to structured JSON logs, emits a metrics counter for alerting, and returns a user-safe error response. The handler must never leak internal details.
   **Checkpoint:** Write a test that forces an unhandled exception and assert that (a) a log line with `level: "error"` appears, (b) the HTTP 500 response body does not contain stack traces or internal paths, and (c) the error counter metric increments by exactly one.

---

## Implementation Patterns

### Pattern 1: Result Type / Either Monad (Python + TypeScript Equivalents)

Rust's `Result<T, E>` is the modern gold standard for explicit error handling — it forces callers to handle both success and failure cases at compile time. In Python and TypeScript we simulate this with discriminated unions or a dedicated Result class. This eliminates the possibility of forgetting to handle an error path.

```python
"""Result type implementation using the returns library pattern."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Generic, TypeVar, Callable, Any
from functools import wraps
import traceback

T = TypeVar("T")
E = TypeVar("E", bound=Exception)


@dataclass(frozen=True)
class Error:
    """Discriminated union error variant."""
    message: str
    code: str = "UNKNOWN"
    context: dict[str, Any] = field(default_factory=dict)
    original: Exception | None = None

    def __str__(self) -> str:
        parts = [f"[{self.code}] {self.message}"]
        if self.original:
            parts.append(f"(caused by: {type(self.original).__name__}: {self.original})")
        return " -> ".join(parts)


@dataclass(frozen=True)
class Ok(Generic[T]):
    """Discriminated union success variant."""
    value: T

    @property
    def is_ok(self) -> bool:
        return True

    @property
    def is_err(self) -> bool:
        return False


@dataclass(frozen=True)
class Err(Generic[E]):
    """Discriminated union error variant."""
    value: E

    @property
    def is_ok(self) -> bool:
        return False

    @property
    def is_err(self) -> bool:
        return True


# Type alias for readability
Result = Ok[T] | Err[E]


def ok(value: T) -> Ok[T]:
    """Factory function for success variant."""
    return Ok(value=value)


def err(message: str, code: str = "UNKNOWN", original: Exception | None = None) -> Err[Error]:
    """Factory function for error variant with automatic Error wrapping."""
    return Err(value=Error(message=message, code=code, original=original))


# ---- Usage Example ----

def fetch_user(user_id: str) -> Result[Ok[dict], Err[Error]]:
    """Simulate a database lookup that can fail.

    The caller MUST handle both Ok and Err — they cannot ignore the error case.
    This is the compile-time guarantee Rust gets natively; Python gets via convention.
    """
    if not user_id or not user_id.strip():
        return err("user_id must be a non-empty string", code="VALIDATION_ERROR")

    try:
        # Simulate DB lookup — in production this hits PostgreSQL/Redis
        user_data = {"id": user_id, "name": "Alice", "email": "alice@example.com"}
        return ok(user_data)
    except ConnectionError as exc:
        return err(
            f"Database connection failed for user_id={user_id}",
            code="DB_UNAVAILABLE",
            original=exc,
        )


def get_user_email(result: Result[Ok[dict], Err[Error]]) -> str | None:
    """Caller must handle the error case explicitly — no silent failures."""
    if result.is_ok:
        return result.value.get("email")
    # Error case is handled here, not silently ignored
    print(f"Failed to fetch user: {result.value}")
    return None


# ✅ GOOD: Caller handles both branches explicitly.
user_result = fetch_user("abc-123")
if user_result.is_ok:
    email = user_result.value["email"]
    print(f"User email: {email}")
elif user_result.is_err:
    error = user_result.value
    if error.code == "DB_UNAVAILABLE":
        # Fallback path — cache or default value
        email = "unknown@example.com"
    else:
        raise  # Re-raise unrecoverable errors

# ❌ BAD: Ignoring the error case (this compiles but is a logic bug).
user_result = fetch_user("abc-123")
email = user_result.value["email"]  # Crashes if result is Err — silent failure in disguise
```

### Pattern 2: Error Wrapping and Context Chaining (BAD vs GOOD)

When catching exceptions, always attach actionable context. The original error must remain inspectable via traceback or cause chains. Never swallow the original exception — it is the only source of truth about what actually failed.

```python
"""Error wrapping with context chaining — BAD vs GOOD comparisons."""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any
import traceback
import uuid

logger = logging.getLogger(__name__)


# ---- BAD: Swallowed exception, lost context ----

def bad_payment_process(user_id: str, amount: float) -> None:
    """❌ BAD: Catches exception and silently does nothing.
    No one will ever know a payment failed. Production money is lost forever."""
    try:
        # Simulate external payment gateway call
        if amount < 0:
            raise ValueError("Amount must be positive")
        # ... actual HTTP call to Stripe/PayPal would go here
    except Exception:
        pass  # SILENT FAILURE — no log, no alert, no retry


def bad_payment_process_v2(user_id: str, amount: float) -> None:
    """❌ BAD: Logs the exception but loses the traceback and context."""
    try:
        if amount < 0:
            raise ValueError("Amount must be positive")
    except Exception as exc:
        logger.error(f"Payment failed: {exc}")  # No traceback, no user_id, no amount


# ---- GOOD: Structured error wrapping with full context chain ----

@dataclass(frozen=True)
class PaymentError(Error):
    """Domain-specific error for payment failures."""
    user_id: str = ""
    amount_cents: int = 0
    gateway_tx_id: str | None = None
    attempt_number: int = 0

    def to_log_context(self) -> dict[str, Any]:
        """Structured context suitable for JSON logging / distributed tracing."""
        return {
            "error_type": self.code,
            "user_id": self.user_id,
            "amount_cents": self.amount_cents,
            "gateway_tx_id": self.gateway_tx_id,
            "attempt_number": self.attempt_number,
            "trace_id": str(uuid.uuid4()),
        }


def good_payment_process(user_id: str, amount: float) -> Result[Ok[str], Err[PaymentError]]:
    """✅ GOOD: Wraps exceptions with full context, preserves original traceback.

    The caller receives a typed PaymentError with all fields they need for
    retry logic, alerting, and user-facing messaging.
    """
    if not user_id or not user_id.strip():
        return err("user_id is required", code="VALIDATION_ERROR")

    if amount < 0:
        return err("amount must be non-negative", code="INVALID_AMOUNT")

    amount_cents = int(amount * 100)

    try:
        # Simulate payment gateway call
        gateway_tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info(
            "Payment initiated",
            extra={
                "user_id": user_id,
                "amount_cents": amount_cents,
                "gateway_tx_id": gateway_tx_id,
            },
        )
        return ok(gateway_tx_id)

    except ConnectionError as exc:
        # ✅ GOOD: Wrap with domain error, preserve original via 'from'
        raise PaymentError(
            message=f"Payment gateway unreachable for user {user_id}",
            code="GATEWAY_UNAVAILABLE",
            user_id=user_id,
            amount_cents=amount_cents,
        ) from exc

    except TimeoutError as exc:
        return err(
            f"Payment gateway timed out after 30s for user {user_id}",
            code="GATEWAY_TIMEOUT",
            user_id=user_id,
            amount_cents=amount_cents,
            original=exc,
        )

    except ValueError as exc:
        # Validation errors from the gateway itself (e.g., invalid card)
        return err(
            f"Payment gateway rejected: {exc}",
            code="GATEWAY_REJECTED",
            user_id=user_id,
            amount_cents=amount_cents,
            original=exc,
        )


# ---- TypeScript equivalent of context chaining ----

"""
// TypeScript: Error cause chains (native since Node.js 16.9.0 / ES2022)

class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, unknown>,
    options?: { cause: Error }
  ) {
    super(message, options);  // ← preserves original stack via 'cause'
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause?.stack ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}

async function processPayment(userId: string, amount: number): Promise<string> {
  try {
    return await callPaymentGateway({ userId, amount });
  } catch (err) {
    throw new AppError(
      `Payment failed for user ${userId}`,
      "GATEWAY_ERROR",
      { userId, amount, traceId: crypto.randomUUID() },
      { cause: err as Error }  // ← preserves the original error chain
    );
  }
}
"""
```

### Pattern 3: Retry with Exponential Backoff + Jitter + Circuit Breaker Integration

A proper retry strategy combines three mechanisms working together: exponential backoff to avoid overwhelming a recovering dependency, jitter to prevent thundering herd when many clients retry simultaneously, and a circuit breaker to fail fast when the dependency is known-bad so retries don't pile up. Without all three, you get either (a) retry storms that cascade failures or (b) silent hangs waiting for timeouts on every request.

```python
"""Retry with exponential backoff, jitter, and circuit breaker — complete implementation."""
from __future__ import annotations

import asyncio
import enum
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Callable, Generic, TypeVar, Any, Awaitable
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ---- Circuit Breaker ----

class CircuitState(enum.Enum):
    CLOSED = "closed"       # Normal operation — requests pass through
    OPEN = "open"           # Failing — requests fail fast without calling dependency
    HALF_OPEN = "half_open" # Testing — allow one probe request through


@dataclass
class CircuitBreaker:
    """Circuit breaker that protects against cascading failures.

    State transitions:
      CLOSED  → OPEN   : when failure_rate >= threshold within sliding window
      OPEN    → HALF_OPEN: after recovery_timeout seconds elapse
      HALF_OPEN → CLOSED: if the probe request succeeds
      HALF_OPEN → OPEN : if the probe request fails
    """
    failure_threshold: int = 5            # Failures in window before tripping
    recovery_timeout: float = 30.0        # Seconds to wait before probing
    sliding_window_size: int = 20         # Maximum number of requests tracked
    success_threshold: int = 1            # Successes in half-open to close circuit

    _failure_count: int = field(default=0, init=False)
    _success_count: int = field(default=0, init=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _last_failure_time: float = field(default=0.0, init=False)
    _request_log: list[bool] = field(default_factory=list, init=False)

    @property
    def state(self) -> CircuitState:
        """Check if OPEN circuit should transition to HALF_OPEN."""
        if self._state == CircuitState.OPEN:
            elapsed = time.monotonic() - self._last_failure_time
            if elapsed >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
                logger.info("Circuit breaker transitioning to HALF_OPEN")
        return self._state

    def record_success(self) -> None:
        """Record a successful request."""
        self._request_log.append(True)
        if len(self._request_log) > self.sliding_window_size:
            self._request_log.pop(0)

        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                logger.info("Circuit breaker closed — dependency recovered")

        # Reset failure count on success (in CLOSED state)
        if self._state == CircuitState.CLOSED:
            self._failure_count = max(0, self._failure_count - 1)

    def record_failure(self) -> None:
        """Record a failed request."""
        self._request_log.append(False)
        if len(self._request_log) > self.sliding_window_size:
            self._request_log.pop(0)

        self._failure_count += 1
        self._last_failure_time = time.monotonic()

        current_rate = sum(self._request_log) / max(len(self._request_log), 1)
        failure_count = sum(1 for x in self._request_log[-self.sliding_window_size:] if not x)

        if self._state == CircuitState.HALF_OPEN:
            # Probe failed — go back to OPEN immediately
            self._state = CircuitState.OPEN
            logger.warning("Circuit breaker half-open probe failed — reopened")
        elif failure_count >= self.failure_threshold and self._state != CircuitState.OPEN:
            self._state = CircuitState.OPEN
            logger.warning(
                f"Circuit breaker opened: {failure_count}/{self.sliding_window_size} failures in window"
            )

    @property
    def is_available(self) -> bool:
        """Check if requests should be allowed through."""
        return self.state != CircuitState.OPEN


# ---- Retry with Exponential Backoff + Jitter ----

@dataclass
class RetryConfig:
    """Configuration for retry behavior.

    Formula: delay = (base_delay * 2^attempt) + random(0, jitter_ms)
    Max total time ensures bounded blocking during cascading failures.
    """
    max_attempts: int = 3
    base_delay: float = 1.0          # Seconds — delay before first retry
    max_delay: float = 60.0          # Absolute cap on any single retry delay
    jitter_ms: int = 500             # Random jitter in milliseconds
    total_timeout: float = 90.0      # Maximum total time across all attempts
    retryable_exceptions: tuple[type[Exception], ...] = (ConnectionError, TimeoutError)
    idempotent_only: bool = True     # Only retry if the operation is idempotent


def retry_with_backoff(config: RetryConfig):
    """Decorator that wraps a function with exponential backoff retry + jitter.

    Integrates with the caller's circuit breaker — if the breaker is open,
    retries skip immediately without attempting the call.

    Usage:
        @retry_with_backoff(RetryConfig(max_attempts=3, base_delay=1.0))
        def fetch_data(url: str) -> dict:
            return http_get(url)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Exception | None = None

            for attempt in range(config.max_attempts):
                # Check circuit breaker before each attempt
                if hasattr(wrapper, "_circuit_breaker"):
                    cb: CircuitBreaker = wrapper._circuit_breaker  # type: ignore[assignment]
                    if not cb.is_available:
                        raise ConnectionError(
                            f"Circuit breaker is OPEN — skipping {func.__name__} (attempt {attempt + 1}/{config.max_attempts})"
                        )

                try:
                    result = func(*args, **kwargs)

                    # Success — record it with circuit breaker if present
                    if hasattr(wrapper, "_circuit_breaker"):
                        wrapper._circuit_breaker.record_success()  # type: ignore[union-attr]

                    return result

                except config.retryable_exceptions as exc:
                    last_exception = exc
                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{config.max_attempts} failed: {exc}",
                        exc_info=True,
                    )

                    # Record failure with circuit breaker if present
                    if hasattr(wrapper, "_circuit_breaker"):
                        wrapper._circuit_breaker.record_failure()  # type: ignore[union-attr]

                    # If this was the last attempt, don't sleep
                    if attempt < config.max_attempts - 1:
                        # Exponential backoff with jitter
                        delay = min(
                            config.base_delay * (2 ** attempt) + random.uniform(0, config.jitter_ms / 1000),
                            config.max_delay,
                        )
                        logger.info(f"Retrying {func.__name__} in {delay:.2f}s (attempt {attempt + 2})")
                        time.sleep(delay)

            raise ConnectionError(
                f"{func.__name__} failed after {config.max_attempts} attempts: {last_exception}"
            ) from last_exception

        return wrapper
    return decorator


# ---- Complete Example: Payment Gateway Client ----

class PaymentGatewayClient:
    """Example of a production-ready integration client with all patterns combined."""

    def __init__(self, api_base_url: str, api_key: str) -> None:
        self._base_url = api_base_url.rstrip("/")
        self._api_key = api_key
        self._circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=30.0,
            sliding_window_size=20,
        )
        # Attach circuit breaker to the retry decorator via closure
        self._retry_config = RetryConfig(
            max_attempts=3,
            base_delay=1.0,
            max_delay=30.0,
            jitter_ms=500,
            total_timeout=90.0,
            idempotent_only=True,
        )

    def _apply_retry(self, func: Callable[..., T]) -> Callable[..., T]:
        """Bind the circuit breaker to the retry decorator."""
        decorated = retry_with_backoff(self._retry_config)(func)
        decorated._circuit_breaker = self._circuit_breaker  # type: ignore[attr-defined]
        return decorated

    @_apply_retry
    def create_payment(self, user_id: str, amount_cents: int, currency: str = "USD") -> str:
        """Create a payment via the gateway.

        This function is wrapped with retry + backoff + jitter + circuit breaker.
        If the gateway is failing, the circuit breaker trips and retries stop.
        """
        if amount_cents <= 0:
            raise ValueError("amount_cents must be positive")

        # Simulate HTTP call to payment gateway
        url = f"{self._base_url}/v1/payments"
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}
        body = {"user_id": user_id, "amount_cents": amount_cents, "currency": currency}

        # In production: response = httpx.post(url, json=body, headers=headers, timeout=10.0)
        if user_id.startswith("fail_"):
            raise ConnectionError(f"Payment gateway rejected request for {user_id}")

        return f"pay_{uuid.uuid4().hex[:16]}"  # Simulated payment ID


# ---- Async variant with asyncio ----

async def retry_with_backoff_async(config: RetryConfig):
    """Async version of retry decorator for use with async HTTP clients."""
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Exception | None = None

            for attempt in range(config.max_attempts):
                try:
                    result = await func(*args, **kwargs)

                    if hasattr(wrapper, "_circuit_breaker"):
                        wrapper._circuit_breaker.record_success()  # type: ignore[union-attr]

                    return result

                except config.retryable_exceptions as exc:
                    last_exception = exc
                    logger.warning(
                        f"{func.__name__} async attempt {attempt + 1}/{config.max_attempts} failed: {exc}",
                        exc_info=True,
                    )

                    if hasattr(wrapper, "_circuit_breaker"):
                        wrapper._circuit_breaker.record_failure()  # type: ignore[union-attr]

                    if attempt < config.max_attempts - 1:
                        delay = min(
                            config.base_delay * (2 ** attempt) + random.uniform(0, config.jitter_ms / 1000),
                            config.max_delay,
                        )
                        await asyncio.sleep(delay)

            raise ConnectionError(
                f"{func.__name__} failed after {config.max_attempts} async attempts"
            ) from last_exception

        return wrapper
    return decorator
```

### Pattern 4: Panic / Unhandled Exception Recovery

Even with thorough error handling, unhandled exceptions will occur — dependency bugs, deserialization crashes, or code paths not reached in testing. A top-level panic handler catches these, preserves full context, and prevents the process from silently exiting or leaking stack traces to users.

```python
"""Top-level panic recovery for production services."""
from __future__ import annotations

import asyncio
import logging
import signal
import sys
import traceback
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PanicContext:
    """Structured context captured during an unhandled exception."""
    trace_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    exc_type: str = ""
    exc_message: str = ""
    traceback_text: str = ""
    thread_name: str = ""
    process_id: int = field(default_factory=lambda: __import__("os").getpid())
    timestamp_iso: str = field(
        default_factory=lambda: __import__("datetime").datetime.utcnow().isoformat() + "Z"
    )
    extra_context: dict[str, Any] = field(default_factory=dict)

    def to_log_dict(self) -> dict[str, Any]:
        return {
            "level": "FATAL",
            "trace_id": self.trace_id,
            "exception_type": self.exc_type,
            "message": self.exc_message,
            "process_id": self.process_id,
            "thread": self.thread_name,
            "timestamp": self.timestamp_iso,
            "context": self.extra_context,
            # NOTE: traceback_text is attached separately to avoid log truncation
        }


def install_panic_handler(
    alert_callback: Callable[[PanicContext], None] | None = None,
    extra_context: dict[str, Any] | None = None,
) -> None:
    """Install a top-level unhandled exception handler for the entire process.

    This replaces sys.excepthook and asyncio's exception handler to catch
    every unhandled exception in both sync and async code paths.

    Args:
        alert_callback: Optional function called with PanicContext when an
            unhandled exception occurs. Use this to trigger PagerDuty,
            Slack alerts, or distributed tracing error annotations.
        extra_context: Static context added to every panic report (e.g.,
            service name, version, deployment region).
    """
    static_context = extra_context or {}

    def _sync_handler(exc_type: type[BaseException], exc: BaseException, tb: Any) -> None:
        """Handle unhandled exceptions in synchronous code."""
        ctx = PanicContext(
            exc_type=exc_type.__name__,
            exc_message=str(exc),
            traceback_text="".join(traceback.format_exception(exc_type, exc, tb)),
            thread_name=__import__("threading").current_thread().name,
            extra_context={**static_context},
        )

        logger.critical("UNHANDLED EXCEPTION", extra=ctx.to_log_dict())
        logger.critical(ctx.traceback_text)

        if alert_callback:
            alert_callback(ctx)

    def _async_handler(loop: asyncio.AbstractEventLoop, context: dict[str, Any]) -> None:
        """Handle unhandled exceptions in async code (loop.call_exception_handler replacement)."""
        exc = context.get("exception")
        if exc is not None:
            tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            ctx = PanicContext(
                exc_type=type(exc).__name__,
                exc_message=str(exc),
                traceback_text=tb_str,
                thread_name=asyncio.current_task().__class__.__name__ if asyncio.current_task() else "unknown",
                extra_context={**static_context, **context.get("extra_context", {})},
            )

            logger.critical("UNHANDLED ASYNC EXCEPTION", extra=ctx.to_log_dict())
            logger.critical(tb_str)

            if alert_callback:
                alert_callback(ctx)
        else:
            # Cancellation is expected — don't treat it as a panic
            task_name = context.get("message", "")
            logger.debug(f"Async task completed with message: {task_name}")

    # Install handlers
    sys.excepthook = _sync_handler

    try:
        loop = asyncio.get_event_loop()
        if not loop.is_running():
            loop.set_exception_handler(_async_handler)
    except RuntimeError:
        pass  # No event loop yet — will be set when one starts


# ---- Usage: Install at service entry point ----

def create_alert_callback() -> Callable[[PanicContext], None]:
    """Create an alert callback that triggers PagerDuty/Slack on panics."""
    def _alert(ctx: PanicContext) -> None:
        # In production, this would call PagerDuty API, send to Slack webhook,
        # or emit to a distributed tracing system (OpenTelemetry, Datadog APM)
        print(
            f"[ALERT] PANIC detected — trace_id={ctx.trace_id} "
            f"type={ctx.exc_type} process={ctx.process_id}"
        )

    return _alert


# Example: install at the top of main.py
# install_panic_handler(alert_callback=create_alert_callback(), extra_context={
#     "service": "payment-service",
#     "version": "2.4.1",
#     "region": "us-east-1",
# })
```

### Pattern 5: Structured Error Response for HTTP APIs

Every HTTP endpoint should return a consistent error shape so that clients and monitoring systems can parse failures uniformly. Never return raw exception messages to the client — they leak implementation details.

```python
"""Structured HTTP error responses with safe user-facing messages."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class ErrorSeverity(Enum):
    CLIENT = "client_error"       # 4xx — caller's problem
    SERVER = "server_error"       # 5xx — our problem
    UPSTREAM = "upstream_error"   # 5xx but caused by dependency
    UNEXPECTED = "unexpected"     # 5xx from unhandled exception


@dataclass(frozen=True)
class ErrorResponse:
    """Standardized error response returned to API clients.

    Fields exposed to the client:
        - error_code: Machine-readable error identifier for client logic
        - message: Human-friendly description (never includes stack traces)
        - request_id: Trace ID for support ticket correlation

    Fields internal-only (logged but NOT sent to client):
        - severity: Used for alerting threshold decisions
        - details: Technical context for internal debugging
        - retry_after: Seconds before the client should retry (if applicable)
    """
    error_code: str
    message: str
    request_id: str = field(default_factory=lambda: __import__("uuid").uuid4().hex[:12])
    severity: ErrorSeverity = ErrorSeverity.SERVER
    details: dict[str, Any] = field(default_factory=dict)
    retry_after_seconds: int | None = None

    def to_client_json(self) -> dict[str, Any]:
        """Serialize to JSON for the HTTP response body — client-safe only."""
        body = {
            "error_code": self.error_code,
            "message": self.message,
            "request_id": self.request_id,
        }
        if self.retry_after_seconds:
            body["retry_after"] = self.retry_after_seconds
        return body

    def http_status(self) -> int:
        """Map error severity to HTTP status code."""
        match self.severity:
            case ErrorSeverity.CLIENT:
                return 400 if self.error_code.startswith("VALIDATION") else 422
            case ErrorSeverity.SERVER:
                return 500
            case ErrorSeverity.UPSTREAM:
                return 503
            case ErrorSeverity.UNEXPECTED:
                return 500


# ---- BAD vs GOOD: HTTP error handling in a Flask/FastAPI handler ----

"""
# ❌ BAD: Raw exception leaked to client
@app.route("/api/users/<user_id>")
def get_user(user_id):
    try:
        user = db.query(User).filter_by(id=user_id).first()
        return jsonify(user.to_dict())
    except Exception as e:
        # Stack trace in production log, but also potentially in response body
        return jsonify({"error": str(e)}), 500

# Client sees: {"error": "OperationalError: (psycopg2.OperationalError) connection refused"}
# This leaks infrastructure details to the client — security risk.
"""


"""
# ✅ GOOD: Structured error response with safe message

@app.route("/api/users/<user_id>")
def get_user(user_id):
    try:
        if not user_id or not user_id.strip():
            return _error_response(ErrorResponse(
                error_code="VALIDATION_ERROR",
                message="user_id is required",
                severity=ErrorSeverity.CLIENT,
            ))

        user_result = fetch_user(user_id)  # Returns Result[Ok[dict], Err[Error]]
        if user_result.is_err:
            err = user_result.value
            return _error_response(ErrorResponse(
                error_code=err.code,
                message=_user_friendly_message(err),  # Safe, non-technical message
                severity=ErrorSeverity.SERVER if err.original else ErrorSeverity.CLIENT,
                details={"context": err.context},  # Logged internally only
            ))

        return jsonify(user_result.value)

    except Exception as exc:
        # Unhandled exception — panic recovery handles logging/alerting
        return _error_response(ErrorResponse(
            error_code="UNEXPECTED_ERROR",
            message="An unexpected error occurred. Please try again later.",
            severity=ErrorSeverity.UNEXPECTED,
            details={"internal": str(exc)},  # Logged internally, not sent to client
        ))


def _user_friendly_message(error: Error) -> str:
    """Map technical error codes to user-friendly messages."""
    mapping = {
        "DB_UNAVAILABLE": "The service is temporarily unavailable. Please try again.",
        "GATEWAY_TIMEOUT": "The request took too long. Please try again.",
        "VALIDATION_ERROR": "Please check your input and try again.",
        "AUTH_REQUIRED": "You must be logged in to access this resource.",
    }
    return mapping.get(error.code, "Something went wrong. Please contact support.")


def _error_response(resp: ErrorResponse):
    """Build an HTTP response from a structured error."""
    return (
        json.dumps(resp.to_client_json()),
        resp.http_status(),
        {"Content-Type": "application/json"},
    )
"""

---

## Constraints

### MUST DO
- Always wrap low-level exceptions with domain context using `raise ... from exc` (Python) or `cause: err` (TypeScript) — the original exception must remain inspectable via traceback chains
- Use a typed Result/Either type for all functions that can fail at the API boundary — no exceptions should cross function boundaries without being caught and converted to `Result[E, T]`
- Implement retry with exponential backoff (`base_delay * 2^attempt + jitter`) on every external call, with both a max-attempt cap AND a total-timeout cap
- Integrate a circuit breaker around all external dependencies — tripping to OPEN state must happen automatically when failure rate exceeds the threshold within the sliding window
- Install a top-level panic handler (`sys.excepthook` + async loop handler) that captures full stack traces, emits structured logs with trace IDs, and triggers alerting
- Return consistent, user-safe error responses from HTTP APIs — never expose stack traces, internal paths, or dependency details to clients
- Use `from __future__ import annotations` for forward-ref-friendly type hints on Result types to avoid circular import issues

### MUST NOT DO
- Use bare `except:` or `catch (e) {}` — always narrow the exception type to something specific; a bare catch will swallow KeyboardInterrupt, SystemExit, and future error types silently
- Swallow exceptions without logging or re-raising — every caught exception must either be logged with full context, converted to a Result/Err, or re-raised with additional context via `raise ... from exc`
- Retry non-idempotent operations without explicit developer acknowledgment — never auto-retry writes, payments, or state-mutating operations without an `idempotent_only=True` guard that defaults to False
- Configure circuit breakers with a `recovery_timeout` of zero seconds — this creates a hammering loop where the system immediately retries a failing dependency after every microsecond
- Return raw exception strings in HTTP API responses — use structured error codes and user-friendly messages; technical details belong only in internal logs

---

## Output Template

When implementing or reviewing error handling, produce:

1. **Error Classification** — For each failure point: domain error type, HTTP status mapping, retry eligibility (idempotent vs state-mutating)
2. **Result Type Definition** — The `Result[E, T]` type with Ok/Err variants and factory functions, imported consistently across the module
3. **Error Wrapping Chain** — Every boundary-level catch showing the full `raise ... from exc` or `cause:` chain with structured context fields
4. **Retry + Circuit Breaker Config** — The complete `RetryConfig` parameters and `CircuitBreaker` thresholds applied to each external call, with justification for the chosen values
5. **Panic Handler Installation** — Confirmation that `sys.excepthook` and async loop handlers are registered at the service entry point

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ports-patterns` | Error handling boundaries align with port interfaces — each driven port's adapter converts infrastructure exceptions into domain Result types |
| `monolith-refactoring` | When refactoring a monolith, error handling is often the first layer to modernize before decomposing services — consistent error shapes make service boundaries clear |
| `production-readiness` | Panic recovery, circuit breakers, and structured logging are core production-readiness patterns that this skill implements alongside monitoring and alerting |
| `input-validation` | Input validation errors are a specific category of failures that should be handled with Result types at the entry point before reaching business logic |
