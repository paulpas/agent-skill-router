---
name: paypal-api
description: Implements PayPal API integration (Orders, Payments, Subscriptions, Payouts,
  Disputes) using paypal-checkout-serversdk or paypalrestsdk with webhook verification,
  payment capture, and subscription lifecycle management.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: paypal, paypal orders api, paypal subscriptions, paypal payouts, paypal
    webhook verification, capture payment, how do i integrate paypal payments, paypal
    checkout
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
  related-skills: coding-stripe-api, coding-braintree-api, coding-square-api
---
# PayPal API Integration

Implements production-grade PayPal API integration using the official PayPal Python SDKs. When loaded, this skill makes the model implement Orders v2 API for one-time payments, Subscriptions API for recurring billing, Payouts API for mass payments, and webhook handling with signature verification. All implementations follow PayPal security best practices: verify webhook signatures, capture authorized payments before fulfillment, handle payment status transitions, and never expose client secrets to frontend code.

## TL;DR Checklist

- [ ] Use Orders v2 API (NOT v1 deprecated)
- [ ] Create order with `intent: "CAPTURE"` or `intent: "AUTHORIZE"`
- [ ] Capture authorized payments BEFORE fulfilling orders
- [ ] Verify webhooks using `verify_webhook_signature`
- [ ] Use `PayPalHttpClient` from checkout SDK (not requests directly)
- [ ] Store `order_id` (`...`) and `capture_id` for tracking
- [ ] Handle `APPROVED` → `COMPLETED` status transitions
- [ ] NEVER hardcode client_id and client_secret in source

---

## When to Use

Use this skill when:

- Building one-time checkout flows with PayPal Smart Payment Buttons
- Implementing subscription billing with automatic recurring payments
- Sending mass payouts via Payouts API
- Handling disputes and chargebacks via Disputes API
- Processing refunds on captured payments
- Verifying payment webhooks for order fulfillment
- Integrating PayPal with Venmo and other PayPal-owned methods

---

## When NOT to Use

- For Stripe-specific flows — use `coding-stripe-api` instead
- When you need a unified payment orchestrator across many gateways
- For Square retail/in-person payments — use `coding-square-api`
- For Adyen global enterprise payments — use `coding-adyen-api`

---

## Core Workflow

1. **Initialize PayPal Client** — Create a `PayPalHttpClient` configured from `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` environment variables. Set `sandbox` mode for development, `live` for production. **Checkpoint:** Get an access token via `/v1/oauth2/token` to verify credentials work.

2. **Create Order** — Use Orders v2 API with `intent: "CAPTURE"` for immediate capture or `intent: "AUTHORIZE"` for delayed capture. Include purchase_units with amount, reference_id, and custom_id for your internal order tracking. **Checkpoint:** Return the `order_id` and `approve` link to frontend for PayPal login/approval flow.

3. **Handle Approval Callback** — After customer approves in PayPal, frontend returns `order_id` to your backend. Call `orders.capture()` with that ID. Verify the response shows `status: "COMPLETED"` and `capture.status: "COMPLETED"`. **Checkpoint:** The `capture_id` is what you use for refunds later — store it.

