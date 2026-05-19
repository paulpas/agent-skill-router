---
name: input-validation
description: Validates, sanitizes, and transforms inbound data through typed schema checks and OWASP-compliant filtering to prevent injection attacks and data corruption.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: input validation, data sanitization, schema validation, input filtering, sanitize user input, prevent injection, OWASP, form validation, parse and validate
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: security-review, error-handling, test-driven-development
---

# Input Validation and Sanitization Engineer

Validates, sanitizes, and transforms inbound data through typed schema checks, OWASP-compliant filtering, and defensive parsing to ensure no corrupted or malicious payload reaches business logic. Treat every external input — user form data, API payloads, file uploads, environment variables, database queries — as hostile until proven otherwise. Follow OWASP secure coding guidelines for sanitization strategies across all input contexts.

## TL;DR Checklist

- [ ] Define explicit schema for every external input endpoint before accepting data
- [ ] Sanitize and normalize input before validation to neutralize encoding bypasses
- [ ] Use allowlists for accepted values — never rely on blocklists alone
- [ ] Reject payloads with unknown or extra fields rather than silently dropping them
- [ ] Validate at the system boundary — do not pass raw external strings deeper into business logic
- [ ] Return structured error responses identifying which fields failed and the specific rule violated
- [ ] Test adversarial inputs: SQL injection strings, XSS payloads, oversized bodies, null bytes

---

## When to Use

Use this skill when:

- Building API endpoints that accept user-supplied JSON, form data, or query parameters
- Writing CLI tools that process file paths, numbers, or flags from command-line arguments
- Integrating with third-party webhooks where payload structure cannot be fully trusted
- Implementing configuration parsers that read from environment variables or config files
- Adding middleware to strip and validate cookies, headers, and URL-encoded form data

---

## When NOT to Use

Avoid this skill for:

- For network-level security controls — use `security-review` for firewall rules and TLS configuration instead
- For output encoding or content-type enforcement — those belong in the presentation layer
- For business logic validation (e.g., "does the user have permission to delete?") — that's authorization, not input validation

---

## Core Workflow

1. **Catalog All Input Surfaces** — Enumerate every data entry point that crosses your system boundary: HTTP request body, query parameters, path parameters, cookies, custom headers (e.g., `Authorization`, `X-Forwarded-For`), file uploads with multipart parsing, environment variables read at startup, configuration files, and inter-process communication payloads. **Checkpoint:** For each entry point, determine if it can be spoofed by an attacker — any input from outside your process boundary is suspect.

2. **Define the Schema Contract** — Specify the expected shape of every input using a typed schema library (Pydantic for Python, Zod for TypeScript). Each field must declare: its type, whether it is required or optional, minimum/maximum lengths or values, allowed enumerations, regex patterns only for simple format checks (not injection filtering), and default values. Never use a generic "any" or "unknown" type on an external-facing schema. **Checkpoint:** Every field has an explicit type and constraint — if you cannot write a specific validation rule for a field, it needs more thought before accepting data.

3. **Normalize Encoding and Whitespace** — Before any semantic validation, normalize the raw input bytes to a consistent encoding (UTF-8), decode percent-encoded sequences, trim leading/trailing whitespace from strings, collapse multiple consecutive spaces into one, and normalize Unicode normalization forms (NFC). Handle surrogate pairs carefully to reject malformed UTF-8 without crashing. **Checkpoint:** After normalization, two inputs that are semantically equivalent (e.g., `"  john@example.com  "` and `"john@example.com"`) should produce identical internal representations.

4. **Sanitize Dangerous Content** — Strip or escape context-specific dangerous constructs before they reach downstream code. For HTML rendering contexts, use an allowlist-based sanitizer like Bleach to remove event handlers (`onclick`, `onerror`), javascript: URIs, and foreign protocols. For database query contexts, never concatenate input into SQL strings — use parameterized queries instead (the ORM or driver handles escaping). For shell command contexts, split arguments into a list and pass directly to `subprocess.run(args)` rather than using `shell=True`. **Checkpoint:** Sanitization is context-dependent — what is safe in one context (e.g., allowing `<b>` tags in rich text) may be dangerous in another (e.g., rendering raw HTML in an email body).

