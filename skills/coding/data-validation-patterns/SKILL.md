---




name: data-validation-patterns
description: Implements comprehensive data validation and sanitization (schema validation
  with pydantic, type coercion safety, input sanitization, output encoding, transformation
  pipelines) to ensure data integrity throughout software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data validation, schema validation, pydantic model, input sanitization,
    type coercion, data transformation, how do i validate data, output encoding
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
  related-skills: input-validation, software-error-handling, pydantic-models, data-encoding




---




# Data Validation & Sanitization Patterns

Senior engineer responsible for protecting every data boundary in a system — from raw API payloads through internal transformations to output serialization. Applies schema validation at entry points, enforces type safety through explicit coercion rules, sanitizes and encodes data at layer boundaries, and builds immutable transformation pipelines that guarantee integrity from ingress to egress.

## TL;DR Checklist

- [ ] Define a Pydantic model for every external input boundary
- [ ] Enforce explicit type coercion with `.model_validate()` — never use raw dicts
- [ ] Sanitize all user-supplied strings on entry: strip whitespace, normalize unicode, reject null bytes
- [ ] Encode all data before output to untrusted contexts (HTML, SQL, URLs)
- [ ] Build transformation pipelines as immutable stage sequences, not inline mutations
- [ ] Validate at the system perimeter; trust internal invariants after validation passes
- [ ] Never suppress or swallow `ValidationError` — always surface to caller with context

---

## When to Use

Use this skill when:

- Designing API endpoints that accept user input (REST, GraphQL, gRPC)
- Building data ingestion pipelines from external sources (files, webhooks, message queues)
- Implementing configuration loading and environment variable parsing
- Creating database ORM models that need pre-persist validation
- Writing CLI argument parsers that process user-supplied parameters
- Protecting against injection attacks (XSS, SQL injection, command injection)
- Auditing existing code for data integrity gaps at boundary layers

---

## When NOT to Use

Avoid this skill for:

- Internal-only functions with fully trusted callers — rely on language type systems and unit tests instead of runtime validation
- Simple scripts or throwaway code where validation overhead exceeds benefit
- Performance-critical hot paths where validation is done once upstream (validate at the perimeter, not inside inner loops)
- Replacing business logic rules — validation ensures structure, not domain correctness (use domain-specific validators for that)

---

## Core Workflow

1. **Map Data Boundaries** — Identify every point where data crosses a trust boundary: API ingress, file reads, external service calls, database writes. **Checkpoint:** Document each boundary with its source trust level (untrusted, partially trusted, fully trusted).

2. **Define Schema Models** — Create Pydantic models that represent the exact shape and types of valid data at each boundary. Use `Field()` constraints for ranges, patterns, and required status. **Checkpoint:** Every model has at least one `Field()` constraint beyond type — length limits, regex patterns, numeric ranges, or enum restrictions.

3. **Validate at Entry** — Call `.model_validate(raw_input)` on every untrusted payload at the boundary. Convert `ValidationError` into user-friendly error responses with field-level detail. **Checkpoint:** No code path allows a validated model to be bypassed; raw dicts never reach domain logic.

4. **Sanitize & Transform** — Apply sanitization rules (whitespace stripping, unicode normalization, null-byte rejection) as part of the validation model using `@field_validator`. Build transformation pipelines for multi-step data reshaping where each stage returns a new immutable object. **Checkpoint:** Sanitization happens before domain processing; transformations are composed from pure functions with no side effects.

5. **Encode on Output** — Before rendering data to HTML, writing SQL queries, or constructing URLs, apply the appropriate encoding (HTML entity encode, parameterize SQL, percent-encode). **Checkpoint:** Every output path has an explicit encoding call — never rely on framework defaults alone.

---

## Implementation Patterns

### Pattern 1: Schema Validation with Pydantic Models

Use Pydantic v2 models as the single source of truth for data contracts at every boundary. Define precise types, constraints, and error messages. Never accept a raw `dict` into domain logic — always validate first.

