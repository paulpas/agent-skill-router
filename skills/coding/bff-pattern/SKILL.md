---




name: bff-pattern
description: Implements backend-for-frontend (BFF) architecture patterns including client-tailored API backends, data aggregation from multiple microservices, authentication delegation, response shaping, and offline optimization for web, mobile, and partner clients.
license: MIT
compatibility: opencode
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
metadata:
  version: "1.0.0"
  domain: coding
  triggers: backend-for-frontend, bff pattern, client-specific API, data aggregation, response shaping, authentication delegation, how do i tailor APIs for different clients, web backend
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: api-composition-patterns,microservices-architecture,cloud-native-architecture




---





# Backend-for-Frontend (BFF) Pattern

Implements client-tailored backend API backends that aggregate data from multiple microservices, handle authentication delegation, and shape responses for specific client types (web SPA, mobile apps, partner integrations). The BFF acts as a single entry point per client family, shielding downstream services from client-specific concerns like payload optimization, offline caching, and device-specific field selection.

## TL;DR Checklist

- [ ] Create separate BFF per client type (web, mobile, partner) — never share a single BFF across all clients
- [ ] Aggregate data from upstream microservices in parallel to minimize latency
- [ ] Shape responses for each client's specific rendering requirements (null stripping for mobile, flattened structures for web)
- [ ] Handle authentication/authorization at the BFF boundary — downstream services trust the BFF via internal JWT or mTLS
- [ ] Implement caching and conditional response strategies (ETag, If-None-Match) for offline/low-bandwidth clients
- [ ] Set circuit breakers and fallbacks per upstream dependency to prevent cascading failures

---

## When to Use

Use this skill when:

- Different client types (web SPA, iOS app, Android app, partner API, IoT device) need different data shapes from the same set of microservices
- You need to reduce network round-trips by aggregating multiple microservice calls into a single client-facing response per screen or view load
- You want to isolate authentication and authorization concerns at the API boundary — end clients talk OAuth/OIDC to the BFF, not directly to microservices
- Mobile or low-bandwidth clients need optimized payloads with ETag-based caching, conditional requests, and differential sync
- Partner integrations require a stable, versioned API surface that shields them from internal service refactoring and decomposition

---

## When NOT to Use

Avoid this skill for:

- Systems with only one client type (use an API gateway or direct microservice calls instead)
- Real-time streaming scenarios — BFF is designed for request-response aggregation, not WebSocket or SSE streaming pipelines
- Simple CRUD applications where each screen maps directly to one microservice endpoint (add overhead without benefit)
- When the operational cost of maintaining multiple BFF instances exceeds the payload optimization gains

---

## Core Workflow

1. **Identify Client Types** — Inventory every client family that consumes your services: web SPA, iOS app, Android app, partner API, IoT dashboards, third-party integrations. Each client type has distinct rendering needs and bandwidth constraints.

2. **Define Aggregation Contracts** — For each screen or view within a client, map which microservices provide the data needed. Design a unified response type that combines all upstream results into a single payload shape optimized for that client's UI framework.

3. **Implement Data Fetching Layer** — Build the composition logic using parallel async calls with timeout isolation per upstream service. Every upstream call must have its own circuit breaker and fallback defaults so one slow service doesn't poison the entire response.

4. **Add Authentication Delegation** — Configure the BFF as the OAuth 2.0 / OpenID Connect client for your client type. Once the user authenticates with the BFF, issue an internal JWT (or use mTLS) that downstream microservices trust without re-authenticating the end user.

5. **Shape Responses Per Client** — Transform raw microservice responses into client-optimized payloads. Strip null fields for mobile bandwidth savings, flatten nested structures for React/Vue rendering, apply field selection based on requested columns, and compress large payloads with gzip/brotli.

---

## Implementation Patterns

### Pattern 1: Parallel Data Aggregation with Timeout Isolation and Fallbacks

Aggregates data from multiple microservices concurrently, each with its own timeout budget. When a service times out or fails, the BFF returns a partially-populated response with sensible defaults rather than failing entirely. This pattern follows the "fail gracefully, not loudly" principle — users see degraded but functional pages instead of errors.

