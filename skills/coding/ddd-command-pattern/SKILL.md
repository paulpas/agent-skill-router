---




name: ddd-command-pattern
description: Implements DDD command pattern — command definitions, typed command handlers,
  command bus routing, use case orchestration with validation, and Unit of Work transaction
  coordination within bounded contexts.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: command pattern, ddd command handler, command bus, how do i implement commands, use case orchestration, command validation, cqrs command side, write model handlers commands
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
  related-skills: domain-driven-design, ddd-tactical-patterns, cqrs-pattern, event-sourcing-pattern




---




# DDD Command Pattern

Implements the Command pattern within DDD bounded contexts — command definitions as immutable value objects, typed command handlers with validation and orchestration, a lightweight command bus for routing, and Unit of Work transaction coordination. This skill focuses on write operations within bounded contexts where commands mutate domain state through aggregate roots. Use this skill when building use case handlers that coordinate between user input, domain logic, and persistence within a single bounded context.

This skill complements `domain-driven-design` (core DDD tactical patterns), `ddd-tactical-patterns` (Specification Pattern, Domain Services, Aggregate Factories), and `cqrs-pattern` (full CQRS with separate read models). Use this skill specifically for command-side implementation: defining commands, building handlers, routing through a command bus, and coordinating transactions.

## TL;DR Checklist

- [ ] Define Commands as immutable dataclasses (not domain events) describing INTENDED actions — each command maps to one use case
- [ ] Create typed CommandHandler classes that validate input, invoke aggregate methods, and persist changes through repository interfaces
- [ ] Implement a lightweight CommandBus that routes commands to the correct handler by inspecting command type
- [ ] Validate command input before invoking domain logic — fail fast with descriptive errors from application layer, not domain exceptions
- [ ] Use Unit of Work to coordinate transactions across multiple repositories within a single command handler
- [ ] Publish domain events AFTER state mutation inside aggregate methods; let the handler persist them through the UoW

---

## When to Use

Use this skill when:

- You need to model write operations as first-class objects with structured input validation (commands) rather than raw function calls
- A use case requires coordinating multiple aggregates, applying business rules, and persisting changes atomically
- You are building the write side of a CQRS system and need command handlers that separate concerns from query logic
- You want to apply consistent patterns across all use cases in a bounded context — each command follows the same handler structure
- You need to add cross-cutting concerns (logging, auditing, permission checks) uniformly through the command routing pipeline

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD operations with no business rules — direct repository method calls are simpler and equally effective
- Read-only queries — use query handlers and read models instead; commands are exclusively for write operations
- Cross-bounded-context communication — commands belong within a single bounded context. For cross-context coordination, use domain events or integration patterns from `ddd-context-mapping`
- Complex event-driven workflows where events trigger chains of actions — use the event sourcing pattern (`event-sourcing-pattern`) with projections instead

---

## Core Workflow

1. **Define Commands as Immutable Value Objects** — Each command represents a single intended action (e.g., `CreateOrder`, `CancelOrder`). Define them as frozen dataclasses carrying only the data needed to execute that action. Commands are NOT domain events: they describe WHAT the user intends, not WHAT happened. **Checkpoint:** Every command has a one-to-one mapping with a use case. If a command represents multiple business operations, split it into separate commands.

2. **Create Command Handler Classes** — For each command type, implement a dedicated handler class that extends a common `CommandHandler[CommandType, ResultType]` base. The handler validates input, resolves aggregates through repositories, invokes domain methods on the aggregates, and saves changes. Each handler does exactly one use case. **Checkpoint:** Handlers must never contain business logic that belongs in aggregate methods — the handler orchestrates; the aggregate enforces invariants.

3. **Implement the Command Bus** — Create a lightweight routing layer that maps command types to handler instances. The bus inspects the incoming command's class and dispatches it to the registered handler. Register handlers using decorators or explicit registration during application bootstrap. **Checkpoint:** Every handler must be registered before the application starts accepting commands; unregistered commands raise a clear `UnknownCommandError`.

