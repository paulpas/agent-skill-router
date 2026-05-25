---
name: microservices-architecture
description: Implements microservices architecture patterns (bounded contexts, API
  gateway, event-driven communication, saga orchestration) for decomposing monolithic
  applications into scalable, independent services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: microservices architecture, service decomposition, bounded context, how
    do i split a monolith, inter-service communication, event-driven messaging, API
    gateway, saga pattern
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
  related-skills: coding-monolith-refactoring, coding-domain-driven-design, cncf-kubernetes-deployment,
    coding-event-driven-architecture
------
# Microservices Architecture Implementation

Senior software architect decomposing monolithic applications into independently deployable microservices using domain-driven design, bounded context mapping, and event-driven communication patterns. Applies SOLID and DRY principles to ensure each service owns a single business capability with clear contractual boundaries.

## TL;DR Checklist

- [ ] Map bounded contexts using event storming or domain story workshops before writing code
- [ ] Define strict API contracts (OpenAPI/schemas) between services — no shared database models
- [ ] Choose sync REST for request-response queries and async events for domain changes
- [ ] Implement circuit breakers and retry policies on every inter-service call
- [ ] Use saga orchestration or choreography for cross-service transactions, never distributed locks

---

## When to Use

Use this skill when:

- Decomposing a monolithic application into independently deployable services with bounded contexts
- Designing inter-service communication strategies (REST, gRPC, event messaging) for a new distributed system
- Implementing an API gateway to consolidate service endpoints and handle cross-cutting concerns (auth, rate limiting, routing)
- Resolving distributed transaction requirements using saga patterns (orchestration or choreography)
- Establishing service boundaries and ownership models using domain-driven design

---

## When NOT to Use

Avoid microservices for:

- **Small teams shipping MVPs** — a well-structured monolith scales better initially; add decomposition only when team size, deployment frequency, or scaling needs justify the operational overhead (use `coding-monolith-refactoring` instead)
- **Simple CRUD applications** — if the system is primarily data entry with basic retrieval logic, the network latency and consistency costs of microservices outweigh any benefits
- **Single bounded context with no domain complexity** — if the entire application maps to one cohesive domain concept (e.g., a simple blog CMS), extracting services creates unnecessary coupling without business value

---

## Core Workflow

1. **Identify Bounded Contexts via Domain-Driven Design** — Conduct event storming sessions with domain experts to identify aggregate roots, entities, value objects, and contextual boundaries. Each bounded context becomes a candidate service.
   **Checkpoint:** Every identified context must have a clear owner team, well-defined ubiquitous language, and no ambiguous shared responsibilities across contexts.

2. **Define Service Boundaries & Contracts** — For each bounded context, define the service's public API using OpenAPI 3.0 or Protocol Buffers. Specify request/response schemas, error codes, and versioning strategy. Establish anti-corruption layers where legacy or third-party domains intersect.
   **Checkpoint:** No two services should share a database. Database-per-service is non-negotiable — each service owns its data store exclusively.

3. **Choose Communication Style (Sync vs Async)** — Evaluate each inter-service interaction:
   - Use synchronous REST/gRPC for request-response queries where the caller needs an immediate result
   - Use asynchronous event messaging for domain events and side effects where eventual consistency is acceptable
   - Document every communication decision with rationale in the architecture decision record (ADR)
   **Checkpoint:** Map out all inter-service calls. Services should communicate through contracts, not direct references to internal implementations.

4. **Implement API Gateway Patterns** — Deploy a gateway (Kong, AWS API Gateway, or custom) that handles authentication, rate limiting, request routing, response aggregation, and SSL termination. The gateway hides service topology from clients and provides a single entry point.
   **Checkpoint:** The gateway must not contain business logic. It is a traffic cop, not a decision maker. Delegate authN/authZ to dedicated identity services.

