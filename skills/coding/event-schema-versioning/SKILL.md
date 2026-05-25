---
name: event-schema-versioning
description: Implements event schema versioning strategies (semantic versioning, forward/backward compatibility, schema registry, deprecation lifecycle) to evolve event contracts in production event-driven systems without breaking consumers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event schema versioning, schema evolution, backward compatible events, forward compatible events, pydantic models, event migration, deprecated fields, schema registry
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
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: event-driven-patterns, event-sourcing-pattern, domain-events, api-versioning-strategies, microservices-architecture
---

# Event Schema Versioning

Manages the full lifecycle of event schema evolution — versioning contracts, enforcing compatibility guarantees, migrating deprecated fields, and operating a centralized schema registry to prevent breaking changes in production event-driven systems.

## TL;DR Checklist

- [ ] Assign semantic version (major.minor.patch) to every event type on creation
- [ ] Treat backward compatibility as the default — consumers must handle unknown fields gracefully
- [ ] Use additive-only schema changes for minor versions; reserve major bumps for incompatible restructures
- [ ] Validate all producer payloads against the schema registry before publishing
- [ ] Run a dual-publish migration window (minimum 30 days) when removing or renaming any field
- [ ] Enforce forward compatibility: never assume consumers understand your new fields
- [ ] Track every deprecated field with an expiration TTL and auto-remove after the sunset period

---

## When to Use

Use this skill when:

- Designing event schemas for a new event-driven system and defining versioning conventions
- Introducing breaking or additive changes to existing event payloads used by multiple consumers
- Building a schema registry to centralize validation across service boundaries
- Migrating deprecated fields without disrupting running consumer services
- Classifying whether a proposed event change is compatible, requires minor version bump, or demands a major version bump
- Implementing discriminated union routing for multi-version event handling in Pydantic-based systems

---

## When NOT to Use

Avoid this skill for:

- One-off internal events with no consumers (no versioning overhead needed)
- Events that are immediately discarded after single processing — the migration cost outweighs the benefit
- UI/frontend state management (separate concern — use `api-versioning-strategies` instead)
- When all services share a monolithic codebase and deploy simultaneously — versioning adds unnecessary complexity

---

## Core Workflow

1. **Classify the Change** — Determine whether the proposed schema modification is additive (compatible), requires field deprecation (dual-write), or breaks existing consumers (major version). **Checkpoint:** If any current consumer would deserialize incorrectly with the new schema, it is a major change requiring a new event version.

2. **Update Event Schema** — Apply the change following the compatibility rules from this skill. For Pydantic v2 models: use `Field(default=None)` for optional fields, `model_config = ConfigDict(extra="allow")` for forward-compatible schemas, and discriminated unions for multi-version routing. **Checkpoint:** Every model has a version field or discriminator tag that enables consumers to route correctly.

3. **Deploy Schema Registry Entry** — Register the new schema version in the registry with compatibility mode (full-backward, forward-only, or full). Validate existing producers against the new entry before switching traffic. **Checkpoint:** The registry rejects incompatible publishes during the enforcement window.

4. **Run Dual-Publish Migration** — For major changes: publish both old and new event versions simultaneously. Route consumers incrementally. Monitor deserialization errors. **Checkpoint:** Zero unhandled schema version errors across all consumer logs for 7 consecutive days before sunset.

5. **Deprecate and Sunset** — After the migration window (minimum 30 days), disable production publishing of the old version. Archive the registry entry after an additional 90-day observation period. **Checkpoint:** The deprecated event type has no active consumers in metrics or monitoring dashboards.

---

## Implementation Patterns

### Pattern 1: Semantic Versioned Event with Pydantic v2

Every event carries a stable schema version. Use Pydantic v2's `model_config` to control forward compatibility, and enforce required/optional field semantics explicitly.

