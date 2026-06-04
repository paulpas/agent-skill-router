---
name: shopify-api
description: Implements production-grade Shopify API integration (Admin REST/GraphQL, Storefront, OAuth 2.0, webhooks) using the shopifyapi Python SDK for ecommerce applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: Shopify API, admin REST API, GraphQL API, Storefront API, OAuth 2.0, webhooks, shopifyapi SDK, ecommerce integration
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples]
  archetypes: [tactical, generation]
  anti_triggers: [manual processing, overloading, non-Shopify platforms]
  response_profile:
    verbosity: medium
    directive_strength: high
---

# Shopify API Integration

Implements production-grade Shopify API integration for Admin REST API, Admin GraphQL API, and Storefront API. When loaded, this skill makes the model implement the `shopifyapi` Python SDK patterns including: OAuth 2.0 app installation flow (authorization_code grant), Admin REST API with cursor-based pagination (`page_info`, `limit`), Admin GraphQL API with rate limit handling, Storefront API for customer-facing experiences, webhook HMAC-SHA256 signature verification, API versioning (`2024-01`, etc.), and private app vs custom app authentication patterns.

## TL;DR Checklist

- [ ] Use `shopifyapi` Python SDK (`pip install ShopifyAPI`)
- [ ] OAuth flow: `redirect to /admin/oauth/authorize` → `POST /admin/oauth/access_token`
- [ ] API versioning: use YYYY-MM format in `api_version` (e.g., "2024-01")
- [ ] Webhook verification: HMAC-SHA256 of request body with API_SECRET_KEY
- [ ] Cursor pagination: `page_info` param; use `Link` header for prev/next
- [ ] Private apps: use `API_KEY` + `PASSWORD` (deprecated; prefer custom apps)
- [ ] Custom apps: use access token from OAuth flow
- [ ] Storefront API: uses separate `StorefrontAccessToken`, not Admin token
- [ ] Environment variables: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_API_VERSION`, `SHOPIFY_SCOPES`

## Core Workflow

1. **Configure Shopify App:** Set up app in Shopify Partners: App URL, Allowed redirection URL(s), Scopes (`read_products`, `write_orders`, etc.). **Checkpoint:** Note `API_KEY` (Client ID) and `API_SECRET_KEY` (Client Secret).
2. **Initiate OAuth Flow:** Redirect merchant to: `https://{shop}.myshopify.com/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}`. **Checkpoint:** Generate and store `state` parameter to prevent CSRF.
3. **Exchange Authorization Code:** Merchant approves, Shopify redirects to your `redirect_uri` with `code` and `hmac` and `shop` and `state`. Verify state matches. Call `POST https://{shop}.myshopify.com/admin/oauth/access_token` with `client_id`, `client_secret`, `code`. **Checkpoint:** Response gives `access_token` (permanent, store securely).
4. **Initialize Shopify Client:** Use `ShopifyAPI.Session` or `shopify.Session` with `shop`, `api_version`, `token`. Activate session for SDK calls. **Checkpoint:** Verify by calling `Shopify.Shop.current()`.
5. **Call APIs:** Use: (a) Admin REST: `Shopify.Product.find()`, `Shopify.Order.find()`, etc. with cursor pagination; (b) Admin GraphQL: `Shopify.GraphQL()`; (c) Storefront: Separate token via StorefrontAccessToken API. **Checkpoint:** Handle `429 Too Many Requests` with `Retry-After` header.
6. **Verify Webhooks:** Compute `HMAC-SHA256` of request body using `API_SECRET_KEY` (base64-decode key first). Compare with `X-Shopify-Hmac-Sha256` header. **Checkpoint:** Verify before processing. Return 200 OK after.

## Implementation Patterns

