---




name: structural-design-patterns
description: Implements GoF structural patterns (Adapter, Bridge, Composite, Decorator,
  Facade, Proxy, Flyweight) to compose classes and objects into larger structures
  while keeping them flexible and efficient.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: structural patterns, adapter pattern, bridge pattern, composite pattern, decorator pattern, facade pattern, proxy pattern, flyweight decorator pattern
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
  related-skills: behavioral-design-patterns, design-patterns-architecture, refactoring-techniques,
    modular-design




---




# Structural Design Patterns

Implements GoF structural patterns to compose classes and objects into larger structures while maintaining flexibility. This skill makes the model apply Adapter for incompatible interfaces, Bridge for separating abstraction from implementation, Composite for tree-like part-whole hierarchies, Decorator for dynamic behavior augmentation, Facade for simplifying complex subsystems, Proxy for controlling access and lazy initialization, and Flyweight for memory-efficient shared object sharing — choosing each based on the structural problem at hand.

## TL;DR Checklist

- [ ] Determine if the problem is interface incompatibility (Adapter), implementation separation (Bridge), part-whole hierarchy (Composite), dynamic behavior addition (Decorator), subsystem simplification (Facade), access control/lazy loading (Proxy), or memory optimization (Flyweight)
- [ ] Prefer composition over inheritance for all structural patterns — wrap objects, never subclass for behavioral extension
- [ ] Use Decorator with `typing.Protocol` or ABC interfaces to ensure transparent substitution of wrapped and wrapping objects
- [ ] Use Proxy only when there is a real cost to creating or accessing the subject (expensive object, remote call, lazy initialization)
- [ ] Use Composite recursively — every node in the tree must implement the same interface as leaf nodes
- [ ] Use Flyweight only when you have many objects sharing extrinsic state; intrinsic state must be immutable and shareable
- [ ] Ensure Facade does not become a god object — delegate to domain services, do not contain business logic

---

## When to Use

Use this skill when:

- Two existing interfaces are incompatible but serve the same conceptual purpose (legacy API integration, third-party SDK migration)
- A class has two independent dimensions of variation that should be extensible separately (rendering engine × output format, encryption algorithm × transport protocol)
- You need to represent part-whole hierarchies where clients treat individual objects and compositions uniformly (file systems, UI widget trees, org charts)
- You need to add behavior to objects dynamically without creating a new subclass for every combination of behaviors (middleware chains, permission layers, caching on top of services)
- A subsystem has many classes with complex interdependencies and callers need a simplified entry point (database migration orchestrator, payment processing pipeline)
- You need delayed initialization, access control, or additional responsibility without changing the subject's class (lazy-loaded models, authorization proxy, caching proxy for expensive queries)
- You have hundreds or thousands of similar objects where much of their state can be shared externally (document editor characters, map markers with shared tile images)

---

## When NOT to Use

Avoid this skill for:

- Simple inheritance hierarchies where polymorphism alone solves the problem
- Adding one or two behaviors — prefer explicit composition or simple method calls over a full Decorator chain
- Subsystems that already have a clean, simple API — a Facade adds indirection without benefit
- When all objects genuinely need their own state — Flyweight creates complexity for no memory savings
- When the interface difference is minor — just write a thin wrapper function instead of a full Adapter class

---

## Core Workflow

1. **Classify the structural problem** — Incompatible API? → Adapter. Two orthogonal variations? → Bridge. Part-whole hierarchy? → Composite. Dynamic behavior stacking? → Decorator. Simplified entry point? → Facade. Access control or lazy load? → Proxy. Many similar objects with shared state? → Flyweight.
   **Checkpoint:** Can you sketch the class relationships on paper? If not, the problem may be behavioral, not structural.

2. **Define the component interface first** — Create a `Protocol` or ABC that all components (wrappers, leaves, compositions, proxies) must implement. This is the contract that enables substitution and transparency.
   **Checkpoint:** The interface should expose only what callers need, not the internals of any concrete implementation.

3. **Implement leaf/subject classes** — These are the actual objects being adapted, composed, decorated, or proxied. Keep them focused on their core responsibility only.
   **Checkpoint:** No structural pattern code in the subject — it should work standalone without any wrapper.

4. **Build the structural wrapper** — Implement the pattern's wrapper class that holds a reference to the component interface. Apply guard clauses for null checks and state validation.
   **Checkpoint:** The wrapper delegates all core operations to the wrapped object; any additional logic is clearly separated from delegation.

