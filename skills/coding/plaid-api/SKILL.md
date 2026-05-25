---
name: plaid-api
description: Implements Plaid API integration (Auth, Transactions, Identity, Investments,
  Income) using plaid-python SDK with Link token flow, webhook verification, access
  token storage security, and financial data synchronization patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: plaid, plaid link, plaid auth, plaid transactions, plaid identity, plaid
    investments, plaid income verification, how do i integrate plaid, bank account
    linking
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
  related-skills: coding-stripe-api, coding-shopify-api, coding-paypal-api
------
# Plaid API Integration

Implements production-grade Plaid API integration for bank account linking, transaction data retrieval, identity verification, investment holdings, and income confirmation. When loaded, this skill makes the model implement the `plaid-python` SDK including: Link token creation and frontend Link flow, access token exchange and secure storage, Auth API for account/routing numbers, Transactions API for syncing bank transactions, Identity API for owner verification, Investments API for portfolio data, Income API for employment/income verification, and webhook verification using HMAC-SHA256.

## TL;DR Checklist

- [ ] Use `plaid-python` SDK (not raw HTTP requests)
- [ ] Create `link_token` first; exchange `public_token` → `access_token`
- [ ] Store `access_token` securely (encrypted at rest, NEVER log)
- [ ] Use `client_id`, `secret`, `environment` from environment variables
- [ ] Verify webhooks via `plaid_client.validate_webhook(verification_key, body, headers)`
- [ ] Cursor-based pagination for Transactions sync (`cursor`, `has_more`)
- [ ] Link flow: server creates token → frontend Link → server exchanges public_token
- [ ] Environment: `Sandbox` → `Development` → `Production`

---

## When to Use

Use this skill when:

- Building bank account linking for ACH transfers (Plaid Auth)
- Syncing bank transactions for personal finance apps (Transactions)
- Verifying user identity and account ownership (Identity)
- Accessing investment portfolio data (Investments)
- Confirming employment and income (Income, Income Verification)
- Implementing account balance checks (Balance)
- Building asset verification for lending (Assets)
- Processing webhooks for transaction updates and item status changes
- Verifying account ownership before micro-deposits

---

## When NOT to Use

- For pure payment processing without bank linking — use `coding-stripe-api`
- For PayPal/credit card checkout — use `coding-paypal-api`
- For crypto/blockchain integrations — not Plaid's domain
- When you don't need to access actual bank account data

---

## Core Workflow

1. **Initialize Plaid Client** — Configure `plaid.ApiClient` and `plaid.PlaidApi` using `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENVIRONMENT`. **Checkpoint:** Call `/link/token/create` to verify connectivity.

2. **Create Link Token** — Call `link_token_create()` with: `user.client_user_id`, `products: ["auth", "transactions"]`, `country_codes: ["US"]`, `language: "en"`. **Checkpoint:** Returns `link_token` for frontend Link component.

3. **Frontend Link Flow** — User opens Link, selects bank, logs in, MFA if needed. Link returns `public_token` to frontend, which sends to your backend. **Checkpoint:** public_token expires in 30 minutes — exchange immediately.

4. **Exchange Public Token** — Call `item_public_token_exchange(public_token)` to get `access_token` and `item_id`. **Checkpoint:** `access_token` is PERMANENT (unless revoked), `item_id` is unique bank connection reference.

5. **Store Access Token Securely** — Encrypt `access_token` at rest. Associate with your internal `user_id` and Plaid `item_id`. **Checkpoint:** NEVER log, print, or expose `access_token` to frontend.

6. **Access Product APIs** — Use `access_token` to call: Auth (`auth_get`), Transactions (`transactions_sync`), Identity (`identity_get`), Balance (`accounts_balance_get`), Investments (`investments_holdings_get`). **Checkpoint:** Use cursor-based sync for Transactions (not `transactions_get` v1).

7. **Verify Webhooks** — Use `validate_webhook` to check HMAC signature on incoming webhooks. Handle `DEFAULT_UPDATE` (transactions ready), `NEW_ACCOUNTS_AVAILABLE`, `AUTHENTICATION` (relink needed), `TRANSACTIONS_REMOVED`. **Checkpoint:** Return 200 OK to webhooks after processing.

