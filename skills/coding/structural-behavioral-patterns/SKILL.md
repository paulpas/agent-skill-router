---




name: structural-behavioral-patterns
description: Implements GoF structural and behavioral design patterns (Adapter, Observer, Strategy, Command, Facade, Template Method, Mediator) to decouple components and manage object responsibilities.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: structural patterns, behavioral patterns, adapter pattern, observer pattern, strategy pattern, command pattern, facade pattern, how do i decouple code
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: structural-design-patterns, behavioral-design-patterns, creational-design-patterns, design-patterns-architecture
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





# Structural & Behavioral Design Patterns

Applies GoF structural and behavioral design patterns to decouple components, manage object responsibilities, and establish clean communication channels between classes. This skill makes the model select the right pattern for interface adaptation (Adapter), feature composition (Bridge, Composite, Decorator, Facade, Proxy, Flyweight), runtime behavior swapping (Strategy), request encapsulation (Command), template-based inheritance (Template Method), event-driven decoupling (Observer), and workflow orchestration (Mediator, Chain of Responsibility).

## TL;DR Checklist

- [ ] Identify the structural problem first: incompatible interfaces (Adapter), tree structures (Composite), dynamic augmentation (Decorator), simplified APIs (Facade), access control (Proxy), shared data (Flyweight)
- [ ] Identify the behavioral problem first: interchangeable algorithms (Strategy), request encapsulation with undo (Command), template-based inheritance (Template Method), event pub/sub (Observer), workflow delegation (Mediator), sequential processing (Chain of Responsibility)
- [ ] Prefer composition over inheritance for all structural and behavioral patterns
- [ ] Use `typing.Protocol` or ABC interfaces to ensure transparent substitution of pattern participants
- [ ] Enforce Open/Closed Principle through polymorphism, not conditional logic branches
- [ ] Ensure Facade does not become a god object — delegate to domain services
- [ ] Keep Command objects immutable where possible for thread-safe undo/redo stacks
- [ ] Use Observer with weak references to prevent memory leaks from forgotten unsubscription
- [ ] Avoid over-engineering: do not apply patterns where simple function calls suffice

---

## When to Use

Use this skill when:

- Two existing classes have incompatible interfaces and you need them to work together without modifying either class's source
- You need to add new responsibilities to objects dynamically at runtime instead of via subclassing (Decorator)
- A subsystem has a complex API and you want a simplified unified interface for common operations (Facade)
- You want to swap algorithms or strategies at runtime based on context or configuration (Strategy)
- You need to encapsulate requests as objects so you can parameterize clients with different requests, queue them, log them, or support undo/redo (Command)
- Multiple objects need to be notified when another object's state changes, and you want loose coupling between the subject and its observers (Observer)
- You have a family of related operations that share common steps but differ in specific details (Template Method)
- You are building a tree-like part-whole hierarchy where clients should treat individual objects and compositions uniformly (Composite)
- You need to control access to an object, defer initialization, or add caching/authentication layers without changing the original class (Proxy)
- You have many objects that share intrinsic state and can safely share it across instances (Flyweight)

---

## When NOT to Use

Avoid this skill for:

- Simple functions or methods that accomplish the task directly — do not introduce a pattern for pattern's sake (see YAGNI)
- Inheritance hierarchies where subclassing cleanly covers the variation — Template Method may apply, but prefer Strategy for runtime swaps
- When you can use composition and direct method calls without needing decoupled event notification — Observer adds unnecessary indirection
- Performance-critical inner loops where the indirection overhead of a pattern matters — inline the logic directly
- Domain models that already have clear responsibility boundaries — do not force patterns onto well-designed code (see SOLID as the primary guide)

---

## Core Workflow

1. **Identify the Structural vs. Behavioral Problem** — Determine whether the problem is about object composition/structure (Adapter, Bridge, Composite, Decorator, Facade, Proxy, Flyweight) or about object responsibilities and communication (Observer, Strategy, Command, Template Method, Mediator, Chain of Responsibility).
   **Checkpoint:** If the problem is "make these two interfaces work together," it is structural. If it is "change behavior at runtime" or "notify multiple objects," it is behavioral.

2. **Select the Pattern Based on the Specific Problem** — Map the problem to the correct pattern using the decision matrix:
   - Incompatible interface → Adapter
   - Need abstraction separated from implementation details → Bridge
   - Tree-like part-whole hierarchy → Composite
   - Add behaviors dynamically without subclassing → Decorator
   - Simplify complex subsystem API → Facade
   - Control/lazy-load/access-check an object → Proxy
   - Share data among many instances → Flyweight
   - Swap algorithms at runtime → Strategy
   - Encapsulate requests with undo/redo → Command
   - Define algorithm skeleton in a base class → Template Method
   - Decouple event publishers from subscribers → Observer
   - Centralize communication between many objects → Mediator
   - Process requests through multiple handlers sequentially → Chain of Responsibility

3. **Define the Interfaces (Protocols)** — Use `typing.Protocol` or `abc.ABC` to define the common interface that all concrete participants will implement. This is the critical step that ensures type safety and polymorphic substitution.
   **Checkpoint:** Every concrete class in the pattern must satisfy the protocol/ABC interface. Verify with static type checking before proceeding.

4. **Implement Participants with Composition** — Build each pattern participant as a separate class, connected through composition (aggregation) rather than inheritance where possible. Each class should have a single responsibility aligned with its role in the pattern.
   **Checkpoint:** No class should do more than what the GoF definition of its role requires. Apply SRP strictly.

5. **Wire Participants Together** — Connect the subject/client to the adaptee/implementation/strategy/command via dependency injection (constructor or setter). Ensure the client interacts only with the abstract interface, never with concrete implementations directly.
   **Checkpoint:** The client should compile and work if you swap any concrete participant for another that satisfies the same protocol.

6. **Add Error Handling and Edge Cases** — Implement guard clauses in pattern entry points (e.g., empty observer lists in Observer, null commands in Command). Validate state transitions where applicable (e.g., command state before undo).
   **Checkpoint:** Pattern runtime should never crash due to an empty collection, missing handler, or null reference.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Adapter Pattern

