---
name: adyen-api
description: Implements Adyen API integration (Payments, Checkout, Marketplaces, Risk, Reporting) using adyen Python SDK with 3D Secure 2 authentication flow, webhook signature verification, idempotency keys, and global enterprise payment processing patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: adyen, adyen checkout api, adyen payments, 3d secure 2, adyen webhook verification, adyen marketplaces, adyen risk management, how do i integrate adyen payments, global payment processing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-stripe-api, coding-paypal-api, coding-braintree-api
---

# Adyen API Integration

Implements production-grade Adyen API integration for global enterprise payments including Checkout API, Payments API, Marketplaces (Adyen for Platforms), Risk Management, and Financial Reporting. When loaded, this skill makes the model implement the `adyen` Python SDK patterns including: `/sessions` for hosted checkout drop-in, `/payments` for direct API integration, 3D Secure 2 handling flow, `/payments/details` for handling authentication results, webhook HMAC signature verification, idempotency keys for safe retries, and Marketplace API for split payments and onboarding.

## TL;DR Checklist

- [ ] Use `adyen` Python SDK (`pip install adyen`)
- [ ] Environment variables: `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_CLIENT_KEY`, `ADYEN_ENVIRONMENT`, `ADYEN_HMAC_KEY`
- [ ] Modern flow: `/sessions` → Drop-in/Components → `notification` webhook
- [ ] Classic flow: `/payments` → handle `action` → `/payments/details` → webhook
- [ ] Webhook verification: compute HMAC-SHA256 of `pspReference + eventCode + success + ...`
- [ ] Add `idempotency-key` header to write operations
- [ ] Store `pspReference` for tracking, refunds, and reconciliation
- [ ] Always use `merchantAccount` parameter in every payment request

---

## When to Use

Use this skill when:

- Building global enterprise payment processing with 100+ currencies
- Implementing 3D Secure 2 (3DS2) authentication flows
- Using Adyen Checkout Drop-in or Components for unified checkout
- Building marketplaces with split payments (Adyen for Platforms)
- Accessing advanced risk management and fraud detection
- Processing alternative payment methods (iDEAL, Sofort, Klarna, Pix, etc.)
- Managing payouts and financial reconciliation via Reporting API
- Handling subscription/recurring payments with tokenization
- Building point-of-sale integrations (Adyen Terminal API)

---

## When NOT to Use

- For simple US-only payments — Stripe may be simpler
- For PayPal/Venmo-specific checkout — use `coding-paypal-api`
- For Square in-person retail — use `coding-square-api`
- For bank account linking without payments — use `coding-plaid-api`
- When you don't need global enterprise payment methods

---

## Core Workflow

1. **Initialize Adyen Client** — Configure `AdyenClient` with `ADYEN_API_KEY`. Set environment: `live` or `test`. Store `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_CLIENT_KEY`, `ADYEN_HMAC_KEY`. **Checkpoint:** Call `/paymentMethods` with `merchantAccount` to verify connectivity.

2. **Choose Integration Flow** — Select: (a) **Sessions** (modern): call `/sessions` → use Drop-in with session id; (b) **Classic** (advanced): call `/payments` → handle `action` for 3DS2 → `/payments/details`. **Checkpoint:** Sessions is recommended for most use cases; Classic gives more control.

3. **Create Payment or Session** — Build request with: `amount: { value, currency }`, `reference` (your order ID), `merchantAccount`, `paymentMethod` or `channel: "Web"`, `returnUrl`, `shopperReference`, `additionalData: { allow3DS2: true }`. **Checkpoint:** Save `pspReference` from response.

4. **Handle Authentication Action** — If response contains `action`, pass to Drop-in/Components for 3DS2 or redirect. After auth, frontend sends result to `/payments/details`. **Checkpoint:** Verify `resultCode` from `/payments/details`: `Authorised`, `Refused`, `Pending`, `Cancelled`.

5. **Verify Webhook (FINAL AUTHORITY)** — Adyen sends `notification` webhook for every payment outcome. Compute HMAC signature from fields: `pspReference + originalReference + merchantAccount + merchantReference + amount.value + amount.currency + eventCode + success`. Compare with `additionalData.hmacSignature`. **Checkpoint:** Return `[accepted]` plain text after processing.

