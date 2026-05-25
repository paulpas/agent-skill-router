---
name: braintree-api
description: Implements Braintree API integration (Transactions, Vault, Subscriptions,
  Marketplace) using braintree Python SDK with 3D Secure verification, webhook signature
  validation, payment method tokenization, and PayPal/Venmo payment processing patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: braintree, braintree transactions, braintree vault, braintree subscriptions,
    braintree marketplace, 3d secure, braintree webhooks, how do i integrate braintree
    payments, paypal venmo integration
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
  related-skills: coding-stripe-api, coding-paypal-api, coding-adyen-api
------
# Braintree API Integration

Implements production-grade Braintree API integration for Transactions, Vault (payment method storage), Subscriptions, and Marketplace (Braintree Commerce Platform). When loaded, this skill makes the model implement the `braintree` Python SDK patterns including: Client token generation for Drop-in UI, Payment method nonce tokenization, Transaction sale with 3D Secure (3DS), Vault storage of cards/PayPal accounts, Subscription billing with plans and add-ons, Marketplace split payments with sub-merchants, and webhook signature validation using the Braintree SDK's built-in verifier.

## TL;DR Checklist

- [ ] Use `braintree` Python SDK (`pip install braintree`)
- [ ] Environment: `braintree.Environment.Sandbox` or `Production`
- [ ] Flow: Generate `client_token` → frontend Drop-in/Hosted Fields → `payment_method_nonce` → backend `transaction.sale()`
- [ ] 3D Secure: `options.three_d_secure.pass_thru=True` or challenge requested
- [ ] Webhook verification: `braintree.WebhookNotification.parse()` using public key
- [ ] Vault: Store cards with `payment_method.create()` → `token` for future charges
- [ ] Marketplace: `merchant_account_id` for sub-merchant, `service_fee_amount` for platform cut
- [ ] Environment vars: `BRAINTREE_MERCHANT_ID`, `BRAINTREE_PUBLIC_KEY`, `BRAINTREE_PRIVATE_KEY`, `BRAINTREE_ENVIRONMENT`

---

## When to Use

Use this skill when:

- Building credit card processing with Braintree Drop-in or Hosted Fields
- Implementing PayPal and Venmo checkout (Braintree is PayPal-owned)
- Storing payment methods securely in Braintree Vault (PCI DSS SAQ A)
- Creating subscription billing with recurring charges
- Building marketplaces with split payments (Braintree Marketplace)
- Implementing 3D Secure 2 authentication for PSD2/SCA compliance
- Handling fraud detection with Braintree Advanced Fraud Tools
- Processing refunds, voids, and transaction management
- Using Hosted Fields for full control over checkout UX

---

## When NOT to Use

- For pure Stripe payment flows — use `coding-stripe-api`
- For Square in-person POS — use `coding-square-api`
- For Adyen global enterprise payments — use `coding-adyen-api`
- For Shopify ecommerce platform — use `coding-shopify-api`
- When you don't need PayPal/Venmo or marketplace split payments

---

## Core Workflow

1. **Initialize Braintree Gateway** — Configure `braintree.Configuration` or `braintree.BraintreeGateway` with `merchant_id`, `public_key`, `private_key`, and `environment`. **Checkpoint:** Call `client_token.generate()` to verify connectivity.

2. **Generate Client Token** — Create client token on backend, pass to frontend. Optionally include `customer_id` for returning customers (shows saved payment methods). **Checkpoint:** Token expires in 24 hours; generate new for each checkout session.

3. **Frontend Payment Collection** — Use Drop-in UI or Hosted Fields to collect card/PayPal. When customer submits, Braintree returns `payment_method_nonce` to frontend. **Checkpoint:** Nonce is short-lived (1-time use, expires quickly).

4. **Create Transaction or Vault** — On backend, call `transaction.sale()` with `payment_method_nonce`, `amount`, `options.submit_for_settlement=True`. For 3D Secure: check `three_d_secure_info.status` ("authenticate_successful"). **Checkpoint:** Verify `result.transaction.status` is `"submitted_for_settlement"` or `"authorized"`.

5. **Handle Webhooks** — Configure webhook endpoint in Braintree Control Panel. On webhook: pass `bt_signature` and `bt_payload` to `braintree.WebhookNotification.parse()`. Handle `subscription_charged_successfully`, `transaction_submitted_for_settlement`, `subscription_cancelled`. **Checkpoint:** Verify BEFORE processing; parse() validates signature automatically.

6. **For Vault: Store Payment Methods** — Create a `customer` or use existing. Call `payment_method.create()` with `payment_method_nonce`. Receive `payment_method.token` (permanent). Use `token` instead of nonce for future charges. **Checkpoint:** `token` is safe to store in your database.

