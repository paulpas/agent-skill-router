---




name: integration-patterns
description: Implements service-to-service integration patterns (adapter, API gateway,
  saga, circuit breaker, event-driven) for connecting distributed systems and legacy
  services with resilience.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: integration patterns, service integration, adapter pattern, saga pattern, circuit breaker, API gateway, messaging, event-driven circuit breaker
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
  - examples
  - config
  - do-dont
  related-skills: anti-corruption-layer, event-driven-patterns, rest-api-patterns,
    microservice-resilience-patterns




---




# Integration Patterns

Implements proven integration patterns to connect distributed services, legacy systems, and external APIs reliably. Covers synchronous (REST, gRPC), asynchronous (messaging, events), and orchestration (saga, choreography) styles with built-in resilience through circuit breakers, retries, and idempotency.

## TL;DR Checklist

- [ ] Choose integration style matching system requirements (sync vs async, fire-and-forget vs guaranteed delivery)
- [ ] Apply adapter pattern when wrapping incompatible interfaces or legacy systems
- [ ] Implement saga for distributed transactions spanning multiple services
- [ ] Add circuit breaker to all external service calls with configurable thresholds
- [ ] Ensure idempotency keys on all operations that may be retried
- [ ] Configure dead-letter queues for failed message processing

---

## When to Use

Use this skill when:

- Connecting two or more services that need to exchange data reliably
- Wrapping a legacy system with an incompatible interface behind a modern API
- Implementing distributed transactions that span multiple services (saga pattern)
- Designing communication between microservices in a distributed architecture
- Integrating with external third-party APIs that have rate limits or may fail
- Building event-driven integrations where services react to domain events
- Migrating from monolith to microservices — need point-to-point integration strategies

## When NOT to Use

- For simple function calls within the same process — use direct method calls instead
- When all services share the same database — use transactions instead of distributed patterns
- For real-time streaming where latency matters more than reliability — use WebSocket or gRPC streams directly
- As a replacement for proper API design — integration patterns connect well-designed APIs, they don't fix bad ones

---

## Core Workflow

1. **Analyze Communication Requirements** — Determine if the integration needs synchronous request-response (REST/gRPC), asynchronous fire-and-forget (messaging), or guaranteed delivery with state tracking (saga). Consider data volume, latency tolerance, and failure domain boundaries.
   **Checkpoint:** If any service must wait for another's response before proceeding, choose sync. If services can proceed independently after sending data, choose async messaging.

2. **Select Integration Architecture** — Map requirements to an integration style:
   - Point-to-point direct calls → REST or gRPC with retry logic
   - Broadcast to multiple consumers → Event-driven pub/sub with message broker
   - Distributed transaction across services → Saga (orchestration or choreography)
   - Legacy system wrapping → Adapter pattern with ACL
   - Multiple downstream calls aggregating results → API Gateway with composition
   **Checkpoint:** Document the chosen architecture in an ASCII diagram showing data flow between all participating services.

3. **Implement Idempotency Foundation** — Before writing any integration code, establish idempotency guarantees for all operations that may be retried (HTTP PUT/PATCH, message processing). Generate or accept idempotency keys from the caller and store them with operation results.
   **Checkpoint:** Every integration endpoint must accept an `X-Idempotency-Key` header and return the cached result if the same key is presented again within the TTL window.

4. **Add Resilience Layers** — Implement circuit breaker for every external service call using a sliding-window failure count. Configure half-open state to periodically test if the downstream service recovered. Add exponential backoff with jitter to retry logic (never use fixed delays).
   **Checkpoint:** Circuit breaker must transition: `CLOSED → OPEN` after max failures in window, then `HALF_OPEN` after recovery timeout, and finally `CLOSED` on first successful call.

5. **Implement Error Handling and Dead Letter Path** — Route failed messages to a dead-letter queue or table with error metadata (original payload, failure reason, retry count, timestamp). Implement poison pill detection: if the same message fails N times, route to DLQ instead of retrying indefinitely.
   **Checkpoint:** Every service must have a DLQ endpoint and every integration test must verify that poisoned messages end up in the DLQ rather than blocking the queue.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Adapter Pattern for Legacy Integration

