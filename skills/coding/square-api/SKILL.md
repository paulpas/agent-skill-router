---




name: square-api
description: Implements Square API integration (Payments, Catalog, Inventory, Orders,
  Customers, Terminal) using square-sdk Python with webhook signature verification,
  idempotency keys, PCI-compliant card processing, and inventory synchronization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: square, square payments api, square catalog, square inventory, square orders, square webhooks, square terminal, how do i integrate square payments orders
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
  related-skills: coding-stripe-api, coding-paypal-api, coding-shopify-api




---




# Square API Integration

Implements production-grade Square API integration for payments, catalog management, inventory tracking, order processing, customer management, and in-person Terminal payments. When loaded, this skill makes the model implement the `square` Python SDK patterns including: Payment API with idempotency keys, Catalog API batch upserts, Inventory API real-time counts, Orders API with line items, Customers API for CRM, Webhook signature verification using HMAC-SHA256, and Square Terminal for in-person retail payments.

## TL;DR Checklist

- [ ] Use `square` SDK and `Client` class configuration
- [ ] Add `idempotency_key` (UUID v4) to ALL write operations
- [ ] Verify webhooks by comparing HMAC-SHA256 signature
- [ ] Amounts are in SMALLEST currency unit (cents for USD)
- [ ] Never log PAN data — use Square payment tokens
- [ ] Use Catalog API for products; Inventory API for stock levels
- [ ] Use Orders API for transaction records; Payments API for charges
- [ ] Environment variables: `SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`, `SQUARE_WEBHOOK_SIGNATURE_KEY`

---

## When to Use

Use this skill when:

- Building online payment processing for retail and restaurant businesses
- Managing product catalogs with categories, variations, and modifiers
- Tracking inventory counts across multiple physical locations
- Processing orders for pickup, delivery, or dine-in
- Synchronizing customer data with Square POS
- Implementing in-person payments via Square Terminal API
- Building loyalty and gift card integrations
- Reconciliation between your app and Square Dashboard
- Handling webhooks for real-time order/payment updates

---

## When NOT to Use

- For Stripe-only payment flows — use `coding-stripe-api` instead
- For PayPal/Venmo-specific checkout — use `coding-paypal-api`
- When you need a pure online-only solution without retail/POS
- For Adyen global enterprise payments — use `coding-adyen-api`
- For Shopify ecommerce platform — use `coding-shopify-api`

---

## Core Workflow

1. **Initialize Square Client** — Configure `square.Client` with `access_token` from `SQUARE_ACCESS_TOKEN`. Set `environment: "sandbox"` or `"production"`. **Checkpoint:** Call `client.locations.list()` to verify credentials and get location IDs.

2. **Manage Catalog** — Use Catalog API to create products (`ITEM`), variations (`ITEM_VARIATION`), categories (`CATEGORY`). Use `batch_upsert` for bulk operations. **Checkpoint:** Every catalog object needs a unique client-generated `idempotency_key` and temporary IDs prefixed with `#`.

3. **Create Payment** — Use Payments API with: (a) payment token from Square Web Payments SDK; (b) amount in smallest currency unit; (c) idempotency key. **Checkpoint:** Save `payment.id` (`...`) for references and refunds. Verify status is `"COMPLETED"`.

4. **Handle Webhook Signature** — Compute HMAC-SHA256 of `notification_url + request_body` using your Square webhook signature key. Compare with `x-square-hmacsha256-signature` header. **Checkpoint:** Reject any webhook with mismatched signature with 403.

5. **Create Order** — Use Orders API for tracking: location_id, line_items referencing catalog_object_id, fulfillments (pickup/delivery/dine-in). Optionally `payments` array. **Checkpoint:** Orders can be created BEFORE payment for delayed capture scenarios.

6. **Synchronize Inventory** — Use `batch_retrieve_inventory_counts` to get stock, `batch_change_inventory` for adjustments. Set `catalog_object_id` for item variations, `location_id`. **Checkpoint:** Inventory counts need `updated_at` timestamps for optimistic concurrency.

---