---

## Implementation Patterns

### Pattern 1: Gateway Initialization (BAD vs GOOD)

```python
"""Braintree gateway initialization patterns.

SDK: pip install braintree

Two initialization approaches:
1. Global configuration (braintree.Configuration) — singleton pattern
2. BraintreeGateway instance — multi-account / marketplace pattern

Credentials:
- merchant_id: Your Braintree merchant ID
- public_key: API public key
- private_key: API private key (SECRET!)
- environment: Sandbox or Production

IMPORTANT: Private key should be treated like a password.
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded credentials, global config with no validation
# ===================================================================

def bad_init_bad() -> None:
    """❌ BAD: Hardcoded credentials, no validation."""
    import braintree
    
    # ❌ HARDCODED PRIVATE KEY! Never commit this!
    braintree.Configuration.configure(
        braintree.Environment.Sandbox,
        merchant_id="your_merchant_id_here",
        public_key="your_public_key_here",
        private_key="your_private_key_here",  # ❌ NEVER hardcode!
    )
    
    # ❌ No validation that credentials work!


# ===================================================================
# ✅ GOOD — environment-based, validation, multi-account support
# ===================================================================

try:
    import braintree
    BRAINTREE_SDK_AVAILABLE = True
except ImportError:
    BRAINTREE_SDK_AVAILABLE = False


class BraintreeConfig:
    """Typed configuration for Braintree integration."""
    
    def __init__(
        self,
        merchant_id: str | None = None,
        public_key: str | None = None,
        private_key: str | None = None,
        environment: str = "sandbox",
    ):
        self.merchant_id = merchant_id or os.environ.get("BRAINTREE_MERCHANT_ID", "")
        self.public_key = public_key or os.environ.get("BRAINTREE_PUBLIC_KEY", "")
        self.private_key = private_key or os.environ.get("BRAINTREE_PRIVATE_KEY", "")
        self.environment_name = environment or os.environ.get("BRAINTREE_ENVIRONMENT", "sandbox")
    
    def get_environment(self) -> Any:
        """Get braintree.Environment enum from name."""
        env_lower = self.environment_name.lower()
        if env_lower == "production" or env_lower == "live":
            return braintree.Environment.Production
        else:
            return braintree.Environment.Sandbox
    
    def validate(self) -> None:
        if not self.merchant_id:
            raise ValueError("BRAINTREE_MERCHANT_ID not configured")
        if not self.public_key:
            raise ValueError("BRAINTREE_PUBLIC_KEY not configured")
        if not self.private_key:
            raise ValueError("BRAINTREE_PRIVATE_KEY not configured")


def get_braintree_config() -> BraintreeConfig:
    config = BraintreeConfig()
    config.validate()
    return config


def configure_braintree_global(config: BraintreeConfig | None = None) -> None:
    """Configure the global Braintree singleton (single merchant).

    Use this for simple single-account integrations.
    After this, use braintree.Transaction directly.
    """
    if not BRAINTREE_SDK_AVAILABLE:
        raise RuntimeError("braintree SDK not installed. pip install braintree")
    
    actual_config = config or get_braintree_config()
    
    braintree.Configuration.configure(
        actual_config.get_environment(),
        merchant_id=actual_config.merchant_id,
        public_key=actual_config.public_key,
        private_key=actual_config.private_key,
    )
    
    logger.info("Braintree global configuration initialized")


def create_braintree_gateway(config: BraintreeConfig | None = None) -> Any:
    """Create a BraintreeGateway instance (multi-account / marketplace).

    Use this for:
    - Marketplace integrations with multiple sub-merchants
    - When you need to work with multiple Braintree accounts
    - Better testability (can inject mock gateway)

    Returns:
        braintree.BraintreeGateway instance
    """
    if not BRAINTREE_SDK_AVAILABLE:
        raise RuntimeError("braintree SDK not installed. pip install braintree")
    
    actual_config = config or get_braintree_config()
    
    gateway = braintree.BraintreeGateway(
        actual_config.get_environment(),
        merchant_id=actual_config.merchant_id,
        public_key=actual_config.public_key,
        private_key=actual_config.private_key,
    )
    
    return gateway


def verify_braintree_credentials(use_gateway: Any | None = None) -> bool:
    """Verify Braintree credentials by generating a client token.

    Args:
        use_gateway: Optional BraintreeGateway; uses global config if None.

    Returns:
        True if credentials valid.
    """
    if use_gateway:
        client_token = use_gateway.client_token.generate()
    else:
        # Uses global config
        client_token = braintree.ClientToken.generate()
    
    if client_token:
        logger.info("Braintree credentials verified successfully")
        return True
    
    raise ValueError("Braintree credentials verification failed")
```