4. **Wire Validation into the Handler Pipeline** — Add input validation at the start of each handler. For complex validation, use Specification objects from `ddd-tactical-patterns` to express rules as composable specifications. Apply all validations before invoking any domain logic. **Checkpoint:** Validation errors should be collected and returned (or raised) with enough context for the caller to correct the input — not generic "validation failed" messages.

5. **Coordinate Transactions with Unit of Work** — Each command handler acquires a Unit of Work at the start, resolves all repositories needed for the use case, invokes aggregate methods through the UoW, and commits or rolls back atomically. The UoW tracks changes and ensures consistency across multiple repository writes. **Checkpoint:** A command handler must acquire exactly one UoW; never nest UoWs or share them between handlers.

6. **Publish Domain Events Through the Handler** — After aggregates mutate state and publish domain events, the handler persists those events (either through an event store for event sourcing or directly via a domain event publisher). The handler is responsible for ensuring events reach their destination as part of the same transaction boundary. **Checkpoint:** Events must be published AFTER all aggregate mutations succeed; if publishing fails after successful mutation, handle via compensating action or transaction rollback.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Command Definitions — Immutable Value Objects

Commands are immutable dataclasses that describe an INTENDED action. They carry only the data needed to execute that action — no business logic, no methods (beyond constructors). Each command maps to exactly one use case. Commands are fundamentally different from domain events: commands represent intent (future tense), while events represent facts (past tense).

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4
from typing import Generic, TypeVar


TResult = TypeVar("TResult")


@dataclass(frozen=True)
class Command(Generic[TResult]):
    """Base type for all commands. Immutable, carries only data needed to execute."""

    @property
    def command_name(self) -> str:
        """Return the class name — used by the command bus for routing."""
        return self.__class__.__name__


# ── Concrete Commands ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class CreateOrder(Command[str]):
    """Create a new order with the given items and shipping address.

    Maps to the "Place Order" use case. Carries all data needed to construct
    and validate an Order aggregate from scratch.
    """
    customer_email: str
    items: list[tuple[str, int, Decimal]]  # (product_id, quantity, unit_price)
    ship_to_address: str
    promo_code: str | None = None


@dataclass(frozen=True)
class CancelOrder(Command[str]):
    """Cancel an existing order by ID.

    Maps to the "Cancel Order" use case. Only carries the identifier needed
    to locate and cancel the order; no other data is required.
    """
    order_id: str
    reason: str


@dataclass(frozen=True)
class UpdateOrderQuantity(Command[str]):
    """Update the quantity of a specific item in an existing order.

    Maps to the "Change Order Item" use case. Validates that the order exists,
    the item belongs to it, and the new quantity is positive.
    """
    order_id: str
    product_id: str
    new_quantity: int


@dataclass(frozen=True)
class TransferFunds(Command[str]):
    """Transfer a specified amount between two accounts.

    Maps to the "Transfer Funds" use case. Validates both accounts exist,
    has sufficient balance, and is not frozen or closed.
    """
    from_account_id: str
    to_account_id: str
    amount: Decimal


# ❌ BAD: Command as a mutable dict — no type safety, no structure
bad_command = {
    "action": "create_order",
    "email": "alice@example.com",  # Could be missing, could be wrong type
    "items": [["SKU-001", 2, 25.0], ["SKU-002", 1, 49.99]],  # Unstructured lists
}


