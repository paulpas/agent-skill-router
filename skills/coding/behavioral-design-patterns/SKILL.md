---
name: behavioral-design-patterns
description: Implements behavioral design patterns (Observer, State, Command, Strategy,
  Template Method, Mediator, Chain of Responsibility, Iterator) to manage object communication,
  control flow, and algorithmic variation in Python applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: behavioral patterns, observer pattern, state pattern, command pattern,
    strategy pattern, template method, mediator pattern, chain of responsibility,
    iterator pattern, object communication
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
  related-skills: design-patterns-and-principles, event-driven-architecture, refactoring,
    modular-design
------
# Behavioral Design Patterns

Implements behavioral design patterns to manage object communication, control flow, and algorithmic variation. These patterns focus on responsibilities between objects — how they interact, delegate, and cooperate — rather than on object creation or structural composition. Each pattern provides a proven solution for common behavioral problems in software systems.

## TL;DR Checklist

- [ ] Identify the behavioral concern: communication, state transitions, algorithm selection, request handling, or iteration
- [ ] Select the single best-fitting pattern from the guide below — patterns solve specific problems
- [ ] Use Python's built-in abstractions (ABC, protocols, dataclasses) for clean interfaces
- [ ] Prefer composition over inheritance for behavioral variation (Strategy over subclassing)
- [ ] Ensure each pattern is used where it actually solves a problem — not added because it "sounds right"

---

## When to Use

Use this skill when:

- Multiple objects need to be notified when another object's state changes (Observer)
- An object must change its behavior based on its internal state, and conditional logic is growing unmanageable (State)
- You want to encapsulate a request as an object with parameters, allowing queuing, logging, or undo operations (Command)
- Multiple algorithms need to be interchangeable at runtime without the client knowing which one is selected (Strategy)
- A class has a fixed algorithm skeleton but allows subclasses to override specific steps (Template Method)
- Many objects communicate directly through tight coupling and you need to centralize coordination (Mediator)
- Requests need to be passed along a chain of potential handlers until one processes them (Chain of Responsibility)
- You need to traverse a collection without exposing its internal representation (Iterator)

---

## When NOT to Use

Avoid these patterns when:

- The behavior is simple enough that direct function calls or conditionals suffice — don't add pattern overhead for two cases
- A language feature already solves the problem elegantly (e.g., Python decorators instead of Observer for simple notifications)
- You're designing from scratch and can use Python's built-in protocols (`collections.abc`) instead of custom interfaces
- The pattern introduces more complexity than it removes — if a single if/elif handles all cases cleanly, use if/elif

---

## Core Workflow

1. **Identify the Behavioral Concern** — Determine what behavior problem you're solving: notification, state change, request encapsulation, algorithm selection, coordination, or traversal.
   **Checkpoint:** Can you describe the problem in one sentence starting with "When X happens, Y needs to..."? If not, the problem isn't well-defined yet.

2. **Select the Pattern** — Match the concern to the appropriate pattern from the reference guide below. One pattern per problem.

3. **Define the Interface** — Use `typing.Protocol` or `abc.ABC` to define clean, minimal interfaces. Keep them focused on what collaborators need, not implementation details.
   **Checkpoint:** Does the interface expose only what the pattern requires? Remove any methods that don't belong in the behavioral contract.

4. **Implement Concrete Participants** — Write the concrete classes that implement the pattern. Each should have a single clear responsibility within the pattern structure.
   **Checkpoint:** Can you test each concrete participant in isolation? If not, responsibilities may be blurred.

5. **Wire Together at Runtime** — Connect subjects to observers, commands to receivers, strategies to context. This wiring belongs in composition roots (factories, dependency injection), not inside the objects themselves.
   **Checkpoint:** Is the system configurable without modifying existing pattern code? New observers/strategies should require no changes to existing classes.

---

## Implementation Patterns & Reference Guide

### Pattern 1: Observer — Publish/Subscribe Communication

The Observer pattern defines a one-to-many dependency between objects so that when one object (the subject) changes state, all its dependents (observers) are notified and updated automatically. Use it for event systems, pub/sub architectures, reactive UIs, and any situation where multiple components must stay synchronized with a changing data source.

```python
from __future__ import annotations
import abc
from typing import Any


class Observer(abc.ABC):
    """Protocol for objects that react to state changes."""

    @abc.abstractmethod
    def update(self, subject: Any, *args: Any) -> None: ...


class Subject(abc.ABC):
    """Base class for observable objects with attach/detach/notify lifecycle."""

    def __init__(self) -> None:
        self._observers: list[Observer] = []

    def attach(self, observer: Observer) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def notify(self, *args: Any) -> None:
        for observer in self._observers:
            observer.update(self, *args)


class StockPrice(Subject):
    """Observable that tracks a stock's current price and notifies when it changes."""

    def __init__(self, ticker: str) -> None:
        super().__init__()
        self._ticker = ticker
        self._price: float = 0.0

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        if self._price == value:
            return  # No change — skip notification
        old_price = self._price
        self._price = value
        self.notify(f"{self._ticker} changed from ${old_price:.2f} to ${value:.2f}")


class PriceAlert(Observer):
    """Sends email alerts when price crosses a threshold."""

    def __init__(self, ticker: str, alert_threshold: float) -> None:
        self.ticker = ticker
        self.alert_threshold = alert_threshold
        self._alerted = False

    def update(self, subject: Any, message: str) -> None:
        if not isinstance(subject, StockPrice):
            return
        # Alert when price drops below threshold (once per drop event)
        if subject.price < self.alert_threshold and not self._alerted:
            print(f"[ALERT] {message} — threshold: ${self.alert_threshold}")
            self._alerted = True

    def reset(self) -> None:
        self._alerted = False


class PriceLogger(Observer):
    """Logs every price change for auditing."""

    def update(self, subject: Any, message: str) -> None:
        if isinstance(subject, StockPrice):
            print(f"[LOG]  {subject.ticker} | {message}")


# Usage example
if __name__ == "__main__":
    stock = StockPrice("AAPL")
    alert = PriceAlert("AAPL", 150.0)
    logger = PriceLogger()

    stock.attach(alert)
    stock.attach(logger)

    stock.price = 160.0   # Both notified
    stock.price = 149.50  # Alert triggers (below $150 threshold)
    stock.price = 149.50  # No notification (no change)

    stock.detach(alert)
    stock.price = 130.0   # Only logger notified
```

