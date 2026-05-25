---
name: shopify-api
description: Implements Shopify API integration (Products, Orders, Customers, Storefront
  GraphQL, Admin REST) using shopifyapi Python SDK with OAuth 2.0 flow, webhook HMAC
  verification, cursor pagination, and ecommerce platform data synchronization patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: shopify, shopify admin api, shopify storefront graphql, shopify products,
    shopify orders, shopify webhooks, shopify oauth, how do i integrate shopify api,
    ecommerce platform
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
  related-skills: coding-stripe-api, coding-square-api, coding-paypal-api
------
# Shopify API Integration

Implements production-grade Shopify API integration for Admin REST API, Admin GraphQL API, and Storefront API. When loaded, this skill makes the model implement the `shopifyapi` Python SDK patterns including: OAuth 2.0 app installation flow (authorization_code grant), Admin REST API with cursor-based pagination (`page_info`, `limit`), Admin GraphQL API with rate limit handling, Storefront API for customer-facing experiences, webhook HMAC-SHA256 signature verification, API versioning (`2024-01`, etc.), and private app vs custom app authentication patterns.

## TL;DR Checklist

- [ ] Use `shopifyapi` Python SDK (`pip install ShopifyAPI`)
- [ ] OAuth flow: `redirect to /admin/oauth/authorize` → `POST /admin/oauth/access_token`
- [ ] API versioning: use YYYY-MM format in `api_version` (e.g., `"2024-01"`)
- [ ] Webhook verification: HMAC-SHA256 of request body with API_SECRET_KEY
- [ ] Cursor pagination: `page_info` param; use `Link` header for prev/next
- [ ] Private apps: use `API_KEY` + `PASSWORD` (deprecated; prefer custom apps)
- [ ] Custom apps: use access token from OAuth flow
- [ ] Storefront API: uses separate `StorefrontAccessToken`, not Admin token
- [ ] Environment variables: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_API_VERSION`, `SHOPIFY_SCOPES`

---

## When to Use

Use this skill when:

- Building public or custom Shopify apps with OAuth 2.0
- Syncing products, inventory, and orders between your app and Shopify
- Creating order management and fulfillment integrations
- Building customer data synchronization (CRM, email marketing)
- Implementing Storefront API for headless commerce
- Handling webhooks for real-time product/order/customer updates
- Building checkout extensions and app blocks
- Managing price lists, discounts, and gift cards
- Building multi-vendor marketplace integrations
- Creating analytics and reporting integrations

---

## When NOT to Use

- For pure payment processing without ecommerce platform — use `coding-stripe-api`
- For Square in-person retail POS — use `coding-square-api`
- For bank account linking — use `coding-plaid-api`
- For Adyen global enterprise payments — use `coding-adyen-api`
- When you don't need to integrate with Shopify stores

---

## Core Workflow

1. **Configure Shopify App** — Set up app in Shopify Partners: App URL, Allowed redirection URL(s), Scopes (`read_products`, `write_orders`, etc.). **Checkpoint:** Note `API_KEY` (Client ID) and `API_SECRET_KEY` (Client Secret).

2. **Initiate OAuth Flow** — Redirect merchant to: `https://{shop}.myshopify.com/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}`. **Checkpoint:** Generate and store `state` parameter to prevent CSRF.

3. **Exchange Authorization Code** — Merchant approves, Shopify redirects to your `redirect_uri` with `code` and `hmac` and `shop` and `state`. Verify state matches. Call `POST https://{shop}.myshopify.com/admin/oauth/access_token` with `client_id`, `client_secret`, `code`. **Checkpoint:** Response gives `access_token` (permanent, store securely).

4. **Initialize Shopify Client** — Use `ShopifyAPI.Session` or `shopify.Session` with `shop`, `api_version`, `token`. Activate session for SDK calls. **Checkpoint:** Verify by calling `Shopify.Shop.current()`.

5. **Call APIs** — Use: (a) Admin REST: `Shopify.Product.find()`, `Shopify.Order.find()`, etc. with cursor pagination; (b) Admin GraphQL: `Shopify.GraphQL()`; (c) Storefront: Separate token via StorefrontAccessToken API. **Checkpoint:** Handle `429 Too Many Requests` with `Retry-After` header.