4. **Verify Webhook Signature** — Create endpoint that receives PayPal webhooks. Extract `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-TIME`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-CERT-URL` headers. Call verify endpoint or SDK method with webhook_id and these headers. **Checkpoint:** Only process webhook after verification succeeds.

5. **Fulfill Order After Capture** — Update your database ONLY when: (a) `orders.capture()` returns `COMPLETED`, OR (b) verified webhook event `PAYMENT.CAPTURE.COMPLETED` arrives. **Checkpoint:** Never trust frontend success alone — ALWAYS verify at backend.

---

## Implementation Patterns

### Pattern 1: PayPal Client Initialization (BAD vs GOOD)

```python
"""PayPal SDK initialization patterns.

Two SDK options:
1. paypalcheckoutsdk (recommended for Orders v2)
2. paypalrestsdk (older, used for some v1 APIs)

Always use environment variables for credentials.
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded credentials, manual requests
# ===================================================================

import json
import requests
import base64

PAYPAL_CLIENT_ID = "Ac9...real_key_here"  # ❌ HARDCODED!
PAYPAL_CLIENT_SECRET = "EFn...secret_here"  # ❌ HARDCODED!
PAYPAL_BASE = "https://api-m.sandbox.paypal.com"

def bad_get_access_token_bad() -> str:
    """❌ BAD: Hardcoded keys, manual HTTP, no error handling."""
    auth = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode()).decode()
    response = requests.post(
        f"{PAYPAL_BASE}/v1/oauth2/token",
        headers={"Authorization": f"Basic {auth}"},
        data={"grant_type": "client_credentials"},
    )
    return response.json()["access_token"]  # ❌ No error checking!


# ===================================================================
# ✅ GOOD — Environment-based, SDK pattern, typed error handling
# ===================================================================

try:
    # Modern: paypal-checkout-serversdk (for Orders v2)
    from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
    from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest, OrdersGetRequest
    from paypalcheckoutsdk.payments import CapturesRefundRequest
    CHECKOUT_SDK_AVAILABLE = True
except ImportError:
    CHECKOUT_SDK_AVAILABLE = False

try:
    # Legacy: paypalrestsdk (for Subscriptions, Billing Plans)
    import paypalrestsdk
    REST_SDK_AVAILABLE = True
except ImportError:
    REST_SDK_AVAILABLE = False


def get_paypal_environment() -> Any:
    """Get PayPal environment from configuration.

    Reads:
        PAYPAL_CLIENT_ID
        PAYPAL_CLIENT_SECRET
        PAYPAL_MODE: "sandbox" or "live"

    Returns:
        SandboxEnvironment or LiveEnvironment instance.
    """
    client_id = os.environ.get("PAYPAL_CLIENT_ID")
    client_secret = os.environ.get("PAYPAL_CLIENT_SECRET")
    mode = os.environ.get("PAYPAL_MODE", "sandbox").lower()

    if not client_id or not client_secret:
        raise ValueError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET required")

    if mode == "live":
        return LiveEnvironment(client_id=client_id, client_secret=client_secret)
    else:
        return SandboxEnvironment(client_id=client_id, client_secret=client_secret)


def get_paypal_client() -> PayPalHttpClient:
    """Get configured PayPalHttpClient instance.

    Returns:
        Configured HTTP client for PayPal API calls.
    """
    if not CHECKOUT_SDK_AVAILABLE:
        raise RuntimeError("paypalcheckoutsdk not installed. pip install paypal-checkout-serversdk")
    
    return PayPalHttpClient(get_paypal_environment())


# Configure legacy paypalrestsdk if available
def configure_paypal_rest_sdk() -> None:
    """Configure the older paypalrestsdk (for Subscriptions API)."""
    if not REST_SDK_AVAILABLE:
        logger.warning("paypalrestsdk not available")
        return
    
    mode = os.environ.get("PAYPAL_MODE", "sandbox")
    paypalrestsdk.configure({
        "mode": mode,
        "client_id": os.environ.get("PAYPAL_CLIENT_ID"),
        "client_secret": os.environ.get("PAYPAL_CLIENT_SECRET"),
    })
```

### Pattern 2: Create and Capture Order (Orders v2 API)

```python
"""Orders v2 API is the modern way to process PayPal payments.

Flow:
1. Backend: Create order → returns order.id, approve link
2. Frontend: Redirect to PayPal or use Smart Buttons
3. User: Logs into PayPal, approves payment
4. Frontend: Returns to your site with order_id
5. Backend: CAPTURE the order → COMPLETED
6. Backend: Fulfill order

