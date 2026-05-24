---
name: immutable-data-patterns
description: Implements immutable data patterns (value objects, pure functions, structural updates, copy-on-write collections, domain events) to eliminate mutation bugs and enable safe concurrent data processing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: immutable data, value object, pure function, structural update, copy-on-write, data immutability, frozen dataclass, readonly types, how do i prevent mutation bugs, safe concurrent data
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
  related-skills: software-error-handling, functional-programming-patterns, dependency-inversion-principle
---

# Immutable Data Patterns

Senior engineer implementing immutable data structures and transformation patterns to eliminate mutation bugs, enable safe concurrency, and make state transitions auditable.

## TL;DR Checklist

- [ ] Use `@dataclass(frozen=True)` for all value objects — never mutate fields after creation
- [ ] Pure functions accept arguments, compute, return result — no external state access or mutation
- [ ] Structural updates create new objects via `replace()` or spread — never mutate in place
- [ ] Use `frozenset` / `tuple` / `Object.freeze()` for collections that must not change
- [ ] Replace direct field mutation with domain events that describe intent, not action

---

## When to Use

Use this skill when:

- Building domain models where accidental mutation causes subtle bugs (financial calculations, order processing)
- Sharing data between concurrent threads or async tasks and needing race-condition safety
- Implementing undo/redo or time-travel debugging by preserving historical state snapshots
- Designing event-sourced systems where every state change is an immutable event
- Refactoring legacy mutable code that produces hard-to-reproduce bugs in production

---

## When NOT to Use

Avoid this skill for:

- High-performance hot loops where object allocation overhead matters (use `mutable` with explicit locks)
- Simple configuration or lookup tables with zero mutation risk (immutability adds cognitive overhead)
- Game loop state management requiring frequent per-frame mutations (performance-critical paths)
- Prototypes where speed of iteration outweighs correctness concerns

---

## Core Workflow

1. **Identify Mutable Suspects** — Scan the codebase for objects shared across threads, returned to callers, or stored in collections that should not change. Look for `self.field = ...` in data classes, direct property assignment on returned objects, and in-place mutations like `.append()`, `.update()`, or spread reassignment.

2. **Classify by Pattern** — Map each suspect to one of the five patterns:
   - Pure data + validation → Value Object
   - State transformation logic → Pure Function
   - Existing mutable object that callers modify → Structural Update
   - Collections exposed externally → Copy-on-Write
   - State changes communicated via side effects → Domain Events

3. **Apply the Immutable Pattern** — Rewrite each suspect using the correct pattern (see Implementation Patterns below). Ensure typed signatures, docstrings, and defensive copies.

4. **Verify Immutability at Runtime** — Add assertions or use static analysis (`mypy --strict`, TypeScript `--noImplicitAny` + `readonly`) to catch mutations at development time. Run existing tests against the immutable version.

---

## Implementation Patterns

### Pattern 1: Value Objects — Self-Validating Immutable Data

Value objects are domain entities defined by their attributes, not identity. They are immutable by design — once created, their state cannot change. In Python, use `@dataclass(frozen=True)` with validation in `__post_init__`. In TypeScript, use `readonly` properties and constructor-only assignment.