## Implementation Patterns

### Pattern 1: Client Initialization (BAD vs GOOD)

```python
"""Square Python SDK client initialization patterns.

Square provides an official Python SDK: pip install squareup

Environment variables required:
- SQUARE_ACCESS_TOKEN: From Square Developer Dashboard
- SQUARE_ENVIRONMENT: "sandbox" or "production"
- SQUARE_LOCATION_ID: Default location (optional, but recommended)
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded token, no retry, no error handling
# ===================================================================

def bad_init_bad() -> Any:
    """❌ BAD: Hardcoded token, no config, no error handling."""
    import square
    from square.client import Client
    
    # ❌ HARDCODED TOKEN! Never commit this!
    client = Client(
        access_token="EAAAE...real_token_here",
        environment="sandbox",
    )
    
    # ❌ No validation that client works!
    return client


# ===================================================================
# ✅ GOOD — environment-based, validation, typed access
# ===================================================================

try:
    from square.client import Client
    from square.http.auth.o_auth_2 import BearerAuthCredentials
    from square.exceptions import ApiException
    SQUARE_SDK_AVAILABLE = True
except ImportError:
    SQUARE_SDK_AVAILABLE = False


def get_square_environment() -> str:
    """Get Square environment from config.

    Returns:
        "sandbox" or "production"
    """
    env = os.environ.get("SQUARE_ENVIRONMENT", "sandbox").lower()
    if env == "production":
        return "production"
    else:
        return "sandbox"


def get_square_client() -> Any:
    """Get configured Square Client instance.

    Reads SQUARE_ACCESS_TOKEN from environment.

    Returns:
        Configured square Client.

    Raises:
        ValueError: If access token missing or invalid.
        RuntimeError: If square SDK not installed.
    """
    if not SQUARE_SDK_AVAILABLE:
        raise RuntimeError("square SDK not installed. pip install squareup")
    
    access_token = os.environ.get("SQUARE_ACCESS_TOKEN")
    if not access_token:
        raise ValueError("SQUARE_ACCESS_TOKEN not set in environment")
    
    environment = get_square_environment()
    
    client = Client(
        access_token=access_token,
        environment=environment,
        max_retries=3,  # SDK has built-in retry
    )
    
    return client


def get_default_location_id() -> str:
    """Get the default Square location ID from environment or API.

    First checks SQUARE_LOCATION_ID env, then fetches from Locations API.

    Returns:
        Location ID string.
    """
    env_location = os.environ.get("SQUARE_LOCATION_ID")
    if env_location:
        return env_location
    
    # Fetch first location from API
    client = get_square_client()
    result = client.locations.list_locations()
    
    if result.is_success():
        locations = result.body.get("locations", [])
        if locations:
            # Return first ACTIVE location
            for loc in locations:
                if loc.get("status") == "ACTIVE":
                    return loc["id"]
            return locations[0]["id"]
    
    raise ValueError("No Square locations found; set SQUARE_LOCATION_ID")


def validate_square_credentials() -> bool:
    """Validate that Square credentials work by listing locations.

    Returns:
        True if credentials valid.

    Raises:
        Exception if credentials invalid.
    """
    client = get_square_client()
    result = client.locations.list_locations()
    
    if result.is_success():
        logger.info("Square credentials validated successfully")
        return True
    
    # result.errors is list of dict
    errors = result.errors or []
    error_msgs = [e.get("detail", str(e)) for e in errors]
    raise ValueError(f"Square credentials invalid: {'; '.join(error_msgs)}")
```

### Pattern 2: Payments API (Card Processing)

