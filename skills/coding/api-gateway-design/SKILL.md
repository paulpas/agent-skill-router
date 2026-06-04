---




name: api-gateway-design
description: Designs API gateway patterns for request routing, rate limiting, authentication,
  response caching, and request aggregation across microservice architectures.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: API gateway, api-gateway, request routing, rate limiting, auth proxy, API aggregation, load balancing, backend for frontend API aggregation
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
  - examples
  - config
  - do-dont
  related-skills: integration-patterns, rest-api-patterns, microservice-resilience-patterns,
    grpc-patterns




---




# API Gateway Design

Designs and implements API gateway patterns that serve as the single entry point for client requests, handling routing, authentication, rate limiting, caching, and request aggregation across microservice architectures. Covers both centralized gateways (Kong, NGINX) and code-level implementations (FastAPI-based).

## TL;DR Checklist

- [ ] Define route table with clear path-to-service mapping rules
- [ ] Implement rate limiting per-client or per-endpoint with configurable quotas
- [ ] Add authentication middleware that validates tokens before routing requests
- [ ] Configure response caching for idempotent GET endpoints with appropriate TTLs
- [ ] Set up request aggregation to reduce client round-trips for multi-service calls
- [ ] Enable structured logging with correlation IDs for distributed tracing

---

## When to Use

Use this skill when:

- Clients need a single entry point to access multiple backend services
- You want to centralize cross-cutting concerns (auth, rate limiting, logging) at the gateway level
- Multiple microservices share common authentication or authorization logic
- You need to aggregate responses from several backend services into a single response for the client
- You are implementing the Backend-for-Frontend (BFF) pattern for different client types (web, mobile, partner)
- External APIs require rate limiting or quota enforcement per consumer
- You need to transform or normalize request/response formats between clients and backends

## When NOT to Use

- For single-service applications — a gateway adds unnecessary latency and operational complexity
- When backend services can safely be called directly from clients with their own auth logic
- As a replacement for proper API design in your backend services — the gateway should not fix broken APIs
- In environments where sub-millisecond latency is critical — gateway hop adds 1-5ms per request

---

## Core Workflow

1. **Define the Route Table** — Create a complete mapping of URL paths to backend services. Use path prefix routing (`/api/users/*` → `user-service`) or wildcard matching (`/api/orders/*/payments`). For each route, specify: HTTP method, required headers, authentication requirements, and rate limit tier.
   **Checkpoint:** Every route must have an explicit timeout (default 5s) and a circuit breaker configured. No route may pass through to a backend without authentication unless it is explicitly marked as public (e.g., health checks).

2. **Implement Authentication Middleware** — Validate incoming tokens before any routing occurs. Support both JWT bearer tokens and API keys. On validation failure, return `401 Unauthorized` with a structured error response. Pass the authenticated user identity to downstream services via an `X-User-ID` header.
   **Checkpoint:** Auth middleware must run BEFORE route matching. The gateway should never forward unauthenticated requests even if a backend service would reject them anyway — fail fast at the edge.

3. **Configure Rate Limiting** — Implement rate limiting using either the fixed-window or sliding-window algorithm. Assign each API consumer (identified by API key or JWT `client_id`) to a rate limit tier with configurable requests-per-second and burst limits. Return `429 Too Many Requests` with `Retry-After` header when exceeded.
   **Checkpoint:** Rate limiter must be thread-safe and distributed-aware — in multi-instance deployments, use a shared store (Redis) for counters rather than per-process counts.

4. **Add Caching Strategy** — For idempotent GET requests, implement response caching with configurable TTL based on endpoint sensitivity. Use cache key = full request path + relevant query parameters. Set `Cache-Control` headers on cached responses. Implement cache invalidation triggers when the originating service emits a write event.
   **Checkpoint:** Never cache POST, PUT, or DELETE responses. Never cache responses containing user-specific data unless you properly set Vary and private Cache-Control headers.

5. **Implement Request Aggregation** — When clients need data from multiple services for a single UI render, aggregate the calls at the gateway level. Use parallel fan-out (all backend calls start simultaneously) and timeout all upstream calls to a shared deadline. Return partial results with a `X-Partial-Response: true` header if some backends failed.
   **Checkpoint:** Aggregation endpoints must have an explicit schema defining which backends are called, what data is merged, and how failures are reported. Never aggregate more than 5 services in one call.

