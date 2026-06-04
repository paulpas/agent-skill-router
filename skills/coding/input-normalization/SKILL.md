---
name: input-normalization
description: Normalizes and standardizes inconsistent inbound data into uniform internal
  formats using typed normalizers, locale-aware converters, and deterministic transformation
  pipelines for reliable downstream processing.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: input normalization, data standardization, date parsing, currency conversion,
    phone number format, address normalization, text normalization, how do i normalize
    data, data cleaning, convert formats
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
  related-skills: input-validation, data-encoding, input-processing-pipelines, type-safety-enforcement
---
# Input Normalization & Data Standardization Engineer

Normalizes heterogeneous inbound data into consistent internal representations through deterministic transformation pipelines. Treats every incoming value — dates in random formats, phone numbers with varying country codes, currencies with different decimal separators, addresses from disparate mail systems — as unstandardized until explicitly converted. Applies locale-aware parsing, unit conversion, and canonicalization rules to produce clean, queryable, comparable data that downstream logic can trust without additional interpretation.

## TL;DR Checklist

- [ ] Normalize every field at the system boundary before passing to business logic
- [ ] Choose explicit parse strategies per field type (date formats, number locales, phone prefixes)
- [ ] Convert all dates to UTC ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) internally
- [ ] Standardize numeric values to decimal types with explicit precision — never use floating-point for currency
- [ ] Normalize phone numbers to E.164 format (+C[CC]NNNNNNNNNN) using a library like `phonenumbers`
- [ ] Canonicalize text: strip whitespace, normalize unicode (NFKC), collapse internal runs of spaces
- [ ] Document the canonical form for every data field in your schema contracts
- [ ] Test normalizers with real-world messy data — never assume inputs are well-formatted

---

## When to Use

Use this skill when:

- Receiving data from multiple external sources that use different formats (e.g., EU dates `DD.MM.YYYY` vs US dates `MM/DD/YYYY`)
- Building a system that aggregates customer records where phone numbers arrive in local, national, and international formats
- Converting legacy database values into modern application types (e.g., epoch timestamps to ISO 8601, Roman numerals to integers)
- Processing financial data with mixed currency symbols (`$1,234.56`, `€1.234,56`, `¥1234.56`) and need a canonical decimal representation
- Normalizing user-generated text that contains inconsistent spacing, unicode normalization forms, or encoding artifacts

---

## When NOT to Use

Avoid this skill for:

- Security-focused input validation — use `input-validation` for schema enforcement, injection prevention, and XSS/SQLi sanitization instead
- Binary data handling or file format conversion — those belong in `data-encoding` for base64, MIME multipart, or binary protocol parsing
- ETL pipelines with batch transformations — use `input-processing-pipelines` when you need streaming, parallel processing, or multi-stage data flows rather than single-value normalization

---

## Core Workflow

1. **Catalog Data Variants** — Survey every external data source and enumerate all known format variants for each field type. For dates, document every observed format (`MM/DD/YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`, Unix epoch, ordinal dates). For phone numbers, list all observed formats (national with country code, local without area code, international E.164, extended with extension codes like `x123`). **Checkpoint:** Create a format registry table mapping each source → every known variant → the canonical internal representation for that field type.

2. **Select Parse Libraries Strategically** — Choose purpose-built parsing libraries rather than rolling custom regex-based parsers. Use `dateutil.parser` with explicit default timezones for date strings, the `phonenumbers` library for phone normalization, `babel.numbers` for locale-aware number parsing, and `unicodedata.normalize("NFKC", ...)` for text canonicalization. Avoid writing custom format detectors — they are brittle and miss edge cases that battle-tested libraries handle correctly. **Checkpoint:** Every parse call must specify explicit fallback behavior when the primary parser fails — never let a malformed date string crash an entire request.

3. **Apply Canonical Transformation Rules** — Run each normalized value through its canonical transformation pipeline: dates → UTC ISO 8601 strings or `datetime` objects with explicit timezone, phone numbers → E.164 format (`+14155552671`), currency amounts → decimal with two-integer cents representation and isolated currency code, text → NFC-normalized unicode with stripped leading/trailing whitespace and collapsed internal runs of one or more spaces into a single space. **Checkpoint:** The canonical form must be deterministic — the same input always produces the same output regardless of the system locale, timezone, or platform running the code.

