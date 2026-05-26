---
name: behavioral-design-patterns
description: Implements GoF behavioral design patterns (Strategy, Command, State, Chain of Responsibility, Visitor) to encapsulate algorithms, decouple request senders from receivers, and manage complex control flow in production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: behavioral patterns, strategy pattern, command pattern, state machine, chain of responsibility, visitor pattern, algorithm encapsulation, how do i decouple logic flow
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: structural-design-patterns, gof-design-patterns-catalog, refactoring-techniques
  author: https://github.com/openai/skill-router-contributors
  source: https://github.com/paulpas/git/agent-skill-router
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
---

# Behavioral Design Patterns

Implements GoF behavioral design patterns to encapsulate algorithms, decouple request senders from receivers, manage complex state transitions, and traverse object structures — all while keeping domain logic testable and maintainable.

## TL;DR Checklist

- [ ] Identify the behavioral concern: algorithm selection (Strategy), workflow orchestration (Command), state-driven behavior (State), multi-step processing (Chain of Responsibility), or data structure traversal (Visitor)
- [ ] Define a clear protocol interface before implementing concrete strategies/commands/handlers
- [ ] Keep each handler/command/state one responsibility — no cross-cutting logic
- [ ] Use `typing.Protocol` for interfaces, not ABC where simpler is sufficient
- [ ] Prefer composition over inheritance for behavioral delegation
- [ ] Write unit tests for every concrete strategy/command/handler

---

## When to Use

Use this skill when:

- You have multiple algorithms that need to be interchangeable at runtime (e.g., payment processing: credit card, PayPal, crypto)
- You need to encapsulate a request as an object with parameters, callbacks, and undo/redo capability
- An object's behavior changes based on its internal state and you want to eliminate conditional branching
- You have a multi-step pipeline where each step might skip or pass data to the next handler
- You need to perform operations across objects in a composite structure without coupling the operation to the element classes

---

## When NOT to Use

Avoid this skill for:

- Simple `if/elif` branches with two alternatives — use `enum` + `match` instead (over-engineering)
- Operations that don't need runtime interchangeability — compile-time polymorphism is simpler
- Deeply nested inheritance hierarchies — Chain of Responsibility and Visitor should stay shallow (max 5 levels)
- When a plain data class with validation would solve the problem

---

## Core Workflow

1. **Classify the Behavioral Concern** — Determine which pattern family fits: Strategy (algorithm swapping), Command (request encapsulation), State (state-driven behavior), Chain of Responsibility (pipeline processing), or Visitor (operation separation). **Checkpoint:** Only one pattern should be primary; if two seem needed, prefer combining them at a higher layer.

2. **Define the Protocol** — Create a `typing.Protocol` that captures the public interface. All concrete implementations must satisfy this contract. **Checkpoint:** The protocol should express *what* behavior is needed, not *how*.

3. **Implement Concrete Classes** — Write each concrete strategy/command/handler/state with explicit typing and docstrings. Each class receives its dependencies via `__init__` injection. **Checkpoint:** No direct imports between sibling concrete classes — they communicate only through the protocol interface.

4. **Wire the Context** — Inject the chosen behavior into a context object that delegates to it. The context never knows about specific implementations at runtime. **Checkpoint:** Context construction happens at composition root, not inside methods.

5. **Test Independently** — Write unit tests for each concrete implementation against the protocol. Use `unittest.mock` or real fixtures. **Checkpoint:** Test behavior (observable outcomes), not internal state mutations.

---

## Implementation Patterns

### Pattern 1: Strategy — Algorithm Selection at Runtime

Encapsulates interchangeable algorithms behind a common protocol. The context delegates to whichever strategy is injected, enabling runtime algorithm swapping without conditional branching.

