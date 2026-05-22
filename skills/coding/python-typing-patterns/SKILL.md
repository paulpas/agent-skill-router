---
name: python-typing-patterns
description: Implements advanced Python typing patterns including generic classes, Protocol structural subtyping, TypeVar bounds and constraints, variance annotations, and composite type construction for robust static analysis.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: python generics, typing patterns, Protocol structural subtyping, TypeVar bounds, Generic classes, covariance contravariance, TypeAliasType, runtime type inspection, mypy advanced typing, pyright protocols
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: python-modern-development, type-safety-enforcement
---

# Python Advanced Typing Patterns

Implements advanced static typing constructs — Generic classes, Protocol structural subtyping, TypeVar bounds and constraints, variance annotations, composite type construction, and runtime type inspection — to catch type errors at development time in Python codebases.

## TL;DR Checklist

- [ ] Use `Generic[T]` for class-level type parameters; prefer `bound=` over multiple `TypeVar`s when one type suffices
- [ ] Define Protocols for structural subtyping instead of forcing inheritance hierarchies
- [ ] Annotate covariance (`covariant=True`) on return-only types and contravariance (`contravariant=True`) on argument-only types
- [ ] Prefer `TypedDict` over `dict[str, Any]` for structured dictionary contracts
- [ ] Use `Literal` types to constrain string/enum values at the type level
- [ ] Apply `TypeGuard` / `TypeIs` for custom narrowing in conditional branches
- [ ] Combine runtime validation (Pydantic) with static types for production-grade safety

---

## When to Use

Use this skill when:

- Building reusable libraries or internal frameworks that accept typed data structures (e.g., a repository layer, cache abstraction, event bus)
- You need duck-typing contracts without shared inheritance (e.g., multiple sensor types implementing `readings() -> list[float]`)
- Designing generic containers, queues, caches, or adapters where the element type varies but the API is uniform
- Writing decorators that preserve parameter/return types across transformations (`ParamSpec`, `Concatenate`)
- Building data validation pipelines where static types and runtime checks must coexist (Pydantic + Protocol)
- Refactoring a dynamically-typed codebase to incrementally add type safety without breaking changes
- A mypy or pyright check flags ambiguous return types, missing variance annotations, or structural mismatches

---

## When NOT to Use

Avoid this skill for:

- Simple scripts with one-off functions — the typing overhead outweighs benefits (use `python-modern-development` instead)
- Codebases that explicitly disable static analysis (e.g., `# type: ignore` everywhere) — add types incrementally first
- Pure runtime validation needs — use Pydantic or dataclasses without over-engineering generics for simple DTOs
- Performance-critical hot paths where runtime `isinstance()` on Protocols adds measurable latency — precompute dispatch tables instead
- Python versions below 3.10 — some features (`ParamSpec`, `TypeAlias`, `TypeIs`) require 3.10+

---

## Core Workflow

1. **Classify the typing need** — Determine whether the pattern requires Generic classes (parameterized containers/adapters), Protocol subtyping (duck-typing contracts), variance annotations (return-only vs argument-only type params), composite types (TypedDict, Literal, NewType), or runtime inspection (TypeGuard, Pydantic integration).
   **Checkpoint:** Select exactly one primary pattern; if multiple apply, layer them with the most specific first.

2. **Define the structural contract** — For Protocols: declare the interface as `class Foo(Protocol):` without implementing methods (use `...`). For Generics: declare `TypeVar` with appropriate bounds/constraints/defaults and annotate the class signature as `Class(Generic[T])`.
   **Checkpoint:** Run `mypy --strict` on the definition in isolation; no errors means the contract is well-formed.

3. **Apply variance correctly** — Mark a TypeVar `covariant=True` when the type appears only in return positions (read-only). Mark it `contravariant=True` for argument-only positions (write-only). Leave invariant (default) for mutable shared state.
   **Checkpoint:** Verify that a covariant TypeVar is never used as a method parameter and a contravariant one is never used as a return type — mypy will reject violations.

4. **Integrate runtime validation where types cannot express the constraint** — Use `TypeGuard` / `TypeIs` for conditional narrowing, Pydantic models for boundary inputs (HTTP payloads, config files), and Protocol duck-typing checks with `isinstance(obj, SomeProtocol)`.
   **Checkpoint:** Every boundary crossing (parsing JSON, deserializing DB rows, receiving WebSocket messages) has a runtime validation layer co-located with its static type annotation.

