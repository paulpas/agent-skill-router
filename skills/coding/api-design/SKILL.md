---
name: api-design
description: Implements production-ready API design patterns including RESTful resource modeling, consistent error handling, pagination strategies, rate limiting, authentication integration, and comprehensive documentation for web services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api design, rest api, endpoint design, api architecture, resource modeling, error handling patterns, pagination strategy, rate limiting, api versioning, graphql design, web service design, http methods, idempotency
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: code-review, testing, security-review, documentation-writing
---

# API Design Patterns

Designs and implements production-ready APIs that are consistent, versioned, well-documented, and resilient. Covers RESTful resource modeling, error handling contracts, pagination strategies, rate limiting, authentication integration, and API lifecycle management.

## TL;DR Checklist

- [ ] Use plural nouns for resource names (`/users`, not `/getUser`)
- [ ] Return appropriate HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500)
- [ ] Implement consistent error response envelope with `code`, `message`, and `details` fields
- [ ] Apply cursor-based pagination for large datasets; offset-based for small bounded collections
- [ ] Document rate limits using standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- [ ] Version the API via URL path prefix (`/api/v1/`) or Accept header negotiation
- [ ] Ensure write operations are idempotent (PUT, DELETE) or clearly documented as non-idempotent (POST)

---

## When to Use

- Designing a new RESTful web service or API from scratch
- Refactoring an existing API to improve consistency and developer experience
- Adding pagination, rate limiting, or versioning to an unversioned API
- Creating API documentation standards for a team
- Reviewing API design for adherence to REST principles
- Defining error handling contracts across microservices

---

## When NOT to Use

- For gRPC/protobuf interface design — use protocol buffer design patterns instead
- For CLI tool design — focus on argument parsing and output formatting conventions
- For internal event-driven architectures — focus on message schema and event sourcing patterns
- As a substitute for security review — always pair API design with `security-review`

---

## Core Workflow

1. **Define Resource Model** — Identify domain entities, their relationships, and lifecycle states. Map each entity to a resource with a clear URI namespace.

   **Checkpoint:** Every resource has a unique identifier (UUID or integer), predictable plural path, and belongs to at most one top-level namespace.

2. **Establish HTTP Method Semantics** — Assign GET for retrieval, POST for creation, PUT for full replacement, PATCH for partial updates, DELETE for removal. Enforce idempotency rules per method type.

3. **Design Error Response Contract** — Define a unified error envelope structure that all endpoints return. Include machine-readable codes alongside human-readable messages.

4. **Implement Pagination Strategy** — Choose offset-based (for bounded collections) or cursor-based (for unbounded/large datasets). Apply consistent query parameters (`cursor`, `limit`, `page`, `per_page`).

5. **Add Rate Limiting Headers** — Every response must include rate limit headers. Implement per-client throttling with configurable windows. Return 429 Status when limits are exceeded.

6. **Version and Document** — Apply versioning strategy (URL path preferred for public APIs). Generate OpenAPI/Swagger documentation from implementation annotations.

---

## Implementation Patterns

### Pattern 1: RESTful Resource Naming

Use plural nouns for resource names. Keep paths flat where possible; nest only to show ownership relationships.

```python
# ❌ BAD — verb-based endpoints, singular resources, deeply nested
@app.route("/getUser/<user_id>")
def get_user(user_id):
    return jsonify(User.get(user_id))

@app.route("/createOrder")
def create_order():
    return jsonify(Order.create())

@app.route("/organizations/<org_id>/departments/<dept_id>/employees/<emp_id>")
# ❌ BAD — overly deep nesting makes URLs unwieldy and hard to bookmark


# ✅ GOOD — noun-based, pluralized, shallow with optional nesting
@app.route("/api/v1/users")
def list_users():
    return jsonify(UserCollection.paginate(request.args))

@app.route("/api/v1/users/<user_id>")
def get_user(user_id):
    user = User.get(user_id)
    if not user:
        raise NotFoundError("User not found", code="USER_NOT_FOUND")
    return jsonify(UserSchema().dump(user)), 200

@app.route("/api/v1/organizations/<org_id>/employees")
def list_org_employees(org_id):
    """List employees belonging to an organization — nested for scope context."""
    return jsonify(EmployeeCollection.for_organization(org_id).paginate(request.args))

@app.route("/api/v1/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    order = Order.create(data)
    return jsonify(OrderSchema().dump(order)), 201  # 201 Created, not 200
```

### Pattern 2: Consistent Error Response Envelope

All API errors return a standardized envelope with machine-readable codes, human-readable messages, and optional context.