---

## Implementation Patterns / Reference Guide

### Pattern 1: FastAPI-based API Gateway with Middleware

This pattern implements a code-level API gateway using FastAPI middleware for authentication, rate limiting, and logging. Suitable for smaller deployments or when you need custom routing logic that a reverse proxy cannot handle.

```python
import time
import asyncio
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware


# --- Data models ---

@dataclass
class RateLimitConfig:
    """Rate limit configuration for a tier."""
    requests_per_second: float = 10.0
    burst_size: int = 20
    window_seconds: float = 60.0


@dataclass
class RouteEntry:
    """Single route definition in the gateway's route table."""
    path_prefix: str
    methods: list[str]
    backend_url: str
    timeout_seconds: float = 5.0
    auth_required: bool = True
    rate_limit_tier: str = "default"
    cache_ttl_seconds: int = 0  # 0 means no caching


@dataclass
class GatewayConfig:
    """Complete gateway configuration."""
    routes: list[RouteEntry] = field(default_factory=list)
    rate_limit_tiers: dict[str, RateLimitConfig] = field(default_factory=lambda: {
        "default": RateLimitConfig(requests_per_second=10.0, burst_size=20),
        "premium": RateLimitConfig(requests_per_second=50.0, burst_size=100),
        "internal": RateLimitConfig(requests_per_second=200.0, burst_size=400),
    })


# --- Routing engine ---

class RouteTable:
    """Matches incoming requests to backend services using path prefix routing."""

    def __init__(self, routes: list[RouteEntry]) -> None:
        self._routes = sorted(routes, key=lambda r: len(r.path_prefix), reverse=True)

    def match(self, path: str, method: str) -> Optional[RouteEntry]:
        """Find the most specific route matching the request path and method.

        Returns the longest matching path prefix, or None if no route matches.
        Implements Fail Fast — returns on first (most specific) match.
        """
        for route in self._routes:
            if path.startswith(route.path_prefix) and method in route.methods:
                return route
        return None

    def list_all(self) -> list[dict]:
        """Return all configured routes for health / documentation."""
        return [
            {"path": r.path_prefix, "methods": r.methods, "backend": r.backend_url}
            for r in self._routes
        ]


# --- Rate limiter (sliding window per client) ---

class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter using an in-memory store.

    For production multi-instance deployments, replace with a Redis-based
    implementation that shares state across all gateway instances.
    """

    def __init__(self) -> None:
        # client_id → list of request timestamps
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def allow_request(self, client_id: str, config: RateLimitConfig) -> tuple[bool, float]:
        """Check if a request is allowed under the rate limit.

        Returns (allowed, retry_after_seconds).
        If allowed is False, retry_after indicates how long to wait before retrying.
        """
        now = time.monotonic()
        window_start = now - config.window_seconds

        async with self._lock:
            # Prune old entries outside the sliding window
            self._windows[client_id] = [
                ts for ts in self._windows[client_id] if ts > window_start
            ]
            current_count = len(self._windows[client_id])

            if current_count >= config.burst_size:
                # Over burst limit — calculate retry time
                oldest_in_window = min(self._windows[client_id])
                retry_after = config.window_seconds - (now - oldest_in_window)
                return False, max(0.1, retry_after)

            if current_count >= int(config.requests_per_second * config.window_seconds):
                # Over sustained rate — small wait before next allowed request
                retry_after = 1.0 / config.requests_per_second
                return False, retry_after

            # Allow and record
            self._windows[client_id].append(now)
            return True, 0.0


# --- Auth middleware (JWT validation) ---

async def validate_bearer_token(token: str) -> dict:
    """Validate a JWT bearer token and return the decoded payload.

    In production, verify the signature against your JWK set endpoint.
    Here we demonstrate the pattern structure.
    """
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    parts = token.split(" ", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid token format")

    # In production: decode and verify JWT signature
    # payload = jwt.decode(parts[1], keys=get_jwk_set(), algorithms=["RS256"])
    # For demonstration, assume we have a working validator
    return {"sub": "user-123", "client_id": "app-456"}


# --- Gateway app with all middleware stacked ---

def create_gateway(config: GatewayConfig) -> FastAPI:
    """Create the gateway application with all middleware layers."""
    app = FastAPI(title="API Gateway", version="1.0.0")

    route_table = RouteTable(config.routes)
    rate_limiter = SlidingWindowRateLimiter()

    # Middleware layer 1: Request logging + correlation ID injection
    @app.middleware("http")
    async def logging_middleware(request: Request, call_next):
        start_time = time.monotonic()
        correlation_id = request.headers.get("X-Correlation-ID", str(time.time()))

        # Inject correlation ID into response for distributed tracing
        response = await call_next(request)

        elapsed_ms = round((time.monotonic() - start_time) * 1000, 1)
        print(
            f"[{correlation_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({elapsed_ms}ms)"
        )
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
        return response

    # Middleware layer 2: Rate limiting
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Extract client identity from API key or JWT
        api_key = request.headers.get("X-API-Key")
        auth_header = request.headers.get("Authorization")

        if api_key:
            client_id = f"key:{api_key}"
        elif auth_header and auth_header.startswith("Bearer "):
            try:
                payload = await validate_bearer_token(auth_header)
                client_id = payload.get("client_id", "anonymous")
            except HTTPException:
                return Response(status_code=401, content='{"error":"auth-failed"}')
        else:
            client_id = f"ip:{request.client.host}" if request.client else "unknown"

        # Find matching route to determine rate limit tier
        route = route_table.match(request.url.path, request.method)
        tier_name = route.rate_limit_tier if route else "default"
        tier_config = config.rate_limit_tiers.get(tier_name, RateLimitConfig())

        allowed, retry_after = await rate_limiter.allow_request(client_id, tier_config)
        if not allowed:
            return Response(
                status_code=429,
                content=f'{{"error":"rate-limited","retry_after":{retry_after}}}',
                headers={"Retry-After": str(int(retry_after + 1))},
            )

        return await call_next(request)

    # Middleware layer 3: Request proxying
    @app.middleware("http")
    async def routing_middleware(request: Request, call_next):
        route = route_table.match(request.url.path, request.method)

        if route is None:
            raise HTTPException(status_code=404, detail="Route not found")

        if route.auth_required:
            # Validate auth before proxying
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required",
                )

        return await call_next(request)

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "routes_count": len(config.routes),
            "routes": route_table.list_all(),
        }

    return app


# Usage: configure routes and start the gateway
async def main():
    config = GatewayConfig(
        routes=[
            RouteEntry(path_prefix="/api/users/", methods=["GET", "POST"], backend_url="http://user-service:8001"),
            RouteEntry(path_prefix="/api/orders/", methods=["GET", "POST", "PUT"], backend_url="http://order-service:8002"),
            RouteEntry(path_prefix="/api/products/", methods=["GET"], backend_url="http://product-service:8003", cache_ttl_seconds=60),
        ]
    )
    app = create_gateway(config)

    import uvicorn  # type: ignore[import-not-found]
    uvicorn.run(app, host="0.0.0.0", port=8080)


### Pattern 2: Request Aggregation for BFF (Backend-for-Frontend)

Aggregates data from multiple backend services into a single response optimized for a specific client view. Reduces the number of round-trips a mobile/web app must make.

```python
import asyncio
import httpx
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AggregationResult:
    """Combined result from aggregating multiple backend calls."""
    data: dict[str, Any] = field(default_factory=dict)
    partial: bool = False          # True if some backends failed but we still have partial data
    errors: list[dict] = field(default_factory=list)  # Details of failed backends


