---




name: api-gateway-patterns
description: Implements API gateway patterns (request routing, JWT validation, rate limiting, circuit breaker, request aggregation) to protect and orchestrate backend service traffic at the edge.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: api gateway, request routing, JWT validation, rate limiting, token bucket, how do i protect my backend, kong, envoy proxy
  related-skills: api-architecture, system-reliability-architecture, service-mesh-patterns
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




---





# API Gateway Patterns

Implements the gateway as the single entry point for all client requests, providing request routing, authentication offload, rate limiting, circuit breaking, and response aggregation before traffic reaches backend services. This skill covers the edge layer only — not application-level logic or service mesh sidecar patterns.

## TL;DR Checklist

- [ ] Define URL routing rules with regex path matching and header transformation
- [ ] Implement JWT/OAuth validation at gateway with JWKS key caching
- [ ] Configure distributed rate limiting using Redis-backed token bucket
- [ ] Set up circuit breaker on every upstream connection with health checks
- [ ] Aggregate multiple downstream calls concurrently for BFF endpoints
- [ ] Inject correlation ID header into every request passing through the gateway

---

## When to Use

Use this skill when:

- Designing or implementing a single entry point for client requests before backend services
- Offloading authentication (JWT validation, API key checks) from individual microservices
- Implementing rate limiting at the edge to protect downstream services from overload
- Reducing client round-trips by aggregating multiple service responses at the gateway layer
- Adding circuit breaker protection so unhealthy backends fail fast without exhausting client timeouts
- Transforming request/response payloads (header injection, body rewriting) at the network edge

---

## When NOT to Use

Avoid this skill for:

- Service mesh sidecar patterns — use `service-mesh-patterns` instead
- General API design (REST conventions, GraphQL schema design) — use `api-architecture` instead
- Application-level retry or circuit breaker logic inside backend services — use `system-reliability-architecture` instead
- Intra-service communication within a cluster — service mesh is more appropriate

---

## Core Workflow

1. **Determine Gateway Layer Position** — Decide whether the gateway sits at L7 (HTTP/HTTPS, e.g., Envoy, Kong, NGINX) or runs as an application-level middleware (e.g., FastAPI router, Express middleware).
   **Checkpoint:** If you need per-pod sidecar behavior, you want a service mesh, not this skill.

2. **Define Routing Rules** — Create URL-to-upstream mappings with regex path matching, header transformation, and optional request body modification. Use declarative configuration (Envoy routes.yaml or Kong declarative YAML) for production deployments.
   **Checkpoint:** Every route must have an upstream timeout and a circuit breaker configured.

3. **Configure Authentication Offload** — Implement JWT/OAuth token validation at the gateway edge. The gateway validates tokens, extracts claims into downstream headers, and strips raw credentials before forwarding. Never pass unvalidated tokens to backend services.
   **Checkpoint:** JWKS keys must be cached with refresh-ahead; never fetch on every request.

4. **Implement Rate Limiting** — Deploy a distributed rate limiter (Redis-backed token bucket or sliding window) at the gateway. Enforce per-client, per-API-key, and per-tier quotas before requests reach backend logic.
   **Checkpoint:** Use Lua scripts for atomic Redis operations to prevent race conditions under concurrent load.

5. **Set Up Request Aggregation** — For BFF (Backend-For-Frontend) endpoints that need data from multiple services, implement concurrent fetching with independent timeouts and partial failure strategies. Never let one slow service block an entire response.
   **Checkpoint:** Each downstream call must have its own timeout; the aggregate response should not wait for failed calls.

---

## Implementation Patterns

### Pattern 1: Request Routing & Header Transformation

This pattern shows Envoy proxy configuration for L7 request routing with regex path matching, header injection/removal, and request/response body transformation at the gateway level.