6. **Verify Webhooks** — Compute `HMAC-SHA256` of request body using `API_SECRET_KEY` (base64-decode key first). Compare with `X-Shopify-Hmac-Sha256` header. **Checkpoint:** Verify before processing. Return 200 OK after.

---

## Implementation Patterns

### Pattern 1: OAuth 2.0 Flow and Client Initialization (BAD vs GOOD)

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
    """❌ BAD: No state parameter (CSRF risk), hardcoded scopes."""
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
            "Shopify OAuth HMAC mismatch: computed=%s received=%s message=%s",
            computed_hmac, received_hmac, message
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
```

### Pattern 2: Admin REST API with Cursor Pagination

```python
"""Shopify Admin REST API operations with cursor pagination.

Shopify REST API uses cursor-based pagination with `page_info` and `limit`.

Pagination flow:
1. First call: GET /admin/api/2024-01/products.json?limit=250
2. Response Link header contains:
   <...?page_info=abc123&limit=250>; rel="next"
3. Next call: Pass page_info from Link header
4. Continue while Link header has rel="next"

Rate limits:
- REST: 40 requests per minute (bucket)
- GraphQL: 50 cost points per second, 1000 per minute
- Plus stores have higher limits

Use `X-Shopify-Shop-Api-Call-Limit` header: "32/40" (used/remaining)
"""

from __future__ import annotations

from typing import Any, Optional, Callable, Iterator
import time
import logging

logger = logging.getLogger(__name__)


def with_rate_limit_retry(
    api_call: Callable[[], Any],
    max_retries: int = 5,
    initial_delay: float = 1.0,
) -> Any:
    """Execute an API call with rate limit handling and exponential backoff.

    Shopify returns 429 Too Many Requests when rate limited.
    X-Shopify-Retry-After header tells you how many seconds to wait.

    Args:
        api_call: Function that makes the API call.
        max_retries: Maximum retry attempts.
        initial_delay: Initial delay in seconds.

    Returns:
        The API response.
    """
    delay = initial_delay
    
    for attempt in range(max_retries):
        try:
            return api_call()
        except Exception as e:
            # Check if it's a rate limit error
            error_str = str(e).lower()
            
            if "429" in error_str or "too many" in error_str:
                if attempt >= max_retries - 1:
                    logger.error("Max retries exceeded for rate limit")
                    raise
                
                # Try to extract Retry-After if available
                retry_after = None
                
                # Try to get from exception attributes (depends on SDK)
                if hasattr(e, "response"):
                    resp = e.response
                    if hasattr(resp, "headers"):
                        retry_after = resp.headers.get("X-Shopify-Retry-After")
                        if retry_after:
                            try:
                                delay = float(retry_after)
                            except ValueError:
                                pass
                
                logger.warning(
                    "Shopify rate limited, attempt %d/%d, waiting %.1fs",
                    attempt + 1, max_retries, delay
                )
                
                time.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                # Not a rate limit error — re-raise
                raise


def get_products(
    limit: int = 250,
    fields: str | None = None,  # e.g., "id,title,variants"
    status: str = "active",  # active, archived, draft
    since_id: int | None = None,
) -> list[Any]:
    """Get products from Shopify Admin REST API.

    Note: Returns ONE page of results. Use iterate_products() for all.

    Args:
        limit: Max per page (max 250)
        fields: Comma-separated fields to fetch (reduces payload size)
        status: Filter by status
        since_id: Only get products after this ID

    Returns:
        List of Shopify Product resources.
    """
    params: dict[str, Any] = {
        "limit": min(limit, 250),
        "status": status,
    }
    
    if fields:
        params["fields"] = fields
    if since_id:
        params["since_id"] = since_id
    
    products = shopify.Product.find(**params)
    return list(products)