5. **Wire at the composition root** — Assemble the structure at application startup. Inject the structural wrapper where the abstraction is expected, not the concrete component.
   **Checkpoint:** No module imports both the concrete component and its wrapper simultaneously — this indicates a broken abstraction boundary.

---

## Implementation Patterns

### Pattern 1: Adapter

The Adapter pattern converts the interface of a class into another interface that clients expect. It enables collaboration between classes with incompatible interfaces by wrapping the adaptee and translating calls. Use it when integrating legacy systems or third-party libraries without modifying their source code.

**When to use:** You need to use an existing class whose interface does not match what you need; you want to create a reusable class that works with unrelated types through a common interface.

```python
# ❌ BAD — Hard-coded integration creates tight coupling
class ShoppingCart:
    def __init__(self) -> None:
        # Direct dependency on specific payment API
        self.stripe_client = StripeClient()

    def checkout(self, items: list[dict]) -> str:
        # Calls Stripe-specific methods directly; impossible to switch providers
        return self.stripe_client.create_payment_intent(
            amount=sum(i["price"] * i["qty"] for i in items),
            currency="usd",
            source=self.stripe_client.get_token()
        )


# ❌ BAD — Monkey-patching the legacy class is destructive and fragile
import stripe as _stripe

_original = _stripe.Charge.create
def patched_create(*args, **kwargs):
    return _original(*args, **kwargs)  # No real adaptation happening
_stripe.Charge.create = patched_create
```

```python
# ✅ GOOD — Adapter translates between incompatible interfaces cleanly
from abc import ABC, abstractmethod
from typing import Protocol


class PaymentProcessor(Protocol):
    """Target interface that our application code depends on."""

    def pay(self, amount: float, currency: str, customer_id: str) -> str:
        """Process payment and return transaction ID."""
        ...


class StripeAPIClient:
    """Third-party library class — we cannot modify its interface."""

    def create_charge(self, amount_cents: int, currency: str, source_token: str) -> dict:
        """Stripe's API: expects cents and a token. Returns dict with charge info."""
        return {"id": f"ch_stripe_{amount_cents}", "status": "succeeded"}

    def create_customer(self, email: str, source_token: str) -> dict:
        return {"id": f"cus_stripe_email={email}"}


class StripeAdapter(PaymentProcessor):
    """Adapter that translates our interface into Stripe's API."""

    def __init__(self, api_key: str) -> None:
        self._client = StripeAPIClient()  # The adaptee

    def pay(self, amount: float, currency: str, customer_id: str) -> str:
        # Convert dollars to cents; translate parameters to Stripe's format
        amount_cents = int(amount * 100)
        result = self._client.create_charge(
            amount_cents=amount_cents,
            currency=currency.lower(),
            source_token=customer_id,
        )
        if result.get("status") != "succeeded":
            raise PaymentError(f"Stripe charge failed: {result}")
        return result["id"]


class PaymentError(Exception):
    pass


# Usage — application code works with the target interface only
def process_order(processor: PaymentProcessor, order_total: float) -> str:
    txn_id = processor.pay(order_total, "USD", "cust_123")
    return f"Order paid: {txn_id}"


# Easy to swap adapters or mock for testing
result = process_order(StripeAdapter(api_key="sk_test_..."), 49.99)
```

---

### Pattern 2: Bridge

The Bridge pattern decouples an abstraction from its implementation so that the two can vary independently. It is used when both the abstraction and the implementation have multiple dimensions of variation, and you want to extend both without creating a combinatorial explosion of subclasses.

**When to use:** You have a class with two orthogonal axes of variation (e.g., shape × color, database driver × query builder, rendering engine × output format) that evolve independently.