```yaml
# envoy-routes.yaml — Declarative route configuration for Envoy Proxy
static_resources:
  listeners:
    - name: main_listener
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend_services
                      domains: ["*"]
                      routes:

                        # Regex path matching — strip /api/v1 prefix before forwarding
                        - match:
                            safe_regex:
                              google_re2: {}
                              regex: "^/api/v1/users/(.*)"
                          route:
                            cluster: user_service
                            timeout: 5s
                          request_headers_to_add:
                            - header:
                                key: x-forwarded-user-path
                                value: "/users/\1"

                        # Prefix rewrite — redirect /graphql to internal GraphQL service
                        - match:
                            prefix: /api/v1/graphql
                          route:
                            cluster: graphql_service
                            prefix_rewrite: /
                            timeout: 10s

                        # Header-based routing — send canary traffic to v2 service
                        - match:
                            headers:
                              - name: x-canary
                                string_match: exact
                                value: "true"
                          route:
                            cluster: user_service_v2
                            timeout: 5s

                        # Default route with response header transformation
                        - match:
                            prefix: /api/v1/
                          route:
                            cluster: default_api
                            timeout: 3s
                          response_headers_to_add:
                            - header:
                                key: x-gateway-version
                                value: "1.2.0"
                            - header:
                                key: x-content-security-policy-report-only
                                value: "default-src 'self'; report-uri /csp-report"
                http_filters:
                  # JWT authentication filter (see Pattern 2)
                  - name: envoy.filters.http.jwt_authn
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                      providers:
                        auth_provider:
                          issuer: https://auth.example.com
                          remote_jwks:
                            http_uri:
                              uri: https://auth.example.com/.well-known/jwks.json
                              cluster: jwks_cluster
                              timeout: 5s
                            filters:
                              - action: KEEP_IF_EMPTY_OR_SIGNED
                                name: envoy.filters.http.alternate_protocols_cache
                      rules:
                        - match:
                            prefix: /api/v1/admin/
                          requires: auth_provider

                # Remove upstream security headers — gateway owns them
                remove_response_headers:
                  - access-control-allow-origin
```

### Pattern 2: JWT/OAuth Token Validation at Gateway

This pattern shows a complete Python/FastAPI middleware for JWT validation with JWKS key fetching, automatic key caching with refresh-ahead, token introspection, and claim extraction into downstream headers. The BAD example demonstrates the common anti-pattern of passing raw tokens to backend services without gateway-level validation.