**When to prefer Observer:**
- Multiple components react to the same event
- You want loose coupling between the event source and its handlers
- The set of observers is dynamic (attach/detach at runtime)

**When NOT to use Observer:**
- A single handler suffices — a direct method call is simpler
- Events are fire-and-forget with no need to track subscribers
- Python's `asyncio.Event` or signals modules already solve it for your framework

---

### Pattern 2: State — Context Behavior Based on Internal State

The State pattern allows an object to alter its behavior when its internal state changes. The object appears to change its class. Use it when a conditional-based state machine has many states and transitions, making `if/elif` chains unwieldy and error-prone. Each state becomes a separate class with its own behavior.

```python
from __future__ import annotations
import abc


class OrderState(abc.ABC):
    """Protocol defining all valid operations for any order state."""

    @abc.abstractmethod
    def confirm(self, order: "Order") -> None: ...

    @abc.abstractmethod
    def cancel(self, order: "Order") -> None: ...

    @abc.abstractmethod
    def ship(self, order: "Order") -> None: ...

    @abc.abstractmethod
    def deliver(self, order: "Order") -> None: ...

    @property
    @abc.abstractmethod
    def name(self) -> str: ...


class PendingState(OrderState):
    """Initial state: order created but not yet confirmed."""

    @property
    def name(self) -> str:
        return "pending"

    def confirm(self, order: "Order") -> None:
        print(f"[{order.id}] Order confirmed — transitioning to paid")
        order._state = PaidState()

    def cancel(self, order: "Order") -> None:
        print(f"[{order.id}] Order cancelled from pending state")
        order._state = CancelledState()

    def ship(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot ship an unconfirmed order (current: {self.name})")

    def deliver(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot deliver an unconfirmed order (current: {self.name})")


class PaidState(OrderState):
    """Order confirmed and payment received — ready to ship."""

    @property
    def name(self) -> str:
        return "paid"

    def confirm(self, order: "Order") -> None:
        raise RuntimeError(f"Order already confirmed (current: {self.name})")

    def cancel(self, order: "Order") -> None:
        print(f"[{order.id}] Order cancelled after payment — refund initiated")
        order._state = CancelledState()

    def ship(self, order: "Order") -> None:
        print(f"[{order.id}] Order shipped from paid state")
        order._state = ShippedState()

    def deliver(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot deliver an unshipped order (current: {self.name})")


class ShippedState(OrderState):
    """Order has been shipped — awaiting delivery confirmation."""

    @property
    def name(self) -> str:
        return "shipped"

    def confirm(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot confirm a shipped order (current: {self.name})")

    def cancel(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot cancel a shipped order (current: {self.name}) — initiate return instead")

    def ship(self, order: "Order") -> None:
        raise RuntimeError(f"Order already shipped (current: {self.name})")

    def deliver(self, order: "Order") -> None:
        print(f"[{order.id}] Order delivered from shipped state")
        order._state = DeliveredState()


class DeliveredState(OrderState):
    """Order confirmed as delivered — final state."""

    @property
    def name(self) -> str:
        return "delivered"

    def confirm(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot confirm a delivered order (current: {self.name})")

    def cancel(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot cancel a delivered order (current: {self.name}) — initiate return instead")

    def ship(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot ship a delivered order (current: {self.name})")

    def deliver(self, order: "Order") -> None:
        raise RuntimeError(f"Order already delivered (current: {self.name})")


class CancelledState(OrderState):
    """Order has been cancelled — final state."""

    @property
    def name(self) -> str:
        return "cancelled"

    def confirm(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot confirm a cancelled order (current: {self.name})")

    def cancel(self, order: "Order") -> None:
        raise RuntimeError(f"Order already cancelled (current: {self.name})")

    def ship(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot ship a cancelled order (current: {self.name})")

    def deliver(self, order: "Order") -> None:
        raise RuntimeError(f"Cannot deliver a cancelled order (current: {self.name})")


class Order:
    """Context object whose behavior changes based on internal state."""

    def __init__(self, id: str) -> None:
        self.id = id
        self._state: OrderState = PendingState()

    @property
    def status(self) -> str:
        return self._state.name

    def confirm(self) -> None:
        self._state.confirm(self)

    def cancel(self) -> None:
        self._state.cancel(self)

    def ship(self) -> None:
        self._state.ship(self)

    def deliver(self) -> None:
        self._state.deliver(self)


# Usage example
if __name__ == "__main__":
    order = Order("ORD-1234")
    print(f"Status: {order.status}")  # pending

    order.confirm()  # → paid
    print(f"Status: {order.status}")

    order.ship()  # → shipped
    print(f"Status: {order.status}")

    order.deliver()  # → delivered
    print(f"Status: {order.status}")

    try:
        order.cancel()  # RuntimeError — cannot cancel a delivered order
    except RuntimeError as e:
        print(f"Blocked: {e}")
```

