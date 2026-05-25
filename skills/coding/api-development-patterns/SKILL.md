---
name: api-development-patterns
description: Implements practical API development patterns including REST conventions,
  GraphQL design, error handling strategies, OpenAPI-first workflow, and versioning
  strategies for production-ready APIs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: api development, REST API design, GraphQL schema design, API error handling,
    OpenAPI spec, API versioning strategy, how do i build a production API, API conventions
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
  related-skills: api-design, rest-api-patterns, graphql-schema-design, api-security-patterns
------
# API Development Patterns

Implements practical patterns for building production-ready APIs that are consistent, resilient, and maintainable. When loaded, this skill makes the model act as a senior API engineer — designing RESTful endpoints, crafting GraphQL schemas, implementing robust error handling, managing API versioning strategies, and enforcing contract-first development workflows with OpenAPI specifications.

## TL;DR Checklist

- [ ] Design all APIs using an OpenAPI/Swagger spec first, then implement against it
- [ ] Follow consistent REST conventions: resource-oriented URLs, proper HTTP methods, status codes
- [ ] Implement structured error responses with error codes, messages, and context for debugging
- [ ] Version APIs explicitly (URI path versioning preferred) and maintain backward compatibility
- [ ] Add pagination, filtering, and sorting to all collection endpoints
- [ ] Include rate limiting headers and CORS configuration on all responses

---

## When to Use

Use this skill when:

- Designing a new REST or GraphQL API from scratch
- Refactoring an existing API for better consistency, versioning, or error handling
- Integrating with a third-party API that has inconsistent patterns — need a consistent abstraction layer
- Setting up contract-first development with OpenAPI specs for your team
- Building internal APIs (BFFs, aggregation layers) that front multiple microservices
- Creating public-facing APIs that require versioning, rate limiting, and comprehensive documentation

---

## When NOT to Use

Avoid this skill for:

- Designing low-level service-to-service communication where gRPC or message queues are more appropriate — use `grpc-patterns` instead
- Implementing API security (authentication, authorization, input validation at trust boundaries) — use `api-security-patterns` or `security-review` instead
- GraphQL-specific resolver implementation and data loading — that's a sub-problem covered by `graphql-schema-design`

---

## Core Workflow

1. **Define the OpenAPI Contract First** — Before writing any implementation code, create an OpenAPI 3.x specification document that defines all endpoints, request/response schemas, error formats, and authentication requirements:
   - Define paths with resource-oriented naming (plural nouns, `/users`, `/orders/{id}/items`)
   - Specify HTTP methods semantically (GET=fetch, POST=create, PUT=replace, PATCH=partial update, DELETE=remove)
   - Document all response codes including error responses with structured schemas
   - Define request body schemas using reusable component definitions
   **Checkpoint:** Every endpoint must have at least one success response (2xx), one client error response (4xx), and one server error response (5xx) defined in the spec. If any are missing, the API is incomplete.

2. **Implement RESTful Endpoint Patterns** — For each endpoint defined in the contract, implement using consistent patterns:
   - Collection endpoints return paginated lists with `Link` headers for navigation
   - Resource endpoints use UUID or surrogate keys as identifiers (never expose internal database IDs)
   - Create operations use POST and return 201 with a `Location` header pointing to the created resource
   - Update operations: PUT replaces the entire resource, PATCH modifies specific fields
   - Delete operations return 204 No Content on success
   **Checkpoint:** Run all endpoints through an HTTP method stress test — verify that GET is idempotent and safe (read-only), POST is non-idempotent, and PUT is truly replace-all. Any deviation indicates a design flaw.

3. **Implement Structured Error Handling** — Create a unified error response format used across all endpoints:
   - Include `error_code` for machine-readable error classification
   - Include `message` for human-readable explanation
   - Include `details` array for field-level validation errors
   - Use correct HTTP status codes: 400 (client error), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 500 (internal)
   - Never expose stack traces or internal implementation details to clients
   **Checkpoint:** Every error path in the codebase must go through the same error handler. Verify by adding a random exception and confirming it produces a properly formatted error response, not a raw stack trace.

