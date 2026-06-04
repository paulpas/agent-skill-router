---
name: anti-corruption-layer
description: Implements Anti-Corruption Layer patterns to isolate domain models from
  foreign systems, translating external APIs and legacy data structures into clean
  internal models while rejecting incompatible types at boundaries.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: anti corruption layer, acl, foreign model translation, boundary adapter,
    external system isolation, how do i protect my domain from bad apis, legacy system
    integration, domain contamination
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
  related-skills: domain-driven-design, domain-modeling, monolith-architecture, microservices-architecture,
    software-architecture
---
# Anti-Corruption Layer

Senior software architect building isolation boundaries between clean domain models and foreign systems — external APIs, legacy codebases, third-party services, or other bounded contexts with incompatible terminology. Implements translation layers that convert external vocabulary into internal model structures while actively rejecting types and concepts that would corrupt the domain.

## TL;DR Checklist

- [ ] Define explicit boundary modules that sit between infrastructure and domain
- [ ] Create adapter classes that translate foreign data structures into internal models
- [ ] Reject unknown/extra fields from external sources — fail fast, never silently absorb
- [ ] Use wrapper adapters for third-party APIs to enable test doubles and future swapping
- [ ] Map external terminology to internal ubiquitous language explicitly (document the mapping)
- [ ] Never pass raw DTOs, API responses, or ORM objects into domain logic
- [ ] Keep the ACL thin — translation belongs here; business rules belong in the domain

---

## When to Use

Use this skill when:

- Integrating with a third-party API whose terminology conflicts with your domain model (e.g., "account" means something different in the banking API vs. your internal system)
- Connecting to a legacy system with poor naming conventions, inconsistent data formats, or business logic buried in stored procedures
- Merging two microservices or bounded contexts that use overlapping terms with different meanings (e.g., one calls it "shipment," another calls it "dispatch")
- Onboarding a new dependency whose domain model would pollute your clean architecture if exposed directly
- Building integration points where the external system may evolve independently and you need to shield your domain from their changes

---

## When NOT to Use

Avoid this skill for:

- Internal modules within the same bounded context — use standard module boundaries instead of an ACL; adding translation layers between tightly coupled internal components creates unnecessary indirection
- Simple CRUD proxies where the external API perfectly matches your internal model — if there is zero terminology or structural mismatch, a thin wrapper suffices without full ACL patterns
- Situations where you control both sides and can agree on a shared contract — negotiate a common interface first; an ACL should be the fallback when agreement is impossible
- Performance-critical hot paths where translation overhead matters more than domain purity — measure carefully before deciding to skip isolation

---

## Core Workflow

1. **Inventory Foreign Systems** — List every external dependency that crosses into your bounded context. For each, document: the API/interface it exposes, terminology used in its responses, data structures it sends, and how each conflicts with your internal ubiquitous language. **Checkpoint:** No integration point operates without first being documented on the foreign system inventory. If a new third-party API is added later, it must go through this same assessment before code is written.

2. **Define Boundary Module** — Create a dedicated module (e.g., `adapters/external_api/`) that contains only ACL code. This module imports from both the domain layer (for internal types) and the infrastructure layer (for external client libraries). No other module in your application should import from this boundary module — it is an outbound-only dependency flowing inward to the domain. **Checkpoint:** Run `import` analysis: every file in the boundary module must either import domain types OR infrastructure types, never both importing each other circularly.

3. **Create Translation Mappers** — For each foreign data structure, write a dedicated mapper class that accepts raw external input and returns an internal domain object. The mapper must be explicit: every field is named, every transformation is visible in the code. Use factory methods on your domain types (`Address.from_external_payload()`) rather than direct constructors to centralize translation logic. **Checkpoint:** Every mapper has at least one unit test that verifies unknown fields from the external source are explicitly rejected (raise `ValueError` or log a warning with structured data).

