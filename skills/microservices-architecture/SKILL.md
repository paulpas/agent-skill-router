---
name: microservices-architecture
description: Implements microservices architecture patterns including domain-driven service decomposition, inter-service communication protocols, Saga pattern for distributed transactions, circuit breaker resilience, and API gateway routing for independently deployable services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: microservices, service decomposition, bounded context, saga pattern, circuit breaker, api gateway, service discovery, distributed tracing, gRPC, inter-service communication, choreography orchestration, bulkhead pattern
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
  response_profile:
    verbosity: medium
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
  related-skills: event-driven-architecture, monolith-strangler-pattern, ddd-context-mapping, api-design
---

# Microservices Architecture Implementation

Senior software architect designing independently deployable service boundaries with resilient inter-service communication, distributed transaction management via Saga patterns, and gateway-based API routing. This skill makes the model think in terms of bounded contexts, failure domains, and operational independence rather than code organization alone.

## TL;DR Checklist

- [ ] Define bounded contexts using domain language before writing any infrastructure
- [ ] Select sync (gRPC/REST) or async (messaging) based on data consistency requirements
- [ ] Implement Saga orchestration for cross-service transactions requiring rollback capability
- [ ] Deploy circuit breaker with CLOSED/OPEN/HALF_OPEN states and configurable thresholds on every inter-service call
- [ ] Configure API gateway with route matching, request transformation, and response aggregation
- [ ] Add distributed tracing (trace_id propagation) across all service boundaries

---

## When to Use

Use this skill when:

- Architecting greenfield microservices where bounded contexts must be identified from domain language
- Decomposing a monolithic application by extracting independent domains into separate services
- Designing high-scale systems requiring read/write separation with independently scalable tiers
- Coordinating distributed transactions across multiple services that each own their data store
- Building an API gateway to unify internal service APIs behind a single external interface
- Implementing resilience patterns (circuit breaker, bulkhead, retry) for service-to-service communication

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with <10k daily active users — a monolith or modular application is faster and cheaper
- Teams smaller than 5 developers who cannot support the operational overhead of distributed systems
- Latency-critical single-domain applications where network hops between services introduce unacceptable overhead
- Projects with no clear domain boundary separation — if all data belongs to one aggregate root, microservices add cost without benefit

---

## Core Workflow

1. **Analyze Domain Boundaries** — Conduct a ubiquitous language exercise with domain experts. Map every entity to its natural home and identify aggregation roots. Identify bounded contexts where invariants are maintained independently.
   **Checkpoint:** Each identified context must be able to define its own schema, business rules, and data lifecycle without coordinating with other teams. If two contexts constantly need each other's internal state, they may belong to the same context.

2. **Decompose Services** — For each bounded context, create an independent service unit. Define the public API surface (gRPC proto or OpenAPI spec) before implementation. Each service owns exactly one database schema — no shared databases across services.
   **Checkpoint:** Verify that the service interface only exposes operations required by consumers, not internal state. The API should reflect the consumer's use case, not the service's data model.

3. **Select Communication Protocol** — Match protocol to consistency and latency needs:
   - Sync gRPC for low-latency request/response with strong typing (same-data-center services)
   - Sync REST/HTTP for external APIs and cross-language integration
   - Async messaging (Kafka, RabbitMQ) for eventual consistency, event-driven workflows, and fan-out scenarios
   **Checkpoint:** Every sync call needs a circuit breaker. Every async message has a schema contract and idempotency guarantee.

4. **Design Saga Transactions** — For any business operation spanning multiple services with local data persistence, implement the Saga pattern. Choose choreography (event-driven, decentralized) for simple flows or orchestration (coordinator-based) for complex workflows with conditional branching.
   **Checkpoint:** Every forward action must have a corresponding compensating action that can undo it safely without breaking invariants in either service.

