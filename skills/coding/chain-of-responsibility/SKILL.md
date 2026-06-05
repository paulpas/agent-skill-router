---




name: chain-of-responsibility
description: Implements the GoF Chain of Responsibility pattern for building middleware-style request handler pipelines in Python where each handler processes or forwards requests along a configurable chain.
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
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: chain of responsibility pattern, middleware pipeline python, request handler chain, how do i pass requests through handlers, error propagation pipeline, sequential processing chain
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: strategy-pattern, command-pattern, behavioral-design-patterns, event-driven-architecture




---





# Chain of Responsibility Pattern

Senior Python engineer implementing the Chain of Responsibility pattern for building middleware-style request handler pipelines. This skill makes the model create configurable chains where each handler can process a request, pass it to the next handler, or short-circuit with a result — replacing monolithic request processing with composable, independently testable handler units.

## TL;DR Checklist

- [ ] Define Handler ABC with `set_next()` for chaining and `handle()` for request processing
- [ ] Each handler either processes the request fully (short-circuit) or passes to `self._next`
- [ ] Use 2-5 handlers per chain — deeper chains become debugging nightmares
- [ ] Implement error propagation so failures at any point bubble up with context
- [ ] Test each handler in isolation with a mock next-handler and verify both pass-through and short-circuit paths

---

## When to Use

Use this skill when:

- You have multiple independent checks or transformations that must run in sequence on a request
- You are building middleware, interceptor chains, or validation pipelines (auth → logging → rate-limit → business logic)
- Different handlers may fully satisfy a request, preventing downstream handlers from running
- You want to add, remove, or reorder processing steps without modifying existing handler code
- Error handling at each stage needs context about which handler failed

---

## When NOT to Use

Avoid this skill for:

- Simple if/elif cascades with 2-3 conditions — direct conditionals are clearer
- Operations that require ALL handlers to run (use Observer pattern instead; Chain of Responsibility stops on first handler that "takes" the request)
- High-frequency hot paths where handler chain overhead matters (benchmark with a single monolithic function vs. chain)
- When the order of processing is not important — use parallel dispatch via async.gather or concurrent.futures

---

## Core Workflow

1. **Define the Handler ABC** — Create an abstract base class with `set_next()` that links to the following handler and returns it (fluent builder pattern). The `handle()` method accepts a request and returns either a result (short-circuit) or None (pass to next). **Checkpoint:** Verify that calling `set_next()` on the last handler in a chain raises an error rather than silently allowing infinite chains.

2. **Implement Request/Result Types** — Define typed dataclasses for requests (immutable, containing all input data) and results (containing output data plus any metadata like processing time). Frozen dataclasses prevent handlers from mutating shared request state. **Checkpoint:** Results should always include an error field so failures can propagate without raising exceptions.

3. **Implement Concrete Handlers** — Each handler implements `handle()` with exactly one responsibility: validation, authentication, logging, transformation, etc. If the handler can fully process the request, it returns a result and does not call `self._next`. Otherwise it calls `self._next.handle(request)` if a next handler exists. **Checkpoint:** No handler should know about more than its predecessor and successor in the chain.

4. **Build the Chain** — Link handlers using `set_next()`: `auth.set_next(logging).set_next(rate_limit).set_next(business_logic)`. The first handler in the chain is the entry point; subsequent handlers are invisible to callers. **Checkpoint:** The chain should be immutable after construction — no modifying handlers during request processing.

5. **Handle Short-Circuiting and Error Propagation** — When a handler fully satisfies a request (e.g., a cached response), return immediately without calling next. When an error occurs, capture it in the result or raise a descriptive exception with handler chain context. **Checkpoint:** Every request that reaches the end of the chain without being handled should return a clear "no handler available" result rather than silently failing.

---

## Implementation Patterns

### Pattern 1: ABC-Based Handler Chain (Core Structure)

This is the canonical Chain of Responsibility using Python's `abc` module with fluent `set_next()` chaining and typed request/result dataclasses.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


# Request/Result types — immutable, typed, frozen
class RequestStatus(Enum):
    """Status of a request after chain processing."""
    SUCCESS = "success"
    AUTH_FAILED = "auth_failed"
    RATE_LIMITED = "rate_limited"
    VALIDATION_ERROR = "validation_error"
    HANDLED = "handled"
    NOT_HANDLED = "not_handled"