4. **Implement Foreign Model Detection** — Before translating, validate that incoming data belongs to the expected format. Use structural checks (type inspection, field presence, schema validation) to detect if the external system has changed its contract without documentation. Fail loudly when unexpected fields arrive rather than silently ignoring them — silent absorption is how corruption creeps in. **Checkpoint:** Add a `detect_foreign_model()` or similar check at the boundary entry point that validates structure before any translation begins.

5. **Wrap Third-Party Clients** — Never call an external API directly from your domain logic. Always route through a wrapper adapter class that encapsulates the HTTP client, authentication, retry logic, and response parsing. This wrapper returns raw DTOs; the mapper then converts those DTOs to internal models. This two-layer separation means you can swap the HTTP library or add caching by changing only the wrapper — mappers remain untouched. **Checkpoint:** Domain code calls `adapter.get_customer(id)` and receives an `internal.models.Customer` — never an `http.Response`, `dict`, or raw JSON.

6. **Enforce Language Isolation** — At every ACL boundary, external terms must be translated before they cross into internal territory. If the API sends `cust_id`, your domain code should only ever see `customer_id`. Document each mapping explicitly in the mapper class using a comment block that lists: external field → internal field → transformation rule. **Checkpoint:** Search the entire domain layer for any occurrence of external system terminology (e.g., "merchant_ref," "txn_id" from Stripe, "account_number" from a banking API). If found anywhere outside the ACL module, refactor immediately.

---

## Implementation Patterns

### Pattern 1: External System Adapter with Translation Mapper

This is the most common ACL pattern. An adapter wraps an external HTTP client and translates raw responses into internal domain objects. The mapper enforces explicit field-by-field conversion — no implicit or magic mapping.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum, auto
from typing import Any


# ─── Internal Domain Model (lives in domain.models) ──────────────────

@dataclass(frozen=True)
class Currency:
    """Internal representation of monetary currency."""
    code: str       # ISO 4217: "USD", "EUR", etc.
    precision: int = 2

    @classmethod
    def from_code(cls, code: str) -> Currency:
        if len(code) != 3 or not code.isalpha():
            raise ValueError(f"Invalid currency code: {code!r}")
        return cls(code=code.upper(), precision=2)


@dataclass(frozen=True)
class MoneyAmount:
    """Immutable monetary value in a specific currency."""
    amount: float
    currency: Currency

    @property
    def is_negative(self) -> bool:
        return self.amount < 0

    def __add__(self, other: MoneyAmount) -> MoneyAmount:
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add {other.currency.code} to {self.currency.code}"
            )
        return MoneyAmount(self.amount + other.amount, self.currency)


# ─── External API Response (raw DTO — never used outside the adapter) ─

@dataclass
class StripePaymentDTO:
    """Raw data transfer object from Stripe API. DO NOT use this in domain code."""
    id: str                       # e.g., "pi_3Nq..."
    amount: int                   # Amount in CENTS — must be converted to dollars
    currency: str                 # 3-letter ISO code
    status: str                   # "succeeded", "pending", "requires_payment_method"
    customer_id: str | None       # Stripe's internal customer reference
    created_at: datetime          # Unix timestamp from Stripe API
    description: str | None       # Free-text description provided by the merchant


# ─── Translation Mapper (lives in adapters/boundary) ─────────────────

