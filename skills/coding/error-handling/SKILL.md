---
name: error-handling
description: Implements modern Python error handling patterns including custom exception hierarchies, context propagation, result types, and graceful degradation for resilient production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: error handling, exception hierarchy, custom exceptions, context propagation, result type, error recovery, graceful degradation, how do i handle errors in Python
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: software-engineering-principles, software-maintainability, api-design-principles
---

# Error Handling in Production Python

Implements modern Python error handling patterns that make systems resilient and failures observable. When loaded, the model writes exception hierarchies with structured context, propagates errors through chains preserving root causes, implements graceful degradation fallbacks for external dependencies, and structures API error responses using RFC 7807 Problem Details conventions so that every failure is categorized, logged, and recoverable.

## TL;DR Checklist

- [ ] Custom exception hierarchy defined with `BaseError` → domain-specific errors → leaf errors
- [ ] Every public function documents raised exceptions in its docstring under a `Raises:` section
- [ ] `raise ... from original_error` used to preserve traceback chains at every wrapping boundary
- [ ] Graceful degradation fallbacks implemented for all external dependency calls (APIs, databases, caches)
- [ ] RFC 7807 ProblemDetails structure used for all API error responses with type, title, status, detail, instance
- [ ] Retry with exponential backoff and jitter configured for transient failures (network timeouts, rate limits)
- [ ] No bare `except:`, no silent error swallowing, no stack traces in client-facing responses

---

## When to Use

Use this skill when:

- Implementing new services or APIs that need robust, documented error contracts visible to consumers
- Refactoring existing code with inconsistent error handling (mixed use of bare except, print statements, silent returns)
- Designing microservice communication where failure modes must be explicit and traceable across service boundaries
- Building libraries consumed by other developers who depend on clear exception hierarchies for programmatic error handling
- Adding graceful degradation to critical paths that must remain partially functional when downstream systems fail

---

## When NOT to Use

Avoid this skill for:

- Quick scripts or one-off automation where the cost of a structured hierarchy outweighs the benefit
- Performance-critical inner loops (e.g., market data tick processing) where exception handling overhead matters more than safety — use result types or pre-validation instead
- Data migration tools where a loud, immediate crash is preferable to silent partial completion

---

## Core Workflow

1. **Define Exception Hierarchy** — Create a package-level base exception class, then domain-specific branches for each failure category (validation, infrastructure, business logic, authentication). Each exception carries structured attributes: `error_code` (machine-readable string), `retryable` (boolean flag), and optionally `context` (a dict of extra details). Every public-facing function documents which exceptions it raises in its docstring's `Raises:` section. **Checkpoint:** Run static analysis to verify no bare `except:` clauses exist in the module, and every raised exception is an instance of a defined hierarchy class.

2. **Wrap and Propagate Context** — When catching an error from a lower layer and re-raising it at a higher level, always use `raise HigherError("message") from original_error` to preserve the full traceback chain. Never silently swallow exceptions or use bare `except:` clauses that catch everything including `KeyboardInterrupt` and `SystemExit`. Each wrapping layer adds domain-specific context without losing the root cause. **Checkpoint:** Trigger a failing call through the full stack — the resulting exception chain, when printed, should trace back to the original failure point (e.g., `requests.Timeout` → `ExternalServiceError` → `PaymentProcessingError`) with no gaps.

3. **Implement Fallback Strategies** — For operations that can fail in production (API calls to third parties, database queries, cache lookups), implement graceful degradation with fallback values or alternative execution paths. Use sentinel values (`Sentinel.MISSING`, `None` with explicit contract) only when zero/null/empty are semantically distinct from a valid result. The fallback behavior must be explicitly documented in the function's docstring and covered by at least one test case. **Checkpoint:** Simulate the downstream dependency being unavailable — the calling code should still return a meaningful response (cached data, default value, or clear degradation notice) rather than propagating an unhandled exception to the user.