CRITICAL: Step 5 (CAPTURE) is REQUIRED before fulfillment!
"""

from __future__ import annotations

import uuid
from typing import Any, Optional
from decimal import Decimal


def create_order(
    amount: Decimal,
    currency: str = "USD",
    reference_id: str | None = None,
    custom_id: str | None = None,
    description: str = "",
    return_url: str = "",
    cancel_url: str = "",
) -> tuple[str, str]:
    """Create a PayPal order for one-time payment.

    Uses Orders v2 API with intent: CAPTURE.

    Args:
        amount: Payment amount (will be converted to 2 decimal places).
        currency: ISO 4217 currency code (USD, EUR, GBP, etc.).
        reference_id: Your internal reference (e.g., order number).
        custom_id: Your internal tracking ID (appears in webhooks).
        description: Item description shown to customer.
        return_url: URL after successful approval (for redirect flow).
        cancel_url: URL if customer cancels.

    Returns:
        Tuple of (order_id, approve_url)
        order_id: Pass to capture() after approval
        approve_url: Redirect user here or use with Smart Buttons

    Example:
        order_id, approve_url = create_order(
            amount=Decimal("99.99"),
            currency="USD",
            custom_id="order_12345",
            return_url="https://example.com/payment-success",
            cancel_url="https://example.com/payment-cancelled",
        )
    """
    client = get_paypal_client()
    
    request = OrdersCreateRequest()
    request.prefer("return=representation")
    
    amount_str = f"{amount:.2f}"
    
    request.request_body({
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference_id or "default",
            "custom_id": custom_id,
            "description": description,
            "amount": {
                "currency_code": currency,
                "value": amount_str,
            }
        }],
        "application_context": {
            "return_url": return_url,
            "cancel_url": cancel_url,
            "shipping_preference": "NO_SHIPPING",  # or SET_PROVIDED_ADDRESS, GET_FROM_FILE
            "user_action": "PAY_NOW",
        }
    })
    
    response = client.execute(request)
    order = response.result
    
    order_id = order.id
    
    # Find the approve link
    approve_url = ""
    for link in order.links:
        if link.rel == "approve":
            approve_url = link.href
            break
    
    logger.info("Created PayPal order: %s", order_id)
    return order_id, approve_url


def get_order_details(order_id: str) -> Any:
    """Get order details to check its current status.

    Useful to verify status before capture, or to get more details.

    Status values:
    - CREATED: Order created, not approved yet
    - SAVED: Order saved but not yet approved
    - APPROVED: Customer approved — READY TO CAPTURE!
    - VOIDED: Order voided/cancelled
    - COMPLETED: Order captured and payment complete

    Args:
        order_id: The PayPal order ID (from create_order)

    Returns:
        Order object from SDK.
    """
    client = get_paypal_client()
    request = OrdersGetRequest(order_id)
    response = client.execute(request)
    return response.result


def capture_order(order_id: str, amount: Decimal | None = None) -> dict[str, Any]:
    """Capture an APPROVED PayPal order.

    THIS IS THE CRITICAL STEP!
    After customer approves in PayPal, you MUST call capture()
    to actually get the money. "Approved" doesn't mean "Paid".

    Args:
        order_id: The approved order ID.
        amount: Optional amount (for partial captures).

    Returns:
        Dict with capture details: capture_id, status, amount, etc.

    Raises:
        RuntimeError: If capture fails or status is not COMPLETED.
    """
    client = get_paypal_client()
    
    request = OrdersCaptureRequest(order_id)
    
    if amount:
        request.request_body({
            "amount": {
                "currency_code": "USD",
                "value": f"{amount:.2f}",
            }
        })
    
    try:
        response = client.execute(request)
    except Exception as e:
        logger.error("PayPal capture failed for order %s: %s", order_id, e)
        raise RuntimeError(f"PayPal capture failed: {e}") from e
    
    capture = response.result
    
    # Find the capture in purchase_units[0].payments.captures[0]
    capture_id = None
    capture_status = capture.status
    
    if hasattr(capture, "purchase_units") and capture.purchase_units:
        pu = capture.purchase_units[0]
        if hasattr(pu, "payments") and hasattr(pu.payments, "captures"):
            cap_list = pu.payments.captures
            if cap_list:
                capture_id = cap_list[0].id
                capture_status = cap_list[0].status
    
    if capture_status != "COMPLETED":
        logger.warning(
            "PayPal capture status is not COMPLETED: order=%s status=%s",
            order_id, capture_status
        )
        raise RuntimeError(f"PayPal capture incomplete: status={capture_status}")
    
    result = {
        "order_id": order_id,
        "capture_id": capture_id,
        "status": capture_status,
        "raw": capture,  # Full SDK object
    }
    
    logger.info("Captured PayPal order: %s capture=%s", order_id, capture_id)
    return result


def refund_capture(
    capture_id: str,
    amount: Decimal | None = None,
    currency: str = "USD",
    note: str = "",
) -> dict[str, Any]:
    """Refund a captured payment.

    Args:
        capture_id: The capture ID from capture_order()
        amount: Optional amount for partial refund; full refund if None.
        currency: Currency code.
        note: Reason for refund (shown to customer).

    Returns:
        Dict with refund_id and status.
    """
    client = get_paypal_client()
    
    request = CapturesRefundRequest(capture_id)
    
    if amount:
        request.request_body({
            "amount": {
                "currency_code": currency,
                "value": f"{amount:.2f}",
            },
            "note_to_payer": note,
        })
    
    response = client.execute(request)
    refund = response.result
    
    return {
        "refund_id": refund.id,
        "status": refund.status,
        "amount": getattr(refund, "amount", None),
    }
```

### Pattern 3: Webhook Verification (CRITICAL for PayPal)

```python
"""PayPal webhook verification.

