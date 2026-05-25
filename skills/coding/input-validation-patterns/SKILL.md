---
name: input-validation-patterns
description: Implements production input validation and sanitization patterns including Pydantic v2 schemas, recursive nested validation, custom validators with error accumulation, allowlist enforcement, and type coercion for secure API endpoints.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: input validation, pydantic validation, schema validation, allowlist validation, sanitize input, recursive validation, error accumulation, type coercion, data sanitization, how do i validate user input
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: api-design, engineering-error-handling, graphql-error-handling-validation, input-processing-pipelines
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
---

# Input Validation & Sanitization Patterns

Senior security engineer implementing robust input validation and sanitization pipelines that prevent injection attacks, enforce data contracts, and provide actionable error messages. Applies allowlist-first validation, schema-based type checking, recursive nested validation, custom validators with full error accumulation, and safe type coercion to ensure every external input is verified before reaching business logic.

## TL;DR Checklist

- [ ] Validate all external inputs — never trust client-supplied data
- [ ] Use Pydantic v2 `TypeAdapter` for runtime type validation of untrusted JSON
- [ ] Prefer allowlist (explicit valid values) over denylist (block known bad)
- [ ] Accumulate ALL validation errors before returning — never short-circuit on first failure
- [ ] Sanitize only after validation fails at the schema layer; do not use sanitization to "fix" bad data
- [ ] Apply recursive validation for nested dicts and list items
- [ ] Reject unknown keys with `model_config = ConfigDict(extra='forbid')` in Pydantic models

---

## When to Use

Use this skill when:

- Building API endpoints that accept untrusted input from clients, webhooks, or third-party services
- Designing data ingestion pipelines where schema drift between producer and consumer is expected
- Implementing form submission handling with nested objects (e.g., user profiles with address arrays)
- Creating CLI argument parsers that must validate complex structured input before execution
- Integrating with external APIs where the response format may not always match expectations

## When NOT to Use

Avoid this skill for:

- Validating internal function arguments — use Python type hints and `assert` statements instead (performance-critical paths)
- Sanitizing user-displayed content for XSS prevention — that is an output encoding concern handled by template engines or dedicated HTML sanitizers
- Database migration validation — use your ORM's migration system or schema comparison tools

---

## Core Workflow

1. **Define the expected schema** — Create a Pydantic model (or `TypeAdapter`) that declares every required field, its type, constraints, and defaults. Use `extra='forbid'` to reject unknown fields that may indicate tampering or client bugs. **Checkpoint:** Does the schema include all fields the business logic needs? Are optional fields marked with proper defaults?

2. **Apply allowlist validation** — For enum-like fields (status values, allowed roles, valid categories), use `Literal` types or Pydantic `Field` with `pattern` constraints rather than broad string types. This rejects any value outside the explicitly enumerated set. **Checkpoint:** Are all possible valid values enumerated? Can you iterate over them in tests?

3. **Handle nested structures recursively** — For models containing other models (e.g., a `User` with an `Address`, or a `Team` with a list of `Member` models), Pydantic v2 validates nested structures automatically via model references. For raw dicts, use `TypeAdapter(list[MyModel])` to validate every item in a collection. **Checkpoint:** Does every level of nesting have its own schema definition?

4. **Accumulate all errors** — Use `TypeAdapter.validate_python()` wrapped in try/except with `ValidationError` handling. The exception provides a `.errors()` list containing ALL validation failures, not just the first one. Format these into a structured error response that tells the caller exactly what to fix. **Checkpoint:** Does your error formatting iterate over all errors rather than breaking on the first?

5. **Apply type coercion only with explicit opt-in** — Pydantic coerces types automatically (e.g., `"123"` → `123` for `int` fields). This is convenient but can mask bugs. Use `StrictInt`, `StrictStr` from `pydantic_core` when strict typing is required, or configure the model with `model_config = ConfigDict(strict=True)`. **Checkpoint:** Is automatic coercion appropriate for this field's business semantics?

---

## Implementation Patterns

### Pattern 1: Pydantic v2 Schema Validation (ALLOWLIST-FIRST)

Define a schema that only accepts known-good values. Unknown fields are rejected outright.