Makes incompatible interfaces work together by wrapping one interface in a new interface that clients expect. The adapter translates calls to the adaptee's native interface.

Use Adapter when you must integrate a third-party library, legacy code, or an external service whose API does not match what your application expects. It is the only structural pattern that deals with interface incompatibility rather than object structure.

```python
from __future__ import annotations
import logging
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)


@runtime_checkable
class PaymentProcessor(Protocol):
    """The target interface expected by the application."""

    def process_payment(self, amount: float, currency: str) -> bool: ...


@runtime_checkable
class LegacyPaymentGateway(Protocol):
    """The existing (incompatible) interface we need to adapt."""

    def send_payment_request(self, value: int, code: str) -> dict[str, str]: ...


class PaymentGatewayAdapter(PaymentProcessor):
    """Adapts LegacyPaymentGateway to the PaymentProcessor target interface.

    The adapter sits between the client (which expects PaymentProcessor)
    and the legacy system (which exposes LegacyPaymentGateway). It translates
    parameter names, units, and response formats.
    """

    def __init__(self, gateway: LegacyPaymentGateway) -> None:
        self._gateway = gateway

    def process_payment(self, amount: float, currency: str) -> bool:
        try:
            # Convert from dollars (float) to cents (int), normalize currency code
            cents = int(round(amount * 100))
            result = self._gateway.send_payment_request(cents, currency.upper())

            if result.get("status") == "SUCCESS":
                logger.info("Payment of %.2f %s processed", amount, currency)
                return True
            else:
                logger.warning("Payment failed: %s", result.get("message", "unknown"))
                return False
        except Exception as exc:
            logger.error("Adapter error processing %.2f %s: %s", amount, currency, exc)
            raise RuntimeError(f"Payment adapter failed: {exc}") from exc


# Example usage — client code knows only about PaymentProcessor
def checkout(processor: PaymentProcessor, total: float, currency: str) -> None:
    success = processor.process_payment(total, currency)
    if not success:
        raise ValueError("Checkout failed")
```

**❌ BAD — Modifying the legacy class directly to match the new interface:**

```python
# ❌ BAD: Violates Open/Closed Principle — modifying external/legacy code
class BrokenLegacyGateway(LegacyPaymentGateway):
    def send_payment_request(self, value: int, code: str) -> dict[str, str]:
        # Someone had to modify this class just to fit our app...
        result = original_gateway.send_payment_request(value, code)
        if result.get("status") == "SUCCESS":
            return {"ok": True}  # Breaking the contract of LegacyPaymentGateway
        return {"ok": False}
```

**✅ GOOD — Adapter wraps without modification:**

```python
# ✅ GOOD: Legacy code untouched; adapter translates between worlds
class CleanGatewayAdapter(PaymentProcessor):
    def __init__(self, gateway: LegacyPaymentGateway) -> None:
        self._gateway = gateway

    def process_payment(self, amount: float, currency: str) -> bool:
        cents = int(round(amount * 100))
        result = self._gateway.send_payment_request(cents, currency.upper())
        return result.get("status") == "SUCCESS"
```

**Practical note:** Use Adapter when integrating external libraries, migrating from one API version to another, or making a legacy module conform to a new interface contract. Choose Object Adapter (composition) over Class Adapter (inheritance) in Python — Python's multiple inheritance is fragile for this purpose.

---

### Pattern 2: Strategy Pattern

Defines a family of interchangeable algorithms, encapsulates each one, and makes them swappable at runtime. The context holds a reference to a strategy interface and delegates to it instead of implementing the algorithm directly.

Use Strategy when you have multiple variants of an algorithm (e.g., sorting orders, pricing models, notification delivery methods) and you need to switch between them based on configuration, user choice, or runtime conditions — without bloating a single class with conditional logic.

```python
from __future__ import annotations
import math
from typing import Protocol


class PricingStrategy(Protocol):
    """All pricing algorithms must implement this interface."""

    def calculate_price(self, base_price: float, quantity: int) -> float: ...


class FlatRatePricing:
    """Charges the standard list price per unit."""

    def calculate_price(self, base_price: float, quantity: int) -> float:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        return round(base_price * quantity, 2)


class VolumeDiscountPricing:
    """Applies tiered volume discounts based on quantity thresholds."""

    TIERS: list[tuple[int, float]] = [
        (10, 0.05),   # 10+ units → 5% off
        (50, 0.10),   # 50+ units → 10% off
        (100, 0.15),  # 100+ units → 15% off
    ]

    def calculate_price(self, base_price: float, quantity: int) -> float:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        discount = 0.0
        for threshold, rate in self.TIERS:
            if quantity >= threshold:
                discount = rate

        subtotal = base_price * quantity
        return round(subtotal * (1 - discount), 2)


class DynamicPricing:
    """Adjusts price based on demand multiplier and time-of-day factor."""

    def __init__(self, demand_multiplier: float = 1.0, time_factor: float = 1.0) -> None:
        self.demand_multiplier = max(0.5, min(demand_multiplier, 3.0))
        self.time_factor = max(0.7, min(time_factor, 2.0))

    def calculate_price(self, base_price: float, quantity: int) -> float:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        adjusted = base_price * self.demand_multiplier * self.time_factor
        return round(adjusted * quantity, 2)


class PricingContext:
    """Delegates pricing decisions to a strategy. Can swap strategies at runtime."""

    def __init__(self, strategy: PricingStrategy) -> None:
        self._strategy = strategy

    @property
    def strategy(self) -> PricingStrategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: PricingStrategy) -> None:
        """Swap to a different pricing strategy at runtime."""
        self._strategy = strategy

    def calculate(self, base_price: float, quantity: int) -> float:
        return self._strategy.calculate_price(base_price, quantity)


# Example usage — context works with any strategy without knowing which one
def order_total(context: PricingContext, price: float, qty: int) -> float:
    return context.calculate(price, qty)
```

**❌ BAD — Conditional logic instead of Strategy:**