PayPal webhooks are how you get notified of:
- PAYMENT.CAPTURE.COMPLETED — payment completed (most important!)
- PAYMENT.CAPTURE.DENIED — capture denied
- PAYMENT.CAPTURE.REFUNDED — refund issued
- BILLING.SUBSCRIPTION.CREATED — subscription started
- BILLING.SUBSCRIPTION.ACTIVATED — subscription activated
- BILLING.SUBSCRIPTION.CANCELLED — subscription cancelled

NEVER trust webhooks without VERIFYING the signature.
PayPal provides verify endpoint, but you can also use SDK.

To get your WEBHOOK_ID:
1. Go to PayPal Dashboard → My Apps & Credentials
2. Select your app → Sandbox or Live
3. Scroll to WEBHOOKS section
4. Add webhook → get webhook_id from the list

Each webhook endpoint has its own webhook_id.
"""

from __future__ import annotations

import os
import hmac
import hashlib
import base64
import logging
import requests
from typing import Any, Callable

logger = logging.getLogger(__name__)

# Get this from PayPal Dashboard → Webhooks list
WEBHOOK_ID = os.environ.get("PAYPAL_WEBHOOK_ID", "")


class PayPalWebhookVerifier:
    """Verifies PayPal webhook signatures.

    There are two approaches:
    1. Hit PayPal's /v1/notifications/verify-webhook-signature (reliable, slow)
    2. Verify locally using HMAC (faster, but needs cert URL validation)

    This implementation uses #1 for reliability.
    """
    
    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        mode: str = "sandbox",
        webhook_id: str | None = None,
    ):
        self.client_id = client_id or os.environ.get("PAYPAL_CLIENT_ID", "")
        self.client_secret = client_secret or os.environ.get("PAYPAL_CLIENT_SECRET", "")
        self.mode = mode.lower()
        self.webhook_id = webhook_id or WEBHOOK_ID
        
        if self.mode == "live":
            self.base_url = "https://api-m.paypal.com"
        else:
            self.base_url = "https://api-m.sandbox.paypal.com"
        
        self._access_token: str | None = None
        self._token_expiry: float = 0
    
    def _get_access_token(self) -> str:
        """Get OAuth2 access token for PayPal API."""
        import time
        
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token
        
        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        response = requests.post(
            f"{self.base_url}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=30,
        )
        
        if response.status_code != 200:
            raise RuntimeError(f"Failed to get PayPal token: {response.text}")
        
        data = response.json()
        self._access_token = data["access_token"]
        self._token_expiry = time.time() + data.get("expires_in", 3200)
        
        return self._access_token
    
    def verify_webhook(
        self,
        payload: str,  # Raw JSON string of request body
        transmission_id: str,
        transmission_time: str,
        transmission_sig: str,
        cert_url: str,
        webhook_id: str | None = None,
    ) -> bool:
        """Verify PayPal webhook signature.

        Args:
            payload: Raw request body as JSON string (NOT parsed dict)
            transmission_id: PAYPAL-TRANSMISSION-ID header
            transmission_time: PAYPAL-TRANSMISSION-TIME header
            transmission_sig: PAYPAL-TRANSMISSION-SIG header
            cert_url: PAYPAL-CERT-URL header
            webhook_id: Your webhook ID from PayPal Dashboard (required)

        Returns:
            True if verification succeeds.

        Raises:
            ValueError: If verification fails or returns FAILURE.
        """
        actual_webhook_id = webhook_id or self.webhook_id
        if not actual_webhook_id:
            raise ValueError("PayPal webhook_id required for verification")
        
        # Basic cert URL sanity check — must be paypal.com
        if not cert_url.startswith("https://") or ".paypal.com/" not in cert_url:
            logger.warning("Suspicious cert_url: %s", cert_url)
            raise ValueError(f"Invalid cert_url (not paypal.com)")
        
        access_token = self._get_access_token()
        
        verify_body = {
            "transmission_id": transmission_id,
            "transmission_time": transmission_time,
            "cert_url": cert_url,
            "auth_algo": "SHA256withRSA",
            "transmission_sig": transmission_sig,
            "webhook_id": actual_webhook_id,
            "webhook_event": payload,  # Raw JSON string
        }
        
        response = requests.post(
            f"{self.base_url}/v1/notifications/verify-webhook-signature",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=verify_body,
            timeout=30,
        )
        
        if response.status_code != 200:
            logger.warning("PayPal webhook verify call failed: %d %s", response.status_code, response.text)
            raise ValueError(f"Webhook verify request failed: {response.status_code}")
        
        result = response.json()
        verification_status = result.get("verification_status")
        
        if verification_status == "SUCCESS":
            logger.info("PayPal webhook verified successfully")
            return True
        else:
            logger.warning("PayPal webhook verification FAILED: %s", result)
            raise ValueError(f"Webhook verification returned: {verification_status}")


class PayPalWebhookRouter:
    """Routes verified webhook events to handlers."""
    
    def __init__(self) -> None:
        self._handlers: dict[str, Callable[[Any], None]] = {}
    
    def on(self, event_type: str) -> Callable[[Callable], Callable]:
        """Decorator: @router.on("PAYMENT.CAPTURE.COMPLETED")"""
        def decorator(handler: Callable[[Any], None]) -> Callable[[Any], None]:
            self._handlers[event_type] = handler
            return handler
        return decorator
    
    def dispatch(self, event_dict: dict[str, Any]) -> bool:
        """Dispatch a verified webhook event."""
        event_type = event_dict.get("event_type")
        handler = self._handlers.get(event_type)
        
        if handler:
            try:
                handler(event_dict)
                return True
            except Exception:
                logger.exception("Handler failed for event type %s", event_type)
                raise
        return False


# Initialize router
paypal_webhook_router = PayPalWebhookRouter()


@paypal_webhook_router.on("PAYMENT.CAPTURE.COMPLETED")
def on_capture_completed(event: dict[str, Any]) -> None:
    """Handle successful payment capture.

    This is the MOST RELIABLE way to know payment went through.

    Event structure:
        event_type: "PAYMENT.CAPTURE.COMPLETED"
        resource: {
            "id": "5...",  # capture_id
            "amount": {"value": "99.99", "currency_code": "USD"},
            "custom_id": "your_order_123",  # if passed in create_order
            "status": "COMPLETED"
        }
    """
    resource = event.get("resource", {})
    capture_id = resource.get("id")
    custom_id = resource.get("custom_id")  # This is YOUR order ID!
    amount = resource.get("amount", {})
    
    logger.info(
        "PayPal capture completed: capture=%s custom_id=%s amount=%s %s",
        capture_id, custom_id, amount.get("value"), amount.get("currency_code")
    )
    
    # ✅ This is where you:
    # 1. Mark order as PAID using custom_id reference
    # 2. Send receipt email
    # 3. Fulfill the order


@paypal_webhook_router.on("BILLING.SUBSCRIPTION.ACTIVATED")
def on_subscription_activated(event: dict[str, Any]) -> None:
    """Handle subscription activation."""
    resource = event.get("resource", {})
    subscription_id = resource.get("id")
    logger.info("PayPal subscription activated: %s", subscription_id)


@paypal_webhook_router.on("BILLING.SUBSCRIPTION.CANCELLED")
def on_subscription_cancelled(event: dict[str, Any]) -> None:
    """Handle subscription cancellation."""
    resource = event.get("resource", {})
    subscription_id = resource.get("id")
    logger.info("PayPal subscription cancelled: %s", subscription_id)
```

### Pattern 4: Subscriptions (Legacy Billing Plans)

```python
"""PayPal Subscriptions using Billing Plans and Agreements.

