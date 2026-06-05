---




name: ddd-context-mapping
description: Implements strategic DDD context mapping patterns — anticorruption layers, shared kernels, customer-supplier relationships, conformist boundaries, and publication language for cross-bounded-context integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: context mapping, anticorruption layer, acl, shared kernel, customer supplier relationship, publication language, bounded context integration, how do i integrate bounded contexts
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, domain-modeling, domain-events, microservices-architecture




---





# Context Mapping Strategies (Strategic DDD)

Acts as a strategic DDD architect designing integration patterns between bounded contexts. When loaded, the model selects appropriate context mapping relationships (anticorruption layer, shared kernel, customer-supplier, conformist, publication language), implements translation adapters that convert between domain languages, and produces concrete Python code for cross-context communication that preserves each context's ubiquitous language integrity.

## TL;DR Checklist

- [ ] Map integration points by listing all bounded contexts that exchange data or events
- [ ] Write down the ubiquitous language for shared concepts in each context before designing adapters
- [ ] Choose the most autonomous pattern (ACL) unless business constraints force conformist or shared kernel
- [ ] Implement translation layers with explicit mapping functions — never leak foreign domain models across boundaries
- [ ] Define publication-language event schemas as neutral contracts independent of any single context's model
- [ ] Enforce shared kernel dependencies: only the agreed-upon value objects/entities are shared, never entire aggregates
- [ ] Add integration tests that verify round-trip translation preserves all business invariants
- [ ] Document the customer-supplier relationship ownership for each bounded context and its contracts

---

## When to Use

Use this skill when:

- Designing integration between two or more bounded contexts in a distributed domain model
- Identifying where ubiquitous languages conflict and need translation (e.g., "Customer" means different things in Sales vs. Billing)
- Introducing a new bounded context that must consume data from an existing one with a incompatible domain model
- Deciding whether to share code between services or keep contexts fully isolated
- Defining event schemas for cross-context domain events that multiple services publish and subscribe to
- Resolving customer-supplier dynamics where one team owns a context and another must consume its contracts

---

## When NOT to Use

Avoid this skill for:

- Designing the internal model of a single bounded context — use `domain-driven-design` for tactical patterns (aggregates, entities, value objects)
- Choosing microservice boundaries at a high level — that is an architecture-level concern beyond DDD pattern scope
- Simple CRUD operations with no domain complexity — the translation overhead outweighs any benefit
- Situations where two contexts are already perfectly aligned in their ubiquitous language and share identical semantics

---

## Core Workflow

1. **Identify Integration Points** — List all pairs of bounded contexts that exchange data, events, or API calls. For each pair, note the direction of information flow and the business concepts involved. **Checkpoint:** Every integration point must name at least two bounded contexts and the shared concept (e.g., "OrderService publishes OrderPlaced to InventoryService").

2. **Compare Ubiquitous Languages** — For each shared concept, document how each context names it, what properties it has, and what invariants it enforces. Find the semantic gaps: same name different meaning, or different name same meaning. **Checkpoint:** If two contexts use different terms for the same business entity (e.g., "Client" vs. "Account"), flag this as a translation requirement.

3. **Select Context Mapping Pattern** — Choose one of five patterns based on autonomy and alignment:
   - Anticorruption Layer: high autonomy needed, low language alignment → full translation adapter
   - Shared Kernel: partial overlap agreed upon by both teams → minimal shared module
   - Customer-Supplier: asymmetric relationship where one team must conform → conformist adapter
   - Conformist Pattern: downstream context adopts upstream's model entirely → direct adoption
   - Publication Language: events/messages need a neutral schema → shared vocabulary module
   **Checkpoint:** The selected pattern must be justified by the autonomy vs. alignment analysis from Step 2.

4. **Implement the Translation or Shared Module** — Write the actual Python code for the selected pattern. For ACLs, build bidirectional mapping classes. For shared kernels, define minimal value objects with validation. For publication language, define event schemas used independently by both contexts. **Checkpoint:** No foreign domain entity should ever be serialized or passed across a context boundary without explicit translation.

5. **Define Contracts and Versioning** — Document the API contracts, event schemas, and shared module interfaces. Add versioning strategy for backward-compatible changes to shared contracts. **Checkpoint:** Every cross-context contract must have a version number and migration notes for breaking changes.

6. **Write Integration Tests** — Create tests that verify translation accuracy: serialize with foreign model → translate → deserialize in internal model → assert all invariants hold. Test edge cases: missing fields, boundary values, domain rule violations during translation. **Checkpoint:** Each integration test must cover at least one scenario from each pattern implemented.

---

## Implementation Patterns

### Pattern 1: Anticorruption Layer (ACL)

