---
name: functional-programming-patterns
description: Implements functional programming patterns (pure functions, immutable transforms, composition, currying, Option/Either types, data pipelines) for predictable, testable, and side-effect-free code.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: functional programming, pure function, immutable transform, function composition, currying, Option type, Either type, how do i eliminate side effects
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
  related-skills: immutable-data-patterns, software-error-handling, dependency-inversion-principle
---

# Functional Programming Patterns

Implements functional programming patterns in Python to write pure, predictable, and side-effect-free code. This skill makes the model produce functions that obey referential transparency, use immutable data transforms, compose small functions into robust pipelines, and handle absence and errors with typed Option/Either types instead of null checks and try/catch blocks.

## TL;DR Checklist

- [ ] Every transformation function is pure: no mutable state, no I/O, deterministic output for same input
- [ ] Replace loops with mutation using `map`/`filter`/`reduce` on immutable collections
- [ ] Compose functions with `pipe()` instead of nesting calls or mutating intermediates
- [ ] Use `Option[T]` wherever a value might be absent — never return `None` and hope callers check
- [ ] Use `Either[Error, T]` for recoverable errors — force callers to handle the `Left` case explicitly
- [ ] Build data pipelines as chained transformations: input → transform1 → transform2 → output

---

## When to Use

Use this skill when:

- Refactoring a function that mixes business logic with I/O or mutable state
- Building a data processing pipeline where each step should be independently testable
- Replacing null checks (`if x is not None`) with typed Option types that the compiler cannot ignore
- Handling recoverable errors (validation failures, missing API responses) instead of using try/catch for control flow
- Designing small functions that can be composed into larger behaviors without nested call chains
- Writing library or framework code where callers must reason about what can fail and what can be absent

---

## When NOT to Use

Avoid this skill for:

- I/O-bound tasks (file reading, network requests) — these are inherently impure; wrap them at boundaries instead of trying to make them pure
- Performance-critical tight loops where allocation overhead from immutable copies matters — use mutable structures locally and expose a pure interface
- Simple scripts or one-off utilities where the cognitive overhead outweighs the benefit
- Code that already follows clean separation of pure/core logic from impure/infrastructure layers

---

## Core Workflow

1. **Identify the Pure Core** — Extract business logic functions that depend only on their arguments and produce deterministic output. Move all I/O, global state access, and mutation to a boundary layer. **Checkpoint:** Each function must satisfy `f(x) == f(x)` when called twice with the same input.

2. **Replace Mutation with Immutable Transforms** — Convert any loop that mutates a list or dict into a chain of `map`/`filter`/`reduce`. Create new collections rather than modifying existing ones. **Checkpoint:** No function should have a side effect; no external variable should be assigned inside a transformed pipeline.

3. **Introduce Option Types for Absence** — Scan every call site that checks `if x is None`. Replace with `Option[T]` pattern: functions return `Some(value)` or `Nothing`, and callers use `.match()` to handle both cases explicitly. **Checkpoint:** No `None` should escape the domain layer without being wrapped in an Option.

4. **Introduce Either Types for Errors** — Replace try/catch blocks handling known recoverable errors with `Either[Left, Right]`. Functions return `Right(success)` or `Left(error)`. Callers must handle both branches. **Checkpoint:** No exception should propagate through the pure core; all errors flow as values.

5. **Compose into Pipelines** — Chain pure functions using a `pipe` combinator or method chaining. Each step transforms the value from the previous step without mutating intermediates. **Checkpoint:** The pipeline is a single expression with no intermediate variables.

---

## Implementation Patterns

### Pattern 1: Pure Functions and Referential Transparency

A pure function always returns the same output for the same input and produces no observable side effects (no mutation, no I/O, no global state reads). This enables referential transparency: any call to a pure function can be replaced with its result without changing behavior. Dependency injection is the mechanism for isolating impure operations at boundaries while keeping the core pure.