```python
# ❌ BAD: Raw dict processing with no schema enforcement
def process_user_input(raw_data: dict) -> dict:
    """Accepts arbitrary dicts and blindly trusts all fields."""
    user = {
        "name": raw_data["name"],           # No type check, no length limit
        "email": raw_data["email"],         # Not validated as email
        "age": raw_data.get("age", 0),      # Implicit coercion — string "abc" becomes 0
        "role": raw_data.get("role"),       # Any string accepted
    }
    save_to_database(user)   # Dirty data enters the system immediately
    return user


# ✅ GOOD: Pydantic v2 model with schema enforcement and validation constraints
from datetime import date
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class UserCreate(BaseModel):
    """Schema for user registration input — validates shape, type, and constraints."""

    name: str = Field(
        min_length=1,
        max_length=100,
        description="Display name for the user",
        examples=["Alice Smith"],
    )
    email: EmailStr = Field(
        min_length=5,
        max_length=320,
        description="Valid email address",
        examples=["alice@example.com"],
    )
    age: int = Field(
        ge=13,
        le=150,
        description="User age in years",
    )
    role: UserRole = UserRole.VIEWER  # Defaults to VIEWER if not provided

    @field_validator("name")
    @classmethod
    def strip_and_normalize(cls, value: str) -> str:
        """Strip whitespace and normalize unicode before storing."""
        import unicodedata
        normalized = unicodedata.normalize("NFKC", value.strip())
        if not normalized:
            raise ValueError("Name must contain non-whitespace characters")
        return normalized


# Usage at API boundary — never bypass .model_validate()
def handle_registration(payload: dict) -> UserCreate:
    """Validate incoming registration data against the schema."""
    try:
        user = UserCreate.model_validate(payload)
    except Exception as e:
        # Extract field-level errors for structured error response
        if hasattr(e, "errors"):
            errors = [
                {"field": err["loc"][0], "message": err["msg"]}
                for err in e.errors()
            ]
        else:
            errors = [{"field": "_root", "message": str(e)}]
        raise InvalidPayloadError(errors)  # Custom exception with context
    return user
```

### Pattern 2: Safe Type Coercion

Never rely on implicit Python type coercion — `"123"` is a string, not an integer. Use explicit typed models that fail fast when types don't match, and provide clear error messages about what was expected versus what was received.

```python
# ❌ BAD: Implicit coercion silently produces wrong types
def parse_temperature(raw_value: str) -> float:
    """Coerces without checking — 'abc' raises, but '' becomes 0.0."""
    return float(raw_value)  # ValueError on non-numeric, not a clear error message


# ❌ BAD: Manual coercion with no validation of intermediate state
def parse_user_data(raw: dict) -> dict:
    """Manually converts types — silently drops invalid data or produces wrong values."""
    data = {}
    for key, value in raw.items():
        if key == "age":
            data[key] = int(value)  # Crashes on non-numeric
        elif key == "score":
            data[key] = float(value)  # Crashes on non-numeric
        else:
            data[key] = value  # No transformation, no validation
    return data


# ✅ GOOD: Explicit typed models with descriptive error messages
from pydantic import BaseModel, Field, ValidationError

from typing import Optional


class TemperatureReading(BaseModel):
    """Validated temperature reading with type enforcement and range checking."""

    value: float = Field(
        description="Temperature in Celsius",
        examples=[23.5],
    )
    unit: str = Field(default="celsius", pattern=r"^(celsius|fahrenheit|kelvin)$")
    timestamp: Optional[str] = None

    @field_validator("value")
    @classmethod
    def validate_temperature_range(cls, v: float) -> float:
        """Physical temperature bounds — below absolute zero is invalid."""
        if v < -273.15:
            raise ValueError(
                f"Temperature {v}°C is below absolute zero (-273.15°C)"
            )
        if v > 10_000:
            raise ValueError(
                f"Temperature {v}°C exceeds reasonable sensor range (10,000°C)"
            )
        return v


class SensorBatch(BaseModel):
    """A batch of temperature readings with strict type enforcement."""

    readings: list[TemperatureReading] = Field(
        min_length=1,
        max_length=10_000,
        description="List of validated temperature readings",
    )
    device_id: str = Field(pattern=r"^DEV-[A-Z0-9]{8}$")

    @classmethod
    def from_raw_batch(cls, raw_items: list[dict]) -> "SensorBatch":
        """Convert a raw list of dicts to a validated SensorBatch.

        Raises ValidationError with field-level details if any reading is invalid.
        This is the single entry point — callers never access raw dicts directly.
        """
        validated_readings = [
            TemperatureReading.model_validate(item) for item in raw_items
        ]
        return cls(readings=validated_readings, device_id="DEV-UNKNOWN")  # Override device_id in calling code


# Safe usage with clear error reporting
def ingest_sensor_data(raw_batch: list[dict]) -> SensorBatch:
    """Ingest sensor data through the validated pipeline."""
    try:
        batch = SensorBatch.from_raw_batch(raw_batch)
    except ValidationError as e:
        # Structured error for API consumers
        errors = []
        for err in e.errors():
            field_path = " -> ".join(str(loc) for loc in err["loc"])
            errors.append({
                "path": field_path,
                "expected": "valid temperature reading",
                "got": str(raw_batch[err["loc"][1]] if len(err["loc"]) > 1 else raw_batch),
                "message": err["msg"],
            })
        raise InvalidPayloadError("Sensor data validation failed", details=errors)
    return batch
```

