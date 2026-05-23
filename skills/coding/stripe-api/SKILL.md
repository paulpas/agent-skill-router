---
name: stripe-api
description: Implements Stripe API integration (Payments, Subscriptions, Connect, Invoices, Terminal, Issuing) using stripe Python SDK v15.0.0+ with StripeClient pattern, webhook signature verification, idempotency keys, and PCI-DSS compliant payment processing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: stripe, payment intents, checkout sessions, stripe subscriptions, stripe connect, webhook signature, how do i integrate stripe payments, payment processing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-paypal-api, coding-square-api, coding-braintree-api
---

# Stripe API Integration

Implements production-grade Stripe API integration using the `stripe` Python SDK v15.0.0+. When loaded, this skill makes the model implement PaymentIntents, Checkout Sessions, Subscriptions, Stripe Connect onboarding, Invoicing, and webhook handling with proper signature verification. All implementations follow PCI-DSS best practices: never log card data, always verify webhook signatures, use idempotency keys for retries, and handle SCA/3D Secure authentication flows.

## TL;DR Checklist

- [ ] Use `StripeClient` class (v8+ pattern), NOT legacy `stripe.api_key` global pattern)
- [ ] Read API keys from `STRIPE_SECRET_KEY` environment variable, never hardcode
- [ ] Use PaymentIntents API for payments (NOT Charges API is deprecated)
- [ ] Verify webhook signatures using `stripe.Webhook.construct_event()`
- [ ] Add idempotency keys to write operations for safe retries
- [ ] Handle `requires_action` for 3D Secure / SCA flows
- [ ] Never log, print, or store raw card numbers (use tokens instead)
- [ ] Use id field names `pi_...` for internal reference tracking

---

## When to Use

Use this skill when:

- Building payment processing flows for one-time purchases using PaymentIntents
- Implementing subscription billing with automatic retries and proration
- Setting up Stripe Connect for marketplace/platform payments
- Creating and sending invoices to customers
- Handling webhook events for payment status updates
- Implementing Terminal for in-person payments
- Designing PCI-DSS compliant payment flows that need SCA/3D Secure
- Building platform payout flows using Issuing API

---

## When NOT to Use

- For PayPal-specific flows — use `coding-paypal-api` instead
- For Square in-person retail payments beyond Terminal — use `coding-square-api`
- When you need a unified payment orchestrator across many gateways
- For Adyen global enterprise payments — use `coding-adyen-api`
- Charges API v1 (deprecated since 2019) — ALWAYS use PaymentIntents

---

## Core Workflow

1. **Initialize StripeClient** — Create a `StripeClient` instance reading `STRIPE_SECRET_KEY` from environment. Use the v8+ pattern: `from stripe import StripeClient; client = StripeClient(). **Checkpoint:** Verify client works with a simple `client.v1.customers.list(limit=1)` call on startup.

2. **Choose Payment Flow** — Select between: (a) PaymentIntents + custom UI + Elements for full control; (b) Checkout Sessions for Stripe-hosted redirect flow; (c) Subscriptions for recurring billing. **Checkpoint:** The flow must support `requires_action` handling — any payment can trigger 3D Secure.

3. **Create Resources with Idempotency** — For PaymentIntents, Customers, Subscriptions: add `idempotency_key` parameter. Generate UUID v4 as key, store with your order ID, and retry on network errors using the SAME key. **Checkpoint:** Retrying with identical idempotency key must produce exact same response, no duplicate charges.**

4. **Implement Webhook Handler** — Create endpoint that receives `stripe-signature` header. Use `Webhook.construct_event(payload, sig_header, webhook_secret) to verify signature BEFORE processing. Listen for `payment_intent.succeeded`, `invoice.paid`, `checkout.session.completed`. **Checkpoint:** Reject any webhook that fails signature verification with 400.**

5. **Handle SCA/3D Secure Flow** — When PaymentIntent returns `status: requires_action`, return `client_secret` to frontend for Elements to complete authentication. Handle `next_action` redirect or 3D Secure modal. **Checkpoint:** Test path: `requires_action` → frontend auth → webhook `payment_intent.succeeded`.