**When to prefer State:**
- A class has behavior that depends on its internal state
- Conditional logic (`if state == X`) is scattered across many methods
- You want to add new states without modifying existing state-handling code (Open/Closed Principle)

**Anti-pattern warning — don't use State when:**
- There are only 2-3 states and transitions are simple — a single boolean or enum with guards may be cleaner
- The "state" is really just data that needs to be stored/retrieved, not behavior that changes

---

### Pattern 3: Command — Encapsulate Requests as Objects

The Command pattern encapsulates a request (including receiver, method, and arguments) into a standalone object. This enables queuing requests, logging operations, supporting undo/redo, and decoupling the invoker from the receiver. Use it for transactional operations, macro commands, command-line interfaces, and any scenario where you need to parameterize actions.

```python
from __future__ import annotations
import abc
from typing import Any


class Command(abc.ABC):
    """Abstract base for all commands."""

    @abc.abstractmethod
    def execute(self) -> None: ...

    @abc.abstractmethod
    def undo(self) -> None: ...


class Invoker:
    """Holds and executes commands. Does not know what they do internally."""

    def __init__(self) -> None:
        self._history: list[Command] = []

    def execute_command(self, command: Command) -> None:
        command.execute()
        self._history.append(command)

    def undo_last(self) -> None:
        if not self._history:
            print("[INFO] Nothing to undo")
            return
        last = self._history.pop()
        last.undo()


class TextEditorCommand(Command):
    """Text editing command with full undo support."""

    def __init__(self, text: str, action: str, position: int) -> None:
        self._text = text
        self._action = action  # "insert" or "delete"
        self._position = position
        self._deleted_text: str = ""

    def execute(self) -> None:
        if self._action == "insert":
            inserted = self._text[self._position:self._position] + self._deleted_text
            print(f"[EXECUTE] Insert '{self._deleted_text}' at position {self._position}")
        elif self._action == "delete":
            start = self._position
            end = start + len(self._deleted_text)
            removed = self._text[start:end]
            print(f"[EXECUTE] Delete '{removed}' from position {start}")

    def undo(self) -> None:
        if self._action == "insert":
            print(f"[UNDO] Remove inserted text at position {self._position}")
        elif self._action == "delete":
            print(f"[UNDO] Restore deleted text '{self._deleted_text}' at position {self._position}")


# ── Command Pattern for a Database ──────────────────────────────

class DatabaseCommand(Command):
    """Generic command that executes SQL and tracks affected rows for undo."""

    def __init__(self, query: str, params: tuple[Any, ...]) -> None:
        self.query = query
        self.params = params
        self.affected_ids: list[int] = []  # For undo tracking


class CreateProductCommand(DatabaseCommand):
    """Creates a new product record."""

    def execute(self) -> None:
        print(f"EXECUTE CREATE PRODUCT: {self.query} | params={self.params}")
        # In real code: self.cursor.execute(self.query, self.params)
        self.affected_ids = [101]  # Simulated inserted row ID

    def undo(self) -> None:
        for pid in self.affected_ids:
            print(f"UNDO CREATE PRODUCT: DELETE FROM products WHERE id={pid}")


class UpdateProductCommand(DatabaseCommand):
    """Updates an existing product."""

    def __init__(self, query: str, params: tuple[Any, ...], old_value: Any) -> None:
        super().__init__(query, params)
        self._old_value = old_value

    def execute(self) -> None:
        print(f"EXECUTE UPDATE PRODUCT: {self.query} | params={self.params}")

    def undo(self) -> None:
        print(f"UNDO UPDATE PRODUCT: Restore value to '{self._old_value}'")


class DeleteProductCommand(DatabaseCommand):
    """Deletes a product record (soft delete with undo support)."""

    def __init__(self, query: str, params: tuple[Any, ...], restored_data: dict) -> None:
        super().__init__(query, params)
        self._restored_data = restored_data

    def execute(self) -> None:
        print(f"EXECUTE DELETE PRODUCT: {self.query} | params={self.params}")

    def undo(self) -> None:
        print(f"UNDO DELETE PRODUCT: Restore data {self._restored_data}")


# MacroCommand: composite command — executes a sequence as one unit
class MacroCommand(Command):
    """Combines multiple commands into a single atomic operation."""

    def __init__(self, commands: list[Command]) -> None:
        self.commands = commands

    def execute(self) -> None:
        print("=== MACRO COMMAND START ===")
        for cmd in self.commands:
            cmd.execute()
        print("=== MACRO COMMAND END ===")

    def undo(self) -> None:
        print("=== MACRO UNDO (reverse order) ===")
        for cmd in reversed(self.commands):
            cmd.undo()
        print("=== MACRO UNDO COMPLETE ===")


# Usage example
if __name__ == "__main__":
    invoker = Invoker()

    create_cmd = CreateProductCommand(
        "INSERT INTO products (name, price) VALUES (%s, %s)",
        ("Widget Pro", 29.99),
    )
    update_cmd = UpdateProductCommand(
        "UPDATE products SET price = %s WHERE name = %s",
        (34.99, "Widget Pro"),
        old_value=29.99,
    )

    invoker.execute_command(create_cmd)   # Execute create
    invoker.execute_command(update_cmd)   # Execute update
    invoker.undo_last()                    # Undo update
    invoker.undo_last()                    # Undo create
```

