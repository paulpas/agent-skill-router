---




name: graphql-error-handling-validation
description: Implements GraphQL error handling and input validation using typed error
  result unions, Pydantic v2 field validation, error code enums, and middleware-level
  exception handling for production APIs.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: graphql error handling, graphql validation, input validation, pydantic
    graphql, strawberry errors, graphql error codes, graphql middleware
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
  related-skills: graphql-schema-design, graphql-dataloader-pattern, graphql-subscriptions




---




# GraphQL Error Handling and Validation

Implements production-grade GraphQL error handling and input validation using typed result unions, Pydantic v2 field-level constraints, machine-readable error code enums, and middleware-level exception handlers. Ensures clients receive structured, actionable errors while server internals remain fully shielded.

## TL;DR Checklist

- [ ] Design every mutation return type as a discriminated union of `SuccessResult` and typed error variants (`NotFoundError`, `ValidationError`, `UnauthorizedError`)
- [ ] Apply Pydantic v2 `@model_validator` and `@field_validator` on Strawberry input types for automatic validation before resolvers execute
- [ ] Define an `ErrorCode` enum with machine-readable codes (e.g., `USER_NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`) for client-side error routing
- [ ] Implement middleware-level exception handlers that log stack traces to server logs and return user-friendly structured GraphQL errors
- [ ] Never expose internal stack traces, database connection strings, SQL queries, or file paths in any client-facing error response
- [ ] Support partial success in batch operations by returning `PartialSuccessResult` with both successful items and per-item error details

---

## When to Use

Use this skill when:

- Designing mutation return types that need to distinguish between success, not-found, validation failure, and authorization errors
- Building input validation logic for GraphQL mutations where field-level constraints (email format, numeric ranges, required fields) must be enforced before resolver execution
- Implementing a centralized error handling strategy across a GraphQL API so all resolvers return errors in a consistent format
- Setting up middleware to catch unhandled exceptions, log them server-side, and return safe user-facing error messages
- Building batch operations where some items succeed and others fail, requiring partial success responses

---

## When NOT to Use

Avoid this skill for:

- Designing the overall schema structure (types, interfaces, unions) — use `graphql-schema-design` for that concern
- Optimizing resolver data fetching or batching — use `graphql-dataloader-pattern` for N+1 optimization
- Simple queries with no error conditions — if a query field can only succeed (e.g., `currentUser`), a typed result union is overkill; return the entity directly

---

## Core Workflow

### 1. Design Error Result Types as Union of Success and Typed Error Variants

Every mutation that can fail should return a discriminated union type, not a nullable entity or a bare boolean. Define concrete error types (`NotFoundError`, `ValidationError`, `UnauthorizedError`) with structured fields (`message`, `code`, `field` where applicable). This enables client-side error routing: the UI shows different widgets for validation errors vs. authorization errors vs. not-found errors.

**Checkpoint:** Every mutation return type is either a union of `(SuccessType, ErrorType1, ErrorType2, ...)` or explicitly documented as "always succeeds." If a field has no explicit success/error typing, it defaults to returning the entity directly (which is only appropriate for queries with no failure modes).

### 2. Apply Pydantic-Based Validation at Input Layer Before Resolvers Execute

Use Pydantic v2 models with `@field_validator` and `@model_validator` decorators on Strawberry input types. When combined with Strawberry's automatic input validation, invalid payloads are rejected at parse time — before the resolver even begins execution. This moves validation from scattered resolver-level checks to a centralized, declarative schema definition.

**Checkpoint:** Every mutation input type has at least one `@field_validator` or `@model_validator`. Fields use `Field()` constraints (min_length, max_length, ge, le, pattern, strict) where applicable. The validation runs automatically when Strawberry deserializes the input argument.

### 3. Define ErrorCode Enum for Machine-Readable Error Classification

Every error type includes an `ErrorCode` enum value that clients can match against programmatically. This enables consistent client-side behavior: retry on `RATE_LIMITED`, show inline form errors on `VALIDATION_FAILED`, redirect to login on `UNAUTHORIZED`. The human-readable `message` field supplements the code for UI display.

**Checkpoint:** Every error type in your union has a unique, descriptive `ErrorCode` value. No two error types share the same code. Codes use UPPER_SNAKE_CASE and follow the pattern `{DOMAIN}_{ERROR_TYPE}` (e.g., `USER_NOT_FOUND`, `ORDER_INSUFFICIENT_STOCK`).

