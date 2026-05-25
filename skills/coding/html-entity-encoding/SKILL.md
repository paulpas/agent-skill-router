---
name: html-entity-encoding
description: Encodes HTML special characters (&lt; &gt; &amp; &quot; &#39;) into safe
  entity references to prevent XSS, ensure correct rendering, and handle character
  data safely across web frameworks and output contexts.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: html entities, entity encoding, html escaping, &amp; ampersand, &lt; less
    than, &gt; greater than, character references, HTML5 entities, XSS prevention,
    framework escaping, dangerouslySetInnerHTML, innerHTML, DOMPurify
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
  - examples
  - do-dont
  related-skills: output-sanitization, input-validation, api-security-patterns
------
# HTML Entity Encoding Reference

Encodes HTML special characters into safe entity references to prevent cross-site scripting (XSS) attacks, ensure correct document rendering, and handle character data safely across different output contexts. Treat every string that flows through your application as a potential injection vector and apply the appropriate entity encoding based on where the data will be rendered — whether in HTML body text, attribute values, JavaScript blocks, CSS rules, or URL parameters. Follow OWASP's Context-Specific Output Encoding guidelines to prevent structural markup injection at every output boundary.

## TL;DR Checklist

- [ ] Determine the exact rendering context (HTML body, attribute, JS block, CSS, URL) before encoding
- [ ] Use your framework or language's built-in encoder — never write manual character replacement in production code
- [ ] In HTML text content, at minimum encode &, <, and > (the three structural markup characters)
- [ ] For attribute values, additionally encode " and ' to prevent attribute context breakout
- [ ] Apply DOMPurify or equivalent sanitizer before using dangerouslySetInnerHTML, v-html, |safe, or [innerHTML]
- [ ] Never double-encode already-encoded values — `&amp;amp;` renders as the literal text `&amp;`
- [ ] Test adversarial payloads: `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `javascript:alert(1)`

---

## When to Use

Use this skill when:

- Rendering user-supplied data (comments, profile fields, search results, form submissions) into HTML template output
- Constructing HTML attribute values from dynamic data — e.g., `<div data-tooltip="user input">` where the tooltip text contains quotes or special characters
- Writing JavaScript that injects server-rendered strings into `textContent`, `createTextNode()`, or DOM manipulation APIs
- Using React's `dangerouslySetInnerHTML`, Vue's `v-html`, Angular's `[innerHTML]`, or similar framework bindings that bypass automatic escaping
- Working with template engines (Jinja2, Django, Handlebars, Pug) where you need to explicitly enable or disable autoescaping for specific values
- Generating HTML email templates with user data that may contain ampersands, angle brackets, or smart quotes
- Building API responses that embed user content into HTML fragments for client-side rendering
- Encoding legacy string data that uses named character references (e.g., `&mdash;`, `&lsquo;`) and needs consistent decoding before re-encoding

---

## When NOT to Use

Avoid this skill for:

- **SQL escaping** — use parameterized queries or ORM methods instead of manual SQL escaping. This skill covers HTML context only.
- **URL percent-encoding** — use `urllib.parse.quote()` (Python), `encodeURIComponent()` (JavaScript), or `rawurlencode()` (PHP) for URL-safe encoding. URL encoding follows RFC 3986 rules, which are completely different from HTML entity encoding.
- **CSV quoting and field escaping** — use the standard library's CSV writer (`csv.writer` in Python, `Text::CSV` in Perl/PHP). CSV uses RFC 4180 double-quoting rules, not HTML entities.
- **Shell argument escaping** — pass arguments as arrays to subprocess functions instead of constructing shell command strings. Never use `shell=True` with user data (Python), `exec()` with concatenated strings (PHP), or backtick interpolation (JavaScript/Node.js).
- **Input validation at system boundaries** — validate and sanitize inbound data using schema checking before it enters your application. HTML entity encoding handles the complementary outbound concern: rendering data safely.
- **Binary data encoding** — use Base64, hex encoding, or protocol buffers for binary data transfer, not HTML entities.
- **JSON serialization** — use proper JSON serializers (`json.dumps`, `JSON.stringify`, `json_encode`). JSON has its own escaping rules that differ from HTML.

---

## Core Workflow

1. **Determine the Rendering Context** — Identify exactly where in the document or output stream the value will appear. The context dictates which characters must be encoded: HTML body text (encode &, <, >, ", '), HTML attribute value (additionally encode = and control characters), JavaScript string literal inside a `<script>` block (additionally escape \, ', ", and </ to prevent `</script>` bypass), CSS property values (escape non-alphanumeric characters). **Checkpoint:** If you cannot name the exact rendering context, do not render the data until you determine it. Rendering in an unknown context is the root cause of XSS vulnerabilities.

2. **Select the Appropriate Encoder** — Use your framework or language's built-in encoder. Never write manual character replacement chains for production code. Known encoders: `html.escape()` (Python stdlib), `HTMLEncode` / `cheerio` (JavaScript/Node.js), `htmlspecialchars()` (PHP), template autoescape (Jinja2, Django, Twig). **Checkpoint:** If you cannot name the specific library function you are using for encoding, research it before proceeding.

3. **Choose Named Entities vs. Numeric Character References** — For the five most common special characters (< > & " '), use named entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`) because they are more readable in source code and universally supported by HTML5. Use numeric character references (`&#60;`, `&#x3c;`) only when encoding characters beyond the standard HTML5 set or when compatibility with non-HTML consumers (email clients, legacy XML processors) requires it. **Checkpoint:** Verify that your chosen encoder produces the expected entity type for your target audience.

4. **Apply Encoding at the Output Boundary** — Run the value through your selected encoder as late as possible in the request lifecycle. The closer encoding is to the point of rendering, the less likely a developer will forget to encode an intermediate transformation. For framework-rendered output, rely on template autoescape where available. **Checkpoint:** After encoding, verify that the output string contains no raw `<` or `>` characters unless they are part of intentionally safe static markup.

5. **Handle Framework-Specific Edge Cases** — React's JSX automatically escapes all text content (safe by default), but bypasses this with `dangerouslySetInnerHTML`. Vue's `{{ }}` interpolations autoescape, but `v-html` disables escaping entirely. Django templates autoescape by default, but the `|safe` filter re-enables raw HTML rendering. Angular binds HTML via `[innerHTML]` which renders raw HTML without sanitization. **Checkpoint:** For every framework binding that bypasses automatic escaping, apply DOMPurify or an equivalent sanitizer before setting untrusted content.

6. **Verify Encoded Output with Adversarial Payloads** — Test each encoding path with known XSS payloads: `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `javascript:alert(1)`, `&#x3C;script&#x3E;` (encoded bypass attempt), and `O'Brien &amp; Sons` (legitimate ampersand). Every payload must render as inert text in the browser's DOM — never as executable markup or event handlers. **Checkpoint:** Inspect the rendered HTML source directly in a browser developer tools Elements panel to confirm structural elements are preserved and no injected attributes or tags appear.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Python `html.escape()` — Comprehensive HTML Entity Encoding with Named Entities