6. **Fulfill After Webhook `success: true`** — When `eventCode: "AUTHORISATION"` and `success: "true"`, mark order as paid. For sessions flow, `eventCode: "AUTHORISATION"` is still authoritative. **Checkpoint:** Never trust frontend `onPaymentCompleted` alone; always wait for webhook.

---

## Implementation Patterns

### Pattern 1: Adyen Client Initialization (BAD vs GOOD)

```python
"""Adyen Python SDK client initialization patterns.

SDK: pip install adyen

Environment variables:
- ADYEN_API_KEY: Your Adyen API key
- ADYEN_MERCHANT_ACCOUNT: Your merchant account name (e.g., "MyCompanyECOM")
- ADYEN_CLIENT_KEY: Frontend client key for Drop-in/Components
- ADYEN_ENVIRONMENT: "test" or "live"
- ADYEN_HMAC_KEY: Webhook signature verification key
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded API key, no config, no error context
# ===================================================================

def bad_init_bad() -> Any:
    """❌ BAD: Hardcoded API key, no validation."""
    import adyen
    from adyen import AdyenClient
    from adyen.services import Checkout, Payments
    
    # ❌ HARDCODED API KEY! Never commit this!
    client = AdyenClient(
        xapikey="AQEyhmfx...real_key_here",
        platform="test",
    )
    
    # ❌ No merchant account stored
    # ❌ No validation that client works
    return client


# ===================================================================
# ✅ GOOD — environment-based, typed config, validation
# ===================================================================

try:
    import adyen
    from adyen import AdyenClient
    from adyen.services import Checkout, Payments
    ADYEN_SDK_AVAILABLE = True
except ImportError:
    ADYEN_SDK_AVAILABLE = False


class AdyenConfig:
    """Typed configuration for Adyen integration."""
    
    def __init__(
        self,
        api_key: str | None = None,
        merchant_account: str | None = None,
        client_key: str | None = None,
        environment: str = "test",
        hmac_key: str | None = None,
        live_endpoint_prefix: str | None = None,
    ):
        self.api_key = api_key or os.environ.get("ADYEN_API_KEY", "")
        self.merchant_account = merchant_account or os.environ.get("ADYEN_MERCHANT_ACCOUNT", "")
        self.client_key = client_key or os.environ.get("ADYEN_CLIENT_KEY", "")
        self.environment = environment or os.environ.get("ADYEN_ENVIRONMENT", "test")
        self.hmac_key = hmac_key or os.environ.get("ADYEN_HMAC_KEY", "")
        self.live_endpoint_prefix = live_endpoint_prefix or os.environ.get("ADYEN_LIVE_ENDPOINT_PREFIX")
        
        # Live environment needs URL prefix: [random]-[company]-pal-live.adyenpayments.com
        if self.environment == "live" and not self.live_endpoint_prefix:
            logger.warning("ADYEN_LIVE_ENDPOINT_PREFIX not set for live environment")
    
    def validate(self) -> None:
        """Validate required config values."""
        if not self.api_key:
            raise ValueError("ADYEN_API_KEY not configured")
        if not self.merchant_account:
            raise ValueError("ADYEN_MERCHANT_ACCOUNT not configured")


def get_adyen_config() -> AdyenConfig:
    """Get Adyen configuration from environment."""
    config = AdyenConfig()
    config.validate()
    return config


def get_adyen_client(config: AdyenConfig | None = None) -> AdyenClient:
    """Get configured AdyenClient.

    Args:
        config: Optional AdyenConfig; uses env if None.

    Returns:
        Configured AdyenClient.
    """
    if not ADYEN_SDK_AVAILABLE:
        raise RuntimeError("adyen SDK not installed. pip install adyen")
    
    actual_config = config or get_adyen_config()
    
    client_kwargs = {
        "xapikey": actual_config.api_key,
        "platform": actual_config.environment,
    }
    
    if actual_config.environment == "live" and actual_config.live_endpoint_prefix:
        client_kwargs["live_endpoint_url_prefix"] = actual_config.live_endpoint_prefix
    
    client = AdyenClient(**client_kwargs)
    return client


def verify_adyen_connection(config: AdyenConfig | None = None) -> bool:
    """Verify Adyen credentials work by calling /paymentMethods.

    Returns:
        True if credentials valid.
    """
    actual_config = config or get_adyen_config()
    client = get_adyen_client(actual_config)
    checkout = Checkout(client)
    
    try:
        result = checkout.payment_methods({
            "merchantAccount": actual_config.merchant_account,
            "amount": {"value": 1000, "currency": "EUR"},  # Dummy for allowed PMs
            "channel": "Web",
        })
        logger.info("Adyen connection verified successfully")
        return True
    except Exception as e:
        logger.error("Adyen connection verification failed: %s", e)
        raise ValueError(f"Adyen credentials invalid: {e}") from e
```