The ACL is a full translation adapter placed between a consuming context and a supplier service. It intercepts all calls, translates foreign domain concepts into the consumer's internal model, and shields the consumer's ubiquitous language from corruption. This pattern provides the highest autonomy — the consuming context never sees the supplier's domain model.

Use when: The supplier service has a significantly different domain model, the supplier is out of your organizational control, or adopting the supplier's terminology would pollute your own ubiquitous language.

```python
"""Anticorruption Layer for payment gateway integration.

Translates between an external PaymentGateway domain model and the
internal OrderBilling bounded context's Payment domain model.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ── External (Supplier) Domain Model — NEVER expose this internally ──


class ExternalPaymentStatus(Enum):
    """External gateway status values — meaningless in our domain."""
    PENDING = "pending"
    CAPTURED = "captured"
    PARTIALLY_REFUNDED = "partially_refunded"
    FAILED = "failed"
    ERROR_GATEWAY_TIMEOUT = "gateway_timeout"


@dataclass
class ExternalChargeRequest:
    """Foreign domain concept — this is what the payment gateway expects."""
    customer_id: str              # Gateway uses opaque UUIDs
    amount_cents: int             # Always integers, never floats
    currency_code: str            # ISO 4217 codes
    capture_now: bool
    metadata: dict                # Unstructured baggage


@dataclass
class ExternalChargeResponse:
    """Foreign domain concept — this is what the payment gateway returns."""
    transaction_id: str           # Opaque gateway transaction ID
    status: ExternalPaymentStatus
    amount_captured: int
    error_code: Optional[str]     # Gateway-specific error codes


# ── Internal Domain Model (Our Bounded Context) ──


class PaymentOutcome(Enum):
    """Internal domain language — meaningful to our business."""
    SUCCEEDED = "succeeded"
    REQUIRES_ACTION = "requires_action"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


@dataclass
class PaymentIntent:
    """Internal domain entity — represents a payment in our ubiquitous language."""
    intent_id: str
    order_id: str
    amount_eur_cents: int         # Internal context uses EUR, always cents
    customer_reference: str       # Our internal customer key, not gateway UUID
    outcome: PaymentOutcome = field(default=PaymentOutcome.PENDING)
    created_at: datetime = field(default_factory=datetime.utcnow)
    gateway_transaction_id: Optional[str] = None


# ── ACL Translation Layer ──


class PaymentGatewayACL:
    """Anticorruption Layer that translates between the external payment
    gateway domain model and our internal OrderBilling context.

    This class is the ONLY bridge — no other code in this bounded context
    should ever reference ExternalChargeRequest or ExternalChargeResponse.
    """

    # Mapping from gateway error codes to our domain understanding
    _GATEWAY_ERROR_DOMAIN_MAP: dict[str, str] = {
        "gateway_timeout": "gateway_unavailable",
        "insufficient_funds": "customer_declined",
        "card_expired": "payment_method_expired",
        "fraud_suspected": "suspicious_activity",
    }

    def __init__(self, gateway_client: Any) -> None:
        """Initialize ACL with the raw payment gateway HTTP client.

        Args:
            gateway_client: An instance of the external payment gateway SDK.
                           The type is Any because it should not be imported —
                           only the ACL knows about its interface.
        """
        self._gateway = gateway_client

    def translate_charge_request(
        self,
        internal_payment: PaymentIntent,
    ) -> ExternalChargeRequest:
        """Convert an internal PaymentIntent into a gateway charge request.

        Handles currency conversion (EUR → gateway's default), maps our
        customer reference to the gateway's opaque ID, and strips out
        domain-specific metadata that the gateway does not understand.

        Args:
            internal_payment: The internal payment intent to translate.

        Returns:
            A properly formatted external charge request.

        Raises:
            ValueError: If currency conversion is not available.
        """
        # In production, call a CurrencyService for live rates
        amount_usd_cents = self._convert_eur_to_usd(internal_payment.amount_eur_cents)

        return ExternalChargeRequest(
            customer_id=self._lookup_gateway_customer_id(internal_payment.customer_reference),
            amount_cents=amount_usd_cents,
            currency_code="USD",
            capture_now=True,
            metadata={"order_ref": internal_payment.order_id},
        )

    def translate_charge_response(
        self,
        external_response: ExternalChargeResponse,
        intent_id: str,
        order_id: str,
    ) -> PaymentIntent:
        """Convert a gateway charge response into an updated internal PaymentIntent.

        Maps foreign status codes and error codes into our domain language.
        Preserves the original intent_id for correlation.

        Args:
            external_response: The raw response from the payment gateway.
            intent_id: Our internal payment intent ID.
            order_id: The associated order reference.

        Returns:
            A PaymentIntent with the translated outcome and status.
        """
        outcome = self._map_gateway_status(external_response.status)

        payment = PaymentIntent(
            intent_id=intent_id,
            order_id=order_id,
            amount_eur_cents=self._convert_usd_to_eur(external_response.amount_captured),
            outcome=outcome,
            gateway_transaction_id=external_response.transaction_id,
        )

        if external_response.error_code:
            domain_error = self._GATEWAY_ERROR_DOMAIN_MAP.get(
                external_response.error_code, "unknown_gateway_error"
            )
            # In production, log the error and set outcome accordingly
            payment.outcome = PaymentOutcome.FAILED

        return payment

    def _map_gateway_status(self, status: ExternalPaymentStatus) -> PaymentOutcome:
        """Map external gateway status to internal payment outcome."""
        mapping = {
            ExternalPaymentStatus.CAPTURED: PaymentOutcome.SUCCEEDED,
            ExternalPaymentStatus.PARTIALLY_REFUNDED: PaymentOutcome.PARTIALLY_REFUNDED,
            ExternalPaymentStatus.FAILED: PaymentOutcome.FAILED,
        }
        return mapping.get(
            status,
            PaymentOutcome.REQUIRES_ACTION,  # Default for PENDING, ERROR states
        )

    def _convert_eur_to_usd(self, eur_cents: int) -> int:
        """Convert EUR cents to USD cents. In production, use CurrencyService."""
        rate = 1.08  # Placeholder — should be fetched from currency service
        return int(eur_cents * rate)

    def _convert_usd_to_eur(self, usd_cents: int) -> int:
        """Convert USD cents back to EUR cents for internal storage."""
        rate = 1.08
        return int(usd_cents / rate)

    def _lookup_gateway_customer_id(self, our_customer_ref: str) -> str:
        """Translate our customer reference to the gateway's opaque UUID.
        In production, this queries a CustomerGatewayMapping table."""
        # Placeholder for external ID resolution
        return f"gw_{our_customer_ref}"


# ── BAD Example: Leaking foreign domain model across boundaries ──


# ❌ BAD: Returning the external response directly — corrupts internal model
def bad_acl_response(external: ExternalChargeResponse) -> dict:
    # The caller receives raw gateway types — ubiquitous language pollution!
    return {
        "status": external.status.value,      # ExternalPaymentStatus enum!
        "txn_id": external.transaction_id,    # No domain context
        "amount": external.amount_captured,   # Wrong currency, wrong type
    }


# ✅ GOOD: ACL translates everything before it crosses the boundary
def good_acl_response(acl: PaymentGatewayACL, external: ExternalChargeResponse) -> PaymentIntent:
    payment = acl.translate_charge_response(external, intent_id="pay_123", order_id="ord_456")
    # Caller receives ONLY internal domain types — clean boundary
    return payment
```