4. **Handle Ambiguity Explicitly** — When a normalizer cannot unambiguously determine the correct canonical form (e.g., `03/04/2024` could be March 4 or April 3), use contextual clues in priority order: source system convention, user locale preference, geographic origin IP, then a configurable default. If no context is available and ambiguity cannot be resolved, raise a structured error identifying the ambiguous field rather than silently guessing. **Checkpoint:** Never suppress ambiguity — logging a warning and picking one interpretation silently is as bad as crashing; always surface the ambiguity to the caller with suggested fixes.

5. **Validate Canonical Output** — After normalization, verify that the canonical output conforms to the expected internal type constraints (e.g., ISO 8601 dates parse back correctly, E.164 phone numbers match the regex `^\+[1-9]\d{1,14}$`, currency decimals have at most two decimal places). This catches edge cases where a parse library succeeded but produced an unexpected result. **Checkpoint:** If canonical validation fails, log the raw input alongside the malformed normalized output for debugging — this is always a bug in the normalizer configuration, not user error.

---

## Implementation Patterns

### Pattern 1: Universal Date/Time Normalization

Convert dates from any common format into UTC ISO 8601 internal representation. Handles timestamps with timezone offsets, naive local times, epoch integers, and human-readable strings like "yesterday" or "Jan 15 2024".

```python
"""Universal date/time normalizer — converts heterogeneous date inputs to UTC ISO 8601.

Supports:
- ISO 8601 with timezone offset (+05:30, -04:00)
- US format (MM/DD/YYYY), EU format (DD.MM.YYYY), and Asian format (YYYY/MM/DD)
- Human-readable relative dates ("today", "yesterday", "next Monday")
- Unix epoch timestamps (seconds or milliseconds)
- Legacy formats from popular systems (Excel serial dates, JavaScript Date strings)

All outputs are UTC datetime objects — the application domain never stores local time.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional


class DateNormalizer:
    """Converts date strings and numeric timestamps to UTC datetime objects."""

    RELATIVE_DATE_PATTERNS = {
        "today": lambda today: today.replace(hour=0, minute=0, second=0),
        "yesterday": lambda today: (today - timedelta(days=1)).replace(
            hour=0, minute=0, second=0
        ),
        "tomorrow": lambda today: (today + timedelta(days=1)).replace(
            hour=0, minute=0, second=0
        ),
    }

    def __init__(self, default_timezone: str = "UTC") -> None:
        self.default_tz = timezone.utc if default_timezone == "UTC" else timezone.utc

    def normalize(
        self,
        value: object,
        source_locale: Optional[str] = None,
        fallback_date: Optional[datetime] = None,
    ) -> datetime:
        """Normalize any date input to a UTC datetime object.

        Args:
            value: Date string in any supported format, or Unix timestamp (int/float).
            source_locale: Hint for ambiguous formats — "US", "EU", "JP".
            fallback_date: Date to use if normalization fails entirely.

        Returns:
            A timezone-aware datetime object in UTC.

        Raises:
            ValueError: If the value cannot be parsed into any recognized format
                and no fallback is provided or applicable.
        """
        # Handle relative date strings like "today", "yesterday"
        if isinstance(value, str):
            lower = value.strip().lower()
            if lower in self.RELATIVE_DATE_PATTERNS:
                today = fallback_date or datetime.now(timezone.utc)
                return self.RELATIVE_DATE_PATTERNS[lower](today)

        # Handle epoch timestamps (numeric)
        if isinstance(value, (int, float)):
            if value > 1e12:
                value = value / 1000.0
            return datetime.fromtimestamp(value, tz=timezone.utc)

        if not isinstance(value, str):
            raise ValueError(f"Cannot normalize {type(value).__name__} as a date")

        parsed_date = self._parse_string(value, source_locale)
        if parsed_date is None:
            if fallback_date:
                return fallback_date
            raise ValueError(
                f"Unrecognized date format: '{value}'. "
                f"Supported formats include ISO 8601, MM/DD/YYYY (US), DD.MM.YYYY (EU), "
                f"and human-readable strings like 'Jan 15, 2024'."
            )

        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=self.default_tz)

        return parsed_date.astimezone(timezone.utc)

    def _parse_string(self, value: str, source_locale: Optional[str]) -> Optional[datetime]:
        """Attempt to parse a date string by trying each known format in priority order."""
        stripped = value.strip()

        # 1. ISO 8601
        try:
            if stripped.endswith("Z"):
                parsed_date = datetime.fromisoformat(stripped[:-1] + "+00:00")
                return parsed_date.astimezone(timezone.utc)
            else:
                parsed_date = datetime.fromisoformat(stripped)
                return parsed_date.astimezone(timezone.utc)
        except (ValueError, TypeError):
            pass

        # 2. Locale-specific numeric formats
        if source_locale == "US" or (source_locale is None and self._detect_us_format(stripped)):
            result = self._try_parse_numeric(stripped, order="mdy", delimiters="/-")
            if result:
                return result

        if source_locale == "EU" or (source_locale is None and self._detect_eu_format(stripped)):
            result = self._try_parse_numeric(stripped, order="dmy", delimiters=".")
            if result:
                return result

        # 3. Text-based formats
        return self._try_parse_text_date(stripped)

    @staticmethod
    def _detect_us_format(value: str) -> bool:
        """Heuristic: US format has month first when day > 12."""
        match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", value)
        if not match:
            return False
        month = int(match.group(1))
        return month > 12

    @staticmethod
    def _detect_eu_format(value: str) -> bool:
        """Heuristic: EU format uses dots."""
        return "." in value

    @staticmethod
    def _try_parse_numeric(
        value: str, order: str, delimiters: str
    ) -> Optional[datetime]:
        """Parse numeric date with specified component order and delimiter."""
        pattern = re.compile(r"(\d{1,2})[" + re.escape(delimiters) + r"](\d{1,2})["
                             + re.escape(delimiters) + r"](\d{4})")
        match = pattern.match(value.strip())
        if not match:
            return None

        a, b, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            if order == "mdy":
                return datetime(year=year, month=a, day=b, tzinfo=timezone.utc)
            elif order == "dmy":
                return datetime(year=year, month=b, day=a, tzinfo=timezone.utc)
        except ValueError:
            pass
        return None

    @staticmethod
    def _try_parse_text_date(value: str) -> Optional[datetime]:
        """Parse text-based date like 'January 15, 2024' or 'Jan 15, 2024'."""
        short_months = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }

        short_pattern = re.match(r"^([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})$", value.strip())
        if short_pattern:
            month_num = short_months.get(short_pattern.group(1).lower())
            if month_num:
                return datetime(
                    year=int(short_pattern.group(3)),
                    month=month_num,
                    day=int(short_pattern.group(2)),
                    tzinfo=timezone.utc,
                )

        long_pattern = re.match(r"^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$", value.strip())
        if long_pattern:
            month_name = long_pattern.group(1).lower()
            month_num = short_months.get(month_name[:3])
            if month_num:
                return datetime(
                    year=int(long_pattern.group(3)),
                    month=month_num,
                    day=int(long_pattern.group(2)),
                    tzinfo=timezone.utc,
                )

        return None
```