5. **Verify end-to-end with a real-world usage example** — Exercise the pattern with at least three concrete types (e.g., `StockRepository[Equity]`, `Cache[str, PriceData]`, event handlers for different signal types).
   **Checkpoint:** All three instantiations pass `mypy --strict` with zero errors and zero warnings.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Generic Classes with Type Variables

Generic classes let you parameterize containers, adapters, repositories, and caches by a type variable `T`. Use `Class(Generic[T])` syntax. For multiple type parameters, chain them: `Class(Generic[K, V])`.

#### TypeVar Bounds vs Constraints

- **Bounds** (`TypeVar("T", bound=SomeType)`) — T must be a subtype of the bound. The bound becomes the static "parent" type inside the class. Only one bound allowed (no intersection types).
- **Constraints** (`TypeVar("T", "U", constraint=True)`) — Multiple TypeVars that are constrained to be the same concrete type when used together. Useful for functions where two params must share a type but differ inside the class.

#### Default Type Parameters

Python 3.12+ supports `class Foo(Generic[T = SomeType]):` so callers can omit `<...>` and get sensible defaults.

```python
from typing import Generic, TypeVar, Protocol

# --- Bounds: T must be a subtype of SupportsRead ---
T_co = TypeVar("T_co", covariant=True)

class SupportsRead(Protocol):
    def read(self) -> bytes: ...

class DataStream(Generic[T_co]):
    """A read-only stream that yields items of type T."""
    def __init__(self, source: SupportsRead) -> None:
        self._source = source
        self._buffer: list[T_co] = []

    def next_item(self) -> T_co | None:
        if not self._buffer:
            data = self._source.read()
            self._buffer = self._parse(data)  # type: ignore[assignment]
        return self._buffer.pop(0) if self._buffer else None

    def _parse(self, raw: bytes) -> list[T_co]:
        raise NotImplementedError

# --- Bounds: T must be a subtype of SupportsRead ---
class FileStream(DataStream[bytes]):
    """Concrete stream for file-like binary data."""
    pass

# --- GOOD: Multiple type params with defaults (Python 3.12+) ---
K = TypeVar("K")
V = TypeVar("V")

class Cache(Generic[K, V]):
    """In-memory TTL cache with generic key/value types."""
    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl = ttl_seconds
        self._store: dict[K, tuple[V, float]] = {}

    def get(self, key: K) -> V | None:
        if key in self._store:
            value, timestamp = self._store[key]
            if (time.time() - timestamp) < self._ttl:
                return value
            del self._store[key]  # expired
        return None

    def put(self, key: K, value: V) -> None:
        self._store[key] = (value, time.time())

    def invalidate(self, predicate: Callable[[K, V], bool]) -> int:
        """Remove entries matching predicate. Returns count removed."""
        keys_to_remove = [
            k for k, (v, _) in self._store.items() if predicate(k, v)
        ]
        for k in keys_to_remove:
            del self._store[k]
        return len(keys_to_remove)


# --- BAD: Using Any kills type safety entirely ---
class BadCache:
    def __init__(self) -> None:
        self._store: dict = {}  # type ignores everything

    def get(self, key):  # no type hints at all
        return self._store.get(key)

    def put(self, key, value):
        self._store[key] = value


# --- GOOD: Repository pattern with generic T and bound ---
EntityT = TypeVar("EntityT", bound="Entity")

class Entity(Protocol):
    id: int

class Repository(Generic[EntityT]):
    """Abstract repository for entity persistence."""
    def __init__(self, session) -> None:
        self._session = session

    def find_by_id(self, entity_id: int) -> EntityT | None:
        raise NotImplementedError

    def save(self, entity: EntityT) -> EntityT:
        raise NotImplementedError

    def delete(self, entity: EntityT) -> bool:
        raise NotImplementedError


# Usage with concrete types
class Equity(Entity):
    id: int
    ticker: str
    exchange: str

class EquityRepository(Repository[Equity]):
    def find_by_id(self, entity_id: int) -> Equity | None:
        # Actual implementation would query DB here
        return None  # type: ignore[return-value]

    def save(self, entity: Equity) -> Equity:
        return entity  # type: ignore[return-value]

    def delete(self, entity: Equity) -> bool:
        return True
```