6. **Reconcile with Webhook Events** — Update your database ONLY after verified webhook arrives. Never trust client-side success callbacks alone. Store `payment_intent.id` (`pi_...`) as your payment reference. **Checkpoint:** Database order status updates happen inside the webhook handler, NOT at redirect success page.

---

## Implementation Patterns

### Pattern 1: StripeClient Initialization (BAD vs GOOD)

```python
"""Stripe SDK initialization patterns.

Version note: stripe v8+ introduced StripeClient class.
Earlier versions used global stripe.api_key pattern.
Both still work, but StripeClient is recommended for multi-account and testing.
"""

from __future__ import annotations

import os
from typing import Any

# ===================================================================
# ❌ BAD — legacy global pattern, hardcoded keys, no error context
# ===================================================================

import stripe

stripe.api_key = "sk_live_abc123xyz"  # ❌ Hardcoded! Never commit this!

def bad_create_payment_intent_bad(amount: int, currency: str = "usd") -> Any:
    """❌ BAD: Uses global client, no idempotency, no error handling."""
    intent = stripe.PaymentIntent.create(  # Legacy API
        amount=amount,
        currency=currency,
        payment_method_types=["card"],
        # ❌ No idempotency key — retries can duplicate charges
    )
    print(f"Created intent: {intent}")  # ❌ Logs entire object (may contain PII)
    return intent


# ===================================================================
# ✅ GOOD — StripeClient, env-based auth, typed error handling
# ===================================================================

import uuid
from stripe import StripeClient
from stripe import error as stripe_errors


def get_stripe_client() -> StripeClient:
    """Get configured StripeClient from environment.

    Reads STRIPE_SECRET_KEY from environment. Falls back to test key
    if not set, but raises warning in production.

    Returns:
        Configured StripeClient instance.

    Raises:
        ValueError: If STRIPE_SECRET_KEY missing in production.
    """
    api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        if os.environ.get("ENV") == "production":
            raise ValueError("STRIPE_SECRET_KEY required in production")
        # Default to placeholder for local dev / tests
        api_key = "sk_test_placeholder_only_for_local_tests"
    
    return StripeClient(api_key)


def create_payment_intent(
    amount: int,
    currency: str = "usd",
    customer_id: str | None = None,
    metadata: dict[str, str] | None = None,
) -> Any:
    """Create a PaymentIntent with proper error handling and idempotency.

    PaymentIntents are the modern way to create payments in Stripe.
    Supports SCA/3D Secure automatically via requires_action status.

    Args:
        amount: Amount in the smallest currency unit (cents for USD).
        currency: ISO 4217 currency code.
        customer_id: Optional Stripe customer ID for saved payment methods.
        metadata: Optional key-value pairs to attach to the PaymentIntent.

    Returns:
        PaymentIntent object from stripe SDK.

    Raises:
        ValueError: Invalid parameters.
        ConnectionError: Network failure to Stripe API.
        RuntimeError: Rate limit hit or authentication issue.
    """
    if amount < 50:  # Stripe minimum is ~50 cents equivalent
        raise ValueError(f"Amount must be at least 50 in currency minor unit")
    
    client = get_stripe_client()
    
    # Idempotency key: unique per your internal order ID
    # Store this in your DB with the order for safe retries
    idempotency_key = str(uuid.uuid4())
    
    params: dict[str, Any] = {
        "amount": amount,
        "currency": currency,
        "payment_method_types": ["card"],
        "automatic_payment_methods": {"enabled": True},  # ✅ New way to enable all payment methods
    }
    
    if customer_id:
        params["customer"] = customer_id
        params["setup_future_usage"] = "off_session"  # For future charges
    if metadata:
        params["metadata"] = metadata
    
    try:
        intent = client.v1.payment_intents.create(
            params=params,
            options={"idempotency_key": idempotency_key},  # ✅ Safe retries
        )
        return intent
    
    except stripe_errors.StripeError as e:
        # Classify Stripe errors for proper handling
        err_type = type(e).__name__
        
        if isinstance(e, stripe_errors.CardError):
            # Card was declined — show user-facing message
            raise ValueError(f"Card declined: {e.user_message or e.error.message}") from e
        
        elif isinstance(e, stripe_errors.RateLimitError):
            # Too many requests — retry with exponential backoff
            raise RuntimeError("Stripe rate limit hit — retry later") from e
        
        elif isinstance(e, stripe_errors.AuthenticationError):
            # Invalid API key — configuration issue
            raise RuntimeError("Invalid Stripe API key configuration") from e
        
        elif isinstance(e, stripe_errors.APIConnectionError):
            # Network issue — safe to retry with SAME idempotency key
            raise ConnectionError("Failed to connect to Stripe API") from e
        
        else:
            raise RuntimeError(f"Stripe error: {err_type}: {e}") from e
```

