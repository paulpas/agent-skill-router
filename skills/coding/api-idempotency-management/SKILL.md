---




name: api-idempotency-management
description: Implements idempotency key patterns for REST and GraphQL APIs including key storage with TTL, duplicate request detection, safe retry semantics, and distributed cache-backed enforcement to prevent duplicate operations during network failures.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: idempotency, idempotency key, safe retry, duplicate request prevention, API retry safety, request deduplication, how do i handle retry duplicates
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: api-versioning-strategies, rest-api-patterns, api-security-patterns




---





# Idempotency Management for APIs

Implements idempotency mechanisms to ensure repeated API requests produce the same result without side effects. Manages key generation, storage with TTL, duplicate detection, and distributed enforcement across service boundaries.

## TL;DR Checklist

- [ ] Generate unique idempotency key from request metadata (method + path + canonical body hash)
- [ ] Store key-result mapping in Redis with TTL matching your consistency window
- [ ] Return cached result for duplicate keys without re-executing the handler
- [ ] Use Redis SETNX or equivalent atomic operation to prevent race conditions
- [ ] Handle expired keys by clearing stale entries and allowing fresh execution
- [ ] Set response headers `Idempotency-Key` and `Idempotency-Retention` for client visibility

---

## When to Use

- Protecting payment processing, order creation, or fund transfer endpoints from double-charges
- Implementing safe retry semantics for HTTP clients that retransmit on timeouts
- Building APIs consumed by unstable networks (mobile, edge computing) where request duplication is common
- Enforcing idempotency on any write operation (POST, PUT, PATCH, DELETE) that modifies state
- Designing distributed systems where network partitions may cause duplicate message delivery

---

## When NOT to Use

- Read-only (GET) endpoints — HTTP GET is inherently idempotent per RFC 9110 Section 9.2.1
- Pure computation endpoints with no side effects (e.g., data transformation, aggregation)
- Endpoints where exactly-once semantics are impossible by design (e.g., time-series ingestion with natural uniqueness)
- When the consistency window would require unbounded storage — cap TTL and implement cleanup

---

## Core Workflow

1. **Extract Idempotency Key** — Parse `Idempotency-Key` header from incoming request. If absent, generate one from canonical request fingerprint (method + path + query params sorted + SHA-256 of body).
   **Checkpoint:** Key must be non-empty and match the format `[client_id]-[timestamp_epoch_ms]-[nonce]`. Reject malformed keys with `400 Bad Request`.

2. **Check Existing Result** — Query Redis (or in-memory store for single-node) for the key using atomic `GET` or `GETSET`. If result exists and TTL has not expired, return cached response immediately with `200 OK` (or `201 Created`).
   **Checkpoint:** Verify TTL > 0. If TTL = 0 or key missing, proceed to step 3.

3. **Acquire Lock** — Use Redis `SETNX idempotent:lock:<key>` with a short expiry (5 seconds) to prevent concurrent execution of the same key by overlapping requests.
   **Checkpoint:** If lock acquisition fails, wait up to 2 seconds and retry once. If still locked, return `409 Conflict` with message "Request currently being processed".

4. **Execute Handler** — Run the business logic (database writes, external API calls, etc.) within the lock scope. Capture the response status code, headers, and body.
   **Checkpoint:** On exception, release the lock immediately and re-raise. Do NOT cache failed requests unless you intentionally want retries to also fail.

5. **Store Result** — Write the result payload to Redis under the idempotency key with a configurable TTL (default 24 hours). Use `SET` (not SETNX) since step 3 already claimed uniqueness.
   **Checkpoint:** Verify the write succeeded. If Redis is unavailable, execute anyway and do NOT store — fail open to avoid blocking all writes during cache outages.

6. **Release Lock** — Delete the lock key unconditionally after storing the result (or if step 5 was skipped due to Redis failure).
   **Checkpoint:** Use `DEL` (not conditional delete) — the lock owner always has the right to release.

7. **Set Response Headers** — Include `Idempotency-Key` in the response headers for client correlation and debugging.
   **Checkpoint:** Always echo back the key even when returning a cached result.

---

## Implementation Patterns

### Pattern 1: Basic Idempotency Key Generation (Python)

Canonical fingerprint construction ensures that two identical requests produce the same key regardless of JSON field ordering or whitespace.