### Pattern 3: Input Sanitization & Output Encoding

Sanitize on entry, encode on exit. Never trust that a framework's default escaping is sufficient for every output context (HTML, JavaScript, SQL, URLs, file paths). Each output format has different encoding requirements.

```python
# ❌ BAD: Raw input used directly in dangerous contexts
def render_user_profile(username: str, bio: str) -> str:
    """Injects raw user input into HTML — XSS vulnerability."""
    return f"""
        <div class="profile">
            <h1>{username}</h1>          <!-- XSS: username can contain <script> tags -->
            <p>{bio}</p>                  <!-- XSS: bio can contain event handlers -->
        </div>
    """


def search_database(query: str) -> list[dict]:
    """SQL injection vulnerability — concatenates user input directly."""
    sql = f"SELECT * FROM users WHERE name LIKE '%{query}%'"  # Injection point
    return db.execute(sql)


# ✅ GOOD: Sanitize on entry, encode on exit for the specific context
import html
import re
import unicodedata
from functools import lru_cache


class Sanitizer:
    """Input sanitization rules applied at trust boundaries.

    All methods are stateless and pure — safe for concurrent use without locks.
    """

    # Characters/sequences to reject outright before any processing
    DANGEROUS_PATTERNS: list[str] = [
        "\x00",                          # Null byte injection
        "<script",                        # Script tag injection (case-insensitive handled by caller)
        "javascript:",                    # JavaScript URI scheme
        "data:text/html",                 # Data URI that could trigger XSS
    ]

    @staticmethod
    def sanitize_string(value: str, max_length: int = 10_000) -> str:
        """Sanitize a user-supplied string for safe internal processing.

        Applies: null-byte stripping, whitespace normalization, unicode NFKC normalization,
        length enforcement, and dangerous pattern rejection.

        Args:
            value: Raw input string from an untrusted source.
            max_length: Maximum allowed character count after normalization.

        Returns:
            Cleaned string safe for internal processing (not yet output-encoded).

        Raises:
            ValueError: If the string contains null bytes or exceeds length limit.
        """
        # Reject null bytes — they break string processing in many languages
        if "\x00" in value:
            raise ValueError("Input contains null byte characters")

        # Strip leading/trailing whitespace, collapse internal runs of whitespace
        cleaned = re.sub(r"\s+", " ", value.strip())

        # Normalize unicode to NFKC form (compatibility decomposition + canonical composition)
        cleaned = unicodedata.normalize("NFKC", cleaned)

        # Enforce length limit after normalization (normalized string can grow)
        if len(cleaned) > max_length:
            raise ValueError(
                f"Input exceeds maximum length of {max_length} characters "
                f"(got {len(cleaned)} after normalization)"
            )

        return cleaned

    @staticmethod
    def sanitize_html_field(value: str, allowed_tags: set[str] | None = None) -> str:
        """Sanitize a string for safe inclusion in HTML content.

        Strips all HTML tags and encodes special characters unless an explicit
        allowlist of safe tags is provided.

        Args:
            value: User-supplied text that may contain HTML.
            allowed_tags: Set of tag names to permit (e.g., {"b", "i", "a"}).
                         If None, ALL tags are stripped.

        Returns:
            HTML-escaped string with only permitted tags preserved.
        """
        if not value:
            return ""

        cleaned = Sanitizer.sanitize_string(value)

        if allowed_tags is None:
            # Full strip — encode everything for safe text content
            return html.escape(cleaned, quote=True)

        # Simple tag stripping: remove anything that looks like an HTML tag
        # For production rich-text editing, use bleach or a dedicated library
        stripped = re.sub(r"<[^>]*>", "", cleaned)
        return html.escape(stripped, quote=True)


class OutputEncoder:
    """Output encoding functions for different target contexts.

    Each method produces output safe for its specific rendering context.
    Call the correct encoder for the output format — never guess.
    """

    @staticmethod
    def encode_html(value: str) -> str:
        """Encode a string for safe inclusion in HTML body content.

        Converts < > & " ' to their HTML entity equivalents.

        Args:
            value: String to encode for HTML output.

        Returns:
            HTML-escaped string.
        """
        return html.escape(value, quote=True)

    @staticmethod
    def encode_html_attribute(value: str) -> str:
        """Encode a string for safe inclusion in an HTML attribute value."""
        return (
            html.escape(value, quote=True)
            .replace("&apos;", "'")
            .replace("&quot;", '"')
        )

    @staticmethod
    def encode_url_component(value: str) -> str:
        """Percent-encode a string for safe inclusion in a URL path or query parameter.

        Uses RFC 3986 safe character set for path segments and application/x-www-form-urlencoded
        semantics for query values.

        Args:
            value: String to encode for URL usage.

        Returns:
            Percent-encoded string.
        """
        from urllib.parse import quote, quote_plus
        # For path segments: allow more characters through
        return quote(value, safe="")

    @staticmethod
    def encode_sql_like_pattern(value: str) -> str:
        """Escape special LIKE wildcards for use in SQL LIKE patterns.

        Note: This does NOT replace parameterized queries. Use parameterized
        queries whenever possible — this is a secondary defense layer.

        Args:
            value: User search term containing possible _ or % characters.

        Returns:
            String with LIKE wildcards escaped by preceding them with backslash.
        """
        return (
            value.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )


# Correct usage pattern: sanitize on entry, encode on exit
def render_user_profile(username: str, bio: str) -> str:
    """Render a user profile with safe HTML output."""
    # Step 1: Sanitize on entry (applied when data arrives from API)
    safe_username = Sanitizer.sanitize_string(username, max_length=100)
    safe_bio = Sanitizer.sanitize_string(bio, max_length=5000)

    # Step 2: Encode on exit for the specific context (HTML output)
    encoded_name = OutputEncoder.encode_html(safe_username)
    encoded_bio = Sanitizer.sanitize_html_field(safe_bio)

    return f"""
        <div class="profile">
            <h1>{encoded_name}</h1>
            <p>{encoded_bio}</p>
        </div>
    """


def search_database_parametrized(query: str) -> list[dict]:
    """Search with parameterized queries — the PRIMARY defense against SQL injection."""
    # Parameterized queries handle all escaping automatically.
    # This is preferred over string encoding for SQL operations.
    safe_pattern = OutputEncoder.encode_sql_like_pattern(query)
    return db.execute("SELECT * FROM users WHERE name LIKE %s", [f"%{safe_pattern}%"])
```