### Pattern 2: Sessions Flow (Modern Checkout)

```python
"""Adyen Sessions flow (MODERN, RECOMMENDED).

Sessions is the easiest way to integrate Adyen Checkout.

Flow:
1. Backend: POST /sessions → returns sessionData, id
2. Frontend: Initialize Drop-in/Components with sessionData
3. User: Completes payment in Drop-in (3DS2 handled automatically)
4. Adyen: Sends notification webhook
5. Backend: Processes webhook (THE FINAL AUTHORITY)

The Drop-in component handles:
- All payment methods
- 3D Secure 2 challenges
- Redirects (PayPal, iDEAL, etc.)
- Error handling and retries
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional
import uuid


def amount_to_adyen_value(amount: Decimal, currency: str = "EUR") -> int:
    """Convert decimal amount to Adyen minor units.

    Adyen amounts are integers representing the smallest currency unit:
    - EUR 29.99 → value=2999
    - USD 49.50 → value=4950
    - JPY 1500 → value=1500 (zero-decimal currency)

    Args:
        amount: Decimal amount.
        currency: ISO 4217 currency code.

    Returns:
        Integer value for Adyen API.
    """
    zero_decimal = {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW",
        "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
    }
    three_decimal = {"BHD", "IQD", "JOD", "KWD", "OMR", "TND"}
    
    if currency in zero_decimal:
        return int(amount)
    elif currency in three_decimal:
        return int(amount * Decimal("1000"))
    else:
        return int(amount * Decimal("100"))


def create_checkout_session(
    amount: Decimal,
    currency: str,
    reference: str,  # Your unique order/reference ID
    return_url: str,
    shopper_reference: str | None = None,  # Your unique shopper/customer ID
    shopper_email: str | None = None,
    shopper_locale: str = "en-US",
    channel: str = "Web",  # Web, iOS, Android, POS
    additional_data: dict[str, Any] | None = None,
    config: AdyenConfig | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Create an Adyen Checkout Session.

    Use this for the modern Drop-in/Components integration.

    Args:
        amount: Payment amount as Decimal.
        currency: ISO 4217 currency code.
        reference: Your unique order/reference ID (shown in Adyen reports).
        return_url: URL to return to after redirect payment methods.
        shopper_reference: Your unique shopper ID (for recurring, risk).
        shopper_email: Shopper email for risk checks and receipts.
        shopper_locale: Preferred language (e.g., "en-US", "nl-NL", "de-DE").
        channel: Payment channel.
        additional_data: Additional data like allow3DS2, riskData, etc.
        config: Optional AdyenConfig.
        idempotency_key: Optional idempotency key (auto-generated UUID if None).

    Returns:
        Dict with id, sessionData, amount, currency.
    """
    actual_config = config or get_adyen_config()
    client = get_adyen_client(actual_config)
    checkout = Checkout(client)
    
    actual_ikey = idempotency_key or str(uuid.uuid4())
    value = amount_to_adyen_value(amount, currency)
    
    request: dict[str, Any] = {
        "merchantAccount": actual_config.merchant_account,
        "amount": {
            "value": value,
            "currency": currency,
        },
        "reference": reference,
        "returnUrl": return_url,
        "channel": channel,
        "shopperLocale": shopper_locale,
    }
    
    if shopper_reference:
        request["shopperReference"] = shopper_reference
    if shopper_email:
        request["shopperEmail"] = shopper_email
    
    # 3D Secure 2 is automatic with sessions; this ensures fallback to 3DS1 if needed
    additional = additional_data or {}
    additional.setdefault("allow3DS2", "true")
    request["additionalData"] = additional
    
    # Idempotency key in header
    checkout._headers["Idempotency-Key"] = actual_ikey
    
    try:
        response = checkout.sessions(request)
        return {
            "id": response.get("id"),
            "session_data": response.get("sessionData"),
            "amount": response.get("amount", {}),
            "reference": response.get("reference"),
            "expires_at": response.get("expiresAt"),
            "merchant_account": response.get("merchantAccount"),
            "idempotency_key": actual_ikey,
        }
    except Exception as e:
        logger.error("Adyen sessions creation failed: %s", e)
        raise RuntimeError(f"Failed to create checkout session: {e}") from e


def get_checkout_session(
    session_id: str,
    config: AdyenConfig | None = None,
) -> dict[str, Any]:
    """Get session status (for polling; webhook is recommended).

    Note: Webhook notification is the authoritative source for payment status.
    Only use this for fallback polling.
    """
    actual_config = config or get_adyen_config()
    client = get_adyen_client(actual_config)
    checkout = Checkout(client)
    
    request = {
        "merchantAccount": actual_config.merchant_account,
    }
    
    try:
        response = checkout.get_session_result(session_id, request)
        return {
            "result_code": response.get("resultCode"),
            "psp_reference": response.get("pspReference"),
            "amount": response.get("amount", {}),
            "merchant_reference": response.get("merchantReference"),
            "payment_method": response.get("paymentMethod", {}),
            "raw": response,
        }
    except Exception as e:
        raise RuntimeError(f"Failed to get session result: {e}") from e
```

