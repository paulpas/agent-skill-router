---
name: design-patterns-and-principles
description: Implements and explains GoF design patterns (Factory, Observer, Strategy,
  Decorator, Singleton), SOLID principles, and DRY/YAGNI guidelines to produce maintainable,
  extensible software architecture.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design patterns, GoF, SOLID, DRY, factory pattern, software architecture,
    refactoring, SOLID principles
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
  - examples
  - do-dont
  related-skills: test-driven-development, code-review, refactoring, modular-design
------
# Design Patterns & Software Architecture Principles

Senior software architect designing maintainable, extensible systems using proven design patterns and principles. Applies GoF patterns, SOLID principles, and DRY/YAGNI guidelines to produce code that is easy to understand, test, and evolve. Evaluates architectural tradeoffs, prevents over-engineering, and selects the simplest pattern that solves the identified problem.

## TL;DR Checklist

- [ ] Identify the core problem and change point before reaching for a pattern
- [ ] Prefer composition over inheritance (SOLID - Open/Closed Principle)
- [ ] Apply Single Responsibility: each class has one reason to change
- [ ] Verify Dependence Inversion: high-level modules depend on abstractions, not concretions
- [ ] Avoid over-engineering — YAGNI means don't add abstractions prematurely
- [ ] Eliminate duplication: DRY means abstract shared behavior, not repeat it
- [ ] Choose the simplest pattern that solves the problem
- [ ] Ensure every pattern has a concrete problem it addresses — no pattern for pattern's sake

---

## When to Use

Use this skill when:

- Designing new modules or services from scratch and needing structural guidance
- Refactoring legacy code that is hard to test or extend
- Resolving tight coupling between components that prevents independent changes
- Deciding between inheritance and composition for a new abstraction
- Introducing testability into code that lacks dependency injection
- Evaluating whether a proposed abstraction is warranted or premature (YAGNI check)
- Resolving a conditional explosion of if/elif/else branches that encode algorithm selection
- Managing cross-cutting concerns that would otherwise scatter code across many classes

---

## When NOT to Use

Avoid applying design patterns when:

- Building a simple script or one-off tool where no extension is expected (YAGNI applies)
- A standard library function or language feature already solves the problem cleanly
- For data structures that don't require behavioral flexibility (don't over-engineer)
- The team lacks the experience to maintain the chosen pattern correctly
- The added complexity of a pattern outweighs the benefit of the change it enables
- You are introducing an abstraction without a concrete second use case

---

## Core Workflow

1. **Analyze Requirements** — Identify what changes, what stays stable, and what abstractions are genuinely needed vs. speculative. Map the change points in the system.
   **Checkpoint:** Can the problem be solved without any abstraction? If yes, YAGNI applies — skip the pattern.

2. **Apply SOLID Principles** — Evaluate the design against each principle:
   - SRP: Does each class have a single responsibility?
   - OCP: Can new behavior be added without modifying existing code?
   - LSP: Will subclasses be substitutable for base classes?
   - ISP: Are interfaces slim and client-specific?
   - DIP: Do high-level modules depend on abstractions, not concretions?
   **Checkpoint:** If more than one principle is violated, the design needs restructuring before selecting a pattern.

3. **Select a Pattern** — Match the problem to the appropriate GoF category:
   - Creational (object creation): Factory Method, Builder, Singleton, Abstract Factory, Prototype
   - Structural (composition): Adapter, Decorator, Facade, Proxy, Composite, Bridge, Flyweight
   - Behavioral (communication): Strategy, Observer, Command, Iterator, State, Template Method, Mediator, Memento, Visitor
   **Checkpoint:** The pattern must address the actual change point identified in step 1.

4. **Implement with DRY** — Extract shared behavior. Avoid duplication by factoring out common logic into well-named, single-responsibility components.
   **Checkpoint:** Run the duplication test — if the same logic appears in two places with only minor differences, it should be abstracted.

5. **Review & Validate** — Check against all constraints below. Ensure the design can be unit-tested in isolation. Verify no hierarchy exceeds 3 levels.
   **Checkpoint:** Can each concrete class be tested independently? If not, DIP has not been applied correctly.

---

## Implementation Patterns — GoF Creational

### Factory Method

The Factory Method defines an interface for creating objects, but lets subclasses or a factory class decide which concrete class to instantiate. This decouples the client from concrete implementations.

```python
# ❌ BAD — direct instantiation couples client to concrete classes
class OrderProcessor:
    def process(self, payment_type: str) -> None:
        if payment_type == "credit_card":
            gateway = CreditCardGateway()
        elif payment_type == "paypal":
            gateway = PayPalGateway()
        elif payment_type == "crypto":
            gateway = CryptoGateway()
        gateway.charge(100.0)
```

```python
# ✅ GOOD — Factory Method enables adding new payment types without modification
from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    """Abstract product — all payment gateways share this interface."""

    @abstractmethod
    def charge(self, amount: float) -> bool:
        """Process a payment and return success status."""
        ...


class CreditCardGateway(PaymentGateway):
    def charge(self, amount: float) -> bool:
        # Process credit card payment
        return True

class PayPalGateway(PaymentGateway):
    def charge(self, amount: float) -> bool:
        # Process PayPal payment
        return True

class CryptoGateway(PaymentGateway):
    def charge(self, amount: float) -> bool:
        # Process cryptocurrency payment
        return True


class PaymentFactory:
    @staticmethod
    def create_gateway(payment_type: str) -> PaymentGateway:
        factories: dict[str, type[PaymentGateway]] = {
            "credit_card": CreditCardGateway,
            "paypal": PayPalGateway,
            "crypto": CryptoGateway,
        }
        factory_cls = factories.get(payment_type)
        if factory_cls is None:
            raise ValueError(f"Unknown payment type: {payment_type}")
        return factory_cls()


class OrderProcessor:
    def __init__(self, factory: PaymentFactory | None = None):
        self._factory = factory or PaymentFactory()

    def process(self, payment_type: str, amount: float) -> None:
        gateway = self._factory.create_gateway(payment_type)
        gateway.charge(amount)
```

**Why this works:** Adding a new payment type requires only adding a new class implementing `PaymentGateway` and registering it in the factory dictionary. `OrderProcessor` never changes — satisfying the Open/Closed Principle.

---

### Builder

The Builder pattern separates complex object construction from its representation. Useful when an object requires many configuration parameters, some optional, and the construction process has multiple steps.

```python
# ❌ BAD — telescoping constructor makes objects hard to create correctly
class HttpRequest:
    def __init__(
        self, method: str, url: str, headers: dict | None = None,
        body: str | None = None, timeout: int = 30,
        retry_count: int = 0, verify_ssl: bool = True,
        proxy: str | None = None, auth: tuple | None = None,
    ):
        # With 10 parameters, remembering which is which is error-prone
        self.method = method
        self.url = url
        self.headers = headers or {}
        self.body = body
        self.timeout = timeout
        self.retry_count = retry_count
        self.verify_ssl = verify_ssl
        self.proxy = proxy
        self.auth = auth
```