class StripePaymentMapper:
    """Translates raw Stripe API responses into internal Payment model.

    This mapper is the boundary where foreign terminology meets internal language.
    Every transformation is explicit and documented — no hidden assumptions.
    """

    # Explicit mapping of Stripe status values to our internal payment states
    STATUS_MAP: dict[str, str] = {
        "succeeded": "completed",
        "pending": "awaiting_authorization",
        "requires_payment_method": "cancelled",
        "canceled": "cancelled",
        "processing": "in_progress",
    }

    @classmethod
    def from_dto(cls, dto: StripePaymentDTO) -> dict[str, Any]:
        """Convert a Stripe DTO to an internal payment record dictionary.

        Raises ValueError if the DTO is structurally invalid or contains
        unexpected fields that suggest the external API has changed.
        """
        # Validate we have exactly the fields we expect — reject unknowns early
        expected_fields = {
            "id", "amount", "currency", "status", "customer_id",
            "created_at", "description"
        }
        dto_keys = set(dto.__dict__.keys())

        # Check for unexpected new fields (external API may have changed)
        unknown_fields = dto_keys - expected_fields
        if unknown_fields:
            raise ValueError(
                f"Stripe API returned unexpected fields: {unknown_fields}. "
                "The contract has changed — update the mapper or reject until reviewed."
            )

        # Map the external status to internal terminology
        internal_status = cls.STATUS_MAP.get(dto.status)
        if internal_status is None:
            raise ValueError(
                f"Unknown Stripe payment status '{dto.status}'. "
                f"Recognized values: {list(cls.STATUS_MAP.keys())}"
            )

        # Convert cents to dollars — this is the core currency transformation
        amount_in_dollars = dto.amount / 100.0

        return {
            "payment_id": dto.id,                    # Stripe's ID — preserved as-is (external reference)
            "amount": MoneyAmount(amount_in_dollars, Currency.from_code(dto.currency)),
            "status": internal_status,               # Translated: "succeeded" → "completed"
            "customer_ref": dto.customer_id,         # Renamed: "customer_id" → "customer_ref"
            "processed_at": dto.created_at,          # Semantic rename: "created_at" → "processed_at"
            "merchant_note": dto.description,        # Semantic rename: "description" → "merchant_note"
            "_raw_external_id": dto.id,              # Keep raw reference for reconciliation/debugging
        }


# ❌ BAD: Direct usage of Stripe DTO in domain logic — terminology leaks everywhere
class BadOrderProcessor:
    def __init__(self) -> None:
        pass  # Would call stripe directly and work with raw dicts

    def process_payment(self, stripe_dto: StripePaymentDTO) -> None:
        # Domain code now has to know about "cents", "succeeded", "customer_id"
        dollars = stripe_dto.amount / 100  # Magic conversion scattered everywhere
        if stripe_dto.status == "succeeded":  # External terminology in domain logic
            print(f"Payment {stripe_dto.id} from customer {stripe_dto.customer_id}")


# ✅ GOOD: Domain code works only with internal types — adapter handles translation
class GoodOrderProcessor:
    def __init__(self, payment_adapter: PaymentAdapter) -> None:
        self._adapter = payment_adapter

    def confirm_order(self, order_id: str) -> bool:
        # Domain code receives a clean dict with MoneyAmount and known status strings
        result = self._adapter.fetch_payment_status(order_id)
        if result["status"] == "completed":  # Internal terminology
            return True
        return False


class PaymentAdapter:
    """Wrapper that fetches external payment data and returns internal models."""

    def __init__(self) -> None:
        self._stripe_client = None  # Would be initialized with Stripe API key
        self._mapper = StripePaymentMapper()

    def fetch_payment_status(self, order_id: str) -> dict[str, Any]:
        """Fetch payment status and translate to internal model."""
        raw_dto = self._get_stripe_payment(order_id)  # Calls external API
        return self._mapper.from_dto(raw_dto)         # Translates to internal format

    def _get_stripe_payment(self, order_id: str) -> StripePaymentDTO:
        """Raw HTTP call — returns untyped DTO. Only this method talks to Stripe."""
        raise NotImplementedError  # Would use requests or httpx to call Stripe API