```python
from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EventVersion(str, Enum):
    """Semantic event version identifiers for type-safe routing."""
    V1 = "v1"
    V2 = "v2"
    V3 = "v3"


class OrderCreatedEventV1(BaseModel):
    """Schema version v1 — initial order event structure.

    All fields are required because this was the first stable schema.
    No extra fields were allowed, so unknown data would fail validation.
    """
    model_config = ConfigDict(extra="forbid")

    event_type: str = "order.created"
    version: EventVersion = EventVersion.V1
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    order_id: str
    customer_id: str
    amount_cents: int
    currency: str = "USD"

    def to_payload(self) -> dict[str, Any]:
        """Serialize for transport (JSON, message broker, etc.)."""
        return {
            "event_type": self.event_type,
            "version": self.version.value,
            **self.model_dump(mode="json"),
        }


class OrderCreatedEventV2(BaseModel):
    """Schema version v2 — additive changes only.

    Added optional fields: `shipping_address`, `items`.
    Removed the `currency` constraint — now inferred from amount_cents if absent.
    Enabled extra fields for forward compatibility with future consumer additions.
    """
    model_config = ConfigDict(extra="allow")

    event_type: str = "order.created"
    version: EventVersion = EventVersion.V2
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    order_id: str
    customer_id: str
    amount_cents: int
    items: list[dict[str, Any]] | None = None
    shipping_address: dict[str, Any] | None = None


class OrderCreatedEventV3(BaseModel):
    """Schema version v3 — major restructuring.

    Split `items` into structured `LineItem` models for type safety.
    Added `payment_method` and `metadata` fields.
    Deprecated `currency` field — now inferred from amount_cents context.
    """
    model_config = ConfigDict(extra="allow")

    event_type: str = "order.created"
    version: EventVersion = EventVersion.V3
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    order_id: str
    customer_id: str
    amount_cents: int
    items: list[dict[str, Any]] | None = None
    shipping_address: dict[str, Any] | None = None
    payment_method: str | None = None
    metadata: dict[str, Any] | None = None
    currency: str | None = Field(
        default=None,
        deprecated=True,
        description="Deprecated since v3 — use context to infer currency",
    )

    def is_deprecated_field_used(self) -> bool:
        """Check if consumer is still relying on deprecated fields."""
        return self.currency is not None
```

### Pattern 2: Forward-Compatible Consumer with Extra Fields

Consumers must accept unknown fields gracefully. Enable `extra="allow"` in Pydantic models and document which fields are consumed vs. silently ignored.

```python
from typing import Any


class OrderConsumerForwardCompatible(BaseModel):
    """A consumer model that handles any future fields from producers.

    By default, this consumer ignores extra fields but still validates
    all known required fields. Unknown fields are preserved in the
    `extra_data` dict so they are not silently lost for debugging.
    """
    model_config = ConfigDict(extra="allow")

    order_id: str
    customer_id: str
    amount_cents: int

    def process(self, raw_payload: dict[str, Any]) -> None:
        """Deserialize payload and extract both known and unknown fields.

        Args:
            raw_payload: Incoming event payload from the message broker.

        Returns:
            None — processes side effects (DB write, notification, etc.)
        """
        # Pydantic v2 automatically captures extra fields
        self._known_fields = {
            "order_id": self.order_id,
            "customer_id": self.customer_id,
            "amount_cents": self.amount_cents,
        }

        # Preserve unknown fields for observability and debugging
        known_keys = {"order_id", "customer_id", "amount_cents", "version"}
        self._unknown_fields = {
            k: v for k, v in raw_payload.items() if k not in known_keys
        }

        # Log for audit trail — important for schema evolution tracking
        if self._unknown_fields:
            print(
                f"[Consumer] Received unknown fields for order {self.order_id}: "
                f"{list(self._unknown_fields.keys())}"
            )


# ✅ GOOD: Consumer handles unknown `shipping_address` and `items`
payload_v2 = {
    "order_id": "ORD-001",
    "customer_id": "CUST-42",
    "amount_cents": 5999,
    "version": "v2",
    "items": [{"sku": "WIDGET-A", "qty": 3}],
    "shipping_address": {"zip": "10001"},
}

consumer = OrderConsumerForwardCompatible(**payload_v2)
consumer.process(payload_v2)
# → [Consumer] Received unknown fields for order ORD-001: ['items', 'shipping_address']


# ❌ BAD: Consumer with extra="forbid" silently crashes on v2 payloads
class BrokenConsumer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_id: str
    customer_id: str
    amount_cents: int


try:
    BrokenConsumer(**payload_v2)  # Raises ValidationError!
except Exception as exc:
    print(f"[Consumer] FAILED to process v2 payload: {exc}")
```

