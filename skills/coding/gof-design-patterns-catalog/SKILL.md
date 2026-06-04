---
name: gof-design-patterns-catalog
description: Comprehensive catalog of all 23 GoF design patterns with Python implementations covering creational, structural, and behavioral patterns for decoupling and extensible software design.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gof design patterns, gang of four, factory method, strategy pattern, decorator pattern, observer pattern, SOLID principles, design catalog
  archetypes:
    - tactical
    - generation
    - educational
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: design-pattern-selection, structural-design-patterns, creational-design-patterns, behavioral-design-patterns
---

# GoF Design Patterns Catalog

Senior software architect implementing all 23 Gang of Four (GoF) design patterns in Python with typed signatures and real-world examples. This skill makes the model classify problems into creational, structural, or behavioral families, select the most appropriate pattern, and produce concrete implementations that respect SOLID principles — favoring composition over inheritance, single responsibility, and open/closed extensibility.

## TL;DR Checklist

- [ ] Classify the problem: creation bottleneck → creational, composition challenge → structural, interaction complexity → behavioral
- [ ] Identify the independent change point — patterns belong where things vary
- [ ] Prefer composition and `typing.Protocol` interfaces over deep inheritance hierarchies
- [ ] Use Protocol or ABC for all pattern abstractions to enforce LSP compliance
- [ ] Keep each class responsible for exactly one reason to change (SRP)
- [ ] Validate that new behaviors can be added without modifying existing code (OCP)
- [ ] Prefer explicit `__init__` parameters over implicit global state (Singleton antipattern)

---

## When to Use

Use this skill when:

- A class is doing too much and needs to delegate responsibility to a separate pattern
- You need to add behavior to objects dynamically without creating new subclasses
- Object creation logic is scattered across many `if/elif` branches or factory functions
- Multiple classes share a common interface but have incompatible implementations (Adapter)
- You need to decouple an abstraction from its implementation so both can evolve independently (Bridge)
- A complex subsystem needs a simplified entry point for callers (Facade)
- You are designing event-driven systems with publishers and subscribers (Observer)

---

## When NOT to Use

Avoid GoF patterns when:

- Python's built-in features already solve the problem (use `@classmethod` instead of Singleton, use dataclasses/Attrs instead of Builder for simple value objects)
- A function with well-defined parameters is clearer than a pattern hierarchy (YAGNI)
- You are building a small script or prototype where the overhead exceeds the benefit
- Dependency Injection can solve the coupling problem without introducing indirection

---

## Core Workflow

1. **Classify the problem** — Determine if it is a creation bottleneck (creational), composition challenge (structural), or interaction complexity (behavioral). **Checkpoint:** Does a single pattern solve it, or do multiple patterns compose? Creational patterns answer "how to create," structural patterns answer "how to compose," behavioral patterns answer "how objects communicate."

2. **Select the most specific pattern** — Match against the GoF catalog: Creational (Factory Method, Abstract Factory, Builder, Prototype, Singleton), Structural (Adapter, Bridge, Composite, Decorator, Facade, Proxy, Flyweight), Behavioral (Observer, State, Strategy, Command, Template Method, Mediator, Chain of Responsibility, Iterator, Visitor, Memento, Interpreter). **Checkpoint:** Is the selected pattern the simplest one that solves the problem? If three patterns apply, choose the one with the fewest classes.

3. **Implement with SOLID constraints** — Write concrete implementations using `typing.Protocol` or ABCs for abstractions. Enforce Single Responsibility by ensuring each class has one reason to change and Open/Closed by designing interfaces that allow new behavior via composition rather than modification. **Checkpoint:** Can you add a new concrete strategy, decorator, or state without modifying existing code?

4. **Compose patterns where needed** — Real systems often layer multiple patterns: a Builder creates complex objects, Facade simplifies the subsystem, Observer notifies listeners of state changes. **Checkpoint:** Does the composition remain intuitive, or does indirection make the code harder to trace?

---

## Pattern Reference Guide

### Creational Patterns

#### Factory Method

Defines an interface for creating a single object but lets subclasses decide which concrete class to instantiate. The creator delegates instantiation to subclasses.

```python
from abc import ABC, abstractmethod
from typing import Protocol


class Notification(Protocol):
    def send(self, recipient: str, message: str) -> None: ...


class EmailNotification:
    def send(self, recipient: str, message: str) -> None:
        print(f"📧 Email to {recipient}: {message}")


class SlackNotification:
    def send(self, recipient: str, message: str) -> None:
        print(f"💬 Slack to {recipient}: {message}")


class NotificationFactory(ABC):
    @abstractmethod
    def create_notification(self) -> Notification: ...

    def notify(self, recipient: str, message: str) -> None:
        notification = self.create_notification()
        notification.send(recipient, message)


class EmailFactory(NotificationFactory):
    def create_notification(self) -> Notification:
        return EmailNotification()


class SlackFactory(NotificationFactory):
    def create_notification(self) -> Notification:
        return SlackNotification()
```

Use when: Subclasses must decide the concrete product type. Not when a single factory can handle all cases — use Abstract Factory instead.

#### Abstract Factory

Creates families of related or dependent objects without specifying their concrete classes. Ideal when systems must support multiple product families (e.g., UI themes, database backends).

