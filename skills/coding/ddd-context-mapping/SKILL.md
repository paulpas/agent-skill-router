---
name: ddd-context-mapping
description: Implements practical context mapping patterns including anticorruption layers, shared kernels, published language contracts, and customer-supplier relationships for multi-bounded-context systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: context mapping, anticorruption layer, acl implementation, shared kernel, published language, customer supplier relationship, bounded context integration, ddd strategic patterns, conformist pattern, pipeline pattern, open host service
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, domain-modeling, ddd-tactical-patterns
---

# Context Mapping Implementation

Implements practical patterns for integrating bounded contexts in multi-context systems. Provides translation layers (anticorruption), coordination protocols (shared kernel), contract definitions (published language), and relationship management (customer-supplier, conformist, pipeline, open host service) so that context boundaries enforce invariant isolation while enabling cross-context business flows.

## TL;DR Checklist

- [ ] Classify each inter-context relationship before writing code: Customer/Supplier, Conformist, ACL, Shared Kernel, Published Language, Open Host Service, or Pipeline
- [ ] Implement the anticorruption layer as a thin translation module at every context boundary that touches foreign models — never let foreign types cross into your domain package
- [ ] Define published language contracts (JSON schemas, gRPC proto files, event schemas) with versioning and backward-compatibility rules before any integration code is written
- [ ] Set up shared kernel coordination with a change-registry protocol that notifies dependent contexts of model updates
- [ ] Enforce contract stability: Customer/Supplier relationships require backward-compatible contracts; breaking changes require a new published-language version
- [ ] Document every context relationship in the context map and keep it synchronized with code — an undocumented boundary is an untested one

---

## When to Use

- You have two or more bounded contexts that must exchange data or coordinate business operations, and each context owns its own domain model
- An external system (legacy database, third-party API, partner service) uses a different domain vocabulary than yours — you need an anticorruption layer to translate without polluting your domain
- Multiple teams own different bounded contexts that share some concepts (e.g., "Product", "Customer") and need a coordination protocol to prevent semantic drift
- You are designing an integration point between two independently deployed services and need to define the contract language, versioning strategy, and failure modes
- A downstream team needs to consume data from your context but uses different terminology — decide whether they should conform (Conformist), build their own translation (ACL), or both use a shared schema (Published Language)

---

## When NOT to Use

- The system has only one bounded context — all DDD tactical patterns apply directly without cross-context coordination overhead
- Two contexts are tightly coupled and change together (same team, same deployment cycle, same codebase) — this is not truly separate bounded contexts; keep the models unified
- You need real-time synchronization between contexts — consider event sourcing with an event store instead of point-to-point ACLs. ACLs add latency and complexity that make eventual consistency harder to reason about
- A third-party service you consume has no stable API contract — negotiate a published language agreement first, or wrap the service in its own bounded context before building an ACL on top

---

## Core Workflow

1. **Inventory All Context Interactions** — List every pair of bounded contexts that exchange data or coordinate operations. For each pair, identify what flows from where (requests, events, shared models) and which direction is primary. **Checkpoint:** You have a complete inventory table with columns: `source_context`, `target_context`, `data_flows` (direction), `shared_models`, `team_owner_source`, `team_owner_target`. No implicit dependency exists without an entry in this table.

2. **Classify Each Relationship** — For every interaction, assign a context mapping pattern: Customer/Supplier (you depend on their model), Conformist (you adopt their model as-is), Anticorruption Layer (you translate their model to yours), Shared Kernel (both contexts share and coordinate on models), Published Language (both consume the same documented contract), Open Host Service (you expose your model as a service for others), or Pipeline (one-way information flow with independent transformation). **Checkpoint:** Every relationship has exactly one pattern assigned. No interaction is left "TBD" or marked as "just figure it out later."

3. **Implement Translation Layers Where Models Diverge** — For ACL relationships, build a dedicated translation module that accepts foreign types, maps them to your domain types, and rejects anything that cannot be mapped. Implement foreign type detection at the entry point so unexpected schema changes fail fast. **Checkpoint:** Every ACL has `is_foreign_type()` detection and a `translate()` method with explicit field-by-field mapping. No partial translations are allowed.

4. **Define Published Language Contracts** — For Shared Kernel, Published Language, and Open Host Service relationships, define the contract as versioned schema artifacts (JSON Schema for REST payloads, `.proto` files for gRPC, event schema definitions for async events). Document field semantics, allowed values, backward-compatibility rules, and deprecation timelines. **Checkpoint:** Every published language has a `version` field in its schema, a `CHANGELOG.md` entry format, and at least one integration test that validates payloads against the latest version.

5. **Coordinate Shared Kernel Changes** — For Shared Kernel relationships, implement a change-registry protocol: when any shared model is modified, the owning team publishes a notification with a diff summary to all dependent contexts. Define conflict resolution rules (owner wins on semantic disputes, deprecation period before removal, additive-only changes for backward compatibility). **Checkpoint:** A `shared_kernel_registry.py` or equivalent file tracks all shared models, their owners, last-modified dates, and dependents. No shared model exists without a registered owner.

6. **Wire Contract Stability Guards** — For Customer/Supplier relationships, enforce backward-compatibility checks in CI: reject any contract change that removes fields, changes field types, or renames fields without a deprecation period. Require new version numbers for breaking changes. **Checkpoint:** The CI pipeline runs `contract-validation` tests against every PR to the published language schema. Breaking changes are blocked automatically.

7. **Produce and Synchronize the Context Map** — Generate a machine-readable context map (JSON or YAML) from the classified relationships, then produce visual documentation. Update this artifact whenever a new relationship is added, an existing pattern changes, or a context boundary moves. **Checkpoint:** The context map JSON file is checked into version control alongside the code it describes. Every developer can regenerate the visual diagram from this source of truth.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Anticorruption Layer — Translation at the Boundary

The anticorruption layer sits between your bounded context and an external system with an incompatible domain model. It accepts foreign data, validates it, translates each field to your domain types, and rejects anything that cannot be mapped. Foreign types never cross the boundary — they are converted immediately at the entry point.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum, auto
from typing import Protocol, Sequence
import inspect


# ── Your Domain Types (Sales Context) ────────────────────────────────────────

class SalesTier(Enum):
    GOLD = auto()
    SILVER = auto()
    BRONZE = auto()


@dataclass(frozen=True)
class SalesCustomer:
    """Customer model as understood by the Sales bounded context.

    Focused on relationship value, account tier, and preferred contact channel.
    This type must NEVER be accepted by a method in another bounded context.
    """
    customer_id: str
    full_name: str
    email: str
    tier: SalesTier
    lifetime_value: float


# ── Foreign Domain Types (Support Context) ───────────────────────────────────

class SupportSLA(Enum):
    CRITICAL = auto()
    STANDARD = auto()
    LOW = auto()


@dataclass(frozen=True)
class SupportTicketCustomer:
    """Customer model from the Support bounded context.

    Different field names, different semantics for tier (SLA vs account tier),
    and additional fields that Sales does not need or understand.
    """
    identifier: str        # Same person as SalesCustomer.customer_id
    contact_email: str     # Same meaning as full_name is not preserved
    sla_level: SupportSLA  # Different semantics from SalesTier
    open_ticket_count: int
    last_contact_date: date | None