5. **Implement Resilience Patterns** — Add circuit breaker, bulkhead isolation, and retry with exponential backoff to every inter-service communication path. Configure timeouts at the client level (not server) so failures fail fast.
   **Checkpoint:** Circuit breaker state transitions must be logged. OPEN state must include a configurable half-open probe interval. Every timeout must have a fallback strategy (cached data, default value, or error).

6. **Deploy Gateway and Observability** — Implement an API gateway that handles cross-cutting concerns: authentication, rate limiting, request transformation, response aggregation, and routing to the correct service based on path matching and feature flags. Deploy distributed tracing with trace_id propagated through every hop.
   **Checkpoint:** Every request entering the gateway must receive a unique trace_id. All downstream services must include that trace_id in their log statements and span annotations.

---

## Implementation Patterns

### Pattern 1: Service Decomposition Using Bounded Contexts

Proper bounded context separation prevents distributed monoliths. Each service owns its domain entities, repositories, and application logic independently. Below is a Python module structure for an OrderService bounded context in e-commerce.

```python
# orders/context.py — Bounded context root defining the unified language
from __future__ import annotations


class OrderContext:
    """Root of the Order bounded context.
    
    Encapsulates all domain language, invariants, and operations
    that belong exclusively to order management. This module
    is the single source of truth for what "order" means here.
    """

    class State:
        PENDING = "pending"
        CONFIRMED = "confirmed"
        PAID = "paid"
        SHIPPED = "shipped"
        CANCELLED = "cancelled"

    VALID_TRANSITIONS: dict[str, set[str]] = {
        State.PENDING: {State.CONFIRMED, State.CANCELLED},
        State.CONFIRMED: {State.PAID, State.CANCELLED},
        State.PAID: {State.SHIPPED, State.CANCELLED},
        State.SHIPPED: set(),  # terminal — no transitions allowed
        State.CANCELLED: set(),  # terminal
    }


# orders/domain.py — Domain entities with invariants enforced at construction
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List


class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class Money:
    """Immutable value object — money is never nullable or negative."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

    def subtract(self, other: Money) -> Money:
        if self.currency != other.currency:
            raise ValueError("Cannot subtract different currencies")
        return Money(round(self.amount - other.amount, 2), self.currency)


@dataclass
class OrderItem:
    product_id: str
    quantity: int
    unit_price: Money

    @property
    def total(self) -> Money:
        return Money(
            round(self.unit_price.amount * self.quantity, 2),
            self.unit_price.currency,
        )

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("Order item quantity must be at least 1")


@dataclass
class Order:
    order_id: str
    customer_id: str
    items: List[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def grand_total(self) -> Money:
        if not self.items:
            return Money(0.0)
        total_amount = sum(item.total.amount for item in self.items)
        return Money(round(total_amount, 2), self.items[0].unit_price.currency)

    def transition_to(self, new_status: OrderStatus) -> None:
        """Transition order state — enforces bounded context invariant."""
        valid_next = {s.value for s in OrderContext.VALID_TRANSITIONS.get(
            self.status, set()
        )}
        if new_status.value not in valid_next:
            raise ValueError(
                f"Cannot transition from {self.status.value} to {new_status.value}"
            )
        self.status = new_status

    def add_item(self, item: OrderItem) -> None:
        """Add item only while order is still pending."""
        if self.status != OrderStatus.PENDING:
            raise ValueError("Cannot modify items after order confirmation")
        self.items.append(item)


# orders/application.py — Application service (orchestrates use cases, no business logic)
from __future__ import annotations

from typing import Protocol


class OrderRepository(Protocol):
    async def save(self, order: Order) -> None: ...
    async def get_by_id(self, order_id: str) -> Order | None: ...
    async def list_by_customer(self, customer_id: str) -> list[Order]: ...


class OrderService:
    """Application service — coordinates use cases using domain objects.
    
    This layer contains no business rules. It reads from the repository,
    calls domain methods, and writes back. All validation happens in
    the domain model itself.
    """

    def __init__(self, repo: OrderRepository) -> None:
        self._repo = repo

    async def create_order(self, customer_id: str, items_data: list[dict]) -> Order:
        items = [
            OrderItem(
                product_id=data["product_id"],
                quantity=data["quantity"],
                unit_price=Money(data["unit_price"], data.get("currency", "USD")),
            )
            for data in items_data
        ]
        order = Order(order_id=self._generate_id(), customer_id=customer_id, items=items)
        await self._repo.save(order)
        return order

    async def confirm_order(self, order_id: str) -> Order:
        order = await self._repo.get_by_id(order_id)
        if order is None:
            raise KeyError(f"Order {order_id} not found")
        order.transition_to(OrderStatus.CONFIRMED)
        await self._repo.save(order)
        return order

    def _generate_id(self) -> str:
        import uuid
        return f"ord-{uuid.uuid4().hex[:12]}"
```

