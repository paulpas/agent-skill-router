---
name: rest-api-caching
description: Implements HTTP caching strategies for REST APIs including Cache-Control
  header design, ETag/conditional GET, stale-while-revalidate patterns, cache key
  construction, Vary header configuration, and invalidation strategies to reduce latency
  and server load.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: http caching, cache-control, etag, conditional request, stale-while-revalidate,
    304 not modified, rest api caching, vary header
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
  related-skills: fastapi-patterns, rest-api-patterns, system-design-fundamentals,
    performance-optimization
------
# HTTP Caching for REST APIs

Implements production-grade HTTP caching strategies to reduce latency, decrease server load, and improve client experience. When active, this skill makes the model design Cache-Control header policies, build ETag-based conditional GET flows with 304 responses, configure stale-while-revalidate and stale-if-error for resilient serving, construct correct cache keys, apply Vary headers for content negotiation, and choose between no-cache and no-store based on data sensitivity.

## TL;DR Checklist

- [ ] Every cacheable response includes a Cache-Control header with explicit max-age
- [ ] ETag is generated for resources that change independently of wall-clock time
- [ ] 304 Not Modified is returned when If-None-Match / If-Modified-Since match
- [ ] Vary header lists all request headers that affect response content (Accept-Encoding, Accept-Language, Accept)
- [ ] no-cache means "cache but validate"; no-store means "never cache" — do not confuse them
- [ ] stale-while-revalidate serves fresh content while refreshing in the background; stale-if-error serves stale during upstream failure
- [ ] User-specific data is always marked private or uses no-store — never public

---

## When to Use

Use this skill when:

- Designing cache policies for read-heavy REST API endpoints (product catalogs, feeds, dashboards)
- Implementing ETag / conditional GET to save bandwidth on large JSON responses
- Reducing upstream load by serving stale content during origin outages (stale-if-error)
- Improving perceived latency with background revalidation (stale-while-revalidate)
- Configuring CDN or reverse proxy caching behavior through response headers
- Constructing cache keys that correctly account for query parameters, accept headers, and auth state

---

## When NOT to Use

Avoid this skill for:

- **User-specific authenticated data** that must never be cached — use `Cache-Control: no-store` instead (e.g., bank balances, personal messages)
- **Real-time data feeds** requiring sub-second freshness — use WebSockets or Server-Sent Events instead
- **Simple CRUD with no repeat reads** — a user profile viewed once benefits nothing from caching; cache adds latency and complexity
- **Data sources that already provide their own caching layer** you proxy through — adding HTTP cache on top creates dual-cache inconsistency unless coordinated

---

## Core Workflow

1. **Classify Response Cacheability** — Determine whether the response is public (cached everywhere), private (user-agent only), or non-cacheable. Public data: product listings, public profiles, static content. Private data: user dashboards, order history. Non-cacheable: real-time feeds, sensitive financial data. **Checkpoint:** Every endpoint must have a documented cacheability classification before header logic is written.

2. **Select Cache-Control Directives** — Choose directives based on the classification and freshness requirements. For public content with TTL-based expiry: `public, max-age=60`. For content requiring server-side validation: `no-cache`. For user-specific data: `private, no-store`. For resilient serving: add `stale-while-revalidate=30, stale-if-error=300`. **Checkpoint:** The selected directives must be justified in a comment at the endpoint.

3. **Implement Conditional GET Support** — Add ETag (and optionally Last-Modified) to cacheable responses. On subsequent requests, check `If-None-Match` and `If-Modified-Since` headers; return 304 with an empty body when the resource has not changed. **Checkpoint:** A client sending a valid ETag must receive HTTP 304 — verify with curl.

4. **Configure Vary Header** — List every request header that affects response content. `Accept-Encoding` for compression, `Accept-Language` for localization, `Accept` for content negotiation between JSON and other formats. Omitting Vary causes cache corruption when different variants share the same key. **Checkpoint:** If two requests with different Accept headers return different bodies but the same cache key, Vary is misconfigured.

5. **Design Cache Invalidation Strategy** — Choose one or more: TTL expiration (primary safety net), push invalidation on data mutation (`cache.delete()` on PUT/POST/DELETE), and versioned cache keys for schema changes. **Checkpoint:** Every write path must trigger corresponding invalidations; a missing invalidation is a data freshness bug.

6. **Instrument Cache Behavior** — Log cache hits, misses, 304 responses, and stale serves. Track the ratio of conditional GET requests to full responses as a proxy for cache effectiveness. **Checkpoint:** Production dashboards should show cache hit rate trending above 70% for well-cached endpoints.

---

## Implementation Patterns

### Pattern 1: Cache-Control Header Selection Logic (BAD vs. GOOD)