```python
from abc import ABC, abstractmethod
from typing import Protocol


class Button(Protocol):
    def render(self) -> str: ...


class Checkbox(Protocol):
    def render(self) -> str: ...


class ModernButton:
    def render(self) -> str: return "ModernButton"


class ModernCheckbox:
    def render(self) -> str: return "ModernCheckbox"


class RetroButton:
    def render(self) -> str: return "RetroButton"


class RetroCheckbox:
    def render(self) -> str: return "RetroCheckbox"


class GuiFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...

    @abstractmethod
    def create_checkbox(self) -> Checkbox: ...


class ModernGuiFactory(GuiFactory):
    def create_button(self) -> Button: return ModernButton()
    def create_checkbox(self) -> Checkbox: return ModernCheckbox()


class RetroGuiFactory(GuiFactory):
    def create_button(self) -> Button: return RetroButton()
    def create_checkbox(self) -> Checkbox: return RetroCheckbox()
```

Use when: You need families of related products. Avoid if you only create one type of object — use Factory Method instead.

#### Builder

Separates the construction of a complex object from its representation so the same construction process can create different representations. Essential for objects with many optional parameters.

```python
from typing import Optional


class HttpRequestBuilder:
    """Builds HTTP request configurations step by step."""

    def __init__(self, method: str = "GET", url: str = "") -> None:
        self._method = method
        self._url = url
        self._headers: dict[str, str] = {}
        self._body: Optional[str] = None
        self._timeout: int = 30

    def with_method(self, method: str) -> "HttpRequestBuilder":
        self._method = method.upper()
        return self

    def with_url(self, url: str) -> "HttpRequestBuilder":
        self._url = url
        return self

    def with_header(self, key: str, value: str) -> "HttpRequestBuilder":
        self._headers[key] = value
        return self

    def with_body(self, body: str) -> "HttpRequestBuilder":
        self._body = body
        return self

    def with_timeout(self, seconds: int) -> "HttpRequestBuilder":
        self._timeout = seconds
        return self

    def build(self) -> dict:
        return {
            "method": self._method,
            "url": self._url,
            "headers": self._headers,
            "body": self._body,
            "timeout": self._timeout,
        }


# Usage: request = HttpRequestBuilder().with_method("POST").with_url("/api").with_body('{"k":"v"}').build()
```

Use when: Object construction requires many optional parameters or a multi-step setup. Prefer to dataclasses for simple value objects.

#### Prototype

Creates new objects by copying an existing instance (clone) rather than constructing from scratch. Useful when object creation is expensive or complex.

```python
import copy
from typing import Any


class DocumentTemplate:
    """Expensive-to-create document that can be cloned with modifications."""

    def __init__(self, title: str, sections: list[dict[str, Any]]) -> None:
        self.title = title
        # Deep copy sections so clones are independent
        self.sections = copy.deepcopy(sections)

    def add_section(self, name: str, content: str) -> None:
        self.sections.append({"name": name, "content": content})

    def clone(self) -> "DocumentTemplate":
        return copy.deepcopy(self)

    def __repr__(self) -> str:
        return f"DocumentTemplate('{self.title}', {len(self.sections)} sections)"
```

Use when: Creating objects from scratch is expensive, or you want to avoid subclass hierarchies. Python's `copy.deepcopy` handles most Prototype use cases natively.

#### Singleton

Ensures a class has exactly one instance and provides a global access point. Use sparingly — it introduces implicit coupling and hinders testability. Prefer dependency injection for shared resources.

```python
from typing import TypeVar, Generic


T = TypeVar("T")


class Singleton(Generic[T]):
    """Thread-safe singleton base class using metaclass."""

    _instances: dict["type", object] = {}

    def __new__(cls: type[T], *args: Any, **kwargs: Any) -> T:
        if cls not in cls._instances:
            instance = super().__new__(cls)
            cls._instances[cls] = instance
        return cls._instances[cls]


class Config(Singleton):
    """Application configuration — only one instance ever."""

    def __init__(self) -> None:
        if hasattr(self, "_initialized"):
            return  # Already initialized from prior instantiation
        self._values: dict[str, str] = {}
        self._initialized = True

    def get(self, key: str, default: str = "") -> str:
        return self._values.get(key, default)

    def set(self, key: str, value: str) -> None:
        self._values[key] = value


# Usage: config = Config(); config.set("db_host", "localhost")
```

Use when: A single global resource is needed (config store, connection pool). Avoid for mutable shared state — use dependency injection instead.

---

### Structural Patterns

#### Adapter

Converts one interface to another so incompatible interfaces can work together. Wraps an existing class to match a client's expected interface.

```python
from abc import ABC, abstractmethod
from typing import Protocol


class OldPaymentGateway(ABC):
    """Third-party payment system with legacy interface."""

    @abstractmethod
    def process_payment(self, amount: float, currency: str) -> bool: ...


class NewPaymentGateway(Protocol):
    """Our standardized payment interface."""

    @abstractmethod
    def charge(self, cents: int, currency_code: str) -> bool: ...


class LegacyAdapter(NewPaymentGateway):
    """Adapts OldPaymentGateway to the NewPaymentGateway interface."""

    def __init__(self, gateway: OldPaymentGateway) -> None:
        self._gateway = gateway

    def charge(self, cents: int, currency_code: str) -> bool:
        amount = cents / 100.0
        return self._gateway.process_payment(amount, currency_code)


# Usage: adapter = LegacyAdapter(stripe_client); adapter.charge(9999, "USD")
```