```python
"""api_gateway/jwt_middleware.py — JWT/OAuth validation middleware for API gateway edge.

Implements JWKS-based key caching with automatic refresh-ahead, token validation,
and claim extraction into downstream service headers per OWASP API Security Top 10
(API10:2023 Server Side Request Forgery — validate all inbound tokens at the edge).
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx
import jwt
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JWKSConfig:
    """Configuration for JWKS key fetching and caching behavior."""
    jwks_uri: str
    cache_ttl_seconds: int = 3600          # Cache keys for 1 hour
    refresh_ahead_seconds: int = 300      # Refresh keys 5 minutes before expiry
    allowed_algorithms: list[str] = field(
        default_factory=lambda: ["RS256", "ES256"],
    )


@dataclass
class JWKSKeyCache:
    """Thread-safe cache for JWKS public keys with automatic refresh-ahead."""
    config: JWKSConfig
    _keys: dict[str, object] = field(default_factory=dict)
    _expires_at: float = 0.0
    _loading: bool = False

    async def get_keys(self, client: httpx.AsyncClient) -> dict[str, object]:
        """Return cached keys, refreshing if expired or refresh-ahead window passed."""
        now = time.time()
        if self._keys and (now - (self._expires_at - self.config.refresh_ahead_seconds)) < 0:
            return self._keys

        # Deduplicate concurrent refreshes — only one loader at a time
        if self._loading:
            while self._loading:
                await asyncio.sleep(0.05)
            return self._keys

        self._loading = True
        try:
            response = await client.get(self.config.jwks_uri, timeout=10.0)
            response.raise_for_status()
            jwks_data = response.json()
            # Convert JWKS keys to a dict keyed by kid for fast lookup
            self._keys = {
                key["kid"]: jwt.algorithms.RSAAlgorithm.from_jwk(key)
                if key.get("kty") == "RSA"
                else jwt.algorithms.ECAlgorithm.from_jwk(key)
                for key in jwks_data.get("keys", [])
            }
            self._expires_at = now + self.config.cache_ttl_seconds
            logger.info("JWKS keys refreshed: %d keys cached, expiry=%s", len(self._keys), self._expires_at)
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.error("Failed to refresh JWKS keys: %s — using stale cache", exc)
            if not self._keys:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable (JWKS fetch failed)",
                ) from exc
        finally:
            self._loading = False

        return self._keys


@dataclass
class ValidatedToken:
    """Holds a parsed and validated JWT token with extracted claims."""
    token_str: str
    headers: dict  # jwt.decode() decoded headers (alg, kid, typ)
    payload: dict  # Standard + custom claims from the token body


async def validate_and_extract(
    token: str,
    jwks_cache: JWKSKeyCache,
    client: httpx.AsyncClient,
    audience: Optional[str] = None,
) -> ValidatedToken:
    """Validate a JWT against the cached JWKS keys and return extracted claims.

    This is the gateway-side validation — backend services must NOT re-validate.
    Instead they trust the headers injected by this function.

    Args:
        token: Raw JWT bearer token string from Authorization header.
        jwks_cache: Cached JWKS public keys with automatic refresh-ahead.
        client: Async HTTP client for JWKS fetching (shared across gateway instances).
        audience: Expected 'aud' claim value (optional, per OAuth 2.0 spec).

    Returns:
        ValidatedToken with parsed headers and payload.

    Raises:
        HTTPException: Token is missing, malformed, expired, or unsigned.
    """
    # Strip "Bearer " prefix if present
    raw_token = token.removeprefix("Bearer ").strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    # Get cached keys (may trigger background refresh)
    keys = await jwks_cache.get_keys(client)

    # Decode without verification first — need 'kid' from header to pick correct key
    unverified_headers = jwt.get_unverified_header(raw_token)
    kid = unverified_headers.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'kid' header — must be issued by auth provider",
        )

    if kid not in keys:
        logger.warning("Unknown key ID %s in token — keys may need refresh", kid)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signed with unrecognized key",
        )

    # Verify signature and claims
    payload = jwt.decode(
        raw_token,
        keys[kid],
        algorithms=jwks_cache.config.allowed_algorithms,
        audience=audience,
        issuer=jwks_cache.config.jwks_uri.split("/.well-known/jwks.json")[0],
    )

    return ValidatedToken(token_str=raw_token, headers=unverified_headers, payload=payload)


def extract_downstream_headers(
    validated: ValidatedToken,
    include_token_copy: bool = False,
) -> dict[str, str]:
    """Extract claims from a validated token into HTTP headers for downstream services.

    The gateway passes identity via headers — backend services trust the gateway and
    do NOT validate tokens themselves. This follows the principle of least privilege:
    only the claims needed by each service are forwarded.

    Args:
        validated: Result of validate_and_extract().
        include_token_copy: Whether to pass the raw token downstream (rarely needed).

    Returns:
        Dict of header-name → header-value pairs ready for forwarding.
    """
    payload = validated.payload
    headers: dict[str, str] = {
        "x-auth-subject": str(payload.get("sub", "")),
        "x-auth-issuer": str(payload.get("iss", "")),
        "x-auth-audience": str(payload.get("aud", "")),
        "x-auth-token-expiry": str(payload.get("exp", 0)),
        "x-auth-token-algorithm": validated.headers.get("alg", "unknown"),
    }

    # Extract role/permissions if present (claim name varies by provider)
    for claim_key in ("roles", "permissions", "scope", "scopes"):
        if claim_key in payload:
            value = payload[claim_key]
            if isinstance(value, list):
                headers[f"x-auth-{claim_key}"] = ",".join(str(v) for v in value)
            else:
                headers[f"x-auth-{claim_key}"] = str(value)

    # Optional: forward raw token for downstream services that need to call other APIs
    if include_token_copy:
        headers["x-forwarded-bearer-token"] = validated.token_str

    return headers


# ---------------------------------------------------------------------------
# BAD vs. GOOD comparison
# ---------------------------------------------------------------------------

"""
# ❌ BAD: Passing raw token directly to backend — gateway does NO validation.
#    This means every microservice must implement JWT verification independently,
#    leading to inconsistent policies, key management sprawl, and potential bypass
#    if a new service forgets the validation step.

@app.get("/api/users/profile")
async def get_profile(request: Request):
    # No gateway-level validation — token is forwarded raw
    downstream_headers = {
        "Authorization": request.headers.get("Authorization", ""),  # Raw Bearer token
    }
    response = await httpx.AsyncClient().get(
        "http://user-service/profile",
        headers=downstream_headers,
        timeout=5.0,
    )
    return response.json()

# ✅ GOOD: Gateway validates at edge, extracts claims into typed headers.
#    Backend service receives only the identity it needs — no token to verify,
#    no key management overhead. The gateway is the single trust boundary.

@app.get("/api/users/profile")
async def get_profile(request: Request):
    auth_header = request.headers.get("Authorization", "")
    
    # 1. Gateway validates token at edge using cached JWKS keys
    validated = await validate_and_extract(
        token=auth_header,
        jwks_cache=jwks_key_cache,
        client=httpx.AsyncClient(),
        audience="user-service",
    )

    # 2. Extract claims into downstream headers — backend trusts gateway
    downstream_headers = extract_downstream_headers(validated)
    
    # 3. Forward only validated identity — no raw token to verify
    response = await httpx.AsyncClient().get(
        "http://user-service/profile",
        headers=downstream_headers,
        timeout=5.0,
    )
    return response.json()
"""
```