**When to prefer Command:**
- You need to queue, log, or delay requests
- Undo/redo functionality is required
- The invoker and receiver have different lifetimes or processes
- You want to parameterize operations with different arguments at runtime

---

### Pattern 4: Strategy — Interchangeable Algorithms

The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. The strategy lets the algorithm vary independently from clients that use it. Use it when you have multiple similar algorithms (sorting, pricing, routing, validation) and need to select one at runtime based on context or configuration. This is the recommended alternative to conditional logic or subclassing for algorithm selection.

```python
from __future__ import annotations
import abc
from dataclasses import dataclass


@dataclass(frozen=True)
class PriceCalculation:
    """Result of a pricing strategy computation."""
    subtotal: float
    discount_pct: float
    tax_amount: float
    total: float


class PricingStrategy(abc.ABC):
    """Protocol for pricing strategies — each computes discount and tax independently."""

    @abc.abstractmethod
    def compute_discount(self, subtotal: float) -> float: ...

    @abc.abstractmethod
    def compute_tax(self, subtotal: float, region: str) -> float: ...

    def calculate(self, subtotal: float, region: str) -> PriceCalculation:
        discount = self.compute_discount(subtotal)
        taxable = subtotal - discount
        tax = self.compute_tax(taxable, region)
        total = taxable + tax
        return PriceCalculation(
            subtotal=subtotal,
            discount_pct=(discount / subtotal * 100) if subtotal else 0.0,
            tax_amount=tax,
            total=round(total, 2),
        )


class StandardPricing(PricingStrategy):
    """Default pricing: no discount, standard 8% tax."""

    def compute_discount(self, subtotal: float) -> float:
        return 0.0

    def compute_tax(self, taxable: float, region: str) -> float:
        # Tax rate varies by region
        rates = {"US": 0.08, "EU": 0.20, "UK": 0.20, "JP": 0.10}
        rate = rates.get(region, 0.05)
        return round(taxable * rate, 2)


class MembersPricing(PricingStrategy):
    """Member pricing: 10% discount on all orders."""

    def compute_discount(self, subtotal: float) -> float:
        return subtotal * 0.10

    def compute_tax(self, taxable: float, region: str) -> float:
        # Same tax rates as standard
        rates = {"US": 0.08, "EU": 0.20, "UK": 0.20, "JP": 0.10}
        rate = rates.get(region, 0.05)
        return round(taxable * rate, 2)


class WholesalePricing(PricingStrategy):
    """Wholesale pricing: tiered discounts based on volume."""

    def compute_discount(self, subtotal: float) -> float:
        if subtotal >= 10_000:
            return subtotal * 0.25  # 25% off for $10k+
        elif subtotal >= 5_000:
            return subtotal * 0.15  # 15% off for $5k+
        else:
            return subtotal * 0.05  # 5% off below $5k

    def compute_tax(self, taxable: float, region: str) -> float:
        # Wholesale may have tax exemptions by region
        tax_exempt = {"US": True}  # Simplified for demo
        if tax_exempt.get(region):
            return 0.0
        rates = {"US": 0.08, "EU": 0.20, "UK": 0.20, "JP": 0.10}
        rate = rates.get(region, 0.05)
        return round(taxable * rate, 2)


class BulkPricing(PricingStrategy):
    """Bulk pricing: volume-based discounts per item tier."""

    def compute_discount(self, subtotal: float) -> float:
        # Progressive discount based on quantity tiers (simulated by subtotal)
        if subtotal >= 50_000:
            return subtotal * 0.30
        elif subtotal >= 20_000:
            return subtotal * 0.20
        else:
            return subtotal * 0.10

    def compute_tax(self, taxable: float, region: str) -> float:
        rates = {"US": 0.08, "EU": 0.20, "UK": 0.20, "JP": 0.10}
        rate = rates.get(region, 0.05)
        return round(taxable * rate, 2)


class PriceEngine:
    """Client that uses a strategy — switches at runtime with zero changes to this class."""

    def __init__(self, strategy: PricingStrategy) -> None:
        self._strategy = strategy

    @property
    def strategy(self) -> PricingStrategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: PricingStrategy) -> None:
        """Allow runtime strategy swap."""
        self._strategy = strategy

    def calculate(self, subtotal: float, region: str) -> PriceCalculation:
        return self._strategy.calculate(subtotal, region)


# Usage example — demonstrates runtime strategy swapping
if __name__ == "__main__":
    engine = PriceEngine(StandardPricing())

    # Standard customer in US
    result = engine.calculate(100.0, "US")
    print(f"Standard:  subtotal=${result.subtotal:.2f}, discount={result.discount_pct:.1f}%, "
          f"tax=${result.tax_amount:.2f}, total=${result.total:.2f}")

    # Switch to member pricing at runtime
    engine.strategy = MembersPricing()
    result = engine.calculate(100.0, "US")
    print(f"Member:    subtotal=${result.subtotal:.2f}, discount={result.discount_pct:.1f}%, "
          f"tax=${result.tax_amount:.2f}, total=${result.total:.2f}")

    # Switch to wholesale pricing for bulk customer
    engine.strategy = WholesalePricing()
    result = engine.calculate(8_000.0, "US")
    print(f"Wholesale: subtotal=${result.subtotal:.2f}, discount={result.discount_pct:.1f}%, "
          f"tax=${result.tax_amount:.2f}, total=${result.total:.2f}")
```