### Pattern 2: Checkout Session for Hosted Payments

```python
"""Stripe Checkout Sessions for redirect-based payment flows.

Checkout is Stripe's hosted payment page. Handles:
- All payment methods configured in Dashboard
- SCA/3D Secure automatically
- Responsive UI out of the box
- Localization to customer's locale

This is the RECOMMENDED way for most use cases.
"""

from __future__ import annotations

import os
import uuid
from typing import Any
from stripe import StripeClient
from stripe import error as stripe_errors


def create_checkout_session(
    success_url: str,
    cancel_url: str,
    line_items: list[dict[str, Any]],
    mode: str = "payment",  # payment | subscription | setup
    customer_email: str | None = None,
    metadata: dict[str, str] | None = None,
) -> Any:
    """Create a Stripe Checkout Session for redirect-based payment flow.

    Args:
        success_url: URL to redirect after successful payment.
        cancel_url: URL to redirect if customer cancels.
        line_items: List of product/price definitions.
        mode: One of "payment", "subscription", or "setup".
        customer_email: Optional email to pre-fill.
        metadata: Optional key-value data.

    Returns:
        Checkout Session object with `url` field for redirect.

    Example line_items for one-time payment:
        [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Premium Plan"},
                    "unit_amount": 2999,  # $29.99
                },
                "quantity": 1,
            }
        ]
    """
    if not success_url or "{CHECKOUT_SESSION_ID" not in success_url:
        # Recommend using {CHECKOUT_SESSION_ID} template for post-payment lookup
        pass  # Not mandatory but useful
    
    client = get_stripe_client()
    idempotency_key = str(uuid.uuid4())
    
    params: dict[str, Any] = {
        "success_url": success_url,
        "cancel_url": cancel_url,
        "line_items": line_items,
        "mode": mode,
        "payment_method_types": None,  # automatic_payment_methods preferred
        "automatic_payment_methods": {"enabled": True},
    }
    
    if customer_email:
        params["customer_email"] = customer_email
    if metadata:
        params["metadata"] = metadata
    
    try:
        session = client.v1.checkout.sessions.create(
            params=params,
            options={"idempotency_key": idempotency_key},
        )
        return session
    
    except stripe_errors.StripeError as e:
        raise RuntimeError(f"Checkout session failed: {e}") from e


def handle_checkout_completed(session_id: str) -> dict[str, Any]:
    """Verify and fulfill order after checkout.session.completed webhook.

    Call this INSIDE your webhook handler AFTER signature verification.
    Retrieves the session with expanded line_items to see what was purchased.

    Args:
        session_id: The Checkout Session ID from webhook (`cs_...`).

    Returns:
        Dict with session details for order fulfillment.
    """
    client = get_stripe_client()
    
    # Expand line_items to see what was purchased
    session = client.v1.checkout.sessions.retrieve(
        session_id,
        params={"expand": ["line_items", "payment_intent"]},
    )
    
    payment_intent = session.get("payment_intent")
    customer = session.get("customer")
    customer_details = session.get("customer_details", {})
    
    return {
        "session_id": session.id,
        "payment_intent_id": payment_intent.id if payment_intent else None,
        "customer_id": customer if isinstance(customer, str) else customer.id if customer else None,
        "customer_email": customer_details.get("email"),
        "amount_total": session.amount_total,
        "currency": session.currency,
        "status": session.payment_status,  # paid | unpaid | no_payment_required
        "metadata": dict(session.metadata) if session.metadata else {},
        "line_items": [
            {
                "description": item.description,
                "amount_total": item.amount_total,
                "quantity": item.quantity,
            }
            for item in session.line_items.data
        ] if session.line_items else [],
    }
```

### Pattern 3: Webhook Signature Verification (CRITICAL)