### 4. Implement Middleware-Level Exception Handling to Log Server-Side, Return User-Friendly Errors

Unhandled exceptions in resolvers should be caught by middleware, logged with full stack traces to server-side logs, and converted into a structured GraphQL error response. The client receives a safe error message (e.g., "An unexpected error occurred") while the server retains diagnostic information (full exception type, stack trace, request context).

**Checkpoint:** All production error responses contain `message`, `code`, and optionally `extensions` fields. No raw Python traceback, SQL statement, or internal class name appears in the client response. Verify by intentionally raising an unhandled exception and inspecting the GraphQL response body.

### 5. Never Expose Internal Stack Traces or Database Details to Clients

This is a security requirement, not just a design choice. Every production API must sanitize error responses to prevent information leakage. Stack traces reveal internal file paths, framework versions, and query structures. Database connection strings reveal infrastructure topology. SQL error messages reveal schema structure.

**Checkpoint:** Run automated tests that intentionally trigger database errors, import errors, and division-by-zero in resolvers. Verify the client response contains only safe message text without any path names, SQL fragments, or class hierarchy details.

### 6. Use Partial Success Responses When Some Items Fail in Batch Operations

Batch mutations (e.g., "update all selected items") should never fail entirely when some items succeed. Instead, return a `PartialSuccessResult` containing both the successfully processed items and per-item error details. This allows clients to show exactly which operations succeeded and which failed, enabling selective retry or user feedback.

**Checkpoint:** Every batch mutation returns either a typed success result with all items processed, or a `PartialSuccessResult` with separate lists for successful results and errors. No batch mutation uses an "all-or-nothing" failure model when partial results are meaningful.

---

## Implementation Patterns

### Pattern 1: Typed Error Result Unions

Replace nullable returns (`User | None`) and bare booleans with discriminated unions of success and error types. Each error type carries structured fields that clients can inspect to determine the correct UI behavior.

