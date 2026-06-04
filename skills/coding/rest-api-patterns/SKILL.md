---




name: rest-api-patterns
description: Implements RESTful API design patterns including resource modeling, HTTP
  method dispatching, structured error responses per RFC 7807, pagination, filtering,
  versioning, and HATEOAS for production-quality APIs.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: REST API, RESTful design, RFC 7807, HTTP methods, API versioning, HATEOAS,
    pagination
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
  related-skills: fastapi-patterns, grpc-patterns, code-validation, input-validation,
    frontend-api-integration-patterns




---




# REST API Design Patterns

Implements production-grade RESTful API design following Richardson Maturity Model Level 2+ principles. Models resources as named entities with proper HTTP method dispatching, structured error responses per RFC 7807 Problem Details, consistent pagination and filtering conventions, explicit versioning strategies, HATEOAS hypermedia links where beneficial, and authentication/authorization patterns that integrate cleanly with the resource model.

## TL;DR Checklist

- [ ] Name resources with plural nouns (e.g., `/users`, not `/getUser`)
- [ ] Use correct HTTP methods: GET for reads, POST for creation, PUT for full replace, PATCH for partial update, DELETE for removal
- [ ] Return appropriate 2xx/4xx/5xx status codes — never return 200 for errors
- [ ] Format error responses as RFC 7807 Problem Details objects with `type`, `title`, `status`, and `detail` fields
- [ ] Paginate all collection endpoints; prefer cursor-based pagination for large datasets, offset-based for simple cases
- [ ] Support filtering with query parameters (e.g., `?status=active&role=admin`) and sorting with `?sort=-created_at,name`
- [ ] Version the API explicitly (prefer URL path `/v1/` or Accept header media type)
- [ ] Include HATEOAS `_links` in resource responses where navigation state machines are useful
- [ ] Require authentication on all endpoints; apply authorization checks at the resource level

---

## When to Use

Use this skill when:

- Designing a new REST API from scratch and you want a proven, consistent pattern
- Refactoring an existing API that uses inconsistent status codes, error formats, or resource naming
- Adding pagination, filtering, or sorting support to collection endpoints
- Implementing proper RFC 7807 structured error responses across all API layers
- Deciding between URL path versioning (`/v1/users`) and media-type versioning (`Accept: application/vnd.api.v1+json`)
- Building HATEOAS-enabled APIs where clients need discoverable navigation beyond static documentation
- Integrating authentication/authorization middleware into REST resource handlers

---

## When NOT to Use

Avoid this skill for:

- GraphQL API design — use `grpc-patterns` or GraphQL-specific guidance instead
- Internal microservice-to-microservice communication where gRPC is preferred (lower latency, strong typing)
- Simple key-value stores or monolithic CRUD apps that don't need the full REST model complexity
- WebSocket-based real-time APIs — use event-driven patterns instead
- When you only have one resource type and no relationships — a single endpoint may not warrant full REST modeling

---

## Core Workflow

1. **Define Resource Model** — Identify all noun-based resources, their attributes, and relationships. Resources must be named with plural nouns. Each resource needs a unique identifier (UUID or integer). **Checkpoint:** Every resource has a clear URI pattern like `/api/v1/{resource}` for collections and `/api/v1/{resource}/{id}` for members.

2. **Map HTTP Methods to Operations** — For each resource, decide which methods apply: GET (retrieve/list), POST (create), PUT (full replace), PATCH (partial update), DELETE (remove). **Checkpoint:** Verify idempotency requirements — PUT and DELETE must be safe to retry; POST is not idempotent.

3. **Design Response Contracts** — Define the shape of successful responses (resource objects, wrapped collections) and error responses (RFC 7807 Problem Details). **Checkpoint:** Every response has a consistent envelope; errors always return 4xx/5xx with structured bodies, never 200.

4. **Implement Pagination & Filtering** — Add query parameter support for pagination (`page`, `limit`, or `cursor`), filtering (field=value pairs), and sorting (`sort=field,-other`). **Checkpoint:** Collection responses include metadata: total count, page info, or cursor tokens.