```python
# ✅ GOOD — Builder provides fluent, readable construction
class HttpRequest:
    def __init__(
        self, method: str, url: str,
        headers: dict | None = None, body: str | None = None,
        timeout: int = 30, retry_count: int = 0,
        verify_ssl: bool = True, proxy: str | None = None,
        auth: tuple | None = None,
    ):
        self.method = method
        self.url = url
        self.headers = headers or {}
        self.body = body
        self.timeout = timeout
        self.retry_count = retry_count
        self.verify_ssl = verify_ssl
        self.proxy = proxy
        self.auth = auth


class HttpRequestBuilder:
    def __init__(self, method: str, url: str) -> None:
        self._method = method
        self._url = url
        self._headers: dict = {}
        self._body: str | None = None
        self._timeout: int = 30
        self._retry_count: int = 0
        self._verify_ssl: bool = True
        self._proxy: str | None = None
        self._auth: tuple | None = None

    def with_header(self, key: str, value: str) -> "HttpRequestBuilder":
        self._headers[key] = value
        return self

    def with_body(self, body: str) -> "HttpRequestBuilder":
        self._body = body
        return self

    def with_timeout(self, seconds: int) -> "HttpRequestBuilder":
        self._timeout = seconds
        return self

    def with_retry(self, count: int) -> "HttpRequestBuilder":
        self._retry_count = count
        return self

    def with_ssl_verification(self, verify: bool) -> "HttpRequestBuilder":
        self._verify_ssl = verify
        return self

    def with_proxy(self, proxy_url: str) -> "HttpRequestBuilder":
        self._proxy = proxy_url
        return self

    def with_auth(self, username: str, password: str) -> "HttpRequestBuilder":
        self._auth = (username, password)
        return self

    def build(self) -> HttpRequest:
        return HttpRequest(
            method=self._method, url=self._url,
            headers=self._headers, body=self._body,
            timeout=self._timeout, retry_count=self._retry_count,
            verify_ssl=self._verify_ssl, proxy=self._proxy,
            auth=self._auth,
        )


# Usage — clear and readable:
# request = (HttpRequestBuilder("POST", "https://api.example.com/data")
#            .with_header("Content-Type", "application/json")
#            .with_body('{"key": "value"}')
#            .with_timeout(60)
#            .with_retry(3)
#            .build())
```

---

### Singleton (Anti-Pattern Warning)

Singleton ensures a class has only one instance and provides global access. This skill covers Singleton for reference, but **strongly discourages its use** — it hides dependencies, prevents testing, and creates implicit coupling. Use dependency injection instead.

```python
# ❌ BAD — Singleton hides dependencies and makes testing impossible
class DatabaseConnection:
    _instance: "DatabaseConnection | None" = None

    def __new__(cls) -> "DatabaseConnection":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connect()
        return cls._instance

    def _connect(self) -> None:
        self._connection = create_connection("postgres://localhost/mydb")

    def query(self, sql: str) -> list[dict]:
        return self._connection.execute(sql)


# Cannot inject a mock — all code shares the same real database connection
db = DatabaseConnection()  # Always the same instance
```

```python
# ✅ GOOD — Dependency Injection replaces Singleton
# The calling code manages the single instance and injects it.
class DatabaseConnection:
    def __init__(self, connection_string: str):
        self._connection = create_connection(connection_string)

    def query(self, sql: str) -> list[dict]:
        return self._connection.execute(sql)


# App startup — single instance created once, injected everywhere:
# db = DatabaseConnection("postgres://localhost/mydb")
# router = create_router(database=db)  # Injected, testable
```

**Rule of thumb:** If you reach for Singleton, ask: "Can I manage this as a singleton at the composition root instead?" The answer is almost always yes.

---

### Abstract Factory

Abstract Factory provides an interface for creating families of related objects without specifying their concrete classes. Useful when your system must work with multiple product families (e.g., UI themes, database backends).

```python
# ❌ BAD — Concrete factory methods scattered across the codebase
def create_button(theme: str) -> Button:
    if theme == "dark":
        return DarkButton()
    elif theme == "light":
        return LightButton()
    raise ValueError(f"Unknown theme: {theme}")


# ✅ GOOD — Abstract Factory creates cohesive product families
from abc import ABC, abstractmethod

class Button(ABC):
    @abstractmethod
    def render(self) -> str: ...
    @abstractmethod
    def click(self) -> str: ...

class Checkbox(ABC):
    @abstractmethod
    def render(self) -> str: ...
    @abstractmethod
    def toggle(self) -> str: ...


class DarkButton(Button):
    def render(self) -> str: return "<button class='dark'>"
    def click(self) -> str: return "dark button clicked"

class LightButton(Button):
    def render(self) -> str: return "<button class='light'>"
    def click(self) -> str: return "light button clicked"

class DarkCheckbox(Checkbox):
    def render(self) -> str: return "<checkbox class='dark'>"
    def toggle(self) -> str: return "dark checkbox toggled"

class LightCheckbox(Checkbox):
    def render(self) -> str: return "<checkbox class='light'>"
    def toggle(self) -> str: return "light checkbox toggled"


class UIFactory(ABC):
    """Abstract Factory — creates a family of UI components."""

    @abstractmethod
    def create_button(self) -> Button: ...
    @abstractmethod
    def create_checkbox(self) -> Checkbox: ...


class DarkUIFactory(UIFactory):
    def create_button(self) -> Button: return DarkButton()
    def create_checkbox(self) -> Checkbox: return DarkCheckbox()

class LightUIFactory(UIFactory):
    def create_button(self) -> Button: return LightButton()
    def create_checkbox(self) -> Checkbox: return LightCheckbox()


# Client code works with abstract factories only
class SettingsPanel:
    def __init__(self, factory: UIFactory):
        self._factory = factory

    def render(self) -> str:
        button = self._factory.create_button()
        checkbox = self._factory.create_checkbox()
        return f"{button.render()} {checkbox.render()}"

# Usage — swap entire theme by changing the factory:
# panel = SettingsPanel(DarkUIFactory())
```

---

### Prototype

The Prototype pattern creates new objects by copying an existing instance (the prototype). Useful when object creation is expensive or when you need to avoid subclassing to create instances of varying types.

```python
# ✅ GOOD — Prototype pattern for expensive object creation
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConfigTemplate:
    """A prototype configuration that can be cloned and customized."""
    host: str = "localhost"
    port: int = 8080
    debug: bool = False
    features: list[str] = field(default_factory=list)
    overrides: dict[str, Any] = field(default_factory=dict)

    def clone(self, **overrides: Any) -> "ConfigTemplate":
        """Create a deep copy with selective overrides applied."""
        cloned = deepcopy(self)
        cloned.overrides.update(overrides)
        return cloned


# Usage — create many variations from a single template:
# production_config = ConfigTemplate(host="prod.example.com", debug=False)
# staging_config = production_config.clone(host="staging.example.com", debug=True)
# dev_config = production_config.clone(host="localhost", debug=True,
#                                       features=["hot_reload", "profiler"])
```