```python
# ❌ BAD — Subclass explosion: 4 shapes × 3 colors = 12 concrete classes
class Shape(ABC):
    @abstractmethod
    def draw(self) -> str: ...


class Circle(Shape):
    def draw(self) -> str: return "Circle drawn"

class Square(Shape):
    def draw(self) -> str: return "Square drawn"


# Now every color needs a subclass of every shape — O(n*m) classes
class RedCircle(Circle):
    def draw(self) -> str: return "Red Circle drawn"

class BlueCircle(Circle):
    def draw(self) -> str: return "Blue Circle drawn"


# ✅ GOOD — Bridge separates shape from color into two independent hierarchies
from abc import ABC, abstractmethod
from typing import Protocol


class Color(Protocol):
    """Abstraction-implementation bridge interface."""

    def apply(self) -> str: ...


class Renderer(ABC):
    """Abstraction that depends on Implementation via composition."""

    def __init__(self, color: Color) -> None:
        self._color = color

    @abstractmethod
    def render_shape(self) -> str: ...


# --- Independent implementation hierarchy (colors) ---

class RedColor:
    def apply(self) -> str:
        return "red"


class BlueColor:
    def apply(self) -> str:
        return "blue"


class GreenColor:
    def apply(self) -> str:
        return "green"


# --- Independent abstraction hierarchy (shapes) ---

class CircleRenderer(Renderer):
    def render_shape(self) -> str:
        color = self._color.apply()
        return f"<circle fill='{color}' />"


class SquareRenderer(Renderer):
    def render_shape(self) -> str:
        color = self._color.apply()
        return f"<rect fill='{color}' />"


class TriangleRenderer(Renderer):
    def render_shape(self) -> str:
        color = self._color.apply()
        return f"<polygon fill='{color}' points='0,0 100,0 50,86.6' />"


# Usage — any shape can combine with any color at runtime without subclass explosion
shapes: list[str] = []
for renderer_cls in [CircleRenderer, SquareRenderer, TriangleRenderer]:
    for color_cls in [RedColor, BlueColor, GreenColor]:
        shapes.append(renderer_cls(color_cls()).render_shape())

# 3 shapes × 3 colors = 6 combinations with only 2 abstraction classes + 3 implementation classes
assert len(shapes) == 9  # All combinations generated
```

---

### Pattern 3: Composite

The Composite pattern composes objects into tree structures to represent part-whole hierarchies. It lets clients treat individual objects and compositions of objects uniformly through a common interface.

**When to use:** You need to represent hierarchical structures (file systems, UI widget trees, organization charts) where clients operate on individual nodes and composite nodes identically.

```python
# ❌ BAD — Treating leaves and containers separately creates fragile code
class File:
    def __init__(self, name: str, size: int) -> None:
        self.name = name
        self.size = size

    def show_details(self) -> str:
        return f"File: {self.name} ({self.size} bytes)"


class Folder:
    def __init__(self, name: str) -> None:
        self.name = name
        self._children: list[object] = []  # No type safety — accepts anything

    def add(self, child: object) -> None:
        # No enforcement that child is File or Folder
        self._children.append(child)

    def show_details(self) -> str:
        lines = [f"Folder: {self.name}"]
        for child in self._children:
            # Must check type manually — runtime errors if wrong type added
            if isinstance(child, File):
                lines.append(f"  {child.show_details()}")
            elif isinstance(child, Folder):
                lines.append(f"  {child.show_details()}")
        return "\n".join(lines)


# ✅ GOOD — Composite pattern with unified Component interface
from abc import ABC, abstractmethod


class FileSystemNode(ABC):
    """Component interface for both leaves (files) and composites (folders)."""

    @abstractmethod
    def get_size(self) -> int: ...

    @abstractmethod
    def display(self, indent: int = 0) -> str: ...

    @abstractmethod
    def find_by_name(self, name: str) -> "FileSystemNode | None": ...


class FileNode(FileSystemNode):
    """Leaf component — represents a single file."""

    def __init__(self, name: str, size: int) -> None:
        self.name = name
        self._size = size

    def get_size(self) -> int:
        return self._size

    def display(self, indent: int = 0) -> str:
        prefix = "  " * indent
        return f"{prefix}📄 {self.name} ({self._size} bytes)"

    def find_by_name(self, name: str) -> "FileSystemNode | None":
        return self if self.name == name else None


class FolderNode(FileSystemNode):
    """Composite component — contains other nodes (files or folders)."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._children: list[FileSystemNode] = []

    def add(self, node: FileSystemNode) -> None:
        # Type-safe: only accepts FileSystemNode subclasses
        self._children.append(node)

    def remove(self, node: FileSystemNode) -> None:
        if node in self._children:
            self._children.remove(node)

    def get_size(self) -> int:
        # Delegates to children — aggregates size recursively
        return sum(child.get_size() for child in self._children)

    def display(self, indent: int = 0) -> str:
        prefix = "  " * indent
        lines = [f"{prefix}📁 {self.name}/"]
        for child in self._children:
            lines.append(child.display(indent + 1))
        return "\n".join(lines)

    def find_by_name(self, name: str) -> "FileSystemNode | None":
        if self.name == name:
            return self
        for child in self._children:
            result = child.find_by_name(name)
            if result is not None:
                return result
        return None


# Usage — uniform treatment of leaves and composites
root = FolderNode("project")
root.add(FileNode("readme.md", 2048))

src = FolderNode("src")
src.add(FileNode("main.py", 4096))
src.add(FileNode("utils.py", 1536))
root.add(src)

# Single interface call works recursively on entire tree
print(root.display())
# 📁 project/
#   📄 readme.md (2048 bytes)
#   📁 src/
#     📄 main.py (4096 bytes)
#     📄 utils.py (1536 bytes)

# Total size computed recursively without special cases
assert root.get_size() == 7680  # 2048 + 4096 + 1536
```