Choosing the correct Cache-Control directives is foundational. Misconfigured headers cause either stale data leaks or unnecessary origin requests.

```python
# ❌ BAD: No cache headers at all — every request hits the database
from fastapi import FastAPI, HTTPException
import uuid

app = FastAPI()

@app.get("/products/{product_id}")
def get_product(product_id: uuid.UUID):
    """No Cache-Control header — clients and intermediaries have no guidance."""
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    # No headers set — cache behavior is entirely up to each client/proxy
    return product


# ✅ GOOD: Explicit Cache-Control per response type with clear semantics
from fastapi import FastAPI, Response
from datetime import datetime, timezone
import hashlib
import hmac

app = FastAPI()


def select_cache_control(
    resource_type: str,
    is_authenticated: bool = False,
    max_staleness_seconds: int | None = None,
) -> dict[str, str]:
    """
    Select Cache-Control directives based on resource type and sensitivity.

    Args:
        resource_type: One of 'public_ttl', 'public_validate', 'private', 'sensitive'.
        is_authenticated: Whether the request carries auth credentials.
        max_staleness_seconds: Maximum acceptable staleness for stale-while-revalidate.

    Returns:
        Dict with 'Cache-Control' header value and optional 'Vary' header.
    """
    # Guard: sensitive data never cached — no exception path
    if resource_type == "sensitive":
        return {"Cache-Control": "no-store"}

    # Authenticated private data — cacheable only by user's browser, never by CDNs/proxies
    if is_authenticated and resource_type == "private":
        stale_w = max_staleness_seconds or 10
        return {
            "Cache-Control": f"private, max-age={max_staleness_seconds}, stale-while-revalidate={stale_w}"
        }

    # Public data requiring server-side validation before each use
    if resource_type == "public_validate":
        return {"Cache-Control": "no-cache"}

    # Public TTL-cached data — safe for all intermediaries
    if resource_type == "public_ttl":
        stale_w = max_staleness_seconds or 30
        stale_e = max_staleness_seconds and int(max_staleness_seconds * 5)
        return {
            "Cache-Control": (
                f"public, max-age={max_staleness_seconds}, "
                f"stale-while-revalidate={stale_w}, stale-if-error={stale_e}"
            ),
        }

    # Default: no caching — fail safe
    return {"Cache-Control": "no-store"}


# Example endpoints using the selector:
@app.get("/products/{product_id}")
def get_product(product_id: uuid.UUID):
    """Public product catalog — cached aggressively with stale serving."""
    cache_headers = select_cache_control("public_ttl", max_staleness_seconds=120)
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    response = Response(content=json.dumps(product), media_type="application/json")
    for header, value in cache_headers.items():
        response.headers[header] = value
    return response


@app.get("/users/me/profile")
def get_my_profile(authorization: str | None = Header(None)):
    """Authenticated user profile — private cache with background refresh."""
    cache_headers = select_cache_control(
        "private", is_authenticated=bool(authorization), max_staleness_seconds=30
    )
    profile = db.query("SELECT * FROM profiles WHERE user_id = $1", get_current_user_id())

    response = Response(content=json.dumps(profile), media_type="application/json")
    for header, value in cache_headers.items():
        response.headers[header] = value
    return response


@app.get("/accounts/{account_id}/balance")
def get_balance(account_id: uuid.UUID):
    """Financial balance — never cached under any circumstances."""
    cache_headers = select_cache_control("sensitive")
    balance = db.query("SELECT * FROM balances WHERE account_id = $1", account_id)

    response = Response(content=json.dumps(balance), media_type="application/json")
    for header, value in cache_headers.items():
        response.headers[header] = value
    return response
```

### Pattern 2: ETag Generation and Conditional GET Middleware (BAD vs. GOOD)

ETags enable bandwidth-efficient conditional requests. The server computes a unique fingerprint; the client sends it back via `If-None-Match`. A match yields 304 Not Modified with zero body transfer.