---

## Implementation Patterns — GoF Structural

### Decorator

The Decorator pattern attaches additional responsibilities to objects dynamically. It provides a flexible alternative to subclassing for adding behavior. Ideal for cross-cutting concerns like logging, caching, or authentication.

```python
# ❌ BAD — inheritance for cross-cutting concerns creates a combinatorial explosion
class LoggedDatabaseConnection:
    def __init__(self, host: str):
        self._connection = connect(host)

    def query(self, sql: str) -> list[dict]:
        log(f"Executing: {sql}")
        return self._connection.query(sql)

class CachedLoggedDatabaseConnection(LoggedDatabaseConnection):
    def __init__(self, host: str):
        super().__init__(host)
        self._cache: dict[str, list[dict]] = {}

    def query(self, sql: str) -> list[dict]:
        if sql in self._cache:
            return self._cache[sql]
        result = super().query(sql)
        self._cache[sql] = result
        return result

# Adding AuthenticationDecorator on top requires a new class for every combination.
# With N concerns and M levels of nesting, you get N! combinations.
```

```python
# ✅ GOOD — Decorator composes cross-cutting concerns cleanly
from abc import ABC, abstractmethod


class DatabaseConnection(ABC):
    @abstractmethod
    def query(self, sql: str) -> list[dict]: ...


class RealDatabaseConnection(DatabaseConnection):
    def __init__(self, host: str) -> None:
        self._connection = connect(host)

    def query(self, sql: str) -> list[dict]:
        return self._connection.query(sql)


class LoggingDecorator(DatabaseConnection):
    def __init__(self, wrapped: DatabaseConnection) -> None:
        self._wrapped = wrapped

    def query(self, sql: str) -> list[dict]:
        log(f"Executing: {sql}")
        return self._wrapped.query(sql)


class CacheDecorator(DatabaseConnection):
    def __init__(self, wrapped: DatabaseConnection) -> None:
        self._wrapped = wrapped
        self._cache: dict[str, list[dict]] = {}

    def query(self, sql: str) -> list[dict]:
        if sql in self._cache:
            return self._cache[sql]
        result = self._wrapped.query(sql)
        self._cache[sql] = result
        return result


class TimingDecorator(DatabaseConnection):
    def __init__(self, wrapped: DatabaseConnection) -> None:
        self._wrapped = wrapped

    def query(self, sql: str) -> list[dict]:
        import time
        start = time.monotonic()
        result = self._wrapped.query(sql)
        log(f"Query took {time.monotonic() - start:.4f}s")
        return result


# Usage — compose at runtime in any order:
# conn = TimingDecorator(CacheDecorator(LoggingDecorator(RealDatabaseConnection("localhost"))))
# results = conn.query("SELECT * FROM users")
```

---

### Adapter

The Adapter pattern converts the interface of a class into another interface clients expect. It allows incompatible interfaces to work together, wrapping legacy or third-party code.

```python
# ❌ BAD — modifying existing code to fit a new interface
class LegacyPaymentAPI:
    def process_transaction(self, credit_card_number: str, amount: float, currency: str) -> bool:
        """Legacy API with an awkward interface."""
        # ... complex legacy logic ...
        return True


# After adding a new requirement, we're forced to modify or duplicate the wrapper:
class PaymentService:
    def __init__(self):
        self._api = LegacyPaymentAPI()

    def process_payment(self, card: str, amount: float, currency: str) -> bool:
        # We can use the legacy API, but the interface mismatch is ugly
        return self._api.process_transaction(card, amount, currency)


# ✅ GOOD — Adapter cleanly separates the interface mismatch
from abc import ABC, abstractmethod


class PaymentProcessor(ABC):
    """New, clean interface."""

    @abstractmethod
    def process(self, card_number: str, amount: float, currency: str) -> bool: ...


class LegacyPaymentAdapter(PaymentProcessor):
    """Adapts the legacy API to the new interface."""

    def __init__(self) -> None:
        self._legacy = LegacyPaymentAPI()

    def process(self, card_number: str, amount: float, currency: str) -> bool:
        # Adapt the call to the legacy API's signature
        return self._legacy.process_transaction(card_number, amount, currency)


class StripePaymentProcessor(PaymentProcessor):
    """New, native implementation."""

    def process(self, card_number: str, amount: float, currency: str) -> bool:
        # Stripe-specific implementation
        return stripe.charge(card_number, amount, currency)


class PaymentService:
    def __init__(self, processor: PaymentProcessor):
        self._processor = processor

    def process_payment(self, card: str, amount: float, currency: str) -> bool:
        return self._processor.process(card, amount, currency)
```

---

### Facade

The Facade pattern provides a simplified interface to a complex subsystem. It hides complexity and decouples clients from the subsystem's classes.

```python
# ❌ BAD — client must understand and coordinate many subsystem classes
class ImageProcessingClient:
    def process_and_upload(self, image_path: str) -> str:
        # Client must know about every subsystem:
        raw = ImageLoader(image_path).load()
        resized = ImageResizer(raw).resize(800, 600)
        compressed = ImageCompressor(resized).compress(0.8)
        watermark = Watermarker(compressed).apply("logo.png")
        encoded = ImageEncoder(watermark, "webp").encode()
        url = StorageUploader(encoded).upload()
        return url


# ✅ GOOD — Facade provides a single, simple entry point
from abc import ABC, abstractmethod


class ImageFacade:
    """Simplified interface for the entire image processing pipeline."""

    def process_and_upload(self, image_path: str, max_width: int = 800) -> str:
        raw = ImageLoader(image_path).load()
        resized = ImageResizer(raw).resize(max_width, int(max_width * 0.75))
        compressed = ImageCompressor(resized).compress(0.8)
        watermark = Watermarker(compressed).apply("logo.png")
        encoded = ImageEncoder(watermark, "webp").encode()
        return StorageUploader(encoded).upload()


# Client code is now one line:
# url = ImageFacade().process_and_upload("photo.jpg")
```

---

### Proxy

The Proxy pattern provides a placeholder or surrogate for another object to control access to it. Useful for lazy initialization, access control, caching, and logging.

```python
# ✅ GOOD — Lazy initialization proxy for expensive object creation
from abc import ABC, abstractmethod


class Document(ABC):
    @abstractmethod
    def render(self) -> str: ...


class ExpensiveDocument(Document):
    """Expensive to create — reads from disk, parses content."""

    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        # Simulate expensive initialization
        import time; time.sleep(0.1)
        self._content = self._load_content(filepath)

    def _load_content(self, filepath: str) -> str:
        with open(filepath, "r") as f:
            return f.read()

    def render(self) -> str:
        return f"[Document: {self._filepath}]\n{self._content}"


class DocumentProxy(Document):
    """Proxy that defers document loading until first access."""

    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        self._document: ExpensiveDocument | None = None

    def render(self) -> str:
        if self._document is None:
            self._document = ExpensiveDocument(self._filepath)
        return self._document.render()


# The ExpensiveDocument is only created when render() is first called:
# doc = DocumentProxy("large_file.txt")  # No expense yet
# print(doc.render())  # Expensive load happens here
# print(doc.render())  # Reuses the already-loaded document
```