### Pattern 3: Classic Payments API with 3D Secure 2

```python
"""Adyen Classic Payments API flow (for advanced control).

Use this when you need full control over the payment flow.

Flow:
1. Backend: POST /payments
2. If response has action:
   a. Frontend renders 3DS2 challenge or redirects
   b. User completes authentication
3. Frontend sends details to backend
4. Backend: POST /payments/details
5. Check resultCode: Authorised, Refused, Pending, etc.
6. Adyen sends notification webhook (FINAL AUTHORITY)

resultCode meanings:
- Authorised: Payment successful
- Refused: Payment refused by issuer/risk
- RedirectShopper: Need to redirect to acquirer
- IdentifyShopper / ChallengeShopper: 3D Secure required
- Pending: Payment pending (bank transfer, etc.)
- Cancelled: Shopper cancelled
- Error: System error
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional
import uuid


def create_payment(
    amount: Decimal,
    currency: str,
    reference: str,
    payment_method: dict[str, Any],  # From frontend Drop-in/Components
    return_url: str,
    shopper_reference: str | None = None,
    shopper_ip: str | None = None,
    shopper_email: str | None = None,
    channel: str = "Web",
    additional_data: dict[str, Any] | None = None,
    billing_address: dict[str, Any] | None = None,
    delivery_address: dict[str, Any] | None = None,
    config: AdyenConfig | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Create a payment via Payments API (classic flow).

    Args:
        amount: Payment amount.
        currency: Currency code.
        reference: Your order reference ID.
        payment_method: Payment method data from frontend (e.g., card details).
        return_url: URL for after 3DS2/redirects.
        shopper_reference: Your shopper ID for tokenization/risk.
        shopper_ip: Shopper IP for risk checks.
        shopper_email: Shopper email.
        channel: Channel.
        additional_data: Additional settings.
        billing_address: Billing address for AVS/risk.
        delivery_address: Shipping address for risk.
        config: Adyen config.
        idempotency_key: Idempotency key.

    Returns:
        Dict with resultCode, action (if needed), pspReference.
    """
    actual_config = config or get_adyen_config()
    client = get_adyen_client(actual_config)
    payments = Payments(client)
    
    actual_ikey = idempotency_key or str(uuid.uuid4())
    value = amount_to_adyen_value(amount, currency)
    
    request: dict[str, Any] = {
        "merchantAccount": actual_config.merchant_account,
        "amount": {
            "value": value,
            "currency": currency,
        },
        "reference": reference,
        "paymentMethod": payment_method,
        "returnUrl": return_url,
        "channel": channel,
    }
    
    if shopper_reference:
        request["shopperReference"] = shopper_reference
    if shopper_ip:
        request["shopperIP"] = shopper_ip
    if shopper_email:
        request["shopperEmail"] = shopper_email
    if billing_address:
        request["billingAddress"] = billing_address
    if delivery_address:
        request["deliveryAddress"] = delivery_address
    
    additional = additional_data or {}
    additional.setdefault("allow3DS2", "true")
    request["additionalData"] = additional
    
    payments._headers["Idempotency-Key"] = actual_ikey
    
    try:
        response = payments.authorise(request)
        
        result = {
            "result_code": response.get("resultCode"),
            "psp_reference": response.get("pspReference"),
            "refusal_reason": response.get("refusalReason"),
            "amount": response.get("amount", {}),
            "merchant_reference": response.get("merchantReference"),
            "idempotency_key": actual_ikey,
            "raw": response,
        }
        
        # If action is present, pass to frontend for 3DS2/redirect
        if "action" in response:
            result["action"] = response["action"]
        
        logger.info(
            "Adyen payment created: psp=%s result=%s",
            result["psp_reference"], result["result_code"]
        )
        
        return result
    except Exception as e:
        logger.error("Adyen payment creation failed: %s", e)
        raise RuntimeError(f"Failed to create payment: {e}") from e


def submit_payment_details(
    details: dict[str, Any],  # From frontend after 3DS2/redirect
    payment_data: str | None = None,  # paymentData from /payments action
    config: AdyenConfig | None = None,
) -> dict[str, Any]:
    """Submit payment details after 3D Secure 2 authentication or redirect.

    After user completes 3DS2 challenge or returns from redirect,
    call this to finalize the payment.

    Args:
        details: details object from frontend (e.g., MD, PaRes, etc.)
        payment_data: paymentData from the /payments response action.
        config: Adyen config.

    Returns:
        Dict with resultCode, pspReference.
    """
    actual_config = config or get_adyen_config()
    client = get_adyen_client(actual_config)
    payments = Payments(client)
    
    request: dict[str, Any] = {
        "merchantAccount": actual_config.merchant_account,
        "details": details,
    }
    
    if payment_data:
        request["paymentData"] = payment_data
    
    try:
        response = payments.payments_details(request)
        
        return {
            "result_code": response.get("resultCode"),
            "psp_reference": response.get("pspReference"),
            "refusal_reason": response.get("refusalReason"),
            "additional_data": response.get("additionalData", {}),
            "raw": response,
        }
    except Exception as e:
        logger.error("Adyen payment details submission failed: %s", e)
        raise RuntimeError(f"Failed to submit payment details: {e}") from e
```