---

## Implementation Patterns

### Pattern 1: Plaid Client Initialization (BAD vs GOOD)

```python
"""Plaid Python SDK client initialization patterns.

SDK: plaid-python (pip install plaid-python)

Environment variables:
- PLAID_CLIENT_ID: from Plaid Dashboard
- PLAID_SECRET: from Plaid Dashboard (different per environment!)
- PLAID_ENVIRONMENT: sandbox | development | production

CRITICAL: Sandbox, Development, and Production have DIFFERENT secrets.
Using wrong secret = API error.
"""

from __future__ import annotations

import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded secrets, no env management
# ===================================================================

def bad_plaid_init_bad() -> Any:
    """❌ BAD: Hardcoded client_id and secret, no configuration."""
    import plaid
    from plaid.api import plaid_api
    
    # ❌ HARDCODED SECRETS! Never commit these!
    configuration = plaid.Configuration(
        host=plaid.Environment.Sandbox,
        api_key={
            "clientId": "5a...real_client_id_here",
            "secret": "11...real_secret_here",
        }
    )
    
    api_client = plaid.ApiClient(configuration)
    client = plaid_api.PlaidApi(api_client)
    
    return client


# ===================================================================
# ✅ GOOD — environment-based, multi-environment support
# ===================================================================

try:
    import plaid
    from plaid.api import plaid_api
    PLAID_SDK_AVAILABLE = True
except ImportError:
    PLAID_SDK_AVAILABLE = False


def get_plaid_environment() -> plaid.Environment:
    """Get Plaid environment from config.

    Maps env name to plaid.Environment enum:
    - sandbox → plaid.Environment.Sandbox
    - development → plaid.Environment.Development
    - production → plaid.Environment.Production
    """
    env_name = os.environ.get("PLAID_ENVIRONMENT", "sandbox").lower()
    
    if env_name == "production":
        return plaid.Environment.Production
    elif env_name == "development":
        return plaid.Environment.Development
    else:
        return plaid.Environment.Sandbox


def get_plaid_client() -> plaid_api.PlaidApi:
    """Get configured PlaidApi client.

    Reads from environment:
        PLAID_CLIENT_ID
        PLAID_SECRET
        PLAID_ENVIRONMENT

    Returns:
        Configured PlaidApi instance.

    Raises:
        RuntimeError: If plaid-python not installed.
        ValueError: If credentials missing.
    """
    if not PLAID_SDK_AVAILABLE:
        raise RuntimeError("plaid-python not installed. pip install plaid-python")
    
    client_id = os.environ.get("PLAID_CLIENT_ID")
    secret = os.environ.get("PLAID_SECRET")
    
    if not client_id or not secret:
        raise ValueError("PLAID_CLIENT_ID and PLAID_SECRET required in environment")
    
    environment = get_plaid_environment()
    
    configuration = plaid.Configuration(
        host=environment,
        api_key={
            "clientId": client_id,
            "secret": secret,
        }
    )
    
    api_client = plaid.ApiClient(configuration)
    client = plaid_api.PlaidApi(api_client)
    
    return client


def format_plaid_error(e: plaid.ApiException) -> dict[str, Any]:
    """Parse Plaid ApiException into structured error dict.

    Plaid returns JSON error bodies in exceptions.
    Error types: INVALID_REQUEST, INVALID_INPUT, INSTITUTION_ERROR,
                  RATE_LIMIT_EXCEEDED, API_ERROR, ITEM_ERROR,
                  INVALID_LINK_TOKEN, etc.

    See: https://plaid.com/docs/errors/
    """
    import json
    
    try:
        error_body = json.loads(e.body)
        return {
            "error_type": error_body.get("error_type"),
            "error_code": error_body.get("error_code"),
            "error_message": error_body.get("error_message"),
            "display_message": error_body.get("display_message"),
            "request_id": error_body.get("request_id"),
            "status": e.status,
        }
    except Exception:
        return {
            "error_type": "UNKNOWN",
            "error_message": str(e),
            "status": getattr(e, "status", None),
        }
```

