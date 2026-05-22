---
name: cross-domain-workflow-sagas
description: Orchestrates and choreographs long-running business transactions across multiple bounded contexts using saga patterns — compensating actions, timeout handling, distributed state persistence, and failure recovery in domain-driven systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: saga pattern, saga orchestration, saga choreography, cross-domain workflow, compensating action, distributed transaction, how do i coordinate across bounded contexts, business transaction consistency, eventual consistency, multi-context workflow
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, ddd-context-mapping, event-driven-patterns, cqrs-pattern, domain-events
---

# Cross-Domain Workflow Coordination with Sagas

Orchestrates and choreographs long-running business transactions across multiple bounded contexts using saga patterns. Implements compensating actions for failure recovery, timeout handling for unresponsive contexts, persistent saga state for restart resilience, and both orchestration (centralized coordinator) and choreography (decentralized event-driven) coordination styles — enabling eventual consistency without distributed locking or two-phase commit across service boundaries.

## TL;DR Checklist

- [ ] Map every bounded context that participates in the business transaction before writing any code
- [ ] For each forward action that changes state in another context, define its compensating action first
- [ ] Choose orchestration for complex sagas with explicit error handling; choose choreography for simple linear flows where loose coupling matters more than traceability
- [ ] Persist saga instance state to durable storage after each step — never only at completion
- [ ] Use a single correlation ID that links all events and commands within one saga instance
- [ ] Make every compensating action idempotent — calling it twice must not cause double-refunds or double-releases
- [ ] Design compensations as domain-specific business rules, not generic "undo" operations
- [ ] Implement timeout detection per step and recover pending sagas on system restart

---

## When to Use

Use this skill when:

- A single business operation must modify state in two or more bounded contexts that have independent databases and cannot share a transaction
- You need to maintain consistency across contexts where the full transaction may take seconds, minutes, or even hours (order placement with inventory reservation, payment processing, and shipping coordination)
- One of the participating contexts is external or third-party and you have no control over its availability or rollback capabilities
- You are designing an order management, booking, onboarding, or any multi-step business workflow that spans teams and services
- The system requires eventual consistency rather than strong consistency — you can tolerate a brief window where state is partially committed

---

## When NOT to Use

Avoid this skill for:

- Single-context operations within one bounded context — use in-process domain events (`domain-events`) or direct method calls instead. Sagas add orchestration overhead that is unnecessary inside one service boundary
- Operations requiring strong consistency (ACID) across contexts — sagas provide eventual consistency only. If the business rule requires all-or-nothing atomicity with zero tolerance for intermediate states, redesign to keep everything within a single context or use a compensatable saga with extremely short execution time
- Simple request-response workflows where the entire operation completes in milliseconds — the state persistence and recovery overhead of a saga is not justified for fast operations
- When any participant context cannot implement compensating actions — if you cannot define a business-meaningful compensation for every forward step, do not use a saga; redesign the workflow or negotiate with the other team

---

## Core Workflow

1. **Map the Cross-Domain Transaction** — List every bounded context that must participate in this business operation. For each context, identify: what command it receives from the saga, what state it modifies, and what compensating action reverses that modification. Draw the forward step sequence left-to-right and the compensation sequence right-to-left on a shared diagram. **Checkpoint:** Every context has exactly one forward action and one compensating action defined before proceeding. No context is "we'll figure out compensation later."

2. **Choose Orchestration vs Choreography** — Apply these decision criteria: choose **orchestration** when the saga has more than three steps, requires explicit error handling for individual steps, or when business operators need a central view of progress; choose **choreography** when the flow is strictly linear (each step triggers exactly one next step), loose coupling between contexts is more important than traceability, and you do not need a coordinator to make routing decisions. **Checkpoint:** Document the decision rationale — if switching to the alternative pattern later, you need to understand why you chose this one.