The adapter pattern wraps an incompatible interface (legacy system, third-party API) behind a clean abstraction that matches your domain's expectations. This isolates change — when the legacy system evolves or is replaced, only the adapter needs updating.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class OrderRequest:
    customer_id: str
    items: list[str]
    total_amount: float
    shipping_address: str


# The "target" interface — clean, domain-aligned, used by the rest of your codebase
class OrderService(ABC):
    @abstractmethod
    async def place_order(self, request: OrderRequest) -> str:
        """Place an order and return the order ID. Raises on validation failure."""
        ...


# The "adaptee" — legacy system with a completely different interface
class LegacyOrderClient:
    """Wraps calls to a COBOL mainframe via XML/HTTP. Do NOT use directly."""

    def submit_order(self, xml_payload: str) -> dict:
        """Submits an order as XML. Returns {'status': 'ACCEPTED'|'REJECTED', 'ref': '...'}"""
        import httpx
        resp = httpx.post(
            "https://legacy.example.com/orders",
            content=xml_payload,
            headers={"Content-Type": "text/xml"},
            timeout=30.0,
        )
        return resp.json()


# The adapter — translates between your domain model and the legacy interface
class LegacyOrderAdapter(OrderService):
    """Adapts the modern OrderService interface to the legacy COBOL order system."""

    def __init__(self, client: LegacyOrderClient) -> None:
        self._client = client

    @staticmethod
    def _to_xml(request: OrderRequest) -> str:
        """Convert domain model to legacy XML format. Domain knowledge is encapsulated here."""
        items_xml = "\n".join(
            f'  <item>{item}</item>' for item in request.items
        )
        return f"""<?xml version="1.0"?>
<order>
    <customer>{request.customer_id}</customer>
    {items_xml}
    <total>{request.total_amount:.2f}</total>
    <address>{request.shipping_address}</address>
</order>"""

    @staticmethod
    def _from_response(response: dict) -> str:
        """Extract order ID from legacy response format."""
        if response.get("status") != "ACCEPTED":
            raise ValueError(f"Legacy order rejected: {response}")
        return response["ref"]

    async def place_order(self, request: OrderRequest) -> str:
        # Convert → call → convert — all in one flow, no leakage of legacy concerns
        xml = self._to_xml(request)
        result = self._client.submit_order(xml)
        return self._from_response(result)
```

**Anti-pattern (BAD):** Exposing the raw legacy client directly to callers. This couples business logic to XML format details and makes the system untestable.

### Pattern 2: Saga Orchestration for Distributed Transactions

A saga coordinates a sequence of local transactions across multiple services, compensating backwards if any step fails. Use orchestration (central coordinator) when you need visibility and control; use choreography (events) when services should be loosely coupled.

```python
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class SagaStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMMITTED = "committed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"
    FAILED = "failed"


@dataclass
class SagaContext:
    """Shared state across all saga steps."""
    order_id: str
    customer_id: str
    amount: float
    reservation_id: Optional[str] = None
    payment_id: Optional[str] = None
    shipment_id: Optional[str] = None
    status: SagaStatus = SagaStatus.PENDING


class SagaOrchestrator:
    """Coordinates a saga by executing steps in order and compensating on failure.

    Each step is a (execute, compensate) pair. If execute fails, all previously
    successful steps are compensated in reverse order. Implements the Fail Fast
    principle — returns immediately on first failure rather than waiting for timeouts.
    """

    def __init__(self) -> None:
        # Each entry: (async step_fn(ctx), async compensate_fn(ctx))
        self._steps: list[tuple[Callable, Callable]] = []

    def add_step(
        self,
        execute: Callable[[SagaContext], asyncio.Future | str],
        compensate: Callable[[SagaContext], asyncio.Future | None],
    ) -> "SagaOrchestrator":
        """Register an (execute, compensate) pair. Returns self for chaining."""
        self._steps.append((execute, compensate))
        return self

    async def execute(self, ctx: SagaContext) -> SagaStatus:
        """Run all steps forward; compensate on any failure."""
        ctx.status = SagaStatus.RUNNING
        compensated_up_to = 0

        try:
            for i, (step_fn, _) in enumerate(self._steps):
                result = step_fn(ctx)
                if asyncio.iscoroutine(result):
                    result = await result
                # Step returned successfully — proceed to next
                ctx.status = SagaStatus.RUNNING

            # All steps succeeded
            ctx.status = SagaStatus.COMMITTED
            return ctx.status

        except Exception as exc:
            ctx.status = SagaStatus.COMPENSATING
            # Compensate in reverse order up to the step that failed
            for i in range(compensated_up_to, len(self._steps) - 1, -1):
                _, compensate_fn = self._steps[i]
                try:
                    comp_result = compensate_fn(ctx)
                    if asyncio.iscoroutine(comp_result):
                        await comp_result
                except Exception as comp_exc:
                    # Compensation itself failed — log and continue compensating others
                    # A monitoring system should alert on this; manual review may be needed
                    pass  # pragma: no cover

            ctx.status = SagaStatus.COMPENSATED
            return ctx.status


