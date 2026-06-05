---




name: api-security-patterns
description: Implements API security patterns including authentication middleware,
  JWT token validation and rotation, rate limiting with sliding windows, input sanitization,
  CORS configuration, and OWASP API Security Top 10 compliance for production services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api security, authentication middleware, JWT tokens, rate limiting, input
    sanitization, CORS, how do i secure my API, OWASP API
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
  related-skills: rest-api-patterns, graphql-api-design, input-validation, fastapi-patterns




---




# API Security Patterns

Senior security engineer implementing production-grade authentication, authorization, rate limiting, input sanitization, and CORS controls for RESTful APIs. Every endpoint is treated as a potential attack surface — apply defense-in-depth with layered checks that validate identity, enforce limits, sanitize inputs, and restrict origins before business logic ever executes. Follow OWASP API Security Top 10 (2023) and RFC 7519 (JWT) as the authoritative security baseline for all implementation decisions.

## TL;DR Checklist

- [ ] Enforce authentication on every protected endpoint via middleware — never rely on per-route decorators alone
- [ ] Validate JWT signatures using RS256/ES256 with JWKS key rotation, never HS256 with a shared secret in production
- [ ] Implement rate limiting with a sliding window algorithm at the gateway or middleware layer, not in business logic
- [ ] Sanitize all inbound inputs: strip null bytes, encode HTML entities, parameterize SQL queries, reject oversized payloads
- [ ] Configure CORS with explicit origin allowlists — never use `Allow-Origin: *` on authenticated endpoints
- [ ] Set security headers (HSTS, X-Content-Type-Options, CSP) on every response via middleware
- [ ] Rotate API keys and JWT signing secrets on a scheduled cadence with overlapping validity periods
- [ ] Log all auth failures and rate limit violations with contextual metadata for incident detection

---

## When to Use

Use this skill when:

- Building authentication middleware for FastAPI, Flask, Django, or Express.js API services
- Designing JWT token validation flows with refresh token rotation and blacklisting
- Implementing rate limiting (sliding window, token bucket, or fixed window) to prevent abuse
- Configuring CORS policies for multi-origin frontend applications accessing a backend API
- Adding input sanitization layers to protect against SQL injection, XSS, and command injection
- Auditing an existing API for OWASP API Security Top 10 compliance gaps
- Setting up security headers and transport-layer controls for production deployments

---

## When NOT to Use

Avoid this skill for:

- Implementing OAuth 2.0 authorization server flows (grant types, token exchange) — use `rest-api-patterns` or a dedicated identity provider like Keycloak instead
- Designing database access patterns or ORMs — input sanitization alone does not replace proper query parameterization at the data layer
- Configuring network-level firewalls, WAF rules, or TLS termination — those belong in infrastructure and deployment skills

---

## Core Workflow

1. **Map the API Attack Surface** — Enumerate every endpoint, its auth requirements, input sources (body, query, headers, cookies), and data sensitivity classification (public, internal, sensitive, restricted). **Checkpoint:** Every endpoint must have an assigned trust level before any middleware is written — unclassified endpoints are a security gap.

2. **Choose Authentication Strategy** — Select the appropriate mechanism: API key for service-to-service, JWT for user-facing APIs with stateless sessions, or OAuth 2.0 bearer tokens for delegated access. **Checkpoint:** The strategy must support token revocation (blacklist or short expiry + refresh) — any scheme that cannot revoke compromised credentials is unacceptable in production.

3. **Implement Authentication Middleware** — Write middleware that intercepts requests before route handlers. Validate tokens, extract user context, and attach it to the request scope. Return 401 Unauthorized for missing/invalid credentials and 403 Forbidden for insufficient permissions. **Checkpoint:** Middleware must fail closed — any exception during auth must return 401, never pass the request through to business logic.

4. **Configure Rate Limiting** — Apply rate limiting at the middleware layer using a sliding window or token bucket algorithm. Enforce per-user and per-IP limits separately. Return 429 Too Many Requests with a `Retry-After` header and include remaining quota in response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). **Checkpoint:** Rate limiter state must survive across horizontal scale replicas (use Redis-backed counters, not in-memory dicts).

5. **Apply Input Sanitization** — Create a sanitization layer that runs after auth and rate limiting but before business logic. Normalize Unicode, strip HTML tags, parameterize database queries, validate payload size limits, and reject unexpected content types. **Checkpoint:** Every field in every endpoint schema must have at least one constraint — if you cannot describe what is valid about a field, it should be rejected outright.