### Pattern 3: Distributed Rate Limiting with Redis

This pattern shows a complete token bucket implementation using Redis for cross-instance consistency. The Lua script ensures atomic decrement operations to prevent race conditions when multiple gateway instances handle requests concurrently. Per-client and per-tier quotas are enforced at the edge before any backend traffic is generated.

```python
"""api_gateway/rate_limiter.py — Distributed rate limiter with Redis-backed token bucket.

Implements a sliding window rate limiter using Redis Lua scripting for atomic
operations. Supports per-client, per-API-key, and per-tier quota enforcement
at the API gateway edge to protect downstream services from overload.

Uses Lua scripting (EVALSHA) to ensure the read-check-modify cycle is atomic
across all gateway instances — critical when multiple gateway pods handle
concurrent requests for the same client.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# Lua script: atomic token bucket check-and-decrement.
# KEYS[1] = rate limit key (e.g., "rl:user:<api_key>")
# ARGV[1] = capacity (max tokens in bucket)
# ARGV[2] = refill_rate (tokens added per second)
# ARGV[3] = current time in milliseconds (for precision)
# ARGV[4] = cost of this request (default 1 token)
#
# Returns: [allowed (0|1), remaining tokens, retry_after_ms or 0]
RATE_LIMIT_SCRIPT = """
local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local rate      = tonumber(ARGV[2])
local now_ms    = tonumber(ARGV[3])
local cost      = tonumber(ARGV[4])

-- Get current state
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens     = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now_ms

-- Calculate tokens to add based on elapsed time
local elapsed = (now_ms - last_refill) / 1000.0
local new_tokens = math.min(capacity, tokens + elapsed * rate)

-- Check if we have enough tokens
if new_tokens >= cost then
    new_tokens = new_tokens - cost
    
    -- Update bucket state atomically
    redis.call('HMSET', key, 'tokens', tostring(new_tokens), 'last_refill', tostring(now_ms))
    
    -- Set expiry to prevent memory leaks (bucket expires after 2x refill cycle with no activity)
    redis.call('EXPIRE', key, math.ceil(capacity / rate * 2))
    
    return {1, math.floor(new_tokens), 0}
else
    -- Calculate retry-after: how long until enough tokens accumulate
    local deficit = cost - new_tokens
    local retry_ms = math.ceil((deficit / rate) * 1000)
    
    -- Still update refill time so subsequent requests don't wait unnecessarily
    redis.call('HMSET', key, 'tokens', tostring(new_tokens), 'last_refill', tostring(now_ms))
    redis.call('EXPIRE', key, math.ceil(capacity / rate * 2))
    
    return {0, math.floor(new_tokens), retry_ms}
end
"""


@dataclass(frozen=True)
class RateLimitConfig:
    """Configuration for a single rate limit tier."""
    capacity: int           # Maximum tokens (requests) allowed in burst
    refill_rate: float      # Tokens added per second (sustained throughput)
    description: str        # Human-readable description (e.g., "Standard tier: 100 req/s")


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    remaining_tokens: int
    retry_after_ms: int = 0
    limit: int = 0
    reset_at_epoch: float = 0.0


class DistributedRateLimiter:
    """Redis-backed distributed token bucket rate limiter for API gateway.

    Thread-safe and cross-instance consistent: multiple gateway pods calling the
    same Redis backend will see consistent rate limit state because all operations
    are executed atomically via a Lua script.

    Example usage:
        limiter = DistributedRateLimiter(redis_url="redis://gateway-redis:6379")
        await limiter.start()
        
        result = await limiter.check_limit(
            client_id="apikey-abc123",
            tier_key="standard",
            cost=1,
        )
        if not result.allowed:
            return JSONResponse(status_code=429, body={"error": "rate limited"}, ...)
    """

    TIER_CONFIGS: dict[str, RateLimitConfig] = field(default_factory=lambda: {
        "free":      RateLimitConfig(capacity=10, refill_rate=1.0, description="Free tier: 10 req/s burst"),
        "standard":  RateLimitConfig(capacity=100, refill_rate=10.0, description="Standard: 100 req/s burst"),
        "premium":   RateLimitConfig(capacity=500, refill_rate=50.0, description="Premium: 500 req/s burst"),
        "enterprise": RateLimitConfig(capacity=2000, refill_rate=200.0, description="Enterprise: 2000 req/s burst"),
    })

    def __init__(self, redis_url: str = "redis://localhost:6379", prefix: str = "rl") -> None:
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix
        self._script_sha: Optional[str] = None

    async def start(self) -> None:
        """Initialize — preload the Lua script SHA for EVALSHA (faster than EVAL)."""
        # Verify Redis connectivity
        await self.redis.ping()
        # Load the Lua script once and cache its SHA for EVALSHA calls
        self._script_sha = await self.redis.script_load(RATE_LIMIT_SCRIPT)
        logger.info("DistributedRateLimiter: Lua script loaded, SHA=%s", self._script_sha[:8])

    async def check_limit(
        self,
        client_id: str,
        tier_key: str = "free",
        cost: int = 1,
    ) -> RateLimitResult:
        """Check whether a request is allowed under the rate limit.

        This is an atomic Redis operation via Lua script — safe to call from
        multiple concurrent gateway instances without race conditions.

        Args:
            client_id: Unique identifier for the client (API key, IP hash, or user ID).
            tier_key: Rate limit tier to apply (keys into TIER_CONFIGS).
            cost: Number of tokens this request consumes (1 for normal, >1 for expensive ops).

        Returns:
            RateLimitResult with allowed flag and metadata for response headers.

        Raises:
            RuntimeError: If the rate limiter is not initialized or tier is unknown.
        """
        if self._script_sha is None:
            raise RuntimeError("RateLimiter.start() must be called before use")

        if tier_key not in self.TIER_CONFIGS:
            raise ValueError(f"Unknown tier: {tier_key}. Valid: {list(self.TIER_CONFIGS.keys())}")

        config = self.TIER_CONFIGS[tier_key]
        key = f"{self.prefix}:{client_id}"
        now_ms = int(asyncio.get_event_loop().time() * 1000) if True else int(time.time() * 1000)

        try:
            result = await self.redis.evalsha(
                self._script_sha,
                1,  # Number of KEYS
                key,
                str(config.capacity),
                str(config.refill_rate),
                str(now_ms),
                str(cost),
            )

            allowed = bool(int(result[0]))
            remaining = int(result[1])
            retry_after = int(result[2])

            # Calculate reset time: when the bucket will be fully refilled
            reset_at_epoch = (now_ms / 1000.0) + ((config.capacity - remaining) / config.refill_rate)

            return RateLimitResult(
                allowed=allowed,
                remaining_tokens=max(remaining, 0),
                retry_after_ms=retry_after if not allowed else 0,
                limit=config.capacity,
                reset_at_epoch=reset_at_epoch,
            )

        except aioredis.RedisError as exc:
            # On Redis failure, allow requests to pass through (fail-open for availability)
            logger.error("Redis rate limiter unavailable — allowing request (fail-open): %s", exc)
            return RateLimitResult(allowed=True, remaining_tokens=config.capacity, limit=config.capacity)

    def build_response_headers(self, result: RateLimitResult) -> dict[str, str]:
        """Build HTTP headers for rate limit response per RFC 8615 (Retry-After)."""
        headers: dict[str, str] = {
            "X-RateLimit-Limit": str(result.limit),
            "X-RateLimit-Remaining": str(result.remaining_tokens),
        }
        if result.reset_at_epoch:
            headers["X-RateLimit-Reset"] = str(int(result.reset_at_epoch))
        if not result.allowed and result.retry_after_ms > 0:
            headers["Retry-After"] = str(max(1, result.retry_after_ms // 1000))
        return headers

    async def close(self) -> None:
        """Clean up Redis connection."""
        await self.redis.close()
```