```python
# ❌ BAD — inconsistent error responses across endpoints
@app.route("/api/v1/users", methods=["POST"])
def create_user_bad():
    try:
        data = request.get_json()
        if not data.get("email"):
            return jsonify({"error": "Email is required"}), 400  # Generic "error" key
        user = User.create(data)
        return jsonify(user), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500  # Exposes raw exception, no structure


# ✅ GOOD — unified error envelope with typed codes and context
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

@dataclass
class APIError:
    """Standardized API error response envelope."""
    code: str                    # Machine-readable error identifier
    message: str                 # Human-readable description
    status: int                  # HTTP status code
    details: list[dict[str, Any]] = field(default_factory=list)
    request_id: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        result = {"error": {
            "code": self.code,
            "message": self.message,
            "status": self.status,
        }}
        if self.details:
            result["error"]["details"] = self.details
        if self.request_id:
            result["error"]["request_id"] = self.request_id
        return result

class ValidationError(APIError):
    """Field-level validation failures."""
    def __init__(self, message: str, details: list[dict[str, Any]] | None = None, request_id: Optional[str] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status=422,
            details=details or [],
            request_id=request_id,
        )

# Usage in endpoint — all errors flow through the same envelope
@app.route("/api/v1/users", methods=["POST"])
def create_user_good():
    data = request.get_json()
    errors: list[dict[str, Any]] = []

    if not data or "email" not in data:
        errors.append({"field": "email", "message": "Email is required"})
    elif "@" not in data["email"]:
        errors.append({"field": "email", "message": "Invalid email format"})

    if errors:
        error = ValidationError("Request validation failed", errors, request_id=get_current_request_id())
        return jsonify(error.to_dict()), error.status

    try:
        user = User.create(data)
        return jsonify(UserSchema().dump(user)), 201
    except IntegrityError as e:
        error = APIError(
            code="DUPLICATE_RESOURCE",
            message=f"A resource with this identifier already exists: {data['email']}",
            status=409,
            request_id=get_current_request_id(),
        )
        return jsonify(error.to_dict()), 409
```

### Pattern 3: Cursor-Based Pagination

Preferred for large or unbounded datasets. Cursors encode the last item's sort key, making pagination deterministic and efficient regardless of data mutations.

```python
# ❌ BAD — offset pagination breaks with concurrent inserts/updates
@app.route("/api/v1/users")
def list_users_bad():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    # If a new user is inserted between requests, existing users shift pages
    # User at offset 41 on page 2 could appear on page 1 if items were deleted
    start = (page - 1) * per_page
    users = db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
                     per_page, start)
    return jsonify({
        "data": [serialize(u) for u in users],
        "page": page,
        "total_pages": None  # Often inaccurate with concurrent writes
    })


# ✅ GOOD — cursor-based pagination is mutation-resistant and efficient
import base64
import json

class CursorPaginator:
    """Cursor-based pagination that survives data mutations.

    The cursor encodes the sort key value of the last returned item,
    allowing deterministic re-queries without offset drift.
    """
    DEFAULT_LIMIT = 20
    MAX_LIMIT = 100

    @classmethod
    def encode(cls, sort_value: str) -> str:
        """Encode a cursor from the sort key value (e.g., timestamp, UUID)."""
        return base64.b64encode(json.dumps({"v": sort_value}).encode()).decode()

    @classmethod
    def decode(cls, cursor_str: str) -> dict:
        """Decode a cursor string back to its sort key value."""
        decoded = json.loads(base64.b64decode(cursor_str.encode()).decode())
        return decoded["v"]

    @classmethod
    def paginate(
        cls,
        query_func,
        sort_column: str = "created_at",
        sort_order: str = "DESC",
        limit: int | None = None,
        before: str | None = None,
        after: str | None = None,
    ) -> dict:
        """Paginate results using cursor-based navigation.

        Args:
            query_func: Callable that accepts (sort_value, sort_order, limit) and returns rows.
            sort_column: Column to use for pagination ordering.
            sort_order: "ASC" or "DESC".
            limit: Number of items per page (default 20, max 100).
            before: Cursor — return items BEFORE this cursor (reverse direction).
            after: Cursor — return items AFTER this cursor (forward direction).

        Returns:
            Dict with `data`, `next_cursor`, `prev_cursor`, and `has_more`.
        """
        limit = min(limit or cls.DEFAULT_LIMIT, cls.MAX_LIMIT)
        has_before = before is not None
        has_after = after is not None

        if has_before and has_after:
            raise ValueError("Cannot specify both 'before' and 'after' cursors")

        # Decode cursor sort value
        cursor_value = None
        direction = sort_order
        if has_after:
            cursor_value = cls.decode(after)
            direction = sort_order  # After means move forward in the given order
        elif has_before:
            cursor_value = cls.decode(before)
            direction = "ASC" if sort_order == "DESC" else "DESC"  # Reverse for before

        # Fetch items with boundary condition
        extra_params = {}
        if cursor_value is not None:
            extra_params["cursor_value"] = cursor_value

        rows, has_more = query_func(
            sort_column=sort_column,
            sort_order=direction,
            limit=limit + 1,  # Fetch one extra to determine has_more
            **extra_params,
        )

        # Trim the extra item
        items = rows[:limit]
        remaining = rows[limit:] if has_more else []

        # Build cursors for next/prev pages
        next_cursor = None
        prev_cursor = None

        if remaining:
            last_item = items[-1]
            next_cursor = cls.encode(str(getattr(last_item, sort_column)))

        if items:
            first_item = items[0]
            prev_cursor = cls.encode(str(getattr(first_item, sort_column)))

        return {
            "data": [serialize(row) for row in items],
            "next_cursor": next_cursor,
            "prev_cursor": prev_cursor,
            "has_more": bool(remaining),
        }


# Usage — clean endpoint with cursor pagination
@app.route("/api/v1/users")
def list_users_good():
    paginator = CursorPaginator()

    def query_func(sort_column, sort_order, limit, cursor_value=None):
        if cursor_value:
            if sort_order == "DESC":
                rows = db.query(
                    f"SELECT * FROM users WHERE {sort_column} < %s ORDER BY {sort_column} DESC LIMIT %s",
                    cursor_value, limit
                )
            else:
                rows = db.query(
                    f"SELECT * FROM users WHERE {sort_column} > %s ORDER BY {sort_column} ASC LIMIT %s",
                    cursor_value, limit
                )
        else:
            rows = db.query(
                f"SELECT * FROM users ORDER BY {sort_column} {sort_order} LIMIT %s",
                limit
            )
        has_more = len(rows) > limit
        return rows, has_more

    result = paginator.paginate(
        query_func=query_func,
        sort_column="created_at",
        sort_order="DESC",
        limit=request.args.get("limit", 20, type=int),
        after=request.args.get("after"),
        before=request.args.get("before"),
    )

    return jsonify(result)
```

