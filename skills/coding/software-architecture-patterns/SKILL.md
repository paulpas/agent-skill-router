---
name: software-architecture-patterns
description: Implements proven software architecture patterns (CQRS, Event Sourcing, Hexagonal/Clean Architecture, layered architecture, DDD aggregates) for building maintainable enterprise systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: architecture patterns, CQRS, event sourcing, hexagonal architecture, clean architecture, layered architecture, DDD, domain-driven design, aggregate roots, bounded context, how do i structure my application, software architecture, event-driven architecture, port and adapter, onion architecture, read model, write model, sagas
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: engineering-principles, engineering-api-design, ddd-context-mapping
---

# Software Architecture Patterns

Implements proven software architecture patterns for structuring enterprise applications into maintainable, testable systems. When loaded, the model acts as a senior software architect selecting and applying architectural patterns (CQRS, Event Sourcing, Hexagonal/Clean Architecture, layered architecture) to decompose complex domains while keeping infrastructure concerns isolated from business logic.

## TL;DR Checklist

- [ ] Keep domain logic free of framework dependencies — inject infrastructure through ports
- [ ] Separate read and write models explicitly in CQRS — never share command/query handlers
- [ ] Store events, not state, as the source of truth when using Event Sourcing
- [ ] Implement aggregates with a single root — no cross-aggregate references allowed
- [ ] Use domain events to communicate between bounded contexts, not direct method calls

---

## When to Use

Use this skill when:

- Designing a new enterprise application and choosing an architectural style (hexagonal, layered, CQRS)
- Refactoring a monolithic service that has become difficult to test or extend due to tangled dependencies
- Implementing event sourcing to maintain complete audit trails of business decisions
- Decomposing a monolith into bounded contexts with clear aggregation boundaries
- Building systems where read performance requirements differ significantly from write patterns (use CQRS)
- Introducing Domain-Driven Design aggregates into an existing codebase that uses ORM entities directly

---

## When NOT to Use

Avoid these patterns for:

- Simple CRUD applications with no complex business rules — a flat layered architecture is sufficient
- Microservice decomposition decisions — this skill covers internal application structure, not service boundaries
- Real-time collaborative systems with high-contention shared state — consider CRDTs instead of event sourcing
- When the team lacks DDD experience — Event Sourcing and CQRS add significant cognitive overhead that requires training to use correctly
- Prototyping or proof-of-concept projects where speed matters more than long-term maintainability

---

## Core Workflow

1. **Analyze Domain Complexity** — Determine whether the domain is truly complex enough to warrant an advanced architecture pattern. Apply the DDD complexity heuristic: if the domain has rich business rules, multiple stakeholder perspectives, and evolving requirements, lean toward hexagonal or CQRS. **Checkpoint:** If you can describe all use cases in fewer than 10 user stories with no cross-cutting state mutations, a simple layered architecture is likely sufficient.

2. **Select Architecture Pattern** — Match the domain characteristics to the appropriate pattern:
   - Rich domain logic + infrastructure isolation needed → Hexagonal/Clean Architecture
   - Separate read/write scaling needs or audit requirements → CQRS (with optional Event Sourcing)
   - Complete state history + regulatory compliance → Event Sourcing (on top of CQRS)
   - Simple bounded context with clear boundaries → Layered Architecture
   **Checkpoint:** Do not stack patterns unnecessarily — CQRS + Event Sourcing on top of Hexagonal is 3 layers of abstraction that compound complexity.

3. **Define Ports and Adapters** — For hexagonal/clean architecture:
   - Identify primary ports (interfaces the domain defines)
   - Identify secondary ports (interfaces infrastructure implements)
   - Ensure domain package has zero imports from framework packages
   **Checkpoint:** Run an import dependency check — domain code must never import from `infrastructure`, `controllers`, or `adapters` packages.

4. **Implement Aggregates** — For DDD aggregate patterns:
   - Each aggregate has exactly one root entity that controls all modifications
   - Other aggregates reference the root by ID, never by object reference
   - All invariants within an aggregate are enforced at commit time
   **Checkpoint:** Every public method on an aggregate root must validate its own invariants — no external validator is allowed.