Python's stdlib `html.escape()` provides built-in HTML entity encoding for the five most common special characters. This is the foundation of all HTML output safety in Python-based web applications, including Flask, Django (without template autoescape), and custom WSGI/ASGI servers.

```python
"""Comprehensive HTML entity encoding using Python's stdlib html.escape().

Covers the three structural characters (< > &), two quote characters (" '),
and demonstrates why manual character replacement is fundamentally unreliable
compared to using a battle-tested library function that handles edge cases
like nested entities, partial entities, and mixed encodings.
"""

from html import escape as html_escape


# ❌ BAD — manual character replacement chain is vulnerable and unmaintainable
def bad_html_escape(value: str) -> str:
    """Naive HTML escaping using sequential string replacements.
    
    This approach has multiple failure modes that bypass XSS prevention:
    
    1. Ampersand order matters: &amp; must be encoded BEFORE any other character,
       because replacing < with &lt; first would turn a legitimate & into &amp;amp;.
       Manual chains rarely get the order right.
    
    2. Partial entity bypass: A payload like &lt;script&gt; is already a valid
       HTML entity sequence that renders as <script>. This manual encoder does
       not decode existing entities before re-encoding, so double-encoded content
       passes through unmodified.
    
    3. Quote characters are often missed: Without quote=True, single and double
       quotes remain unencoded, allowing attribute context breakout attacks like:
       "><svg/onload=alert(1)>.
    
    Args:
        value: Raw string from user input or database to be rendered in HTML.
        
    Returns:
        Partially escaped string that is still vulnerable to multiple XSS vectors.
    """
    # Order matters here, but this is wrong — & must be first!
    # And quotes are not escaped at all (the most common XSS vector)
    value = value.replace("<", "&lt;")
    value = value.replace(">", "&gt;")
    # Missing: & → &amp;  (order violation above)
    # Missing: " → &quot; or &#34;
    # Missing: ' → &#x27; or &#39;
    return value


# ✅ GOOD — stdlib html.escape() with quote=True covers all five critical characters
def escape_html_text(value: str) -> str:
    """Encode a string for safe rendering in HTML body text content.
    
    Uses Python's html.escape() which correctly handles the ordering of entity
    replacement internally (ampersands first, then other characters). The quote=True
    parameter extends encoding to cover " and ' — critical for preventing attribute
    context breakout when values may appear inside quoted attributes.
    
    Characters encoded by html.escape(value, quote=True):
    - <  → &lt;      prevents tag injection (structural)
    - >  → &gt;      completes lt; pair (structural)
    - &  → &amp;     prevents entity injection (structural)
    - "  → &quot;    prevents double-quote attribute breakout
    - '  → &#39;     prevents single-quote attribute breakout
    
    Args:
        value: Raw string from user input, database, or third-party API.
            This is data that originated outside your application's control.
            Must be a string — integers, None, and other types must be
            converted before passing to this function.
            
    Returns:
        HTML-escaped string where all five critical characters are replaced
        with their entity equivalents. The browser renders these as the
        literal characters, not as structural markup.
        
    Raises:
        TypeError: If value is not a string type.
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for HTML escaping, got {type(value).__name__}. "
            f"All data must be converted to string before rendering."
        )
    
    # quote=True adds " and ' encoding — essential for attribute safety
    return html_escape(value, quote=True)


# ✅ GOOD — attribute-specific encoding with additional context characters
def escape_html_attribute(value: str) -> str:
    """Encode a string for safe use inside HTML attribute values.
    
    Attribute contexts require stricter encoding than body text because
    unescaped quotes can break the attribute open and inject new attributes,
    manipulate element structure, or execute event handlers on existing elements.
    
    This function extends body-text escaping with single-quote and forward-slash
    encoding to prevent </script> bypass attacks in some browser implementations.
    
    Args:
        value: String that will appear as an attribute value, e.g.,
            <div data-value="..."> where ... is the escaped result.
            
    Returns:
        Escaped string safe for double-quoted and single-quoted HTML attributes.
        
    Raises:
        TypeError: If value is not a string type.
    """
    if not isinstance(value, str):
        raise TypeError(
            f"Expected str for HTML attribute escaping, got {type(value).__name__}"
        )
    
    # Start with body-text encoding (handles < > & " ')
    escaped = html_escape(value, quote=True)
    
    # Additional: escape forward slash to prevent </script> bypass in legacy browsers
    # This is a defense-in-depth measure; modern browsers do not require it.
    escaped = escaped.replace("/", "&#x2F;")
    
    return escaped


# Comprehensive named entity reference table for HTML5
NAMED_ENTITIES: dict[str, str] = {
    "&": "&amp;",     # ampersand — MUST be encoded first in any manual implementation
    "<": "&lt;",      # less-than sign — prevents tag injection
    ">": "&gt;",      # greater-than sign — complements lt; to prevent partial tags
    '"': "&quot;",    # double quote — prevents attribute context breakout
    "'": "&#39;",     # single quote / apostrophe — prevents single-quote attribute breakout
    # Additional common HTML5 named entities (for reference, not typically needed
    # with standard html.escape() which covers the five critical characters above)
    "\u00a0": "&nbsp;",   # non-breaking space
    "\u00a9": "&copy;",   # copyright symbol
    "\u00ae": "&reg;",    # registered trademark
    "\u2122": "&trade;",  # trademark symbol
    "\u2018": "&lsquo;",  # left single quotation mark
    "\u2019": "&rsquo;",  # right single quotation mark
    "\u201c": "&ldquo;",  # left double quotation mark
    "\u201d": "&rdquo;",  # right double quotation mark
    "\u2014": "&mdash;",  # em dash
    "\u2013": "&ndash;",  # en dash
    "\u00d7": "&times;",  # multiplication sign
    "\u00f7": "&divide;", # division sign
    "\u00a2": "&cent;",   # cent sign
    "\u00a3": "&pound;",  # pound sterling sign
}


# Test suite demonstrating BAD vs GOOD escaping behavior
if __name__ == "__main__":
    test_payloads = [
        ("<script>alert('XSS')</script>", "Basic script tag injection"),
        ('"><img src=x onerror=alert(1)>', "Attribute break + event handler XSS"),
        ("O'Brien & Sons", "Legitimate ampersand and apostrophe in a business name"),
        ('<a href="javascript:alert(1)">Click me</a>', "JavaScript protocol URI injection"),
        ("&lt;script&gt;", "Pre-existing entity — should not double-encode with proper library"),
        ('value="test" onclick="evil()"', "Event handler in attribute context"),
        ("<div title='It\\'s & great'>", "Mixed quotes, ampersand, and backslash"),
    ]

    print("=" * 70)
    print("HTML Entity Encoding: BAD vs GOOD Comparison")
    print("=" * 70)

    for payload, description in test_payloads:
        bad_result = bad_html_escape(payload)
        good_body = escape_html_text(payload)
        good_attr = escape_html_attribute(payload)

        print(f"\n{description}")
        print(f"  Input:        {payload!r}")
        print(f"  BAD escape:   {bad_result!r}")
        print(f"  GOOD (body):  {good_body!r}")
        print(f"  GOOD (attr):  {good_attr!r}")

        # Highlight differences
        if bad_result != good_body:
            print("  ⚠ BAD output differs from GOOD — vulnerability detected")
```