---

### Composite

The Composite pattern lets you compose objects into tree structures and treat individual objects and compositions uniformly. Ideal for UI component trees, filesystems, and organizational hierarchies.

```python
# ✅ GOOD — Treat leaves and composites uniformly
from abc import ABC, abstractmethod


class Component(ABC):
    @abstractmethod
    def render(self, indent: int = 0) -> str: ...
    @abstractmethod
    def get_cost(self) -> float: ...


class Leaf(Component):
    """An indivisible component."""

    def __init__(self, name: str, cost: float) -> None:
        self._name = name
        self._cost = cost

    def render(self, indent: int = 0) -> str:
        prefix = "  " * indent
        return f"{prefix}- {self._name} (${self._cost:.2f})"

    def get_cost(self) -> float:
        return self._cost


class Composite(Component):
    """A container of components."""

    def __init__(self, name: str) -> None:
        self._name = name
        self._children: list[Component] = []

    def add(self, component: Component) -> None:
        self._children.append(component)

    def remove(self, component: Component) -> None:
        self._children.remove(component)

    def render(self, indent: int = 0) -> str:
        lines = [f"{'  ' * indent}+ {self._name}"]
        for child in self._children:
            lines.append(child.render(indent + 1))
        return "\n".join(lines)

    def get_cost(self) -> float:
        return sum(child.get_cost() for child in self._children)


# Build a project structure:
# project = Composite("E-Commerce Platform")
# project.add(Leaf("Backend API", 5000))
# project.add(Leaf("Frontend", 4000))
#
# frontend = Composite("Frontend")
# frontend.add(Leaf("React Components", 2500))
# frontend.add(Leaf("Styling", 1500))
# project.add(frontend)
#
# print(project.render())
# print(f"Total cost: ${project.get_cost():.2f}")  # $11,000.00
```

---

### Bridge

The Bridge pattern decouples an abstraction from its implementation so that both can vary independently. Unlike composition (where the implementation is chosen at construction), Bridge allows runtime swapping.

```python
# ✅ GOOD — Drawing abstraction independent of rendering implementation
from abc import ABC, abstractmethod


class Renderer(ABC):
    """Implementation hierarchy."""

    @abstractmethod
    def render_circle(self, x: float, y: float, radius: float) -> str: ...

    @abstractmethod
    def render_rectangle(self, x: float, y: float, w: float, h: float) -> str: ...


class VectorRenderer(Renderer):
    def render_circle(self, x: float, y: float, radius: float) -> str:
        return f"<circle cx='{x}' cy='{y}' r='{radius}' />"

    def render_rectangle(self, x: float, y: float, w: float, h: float) -> str:
        return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' />"


class RasterRenderer(Renderer):
    def render_circle(self, x: float, y: float, radius: float) -> str:
        return f"bitmap circle at ({x},{y}) radius {radius}"

    def render_rectangle(self, x: float, y: float, w: float, h: float) -> str:
        return f"bitmap rect at ({x},{y}) size {w}x{h}"


class Shape(ABC):
    """Abstraction — depends on Renderer, not on specific implementations."""

    def __init__(self, renderer: Renderer) -> None:
        self._renderer = renderer

    @abstractmethod
    def draw(self) -> str: ...

    @abstractmethod
    def resize(self, factor: float) -> None: ...


class Circle(Shape):
    def __init__(self, x: float, y: float, radius: float, renderer: Renderer) -> None:
        super().__init__(renderer)
        self._x = x
        self._y = y
        self._radius = radius

    def draw(self) -> str:
        return self._renderer.render_circle(self._x, self._y, self._radius)

    def resize(self, factor: float) -> None:
        self._radius *= factor


class Rectangle(Shape):
    def __init__(self, x: float, y: float, w: float, h: float, renderer: Renderer) -> None:
        super().__init__(renderer)
        self._x = x
        self._y = y
        self._w = w
        self._h = h

    def draw(self) -> str:
        return self._renderer.render_rectangle(self._x, self._y, self._w, self._h)

    def resize(self, factor: float) -> None:
        self._w *= factor
        self._h *= factor


# Swap implementations at runtime:
# vector_circle = Circle(10, 20, 5, VectorRenderer())
# raster_circle = Circle(10, 20, 5, RasterRenderer())
```

---

### Flyweight

The Flyweight pattern minimizes memory usage by sharing common state between objects. Useful when you need to create large numbers of fine-grained objects that share data (e.g., characters in a text editor, game entities with shared visual assets).

```python
# ✅ GOOD — Share intrinsic state to reduce memory footprint
from dataclasses import dataclass


@dataclass(frozen=True)
class ChessPieceType:
    """Intrinsic state — shared across all pieces of a given type."""
    name: str
    symbol: str
    value: int


class ChessPiece:
    """Extrinsic state (position) is separate from intrinsic state (type)."""

    # Pool of shared flyweight objects
    _cache: dict[str, ChessPieceType] = {}

    @classmethod
    def get_type(cls, name: str) -> ChessPieceType:
        if name not in cls._cache:
            symbols = {"pawn": "♙", "rook": "♖", "knight": "♘", "bishop": "♗", "queen": "♕", "king": "♔"}
            values = {"pawn": 1, "rook": 5, "knight": 3, "bishop": 3, "queen": 9, "king": 0}
            cls._cache[name] = ChessPieceType(name, symbols[name], values[name])
        return cls._cache[name]

    def __init__(self, piece_type: ChessPieceType, row: int, col: int) -> None:
        self._type = piece_type   # Shared (intrinsic)
        self._row = row           # Unique (extrinsic)
        self._col = col           # Unique (extrinsic)

    def display(self) -> str:
        return f"{self._type.symbol}({self._row},{self._col})"


# Creating 64 pieces on a board — only 6 ChessPieceType objects are created:
# board: list[ChessPiece] = []
# for col in range(8):
#     board.append(ChessPiece(ChessPieceType.get_type("pawn"), 1, col))
# board.append(ChessPiece(ChessPieceType.get_type("rook"), 0, 0))
# ...
```

---

## Implementation Patterns — GoF Behavioral

### Strategy

The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. The client selects the strategy at runtime. Replaces conditional logic with polymorphism.