```python
"""Square Payments API for online and in-app payments.

Flow:
1. Frontend uses Square Web Payments SDK to collect card
2. Frontend gets a payment token (nonce) from Square
3. Frontend sends token to YOUR backend
4. Backend calls Payments API with token + amount
5. Square charges card; returns Payment object

CRITICAL:
- Amount is in SMALLEST currency unit (cents for USD)
- Every write needs an IDEMPOTENCY KEY (UUID v4 recommended)
- Same idempotency key = same result, no duplicate charges
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Optional


def amount_to_minor_units(amount: Decimal, currency: str = "USD") -> int:
    """Convert decimal amount to smallest currency unit (cents for USD).

    Square amounts are ALWAYS integers representing minor units.
    $29.99 = 2999 cents.

    Args:
        amount: Decimal amount (e.g., Decimal("29.99")).
        currency: ISO 4217 currency code.

    Returns:
        Integer minor unit amount.
    """
    # Most currencies have 2 decimals; special cases below
    multiplier = Decimal("100")
    
    # Zero-decimal currencies (JPY, KRW, etc.)
    zero_decimal = {"JPY", "KRW", "VND", "CLP", "PYG", "UYU", "ISK"}
    if currency in zero_decimal:
        multiplier = Decimal("1")
    
    # Three-decimal currencies
    three_decimal = {"BHD", "IQD", "JOD", "KWD", "OMR", "TND"}
    if currency in three_decimal:
        multiplier = Decimal("1000")
    
    return int(amount * multiplier)


def create_payment(
    source_id: str,  # Payment token from Web Payments SDK
    amount: Decimal,
    currency: str = "USD",
    location_id: str | None = None,
    idempotency_key: str | None = None,
    customer_id: str | None = None,
    order_id: str | None = None,
    reference_id: str | None = None,
    note: str = "",
    autocomplete: bool = True,  # True = capture immediately; False = auth only
) -> dict[str, Any]:
    """Create a payment using Square Payments API.

    Args:
        source_id: Payment token from Web Payments SDK (cnon:... or card_nonce).
        amount: Decimal payment amount.
        currency: ISO 4217 currency code.
        location_id: Square location ID.
        idempotency_key: Unique key for idempotency (auto-generated UUID if None).
        customer_id: Optional Square customer ID.
        order_id: Optional Square order ID to associate.
        reference_id: Your external reference (e.g., order number).
        note: Optional note shown in Square Dashboard.
        autocomplete: True for immediate capture, False for auth-only.

    Returns:
        Dict with payment details including id, status, amount.

    Raises:
        ValueError: On validation errors.
        RuntimeError: On Square API errors.
    """
    client = get_square_client()
    actual_location = location_id or get_default_location_id()
    actual_idempotency = idempotency_key or str(uuid.uuid4())
    
    amount_minor = amount_to_minor_units(amount, currency)
    
    body: dict[str, Any] = {
        "idempotency_key": actual_idempotency,
        "amount_money": {
            "amount": amount_minor,
            "currency": currency,
        },
        "source_id": source_id,
        "location_id": actual_location,
        "autocomplete": autocomplete,
    }
    
    if customer_id:
        body["customer_id"] = customer_id
    if order_id:
        body["order_id"] = order_id
    if reference_id:
        body["reference_id"] = reference_id
    if note:
        body["note"] = note
    
    try:
        result = client.payments.create_payment(body)
    except Exception as e:
        logger.error("Square create_payment failed: %s", e)
        raise RuntimeError(f"Square payment error: {e}") from e
    
    if result.is_success():
        payment = result.body.get("payment", {})
        
        payment_id = payment.get("id")
        status = payment.get("status")
        receipt_url = payment.get("receipt_url")
        
        logger.info(
            "Square payment created: id=%s status=%s amount=%d%s",
            payment_id, status, amount_minor, currency
        )
        
        return {
            "payment_id": payment_id,
            "status": status,  # "COMPLETED", "APPROVED", "FAILED", etc.
            "amount_money": payment.get("amount_money"),
            "receipt_url": receipt_url,
            "created_at": payment.get("created_at"),
            "raw": payment,
        }
    
    errors = result.errors or []
    error_codes = [e.get("code") for e in errors]
    error_details = [e.get("detail") for e in errors]
    
    logger.warning(
        "Square payment failed: codes=%s details=%s",
        error_codes, error_details
    )
    
    # Classify errors for caller handling
    if "CARD_DECLINED" in error_codes:
        raise ValueError("Card declined")
    if "INSUFFICIENT_FUNDS" in error_codes:
        raise ValueError("Insufficient funds")
    if "EXPIRED_CARD" in error_codes:
        raise ValueError("Card expired")
    if "INVALID_EXPIRATION" in error_codes:
        raise ValueError("Invalid expiration date")
    if "INVALID_CVV" in error_codes:
        raise ValueError("Invalid CVV")
    if "TOKEN_EXPIRED" in error_codes:
        raise ValueError("Payment token expired — please retry checkout")
    
    raise RuntimeError(f"Square payment failed: {'; '.join(error_details)}")


def get_payment(payment_id: str) -> dict[str, Any]:
    """Get a payment by ID.

    Args:
        payment_id: The Square payment ID.

    Returns:
        Payment dict.
    """
    client = get_square_client()
    result = client.payments.get_payment(payment_id)
    
    if result.is_success():
        return result.body.get("payment", {})
    
    raise RuntimeError(f"Failed to get payment: {result.errors}")


def cancel_payment(payment_id: str) -> bool:
    """Cancel (void) an authorized but not yet captured payment.

    For payments created with autocomplete=False.

    Args:
        payment_id: ID of APPROVED payment.

    Returns:
        True if cancelled.
    """
    client = get_square_client()
    
    body = {
        "idempotency_key": str(uuid.uuid4()),
    }
    
    result = client.payments.cancel_payment(payment_id, body)
    
    if result.is_success():
        logger.info("Square payment cancelled: %s", payment_id)
        return True
    
    raise RuntimeError(f"Failed to cancel payment: {result.errors}")


def complete_payment(payment_id: str, version_token: str | None = None) -> dict[str, Any]:
    """Complete (capture) an authorized payment.

    For payments created with autocomplete=False.

    Args:
        payment_id: ID of APPROVED payment.
        version_token: Optional version token for optimistic concurrency.

    Returns:
        Completed payment dict.
    """
    client = get_square_client()
    
    body: dict[str, Any] = {
        "idempotency_key": str(uuid.uuid4()),
    }
    
    if version_token:
        body["version_token"] = version_token
    
    result = client.payments.complete_payment(payment_id, body)
    
    if result.is_success():
        payment = result.body.get("payment", {})
        logger.info("Square payment completed: %s", payment_id)
        return {
            "payment_id": payment.get("id"),
            "status": payment.get("status"),
            "raw": payment,
        }
    
    raise RuntimeError(f"Failed to complete payment: {result.errors}")


def refund_payment(
    payment_id: str,
    amount: Decimal,
    currency: str = "USD",
    reason: str = "",
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Refund a captured payment.

    Args:
        payment_id: Original payment ID.
        amount: Amount to refund (can be partial).
        currency: Currency code.
        reason: Reason shown in Square Dashboard.
        idempotency_key: Optional idempotency key.

    Returns:
        Refund dict.
    """
    client = get_square_client()
    
    amount_minor = amount_to_minor_units(amount, currency)
    
    body: dict[str, Any] = {
        "idempotency_key": idempotency_key or str(uuid.uuid4()),
        "payment_id": payment_id,
        "amount_money": {
            "amount": amount_minor,
            "currency": currency,
        },
    }
    
    if reason:
        body["reason"] = reason
    
    result = client.refunds.refund_payment(body)
    
    if result.is_success():
        refund = result.body.get("refund", {})
        logger.info("Square refund created: %s for payment %s", refund.get("id"), payment_id)
        return {
            "refund_id": refund.get("id"),
            "status": refund.get("status"),
            "raw": refund,
        }
    
    raise RuntimeError(f"Failed to create refund: {result.errors}")
```