### Pattern 2: Link Token Flow (Modern Link)

```python
"""Plaid Link token creation and public token exchange.

This is the MODERN Link flow (recommended since 2020):

1. Server: link_token_create() → returns link_token
2. Frontend: Plaid Link component initialized with link_token
3. User: Links bank account in Link UI
4. Frontend: Receives public_token from Link onSuccess
5. Server: item_public_token_exchange(public_token) → access_token + item_id
6. Server: Stores access_token securely (encrypted!)

OLD flow (deprecated): public_key in frontend → use link_token_create instead.
"""

from __future__ import annotations

from typing import Any, Optional
import plaid


def create_link_token(
    client_user_id: str,  # Your internal user ID
    products: list[str],  # ["auth", "transactions", "identity", "investments", "liabilities"]
    country_codes: list[str] | None = None,
    language: str = "en",
    webhook: str | None = None,
    access_token: str | None = None,  # For update mode (relink expired Item)
    client_name: str | None = None,
    redirect_uri: str | None = None,
) -> dict[str, Any]:
    """Create a Link token for initializing Plaid Link.

    Link tokens are short-lived (expire in 4 hours) and are used
    to initialize the Plaid Link component on the frontend.

    Args:
        client_user_id: Your internal persistent user ID.
        products: List of products to initialize (auth, transactions, etc.).
            First product is "primary product" with special behavior.
        country_codes: List of ISO 3166-1 alpha-2 codes (US, CA, GB, etc.).
            Default: ["US"]
        language: Language code (en, es, fr, etc.).
        webhook: URL for Plaid webhook notifications for this Item.
        access_token: If provided, Link runs in "update mode" to relink.
        client_name: Name of your app shown in Link.
        redirect_uri: For OAuth institutions (required for some banks).

    Returns:
        Dict with link_token, expiration, request_id.

    Common products:
        auth: Account and routing numbers for ACH
        transactions: Transaction history
        identity: Account owner info (name, email, phone, address)
        investments: Investment holdings and transactions
        liabilities: Credit cards, loans, mortgages
        income: Income and employment data
        assets: Asset verification for lending
    """
    client = get_plaid_client()
    
    actual_countries = country_codes or ["US"]
    
    user = {
        "client_user_id": client_user_id,
    }
    
    body: dict[str, Any] = {
        "user": user,
        "client_name": client_name or "My App",
        "products": products,
        "country_codes": actual_countries,
        "language": language,
    }
    
    if webhook:
        body["webhook"] = webhook
    if redirect_uri:
        body["redirect_uri"] = redirect_uri
    if access_token:
        body["access_token"] = access_token  # Update mode
    
    try:
        response = client.link_token_create(body)
        return {
            "link_token": response["link_token"],
            "expiration": response.get("expiration"),
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        logger.error("Plaid link_token_create failed: %s", error)
        raise ValueError(f"Failed to create link token: {error.get('error_message')}") from e


def exchange_public_token(public_token: str) -> dict[str, Any]:
    """Exchange a public_token (from Link success) for access_token and item_id.

    This is the CRITICAL exchange:
    - public_token = short-lived (30 min), from frontend Link onSuccess
    - access_token = PERMANENT, stored securely on your server
    - item_id = unique ID for this bank connection

    Args:
        public_token: The public_token from Link's onSuccess callback.

    Returns:
        Dict with access_token, item_id, request_id.
    """
    client = get_plaid_client()
    
    body = {
        "public_token": public_token,
    }
    
    try:
        response = client.item_public_token_exchange(body)
        return {
            "access_token": response["access_token"],
            "item_id": response["item_id"],
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        logger.error("Plaid public_token exchange failed: %s", error)
        raise ValueError(f"Failed to exchange public token: {error.get('error_message')}") from e


def invalidate_access_token(access_token: str) -> bool:
    """Revoke/invalidate an access_token (user unlinks bank).

    Call this when a user removes/disconnects their bank account.
    Plaid stops sending webhooks and the access_token becomes invalid.

    Returns:
        True if successful.
    """
    client = get_plaid_client()
    
    body = {
        "access_token": access_token,
    }
    
    try:
        client.item_remove(body)
        logger.info("Plaid item removed (access_token revoked)")
        return True
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        logger.warning("Plaid item_remove failed: %s", error)
        raise ValueError(f"Failed to remove item: {error.get('error_message')}") from e
```

