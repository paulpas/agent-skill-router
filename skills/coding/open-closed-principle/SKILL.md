---




name: open-closed-principle
description: Refactors conditional branching and if/else chains into extensible polymorphic
  designs using strategy injection, factory registration, and protocol-based interfaces
  so new behavior extends without modifying existing source.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: open closed principle, OCP, extensible design, polymorphism, strategy
    pattern, factory pattern, extension point, conditional refactoring
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
  related-skills: single-responsibility, liskov-substitution-principle, interface-segregation-principle,
    dependency-inversion-principle, design-patterns-architecture




---




# Open/Closed Principle (OCP)

Applies the Open/Closed Principle to refactor code that requires modification for new features into designs that allow extension without source-level changes. Detects violation patterns — sprawling if/else chains, hard-coded type checks, and magic-number configuration — then replaces them with polymorphic strategies, factory registration, or protocol-based interfaces. This skill makes the model identify every place a new feature forces an edit to existing code, then restructure that code so adding features requires only new files, never changes to existing ones.

## TL;DR for Code Generation

- [ ] Locate the class or function that breaks when a new variant is added — this is the modification point
- [ ] Extract a Protocol or ABC representing the invariant contract across all variants
- [ ] Move each conditional branch's logic into its own class implementing the abstraction
- [ ] Replace the if/elif/else chain with a factory registry (dict mapping discriminator values to strategy classes)
- [ ] Verify: adding a new variant requires creating one file and registering it — zero edits to existing source

---

## When to Use

Use this skill when:

- An `if`/`elif`/`else` chain or `match`/`case` statement grows with every new feature (e.g., discount types, payment methods, tax jurisdictions, file format parsers)
- Adding a new enum value or configuration option requires editing existing conditional logic in multiple places
- The same class is modified repeatedly for unrelated features, violating the Single Responsibility Principle alongside OCP
- A "switch" or nested conditionals pattern exists where each branch represents a distinct domain concept with different behavior
- You are designing an extension point (plugin system, event handler registry, middleware pipeline) and want it to remain open to new handlers without touching the dispatcher

## When NOT to Use

Avoid this skill for:

- **Two-variant systems** — If there are exactly two cases and no third is foreseeable, a simple `if`/`else` is clearer than an abstraction layer. (Use direct conditional logic.)
- **Performance-critical inner loops** — Polymorphic dispatch via dict lookups adds overhead compared to inlined conditionals. Profile first; only refactor when the chain exceeds ~5 branches or changes frequently. (Use `performance-optimization` for hotspot analysis.)
- **One-time data transformation scripts** — Throwaway code that processes a fixed set of record types does not need extensibility. (Keep it simple; use direct functions.)

---

## Core Workflow

1. **Locate the Modification Point** — Find the class or function that requires source-level editing each time a new variant is introduced. Look for `if/elif/else` chains, `match/case` statements with many branches, or type-checking logic (`isinstance`, `type()`) scattered across multiple functions. **Checkpoint:** Confirm that adding Variant X forces edits in N>1 locations — if only one location changes, the cost of OCP may outweigh its benefit.

2. **Identify the Variation Axis** — Determine what distinguishes each branch: a domain enum (e.g., `PaymentMethod`), a file extension (`.csv`, `.json`, `.parquet`), a configuration flag, or a user-provided type string. This discriminator is the key of your factory registry. **Checkpoint:** Every existing branch must map to exactly one value on this axis — if some branches share the same discriminator value, group them into a single strategy first.

3. **Define the Abstraction** — Create a Protocol (for structural typing) or ABC (when shared default implementations are needed). The protocol/ABC should capture only the invariant behavior all variants must honor. Avoid adding methods that only one variant needs. **Checkpoint:** Every method on the abstraction must be invoked by the caller at least once in every code path — if a method exists but is never called after dispatch, remove it or split the abstraction.