@dataclass
class AggregationRoute:
    """Defines an aggregation endpoint that fans out to multiple backends."""
    path: str
    http_method: str = "GET"
    timeout_seconds: float = 5.0
    sources: list[dict] = field(default_factory=list)
    # Each source: {"name": "user", "url_template": "/api/users/{user_id}", "required": True}


async def aggregate_response(
    request: httpx.AsyncClient,
    aggregation_route: AggregationRoute,
    path_params: dict[str, str],
) -> AggregationResult:
    """Fan out to multiple backend services and merge results.

    All requests start simultaneously (parallel fan-out). Each request has
    its own timeout derived from the shared deadline. Partial results are
    returned even if some backends fail.

    This implements the "Best Effort" principle — return what you can rather
    than failing entirely because one dependency is unavailable.
    """
    deadline = asyncio.get_event_loop().time() + aggregation_route.timeout_seconds
    result = AggregationResult()

    # Build coroutines for all sources
    coroutines = []
    for source in aggregation_route.sources:
        url_template = source["url_template"]
        url = url_template.format(**path_params)
        timeout = max(0.5, deadline - asyncio.get_event_loop().time())
        coroutines.append(_call_backend(request, source["name"], url, timeout))

    # Execute all concurrently with shared deadline
    responses = await asyncio.gather(*coroutines, return_exceptions=True)

    for source_info, response in zip(aggregation_route.sources, responses):
        name = source_info["name"]

        if isinstance(response, Exception):
            result.errors.append({
                "source": name,
                "error": str(response),
                "required": source_info.get("required", False),
            })
            if source_info.get("required", False):
                # Required source failed — may need to return full error
                continue

        elif isinstance(response, dict):
            result.data[name] = response
        else:
            result.errors.append({
                "source": name,
                "error": f"Unexpected response type: {type(response).__name__}",
                "required": source_info.get("required", False),
            })

    result.partial = len(result.errors) > 0 and len(result.data) > 0
    return result