# Concrete saga: place order across Inventory → Payment → Shipping services
async def build_order_saga() -> tuple[SagaOrchestrator, Callable[[], SagaContext]]:
    """Builds a complete order placement saga with all steps registered."""

    orchestrator = SagaOrchestrator()

    async def reserve_stock(ctx: SagaContext) -> str:
        # Simulates calling inventory service — replace with actual HTTP/gRPC call
        ctx.reservation_id = f"res-{ctx.order_id}"
        return ctx.reservation_id

    async def cancel_reservation(ctx: SagaContext) -> None:
        if ctx.reservation_id:
            pass  # Call inventory service to release stock

    async def charge_payment(ctx: SagaContext) -> str:
        ctx.payment_id = f"pay-{ctx.order_id}"
        return ctx.payment_id

    async def refund_payment(ctx: SagaContext) -> None:
        if ctx.payment_id:
            pass  # Call payment service to refund

    async def create_shipment(ctx: SagaContext) -> str:
        ctx.shipment_id = f"ship-{ctx.order_id}"
        return ctx.shipment_id

    async def cancel_shipment(ctx: SagaContext) -> None:
        if ctx.shipment_id:
            pass  # Call shipping service to cancel order

    orchestrator.add_step(reserve_stock, cancel_reservation)
    orchestrator.add_step(charge_payment, refund_payment)
    orchestrator.add_step(create_shipment, cancel_shipment)

    def make_context() -> SagaContext:
        return SagaContext(
            order_id="ORD-12345",
            customer_id="CUST-001",
            amount=99.99,
        )

    return orchestrator, make_context


# Usage example
async def run_saga():
    orchestrator, make_ctx = await build_order_saga()
    ctx = make_ctx()
    status = await orchestrator.execute(ctx)
    assert status == SagaStatus.COMMITTED, f"Saga did not commit: {status}"
```

### Pattern 3: Circuit Breaker with Exponential Backoff

Protects your services from cascading failures by detecting when a downstream service is unhealthy and failing fast instead of waiting for timeouts.

```python
import asyncio
import time
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Any


class CircuitState(Enum):
    CLOSED = "closed"        # Normal operation — requests flow through
    OPEN = "open"            # Failure detected — fail fast without calling downstream
    HALF_OPEN = "half_open"  # Testing recovery — allow one probe request


@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5          # Failures in window before opening
    recovery_timeout: float = 30.0      # Seconds before transitioning to half-open
    half_open_max_calls: int = 1        # Probe requests allowed in half-open state


@dataclass
class _State:
    failure_count: int = 0
    last_failure_time: float = 0.0
    half_open_calls: int = 0
    state: CircuitState = CircuitState.CLOSED