**Security properties:**
- `html.escape()` handles the internal ordering of character replacement correctly (ampersands are replaced first, preventing double-encoding issues) — manual chains rarely get this right.
- The `quote=True` parameter is critical: without it, quotes remain unencoded and attackers can break out of attribute values with payloads like `"><script>`.
- Named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`) are more readable in source code and universally supported by all HTML5-compliant browsers. Use numeric character references (`&#38;`, `&#x26;`) only when encoding characters beyond the standard set or for maximum compatibility with non-HTML consumers like email clients and XML processors.

---

### Pattern 2: JavaScript DOM Text Content vs innerHTML — Safe Text Insertion

JavaScript provides multiple APIs for inserting content into the DOM, but they have fundamentally different security properties. `textContent` and `createTextNode()` treat content as pure text (safe), while `innerHTML` interprets content as HTML markup (unsafe with untrusted data).

```javascript
/**
 * JavaScript DOM text insertion — safe vs unsafe patterns.
 *
 * This module demonstrates why innerHTML must never receive untrusted user data,
 * and provides a reference encoder for situations where entity encoding at the
 * string level is required (e.g., before passing strings to a legacy API or
 * embedding in non-DOM contexts like JSON responses).
 */

// ❌ BAD — innerHTML with user data is an XSS vector
function badRenderUserProfile(username, bio) {
    // User-supplied values injected as HTML — browser parses < and > as markup
    document.getElementById("username").innerHTML = username;
    document.getElementById("bio").innerHTML = bio;

    // An attacker who supplies: "><img src=x onerror=alert(document.cookie)>
    // breaks out of the previous element and injects an executable image tag.
    // This is one of the most common XSS patterns documented by OWASP.
}

// ✅ GOOD — textContent treats all content as inert text data
function safeRenderUserProfile(username, bio) {
    // textContent never interprets the string as markup — < and > are rendered
    // literally as the characters < and >, not as structural elements.
    document.getElementById("username").textContent = username;
    document.getElementById("bio").textContent = bio;

    // Even if user supplies: <script>alert('XSS')</script>
    // The browser displays the literal string text — no script execution occurs.
}

// ✅ GOOD — createTextNode() is the lowest-level safe insertion method
function safeCreateTextNode(parent, content) {
    const node = document.createTextNode(content);
    parent.appendChild(node);
    return node;
}

// Reference encoder: Convert individual characters to HTML entity references
// Useful for situations where you cannot use textContent (e.g., string manipulation
// before DOM insertion, or encoding strings for JSON API responses).
function encodeToHTMLentities(value) {
    /**
     * Encode special characters to HTML entity references.
     * This is a reference implementation — in production, prefer using
     * your framework's built-in encoder or textContent for DOM operations.
     *
     * @param {string} value - The string to encode.
     * @returns {string} String with & < > " ' replaced by entity references.
     */
    if (typeof value !== "string") {
        throw new TypeError(
            `Expected string for HTML encoding, got ${typeof value}`
        );
    }

    return value
        .replace(/&/g, "&amp;")      // Must be FIRST — order matters!
        .replace(/</g, "&lt;")       // Prevents tag injection
        .replace(/>/g, "&gt;")       // Completes the lt;/gt; pair
        .replace(/"/g, "&quot;")     // Prevents double-quote attribute breakout
        .replace(/'/g, "&#39;");     // Prevents single-quote attribute breakout
}

// Demonstrate the difference between textContent and innerHTML
function demonstrateDOMSafety() {
    const container = document.getElementById("demo-container");
    if (!container) return;

    // Clear any existing content
    container.innerHTML = "";

    const maliciousInput = '<img src="x" onerror="alert(1)">';

    // SAFE: textContent renders the string as literal text
    const safeDiv = document.createElement("div");
    safeDiv.textContent = `textContent output: ${maliciousInput}`;
    container.appendChild(safeDiv);

    // UNSAFE: innerHTML would attempt to parse the string as HTML,
    // executing the onerror handler. Never do this with user data.
    const unsafeDiv = document.createElement("div");
    // Do NOT run: unsafeDiv.innerHTML = `innerHTML output: ${maliciousInput}`;
    // Uncommenting the line above would execute alert(1).

    const warning = document.createElement("div");
    warning.style.color = "red";
    warning.textContent =
        '⚠ innerHTML with user data is disabled for demonstration purposes.';
    container.appendChild(warning);

    console.log("Safe output (textContent):", safeDiv.textContent);
    // Output: textContent output: <img src="x" onerror="alert(1)">
    // The browser shows the literal characters, no image tag rendered.
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
    module.exports = { safeRenderUserProfile, safeCreateTextNode, encodeToHTMLentities };
}
```

**Key security properties:**
- `textContent` and `createTextNode()` are always safe because they treat the entire string as inert character data. The browser never attempts to parse any part of the value as markup or script.
- `innerHTML` parses its content as HTML, which means any `<`, `>`, `&`, `"`, `'` in the input is interpreted according to HTML parsing rules. Untrusted input can inject tags, attributes, and event handlers.
- The `encodeToHTMLentities()` reference function demonstrates correct ordering: `&` must be replaced FIRST before any other character, because replacing `<` with `&lt;` first would turn a subsequent `&` into `&amp;amp;`, breaking the encoding. This ordering bug is extremely common in manual implementations.
- For React applications using JSX, text interpolation `{userInput}` automatically escapes content (equivalent to `textContent`). Only `dangerouslySetInnerHTML` bypasses this safety net and requires explicit sanitization with DOMPurify or similar.

---

### Pattern 3: React `dangerouslySetInnerHTML` — Entity Encoding Before Dangerous JSX Usage

React's JSX engine provides automatic XSS protection for all text content through implicit HTML escaping. However, the `dangeredlySetInnerHTML` prop exists as an escape hatch for rendering pre-sanitized HTML fragments. This pattern shows how to safely bridge untrusted HTML content and React's rendering model.