```python
import hashlib
import hmac
import time
from typing import Optional


def generate_idempotency_key(
    client_id: str,
    method: str,
    path: str,
    query_params: dict[str, str],
    body: Optional[bytes] = None,
    secret: Optional[str] = None,
) -> str:
    """Generate a canonical idempotency key from request components.

    Combines method, path, sorted query params, and body hash into a
    deterministic fingerprint. Uses HMAC-SHA256 with an optional server-side
    secret to prevent clients from guessing or forging keys.

    Args:
        client_id: Unique identifier for the requesting client/service.
        method: HTTP method (GET, POST, PUT, PATCH, DELETE).
        path: Request URI path.
        query_params: Dictionary of query parameters (will be sorted).
        body: Raw request body bytes, if any.
        secret: Optional server-side signing key for HMAC.

    Returns:
        A deterministic idempotency key string.
    """
    # Sort query params for canonical representation
    sorted_params = sorted(query_params.items()) if query_params else []
    query_string = "&".join(f"{k}={v}" for k, v in sorted_params)

    # Hash the body if present (empty body = empty string hash)
    body_hash = hashlib.sha256(body or b"").hexdigest() if body else ""

    # Build canonical fingerprint
    fingerprint_parts = [
        method.upper(),
        path.strip("/"),
        query_string,
        body_hash,
    ]
    fingerprint = "|".join(fingerprint_parts)

    key_base = f"{client_id}-{int(time.time() * 1000)}-{hashlib.sha256(fingerprint.encode()).hexdigest()[:16]}"

    # Sign with HMAC if secret provided (prevents key forgery)
    if secret:
        signature = hmac.new(
            secret.encode(),
            key_base.encode(),
            hashlib.sha256,
        ).hexdigest()[:12]
        return f"{key_base}:{signature}"

    return key_base


def hash_idempotency_key(key: str) -> str:
    """Hash an idempotency key for safe storage without exposing client identifiers.

    Use when storing keys in logs, metrics, or shared caches where client IDs
    should not be visible. The hash is reversible by the origin server that holds
    the original key (for lookup), but opaque to observers.

    Args:
        key: Raw idempotency key string.

    Returns:
        SHA-256 hex digest of the key.
    """
    return hashlib.sha256(key.encode()).hexdigest()


# Example usage in a FastAPI route
from fastapi import FastAPI, Header, Response, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/orders")
async def create_order(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
) -> Response:
    if not idempotency_key:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing Idempotency-Key header"},
        )

    # Check Redis for cached result
    existing = await redis.get(f"idempotent:{idempotency_key}")
    if existing is not None:
        result = json.loads(existing)
        response = JSONResponse(content=result["body"], status_code=result["status"])
        response.headers["Idempotency-Key"] = idempotency_key
        return response

    # Execute handler (simplified — see Pattern 2 for middleware approach)
    order = await create_order_handler(request)
    result_body = order.model_dump() if hasattr(order, "model_dump") else order

    # Store result in Redis with TTL
    result_payload = json.dumps({"body": result_body, "status": 201})
    await redis.set(
        f"idempotent:{idempotency_key}",
        result_payload,
        ex=60 * 60 * 24,  # 24-hour retention window
    )

    response = JSONResponse(content=result_body, status_code=201)
    response.headers["Idempotency-Key"] = idempotency_key
    return response
```

### Pattern 2: Idempotency Middleware (FastAPI / Express.js)

Middleware wraps request handling so idempotency logic is applied universally without per-route code.