### Pattern 3: Auth, Transactions, Identity APIs

```python
"""Core Plaid product APIs: Auth, Transactions, Identity.

These use the permanent access_token obtained from public_token exchange.
"""

from __future__ import annotations

from typing import Any, Optional
import plaid


def auth_get(access_token: str) -> dict[str, Any]:
    """Get account and routing numbers for ACH transfers (Auth product).

    Returns:
        Dict with accounts, numbers, routing info.
    """
    client = get_plaid_client()
    
    body = {
        "access_token": access_token,
    }
    
    try:
        response = client.auth_get(body)
        return {
            "accounts": response.get("accounts", []),
            "numbers": {
                "ach": response.get("numbers", {}).get("ach", []),
                "eft": response.get("numbers", {}).get("eft", []),  # Canada
                "international": response.get("numbers", {}).get("international", []),
                "bacs": response.get("numbers", {}).get("bacs", []),  # UK
            },
            "item": response.get("item"),
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        raise ValueError(f"Auth get failed: {error.get('error_message')}") from e


def transactions_sync(
    access_token: str,
    cursor: str | None = None,  # None = first sync; pass cursor for incremental
    count: int = 100,  # Max 500
) -> dict[str, Any]:
    """Sync transactions using cursor-based pagination (v2, RECOMMENDED).

    This is the MODERN way to get transactions (introduced 2022).
    Replaces old transactions_get which had date-range problems.

    Flow:
    1. First call: cursor=None → returns added since Item creation
    2. Store response.next_cursor
    3. Next call: cursor=stored_next_cursor → returns new/modified/removed
    4. Repeat while has_more=True

    Args:
        access_token: The permanent access token.
        cursor: Cursor from previous sync (None for first sync).
        count: Number per page (max 500).

    Returns:
        Dict with added, modified, removed transactions, cursor, has_more.
    """
    client = get_plaid_client()
    
    body: dict[str, Any] = {
        "access_token": access_token,
        "count": min(count, 500),
    }
    
    if cursor:
        body["cursor"] = cursor
    
    try:
        response = client.transactions_sync(body)
        return {
            "added": response.get("added", []),
            "modified": response.get("modified", []),
            "removed": response.get("removed", []),
            "next_cursor": response.get("next_cursor"),
            "has_more": response.get("has_more", False),
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        raise ValueError(f"Transactions sync failed: {error.get('error_message')}") from e


def sync_all_transactions(
    access_token: str,
    initial_cursor: str | None = None,
) -> dict[str, Any]:
    """Sync ALL transactions by paginating through has_more.

    Handles cursor pagination internally.

    Returns:
        Combined dict of all added, modified, removed, final cursor.
    """
    all_added: list[Any] = []
    all_modified: list[Any] = []
    all_removed: list[Any] = []
    
    cursor = initial_cursor
    
    while True:
        result = transactions_sync(access_token, cursor=cursor, count=500)
        
        all_added.extend(result["added"])
        all_modified.extend(result["modified"])
        all_removed.extend(result["removed"])
        
        cursor = result["next_cursor"]
        
        if not result["has_more"]:
            break
    
    return {
        "added": all_added,
        "modified": all_modified,
        "removed": all_removed,
        "final_cursor": cursor,
    }


def identity_get(access_token: str) -> dict[str, Any]:
    """Get account owner identity information (Identity product).

    Returns owner data from bank: names, emails, phone numbers, addresses.
    Useful for:
    - Verifying user owns the bank account
    - Pre-filling user data in your app
    - KYC/AML compliance checks

    Returns:
        Dict with identity data.
    """
    client = get_plaid_client()
    
    body = {
        "access_token": access_token,
    }
    
    try:
        response = client.identity_get(body)
        return {
            "accounts": response.get("accounts", []),
            "item": response.get("item"),
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        raise ValueError(f"Identity get failed: {error.get('error_message')}") from e


def accounts_balance_get(access_token: str) -> dict[str, Any]:
    """Get real-time account balances.

    Note: Not all institutions support real-time balance updates.
    Some only update balances once per day.

    Returns:
        Dict with accounts containing current/available balance.
    """
    client = get_plaid_client()
    
    body = {
        "access_token": access_token,
    }
    
    try:
        response = client.accounts_balance_get(body)
        return {
            "accounts": response.get("accounts", []),
            "item": response.get("item"),
            "request_id": response.get("request_id"),
        }
    except plaid.ApiException as e:
        error = format_plaid_error(e)
        raise ValueError(f"Balance get failed: {error.get('error_message')}") from e
```

