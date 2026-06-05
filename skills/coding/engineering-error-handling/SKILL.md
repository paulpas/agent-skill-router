---




name: engineering-error-handling
description: Designs robust error handling strategies including typed exception hierarchies, graceful degradation, retry with exponential backoff, circuit breakers, structured logging, and panic prevention across software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: error handling, exception hierarchy, retry strategy, exponential backoff, circuit breaker, graceful degradation, structured logging, how do i handle errors
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
    - examples
    - do-dont
  related-skills: engineering-principles, testing-unit-integration-e2e, software-documentation, framework-utilization




---





# Error Handling Engineering

Designs robust error handling strategies across software systems using typed exception hierarchies, graceful degradation patterns, retry with exponential backoff, circuit breakers, structured logging, and panic prevention. This skill makes the model write code where errors are treated as first-class citizens — caught early, categorized precisely, logged with full context, and handled in ways that preserve system stability rather than causing cascading failures.

## TL;DR Checklist

- [ ] Every function declares what exceptions it can throw with specific types (no bare `Exception` or catch-all)
- [ ] Wrap external errors with context using error wrapping (`%w` in Go, `from` in Python, cause chains in Java)
- [ ] Implement retry with exponential backoff and jitter for transient failures (network timeouts, rate limits)
- [ ] Use circuit breakers when a downstream service has repeated failures — stop calling it before resources exhaust
- [ ] Log errors at ERROR level with structured fields: timestamp, request_id, error_code, user context (never stack traces in production API responses)
- [ ] Never use `panic`/`die`/`throw` for control flow — only for unrecoverable fatal conditions

---

## When to Use

Use this skill when:

- Designing the error handling architecture for a new service or library
- Refactoring an existing system that uses bare exceptions, catch-all handlers, or swallows errors silently
- Adding retry logic and circuit breaker patterns to calls to external APIs or databases
- Setting up structured logging with consistent error context across microservices
- Building resilience into critical paths (payments, user authentication, data replication)

---

## When NOT to Use

Avoid this skill for:
- Simple scripts with single entry points where a single exit code suffices
- Read-only cache lookups where failure is expected and transparent fallback exists — handle inline without complex hierarchy
- Event processing where dropped events are acceptable (use dead-letter queues instead)

---

## Core Workflow

1. **Define the Exception Hierarchy** — Create a domain-specific exception tree rooted in your language's base error type. Each branch represents a failure category: validation errors, infrastructure failures, business rule violations, unknown errors. Every layer adds contextual information without duplicating the root cause.
   **Checkpoint:** Catching any child exception should also catch its parent (Liskov substitution for error types).

2. **Implement Error Wrapping** — When catching and re-raising an error, preserve the original stack trace and context. Use your language's error wrapping mechanism (`fmt.Errorf("...: %w", err)` in Go, `raise ... from err` in Python) rather than losing the chain.
   **Checkpoint:** The full error chain is accessible via `error.Cause()` or equivalent, preserving the complete path from root cause to current handler.

3. **Add Retry Logic with Backoff** — For transient failures (network timeouts, 429 rate limits, database deadlock), implement exponential backoff with jitter. Set a maximum retry count and maximum wait time to prevent indefinite loops. Distinguish between retriable and non-retriable errors using the exception type.
   **Checkpoint:** After max retries are exhausted, wrap in a domain error (e.g., `ExternalServiceUnavailable`) that includes the original failure for diagnostic purposes.

4. **Deploy Circuit Breakers** — For calls to unstable downstream services, implement the circuit breaker pattern with three states: closed (normal), open (failing fast), half-open (testing recovery). Track failure rate over a sliding window and transition between states automatically.
   **Checkpoint:** When the circuit is open, requests fail immediately without calling the downstream service — use cached or default data instead.

5. **Structure Error Logging** — Every logged error must include: structured fields (JSON), request ID for correlation, user context (not credentials), error code, and the wrapped exception chain. Never log stack traces in production API responses — include only the request ID for support lookup.
   **Checkpoint:** Given just a request ID, a support engineer can reconstruct the complete error chain from logs.

6. **Prevent Panics at Runtime** — Replace all panic/die/unhandled exceptions with controlled failures. If a condition truly cannot be recovered from (corrupted in-memory state), shut down gracefully: flush queues, close connections, log diagnostics, exit cleanly.
   **Checkpoint:** No code path can cause an unhandled exception that crashes the process without triggering the shutdown handler first.