```python
"""Webhook signature verification — the ONLY reliable way to know payment succeeded.

Stripe webhooks are SERVER-TO-SERVER callbacks. NEVER trust:
1. Client-side success redirects alone (can be faked)
2. JavaScript success callbacks (can be interrupted)
3. Unverified webhook payloads (can be forged)

Always VERIFY the stripe-signature header BEFORE processing.
"""

from __future__ import annotations

import os
import logging
from typing import Any, Callable
from stripe import Webhook
from stripe import error as stripe_errors

logger = logging.getLogger(__name__)

# Get this from Stripe Dashboard → Developers → Webhooks
# Each endpoint has its OWN webhook secret (not your API secret)
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def verify_and_parse_webhook(
    payload: bytes,
    stripe_signature_header: str,
    webhook_secret: str = "",
) -> Any:
    """Verify Stripe webhook signature and parse the event object.

    This is the MOST IMPORTANT part of Stripe integration.

    Args:
        payload: Raw request body bytes (NOT parsed JSON).
        stripe_signature_header: Full `stripe-signature` header value.
        webhook_secret: Secret from Stripe Dashboard Webhooks page.

    Returns:
        Parsed Stripe Event object.

    Raises:
        ValueError: If signature verification fails.
    """
    secret = webhook_secret or WEBHOOK_SECRET
    
    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise ValueError("Webhook secret not configured")
    
    try:
        # ✅ This is how you verify Stripe webhooks
        event = Webhook.construct_event(
            payload,
            stripe_signature_header,
            secret,
        )
        return event
    
    except ValueError as e:
        # Invalid payload or signature
        logger.warning("Webhook payload verification failed: %s", e)
        raise ValueError(f"Invalid webhook payload") from e
    
    except stripe_errors.SignatureVerificationError as e:
        # Signature doesn't match — potential forgery attempt or wrong secret
        logger.warning("Webhook signature verification failed: %s", e)
        raise ValueError(f"Invalid webhook signature") from e


class WebhookRouter:
    """Routes verified webhook events to registered handlers.

    Usage:
        router = WebhookRouter()
        
        @router.on("payment_intent.succeeded")
        def handle_payment_success(event):
            order_id = event.data.object.metadata.get("order_id")
            fulfill_order(order_id)
        
        # In your endpoint:
        event = verify_and_parse_webhook(payload, sig_header)
        router.dispatch(event)
    """
    
    def __init__(self) -> None:
        self._handlers: dict[str, Callable[[Any], None]] = {}
    
    def on(self, event_type: str) -> Callable[[Callable[[Any], None], Callable[[Any], None]]:
        """Decorator to register a handler for an event type."""
        def decorator(handler: Callable[[Any], None]) -> Callable[[Any], None]:
            self._handlers[event_type] = handler
            return handler
        return decorator  # type: ignore[return-value]
    
    def dispatch(self, event: Any) -> bool:
        """Dispatch an event to its registered handler.

        Returns:
            True if handler was called, False if no handler registered.
        """
        handler = self._handlers.get(event.type)
        if handler:
            try:
                handler(event)
                return True
            except Exception:
                logger.exception("Handler failed for event %s: %s", event.type, event.id)
                raise
        return False


# Common events to listen for:
# - payment_intent.succeeded → payment succeeded (reliable!)
# - payment_intent.payment_failed → payment failed / declined
# - checkout.session.completed → checkout done (reliable!)
# - invoice.paid → subscription invoice paid
# - invoice.payment_failed → subscription payment failed
# - customer.subscription.updated → subscription changed
# - charge.refunded → refund processed

# ===================================================================
# ❌ BAD — DO NOT DO THIS
# ===================================================================

def bad_webhook_handler_bad(request_body: str) -> Any:
    """❌ BAD: No signature verification, trusts raw payload parsing."""
    import json
    # ❌ Just parsing JSON — anyone can send fake events!
    event = json.loads(request_body)  # UNSAFE!
    # ❌ This will process forged events too!
    return event


# ===================================================================
# ✅ GOOD — Always verify signature FIRST
# ===================================================================

# Initialize router with common handlers
stripe_router = WebhookRouter()

@stripe_router.on("payment_intent.succeeded")
def on_payment_succeeded(event: Any) -> None:
    """Handle successful payment from verified webhook."""
    intent = event.data.object
    order_id = intent.metadata.get("order_id")
    payment_intent_id = intent.id
    amount_received = intent.amount_received
    currency = intent.currency
    
    logger.info(
        "Payment succeeded: pi=%s order=%s amount=%d%s",
        payment_intent_id,
        order_id,
        amount_received,
        currency,
    )
    
    # ✅ This is where you:
    # 1. Mark order as PAID in YOUR database
    # 2. Send receipt email
    # 3. Fulfill digital goods / unlock features
    # 4. Trigger any post-payment workflows


@stripe_router.on("checkout.session.completed")
def on_checkout_completed(event: Any) -> None:
    """Handle completed checkout session (redirect-based payments)."""
    session = event.data.object
    logger.info("Checkout completed: cs=%s", session.id)
    
    # Retrieve expanded session with line_items if needed
    # Then fulfill order


@stripe_router.on("invoice.paid")
def on_invoice_paid(event: Any) -> None:
    """Handle subscription invoice paid."""
    invoice = event.data.object
    subscription_id = invoice.subscription
    customer_id = invoice.customer
    
    logger.info(
        "Invoice paid: inv=%s sub=%s cust=%s amount_total=%d",
        invoice.id,
        subscription_id,
        customer_id,
        invoice.amount_paid,
    )


@stripe_router.on("payment_intent.payment_failed")
def on_payment_failed(event: Any) -> None:
    """Handle failed/declined payment."""
    intent = event.data.object
    last_payment_error = intent.last_payment_error
    logger.warning(
        "Payment failed: pi=%s code=%s message=%s",
        intent.id,
        last_payment_error.code if last_payment_error else None,
        last_payment_error.message if last_payment_error else None,
    )
    # Mark order as FAILED
    # Notify customer if needed
```