### Pattern 2: Saga Orchestration

Orchestrator-based Sagas use a central coordinator to manage the sequence of service calls and their compensations. This pattern is ideal when workflows have conditional branching, require human approval steps, or need centralized monitoring.

```python
# saga/orchestrator.py — Centralized Saga orchestrator with compensation handling
from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, Protocol

logger = logging.getLogger(__name__)


class SagaStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


@dataclass
class StepResult:
    step_name: str
    success: bool
    data: dict[str, Any] = field(default_factory=dict)


class CompensationAction(Protocol):
    async def __call__(self, context: dict[str, Any], result: StepResult) -> None: ...


class SagaStep(ABC):
    """Base class for a Saga step with forward execution and compensation."""

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    async def execute(self, context: dict[str, Any]) -> StepResult: ...

    @abstractmethod
    async def compensate(self, context: dict[str, Any], result: StepResult) -> None: ...


class SagaOrchestrator:
    """Orchestrates a sequence of SagaSteps with automatic compensation on failure.
    
    Execution flow:
      1. Execute steps sequentially, collecting results
      2. On any step failure, reverse-iterate already-executed steps
      3. Call compensate() on each completed step in reverse order
      4. If compensation also fails, log and escalate — do not retry automatically
    
    This implements the "orchestration" variant of the Saga pattern (vs choreography).
    """

    def __init__(self, saga_id: str) -> None:
        self.saga_id = saga_id
        self._steps: list[SagaStep] = []
        self._results: dict[str, StepResult] = {}
        self.status = SagaStatus.RUNNING

    def add_step(self, step: SagaStep) -> "SagaOrchestrator":
        """Fluent builder for adding steps in execution order."""
        self._steps.append(step)
        return self

    async def execute(self) -> dict[str, Any]:
        """Run all steps forward. On first failure, compensate in reverse."""
        context: dict[str, Any] = {"saga_id": self.saga_id}

        for step in self._steps:
            try:
                result = await step.execute(context)
                self._results[step.name] = result

                if not result.success:
                    logger.error(
                        "Saga %s failed at step '%s'",
                        self.saga_id,
                        step.name,
                        extra=result.data,
                    )
                    await self._compensate(context)
                    return {"status": "failed", "failed_at": step.name}

            except Exception as exc:
                logger.exception(
                    "Saga %s crashed at step '%s': %s",
                    self.saga_id,
                    step.name,
                    exc,
                )
                await self._compensate(context)
                return {"status": "error", "failed_at": step.name, "error": str(exc)}

        self.status = SagaStatus.COMPLETED
        logger.info("Saga %s completed successfully", self.saga_id)
        return {"status": "completed", "results": {n: r.data for n, r in self._results.items()}}

    async def _compensate(self, context: dict[str, Any]) -> None:
        """Execute compensating actions for all completed steps, in reverse order."""
        self.status = SagaStatus.COMPENSATING
        reversed_steps = list(reversed(list(zip(self._steps, self._results.items()))))

        compensation_failures: list[str] = []

        for step, (step_name, result) in reversed_steps:
            try:
                await step.compensate(context, result)
                logger.info("Compensation successful for step '%s' in saga %s", step_name, self.saga_id)
            except Exception as exc:
                compensation_failures.append(step_name)
                logger.critical(
                    "COMPENSATION FAILURE at step '%s' in saga %s: %s",
                    step_name,
                    self.saga_id,
                    exc,
                    exc_info=True,
                )

        self.status = SagaStatus.FAILED if compensation_failures else SagaStatus.COMPENSATING
        if compensation_failures:
            raise RuntimeError(
                f"Saga {self.saga_id} failed with uncompensated steps: {compensation_failures}"
            )


# --- Concrete saga step example: Order creation across Inventory, Payment, and Shipping ---

class ReserveInventoryStep(SagaStep):
    """Reserves inventory items for an order. Compensation releases the reservation."""

    def __init__(self, inventory_client: Any) -> None:
        super().__init__("reserve_inventory")
        self._client = inventory_client

    async def execute(self, context: dict[str, Any]) -> StepResult:
        reservation_id = await self._client.reserve(context["items"])
        context["reservation_id"] = reservation_id
        return StepResult(self.name, True, {"reservation_id": reservation_id})

    async def compensate(self, context: dict[str, Any], result: StepResult) -> None:
        if "reservation_id" in context:
            await self._client.release(context["reservation_id"])
            logger.info("Released inventory reservation %s", context["reservation_id"])


class ProcessPaymentStep(SagaStep):
    """Charges customer's payment method. Compensation issues a refund."""

    def __init__(self, payment_gateway: Any) -> None:
        super().__init__("process_payment")
        self._gateway = payment_gateway

    async def execute(self, context: dict[str, Any]) -> StepResult:
        txn_id = await self._gateway.charge(
            customer_id=context["customer_id"],
            amount=context["total_amount"],
        )
        context["transaction_id"] = txn_id
        return StepResult(self.name, True, {"transaction_id": txn_id})

    async def compensate(self, context: dict[str, Any], result: StepResult) -> None:
        if "transaction_id" in context:
            await self._gateway.refund(context["transaction_id"])
            logger.info("Issued refund for transaction %s", context["transaction_id"])


class CreateShippingStep(SagaStep):
    """Creates a shipping label. Compensation cancels the shipment."""

    def __init__(self, shipping_provider: Any) -> None:
        super().__init__("create_shipping")
        self._provider = shipping_provider

    async def execute(self, context: dict[str, Any]) -> StepResult:
        shipment_id = await self._provider.create_shipment(
            order_id=context["order_id"],
            address=context["shipping_address"],
        )
        context["shipment_id"] = shipment_id
        return StepResult(self.name, True, {"shipment_id": shipment_id})

    async def compensate(self, context: dict[str, Any], result: StepResult) -> None:
        if "shipment_id" in context:
            await self._provider.cancel_shipment(context["shipment_id"])
            logger.info("Cancelled shipment %s", context["shipment_id"])


# Usage example (not an execution — shows composition):
# orchestrator = SagaOrchestrator(saga_id="ord-123")
# orchestrator.add_step(ReserveInventoryStep(inventory_client))
# orchestrator.add_step(ProcessPaymentStep(payment_gateway))
# orchestrator.add_step(CreateShippingStep(shipping_provider))
# result = await orchestrator.execute()
```