3. **Define Saga State Schema** — Design a persistent schema that tracks: `saga_instance_id` (the saga's own ID), `current_step_index` (which step has been reached most recently), `context_ids` (correlation IDs for each participant context), `status` (RUNNING, COMPLETED, COMPENSATING, FAILED, TIMEOUT), and `created_at` / `updated_at` timestamps. This schema enables recovery after system restarts — the saga must resume or compensate from where it left off. **Checkpoint:** Every field in the schema is necessary for either resumption logic or observability. Remove fields that no reader or resumption handler uses.

4. **Implement Forward Actions with Compensation Pairs** — For every step, implement both the forward command and its compensating action before wiring them together. Both must be idempotent: sending the same forward command twice should not create duplicate orders; sending the same compensation command twice should not issue double refunds. Store each pair as a `(forward_action, compensate_action)` tuple in a step registry that the saga executor iterates through sequentially. **Checkpoint:** After implementation, verify that calling `compensate()` after `execute()` restores the participant context to its pre-step state (within eventual consistency bounds).

5. **Wire Context Communication** — Set up the messaging layer between contexts. For orchestration: configure a command bus that sends commands from the saga coordinator to each context's command handler. For choreography: configure an event bus where each context publishes events that other contexts listen for. In both cases, each context exposes only the specific commands or events needed by the saga — not its entire API surface. **Checkpoint:** The communication channel uses correlation IDs that link all messages within a single saga instance. Verify this by tracing a message's correlation ID through the entire step sequence.

6. **Add Timeout and Recovery Mechanisms** — Implement timeout detection for each step with configurable duration (e.g., 30 seconds for internal services, 5 minutes for external APIs). Store pending sagas in the durable store with `last_heartbeat_at` and `timeout_seconds` metadata. On system restart or new deployment, scan the saga store for sagas that are neither COMPLETED nor FAILED nor COMPENSATING — resume those that have not timed out, compensate those that have. **Checkpoint:** The recovery handler processes pending sagas in deterministic order (e.g., oldest-first) and logs every resume/compensate decision with the correlation ID for audit purposes.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Orchestration-Based Saga Coordinator

An orchestration-based saga has a single coordinator class that owns the entire workflow lifecycle. The coordinator sends commands to each context in sequence, tracks which steps succeeded, and runs compensating actions in exact reverse order when any step fails. This pattern is preferred for complex multi-step sagas (4+ steps) where explicit error handling and debugging visibility matter more than loose coupling.

The key insight: the coordinator does NOT hold participant state — it only tracks progress through the saga. Each participant context owns its own data, and the coordinator communicates via commands. The coordinator maintains a stack of compensation functions that get popped and executed in LIFO order when a failure occurs.

```python
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from typing import Awaitable, Callable, Protocol, Sequence

logger = logging.getLogger(__name__)


# ── Domain Types ──────────────────────────────────────────────────────────────

class SagaStatus(Enum):
    """Lifecycle status of a saga instance."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass(frozen=True)
class SagaResult:
    """Immutable result of a saga execution."""
    saga_instance_id: str
    status: SagaStatus
    completed_at: datetime | None = None
    failure_reason: str | None = None

    @classmethod
    def completed(cls, saga_id: str) -> SagaResult:
        return cls(
            saga_instance_id=saga_id,
            status=SagaStatus.COMPLETED,
            completed_at=datetime.now(timezone.utc),
        )

    @classmethod
    def failed(cls, saga_id: str, reason: str) -> SagaResult:
        return cls(
            saga_instance_id=saga_id,
            status=SagaStatus.FAILED,
            failure_reason=reason,
        )


@dataclass(frozen=True)
class SagaStep[A, B]:
    """A single step in a saga: forward action and its compensating counterpart.

    Args:
        name: Human-readable step name for logging (e.g., "Reserve Inventory")
        forward: Async callable that performs the primary business action
        compensate: Async callable that reverses the forward action's effects
    """
    name: str
    forward: Callable[..., Awaitable[B]]
    compensate: Callable[..., Awaitable[None]]


# ── Coordinator Protocol ──────────────────────────────────────────────────────

class SagaCoordinatorProtocol(Protocol):
    """Interface for a saga coordinator that manages cross-context transactions."""

    async def execute(self, saga_instance_id: str, *args: object, **kwargs: object) -> SagaResult: ...

    async def compensate(self, saga_instance_id: str, completed_steps: list[SagaStep]) -> None: ...


# ── Core Saga Orchestrator ────────────────────────────────────────────────────

class SagaOrchestrator:
    """Orchestrates a sequence of forward/compensate steps across bounded contexts.

    The orchestrator is the single point of control for cross-domain transactions.
    It executes steps sequentially, tracking each successful step in a compensation stack.
    When any step raises an exception, it pops compensations off the stack and executes
    them in LIFO (last-in-first-out) order — the exact reverse of how forward actions were applied.

    Each compensating action must be idempotent: calling it twice produces the same
    end state as calling it once. This handles retries from message brokers and
    recovery after system restarts during compensation.
    """

    def __init__(self, saga_instance_id: str = "") -> None:
        self._saga_id = saga_instance_id or str(uuid.uuid4())
        self._correlation_id: str = str(uuid.uuid4())  # Links all commands/events in this saga
        self._status: SagaStatus = SagaStatus.PENDING
        self._step_history: list[dict] = []

    @property
    def correlation_id(self) -> str:
        """Returns the correlation ID that links all messages within this saga.

        Every command sent to a participant context and every event published by
        that context must include this correlation_id so operators can trace the
        entire business transaction in distributed tracing tools.
        """
        return self._correlation_id

    @property
    def status(self) -> SagaStatus:
        return self._status

    async def execute(
        self,
        steps: Sequence[SagaStep],
        saga_context: dict[str, object],
    ) -> SagaResult:
        """Execute all saga steps sequentially with compensation on any failure.

        Args:
            steps: Ordered list of forward/compensate step pairs defining the workflow.
            saga_context: Shared context dict passed to each step (order_id, customer_id, etc.).

        Returns:
            SagaResult indicating COMPLETED or FAILED with reason.

        Algorithm:
            1. Iterate through steps in order
            2. Execute forward action — if it succeeds, push compensation onto stack
            3. If any forward action raises, pop compensations off the stack and execute them LIFO
            4. Update status atomically after all compensations complete
        """
        self._status = SagaStatus.RUNNING
        compensation_stack: list[SagaStep] = []

        try:
            for step in steps:
                logger.info(
                    "[saga:%s] Executing step %s (correlation_id=%s)",
                    self._saga_id,
                    step.name,
                    self._correlation_id,
                )
                result = await step.forward(**saga_context)
                compensation_stack.append(step)

                self._step_history.append({
                    "step": step.name,
                    "action": "forward",
                    "success": True,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # All steps succeeded — mark completed
            self._status = SagaStatus.COMPLETED
            logger.info(
                "[saga:%s] All %d steps completed successfully (correlation_id=%s)",
                self._saga_id,
                len(steps),
                self._correlation_id,
            )
            return SagaResult.completed(self._saga_id)

        except Exception as exc:
            # Forward execution failed — compensate in reverse order
            self._status = SagaStatus.COMPENSATING
            logger.warning(
                "[saga:%s] Step %s failed with %s. Starting compensation (%d pending).",
                self._saga_id,
                step.name if "step" in dir() else "unknown",
                exc,
                len(compensation_stack),
            )

            await self._run_compensations(compensation_stack, saga_context)
            return SagaResult.failed(self._saga_id, str(exc))

    async def _run_compensations(
        self,
        compensation_stack: list[SagaStep],
        saga_context: dict[str, object],
    ) -> None:
        """Execute compensating actions in reverse (LIFO) order.

        This is the critical safety mechanism of saga orchestration. Every forward
        action that changed state must be reversed, and it must be reversed in the
        exact opposite order to prevent inconsistent intermediate states.

        For example: if step 1 reserved inventory and step 2 charged payment,
        compensation must first refund payment (step 2's inverse) then release
        inventory (step 1's inverse). Refunding after releasing inventory would
        leave the customer charged but the items still committed to another order.

        Each compensation is wrapped in try/except so one compensation failure does
        not abort the entire compensation sequence — we log and continue.
        """
        for step in reversed(compensation_stack):
            try:
                logger.warning(
                    "[saga:%s] Compensating step %s (correlation_id=%s)",
                    self._saga_id,
                    step.name,
                    self._correlation_id,
                )
                await step.compensate(**saga_context)
                self._step_history.append({
                    "step": step.name,
                    "action": "compensate",
                    "success": True,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            except Exception as comp_exc:
                # Compensation itself failed — this is the hardest problem in saga design.
                # The state may be inconsistent. This MUST trigger manual review.
                logger.error(
                    "[saga:%s] COMPENSATION FAILED for step %s: %s — MANUAL REVIEW REQUIRED",
                    self._saga_id,
                    step.name,
                    comp_exc,
                    exc_info=True,
                )
                self._step_history.append({
                    "step": step.name,
                    "action": "compensate",
                    "success": False,
                    "error": str(comp_exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

        # After all compensations attempt, mark saga as failed
        self._status = SagaStatus.FAILED

    def get_step_history(self) -> list[dict]:
        """Returns the complete step execution history for debugging and audit."""
        return list(self._step_history)


# ❌ BAD: Manual orchestration with no compensation tracking — failures are silently ignored
class BadSagaManual:
    """No coordination, no compensation, no recovery. This is what happens when you
    write cross-context transactions by hand without a saga pattern."""

    def __init__(self) -> None:
        self._order_id: str = ""

    async def place_order(self, order_data: dict) -> bool:
        """Multiple contexts called directly with no coordination or compensation."""
        try:
            # Step 1: Reserve inventory
            await self._reserve_inventory(order_data["items"])
        except Exception as e:
            logger.error("Inventory reserve failed: %s", e)
            return False  # ❌ Caller gets False but inventory may still be partially reserved

        try:
            # Step 2: Charge payment (after inventory is already committed!)
            await self._charge_payment(order_data["total"])
        except Exception as e:
            logger.error("Payment failed: %s", e)
            return False  # ❌ Inventory was reserved but nobody compensates — leaked reservation

        try:
            await self._confirm_order(order_data["order_id"])
        except Exception as e:
            logger.error("Order confirmation failed: %s", e)
            return False  # ❌ Two failures now, zero compensation ever triggered

        return True  # No one knows this partially failed saga is sitting in a zombie state


# ✅ GOOD: Structured orchestration with full compensation chain and logging
async def demonstrate_order_fulfillment_saga() -> tuple[SagaOrchestrator, list[SagaStep]]:
    """Demonstrate a properly orchestrated order fulfillment saga.

    This is the canonical example: an order must pass through Inventory (reserve),
    Payment (charge), and Shipping (schedule) contexts. If any step fails, all
    completed steps are compensated in reverse order.
    """
    orchestrator = SagaOrchestrator(saga_instance_id="SAGA-ORDER-001")

    # Each context exposes a command handler as an async callable
    inventory_client: InventoryClient = InventoryClient()  # type: ignore[name-defined]
    payment_client: PaymentClient = PaymentClient()  # type: ignore[name-defined]
    shipping_client: ShippingClient = ShippingClient()  # type: ignore[name-defined]

    steps: list[SagaStep] = [
        SagaStep(
            name="Reserve Inventory",
            forward=inventory_client.reserve_items,
            compensate=inventory_client.release_items,
        ),
        SagaStep(
            name="Charge Payment",
            forward=payment_client.charge_card,
            compensate=payment_client.refund_charge,
        ),
        SagaStep(
            name="Confirm Order",
            forward=lambda **ctx: _confirm_order_in_order_context(ctx["order_id"]),
            compensate=lambda **ctx: _cancel_order_in_order_context(ctx["order_id"]),
        ),
        SagaStep(
            name="Schedule Shipping",
            forward=shipping_client.schedule_delivery,
            compensate=shipping_client.cancel_shipment,
        ),
    ]

    saga_context = {
        "order_id": "ORD-2026-0042",
        "customer_id": "CUST-789",
        "items": [{"sku": "WIDGET-A", "quantity": 3}],
        "total_amount_cents": 2997,
    }

    result = await orchestrator.execute(steps, saga_context)

    # Production: persist the SagaResult to the saga state store
    if result.status == SagaStatus.COMPLETED:
        print(f"✅ Order fulfillment completed (correlation_id={orchestrator.correlation_id})")
    elif result.status == SagaStatus.FAILED:
        print(f"❌ Order fulfillment failed: {result.failure_reason}")
        print(f"   Step history: {len(orchestrator.get_step_history())} entries recorded for review")

    return orchestrator, steps


async def _confirm_order_in_order_context(order_id: str) -> dict:
    return {"order_id": order_id, "status": "CONFIRMED"}


async def _cancel_order_in_order_context(order_id: str) -> None:
    logger.info("Compensating: cancelling order %s", order_id)
```

### Pattern 2: Choreography-Based Event-Driven Sagas

In a choreographed saga, there is no central coordinator. Each context listens for events from other contexts and reacts by executing its own step, then publishing the next event in the chain. The event sequence defines the forward flow; a separate set of compensation events defines the reverse flow. This pattern produces tighter coupling between contexts than orchestration — every context must know about the specific events that trigger its step — but it has better loose-coupling properties within each context since no coordinator exists as a single point of failure.

The key difference from orchestration: in choreography, there is NO explicit compensation stack managed by a central object. Instead, when any context detects a failure (e.g., "payment charge declined"), it publishes a `CompensationRequested` event that triggers the reverse chain. Each context listens for its own compensation event and runs its compensating action locally.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from typing import Any, Callable

logger = logging.getLogger(__name__)


# ── Event Types for Choreographed Saga ────────────────────────────────────────

@dataclass(frozen=True)
class SagaEvent:
    """Base class for all saga coordination events.

    Every event carries a correlation_id that links it to a specific saga instance,
    allowing operators to trace the entire event chain in distributed tracing tools.
    """
    correlation_id: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def event_name(self) -> str:
        return self.__class__.__name__


# Forward events (trigger next step in the saga flow)
@dataclass(frozen=True)
class OrderCreated(SagaEvent):
    order_id: str
    customer_id: str
    items: list[dict[str, Any]]
    total_cents: int


@dataclass(frozen=True)
class StockReserved(SagaEvent):
    order_id: str
    reservation_id: str
    item_sku: str
    quantity_reserved: int


@dataclass(frozen=True)
class PaymentCharged(SagaEvent):
    order_id: str
    payment_id: str
    amount_cents: int


@dataclass(frozen=True)
class ShipmentScheduled(SagaEvent):
    order_id: str
    shipment_id: str
    estimated_delivery_date: str


# Compensation events (trigger reverse flow when something fails)
@dataclass(frozen=True)
class PaymentFailed(SagaEvent):
    order_id: str
    failure_reason: str


@dataclass(frozen=True)
class StockReservationCancelled(SagaEvent):
    order_id: str
    reservation_id: str | None = None


# ── Event Router (Choreography Coordinator — Decentralized) ───────────────────

class SagaEventRouter:
    """Routes saga events between bounded contexts in a choreographed architecture.

    Unlike an orchestrator that actively sends commands, this router is passive: it
    receives events and delivers them to registered handlers. Each handler belongs to
    a specific bounded context and reacts by executing its step (forward or compensation).

    This is the closest thing to a coordinator in choreography — but it does not own
    the saga state, does not track progress, and cannot make routing decisions beyond
    delivering events to their subscribers. The business logic lives entirely within
    each context's event handlers.
    """

    def __init__(self) -> None:
        # event_type -> list of handler callables
        self._subscribers: dict[str, list[Callable[[SagaEvent], Any]]] = {}

    def subscribe(self, event_type: type[SagaEvent], handler: Callable[[SagaEvent], Any]) -> None:
        """Register a handler for a specific saga event type.

        In choreography, each context registers handlers for the events it listens to.
        For example, the InventoryContext subscribes to OrderCreated so it can reserve stock.
        """
        key = event_type.__name__
        if key not in self._subscribers:
            self._subscribers[key] = []
        self._subscribers[key].append(handler)

    async def publish(self, event: SagaEvent) -> None:
        """Deliver an event to all registered handlers for its type.

        Handlers are called sequentially. If a handler raises, the remaining handlers
        still execute (fail-fast is NOT automatic — each handler must handle errors).

        This enables the event chain: OrderCreated → StockReserved → PaymentCharged → ShipmentScheduled
        """
        key = event.event_name
        handlers = self._subscribers.get(key, [])

        for handler in handlers:
            try:
                await handler(event)
            except Exception as exc:
                logger.error(
                    "Handler failed for event %s (correlation_id=%s): %s",
                    event.event_name,
                    getattr(event, "correlation_id", ""),
                    exc,
                    exc_info=True,
                )
                # In production: route to dead letter queue after max retries


# ── Context Event Handlers (Each lives in its own bounded context) ────────────

class InventoryEventHandler:
    """Inventory context handler — listens for OrderCreated and PaymentFailed events.

    When an order is created, this handler reserves stock and publishes StockReserved.
    When payment fails, it releases the previously reserved stock and publishes
    StockReservationCancelled (triggering the next compensation step).
    """

    def __init__(self, router: SagaEventRouter, inventory_service: Any = None) -> None:  # type: ignore[name-defined]
        self._router = router
        self._inventory_service = inventory_service or InventoryService()  # type: ignore[name-defined]
        # Register this context's handlers
        router.subscribe(OrderCreated, self._handle_order_created)
        router.subscribe(PaymentFailed, self._handle_payment_failed)

    async def _handle_order_created(self, event: OrderCreated) -> None:
        """Reserve inventory when an order is created. Publishes StockReserved on success."""
        logger.info(
            "[INVENTORY] Reserving stock for order %s (correlation_id=%s)",
            event.order_id,
            event.correlation_id,
        )

        try:
            reservation = await self._inventory_service.reserve(
                items=event.items,
                correlation_id=event.correlation_id,
            )
            # Publish next event in the chain — PaymentContext will listen for this
            await self._router.publish(StockReserved(
                correlation_id=event.correlation_id,
                order_id=event.order_id,
                reservation_id=reservation.reservation_id,  # type: ignore[attr-defined]
                item_sku=event.items[0].get("sku", "unknown") if event.items else "unknown",  # type: ignore[index]
                quantity_reserved=sum(item.get("quantity", 1) for item in event.items),  # type: ignore[misc]
            ))
        except Exception as exc:
            # Inventory cannot fulfill — trigger compensation chain
            await self._router.publish(PaymentFailed(
                correlation_id=event.correlation_id,
                order_id=event.order_id,
                failure_reason=f"Inventory unavailable: {exc}",
            ))

    async def _handle_payment_failed(self, event: PaymentFailed) -> None:
        """Release reserved stock when payment fails. Publishes StockReservationCancelled."""
        logger.warning(
            "[INVENTORY] Releasing stock — payment failed for order %s",
            event.order_id,
        )
        await self._inventory_service.release(event.correlation_id)
        await self._router.publish(StockReservationCancelled(
            correlation_id=event.correlation_id,
            order_id=event.order_id,
        ))


class PaymentEventHandler:
    """Payment context handler — listens for StockReserved and publishes PaymentCharged or triggers failure."""

    def __init__(self, router: SagaEventRouter, payment_service: Any = None) -> None:  # type: ignore[name-defined]
        self._router = router
        self._payment_service = payment_service or PaymentService()  # type: ignore[name-defined]
        router.subscribe(StockReserved, self._handle_stock_reserved)

    async def _handle_stock_reserved(self, event: StockReserved) -> None:
        """Charge payment when inventory is reserved. Publishes ShipmentScheduled or triggers failure."""
        logger.info(
            "[PAYMENT] Charging payment for order %s (correlation_id=%s)",
            event.order_id,
            event.correlation_id,
        )

        try:
            charge = await self._payment_service.charge(event.order_id)  # type: ignore[attr-defined]
            await self._router.publish(PaymentCharged(
                correlation_id=event.correlation_id,
                order_id=event.order_id,
                payment_id=charge.payment_id,  # type: ignore[attr-defined]
                amount_cents=0,  # In real code, would be charge.amount_cents
            ))
        except Exception as exc:
            await self._router.publish(PaymentFailed(
                correlation_id=event.correlation_id,
                order_id=event.order_id,
                failure_reason=f"Payment failed: {exc}",
            ))


# ❌ BAD: No event-based choreography — contexts call each other directly
class BadChoreography:
    """Direct synchronous calls between contexts — tight coupling, no saga pattern."""

    def __init__(self) -> None:
        self.inventory = InventoryClient()  # Tight coupling to another context's service
        self.payment = PaymentClient()      # Direct dependency creates a deployment chain

    async def process_order(self, order_data: dict) -> bool:
        """Synchronous cascade with no event trail and no compensation.

        If this fails halfway through, there is no record of what happened
        and no automated way to undo partial work.
        """
        reservation = await self.inventory.reserve(order_data["items"])
        # ❌ No event published — other contexts don't know what's happening
        # ❌ If payment fails below, nobody compensates the inventory reservation
        charge = await self.payment.charge(reservation.order_id)
        return True


# ✅ GOOD: Decentralized choreography — each context reacts to events independently
async def demonstrate_choreography() -> SagaEventRouter:
    """Set up a choreographed saga with event handlers in each bounded context.

    The event chain flows like this:
      1. OrderCreated (from Orders context) → triggers InventoryContext
      2. StockReserved (from InventoryContext) → triggers PaymentContext
      3. PaymentCharged (from PaymentContext) → triggers ShippingContext
      4. ShipmentScheduled (from ShippingContext) → saga complete

    Compensation chain (triggered by any failure):
      1. PaymentFailed → triggers InventoryContext to release stock
      2. StockReservationCancelled → no further action needed — done
    """
    router = SagaEventRouter()

    # Register each context's event handlers
    inventory_events = InventoryEventHandler(router)     # type: ignore[name-defined]
    payment_events = PaymentEventHandler(router)          # type: ignore[name-defined]
    # shipping_events = ShippingEventHandler(router)      # Would listen for PaymentCharged

    # Publish the initial event from the Orders context
    initial_event = OrderCreated(
        correlation_id="corr-choreo-001",
        order_id="ORD-2026-0043",
        customer_id="CUST-790",
        items=[{"sku": "WIDGET-B", "quantity": 2}],
        total_cents=4998,
    )

    await router.publish(initial_event)
    # The event chain now executes through all contexts automatically
    return router


# Placeholder services for demonstration — in real code, these are context-owned
class InventoryService:
    async def reserve(self, items: list, correlation_id: str = "") -> Any:  # type: ignore[name-defined]
        raise NotImplementedError

    async def release(self, correlation_id: str) -> None:
        logger.info("[INVENTORY] Released stock (correlation_id=%s)", correlation_id)


class PaymentService:
    async def charge(self, order_id: str) -> Any:  # type: ignore[name-defined]
        raise NotImplementedError


class InventoryClient:
    async def reserve(self, items: list[dict]) -> Any:  # type: ignore[name-defined]
        return type("Reservation", (), {"reservation_id": "RES-001"})()

    async def release(self, correlation_id: str) -> None:
        logger.info("[INVENTORY] Released items (correlation_id=%s)", correlation_id)


class PaymentClient:
    async def charge_card(self, total_cents: int, **kwargs: Any) -> dict:  # type: ignore[name-defined]
        return {"charge_id": "CHG-001", "status": "charged"}

    async def refund_charge(self, order_id: str, **kwargs: Any) -> None:  # type: ignore[name-defined]
        logger.info("[PAYMENT] Refunded charge for order %s", order_id)


class ShippingClient:
    async def schedule_delivery(self, order_id: str, **kwargs: Any) -> dict:  # type: ignore[name-defined]
        return {"shipment_id": "SHIP-001"}

    async def cancel_shipment(self, order_id: str, **kwargs: Any) -> None:  # type: ignore[name-defined]
        logger.info("[SHIPPING] Cancelled shipment for order %s", order_id)
```

### Pattern 3: Timeout and Cancellation Handling

Long-running sagas face a critical problem: what happens when one context becomes unresponsive? The coordinator must detect timeouts and take action — typically compensating all previously completed steps. This pattern shows how to implement per-step timeout detection with configurable durations, heartbeat tracking, and automated cleanup of timed-out sagas.

The timeout mechanism has two parts: (1) step-level timeout on individual commands (how long to wait for a response from a context), and (2) saga-level timeout (total elapsed time for the entire saga). Step timeouts trigger immediate compensation; saga-level timeouts trigger full cancellation when the system detects that no progress is being made.

```python
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import timedelta
from enum import Enum, auto
from typing import Any

logger = logging.getLogger(__name__)


class TimeoutAction(Enum):
    """What to do when a saga step exceeds its timeout."""
    COMPENSATE_AND_STOP = "compensate_and_stop"  # Default — roll back completed work
    RETRY_WITH_BACKOFF = "retry_with_backoff"    # Retry the failed step with exponential backoff
    NOTIFY_AND_HOLD = "notify_and_hold"          # Alert operators but keep waiting (manual intervention)


@dataclass(frozen=True)
class StepTimeoutConfig:
    """Configuration for timeout detection on a single saga step.

    Args:
        duration: Maximum time to wait for the step's forward action to complete
        max_retries: Number of retries before treating as timeout (for RETRY_WITH_BACKOFF)
        backoff_base_seconds: Base delay between retries (doubles each retry)
        action: What to do when the timeout is exceeded
    """
    duration: timedelta = field(default=timedelta(seconds=30))
    max_retries: int = 1
    backoff_base_seconds: float = 2.0
    action: TimeoutAction = TimeoutAction.COMPENSATE_AND_STOP


@dataclass
class PendingSagaState:
    """Persisted state for a saga that is still running (needs recovery after restart).

    This dataclass represents what must be stored in the saga state store so that
    a system restart can resume or compensate the saga from where it left off.
    """
    saga_instance_id: str
    correlation_id: str
    status: str  # RUNNING, COMPENSATING, TIMEOUT
    current_step_index: int
    completed_steps: list[str] = field(default_factory=list)
    timeout_config: dict[str, Any] = field(default_factory=dict)
    created_at: str = ""          # ISO 8601 timestamp string for JSON persistence
    last_updated_at: str = ""     # Updated after each step completion
    last_heartbeat_at: str = ""   # Updated on every step boundary

    def has_timed_out(self, total_timeout_seconds: int) -> bool:
        """Check if the saga has exceeded its total timeout from creation.

        Args:
            total_timeout_seconds: Maximum allowed elapsed time for the entire saga.

        Returns:
            True if the saga should be cancelled and compensated due to age.
        """
        import datetime
        created = datetime.datetime.fromisoformat(self.created_at)
        elapsed = datetime.datetime.now(datetime.timezone.utc) - created
        return elapsed.total_seconds() > total_timeout_seconds


class TimeoutManager:
    """Manages timeout detection and response for saga steps.

    In production, this integrates with the orchestration layer to wrap each step's
    forward action with asyncio.wait_for() and triggers compensation when a timeout
    fires. It also manages saga-level timeouts for detecting stuck or zombie sagas.

    For long-running sagas that span minutes or hours (e.g., manual approval workflows),
    use the NOTIFY_AND_HOLD action: pause execution, alert operators, and wait for
    manual resumption rather than automatically compensating.
    """

    def __init__(self, saga_state_store: Any = None) -> None:  # type: ignore[name-defined]
        self._saga_state_store = saga_state_store or InMemorySagaStateStore()

    async def execute_with_timeout(
        self,
        step_name: str,
        action_fn,  # Callable that performs the forward action
        timeout_config: StepTimeoutConfig,
        correlation_id: str,
        **context_kwargs: Any,
    ) -> Any:
        """Execute an action with timeout detection and retry logic.

        Args:
            step_name: Human-readable name for logging
            action_fn: Async callable to execute (the forward action)
            timeout_config: Timeout settings for this specific step
            correlation_id: Links this action to its saga instance
            **context_kwargs: Arguments passed to the action function

        Returns:
            The result of the successful forward action, or None on timeout/compensation.
        """
        last_exception: Exception | None = None

        for attempt in range(timeout_config.max_retries + 1):
            try:
                logger.info(
                    "[timeout] Step %s attempt %d/%d (correlation_id=%s)",
                    step_name,
                    attempt + 1,
                    timeout_config.max_retries + 1,
                    correlation_id,
                )

                # asyncio.wait_for enforces the deadline — raises TimeoutError if exceeded
                result = await asyncio.wait_for(
                    action_fn(**context_kwargs),
                    timeout=timeout_config.duration.total_seconds(),
                )

                # Update heartbeat on successful step completion
                self._saga_state_store.update_heartbeat(correlation_id)
                return result

            except (TimeoutError, asyncio.TimeoutError) as exc:
                last_exception = exc
                logger.warning(
                    "[timeout] Step %s timed out after %.1fs (attempt %d/%d)",
                    step_name,
                    timeout_config.duration.total_seconds(),
                    attempt + 1,
                    timeout_config.max_retries + 1,
                )

                if attempt < timeout_config.max_retries:
                    # Exponential backoff before retry
                    backoff = timeout_config.backoff_base_seconds * (2 ** attempt)
                    logger.info("[timeout] Retrying step %s in %.1fs...", step_name, backoff)
                    await asyncio.sleep(backoff)
                else:
                    # All retries exhausted — apply the configured action
                    if timeout_config.action == TimeoutAction.RETRY_WITH_BACKOFF:
                        logger.error(
                            "[timeout] Max retries exceeded for step %s — compensating",
                            step_name,
                        )
                    elif timeout_config.action == TimeoutAction.COMPENSATE_AND_STOP:
                        logger.warning(
                            "[timeout] Step %s timed out after all retries — compensation required",
                            step_name,
                        )
                    # NOTIFY_AND_HOLD would send an alert but not compensate

        raise TimeoutError(
            f"Step '{step_name}' for saga {correlation_id} timed out after "
            f"{timeout_config.max_retries + 1} attempts over {timeout_config.duration}"
        )

    def check_saga_health(self, sagas: list[PendingSagaState], max_total_seconds: int = 3600) -> list[str]:
        """Scan for sagas that have timed out and need compensation or recovery.

        This method is called periodically (e.g., every 60 seconds by a background job)
        to detect stuck or zombie sagas — sagas that are neither completed nor failed
        but also haven't made progress in too long.

        Args:
            sagas: List of pending saga states from the durable store.
            max_total_seconds: Maximum total time a saga is allowed to run before being killed.

        Returns:
            List of saga instance IDs that require intervention (compensation or manual review).
        """
        timed_out_ids: list[str] = []

        for saga in sagas:
            if saga.has_timed_out(max_total_seconds):
                logger.warning(
                    "[saga-health] Saga %s has been running since %s — exceeding %ds limit",
                    saga.saga_instance_id,
                    saga.created_at,
                    max_total_seconds,
                )
                timed_out_ids.append(saga.saga_instance_id)

        return timed_out_ids


class InMemorySagaStateStore:
    """In-memory store for saga state — replace with PostgreSQL/Redis in production.

    The durable store must persist saga state AFTER EACH STEP (not just at completion).
    This ensures that after a system restart, the saga can resume from the last completed step
    or compensate if it was mid-compensation when the crash occurred.
    """

    def __init__(self) -> None:
        self._sagas: dict[str, PendingSagaState] = {}

    def save(self, state: PendingSagaState) -> None:
        """Persist saga state after each step completion."""
        self._sagas[state.correlation_id] = state
        logger.info(
            "[state-store] Saved saga %s at step %d (correlation_id=%s)",
            state.saga_instance_id,
            state.current_step_index,
            state.correlation_id,
        )

    def load(self, correlation_id: str) -> PendingSagaState | None:
        """Load a saga by its correlation ID for resumption."""
        return self._sagas.get(correlation_id)

    def list_pending(self) -> list[PendingSagaState]:
        """Return all sagas that are not completed or failed — for recovery scanning."""
        return [s for s in self._sagas.values() if s.status in ("RUNNING", "COMPENSATING")]

    def update_heartbeat(self, correlation_id: str) -> None:
        """Update the heartbeat timestamp for a running saga."""
        if correlation_id in self._sagas:
            import datetime
            self._sagas[correlation_id].last_heartbeat_at = datetime.datetime.now(datetime.timezone.utc).isoformat()


# ❌ BAD: No timeout detection — an unresponsive context causes the saga to hang forever
class BadTimeoutHandling:
    """No timeouts, no retries, no recovery. If a context hangs, the entire saga is stuck."""

    async def execute_step_no_timeout(self, step_name: str, fn) -> Any:  # type: ignore[name-defined]
        """Calls an action with zero timeout protection.

        This will hang indefinitely if the function never returns. No heartbeat,
        no state persistence, no way to resume or compensate after a crash.
        """
        return await fn()


# ✅ GOOD: Configurable timeouts with retry, heartbeat tracking, and saga health scanning
async def demonstrate_timeout_handling() -> TimeoutManager:
    """Demonstrate timeout management for a saga step.

    Step 1: Execute an action with a 30-second timeout and one retry
    Step 2: Scan for any timed-out sagas that need recovery
    """
    manager = TimeoutManager()

    # Define a step-specific timeout config (external APIs typically need longer timeouts)
    payment_step_config = StepTimeoutConfig(
        duration=timedelta(seconds=10),
        max_retries=2,
        backoff_base_seconds=3.0,
        action=TimeoutAction.COMPENSATE_AND_STOP,
    )

    # In production, this wraps the actual forward action:
    # result = await manager.execute_with_timeout(
    #     step_name="Charge Payment",
    #     action_fn=payment_client.charge_card,
    #     timeout_config=payment_step_config,
    #     correlation_id="SAGA-001",
    #     order_id="ORD-42",
    # )

    print(f"Payment step timeout config: {payment_step_config.duration}, "
          f"{payment_step_config.max_retries} retries, action={payment_step_config.action.name}")

    # Demonstrate saga health scanning
    fake_sagas = [
        PendingSagaState(
            saga_instance_id="SAGA-001",
            correlation_id="corr-001",
            status="RUNNING",
            current_step_index=2,
            created_at=datetime.datetime(2026, 5, 20, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
        ),
        PendingSagaState(
            saga_instance_id="SAGA-002",
            correlation_id="corr-002",
            status="RUNNING",
            current_step_index=5,
            created_at=datetime.datetime.now(timezone.utc).isoformat(),  # Just created — healthy
        ),
    ]

    timed_out = manager.check_saga_health(fake_sagas, max_total_seconds=300)  # 5 min limit
    print(f"Sagas requiring intervention: {timed_out}")

    return manager
```

### Pattern 4: Saga State Persistence for Restart Recovery

Sagas are long-running by definition — they span multiple contexts and may take significant time to complete. The saga state must survive process restarts, container crashes, and deployments. This pattern shows the persistent state schema and the recovery logic that resumes or compensates sagas after a system restart.

The key requirement: **persist state after each step, not just at completion**. If you only save state when the entire saga finishes, a crash mid-execution means losing all progress and having no idea which steps succeeded — making it impossible to know whether to resume or compensate.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from typing import Any

logger = logging.getLogger(__name__)


class SagaRecoveryDecision(Enum):
    """Decision made when a system restart encounters a pending saga."""
    RESUME = "resume"            # Resume from the last completed step
    COMPENSATE = "compensate"    # Full compensation — cancel the entire transaction
    MANUAL_REVIEW = "manual_review"  # Cannot determine safe action — escalate to human


@dataclass(frozen=True)
class RecoveredSagaState:
    """State recovered from durable storage after a system restart.

    This object is the input to the recovery decision logic and contains all
    information needed to either resume the saga or begin compensation.
    """
    saga_instance_id: str
    correlation_id: str
    completed_step_names: list[str]  # Names of steps that finished successfully
    last_completed_step_index: int   # 0-based index of the last successful step
    total_steps: int                 # Total number of steps in the saga definition
    started_at: datetime             # When the saga was created (for timeout checks)
    last_step_completed_at: datetime | None  # When the last step finished

    @property
    def is_complete(self) -> bool:
        return self.last_completed_step_index >= self.total_steps - 1

    @property
    def remaining_steps(self) -> int:
        """Number of steps that still need to execute."""
        return max(0, self.total_steps - self.last_completed_step_index - 1)


class SagaStateStore:
    """Durable state store for saga instances.

    In production, this maps to a database table (PostgreSQL recommended) with
    the following schema:

        CREATE TABLE saga_instances (
            saga_instance_id VARCHAR(255) PRIMARY KEY,
            correlation_id   VARCHAR(255) NOT NULL,
            status           VARCHAR(32)  NOT NULL,  -- RUNNING, COMPLETED, FAILED, COMPENSATING, TIMEOUT
            current_step     INTEGER      NOT NULL,
            context_data     JSONB,          -- Saga-specific data (order_id, customer_id, etc.)
            completed_steps  JSONB DEFAULT '[]',  -- Array of completed step names
            created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
            timeout_seconds  INTEGER      NOT NULL DEFAULT 3600,
            INDEX idx_saga_correlation (correlation_id),
            INDEX idx_saga_status (status)
        );

    The composite index on (correlation_id, status) supports the most common queries:
    find all pending sagas for a correlation ID, and find all sagas in RUNNING state.
    """

    def __init__(self, store_backend: Any = None) -> None:  # type: ignore[name-defined]
        self._backend = store_backend or {}

    def save_step_completion(self, saga_id: str, step_name: str, context_data: dict[str, Any]) -> None:
        """Save the current state after a step completes successfully.

        This is called IMMEDIATELY AFTER each step's forward action succeeds and
        BEFORE the next step begins execution. This ensures that if the process
        crashes between steps, we can resume from the last known good state.
        """
        # In production: UPDATE saga_instances SET current_step = N, completed_steps = [...], updated_at = now()
        logger.info(
            "[state-store] Step '%s' completed for saga %s — state persisted",
            step_name,
            saga_id,
        )

    def save_compensation_start(self, saga_id: str) -> None:
        """Mark the saga as entering COMPENSATING state."""
        logger.warning(
            "[state-store] Saga %s entered COMPENSATING state — state persisted",
            saga_id,
        )

    def load_pending_sagas(self) -> list[RecoveredSagaState]:
        """Load all sagas that are neither COMPLETED nor FAILED.

        Called during system startup to find sagas that need recovery.
        Only returns sagas in RUNNING or COMPENSATING state — completed and failed
        sagas are left untouched (they represent terminal states).
        """
        # In production: SELECT * FROM saga_instances WHERE status IN ('RUNNING', 'COMPENSATING')
        return []

    def mark_completed(self, saga_id: str) -> None:
        """Mark the saga as COMPLETED in the durable store."""
        logger.info("[state-store] Saga %s marked as COMPLETED", saga_id)

    def mark_failed(self, saga_id: str, reason: str) -> None:
        """Mark the saga as FAILED with a reason for audit purposes."""
        logger.error("[state-store] Saga %s marked as FAILED: %s", saga_id, reason)


class SagaRecoveryManager:
    """Handles recovery of pending sagas after system restart.

    This manager runs once at application startup and periodically (every 60 seconds
    via a background job) to detect and handle pending sagas that were interrupted
    by crashes, deployments, or infrastructure failures.

    The recovery logic follows these rules:
    - If the saga has timed out → compensate all completed steps
    - If the saga is still within timeout and was in RUNNING state → resume from last step
    - If the saga was mid-compensation when interrupted → continue compensation (idempotent)
    - If the saga was in MANUAL_REVIEW state → leave for operator attention
    """

    def __init__(
        self,
        state_store: SagaStateStore,
        orchestrator_factory,  # Callable that creates new SagaOrchestrator instances
    ) -> None:
        self._state_store = state_store
        self._orchestrator_factory = orchestrator_factory

    def recover_pending_sagas(self) -> list[dict]:
        """Execute the recovery scan and handle each pending saga.

        Returns a list of recovery decisions made, with details for audit logging.
        """
        sagas = self._state_store.load_pending_sagas()
        decisions: list[dict] = []

        if not sagas:
            logger.info("[saga-recovery] No pending sagas found — system is healthy")
            return decisions

        logger.warning(
            "[saga-recovery] Found %d pending saga(s) requiring recovery",
            len(sagas),
        )

        for saga_state in sagas:
            decision = self._make_recovery_decision(saga_state)

            if decision["action"] == SagaRecoveryDecision.RESUME:
                self._resume_saga(decision, saga_state)
            elif decision["action"] == SagaRecoveryDecision.COMPENSATE:
                self._compensate_saga(decision, saga_state)
            elif decision["action"] == SagaRecoveryDecision.MANUAL_REVIEW:
                logger.critical(
                    "[saga-recovery] Saga %s requires MANUAL REVIEW — not auto-resolved",
                    saga_state.saga_instance_id,
                )

            decisions.append(decision)

        return decisions

    def _make_recovery_decision(self, saga_state: RecoveredSagaState) -> dict:
        """Determine what action to take for a pending saga.

        Decision rules:
        1. If remaining_steps == 0 → the saga is effectively complete (rescue it)
        2. If saga has timed out → compensate (the business transaction is stale)
        3. If saga was mid-compensation → continue compensation (idempotent — safe to re-run)
        4. Otherwise → resume from last completed step
        """
        if saga_state.remaining_steps == 0:
            return {
                "action": SagaRecoveryDecision.RESUME,
                "reason": "Saga is effectively complete — no remaining steps",
                "saga_id": saga_state.saga_instance_id,
            }

        # Check for timeout — in production, compare with stored timeout_seconds
        elapsed_minutes = (datetime.now(timezone.utc) - saga_state.started_at).total_seconds() / 60
        if elapsed_minutes > 60:  # Example: 1 hour total timeout for demo
            return {
                "action": SagaRecoveryDecision.COMPENSATE,
                "reason": f"Saga has been running for {elapsed_minutes:.0f} minutes — exceeded timeout",
                "saga_id": saga_state.saga_instance_id,
                "elapsed_minutes": elapsed_minutes,
            }

        return {
            "action": SagaRecoveryDecision.RESUME,
            "reason": f"Resuming saga from step {saga_state.last_completed_step_index + 1} of {saga_state.total_steps}",
            "saga_id": saga_state.saga_instance_id,
        }

    def _resume_saga(self, decision: dict, state: RecoveredSagaState) -> None:
        """Resume a saga from its last completed step."""
        logger.info(
            "[saga-recovery] Resuming saga %s: %s",
            state.saga_instance_id,
            decision["reason"],
        )
        # In production: create a new orchestrator and execute remaining steps

    def _compensate_saga(self, decision: dict, state: RecoveredSagaState) -> None:
        """Compensate a saga that has timed out or is in an unrecoverable state."""
        logger.warning(
            "[saga-recovery] Compensating timed-out saga %s: %s",
            state.saga_instance_id,
            decision["reason"],
        )
        self._state_store.save_compensation_start(state.saga_instance_id)
        # In production: instantiate orchestrator with the stored completed_steps list
        # and run compensations in reverse order. Then mark saga as FAILED.
```

---

## Constraints

### MUST DO
- **Every forward action must have a corresponding compensating action defined before implementation begins** — if you cannot articulate what happens when step 2 fails, steps 1 through N cannot execute. Write both the forward and compensation code in the same sprint or iteration; never defer compensation to "later."
- **Compensating actions must be idempotent** — calling them twice must not cause double-refunds, double-releases, or double-notifications. Use database unique constraints (e.g., `UNIQUE(correlation_id, step_name)`) or deduplication tables to enforce this at the storage layer, not just in application logic.
- **Persist saga state to durable storage after each step, not just at completion** — a crash between steps 3 and 4 must be recoverable by resuming from step 4 (or compensating if timeout exceeded). State lost mid-saga is worse than no saga at all: it creates silent data corruption.
- **Use correlation IDs that link all events and commands within a single saga instance** — this is the single most important observability practice for sagas. Every log line, metric, and distributed trace span should include the correlation ID so operators can reconstruct the entire saga lifecycle from logs alone.
- **Handle partial completion gracefully — if the system restarts mid-saga, resume from where it left off** — the recovery manager must distinguish between "running but slow" (resume) and "running but timed out" (compensate). Stale sagas that are no longer relevant must be compensated; recent ones should be resumed.
- **Design compensations as domain-specific business rules, not generic "undo" operations** — refunding a payment is not just reversing a debit; it may involve notifying the customer, issuing credit, and logging a compensation reason. Releasing inventory may require re-marketing the released stock to other customers. Each compensation is a real business action with its own semantics.

### MUST NOT DO
- **Use distributed transactions (2PC / XA) across bounded contexts** — this violates bounded context autonomy, creates tight coupling between independently deployable services, and introduces the coordinator failure problem that sagas were designed to solve. If you are tempted to reach for 2PC, re-architect using a saga instead.
- **Share database tables between the saga coordinator and participant contexts** — each bounded context must own its data. The saga coordinator communicates through commands and events only; it must never directly query or modify another context's database tables. Shared databases are an anti-pattern that destroys bounded context isolation.
- **Let a saga step fail silently and continue to the next step without compensation** — every failed step triggers immediate compensation of all previously completed steps. Continuing past a failure creates inconsistent state that no future action can reconcile. Fail loudly, compensate immediately, log everything.
- **Assume compensating actions are simple "undo" operations** — a compensation may involve sending emails, triggering manual review workflows, applying late fees, or calling external APIs for partial refunds. Write and test compensations as full business features, not afterthoughts.
- **Make the saga coordinator a single point of failure** — in orchestration mode, the coordinator is critical infrastructure. Deploy it with multiple replicas, use health checks, and implement graceful degradation (e.g., fall back to event-driven compensation if the coordinator is unavailable).

---

## Output Template

When implementing or reviewing a cross-domain saga workflow, produce:

1. **Context Participation Map** — A table listing every bounded context involved, its forward command, its compensating action, and whether it uses an internal or external API. Include timeout configuration for each context (external APIs get longer timeouts).

2. **Saga Flow Diagram** — ASCII art showing the forward sequence (left-to-right) and compensation sequence (right-to-left), with explicit failure branches at every step showing which compensations are triggered.

3. **State Schema Definition** — The saga state table definition (SQL DDL or ORM model) including all fields necessary for resumption, timeout detection, and audit logging.

4. **Implementation Code** — Either an orchestration-based coordinator class (for complex sagas with 4+ steps) or a choreography event router with context-specific event handlers (for linear flows). Include both forward actions and compensation functions in the code.

5. **Recovery Handler** — A startup recovery function that scans for pending sagas, makes resume/compensate decisions based on timeout status, and logs every action taken.

6. **Observability Configuration** — List of metrics to emit (saga_step_duration, saga_completion_rate, saga_compensation_count, saga_timeout_count) and log correlation ID injection points.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Bounded context boundaries that define where each saga participant lives — sagas operate between these contexts |
| `ddd-context-mapping` | Context relationship patterns (ACL, published language) that inform how sagas communicate across contexts without violating autonomy |
| `event-driven-patterns` | Event bus, pub/sub, and outbox infrastructure used by choreographed sagas for decentralized coordination |
| `cqrs-pattern` | Separate read models for tracking saga progress visible to business users — enables the "where is my order?" query pattern |
| `domain-events` | In-process event definitions that cross the context boundary as integration events — the atomic unit of saga communication |

---

## Further Reading

- [Saga Pattern — Microservices.io](https://microservices.io/patterns/data/saga.html) — Martin Fowler's authoritative reference on saga patterns, including orchestration and choreography approaches
- [Microservices Patterns](https://www.manning.com/books/microservices-patterns) by Chris Richardson — Chapter 7 covers sagas in depth with real-world implementations and compensation design guidance
- [Distributed Transactions with Sagas — Microsoft Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga) — Microsoft's reference architecture for implementing sagas in cloud environments
- [Event Sourcing and DDD Patterns (GitHub)](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda) — Open-source implementation of saga patterns combined with event sourcing, CQRS, and hexagonal architecture
- [Outbox Pattern — Martin Fowler](https://martinfowler.com/articles/201607-event-sourcing.html#ACIDTransactionsWithEvents) — The outbox pattern that guarantees saga events are delivered atomically with state changes
- [Choreography vs Orchestration in Microservices](https://www.infoq.com/articles/microservices-choreography-vs-orchestration/) — Comparative analysis of when each coordination style is appropriate