```python
import strawberry
from enum import Enum
from typing import List, Optional, Union


# ─── Error Code Enum ──────────────────────────────────────────────────────────

class ErrorCode(str, Enum):
    """Machine-readable error codes for client-side error routing.

    Each code uniquely identifies the error category and maps to a specific
    client-side handling strategy (retry, show form error, redirect login, etc.)
    """
    # Authentication / Authorization errors
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"

    # Not found errors
    USER_NOT_FOUND = "USER_NOT_FOUND"
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"

    # Validation errors
    VALIDATION_FAILED = "VALIDATION_FAILED"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"

    # Business logic errors
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    ORDER_ALREADY_SHIPPED = "ORDER_ALREADY_SHIPPED"
    PAYMENT_DECLINED = "PAYMENT_DECLINED"

    # System errors
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ─── Typed Error Result Types ────────────────────────────────────────────────

@strawberry.type(description="Error response for authentication failures")
class UnauthorizedError:
    """Returned when the request lacks valid authentication credentials."""

    message: str = strawberry.field(
        description="Human-readable error message for the client",
    )
    code: ErrorCode = ErrorCode.UNAUTHORIZED

    @strawberry.field(description="Additional context from server logs (not shown to user)")
    def trace_id(self) -> Optional[str]:
        """Unique request trace ID for support ticket correlation."""
        return None  # Populated by middleware from request context


@strawberry.type(description="Error response for authorization failures")
class ForbiddenError:
    """Returned when the user is authenticated but lacks required permissions."""

    message: str = strawberry.field(
        description="Human-readable explanation of why access was denied",
    )
    code: ErrorCode = ErrorCode.FORBIDDEN
    required_scope: Optional[str] = strawberry.field(
        default=None,
        description="The scope or role the user lacks",
    )


@strawberry.type(description="Error response when a requested entity is not found")
class NotFoundError:
    """Returned when a queried entity does not exist in the database."""

    message: str = strawberry.field(description="Entity type and identifier not found")
    code: ErrorCode
    entity_type: Optional[str] = strawberry.field(
        default=None,
        description="The GraphQL type name that was not found (e.g., 'User', 'Order')",
    )


@strawberry.type(description="Error response for input validation failures")
class ValidationError:
    """Returned when mutation input fails field-level validation constraints.

    Contains per-field error details so clients can highlight specific form fields.
    """

    message: str = strawberry.field(
        description="Summary of all validation errors",
    )
    code: ErrorCode = ErrorCode.VALIDATION_FAILED
    field_errors: List["FieldError"] = strawberry.field(
        description="Per-field validation error details",
    )


@strawberry.type(description="A single field validation error")
class FieldError:
    """Error details for a specific input field."""

    field: str = strawberry.field(description="Name of the invalid field")
    message: str = strawberry.field(description="Human-readable description of the validation failure")
    code: ErrorCode = ErrorCode.VALIDATION_FAILED


@strawberry.type(description="Error response when an operation is rate-limited")
class RateLimitedError:
    """Returned when the client has exceeded the allowed request rate."""

    message: str = strawberry.field(description="Rate limit exceeded; please retry after backoff")
    code: ErrorCode = ErrorCode.RATE_LIMITED
    retry_after_seconds: int = strawberry.field(
        description="Recommended number of seconds to wait before retrying",
    )


# ─── Success Result Types ────────────────────────────────────────────────────

@strawberry.type(description="Successfully created user")
class CreateUserSuccess:
    user: "User"
    message: str = "User created successfully"


@strawberry.type(description="Successfully updated user profile")
class UpdateUserSuccess:
    user: "User"
    changed_fields: List[str] = strawberry.field(
        description="List of field names that were actually modified",
    )


# ─── Discriminated Union Types for Mutation Returns ──────────────────────────

# ✅ GOOD — Mutation returns explicit union of success and all possible errors
CreateUserResult = Union[
    CreateUserSuccess,
    NotFoundError,           # If parent entity not found
    ValidationError,         # If input validation fails
    ForbiddenError,          # If user lacks permission to create users
]


@strawberry.type(description="Root mutation type with typed error returns")
class Mutation:
    @strawberry.mutation(description="Create a new user account")
    async def create_user(self, info, input: "CreateUserInput") -> CreateUserResult:
        """Returns CreateUserSuccess on success, or a typed error variant.

        Client-side code can inspect the result type to determine UI behavior:
        - CreateUserSuccess → redirect to dashboard
        - ValidationError → show inline form errors for specific fields
        - ForbiddenError → show access denied message
        - NotFoundError → show "parent entity not found" error
        """
        # ... implementation uses typed returns ...
        return CreateUserSuccess(
            user=await _create_user_from_input(input),
            message="User created successfully",
        )


# ❌ BAD — Nullable return hides error context completely
@strawberry.type
class BadMutation:
    @strawberry.mutation(description="Create a new user")
    async def create_user(self, info, input: "CreateUserInput") -> Optional["User"]:
        """Returns None on failure with no indication of why.

        Client receives {createUser: null} and has no way to distinguish:
        - User not found? Validation failed? Permission denied? Rate limited?
        This forces the client to either show a generic error or make another
        query to diagnose the problem.
        """
        try:
            user = await _create_user_from_input(input)
            return user
        except Exception:
            return None  # All error information lost


# ❌ BAD — Boolean return provides zero diagnostic information
@strawberry.type
class WorseMutation:
    @strawberry.mutation(description="Create a new user")
    async def create_user(self, info, input: "CreateUserInput") -> bool:
        """Returns True on success, False on failure.

        Absolutely no error information is communicated to the client.
        This is worse than nullable because it gives a false sense of success
        (the user thinks they can retry and it might work).
        """
        try:
            await _create_user_from_input(input)
            return True
        except Exception:
            return False


### Pattern 2: Pydantic Field Validation Integrated with Strawberry Inputs

Pydantic v2 field validators run automatically during Strawberry's argument deserialization. This means validation errors occur before the resolver even starts, saving computational resources and ensuring consistent error formats across all resolvers using the same input type.

```python
# ✅ GOOD — Pydantic v2 input model with comprehensive field validation
from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class CreateUserInput(BaseModel):
    """User creation input with Pydantic v2 field-level validation.

    All constraints are declared declaratively. Strawberry automatically
    deserializes the GraphQL argument into this model and raises a
    ValidationError if any constraint is violated.
    """

    # Required fields with type enforcement and constraints
    email: EmailStr = Field(
        min_length=5,
        max_length=320,
        description="Valid email address for account login",
        examples=["alice@example.com"],
    )
    display_name: str = Field(
        min_length=1,
        max_length=100,
        description="Human-readable display name shown in the UI",
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Account password — must be at least 8 characters",
    )

    # Optional fields with constraints
    role: UserRole = UserRole.VIEWER
    age: Optional[int] = Field(default=None, ge=13, le=150)
    bio: Optional[str] = Field(default=None, max_length=500)

    @field_validator("display_name")
    @classmethod
    def display_name_no_special_chars(cls, value: str) -> str:
        """Reject display names containing angle brackets or script tags."""
        import re
        if re.search(r'[<>]', value):
            raise ValueError("Display name cannot contain < or > characters")
        return value.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        """Enforce minimum password complexity requirements."""
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit")
        return value

    @field_validator("bio")
    @classmethod
    def sanitize_bio(cls, value: Optional[str]) -> Optional[str]:
        """Strip HTML tags from bio to prevent stored XSS."""
        if value is None:
            return None
        import re
        sanitized = re.sub(r"<[^>]*>", "", value)
        return sanitized.strip()

    @model_validator(mode="after")
    def email_not_already_registered(self) -> "CreateUserInput":
        """Cross-field validation that checks the database.

        Note: In production, avoid database lookups in validators as they
        slow down validation. Instead, handle this as a business logic error
        inside the resolver after validation passes.
        """
        # This is a simplified example — real implementation would check DB
        return self