### Pattern 3: Circuit Breaker Pattern

A full circuit breaker with CLOSED (normal), OPEN (failing), and HALF_OPEN (testing recovery) states. Configurable failure thresholds, timeout windows, and fallback mechanisms prevent cascading failures across service boundaries.

```python
# resilience/circuit_breaker.py — Full implementation of the circuit breaker pattern
from __future__ import annotations

import enum
import logging
import time
import threading
from functools import wraps
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(enum.Enum):
    CLOSED = "closed"      # Normal — requests flow through
    OPEN = "open"          # Failing — requests are short-circuited
    HALF_OPEN = "half_open"  # Testing — one probe request allowed


class CircuitOpenError(Exception):
    """Raised when a call is rejected because the circuit is OPEN."""

    def __init__(self, service_name: str, last_failure_at: float) -> None:
        self.service_name = service_name
        self.last_failure_at = last_failure_at
        super().__init__(
            f"Circuit breaker OPEN for '{service_name}'. "
            f"Last failure at {last_failure_at}. Retry after cooldown."
        )


class CircuitBreaker:
    """Circuit breaker protecting inter-service calls.
    
    State machine:
      CLOSED → OPEN:     When failures >= threshold within the monitoring window
      OPEN → HALF_OPEN:  After the cooldown period elapses (probe request allowed)
      HALF_OPEN → CLOSED: If the probe succeeds (circuit closes, reset counters)
      HALF_OPEN → OPEN:  If the probe fails (re-open with extended cooldown)
    
    This prevents cascading failures by failing fast when downstream services
    are unhealthy, giving them time to recover without being hammered.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold_half_open: int = 3,
        cooldown_seconds: float = 30.0,
        extended_cooldown_seconds: float = 60.0,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold_half_open = success_threshold_half_open
        self.cooldown_seconds = cooldown_seconds
        self.extended_cooldown_seconds = extended_cooldown_seconds

        # Internal state
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count_half_open = 0
        self._last_failure_time: float = 0.0
        self._opened_at: float = 0.0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        """Read the current circuit state, transitioning OPEN → HALF_OPEN if cooldown passed."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - self._opened_at
                # Use extended cooldown after a failure during half-open
                if elapsed >= self.extended_cooldown_seconds:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count_half_open = 0
                    logger.info("Circuit '%s' transitioned to HALF_OPEN (extended cooldown)", self.name)
                elif elapsed >= self.cooldown_seconds:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count_half_open = 0
                    logger.info("Circuit '%s' transitioned to HALF_OPEN", self.name)
            return self._state

    def record_success(self) -> None:
        """Record a successful call — may close the circuit from HALF_OPEN."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count_half_open += 1
                if self._success_count_half_open >= self.success_threshold_half_open:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count_half_open = 0
                    logger.info("Circuit '%s' CLOSED after %d successful probes", self.name, self.success_threshold_half_open)

            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success to require consecutive failures
                self._failure_count = 0

    def record_failure(self) -> None:
        """Record a failed call — may trip the circuit from CLOSED or re-open from HALF_OPEN."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.monotonic()

            if self._state == CircuitState.HALF_OPEN:
                # Any failure during half-open sends us back to OPEN with extended cooldown
                self._state = CircuitState.OPEN
                self._opened_at = time.monotonic()
                logger.warning("Circuit '%s' re-OPENED after probe failure (extended cooldown)", self.name)

            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    self._opened_at = time.monotonic()
                    logger.warning(
                        "Circuit '%s' OPENED after %d consecutive failures",
                        self.name,
                        self.failure_threshold,
                    )

    def can_execute(self) -> bool:
        """Check if a call is allowed to proceed based on current circuit state."""
        current_state = self.state  # property getter may transition OPEN → HALF_OPEN
        if current_state == CircuitState.CLOSED:
            return True
        elif current_state == CircuitState.HALF_OPEN:
            return True  # Allow one probe through
        else:
            return False

    def wrap(self, fallback: Callable[..., Any] | None = None) -> Callable:
        """Decorator to wrap a function with circuit breaker protection."""
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> T:
                if not self.can_execute():
                    raise CircuitOpenError(self.name, self._last_failure_time)

                try:
                    result = func(*args, **kwargs)
                    self.record_success()
                    return result
                except Exception as exc:
                    self.record_failure()
                    if fallback:
                        logger.warning(
                            "Circuit '%s' fallback invoked for %s: %s",
                            self.name,
                            func.__name__,
                            exc,
                        )
                        return fallback(*args, **kwargs)  # type: ignore[no-any-return]
                    raise
            return wrapper
        return decorator


# --- Example with a REST call to an inventory service ---

class InventoryServiceClient:
    """HTTP client for the Inventory microservice with circuit breaker protection."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url
        self._breaker = CircuitBreaker(
            name="inventory-service",
            failure_threshold=5,
            success_threshold_half_open=3,
            cooldown_seconds=30.0,
            extended_cooldown_seconds=60.0,
        )

    @_breaker.wrap(fallback=lambda product_id: {"id": product_id, "available": False, "fallback": True})
    def check_availability(self, product_id: str) -> dict[str, Any]:
        """Check inventory availability for a product with circuit breaker protection."""
        import httpx

        response = httpx.get(
            f"{self._base_url}/inventory/{product_id}/availability",
            timeout=5.0,  # Short timeout — fail fast, don't block threads
        )
        response.raise_for_status()
        return response.json()

    @property
    def breaker(self) -> CircuitBreaker:
        """Expose the breaker for health checking and monitoring."""
        return self._breaker


# --- Bulkhead Pattern (isolation between different resource pools) ---

import concurrent.futures


class Bulkhead:
    """Bulkhead isolation — limits concurrent calls to prevent resource exhaustion.
    
    If all slots are occupied, callers wait up to `wait_timeout` seconds.
    If the timeout expires, a BulkheadFullError is raised immediately.
    """

    def __init__(self, max_concurrent: int = 10, wait_timeout: float = 5.0) -> None:
        self._semaphore = threading.Semaphore(max_concurrent)
        self._wait_timeout = wait_timeout
        self._executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_concurrent,
            thread_name_prefix="bulkhead",
        )

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute func within the bulkhead's concurrency limit."""
        acquired = self._semaphore.acquire(timeout=self._wait_timeout)
        if not acquired:
            raise BulkheadFullError(
                f"Bulkhead full — cannot acquire slot after {self._wait_timeout}s wait"
            )
        try:
            future = self._executor.submit(func, *args, **kwargs)
            return future.result()
        finally:
            self._semaphore.release()

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False)


class BulkheadFullError(Exception):
    pass
```