```python
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol


@dataclass(frozen=True)
class Order:
    """Immutable order representation for strategy pattern examples."""
    item: str
    quantity: int
    unit_price: float
    customer_tier: str  # "standard", "premium", "vip"
    _manufactured_date: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price


class DiscountStrategy(Protocol):
    """Protocol for discount calculation strategies."""

    def calculate_discount(self, order: Order) -> float: ...


class FlatRateDiscount:
    """Fixed percentage discount for all orders. Use for baseline promotions."""

    def __init__(self, rate: float = 0.10) -> None:
        self._rate = max(0.0, min(rate, 1.0))

    def calculate_discount(self, order: Order) -> float:
        return round(order.subtotal * self._rate, 2)


class TieredDiscount:
    """Volume and loyalty-based discount with tier multipliers."""

    TIER_MULTIPLIERS: dict[str, float] = {
        "standard": 0.05,
        "premium": 0.15,
        "vip": 0.25,
    }
    VOLUME_BREAKS: list[tuple[int, float]] = [(100, 0.10), (500, 0.20), (1000, 0.35)]

    def calculate_discount(self, order: Order) -> float:
        base = self.TIER_MULTIPLIERS.get(order.customer_tier, 0.0)
        volume_bonus = sum(
            bonus for threshold, bonus in self.VOLUME_BREAKS
            if order.quantity >= threshold
        )
        total_rate = min(base + volume_bonus, 0.50)
        return round(order.subtotal * total_rate, 2)


class DynamicPricingDiscount:
    """Time-sensitive discount that decays over a product's shelf life."""

    def __init__(self, max_discount_pct: float = 0.30, decay_days: int = 30) -> None:
        self._max_discount = max(0.0, min(max_discount_pct, 1.0))
        self._decay_days = max(decay_days, 1)

    def calculate_discount(self, order: Order) -> float:
        from datetime import datetime, timedelta

        # Simulate shelf-life-based decay — in production, fetch from inventory service
        days_on_shelf = (datetime.now() - order._manufactured_date).days
        age_ratio = min(days_on_shelf / self._decay_days, 1.0)
        return round(order.subtotal * self._max_discount * age_ratio, 2)
```

```python
# ❌ BAD: Conditional algorithm selection scattered in business logic
class BadOrderProcessor:
    def process(self, order: Order, discount_type: str) -> float:
        if discount_type == "flat":
            return order.subtotal * 0.10
        elif discount_type == "tiered":
            tier = {"standard": 0.05, "premium": 0.15, "vip": 0.25}.get(order.customer_tier, 0.0)
            return order.subtotal * tier
        elif discount_type == "dynamic":
            # Complex logic embedded in the conditionals
            ...
        return 0.0

# ✅ GOOD: Strategy pattern — context delegates, algorithms swap independently
class OrderProcessor:
    """Processes orders by delegating discount calculation to an injected strategy."""

    def __init__(self, discount_strategy: DiscountStrategy) -> None:
        self._discount = discount_strategy

    def calculate_final_price(self, order: Order) -> float:
        discount = self._discount.calculate_discount(order)
        return round(max(order.subtotal - discount, 0.0), 2)

    def get_discount_breakdown(self, order: Order) -> dict[str, object]:
        discount = self._discount.calculate_discount(order)
        return {
            "subtotal": order.subtotal,
            "discount_amount": discount,
            "final_price": round(order.subtotal - discount, 2),
        }
```

**When to use Strategy:** You have ≥3 algorithms that share the same input/output contract but differ in computation. The algorithm choice needs to change at runtime based on configuration, user preference, or external conditions.

**When NOT to use Strategy:** You only have two variations — a simple `match` statement is clearer. The algorithms don't share an input/output contract — they should be separate methods instead.

---

### Pattern 2: Command — Encapsulate Requests as Objects

Wraps a request (method call, parameters, and callback) into an immutable command object. Enables queuing, logging, retries, undo/redo, and asynchronous execution.