4. **Structure Error Responses** — All API error responses follow RFC 7807 Problem Details format: `type` (URI identifying the error class), `title` (short human-readable summary), `status` (HTTP status code), `detail` (human explanation), and `instance` (URI identifying the specific occurrence, often a request ID). Internal technical errors include trace IDs for correlation but never expose stack traces, file paths, or internal implementation details. Client-facing errors are generic enough to avoid leaking system internals but specific enough to guide the user toward resolution. **Checkpoint:** Run an end-to-end test triggering every error type — verify that no traceback, internal class name, file path, or database SQL snippet appears in the response body.

5. **Implement Retry with Exponential Backoff** — Transient failures (network timeouts, HTTP 429 rate limits, database deadlocks) should be retried using exponential backoff with jitter to prevent thundering herd effects. Configure a maximum retry count and distinguish between retryable errors (caught explicitly by type or by checking a `retryable` attribute) and non-retryable errors (validation failures, authentication rejections). After exhausting max retries, the error propagates wrapped in a "retry limit exceeded" marker that preserves the original exception. **Checkpoint:** Set up a test where the downstream service returns 503 for all requests — verify the caller retries the configured number of times with increasing delays, then surfaces a clear "service unavailable after N attempts" error rather than looping indefinitely or masking the failure.

---

## Implementation Patterns

### Pattern 1: Custom Exception Hierarchy

A well-structured exception hierarchy makes error handling intentional and type-safe. Each level adds context without duplicating information. The base class carries common attributes (`error_code`, `retryable`), domain errors add specific metadata, and leaf errors are the most specific types for precise handling.

```python
# BAD — Flat exception usage with no structure
def transfer_funds(source: str, destination: str, amount: float) -> None:
    """Transfer funds between accounts."""
    try:
        if amount <= 0:
            raise ValueError("Amount must be positive")  # Generic, no context
        source_acc = get_account(source)  # May raise any number of exceptions
        dest_acc = get_account(destination)
        source_acc.balance -= amount
        dest_acc.balance += amount
        save_accounts()
    except Exception as e:
        print(f"Transfer failed: {e}")  # Swallows everything, no re-raise, no logging structure


# ✅ GOOD — Structured hierarchy with structured attributes
class AppError(Exception):
    """Base exception for all application errors.

    Every app error carries a machine-readable code and a flag indicating
    whether the operation can be safely retried.
    """

    def __init__(self, message: str, *, error_code: str = "INTERNAL_ERROR", retryable: bool = False) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.retryable = retryable


class DomainError(AppError):
    """Base for errors originating from a specific domain module."""

    def __init__(self, message: str, *, domain: str, **kwargs: object) -> None:
        super().__init__(message, **kwargs)
        self.domain = domain


# Validation layer — client should fix input and retry
class ValidationError(DomainError):
    """Input failed validation. Non-retryable; user must correct data."""

    def __init__(self, field: str, message: str) -> None:
        super().__init__(
            f"Validation error on '{field}': {message}",
            domain="validation",
            error_code="VALIDATION_ERROR",
            retryable=False,
        )
        self.field = field


# Authentication / authorization layer
class AuthenticationError(DomainError):
    """Credentials are invalid or expired."""

    def __init__(self, reason: str = "Invalid credentials") -> None:
        super().__init__(
            f"Authentication failed: {reason}",
            domain="auth",
            error_code="AUTHENTICATION_FAILED",
            retryable=False,
        )


# Business logic layer
class InsufficientFundsError(DomainError):
    """Account balance is below the required amount."""

    def __init__(self, available: float, required: float) -> None:
        super().__init__(
            f"Insufficient funds: available={available:.2f}, required={required:.2f}",
            domain="finance",
            error_code="INSUFFICIENT_FUNDS",
            retryable=False,
        )
        self.available = available
        self.required = required


# Infrastructure layer — external system failures, often transient
class DatabaseError(DomainError):
    """Database operation failed. Often transient; may succeed on retry."""

    def __init__(self, table: str, operation: str, original: Exception | None = None) -> None:
        super().__init__(
            f"Database {operation} on '{table}' failed",
            domain="database",
            error_code="DATABASE_ERROR",
            retryable=True,
        )
        self.table = table
        self.operation = operation
        if original is not None:
            self.__cause__ = original


class ExternalServiceError(DomainError):
    """Call to an external API or service failed."""

    def __init__(
        self,
        service: str,
        endpoint: str,
        *,
        status_code: int | None = None,
        original: Exception | None = None,
    ) -> None:
        retryable = status_code is not None and (status_code >= 500 or status_code == 429)
        super().__init__(
            f"External service '{service}' at '{endpoint}' returned {status_code or 'timeout'}",
            domain="external",
            error_code="EXTERNAL_SERVICE_ERROR",
            retryable=retryable,
        )
        self.service = service
        self.endpoint = endpoint
        self.status_code = status_code
        if original is not None:
            self.__cause__ = original


# ✅ GOOD — Usage with explicit docstrings documenting exception contract
def transfer_funds(
    source_account_id: str,
    destination_account_id: str,
    amount: float,
) -> str:
    """Transfer funds between two accounts.

    Args:
        source_account_id: The originating account identifier.
        destination_account_id: The target account identifier.
        amount: Amount to transfer (must be positive).

    Returns:
        Transaction ID on success.

    Raises:
        ValidationError: If amount is non-positive or either account ID is empty.
        InsufficientFundsError: If the source account balance is below the transfer amount.
        DatabaseError: If persisting the transaction fails (retryable).
        ExternalServiceError: If a notification service call fails after retries (may be retryable).
    """
    if not source_account_id or not destination_account_id:
        raise ValidationError("account_id", "Account IDs must not be empty")

    if amount <= 0:
        raise ValidationError("amount", "Transfer amount must be greater than zero")

    try:
        source = get_account(source_account_id)
    except KeyError as e:
        raise ValidationError("source_account_id", f"Account '{source_account_id}' not found") from e

    destination = get_account(destination_account_id)

    if source.balance < amount:
        raise InsufficientFundsError(source.balance, amount)

    try:
        source.balance -= amount
        destination.balance += amount
        tx_id = save_transaction(source_account_id, destination_account_id, amount)
    except Exception as e:
        raise DatabaseError("transactions", "persist_transfer", original=e) from e

    return tx_id
```

