---
name: api-design
description: "Implements production REST API design patterns: resource modeling, unified error envelopes, Pydantic validation, rate limiting, OpenAPI docs, and versioning for maintainable backend systems."
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api design, restful api, resource modeling, pydantic validation, error envelope, api versioning, fastapi patterns, how do i design an api
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-code-review, coding-rest-api-testing, coding-fastapi-patterns
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, vague ideation, code golf, over-engineering]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# API Design Architect

I design and implement production-grade REST API interfaces that follow contract-first principles, enforce consistent error handling, structured input validation, rate limiting, and versioning strategies. When loaded, the model produces APIs where every endpoint has a predictable response shape, proper HTTP semantics, and comprehensive OpenAPI documentation.

## TL;DR Checklist

- [ ] Model resources as nouns with plural kebab-case paths (`/project-tasks`, not `/get_project_tasks`)
- [ ] Map HTTP methods to operations: GET=list/query, POST=create, PUT=full update, PATCH=partial, DELETE=remove
- [ ] Validate every input with Pydantic v2 models before it reaches handler logic
- [ ] Return a unified error envelope on every failure path
- [ ] Apply correct HTTP status codes (201 for create, 204 for delete, never 200 for errors)
- [ ] Include rate limit headers on every response
- [ ] Document all endpoints in OpenAPI with examples and response descriptions

---

## When to Use

Use this skill when:

- Designing a new REST API from scratch or refactoring an existing one
- Defining resource hierarchies and endpoint contracts for a backend service
- Implementing consistent error handling across multiple API endpoints
- Adding input validation, rate limiting, or API versioning to a FastAPI application
- Writing OpenAPI documentation that needs examples and response models
- Reviewing API design for HTTP semantics, status code correctness, and resource modeling

---

## When NOT to Use

Avoid this skill for:

- Building GraphQL APIs — use a GraphQL schema-first approach instead
- Defining gRPC service contracts — Protobuf/Protocol Buffers are the right tool
- Simple internal microservice communication where REST overhead is unnecessary (use gRPC or message queues)
- Batch operations involving thousands of records — design dedicated batch endpoints, not per-item REST calls

---

## Core Workflow

1. **Define Resource Model** — Identify all nouns in the domain as resources. Determine parent-child relationships and plan hierarchical paths. Example: `/orgs/{org-id}/projects/{project-id}/tasks` where tasks are nested under projects which are nested under organizations.

   **Checkpoint:** Every resource name must be plural, kebab-case, and map to a single entity concept. No verbs in paths.

2. **Design Endpoint Contracts** — Map HTTP methods to operations before writing any handler code:
   - `GET /tasks` → list tasks with pagination and filtering
   - `POST /tasks` → create a new task
   - `GET /tasks/{task-id}` → retrieve a single task
   - `PUT /tasks/{task-id}` → full replacement of a task
   - `PATCH /tasks/{task-id}` → partial update of selected fields
   - `DELETE /tasks/{task-id}` → remove a task

   **Checkpoint:** All request and response schemas are defined in Pydantic models before writing route handlers. No implicit shapes.

3. **Implement Validation Layer** — Use Pydantic v2 models for all input validation. Apply field constraints (`min_length`, `pattern`, `ge`, `le`) directly in model definitions rather than in handler logic. Separate Create, Read, Update (CRUD) schemas per resource to enforce different rules per operation.

   **Checkpoint:** Every endpoint references explicit request and response Pydantic models — never accept or return raw `dict` objects from handlers.

4. **Build Error Response Handler** — Implement a unified error envelope that returns consistent structure on every failure path: `{"error": {"code": "...", "message": "...", "details": []}}`. Register FastAPI exception handlers for `HTTPException`, `RequestValidationError`, and domain-specific exceptions to ensure no error slips through unenveloped.

   **Checkpoint:** Test that every exception type returns the same envelope shape with an appropriate HTTP status code and machine-readable error code.

5. **Add Rate Limiting & Idempotency** — Apply rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) to every response via a middleware or dependency. Document idempotency keys for POST operations. Ensure PUT and DELETE endpoints are naturally idempotent by design.

   **Checkpoint:** Verify rate limit headers appear on both success and error responses using a test client.