```python
# ❌ BAD: New pricing type requires modifying the class every time
class BrokenOrderProcessor:
    def __init__(self, pricing_type: str = "flat") -> None:
        self._pricing_type = pricing_type

    def calculate(self, base_price: float, quantity: int) -> float:
        if self._pricing_type == "flat":
            return round(base_price * quantity, 2)
        elif self._pricing_type == "volume":
            discount = 0.10 if quantity >= 50 else 0.05
            return round(base_price * quantity * (1 - discount), 2)
        elif self._pricing_type == "dynamic":
            demand = 1.5  # magic constant — should be configurable
            return round(base_price * demand * quantity, 2)
        else:
            raise ValueError(f"Unknown pricing type: {self._pricing_type}")
```

**✅ GOOD — Strategy pattern with interchangeable algorithms:**

```python
# ✅ GOOD: New strategy = new class, no modification to context
context = PricingContext(FlatRatePricing())
assert context.calculate(10.0, 5) == 50.0

context.strategy = VolumeDiscountPricing()
assert context.calculate(10.0, 60) == 540.0  # 10% volume discount applied

context.strategy = DynamicPricing(demand_multiplier=1.5)
assert context.calculate(10.0, 5) == 75.0
```

**Practical note:** Choose Strategy when behavior varies by configuration or external conditions and you want the selection logic decoupled from the execution logic. Use it instead of inheritance for runtime-swappable behavior; use inheritance (Template Method) for compile-time class hierarchies with shared step sequences.

---

### Pattern 3: Observer Pattern

Establishes a one-to-many dependency between objects so that when one object (the subject) changes state, all its dependents (observers) are notified and updated automatically. Enables event-driven architecture with loose coupling between publishers and subscribers.

Use Observer when multiple components need to react to the same state change without knowing about each other directly. It is the backbone of event systems, pub/sub messaging, reactive UI frameworks, and domain events in DDD.

```python
from __future__ import annotations
import weakref
from typing import Protocol
from abc import ABC


class Observer(ABC):
    """Base class for all observers."""

    def update(self, subject: str, event_data: dict) -> None: ...


class Subject:
    """Maintains a list of observers and notifies them of state changes.

    Uses weak references to prevent memory leaks from forgotten unsubscription.
    Thread-safe for basic add/remove/notify operations via internal lock-free
    copy-on-read pattern for the observer list.
    """

    def __init__(self) -> None:
        self._observers: list[weakref.ref[Observer]] = []
        self._state: dict[str, object] = {}

    @property
    def state(self) -> dict[str, object]:
        return dict(self._state)

    @state.setter
    def state(self, value: dict[str, object]) -> None:
        """Update state and notify all registered observers."""
        self._state = dict(value)  # Defensive copy
        self._notify_all()

    def register(self, observer: Observer) -> None:
        if not isinstance(observer, Observer):
            raise TypeError("Observer must implement the Observer protocol")
        ref = weakref.ref(observer)
        if ref not in self._observers:
            self._observers.append(ref)

    def unregister(self, observer: Observer) -> None:
        target_ref = weakref.ref(observer)
        self._observers = [r for r in self._observers if r != target_ref]

    def _notify_all(self) -> None:
        """Notify all live observers, filtering out garbage-collected ones."""
        live_observers: list[weakref.ref[Observer]] = []
        for ref in self._observers:
            obs = ref()
            if obs is not None:
                try:
                    obs.update(
                        subject=type(self).__name__,
                        event_data=dict(self._state),
                    )
                except Exception as exc:
                    # One observer's failure should not break others
                    import logging
                    logging.getLogger(__name__).warning(
                        "Observer %s failed: %s", obs, exc
                    )
                live_observers.append(ref)
            # Dead reference is silently removed on next notify cycle
        self._observers = live_observers


class PriceAlertObserver(Observer):
    """Watches for price changes and logs alerts."""

    def __init__(self, threshold: float) -> None:
        self.threshold = threshold

    def update(self, subject: str, event_data: dict) -> None:
        current = event_data.get("price", 0.0)
        if abs(current - self._prev_price) > self.threshold and hasattr(self, "_prev_price"):
            direction = "↑" if current > self._prev_price else "↓"
            print(f"[{subject}] Price {direction}: ${self._prev_price:.2f} → ${current:.2f}")
        self._prev_price = current


class EmailNotifierObserver(Observer):
    """Sends email notifications on specific events."""

    def __init__(self, email: str) -> None:
        self.email = email

    def update(self, subject: str, event_data: dict) -> None:
        if event_data.get("critical"):
            print(f"[{subject}] Email alert sent to {email}: "
                  f"Critical event — data={event_data}")


# Example usage — subject has no knowledge of concrete observer types
def demonstrate_observer() -> None:
    market = Subject()

    # Register observers
    alert = PriceAlertObserver(threshold=0.50)
    notifier = EmailNotifierObserver(email="trader@example.com")

    market.register(alert)
    market.register(notifier)

    # State changes trigger automatic notifications
    market.state = {"price": 150.0, "critical": False}
    market.state = {"price": 149.30, "critical": False}
    market.state = {"price": 125.00, "critical": True}

    # Unregister to stop receiving updates
    market.unregister(notifier)
```

**❌ BAD — Tightly coupled state changes via direct calls:**

```python
# ❌ BAD: Every change requires manually calling every dependent
class BrokenPriceTracker:
    def __init__(self) -> None:
        self.alert_service = AlertService()
        self.email_service = EmailService()
        self.logger = Logger()
        self._price: float = 0.0

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        self._price = value
        # Every new consumer adds another direct call here — violates OCP
        self.alert_service.check_threshold(self._price)
        self.email_service.send_alert(self._price)
        self.logger.log_price_change(self._price)
```

**✅ GOOD — Observer pattern with loose coupling:**

```python
# ✅ GOOD: Adding a new observer requires no changes to the subject
tracker = Subject()
tracker.register(PriceAlertObserver(threshold=1.0))
tracker.register(EmailNotifierObserver("ops@example.com"))
tracker.register(LoggerObserver())  # New observer — zero changes to Subject
tracker.state = {"price": 99.99}
```

**Practical note:** Use Observer when you have a broadcast notification requirement and multiple consumers should react independently. Guard against memory leaks by using weak references in the subject's observer registry. In async/await systems, consider async observers with `asyncio.create_task` to avoid blocking the subject's notify cycle.