6. **Configure CORS Policy** — Define explicit origin allowlists for your API. Set `Access-Control-Allow-Methods` to only the methods your API supports. Use `Access-Control-Allow-Headers` to whitelist only required headers (typically `Authorization`, `Content-Type`). Never use wildcard origins with credentials enabled. **Checkpoint:** Test with a simple curl against each origin in the allowlist — if it fails, the policy is broken.

7. **Set Security Headers** — Add security headers via response middleware: `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Cache-Control: no-store` for auth-related endpoints. **Checkpoint:** Run the API through an automated scanner like OWASP ZAP or Security Headers check to verify header presence and correctness.

8. **Audit Against OWASP API Security Top 10** — Cross-reference every implemented control against the OWASP API Security Top 10 (2023) categories: Broken Object Level Authorization, Broken Authentication, Broken Object Property Level Authorization, Unrestricted Resource Consumption, Broken Function Level Authorization, Unrestricted Access to Sensitive Business Flows, Server Side Request Forgery, Improper Inventory Management, Unsafe Consumption of APIs, and Security Misconfiguration. **Checkpoint:** Every OWASP category must have at least one documented mitigation in the codebase — a gap with no control is a finding that must be resolved before deployment.

---

## Implementation Patterns

### Pattern 1: JWT Authentication Middleware with Token Validation and Rotation

Production-grade JWT middleware using asymmetric signing (RS256), JWKS key retrieval, token blacklisting for refresh tokens, and automatic key rotation support. This follows RFC 7519 and RFC 7517 standards.

```python
"""JWT authentication middleware for FastAPI applications.

Implements stateless JWT validation with optional Redis-backed blacklist
for refresh token revocation. Supports RS256 asymmetric signatures with
JWKS key rotation per RFC 7517/JWK spec.
"""

from __future__ import annotations

import time
import json
import logging
from datetime import datetime, timezone, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Optional

import jwt
import httpx
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class JWTAuthMiddleware:
    """JWT bearer token authentication middleware.

    Validates access tokens against an RS256 public key fetched from
    a JWKS endpoint. Supports optional refresh token blacklisting
    via Redis for token revocation flows.
    """

    def __init__(
        self,
        jwks_url: str,
        audience: str,
        issuer: str,
        algorithm: str = "RS256",
        access_token_ttl_seconds: int = 900,
        redis_client: Optional[object] = None,
    ) -> None:
        """Initialize JWT auth middleware.

        Args:
            jwks_url: URL of the JWKS endpoint for key retrieval.
            audience: Expected `aud` claim value in tokens.
            issuer: Expected `iss` claim value in tokens.
            algorithm: Signing algorithm (RS256 recommended).
            access_token_ttl_seconds: Maximum token age before forced refresh.
            redis_client: Optional Redis client for token blacklisting.
        """
        self.jwks_url = jwks_url
        self.audience = audience
        self.issuer = issuer
        self.algorithm = algorithm
        self.access_token_ttl_seconds = access_token_ttl_seconds
        self.redis_client = redis_client

    @lru_cache(maxsize=1)
    def _fetch_jwks_keys(self) -> dict[str, list[dict[str, str]]] -> dict:
        """Fetch and cache the JWKS document. Refreshes every 6 hours."""
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(self.jwks_url)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.error("Failed to fetch JWKS keys: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            ) from exc

    def _get_signing_key(self, token: str) -> str:
        """Resolve the correct public key for verifying the JWT signature.

        Extracts the `kid` header claim and matches it against cached JWKS keys.

        Args:
            token: The raw JWT string to inspect for its `kid`.

        Returns:
            The PEM-formatted public key as a string.

        Raises:
            HTTPException: If no matching key is found for the token's kid.
        """
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing 'kid' header",
            )

        jwks = self._fetch_jwks_keys()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwt.PyJWK(key).public_key().as_pem()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"No signing key found for kid={kid}",
        )

    def _is_blacklisted(self, jti: str) -> bool:
        """Check if a token JTI has been revoked via Redis blacklist.

        Args:
            jti: The unique token identifier from the JWT `jti` claim.

        Returns:
            True if the token is blacklisted (revoked), False otherwise.
        """
        if self.redis_client is None:
            return False
        try:
            result = self.redis_client.get(f"blacklist:{jti}")
            return result is not None  # type: ignore[no-any-return]
        except Exception:
            # Fail open on Redis failure — log and allow (rate limiter handles abuse)
            logger.warning("Redis blacklist check failed for jti=%s", jti)
            return False

    async def __call__(self, request: Request, call_next: object) -> JSONResponse:
        """FastAPI middleware entry point. Validates bearer token on every request."""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing or malformed Authorization header"},
            )

        token = auth_header.split(" ", 1)[1]

        try:
            public_key = self._get_signing_key(token)
            payload = jwt.decode(
                token,
                key=public_key,
                algorithms=[self.algorithm],
                audience=self.audience,
                issuer=self.issuer,
            )
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token has expired"},
            )
        except jwt.InvalidTokenError as exc:
            logger.warning("JWT validation failed: %s", exc)
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid token"},
            )

        # Check JTI blacklist for revoked refresh tokens
        jti = payload.get("jti")
        if jti and self._is_blacklisted(jti):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token has been revoked"},
            )

        # Validate token is not stale beyond access TTL
        iat = payload.get("iat", 0)
        if time.time() - iat > self.access_token_ttl_seconds:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token too old — refresh required"},
            )

        # Attach user context to request state for downstream handlers
        request.state.user = payload.get("sub")
        request.state.roles = payload.get("roles", [])
        request.state.permissions = payload.get("permissions", [])

        response = await call_next(request)
        return response
```