```python
"""BFF aggregation layer: parallel fetching with timeout isolation and fallback defaults."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import aiohttp

logger = logging.getLogger("bff.aggregation")


@dataclass
class UserProfilePayload:
    """Unified response shape for the user profile screen — tailored for web SPA rendering."""
    name: str
    email: str
    avatar_url: str | None
    orders: list[dict[str, Any]] = field(default_factory=list)
    preferences: dict[str, Any] = field(default_factory=dict)
    unread_notifications: int = 0
    loyalty_tier: str = "standard"
    last_login: str | None = None


# Upstream service clients — thin wrappers around HTTP calls
class _UserClient:
    """Thin client for the user-service microservice."""

    BASE = "http://user-service:8080/api/v1"

    @classmethod
    async def get_profile(cls, session: aiohttp.ClientSession, user_id: str) -> dict[str, Any]:
        async with session.get(f"{cls.BASE}/users/{user_id}") as resp:
            resp.raise_for_status()
            return await resp.json()

    @classmethod
    async def get_preferences(cls, session: aiohttp.ClientSession, user_id: str) -> dict[str, Any]:
        async with session.get(f"{cls.BASE}/users/{user_id}/preferences") as resp:
            resp.raise_for_status()
            return await resp.json()


class _OrderClient:
    """Thin client for the order-service microservice."""

    BASE = "http://order-service:8081/api/v1"

    @classmethod
    async def get_recent_orders(cls, session: aiohttp.ClientSession, user_id: str, limit: int = 5) -> list[dict[str, Any]]:
        async with session.get(f"{cls.BASE}/users/{user_id}/orders?limit={limit}") as resp:
            resp.raise_for_status()
            return await resp.json()


class _NotificationClient:
    """Thin client for the notification-service microservice."""

    BASE = "http://notif-service:8082/api/v1"

    @classmethod
    async def count_unread(cls, session: aiohttp.ClientSession, user_id: str) -> int:
        async with session.get(f"{cls.BASE}/users/{user_id}/unread_count") as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data.get("count", 0)


class _LoyaltyClient:
    """Thin client for the loyalty-service microservice (often slow — needs aggressive fallback)."""

    BASE = "http://loyalty-service:8083/api/v1"

    @classmethod
    async def get_tier(cls, session: aiohttp.ClientSession, user_id: str) -> str:
        async with session.get(f"{cls.BASE}/users/{user_id}/tier") as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data.get("tier", "standard")


class ServiceTimeout(Exception):
    """Raised when an upstream service call exceeds its timeout budget."""


async def fetch_with_timeout(
    service_name: str,
    fn: asyncio.coroutine,
    timeout_seconds: float,
) -> Any:
    """Execute a coroutine with strict timeout isolation. Returns None on failure."""
    try:
        return await asyncio.wait_for(fn, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.warning("[bff-timeout] %s exceeded %.1fs budget", service_name, timeout_seconds)
        return None  # Fallback: return None and let the aggregator fill defaults
    except Exception as exc:
        logger.error("[bff-error] %s failed: %s", service_name, exc)
        return None


async def aggregate_user_profile(
    user_id: str,
    timeout_budget: float = 2.0,
) -> UserProfilePayload:
    """Fetch a complete user profile by aggregating data from multiple microservices in parallel.

    Each upstream service runs concurrently with its own timeout budget. If any service
    fails or times out, the response is populated with fallback defaults so the client
    still sees a valid (if partially degraded) page.

    Args:
        user_id: The user whose profile to aggregate.
        timeout_budget: Per-service timeout in seconds. Total wall time ≈ budget * num_services.

    Returns:
        A fully-formed UserProfilePayload with fallback defaults for any failed services.
    """
    async with aiohttp.ClientSession() as session:
        # All four services fetch concurrently — total latency is the max, not the sum
        tasks = {
            "profile": fetch_with_timeout("user-service", _UserClient.get_profile(session, user_id), timeout_budget),
            "preferences": fetch_with_timeout("prefs-service", _UserClient.get_preferences(session, user_id), timeout_budget),
            "orders": fetch_with_timeout("order-service", _OrderClient.get_recent_orders(session, user_id), timeout_budget),
            "notifications": fetch_with_timeout("notif-service", _NotificationClient.count_unread(session, user_id), timeout_budget),
            "loyalty": fetch_with_timeout("loyalty-service", _LoyaltyClient.get_tier(session, user_id), timeout_budget),
        }

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    # Build aggregated response with explicit fallback defaults per service
    profile_data = results[0] if isinstance(results[0], dict) else {}
    prefs_data = results[1] if isinstance(results[1], dict) else {}
    orders_data = results[2] if isinstance(results[2], list) else []
    notif_count = results[3] if isinstance(results[3], int) else 0
    loyalty_tier = results[4] if isinstance(results[4], str) else "standard"

    return UserProfilePayload(
        name=profile_data.get("name", "Unknown User"),
        email=profile_data.get("email", ""),
        avatar_url=profile_data.get("avatar_url"),
        orders=orders_data if orders_data else [],
        preferences=prefs_data if prefs_data else {},
        unread_notifications=notif_count,
        loyalty_tier=str(loyalty_tier) if loyalty_tier else "standard",
        last_login=profile_data.get("last_login"),
    )
```

### Pattern 2: Response Shaping and Field Selection (BAD vs GOOD)

Transforms raw microservice responses into client-optimized payloads. Mobile clients benefit from null field stripping (reduces JSON size by 15–40%), while web clients may need deeply nested objects that match their React/Vue component hierarchy. The BFF applies the right transformation per client type before the response leaves the layer.