---

## Implementation Patterns

### Pattern 1: Typed Exception Hierarchy with Error Wrapping

```python
# Python — domain-specific exception hierarchy using error classes as context carriers
# This pattern ensures every error carries machine-readable codes for programmatic handling

import logging
from typing import Optional
from datetime import datetime


# Base exception — all application errors inherit from this
class AppError(Exception):
    """Base exception for all application-level errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "UNKNOWN_ERROR",
        retryable: bool = False,
        context: Optional[dict] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.retryable = retryable
        self.context = context or {}
        self.timestamp = datetime.utcnow().isoformat() + "Z"


# Validation errors — client should fix input and retry
class ValidationError(AppError):
    """User input failed validation. Do not log as ERROR level."""
    
    def __init__(self, field: str, message: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            message=f"Validation failed on '{field}': {message}",
            error_code=error_code,
            context={"field": field},
        )


class AuthenticationError(AppError):
    """User is not authenticated. Credentials are invalid or expired."""
    
    def __init__(self, reason: str = "Invalid credentials"):
        super().__init__(
            message=f"Authentication failed: {reason}",
            error_code="AUTHENTICATION_FAILED",
            retryable=False,
        )


class AuthorizationError(AppError):
    """User is authenticated but lacks permission for this action."""
    
    def __init__(self, resource: str, action: str):
        super().__init__(
            message=f"Authorization denied: no '{action}' permission on '{resource}'",
            error_code="AUTHORIZATION_DENIED",
            retryable=False,
            context={"resource": resource, "action": action},
        )


# Business logic errors — the request is valid but cannot be fulfilled
class InsufficientFundsError(AppError):
    """Payment failed due to insufficient account balance."""
    
    def __init__(self, available: float, required: float):
        super().__init__(
            message=f"Insufficient funds: available={available}, required={required}",
            error_code="INSUFFICIENT_FUNDS",
            retryable=False,
            context={"available": available, "required": required},
        )


# Infrastructure errors — external system failure, may be transient
class DatabaseError(AppError):
    """Database operation failed."""
    
    def __init__(self, table: str, operation: str, original_error: Optional[Exception] = None):
        message = f"Database {operation} on '{table}' failed"
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            retryable=True,  # Database errors are often transient
            context={"table": table, "operation": operation},
        )
        if original_error:
            self.original_error = original_error


class ExternalServiceError(AppError):
    """Call to external API/service failed."""
    
    def __init__(self, service: str, endpoint: str, status_code: int, original_error: Optional[Exception] = None):
        message = f"External service '{service}' at '{endpoint}' returned {status_code}"
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            retryable=status_code >= 500 or status_code == 429,  # Server errors and rate limits are retriable
            context={"service": service, "endpoint": endpoint, "status_code": status_code},
        )
        if original_error:
            self.original_error = original_error


# Unknown/fatal errors — something unexpected happened
class UnexpectedError(AppError):
    """An unclassified error occurred. This should be investigated."""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=f"Unexpected error: {message}",
            error_code="UNEXPECTED_ERROR",
            retryable=False,
        )
        if original_error:
            self.original_error = original_error


# ✅ GOOD — wrapping preserves the full error chain
def process_payment(amount: float) -> None:
    try:
        charge_external_payment_gateway(amount)
    except requests.Timeout as e:
        raise ExternalServiceError(
            service="payment-gateway",
            endpoint="/v1/charge",
            status_code=0,  # 0 for timeout (no HTTP response received)
            original_error=e,
        ) from e  # <-- preserves the chain via `from`
    except requests.HTTPError as e:
        raise ExternalServiceError(
            service="payment-gateway",
            endpoint="/v1/charge",
            status_code=e.response.status_code,
            original_error=e,
        ) from e


# ❌ BAD — loses the original error and context
def bad_process_payment(amount: float) -> None:
    try:
        charge_external_payment_gateway(amount)
    except Exception as e:
        # Swallows everything into a generic message — no code, no retry info, no chain
        raise RuntimeError(f"Payment failed: {str(e)}")  # No `from`, context lost
```

### Pattern 2: Retry with Exponential Backoff and Jitter