---

### Pattern 4: Decorator

The Decorator pattern adds responsibilities to objects dynamically by wrapping them in decorator classes that implement the same interface. It provides a flexible alternative to subclassing for extending behavior, and enforces composition over inheritance — each decorator adds exactly one concern.

**When to use:** You need to add orthogonal behaviors (caching, logging, authentication, rate limiting) that can be combined in many configurations without creating exponential subclass combinations.

```python
# ❌ BAD — Subclass explosion: 4 features × n base services = exponential classes
class DatabaseService:
    def query(self, sql: str) -> list[dict]: ...

class CachedDatabaseService(DatabaseService): ...       # adds caching
class LoggingDatabaseService(DatabaseService): ...     # adds logging
class AuthCachedLoggingDatabaseService(DatabaseService): ...  # all three combined


# ❌ BAD — God object that mixes all concerns in one class
class SuperService:
    def query(self, sql: str) -> list[dict]:
        # Check auth
        if not self._check_auth():
            raise PermissionError("Access denied")
        # Check cache
        cached = self._cache.get(sql)
        if cached:
            return cached
        # Execute with logging
        start = time.time()
        result = self._db.execute(sql)
        self._logger.log(f"Query took {time.time() - start:.3f}s")
        self._cache.set(sql, result)
        return result


# ✅ GOOD — Decorator chain: each decorator adds exactly one concern
import time
from abc import ABC, abstractmethod
from typing import Any


class DataService(ABC):
    """Component interface that all decorators must implement."""

    @abstractmethod
    def query(self, sql: str) -> list[dict]: ...

    @abstractmethod
    def close(self) -> None: ...


class BaseDataService(DataService):
    """Concrete component — the actual data access implementation."""

    def query(self, sql: str) -> list[dict]:
        # Simulate actual database query
        return [{"id": 1, "name": "result"}]

    def close(self) -> None:
        pass


class CachingDecorator(DataService):
    """Decorator that caches query results."""

    def __init__(self, wrapped: DataService, ttl_seconds: int = 60) -> None:
        self._wrapped = wrapped
        self._cache: dict[str, list[dict]] = {}
        self._ttl = ttl_seconds

    def query(self, sql: str) -> list[dict]:
        if sql in self._cache:
            return self._cache[sql]
        result = self._wrapped.query(sql)
        self._cache[sql] = result
        return result

    def close(self) -> None:
        self._wrapped.close()


class LoggingDecorator(DataService):
    """Decorator that logs all queries with timing."""

    def __init__(self, wrapped: DataService, logger: Any = None) -> None:
        self._wrapped = wrapped
        self._logger = logger or print

    def query(self, sql: str) -> list[dict]:
        start = time.perf_counter()
        try:
            result = self._wrapped.query(sql)
            elapsed = time.perf_counter() - start
            self._logger(f"✅ Query [{elapsed:.4f}s]: {sql[:80]}")
            return result
        except Exception as e:
            elapsed = time.perf_counter() - start
            self._logger(f"❌ Query FAILED [{elapsed:.4f}s]: {e}")
            raise

    def close(self) -> None:
        self._wrapped.close()


class AuthenticationDecorator(DataService):
    """Decorator that checks authentication before executing queries."""

    def __init__(self, wrapped: DataService, current_user: str) -> None:
        self._wrapped = wrapped
        self._user = current_user

    def query(self, sql: str) -> list[dict]:
        if not self._is_authorized(sql):
            raise PermissionError(f"User '{self._user}' cannot execute: {sql[:40]}")
        return self._wrapped.query(sql)

    def _is_authorized(self, sql: str) -> bool:
        # Simple authorization check — production code would use RBAC
        if "DROP TABLE" in sql or "DELETE FROM" in sql:
            return self._user == "admin"
        return True  # SELECT and INSERT allowed for all

    def close(self) -> None:
        self._wrapped.close()


# Usage — compose decorators at runtime in any order, adding only the behaviors you need
base = BaseDataService()
service = AuthenticationDecorator(
    LoggingDecorator(
        CachingDecorator(base),
    ),
    current_user="analyst",
)

result = service.query("SELECT * FROM users LIMIT 10")
# Output: ✅ Query [0.0003s]: SELECT * FROM users LIMIT 10
```