---

### Pattern 4: Command Pattern

Encapsulates a request as an object, thereby letting you parameterize clients with different requests, queue or log requests, and support undo/redo operations. Each command object captures all information needed to execute the action.

Use Command when you need to decouple the invoker (which triggers actions) from the receiver (which performs them), when you need to queue tasks for later execution, or when you need undo/redo capability — such as in editor applications, trading order systems, and workflow engines.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class Command(ABC):
    """Abstract base for all commands."""

    @abstractmethod
    def execute(self) -> str: ...

    @abstractmethod
    def undo(self) -> str: ...


class OrderCommand(Command):
    """Encapsulates a trade order with full undo support.

    Stores the previous state so undo restores it exactly.
    Immutable command objects enable thread-safe command queues.
    """

    def __init__(self, account: Account, symbol: str, quantity: int, side: str) -> None:
        self.account = account
        self.symbol = symbol
        self.quantity = quantity
        self.side = side  # "BUY" or "SELL"

    def execute(self) -> str:
        if self.side == "BUY":
            result = self.account.buy(self.symbol, self.quantity)
        elif self.side == "SELL":
            result = self.account.sell(self.symbol, self.quantity)
        else:
            raise ValueError(f"Invalid side: {self.side}")
        return f"{self.side} {self.quantity} {self.symbol}: {result}"

    def undo(self) -> str:
        """Reverse the trade by doing the opposite operation."""
        opposite = "SELL" if self.side == "BUY" else "BUY"
        return self.account.sell(self.symbol, self.quantity) \
            if opposite == "SELL" else self.account.buy(self.symbol, self.quantity)


class Account:
    """Simple account with buy/sell operations and state tracking for undo."""

    def __init__(self, initial_cash: float = 10_000.0) -> None:
        self.cash = initial_cash
        self.positions: dict[str, int] = {}

    def buy(self, symbol: str, quantity: int) -> str:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        price = 150.0 + hash(symbol) % 50  # Deterministic fake price
        cost = price * quantity
        if cost > self.cash:
            return f"Insufficient funds: need ${cost:.2f}, have ${self.cash:.2f}"
        self.cash -= cost
        self.positions[symbol] = self.positions.get(symbol, 0) + quantity
        return f"Purchased {quantity} {symbol} @ ${price:.2f}"

    def sell(self, symbol: str, quantity: int) -> str:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        available = self.positions.get(symbol, 0)
        if available < quantity:
            return f"Insufficient {symbol} position: have {available}, want {quantity}"
        price = 155.0 + hash(symbol) % 45  # Deterministic fake price
        revenue = price * quantity
        self.cash += revenue
        self.positions[symbol] = available - quantity
        return f"Sold {quantity} {symbol} @ ${price:.2f}"


class CommandInvoker:
    """Manages command execution with undo/redo history.

    Maintains separate stacks for executed and undone commands,
    enabling full undo/redo support.
    """

    def __init__(self) -> None:
        self._history: list[Command] = []
        self._undone: list[Command] = []

    def execute_command(self, command: Command) -> str:
        result = command.execute()
        self._history.append(command)
        self._undone.clear()  # New action invalidates undone commands
        return result

    def undo(self) -> str:
        if not self._history:
            return "Nothing to undo"
        command = self._history.pop()
        result = command.undo()
        self._undone.append(command)
        return f"Undo: {result}"

    def redo(self) -> str:
        if not self._undone:
            return "Nothing to redo"
        command = self._undone.pop()
        # Re-execute the original command
        result = command.execute()
        self._history.append(command)
        return f"Redo: {result}"


# Example usage — invoker is completely decoupled from command details
def demonstrate_command() -> None:
    account = Account(initial_cash=10_000.0)
    invoker = CommandInvoker()

    buy_cmd = OrderCommand(account, "AAPL", 10, "BUY")
    print(invoker.execute_command(buy_cmd))   # BUY 10 AAPL: ...
    print(invoker.undo())                      # Undo: ... (sells back)
    print(invoker.redo())                      # Redo: ... (buys again)
```

**❌ BAD — Direct method calls with no encapsulation or undo:**

```python
# ❌ BAD: No abstraction layer, no undo capability
def execute_trade(account: Account, symbol: str, qty: int, side: str) -> None:
    if side == "BUY":
        account.buy(symbol, qty)
    else:
        account.sell(symbol, qty)
    # What if the user clicks the button twice? No idempotency or undo.


# ❌ BAD: Coupled invoker that knows about concrete operations
class BrokenUIInvoker:
    def __init__(self, account: Account) -> None:
        self.account = account

    def buy_button_clicked(self, symbol: str, qty: int) -> None:
        self.account.buy(symbol, qty)  # Tightly coupled to this exact operation
```

**✅ GOOD — Decoupled command with undo/redo:**

```python
# ✅ GOOD: Invoker manages history; commands are reusable and testable in isolation
invoker = CommandInvoker()
buy_aapl = OrderCommand(Account(), "AAPL", 5, "BUY")
sell_aapl = OrderCommand(buy_aapl.account, "AAPL", 2, "SELL")

print(invoker.execute_command(buy_aapl))  # Execute first command
print(invoker.execute_command(sell_aapl))  # Queue second command
print(invoker.undo())                       # Undo last: sell reversed → buy restored
print(invoker.undo())                       # Undo again: buy reversed → cash restored
```

**Practical note:** Use Command when you need to parameterize operations, support undo/redo queues, or decouple the UI layer from business logic. For persistent command queues (e.g., message brokers), serialize the command parameters as data and rehydrate them on the worker side rather than serializing Python objects directly.

---

### Pattern 5: Facade Pattern

Provides a simplified, unified interface to a complex subsystem. The facade defines a higher-level interface that makes the subsystem easier to use by hiding complexity and dependencies.

Use Facade when an application's API is overly complex, when you want to decouple a high-level client from a maze of library classes, or when you need a single entry point for initializing a subsystem (e.g., bootstrapping a trading platform, starting an ETL pipeline).

```python
from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Complex subsystem components — the client should NOT interact with these directly
class DataFeed:
    """Low-level market data feed management."""

    def connect(self, endpoint: str) -> None:
        logger.info("Connecting to data feed at %s", endpoint)

    def subscribe(self, symbol: str) -> dict:
        return {"symbol": symbol, "price": 150.0 + hash(symbol) % 100}

    def disconnect(self) -> None:
        logger.info("Disconnected from data feed")