```

---

### Pattern 2: Bounded Context ACL — Cross-Context Translation

When two bounded contexts in the same organization use different models for the same concept, an ACL at the boundary translates between them. This is distinct from external system integration because both contexts are owned by your organization and should evolve toward alignment over time.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ─── Context A: Shipping (uses "shipment", "tracking_number") ────────

@dataclass(frozen=True)
class Shipment:
    """Shipment model as defined in the Shipping bounded context."""
    shipment_id: str
    tracking_number: str              # Carrier-provided tracking number
    carrier_name: str                 # "FedEx", "UPS", etc.
    estimated_delivery_date: date     # Projected delivery date
    status: str                       # "in_transit", "delivered", "exception"


# ─── Context B: Order Management (uses "dispatch", "courier_ref") ─────

@dataclass(frozen=True)
class InternalDeliveryRecord:
    """Internal model as used by the Order Management bounded context."""
    delivery_id: str                  # Maps to shipment_id
    courier_reference: str            # Maps to tracking_number
    carrier: str                      # Maps to carrier_name
    expected_delivery: date           # Maps to estimated_delivery_date
    state: str                        # Maps to status — different enum values


# ─── ACL Translator between the two contexts ─────────────────────────

class ShippingToOrdersTranslator:
    """ACL translator: converts Shipping context models into Order Management models.

    This translator exists because the two bounded contexts chose different names
    for the same concept. The Shipping team uses "shipment/tracking_number" while
    the Orders team uses "dispatch/courier_reference". Both are valid within their
    contexts — the ACL bridges them without forcing either side to adopt the other's language.

    IMPORTANT: This is NOT a shared model. Each context keeps its own types.
    The translator is a one-way street from Shipping → Orders.
    """

    # Map Shipping status values to what Order Management expects
    STATUS_MAPPING = {
        "in_transit": "processing",       # Different teams, different mental models
        "delivered": "completed",
        "exception": "disputed",
    }

    @classmethod
    def translate_shipment(
        cls,
        shipment: Shipment,
        delivery_id_mapping: dict[str, str] | None = None,
    ) -> InternalDeliveryRecord:
        """Convert a Shipping context shipment into an Order Management delivery record.

        Args:
            shipment: A domain object from the Shipping bounded context
            delivery_id_mapping: Optional mapping of shipping IDs to order IDs
                (needed because each context has its own ID namespace)
        """
        internal_delivery_id = (
            delivery_id_mapping.get(shipment.shipment_id, shipment.shipment_id)
            if delivery_id_mapping
            else shipment.shipment_id
        )

        return InternalDeliveryRecord(
            delivery_id=internal_delivery_id,
            courier_reference=shipment.tracking_number,
            carrier=shipment.carrier_name,
            expected_delivery=shipment.estimated_delivery_date,
            state=cls.STATUS_MAPPING.get(
                shipment.status,
                "unknown"  # Safety fallback — should be handled by alerting
            ),
        )

    @classmethod
    def detect_foreign_shipment(cls, obj: Any) -> bool:
        """Verify that an object is genuinely a Shipping context Shipment.

        Returns True if the object appears to be from a foreign context
        (i.e., has Shipping context's type but was not created through
        the expected boundary entry point).
        """
        # Structural check — does it have the fields of a Shipment?
        return (
            hasattr(obj, "shipment_id") and
            hasattr(obj, "tracking_number") and
            hasattr(obj, "carrier_name")
        )


# ❌ BAD: Shared mutable model — both contexts import the same class
class BadSharedShippingModel:
    """Trying to share one model between contexts — inevitable divergence."""
    def __init__(self):
        # Shipping team adds tracking_number
        self.tracking_number = ""
        # Order team also needs delivery_id but doesn't know shipping team added tracking_number
        self.delivery_id = ""
        # Eventually both teams argue about naming conventions, enum values, etc.


# ✅ GOOD: Separate models with explicit translator at the boundary
def receive_shipment_from_shipping_context(shipment: Shipment) -> None:
    """Boundary function in Order Management — only entry point for Shipping data."""
    if not ShippingToOrdersTranslator.detect_foreign_shipment(shipment):
        raise TypeError("Expected a Shipping context Shipment, got foreign type")

    delivery_record = ShippingToOrdersTranslator.translate_shipment(shipment)
    # Now proceed with internal order processing using clean InternalDeliveryRecord
    print(f"Order delivered: {delivery_record.delivery_id} via {delivery_record.carrier}")
```