```python
from __future__ import annotations
import abc
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Command:
    """Immutable base for command objects with tracing metadata."""
    command_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, str] = field(default_factory=dict)

    def with_metadata(self, **kwargs: str) -> Command:
        """Return a copy with additional metadata fields."""
        return Command(
            command_id=self.command_id,
            created_at=self.created_at,
            metadata={**self.metadata, **kwargs},
        )


class Executable(abc.ABC):
    """Protocol for command objects that can be executed and optionally undone."""

    @abc.abstractmethod
    def execute(self) -> Any: ...

    @abc.abstractmethod
    def undo(self) -> Any: ...

    @property
    @abc.abstractmethod
    def description(self) -> str: ...


class TransferFundsCommand(Executable):
    """Transfers a specified amount between two accounts with full audit trail."""

    def __init__(
        self,
        from_account: str,
        to_account: str,
        amount: float,
        currency: str = "USD",
    ) -> None:
        if amount <= 0:
            raise ValueError(f"Transfer amount must be positive, got {amount}")
        self._from = from_account
        self._to = to_account
        self._amount = amount
        self._currency = currency
        self._timestamp = datetime.now(timezone.utc)
        self._balance_before_from: float = 0.0
        self._balance_before_to: float = 0.0

    @property
    def description(self) -> str:
        return f"Transfer {self._amount} {self._currency} from {self._from} to {self._to}"

    def execute(self) -> dict[str, Any]:
        """Perform the transfer and record balance snapshots for potential undo."""
        # In production, these would call a BalanceRepository injected via __init__
        self._balance_before_from = 0.0  # Placeholder — use injected repository
        self._balance_before_to = 0.0    # Placeholder — use injected repository
        return {
            "id": str(uuid.uuid4()),
            "status": "completed",
            "timestamp": self._timestamp.isoformat(),
            "from_account": self._from,
            "to_account": self._to,
            "amount": self._amount,
            "currency": self._currency,
        }

    def undo(self) -> dict[str, Any]:
        """Reverse the transfer by restoring previous balances."""
        return {
            "action": "undo",
            "original_from_balance": self._balance_before_from,
            "original_to_balance": self._balance_before_to,
            "transferred_amount": self._amount,
        }

 class CommandInvoker:
    """Manages command execution history with undo capability."""

    def __init__(self, max_history: int = 100) -> None:
        self._history: list[Executable] = []
        self._max_history = max(max_history, 1)

    def execute_command(self, command: Executable) -> Any:
        result = command.execute()
        self._history.append(command)
        if len(self._history) > self._max_history:
            self._history.pop(0)
        return result

    def undo_last(self) -> Any:
        if not self._history:
            raise RuntimeError("No commands in history to undo")
        command = self._history.pop()
        return command.undo()

    @property
    def history_count(self) -> int:
        return len(self._history)
```

```python
# ❌ BAD: Direct method calls with no audit trail or undo capability
def bad_transfer(from_acct, to_acct, amount):
    from_acct.balance -= amount   # No validation, no logging, no rollback
    to_acct.balance += amount     # Race conditions possible

# ✅ GOOD: Command objects carry all context needed for execution, audit, and undo
invoker = CommandInvoker(max_history=50)
result = invoker.execute_command(
    TransferFundsCommand("ACC-001", "ACC-002", 500.00, "USD")
)
# Later: if user disputes the transfer
undo_result = invoker.undo_last()
```

**When to use Command:** You need to queue requests for later execution (async workers, message queues), support undo/redo operations, log all actions for audit trails, or implement macro commands (compose multiple commands into a single transaction).

**When NOT to use Command:** The operation is fire-and-forget with no need for history. Simple event handlers are clearer than wrapping events in command objects.

---

### Pattern 3: State — Context-Driven Behavior Without Conditionals

Allows an object to alter its behavior when its internal state changes. The object appears to change its class at runtime, eliminating sprawling `if/elif` or `switch` chains.