4. **Design Pagination, Filtering, and Sorting** — All collection endpoints must support:
   - Cursor-based pagination (preferred for large datasets) or offset-based (acceptable for small collections)
   - Consistent pagination envelope: `{ items: [...], next_cursor: "...", has_more: bool }`
   - Query parameter filtering with field prefixes: `/users?role=admin&status=active`
   - Sorting by multiple fields: `/orders?sort=-created_at,name` (dash prefix = descending)
   **Checkpoint:** Verify that pagination works correctly at boundaries — empty result set, exactly one page of results, and the last item of a multi-page result. These are where bugs hide.

5. **Implement API Versioning Strategy** — Use URI path versioning for public APIs:
   - Base URL pattern: `/api/v1/resources`, `/api/v2/resources`
   - Each version must maintain backward compatibility with its previous version
   - Deprecation notices appear in response headers 90 days before end-of-life
   - Internal APIs can use simpler strategies (header-based, semantic versioning)
   **Checkpoint:** When adding a new field to a response schema, it MUST be optional for at least one major version cycle before becoming required. This is the golden rule of API evolution.

6. **Add Operational Headers and CORS** — Every API response must include:
   - `X-Request-ID`: Unique identifier for request tracing across services
   - `X-RateLimit-Limit` / `X-RateLimit-Remaining`: Current rate limit status
   - `X-API-Version`: Which API version this response conforms to
   - Proper CORS headers when serving cross-origin requests
   **Checkpoint:** Verify that every production endpoint includes these headers by checking the actual HTTP responses, not just the code. Headers can be stripped by middleware misconfiguration.

---

## Implementation Patterns

### Pattern 1: RESTful Endpoint Implementations

Consistent implementation patterns for CRUD operations on a resource, following REST conventions and OpenAPI-first design.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


# ---- Unified Error Response Schema ----

class ErrorCode(str, Enum):
    VALIDATION_ERROR = "validation_error"
    NOT_FOUND = "not_found"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    CONFLICT = "conflict"
    RATE_LIMITED = "rate_limited"
    INTERNAL_ERROR = "internal_error"


@dataclass
class FieldError:
    field: str
    message: str
    code: str = ""


@dataclass
class ApiError:
    """Standardized API error response used across all endpoints."""
    error_code: ErrorCode
    message: str
    details: list[FieldError] = field(default_factory=list)
    request_id: str = ""

    def to_dict(self, include_request_id: bool = True) -> dict[str, Any]:
        result: dict[str, Any] = {
            "error_code": self.error_code.value,
            "message": self.message,
        }
        if self.details:
            result["details"] = [
                {"field": d.field, "message": d.message} for d in self.details
            ]
        if include_request_id and self.request_id:
            result["request_id"] = self.request_id
        return result


class ApiErrorResponse(Exception):
    """Base exception for API errors that produces structured HTTP responses."""

    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        details: list[FieldError] | None = None,
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or []

    def response(self, request_id: str = "") -> ApiError:
        return ApiError(
            error_code=self.error_code,
            message=self.message,
            details=self.details,
            request_id=request_id,
        )


# ---- Pagination Envelope ----

@dataclass
class PaginatedResponse[T]:
    """Consistent pagination envelope for all collection endpoints."""
    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "items": self.items,
            "next_cursor": self.next_cursor,
            "has_more": self.has_more,
        }


# ---- Example RESTful Resource Handlers ----

