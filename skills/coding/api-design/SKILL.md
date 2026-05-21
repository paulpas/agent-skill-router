---
name: api-design
description: Implements modern API design patterns (RESTful resource modeling, GraphQL schema design, gRPC service contracts) with consistent error handling, rate limiting, and versioning strategies for production backend systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api design, restful api, graphql schema, gRPC service, openapi specification, versioning strategy, rate limiting, backend architecture, API architecture, microservices interface
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: async-programming, automated-testing
---

# API Design Architect

I design and implement production-grade API interfaces across REST, GraphQL, and gRPC paradigms. When I am loaded, I enforce contract-first design, consistent error envelopes, structured validation, rate limiting, and versioning strategies that keep backend systems maintainable and developer-friendly.

## TL;DR Checklist

- [ ] Write the API contract (OpenAPI, SDL, or Protobuf) before any handler code
- [ ] Model resources around nouns with predictable plural paths (`/users`, `/orgs/{id}/projects`)
- [ ] Return a unified error envelope: `{ "error": { "code": "...", "message": "...", "details": [] } }` on every failure path
- [ ] Validate all inputs with Pydantic v2 models (or equivalent) before they reach business logic
- [ ] Apply rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) to every response
- [ ] Version APIs via URI prefix (`/v1/`) and emit `Deprecation` / `Sunset` headers when introducing new versions
- [ ] Ensure write operations are idempotent (PUT, DELETE) or explicitly documented as non-idempotent (POST)

---

## When to Use

Use this skill when:

- Designing a new RESTful web service, GraphQL API, or gRPC microservice from scratch
- Refactoring an existing API to improve consistency in error formats, naming conventions, or pagination
- Adding missing concerns — rate limiting, structured validation, versioning — to an unversioned API
- Conducting an API design review before a team ships new endpoints
- Defining service contracts for inter-microservice communication via gRPC or internal REST
- Writing OpenAPI / Protobuf specifications that multiple teams will implement against

---

## When NOT to Use

Avoid this skill for:

- CLI argument parsing and terminal output formatting — use `markdown-best-practices` or domain-specific CLI patterns instead
- Internal event-driven architectures (Kafka topics, message queues) — focus on schema registry and event sourcing patterns
- Frontend component design or CSS styling — use the `frontend-philosophy` skill for UI concerns

---

## Core Workflow

1. **Define Contract First** — Write the OpenAPI/Swagger YAML, GraphQL SDL, or Protobuf `.proto` file before writing any handler code. All teams implement against the contract. **Checkpoint:** Validate spec with `oapi-codegen`, `openapi-generator`, or `buf` to confirm no circular dependencies or type errors.

2. **Model Resources Around Nouns** — Never design endpoints around verbs. Use consistent plural resource names (`/users`, `/orders/{id}/line-items`). Nest only to express ownership boundaries, not for convenience. **Checkpoint:** Every HTTP method maps to a standard action: GET→read, POST→create, PUT→replace, PATCH→partial update, DELETE→remove.

3. **Implement Consistent Error Format** — Define a single JSON schema for all error responses with `error_code` (machine-readable), `message` (human-readable), and optional `details` (field-level or contextual). Every endpoint — success or failure — must conform to this envelope. **Checkpoint:** Run a test suite that asserts every endpoint returns the same top-level error structure, regardless of exception type.

4. **Add Validation & Serialization Layer** — Use Pydantic v2 `BaseModel` classes (Python) or equivalent typed structs (Go) for request/response schemas. Place validation at the boundary so handlers receive pre-validated data. **Checkpoint:** Invalid payloads are rejected by the middleware layer with 422 before any business logic executes.

5. **Apply Rate Limiting & Auth Middleware** — Per-client rate limits with sliding windows, JWT or API-key auth on protected routes. Always include `X-RateLimit-*` and `Retry-After` headers in responses. **Checkpoint:** Intercept a burst of 150 requests against a 100/60s limit and verify the 101st returns 429 with correct header values.