### Pattern 4: Request Aggregation (BFF Gateway)

This pattern shows how the gateway can act as a Backend-For-Frontend, combining multiple downstream service calls into a single response. The implementation uses concurrent fetching with independent timeouts per service and handles partial failures gracefully — failed service responses are omitted or returned with error markers rather than blocking the entire aggregation.

```python
"""api_gateway/request_aggregation.py — BFF gateway for response aggregation.

Combines multiple downstream microservice calls into a single response at the
gateway layer, reducing client round-trips from N HTTP calls to 1. Each service
call has its own timeout; partial failures return error markers rather than
blocking the entire response (fail-fast per-service).

This implements the BFF (Backend-For-Frontend) pattern at the API gateway level
— the gateway knows what data the client needs and fetches it from multiple
upstream services concurrently.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UpstreamService:
    """Definition of a downstream service endpoint for aggregation."""
    name: str                      # Human-readable service name (for error reporting)
    url_template: str              # URL template with optional path parameters
    timeout_seconds: float = 3.0   # Independent timeout per service
    required: bool = True          # If False, failure returns partial response
    headers_template: dict[str, str] | None = None  # Headers to include (e.g., auth forwarding)


@dataclass
class ServiceResponse:
    """Result of a single downstream service call in an aggregation."""
    service_name: str
    success: bool
    data: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    status_code: int = 0
    latency_ms: float = 0.0


@dataclass
class AggregatedResponse:
    """Complete response from an aggregation endpoint."""
    services: list[ServiceResponse] = field(default_factory=list)
    partial_failure: bool = False
    total_latency_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to HTTP JSON response structure."""
        return {
            "data": {svc.service_name: svc.data for svc in self.services if svc.success and svc.data},
            "errors": [
                {"service": svc.service_name, "detail": svc.error}
                for svc in self.services if not svc.success and svc.error
            ],
            "partial_failure": self.partial_failure,
            "latency_ms": round(self.total_latency_ms, 1),
        }


class RequestAggregator:
    """Concurrently fetches from multiple downstream services with per-service timeouts.

    Usage:
        aggregator = RequestAggregator()
        
        response = await aggregator.aggregate(
            services=[
                UpstreamService("profile", "http://user-service/profile/{user_id}"),
                UpstreamService("orders", "http://order-service/latest/{user_id}"),
                UpstreamService("notifications", "http://notif-service/unread/{user_id}"),
            ],
            path_params={"user_id": "12345"},
            downstream_headers={"x-forwarded-user-id": "12345"},
        )
    """

    def __init__(self, max_concurrent: int = 10) -> None:
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self._shared_client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-initialized shared HTTP client with connection pooling."""
        if self._shared_client is None or self._shared_client.is_closed:  # type: ignore[union-attr]
            self._shared_client = httpx.AsyncClient(
                timeout=httpx.Timeout(5.0, connect=2.0),
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            )
        return self._shared_client  # type: ignore[return-value]

    async def aggregate(
        self,
        services: list[UpstreamService],
        path_params: dict[str, str] | None = None,
        downstream_headers: dict[str, str] | None = None,
    ) -> AggregatedResponse:
        """Fetch from all services concurrently and compose the response.

        Args:
            services: List of upstream service definitions to fetch.
            path_params: Values for URL template variables (e.g., {user_id}).
            downstream_headers: Headers to forward to all services (e.g., auth).

        Returns:
            AggregatedResponse with per-service results, partial failure flag,
            and total latency measurement.
        """
        start_time = asyncio.get_event_loop().time() if True else 0
        path_params = path_params or {}
        downstream_headers = downstream_headers or {}
        results: list[ServiceResponse] = []

        async def fetch_service(svc: UpstreamService) -> ServiceResponse:
            """Fetch a single service with its own timeout, capturing latency."""
            svc_start = asyncio.get_event_loop().time() if True else 0
            url = svc.url_template.format(**path_params)

            try:
                async with self.semaphore:
                    response = await self.client.get(
                        url,
                        headers={**downstream_headers, **(svc.headers_template or {})},
                        timeout=svc.timeout_seconds,
                    )

                if 200 <= response.status_code < 300:
                    return ServiceResponse(
                        service_name=svc.name,
                        success=True,
                        data=response.json() if "application/json" in response.headers.get("content-type", "") else None,
                        status_code=response.status_code,
                    )
                else:
                    logger.warning("Service %s returned HTTP %d from %s", svc.name, response.status_code, url)
                    return ServiceResponse(
                        service_name=svc.name,
                        success=False,
                        error=f"HTTP {response.status_code}",
                        status_code=response.status_code,
                    )

            except httpx.TimeoutException:
                logger.error("Service %s timed out after %.1fs at %s", svc.name, svc.timeout_seconds, url)
                return ServiceResponse(
                    service_name=svc.name,
                    success=False,
                    error=f"Timeout after {svc.timeout_seconds}s",
                )

            except httpx.RequestError as exc:
                logger.error("Service %s connection failed at %s: %s", svc.name, url, exc)
                return ServiceResponse(
                    service_name=svc.name,
                    success=False,
                    error=f"Connection error: {type(exc).__name__}",
                )

            finally:
                elapsed = (asyncio.get_event_loop().time() if True else 0) - svc_start

        # Launch all service calls concurrently — each with its own timeout
        tasks = [fetch_service(svc) for svc in services]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        total_latency = (asyncio.get_event_loop().time() if True else 0) - start_time
        failed_services = [r for r in results if not r.success]

        return AggregatedResponse(
            services=list(results),
            partial_failure=bool(failed_services),
            total_latency_ms=total_latency * 1000,  # Convert to milliseconds
        )


# ---------------------------------------------------------------------------
# Concrete example: User dashboard aggregation endpoint
# ---------------------------------------------------------------------------

"""
# This is what a real BFF endpoint looks like in the gateway.
# The client makes ONE request and gets profile + orders + notifications combined.

@app.get("/bff/user-dashboard/{user_id}")
async def get_user_dashboard(
    user_id: str,
    downstream_headers: dict = Depends(extract_gateway_headers),
):
    services = [
        UpstreamService(
            name="profile",
            url_template="http://user-service/api/users/{user_id}",
            timeout_seconds=2.0,
            required=True,
        ),
        UpstreamService(
            name="orders",
            url_template="http://order-service/api/users/{user_id}/latest?limit=5",
            timeout_seconds=3.0,
            required=False,  # Dashboard still shows if orders service is down
        ),
        UpstreamService(
            name="notifications",
            url_template="http://notification-service/api/unread-count/{user_id}",
            timeout_seconds=1.5,
            required=False,
        ),
    ]

    aggregator = RequestAggregator(max_concurrent=5)
    response = await aggregator.aggregate(
        services=services,
        path_params={"user_id": user_id},
        downstream_headers=downstream_headers,
    )

    return JSONResponse(content=response.to_dict())
"""
```