5. **Validate Against Constraints** — Run normalized and sanitized input through the full schema validation, collecting all constraint violations rather than failing on the first error. Each validation rule must have a human-readable error message that identifies: which field failed, what rule was violated, and what value was expected (but never echo the offending raw input). Reject the entire payload if any single constraint fails — partial acceptance of a malformed request is a vulnerability. **Checkpoint:** Validation either passes completely or fails completely; there is no such thing as a "best effort" parse for security-critical inputs.

6. **Transform to Internal Types** — Coerce validated string representations into proper internal types (e.g., `"2024-01-15"` → `datetime.date`, `"42"` → `int(42)`, `"true"` → `True`). After this step, no value in your business logic should be a raw string from user input — it must have been through schema validation and type coercion. Internal types carry their own invariants (e.g., a `Money` class that never holds a negative balance). **Checkpoint:** Verify that all downstream functions receive properly typed values by asserting type expectations at module boundaries using assertions or runtime type checks.

---

## Implementation Patterns

### Pattern 1: Schema Validation with Pydantic (Python)

Define strict, self-documenting schemas for every external input. This is the primary defense layer — if the schema rejects the input, it never reaches your business logic.

```python
"""User registration input validation using Pydantic v2.

Defines the complete contract for user registration data with type coercion,
range enforcement, format validation, and custom sanitization validators.
Follows OWASP guidelines for input validation by defining explicit allowlists
for acceptable values rather than attempting to enumerate all attack vectors.
"""

from datetime import date
from typing import Optional

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserRegistrationInput(BaseModel):
    """Schema for user registration form data from external API endpoints.

    All fields are validated at the system boundary before any user data
    enters the application's domain logic. Schema includes:
    - Type enforcement (str, int, date, optional)
    - Length constraints via Field() min/max_length
    - Format validation via regex patterns for simple checks only
    - Cross-field validation via model_validator
    - Custom sanitization via field_validator
    """

    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$",
        description=(
            "Alphanumeric username starting and ending with alphanumeric char. "
            "Underscores and hyphens allowed in the middle. Cannot be a single character."
        ),
    )
    email: EmailStr = Field(
        ...,
        description="Valid email address, validated by RFC 5322 format check.",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Minimum 8 characters to prevent brute-force attacks.",
    )
    age: Optional[int] = Field(
        default=None,
        ge=13,
        le=150,
        description=(
            "Age in years, compliant with COPPA (minimum 13). "
            "Nullable because age is optional for registration."
        ),
    )
    display_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Optional human-readable name, trimmed of whitespace.",
    )
    accept_terms: bool = Field(
        ...,
        description="User must explicitly confirm terms of service (default False).",
    )

    @field_validator("username")
    @classmethod
    def sanitize_username(cls, value: str) -> str:
        """Normalize username before validation: strip whitespace and lowercase.

        Preprocessing step that ensures consistent internal representation.
        This is sanitization, not validation — the regex pattern still enforces format.

        Args:
            value: Raw username from user input.

        Returns:
            Normalized username suitable for storage.
        """
        return value.strip().lower()

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, value: Optional[str]) -> Optional[str]:
        """Trim leading/trailing whitespace from display name if present.

        Args:
            value: Optional display name string from user input.

        Returns:
            Stripped display name or None if not provided.
        """
        if value is not None:
            return value.strip()
        return value

    @model_validator(mode="after")
    def validate_password_strength(self) -> "UserRegistrationInput":
        """Enforce password complexity rules after basic length check passes.

        Checks for at least one uppercase letter, one lowercase letter,
        and one digit to prevent dictionary-based attacks.

        Returns:
            Self if password meets strength requirements.

        Raises:
            ValueError: If password fails complexity requirements.
        """
        pwd = self.password
        has_upper = any(c.isupper() for c in pwd)
        has_lower = any(c.islower() for c in pwd)
        has_digit = any(c.isdigit() for c in pwd)

        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, and one digit."
            )
        return self

    model_config = {
        # Reject unknown fields to prevent schema drift attacks
        "extra": "forbid",
    }
```