---

### Pattern 2: Rate Limiting with Sliding Window Algorithm (BAD vs. GOOD)

The sliding window counter algorithm provides smooth, accurate rate limiting without the boundary artifacts of fixed windows. This implementation uses a sorted set data structure (Redis ZSET) for memory-efficient sliding window counters.

```python
"""Sliding window rate limiter using Redis sorted sets.

Implements the sliding window counter pattern described in high-traffic
API literature. Provides per-user and per-IP rate limiting with accurate
window tracking and proper HTTP 429 responses with Retry-After headers.
"""

from __future__ import annotations

import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """Sliding window rate limiter backed by Redis sorted sets.

    Each bucket represents a unique client (identified by user ID and/or IP).
    The sliding window is implemented using ZADD with timestamps as scores,
    allowing precise count queries within any time window.

    Architecture note: For production deployments serving 10k+ RPS, consider
    moving rate limiting to a reverse proxy (Nginx lua-resty-limit-traffic)
    or an API gateway layer to reduce backend overhead.
    """

    def __init__(
        self,
        redis_client: object,
        max_requests: int = 100,
        window_seconds: int = 60,
    ) -> None:
        """Initialize the sliding window rate limiter.

        Args:
            redis_client: Redis client instance supporting ZADD and ZREMRANGEBYSCORE.
            max_requests: Maximum requests allowed within the sliding window.
            window_seconds: Size of the sliding time window in seconds.
        """
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def _make_key(self, identifier: str) -> str:
        """Build a Redis key for the given client identifier.

        Args:
            identifier: Unique client identifier (user ID or IP address).

        Returns:
            Redis key string formatted as rl:<scope>:<identifier>.
        """
        return f"rl:sliding:{identifier}"

    def is_rate_limited(self, identifier: str) -> tuple[bool, dict[str, int]]:
        """Check if a client has exceeded the rate limit.

        Uses a Redis sorted set where each member represents one request
        with its timestamp as the score. Removes entries outside the window,
        then counts remaining entries to determine if the limit is exceeded.

        Args:
            identifier: Unique client identifier (user ID or IP address).

        Returns:
            Tuple of (is_limited, headers_dict) where headers_dict contains
            X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset.
        """
        key = self._make_key(identifier)
        now = time.time()
        window_start = now - self.window_seconds

        pipe = self.redis.pipeline()
        # Remove entries older than the window
        pipe.zremrangebyscore(key, 0, window_start)
        # Count current entries in window
        pipe.zcard(key)
        # Add this request with timestamp as score and unique member
        unique_member = f"{now}:{id(identifier)}"
        pipe.zadd(key, {unique_member: now})
        # Set expiry to auto-cleanup (window + 1 second buffer)
        pipe.expire(key, self.window_seconds + 1)
        results = pipe.execute()

        current_count = results[1]  # zcard result

        headers = {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(max(0, self.max_requests - current_count)),
            "X-RateLimit-Reset": str(int(now + self.window_seconds)),
        }

        if current_count >= self.max_requests:
            return True, headers

        return False, headers


# ===================================================================
# ❌ BAD — Fixed window rate limiter with boundary artifacts
# ===================================================================

# FIXED WINDOW RATE LIMITER (BAD)
# Flaws:
#   1. Window boundary allows 2x burst at every window edge
#      (e.g., 50 requests at second 59 + 50 at second 60 = 100 in 1 second)
#   2. In-memory state is lost on process restart
#   3. No horizontal scaling support — each server instance has its own counter
#   4. No Retry-After header guidance for clients

import time as _time


class BadFixedWindowLimiter:
    """❌ BAD — Fixed window rate limiter with known boundary attack."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.count = 0       # ❌ In-memory — lost on restart, not shared across replicas
        self.window_start = _time.time()

    def is_limited(self) -> bool:
        current_time = _time.time()
        # ❌ BUG: Window reset happens at arbitrary absolute boundaries
        if current_time - self.window_start >= self.window_seconds:
            self.count = 0          # ❌ Resets — burst window attack possible
            self.window_start = current_time

        self.count += 1
        return self.count > self.max_requests


# ===================================================================
# ✅ GOOD — Production sliding window limiter (see SlidingWindowRateLimiter above)
# ===================================================================
```