### Pattern 1: OAuth 2.0 Flow and Client Initialization
```python
"""Shopify OAuth 2.0 and client initialization patterns.

SDK: pip install ShopifyAPI (note: capital S in PyPI package name)

Shopify has two authentication modes:
1. OAuth 2.0 (public/custom apps) — RECOMMENDED
2. Private app authentication (API_KEY + PASSWORD) — DEPRECATED

App types:
- Public app: Installable by any merchant, listed in App Store
- Custom app: Built for one specific merchant, not in App Store
- Private app: Legacy, token per merchant (deprecated; use custom apps)
"""

from __future__ import annotations

import os
import hmac
import hashlib
import base64
import secrets
import logging
from typing import Any, Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded credentials, no state (CSRF), no validation
# ===================================================================

def bad_oauth_redirect_bad(shop: str) -> str:
    """❌ BAD: No state parameter (CSRF risk), hardcoded scopes."
    api_key = "d0...hardcoded_key_here"  # ❌ HARDCODED!
    
    # ❌ No state parameter = CSRF vulnerability
    return (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={api_key}&"
        f"scope=read_products,write_orders&"  # ❌ Hardcoded
        f"redirect_uri=https://example.com/callback"  # ❌ Hardcoded
    )


# ===================================================================
# ✅ GOOD — environment-based, state for CSRF, proper validation
# ===================================================================

try:
    import shopify
    SHOPIFY_SDK_AVAILABLE = True
except ImportError:
    # Package may also be imported as ShopifyAPI
    try:
        import ShopifyAPI as shopify
        SHOPIFY_SDK_AVAILABLE = True
    except ImportError:
        SHOPIFY_SDK_AVAILABLE = False


class ShopifyConfig:
    """Typed configuration for Shopify app."""
    
    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        api_version: str | None = None,
        scopes: str | None = None,
        redirect_uri: str | None = None,
        app_url: str | None = None,
    ):
        self.api_key = api_key or os.environ.get("SHOPIFY_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("SHOPIFY_API_SECRET", "")
        self.api_version = api_version or os.environ.get("SHOPIFY_API_VERSION", "2024-01")
        self.scopes = scopes or os.environ.get("SHOPIFY_SCOPES", "read_products")
        self.redirect_uri = redirect_uri or os.environ.get("SHOPIFY_REDIRECT_URI", "")
        self.app_url = app_url or os.environ.get("SHOPIFY_APP_URL", "")
    
    def validate(self) -> None:
        if not self.api_key:
            raise ValueError("SHOPIFY_API_KEY not configured")
        if not self.api_secret:
            raise ValueError("SHOPIFY_API_SECRET not configured")


def get_shopify_config() -> ShopifyConfig:
    config = ShopifyConfig()
    config.validate()
    return config


def generate_oauth_state() -> str:
    """Generate a secure random state parameter for CSRF protection.

    Store this value in session/cookie before redirecting to Shopify,
    then verify it matches the state parameter in the callback.
    """
    return secrets.token_urlsafe(32)


def sanitize_shop_domain(shop: str) -> str:
    """Sanitize and validate the shop domain parameter.

    Shopify shop domains must end with .myshopify.com.
    This prevents open redirect attacks.

    Args:
        shop: The shop parameter from request (e.g., "example.myshopify.com")

    Returns:
        Sanitized shop domain.

    Raises:
        ValueError: If invalid shop domain format.
    """
    if not shop:
        raise ValueError("Shop domain is required")
    
    # Remove https://, http:// prefixes if present
    shop = shop.lower().strip()
    if shop.startswith("https://"):
        shop = shop[8:]
    if shop.startswith("http://"):
        shop = shop[7:]
    
    # Remove trailing slash
    shop = shop.rstrip("/")
    
    # Must end with .myshopify.com
    if not shop.endswith(".myshopify.com"):
        raise ValueError(f"Invalid shop domain: {shop}")
    
    # Basic sanity check for allowed characters
    allowed_chars = set("abcdefghijklmnopqrstuvwxyz0123456789-.")
    if any(c not in allowed_chars for c in shop):
        raise ValueError(f"Invalid characters in shop domain: {shop}")
    
    return shop


def build_oauth_redirect_url(
    shop: str,
    state: str,
    config: ShopifyConfig | None = None,
) -> str:
    """Build the Shopify OAuth authorization URL.

    This is where you redirect the merchant to install your app.

    Args:
        shop: Sanitized .myshopify.com domain
        state: CSRF protection token (store this in session)
        config: Optional ShopifyConfig

    Returns:
        Full authorization URL to redirect to.
    """
    actual_config = config or get_shopify_config()
    sanitized_shop = sanitize_shop_domain(shop)
    
    params = {
        "client_id": actual_config.api_key,
        "scope": actual_config.scopes,
        "redirect_uri": actual_config.redirect_uri,
        "state": state,
        "grant_options[]": "",  # "per-user" for online access mode, empty for offline
    }
    
    query_string = urlencode(params)
    return f"https://{sanitized_shop}/admin/oauth/authorize?{query_string}"


def exchange_authorization_code(
    shop: str,
    code: str,
    config: ShopifyConfig | None = None,
) -> dict[str, Any]:
    """Exchange authorization code for access token (offline access mode).

    Shopify redirects to your redirect_uri with:
    - code: Authorization code (short-lived, 1-time use)
    - hmac: For verification
    - shop: The .myshopify.com domain
    - state: Your CSRF token

    Call this AFTER:
    1. Verifying state matches your stored state
    2. (Optional but recommended) Verifying the hmac parameter

    Args:
        shop: The .myshopify.com domain
        code: The authorization code from callback
        config: Optional config

    Returns:
        Dict with:
        - access_token: Permanent token (store securely!)
        - scope: Granted scopes
        - associated_user: (only for online access mode)
    """
    import requests
    
    actual_config = config or get_shopify_config()
    sanitized_shop = sanitize_shop_domain(shop)
    
    url = f"https://{sanitized_shop}/admin/oauth/access_token"
    
    body = {
        "client_id": actual_config.api_key,
        "client_secret": actual_config.api_secret,
        "code": code,
    }
    
    response = requests.post(url, json=body, timeout=30)
    
    if response.status_code != 200:
        logger.error(
            "Shopify OAuth token exchange failed: status=%d body=%s",
            response.status_code, response.text
        )
        raise RuntimeError(f"Failed to exchange code: {response.status_code}")
    
    data = response.json()
    
    return {
        "access_token": data.get("access_token"),
        "scope": data.get("scope"),
        "associated_user": data.get("associated_user"),
        "expires_in": data.get("expires_in"),  # Only for online tokens
        "associated_user_scope": data.get("associated_user_scope"),
    }


def verify_oauth_callback_hmac(
    params: dict[str, str],  # All query params from callback URL
    config: ShopifyConfig | None = None,
) -> bool:
    """Verify the HMAC signature on OAuth callback parameters.

    Shopify signs the callback query params (code, shop, state, timestamp)
    with your API secret.

    Args:
        params: Dictionary of query params (code, hmac, shop, state, timestamp)
        config: Optional config

    Returns:
        True if signature valid.

    Raises:
        ValueError: If verification fails or no hmac present.
    """
    actual_config = config or get_shopify_config()
    
    received_hmac = params.get("hmac", "")
    if not received_hmac:
        raise ValueError("No hmac parameter in callback")
    
    # Build message: sorted key=value pairs joined by &, excluding hmac
    # Keys: code, shop, state, timestamp (alphabetical order EXCEPT hmac)
    sorted_params = sorted(params.items())
    message_parts = []
    for key, value in sorted_params:
        if key != "hmac":
            message_parts.append(f"{key}={value}")
    
    message = "&".join(message_parts)
    
    # Compute HMAC-SHA256
    key_bytes = actual_config.api_secret.encode("utf-8")
    message_bytes = message.encode("utf-8")
    
    computed_hmac = hmac.new(key_bytes, message_bytes, hashlib.sha256).hexdigest()
    
    # Constant-time comparison
    if hmac.compare_digest(computed_hmac, received_hmac):
        logger.info("Shopify OAuth callback HMAC verified")
        return True
    else:
        logger.warning(
            "Shopify OAuth HMAC mismatch: computed=%s received=%s",
            computed_hmac, received_hmac
        )
        raise ValueError("OAuth callback HMAC verification failed")


def init_shopify_session(
    shop: str,
    access_token: str,
    config: ShopifyConfig | None = None,
) -> Any:
    """Initialize and activate a Shopify API session.

    After this call, you can use:
    - shopify.Product.find()
    - shopify.Order.find()
    - shopify.GraphQL().execute()
    - etc.

    Args:
        shop: .myshopify.com domain
        access_token: OAuth access token
        config: Optional config

    Returns:
        The activated session.
    """
    if not SHOPIFY_SDK_AVAILABLE:
        raise RuntimeError("Shopify SDK not installed. pip install ShopifyAPI")
    
    actual_config = config or get_shopify_config()
    sanitized_shop = sanitize_shop_domain(shop)
    
    # Clear any previous session
    shopify.ShopifyResource.clear_session()
    
    # Create new session
    session = shopify.Session(
        sanitized_shop,
        actual_config.api_version,
        access_token,
    )
    
    # Activate it
    shopify.ShopifyResource.activate_session(session)
    
    logger.info("Shopify session activated for shop: %s", sanitized_shop)
    return session


def verify_access_token(shop: str, access_token: str) -> dict[str, Any]:
    """Verify that an access token is still valid by fetching Shop.current().

    Call this:
    - After OAuth to verify token works
    - Periodically to check if app was uninstalled (token revoked)

    Returns:
        Shop info dict.
    """
    init_shopify_session(shop, access_token)
    
    try:
        shop_info = shopify.Shop.current()
        return {
            "id": shop_info.id,
            "name": shop_info.name,
            "email": shop_info.email,
            "domain": shop_info.domain,
            "myshopify_domain": shop_info.myshopify_domain,
            "currency": shop_info.currency,
            "timezone": shop_info.timezone,
        }
    except Exception as e:
        # Common errors:
        # - 401 Unauthorized: Token invalid/revoked (app uninstalled)
        # - 403 Forbidden: Token doesn't have required scope
        logger.error("Shopify access token verification failed: %s", e)
        raise ValueError(f"Access token invalid or revoked: {e}") from e

### Pattern 2: Admin REST API with Cursor Pagination
```python
... (additional code patterns as necessary)...
```

---

---



### Pattern 2: REST API with Rate Limiting and Retries

```python
import logging
import time
from typing import Optional


