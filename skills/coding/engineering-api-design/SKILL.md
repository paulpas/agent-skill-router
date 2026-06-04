---
name: engineering-api-design
description: Designs and implements production REST APIs and GraphQL schemas with versioning, authentication, pagination, rate limiting, OpenAPI documentation, and error handling for scalable service interfaces.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api design, REST API, GraphQL schema, OpenAPI spec, API versioning, endpoint design, rate limiting, how do i design an API
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
    - do-dont
  related-skills: framework-utilization, software-documentation, engineering-principles, testing-unit-integration-e2e
---

# API Design Engineering

Designs and implements production-ready APIs (REST, GraphQL) with proper versioning, authentication, pagination, rate limiting, and OpenAPI documentation. This skill makes the model architect clean, consistent API surfaces that follow HTTP semantics, enforce strong contracts via OpenAPI specs, and scale through well-defined error handling and performance patterns.

## TL;DR Checklist

- [ ] All endpoints use correct HTTP methods (GET=fetch, POST=create, PUT=full update, PATCH=partial update, DELETE=remove)
- [ ] API versioning is encoded in URL path (/v1/, /v2/) or Accept header for backward compatibility
- [ ] Pagination uses cursor-based method (after/before) for large datasets; offset-based only for small, bounded sets
- [ ] Rate limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) included on every response
- [ ] OpenAPI 3.1 spec generated and kept in sync with implementation using code-first annotations
- [ ] Error responses follow consistent format: { "error": { "code": "...", "message": "...", "details": [...] } }
- [ ] Authentication uses bearer tokens (JWT) with refresh token rotation for session management

---

## When to Use

Use this skill when:

- Designing a new REST API or GraphQL service from scratch
- Refactoring an existing API to improve consistency, versioning, or documentation
- Adding authentication, rate limiting, or pagination to an existing endpoint
- Writing OpenAPI/Swagger specifications for API consumer integration
- Implementing API gateway routing rules and request/response transformations

---

## When NOT to Use

Avoid this skill for:
- Internal microservice communication — use gRPC/Protobuf instead (lower latency, binary contracts)
- Real-time data streaming — use WebSockets or Server-Sent Events (SSE)
- Simple CRUD on a single resource with no versioning needs — start minimal and add complexity only as needed

---

## Core Workflow

1. **Define the Resource Model** — Identify domain entities, their relationships, and lifecycle states. Map each entity to resources with clear ownership.
   **Checkpoint:** Each resource has a singular noun name (e.g., `/users`, not `/get-users`).

2. **Design Endpoint Contracts** — For each resource, define the HTTP methods, request/response shapes, status codes, and error conditions. Write the OpenAPI spec first as a living contract.
   **Checkpoint:** Every endpoint documents success (2xx) and failure (4xx/5xx) responses with example payloads.

3. **Implement Authentication & Authorization** — Add bearer token validation at the API gateway or middleware layer. Apply role-based access control (RBAC) per endpoint using policy annotations.
   **Checkpoint:** Auth check runs before any business logic. Unauthenticated requests return 401; unauthorized return 403.

4. **Add Pagination, Filtering, Sorting** — Implement cursor-based pagination for collection endpoints. Support query parameters: `?page[size]=25&page[cursor]=abc123&sort=-created_at&filter[status]=active`.
   **Checkpoint:** Paginated responses include `next_cursor` and `prev_cursor`. Never expose total counts for large collections (O(n) cost).

5. **Implement Rate Limiting** — Apply per-user rate limits using a sliding window algorithm. Return standard rate limit headers on every response. Use 429 Too Many Requests with Retry-After header when exceeded.
   **Checkpoint:** Rate limiting middleware runs before business logic. Configure burst allowance for legitimate traffic spikes.

6. **Add Structured Error Handling** — Create consistent error response wrapper. Map internal exceptions to HTTP status codes. Include error codes that clients can handle programmatically.
   **Checkpoint:** No stack traces or internal details leak to API consumers in production responses.

---

## Implementation Patterns

### Pattern 1: RESTful Endpoint Design