**Anti-pattern reference:** SOLID's Single Responsibility Principle — a value object encapsulates both data and the rules for valid values.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    """Immutable monetary amount with currency code.

    Value objects are self-validating: invalid state raises
    ValueError at construction time, preventing any object from
    entering a corrupted state.
    """
    amount: Decimal
    currency: str = "USD"

    def __post_init__(self) -> None:
        if not isinstance(self.amount, Decimal):
            raise TypeError(f"amount must be Decimal, got {type(self.amount).__name__}")
        if self.amount < 0:
            raise ValueError(f"Money amount cannot be negative: {self.amount}")
        if len(self.currency) != 3 or not self.currency.isupper():
            raise ValueError(f"Invalid ISO 4217 currency code: '{self.currency}'")

    def add(self, other: Money) -> Money:
        """Return a new Money instance — never mutates self."""
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add different currencies: {self.currency} vs {other.currency}"
            )
        return Money(amount=self.amount + other.amount, currency=self.currency)


@dataclass(frozen=True)
class PricePoint:
    """Immutable price snapshot for a security at a point in time.

    Freezes the dataclass so that even nested mutable references
    cannot be mutated after construction.
    """
    symbol: str
    bid: Decimal
    ask: Decimal
    timestamp: date = field(compare=False, default_factory=date.today)
    _validated: bool = field(init=False, default=True)

    def __post_init__(self) -> None:
        if self.bid >= self.ask:
            raise ValueError(f"bid ({self.bid}) must be less than ask ({self.ask})")
        if not self.symbol.isupper():
            raise ValueError(f"Symbol must be uppercase: '{self.symbol}'")

    @property
    def mid(self) -> Decimal:
        """Calculate midpoint price. Pure computed property."""
        return (self.bid + self.ask) / 2

    @property
    def spread(self) -> Decimal:
        """Calculate bid-ask spread. Pure computed property."""
        return self.ask - self.bid


# ❌ BAD — mutable dataclass, no validation at all
@dataclass
class BadMoney:
    amount: float       # type is too loose
    currency: str = "USD"

    def set_amount(self, new: float) -> None:  # mutation after creation!
        self.amount = new                       # silently accepts negatives


# ✅ GOOD — frozen dataclass with validation and pure operations
@dataclass(frozen=True)
class GoodMoney:
    amount: Decimal
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError(f"Negative money not allowed: {self.amount}")
        if not self.currency.isupper():
            raise ValueError(f"Currency must be uppercase ISO code: '{self.currency}'")

    def add(self, other: Money) -> Money:
        """Returns new Money — self is never modified."""
        return Money(amount=self.amount + other.amount, currency=self.currency)

    @classmethod
    def zero(cls, currency: str = "USD") -> Money:
        """Factory for a zero-value instance."""
        return cls(amount=Decimal("0.00"), currency=currency)
```

**TypeScript equivalent using `readonly`:**

```typescript
// ❌ BAD — mutable class fields
class BadPricePoint {
  public bid: number;      // anyone can change this after construction
  public ask: number;
  constructor(bid: number, ask: number) {
    this.bid = bid;
    this.ask = ask;
  }
}

// ✅ GOOD — readonly properties locked at construction
export class PricePoint {
  public readonly symbol: string;
  public readonly bid: number;
  public readonly ask: number;
  public readonly mid: number;

  constructor(symbol: string, bid: number, ask: number) {
    if (bid >= ask) throw new Error(`bid (${bid}) must be < ask (${ask})`);
    this.symbol = symbol.toUpperCase();
    this.bid = bid;
    this.ask = ask;
    this.mid = (bid + ask) / 2;
  }

  // No setter methods exist — state is permanently fixed after construction.
}
```

---

### Pattern 2: Pure Functions — Deterministic Transformations with Zero Side Effects

Pure functions produce output solely from their input arguments. They never read or write external state, never mutate their arguments, and always return the same result for the same inputs. This property enables memoization, parallel execution, and trivial testing.

```python
from __future__ import annotations
from typing import Any
from decimal import Decimal


def calculate_commission(
    trade_value: Decimal,
    rate: Decimal = Decimal("0.0015"),
    minimum: Decimal = Decimal("1.00"),
) -> Decimal:
    """Calculate trading commission as a percentage with a floor.

    Pure function: no I/O, no state mutation, deterministic output.

    Args:
        trade_value: Total value of the trade in base currency
        rate: Commission rate (default 15 bps)
        minimum: Minimum commission amount regardless of trade size

    Returns:
        Commission amount (at least `minimum`)
    """
    return max(trade_value * rate, minimum)


def apply_discount(
    price: Decimal,
    discount_percent: Decimal,
) -> Decimal:
    """Return the discounted price. Does not mutate `price` or any global state."""
    if not (Decimal("0") <= discount_percent <= Decimal("1")):
        raise ValueError(f"discount_percent must be 0..1, got {discount_percent}")
    return price * (Decimal("1") - discount_percent)


def chain_transforms(
    data: dict[str, Any],
    *transforms: Any,
) -> dict[str, Any]:
    """Pipeline pure functions over an immutable input, returning a new result.

    Demonstrates composition of pure functions — each step produces a new object.
    """
    result = dict(data)  # shallow copy to avoid mutating the original
    for transform in transforms:
        result = transform(result)  # each transform must be pure
    return result


# ❌ BAD — impure function with hidden side effects and mutation
_commission_counter = 0

def bad_calculate_commission(trade_value: float) -> float:
    global _commission_counter          # reads/writes external state
    _commission_counter += 1            # side effect on every call
    commission = trade_value * 0.0015   # non-deterministic if rate changes
    return commission                   # no floor, accepts any input type


# ✅ GOOD — pure function with explicit contract
def good_calculate_commission(
    trade_value: Decimal,
    rate: Decimal = Decimal("0.0015"),
) -> Decimal:
    """Deterministic, side-effect-free commission calculation."""
    return max(trade_value * rate, Decimal("1.00"))
```

---

### Pattern 3: Structural Updates — Immutable Transforms of Nested Data

When working with nested mutable structures, structural update creates a new copy with only the changed fields updated. The original remains intact. This is essential for undo/redo, optimistic concurrency control, and state snapshots.

**Python approach:** `dataclasses.replace()` for frozen dataclasses; spread operator equivalents via explicit construction.
**JavaScript approach:** Spread operator `{...obj, field: newValue}` for objects; `[...arr]` with map/filter for arrays.

```python
from __future__ import annotations
from dataclasses import dataclass, field, replace
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class Order:
    order_id: str
    symbol: str
    quantity: int
    price: Decimal
    side: str = "BUY"         # "BUY" or "SELL"
    status: str = "PENDING"   # PENDING → FILLED → CANCELLED → PARTIAL_FILL

    def fill(self, executed_qty: int, fill_price: Decimal) -> Order:
        """Return a new Order with filled quantity and updated status.

        Never mutates the original Order — returns a new frozen instance.
        """
        if executed_qty <= 0 or executed_qty > self.quantity:
            raise ValueError(
                f"executed_qty ({executed_qty}) out of range [1..{self.quantity}]"
            )

        remaining = self.quantity - executed_qty
        status = "PARTIAL_FILL" if remaining > 0 else "FILLED"

        return replace(
            self,
            quantity=remaining,
            price=(fill_price * executed_qty + self.price * (self.quantity - remaining))
                  / self.quantity,
            status=status,
        )

    def cancel(self) -> Order:
        """Return a new Order with CANCELLED status."""
        return replace(self, status="CANCELLED")


@dataclass(frozen=True)
class Portfolio:
    holdings: dict[str, int] = field(default_factory=dict)
    cash: Decimal = field(default_factory=lambda: Decimal("10000"))

    def buy(self, symbol: str, qty: int, price: Decimal) -> Portfolio:
        """Return a new Portfolio with updated holdings — original unchanged."""
        cost = price * qty
        if cost > self.cash:
            raise ValueError(f"Insufficient cash: need {cost}, have {self.cash}")

        new_holdings = dict(self.holdings)
        new_holdings[symbol] = new_holdings.get(symbol, 0) + qty

        return Portfolio(
            holdings=new_holdings,
            cash=self.cash - cost,
        )

    def sell(self, symbol: str, qty: int, price: Decimal) -> Portfolio:
        """Return a new Portfolio with reduced holdings — original unchanged."""
        if self.holdings.get(symbol, 0) < qty:
            raise ValueError(f"Cannot sell {qty} of {symbol}: only hold {self.holdings.get(symbol, 0)}")

        new_holdings = dict(self.holdings)
        new_holdings[symbol] = new_holdings.get(symbol, 0) - qty
        if new_holdings[symbol] == 0:
            del new_holdings[symbol]

        return Portfolio(
            holdings=new_holdings,
            cash=self.cash + price * qty,
        )


# ❌ BAD — mutates the original object in place
class BadOrder:
    def __init__(self, order_id: str, symbol: str, quantity: int, price: float):
        self.order_id = order_id
        self.symbol = symbol
        self.quantity = quantity
        self.price = price
        self.status = "PENDING"

    def fill(self, executed_qty: int) -> None:
        # Mutates self — original caller's Order is now corrupted!
        self.quantity -= executed_qty
        self.status = "FILLED" if self.quantity == 0 else "PARTIAL_FILL"


# ✅ GOOD — structural update creates a new instance
def good_fill_order(order: Order, executed_qty: int, fill_price: Decimal) -> Order:
    """Returns a brand new Order; the original is never touched."""
    return order.fill(executed_qty, fill_price)
```

**JavaScript spread operator structural updates:**

```typescript
// ❌ BAD — mutates the original object
function badUpdateStatus(order: Order, newStatus: string): void {
  order.status = newStatus;  // caller's order is mutated!
}

// ✅ GOOD — spread creates a shallow copy with updated field
function goodUpdateStatus(order: Order, newStatus: string): ReadonlyOrder {
  return { ...order, status: newStatus };  // original untouched
}

// ✅ GOOD — immutable nested update (e.g., updating a sub-field)
function goodDeepUpdate<T extends object>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as unknown as T;
  const [key, ...rest] = path;
  const existing = (obj as Record<string, unknown>)[key];

  if (Array.isArray(existing)) {
    const updatedArr = [...existing];
    updatedArr[Number(key)] = goodDeepUpdate(existing[Number(key)], rest, value);
    return { ...obj, [key]: updatedArr } as unknown as T;
  }

  return {
    ...obj,
    [key]: typeof existing === "object" && existing !== null
      ? goodDeepUpdate(existing as object, rest, value)
      : value,
  };
}
```

---

### Pattern 4: Copy-on-Write Collections — Frozen Containers for Shared State

Copy-on-write (CoW) collections prevent accidental mutation by making the base collection immutable. New versions are created only when modification is needed. Use `tuple`/`frozenset` in Python and `Object.freeze()` in JavaScript.

```python
from __future__ import annotations
from typing import Sequence


class ImmutableConfig:
    """Immutable configuration loaded at startup, shared across all threads.

    Uses frozenset internally so the set of allowed features cannot be
    modified after construction, even by code that holds a reference.
    """
    _allowed_features: frozenset[str]
    _max_retries: int

    def __init__(self, allowed_features: Sequence[str], max_retries: int = 3) -> None:
        self._allowed_features = frozenset(allowed_features)
        self._max_retries = max_retries

    @property
    def allowed_features(self) -> frozenset[str]:
        """Returns a frozenset — caller cannot add, remove, or modify."""
        return self._allowed_features  # frozenset is inherently immutable

    @property
    def max_retries(self) -> int:
        return self._max_retries

    def with_feature(self, feature: str) -> ImmutableConfig:
        """Return a new config with one additional allowed feature."""
        return ImmutableConfig(
            allowed_features=tuple(self._allowed_features) + (feature,),
            max_retries=self._max_retries,
        )


class SnapshotBuffer:
    """Copy-on-write snapshot buffer for undo/redo state management.

    Stores an append-only sequence of snapshots. Each "update" creates
    a new entry rather than modifying existing ones.
    """
    def __init__(self) -> None:
        self._snapshots: tuple[dict, ...] = ()

    @property
    def current(self) -> dict | None:
        return self._snapshots[-1] if self._snapshots else None

    @property
    def history_length(self) -> int:
        return len(self._snapshots)

    def take_snapshot(self, state: dict) -> SnapshotBuffer:
        """Return a new buffer with an additional snapshot appended."""
        return SnapshotBuffer(
            _snapshots=self._snapshots + (dict(state),),  # shallow copy of state
        )

    def revert_to(self, index: int) -> dict:
        """Return the state at a given snapshot index without mutation."""
        if not (0 <= index < len(self._snapshots)):
            raise IndexError(f"Snapshot index {index} out of range [0..{len(self._snapshots) - 1}]")
        return dict(self._snapshots[index])  # shallow copy returned to caller


# ❌ BAD — mutable tuple workaround with no protection
class BadConfig:
    def __init__(self, features: list[str]):
        self.allowed_features = features  # anyone can call .append() later


# ✅ GOOD — frozenset prevents any mutation after construction
class GoodConfig:
    def __init__(self, features: Sequence[str]):
        self._allowed_features = frozenset(features)

    @property
    def allowed_features(self) -> frozenset[str]:
        return self._allowed_features  # frozenset cannot be mutated


# JavaScript Object.freeze — shallow freeze for top-level immutability
const config = Object.freeze({
  maxRetries: 3,
  allowedFeatures: Object.freeze(["trading", "risk", "analytics"]),
});

// ❌ This silently fails (or throws in strict mode):
// config.maxRetries = 5;
// config.allowedFeatures.push("admin");

// ✅ To deep-freeze recursively:
function deepFreeze<T extends object>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  });
  return Object.freeze(obj);
}
```

---

### Pattern 5: Domain Events for State Changes — Replace Mutation with Event-Based Transitions

Instead of mutating an object's state directly, emit a domain event that describes what happened. The system handles the event to transition state. This makes every state change explicit, auditable, and reversible.

```python
from __future__ import annotations
from dataclasses import dataclass, field, replace
from datetime import datetime
from decimal import Decimal
from typing import Protocol
from enum import Enum


class OrderEventType(str, Enum):
    CREATED = "ORDER_CREATED"
    FILLED = "ORDER_FILLED"
    PARTIAL_FILL = "ORDER_PARTIAL_FILL"
    CANCELLED = "ORDER_CANCELLED"
    REJECTED = "ORDER_REJECTED"


@dataclass(frozen=True)
class OrderEvent:
    """Immutable domain event describing an order state change."""
    event_type: OrderEventType
    timestamp: datetime = field(default_factory=datetime.utcnow)

    # Per-event-type fields — validated at construction
    order_id: str | None = None
    symbol: str | None = None
    quantity: int | None = None
    price: Decimal | None = None
    reason: str | None = None

    def __post_init__(self) -> None:
        if self.order_id is not None and len(self.order_id) == 0:
            raise ValueError("order_id must be non-empty")


class EventSource(Protocol):
    """Protocol for objects that process domain events to update state."""
    def apply_event(self, event: OrderEvent) -> OrderEvent | None: ...


@dataclass(frozen=True)
class EventSourcedOrder:
    """Immutable order reconstructed from its event history.

    Every state transition is an immutable event in the history.
    The current state is computed by replaying events — there are
    no hidden mutations.
    """
    order_id: str
    symbol: str
    quantity: int
    price: Decimal
    side: str = "BUY"
    status: str = "PENDING"
    _event_history: tuple[OrderEvent, ...] = field(default=(), repr=False)

    def apply(self, event: OrderEvent) -> EventSourcedOrder:
        """Process an incoming event and return a new order with updated state.

        This is the single point of state mutation — all changes go through
        event application, making history complete and auditable.
        """
        if event.order_id != self.order_id:
            raise ValueError(
                f"Event order_id ({event.order_id}) does not match "
                f"this order ({self.order_id})"
            )

        # Transition logic — each event maps to a deterministic state change
        new_status = self.status
        new_quantity = self.quantity
        new_price = self.price

        match event.event_type:
            case OrderEventType.FILLED:
                if event.quantity is None or event.price is None:
                    raise ValueError("FILLED events require quantity and price")
                executed = event.quantity
                remaining = self.quantity - executed
                if remaining < 0:
                    raise ValueError(
                        f"Fill quantity ({executed}) exceeds order quantity ({self.quantity})"
                    )
                new_status = "PARTIAL_FILL" if remaining > 0 else "FILLED"
                if remaining == 0:
                    new_price = event.price

            case OrderEventType.PARTIAL_FILL:
                if event.quantity is None or event.price is None:
                    raise ValueError("PARTIAL_FILL events require quantity and price")
                executed = event.quantity
                remaining = self.quantity - executed
                if remaining < 0:
                    raise ValueError("Fill exceeds order quantity")
                new_status = "PARTIAL_FILL" if remaining > 0 else "FILLED"

            case OrderEventType.CANCELLED:
                new_status = "CANCELLED"

            case OrderEventType.REJECTED:
                new_status = "REJECTED"

            case _:
                pass  # CREATED event doesn't change state after initial construction

        return EventSourcedOrder(
            order_id=self.order_id,
            symbol=self.symbol,
            quantity=new_quantity,
            price=new_price,
            side=self.side,
            status=new_status,
            _event_history=self._event_history + (event,),  # append to immutable history
        )

    @property
    def event_count(self) -> int:
        return len(self._event_history)

    @classmethod
    def create(
        cls,
        order_id: str,
        symbol: str,
        quantity: int,
        price: Decimal,
        side: str = "BUY",
    ) -> EventSourcedOrder:
        """Construct a new order with an ORDER_CREATED event in history."""
        initial = cls(
            order_id=order_id,
            symbol=symbol,
            quantity=quantity,
            price=price,
            side=side,
            status="PENDING",
        )
        created_event = OrderEvent(
            event_type=OrderEventType.CREATED,
            order_id=order_id,
            symbol=symbol,
            quantity=quantity,
            price=price,
        )
        return initial.apply(created_event)


# ❌ BAD — direct mutation of state with no audit trail
class BadOrder:
    def __init__(self, oid: str, sym: str, qty: int, price: float):
        self.order_id = oid
        self.symbol = sym
        self.quantity = qty
        self.price = price
        self.status = "PENDING"

    def fill(self, executed_qty: int, price: float) -> None:  # mutates in place
        self.quantity -= executed_qty
        self.price = price
        self.status = "FILLED" if self.quantity == 0 else "PARTIAL_FILL"


# ✅ GOOD — event-based state transitions with full history
@dataclass(frozen=True)
class GoodOrder:
    """Event-sourced order: every change is an immutable event."""
    order_id: str
    symbol: str
    quantity: int
    price: Decimal
    status: str = "PENDING"

    def fill(self, executed_qty: int, fill_price: Decimal) -> GoodOrder:
        """Returns new instance — original untouched. Event logged via history."""
        return replace(
            self,
            quantity=self.quantity - executed_qty,
            price=fill_price,
            status="FILLED" if (self.quantity - executed_qty) == 0 else "PARTIAL_FILL",
        )
```

---

## Constraints

### MUST DO
- Freeze all value objects at construction — never allow field reassignment after creation
- Document pure functions with explicit input/output contract in docstrings and type hints
- Use `replace()` (Python) or spread operator (JS/TS) for structural updates — never mutate in place
- Return copies (shallow is acceptable unless nested mutability exists) from public properties of immutable objects
- Validate all invariants in constructors or `__post_init__` — fail fast on invalid state

### MUST NOT DO
- Return a reference to an internal mutable object (e.g., `return self._items`) — return a copy or frozen view
- Use global or module-level variables inside pure functions
- Mutate function arguments in place — treat all inputs as read-only
- Use mutable default arguments (`def fn(items: list = [])`) — use `None` with lazy initialization
- Mix mutable and immutable patterns within the same object hierarchy without clear boundaries

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-error-handling` | Complementary pattern for catching validation failures early when constructing immutable objects |
| `functional-programming-patterns` | Deeper dive into pure functions, immutability in FP languages (Haskell, Elm, F#) |
| `dependency-inversion-principle` | Inverts control to reduce coupling — pairs well with immutable data flowing through dependency boundaries |

---

## Live References

> Authoritative documentation links for immutable data patterns and their implementations.

- [Python `dataclasses` — Frozen Dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances)
- [TypeScript `readonly` Modifier](https://www.typescriptlang.org/docs/handbook/2/objects.html#the-readonly-modifier)
- [Immutability in Python — Real Python Guide](https://realpython.com/python-frozen-list/)
- [Immutable Data Patterns — JavaScript.info](https://javascript.info/immutable-action)
- [Domain Events — Microsoft Architecture Patterns Reference](https://learn.microsoft.com/en-us/azure/architecture/patterns/domain-event)