5. **Handle Distributed Transactions with Sagas** — For operations spanning multiple services, implement either saga orchestration (central coordinator) or choreography (event-driven). Each saga step must have a compensating action for rollback. Use an outbox pattern to reliably publish domain events after database commits.
   **Checkpoint:** Every saga step is idempotent and has a defined compensation path. There are no distributed locks — only optimistic concurrency and retries.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Bounded Context Mapping & Service Boundary Definition

Use domain-driven design to establish clear service boundaries. The key insight from DDD is that each bounded context has its own ubiquitous language, model, and data store. Services should be organized around business capabilities, not technical layers.

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class BoundedContext(Enum):
    """Enumerates all bounded contexts in the domain model."""
    ORDER = "order"
    INVENTORY = "inventory"
    PAYMENT = "payment"
    SHIPPING = "shipping"
    NOTIFICATION = "notification"


@dataclass(frozen=True)
class DomainEvent:
    """Base domain event shared across all bounded contexts.

    Immutable to prevent accidental mutation after emission.
    Each event carries a unique correlation ID for tracing distributed transactions.
    """
    event_type: str
    aggregate_id: str
    occurred_at: str  # ISO-8601 timestamp
    correlation_id: str
    version: int = 1


@dataclass(frozen=True)
class OrderPlaced(DomainEvent):
    """Domain event emitted when an order is successfully placed.

    Carries only the data that downstream contexts need — nothing more.
    This prevents coupling between the Order and Inventory context internals.
    """
    aggregate_id: str
    customer_id: str
    items: list[dict]  # [{item_id, quantity, price}]
    total_amount: float
    currency: str


# ❌ BAD: Shared database models create tight coupling across contexts
class SharedDatabaseModel:
    """Shared ORM model — both Order and Inventory context access the same tables.

    This creates a distributed monolith: changes in one service silently break another.
    Violates the single responsibility principle and makes independent deployment impossible.
    """
    __shared_table__ = "orders"  # Both services read/write this table

    def create_order(self, **kwargs):
        # Order context writes here
        pass

    def check_inventory_for_order(self, order_id: str) -> int:
        # Inventory context reads the same table — tight coupling
        pass


# ✅ GOOD: Each bounded context owns its own model and communicates via domain events
class OrderContext:
    """Order bounded context — owns the order lifecycle exclusively.

    Emits domain events when significant state transitions occur.
    Never queries another service's database directly.
    """

    def __init__(self, event_publisher: "EventPublisher") -> None:
        self._publisher = event_publisher

    def place_order(
        self,
        order_id: str,
        customer_id: str,
        items: list[dict],
        total_amount: float,
        currency: str = "USD",
    ) -> OrderPlaced:
        """Persist the order and emit a domain event for downstream processing.

        The order is committed to the Order context's database first.
        Then the event is published — never the other way around (outbox pattern).
        """
        # Guard clause — validate inputs before any persistence
        if not order_id or not customer_id:
            raise ValueError("order_id and customer_id are required")
        if total_amount <= 0:
            raise ValueError(f"total_amount must be positive, got {total_amount}")
        if not items:
            raise ValueError("Order must contain at least one item")

        # Persist order to Order context's own database
        self._persist_order(order_id, customer_id, items, total_amount, currency)

        # Emit domain event — other contexts react independently
        event = OrderPlaced(
            event_type="ORDER_PLACED",
            aggregate_id=order_id,
            occurred_at="2025-06-15T10:30:00Z",
            correlation_id=f"corr-{order_id}",
            customer_id=customer_id,
            items=items,
            total_amount=total_amount,
            currency=currency,
        )
        self._publisher.publish(event)
        return event

    def _persist_order(
        self,
        order_id: str,
        customer_id: str,
        items: list[dict],
        total_amount: float,
        currency: str,
    ) -> None:
        """Persist order to Order context's own database.

        In production this would use SQLAlchemy or an ORM with transaction boundaries.
        """
        raise NotImplementedError("Implement against your chosen database")