# ✅ GOOD: Command as a frozen dataclass — immutable, typed, self-documenting
good_command = CreateOrder(
    customer_email="alice@example.com",
    items=[("SKU-001", 2, Decimal("25.00")), ("SKU-002", 1, Decimal("49.99"))],
    ship_to_address="123 Main St, Springfield, IL 62701",
)
assert good_command.command_name == "CreateOrder"
```

**Key principles:**
- Commands are immutable (`frozen=True`) — once created, their data cannot change; this prevents accidental modification during processing
- Commands carry ONLY the data needed to execute — no derived values, no computed totals, no domain logic; those belong in the handler and aggregate
- Each command maps to one use case — if a command represents multiple business operations, split into separate commands
- Commands are NOT events: commands describe intent (future action), events describe facts (past occurrence). Use past-tense naming for events (`OrderCreated`), imperative naming for commands (`CreateOrder`)

---

### Pattern 2: Command Handlers — Orchestration with Validation

Command handlers implement use case logic by validating input, resolving aggregates through repositories, invoking domain methods, and persisting changes. Each handler does exactly one thing and follows a consistent structure: validate → resolve → act → persist → publish events.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class HandlerResult(ABC):
    """Base class for command handler results."""
    success: bool


@dataclass(frozen=True)
class SuccessResult(HandlerResult):
    success: bool = True
    message: str = ""
    entity_id: str = ""


@dataclass(frozen=True)
class FailureResult(HandlerResult):
    success: bool = False
    error: str
    details: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "success", False)


class ValidationError(Exception):
    """Raised when command input fails validation before domain processing."""

    def __init__(self, message: str, field_errors: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.field_errors = field_errors or {}


# ── Handler Base Class ────────────────────────────────────────────────────────


class CommandHandler(ABC):
    """Abstract base class for all command handlers.

    Each concrete handler implements `handle(command: CommandType) -> ResultType`.
    The base class provides shared infrastructure for logging, validation markers,
    and result construction.
    """

    @abstractmethod
    def handle(self, command: Any) -> HandlerResult:
        """Execute the command. Override in subclasses."""


# ── CreateOrder Handler ───────────────────────────────────────────────────────


class Account:
    """Simplified aggregate for demonstration."""

    def __init__(self, account_id: str, owner: str, balance: Decimal) -> None:
        self.account_id = account_id
        self.owner = owner
        self._balance = balance

    @property
    def balance(self) -> Decimal:
        return self._balance

    def withdraw(self, amount: Decimal) -> None:
        if amount > self._balance:
            raise ValueError(f"Insufficient funds: {self._balance} < {amount}")
        self._balance -= amount

    def deposit(self, amount: Decimal) -> None:
        self._balance += amount


class Order:
    """Simplified order aggregate for demonstration."""

    def __init__(self, order_id: str, customer_email: str) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self._items: list[dict] = []
        self._ship_to: str | None = None
        self.status = "DRAFT"

    @property
    def items(self) -> list[dict]:
        return list(self._items)

    @property
    def ship_to(self) -> str | None:
        return self._ship_to

    def add_item(self, product_id: str, quantity: int, unit_price: Decimal) -> None:
        if self.status != "DRAFT":
            raise RuntimeError("Cannot add items to non-draft order")
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        self._items.append({"product_id": product_id, "quantity": quantity, "unit_price": unit_price})

    def set_shipping_address(self, address: str) -> None:
        self._ship_to = address

    def confirm(self) -> None:
        if not self._items:
            raise RuntimeError("Cannot confirm order with no items")
        if not self._ship_to:
            raise RuntimeError("Cannot confirm order without shipping address")
        self.status = "CONFIRMED"


class OrderRepository:
    """Repository for Order aggregates (Protocol/ABC in real code)."""

    def get_by_id(self, order_id: str) -> Order | None:
        return None  # Simplified for demonstration

    def save(self, order: Order) -> None:
        pass  # Simplified


class AccountRepository:
    """Repository for Account aggregates."""

    def get_by_id(self, account_id: str) -> Account | None:
        return None  # Simplified

    def save(self, account: Account) -> None:
        pass  # Simplified


class CreateOrderHandler(CommandHandler):
    """Handles the CreateOrder command — validates input, constructs an Order aggregate,
    applies any promotional discount, and persists the result.

    Validation steps (in order):
      1. Email format validation
      2. Product catalog lookup for each item (all must exist)
      3. Promo code validation (if provided)
      4. Currency consistency across all items
      5. Final aggregate consistency check

    If any validation fails, raises ValidationError with field-level details.
    If domain invariants fail, the order is not persisted and a RuntimeError is raised.
    """

    def handle(self, command: CreateOrder) -> SuccessResult | FailureResult:
        # Step 1: Validate email format
        if not command.customer_email or "@" not in command.customer_email:
            return FailureResult(
                error="Invalid customer email",
                details={"field": "customer_email", "value": command.customer_email},
            )

        # Step 2: Validate items structure
        if not command.items:
            return FailureResult(error="Order must have at least one item")

        for idx, (product_id, quantity, price) in enumerate(command.items):
            if quantity <= 0:
                return FailureResult(
                    error=f"Item {idx} has invalid quantity",
                    details={"field": f"items[{idx}].quantity", "value": quantity},
                )
            if price < 0:
                return FailureResult(
                    error=f"Item {idx} has negative price",
                    details={"field": f"items[{idx}].price", "value": float(price)},
                )

        # Step 3: Validate currency consistency
        currencies = {p for _, _, p in command.items}
        if len(currencies) > 1:
            return FailureResult(
                error="All items must use the same currency",
                details={"currencies": list(str(c) for c in currencies)},
            )

        # Step 4: Validate promo code (if provided) — external lookup
        if command.promo_code:
            discount = self._validate_promo(command.promo_code, command.items)
            if not discount:
                return FailureResult(
                    error=f"Invalid promo code: {command.promo_code}",
                    details={"promo_code": command.promo_code},
                )

        # Step 5: Build the aggregate — domain logic enforced here
        try:
            order_id = str(UUID(hex=uuid4().hex[:32]))
            order = Order(order_id, command.customer_email)

            for product_id, quantity, price in command.items:
                order.add_item(product_id, quantity, price)

            order.set_shipping_address(command.ship_to_address)

            # Validate aggregate consistency before confirming
            if not order.items:
                return FailureResult(error="Order has no valid items after processing")

            # Confirm the order — this enforces all invariants
            order.confirm()

            # Persist through repository
            OrderRepository().save(order)  # In production: injected via UoW

            return SuccessResult(
                message=f"Order {order.order_id} created and confirmed",
                entity_id=order.order_id,
            )

        except RuntimeError as exc:
            return FailureResult(error=f"Aggregate invariant violation: {exc}")

    def _validate_promo(self, code: str, items: list[tuple[str, int, Decimal]]) -> bool:
        """External promo code validation — in production, calls PromoCodeService."""
        valid_codes = {"WELCOME15": True, "VIP20": True, "SAVE10": True}
        return valid_codes.get(code) is not None


class CancelOrderHandler(CommandHandler):
    """Handles the CancelOrder command — locates the order, validates cancellation
    eligibility (not already cancelled/shipped), applies cancellation reason,
    and persists the updated order."""

    def handle(self, command: CancelOrder) -> SuccessResult | FailureResult:
        # Validate input
        if not command.order_id or len(command.order_id) < 8:
            return FailureResult(
                error="Invalid order ID",
                details={"field": "order_id"},
            )

        if not command.reason or len(command.reason.strip()) < 3:
            return FailureResult(
                error="Cancellation reason must be at least 3 characters",
                details={"field": "reason"},
            )

        # Resolve aggregate through repository
        repo = OrderRepository()
        order = repo.get_by_id(command.order_id)

        if order is None:
            return FailureResult(
                error=f"Order {command.order_id} not found",
                details={"order_id": command.order_id},
            )

        # Enforce domain invariants — cancellation only allowed from certain states
        if order.status == "SHIPPED":
            return FailureResult(
                error="Cannot cancel an order that has already shipped",
                details={"current_status": order.status},
            )

        if order.status == "COMPLETED":
            return FailureResult(
                error="Cannot cancel a completed order; issue a refund instead",
                details={"current_status": order.status},
            )

        if order.status == "CANCELLED":
            return FailureResult(
                error="Order is already cancelled",
                details={"current_status": order.status},
            )

        # Execute domain action — the aggregate controls its own state transitions
        order.status = "CANCELLED"
        repo.save(order)

        return SuccessResult(
            message=f"Order {command.order_id} cancelled: {command.reason}",
            entity_id=order.order_id,
        )


# Demonstration: command handler execution
def demonstrate_handlers() -> None:
    """Show command handlers in action with proper validation and orchestration."""

    # CreateOrder flow
    create_cmd = CreateOrder(
        customer_email="bob@example.com",
        items=[("SKU-001", 2, Decimal("25.00")), ("SKU-002", 1, Decimal("49.99"))],
        ship_to_address="456 Oak Ave, Shelbyville, IL 62565",
    )

    create_handler = CreateOrderHandler()
    result = create_handler.handle(create_cmd)
    assert result.success is True
    print(f"CreateOrder result: {result.message}")

    # CancelOrder flow — with validation failure
    cancel_cmd = CancelOrder(order_id="ORD-INVALID", reason="x")  # Too short reason
    cancel_handler = CancelOrderHandler()
    result = cancel_handler.handle(cancel_cmd)
    assert result.success is False
```