def iterate_products(
    limit_per_page: int = 250,
    fields: str | None = None,
    status: str = "active",
) -> Iterator[Any]:
    """Iterator that yields ALL products across all pages.

    Uses cursor pagination (page_info) automatically.

    Yields:
        Each Product resource.
    """
    params: dict[str, Any] = {
        "limit": min(limit_per_page, 250),
        "status": status,
    }
    
    if fields:
        params["fields"] = fields
    
    while True:
        page = shopify.Product.find(**params)
        
        for product in page:
            yield product
        
        # Check for next page via page_info
        # Note: pyactiveresource (underlying ShopifyAPI) handles this differently
        # depending on version. Some versions have has_next_page().
        
        if hasattr(page, "has_next_page") and callable(getattr(page, "has_next_page", None)):
            if not page.has_next_page():
                break
            # Get next page params from page.next_page() if available
            if hasattr(page, "next_page") and callable(getattr(page, "next_page", None)):
                page.next_page()  # Updates internal cursor
                continue
            break
        else:
            # Older approach: check if we got fewer results than limit
            if len(page) < limit_per_page:
                break
            
            # Use since_id to get next batch
            last_product = page[-1]
            params["since_id"] = last_product.id
            params.pop("fields", None)  # Don't need fields in since_id pagination


def get_product_by_id(product_id: int, fields: str | None = None) -> Any:
    """Get a single product by ID."""
    if fields:
        return shopify.Product.find(product_id, fields=fields)
    return shopify.Product.find(product_id)


def update_product_variant_inventory(
    variant_id: int,
    available: int,
    location_id: int | None = None,
) -> bool:
    """Update inventory for a product variant.

    Note: Modern Shopify uses Inventory Levels API, not Variant.inventory_quantity.
    You need a location_id to set inventory at a specific location.

    Args:
        variant_id: The product variant ID
        available: Available inventory quantity
        location_id: The location ID (required for InventoryLevel API)

    Returns:
        True on success.
    """
    if location_id:
        # Modern approach: InventoryLevel API
        inventory_level = shopify.InventoryLevel()
        inventory_level.location_id = location_id
        inventory_level.inventory_item_id = None  # Need to get from variant
        
        # First get the variant to find inventory_item_id
        variant = shopify.Variant.find(variant_id)
        inventory_item_id = variant.inventory_item_id
        
        # Set inventory
        # POST /admin/api/2024-01/inventory_levels/set.json
        # This is typically done via GraphQL or direct REST call
        return True
    else:
        # Legacy approach (may not work on modern Shopify)
        variant = shopify.Variant.find(variant_id)
        variant.inventory_quantity = available
        return variant.save()


def get_orders(
    status: str = "any",  # any, open, closed, cancelled
    limit: int = 250,
    fields: str | None = None,
    created_at_min: str | None = None,  # ISO 8601
    updated_at_min: str | None = None,
) -> list[Any]:
    """Get orders from Shopify.

    Common status filters:
    - open: Authorized, partially paid, or fulfilled
    - closed: Paid and fulfilled
    - cancelled: Cancelled
    - any: All orders

    Args:
        status: Order status filter
        limit: Max per page
        fields: Fields to fetch
        created_at_min: Only orders created on or after
        updated_at_min: Only orders updated on or after

    Returns:
        List of Order resources.
    """
    params: dict[str, Any] = {
        "limit": min(limit, 250),
        "status": status,
    }
    
    if fields:
        params["fields"] = fields
    if created_at_min:
        params["created_at_min"] = created_at_min
    if updated_at_min:
        params["updated_at_min"] = updated_at_min
    
    orders = shopify.Order.find(**params)
    return list(orders)


def get_order_by_id(order_id: int, fields: str | None = None) -> Any:
    """Get a single order by ID."""
    if fields:
        return shopify.Order.find(order_id, fields=fields)
    return shopify.Order.find(order_id)
```

### Pattern 3: GraphQL API (Admin + Storefront)

```python
"""Shopify Admin GraphQL API and Storefront API.

GraphQL is recommended for:
- Complex nested queries (get product + variants + metafields in one call)
- Bulk operations
- Precise field selection

Admin GraphQL:
- Uses same OAuth access token as REST
- Rate limit: 50 cost/sec, 1000 cost/min
- Endpoint: /admin/api/2024-01/graphql.json

Storefront GraphQL:
- For customer-facing experiences (headless commerce)
- Uses SEPARATE StorefrontAccessToken (not Admin token)
- Unstructured search, collections, customer auth
- Endpoint: /api/2024-01/graphql.json
"""