class InventoryContext:
    """Inventory bounded context — owns stock levels exclusively.

    Reacts to ORDER_PLACED events by decrementing available stock.
    Does not receive direct API calls from Order context for this operation.
    """

    def __init__(self, event_bus: "EventBus") -> None:
        self._bus = event_bus
        # Register subscriber — decoupled from OrderContext directly
        event_bus.subscribe("ORDER_PLACED", self._handle_order_placed)

    def _handle_order_placed(self, event: OrderPlaced) -> None:
        """Handle the ORDER_PLACED domain event and reserve inventory.

        Each handler is idempotent — if the same event arrives twice,
        the system remains consistent.
        """
        for item in event.items:
            reserved = self._reserve_stock(item["item_id"], item["quantity"])
            if not reserved:
                # Emit compensating event — trigger order cancellation saga step
                raise InventoryInsufficientError(
                    f"Insufficient stock for item {item['item_id']}"
                )

    def _reserve_stock(self, item_id: str, quantity: int) -> bool:
        """Reserve stock in the Inventory context's own database.

        Uses optimistic concurrency control to prevent overselling.
        """
        raise NotImplementedError("Implement against your chosen database")


class InventoryInsufficientError(RuntimeError):
    """Raised when inventory cannot fulfill a demand event."""
    pass
```

### Pattern 2: Inter-Service Communication (Synchronous REST vs Asynchronous Event Messaging)

Choosing the right communication style is critical. Synchronous calls (REST/gRPC) are appropriate when the caller needs an immediate answer. Asynchronous events are better for side effects, notifications, and eventual consistency scenarios. Misusing sync calls creates cascading failure chains; misusing events leads to data inconsistency surprises.

```python
import time
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ─── Synchronous REST Communication (Request-Response) ──────────────────────


class HTTPStatus(Enum):
    """Standardized inter-service HTTP status codes."""
    SUCCESS = 200
    NOT_FOUND = 404
    SERVICE_UNAVAILABLE = 503
    GATEWAY_TIMEOUT = 504


@dataclass
class ServiceResponse:
    """Standard response wrapper for all inter-service REST calls.

    Provides a consistent envelope so consumers don't need to parse
    raw HTTP responses differently across services.
    """
    status: HTTPStatus
    data: Optional[dict] = None
    error_code: Optional[str] = None
    retry_after_seconds: Optional[int] = None


class CircuitBreakerError(Exception):
    """Raised when the circuit breaker is open and requests are short-circuited."""
    pass