@dataclass(frozen=True)
class Request:
    """Immutable request passing through the handler chain."""
    method: str
    path: str
    headers: dict[str, str] = field(default_factory=dict)
    body: dict[str, Any] = field(default_factory=dict)

    @property
    def is_authenticated(self) -> bool:
        return "authorization" in self.headers and len(self.headers["authorization"]) > 0

    @property
    def client_ip(self) -> str | None:
        return self.headers.get("x-forwarded-for")


@dataclass(frozen=True)
class Response:
    """Response from the handler chain."""
    status: RequestStatus
    body: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    handler_name: str = ""

    @property
    def is_success(self) -> bool:
        return self.status in (RequestStatus.SUCCESS, RequestStatus.HANDLED)


class Handler(ABC):
    """Abstract handler that forms one link in the responsibility chain.

    Each handler can either:
    1. Process the request and return a Response (short-circuit)
    2. Pass the request to self._next for further processing
    3. Return None to signal the request should continue down the chain
    """

    def __init__(self, name: str = "") -> None:
        self.name = name or type(self).__name__
        self._next: Handler | None = None

    def set_next(self, handler: "Handler") -> "Handler":
        """Link this handler to the next one in the chain.

        Returns the linked handler for fluent chaining.

        Args:
            handler: The next Handler in the responsibility chain.

        Returns:
            The handler that was set as next (for chaining).

        Raises:
            ValueError: If setting a handler already has a next handler
                        (chains must be built linearly, not branched).
        """
        if self._next is not None:
            raise ValueError(f"Handler '{self.name}' already has a next handler. "
                             "Chains are linear — build them sequentially.")
        self._next = handler
        return handler  # Fluent API for chaining

    @abstractmethod
    def handle(self, request: Request) -> Response | None:
        """Process the request or pass it to the next handler.

        Returns:
            Response if this handler fully processes the request.
            None to pass the request to the next handler in chain.
        """
        ...

    def _pass_to_next(self, request: Request) -> Response:
        """Pass request to the next handler or return NOT_HANDLED."""
        if self._next is not None:
            response = self._next.handle(request)
            if response is not None:
                return response
        return Response(
            status=RequestStatus.NOT_HANDLED,
            error=f"No handler processed request for {request.method} {request.path}",
            handler_name=self.name,
        )
```

### Pattern 2: Complete Middleware Pipeline (BAD vs. GOOD)

The BAD approach uses a monolithic function with all logic in one place — impossible to test or modify individual concerns. The GOOD approach uses independent handlers in a composable chain.

```python
import time


# ❌ BAD — Monolithic request handler, impossible to modify independently
class MonolithicHandler:
    """All-in-one request processing — every concern mixed together."""

    def handle(self, method: str, path: str, headers: dict) -> dict:
        # Validation + Auth + Logging + Rate Limiting + Business Logic
        # all in one function that cannot be tested or modified independently

        # 1. Validate
        if not method or not path:
            return {"status": "error", "message": "Missing parameters"}

        # 2. Authentication check
        token = headers.get("authorization")
        if not token:
            return {"status": "auth_error", "message": "No auth token"}

        # 3. Rate limiting (with its own internal state!)
        if not hasattr(self, "_request_counts"):
            self._request_counts = {}
        ip = headers.get("x-forwarded-for", "unknown")
        self._request_counts[ip] = self._request_counts.get(ip, 0) + 1
        if self._request_counts[ip] > 100:
            return {"status": "rate_limited", "message": "Too many requests"}

        # 4. Business logic (buried under all the plumbing)
        result = self._process_request(method, path)

        # 5. Logging (mixed with response building)
        import logging
        logging.info(f"Processed {method} {path}")

        return {"status": "ok", "result": result}

    def _process_request(self, method: str, path: str) -> dict:
        # Business logic buried here, hard to test without mocking auth/rate-limit
        return {"message": f"Processed {method} on {path}"}


# Now add a new concern (e.g., CORS headers)? Must modify the entire class.
# This violates Open/Closed Principle — neither open for extension nor closed for modification.
```

```python
# ✅ GOOD — Each handler is independently testable, configurable, and reusable
class AuthHandler(Handler):
    """Validates authentication tokens before passing requests downstream."""

    def __init__(self, secret_key: str = "test-secret") -> None:
        super().__init__(name="AuthHandler")
        self._secret_key = secret_key

    def handle(self, request: Request) -> Response | None:
        token = request.headers.get("authorization")
        if not token or len(token) < 8:
            return Response(
                status=RequestStatus.AUTH_FAILED,
                error="Missing or invalid authorization header",
                handler_name=self.name,
            )
        # Token present and valid-ish — pass to next handler
        return None


