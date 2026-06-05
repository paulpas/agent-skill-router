---




name: factory-method
description: Implements the GoF Factory Method pattern for polymorphic object creation in Python using ABC-based factories, registration decorators, and type dispatch to replace if/elif chains with extensible factory hierarchies.
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
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: factory method pattern, object creation factory, type-based instantiation, abstract factory vs factory method, how do i create objects dynamically, polymorphic constructors, factory registry
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: builder-pattern, creational-design-patterns, strategy-pattern, dependency-inversion-principle




---





# Factory Method Pattern

Senior Python engineer implementing the Factory Method pattern to encapsulate object creation logic behind polymorphic factory interfaces. This skill makes the model replace brittle if/elif type-dispatch chains with extensible ABC-based factories that allow subclasses to decide which concrete class to instantiate without the caller knowing concrete types.

## TL;DR Checklist

- [ ] Define an ABC for the product interface with all required methods
- [ ] Create a factory ABC with an abstract `create()` method returning the product type
- [ ] Implement concrete factories as subclasses of the factory ABC
- [ ] Use registration decorators to auto-discover factory variants without manual imports
- [ ] Ensure caller code depends only on product and factory ABCs, never concrete classes

---

## When to Use

Use this skill when:

- You have multiple concrete types that share a common interface but require different construction logic
- Your creation code is cluttered with `if/elif` type checks that grow unboundedly as new types are added
- You need to let subclasses (or external modules) inject new product variants without modifying existing factory code
- You want to centralize object lifecycle management (initialization, validation, registration) in one place
- You are building a plugin system where new product types can be registered dynamically at runtime

---

## When NOT to Use

Avoid this skill for:

- Simple object creation with no variation — use direct `__init__` calls instead
- Creating immutable objects with identical construction across all variants (use Prototype or dataclasses)
- Complex multi-step construction requiring many optional parameters (use Builder pattern instead)
- When you need to create families of related objects rather than a single product family (use Abstract Factory)

---

## Core Workflow

1. **Define the Product ABC** — Create an abstract base class defining the interface all products must implement. Include `@abstractmethod` for all required methods. **Checkpoint:** Every concrete product must implement every abstract method; use `typing.Protocol` if you prefer duck-typing over inheritance.

2. **Define the Factory ABC** — Create an abstract base class with an abstract `create()` method (or similar) that returns a product instance. The factory ABC declares the creation contract without specifying concrete types. **Checkpoint:** The factory's return type should be the product ABC, not a concrete implementation.

3. **Implement Concrete Products** — Create concrete classes implementing the product ABC. Each represents one variant of the created object with its own behavior. **Checkpoint:** Verify each concrete product passes duck-typing against the product ABC using `isinstance()` checks in tests.

4. **Implement Concrete Factories** — For each concrete product, create a factory subclass that instantiates and returns the corresponding product. Each factory encapsulates one creation path. **Checkpoint:** The factory should not leak concrete types into caller code; always return via the product ABC interface.

5. **Add Registration Mechanism** — Implement a registry using module-level `dict` or `typing.Literal` mapping that maps type identifiers to factory classes. Use `functools.singledispatch` or custom decorators for auto-discovery. **Checkpoint:** New factory variants should register themselves automatically via decorator; no manual registration code needed.

6. **Wire the Type Dispatch** — Provide a lookup function that receives a type identifier and returns the appropriate factory, then calls its `create()` method. **Checkpoint:** Lookup must raise a descriptive error for unknown types rather than returning None silently.

---

## Implementation Patterns

### Pattern 1: ABC-Based Factory Method (Core Structure)

This is the canonical GoF Factory Method in Python using the `abc` module. The factory ABC declares the creation contract, and subclasses decide which concrete product to instantiate.