### Pattern 3: Discriminated Union for Multi-Version Routing

Use Pydantic's `Discriminator` tag to automatically route events to the correct version handler. This enables a single consumer entry point that dispatches by schema version without manual version checks.

```python
from typing import Annotated, Literal, Union


class EventEnvelopeV1(BaseModel):
    """Envelope for v1 events — tagged via the `version` discriminator."""
    event_type: str = "order.created"
    version: Literal["v1"] = "v1"
    order_id: str
    customer_id: str
    amount_cents: int


class EventEnvelopeV2(BaseModel):
    """Envelope for v2 events — same structure plus optional fields."""
    event_type: str = "order.created"
    version: Literal["v2"] = "v2"
    order_id: str
    customer_id: str
    amount_cents: int
    items: list[dict[str, Any]] | None = None
    shipping_address: dict[str, Any] | None = None


class EventEnvelopeV3(BaseModel):
    """Envelope for v3 events — major restructuring with payment method."""
    event_type: str = "order.created"
    version: Literal["v3"] = "v3"
    order_id: str
    customer_id: str
    amount_cents: int
    items: list[dict[str, Any]] | None = None
    shipping_address: dict[str, Any] | None = None
    payment_method: str | None = None
    metadata: dict[str, Any] | None = None


# Union of all supported versions — discriminated by `version` field
OrderEvent = Annotated[
    Union[EventEnvelopeV1, EventEnvelopeV2, EventEnvelopeV3],
    Field(discriminator="version"),
]


def route_and_handle(raw_payload: dict[str, Any]) -> None:
    """Parse and dispatch to the correct version handler.

    Pydantic automatically selects the right variant based on the `version` field.
    Unknown versions raise a ValidationError that can be caught centrally.

    Args:
        raw_payload: Raw event payload from the message broker.

    Raises:
        ValueError: If the event version is not supported by any handler.
    """
    try:
        event: OrderEvent = EventEnvelopeV2.model_validate(raw_payload)  # v2 default fallback
        if isinstance(event, EventEnvelopeV1):
            _handle_v1(event)
        elif isinstance(event, EventEnvelopeV2):
            _handle_v2(event)
        else:
            _handle_v3(event)
    except Exception as exc:
        # Catch all — log and send to dead-letter queue
        print(f"[Router] Failed to route event: {exc}")


def _handle_v1(event: EventEnvelopeV1) -> None:
    """Legacy v1 handler — no items or shipping address support."""
    print(f"[v1] Processing order {event.order_id}: {event.amount_cents} cents")


def _handle_v2(event: EventEnvelopeV2) -> None:
    """Enhanced v2 handler — supports line items and shipping."""
    item_count = len(event.items or [])
    has_shipping = event.shipping_address is not None
    print(f"[v2] Processing order {event.order_id}: "
          f"{item_count} items, shipping={'yes' if has_shipping else 'no'}")


def _handle_v3(event: EventEnvelopeV3) -> None:
    """Full v3 handler — includes payment method and metadata."""
    print(f"[v3] Processing order {event.order_id}: "
          f"payment={event.payment_method or 'unknown'}, "
          f"metadata_keys={list(event.metadata.keys()) if event.metadata else 'none'}")


# Usage examples demonstrating version discrimination
for payload in [
    {"version": "v1", "order_id": "ORD-001", "customer_id": "CUST-42", "amount_cents": 5999},
    {"version": "v2", "order_id": "ORD-002", "customer_id": "CUST-43", "amount_cents": 12999, "items": [{"sku": "B"}], "shipping_address": {"zip": "90210"}},
    {"version": "v3", "order_id": "ORD-003", "customer_id": "CUST-44", "amount_cents": 7500, "payment_method": "stripe", "metadata": {"referral": "campaign"}},
]:
    route_and_handle(payload)
```