```javascript
/**
 * React dangerouslySetInnerHTML — safe patterns with DOMPurify integration.
 *
 * Demonstrates why JSX auto-escaping is insufficient for raw HTML content,
 * when dangerouslySetInnerHTML is appropriate, and how DOMPurify sanitizes
 * untrusted HTML before it reaches the React DOM renderer.
 */

import DOMPurify from "dompurify";

// ❌ BAD — rendering untrusted HTML with dangerouslySetInnerHTML
function BadUserComment({ commentBody }) {
    // This passes raw user input directly into the DOM as HTML.
    // An attacker who submits: <img src=x onerror=alert(document.cookie)>
    // will have that script execute in every user's browser session.
    return (
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: commentBody }} />
    );
}

// ❌ BAD — attempting manual sanitization before dangerouslySetInnerHTML
function BadManualSanitize({ commentBody }) {
    // This regex-based approach is intentionally incomplete and demonstrates
    // why manual HTML sanitization should never be used in production.
    const sanitized = commentBody
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")  // Misses <SCR I PT>
        .replace(/on\w+="[^"]*"/gi, "");  // Misses onerror='...' (single quotes)

    return (
        <div dangerouslySetInnerHTML={{ __html: sanitized }} />
    );
}

// ✅ GOOD — DOMPurify sanitization before dangerouslySetInnerHTML
function SafeUserComment({ commentBody, allowedTags = ["b", "i", "em", "strong", "a"] }) {
    /**
     * Sanitize user-supplied HTML using DOMPurify and render safely in React.
     *
     * DOMPurify removes all dangerous tags (script, object, embed, iframe),
     * event handler attributes (onclick, onload, onerror), javascript: URIs,
     * and data: URI schemes while preserving a configurable set of safe tags.
     *
     * @param {string} commentBody - Raw HTML from user input or database.
     * @param {string[]} allowedTags - Tags permitted in the output (default: inline formatting + links).
     * @returns {{ __html: string }} Object compatible with dangerouslySetInnerHTML.
     */
    const cleanHTML = DOMPurify.sanitize(commentBody, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ["href", "target", "rel"],  // Only allow safe link attributes
        RETURN_DOM: false,                         // Return sanitized string
        ADD_ATTR: [],                              // Do not add any extra attributes
    });

    return (
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: cleanHTML }} />
    );
}

// ✅ GOOD — component with full sanitization pipeline and fallback
function SafeRichTextContent({ htmlFragment, onSanitizationError }) {
    const [renderableHTML, setRenderableHTML] = useState(null);
    const [sanitizationFailed, setSanitizationFailed] = useState(false);

    useEffect(() => {
        try {
            if (!htmlFragment || typeof htmlFragment !== "string") {
                setRenderableHTML("");
                return;
            }

            // Sanitize with strict configuration for rich text content
            const sanitized = DOMPurify.sanitize(htmlFragment, {
                ALLOWED_TAGS: [
                    "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
                    "ul", "ol", "li", "blockquote",
                    "a", "img",
                    "strong", "em", "u", "s", "mark",
                ],
                ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
                ALLOW_DATA_ATTR: false,       // Do not allow data-* attributes
                ALLOW_UNKNOWN_PROTOCOLS: false, // Block javascript:, data:, vbscript: URIs
            });

            if (sanitized.length === 0 && htmlFragment.trim().length > 0) {
                setSanitizationFailed(true);
                setRenderableHTML("<em>Content was removed for security reasons.</em>");
            } else {
                setRenderableHTML(sanitized);
            }
        } catch (error) {
            console.error("DOMPurify sanitization failed:", error);
            setSanitizationFailed(true);
            setRenderableHTML(
                '<p class="error">Unable to display content. Please contact support.</p>'
            );
            if (typeof onSanitizationError === "function") {
                onSanitizationError(error, htmlFragment.length);
            }
        }
    }, [htmlFragment, onSanitizationError]);

    return (
        <div className="rich-text-content">
            {sanitizationFailed && (
                <div className="sanitization-warning" role="alert">
                    Some content was removed for security reasons.
                </div>
            )}
            {renderableHTML !== null && (
                <div dangerouslySetInnerHTML={{ __html: renderableHTML }} />
            )}
        </div>
    );
}

// Usage examples with adversarial input tests
function DemoComponent() {
    const testInputs = [
        '<p>Hello <b>world</b></p>',  // Safe — should pass through intact
        '<script>alert("XSS")</script>', // Dangerous — script tag stripped by DOMPurify
        '<a href="javascript:alert(1)">Click</a>', // Dangerous — javascript: URI removed
        '<img src=x onerror=alert(1)>',   // Dangerous — event handler removed
        '<div style="background:url(javascript:alert(1))">', // Dangerous — CSS injection blocked
    ];

    return (
        <div className="demo">
            <h2>Safe User Content Rendering</h2>
            {testInputs.map((input, index) => (
                <div key={index} style={{ border: "1px solid #ccc", padding: "8px", margin: "8px 0" }}>
                    <strong>Input:</strong> {input}
                    <hr />
                    <SafeUserComment commentBody={input} />
                    <hr />
                </div>
            ))}
        </div>
    );
}

export { SafeUserComment, SafeRichTextContent };
```

**Key security properties:**
- DOMPurify is the industry-standard HTML sanitizer for JavaScript applications. It removes dangerous elements (`<script>`, `<iframe>`, `<object>`), event handler attributes (`onclick`, `onerror`), and unsafe URI schemes (`javascript:`, `data:`, `vbscript:`) while preserving a configurable set of safe tags.
- React's JSX auto-escaping (`{userInput}`) is sufficient for text content but does not apply when rendering raw HTML fragments via `dangerouslySetInnerHTML`. Always pair this prop with DOMPurify sanitization.
- Never attempt manual HTML sanitization with regex patterns. Regex-based approaches are bypassable through encoding tricks, whitespace manipulation, and case variation (e.g., `<ScRiPt>`, `< script >`). Only use well-tested, audited sanitizer libraries.

---

### Pattern 4: Template Engine Escaping Gotchas (Jinja2, Django, Vue, Handlebars)

Template engines provide automatic HTML escaping for interpolated values, but this protection has specific boundaries. Understanding when autoescaping applies and when it is explicitly disabled prevents accidental XSS in template-rendered applications.