6. **Version Strategically** — Prefer URI path versioning (`/v1/users`) for public APIs (discoverable, cache-friendly). For internal APIs, consider header-based versioning. Never break backward compatibility within a major version. Emit `Deprecation` and `Sunset` headers when deprecating old versions. **Checkpoint:** When introducing v2, the v1 routes continue serving production traffic with deprecation headers attached.

---

## Implementation Patterns

### Pattern 1: RESTful Resource Modeling with FastAPI & Pydantic v2

Define resources as Pydantic models and map HTTP methods to CRUD operations using FastAPI route decorators. The spec drives generation of type-safe client SDKs.

```python
# ❌ BAD — verb-based routes, no input validation, inconsistent error shapes
@app.post("/createUser")
def create_user():
    data = request.get_json()
    if not data.get("email"):
        return {"error": "Email required"}, 400
    user = User(data)
    db.save(user)
    return user.to_dict(), 201

@app.get("/getUser")
def get_user():
    uid = request.args["id"]
    user = db.query("SELECT * FROM users WHERE id = $1", uid).first()
    if not user:
        return {"message": "not found"}, 404   # Different key name — inconsistent
    return user.to_dict(), 200


# ✅ GOOD — noun-based resources, Pydantic v2 validation, unified error envelope
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

app = FastAPI(title="Resource API", version="1.0.0")


# --- Models (Contract-first: these would be generated from OpenAPI spec) ---
class UserCreate(BaseModel):
    """Request body for creating a new user."""
    email: EmailStr
    name: str = Field(min_length=1, max_length=128)
    role: Optional[str] = Field(default="member", pattern=r"^(admin|member|viewer)$")


class UserResponse(BaseModel):
    """Standard response body for user resources."""
    id: int
    email: EmailStr
    name: str
    role: str
    created_at: str  # ISO 8601

    model_config = {"from_attributes": True}


class ErrorDetail(BaseModel):
    """Field-level or contextual error detail."""
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """Unified error envelope returned by every endpoint on failure."""
    error_code: str
    message: str
    details: list[ErrorDetail] = []
    request_id: Optional[str] = None


# --- Routes (plural nouns, standard HTTP methods) ---
@app.get("/v1/users/{user_id}", response_model=UserResponse, status_code=200)
async def get_user(user_id: int):
    """Retrieve a single user by ID."""
    user = await db.fetch_user(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "USER_NOT_FOUND",
                "message": f"No user exists with id={user_id}",
                "details": [{"field": "user_id", "message": "Identifier does not match any record"}],
            },
        )
    return user


@app.post("/v1/users", response_model=UserResponse, status_code=201)
async def create_user(body: UserCreate):
    """Create a new user. Request body is validated by Pydantic v2 before handler runs."""
    existing = await db.fetch_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "DUPLICATE_EMAIL",
                "message": f"A user with email '{body.email}' already exists",
                "details": [{"field": "email", "message": "Email must be unique"}],
            },
        )
    user = await db.create_user(body.model_dump())
    return user


@app.put("/v1/users/{user_id}", response_model=UserResponse, status_code=200)
async def update_user(user_id: int, body: UserCreate):
    """Full replacement of a user resource (idempotent)."""
    await db.fetch_user(user_id)  # 404 if not found
    user = await db.update_user(user_id, body.model_dump())
    return user


@app.delete("/v1/users/{user_id}", status_code=204)
async def delete_user(user_id: int):
    """Remove a user resource. Returns 204 No Content on success."""
    deleted = await db.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error_code": "USER_NOT_FOUND", "message": f"User {user_id} not found"})
```

### Pattern 2: Structured Error Handling Middleware

Centralized exception handling ensures every endpoint returns the same error envelope shape regardless of which layer throws.