async def _call_backend(
    client: httpx.AsyncClient,
    source_name: str,
    url: str,
    timeout: float,
) -> dict | Exception:
    """Single backend call with timeout enforcement."""
    try:
        async with client.with_timeout(httpx.Timeout(timeout)) as c:
            resp = await c.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        return exc
    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        return exc


# Example aggregation route definition
dashboard_route = AggregationRoute(
    path="/api/dashboard/{user_id}",
    sources=[
        {"name": "user_profile", "url_template": "/api/users/{user_id}/profile", "required": True},
        {"name": "recent_orders", "url_template": "/api/orders?user_id={user_id}&limit=5", "required": False},
        {"name": "recommendations", "url_template": "/api/products/recommended/{user_id}", "required": False},
        {"name": "notifications", "url_template": "/api/notifications?user_id={user_id}&unread=true", "required": False},
    ],
    timeout_seconds=3.0,
)

# Usage: return response with proper headers
async def handle_dashboard(user_id: str):
    async with httpx.AsyncClient(base_url="http://gateway-internal") as client:
        result = await aggregate_response(client, dashboard_route, {"user_id": user_id})
        headers = {}
        if result.partial:
            headers["X-Partial-Response"] = "true"
            headers["X-Error-Count"] = str(len(result.errors))
        return {"data": result.data, "errors": result.errors}, 207 if result.partial else 200, headers


# ### Pattern 3: Response Caching with Cache Invalidation