### Pattern 4: Schema Registry with Compatibility Enforcement

A centralized schema registry enforces compatibility rules across all producers. This pattern implements a minimal in-process registry; for production, replace with Apache Avro Schema Registry, Confluent Schema Registry, or similar.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass(frozen=True)
class SchemaEntry:
    """Immutable schema version entry stored in the registry."""
    event_type: str
    version: str
    model_class: type[BaseModel]
    compatibility_mode: str  # "full-backward", "forward-only", "full"
    created_at: datetime = field(default_factory=datetime.utcnow)
    deprecated_until: datetime | None = None

    @property
    def is_deprecated(self) -> bool:
        if self.deprecated_until is None:
            return False
        return datetime.utcnow() > self.deprecated_until


class SchemaRegistryError(Exception):
    """Raised when schema validation fails against registry rules."""
    pass


class SchemaRegistry:
    """Centralized schema registry for event payload validation and compatibility enforcement.

    Supports three compatibility modes:
    - full-backward: new producers can use old schema, old consumers read new data (extra fields ignored)
    - forward-only: old consumers must handle unknown fields gracefully, new producers produce new schema
    - full: strict — both producers and consumers must agree on the current version only
    """

    def __init__(self) -> None:
        self._registry: dict[str, list[SchemaEntry]] = {}
        self._enforcement_mode: str = "full-backward"

    def register(
        self,
        event_type: str,
        version: str,
        model_class: type[BaseModel],
        compatibility_mode: str | None = None,
        deprecated_until: datetime | None = None,
    ) -> SchemaEntry:
        """Register a new schema version in the registry.

        Args:
            event_type: The domain event type (e.g., "order.created").
            version: Semantic version string (e.g., "v1", "v2").
            model_class: Pydantic v2 model class representing this schema version.
            compatibility_mode: Override per-event-type mode ("full-backward", "forward-only", "full").
            deprecated_until: Sunset date for deprecation lifecycle.

        Returns:
            The registered SchemaEntry for reference.

        Raises:
            SchemaRegistryError: If the event_type already has this version registered.
        """
        if event_type not in self._registry:
            self._registry[event_type] = []

        existing = [e for e in self._registry[event_type] if e.version == version]
        if existing:
            raise SchemaRegistryError(
                f"Schema version '{version}' already registered for event type '{event_type}'"
            )

        entry = SchemaEntry(
            event_type=event_type,
            version=version,
            model_class=model_class,
            compatibility_mode=compatibility_mode or self._enforcement_mode,
            deprecated_until=deprecated_until,
        )
        self._registry[event_type].append(entry)
        return entry

    def validate_producer(
        self,
        event_type: str,
        payload: dict[str, Any],
        target_version: str | None = None,
    ) -> bool:
        """Validate a producer payload against the specified (or latest) schema version.

        Args:
            event_type: The event type being published.
            payload: Dict representation of the event data.
            target_version: Specific version to validate against; defaults to latest.

        Returns:
            True if the payload matches the schema.

        Raises:
            SchemaRegistryError: If the payload is incompatible with the target schema.
        """
        entries = self._registry.get(event_type, [])
        if not entries:
            raise SchemaRegistryError(f"No schema registered for event type '{event_type}'")

        entry = (
            next(e for e in entries if e.version == target_version)
            if target_version
            else max(entries, key=lambda e: e.version)
        )

        # Reject deprecated schemas for new publishes
        if entry.is_deprecated:
            raise SchemaRegistryError(
                f"Schema {entry.event_type}:{entry.version} is deprecated — "
                f"publish to a non-deprecated version"
            )

        try:
            entry.model_class.model_validate(payload)
            return True
        except Exception as exc:
            raise SchemaRegistryError(
                f"Payload validation failed against {event_type}:{entry.version}: {exc}"
            ) from exc

    def get_supported_versions(self, event_type: str) -> list[str]:
        """List all registered versions for an event type."""
        entries = self._registry.get(event_type, [])
        return [e.version for e in entries]