### Pattern 3: Webhook Signature Verification

```python
"""Square webhook signature verification.

Square signs webhook payloads using HMAC-SHA256.

To verify:
1. Get your Signature Key from Square Dashboard → Webhooks
2. Store as SQUARE_WEBHOOK_SIGNATURE_KEY env var
3. For each webhook:
   a. Get X-Square-HMACSha256-Signature header
   b. Compute HMAC-SHA256 of (notification_url + request_body)
   c. Compare with Base64-encoded header value

CRITICAL: Use the EXACT notification URL you configured in Dashboard.
Trailing slashes matter! HTTP vs HTTPS matters!
"""

from __future__ import annotations

import os
import hmac
import hashlib
import base64
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


class SquareWebhookVerifier:
    """Verifies Square webhook HMAC-SHA256 signatures."""
    
    def __init__(
        self,
        signature_key: str | None = None,
        notification_url: str | None = None,
    ):
        self.signature_key = signature_key or os.environ.get("SQUARE_WEBHOOK_SIGNATURE_KEY", "")
        self.notification_url = notification_url or os.environ.get("SQUARE_WEBHOOK_URL", "")
        
        if not self.signature_key:
            logger.warning("SQUARE_WEBHOOK_SIGNATURE_KEY not configured")
    
    def verify(
        self,
        request_body: bytes | str,  # Raw bytes or string of request body
        signature_header: str,  # X-Square-HMACSha256-Signature header
        notification_url_override: str | None = None,
    ) -> bool:
        """Verify a Square webhook signature.

        The signature is computed as:
            HMAC-SHA256(signature_key, notification_url + request_body)
            then Base64-encoded.

        Args:
            request_body: Raw request body (NOT parsed JSON).
            signature_header: Value of X-Square-HMACSha256-Signature header.
            notification_url_override: Override configured URL if needed.

        Returns:
            True if verified.

        Raises:
            ValueError: If verification fails.
        """
        if not self.signature_key:
            raise ValueError("SQUARE_WEBHOOK_SIGNATURE_KEY not configured")
        
        url = notification_url_override or self.notification_url
        if not url:
            raise ValueError("notification_url required for verification")
        
        # Normalize body to bytes
        if isinstance(request_body, str):
            body_bytes = request_body.encode("utf-8")
        else:
            body_bytes = request_body
        
        # Compute HMAC of (URL + body)
        key_bytes = self.signature_key.encode("utf-8")
        data = url.encode("utf-8") + body_bytes
        
        computed_hmac = hmac.new(key_bytes, data, hashlib.sha256).digest()
        computed_signature = base64.b64encode(computed_hmac).decode("utf-8")
        
        # Use constant-time comparison to prevent timing attacks
        if hmac.compare_digest(computed_signature, signature_header):
            logger.info("Square webhook signature verified")
            return True
        else:
            logger.warning(
                "Square webhook signature mismatch: computed=%s received=%s",
                computed_signature, signature_header
            )
            raise ValueError("Square webhook signature verification failed")


# ===================================================================
# ❌ BAD — NO signature verification
# ===================================================================

def bad_webhook_handler_bad(request_json: dict[str, Any]) -> None:
    """❌ BAD: No signature check — accepts forged webhooks."""
    # ❌ Anyone can send you a fake "payment.created" event!
    event_type = request_json.get("type")
    if event_type == "payment.created":
        order_id = request_json["data"]["object"]["payment"]["reference_id"]
        # ❌ Marking order as PAID without verifying signature!
        fulfill_order(order_id)  # UNSAFE!


# ===================================================================
# ✅ GOOD — verify signature FIRST, then process
# ===================================================================

class SquareWebhookRouter:
    """Routes verified Square webhooks to handlers."""
    
    def __init__(self, verifier: SquareWebhookVerifier | None = None):
        self.verifier = verifier or SquareWebhookVerifier()
        self._handlers: dict[str, Callable[[dict[str, Any]], None]] = {}
    
    def on(self, event_type: str) -> Callable[[Callable], Callable]:
        """Decorator: @router.on("payment.created")"""
        def decorator(handler: Callable[[dict[str, Any]], None]) -> Callable[[dict[str, Any]], None]:
            self._handlers[event_type] = handler
            return handler
        return decorator
    
    def verify_and_dispatch(
        self,
        request_body: bytes,
        signature_header: str,
        url_override: str | None = None,
    ) -> bool:
        """Verify signature and dispatch to handler.

        Args:
            request_body: Raw request body bytes.
            signature_header: X-Square-HMACSha256-Signature header.
            url_override: Optional URL override.

        Returns:
            True if handler found and called.
        """
        # Step 1: VERIFY signature FIRST
        self.verifier.verify(request_body, signature_header, url_override)
        
        # Step 2: Only THEN parse and process
        import json
        event = json.loads(request_body.decode("utf-8"))
        
        event_type = event.get("type")
        handler = self._handlers.get(event_type)
        
        if handler:
            try:
                handler(event)
                return True
            except Exception:
                logger.exception("Handler failed for Square webhook type %s", event_type)
                raise
        return False


# Initialize router
square_webhook_router = SquareWebhookRouter()


@square_webhook_router.on("payment.created")
def on_payment_created(event: dict[str, Any]) -> None:
    """Handle payment.created webhook.

    This fires when a payment is created.
    Note: May also want payment.updated for status changes.

    Event structure:
        type: "payment.created"
        event_id: "..."
        data: {
            "type": "payment",
            "id": "..."
            "object": {
                "id": "...",
                "status": "COMPLETED",
                "amount_money": {...},
                "reference_id": "your_order_123"
            }
        }
    """
    data_obj = event.get("data", {})
    payment = data_obj.get("object", {})
    
    payment_id = payment.get("id")
    status = payment.get("status")
    reference_id = payment.get("reference_id")  # Your external ID!
    amount_money = payment.get("amount_money", {})
    
    logger.info(
        "Square payment webhook: id=%s status=%s ref=%s amount=%s",
        payment_id, status, reference_id, amount_money
    )
    
    if status == "COMPLETED":
        # ✅ Mark order as PAID using reference_id
        # Store payment_id for future refunds
        pass


@square_webhook_router.on("order.created")
def on_order_created(event: dict[str, Any]) -> None:
    """Handle order.created webhook."""
    data_obj = event.get("data", {})
    order = data_obj.get("object", {})
    logger.info("Square order created: %s", order.get("id"))


@square_webhook_router.on("inventory.count.updated")
def on_inventory_updated(event: dict[str, Any]) -> None:
    """Handle inventory change webhook."""
    logger.info("Square inventory updated event")


@square_webhook_router.on("booking.created")
def on_booking_created(event: dict[str, Any]) -> None:
    """Handle booking/appointment created (for appointments)."""
    logger.info("Square booking created")
```