---

### Pattern 3: Wrapper Adapter for Third-Party API Swapping

When a third-party service might be replaced (or the contract is unstable), create a wrapper adapter that encapsulates all external dependencies. The domain code depends on the wrapper interface, not the actual external client. This enables test doubles and future-swapping with minimal refactoring.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


# ─── Internal Domain Types (stable — owned by our codebase) ──────────

@dataclass(frozen=True)
class ExchangeRate:
    """Internal representation of a currency exchange rate."""
    from_currency: str
    to_currency: str
    rate: float
    valid_from: datetime
    provider: str           # Which external service this came from

    @property
    def inverse(self) -> ExchangeRate:
        return ExchangeRate(
            from_currency=self.to_currency,
            to_currency=self.from_currency,
            rate=1.0 / self.rate if self.rate != 0 else 0.0,
            valid_from=self.valid_from,
            provider=self.provider,
        )


# ─── Abstract Wrapper Interface (domain depends on THIS, not the real client) ──

class ExchangeRateProvider(ABC):
    """Abstract interface for external exchange rate services.

    The domain layer depends only on this abstract class. The concrete
    implementation (using a specific third-party API like OpenExchangeRates)
    lives in the infrastructure/adapters layer.
    """

    @abstractmethod
    def fetch_rate(self, from_currency: str, to_currency: str) -> ExchangeRate:
        """Fetch exchange rate. Must handle authentication, retries, and errors."""
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of this provider (for logging and debugging)."""
        ...


# ─── Real Implementation (infrastructure layer only) ─────────────────

class OpenExchangeRatesClient(ExchangeRateProvider):
    """Concrete adapter for the openexchangerates.org API.

    This class handles all external concerns: HTTP calls, API key management,
    response parsing, and error handling. The domain never sees these details.
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        # Would initialize httpx.Client here with timeout settings, retry config

    def fetch_rate(self, from_currency: str, to_currency: str) -> ExchangeRate:
        """Fetch rate from openexchangerates.org and translate to internal model.

        Raises ConnectionError if the external service is unreachable.
        Raises ValueError if the response is malformed or currency pair is unsupported.
        """
        # In real code: make HTTP GET request with API key in header
        # For this example, we simulate the response structure
        import json  # Would use httpx.Response.json()

        raw_response = {  # Simulated — would come from self._client.get(url).json()
            "base": "USD",
            "rates": {
                to_currency: round(1.08 if to_currency == "EUR" else 148.5, 4),
            },
            "timestamp": int(datetime.now().timestamp()),
        }

        if to_currency not in raw_response["rates"]:
            raise ValueError(
                f"Currency pair {from_currency}/{to_currency} not supported by provider"
            )

        rate_value = raw_response["rates"][to_currency]
        valid_from = datetime.fromtimestamp(raw_response["timestamp"])

        return ExchangeRate(
            from_currency=from_currency.upper(),
            to_currency=to_currency.upper(),
            rate=rate_value,
            valid_from=valid_from,
            provider=self.provider_name,
        )

    @property
    def provider_name(self) -> str:
        return "OpenExchangeRates"


# ─── Test Double (for unit testing domain logic without external calls) ─

class StubExchangeRateProvider(ExchangeRateProvider):
    """In-memory test double that returns predefined exchange rates.

    Used in unit tests so domain code can be tested deterministically
    without network calls, API keys, or rate limits.
    """

    def __init__(self, rates: dict[tuple[str, str], float] | None = None) -> None:
        self._rates: dict[tuple[str, str], float] = rates or {}

    def add_rate(self, from_curr: str, to_curr: str, rate: float) -> None:
        self._rates[(from_curr.upper(), to_curr.upper())] = rate

    def fetch_rate(self, from_currency: str, to_currency: str) -> ExchangeRate:
        key = (from_currency.upper(), to_currency.upper())
        if key not in self._rates:
            raise ValueError(
                f"No stub rate configured for {key}. "
                "Add it via provider.add_rate(from, to, rate)"
            )
        return ExchangeRate(
            from_currency=key[0],
            to_currency=key[1],
            rate=self._rates[key],
            valid_from=datetime.now(),
            provider="StubExchangeRateProvider",
        )

    @property
    def provider_name(self) -> str:
        return "stub"