### Pattern 2: Context Propagation with Exception Chains

When errors cross module boundaries, they must carry their full history. Python's `raise ... from` syntax preserves the `__cause__` chain, making it possible to trace an error from its surface manifestation back to the root system failure. The BAD example demonstrates the most common mistake: catching an exception and raising a new one without using `from`, which breaks the chain.

```python
import logging
import requests
from contextlib import contextmanager

logger = logging.getLogger(__name__)


# ❌ BAD — Catches and re-raises, but loses the original traceback
def fetch_user_profile(user_id: str) -> dict:
    """Fetch user profile from the user service API.

    BUG: If the HTTP call fails, this catches it and raises a new exception
    without `from`, so the original NetworkError is lost. Operators see only
    "User not found" with no indication whether it's a 404 or a 503.
    """
    try:
        response = requests.get(f"https://api.example.com/users/{user_id}", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        # Chain is broken — __cause__ is None
        raise LookupError(f"User '{user_id}' not found")  # No `from e`


# ✅ GOOD — Explicit chain preservation at every boundary
@contextmanager
def api_request(method: str, url: str, **kwargs: object) -> dict:
    """Execute an HTTP request with full error context propagation.

    Every external call passes through this context manager, which catches
    network-level failures and re-raises them as domain errors with the
    complete exception chain preserved via `raise ... from`.
    """
    try:
        client = requests.Session()
        response = client.request(method, url, timeout=kwargs.pop("timeout", 5), **kwargs)
        response.raise_for_status()
        yield response.json()

    except requests.Timeout as e:
        logger.warning("Request to %s timed out", url)
        raise ExternalServiceError(
            service=url.split("/")[2] if "." in url.split("/")[2] else "unknown",
            endpoint=url,
            status_code=None,
            original=e,
        ) from e

    except requests.HTTPError as e:
        logger.error("HTTP %d from %s: %s", e.response.status_code, url, e.response.text)
        raise ExternalServiceError(
            service=url.split("/")[2] if "." in url.split("/")[2] else "unknown",
            endpoint=url,
            status_code=e.response.status_code,
            original=e,
        ) from e

    except requests.ConnectionError as e:
        logger.error("Connection refused to %s", url)
        raise ExternalServiceError(
            service=url.split("/")[2] if "." in url.split("/")[2] else "unknown",
            endpoint=url,
            status_code=None,
            original=e,
        ) from e


# Usage — chain is fully preserved: DatabaseError -> ExternalServiceError -> requests.Timeout
def get_user_balance(user_id: str) -> float:
    """Retrieve a user's account balance."""
    with api_request("GET", f"https://api.example.com/users/{user_id}/balance") as data:
        return float(data["balance"])


# The full error chain:
# Traceback (most recent call last):
#   File "app.py", line 100, in get_user_balance
#     with api_request(...) as data:
#   File "ctx.py", line 45, in api_request
#     raise ExternalServiceError(...) from e
# ExternalServiceError: External service 'api.example.com' at 'https://...' returned None
#
# The above exception was the direct cause of the following exception:
#
# Traceback (most recent call last):
#   File "app.py", line 105, in handle_request
#     balance = get_user_balance(user_id)
#   ...
# DatabaseError: Database 'profiles' operation 'fetch_balance' failed
```