---

### Pattern 2: Shared Kernel

A shared kernel is a minimal, deliberately scoped module containing value objects and entities that both bounded contexts agree to share. The key rule is **minimality**: only the specific data structures that both teams have explicitly agreed upon are shared. Everything else remains separate. This creates a lightweight coupling between contexts — enough for alignment but not so much that changes in one context break the other.

Use when: Two teams need a small set of concepts to be consistent (e.g., `Money`, `OrderId`, `Address`), both teams have equal say in the shared module, and the shared concepts are unlikely to diverge in their evolution.

```python
"""Shared Kernel — minimal agreed-upon domain primitives.

This module lives in a separate package (shared-kernel/) and is imported
by multiple bounded contexts. Both contexts must agree on any changes
to these types. The kernel itself has NO business logic — only data
structures with validation.

File structure:
    shared_kernel/
        __init__.py      ← exports only agreed-upon types
        money.py         ← Money value object (agreed by Finance & Billing)
        order_id.py      ← OrderId entity (agreed by Orders & Inventory)
        address.py       ← Address value object (agreed by Shipping & Customers)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Optional


# ── Shared Value Object: Money ──


class Currency(Enum):
    """ISO 4217 currency codes — agreed by Finance and Billing contexts."""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"


@dataclass(frozen=True)
class Money:
    """Immutable value object representing an amount in a specific currency.

    This is the canonical representation of monetary values across contexts.
    Every bounded context that handles money MUST use this type — never float,
    never separate amount and currency fields.

    Invariants:
        - Amount must be >= 0 (negative amounts are refunds, a different concept)
        - Currency must be a valid ISO 4217 code
        - Decimal precision follows the currency's minor unit rules
    """

    amount: Decimal
    currency: Currency

    def __post_init__(self) -> None:
        """Validate Money invariants at construction time."""
        if self.amount < 0:
            raise ValueError(f"Money amount cannot be negative, got {self.amount}")

        # Enforce valid ISO 4217 codes
        if not isinstance(self.currency, Currency):
            raise TypeError(f"currency must be a Currency enum, got {type(self.currency)}")

    @classmethod
    def from_minor_units(cls, minor_amount: int, currency: Currency) -> Money:
        """Factory method: create Money from integer minor units (cents).

        This avoids floating-point precision issues entirely. Always use this
        factory when receiving monetary values from external APIs or databases.

        Args:
            minor_amount: Integer amount in the currency's minor unit (e.g., 1099 for $10.99).
            currency: The currency.

        Returns:
            A properly constructed Money value object.

        Example:
            >>> m = Money.from_minor_units(1099, Currency.USD)
            >>> str(m)
            '10.99 USD'
        """
        # Determine decimal places based on currency
        precision_map = {Currency.USD: 2, Currency.EUR: 2, Currency.GBP: 2, Currency.JPY: 0}
        decimals = precision_map.get(currency, 2)
        divisor = Decimal(10 ** decimals)
        return cls(amount=Decimal(minor_amount) / divisor, currency=currency)

    def __add__(self, other: Money) -> Money:
        """Add two Money values — must be same currency."""
        if self.currency != other.currency:
            raise TypeError(
                f"Cannot add {self.currency.value} to {other.currency.value}"
            )
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def __sub__(self, other: Money) -> Money:
        """Subtract two Money values — must be same currency."""
        if self.currency != other.currency:
            raise TypeError(
                f"Cannot subtract {other.currency.value} from {self.currency.value}"
            )
        return Money(amount=self.amount - other.amount, currency=self.currency)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.currency == other.currency and self.amount == other.amount

    def __hash__(self) -> int:
        return hash((self.currency, self.amount))

    def __str__(self) -> str:
        return f"{self.amount:.{len(str(self.currency.value)) - 3}f} {self.currency.value}"


# ── Shared Value Object: OrderId ──


@dataclass(frozen=True)
class OrderId:
    """Immutable value object representing an order's unique identifier.

    Both Orders and Inventory contexts agree that this string format
    identifies orders across system boundaries. The format is:
    'ORD-' followed by a 10-digit zero-padded sequence number.

    Invariants:
        - Must match the pattern ORD-XXXXXXXXXX (10 digits)
        - Case-insensitive comparison
    """

    value: str

    def __post_init__(self) -> None:
        if not self.value.startswith("ORD-"):
            raise ValueError(f"OrderId must start with 'ORD-', got '{self.value}'")
        digits = self.value[4:]
        if not digits.isdigit() or len(digits) != 10:
            raise ValueError(
                f"OrderId must have exactly 10 digits after 'ORD-', got '{digits}'"
            )

    @classmethod
    def generate(cls, sequence_number: int) -> OrderId:
        """Factory method to create an OrderId from a numeric sequence.

        Args:
            sequence_number: Integer to format as the order ID suffix.

        Returns:
            A valid OrderId value object.

        Example:
            >>> oid = OrderId.generate(12345)
            >>> str(oid.value)
            'ORD-0000012345'
        """
        return cls(value=f"ORD-{sequence_number:010d}")

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, OrderId):
            return NotImplemented
        return self.value.upper() == other.value.upper()


# ── Shared Kernel Interface — what contexts import ──


__all__: list[str] = ["Money", "Currency", "OrderId"]

# ⚠️ Rule: The shared kernel contains NO business logic, no repositories,
# no service classes. Only data structures with validation invariants.
# Any new type must be agreed upon by ALL consuming contexts' domain leads.
```