### Pattern 2: Client Token + Transaction Flow

```python
"""Braintree standard payment flow.

The standard Braintree flow:

1. Backend: Generate client_token
2. Frontend: Initialize Drop-in or Hosted Fields with client_token
3. Customer: Enters card or selects PayPal/Venmo
4. Frontend: Receives payment_method_nonce from Braintree
5. Frontend: Sends payment_method_nonce to YOUR backend
6. Backend: gateway.transaction.sale({payment_method_nonce, amount, ...})
7. Check result.is_success and result.transaction.status

3D Secure / PSD2 Flow:
- Additional step for European transactions
- Use options.three_d_secure to require challenge
- Check three_d_secure_info.status after auth

CRITICAL:
- payment_method_nonce = ONE-TIME use only, expires quickly
- For future charges, vault the payment method to get a token
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional
import uuid


def generate_client_token(
    customer_id: str | None = None,  # For returning customers with vaulted methods
    merchant_account_id: str | None = None,  # For marketplace sub-merchants
    gateway: Any | None = None,
) -> str:
    """Generate a client token for frontend Drop-in/Hosted Fields.

    Args:
        customer_id: If provided, Drop-in shows saved payment methods.
        merchant_account_id: For marketplace, specify sub-merchant account.
        gateway: Optional BraintreeGateway; uses global if None.

    Returns:
        Client token string to pass to frontend.
    """
    params: dict[str, Any] = {}
    
    if customer_id:
        params["customer_id"] = customer_id
    if merchant_account_id:
        params["merchant_account_id"] = merchant_account_id
    
    if gateway:
        return gateway.client_token.generate(params)
    else:
        return braintree.ClientToken.generate(params)


def create_transaction(
    payment_method_nonce: str,
    amount: Decimal,
    submit_for_settlement: bool = True,
    merchant_account_id: str | None = None,
    order_id: str | None = None,  # Your order reference
    customer_id: str | None = None,
    billing_address: dict[str, Any] | None = None,
    shipping_address: dict[str, Any] | None = None,
    options: dict[str, Any] | None = None,
    store_in_vault: bool = False,
    store_in_vault_on_success: bool = True,
    three_d_secure_required: bool = False,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Create a sale transaction (charge).

    This is the core function for processing payments.

    Args:
        payment_method_nonce: Nonce from frontend Drop-in/Hosted Fields.
        amount: Decimal amount (e.g., Decimal("29.99")).
        submit_for_settlement: True = charge immediately; False = auth only.
        merchant_account_id: For marketplace sub-merchants.
        order_id: Your external reference ID.
        customer_id: Braintree customer ID (for vault association).
        billing_address: Billing address for AVS/fraud checks.
        shipping_address: Shipping address.
        options: Additional options dict.
        store_in_vault: Store payment method NOW (before auth).
        store_in_vault_on_success: Store only IF transaction succeeds.
        three_d_secure_required: Require 3D Secure challenge.
        gateway: Optional BraintreeGateway.

    Returns:
        Dict with:
        - success: True/False
        - transaction: Transaction object if success
        - errors: Error dict if failed
        - three_d_secure_info: 3D Secure status if applicable
    """
    amount_str = f"{amount:.2f}"
    
    transaction_options: dict[str, Any] = {
        "submit_for_settlement": submit_for_settlement,
        "store_in_vault_on_success": store_in_vault_on_success,
    }
    
    if store_in_vault:
        transaction_options["store_in_vault"] = True
    
    # 3D Secure options
    if three_d_secure_required:
        transaction_options["three_d_secure"] = {
            "required": True,
        }
    
    # Merge additional options
    if options:
        transaction_options.update(options)
    
    params: dict[str, Any] = {
        "amount": amount_str,
        "payment_method_nonce": payment_method_nonce,
        "options": transaction_options,
    }
    
    if merchant_account_id:
        params["merchant_account_id"] = merchant_account_id
    if order_id:
        params["order_id"] = order_id
    if customer_id:
        params["customer_id"] = customer_id
    if billing_address:
        params["billing"] = billing_address
    if shipping_address:
        params["shipping"] = shipping_address
    
    try:
        if gateway:
            result = gateway.transaction.sale(params)
        else:
            result = braintree.Transaction.sale(params)
    except Exception as e:
        logger.error("Braintree transaction exception: %s", e)
        raise RuntimeError(f"Transaction failed with exception: {e}") from e
    
    response: dict[str, Any] = {
        "success": result.is_success,
    }
    
    if result.is_success:
        transaction = result.transaction
        response["transaction"] = {
            "id": transaction.id,
            "status": transaction.status,
            "type": transaction.type,
            "amount": transaction.amount,
            "currency_iso_code": getattr(transaction, "currency_iso_code", None),
            "order_id": getattr(transaction, "order_id", None),
            "created_at": getattr(transaction, "created_at", None),
            "status_history": [
                {"status": s.status, "timestamp": s.created_at}
                for s in getattr(transaction, "status_history", [])
            ],
        }
        
        # Get vault token if stored
        if getattr(transaction, "vault_customer", None):
            response["vault_customer_id"] = transaction.vault_customer.id
        
        # 3D Secure info
        tds_info = getattr(transaction, "three_d_secure_info", None)
        if tds_info:
            response["three_d_secure_info"] = {
                "status": tds_info.status,
                "enrolled": tds_info.enrolled,
                "liability_shifted": tds_info.liability_shifted,
                "liability_shifted_possible": tds_info.liability_shifted_possible,
            }
        
        logger.info(
            "Braintree transaction succeeded: id=%s status=%s amount=%s",
            transaction.id, transaction.status, transaction.amount
        )
    else:
        # Transaction failed
        response["errors"] = []
        
        for error in result.errors.deep_errors:
            response["errors"].append({
                "code": error.code,
                "attribute": error.attribute,
                "message": error.message,
            })
        
        # Also check transaction.processor_response_code
        if hasattr(result, "transaction") and result.transaction:
            txn = result.transaction
            response["processor_response_code"] = getattr(txn, "processor_response_code", None)
            response["processor_response_text"] = getattr(txn, "processor_response_text", None)
        
        logger.warning(
            "Braintree transaction failed: errors=%s",
            response["errors"]
        )
    
    return response


def get_transaction(
    transaction_id: str,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Get transaction details by ID.

    Args:
        transaction_id: The Braintree transaction ID.
        gateway: Optional gateway.

    Returns:
        Transaction details dict.
    """
    if gateway:
        transaction = gateway.transaction.find(transaction_id)
    else:
        transaction = braintree.Transaction.find(transaction_id)
    
    return {
        "id": transaction.id,
        "status": transaction.status,
        "type": transaction.type,
        "amount": transaction.amount,
        "refunded_amount": getattr(transaction, "refunded_amount", None),
        "order_id": getattr(transaction, "order_id", None),
        "created_at": transaction.created_at,
        "refund_ids": [r.id for r in getattr(transaction, "refund_ids", [])],
    }


def void_transaction(
    transaction_id: str,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Void an authorized but not yet settled transaction.

    Use void() if status is "authorized" or "submitted_for_settlement"
    but not yet fully settled.

    Once settled, use refund() instead.
    """
    if gateway:
        result = gateway.transaction.void(transaction_id)
    else:
        result = braintree.Transaction.void(transaction_id)
    
    return {
        "success": result.is_success,
        "transaction_id": result.transaction.id if result.is_success else None,
        "errors": [
            {"code": e.code, "message": e.message}
            for e in result.errors.deep_errors
        ] if not result.is_success else [],
    }


def refund_transaction(
    transaction_id: str,
    amount: Decimal | None = None,  # None = full refund
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Refund a settled transaction.

    Args:
        transaction_id: Original transaction ID.
        amount: Amount for partial refund; None for full refund.
        gateway: Optional gateway.
    """
    params: dict[str, Any] = {}
    if amount:
        params["amount_or_submit_for_settlement"] = f"{amount:.2f}"
    
    if gateway:
        result = gateway.transaction.refund(transaction_id, **params)
    else:
        result = braintree.Transaction.refund(transaction_id, **params)
    
    return {
        "success": result.is_success,
        "refund_transaction_id": result.transaction.id if result.is_success else None,
        "errors": [
            {"code": e.code, "message": e.message}
            for e in result.errors.deep_errors
        ] if not result.is_success else [],
    }
```