---

### Pattern 2: Protocol Structural Subtyping

Protocols enable **structural subtyping** (duck typing + static checking). Any class that has the required methods/attributes satisfies a Protocol without explicit inheritance. This is ideal for plugin systems, sensor interfaces, and adapter patterns where you cannot control the class hierarchy.

```python
from typing import Protocol, runtime_checkable
import math


# --- Defining a Protocol (no implementation needed) ---
class PriceSource(Protocol):
    """A source that provides current and historical price data."""
    symbol: str  # class or instance attribute

    def get_current_price(self) -> float:
        ...

    def get_historical_prices(
        self, start: datetime, end: datetime
    ) -> list[float]:
        ...


# --- Explicit implementation (inherits Protocol) ---
class ExchangeAPI:
    symbol: str

    def __init__(self, exchange: str, api_key: str) -> None:
        self._exchange = exchange
        self._api_key = api_key

    def get_current_price(self) -> float:
        # Real HTTP call to exchange
        return 42000.0

    def get_historical_prices(
        self, start: datetime, end: datetime
    ) -> list[float]:
        return [42000.0]


# --- Implicit structural satisfaction (no inheritance needed) ---
class MockPriceSource:
    """Works with PriceSource without inheriting from it."""
    symbol = "BTC/USD"

    def get_current_price(self) -> float:
        return 43500.0

    def get_historical_prices(
        self, start: datetime, end: datetime
    ) -> list[float]:
        return [42000.0, 42500.0, 43000.0]


# --- Using Protocol in function signatures ---
def compute_moving_average(source: PriceSource, window: int = 7) -> float:
    prices = source.get_historical_prices(
        datetime.now() - timedelta(days=window),
        datetime.now()
    )
    if len(prices) < window:
        raise ValueError(f"Need at least {window} prices, got {len(prices)}")
    return sum(prices[-window:]) / window


# Verify structural satisfaction at runtime (with @runtime_checkable)
@runtime_checkable
class LogSink(Protocol):
    """Any object that can receive log messages."""
    level: str

    def emit(self, message: str, level: str = "INFO") -> None: ...


def setup_logging(sink: LogSink, level: str = "INFO") -> None:
    sink.emit("Logger initialized", level)


# --- Runtime check with isinstance (requires @runtime_checkable) ---
class ConsoleLogSink:
    level = "INFO"

    def emit(self, message: str, level: str = "INFO") -> None:
        print(f"[{level}] {message}")


if __name__ == "__main__":
    console = ConsoleLogSink()
    # isinstance works at runtime with @runtime_checkable
    assert isinstance(console, LogSink)

    # BAD: Protocol check without @runtime_checkable raises TypeError
    # assert isinstance(MockPriceSource(), PriceSource)  # RuntimeError!


# --- Protocol inheritance and composition ---
class WritablePriceSource(PriceSource):
    """Protocol that extends PriceSource with write capability."""
    def submit_order(self, symbol: str, side: str, quantity: float) -> str:
        ...

    def cancel_order(self, order_id: str) -> bool:
        ...


# --- BAD: Forcing inheritance creates unnecessary coupling ---
class BadExchangeAPI(ExchangeAPI):  # Forced to inherit from some base class
    pass  # You can't share behavior without a shared base


# --- GOOD: Protocol allows any structurally compatible type ---
def trade_with(source: PriceSource, order_sink: WritablePriceSource) -> None:
    price = source.get_current_price()
    order_id = order_sink.submit_order("BTC/USD", "buy", 0.1)
    print(f"Ordered at {price}, ID: {order_id}")
```

---

### Pattern 3: TypeVar Bounds, Constraints, and Variance

Variance describes how subtyping relationships propagate through generic types. Understanding variance is essential for designing safe container types and callback signatures.