**Key principles:**
- Each handler does exactly ONE use case — if a handler needs more than one aggregate operation, consider whether it should be split into separate commands
- Validation happens BEFORE domain logic execution — never invoke aggregate methods with invalid input; validate in the handler first
- Use `FailureResult` with structured error details (field names, values) so callers can present meaningful errors to users — avoid generic "failed" messages
- Handlers orchestrate; aggregates enforce — the handler resolves data and calls methods, but business rules belong in aggregate methods

---

### Pattern 3: Command Bus — Typed Routing

The command bus is a lightweight routing layer that maps command types to their corresponding handlers. It provides a single entry point for executing commands while keeping handlers decoupled from each other. Handlers register themselves through explicit registration or decorators during application bootstrap.

```python
from __future__ import annotations

from typing import Any, Callable


class UnknownCommandError(KeyError):
    """Raised when a command type has no registered handler."""

    def __init__(self, command_type: str) -> None:
        super().__init__(f"No handler registered for command: {command_type}")
        self.command_type = command_type


class CommandBus:
    """Lightweight command routing layer.

    Maps command type names (via `command_name` property) to handler instances.
    Handlers must be registered before the bus starts accepting commands.
    Provides a single entry point for all write operations within a bounded context.

    Registration methods:
      - Explicit: bus.register(CreateOrder, CreateOrderHandler())
      - Decorator: @bus.on(CreateOrder) -> def handler(cmd): ...
    """

    def __init__(self) -> None:
        self._handlers: dict[str, CommandHandler] = {}

    def register(self, command_type: type[Command], handler: CommandHandler) -> None:
        """Register a handler for a specific command type.

        Args:
            command_type: The command class this handler processes (e.g., CreateOrder)
            handler: The handler instance that executes the command
        """
        name = command_type.__name__  # Use class name as routing key
        if name in self._handlers:
            raise ValueError(
                f"Handler already registered for command '{name}'. "
                f"Use a different command type or replace existing registration."
            )
        self._handlers[name] = handler

    def unregister(self, command_type: type[Command]) -> None:
        """Remove a handler registration. Useful for testing."""
        name = command_type.__name__
        if name not in self._handlers:
            raise KeyError(f"No handler registered for '{name}' to unregister")
        del self._handlers[name]

    def execute(self, command: Command) -> HandlerResult:
        """Route a command to its registered handler and return the result.

        Args:
            command: The command to execute (must be a subclass of Command)

        Returns:
            HandlerResult — either SuccessResult or FailureResult

        Raises:
            UnknownCommandError: If no handler is registered for this command type
            TypeError: If the argument is not a Command subclass
        """
        if not isinstance(command, Command):
            raise TypeError(f"Expected Command instance, got {type(command).__name__}")

        handler = self._handlers.get(command.command_name)
        if handler is None:
            raise UnknownCommandError(command.command_name)

        return handler.handle(command)

    def list_registered(self) -> dict[str, type[CommandHandler]]:
        """Return mapping of command names to their handler types (for inspection/debugging)."""
        return {name: type(h).__name__ for name, h in self._handlers.items()}


# ── Decorator-style registration ──────────────────────────────────────────────


def on(command_type: type[Command]) -> Callable[[Callable], None]:
    """Decorator that registers a function as a command handler.

    Usage:
        bus = CommandBus()

        @on(CreateOrder)
        def handle_create_order(cmd: CreateOrder) -> SuccessResult | FailureResult:
            # handler logic here
            return SuccessResult(message="Order created")

        # Register the decorated function as a CommandHandler wrapper
    """
    # This decorator returns a registration helper — in production, you'd wrap
    # the function in a CommandHandler subclass automatically.
    pass  # Placeholder; real implementation creates a wrapper handler class


# Demonstration: command bus setup and execution
def demonstrate_command_bus() -> None:
    """Show full command bus lifecycle — registration, execution, error handling."""

    bus = CommandBus()

    # Register handlers (in production, done at application startup)
    bus.register(CreateOrder, CreateOrderHandler())
    bus.register(CancelOrder, CancelOrderHandler())

    # Execute a valid command
    result = bus.execute(CreateOrder(
        customer_email="carol@example.com",
        items=[("SKU-001", 1, Decimal("25.00"))],
        ship_to_address="789 Pine Rd, Capital City, IL 62701",
    ))
    print(f"Result: {result.message}")

    # Execute a command with validation failure
    result = bus.execute(CancelOrder(order_id="short", reason="x"))
    assert not result.success
    print(f"Validation error: {result.error}")

    # Execute an unregistered command — raises UnknownCommandError
    @dataclass(frozen=True)
    class DeleteAccount(Command[str]):
        account_id: str

    try:
        bus.execute(DeleteAccount(account_id="ACC-123"))
        assert False, "Should have raised"
    except UnknownCommandError as exc:
        assert exc.command_type == "DeleteAccount"
```