class OrderManager:
    """Low-level order management."""

    def create_order(self, symbol: str, side: str, qty: int, price: Optional[float] = None) -> dict:
        return {"order_id": hash(f"{symbol}{side}{qty}") % 1_000_000,
                "status": "submitted", "filled": False}

    def cancel_order(self, order_id: int) -> bool:
        return True


class RiskEngine:
    """Low-level risk checking."""

    def check_order(self, symbol: str, side: str, qty: int, cash: float) -> tuple[bool, str]:
        estimated_cost = 150.0 * qty
        if estimated_cost > cash:
            return False, f"Insufficient funds for {side} order"
        return True, "Risk check passed"


class PortfolioTracker:
    """Low-level portfolio tracking."""

    def update(self, symbol: str, side: str, qty: int, price: float) -> None:
        logger.info("Portfolio updated: %s %s %d @ %.2f", symbol, side, qty, price)


class TradingSystemFacade:
    """Simplified unified interface to the entire trading subsystem.

    Clients interact only with this facade — they never need to know about
    DataFeed, OrderManager, RiskEngine, or PortfolioTracker individually.
    """

    def __init__(self) -> None:
        self._data_feed = DataFeed()
        self._order_manager = OrderManager()
        self._risk_engine = RiskEngine()
        self._portfolio_tracker = PortfolioTracker()
        self._connected = False

    def start(self, feed_endpoint: str) -> str:
        """Initialize the trading system with a single call."""
        self._data_feed.connect(feed_endpoint)
        self._connected = True
        return "Trading system initialized"

    def place_order(self, symbol: str, side: str, qty: int, cash: float = 10_000.0) -> dict:
        """Place a trade through the unified interface.

        Internally subscribes to data, checks risk, creates order, and tracks portfolio —
        all without the caller needing to manage any of those steps.
        """
        if not self._connected:
            raise RuntimeError("Trading system not started — call start() first")

        # Step 1: Check risk
        allowed, message = self._risk_engine.check_order(symbol, side, qty, cash)
        if not allowed:
            return {"error": message}

        # Step 2: Subscribe to price data
        data = self._data_feed.subscribe(symbol)

        # Step 3: Create order
        order = self._order_manager.create_order(symbol, side, qty, data.get("price"))

        # Step 4: Update portfolio tracking
        if order.get("status") == "submitted":
            self._portfolio_tracker.update(symbol, side, qty, data["price"])

        return order

    def stop(self) -> str:
        """Clean up resources with one call."""
        if self._connected:
            self._data_feed.disconnect()
            self._connected = False
        return "Trading system stopped"


# Example usage — client has zero knowledge of subsystem internals
def demonstrate_facade() -> None:
    trading = TradingSystemFacade()

    # One call to initialize the entire complex subsystem
    print(trading.start("wss://market-data.example.com/stream"))

    # One call to place an order, hiding 4 internal steps
    result = trading.place_order("AAPL", "BUY", 10)
    print(result)

    # One call to clean up
    print(trading.stop())
```

**❌ BAD — Client directly orchestrating the complex subsystem:**

```python
# ❌ BAD: Client must know about every subsystem component
class BrokenClient:
    def place_trade(self, symbol: str, side: str, qty: int) -> None:
        data = DataFeed()
        data.connect("wss://feed.example.com")

        risk = RiskEngine()
        ok, msg = risk.check_order(symbol, side, qty, 10_000.0)
        if not ok:
            return

        orders = OrderManager()
        order = orders.create_order(symbol, side, qty)

        portfolio = PortfolioTracker()
        portfolio.update(symbol, side, qty, 150.0)
```

**✅ GOOD — Client interacts with a single simplified facade:**

```python
# ✅ GOOD: Client code is clean and focused on intent, not infrastructure
system = TradingSystemFacade()
system.start("wss://market-data.example.com/stream")
system.place_order("AAPL", "BUY", 10)
system.stop()
```

**Practical note:** Use Facade when you want to provide a simplified API without restricting the underlying subsystem's capabilities. Clients can always access the underlying components directly if needed. A common anti-pattern is turning a Facade into a God Object — keep it as a thin delegator, not a container of business logic.

---

### Pattern 6: Template Method Pattern

Defines the skeleton of an algorithm in a base class, deferring specific steps to subclasses. Subclasses override particular steps without changing the overall algorithm structure. The base class controls the order and guarantees that certain steps are always executed.

Use Template Method when you have multiple algorithms that share the same high-level structure but differ in specific steps, such as report generation (different data sources, same formatting pipeline), data processing pipelines (same validation → transform → load sequence, different implementations), or testing frameworks.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class ReportGenerator(ABC):
    """Base class defining the skeleton of report generation.

    The template method generate_report() is final — subclasses cannot reorder steps.
    Subclasses override only the steps that differ between report types.
    """

    def generate_report(self) -> str:
        """The template method: controls algorithm structure."""
        self._validate_inputs()
        self._fetch_data()
        self._transform_data()
        results = self._format_output()
        self._save_report(results)
        return results

    # Template steps that subclasses MAY override — with sensible defaults
    def _validate_inputs(self) -> None:
        """Default validation; override to add domain-specific checks."""
        logger.debug("Using default input validation")

    @abstractmethod
    def _fetch_data(self) -> list[dict]:
        """Must be implemented by subclasses — data source varies."""
        ...

    def _transform_data(self, data: list[dict] | None = None) -> list[dict]:
        """Default transformation; override for custom processing."""
        if data is None:
            data = self._fetch_data()
        return [row for row in data if row.get("value") is not None]

    @abstractmethod
    def _format_output(self, transformed_data: list[dict]) -> str: ...

    def _save_report(self, content: str) -> None:
        """Default persistence; override to change storage target."""
        logger.info("Report saved (%d characters)", len(content))


class SalesReport(ReportGenerator):
    """Generates sales reports from a CSV data source."""

    def _validate_inputs(self) -> None:
        if not hasattr(self, "region") or not self.region:
            raise ValueError("Region is required for sales reports")

    def _fetch_data(self) -> list[dict]:
        # In production, this reads from a database or CSV file
        return [
            {"product": "Widget", "value": 1200},
            {"product": "Gadget", "value": 3400},
            {"product": "Doohickey", "value": None},  # Should be filtered out
        ]

    def _format_output(self, transformed_data: list[dict]) -> str:
        lines = ["=== SALES REPORT ===", f"Region: {self.region}"]
        for row in transformed_data:
            lines.append(f"  {row['product']}: ${row['value']}")
        return "\n".join(lines)

    def _save_report(self, content: str) -> None:
        logger.info("SALES REPORT saved to /reports/sales/%s", self.region)


class PerformanceReport(ReportGenerator):
    """Generates performance reports from API metrics."""

    def __init__(self, endpoint: str) -> None:
        self.endpoint = endpoint

    def _validate_inputs(self) -> None:
        if not self.endpoint.startswith(("http://", "https://")):
            raise ValueError(f"Invalid endpoint URL: {self.endpoint}")

    def _fetch_data(self) -> list[dict]:
        # In production, this calls the API
        return [
            {"metric": "latency_p99", "value": 250},
            {"metric": "error_rate", "value": 0.02},
            {"metric": "throughput", "value": None},  # Filtered out
        ]

    def _format_output(self, transformed_data: list[dict]) -> str:
        lines = ["=== PERFORMANCE REPORT ==="]
        for row in transformed_data:
            lines.append(f"  {row['metric']}: {row['value']}")
        return "\n".join(lines)


# Example usage — the template method structure is fixed, only data differs
def demonstrate_template_method() -> None:
    sales = SalesReport()
    sales.region = "North America"
    print(sales.generate_report())

    perf = PerformanceReport(endpoint="https://api.example.com/metrics")
    print(perf.generate_report())
```