```python
# ❌ BAD: mixes business logic with I/O — not referentially transparent
def calculate_order_total(items: list[dict], tax_rate: float) -> float:
    subtotal = 0
    for item in items:
        subtotal += item["price"] * item["quantity"]
        if item.get("discount"):
            discount_repo = DiscountRepository()  # I/O inside core logic
            subtotal -= discount_repo.lookup(item["discount"]).amount
    tax = subtotal * tax_rate
    return round(subtotal + tax, 2)

# ✅ GOOD: pure core — deterministic, testable, referentially transparent
def calculate_subtotal(items: list[dict]) -> float:
    """Compute order subtotal from item quantities and prices."""
    total = 0.0
    for item in items:
        total += item["price"] * item["quantity"]
    return total


def apply_discount(subtotal: float, discount_fn) -> float:
    """Apply a discount calculation to a subtotal."""
    return subtotal - discount_fn()


def calculate_tax(subtotal: float, tax_rate: float) -> float:
    """Calculate tax amount from subtotal and rate."""
    return round(subtotal * tax_rate, 2)


def calculate_order_total_pure(
    items: list[dict],
    tax_rate: float,
    get_discount_amount: callable
) -> float:
    """Pure order total calculation via dependency injection.

    Args:
        items: List of item dicts with 'price' and 'quantity'.
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%).
        get_discount_amount: Pure callable returning discount amount.

    Returns:
        Final order total rounded to 2 decimal places.
    """
    subtotal = calculate_subtotal(items)
    discounted = apply_discount(subtotal, get_discount_amount)
    tax = calculate_tax(discounted, tax_rate)
    return round(discounted + tax, 2)
```

---

### Pattern 2: Immutable Data Transforms (map / filter / reduce)

Replace loops that mutate state with immutable transformation chains. Each transform produces a new collection without modifying the input. This makes data flow visible and eliminates entire classes of bugs caused by shared mutable state.

```python
# ❌ BAD: mutates input list and accumulates in external variable
def process_orders_buggy(orders: list[dict]) -> dict:
    total_revenue = 0
    high_value_ids = []
    processed = []
    for order in orders:
        if order["status"] == "shipped":
            revenue = order["amount"] * (1 - order.get("return_rate", 0))
            total_revenue += revenue
            if revenue > 500:
                high_value_ids.append(order["id"])
            processed.append({**order, "net_revenue": round(revenue, 2)})
    return {
        "orders": processed,
        "total_revenue": total_revenue,
        "high_value_count": len(high_value_ids),
    }

# ✅ GOOD: immutable chain — input is never modified, flow is explicit
from functools import reduce


def net_revenue(order: dict) -> float:
    """Calculate net revenue for a single order."""
    return round(order["amount"] * (1 - order.get("return_rate", 0)), 2)


def process_orders(orders: list[dict]) -> dict:
    """Process orders immutably, returning summary statistics.

    Args:
        orders: List of order dicts with 'status', 'amount', 'id', etc.

    Returns:
        Summary dict with processed orders and aggregate stats.
    """
    shipped = filter(lambda o: o["status"] == "shipped", orders)
    enriched = map(
        lambda o: {**o, "net_revenue": net_revenue(o)},
        shipped,
    )
    processed = list(enriched)

    high_value_ids = [
        order["id"] for order in processed if order["net_revenue"] > 500
    ]
    total_revenue: float = reduce(
        lambda acc, o: acc + o["net_revenue"],
        processed,
        0.0,
    )

    return {
        "orders": processed,
        "total_revenue": round(total_revenue, 2),
        "high_value_count": len(high_value_ids),
    }
```

---

### Pattern 3: Function Composition and Currying

Compose small pure functions into larger behaviors using a `pipe` combinator. Use currying to create partially applied functions that serve as building blocks. This eliminates nested function calls and makes the transformation data flow explicit left-to-right.