**Key security properties of this schema:**
- `extra: "forbid"` rejects payloads with unexpected fields — prevents attackers from injecting hidden parameters that silently bypass validation.
- Cross-field validator (`validate_password_strength`) catches complexity rules that cannot be expressed as simple field constraints.
- Field validators (`sanitize_username`, `strip_display_name`) normalize input before constraint checking, neutralizing whitespace-based bypasses.
- Type annotations serve as both documentation and runtime enforcement via Pydantic's coercion.

### Pattern 2: OWASP-Compliant HTML Sanitization (BAD vs. GOOD)

Context-aware sanitization is the core of XSS prevention. A naive character-replacement approach fails against dozens of XSS vectors documented in the OWASP Cross-Site Scripting (XSS) Prevention Cheat Sheet.

```python
"""HTML sanitization following OWASP XSS Prevention Cheat Sheet.

Demonstrates why allowlist-based sanitization is required over
naive string replacement, and how to configure Bleach for production use.
"""

# ❌ BAD — naive character replacement leaves multiple XSS vectors open
# and destroys legitimate rich-text content that needs formatting tags.
def bad_sanitize_html(raw_input: str) -> str:
    """Naive HTML sanitization that fails against common XSS attacks.

    This function replaces '<' and '>' characters with their entity equivalents,
    which is insufficient because it does not handle:
    - Event handler attributes (onclick="alert(1)") when <script> tags exist
    - Protocol-relative URLs (javascript://evil.com) in href attributes
    - Encoded XSS vectors (%3Cscript%3E that get decoded by the browser)
    - Unicode escape sequences (\\u003cscript\\u003e)
    
    This pattern is explicitly called out in OWASP guidelines as dangerous
    because blocklist-style filtering (removing specific chars) cannot cover
    all possible encoding and obfuscation techniques.

    Args:
        raw_input: Untrusted HTML string from user input.

    Returns:
        A string with angle brackets escaped — but still vulnerable to XSS.
    """
    return raw_input.replace("<", "&lt;").replace(">", "&gt;")


# ✅ GOOD — Bleach allowlist sanitization following OWASP recommendations
def sanitize_html(
    raw_input: str,
    allowed_tags: set[str] | None = None,
    allowed_attributes: dict[str, set[str]] | None = None,
) -> str:
    """Sanitize HTML input using Bleach with strict OWASP-compliant allowlists.

    This function follows the OWASP XSS Prevention Cheat Sheet's recommendation
    to use context-sensitive output encoding with an explicit allowlist of safe
    tags, attributes, and protocols. Unlike the naive approach, this handles:
    
    - Event handler attributes (onclick, onerror, onload) are stripped entirely
    - javascript: and data: URIs in href/src attributes are blocked
    - Foreign protocols (ftp:, tel:) are removed from links
    - Script tags and iframe elements are completely removed
    
    The allowlist approach is fundamentally more secure because it only permits
    known-safe constructs rather than trying to enumerate every dangerous pattern.

    Args:
        raw_input: Untrusted HTML string from user input (e.g., rich-text comments).
        allowed_tags: Explicit whitelist of HTML tags to preserve.
            Defaults to basic formatting tags for comment rendering.
        allowed_attributes: Mapping of tag name to set of allowed attribute names.
            Controls which attributes are preserved on each tag type.

    Returns:
        Sanitized HTML string safe for browser rendering without XSS risk.
        All dangerous constructs are stripped or neutralized per OWASP rules.

    Raises:
        TypeError: If raw_input is not a string.
    """
    import bleach

    if not isinstance(raw_input, str):
        raise TypeError(
            f"Expected str input for HTML sanitization, got {type(raw_input).__name__}"
        )

    # Minimal safe tag set — only formatting and structure, no interactive elements
    default_tags: set[str] = {
        "b", "i", "em", "strong", "p", "br",           # Text formatting
        "ul", "ol", "li",                                 # Lists
        "a",                                              # Links (attributes controlled separately)
        "code", "pre",                                    # Code blocks
        "h1", "h2", "h3",                                 # Headings
        "blockquote",                                     # Quotations
        "table", "thead", "tbody", "tr", "th", "td",     # Tables (read-only data)
    }

    # Attribute allowlist — extremely restrictive per OWASP
    # Only 'href', 'title', and 'rel' on <a> tags; no attributes on any other tag
    default_attributes: dict[str, set[str]] = {
        "a": {"href", "title", "rel"},                   # Links get href for navigation
    }

    # Protocol allowlist — only web-safe URI schemes allowed in href attributes
    safe_protocols: list[str] = ["http", "https", "mailto"]

    sanitizer = bleach.Cleaner(
        tags=allowed_tags or default_tags,
        attributes=allowed_attributes or default_attributes,
        protocols=safe_protocols,
        strip=True,                                        # Remove disallowed content entirely
        comments=False,                                    # Strip HTML comments (can carry XSS)
    )

    return sanitizer.clean(raw_input)


# Demonstration of why the naive approach fails and Bleach succeeds
if __name__ == "__main__":
    test_payloads: list[tuple[str, str]] = [
        # These payloads bypass the naive sanitizer but are caught by Bleach
        ("<script>alert(1)</script>", "script tag removed"),
        ('<img src=x onerror="alert(1)">', "event handler stripped"),
        ('<a href="javascript:alert(1)">click</a>', "javascript: URI blocked"),
    ]

    for payload, note in test_payloads:
        naive_result = bad_sanitize_html(payload)
        safe_result = sanitize_html(payload)
        print(f"\nPayload: {payload}")
        print(f"  Naive (vulnerable): {naive_result}")
        print(f"  Bleach (safe):      {safe_result} — {note}")
```