```python
# ❌ BAD — conditional logic for algorithm selection is hard to test and extend
class DiscountService:
    def calculate_discount(self, customer: dict) -> float:
        if customer["type"] == "premium":
            return customer["subtotal"] * 0.15
        elif customer["type"] == "standard":
            return customer["subtotal"] * 0.05
        elif customer["type"] == "vip":
            return customer["subtotal"] * 0.25
        return 0.0


# ✅ GOOD — Strategy pattern makes discount rules open/closed and individually testable
from abc import ABC, abstractmethod
from typing import Protocol


class DiscountStrategy(Protocol):
    def calculate(self, subtotal: float) -> float: ...


class PremiumDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.15


class StandardDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.05


class VIPDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.25


class DiscountService:
    def __init__(self, strategy: DiscountStrategy) -> None:
        self._strategy = strategy

    def apply_discount(self, subtotal: float) -> float:
        return self._strategy.calculate(subtotal)


# Usage — swap strategies at runtime:
# service = DiscountService(PremiumDiscount())
# discount = service.apply_discount(200.0)  # returns 30.0
# service = DiscountService(VIPDiscount())   # swap strategy
# discount = service.apply_discount(200.0)  # returns 50.0
```

---

### Observer

The Observer pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified. Replaces manual notification chains with a publish-subscribe mechanism.

```python
# ❌ BAD — manual notification is error-prone and easily forgotten
class OrderManager:
    def __init__(self) -> None:
        self._email_sender = EmailSender()
        self._inventory_service = InventoryService()

    def create_order(self, order: Order) -> None:
        self._save_order(order)
        self._email_sender.send(order.customer_email, "Order confirmed")  # easily missed
        self._inventory_service.reserve(order.items)  # easily missed


# ✅ GOOD — Observer ensures all subscribers are notified automatically
from abc import ABC, abstractmethod
from typing import List


class OrderObserver(ABC):
    @abstractmethod
    def on_order_created(self, order: Order) -> None: ...


class OrderManager:
    def __init__(self) -> None:
        self._observers: List[OrderObserver] = []
        self._orders: List[Order] = []

    def subscribe(self, observer: OrderObserver) -> None:
        self._observers.append(observer)

    def create_order(self, order: Order) -> None:
        self._orders.append(order)
        for observer in self._observers:
            observer.on_order_created(order)


class EmailNotifier(OrderObserver):
    def __init__(self, sender: EmailSender) -> None:
        self._sender = sender

    def on_order_created(self, order: Order) -> None:
        self._sender.send(order.customer_email, "Order confirmed")


class InventoryReserver(OrderObserver):
    def __init__(self, inventory: InventoryService) -> None:
        self._inventory = inventory

    def on_order_created(self, order: Order) -> None:
        self._inventory.reserve(order.items)
```

---

### Command

The Command pattern encapsulates a request as an object, allowing parameterization, queuing, logging, and undo operations. Decouples the invoker from the receiver.

```python
# ✅ GOOD — Commands are first-class objects that can be queued, logged, and undone
from abc import ABC, abstractmethod
from typing import List


class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class Light:
    def turn_on(self) -> None:
        self._state = True

    def turn_off(self) -> None:
        self._state = False


class LightOnCommand(Command):
    def __init__(self, light: Light) -> None:
        self._light = light

    def execute(self) -> None:
        self._light.turn_on()

    def undo(self) -> None:
        self._light.turn_off()


class LightOffCommand(Command):
    def __init__(self, light: Light) -> None:
        self._light = light

    def execute(self) -> None:
        self._light.turn_off()

    def undo(self) -> None:
        self._light.turn_on()


class RemoteControl:
    def __init__(self) -> None:
        self._commands: List[Command] = []
        self._history: List[Command] = []

    def press_button(self, command: Command) -> None:
        command.execute()
        self._history.append(command)

    def undo_last(self) -> None:
        if self._history:
            self._history.pop().undo()


# Commands can be queued, stored, and replayed:
# light = Light()
# remote = RemoteControl()
# remote.press_button(LightOnCommand(light))
# remote.undo_last()  # Turns off the light
```

---

### Iterator

The Iterator pattern provides a way to access elements of a collection sequentially without exposing its underlying representation.

```python
# ✅ GOOD — Custom iterator for a collection with complex traversal logic
from abc import ABC, abstractmethod
from typing import Any, Iterator


class Container(ABC):
    @abstractmethod
    def create_iterator(self) -> "Iterator": ...


class Iterator(ABC):
    @abstractmethod
    def first(self) -> Any: ...
    @abstractmethod
    def next(self) -> Any: ...
    @abstractmethod
    def is_done(self) -> bool: ...
    @abstractmethod
    def current(self) -> Any: ...


class BinaryIterator(Iterator):
    """Iterator that visits nodes in binary tree order."""

    def __init__(self, tree: list[dict]) -> None:
        self._tree = tree
        self._index = 0

    def first(self) -> Any:
        self._index = 0
        return self.current()

    def next(self) -> Any:
        self._index += 1
        return self.current()

    def is_done(self) -> bool:
        return self._index >= len(self._tree)

    def current(self) -> Any:
        if self.is_done():
            raise StopIteration
        return self._tree[self._index]


class BinarySearchTree(Container):
    def __init__(self) -> None:
        self._nodes: list[dict] = []

    def add(self, value: int) -> None:
        self._nodes.append({"value": value})

    def create_iterator(self) -> Iterator:
        return BinaryIterator(self._nodes)


# Usage:
# tree = BinarySearchTree()
# tree.add(5)
# tree.add(3)
# tree.add(7)
# it = tree.create_iterator()
# while not it.is_done():
#     print(it.next())
```

---

### State

The State pattern allows an object to alter its behavior when its internal state changes. The object appears to change its class. Replaces large conditional blocks that switch behavior based on state.

```python
# ✅ GOOD — Each state is a separate class with explicit transitions
from abc import ABC, abstractmethod


class OrderState(ABC):
    @abstractmethod
    def process_payment(self, amount: float) -> None: ...

    @abstractmethod
    def ship(self) -> None: ...

    @abstractmethod
    def cancel(self) -> None: ...

    @abstractmethod
    def return_order(self) -> None: ...


class PendingOrderState(OrderState):
    def __init__(self, context: "Order") -> None:
        self._context = context

    def process_payment(self, amount: float) -> None:
        if amount > 0:
            print("Payment processed")
            self._context._state = self._context._paid_state

    def ship(self) -> None:
        print("Cannot ship: order is pending payment")

    def cancel(self) -> None:
        print("Order cancelled")
        self._context._state = self._context._cancelled_state

    def return_order(self) -> None:
        print("Cannot return: order has not shipped")


class PaidOrderState(OrderState):
    def __init__(self, context: "Order") -> None:
        self._context = context

    def process_payment(self, amount: float) -> None:
        print("Payment already processed")

    def ship(self) -> None:
        print("Order shipped")
        self._context._state = self._context._shipped_state

    def cancel(self) -> None:
        print("Cannot cancel: order has been paid. Initiate return.")

    def return_order(self) -> None:
        print("Return initiated")
        self._context._state = self._context._returned_state


class ShippedOrderState(OrderState):
    def __init__(self, context: "Order") -> None:
        self._context = context

    def process_payment(self, amount: float) -> None:
        print("Payment already processed")

    def ship(self) -> None:
        print("Order already shipped")

    def cancel(self) -> None:
        print("Cannot cancel: order has shipped. Initiate return.")

    def return_order(self) -> None:
        print("Return accepted — refund processing")
        self._context._state = self._context._returned_state


class CancelledOrderState(OrderState):
    def __init__(self, context: "Order") -> None:
        self._context = context

    def process_payment(self, amount: float) -> None:
        print("Cannot process payment: order is cancelled")

    def ship(self) -> None:
        print("Cannot ship: order is cancelled")

    def cancel(self) -> None:
        print("Order already cancelled")

    def return_order(self) -> None:
        print("Cannot return: order is cancelled")


class Order:
    def __init__(self) -> None:
        self._pending_state = PendingOrderState(self)
        self._paid_state = PaidOrderState(self)
        self._shipped_state = ShippedOrderState(self)
        self._cancelled_state = CancelledOrderState(self)
        self._returned_state = CancelledOrderState(self)  # simplified
        self._state: OrderState = self._pending_state

    def process_payment(self, amount: float) -> None:
        self._state.process_payment(amount)

    def ship(self) -> None:
        self._state.ship()

    def cancel(self) -> None:
        self._state.cancel()

    def return_order(self) -> None:
        self._state.return_order()


# State transitions are explicit and testable:
# order = Order()
# order.process_payment(99.99)  # → PaidOrderState
# order.ship()                  # → ShippedOrderState
```