```python
"""Response shaping utilities for client-optimized payload transformation."""

from __future__ import annotations

import json
import gzip
import base64
import hashlib
from typing import Any


def strip_nulls(obj: Any) -> Any:
    """Recursively remove null (None) values from dicts and lists.

    Mobile clients benefit significantly from null stripping — a JSON payload
    without null fields is typically 15-40% smaller, reducing data usage and
    parse time on constrained devices.

    Args:
        obj: The input object (dict, list, or scalar).

    Returns:
        A new object with all None values removed recursively.
    """
    if isinstance(obj, dict):
        return {k: strip_nulls(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        stripped = [strip_nulls(item) for item in obj if item is not None]
        return stripped
    return obj


def apply_field_selection(response: dict[str, Any], requested_fields: list[str]) -> dict[str, Any]:
    """Return only the requested fields from a response using dot-notation paths.

    Enables bandwidth optimization on mobile networks where clients request
    only the columns they need for a specific view (e.g., list view vs detail view).

    Example:
        >>> shape = {"user": {"name": "Alice", "email": "alice@example.com"}, "orders": [...]}
        >>> apply_field_selection(shape, ["user.name"])
        {"user.name": "Alice"}

    Args:
        response: The full raw response from upstream services.
        requested_fields: Dot-notation field paths (e.g., "user.name", "orders.total").

    Returns:
        A dict containing only the requested fields.
    """
    result: dict[str, Any] = {}
    for field_path in requested_fields:
        parts = field_path.strip().split(".")
        value = _nested_get(response, parts)
        if value is not None:
            result[field_path] = value
    return result


def flatten_response(obj: Any, parent_key: str = "", separator: str = ".") -> dict[str, Any]:
    """Flatten a nested dict/list structure into dot-notation keys.

    Web frontends (React/Vue) often prefer flat key structures for easier
    template rendering and state management (e.g., Redux stores).

    Example:
        >>> flatten_response({"user": {"name": "Alice"}, "orders": [{"id": 1}]})
        {"user.name": "Alice", "orders.0.id": 1}
    """
    items: list[tuple[str, Any]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{parent_key}{separator}{k}" if parent_key else k
            items.extend(flatten_response(v, new_key, separator).items())
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            new_key = f"{parent_key}{separator}{i}" if parent_key else str(i)
            items.extend(flatten_response(v, new_key, separator).items())
    else:
        return {parent_key: obj} if parent_key else {}

    return dict(items)


def generate_etag(payload: bytes) -> str:
    """Generate an ETag hash for response caching (RFC 7232).

    Returns a strong ETag suitable for HTTP conditional requests.
    Clients can send If-None-Match to skip payload delivery on cache hits.
    """
    digest = hashlib.sha256(payload).hexdigest()
    return f'"{digest[:16]}"'


def compress_payload(data: dict[str, Any], algorithm: str = "gzip") -> tuple[bytes, str]:
    """Compress a JSON payload using gzip or brotli.

    Returns (compressed_bytes, content_encoding) for HTTP response headers.
    """
    raw_json = json.dumps(data, separators=(",", ":")).encode("utf-8")
    if algorithm == "brotli":
        import brotli  # type: ignore[import-not-found]
        compressed = brotli.compress(raw_json, quality=6)
        return compressed, "br"
    else:
        compressed = gzip.compress(raw_json, compresslevel=6)
        return compressed, "gzip"


# ============================================================
# ❌ BAD vs ✅ GOOD — Response Shaping Anti-Patterns
# ============================================================

# ❌ BAD: Forwarding raw microservice response without any shaping
async def bad_bff_handler(user_id: str) -> dict:
    """Returns the raw JSON from user-service verbatim — mobile clients waste bandwidth."""
    # No null stripping, no field selection, no compression
    raw = await _UserClient.get_profile(aiohttp.ClientSession(), user_id)  # type: ignore[arg-type]
    return raw  # Sends all fields including internals, nulls, and large arrays


# ✅ GOOD: Client-aware response shaping with null stripping and ETag support
async def good_bff_handler(
    user_id: str,
    client_type: str = "web",      # "web", "mobile-ios", "mobile-android", "partner"
    requested_fields: list[str] | None = None,
    if_none_match: str | None = None,
) -> dict[str, Any]:
    """Shape the response based on client type and request headers.

    Args:
        user_id: Target user ID.
        client_type: Client family for shaping decisions.
        requested_fields: Optional field selection (bandwidth optimization).
        if_none_match: ETag from client — return 304 Not Modified if payload unchanged.

    Returns:
        Shaped, compressed, and cache-optimized response dict.
    """
    profile = await aggregate_user_profile(user_id)

    # Serialize to JSON for ETag generation
    raw_json = json.dumps(profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__, sort_keys=True).encode("utf-8")
    etag = generate_etag(raw_json)

    # RFC 7232: If the client already has this version, send nothing
    if if_none_match and if_none_match == etag:
        return {"status": 304, "etag": etag}

    data = profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__

    # Shape per client type
    if client_type.startswith("mobile"):
        data = strip_nulls(data)  # Remove null fields to reduce payload size
    elif client_type == "partner":
        pass  # Partners get full payloads — no shaping needed

    # Apply field selection if requested (e.g., list view only needs name + email)
    if requested_fields:
        data = apply_field_selection(data, requested_fields)

    # Add cache headers for the HTTP response layer
    data["_meta"] = {"etag": etag}

    return data
```

### Pattern 3: Authentication Delegation with Internal Token Trust

The BFF handles all external OAuth 2.0 / OpenID Connect flows (authorization code + PKCE for SPAs, device flow for IoT). Once authenticated, it issues an internal JWT that downstream microservices trust via shared secret or mTLS certificate validation. Downstream services never see end-user credentials — they only validate the BFF-issued token and enforce tenant-level access control.