class LoggingHandler(Handler):
    """Logs every request passing through the chain for audit trails."""

    def __init__(self) -> None:
        super().__init__(name="LoggingHandler")

    def handle(self, request: Request) -> Response | None:
        import logging
        logger = logging.getLogger("middleware")
        logger.info(
            "REQUEST %s %s from %s headers=%s",
            request.method,
            request.path,
            request.client_ip or "unknown",
            dict(request.headers),
        )
        # Always pass through — logging is a transparent concern
        return None


class RateLimitHandler(Handler):
    """Enforces per-IP rate limiting with configurable request budgets."""

    def __init__(self, max_requests: int = 100, window_seconds: float = 60.0) -> None:
        super().__init__(name="RateLimitHandler")
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._request_counts: dict[str, list[float]] = {}

    def handle(self, request: Request) -> Response | None:
        ip = request.client_ip or "unknown"
        now = time.time()

        # Clean old entries outside the window
        if ip not in self._request_counts:
            self._request_counts[ip] = []
        self._request_counts[ip] = [
            t for t in self._request_counts[ip] if now - t < self._window_seconds
        ]

        if len(self._request_counts[ip]) >= self._max_requests:
            return Response(
                status=RequestStatus.RATE_LIMITED,
                error=f"Rate limit exceeded: {self._max_requests} requests per {self._window_seconds}s",
                handler_name=self.name,
            )

        # Record this request and pass through
        self._request_counts[ip].append(now)
        return None


class BusinessHandler(Handler):
    """Final handler that processes business logic for known routes."""

    def __init__(self) -> None:
        super().__init__(name="BusinessHandler")

    def handle(self, request: Request) -> Response | None:
        # Only handle specific route patterns
        if not request.path.startswith("/api/"):
            return None  # Not our concern — let other handlers (or NOT_HANDLED) deal with it

        if request.method == "GET" and request.path == "/api/status":
            return Response(
                status=RequestStatus.SUCCESS,
                body={"status": "healthy", "uptime_ms": 12345},
                handler_name=self.name,
            )

        # Default: acknowledge receipt
        return Response(
            status=RequestStatus.HANDLED,
            body={"message": f"Received {request.method} {request.path}"},
            handler_name=self.name,
        )


def build_api_chain() -> Handler:
    """Factory function that constructs the standard API request chain.

    Returns:
        The first handler in the chain (entry point).
    """
    auth = AuthHandler(secret_key="prod-secret-key")
    logging = LoggingHandler()
    rate_limit = RateLimitHandler(max_requests=100, window_seconds=60.0)
    business = BusinessHandler()

    # Build the chain: Auth → Log → RateLimit → Business
    auth.set_next(logging).set_next(rate_limit).set_next(business)
    return auth


# Usage — callers only interact with the first handler:
# chain = build_api_chain()
# request = Request(method="GET", path="/api/status", headers={"authorization": "Bearer token123"})
# response = chain.handle(request)
# assert response.is_success
```

### Pattern 3: Handler Testing and Chain Factory

Each handler must be independently testable. Use mock handlers to verify both pass-through (return None) and short-circuit (return Response) behavior. The chain factory builds and returns the entry point.

```python
from unittest.mock import MagicMock, call


class MockHandler(Handler):
    """Test double that tracks how many times handle() was called."""

    def __init__(self, name: str = "Mock", short_circuit: bool = False) -> None:
        super().__init__(name=name)
        self._short_circuit = short_circuit
        self.call_count: int = 0
        self.received_requests: list[Request] = []

    def handle(self, request: Request) -> Response | None:
        """Process or pass through. Optionally short-circuit with a result."""
        self.call_count += 1
        self.received_requests.append(request)
        if self._short_circuit:
            return Response(
                status=RequestStatus.HANDLED,
                body={"handled_by": self.name},
                handler_name=self.name,
            )
        return None


class ValidationHandler(Handler):
    """Validates request method and path before passing downstream."""

    def __init__(self) -> None:
        super().__init__(name="ValidationHandler")

    def handle(self, request: Request) -> Response | None:
        if not request.method or request.method.upper() not in ("GET", "POST", "PUT", "DELETE"):
            return Response(
                status=RequestStatus.VALIDATION_ERROR,
                error=f"Invalid HTTP method: {request.method}",
                handler_name=self.name,
            )
        if not request.path or not request.path.startswith("/"):
            return Response(
                status=RequestStatus.VALIDATION_ERROR,
                error="Path must start with /",
                handler_name=self.name,
            )
        return None