### Pattern 4: Catalog and Inventory Management

```python
"""Square Catalog and Inventory APIs for product and stock management.

Catalog API manages:
- ITEM: Products
- ITEM_VARIATION: Variations (size, color, SKU, price)
- CATEGORY: Product categories
- MODIFIER: Add-ons/options
- TAX: Tax rules

Inventory API manages:
- Stock counts per location per variation
- Physical count adjustments
- Transfers between locations

CRUCIAL: Square uses temporary IDs for batch operations, prefixed with '#'
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Optional


def batch_upsert_catalog(
    objects: list[dict[str, Any]],
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Create or update multiple catalog objects in a single call.

    This is the main way to work with Square catalog.

    For NEW objects, use temporary IDs with '#' prefix: "#temp-1", "#new-shirt"
    These get mapped to real Square IDs in the response.

    For UPDATES, use existing catalog object IDs (no # prefix).

    Args:
        objects: List of catalog objects with id, type, present_at_all_locations.
        idempotency_key: Optional idempotency key.

    Returns:
        Dict with mapping from temp ID to real catalog object ID.
    """
    client = get_square_client()
    
    body: dict[str, Any] = {
        "idempotency_key": idempotency_key or str(uuid.uuid4()),
        "batches": [{
            "objects": objects
        }]
    }
    
    result = client.catalog.batch_upsert_catalog_objects(body)
    
    if result.is_success():
        body_result = result.body
        created_at = body_result.get("created_at")
        mappings = body_result.get("id_mappings", [])  # temp ID → real ID
        
        id_map = {m["client_object_id"]: m["object_id"] for m in mappings}
        
        logger.info(
            "Square catalog batch_upsert: created_at=%s, mappings=%s",
            created_at, id_map
        )
        
        return {
            "created_at": created_at,
            "id_map": id_map,
            "raw": body_result,
        }
    
    raise RuntimeError(f"Catalog batch_upsert failed: {result.errors}")


def build_catalog_item_with_variation(
    name: str,
    variation_name: str,
    price: Decimal,
    currency: str = "USD",
    category_id: str | None = None,
    description: str = "",
    sku: str = "",
    temp_id_prefix: str = "",
) -> list[dict[str, Any]]:
    """Build catalog objects for a simple item with one variation.

    Simple products need:
    - 1 ITEM object
    - 1 or more ITEM_VARIATION objects

    Args:
        name: Product name.
        variation_name: Variation name (e.g., "Regular", "Large").
        price: Price as Decimal.
        currency: Currency code.
        category_id: Optional category ID (real or temp ID).
        description: Product description.
        sku: Optional SKU for variation.
        temp_id_prefix: Prefix for temporary IDs (e.g., "shirt-blue-").

    Returns:
        List of catalog objects ready for batch_upsert.
    """
    prefix = temp_id_prefix or str(uuid.uuid4())[:8]
    
    item_temp_id = f"#item-{prefix}"
    var_temp_id = f"#var-{prefix}"
    
    price_minor = amount_to_minor_units(price, currency)
    
    objects: list[dict[str, Any]] = []
    
    # ITEM object
    item: dict[str, Any] = {
        "id": item_temp_id,
        "type": "ITEM",
        "present_at_all_locations": True,
        "item_data": {
            "name": name,
            "description": description,
            "variations": [],  # Filled below
        }
    }
    
    if category_id:
        item["item_data"]["category_id"] = category_id
    
    # ITEM_VARIATION nested inside ITEM
    variation = {
        "id": var_temp_id,
        "type": "ITEM_VARIATION",
        "present_at_all_locations": True,
        "item_variation_data": {
            "name": variation_name,
            "pricing_type": "FIXED_PRICING",
            "price_money": {
                "amount": price_minor,
                "currency": currency,
            },
            "track_inventory": True,
        }
    }
    
    if sku:
        variation["item_variation_data"]["sku"] = sku
    
    item["item_data"]["variations"] = [variation]
    objects.append(item)
    
    return objects


def get_inventory_counts(
    catalog_object_ids: list[str] | None = None,
    location_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Get current inventory counts for item variations.

    Args:
        catalog_object_ids: Optional list of variation IDs to filter.
        location_ids: Optional list of location IDs to filter.

    Returns:
        List of inventory count objects.
    """
    client = get_square_client()
    
    body: dict[str, Any] = {}
    
    if catalog_object_ids:
        body["catalog_object_ids"] = catalog_object_ids
    if location_ids:
        body["location_ids"] = location_ids
    
    result = client.inventory.batch_retrieve_inventory_counts(body)
    
    if result.is_success():
        counts = result.body.get("counts", [])
        return [
            {
                "catalog_object_id": c.get("catalog_object_id"),
                "location_id": c.get("location_id"),
                "quantity": c.get("quantity"),
                "calculated_at": c.get("calculated_at"),
                "state": c.get("state"),  # IN_STOCK, SOLD, etc.
            }
            for c in counts
        ]
    
    raise RuntimeError(f"Inventory retrieve failed: {result.errors}")


def adjust_inventory_quantity(
    catalog_object_id: str,
    location_id: str,
    adjustment_type: str,  # RECEIVE_ADJUSTMENT, MANUAL_ADJUSTMENT, etc.
    quantity_change: int,  # Positive for add, negative for subtract
    reason: str = "",
    idempotency_key: str | None = None,
) -> bool:
    """Adjust inventory quantity for a variation at a location.

    Args:
        catalog_object_id: Item variation ID.
        location_id: Square location ID.
        adjustment_type: One of:
            RECEIVE_ADJUSTMENT — receiving stock
            MANUAL_ADJUSTMENT — manual count correction
            SOLD_ADJUSTMENT — sale (auto by Square)
            UNLINKED_RETURN — return
            WASTE_ADJUSTMENT — spoilage/waste
        quantity_change: Amount to adjust (positive adds, negative subtracts).
        reason: Reason for audit trail.
        idempotency_key: Optional idempotency key.

    Returns:
        True on success.
    """
    client = get_square_client()
    
    body: dict[str, Any] = {
        "idempotency_key": idempotency_key or str(uuid.uuid4()),
        "changes": [{
            "type": "ADJUSTMENT",
            "adjustment": {
                "catalog_object_id": catalog_object_id,
                "location_id": location_id,
                "from_state": "IN_STOCK",
                "to_state": "IN_STOCK",  # stays same for quantity-only adjust
                "quantity": str(quantity_change),  # Square wants quantity as string!
                "adjustment_type": adjustment_type,
            }
        }]
    }
    
    if reason:
        body["changes"][0]["adjustment"]["reason"] = reason
    
    result = client.inventory.batch_change_inventory(body)
    
    if result.is_success():
        logger.info(
            "Square inventory adjusted: var=%s loc=%s change=%d",
            catalog_object_id, location_id, quantity_change
        )
        return True
    
    raise RuntimeError(f"Inventory adjustment failed: {result.errors}")
```