4. **Extract Variants** — For each branch, create a class implementing the abstraction and move that branch's logic into it. Each variant class should have exactly one responsibility: executing its specific behavior. Apply SRP here too. **Checkpoint:** No variant class should contain `isinstance` checks for other variants or import sibling classes — they must be fully independent.

5. **Register and Dispatch** — Replace the conditional chain with a factory registry (a dict mapping discriminator values to strategy classes). Instantiate strategies through this registry in the caller. The dispatcher itself must never change when adding new variants — only the registration table grows. **Checkpoint:** After refactoring, verify that importing a new variant and registering it in the factory is sufficient — no other file needs editing.

---

## Implementation Patterns

### Pattern 1: Replacing if/elif/else Chains with Strategy Objects

The most common OCP violation is a sprawling conditional that calculates different results based on an enum or type discriminator. Each branch represents a distinct strategy — extract each into its own class.

```python
# ❌ BAD — Every new discount type requires editing this function
# Adding "corporate" means editing the source and risking regressions in existing branches
from enum import Enum


class DiscountType(Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"


def calculate_discount(price: float, discount_type: DiscountType, quantity: int) -> float:
    """Calculate discounted price — violates OCP: adding a new type edits this function."""
    if discount_type == DiscountType.STANDARD:
        base_rate = 0.05
        bulk_threshold = 10
        bulk_rate = 0.10
    elif discount_type == DiscountType.PREMIUM:
        base_rate = 0.10
        bulk_threshold = 5
        bulk_rate = 0.15
    elif discount_type == DiscountType.VIP:
        base_rate = 0.20
        bulk_threshold = 1
        bulk_rate = 0.30
    else:
        raise ValueError(f"Unknown discount type: {discount_type}")

    if quantity >= bulk_threshold:
        rate = bulk_rate
    else:
        rate = base_rate

    return price * (1 - rate)


# ✅ GOOD — Each discount strategy is a self-contained class; adding VIP_Corp requires zero edits here
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class DiscountType(Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"


class DiscountStrategy(Protocol):
    """Contract for any discount calculation strategy."""

    def calculate(self, price: float, quantity: int) -> float:
        ...


@dataclass(frozen=True)
class StandardDiscount:
    """5% base discount; 10% bulk after 10+ units."""

    def calculate(self, price: float, quantity: int) -> float:
        base_rate = 0.05
        rate = 0.10 if quantity >= 10 else base_rate
        return price * (1 - rate)


@dataclass(frozen=True)
class PremiumDiscount:
    """10% base discount; 15% bulk after 5+ units."""

    def calculate(self, price: float, quantity: int) -> float:
        base_rate = 0.10
        rate = 0.15 if quantity >= 5 else base_rate
        return price * (1 - rate)


@dataclass(frozen=True)
class VipDiscount:
    """20% base discount; 30% bulk after 1+ unit."""

    def calculate(self, price: float, quantity: int) -> float:
        base_rate = 0.20
        rate = 0.30 if quantity >= 1 else base_rate
        return price * (1 - rate)


# Factory registry — the ONLY place that maps types to strategies
DISCOUNT_REGISTRY: dict[DiscountType, type[DiscountStrategy]] = {
    DiscountType.STANDARD: StandardDiscount,
    DiscountType.PREMIUM: PremiumDiscount,
    DiscountType.VIP: VipDiscount,
}


def calculate_discount(price: float, discount_type: DiscountType, quantity: int) -> float:
    """Calculate discount via strategy dispatch — open for extension, closed for modification."""
    strategy_class = DISCOUNT_REGISTRY.get(discount_type)
    if strategy_class is None:
        raise ValueError(f"Unknown discount type: {discount_type}")

    strategy: DiscountStrategy = strategy_class()
    return strategy.calculate(price, quantity)
```

### Pattern 2: Factory Registration with Enum Dispatch

When the discriminator comes from user input or configuration (not a well-defined enum), use a registration-based factory where new handlers are registered at startup rather than via conditional logic.