### Pattern 4: Rate Limiting Headers

Every API response includes rate limit headers so clients can back off gracefully. Implement per-client throttling with configurable windows.

```python
# ✅ GOOD — rate limiting with standard headers and 429 responses
import time
from threading import Lock

class InMemoryRateLimiter:
    """Simple in-memory rate limiter using a sliding window algorithm."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = {}
        self._lock = Lock()

    def is_allowed(self, client_id: str) -> tuple[bool, dict]:
        """Check if request is allowed. Returns (allowed, rate_limit_info)."""
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Clean old entries
            if client_id in self._requests:
                self._requests[client_id] = [
                    ts for ts in self._requests[client_id] if ts > window_start
                ]
            else:
                self._requests[client_id] = []

            request_count = len(self._requests[client_id])
            remaining = max(0, self.max_requests - request_count)
            reset_time = int(window_start + self.window_seconds)

            if request_count >= self.max_requests:
                return False, {
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(reset_time - int(now)),
                }

            self._requests[client_id].append(now)
            return True, {
                "X-RateLimit-Limit": str(self.max_requests),
                "X-RateLimit-Remaining": str(remaining - 1),
                "X-RateLimit-Reset": str(reset_time),
            }

    def get_limit_headers(self, client_id: str) -> dict[str, str]:
        """Get current rate limit headers without consuming a request."""
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            if client_id in self._requests:
                self._requests[client_id] = [
                    ts for ts in self._requests[client_id] if ts > window_start
                ]
                count = len(self._requests[client_id])
            else:
                count = 0

            reset_time = int(window_start + self.window_seconds)
            remaining = max(0, self.max_requests - count)

            return {
                "X-RateLimit-Limit": str(self.max_requests),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_time),
            }


# Usage in a Flask/FastAPI middleware — applies to every response
@app.before_request
def check_rate_limit():
    client_id = request.headers.get("X-Client-ID") or request.remote_addr
    allowed, headers = rate_limiter.is_allowed(client_id)

    if not allowed:
        error = APIError(
            code="RATE_LIMIT_EXCEEDED",
            message="Too many requests. Please retry after the window resets.",
            status=429,
            details=[{"field": "rate_limit", "message": headers.get("Retry-After", "60") + " seconds remaining"}],
        )
        return jsonify(error.to_dict()), 429, headers


@app.after_request
def add_rate_limit_headers(response):
    """Attach rate limit headers to every successful response."""
    client_id = request.headers.get("X-Client-ID") or request.remote_addr
    limit_headers = rate_limiter.get_limit_headers(client_id)
    for header_name, header_value in limit_headers.items():
        response.headers[header_name] = header_value
    return response
```