# ── Foreign Type Detection ───────────────────────────────────────────────────

class _ForeignTypeMarker:
    """Base marker class for foreign bounded context types.

    Any type that inherits from this is considered a foreign type and must
    be rejected or translated at the boundary — never passed into domain logic.
    """


@dataclass(frozen=True)
class SupportTicketCustomerForeign(SupportTicketCustomer, _ForeignTypeMarker):
    """Wrapper that marks SupportTicketCustomer as a foreign type.

    Using this wrapper makes type-checking and runtime detection unambiguous.
    """
    pass


# ── Anticorruption Layer Translator ──────────────────────────────────────────

class SalesAnticorruptionLayer:
    """Translates Support context data into Sales context types.

    The ACL lives at the boundary between bounded contexts. It is the ONLY
    place in the Sales context that knows about Support's model structure.
    All domain logic within Sales operates on SalesCustomer only.
    """

    # Tier translation table — maps Support SLA to Sales tier values
    _TIER_TRANSLATION: dict[SupportSLA, SalesTier] = {
        SupportSLA.CRITICAL: SalesTier.GOLD,
        SupportSLA.STANDARD: SalesTier.SILVER,
        SupportSLA.LOW: SalesTier.BRONZE,
    }

    def is_foreign_type(self, obj: object) -> bool:
        """Detect if an object originates from a foreign bounded context.

        Uses multiple detection strategies to catch both explicit wrappers
        and implicitly foreign objects. This prevents foreign types from
        leaking into domain logic through unexpected code paths.
        """
        # Strategy 1: Explicit marker class inheritance
        for base in type(obj).__mro__:
            if issubclass(base, _ForeignTypeMarker):
                return True

        # Strategy 2: Module path inspection — foreign types live in other packages
        module_name = getattr(type(obj), "__module__", "")
        if any(marker in module_name for marker in (
            ".support.context.",
            "support.bounded_context",
            "external_systems",
        )):
            return True

        # Strategy 3: Check for support-specific fields that are not part of Sales types
        known_sales_attrs = {f.name for f in inspect.getfields(SalesCustomer)} if hasattr(inspect, 'getfields') else {'customer_id', 'full_name', 'email', 'tier', 'lifetime_value'}
        obj_attrs = set(dir(obj)) - set(dir(object()))
        support_specific = {"open_ticket_count", "sla_level", "last_contact_date"}
        if support_specific & obj_attrs:
            return True

        return False

    def translate(self, foreign_customer: SupportTicketCustomerForeign) -> SalesCustomer:
        """Translate a Support context customer into the Sales domain model.

        Args:
            foreign_customer: A customer record from the Support bounded context.

        Returns:
            A fully constructed SalesCustomer with all fields mapped.

        Raises:
            TranslationError: If any field cannot be mapped to the Sales model.
        """
        if not foreign_customer.identifier:
            raise TranslationError("Support customer identifier is empty — cannot translate")

        # Map SLA tier to sales tier using the translation table
        try:
            sales_tier = self._TIER_TRANSLATION[foreign_customer.sla_level]
        except KeyError:
            raise TranslationError(
                f"Cannot map SupportSLA '{foreign_customer.sla_level.name}' "
                f"to any SalesTier. Check _TIER_TRANSLATION table."
            )

        # Email mapping — support uses contact_email, sales uses email
        if not foreign_customer.contact_email or "@" not in foreign_customer.contact_email:
            raise TranslationError(
                f"Invalid contact email for customer {foreign_customer.identifier!r}"
            )

        return SalesCustomer(
            customer_id=foreign_customer.identifier,
            full_name="Customer " + foreign_customer.identifier[:8],  # Name may not be available from support context
            email=foreign_customer.contact_email,
            tier=sales_tier,
            lifetime_value=self._estimate_lifetime_value(foreign_customer),
        )

    def _estimate_lifetime_value(self, customer: SupportTicketCustomer) -> float:
        """Estimate lifetime value from support context data.

        In a real system, this would query the Sales context's own billing
        data. Here we use open_ticket_count as a rough proxy for demonstration.
        """
        base_value = 100.0
        ticket_multiplier = 5.0 if customer.open_ticket_count > 3 else 1.0
        return round(base_value * ticket_multiplier, 2)