**OWASP alignment notes:**
- `strip=True` removes disallowed constructs entirely rather than attempting to escape them — aligns with OWASP's "always filter on output" principle.
- Protocol allowlisting prevents `javascript:`, `data:`, and `vbscript:` URI schemes which are the most common XSS vectors after event handlers.
- Comment stripping is often overlooked but HTML comments can contain XSS payloads in certain rendering contexts.

### Pattern 3: Defensive JSON Parsing with Defense in Depth

External JSON is a high-risk input surface — parsers have had critical vulnerabilities (CVE-2017-7658, CVE-2021-45961), and attackers exploit parser behavior differences to bypass validation. This pattern applies defense-in-depth: size limits, strict parsing, structure validation, and depth limiting all work together.

```python
"""Defensive JSON payload parsing with defense-in-depth strategy.

Each layer catches a different class of attack:
- Layer 1 (size): prevents DoS via oversized payloads / zip bombs
- Layer 2 (strict mode): rejects non-standard JSON extensions
- Layer 3 (structure check): ensures expected top-level type
- Layer 4 (depth limit): prevents stack overflow in recursive processing
"""

import json
from typing import Any


def parse_json_payload(
    raw_bytes: bytes,
    max_size: int = 1_048_576,
    max_depth: int = 10,
) -> dict[str, Any]:
    """Parse and validate a JSON payload with multiple defense layers.

    Implements defense-in-depth against JSON-based attacks by applying four
    independent validation layers before returning the parsed data. Each layer
    catches threats that the previous one might miss:

    Layer 1 — Size Limiting: Rejects payloads exceeding max_size bytes to prevent
        memory exhaustion DoS attacks, including gzip bombs and deeply compressed
        oversized payloads. Always check size BEFORE calling json.loads().

    Layer 2 — Strict Parsing: Uses Python's json.loads(strict=True) (Python 3.12+)
        to reject non-standard JSON extensions like trailing commas, single-quoted
        strings, and JSON comments that some permissive parsers accept.

    Layer 3 — Structure Validation: Ensures the top-level value is a dictionary
        (object), not a list (array) or scalar. API endpoints expect object-shaped
        payloads; arrays at the top level suggest the caller misunderstood the API.

    Layer 4 — Depth Limiting: Recursively calculates nesting depth and rejects
        deeply nested structures that could cause stack overflow during processing.
        A depth limit of 10 is sufficient for any reasonable data payload while
        blocking pathological cases used in ReDoS or DoS attacks.

    Args:
        raw_bytes: Raw request body bytes from external HTTP request or file read.
            Must be valid UTF-8 encoded JSON bytes.
        max_size: Maximum allowed payload size in bytes. Default is 1 MB (1,048,576).
            Adjust based on API requirements — smaller for simple endpoints,
            larger for document upload metadata endpoints.
        max_depth: Maximum allowed nesting depth. Default is 10 levels. Increase
            only if your data model genuinely requires deeper structures.

    Returns:
        Parsed dictionary containing the validated JSON data. All values are
        standard Python types (dict, list, str, int, float, bool, None).

    Raises:
        ValueError: If payload exceeds size limit, has invalid structure,
            or nesting depth exceeds maximum.
        json.JSONDecodeError: If payload is not valid JSON per RFC 8259.
        TypeError: If raw_bytes is not a bytes-like object.
    """
    # Layer 1 — Size limiting before parsing (prevents zip bomb / memory exhaustion)
    if len(raw_bytes) > max_size:
        raise ValueError(
            f"Payload size ({len(raw_bytes):,} bytes) exceeds maximum "
            f"allowed size ({max_size:,} bytes)"
        )

    # Layer 2 — Parse with strict mode (rejects trailing commas, comments, etc.)
    try:
        data = json.loads(raw_bytes, strict=True)
    except json.JSONDecodeError as exc:
        raise json.JSONDecodeError(
            msg=f"Malformed JSON at position {exc.pos}: {exc.msg}",
            doc=exc.doc,
            pos=exc.pos,
        ) from exc

    # Layer 3 — Validate top-level structure is a dictionary (not array or scalar)
    if not isinstance(data, dict):
        raise ValueError(
            f"Expected JSON object at top level, got {type(data).__name__}. "
            f"All API payloads must be JSON objects (key-value pairs)."
        )

    # Layer 4 — Reject deeply nested structures (prevent stack overflow in processing)
    actual_depth = _calculate_nesting_depth(data)
    if actual_depth > max_depth:
        raise ValueError(
            f"JSON nesting depth ({actual_depth}) exceeds maximum allowed "
            f"({max_depth} levels). Simplify your data structure."
        )

    return data


def _calculate_nesting_depth(obj: Any, current_depth: int = 0) -> int:
    """Calculate the maximum nesting depth of a JSON-serializable object.

    Recursively traverses nested dicts and lists to find the deepest level.
    Primitives (str, int, float, bool, None) are leaves at the current depth.

    Used as Layer 4 of defense-in-depth for parse_json_payload().

    Args:
        obj: The JSON-serializable object to analyze. Can be any Python type
            that json.loads() produces (dict, list, str, int, float, bool, None).
        current_depth: Recursion tracker — do not pass this from outside.
            Starts at 0 for the top-level object.

    Returns:
        The maximum nesting depth found in the object tree. A flat dict has
        depth 1; a dict containing a list of dicts has depth 3, etc.
    """
    if isinstance(obj, dict):
        if not obj:
            # Empty dict still counts as one level
            return current_depth + 1
        # Recurse into each value and take the maximum
        return max(_calculate_nesting_depth(value, current_depth + 1) for value in obj.values())
    elif isinstance(obj, list):
        if not obj:
            # Empty list still counts as one level
            return current_depth + 1
        # Recurse into each item and take the maximum
        return max(_calculate_nesting_depth(item, current_depth + 1) for item in obj)
    else:
        # Primitives (str, int, float, bool, None) are leaf nodes
        return current_depth


# Example usage demonstrating all four defense layers
if __name__ == "__main__":
    # Legitimate payload — passes all checks
    good_json = b'{"user": "alice", "score": 42, "tags": ["admin", "verified"]}'
    print(parse_json_payload(good_json))  # {'user': 'alice', 'score': 42, 'tags': [...]}

    # Oversized payload — caught by Layer 1
    huge_json = b'{"data": "' + b"x" * 2_000_000 + b'"}'
    try:
        parse_json_payload(huge_json)
    except ValueError as e:
        print(f"Layer 1 blocked: {e}")

    # Array at top level — caught by Layer 3
    array_json = b'[{"user": "alice"}, {"user": "bob"}]'
    try:
        parse_json_payload(array_json)
    except ValueError as e:
        print(f"Layer 3 blocked: {e}")
```