5. **Wire Infrastructure as Dependencies** — Inject repositories, message brokers, and external services:
   - Repositories are ports (interfaces), not ORM abstractions
   - Domain events are published to an in-memory event bus during unit tests
   - Infrastructure adapters implement the port interfaces
   **Checkpoint:** The application bootstrap should compose the entire dependency graph at startup — no `new` keyword for infrastructure services inside domain logic.

---

## Implementation Patterns

### Pattern 1: Hexagonal Architecture (Clean Architecture)

```python
"""Hexagonal (Ports and Adapters) architecture implementation.

Domain logic lives in pure Python with no framework dependencies.
Infrastructure is injected through port interfaces, making the entire
domain testable with in-memory adapters.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid


# ===== DOMAIN LAYER (no imports from infrastructure) =====

class AccountStatus(Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CLOSED = "closed"


@dataclass
class Money:
    """Value object representing currency amount. Immutable by design."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError(f"Negative amounts are not allowed: {self.amount}")
        if self.currency.upper() not in ("USD", "EUR", "GBP"):
            raise ValueError(f"Unsupported currency: {self.currency}")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add different currencies: {self.currency} vs {other.currency}"
            )
        return Money(round(self.amount + other.amount, 2), self.currency)

    def __sub__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot subtract different currencies: {self.currency} vs {other.currency}"
            )
        diff = round(self.amount - other.amount, 2)
        if diff < 0:
            raise ValueError(f"Insufficient funds: have {self.amount}, need {abs(diff)}")
        return Money(diff, self.currency)


@dataclass
class AccountId:
    """Value object for account identifiers. Enforces UUID format."""
    value: str = field(default_factory=lambda: str(uuid.uuid4()))

    def __post_init__(self) -> None:
        if not self.value or len(self.value) != 36:
            raise ValueError("AccountId must be a valid UUID string")


@dataclass
class Account:
    """Aggregate root for the banking domain.
    
    All invariants are enforced here. The aggregate controls its own state
    through intentional methods — never direct attribute mutation.
    """
    id: AccountId
    owner_name: str
    balance: Money
    status: AccountStatus = AccountStatus.ACTIVE
    
    # Internal state tracking
    _version: int = field(default=0, init=False)

    def deposit(self, amount: Money) -> None:
        """Deposit funds into the account. Enforces currency matching and non-negative amounts."""
        self.balance = self.balance + amount
        self._version += 1

    def withdraw(self, amount: Money) -> None:
        """Withdraw funds from the account. Enforces sufficient balance."""
        self.balance = self.balance - amount
        self._version += 1

    def freeze(self) -> None:
        """Freeze the account — no further transactions allowed until unfrozen."""
        if self.status == AccountStatus.CLOSED:
            raise RuntimeError(f"Cannot freeze a closed account (id={self.id.value})")
        self.status = AccountStatus.FROZEN
        self._version += 1

    def close(self) -> None:
        """Close the account — only allowed if balance is zero."""
        if self.balance.amount > 0:
            raise RuntimeError(
                f"Cannot close account with non-zero balance: {self.balance.amount} {self.balance.currency}"
            )
        self.status = AccountStatus.CLOSED
        self._version += 1

    def can_transact(self) -> bool:
        """Check if the account is in a transactable state."""
        return self.status == AccountStatus.ACTIVE


# ===== PORT LAYER (interfaces defined by domain, not implemented here) =====

class AccountRepository(ABC):
    """Port interface for account persistence.
    
    The domain defines this interface. Infrastructure adapters implement it.
    This keeps domain logic completely decoupled from storage technology.
    """
    @abstractmethod
    def get_by_id(self, account_id: AccountId) -> Optional[Account]: ...

    @abstractmethod
    def save(self, account: Account) -> None: ...

    @abstractmethod
    def find_by_owner_name(self, owner_name: str) -> list[Account]: ...


class EmailService(ABC):
    """Port interface for email notifications.
    
    Domain depends on the abstraction, not on SMTP or any email provider.
    """
    @abstractmethod
    def send_account_closed(self, account_id: AccountId, owner_name: str) -> None: ...

    @abstractmethod
    def send_fraud_alert(self, account_id: AccountId, details: str) -> None: ...


# ===== APPLICATION LAYER (orchestrates use cases using ports) =====

class AccountService:
    """Application service that orchestrates domain logic through port interfaces.
    
    This layer has no business rules — it wires together domain objects and
    infrastructure adapters to execute a complete use case.
    """
    
    def __init__(
        self,
        repository: AccountRepository,
        email_service: EmailService,
        max_daily_withdrawal: Money = Money(10000.00)
    ) -> None:
        self.repository = repository
        self.email_service = email_service
        self.max_daily_withdrawal = max_daily_withdrawal

    def create_account(self, owner_name: str, initial_deposit: Money) -> Account:
        """Create a new account with an initial deposit.
        
        Args:
            owner_name: Full legal name of the account holder
            initial_deposit: Initial funds to deposit
            
        Returns:
            The newly created Account aggregate
        """
        account = Account(
            id=AccountId(),
            owner_name=owner_name,
            balance=initial_deposit,
        )
        self.repository.save(account)
        return account

    def close_account(self, account_id: AccountId) -> None:
        """Close an account with zero balance and send notification."""
        account = self._load_or_raise(account_id)
        
        # Enforce business rules through domain methods
        account.close()
        self.repository.save(account)
        
        # Send notification — domain event handling lives here
        self.email_service.send_account_closed(account_id, account.owner_name)

    def freeze_account(self, account_id: AccountId, reason: str) -> None:
        """Freeze an account due to suspicious activity."""
        account = self._load_or_raise(account_id)
        
        account.freeze()
        self.repository.save(account)
        
        self.email_service.send_fraud_alert(account_id, reason)

    def transfer(self, from_id: AccountId, to_id: AccountId, amount: Money) -> None:
        """Transfer funds between accounts as a single transaction."""
        if amount.currency != "USD":
            raise ValueError("Transfers must be in USD")
            
        source = self._load_or_raise(from_id)
        destination = self._load_or_raise(to_id)
        
        # Enforce all invariants through domain methods
        source.withdraw(amount)
        destination.deposit(amount)
        
        # Save both in the same transaction context
        self.repository.save(source)
        self.repository.save(destination)

    def _load_or_raise(self, account_id: AccountId) -> Account:
        """Load an account or raise if not found."""
        account = self.repository.get_by_id(account_id)
        if not account:
            raise ValueError(f"Account not found: {account_id.value}")
        return account


# ===== INFRASTRUCTURE ADAPTER LAYER (implements port interfaces) =====

class InMemoryAccountRepository(AccountRepository):
    """In-memory repository for testing and development.
    
    Implements the AccountRepository port. Suitable for unit tests where
    a real database is not needed.
    """
    
    def __init__(self) -> None:
        self._store: dict[str, Account] = {}

    def get_by_id(self, account_id: AccountId) -> Optional[Account]:
        return self._store.get(account_id.value)

    def save(self, account: Account) -> None:
        self._store[account.id.value] = account

    def find_by_owner_name(self, owner_name: str) -> list[Account]:
        return [acc for acc in self._store.values() if acc.owner_name == owner_name]


class InMemoryEmailService(EmailService):
    """In-memory email service for testing — records sent messages."""
    
    def __init__(self) -> None:
        self.sent_messages: list[dict] = []

    def send_account_closed(self, account_id: AccountId, owner_name: str) -> None:
        self.sent_messages.append({
            "type": "account_closed",
            "account_id": account_id.value,
            "owner_name": owner_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def send_fraud_alert(self, account_id: AccountId, details: str) -> None:
        self.sent_messages.append({
            "type": "fraud_alert",
            "account_id": account_id.value,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
```