logger = logging.getLogger(__name__)


class ShopifyRESTClient:
    """Shopify REST API client with rate limit handling."""

    def __init__(self, shop_domain: str, access_token: str):
        self._shop = shop_domain
        self._token = access_token

    def get_order(self, order_id: int) -> dict:
        """Fetch a single order by ID."""
        url = f"https://{self._shop}.myshopify.com/admin/api/2024-01/orders/{order_id}.json"
        headers = {"X-Shopify-Access-Token": self._token}
        # In production: requests.get(url, headers=headers)
        return {}

    def list_orders(self, status: str = "any", limit: int = 50) -> list[dict]:
        """List orders with filtering and pagination."""
        params = {"status": status, "limit": limit}
        url = f"https://{self._shop}.myshopify.com/admin/api/2024-01/orders.json"
        headers = {"X-Shopify-Access-Token": self._token}
        # In production: requests.get(url, params=params, headers=headers)
        return []

    def update_inventory(self, variant_id: int, quantity: int) -> dict:
        """Update inventory level for a product variant."""
        body = {"inventory_item_id": variant_id, "available": quantity}
        url = f"https://{self._shop}.myshopify.com/admin/api/2024-01/inventory_levels/adjust_quantity.json"
        headers = {"X-Shopify-Access-Token": self._token, "Content-Type": "application/json"}
        # In production: requests.put(url, json=body, headers=headers)
        return {}