### Pattern 4: API Gateway with Starlette

A production-ready API gateway using Starlette that routes requests to backend services, handles request transformation, aggregates responses from multiple services, and applies cross-cutting concerns like auth, rate limiting, and tracing.

```python
# gateway/routing.py — API Gateway implementation
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Protocol

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

logger = logging.getLogger(__name__)


@dataclass
class RouteConfig:
    """Configuration for a single gateway route mapping."""
    path_pattern: str           # e.g., "/api/orders/{order_id}"
    service_name: str           # e.g., "order-service"
    upstream_path: str          # e.g., "/orders/{order_id}"
    timeout_seconds: float = 10.0
    requires_auth: bool = True
    rate_limit_rpm: int | None = None
    response_transform: Callable[[Response], Response] | None = None


@dataclass
class RequestContext:
    """Carries request context through the gateway pipeline."""
    request_id: str
    trace_id: str
    start_time: float = field(default_factory=time.monotonic)
    service_name: str = ""
    method: str = ""
    path: str = ""
    status_code: int = 200


class TracingMiddleware:
    """Middleware that generates and propagates trace_ids for distributed tracing."""

    def __init__(self, app: Callable) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive, send) -> None:
        request = Request(scope, receive)
        trace_id = request.headers.get("x-trace-id", uuid.uuid4().hex)
        request_id = request.headers.get("x-request-id", uuid.uuid4().hex)

        ctx = RequestContext(
            request_id=request_id,
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
        )

        async def enriched_send(message: dict[str, Any]) -> None:
            if message.get("type") == "http.response.start":
                headers = dict(message.get("headers", []))
                headers.extend([
                    (b"x-trace-id", trace_id.encode()),
                    (b"x-request-id", request_id.encode()),
                ])
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, enriched_send)
        finally:
            elapsed = time.monotonic() - ctx.start_time
            logger.info(
                "%s %s → %d (%.1fms) [trace=%s]",
                ctx.method, ctx.path, ctx.status_code,
                elapsed * 1000, trace_id,
            )


class GatewayRouter:
    """Routes incoming requests to backend services with path matching and transformation."""

    def __init__(self) -> None:
        self._routes: dict[str, RouteConfig] = {}

    def add_route(self, config: RouteConfig) -> None:
        """Register a route mapping."""
        self._routes[config.path_pattern] = config

    def match_route(self, path: str) -> RouteConfig | None:
        """Match request path to the most specific registered route pattern."""
        best_match: RouteConfig | None = None
        best_depth = -1

        for pattern, config in self._routes.items():
            if self._matches(pattern, path):
                depth = pattern.count("/")
                if depth > best_depth:
                    best_match = config
                    best_depth = depth

        return best_match

    def _matches(self, pattern: str, path: str) -> bool:
        """Simple parameterized route matching: /api/orders/{id} matches /api/orders/abc-123"""
        pattern_parts = pattern.strip("/").split("/")
        path_parts = path.strip("/").split("/")

        if len(pattern_parts) != len(path_parts):
            return False

        for p_part, path_part in zip(pattern_parts, path_parts):
            if p_part.startswith("{") and p_part.endswith("}"):
                continue  # Parameter segment matches anything
            if p_part != path_part:
                return False

        return True


# --- Gateway application with Starlette ---

from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
import httpx


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter using a token bucket algorithm."""

    def __init__(self, app: Starlette, default_rpm: int = 60) -> None:
        super().__init__(app)
        self._default_rpm = default_rpm
        self._buckets: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.monotonic()
        window_start = current_time - 60.0  # 1-minute sliding window

        if client_ip not in self._buckets:
            self._buckets[client_ip] = []

        # Remove expired timestamps
        self._buckets[client_ip] = [
            ts for ts in self._buckets[client_ip] if ts > window_start
        ]

        if len(self._buckets[client_ip]) >= self._default_rpm:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "retry_after": 60},
            )

        self._buckets[client_ip].append(current_time)
        return await call_next(request)


class AuthMiddleware(BaseHTTPMiddleware):
    """Validates JWT tokens from an auth service before forwarding requests."""

    def __init__(self, app: Starlette, auth_service_url: str) -> None:
        super().__init__(app)
        self._auth_url = auth_service_url

    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.headers.get("authorization"):
            return JSONResponse(status_code=401, content={"error": "Missing authorization header"})

        token = request.headers["authorization"].removeprefix("Bearer ")
        # Validate against auth service
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                resp = await client.post(
                    f"{self._auth_url}/validate",
                    json={"token": token},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code != 200:
                    return JSONResponse(status_code=403, content={"error": "Invalid or expired token"})
            except httpx.TimeoutException:
                # Fail open during auth service outage — log and allow through with caution
                logger.critical("Auth service unreachable — failing open for %s %s", request.method, request.url.path)

        return await call_next(request)


class AggregationMiddleware(BaseHTTPMiddleware):
    """Aggregates responses from multiple backend services into a single response."""

    def __init__(self, app: Starlette, routes: GatewayRouter) -> None:
        super().__init__(app)
        self._routes = routes

    async def dispatch(self, request: Request, call_next) -> Response:
        route_config = self._routes.match_route(request.url.path)
        if route_config and "profile" in request.url.path:
            # Aggregate user + order data from multiple services
            async with httpx.AsyncClient(timeout=route_config.timeout_seconds) as client:
                tasks = [
                    client.get(f"{request.base_url}/api/orders/{path_params['order_id']}",
                               headers=dict(request.headers))
                    for path_params in self._extract_path_params(request.url.path, route_config.path_pattern)
                ]
                if tasks:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    aggregated = [r.json() if isinstance(r, Response) else None for r in results]
                    return JSONResponse(content={"aggregated": aggregated})

        return await call_next(request)


# --- Gateway application factory ---

def create_gateway_app(routes: list[RouteConfig]) -> Starlette:
    """Factory to build the complete gateway application with middleware stack."""
    router = GatewayRouter()
    for route in routes:
        router.add_route(route)

    app = Starlette(
        middleware=[
            Middleware(TracingMiddleware),
            Middleware(RateLimitMiddleware, default_rpm=100),
            Middleware(AuthMiddleware, auth_service_url="http://auth-service.internal"),
            Middleware(AggregationMiddleware, routes=router),
        ],
        routes=[
            Route(
                "/{path:path}",
                endpoint=lambda request: _proxy_to_service(request, router),
                methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
            ),
        ],
    )

    return app


async def _proxy_to_service(request: Request, routes: GatewayRouter) -> Response:
    """Core proxy function — matches route and forwards to upstream service."""
    import httpx

    route_config = routes.match_route(request.url.path)
    if route_config is None:
        return JSONResponse(status_code=404, content={"error": "Route not found"})

    # Build upstream URL — in production this comes from service discovery
    upstream_url = f"http://{route_config.service_name}.internal{route_config.upstream_path}"

    # Transform request body if needed
    body = await request.body()

    async with httpx.AsyncClient(timeout=route_config.timeout_seconds) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=upstream_url,
                content=body,
                headers=dict(request.headers),
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=dict(resp.headers),
            )
        except httpx.TimeoutException:
            logger.error("Gateway timeout for %s → %s", request.url.path, upstream_url)
            return JSONResponse(
                status_code=504,
                content={"error": "Gateway timeout", "service": route_config.service_name},
            )
        except httpx.ConnectError:
            logger.error("Service unavailable: %s", route_config.service_name)
            return JSONResponse(
                status_code=502,
                content={"error": "Bad gateway", "service": route_config.service_name},
            )


def _extract_path_params(path: str, pattern: str) -> list[dict[str, str]]:
    """Extract path parameters from a matched URL against its pattern."""
    return [{"path_param": p} for p in path.strip("/").split("/") if not p.startswith("{")]
```