5. **Apply Versioning Strategy** — Choose versioning approach: URL path (`/v1/`), Accept header media type, or query parameter. Document the choice and enforce it at the router level. **Checkpoint:** Backward-compatible changes do not require a new version; breaking changes increment the major version.

6. **Add HATEOAS Links (Optional but Recommended)** — Include `_links` arrays in resource responses that describe related resources and possible next actions. **Checkpoint:** Links use relation-type identifiers (`self`, `parent`, `orders`, `update`) following IANA link relations.

7. **Integrate Authentication & Authorization** — Apply auth middleware at the router level (JWT, API keys, OAuth2) and authorization logic at the resource/handler level (RBAC, ABAC, ownership checks). **Checkpoint:** Unauthenticated requests return 401; unauthorized requests return 403. Never reveal existence of resources through different error messages for 401 vs 404.

---

## Implementation Patterns

### Pattern 1: RFC 7807 Problem Details Error Responses (BAD vs. GOOD)

The RFC 7807 standard defines a consistent error response format with `type`, `title`, `status`, `detail`, and optional `instance` fields. Never return raw `{ "error": "something went wrong" }` bodies — clients cannot reliably parse them, and they violate REST conventions.

```python
# ❌ BAD: Generic JSON error — no structure, no machine-readable type, no standard status mapping
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        return {"error": "User not found"}  # Returns HTTP 200 — wrong status, wrong format
    return user

# ✅ GOOD: Structured Problem Details responses with proper HTTP status codes
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional


class ProblemDetails(BaseModel):
    """RFC 7807 Problem Details response envelope."""
    type: str
    title: str
    status: int
    detail: Optional[str] = None
    instance: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "type": "https://api.example.com/errors/not-found",
                "title": "Resource Not Found",
                "status": 404,
                "detail": "No user found with ID 42",
                "instance": "/api/v1/users/42"
            }
        }


class APIErrorHandler:
    """Convert domain errors to RFC 7807 Problem Details."""

    @staticmethod
    def not_found(resource: str, identifier: str) -> tuple[dict, int]:
        body = ProblemDetails(
            type=f"https://api.example.com/errors/not-found",
            title="Resource Not Found",
            status=404,
            detail=f"No {resource} found with ID {identifier}",
            instance=f"/api/v1/{resource}s/{identifier}"
        )
        return body.model_dump(), 404

    @staticmethod
    def validation_error(errors: list[dict]) -> tuple[dict, int]:
        body = ProblemDetails(
            type="https://api.example.com/errors/validation-failed",
            title="Validation Failed",
            status=422,
            detail=f"{len(errors)} field(s) failed validation"
        )
        return body.model_dump(), 422

    @staticmethod
    def conflict(detail: str) -> tuple[dict, int]:
        body = ProblemDetails(
            type="https://api.example.com/errors/conflict",
            title="Conflict",
            status=409,
            detail=detail
        )
        return body.model_dump(), 409


# Usage in handlers — always return proper status + structured error
@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if not user:
        body, status = APIErrorHandler.not_found("user", str(user_id))
        raise HTTPException(status_code=status, detail=body)
    return user
```

### Pattern 2: Resource Modeling with Plural Nouns and HTTP Method Dispatching

Resources are always named with plural nouns. The router maps HTTP methods to operations based on the URI pattern and verb used. This creates a predictable, self-documenting API surface.