class CircuitBreaker:
    """Circuit breaker that wraps a single service call.

    Transitions:
      CLOSED → OPEN: when failure_count >= threshold within sliding window
      OPEN → HALF_OPEN: after recovery_timeout expires, allow probe request
      HALF_OPEN → CLOSED: on first successful probe call
      HALF_OPEN → OPEN: if probe call fails
    """

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None) -> None:
        self._name = name
        self._config = config or CircuitBreakerConfig()
        self._state = _State()
        self._lock = asyncio.Lock()

    async def call(self, fn: Callable[[], Any], *args: Any, **kwargs: Any) -> Any:
        """Execute fn through the circuit breaker. Raises if circuit is open."""
        async with self._lock:
            # Determine if we should allow the call based on current state
            if self._state.state == CircuitState.OPEN:
                if time.monotonic() - self._state.last_failure_time >= self._config.recovery_timeout:
                    self._state.state = CircuitState.HALF_OPEN
                    self._state.half_open_calls = 0
                    self._state.failure_count = 0
                else:
                    raise RuntimeError(
                        f"Circuit breaker '{self._name}' is OPEN — "
                        f"downstream service unavailable (failures={self._state.failure_count})"
                    )

            if self._state.state == CircuitState.HALF_OPEN:
                if self._state.half_open_calls >= self._config.half_open_max_calls:
                    raise RuntimeError(
                        f"Circuit breaker '{self._name}' HALF_OPEN probe already sent — "
                        "waiting for result"
                    )
                self._state.half_open_calls += 1

        # Execute the actual call outside the lock to avoid blocking other callers
        try:
            result = fn(*args, **kwargs)
            if asyncio.iscoroutine(result):
                result = await result

            # Success — reset state
            async with self._lock:
                self._state.failure_count = 0
                self._state.state = CircuitState.CLOSED
            return result

        except Exception as exc:
            async with self._lock:
                self._state.failure_count += 1
                self._state.last_failure_time = time.monotonic()

                if (
                    self._state.state == CircuitState.HALF_OPEN
                    or self._state.failure_count >= self._config.failure_threshold
                ):
                    self._state.state = CircuitState.OPEN
                    raise RuntimeError(
                        f"Circuit breaker '{self._name}' opened after "
                        f"{self._state.failure_count} failures: {exc}"
                    ) from exc
            raise

    def get_state(self) -> dict:
        """Return current state for monitoring / health checks."""
        return {
            "circuit": self._name,
            "state": self._state.state.value,
            "failure_count": self._state.failure_count,
            "last_failure_age_sec": round(
                time.monotonic() - self._state.last_failure_time, 1
            ),
        }


# --- Retry with exponential backoff and jitter ---

async def retry_with_backoff(
    fn: Callable[[], Any],
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
) -> Any:
    """Retry a function with exponential backoff + jitter.

    Delay formula: min(base_delay * 2^attempt, max_delay), then add random jitter
    (±50% of the delay) to prevent thundering herd when all clients retry simultaneously.
    """
    last_exc = None

    for attempt in range(max_retries):
        try:
            result = fn()
            if asyncio.iscoroutine(result):
                result = await result
            return result  # Success — return immediately (fail fast)
        except Exception as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                delay = min(base_delay * (2 ** attempt), max_delay)
                jitter = random.uniform(-delay * 0.5, delay * 0.5)
                actual_delay = max(0.1, delay + jitter)
                await asyncio.sleep(actual_delay)

    raise last_exc


# Usage example
async def call_external_api():
    cb = CircuitBreaker("payment-service", CircuitBreakerConfig(
        failure_threshold=3, recovery_timeout=15.0
    ))

    async def _do_payment(amount: float) -> dict:
        import httpx  # type: ignore[import-not-found]
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://payment.example.com/charge",
                json={"amount": amount},
            )
            resp.raise_for_status()
            return resp.json()

    # Circuit breaker wraps the call — if payment-service fails 3 times,
    # subsequent calls fail immediately without waiting for timeout
    result = await cb.call(_do_payment, amount=49.99)
    return result
```

### Pattern 4: Idempotency Key Enforcement

Ensures that duplicate requests (from retries or client re-submissions) produce the same result rather than causing side effects like double charges.

```python
import hashlib
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class IdempotencyRecord:
    """Stored in a backing store (Redis, database) for active idempotency keys."""
    key_hash: str           # SHA-256 of the idempotency key for security
    request_body: str       # Hash or reference to stored request body
    response_body: str      # Cached response from first successful execution
    created_at: float       # Unix timestamp
    expires_at: float       # When this record should be garbage collected


class IdempotencyStore:
    """Backend-agnostic idempotency store interface.

    Implementations: Redis (SET NX EX), Database (unique constraint + TTL index),
    or in-memory dict for testing. The pattern is always the same:
    1. If key exists → return cached response
    2. If key doesn't exist → execute, cache result, return
    """

    async def get(self, key_hash: str) -> Optional[IdempotencyRecord]:
        raise NotImplementedError

    async def set(self, record: IdempotencyRecord) -> None:
        raise NotImplementedError