---

### Pattern 5: Facade

The Facade pattern provides a simplified, unified interface to a complex subsystem. It does not add functionality — it delegates to existing classes behind a cleaner API surface. Use it when a subsystem has many interdependent classes and callers need a single entry point.

**When to use:** A library or module has a complex API with many classes; you want to provide a simpler entry point for common use cases without wrapping every possible operation.

```python
# ❌ BAD — Callers must know the entire subsystem API surface
class VideoConversionService:
    def convert(self, filename: str, format: str) -> str:
        # Caller must manually coordinate 4 different subsystem classes
        extractor = AudioVideoExtractor(filename)
        encoder = FormatEncoder(format)
        processor = QualityProcessor("medium")
        merger = AudioVideoMerger()

        audio_stream = extractor.extract_audio()
        video_stream = extractor.extract_video()

        processed_video = processor.process(video_stream)
        encoded_video = encoder.encode(processed_video, format)
        merged = merger.merge(audio_stream, encoded_video)

        return merged.save()


# ✅ GOOD — Facade hides subsystem complexity behind a single method
from dataclasses import dataclass
from enum import Enum


class VideoFormat(Enum):
    MP4 = "mp4"
    WEBM = "webm"
    GIF = "gif"


@dataclass
class ConversionResult:
    output_path: str
    file_size_bytes: int
    duration_seconds: float


class AudioVideoExtractor:
    def extract_audio(self, filename: str) -> bytes: ...
    def extract_video(self, filename: str) -> bytes: ...


class FormatEncoder:
    def encode(self, video_data: bytes, fmt: VideoFormat) -> bytes: ...


class QualityProcessor:
    def process(self, video_data: bytes) -> bytes: ...


class AudioVideoMerger:
    def merge(self, audio: bytes, video: bytes) -> bytes: ...


class MediaConversionFacade:
    """Facade — provides a single simplified method for common video conversions."""

    def __init__(self) -> None:
        self._extractor = AudioVideoExtractor()
        self._encoder = FormatEncoder()
        self._processor = QualityProcessor("medium")
        self._merger = AudioVideoMerger()

    def convert_video(self, input_path: str, output_format: VideoFormat) -> ConversionResult:
        """Convert video to the specified format — one method call for the entire pipeline."""
        audio = self._extractor.extract_audio(input_path)
        video = self._extractor.extract_video(input_path)

        processed_video = self._processor.process(video)
        encoded_video = self._encoder.encode(processed_video, output_format)

        merged = self._merger.merge(audio, encoded_video)

        # In real code: write to disk and return metadata
        return ConversionResult(
            output_path=f"{input_path}.{output_format.value}",
            file_size_bytes=len(merged),
            duration_seconds=0.0,
        )


# Usage — caller interacts with only one class and one method
facade = MediaConversionFacade()
result = facade.convert_video("input.mp4", VideoFormat.WEBM)
```

---

### Pattern 6: Proxy (Lazy Initialization)

The Proxy pattern provides a placeholder or surrogate for another object to control access to it. The lazy initialization variant delays creating the expensive subject until it is actually needed. Other common proxy uses include access control and caching.

**When to use:** Creating the subject is expensive (large data structure, remote call, database query) and you want to defer creation; or you need to add access control without modifying the subject class.