```python
# ❌ BAD: deeply nested calls — hard to read, hard to test intermediate steps
def process_user(user: dict) -> str:
    return format_email(
        normalize(
            validate(get_username(user))
        )
    )

# ✅ GOOD: pipe composition — clear left-to-right data flow
from typing import TypeVar, Callable

T = TypeVar("T")
U = TypeVar("U")
V = TypeVar("V")


def pipe(value: T, *functions: Callable[[T], T]) -> T:
    """Compose functions left to right: f(g(h(x), ...) applied in order.

    Args:
        value: Initial input value.
        *functions: Callables to apply sequentially to the value.

    Returns:
        Final transformed value after applying all functions in order.
    """
    result = value
    for fn in functions:
        result = fn(result)
    return result


def curry(func: Callable) -> Callable:
    """Curry a function: convert multi-arg function into chain of single-arg calls.

    Usage:
        add = lambda x, y: x + y
        add5 = curry(add)(5)
        add5(3)  # returns 8
    """
    import inspect
    sig = inspect.signature(func)
    params = list(sig.parameters.keys())

    def curried(args=None):
        if args is None:
            args = []
        if len(args) == len(params):
            return func(*args)
        return lambda x: curried(args + [x])

    return curried


# Real-world pipeline example
def normalize_username(name: str) -> str:
    """Lowercase and strip whitespace from username."""
    return name.strip().lower()


def sanitize_username(name: str) -> str:
    """Remove non-alphanumeric characters except underscores."""
    import re
    return re.sub(r"[^a-z0-9_]", "", name)


def truncate_username(name: str, max_length: int = 30) -> str:
    """Truncate username to maximum length."""
    return name[:max_length]


# Build a composed pipeline — each function is independently testable
validate_username = lambda name: pipe(
    normalize_username(name),
    sanitize_username,
    lambda n: truncate_username(n, 30),
)

# Curried factory for reusable validation with custom limits
create_validator = curry(lambda max_len, text: truncate_username(text, max_len))
short_validator = create_validator(15)
```

---

### Pattern 4: Option / Maybe Pattern — Eliminating Null Checks

Use a typed `Option` type to represent values that may be absent. This forces callers to handle both presence and absence explicitly, eliminating the billion-dollar mistake of unchecked null/None dereferences. Based on Haskell's `Maybe` type and Scala's `Option`.

```python
from typing import Generic, TypeVar, Callable

T = TypeVar("T")


class Option(Generic[T]):
    """Typed Option type that forces explicit handling of absent values.

    Replace every `if x is not None` check with a structured match
    over Some(value) | Nothing. The compiler cannot bypass the pattern.
    """

    def __init__(self, value: T | None) -> None:
        self._value = value

    @classmethod
    def some(cls, value: T) -> "Option[T]":
        return cls(value)

    @classmethod
    def nothing(cls) -> "Option[T]":
        return cls(None)  # type: ignore[arg-type]

    def is_some(self) -> bool:
        return self._value is not None

    def is_nothing(self) -> bool:
        return self._value is None

    def get_or_else(self, default: T) -> T:
        return self._value if self.is_some() else default  # type: ignore[return-value]

    def map(self, fn: Callable[[T], U]) -> "Option[U]":
        return Option.some(fn(self._value)) if self.is_some() else Option.nothing()

    def flat_map(self, fn: Callable[[T], "Option[U]"]) -> "Option[U]":
        if self.is_some():
            return fn(self._value)  # type: ignore[type-arg, arg-type]
        return Option.nothing()

    def match(self, on_some: Callable[[T], T], on_nothing: Callable[[], T]) -> T:
        """Handle both cases explicitly — prevents forgotten None checks."""
        if self.is_some():
            return on_some(self._value)  # type: ignore[arg-type]
        return on_nothing()

    def __repr__(self) -> str:
        return f"Some({self._value})" if self.is_some() else "Nothing"


# ❌ BAD: unguarded None access — crashes at runtime
def get_user_email(user_id: int, db: dict) -> str:
    user = db.get("users", {}).get(user_id)  # could be None
    return user["email"]  # 💥 KeyError or TypeError if user is None


# ✅ GOOD: Option forces explicit handling at every step
def find_user(user_id: int, db: dict) -> Option[dict]:
    """Look up a user by ID. Returns Nothing if not found."""
    users = db.get("users", {})
    return Option.some(users[user_id]) if user_id in users else Option.nothing()


def get_user_email_safe(user_id: int, db: dict) -> Option[str]:
    """Safely retrieve email using Option chaining.

    None of the intermediate steps can leak None into the result.
    flat_map short-circuits on Nothing at any stage.
    """
    return (
        find_user(user_id, db)
        .flat_map(lambda user: Option.some(user.get("email", "")))
        .match(
            on_some=lambda email: f"Email: {email}",
            on_nothing=lambda: "User not found",
        )
    )


# Real-world usage: config lookup with defaults
def load_config(key: str, raw: dict[str, str]) -> Option[str]:
    return Option.some(raw[key]) if key in raw else Option.nothing()


config_value = (
    load_config("database_url", {"database_url": "postgres://localhost"})
    .match(
        on_some=lambda v: f"Connected to {v}",
        on_nothing=lambda: "Using default database URL",
    )
)
```