### Pattern 2: Phone Number Normalization to E.164 (BAD vs. GOOD)

Phone numbers arrive in wildly inconsistent formats. The E.164 standard is the only universally interoperable format for telecommunications systems and CRM databases.

```python
"""Phone number normalizer — converts all phone formats to E.164 canonical form.

E.164 format: +[country_code][subscriber_number]
Examples:
  US:      (555) 123-4567 → +15551234567
  UK:      020 7946 0958  → +442079460958
  Germany: +49 (0) 30 12345678 → +493012345678

Uses Google's libphonenumber for accurate parsing and validation.
"""

# ❌ BAD — manual regex-based phone parsing is fragile and breaks on edge cases
def bad_normalize_phone(raw: str) -> str:
    """Naive phone normalization that fails on international numbers, extensions, and
    various formatting styles. This pattern works only for one country's format.

    Problems:
    - Does not handle international numbers with + prefix
    - Cannot distinguish between country code (1) and area code (555) in US numbers
    - Strips extension codes entirely instead of preserving them separately
    - Breaks on any non-standard formatting like spaces, dots, or dashes
    - No validation that the parsed number is actually a valid phone number

    Args:
        raw: Raw phone number string from user input.

    Returns:
        A cleaned string that may not be E.164 compliant.
    """
    digits = re.sub(r"[^\d]", "", raw)
    if len(digits) == 11 and digits.startswith("1"):
        return f"+1{digits[1:]}"
    elif len(digits) == 10:
        return f"+1{digits}"
    return f"+{digits}"


# ✅ GOOD — Google's libphonenumber handles all edge cases correctly
class PhoneNormalizer:
    """Normalize phone numbers to E.164 canonical form using Google's libphonenumber."""

    def normalize(self, raw: str) -> dict:
        """Normalize a phone number string to E.164 canonical form.

        Parses the input using libphonenumber's robust parser, extracts the
        international E.164 number and any extension code, and validates that
        the result is a reachable number format.

        Args:
            raw: Raw phone number string from user input. May include formatting
                characters (parentheses, dashes, spaces), country codes (+1, +44),
                extensions (ext., x123), or be entirely invalid.

        Returns:
            Dictionary with keys:
              - 'e164': E.164 formatted string if parsing succeeded, None otherwise.
              - 'extension': Extension number as string if present in input, None.
              - 'valid': Boolean indicating whether the parsed number is valid.
              - 'error': Error message string if parsing failed, None on success.

        Raises:
            TypeError: If raw is not a string.
        """
        if not isinstance(raw, str):
            raise TypeError(f"Phone input must be a string, got {type(raw).__name__}")

        import phonenumbers

        # Extract extension before parsing — extensions are not part of E.164
        extension = None
        cleaned = raw.strip()

        ext_match = re.search(
            r"(?:ext\.?|x|#)\s*(\d+)", raw, re.IGNORECASE
        )
        if ext_match:
            extension = ext_match.group(1)
            cleaned = raw[:ext_match.start()].strip()

        try:
            parsed = phonenumbers.parse(cleaned, None)

            if not phonenumbers.is_valid_number(parsed):
                return {
                    "e164": None,
                    "extension": extension,
                    "valid": False,
                    "error": f"Invalid phone number: {raw}",
                }

            e164 = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )

            return {
                "e164": e164,
                "extension": extension,
                "valid": True,
                "error": None,
            }

        except phonenumbers.NumberParseException as exc:
            return {
                "e164": None,
                "extension": extension,
                "valid": False,
                "error": f"Failed to parse phone number '{raw}': {exc.message}",
            }


# Demonstration with real-world test cases
if __name__ == "__main__":
    normalizer = PhoneNormalizer()

    test_cases = [
        ("(555) 123-4567", "US local with area code formatting"),
        ("+44 20 7946 0958", "UK international format"),
        ("020 7946 0958", "UK national format (without country code)"),
        ("+49 (0) 30 12345678", "Germany with trunk prefix in parentheses"),
        ("+1 555 123 4567 ext. 100", "US number with extension"),
        ("invalid-phone", "Invalid input that should be caught gracefully"),
    ]

    for raw, description in test_cases:
        result = normalizer.normalize(raw)
        status = "VALID" if result["valid"] else "INVALID"
        print(f"\n{description}:")
        print(f"  Input:  '{raw}'")
        print(f"  Result: {status}")
        if result["e164"]:
            ext_note = f" ext.{result['extension']}" if result['extension'] else ""
            print(f"  E.164:  {result['e164']}{ext_note}")
        if result.get("error"):
            print(f"  Error:  {result['error']}")
```