| Variance | Meaning | When to Use | Example |
|-----------|---------|-------------|---------|
| **Covariant** (`+T`) | `SubA` → `SubB` means `Container[SubA]` → `Container[SubB]` | Read-only / return-only positions | `Generator[T, None, R]`, `Iterable[T]` |
| **Contravariant** (`-T`) | `SubA` → `SubB` means `Handler[SubB]` → `Handler[SubA]` | Write-only / argument-only positions | `Callable[[T], R]`, comparison ops |
| **Invariant** (default) | No subtyping propagation | Mutable shared state | `list[T]`, `dict[K, V]` |

```python
from typing import TypeVar, Protocol, Callable, Generic
import functools


# --- Covariant: T appears only in return positions ---
T_co = TypeVar("T_co", covariant=True)

class Result(Generic[T_co]):
    """An immutable result container (read-only)."""

    def __init__(self, value: T_co) -> None:
        self._value = value

    @property
    def value(self) -> T_co:
        return self._value

    def map(self, fn: Callable[[T_co], "Result[T_co]"]) -> "Result[T_co]":
        return fn(self._value)


# Covariance means this is safe:
def process(result: Result[float]) -> float:
    return result.value * 1.08

# Result[int] is assignable to Result[float] because T is covariant
int_result: Result[int] = Result(42)
process(int_result)  # ✅ Safe: reading int as float


# --- Contravariant: T appears only in argument positions ---
T_contra = TypeVar("T_contra", contravariant=True)

class Handler(Generic[T_contra]):
    """Processes events; accepts more specific event types."""

    def __init__(self, callback: Callable[[T_contra], None]) -> None:
        self._callback = callback

    def handle(self, event: T_contra) -> None:
        self._callback(event)


# Contravariance means Handler[object] handles any subtype of object
class ObjectHandler(Handler[object]):
    def handle(self, event: object) -> None:
        print(f"Handled generic event: {event}")

class StringEvent(str):
    pass

def use_handler(h: Handler[StringEvent]) -> None:
    h.handle(StringEvent("hello"))

# ✅ Safe: ObjectHandler can handle StringEvent because T is contravariant
use_handler(ObjectHandler(lambda e: print(e)))


# --- Invariant (default): mutable shared state must be exact ---
T_inv = TypeVar("T_inv")  # invariant by default

class MutableBuffer(Generic[T_inv]):
    """Mutable buffer — neither covariant nor contravariant."""

    def __init__(self) -> None:
        self._data: list[T_inv] = []

    def append(self, item: T_inv) -> None:
        self._data.append(item)

    def get(self, index: int) -> T_inv:
        return self._data[index]


# Invariance prevents type confusion in mutable containers
buf_ints: MutableBuffer[int] = MutableBuffer()
buf_floats: MutableBuffer[float] = MutableBuffer()

# buf_ints.append(42)  # would be unsafe if covariant
# because someone could then do: floats = buf_ints; floats.append(3.14)


# --- Bounds vs Constraints comparison ---
from abc import abstractmethod

class Shape(Protocol):
    @abstractmethod
    def area(self) -> float: ...

class Circle(Shape):
    def __init__(self, radius: float) -> None:
        self.radius = radius

    def area(self) -> float:
        return math.pi * self.radius ** 2

class Rectangle(Shape):
    def __init__(self, width: float, height: float) -> None:
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height


# Bounds: T must be Shape (one parent limit)
S = TypeVar("S", bound=Shape)

class ShapeCalculator(Generic[S]):
    """Works with any type that implements the Shape protocol."""

    def __init__(self, shape: S) -> None:
        self._shape = shape

    def total_area(self, n: int = 1) -> float:
        return self._shape.area() * n


# --- BAD: Without bound, T could be anything ---
class BadCalculator(Generic[T_inv]):
    def area(self, item: T_inv) -> float:
        # mypy has no guarantee that item has .area()
        return item.area()  # ❌ error: T_inv has no attribute 'area'


# --- BAD: Using constraints for what should be a bound ---
S1 = TypeVar("S1")
S2 = TypeVar("S2", Circle, Rectangle)  # constrained to exactly these two

class RestrictedCalculator(Generic[S1, S2]):
    def __init__(self, circle: S1, rectangle: S2) -> None:
        # The constraint forces S1 and S2 to be the same type
        # This is NOT what we want — they can be different shapes
        pass
```

---

### Pattern 4: Composite & Advanced Type Construction

