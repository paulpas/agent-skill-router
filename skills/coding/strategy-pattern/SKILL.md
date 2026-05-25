---
name: strategy-pattern
description: Implements the Strategy design pattern for runtime algorithm selection with interchangeable behavior interfaces, supporting context delegation, strategy factories, and dependency injection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: strategy pattern, algorithm selection, runtime behavior, interchangeable algorithms, context delegation, polymorphic behavior, open closed principle, replace if elif chain, payment processing strategy, pricing strategy
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
    - simple utility function
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: behavioral-design-patterns, dependency-inversion-principle, creational-design-patterns, design-patterns-architecture
---

# Strategy Pattern (Behavioral GoF)

Implements the Strategy pattern to encapsulate interchangeable algorithms behind a common interface, allowing runtime selection and composition of behaviors. This skill makes the model replace brittle `if/elif/else` chains with clean, open/closed-compliant strategy hierarchies where new algorithms can be added without modifying existing code — directly applying the Open/Closed Principle and Dependency Inversion Principle from SOLID.

## TL;DR Checklist

- [ ] Identify a single responsibility that varies across multiple concrete algorithms
- [ ] Define a `Protocol` or `ABC` interface with only the methods callers actually need
- [ ] Extract each algorithm variant into its own class implementing the strategy interface
- [ ] Create a Context class that holds a reference to the strategy and delegates all work through it
- [ ] Replace `if/elif/else` or `match/case` algorithm selectors with strategy composition
- [ ] Add a StrategyFactory for configuration-driven selection (or use direct dependency injection)
- [ ] Ensure strategies are stateless and independently testable — no cross-strategy dependencies

---

## When to Use

Use the Strategy pattern when:

- You have multiple algorithms solving the same problem (pricing, sorting, validation, routing) and need to select one at runtime based on configuration, user choice, or contextual data
- An `if/elif/else` or `match/case` chain is growing beyond 3–4 branches, making additions require modifying existing code (violating Open/Closed Principle)
- Different algorithms have different testability or performance requirements and need to be swapped without affecting the caller
- You want to apply dependency injection — passing a strategy via constructor so the context remains decoupled from any specific algorithm
- A class has behavior that depends on external criteria rather than internal state (distinguish from State pattern, where behavior depends on the object's own lifecycle)

---

## When NOT to Use

Avoid this skill for:

- Simple one-off calculations or utility functions — a regular function is simpler and requires less boilerplate
- Only two algorithm variants with trivial differences — an `if/else` with clear guard clauses may be cleaner than full Strategy classes
- Behavior that changes based on the object's internal lifecycle state — use the State pattern instead, where strategy choice depends on internal transitions
- Cases where all algorithms are called in sequence for each request — use Chain of Responsibility instead
- When you only need to create objects but not vary their behavior — use a Factory or Builder pattern

---

## Core Workflow

1. **Identify the varying responsibility** — Find the method or computation that differs across scenarios. The changing part should be extractable into its own interface with clear inputs and outputs. **Checkpoint:** Can you describe the variation in one sentence? ("We compute shipping cost differently for domestic vs international orders.")

2. **Define the strategy interface first** — Create a `Protocol` or `ABC` that captures only what the Context needs to call. Resist adding methods that convenience implementations might want; that violates Interface Segregation. **Checkpoint:** The interface should be minimal — every method must be called by at least one caller in the Context.

3. **Implement each concrete strategy** — Write one class per algorithm variant. Strategies must be stateless, independently testable, and free of dependencies on other strategies. Each implementation should contain only the logic unique to that algorithm. **Checkpoint:** Can you unit-test this strategy in isolation with no mock setup beyond its inputs?

4. **Build the Context** — Create a class that holds a reference to the strategy interface and delegates all relevant work to it. The Context should never know about concrete strategies — only the interface. Inject the strategy via constructor (not setter) when possible for immutability. **Checkpoint:** If you remove all concrete strategy classes from your test suite, the Context still compiles and its interface contract is validated by type checking alone.

5. **Wire at the composition root** — Instantiate the correct concrete strategy where the Context is constructed, driven by configuration or runtime criteria. Use a StrategyFactory when selection logic is non-trivial (e.g., reading from config files, environment variables, or feature flags).

6. **Write regression tests for each strategy** — Test every concrete strategy independently with boundary cases and edge inputs. Test the Context delegates correctly to whatever strategy it receives.

---

## BAD vs. GOOD: Strategy Replacing Conditional Logic

### ❌ BAD: Growing if/elif Chain

```python
class OrderProcessor:
    """Processes orders using conditional branching — violates Open/Closed Principle.
    
    Adding a new payment type requires modifying this class, breaking OCP.
    No strategy can be tested independently. New branches add cyclomatic complexity.
    """

    def process_payment(
        self,
        order_total: float,
        payment_type: str,
        currency: str = "USD",
    ) -> dict[str, float]:
        if payment_type == "credit_card":
            fee = order_total * 0.029 + 0.30  # Stripe-like pricing
            tax = self._calculate_tax(order_total - fee, currency)
            return {"fee": round(fee, 2), "tax": round(tax, 2), "total": round(order_total - fee + tax, 2)}

        elif payment_type == "paypal":
            fee = order_total * 0.034  # PayPal rate is higher
            tax = self._calculate_tax(order_total - fee, currency)
            return {"fee": round(fee, 2), "tax": round(tax, 2), "total": round(order_total - fee + tax, 2)}

        elif payment_type == "crypto":
            fee = order_total * 0.01  # Crypto has lowest fees
            # No tax on crypto in most jurisdictions
            return {"fee": round(fee, 2), "tax": 0.0, "total": round(order_total - fee, 2)}

        elif payment_type == "bank_transfer":
            fee = 5.00 if order_total < 10_000 else 0.0  # Flat fee
            tax = self._calculate_tax(order_total - fee, currency)
            return {"fee": round(fee, 2), "tax": round(tax, 2), "total": round(order_total - fee + tax, 2)}

        else:
            raise ValueError(f"Unsupported payment type: {payment_type}")

    def _calculate_tax(self, amount: float, currency: str) -> float:
        rates = {"USD": 0.08, "EUR": 0.20, "GBP": 0.20}
        return round(amount * rates.get(currency, 0.05), 2)

    def process_order(self, order_total: float, payment_type: str, currency: str = "USD") -> dict:
        result = self.process_payment(order_total, payment_type, currency)
        result["payment_type"] = payment_type
        return result
```

**Problems:** Every new payment type requires editing this file. Violates Open/Closed Principle. Impossible to test a single payment algorithm in isolation. Cyclomatic complexity grows linearly with each variant.

### ✅ GOOD: Strategy-Based Design

```python
from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PaymentResult:
    """Immutable result of a payment processing strategy."""
    fee: float
    tax: float
    total: float
    currency: str
    metadata: dict[str, str] | None = None


class PaymentStrategy(Protocol):
    """Interface defining the contract for all payment processing strategies.

    Strategies must compute fees, taxes, and net totals independently.
    They are stateless — no instance variables that change during execution.
    """

    def process(self, amount: float, currency: str) -> PaymentResult: ...


class CreditCardPayment:
    """Processes payments via credit card with standard interchange fees.
    
    Typical fee structure: 2.9% + $0.30 per transaction (Stripe-like pricing).
    Applies regional tax rates to the post-fee amount.
    """

    INTERCHANGE_RATE = 0.029
    FIXED_FEE = 0.30

    def process(self, amount: float, currency: str) -> PaymentResult:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        fee = amount * self.INTERCHANGE_RATE + self.FIXED_FEE
        post_fee = amount - fee
        tax = round(post_fee * self._tax_rate(currency), 2)
        total = round(post_fee + tax, 2)

        return PaymentResult(
            fee=round(fee, 2),
            tax=tax,
            total=total,
            currency=currency,
            metadata={"method": "credit_card", "rate": str(self.INTERCHANGE_RATE)},
        )

    @staticmethod
    def _tax_rate(currency: str) -> float:
        rates = {"USD": 0.08, "EUR": 0.20, "GBP": 0.20}
        return rates.get(currency, 0.05)


class PayPalPayment:
    """Processes payments via PayPal with their standard fee structure."""

    PAYPAL_RATE = 0.034

    def process(self, amount: float, currency: str) -> PaymentResult:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        fee = round(amount * self.PAYPAL_RATE, 2)
        post_fee = amount - fee
        tax = round(post_fee * CreditCardPayment._tax_rate(currency), 2)
        total = round(post_fee + tax, 2)

        return PaymentResult(
            fee=fee,
            tax=tax,
            total=total,
            currency=currency,
            metadata={"method": "paypal", "rate": str(self.PAYPAL_RATE)},
        )


class CryptoPayment:
    """Processes cryptocurrency payments with minimal fees.

    Crypto typically has the lowest transaction costs (~1%) and
    is often tax-exempt in most jurisdictions.
    """

    CRYPTO_RATE = 0.01

    def process(self, amount: float, currency: str) -> PaymentResult:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        fee = round(amount * self.CRYPTO_RATE, 2)
        total = round(amount - fee, 2)

        return PaymentResult(
            fee=fee,
            tax=0.0,
            total=total,
            currency=currency,
            metadata={
                "method": "crypto",
                "rate": str(self.CRYPTO_RATE),
                "tax_exempt": "true",
            },
        )


class BankTransferPayment:
    """Processes ACH/wire transfers with flat-fee pricing."""

    SMALL_TRANSFER_FEE = 5.00
    LARGE_THRESHOLD = 10_000.0

    def process(self, amount: float, currency: str) -> PaymentResult:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        fee = self.SMALL_TRANSFER_FEE if amount < self.LARGE_THRESHOLD else 0.0
        post_fee = amount - fee
        tax = round(post_fee * CreditCardPayment._tax_rate(currency), 2)
        total = round(post_fee + tax, 2)

        return PaymentResult(
            fee=fee,
            tax=tax,
            total=total,
            currency=currency,
            metadata={"method": "bank_transfer", "threshold": str(self.LARGE_THRESHOLD)},
        )


class OrderProcessor:
    """Context class that delegates payment processing to a Strategy.

    The context depends only on the PaymentStrategy protocol — it never
    imports or references concrete strategy classes. New payment types
    can be added without modifying this class (Open/Closed Principle).
    
    Strategies are injected via constructor for immutability and
    explicit dependency declaration. Use setter for runtime swapping,
    but prefer constructor injection when the strategy is fixed per lifetime.
    """

    def __init__(self, strategy: PaymentStrategy) -> None:
        self._strategy = strategy

    @property
    def strategy(self) -> PaymentStrategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: PaymentStrategy) -> None:
        """Swap strategy at runtime — useful for A/B testing or config reloads."""
        self._strategy = strategy

    def process_payment(self, amount: float, currency: str = "USD") -> PaymentResult:
        """Process a payment by delegating to the current strategy.

        Args:
            amount: Transaction amount in the specified currency.
            currency: ISO 4217 currency code (default: USD).

        Returns:
            PaymentResult with computed fee, tax, and total.

        Raises:
            ValueError: If the strategy rejects the inputs (e.g., non-positive amount).
        """
        return self._strategy.process(amount, currency)


# ── Strategy Factory for Configuration-Driven Selection ───────────

PaymentType = str  # Literal alias: "credit_card", "paypal", "crypto", "bank_transfer"

PAYMENT_STRATEGY_MAP: dict[PaymentType, type[PaymentStrategy]] = {
    "credit_card": CreditCardPayment,
    "paypal": PayPalPayment,
    "crypto": CryptoPayment,
    "bank_transfer": BankTransferPayment,
}


class PaymentStrategyFactory:
    """Factory that resolves a strategy name to a concrete implementation.

    Centralizes strategy selection logic so the Context remains unaware of
    mapping tables or configuration parsing. This is useful when strategy
    choice comes from config files, environment variables, or feature flags.
    """

    @staticmethod
    def create(payment_type: PaymentType) -> PaymentStrategy:
        """Instantiate a payment strategy by type name.

        Args:
            payment_type: Identifier string matching a registered strategy.

        Returns:
            A new instance of the requested concrete strategy.

        Raises:
            ValueError: If the payment_type is not registered in the factory.
        """
        strategy_class = PAYMENT_STRATEGY_MAP.get(payment_type)
        if strategy_class is None:
            available = ", ".join(sorted(PAYMENT_STRATEGY_MAP.keys()))
            raise ValueError(
                f"Unknown payment type '{payment_type}'. "
                f"Available: {available}"
            )
        return strategy_class()


# ── Usage Examples ────────────────────────────────────────────────

if __name__ == "__main__":
    # 1. Constructor injection — strategy chosen at composition root
    processor = OrderProcessor(CreditCardPayment())
    result = processor.process_payment(100.0, "USD")
    print(f"Credit card: fee=${result.fee:.2f}, tax=${result.tax:.2f}, total=${result.total:.2f}")

    # 2. Runtime strategy swap — change behavior without rebuilding context
    processor.strategy = PayPalPayment()
    result = processor.process_payment(100.0, "USD")
    print(f"PayPal:      fee=${result.fee:.2f}, tax=${result.tax:.2f}, total=${result.total:.2f}")

    # 3. Factory-based selection — strategy name from configuration
    factory = PaymentStrategyFactory()
    config_type = "crypto"
    processor.strategy = factory.create(config_type)
    result = processor.process_payment(100.0, "USD")
    print(f"Crypto:      fee=${result.fee:.2f}, tax=${result.tax:.2f}, total=${result.total:.2f}")

    # 4. Direct instantiation — simplest case when only one strategy is ever used
    crypto_processor = OrderProcessor(CryptoPayment())
    result = crypto_processor.process_payment(500.0, "EUR")
    print(f"Crypto EUR:  fee=${result.fee:.2f}, tax=${result.tax:.2f}, total=${result.total:.2f}")
```

---

## Real-World Application Patterns

### Pattern A: Pricing Calculators

Use Strategy for pricing models that vary by customer tier, region, or promotional period. Each strategy encapsulates its discount logic, and the context (checkout service) delegates transparently.

```python
@dataclass(frozen=True)
class PriceQuote:
    """Immutable price calculation result."""
    base_price: float
    discount_amount: float
    final_price: float
    currency: str


class PricingStrategy(abc.ABC):
    """Abstract pricing strategy — each variant computes its own discount logic."""

    @abc.abstractmethod
    def compute_discount(self, base_price: float) -> float: ...

    def calculate(self, base_price: float, currency: str = "USD") -> PriceQuote:
        discount = self.compute_discount(base_price)
        return PriceQuote(
            base_price=base_price,
            discount_amount=round(discount, 2),
            final_price=round(base_price - discount, 2),
            currency=currency,
        )


class FlatRateDiscount(PricingStrategy):
    """Fixed percentage discount for all customers."""

    def __init__(self, rate: float) -> None:
        if not 0 <= rate <= 1:
            raise ValueError(f"Discount rate must be 0-1, got {rate}")
        self.rate = rate

    def compute_discount(self, base_price: float) -> float:
        return base_price * self.rate


class TieredPricing(PricingStrategy):
    """Volume-based tiered discounts — higher order value gets deeper discount."""

    TIERS: list[tuple[float, float]] = [
        (50_000, 0.30),  # $50k+ → 30% off
        (20_000, 0.20),  # $20k+ → 20% off
        (5_000, 0.10),   # $5k+  → 10% off
        (0, 0.0),        # Base rate
    ]

    def compute_discount(self, base_price: float) -> float:
        for threshold, rate in self.TIERS:
            if base_price >= threshold:
                return base_price * rate
        return 0.0


class MembersPricing(PricingStrategy):
    """Member pricing: flat 10% discount on all orders."""

    MEMBER_RATE = 0.10

    def compute_discount(self, base_price: float) -> float:
        return base_price * self.MEMBER_RATE
```

### Pattern B: Validation Rule Chains

Use Strategy to encapsulate different validation approaches — regex-based, schema-based, or custom business-rule validation. Each validator is independently testable and swappable.

```python
class Validator(abc.ABC):
    """Abstract validation strategy — each variant defines its own rules."""

    @abc.abstractmethod
    def validate(self, value: str) -> tuple[bool, str]: ...


class RegexValidator(Validator):
    """Validates input against a compiled regex pattern."""

    def __init__(self, pattern: str, error_message: str = "Input does not match required format") -> None:
        import re
        self.pattern = re.compile(pattern)
        self.error_message = error_message

    def validate(self, value: str) -> tuple[bool, str]:
        if self.pattern.fullmatch(value):
            return True, ""
        return False, self.error_message


class MinLengthValidator(Validator):
    """Validates that a string meets a minimum length requirement."""

    def __init__(self, min_length: int) -> None:
        self.min_length = min_length

    def validate(self, value: str) -> tuple[bool, str]:
        if len(value) >= self.min_length:
            return True, ""
        return False, f"Must be at least {self.min_length} characters (got {len(value)})"


class EnumValidator(Validator):
    """Validates that a value belongs to an allowed set of options."""

    def __init__(self, allowed: set[str], field_name: str = "field") -> None:
        self.allowed = allowed
        self.field_name = field_name

    def validate(self, value: str) -> tuple[bool, str]:
        if value in self.allowed:
            return True, ""
        return False, f"{self.field_name} must be one of: {', '.join(sorted(self.allowed))}"


# Context that accepts any Validator strategy
class FieldValidator:
    """Validates a field by delegating to injected validation strategies."""

    def __init__(self, *validators: Validator) -> None:
        self._validators = validators

    def validate(self, value: str) -> bool:
        for validator in self._validators:
            ok, message = validator.validate(value)
            if not ok:
                print(f"  FAIL: {message}")
                return False
        return True


# Usage
field = FieldValidator(
    MinLengthValidator(3),
    EnumValidator({"active", "inactive", "pending"}, field_name="status"),
)
print(field.validate("active"))  # True
print(field.validate("x"))       # FAIL: Must be at least 3 characters (got 1)
```

### Pattern C: Sorting Algorithms

Use Strategy when the caller needs to choose between sorting approaches — quicksort, mergesort, or a domain-specific comparison. Each strategy is a self-contained sorting implementation.

```python
import functools
from typing import Callable, TypeVar

T = TypeVar("T")


class SortStrategy(abc.ABC):
    """Abstract sorting strategy — defines the contract for order comparisons."""

    @abc.abstractmethod
    def sort(self, data: list[T], key: Callable[[T], float] | None = None) -> list[T]: ...


class QuickSortStrategy(SortStrategy):
    """In-place quicksort with median-of-three pivot selection."""

    def sort(self, data: list[T], key: Callable[[T], float] | None = None) -> list[T]:
        result = data.copy()

        def _quicksort(items: list[T], low: int, high: int) -> None:
            if low >= high:
                return
            pivot_idx = self._median_of_three(items, low, high, key)
            pivot_idx = self._partition(items, low, high, pivot_idx, key)
            _quicksort(items, low, pivot_idx - 1)
            _quicksort(items, pivot_idx + 1, high)

        def _median_of_three(
            items: list[T], low: int, high: int, key: Callable[[T], float] | None
        ) -> int:
            mid = (low + high) // 2
            a, b, c = items[low], items[mid], items[high]
            ka, kb, kc = (key(x) if key else x for x in (a, b, c))
            # Return index of median element
            if ka <= kb <= kc or kc <= kb <= ka:
                return mid
            elif kb <= ka <= kc or kc <= ka <= kb:
                return low
            else:
                return high

        def _partition(
            items: list[T], low: int, high: int, pivot_idx: int, key: Callable[[T], float] | None
        ) -> int:
            pivot = items[pivot_idx]
            pk = key(pivot) if key else pivot
            items[pivot_idx], items[high] = items[high], items[pivot_idx]
            store = low
            for i in range(low, high):
                xi = key(items[i]) if key else items[i]
                if xi <= pk:
                    items[store], items[i] = items[i], items[store]
                    store += 1
            items[store], items[high] = items[high], items[store]
            return store

        _quicksort(result, 0, len(result) - 1)
        return result


class StableSortStrategy(SortStrategy):
    """Wrapper around Python's built-in stable Timsort."""

    def sort(self, data: list[T], key: Callable[[T], float] | None = None) -> list[T]:
        return sorted(data, key=key) if key else sorted(data)


# Usage — Context delegates sorting strategy
class DataSorter:
    """Sorts data using whatever strategy the caller injects."""

    def __init__(self, strategy: SortStrategy) -> None:
        self._strategy = strategy

    def sort(self, data: list[T], key: Callable[[T], float] | None = None) -> list[T]:
        return self._strategy.sort(data, key=key)
```

---

## Common Anti-Patterns to Avoid

### 1. Overusing Strategy for Trivial Differences

Don't create a full strategy class when the difference between two algorithms is a single line of code. A simple `if/else` with clear guard clauses is more maintainable than three classes (interface + 2 implementations) for one-line differences. The threshold is roughly: if the algorithm body is more than 10 lines or has internal branching, extract it to a strategy.

### 2. Strategies That Know About Each Other

Each strategy must be completely self-contained and independent. If `CreditCardPayment` needs to call methods on `PayPalPayment`, you've introduced a dependency that breaks the pattern's core benefit — strategies should be swappable without understanding each other's internals.

### 3. Stateful Strategies

Strategies should not hold mutable instance state that changes during execution. They are value transformers: same inputs always produce same outputs. If you need state, it belongs in the Context, not in the strategy itself. (Exception: strategies may hold configuration constants set at construction time, like rates or thresholds.)

### 4. Strategy Explosion

Creating a new strategy class for every minor variant of an algorithm indicates poor abstraction boundaries. Ask whether the variants share enough logic that parameterization (passing configuration to a single strategy) would be cleaner than separate classes. A good heuristic: if two strategies share more than 60% of their code, consider consolidating with a parameterized approach instead.

### 5. Using Context as a God Object

The Context should only delegate — it should not contain business logic that duplicates what the strategy computes. If `OrderProcessor.process_payment()` recalculates tax after calling the strategy, you have duplicated logic in both places. The strategy owns the calculation; the context owns the orchestration and side effects (logging, persistence).

---

## Constraints

### MUST DO
- Define the strategy interface using `typing.Protocol` or `abc.ABC` — never a bare `interface` concept without type enforcement
- Keep strategies stateless — no mutable instance attributes that change during execution; accept all inputs as method parameters
- Inject strategies via constructor for immutability, use setter only when runtime swapping is explicitly required
- Test each concrete strategy in complete isolation — no mocks needed, just direct instantiation with test inputs
- Use `dataclasses(frozen=True)` for result DTOs that flow between strategies and contexts
- Name the context class descriptively around its responsibility (`OrderProcessor`, not `Handler` or `Manager`)
- Document what each strategy does in its docstring — future readers should understand the algorithm without reading the code

### MUST NOT DO
- Put cross-strategy logic inside a strategy class — strategies must be independently swappable with no awareness of siblings
- Create strategies with fewer than ~10 lines of unique logic per variant — prefer parameterization for trivial differences
- Use Strategy when the behavior depends on the object's internal lifecycle state — use State pattern instead
- Make the Context responsible for selecting concrete strategies — that belongs in a Factory or composition root
- Add methods to the strategy interface just because some implementations happen to need them — violate Interface Segregation
- Let strategies mutate shared global state (databases, file systems) — they should be pure computations

---

## Output Template

When this skill is active, produce:

1. **Interface definition** — `Protocol` or `ABC` with minimal method signatures and type hints
2. **Each concrete strategy** — Separate class per algorithm variant, with docstring explaining the algorithm, typed parameters, return values, and error conditions
3. **Context class** — Holds strategy reference, delegates all work, with constructor injection and optional runtime setter
4. **StrategyFactory (if applicable)** — Centralized selection logic mapping configuration keys to concrete strategies
5. **BAD vs GOOD comparison** — Show the `if/elif` chain being replaced and the resulting strategy-based refactor
6. **Usage examples** — At least one showing constructor injection, one showing runtime swapping

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `behavioral-design-patterns` | Broader catalog of behavioral patterns including Strategy, State, Command, Observer — use for pattern selection guidance |
| `dependency-inversion-principle` | Applies DIP to ensure abstractions (interfaces) are the dependency direction — complements Strategy by ensuring Context depends only on the strategy interface |
| `creational-design-patterns` | Factory and Builder patterns that often pair with Strategy for runtime instantiation of strategies |
| `design-patterns-architecture` | Higher-level pattern selection guide for choosing among GoF patterns based on problem characteristics |

---

## Live References

> Authoritative documentation links for the Strategy pattern and SOLID principles.

- [GoF Design Patterns — Behavioral Category](https://refactoring.guru/design-patterns/strategy)
- [SOLID Principles (Robert C. Martin)](https://solid.io/)
- [Python typing.Protocol documentation](https://docs.python.org/3/library/typing.html#typing.Protocol)
- [Refactoring Guru: Strategy Pattern](https://refactoring.guru/design-patterns/strategy/python/example)
- [Effective Python — Item 15: Consider Using Protocols Instead of Abstract Base Classes](https://www.youtube.com/watch?v=MSzVfK2a7sc)