### Pattern 5: API Versioning Strategies

Version the API to maintain backward compatibility while evolving. URL path versioning is most common and discoverable for public APIs.

```python
# ✅ GOOD — URL path versioning with clear v1/v2 prefixes
# Version is part of the route, making it explicit and cacheable
ROUTES = {
    "v1": "/api/v1",   # /api/v1/users, /api/v1/orders
    "v2": "/api/v2",   # /api/v2/users, /api/v2/orders
}

# Versioned API blueprint (Flask example)
from flask import Blueprint

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")
api_v2 = Blueprint("api_v2", __name__, url_prefix="/api/v2")

@api_v1.route("/users/<user_id>")
def get_user_v1(user_id):
    """V1 returns a flat user object. Legacy structure maintained for compatibility."""
    user = User.get(user_id)
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": str(user.created_at),  # V1: string dates
    }), 200

@api_v2.route("/users/<user_id>")
def get_user_v2(user_id):
    """V2 returns a structured user object with embedded metadata and ISO 8601 dates."""
    user = User.get(user_id)
    return jsonify({
        "data": {
            "id": user.id,
            "attributes": {
                "name": user.name,
                "email": user.email,
                "created_at": user.created_at.isoformat(),  # V2: ISO 8601
            },
            "metadata": {
                "version": "2.0",
                "links": {
                    "self": f"/api/v2/users/{user.id}",
                    "orders": f"/api/v2/users/{user.id}/orders",
                }
            }
        }
    }), 200

# Accept header versioning alternative (less discoverable but cleaner URLs)
# curl -H "Accept: application/vnd.myapi.v2+json" https://api.example.com/users


# ✅ GOOD — deprecation notices for sunset planning
@app.after_request
def add_deprecation_header(response):
    """Add Deprecation and Sunset headers when serving deprecated versions."""
    if "/api/v1/" in request.path:
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = "Sat, 01 Jun 2027 00:00:00 GMT"
        response.headers["Link"] = '<https://docs.example.com/migration/v1-to-v2>; rel="successor-version"'
    return response
```

---

## Constraints

### MUST DO
- Use plural nouns for all resource names (`/users`, `/orders`, not `/user` or `/getUser`)
- Return HTTP status codes that match the operation outcome (201 for creation, 204 for deletion, 422 for validation)
- Wrap all errors in a consistent envelope with `error.code`, `error.message`, and optional `error.details`
- Include `X-RateLimit-*` headers on every response, including error responses
- Implement cursor-based pagination for any collection exceeding 1,000 items
- Version public APIs via URL path prefix (`/api/vN/`) with documented sunset dates
- Support filtering via query parameters using a consistent convention (`?status=active&role=admin`)
- Add `request_id` to every response for traceability and debugging
- Write OpenAPI/Swagger documentation from code annotations — never maintain docs separately

### MUST NOT DO
- Expose raw exception messages or stack traces in API responses (security risk)
- Use verb-based URLs (`/getUsers`, `/createOrder`) — REST is about resources, not actions
- Return 200 for all success cases regardless of operation type
- Implement pagination with `offset` + `limit` on unbounded collections (causes drift and performance degradation)
- Embed API logic directly in route handlers without service/repository layer separation
- Remove or skip rate limiting headers — clients depend on them for graceful backoff
- Use date strings without timezone specification — always use ISO 8601 with timezone (`2025-06-15T14:30:00Z`)

---

## Output Template

When implementing or reviewing API design, produce:

1. **Resource Model** — List of resources with their URI paths and relationships (nested or flat)
2. **Endpoint Specifications** — HTTP method, path, query params, request body schema, response status codes, and response body structure for each endpoint
3. **Error Envelope Definition** — The exact JSON shape returned on errors including `code`, `message`, and `details` fields
4. **Pagination Strategy** — Which pagination type is used (cursor or offset) and the query parameter contract
5. **Rate Limit Configuration** — Window size, max requests per window, and which headers are returned
6. **Versioning Plan** — Current version, deprecation schedule for older versions, and migration notes

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Review API implementation for correctness and adherence to design patterns |
| `security-review` | Audit API endpoints for authentication, authorization, and injection vulnerabilities |
| `testing` | Design test strategies including contract tests, integration tests, and load testing |
| `documentation-writing` | Create comprehensive API reference documentation from OpenAPI specs |