class RateLimitState:
    """Tracks API rate limit status."""

    def __init__(self):
        self.remaining = 40
        self.reset_time = time.time()

    def is_rate_limited(self) -> bool:
        return time.time() > self.reset_time or self.remaining <= 0

    def update_from_headers(self, headers: dict) -> None:
        if "X-Shopify-Shop-Api-Call-Limit" in headers:
            parts = headers["X-Shopify-Shop-Api-Call-Limit"].split("/")
            self.remaining = int(parts[0])
```

## Constraints

### MUST DO
- Implement structured error responses with consistent format: {error_code, message, details, request_id}
- Add rate limiting per client/API key with configurable burst and sustained limits using a token bucket algorithm
- Validate all incoming requests against a schema before processing — reject malformed input with clear error messages
- Include correlation/request IDs in all log entries for end-to-end request tracing across service boundaries

### MUST NOT DO
- Do not expose internal implementation details, stack traces, or database queries in error responses
- Avoid accepting unbounded request bodies — set maximum payload sizes and timeout limits
- Never trust client-supplied authentication tokens without validation (signature verification, expiration check)
- Do not log request/response bodies containing PII, API keys, or other sensitive data


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Shopify Admin REST API Documentation](https://shopify.dev/docs/api/admin-rest)
- [Shopify Admin GraphQL API Reference](https://shopify.dev/docs/api/admin-graphql)
- [Shopify Storefront API Guide](https://shopify.dev/docs/api/storefront)
- [Shopify OAuth and App Installation](https://shopify.dev/docs/apps/auth/oauth/getting-started)
- [Shopify Webhooks Reference](https://shopify.dev/docs/api/webhooks)