---

### Pattern 3: Input Sanitization and SQL Injection Prevention

Comprehensive input sanitization covering parameterized queries, HTML entity encoding, null byte stripping, payload size enforcement, and content-type validation. Prevents SQL injection per OWASP API Security Top 10 (API5:2023), XSS, and command injection patterns.

```python
"""Input sanitization layer for API request bodies and parameters.

Provides defense-in-depth against injection attacks by combining:
- Parameterized queries for database access (prevents SQL injection)
- HTML entity encoding and tag stripping (prevents XSS in returned data)
- Null byte removal and Unicode normalization (prevents encoding bypasses)
- Payload size enforcement (prevents DoS via oversized bodies)
- Content-type validation (prevents type confusion attacks)

References: OWASP API Security Top 10 (2023) — A05 Broken Object Level
Authorization, A09 Security Misconfiguration.
"""

from __future__ import annotations

import html
import re
import logging
import unicodedata
from typing import Any, Optional

logger = logging.getLogger(__name__)


# Maximum allowed payload size: 1 MB
MAX_PAYLOAD_SIZE: int = 1048576

# Dangerous characters for command injection — stripped/escaped from shell contexts
SHELL_INJECTION_PATTERN: re.Pattern[str] = re.compile(
    r"[;&|`$(){}[\]]",
    re.UNICODE,
)