### Pattern 4: Subscriptions with Automatic Retries

```python
"""Stripe Subscriptions API for recurring billing.

Stripe handles:
- Automatic recurring charges
- Proration on plan changes
- Dunning management (retries on failed payments)
- Tax calculation
- Invoicing
"""

from __future__ import annotations

import uuid
from typing import Any
from stripe import StripeClient


def create_subscription(
    customer_id: str,
    price_id: str,
    metadata: dict[str, str] | None = None,
    trial_days: int = 0,
    coupon_id: str | None = None,
) -> Any:
    """Create a subscription for an existing Stripe Customer.

    Args:
        customer_id: Stripe Customer ID (`cus_...`).
        price_id: Stripe Price ID (`price_...`).
        metadata: Optional key-value pairs.
        trial_days: Optional trial period before first charge.
        coupon_id: Optional discount coupon.

    Returns:
        Subscription object.

    Note:
        The Customer should already have a payment method attached,
        or use payment_behavior="default_incomplete" with checkout for SCA.
    """
    client = get_stripe_client()
    idempotency_key = str(uuid.uuid4())
    
    params: dict[str, Any] = {
        "customer": customer_id,
        "items": [{"price": price_id}],
        "payment_behavior": "default_incomplete",  # For SCA-ready
        "expand": ["latest_invoice.payment_intent"],
    }
    
    if trial_days > 0:
        params["trial_period_days"] = trial_days
    if metadata:
        params["metadata"] = metadata
    if coupon_id:
        params["coupon"] = coupon_id
    
    subscription = client.v1.subscriptions.create(
        params=params,
        options={"idempotency_key": idempotency_key},
    )
    
    return subscription


def cancel_subscription(
    subscription_id: str,
    immediate: bool = False,
) -> Any:
    """Cancel a subscription.

    Args:
        subscription_id: Subscription ID (`sub_...`).
        immediate: If True, cancel NOW (prorate refund may apply).
                   If False, cancel at period end (default).
    """
    client = get_stripe_client()
    
    if immediate:
        # Cancel immediately, may issue prorated credit
        return client.v1.subscriptions.cancel(subscription_id)
    else:
        # Cancel at the end of current billing period
        return client.v1.subscriptions.modify(
            subscription_id,
            params={"cancel_at_period_end": True},
        )


def update_subscription_plan(
    subscription_id: str,
    new_price_id: str,
    proration_behavior: str = "create_prorations",
) -> Any:
    """Change a subscription to a different price/plan.

    Args:
        subscription_id: Existing subscription ID.
        new_price_id: New price to switch to.
        proration_behavior: One of:
            - "create_prorations" — charge prorated difference (default)
            - "none" — no proration, change at next period
            - "always_invoice" — invoice immediately
    """
    client = get_stripe_client()
    
    return client.v1.subscriptions.modify(
        subscription_id,
        params={
            "items": [{
                "id": "current",  # Use existing subscription item
                "price": new_price_id,
            }],
            "proration_behavior": proration_behavior,
        },
    )
```