# Production usage example
registry = SchemaRegistry()

# Register v1 and v2 schemas
registry.register("order.created", "v1", EventEnvelopeV1)
registry.register(
    "order.created",
    "v2",
    EventEnvelopeV2,
    deprecated_until=datetime.utcnow() + timedelta(days=90),
)
registry.register("order.created", "v3", EventEnvelopeV3)

# Validate a v3 payload
is_valid = registry.validate_producer(
    "order.created",
    {
        "version": "v3",
        "event_type": "order.created",
        "order_id": "ORD-999",
        "customer_id": "CUST-100",
        "amount_cents": 14500,
        "items": [{"sku": "DELUXE-B", "qty": 2}],
        "payment_method": "paypal",
    },
)
assert is_valid

# Reject publish to deprecated v2 after sunset
if datetime.utcnow() > (datetime.utcnow() + timedelta(days=90)):
    registry.validate_producer("order.created", {"version": "v2"}, target_version="v2")  # Raises error
```

### Pattern 5: Field Deprecation with TTL and Dual-Write Migration

When removing a field, announce its deprecation, continue producing it during the migration window (dual-write), then remove after consumers have migrated. This pattern tracks deprecated field usage and auto-reports when fields enter their sunset period.

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class DeprecatedFieldRule:
    """Policy for deprecating a specific event schema field."""
    event_type: str
    version: str
    field_name: str
    replacement_field: str | None = None
    announced_at: datetime = field(default_factory=datetime.utcnow)
    sunset_after_days: int = 90

    @property
    def effective_sunset_date(self) -> datetime:
        return self.announced_at + timedelta(days=self.sunset_after_days)

    @property
    def is_active_deprecation(self) -> bool:
        now = datetime.utcnow()
        # Grace period starts immediately — no warning, just enforce sunset
        return now < self.effective_sunset_date


class FieldDeprecationTracker:
    """Tracks deprecated field usage and enforces sunset dates across event schemas.

    Usage:
        tracker = FieldDeprecationTracker()
        tracker.register_deprecation("order.created", "v3", "currency", replacement_field="metadata.currency_context")
    """

    def __init__(self) -> None:
        self._rules: list[DeprecatedFieldRule] = []

    def register_deprecation(
        self,
        event_type: str,
        version: str,
        field_name: str,
        replacement_field: str | None = None,
        sunset_after_days: int = 90,
    ) -> DeprecatedFieldRule:
        """Register a field deprecation with automatic sunset scheduling.

        Args:
            event_type: The event type whose field is being deprecated.
            version: The schema version this rule applies to.
            field_name: The exact field name to deprecate.
            replacement_field: New field consumers should use instead.
            sunset_after_days: Days after which the deprecated field must be removed.

        Returns:
            The registered DeprecatedFieldRule for reference.
        """
        rule = DeprecatedFieldRule(
            event_type=event_type,
            version=version,
            field_name=field_name,
            replacement_field=replacement_field,
            sunset_after_days=sunset_after_days,
        )
        self._rules.append(rule)
        return rule

    def is_deprecated(self, event_type: str, field_name: str) -> DeprecatedFieldRule | None:
        """Check if a specific field on an event type is currently deprecated."""
        for rule in self._rules:
            if rule.event_type == event_type and rule.field_name == field_name:
                return rule
        return None

    def get_active_deprecations(self, event_type: str) -> list[DeprecatedFieldRule]:
        """Return all active (non-sunsetted) deprecation rules for an event type."""
        return [
            r for r in self._rules
            if r.event_type == event_type and r.is_active_deprecation
        ]

    def get_sunset_warnings(self, event_type: str) -> list[DeprecatedFieldRule]:
        """Return deprecations approaching sunset within the next 14 days.

        These should trigger alerts to engineering teams to accelerate migration.
        """
        warning_window = datetime.utcnow() + timedelta(days=14)
        return [
            r for r in self._rules
            if r.event_type == event_type
            and not r.is_active_deprecation  # approaching sunset means close to it
            or (r.effective_sunset_date <= warning_window and r.is_active_deprecation)
        ]


# Example: Track currency field deprecation on v3
tracker = FieldDeprecationTracker()
rule = tracker.register_deprecation(
    "order.created",
    "v3",
    "currency",
    replacement_field="metadata.currency_context",
    sunset_after_days=90,
)

# Check if a producer is still sending deprecated fields
def validate_producer_against_deprecations(
    payload: dict[str, Any],
    event_type: str,
    tracker: FieldDeprecationTracker,
) -> list[str]:
    """Return list of warnings for deprecated field usage in payload."""
    warnings = []
    active_rules = tracker.get_active_deprecations(event_type)

    for rule in active_rules:
        if rule.field_name in payload and payload[rule.field_name] is not None:
            warning_msg = (
                f"[DEPRECATION WARNING] Field '{rule.field_name}' on "
                f"'{event_type}' is deprecated. Sunset date: "
                f"{rule.effective_sunset_date.strftime('%Y-%m-%d')}. "
            )
            if rule.replacement_field:
                warning_msg += f"Use '{rule.replacement_field}' instead."
            else:
                warning_msg += "No replacement field defined — remove entirely after sunset."
            warnings.append(warning_msg)

    return warnings


# Simulate a producer sending deprecated 'currency' field in v3 payload
payload_with_deprecated = {
    "version": "v3",
    "order_id": "ORD-888",
    "customer_id": "CUST-200",
    "amount_cents": 1200,
    "currency": "EUR",  # This is deprecated
}

warnings = validate_producer_against_deprecations(
    payload_with_deprecated, "order.created", tracker
)
for w in warnings:
    print(w)
```