```python
# FastAPI middleware approach — apply to all routes automatically
from functools import wraps
from typing import Callable, Awaitable


class IdempotencyMiddleware:
    """FastAPI middleware that enforces idempotency on write operations.

    Automatically intercepts POST/PUT/PATCH/DELETE requests, checks for
    cached results in Redis, executes handlers only once per key, and
    stores results with TTL expiration.

    Usage:
        app.add_middleware(IdempotencyMiddleware, ttl_seconds=86400)
    """

    def __init__(self, app, ttl_seconds: int = 86400, redis_client=None):
        self.app = app
        self.ttl_seconds = ttl_seconds
        self.redis = redis_client
        self.write_methods = {"POST", "PUT", "PATCH", "DELETE"}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        from starlette.requests import Request
        from starlette.responses import Response, JSONResponse

        request = Request({"scope": scope, "receive": receive})

        # Only apply to write methods — GET is inherently idempotent
        if request.method not in self.write_methods:
            await self.app(scope, receive, send)
            return

        idempotency_key = request.headers.get("Idempotency-Key")
        if idempotency_key:
            # Check for cached result (atomic read)
            cache_key = f"idempotent:{idempotency_key}"
            cached_result = await self.redis.get(cache_key)

            if cached_result is not None:
                payload = json.loads(cached_result)
                response = JSONResponse(
                    content=payload["body"],
                    status_code=payload["status"],
                )
                response.headers["Idempotency-Key"] = idempotency_key
                response.headers["X-Idempotency-Cache"] = "HIT"
                await response(scope, receive, send)
                return

            # Cache miss — execute handler and store result
            captured_body: list[bytes] = []

            async def capturing_receive():
                if not captured_body:
                    msg = await receive()
                    captured_body.append(msg.get("body", b""))
                    return msg
                # Return empty body on subsequent reads (request consumed)
                return {"type": "http.request", "body": b""}

            # Store original send to capture response
            captured_response: dict = {}

            async def capturing_send(message):
                if message["type"] == "http.response.start":
                    captured_response["status"] = message["status"]
                    captured_response["headers"] = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    body_bytes = message.get("body", b"")
                    if "body_raw" not in captured_response:
                        captured_response["body_raw"] = body_bytes

                await send(message)

            try:
                await self.app(scope, capturing_receive, capturing_send)
            except Exception as e:
                # On exception, do NOT cache — allow retries
                raise

            # Store successful result in Redis
            if captured_response.get("status") is not None:
                try:
                    body_raw = captured_response.get("body_raw", b"")
                    result_payload = json.dumps({
                        "body": json.loads(body_raw) if body_raw else {},
                        "status": captured_response["status"],
                    })
                    await self.redis.set(
                        f"idempotent:{idempotency_key}",
                        result_payload,
                        ex=self.ttl_seconds,
                    )
                except Exception:
                    # Redis failure — fail open, don't block responses
                    pass

        else:
            await self.app(scope, receive, send)


# --- Express.js (Node.js) middleware equivalent ---
"""
function idempotencyMiddleware(redisClient, ttlSeconds = 86400) {
    return async (req, res, next) => {
        const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
        if (!writeMethods.includes(req.method)) return next();

        const idempotencyKey = req.headers["idempotency-key"];
        if (!idempotencyKey) {
            // Accept requests without key but log a warning
            console.warn(`Write request without Idempotency-Key: ${req.method} ${req.path}`);
            return next();
        }

        const cacheKey = `idempotent:${idempotencyKey}`;

        try {
            const cachedResult = await redisClient.get(cacheKey);
            if (cachedResult !== null) {
                const parsed = JSON.parse(cachedResult);
                res.set("Idempotency-Key", idempotencyKey);
                res.set("X-Idempotency-Cache", "HIT");
                return res.status(parsed.status).json(parsed.body);
            }
        } catch (err) {
            // Redis unavailable — fail open
        }

        // Capture the original json() method to intercept response body
        const originalJson = res.json.bind(res);
        res.json = function(body, status) {
            // Store in Redis asynchronously (non-blocking)
            const payload = JSON.stringify({ body, status: status || 200 });
            redisClient.setEx(cacheKey, ttlSeconds, payload).catch(() => {});
            return originalJson(body, status);
        };

        next();
    };
}
"""
```

### Pattern 3: Distributed Idempotency with Redis (Atomic Operations)

Production-grade pattern using Redis Lua scripting for atomic check-and-set operations that survive concurrent requests and network partitions.