---

### Template Method

The Template Method pattern defines the skeleton of an algorithm in a base class, letting subclasses override specific steps without changing the algorithm's structure.

```python
# ✅ GOOD — Shared algorithm structure with customizable steps
from abc import ABC, abstractmethod


class DataProcessor(ABC):
    """Template method defines the algorithm structure."""

    def process(self, data: list[dict]) -> dict[str, any]:
        """The template method — algorithm structure is fixed."""
        validated = self.validate(data)
        if not validated:
            return {"status": "error", "message": "Validation failed"}

        transformed = self.transform(data)
        results = self.compute(transformed)
        output = self.format(results)
        return output

    # Steps that subclasses must implement:
    @abstractmethod
    def validate(self, data: list[dict]) -> bool: ...

    @abstractmethod
    def transform(self, data: list[dict]) -> list[dict]: ...

    @abstractmethod
    def compute(self, data: list[dict]) -> dict[str, any]: ...

    @abstractmethod
    def format(self, results: dict[str, any]) -> dict[str, any]: ...


class SalesReportProcessor(DataProcessor):
    def validate(self, data: list[dict]) -> bool:
        return all("amount" in row for row in data)

    def transform(self, data: list[dict]) -> list[dict]:
        return [row for row in data if row["amount"] > 0]

    def compute(self, data: list[dict]) -> dict[str, any]:
        total = sum(row["amount"] for row in data)
        avg = total / len(data) if data else 0
        return {"total": total, "average": avg, "count": len(data)}

    def format(self, results: dict[str, any]) -> dict[str, any]:
        return {"status": "success", "report": "sales", **results}


class InventoryReportProcessor(DataProcessor):
    def validate(self, data: list[dict]) -> bool:
        return all("sku" in row and "quantity" in row for row in data)

    def transform(self, data: list[dict]) -> list[dict]:
        return [row for row in data if row["quantity"] < 10]

    def compute(self, data: list[dict]) -> dict[str, any]:
        low_stock = {row["sku"]: row["quantity"] for row in data}
        return {"low_stock_items": low_stock, "total_count": len(low_stock)}

    def format(self, results: dict[str, any]) -> dict[str, any]:
        return {"status": "success", "report": "inventory", **results}


# Usage — same interface, different report types:
# processor = SalesReportProcessor()
# report = processor.process([{"amount": 100}, {"amount": 200}])
```

---

### Mediator

The Mediator pattern defines an object that encapsulates how a set of objects interact. Promotes loose coupling by keeping objects from referring to each other explicitly.

```python
# ✅ GOOD — ChatRoom mediator decouples all users from each other
from abc import ABC, abstractmethod


class ChatMediator(ABC):
    @abstractmethod
    def send(self, message: str, sender: "User") -> None: ...

    @abstractmethod
    def add_user(self, user: "User") -> None: ...


class User:
    def __init__(self, name: str, mediator: ChatMediator) -> None:
        self._name = name
        self._mediator = mediator

    def send(self, message: str) -> None:
        print(f"[{self._name}] sends: {message}")
        self._mediator.send(message, self)

    def receive(self, message: str, sender: "User") -> None:
        if sender is not self:
            print(f"[{self._name}] receives from {sender._name}: {message}")


class ChatRoom(ChatMediator):
    def __init__(self) -> None:
        self._users: list[User] = []

    def add_user(self, user: User) -> None:
        self._users.append(user)

    def send(self, message: str, sender: User) -> None:
        for user in self._users:
            if user is not sender:
                user.receive(message, sender)


# Users are completely unaware of each other:
# room = ChatRoom()
# alice = User("Alice", room)
# bob = User("Bob", room)
# room.add_user(alice)
# room.add_user(bob)
# alice.send("Hello!")   # Bob receives it through the mediator
# bob.send("Hi Alice!")  # Alice receives it through the mediator
```

---

### Memento

The Memento pattern captures and externalizes an object's internal state so that the object can be restored to this state later. Used for undo/redo functionality and snapshot-based save systems.

```python
# ✅ GOOD — Memento pattern for undo/redo without exposing internal state
from copy import deepcopy
from typing import Any


class Memento:
    """Stores a snapshot of the originator's state."""

    def __init__(self, state: dict[str, Any]) -> None:
        self._state = state  # Only Originator can read/restore this

    def get_state(self) -> dict[str, Any]:
        return deepcopy(self._state)


class Originator:
    def __init__(self) -> None:
        self._state: dict[str, Any] = {}

    def set_state(self, state: dict[str, Any]) -> None:
        self._state = state

    def save(self) -> Memento:
        return Memento(deepcopy(self._state))

    def restore(self, memento: Memento) -> None:
        self._state = memento.get_state()

    def display(self) -> str:
        return f"State: {self._state}"


class Caretaker:
    """Manages mementos but cannot access their contents."""

    def __init__(self) -> None:
        self._mementos: list[Memento] = []

    def save(self, originator: Originator) -> None:
        self._mementos.append(originator.save())

    def undo(self, originator: Originator) -> None:
        if self._mementos:
            memento = self._mementos.pop()
            originator.restore(memento)


# Usage:
# originator = Originator()
# caretaker = Caretaker()
# originator.set_state({"name": "Alice", "level": 1})
# caretaker.save(originator)
# originator.set_state({"name": "Alice", "level": 5})
# caretaker.undo(originator)
# print(originator.display())  # Back to level 1
```

---

## SOLID Principles Deep Dive

### Single Responsibility Principle (SRP)

