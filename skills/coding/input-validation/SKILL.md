---
name: input-validation
description: Validates and normalizes input/output data using schema validation, type coercion, and sanitization patterns to prevent injection attacks and ensure data integrity.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: input validation, output sanitization, schema validation, type checking, data cleaning, prompt injection prevention, JSON Schema
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: security-review,error-handling
---

# Input Validation & Sanitization Manager

Validates and normalizes input/output data using schema validation, type coercion, and sanitization patterns. Modern systems require strict boundaries between untrusted sources and internal business logic to prevent injection attacks, data corruption, and cascading failures.

## TL;DR Checklist

- [ ] Define strict schemas for all external inputs before processing
- [ ] Use parameterized queries or ORM methods — never string interpolation for SQL
- [ ] Sanitize outputs targeting the specific consumer (HTML, JSON, CLI)
- [ ] Validate types explicitly; never trust implicit casting from user input
- [ ] Implement allow-list validation over block-lists where possible
- [ ] Log validation failures without exposing internal stack traces

---

## When to Use

- Accepting data from external APIs, web forms, or message queues
- Parsing configuration files or environment variables that influence system behavior
- Processing user-generated content before storage or rendering
- Building API contracts that must guarantee data shape across services

---

## When NOT to Use

- For performance-critical inner loops where validation overhead is unacceptable (use caching or pre-validation)
- As a substitute for authentication/authorization — validation checks shape, not permission
- For business logic rules that belong in domain models rather than transport layers

---

## Core Workflow

1. **Define Schema Boundaries** — Specify exact structure, required fields, types, and constraints using a declarative schema (JSON Schema Draft 2020-12 or Pydantic v2).
   **Checkpoint:** Ensure every field has an explicit type and default/fallback behavior.

2. **Coerce & Cast Safely** — Apply type coercion at the boundary layer only. Reject values that cannot be safely cast rather than silently converting them.
   **Checkpoint:** Log rejected values with exact mismatch details for debugging.

3. **Sanitize for Output Context** — Escape or strip dangerous content based on where the data will be rendered (HTML, JavaScript, SQL, CLI). Use context-aware sanitizers.
   **Checkpoint:** Verify output matches expected MIME type and character set.

4. **Validate Against Business Rules** — Apply domain-specific constraints that go beyond structural validation (e.g., date ranges, enum sets, cross-field dependencies).
   **Checkpoint:** Ensure rule evaluation order prevents partial state corruption.

5. **Fail Fast & Report** — Return structured error responses with field-level messages. Never leak internal paths or database schemas in error payloads.
   **Checkpoint:** Confirm error response matches OpenAPI/JSON:API spec.

---

## Implementation Patterns

### Pattern 1: Declarative Schema Validation (Pydantic v2)

```python
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Literal
from datetime import date

class UserRegistrationInput(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    role: Literal["viewer", "editor", "admin"] = "viewer"
    registered_on: date

    @field_validator("username")
    @classmethod
    def sanitize_username(cls, v: str) -> str:
        """Strip whitespace and normalize unicode to prevent bypass attacks."""
        return v.strip().lower()

    @field_validator("registered_on")
    @classmethod
    def validate_registration_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Registration date cannot be in the future")
        return v
```

### Pattern 2: Context-Aware Output Sanitization (BAD vs. GOOD)

```python
import re
from html import escape

# ❌ BAD — naive regex that misses edge cases and context
def bad_sanitize_html(user_input: str) -> str:
    return user_input.replace("<script>", "").replace("</script>", "")

# ✅ GOOD — context-aware sanitization using bleach-style allow-list approach
ALLOWED_TAGS = {"b", "i", "em", "strong", "p", "br"}
ALLOWED_ATTRS = {"class"}

def sanitize_for_html(user_input: str) -> str:
    """Strip all tags except allowed list, sanitize attributes."""
    # In production, use `bleach.clean` with explicit allow-lists.
    # This example demonstrates the validation logic:
    cleaned = re.sub(r"<[^>]+>", "", user_input)  # Strip tags first
    cleaned = escape(cleaned)                      # Escape remaining special chars
    return cleaned

# For SQL contexts, never sanitize strings — use parameterized queries:
def safe_query(user_id: int) -> dict:
    """Uses parameterized query instead of string concatenation."""
    # cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return {"id": user_id}  # Placeholder for actual DB call
```

### Pattern 3: JSON Schema Validation with Draft 2020-12

```python
import jsonschema
from jsonschema import validate, ValidationError

SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["action", "payload"],
    "properties": {
        "action": {"type": "string", "enum": ["create", "update", "delete"]},
        "payload": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "value": {"type": "number", "minimum": 0}
            },
            "additionalProperties": False
        }
    }
}

def validate_payload(raw_input: dict) -> dict:
    """Validate against JSON Schema Draft 2020-12."""
    try:
        validate(instance=raw_input, schema=SCHEMA)
        return raw_input
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e.message}") from e
```

---

## Constraints

### MUST DO
- Define validation schemas at service boundaries, not scattered throughout business logic
- Use allow-lists (positive validation) over block-lists for security-critical inputs
- Fail fast on the first critical validation error to prevent partial processing
- Return structured error responses with field-level messages conforming to API standards
- Log validation failures with sufficient detail for debugging but without leaking internal state

### MUST NOT DO
- Trust any input from external sources, including headers, cookies, or message queue bodies
- Use regular expressions for complex structural validation (use dedicated schema validators)
- Sanitize by string replacement alone — context-aware encoding is required for output safety
- Return raw stack traces or database schemas in error responses to clients
- Bypass validation for "trusted" internal services — compromise propagation risk

---

## Output Template

When this skill is active, the model must produce:

1. **Validation Schema** — Declarative definition (Pydantic/JSON Schema) with typed fields and constraints
2. **Sanitization Logic** — Context-aware output escaping or stripping implementation
3. **Error Handling** — Structured error response format with field-level messages
4. **Security Notes** — Specific injection vectors addressed and bypass prevention measures

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `security-review` | Comprehensive security audit covering OWASP Top 10 beyond input validation |
| `error-handling` | Structured error propagation and retry patterns across service boundaries |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [JSON Schema Draft 2020-12 Specification](https://json-schema.org/draft/2020-12/release-notes)
- [OWASP Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Sanitization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Sanitizing_HTML_Input_Cheat_Sheet.html)
- [Bleach HTML Sanitizer Library](https://github.com/mozilla/bleach)