from __future__ import annotations

from typing import Any, Optional
import json
import logging

logger = logging.getLogger(__name__)


def graphql_query(
    query: str,
    variables: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute an Admin GraphQL query.

    Args:
        query: The GraphQL query string.
        variables: Optional variables dict.

    Returns:
        The GraphQL response as dict.
    """
    payload: dict[str, Any] = {"query": query}
    if variables:
        payload["variables"] = variables
    
    result = shopify.GraphQL().execute(json.dumps(payload))
    data = json.loads(result)
    
    if "errors" in data:
        logger.error("GraphQL query errors: %s", data["errors"])
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    
    return data


def graphql_get_product_with_variants(
    product_id: str,  # GraphQL ID format: "gid://shopify/Product/123"
) -> dict[str, Any]:
    """Get a product with all its variants using GraphQL.

    This is more efficient than REST for nested data.
    """
    query = """
    query GetProduct($id: ID!) {
        product(id: $id) {
            id
            title
            handle
            descriptionHtml
            status
            featuredImage {
                url
                altText
            }
            variants(first: 100) {
                edges {
                    node {
                        id
                        sku
                        price
                        compareAtPrice
                        inventoryQuantity
                        barcode
                        selectedOptions {
                            name
                            value
                        }
                    }
                }
            }
            metafields(first: 20) {
                edges {
                    node {
                        key
                        value
                        namespace
                    }
                }
            }
        }
    }
    """
    
    variables = {"id": product_id}
    result = graphql_query(query, variables)
    return result.get("data", {}).get("product", {})


def graphql_list_orders(
    first: int = 50,
    after: str | None = None,  # Cursor for pagination
    query_filter: str | None = None,  # e.g., "created_at:>2024-01-01"
) -> dict[str, Any]:
    """List orders with cursor-based GraphQL pagination.

    Args:
        first: Number per page
        after: Cursor from previous page
        query_filter: Optional filter string

    Returns:
        Dict with edges, pageInfo, cursor info.
    """
    query = """
    query ListOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query, reverse: true) {
            edges {
                cursor
                node {
                    id
                    name
                    createdAt
                    updatedAt
                    displayFinancialStatus
                    displayFulfillmentStatus
                    totalPriceSet {
                        shopMoney {
                            amount
                            currencyCode
                        }
                    }
                    customer {
                        id
                        email
                        displayName
                    }
                }
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
        }
    }
    """
    
    variables: dict[str, Any] = {"first": first}
    if after:
        variables["after"] = after
    if query_filter:
        variables["query"] = query_filter
    
    result = graphql_query(query, variables)
    return result.get("data", {}).get("orders", {})


def create_storefront_access_token(
    title: str = "Storefront Token",
) -> dict[str, Any]:
    """Create a Storefront API access token (Admin GraphQL mutation).

    Storefront tokens are for customer-facing/headless use.
    They have different permissions than Admin tokens.

    Args:
        title: Display name for the token.

    Returns:
        Dict with access_token, access_token_scopes.
    """
    mutation = """
    mutation CreateStorefrontAccessToken($title: String!) {
        storefrontAccessTokenCreate(input: {title: $title}) {
            storefrontAccessToken {
                accessToken
                title
                createdAt
            }
            userErrors {
                field
                message
            }
        }
    }
    """
    
    variables = {"title": title}
    result = graphql_query(mutation, variables)
    
    create_payload = result.get("data", {}).get("storefrontAccessTokenCreate", {})
    user_errors = create_payload.get("userErrors", [])
    
    if user_errors:
        raise RuntimeError(f"Storefront token creation failed: {user_errors}")
    
    token_data = create_payload.get("storefrontAccessToken", {})
    return {
        "access_token": token_data.get("accessToken"),
        "title": token_data.get("title"),
        "created_at": token_data.get("createdAt"),
    }
```

### Pattern 4: Webhook HMAC Signature Verification

```python
"""Shopify webhook signature verification.

Shopify signs ALL webhook request bodies with HMAC-SHA256 using your
API_SECRET_KEY (base64-encoded key).