```python
# ❌ BAD — New file formats require editing process_file() every time
# Adding .avif support means touching production code and re-testing everything
import csv
import json


def process_file(filepath: str, content: str):
    """Process a file by extension — violates OCP: adding a format edits this function."""
    ext = filepath.rsplit(".", 1)[-1].lower()

    if ext == "csv":
        rows = list(csv.DictReader(content.splitlines()))
        return [{"id": i, **row} for i, row in enumerate(rows)]

    elif ext == "json":
        data = json.loads(content)
        if isinstance(data, list):
            return [{"id": i, **item} for i, item in enumerate(data)]
        return {"id": 0, **data}

    elif ext == "txt":
        lines = content.splitlines()
        return [{"id": i, "line": line} for i, line in enumerate(lines)]

    else:
        raise ValueError(f"Unsupported file format: {ext}")


# ✅ GOOD — New formats are registered via a decorator; process_file() never changes
from functools import cache
from typing import Callable


class FileFormatRegistry:
    """Registry mapping file extensions to handler callables.
    
    Handlers decorate themselves onto this registry at module load time.
    Adding a new format requires one new file — no edits to existing code.
    """

    _handlers: dict[str, Callable[[str], list[dict]]] = {}

    @classmethod
    def register(cls, extension: str) -> Callable:
        """Decorator: register a handler for a given file extension."""
        def decorator(func: Callable[[str], list[dict]]) -> Callable:
            cls._handlers[extension] = func
            return func
        return decorator

    @classmethod
    def get_handler(cls, extension: str) -> Callable[[str], list[dict]] | None:
        """Look up handler by extension — returns None if unregistered."""
        return cls._handlers.get(extension.lower())

    @classmethod
    def list_supported_formats(cls) -> set[str]:
        """Return all registered formats for introspection or documentation."""
        return set(cls._handlers.keys())


@FileFormatRegistry.register("csv")
def handle_csv(content: str) -> list[dict]:
    """Parse CSV content into a list of row dictionaries with numeric IDs."""
    rows = list(csv.DictReader(content.splitlines()))
    return [{"id": i, **row} for i, row in enumerate(rows)]


@FileFormatRegistry.register("json")
def handle_json(content: str) -> list[dict]:
    """Parse JSON content, normalizing both arrays and objects."""
    data = json.loads(content)
    if isinstance(data, list):
        return [{"id": i, **item} for i, item in enumerate(data)]
    return {"id": 0, **data}


@FileFormatRegistry.register("txt")
def handle_txt(content: str) -> list[dict]:
    """Parse text file into a list of line objects."""
    lines = content.splitlines()
    return [{"id": i, "line": line} for i, line in enumerate(lines)]


# Dispatcher — never modified when new formats are added
def process_file(filepath: str, content: str) -> list[dict]:
    """Dispatch file processing to the registered handler for this extension."""
    ext = filepath.rsplit(".", 1)[-1].lower()
    handler = FileFormatRegistry.get_handler(ext)
    if handler is None:
        available = sorted(FileFormatRegistry.list_supported_formats())
        raise ValueError(f"Unsupported format '{ext}'. Supported: {available}")
    return handler(content)
```

### Pattern 3: Protocol-Based Duck Typing (No Inheritance Required)

Python's structural typing with `Protocol` allows strategies to be defined without a shared inheritance hierarchy. Any class implementing the required methods works — this is the most flexible and least invasive form of OCP in Python.