**When to prefer Strategy:**
- Multiple algorithms solve the same problem and need runtime selection
- You want to avoid long `if/elif/else` chains that select different algorithms
- Different strategies have different testability requirements
- The algorithm selection criteria can change at runtime (user config, A/B testing)

**Strategy vs Inheritance:** Prefer Strategy over subclassing when you need to vary behavior independently of the class hierarchy. With Strategy, you compose behaviors; with inheritance, you are locked into a single branch of the class tree.

---

### Pattern 5: Template Method — Fixed Algorithm Skeleton

The Template Method pattern defines the skeleton of an algorithm in a base class while letting subclasses override specific steps without changing the overall structure. Use it when multiple classes share the same high-level algorithm but differ in one or more steps. This is the primary behavioral pattern that uses inheritance intentionally.

```python
from __future__ import annotations
import abc


class DataPipeline(abc.ABC):
    """Abstract pipeline: defines the fixed processing order.
    
    Subclasses override specific steps while preserving the overall flow.
    Steps marked _hook are optional overrides; steps starting with 
    _execute are mandatory.
    """

    def process(self, raw_data: str) -> dict[str, Any]:
        """Fixed algorithm skeleton — subclasses cannot reorder these steps."""
        print(f"Pipeline starting for input length: {len(raw_data)}")
        
        data = self._load(raw_data)          # Step 1: mandatory hook
        validated = self._validate(data)     # Step 2: mandatory hook  
        transformed = self._transform(validated)  # Step 3: mandatory hook
        
        if self._pre_save_hook():            # Step 4: optional hook (default: pass)
            print("Pre-save hook executed")
        
        result = self._save(transformed)     # Step 5: abstract method (must override)
        
        self._post_save_hook(result)         # Step 6: optional hook (default: log)
        
        print(f"Pipeline complete. Output keys: {list(result.keys())}")
        return result

    # ── Hooks that subclasses MUST override ────────────────

    @abc.abstractmethod
    def _load(self, raw_data: str) -> dict[str, Any]: ...

    @abc.abstractmethod
    def _validate(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abc.abstractmethod
    def _transform(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abc.abstractmethod
    def _save(self, transformed: dict[str, Any]) -> dict[str, Any]: ...

    # ── Hooks with default implementations (optional override) ─

    def _pre_save_hook(self) -> bool:
        """Called before saving. Return True to execute, False to skip."""
        return False

    def _post_save_hook(self, result: dict[str, Any]) -> None:
        """Called after saving. Default implementation logs the result."""
        print(f"Post-save: recorded {len(result)} fields")


# ── Concrete Pipelines ────────────────────────────────────────

class CSVToDatabasePipeline(DataPipeline):
    """Parses CSV input, validates records, transforms to DB format, saves to PostgreSQL."""

    def _load(self, raw_data: str) -> dict[str, Any]:
        # Simulated CSV parsing
        records = []
        for line in raw_data.strip().split("\n"):
            fields = line.split(",")
            records.append({"id": int(fields[0]), "name": fields[1], "value": float(fields[2])})
        return {"records": records, "count": len(records)}

    def _validate(self, data: dict[str, Any]) -> dict[str, Any]:
        validated = []
        for record in data["records"]:
            if record["name"].strip() and record["value"] > 0:
                validated.append(record)
            else:
                print(f"  SKIPPING invalid record: {record}")
        data["records"] = validated
        return data

    def _transform(self, data: dict[str, Any]) -> dict[str, Any]:
        for record in data["records"]:
            record["name"] = record["name"].upper()
            record["processed_at"] = "2026-05-19T12:00:00Z"
            record["source"] = "csv_upload"
        return data

    def _save(self, transformed: dict[str, Any]) -> dict[str, Any]:
        print(f"  Saving {transformed['count']} records to PostgreSQL...")
        # In real code: cursor.executemany("INSERT INTO ...", transformed["records"])
        return {"saved_count": transformed["count"], "table": "enriched_data"}

    def _pre_save_hook(self) -> bool:
        return True  # CSV pipeline always runs pre-save validation

    def _post_save_hook(self, result: dict[str, Any]) -> None:
        print(f"Post-save: Wrote {result['saved_count']} records to {result['table']}")


class APIToWarehousePipeline(DataPipeline):
    """Fetches data from REST API, validates JSON schema, transforms for data warehouse."""

    def _load(self, raw_data: str) -> dict[str, Any]:
        # Simulated API response parsing
        import json
        return json.loads(raw_data)

    def _validate(self, data: dict[str, Any]) -> dict[str, Any]:
        if "results" not in data:
            raise ValueError("API response missing 'results' field")
        return data

    def _transform(self, data: dict[str, Any]) -> dict[str, Any]:
        for item in data["results"]:
            item["ingested_at"] = "2026-05-19T12:00:00Z"
            item["pipeline_version"] = "v2.1"
        return data

    def _save(self, transformed: dict[str, Any]) -> dict[str, Any]:
        print(f"  Saving to data warehouse ({len(transformed['results'])} records)...")
        return {
            "saved_count": len(transformed["results"]),
            "table": "warehouse_staging",
        }


# Usage example
if __name__ == "__main__":
    csv_data = """1,Alice,100.5
2,Bob,200.3
3,,50.0"""

    pipeline = CSVToDatabasePipeline()
    result = pipeline.process(csv_data)

    print("---\n")

    api_data = '{"results": [{"id": 1, "name": "Widget"}, {"id": 2, "name": "Gadget"}]}'
    warehouse_pipeline = APIToWarehousePipeline()
    result2 = warehouse_pipeline.process(api_data)
```