Use when: Integrating third-party libraries with incompatible interfaces, or migrating between systems incrementally.

#### Bridge

Decouples an abstraction from its implementation so both can vary independently. Unlike Adapter (which fixes incompatibility after the fact), Bridge is designed in from the start.

```python
from abc import ABC, abstractmethod


class RenderingEngine(ABC):
    """Abstract rendering backend."""

    @abstractmethod
    def render_circle(self, x: float, y: float, radius: float) -> None: ...


class VectorEngine(RenderingEngine):
    def render_circle(self, x: float, y: float, radius: float) -> None:
        print(f"Drawing vector circle at ({x}, {y}) r={radius}")


class RasterEngine(RenderingEngine):
    def render_circle(self, x: float, y: float, radius: float) -> None:
        print(f"Drawing raster circle at ({x}, {y}) r={radius}")


class Shape(ABC):
    """Abstraction — composed with an implementation."""

    def __init__(self, engine: RenderingEngine) -> None:
        self._engine = engine

    @abstractmethod
    def draw(self) -> None: ...


class Circle(Shape):
    def __init__(self, x: float, y: float, radius: float, engine: RenderingEngine) -> None:
        super().__init__(engine)
        self._x = x
        self._y = y
        self._radius = radius

    def draw(self) -> None:
        self._engine.render_circle(self._x, self._y, self._radius)


# Usage: Circle(10, 20, 5, VectorEngine()).draw()  → vector circle
# Usage: Circle(10, 20, 5, RasterEngine()).draw()  → raster circle
```

Use when: Both abstraction and implementation need to evolve independently. The key distinction from Adapter: Bridge is intentional design from the start.

#### Composite

Composes objects into tree structures to represent part-whole hierarchies. Clients treat individual objects and compositions uniformly.

```python
from abc import ABC, abstractmethod
from typing import List


class Component(ABC):
    @abstractmethod
    def operation(self) -> str: ...

    @abstractmethod
    def add(self, component: "Component") -> None: ...

    @abstractmethod
    def remove(self, component: "Component") -> None: ...

    @abstractmethod
    def is_leaf(self) -> bool: ...


class Leaf(Component):
    def __init__(self, name: str) -> None:
        self._name = name

    def operation(self) -> str:
        return f"Leaf({self._name})"

    def add(self, component: Component) -> None:
        raise NotImplementedError("Leaf cannot have children")

    def remove(self, component: Component) -> None:
        raise NotImplementedError("Leaf cannot be removed from parent")

    def is_leaf(self) -> bool:
        return True


class Composite(Component):
    def __init__(self, name: str) -> None:
        self._name = name
        self._children: List[Component] = []

    def operation(self) -> str:
        results = [child.operation() for child in self._children]
        return f"Composite({self._name}: {', '.join(results)})"

    def add(self, component: Component) -> None:
        self._children.append(component)

    def remove(self, component: Component) -> None:
        self._children.remove(component)

    def is_leaf(self) -> bool:
        return False


# Usage: root = Composite("root"); root.add(Leaf("file1")); root.add(Composite("dir").add(Leaf("file2")))
```

Use when: Representing tree-like part-whole structures (file systems, UI component trees, org charts). Not for flat lists with no hierarchy.

#### Decorator

Attaches additional responsibilities to objects dynamically without altering their class. Provides a flexible alternative to subclassing for behavioral extension.

```python
from abc import ABC, abstractmethod


class Notification(ABC):
    @abstractmethod
    def send(self, recipient: str) -> str: ...


class EmailNotification(Notification):
    def send(self, recipient: str) -> str:
        return f"Email sent to {recipient}"


class NotificationDecorator(Notification):
    def __init__(self, notification: Notification) -> None:
        self._notification = notification

    def send(self, recipient: str) -> str:
        return self._notification.send(recipient)


class LoggingDecorator(NotificationDecorator):
    def send(self, recipient: str) -> str:
        print(f"→ Sending notification to {recipient}")
        result = super().send(recipient)
        print(f"← Result: {result}")
        return result


class RetryDecorator(NotificationDecorator):
    def __init__(self, notification: Notification, max_retries: int = 3) -> None:
        super().__init__(notification)
        self._max_retries = max_retries

    def send(self, recipient: str) -> str:
        for attempt in range(1, self._max_retries + 1):
            try:
                return super().send(recipient)
            except Exception as e:
                if attempt == self._max_retries:
                    raise RuntimeError(f"Failed after {self._max_retries} retries: {e}")


# Usage: decorated = RetryDecorator(LoggingDecorator(EmailNotification()))
#        decorated.send("user@example.com")
```

Use when: Adding behavior dynamically (logging, retry, caching, auth). Avoid deep decorator chains (>3 layers) — consider composition instead.

#### Facade

Provides a simplified interface to a complex subsystem. Hides the complexity of multiple interrelated classes behind one clean entry point.