# Example in-memory implementation for testing / demonstration
class InMemoryIdempotencyStore(IdempotencyStore):
    """Simple dict-backed store with TTL expiry. Not suitable for production."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._store: dict[str, IdempotencyRecord] = {}
        self._ttl = ttl_seconds

    async def get(self, key_hash: str) -> Optional[IdempotencyStore]:
        record = self._store.get(key_hash)
        if record is None or time.time() > record.expires_at:
            return None
        return record

    async def set(self, record: IdempotencyRecord) -> None:
        self._store[record.key_hash] = record


def hash_idempotency_key(key: str) -> str:
    """Hash the idempotency key — never store raw keys in your database."""
    return hashlib.sha256(key.encode()).hexdigest()


# --- Request handler with idempotency check ---

async def handle_order_request(
    order_data: dict,
    idempotency_key: str | None,
    store: IdempotencyStore,
) -> dict:
    """Process an order with full idempotency protection.

    If the same key arrives twice (due to client retry), return the original
    response without re-processing — preventing duplicate charges or orders.

    Raises ValueError if no idempotency key is provided.
    """
    if not idempotency_key:
        raise ValueError(
            "Missing required header: X-Idempotency-Key. "
            "Required to ensure request idempotency for retry safety."
        )

    key_hash = hash_idempotency_key(idempotency_key)

    # Fast path: check if we already processed this request
    cached = await store.get(key_hash)
    if cached is not None:
        return {"status": "already_processed", "original_response": cached.response_body}

    # Execute the actual business logic
    # ... (order creation, payment processing, etc.) ...
    result = {"status": "created", "order_id": f"ORD-{hash(key_hash)[:8]}"}

    # Cache the response for future duplicate requests
    await store.set(IdempotencyRecord(
        key_hash=key_hash,
        request_body=str(order_data),
        response_body=str(result),
        created_at=time.time(),
        expires_at=time.time() + 3600,  # 1 hour TTL
    ))

    return result
```

---

## Constraints

### MUST DO
- Always include an idempotency key on HTTP operations that may be retried (POST with `X-Idempotency-Key`, or use PUT for idempotent resources)
- Configure circuit breaker on every external service call, never rely on timeouts alone
- Use exponential backoff with random jitter — never fixed delay retries (causes thundering herd)
- Design sagas so that every forward step has a compensating action that can run independently
- Route poisoned messages to dead-letter queues after N failed attempts; never retry indefinitely
- Log all integration failures with correlation ID, service names, and failure reason for distributed tracing

### MUST NOT DO
- Call external services synchronously in a chain without circuit breakers (cascading failure risk)
- Use string comparison on idempotency keys — always hash them before storing
- Implement saga compensation as nested try/finally inside the execute step (compensation must be independent and testable)
- Skip idempotency for non-GET HTTP operations — clients will retry, servers must handle duplicates
- Put business logic inside adapters — adapters translate, they don't implement domain behavior
- Use fixed retry delays of less than 1 second or more than 60 seconds

---

## Output Template

When implementing or reviewing an integration pattern, produce:

1. **Integration Style Selection** — Which pattern (REST, gRPC, events, saga) and why, with trade-off analysis
2. **Architecture Diagram** — ASCII art showing services, data flow, and failure boundaries
3. **Implementation Code** — Complete, typed Python functions/classes matching the selected patterns
4. **Resilience Configuration** — Circuit breaker thresholds, retry settings, DLQ routing rules
5. **Idempotency Strategy** — How duplicate requests are detected and handled

---

## Related Skills

| Skill | Purpose |
|---|---|
| `anti-corruption-layer` | Design ACLs to isolate domain models when integrating with incompatible external systems |
| `event-driven-patterns` | Deep dive into event sourcing, CQRS, and event stream processing patterns |
| `rest-api-patterns` | REST API design best practices for the services you're connecting |
| `microservice-resilience-patterns` | Advanced resilience strategies including bulkheads, rate limiting, and graceful degradation |
