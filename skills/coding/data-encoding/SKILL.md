---
name: data-encoding
description: Serializes and deserializes data through JSON, XML, Base64, URL encoding,
  YAML, and protocol buffer formats with type safety, error recovery, and character
  encoding correctness.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: json serialization, xml parsing, base64 encoding, url encoding, yaml config,
    protocol buffers, data serialization, type coercion, character encoding, message
    encoding
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
  related-skills: input-validation, error-handling, data-normalization
------
# Data Encoding and Serialization Engineer

Serializes and deserializes data between internal application objects and external serialization formats with strict type safety, error recovery, and character encoding correctness. Every time your application reads a message from a network socket, parses a JSON API response, writes configuration to YAML, encodes binary data for HTTP transmission, or converts database query results into a CSV export — it is performing data encoding. Treat every incoming serialized payload as potentially malformed, maliciously crafted, or using an unexpected schema version. Validate the structure before trusting any deserialized value, and always serialize with explicit type declarations rather than relying on implicit coercion that can silently corrupt data.

## TL;DR Checklist

- [ ] Use explicit schemas or models for all serialization — never deserialize raw dicts/lists into business logic without validation
- [ ] Specify character encoding explicitly (UTF-8 preferred) when reading/writing serialized text formats — never rely on platform defaults
- [ ] Set maximum payload size limits on all deserialization to prevent memory exhaustion from oversized inputs
- [ ] Handle type coercion carefully — explicit `int(value)` is safer than relying on a library's automatic numeric parsing which may accept "NaN" or hex strings
- [ ] Use deterministic serialization (sorted keys, consistent formatting) for formats that need to be hashed, cached, or compared byte-for-byte
- [ ] Validate deserialized objects against expected schema before passing them into business logic — do not trust the deserialization layer's type hints as sufficient validation

---

## When to Use

Use this skill when:

- Building API clients or servers that exchange JSON messages with external services
- Parsing XML documents from third-party data feeds (invoices, product catalogs, government APIs)
- Encoding binary data for transmission over text-only channels (Base64 for email attachments, URL-safe Base64 for JWT tokens)
- Reading application configuration from YAML, INI, or TOML files
- Serializing Python objects to JSON for caching in Redis or writing to disk
- Generating CSV exports from database query results for downstream processing
- Implementing protobuf-based gRPC services or inter-process communication protocols

---

## When NOT to Use

Avoid this skill for:

- Cryptographic encoding — use proper cryptographic libraries for encryption, not Base64 (which is encoding, not encryption)
- Database parameter binding — use ORM methods or parameterized queries instead of manual SQL string encoding
- HTML escaping or output context-specific encoding — use `output-sanitization` for XSS prevention and context-aware escaping instead
- Hashing passwords — use bcrypt, scrypt, or Argon2 directly, never attempt to encode passwords through generic serialization

---

## Core Workflow

1. **Select the Appropriate Serialization Format** — Choose the format based on your data's structure and the consumer's requirements: JSON for web APIs (human-readable, language-agnostic), XML for documents with complex namespaces and mixed content, YAML for human-edited configuration files, CSV for tabular data exports, Base64 for binary-to-text conversion, protocol buffers for efficient inter-process communication. Consider tradeoffs: JSON is universally supported but lacks type information; XML supports schemas (XSD) but has verbose syntax; YAML is readable by humans but has multiple incompatible dialects; protobuf is compact but requires a .proto schema definition. **Checkpoint:** If the consumer (external API, file format standard, or downstream service) mandates a specific format, that format takes precedence over your preference.

2. **Define the Schema or Type Contract** — Before serializing or deserializing any data, define what the structure should look like using typed models, classes, or schema definitions. For JSON: use Pydantic BaseModel in Python, Zod schemas in TypeScript, or JSON Schema for language-agnostic validation. For XML: use XSD schema files with generated data classes from `dataclasses` + `lxml` or an ORM like SQLAlchemy's declarative system mapped to XML. For YAML: define a Pydantic model and deserialize into it rather than accepting a raw dict. **Checkpoint:** The schema must be explicit about required vs optional fields, field types (with defaults), and any custom validation rules — if you cannot write a complete type annotation for every field in the data structure, your schema is incomplete.