A class should have one, and only one, reason to change. When a class does too much, changes to one responsibility risk breaking the other.

```python
# ❌ BAD — class handles both business logic AND formatting
class ReportGenerator:
    def generate_report(self, data: list[dict]) -> None:
        # ... complex business logic for data transformation ...
        filtered = [row for row in data if row["status"] == "active"]
        grouped: dict[str, list[dict]] = {}
        for row in filtered:
            grouped.setdefault(row["category"], []).append(row)
        # ... AND formatting/presentation ...
        for category, items in grouped.items():
            print(f"=== {category} ===")
            for item in items:
                print(f"  - {item['name']}: ${item['amount']}")


# ✅ GOOD — SRP: each class has one responsibility
class ReportDataProcessor:
    """Responsible for: filtering and grouping data."""

    def process(self, data: list[dict]) -> dict[str, list[dict]]:
        filtered = [row for row in data if row["status"] == "active"]
        grouped: dict[str, list[dict]] = {}
        for row in filtered:
            grouped.setdefault(row["category"], []).append(row)
        return grouped


class ReportFormatter:
    """Responsible for: formatting processed data into a displayable string."""

    def format(self, processed_data: dict[str, list[dict]]) -> str:
        lines = []
        for category, items in processed_data.items():
            lines.append(f"=== {category} ===")
            for item in items:
                lines.append(f"  - {item['name']}: ${item['amount']}")
        return "\n".join(lines)


class ReportGenerator:
    """Responsible for: coordinating processor and formatter."""

    def __init__(self, processor: ReportDataProcessor, formatter: ReportFormatter) -> None:
        self._processor = processor
        self._formatter = formatter

    def generate(self, data: list[dict]) -> str:
        processed = self._processor.process(data)
        return self._formatter.format(processed)
```

---

### Open/Closed Principle (OCP)

Software entities should be open for extension but closed for modification. New behavior should be added by creating new classes, not by editing existing ones.

```python
# ❌ BAD — modifying existing code to add a new shape type
class Shape:
    def __init__(self, shape_type: str, **kwargs):
        self.type = shape_type
        self.__dict__.update(kwargs)

    def area(self) -> float:
        if self.type == "circle":
            return 3.14159 * self.radius ** 2
        elif self.type == "rectangle":
            return self.width * self.height
        elif self.type == "triangle":
            return 0.5 * self.base * self.height
        raise ValueError(f"Unknown shape: {self.type}")


# ✅ GOOD — Adding a new shape requires no changes to existing code
from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...


class Circle(Shape):
    def __init__(self, radius: float) -> None:
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2


class Rectangle(Shape):
    def __init__(self, width: float, height: float) -> None:
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height


class Triangle(Shape):
    def __init__(self, base: float, height: float) -> None:
        self.base = base
        self.height = height

    def area(self) -> float:
        return 0.5 * self.base * self.height


# Adding Pentagon? Just create a new class. No modification to Circle, Rectangle, or Triangle.
# def total_area(shapes: list[Shape]) -> float:
#     return sum(shape.area() for shape in shapes)
```

---

### Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types without altering the correctness of the program. If a subclass changes the expected behavior (preconditions, postconditions, invariants), it violates LSP.

```python
# ❌ BAD — Square is not a valid subclass of Rectangle
class Rectangle:
    def __init__(self, width: float, height: float) -> None:
        self._width = width
        self._height = height

    @property
    def width(self) -> float: return self._width
    @property
    def height(self) -> float: return self._height

    @width.setter
    def width(self, value: float) -> None: self._width = value
    @height.setter
    def height(self, value: float) -> None: self._height = value

    def area(self) -> float:
        return self._width * self._height


class Square(Rectangle):
    """Violates LSP — setting width must also set height."""
    def __init__(self, side: float) -> None:
        super().__init__(side, side)

    @property
    def side(self) -> float: return self._width

    @width.setter
    def width(self, value: float) -> None:
        super().__init__(value, value)  # Forces height = width

    @height.setter
    def height(self, value: float) -> None:
        super().__init__(value, value)  # Forces width = height


def resize_rectangularly(rect: Rectangle) -> None:
    """This function works for any Rectangle — but breaks with Square."""
    while rect.width < rect.height:
        rect.width += 1
    # After this function, a Rectangle's width >= height still holds.
    # But a Square's width == height still holds — the while loop never ends!
    # → Infinite loop. LSP violation.


# ✅ GOOD — Use composition or a shared abstraction
class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...


class Rectangle(Shape):
    def __init__(self, width: float, height: float) -> None:
        self._width = width
        self._height = height

    @property
    def width(self) -> float: return self._width
    @property
    def height(self) -> float: return self._height

    def area(self) -> float:
        return self._width * self._height


class Square(Shape):
    """Square is not a Rectangle — they share Shape, not inheritance."""
    def __init__(self, side: float) -> None:
        self._side = side

    @property
    def side(self) -> float: return self._side

    def area(self) -> float:
        return self._side ** 2
```

---

### Interface Segregation Principle (ISP)

Clients should not be forced to depend on interfaces they do not use. Large, monolithic interfaces should be split into smaller, more specific ones.

```python
# ❌ BAD — printer interface forces fax capability on simple printers
class Printer(ABC):
    @abstractmethod
    def print(self, document: str) -> None: ...
    @abstractmethod
    def scan(self, document: str) -> str: ...
    @abstractmethod
    def fax(self, document: str) -> str: ...


class SimplePrinter(Printer):
    """Violates ISP — SimplePrinter must implement scan() and fax()
       even though it cannot perform those operations."""
    def print(self, document: str) -> None:
        print(f"Printing: {document}")

    def scan(self, document: str) -> str:
        raise NotImplementedError("SimplePrinter cannot scan")

    def fax(self, document: str) -> str:
        raise NotImplementedError("SimplePrinter cannot fax")


# ✅ GOOD — Small, focused interfaces
class PrintCapability(ABC):
    @abstractmethod
    def print(self, document: str) -> None: ...


class ScanCapability(ABC):
    @abstractmethod
    def scan(self, document: str) -> str: ...


class FaxCapability(ABC):
    @abstractmethod
    def fax(self, document: str) -> str: ...


class SimplePrinter(PrintCapability):
    """Only implements what it supports."""
    def print(self, document: str) -> None:
        print(f"Printing: {document}")


class MultifunctionPrinter(PrintCapability, ScanCapability, FaxCapability):
    def print(self, document: str) -> None:
        print(f"Printing: {document}")

    def scan(self, document: str) -> str:
        return f"Scanned: {document}"

    def fax(self, document: str) -> str:
        return f"Faxed: {document}"


# Clients depend only on the interfaces they need:
def print_document(doc: PrintCapability, document: str) -> None:
    doc.print(document)
```

---

### Dependency Inversion Principle (DIP)

High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details — details should depend on abstractions.