# ─── Domain Code (depends only on the abstract interface) ─────────────

class CurrencyConverter:
    """Domain service that converts amounts between currencies.

    Depends ONLY on ExchangeRateProvider abstract interface — does not know
    whether it uses OpenExchangeRates, a local database, or a stub.
    """

    def __init__(self, rate_provider: ExchangeRateProvider) -> None:
        self._provider = rate_provider

    def convert(self, amount: float, from_currency: str, to_currency: str) -> ExchangeRate:
        """Convert an amount and return the full exchange record."""
        rate_record = self._provider.fetch_rate(from_currency, to_currency)
        converted_amount = amount * rate_record.rate
        print(f"{amount} {rate_record.from_currency} → {converted_amount:.2f} {to_currency}")
        return rate_record


# Usage in tests — swap the provider with a stub, zero refactoring needed
def test_currency_conversion():
    stub_provider = StubExchangeRateProvider()
    stub_provider.add_rate("USD", "EUR", 0.92)

    converter = CurrencyConverter(stub_provider)
    # Deterministic test — no network calls, no API keys
    result = converter.convert(100.0, "USD", "EUR")
    assert result.rate == 0.92
```

---

### Pattern 4: Schema Validation at the Boundary

When integrating with external systems whose contracts change unpredictably (third-party APIs, data feeds, webhooks), implement schema validation at the ACL entry point. This catches contract changes before corrupted data propagates into your domain.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SchemaValidationError:
    """Describes a validation failure at the ACL boundary."""
    field_path: str           # e.g., "customer.email" or "items[2].price"
    expected_type: str        # e.g., "str", "number", "string (ISO 8601 date)"
    actual_value: Any
    reason: str               # Human-readable explanation


class BoundarySchemaValidator:
    """Validates incoming external data against the expected contract.

    This is your first line of defense against external system changes.
    When a third-party API adds a new field, removes an old one, or changes
    a type, this validator catches it immediately and fails loudly rather
    than silently absorbing the corruption.
    """

    def __init__(self, schema: dict[str, Any]) -> None:
        """Initialize with the expected schema definition.

        Schema format (simplified JSON Schema subset):
        {
            "type": "object",
            "required": ["field1", "field2"],
            "properties": {
                "field1": {"type": "string"},
                "field2": {"type": "number"},
                "nested": {
                    "type": "object",
                    "required": ["inner_field"],
                    "properties": {...}
                }
            },
            "additionalProperties": False  # Reject unexpected fields
        }
        """
        self._schema = schema

    def validate(self, data: dict[str, Any]) -> list[SchemaValidationError]:
        """Validate incoming data. Returns empty list if valid."""
        errors: list[SchemaValidationError] = []
        self._validate_node(data, self._schema, "")
        return errors

    def _validate_node(
        self,
        data: Any,
        schema: dict[str, Any],
        path: str,
    ) -> None:
        """Recursively validate a data node against its schema definition."""
        expected_type = schema.get("type")

        if expected_type == "object":
            if not isinstance(data, dict):
                errors.append(SchemaValidationError(
                    field_path=path or "(root)",
                    expected_type="object",
                    actual_value=data,
                    reason=f"Expected a JSON object but got {type(data).__name__}",
                ))
                return

            # Check required fields
            for required_field in schema.get("required", []):
                if required_field not in data:
                    field_path = f"{path}.{required_field}" if path else required_field
                    errors.append(SchemaValidationError(
                        field_path=field_path,
                        expected_type="present (required)",
                        actual_value=None,
                        reason=f"Required field '{required_field}' is missing",
                    ))

            # Check additional properties
            if not schema.get("additionalProperties", True):
                allowed = set(schema.get("properties", {}).keys())
                for extra_key in set(data.keys()) - allowed:
                    field_path = f"{path}.{extra_key}" if path else extra_key
                    errors.append(SchemaValidationError(
                        field_path=field_path,
                        expected_type=f"one of {sorted(allowed)}",
                        actual_value=data[extra_key],
                        reason="Unexpected field not in the contract — external API changed",
                    ))

            # Validate each defined property recursively
            properties = schema.get("properties", {})
            for key, value in data.items():
                if key in properties:
                    child_path = f"{path}.{key}" if path else key
                    self._validate_node(value, properties[key], child_path)

        elif expected_type == "string":
            if not isinstance(data, str):
                errors.append(SchemaValidationError(
                    field_path=path or "(root)",
                    expected_type="string",
                    actual_value=data,
                    reason=f"Expected string but got {type(data).__name__}",
                ))

        elif expected_type == "number":
            if not isinstance(data, (int, float)):
                errors.append(SchemaValidationError(
                    field_path=path or "(root)",
                    expected_type="number",
                    actual_value=data,
                    reason=f"Expected number but got {type(data).__name__}",
                ))

        elif expected_type == "array":
            if not isinstance(data, list):
                errors.append(SchemaValidationError(
                    field_path=path or "(root)",
                    expected_type="array",
                    actual_value=data,
                    reason=f"Expected array but got {type(data).__name__}",
                ))

        return errors


# ─── Example: Validating a webhook payload from an external payment system ──

PAYMENT_WEBHOOK_SCHEMA = {
    "type": "object",
    "required": ["event_id", "event_type", "payload"],
    "properties": {
        "event_id": {"type": "string"},
        "event_type": {
            "type": "string",
            # Specific allowed values — not just any string
            "enum": ["payment.completed", "payment.failed", "refund.created"]
        },
        "payload": {
            "type": "object",
            "required": ["amount", "currency", "customer_id"],
            "properties": {
                "amount": {"type": "number"},
                "currency": {"type": "string", "maxLength": 3},
                "customer_id": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
    "additionalProperties": False,
}


def handle_webhook_payload(raw_body: str) -> None:
    """ACL entry point for incoming webhook — validate before processing."""
    validator = BoundarySchemaValidator(PAYMENT_WEBHOOK_SCHEMA)

    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Webhook body is not valid JSON: {e}")

    errors = validator.validate(data)
    if errors:
        # Log all validation failures for immediate investigation
        error_messages = [f"{err.field_path}: {err.reason}" for err in errors]
        raise ValueError(
            f"Webhook payload failed ACL validation ({len(errors)} issues):\n  "
            + "\n  ".join(error_messages)
        )

    # If we reach here, the data is structurally valid — proceed with domain processing
    event_type = data["event_type"]
    payload = data["payload"]
    print(f"Processing {event_type} for customer {payload['customer_id']}")


# ❌ BAD: No validation — silently accepts changed API format
def bad_handle_webhook(raw_body: str) -> None:
    """This would fail if the external API adds new fields or changes types."""
    data = json.loads(raw_body)
    # Just blindly access fields — any structural change crashes at runtime unpredictably
    customer_id = data["payload"]["customer_id"]  # KeyError if payload structure changed


# ✅ GOOD: Validation catches contract changes before they corrupt domain state
def good_handle_webhook(raw_body: str) -> None:
    handle_webhook_payload(raw_body)  # Raises ValueError with clear diagnostics on failure
```