### Pattern 3: Graceful Degradation / Fallback Pattern

Production systems must remain partially functional when dependencies fail. The fallback pattern wraps fragile calls in a strategy that tries primary, then falls back through alternatives, finally returning a sensible default if all paths are exhausted. The BAD example demonstrates silent error swallowing — the most insidious bug because it produces wrong answers without any indication of failure.

```python
import logging
import time
from enum import Enum
from typing import TypeVar, Callable, Generic, Optional

logger = logging.getLogger(__name__)

T = TypeVar("T")


# Sentinel value for "no data available" — distinct from None, 0, or empty string
class Sentinel(Enum):
    MISSING = "MISSING"


def graceful_degrade(
    primary: Callable[[], T],
    fallback: list[tuple[str, Callable[[], T]]] | None = None,
    default: T = Sentinel.MISSING,  # type: ignore
    fallback_timeout_seconds: float = 2.0,
) -> T:
    """Execute a callable with graceful degradation through fallback strategies.

    Attempts the primary function first, then walks through an ordered list of
    fallbacks. If all fail or raise, returns the sentinel default. Degradation
    events are logged so operators can detect and investigate partial outages.

    Args:
        primary: The preferred function to call (e.g., live API fetch).
        fallback: Ordered list of (name, callable) pairs tried in sequence.
            Example: [("cache", get_from_cache), ("disk", load_cached_data)]
        default: Value to return if every strategy fails. Use a sentinel to
            distinguish "no data" from valid empty results.
        fallback_timeout_seconds: Maximum total time spent on all fallbacks.

    Returns:
        The result of the first successful strategy, or `default` if none succeed.
    """
    start = time.monotonic()
    strategies = [("primary", primary)] + (fallback or [])

    for name, strategy in strategies:
        remaining = fallback_timeout_seconds - (time.monotonic() - start)
        if remaining <= 0:
            logger.warning("Degradation timeout reached after %.1fs", fallback_timeout_seconds)
            break

        try:
            result = strategy()
            # Check for sentinel returns from strategies that may signal "not available"
            if isinstance(result, Sentinel):
                raise ValueError(f"Fallback '{name}' returned no data")
            logger.debug("Strategy '%s' succeeded", name)
            return result

        except Exception as e:
            elapsed = time.monotonic() - start
            logger.info(
                "Degradation: strategy '%s' failed after %.1fs (%s), trying next...",
                name, elapsed, type(e).__name__,
            )
            continue

    logger.warning("All strategies exhausted for degraded operation, returning default")
    return default  # type: ignore


# ✅ GOOD — Cache fallback for an external pricing API
def get_current_price(symbol: str) -> float:
    """Get the current market price for a trading symbol.

    Falls back to cached price if the live API is unreachable, ensuring the
    system can still function during brief outages (with potentially stale data).
    """
    return graceful_degrade(
        primary=lambda: _fetch_live_price(symbol),
        fallback=[
            ("redis_cache", lambda: _get_cached_price(symbol)),
            ("last_known", lambda: _get_last_known_price(symbol)),
        ],
        default=0.0,  # Zero price means "no data available" — caller should check
        fallback_timeout_seconds=3.0,
    )


def _fetch_live_price(symbol: str) -> float:
    """Fetch live price from the market data API."""
    resp = requests.get(f"https://prices.example.com/v1/{symbol}", timeout=2)
    resp.raise_for_status()
    return resp.json()["last"]


def _get_cached_price(symbol: str) -> float:
    """Retrieve cached price from Redis."""
    value = redis_client.get(f"price:{symbol}")
    if value is None:
        raise ValueError("Cache miss")
    return float(value)


def _get_last_known_price(symbol: str) -> float:
    """Return the last persisted price from the database (may be stale)."""
    record = db.query("SELECT last_price FROM market_prices WHERE symbol = %s", [symbol])
    if not record:
        raise ValueError("No historical data available")
    return float(record["last_price"])


# ❌ BAD — Silent failure through bare except
def bad_get_price(symbol: str) -> float:
    """Get price — silently returns 0.0 on any failure."""
    try:
        resp = requests.get(f"https://prices.example.com/v1/{symbol}", timeout=2)
        return resp.json()["last"]
    except Exception:
        return 0.0  # Silent swallow — no logging, no fallback, no indication of degradation
```