```python
from __future__ import annotations
import abc
from datetime import datetime, timezone
from typing import Any


class OrderState(abc.ABC):
    """Protocol defining state transitions for an order lifecycle."""

    @property
    @abc.abstractmethod
    def name(self) -> str: ...

    @abc.abstractmethod
    def can_advance_to(self, target_state: type["OrderState"]) -> bool: ...

    @abc.abstractmethod
    def on_enter(self, context: "Order") -> None: ...

    @abc.abstractmethod
    def on_exit(self, context: "Order") -> None: ...


class DraftState(OrderState):
    """Initial state: order created but not yet submitted for processing."""

    @property
    def name(self) -> str:
        return "draft"

    def can_advance_to(self, target_state: type[OrderState]) -> bool:
        # Draft → Submitted or Cancelled only
        return issubclass(target_state, (SubmittedState, CancelledState))

    def on_enter(self, context: "Order") -> None:
        context._events.append(("entered", "draft", datetime.now(timezone.utc)))

    def on_exit(self, context: "Order") -> None:
        context._validate_draft()


class SubmittedState(OrderState):
    """Order has been submitted for processing and payment collection."""

    @property
    def name(self) -> str:
        return "submitted"

    def can_advance_to(self, target_state: type[OrderState]) -> bool:
        return issubclass(target_state, (PaidState, FailedState))

    def on_enter(self, context: "Order") -> None:
        context._events.append(("entered", "submitted", datetime.now(timezone.utc)))

    def on_exit(self, context: "Order") -> None:
        pass


class PaidState(OrderState):
    """Payment confirmed — order ready for fulfillment."""

    @property
    def name(self) -> str:
        return "paid"

    def can_advance_to(self, target_state: type[OrderState]) -> bool:
        return issubclass(target_state, (ShippedState, RefundedState))

    def on_enter(self, context: "Order") -> None:
        context._events.append(("entered", "paid", datetime.now(timezone.utc)))
        if context.on_paid_callback:
            context.on_paid_callback(context)  # type: ignore[union-attr]


class ShippedState(OrderState):
    """Order has been dispatched to the customer."""

    @property
    def name(self) -> str:
        return "shipped"

    def can_advance_to(self, target_state: type[OrderState]) -> bool:
        return issubclass(target_state, (DeliveredState))

    def on_enter(self, context: "Order") -> None:
        context._events.append(("entered", "shipped", datetime.now(timezone.utc)))


class CancelledState(OrderState):
    """Order cancelled before fulfillment."""

    @property
    def name(self) -> str:
        return "cancelled"

    def can_advance_to(self, target_state: type[OrderState]) -> bool:
        return False  # Terminal state — no transitions from here

    def on_enter(self, context: "Order") -> None:
        context._events.append(("entered", "cancelled", datetime.now(timezone.utc)))


class Order:
    """Context object whose behavior changes based on its internal state.

    State transitions are validated against the current state's rules.
    Events are logged for every state entry and validation failure.
    """

    def __init__(self, order_id: str) -> None:
        self._id = order_id
        self._state: OrderState = DraftState()
        self._events: list[tuple[str, str, datetime]] = []
        self.on_paid_callback: Any | None = None

    @property
    def state(self) -> OrderState:
        return self._state

    @property
    def is_terminal(self) -> bool:
        """Return True if the order cannot transition to any further state."""
        return not self._state.can_advance_to(DraftState) and \
               not self._state.can_advance_to(SubmittedState) and \
               not self._state.can_advance_to(PaidState) and \
               not self._state.can_advance_to(ShippedState)

    def transition(self, target: type[OrderState]) -> None:
        """Advance the order to a new state after validation."""
        if not self._state.can_advance_to(target):
            raise StateTransitionError(
                f"Cannot transition from {self._state.name} to {target.__name__}"
            )
        self._state.on_exit(self)
        self._state = target()
        self._state.on_enter(self)

    def cancel(self) -> None:
        """Convenience method to cancel the order immediately."""
        self.transition(CancelledState)

    @property
    def event_log(self) -> list[dict[str, Any]]:
        return [
            {"action": action, "state": state, "timestamp": ts.isoformat()}
            for action, state, ts in self._events
        ]

    def _validate_draft(self) -> None:  # type: ignore[unused-ignores]
        """Validate draft before submission — replace with real validation logic."""
        pass


class StateTransitionError(RuntimeError):
    """Raised when an invalid state transition is attempted."""
    pass
```