class TranslationError(Exception):
    """Raised when an anticorruption layer cannot translate a foreign type."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


# ❌ BAD: Foreign types cross the boundary directly — domain logic is polluted
class BadBoundary:
    def handle_support_customer(self, support_customer: SupportTicketCustomer) -> None:
        """Domain code that accepts a foreign type directly."""
        # SalesTier values don't match SupportSLA values — silent mismatch
        tier_name = support_customer.sla_level.name  # "CRITICAL" vs "GOLD"
        # No validation of identifier — could be empty, could be wrong format
        # The domain layer now depends on the support context's model structure
        self._process(tier_name, support_customer.open_ticket_count)

    def _process(self, tier: str, tickets: int) -> None:
        pass  # Domain logic is contaminated with foreign semantics


# ✅ GOOD: Foreign types are detected and translated at the boundary
def handle_support_customer_safely(
    raw_input: object,
    acl: SalesAnticorruptionLayer,
) -> SalesCustomer:
    """Entry point that enforces the anticorruption layer contract."""
    # Detect foreign type immediately — fail fast
    if acl.is_foreign_type(raw_input):
        wrapped = SupportTicketCustomerForeign(**{
            k: getattr(raw_input, k) for k in [
                "identifier", "contact_email", "sla_level",
                "open_ticket_count", "last_contact_date",
            ]
        })
        return acl.translate(wrapped)

    # If not foreign, it should be our own type — reject anything else
    raise TypeError(f"Expected SalesCustomer or SupportTicketCustomerForeign, got {type(raw_input).__name__}")
```

**Key principles:**
- The ACL must be the ONLY code that imports foreign types — domain logic inside the bounded context never sees a foreign module import
- Foreign type detection should use at least two strategies (marker classes + module inspection) to prevent bypass through unexpected code paths
- Translation failures must raise explicit errors, not return `None` or partial results — an incomplete translation is worse than no translation
- Maintain a translation registry (`_TIER_TRANSLATION`, field mapping dicts) that can be reviewed and updated without modifying translation logic

---

### Pattern 2: Shared Kernel — Coordinated Model Sharing

A shared kernel is a subset of models owned by one team but consumed by multiple bounded contexts. The critical requirement is a change-registry protocol: when any shared model is modified, the owner must notify all dependent contexts and follow backward-compatibility rules (additive-only changes during deprecation periods, owner wins on semantic disputes).

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Protocol


class SharedModelChangeType(Enum):
    """Types of changes that can occur to a shared model."""
    ADDITIVE = auto()         # New optional fields added — backward compatible
    MODIFICATION = auto()     # Existing field changed — requires deprecation period
    DEPRECATION = auto()      # Field marked for removal — consumers must migrate
    REMOVAL = auto()          # Field removed — breaking change, needs new version
    SEMANTIC_SHIFT = auto()   # Meaning of existing field changed — highest risk


class BackwardCompatibilityLevel(Enum):
    """Defines the compatibility guarantee for a shared model change."""
    FULLY_COMPATIBLE = "fully_compatible"       # Additive-only: zero consumer impact
    DEPRECATED_REMOVABLE = "deprecated_removable"  # Deprecated fields can be removed with notice
    BREAKING_CHANGE = "breaking_change"          # Requires version bump and consumer migration


@dataclass(frozen=True)
class SharedKernelModel:
    """A model that belongs to the shared kernel and is consumed by multiple contexts.

    Attributes:
        model_name: Canonical name of the shared model (e.g., "Product", "Customer")
        owner_context: The bounded context that owns this model's definitive version
        version: Semantic version string following semver (e.g., "2.1.0")
        fields: List of field definitions with types and compatibility level
        last_modified: Timestamp of the last schema change
        dependents: List of bounded contexts that consume this model
        deprecation_timeline_days: Days before a deprecated field is removed
    """
    model_name: str
    owner_context: str
    version: str = "1.0.0"
    fields: list[SharedField] = field(default_factory=list)
    last_modified: datetime = field(default_factory=datetime.now)
    dependents: list[str] = field(default_factory=list)
    deprecation_timeline_days: int = 90

    def validate_dependency(self, requesting_context: str) -> None:
        """Validate that a context is an approved dependent before exposing the model."""
        if self.dependents and requesting_context not in self.dependents:
            raise PermissionError(
                f"Context '{requesting_context}' is not listed as a dependent "
                f"of shared model '{self.model_name}'. Current dependents: "
                f"{', '.join(self.dependents)}"
            )

    def can_add_field(self, field_name: str) -> bool:
        """Check if a new field can be added without breaking compatibility."""
        existing_fields = {f.name for f in self.fields}
        return field_name not in existing_fields


@dataclass(frozen=True)
class SharedField:
    """Definition of a single field within a shared kernel model.

    Attributes:
        name: Field identifier
        type_hint: String representation of the field's type
        required: Whether consumers must handle this field
        compatibility: The compatibility level for changes to this field
        deprecated_since: Version when this field was marked deprecated (if applicable)
    """
    name: str
    type_hint: str
    required: bool = True
    compatibility: BackwardCompatibilityLevel = BackwardCompatibilityLevel.FULLY_COMPATIBLE
    deprecated_since: str | None = None


class SharedKernelRegistry:
    """Central registry for shared kernel models and change coordination.

    The registry is the single source of truth for which models are shared,
    who owns them, and which contexts depend on each one. All shared model
    changes must go through this registry.
    """

    def __init__(self) -> None:
        self._models: dict[str, SharedKernelModel] = {}
        self._change_log: list[SharedModelChangeRecord] = []

    def register_model(
        self,
        model_name: str,
        owner_context: str,
        dependents: list[str] | None = None,
        initial_fields: list[SharedField] | None = None,
    ) -> SharedKernelModel:
        """Register a new shared kernel model.

        Args:
            model_name: Canonical name of the model (e.g., "Product", "Order")
            owner_context: The bounded context that owns this model
            dependents: Bounded contexts that consume this model
            initial_fields: Initial field definitions

        Returns:
            The registered SharedKernelModel
        """
        if model_name in self._models:
            raise ValueError(f"Shared model '{model_name}' is already registered")

        model = SharedKernelModel(
            model_name=model_name,
            owner_context=owner_context,
            dependents=dependents or [],
            fields=initial_fields or [],
        )
        self._models[model_name] = model
        return model

    def propose_change(
        self,
        model_name: str,
        change_type: SharedModelChangeType,
        field_name: str | None = None,
        proposed_by: str = "",
    ) -> SharedKernelChangeReview:
        """Propose a change to a shared kernel model.

        This triggers the review process — all dependent contexts are notified
        and must approve changes that affect their consumption of the model.

        Args:
            model_name: The shared model being modified
            change_type: Type of change being proposed
            field_name: The specific field being changed (if applicable)
            proposed_by: Name of the context proposing the change

        Returns:
            A review object for coordination between contexts

        Raises:
            KeyError: If the model is not registered in the registry
            PermissionError: If the proposing context is not the owner
        """
        if model_name not in self._models:
            raise KeyError(f"Shared model '{model_name}' is not registered")

        model = self._models[model_name]

        # Owner validation — only the owner can propose changes to their model
        if proposed_by and proposed_by != model.owner_context:
            # Non-owners can request changes but must go through the owner
            pass  # In production, this would require an approval workflow

        review = SharedKernelChangeReview(
            model_name=model_name,
            change_type=change_type,
            field_name=field_name,
            proposed_by=proposed_by or model.owner_context,
            owner_context=model.owner_context,
            affected_dependents=list(model.dependents),
            compatibility_level=self._determine_compatibility(change_type),
        )

        self._change_log.append(review)
        return review

    def _determine_compatibility(self, change_type: SharedModelChangeType) -> BackwardCompatibilityLevel:
        """Map a change type to its backward compatibility level."""
        mapping = {
            SharedModelChangeType.ADDITIVE: BackwardCompatibilityLevel.FULLY_COMPATIBLE,
            SharedModelChangeType.MODIFICATION: BackwardCompatibilityLevel.DEPRECATED_REMOVABLE,
            SharedModelChangeType.DEPRECATION: BackwardCompatibilityLevel.DEPRECATED_REMOVABLE,
            SharedModelChangeType.REMOVAL: BackwardCompatibilityLevel.BREAKING_CHANGE,
            SharedModelChangeType.SEMANTIC_SHIFT: BackwardCompatibilityLevel.BREAKING_CHANGE,
        }
        return mapping[change_type]

    def get_dependents_for_model(self, model_name: str) -> list[str]:
        """Return all bounded contexts that depend on a shared model."""
        if model_name not in self._models:
            return []
        return list(self._models[model_name].dependents)

    def get_change_log_since(self, model_name: str, since_version: str | None = None) -> list[SharedKernelChangeRecord]:
        """Return the change history for a specific model."""
        return [
            record for record in self._change_log
            if record.model_name == model_name
        ]


@dataclass(frozen=True)
class SharedKernelChangeReview:
    """Record of a proposed shared kernel model change.

    This is the coordination artifact that flows between contexts when
    a shared model needs to be modified.
    """
    model_name: str
    change_type: SharedModelChangeType
    field_name: str | None
    proposed_by: str
    owner_context: str
    affected_dependents: list[str]
    compatibility_level: BackwardCompatibilityLevel
    approved_by: list[str] = field(default_factory=list)
    rejected_by: list[str] = field(default_factory=list)

    @property
    def is_approved(self) -> bool:
        return all(dep in self.approved_by for dep in self.affected_dependents if dep != self.owner_context)


# ❌ BAD: Shared kernel without coordination — teams silently change shared models
class BadSharedKernel:
    """No registry, no notifications, no compatibility checks."""

    def __init__(self) -> None:
        self.product_data = {"id": 1, "name": "Widget", "price_cents": 999}

    def update_price(self, new_price: int) -> None:
        """Silently changes the price field — consumers have no way to know."""
        self.product_data["price_cents"] = new_price  # Breaking change, nobody notified


# ✅ GOOD: Shared kernel with registry, notifications, and compatibility guards
def demonstrate_shared_kernel_coordination() -> SharedKernelRegistry:
    """Show a shared kernel in action with proper change coordination."""
    registry = SharedKernelRegistry()

    # Register the Product model shared between Catalog and Orders contexts
    registry.register_model(
        model_name="Product",
        owner_context="Catalog",
        dependents=["Orders", "Pricing"],
        initial_fields=[
            SharedField("product_id", "str", required=True),
            SharedField("name", "str", required=True),
            SharedField("sku", "str", required=True),
            SharedField("base_price_cents", "int", required=True, compatibility=BackwardCompatibilityLevel.FULLY_COMPATIBLE),
            SharedField("currency", "str", required=False, default_value="USD"),  # Added as optional field
        ],
    )

    # Propose an additive change — new optional field (fully compatible)
    additive_review = registry.propose_change(
        model_name="Product",
        change_type=SharedModelChangeType.ADDITIVE,
        field_name="display_category",
        proposed_by="Catalog",
    )
    assert additive_review.compatibility_level == BackwardCompatibilityLevel.FULLY_COMPATIBLE

    # Propose a removal — breaking change that requires approval
    removal_review = registry.propose_change(
        model_name="Product",
        change_type=SharedModelChangeType.DEPRECATION,
        field_name="legacy_sku",
        proposed_by="Catalog",
    )
    assert removal_review.compatibility_level == BackwardCompatibilityLevel.DEPRECATED_REMOVABLE

    return registry
```

**Key principles:**
- Shared kernel models MUST be registered in a central registry before any context consumes them — unregistered "shared" models are just copy-paste code waiting to drift apart
- Additive-only changes (new optional fields) can proceed without consensus; all other changes require dependent-context approval
- The deprecation timeline (default 90 days) gives dependent contexts time to migrate their code before a field is removed
- Track the change log persistently — when a bug traces back to a shared model change, you need the history to find the root cause

---

### Pattern 3: Published Language — Versioned Contract Definitions

Published language defines how bounded contexts communicate via an openly documented contract. The contract is versioned using semver, includes backward-compatibility rules, and is validated in CI before any integration code depends on it. This pattern works for REST API schemas, gRPC `.proto` files, event message schemas, and protocol definitions.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any


class ContractVersioningStrategy(Enum):
    """How the published language version is managed."""
    SEMVER = auto()         # Semantic versioning: MAJOR.MINOR.PATCH
    API_VERSION_HEADER = auto()  # Version in request headers (e.g., X-API-Version)
    PATH_BASED = auto()     # Version in URL path (e.g., /api/v2/orders)
    EVENT_SCHEMA_ID = auto()    # Schema ID embedded in event metadata


@dataclass(frozen=True)
class ContractField:
    """Definition of a field within a published language contract.

    Each field specifies its name, type, whether it is required or optional,
    the allowed value set (for enums), and backward-compatibility rules.
    """
    name: str
    json_schema_type: str                    # "string", "integer", "object", "array", etc.
    required: bool = True
    description: str = ""
    enum_values: list[str] | None = None     # For enum types
    default_value: Any | None = None         # Default for optional fields
    deprecated_since_version: str | None = None
    removed_in_version: str | None = None

    def validate_payload_value(self, value: Any) -> bool:
        """Validate a single payload value against this field's schema.

        Args:
            value: The value to validate

        Returns:
            True if the value conforms to this field's definition
        """
        if self.required and value is None:
            return False

        if self.enum_values is not None and isinstance(value, str):
            return value in self.enum_values

        # Basic type checks — a real implementation would use jsonschema library
        type_checks = {
            "string": lambda v: isinstance(v, str),
            "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
            "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
            "boolean": lambda v: isinstance(v, bool),
            "object": lambda v: isinstance(v, dict),
            "array": lambda v: isinstance(v, list),
        }
        checker = type_checks.get(self.json_schema_type)
        if checker and value is not None:
            return checker(value)

        return True


@dataclass
class PublishedLanguageContract:
    """A versioned contract that multiple bounded contexts agree to consume.

    This is the canonical artifact for Published Language, Open Host Service,
    and Pipeline relationships. It defines the exact structure of messages,
    events, or API payloads exchanged between contexts.
    """
    name: str                              # e.g., "OrderPlacedEvent", "ProductCreated"
    version: str = "1.0.0"                 # Semantic version following semver rules
    owner_context: str                     # Bounded context that owns this contract
    description: str = ""                  # Human-readable description of the contract's purpose
    fields: list[ContractField] = field(default_factory=list)
    versioning_strategy: ContractVersioningStrategy = ContractVersioningStrategy.SEMVER
    backward_compatibility_rules: list[str] = field(default_factory=lambda: [
        "New optional fields may be added without breaking existing consumers",
        "Existing required fields cannot be made optional without a major version bump",
        "Field names cannot be renamed — use deprecation and addition instead",
        "Enum values can only be added, never removed (soft-deprecate by marking unused)",
        "Nested object structures cannot change shape without a major version bump",
    ])
    _change_log: list[ContractVersionChange] = field(default_factory=list, repr=False)

    def add_field(self, field: ContractField) -> None:
        """Add a field to the contract. Only additive changes allowed without version bump."""
        if any(f.name == field.name for f in self.fields):
            raise ValueError(f"Field '{field.name}' already exists in contract '{self.name}'")
        self.fields.append(field)

    def get_required_fields(self) -> list[ContractField]:
        """Return only the required fields — these must be present in every valid payload."""
        return [f for f in self.fields if f.required]

    def get_deprecated_fields(self) -> list[ContractField]:
        """Return fields marked as deprecated but not yet removed."""
        return [f for f in self.fields if f.deprecated_since_version is not None]

    def validate_payload(self, payload: dict[str, Any]) -> list[str]:
        """Validate a payload against all contract field definitions.

        Args:
            payload: The data to validate (e.g., a JSON body or event attributes)

        Returns:
            List of validation error messages. Empty list means the payload is valid.
        """
        errors: list[str] = []

        # Check required fields are present
        for field in self.get_required_fields():
            if field.name not in payload or payload[field.name] is None:
                errors.append(f"Missing required field: {field.name}")

        # Validate each present field's value
        for key, value in payload.items():
            contract_field = next((f for f in self.fields if f.name == key), None)
            if contract_field and not contract_field.validate_payload_value(value):
                errors.append(
                    f"Field '{key}' has invalid value {value!r} "
                    f"(expected type: {contract_field.json_schema_type})"
                )

        # Warn about deprecated fields
        for field in self.fields:
            if field.deprecated_since_version and key == field.name and key in payload:
                errors.append(
                    f"Field '{field.name}' is deprecated since v{field.deprecated_since_version}"
                )

        return errors

    def bump_version(self, major: bool = False) -> str:
        """Bump the contract version. Returns the new version string.

        Args:
            major: If True, perform a MAJOR version bump (breaking changes).
                   If False, perform a MINOR version bump (additive changes).
        """
        parts = self.version.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid semver format: {self.version}")

        if major:
            major_v, minor_v, patch_v = int(parts[0]) + 1, 0, 0
        else:
            major_v, minor_v, patch_v = int(parts[0]), int(parts[1]) + 1, 0

        new_version = f"{major_v}.{minor_v}.{patch_v}"
        self._change_log.append(ContractVersionChange(
            old_version=self.version,
            new_version=new_version,
            changed_at=datetime.now(),
        ))
        self.version = new_version
        return new_version


@dataclass(frozen=True)
class ContractVersionChange:
    """Record of a contract version change."""
    old_version: str
    new_version: str
    changed_at: datetime


# ── Example: OrderPlacedEvent Contract ───────────────────────────────────────

def create_order_event_contract() -> PublishedLanguageContract:
    """Create the published language contract for order placement events.

    This event is produced by the Orders context and consumed by Inventory,
    Shipping, and Notifications contexts via a message broker (e.g., RabbitMQ, Kafka).
    """
    contract = PublishedLanguageContract(
        name="OrderPlacedEvent",
        owner_context="Orders",
        description="Published when an order transitions from DRAFT to CONFIRMED state. "
                    "Consumed by Inventory (reserves stock), Shipping (prepares dispatch), "
                    "and Notifications (sends confirmation email).",
        version="1.0.0",
    )

    contract.add_field(ContractField("order_id", "string", required=True, description="UUID of the confirmed order"))
    contract.add_field(ContractField("customer_email", "string", required=True, description="Customer email for confirmation"))
    contract.add_field(ContractField("items", "array", required=True, description="List of ordered items"))
    contract.add_field(ContractField("total_amount_cents", "integer", required=True, description="Order total in smallest currency unit"))
    contract.add_field(ContractField("currency", "string", required=True, enum_values=["USD", "EUR", "GBP"], description="ISO 4217 currency code"))
    contract.add_field(ContractField("shipping_address_id", "string", required=False, default_value=None, description="Optional: only present if shipping to non-default address"))
    contract.add_field(ContractField("promo_code_applied", "string", required=False, default_value=None))
    contract.add_field(ContractField("order_placed_at", "string", required=True, description="ISO 8601 timestamp of order confirmation"))

    return contract


# ❌ BAD: No published language — each consumer invents their own event structure
class BadEventConsumer:
    """Consumes events without a shared contract — fragile and brittle."""

    def handle_order_event(self, raw_event: dict) -> None:
        """Magic strings everywhere — no validation, no versioning.

        If the producer adds or removes a field, this breaks silently.
        There is no way to know which version of the event you received.
        """
        # Magic field name — what if the producer renames it?
        order_id = raw_event.get("orderId")  # camelCase — but maybe it's "order_id"?
        total = raw_event["total"]  # KeyError if missing — no graceful fallback
        items = raw_event.get("lineItems", [])  # Maybe it's "items" now?

        # No version awareness — how do we know if this event is from v1 or v2?


# ✅ GOOD: Published language with validation, versioning, and contract adherence
def handle_order_event_with_contract(
    raw_event: dict,
    contract: PublishedLanguageContract,
) -> dict | None:
    """Handle an event validated against the published language contract.

    Returns structured data or None if the event is invalid.
    The contract acts as a gate — no event enters downstream processing without validation.
    """
    # Check version compatibility
    event_version = raw_event.get("event_version", "0.0.0")
    if event_version != contract.version:
        # In production: route to a version-specific handler or reject with retry
        pass

    # Validate the entire payload against the contract
    errors = contract.validate_payload({k: v for k, v in raw_event.items() if k != "event_version"})

    if errors:
        return None  # Invalid event — reject and log

    # Safe to process — all required fields are present and valid
    items = raw_event.get("items", [])
    total_cents = int(raw_event["total_amount_cents"])
    currency = raw_event["currency"]

    return {
        "order_id": raw_event["order_id"],
        "customer_email": raw_event["customer_email"],
        "item_count": len(items),
        "total": total_cents / 100,
        "currency": currency,
    }
```

**Key principles:**
- Every published language contract MUST have a version field and a changelog — without versioning, consumers cannot migrate when breaking changes occur
- CI pipelines must validate incoming events/payloads against the contract schema before they reach downstream handlers. Invalid payloads are rejected at the boundary, not in business logic
- Deprecate fields before removing them: add `deprecated_since_version`, notify all consumers during the deprecation period (typically 90 days), then remove in the next major version
- Enum values can only be added (not removed) — soft-deprecate by marking the value as unused rather than deleting it, to avoid breaking consumers that still send it

---

### Pattern 4: Customer/Supplier and Conformist Relationship Management

In a Customer/Supplier relationship, one bounded context (the Supplier) provides a model or service that another (the Customer) depends on. The Customer must decide whether to build an anticorruption layer (translate the Supplier's model), become a Conformist (adopt the Supplier's model as-is), or negotiate a shared contract. This pattern also covers how to enforce backward-compatibility guarantees in the Supplier's published contracts.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Protocol


class RelationshipStrategy(Enum):
    """The strategic choice a Customer makes when dependent on a Supplier context."""
    ANTICORRUPTION_LAYER = auto()   # Build translation layer — keep your model intact
    CONFORMIST = auto()              # Adopt Supplier's model directly — minimal overhead
    PUBLISHED_LANGUAGE = auto()      # Negotiate a shared contract between both contexts
    OPEN_HOST_SERVICE = auto()       # Ask the Supplier to expose an API specifically for you
    PIPELINE = auto()                # Accept one-way data flow, transform independently


class ContractStabilityPolicy:
    """Defines backward-compatibility rules that the Supplier must follow.

    This policy is agreed between Customer and Supplier teams. Violations
    are treated as production incidents — not "just API changes."
    """

    BREAKING_CHANGES = frozenset([
        "remove_required_field",      # Deleting a required field
        "rename_field",               # Renaming any field (even optional ones)
        "change_field_type",          # Changing string to integer, etc.
        "narrow_enum_values",         # Removing allowed enum values
        "add_required_field",         # Making an optional field required
        "change_nested_schema",       # Adding/removing fields in nested objects
    ])

    NON_BREAKING_CHANGES = frozenset([
        "add_optional_field",         # Adding a new optional field
        "add_enum_value",             # Extending an enum with new values
        "widen_numeric_type",         # int32 → int64 (always safe)
        "add_description",            # Updating field descriptions only
    ])

    @classmethod
    def classify_change(cls, change_description: str) -> tuple[bool, str]:
        """Classify whether a proposed change is breaking or non-breaking.

        Args:
            change_description: Human-readable description of the proposed change

        Returns:
            Tuple of (is_breaking, message) — if breaking, the message explains why
        """
        for change_type in cls.BREAKING_CHANGES:
            if change_type.replace("_", " ") in change_description.lower():
                return True, f"Breaking change detected: {change_type}"

        for change_type in cls.NON_BREAKING_CHANGES:
            if change_type.replace("_", " ") in change_description.lower():
                return False, f"Non-breaking change: {change_type} — safe to deploy"

        return False, "Change type not classified — manual review required before deployment"


@dataclass
class ContextRelationshipRecord:
    """Records a Customer/Supplier relationship and its strategic decisions."""
    customer_context: str
    supplier_context: str
    strategy: RelationshipStrategy
    shared_contract_name: str | None = None
    acl_module_path: str | None = None
    created_at: datetime = field(default_factory=datetime.now)
    last_reviewed: datetime | None = None
    notes: str = ""

    def review_and_update_strategy(
        self,
        new_strategy: RelationshipStrategy,
        reviewer: str,
        reason: str,
    ) -> None:
        """Update the strategy after a periodic relationship review.

        Relationships should be reviewed quarterly — as systems mature,
        the initial choice (e.g., ACL) may no longer be optimal.
        """
        self.last_reviewed = datetime.now()
        if new_strategy != self.strategy:
            self.notes += f"\n[{datetime.now().isoformat()}] Strategy changed from " \
                f"{self.strategy.name} to {new_strategy.name} (reason: {reason}) by {reviewer}"
        self.strategy = new_strategy


# ── Relationship Decision Engine ─────────────────────────────────────────────

class ContextRelationshipManager:
    """Manages the lifecycle of Customer/Supplier relationships.

    This is the coordination layer that ensures relationships are intentional,
    documented, and periodically reviewed — not accidental dependencies that
    grow organically without governance.
    """

    def __init__(self) -> None:
        self._relationships: list[ContextRelationshipRecord] = []

    def establish_relationship(
        self,
        customer_context: str,
        supplier_context: str,
        strategy: RelationshipStrategy,
        shared_contract_name: str | None = None,
        acl_module_path: str | None = None,
    ) -> ContextRelationshipRecord:
        """Create a new Customer/Supplier relationship record.

        Args:
            customer_context: The dependent (customer) bounded context
            supplier_context: The providing (supplier) bounded context
            strategy: The chosen integration pattern
            shared_contract_name: Name of the shared published language contract (if applicable)
            acl_module_path: Python module path for the anticorruption layer (if using ACL)

        Returns:
            The created relationship record
        """
        # Check for duplicate relationships
        existing = [
            r for r in self._relationships
            if r.customer_context == customer_context and r.supplier_context == supplier_context
        ]
        if existing:
            raise ValueError(
                f"Relationship already exists between '{customer_context}' "
                f"and '{supplier_context}'. Update instead of creating duplicate."
            )

        record = ContextRelationshipRecord(
            customer_context=customer_context,
            supplier_context=supplier_context,
            strategy=strategy,
            shared_contract_name=shared_contract_name,
            acl_module_path=acl_module_path,
        )
        self._relationships.append(record)
        return record

    def get_relationships_for_context(self, context_name: str) -> list[ContextRelationshipRecord]:
        """Find all relationships where this context is either Customer or Supplier."""
        return [
            r for r in self._relationships
            if r.customer_context == context_name or r.supplier_context == context_name
        ]

    def get_acl_relationships(self) -> list[ContextRelationshipRecord]:
        """Return all relationships using the Anticorruption Layer strategy."""
        return [r for r in self._relationships if r.strategy == RelationshipStrategy.ANTICORRUPTION_LAYER]

    def get_conformist_relationships(self) -> list[ContextRelationshipRecord]:
        """Return all relationships where the Customer conforms to Supplier's model."""
        return [r for r in self._relationships if r.strategy == RelationshipStrategy.CONFORMIST]

    def recommend_strategy(
        self,
        supplier_model_stability: str,   # "stable", "evolving", "volatile"
        your_team_control_over_supplier: bool,
        semantic_overlap: float,         # 0.0 to 1.0 — how similar are the models?
    ) -> RelationshipStrategy:
        """Recommend an integration strategy based on relationship characteristics.

        This is a decision support tool — the final choice requires human judgment.

        Args:
            supplier_model_stability: How stable is the supplier's model?
            your_team_control_over_supplier: Can you influence the supplier's decisions?
            semantic_overlap: How similar are your models to the supplier's? (0 = different, 1 = same)

        Returns:
            The recommended integration strategy
        """
        if semantic_overlap >= 0.8 and your_team_control_over_supplier:
            return RelationshipStrategy.PUBLISHED_LANGUAGE

        if semantic_overlap >= 0.6 and not your_team_control_over_supplier:
            return RelationshipStrategy.CONFORMIST

        if supplier_model_stability == "stable":
            if semantic_overlap < 0.4:
                return RelationshipStrategy.ANTICORRUPTION_LAYER
            else:
                return RelationshipStrategy.PUBLISHED_LANGUAGE

        # Volatile supplier — don't build heavy translation layer
        if your_team_control_over_supplier:
            return RelationshipStrategy.OPEN_HOST_SERVICE
        return RelationshipStrategy.PIPELINE