**Defense-in-depth rationale:**
No single check is sufficient. An attacker might find a way to compress an oversized payload below the size limit (compressing the bomb), or exploit a permissive JSON parser that accepts trailing commas. By layering independent checks, each with different failure modes, you ensure that even if one layer is bypassed, the next catches it. This principle — defense in depth — is recommended by OWASP for all security-critical input processing.

### Pattern 4: CLI Argument Validation with Path Traversal Prevention

Command-line tools are often overlooked as attack surfaces, but unvalidated file paths lead to path traversal, symlink attacks, and arbitrary file access. This pattern shows how to build argparse-based validation that prevents these attacks.

```python
"""CLI argument validation with path traversal prevention.

Demonstrates secure file path handling in CLI tools using:
- Custom argparse type function for integrated validation
- Path resolution to detect symlink escapes
- Base directory enforcement via prefix matching
- Read/write permission checks before file access
"""

import argparse
import os
import sys
from pathlib import Path


def validate_file_path(
    value: str,
    base_directory: Path | None = None,
    must_exist: bool = True,
) -> Path:
    """Validate a command-line file path argument with comprehensive checks.

    This function is designed to be used as the `type=` parameter in argparse's
    add_argument() call. It performs four sequential safety checks:

    1. Resolution: Converts the string to an absolute, resolved Path (following symlinks).
       This catches relative path tricks like "../../etc/passwd".

    2. Base directory enforcement: If a base_directory is provided, verifies that
       the resolved path lies within it using os.path.commonpath(). Prevents an attacker
       from using path traversal to access files outside the intended directory tree.

    3. Existence check: Validates the path exists (unless must_exist=False for output paths).

    4. Permission check: Verifies the user has the required access rights before the
       tool attempts to open the file, providing a clear error message.

    This pattern prevents:
    - Path traversal attacks (../../etc/passwd)
    - Symlink-based escape attacks (symlinks pointing outside base directory)
    - Race condition windows by checking permissions at argument validation time
    - Permission denied errors late in execution

    Args:
        value: Raw path string from command-line argument.
        base_directory: If provided, the resolved path must be within this directory.
            Use this for tools that only process files from a specific folder.
        must_exist: Set to False for output file paths that will be created later.
            Set to True (default) for input files that must already exist.

    Returns:
        Resolved Path object if all checks pass. The path is absolute and has
        symlinks resolved, so it represents the true filesystem location.

    Raises:
        argparse.ArgumentTypeError: Raised by argparse with a user-friendly message.
            Always use this type (not ValueError) so argparse displays it correctly
            in the error output next to "--help".
    """
    raw_path = Path(value)
    
    # Resolve symlinks and relative components to get absolute path
    resolved_path = raw_path.resolve()

    # Check 1 — Base directory enforcement (path traversal prevention)
    if base_directory is not None:
        # Use os.path.commonpath for cross-platform safety
        try:
            common = os.path.commonpath([str(base_directory), str(resolved_path)])
        except ValueError:
            raise argparse.ArgumentTypeError(
                f"Path and base directory are on different drives or volumes: {value}"
            )
        
        if not common.startswith(str(base_directory)):
            raise argparse.ArgumentTypeError(
                f"Path traversal detected: '{value}' resolves outside allowed "
                f"base directory '{base_directory}'. Use a path within that directory."
            )

    # Check 2 — Existence validation for input files
    if must_exist and not resolved_path.exists():
        raise argparse.ArgumentTypeError(f"File does not exist: '{value}'")

    # Check 3 — Must be a regular file (not a directory or device)
    if must_exist and not resolved_path.is_file():
        raise argparse.ArgumentTypeError(
            f"Path is not a regular file: '{value}'. Expected a file, got {resolved_path.type()}"
        )

    # Check 4 — Read permission check for input files
    if must_exist and not os.access(resolved_path, os.R_OK):
        raise argparse.ArgumentTypeError(
            f"File is not readable (permission denied): '{value}'"
        )

    return resolved_path


def validate_output_directory(value: str) -> Path:
    """Validate and create an output directory for CLI tool results.

    Unlike input paths, output directories should be created if they don't exist.
    Base directory enforcement still applies to prevent writing files outside the
    intended location.

    Args:
        value: Raw path string from command-line argument.

    Returns:
        Resolved Path object for the output directory, created if necessary.

    Raises:
        argparse.ArgumentTypeError: If path resolution fails or parent dir is unwritable.
    """
    raw_path = Path(value)
    resolved_path = raw_path.resolve()

    # Create intermediate directories if they don't exist
    try:
        resolved_path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise argparse.ArgumentTypeError(
            f"Cannot create output directory '{value}': {exc}"
        ) from exc

    return resolved_path


def build_parser() -> argparse.ArgumentParser:
    """Build CLI argument parser with all arguments validated at parse time.

    Demonstrates integrating custom validation functions into argparse's type system.
    All paths are validated before main() runs, so the application body only deals
    with trusted, pre-validated values.

    Returns:
        Fully configured ArgumentParser ready for parse_args().
    """
    parser = argparse.ArgumentParser(
        prog="data-processor",
        description=(
            "Process data files from an input directory and write results to an output directory."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Security note: All file paths are validated for existence, type, permissions, "
            "and path traversal before processing begins."
        ),
    )

    allowed_base = Path("/data/input").resolve()

    parser.add_argument(
        "input_file",
        type=lambda v: validate_file_path(v, base_directory=allowed_base, must_exist=True),
        metavar="FILE",
        help=(
            f"Input file to process (must exist, be a regular file, be readable, "
            f"and reside under {allowed_base}). Symlinks are resolved."
        ),
    )

    parser.add_argument(
        "--max-records",
        type=int,
        default=10_000,
        choices=range(1, 1_000_001),
        metavar="N",
        help=(
            "Maximum number of records to process. Default: 10000. "
            "Range: 1 to 999999."
        ),
    )

    parser.add_argument(
        "--output-dir",
        type=validate_output_directory,
        default=Path("./output"),
        metavar="DIR",
        help="Directory for output files (created automatically if it does not exist).",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Validate all inputs and report findings without modifying any files.",
    )

    return parser


def main() -> int:
    """Entry point — parse args (which validates everything), then process."""
    parser = build_parser()

    try:
        args = parser.parse_args()
    except SystemExit as exc:
        # argparse calls sys.exit(2) on error; convert to clean exit code
        return 1 if exc.code != 0 else 0

    print(f"Processing {args.input_file} (up to {args.max_records} records)...")
    print(f"Output directory: {args.output_dir}")
    if args.dry_run:
        print("Dry run mode — no files will be modified.")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

**Security properties of this CLI pattern:**
- `resolve()` follows symlinks to the actual filesystem target, preventing symlink-based path escape. An attacker could create a symlink `/data/input/../../etc/passwd` but `resolve()` would point to `/etc/passwd`, which fails the base directory check.
- `os.path.commonpath()` is used instead of string prefix matching because it handles edge cases like `/data/input-sneaky` vs `/data/input` — the latter would be incorrectly allowed by naive `"path.startswith(base)"`.
- Argument validation happens at parse time via argparse's `type=` parameter, so the rest of the application never deals with raw strings from users.

---

## Constraints

### MUST DO
- Define explicit schema or type contract before writing any validation logic — do not write ad-hoc checks piecemeal
- Use allowlists (whitelists) for accepted values and formats — never rely on blocklists of dangerous values, which are always incomplete
- Validate at the system boundary — never pass raw external strings deeper into your business logic without first running them through a schema validator
- Return structured error responses that identify exactly which fields failed and the specific validation rule they violated — this is critical for both debugging and API usability
- Test with adversarial inputs systematically: SQL injection strings (`' OR 1=1 --`), XSS payloads (`<script>alert(1)</script>`), oversized bodies (>max_size), null bytes (`\x00`), Unicode edge cases (surrogate pairs, mixed normalization forms), and deeply nested structures
- Apply the principle of least privilege: reject payloads containing unknown or extra fields rather than silently dropping them — silent dropping means a field that was meant to be validated is effectively unvalidated