```python
# ❌ BAD — All notification types share one class with type-checking logic
# Adding LINE_NOTIFY requires editing NotificationSender, violating both OCP and SRP
import smtplib
from dataclasses import dataclass


@dataclass
class Message:
    recipient: str
    body: str
    subject: str = ""


class NotificationSender:
    """Sends notifications via multiple channels — violates OCP and SRP."""

    def send(self, message: Message, channel: str) -> bool:
        if channel == "email":
            return self._send_email(message)
        elif channel == "sms":
            return self._send_sms(message)
        elif channel == "webhook":
            return self._send_webhook(message)
        else:
            raise ValueError(f"Unknown channel: {channel}")

    def _send_email(self, message: Message) -> bool:
        # SMTP logic — needs subject line, full headers
        msg = smtplib.SMTP("localhost")
        msg.send_message(f"Subject: {message.subject}\n{message.body}")
        return True

    def _send_sms(self, message: Message) -> bool:
        # SMS gateway call — only uses recipient and body
        raise NotImplementedError("SMS integration")

    def _send_webhook(self, message: Message) -> bool:
        # HTTP POST to webhook URL — needs JSON payload
        raise NotImplementedError("Webhook integration")


# ✅ GOOD — Each channel is a Protocol implementor. No inheritance tree needed.
# Adding LINE_NOTIFY requires one new file; NotificationRouter never changes.
import json
import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class Notifier(Protocol):
    """Structural contract: any class with send() accepting Message works."""

    def send(self, message: Message) -> bool:
        ...


class EmailNotifier:
    """Sends emails — implements Notifier via structural typing. No inheritance needed."""

    def __init__(self, smtp_host: str = "localhost", smtp_port: int = 25) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    def send(self, message: Message) -> bool:
        """Send email via SMTP with proper headers."""
        logger.info("Sending email to %s: %s", message.recipient, message.subject)
        msg = smtplib.SMTP(self.smtp_host, self.smtp_port)
        msg.send_message(f"Subject: {message.subject}\nTo: {message.recipient}\n\n{message.body}")
        msg.quit()
        return True


class SmsNotifier:
    """Sends SMS — implements Notifier structurally. Different constructor, same interface."""

    def __init__(self, api_key: str, api_secret: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret

    def send(self, message: Message) -> bool:
        """Send SMS via gateway — only uses recipient and body (subject ignored)."""
        logger.info("Sending SMS to %s", message.recipient)
        # Real SMS API call here with api_key/api_secret auth
        return True


class WebhookNotifier:
    """Sends HTTP POST to a webhook URL."""

    def __init__(self, url: str, timeout: float = 5.0) -> None:
        self.url = url
        self.timeout = timeout

    def send(self, message: Message) -> bool:
        """Send webhook payload as JSON POST."""
        logger.info("Sending webhook to %s", self.url)
        import httpx
        payload = {
            "to": message.recipient,
            "subject": message.subject,
            "body": message.body,
        }
        response = httpx.post(self.url, json=payload, timeout=self.timeout)
        return response.status_code == 200


# Router uses Protocol-based dispatch — no isinstance checks anywhere
def route_notification(message: Message, channel: str) -> bool:
    """Route a notification to the correct Notifier implementation.
    
    The strategy object is resolved once and cached for performance.
    Adding a new channel requires one new class + registration — zero edits here.
    """
    _router_map: dict[str, Notifier] = {
        "email": EmailNotifier(),
        "sms": SmsNotifier(api_key="...", api_secret="..."),
        "webhook": WebhookNotifier(url="https://hooks.example.com/notify"),
    }

    notifier = _router_map.get(channel)
    if notifier is None:
        available = sorted(_router_map.keys())
        raise ValueError(f"Unknown channel '{channel}'. Available: {available}")

    return notifier.send(message)
```

### Pattern 4: Configuration-Driven Extension (Plugin Loading Without Code Changes)

For systems where extensions should be loadable from configuration files without any code changes, combine factory registration with dynamic module loading. New plugins are deployed as new Python packages or modules — the framework discovers them automatically.