# ❌ BAD: Accidental coupling — no relationship recorded, no contract agreed
class BadCustomerSupplier:
    """No strategy defined — the Customer silently depends on Supplier's internal types."""

    def __init__(self) -> None:
        # Directly imports from supplier's package — tight coupling
        from support.bounded_context import SupportTicket  # Tight coupling!
        self._ticket = SupportTicket()

    def create_order_from_ticket(self) -> None:
        """Builds an order using the supplier's exact model — if they change it, we break."""
        # No translation, no contract, no versioning. Just direct usage.


# ✅ GOOD: Intentional relationship with documented strategy and stability policy
def demonstrate_relationship_management() -> tuple[ContextRelationshipManager, ContractStabilityPolicy]:
    """Show proper Customer/Supplier relationship management in action."""
    manager = ContextRelationshipManager()
    policy = ContractStabilityPolicy()

    # Establish an intentional ACL relationship between Orders (customer) and Shipping (supplier)
    record = manager.establish_relationship(
        customer_context="Orders",
        supplier_context="Shipping",
        strategy=RelationshipStrategy.ANTICORRUPTION_LAYER,
        acl_module_path="orders.infrastructure.shipping_acl",
        shared_contract_name=None,  # ACL means each side keeps its own model
    )

    # Verify the policy catches a breaking change
    is_breaking, msg = policy.classify_change("removing required field from event schema")
    assert is_breaking is True
    assert "Breaking change detected" in msg

    # Check recommendations
    recommend_engine = ContextRelationshipManager()
    stable_different = recommend_engine.recommend_strategy(
        supplier_model_stability="stable",
        your_team_control_over_supplier=False,
        semantic_overlap=0.3,
    )
    assert stable_different == RelationshipStrategy.ANTICORRUPTION_LAYER

    return manager, policy