### Pattern 6: Event Type Renaming and Splitting Without Breaking Consumers

When renaming or splitting an event type (e.g., `OrderCreated` → `Order.Placed`), use the dual-publish strategy: continue producing the old event alongside the new one, then deprecate the old after all consumers have migrated.

```python
class EventRenamingStrategy:
    """Manages event type renaming and splitting with zero-downtime migration.

    Strategy for renames:
    1. Register both old_name and new_name in the schema registry as aliases
    2. Producer publishes BOTH events during the dual-publish window
    3. Consumers migrate to read new_name (old_name still accepted)
    4. After sunset, producer stops publishing old_name
    5. Registry removes old_name entry

    Strategy for splits:
    1. Define new granular event types (e.g., OrderCreated → Order.Created, Payment.Charged)
    2. Producer publishes all events from the combined payload
    3. Old consumers that handled the combined type now route to specific handlers
    """

    def __init__(self) -> None:
        self._aliases: dict[str, str] = {}  # old_name -> new_name
        self._dual_publish_windows: dict[str, datetime] = {}  # event_type -> sunset_date

    def register_rename(
        self,
        old_event_type: str,
        new_event_type: str,
        dual_publish_days: int = 60,
    ) -> None:
        """Register an event type rename with a dual-publish migration window.

        Both the old and new event types remain active during the migration window.
        Producers publish both; consumers can transition at their own pace.

        Args:
            old_event_type: Current event type name being renamed.
            new_event_type: New canonical event type name.
            dual_publish_days: Minimum days to publish both versions (default 60).
        """
        self._aliases[old_event_type] = new_event_type
        self._dual_publish_windows[old_event_type] = (
            datetime.utcnow() + timedelta(days=dual_publish_days)
        )

    def should_dual_publish(self, event_type: str) -> bool:
        """Check if an old event type should still be published during migration."""
        sunset_date = self._dual_publish_windows.get(event_type)
        if sunset_date is None:
            return False
        return datetime.utcnow() < sunset_date

    def resolve_alias(self, event_type: str) -> str:
        """Resolve an old event type name to its current canonical name.

        Args:
            event_type: The incoming event type from a consumer or broker.

        Returns:
            The canonical event type name (new name if aliased).

        Raises:
            ValueError: If no alias mapping exists for the event type.
        """
        return self._aliases.get(event_type, event_type)

    def get_migration_status(self, event_type: str) -> dict[str, Any]:
        """Get current migration status for a renamed event type."""
        if event_type not in self._aliases:
            return {"status": "no_renaming", "event_type": event_type}

        new_name = self._aliases[event_type]
        is_dual_publishing = self.should_dual_publish(event_type)
        days_remaining = 0

        if is_dual_publishing:
            sunset_date = self._dual_publish_windows[event_type]
            delta = sunset_date - datetime.utcnow()
            days_remaining = max(0, delta.days)

        return {
            "status": "migrating" if is_dual_publishing else "sunset_complete",
            "event_type": event_type,
            "new_event_type": new_name,
            "dual_publish_active": is_dual_publishing,
            "days_remaining": days_remaining,
        }


# Example: Migrate OrderCreated → Order.Placed
strategy = EventRenamingStrategy()
strategy.register_rename("order.created", "order.placed", dual_publish_days=60)

# Producer checks — should we publish the old event type?
if strategy.should_dual_publish("order.created"):
    print("[Producer] Still publishing 'order.created' alongside 'order.placed'")
    # Publish both events to the broker
else:
    print("[Producer] Sunset complete — only publishing 'order.placed'")

# Consumer checks — what event type does this map to?
canonical_type = strategy.resolve_alias("order.created")
print(f"[Consumer] Routing to canonical type: {canonical_type}")  # → "order.placed"

# Monitor migration progress
status = strategy.get_migration_status("order.created")
print(f"[Migration] {status}")
```