```python
"""BFF authentication delegation: external OAuth flows in, internal JWT out."""

from __future__ import annotations

import hmac
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt as pyjwt


@dataclass
class AuthenticatedSession:
    """Represents a fully authenticated user session at the BFF boundary."""
    user_id: str
    tenant_id: str | None
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
    internal_token_expires_at: float = 0.0
    refresh_token: str = ""


class BFFAuthDelegator:
    """Handles external OAuth/OIDC authentication and issues internal tokens for downstream services.

    Flow:
      1. Client (web SPA / mobile app) authenticates with the BFF via OAuth 2.0 Authorization Code + PKCE
      2. BFF exchanges the auth code at the Identity Provider (Auth0, Keycloak, Cognito)
      3. BFF validates the ID token, extracts user claims, and creates an AuthenticatedSession
      4. For downstream calls, BFF issues a short-lived internal JWT that microservices trust
      5. Downstream services validate the internal JWT signature + expiry — no re-authentication needed

    Security notes:
      - Internal JWT secret must be provisioned via secrets manager (Vault, AWS Secrets Manager)
      - Internal tokens have shorter TTL than external sessions (1h vs 24h)
      - mTLS is preferred over internal JWT in production (mutual TLS between BFF and services)
    """

    # In production: load from environment or secrets manager
    _INTERNAL_JWT_SECRET: str = "changeme-in-production-use-secrets-manager"
    INTERNAL_JWT_ALGORITHM: str = "HS256"
    TOKEN_TTL: timedelta = timedelta(hours=1)
    REFRESH_TOKEN_TTL_DAYS: int = 7

    def __init__(self, internal_jwt_secret: str | None = None):
        if internal_jwt_secret:
            self._INTERNAL_JWT_SECRET = internal_jwt_secret

    @classmethod
    def set_secret(cls, secret: str) -> None:
        """Set the shared secret for internal JWT signing (call at startup from secrets manager)."""
        cls._INTERNAL_JWT_SECRET = secret

    def create_internal_token(
        self,
        session: AuthenticatedSession,
        ttl_override: timedelta | None = None,
    ) -> str:
        """Issue an internal JWT that downstream microservices trust.

        The token contains user identity, tenant context, and roles — sufficient for
        downstream services to enforce authorization without calling the identity provider.

        Args:
            session: The authenticated session from the external OAuth flow.
            ttl_override: Optional custom TTL (defaults to 1 hour).

        Returns:
            A signed internal JWT string.
        """
        now = datetime.now(timezone.utc)
        ttl = ttl_override or self.TOKEN_TTL

        payload: dict[str, Any] = {
            "sub": session.user_id,                    # Subject (user ID)
            "tid": session.tenant_id,                  # Tenant context for multi-tenancy
            "roles": session.roles,                    # User roles for RBAC
            "jti": str(uuid.uuid4()),                  # Unique token ID for revocation tracking
            "iss": "bff-auth",                         # Issuer — downstream services check this
            "iat": now,                                # Issued at
            "exp": now + ttl,                          # Expiration
        }

        return pyjwt.encode(payload, self._INTERNAL_JWT_SECRET, algorithm=self.INTERNAL_JWT_ALGORITHM)

    def validate_internal_token(self, token: str) -> dict[str, Any] | None:
        """Validate an internal JWT issued by the BFF. Returns payload or None if invalid.

        Downstream microservices use this to authenticate requests coming from the BFF.
        """
        try:
            payload = pyjwt.decode(
                token,
                self._INTERNAL_JWT_SECRET,
                algorithms=[self.INTERNAL_JWT_ALGORITHM],
                issuer="bff-auth",  # Only accept tokens from the BFF auth subsystem
            )
            return payload
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError, pyjwt.DecodeError):
            return None

    def forward_with_auth(
        self,
        session: AuthenticatedSession,
        service_url: str,
        method: str = "GET",
        body: dict | list | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Forward a request to a downstream microservice with BFF-issued auth.

        This is the delegation pattern in action: the end client never talks directly
        to the microservice. All requests route through the BFF which injects the
        internal JWT and any tenant-scoped headers.

        Args:
            session: The authenticated user session.
            service_url: Target microservice endpoint URL.
            method: HTTP method.
            body: Optional request body for POST/PUT.
            headers: Additional headers to include.

        Returns:
            Parsed JSON response from the downstream service, or raises on HTTP error.
        """
        import requests  # For sync BFF; use aiohttp in async context

        internal_token = self.create_internal_token(session)

        request_headers = {
            "Authorization": f"Bearer {internal_token}",
            "X-Internal-BFF": "true",          # Marks this as a trusted internal request (skip re-auth)
            "X-Tenant-ID": session.tenant_id or "",  # Tenant routing header
        }

        if headers:
            request_headers.update(headers)

        response = requests.request(
            method=method,
            url=service_url,
            json=body,
            headers=request_headers,
            timeout=5.0,
        )
        response.raise_for_status()
        return response.json()


# ============================================================
# ❌ BAD vs ✅ GOOD — Authentication Delegation Anti-Patterns
# ============================================================

# ❌ BAD: Forwarding user credentials directly to downstream services
class bad_auth_delegator:
    """Never forward end-user tokens to microservices."""

    async def forward_bad(self, user_access_token: str, service_url: str) -> dict:
        # ⚠️ Security issue: downstream services now hold the user's real token
        # ⚠️ You can't rotate the identity provider without changing all microservice configs
        # ⚠️ Audit trails show "user" did the action, not "BFF on behalf of user"
        return requests.get(service_url, headers={"Authorization": f"Bearer {user_access_token}"}).json()


# ✅ GOOD: BFF issues scoped internal tokens with tenant awareness
class good_auth_delegator:
    """Delegation pattern: external auth in → internal token out."""

    def __init__(self) -> None:
        self.delegator = BFFAuthDelegator()

    async def forward_good(self, session: AuthenticatedSession, service_url: str) -> dict[str, Any]:
        # Clean separation: user talks to BFF (OAuth), BFF talks to services (internal JWT)
        return self.delegator.forward_with_auth(session, service_url)
```