6. **Generate OpenAPI Documentation** — Use FastAPI's built-in OpenAPI generation with descriptive `summary` and `description` fields on every endpoint. Provide request body examples via `json_schema_extra` in Pydantic models and document each response code with its model and description.

   **Checkpoint:** Run the API locally, open `/docs`, and verify that every endpoint has a summary, parameters section, request body example (if applicable), and clear response descriptions.

---

## Implementation Patterns

### Pattern 1: Resource Modeling & CRUD Endpoints

Full FastAPI router showing proper resource hierarchy, typed request/response models, pagination params, and correct HTTP status codes. This pattern demonstrates hierarchical nesting (`/orgs/{org-id}/projects/{project-id}`), a `PaginatedResponse` wrapper for list endpoints, and distinct schemas for create vs update operations.

```python
from datetime import datetime
from enum import Enum
from typing import Annotated, Generic, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict

# --------------------------------------------------------------------------- #
# Schema Definitions
# --------------------------------------------------------------------------- #

class TaskStatus(str, Enum):
    """Allowed task status values."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class CreateTaskRequest(BaseModel):
    """Schema for creating a new task. Only required fields are enforced."""

    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: str | None = Field(None, max_length=5000, description="Optional description")
    status: TaskStatus = TaskStatus.TODO
    assignee_id: int = Field(..., ge=1, description="ID of the assigned user")


class UpdateTaskRequest(BaseModel):
    """Schema for partially updating a task. All fields are optional."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    status: TaskStatus | None = None
    assignee_id: int | None = Field(None, ge=1)


class TaskResponse(BaseModel):
    """Schema returned for single task retrieval and list items."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    status: TaskStatus
    assignee_id: int
    created_at: datetime
    updated_at: datetime


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response wrapper."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool = Field(..., alias="hasNext")
    has_prev: bool = Field(..., alias="hasPrev")


# --------------------------------------------------------------------------- #
# Router Definition
# --------------------------------------------------------------------------- #

router = APIRouter(tags=["tasks"])


@router.get(
    "/orgs/{org-id}/projects/{project-id}/tasks",
    response_model=PaginatedResponse[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="List project tasks",
    description=(
        "Return a paginated list of tasks for the specified project. "
        "Supports filtering by status and assignee."
    ),
    responses={
        404: {"description": "Project not found"},
    },
)
async def list_tasks(
    org_id: int,
    project_id: int,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    status_filter: TaskStatus | None = Query(None, description="Filter by task status"),
) -> PaginatedResponse[TaskResponse]:
    """List tasks with pagination and optional filtering."""

    # In production, query the database here.
    items = []  # Placeholder — replace with actual DB query
    total = len(items)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        hasNext=(page * page_size) < total,
        has_prev=page > 1,
    )


@router.post(
    "/orgs/{org-id}/projects/{project-id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    description="Create a new task within the specified project.",
)
async def create_task(
    org_id: int,
    project_id: int,
    body: CreateTaskRequest,
) -> TaskResponse:
    """Create a new task and return it with generated fields."""

    # In production: validate org/project ownership, persist to DB.
    response = TaskResponse(
        id=1,
        title=body.title,
        description=body.description,
        status=body.status,
        assignee_id=body.assignee_id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    return response


@router.get(
    "/orgs/{org-id}/projects/{project-id}/tasks/{task-id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve a task",
)
async def get_task(org_id: int, project_id: int, task_id: int) -> TaskResponse:
    """Return a single task by ID."""
    raise HTTPException(status_code=404, detail="Task not found")


@router.put(
    "/orgs/{org-id}/projects/{project-id}/tasks/{task-id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Full update of a task",
)
async def full_update_task(
    org_id: int, project_id: int, task_id: int, body: CreateTaskRequest
) -> TaskResponse:
    """Replace all mutable fields of a task."""
    raise HTTPException(status_code=404, detail="Task not found")


@router.patch(
    "/orgs/{org-id}/projects/{project-id}/tasks/{task-id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Partial update of a task",
)
async def partial_update_task(
    org_id: int, project_id: int, task_id: int, body: UpdateTaskRequest
) -> TaskResponse:
    """Update only the fields provided in the request body."""
    raise HTTPException(status_code=404, detail="Task not found")


@router.delete(
    "/orgs/{org-id}/projects/{project-id}/tasks/{task-id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
)
async def delete_task(org_id: int, project_id: int, task_id: int) -> None:
    """Remove a task. Returns 204 No Content on success."""
    raise HTTPException(status_code=404, detail="Task not found")
```