```python
# ❌ BAD: No ETag support — clients always download full response body,
#   wasting bandwidth and increasing latency on every request.
@app.get("/products/{product_id}")
def get_product_no_etag(product_id: uuid.UUID):
    """Always returns 200 with full body — no conditional GET possible."""
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)
    return product


# ✅ GOOD: ETag middleware generates fingerprints, validates If-None-Match,
#   and returns 304 when the resource has not changed. Also supports
#   Last-Modified / If-Modified-Since as a date-based fallback.
import json
import hashlib
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

app = FastAPI()


def generate_etag(data: dict) -> str:
    """
    Generate an ETag fingerprint from resource data.

    Uses SHA-256 over canonicalized JSON for stability. The resulting hash
    is truncated to 16 bytes (32 hex chars) — sufficient collision resistance
    for HTTP caching without the overhead of full-length hashes.

    Returns a weak ETag (prefixed with W/) per RFC 9110 §8.8.3.
    """
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:32]
    return f'W/"{digest}"'


def generate_strong_etag(data: dict) -> str:
    """Generate a strong ETag — used when exact byte-for-byte equality matters."""
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:32]
    return f'"{digest}"'


def compute_cache_key(resource_data: dict) -> tuple[str, str | None]:
    """
    Compute both ETag and Last-Modified for a resource.

    Returns:
        (etag, last_modified_str) where last_modified_str is ISO 8601 or None.
    """
    etag = generate_etag(resource_data)

    # Derive last-modified from a version/timestamp field if present
    last_mod = resource_data.get("updated_at") or resource_data.get("modified")
    if last_mod:
        if isinstance(last_mod, datetime):
            last_modified_str = last_mod.strftime("%a, %d %b %Y %H:%M:%S GMT")
        else:
            last_modified_str = last_mod
    else:
        last_modified_str = None  # No date-based fallback available

    return etag, last_modified_str


def check_conditional_request(
    request: Request,
    etag: str,
    last_modified_str: str | None,
) -> Response | None:
    """
    Check If-None-Match and If-Modified-Since headers.

    Returns a 304 Response if the client's cached copy is still fresh,
    or None if the resource has changed and the full response should be sent.

    Per RFC 9110 §13.1.3, If-None-Match takes priority over If-Modified-Since.
    """
    # Priority 1: ETag comparison (If-None-Match) — exact match check
    if_none_match = request.headers.get("if-none-match")
    if if_none_match:
        # Handle multiple ETags, weak/strong comparison per RFC 9110 §8.8.3
        client_etags = [e.strip() for e in if_none_match.split(",")]
        # Strip weak marker for comparison
        client_normalized = {e.replace('W/', '') for e in client_etags}
        server_normalized = etag.replace('W/', '')

        if server_normalized in client_normalized:
            return Response(status_code=304, headers={})

    # Priority 2: Date-based comparison (If-Modified-Since) as fallback
    if_modified_since = request.headers.get("if-modified-since")
    if last_modified_str and if_modified_since:
        from email.utils import parsedate_to_datetime

        try:
            modified_date = parsedate_to_datetime(last_modified_str)
            if_since = parsedate_to_datetime(if_modified_since)
            if modified_date <= if_since:
                return Response(status_code=304, headers={})
        except (ValueError, TypeError):
            pass  # Parse failure — send full response

    return None  # Resource changed — proceed with full response


# Middleware that applies ETag logic to every response
@app.middleware("http")
async def etag_middleware(request: Request, call_next) -> Response:
    """
    Adds ETag and Last-Modified headers to responses.
    Returns 304 when the client's cache is current.

    Skips responses that already have no-store or are non-GET methods.
    """
    # Guard: only cacheable methods get ETag treatment
    if request.method not in ("GET", "HEAD"):
        return await call_next(request)

    response = await call_next(request)

    # Guard: skip if the response already disables caching
    cc = response.headers.get("cache-control", "")
    if "no-store" in cc:
        return response

    # Guard: only apply to successful responses
    if response.status_code not in (200, 201, 204):
        return response

    # For 204 No Content, no ETag needed
    if response.status_code == 204:
        return response

    # Guard: only JSON responses get ETags in this middleware
    content_type = response.headers.get("content-type", "")
    if "application/json" not in content_type:
        return response

    # Parse body to compute ETag — this is a tradeoff (CPU for bandwidth savings)
    try:
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk
        body_data = json.loads(body_bytes)
    except Exception:
        return Response(status_code=response.status_code, headers=dict(response.headers))

    # Compute fingerprint
    etag, last_modified_str = compute_cache_key(body_data)

    # Check if client's cache is current
    not_modified_response = check_conditional_request(request, etag, last_modified_str)
    if not_modified_response:
        return not_modified_response

    # Attach caching headers to the response
    response.headers["ETag"] = etag
    if last_modified_str:
        response.headers["Last-Modified"] = last_modified_str

    return response


# Usage — endpoints automatically get ETag/conditional GET support
@app.get("/products/{product_id}")
def get_product(product_id: uuid.UUID):
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    # Set cache policy — ETag middleware will handle the rest
    headers = select_cache_control("public_ttl", max_staleness_seconds=300)
    return JSONResponse(content=product, headers=headers)


@app.get("/products/search")
def search_products(q: str):
    """Search endpoint — use no-cache because results change per query."""
    results = db.search_products(q)

    headers = select_cache_control("public_validate")  # Cache but validate each time
    return JSONResponse(content={"results": results}, headers=headers)
```