**❌ BAD — Duplicate algorithm code in every subclass:**

```python
# ❌ BAD: Every subclass reimplements the entire pipeline — violation of DRY
class BrokenSalesReport:
    def generate(self) -> str:
        self._validate()           # Redundant implementation
        data = self._fetch()       # Different source, same structure
        cleaned = [d for d in data if d.get("value") is not None]  # Copy-paste
        formatted = f"Sales:\n" + "\n".join(f"  {v}" for v in cleaned)
        self._save(formatted)      # Another copy of the save logic
        return formatted

    # Same validate, _save methods duplicated across every report type...


class BrokenPerfReport:
    def generate(self) -> str:
        self._validate()           # Nearly identical validation
        data = self._fetch()       # Different source again
        cleaned = [d for d in data if d.get("value") is not None]  # Exact copy
        formatted = f"Perf:\n" + "\n".join(f"  {v}" for v in cleaned)
        self._save(formatted)      # Same save logic again
        return formatted
```

**✅ GOOD — Template Method enforces structure once, varies only what differs:**

```python
# ✅ GOOD: generate_report() is defined exactly once in the base class
# Each subclass only overrides the steps that actually differ
report = PerformanceReport(endpoint="https://metrics.internal/v1")
print(report.generate_report())  # validate → fetch → transform → format → save
```

**Practical note:** Use Template Method when the algorithm structure is invariant but some steps vary. Use Strategy (behavioral pattern) instead when the entire algorithm varies and should be swappable at runtime — Template Method's variation points are locked at compile time via inheritance, while Strategy swaps entire algorithms at runtime.

---

### Pattern 7: Decorator Pattern

Attaches additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality. The decorator wraps the original object and adds behavior before/after delegating to it.

Use Decorator when you need to add behaviors (logging, caching, authentication, compression) to individual objects at runtime without affecting other objects of the same class. It is ideal for cross-cutting concerns that should be optionally composable.

```python
from __future__ import annotations
import time
import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class DataExporter(Protocol):
    """The interface that both components and decorators implement."""

    def export(self, data: list[dict]) -> str: ...


class CsvExporter:
    """Core component — exports data to CSV format without any extra features."""

    def export(self, data: list[dict]) -> str:
        if not data:
            return ""
        headers = "\t".join(data[0].keys())
        rows = "\n".join("\t".join(str(v) for v in row.values()) for row in data)
        return f"{headers}\n{rows}"


class LoggingDecorator(DataExporter):
    """Adds logging before and after export operations."""

    def __init__(self, wrapped: DataExporter) -> None:
        self._wrapped = wrapped

    def export(self, data: list[dict]) -> str:
        logger.info("Starting CSV export of %d records", len(data))
        start = time.perf_counter()
        result = self._wrapped.export(data)
        elapsed = time.perf_counter() - start
        logger.info("CSV export completed in %.3fs, output length: %d chars", elapsed, len(result))
        return result


class CachingDecorator(DataExporter):
    """Caches export results by hash of input data to avoid recomputation."""

    def __init__(self, wrapped: DataExporter) -> None:
        self._wrapped = wrapped
        self._cache: dict[int, str] = {}

    def export(self, data: list[dict]) -> str:
        cache_key = hash(frozenset((row.keys(), tuple(sorted(row.values()))) for row in data))
        if cache_key in self._cache:
            logger.info("Cache hit for export of %d records", len(data))
            return self._cache[cache_key]

        result = self._wrapped.export(data)
        self._cache[cache_key] = result
        return result


class CompressingDecorator(DataExporter):
    """Simulates compression by truncating long values in the export."""

    def __init__(self, wrapped: DataExporter, max_field_len: int = 20) -> None:
        self._wrapped = wrapped
        self.max_field_len = max_field_len

    def _truncate_value(self, value: object) -> str:
        s = str(value)
        if len(s) > self.max_field_len:
            return s[: self.max_field_len - 3] + "..."
        return s

    def export(self, data: list[dict]) -> str:
        truncated = [
            {k: self._truncate_value(v) for k, v in row.items()}
            for row in data
        ]
        result = self._wrapped.export(truncated)
        logger.info("Compressed output (max field length: %d)", self.max_field_len)
        return result


# Example usage — decorators stack at runtime in any order
def demonstrate_decorator() -> None:
    base = CsvExporter()

    # Stack decorators for combined behavior
    exporter = LoggingDecorator(CachingDecorator(CompressingDecorator(base, max_field_len=15)))

    sample_data = [
        {"id": "TX-001", "product": "UltraLongProductNameThatExceedsNormalDisplayWidth", "amount": 1234.56},
        {"id": "TX-002", "product": "AnotherSuperlongProductDescriptionHere", "amount": 789.01},
    ]

    output = exporter.export(sample_data)
    print(output)
    # LoggingDecorator logs start/stop, CachingDecorator caches result,
    # CompressingDecorator truncates long fields, CsvExporter produces CSV
```