```python
# ❌ BAD — ad-hoc error responses scattered across handlers, inconsistent keys and status codes
@app.route("/orders")
def create_order():
    try:
        data = request.json
        if not data.get("product_id"):
            return json.dumps({"error": "missing product"}), 400
        order = Order(data)
        db.session.add(order)
        db.session.commit()
        return json.dumps({"id": order.id}), 201  # Returns 201 even though key is flat
    except ValueError as e:
        return json.dumps({"msg": str(e)}), 422   # Different key, different status
    except Exception as e:
        return json.dumps({"message": "something broke", "trace": str(e)}), 500  # Exposes internals


# ✅ GOOD — centralized exception handler with unified envelope, no leak of internals
from contextlib import suppress

class AppError(Exception):
    """Base class for application-level errors that map to HTTP responses."""
    def __init__(self, error_code: str, message: str, status_code: int = 400, details: list[dict] | None = None):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or []

class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            error_code=f"{resource.upper()}_NOT_FOUND",
            message=f"The requested {resource} was not found",
            status_code=404,
            details=[{"field": "id", "message": f"No {resource} with the given identifier"}],
        )

class ValidationAppError(AppError):
    def __init__(self, field_errors: list[dict]):
        super().__init__(
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            status_code=422,
            details=field_errors,
        )

class InternalAppError(AppError):
    def __init__(self, cause: Exception | None = None):
        super().__init__(
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please contact support with the request ID.",
            status_code=500,
        )
        if cause:
            logger.exception("Unhandled exception in request handler", exc_info=cause)

def build_error_response(app_error: AppError, request_id: str | None = None) -> tuple[dict, int]:
    """Convert any AppError to the unified error envelope."""
    response_body = {
        "error_code": app_error.error_code,
        "message": app_error.message,
        "details": app_error.details,
    }
    if request_id:
        response_body["request_id"] = request_id
    return response_body, app_error.status_code

# FastAPI exception handler registration
@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError):
    request_id = getattr(request.state, "request_id", None)
    body, status = build_error_response(exc, str(request_id))
    return JSONResponse(status_code=status, content=body)

# Usage in endpoint — throw typed errors, let the handler format the response
@app.post("/v1/orders")
async def create_order(body: OrderCreate):
    if not body.product_id:
        raise ValidationAppError([{"field": "product_id", "message": "Product ID is required"}])

    try:
        order = await order_service.create(body.model_dump())
        return order, 201
    except ProductNotFoundError as e:
        raise NotFoundError("product", str(e.product_id))
    except InventoryError as e:
        raise ValidationAppError([{"field": "quantity", "message": f"Insufficient inventory: {e.available} available"}])
```

### Pattern 3: Rate Limiting & Auth Middleware

Token-bucket rate limiter with Redis-style per-client tracking, integrated into the request lifecycle.

```python
# ✅ GOOD — in-memory token bucket with sliding window and standard headers
import time
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class RateLimitConfig:
    max_requests: int = 100          # Allow this many requests per window
    window_seconds: int = 60         # Window duration in seconds
    burst_multiplier: float = 1.5    # Allow burst up to 1.5x the rate

class TokenBucketLimiter:
    """Token-bucket rate limiter for API endpoints."""

    def __init__(self, config: RateLimitConfig | None = None):
        self.config = config or RateLimitConfig()
        self._buckets: dict[str, list[float]] = {}
        self._lock = Lock()

    def _clean_bucket(self, client_id: str, now: float) -> None:
        """Remove timestamps outside the current sliding window."""
        cutoff = now - self.config.window_seconds
        if client_id in self._buckets:
            self._buckets[client_id] = [t for t in self._buckets[client_id] if t > cutoff]

    def allow(self, client_id: str) -> tuple[bool, dict[str, str]]:
        """Check whether a request is allowed and return rate limit headers."""
        now = time.time()

        with self._lock:
            self._clean_bucket(client_id, now)
            bucket = self._buckets.setdefault(client_id, [])

            max_burst = int(self.config.max_requests * self.config.burst_multiplier)

            if len(bucket) >= max_burst:
                reset_time = int((bucket[0] + self.config.window_seconds))
                return False, {
                    "X-RateLimit-Limit": str(self.config.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(max(1, reset_time - int(now))),
                }

            bucket.append(now)
            remaining = max(0, self.config.max_requests - len(bucket))
            reset_time = int(now + self.config.window_seconds)

            return True, {
                "X-RateLimit-Limit": str(self.config.max_requests),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_time),
            }


# --- JWT Auth Dependency (FastAPI) ---
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def verify_jwt(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    """Validate Bearer token and return decoded payload. Raises 401 on failure."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail={"error_code": "UNAUTHORIZED", "message": "Missing authentication token"})

    try:
        import jwt
        payload = jwt.decode(credentials.credentials, options={"verify_aud": False})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={"error_code": "TOKEN_EXPIRED", "message": "Authentication token has expired"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail={"error_code": "INVALID_TOKEN", "message": "Malformed authentication token"})


# --- Middleware integration ---
limiter = TokenBucketLimiter(RateLimitConfig(max_requests=100, window_seconds=60))

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.headers.get("X-API-Key", request.client.host)
    allowed, headers = limiter.allow(client_id)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"error_code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Retry after the window resets."},
            headers=headers,
        )

    response = await call_next(request)
    for key, value in headers.items():
        response.headers[key] = value
    return response
```