### Pattern 4: Webhook HMAC Signature Verification

```python
"""Adyen webhook notification verification.

Adyen sends webhooks (called "notifications") for all payment events.

IMPORTANT:
- Webhooks are the ONLY authoritative source of payment status
- NEVER trust frontend results alone
- ALWAYS verify HMAC signature before processing

Event codes to handle:
- AUTHORISATION: Payment authorised (successful payment)
- CANCELLATION: Payment cancelled
- REFUND: Refund processed
- REFUND_FAILED: Refund failed
- CANCEL_OR_REFUND: Automatic reversal
- REPORT_AVAILABLE: Report ready for download
- PENDING: Payment pending
- EXPIRE: Payment expired
- CAPTURE: Capture completed
- CAPTURE_FAILED: Capture failed

HMAC Signature Calculation:
1. Collect fields in this EXACT order:
   pspReference, originalReference, merchantAccount, merchantReference,
   amount.value, amount.currency, eventCode, success

2. Concatenate with colon separator:
   "VAL1:VAL2:VAL3:..."
   (Use empty string "" for missing fields, NOT "null")

3. Compute HMAC-SHA256 with your HMAC key
4. Base64-encode the result
5. Compare with additionalData.hmacSignature (case-insensitive)

Get your HMAC Key from:
Adyen Customer Area → Developers → Webhooks → Select webhook → Webhook settings → HMAC key
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class AdyenWebhookVerifier:
    """Verifies Adyen webhook HMAC signatures."""
    
    def __init__(self, hmac_key: str | None = None):
        self.hmac_key = hmac_key or os.environ.get("ADYEN_HMAC_KEY", "")
        if not self.hmac_key:
            logger.warning("ADYEN_HMAC_KEY not configured for webhook verification")
    
    def verify_notification_item(self, item: dict[str, Any]) -> bool:
        """Verify HMAC signature of a notification item.

        Args:
            item: Single notification item from the notification request.
                Structure:
                {
                    "pspReference": "ABC123...",
                    "eventCode": "AUTHORISATION",
                    "success": "true",
                    "merchantAccount": "...",
                    "merchantReference": "...",
                    "amount": {"value": 1000, "currency": "EUR"},
                    "additionalData": {"hmacSignature": "abc123..."}
                }

        Returns:
            True if signature valid.

        Raises:
            ValueError: If verification fails or key not configured.
        """
        if not self.hmac_key:
            raise ValueError("ADYEN_HMAC_KEY required for webhook verification")
        
        additional_data = item.get("additionalData", {})
        received_signature = additional_data.get("hmacSignature", "")
        
        if not received_signature:
            logger.warning("Adyen notification has no hmacSignature")
            raise ValueError("No HMAC signature in notification")
        
        # Step 1: Extract fields in EXACT required order
        fields = [
            # pspReference
            item.get("pspReference") or "",
            # originalReference (for refunds, captures, etc.)
            item.get("originalReference") or "",
            # merchantAccount
            item.get("merchantAccount") or "",
            # merchantReference
            item.get("merchantReference") or "",
            # amount.value (as string; convert int to string)
            str(item.get("amount", {}).get("value")) if item.get("amount") else "",
            # amount.currency
            item.get("amount", {}).get("currency") or "",
            # eventCode
            item.get("eventCode") or "",
            # success (lowercase "true" or "false")
            (item.get("success") or "").lower(),
        ]
        
        # Step 2: Join with colon separator
        signing_string = ":".join(fields)
        
        # Step 3: Compute HMAC-SHA256
        # Adyen HMAC key is Base64-encoded, so decode first
        key_bytes = base64.b64decode(self.hmac_key)
        
        mac = hmac.new(
            key_bytes,
            signing_string.encode("utf-8"),
            hashlib.sha256,
        )
        
        expected_signature = base64.b64encode(mac.digest()).decode("utf-8")
        
        # Step 4: Compare (case-insensitive per Adyen docs)
        if hmac.compare_digest(expected_signature.lower(), received_signature.lower()):
            logger.info("Adyen webhook signature verified")
            return True
        else:
            logger.warning(
                "Adyen webhook signature mismatch: expected=%s received=%s signing_string=%s",
                expected_signature, received_signature, signing_string
            )
            raise ValueError("Adyen webhook HMAC verification failed")


class AdyenWebhookRouter:
    """Routes verified Adyen webhooks to handlers."""
    
    def __init__(self, verifier: AdyenWebhookVerifier | None = None):
        self.verifier = verifier or AdyenWebhookVerifier()
        self._handlers: dict[str, Callable[[dict[str, Any]], None]] = {}
    
    def on(self, event_code: str) -> Callable[[Callable], Callable]:
        """Decorator: @router.on("AUTHORISATION")"""
        def decorator(handler: Callable[[dict[str, Any]], None]) -> Callable[[dict[str, Any]], None]:
            self._handlers[event_code] = handler
            return handler
        return decorator
    
    def verify_and_dispatch(
        self,
        notification_request: dict[str, Any],
    ) -> list[tuple[bool, str]]:
        """Verify and process all notification items.

        Adyen notification request structure:
        {
            "live": "false",
            "notificationItems": [
                {
                    "NotificationRequestItem": {
                        "pspReference": "...",
                        "eventCode": "AUTHORISATION",
                        "success": "true",
                        ...
                    }
                }
            ]
        }

        Returns:
            List of (handled_bool, event_code) tuples.
        """
        items = notification_request.get("notificationItems", [])
        results: list[tuple[bool, str]] = []
        
        for item_wrapper in items:
            item = item_wrapper.get("NotificationRequestItem", {})
            event_code = item.get("eventCode", "UNKNOWN")
            success = item.get("success", "false").lower() == "true"
            psp_ref = item.get("pspReference")
            
            logger.info(
                "Adyen webhook item: event=%s success=%s psp=%s",
                event_code, success, psp_ref
            )
            
            # Step 1: Verify signature FIRST
            try:
                self.verifier.verify_notification_item(item)
            except ValueError as e:
                logger.error("Adyen webhook verification failed: %s", e)
                # Continue to next item, but don't process
                results.append((False, f"{event_code}:VERIFICATION_FAILED"))
                continue
            
            # Step 2: Look up handler
            handler = self._handlers.get(event_code)
            
            if handler:
                try:
                    handler(item)
                    results.append((True, event_code))
                except Exception:
                    logger.exception("Adyen webhook handler failed for %s", event_code)
                    raise
            else:
                logger.warning("No handler for Adyen webhook event: %s", event_code)
                results.append((False, f"{event_code}:NO_HANDLER"))
        
        return results


# Initialize router
adyen_webhook_router = AdyenWebhookRouter()


@adyen_webhook_router.on("AUTHORISATION")
def on_authorisation(item: dict[str, Any]) -> None:
    """Handle AUTHORISATION event (payment successful).

    This is THE event you need to fulfill orders.

    Item fields:
        pspReference: Unique Adyen reference (store this!)
        merchantReference: Your order/reference ID
        success: "true" = authorised, "false" = not authorised
        amount: {"value": 1000, "currency": "EUR"}
        paymentMethod: Type of payment method
        additionalData: Card info (last4, expiry, etc.) + hmacSignature
    """
    psp_reference = item.get("pspReference")
    merchant_reference = item.get("merchantReference")
    success = item.get("success", "false").lower() == "true"
    amount = item.get("amount", {})
    
    logger.info(
        "Adyen AUTHORISATION: psp=%s ref=%s success=%s amount=%s",
        psp_reference, merchant_reference, success, amount
    )
    
    if success:
        # ✅ Payment successful!
        # 1. Look up order by merchant_reference
        # 2. Store psp_reference for future refunds/reconciliation
        # 3. Mark order as PAID
        # 4. Fulfill order
        pass
    else:
        # Payment failed or was refused
        # 1. Look up order by merchant_reference
        # 2. Mark as FAILED
        # 3. Optionally notify customer
        pass


@adyen_webhook_router.on("CANCEL_OR_REFUND")
def on_cancel_or_refund(item: dict[str, Any]) -> None:
    """Handle CANCEL_OR_REFUND event (payment reversed automatically).

    Fires when:
    - Payment was authorised but not captured within 7 days
    - Risk system automatically reverses the payment
    """
    psp_reference = item.get("pspReference")
    original_reference = item.get("originalReference")  # The original payment
    success = item.get("success", "false").lower() == "true"
    
    logger.info(
        "Adyen CANCEL_OR_REFUND: psp=%s original=%s success=%s",
        psp_reference, original_reference, success
    )


@adyen_webhook_router.on("REFUND")
def on_refund(item: dict[str, Any]) -> None:
    """Handle REFUND event."""
    psp_reference = item.get("pspReference")
    original_reference = item.get("originalReference")  # Original payment pspReference
    success = item.get("success", "false").lower() == "true"
    amount = item.get("amount", {})
    
    logger.info(
        "Adyen REFUND: psp=%s original_payment=%s success=%s amount=%s",
        psp_reference, original_reference, success, amount
    )
    
    if success:
        # ✅ Refund processed
        # 1. Look up payment by original_reference
        # 2. Record refund
        # 3. Notify customer if needed
        pass


@adyen_webhook_router.on("CAPTURE")
def on_capture(item: dict[str, Any]) -> None:
    """Handle CAPTURE event (if using separate auth + capture).

    Note: Most integrations use "auto-capture" which means AUTHORISATION
    is the only event needed. Use this if you do auth then capture later.
    """
    psp_reference = item.get("pspReference")
    original_reference = item.get("originalReference")
    success = item.get("success", "false").lower() == "true"
    
    logger.info(
        "Adyen CAPTURE: psp=%s original=%s success=%s",
        psp_reference, original_reference, success
    )


@adyen_webhook_router.on("REPORT_AVAILABLE")
def on_report_available(item: dict[str, Any]) -> None:
    """Handle REPORT_AVAILABLE event (financial report ready for download).

    Use this for automated reconciliation and finance reporting.

    additionalData contains:
        downloadURL: Temporary URL to download report
        reportType: Type of report
    """
    additional_data = item.get("additionalData", {})
    download_url = additional_data.get("downloadURL")
    report_type = additional_data.get("reportType")
    
    logger.info(
        "Adyen REPORT_AVAILABLE: type=%s url=%s",
        report_type, download_url
    )
    
    # Download the report, parse it, reconcile with your system
```