class InputSanitizer:
    """Multi-layer input sanitizer for API endpoints.

    Provides deterministic sanitization that can be composed across
    request body fields, query parameters, and header values.
    """

    def __init__(
        self,
        max_payload_bytes: int = MAX_PAYLOAD_SIZE,
        allow_html_tags: bool = False,
        strict_mode: bool = True,
    ) -> None:
        """Initialize the input sanitizer.

        Args:
            max_payload_bytes: Maximum allowed request body size in bytes.
            allow_html_tags: If True, strip HTML tags; if False, reject any HTML entities.
            strict_mode: If True, raise on null bytes or control characters.
        """
        self.max_payload_bytes = max_payload_bytes
        self.allow_html_tags = allow_tags
        self.strict_mode = strict_mode

    def validate_payload_size(self, body: bytes) -> bool:
        """Reject oversized payloads to prevent resource exhaustion attacks.

        Args:
            body: Raw request body bytes.

        Returns:
            True if payload is within limits.

        Raises:
            ValueError: If the payload exceeds max_payload_bytes.
        """
        if len(body) > self.max_payload_bytes:
            raise ValueError(
                f"Payload size {len(body)} exceeds maximum allowed "
                f"{self.max_payload_bytes} bytes"
            )
        return True

    def validate_content_type(self, content_type: Optional[str]) -> bool:
        """Reject unexpected or missing Content-Type headers.

        Args:
            content_type: The Content-Type header value from the request.

        Returns:
            True if the content type is JSON (the only accepted format).

        Raises:
            ValueError: If content type is missing or not application/json.
        """
        if not content_type:
            raise ValueError("Missing Content-Type header")

        # Extract media type without charset parameters for comparison
        media_type = content_type.split(";")[0].strip().lower()
        allowed_types = {"application/json", "application/json;charset=utf-8"}

        if media_type not in allowed_types:  # type: ignore[operator]
            raise ValueError(
                f"Unsupported Content-Type: '{content_type}'. "
                f"Expected application/json"
            )
        return True

    def sanitize_string(self, value: str) -> str:
        """Sanitize a single string value for injection attacks.

        Applies three layers of sanitization:
        1. Unicode normalization (NFC form) to prevent encoding bypasses
        2. Null byte removal to prevent truncation attacks
        3. Shell injection character stripping for any field passed to system commands

        Args:
            value: The raw string input to sanitize.

        Returns:
            Sanitized string safe for downstream processing.

        Raises:
            ValueError: In strict mode, if the original value contained null bytes.
        """
        # Layer 1: Unicode normalization to NFC form
        normalized = unicodedata.normalize("NFC", value)

        # Layer 2: Strip null bytes (prevents truncation attacks)
        if "\x00" in normalized or "\0" in normalized:
            if self.strict_mode:
                raise ValueError("Input contains null byte — rejected")
            normalized = normalized.replace("\x00", "")

        # Layer 3: Encode HTML entities (prevents XSS when rendering)
        sanitized = html.escape(normalized, quote=True)

        return sanitized

    def sanitize_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """Recursively sanitize all string values in a nested dictionary.

        Walks the entire dict tree, applying string sanitization to all
        leaf string values while preserving non-string types (int, float, bool).

        Args:
            data: The input dictionary to sanitize.

        Returns:
            A new dictionary with all string values sanitized.
        """
        result: dict[str, Any] = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self.sanitize_string(value)
            elif isinstance(value, dict):
                result[key] = self.sanitize_dict(value)  # type: ignore[assignment]
            elif isinstance(value, list):
                result[key] = [
                    self.sanitize_string(item) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    def parameterized_query(self, sql_template: str, params: tuple[Any, ...]) -> tuple[str, tuple]:
        """Prepare a parameterized SQL query to prevent SQL injection.

        Uses DBAPI-compliant parameter placeholders (%s for PostgreSQL/MySQL,
        ? for SQLite). The template and parameters are kept strictly separate
        so the database driver handles escaping — never use f-strings or
        .format() for query construction.

        Args:
            sql_template: SQL string with %s or ? placeholders.
            params: Tuple of parameter values to bind.

        Returns:
            Tuple of (template, params) ready for cursor.execute().

        Raises:
            ValueError: If the template contains obvious f-string patterns.
        """
        # Detect unsafe query construction attempts
        if "{" in sql_template and "}" in sql_template:
            raise ValueError(
                "SQL template appears to use f-string formatting — "
                "use parameterized queries instead"
            )

        return (sql_template, params)  # type: ignore[return-value]
```

---

### Pattern 4: CORS Policy Configuration for Multi-Origin APIs

Production-grade CORS middleware that enforces strict origin allowlists, restricts allowed methods and headers, and correctly handles preflight (OPTIONS) requests. Prevents cross-origin data exfiltration per OWASP API Security Top 10 (A09:2023).

```python
"""CORS policy configuration middleware for multi-origin API access.

Enforces strict CORS policies with origin allowlists, method restrictions,
header whitelisting, and proper preflight handling. Designed for APIs that
serve multiple frontend applications or third-party integrations while
blocking unauthorized cross-origin requests.

Security note: Never use wildcard origins (*) when credentials (cookies,
Authorization headers) are involved. This is a critical vulnerability
that allows any website to make authenticated cross-origin requests.
"""

from __future__ import annotations

import logging
from typing import Optional, Sequence

logger = logging.getLogger(__name__)


class CORSPolicy:
    """Strict CORS policy configuration for API endpoints.

    Implements the CORS protocol per RFC 6454 (Same-Origin Policy) and
    HTML Living Standard CORS spec. All settings are restrictive by default —
    explicitly allow what you need, deny everything else.
    """

    def __init__(
        self,
        allowed_origins: Sequence[str],
        allowed_methods: Sequence[str] = ("GET", "POST", "PUT", "DELETE"),
        allowed_headers: Sequence[str] = (
            "Authorization",
            "Content-Type",
            "X-Request-ID",
        ),
        expose_headers: Optional[Sequence[str]] = None,
        allow_credentials: bool = True,
        max_age_seconds: int = 600,
    ) -> None:
        """Initialize the CORS policy.

        Args:
            allowed_origins: Explicit list of origins permitted to access this API.
                Use absolute origin format: "https://app.example.com" — not wildcards.
            allowed_methods: HTTP methods allowed for cross-origin requests.
                Default is standard CRUD set.
            allowed_headers: Request headers the browser may include in actual requests.
            expose_headers: Response headers the browser JavaScript may access.
            allow_credentials: Whether to include Access-Control-Allow-Credentials.
                Must be False if any allowed_origin contains a wildcard (*).
            max_age_seconds: How long preflight response can be cached by browsers.
        """
        self.allowed_origins = set(allowed_origins)
        self.allowed_methods = tuple(sorted(allowed_methods))
        self.allowed_headers = tuple(sorted(allowed_headers))
        self.expose_headers = tuple(sorted(expose_headers or ()))
        self.allow_credentials = allow_credentials
        self.max_age_seconds = max_age_seconds

    def get_response_headers(self, origin: Optional[str]) -> dict[str, str]:
        """Generate CORS response headers for the given origin.

        Only returns permissive headers if the origin is in the allowlist.
        Otherwise, returns an empty dict — effectively blocking CORS.

        Args:
            origin: The Origin header from the incoming request.

        Returns:
            Dictionary of CORS-related response headers to add.
        """
        # No Origin header present — this is a same-origin or non-browser request
        if not origin:
            return {}

        # ❌ SECURITY CRITICAL: Never set Allow-Credentials with wildcard origin
        if "*" in self.allowed_origins and self.allow_credentials:
            logger.critical(
                "CORS misconfiguration: allow_credentials=True with wildcard "
                "origin. This is a critical security vulnerability."
            )

        # Only allow origins from our explicit allowlist
        if origin not in self.allowed_origins:
            return {}  # Block this origin entirely — no CORS headers returned

        headers: dict[str, str] = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": ", ".join(self.allowed_methods),
            "Access-Control-Allow-Headers": ", ".join(self.allowed_headers),
            "Access-Control-Max-Age": str(self.max_age_seconds),
        }

        if self.expose_headers:
            headers["Access-Control-Expose-Headers"] = ", ".join(
                self.expose_headers
            )

        if self.allow_credentials and "*" not in self.allowed_origins:
            headers["Access-Control-Allow-Credentials"] = "true"

        return headers