```python
# ❌ BAD: Verb-based resource names — mixes operations into resource naming
# GET  /getUser/42       — "get" should be implied by HTTP method
# POST /createUser       — creation is a standard operation on a collection
# DELETE /deleteUser/42  — "delete" is redundant with HTTP DELETE

# ✅ GOOD: Noun-based resources with HTTP methods as operations
from fastapi import FastAPI, APIRouter, Depends, Query, Header
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


app = FastAPI(title="Example REST API", version="1.0.0")
router = APIRouter(prefix="/api/v1/users", tags=["users"])


# --- Resource Model (Member) ---
class User(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique user identifier")
    email: str = Field(..., min_length=5, max_length=255)
    name: str = Field(..., min_length=1, max_length=100)
    status: str = Field(default="active", pattern=r"^(active|suspended|deleted)$")
    role: str = Field(default="user", pattern=r"^(user|admin|moderator)$")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "email": "alice@example.com",
                "name": "Alice Smith",
                "status": "active",
                "role": "admin",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


# --- Collection Pagination Envelope ---
class PaginatedResponse(BaseModel):
    """Wraps a collection with pagination metadata."""
    items: list[User]
    total: int
    page: int
    per_page: int
    _links: dict = {
        "self": "/api/v1/users?page=1&per_page=20",
        "next": Optional[str] = None,
        "first": "/api/v1/users?page=1&per_page=20",
        "last": "/api/v1/users?page=5&per_page=20"
    }


# --- HTTP Method Dispatching ---

@router.get("/", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: Optional[str] = Query(None, description="Filter by status: active, suspended, deleted"),
    role: Optional[str] = Query(None, description="Filter by role: user, admin, moderator"),
    sort: str = Query("created_at", description="Sort field, prefix with - for descending (e.g., -name)"),
    accept: str = Header("application/json"),
):
    """List users with filtering, sorting, and pagination.

    GET /api/v1/users?page=1&per_page=20&status=active&sort=-created_at
    Returns 200 with paginated user collection.
    """
    offset = (page - 1) * per_page
    users = await query_users(limit=per_page, offset=offset, status=status, sort=sort)
    total = await count_users(status=status)

    return {
        "items": users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "_links": {
            "self": f"/api/v1/users?page={page}&per_page={per_page}",
            "first": f"/api/v1/users?page=1&per_page={per_page}",
            "last": f"/api/v1/users?page={(total + per_page - 1) // per_page}&per_page={per_page}"
        }
    }


@router.post("/", response_model=User, status_code=201)
async def create_user(user: User):
    """Create a new user.

    POST /api/v1/users
    Request body: { "email": "...", "name": "..." }
    Returns 201 Created with the created resource.
    """
    # Authorization check — only admins can create users
    require_role("admin")
    return await save_user(user)


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: uuid.UUID):
    """Retrieve a single user by ID.

    GET /api/v1/users/{user_id}
    Returns 200 with resource or 404 if not found.
    """
    user = await find_user(user_id)
    if not user:
        body, status = APIErrorHandler.not_found("user", str(user_id))
        raise HTTPException(status_code=status, detail=body)
    return user


@router.put("/{user_id}", response_model=User)
async def replace_user(user_id: uuid.UUID, user: User):
    """Full replacement of a user resource (idempotent).

    PUT /api/v1/users/{user_id}
    Request body must contain ALL fields.
    Returns 200 with updated resource or 404 if not found.
    """
    require_role("admin")
    return await save_user(user)


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: uuid.UUID, updates: dict):
    """Partial update of a user resource (idempotent).

    PATCH /api/v1/users/{user_id}
    Request body: { "name": "New Name" }  — only changed fields
    Returns 200 with updated resource or 404 if not found.
    """
    require_role("admin")
    return await patch_user(user_id, updates)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: uuid.UUID):
    """Delete a user (idempotent — safe to retry).

    DELETE /api/v1/users/{user_id}
    Returns 204 No Content on success, 404 if already deleted.
    """
    require_role("admin")
    await soft_delete_user(user_id)
```

### Pattern 3: Cursor-Based Pagination for Large Datasets

Offset-based pagination breaks with large datasets and concurrent modifications. Use cursor-based pagination (keyset pagination) for endpoints serving millions of records, activity feeds, or audit logs.