```python
# ❌ BAD — Plugin system requires hard-coded imports and conditional dispatch
# Deploying a new plugin means editing the application code
import os


def load_plugins():
    """Load plugins by scanning a directory — but dispatcher is still hard-coded."""
    plugin_dir = "/opt/plugins"
    installed = []

    for fname in os.listdir(plugin_dir):
        if fname.endswith(".py"):
            # Dangerous: exec-based loading, no interface enforcement
            module_path = os.path.join(plugin_dir, fname)
            mod = __import__(fname.rstrip(".py"))
            installed.append(mod)

    return installed


def process_event(event: dict) -> list[str]:
    """Process event with hard-coded plugin calls — violates OCP."""
    results = []

    # Every new plugin requires editing this function
    results.extend(validate_event(event))       # Always runs first
    results.extend(normalize_fields(event))      # Always runs second
    results.extend(enrich_metadata(event))       # Always runs third
    # Adding a fourth plugin means editing this function — OCP violation!

    return results


# ✅ GOOD — Plugin system with protocol enforcement, auto-discovery from config,
# and a dispatcher that never changes when new plugins are added.
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass
class EventContext:
    """Shared mutable context passed through the plugin pipeline."""
    event: dict[str, Any]
    state: dict[str, Any] = field(default_factory=dict)


class PipelinePlugin(Protocol):
    """Contract for any event pipeline plugin. All plugins must implement process()."""

    @property
    def priority(self) -> int:
        """Execution order — lower number runs first. Default is 100."""
        return 100

    def process(self, context: EventContext) -> dict[str, Any] | None:
        """Transform or annotate the event. Return modified state or None."""
        ...


class BasePlugin:
    """Abstract base providing shared defaults and validation hooks."""

    @property
    def priority(self) -> int:
        return 100

    def process(self, context: EventContext) -> dict[str, Any] | None:
        raise NotImplementedError(f"{self.__class__.__name__} must implement process()")

    def validate(self, context: EventContext) -> bool:
        """Optional validation hook — subclasses override to check prerequisites."""
        return True


# ── Concrete plugins — each in its own file ──


class ValidateEventPlugin(BasePlugin):
    """Validates required fields exist in the event."""

    @property
    def priority(self) -> int:
        return 10  # Runs first

    def process(self, context: EventContext) -> dict[str, Any] | None:
        required = ["type", "timestamp", "source"]
        missing = [f for f in required if f not in context.event]
        if missing:
            raise ValueError(f"Event missing required fields: {missing}")
        context.state["validated"] = True
        return {"validation": "passed"}


class NormalizeFieldsPlugin(BasePlugin):
    """Normalizes field naming conventions (snake_case → camelCase)."""

    @property
    def priority(self) -> int:
        return 20

    def process(self, context: EventContext) -> dict[str, Any] | None:
        def _to_camel(s: str) -> str:
            parts = s.split("_")
            return parts[0] + "".join(p.capitalize() for p in parts[1:])

        normalized = {_to_camel(k): v for k, v in context.event.items()}
        context.event.update(normalized)
        context.state["normalized"] = True
        return {"fields": list(normalized.keys())}


class EnrichMetadataPlugin(BasePlugin):
    """Enriches event with external metadata (geolocation, user profile, etc.)."""

    def __init__(self, enricher_url: str = "http://metadata.internal/enrich") -> None:
        self.enricher_url = enricher_url

    @property
    def priority(self) -> int:
        return 50  # Runs after validation and normalization

    def process(self, context: EventContext) -> dict[str, Any] | None:
        # In production: call external enrichment service
        enriched_meta = {"enriched": True, "source_ip": "10.0.0.1"}
        context.state["metadata"] = enriched_meta
        return {"enrichment": enriched_meta}


# ── Pipeline Engine — never changes when new plugins are added ──


class PluginRegistry:
    """Discovers and registers pipeline plugins from a YAML configuration file."""

    def __init__(self, config_path: str) -> None:
        self._plugins: list[PipelinePlugin] = []
        self._config_path = Path(config_path)

    @classmethod
    def discover_plugins(cls, config_path: str) -> "PluginRegistry":
        """Load pipeline configuration and instantiate registered plugins.
        
        The config.yaml file specifies which plugin classes to instantiate.
        Deploying a new plugin requires only adding its entry to config.yaml —
        no code changes needed.
        """
        registry = cls(config_path)

        with open(config_path) as f:
            config = yaml.safe_load(f)

        for entry in config.get("plugins", []):
            class_path = entry["class"]  # e.g., "mycompany.plugins.EnrichMetadataPlugin"
            module_path, class_name = class_path.rsplit(".", 1)
            module = __import__(module_path, fromlist=[class_name])
            plugin_class = getattr(module, class_name)

            # Enforce Protocol compliance at load time
            if not isinstance(plugin_class(), PipelinePlugin):
                raise TypeError(f"{class_path} does not implement PipelinePlugin")

            # Instantiate with any configured kwargs
            init_kwargs = entry.get("params", {})
            plugin_instance: PipelinePlugin = plugin_class(**init_kwargs)
            registry._plugins.append(plugin_instance)

        return registry

    @property
    def sorted_plugins(self) -> list[PipelinePlugin]:
        """Return plugins ordered by priority (lowest first)."""
        return sorted(self._plugins, key=lambda p: p.priority)

    @property
    def plugin_names(self) -> list[str]:
        return [p.__class__.__name__ for p in self._sorted_plugins]

    @property
    def _sorted_plugins(self) -> list[PipelinePlugin]:
        return self.sorted_plugins


def process_event(event: dict[str, Any], config_path: str = "pipeline.yaml") -> EventContext:
    """Run the plugin pipeline — dispatcher never changes when plugins are added."""
    registry = PluginRegistry.discover_plugins(config_path)
    context = EventContext(event=event.copy())

    for plugin in registry.sorted_plugins:
        if not plugin.validate(context):
            continue

        result = plugin.process(context)
        if result is not None:
            context.state[f"plugin_{plugin.__class__.__name__}"] = result

    return context


# ── Example config.yaml (deployed separately, no code changes needed) ──
# plugins:
#   - class: myplugins.validate.ValidateEventPlugin
#     params: {}
#   - class: myplugins.normalize.NormalizeFieldsPlugin
#     params: {}
#   - class: myplugins.enrich.EnrichMetadataPlugin
#     params:
#       enricher_url: "http://metadata.internal/enrich"
# ---
# To add a new plugin, deploy the Python module and add one entry here.
# The pipeline engine in process_event() never changes.
```