### Pattern 2: Unified Error Handling

Custom exception handler that maps domain exceptions and validation errors to a consistent error envelope with machine-readable error codes, user-facing messages, and structured details. This ensures API consumers can programmatically handle all error types without parsing arbitrary text.

```python
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class AppError(Exception):
    """Base application error with a machine-readable code and HTTP status."""

    def __init__(
        self,
        message: str,
        code: str = "internal_error",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: list[dict] | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} with id '{identifier}' not found",
            code="resource_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            details=[{"field": "id", "value": identifier}],
        )


class ValidationError as AppValidationError(AppError):
    def __init__(self, errors: list[dict]):
        super().__init__(
            message="Validation failed",
            code="validation_error",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=errors,
        )


# --------------------------------------------------------------------------- #
# Error Envelope Helper
# --------------------------------------------------------------------------- #

def error_response(
    code: str,
    message: str,
    status_code: int,
    details: list[dict] | None = None,
) -> JSONResponse:
    """Construct a standardized API error response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
            }
        },
    )


# --------------------------------------------------------------------------- #
# Exception Handlers — register on the FastAPI app
# --------------------------------------------------------------------------- #

app = FastAPI(title="Task Manager API")


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    """Handle application-level domain errors."""
    return error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors into the unified envelope."""
    details = []
    for err in exc.errors():
        field_path = " → ".join(str(loc) for loc in err["loc"] if loc not in ("body",))
        details.append(
            {
                "field": field_path or "(request body)",
                "message": err["msg"],
                "type": err["type"],
            }
        )
    return error_response(
        code="validation_error",
        message="One or more fields failed validation",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=details,
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all for unhandled exceptions — never leak internals to the client."""
    # Log the full traceback server-side; return a generic envelope.
    return error_response(
        code="internal_error",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
```

### Pattern 3: Input Validation & Rate Limiting (BAD vs GOOD)

This pattern demonstrates the contrast between unvalidated handlers that manually parse query parameters and the correct approach using Pydantic models with field constraints plus a dependency-injected rate limiter.

```python
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import Annotated

app = FastAPI(title="Task Manager API")


# =================================================================== #
# ❌ BAD — Manual query param parsing, no validation, inconsistent errors
# =================================================================== #

@app.get("/bad-tasks")
async def bad_list_tasks(
    status: str | None = None,
    assignee_id: str | None = None,
):
    """This endpoint accepts any string for status and assignee_id.
    No type coercion, no bounds checking, no validation schema."""

    # ❌ Bug: "12abc" passes as an integer — causes cryptic DB errors later
    if assignee_id is not None:
        assignee_id = int(assignee_id)  # May raise ValueError silently

    # ❌ Bug: status can be any random string, no enum enforcement
    valid_statuses = ("todo", "in_progress", "done")
    if status and status not in valid_statuses:
        return JSONResponse(
            status_code=400,  # ❌ Uses plain text detail, not envelope
            content={"detail": f"Invalid status: {status}"},
        )

    # No rate limit headers, no pagination, returns raw DB rows


# =================================================================== #
# ✅ GOOD — Pydantic v2 models with constraints + dependency-injected limiter
# =================================================================== #


class TaskFilterQuery(BaseModel):
    """Strongly-typed filter parameters with validation baked in."""

    status: str | None = Field(
        None,
        pattern="^(todo|in_progress|done)$",
        description="Filter by task status enum value",
    )
    assignee_id: int | None = Field(
        None,
        ge=1,
        description="Filter by assigned user ID (positive integer)",
    )
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


class RateLimitHeaders(BaseModel):
    """Rate limit information injected into response headers."""

    limit: int = Field(..., alias="X-RateLimit-Limit")
    remaining: int = Field(..., alias="X-RateLimit-Remaining")
    reset: int = Field(..., alias="X-RateLimit-Reset")


# Mock rate limiter — replace with Redis-backed implementation in production
def get_rate_limit_info(request: Request) -> dict[str, int]:
    """Determine the rate limit for the current request's client."""
    # In production: look up the client IP or API key in a counter store.
    return {"limit": 100, "remaining": 99, "reset": 1717000000}


@app.get(
    "/api/v1/tasks",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="List tasks with validation and rate limiting",
)
async def list_tasks_good(
    filters: TaskFilterQuery = ... ,
    request: Request,
):
    """Properly validated endpoint with rate limit headers."""

    # Rate limiter is applied transparently
    limits = get_rate_limit_info(request)

    response = JSONResponse(
        content={"items": [], "total": 0},
        headers={
            "X-RateLimit-Limit": str(limits["limit"]),
            "X-RateLimit-Remaining": str(limits["remaining"]),
            "X-RateLimit-Reset": str(limits["reset"]),
        },
    )

    # If rate exceeded, reject with proper status and envelope
    if limits["remaining"] <= 0:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={"Retry-After": "60"},
            content={
                "error": {
                    "code": "rate_limit_exceeded",
                    "message": "Too many requests. Please retry after the reset time.",
                    "details": [{"field": "rate-limit", "value": str(limits["reset"])}],
                }
            },
        )

    return response
```