Note: PayPal has both:
1. Old Billing Plans (v1) — used with paypalrestsdk
2. New Subscriptions API (v2) — Check REST API docs

This uses the older paypalrestsdk which is common in codebases.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def create_billing_plan(
    name: str,
    description: str,
    amount: Decimal,
    currency: str = "USD",
    interval: str = "month",  # day, week, month, year
    interval_count: int = 1,
    setup_fee: Decimal | None = None,
) -> Any:
    """Create a recurring billing plan.

    Args:
        name: Plan name shown to customers.
        description: Plan description.
        amount: Recurring amount.
        currency: ISO currency code.
        interval: Billing cycle interval (day/week/month/year).
        interval_count: Number of intervals per cycle (1 = monthly).
        setup_fee: Optional one-time setup fee.

    Returns:
        Created billing plan object (after activation).
    """
    configure_paypal_rest_sdk()
    if not REST_SDK_AVAILABLE:
        raise RuntimeError("paypalrestsdk not installed")
    
    billing_definitions = [{
        "name": "Regular payment",
        "type": "REGULAR",
        "frequency": {
            "interval_unit": interval.upper(),
            "interval_count": interval_count,
        },
        "amount": {
            "value": f"{amount:.2f}",
            "currency": currency,
        },
        "cycles": 0,  # 0 = infinite until cancelled
    }]
    
    if setup_fee:
        # Add one-time setup charge
        billing_definitions.insert(0, {
            "name": "Setup fee",
            "type": "TRIAL",
            "frequency": {
                "interval_unit": "DAY",
                "interval_count": 1,
            },
            "amount": {
                "value": f"{setup_fee:.2f}",
                "currency": currency,
            },
            "cycles": 1,
        })
    
    plan = paypalrestsdk.BillingPlan({
        "name": name,
        "description": description,
        "type": "INFINITE",  # or FIXED
        "payment_definitions": billing_definitions,
        "merchant_preferences": {
            "setup_fee": {
                "value": "0",
                "currency": currency,
            },
            "return_url": "http://example.com/subscribe/success",
            "cancel_url": "http://example.com/subscribe/cancel",
            "auto_bill_amount": "YES",
            "initial_fail_amount_action": "CONTINUE",
            "max_fail_attempts": 3,
        }
    })
    
    if plan.create():
        # Must ACTIVATE the plan after creating
        if plan.activate():
            logger.info("Created and activated billing plan: %s", plan.id)
            return plan
        else:
            raise RuntimeError(f"Failed to activate plan: {plan.error}")
    else:
        raise RuntimeError(f"Failed to create plan: {plan.error}")