**When to prefer Template Method:**
- Multiple classes share the same algorithm skeleton but differ in specific steps
- You want to enforce a fixed processing order while allowing customization of individual steps
- Subclassing is acceptable and desired (this pattern uses inheritance intentionally)

**Template Method anti-pattern warning:**
- Don't create deep inheritance chains — 2-3 levels max, then extract common behavior into a Strategy or composite class
- If most subclasses override all steps, Template Method adds no value — use Strategy instead
- Always make hooks `def _hook(self) -> bool: return False` (no-op default), never raise NotImplementedError in optional methods

---

### Pattern 6: Mediator — Centralized Object Coordination

The Mediator pattern defines an object that encapsulates how a set of objects interact. It promotes loose coupling by preventing objects from referring to each other explicitly, and it lets you vary their interaction independently. Use it for GUI components, chat systems, workflow engines, and any scenario where many objects have complex N-to-N relationships.

```python
from __future__ import annotations
from typing import Any


class ChatMediator:
    """Central coordinator for all message flow between users."""

    def __init__(self) -> None:
        self._users: list[ChatUser] = []

    def add_user(self, user: ChatUser) -> None:
        self._users.append(user)

    def send_message(self, sender: ChatUser, message: str, recipient: ChatUser | None = None) -> None:
        """Route a message from sender to recipient(s)."""
        if recipient:
            # Direct message — only deliver to one user
            if recipient in self._users and recipient is not sender:
                recipient.receive_message(sender.name, message)
            else:
                print(f"[{sender.name}] → ERROR: '{recipient.name}' is not in this chat")
        else:
            # Broadcast to all other users
            for user in self._users:
                if user is not sender:
                    user.receive_message(sender.name, message)

    def notify_user_added(self, new_user: ChatUser) -> None:
        """System notification when a new user joins."""
        self.send_message(new_user, f"📢 {new_user.name} has joined the chat")


class ChatUser:
    """A chat participant that communicates through the mediator only."""

    def __init__(self, name: str, mediator: ChatMediator) -> None:
        self.name = name
        self._mediator = mediator

    def send_to(self, recipient: ChatUser, message: str) -> None:
        """Send a direct message — user does NOT talk to other users directly."""
        print(f"\n[{self.name}] → [{recipient.name}]: {message}")
        self._mediator.send_message(self, message, recipient)

    def broadcast(self, message: str) -> None:
        """Send a message to all other users in the chat."""
        print(f"\n[{self.name}] (broadcast): {message}")
        self._mediator.send_message(self, message)

    def receive_message(self, from_name: str, message: str) -> None:
        """Called by mediator when this user receives a message."""
        print(f"  [{self.name}] ← [{from_name}]: {message}")


# Usage example
if __name__ == "__main__":
    mediator = ChatMediator()

    alice = ChatUser("Alice", mediator)
    bob = ChatUser("Bob", mediator)
    charlie = ChatUser("Charlie", mediator)

    mediator.add_user(alice)
    mediator.add_user(bob)
    mediator.add_user(charlie)

    alice.broadcast("Hello everyone!")   # Bob and Charlie see this
    alice.send_to(bob, "Private message")  # Only Bob sees this
```

**When to prefer Mediator:**
- Many objects communicate directly through tight coupling (N-to-N relationships)
- Changing the interaction between objects would require modifying many classes
- You want to centralize business logic for object coordination in one place

**Mediator anti-pattern warning:**
- Don't make the mediator a "god object" — it should route and coordinate, not contain all the domain logic
- If communication is simple (one sender, one receiver), direct calls are clearer than a mediator


### Pattern 7: Chain of Responsibility — Passing Requests Along a Handler Chain

The Chain of Responsibility pattern passes a request along a chain of handlers. Each handler decides whether to process the request or pass it to the next handler in the chain. Use it for multi-stage processing pipelines, permission checks, middleware-like patterns, and scenarios where multiple objects might handle a request but only one should.