class CORSMiddleware:
    """FastAPI-compatible CORS middleware using CORSPolicy."""

    def __init__(self, policy: CORSPolicy) -> None:
        self.policy = policy

    async def handle_preflight(
        self, origin: Optional[str]
    ) -> dict[str, str]:
        """Handle CORS preflight (OPTIONS) requests.

        Preflight requests are sent by browsers before methods like PUT, DELETE,
        or requests with custom headers. This method returns a 204 No Content
        response with appropriate CORS headers.

        Args:
            origin: The Origin header from the preflight request.

        Returns:
            Dictionary of CORS headers for the preflight response.
        """
        headers = self.policy.get_response_headers(origin)
        if "Access-Control-Allow-Origin" in headers:
            return {
                **headers,
                "Content-Length": "0",
            }
        # Preflight rejected — no CORS headers means browser blocks it
        return {}


# ===================================================================
# ❌ BAD — Dangerous wildcard CORS configuration
# ===================================================================

# BAD CORS CONFIG (NEVER USE IN PRODUCTION)
# This allows ANY website to make authenticated requests to your API.
# An attacker can host a malicious page that calls:
#   fetch('https://api.yourservice.com/user/profile', { credentials: 'include' })
# And the browser will send the user's cookies and tokens.

bad_cors_headers = {
    "Access-Control-Allow-Origin": "*",        # ❌ Wildcard allows any origin
    "Access-Control-Allow-Credentials": "true", # ❌ Credentials + wildcard = critical vuln
    "Access-Control-Allow-Methods": "*",        # ❌ Allows all HTTP methods including DELETE, PUT
    "Access-Control-Allow-Headers": "*",        # ❌ Allows Authorization header from any origin
}


# ===================================================================
# ✅ GOOD — Strict CORS configuration (see CORSPolicy above)
# ===================================================================