```python
import json
import hashlib
from typing import Any

# Lua script for atomic idempotency enforcement
# Executes as a single atomic operation in Redis — no race conditions possible
IDEMPOTENCY_LUA_SCRIPT = """
local key = KEYS[1]
local result_key = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Check if result already exists for this key
local existing = redis.call('GET', key)
if existing then
    return {1, existing}  -- HIT: return cached result (status=1)
end

-- No existing result — store the incoming result with TTL
redis.call('SET', key, result_key, 'EX', ttl)
return {0, ''}             -- MISS: first execution (status=0)
"""


class RedisIdempotencyStore:
    """Distributed idempotency store backed by Redis with atomic operations.

    Uses Lua scripting to guarantee that check-and-set is atomic — the
    critical invariant that prevents duplicate execution under concurrency.

    Args:
        redis: Redis client instance (redis.asyncio.Redis or redis.Redis).
        ttl_seconds: Time-to-live for idempotency records in seconds.
        script_sha: Pre-compiled SHA1 of the Lua script (for EVALSHA fallback).
    """

    def __init__(self, redis, ttl_seconds: int = 86400):
        self.redis = redis
        self.ttl_seconds = ttl_seconds
        self._lua_script_sha: str | None = None

    async def _ensure_script(self) -> str:
        """Load the Lua script into Redis and return its SHA1 digest.

        Caches the SHA to use EVALSHA (faster, sends only 40 bytes vs full script).
        Falls back to EVAL on ScriptNotLoaded errors.
        """
        if self._lua_script_sha is None:
            self._lua_script_sha = await self.redis.script_load(IDEMPOTENCY_LUA_SCRIPT)
        return self._lua_script_sha

    async def check_and_store(
        self,
        idempotency_key: str,
        result: dict[str, Any],
    ) -> tuple[bool, dict | None]:
        """Atomically check for existing result and store new one if absent.

        This is the core operation that guarantees idempotency. It runs as a
        single atomic Redis command, so even 100 concurrent requests with the
        same key will result in exactly one handler execution.

        Args:
            idempotency_key: The unique idempotency identifier from the request.
            result: The response payload to cache (must be JSON-serializable).

        Returns:
            Tuple of (is_cached, result_payload). If is_cached is True, the
            second element contains the previously cached response. Otherwise,
            it is None and the caller should proceed with handler execution.
        """
        store_key = f"idempotent:{idempotency_key}"
        result_json = json.dumps(result)

        # Use EVALSHA for performance (script already loaded in Redis)
        sha = await self._ensure_script()
        try:
            response = await self.redis.evalsha(
                sha,
                1,  # number of KEYS
                store_key,
                result_json,
                self.ttl_seconds,
            )
        except Exception:
            # Script not loaded — fall back to EVAL
            response = await self.redis.eval(
                IDEMPOTENCY_LUA_SCRIPT,
                1,
                store_key,
                result_json,
                self.ttl_seconds,
            )

        status_code = int(response[0])
        if status_code == 1:
            # HIT: another request already stored this key
            cached = json.loads(response[1].decode()) if response[1] else None
            return True, cached
        else:
            # MISS: first request — we stored it, caller can proceed
            return False, None

    async def invalidate(self, idempotency_key: str) -> int:
        """Explicitly remove an idempotency record before TTL expiration.

        Use when a stored result is stale or incorrect (e.g., partial payment).
        The caller must retry with the same key after invalidation.

        Args:
            idempotency_key: Key to remove.

        Returns:
            Number of keys removed (0 or 1).
        """
        store_key = f"idempotent:{idempotency_key}"
        return await self.redis.delete(store_key)

    async def cleanup_expired(self, pattern: str = "idempotent:*") -> int:
        """Force-remove all matching keys. Use for maintenance or migration.

        Note: Redis TTL handles normal expiration automatically. This is only
        needed when you want to wipe the entire idempotency store (e.g., during
        a data migration or when switching storage backends).

        Args:
            pattern: Redis key glob pattern to match.

        Returns:
            Number of keys deleted.
        """
        count = 0
        async for key in self.redis.scan_iter(match=pattern, count=100):
            await self.redis.delete(key)
            count += 1
        return count


# Usage example with the store
async def handle_payment_with_idempotency(
    payment_request: dict,
    idem_store: RedisIdempotencyStore,
    payment_gateway: PaymentGateway,
):
    """Process a payment with distributed idempotency enforcement.

    Demonstrates the complete pattern: check store -> execute only on miss ->
    cache result on success. The Lua script ensures exactly-one execution
    even under high concurrency or network retries.
    """
    idem_key = payment_request["idempotency_key"]

    # Atomic check-and-store (single Redis round-trip)
    is_cached, cached_result = await idem_store.check_and_store(
        idem_key,
        {"status": "pending", "body": {}},  # placeholder — will update
    )

    if is_cached:
        return cached_result["body"], cached_result.get("status", 200)

    # Execute the actual payment (only runs once per key)
    payment = await payment_gateway.charge(payment_request)

    # Build and store the final result atomically
    result = {
        "status": 201 if payment.success else 402,
        "body": payment.to_dict(),
    }
    await idem_store.check_and_store(idem_key, result)

    return result["body"], result["status"]
```

---

### BAD vs. GOOD: Common Idempotency Mistakes

#### ❌ BAD: Using request body hash alone as the idempotency key

A client ID + body hash allows a malicious or buggy client to reuse a key with different authentication, and fails when JSON field ordering changes.

```python
# ❌ BAD — body-only hash ignores client identity and HTTP method
def bad_generate_key(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()  # No client ID, no path, no method

# Client A sends {amount: 100} with key "abc"
# Client B sends {amount: 100} with key "abc"  ← accidentally shares!
# Client A retries same request but server returns cached response without
# verifying the caller has permission to that resource
```