**Why libphonenumber over custom parsing:**
The `phonenumbers` library is the Python binding for Google's libphonenumber, which powers Android's phone dialer and Gmail's contact parsing. It maintains a comprehensive database of all country dialing codes, number lengths, formatting rules, and edge cases — far beyond what any custom regex can cover. Using it prevents subtle bugs where a UK number `07911 123456` (mobile) would be incorrectly parsed as a London landline by a naive parser.

### Pattern 3: Currency Amount Normalization

Convert currency amounts from human-readable formats (`$1,234.56`, `€1.234,56`, `¥1234.56`) into canonical decimal representations with isolated currency codes. Handles thousands separators that differ by locale and floating-point precision pitfalls.

```python
"""Currency amount normalizer — converts locale-specific number formats to canonical decimals.

Handles the most common international number formatting conventions:
  US/UK:   $1,234.56     → Decimal(1234.56), currency="USD"
  EU:      €1.234,56     → Decimal(1234.56), currency="EUR"  
  JP:      ¥1,235        → Decimal(1235), currency="JPY"

Uses Python's decimal.Decimal for exact arithmetic — never float for money.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation


class CurrencyNormalizer:
    """Normalize locale-specific currency strings to canonical Decimal + currency code."""

    CURRENCY_SYMBOLS = {
        "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR",
        "₩": "KRW", "₽": "RUB", "A$": "AUD", "C$": "CAD",
    }

    ALPHA_CURRENCIES = {
        code: symbol for symbol, code in CURRENCY_SYMBOLS.items()
    }

    def normalize(self, raw: str) -> tuple[Decimal, str]:
        """Normalize a currency string to (decimal amount, ISO 4217 currency code).

        Args:
            raw: Currency amount as a string with optional symbol, thousands separators,
                and decimal point. Examples: "$1,234.56", "€1.234,56".

        Returns:
            Tuple of (Decimal amount, ISO 4217 currency code string).

        Raises:
            ValueError: If the string cannot be parsed as a valid currency amount.
        """
        if not isinstance(raw, str):
            raise TypeError(f"Currency input must be a string, got {type(raw).__name__}")

        stripped = raw.strip()
        if not stripped:
            raise ValueError("Empty currency string")

        amount_str, currency_code = self._detect_currency(stripped)

        try:
            amount = self._parse_decimal(amount_str, currency_code)
        except (InvalidOperation, ValueError) as exc:
            raise ValueError(
                f"Cannot parse currency amount '{stripped}': {exc}"
            ) from exc

        amount = self._round_by_currency(amount, currency_code)

        return amount, currency_code

    def _detect_currency(self, raw: str) -> tuple[str, str]:
        """Detect currency code and extract the numeric portion."""
        for code in self.ALPHA_CURRENCIES:
            if raw.upper().startswith(code + " ") or raw.upper().endswith(" " + code):
                amount_str = raw.upper().replace(code, "").strip()
                return amount_str, code

        for symbol, code in self.CURRENCY_SYMBOLS.items():
            if raw.startswith(symbol) or raw.endswith(symbol):
                amount_str = raw.replace(symbol, "").strip()
                return amount_str, code

        return raw, "USD"

    def _parse_decimal(self, amount_str: str, currency_code: str) -> Decimal:
        """Parse the numeric portion of a currency string into Decimal."""
        cleaned = amount_str.replace("'", "").replace(" ", "")

        is_negative = cleaned.startswith("-")
        if is_negative:
            cleaned = cleaned[1:]

        # Handle currencies with no decimal places
        if currency_code in ("JPY", "KRW", "VND"):
            cleaned = cleaned.replace(".", "")
            decimal_places = 0
        else:
            cleaned, decimal_places = self._detect_separators(cleaned)

        cleaned = cleaned.replace(",", "")
        result_str = ("-" if is_negative else "") + cleaned

        quantizer = Decimal("1." + "0" * decimal_places)
        return Decimal(result_str).quantize(quantizer, rounding=ROUND_HALF_UP)

    @staticmethod
    def _detect_separators(amount_str: str) -> tuple[str, int]:
        """Detect whether comma or period is the decimal separator."""
        last_comma = amount_str.rfind(",")
        last_period = amount_str.rfind(".")

        if last_comma < 0 and last_period < 0:
            return amount_str, 2

        if last_comma > last_period:
            # Comma is decimal separator (EU format: 1.234,56)
            parts = amount_str.replace(".", "").split(",", 1)
            integer_part = parts[0]
            decimal_part = parts[1] if len(parts) > 1 else ""
            return f"{integer_part}.{decimal_part}", len(decimal_part)

        # Period is decimal separator (US format: 1,234.56)
        parts = amount_str.split(".", 1)
        integer_part = parts[0]
        decimal_part = parts[1] if len(parts) > 1 else ""
        return f"{integer_part},{decimal_part}", len(decimal_part)

    @staticmethod
    def _round_by_currency(amount: Decimal, currency_code: str) -> Decimal:
        """Round to the appropriate number of decimal places for its currency."""
        decimals_0 = {"JPY", "KRW", "VND"}
        decimals_3 = {"BHD", "JOD", "KWD", "OMR", "TND"}

        if currency_code in decimals_0:
            quantizer = Decimal("1")
        elif currency_code in decimals_3:
            quantizer = Decimal("0.001")
        else:
            quantizer = Decimal("0.01")

        return amount.quantize(quantizer, rounding=ROUND_HALF_UP)


# Demonstration with international test cases
if __name__ == "__main__":
    normalizer = CurrencyNormalizer()

    test_cases = [
        "$1,234.56",          # US format
        "€1.234,56",         # EU format  
        "£999.99",           # UK format
        "¥1,235",            # Japanese (no decimal places)
        "-$42.50",           # Negative amount
        "100 USD",           # Alphabetic currency code prefix
    ]

    for raw in test_cases:
        try:
            amount, currency = normalizer.normalize(raw)
            print(f"{raw:>15} → {amount:>12} {currency}")
        except ValueError as exc:
            print(f"{raw:>15} → ERROR: {exc}")
```