### Pattern 2: CQRS with Separate Read/Write Models (BAD vs. GOOD)

```python
# ❌ BAD: Single model handles both commands and queries
class BadOrderService:
    """Monolithic service that mixes read and write concerns.
    
    Problems:
    - Read queries require JOINs across multiple tables for performance
    - Write path is blocked by read query latency
    - Cannot scale readers and writers independently
    - Complex queries pollute the write model with UI-specific logic
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    # This method does BOTH: reads related data AND modifies state
    def cancel_order(self, order_id: int) -> dict:
        # Read path mixed into command — joins for display info
        order = self.db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.customer)
        ).filter(Order.id == order_id).first()
        
        if not order or order.status != "confirmed":
            return {"error": "Cannot cancel"}
        
        # Write path — modifies state
        order.status = "cancelled"
        order.cancelled_at = datetime.utcnow()
        
        # Refund items — write logic
        for item in order.items:
            self.db.query(Inventory).filter(
                Inventory.sku == item.sku
            ).update({"quantity": Inventory.quantity + item.qty})
        
        self.db.commit()
        return {"status": "cancelled"}


# ✅ GOOD: Separate command handler (write model) and query handler (read model)
from dataclasses import dataclass, field
from typing import Any
import enum


class OrderStatus(enum.Enum):
    CREATED = "created"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class CancelOrderCommand:
    """Immutable command object — the only input to a write operation."""
    order_id: int
    reason: str
    operator_id: int


@dataclass
class OrderQueryResult:
    """Projected read model for order detail views."""
    order_id: int
    customer_name: str
    items: list[dict] = field(default_factory=list)
    total_amount: float = 0.0
    status: str = "created"


class WriteModelRepository:
    """Port for write-model persistence — stores the canonical state."""
    
    @abstractmethod
    def get_order(self, order_id: int) -> Any: ...
    @abstractmethod
    def save(self, order: Any) -> None: ...


class OrderCommandHandler:
    """Command handler — processes write operations on the write model.
    
    Contains only business rules and state mutations. No JOIN queries,
    no UI-specific projections. The write model is optimized for
    consistency, not query performance.
    """
    
    def __init__(self, repository: WriteModelRepository) -> None:
        self.repository = repository

    def handle(self, command: CancelOrderCommand) -> dict:
        """Execute the cancel order command on the write model."""
        order = self.repository.get_order(command.order_id)
        
        if not order:
            raise ValueError(f"Order {command.order_id} not found")
        
        if order.status != OrderStatus.CONFIRMED:
            raise RuntimeError(
                f"Cannot cancel order in {order.status.value} state"
            )
        
        # Apply domain rule
        order.status = OrderStatus.CANCELLED
        order.cancel_reason = command.reason
        order.cancelled_by = command.operator_id
        
        self.repository.save(order)
        return {"status": "cancelled", "order_id": command.order_id}


class ReadModelRepository:
    """Port for read-model persistence — optimized queries for display."""
    
    @abstractmethod
    def get_order_detail(self, order_id: int) -> OrderQueryResult: ...


class OrderQueryHandler:
    """Query handler — reads from the read model.
    
    The read model is a denormalized projection updated by domain events.
    Queries are fast because they hit pre-joined tables or materialized views.
    """
    
    def __init__(self, repository: ReadModelRepository) -> None:
        self.repository = repository

    def get_order_detail(self, order_id: int) -> OrderQueryResult:
        """Get detailed order view — fast read from denormalized projection."""
        result = self.repository.get_order_detail(order_id)
        
        if not result:
            raise ValueError(f"Order {order_id} not found in read model")
        
        return result


# Event-driven projection that keeps read model in sync with write model
class OrderProjectionHandler:
    """Handles domain events to update the read model projection.
    
    When a CANCEL_ORDER command succeeds on the write side, it publishes an
    OrderCancelled event. This handler listens and updates the read model.
    """
    
    def __init__(self, read_repo: ReadModelRepository) -> None:
        self.read_repo = read_repo

    def on_order_cancelled(self, order_id: int, reason: str) -> None:
        """Update read model projection when an order is cancelled."""
        self.read_repo.update_order_status(order_id, "cancelled", reason)

    def on_order_confirmed(self, order_id: int) -> None:
        """Update read model when order moves to confirmed state."""
        self.read_repo.update_order_status(order_id, "confirmed")


# ❌ BAD: Coupling the read and write models directly
def bad_cancellation_with_projection(
    db_session,  # Direct ORM access in command handler
    event_bus,
    order_id: int,
    reason: str
):
    """Tightly couples write model operations with projection logic."""
    order = db_session.query(Order).get(order_id)
    
    if not order or order.status != "confirmed":
        return {"error": "Cannot cancel"}
    
    # Write — but also directly manages projection in the same transaction
    order.status = "cancelled"
    db_session.commit()
    
    # Projection logic tightly coupled with write path
    # If this fails, the write is already committed — inconsistency!
    db_session.execute(
        "UPDATE order_projections SET status = 'cancelled' WHERE order_id = :oid",
        {"oid": order_id}
    )
    db_session.commit()


# ✅ GOOD: Clean CQRS — commands and queries are completely separate
def good_cqrs_workflow(
    command_handler: OrderCommandHandler,
    query_handler: OrderQueryHandler,
    projection_handler: OrderProjectionHandler,
    event_bus: Any,
    order_id: int,
    reason: str,
    operator_id: int
) -> dict:
    """CQRS workflow with clean separation of read and write paths.
    
    The command handler processes the write (command) path.
    Domain events are published and handled asynchronously to update the read projection.
    Queries hit a separate read model that stays in sync via events.
    """
    # WRITE PATH: Execute the command on the write model
    command = CancelOrderCommand(order_id, reason, operator_id)
    result = command_handler.handle(command)  # Contains business rules only
    
    # Publish domain event — projection handlers update read model independently
    event_bus.publish(OrderCancelledEvent(
        order_id=order_id,
        reason=reason,
        timestamp=datetime.utcnow().isoformat()
    ))
    
    # READ PATH: Query the read model for display (could be called after event propagation)
    detail = query_handler.get_order_detail(order_id)
    
    return {
        "command_result": result,
        "read_model": {
            "order_id": detail.order_id,
            "status": detail.status,
            "customer_name": detail.customer_name,
        }
    }
```