```

**Key principles:**
- Every Customer/Supplier relationship must be formally recorded with a chosen strategy — undocumented relationships become technical debt that no one remembers the rationale for
- The Contract Stability Policy defines what counts as a breaking change. Both teams agree to this list and enforce it in CI. Breaking changes require a major version bump and a migration period
- Review relationships quarterly — strategies that made sense at project start may be suboptimal as the system matures. A Conformist relationship might become viable once models converge

---

### Pattern 5: Pipeline and Open Host Service Patterns

Pipeline is a one-way information flow where Context A pushes data to Context B, and Context B transforms it independently using its own domain model. Open Host Service is when Context A exposes its domain model as a formal service API specifically so other contexts can consume it without building ACLs. Both patterns reduce integration complexity but serve different strategic needs.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import TypeVar, Generic


T = TypeVar("T")


# ── Pipeline Pattern: One-Way Information Flow ───────────────────────────────

@dataclass(frozen=True)
class PipelineEventEnvelope:
    """Wraps a domain event for transit through a pipeline.

    The envelope carries metadata about the event's origin, version, and
    processing state. The receiving context extracts the payload and transforms
    it using its own model — no shared types cross the boundary.
    """
    source_context: str
    event_type: str
    event_version: str
    payload: dict  # Raw serialized payload — structure is opaque to the pipeline
    emitted_at: datetime = field(default_factory=datetime.now)
    event_id: str = ""

    def __post_init__(self) -> None:
        if not self.event_id:
            import uuid
            object.__setattr__(self, 'event_id', str(uuid.uuid4()))


class PipelineStage(ABC):
    """Abstract pipeline stage that processes events through a transformation chain.

    Each stage performs one step of the transformation. Stages are composed
    into a chain, and each stage receives the output of the previous stage.
    This pattern enables independent evolution — add or remove stages without
    changing the producer or other consumers.
    """

    @abstractmethod
    def process(self, event: PipelineEventEnvelope) -> PipelineEventEnvelope | None:
        """Process a pipeline event and return the transformed result.

        Args:
            event: The incoming event envelope with payload data

        Returns:
            Transformed event envelope, or None to skip/drop this event

        Raises:
            PipelineValidationError: If the event is malformed at this stage
        """


class PipelineStageError(Exception):
    """Raised when a pipeline stage cannot process an event."""

    def __init__(self, stage_name: str, event_id: str, reason: str) -> None:
        self.stage_name = stage_name
        self.event_id = event_id
        self.reason = reason
        super().__init__(f"PipelineStageError [{stage_name}] event {event_id}: {reason}")


@dataclass
class PipelineExecutionResult:
    """Records the result of executing a pipeline stage on an event."""
    stage_name: str
    event_id: str
    success: bool
    output_count: int = 0
    error_message: str | None = None
    executed_at: datetime = field(default_factory=datetime.now)


class EventPipeline:
    """Executes a chain of pipeline stages on incoming events.

    Events flow through the pipeline stage by stage. Each stage may:
    - Transform the event and pass it to the next stage
    - Drop the event (return None from process())
    - Split one event into multiple events (return a list instead)

    The pipeline is synchronous — all stages must complete before the event
    is considered processed. For async processing, use an async variant.
    """

    def __init__(self, stages: list[PipelineStage]) -> None:
        self._stages = stages
        self._execution_log: list[PipelineExecutionResult] = []

    def execute(self, event: PipelineEventEnvelope) -> list[PipelineEventEnvelope]:
        """Execute the full pipeline for a single event.

        Events flow through each stage in order. If any stage fails or drops
        the event, processing stops and the result is recorded.

        Args:
            event: The incoming event to process through all stages

        Returns:
            List of output events after passing through all stages (may be empty)
        """
        current_events: list[PipelineEventEnvelope] = [event]
        results: list[PipelineEventEnvelope] = []

        for stage in self._stages:
            next_events: list[PipelineEventEnvelope] = []

            for current_event in current_events:
                try:
                    output = stage.process(current_event)
                    result_record = PipelineExecutionResult(
                        stage_name=type(stage).__name__,
                        event_id=current_event.event_id,
                        success=True,
                        output_count=1 if output else 0,
                    )

                    if output is not None:
                        # Stage may return single event or list of events
                        if isinstance(output, list):
                            next_events.extend(output)
                            result_record.output_count = len(output)
                        elif isinstance(output, PipelineEventEnvelope):
                            next_events.append(output)
                except Exception as exc:
                    self._execution_log.append(PipelineExecutionResult(
                        stage_name=type(stage).__name__,
                        event_id=current_event.event_id,
                        success=False,
                        error_message=str(exc),
                    ))
                    # On failure: stop processing this event, do not proceed to next stage
                    break

            current_events = next_events
            if not current_events:
                break  # All events were dropped — no need to continue

        results.extend(current_events)
        return results

    def get_execution_log(self) -> list[PipelineExecutionResult]:
        """Return the execution log for auditing and debugging."""
        return list(self._execution_log)


# ── Open Host Service Pattern: Exposing Your Model as a Service API ───────────

class ServiceRequest(ABC):
    """Base class for all service requests in an Open Host Service."""
    pass


class ServiceResponse(ABC):
    """Base class for all service responses in an Open Host Service."""
    pass


@dataclass(frozen=True)
class ProductCatalogRequest(ServiceRequest):
    """Request to query product catalog details by filter criteria."""
    category_ids: list[str] = field(default_factory=list)
    price_min: float | None = None
    price_max: float | None = None
    include_discontinued: bool = False
    page: int = 1
    page_size: int = 25


@dataclass(frozen=True)
class ProductCatalogResponse(ServiceResponse):
    """Response from the product catalog service."""
    products: list[dict]
    total_count: int
    page: int
    page_size: int
    has_next_page: bool


class OpenHostService(ABC):
    """Abstract base for Open Host Service implementations.

    An Open Host Service is a bounded context that exposes its domain model
    as a formal service API specifically so other contexts can consume it.
    The API contract is the published language — consumers use the API, not
    your internal models directly.
    """

    @abstractmethod
    def handle(self, request: ServiceRequest) -> ServiceResponse:
        """Handle an incoming service request and return a response."""


@dataclass(frozen=True)
class CatalogServiceEndpoint:
    """Concrete Open Host Service endpoint for product catalog access.

    This is what the Orders context calls to get product information —
    it never imports from the Catalog bounded context's internal models.
    """

    name: str = "CatalogService"
    version: str = "1.0.0"
    base_path: str = "/api/v1/catalog"

    def validate_request(self, request: ProductCatalogRequest) -> list[str]:
        """Validate a catalog service request before processing.

        Returns validation errors if the request violates contract rules.
        """
        errors: list[str] = []

        if request.page < 1:
            errors.append("Page number must be >= 1")

        if not (1 <= request.page_size <= 100):
            errors.append("Page size must be between 1 and 100")

        if request.price_min is not None and request.price_max is not None:
            if request.price_min > request.price_max:
                errors.append("price_min cannot exceed price_max")

        return errors


# ── Pipeline Example: Inventory Data Processing ──────────────────────────────

class NormalizeInventoryStage(PipelineStage):
    """First stage: normalize raw inventory event data into a canonical format."""

    def process(self, event: PipelineEventEnvelope) -> PipelineEventEnvelope | None:
        payload = event.payload
        # Normalize field names to our internal canonical form
        normalized_payload = {
            "product_id": payload.get("sku", payload.get("product_id")),
            "warehouse": payload.get("location", payload.get("warehouse")),
            "quantity_change": int(payload.get("change", payload.get("delta", 0))),
            "reason": payload.get("reason", "manual_adjustment"),
        }

        if not normalized_payload["product_id"]:
            return None  # Drop event — cannot process without a product ID

        return PipelineEventEnvelope(
            source_context=event.source_context,
            event_type="InventoryAdjusted",
            event_version="1.0.0",
            payload=normalized_payload,
            emitted_at=event.emitted_at,
            event_id=event.event_id,
        )


class DeduplicateInventoryStage(PipelineStage):
    """Second stage: deduplicate events from the same source within a time window."""

    _processed_events: dict[str, datetime] = {}

    def process(self, event: PipelineEventEnvelope) -> PipelineEventEnvelope | None:
        payload = event.payload
        key = f"{payload.get('product_id')}:{payload.get('warehouse')}"

        last_seen = self._processed_events.get(key)
        if last_seen and (event.emitted_at - last_seen).total_seconds() < 60:
            # Same product-warehouse pair received within 60 seconds — deduplicate
            return None

        self._processed_events[key] = event.emitted_at
        return event


class AggregateStockLevelStage(PipelineStage):
    """Third stage: aggregate individual adjustments into a current stock level."""

    def process(self, event: PipelineEventEnvelope) -> list[PipelineEventEnvelope]:
        payload = event.payload
        quantity_change = int(payload.get("quantity_change", 0))

        # In production: query the stock database for current level, add change
        # Here we simulate with a simple computation
        current_stock = max(0, quantity_change)

        return [PipelineEventEnvelope(
            source_context="InventoryProcessor",
            event_type="StockLevelUpdated",
            event_version="1.0.0",
            payload={
                "product_id": payload.get("product_id"),
                "warehouse": payload.get("warehouse"),
                "current_stock": current_stock,
                "change_applied": quantity_change,
            },
        )]


# ❌ BAD: Pipeline with no stages — raw data flows directly to consumers
class BadPipeline:
    """No transformation chain — consumer receives unvalidated raw event data."""

    def forward_event(self, raw_data: dict) -> None:
        """Just pass through without any processing or validation.

        If the upstream changes field names, this breaks silently downstream.
        No deduplication means duplicate events cause double-counting.
        """
        # Magic strings — what if the upstream changes field structure?
        self._handle(raw_data["sku"], raw_data["quantity"])  # KeyError on change

    def _handle(self, sku: str, quantity: int) -> None:
        pass


# ✅ GOOD: Pipeline with named stages, validation, deduplication, and aggregation
def demonstrate_pipeline() -> EventPipeline:
    """Build a three-stage pipeline for inventory event processing."""
    pipeline = EventPipeline(stages=[
        NormalizeInventoryStage(),     # Stage 1: normalize field names
        DeduplicateInventoryStage(),   # Stage 2: deduplicate recent events
        AggregateStockLevelStage(),    # Stage 3: compute final stock level
    ])

    # Simulate an incoming event from the Shipping context
    test_event = PipelineEventEnvelope(
        source_context="Shipping",
        event_type="StockAdjusted",
        event_version="0.9.0",  # Non-standard version — normalized in stage 1
        payload={
            "sku": "WIDGET-A-001",
            "location": "WAREHOUSE-EAST",
            "change": -5,
            "reason": "shipment_dispatched",
        },
    )

    results = pipeline.execute(test_event)
    assert len(results) == 1
    assert results[0].event_type == "StockLevelUpdated"

    return pipeline
```