---

### Pattern 5: Either / Result Pattern — Typed Error Handling

Replace try/catch blocks for recoverable errors with `Either[Left, Right]`. The type system forces callers to handle both success and error cases. `Right` carries the successful value; `Left` carries the error (typically a string, exception, or domain error object).

```python
U = TypeVar("U")


class Either(Generic[T, U]):
    """Typed Either type for recoverable errors.

    Right(T) represents success. Left(E) represents an error.
    Callers must handle both branches — no silent failures.
    """

    def __init__(self, value: T | U, is_left: bool = False) -> None:
        self._is_left = is_left
        self._value = value  # type: ignore[assignment]

    @classmethod
    def left(cls, error: T) -> "Either[T, U]":
        return cls(error, is_left=True)

    @classmethod
    def right(cls, value: U) -> "Either[T, U]":
        return cls(value, is_left=False)

    def is_left(self) -> bool:
        return self._is_left

    def is_right(self) -> bool:
        return not self._is_left

    def map(self, fn: Callable[[U], V]) -> "Either[T, V]":
        if self.is_right():
            return Either.right(fn(self._value))  # type: ignore[arg-type]
        return Either.left(self._value)  # type: ignore[return-value, arg-type]

    def flat_map(self, fn: Callable[[U], "Either[T, U2]"]) -> "Either[T, U2]":
        if self.is_right():
            return fn(self._value)  # type: ignore[arg-type, type-var]
        return Either.left(self._value)  # type: ignore[return-value, arg-type]

    def get_or_else(self, default: U) -> U:
        return self._value if self.is_right() else default  # type: ignore[return-value]

    def match(
        self,
        on_right: Callable[[U], T],
        on_left: Callable[[T], T],
    ) -> T:
        if self.is_right():
            return on_right(self._value)  # type: ignore[arg-type]
        return on_left(self._value)  # type: ignore[arg-type, return-value]

    def __repr__(self) -> str:
        tag = "Left" if self._is_left else "Right"
        return f"{tag}({self._value})"


# ❌ BAD: try/catch for control flow — easy to swallow the wrong exception
def parse_and_validate_age(raw: str) -> int:
    try:
        age = int(raw)
        if age < 0 or age > 150:
            raise ValueError(f"Invalid age: {age}")
        return age
    except ValueError as e:
        return -1  # magic value — caller might not check


# ✅ GOOD: Either makes errors explicit and self-documenting
def parse_age(raw: str) -> Either[str, int]:
    """Parse and validate an age string. Returns Left with error message on failure."""
    try:
        age = int(raw)
    except ValueError:
        return Either.left(f"Not a number: {raw!r}")

    if age < 0:
        return Either.left(f"Age cannot be negative: {age}")
    if age > 150:
        return Either.left(f"Age exceeds maximum (150): {age}")
    return Either.right(age)


def lookup_user_by_age(age: int, users: list[dict]) -> Either[str, dict]:
    """Find first user matching exact age. Returns Left with error if not found."""
    matches = [u for u in users if u.get("age") == age]
    if not matches:
        return Either.left(f"No user found with age {age}")
    return Either.right(matches[0])


# Pipeline of Either operations — short-circuits on first error
def register_user(raw_age: str, raw_name: str, users: list[dict]) -> str:
    """Register a user. Fails fast with descriptive errors at any validation stage."""
    return (
        parse_age(raw_age)
        .flat_map(lambda age: lookup_user_by_age(age, users).map(lambda u: u["name"]))
        .match(
            on_right=lambda name: f"User {name} found for age {raw_age}",
            on_left=lambda err: f"Registration failed: {err}",
        )
    )


# Usage examples
result1 = register_user("25", "Alice", [{"age": 25, "name": "Alice"}])
# → "User Alice found for age 25"

result2 = register_user("abc", "Bob", [])
# → "Registration failed: Not a number: 'abc'"

result3 = register_user("200", "Charlie", [{"age": 25, "name": "Alice"}])
# → "Registration failed: Age exceeds maximum (150): 200"
```

---

### Pattern 6: Composable Data Pipelines

Build Unix-pipe-style data processing pipelines where each stage is a pure function that transforms the input and passes to the next stage. This creates declarative, testable chains with no shared mutable state between stages.