---

## Constraints

### MUST DO

- Use `adyen` official Python SDK
- Store ALL credentials in environment variables
- Include `merchantAccount` parameter in every request
- Add `Idempotency-Key` header to write operations (`/payments`, `/sessions`, etc.)
- Compute HMAC signature for webhooks in EXACT field order
- Use `pspReference` for tracking, refunds, and support
- Always verify webhooks BEFORE processing
- Handle `success: "true"` vs `"false"` in notifications
- Return `[accepted]` as plain text from webhook endpoint (required by Adyen)
- Use `shopperReference` for recurring payments and risk analysis

### MUST NOT DO

- NEVER hardcode API key, merchant account, or HMAC key in source
- NEVER trust frontend payment result alone — ALWAYS wait for webhook
- NEVER skip HMAC verification on webhooks
- NEVER mix up test vs live environment credentials
- NEVER store card data (PAN, CVV) — use tokenization or Drop-in
- NEVER ignore `additionalData.hmacSignature` (it's your proof)
- NEVER forget `returnUrl` for redirect-based payment methods
- NEVER use floating point for amounts; always convert to integer minor units

---

## Output Template

When implementing Adyen integrations, produce:

1. **Client Factory** — Environment-configured AdyenClient with merchant account
2. **Amount Converter** — Decimal to minor-unit integer with zero/three-decimal currency support
3. **Sessions Flow** — `/sessions` creation for modern Drop-in integration
4. **Classic Payments Flow** — `/payments` + `/payments/details` with 3DS2 action handling
5. **Webhook Handler** — HMAC signature verification in exact field order + router for AUTHORISATION, REFUND, etc.
6. **Idempotency** — UUID v4 keys for all write operations

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-stripe-api` | Stripe for alternative global payment processor |
| `coding-paypal-api` | PayPal for PayPal/Venmo checkout |
| `coding-braintree-api` | Braintree (PayPal-owned) for marketplace payments |
| `coding-shopify-api` | Shopify for ecommerce platform |
| `coding-plaid-api` | Plaid for bank account linking and ACH verification |

---

## Live References

| Resource | URL |
|----------|-----|
| Adyen Python SDK | https://github.com/Adyen/adyen-python |
| Adyen API Reference | https://docs.adyen.com/api-explorer/ |
| Checkout Sessions | https://docs.adyen.com/online-payments/sessions-flow |
| Classic Payments | https://docs.adyen.com/online-payments/classic-integration |
| 3D Secure 2 | https://docs.adyen.com/online-payments/3d-secure/ |
| Webhook Verification | https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures |
| Notification Events | https://docs.adyen.com/development-resources/webhooks/notifications |
| Marketplaces API | https://docs.adyen.com/platforms/ |
| Risk Management | https://docs.adyen.com/risk-management/ |
| Reporting API | https://docs.adyen.com/development-resources/reporting/ |