```python
from __future__ import annotations
import abc
from typing import Any


class LogEntry:
    """Simple log entry that flows through the handler chain."""
    def __init__(self, level: str, message: str) -> None:
        self.level = level  # DEBUG, INFO, WARNING, ERROR, CRITICAL
        self.message = message
        self.formatted: str | None = None
        self.is_sent: bool = False
        self.redacted: bool = False


class LogHandler(abc.ABC):
    """Abstract handler in the chain."""

    def __init__(self) -> None:
        self._next: LogHandler | None = None

    def set_next(self, handler: LogHandler) -> LogHandler:
        """Link this handler to the next one. Returns the linked handler for chaining convenience."""
        self._next = handler
        return handler

    def handle(self, entry: LogEntry) -> LogEntry:
        if self.can_handle(entry):
            entry = self.process(entry)
        if self._next:
            entry = self._next.handle(entry)
        return entry

    @abc.abstractmethod
    def can_handle(self, entry: LogEntry) -> bool: ...

    @abc.abstractmethod
    def process(self, entry: LogEntry) -> LogEntry: ...


class LevelFilterHandler(LogHandler):
    """Filters out log entries below a minimum severity level."""

    LEVEL_PRIORITY = {
        "DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3, "CRITICAL": 4,
    }

    def __init__(self, min_level: str = "INFO") -> None:
        super().__init__()
        self.min_level = min_level

    def can_handle(self, entry: LogEntry) -> bool:
        return self.LEVEL_PRIORITY.get(entry.level, -1) >= self.LEVEL_PRIORITY.get(self.min_level, 0)

    def process(self, entry: LogEntry) -> LogEntry:
        print(f"[{self.__class__.__name__}] Accepted '{entry.level}': {entry.message}")
        return entry


class FormatterHandler(LogHandler):
    """Adds a timestamp prefix to the log message."""

    def can_handle(self, entry: LogEntry) -> bool:
        return True  # All entries get formatted

    def process(self, entry: LogEntry) -> LogEntry:
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        entry.formatted = f"[{timestamp}] [{entry.level}] {entry.message}"
        print(f"[{self.__class__.__name__}] Formatted → {entry.formatted}")
        return entry


class RedactorHandler(LogHandler):
    """Redacts sensitive patterns (credit cards, SSNs) from log messages."""

    SENSITIVE_PATTERNS = ["SSN", "social security", "credit card"]

    def can_handle(self, entry: LogEntry) -> bool:
        return any(pattern.lower() in entry.message.lower() for pattern in self.SENSITIVE_PATTERNS)

    def process(self, entry: LogEntry) -> LogEntry:
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern.lower() in entry.message.lower():
                entry.message = entry.message.replace(pattern.lower(), f"[{pattern.upper()} REDACTED]")
        entry.redacted = True
        print(f"[{self.__class__.__name__}] Redacted sensitive data")
        return entry


class EmailAlertHandler(LogHandler):
    """Sends email alerts for ERROR and CRITICAL level entries."""

    def can_handle(self, entry: LogEntry) -> bool:
        return entry.level in ("ERROR", "CRITICAL")

    def process(self, entry: LogEntry) -> LogEntry:
        print(f"[{self.__class__.__name__}] 📧 EMAIL ALERT sent for [{entry.level}]: {entry.message[:50]}...")
        entry.is_sent = True
        return entry


class ConsoleWriterHandler(LogHandler):
    """Writes all entries to the console. Always processes."""

    def can_handle(self, entry: LogEntry) -> bool:
        return True

    def process(self, entry: LogEntry) -> LogEntry:
        output = entry.formatted or f"[{entry.level}] {entry.message}"
        print(f"  >> CONSOLE: {output}")
        return entry


# Usage example — build the chain
if __name__ == "__main__":
    # Build handler chain with explicit ordering
    console = ConsoleWriterHandler()
    email = EmailAlertHandler()
    redactor = RedactorHandler()
    formatter = FormatterHandler()
    level_filter = LevelFilterHandler(min_level="DEBUG")

    # Chain: filter → format → redact → email (if applicable) → console
    chain = (level_filter
             .set_next(formatter)
             .set_next(redactor)
             .set_next(email)
             .set_next(console))

    # Test with different log levels
    chain.handle(LogEntry("DEBUG", "Initializing connection pool"))  # Filtered out at LevelFilterHandler
    print("---")
    chain.handle(LogEntry("INFO", "User logged in successfully"))   # Passes through filter, formatted, written
    print("---")
    chain.handle(LogEntry("WARNING", "Connection timeout to database"))  # Warning path
    print("---")
    chain.handle(LogEntry("ERROR", "SSN 123-45-6789 exposed in logs"))  # ERROR: email + redact + console
```

**When to prefer Chain of Responsibility:**
- Multiple objects can handle a request and the handler is not known ahead of time
- You want to issue a request without specifying its recipient explicitly
- The set of handlers and their order should be configurable at runtime

---

### Pattern 8: Iterator — Transparent Collection Traversal

The Iterator pattern provides a way to access the elements of a collection sequentially without exposing its underlying representation. Use it when your collections have complex internal structures (trees, graphs, nested lists) and you want standard iteration behavior (`for x in collection`). Python's built-in `__iter__` and `yield` make this pattern trivial — but knowing when to write custom iterators is valuable for generators that transform or filter data on-the-fly.