### Pattern 4: Offline/Low-Bandwidth Optimization with Differential Sync

Mobile and low-connectivity environments need more than just compressed payloads. This pattern implements ETag-based conditional requests, last-modified timestamps, and differential sync (only sending fields that changed since the client's last fetch). The BFF tracks field-level change versions per user-client pair.

```python
"""Offline optimization: ETag caching, conditional requests, and differential sync."""

from __future__ import annotations

import time as _time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FieldVersion:
    """Tracks the version hash for individual fields — used for differential sync."""
    field_name: str
    version_hash: str
    last_modified: float


class DifferentialSyncTracker:
    """Tracks which fields have changed since a given timestamp for differential responses.

    In low-bandwidth scenarios, sending only changed fields reduces payload by 70-95%.
    The BFF maintains a per-user, per-client field version map that is consulted during shaping.
    """

    def __init__(self) -> None:
        # In production: store in Redis for distributed access
        # {user_id}:{client_type} -> {field_name: FieldVersion}
        self._version_map: dict[str, dict[str, FieldVersion]] = {}

    def _map_key(self, user_id: str, client_type: str) -> str:
        return f"{user_id}:{client_type}"

    def get_changed_fields(
        self,
        user_id: str,
        client_type: str,
        last_sync_timestamp: float | None = None,
        response_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Return only fields that have changed since last_sync_timestamp.

        If response_data is provided, updates the version map with new hashes
        and returns only the delta (new or changed fields).

        Args:
            user_id: User identifier.
            client_type: Client family for separate sync state.
            last_sync_timestamp: Unix timestamp of the client's last successful fetch.
            response_data: The full response — used to compute new field versions.

        Returns:
            Dict of only changed fields, or empty dict if nothing changed.
        """
        import hashlib

        key = self._map_key(user_id, client_type)
        existing_versions = self._version_map.get(key, {})

        if response_data is None:
            # Read-only mode: check against stored versions and last_sync_timestamp
            result = {}
            for field_name, version in existing_versions.items():
                if last_sync_timestamp and version.last_modified > last_sync_timestamp:
                    result[field_name] = True  # Field changed after last sync
            return result

        # Update mode: compute hashes for each top-level field and compare
        current_time = _time.time()
        changed: dict[str, Any] = {}

        for field_name, value in response_data.items():
            if field_name == "_meta":
                continue  # Skip metadata fields

            # Compute version hash (simplified — use JSON serialization in production)
            import json
            raw = json.dumps(value, sort_keys=True, default=str).encode("utf-8")
            new_hash = hashlib.md5(raw).hexdigest()[:12]

            existing = existing_versions.get(field_name)
            if existing is None or existing.version_hash != new_hash:
                changed[field_name] = value  # New or changed field

            # Update version map
            self._version_map.setdefault(key, {})[field_name] = FieldVersion(
                field_name=field_name,
                version_hash=new_hash,
                last_modified=current_time,
            )

        return changed


# ETag middleware pattern for FastAPI/Starlette
class ETagMiddleware:
    """ASGI middleware that adds ETag headers and handles If-None-Match conditional requests.

    Wraps any ASGI app to automatically generate ETags based on response body hash.
    Clients sending If-None-Match receive a 304 Not Modified when the payload is unchanged.
    """

    def __init__(self, app, algorithm: str = "sha256") -> None:
        self.app = app
        self.algorithm = algorithm

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Intercept the response to compute ETag
        body_chunks: list[bytes] = []
        original_send = send

        async def capturing_send(message):
            if message["type"] == "http.response.body":
                body_chunks.append(message.get("body", b""))
                if not message.get("more_body"):
                    # All body received — now we can compute ETag and inject headers
                    raw_body = b"".join(body_chunks)

                    import hashlib
                    digest = hashlib.sha256(raw_body).hexdigest()[:16]
                    etag = f'"{digest}"'

                    # Check If-None-Match from request
                    if_none_match = scope.get("headers", [])
                    if_none_match = dict(
                        (k.decode(), v.decode()) for k, v in if_none_match
                        if isinstance(k, bytes) and k.lower() == b"if-none-match"
                    )

                    if if_none_match.get("if-none-match") == etag:
                        # Return 304 Not Modified — client has a fresh copy
                        await send({
                            "type": "http.response.start",
                            "status": 304,
                            "headers": [
                                (b"etag", etag.encode()),
                                (b"cache-control", b"public, max-age=300"),
                            ],
                        })
                        await send({"type": "http.response.body"})
                    else:
                        # Return full response with ETag
                        await send({
                            "type": "http.response.start",
                            "status": 200,
                            "headers": [
                                (b"etag", etag.encode()),
                                (b"cache-control", b"public, max-age=300"),
                                (b"content-encoding", b"gzip"),
                            ],
                        })
                        await send({"type": "http.response.body", "body": raw_body})
                else:
                    await original_send(message)
            else:
                await original_send(message)

        await self.app(scope, receive, capturing_send)


# ============================================================
# ❌ BAD vs ✅ GOOD — Caching Anti-Patterns
# ============================================================

# ❌ BAD: No caching strategy at all — every request hits upstream full payload
async def bad_no_caching_handler(user_id: str) -> dict:
    """Every page load = N microservice calls with no caching, no compression."""
    # Wasteful: identical data fetched on every navigation event
    profile = await aggregate_user_profile(user_id)  # Always hits all services
    orders = await _OrderClient.get_recent_orders(aiohttp.ClientSession(), user_id)  # type: ignore[arg-type]
    return {"profile": profile, "orders": orders}


# ✅ GOOD: ETag-based conditional requests + compression + differential sync
async def good_caching_handler(
    user_id: str,
    if_none_match: str | None = None,
) -> dict[str, Any]:
    """Return 304 if client already has the latest version, else return compressed payload."""
    profile = await aggregate_user_profile(user_id)

    raw_json = json.dumps(profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__).encode("utf-8")
    etag = generate_etag(raw_json)

    # Check conditional request
    if if_none_match and if_none_match == etag:
        return {"status": 304}  # Client has fresh data — send nothing

    # Compress for transmission
    compressed_data, encoding = compress_payload(
        profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__,
        algorithm="gzip",
    )

    return {
        "data": base64.b64encode(compressed_data).decode("ascii"),  # Base64 for transport
        "encoding": encoding,
        "etag": etag,
        "cache_control": "public, max-age=300",
    }
```

### Pattern 5: BFF Composition with Circuit Breaker and Partial Response Handling

Production-grade BFFs must handle upstream failures gracefully. This pattern wraps each upstream call in a circuit breaker that tracks failure rates. When a service exceeds its error threshold, the breaker opens and short-circuits all requests for that service, returning cached or default data instead of waiting on timeouts.

```python
"""Circuit breaker pattern for BFF upstream resilience."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable


class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation — requests flow through
    OPEN = "open"           # Service failing — short-circuit to fallback
    HALF_OPEN = "half_open" # Testing recovery — allow one probe request


@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5          # Open circuit after N consecutive failures
    success_threshold: int = 3          # Close circuit after N successes in half-open
    reset_timeout: float = 30.0         # Seconds to wait before transitioning OPEN → HALF_OPEN
    timeout: float = 2.0                # Per-request timeout

    def __post_init__(self) -> None:
        if self.failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")


class CircuitBreaker:
    """Simplified circuit breaker tracking consecutive failures (SlidingWindow variant).

    States:
      CLOSED   → Normal. Requests pass through. Failures tracked.
      OPEN     → Failing. Requests immediately call the fallback function.
      HALF_OPEN → Recovery probe. One request allowed through; success closes, failure re-opens.
    """

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None) -> None:
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float = 0.0

    @property
    def state(self) -> CircuitState:
        """Check if OPEN breaker should transition to HALF_OPEN."""
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time >= self.config.reset_timeout:
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
        return self._state

    async def call(
        self,
        fn: Callable[[], Any],
        fallback: Callable[[], Any] | None = None,
    ) -> Any:
        """Execute a function through the circuit breaker with automatic fallback.

        Args:
            fn: The upstream service call to execute.
            fallback: Called when circuit is OPEN or the upstream call raises an exception.

        Returns:
            Result from fn (success), fallback result, or default value.
        """
        current_state = self.state  # Property checks for timeout-based transition

        if current_state == CircuitState.OPEN:
            if fallback:
                return fallback()
            return None  # Default: return nothing rather than a failed request

        try:
            result = await fn()
            self._on_success()
            return result
        except Exception as exc:
            self._on_failure()
            if fallback:
                return fallback()
            raise

    def _on_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.config.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                self._success_count = 0
        elif self._state == CircuitState.CLOSED:
            self._failure_count = 0

    def _on_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.time()
        if self._failure_count >= self.config.failure_threshold:
            self._state = CircuitState.OPEN


# Example usage in BFF aggregation with circuit breakers per service
async def resilient_profile_fetch(
    user_id: str,
    user_service_fn: Callable,
    order_service_fn: Callable,
    prefs_service_fn: Callable,
) -> UserProfilePayload:
    """Aggregation with per-service circuit breakers for independent failure domains.

    Each upstream service has its own circuit breaker — a failure in the orders service
    does not trip the breaker for the user preferences service. This ensures partial
    responses instead of total page failures.
    """
    configs = {
        "user": CircuitBreakerConfig(failure_threshold=5, reset_timeout=30),
        "orders": CircuitBreakerConfig(failure_threshold=3, reset_timeout=60),  # Orders more sensitive
        "prefs": CircuitBreakerConfig(failure_threshold=8, reset_timeout=15),   # Prefs less critical
    }

    breakers = {
        name: CircuitBreaker(f"{service}-{user_id}", cfg)
        for service, (name, cfg) in enumerate(configs.items())
    }

    # Default fallback values for each service
    defaults = {
        "user": lambda: {"name": "Unknown User", "email": "", "avatar_url": None},
        "orders": lambda: [],
        "prefs": lambda: {},
    }

    async def _call(name, fn):
        return await breakers[name].call(fn, fallback=defaults[name])

    # Run all services in parallel — each with independent circuit protection
    results = await asyncio.gather(
        _call("user", user_service_fn),
        _call("orders", order_service_fn),
        _call("prefs", prefs_service_fn),
        return_exceptions=True,
    )

    # Build partial response from whatever succeeded
    profile_data = results[0] if isinstance(results[0], dict) else defaults["user"]()
    orders_data = results[1] if isinstance(results[1], list) else defaults["orders"]()
    prefs_data = results[2] if isinstance(results[2], dict) else defaults["prefs"]()

    return UserProfilePayload(
        name=profile_data.get("name", "Unknown User"),
        email=profile_data.get("email", ""),
        avatar_url=profile_data.get("avatar_url"),
        orders=orders_data,
        preferences=prefs_data,
    )
```

### Pattern 6: Multi-Tenancy in BFF with Tenant-Aware Data Shaping

When serving multiple tenants (organizations) through the same BFF infrastructure, tenant context must be propagated to every upstream call and used for data shaping decisions. The BFF strips tenant-scoped data from cross-tenant responses and applies tenant-specific field filters configured during onboarding.

```python
"""Multi-tenancy support: tenant-aware routing, access control, and data shaping."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("bff.tenancy")


@dataclass
class TenantConfig:
    """Per-tenant configuration for BFF data shaping behavior."""
    tenant_id: str
    name: str
    allowed_fields: list[str] = field(default_factory=list)          # Field selection whitelist
    blocked_fields: list[str] = field(default_factory=["ssn", "internal_notes"])  # Always hidden
    custom_shapes: dict[str, Any] = field(default_factory=dict)       # Per-screen shape overrides
    upstream_fallback_defaults: dict[str, Any] = field(default_factory=dict)


class TenantResolver:
    """Resolves tenant context from BFF request headers or subdomain routing."""

    @staticmethod
    def resolve_from_header(headers: dict[str, str]) -> str | None:
        """Extract tenant ID from X-Tenant-ID header.

        In production: validate the header against an allowlist to prevent
        tenant injection attacks. Never trust client-provided tenant IDs without validation.
        """
        return headers.get("x-tenant-id")

    @staticmethod
    def resolve_from_subdomain(subdomain: str) -> str | None:
        """Extract tenant ID from the request subdomain (e.g., acme.app.example.com → 'acme')."""
        if "." in subdomain:
            return subdomain.split(".")[0]
        return subdomain


class TenantDataShaper:
    """Applies tenant-specific field filtering and access rules to BFF responses."""

    def __init__(self, tenant_configs: dict[str, TenantConfig]) -> None:
        self._configs = tenant_configs

    def get_config(self, tenant_id: str) -> TenantConfig:
        """Get or return default config for an unknown tenant."""
        return self._configs.get(tenant_id, TenantConfig(tenant_id=tenant_id))

    def apply_tenant_filters(
        self,
        response: dict[str, Any],
        tenant_id: str,
    ) -> dict[str, Any]:
        """Strip tenant-blocked fields and enforce field whitelists.

        This is the primary multi-tenancy gate — it ensures Tenant A never receives
        fields that Tenant B's contract disallows, even if an upstream service returns them.
        """
        config = self.get_config(tenant_id)
        blocked = set(config.blocked_fields)

        if config.allowed_fields:
            # Strict mode: only include explicitly allowed fields
            result = {}
            for field_path in config.allowed_fields:
                parts = field_path.split(".")
                value = _nested_get(response, parts)
                if value is not None:
                    result[field_path] = value
        else:
            # Permissive mode: remove blocked fields, keep everything else
            result = _strip_fields(response, blocked)

        return result


def _strip_fields(obj: Any, blocked: set[str]) -> Any:
    """Recursively strip keys that match the blocked set."""
    if isinstance(obj, dict):
        return {
            k: _strip_fields(v, blocked)
            for k, v in obj.items()
            if k not in blocked
        }
    elif isinstance(obj, list):
        return [_strip_fields(item, blocked) for item in obj]
    return obj


def _nested_get(d: dict, keys: list[str], default: Any = None) -> Any:
    """Safely traverse a nested dict with dot-separated key paths."""
    current = d
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        elif isinstance(current, (list, tuple)):
            try:
                current = current[int(key)]
            except (ValueError, IndexError):
                return default
        else:
            return default
    return current


# ============================================================
# ❌ BAD vs ✅ GOOD — Multi-Tenancy Anti-Patterns
# ============================================================

# ❌ BAD: No tenant isolation — response contains all tenants' data
async def bad_tenant_isolation(user_id: str, user_provided_tenant: str) -> dict:
    """Never trust client-provided tenant IDs without validation."""
    # ⚠️ Vulnerable to tenant injection: malicious user sets X-Tenant-ID header
    # ⚠️ No field filtering — blocked fields leak across tenants
    # ⚠️ No per-tenant shape customization
    return await aggregate_user_profile(user_id)  # Returns everything


# ✅ GOOD: Validated tenant resolution + strict field filtering
async def good_tenant_isolation(
    headers: dict[str, str],
    user_id: str,
) -> dict[str, Any]:
    """Resolve tenant from validated source, apply per-tenant field rules."""
    # Resolve from validated header (backed by allowlist in production)
    tenant_id = TenantResolver.resolve_from_header(headers)
    if not tenant_id:
        raise ValueError("Missing or invalid X-Tenant-ID header")

    # Fetch full aggregated data
    profile = await aggregate_user_profile(user_id)
    raw_data = profile.model_dump() if hasattr(profile, 'model_dump') else profile.__dict__

    # Apply tenant-specific filtering (blocks SSN, internal_notes, etc.)
    shaper = TenantDataShaper(
        tenant_configs={
            "acme": TenantConfig(tenant_id="acme", name="Acme Corp", blocked_fields=["ssn", "internal_notes"]),
            "globex": TenantConfig(tenant_id="globex", name="Globex Inc", allowed_fields=["name", "email", "orders[*].id"]),
        }
    )
    return shaper.apply_tenant_filters(raw_data, tenant_id)
```

---

## Constraints

### MUST DO
- Create a separate BFF instance per client type (web SPA, mobile, partner API) — never share a single BFF across all clients as this defeats the pattern's purpose
- Aggregate data from upstream microservices in parallel with timeout isolation per service to prevent cascading failures
- Shape responses specifically for each client's rendering requirements: mobile gets null-stripped minimal payloads, web gets flattened or nested structures as needed
- Handle authentication at the BFF boundary — downstream microservices MUST NOT re-authenticate end users; they trust the BFF via internal JWT or mTLS
- Implement circuit breakers on every upstream service call with sensible fallback defaults to maintain partial response availability during outages
- Use ETag-based conditional requests and gzip/brotli compression for all public-facing endpoints

### MUST NOT DO
- Let the BFF become a "god object" that duplicates business logic from downstream services — it should only aggregate, shape, and route, not implement domain rules
- Forward raw microservice responses directly to clients without any shaping or filtering for the target platform
- Store user credentials (passwords, OAuth tokens) in the BFF — delegate all credential storage to the identity provider
- Trust client-provided tenant IDs without server-side allowlist validation — this enables cross-tenant data leakage
- Use a single generic BFF that serves all client types through if/else branches — separate instances are cleaner and independently scalable

---

## Output Template

When this skill is active, output must include:

1. **BFF Architecture Diagram** — ASCII showing `client → BFF → upstream microservices` with authentication delegation flow (OAuth in, internal JWT out)
2. **Per-Client Type Analysis** — Table of each client type, its unique data/shaping requirements, and the BFF instance needed
3. **Data Flow Implementation** — Python code for the aggregation layer with parallel fetching, timeout isolation per service, circuit breakers, and fallback defaults
4. **Response Shaping Strategy** — Code examples for null stripping, field selection (dot-notation paths), compression (gzip/brotli), and ETag-based caching
5. **Authentication Delegation Flow** — Internal JWT creation/validation code showing how downstream services trust the BFF without re-authenticating end users
6. **Multi-Tenancy Support** (if applicable) — Tenant config, field filtering, and tenant injection prevention patterns

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `api-composition-patterns` | Complementary: handles service composition across boundaries when BFF is not the right architectural level |
| `microservices-architecture` | Foundational: understand microservice decomposition and boundaries before designing a BFF layer |
| `cloud-native-architecture` | Deployment context: how to deploy multiple independent BFF instances in Kubernetes with per-client HPA scaling |

---

## Live References

> Authoritative documentation for the Backend-for-Frontend pattern and related architectural concepts.

- [BFF Pattern Overview — Martin Fowler](https://martinfowler.com/articles/2021/speaking-travel-apis.html)
- [.NET BFF Implementation Guide](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/multi-container-microservice-net-applications/backend-for-frontend)
- [OAuth 2.0 PKCE Flow (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Circuit Breaker Pattern — Microservices.io](https://microservices.io/patterns/reliability/circuit-breaker.html)
- [HTTP Caching: ETag and Conditional Requests (RFC 7232)](https://datatracker.ietf.org/doc/html/rfc7232)
- [Async HTTP Client Patterns with aiohttp](https://docs.aiohttp.org/en/stable/)