```python
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Literal, Optional
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class Address(BaseModel):
    """Nested model for recursive validation."""
    street: str = Field(min_length=5, max_length=200)
    city: str = Field(pattern=r'^[A-Za-z\s\-\']+$')  # allowlist via regex
    postal_code: str = Field(pattern=r'^\d{5}(-\d{4})?$')

    model_config = ConfigDict(extra='forbid')


class CreateUserRequest(BaseModel):
    """Primary schema for user creation input."""
    username: str = Field(min_length=3, max_length=50, pattern=r'^[a-z0-9_]+$')
    email: EmailStr
    role: UserRole  # Literal allowlist — rejects any value not in enum
    display_name: Optional[str] = Field(default=None, max_length=100)
    address: Optional[Address] = None  # Nested model validated recursively

    model_config = ConfigDict(extra='forbid')

    @field_validator('username')
    @classmethod
    def username_not_blocked(cls, v: str) -> str:
        """Custom validation beyond type/constraint checks."""
        blocked_names = {'admin', 'root', 'system', 'administrator'}
        if v in blocked_names:
            raise ValueError(f'Username "{v}" is reserved')
        return v.lower()  # Normalize to lowercase

    @field_validator('display_name')
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        """Strip leading/trailing whitespace from optional fields."""
        return v.strip() if v else None
```

**BAD — Overly permissive with no allowlist:**

```python
# ❌ BAD: accepts any string for role, allows unknown fields
class BadCreateUserRequest(BaseModel):
    model_config = ConfigDict(extra='allow')  # Unknown fields silently accepted

    username: str           # No length or format constraints
    email: str              # Not validated as email
    role: str               # Accepts "superadmin", "", null-as-string
    extra_permissions: list = []  # Implicitly allows arbitrary extension
```

### Pattern 2: Recursive Validation with Error Accumulation

Validate nested structures and collect ALL errors for the response.

```python
from pydantic import TypeAdapter, ValidationError


class UserCreateSchema(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r'^[a-z0-9_]+$')
    email: str
    tags: list[str] = Field(min_length=1, max_length=10)

    model_config = ConfigDict(extra='forbid')


# Validate a LIST of users — each item validated recursively
UserListValidator = TypeAdapter(list[UserCreateSchema])


def validate_user_list(raw_input: Any) -> list[UserCreateSchema]:
    """Validate a batch of user records, accumulating ALL errors.

    Returns the parsed objects on success.
    Raises ValueError with structured error dict on failure (all errors included).
    """
    try:
        return UserListValidator.validate_python(raw_input)
    except ValidationError as exc:
        # Build structured error response with ALL failures
        errors = []
        for err in exc.errors():
            loc = " → ".join(str(l) for l in err["loc"])
            errors.append({
                "field": loc,
                "message": err["msg"],
                "type": err["type"],
            })

        raise ValueError({
            "detail": f"{len(errors)} validation error(s) found",
            "errors": errors,
        }) from exc


# Usage — shows ALL errors, not just the first one
raw_data = [
    {"username": "ab", "email": "not-an-email", "tags": []},   # 3 errors: short username, bad email, empty tags
    {"username": "good_user", "email": "ok@example.com", "tags": ["admin"]},  # valid
]

try:
    users = validate_user_list(raw_data)
except ValueError as exc:
    import json
    print(json.dumps(exc.__cause__.args[0], indent=2))
    # Output shows ALL errors from the first record, NOT just one
```

### Pattern 3: Strict Mode Type Coercion Control

Control when Pydantic coerces types vs. when it strictly rejects mismatches.

```python
from pydantic import BaseModel, ConfigDict, Field


class FlexibleOrder(BaseModel):
    """Accepts coercion: "100" → 100, True → 1."""
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0.0)

    model_config = ConfigDict(extra='forbid')


class StrictOrder(BaseModel):
    """Rejects coercion: "100" stays str, rejected as not int."""
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0.0)

    model_config = ConfigDict(extra='forbid', strict=True)


# Flexible — coerces strings to numbers
FlexibleOrder.model_validate({"quantity": "5", "unit_price": "9.99"})
# → quantity=5, unit_price=9.99 ✅

# Strict — rejects the same input
try:
    StrictOrder.model_validate({"quantity": "5", "unit_price": "9.99"})
except ValidationError as exc:
    # Rejects both fields — "5" is str, not int; "9.99" is str, not float
    pass  # ❌
```

