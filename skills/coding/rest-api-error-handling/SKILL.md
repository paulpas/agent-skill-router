---
name: rest-api-error-handling
description: Implements RFC 7807 Problem Details error responses with proper HTTP status code dispatch, structured validation errors, and machine-readable error URIs for production REST APIs.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: RFC 7807, Problem Details API, REST error handling, HTTP status codes, validation errors API, structured error responses, how do i handle REST errors, Problem Details JSON
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: rest-api-resource-modeling, rest-api-security-patterns
---

# REST API Error Handler

Formats all API errors as RFC 7807 Problem Details JSON with correct HTTP status codes, structured field-level validation errors, and machine-readable error URIs. When active, the model converts exceptions into structured ProblemDetails responses, dispatches by error category (validation, authentication, authorization, not-found, conflict, server), and never exposes internal implementation details to API consumers.

## TL;DR Checklist

- [ ] Every error response follows RFC 7807 Problem Details format with type, title, status, detail fields
- [ ] HTTP status codes match the error category (400, 401, 403, 404, 409, 422, 500) per RFC 9110
- [ ] Validation errors include a `errors[]` array with field, message, and code per violation
- [ ] Error URIs follow consistent pattern (`https://api.example.com/errors/{error-type}`) for machine readability
- [ ] Stack traces, internal error codes, and database details are never included in responses
- [ ] A centralized exception handler converts all raised exceptions to ProblemDetails before sending

---

## When to Use

Use this skill when:

- Implementing error handling for a new REST API or refactoring existing error responses
- Converting raw `{ "error": "message" }` responses to RFC 7807 Problem Details format
- Designing the error response contract between microservices in an internal API
- Building a global exception handler that converts framework exceptions (FastAPI, SQLAlchemy, Pydantic) into structured ProblemDetails
- Adding field-level validation error details for 422 Unprocessable Entity responses
- Ensuring consistency across all error responses in a multi-endpoint API

---

## When NOT to Use

Avoid this skill for:

- **WebSocket or gRPC APIs** — these use their own error/status code systems (gRPC status codes, WebSocket close codes)
- **Server-sent events (SSE)** — SSE uses text-based event streams where error formatting is different
- **Health check endpoints** (`/health`, `/ready`) — these return simple boolean or numeric status, not domain errors

---

## Core Workflow

1. **Classify Every Error by Category** — Map each error to a category: `validation` (client sent bad data), `authentication` (no valid credentials), `authorization` (authenticated but insufficient permissions), `not-found` (resource does not exist), `conflict` (state violation like concurrent modification or duplicate key), `server` (unexpected internal failure).
   **Checkpoint:** Every exception raised in the API must map to exactly one category. Ambiguity causes inconsistent status codes.