### Pattern 5: Protocol with Default Implementations via ABC Mixins

When most variants share common behavior but need to override specific methods, use an ABC as the base class with default implementations — this reduces boilerplate while preserving the OCP guarantee that new variants only add files.

```python
# ❌ BAD — Each tax calculator duplicates the rounding and validation logic
from decimal import Decimal, ROUND_HALF_UP


class TaxCalculator:
    """Tax calculation with duplicated boilerplate across branches."""

    def calculate(self, amount: float, region: str) -> Decimal:
        if region == "us_ca":
            rate = 0.0725
        elif region == "us_ny":
            rate = 0.08
        elif region == "eu_de":
            rate = 0.19
        elif region == "eu_fr":
            rate = 0.20
        else:
            raise ValueError(f"Unknown region: {region}")

        tax = Decimal(str(amount)) * Decimal(str(rate))
        # Every variant duplicates these two lines — DRY violation on top of OCP
        return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ✅ GOOD — ABC with shared default method; variants only override what differs
from abc import ABC, abstractmethod
from decimal import Decimal, ROUND_HALF_UP


class TaxRateProvider(ABC):
    """Abstract contract for a tax jurisdiction's rate provider."""

    @property
    @abstractmethod
    def rate(self) -> float:
        """The tax rate as a decimal (e.g., 0.0725 for 7.25%)."""
        ...

    def calculate_tax(self, amount: float) -> Decimal:
        """Default implementation: apply rate and round to cents.
        
        Concrete subclasses only need to define `rate`.
        All variants inherit identical rounding, validation, and error handling.
        """
        if amount < 0:
            raise ValueError(f"Tax amount must be non-negative, got {amount}")

        tax = Decimal(str(amount)) * Decimal(str(self.rate))
        return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CaliforniaTaxRate(TaxRateProvider):
    @property
    def rate(self) -> float:
        return 0.0725


class NewYorkTaxRate(TaxRateProvider):
    @property
    def rate(self) -> float:
        return 0.08


class GermanyTaxRate(TaxRateProvider):
    @property
    def rate(self) -> float:
        return 0.19


class FranceTaxRate(TaxRateProvider):
    @property
    def rate(self) -> float:
        return 0.20


# Registry maps region codes to tax rate classes — adding a new region means
# creating one class and registering it. The TaxEngine never changes.
REGION_TAX_REGISTRY: dict[str, type[TaxRateProvider]] = {
    "us_ca": CaliforniaTaxRate,
    "us_ny": NewYorkTaxRate,
    "eu_de": GermanyTaxRate,
    "eu_fr": FranceTaxRate,
}


class TaxEngine:
    """Stateless tax calculation engine — closed for modification."""

    def calculate_tax(self, amount: float, region: str) -> Decimal:
        """Calculate tax for a given amount and region using registered rate providers."""
        provider_class = REGION_TAX_REGISTRY.get(region)
        if provider_class is None:
            available = sorted(REGION_TAX_REGISTRY.keys())
            raise ValueError(f"Unknown region '{region}'. Available: {available}")

        provider: TaxRateProvider = provider_class()
        return provider.calculate_tax(amount)
```