---

### Pattern 3: Customer-Supplier Relationship (Conformist Pattern)

In a customer-supplier relationship, the supplier context owns its domain model and makes changes independently. The customer context does NOT have veto power over the supplier's design decisions. Instead, the customer builds an adapter that conforms to whatever contract the supplier publishes. This pattern reflects real-world organizational dynamics where one team controls a shared service that others depend on.

Use when: You must consume a service owned by another team that makes independent changes, you cannot influence their domain model, or their context is foundational (e.g., identity provider, core financial ledger) and other teams must adapt to it.

```python
"""Conformist Adapter — downstream context adapts to upstream supplier's contract.

This module belongs in the InventoryService bounded context, which depends on
the WarehouseService owned by a different team. The WarehouseTeam makes changes
to their API at will; our team builds this adapter to conform to their contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ── Supplier (WarehouseService) Domain Model — consumed via HTTP/REST API ──


class WarehouseStockStatus(Enum):
    """External warehouse status — we must map this to our own language."""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"
    ON_BACKORDER = "on_backorder"


class WarehouseUnitType(Enum):
    """External unit classification — not aligned with our internal units."""
    EACH = "each"               # Single item
    CASE = "case"              # Pack of items
    PALLET = "pallet"          # Bulk shipment
    LOT = "lot"                # Batch lot


@dataclass
class WarehouseProduct:
    """Raw product data from the warehouse API — our conformist adapter translates this."""
    sku: str                    # Their SKU format (different from ours)
    name: str
    unit_type: WarehouseUnitType
    quantity_available: int
    reorder_threshold: int
    status: WarehouseStockStatus
    last_updated: datetime      # Always UTC from their system


@dataclass
class WarehouseReservationRequest:
    """Data we must send to the warehouse — formatted exactly as they require."""
    warehouse_sku: str          # Their SKU, not ours
    requested_units: int
    unit_type: WarehouseUnitType  # Must match one of their enum values
    reason_code: str            # They use a specific set of codes


@dataclass
class WarehouseReservationResponse:
    """Response from the warehouse — we map this to our inventory model."""
    reservation_id: str
    approved_units: int         # May be less than requested (partial fill)
    status: WarehouseStockStatus
    estimated_ship_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None


# ── Our Internal Domain Model (InventoryService Bounded Context) ──


class StockLevel(Enum):
    """Our internal understanding of stock levels."""
    AVAILABLE = "available"
    LOW = "low"
    UNAVAILABLE = "unavailable"
    BACKORDERED = "backordered"
    DISCONTINUED = "discontinued"


@dataclass
class ProductStock:
    """Internal stock entity — uses OUR ubiquitous language throughout."""
    product_id: str
    sku_internal: str
    available_units: int
    reorder_point: int
    stock_level: StockLevel = StockLevel.AVAILABLE
    last_checked_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class InventoryReservation:
    """Our internal reservation entity."""
    reservation_id: str
    product_id: str
    reserved_units: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "confirmed"


# ── Conformist Adapter ──


class WarehouseConformistAdapter:
    """Adapts the InventoryService to conform to the WarehouseService contract.

    This adapter handles all translation between our internal domain model and
    the warehouse's externally-maintained API. Our context NEVER directly uses
    WarehouseProduct or WarehouseReservationRequest — they only exist within
    this adapter class.

    Organizational note: The WarehouseTeam owns their schema. When they change
    field names, add fields, or modify enums, we update this adapter independently
    without requiring approval from their team.
    """

    # Mapping tables between our internal values and theirs
    _SKU_MAPPING: dict[str, str] = {}  # Our SKU → Their SKU (populated from sync)
    _THEIR_SKU_TO_OURS: dict[str, str] = {}  # Reverse lookup

    def load_sku_mapping(self, mappings: dict[str, str]) -> None:
        """Load or update the SKU translation table. Called by a batch sync process."""
        self._SKU_MAPPING = mappings
        self._THEIR_SKU_TO_OURS = {v: k for k, v in mappings.items()}

    def translate_warehouse_product_to_internal(
        self,
        external_product: WarehouseProduct,
    ) -> ProductStock:
        """Convert a warehouse product record into our internal stock entity.

        Maps their SKU format to ours, translates their enum values to ours,
        and computes our derived stock level from their quantity data.

        Args:
            external_product: Raw product data from the WarehouseService API.

        Returns:
            A ProductStock using only our context's ubiquitous language.
        """
        internal_sku = self._THEIR_SKU_TO_OURS.get(
            external_product.sku,
            f"unknown_{external_product.sku}",
        )

        # Translate their stock status to our derived stock level
        stock_level = self._map_stock_status(external_product)

        return ProductStock(
            product_id=internal_sku,
            sku_internal=internal_sku,
            available_units=external_product.quantity_available,
            reorder_point=external_product.reorder_threshold,
            stock_level=stock_level,
            last_checked_at=external_product.last_updated,
        )

    def translate_to_warehouse_reservation(
        self,
        product_id: str,
        requested_units: int,
        unit_type_name: str,
    ) -> WarehouseReservationRequest:
        """Convert an internal reservation request into the format the warehouse expects.

        This is the critical conformist step — we must send data in their exact schema.

        Args:
            product_id: Our internal product ID (must be resolved to their SKU).
            requested_units: Number of units to reserve.
            unit_type_name: Human-readable unit type name.

        Returns:
            A WarehouseReservationRequest formatted exactly as their API requires.

        Raises:
            ValueError: If the product's SKU is not found in the mapping table.
        """
        their_sku = self._SKU_MAPPING.get(product_id)
        if not their_sku:
            raise ValueError(
                f"Cannot create warehouse reservation: no SKU mapping for product '{product_id}'. "
                f"Run a SKU sync process first."
            )

        return WarehouseReservationRequest(
            warehouse_sku=their_sku,
            requested_units=requested_units,
            unit_type=WarehouseUnitType[unit_type_name.upper()],
            reason_code="order_fulfillment",  # Fixed code — agreed with their team
        )

    def translate_warehouse_response_to_internal(
        self,
        external_response: WarehouseReservationResponse,
        product_id: str,
    ) -> InventoryReservation:
        """Map the warehouse's reservation response into our internal model.

        Args:
            external_response: The warehouse's response to a reservation request.
            product_id: Our internal product ID for correlation.

        Returns:
            An InventoryReservation using only our context's types.
        """
        return InventoryReservation(
            reservation_id=external_response.reservation_id,
            product_id=product_id,
            reserved_units=external_response.approved_units,
            created_at=datetime.utcnow(),
            status="confirmed" if external_response.rejection_reason is None else "rejected",
        )

    def _map_stock_status(self, external: WarehouseProduct) -> StockLevel:
        """Translate warehouse stock status to our internal stock level."""
        mapping = {
            WarehouseStockStatus.IN_STOCK: StockLevel.AVAILABLE,
            WarehouseStockStatus.LOW_STOCK: StockLevel.LOW,
            WarehouseStockStatus.OUT_OF_STOCK: StockLevel.UNAVAILABLE,
            WarehouseStockStatus.DISCONTINUED: StockLevel.DISCONTINUED,
            WarehouseStockStatus.ON_BACKORDER: StockLevel.BACKORDERED,
        }
        return mapping[external.status]


# ── BAD Example: Adopting the supplier's model wholesale ──


# ❌ BAD: Returning the external type directly — this is a conformist violation
def bad_conformist_response(warehouse_response: WarehouseReservationResponse) -> WarehouseReservationResponse:
    # The caller gets the EXTERNAL type — ubiquitous language leaks into our context!
    return warehouse_response


# ✅ GOOD: Adapter translates to internal types, preserving boundary integrity
def good_conformist_response(
    adapter: WarehouseConformistAdapter,
    external_response: WarehouseReservationResponse,
    product_id: str,
) -> InventoryReservation:
    # Caller receives ONLY our context's types — clean boundary maintained
    return adapter.translate_warehouse_response_to_internal(external_response, product_id)
```