### Pattern 3: Stale-While-Revalidate and Stale-If-Error Implementation

These directives let servers serve cached content during revalidation (stale-while-revalidate) or even during upstream failures (stale-if-error), dramatically improving perceived availability.

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import asyncio
import time
from typing import Any


# In-memory cache store for demonstration
_cache_store: dict[str, dict[str, Any]] = {}


def cached_response(
    key: str,
    data: dict,
    max_age: int = 60,
    stale_while_revalidate: int | None = None,
    stale_if_error: int | None = None,
) -> dict[str, str]:
    """
    Return Cache-Control headers with stale-serving directives.

    Args:
        key: Resource identifier for the response type (used in directive selection).
        max_age: Seconds of freshness before revalidation is required.
        stale_while_revalidate: Additional seconds to serve while background refresh runs.
        stale_if_error: Extra seconds to serve if origin server returns 5xx or network error.

    Returns:
        Dict of Cache-Control header values.
    """
    swr = stale_while_revalidate or int(max_age * 0.25)   # 25% of max-age for revalidation grace
    sie = stale_if_error or int(max_age * 5)              # 5x max-age for error grace

    return {
        "Cache-Control": (
            f"public, max-age={max_age}, "
            f"stale-while-revalidate={swr}, stale-if-error={sie}"
        ),
        # Internal metadata — not sent to clients, used by the application layer
        "_stale_while_revalidate": swr,
        "_stale_if_error": sie,
    }


# --- Stale-While-Revalidate: Background Refresh Pattern ---

@app.get("/products/catalog")
async def get_product_catalog():
    """
    Product catalog with stale-while-revalidate.

    1. Serve cached response immediately (even if slightly stale)
    2. Start background revalidation in parallel
    3. If revalidation succeeds, replace cache entry and update the current response
    4. If revalidation fails within swr window, continue serving stale content

    Cache-Control: public, max-age=60, stale-while-revalidate=15, stale-if-error=300
    """
    # In production, this would hit a real cache layer (Redis, CDN, reverse proxy)
    cached = _cache_store.get("catalog")
    if cached and time.time() - cached.get("timestamp", 0) < 60:
        # Fresh or within stale-while-revalidate window — serve immediately
        swr_header = cached.get("_stale_while_revalidate", 15)
        cache_headers = {
            "Cache-Control": (
                f"public, max-age=60, stale-while-revalidate={swr_header}, stale-if-error=300"
            ),
            "X-Cache": "HIT (stale)",
            "X-Stale-While-Revalidate": str(swr_header),
        }
        # Start background refresh (non-blocking)
        asyncio.create_task(_refresh_catalog_cache())
        return JSONResponse(content=cached["data"], headers=cache_headers)

    # Cache miss — fetch from origin and populate cache
    data = await _fetch_product_catalog()  # Origin call
    timestamp = time.time()

    headers = cached_response(
        key="catalog",
        data=data,
        max_age=60,
        stale_while_revalidate=15,
        stale_if_error=300,
    )

    _cache_store["catalog"] = {
        "data": data,
        "timestamp": timestamp,
        "_stale_while_revalidate": headers["_stale_while_revalidate"],
    }

    cc_headers = {k: v for k, v in headers.items() if not k.startswith("_")}
    return JSONResponse(content=data, headers=cc_headers)


async def _refresh_catalog_cache():
    """Background task: fetch fresh data and replace cache entry."""
    try:
        fresh_data = await _fetch_product_catalog()
        _cache_store["catalog"] = {
            "data": fresh_data,
            "timestamp": time.time(),
            "_stale_while_revalidate": 15,
        }
    except Exception as exc:
        # Background refresh failure — stale content persists (expected behavior)
        print(f"[cache-refresh] Catalog refresh failed: {exc}")


async def _fetch_product_catalog() -> list[dict]:
    """Simulate origin database call for product catalog."""
    return [{"id": 1, "name": "Widget", "price": 9.99}]