**Key principles:**
- Pipeline stages are composable — each stage does one thing and either passes events through, drops them, or splits them into multiple. This makes the pipeline testable in isolation
- Open Host Service is a strategic investment: you build and maintain an API specifically for other contexts. It's worth it when 2+ contexts depend on your data but use different models
- Pipeline consumers must handle out-of-order events and duplicates — at-least-once delivery means idempotent processing is mandatory in every pipeline stage
- The Open Host Service contract is the published language: define request/response schemas, error codes, and rate limits as first-class artifacts, not afterthoughts

---

## Constraints

### MUST DO
- **Classify every inter-context relationship before implementation** — use the decision engine or a team consensus session to choose Customer/Supplier, Conformist, ACL, Shared Kernel, Published Language, Open Host Service, or Pipeline. Never leave a boundary unclassified
- **Implement the anticorruption layer as a thin module at the context boundary** — foreign types must be detected and translated immediately at the entry point. Domain logic inside the bounded context must never import a foreign module
- **Define versioned published language contracts for all Shared Kernel and Open Host Service relationships** — use semver, include backward-compatibility rules, and validate payloads in CI against the latest contract version
- **Enforce backward compatibility in Customer/Supplier relationships** — breaking changes (removed required fields, renamed fields, changed types) must trigger a major version bump and cannot be deployed without consumer migration plans
- **Register all shared kernel models in a central registry** — unregistered "shared" models are copy-paste code. The registry tracks owners, dependents, versions, and change history
- **Review relationships quarterly** — strategies chosen at project start may become suboptimal. Document the review date and any strategy changes with rationale