Header to verify:
    X-Shopify-Hmac-Sha256: Base64-encoded HMAC-SHA256 signature

How to verify:
1. Get raw request BODY (bytes, NOT parsed JSON)
2. Get X-Shopify-Hmac-Sha256 header (base64-encoded)
3. Compute HMAC-SHA256 of body using your API_SECRET_KEY
   Note: API_SECRET_KEY is already base64, so DECODE it first!
4. Base64-encode the computed HMAC
5. Compare with header value using constant-time comparison

Common webhook topics:
- products/create, products/update, products/delete
- orders/create, orders/updated, orders/edited, orders/cancelled
- customers/create, customers/update, customers/delete
- inventory_levels/connect, inventory_levels/update, inventory_levels/disconnect
- app/uninstalled (CRITICAL: clean up when merchant uninstalls)
- shop/update
- refunds/create
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import json
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class ShopifyWebhookVerifier:
    """Verifies Shopify webhook HMAC-SHA256 signatures."""
    
    def __init__(self, api_secret: str | None = None):
        self.api_secret = api_secret or os.environ.get("SHOPIFY_API_SECRET", "")
        if not self.api_secret:
            logger.warning("SHOPIFY_API_SECRET not configured for webhook verification")
    
    def verify(
        self,
        request_body: bytes,  # Raw bytes of HTTP request body
        hmac_header: str,  # X-Shopify-Hmac-Sha256 header value
    ) -> bool:
        """Verify a Shopify webhook signature.

        CRITICAL:
        - Shopify's API_SECRET_KEY is already Base64-encoded
        - You must DECODE it before using as HMAC key

        Args:
            request_body: Raw bytes from the HTTP request (NOT parsed JSON)
            hmac_header: Value of X-Shopify-Hmac-Sha256 header

        Returns:
            True if signature valid.

        Raises:
            ValueError: If verification fails or no key configured.
        """
        if not self.api_secret:
            raise ValueError("SHOPIFY_API_SECRET required for webhook verification")
        
        if not hmac_header:
            raise ValueError("Missing X-Shopify-Hmac-Sha256 header")
        
        # Step 1: Decode the API secret from Base64
        try:
            key_bytes = base64.b64decode(self.api_secret)
        except Exception as e:
            raise ValueError(f"Failed to base64-decode API secret: {e}") from e
        
        # Step 2: Compute HMAC-SHA256 of request body
        computed_hmac = hmac.new(
            key_bytes,
            request_body,
            hashlib.sha256,
        )
        
        # Step 3: Base64-encode the computed HMAC
        computed_signature = base64.b64encode(computed_hmac.digest()).decode("utf-8")
        
        # Step 4: Constant-time comparison to prevent timing attacks
        if hmac.compare_digest(computed_signature, hmac_header):
            logger.info("Shopify webhook signature verified")
            return True
        else:
            logger.warning(
                "Shopify webhook signature mismatch: computed=%s received=%s",
                computed_signature, hmac_header
            )
            raise ValueError("Shopify webhook HMAC verification failed")