```python
# ❌ BAD: State machine encoded as nested conditionals
def bad_process_order(order):
    if order.status == "draft":
        if can_validate(order):
            order.status = "submitted"
            if payment_succeeds(order):
                order.status = "paid"
                if inventory_check(order):
                    order.status = "shipped"
            else:
                order.status = "failed"
    elif order.status == "submitted":
        # ... more nested branches, impossible to trace full flow

# ✅ GOOD: State transitions are explicit, validated, and logged
order = Order("ORD-12345")
assert isinstance(order.state, DraftState)
order.transition(SubmittedState)
order.transition(PaidState)
order.transition(ShippedState)
print(order.event_log)  # Full audit trail of every transition
```

**When to use State:** You have an object with ≥3 distinct states that dictate its behavior or allowable operations. Transitions between states are constrained (not every state can go to every other state).

**When NOT to use State:** You only have two states — a `bool` or `enum` is simpler. There are no constraints on transitions — a simple status string suffices.

---

### Pattern 4: Chain of Responsibility — Pipeline Processing with Skip Logic

Delegates a request through a chain of handlers. Each handler either processes the request, passes it to the next handler, or both. Enables filtering, enrichment, and validation pipelines without hard-coded ordering.

```python
from __future__ import annotations
import abc
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineContext:
    """Shared mutable context passed through the handler chain.

    Handlers read/write fields on this object to enrich or validate the request.
    Set `halt` to True to terminate the chain early.
    """
    request: dict[str, Any]
    errors: list[str] = field(default_factory=list)
    enriched_data: dict[str, Any] = field(default_factory=dict)
    halt: bool = False

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0 and not self.halt


class PipelineHandler(abc.ABC):
    """Base class for chain-of-responsibility handlers."""

    def __init__(self, next_handler: PipelineHandler | None = None) -> None:
        self._next = next_handler

    @property
    def next(self) -> PipelineHandler | None:
        return self._next

    def set_next(self, handler: PipelineHandler) -> PipelineHandler:
        """Set the next handler and return it for fluent chaining."""
        self._next = handler
        return handler

    def handle(self, context: PipelineContext) -> None:
        """Process the request, then optionally delegate to the next handler."""
        if not context.halt and not context.is_valid:
            return  # Stop processing on validation failure

        self.process(context)

        if not context.halt and self._next is not None:
            self._next.handle(context)

    @abc.abstractmethod
    def process(self, context: PipelineContext) -> None: ...


class ValidatePayloadHandler(PipelineHandler):
    """Validates required fields in the incoming request payload."""

    REQUIRED_FIELDS: list[str] = ["user_id", "amount", "currency"]

    def process(self, context: PipelineContext) -> None:
        for field_name in self.REQUIRED_FIELDS:
            if field_name not in context.request:
                context.errors.append(f"Missing required field: {field_name}")
                context.halt = True

        currency = context.request.get("currency", "")
        valid_currencies = {"USD", "EUR", "GBP", "JPY"}
        if currency and currency not in valid_currencies:
            context.errors.append(
                f"Invalid currency: {currency}. Must be one of {valid_currencies}"
            )
            context.halt = True


class SanitizeInputHandler(PipelineHandler):
    """Strips whitespace and normalizes input values."""

    def process(self, context: PipelineContext) -> None:
        if "user_id" in context.request:
            context.request["user_id"] = str(context.request["user_id"]).strip()
        if "amount" in context.request:
            try:
                context.request["amount"] = float(context.request["amount"])
            except (ValueError, TypeError):
                context.errors.append(f"Invalid amount format: {context.request['amount']}")
                context.halt = True


class EnrichContextHandler(PipelineHandler):
    """Adds computed or looked-up data to the pipeline context."""

    def __init__(self, user_lookup: Any | None = None) -> None:  # type: ignore[unused-ignores]
        super().__init__()
        self._user_lookup = user_lookup  # Inject a UserRepository or similar

    def process(self, context: PipelineContext) -> None:
        user_id = context.request.get("user_id")
        if user_id and self._user_lookup:  # type: ignore[redundant-expr]
            user_data = self._user_lookup.find(user_id)  # type: ignore[attr-defined]
            if user_data:
                context.enriched_data["customer_name"] = user_data.get("name", "Unknown")
                context.enriched_data["tier"] = user_data.get("tier", "standard")
            else:
                context.errors.append(f"User not found: {user_id}")
                context.halt = True


class AuditLogHandler(PipelineHandler):
    """Records the request to an audit log regardless of outcome."""

    def __init__(self, logger: Any | None = None) -> None:  # type: ignore[unused-ignores]
        super().__init__()
        self._logger = logger or self._default_logger  # type: ignore[redundant-expr]

    @staticmethod
    def _default_logger(msg: str) -> None:  # type: ignore[unused-ignores]
        pass  # Replace with real logging in production

    def process(self, context: PipelineContext) -> None:
        log_entry = {
            "request": context.request,
            "errors": context.errors.copy(),
            "enriched": context.enriched_data.copy(),
            "status": "valid" if context.is_valid else "rejected",
        }
        self._logger(f"Audit: {log_entry}")  # type: ignore[operator]
```