```python
"""Template engine escaping behavior across Python and JavaScript ecosystems.

Demonstrates the differences between automatic escaping, explicit encoding
filters, and context-aware output handling in popular template engines.
Each engine has different defaults, filter names, and escaping boundaries.
"""

# =============================================================================
# Pattern 4a: Jinja2 (Python) — Explicit Encoding Filters
# =============================================================================

from jinja2 import Environment, FileSystemLoader, select_autoescape

def setup_jinja_environment():
    """Configure Jinja2 with autoescape enabled for HTML templates."""
    env = Environment(
        loader=FileSystemLoader("templates"),
        autoescape=select_autoescape(["html", "htm", "xml"]),  # Auto-escape HTML files
    )
    return env


def jinja2_autoescaped_template(env):
    """Jinja2 with autoescape=True handles escaping automatically for {{ }} interpolations.
    
    The template author does NOT need to call any escape function on {{ variable }} —
    Jinja2 applies html.escape() internally before rendering the value into HTML output.
    
    However, if you need to DISABLE autoescaping (e.g., rendering pre-sanitized HTML),
    use the |safe filter explicitly:
        {{ sanitized_html_content | safe }}
    
    WARNING: Using |safe with user-supplied content is an XSS vulnerability. Only
    pass pre-sanitized content to |safe, and document which values have been sanitized.
    """
    template_str = """\
<!DOCTYPE html>
<html>
<body>
    <!-- Auto-escaped: < > & " ' are all converted to entities -->
    <p>Hello, {{ username }}!</p>
    
    <!-- Also auto-escaped (same behavior as above) -->
    <div class="bio">{{ bio_text }}</div>
    
    <!-- NOT auto-escaped: this renders raw HTML. Use ONLY with pre-sanitized content. -->
    <div class="rich-content">{{ rich_content | safe }}</div>
</body>
</html>"""
    template = env.from_string(template_str)
    return template.render(
        username="<script>alert('XSS')</script>",  # Rendered safely: &lt;script&gt;...
        bio_text="O'Brien & Associates",            # Rendered safely: O&apos;Brien &amp; Associates
        rich_content='<em>Sanitized HTML content</em>',  # Rendered as-is — author responsibility!
    )


def jinja2_explicit_encoding_filter(env):
    """Use |e filter for explicit encoding when autoescape is disabled.
    
    The |e (escape) filter applies html.escape() explicitly, regardless of the
    template's autoescape setting. Use this when working with templates where
    autoescape has been intentionally disabled for performance or compatibility.
    """
    # Template with autoescape disabled — MUST use |e on all user-supplied values
    no_autoescape_env = Environment(
        loader=FileSystemLoader("templates"),
        autoescape=False,  # Autoescaping disabled!
    )
    
    template_str = """\
<!-- Without |e filter: < > & " ' are rendered as literal characters (XSS!) -->
<p>Hello, {{ username }}</p>

<!-- With |e filter: all special characters encoded to entities (safe) -->
<p>Hello, {{ username | e }}!</p>

<!-- For attributes specifically: use |attr or manually construct with quotes -->
<a href="/profile/{{ user_id | e }}" class="link">Profile</a>"""
    
    template = no_autoescape_env.from_string(template_str)
    return template.render(
        username="<img src=x onerror=alert(1)>",  # With |e: safe (encoded to entities)
        user_id='" onclick="evil()',               # With |e: safe in href attribute
    )


# =============================================================================
# Pattern 4b: Django Templates — Built-in Autoescaping with |safe Override
# =============================================================================

"""Django template autoescaping behavior (Python).
    
Django templates enable HTML autoescaping by default since version 1.2. All
{{ variable }} interpolations in .html files are automatically escaped using
django.utils.html.escape(). The escaping applies to the five critical characters
(< > & " ') identically to Python's html.escape(value, quote=True).
    
The |safe filter (alias: |mark_safe) disables autoescaping for a specific value.
Use with extreme caution — only apply to content that has been pre-sanitized by
DOMPurify (for HTML), urlquote (for URLs), or an equivalent sanitizer.
"""

def django_autoescaped_example():
    """Django template rendering with automatic escaping."""
    from django.template import Template, Context
    
    # Django's built-in Template class applies autoescape to .html files by default
    template_str = """\
<!DOCTYPE html>
<html>
<body>
    <h1>{{ title }}</h1>          <!-- Auto-escaped: < > & " ' encoded -->
    <p>{{ description }}</p>      <!-- Auto-escaped -->
    
    <!-- |safe disables escaping — render ONLY pre-sanitized HTML -->
    {% if user_rich_content %}
        {{ user_rich_content|safe }}  <!-- ⚠ UNSAFE if content comes from users -->
    {% endif %}
    
    <!-- Django's autoescape block can control escaping scope -->
    {% autoescape off %}
        {{ raw_html }}  <!-- Escaping disabled within this block -->
    {% endautoescape %}
</body>
</html>"""
    
    template = Template(template_str)
    context = Context({
        "title": "<script>alert('XSS')</script>",   # Auto-escaped by Django
        "description": "O'Brien & Sons",            # Auto-escaped by Django
        "user_rich_content": "<b>Bold</b> text",     # Escaping disabled by |safe — trust required!
        "raw_html": "<p>This is raw HTML</p>",       # Escaping disabled by autoescape off block
    })
    return template.render(context)


# =============================================================================
# Pattern 4c: Vue.js Templates — Interpolation vs v-html
# =============================================================================

"""Vue.js escaping behavior (JavaScript/TypeScript).
    
Vue.js provides two distinct mechanisms for rendering dynamic content:
1. {{ expression }} or :prop="expression" — auto-escaped (safe by default)
2. v-html directive — renders raw HTML (unsafe without pre-sanitization)
    
This pattern demonstrates the critical difference between these two approaches.
"""

def vue_template_examples():
    """Vue.js template patterns showing safe vs unsafe content rendering."""
    return """\
<!-- SAFE: Mustache interpolation auto-escapes all special characters -->
<div id="app">
    <h1>{{ username }}</h1>              <!-- &lt;script&gt; rendered as literal text -->
    <p class="bio">{{ userBio }}</p>     <!-- All HTML entities encoded automatically -->
    <span :title="'Username: ' + username"></span>  <!-- Attribute binding — also auto-escaped -->
    
    <!-- UNSAFE: v-html renders raw HTML without any escaping -->
    <!-- Only use with pre-sanitized content (DOMPurify or equivalent) -->
    <div v-html="userSubmittedHtml" class="rich-content"></div>
    
    <!-- SAFE ALTERNATIVE to v-html when you need plain text rendering: -->
    <div :textContent="rawUserText"></div>  <!-- Vue 3.2+: native textContent binding -->
</div>

<!-- Example component demonstrating safe content handling -->
<template>
  <article class="comment">
    <!-- Auto-escaped: XSS payload renders as inert text -->
    <p class="author">{{ comment.author }}</p>
    
    <!-- v-html requires pre-sanitization — demonstrate with mock sanitization -->
    <div
      v-if="isSanitized"
      v-html="sanitizedContent"
      class="comment-body"
    ></div>
    
    <!-- Fallback: when content is not yet sanitized, show plain text -->
    <pre v-else class="comment-body">{{ comment.body }}</pre>
  </article>
</template>

<script setup>
import DOMPurify from 'dompurify';
import { computed } from 'vue';

const props = defineProps({
  comment: { type: Object, required: true },
});

// Sanitize user HTML content before rendering with v-html
const sanitizedContent = computed(() => {
  if (!props.comment.body) return '';
  return DOMPurify.sanitize(props.comment.body, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });
});

// Flag to indicate sanitization status for UI feedback
const isSanitized = computed(() => props.comment.body.length > 0);
</script>"""


# =============================================================================
# Pattern 4d: Handlebars (JavaScript) — Triple Braces Disable Escaping
# =============================================================================

"""Handlebars template escaping behavior (JavaScript/Node.js).
    
Handlebars auto-escapes content in {{ expression }} by default (equivalent to
html.escape()). To render raw HTML, use triple braces {{{ expression }}} which
disable all escaping. This is a common XSS source when developers use triple
braces for convenience without sanitizing the input first.
"""

def handlebars_examples():
    """Handlebars template examples showing double vs triple brace behavior."""
    return """\
<!-- SAFE: Double braces auto-escape -->
<h1>{{ title }}</h1>
<p>{{ description }}</p>

<!-- UNSAFE: Triple braces disable all escaping -->
<!-- Only use with pre-sanitized HTML content -->
<div class="content">{{{ richHtmlContent }}}</div>

<!-- Handlebars partials also auto-escape their interpolations -->
{{> user-profile user}}

<!-- Helper function to sanitize before triple-brace rendering -->
<script>
// Register a helper that sanitizes HTML before rendering
Handlebars.registerHelper('safeHTML', function(htmlString) {
    if (typeof htmlString !== 'string') return '';
    // In browser: use DOMPurify
    if (typeof DOMPurify !== 'undefined') {
        return new Handlebars.SafeString(DOMPurify.sanitize(htmlString));
    }
    // In Node.js: use a server-side sanitizer like sanitize-html
    if (typeof sanitizeHtml === 'function') {
        return new Handlebars.SafeString(sanitizeHtml(htmlString, {
            allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
            allowedAttributes: { 'a': ['href', 'target'] },
        }));
    }
    // Fallback: double-encode (converts & to &amp; so entities don't render)
    return htmlString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
});

// Usage: {{{ safeHTML userContent }}} — always safe with this helper
</script>"""


# =============================================================================
# Cross-Engine Comparison Summary
# =============================================================================

TEMPLATE_ENGINE_COMPARISON = """\
+-------------------+--------+------------+----------+-----------------------------+
| Engine            | Auto   | Explicit   | Disable  | Best Practice               |
|                   | Escape | Encode     | Escaping |                             |
+-------------------+--------+------------+----------+-----------------------------+
| Jinja2 (HTML)     | Yes    | |e filter  | {{ x|s }}| Keep autoescape ON; never   |
|                   |        |            |          | pass user data to |safe     |
+-------------------+--------+------------+----------+-----------------------------+
| Django Templates  | Yes    | No needed  | |safe    | Same as Jinja2 — |safe is   |
|                   |        | (built-in) |          | the danger zone for XSS     |
+-------------------+--------+------------+----------+-----------------------------+
| Vue.js            | Yes    | N/A        | v-html   | Use textContent binding     |
|                   |        |            |          | instead of v-html when      |
|                   |        |            |          | possible                    |
+-------------------+--------+------------+----------+-----------------------------+
| Handlebars        | Yes    | No needed  | {{{ x }}}| Use safeHTML helper with    |
|                   |        | (built-in) |          | DOMPurify before triple     |
|                   |        |            |          | braces                      |
+-------------------+--------+------------+----------+-----------------------------+
"""

if __name__ == "__main__":
    print(TEMPLATE_ENGINE_COMPARISON)
    
    # Demonstrate Jinja2 autoescaping in action
    env = setup_jinja_environment()
    output = jinja2_autoescaped_template(env)
    
    print("\n=== Jinja2 Autoescaped Output (truncated) ===")
    for line in output.split('\n')[:6]:
        print(f"  {line}")
    
    # The username "<script>alert('XSS')</script>" is rendered as:
    # <p>Hello, &lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;!</p>
```