```python
import time
import random
import logging
from functools import wraps
from typing import Callable, TypeVar, Type, Optional

T = TypeVar("T")

logger = logging.getLogger(__name__)


def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    retriable_exceptions: tuple[Type[AppError], ...] = (ExternalServiceError, DatabaseError),
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator that retries a function with exponential backoff on retriable errors.
    
    Args:
        max_attempts: Maximum number of times to try the operation (default 3).
        base_delay: Starting delay in seconds before first retry (default 1.0).
        max_delay: Maximum delay cap in seconds (default 60.0).
        jitter: If True, add random jitter to prevent thundering herd.
        retriable_exceptions: Tuple of exception types that trigger a retry.
    
    Usage:
        @retry(max_attempts=5, base_delay=0.5)
        def fetch_data(url: str) -> dict:
            return api.get(url).json()
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception: Optional[Exception] = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                
                except retriable_exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts:
                        # Final attempt failed — wrap with context and re-raise
                        raise AppError(
                            message=f"Operation '{func.__name__}' failed after {max_attempts} attempts",
                            error_code="MAX_RETRIES_EXCEEDED",
                            retryable=False,  # No more retries left
                            context={
                                "original_error": str(e),
                                "error_code": e.error_code if isinstance(e, AppError) else "UNKNOWN",
                                "attempts_made": attempt,
                            },
                        ) from e
                    
                    # Calculate delay with exponential backoff + jitter
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    if jitter:
                        delay = delay * (0.5 + random.random() * 0.5)  # 50-100% of calculated delay
                    
                    logger.warning(
                        "Retrying %s after attempt %d/%d (%.1fs delay): %s",
                        func.__name__,
                        attempt,
                        max_attempts,
                        delay,
                        str(e),
                    )
                    
                    time.sleep(delay)
                
                except AppError as e:
                    # Non-retriable application error — fail fast without retry
                    raise
            
            # Should never reach here, but satisfy type checker
            raise last_exception if last_exception else RuntimeError("Unexpected")  # type: ignore
        
        return wrapper
    return decorator


# ✅ GOOD — automatic retry on transient failures with structured logging
@retry(max_attempts=3, base_delay=0.5, retriable_exceptions=(ExternalServiceError,))
def sync_inventory_to_warehouse() -> dict:
    """Sync local inventory counts to the warehouse API with automatic retry."""
    response = external_api.put("/warehouse/inventory", data=get_current_inventory())
    return response.json()


# ✅ GOOD — fine-grained control per operation type
@retry(max_attempts=5, base_delay=1.0, jitter=True)  # More retries for flaky operations
def fetch_user_profile(user_id: str) -> dict:
    """Fetch user profile with generous retry since it's read-only."""
    return database.query("SELECT * FROM users WHERE id = %s", [user_id])


@retry(max_attempts=2, base_delay=0.1)  # Fewer retries for write operations
def create_order(order_data: dict) -> str:
    """Create order — limit retries to avoid duplicate processing."""
    return external_api.post("/orders", data=order_data).json()["order_id"]
```

### Pattern 3: Circuit Breaker Pattern