### Pattern 3: Event Sourcing with Snapshots

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Protocol


# ===== EVENT STORE PORT =====

class EventStore(Protocol):
    """Port interface for event persistence.
    
    The domain stores events, not state. The event store is an infrastructure
    adapter that persists the append-only event log.
    """
    
    def save_events(self, aggregate_id: str, events: list, expected_version: int) -> None:
        """Save new events with optimistic concurrency control.
        
        Args:
            aggregate_id: Unique identifier for the aggregate root
            events: List of new domain events to append
            expected_version: The version number we expect the aggregate to be at
            
        Raises:
            ConcurrencyError: If another writer modified the aggregate between read and write
        """
        ...
    
    def load_events(self, aggregate_id: str) -> list:
        """Load all events for an aggregate to reconstruct its state."""
        ...

    def save_snapshot(self, aggregate_id: str, snapshot_data: dict, version: int) -> None:
        """Save a point-in-time snapshot of aggregate state.
        
        Snapshots reduce reconstruction time by skipping old events.
        They must be saved at regular intervals (e.g., every 50 events).
        """
        ...

    def load_snapshot(self, aggregate_id: str) -> tuple[dict, int] | None:
        """Load the latest snapshot and its version number."""
        ...


class ConcurrencyError(Exception):
    """Raised when concurrent modifications conflict with expected state."""
    pass