#### ✅ GOOD: Canonical fingerprint with method, path, client, and body

```python
# ✅ GOOD — full request context produces truly unique keys
def good_generate_key(
    client_id: str,
    method: str,
    path: str,
    query_params: dict[str, str],
    body: bytes | None = None,
) -> str:
    sorted_query = sorted(query_params.items()) if query_params else []
    body_hash = hashlib.sha256(body or b"").hexdigest()
    fingerprint = f"{method}|{path}|{'&'.join(f'{k}={v}' for k,v in sorted_query)}|{body_hash}"
    return f"{client_id}-{hashlib.sha256(fingerprint.encode()).hexdigest()[:32]}"

# Each unique (client, method, path, params, body) combination produces a distinct key
# Retries of the same request produce the same key → correct deduplication
# Different requests produce different keys → no false dedup
```

#### ❌ BAD: Using GET to read cached results (violates HTTP semantics)

```python
# ❌ BAD — using HTTP cache headers for idempotency breaks retry semantics
@app.post("/orders")
async def bad_order(request):
    key = request.headers.get("Idempotency-Key")
    # Storing in browser/shared cache → clients can't retry safely,
    # shared caches (CDN, proxies) may serve wrong responses to other users
    response = JSONResponse(content=order_data)
    response.headers["Cache-Control"] = "private"  # Wrong — this is not caching
    return response
```

#### ✅ GOOD: Dedicated idempotency store with atomic operations

```python
# ✅ GOOD — dedicated Redis-backed store with atomic Lua script
@app.post("/orders")
async def good_order(request: Request, idem_store: RedisIdempotencyStore):
    key = request.headers.get("Idempotency-Key")
    if not key:
        raise HTTPException(400, "Idempotency-Key header required for POST")

    is_cached, cached = await idem_store.check_and_store(key, {})
    if is_cached:
        resp = JSONResponse(content=cached["body"], status_code=cached["status"])
        resp.headers["X-Idempotency-Cache"] = "HIT"
        return resp

    # Execute handler — guaranteed to run once per unique key
    order = await create_order(request)
    result = {"status": 201, "body": order.to_dict()}
    await idem_store.check_and_store(key, result)
    return JSONResponse(content=result["body"], status_code=201)
```

---

## Constraints

### MUST DO
- Use atomic check-and-set operations (Redis Lua scripts or SETNX with short TTL lock) to prevent race conditions during concurrent retries
- Include the `Idempotency-Key` header in every response for client-side correlation and debugging
- Set a finite TTL on stored idempotency records (default 24 hours) — never store indefinitely
- Use canonical request fingerprints (sorted query params, consistent body serialization) to ensure retry keys match
- Fail open when Redis is unavailable: execute the handler without caching rather than blocking all requests
- Echo the `Idempotency-Key` in response headers even when returning a cached result

### MUST NOT DO
- Derive idempotency keys from only the request body — always include client identity, HTTP method, and path
- Cache failed or error responses by default — retries should re-attempt the handler unless you explicitly want to fail-fast on known errors
- Use in-memory storage for distributed systems — it breaks across process restarts and doesn't share state between service instances
- Return different status codes for the same key — `201 Created` on first call, `200 OK` on retry is acceptable only if documented; mixing `500` and `200` for the same key is a bug
- Disable idempotency checks "temporarily" for performance — this is how duplicate charges happen in production

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-versioning-strategies` | Version your API alongside idempotency changes to avoid breaking clients with stale keys |
| `rest-api-patterns` | Broader REST design patterns including proper HTTP semantics and error handling |
| `api-security-patterns` | Security considerations for idempotency key authentication and HMAC signing |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [HTTP/1.1 Semantics — RFC 9110 Section 9.2.1 (Idempotent Methods)](https://datatracker.ietf.org/doc/html/rfc9110#section-9.2.1)
- [Stripe Idempotency Documentation](https://stripe.com/docs/api/idempotent_requests)
- [AWS SDK Retry and Idempotency Guide](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retries.html)
- [Redis Lua Scripting Reference](https://redis.io/docs/manual/programmability/lua-guide/)
- [Google API Design — Idempotency Keys](https://api-guidelines.googlevine.com/#idempotent-operations)
- [Netflix ArchUnit — Testing Idempotency Constraints](https://www.archunit.org/userguide/html/000_Index.html)
- [Idempotent REST API Design Patterns — Martin Fowler](https://martinfowler.com/articles/richardsonMaturityModel.html)