---

### Pattern 4: Publication Language

A publication language is a shared, neutral vocabulary used to define messages, events, or API contracts that multiple bounded contexts communicate through. Neither publishing nor subscribing context has to adopt the other's internal model — instead, both agree on a common language for cross-context communication. This pattern is essential for event-driven architectures where domain events flow between services.

Use when: Multiple bounded contexts need to exchange information but have incompatible domain models, you are building an event bus or message broker architecture, or you want to decouple publishers from subscribers so neither depends on the other's internal schema.

```python
"""Publication Language — neutral event schemas for cross-context communication.

This module defines the shared event vocabulary that both the Orders and
Inventory contexts use when communicating via the event bus. Neither context
imports the other; both import this publication language module independently.

The publication language is NEUTRAL: it does not reflect any single context's
internal model, but rather captures only the information necessary for the
cross-context conversation.

File structure:
    publication_language/
        __init__.py      ← exports event schemas and envelope types
        order_events.py  ← OrderPlaced, OrderUpdated, OrderCancelled
        inventory_events.py ← StockReserved, StockReleased
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


# ── Event Envelope — wraps all cross-context events ──


class EventType(Enum):
    """Top-level event type categories in the publication language."""
    ORDER = "order"
    INVENTORY = "inventory"
    PAYMENT = "payment"
    SHIPPING = "shipping"


@dataclass
class EventEnvelope:
    """Standard envelope wrapping all domain events in the publication language.

    Every cross-context event MUST be wrapped in this envelope. Consumers use
    the envelope fields for routing, deduplication, and ordering — not the
    event's own fields.

    This is the contract that ALL services agree on for message transport.
    """

    id: str                         # Unique event ID (use ULID or UUID v7)
    type: EventType                 # Domain category
    version: int                    # Schema version — increment on breaking changes
    aggregate_id: str               # ID of the domain aggregate that published this
    aggregate_type: str             # e.g., "Order", "InventoryItem"
    timestamp: datetime             # When the event occurred (UTC)
    correlation_id: str             # Request/transaction ID for tracing across contexts
    data: dict[str, Any]            # Serialized domain event payload

    def to_dict(self) -> dict[str, Any]:
        """Serialize envelope for transport (JSON over message broker)."""
        return {
            "id": self.id,
            "type": self.type.value,
            "version": self.version,
            "aggregate_id": self.aggregate_id,
            "aggregate_type": self.aggregate_type,
            "timestamp": self.timestamp.isoformat(),
            "correlation_id": self.correlation_id,
            "data": self.data,
        }

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> EventEnvelope:
        """Deserialize envelope from transport format."""
        return cls(
            id=raw["id"],
            type=EventType(raw["type"]),
            version=raw["version"],
            aggregate_id=raw["aggregate_id"],
            aggregate_type=raw["aggregate_type"],
            timestamp=datetime.fromisoformat(raw["timestamp"]),
            correlation_id=raw["correlation_id"],
            data=raw["data"],
        )


# ── Publication Language Event: OrderPlaced ──


@dataclass
class OrderPlacedEvent:
    """Neutral event schema for order placement — used by both Orders and Inventory.

    This is the publication language contract. Neither context uses its own internal
    model in this event; instead, they both serialize to/from this neutral shape.

    Fields are kept minimal — only what downstream contexts absolutely need to know.
    Extra data stays within the publishing context's internal model.

    Schema version: 1 (increment when adding/removing required fields)
    """

    order_id: str                       # Universal order identifier
    customer_id: str                    # Customer reference agreed across contexts
    placed_at: datetime                 # When the order was committed
    line_items: list[dict[str, Any]]    # Minimal item data for inventory reservation
    total_amount_eur_cents: int         # Amount in our agreed-upon neutral format

    def to_envelope_data(self) -> dict[str, Any]:
        """Convert to envelope payload format."""
        return {
            "order_id": self.order_id,
            "customer_id": self.customer_id,
            "placed_at": self.placed_at.isoformat(),
            "line_items": self.line_items,
            "total_amount_eur_cents": self.total_amount_eur_cents,
        }

    @classmethod
    def from_envelope_data(cls, data: dict[str, Any]) -> OrderPlacedEvent:
        """Reconstruct event from envelope payload."""
        return cls(
            order_id=data["order_id"],
            customer_id=data["customer_id"],
            placed_at=datetime.fromisoformat(data["placed_at"]),
            line_items=data["line_items"],
            total_amount_eur_cents=data["total_amount_eur_cents"],
        )


@dataclass
class StockReservedEvent:
    """Neutral event schema for stock reservation — published by Inventory to Shipping.

    This event tells downstream contexts that inventory has been successfully reserved.
    Both the publishing (Inventory) and subscribing (Shipping, Fulfillment) contexts
    agree on this schema. Neither needs to know about the other's internal model.

    Schema version: 1
    """

    order_id: str
    reservation_id: str
    items_reserved: list[dict[str, Any]]
    reserved_at: datetime

    def to_envelope_data(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "reservation_id": self.reservation_id,
            "items_reserved": self.items_reserved,
            "reserved_at": self.reserved_at.isoformat(),
        }


# ── Event Handler — demonstrates consumption in a bounded context ──


class OrderEventHandler:
    """Subscriber handler in the InventoryService bounded context.

    This class listens for OrderPlaced events from the event bus and processes
    them using ONLY the publication language schema — it never imports the
    Orders context's internal model.
    """

    def __init__(self, inventory_repo: Any) -> None:  # type: ignore[misc]
        self._inventory = inventory_repo

    def handle_order_placed(self, envelope: EventEnvelope) -> None:
        """Process an OrderPlaced event from the publication language.

        Step 1: Validate envelope schema version (skip unknown versions).
        Step 2: Deserialize from neutral schema.
        Step 3: Process using ONLY the publication language data.
        Step 4: Publish StockReserved back into the same publication language.

        Args:
            envelope: The raw event envelope from the message broker.

        Raises:
            ValueError: If the event schema version is unsupported.
            KeyError: If a required line item field is missing.
        """
        if envelope.type != EventType.ORDER:
            return  # Not our event type — ignore silently

        if envelope.version != 1:
            raise ValueError(f"Unsupported OrderPlaced schema version: {envelope.version}")

        # Deserialize from neutral publication language
        order_event = OrderPlacedEvent.from_envelope_data(envelope.data)

        # Process using ONLY the neutral schema data
        for line_item in order_event.line_items:
            product_id = line_item["product_id"]
            quantity = line_item["quantity"]

            # Check inventory and reserve stock
            self._inventory.reserve_stock(product_id, quantity)

        # Publish response back using the SAME publication language
        stock_event = StockReservedEvent(
            order_id=order_event.order_id,
            reservation_id=self._generate_reservation_id(),
            items_reserved=[{"product_id": li["product_id"], "quantity": li["quantity"]} for li in order_event.line_items],
            reserved_at=datetime.utcnow(),
        )

        # In production: publish stock_event via event bus using envelope wrapper
        self._publish_stock_reserved(stock_event)

    def _generate_reservation_id(self) -> str:
        """Generate a unique reservation ID. Uses ULID in production."""
        return f"res_{id(self)}_1"  # Placeholder

    def _publish_stock_reserved(self, event: StockReservedEvent) -> None:
        """Publish a StockReserved event into the event bus. In production,
        this calls the message broker's publish method."""
        pass  # Implementation depends on chosen event bus (Kafka, RabbitMQ, etc.)
```