```python
# ❌ BAD — high-level module depends on low-level concretions
class UserService:
    def __init__(self) -> None:
        self._db = MySQLDatabase()  # Direct dependency on specific database

    def find_user(self, user_id: int) -> "User | None":
        return self._db.query(f"SELECT * FROM users WHERE id = {user_id}")


# ✅ GOOD — Both depend on an abstraction
from abc import ABC, abstractmethod


class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: int) -> "User | None": ...


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    def find_user(self, user_id: int) -> "User | None":
        return self._repository.find_by_id(user_id)


class MySQLUserRepository(UserRepository):
    def find_by_id(self, user_id: int) -> "User | None":
        return mysql_db.query("SELECT * FROM users WHERE id = ?", [user_id])


class InMemoryUserRepository(UserRepository):
    """Easy to use for testing."""
    def __init__(self) -> None:
        self._store: dict[int, "User"] = {}

    def find_by_id(self, user_id: int) -> "User | None":
        return self._store.get(user_id)


# Testing becomes trivial:
# service = UserService(InMemoryUserRepository())
```

---

## DRY and YAGNI

### DRY (Don't Repeat Yourself)

DRY means that every piece of knowledge must have a single, unambiguous, authoritative representation within a system. Abstract shared behavior, but do not abstract prematurely.

```python
# ❌ BAD — duplicated validation logic across multiple methods
class UserValidator:
    def validate_email(self, email: str) -> bool:
        if not email:
            return False
        if "@" not in email:
            return False
        if "." not in email.split("@")[-1]:
            return False
        return True

    def validate_username(self, username: str) -> bool:
        if not username:
            return False
        if "@" not in username:
            return False
        if "." not in username.split("@")[-1]:
            return False
        return True


# ✅ GOOD — Extracted shared validation logic
class UserValidator:
    def _is_non_empty_string(self, value: str) -> bool:
        return bool(value and value.strip())

    def _contains_at_sign(self, value: str) -> bool:
        return "@" in value

    def _has_valid_tld(self, value: str) -> bool:
        domain = value.split("@")[-1]
        return "." in domain

    def validate_email(self, email: str) -> bool:
        return (self._is_non_empty_string(email)
                and self._contains_at_sign(email)
                and self._has_valid_tld(email))

    def validate_username(self, username: str) -> bool:
        # Username validation might differ — don't force it to use email logic
        return (self._is_non_empty_string(username)
                and len(username) >= 3
                and len(username) <= 30)
```

**Key insight:** DRY is not "never have two similar lines of code." It is "never have the same knowledge in two places." If two modules need the same business rule, extract it. If two modules need slightly different algorithms, keep them separate until a genuine commonality emerges.

---

### YAGNI (You Aren't Going to Need It)

YAGNI means do not add functionality until it is actually required. Every line of code added for a hypothetical future case is dead code that costs time to write, time to test, and cognitive load to maintain.

```python
# ❌ BAD — over-engineering for hypothetical use cases
class UserService:
    """Creates an abstraction layer for a simple user lookup —
       but the only current use case is in-memory lookup."""

    def __init__(self) -> None:
        self._cache: dict[str, "User"] = {}
        self._repository: "UserRepository" = MySQLUserRepository()
        self._event_bus: EventBus = EventBus()
        self._audit_logger: AuditLogger = AuditLogger()

    def find_user(self, user_id: str) -> "User | None":
        # Why cache if we only call this once during startup?
        if user_id in self._cache:
            return self._cache[user_id]

        user = self._repository.find_by_id(user_id)
        self._cache[user_id] = user

        # Why publish an event for a read operation?
        self._event_bus.publish("user.found", {"user_id": user_id})

        # Why log an audit trail for a query?
        self._audit_logger.log(f"User lookup: {user_id}")

        return user


# ✅ GOOD — YAGNI: only what is needed now
class UserService:
    """Simple user service — meets current requirements only."""

    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    def find_user(self, user_id: str) -> "User | None":
        return self._repository.find_by_id(user_id)


# When caching becomes a genuine requirement (measured performance bottleneck),
# add it then. When auditing becomes required, add it then.
# Until then: no abstraction without a concrete second use case.
```

**YAGNI decision framework:**

| Scenario | Action |
|---|---|
| Code works, one caller, no known second use case | Do not abstract |
| Code works, two callers with identical logic | Extract shared method |
| Code works, two callers with similar but diverging logic | Duplicate for now, extract when third case emerges |
| Abstraction reduces complexity for current code | Apply it — YAGNI is about future features, not current clarity |

---

## Constraints

### MUST DO

- Always start by identifying the change point — patterns solve specific change problems, not hypothetical ones
- Prefer composition over inheritance (Open/Closed Principle)
- Apply Single Responsibility strictly: one class, one reason to change
- Use Dependency Injection to invert dependencies on concrete implementations
- Make interfaces small and client-specific (Interface Segregation Principle)
- Ensure subclasses are substitutable for their base classes (Liskov Substitution)
- Write unit tests for each concrete class independently
- Name classes and methods to reflect their intent, not their implementation
- Keep inheritance hierarchies at 2–3 levels maximum
- Use Protocol or ABC for interfaces in Python — never a bare dict or string as an API contract
- When a pattern solves the problem, the code should be simpler than the alternative — not more complex

### MUST NOT DO

- Use a design pattern without a clear problem that it solves (YAGNI)
- Create an inheritance hierarchy deeper than 3 levels
- Use Singleton for shared state — it hides dependencies and prevents testing
- Implement the Observer pattern with manual notification calls
- Use the Strategy pattern for simple if/else logic that won't change
- Add a facade, proxy, or decorator without an actual architectural need
- Let concrete implementations leak into high-level business logic
- Create interfaces solely to satisfy DIP — only abstract what actually varies
- Use abstract base classes for everything — prefer explicit types until composition needs abstraction
- Treat DRY as "never duplicate two lines of code" — abstract when the knowledge is shared, not when the syntax is similar
- Apply patterns because they are "good practice" — apply them because the problem demands it

---

## Output Template

When implementing or reviewing architecture, produce:

1. **Problem Analysis** — What changes? What stays stable? What is the core architectural challenge? Identify the specific change point(s) that drive pattern selection.

2. **SOLID Assessment** — Which SOLID principles apply and how the design satisfies each. Explicitly call out any principle that is deliberately relaxed and why.

3. **Pattern Selection** — Which GoF pattern (if any) and why, with reference to the specific problem. If no pattern applies, explain why YAGNI takes precedence.

4. **Implementation** — Typed Python code with BAD/GOOD contrast showing the applied pattern. Include docstrings, type hints, and error handling.

5. **YAGNI Check** — Explicit statement of what was NOT added and why. Every abstraction should have a justified second use case or a proven necessity.

6. **Testing Strategy** — How each component is unit-tested in isolation. Show how dependency inversion enables mocking.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `test-driven-development` | Ensures patterns are designed for testability from the start |
| `refactoring` | Apply patterns incrementally to existing codebases |
| `code-review` | Validate pattern usage against best practices |
| `modular-design` | Broader module decomposition beyond patterns |