def create_subscription_agreement(
    plan_id: str,
    name: str,
    description: str,
    start_date: str,  # ISO format with timezone: "2025-01-01T00:00:00Z"
    custom_id: str | None = None,
) -> tuple[str, str]:
    """Create a billing agreement (subscription) for a customer.

    Args:
        plan_id: The billing plan ID.
        name: Agreement name.
        description: Description.
        start_date: When the subscription should start (future date recommended).
        custom_id: Your internal reference for this subscription.

    Returns:
        Tuple of (agreement_id, approve_url)
    """
    configure_paypal_rest_sdk()
    if not REST_SDK_AVAILABLE:
        raise RuntimeError("paypalrestsdk not installed")
    
    agreement = paypalrestsdk.BillingAgreement({
        "name": name,
        "description": description,
        "start_date": start_date,
        "plan": {"id": plan_id},
        "payer": {"payment_method": "paypal"},
        "override_merchant_preferences": {
            "return_url": "http://example.com/subscribe/confirmed",
            "cancel_url": "http://example.com/subscribe/cancelled",
        },
    })
    
    if agreement.create():
        approve_url = ""
        for link in agreement.links:
            if link.rel == "approval_url":
                approve_url = link.href
                break
        
        logger.info("Created subscription agreement: %s", agreement.id)
        return agreement.id, approve_url
    else:
        raise RuntimeError(f"Failed to create agreement: {agreement.error}")