**Key security properties:**
- All major template engines autoescape `{{ }}` interpolations by default. This means `<`, `>`, `&`, `"`, `'` are automatically converted to HTML entities before rendering — you cannot inject structural markup through simple interpolation.
- Autoescaping is explicitly disabled in each engine by a named feature: Jinja2's `|safe` filter, Django's `|safe` (alias of `mark_safe`), Vue's `v-html` directive, Handlebars' triple braces `{{{ }}}`. These features exist for rendering pre-sanitized HTML content but are the most common source of XSS in template-rendered applications.
- When autoescaping is disabled (either globally via configuration or locally via a filter/directive), you assume full responsibility for sanitizing all values before rendering. Use DOMPurify in JavaScript contexts and an equivalent server-side sanitizer in Python/PHP contexts.

---

### Pattern 5: PHP `htmlspecialchars()` — Server-Side Entity Encoding

PHP provides `htmlspecialchars()` and `htmlentities()` for server-side HTML entity encoding. Understanding the difference between these functions and their flag parameters is essential for preventing XSS in PHP-rendered applications.

```php
<?php
/**
 * PHP HTML entity encoding using htmlspecialchars() and htmlentities().
 *
 * This module demonstrates safe HTML output encoding in PHP, including
 * context-aware flag selection, common pitfalls with default values,
 * and integration patterns for modern PHP frameworks (Laravel, Symfony).
 */

// =============================================================================
// Pattern 5a: Core Encoding Functions — htmlspecialchars() vs htmlentities()
// =============================================================================

/**
 * Encode special characters for safe HTML output using htmlspecialchars().
 *
 * This is the recommended function for general HTML entity encoding in PHP.
 * It encodes the four most critical characters (& < > ") plus an optional
 * fifth (') depending on the flags parameter.
 *
 * @param string $value     The raw string to encode.
 * @param int    $flags     Quote style and character set (see below).
 * @param string $encoding  Character encoding (default: 'UTF-8').
 * @return string           Encoded string safe for HTML rendering.
 *
 * Flags (ENT_COMPAT, ENT_QUOTES, ENT_NOQUOTES):
 * - ENT_COMPAT   : Encodes " only; leaves ' unencoded (default)
 * - ENT_QUOTES   : Encodes BOTH " and ' (recommended for attribute safety)
 * - ENT_NOQUOTES : Encodes neither quote character (dangerous!)
 */
function encode_html(string $value, int $flags = ENT_QUOTES, string $encoding = 'UTF-8'): string {
    if ($value === '') {
        return '';
    }
    
    // htmlspecialchars handles: & < > " ' (depending on flags)
    // Always use ENT_QUOTES and UTF-8 for production applications.
    return htmlspecialchars($value, $flags, $encoding);
}

/**
 * Encode ALL applicable HTML entities using htmlentities().
 *
 * This function encodes every character that has a corresponding named entity
 * in HTML (over 100 characters including currency symbols, mathematical operators,
 * and typographic quotes). Use this only when you need comprehensive entity
 * encoding — for most XSS prevention needs, htmlspecialchars() with ENT_QUOTES
 * is sufficient and more efficient.
 */
function encode_html_all(string $value): string {
    return htmlentities($value, ENT_QUOTES, 'UTF-8');
}

// =============================================================================
// Pattern 5b: BAD vs GOOD — Manual Replacement vs Built-in Encoding
// =============================================================================

/**
 * ❌ BAD — manual character replacement is vulnerable and incomplete.
 */
function bad_html_escape(string $value): string {
    // This manual chain has multiple problems:
    // 1. & must be replaced FIRST to prevent double-encoding issues
    // 2. Quotes are often missed, allowing attribute breakout attacks
    // 3. The function doesn't handle character encoding properly
    // 4. No charset specification — vulnerable to character set confusion attacks
    
    $value = str_replace("<", "&lt;", $value);   // Wrong order — & should be first!
    $value = str_replace(">", "&gt;", $value);
    // Missing: str_replace("&", "&amp;", ...) — would cause double-encoding above
    // Missing: quotes entirely
    
    return $value;
}

/**
 * ✅ GOOD — htmlspecialchars() with ENT_QUOTES handles all critical characters.
 */
function safe_html_encode(string $value): string {
    // htmlspecialchars correctly encodes: & < > " '
    // ENT_QUOTES ensures both quote types are encoded (critical for attributes)
    // UTF-8 charset specification prevents character encoding attacks
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

// =============================================================================
// Pattern 5c: Context-Aware Encoding — Body vs Attribute Values
// =============================================================================

/**
 * Encode value for HTML body/text context.
 */
function encode_html_body(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/**
 * Encode value for HTML attribute context (double-quoted attributes).
 */
function encode_html_attribute(string $value): string {
    // ENT_QUOTES encodes both " and ', preventing attribute breakout
    // ENT_SUBSTITUTE replaces invalid characters with U+FFFD replacement char
    // ENT_HTML5 ensures HTML5 entity handling for all Unicode code points
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/**
 * Encode value specifically for URL attribute values (href, src).
 * Uses rawurlencode() instead of HTML encoding — completely different purpose.
 */
function encode_url_attribute(string $value): string {
    return rawurlencode($value);  // RFC 3986 percent-encoding, NOT HTML entities!
}

// =============================================================================
// Pattern 5d: Real-World Example — User Profile Page with Multiple Contexts
// =============================================================================

/**
 * Render a safe user profile page using context-aware encoding.
 *
 * Demonstrates proper encoding for text content, attributes, and URL values
 * in a single request cycle — each value is encoded according to its
 * rendering context.
 */
function render_user_profile(array $userData): string {
    // Extract and validate input
    $username = $userData['username'] ?? '';
    $email    = $userData['email'] ?? '';
    $bio      = $userData['bio'] ?? '';
    $website  = $userData['website'] ?? '';
    $role     = $userData['role'] ?? 'guest';
    
    // Encode each value for its specific context
    $safe_username = encode_html_body($username);
    $safe_email    = encode_html_body($email);
    $safe_bio      = encode_html_body($bio);
    $safe_website  = rawurlencode($website);   // URL encoding, NOT HTML entities!
    $safe_role     = encode_html_attribute($role);
    
    // Escape the title attribute specifically (double-quoted)
    $title_attr = htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    
    ob_start();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>'s Profile</title>
</head>
<body>
    <header>
        <!-- textContent context — encode_html_body encodes < > & " ' -->
        <h1><?= $safe_username ?></h1>
        <p class="role" data-role="<?= $safe_role ?>">User Role: <?= htmlspecialchars($role, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p>
    </header>
    
    <main>
        <section class="bio">
            <!-- Bio text — may contain line breaks and special characters -->
            <h2>About</h2>
            <p><?= $safe_bio ?></p>
        </section>
        
        <section class="contact">
            <!-- Email in anchor href — URL encode the query parameter -->
            <h2>Contact</h2>
            <a href="mailto:<?= rawurlencode($email) ?>"><?= htmlspecialchars($email, ENT_QUOTES, 'UTF-8') ?></a>
            
            <!-- Website URL with proper encoding context separation -->
            <?php if (!empty($website)): ?>
            <p class="website">
                <a href="<?= $safe_website ?>" target="_blank" rel="noopener noreferrer">
                    <?= htmlspecialchars($website, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>
                </a>
            </p>
            <?php endif; ?>
        </section>
    </main>
    
    <footer>
        <!-- Title attribute — must encode quotes to prevent attribute breakout -->
        <p title="Profile for: <?= $title_attr ?>">Powered by <?= htmlspecialchars('MyApp', ENT_QUOTES, 'UTF-8') ?></p>
    </footer>
</body>
</html>
    <?php
    return ob_get_clean();
}

// =============================================================================
// Pattern 5e: Adversarial Test Suite — PHP Encoding Verification
// =============================================================================

function run_php_encoding_tests(): void {
    $test_cases = [
        '<script>alert("XSS")</script>' => 'Script tag injection',
        '" onmouseover="alert(1)"'     => 'Attribute breakout via event handler',
        "O'Brien & Sons"               => 'Apostrophe and ampersand (legitimate)',
        '<img src=x onerror=alert(1)>' => 'Image tag with event handler XSS',
        '&#x3C;script&#x3E;'           => 'Numeric entity bypass attempt',
        '<?php system("whoami"); ?>'   => 'PHP injection in HTML context',
    ];
    
    echo "=== PHP htmlspecialchars() Encoding Test Results ===\n\n";
    
    foreach ($test_cases as $input => $description) {
        $encoded = encode_html_body($input);
        $safe = safe_html_encode($input);
        
        echo "Test: {$description}\n";
        echo "  Input:     '{$input}'\n";
        echo "  Body:      '{$encoded}'\n";
        echo "  Safe:      '{$safe}'\n";
        
        // Verify no raw < or > in output (except within the encoded entities themselves)
        $has_raw_lt = strpos($encoded, '<') !== false && !preg_match_all('/&(lt|gt|amp|quot|#\d+);/', $encoded, $_m);
        if ($has_raw_lt || strpos($encoded, '>') !== false) {
            echo "  ⚠ WARNING: Raw structural characters found in output!\n";
        } else {
            echo "  ✓ Safe: No raw structural characters\n";
        }
        echo "\n";
    }
}

// =============================================================================
// Pattern 5f: Laravel Blade — Framework-Level Autoescaping
// =============================================================================

/**
 * Laravel Blade templates provide automatic HTML escaping by default.
 * Both {{ $variable }} and {!! $variable !!}(unescaped) have distinct security implications.
 */
function blade_template_examples(): void {
    /*
     * SAFE: Double curly braces auto-escape (equivalent to htmlspecialchars())
     * <p>Hello, {{ $username }}</p>      → &lt;script&gt; rendered as literal text
     
     * UNSAFE: Double curly brace with unescaped output — renders raw HTML
     * <div>{!! $userContent !!}</div>    → Raw HTML is rendered (XSS risk!)
     
     * Recommended: Use {!! !!} only with pre-sanitized content via Str::limit()
     * or an external sanitizer. Never pass raw user input to {!! !!}.
     */
    
    // In Laravel controller — sanitize before passing to Blade view
    $userHtml = DOMPurify::sanitize($request->input('comment'));  // Or use a PHP sanitizer
    return view('comments.show', [
        'safeContent' => $userHtml,   // Pre-sanitized — safe for {!! !!}
        'username' => e($request->input('name')),  // Manually escaped with e() alias for htmlspecialchars()
    ]);
}

// =============================================================================
// Pattern 5g: Symfony Twig — Explicit and Implicit Escaping
// =============================================================================

/**
 * Symfony Twig templates autoescape HTML by default.
 * The |raw filter disables escaping for a specific variable (equivalent to |safe in Django).
 */
function twig_template_examples(): void {
    /*
     * SAFE: {{ variable }} auto-escapes (default behavior)
     * {{ username }} → < > & " ' encoded to entities
     
     * UNSAFE: {{ variable|raw }} disables escaping entirely
     * {{ userHtml|raw }} → Raw HTML rendered (XSS risk!)
     
     * Best practice: Use a custom Twig filter for sanitization instead of |raw.
     * Register a `safe_html` filter that applies DOMPurify or equivalent.
     */
    
    // In Twig extension — register safe_html filter
    $twig->addFilter(new Twig_SimpleFilter('safe_html', function(string $html): string {
        // Apply server-side HTML sanitization
        return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        // In production: use a real sanitizer library like HTML Purifier (HTMLPurifier)
    }));
}

// =============================================================================
// Main execution
// =============================================================================

// Run encoding tests when this script is executed directly
if (php_sapi_name() === 'cli') {
    run_php_encoding_tests();
}

// Export functions for inclusion in other scripts
return __FILE__;
?>
```