```python
from fastapi import Query


class CursorPaginatedResponse(BaseModel):
    """Cursor-based pagination envelope — stable against concurrent inserts/deletes."""
    items: list[User]
    has_more: bool
    next_cursor: Optional[str] = None  # URL-safe base64 encoded keyset token

    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {"id": "...", "email": "user1@example.com", "name": "User One"}
                ],
                "has_more": True,
                "next_cursor": "eyJpZCI6ImExYjJjM2Q0LWU1ZjYtNzg5MCIsImNyZWF0ZWRfYXQiOiIyMDI0LTAxLTE1In0"
            }
        }


@router.get("/audit-log/", response_model=dict)
async def list_audit_entries(
    cursor: Optional[str] = Query(None, description="Cursor for next page"),
    limit: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
):
    """Cursor-based pagination for high-volume endpoints.

    GET /api/v1/audit-log/?limit=50&cursor=eyJpZCI6IjEyMw...
    Returns stable results even when rows are inserted/deleted concurrently.
    """
    from base64 import urlsafe_b64decode, urlsafe_b64encode
    import json

    # Decode cursor to get the keyset position
    if cursor:
        decoded = json.loads(urlsafe_b64decode(cursor + "==").decode("utf-8"))
        after_id = decoded["id"]
        entries = await query_audit_after(after_id, limit=limit)
    else:
        entries = await query_audit_first(limit=limit)

    has_more = len(entries) > limit
    if has_more:
        last_entry = entries[-1]
        next_cursor = urlsafe_b64encode(
            json.dumps({"id": str(last_entry["id"]), "created_at": last_entry["created_at"]}).encode()
        ).decode("utf-8").rstrip("=")
    else:
        next_cursor = None

    return {
        "items": entries,
        "has_more": has_more,
        "next_cursor": next_cursor if has_more else None
    }
```

### Pattern 4: API Versioning with URL Path Strategy (BAD vs. GOOD)

Versioning prevents breaking changes from silently affecting consumers. The URL path strategy (`/api/v1/`, `/api/v2/`) is the most discoverable and debuggable approach. Media-type versioning (`Accept: application/vnd.api.v1+json`) is more REST-pure but harder to debug.

```python
# ❌ BAD: No versioning — breaking changes break all clients simultaneously
app = FastAPI()  # Changes to /users endpoint in v2 silently break v1 consumers

@app.get("/users")
def list_users(): ...

# After breaking change:
# @app.get("/users") — now returns different fields, existing clients break

# ✅ GOOD: URL path versioning with clear routing isolation
from fastapi import APIRouter


# Version 1 router — frozen contract, receives bug fixes only
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])

@v1_router.get("/users")
async def v1_list_users(): ...

@v1_router.post("/users")
async def v1_create_user(): ...

# Version 2 router — separate module, new contract, explicit opt-in by clients
v2_router = APIRouter(prefix="/api/v2", tags=["v2"])

@v2_router.get("/users")
async def v2_list_users():
    """V2 users endpoint with expanded fields and HATEOAS links."""
    ...

# Root-level redirect for discoverability
@app.get("/")
def api_root():
    return {
        "name": "Example REST API",
        "version": "1.0.0",
        "documentation": "/docs",
        "endpoints": {
            "v1": "/api/v1/",
            "v2": "/api/v2/"
        },
        "_links": {
            "v1_users": {"href": "/api/v1/users", "method": "GET"},
            "v2_users": {"href": "/api/v2/users", "method": "GET"}
        }
    }
```

### Pattern 5: HATEOAS Hypermedia Links in Responses

HATEOAS (Hypermedia as the Engine of Application State) adds `_links` to resource responses, enabling clients to discover available actions without hard-coded URL templates. Use this when building state-machine-driven workflows where not all actions are always available.