---

## Constraints

### MUST DO

- Name every bounded context explicitly and document its ubiquitous language for shared concepts before designing any integration
- Always translate foreign domain models at the boundary — never serialize or pass a supplier's entity into your internal code
- Keep shared kernels minimal: only agreed-upon value objects and entities, no business logic, no repositories
- Use publication language event schemas that are independent of both publishers' and subscribers' internal models
- Add version numbers to every cross-context contract (API versions, event schema versions, shared module versions)
- Write integration tests that verify translation accuracy: serialize with source model → translate → deserialize → assert invariants
- Document customer-supplier ownership for every context mapping — who makes changes, who adapts, what the SLA is
- Design publication language events to be append-only: add fields without breaking old consumers, never remove or rename existing fields

### MUST NOT DO

- Share entire aggregate roots between contexts — only share minimal value objects (Money, OrderId), not full domain models with behavior
- Let a supplier's team dictate your internal model — if they change their schema, you adapt via an ACL or conformist adapter, not by rewriting your domain
- Use the same class name in multiple contexts for semantically different concepts (e.g., "Customer" in Sales vs. "Customer" in Support) without explicit mapping documentation
- Bypass the anticorruption layer to directly call supplier APIs from domain logic — all external interaction goes through the translation boundary
- Version your publication language events by deprecating old fields immediately — maintain backward compatibility for at least two major releases before removal
- Put business rules or validation logic in the shared kernel — it must contain only data structures with invariant checks