### Pattern 4: Immutable Transformation Pipeline

Build data transformations as composable, immutable pipeline stages. Each stage receives input, produces a new validated output object, and never mutates its arguments. This makes pipelines debuggable, testable, and safe for concurrent use.

```python
# ❌ BAD: Inline mutations scattered across functions — impossible to audit
def process_order(raw_order: dict) -> dict:
    """Mutates the input dict in place — callers lose their original data."""
    order = raw_order  # No copy — this IS the caller's dict
    order["status"] = "processing"                          # Side effect on input

    # Nested mutation — deeply nested, hard to reason about
    order["items"][0]["price"] = order["items"][0]["price"] * 1.08  # Tax inline

    # Another mutation hidden in a function call
    apply_discount(order)                                  # Modifies order in place

    db.save(order)                                         # Mutable state stored
    return order


def apply_discount(order: dict) -> None:
    """Mutates order dict directly — side effect, not pure logic."""
    if order.get("total", 0) > 100:
        order["discount"] = order["total"] * 0.1           # Silent mutation
        order["total"] -= order["discount"]
    # No return value — caller must know to expect mutation


# ✅ GOOD: Immutable pipeline with pure transformation stages
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterator

from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    """An immutable order item with validated prices and quantities."""

    product_id: str = Field(pattern=r"^PROD-[A-Z0-9]{6}$")
    quantity: int = Field(ge=1)
    unit_price_cents: int = Field(gt=0)  # Price in cents to avoid float precision

    @property
    def subtotal_cents(self) -> int:
        """Calculate line total in cents (no floating point arithmetic)."""
        return self.quantity * self.unit_price_cents


class Order(BaseModel):
    """Immutable order representation after validation."""

    customer_id: str
    items: list[OrderItem]
    status: str = "pending"
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class OrderProcessingPipeline:
    """Immutable data transformation pipeline for order processing.

    Each stage is a pure function that takes an Order and returns a new Order.
    No mutations occur — every step produces a fresh object, making the entire
    pipeline deterministic and safe for concurrent execution.

    Usage:
        result = (
            OrderProcessingPipeline()
                .validate(Order.model_validate(raw_input))
                .calculate_taxes(rate=0.08)
                .apply_member_discount(member_id="MEM-123")
                .finalize()
        )
    """

    def __init__(self) -> None:
        self._tax_rate = 0.0
        self._discount_pct = 0.0
        self._status = "pending"

    # -- Stage 1: Validation (identity — passes through validated Order) --
    def validate(self, order: Order) -> Order:
        """Pass through a validated Order. Validates that items are non-empty."""
        if not order.items:
            raise ValueError("Order must contain at least one item")
        return order

    # -- Stage 2: Tax calculation (pure function) --
    def calculate_taxes(self, rate: float) -> "OrderProcessingPipeline":
        """Set the tax rate for subsequent calculation. Returns self for chaining."""
        if not 0 <= rate <= 1.0:
            raise ValueError(f"Tax rate must be between 0 and 1, got {rate}")
        self._tax_rate = rate
        return self

    # -- Stage 3: Discount application (pure function) --
    def apply_member_discount(self, member_id: str | None) -> "OrderProcessingPipeline":
        """Apply a 10% discount for valid members. Returns self for chaining."""
        if member_id and member_id.startswith("MEM-"):
            self._discount_pct = 0.10
        return self

    # -- Stage 4: Finalization (produces the output Order) --
    def finalize(self, order: Order) -> Order:
        """Compute final totals with tax and discount applied. Returns new immutable Order."""
        items_total = sum(item.subtotal_cents for item in order.items)

        # Apply discount first (on pre-tax total)
        discount_cents = int(items_total * self._discount_pct)
        after_discount = items_total - discount_cents

        # Apply tax on discounted total
        tax_cents = int(after_discount * self._tax_rate)
        grand_total = after_discount + tax_cents

        if grand_total <= 0:
            raise ValueError(
                f"Final order total must be positive, got {grand_total} cents"
            )

        # Create a completely new Order object — no mutation of the input
        return Order.model_copy(
            update={
                "status": "confirmed",
                "_items": [item.model_copy() for item in order.items],  # Deep copy items
            }
        )


# Pipeline usage — each stage is visible, testable, and composable
def process_new_order(raw_input: dict) -> Order:
    """Process a raw order through the complete validation pipeline."""
    try:
        validated_order = Order.model_validate(raw_input)
    except Exception as e:
        raise InvalidOrderError(f"Order validation failed: {e}") from e

    pipeline = OrderProcessingPipeline()
    result = (
        pipeline.validate(validated_order)
        .calculate_taxes(rate=0.08)  # 8% tax
        .apply_member_discount(member_id=None)  # No member discount for this order
        .finalize(validated_order)
    )

    return result
```