---

## Constraints

### MUST DO

- Use `square` Python SDK (`squareup` on PyPI)
- Add UUID v4 `idempotency_key` to ALL write operations
- Represent amounts in SMALLEST currency unit (integers, not decimals)
- Verify webhooks via HMAC-SHA256 of `notification_url + request_body`
- Use Catalog API for products; Inventory API for stock counts
- Store `payment.id` and reference your external ID in `reference_id`
- Use `location_id` from Locations API or environment
- Separate auth-only (`autocomplete=False`) from immediate capture
- Use constant-time comparison for HMAC signatures (`hmac.compare_digest`)

### MUST NOT DO

- NEVER hardcode `access_token` in source code
- NEVER process webhooks without verifying HMAC signature
- NEVER use real PAN data; always use payment tokens from Web Payments SDK
- NEVER send amount as Decimal — always convert to integer minor units
- NEVER reuse idempotency keys across different operations
- NEVER forget that notification URL must EXACTLY match Dashboard config
- NEVER batch_upsert without '#' prefix on temporary object IDs
- NEVER ignore `id_mappings` response (temp → real ID mapping)

---

## Output Template

When implementing Square integrations, produce:

1. **Client Factory** — Environment-configured Square Client with location lookup
2. **Payment Flow** — Idempotent payment creation with amount conversion
3. **Webhook Handler** — HMAC-SHA256 verification + router for key events
4. **Catalog Management** — `batch_upsert` pattern with temp ID → real ID mapping
5. **Inventory Sync** — Retrieve counts and make adjustments with change types
6. **Amount Conversion** — Decimal to minor-unit integer function per currency

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-stripe-api` | Stripe for online-first payments alternative |
| `coding-paypal-api` | PayPal for Venmo and PayPal Checkout |
| `coding-shopify-api` | Shopify for ecommerce platform with Square POS sync |
| `coding-braintree-api` | Braintree for marketplace payments |
| `coding-adyen-api` | Adyen for global enterprise payments |

---

## Live References

| Resource | URL |
|----------|-----|
| Square Python SDK | https://github.com/square/square-python-sdk |
| Square API Reference | https://developer.squareup.com/reference/square |
| Payments API | https://developer.squareup.com/reference/square/payments-api |
| Orders API | https://developer.squareup.com/reference/square/orders-api |
| Catalog API | https://developer.squareup.com/reference/square/catalog-api |
| Inventory API | https://developer.squareup.com/reference/square/inventory-api |
| Webhook Signatures | https://developer.squareup.com/docs/webhooks/step3validate |
| Web Payments SDK | https://developer.squareup.com/docs/web-payments/overview |
| Terminal API | https://developer.squareup.com/docs/terminal-api/overview |