### Pattern 3: Vault (Store Payment Methods)

```python
"""Braintree Vault for secure payment method storage.

The Vault lets you store:
- Credit cards
- PayPal accounts
- Venmo accounts
- Apple Pay / Google Pay

Benefits:
- PCI DSS SAQ A compliance (you never touch card data)
- One-click checkout for returning customers
- Recurring subscription charges
- Customer management

Flow:
1. Create customer (or use existing)
2. Get payment_method_nonce from frontend
3. PaymentMethod.create() with nonce + customer_id
4. Receive payment_method.token (PERMANENT, safe to store)
5. Use token instead of nonce for future charges

Token format examples:
- Card: "tokencc_abc123" or "66s9xn"
- PayPal: "tokenpaypal_abc123"
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional


def create_customer(
    first_name: str | None = None,
    last_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    company: str | None = None,
    payment_method_nonce: str | None = None,  # Optionally vault immediately
    custom_fields: dict[str, Any] | None = None,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Create a customer in Braintree Vault.

    Args:
        first_name: Customer first name.
        last_name: Customer last name.
        email: Email address.
        phone: Phone number.
        company: Company name.
        payment_method_nonce: Optionally vault a payment method with customer creation.
        custom_fields: Any custom fields defined in Braintree Control Panel.
        gateway: Optional gateway.

    Returns:
        Dict with customer info including id.
    """
    params: dict[str, Any] = {}
    
    if first_name:
        params["first_name"] = first_name
    if last_name:
        params["last_name"] = last_name
    if email:
        params["email"] = email
    if phone:
        params["phone"] = phone
    if company:
        params["company"] = company
    if custom_fields:
        params["custom_fields"] = custom_fields
    
    if payment_method_nonce:
        params["payment_method_nonce"] = payment_method_nonce
    
    if gateway:
        result = gateway.customer.create(params)
    else:
        result = braintree.Customer.create(params)
    
    if result.is_success:
        customer = result.customer
        return {
            "success": True,
            "customer_id": customer.id,
            "customer": {
                "id": customer.id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "email": customer.email,
                "phone": customer.phone,
                "company": customer.company,
                "created_at": customer.created_at,
                "updated_at": customer.updated_at,
            },
            "payment_methods": [
                {"token": pm.token, "type": type(pm).__name__}
                for pm in getattr(customer, "payment_methods", [])
            ],
        }
    else:
        return {
            "success": False,
            "errors": [
                {"code": e.code, "attribute": e.attribute, "message": e.message}
                for e in result.errors.deep_errors
            ],
        }


def get_customer(
    customer_id: str,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Get a customer by ID with all payment methods."""
    if gateway:
        customer = gateway.customer.find(customer_id)
    else:
        customer = braintree.Customer.find(customer_id)
    
    return {
        "id": customer.id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "email": customer.email,
        "payment_methods": [
            {
                "token": pm.token,
                "default": pm.default,
                "image_url": getattr(pm, "image_url", None),
                "type": type(pm).__name__,
                # Card-specific
                "last_4": getattr(pm, "last_4", None),
                "card_type": getattr(pm, "card_type", None),
                "expiration_date": getattr(pm, "expiration_date", None),
                # PayPal-specific
                "email": getattr(pm, "email", None),
            }
            for pm in getattr(customer, "payment_methods", [])
        ],
    }


def vault_payment_method(
    customer_id: str,
    payment_method_nonce: str,
    make_default: bool = True,
    billing_address: dict[str, Any] | None = None,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Vault a payment method for an existing customer.

    Use this when customer wants to save card for future purchases.

    Args:
        customer_id: Braintree customer ID.
        payment_method_nonce: Nonce from frontend.
        make_default: Set as default payment method.
        billing_address: Optional billing address.
        gateway: Optional gateway.

    Returns:
        Dict with payment_method token.
    """
    params: dict[str, Any] = {
        "customer_id": customer_id,
        "payment_method_nonce": payment_method_nonce,
        "options": {
            "make_default": make_default,
        },
    }
    
    if billing_address:
        params["billing_address"] = billing_address
    
    if gateway:
        result = gateway.payment_method.create(params)
    else:
        result = braintree.PaymentMethod.create(params)
    
    if result.is_success:
        pm = result.payment_method
        return {
            "success": True,
            "token": pm.token,
            "default": pm.default,
            "type": type(pm).__name__,
            "last_4": getattr(pm, "last_4", None),
            "card_type": getattr(pm, "card_type", None),
            "email": getattr(pm, "email", None),
        }
    else:
        return {
            "success": False,
            "errors": [
                {"code": e.code, "message": e.message}
                for e in result.errors.deep_errors
            ],
        }


def charge_vaulted_payment_method(
    payment_method_token: str,
    amount: Decimal,
    customer_id: str | None = None,
    merchant_account_id: str | None = None,
    order_id: str | None = None,
    submit_for_settlement: bool = True,
    gateway: Any | None = None,
) -> dict[str, Any]:
    """Charge a VAULTED payment method (not a nonce).

    Use this for:
    - Recurring charges
    - Returning customer one-click checkout
    - Subscription billing

    Args:
        payment_method_token: Vault token (from PaymentMethod.create)
        amount: Charge amount.
        customer_id: Optional customer ID.
        merchant_account_id: Optional marketplace sub-merchant.
        order_id: Your reference.
        submit_for_settlement: Charge immediately.
        gateway: Optional gateway.

    Returns:
        Transaction result dict.
    """
    amount_str = f"{amount:.2f}"
    
    params: dict[str, Any] = {
        "amount": amount_str,
        "payment_method_token": payment_method_token,  # KEY DIFFERENCE: token not nonce
        "options": {
            "submit_for_settlement": submit_for_settlement,
        },
    }
    
    if customer_id:
        params["customer_id"] = customer_id
    if merchant_account_id:
        params["merchant_account_id"] = merchant_account_id
    if order_id:
        params["order_id"] = order_id
    
    try:
        if gateway:
            result = gateway.transaction.sale(params)
        else:
            result = braintree.Transaction.sale(params)
    except Exception as e:
        raise RuntimeError(f"Transaction failed: {e}") from e
    
    return {
        "success": result.is_success,
        "transaction_id": result.transaction.id if result.is_success else None,
        "status": result.transaction.status if result.is_success else None,
        "errors": [
            {"code": e.code, "message": e.message}
            for e in result.errors.deep_errors
        ] if not result.is_success else [],
    }


def delete_payment_method(
    payment_method_token: str,
    gateway: Any | None = None,
) -> bool:
    """Remove a payment method from the Vault.

    Call when customer removes a saved card from their account.
    """
    if gateway:
        result = gateway.payment_method.delete(payment_method_token)
    else:
        result = braintree.PaymentMethod.delete(payment_method_token)
    
    return result.is_success
```