class CircuitBreaker:
    """Circuit breaker pattern to prevent cascading failures.

    State machine: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (testing recovery).
    When a service is unhealthy, this breaks the sync chain before it spreads.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 1,
    ) -> None:
        self._failure_count = 0
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._half_open_max_calls = half_open_max_calls
        self._last_failure_time: Optional[float] = None
        self._state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._half_open_calls = 0

    @property
    def state(self) -> str:
        """Return current state, transitioning to HALF_OPEN if recovery timeout elapsed."""
        if self._state == "OPEN" and self._last_failure_time is not None:
            elapsed = time.time() - self._last_failure_time
            if elapsed >= self._recovery_timeout:
                self._state = "HALF_OPEN"
                self._half_open_calls = 0
        return self._state

    def record_success(self) -> None:
        """Record a successful call — resets the breaker."""
        self._failure_count = 0
        self._state = "CLOSED"
        self._half_open_calls = 0

    def record_failure(self) -> None:
        """Record a failed call — may transition to OPEN state."""
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._state == "HALF_OPEN":
            self._state = "OPEN"
        elif self._failure_count >= self._failure_threshold:
            self._state = "OPEN"

    def allow_request(self) -> bool:
        """Check if a request should be allowed through the circuit."""
        current_state = self.state  # Triggers state transition check

        if current_state == "CLOSED":
            return True
        elif current_state == "HALF_OPEN":
            if self._half_open_calls < self._half_open_max_calls:
                self._half_open_calls += 1
                return True
            return False
        else:  # OPEN
            raise CircuitBreakerError(
                f"Circuit is OPEN (failures={self._failure_count}). "
                f"Retry after {self._recovery_timeout}s"
            )


@dataclass
class RetryConfig:
    """Configuration for exponential backoff retry with jitter."""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    jitter: bool = True

    def get_delay(self, attempt: int) -> float:
        """Calculate delay for the given attempt number using exponential backoff + jitter."""
        import random
        delay = min(self.base_delay * (2 ** attempt), self.max_delay)
        if self.jitter:
            delay *= random.uniform(0.5, 1.0)
        return delay


class SyncServiceClient:
    """Synchronous REST client for inter-service communication.

    Wraps HTTP calls with circuit breaking, retries, and standardized error handling.
    Use this for request-response patterns where the caller needs an immediate result.
    """

    def __init__(
        self,
        base_url: str,
        service_name: str,
        circuit_breaker: Optional[CircuitBreaker] = None,
        retry_config: Optional[RetryConfig] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_name = service_name
        self._breaker = circuit_breaker or CircuitBreaker()
        self._retry = retry_config or RetryConfig()

    def get_inventory(self, item_id: str) -> ServiceResponse:
        """Fetch inventory details for a specific item via REST.

        Demonstrates the full sync communication pattern with all
        resilience patterns applied (circuit breaker + retries).
        """
        # Circuit breaker check — short-circuits if service is unhealthy
        if not self._breaker.allow_request():
            return ServiceResponse(
                status=HTTPStatus.SERVICE_UNAVAILABLE,
                error_code="CIRCUIT_OPEN",
                retry_after_seconds=int(self._breaker._recovery_timeout),
            )

        url = f"{self._base_url}/api/v1/inventory/{item_id}"

        for attempt in range(self._retry.max_retries + 1):
            try:
                # In production, use httpx or aiohttp here
                raise NotImplementedError(f"HTTP GET to {url}")

            except ConnectionError as exc:
                self._breaker.record_failure()
                if attempt < self._retry.max_retries:
                    delay = self._retry.get_delay(attempt)
                    time.sleep(delay)
                    continue
                return ServiceResponse(
                    status=HTTPStatus.SERVICE_UNAVAILABLE,
                    error_code="CONNECTION_FAILED",
                )

            except TimeoutError as exc:
                self._breaker.record_failure()
                if attempt < self._retry.max_retries:
                    delay = self._retry.get_delay(attempt)
                    time.sleep(delay)
                    continue
                return ServiceResponse(
                    status=HTTPStatus.GATEWAY_TIMEOUT,
                    error_code="REQUEST_TIMEOUT",
                )

        # All retries exhausted but last attempt didn't raise — should not reach here
        # This path handles the case where HTTP returns a non-2xx status
        self._breaker.record_failure()
        return ServiceResponse(
            status=HTTPStatus.SERVICE_UNAVAILABLE,
            error_code="MAX_RETRIES_EXHAUSTED",
        )


# ─── Asynchronous Event Communication (Event Messaging) ──────────────────────


@dataclass
class MessageEnvelope:
    """Wraps a domain event with metadata for the message broker.

    Includes correlation_id for saga tracing, message_id for idempotency,
    and content_type so consumers know how to deserialize the payload.
    """
    event_type: str
    aggregate_id: str
    correlation_id: str
    message_id: str
    content_type: str = "application/json"
    timestamp: str = field(default_factory=lambda: "2025-06-15T10:30:00Z")
    payload: dict = field(default_factory=dict)


class EventBus(ABC):
    """Abstract event bus interface for inter-service messaging.

    Concrete implementations publish to Kafka, RabbitMQ, AWS SQS, etc.
    This abstraction decouples services from the specific messaging technology.
    """

    @abstractmethod
    def subscribe(self, event_type: str, handler) -> None:
        """Register a handler function for a specific event type."""
        ...

    @abstractmethod
    def publish(self, event: MessageEnvelope) -> None:
        """Publish an event to the message broker."""
        ...


# ❌ BAD: Tight coupling through direct synchronous calls across services
def bad_order_flow(
    order_service: "OrderService",
    inventory_service: "InventoryService",  # Direct dependency!
    payment_service: "PaymentService",      # Another direct dependency!
    shipping_service: "ShippingService",    # Yet another!
) -> None:
    """Tightly coupled synchronous flow — cascading failures and deployment coupling.

    Problems:
    - If any service is down, the entire flow fails
    - OrderService must know about every downstream service's existence
    - Adding a new step requires modifying OrderService (violates Open/Closed Principle)
    - No retry or resilience patterns — transient failures cause order loss
    """
    order = order_service.create_order(...)        # Could fail
    inventory_service.reserve_items(order.id, ...)  # If this fails, order is orphaned
    payment_service.charge(order.id, ...)           # Money may be lost if shipping hasn't shipped
    shipping_service.schedule(order.id)             # Shipping expects payment succeeded


# ✅ GOOD: Event-driven flow with decoupled consumers and saga compensation
class EventDrivenOrderFlow:
    """Decoupled event-driven order processing using saga choreography.

    Each service publishes events it cares about. The saga flows through
    a sequence of state transitions triggered by domain events, not direct calls.
    This is resilient to individual service failures — events are queued and
    processed when services recover.
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._bus = event_bus

    def place_order(
        self,
        order_id: str,
        customer_id: str,
        items: list[dict],
        total_amount: float,
    ) -> MessageEnvelope:
        """Initiate the order saga by publishing ORDER_PLACED event.

        This is fire-and-forget from the caller's perspective. The rest of the flow
        happens asynchronously through event propagation between services.
        """
        envelope = MessageEnvelope(
            event_type="ORDER_PLACED",
            aggregate_id=order_id,
            correlation_id=f"saga-{order_id}",
            message_id=f"msg-{order_id}-001",
            payload={
                "customer_id": customer_id,
                "items": items,
                "total_amount": total_amount,
            },
        )

        self._bus.publish(envelope)
        return envelope