```python
from dataclasses import dataclass
import hashlib
import time


@dataclass
class CacheEntry:
    """Single cached response."""
    key: str
    status_code: int
    body: str
    headers: dict[str, str]
    created_at: float
    ttl_seconds: int

    @property
    def is_expired(self) -> bool:
        return time.time() > self.created_at + self.ttl_seconds

    @property
    def cache_control_header(self) -> str:
        max_age = max(0, self.ttl_seconds - (time.time() - self.created_at))
        return f"public, max-age={int(max_age)}"


class ResponseCache:
    """In-memory response cache for idempotent GET requests.

    Cache key derivation ensures that semantically identical requests
    produce the same cached entry. For multi-instance deployments,
    replace with Redis-backed storage using SET/GET with EXPIRE.
    """

    def __init__(self, default_ttl: int = 60) -> None:
        self._store: dict[str, CacheEntry] = {}
        self._default_ttl = default_ttl

    @staticmethod
    def _make_key(method: str, path: str, query_params: dict | None) -> str:
        """Create a deterministic cache key from the request."""
        if method != "GET":
            return ""  # Never cache non-GET requests
        sorted_params = "&".join(f"{k}={v}" for k, v in sorted((query_params or {}).items()))
        raw = f"{method}:{path}?{sorted_params}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    async def get(self, method: str, path: str, query_params: dict | None) -> CacheEntry | None:
        key = self._make_key(method, path, query_params)
        if not key:
            return None

        entry = self._store.get(key)
        if entry and not entry.is_expired:
            return entry

        # Evict expired entry
        if entry:
            del self._store[key]
        return None

    async def put(self, method: str, path: str, query_params: dict | None,
                  status_code: int, body: str, headers: dict[str, str], ttl_seconds: int | None = None) -> None:
        key = self._make_key(method, path, query_params)
        if not key:
            return

        ttl = ttl_seconds or self._default_ttl
        # Only cache successful responses
        if status_code < 200 or status_code >= 400:
            return

        self._store[key] = CacheEntry(
            key=key, status_code=status_code, body=body,
            headers={**headers, "Cache-Control": f"public, max-age={ttl}"},
            created_at=time.time(), ttl_seconds=ttl,
        )

    async def invalidate(self, pattern: str) -> int:
        """Invalidate all cache entries matching a path prefix pattern.

        Called when a backend service emits a write event (e.g., order created).
        Returns the number of entries evicted.
        """
        evicted = 0
        to_remove = [k for k, v in self._store.items() if v.key.startswith(pattern)]
        for k in to_remove:
            del self._store[k]
            evicted += 1
        return evicted

    def clear_expired(self) -> int:
        """Remove all expired entries. Run periodically via background task."""
        to_remove = [k for k, v in self._store.items() if v.is_expired]
        for k in to_remove:
            del self._store[k]
        return len(to_remove)


# --- Cache-aware proxy middleware integration ---

async def cached_proxy(request_path: str, request_query: dict | None, backend_url: str,
                       cache: ResponseCache, http_client: httpx.AsyncClient) -> dict:
    """Check cache first, forward to backend only on miss."""
    # Try cache hit
    cached = await cache.get("GET", request_path, request_query)
    if cached is not None:
        return {"from": "cache", "data": cached.body, "status": cached.status_code}

    # Cache miss — call backend
    resp = await http_client.get(backend_url + request_path, params=request_query)
    body = resp.text
    headers = dict(resp.headers)

    # Determine TTL based on endpoint sensitivity
    if "/api/products/" in request_path:
        ttl = 120  # Products change infrequently
    elif "/api/pricing/" in request_path:
        ttl = 30   # Prices may change more often
    else:
        ttl = cache._default_ttl

    await cache.put("GET", request_path, request_query, resp.status_code, body, headers, ttl)

    return {"from": "backend", "data": body, "status": resp.status_code}
```

---

## Constraints

### MUST DO
- Always configure explicit timeouts on every route (default 5 seconds) — never let a slow backend block the entire gateway
- Return structured error responses with correlation IDs that callers can use for debugging and tracing
- Use sliding-window rate limiting per client, not a global rate limit — different clients have different quotas
- Set appropriate Cache-Control headers on cached responses and never cache user-specific data without proper Vary headers
- Implement health check endpoint (`/health`) that reports all route status and backend connectivity
- Log every request with: correlation ID, client identity, route matched, upstream service, response time, and status code

### MUST NOT DO
- Embed business logic in gateway routes — the gateway should only route, authenticate, rate-limit, and transform
- Use the gateway as a caching layer for write operations (POST/PUT/DELETE) — this creates stale data
- Route requests to backends without authentication by default — every route must explicitly opt-out (`auth_required: false`)
- Implement aggregation that chains requests sequentially (A calls B calls C) — always use parallel fan-out
- Hardcode backend URLs in client code — all routing must be configurable at startup or via config files
- Return raw backend errors to clients without sanitizing — mask internal service names, stack traces, and connection strings

---

## Output Template

When designing or reviewing an API gateway implementation, produce:

1. **Route Table** — Complete list of routes with path prefix, methods, backend URL, timeout, auth requirements, and rate limit tier
2. **Rate Limit Configuration** — Per-tier quotas, burst limits, and sliding window settings
3. **Authentication Flow** — Token validation logic, identity propagation headers, and error responses for failed auth
4. **Caching Strategy** — Which endpoints are cached, TTL values per endpoint type, and invalidation triggers
5. **Aggregation Schema** — For multi-service endpoints: source services, data merging rules, and failure handling

---

## Related Skills

| Skill | Purpose |
|---|---|
| `integration-patterns` | Broader integration patterns including saga, adapter, and resilience for the backend services your gateway routes to |
| `rest-api-patterns` | REST API design best practices that backend services should follow so the gateway can route them effectively |
| `microservice-resilience-patterns` | Circuit breakers, bulkheads, and graceful degradation strategies for when backends behind the gateway fail |
| `grpc-patterns` | gRPC-based service communication patterns for internal microservice-to-microservice calls that bypass the gateway |