# ❌ BAD — Manual validation scattered inside each resolver
@strawberry.type
class BadValidationMutation:
    @strawberry.mutation(description="Create user with manual validation")
    async def create_user(
        self,
        info,
        email: str,
        display_name: str,
        password: str,
    ) -> CreateUserResult:
        """Validates each field manually inside the resolver — error-prone and inconsistent."""
        # Every new developer must remember to add all these checks
        if not "@" in email:
            return ValidationError(
                message="Invalid email format",
                field_errors=[FieldError(field="email", message="Must contain @")],
            )

        if len(display_name) > 100:
            return ValidationError(
                message="Display name too long",
                field_errors=[FieldError(field="display_name", message="Max 100 characters")],
            )

        if len(password) < 8:
            return ValidationError(
                message="Password too short",
                field_errors=[FieldError(field="password", message="Min 8 characters")],
            )

        # ... more manual checks ...
        user = await _create_user(email, display_name, password)
        return CreateUserSuccess(user=user, message="User created")


# ✅ GOOD — Pydantic model handles all validation; resolver only handles business logic
@strawberry.type
class GoodValidationMutation:
    @strawberry.mutation(description="Create user with declarative validation")
    async def create_user(
        self,
        info,
        input: CreateUserInput,  # Strawberry validates this before the resolver runs
    ) -> CreateUserResult:
        """No manual validation needed — Pydantic already ensured all fields are valid.

        Resolver focuses exclusively on business logic: creating the user,
        sending welcome email, updating analytics, etc.
        """
        # At this point: email is valid format, password meets complexity,
        # display_name has no special chars, bio is HTML-free.
        user = await _create_user_from_input(input)
        return CreateUserSuccess(user=user, message="User created")
```

### Pattern 3: Error Code Enum for Client-Side Error Handling

Client applications route error handling based on error codes rather than parsing human-readable messages (which can change with translations or rewrites). Define a central `ErrorCode` enum shared between server and client SDKs.

```python
import strawberry
from typing import Dict, List, Optional


# ─── Shared ErrorCode Enum (also exported to TypeScript client) ──────────────

class ErrorCode(str, Enum):
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    PAYMENT_DECLINED = "PAYMENT_DECLINED"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ─── Client-Side Error Handler Example (TypeScript for illustration) ────────
#
# // TypeScript client SDK — matches the ErrorCode enum exactly
# function handleGraphQLError(error: GraphQLError): void {
#   switch (error.extensions?.code) {
#     case "UNAUTHORIZED":
#       redirect("/login");
#       break;
#     case "TOKEN_EXPIRED":
#       refreshToken().then(() => retry());
#       break;
#     case "VALIDATION_FAILED":
#       showFieldErrors(error.extensions?.fieldErrors);
#       break;
#     case "RATE_LIMITED":
#       startBackoffTimer(error.extensions?.retryAfterSeconds);
#       break;
#     case "INTERNAL_ERROR":
#       showError("Something went wrong. Please try again.");
#       logToSentry(error);
#       break;
#   }
# }