# --- Stale-If-Error: Resilience Pattern ---

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    """
    Order detail with stale-if-error for outage resilience.

    If the order database is unreachable, serve a slightly-stale cached copy
    rather than returning a 502/503 to the end user. The cache entry expires
    after stale_if_error seconds, forcing a re-fetch on subsequent requests.

    Cache-Control: private, max-age=30, stale-if-error=600
    """
    cached = _cache_store.get(f"order:{order_id}")

    # Check if we have any cache entry (fresh or stale)
    if cached and time.time() - cached.get("timestamp", 0) < 630:
        staleness = time.time() - cached["timestamp"]
        is_stale = staleness > 30

        try:
            # Try origin first — this may fail during outages
            fresh_data = await _fetch_order_from_db(order_id)
            _cache_store[f"order:{order_id}"] = {
                "data": fresh_data,
                "timestamp": time.time(),
            }
            if is_stale:
                return JSONResponse(
                    content=fresh_data,
                    headers={
                        "Cache-Control": "private, max-age=30",
                        "X-Cache": "REFRESHED (was stale)",
                    },
                )
            return JSONResponse(content=fresh_data, headers={"X-Cache": "HIT"})

        except Exception:
            # Origin unreachable — serve stale content instead of 5xx error
            if is_stale:
                return JSONResponse(
                    content=cached["data"],
                    headers={
                        "Cache-Control": "private, max-age=30, stale-if-error=600",
                        "X-Cache": "STALE (origin unreachable)",
                        "X-Stale-If-Error": "served due to upstream failure",
                    },
                )
            raise

    # No cache — fetch from origin with full error handling
    try:
        data = await _fetch_order_from_db(order_id)
        _cache_store[f"order:{order_id}"] = {
            "data": data,
            "timestamp": time.time(),
        }
        return JSONResponse(content=data)
    except Exception:
        raise HTTPException(status_code=502, detail="Order service unavailable")


async def _fetch_order_from_db(order_id: str) -> dict:
    """Simulate order database lookup."""
    return {"id": order_id, "status": "shipped", "total": 49.99}
```

### Pattern 4: Vary Header Configuration for Content Negotiation

The Vary header tells caches which request headers influenced the response. Omitting Vary causes cache poisoning where one user's compressed response gets served to another user with a different encoding preference.

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse


def set_vary_headers(response: Response, vary_headers: list[str]) -> None:
    """
    Set the Vary header on a response, accumulating multiple values.

    The Vary header must list every request header that affects the response body.
    Multiple Vary headers are merged; this function handles both single and
    accumulated (comma-separated) Vary values correctly.

    Args:
        response: FastAPI response object to modify.
        vary_headers: List of HTTP header names that affect response content.

    Examples:
        set_vary_headers(response, ["Accept-Encoding"])          # Compression affects body
        set_vary_headers(response, ["Accept-Language"])         # Localization affects body
        set_vary_headers(response, ["Accept", "Accept-Encoding", "Accept-Language"])  # Full negotiation
    """
    if not vary_headers:
        return

    # Get existing Vary header value (may be comma-separated from multiple calls)
    existing = response.headers.get("vary", "")
    if existing:
        # Split, deduplicate, rejoin — handles accumulation across middleware layers
        existing_headers = {h.strip().lower() for h in existing.split(",")}
        new_headers = existing_headers | {h.lower() for h in vary_headers}
        response.headers["Vary"] = ", ".join(sorted(new_headers))
    else:
        response.headers["Vary"] = ", ".join(vary_headers)


# --- Content Negotiation with Proper Vary Headers ---

@app.get("/products/{product_id}")
async def get_product_negotiated(
    request: Request,
    product_id: str,
    accept: str = "application/json",
):
    """
    Product detail endpoint with content negotiation.

    The response body format may differ based on Accept header values.
    Without Vary: Accept headers, caches would serve one format to all clients,
    causing malformed responses for clients expecting a different format.

    Vary: Accept — tells every cache that this response varies by Accept header.
    """
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)

    # Select format based on Accept header negotiation
    if "application/xml" in accept:
        body = _serialize_to_xml(product)
        content_type = "application/xml"
    elif "text/html" in accept:
        body = _serialize_to_html(product)
        content_type = "text/html"
    else:
        body = product  # JSON (default)
        content_type = "application/json"

    response = JSONResponse(content=body, media_type=content_type)

    # Set cache policy
    headers = select_cache_control("public_ttl", max_staleness_seconds=300)
    for k, v in headers.items():
        if not k.startswith("_"):
            response.headers[k] = v

    # CRITICAL: Vary on Accept — different Accept headers produce different bodies
    set_vary_headers(response, ["Accept"])

    return response


@app.get("/dashboard/analytics")
async def get_analytics(
    request: Request,
    accept_encoding: str = Header("gzip"),
    accept_language: str = "en",
    timezone: str = "UTC",
):
    """
    Analytics dashboard with compression and localization.

    Response body changes based on Accept-Encoding (compressed vs uncompressed),
    Accept-Language (localized labels), and X-Timezone (date formatting).

    Vary: Accept-Encoding, Accept-Language — tells caches to store separate
    variants for each combination of these headers.
    """
    analytics_data = await fetch_analytics()

    # Apply timezone conversion (affects date string formatting in response)
    if timezone != "UTC":
        analytics_data = _convert_timezone(analytics_data, timezone)

    response = JSONResponse(content=analytics_data)

    headers = select_cache_control("private", is_authenticated=True, max_staleness_seconds=60)
    for k, v in headers.items():
        if not k.startswith("_"):
            response.headers[k] = v

    # Vary on all headers that affect the response body
    set_vary_headers(response, [
        "Accept-Encoding",   # Compression affects byte content
        "Accept-Language",   # Localization affects label text
    ])

    return response


# --- Anti-pattern: Missing Vary Causes Cache Corruption ---

@app.get("/i18n/labels")
async def get_i18n_labels_bad(
    accept_language: str = Header("en"),
):
    """
    ❌ BAD: No Vary header on localized content.

    Client A requests Accept-Language: en → gets English labels cached at proxy.
    Client B requests Accept-Language: ja → receives same cached English response.
    This is cache poisoning — the proxy stored only one variant but served it
    to all clients regardless of their language preference.
    """
    labels = _fetch_labels(accept_language)
    return JSONResponse(content=labels)
    # Missing: set_vary_headers(response, ["Accept-Language"])


# --- Correct Version with Vary ---

@app.get("/i18n/labels")
async def get_i18n_labels_good(
    accept_language: str = Header("en"),
):
    """✅ GOOD: Vary header ensures cache stores per-language variants."""
    labels = _fetch_labels(accept_language)
    response = JSONResponse(content=labels)

    headers = select_cache_control("public_ttl", max_staleness_seconds=3600)
    for k, v in headers.items():
        if not k.startswith("_"):
            response.headers[k] = v

    set_vary_headers(response, ["Accept-Language"])

    return response


# --- Stub helpers for completeness (replace with real implementations) ---
def _serialize_to_xml(data: dict) -> dict: ...
def _serialize_to_html(data: dict) -> dict: ...
def fetch_analytics() -> list[dict]: ...
def _convert_timezone(data: dict, tz: str) -> dict: ...
def db.query(*args): ...
def _fetch_labels(lang: str) -> dict: ...
```