**Key security properties:**
- `htmlspecialchars()` with `ENT_QUOTES` flag encodes all five critical characters (`& < > " '`), which is the minimum required for XSS prevention. Always specify UTF-8 encoding to prevent character set confusion attacks where an attacker uses multi-byte sequences to bypass single-byte encoders.
- `htmlentities()` encodes every character that has a named HTML entity (over 100 characters). It provides more comprehensive encoding but is typically unnecessary for XSS prevention and adds performance overhead. Prefer `htmlspecialchars(ENT_QUOTES)` for general use.
- Modern PHP frameworks handle escaping automatically: Laravel's Blade uses `{{ }}` for auto-escaped output and `{!! !!}` for raw output (use raw with caution). Symfony's Twig autoescapes HTML by default, with `|raw` filter to disable escaping on a per-variable basis.

---

## Constraints

### MUST DO
- Always use your framework or language's built-in entity encoder — never write manual character replacement in production code. Libraries like `html.escape()` (Python), `htmlspecialchars()` (PHP), and template autoescape have been tested against known XSS vectors for decades; custom regex-based approaches are trivially bypassable.
- In HTML text content, at minimum encode &, <, and > (the three structural characters that define markup). These three characters alone enable tag injection attacks when unencoded.
- When writing to HTML attributes, also encode " and ' (quote characters that can break out of attribute context into new attributes or event handlers). Always use `ENT_QUOTES` in PHP, `quote=True` in Python, and prefer `textContent` over `innerHTML` in JavaScript.
- Use named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`) for the five most common special characters — they are more readable in source code and universally supported by HTML5-compliant browsers. Use numeric character references (`&#38;`, `&#x26;`, `&#x3c;`) only when you need to encode characters beyond the standard HTML5 set or when compatibility with non-HTML consumers (email clients, legacy XML processors) requires it.
- When using dangerouslySetInnerHTML (React), v-html (Vue), |safe (Django/Jinja2), [innerHTML] (Angular), or triple braces `{{{ }}}` (Handlebars), apply DOMPurify or an equivalent sanitizer BEFORE setting untrusted HTML content. These framework features explicitly disable escaping and render raw HTML.
- Test encoding output by examining rendered HTML source in the browser — use developer tools to inspect the Elements panel and verify that no injected structural elements appear in the document tree for any user-supplied input path.