# ─── Server-Side Error Code Mapping ──────────────────────────────────────────

ERROR_CODE_MAP: Dict[type, ErrorCode] = {
    # Map Python exception types to GraphQL error codes
    ValueError: ErrorCode.VALIDATION_FAILED,
    FileNotFoundError: ErrorCode.USER_NOT_FOUND,
    PermissionError: ErrorCode.FORBIDDEN,
    TimeoutError: ErrorCode.RATE_LIMITED,
    psycopg2.Error: ErrorCode.INTERNAL_ERROR,  # Database errors → generic internal error
    ConnectionError: ErrorCode.INTERNAL_ERROR,
    asyncio.TimeoutError: ErrorCode.RATE_LIMITED,
}


def map_exception_to_error_code(exc: Exception) -> ErrorCode:
    """Map a Python exception to the appropriate GraphQL ErrorCode.

    Uses isinstance checks against the ERROR_CODE_MAP for type hierarchy support.
    Falls back to INTERNAL_ERROR for unhandled exception types.
    """
    for exc_type, code in ERROR_CODE_MAP.items():
        if isinstance(exc, exc_type):
            return code
    return ErrorCode.INTERNAL_ERROR


# ✅ GOOD — Middleware uses error code map for consistent classification
async def error_handling_middleware(next_fn, root, info, **args):
    """Middleware that catches exceptions and returns structured GraphQL errors.

    This middleware wraps every resolver execution:
    1. Try to resolve the field normally
    2. On exception: log full traceback server-side, classify with ErrorCode enum
    3. Return a safe error response without internal details
    """
    try:
        return await next_fn(root, info, **args)
    except PermissionError as exc:
        # Security-sensitive — always log at ERROR level regardless of log level
        import logging
        logger = logging.getLogger("graphql.middleware.auth")
        logger.error(
            "Permission denied on field '%s' for user '%s': %s",
            info.field_name,
            info.context.get("user_id", "anonymous"),
            exc,
            exc_info=True,  # Full stack trace in server logs ONLY
        )
        raise GraphQLFormattedError(
            message="You do not have permission to access this resource",
            extensions={
                "code": ErrorCode.FORBIDDEN.value,
                "field": info.field_name,
            },
        ) from exc

    except Exception as exc:
        # All other unhandled exceptions — log server-side, return safe message
        import logging
        logger = logging.getLogger("graphql.middleware.errors")
        logger.error(
            "Unhandled exception in '%s': %s",
            info.field_name,
            exc,
            exc_info=True,  # Full stack trace in server logs ONLY
        )

        error_code = map_exception_to_error_code(exc)

        raise GraphQLFormattedError(
            message="An unexpected error occurred. Please try again later.",
            extensions={
                "code": error_code.value,
                "trace_id": info.context.get("trace_id"),
            },
        ) from exc  # Keep exception chain for server-side debugging


# ❌ BAD — No middleware; each resolver handles its own exceptions differently
@strawberry.type
class BadErrorHandlingMutation:
    @strawberry.mutation(description="Update user")
    async def update_user(self, info, input: "UpdateUserInput") -> UpdateResult:
        try:
            user = await _update_user(input)
            return UpdateSuccess(user=user)
        except ValueError as exc:
            # Resolver A returns error code "VALIDATION"
            raise Exception({"code": "VALIDATION", "message": str(exc)})
        except FileNotFoundError:
            # Resolver B returns error code "NOT_FOUND"
            raise Exception({"code": "NOT_FOUND", "message": "User not found"})
        except Exception as exc:
            # Resolver C returns the raw exception string (SECURITY ISSUE!)
            raise Exception({"code": "ERROR", "message": str(exc)})  # Leaks internal details!


### Pattern 4: Middleware Exception Handler with Server-Side Logging

Production middleware catches all unhandled exceptions, logs full diagnostics server-side, and returns structured error responses. The key principle: log everything internally, expose nothing to clients.