### Pattern 4: RFC 7807 Problem Details Response Structure

RFC 7807 Problem Details provides a standardized JSON format for HTTP error responses. Every endpoint should use this structure consistently so that clients can parse errors programmatically regardless of which component generated them.

```python
from dataclasses import dataclass, fields, asdict
from typing import Any


@dataclass
class ProblemDetails:
    """RFC 7807 Problem Details response structure.

    Provides a consistent, machine-parsable error format for all API responses.
    See https://datatracker.ietf.org/doc/html/rfc7807
    """

    type: str = "about:blank"            # URI identifying the error class
    title: str = ""                      # Short, human-readable summary
    status: int = 500                    # HTTP status code
    detail: str | None = None            # Human explanation of the specific error
    instance: str | None = None          # URI identifying this specific error occurrence

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dict, omitting None fields."""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_error(cls, error: AppError, *, request_id: str | None = None) -> "ProblemDetails":
        """Construct a ProblemDetails instance from an application exception."""
        trace_ref = f"/errors/{request_id}" if request_id else None
        return cls(
            type=f"about:{error.error_code.lower().replace('_', '-')}",
            title=type(error).__name__,
            status=500,  # Default; subclasses should override with specific codes
            detail=str(error),
            instance=trace_ref,
        )


# BAD — Inconsistent error responses across endpoints
@app.route("/api/accounts/<id>")
def get_account_bad(id: str) -> tuple[Any, int]:
    """Returns wildly different formats depending on failure mode."""
    try:
        account = db.query("SELECT * FROM accounts WHERE id = %s", [id])
        if not account:
            return {"error": "Not found"}, 404  # Ad-hoc format, no type URI, no trace ref
    except Exception as e:
        return {"message": str(e), "stacktrace": traceback.format_exc()}, 500  # Exposes internals!
    return {"account": account}


# ✅ GOOD — Consistent RFC 7807 responses everywhere
@app.route("/api/accounts/<id>")
def get_account(id: str, request_id: str) -> tuple[Any, int]:
    """Return a single account with standardized error responses."""
    try:
        account = db.query("SELECT * FROM accounts WHERE id = %s", [id])
        if not account:
            problem = ProblemDetails(
                type="about:not-found",
                title="Account Not Found",
                status=404,
                detail=f"No account exists with ID '{id}'",
                instance=f"/errors/{request_id}",
            )
            return problem.to_dict(), 404

        return {"account": account}, 200

    except ValidationError as e:
        problem = ProblemDetails.from_error(e, request_id=request_id)
        problem.status = 400
        return problem.to_dict(), 400

    except DatabaseError as e:
        logger.error("Database error fetching account %s [request_id=%s]: %s", id, request_id, e)
        problem = ProblemDetails(
            type="about:service-unavailable",
            title="Service Temporarily Unavailable",
            status=503,
            detail="The database is temporarily unreachable. Please retry later.",
            instance=f"/errors/{request_id}",
            # NOTE: No internal error code or SQL query leaks into the response
        )
        return problem.to_dict(), 503

    except Exception as e:
        # Catch-all for truly unexpected errors — never exposes internals to client
        logger.exception("Unexpected error handling account %s [request_id=%s]", id, request_id)
        problem = ProblemDetails(
            type="about:internal-error",
            title="Internal Server Error",
            status=500,
            detail="An unexpected error occurred. Please contact support with reference ID.",
            instance=f"/errors/{request_id}",
        )
        return problem.to_dict(), 500


# ✅ GOOD — Validation errors get proper 400 responses
@app.route("/api/accounts", methods=["POST"])
def create_account(request_id: str) -> tuple[Any, int]:
    """Create a new account with input validation."""
    try:
        data = request.get_json()
        if not data or "owner" not in data:
            raise ValidationError("owner", "The 'owner' field is required")

        if not isinstance(data["owner"], str) or len(data["owner"]) < 2:
            raise ValidationError("owner", "Owner name must be at least 2 characters")

        account = db.insert("accounts", data)
        problem = ProblemDetails(
            type="about:created",
            title="Account Created",
            status=201,
            instance=f"/errors/{request_id}",
        )
        return {"account": account, "problem": problem.to_dict()}, 201

    except ValidationError as e:
        problem = ProblemDetails.from_error(e, request_id=request_id)
        problem.status = 400
        return problem.to_dict(), 400
```