### Pattern 5: Cache Invalidation Strategies (BAD vs. GOOD)

Cache invalidation is the hardest part of caching. Three strategies work in concert: TTL expiration (safety net), push invalidation on writes (primary mechanism), and versioned keys for schema changes.

```python
# ❌ BAD: No invalidation — cached data persists until arbitrary eviction,
#   leading to indefinite stale reads after writes.
class BadCacheManager:
    """Every write silently corrupts the cache because nothing is invalidated."""

    def __init__(self):
        self._cache: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        return self._cache.get(key)

    def set(self, key: str, value: Any, ttl: int = 300):
        self._cache[key] = {"data": value, "expires": time.time() + ttl}

    # ❌ No invalidation — products are never invalidated after a write.
    #   If product price changes at 14:00, the old price persists until TTL expires,
    #   potentially hours later.


# ✅ GOOD: Three-pronged invalidation strategy
class CacheManager:
    """
    Implements three complementary invalidation strategies:

    1. **TTL Expiration** (Safety Net): Every entry has an expiry timestamp.
       If push invalidation is missed, TTL eventually cleans up stale data.

    2. **Push Invalidation** (Primary Mechanism): On every write mutation
       (POST/PUT/PATCH/DELETE), the corresponding cache keys are explicitly deleted.
       This is the fastest path to consistency.

    3. **Versioned Keys** (Schema Changes): When data schema changes, increment
       a version prefix in cache keys. Old entries become cold naturally as new
       writes use the updated key format.
    """

    def __init__(self, default_ttl: int = 300):
        self._store: dict[str, dict] = {}
        self._default_ttl = default_ttl
        self._version_counter: dict[str, int] = {"product": 1, "order": 1}

    def _build_key(self, resource_type: str, identifier: str) -> str:
        """Build a versioned cache key for the given resource type and identifier."""
        version = self._version_counter.get(resource_type, 1)
        return f"v{version}:{resource_type}:{identifier}"

    def get(self, key: str) -> Any | None:
        """Retrieve cached value if not expired."""
        entry = self._store.get(key)
        if entry is None:
            return None

        # TTL check — safety net for any missed push invalidation
        if time.time() > entry["expires"]:
            del self._store[key]
            return None  # Cache miss due to expiry

        return entry["data"]

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store a value with TTL expiration."""
        self._store[key] = {
            "data": value,
            "expires": time.time() + (ttl or self._default_ttl),
        }

    def invalidate(self, resource_type: str, identifier: str) -> int:
        """
        Push invalidation: remove all cache entries matching a resource.

        Called on every write mutation (POST/PUT/PATCH/DELETE). This is the
        primary consistency mechanism — TTL is only a safety net.

        Returns the number of keys removed.
        """
        keys_to_remove = [
            k for k in self._store
            if k.endswith(f":{resource_type}:{identifier}") or k == key_prefix(resource_type, identifier)
        ]

        # Also invalidate collection-level keys that might include this resource
        collection_keys = [
            k for k in self._store
            if k.startswith(f"{resource_type}:collection:")
        ]
        keys_to_remove.extend(collection_keys)

        for key in keys_to_remove:
            del self._store[key]

        return len(keys_to_remove)

    def bump_version(self, resource_type: str) -> int:
        """
        Versioned invalidation: increment the version counter for a resource type.

        All existing keys with the old version prefix become cold and will be
        evicted on TTL expiry. New writes use the new version prefix immediately.

        This is used when data schema changes (e.g., adding a field, changing types).
        """
        self._version_counter[resource_type] = self._version_counter.get(resource_type, 1) + 1
        return self._version_counter[resource_type]


def key_prefix(resource_type: str, identifier: str) -> str:
    """Generate base key prefix for matching."""
    return f"{resource_type}:{identifier}"


# --- Real-world usage in API handlers ---

@app.post("/products")
async def create_product(product: dict):
    """Create product — invalidate product catalog cache on creation."""
    result = db.insert("products", product)
    # Push invalidation: stale data is gone immediately
    cache_manager.invalidate("product", str(result["id"]))
    cache_manager.invalidate("product", "collection")  # Invalidate collection list
    return JSONResponse(content=result, status_code=201)


@app.put("/products/{product_id}")
async def update_product(product_id: str, product: dict):
    """Update product — invalidate single-product cache on modification."""
    result = db.update("products", product_id, product)
    # Push invalidation on every mutation path
    cache_manager.invalidate("product", product_id)
    cache_manager.invalidate("product", "collection")
    return JSONResponse(content=result)


@app.patch("/products/{product_id}")
async def patch_product(product_id: str, updates: dict):
    """Partial update — same invalidation as full update."""
    result = db.patch("products", product_id, updates)
    cache_manager.invalidate("product", product_id)
    cache_manager.invalidate("product", "collection")
    return JSONResponse(content=result)


@app.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete product — remove from cache immediately."""
    db.delete("products", product_id)
    cache_manager.invalidate("product", product_id)
    cache_manager.invalidate("product", "collection")
    return Response(status_code=204)


# Schema migration example using versioned keys
@app.post("/admin/migrations/schema-update/products")
async def migrate_products_schema():
    """Increment product cache version after schema change."""
    new_version = cache_manager.bump_version("product")
    # All old cached entries (v1:product:*) are now cold
    # New writes automatically use v2:product:* keys
    return JSONResponse(content={"migrated": True, "new_version": new_version})
```