class UserService:
    """Example service demonstrating consistent REST endpoint patterns."""

    async def list_users(
        self,
        cursor: str | None = None,
        page_size: int = 20,
        role: str | None = None,
        status: str | None = None,
    ) -> PaginatedResponse[dict]:
        """List users with cursor-based pagination and filtering.

        GET /api/v1/users?cursor=<token>&page_size=20&role=admin&status=active

        Args:
            cursor: Opaque cursor for pagination continuation.
            page_size: Number of results per page (max 100).
            role: Filter by user role.
            status: Filter by account status.

        Returns:
            Paginated list of user objects.
        """
        if page_size < 1 or page_size > 100:
            raise ApiErrorResponse(
                status_code=422,
                error_code=ErrorCode.VALIDATION_ERROR,
                message="page_size must be between 1 and 100",
                details=[FieldError(field="page_size", message="Range: 1-100")],
            )

        # ... actual implementation would query database here ...
        users = []  # Placeholder for actual data fetch
        has_more = len(users) == page_size
        next_cursor = None if not has_more else "eyJpZCI6IDEyM30"  # Opaque cursor token

        return PaginatedResponse(items=users, next_cursor=next_cursor, has_more=has_more)

    async def get_user(self, user_id: str) -> dict:
        """Get a single user by UUID.

        GET /api/v1/users/{user_id}
        """
        # Validate UUID format
        import uuid
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise ApiErrorResponse(
                status_code=422,
                error_code=ErrorCode.VALIDATION_ERROR,
                message="Invalid user ID format. Expected a valid UUID.",
                details=[FieldError(field="user_id", message="Must be a valid UUID")],
            )

        # ... actual implementation would query database ...
        return {"id": user_id, "name": "Example User"}

    async def create_user(self, name: str, email: str, role: str = "member") -> dict:
        """Create a new user. Returns 201 with Location header.

        POST /api/v1/users
        """
        # Validate email format
        if "@" not in email or "." not in email.split("@")[1]:
            raise ApiErrorResponse(
                status_code=422,
                error_code=ErrorCode.VALIDATION_ERROR,
                message="Invalid email format",
                details=[FieldError(field="email", message="Must be a valid email address")],
            )

        # ... actual implementation would insert into database ...
        return {"id": str(uuid.uuid4()), "name": name, "email": email, "role": role}
```

### Pattern 2: Structured Error Handler Middleware

A centralized error handler that ensures every API error follows the unified format, regardless of where it originates in the application.

```python
from __future__ import annotations

import logging
import traceback
from typing import Any

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware:
    """Centralized middleware that catches all exceptions and converts them
    to standardized API error responses with proper HTTP status codes.

    Usage in FastAPI:
        app.add_middleware(ErrorHandlerMiddleware)
    """

    @staticmethod
    def handle(exception: Exception, request_id: str = "") -> tuple[int, dict[str, Any]]:
        """Convert any exception to a (status_code, body) response tuple.

        Args:
            exception: The caught exception.
            request_id: The request identifier for tracing.

        Returns:
            Tuple of HTTP status code and error response body.
        """
        # Map known exception types to error codes
        if isinstance(exception, ApiErrorResponse):
            err = exception.response(request_id)
            return exception.status_code, err.to_dict()

        # Handle validation errors (e.g., Pydantic)
        from pydantic import ValidationError
        if isinstance(exception, ValidationError):
            details = []
            for error in exception.errors():
                field_name = ".".join(str(loc) for loc in error["loc"])
                details.append(FieldError(
                    field=field_name,
                    message=error["msg"],
                    code=ErrorCode.VALIDATION_ERROR.value,
                ))
            err = ApiError(
                error_code=ErrorCode.VALIDATION_ERROR,
                message="Request validation failed",
                details=details,
                request_id=request_id,
            )
            return 422, err.to_dict()

        # Handle generic exceptions — never expose internals to the client
        logger.exception("Unhandled exception in request handler")
        err = ApiError(
            error_code=ErrorCode.INTERNAL_ERROR,
            message="An unexpected error occurred. Please contact support.",
            request_id=request_id,
        )
        return 500, err.to_dict()


# BAD: Raw exception leaking to client — DO NOT DO THIS
def bad_error_handler(exc):
    """❌ BAD: Returns raw traceback and internal details."""
    return {
        "error": str(exc),
        "traceback": traceback.format_exc(),  # Never expose stack traces!
        "internal_path": exc.__module__ + "." + type(exc).__name__,
    }


# GOOD: Structured error with controlled message
def good_error_handler(exc, request_id=""):
    """✅ GOOD: Catches all exceptions and returns structured API error."""
    status_code, body = ErrorHandlerMiddleware.handle(exc, request_id)
    return {"status": status_code, "body": body}