```python
from typing import Any, Dict, Optional
import logging
import traceback


logger = logging.getLogger("graphql.middleware.errors")


class GraphQLFormattedError(Exception):
    """Custom exception that carries structured GraphQL error information.

    Middleware catches this and formats it into the GraphQL errors response array.
    """

    def __init__(
        self,
        message: str,
        extensions: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None,
    ):
        super().__init__(message)
        self.message = message
        self.extensions = extensions or {}
        self.original_exception = original_exception


def graphql_error_handler(exc: Exception, root, info, **args) -> Dict[str, Any]:
    """Error formatter that converts exceptions into GraphQL-compliant error objects.

    This is the single point where all unhandled exceptions are converted to
    GraphQL error responses. It enforces the security rule: never expose
    internal details to clients.

    Args:
        exc: The exception that was raised by a resolver.
        root: The parent object being resolved.
        info: The GraphQL resolve info containing field and context data.
        **args: Additional arguments passed to the resolver.

    Returns:
        A dict conforming to the GraphQL Error specification:
        {
            "message": str,           # Human-readable (safe) message for client
            "extensions": {           # Machine-readable error classification
                "code": str,          # ErrorCode enum value
                "field": str | None,  # The field that failed
                "trace_id": str | None,  # Server-side trace for support tickets
            },
        }
    """
    import uuid

    # Generate a unique trace ID for this error (for server-side debugging)
    trace_id = str(uuid.uuid4())

    # ─── SERVER-SIDE: Full diagnostic logging ──────────────────────────
    logger.error(
        "GraphQL Error [trace_id=%s] field=%s type=%s message=%s\n%s",
        trace_id,
        getattr(info, "field_name", "unknown"),
        type(exc).__qualname__,
        str(exc)[:500],  # Cap logged message length
        "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
    )

    # ─── CLIENT-SIDE: Safe error response ──────────────────────────────
    error_code = map_exception_to_error_code(exc)
    field_name = getattr(info, "field_name", None)

    if isinstance(exc, GraphQLFormattedError):
        # Already-formatted error from middleware — use its message and extensions
        return {
            "message": exc.message,
            "extensions": {
                **exc.extensions,
                "trace_id": trace_id,
            },
        }

    if isinstance(exc, ValueError) or isinstance(exc, TypeError):
        # Validation errors get a specific code but safe message
        return {
            "message": "Invalid input provided. Please check your request.",
            "extensions": {
                "code": ErrorCode.VALIDATION_FAILED.value,
                "field": field_name,
                "trace_id": trace_id,
            },
        }

    if isinstance(exc, PermissionError):
        return {
            "message": "You do not have permission to access this resource.",
            "extensions": {
                "code": ErrorCode.FORBIDDEN.value,
                "field": field_name,
                "trace_id": trace_id,
            },
        }

    if isinstance(exc, (FileNotFoundError, KeyError)):
        return {
            "message": "The requested resource was not found.",
            "extensions": {
                "code": ErrorCode.USER_NOT_FOUND.value,
                "field": field_name,
                "trace_id": trace_id,
            },
        }

    if isinstance(exc, (asyncio.TimeoutError, ConnectionError)):
        return {
            "message": "The service is temporarily unavailable. Please try again.",
            "extensions": {
                "code": ErrorCode.RATE_LIMITED.value,
                "retry_after_seconds": 5,
                "field": field_name,
                "trace_id": trace_id,
            },
        }

    # ─── Fallback: catch-all for any unhandled exception type ──────────
    return {
        "message": "An unexpected error occurred. Our team has been notified.",
        "extensions": {
            "code": ErrorCode.INTERNAL_ERROR.value,
            "trace_id": trace_id,  # Support team can look up this ID in server logs
        },
    }


# ─── Strawberry Schema Configuration with Error Middleware ───────────────────

import strawberry as strawberry_lib


def create_schema() -> strawberry_lib.Schema:
    """Create the GraphQL schema with error handling middleware configured.

    The `error_handler` parameter is called for every unhandled exception
    in any resolver across the entire schema. This provides centralized,
    consistent error handling without needing try/except in every resolver.
    """
    schema = strawberry_lib.Schema(
        query=Query,
        mutation=Mutation,
        types=[CreateUserSuccess],  # All result types
    )

    # Configure the error handler — this is called for ALL unhandled exceptions
    schema._executor.error_handler = graphql_error_handler  # type: ignore

    return schema


# ❌ BAD — No centralized error handling; errors leak through as raw exceptions
schema_no_handler = strawberry.Schema(query=Query)
# This will return the raw Python exception string in the GraphQL response,
# including stack traces and internal class names. SECURITY VULNERABILITY.
```