---

## Constraints

### MUST DO

- **Separate boundary modules into their own namespace** — keep all ACL code in `adapters/`, `integrations/`, or `boundary/` subdirectories. Domain layer must never import from these directories; the dependency flows inward, never outward.
- **Make every translation explicit and documented** — each mapper class must have a comment block at the top listing every field transformation: external name → internal name → rule (type coercion, enum mapping, semantic rename). Future maintainers should understand why "cust_id" becomes "customer_ref".
- **Fail loudly on unexpected data** — when the external system sends unknown fields or changed types, raise a descriptive error with all validation details. Silent absorption of corrupted data is the core problem ACLs exist to prevent.
- **Wrap third-party clients behind interfaces** — domain code depends on abstract adapter interfaces (ABC in Python), not concrete HTTP client implementations. This enables test doubles and future provider swapping without refactoring domain logic.
- **Never pass raw DTOs or API responses into domain logic** — every boundary crossing must produce a clean internal type. If domain code can receive a `dict`, `httpx.Response`, or raw JSON, the ACL is incomplete.
- **Track reconciliation IDs** — always preserve the external system's original ID (e.g., `_raw_external_id`) in translated records so that production issues can be traced back to the source system for debugging.

### MUST NOT DO

- **Put business logic inside mappers** — mappers translate; they do not enforce business rules, calculate prices, or make decisions based on external data values. If you find domain logic in a mapper, move it to the appropriate domain service or aggregate.
- **Create circular dependencies between adapter and domain** — the boundary module imports domain types (for translation targets), but domain code must never import adapter types (which would create circular imports). Use `TYPE_CHECKING` imports if type hints are needed.
- **Accept "close enough" translations without documentation** — if an external field maps to a non-obvious internal field, document the reasoning. "We mapped 'acct_nbr' to 'customer_ref' because the banking API uses 'nbr' for all reference identifiers" is better than no explanation.
- **Share mutable models between contexts** — even when translating between bounded contexts, each context must own its own type. A shared mutable model inevitably diverges and becomes a source of bugs as each team modifies it independently.
- **Skip ACL because the external API "seems similar"** — similarity is not identity. Even small terminology differences (e.g., one system uses "client" while yours uses "customer") create subtle confusion that compounds over time. Always apply the boundary consistently.