```python
# ❌ BAD — Expensive object created at import time regardless of whether it is used
class ImageLoader:
    def __init__(self) -> None:
        # Loads ALL images into memory immediately — wasteful if only one is displayed
        self.images: dict[str, bytes] = {}
        for filename in os.listdir("/images/"):
            path = os.path.join("/images/", filename)
            with open(path, "rb") as f:
                self.images[filename] = f.read()  # Could be gigabytes


# ✅ GOOD — Lazy loading proxy delays expensive creation until first access
import hashlib
from abc import ABC, abstractmethod


class Image(ABC):
    """Component interface for both real images and the proxy."""

    @abstractmethod
    def display(self) -> str: ...

    @abstractmethod
    def get_size(self) -> tuple[int, int]: ...


class RealImage(Image):
    """Expensive object — loads image data from disk or network on construction."""

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        # Simulate expensive I/O operation
        with open(file_path, "rb") as f:
            self._data = f.read()
        self._width, self._height = self._decode_dimensions()

    def _decode_dimensions(self) -> tuple[int, int]:
        # Placeholder for actual image header parsing
        return (1920, 1080)

    def display(self) -> str:
        hash_preview = hashlib.md5(self._data[:64]).hexdigest()[:8]
        return f"[Image {self.file_path} {self._width}x{self._height} ({len(self._data)} bytes, preview={hash_preview})]"

    def get_size(self) -> tuple[int, int]:
        return self._width, self._height


class ImageProxy(Image):
    """Proxy — lazy loads the real image only when display() is called."""

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self._real_image: RealImage | None = None

    def display(self) -> str:
        # Lazy initialization — only create RealImage on first access
        if self._real_image is None:
            print(f"  Loading image from disk: {self.file_path}")
            self._real_image = RealImage(self.file_path)
        return self._real_image.display()

    def get_size(self) -> tuple[int, int]:
        # Also lazily loads — if you only need dimensions without displaying...
        if self._real_image is None:
            print(f"  Loading image from disk (dimensions): {self.file_path}")
            self._real_image = RealImage(self.file_path)
        return self._real_image.get_size()


# Usage — images are NOT loaded until display() or get_size() is called
gallery_proxies = [
    ImageProxy("/images/photo1.jpg"),
    ImageProxy("/images/photo2.jpg"),
    ImageProxy("/images/photo3.jpg"),
]

# Checking size of first image loads ONLY that one file
first_size = gallery_proxies[0].get_size()
# Output: Loading image from disk (dimensions): /images/photo1.jpg

# Displaying second image loads it independently
print(gallery_proxies[1].display())
# Output: Loading image from disk: /images/photo2.jpg  [then displays]

# Third image was never loaded — saving memory for unused items
assert gallery_proxies[2]._real_image is None, "Unused image must not be loaded"
```

---

### Pattern 7: Flyweight

The Flyweight pattern minimizes memory usage by sharing common state (intrinsic) across many objects, while keeping varying state (extrinsic) external to the shared objects. It is most effective when you have a large number of similar objects and much of their state can be factored out.

**When to use:** You have thousands or millions of similar objects where intrinsic state (data that can be shared) vastly exceeds extrinsic state (data that must be unique per object). Classic examples: characters in a text editor, game entities with shared sprites, network packets with shared metadata.

```python
# ❌ BAD — Each character creates its own glyph data, wasting memory
class Character:
    def __init__(self, char: str, font: str, size: int, color: str) -> None:
        self.char = char
        # Font glyphs are identical across all instances of the same char+font — wasted memory
        self.glyph_data = load_glyph_from_font_file(char, font)  # ~2KB per character!
        self.size = size
        self.color = color

    def render(self, x: int, y: int) -> str:
        return f"Char('{self.char}' at {x},{y}) [glyph={id(self.glyph_data)}]"


# Creating a document with 100K characters = 200MB just for glyph data
document = "".join("Hello World! " * 5000)  # ~65,000 characters
characters = [Character(c, "Arial", 12, "#000000") for c in document]
# Total memory: 65000 × 2KB ≈ 130MB wasted on duplicate glyph data


# ✅ GOOD — Flyweight shares intrinsic state (glyphs) across all instances
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass(frozen=True)
class CharacterFlyweight:
    """Immutable intrinsic state — shared across all occurrences of the same character."""
    char: str
    font_name: str
    size: int

    def render_at(self, x: int, y: int, color: str = "#000000") -> str:
        """Render using extrinsic state (position, color) passed at call time."""
        return f"Char('{self.char}' at {x},{y}) [{color}]"


class CharacterFactory:
    """Flyweight factory — creates and caches flyweight objects by intrinsic state key."""

    _registry: dict[tuple[str, str, int], CharacterFlyweight] = {}

    @classmethod
    def get_character(cls, char: str, font: str, size: int) -> CharacterFlyweight:
        key = (char, font, size)
        if key not in cls._registry:
            # Only create glyph data once per unique intrinsic state combination
            cls._registry[key] = CharacterFlyweight(char, font, size)
        return cls._registry[key]

    @classmethod
    def clear_cache(cls) -> None:
        """Clear the registry — useful for memory management."""
        cls._registry.clear()


# Usage — all 'H' characters with same font/size share the same flyweight object
text = "Hello World!"
extrinsic_state = [(i, "#000000") for i in range(len(text))]  # (position, color) per character

rendered_lines = []
for pos, (x_pos, color) in enumerate(extrinsic_state):
    flyweight = CharacterFactory.get_character(text[pos], "Arial", 12)
    rendered_lines.append(flyweight.render_at(x_pos, 0, color))

# Verify sharing — all identical characters share the same object
h_flyweights = [CharacterFactory.get_character("H", "Arial", 12) for _ in range(5)]
assert all(f is h_flyweights[0] for f in h_flyweights), \
    "All 'H' flyweights must be the exact same object (identity sharing)"

# Only unique intrinsic state combinations are stored in memory
unique_count = len(CharacterFactory._registry)
# For "Hello World!" with one font/size: only 10 unique characters stored, not 12
```