**Key design decisions:**
- `Decimal` over `float`: Floating-point arithmetic loses precision (`0.1 + 0.2 = 0.30000000000000004`). Currency must use exact decimal representation. Python's `decimal.Decimal` is the standard choice for handling arbitrary precision and avoiding binary floating-point conversion issues.
- Round-by-currency: Not all currencies use 2 decimal places. Japanese yen has no subunit, Bahraini dinar uses 3. The normalizer automatically rounds to the correct precision for each currency code.

---

## Constraints

### MUST DO
- Normalize all date/time inputs to UTC ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) internally — never store local timezone dates as the canonical form
- Use purpose-built libraries for parsing (dateutil, phonenumbers, babel) rather than custom regex-based parsers which are brittle and miss edge cases
- Represent all monetary values using `decimal.Decimal` with explicit rounding to currency-appropriate precision — never use floating-point arithmetic for money calculations
- Apply Unicode NFKC normalization to all text fields before any comparison or storage — this prevents identical strings that differ only in unicode normalization form from being treated as different values
- Handle ambiguity explicitly: if a parser cannot determine the correct interpretation, raise a structured error with context about what was ambiguous rather than silently guessing and logging a warning
- Document the canonical internal form for every field type in your schema contracts so downstream developers know exactly what format to expect