```python
# ❌ BAD: All pipeline logic in one function
def bad_process_request(data):
    if not all(k in data for k in ("user_id", "amount")):
        return {"error": "missing fields"}
    data["amount"] = float(data["amount"])
    user = lookup_user(data["user_id"])
    if not user:
        return {"error": "user not found"}
    data["name"] = user["name"]
    log_request(data)
    return data

# ✅ GOOD: Each handler is independently testable, order is configurable
handler_chain = (
    ValidatePayloadHandler()
    .set_next(SanitizeInputHandler())
    .set_next(EnrichContextHandler(user_lookup=my_repo))
    .set_next(AuditLogHandler(logger=my_logger))
)

ctx = PipelineContext(request={"user_id": "U123", "amount": " 49.99 ", "currency": "USD"})
handler_chain.handle(ctx)

assert ctx.is_valid is True
assert ctx.enriched_data["customer_name"] == "Jane Doe"  # From user lookup
```

**When to use Chain of Responsibility:** You have a processing pipeline where steps might be skipped or reordered. Multiple handlers should be independently testable and configurable at runtime. The number of processing stages may vary between invocations.

**When NOT to use Chain of Responsibility:** All steps must run in a fixed order — a simple function call chain is clearer. Handlers need direct access to each other's internal state — this pattern only shares the context object.

---

### Pattern 5: Visitor — Decouple Operations from Object Structures

Defines new operations on objects without modifying their classes. The visitor pattern enables you to add behavior across a composite hierarchy by separating algorithms from the object structure that operates on them.