```python
class UserWithLinks(User):
    """User resource with HATEOAS hypermedia links."""
    _links: dict = {
        "self": {"href": "/api/v1/users/{user_id}", "method": "GET"},
        "update": {"href": "/api/v1/users/{user_id}", "method": "PATCH"},
        "delete": {"href": "/api/v1/users/{user_id}", "method": "DELETE"},
        "orders": {"href": "/api/v1/users/{user_id}/orders", "method": "GET"}
    }

    class Config:
        json_schema_extra = {
            "example": {
                "id": "...",
                "email": "alice@example.com",
                "_links": {
                    "self": {"href": "/api/v1/users/a1b2c3d4", "method": "GET"},
                    "update": {"href": "/api/v1/users/a1b2c3d4", "method": "PATCH"},
                    "orders": {"href": "/api/v1/users/a1b2c3d4/orders", "method": "GET"}
                }
            }
        }


@router.get("/{user_id}", response_model=UserWithLinks)
async def get_user_with_links(user_id: uuid.UUID):
    """Retrieve user with discoverable next-action links (HATEOAS).

    Links are computed dynamically based on the user's current state and the
    authenticated user's permissions — they are not static template strings.
    """
    user = await find_user(user_id)
    if not user:
        body, status = APIErrorHandler.not_found("user", str(user_id))
        raise HTTPException(status_code=status, detail=body)

    # Dynamically compute available links based on state and permissions
    links = {
        "self": {"href": f"/api/v1/users/{user_id}", "method": "GET"},
        "update": {"href": f"/api/v1/users/{user_id}", "method": "PATCH"}
    }

    if user.status == "active":
        links["orders"] = {"href": f"/api/v1/users/{user_id}/orders", "method": "GET"}
    if user.status != "deleted":
        links["delete"] = {"href": f"/api/v1/users/{user_id}", "method": "DELETE"}

    response_data = UserWithLinks.model_validate(user)
    response_data._links = links
    return response_data
```

---

## Constraints

### MUST DO

- Name all resources with plural nouns — `/users`, not `/getUser` or `/user`
- Return proper HTTP status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Validation), 500 (Internal Server Error)
- Format all error responses as RFC 7807 Problem Details with `type`, `title`, and `status` fields
- Include `_links` in collection responses at minimum: `self`, `first`, `last`
- Require authentication on every endpoint — no unauthenticated access by default
- Document API versioning strategy and enforce it consistently across all endpoints
- Support pagination on every endpoint that returns a collection (never return unbounded result sets)

### MUST NOT DO

- Never return HTTP 200 with an error object in the body — use proper status codes
- Never mix resource types in a single response envelope — each response is one resource or one paginated collection
- Never use verb-based URIs (`/createUser`, `/deleteUser`) — let HTTP methods convey the operation
- Never expose internal implementation details in error responses (stack traces, SQL queries, database connection strings)
- Never allow unbounded result sets — always paginate, even if there's only one page
- Never include sensitive data in error messages (passwords, API keys, internal IDs that leak infrastructure)
- Never change existing response shapes in a way that breaks consumers — version instead

---

## Output Template

When implementing or reviewing REST API code with this skill active, produce:

1. **Resource Model** — Plural-noun resource names with their URI patterns and relationships (parent/child/resource nesting)
2. **HTTP Method Mapping** — For each endpoint, specify the HTTP method, path, request body (if any), success response code, error codes, and idempotency classification
3. **Status Code Justification** — Explain the choice of each status code with reference to RFC 7231 semantics
4. **Error Response Examples** — Show the Problem Details JSON that would be returned for each error condition (400, 401, 403, 404, 409, 422, 500)
5. **Pagination Strategy** — Offset-based or cursor-based, with request/response examples including link headers
6. **Versioning Approach** — URL path (`/api/v1/`), Accept header (`Accept: application/vnd.api.v1+json`), or query parameter, with justification

---

## Related Skills

| Skill | Purpose |
|---|---|
| `fastapi-patterns` | FastAPI application structure for implementing REST APIs with typed errors, CORS, and middleware |
| `grpc-patterns` | gRPC development patterns; use alongside REST for hybrid architectures (REST for external, gRPC for internal) |
| `code-validation` | General input validation patterns that complement API-level request validation |
| `input-validation` | Schema validation and sanitization — applies to REST API request bodies and query parameters |
| `frontend-api-integration-patterns` | How frontend clients consume REST APIs — handles auth, retries, caching strategies |

---

## References

- [RFC 7231 — HTTP/1.1 Semantics](https://tools.ietf.org/html/rfc7231) — Official HTTP method and status code definitions
- [RFC 7807 — Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807) — Standardized error response format
- [Google API Design Guide (AIP)](https://google.aip.dev/) — Comprehensive API design best practices from Google
- [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html) — REST maturity levels 0–3
- [HATEOAS / Representational State Transfer](https://en.wikipedia.org/wiki/Representational_state_transfer#Applied_to_web_services) — Hypermedia as engine of application state

---

> 📖 skill: rest-api-patterns