### MUST NOT DO
- **Let foreign types cross into domain logic without translation** — this is the defining violation of the anticorruption layer principle. Once a foreign type enters your domain package, it will spread through your codebase
- **Share models by copying code between repositories or packages** — shared kernel means coordinated model definitions, not duplicated source files. Use a shared library, contract definition file, or code generation from a common schema
- **Make breaking changes to published language contracts without consumer notification** — every PR that modifies a published language contract must include a migration guide for affected consumers and be reviewed by at least one consumer's team representative
- **Build an ACL for a relationship you could make Conformist on** — translation layers add 30–50% integration overhead. If the Supplier's model is stable and semantically close to yours, conforming is simpler and faster
- **Assume event delivery guarantees without specifying them** — every pipeline consumer must handle duplicates (at-least-once delivery) and out-of-order events (no strict ordering guarantee unless you implement sequence numbering). Document these guarantees in the published language contract

---

## Output Template

When applying this skill, produce:

1. **Context Relationship Classification Table** — A markdown table listing every context-to-context interaction with its assigned pattern, owner teams, shared models, and integration date
2. **Anticorruption Layer Implementation** — A dedicated module at each context boundary containing foreign type detection (`is_foreign_type()`), field-by-field translation methods (`translate()`), and explicit rejection of unmappable data
3. **Published Language Contract Artifacts** — Versioned schema definitions (JSON Schema, protobuf, or event schema files) with semver versions, backward-compatibility rules, and CI validation tests
4. **Shared Kernel Registry** — A registry module that tracks all shared models, their owners, dependents, versions, and change history, with API methods for proposing and approving changes
5. **Relationship Strategy Documentation** — For each Customer/Supplier pair: the chosen strategy (ACL, Conformist, etc.), rationale, stability policy, and next review date
6. **Pipeline Stage Definitions** — If using the Pipeline pattern, define each stage as a composable class with `process()` method, validation logic, and idempotent transformation rules