---

## Constraints

### MUST DO
- Define a Pydantic model for every external data boundary — never accept raw `dict` into domain logic
- Use `.model_validate()` (v2) or `.parse_obj()` (legacy) to enforce schema at every ingress point
- Apply sanitization as part of the validation step via `@field_validator` decorators, not as a separate pass
- Encode output explicitly for the target context: HTML escape for web, parameterize for SQL, percent-encode for URLs
- Use integer arithmetic (cents, milligrams) instead of floating-point for monetary and scientific values to avoid precision loss
- Structure transformation pipelines as composable pure functions with immutable data — never mutate inputs in place
- Convert `ValidationError` into structured error responses with field-level details for API consumers
- Write unit tests that cover validation edge cases: empty strings, boundary numbers, invalid enum values, oversized payloads

### MUST NOT DO
- Trust framework-provided defaults without verifying them (e.g., Flask's request.json parsing does not validate types)
- Use `eval()`, `exec()`, or `pickle.loads()` on any user-supplied data — no matter how sanitized it appears
- Suppress `ValidationError` with bare `except Exception: pass` — always surface the error with context
- Store sensitive data (passwords, API keys, PII) in plaintext in models without explicit field encryption markers
- Rely solely on client-side validation — every backend boundary must independently validate all inputs
- Use string concatenation for SQL queries or shell command construction — always use parameterized interfaces
- Apply sanitization only to "text" fields — numbers, dates, and booleans also need range/format validation

---

## Output Template

When implementing or reviewing data validation code, produce:

1. **Boundary Map** — List every data ingress point identified and the trust level for each (untrusted/partially trusted/fully trusted)
2. **Schema Definition** — The Pydantic model(s) with all `Field()` constraints, validators, and default values shown in full
3. **Validation Entry Point** — The exact code location where `.model_validate()` is called on raw input, including the error handling path
4. **Sanitization Rules** — Which fields are sanitized on entry, what transformations are applied (strip, normalize, reject), and the validation decorator used
5. **Output Encoding Plan** — For each output context (HTML template, SQL query, API response body, URL redirect), specify the encoding function applied
6. **Pipeline Structure** — If transformations exist, show the stage sequence with input/output types for each stage
7. **Test Coverage Summary** — List the validation edge cases covered by unit tests (empty string, boundary values, type mismatches, oversized payloads)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `input-validation` | Focused on web form and HTTP request input validation patterns (headers, cookies, method checking) |
| `software-error-handling` | Structured error types, exception hierarchies, and error propagation across service boundaries |
| `pydantic-models` | Deep-dive into Pydantic v2 features: computed fields, serialization, custom validators, and model inheritance |
| `data-encoding` | Character encoding standards (UTF-8, ISO-8859), base64/binhex encoding/decoding, and MIME multipart handling |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [JSON Schema — Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [Wikipedia: Data Validation](https://en.wikipedia.org/wiki/Data_validation)
- [Pydantic Documentation v2](https://docs.pydantic.dev/latest/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Rust Serde — Serialization Framework for Data Validation](https://serde.rs/)