### Pattern 4: Webhook Verification

```python
"""Plaid webhook verification.

Plaid sends webhooks for:
- Transactions: DEFAULT_UPDATE, HISTORICAL_UPDATE, TRANSACTIONS_REMOVED
- Item: ITEM_LOGIN_REQUIRED, ITEM_ERROR, NEW_ACCOUNTS_AVAILABLE, AUTHENTICATION
- Investments: INVESTMENTS_TRANSACTIONS_UPDATE, HOLDINGS_UPDATE
- Income: INCOME_VERIFICATION_UPDATED

CRITICAL: Always verify webhook signature before processing.
Plaid signs webhook body with your secret using HMAC-SHA256.
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import json
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class PlaidWebhookVerifier:
    """Verifies Plaid webhook signatures.

    Two approaches:
    1. SDK's built-in: client.sandbox_verification_webhook() in Sandbox
    2. Manual HMAC-SHA256 verification (shown here, works in all envs)

    The Plaid-SDK provided validator is used in this implementation.
    """
    
    def __init__(self, secret: str | None = None):
        self.secret = secret or os.environ.get("PLAID_SECRET", "")
        if not self.secret:
            logger.warning("Plaid secret not configured for webhook verification")
    
    def verify(
        self,
        request_body: bytes,  # Raw bytes of request body
        plaid_verification_header: str,  # 'plaid-verification' header
    ) -> bool:
        """Verify Plaid webhook signature.

        Plaid computes signature as:
        Base64(HMAC-SHA256(secret, request_body + timestamp_in_header))

        The plaid-verification header format:
        t=1679945075,v0=abc123def456

        Args:
            request_body: Raw bytes from the HTTP request body.
            plaid_verification_header: Full value of 'plaid-verification' header.

        Returns:
            True if verified.

        Raises:
            ValueError: If verification fails.
        """
        if not self.secret:
            raise ValueError("Plaid secret required for webhook verification")
        
        if not plaid_verification_header:
            raise ValueError("Missing plaid-verification header")
        
        # Parse header: t=<timestamp>,v0=<signature>
        parts = plaid_verification_header.split(",")
        timestamp = None
        signature = None
        
        for part in parts:
            key, val = part.split("=", 1)
            if key == "t":
                timestamp = val
            elif key == "v0":
                signature = val
        
        if not timestamp or not signature:
            raise ValueError("Invalid plaid-verification header format")
        
        # Compute expected HMAC: secret, timestamp + "." + body
        # Payload = timestamp + "." + body_as_string
        payload = timestamp.encode("utf-8") + b"." + request_body
        
        # HMAC-SHA256
        mac = hmac.new(
            self.secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        )
        
        expected_signature = base64.b64encode(mac.digest()).decode("utf-8")
        
        # Constant-time comparison to prevent timing attacks
        if hmac.compare_digest(signature, expected_signature):
            logger.info("Plaid webhook signature verified")
            return True
        else:
            logger.warning(
                "Plaid webhook signature mismatch: expected=%s received=%s",
                expected_signature, signature
            )
            raise ValueError("Plaid webhook signature verification failed")


class PlaidWebhookRouter:
    """Routes verified Plaid webhooks to handlers."""
    
    def __init__(self, verifier: PlaidWebhookVerifier | None = None):
        self.verifier = verifier or PlaidWebhookVerifier()
        self._handlers: dict[str, Callable[[dict[str, Any]], None]] = {}
    
    def on(
        self,
        webhook_type: str,
        webhook_code: str | None = None,
    ) -> Callable[[Callable], Callable]:
        """Decorator to register a webhook handler.

        Usage:
            @router.on("TRANSACTIONS", "DEFAULT_UPDATE")
            def handle_transactions_update(event):
                pass

            @router.on("ITEM")  # All ITEM webhooks
            def handle_any_item(event):
                pass
        """
        key = webhook_type
        if webhook_code:
            key = f"{webhook_type}:{webhook_code}"
        
        def decorator(handler: Callable[[dict[str, Any]], None]) -> Callable[[dict[str, Any]], None]:
            self._handlers[key] = handler
            return handler
        return decorator
    
    def verify_and_dispatch(
        self,
        request_body: bytes,
        plaid_verification_header: str,
    ) -> bool:
        """Verify signature and dispatch webhook.

        Returns:
            True if a handler was found and called.
        """
        # Step 1: VERIFY first
        self.verifier.verify(request_body, plaid_verification_header)
        
        # Step 2: Parse JSON
        event = json.loads(request_body.decode("utf-8"))
        
        webhook_type = event.get("webhook_type")  # TRANSACTIONS, ITEM, etc.
        webhook_code = event.get("webhook_code")  # DEFAULT_UPDATE, etc.
        item_id = event.get("item_id")
        
        logger.info(
            "Plaid webhook: type=%s code=%s item=%s",
            webhook_type, webhook_code, item_id
        )
        
        # Try specific handler first (type:code)
        specific_key = f"{webhook_type}:{webhook_code}"
        handler = self._handlers.get(specific_key)
        
        # Fall back to general handler (type only)
        if handler is None:
            handler = self._handlers.get(webhook_type)
        
        if handler:
            try:
                handler(event)
                return True
            except Exception:
                logger.exception(
                    "Plaid webhook handler failed for %s:%s",
                    webhook_type, webhook_code
                )
                raise
        
        logger.warning("No handler found for Plaid webhook: %s:%s", webhook_type, webhook_code)
        return False


# Initialize router
plaid_webhook_router = PlaidWebhookRouter()


@plaid_webhook_router.on("TRANSACTIONS", "DEFAULT_UPDATE")
def on_transactions_default_update(event: dict[str, Any]) -> None:
    """Handle TRANSACTIONS DEFAULT_UPDATE.

    Fires when new transactions are available (or have changed).
    Call transactions_sync with your stored cursor to get changes.

    Event:
        webhook_type: "TRANSACTIONS"
        webhook_code: "DEFAULT_UPDATE"
        item_id: "..."
        new_transactions: 5 (count since last webhook)
        error: null or error object
    """
    item_id = event.get("item_id")
    new_count = event.get("new_transactions", 0)
    
    logger.info(
        "Plaid: %d new transactions available for item %s",
        new_count, item_id
    )
    
    # ✅ Do this:
    # 1. Look up access_token for this item_id in your DB
    # 2. Look up stored cursor for this item_id
    # 3. Call transactions_sync(access_token, cursor)
    # 4. Process added/modified/removed transactions
    # 5. Update stored cursor to next_cursor
    # 6. Repeat while has_more


@plaid_webhook_router.on("ITEM", "LOGIN_REQUIRED")
def on_item_login_required(event: dict[str, Any]) -> None:
    """Handle ITEM LOGIN_REQUIRED (bank needs relink).

    Fires when Plaid can no longer access the bank — user changed password,
    MFA requirement changed, bank updated login flow.

    Action: Create Link token in "update mode" and ask user to relink.
    """
    item_id = event.get("item_id")
    logger.warning("Plaid Item needs relink: item_id=%s", item_id)
    
    # ✅ Do this:
    # 1. Mark user in your DB as "needs bank relink"
    # 2. When user logs in, show: "Your bank needs to be reconnected"
    # 3. Call create_link_token with access_token=... to enter update mode
    # 4. Link opens in "update credentials" mode automatically


@plaid_webhook_router.on("TRANSACTIONS", "TRANSACTIONS_REMOVED")
def on_transactions_removed(event: dict[str, Any]) -> None:
    """Handle TRANSACTIONS TRANSACTIONS_REMOVED.

    Fires when transactions are removed (bank corrected data, merchant
    updated transaction, etc.).

    Event includes list of removed_transaction_ids.
    """
    item_id = event.get("item_id")
    removed_ids = event.get("removed_transactions", [])
    
    logger.info(
        "Plaid: %d transactions removed for item %s",
        len(removed_ids), item_id
    )
    
    # ✅ Do this:
    # Delete or mark as removed these transaction_ids in your DB


@plaid_webhook_router.on("ITEM", "NEW_ACCOUNTS_AVAILABLE")
def on_new_accounts_available(event: dict[str, Any]) -> None:
    """Handle ITEM NEW_ACCOUNTS_AVAILABLE.

    Fires when user added a new account at their bank, or when Plaid
    gains access to additional accounts that were previously hidden.

    Call accounts_get or auth_get to see new accounts.
    """
    item_id = event.get("item_id")
    logger.info("Plaid: new accounts available for item %s", item_id)
```