All code must use Python 3.10+ type hints, `from __future__ import annotations`, docstrings on every public method, explicit domain exceptions, and typed dataclasses for all contract definitions.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD tactical building blocks: value objects, entities, aggregates, bounded contexts — the foundational patterns that context mapping relates to each other |
| `domain-modeling` | Strategic analysis for extracting bounded contexts and their relationships as an analytical exercise — this skill implements those relationships in code |
| `ddd-tactical-patterns` | Tactical patterns (repositories, specifications, unit of work) applied within a single bounded context — use these after you've set up the cross-context boundaries |
| `event-storming` | Collaborative event storming workshop technique for identifying domain events and bounded contexts — event storms reveal the relationships this skill then formalizes in code |

---

## Further Reading

- *Domain-Driven Design* by Eric Evans (the Blue Book) — Chapter 9 "Distilling Bounded Contexts" defines the original context mapping patterns
- *Implementing Domain-Driven Design* by Vaughn Vernon (the Red Book) — Chapter 22 covers Anticorruption Layer in detail; Chapter 23 covers Shared Kernel coordination
- [Context Mapping Patterns Reference](https://github.com/ddd-community/context-mapping-patterns) — Practical examples of all context mapping patterns with code samples across multiple languages
- *Building Microservices* by Sam Newman (2nd Edition) — Chapters on integration patterns, contract management, and the evolution from ACL to Open Host Service

> 📖 skill(local cache): domain-driven-design, domain-modeling, ddd-tactical-patterns