```python
from abc import ABC, abstractmethod
import json


# Product ABC
class PaymentProcessor(ABC):
    """Abstract base class defining the payment processing interface."""

    @abstractmethod
    def process_payment(self, amount: float, currency: str) -> dict:
        """Process a payment and return transaction details.

        Args:
            amount: Positive numeric amount to charge.
            currency: ISO 4217 currency code (e.g., 'USD', 'EUR').

        Returns:
            Dict with keys: transaction_id, status, fee.
        """
        ...

    @abstractmethod
    def supports_currency(self, currency: str) -> bool:
        """Check if this processor can handle the given currency."""
        ...


# Concrete Products
class StripeProcessor(PaymentProcessor):
    """Processes payments via Stripe API."""

    def __init__(self, api_key: str, webhook_url: str | None = None) -> None:
        self.api_key = api_key
        self.webhook_url = webhook_url
        self._supported_currencies = {"USD", "EUR", "GBP", "CAD"}

    def process_payment(self, amount: float, currency: str) -> dict:
        if not self.supports_currency(currency):
            raise ValueError(f"Stripe does not support {currency}")
        return {
            "transaction_id": f"stripe_{hash((amount, currency))}",
            "status": "completed",
            "fee": round(amount * 0.029 + 0.30, 2),
        }

    def supports_currency(self, currency: str) -> bool:
        return currency in self._supported_currencies


class PayPalProcessor(PaymentProcessor):
    """Processes payments via PayPal API."""

    def __init__(self, client_id: str, client_secret: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self._supported_currencies = {"USD", "EUR", "JPY"}

    def process_payment(self, amount: float, currency: str) -> dict:
        if not self.supports_currency(currency):
            raise ValueError(f"PayPal does not support {currency}")
        return {
            "transaction_id": f"paypal_{hash((amount, currency))}",
            "status": "completed",
            "fee": round(amount * 0.034 + 0.49, 2),
        }

    def supports_currency(self, currency: str) -> bool:
        return currency in self._supported_currencies


class CryptoProcessor(PaymentProcessor):
    """Processes payments via cryptocurrency (on-chain)."""

    def __init__(self, network: str = "mainnet") -> None:
        self.network = network

    def process_payment(self, amount: float, currency: str) -> dict:
        return {
            "transaction_id": f"tx_{hash((amount, currency, self.network))}",
            "status": "pending_confirmation",
            "fee": 0.00,
        }

    def supports_currency(self, currency: str) -> bool:
        return currency.upper() in {"BTC", "ETH", "USDC"}


# Factory ABC
class PaymentProcessorFactory(ABC):
    """Abstract factory that creates payment processor instances."""

    @abstractmethod
    def create_processor(self, **config: object) -> PaymentProcessor:
        """Create and return a configured payment processor.

        Args:
            **config: Provider-specific configuration (api_key, client_id, etc.).

        Returns:
            A configured PaymentProcessor instance.

        Raises:
            NotImplementedError: If the provider type is not supported.
        """
        ...


# Concrete Factory
class StripeFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return StripeProcessor(
            api_key=config.get("api_key", ""),
            webhook_url=config.get("webhook_url"),
        )


class PayPalFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return PayPalProcessor(
            client_id=config.get("client_id", ""),
            client_secret=config.get("client_secret", ""),
        )


class CryptoFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return CryptoProcessor(network=config.get("network", "mainnet"))
```

### Pattern 2: Registration Decorator for Auto-Discovery (BAD vs. GOOD)

The BAD approach uses manual registration that must be updated every time a new processor is added. The GOOD approach uses a decorator for zero-touch auto-discovery.

```python
# ❌ BAD — Manual registry requires updating when adding new types
PROVIDER_REGISTRY: dict[str, type[PaymentProcessorFactory]] = {
    "stripe": StripeFactory,
    "paypal": PayPalFactory,
}  # Forgot to add crypto? Now a silent runtime error.


def create_processor_manual(provider: str, **config: object) -> PaymentProcessor:
    factory_cls = PROVIDER_REGISTRY.get(provider)
    if factory_cls is None:
        raise LookupError(
            f"Unknown provider '{provider}'. "
            f"Available: {list(PROVIDER_REGISTRY.keys())}"
        )
    return factory_cls().create_processor(**config)


# ✅ GOOD — Registration decorator provides auto-discovery
_PROVIDER_REGISTRY: dict[str, type[PaymentProcessorFactory]] = {}


def register_provider(name: str):
    """Class decorator that auto-registers a PaymentProcessorFactory subclass."""

    def decorator(cls: type[PaymentProcessorFactory]) -> type[PaymentProcessorFactory]:
        _PROVIDER_REGISTRY[name] = cls
        return cls

    return decorator


@register_provider("stripe")
class StripeAutoFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return StripeProcessor(
            api_key=config.get("api_key", ""),
            webhook_url=config.get("webhook_url"),
        )


@register_provider("paypal")
class PayPalAutoFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return PayPalProcessor(
            client_id=config.get("client_id", ""),
            client_secret=config.get("client_secret", ""),
        )


@register_provider("crypto")
class CryptoAutoFactory(PaymentProcessorFactory):
    def create_processor(self, **config: object) -> PaymentProcessor:
        return CryptoProcessor(network=config.get("network", "mainnet"))


def create_processor_auto(provider: str, **config: object) -> PaymentProcessor:
    """Create a processor using the auto-discovery registry.

    Args:
        provider: Provider name registered via @register_provider decorator.
        **config: Provider-specific configuration.

    Returns:
        A configured PaymentProcessor instance.

    Raises:
        LookupError: If provider is not registered.
    """
    factory_cls = _PROVIDER_REGISTRY.get(provider)
    if factory_cls is None:
        raise LookupError(
            f"Unknown provider '{provider}'. "
            f"Available: {list(_PROVIDER_REGISTRY.keys())}"
        )
    return factory_cls().create_processor(**config)


# Usage — no manual registry updates needed:
# processor = create_processor_auto("stripe", api_key="sk_test_...")
```