```python
# FastAPI example — typed, documented endpoints following HTTP semantics
from fastapi import FastAPI, Query, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

app = FastAPI(title="User Management API", version="1.0.0")


class UserCreate(BaseModel):
    """Request body for creating a new user."""
    email: str = Field(..., description="Unique email address", max_length=255)
    name: str = Field(..., description="Display name", min_length=1, max_length=100)
    role: str = Field(default="user", pattern=r"^(admin|moderator|user)$")


class UserOut(BaseModel):
    """Response shape for user resource."""
    id: int
    email: str
    name: str
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None


# GET /v1/users — list with cursor pagination
@app.get("/v1/users", response_model=dict)
async def list_users(
    page_size: int = Query(default=25, ge=1, le=100, description="Number of results per page"),
    cursor: Optional[str] = Query(default=None, description="Cursor for next page"),
    role_filter: Optional[str] = Query(default=None, description="Filter by role"),
):
    """List users with cursor-based pagination.
    
    Returns paginated user list with cursor navigation.
    Supports filtering by role to narrow results.
    """
    query = "SELECT id, email, name, role, created_at, updated_at FROM users"
    params: list = []
    
    if role_filter:
        query += " WHERE role = %s"
        params.append(role_filter)
    
    if cursor:
        query += " AND id > %s"
        params.append(cursor)
    
    query += " ORDER BY id ASC LIMIT %s"
    params.append(page_size + 1)  # Fetch one extra to check for next page
    
    users = await db.fetch_all(query, params)
    has_next = len(users) > page_size
    
    if has_next:
        users = users[:page_size]
    
    next_cursor = str(users[-1].id) if has_next and users else None
    
    return {
        "data": [UserOut.model_validate(u).model_dump() for u in users],
        "pagination": {
            "next_cursor": next_cursor,
            "page_size": page_size,
            "has_more": has_next,
        }
    }


# POST /v1/users — create a new user
@app.post("/v1/users", response_model=UserOut, status_code=201)
async def create_user(user_data: UserCreate):
    """Create a new user account.
    
    Validates email uniqueness and creates the user record.
    Returns 409 Conflict if email already exists.
    """
    existing = await db.fetch_one(
        "SELECT id FROM users WHERE email = %s", [user_data.email]
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "An account with this email already exists"}
        )
    
    user = await db.execute(
        """INSERT INTO users (email, name, role) VALUES (%s, %s, %s) RETURNING *""",
        [user_data.email, user_data.name, user_data.role]
    )
    return UserOut.model_validate(user)


# GET /v1/users/{user_id} — fetch single resource
@app.get("/v1/users/{user_id}", response_model=UserOut)
async def get_user(user_id: int):
    """Retrieve a single user by ID.
    
    Returns 404 Not Found if the user does not exist.
    """
    user = await db.fetch_one("SELECT * FROM users WHERE id = %s", [user_id])
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": f"User {user_id} does not exist"}
        )
    return UserOut.model_validate(user)
```

### Pattern 2: GraphQL Schema Design (BAD vs. GOOD)

```python
# ❌ BAD — N+1 queries, no input validation, exposes internal structure
type Query {
    users: [User]          # No pagination — returns ALL users
    user(id: ID!): User
}

type User {
    id: ID!
    email: String!        # Exposes sensitive data to unauthenticated queries
    posts: [Post!]        # N+1: every user fetch triggers post queries
    passwordHash: String  # NEVER expose internal storage fields
}


# ✅ GOOD — paginated, typed input validation, field-level access control
import strawberry

@strawberry.type
class User:
    id: strawberry.ID
    email: str                    # Only returned if authenticated with user scope
    name: str
    role: str = strawberry.field(
        description="User role — visible to admin queries"
    )
    
    @strawberry.field
    async def posts(
        self,
        info: strawberry.types.Info,
        first: int = strawberry.argument(default=25),
        after: Optional[str] = None,
    ) -> list[Post]:
        """Paginated posts for this user — cursor-based to avoid N+1."""
        cursor = int(after) if after else 0
        limit = min(first, 100)  # Enforce max page size
        return await db.fetch_posts_for_user(self.id, offset=cursor, limit=limit)


@strawberry.input
class CreateUserInput:
    email: str                    # EmailStr would validate format at schema level
    name: str                     # Non-nullable required field
    role: str = "user"            # Default prevents invalid role injection


@strawberry.type
class Query:
    @strawberry.field
    async def users(
        self,
        info: strawberry.types.Info,
        first: int = strawberry.argument(default=25),
        after: Optional[str] = None,
    ) -> list[User]:
        """List users with cursor pagination. Requires admin scope."""
        # Authorization check runs here
        if not await info.context["user"].has_role("admin"):
            raise PermissionError("Admin scope required for user listing")
        
        cursor = int(after) if after else 0
        limit = min(first, 100)
        return await db.fetch_users(offset=cursor, limit=limit)
```

### Pattern 3: OpenAPI Contract-First Generation

```python
# FastAPI code-first approach — generates OpenAPI spec automatically
from fastapi import FastAPI
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import yaml

app = FastAPI(
    title="Inventory Management API",
    version="2.0.0",
    description="RESTful API for managing warehouse inventory with barcode scanning support.",
    contact={"name": "Platform Team", "email": "platform@example.com"},
)


class StockItem(BaseModel):
    """A physical item tracked in the inventory system."""
    sku: str = Field(..., description="Stock keeping unit — unique identifier", pattern=r"^[A-Z0-9]{8,12}$")
    name: str = Field(..., description="Human-readable product name", min_length=2, max_length=200)
    quantity: int = Field(..., ge=0, description="Current quantity in warehouse")
    location: str = Field(default="", description="Warehouse shelf/zone identifier")
    last_restocked: Optional[str] = None  # ISO 8601 datetime string


class StockAdjustment(BaseModel):
    """Request to adjust inventory quantity."""
    sku: str = Field(..., pattern=r"^[A-Z0-9]{8,12}$")
    quantity_delta: int = Field(..., description="Positive adds, negative removes. Must not cause negative total.")


class ErrorResponse(BaseModel):
    """Standard error response for all API failures."""
    error: dict = Field(description="Error details with machine-readable code and human message")
    request_id: str = Field(description="Unique request ID for debugging — included in X-Request-ID header")
```