### Pattern 4: Input Sanitization for XSS Prevention

Sanitize string input after validation passes, using explicit escaping rather than hoping the database or template layer handles it.

```python
import html
import re
from pydantic import BaseModel, Field, field_validator


def sanitize_input(value: str) -> str:
    """Sanitize user input for safe display in HTML contexts.

    1. Normalize whitespace (collapse multiple spaces/newlines)
    2. Strip null bytes and control characters except \n, \t
    3. Escape HTML special characters to prevent XSS
    """
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned).strip()
    sanitized = html.escape(cleaned, quote=True)
    return sanitized


class CommentInput(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    author_name: str = Field(max_length=100)

    model_config = ConfigDict(extra='forbid')

    @field_validator('content', 'author_name')
    @classmethod
    def sanitize(cls, v: str) -> str:
        return sanitize_input(v)


# Usage — input is validated THEN sanitized, in that order
comment = CommentInput.model_validate({
    "content": "<script>alert('xss')</script>Hello world",
    "author_name": "  Bob  ",
})
# content → "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;Hello world"
# author_name → "Bob" (stripped and normalized)
```

---

## Constraints

### MUST DO
- Define a complete schema for every external input endpoint — never validate piecemeal in handlers
- Set `extra='forbid'` on all Pydantic models to reject unknown/extra fields from untrusted sources
- Use `Enum` or `Literal` types for fields with a known finite set of valid values (allowlist enforcement)
- Accumulate ALL validation errors before returning — callers need full feedback to fix their input
- Apply field-level validators (`@field_validator`) for custom business rules that go beyond type/constraint checks
- Use `TypeAdapter` from pydantic v2 for validating raw dicts/lists when you don't want a named model class
- Prefer Pydantic's built-in constraints (`min_length`, `max_length`, `pattern`, `gt`, `ge`) before writing custom validators
- Strip and normalize whitespace on string inputs to prevent "whitespace-only" entries

### MUST NOT DO
- Never use input sanitization as a substitute for proper validation — sanitize after validation, don't "fix" bad data silently
- Do not use `extra='allow'` on models that process untrusted input — it silently accepts unknown fields and opens the door to field injection attacks
- Never accept raw SQL or shell commands from user input without explicit allowlist validation — if you need dynamic queries, use parameterized queries instead
- Do not rely solely on denylist patterns (e.g., "block these characters") — allowlists are always more secure because new attack vectors cannot slip through unknown values
- Never return raw Pydantic `ValidationError` objects to API consumers — always format them into a clean, structured response that exposes only actionable information

---

## Output Template

When this skill is active and processing an input validation task, the output must contain:

1. **Schema Definition** — Complete Pydantic model with all field constraints, nested models, and config settings
2. **Validation Function** — Typed wrapper function that catches `ValidationError` and returns structured errors
3. **BAD vs GOOD Comparison** — At least one example showing a permissive/broken pattern alongside the corrected version
4. **Error Response Format** — JSON structure for validation failures that lists all errors with field paths and messages

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-design` | Defines endpoint-level design; this skill handles input contracts within endpoints |
| `engineering-error-handling` | Broad error handling patterns; this focuses specifically on validation errors |
| `input-processing-pipelines` | Covers data flow and transformation; this covers the validation gate at pipeline entry |

---

## Live References

> Authoritative documentation links for input validation in Python. The model follows markdown links at load time to resolve external references and inline content.

- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [Pydantic TypeAdapter API Reference](https://docs.pydantic.dev/latest/api/types/#pydantic.types.TypeAdapter)
- [Pydantic Field Constraints Reference](https://docs.pydantic.dev/latest/api/pydantic_fields/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Python typing Module Documentation](https://docs.python.org/3/library/typing.html)
- [RFC 7231 — Hypertext Transfer Protocol (HTTP/1.1) Semantics for Status Codes](https://datatracker.ietf.org/doc/html/rfc7231#section-6.5)
- [pydantic-core Strict Types Documentation](https://docs.pydantic.dev/latest/api/pydantic_core/#pydantic_core.core_schema.strict_int_schema)