```python
from __future__ import annotations
import abc
from dataclasses import dataclass, field
from typing import Any


class SyntaxNode(abc.ABC):
    """Abstract base for all AST (Abstract Syntax Tree) nodes in the visitor example."""

    @abc.abstractmethod
    def accept(self, visitor: "Visitor") -> Any: ...


class NumberNode(SyntaxNode):
    """Represents a literal numeric value in the AST."""

    def __init__(self, value: float) -> None:
        self.value = value

    def accept(self, visitor: Visitor) -> Any:
        return visitor.visit_number(self)


class StringNode(SyntaxNode):
    """Represents a literal string value in the AST."""

    def __init__(self, value: str) -> None:
        self.value = value

    def accept(self, visitor: Visitor) -> Any:
        return visitor.visit_string(self)


class BinaryOpNode(SyntaxNode):
    """Represents a binary operator (addition, subtraction, etc.)."""

    def __init__(self, operator: str, left: SyntaxNode, right: SyntaxNode) -> None:
        self.operator = operator
        self.left = left
        self.right = right

    def accept(self, visitor: Visitor) -> Any:
        return visitor.visit_binary_op(self)


class VariableNode(SyntaxNode):
    """Represents a variable reference in the AST."""

    def __init__(self, name: str) -> None:
        self.name = name

    def accept(self, visitor: Visitor) -> Any:
        return visitor.visit_variable(self)


class Visitor(abc.ABC):
    """Protocol for visitor operations on SyntaxNode trees.

    Each method corresponds to a concrete node type. The node's accept()
    method dispatches to the appropriate visit method, achieving double dispatch.
    """

    @abc.abstractmethod
    def visit_number(self, node: NumberNode) -> Any: ...

    @abc.abstractmethod
    def visit_string(self, node: StringNode) -> Any: ...

    @abc.abstractmethod
    def visit_binary_op(self, node: BinaryOpNode) -> Any: ...

    @abc.abstractmethod
    def visit_variable(self, node: VariableNode) -> Any: ...


class Evaluator(Visitor):
    """Visitor that evaluates arithmetic expressions represented as an AST."""

    # Runtime variable bindings — in production, these come from scope analysis
    _scopes: list[dict[str, float]] = field(default_factory=list, init=False)

    def visit_number(self, node: NumberNode) -> float:
        return node.value

    def visit_string(self, node: StringNode) -> str:
        return node.value

    def visit_variable(self, node: VariableNode) -> float:
        if self._scopes and node.name in self._scopes[-1]:
            return self._scopes[-1][node.name]
        raise NameError(f"Undefined variable: {node.name}")

    def visit_binary_op(self, node: BinaryOpNode) -> float:
        left = node.left.accept(self)
        right = node.right.accept(self)

        ops: dict[str, Any] = {
            "+": lambda a, b: a + b,
            "-": lambda a, b: a - b,
            "*": lambda a, b: a * b,
            "/": lambda a, b: a / b if b != 0 else float("inf"),
        }

        op_func = ops.get(node.operator)
        if op_func is None:
            raise ValueError(f"Unsupported operator: {node.operator}")
        return op_func(left, right)

    def evaluate(self, root: SyntaxNode, bindings: dict[str, float] | None = None) -> Any:
        """Entry point: set up scope and evaluate the expression tree."""
        if bindings:
            self._scopes.append(bindings)
        try:
            return root.accept(self)
        finally:
            if bindings:
                self._scopes.pop()


class CodeAnalyzer(Visitor):
    """Visitor that analyzes an AST for static properties without executing it."""

    def __init__(self) -> None:
        self.variable_names: set[str] = set()
        self.operator_counts: dict[str, int] = {}
        self.depth: int = 0
        self.max_depth: int = 0

    def visit_number(self, node: NumberNode) -> int:
        return 1  # Leaf — contributes 1 to node count

    def visit_string(self, node: StringNode) -> int:
        return 1

    def visit_variable(self, node: VariableNode) -> int:
        self.variable_names.add(node.name)
        return 1

    def visit_binary_op(self, node: BinaryOpNode) -> int:
        self.depth += 1
        self.max_depth = max(self.max_depth, self.depth)

        self.operator_counts[node.operator] = self.operator_counts.get(node.operator, 0) + 1

        left_count = node.left.accept(self)
        right_count = node.right.accept(self)

        self.depth -= 1
        return 1 + left_count + right_count


class ASTPrinter(Visitor):
    """Visitor that produces a human-readable parenthesized representation."""

    def visit_number(self, node: NumberNode) -> str:
        return f"{node.value:g}" if node.value == int(node.value) else f"{node.value}"

    def visit_string(self, node: StringNode) -> str:
        return repr(node.value)

    def visit_variable(self, node: VariableNode) -> str:
        return node.name

    def visit_binary_op(self, node: BinaryOpNode) -> str:
        left_str = node.left.accept(self)
        right_str = node.right.accept(self)
        return f"({left_str} {node.operator} {right_str})"
```