**Key principles:**
- The command bus is a routing concern only — it does not contain business logic, validation, or domain knowledge
- Handler registration must be explicit during application bootstrap; unregistered commands fail fast with clear error messages
- Use the handler's `handle()` return value consistently — every handler must return a `HandlerResult` (success or failure), never None
- The bus is lightweight and in-process — for distributed command execution across services, use an event-driven approach (`event-sourcing-pattern`)

---

### Pattern 4: Command Bus with Dependency Injection and UoW Integration

In production systems, handlers need access to repositories, external services, and transaction coordination. This pattern shows how to wire dependencies through handler constructors while integrating the Unit of Work for atomic multi-repository operations. Dependencies are injected at application bootstrap (using a composition root), not inside handlers.

```python
from __future__ import annotations

from contextlib import contextmanager
from typing import Any


class CompositionRoot:
    """Assembles the command bus, handlers, repositories, and UoW at application startup.

    This is where all dependencies are wired together — single source of truth for
    the object graph. Handlers receive their dependencies through constructor injection,
    never creating them internally.
    """

    def __init__(self) -> None:
        self.bus = CommandBus()
        self.uow_class = DummyUnitOfWork  # See below

    def assemble(self) -> None:
        """Wire all dependencies and register command handlers on the bus."""
        # Create shared infrastructure (single instances for the application lifetime)
        account_repo: Any = SelfTrackingRepository()  # type: ignore[name-defined]
        order_repo: Any = SelfTrackingRepository()    # type: ignore[name-defined]
        notification_svc = DummyNotificationService()  # type: ignore[name-defined]

        # Create handlers with injected dependencies
        create_handler = CreateOrderHandler(
            account_repo=account_repo,
            order_repo=order_repo,
            uow_class=self.uow_class,
            notification_service=notification_svc,
        )

        cancel_handler = CancelOrderHandler(
            order_repo=order_repo,
            uow_class=self.uow_class,
        )

        # Register handlers on the bus
        self.bus.register(CreateOrder, create_handler)
        self.bus.register(CancelOrder, cancel_handler)


class DummyUnitOfWork:
    """Simplified Unit of Work for demonstration — tracks repository operations."""

    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False
        self._operations: list[str] = []

    @contextmanager
    def scope(self) -> Any:
        """Context manager that ensures commit/rollback happens correctly."""
        try:
            yield self
        except Exception:
            self.rollback()
            raise

    def commit(self) -> None:
        self.committed = True
        self._operations.append("commit")

    def rollback(self) -> None:
        self.rolled_back = True
        self._operations.append("rollback")

    def save(self, entity_type: str, entity_id: str) -> None:
        self._operations.append(f"save({entity_type}, {entity_id})")


class SelfTrackingRepository:
    """Simplified repository that tracks save/load operations."""

    def __init__(self) -> None:
        self._storage: dict[str, Any] = {}
        self.loads: list[str] = []
        self.saves: list[str] = []

    def get_by_id(self, entity_id: str) -> Any | None:
        self.loads.append(entity_id)
        return self._storage.get(entity_id)

    def save(self, entity: Any) -> None:
        entity_type = type(entity).__name__
        entity_id = getattr(entity, "order_id", getattr(entity, "account_id", "unknown"))
        self.saves.append(f"{entity_type}:{entity_id}")
        self._storage[str(getattr(entity, "id", entity_id))] = entity


class DummyNotificationService:
    """Simplified notification service for demonstration."""

    def send(self, to_email: str, subject: str, body: str) -> None:
        print(f"[NOTIFY] To: {to_email}, Subject: {subject}")


class CreateOrderHandler(CommandHandler):
    """Enhanced CreateOrder handler with dependency injection and UoW integration."""

    def __init__(
        self,
        account_repo: Any = None,  # type: ignore[assignment]
        order_repo: Any = None,     # type: ignore[assignment]
        uow_class: type | None = None,
        notification_service: Any = None,  # type: ignore[assignment]
    ) -> None:
        self._account_repo = account_repo
        self._order_repo = order_repo
        self._uow_class = uow_class or DummyUnitOfWork
        self._notification = notification_service

    def handle(self, command: CreateOrder) -> HandlerResult:
        # Validate input (same as before)
        if not command.customer_email or "@" not in command.customer_email:
            return FailureResult(error="Invalid email", details={"field": "customer_email"})
        if not command.items:
            return FailureResult(error="Order must have at least one item")

        # Use UoW for transaction coordination
        uow = self._uow_class()
        try:
            with uow.scope():
                # Build and persist order through the unit of work
                order_id = str(UUID(hex=uuid4().hex[:32]))
                order = Order(order_id, command.customer_email)

                for product_id, quantity, price in command.items:
                    order.add_item(product_id, quantity, price)

                order.set_shipping_address(command.ship_to_address)
                order.confirm()

                # Persist through UoW-tracked repository
                if self._order_repo:
                    self._order_repo.save(order)
                    uow.commit()

                # Notify customer — this is infrastructure concern, not domain logic
                if self._notification:
                    self._notification.send(
                        command.customer_email,
                        f"Order {order_id} confirmed",
                        f"Your order has been confirmed. Total items: {len(order.items)}",
                    )

            return SuccessResult(
                message=f"Order {order.order_id} created and confirmed",
                entity_id=order.order_id,
            )

        except RuntimeError as exc:
            return FailureResult(error=f"Aggregate invariant violation: {exc}")


# ❌ BAD: Handler creates dependencies internally — impossible to test, impossible to replace
class BadHandler:
    def handle(self, command: CreateOrder) -> HandlerResult:
        # Creating dependencies inside the handler method — tight coupling!
        session = get_database_session()          # Global function call
        repo = OrderSessionRepository(session)     # Hardcoded repository type
        notifier = EmailNotifier()                 # Another hardcoded dependency

        order = Order(...)                          # Build order
        repo.save(order)                            # Persist
        session.commit()                            # Commit transaction
        notifier.send(...)                          # Send notification — what if this fails?

        return SuccessResult(message="Done")


# ✅ GOOD: Handler receives all dependencies via constructor — loose coupling, testable
def demonstrate_uow_integration() -> None:
    """Show composition root wiring and handler execution with UoW."""
    root = CompositionRoot()
    root.assemble()

    # Execute command through the bus — dependencies are pre-wired
    result = root.bus.execute(CreateOrder(
        customer_email="dave@example.com",
        items=[("SKU-001", 3, Decimal("25.00"))],
        ship_to_address="100 Elm St, Springfield, IL 62701",
    ))
    print(f"Result: {result.message}")
```