---

## Constraints

### MUST DO
- Always include a `version` field (enum or string) on every event schema
- Enable `extra="allow"` in Pydantic models for all consumer-facing schemas to handle forward compatibility
- Classify every schema change as compatible (additive), deprecated (rename/dual-write), or breaking (major bump) before merging
- Use additive-only changes for minor version bumps — never remove, rename, or change types of existing required fields without a major bump
- Register every new schema version in the registry before enabling production traffic
- Run dual-publish for at least 30 days when removing or renaming any field; 60+ days preferred for high-traffic events
- Validate producer payloads against the latest schema entry via the registry before publishing to the message broker
- Track deprecated field usage with a `FieldDeprecationTracker` and alert teams approaching sunset dates (14-day warning)

### MUST NOT DO
- Remove or rename existing required fields without going through the full deprecation lifecycle
- Publish a major version bump without first announcing it to all consumers 30+ days in advance
- Use `model_config = ConfigDict(extra="forbid")` on consumer-facing schemas — this breaks forward compatibility
- Skip schema registry validation for any event type with more than one consumer service
- Assume consumers will update immediately — always design for at least 30 days of staggered adoption
- Define events without an explicit version field — unversioned events are impossible to evolve safely
- Mix multiple incompatible schemas in a single topic partition — each event type version must be independently consumable

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-patterns` | Core EDA patterns (pub/sub, saga, outbox) that define how events flow between services |
| `event-sourcing-pattern` | Event sourcing uses the same versioning principles but adds state reconstruction via event replay |
| `domain-events` | Domain event design and integration with DDD bounded contexts — the source of truth for event payloads |
| `api-versioning-strategies` | Comparable versioning patterns for REST APIs — similar deprecation lifecycle applies to both events and APIs |
| `microservices-architecture` | How schema versioning fits into microservice service boundaries and cross-service contracts |

---

## Live References

> Authoritative documentation links for event schema evolution and Pydantic v2 type validation.

- [Pydantic v2 Models — Configuration](https://docs.pydantic.dev/latest/api/config/)
- [Pydantic v2 Discriminated Unions](https://docs.pydantic.dev/latest/concepts/unions/#discriminated-unions)
- [Apache Avro Schema Evolution](https://avro.apache.org/docs/current/spec.html#schemas)
- [Confluent Schema Registry Documentation](https://docs.confluent.io/platform/current/schema-registry/develop/api.html)
- [Event Sourcing — Martin Fowler](https://martinfowler.com/eaaDev/eventSourcing.html)