2. **Map Each Category to the Correct HTTP Status Code** — Use standard mappings: 400 Bad Request (malformed syntax), 401 Unauthorized (missing/invalid credentials), 403 Forbidden (authenticated but denied), 404 Not Found (resource doesn't exist), 409 Conflict (state conflict like ETag mismatch or duplicate), 422 Unprocessable Entity (semantic validation failure), 500 Internal Server Error (unhandled exception).
   **Checkpoint:** Verify that the chosen status code matches RFC 9110 semantics — not just "something went wrong."

3. **Structure Errors as RFC 7807 Problem Details JSON** — Build responses with at minimum: `type` (error URI), `title` (human-readable summary), `status` (HTTP status code as integer), `detail` (specific description). Include `instance` for the request path and `errors[]` for field-level validation issues.
   **Checkpoint:** Every response must include `type`, `title`, and `status` — these are REQUIRED by RFC 7807 §3.1.

4. **Include Field-Level Validation Details** — For 422 responses caused by Pydantic validation or domain rules, populate the `errors[]` array with objects containing `field` (dot-notation path like `billing.address.city`), `message` (human-readable explanation), and `code` (machine-readable error code).
   **Checkpoint:** Each error in `errors[]` must correspond to a real field or parameter that was rejected — no fabricated errors.

5. **Ensure Error URIs Follow Consistent Patterns** — Use stable URIs for error types: `https://api.example.com/errors/validation-failed`, `/errors/not-found`, `/errors/conflict`. These URIs should resolve to documentation explaining the error and how to fix it.
   **Checkpoint:** All error type URIs in the API must be consistent in structure and use the same base domain.

6. **Never Expose Stack Traces or Internal Details** — Strip exception traces, database connection strings, internal module names, and infrastructure details from all responses. Log them server-side only.
   **Checkpoint:** Run a curl test against every error path — if any response contains file paths, SQL queries, or Python tracebacks, the handler is leaking internals.

---

## Implementation Patterns

### Pattern 1: RFC 7807 ProblemDetails Model with Validation Errors (BAD vs. GOOD)

RFC 7807 defines a standard JSON structure for error responses. The format includes `type` (a URI identifying the error type), `title` (short human-readable summary), `status` (HTTP status code as integer), and optionally `detail` (extended explanation), `instance` (request URI), and `errors[]` (field-level details).

```python
# ❌ BAD: Inconsistent raw error responses — no structure, no standard format
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/users/{user_id}")
def get_user_bad(user_id: str):
    # Inconsistent formats across endpoints
    if not user_id:
        raise HTTPException(400, {"message": "Missing user ID"})  # Wrong status, raw dict

    try:
        user = db.get_user(user_id)
    except Exception as e:
        # Stack trace leaked — security vulnerability!
        import traceback
        raise HTTPException(500, {
            "error": str(e),
            "traceback": traceback.format_exc(),  # NEVER do this
        })

    if not user:
        return {"error": "not found"}  # No HTTP status code — defaults to 200!


# ✅ GOOD: Structured ProblemDetails following RFC 7807 with validation error support
from pydantic import BaseModel, Field
from typing import Any, Generic, TypeVar
from fastapi.responses import JSONResponse

T = TypeVar("T")


class ValidationErrorDetail(BaseModel):
    """A single field-level validation error in the errors[] array."""
    field: str = Field(..., description="Dot-notation path to the invalid field.")
    message: str = Field(..., description="Human-readable explanation of the validation failure.")
    code: str = Field(
        ...,
        description="Machine-readable error code for programmatic handling.",
    )


class ProblemDetails(BaseModel, Generic[T]):
    """RFC 7807 Problem Details response structure.

    See https://www.rfc-editor.org/rfc/rfc7807 for the full specification.

    Required fields: type, title, status
    Optional fields: detail, instance, errors, extensions
    """
    type: str = Field(
        default="about:blank",
        description="URI identifying the error type. Must be resolvable for documentation.",
    )
    title: str = Field(
        ...,
        description="Short, human-readable summary of the problem type.",
    )
    status: int = Field(
        ...,
        description="HTTP status code as an integer (not a string).",
    )
    detail: str | None = Field(
        default=None,
        description="Human-readable explanation specific to this occurrence.",
    )
    instance: str | None = Field(
        default=None,
        description="The request URI that caused the error, for traceability.",
    )
    errors: list[ValidationErrorDetail] = Field(
        default_factory=list,
        description="Field-level validation errors. Populated only for 422 responses.",
    )

    def to_response(
        self,
        status_code: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> JSONResponse:
        """Convert this ProblemDetails instance into a FastAPI JSONResponse."""
        code = status_code or self.status
        return JSONResponse(
            content=self.model_dump(exclude_none=True),
            status_code=code,
            headers=headers,
        )


# --- Typed error factory functions ---

def not_found_error(resource: str, identifier: str) -> ProblemDetails:
    """Create a 404 Not Found ProblemDetails response."""
    return ProblemDetails(
        type="https://api.example.com/errors/not-found",
        title="Resource Not Found",
        status=404,
        detail=f"The requested {resource} with identifier '{identifier}' was not found.",
    )


def validation_error(
    detail: str = "Request validation failed.",
    errors: list[dict[str, str]] | None = None,
) -> ProblemDetails:
    """Create a 422 Unprocessable Entity ProblemDetails response with field errors."""
    error_details = [ValidationErrorDetail(**e) for e in (errors or [])]
    return ProblemDetails(
        type="https://api.example.com/errors/validation-failed",
        title="Validation Failed",
        status=422,
        detail=detail,
        errors=error_details,
    )


def conflict_error(detail: str) -> ProblemDetails:
    """Create a 409 Conflict ProblemDetails response."""
    return ProblemDetails(
        type="https://api.example.com/errors/conflict",
        title="Conflict",
        status=409,
        detail=detail,
    )


def unauthorized_error(detail: str = "Authentication is required.") -> ProblemDetails:
    """Create a 401 Unauthorized ProblemDetails response."""
    return ProblemDetails(
        type="https://api.example.com/errors/unauthorized",
        title="Unauthorized",
        status=401,
        detail=detail,
    )


def forbidden_error(detail: str = "You do not have permission to perform this action.") -> ProblemDetails:
    """Create a 403 Forbidden ProblemDetails response."""
    return ProblemDetails(
        type="https://api.example.com/errors/forbidden",
        title="Forbidden",
        status=403,
        detail=detail,
    )


def server_error(detail: str = "An unexpected error occurred.") -> ProblemDetails:
    """Create a 500 Internal Server Error ProblemDetails response."""
    return ProblemDetails(
        type="https://api.example.com/errors/internal-server-error",
        title="Internal Server Error",
        status=500,
        detail=detail,
    )
```

### Pattern 2: Centralized Exception Handler Middleware (BAD vs. GOOD)

A centralized exception handler converts all exceptions — framework-level and application-level — into RFC 7807 ProblemDetails responses before they reach the client. This ensures consistent formatting regardless of where an error originates.

```python
from fastapi import FastAPI, Request, HTTPException, status as http_status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

app = FastAPI()


# --- Application-specific exception types ---

class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist."""
    def __init__(self, resource: str, identifier: str):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found")


class DomainConflictError(Exception):
    """Raised when a state conflict prevents the operation (concurrent modification, duplicate)."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class PermissionDeniedError(Exception):
    """Raised when an authenticated user lacks required permissions."""
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action
        super().__init__(f"Permission denied: {action} on {resource}")


# --- Centralized exception handlers (registered with FastAPI) ---

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert FastAPI's built-in HTTPException to RFC 7807 ProblemDetails."""
    # Map common HTTP exceptions to their ProblemDetails equivalents
    if exc.status_code == 404:
        problem = not_found_error("resource", str(exc.detail))
    elif exc.status_code == 401:
        problem = unauthorized_error(exc.detail or "Authentication is required.")
    elif exc.status_code == 403:
        problem = forbidden_error(exc.detail or "Permission denied.")
    elif exc.status_code == 409:
        problem = conflict_error(exc.detail or "Conflict detected.")
    else:
        problem = ProblemDetails(
            type=f"https://api.example.com/errors/http-{exc.status_code}",
            title=exc.title or "Error",
            status=exc.status_code,
            detail=exc.detail,
            instance=str(request.url.path),
        )
    return problem.to_response(status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Convert Pydantic validation errors to RFC 7807 ProblemDetails with field details."""
    error_items = []
    for error in exc.errors():
        # Extract field path as dot-notation string
        loc = error.get("loc", ())
        # Filter out the 'body'/'query'/'path' prefix to get the actual field name
        field_parts = [str(p) for p in loc if p not in ("body", "query", "path", "header", "cookie")]
        field = ".".join(field_parts) if field_parts else str(error.get("input"))

        error_items.append(ValidationErrorDetail(
            field=field,
            message=error["msg"],
            code="validation_error",
        ))

    problem = validation_error(
        detail="One or more request fields failed validation.",
        errors=[e.model_dump() for e in error_items],
    )
    return problem.to_response(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY)


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError) -> JSONResponse:
    """Convert application-level not-found errors to RFC 7807 ProblemDetails."""
    problem = not_found_error(exc.resource, exc.identifier)
    return problem.to_response(status_code=http_status.HTTP_404_NOT_FOUND)


@app.exception_handler(DomainConflictError)
async def domain_conflict_handler(request: Request, exc: DomainConflictError) -> JSONResponse:
    """Convert domain conflict errors (ETag mismatch, duplicate key) to 409 ProblemDetails."""
    problem = conflict_error(exc.message)
    return problem.to_response(status_code=http_status.HTTP_409_CONFLICT)


@app.exception_handler(PermissionDeniedError)
async def permission_denied_handler(request: Request, exc: PermissionDeniedError) -> JSONResponse:
    """Convert permission errors to 403 Forbidden ProblemDetails."""
    problem = forbidden_error(f"Permission denied: {exc.action} on {exc.resource}")
    return problem.to_response(status_code=http_status.HTTP_403_FORBIDDEN)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected exceptions — never expose internals to the client."""
    # Log full details server-side (including stack trace) for debugging
    logger.exception("Unhandled exception in %s %s", request.method, request.url.path, exc_info=exc)

    problem = server_error(detail="An unexpected error occurred. Please try again later.")
    return problem.to_response(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Example endpoints using typed exceptions ---

@app.get("/users/{user_id}")
def get_user(user_id: str):
    """GET /users/{user_id} — Raises ResourceNotFoundError with consistent ProblemDetails."""
    user = db_get_user(user_id)  # Simulated database call
    if not user:
        raise ResourceNotFoundError(resource="user", identifier=user_id)
    return user


@app.delete("/orders/{order_id}")
def delete_order(order_id: str, etag: str | None = None):
    """DELETE /orders/{order_id} — Returns 409 on concurrent modification (ETag mismatch)."""
    order = db_get_order(order_id)
    if not order:
        raise ResourceNotFoundError(resource="order", identifier=order_id)

    # Conditional delete with ETag for optimistic locking
    if etag and order.get("_etag") != etag:
        raise DomainConflictError(
            f"Resource has been modified. Current ETag: {order.get('_etag')}"
        )

    db_delete_order(order_id)
    from fastapi import Response
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)


@app.put("/orders/{order_id}")
def update_order(order_id: str, body: dict):
    """PUT /orders/{order_id} — Returns 409 on ETag mismatch (optimistic concurrency)."""
    order = db_get_order(order_id)
    if not order:
        raise ResourceNotFoundError(resource="order", identifier=order_id)

    # Conditional PUT with If-Match header for optimistic locking
    from fastapi import Header
    return {"id": order_id, **body}  # Would include ETag check in production
```

### Pattern 3: Resource-Specific Error URIs and Typed Error Responses (BAD vs. GOOD)

Different error types map to specific URIs that can resolve to documentation. Each HTTP method can produce distinct conflict scenarios — DELETE returns 409 on concurrent modification, PUT returns 409 on ETag mismatch, POST returns 409 on duplicate key violations.

```python
# ❌ BAD: All errors use the same generic format with no error type URI
@app.exception_handler(Exception)
async def bad_global_handler(request: Request, exc: Exception):
    """Every error looks the same — clients can't programmatically distinguish error types."""
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)},  # No type, no title, no structured format
    )


# ✅ GOOD: Each error category has its own URI, typed response class, and method-specific handling
from fastapi import FastAPI, Request, Header
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import enum

app = FastAPI()


# --- Error type enumeration for machine-readable categorization ---

class ErrorCategory(str, enum.Enum):
    """Machine-readable error categories matching RFC 7807 error URIs."""
    VALIDATION_FAILED = "validation-failed"
    NOT_FOUND = "not-found"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    CONFLICT_CONCURRENT_MODIFICATION = "conflict-concurrent-modification"
    CONFLICT_ETAG_MISMATCH = "conflict-etag-mismatch"
    CONFLICT_DUPLICATE_KEY = "conflict-duplicate-key"
    METHOD_NOT_ALLOWED = "method-not-allowed"
    RATE_LIMITED = "rate-limited"
    INTERNAL_SERVER_ERROR = "internal-server-error"


def build_error_uri(category: ErrorCategory) -> str:
    """Construct the RFC 7807 error type URI for a given category.

    These URIs are stable and resolvable to documentation explaining
    each error type and how to resolve it.
    """
    base = "https://api.example.com/errors"
    return f"{base}/{category.value}"


class TypedErrorFactory:
    """Factory methods that build RFC 7807 ProblemDetails for each error category.

    Each method produces a response with the correct status code, error URI (type),
    and structured body appropriate for the specific failure scenario.
    """

    @staticmethod
    def not_found(resource: str, identifier: str) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.NOT_FOUND),
            title="Resource Not Found",
            status=404,
            detail=f"The requested {resource} (identifier: {identifier}) could not be found.",
        )

    @staticmethod
    def validation_failed(errors: list[ValidationErrorDetail]) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.VALIDATION_FAILED),
            title="Validation Failed",
            status=422,
            detail="One or more request fields failed validation.",
            errors=errors,
        )

    @staticmethod
    def conflict_concurrent_modification(resource: str, current_version: str) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.CONFLICT_CONCURRENT_MODIFICATION),
            title="Conflict — Concurrent Modification",
            status=409,
            detail=(
                f"The {resource} was modified by another request. "
                f"Current version: {current_version}. "
                f"Retry with the updated resource."
            ),
        )

    @staticmethod
    def conflict_etag_mismatch(resource: str, current_etag: str) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.CONFLICT_ETAG_MISMATCH),
            title="Conflict — ETag Mismatch",
            status=409,
            detail=(
                f"The {resource} has been modified since your last read. "
                f"Current ETag: \"{current_etag}\". Include the correct If-Match header."
            ),
        )

    @staticmethod
    def conflict_duplicate_key(field: str, value: str) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.CONFLICT_DUPLICATE_KEY),
            title="Conflict — Duplicate Key",
            status=409,
            detail=f"A resource with {field}='{value}' already exists.",
            errors=[ValidationErrorDetail(field=field, message=f"Value '{value}' is not unique.", code="duplicate_key")],
        )

    @staticmethod
    def method_not_allowed(allowed_methods: list[str]) -> ProblemDetails:
        return ProblemDetails(
            type=build_error_uri(ErrorCategory.METHOD_NOT_ALLOWED),
            title="Method Not Allowed",
            status=405,
            detail=f"The HTTP method is not allowed for this endpoint. Allowed methods: {', '.join(allowed_methods)}.",
        )


# --- Method-specific conflict handling examples ---

@app.delete("/orders/{order_id}")
def delete_order_with_etag(
    order_id: str,
    if_match: str | None = Header(None),
):
    """DELETE /orders/{order_id} — Conditional delete with optimistic locking.

    Returns 409 Conflict with typed error URI when ETag is provided and doesn't match.
    This handles the concurrent modification scenario where another request modified
    the order between the client's read and this delete.
    """
    order = db_get_order(order_id)
    if not order:
        problem = TypedErrorFactory.not_found("order", order_id)
        return problem.to_response(status_code=404)

    # If-Match header provided — enforce optimistic locking
    if if_match is not None and order.get("_etag") != if_match:
        problem = TypedErrorFactory.conflict_etag_mismatch("order", order.get("_etag", ""))
        return problem.to_response(status_code=409)

    db_delete_order(order_id)
    from fastapi import Response
    return Response(status_code=204)


@app.put("/orders/{order_id}")
def update_order_with_etag(
    order_id: str,
    body: dict,
    if_match: str | None = Header(None),
):
    """PUT /orders/{order_id} — Conditional PUT with optimistic concurrency control.

    Returns 409 Conflict when the If-Match ETag doesn't match the current resource version.
    This prevents lost updates from concurrent client edits.
    """
    order = db_get_order(order_id)
    if not order:
        problem = TypedErrorFactory.not_found("order", order_id)
        return problem.to_response(status_code=404)

    if if_match is not None and order.get("_etag") != if_match:
        problem = TypedErrorFactory.conflict_etag_mismatch("order", order.get("_etag", ""))
        return problem.to_response(status_code=409)

    updated = db_update_order(order_id, body)
    updated["_links"] = {"self": f"/orders/{order_id}"}
    return updated


@app.post("/users")
def create_user(body: dict):
    """POST /users — Create a user with duplicate key conflict handling.

    Returns 409 Conflict when the email address already exists in the database.
    Uses the CONFLICT_DUPLICATE_KEY error URI for programmatic client handling.
    """
    try:
        user = db_insert_user(body)
        return user
    except DuplicateKeyError as e:  # Simulated database constraint violation
        problem = TypedErrorFactory.conflict_duplicate_key("email", body.get("email", ""))
        return problem.to_response(status_code=409)
```

---

## Constraints

### MUST DO
- **Include all four required RFC 7807 fields** in every error response: `type` (resolvable URI), `title` (human-readable summary), `status` (HTTP status as integer), and `detail` (specific explanation). The `errors[]` array is required for validation failures.
- **Use correct HTTP status codes per RFC 9110**: 400 for malformed syntax, 401 for missing/invalid credentials, 403 for authenticated denial, 404 for missing resources, 405 for wrong HTTP method, 409 for state conflicts (concurrent modification, ETag mismatch, duplicate), 422 for semantic validation failures, 500 for unhandled exceptions.
- **Never expose stack traces, internal module paths, database queries, or infrastructure details** in any response. Log server-side only.
- **Use consistent error type URIs** across the entire API (`https://api.example.com/errors/{category}`) — these must be stable and resolvable to documentation.
- **Include `errors[]` field-level details** on every 422 Unprocessable Entity response, with each entry containing `field`, `message`, and `code`.

### MUST NOT DO
- Return errors with HTTP status 200 — all error conditions must use the appropriate error status code (4xx or 5xx). A 200 with an "error" field inside is indistinguishable from a successful response to automated clients.
- Use inconsistent error formats across endpoints — every endpoint must produce RFC 7807 ProblemDetails JSON through the centralized handler, never raw dicts or ad-hoc structures.
- Return different field names for errors (`message` vs `detail` vs `error_message`) — use the exact RFC 7807 field names: `type`, `title`, `status`, `detail`, `instance`, `errors`.
- Include database error messages directly in client responses (e.g., "duplicate key value violates unique constraint") — translate them into domain-appropriate error messages.

---

## Output Template

When implementing or reviewing REST API error handling with this skill active, produce:

1. **Error Response Contract** — A specification table listing every error type the API produces:

   | Error Type URI | HTTP Status | title | When Triggered |
   |---|---|---|---|
   | `https://api.example.com/errors/not-found` | 404 | Resource Not Found | Resource does not exist |
   | `https://api.example.com/errors/validation-failed` | 422 | Validation Failed | Pydantic/domain validation failure |
   | `https://api.example.com/errors/conflict-etag-mismatch` | 409 | Conflict — ETag Mismatch | If-Match header doesn't match current version |

2. **Sample Error Response** — A concrete RFC 7807 JSON body for the most common error scenario:

   ```json
   {
     "type": "https://api.example.com/errors/validation-failed",
     "title": "Validation Failed",
     "status": 422,
     "detail": "One or more request fields failed validation.",
     "instance": "/api/v1/orders",
     "errors": [
       {
         "field": "email",
         "message": "String does not match pattern: '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'",
         "code": "string_format"
       },
       {
         "field": "total",
         "message": "Input should be a finite number",
         "code": "type_error.float"
       }
     ]
   }
   ```

3. **Exception Handler Registration Map** — List each exception type and its corresponding handler function, ensuring no exceptions fall through to the generic catch-all without being converted to ProblemDetails.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-resource-modeling` | The resource model that this error handler supports — every endpoint's errors should reference the correct resource and status codes |
| `rest-api-security-patterns` | Security-specific errors (401, 403) produced by authentication/authorization middleware, formatted consistently as ProblemDetails |

---

## Live References

> Authoritative documentation links for RFC 7807 error handling. The model follows these references at load time to resolve external content.

- [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807.html) — Official specification defining the ProblemDetails JSON format with type, title, status, detail fields
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — HTTP status code definitions and semantics (4xx client errors, 5xx server errors)
- [FastAPI Exception Handlers](https://fastapi.tiangolo.com/advanced/custom-middleware/#exception-handlers) — FastAPI's built-in mechanism for registering global exception handlers
- [Pydantic Validation Errors](https://docs.pydantic.dev/latest/concepts/validation_examples/) — Pydantic error format and how to extract field-level details from ValidationError objects

> 📖 skill(local cache): rest-api-error-handling