---

## Constraints

### MUST DO

- Always use `StripeClient` class (v8+), NOT global `stripe.api_key`
- Read `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from environment variables
- Use PaymentIntents API (NOT deprecated Charges API)
- Verify EVERY webhook using `Webhook.construct_event()` BEFORE processing
- Add idempotency keys to ALL write operations (create, modify, cancel)
- Handle `requires_action` / `next_action` for 3D Secure flows
- Listen to webhooks for `payment_intent.succeeded`, `checkout.session.completed`
- Store `pi_...` / `cs_...` / `sub_...` IDs as payment references
- Use `automatic_payment_methods` (not `payment_method_types=["card"]` for broader coverage
- Implement exponential backoff with jitter for rate limit and network errors

### MUST NOT DO

- NEVER hardcode API keys or webhook secrets in source code
- NEVER log, print, or store raw card numbers, CVV, or expiry (PCI violation)
- NEVER trust client-side "success" callbacks without webhook verification
- NEVER use Charges API (deprecated since 2019; doesn't support SCA)
- NEVER skip signature verification on webhooks
- NEVER use the same idempotency key for DIFFERENT operations
- NEVER parse webhook JSON without `construct_event` (forgery risk)
- NEVER expose `STRIPE_SECRET_KEY` to frontend code
- NEVER send PII in logs — use metadata.order_id instead of printing full objects

---

## Output Template

When implementing Stripe integrations, produce:

1. **StripeClient Initialization** — Client factory reading from env vars, typed error mapping
2. **Payment Flow Choice** — One of: PaymentIntent + Elements, or Checkout Session redirect
3. **Webhook Handler** — Signature-verified endpoint with router for event types
4. **Error Handling Strategy** — Mapping from StripeError subclasses to your exceptions
5. **Database Schema Snippets** — Columns for `payment_intent_id`, `status`, `amount` columns
6. **Test Scenarios** — Happy path, card decline, `requires_action` flow

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-paypal-api` | PayPal Orders/Subscriptions for alternative payment processor |
| `coding-square-api` | Square for in-person retail and restaurant payments |
| `coding-braintree-api` | Braintree (PayPal-owned) for marketplace/PayPal Venmo |
| `coding-adyen-api` | Adyen for global enterprise payments |
| `coding-shopify-api` | Shopify for ecommerce platform with built-in payments |

---

## Live References

| Resource | URL |
|----------|-----|
| Stripe Python SDK (PyPI) | https://pypi.org/project/stripe/ |
| Stripe API Reference | https://stripe.com/docs/api?lang=python |
| PaymentIntents Quickstart | https://stripe.com/docs/payments/payment-intents |
| Checkout Sessions Guide | https://stripe.com/docs/payments/accept-a-payment |
| Webhook Signature Verification | https://stripe.com/docs/webhooks/signatures |
| Stripe Python SDK GitHub | https://github.com/stripe/stripe-python |
| SCA / 3D Secure Guide | https://stripe.com/docs/strong-customer-authentication |
| Subscriptions API | https://stripe.com/docs/billing/subscriptions |
| Stripe Connect | https://stripe.com/docs/connect |
| Idempotent Requests | https://stripe.com/docs/api/idempotent_requests |

---

## 📎 PCI-DSS Notes

When processing card data:

- **Stripe Elements** / **Checkout** keeps you out of PCI scope (SAQ A)**
- **Never** have card numbers touch your server
- Tokens (`pm_...`) only
- Your frontend collects, frontend sends → Stripe returns token → you use token
- Webhook `payment_intent.succeeded` = ONLY reliable confirmation

Stripe is Level 1 PCI compliant — using their hosted fields keeps you compliant by proxy.