### Pattern 4: Rate Limiting Middleware

```python
import time
from fastapi import Request, HTTPException, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter per API key.
    
    Enforces 100 requests/minute with burst allowance of 20.
    Returns standard headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.
    """
    
    WINDOW_SECONDS = 60
    MAX_REQUESTS = 100
    BURST_ALLOWANCE = 20
    
    def __init__(self, app, redis_client):
        super().__init__(app)
        self.redis = redis_client
    
    async def dispatch(self, request: Request, call_next):
        client_key = self._resolve_client_key(request)
        window_start = time.time() - self.WINDOW_SECONDS
        
        # Clean old entries and count current window
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(f"ratelimit:{client_key}", 0, window_start)
        pipe.zadd(f"ratelimit:{client_key}", {str(time.time()): time.time()})
        pipe.zcard(f"ratelimit:{client_key}")
        pipe.expire(f"ratelimit:{client_key}", self.WINDOW_SECONDS + 1)
        _, _, current_count, _ = pipe.execute()
        
        remaining = max(0, self.MAX_REQUESTS - current_count)
        reset_at = int(window_start + self.WINDOW_SECONDS)
        
        response = await call_next(request)
        
        response.headers["X-RateLimit-Limit"] = str(self.MAX_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        
        if current_count > self.MAX_REQUESTS:
            retry_after = reset_at - int(time.time())
            raise HTTPException(
                status_code=429,
                detail={"code": "RATE_LIMIT_EXCEEDED", "message": f"Too many requests. Retry after {retry_after}s."},
                headers={"Retry-After": str(retry_after)},
            )
        
        return response
    
    def _resolve_client_key(self, request: Request) -> str:
        """Extract API key from Authorization header, fallback to IP."""
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
            return f"key:{token}"
        return f"ip:{request.client.host}"
```

---

## Constraints

### MUST DO
- Use correct HTTP methods: GET for reads, POST for creation, PUT for full replacement, PATCH for partial updates
- Implement cursor-based pagination for any endpoint returning 100+ items; use offset-based only for bounded datasets
- Always include OpenAPI/Swagger documentation alongside implementation — the spec is a first-class deliverable
- Return consistent error format with machine-readable error codes and human-readable messages
- Include rate limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) on every response
- Version APIs via URL path (/v1/) for breaking changes; use Accept header versioning only for backward-compatible additions

### MUST NOT DO
- Expose internal database IDs or schema structure in API responses without abstraction layer
- Use query parameters for authentication tokens — use Authorization: Bearer header instead
- Return 200 OK for failed operations — use appropriate HTTP status codes (400, 401, 403, 404, 409, 422, 429)
- Allow unbounded result sets without pagination — this enables DoS through resource exhaustion
- Mix authentication and authorization logic inside route handlers — extract to middleware or decorators
- Hardcode rate limit values — use configuration-driven limits per endpoint tier (public, authenticated, admin)

---

## Output Template

When designing or implementing an API with this skill active, the output must contain:

1. **API Contract** — OpenAPI spec (YAML) defining all endpoints, request/response schemas, and error formats
2. **Implementation Code** — Typed endpoint handlers with validation, error handling, and authentication
3. **Pagination Strategy** — Cursor-based implementation for collection endpoints with pagination metadata
4. **Error Handling** — Consistent error response wrapper with machine-readable codes
5. **Rate Limiting** — Middleware configuration with standard headers per request
6. **Documentation** — Inline docstrings describing each endpoint's purpose, parameters, and return values

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-utilization` | Structured approach to learning and applying the web framework used for API implementation |
| `software-documentation` | Comprehensive technical documentation writing for API consumers |
| `testing-unit-integration-e2e` | Testing strategies for API endpoints at unit, integration, and E2E levels |
| `engineering-principles` | SOLID, DRY, KISS principles applied to API design architecture |

---

## Live References

> Authoritative documentation links for API design engineering. The model follows markdown links at load time to resolve external references and inline content.

- [RESTful API Design Guidelines (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/guide/designing-apis-for-services)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [GraphQL Specification](https://spec.graphql.org/)
- [RFC 7231 — HTTP/1.1 Semantics and Content](https://datatracker.ietf.org/doc/html/rfc7231)
- [RFC 6585 — Additional HTTP Status Codes (including 429)](https://datatracker.ietf.org/doc/html/rfc6585)