### Pattern 6: Cache-Bypass Pattern for Fresh Data Requests

Sometimes clients need fresh data even when cache is available. The `Cache-Control: no-cache` request header tells the server (and intermediaries) to validate before serving, without requiring a full origin fetch.

```python
# ✅ GOOD: Respecting client's freshness intent via Cache-Control request header

@app.get("/products/{product_id}")
async def get_product_with_bypass(
    request: Request,
    product_id: str,
):
    """
    Product endpoint supporting cache bypass.

    Client can send Cache-Control: no-cache in the request to force server-side
    validation before serving a response. This is different from no-store — the
    cached copy still exists, it just must be revalidated first.

    Use cases for cache bypass:
      - User just edited an item and wants to see changes immediately
      - Debugging / troubleshooting specific data state
      - Admin operations that require authoritative freshness
    """
    # Check if client explicitly requested fresh data
    request_cc = request.headers.get("cache-control", "")

    # Try cache first (unless client bypassed it)
    if "no-cache" not in request_cc:
        cached = cache_manager.get(f"product:{product_id}")
        if cached is not None:
            return JSONResponse(
                content=cached,
                headers={
                    "Cache-Control": "public, max-age=300",
                    "X-Cache": "HIT",
                    "X-Cache-Validated": "false",  # Not revalidated — served from cache directly
                },
            )

    # Cache miss or client requested validation — fetch from origin
    product = db.query("SELECT * FROM products WHERE id = $1", product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    # Store in cache with TTL
    cache_manager.set(f"product:{product_id}", product, ttl=300)

    response_headers = {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        "X-Cache": "MISS",  # Not served from cache
        "ETag": generate_etag(product),
    }

    if request.headers.get("cache-control") == "no-cache":
        response_headers["X-Cache-Validated"] = "true"  # Explicitly validated on demand

    return JSONResponse(content=product, headers=response_headers)
```