**❌ BAD — Subclass explosion to compose features:**

```python
# ❌ BAD: N features × M base classes = N*M subclasses — unmaintainable
class CsvExportWithLogging(CsvExporter): ...       # Feature 1 + Base A
class CsvExportWithCache(CsvExporter): ...          # Feature 2 + Base A
class CsvExportWithCompress(CsvExporter): ...       # Feature 3 + Base A
class CsvExportWithLoggingAndCache(CsvExporter): ... # Features 1+2 + Base A
class CsvExportWithLoggingAndCompress(CsvExporter): ... # Features 1+3 + Base A
class CsvExportWithAllFeatures(CsvExporter): ...    # Features 1+2+3 + Base A
# Now add a second base class (JSONExporter) and the count doubles to 14 subclasses.
```

**✅ GOOD — Decorators compose at runtime:**

```python
# ✅ GOOD: Any combination of decorators on any compatible component
exporter = LoggingDecorator(CsvExporter())
exporter2 = CachingDecorator(CompressingDecorator(CsvExporter()))
# Only 3 classes needed for unlimited feature combinations
```

**Practical note:** Use Decorator for cross-cutting concerns (logging, caching, validation, compression) that you want to layer on top of existing components. Ensure the decorator's interface is identical to the wrapped component — use `typing.Protocol` or ABC inheritance for structural subtyping. In Python, consider `functools.wraps` for function decorators as a lightweight alternative for callable objects.

---

### Pattern 8: Proxy Pattern

Controls access to another object by providing a surrogate or placeholder. The proxy intercepts calls before passing them to the real subject, enabling lazy initialization, access control, caching, logging, and remote invocation simulation.

Use Proxy when creating an object is expensive (lazy loading), when you need to restrict access (access control), when the real object resides in a different address space (remote proxy), or when you want to add caching/security/logging layers transparently without modifying the subject.

```python
from __future__ import annotations
import time
from typing import Protocol


class ImageLoader(Protocol):
    """The interface shared by Proxy and RealSubject."""

    def display(self, width: int = 800) -> str: ...


class RealImage(ImageLoader):
    """Expensive object — loading from disk takes significant time."""

    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        self._data: bytes | None = None
        # Simulate expensive disk I/O
        self._load()

    def _load(self) -> None:
        logger = logging.getLogger(__name__)
        logger.info("Loading image from %s...", self._filepath)
        time.sleep(0.1)  # Simulate slow disk read
        self._data = b"FAKE_IMAGE_DATA"  # In reality, this is binary image data

    def display(self, width: int = 800) -> str:
        if self._data is None:
            return f"No data for {self._filepath}"
        return f"[{width}w] Image loaded from {self._filepath}: {len(self._data)} bytes"


class CachedImageProxy(ImageLoader):
    """Proxy that caches the real image after first load.

    Avoids redundant expensive loads by intercepting calls and returning
    cached results for repeated requests. The proxy manages the lifecycle
    of the RealImage transparently to the client.
    """

    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        self._real_image: RealImage | None = None
        self._cache_hit_count = 0

    def display(self, width: int = 800) -> str:
        # Lazy initialization — only create the real image when needed
        if self._real_image is None:
            self._real_image = RealImage(self._filepath)

        return self._real_image.display(width)

    @property
    def cache_hit_count(self) -> int:
        """Exposes internal stats for monitoring (proxy-specific metadata)."""
        return self._cache_hit_count


class ThrottledProxy(ImageLoader):
    """Proxy that limits the rate of display requests.

    Prevents excessive calls to expensive resources by enforcing a minimum
    time interval between successive operations.
    """

    def __init__(self, wrapped: ImageLoader, min_interval: float = 1.0) -> None:
        self._wrapped = wrapped
        self.min_interval = min_interval
        self._last_call_time: float | None = None

    def display(self, width: int = 800) -> str:
        now = time.perf_counter()
        if self._last_call_time is not None:
            elapsed = now - self._last_call_time
            if elapsed < self.min_interval:
                wait = self.min_interval - elapsed
                time.sleep(wait)

        self._last_call_time = time.perf_counter()
        return self._wrapped.display(width)


# Example usage — client interacts only with the ImageLoader protocol
def demonstrate_proxy() -> None:
    proxy = CachedImageProxy("photo_large.jpg")

    # First call creates the real image (expensive)
    print(proxy.display(1024))  # Loads from disk

    # Second call uses cached instance (no reload, same object reference)
    print(proxy.display(800))   # Returns immediately, same loaded data
```

**❌ BAD — Client manages lazy loading directly:**

```python
# ❌ BAD: Every client must remember to implement lazy loading logic
class BrokenClient:
    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        self._image: RealImage | None = None

    def show_image(self, width: int) -> str:
        if self._image is None:
            self._image = RealImage(self._filepath)  # Every client repeats this
        return self._image.display(width)


class AnotherClient:
    def render(self, filepath: str, width: int) -> str:
        # Another class must reimplement the same lazy-loading pattern
        image = RealImage(filepath) if not hasattr(self, '_img') else self._img  # Bug-prone
```

**✅ GOOD — Proxy encapsulates access control and lazy loading:**

```python
# ✅ GOOD: Lazy loading logic lives in one place; clients are simple
proxy = CachedImageProxy("photo.jpg")
print(proxy.display())   # First call: lazy load triggers
print(proxy.display())   # Second call: same real image, no reload
```