class OrderSagaCoordinator:
    """Saga orchestration using a central coordinator for complex multi-step workflows.

    Orchestrator pattern vs choreography: use this when the saga has many branches,
    conditional steps, or requires global rollback logic. The orchestrator holds
    the complete saga state and commands each participant step.
    """

    # Define the ordered sequence of saga steps with their compensating actions
    _SAGA_STEPS = [
        ("reserve_inventory", "cancel_inventory_reservation"),
        ("process_payment",       "refund_payment"),
        ("schedule_shipping",     "cancel_shipping"),
        ("send_notification",     None),  # Notification has no compensation needed
    ]

    def __init__(self, command_bus: "CommandBus") -> None:
        self._bus = command_bus
        self._completed_steps: list[str] = []

    def execute(self, context: dict) -> str:
        """Execute the saga with automatic compensation on failure.

        Args:
            context: Dict containing correlation_id and all step parameters.

        Returns:
            The saga outcome: "COMPLETED" or "COMPENSATED".
        """
        correlation_id = context.get("correlation_id", "")
        if not correlation_id:
            raise ValueError("saga context must include correlation_id")

        try:
            self._execute_steps(context)
            return "COMPLETED"

        except Exception as exc:
            self._compensate(correlation_id)
            raise RuntimeError(
                f"Saga {correlation_id} failed during step execution and was compensated. "
                f"Completed steps before failure: {self._completed_steps}. Error: {exc}"
            ) from exc

    def _execute_steps(self, context: dict) -> None:
        """Run each saga step in sequence until completion or failure."""
        for step_name, compensation_name in self._SAGA_STEPS:
            if step_name == "send_notification":
                # Notification is fire-and-forget; don't block on it
                try:
                    self._bus.send(step_name, context)
                except Exception:
                    pass  # Non-critical — log but don't abort saga
                continue

            self._bus.send(step_name, context)
            self._completed_steps.append(step_name)

    def _compensate(self, correlation_id: str) -> None:
        """Run compensation actions in reverse order of completion.

        Compensation steps undo the effects of each completed step in reverse,
        ensuring the system reaches a consistent state even after failure.
        """
        for completed_step in reversed(self._completed_steps):
            # Find the corresponding compensating action
            compensation = None
            for original, comp in self._SAGA_STEPS:
                if original == completed_step:
                    compensation = comp
                    break

            if compensation:
                self._bus.send(compensation, {"correlation_id": correlation_id})