```python
class MediaDecoder:
    def decode(self, data: bytes) -> dict: return {"frames": 30, "fps": 24}


class AudioProcessor:
    def normalize(self, audio: bytes) -> bytes: return b"normalized"
    def convert_format(self, audio: bytes, fmt: str) -> bytes: return f"converted_{fmt}".encode()


class VideoRenderer:
    def render(self, frames: dict) -> str: return "rendered_video_frame"


class MediaFacade:
    """Simplified interface for complex media processing pipeline."""

    def process_media(self, data: bytes, audio_format: str = "mp3") -> dict:
        decoded = MediaDecoder().decode(data)
        normalized = AudioProcessor().normalize(data)
        converted = AudioProcessor().convert_format(normalized, audio_format)
        rendered = VideoRenderer().render(decoded)
        return {
            "frames": rendered,
            "audio": converted.decode(),
            "fps": decoded["fps"],
        }


# Usage: result = MediaFacade().process_media(raw_bytes)  # single call instead of 4 subsystem calls
```

Use when: A subsystem has many interdependent classes and callers need a simplified entry point. The Facade does not encapsulate — it delegates.

#### Proxy

Controls access to another object, providing a placeholder or surrogate. Common uses: lazy initialization, access control, caching, remote references.

```python
from typing import Optional


class Image(ABC):
    @abstractmethod
    def display(self) -> None: ...


class RealImage(Image):
    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        # Simulate expensive loading
        print(f"  Loading image from {filepath}")
        self._data = f"<image_data:{filepath}>"

    def display(self) -> None:
        print(f"Displaying {self._filepath}: {self._data}")


class ImageProxy(Image):
    """Lazy-loading proxy for expensive RealImage objects."""

    def __init__(self, filepath: str) -> None:
        self._filepath = filepath
        self._real_image: Optional[RealImage] = None

    def display(self) -> None:
        if self._real_image is None:
            self._real_image = RealImage(self._filepath)
        self._real_image.display()


# Usage: proxy = ImageProxy("photo.png")  # no loading yet
#        proxy.display()  # loads on first access only
```

Use when: Object creation/access is expensive, you need access control, or lazy initialization. A Proxy controls *access* — a Facade simplifies *interface*.

#### Flyweight

Shares common state between multiple objects to reduce memory footprint. Separates intrinsic (shared, immutable) state from extrinsic (unique, caller-managed) state.

```python
from typing import Dict


class ForestType:
    """Intrinsic state — shared across all trees of the same species."""

    def __init__(self, name: str, leaf_density: float, color: str) -> None:
        self._name = name
        self._leaf_density = leaf_density
        self._color = color

    def render(self, x: float, y: float, scale: float) -> str:
        return (f"🌳 {self._name} at ({x}, {y}) scale={scale} "
                f"density={self._leaf_density:.1%} color={self._color}")


class ForestFactory:
    """Flyweight factory that caches and reuses shared forest types."""

    _forest_types: Dict[str, ForestType] = {}

    @classmethod
    def get_forest_type(cls, name: str, leaf_density: float, color: str) -> ForestType:
        key = f"{name}_{leaf_density:.2f}_{color}"
        if key not in cls._forest_types:
            cls._forest_types[key] = ForestType(name, leaf_density, color)
        return cls._forest_types[key]


# Usage: oak = ForestFactory.get_forest_type("oak", 0.85, "green")
#        pine = ForestFactory.get_forest_type("pine", 0.60, "dark_green")
```

Use when: Creating many objects with shared state, and memory is a concern. Not worth it for small object counts — the caching overhead negates savings.

---

### Behavioral Patterns

#### Observer

Defines a one-to-many dependency so when one object changes state, all dependents are notified. Foundation of event-driven architectures in Python.

```python
from typing import Callable, List


class Observer:
    """Interface for subscribers."""
    def update(self, sender: object, data: dict) -> None: ...


class Subject:
    """Maintains a list of observers and notifies them of state changes."""

    def __init__(self) -> None:
        self._observers: List[Observer] = []
        self._data: dict = {}

    def attach(self, observer: Observer) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def notify(self) -> None:
        for observer in self._observers:
            observer.update(self, dict(self._data))

    @property
    def data(self) -> dict:
        return self._data

    @data.setter
    def data(self, value: dict) -> None:
        self._data = value
        self.notify()


class PriceAlert(Observer):
    """React to price changes."""

    def __init__(self, threshold: float) -> None:
        self._threshold = threshold

    def update(self, sender: object, data: dict) -> None:
        current_price = data.get("price", 0)
        if abs(current_price - self._threshold) < 0.01:
            print(f"⚠️ Price alert: {current_price} ≈ threshold {self._threshold}")


# Usage: subject = Subject(); observer = PriceAlert(150.0); subject.attach(observer); subject.data = {"price": 149.99}
```

Use when: One-to-many dependencies exist, event-driven systems need publishers/subscribers. Python's `asyncio` EventLoop and `functools.wraps` often provide simpler alternatives for simple cases.

#### State

Allows an object to alter its behavior when its internal state changes. The object appears to change class. Ideal for finite state machines (order lifecycle, workflow stages).