---

## Constraints

### MUST DO
- **Always define the component interface first** — create a `Protocol` or ABC that all participants implement; this is the foundation of every structural pattern
- **Prefer composition over inheritance for Decorator and Proxy** — wrap objects with explicit delegation, never subclass to add behavior
- **Ensure Composite nodes delegate to children uniformly** — both leaf and composite implementations must handle the same operations identically from the caller's perspective
- **Use Flyweight with immutable intrinsic state** — shared state must be `frozen=True` dataclasses or otherwise immutable; mutable shared state causes race conditions
- **Keep Facade thin** — delegate to domain services; a Facade that contains business logic becomes a god object and is hard to maintain
- **Apply guard clauses in Proxy before delegation** — check authorization, validate input, or initialize lazily before passing through to the subject

### MUST NOT DO
- **Do not use Adapter to change method semantics** — an adapter translates calls; it should not add new capabilities or change behavior beyond interface compatibility
- **Do not nest more than 4 Decorator levels deep** — deeply chained decorators become hard to debug and trace; prefer a single decorator that composes multiple concerns internally
- **Never expose the subject's concrete type through Proxy or Decorator return types** — callers should only see the component interface, enabling full substitution
- **Do not use Bridge when a single inheritance hierarchy suffices** — Bridge adds indirection; only use when you have two independent axes of variation that must scale separately
- **Avoid creating a separate Composite class for every tree type** — one general-purpose `CompositeNode` with typed children works for most hierarchies

---

## Output Template

When this skill is active, your output must contain:

1. **Pattern identification** — State which GoF structural pattern applies and why (one sentence mapping the problem to the pattern's solution)
2. **Component interface** — Show the `Protocol` or ABC first; all code examples must begin with the abstraction that wraps/delegates/composes
3. **BAD vs. GOOD code pair** — Every pattern must include at least one BAD example showing the anti-pattern and a GOOD example demonstrating correct application
4. **Composition diagram (ASCII)** — For Bridge, Composite, Decorator, and Flyweight: include an ASCII class diagram showing the relationships between participants
5. **Type annotations** — All functions must have complete `typing` annotations; use `Protocol`, `ABC`, and concrete return types consistently

---

## Related Skills

| Skill | Purpose |
|---|---|
| `behavioral-design-patterns` | Covers behavioral patterns (Observer, Strategy, Command) that combine with structural patterns for full architectures |
| `design-patterns-architecture` | Higher-level architectural patterns (Hexagonal, CQRS, Event Sourcing) that use structural patterns internally |
| `refactoring-techniques` | How to refactor tightly-coupled class hierarchies into clean structural pattern applications |
| `modular-design` | Module organization and dependency management that complements structural pattern-based architectures |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Structural Design Patterns (Refactoring Guru)](https://refactoring.guru/design-patterns/category_structural)
- [Adapter Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/adapter)
- [Decorator Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/decorator)
- [Facade Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/facade)
- [Composite & Flyweight Patterns (Refactoring Guru)](https://refactoring.guru/design-patterns/composite)