# ===== DOMAIN EVENTS =====

class EventType(str, Enum):
    ORDER_CREATED = "order_created"
    ORDER_ITEM_ADDED = "order_item_added"
    ORDER_CANCELLED = "order_cancelled"


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events. Immutable by design."""
    aggregate_id: str
    event_type: str
    timestamp: datetime = field(default_factory=lambda: datetime.utcnow())
    version: int = 0

    @property
    def metadata(self) -> dict:
        return {"aggregate_id": self.aggregate_id, "event_type": self.event_type}


@dataclass(frozen=True)
class OrderCreatedEvent(DomainEvent):
    order_id: str
    customer_id: str
    items: list[dict]
    
    event_type: str = EventType.ORDER_CREATED.value


@dataclass(frozen=True)
class OrderItemAddedEvent(DomainEvent):
    item_sku: str
    quantity: int
    unit_price: float
    
    event_type: str = EventType.ORDER_ITEM_ADDED.value


@dataclass(frozen=True)
class OrderCancelledEvent(DomainEvent):
    reason: str
    
    event_type: str = EventType.ORDER_CANCELLED.value


# ===== AGGREGATE ROOT (Event Sourced) =====

@dataclass
class OrderAggregate:
    """Event-sourced aggregate root for the order domain.
    
    State is never set directly — it is always reconstructed by replaying
    events through apply_* methods. This guarantees that every state change
    has an audit trail in the event log.
    """
    
    id: str
    customer_id: str = ""
    items: list[dict] = field(default_factory=list)
    status: str = "created"
    version: int = 0
    
    # Pending events to be persisted
    _pending_events: list[DomainEvent] = field(default_factory=list)
    
    # Invariant enforcement state
    _max_items: int = 100
    _max_total_price: float = 10000.0

    @classmethod
    def create_new(
        cls,
        order_id: str,
        customer_id: str,
        items: list[dict]
    ) -> "OrderAggregate":
        """Factory method to create a new order from scratch.
        
        Creates the aggregate by applying the OrderCreatedEvent through
        the apply pattern — no direct attribute setting.
        """
        aggregate = cls(id=order_id)
        created_event = OrderCreatedEvent(
            aggregate_id=order_id,
            customer_id=customer_id,
            items=items,
        )
        aggregate._apply(created_event)
        return aggregate

    @classmethod
    def from_events(cls, events: list[DomainEvent]) -> "OrderAggregate":
        """Reconstruct aggregate state by replaying all historical events."""
        aggregate = cls(id="")
        
        for event in events:
            aggregate.id = event.aggregate_id
            apply_method = getattr(aggregate, f"_apply_{event.event_type}", None)
            if apply_method is None:
                raise ValueError(f"Unknown event type: {event.event_type}")
            apply_method(event)
        
        return aggregate

    def add_item(self, sku: str, quantity: int, unit_price: float) -> None:
        """Add an item to the order. Enforces all invariants."""
        self._validate_order_not_closed()
        self._validate_item_count(quantity)
        self._validate_total_price(unit_price * quantity)
        
        event = OrderItemAddedEvent(
            aggregate_id=self.id,
            item_sku=sku,
            quantity=quantity,
            unit_price=unit_price,
            version=self.version + 1,
        )
        self._apply(event)

    def cancel(self, reason: str) -> None:
        """Cancel the order with a documented reason."""
        self._validate_order_not_closed()
        
        event = OrderCancelledEvent(
            aggregate_id=self.id,
            reason=reason,
            version=self.version + 1,
        )
        self._apply(event)

    def get_pending_events(self) -> list[DomainEvent]:
        """Return all events that have not yet been persisted to the event store."""
        return list(self._pending_events)

    def clear_pending_events(self) -> None:
        """Acknowledge that pending events have been persisted."""
        self._pending_events.clear()

    # ===== Internal apply methods (state mutation via events only) =====
    
    def _apply(self, event: DomainEvent) -> None:
        """Route event to the appropriate handler."""
        method_name = f"_apply_{event.event_type}"
        handler = getattr(self, method_name, None)
        if handler is None:
            raise ValueError(f"No apply handler for event type: {event.event_type}")
        handler(event)

    def _apply_order_created(self, event: OrderCreatedEvent) -> None:
        self.customer_id = event.customer_id
        self.items = event.items
        self.status = "created"
        self.version += 1
        self._pending_events.append(event)

    def _apply_order_item_added(self, event: OrderItemAddedEvent) -> None:
        self.items.append({
            "sku": event.item_sku,
            "quantity": event.quantity,
            "unit_price": event.unit_price,
        })
        self.version += 1
        self._pending_events.append(event)

    def _apply_order_cancelled(self, event: OrderCancelledEvent) -> None:
        self.status = "cancelled"
        self.version += 1
        self._pending_events.append(event)

    # ===== Invariant validation =====
    
    def _validate_order_not_closed(self) -> None:
        if self.status != "created":
            raise RuntimeError(
                f"Cannot modify order in {self.status} state (id={self.id})"
            )

    def _validate_item_count(self, quantity: int) -> None:
        total_items = sum(item["quantity"] for item in self.items) + quantity
        if total_items > self._max_items:
            raise ValueError(
                f"Order would exceed maximum item count ({total_items} > {self._max_items})"
            )

    def _validate_total_price(self, line_item_total: float) -> None:
        current_total = sum(
            item["unit_price"] * item["quantity"] for item in self.items
        ) + line_item_total
        if current_total > self._max_total_price:
            raise ValueError(
                f"Order total {current_total} exceeds maximum {self._max_total_price}"
            )

    # ===== Snapshot serialization =====
    
    def to_snapshot(self) -> dict:
        """Serialize aggregate state for snapshot storage."""
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "items": self.items,
            "status": self.status,
            "version": self.version,
        }

    @classmethod
    def from_snapshot(cls, data: dict) -> "OrderAggregate":
        """Reconstruct aggregate from a snapshot (partial state)."""
        instance = cls(
            id=data["id"],
            customer_id=data.get("customer_id", ""),
            items=list(data.get("items", [])),
            status=data.get("status", "created"),
            version=data["version"],
        )
        return instance


# ❌ BAD: Event sourcing without optimistic concurrency — lost updates
def bad_event_sourcing_save(aggregate: OrderAggregate, store: EventStore) -> None:
    """Saves events without version checking. Last write wins."""
    events = aggregate.get_pending_events()
    if not events:
        return
    
    # ⚠️ No expected_version parameter — concurrent modifications silently lost
    store.save_events(aggregate.id, events, 0)  # Always passes version 0!
    aggregate.clear_pending_events()


# ✅ GOOD: Event sourcing with optimistic concurrency + snapshots
def good_event_sourcing_save(
    aggregate: OrderAggregate, 
    store: EventStore,
    snapshot_interval: int = 50
) -> None:
    """Save events with proper optimistic concurrency control and snapshot management.
    
    Uses expected_version to detect concurrent modifications (lost update prevention).
    Automatically saves snapshots at configured intervals to reduce reconstruction time.
    """
    events = aggregate.get_pending_events()
    if not events:
        return
    
    # Optimistic concurrency — detect lost updates
    try:
        store.save_events(aggregate.id, events, expected_version=aggregate.version - len(events))
    except ConcurrencyError:
        raise RuntimeError(
            f"Concurrency conflict for aggregate {aggregate.id}. "
            "The aggregate was modified by another process since it was loaded. "
            "Reload and retry the operation."
        )
    
    # Save snapshot at regular intervals to speed up future reconstruction
    if aggregate.version % snapshot_interval == 0:
        store.save_snapshot(aggregate.id, aggregate.to_snapshot(), aggregate.version)
    
    aggregate.clear_pending_events()
```

---

## Constraints

### MUST DO
- Keep domain logic completely free of framework and infrastructure dependencies — the domain package must have zero imports from `infrastructure`, `controllers`, or `adapters` directories
- Define ports as interfaces (abstract base classes or Protocol types) in the domain layer; implement them only in infrastructure adapters
- In CQRS, never share command and query handlers — commands modify state, queries project state. Mixing them defeats the purpose.
- In Event Sourcing, use optimistic concurrency control on every `save_events` call — lost updates are a data integrity risk
- Enforce aggregate boundaries: one aggregate root per transaction, no cross-aggregate references (use IDs, not object references)
- Name all domain events in past tense (`OrderCreated`, `PaymentProcessed`) to accurately describe what already happened

### MUST NOT DO
- Inject ORM models into the domain layer — repositories are interfaces, not SQLAlchemy/TypeORM classes
- Use CQRS for simple CRUD applications — the separation of read and write paths adds 2-3x more code with no benefit for basic operations
- Store mutable state in event objects — all domain events must be immutable (use frozen dataclasses or records)
- Create aggregates that require loading other aggregates to maintain invariants — this violates the aggregate boundary principle
- Use Event Sourcing without snapshots for aggregates that accumulate thousands of events — reconstruction latency becomes unacceptable
- Place business validation logic in controllers, services, or DTOs — all invariants belong inside aggregate roots

---

## Related Skills

| Skill | Purpose |
|---|---|
| `engineering-principles` | SOLID/DRY/YAGNI principles and GoF design patterns — use for component-level code organization within each architecture pattern |
| `engineering-api-design` | API boundary design between services or modules — use when designing the external interface of your architectural layers |
| `ddd-context-mapping` | Bounded context decomposition and mapping strategies — use alongside this skill when decomposing complex domains into contexts |

---

## Live References

> Authoritative documentation links for this skill's domain.

- [Domain-Driven Design by Eric Evans (Blue Book)](https://domainlanguage.com/ddd/)
- [Martin Fowler: CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing — Microsoft Architecture Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Hexagonal Architecture — Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [DDD Quick Reference — Vaughn Vernon (Red Book)](https://domainlanguage.com/ddd/reference/)
- [Axon Framework Documentation](https://docs.axoniq.io/reference-guide/)
- [Event Sourcing vs. Traditional State Persistence](https://codeopinion.com/event-sourcing-vs-state-based/)