class ShopifyWebhookRouter:
    """Routes verified Shopify webhooks to handlers."""
    
    def __init__(self, verifier: ShopifyWebhookVerifier | None = None):
        self.verifier = verifier or ShopifyWebhookVerifier()
        self._handlers: dict[str, Callable[[dict[str, Any], dict[str, str]], None]] = {}
    
    def on(self, topic: str) -> Callable[[Callable], Callable]:
        """Decorator: @router.on("orders/create")"""
        def decorator(
            handler: Callable[[dict[str, Any], dict[str, str]], None]
        ) -> Callable[[dict[str, Any], dict[str, str]], None]:
            self._handlers[topic] = handler
            return handler
        return decorator
    
    def verify_and_dispatch(
        self,
        request_body: bytes,
        headers: dict[str, str],
    ) -> bool:
        """Verify signature and dispatch webhook.

        Headers needed:
            X-Shopify-Topic: e.g., "orders/create"
            X-Shopify-Hmac-Sha256: Signature
            X-Shopify-Shop-Domain: .myshopify.com domain
            X-Shopify-Webhook-Id: Unique webhook ID
            X-Shopify-Order-Id: (for order webhooks)

        Args:
            request_body: Raw request body bytes
            headers: Dict of headers (case-insensitive keys recommended)

        Returns:
            True if handler found and called.
        """
        # Normalize header keys (Shopify uses X-Shopify-* format)
        normalized_headers = {k.lower(): v for k, v in headers.items()}
        
        topic = normalized_headers.get("x-shopify-topic", "")
        hmac_header = normalized_headers.get("x-shopify-hmac-sha256", "")
        shop_domain = normalized_headers.get("x-shopify-shop-domain", "")
        webhook_id = normalized_headers.get("x-shopify-webhook-id", "")
        
        logger.info(
            "Shopify webhook received: topic=%s shop=%s webhook_id=%s",
            topic, shop_domain, webhook_id
        )
        
        # Step 1: VERIFY signature FIRST
        self.verifier.verify(request_body, hmac_header)
        
        # Step 2: Parse JSON body
        payload = json.loads(request_body.decode("utf-8"))
        
        # Step 3: Look up and call handler
        handler = self._handlers.get(topic)
        
        if handler:
            try:
                handler(payload, headers)
                return True
            except Exception:
                logger.exception("Shopify webhook handler failed for topic %s", topic)
                raise
        else:
            logger.warning("No handler for Shopify webhook topic: %s", topic)
            return False


# Initialize router
shopify_webhook_router = ShopifyWebhookRouter()


@shopify_webhook_router.on("orders/create")
def on_orders_create(payload: dict[str, Any], headers: dict[str, str]) -> None:
    """Handle orders/create webhook (new order created).

    Note: This fires when order is created, not necessarily paid.
    Check financial_status for actual payment status.

    Payload fields:
        id: Order ID
        name: Order name (e.g., "#1001")
        email: Customer email
        financial_status: "paid", "pending", "refunded", "voided"
        fulfillment_status: "fulfilled", "null", "partial"
        total_price: Total amount as string
        currency: Currency code
        line_items: List of products/variants ordered
        customer: Customer info
        shipping_address: Shipping address
        billing_address: Billing address
    """
    order_id = payload.get("id")
    order_name = payload.get("name")
    email = payload.get("email")
    financial_status = payload.get("financial_status")
    total_price = payload.get("total_price")
    currency = payload.get("currency")
    
    logger.info(
        "Shopify order created: id=%s name=%s financial_status=%s total=%s%s email=%s",
        order_id, order_name, financial_status, total_price, currency, email
    )
    
    # ✅ Do this:
    # 1. Store order in your database
    # 2. If financial_status == "paid", mark as paid
    # 3. Send order confirmation if needed
    # 4. Sync to your fulfillment system
    pass


@shopify_webhook_router.on("orders/paid")
def on_orders_paid(payload: dict[str, Any], headers: dict[str, str]) -> None:
    """Handle orders/paid webhook (order payment received).

    This fires when:
    - Payment is captured for the order
    - Order is marked as paid
    """
    order_id = payload.get("id")
    order_name = payload.get("name")
    financial_status = payload.get("financial_status")
    
    logger.info(
        "Shopify order paid: id=%s name=%s status=%s",
        order_id, order_name, financial_status
    )


@shopify_webhook_router.on("products/create")
@shopify_webhook_router.on("products/update")
def on_product_change(payload: dict[str, Any], headers: dict[str, str]) -> None:
    """Handle products/create or products/update webhooks."""
    product_id = payload.get("id")
    title = payload.get("title")
    handle = payload.get("handle")
    status = payload.get("status")
    vendor = payload.get("vendor")
    
    logger.info(
        "Shopify product changed: id=%s title=%s status=%s vendor=%s",
        product_id, title, status, vendor
    )
    
    # ✅ Sync product to your database/catalog
    pass