### MUST NOT DO
- Use `float` or `double` types for any monetary value — floating-point rounding errors will corrupt financial calculations
- Normalize phone numbers by simply stripping non-digit characters — this destroys the distinction between country code and area code and produces invalid E.164 numbers for international formats
- Trust locale-specific date formats without explicit context — `03/04/2024` is ambiguous (March 4 vs April 3) and guessing leads to data corruption that is extremely difficult to trace back
- Apply normalization rules inconsistently across different code paths — if one part of the system normalizes dates to ISO 8601 and another stores Unix timestamps, you cannot reliably compare or query them
- Store normalized values in a less precise format than the original — if a source provides millisecond-precision timestamps, do not truncate to seconds during normalization

---

## Output Template

When implementing or reviewing data normalization code, produce:

1. **Canonical Format Specification** — For each field type, document the exact internal representation (e.g., dates → `datetime` UTC objects, phones → E.164 strings, currency → `Decimal` + ISO 4217 code)
2. **Parse Library Selection** — Justify why each parsing library was chosen and list alternative approaches that were considered and rejected with reasoning
3. **Ambiguity Resolution Strategy** — Describe how unambiguous cases are resolved (source locale hint, geographic context, explicit user preference), including the fallback behavior for truly ambiguous inputs
4. **Canonical Validation Checks** — List the post-normalization verification steps for each field type to ensure the output conforms to the canonical form
5. **Locale Coverage Matrix** — Table mapping each known input format to the parsing strategy used, including which test cases cover that format and what edge cases were tested

---

## Related Skills

| Skill | Purpose |
|---|---|
| `input-validation` | Enforces schema contracts and security constraints on validated data after normalization has already produced clean canonical forms — works in tandem to ensure both format correctness and security |
| `data-encoding` | Handles binary encoding/decoding (base64, hex, MIME multipart) for raw bytes before they reach the text-level normalization layer |
| `input-processing-pipelines` | Chains multiple normalizers into streaming transformation pipelines when you need to process bulk data through sequential normalization stages with error handling and retry logic |
| `type-safety-enforcement` | Applies runtime type checking and static analysis patterns that complement normalization by ensuring normalized values conform to expected types at module boundaries |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Unicode Normalization Forms (W3C)](https://www.w3.org/International/articles/string-byte-segments/) — W3C's guide to Unicode normalization forms (NFC, NFD, NFKC, NFKD) for text processing
- [Input Validation Best Practices (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) — OWASP's input validation cheat sheet covering sanitization and normalization strategies
- [Python str.normalize (unicodedata)](https://docs.python.org/3/library/unicodedata.html#unicodedata.normalize) — Python's unicodedata module documentation for Unicode text normalization
- [HTML Sanitization Libraries (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — OWASP reference on sanitizing user input to prevent XSS and injection attacks
- [RFC 3986: URI Normalization](https://datatracker.ietf.org/doc/html/rfc3986#section-6) — IETF RFC for URI syntax including normalization and comparison rules