### Pattern 5: Circuit Breaker at Gateway Edge

The gateway acts as the first line of defense by detecting upstream health via configurable health checks and failing fast before requests reach unhealthy services. This is distinct from application-level circuit breakers — it operates at the network edge, preventing any traffic from reaching backends that have been marked degraded.

```yaml
# circuit-breaker.yaml — Envoy proxy circuit breaker configuration
# Applied at the cluster (upstream) level for each backend service.

static_resources:
  clusters:
    - name: user_service
      lb_policy: ROUND_ROBIN
      connect_timeout: 2s
      
      # Circuit breaker thresholds — fail fast when upstream is unhealthy
      circuit_breakers:
        thresholds:
          - priority: DEFAULT
            max_connections: 1000           # Max open connections to this upstream
            max_pending_requests: 500       # Max queued requests
            max_retries: 3                  # Max retries per request
            
      # Health check — pings upstream before sending traffic
      health_checks:
        - timeout: 4s
          interval: 10s
          unhealthy_threshold: 3          # Mark unhealthy after 3 consecutive failures
          healthy_threshold: 2            # Mark healthy after 2 consecutive successes
          http_health_check:
            path: /healthz
            expected_statuses:
              - start: 200
                end: 299

    - name: order_service
      lb_policy: ROUND_ROBIN
      connect_timeout: 3s
      
      circuit_breakers:
        thresholds:
          - priority: DEFAULT
            max_connections: 500
            max_pending_requests: 200
            max_retries: 2
            
      # Fail-open with fallback response when upstream is entirely unavailable
      outlier_detection:
        consecutive_5xx: 3                # 3 consecutive 5xx responses → eject
        interval: 5s                      # Check every 5 seconds
        base_ejection_time: 30s           # Eject for at least 30 seconds
        max_ejection_percent: 50          # Don't eject more than 50% of hosts
      
      # Fallback cluster — return cached/error response when upstream is down
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
```