---

## Constraints

### MUST DO

- Write the API contract (OpenAPI YAML, GraphQL SDL, or Protobuf) before implementing any handler code; generate type-safe clients from it
- Model every resource around plural nouns with predictable paths (`/users`, `/orgs/{id}/projects`) and map HTTP methods to standard CRUD actions
- Return a unified error envelope on every failure path containing `error_code`, `message`, and optional `details` fields — never ad-hoc JSON shapes
- Validate all incoming request bodies with typed schema models (Pydantic v2, Zod, Go structs) before they reach business logic
- Attach rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) to every single response, including errors
- Version public APIs via URI path prefix (`/v1/`) and emit `Deprecation` / `Sunset` headers when introducing successor versions
- Ensure DELETE and PUT operations are idempotent; document POST as non-idempotent with client-side deduplication keys

### MUST NOT DO

- Expose raw exception messages, stack traces, SQL queries, or file paths in any client-facing response
- Design endpoints around verbs (`/getUser`, `/createOrder`) — REST is resource-oriented, not action-oriented
- Return `200 OK` for all success cases regardless of operation type (use `201 Created`, `204 No Content` appropriately)
- Use offset-based pagination on unbounded or frequently-mutated collections (causes item drift and N+1 performance problems)
- Embed business logic directly in route handlers without a service/repository layer separation
- Remove rate limiting headers from error responses — clients depend on them for graceful backoff strategies
- Mix v1 and v2 route implementations; keep versions in separate blueprint modules with clear deprecation timelines

---

## Output Template

When implementing or reviewing API design, produce the following artifacts:

1. **API Contract Document** — OpenAPI 3.1 YAML, GraphQL SDL, or Protobuf `.proto` file with all endpoints, types, and error schemas defined before implementation
2. **Resource Model Diagram** — ASCII art or structured list showing resources, their URIs, nested relationships, and ownership boundaries
3. **Error Envelope Schema** — Exact JSON shape for success and error responses, including all `error_code` values with their business meaning
4. **HTTP Method Mapping Table** — For each resource: which HTTP methods are supported, their semantics, idempotency guarantees, and expected status codes
5. **Rate Limit & Auth Configuration** — Per-tier limits (anonymous, authenticated, premium), window sizes, header formats, and authentication mechanisms supported

---

## Live References

| Resource | URL |
|----------|-----|
| FastAPI Documentation | https://fastapi.tiangolo.com/ |
| Pydantic v2 Documentation | https://docs.pydantic.dev/latest/ |
| OpenAPI Specification 3.1 | https://spec.openapis.org/oas/v3.1.0 |
| HTTP Semantics RFC 9110 | https://www.rfc-editor.org/rfc/rfc9110 |
| GraphQL Best Practices (Apollo) | https://the-guild.dev/blog/best-practices-for-designing-a-grpc-api |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `async-programming` | Implement async I/O patterns in API handlers for high-throughput endpoints |
| `automated-testing` | Generate contract tests, integration tests, and load tests for API endpoints |