---

## Constraints

### MUST DO

- Use `plaid-python` official SDK (not raw requests)
- Use modern Link flow: `link_token_create` → frontend Link → `public_token_exchange`
- Store `access_token` encrypted at rest; treat like API keys/passwords
- Use cursor-based `transactions_sync` (v2), not old `transactions_get` (v1)
- Verify webhook signatures via HMAC-SHA256 comparison
- Use constant-time comparison (`hmac.compare_digest`) for HMAC verification
- Handle `ITEM_LOGIN_REQUIRED` webhook with Link update mode for relinking
- Separate Sandbox/Development/Production credentials (each has different secret)
- Pass your persistent `client_user_id` in link_token_create user field

### MUST NOT DO

- NEVER hardcode `client_id` or `secret` in source code
- NEVER log, print, or expose `access_token` (treat like passwords)
- NEVER expose `access_token` to frontend code (public_token only!)
- NEVER use deprecated `public_key` Link flow; always use `link_token_create`
- NEVER skip webhook signature verification
- NEVER use wrong environment secret (sandbox vs development vs production)
- NEVER ignore `ITEM_LOGIN_REQUIRED` webhooks (Item will stop syncing)
- NEVER reuse cursors incorrectly in `transactions_sync` (always use `next_cursor`)
- NEVER store raw bank account/routing numbers without encryption (Auth product)