---

## Output Template

When implementing a context mapping solution, produce:

1. **Context Map Description** — Textual diagram listing all bounded contexts, their relationships (ACL, shared kernel, conformist, customer-supplier, publication language), and the direction of information flow for each relationship.

2. **Ubiquitous Language Comparison** — Table showing shared concepts with columns: Concept Name, Context A's Definition, Context B's Definition, Semantic Gap (same name/different meaning, different name/same meaning, or fully aligned).

3. **Translation Layer Code** — Python module implementing the selected pattern(s) with typed signatures, docstrings, and full BAD/GOOD examples for each translation direction.

4. **Shared Kernel Module** — If applicable, minimal value object definitions with validation invariants, factory methods, and clear documentation of which contexts consume them.

5. **Publication Language Schemas** — Event envelope definition and individual event schemas with version numbers, field descriptions, and serialization/deserialization methods.

6. **Integration Test Cases** — Pytest-style test functions covering: successful translation round-trip, boundary values (zero amount, max quantity), invalid foreign input rejection, and schema version mismatch handling.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Tactical DDD patterns for building the internal model of each bounded context (aggregates, entities, value objects) — use alongside this skill for end-to-end strategic + tactical design |
| `domain-modeling` | Techniques for discovering and defining bounded contexts, ubiquitous language, and aggregate boundaries — do this before choosing context mapping patterns |
| `domain-events` | Patterns for designing and implementing domain events within a single bounded context — complements the publication language pattern for internal event handling |
| `microservices-architecture` | Architecture-level guidance for decomposing a monolith into services with bounded contexts — informs which integration patterns are appropriate at the service boundary level |

---

## Live References

> Authoritative documentation links for strategic DDD and context mapping.

- [Eric Evans' Domain-Driven Design — Context Mapping Chapter](https://www.domainlanguage.com/ddd/reference/)
- [Vaughn Vernon's Implementing Domain-Driven Design (Red Book) — Chapter 12: Context Mapping](https://addthis.com/blog/2013/07/29/implementing-domain-driven-design-vaughn-vernon.html)
- [Martin Fowler — Bounded Context](http://martinfowler.com/bliki/BoundedContext.html)
- [Microsoft Architecture Center — Context Mapping Patterns](https://learn.microsoft.com/en-us/azure/architecture/guide/domain-driven-design/context-mapping)
- [Udi Dahan — The Customer-Supplier Relationship in DDD](https://udidahan.com/2016/10/07/the-customer-supplier-relationship-in-ddd/)