Combine multiple typing constructs to express rich, precise contracts for structured data, constrained values, variadic generics, and decorator type preservation.

```python
from typing import (
    TypedDict, Literal, NewType, Union, Annotated, Optional,
    ParamSpec, overload, Protocol, Generic, TypeVar
)
from typing_extensions import TypeIs  # or built-in Python 3.13+


# --- Literal Types: Constrain string/enum values at the type level ---

HTTPMethod = Literal["GET", "POST", "PUT", "DELETE"]

class HTTPRequest(TypedDict):
    method: HTTPMethod
    path: str
    headers: dict[str, str]
    body: bytes | None


def process_request(req: HTTPRequest) -> int:
    """Type-safe request handler — mypy knows 'method' is one of 4 values."""
    if req["method"] == "GET":
        return 200
    if req["method"] == "POST":
        return 201
    # mypy will warn if you forget "PUT" or "DELETE" (exhaustiveness)
    return 405


# --- TypedDict: Structured dict contracts with optional fields ---
class Candlestick(TypedDict):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class CandlestickExtended(Candlestick, total=False):
    """Extends base candlestick with optional technical indicators."""
    vwap: float
    rsi: float
    bollinger_upper: float
    bollinger_lower: float


def calculate_sma(candles: list[Candlestick], window: int) -> list[float]:
    """Calculate simple moving average from typed candle data."""
    if not candles or window <= 0:
        return []
    result: list[float] = []
    for i in range(len(candles)):
        if i < window - 1:
            result.append(float("nan"))
            continue
        slice_end = i + 1
        avg = sum(c["close"] for c in candles[slice_end - window:slice_end]) / window
        result.append(avg)
    return result


# --- NewType: Distinct types that are incompatible at compile time ---
UserId = NewType("UserId", int)
AccountId = NewType("AccountId", str)

def get_user_balance(user_id: UserId, account_id: AccountId) -> float:
    """Types prevent accidental swap of user/account."""
    return 0.0

uid = UserId(12345)
aid = AccountId("ACC-9876")
balance = get_user_balance(uid, aid)  # ✅ Correct
get_user_balance(aid, uid)  # ❌ mypy error: types mismatch


# --- Annotated: Attach metadata to types for validators / ORM ---
from typing import Annotated

MaxFieldSize = Annotated[str, {"max_length": 256}]
PositiveFloat = Annotated[float, {"gt": 0.0}]

class OrderPayload(TypedDict):
    symbol: MaxFieldSize
    quantity: PositiveFloat
    price: PositiveFloat


# --- ParamSpec: Preserve parameter types in decorators ---
P = ParamSpec("P")
R = TypeVar("R")

def retry_on_failure(max_retries: int = 3, delay: float = 1.0) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Decorator that preserves the wrapped function's signature."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except ConnectionError as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
            raise RuntimeError("Max retries exceeded")
        return wrapper  # type: ignore[return-value]
    return decorator


@retry_on_failure(max_retries=3, delay=0.5)
def fetch_order(symbol: str, quantity: float) -> dict:
    """Signature preserved: (symbol: str, quantity: float) -> dict."""
    return {"symbol": symbol, "quantity": quantity}


# --- BAD: ParamSpec without proper usage loses type information ---
@retry_on_failure()  # decorator works but signature is less precise
def bad_fetch(symbol, quantity):  # no type hints on the decorated func
    return {}


# --- TypeVarTuple (Python 3.11+) — Variadic generics ---
from typing import TypeVarTuple

Ts = TypeVarTuple("Ts")

class Tensor(Generic[*Ts]):
    """A typed tensor with shape known at compile time."""
    def __init__(self, data: list) -> None:
        self._data = data  # type: ignore[assignment]

    def reshape(self, *shape: int) -> "Tensor[int, ...]":
        return Tensor(self._data)


# --- Runtime type inspection with issubclass ---
def check_protocol_compliance(obj: object, protocol: type[Protocol]) -> bool:
    """Check if an object satisfies a Protocol structurally at runtime."""
    try:
        return isinstance(obj, protocol)  # requires @runtime_checkable
    except TypeError:
        # Fallback: check for required attributes manually
        attrs = {attr for attr in dir(protocol) if not attr.startswith("_")}
        return all(hasattr(obj, attr) for attr in attrs)
```