---

## Output Template

When implementing Plaid integrations, produce:

1. **Client Factory** — Environment-based PlaidApi with multi-environment support
2. **Link Flow** — `link_token_create` + `public_token_exchange` + secure access_token storage
3. **Error Parser** — Structured `ApiException` parsing with error_type/error_code
4. **Transaction Sync** — Cursor-based `transactions_sync` with has_more pagination
5. **Webhook Handler** — HMAC signature verification + router for TRANSACTIONS/ITEM webhooks
6. **Product Functions** — `auth_get`, `identity_get`, `accounts_balance_get` wrappers

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-stripe-api` | Stripe for ACH payments after Plaid Auth gets account numbers |
| `coding-shopify-api` | Shopify for ecommerce with bank payout data |
| `coding-paypal-api` | PayPal for alternative payment methods |
| `coding-braintree-api` | Braintree marketplace payments |

---

## Live References

| Resource | URL |
|----------|-----|
| Plaid Python SDK | https://github.com/plaid/plaid-python |
| Plaid API Reference | https://plaid.com/docs/api/ |
| Link Token Flow | https://plaid.com/docs/link/ |
| Auth API | https://plaid.com/docs/api/products/auth/ |
| Transactions Sync | https://plaid.com/docs/api/products/transactions/#transactionssync |
| Identity API | https://plaid.com/docs/api/products/identity/ |
| Investments API | https://plaid.com/docs/api/products/investments/ |
| Webhook Verification | https://plaid.com/docs/api/webhooks/webhook-verification/ |
| Error Codes | https://plaid.com/docs/errors/ |
| Plaid Dashboard | https://dashboard.plaid.com/ |