class CommandBus(ABC):
    """Abstract command bus for saga orchestration.

    Sends commands to specific services and coordinates the saga flow.
    Each implementation maps command names to service endpoints.
    """

    @abstractmethod
    def send(self, command: str, context: dict) -> None:
        """Execute a saga step by sending a command to the appropriate service."""
        ...


# ─── Outbox Pattern for Reliable Event Publishing ────────────────────────────


class OutboxWriter:
    """Outbox pattern ensures events are published reliably after database commit.

    Instead of publishing events directly (which can fail between DB commit and
    publish, causing lost events), we write the event to a local 'outbox' table
    in the same transaction as the business data change. A separate poller then
    publishes events from the outbox to the message broker.

    This guarantees at-least-once delivery without dual-write inconsistency.
    """

    def __init__(self, db_connection: "DBConnection") -> None:
        self._db = db_connection

    def write_outbox_event(self, event: MessageEnvelope) -> None:
        """Write an event to the outbox table within a database transaction.

        This happens in the SAME transaction as the business data change.
        If the transaction commits, the event is guaranteed to be published later.
        If the transaction rolls back, the event is never written — no phantom events.
        """
        self._db.execute(
            """INSERT INTO outbox_events
               (message_id, event_type, aggregate_id, correlation_id,
                content_type, timestamp, payload)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                event.message_id,
                event.event_type,
                event.aggregate_id,
                event.correlation_id,
                event.content_type,
                event.timestamp,
                str(event.payload),
            ),
        )

    def fetch_pending_events(self, limit: int = 100) -> list[MessageEnvelope]:
        """Fetch events from the outbox that have not yet been published.

        Called by a background poller process. Returns events ordered by timestamp
        and marks them as published after successful broker delivery.
        """
        raise NotImplementedError("Implement against your chosen database")
```

### Pattern 3: API Gateway Request Routing & Aggregation

An API gateway consolidates multiple service endpoints behind a single entry point, handling cross-cutting concerns like authentication, rate limiting, and response aggregation. The gateway should never contain business logic — it is a routing and policy enforcement layer.

```python
# ❌ BAD: Exposing every service's internal endpoints directly to clients
# Clients must know about 8+ different service URLs, handle their own auth,
# compose responses from multiple services, and manage retries per-service.

class BadGatewayApproach:
    """Each service endpoint is exposed as a public URL — client complexity explodes."""

    # /api/order-service/create
    # /api/inventory-service/check/{item_id}
    # /api/payment-service/charge
    # /api/shipping-service/schedule
    # /api/notification-service/send
    # ... 8+ endpoints, no consistency, no aggregation


# ✅ GOOD: Gateway provides unified REST API with response aggregation

class SimpleGatewayRouter:
    """Example gateway router that aggregates responses from multiple services.

    A real implementation would use a framework like Kong, Apigee, or FastAPI-based
    custom gateway. This demonstrates the routing and aggregation pattern.
    """

    # Route table — declarative mapping of API paths to service endpoints
    _ROUTES: dict[str, dict] = {
        "GET /api/orders/{order_id}": {"service": "order-service", "path": "/orders/{order_id}"},
        "GET /api/products/{product_id}/availability": {
            "service": "inventory-service",
            "path": "/products/{product_id}/availability",
        },
        "POST /api/orders": {"service": "order-service", "path": "/orders"},
        "GET /health": {"service": "health-checker", "path": "/internal/health"},
    }

    def route_request(self, method: str, path: str) -> dict:
        """Route incoming request to the appropriate downstream service.

        In production this runs inside a gateway process that handles:
        - TLS termination
        - Authentication (JWT validation against identity service)
        - Rate limiting (per-client token bucket or sliding window)
        - Request/response transformation
        - Response caching for GET endpoints
        """
        route_key = f"{method} {path}"

        if route_key not in self._ROUTES:
            return {"status": 404, "error": "route_not_found", "path": path}

        route = self._ROUTES[route_key]
        # In production: extract service URL from service registry (Consul, Eureka)
        service_url = f"http://{route['service']}:8080{route['path']}"

        return {
            "status": 200,
            "proxied_to": service_url,
            # The actual HTTP forwarding happens in the gateway's request handler
        }

    def aggregate_order_details(self, order_id: str) -> dict:
        """Aggregate data from multiple services into a single response.

        This is one of the key patterns an API gateway enables — composing
        responses from several microservices so clients don't need to make
        multiple calls themselves.
        """
        # In production, use parallel HTTP calls via asyncio.gather or httpx.AsyncClient
        raise NotImplementedError(
            "Aggregate: call order-service + inventory-service + shipping-service in parallel"
        )
```

---

## Constraints

### MUST DO
- Define strict API contracts (OpenAPI 3.0 / Protobuf) for every service boundary — never rely on implicit interface knowledge
- Implement circuit breakers with configurable thresholds on every synchronous inter-service call
- Use the outbox pattern for reliable event publishing — events must be written in the same transaction as the business data change
- Design all saga steps and event handlers to be idempotent — duplicate messages must not cause side effects
- Organize services around bounded contexts (DDD), not technical layers (e.g., do not create a "database service" or "logging service")
- Use correlation IDs and distributed tracing (OpenTelemetry) across every inter-service call for observability
- Apply the anti-corruption layer pattern when integrating with legacy systems or third-party APIs

### MUST NOT DO
- Create a distributed monolith — if services must be deployed together or share database schemas, they are not truly independent
- Share databases between services — each service owns its data exclusively and communicates through well-defined APIs or events
- Over-decompose early — start with the smallest meaningful bounded context; extract only when scaling or organizational needs justify it
- Ignore eventual consistency — design systems where temporary inconsistency is expected and handled gracefully by the user experience
- Use synchronous calls for all inter-service communication — this creates cascading failure chains and tight coupling
- Put business logic in the API gateway — the gateway handles routing, auth, and rate limiting only, not domain decisions

---

## Output Template

When implementing or reviewing a microservices architecture design, produce:

1. **Bounded Context Map** — List of identified contexts with aggregate roots, ownership, and data store per context
2. **Service Contract Specifications** — OpenAPI/Protobuf definitions for each public API endpoint including request schemas, response formats, error codes, and versioning strategy
3. **Communication Style Matrix** — Table mapping every inter-service interaction to sync (REST/gRPC) or async (event messaging) with justification
4. **Saga Flow Diagram** — ASCII diagram showing saga steps, participant services, event flow, and compensating actions for each failure path
5. **Resilience Strategy** — Circuit breaker configs, retry policies, timeout settings, and bulkhead boundaries for each service pair
6. **Deployment & Infrastructure Notes** — Containerization requirements, CI/CD pipeline considerations, and database technology per service

---

## Related Skills

| Skill                              | Purpose                                                                                                   |
|------------------------------------|---------------------------------------------------------------------------------------------------------|
| `coding-monolith-refactoring`      | Strategies for incrementally extracting services from a monolith before full decomposition              |
| `coding-domain-driven-design`      | Event storming, aggregate boundary identification, and ubiquitous language for defining bounded contexts |
| `cncf-kubernetes-deployment`       | Container orchestration, service mesh (Istio/Linkerd), and deployment patterns for microservices at scale |
| `coding-event-driven-architecture` | Event sourcing, CQRS patterns, message broker selection, and event schema versioning for async communication |