---

### Pattern 5: Runtime Type Inspection & Validation Patterns

Static types alone cannot validate data at boundaries (JSON payloads, database results, API responses). Combine static analysis with runtime validation for production-grade safety.

```python
from typing import Protocol, TypeGuard, TypeIs, cast, Any
import json
import sys


# --- TypeGuard: Custom narrowing in conditional branches ---
def is_list_of_floats(value: Any) -> TypeGuard[list[float]]:
    """Narrow a value to list[float] after runtime validation."""
    if not isinstance(value, list):
        return False
    return all(isinstance(item, (int, float)) for item in value)


def validate_order_book(raw_data: dict) -> dict | None:
    """Parse and validate order book data from exchange API."""
    bids = raw_data.get("bids", [])
    asks = raw_data.get("asks", [])

    if not is_list_of_floats(bids) or not is_list_of_floats(asks):
        return None  # Invalid: non-float values in order book

    # After TypeGuard, mypy knows bids/asks are list[float]
    best_bid = max(bids) if bids else 0.0
    best_ask = min(asks) if asks else float("inf")

    return {"spread": best_ask - best_bid, "depth": len(bids) + len(asks)}


# --- TypeIs (Python 3.13+): Stronger narrowing for subclass checks ---
if sys.version_info >= (3, 13):
    from typing import TypeIs

    class Order:
        def __init__(self, symbol: str, side: str, qty: float) -> None:
            self.symbol = symbol
            self.side = side
            self.qty = qty

    class LimitOrder(Order):
        price: float

        def __init__(self, symbol: str, side: str, qty: float, price: float) -> None:
            super().__init__(symbol, side, qty)
            self.price = price

    def is_limit_order(order: Order) -> TypeIs[LimitOrder]:
        return hasattr(order, "price") and isinstance(order.price, (int, float))


# --- Combining Protocol + Runtime Check for dynamic dispatch ---
from typing import runtime_checkable

@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict: ...

    @classmethod
    def from_dict(cls, data: dict) -> "Serializable":
        ...


def persist_to_json(obj: Serializable, filepath: str) -> None:
    """Serialize any Protocol-compliant object to JSON."""
    if not isinstance(obj, Serializable):
        raise TypeError(f"Object must implement Serializable, got {type(obj).__name__}")

    with open(filepath, "w") as f:
        json.dump(obj.to_dict(), f, indent=2)


# --- Pydantic integration: Static types + runtime validation ---
from pydantic import BaseModel, Field, field_validator  # type: ignore[import-untyped]

class TickData(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    price: float = Field(..., gt=0.0)
    volume: float = Field(..., ge=0.0)
    exchange: str = Field(default="unknown")

    @field_validator("exchange")
    @classmethod
    def valid_exchange(cls, v: str) -> str:
        valid = {"NYSE", "NASDAQ", "LSE", "TSE", "BSE"}
        if v not in valid:
            raise ValueError(f"Invalid exchange: {v}")
        return v


class TickPayload(TypedDict):
    symbol: str
    price: float
    volume: float
    exchange: Optional[str]


def parse_tick(raw: TickPayload) -> TickData | None:
    """Static type (TypedDict) → runtime validation (Pydantic)."""
    try:
        return TickData(**raw)  # Pydantic validates and coerces types
    except ValueError:
        return None


# --- Practical pattern for mixed typed/untyped codebases ---
def safe_cast(value: Any, expected_type: type[T_co]) -> T_co | None:
    """Safely cast a value with runtime check, returning None on failure."""
    if isinstance(value, expected_type):
        return cast(T_co, value)  # mypy knows this is safe after the check
    return None


def process_mixed_input(data: Any) -> dict[str, float]:
    """Handle input from untyped sources (e.g., legacy config files)."""
    if not isinstance(data, dict):
        raise TypeError(f"Expected dict, got {type(data).__name__}")

    result: dict[str, float] = {}
    for key, value in data.items():
        if is_list_of_floats(value):
            result[key] = sum(value) / len(value)  # type: ignore[arg-type]
        elif isinstance(value, (int, float)):
            result[key] = float(value)

    return result
```

---