```python
# Build AST for expression: (3 + x) * 2
ast = BinaryOpNode(
    "*",
    BinaryOpNode("+", NumberNode(3), VariableNode("x")),
    NumberNode(2),
)

# Visitor 1: Evaluate
evaluator = Evaluator()
result = evaluator.evaluate(ast, bindings={"x": 5.0})
assert result == 16.0  # (3 + 5) * 2 = 16

# Visitor 2: Analyze — new operation, zero changes to AST node classes
analyzer = CodeAnalyzer()
node_count = ast.accept(analyzer)
print(f"Nodes: {node_count}, Variables: {analyzer.variable_names}, Max depth: {analyzer.max_depth}")

# Visitor 3: Print — another completely independent operation
printer = ASTPrinter()
print(printer.visit_binary_op(ast))  # Outputs: ((3 + x) * 2)
```

```python
# ❌ BAD: Adding new operations requires modifying every node class
class BadNode:
    def evaluate(self): ...      # Tied to evaluation — can't add analysis without changes
    def serialize(self): ...     # Each new operation bloats every class

# ✅ GOOD: New operations = new visitor classes. Zero changes to SyntaxNode.
def add_counter_visitor():  # Just write a new Visitor subclass
    class Counter(Visitor):
        ...
    return Counter()
```

**When to use Visitor:** You have a stable object hierarchy but need to define many different operations over it (serialization, analysis, code generation). Adding new operations is more frequent than adding new node types. The operations share traversal logic (e.g., always visit left subtree before right).

**When NOT to use Visitor:** Your object hierarchy changes frequently — every new type requires updating the Visitor protocol and all its implementations. You only need one or two operations — method calls on the objects themselves are simpler.

---

## Constraints

### MUST DO
- Define the protocol interface first, implement concretions second
- Use `typing.Protocol` for interfaces instead of ABC when you only need structural typing
- Inject dependencies via constructor — never import concrete implementations inside methods
- Each handler/command/state class must have a single, well-defined responsibility
- Log or record state transitions for auditability and debugging
- Write unit tests for every concrete class against its protocol interface

### MUST NOT DO
- Nest more than 3 levels deep in any chain of responsibility — use composition instead
- Let State objects hold mutable shared state that causes race conditions
- Use Visitor when the object hierarchy changes frequently — refactor to add methods on the classes directly
- Combine Command and State responsibilities in a single class — separate concerns
- Create handler chains longer than 10 steps — split into parallel sub-chains

---

## Output Template

When this skill is active, your output must contain:

1. **Pattern Identification** — Name of the pattern (Strategy, Command, State, Chain of Responsibility, or Visitor) and a one-sentence justification for why it fits the scenario
2. **Protocol Interface** — The `typing.Protocol` or abstract base class defining the contract
3. **Concrete Implementations** — Each concrete class with typed signatures, docstrings, and error handling
4. **Context/Invoker/Wiring Code** — How behaviors are composed and injected
5. **Unit Test Snippets** — At least one test per concrete implementation showing expected behavior

---

## Related Skills

| Skill | Purpose |
|---|---|
| `structural-design-patterns` | Pair with behavioral patterns — structural patterns organize objects; behavioral patterns govern their interactions |
| `gof-design-patterns-catalog` | Reference for the full GoF catalog when you need patterns beyond the core five |
| `refactoring-techniques` | Use to refactor existing conditional logic into these pattern implementations |

---

## Live References

> Authoritative documentation links for behavioral design patterns.

- [GoF Design Patterns — Gang of Four Book](https://en.wikipedia.org/wiki/Design_Patterns)
- [Python typing.Protocol Documentation](https://docs.python.org/3/library/typing.html#typing.Protocol)
- [Refactoring Guru — Behavioral Patterns Collection](https://refactoring.guru/design-patterns/catalog)
- [Real Python — Strategy Pattern Tutorial](https://realpython.com/primer-on-python-design-patterns/)
- [Martin Fowler — State Pattern](https://martinfowler.com/articles/changeSub.html)