---

## Output Template

When implementing an Anti-Corruption Layer, produce:

1. **Boundary Module Structure** — Directory layout with adapter wrappers, mappers, and schema validators clearly separated from both domain code and infrastructure clients
2. **Translation Mappers** — One mapper class per foreign data type, with explicit field-by-field transformation logic and documented mappings
3. **Schema Validator Definitions** — JSON-like schema definitions for all external contracts that are subject to change without notice (third-party APIs, partner integrations)
4. **Wrapper Adapter Interfaces** — Abstract base classes that domain code depends on, with concrete implementations in the infrastructure layer
5. **Test Double Implementations** — Stub/mock versions of each adapter interface for deterministic unit testing of domain logic

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Tactical DDD patterns (aggregates, value objects) that ACL boundaries protect from corruption |
| `domain-modeling` | Strategic DDD analysis (bounded contexts, ubiquitous language) that defines what the ACL should translate into |
| `monolith-architecture` | Modular monolith patterns that often need ACLs when integrating with external systems in a monolithic codebase |
| `microservices-architecture` | Service decomposition patterns where ACLs serve as translation layers between newly split bounded contexts |
| `software-architecture` | Repository and Unit of Work patterns that complement ACL boundaries by decoupling persistence from domain |

---

## Further Reading

- *Domain-Driven Design* by Eric Evans (the Blue Book) — Chapter 8 on Anti-Corruption Layer, originally defined as the pattern for preventing external model corruption
- [Martin Fowler: Anti-Corruption Layer](https://martinfowler.com/bliki/AntiCorruptionLayer.html) — Clear explanation of ACL purpose and when to apply it
- *Building Microservices* by Sam Newman — Chapter on integration patterns including ACL in service-oriented architectures
- [Clean Architecture Boundaries](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — How ACLs fit into Robert C. Martin's dependency rule (source code dependencies point inward)

---

*This skill encodes the Anti-Corruption Layer as a practical implementation pattern for Python codebases, following Eric Evans' strategic DDD definition while providing concrete adapter classes, mappers, and validation patterns that production teams can adopt immediately.*