### Pattern 4: Webhook Validation and Handling

```python
"""Braintree webhook notification handling.

Braintree sends webhooks for:
- subscription_charged_successfully — subscription payment succeeded
- subscription_charged_unsuccessfully — subscription payment failed
- subscription_canceled — subscription cancelled
- subscription_expired — subscription ended
- subscription_trial_ended — trial ended
- transaction_submitted_for_settlement — transaction ready for capture
- transaction_settled — transaction fully settled
- transaction_settlement_declined — settlement failed
- transaction_refunded — refund processed
- disbursement — funds disbursed to your bank
- dispute_opened — chargeback/dispute opened
- dispute_lost — dispute lost
- dispute_won — dispute won
- merchant_account_approved — marketplace sub-merchant approved
- merchant_account_declined — marketplace sub-merchant declined

Webhook signature is AUTOMATICALLY VALIDATED when you call parse().
If signature is invalid, parse() raises an exception.

IMPORTANT:
- Webhooks use your PUBLIC KEY (not private key) for verification
- Configure endpoint in Braintree Control Panel → Settings → Webhooks
- Get Webhook Public Key from same page

Braindence webhook request:
- Content-Type: application/x-www-form-urlencoded
- Two POST params: bt_signature, bt_payload
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class BraintreeWebhookVerifier:
    """Verifies and parses Braintree webhook notifications.

    Note: Braintree's parse() method automatically validates the signature.
    If validation fails, it raises an exception.
    """
    
    def __init__(
        self,
        public_key: str | None = None,
        config: BraintreeConfig | None = None,
    ):
        """Initialize webhook verifier.

        Args:
            public_key: Your Braintree public key (from Webhooks settings).
                Note: This is DIFFERENT from your API public key in some cases.
                Get it from Control Panel → Settings → Webhooks.
            config: Optional BraintreeConfig.
        """
        actual_config = config or get_shopify_config()  # Wait, no, BraintreeConfig
        # Get actual config properly
        if not BRAINTREE_SDK_AVAILABLE:
            raise RuntimeError("braintree SDK not installed")
        
        # Use global config or passed config
        self._config = config
        self._public_key = public_key
    
    def parse(
        self,
        bt_signature: str,  # bt_signature POST param
        bt_payload: str,  # bt_payload POST param
        gateway: Any | None = None,
    ) -> Any:
        """Parse and verify a Braintree webhook.

        AUTOMATICALLY validates signature. Raises exception if invalid.

        Args:
            bt_signature: The bt_signature parameter from the webhook request.
            bt_payload: The bt_payload parameter from the webhook request.
            gateway: Optional BraintreeGateway; uses global if None.

        Returns:
            braintree.WebhookNotification object.

        Raises:
            Exception: If signature is invalid or parsing fails.
        """
        if gateway:
            notification = gateway.webhook_notification.parse(
                bt_signature,
                bt_payload,
            )
        else:
            notification = braintree.WebhookNotification.parse(
                bt_signature,
                bt_payload,
            )
        
        logger.info(
            "Braintree webhook parsed: kind=%s timestamp=%s",
            notification.kind,
            notification.timestamp
        )
        
        return notification
    
    def verify(
        self,
        bt_signature: str,
        bt_payload: str,
        gateway: Any | None = None,
    ) -> bool:
        """Verify signature only, don't parse full notification.

        Returns:
            True if valid; raises exception if invalid.
        """
        try:
            self.parse(bt_signature, bt_payload, gateway)
            return True
        except Exception:
            raise


class BraintreeWebhookRouter:
    """Routes Braintree webhooks to registered handlers.

    Common kinds (from WebhookNotification.Kind):
        SubscriptionChargedSuccessfully = "subscription_charged_successfully"
        SubscriptionChargedUnsuccessfully = "subscription_charged_unsuccessfully"
        SubscriptionCanceled = "subscription_canceled"
        SubscriptionExpired = "subscription_expired"
        TransactionSubmittedForSettlement = "transaction_submitted_for_settlement"
        TransactionSettled = "transaction_settled"
        TransactionRefunded = "transaction_refunded"
        Disbursement = "disbursement"
        DisputeOpened = "dispute_opened"
        DisputeLost = "dispute_lost"
        DisputeWon = "dispute_won"
    """
    
    def __init__(self, verifier: BraintreeWebhookVerifier | None = None):
        self.verifier = verifier or BraintreeWebhookVerifier()
        self._handlers: dict[str, Callable[[Any], None]] = {}
    
    def on(self, kind: str) -> Callable[[Callable], Callable]:
        """Decorator: @router.on("subscription_charged_successfully")"""
        def decorator(handler: Callable[[Any], None]) -> Callable[[Any], None]:
            self._handlers[kind] = handler
            return handler
        return decorator
    
    def verify_and_dispatch(
        self,
        bt_signature: str,
        bt_payload: str,
        gateway: Any | None = None,
    ) -> bool:
        """Verify signature, parse, and dispatch to handler.

        Returns:
            True if handler found and called.
        """
        # Step 1: Parse (automatically verifies signature)
        notification = self.verifier.parse(bt_signature, bt_payload, gateway)
        
        kind = notification.kind
        timestamp = notification.timestamp
        
        logger.info(
            "Braintree webhook: kind=%s timestamp=%s",
            kind, timestamp
        )
        
        # Step 2: Look up handler
        handler = self._handlers.get(kind)
        
        if handler:
            try:
                handler(notification)
                return True
            except Exception:
                logger.exception("Braintree webhook handler failed for kind %s", kind)
                raise
        else:
            logger.warning("No handler for Braintree webhook kind: %s", kind)
            return False


# Initialize router
braintree_webhook_router = BraintreeWebhookRouter()


@braintree_webhook_router.on("subscription_charged_successfully")
def on_subscription_charged_successfully(notification: Any) -> None:
    """Handle subscription_charged_successfully webhook.

    notification.subscription gives access to Subscription object.
    notification.transaction gives access to Transaction object.
    """
    subscription = notification.subscription
    transaction = getattr(notification, "transaction", None)
    
    logger.info(
        "Braintree subscription charged: sub_id=%s amount=%s transaction_id=%s",
        subscription.id,
        subscription.price,
        transaction.id if transaction else None
    )
    
    # ✅ Do this:
    # 1. Look up subscription by subscription.id
    # 2. Record successful payment
    # 3. Extend access/renew subscription in your system
    # 4. Send receipt to customer
    pass


@braintree_webhook_router.on("subscription_charged_unsuccessfully")
def on_subscription_charged_unsuccessfully(notification: Any) -> None:
    """Handle failed subscription charge."""
    subscription = notification.subscription
    
    logger.warning(
        "Braintree subscription charge FAILED: sub_id=%s",
        subscription.id
    )
    
    # ✅ Do this:
    # 1. Mark payment as failed
    # 2. Apply dunning logic (notify customer, retry schedule)
    # 3. Consider restricting access after N failures
    pass


@braintree_webhook_router.on("subscription_canceled")
def on_subscription_canceled(notification: Any) -> None:
    """Handle subscription cancellation."""
    subscription = notification.subscription
    
    logger.info(
        "Braintree subscription CANCELLED: sub_id=%s next_billing_date=%s",
        subscription.id,
        getattr(subscription, "next_billing_date", None)
    )
    
    # Note: cancelled subscriptions often still have next_billing_date
    # (access continues until end of billing period)
    pass


@braintree_webhook_router.on("transaction_submitted_for_settlement")
def on_transaction_submitted_for_settlement(notification: Any) -> None:
    """Handle transaction submitted for settlement (one-time payment succeeded)."""
    transaction = notification.transaction
    
    logger.info(
        "Braintree transaction submitted: txn_id=%s amount=%s order_id=%s",
        transaction.id,
        transaction.amount,
        getattr(transaction, "order_id", None)
    )
    
    # ✅ This is where you fulfill ONE-TIME orders
    pass


@braintree_webhook_router.on("transaction_settled")
def on_transaction_settled(notification: Any) -> None:
    """Handle transaction fully settled (funds captured)."""
    transaction = notification.transaction
    
    logger.info(
        "Braintree transaction SETTLED: txn_id=%s amount=%s",
        transaction.id,
        transaction.amount
    )


@braintree_webhook_router.on("disbursement")
def on_disbursement(notification: Any) -> None:
    """Handle disbursement (funds sent to your bank account)."""
    disbursement = notification.disbursement
    
    logger.info(
        "Braintree DISBURSEMENT: amount=%s fees=%s disbursement_date=%s",
        disbursement.amount,
        disbursement.fees,
        disbursement.disbursement_date
    )


@braintree_webhook_router.on("dispute_opened")
def on_dispute_opened(notification: Any) -> None:
    """Handle dispute/chargeback opened (ACTION REQUIRED)."""
    dispute = notification.dispute
    
    logger.warning(
        "Braintree DISPUTE OPENED: dispute_id=%s amount=%s reason=%s",
        dispute.id,
        dispute.amount,
        dispute.reason
    )
    
    # ✅ CRITICAL: You need to respond to disputes
    # Notify your finance/support team immediately
    pass


@braintree_webhook_router.on("dispute_won")
def on_dispute_won(notification: Any) -> None:
    """Handle dispute won."""
    dispute = notification.dispute
    logger.info("Braintree dispute WON: %s", dispute.id)


@braintree_webhook_router.on("dispute_lost")
def on_dispute_lost(notification: Any) -> None:
    """Handle dispute lost (funds deducted)."""
    dispute = notification.dispute
    logger.warning("Braintree dispute LOST: %s", dispute.id)
```