### Pattern 6: Advanced Generic Constraints & Type Narrowing

Combine generics, overloads, Protocols, and narrowing to build robust, self-documenting APIs — especially useful for event systems, DSLs, and data processing pipelines.

```python
from typing import (
    Generic, TypeVar, Protocol, overload, Callable,
    Literal, Union, Mapping, Sequence
)


# --- Generic methods inside regular classes ---
class Pipeline:
    """Regular class with typed generic methods for step chaining."""

    T = TypeVar("T")
    R = TypeVar("R")

    def transform(self, value: T, fn: Callable[[T], R]) -> R:
        return fn(value)

    def chain(self, *steps: Callable[[Any], Any]) -> Callable[[Any], Any]:
        def composed(value: Any) -> Any:
            for step in steps:
                value = step(value)
            return value
        return composed


# --- Overload signatures: Multiple input/output type combos ---
class PriceAggregator:
    """Overloaded methods that narrow based on input types."""

    @overload
    def aggregate(self, prices: list[float]) -> float: ...

    @overload
    def aggregate(self, prices: tuple[float, ...]) -> float: ...

    @overload
    def aggregate(self, prices: Sequence[Mapping[str, float]]) -> dict[str, float]: ...

    def aggregate(
        self, prices: Union[list[float], tuple[float, ...], Sequence[Mapping[str, float]]]
    ) -> Union[float, dict[str, float]]:
        if isinstance(prices, (list, tuple)):
            return sum(prices) / len(prices) if prices else 0.0
        # Mapping sequence: aggregate per-symbol
        result = {}
        for mapping in prices:
            for symbol, price in mapping.items():
                result[symbol] = (result.get(symbol, 0.0) + price) / 2.0
        return result


# --- Protocol-based generic constraints for event systems ---
T_event = TypeVar("T_event")

class EventHandler(Protocol[T_event]):
    """Protocol for handling typed events."""
    def handle(self, event: T_event) -> None: ...


class EventDispatcher(Generic[T_event]):
    """Type-safe event dispatcher with protocol-based handlers."""

    def __init__(self) -> None:
        self._handlers: list[EventHandler[T_event]] = []

    def register(self, handler: EventHandler[T_event]) -> None:
        self._handlers.append(handler)

    def dispatch(self, event: T_event) -> None:
        for handler in self._handlers:
            handler.handle(event)


# --- Concrete event system with Protocol narrowing ---
class TradeEvent:
    def __init__(self, symbol: str, side: Literal["buy", "sell"], quantity: float) -> None:
        self.symbol = symbol
        self.side = side
        self.quantity = quantity


class PriceUpdate:
    def __init__(self, symbol: str, bid: float, ask: float) -> None:
        self.symbol = symbol
        self.bid = bid
        self.ask = ask


# --- Structural type narrowing with isinstance checks on Protocols ---
@runtime_checkable
class TradableEvent(Protocol):
    """Events that involve a tradable instrument."""
    symbol: str

def get_tradable_symbols(events: Sequence[object]) -> list[str]:
    """Narrow events to those that are TradableEvent structsurally."""
    return [e.symbol for e in events if isinstance(e, TradableEvent)]


# --- Comprehensive example: Typed event system with union narrowing ---
class Signal(BaseModel):  # type: ignore[misc]
    timestamp: float
    confidence: float = Field(..., ge=0.0, le=1.0)

class BuySignal(Signal):
    kind: Literal["buy"] = "buy"
    target_price: float

class SellSignal(Signal):
    kind: Literal["sell"] = "sell"
    stop_loss: float | None = None

TradingSignal = Union[BuySignal, SellSignal]

def classify_signal(data: dict) -> TradingSignal | None:
    """Parse raw data into a typed signal with runtime validation."""
    kind = data.get("kind")
    if kind not in ("buy", "sell"):
        return None

    # Narrow using isinstance + type narrowing pattern
    if kind == "buy":
        try:
            return BuySignal(**data)  # type: ignore[call-arg]
        except Exception:
            return None
    else:
        try:
            return SellSignal(**data)  # type: ignore[call-arg]
        except Exception:
            return None


def execute_signal(signal: TradingSignal) -> dict[str, Any]:
    """Type-narrowed signal execution with structural dispatch."""
    if isinstance(signal, BuySignal):
        return {
            "action": "BUY",
            "symbol": signal.symbol,
            "target": signal.target_price,
            "confidence": signal.confidence,
        }
    elif isinstance(signal, SellSignal):
        return {
            "action": "SELL",
            "symbol": signal.symbol,
            "stop_loss": signal.stop_loss,
            "confidence": signal.confidence,
        }
    # mypy knows signal can't be here after exhaustive narrowing
    raise ValueError(f"Unexpected signal type: {type(signal)}")
```