### MUST NOT DO
- Never use manual string replace chains like `value.replace("&","&amp;")` in production code — incorrect ordering (not replacing & first), incomplete character coverage, and lack of charset awareness make regex-based sanitizers trivially bypassable through encoding tricks that proper libraries handle correctly.
- Trust template autoescape to protect ALL contexts — autoescaping only covers HTML template output, not JavaScript blocks embedded in templates (`<script>...{{ userValue }}</script>`), CSS style attributes (`style="color: {{ color }}"`), or URL attributes (`href="{{ url }}"`) which follow entirely different escaping rules.
- Use `html.escape()` (Python) or `encodeURIComponent()` (JavaScript) interchangeably — they encode completely different character sets for completely different purposes. `html.escape()` handles &, <, >, ", ' for HTML output context; `encodeURIComponent()` percent-encodes characters per RFC 3986 for URL query parameter values.
- Encode already-safe static content — if a string contains no special characters and comes from your application's source code (not user input or external data), encoding it produces visible artifacts in the rendered output and confuses debugging efforts. Only encode strings that may contain user-supplied or untrusted content.
- Double-encode values that have already been entity-encoded — `&amp;amp;` renders as the literal text `&amp;`, not as an ampersand followed by "amp". If you encounter double-encoded content, decode once (using your framework's decoder) and then re-encode for the current output context if needed.
- Use `html_entity_decode()` or equivalent to "undo" encoding before further processing — if you need the original value for computation, database queries, or API calls, keep it in a separate unencoded variable from the point of input capture. Encoding should only happen at the final output boundary.

---

## Output Template

When implementing or reviewing HTML entity encoding logic, produce:

1. **Encoding Context Map** — For every value rendered in your application's HTML output, document its rendering context (HTML body text, double-quoted attribute, single-quoted attribute, JavaScript string literal, CSS rule, URL parameter) and the encoder function applied to that context.
2. **Framework Escaping Audit** — List all template engine autoescape settings (enabled/disabled per file), explicit encoding filters (`|e`, `|safe`, `v-html`, `dangerouslySetInnerHTML`), and verify that every bypass of automatic escaping is accompanied by a sanitizer call.
3. **Adversarial Payload Test Results** — For each user-input rendering path, document the test payloads applied (script injection, attribute breakout, event handlers, URI schemes, entity-based bypasses) and confirm that all render as inert text in the browser DOM.
4. **Nested Context Verification** — For pages containing embedded `<script>` blocks with interpolated values, CSS `style` attributes with dynamic properties, or `<a href>` values from user input, verify that JavaScript-specific and URL-specific encoding is applied independently of HTML template escaping.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `output-sanitization` | Broader context-specific escaping covering SQL, CSV, shell commands, URLs, and email — this skill focuses exclusively on HTML entity encoding for web document rendering contexts |
| `input-validation` | Validates and sanitizes inbound data at system boundaries using schema checking — html-entity-encoding handles the complementary outbound concern of rendering validated data safely in HTML output |
| `api-security-patterns` | API-level security controls including authentication, rate limiting, CORS headers, and input/output validation schemas that complement the output-layer XSS prevention provided by proper entity encoding |

---

## Live References

> Authoritative documentation links for HTML entity encoding standards, security guidelines, and framework-specific escaping behavior. The model follows markdown links at load time to resolve external references and inline content.

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — Complete context-specific output encoding table covering HTML body, attributes, JavaScript, CSS, and URL contexts
- [HTML5 Standard — Character References](https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references) — Canonical definition of all named character references in the HTML5 specification
- [MDN Web Docs — HTML entities](https://developer.mozilla.org/en-US/docs/Glossary/Entity) — Reference for HTML entity syntax, named entities, and numeric character references
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify) — Trusted DOM-based XSS sanitizer for JavaScript — the recommended solution before using dangerouslySetInnerHTML, v-html, or any raw HTML rendering API
- [Python `html` Module Documentation](https://docs.python.org/3/library/html.html) — Official documentation for `html.escape()`, `html.unescape()`, and entity handling functions
- [PHP `htmlspecialchars()` Manual](https://www.php.net/manual/en/function.htmlspecialchars.php) — Official documentation covering flag parameters (ENT_COMPAT, ENT_QUOTES), character set specification, and HTML5 mode
- [RFC 6874 — Representation of IPv6 Zone Identifiers in URIs](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1) — RFC 3986 URL encoding rules (for distinguishing URL percent-encoding from HTML entity encoding, which is a common source of confusion)

---

*This skill implements context-specific output encoding following OWASP guidelines for XSS prevention through HTML entity encoding. Always prefer framework-level autoescape mechanisms over manual encoding, and pair any escaping bypass (dangerouslySetInnerHTML, v-html, |safe, triple braces) with an independent sanitizer such as DOMPurify.*