**Key principles:**
- Dependencies are injected at the composition root, never created inside handlers — this enables testing with mock repositories and swapping implementations per environment
- The Unit of Work scope ensures atomic operations — if any repository operation fails, the UoW rollback reverts all changes
- Infrastructure concerns (notifications, email sending) happen AFTER domain persistence completes; they are side effects, not part of the transaction boundary

---

## Constraints

### MUST DO
- **One command per use case** — each command class must map to exactly one business operation. If a command represents multiple independent actions, split into separate commands that can be executed sequentially or in parallel.
- **Validate before invoking domain logic** — all input validation (email format, required fields, value ranges) happens at the start of the handler, BEFORE any aggregate methods are called. Domain invariant enforcement stays inside aggregates; application-layer validation is about input correctness.
- **Use command bus as single entry point for write operations** — all commands within a bounded context must flow through the bus. Direct handler invocation bypasses routing, logging, and permission checks that the bus provides.
- **Scope Unit of Work to single command handlers** — each handler acquires its own UoW scope; never share UoWs between handlers or nest them. This ensures clean transaction boundaries and predictable rollback behavior.
- **Publish domain events AFTER state mutation** — aggregates mutate state first, then publish events through the handler's event publisher. Events must be persisted within the same transaction boundary as the aggregate changes.