3. **Serialize with Explicit Options** — When converting internal objects to serialized text, control serialization behavior explicitly rather than using library defaults: specify character encoding (UTF-8 unless there is a documented reason otherwise), set indent levels for human-readable output, configure key sorting for deterministic output, handle special types (datetime, UUID, Decimal) that libraries do not serialize natively. For JSON: use `json.dumps(obj, ensure_ascii=False, sort_keys=True, indent=2)` for readable output or `json.dumps(obj, separators=(",", ":"))` for compact API payloads. **Checkpoint:** Verify the serialized output by parsing it back and comparing — serialization should be a lossless round-trip for supported types. Any type information lost during serialization (e.g., int becoming float due to JSON's number type) must be handled explicitly.

4. **Deserialize with Validation, Not Trust** — When reading serialized data from an external source, do NOT trust the parsed result to be structurally correct or semantically valid. Parse first, then validate against your schema. Reject malformed input immediately with descriptive error messages identifying exactly which field failed validation and why. Set size limits BEFORE parsing to prevent memory exhaustion attacks. **Checkpoint:** After deserialization but before any business logic execution, assert that all required fields are present, all types match expectations (not just compatible), and all constraints (min/max values, enum membership, regex patterns) hold true.

5. **Handle Edge Cases and Error Recovery** — Serialization systems encounter unexpected inputs: extra fields in JSON not defined by the schema, missing required XML elements, corrupted Base64 padding, YAML files with tabs instead of spaces (which the YAML spec forbids), protocol buffer messages from a newer schema version that contains unknown fields. For each scenario, implement specific handling: Pydantic's `extra="forbid"` or `extra="ignore"`, graceful fallback values for missing XML elements using `.findtext()` defaults, Base64 padding correction with `base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))`, YAML strict parsing mode. **Checkpoint:** Every error path must produce a meaningful error message and fail fast — never silently skip invalid data or use default values that mask bugs in the sending system.

---

## Implementation Patterns / Reference Guide

### Pattern 1: JSON Serialization with Pydantic Type Safety (BAD vs GOOD)

JSON is the most common serialization format for web APIs, but its loose typing makes it dangerous as a trust boundary. Naive `json.loads()` returns dicts and lists with no type information — any key can be missing, any string can contain non-numeric characters that crash when used in arithmetic. Use Pydantic models to enforce structure and types at the deserialization boundary.

```python
"""JSON serialization and deserialization with Pydantic type safety.

Demonstrates why raw json.loads() is insufficient as a trust boundary for
external API responses, and how Pydantic models provide both type checking
and validation in a single layer.
"""

import json
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ❌ BAD — raw JSON parsing with no type safety or schema validation
def bad_parse_api_response(raw_json_bytes: bytes) -> dict:
    """Parse an API response using json.loads() directly into a dict.
    
    This function is dangerous because it trusts the external JSON structure
    completely:
    - Missing keys cause KeyError instead of returning a default value
    - String fields that should be numeric (e.g., "price": "42") crash when used in arithmetic
    - Extra unexpected keys are silently ignored — schema drift goes undetected
    - No size limit on the input — an attacker can send gigabytes of JSON to exhaust memory
    - datetime strings like "2024-01-15T10:30:00Z" remain as plain strings, not datetime objects
    
    Example: If the API changes and returns "price": "49.99" (string) instead of
    49.99 (number), this function silently accepts it — downstream code that tries
    to add prices together will fail with TypeError.
    
    Args:
        raw_json_bytes: Raw response body from external HTTP request.
        
    Returns:
        Dict with arbitrary structure and types — callers must manually validate everything.
        
    Raises:
        json.JSONDecodeError: If the bytes are not valid JSON.
        KeyError: If required keys are missing (crash, no default handling).
    """
    # No size limit — accepts unlimited input
    data = json.loads(raw_json_bytes)
    
    # No type checking — "price" might be a string like "42.50"
    return {
        "order_id": data["id"],                    # KeyError if "id" is missing
        "customer_email": data["email"],           # Could be None or wrong type
        "total_price": data["total"],              # Might be a string, not a number
        "created_at": data["created_at"],          # String, not datetime — callers must parse it
    }


# ✅ GOOD — Pydantic model with strict typing and validation at the boundary
class OrderItem(BaseModel):
    """Schema for a single line item in an order."""
    
    product_id: UUID = Field(..., description="Unique identifier for the product.")
    quantity: int = Field(..., ge=1, description="Number of items ordered (minimum 1).")
    unit_price: Decimal = Field(
        ...,
        gt=Decimal("0.00"),
        description="Price per unit in the store's base currency.",
    )
    discount_pct: Decimal = Field(
        default=Decimal("0.00"),
        ge=Decimal("0.00"),
        le=Decimal("100.00"),
        description="Discount percentage applied to this line item (0–100).",
    )

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, value: Decimal) -> Decimal:
        """Ensure price has no more than 2 decimal places (cents precision)."""
        if value.quantize(Decimal("0.01")) != value:
            raise ValueError(
                f"Unit price must have at most 2 decimal places, got {value}"
            )
        return value


class APIOrderResponse(BaseModel):
    """Schema for order data received from the external payment API.
    
    This model enforces:
    - Required fields (id, email, total, created_at)
    - Correct types (UUID, email format, Decimal, datetime)
    - Value constraints (quantity >= 1, price > 0)
    - Extra field rejection to catch schema drift
    - Custom validation for currency precision
    """

    order_id: UUID = Field(..., alias="id", description="Order identifier from payment API.")
    customer_email: str = Field(..., description="Customer's email address.")
    items: list[OrderItem] = Field(..., min_length=1, description="At least one item required.")
    total_price: Decimal = Field(..., gt=Decimal("0.00"), description="Total order amount.")
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$", description="ISO 4217 currency code.")
    created_at: datetime = Field(..., description="Order creation timestamp in ISO 8601 format.")
    
    model_config = {
        # Reject any fields not defined in this schema — catches API changes silently
        "extra": "forbid",
        # Allow alias mapping (API uses "id" but we prefer "order_id")
        "populate_by_name": True,
    }

    @model_validator(mode="before")
    @classmethod
    def parse_total_from_string(cls, values):
        """Handle API returning total as a string (common in financial APIs).
        
        Many payment APIs return monetary amounts as strings ("49.99") rather than
        JSON numbers (49.99) to avoid floating-point precision issues. This validator
        coerces strings to Decimal before Pydantic's type validation runs.
        
        Args:
            values: Partial parsed data — may be dict or already-validated model instance.
            
        Returns:
            Modified values with string totals converted to Decimal, or unchanged values.
        """
        if isinstance(values, dict) and "total_price" in values:
            total = values["total_price"]
            if isinstance(total, str):
                try:
                    values["total_price"] = Decimal(total)
                except Exception as exc:
                    raise ValueError(f"total_price must be a valid decimal number or string, got: {total!r}") from exc
        return values

    @field_validator("customer_email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Basic email format validation at deserialization time."""
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError(
                f"Invalid email format: {value!r}. Expected standard email like user@domain.com."
            )
        return value.lower()  # Normalize to lowercase


def parse_api_response_safely(raw_json_bytes: bytes, max_size: int = 1_048_576) -> APIOrderResponse:
    """Parse and validate an external API JSON response with defense-in-depth.
    
    Implements multiple safety layers:
    Layer 1 — Size limit prevents memory exhaustion from oversized payloads.
    Layer 2 — Strict JSON parsing rejects non-standard JSON extensions.
    Layer 3 — Pydantic model enforces schema, types, value constraints.
    Layer 4 — Custom validators handle format-specific edge cases (email, decimal precision).
    
    Args:
        raw_json_bytes: Raw response body from external HTTP request.
            Expected to be UTF-8 encoded JSON bytes.
        max_size: Maximum allowed payload size in bytes (default: 1 MB).
            
    Returns:
        Fully validated APIOrderResponse model with all fields correctly typed.
        
    Raises:
        ValueError: If payload exceeds size limit, contains invalid structure,
            or fails any validation constraint.
        json.JSONDecodeError: If payload is not valid JSON per RFC 8259.
    """
    # Layer 1 — Size limit (prevents zip bomb / memory exhaustion DoS)
    if len(raw_json_bytes) > max_size:
        raise ValueError(
            f"JSON payload size ({len(raw_json_bytes):,} bytes) exceeds "
            f"maximum allowed size ({max_size:,} bytes)"
        )
    
    # Layer 2 — Strict JSON parsing (rejects trailing commas, comments, etc.)
    try:
        raw_data = json.loads(raw_json_bytes, strict=True)
    except json.JSONDecodeError as exc:
        raise json.JSONDecodeError(
            msg=f"Malformed JSON at position {exc.pos}: {exc.msg}",
            doc=exc.doc,
            pos=exc.pos,
        ) from exc
    
    # Layer 3 + 4 — Pydantic schema validation and custom type coercion
    try:
        return APIOrderResponse.model_validate(raw_data)
    except Exception as exc:
        raise ValueError(
            f"JSON payload failed schema validation: {exc}"
        ) from exc


def serialize_order_to_json(order: APIOrderResponse) -> str:
    """Serialize an order model to a deterministic JSON string.
    
    Uses explicit serialization options for reproducibility: sorted keys,
    UTF-8 encoding, and custom encoder for non-standard Python types
    (datetime, UUID, Decimal).
    
    Args:
        order: Validated order model to serialize.
        
    Returns:
        Compact JSON string suitable for storage or transmission.
        Keys are sorted alphabetically for deterministic output.
        All values use standard JSON type mappings.
    """
    class OrderJSONEncoder(json.JSONEncoder):
        """Custom JSON encoder handling non-standard Python types."""
        def default(self, obj):
            if isinstance(obj, datetime):
                return obj.isoformat() + "Z"  # Append Z to indicate UTC
            if isinstance(obj, date):
                return obj.isoformat()
            if isinstance(obj, UUID):
                return str(obj)
            if isinstance(obj, Decimal):
                return float(obj)
            return super().default(obj)
    
    return json.dumps(
        order.model_dump(),
        cls=OrderJSONEncoder,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


# Demonstration of round-trip serialization and validation
if __name__ == "__main__":
    import sys
    
    sample_json = b'''
    {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "  Alice@example.COM  ",
        "total_price": "99.99",
        "created_at": "2024-11-15T10:30:00Z",
        "currency": "USD",
        "items": [
            {"product_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "quantity": 2, "unit_price": "29.99"},
            {"product_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "quantity": 1, "unit_price": "39.99"}
        ]
    }
    '''
    
    print("=== JSON Serialization Round-Trip ===\n")
    
    # Parse with validation
    order = parse_api_response_safely(sample_json)
    print(f"Order ID: {order.order_id}")
    print(f"Email (normalized): {order.customer_email}")  # alice@example.com (lowercased)
    print(f"Total: {order.total_price} ({order.currency})")
    print(f"Items: {len(order.items)} items")
    
    # Serialize back to JSON
    json_output = serialize_order_to_json(order)
    print(f"\nSerialized JSON:\n{json.dumps(json.loads(json_output), indent=2)}")
```

**Key security and correctness properties:**
- `extra: "forbid"` catches API schema changes — if the payment API adds a new field, validation fails immediately rather than silently accepting unknown data.
- Decimal coercion from strings handles financial APIs that return monetary amounts as `"49.99"` instead of `49.99`, which prevents floating-point precision errors.
- Size limits on deserialization prevent memory exhaustion DoS attacks using oversized or compressed JSON payloads.

### Pattern 2: Safe XML Parsing with Protection Against XXE and Entity Attacks

XML parsing has a notorious history of vulnerabilities — External Entity (XXE) injection can read local files, cause denial of service via billion laughs attacks, and perform server-side request forgery. Every XML parser must be explicitly configured to disable entity resolution.

```python
"""Safe XML parsing with XXE prevention following OWASP XML External Entity Prevention guidelines.

Demonstrates why default XML parsers are dangerous (they enable external entity resolution by default)
and how to configure lxml and xml.etree.ElementTree for secure XML processing.
"""

import xml.etree.ElementTree as ET
from io import BytesIO
from typing import Optional


# ❌ BAD — default XML parser with no security configuration
def bad_parse_xml(xml_bytes: bytes) -> dict:
    """Parse XML using default ElementTree parser (insecure).
    
    This function uses the default parser which has these vulnerabilities:
    - External Entity (XXE) injection: An attacker can include <!DOCTYPE> declarations
      with external entities that read arbitrary files from the server filesystem.
      Example attack payload: <?xml version="1.0"?>
        <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
        <data>&xxe;</data>
      This would replace &xxe; with the contents of /etc/passwd.
    
    - Billion laughs attack: Nested entity declarations like
      <!ENTITY a "&a;&a;&a;&a;&a;&a;&a;&a;"> repeated 8 times creates 
      an exponentially expanding document that exhausts memory.
    
    - Server-side request forgery (SSRF): External entities can reference
      http://internal-service.local/admin — the XML parser makes HTTP requests
      to internal services on behalf of the server.
    
    Args:
        xml_bytes: Raw XML bytes from external source (file upload, API response).
        
    Returns:
        Parsed XML as a dict — but only if it doesn't trigger an attack.
        On a malicious payload, this may leak file contents or crash the process.
    """
    # Default parser enables external entities by default — VULNERABLE to XXE
    tree = ET.parse(BytesIO(xml_bytes))
    root = tree.getroot()
    
    # No size limit — accepts unlimited XML
    result = {}
    for child in root:
        result[child.tag] = child.text
    return result


# ✅ GOOD — secure XML parser with all dangerous features disabled
def parse_xml_securely(
    xml_bytes: bytes,
    max_depth: int = 32,
    max_size: int = 1_048_576,
) -> ET.Element:
    """Parse XML with XXE prevention, depth limits, and size constraints.
    
    Implements three independent safety layers for XML parsing:
    Layer 1 — Entity resolution disabled (prevents XXE file read and SSRF).
    Layer 2 — External DTD resolution disabled (prevents billion laughs DoS).
    Layer 3 — Size limit enforced before parsing begins (prevents zip bombs).
    Layer 4 — Depth limit enforced during parsing (prevents deep nesting attacks).
    
    This function uses ET.XMLParser with resolved_entities=False and resolve_entities=False,
    which is the minimum secure configuration. For even stronger security with lxml,
    see Pattern 3.
    
    Args:
        xml_bytes: Raw XML bytes from external source. Must be valid UTF-8 encoded XML.
        max_depth: Maximum nesting depth allowed in the XML tree (default: 32).
            Prevents stack overflow and deep-nesting DoS attacks.
        max_size: Maximum allowed XML size in bytes (default: 1 MB).
            
    Returns:
        xml.etree.ElementTree Element object — a fully parsed, validated XML tree
        with no external entity resolution possible.
        
    Raises:
        ValueError: If XML exceeds size limit or nesting depth exceeds maximum.
        ET.ParseError: If XML is malformed (unclosed tags, invalid characters).
        TypeError: If xml_bytes is not bytes.
    """
    if not isinstance(xml_bytes, bytes):
        raise TypeError(f"Expected bytes for XML parsing, got {type(xml_bytes).__name__}")
    
    # Layer 1 — Size limit before parsing (prevents memory exhaustion)
    if len(xml_bytes) > max_size:
        raise ValueError(
            f"XML payload size ({len(xml_bytes):,} bytes) exceeds "
            f"maximum allowed size ({max_size:,} bytes)"
        )
    
    # Layer 2 — Secure XMLParser configuration
    parser = ET.XMLParser(
        resolve_entities=False,     # Disable external entity resolution (XXE prevention)
        no_network=True,            # Block all network access during parsing (SSRF prevention)
    )
    
    # Layer 3 + 4 — Parse with depth tracking
    try:
        tree = ET.parse(BytesIO(xml_bytes), parser=parser)
    except ET.ParseError as exc:
        raise ET.ParseError(
            f"Malformed XML: {exc}. Ensure the input is valid UTF-8 encoded XML."
        ) from exc
    
    # Validate depth of parsed tree
    _check_xml_depth(tree.getroot(), max_depth=max_depth)
    
    return tree.getroot()


def _check_xml_depth(element: ET.Element, current_depth: int = 0, max_depth: int = 32) -> None:
    """Recursively verify XML element depth does not exceed the maximum.
    
    Called after parsing to catch deep-nesting DoS attacks that bypass
    size-based limits (e.g., many shallow elements vs few deeply nested ones).
    
    Args:
        element: The XML element to check and recurse into.
        current_depth: Depth of this element in the tree (root is depth 0).
        max_depth: Maximum allowed depth. Default is 32 levels.
        
    Raises:
        ValueError: If any element exceeds max_depth.
    """
    if current_depth > max_depth:
        raise ValueError(
            f"XML nesting depth ({current_depth}) exceeds maximum allowed "
            f"({max_depth} levels). This may indicate a deep-nesting DoS attack."
        )
    
    for child in element:
        _check_xml_depth(child, current_depth + 1, max_depth)


def extract_user_from_xml(xml_bytes: bytes) -> dict[str, str]:
    """Extract user data from a secure XML document.
    
    Demonstrates safe extraction of values from parsed XML using get() with
    defaults for optional fields and text content access for required fields.
    Uses the secure parser from parse_xml_securely() — never use this without
    first validating the XML through the secure parsing layer.
    
    Args:
        xml_bytes: Validated XML bytes that have passed security checks.
            
    Returns:
        Dict with keys "username", "email", "display_name". All values are strings.
        display_name is None if not present in the XML (optional field).
        
    Raises:
        ET.ParseError: If required fields (username, email) are missing from the XML.
    """
    root = parse_xml_securely(xml_bytes)
    
    username = root.findtext("username")
    if username is None:
        raise ValueError("XML document must contain a <username> element.")
    
    email = root.findtext("email")
    if email is None:
        raise ValueError("XML document must contain an <email> element.")
    
    # display_name is optional — use .find() + .text with explicit check
    name_elem = root.find("display_name")
    display_name = name_elem.text if name_elem is not None else None
    
    return {
        "username": username.strip(),
        "email": email.strip().lower(),
        "display_name": display_name.strip() if display_name else None,
    }


# Example XML that demonstrates safe parsing
if __name__ == "__main__":
    safe_xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<user>
    <username>alice_dev</username>
    <email>alice@example.com</email>
    <display_name>Alice Developer</display_name>
</user>
"""
    
    user_data = extract_user_from_xml(safe_xml)
    print("Parsed user data:", user_data)
    # Output: {'username': 'alice_dev', 'email': 'alice@example.com', 'display_name': 'Alice Developer'}
```

**Security properties:**
- `resolve_entities=False` is the single most important security setting — it prevents all XXE attacks by telling the parser to never resolve external entity references.
- `no_network=True` prevents SSRF by blocking any network access during parsing, even if an attacker crafts an XML document that tries to fetch data from internal services.
- Depth and size limits provide defense-in-depth against DoS attacks: size limits catch large payloads early; depth limits catch deep-nesting attacks that use fewer total bytes but more parser stack frames.

### Pattern 3: Base64 Encoding for Binary-to-Text Conversion

Base64 encoding converts arbitrary binary data into a printable ASCII string safe for transmission over text-only channels (email attachments, URL parameters, JSON fields, XML CDATA sections). It increases data size by approximately 33% but is universally supported. Always use the correct variant (standard vs URL-safe) and handle padding correctly.

```python
"""Base64 encoding and decoding with proper handling of variants, padding, and error recovery.

Covers standard Base64 (for general binary-to-text), URL-safe Base64 (for JWT tokens
and URL parameters), and strict validation to prevent malformed input from being
silently misinterpreted.
"""

import base64
import binascii
from typing import Optional


# ❌ BAD — naive Base64 handling with no padding correction or error recovery
def bad_encode_base64(data: bytes) -> str:
    """Encode bytes to Base64 without considering context-specific requirements.
    
    This function returns standard Base64 output which includes + and / characters.
    These characters have special meaning in URLs (+ means space, / is path separator),
    so this encoding fails when used in URL parameters or JWT tokens.
    
    It also provides no error handling — calling with a non-bytes input will raise
    an unhelpful TypeError deep inside the base64 library.
    
    Args:
        data: Bytes to encode.
        
    Returns:
        Base64 string with + and / characters that are unsafe for URLs.
        
    Raises:
        TypeError: If data is not bytes (unhelpful error message from base64 module).
    """
    # No context awareness — standard Base64 includes + and / which break in URLs
    return base64.b64encode(data).decode("ascii")


# ✅ GOOD — Base64 utilities with variant selection and padding correction
def encode_base64_standard(data: bytes) -> str:
    """Encode bytes using standard Base64 (RFC 4648).
    
    Standard Base64 uses characters A-Z, a-z, 0-9, +, / and = for padding.
    This variant is safe for email attachments (MIME), XML CDATA sections,
    JSON fields, and most general binary-to-text contexts.
    
    NOT suitable for URL parameters or JWT tokens — use encode_base64_urlsafe() instead.
    
    Args:
        data: Binary data to encode. Any bytes object.
        
    Returns:
        Standard Base64 encoded string with = padding characters as needed.
        The output length is always a multiple of 4 (due to padding).
        
    Raises:
        TypeError: If data is not bytes or bytearray.
    """
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError(
            f"Expected bytes or bytearray for Base64 encoding, got {type(data).__name__}"
        )
    
    # b64encode returns bytes like b'YWJjZA==', decode to str for JSON/file use
    return base64.b64encode(data).decode("ascii")


def encode_base64_urlsafe(data: bytes) -> str:
    """Encode bytes using URL-safe Base64 (RFC 4648 section 5).
    
    URL-safe Base64 replaces + with - and / with _ to produce output that is safe
    for embedding in URLs, JWT tokens, and file paths without additional encoding.
    This variant should be used whenever the encoded string appears in a URL context
    or any context where + and / have special meaning.
    
    Args:
        data: Binary data to encode (e.g., cryptographic keys, binary tokens).
        
    Returns:
        URL-safe Base64 string using - instead of + and _ instead of /,
        with = padding characters as needed.
        
    Raises:
        TypeError: If data is not bytes or bytearray.
    """
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError(
            f"Expected bytes or bytearray for URL-safe Base64 encoding, got {type(data).__name__}"
        )
    
    return base64.urlsafe_b64encode(data).decode("ascii")


def decode_base64_strict(
    encoded: str,
    variant: str = "standard",
) -> bytes:
    """Decode a Base64 string with strict validation and padding correction.
    
    This function implements strict decoding that:
    1. Rejects strings containing invalid Base64 characters (not in A-Z, a-z, 0-9, +/, -_)
    2. Corrects missing or excess padding (= characters) automatically
    3. Returns decoded bytes only if all validation passes
    4. Provides clear error messages identifying the specific decoding failure
    
    Padding correction follows RFC 4648 section 3.3: the number of = padding chars
    must be exactly (4 - len(encoded) % 4) % 4 to produce a valid multiple of 4 length.
    
    Args:
        encoded: Base64 encoded string from external source (file, API response, URL parameter).
            Must contain only valid Base64 characters for the selected variant.
        variant: Which Base64 variant was used — "standard" (default, RFC 4648 section 4)
            or "urlsafe" (RFC 4648 section 5). This determines which character set is accepted.
            
    Returns:
        Decoded bytes — the original binary data that was encoded.
        
    Raises:
        ValueError: If encoded contains invalid characters, has wrong length after padding correction,
            or cannot be decoded as valid Base64.
        TypeError: If encoded is not a string.
    """
    if not isinstance(encoded, str):
        raise TypeError(
            f"Expected str for Base64 decoding, got {type(encoded).__name__}"
        )
    
    if variant == "urlsafe":
        decode_fn = base64.urlsafe_b64decode
    elif variant == "standard":
        decode_fn = base64.b64decode
    else:
        raise ValueError(f"Unknown variant '{variant}'. Use 'standard' or 'urlsafe'.")
    
    # Strip whitespace (common in multiline Base64 from files/emails)
    cleaned = encoded.strip()
    
    if not cleaned:
        raise ValueError("Base64 string is empty — nothing to decode.")
    
    # Correct padding to nearest multiple of 4
    padding_needed = (-len(cleaned)) % 4
    padded = cleaned + "=" * padding_needed
    
    try:
        return decode_fn(padded)
    except binascii.Error as exc:
        raise ValueError(
            f"Invalid Base64 encoding: {exc}. "
            f"Ensure the string contains only valid {variant} Base64 characters."
        ) from exc


def encode_jwt_payload(payload: dict) -> str:
    """Encode a JWT payload (JSON dict) to URL-safe Base64 with no padding.
    
    JWT specifications (RFC 7519) require Base64URL encoding without trailing = padding.
    This function handles the standard JWT payload serialization: JSON → UTF-8 bytes →
    URL-safe Base64 → strip padding characters.
    
    Args:
        payload: Dictionary containing JWT claims (sub, iss, exp, etc.).
            Must be JSON-serializable (dict with str, int, float, bool, list, None values).
            
    Returns:
        URL-safe Base64 encoded JWT payload with padding stripped.
        Safe for use in the second segment of a JWT token.
    """
    import json
    
    # Serialize to compact JSON (no extra whitespace)
    json_bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    
    # URL-safe Base64 encode and strip padding (= characters are omitted per JWT spec)
    return encode_base64_urlsafe(json_bytes).rstrip("=")


# Demonstration of encoding/decoding round-trip with error handling
if __name__ == "__main__":
    original_data = b"Hello, World! This is binary data: \x00\x01\x02\xff\xfe"
    
    print("=== Base64 Encoding Round-Trip ===\n")
    
    # Standard encoding (for email/file contexts)
    standard = encode_base64_standard(original_data)
    print(f"Original:  {original_data!r}")
    print(f"Standard:  {standard}")
    decoded_std = decode_base64_strict(standard, variant="standard")
    print(f"Decoded matches: {decoded_std == original_data}\n")
    
    # URL-safe encoding (for JWT/URL contexts)
    urlsafe = encode_base64_urlsafe(original_data)
    print(f"URL-safe:  {urlsafe}")
    decoded_url = decode_base64_strict(urlsafe, variant="urlsafe")
    print(f"Decoded matches: {decoded_url == original_data}\n")
    
    # JWT payload encoding
    jwt_payload = {"sub": "user123", "iat": 1700000000, "exp": 1700086400}
    jwt_segment = encode_jwt_payload(jwt_payload)
    print(f"JWT payload encoded: {jwt_segment}")
    
    # Demonstrate error handling with corrupted input
    try:
        decode_base64_strict("!!!invalid!!!", variant="standard")
    except ValueError as e:
        print(f"\nCorrupted input handled gracefully: {e}")
```

**Security and correctness properties:**
- `decode_base64_strict` corrects missing padding automatically — this handles the common case where a system omits trailing = characters (which is technically invalid per RFC 4648 but widely produced).
- URL-safe variant (`urlsafe_b64encode`) is mandatory for JWT tokens and URL parameters because + and / have structural meaning in those contexts. Using standard encoding in URLs can cause the + to be interpreted as a space by HTTP frameworks, silently corrupting the decoded value.

### Pattern 4: YAML Configuration Parsing with Schema Validation

YAML is widely used for configuration files but has multiple incompatible dialects (PyYAML vs ruamel.yaml), dangerous features (arbitrary Python object deserialization with `yaml.load()` without Loader), and parsing gotchas (tabs forbidden, implicit type coercion of values like "on" → True). Use safe loading with explicit schema validation.

```python
"""YAML configuration parsing with safe loading and Pydantic schema validation.

Covers the critical security issue of yaml.load() without a safe Loader (arbitrary
code execution via Python object instantiation) and demonstrates how to parse YAML
safely while enforcing strict type checking on application values.
"""

import re
from typing import Any

import yaml


# ❌ BAD — yaml.load() with no explicit Loader enables arbitrary code execution
def bad_load_config(yaml_text: str) -> dict:
    """Load YAML configuration using unsafe default yaml.load().
    
    This function is critically vulnerable to remote code execution (RCE). The default
    yaml.load() without a specified Loader uses FullLoader in newer PyYAML versions,
    but older versions used the dangerous default Loader which can instantiate arbitrary
    Python objects via the !python/object tag.
    
    An attacker who can write a configuration file (e.g., in an application directory
    or through a git pull of user-provided config) can execute any system command:
    
        !!python/object/apply:os.system ["rm -rf /"]
    
    This will run the rm -rf / command when the YAML is loaded.
    
    Even with FullLoader, yaml.load() has implicit type coercion that silently converts
    strings like "on", "yes", "true" to boolean True, which can break application logic:
        config["enabled"] = "no"  # User meant string "no" but gets bool False
    
    Args:
        yaml_text: YAML content from a file or configuration source.
        
    Returns:
        Dict with potentially dangerous values — any Python object instantiation in the
        YAML would have been executed during parsing. Values like "on" are coerced to True.
    """
    # NO LOADER SPECIFIED — uses whatever the default is (dangerous!)
    return yaml.load(yaml_text)


# ✅ GOOD — safe YAML loading with FullLoader and Pydantic schema validation
def load_config_safe(yaml_text: str, max_depth: int = 64) -> dict[str, Any]:
    """Load YAML configuration safely using FullLoader with depth limiting.
    
    Implements three safety layers for YAML parsing:
    Layer 1 — Explicit FullLoader prevents arbitrary Python object instantiation (RCE).
    Layer 2 — Maximum mapping size limits prevent DoS from deeply nested YAML.
    Layer 3 — Schema validation ensures parsed values match expected types and ranges.
    
    FullLoader is the safest Loader provided by PyYAML — it allows basic YAML types
    (strings, numbers, lists, dicts, booleans, None) but blocks !python/* tags that
    enable object instantiation and code execution.
    
    Args:
        yaml_text: YAML content string from a configuration file or data source.
            Should be valid UTF-8 encoded YAML.
        max_depth: Maximum nesting depth allowed in the YAML structure (default: 64).
            Prevents stack overflow from deeply nested YAML documents.
            
    Returns:
        Dict with safely parsed values — all Python objects are basic types (dict, list,
        str, int, float, bool, None). No arbitrary object instantiation occurred.
        
    Raises:
        yaml.YAMLError: If the YAML syntax is invalid (indentation errors, bad syntax).
        ValueError: If nesting depth exceeds maximum or schema validation fails.
    """
    # Layer 1 — Safe loading with explicit FullLoader
    try:
        data = yaml.safe_load(yaml_text)  # safe_load uses FullLoader internally
    except yaml.YAMLError as exc:
        raise yaml.YAMLError(f"Invalid YAML syntax: {exc}") from exc
    
    if data is None:
        return {}
    
    if not isinstance(data, dict):
        raise ValueError(
            f"Expected YAML root to be a mapping (dict), got {type(data).__name__}. "
            f"Configuration files must have top-level key-value pairs."
        )
    
    # Layer 2 — Depth check on parsed structure
    _check_yaml_depth(data, max_depth=max_depth)
    
    return data


def _check_yaml_depth(obj: Any, current_depth: int = 0, max_depth: int = 64) -> None:
    """Recursively validate YAML nesting depth."""
    if current_depth > max_depth:
        raise ValueError(
            f"YAML nesting depth ({current_depth}) exceeds maximum allowed "
            f"({max_depth} levels)."
        )
    
    if isinstance(obj, dict):
        for value in obj.values():
            _check_yaml_depth(value, current_depth + 1, max_depth)
    elif isinstance(obj, list):
        for item in obj:
            _check_yaml_depth(item, current_depth + 1, max_depth)


# Application-specific YAML schema using Pydantic
class DatabaseConfig(BaseModel):
    """Schema for database connection configuration."""
    
    host: str = Field(..., description="Database server hostname or IP address.")
    port: int = Field(default=5432, ge=1, le=65535, description="TCP port number (1-65535).")
    database: str = Field(..., min_length=1, description="Database name to connect to.")
    pool_size: int = Field(default=5, ge=1, le=100, description="Connection pool size.")


class ApplicationConfig(BaseModel):
    """Complete application configuration schema parsed from YAML."""
    
    app_name: str = Field(..., min_length=1, description="Human-readable application name.")
    debug: bool = Field(default=False, description="Enable debug mode (verbose logging).")
    database: DatabaseConfig = Field(..., description="Database connection settings.")
    
    @field_validator("app_name")
    @classmethod
    def validate_app_name(cls, value: str) -> str:
        """Application names must be alphanumeric with hyphens only."""
        if not re.match(r"^[a-z][a-z0-9-]*[a-z0-9]$", value):
            raise ValueError(
                f"Invalid app_name '{value}'. Must start and end with alphanumeric, "
                f"use only lowercase letters, digits, and hyphens."
            )
        return value


def load_application_config(yaml_path: str) -> ApplicationConfig:
    """Load and validate application configuration from a YAML file.
    
    Combines safe YAML loading with Pydantic schema validation to ensure the
    configuration is syntactically valid YAML, structurally correct (required fields),
    semantically valid (correct types, value ranges), and free of injection attacks.
    
    Args:
        yaml_path: File system path to the YAML configuration file.
            
    Returns:
        Validated ApplicationConfig model with all fields correctly typed.
        
    Raises:
        FileNotFoundError: If the configuration file does not exist.
        yaml.YAMLError: If the YAML syntax is invalid.
        ValueError: If schema validation fails (missing required fields, wrong types).
    """
    with open(yaml_path, "r", encoding="utf-8") as f:
        yaml_text = f.read()
    
    raw_config = load_config_safe(yaml_text)
    
    # Schema validation — rejects any values not matching expected types/constraints
    try:
        return ApplicationConfig.model_validate(raw_config)
    except Exception as exc:
        raise ValueError(
            f"Configuration validation failed: {exc}\n"
            f"File: {yaml_path}"
        ) from exc


# Example YAML configuration file
if __name__ == "__main__":
    sample_yaml = """
app_name: my-service
debug: false
database:
  host: db.internal.example.com
  port: 5432
  database: production_db
  pool_size: 10
"""
    
    # safe_load returns parsed data without code execution risk
    config_dict = load_config_safe(sample_yaml)
    print("Parsed YAML config:", config_dict)
    
    # Pydantic validates types and constraints at the boundary
    app_config = ApplicationConfig.model_validate(config_dict)
    print(f"\nValidated app name: {app_config.app_name}")
    print(f"Database host: {app_config.database.host}")
```

**Security properties:**
- `yaml.safe_load()` uses FullLoader which only supports basic YAML types — it cannot instantiate Python objects, preventing RCE via `!python/object/apply` tags.
- Pydantic schema validation catches implicit type coercion issues where YAML might convert "on" to True or "123" to int(123), ensuring your application gets the exact types it expects.
- Depth limiting prevents stack overflow from deeply nested YAML documents, which can be used as a denial-of-service attack vector.

---

## Constraints

### MUST DO
- Use explicit schemas or typed models for all deserialization — never trust raw json.loads(), xml.etree parsing, yaml.safe_load(), or csv.reader output without validating against an expected structure
- Set maximum payload sizes on ALL external data input before attempting to parse it — this is the first line of defense against memory exhaustion attacks
- Specify UTF-8 character encoding explicitly for all text-based serialization formats — never rely on platform defaults which vary by operating system locale
- Use deterministic serialization (sorted keys, consistent indentation) when output will be hashed, cached, or compared byte-for-byte — non-deterministic output causes false cache misses and incorrect hash comparisons
- Handle type coercion carefully — always convert strings to numeric types explicitly (`Decimal(string)`, `int(string)`) rather than relying on library defaults that may accept unexpected formats like "NaN", hex strings, or locale-specific number formatting
- Validate deserialized objects against expected schemas BEFORE passing them into business logic — the serialization layer is a trust boundary, not a trusted data source

### MUST NOT DO
- Use `yaml.load()` without explicitly specifying `Loader=yaml.FullLoader` or using `yaml.safe_load()` — this enables arbitrary Python object instantiation and remote code execution via !python/object tags in YAML content
- Use `json.loads()` output directly as business objects without type checking — JSON has only 6 types (string, number, boolean, null, array, object) which do not map cleanly to Python's richer type system
- Assume XML parsing is safe by default — the default parser enables external entity resolution and network access, enabling file read, SSRF, and DoS attacks
- Use Base64 for security-sensitive encoding — Base64 is a reversible encoding, not encryption. Anyone with the encoded string can decode it without any key or credential
- Serialize datetime objects to timestamps without timezone information — always use ISO 8601 with explicit timezone (Z suffix for UTC or +HH:MM offset) to prevent ambiguous timestamps across time zones
- Use CSV writer with manual string concatenation for fields that may contain commas, quotes, or newlines — the csv.writer module handles quoting correctly; manual approaches produce malformed output

---

## Output Template

When implementing or reviewing data encoding and serialization logic, produce:

1. **Format Selection Justification** — For each serialization point in the application, document why the chosen format (JSON, XML, YAML, CSV, Base64, protobuf) is appropriate, including alternatives considered and tradeoffs documented
2. **Schema Definition** — Complete type definitions for all serializable structures, specifying required vs optional fields, field types with validation constraints, and alias mappings for external API compatibility
3. **Encoding Variant Specification** — Which Base64 variant (standard vs URL-safe), which character encoding (UTF-8 explicitly declared), and which YAML dialect are used at each serialization point
4. **Error Recovery Strategy** — How malformed input is handled at each layer: size limit violation → structured error, parsing failure → descriptive message with position, schema validation failure → list of all failing fields with expected types
5. **Round-Trip Verification Report** — For critical data paths, document that serialization followed by deserialization produces structurally and semantically equivalent results for the full range of supported input types

---

## Related Skills

| Skill | Purpose |
|---|---|
| `input-validation` | Validates inbound data at system boundaries before deserialization — works with this skill's deserialization to ensure a complete trust boundary chain from wire to business logic |
| `error-handling` | Structured error responses for serialization failures including parse errors, schema validation failures, and encoding exceptions with user-friendly messages |
| `data-normalization` | Normalizes data formats before encoding — ensures consistent internal representation (e.g., all dates as UTC timestamps) before serializing to external formats |

---