```python
import time
from enum import Enum
from threading import Lock
from typing import Callable, TypeVar, Optional
from contextlib import contextmanager

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation — requests flow through
    OPEN = "open"           # Failing fast — no requests sent to downstream
    HALF_OPEN = "half-open" # Testing recovery — one probe request allowed


class CircuitBreakerError(AppError):
    """Circuit breaker is open — downstream service unavailable."""
    
    def __init__(self, service: str, state: CircuitState):
        super().__init__(
            message=f"Circuit breaker for '{service}' is {state.value}",
            error_code="CIRCUIT_BREAKER_OPEN",
            retryable=True,
            context={"service": service, "state": state.value},
        )


class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures.
    
    Transitions:
      CLOSED -> OPEN:     When failure_rate > threshold in the observation window
      OPEN -> HALF_OPEN:  After recovery_timeout expires (one probe request allowed)
      HALF_OPEN -> CLOSED: If probe request succeeds
      HALF_OPEN -> OPEN:  If probe request fails
    """
    
    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        observation_window: float = 60.0,
    ):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.observation_window = observation_window
        
        self._state = CircuitState.CLOSED
        self._last_failure_time: Optional[float] = None
        self._opened_at: Optional[float] = None
        self._half_open_allowed = False
        self._lock = Lock()
        
        # Sliding window of failures (timestamps)
        self._failures: list[float] = []
    
    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN and self._opened_at:
                if time.time() - self._opened_at >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_allowed = True
            return self._state
    
    def record_success(self) -> None:
        with self._lock:
            self._failures = [t for t in self._failures if time.time() - t < self.observation_window]
            if len(self._failures) == 0 and self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                self._half_open_allowed = False
    
    def record_failure(self) -> None:
        with self._lock:
            now = time.time()
            self._failures.append(now)
            
            # Clean old failures outside observation window
            self._failures = [t for t in self._failures if now - t < self.observation_window]
            
            if len(self._failures) >= self.failure_threshold:
                if self._state == CircuitState.CLOSED or self._state == CircuitState.HALF_OPEN:
                    self._state = CircuitState.OPEN
                    self._opened_at = now
                    self._half_open_allowed = False
    
    def execute(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute a function through the circuit breaker."""
        current_state = self.state
        
        if current_state == CircuitState.OPEN:
            raise CircuitBreakerError(self.service_name, current_state)
        
        if current_state == CircuitState.HALF_OPEN and not self._half_open_allowed:
            raise CircuitBreakerError(self.service_name, current_state)
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise


# ✅ GOOD — circuit breaker wraps the unstable downstream call
def get_weather_data(location: str) -> dict:
    """Fetch weather with circuit breaker to prevent cascading failures."""
    try:
        return weather_circuit_breaker.execute(
            lambda: external_api.get(f"/weather/{location}").json()
        )
    except CircuitBreakerError as e:
        # Return cached data when circuit is open
        logger.warning("Using cached weather data (circuit open): %s", e)
        return get_cached_weather(location, ttl_minutes=10)


# Initialize the circuit breaker
weather_circuit_breaker = CircuitBreaker(
    service_name="weather-service",
    failure_threshold=5,           # Open after 5 failures in window
    recovery_timeout=30.0,         # Wait 30s before testing recovery
    observation_window=60.0,       # Look back 60 seconds for failure rate
)
```

---

## Constraints

### MUST DO
- Define a domain-specific exception hierarchy — never use bare `Exception` or generic error messages as catch-all handlers
- Wrap all external errors preserving the original exception chain (`from e` in Python, `%w` in Go, cause in Java)
- Distinguish retriable vs. non-retriable errors explicitly using the `retryable` flag or exception type
- Implement exponential backoff with jitter on every retry — never use fixed-delay retries (causes thundering herd)
- Use circuit breakers for all calls to external services that have repeated failures
- Log structured error context: error code, request ID, user context (redacted), and the wrapped exception chain

### MUST NOT DO
- Use `panic`, `die`, or unhandled exceptions for recoverable conditions — only use for truly unrecoverable fatal errors
- Swallow exceptions with empty `except`/`catch` blocks — at minimum log the error with full context
- Return raw stack traces to API consumers in production — include only a request ID for support correlation
- Retry infinite times — always set max_attempts and maximum total wait time
- Bypass the error hierarchy with ad-hoc string-based error checking (`if str(e) == "timeout"`)

---

## Output Template

When implementing error handling with this skill active, the output must contain:

1. **Exception Hierarchy** — Typed exception classes organized by failure category (validation, business logic, infrastructure, unknown)
2. **Error Wrapping Examples** — Show wrapping at system boundaries preserving the full cause chain
3. **Retry Configuration** — Decorator or helper with configurable max_attempts, base_delay, max_delay, and jitter
4. **Circuit Breaker Implementation** — State machine (closed/open/half-open) with automatic transitions
5. **Structured Logging Example** — JSON-formatted error log entry showing all required fields

---

## Related Skills

| Skill | Purpose |
|---|---|
| `engineering-principles` | SOLID principles for designing clean exception hierarchies and error interfaces |
| `testing-unit-integration-e2e` | Testing strategies to verify error paths and failure modes are correctly handled |
| `software-documentation` | Documenting error codes, expected failure conditions, and recovery procedures for API consumers |
| `framework-utilization` | Properly applying the framework's built-in error handling mechanisms |

---

## Live References

> Authoritative documentation links for error handling engineering. The model follows markdown links at load time to resolve external references and inline content.

- [Google Error Handling Best Practices](https://cloud.google.com/architecture/error-handling-best-practices)
- [Python PEP 3134 — Exception Chaining](https://peps.python.org/pep-3134/)
- [Go Error Wrapping with fmt.Errorf %w](https://go.dev/blog/go1.13-errors)
- [Resilience Patterns (Microsoft Architecture Guide)](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