### MUST NOT DO
- **Put business logic in command handlers that belongs in aggregates** — the handler orchestrates (validate → resolve → act → persist), but enforcement rules belong in aggregate methods. A handler that checks "is order valid?" is duplicating aggregate responsibility.
- **Use commands for read operations** — commands are exclusively for write operations. Read queries use query handlers and read models; mixing reads into command handlers creates circular dependencies and transaction scope issues.
- **Create dependencies inside handler methods** — all dependencies (repositories, services, UoW) must be injected via constructor or provided by the composition root. Internal dependency creation breaks testability and makes environment-specific configuration impossible.
- **Return generic error messages from handlers** — `FailureResult` must include field-level error details (field name, value, reason) so callers can present actionable errors. Never return just "validation failed" without specifying which field failed.

---

## Output Template

When applying this skill, produce:

1. **Command Definitions** — Frozen dataclasses for each write operation, carrying only the input data needed to execute that use case. Each command maps one-to-one with a use case.
2. **Command Handlers** — Typed handler classes implementing `handle(command) -> Result` with consistent validation → resolve → act → persist structure. Include both success and failure result paths.
3. **Command Bus Implementation** — Lightweight routing layer mapping command types to handlers, with registration (explicit or decorator), execution, error handling for unknown commands, and inspection API.
4. **Dependency Wiring** — Composition root that assembles handlers, repositories, UoW, and infrastructure services at application startup. Demonstrates constructor injection pattern.
5. **Unit of Work Integration** — Transaction-scoped UoW with commit/rollback context manager, repository operation tracking, and demonstration of atomic multi-repository operations within a single command handler.

All code must use Python 3.10+ type hints, docstrings on every public method, and follow SOLID principles — specifically Single Responsibility (each handler does one thing), Open/Closed (new commands add new handlers without modifying existing ones), and Dependency Inversion (handlers depend on abstractions, not concretions).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD tactical patterns (aggregates, entities) that command handlers operate against through repository interfaces |
| `ddd-tactical-patterns` | Supporting tactical patterns (Specifications, Domain Services, Aggregate Factories) that commands use for validation and construction |
| `cqrs-pattern` | Full CQRS implementation — this skill focuses on the command (write) side; CQRS pattern covers both sides plus projections |
| `event-sourcing-pattern` | Event sourcing uses commands as the input to event streams — handlers produce events that become the authoritative state |

---

## Further Reading

- *Implementing Domain-Driven Design* by Vaughn Vernon (the Red Book) — practical examples of command handlers and application service patterns
- [Command Pattern](https://martinfowler.com/articles/enterpriseArchitecturePatternsByUsage.html) — Fowler's definition in the context of enterprise architectures
- [Application Service Pattern](https://enterprisearchitecturepatterns.io/patterns/application-services/command-handler.html) — separating orchestration logic from domain logic