### Pattern 3: TypeVar Generic Factory (Modern Python)

For strongly-typed factories where each factory produces a specific concrete product type, use `typing.TypeVar` to preserve type information through the factory method.

```python
from typing import TypeVar, Protocol, Any


# Strictly typed product protocol (duck-typing alternative to ABC)
class Drawable(Protocol):
    """Protocol for any object that can render itself."""

    def draw(self, ctx: Any) -> None: ...
    def bounds(self) -> tuple[float, float, float, float]: ...


T = TypeVar("T", bound=Drawable)


# Generic factory using TypeVar — preserves concrete type in return annotation
class ShapeFactory(ABC):
    """Generic shape factory that produces Drawable shapes."""

    @abstractmethod
    def create(self, **params: Any) -> T: ...


class CircleFactory(ShapeFactory["Circle"]):
    def create(self, radius: float = 1.0, color: str = "#FFFFFF") -> "Circle":
        return Circle(radius=radius, color=color)


class SquareFactory(ShapeFactory["Square"]):
    def create(self, side: float = 1.0, color: str = "#FFFFFF") -> "Square":
        return Square(side=side, color=color)


# Concrete products
class Circle:
    """A circle drawable shape."""

    def __init__(self, radius: float = 1.0, color: str = "#FFFFFF") -> None:
        self.radius = radius
        self.color = color

    def draw(self, ctx: Any) -> None:
        ctx.circle(self.radius, self.color)

    def bounds(self) -> tuple[float, float, float, float]:
        r = self.radius
        return (-r, -r, r * 2, r * 2)


class Square:
    """A square drawable shape."""

    def __init__(self, side: float = 1.0, color: str = "#FFFFFF") -> None:
        self.side = side
        self.color = color

    def draw(self, ctx: Any) -> None:
        ctx.rect(0, 0, self.side, self.side, self.color)

    def bounds(self) -> tuple[float, float, float, float]:
        s = self.side
        return (0, 0, s, s)


# Typed factory registry using Literal for compile-time checking
from typing import Literal

SHAPE_REGISTRY: dict[Literal["circle", "square"], ShapeFactory] = {
    "circle": CircleFactory(),
    "square": SquareFactory(),
}


def create_shape(shape_type: Literal["circle", "square"], **params: Any) -> Drawable:
    """Create a shape via the typed registry.

    Args:
        shape_type: Must be 'circle' or 'square'.
        **params: Shape-specific parameters (radius, side, color).

    Returns:
        A Drawable shape instance.
    """
    factory = SHAPE_REGISTRY.get(shape_type)
    if factory is None:
        raise ValueError(f"Unknown shape type '{shape_type}'")
    return factory.create(**params)
```

---

## Constraints

### MUST DO
- Define the product interface as an ABC or Protocol before implementing factories
- Always return the product ABC/Protocol from `create()` — never leak concrete types to callers
- Use registration decorators (not manual dict population) for auto-discovery of factory variants
- Raise descriptive errors for unknown factory keys, listing available options
- Write unit tests that verify each concrete factory produces a valid product instance

### MUST NOT DO
- Mix multiple unrelated product families into one factory ABC — keep concerns separate
- Use `isinstance` checks on concrete types inside caller code (violates DIP)
- Store mutable shared state inside factory instances (factories should be stateless or use thread-safe config)
- Create a factory for every single class in the system — only abstract factories where creation varies
- Forget to document which configuration keys each factory accepts

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `builder-pattern` | Use Builder when object construction is multi-step with many optional parameters; Factory Method when you need simple polymorphic instantiation |
| `creational-design-patterns` | Broader overview of all GoF creational patterns including Singleton, Prototype, and Abstract Factory for comparison |
| `strategy-pattern` | Combine Factory Method (creates strategy objects) with Strategy pattern (selects algorithm at runtime) |
| `dependency-inversion-principle` | Factory Method is the primary implementation vehicle for DIP — depends on abstractions, not concretions |

---

## Live References

> Authoritative documentation links for design patterns and Python typing.

- [GoF Design Patterns Book](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612) — The original Gang of Four catalog
- [Python abc Module Docs](https://docs.python.org/3/library/abc.html) — Abstract base classes in the standard library
- [Python typing Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol) — Structural subtyping with Protocol
- [SOLID Principles (Wikipedia)](https://en.wikipedia.org/wiki/SOLID) — Overview of all five SOLID principles
- [Factory Method Pattern (Refactoring.Guru)](https://refactoring.guru/design-patterns/factory-method) — Visual explanation and examples