---

## Constraints

### MUST DO
- Use `Generic[T]` for every class that parameterizes by type — never fall back to `Any`
- Annotate variance (`covariant=True` / `contravariant=True`) when the type variable appears in only one position (return-only → covariant, argument-only → contravariant)
- Define Protocols with explicit method signatures using `...` bodies; do NOT implement logic inside Protocol methods
- Pair static type annotations with runtime validation (`TypeGuard`, Pydantic, or `isinstance` checks) at every system boundary
- Use `Literal` types to constrain enum-like strings and narrow control flow — enables exhaustive matching in mypy
- Prefer `TypedDict` over bare `dict[str, Any]` when the dictionary has a known schema; use `total=False` for optional fields
- Apply `@overload` signatures before the implementation to document all accepted input/output combinations
- Keep TypeVar names conventional: `T_co` (covariant), `T_contra` (contravariant), `T_inv` (invariant), `P` (ParamSpec), `R` (return)

### MUST NOT DO
- Do NOT use `TypeVar("T", bound=BaseClass)` when you actually need multiple constraints — bounds only support one parent; use a Protocol instead
- Do NOT mark mutable containers as covariant — `list[CovariantSub]` violates the Liskov Substitution Principle and causes runtime errors
- Do NOT define Protocols with concrete method bodies that perform business logic — Protocols describe *what*, not *how*
- Do NOT use bare `Any` in public library APIs — it silently disables type checking for downstream consumers
- Do NOT forget `@runtime_checkable` on Protocols when you need `isinstance(obj, SomeProtocol)` at runtime (raises `TypeError` without it)
- Do NOT rely solely on static types for boundary inputs (JSON, HTTP, DB) — always add a runtime validation layer
- Do NOT use constraints (`TypeVar("T", "U", constraint=True)`) when a simple bound would suffice — constraints force the same type and are rarely what you want

---

## Output Template

When implementing advanced typing patterns, produce output in this structure:

1. **Pattern Identification** — State which pattern(s) apply (Generic, Protocol, Variance, Composite, Runtime Inspection, or Event System)
2. **Type Definitions** — Provide all `TypeVar`, `Protocol`, `TypedDict`, and `NewType` declarations with docstrings
3. **Core Classes/Functions** — Implement the main logic with complete type annotations on every public function/method
4. **BAD vs GOOD Examples** — Show the anti-pattern first (e.g., bare `dict[str, Any]`) then the corrected version
5. **Usage Examples** — Demonstrate at least two concrete instantiations (different types applied to the same generic)
6. **Verification Notes** — State what `mypy --strict` checks pass and any known limitations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `python-modern-development` | Foundational Python typing: TypeAlias, Self, ParamSpec basics, @override |
| `type-safety-enforcement` | Mypy/Pyright configuration, CI integration, progressive type adoption strategies |

---

## Live References

- [PEP 484 — Type Hints](https://peps.python.org/pep-0484/) — Original typing specification
- [PEP 544 — Protocols](https://peps.python.org/pep-0544/) — Structural subtyping with `Protocol`
- [PEP 483 — The Theory of Type Hints](https://peps.python.org/pep-0483/) — Variance theory and subtype relationships
- [PEP 612 — ParamSpec](https://peps.python.org/pep-0612/) — Callable parameter preservation in decorators
- [PEP 675 — Literal Types](https://peps.python.org/pep-0675/) — Constrained string and numeric types
- [mypy Documentation — Generic Classes](https://mypy.readthedocs.io/en/stable/generics.html)
- [typing_extensions (Backport)](https://github.com/python/typing_extensions) — Access to `TypeIs`, `reveal_type`, and newer features on Python 3.10+