---

## Constraints

### MUST DO
- Enforce bounded context boundaries — no cross-context domain logic, only through well-defined APIs
- Always implement a circuit breaker on every inter-service synchronous call; never trust downstream availability
- Use correlation IDs and trace_ids in request headers for distributed tracing from gateway to leaf service
- Design all async messages with idempotency keys to handle duplicate delivery
- Keep each service's database private — no shared databases, no cross-service direct DB queries
- Implement health check endpoints on every service; configure the orchestrator to query them before routing traffic
- Set short client-side timeouts (2–5 seconds) for inter-service calls to fail fast

### MUST NOT DO
- Share a single database between microservices — this couples deployment and creates a distributed monolith
- Use synchronous calls for everything — prefer async messaging when eventual consistency is acceptable
- Call more than 3 services in a single synchronous request chain — this amplifies latency (N+1 problem)
- Implement the Saga pattern with only forward actions — every transaction must have compensating actions
- Disable or bypass circuit breakers "for debugging" in production — this is how outages cascade
- Expose internal service discovery URLs to clients — all external traffic flows through the API gateway
- Use magic numbers for circuit breaker thresholds without load-testing justification

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-architecture` | Async messaging and event streaming to complement sync inter-service communication |
| `monolith-strangler-pattern` | Incrementally decompose an existing monolith using the strangler fig pattern |
| `ddd-context-mapping` | Domain-Driven Design techniques for identifying bounded contexts before service decomposition |
| `api-design` | REST/gRPC API design principles for service interfaces exposed through the gateway |

---

## Live References

> Authoritative documentation links for microservices architecture patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Microservices.io — Patterns Reference](https://microservices.io/patterns/index.html)
- [Martin Fowler — Microservices Pattern Catalog](https://martinfowler.com/articles/microservices.html)
- [Chris Richardson — Microservices Pattern Saga Tutorial](https://microservices.io/patterns/data/saga.html)
- [Microsoft Azure — Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Google Cloud — API Gateway Best Practices](https://cloud.google.com/api-gateway/docs)
- [OpenTelemetry — Distributed Tracing Documentation](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Netflix Hystrix — Circuit Breaker Library (Archival Reference)](https://github.com/Netflix/Hystrix)