### MUST NOT DO
- Concatenate user input directly into SQL queries, shell commands, or file paths — even after validation, use parameterized queries and argument-list subprocess calls as your primary defense
- Rely solely on regex for complex validation — regex-based injection filters are famously bypassable through encoding tricks, Unicode confusion, and parser-specific behavior differences
- Trust `Content-Type` headers sent by clients — these are trivially spoofed by any HTTP client; always inspect the actual content bytes to determine true format
- Log raw user input at any log level (including DEBUG) — it may contain passwords, API tokens, personally identifiable information, or other secrets that would be leaked into log aggregation systems
- Accept partial validation of a payload — if any single field fails its constraint, reject the entire request. Partial acceptance creates inconsistent state and is exploitable as a logic bypass
- Use client-side validation (JavaScript in browser) as a security boundary — browsers can be bypassed entirely by attackers using curl, Postman, or custom HTTP clients; server-side validation is the only valid security control

---

## Output Template

When implementing or reviewing input validation logic, produce:

1. **Schema Definition** — Complete input contract with types, constraints (min/max/range/pattern), required vs optional fields, and whether unknown fields are allowed or forbidden
2. **Sanitization Strategy** — How dangerous content is neutralized per context (HTML sanitization via allowlist tags, SQL injection prevention via parameterized queries, shell command safety via argument lists)
3. **Validation Checks** — Each constraint applied in order with its corresponding error message format, indicating which field failed and which rule was violated
4. **Failure Handling** — Logging approach (what context is included vs excluded for security), structured error response format returned to callers, and whether validation errors are logged at WARN or ERROR level
5. **Adversarial Test Coverage** — Categories of malicious inputs that were tested: injection payloads (SQL, XSS, command injection), boundary attacks (oversized, deeply nested), encoding attacks (URL-encoded, Unicode normalization), and logic attacks (missing required fields, wrong types, extra fields)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `security-review` | Comprehensive security audit catching input validation gaps alongside other vulnerabilities including authentication flaws, access control issues, and insecure configurations |
| `test-driven-development` | Writing validation tests before implementation to ensure all edge cases are covered, boundary conditions pass, and adversarial inputs are caught early in the development cycle |
| `error-handling` | Proper error response formatting for API consumers and structured logging practices that capture enough debug context without exposing sensitive data about internal system state |