```python
from typing import Iterator


def pipeline(*steps: Callable) -> Callable:
    """Create a composable data processing pipeline from a sequence of functions.

    Each step receives the output of the previous step. The first argument
    to pipeline is the initial value or iterable.

    Args:
        *steps: Callables forming the transformation chain.

    Returns:
        A function that accepts input and runs it through all steps.

    Usage:
        process = pipeline(validate, transform, aggregate)
        result = process(raw_data)
    """
    def run(input_value):
        result = input_value
        for step in steps:
            result = step(result)
        return result
    return run


# Pipeline stages — each is independently testable

def extract_fields(record: dict) -> dict:
    """Extract relevant fields, dropping metadata."""
    return {k: record[k] for k in ("id", "value", "timestamp") if k in record}


def sanitize_value(value: float) -> float:
    """Clamp values to valid range and round."""
    clamped = max(0.0, min(value, 1e9))
    return round(clamped, 4)


def enrich_with_category(value: float) -> dict:
    """Add a derived category field based on value thresholds."""
    if value < 100:
        category = "low"
    elif value < 1000:
        category = "medium"
    else:
        category = "high"
    return {"category": category}


def deduplicate(items: list[dict]) -> list[dict]:
    """Remove duplicates by id, keeping first occurrence."""
    seen: set[int] = set()
    result: list[dict] = []
    for item in items:
        if item["id"] not in seen:
            seen.add(item["id"])
            result.append(item)
    return result


# Compose pipeline
process_records = pipeline(
    extract_fields,
    sanitize_value,
    enrich_with_category,
)

records_pipeline = pipeline(
    lambda items: [process_records(r) for r in items],
    deduplicate,
    sorted,
)

# Usage
raw_data = [
    {"id": 1, "value": -5.0, "timestamp": "2026-01-01", "meta": true},
    {"id": 2, "value": 500.0, "timestamp": "2026-01-02", "meta": false},
    {"id": 3, "value": 1e9 + 7, "timestamp": "2026-01-03", "meta": true},
    {"id": 1, "value": 10.0, "timestamp": "2026-01-04", "meta": false},
]

result = records_pipeline(raw_data)
# → [{"category": "high", "id": 1, "value": 0.0, ...}, {"category": "medium", ...}, ...]

```

---

## Constraints

### MUST DO

- Keep pure functions free of I/O, global state reads, and mutable side effects — push impure operations to the boundaries
- Return `Option[T]` from any function that may not find a result — never return bare `None` for domain logic
- Use `Either[Error, T]` for all recoverable errors in the core — callers must handle both `Left` and `Right` branches explicitly
- Compose functions via `pipe()` or method chaining instead of nesting calls more than two levels deep
- Write type hints on every function signature and include docstrings describing preconditions and return values
- Design each pipeline stage as a single-responsibility pure function — if a step does multiple things, split it

### MUST NOT DO

- Call external APIs, read files, or access databases from inside pure functions — this breaks referential transparency
- Use `assert` statements for input validation in the core — use Option/Either return types instead to make failures explicit
- Mutate function arguments in place — always produce new values/objects
- Chain more than three nested `Option.map().map().map()` calls without refactoring into named intermediate functions
- Return bare exceptions from pure code paths — all errors must flow through `Either` or Option's Nothing variant
- Use lambda chains longer than one line — if a lambda needs explanation, write a named function

---

## Related Skills

| Skill | Purpose |
|---|---|
| `immutable-data-patterns` | Deep dive into immutable data structures and persistent collections |
| `software-error-handling` | Broader error handling strategies including Either, Result, and error monads |
| `dependency-inversion-principle` | How to wire impure boundary layers (I/O) with pure core logic via dependency injection |

---

## Live References

> Authoritative documentation for functional programming principles and Python patterns.

- [Python typing documentation](https://docs.python.org/3/library/typing.html) — Type hints, generics, Callable
- [Haskell Maybe type reference](https://hackage.haskell.org/package/base/docs/Data-Maybe.html) — The original Maybe/Option type
- [Scala Option API reference](https://www.scala-lang.org/api/current/scala/Option.html) — Option flatMap and composition patterns
- [Python functools documentation](https://docs.python.org/3/library/functools.html) — reduce, partial, lru_cache for FP patterns
- [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/) — Monoids, functors, natural transformations