```python
from abc import ABC, abstractmethod


class OrderState(ABC):
    @abstractmethod
    def confirm(self) -> str: ...

    @abstractmethod
    def ship(self) -> str: ...

    @abstractmethod
    def cancel(self) -> str: ...

    @abstractmethod
    def deliver(self) -> str: ...


class PendingState(OrderState):
    def confirm(self) -> str: return "Processing"
    def ship(self) -> str: raise RuntimeError("Cannot ship pending order")
    def cancel(self) -> str: return "Cancelled"
    def deliver(self) -> str: raise RuntimeError("Cannot deliver pending order")


class ProcessingState(OrderState):
    def confirm(self) -> str: raise RuntimeError("Already confirmed")
    def ship(self) -> str: return "Shipped"
    def cancel(self) -> str: return "Cancelled"
    def deliver(self) -> str: raise RuntimeError("Cannot deliver processing order")


class ShippedState(OrderState):
    def confirm(self) -> str: raise RuntimeError("Already shipped")
    def ship(self) -> str: raise RuntimeError("Already shipped")
    def cancel(self) -> str: raise RuntimeError("Cannot cancel shipped order")
    def deliver(self) -> str: return "Delivered"


class CancelledState(OrderState):
    def confirm(self) -> str: raise RuntimeError("Order is cancelled")
    def ship(self) -> str: raise RuntimeError("Order is cancelled")
    def cancel(self) -> str: raise RuntimeError("Already cancelled")
    def deliver(self) -> str: raise RuntimeError("Cannot deliver cancelled order")


class Order:
    """Context — delegates behavior to current state object."""

    def __init__(self) -> None:
        self._state: OrderState = PendingState()
        self._status: str = "Pending"

    @property
    def status(self) -> str:
        return self._status

    def _transition(self, new_state_str: str) -> None:
        state_map = {
            "Processing": ProcessingState(),
            "Shipped": ShippedState(),
            "Cancelled": CancelledState(),
            "Delivered": CancelledState(),  # terminal state
        }
        self._state = state_map[new_state_str]
        self._status = new_state_str

    def confirm(self) -> None:
        self._transition(self._state.confirm())

    def ship(self) -> None:
        self._transition(self._state.ship())

    def cancel(self) -> None:
        self._transition(self._state.cancel())

    def deliver(self) -> None:
        self._transition(self._state.deliver())


# Usage: order = Order(); order.confirm() → Processing; order.ship() → Shipped; order.deliver() → Cancelled (terminal)
```

Use when: Object behavior depends on internal state and transitions between well-defined states. For complex state machines with many transitions, consider a dedicated library like `transitions`.

#### Strategy

Defines a family of algorithms, encapsulates each, and makes them interchangeable at runtime. The client chooses the strategy without knowing its internals — classic Open/Closed Principle application.

```python
from abc import ABC, abstractmethod


class PricingStrategy(ABC):
    @abstractmethod
    def calculate(self, subtotal: float) -> float: ...


class FlatDiscount(PricingStrategy):
    def __init__(self, discount_pct: float) -> None:
        self._discount_pct = discount_pct

    def calculate(self, subtotal: float) -> float:
        return subtotal * (1 - self._discount_pct / 100.0)


class TieredDiscount(PricingStrategy):
    def __init__(self) -> None:
        self._tiers = [(100, 0.05), (500, 0.10), (1000, 0.15)]

    def calculate(self, subtotal: float) -> float:
        applicable = max(tier for tier in self._tiers if subtotal >= tier[0])
        return subtotal * (1 - applicable[1])


class VolumePricing(PricingStrategy):
    def __init__(self, base_price: float) -> None:
        self._base_price = base_price

    def calculate(self, quantity: int) -> float:
        if quantity > 50:
            return self._base_price * quantity * 0.85
        elif quantity > 20:
            return self._base_price * quantity * 0.95
        return self._base_price * quantity


class ShoppingCart:
    """Context — uses any strategy without knowing which."""

    def __init__(self, strategy: PricingStrategy) -> None:
        self._strategy = strategy
        self._items: list[dict] = []

    def add_item(self, name: str, price: float, quantity: int = 1) -> None:
        self._items.append({"name": name, "price": price, "quantity": quantity})

    def total(self) -> float:
        subtotal = sum(item["price"] * item["quantity"] for item in self._items)
        return self._strategy.calculate(subtotal if isinstance(self._strategy, FlatDiscount | TieredDiscount) else 1.0)


# Usage: cart = ShoppingCart(FlatDiscount(15)); cart.total() → discounted total
```

Use when: You have multiple interchangeable algorithms and need to switch at runtime. The Strategy pattern eliminates `if/elif` chains that select algorithm behavior.

#### Command

Encapsulates a request as an object, enabling parameterized clients, queuing, logging, and undo operations. Turns method calls into first-class objects.