---

## Constraints

### MUST DO

- Always use `raise ... from original_error` to preserve exception chains when catching and re-raising in production code. The `from` clause creates a `__cause__` link that tools like Python's traceback module render automatically.
- Define custom exception classes at the package level with structured attributes (`error_code: str`, `retryable: bool`). Never use bare `ValueError`, `RuntimeError`, or `Exception` for domain-specific failures in production modules.
- Document every public function's exception contract in its docstring using a `Raises:` section that lists each possible exception type and the condition under which it is raised. This enables callers to write targeted exception handlers.
- Implement graceful degradation for all external dependency calls (APIs, databases, caches). The calling code must not crash when a downstream system is unavailable — it should return cached data, a default value, or a clear degradation notice.

### MUST NOT DO

- Use bare `except:` or bare `except Exception:` without re-raising or logging to the structured logger. A bare catch can swallow `KeyboardInterrupt` and `SystemExit`, making the application impossible to stop gracefully.
- Return `None` from functions where a sentinel value (`Sentinel.MISSING`) or an explicit error would be clearer. The caller should never have to guess whether `None` means "empty result" or "function failed."
- Include stack traces, file paths, internal class names, SQL queries, or database connection strings in error messages exposed to API clients or end users. These details belong only in internal structured logs.
- Catch exceptions you don't understand. If a function cannot meaningfully handle an error (e.g., it doesn't know whether the cause is transient or permanent), propagate it up the call stack with `raise ... from` rather than wrapping it in a generic handler.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-engineering-principles` | Broader engineering principles (SOLID, DRY) that inform exception design |
| `software-maintainability` | Refactoring strategies for systems with poor error handling that need gradual improvement |
| `api-design-principles` | API design patterns including consistent error response conventions and versioning |

---

## Live References

> Authoritative documentation links for Python error handling. The model follows markdown links at load time to resolve external references and inline content.

- [Python PEP 3134 — Exception Chaining and Context](https://peps.python.org/pep-3134/)
- [RFC 7807 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Python `logging` Module Documentation](https://docs.python.org/3/library/logging.html)
- [Resilient Systems Design (Google SRE Book, Chapter 8)](https://sre.google/sre-book/troubleshooting-infrastructure/)
- [Exception Hierarchy Design Patterns in Python](https://realpython.com/custom-exceptions-python-using-raise-exception/)