def test_handler_chain() -> None:
    """Example test demonstrating chain isolation.

    Tests that:
    1. AuthHandler rejects requests without tokens (short-circuits)
    2. ValidationHandler passes valid requests to the next handler
    3. Chain entry returns the correct error response for auth failures
    """
    # Setup: build a minimal chain with mock handlers
    auth = AuthHandler()
    validation = ValidationHandler()
    mock_final = MockHandler(name="MockFinal")

    auth.set_next(validation).set_next(mock_final)

    # Test 1: Request without auth token is rejected by AuthHandler
    no_auth_request = Request(method="GET", path="/api/data", headers={})
    response = auth.handle(no_auth_request)

    assert response.status == RequestStatus.AUTH_FAILED
    assert response.error == "Missing or invalid authorization header"
    assert mock_final.call_count == 0  # Final handler never reached
    assert validation.call_count == 0  # Validation never reached

    # Test 2: Valid authenticated request passes through to final handler
    valid_request = Request(
        method="GET",
        path="/api/data",
        headers={"authorization": "Bearer token12345"},
    )
    response = auth.handle(valid_request)

    assert mock_final.call_count == 1
    assert mock_final.received_requests[0].method == "GET"


def build_secure_chain() -> Handler:
    """Build a production-ready secure request chain.

    Chain order: Validation → Auth → Logging → RateLimit → Business

    Args:
        max_requests_per_minute: Rate limit threshold per IP.

    Returns:
        The first handler (entry point) of the chain.
    """
    validation = ValidationHandler()
    auth = AuthHandler(secret_key="prod-secret")
    logging_h = LoggingHandler()
    rate_limit = RateLimitHandler(max_requests=60, window_seconds=60.0)
    business = BusinessHandler()

    # Build linear chain — each set_next returns the next handler for chaining
    validation.set_next(auth).set_next(logging_h).set_next(rate_limit).set_next(business)
    return validation


# Usage:
# chain = build_secure_chain()
# response = chain.handle(Request("GET", "/api/status", {"authorization": "Bearer xyz"}))
```

---

## Constraints

### MUST DO
- Use `set_next()` fluent API for chaining — returns the next handler for builder-style construction
- Each handler must have a single responsibility — if it does validation AND auth, split into two handlers
- Return `Response` from short-circuiting handlers (they fully handled the request) and `None` to pass through
- Handle end-of-chain: when no handler processes the request, return `NOT_HANDLED` with a clear error message
- Keep chains to 2-5 handlers maximum — deeper chains indicate SRP violations

### MUST NOT DO
- Allow branched chains — each handler has at most one next handler (linear chain only)
- Modify shared state between handlers in the same request — use fresh Request objects per invocation
- Call `self._next.handle()` without checking if `_next` is None — always check before passing on
- Mix concerns within a single handler (e.g., auth logic + logging + rate limiting in one class)
- Build chains dynamically during request processing — construct once and reuse

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `strategy-pattern` | Use Strategy when you need to swap entire behaviors at runtime; use Chain of Responsibility when you need sequential processing through multiple handlers |
| `command-pattern` | Use Command when you need to encapsulate requests with undo/redo; combine Command + Chain to create replayable, composable request pipelines |
| `behavioral-design-patterns` | Broader catalog of GoF behavioral patterns including Mediator (alternative to Chain for complex cross-object communication) and Visitor |
| `event-driven-architecture` | Chain of Responsibility processes requests sequentially; Event Sourcing broadcasts events in parallel via Observer — choose based on processing model needs |

---

## Live References

> Authoritative documentation links for the Chain of Responsibility pattern and middleware design.

- [GoF Chain of Responsibility (Refactoring.Guru)](https://refactoring.guru/design-patterns/chain-of-responsibility) — Visual UML and Java examples
- [Python abc Module](https://docs.python.org/3/library/abc.html) — Abstract base classes for handler contracts
- [Python dataclasses](https://docs.python.org/3/library/dataclasses.html) — Immutable request/response types with frozen=True
- [SOLID Open/Closed Principle](https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle) — Chain of Responsibility fulfills OCP by adding handlers without modifying existing ones
- [Middleware Patterns (Django/Express)](https://docs.djangoproject.com/en/stable/topics/http/middleware/) — Real-world middleware implementations in major frameworks