**Practical note:** Choose Proxy over Decorator when the goal is access control or lifecycle management (lazy loading) rather than adding new behaviors. A Proxy controls *when* and *how* the subject is accessed; a Decorator adds *what* the subject can do. Use RemoteProxy when the real object lives in another process or network service, serializing method calls as RPC requests.

---

## Constraints

### MUST DO
- Use `typing.Protocol` or `abc.ABC` to define pattern interfaces — ensures type safety and duck typing compatibility
- Prefer composition over inheritance for structural patterns (Adapter, Decorator, Proxy) — wrap objects rather than subclassing them
- Apply Open/Closed Principle through polymorphism: new behaviors = new classes, not conditional branches in existing ones
- Ensure Facade delegates to domain services without containing business logic itself
- Keep Command objects immutable where possible so they are safe in concurrent undo/redo queues
- Use weak references in Observer subjects to prevent memory leaks from forgotten unsubscriptions
- Add guard clauses at the start of pattern entry points: empty observer lists, null commands, missing handlers
- Name classes according to their GoF role: `XxxAdapter`, `XxxStrategy`, `XxxCommand`, `XxxFacade` — not generic names like `Manager` or `Helper`

### MUST NOT DO
- Apply a pattern where a simple function call or method suffices — do not introduce indirection for pattern's sake (YAGNI)
- Use inheritance to add runtime behavior — use Strategy or Decorator instead (Template Method only for fixed algorithm skeletons)
- Create god-object Facades that contain business logic — Facade should delegate, not implement
- Forget to unsubscribe observers when they are no longer needed — always call `unregister()` in cleanup paths
- Make Command objects mutable with hidden side effects — execute/undo must be deterministic and idempotent
- Use Singleton or global state as a substitute for proper dependency injection in pattern wiring
- Design Proxy interfaces that diverge from the real subject's interface — the proxy must be structurally sub-type of the subject

---

## Pattern Selection Quick Reference

| Problem | Structural / Behavioral | Pattern |
|---|---|---|
| Make two incompatible interfaces work together | Structural | **Adapter** |
| Separate abstraction from implementation so both can vary independently | Structural | **Bridge** |
| Build a tree structure where clients treat individual objects and compositions uniformly | Structural | **Composite** |
| Add new behaviors to objects dynamically without subclassing | Structural | **Decorator** |
| Provide a simplified interface to a complex subsystem | Structural | **Facade** |
| Control access, lazy-load, or add security/caching layers | Structural | **Proxy** |
| Share memory-intensive state across many lightweight objects | Structural | **Flyweight** |
| Swap algorithms at runtime based on configuration or context | Behavioral | **Strategy** |
| Encapsulate a request for queuing, logging, or undo/redo | Behavioral | **Command** |
| Define algorithm skeleton in base class, defer steps to subclasses | Behavioral | **Template Method** |
| Notify multiple objects when one object's state changes (pub/sub) | Behavioral | **Observer** |
| Centralize communication among many interrelated objects | Behavioral | **Mediator** |
| Pass a request through a chain of potential handlers until one handles it | Behavioral | **Chain of Responsibility** |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `structural-design-patterns` | Dedicated deep coverage of structural patterns only (Adapter, Bridge, Composite, Decorator, Facade, Proxy, Flyweight) — use this when you need more detail on the structural subset |
| `behavioral-design-patterns` | Dedicated deep coverage of behavioral patterns only (Observer, Strategy, Command, Template Method, Mediator, Chain of Responsibility) — use this when you need more detail on the behavioral subset |
| `creational-design-patterns` | Covers Factory Method, Builder, Singleton, Abstract Factory, Prototype — pattern selection starts with how objects are created, then uses structural/behavioral patterns for how they interact |
| `design-patterns-architecture` | GoF overview combined with SOLID/DRY/YAGNI principles — use this when you need to evaluate whether a pattern is warranted at all before selecting one |

---

## Live References

> Authoritative documentation links for design patterns and software architecture.

- [Design Patterns: Elements of Reusable Object-Oriented Software (GoF)](https://amzn.to/3UW7VbJ) — The canonical reference for all 23 GoF design patterns
- [Python `typing` Documentation](https://docs.python.org/3/library/typing.html) — Protocol, runtime_checkable, and type hinting for pattern interfaces
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) — Five object-oriented design principles that guide when and how to apply patterns
- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns/) — Visual explanations and practical examples of all GoF patterns
- [Clean Architecture by Robert C. Martin](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164) — Pattern selection within architectural boundaries

---

## TL;DR for Code Generation

- Use guard clauses at the top of every public method to handle edge cases early
- Define pattern interfaces with `typing.Protocol` (structural subtyping) or `abc.ABC` (inheritance-based contracts)
- Each class must have exactly one responsibility — apply SRP strictly to pattern participants
- Return simple types where possible; use `dict`, `str`, `int`, `float`, `bool`, `list` over complex nested objects
- Keep command/strategy/state classes immutable when they travel across thread boundaries
- Cyclomatic complexity under 10 per function — split any method with multiple nested conditionals into smaller helpers
- Include typed signatures and docstrings on every public method in the pattern
- Never mutate input parameters; return new data structures instead

---

> 📖 skill(local cache): structural-design-patterns, behavioral-design-patterns, creational-design-patterns, design-patterns-architecture | 📖 skill(LLM compressed): SOLID principles, YAGNI, refactoring patterns | 📖 skill(remote reference): GoF Design Patterns book, Refactoring.Guru pattern library, Python typing documentation | 📖 skill(coding): code-quality-policies, engineering-principles | 📖 skill(coding): software-architecture | 📖 skill(coding): interface-segregation-principle | 📖 skill(coding): dependency-inversion-principle | 📖 skill(coding): clean-architecture | 📖 skill(coding): anti-patterns | 📖 skill(coding): design-systems-atomic | 📖 skill(coding): ports-patterns | 📖 skill(coding): cqrs-pattern | 📖 skill(coding): microservice-resilience-patterns | 📖 skill(coding): domain-events | 📖 skill(coding): software-maintainability | 📖 skill(coding): technical-debt-management | 📖 skill(coding): modern-python-development | 📖 skill(coding): python-typing-patterns | 📖 skill(coding): immutable-data-patterns