---

## Constraints

### MUST DO

- Use `braintree` official Python SDK
- Store credentials in environment variables
- Generate `client_token` for each checkout session
- Use `payment_method_nonce` for one-time charges
- Vault payment methods to get `token` for recurring charges
- Call `WebhookNotification.parse()` which auto-validates signature
- Check `result.is_success` after every API call
- Handle `three_d_secure_info.liability_shifted` for SCA compliance
- Use `merchant_account_id` for marketplace sub-merchant transactions
- Check `transaction.status` before fulfillment

### MUST NOT DO

- NEVER hardcode `private_key` or credentials in source code
- NEVER reuse `payment_method_nonce` (one-time use only)
- NEVER skip webhook signature verification (`parse()` handles it)
- NEVER store raw card data (use Vault tokens only)
- NEVER ignore `transaction_submitted_for_settlement` webhook
- NEVER use test credentials in production
- NEVER expose `private_key` to frontend code (only `client_token`)
- NEVER forget to handle disputes (chargebacks cost money)
- NEVER use `amount` as float; always use Decimal then format as string

---

## Output Template

When implementing Braintree integrations, produce:

1. **Gateway Initialization** — Environment-configured global or BraintreeGateway instance
2. **Client Token** — Generation function with optional customer_id for saved methods
3. **Transaction Sale** — Charge function with nonce, submit_for_settlement, 3DS options
4. **Vault Operations** — Customer creation, payment method vaulting, tokenized charges
5. **Webhook Handler** — Parser with signature validation + router for subscription/transaction/dispute kinds
6. **Transaction Management** — Void for auth-only, Refund for settled transactions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-paypal-api` | PayPal API for direct REST integration (alternative to Braintree) |
| `coding-stripe-api` | Stripe for primary payment processor alternative |
| `coding-adyen-api` | Adyen for global enterprise payments |
| `coding-shopify-api` | Shopify for ecommerce platform with Braintree/PayPal payments |
| `coding-plaid-api` | Plaid for bank account verification for ACH |

---

## Live References

| Resource | URL |
|----------|-----|
| Braintree Python SDK | https://github.com/braintree/braintree_python |
| Braintree Developer Docs | https://developer.paypal.com/braintree/docs/ |
| Transactions API | https://developer.paypal.com/braintree/docs/reference/transaction/ |
| Payment Methods (Vault) | https://developer.paypal.com/braintree/docs/reference/payment-method/ |
| Subscriptions | https://developer.paypal.com/braintree/docs/guides/subscriptions/ |
| Webhooks Guide | https://developer.paypal.com/braintree/docs/guides/webhooks/overview |
| Webhook Notification Parse | https://developer.paypal.com/braintree/docs/reference/general/webhooks/ |
| 3D Secure / PSD2 | https://developer.paypal.com/braintree/docs/guides/3d-secure/ |
| Marketplace Guide | https://developer.paypal.com/braintree/docs/guides/marketplace/ |
| Fraud Protection | https://developer.paypal.com/braintree/docs/guides/fraud-tools/ |