---

## Constraints

### MUST DO

- Model resources as nouns with predictable plural kebab-case paths; use nested paths for hierarchical relationships (e.g., `/orgs/{org-id}/projects/{project-id}`)
- Return a unified error envelope on every failure path: `{"error": {"code": "...", "message": "...", "details": []}}`
- Validate ALL inputs with Pydantic v2 models — never trust raw request data directly in handlers; use separate schemas for create vs update operations
- Apply correct HTTP status codes consistently: 200 for GET/PUT/PATCH success, 201 for POST create, 204 for DELETE success, 404 for not found, 429 for rate limit exceeded
- Include rate limit headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (and `Retry-After` on 429 responses)
- Use PUT for idempotent full updates and PATCH for partial updates — never use POST for updates; only use POST to create new resources
- Version APIs via URI prefix (`/api/v1/`) with `Deprecation` and `Sunset` headers when introducing breaking changes that require clients to migrate
- Document every endpoint in OpenAPI with a summary, description, request body examples via `json_schema_extra`, and response model descriptions for each status code

### MUST NOT DO

- Expose internal database column names or ORM objects directly as API responses — always map through explicit Pydantic response models
- Use query parameters for complex filtering/search — define dedicated filter endpoints with structured request bodies for anything beyond simple status/ID filters
- Return 200 status codes for error conditions — use proper HTTP status codes consistently so clients can differentiate success from failure programmatically
- Bypass input validation to "handle errors in the handler" — validate early with Pydantic models at the boundary, never accept raw strings and cast later
- Mix resource types in a single response endpoint (e.g., returning both users and orders in one list) — each endpoint should return one resource type or a clearly defined aggregate
- Use snake_case in API paths — always use kebab-case for path segments (`/project-tasks`, not `/project_tasks`) to follow REST convention

---

## Output Template

When this skill is active, the model's output for an API design task must contain:

1. **Resource Model** — List of resources as nouns with their hierarchical relationships and path definitions
2. **Endpoint Contract Table** — HTTP method, full path, request body schema name (if POST/PUT/PATCH), response schema name, status codes for each endpoint
3. **Pydantic Schema Definitions** — All request/response models with field constraints, types, and descriptions
4. **Error Envelope Definition** — The unified error structure and exception handlers that produce it
5. **Rate Limiting Strategy** — How rate limits are determined, which headers are injected, and how 429 responses look
6. **OpenAPI Documentation Snippet** — At minimum the `summary`, `description`, and `responses` for each endpoint with example values

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Review API code for correctness, security, and adherence to these design patterns |
| `coding-rest-api-testing` | Write integration tests that validate API contracts, error envelopes, and status codes |
| `coding-fastapi-patterns` | Deep-dive into FastAPI-specific patterns including dependency injection, background tasks, and middleware |

---

## Live References

> Authoritative documentation links for REST API design with FastAPI.

- [FastAPI Documentation](https://fastapi.tiangolo.com/) — Official guide covering routing, request/response models, validation, and OpenAPI generation
- [PEP 572 — Assignment Expressions](https://peps.python.org/pep-0572/) — Python 3.8+ syntax used in modern FastAPI handlers
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/) — Field constraints, validators, and model configuration
- [REST API Design Rulebook](https://www.oreilly.com/library/view/rest-api-design/9781449317907/) — O'Reilly reference for resource modeling, HTTP semantics, and versioning strategies
- [RFC 9110 — HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110) — Official specification for HTTP methods, status codes, and headers
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0) — Contract definition format that FastAPI uses natively