---

## Constraints

### MUST DO
- **Always include Cache-Control header** on every cacheable response — never leave caching behavior to proxy defaults. Explicit is correct; implicit is a bug waiting to happen.
- **Use ETag for resources that change independently of timestamps.** If a resource can be updated multiple times within a second (or the database clock isn't monotonic), ETag is required over Last-Modified.
- **Return 304 Not Modified** for valid `If-None-Match` or `If-Modified-Since` requests. The response body must be empty; only headers should be sent.
- **Set Vary header** when the response depends on request headers. At minimum: `Accept-Encoding` (if compression is applied), `Accept-Language` (if localized), and `Accept` (if content negotiation exists).
- **Distinguish no-cache from no-store**: `no-cache` means "cache but validate before reuse" (ETag or date check required); `no-store` means "never cache, never persist." They are fundamentally different.
- **Use stale-while-revalidate** to improve perceived latency — serve fresh content within the TTL while refreshing in the background and updating the cache for subsequent requests.
- **Instrument cache behavior** with metrics: hit rate, miss rate, 304 response count, and stale-serve count. Without observability, caching is an unmeasured guess.

### MUST NOT DO
- **Never cache user-specific data with public Cache-Control.** Always mark authenticated responses as `private` or use `no-store`. A shared proxy serving one user's order history to another is a critical security vulnerability.
- **Never rely solely on Last-Modified** for resources that can change multiple times per second. HTTP date precision is one second; concurrent modifications will produce false 304 responses.
- **Never return cached responses for authenticated endpoints without proper Vary: Authorization.** If two requests differ only by the Authorization header but receive different bodies, caching them under one key corrupts all subsequent clients.
- **Never omit ETag on large responses.** A 5MB JSON payload wasted on an unchanged resource is expensive bandwidth and slow UX. ETag enables the client to download zero bytes instead.
- **Never use a TTL longer than the maximum acceptable staleness** for your data type. If product prices should be fresh within 5 minutes, setting max-age=3600 causes visible price mismatches.
- **Never bypass cache validation to serve stale content during errors unless explicitly using stale-if-error.** Serving silently-stale data on 5xx responses without the directive is data corruption disguised as availability.

---

## Output Template

When implementing or reviewing REST API caching with this skill active, produce:

1. **Cacheability Classification** — For each endpoint, specify: `public` / `private` / `no-store`, with justification based on data sensitivity and user specificity.

2. **Cache-Control Header Specification** — List the exact header value for each response type:
   - Public TTL-cached: `public, max-age=60, stale-while-revalidate=15, stale-if-error=300`
   - Validate-before-use: `no-cache`
   - User-specific: `private, max-age=30, stale-while-revalidate=7`
   - Never cached: `no-store`

3. **Conditional GET Support** — Confirm ETag generation logic and describe the 304 response flow. Include a curl example demonstrating the client-server exchange:
   ```
   # First request
   $ curl -v /api/v1/products/42
   → 200 OK, ETag: "abc123", Cache-Control: public, max-age=300
   
   # Second request (same resource, no changes)
   $ curl -v -H 'If-None-Match: "abc123"' /api/v1/products/42
   → 304 Not Modified (empty body — zero bytes transferred)
   ```

4. **Vary Header Declaration** — List every Vary directive per endpoint with justification for each header that affects the response body.

5. **Cache Invalidation Map** — For write endpoints (POST/PUT/PATCH/DELETE), list which cache keys are invalidated and by which mechanism (push invalidation, version bump, or TTL).

6. **Metrics Specification** — Define the observability requirements: hit rate %, 304 count, stale-serve count, and origin-fetch count per endpoint.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `fastapi-patterns` | FastAPI-specific patterns for building endpoints that work well with HTTP caching middleware |
| `rest-api-patterns` | RESTful design conventions that determine which endpoints should and shouldn't be cached |
| `system-design-fundamentals` | Architect-level decisions about when to add cache layers, CDN integration, and multi-tier caching strategy |
| `performance-optimization` | Broader performance patterns including database query optimization and response payload compression |

---

## References

- [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) — Official specification for HTTP caching mechanisms including ETags, Vary, Cache-Control, and 304 semantics
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) — Practical guide to browser and CDN cache behavior with real-world examples
- [Cloudflare: HTTP Caching](https://developers.cloudflare.com/cache/how-to/reference-http-cache-control-headers/) — CDN-specific guidance on how providers interpret Cache-Control directives
- [RFC 7232 — HTTP Conditional Requests](https://www.rfc-editor.org/rfc/rfc7232.html) — Specification for If-None-Match, If-Modified-Since, and 304 Not Modified
> 📖 skill: rest-api-caching