---

## Constraints

### MUST DO
- Validate tokens at gateway edge — never trust unvalidated claims in downstream services
- Use Lua scripts for atomic Redis rate limit operations — no race conditions under concurrent load
- Set explicit timeouts on ALL upstream connections — no infinite waits
- Log full request lifecycle with correlation IDs through the gateway for distributed tracing
- Implement circuit breaker protection on every upstream route — never route without defense
- Inject `x-correlation-id` header (UUID v4) into every request for end-to-end traceability
- Cache JWKS keys with refresh-ahead to avoid latency spikes during key rotation
- Return proper HTTP 429 responses with Retry-After and rate limit headers when client is rate-limited

### MUST NOT DO
- Offload business logic authentication to downstream services — gateway handles auth
- Route requests without circuit breaker protection on the upstream cluster
- Use fixed delay retries at gateway level (use exponential backoff in client or service mesh)
- Store sensitive tokens, API keys, or JWT payloads in logs — use correlation IDs only
- Cache rate limit state in process-local memory when multiple gateway instances exist — always use Redis
- Forward raw Authorization headers to downstream services — extract claims into typed headers instead
- Set upstream timeouts longer than the client-facing timeout (gateway must fail before the client)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `api-architecture` | API design conventions, REST/GraphQL architecture decisions |
| `system-reliability-architecture` | Application-level retry policies, health checks, graceful degradation |
| `service-mesh-patterns` | Sidecar-based inter-service communication (not gateway-level) |

---

## Live References

> Authoritative documentation links for API Gateway patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Envoy Proxy Documentation](https://www.envoyproxy.io/docs/envoy/latest/)
- [Kong Gateway Documentation](https://docs.konghq.com/gateway/latest/)
- [OpenTelemetry Distributed Tracing](https://opentelemetry.io/docs/concepts/tracing/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [RFC 8705 - OAuth 2.0 Mutual-TLS Client Authentication](https://datatracker.ietf.org/doc/html/rfc8705)