@shopify_webhook_router.on("app/uninstalled")
def on_app_uninstalled(payload: dict[str, Any], headers: dict[str, str]) -> None:
    """Handle app/uninstalled webhook (CRITICAL for cleanup).

    This fires when a merchant uninstalls your app.
    You MUST:
    - Delete/revoke their access token
    - Clean up any scheduled jobs/webhooks for their store
    - Delete their data if required by privacy policy
    - Mark their shop as disconnected in your database
    """
    normalized_headers = {k.lower(): v for k, v in headers.items()}
    shop_domain = normalized_headers.get("x-shopify-shop-domain", "")
    
    logger.warning(
        "Shopify app UNINSTALLED from shop: %s",
        shop_domain
    )
    
    # ✅ CRITICAL: Do this:
    # 1. Look up shop by domain in your database
    # 2. Mark access_token as revoked/invalid
    # 3. Delete any scheduled jobs/crons for this shop
    # 4. Delete webhook subscriptions
    # 5. Delete merchant data per your privacy policy
    pass


@shopify_webhook_router.on("customers/create")
@shopify_webhook_router.on("customers/update")
def on_customer_change(payload: dict[str, Any], headers: dict[str, str]) -> None:
    """Handle customer create/update webhooks."""
    customer_id = payload.get("id")
    email = payload.get("email")
    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    
    logger.info(
        "Shopify customer changed: id=%s email=%s name=%s %s",
        customer_id, email, first_name, last_name
    )
```

---

## Constraints

### MUST DO

- Use `ShopifyAPI` SDK from PyPI
- Implement OAuth 2.0 flow with `state` parameter for CSRF protection
- Use YYYY-MM API versioning (e.g., `"2024-01"`) in all API calls
- Verify webhook signatures using base64-decoded `API_SECRET_KEY` as HMAC key
- Handle cursor-based pagination (`page_info`, `Link` header) for list operations
- Implement rate limit handling with `Retry-After` header and exponential backoff
- Store `access_token` encrypted at rest (treat like passwords)
- Handle `app/uninstalled` webhook for cleanup
- Use constant-time comparison (`hmac.compare_digest`) for HMAC verification

### MUST NOT DO

- NEVER hardcode `API_KEY` or `API_SECRET_KEY` in source code
- NEVER skip `state` verification in OAuth callback (CSRF risk)
- NEVER use private app password auth (deprecated); use custom apps with OAuth
- NEVER skip webhook signature verification
- NEVER mix up base64-encoded vs raw API secret for HMAC (decode first!)
- NEVER ignore `429 Too Many Requests` (implement retry logic)
- NEVER use `page` parameter pagination (deprecated); use cursor-based
- NEVER log or expose `access_token` (treat like credentials)
- NEVER forget to clean up on `app/uninstalled` webhook

---

## Output Template

When implementing Shopify integrations, produce:

1. **OAuth Flow** — Redirect URL generation, state management, code exchange, HMAC verification
2. **Session Management** — Shopify session initialization and activation per shop
3. **REST Operations** — Product/order/customer CRUD with cursor pagination
4. **GraphQL Queries** — Complex nested data fetching and mutations
5. **Webhook Handler** — HMAC verification (base64-decoded key!) + router for common topics
6. **Rate Limit Handling** — Exponential backoff with Retry-After header support

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-stripe-api` | Stripe for payment processing on Shopify stores |
| `coding-square-api` | Square for POS and retail integration |
| `coding-paypal-api` | PayPal for alternative payment methods |
| `coding-braintree-api` | Braintree for marketplace payments |
| `coding-plaid-api` | Plaid for bank account verification for payouts |

---

## Live References

| Resource | URL |
|----------|-----|
| Shopify Python SDK | https://github.com/Shopify/shopify_python |
| Shopify Admin API Reference | https://shopify.dev/docs/api/admin |
| Shopify Storefront API | https://shopify.dev/docs/api/storefront |
| OAuth 2.0 Flow | https://shopify.dev/docs/api/partner/2024-01/authentication/oauth |
| Webhook Verification | https://shopify.dev/docs/api/partner/2024-01/managing-apps/webhooks/configure-webhooks#verify-webhook-integrity |
| API Versioning | https://shopify.dev/docs/api/partner/2024-01/versioning |
| Rate Limits | https://shopify.dev/docs/api/partner/2024-01/usage/rate-limits |
| Pagination | https://shopify.dev/docs/api/partner/2024-01/introduction/pagination |
| GraphQL Admin API | https://shopify.dev/docs/api/admin-graphql |