---

## Constraints

### MUST DO
- When adding a new variant, only create a new class implementing the existing abstraction — never modify the dispatch logic or add `elif`/`case` branches to existing conditional chains
- Use Python Protocols for structural typing when the hierarchy is behavioral rather than categorical — this avoids unnecessary inheritance while still enforcing contracts
- Maintain backward compatibility — all existing implementations must work identically after refactoring; verify with integration tests that cover every registered strategy
- Place factory registries in a dedicated module (e.g., `strategies.py` or `dispatch.py`) separate from the individual strategy classes to maintain clean separation of concerns
- Document the invariant contract on the abstraction — every method must have typed signatures, docstrings, and clearly stated preconditions/postconditions

### MUST NOT DO
- Add "elif" or "case" branches to existing conditional logic for new variants — this is the definition of an OCP violation and renders the refactoring pointless
- Create abstract base classes with dozens of methods that subclasses rarely implement (violates Interface Segregation Principle alongside OCP)
- Use inheritance for code sharing between sibling strategy classes when composition and dependency injection achieve the same result more flexibly
- Register strategies inline inside the dispatcher function — registries must be module-level or class-level so they survive across calls and can be introspected
- Implement the registry pattern with `isinstance` checks on concrete classes instead of dispatching through the abstraction — this couples the caller to specific implementations

---

## Output Template

When applying this skill to refactor existing code, produce:

1. **Violation Identification** — List every function/class that requires modification for new variants, with line numbers and count of affected locations
2. **Proposed Abstraction** — The Protocol or ABC definition with all methods, types, and docstrings
3. **Refactored Dispatch Logic** — The factory registry (dict or decorator-based) replacing the original conditional chain
4. **New Variant Classes** — Each extracted strategy class with typed signatures, docstrings, and a brief explanation of what it replaced
5. **Regression Verification Plan** — Test cases that confirm existing behavior is unchanged after refactoring

---

## Related Skills

| Skill | Purpose |
|---|---|
| `single-responsibility` | Ensures each extracted strategy class has one reason to change — SRP complements OCP at the class level |
| `liskov-substitution-principle` | Guarantees that all implementations of the abstraction can be substituted without breaking callers |
| `interface-segregation-principle` | Keeps the abstraction narrow — only methods invoked by every variant belong on the protocol |
| `dependency-inversion-principle` | The dispatcher depends on the Protocol abstraction, not concrete strategy classes — DIP enables OCP at the module level |
| `design-patterns-architecture` | Broader catalog of structural patterns (Strategy, Factory, Chain of Responsibility) that implement OCP in specific contexts |