def execute_subscription_agreement(token: str) -> Any:
    """Execute agreement after customer approval.

    After customer approves via the approve_url, PayPal redirects
    back with a token parameter in the URL. Use that token here.

    Args:
        token: The token parameter from the redirect URL.

    Returns:
        Executed agreement object.
    """
    configure_paypal_rest_sdk()
    if not REST_SDK_AVAILABLE:
        raise RuntimeError("paypalrestsdk not installed")
    
    agreement = paypalrestsdk.BillingAgreement.execute(token)
    logger.info("Executed subscription agreement: %s", agreement.id)
    return agreement
```

---

## Constraints

### MUST DO

- Use Orders v2 API (not deprecated v1)
- Always CAPTURE approved orders before fulfillment
- Verify webhook signatures using PayPal's verify endpoint before processing
- Read `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` from environment
- Store both `order_id` and `capture_id` for tracking and refunds
- Handle idempotency when processing webhooks (same event can arrive multiple times)
- Use `intent: "CAPTURE"` for immediate payments or `"AUTHORIZE"` for delayed capture
- Pass `custom_id` with your internal order ID for webhook reconciliation

### MUST NOT DO

- NEVER hardcode PayPal credentials in source code
- NEVER trust `APPROVED` status without calling `capture()` first
- NEVER fulfill based solely on frontend redirect success
- NEVER parse webhooks without verifying signatures first
- NEVER use v1 Charges API (deprecated)
- NEVER expose `client_secret` to frontend code
- NEVER rely solely on polling; always set up webhooks
- NEVER process same webhook event twice — track processed event_ids

---

## Output Template

When implementing PayPal integrations, produce:

1. **Client Factory** — Environment-based PayPalHttpClient or REST SDK config
2. **Order Flow** — Create → Approve → Capture pattern with status tracking
3. **Webhook Handler** — Signature verification + router for key event types
4. **Error Handling** — Mapping from PayPal exceptions to your business exceptions
5. **Database Tracking** — Columns for paypal_order_id, capture_id, status, custom_id
6. **Refund Support** — Refund by capture_id pattern

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-stripe-api` | Stripe for primary payment processor alternative |
| `coding-braintree-api` | Braintree for PayPal + Venmo marketplace payments |
| `coding-square-api` | Square for in-person retail payments |
| `coding-adyen-api` | Adyen for global enterprise payments |
| `coding-shopify-api` | Shopify for ecommerce platform integration |

---

## Live References

| Resource | URL |
|----------|-----|
| PayPal Checkout Python SDK | https://github.com/paypal/Checkout-Python-SDK |
| PayPal REST SDK (legacy) | https://github.com/paypal/rest-api-sdk-python |
| Orders v2 API Reference | https://developer.paypal.com/docs/api/orders/v2/ |
| Subscriptions API | https://developer.paypal.com/docs/api/subscriptions/v1/ |
| Webhook Verification | https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature |
| Payouts API | https://developer.paypal.com/docs/api/payments.payouts-batch/v1/ |
| PayPal Developer Docs | https://developer.paypal.com/docs/api/overview/ |
| Smart Payment Buttons | https://developer.paypal.com/docs/checkout/ |