```

### Pattern 3: OpenAPI Contract Generator

Generates OpenAPI 3.x specifications from code annotations, ensuring the contract stays in sync with implementation.

```python
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ApiEndpoint:
    """Represents a single API endpoint for OpenAPI spec generation."""
    path: str
    method: str  # "get", "post", "put", "patch", "delete"
    summary: str
    description: str = ""
    parameters: list[dict[str, Any]] = field(default_factory=list)
    request_body: dict[str, Any] | None = None
    responses: dict[str, dict[str, Any]] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)


class OpenAPISpecBuilder:
    """Builds and validates OpenAPI 3.x specifications from endpoint definitions.

    Usage:
        builder = OpenAPISpecBuilder(title="My API", version="1.0.0")
        builder.add_endpoint(ApiEndpoint(
            path="/api/v1/users",
            method="get",
            summary="List all users",
            tags=["users"],
            parameters=[...],
            responses={"200": {...}, "422": {...}},
        ))
        spec = builder.build()
    """

    def __init__(self, title: str, version: str = "1.0.0", description: str = ""):
        self.title = title
        self.version = version
        self.description = description
        self.paths: dict[str, dict[str, Any]] = {}
        self.components: dict[str, Any] = {"schemas": {}}

    def add_endpoint(self, endpoint: ApiEndpoint) -> "OpenAPISpecBuilder":
        """Add an endpoint to the specification."""
        method_lower = endpoint.method.lower()

        if endpoint.path not in self.paths:
            self.paths[endpoint.path] = {}

        operation: dict[str, Any] = {
            "summary": endpoint.summary,
            "tags": endpoint.tags,
        }

        if endpoint.description:
            operation["description"] = endpoint.description

        if endpoint.parameters:
            operation["parameters"] = endpoint.parameters

        if endpoint.request_body:
            operation["requestBody"] = {"required": True, "content": endpoint.request_body}

        operation["responses"] = {}
        for code, response in endpoint.responses.items():
            operation["responses"][code] = {
                "description": response.get("description", f"Response code {code}"),
            }
            if "schema" in response:
                operation["responses"][code]["content"] = {
                    "application/json": {"schema": response["schema"]}
                }

        self.paths[endpoint.path][method_lower] = operation
        return self

    def build(self) -> dict[str, Any]:
        """Build the complete OpenAPI 3.x specification dictionary."""
        spec: dict[str, Any] = {
            "openapi": "3.1.0",
            "info": {
                "title": self.title,
                "version": self.version,
                "description": self.description,
            },
            "paths": self.paths,
            "components": self.components,
        }

        # Validate required fields
        if not spec["paths"]:
            raise ValueError("OpenAPI spec must have at least one endpoint")

        return spec

    def to_json(self, indent: int = 2) -> str:
        """Serialize the spec to a formatted JSON string."""
        return json.dumps(self.build(), indent=indent, default=str)