```python
from abc import ABC, abstractmethod


class Command(ABC):
    @abstractmethod
    def execute(self) -> str: ...

    @abstractmethod
    def undo(self) -> str: ...


class Light:
    def __init__(self, name: str) -> None:
        self._name = name

    def turn_on(self) -> str: return f"💡 {self._name} is ON"
    def turn_off(self) -> str: return f"🌑 {self._name} is OFF"


class TurnOnCommand(Command):
    def __init__(self, light: Light) -> None:
        self._light = light

    def execute(self) -> str: return self._light.turn_on()
    def undo(self) -> str: return self._light.turn_off()


class TurnOffCommand(Command):
    def __init__(self, light: Light) -> None:
        self._light = light

    def execute(self) -> str: return self._light.turn_off()
    def undo(self) -> str: return self._light.turn_on()


class RemoteControl:
    """Invoker — holds commands and executes them."""

    def __init__(self) -> None:
        self._history: list[Command] = []

    def press_button(self, command: Command) -> str:
        result = command.execute()
        self._history.append(command)
        return result

    def undo_last(self) -> str:
        if not self._history:
            return "Nothing to undo"
        last = self._history.pop()
        return last.undo()


# Usage: remote = RemoteControl(); remote.press_button(TurnOnCommand(Light("LivingRoom"))); remote.undo_last()
```

Use when: You need queuing, logging, or undo for operations. Every method call that needs these features is a candidate.

#### Template Method

Defines the skeleton of an algorithm in a base class but lets subclasses override specific steps without changing the overall structure. Classic inheritance-based pattern — prefer composition when possible.

```python
from abc import ABC, abstractmethod


class ReportGenerator(ABC):
    """Template Method: fixed pipeline, customizable data source."""

    def generate(self) -> list[str]:
        self._open_file()
        data = self._fetch_data()
        processed = self._transform(data)
        output = self._render(processed)
        self._close_file()
        return output

    def _open_file(self) -> None:
        print(f"Opening report file")

    @abstractmethod
    def _fetch_data(self) -> list[dict]: ...

    def _transform(self, data: list[dict]) -> list[dict]:
        """Default transform — override for custom logic."""
        return [row for row in data if row.get("active", False)]

    @abstractmethod
    def _render(self, data: list[dict]) -> list[str]: ...

    def _close_file(self) -> None:
        print(f"Closing report file")


class SalesReport(ReportGenerator):
    def _fetch_data(self) -> list[dict]:
        return [{"name": "Widget A", "active": True, "revenue": 1000},
                {"name": "Widget B", "active": False, "revenue": 500}]

    def _render(self, data: list[dict]) -> list[str]:
        return [f"Sales Report: {d['name']} → ${d['revenue']}" for d in data]


# Usage: report = SalesReport(); report.generate()  # follows fixed pipeline
```

Use when: Multiple classes share the same algorithm skeleton but differ in specific steps. In Python, prefer function composition and `functools.partial` as alternatives to inheritance.

#### Mediator

Centralizes complex communications and control between related objects. Reduces coupling by preventing objects from referencing each other directly — they communicate through the mediator instead.

```python
from typing import List


class ChatMediator:
    """Central hub for chat room participants."""

    def __init__(self) -> None:
        self._participants: List["ChatParticipant"] = []

    def register(self, participant: "ChatParticipant") -> None:
        if participant not in self._participants:
            self._participants.append(participant)

    def send_message(self, sender: "ChatParticipant", message: str) -> None:
        for p in self._participants:
            if p is not sender:
                p.receive(sender.name, message)


class ChatParticipant:
    """Colleague — communicates through the mediator."""

    def __init__(self, name: str, mediator: ChatMediator) -> None:
        self.name = name
        self._mediator = mediator

    def send(self, message: str) -> None:
        print(f"[{self.name} sends]: {message}")
        self._mediator.send_message(self, message)

    def receive(self, sender_name: str, message: str) -> None:
        print(f"  [{self.name} receives from {sender_name}]: {message}")


# Usage: mediator = ChatMediator()
#        alice = ChatParticipant("Alice", mediator); bob = ChatParticipant("Bob", mediator)
#        mediator.register(alice); mediator.register(bob)
#        alice.send("Hello!")  # Bob receives it through the mediator
```

Use when: Many objects communicate with many other objects (many-to-many). Not for simple publish/subscribe — use Observer instead. Mediator is for direct, controlled routing.

#### Chain of Responsibility

Passes a request along a chain of handlers. Each handler decides either to process the request or pass it to the next handler in the chain. Ideal for logging pipelines, authentication stacks, and middleware.

```python
from abc import ABC, abstractmethod
from typing import Optional


class Handler(ABC):
    def __init__(self) -> None:
        self._next: Optional[Handler] = None

    def set_next(self, handler: "Handler") -> "Handler":
        self._next = handler
        return handler  # enable fluent chaining

    def handle(self, request: str) -> Optional[str]:
        if self._next:
            return self._next.handle(request)
        return None


class AuthHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        if not request.startswith("Bearer "):
            return "401 Unauthorized: missing token"
        token = request[7:]
        if not token.isalnum():
            return "403 Forbidden: invalid token"
        return super().handle(request)  # pass to next


class LoggingHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        print(f"📋 Processing: {request}")
        return super().handle(request)


class RateLimitHandler(Handler):
    def __init__(self, max_per_minute: int = 60) -> None:
        super().__init__()
        self._max = max_per_minute
        self._count = 0

    def handle(self, request: str) -> Optional[str]:
        self._count += 1
        if self._count > self._max:
            return "429 Too Many Requests"
        return super().handle(request)


class ResponseHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        return f"200 OK: handled {request}"


# Usage: chain = LoggingHandler().set_next(RateLimitHandler()).set_next(ResponseHandler())
#        chain.handle("Bearer abc123")  # passes through each handler in order
```