```python
from __future__ import annotations
import abc
from collections.abc import Iterator


class BinarySearchTree(Iterator[int]):
    """A binary search tree that implements the iterator protocol directly."""

    def __init__(self) -> None:
        self._root: BinaryNode[int] | None = None

    def insert(self, value: int) -> None:
        if self._root is None:
            self._root = BinaryNode(value)
            return
        current = self._root
        while True:
            if value < current.value:
                if current.left is None:
                    current.left = BinaryNode(value)
                    break
                current = current.left
            else:
                if current.right is None:
                    current.right = BinaryNode(value)
                    break
                current = current.right

    # Iterator protocol implementation
    def __iter__(self) -> Iterator[int]:
        self._current_nodes: list[BinaryNode[int]] = []
        self._collect_inorder(self._root)
        self._node_index = 0
        return self

    def _collect_inorder(self, node: BinaryNode[int] | None) -> None:
        if node is None:
            return
        self._collect_inorder(node.left)
        self._current_nodes.append(node)
        self._collect_inorder(node.right)

    def __next__(self) -> int:
        if self._node_index >= len(self._current_nodes):
            raise StopIteration
        node = self._current_nodes[self._node_index]
        self._node_index += 1
        return node.value


class BinaryNode[T]:
    """Node in a binary search tree."""

    def __init__(self, value: T) -> None:
        self.value = value
        self.left: BinaryNode[T] | None = None
        self.right: BinaryNode[T] | None = None


# ── Custom Iterator for Transforming Data ─────────────────────

class ChunkedIterator(Iterator[list[str]]):
    """Splits an iterable into fixed-size chunks."""

    def __init__(self, data: list[str], chunk_size: int) -> None:
        self._data = data
        self._chunk_size = chunk_size
        self._index = 0

    def __next__(self) -> list[str]:
        if self._index >= len(self._data):
            raise StopIteration
        chunk = self._data[self._index : self._index + self._chunk_size]
        self._index += self._chunk_size
        return chunk


# ── Lazy Filtering Iterator (generator-based) ────────────────

def filtered_iterator(items: list[str], predicate: str) -> Iterator[str]:
    """Yield only items that contain the search string (lazy evaluation)."""
    for item in items:
        if predicate.lower() in item.lower():
            yield item


# Usage example
if __name__ == "__main__":
    # Binary Search Tree iteration (in-order = sorted)
    bst = BinarySearchTree()
    for value in [50, 30, 70, 20, 40, 60, 80]:
        bst.insert(value)
    
    print("BST in-order traversal:", list(bst))  # [20, 30, 40, 50, 60, 70, 80]

    # Chunked iteration over a large dataset
    products = [f"Product {i}" for i in range(1, 11)]
    chunks = list(ChunkedIterator(products, chunk_size=3))
    print("\nChunked (size 3):", chunks)

    # Lazy filtered iteration
    words = ["apple", "banana", "apricot", "cherry", "avocado", "blueberry"]
    matches = list(filtered_iterator(words, "a"))
    print("Filtered for 'a':", matches)
```

**When to prefer Iterator:**
- Your collection has a complex internal structure that shouldn't be exposed to callers
- You need multiple simultaneous traversals of the same data
- You want lazy evaluation — compute values on-demand rather than pre-building a list
- You need custom traversal order (in-order, reverse, breadth-first) for your collection

---

## Pattern Selection Guide

When you have a behavioral problem and are unsure which pattern to apply:

| Problem | Best Fit | Alternative |
|---------|----------|-------------|
| Objects must react to changes | **Observer** | Signals/events, pub/sub libraries |
| Behavior depends on state | **State** | State machine libraries |
| Need to queue/log/undo requests | **Command** | Task queues (Celery, RQ) |
| Algorithms need runtime selection | **Strategy** | Factory pattern for creation |
| Shared algorithm skeleton, different steps | **Template Method** | Strategy + composition |
| N-to-N object coupling | **Mediator** | Service locator, event bus |
| Multiple handlers in sequence | **Chain of Responsibility** | Middleware pipelines |
| Custom collection traversal | **Iterator** | Python's `__iter__` / `yield` |

---

## Constraints

### MUST DO
- Use `typing.Protocol` or `abc.ABC` for all pattern interfaces — define the contract before writing implementations
- Keep each concrete participant focused on a single responsibility within the pattern
- Use Python's built-in iteration (`yield`, `__iter__`) where possible before writing custom iterators
- Test each concrete pattern participant in isolation before testing the full pattern assembly
- Prefer Strategy over subclassing for algorithm variation — inheritance adds coupling

### MUST NOT DO
- Don't use Observer for simple notification where a direct callback suffices (two objects, one notification)
- Don't create deep State hierarchies with inheritance — each state class should be flat, not extending other states
- Don't overuse Template Method — if subclasses override most steps, use Strategy instead of inheritance
- Don't make the Mediator contain domain logic — it routes and coordinates, the participants do the work
- Don't build custom iterators when Python's `yield` generators solve the problem

---

## Output Template

When this skill is active, produce:

1. **Problem Description** — What behavioral concern needs solving
2. **Selected Pattern** — The pattern name with rationale for why it fits best
3. **Interface Definition** — The abstract base class or Protocol with typed signatures
4. **Concrete Implementations** — Each participant class with docstrings
5. **Composition Root** — How participants are wired together in the application entry point

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-patterns-and-principles` | Covers GoF creational and structural patterns, and SOLID principles that inform behavioral pattern selection |
| `event-driven-architecture` | Event-driven systems built on Observer and Command patterns at scale |
| `refactoring` | Techniques for introducing behavioral patterns into existing codebases |
| `modular-design` | Principles for structuring modules so behavioral patterns integrate cleanly |