# Example: Building a complete spec for a users API
def build_users_api_spec() -> str:
    """Generate an OpenAPI specification for a sample users API."""
    builder = OpenAPISpecBuilder(
        title="User Management API",
        version="1.0.0",
        description="RESTful user management with pagination and filtering.",
    )

    # List users endpoint
    builder.add_endpoint(ApiEndpoint(
        path="/api/v1/users",
        method="get",
        summary="List all users",
        tags=["users"],
        parameters=[
            {
                "name": "page_size",
                "in": "query",
                "schema": {"type": "integer", "default": 20, "minimum": 1, "maximum": 100},
                "description": "Number of results per page",
            },
            {
                "name": "cursor",
                "in": "query",
                "schema": {"type": "string"},
                "description": "Cursor for pagination continuation",
            },
            {
                "name": "role",
                "in": "query",
                "schema": {"type": "string"},
                "description": "Filter by user role",
            },
        ],
        responses={
            "200": {
                "description": "Successful response with paginated users",
                "schema": {"$ref": "#/components/schemas/PaginatedUsers"},
            },
            "422": {
                "description": "Validation error",
                "schema": {"$ref": "#/components/schemas/ApiError"},
            },
        },
    ))

    # Get user endpoint
    builder.add_endpoint(ApiEndpoint(
        path="/api/v1/users/{user_id}",
        method="get",
        summary="Get a single user",
        tags=["users"],
        parameters=[
            {
                "name": "user_id",
                "in": "path",
                "required": True,
                "schema": {"type": "string", "format": "uuid"},
                "description": "UUID of the user to retrieve",
            },
        ],
        responses={
            "200": {
                "description": "User found",
                "schema": {"$ref": "#/components/schemas/User"},
            },
            "404": {
                "description": "User not found",
                "schema": {"$ref": "#/components/schemas/ApiError"},
            },
        },
    ))

    # Create user endpoint
    builder.add_endpoint(ApiEndpoint(
        path="/api/v1/users",
        method="post",
        summary="Create a new user",
        tags=["users"],
        request_body={
            "application/json": {
                "schema": {"$ref": "#/components/schemas/CreateUserRequest"},
            },
        },
        responses={
            "201": {
                "description": "User created successfully",
                "schema": {"$ref": "#/components/schemas/User"},
            },
            "422": {
                "description": "Validation error",
                "schema": {"$ref": "#/components/schemas/ApiError"},
            },
        },
    ))

    return builder.to_json()
```

---

## Constraints

### MUST DO
- Start every new API with an OpenAPI 3.x specification before writing implementation code
- Use plural noun paths for resources (`/users`, not `/user` or `/get-user`)
- Return structured error responses with `error_code`, `message`, and optional `details` on every endpoint
- Implement cursor-based pagination for all collection endpoints that may return more than 100 items
- Include `X-Request-ID` in every request/response pair for tracing across services
- Version public APIs using URI path versioning (`/api/v1/...`) with backward compatibility guarantees
- Add rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) on all endpoints
- Never expose stack traces, internal paths, or database queries in API error responses

### MUST NOT DO
- Use query parameters for resource identification (e.g., `/users?id=123` instead of `/users/123`)
- Return HTTP 200 for all successful responses regardless of operation type (use 201 for create, 204 for delete)
- Mutate the existing error handling across different endpoints — use a single centralized handler
- Expose internal database primary keys in API responses (use UUIDs or opaque identifiers)
- Add required fields to response schemas without a deprecation cycle of at least one major version
- Use DELETE with a request body — DELETE should operate on the URL resource identifier only

---

## Output Template

When designing or reviewing an API, produce:

1. **API Specification** — Complete OpenAPI 3.x YAML/JSON spec with all endpoints, schemas, and error formats defined
2. **RESTful Implementation Examples** — Handler code for each endpoint using consistent patterns (pagination, error handling)
3. **Error Handling Strategy** — The centralized error handler implementation and error code catalog
4. **Versioning Plan** — Current version state, deprecated endpoints timeline, and migration path to next version
5. **Operational Headers Configuration** — CORS settings, rate limiting rules, and request tracing setup

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-design` | High-level API design methodology including discovery, stakeholder alignment, and architecture decisions |
| `rest-api-patterns` | Specific REST patterns (hypermedia controls, HATEOAS, resource nesting) |
| `graphql-schema-design` | GraphQL-specific schema design, resolver patterns, and data loading optimization |
| `api-security-patterns` | Authentication, authorization, input validation, and threat modeling for APIs |

---

## Live References

> Authoritative documentation for API development practices.

- [OpenAPI Specification 3.1 Documentation](https://spec.openapis.org/oas/v3.1.0)
- [RESTful API Design Guidelines — Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/rest-api-design)
- [RFC 9110 — HTTP Semantics (official REST conventions)](https://www.rfc-editor.org/rfc/rfc9110)
- [Paginating APIs — GitHub Developer Guide](https://docs.github.com/en/rest/using-the-rest-api/pagination)
- [API Versioning Strategies — Martin Kleppmann Blog](https://martin.kleppmann.com/2020/09/07/api-versioning-patterns.html)