### Pattern 5: Partial Success for Batch Operations

Batch mutations should never fail entirely when some items succeed. Return a typed partial success result containing both successful results and per-item errors. This enables clients to show granular feedback.

```python
@strawberry.type(description="Per-item result in a batch operation")
class BatchItemResult:
    item_id: strawberry.ID = strawberry.field(
        description="The ID of the processed item",
    )
    success: bool = strawberry.field(
        description="Whether this individual item was processed successfully",
    )


@strawberry.type(description="Error detail for a single failed batch item")
class BatchItemError:
    item_id: strawberry.ID
    error_code: ErrorCode
    message: str


@strawberry.type(description="Partial success result — some items succeeded, others failed")
class PartialBatchResult:
    """Returned when a batch mutation processes multiple items and some fail.

    Clients can use this to show per-item success/error indicators in the UI:
    - green checkmark for successful items
    - red X with message for failed items
    - allow selective retry of only the failed items
    """
    total_count: int = strawberry.field(description="Total number of items in the batch")
    succeeded_count: int = strawberry.field(description="Number of items processed successfully")
    failed_count: int = strawberry.field(description="Number of items that failed")
    successful_items: List[BatchItemResult] = strawberry.field(
        description="Results for items that were processed successfully",
    )
    failed_items: List[BatchItemError] = strawberry.field(
        description="Error details for items that failed processing",
    )


# ✅ GOOD — Batch mutation returns partial success with per-item details
@strawberry.type
class Mutation:
    @strawberry.mutation(description="Update status for multiple orders")
    async def bulk_update_order_status(
        self,
        info,
        order_ids: List[strawberry.ID],
        new_status: "OrderStatus",
    ) -> PartialBatchResult:
        """Process a batch of order status updates.

        Each order is processed independently. Failures for one order do not
        affect the processing of other orders in the batch. All results are
        returned with per-item success/failure information.
        """
        successful_items: List[BatchItemResult] = []
        failed_items: List[BatchItemError] = []

        for order_id in order_ids:
            try:
                # Each item is processed independently
                await _update_order_status(str(order_id), new_status)
                successful_items.append(BatchItemResult(
                    item_id=order_id,
                    success=True,
                ))
            except FileNotFoundError:
                failed_items.append(BatchItemError(
                    item_id=order_id,
                    error_code=ErrorCode.ORDER_NOT_FOUND,
                    message="Order not found in system",
                ))
            except PermissionError:
                failed_items.append(BatchItemError(
                    item_id=order_id,
                    error_code=ErrorCode.FORBIDDEN,
                    message="You do not have permission to update this order",
                ))
            except Exception as exc:
                # Unexpected errors get the generic code (safe for client)
                failed_items.append(BatchItemError(
                    item_id=order_id,
                    error_code=ErrorCode.INTERNAL_ERROR,
                    message="An unexpected error occurred during processing",
                ))

        return PartialBatchResult(
            total_count=len(order_ids),
            succeeded_count=len(successful_items),
            failed_count=len(failed_items),
            successful_items=successful_items,
            failed_items=failed_items,
        )


# ❌ BAD — All-or-nothing batch failure loses all successful work
@strawberry.type
class BadBatchMutation:
    @strawberry.mutation(description="Update multiple orders")
    async def bulk_update_orders(self, info, order_ids: List[strawberry.ID], new_status: "OrderStatus") -> bool:
        """Fails entirely if ANY single item fails — even if 99 of 100 succeeded.

        This is frustrating for clients who must retry the entire batch from scratch
        after a single failure, and it wastes work already completed successfully.
        """
        for order_id in order_ids:
            await _update_order_status(str(order_id), new_status)  # Crashes on first error
        return True  # Only reached if ALL items succeeded

```

---

## Constraints

### MUST DO

1. **Return typed result unions for every mutation** — Every mutation should return a discriminated union of success and error types (`CreateUserResult = Union[CreateUserSuccess, ValidationError, ForbiddenError]`). This gives clients structured, routable error information rather than nullable returns or raw exception strings.