Use when: Multiple handlers may process a request and the chain needs to be configurable at runtime. Python's `functools.wraps` middleware decorators provide an alternative for web frameworks.

#### Iterator

Provides sequential access to elements of a collection without exposing its underlying representation. Python's built-in iteration protocol (`__iter__`, `__next__`) makes explicit Iterator classes unnecessary in most cases.

```python
from typing import Iterator, TypeVar


T = TypeVar("T")


class Book:
    def __init__(self, title: str, pages: int) -> None:
        self.title = title
        self.pages = pages


class BookShelf:
    """Custom collection with explicit iteration protocol."""

    def __init__(self) -> None:
        self._books: list[Book] = []

    def add_book(self, book: Book) -> None:
        self._books.append(book)

    def __iter__(self) -> Iterator[Book]:
        return iter(self._books)  # delegate to built-in iterator


class ReverseBookShelf(BookShelf):
    """Custom reverse iteration — demonstrates custom protocol."""

    def __iter__(self) -> Iterator[Book]:
        return reversed(self._books)


# Usage: shelf = BookShelf(); shelf.add_book(Book("1984", 328))
#        for book in shelf: print(book.title)
#        for book in ReverseBookShelf(): print(book.title)  # reverse order
```

Use when: Building custom collections where the iteration order is non-trivial or needs to be varied. Python's built-in `__iter__` protocol handles most cases natively.

#### Visitor

Represents an operation to be performed on elements of a structure, allowing new operations without changing element classes. Enables double dispatch in single-dispatch languages like Python.

```python
from abc import ABC, abstractmethod


class Element(ABC):
    @abstractmethod
    def accept(self, visitor: "Visitor") -> None: ...


class Folder(Element):
    def __init__(self, name: str) -> None:
        self.name = name
        self.children: list[Element] = []

    def add(self, child: Element) -> None:
        self.children.append(child)

    def accept(self, visitor: "Visitor") -> None:
        visitor.visit_folder(self)
        for child in self.children:
            child.accept(visitor)


class File(Element):
    def __init__(self, name: str, size_bytes: int) -> None:
        self.name = name
        self.size_bytes = size_bytes

    def accept(self, visitor: "Visitor") -> None:
        visitor.visit_file(self)


class Visitor(ABC):
    @abstractmethod
    def visit_folder(self, folder: Folder) -> None: ...

    @abstractmethod
    def visit_file(self, file: File) -> None: ...


class SizeCalculator(Visitor):
    def __init__(self) -> None:
        self._total_bytes = 0

    def visit_folder(self, folder: Folder) -> None:
        pass  # accumulate from children via their accept() calls

    def visit_file(self, file: File) -> None:
        self._total_bytes += file.size_bytes

    @property
    def total_bytes(self) -> int:
        return self._total_bytes


class NameCollector(Visitor):
    def __init__(self) -> None:
        self._names: list[str] = []

    def visit_folder(self, folder: Folder) -> None:
        self._names.append(f"[DIR] {folder.name}")

    def visit_file(self, file: File) -> None:
        self._names.append(f"  {file.name} ({file.size_bytes} bytes)")


# Usage: root = Folder("project")
#        root.add(File("main.py", 2048)); root.add(Folder("src").add(File("app.py", 512)))
#        calc = SizeCalculator(); root.accept(calc); print(calc.total_bytes)
```

Use when: You need to perform many different operations on a fixed class hierarchy without modifying those classes. For simple traversals, use `for` loops directly.

#### Memento

Captures and externalizes an object's internal state so it can be restored later. The canonical implementation of undo functionality. The Caretaker (caller) holds the memento but never inspects its contents — only the Originator can read/write them.

```python
from typing import Any


class EditorState:
    """Memento — stores internal state, immutable from outside."""

    def __init__(self, content: str, cursor_pos: int, undo_stack_size: int) -> None:
        self._content = content
        self._cursor_pos = cursor_pos
        self._undo_stack_size = undo_stack_size

    @property
    def content(self) -> str: return self._content
    @property
    def cursor_pos(self) -> int: return self._cursor_pos


class TextEditor:
    """Originator — creates and restores mementos."""

    def __init__(self) -> None:
        self._content: str = ""
        self._cursor_pos: int = 0

    def type(self, text: str) -> None:
        self._content += text
        self._cursor_pos = len(self._content)

    def create_memento(self) -> EditorState:
        return EditorState(self._content, self._cursor_pos, 0)

    def restore_memento(self, memento: EditorState) -> None:
        self._content = memento.content
        self._cursor_pos = memento.cursor_pos

    @property
    def content(self) -> str:
        return self._content


class UndoManager:
    """Caretaker — stores and retrieves mementos without inspecting them."""

    def __init__(self) -> None:
        self._mementos: list[EditorState] = []

    def save(self, editor: TextEditor) -> None:
        self._mementos.append(editor.create_memento())

    def undo(self, editor: TextEditor) -> bool:
        if not self._mementos:
            return False
        editor.restore_memento(self._mementos.pop())
        return True


# Usage: editor = TextEditor(); manager = UndoManager()
#        editor.type("Hello"); manager.save(editor); editor.type(" World")
#        manager.undo(editor); print(editor.content)  # "Hello"
```