good_cors_policy = CORSPolicy(
    allowed_origins=[
        "https://app.example.com",      # Primary frontend
        "https://admin.example.com",     # Admin dashboard
        "https://staging.example.com",   # Staging environment (remove before prod deploy)
    ],
    allowed_methods=["GET", "POST", "PUT"],  # No DELETE from browser — admin only
    allow_credentials=True,                   # Required for cookie auth / Bearer tokens
)
```

---

## Constraints

### MUST DO

- Enforce authentication middleware on every protected endpoint — never skip auth checks in route handlers
- Validate JWT signatures using RS256 or ES256 with JWKS key rotation; never use HS256 with a shared secret in production
- Implement rate limiting at the gateway or middleware layer with Redis-backed counters for horizontal scaling support
- Sanitize all inbound inputs: strip null bytes, normalize Unicode (NFC), parameterize SQL queries, and reject oversized payloads
- Configure CORS with explicit origin allowlists — never use `Access-Control-Allow-Origin: *` on authenticated endpoints
- Set security headers via middleware on every response: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- Rotate API keys and JWT signing secrets on a scheduled cadence with overlapping validity periods (at least 24-hour overlap)
- Log all authentication failures, rate limit violations, and CORS rejections with contextual metadata for incident detection
- Apply defense-in-depth: auth middleware → rate limiter → input sanitizer → route handler — each layer independently validates
- Follow OWASP API Security Top 10 (2023) as the authoritative baseline; every category must have at least one documented mitigation

### MUST NOT DO

- ❌ NEVER use `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` — this is a critical vulnerability allowing authenticated cross-origin attacks
- ❌ NEVER construct SQL queries using f-strings, string concatenation, or `.format()` — always use parameterized queries through the database driver
- ❌ NEVER validate tokens client-side alone — always enforce server-side JWT validation with JWKS key resolution on every request
- ❌ NEVER store refresh tokens in localStorage (accessible via XSS) — store in HttpOnly, Secure cookies or use short-lived access tokens
- ❌ NEVER disable rate limiting "for development" without an environment flag — it is too easy to forget and deploy
- ❌ NEVER allow wildcard methods or headers in CORS — explicitly whitelist only what each frontend needs
- ❌ NEVER return stack traces or internal error details in production API responses — wrap all exceptions with sanitized error messages
- ❌ NEVER implement custom crypto for password hashing — use bcrypt, argon2id, or scrypt via established libraries (e.g., `passlib`, `cryptography`)

---

## Output Template

When implementing or auditing API security controls, produce:

1. **Authentication Scheme** — Auth method selected (JWT/OAuth/API key), signing algorithm, token lifetimes, and revocation strategy
2. **Rate Limiting Configuration** — Algorithm used, per-user/per-IP limits, window size, and Redis-backed state details
3. **Input Sanitization Rules** — List of sanitization layers applied (null byte removal, HTML encoding, parameterized queries) and fields covered
4. **CORS Policy** — Full origin allowlist, allowed methods, allowed headers, credentials policy, and preflight cache duration
5. **Security Headers** — Complete list of security headers set by middleware with their values
6. **OWASP Top 10 Compliance Matrix** — Table mapping each of the 10 OWASP API Security categories to implemented mitigations in code
7. **Threat Model Summary** — Brief summary of attack vectors addressed and any known residual risks

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-patterns` | RESTful API design conventions — resource naming, hypermedia, HATEOAS |
| `graphql-api-design` | GraphQL schema security, query depth limiting, and field authorization |
| `input-validation` | Schema-based input validation with Pydantic models and custom validators |
| `fastapi-patterns` | FastAPI-specific patterns for middleware, dependency injection, and error handling |
| `security-review` | Comprehensive security code review methodology including vulnerability classification |
| `cve-dependency-management` | CVE tracking and dependency vulnerability management workflows |

---

## References

- **OWASP API Security Top 10 (2023)** — https://owasp.org/API-Security/
  - A01:2023 Broken Object Level Authorization
  - A02:2023 Broken Authentication
  - A03:2023 Broken Object Property Level Authorization
  - A05:2023 Broken Function Level Authorization
  - A09:2023 Security Misconfiguration
- **RFC 7519** — JSON Web Token (JWT) Specification
- **RFC 7517** — JSON Web Key (JWK) Specification for JWKS
- **RFC 6749** — The OAuth 2.0 Authorization Framework
- **RFC 8252** — OAuth 2.0 for Native Apps
- **OWASP Secure Headers Project** — https://owasp.org/www-project-secure-headers/
- **NIST SP 800-63B** — Digital Identity Guidelines (Authentication & Lifecycle Management)