2. **Use Pydantic v2 validators on all mutation input types** — Every `@strawberry.input` should have an equivalent Pydantic model with `@field_validator` and `@model_validator` decorators. Field constraints (`Field(min_length=..., pattern=...)`) catch invalid data at parse time before the resolver executes.

3. **Define an ErrorCode enum shared between server and client** — Use UPPER_SNAKE_CASE codes grouped by domain (e.g., `USER_NOT_FOUND`, `ORDER_INSUFFICIENT_STOCK`). Export this enum to the TypeScript/JavaScript client SDK so error routing is type-safe on both sides.

4. **Implement middleware-level exception handling with centralized formatting** — Use a single error formatter function (`graphql_error_handler`) that converts all exceptions to GraphQL-compliant error objects. Log full stack traces server-side; return safe messages to clients.

5. **Return partial success results for batch operations** — Never fail an entire batch when some items succeed. Return structured results with per-item success/failure information so clients can provide granular feedback and enable selective retry of only failed items.

### MUST NOT DO

1. **Never expose Python stack traces, file paths, or class names in client responses** — This reveals internal implementation details that attackers can exploit. Log everything server-side; show only safe messages to clients. Every production deployment must pass a security audit verifying error responses contain zero internal details.

2. **Never return raw exception objects or strings as GraphQL errors** — A resolver raising `ValueError("Invalid email: abc")` leaks domain knowledge (the exact validation rule) and could expose environment-specific paths. Always wrap in structured error types with sanitized messages.

3. **Never use bare `bool` or nullable returns for mutations that can fail** — `Optional[User]` tells the client nothing about why the operation failed. Use typed unions with ErrorCode values instead. The only exception is simple query fields that have no failure mode (e.g., `viewer: User!` where null means "not logged in" by convention).

4. **Never handle validation manually inside resolvers when Pydantic can do it declaratively** — Manual `if not email_valid: return error` scattered across resolvers is inconsistent, hard to test, and easy to forget on new mutations. Centralize validation in Pydantic model definitions with validators.

5. **Never allow a single batch item failure to abort the entire batch** — If updating 100 orders fails because one order was deleted, you lose the successful updates of all 99 other orders. Always process items independently and return per-item results.

---

## Output Template

When implementing or reviewing GraphQL error handling and validation, produce:

1. **Error Type Definitions** — Complete Strawberry type definitions for each error variant (`NotFoundError`, `ValidationError`, `UnauthorizedError`) with `message`, `code`, and domain-specific fields
2. **ErrorCode Enum** — The shared `ErrorCode` enum listing all error codes used by the API, grouped logically (authentication, not-found, validation, business-logic, system)
3. **Input Validation Models** — Pydantic v2 models for every mutation input type with `Field()` constraints and `@field_validator` / `@model_validator` decorators
4. **Error Middleware Configuration** — The centralized error handler function that maps exceptions to ErrorCode values and formats safe GraphQL error responses
5. **Batch Result Types** — Typed partial success result structures for batch mutations with per-item success and error details

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-schema-design` | Design the schema types, interfaces, and unions that include error result types in mutation return values |
| `graphql-dataloader-pattern` | Handle errors that occur during batch data fetching (missing keys, database failures in batch functions) |
| `graphql-subscriptions` | Handle subscription-level errors: failed WebSocket connections, structured error unions for auth rejections |

---

## References

- **GraphQL Spec — Errors**: https://spec.graphql.org/October2021/#sec-Errors — The official specification for the GraphQL errors response array format, including `message`, `path`, and `extensions` fields
- **Pydantic v2 Documentation**: https://docs.pydantic.dev/latest/ — Field validators (`@field_validator`), model validators (`@model_validator`), field constraints via `Field()`, and error serialization with `.model_validate()`
- **Strawberry Error Extensions**: https://strawberry.rocks/docs/guides/error-handling — Strawberry-specific patterns for custom error types, error extensions, and middleware-based exception handling
- **Stripe GraphQL API Error Patterns**: https://stripe.com/docs/api/errors — Industry-standard error code taxonomy (e.g., `authentication_required`, `card_declined`, `rate_limit`) adapted from Stripe's REST API to GraphQL conventions
- **OWASP API Security Top 10 — API1:2023 Broken Object Level Authorization**: https://owasp.org/API-Security/editions/2023/en/0xa1-bola/ — Error handling security considerations including preventing information leakage through error messages