Use when: Implementing undo/redo, transaction rollback, or state snapshots. Only use if you need to restore *full* internal state — not just a single value.

#### Interpreter

Defines a grammar for a language and interprets sentences according to that grammar. In Python, `eval()`, `ast.literal_eval`, and template engines already solve most interpretation needs. Use this pattern only for custom domain-specific languages.

```python
from abc import ABC, abstractmethod


class Expression(ABC):
    @abstractmethod
    def interpret(self, context: dict) -> int: ...


class Number(Expression):
    def __init__(self, value: int) -> None:
        self._value = value

    def interpret(self, context: dict) -> int:
        return self._value


class Variable(Expression):
    def __init__(self, name: str) -> None:
        self._name = name

    def interpret(self, context: dict) -> int:
        if self._name not in context:
            raise NameError(f"Undefined variable: {self._name}")
        return context[self._name]


class Add(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left = left
        self._right = right

    def interpret(self, context: dict) -> int:
        return self._left.interpret(context) + self._right.interpret(context)


class Subtract(Expression):
    def __init__(self, left: Expression, right: Expression) -> None:
        self._left = left
        self._right = right

    def interpret(self, context: dict) -> int:
        return self._left.interpret(context) - self._right.interpret(context)


# Usage: expr = Add(Number(10), Subtract(Variable("x"), Number(3)))
#        result = expr.interpret({"x": 20})  # 10 + (20 - 3) = 27
```

Use when: Building a domain-specific language or expression evaluator. Python's `ast` module and `eval()` cover most interpretation needs — only build a custom interpreter for truly custom grammars.

---

## Constraints

### MUST DO

- Reference SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) when selecting and implementing each pattern
- Use `typing.Protocol` or `abc.ABC` for all abstractions to enforce type safety at runtime
- Write concrete, runnable Python examples with type hints and docstrings — no placeholder code or pseudocode
- Prefer composition over deep inheritance hierarchies; use the Decorator pattern for dynamic behavior extension rather than subclassing
- Include BAD vs. GOOD example pairs when demonstrating patterns where common mistakes exist (Singleton, Adapter, Template Method)
- Validate that each implementation follows the Single Responsibility Principle — if a class does two things, split it
- When using Creational patterns, prefer factory functions and `dataclasses` over verbose pattern implementations for simple objects

### MUST NOT DO

- Use Singleton as a replacement for dependency injection or global configuration management
- Create inheritance hierarchies deeper than 3 levels — this violates Liskov Substitution and makes the code fragile
- Implement the Template Method pattern with more than one abstract method without strong justification — prefer composition and Strategy
- Add patterns to solve problems that Python already handles natively (use `__iter__` instead of custom Iterator for standard collections, use dataclasses instead of Builder for value objects)
- Create a Facade class that becomes a "god object" containing business logic — a Facade should only delegate, never implement domain rules
- Implement the Mediator pattern when Observer (publish/subscribe) would suffice — Mediator is for direct routing, not event broadcasting
- Use Visitor for simple traversals where a plain `for` loop or list comprehension suffices

---

## Output Template

When applying this skill to a problem, produce:

1. **Problem Classification** — State whether the problem is creational, structural, or behavioral, and justify the classification in one sentence.
2. **Selected Pattern(s)** — Name the pattern(s) with rationale: why this pattern fits and why similar patterns were rejected. If multiple patterns compose (e.g., Builder + Facade), explain the composition.
3. **Implementation Code** — Provide a complete, runnable Python implementation using `typing` module type hints and docstrings. Include at least one BAD vs. GOOD example when common pitfalls exist for the selected pattern.
4. **SOLID Compliance Check** — Verify each SOLID principle: Single Responsibility (one reason to change), Open/Closed (extensible without modification), Liskov Substitution (subclasses are substitutable), Interface Segregation (no fat interfaces), Dependency Inversion (depends on abstractions).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-pattern-selection` | Evaluates specific problems to select the best GoF pattern for the context |
| `structural-design-patterns` | Deep implementation of structural patterns with extensive examples |
| `creational-design-patterns` | Specialized coverage of creational patterns for object creation challenges |
| `behavioral-design-patterns` | In-depth behavioral pattern implementations beyond this catalog |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Design Patterns: Elements of Reusable Object-Oriented Software (GoF)](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612) — The canonical Gang of Four reference book
- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns/) — Visual explanations and practical examples of all 23 GoF patterns
- [Python Data Model Documentation](https://docs.python.org/3/reference/datamodel.html) — Python-specific hooks (dunder methods, protocols) that enable pattern implementation
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) — Five object-oriented design principles by Robert C. Martin
- [Python `typing` Module Documentation](https://docs.python.org/3/library/typing.html) — Type hints, Protocol, ABC integration for type-safe pattern abstractions
- [Effective Python — 90 Specific Ways to Write Better Python](https://effectivepython.com/) — Item 48 discusses when patterns are and aren't needed in Python
- [Python Design Patterns by Refactoring.Guru](https://refactoring.guru/design-patterns/python) — Python-specific adaptations of each GoF pattern
