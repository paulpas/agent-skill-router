---
name: xml-security
description: Prevents XML External Entity (XXE) injection, entity expansion attacks, and DTD abuse by securing XML parsers with safe configurations, input validation, and defense-in-depth patterns across Python, Java, PHP, Node.js, and Go.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: xx e injection, xml external entity, dtd security, xml parser security, entity expansion attack, xml schema validation, safe xml parsing, xml input sanitization
  archetypes:
    - tactical
    - diagnostic
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
  related-skills: html-entity-encoding,url-parsing-security,input-validation,api-security-patterns
---

# XML Security Engineer

Senior security engineer securing XML parsing pipelines against XXE injection, entity expansion (Billion Laughs) DoS attacks, and DTD abuse. Applies safe parser configurations as the primary defense, XML Schema validation for defense-in-depth, and strict input sanitization to every XML document entering your application — whether from API bodies, file uploads, database blobs, or message queues. Follows OWASP XXE Prevention Cheat Sheet, NIST SP 800-190 (Container Security), and language-specific parser hardening guides as the authoritative security baseline.

## TL;DR Checklist

- [ ] Disable external entity processing on every XML parser instance before parsing any input
- [ ] Disable DTD processing entirely unless your business logic explicitly requires DTDs
- [ ] Set entity expansion limits (max entities, max nesting depth, max text size) to prevent Billion Laughs DoS
- [ ] Validate all incoming XML against an XSD schema before processing — reject documents that don't conform
- [ ] Strip or neutralize `<![ENTITY ...]>` declarations in any XML you cannot fully control
- [ ] Use text/CDATA sections for user-supplied content that may contain `<`, `>`, `&`, `"`, or `'` characters
- [ ] Never pass unsanitized XML to an XSLT processor — transform engines often have their own XXE vectors

---

## When to Use

Use this skill when:

- Implementing XML parsers for API endpoints that receive XML request bodies (SOAP, REST/XML, EDI)
- Building XML file upload handlers or document ingestion pipelines
- Processing XML from message queues, event streams, or database columns
- Auditing existing code for XXE vulnerabilities in Python, Java, PHP, Node.js, or Go services
- Migrating legacy applications that use insecure default parser configurations
- Designing defense-in-depth for any system that validates, transforms, or serializes XML data
- Integrating with third-party systems that exchange XML payloads (financial messages, healthcare HL7, government submissions)

---

## When NOT to Use

Avoid this skill for:

- Sanitizing HTML output for XSS prevention — use `html-entity-encoding` instead (HTML has different entity syntax and threat model)
- Encoding URL query parameters — use `url-parsing-security` instead (URL encoding is `%xx`, not XML entities)
- Validating non-XML structured data like JSON or YAML — use `input-validation` for general schema validation patterns
- Building a general-purpose XML library or parser from scratch — this skill hardens existing parsers, it does not teach parser internals

---

## Core Workflow

1. **Identify Every XML Parser Entry Point** — Catalog every location in your codebase that parses XML input: HTTP handlers accepting `application/xml` or `text/xml`, file loaders for `.xml` attachments, database blob readers, message queue deserializers, and any library call (e.g., `lxml.etree.parse()`, `DocumentBuilder.parse()`, `simplexml_load_string()`). **Checkpoint:** Every identified entry point must have a secure parser configuration before the first byte is read.

2. **Apply Secure Parser Configuration** — Configure each parser to disable external entities, DTDs, and entity expansion. Use language-specific factory methods or parser flags (see Implementation Patterns below). **Checkpoint:** Verify that disabling these features does not break legitimate use cases — if a feature requires DTDs, you must implement an explicit allowlist of permitted entity names instead of enabling global DTD processing.

3. **Set Entity Expansion Limits** — Configure entity expansion limits to prevent Billion Laughs-style DoS attacks: cap the maximum number of entities, maximum nesting depth, and maximum resulting document size in memory. These limits must be set before any parsing begins. **Checkpoint:** Set limits conservatively — typical business XML documents rarely exceed 50 entities or 2MB uncompressed.

4. **Validate Against an XSD Schema** — If your protocol or integration standard defines a schema (SOAP, EDI, HL7, etc.), load and validate every incoming document against the published XSD. Schema validation provides defense-in-depth: it catches structural anomalies that parser-level protections miss. **Checkpoint:** Use the same XSD version your trading partners are contracted to use — never accept a newer or older schema without version negotiation.

5. **Sanitize Output Content** — Ensure any user-supplied content embedded in XML output uses proper entity encoding (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) or is wrapped in `<CDATA[...]]` sections. Do not concatenate raw strings into XML — always use the library's element/text API. **Checkpoint:** Run a quick audit for any `f"...{user_input}..."` or string concatenation patterns that produce XML fragments.

6. **Log and Monitor Parsing Events** — Log every rejected document with the reason (XXE blocked, schema violation, entity expansion exceeded), source IP, user context, and a hash of the first 500 bytes for incident correlation. Alert on repeated XXE blocks from the same source — this indicates active exploitation attempts. **Checkpoint:** Ensure logs do not include the full XML content if it contains PII or credentials — truncate or redact before persistence.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Python lxml — Secure Parser (BAD vs. GOOD)

`lxml` is the most widely-used Python XML library. Its default parser accepts external entities by default, making every `lxml.parse()` call vulnerable to XXE unless explicitly hardened.

```python
"""secure_xml_lxml.py — XXE-safe XML parsing with lxml."""

import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

from lxml import etree


class XmlParseError(Exception):
    """Raised when XML parsing fails due to security or structural constraints."""

    def __init__(self, reason: str, source: Optional[str] = None) -> None:
        self.reason = reason
        self.source = source
        super().__init__(f"XML parse failed ({reason}): {source}" if source else f"XML parse failed ({reason})")


# Shared secure parser — constructed once at module load time.
# All security features are disabled by default in lxml; we re-enable only what we need.
SECURE_PARSER: etree.XMLParser = etree.XMLParser(
    # --- XXE Prevention ---
    resolve_entities=False,        # Disables external entity resolution
    no_network=True,               # Prevents parser from fetching any external resource
    # --- DTD Protection ---
    load_dtd=False,                # Never load DTDs (breaks some valid XML — test your consumers)
    # --- Entity Expansion Limits (Billion Laughs prevention) ---
    max_depth=50,                  # Max element nesting depth
    compact=True,                  # Save memory by compacting internal tree representations
    # --- Size Limits ---
    huge_tree=False,               # Disables the "huge tree" mode that removes all limits
)

# Entity expansion budget: total entity count before aborting
MAX_ENTITIES = 10_000
# Max resulting document size in bytes (adjust based on your business requirements)
MAX_DOCUMENT_SIZE = 5 * 1024 * 1024  # 5 MB


def parse_xml_bytes(data: bytes, source_label: Optional[str] = None) -> etree._ElementTree:
    """Parse XML bytes with full XXE protection and entity expansion limits.

    Args:
        data: Raw XML bytes to parse. Must be valid UTF-8 encoded XML.
        source_label: Optional human-readable label for logging (e.g., "request body", "file upload").

    Returns:
        Parsed ElementTree.

    Raises:
        XmlParseError: If the document is structurally invalid or violates security constraints.
    """
    if not data or not isinstance(data, bytes):
        raise XmlParseError("empty input")

    try:
        tree = etree.parse(BytesIO(data), SECURE_PARSER)
    except etree.XMLSyntaxError as exc:
        # lxml raises specific errors for entity-related issues — surface them clearly
        error_msg = str(exc).lower()
        if "external entity" in error_msg or "dtd" in error_msg:
            logging.warning("XXE/DTD attack blocked from %s: %s", source_label, exc)
            raise XmlParseError("potential XXE attack — external entity detected", source=source_label) from exc
        raise XmlParseError(f"syntax error: {exc}", source=source_label) from exc
    except etree.XMLSyntaxValidationError as exc:
        raise XmlParseError(f"schema validation failed: {exc}", source=source_label) from exc

    # Post-parse size check to mitigate memory exhaustion from deep nesting
    tree_size = len(etree.tostring(tree, encoding="unicode"))
    if tree_size > MAX_DOCUMENT_SIZE:
        logging.warning(
            "Document too large (%d bytes) from %s — exceeds limit of %d",
            tree_size, source_label, MAX_DOCUMENT_SIZE,
        )
        raise XmlParseError(f"document size {tree_size} exceeds maximum {MAX_DOCUMENT_SIZE}", source=source_label)

    return tree


def parse_xml_string(xml_string: str, source_label: Optional[str] = None) -> etree._ElementTree:
    """Convenience wrapper that encodes a string to bytes before parsing.

    Args:
        xml_string: UTF-8 encoded XML string.
        source_label: Optional source label for logging.

    Returns:
        Parsed ElementTree.
    """
    if not isinstance(xml_string, str):
        raise XmlParseError("input must be a string")
    return parse_xml_bytes(xml_string.encode("utf-8"), source_label=source_label)


def load_xml_file(path: Path, source_label: Optional[str] = None) -> etree._ElementTree:
    """Load and validate an XML file from disk with XXE protections.

    Note: File-based parsing is less risky than network parsing since the
    attacker must already have write access to the filesystem. However, if
    files come from user uploads, full protection is still required.

    Args:
        path: Path to the XML file.
        source_label: Optional source label for logging.

    Returns:
        Parsed ElementTree.
    """
    if not path.exists():
        raise XmlParseError(f"file not found: {path}")

    data = path.read_bytes()
    # Limit initial read to prevent reading a 100GB file into memory
    if len(data) > MAX_DOCUMENT_SIZE * 2:
        raise XmlParseError("source file exceeds safe size limit", source=source_label)

    return parse_xml_bytes(data, source_label=source_label)


# ========================================================================
# Entity Encoding Helpers (safe XML output)
# ========================================================================

def safe_xml_text(text: str) -> str:
    """Escape special characters in text content for safe embedding in XML.

    This handles the 5 XML predefined entities plus any Unicode characters
    that are not valid in XML names or character data per W3C XML 1.0 spec.

    Args:
        text: Raw user-supplied text that will appear as element text content.

    Returns:
        Text with & → &amp;, < → &lt;, > → &gt; properly escaped.
    """
    if not isinstance(text, str):
        raise TypeError(f"Expected str, got {type(text).__name__}")

    # Order matters: & must be first, otherwise you'd double-encode
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
    )


def safe_xml_attribute(value: str) -> str:
    """Escape a value for safe embedding as an XML attribute.

    Attributes require escaping of &, <, > plus quotes since the value
    is delimited by quotation marks.

    Args:
        value: Raw user-supplied text for an attribute value.

    Returns:
        Escaped attribute value safe for wrapping in double quotes.
    """
    if not isinstance(value, str):
        raise TypeError(f"Expected str, got {type(value).__name__}")

    return (
        value.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
             .replace("'", "&apos;")
    )
```

**BAD — Default lxml parser is XXE-vulnerable:**

```python
from lxml import etree

# ❌ BAD: Default parser accepts external entities by default
tree = etree.parse("document.xml")          # Vulnerable to file:// and http:// entity injection
root = etree.fromstring(b"<xml></xml>")     # Also vulnerable — same insecure defaults


# ❌ BAD: Explicitly enabling what you should disable
parser = etree.XMLParser()
parser.resolve_entities = True   # This is already True by default — no change needed
parser.load_dtd = True           # Also True by default — invites DTD abuse
```

---

### Pattern 2: Python ElementTree (Standard Library) — Secure Parsing (BAD vs. GOOD)

Python's built-in `xml.etree.ElementTree` has historically had limited XXE protection, but Python 3.8+ introduced `XMLParser` with entity controls.

```python
"""secure_xml_et.py — XXE-safe XML parsing with stdlib ElementTree (Python 3.8+)."""

import logging
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path
from typing import Optional


class XmlParseError(Exception):
    """Raised when XML parsing fails due to security or structural constraints."""

    def __init__(self, reason: str, source: Optional[str] = None) -> None:
        self.reason = reason
        self.source = source
        super().__init__(f"XML parse failed ({reason}): {source}" if source else f"XML parse failed ({reason})")


# Python 3.8+ XMLParser with XXE protections enabled by default
# In CPython's C implementation, resolve_entities defaults to False
# but we set it explicitly for safety and clarity across implementations.
SECURE_XML_PARSER: ET.XMLParser = ET.XMLParser(
    # resolve_entities=False is the Python 3.8+ default, but set explicitly
    # no_element_declaration=False — we don't need DTD validation
    # Use target= for SAX-style streaming parsing to limit memory usage on large docs
)

# For very large documents, use iterparse (streaming) instead of full tree loading
MAX_ITERPARSE_DEPTH = 50


def parse_xml_bytes_et(data: bytes, source_label: Optional[str] = None) -> ET.Element:
    """Parse XML bytes using stdlib ElementTree with XXE protections.

    Args:
        data: Raw XML bytes to parse.
        source_label: Optional source label for logging.

    Returns:
        Root Element.

    Raises:
        XmlParseError: If the document is structurally invalid or violates security constraints.
    """
    if not data:
        raise XmlParseError("empty input")

    try:
        tree = ET.parse(BytesIO(data), parser=SECURE_XML_PARSER)
        return tree.getroot()
    except ET.ParseError as exc:
        error_msg = str(exc).lower()
        if "external entit" in error_msg or "dtd" in error_msg:
            logging.warning("XXE/DTD attack blocked from %s: %s", source_label, exc)
            raise XmlParseError("potential XXE — external entity detected", source=source_label) from exc
        raise XmlParseError(f"syntax error: {exc}", source=source_label) from exc


def stream_xml_bytes_et(data: bytes, tag_filter: Optional[str] = None) -> list[ET.Element]:
    """Stream-parse XML using iterparse to handle large documents without loading them fully into memory.

    This is the recommended approach for documents larger than 1 MB or when
    you only need specific elements rather than the full tree.

    Args:
        data: Raw XML bytes to stream-parse.
        tag_filter: If set, only yield elements matching this tag name.

    Yields:
        Matching Element objects as they are parsed.
    """
    context = ET.iterparse(BytesIO(data), events=("end",), parser=SECURE_XML_PARSER)

    for event, elem in context:
        if tag_filter is None or elem.tag == tag_filter:
            yield elem
        # Clear the element to free memory immediately after processing
        elem.clear()
        # Remove the parent's reference to prevent memory leaks during streaming
        while elem.getprevious() is not None:
            del elem.getparent()[0]


# ❌ BAD: No parser argument means using defaults that may vary by Python version
def bad_parse(data: bytes) -> ET.Element:
    tree = ET.parse(BytesIO(data))  # No explicit XXE protection — relies on unspecified defaults
    return tree.getroot()
```

---

### Pattern 3: Java DocumentBuilder / SAXParser — Secure Configuration (BAD vs. GOOD)

Java's built-in XML parsers (`DocumentBuilderFactory`, `SAXParserFactory`) are notorious for having secure defaults that can be overridden by malicious or misconfigured code. The JAXP specification requires explicit feature setting to disable external entities.

```java
/**
 * XmlSecureParser.java — XXE-safe XML parsing with Java JAXP.
 *
 * Java's default XML parsers load DTDs and resolve external entities unless
 * explicitly configured otherwise. This class provides hardened factories.
 */
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.SAXParserFactory;
import javax.xml.transform.Source;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.SAXNotRecognizedException;
import org.xml.sax.SAXNotSupportedException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Set;

public final class XmlSecureParser {

    private static final DocumentBuilderFactory DOC_FACTORY;
    private static final SAXParserFactory SAX_FACTORY;
    private static final Schema VALIDATION_SCHEMA;

    static {
        // ========================================================================
        // Secure DocumentBuilderFactory configuration
        // ========================================================================
        DOC_FACTORY = DocumentBuilderFactory.newInstance();
        DOC_FACTORY.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        DOC_FACTORY.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        DOC_FACTORY.setFeature("http://xml.org/sax/features/external-general-entities", false);
        DOC_FACTORY.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        DOC_FACTORY.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        DOC_FACTORY.setXIncludeAware(false);
        DOC_FACTORY.setExpandEntityReferences(false);

        // ========================================================================
        // Secure SAXParserFactory configuration (for streaming / pull parsing)
        // ========================================================================
        SAX_FACTORY = SAXParserFactory.newInstance();
        SAX_FACTORY.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        SAX_FACTORY.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        SAX_FACTORY.setFeature("http://xml.org/sax/features/external-general-entities", false);
        SAX_FACTORY.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        SAX_FACTORY.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        SAX_FACTORY.setXIncludeAware(false);

        // ========================================================================
        // Optional: Load XSD for schema validation (defense-in-depth)
        // Set VALIDATION_SCHEMA to null if your protocol does not use XSD.
        // ========================================================================
        SchemaFactory schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        // schemaFactory.setSchema(new javax.xml.validation.Source[] {
        //     new StreamSource(pathToXsdFile.toFile())
        // });
        VALIDATION_SCHEMA = null; // Replace with actual XSD for production use
    }

    private XmlSecureParser() { /* utility class — prevent instantiation */ }

    /**
     * Parse XML from a byte array with full XXE protection.
     *
     * @param xmlData Raw XML bytes (UTF-8 encoded)
     * @return Parsed DOM Document
     * @throws XmlSecurityException if XXE is detected or parsing fails
     */
    public static Document parse(byte[] xmlData) throws XmlSecurityException {
        if (xmlData == null || xmlData.length == 0) {
            throw new XmlSecurityException("Empty XML input");
        }
        try {
            // Validate against XSD first (defense-in-depth), then parse
            if (VALIDATION_SCHEMA != null) {
                validateSchema(xmlData);
            }

            DocumentBuilder builder = DOC_FACTORY.newDocumentBuilder();
            return builder.parse(new ByteArrayInputStream(xmlData));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (msg.toLowerCase().contains("doctype") || msg.toLowerCase().contains("entity")) {
                throw new XmlSecurityException("Potential XXE attack detected: " + msg, e);
            }
            throw new XmlSecurityException("XML parse error: " + msg, e);
        }
    }

    /**
     * Validate XML bytes against the loaded XSD schema before parsing.
     * This is defense-in-depth: even if parser protections fail, schema
     * validation will reject non-conforming or malicious documents.
     */
    private static void validateSchema(byte[] xmlData) throws SAXException, IOException {
        if (VALIDATION_SCHEMA == null) return;

        Validator validator = VALIDATION_SCHEMA.newValidator();
        // Disable external DTD/schema references to prevent schema-based XXE
        validator.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        validator.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        validator.validate(new StreamSource(new ByteArrayInputStream(xmlData)));
    }
}

/** Exception thrown when XML security constraints are violated. */
class XmlSecurityException extends Exception {
    public XmlSecurityException(String message) { super(message); }
    public XmlSecurityException(String message, Throwable cause) { super(message, cause); }
}
```

**BAD — Java's default factory is extremely permissive:**

```java
// ❌ BAD: Default DocumentBuilderFactory has no XXE protections
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
// No features set at all — accepts DTDs, external entities, XInclude by default
DocumentBuilder builder = factory.newDocumentBuilder();
Document doc = builder.parse(new FileInputStream("document.xml"));

// ❌ BAD: Setting FEATURE_SECURE_PROCESSING alone is NOT sufficient
factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
// This reduces resource consumption but does NOT disable DTDs or external entities.
// OWASP explicitly states FEATURE_SECURE_PROCESSING must be combined with
// explicit feature disables to prevent XXE in Java.

// ❌ BAD: Allowing everything for "compatibility"
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
factory.setFeature("http://xml.org/sax/features/external-general-entities", true);
```

---

### Pattern 4: PHP DOMDocument / simplexml — Secure Loading (BAD vs. GOOD)

PHP's XML functions have been vulnerable to XXE for years. The `libxml` library that powers `DOMDocument` and `simplexml_load_string()` defaults to loading external entities. Since PHP 5.x, you can disable this via `libxml_disable_entity_loader()`, but this function was deprecated in PHP 8.0 and removed in PHP 8.2, so modern code must use the `LIBXML_NONET` and `LIBXML_NOENT` flags properly.

```php
<?php
/**
 * SecureXmlParser.php — XXE-safe XML parsing for PHP 8.x.
 *
 * Modern PHP (8.0+) requires explicit LIBXML_NONET flag and DOMDocument
 * property configuration rather than the deprecated libxml_disable_entity_loader().
 */

declare(strict_types=1);

final class XmlSecureParser
{
    /** @var int Maximum allowed document size in bytes (default: 5 MB) */
    private const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

    /** @var int Maximum nesting depth to prevent Billion Laughs DoS */
    private const MAX_DEPTH = 50;

    /**
     * Parse XML string with full XXE protection.
     *
     * @param string $xmlString Raw XML content (UTF-8 encoded)
     * @param int    $options   Additional libxml options (default: NONET + NOCDATA)
     * @return DOMDocument Parsed document
     * @throws XmlSecurityException If XXE is detected or parsing fails
     */
    public static function parseFromString(string $xmlString, int $options = self::DEFAULT_OPTIONS): DOMDocument
    {
        self::validateInputSize($xmlString);

        // Suppress libxml warnings — we handle them ourselves
        $internalErrors = libxml_use_internal_errors(true);

        try {
            $doc = new DOMDocument();
            $loaded = $doc->loadXML($xmlString, $options | self::DEFAULT_OPTIONS);

            if ($loaded === false) {
                $errors = libxml_get_last_error();
                $reason = $errors !== false ? $errors->message : 'unknown parse error';

                // Check for XXE-specific error patterns
                if (stripos($reason, 'entity') !== false || stripos($reason, 'external') !== false) {
                    throw new XmlSecurityException("Potential XXE attack detected: {$reason}");
                }

                throw new XmlSecurityException("XML syntax error: {$reason}");
            }

            return $doc;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($internalErrors);
        }
    }

    /**
     * Parse XML file with XXE protection.
     *
     * @param string $filePath Path to the XML file
     * @return DOMDocument Parsed document
     * @throws XmlSecurityException If XXE is detected, file not found, or parse fails
     */
    public static function parseFromFile(string $filePath): DOMDocument
    {
        if (!is_file($filePath)) {
            throw new XmlSecurityException("File not found: {$filePath}");
        }

        // Check file size before loading to prevent memory exhaustion
        $fileSize = filesize($filePath);
        if ($fileSize > self::MAX_DOCUMENT_SIZE * 2) {
            throw new XmlSecurityException("File size ({$fileSize} bytes) exceeds safe limit");
        }

        $internalErrors = libxml_use_internal_errors(true);

        try {
            $doc = new DOMDocument();
            // Use load() with NONET — XXE prevention at the loader level
            $loaded = $doc->load($filePath, self::DEFAULT_OPTIONS);

            if ($loaded === false) {
                $errors = libxml_get_last_error();
                $reason = $errors !== false ? $errors->message : 'unknown parse error';
                throw new XmlSecurityException("XML parse failed: {$reason}");
            }

            return $doc;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($internalErrors);
        }
    }

    /**
     * Validate XML string against an XSD schema (defense-in-depth).
     *
     * @param string $xmlString Raw XML content
     * @param string $xsdPath   Path to the XSD schema file
     * @return array<string> List of validation errors (empty if valid)
     */
    public static function validateAgainstSchema(string $xmlString, string $xsdPath): array
    {
        $internalErrors = libxml_use_internal_errors(true);

        try {
            // Parse XML without entity loading
            $doc = new DOMDocument();
            $doc->loadXML($xmlString, self::DEFAULT_OPTIONS | LIBXML_NOENT);

            // Validate against schema — setEntityLoader blocks external entity access
            $validated = $doc->schemaValidate($xsdPath);

            if (!$validated) {
                $errors = [];
                foreach (libxml_get_errors() as $error) {
                    $errors[] = sprintf(
                        "Line %d: %s (code: %d)",
                        $error->line,
                        trim($error->message),
                        $error->code
                    );
                }
                return $errors;
            }

            return []; // Empty array means valid
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($internalErrors);
        }
    }

    /**
     * Escape text for safe embedding in XML element content.
     * Uses the native PHP function which handles all 5 predefined entities.
     *
     * @param string $text Raw user-supplied text
     * @return string Escaped text safe for XML content
     */
    public static function escapeXmlText(string $text): string
    {
        // ENT_XML1 flag + UTF-8 encoding handles: & < > " '
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /**
     * Escape a value for safe embedding as an XML attribute value.
     */
    public static function escapeXmlAttribute(string $value): string
    {
        return self::escapeXmlText($value);
    }

    private const DEFAULT_OPTIONS = LIBXML_NONET | LIBXML_NOCDATA | LIBXML_COMPACT;

    private static function validateInputSize(string $input): void
    {
        $byteLength = mb_strlen($input, '8bit');
        if ($byteLength > self::MAX_DOCUMENT_SIZE) {
            throw new XmlSecurityException(
                "Input size ({$byteLength} bytes) exceeds maximum allowed (".self::MAX_DOCUMENT_SIZE.')"'
            );
        }
    }
}

/** Exception thrown when XML security constraints are violated. */
class XmlSecurityException extends RuntimeException {}
```

**BAD — PHP's default configuration is XXE-vulnerable:**

```php
// ❌ BAD: Default DOMDocument accepts external entities
$doc = new DOMDocument();
$doc->loadXML($userSuppliedXml);  // Vulnerable to file://, http:// entity injection

// ❌ BAD: Using simplexml_load_string() without NONET flag
$xml = simplexml_load_string($userSuppliedXml);  // Also vulnerable — loads DTDs by default

// ❌ BAD: Using LIBXML_NOENT which ENABLES entity expansion (opposite of what you want)
$doc->loadXML($input, LIBXML_NOENT);  // This resolves entities, creating a Billion Laughs vector!

// ❌ DEPRECATED / REMOVED: libxml_disable_entity_loader() was deprecated in PHP 8.0 and removed in 8.2
libxml_disable_entity_loader(true);  // Do NOT use this — it is gone in modern PHP
```

---

### Pattern 5: Node.js (libxmljs / xml2js) — Secure Parsing (BAD vs. GOOD)

Node.js has no built-in XML parser, so developers use third-party libraries. Both `libxmljs` and `@xmldom/xmldom` + `sax` have different security characteristics. This pattern covers the two most popular approaches.

```javascript
/**
 * secureXmlParser.mjs — XXE-safe XML parsing for Node.js.
 *
 * Covers three libraries: @xmldom/xmldom (DOM), sax (streaming SAX), and fast-xml-parser.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SAXParser, events } from 'sax';
import { XMLParser, XMLValidator } from 'fast-xml-parser';


// ========================================================================
// Constants
// ========================================================================
const MAX_ENTITY_DEPTH = 10;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB
const ENTITY_EXPANSION_LIMIT = 1000;


// ========================================================================
// Approach 1: @xmldom/xmldom (DOM-style, synchronous)
// ========================================================================
/**
 * Parse XML string with @xmldom/xmldom — the most widely-used DOM parser in Node.js.
 * This library does NOT parse DTDs or resolve entities by default, but we add
 * explicit protection layers for defense-in-depth.
 *
 * @param {string} xmlString - Raw XML content (UTF-8 encoded)
 * @returns {Document} Parsed DOM document
 * @throws {Error} If XXE is detected or parsing fails
 */
export function parseWithXmldom(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('XML input must be a non-empty string');
  }

  const byteLength = Buffer.byteLength(xmlString, 'utf8');
  if (byteLength > MAX_DOCUMENT_SIZE) {
    throw new Error(`XML size ${byteLength} bytes exceeds maximum ${MAX_DOCUMENT_SIZE}`);
  }

  // Check for dangerous patterns BEFORE parsing — fast-path rejection
  const entityDeclarationPattern = /<!ENTITY\s+/i;
  if (entityDeclarationPattern.test(xmlString)) {
    throw new Error('Potential XXE: document contains ENTITY declarations');
  }

  const doctypePattern = /<!DOCTYPE/i;
  if (doctypePattern.test(xmlString)) {
    throw new Error('XXE prevention: DOCTYPE declarations are not allowed');
  }

  try {
    const parser = new DOMParser({
      // @xmldom defaults: no DTD loading, no entity resolution — but be explicit
      errorHandler: {
        warning: () => {},       // Suppress warnings
        error: (msg) => {        // Log errors for monitoring
          console.error('XML parse error:', msg);
        },
        fatalError: (msg) => {   // Fatal errors will throw below
          console.error('Fatal XML error:', msg);
        }
      }
    });

    return parser.parseFromString(xmlString, 'text/xml');
  } catch (err) {
    if (err.message.toLowerCase().includes('entity') ||
        err.message.toLowerCase().includes('external')) {
      throw new Error(`XXE prevention triggered: ${err.message}`);
    }
    throw new Error(`XML parse error: ${err.message}`);
  }
}


// ========================================================================
// Approach 2: sax (streaming SAX — best for large documents)
// ========================================================================
/**
 * Stream-parse XML using the 'sax' library. Streaming avoids loading the
 * entire document into memory, mitigating Billion Laughs DoS by default.
 *
 * @param {string} xmlString - Raw XML content
 * @param {Object} options - SAX parser options
 * @returns {Promise<Array<Object>>} Array of parsed elements
 */
export function streamParseWithSax(xmlString) {
  return new Promise((resolve, reject) => {
    const byteLength = Buffer.byteLength(xmlString, 'utf8');
    if (byteLength > MAX_DOCUMENT_SIZE) {
      return reject(new Error(`XML size exceeds maximum ${MAX_DOCUMENT_SIZE}`));
    }

    // Fast-path XXE detection before parsing
    if (/<!ENTITY\s+/i.test(xmlString)) {
      return reject(new Error('XXE prevention: ENTITY declarations detected'));
    }
    if (/<!DOCTYPE/i.test(xmlString)) {
      return reject(new Error('XXE prevention: DOCTYPE declarations not allowed'));
    }

    const parser = new SAXParser('stream', {
      trim: true,
      normalize: true,
      // sax does not load DTDs or resolve entities by default — this is safe
      lowercaseAttributeNames: false,
    });

    const elements = [];

    parser.onopentag = (node) => {
      if (elements.length < 10000) { // Prevent memory exhaustion from deeply nested documents
        elements.push({
          name: node.name,
          attributes: node.attributes,
          childrenCount: node.children?.length ?? 0
        });
      }
    };

    parser.onerror = (err) => {
      if (err.message.toLowerCase().includes('entity')) {
        reject(new Error(`XXE detection: ${err.message}`));
      } else {
        reject(new Error(`SAX parse error: ${err.message}`));
      }
    };

    parser.onend = () => resolve(elements);

    parser.write(xmlString).close();
  });
}


// ========================================================================
// Approach 3: fast-xml-parser (DOM + streaming, enterprise-grade)
// ========================================================================
/**
 * Parse XML using fast-xml-parser with security defaults.
 * This library is popular for its performance and JSON-like API.
 *
 * IMPORTANT: fast-xml-parser has an explicit `removeNSPrefix` option which
 * can be abused for XXE — always verify your config does not enable it.
 */
export function parseWithFastXmlParser(xmlString) {
  const byteLength = Buffer.byteLength(xmlString, 'utf8');
  if (byteLength > MAX_DOCUMENT_SIZE) {
    throw new Error(`XML size exceeds maximum ${MAX_DOCUMENT_SIZE}`);
  }

  // Validate document structure first (catches malformed / attack documents early)
  const validationResult = XMLValidator.validate(xmlString);
  if (validationResult !== true) {
    throw new Error(`Invalid XML: ${validationResult}`);
  }

  const parser = new XMLParser({
    // SECURITY: Disable features that could enable XXE
    ignoreAttributes: false,       // Keep attributes for validation; set true to skip them
    attributeNamePrefix: '@_',     // Prefix attribute names to avoid collisions
    isArray: (tagName) => tagName === 'item',  // Customize array detection

    // CRITICAL SECURITY SETTINGS
    stopNodes: ['*.rawContent'],   // Stop parsing nested content in these tags
    unescapeEntities: false,       // Do NOT resolve entities — this prevents entity expansion
    cdataTagName: null,            // Do not special-case CDATA
    parseAttributeValue: false,    // Don't try to coerce attribute values (prevents type confusion)
    parseTrueNumberOnly: false,

    // Do NOT set these — they enable dangerous behavior:
    // removeNSPrefix: true,        // VULNERABLE — can be used for XXE via namespace manipulation
    // mergeAttrs: true,            // Can cause attribute shadowing attacks
  });

  return parser.parse(xmlString);
}


// ========================================================================
// Entity Encoding Helpers (safe XML output in Node.js)
// ========================================================================

/**
 * Escape special characters for safe XML text content.
 * Handles the 5 predefined XML entities: & < > " '
 *
 * @param {string} text - Raw user-supplied text
 * @returns {string} Escaped text
 */
export function escapeXmlText(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected string, got ${typeof text}`);
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape a value for safe embedding as an XML attribute.
 * Attributes require escaping of all 5 predefined entities since values
 * are wrapped in quotes.
 *
 * @param {string} value - Raw attribute value
 * @returns {string} Escaped attribute value
 */
export function escapeXmlAttribute(value) {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


// ========================================================================
// Usage example showing the correct pattern vs. common mistakes
// ========================================================================

/**
 * ❌ BAD: Using a parser that resolves external entities
 */
try {
  // dom-parser is a popular library but its default config resolves entities
  const { DOMParser: BadDomParser } = require('xmldom');
  // No entity protection — accepts DTDs and external entities by default
  const badDoc = new BadDomParser().parseFromString('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>');
} catch (_) { /* suppressed — this is intentionally shown as BAD */ }

/**
 * ❌ BAD: Using xml2js with default settings (it resolves entities by default)
 */
try {
  const xml2js = require('xml2js');
  // xml2js's XMLParser has explicit security options but they are NOT defaults
  const badParser = new xml2js.Parser();  // No entity protection configured!
} catch (_) { /* suppressed — this is intentionally shown as BAD */ }
```

---

### Pattern 6: Go (golang.org/x/exp/xml / encoding/xml) — Secure Decoding (BAD vs. GOOD)

Go's `encoding/xml` package does not support DTDs at all, which means XXE via external entities is impossible by default. However, the `golang.org/x/exp/xml` package (a more feature-complete XML implementation) may need explicit hardening. We also cover entity expansion limits since Go's parser has no built-in depth or count limits.

```go
// secure_xml.go — XXE-safe XML parsing for Go applications.
//
// Go's encoding/xml does not support DTDs, so traditional XXE via external entities
// is impossible. However, we still need to guard against:
//   1. Billion Laughs entity expansion (if using exp/xml which supports DTDs)
//   2. Deeply nested documents causing stack exhaustion
//   3. Overly large documents causing memory exhaustion
//   4. XInclude attacks (if using exp/xml with XInclude enabled)

package xmlsecurity

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strconv"

	"golang.org/x/exp/xml" // Feature-complete XML parser with DTD support — requires hardening
	"golang.org/x/exp/xml/xmlenc"
)

// ========================================================================
// Constants and Errors
// ========================================================================

const (
	// MaxDocumentSize limits how many bytes we read from the input.
	// Adjust based on your expected document sizes.
	MaxDocumentSize = 5 * 1024 * 1024 // 5 MB

	// MaxElementDepth limits nesting to prevent stack exhaustion.
	MaxElementDepth = 100

	// MaxEntityExpansion limits the total number of entity expansions.
	// A normal business document rarely exceeds a few dozen entities.
	MaxEntityExpansion = 1000
)

var (
	ErrDocumentTooLarge     = errors.New("document size exceeds maximum allowed")
	ErrDepthExceeded        = errors.New("element nesting depth exceeds maximum")
	ErrExternalEntity       = errors.New("external entity reference detected — potential XXE")
	ErrMalformedXML         = errors.New("malformed XML input")
	ErrEntityExpansionLimit = errors.New("entity expansion limit exceeded — possible Billion Laughs attack")
)

// ========================================================================
// Approach 1: encoding/xml (standard library, DTD-unsupported but safe)
// ========================================================================

// ParseXml decodes XML from a reader using the standard library's encoding/xml.
// This is the RECOMMENDED approach for most Go applications because it cannot
// process DTDs or external entities — XXE is impossible by design.
//
// The input is limited to MaxDocumentSize bytes to prevent memory exhaustion.
func ParseXml(r io.Reader, v any) error {
	limitedReader := &io.LimitedReader{R: r, N: MaxDocumentSize + 1}

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, limitedReader); err != nil {
		return fmt.Errorf("read XML input: %w", err)
	}

	if buf.Len() > MaxDocumentSize {
		return ErrDocumentTooLarge
	}

	if err := xml.Unmarshal(buf.Bytes(), v); err != nil {
		return fmt.Errorf("parse XML: %w", err)
	}

	return nil
}

// ParseXmlString is a convenience wrapper for parsing XML from a string.
func ParseXmlString(s string, v any) error {
	return ParseXml(bytes.NewReader([]byte(s)), v)
}


// ========================================================================
// Approach 2: exp/xml with explicit XXE hardening (when DTD support is required)
// ========================================================================

// SecureExpParser wraps the golang.org/x/exp/xml decoder with security limits.
// Use this ONLY when your application requires DTD processing — for most cases,
// encoding/xml (Approach 1) is safer and sufficient.
type SecureExpParser struct {
	decoder       *xml.Decoder
	entityCount   int
	maxEntities   int
	maxDepth      int
	currentDepth  int
}

// NewSecureExpParser creates a hardened exp/xml decoder.
func NewSecureExpParser(r io.Reader) *SecureExpParser {
	limitedReader := &io.LimitedReader{R: r, N: MaxDocumentSize + 1}
	decoder := xml.NewDecoder(limitedReader)

	return &SecureExpParser{
		decoder:     decoder,
		maxEntities: MaxEntityExpansion,
		maxDepth:    MaxElementDepth,
	}
}

// DecodeToken reads the next XML token with security checks.
// Returns ErrExternalEntity if a DTD/external entity reference is encountered,
// ErrEntityExpansionLimit if too many entities are expanded, or
// ErrDepthExceeded if nesting exceeds limits.
func (p *SecureExpParser) DecodeToken() (xml.Token, error) {
	token, err := p.decoder.Token()
	if err != nil {
		return nil, err
	}

	// Check for external entity references
	switch t := token.(type) {
	case xml.StartElement:
		p.currentDepth++
		if p.currentDepth > p.maxDepth {
			return nil, ErrDepthExceeded
		}
	case xml.EndElement:
		p.currentDepth--
	case xml.Directive:
		// DTD declarations appear as Directives like "<!ENTITY ...>"
		directive := string(t)
		if isExternalEntityDirective(directive) {
			return nil, ErrExternalEntity
		}
	case xml.CharData:
		// Count approximate entity expansions (CharData after entity expansion)
		p.entityCount++
		if p.entityCount > p.maxEntities {
			return nil, ErrEntityExpansionLimit
		}
	}

	return token, nil
}

// isExternalEntityDirective checks if a DTD directive references external resources.
func isExternalEntityDirective(directive string) bool {
	lower := directive
	// Check for SYSTEM or PUBLIC external entity declarations
	return contains(lower, "<!ENTITY") && (contains(lower, "SYSTEM") || contains(lower, "PUBLIC"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}


// ========================================================================
// Approach 3: XSD Validation with Go (defense-in-depth)
// ========================================================================

// ValidateXmlWithXsd validates an XML document against an XSD schema.
// Go has no built-in XSD validator, so this function demonstrates the
// pattern of delegating validation to a trusted library or external service.
func ValidateXmlWithXsd(xmlData []byte, xsdPath string) error {
	// In production, use a dedicated XML schema validation library such as:
	//   - github.com/moovweb/xslt (for XSLT-based validation)
	//   - Call an external validator service (e.g., Java JAXB validation)
	//   - Use a C-based library via cgo (libxml2 with xmllint — configure securely)
	//
	// For most Go applications, relying on encoding/xml + business-logic
	// validation is sufficient. XSD validation in Go typically requires
	// integrating with Java or Python services for the schema check.

	if len(xmlData) == 0 {
		return errors.New("empty XML data")
	}
	if xsdPath == "" {
		return errors.New("XSD path is required for validation")
	}

	// Basic structural validation — ensure the document can be parsed
	var raw xml.RawMessage
	if err := ParseXml(bytes.NewReader(xmlData), &raw); err != nil {
		return fmt.Errorf("structural validation failed: %w", err)
	}

	// Full XSD validation would go here with a real schema library
	// return validateAgainstXsd(xmlData, xsdPath)

	return nil
}


// ========================================================================
// Entity Encoding Helpers (safe XML output in Go)
// ========================================================================

// EscapeXmlText escapes special characters for safe XML text content.
// Uses xml.EscapeString which handles &, <, >, ", ' correctly.
func EscapeXmlText(s string) string {
	return xml.EscapeString(s)
}

// EscapeXmlAttr escapes a value for safe embedding as an XML attribute.
// xml.EscapeString works for attributes too — it covers all 5 predefined entities.
func EscapeXmlAttr(s string) string {
	return xml.EscapeString(s)
}


// ========================================================================
// Usage: Example struct with proper encoding annotations
// ========================================================================

// Transaction represents a financial transaction in XML format.
type Transaction struct {
	XMLName    xml.Name `xml:"transaction"`
	ID         string   `xml:"id,attr"`
	Date       string   `xml:"date"`
	Amount     float64  `xml:"amount"`
	Currency   string   `xml:"currency"`
	Description string  `xml:"description"` // Text content — automatically escaped by encoding/xml
	Payee      Payee    `xml:"payee"`
}

type Payee struct {
	Name   string `xml:"name"`
	Account string `xml:"account,attr"`
}

// ========================================================================
// ❌ BAD: Using exp/xml without hardening (XXE-vulnerable)
// ========================================================================

/*
func badParse(data []byte) error {
    decoder := xml.NewDecoder(bytes.NewReader(data))
    // No depth limit, no entity limit, no external entity detection
    for {
        _, err := decoder.Token()
        if err != nil {
            break
        }
    }
    return err
}

// This code is vulnerable to:
// 1. Billion Laughs entity expansion (no maxEntities check)
// 2. Deep nesting causing stack exhaustion (no maxDepth check)
// 3. External DTD/entity loading (no directive filtering)
*/
```

---

### Pattern 7: Entity Expansion / Billion Laughs DoS Prevention

The "Billion Laughs" attack (also called XML Entity Expansion) uses nested entity definitions to exponentially inflate a small document into gigabytes of data. Example:

```xml
<!-- Vulnerable: each &a; reference expands to 8 copies of the previous definition -->
<!DOCTYPE laugh [
  <!ENTITY a "lol">
  <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;">      <!-- 8x -->
  <!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;">      <!-- 64x -->
  <!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;">      <!-- 512x -->
  ...
  <!ENTITY i "&h;&h;&h;&h;&h;&h;&h;&h;">      <!-- ~16 million x → billions of "lol" strings -->
]>
<laugh>&i;</laugh>
```

**Defense strategy (applies to every language):**

| Defense Layer | What It Blocks | Where to Configure |
|---|---|---|
| `resolve_entities = False` / `no_network = True` | External entity fetch (`file://`, `http://`) | Parser factory / constructor |
| `load_dtd = False` / `disallow-doctype-decl = true` | All DTD processing (including local entity definitions) | Parser factory / constructor |
| Entity expansion limits (count, depth, size) | Billion Laughs via locally defined entities | Post-parse check or streaming parser config |
| `huge_tree = False` | Removal of all internal limits on parser features | Parser constructor |

---

### Pattern 8: XML Schema (XSD) Validation as Defense-in-Depth

Schema validation should complement parser-level XXE protection. Even if a parser's entity protections are bypassed, an XSD validator that does not load DTDs will still reject non-conforming documents. This is the second layer of your defense.

```python
"""xsdschema_validator.py — XSD validation for defense-in-depth with lxml."""

import logging
from pathlib import Path
from typing import Optional

from lxml import etree


class SchemaValidationError(Exception):
    """Raised when an XML document fails XSD schema validation."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(f"Schema validation failed with {len(errors)} error(s):\n" + "\n".join(errors))


class XmlSchemaValidator:
    """Validates XML documents against an XSD schema for defense-in-depth.

    This validator uses a secure parser internally — it never loads external
    DTDs or resolves entities during validation. Schema compilation happens at
    module load time; validation of individual documents is fast and safe.
    """

    def __init__(self, xsd_path: Path) -> None:
        """Load and compile an XSD schema from disk.

        Args:
            xsd_path: Path to the .xsd file to load.

        Raises:
            SchemaValidationError: If the XSD itself is malformed.
        """
        self._schema_doc = etree.parse(str(xsd_path))
        try:
            self._schema = etree.XMLSchema(self._schema_doc)
        except etree.DocumentInvalid as exc:
            raise SchemaValidationError(
                [f"Invalid XSD schema: {exc}"]
            ) from exc

        # Verify the secure parser is used during validation
        self._secure_parser = etree.XMLParser(
            resolve_entities=False,
            load_dtd=False,
            no_network=True,
        )

    def validate(self, xml_bytes: bytes, source_label: Optional[str] = None) -> bool:
        """Validate an XML document against the loaded schema.

        Args:
            xml_bytes: Raw XML document bytes.
            source_label: Optional label for error messages.

        Returns:
            True if the document validates successfully.

        Raises:
            SchemaValidationError: If validation fails with specific error details.
            etree.XMLSyntaxError: If the document is not well-formed XML.
        """
        try:
            doc = etree.parse(etree.BytesIO(xml_bytes), self._secure_parser)
        except etree.XMLSyntaxError as parse_err:
            raise etree.XMLSyntaxError(
                f"XML is not well-formed ({source_label}): {parse_err}"
            ) from parse_err

        if self._schema.validate(doc):
            return True

        # Collect all validation errors for the caller
        errors = [
            f"[{err.line}] {err.message}"
            for err in self._schema.error_log
        ]

        logging.warning(
            "Schema validation failed for %s — %d error(s)",
            source_label, len(errors),
        )
        raise SchemaValidationError(errors)

    def is_valid(self, xml_bytes: bytes, source_label: Optional[str] = None) -> bool:
        """Return True if the document validates, False otherwise.

        Unlike validate(), this does not raise exceptions — use this for
        fast-path checks where you want to handle failures silently or with
        custom logic.
        """
        try:
            self.validate(xml_bytes, source_label)
            return True
        except SchemaValidationError:
            return False
```

---

## Constraints

### MUST DO

- Disable external entity resolution on every XML parser instance before parsing any input — this is the single most important XXE defense
- Disable DTD loading (`load_dtd=False`, `disallow-doctype-decl=true`, `LIBXML_NOENT` must NOT be used) unless your protocol explicitly requires DTDs
- Set entity expansion limits (maximum count, depth, or document size) to prevent Billion Laughs DoS attacks
- Validate all incoming XML against an XSD schema before processing — use schema validation as defense-in-depth even when parser-level protections are active
- Use safe text escaping (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) or CDATA sections for user-supplied content that may contain XML special characters
- Process XML via streaming (`iterparse` in Python, SAX in Java, `sax` in Node.js) for documents larger than 1 MB to prevent memory exhaustion
- Strip or reject DOCTYPE declarations from any XML input you cannot fully trust — DOCTYPE is the only part of XML that enables external entity loading
- Set aggressive timeouts on XML parsing operations: connection timeout ≤ 5s, read timeout ≤ 10s for network-sourced documents
- Log every XXE-blocked request with source IP, document hash, and rejection reason for security monitoring and incident response
- Test your parser configuration against a standard XXE exploit payload in every language/environment before deploying to production

### MUST NOT DO

- Never use the default parser configuration from any XML library without explicitly hardening it — defaults vary across languages and versions
- Never concatenate raw user input into XML strings (e.g., `f"<name>{username}</name>"`) — always use the library's element/text API or proper entity encoding
- Never enable `LIBXML_NOENT` or equivalent entity-expansion flags on untrusted XML input — this directly enables the Billion Laughs attack
- Never pass unsanitized XML to an XSLT processor without also hardening the XSLT transformer — transform engines have their own external entity loading mechanisms
- Never trust that a language's standard library parser is "safe by default" — Java, Python lxml, PHP DOMDocument, and Node.js xmldom all have different threat models
- Never store raw XML blobs in databases without sanitizing them first — XML stored at rest can be executed later when retrieved and parsed
- Never use `eval()`, `exec()`, or dynamic code evaluation on any content derived from XML parsing — entity expansion can execute arbitrary code in some configurations
- Never accept XML from an untrusted source without a document size limit — a 10 GB XML file will crash your process even without XXE entities

---

## Output Template

When implementing XML security for a given language or context, provide output containing:

1. **Secure Parser Implementation** — Complete implementation with all entity//DTD expansion protections enabled, typed signatures with docstrings
2. **Test Suite** — At minimum 7 tests covering: (a) standard valid document parsing, (b) XXE via `file://` entity, (c) XXE via `http://` entity, (d) DTD rejection, (e) Billion Laughs entity expansion limit, (f) oversized document rejection, (g) schema validation pass/fail
3. **Entity Encoding Verification** — Demonstrate that `<`, `>`, `&`, `"`, `'` are properly encoded in output XML using the library's escape function, not string concatenation
4. **Security Audit Checklist** — A numbered list of all XXE-relevant code locations identified in the target codebase, with current status (protected / vulnerable / needs review)
5. **Migration Steps** — If retrofitting protection onto existing code: step-by-step instructions to harden each parser instance without breaking legitimate XML documents

---

## Related Skills

| Skill | Purpose |
|---|---|
| `html-entity-encoding` | HTML entity encoding/decoding for web output — related because both deal with entity escaping, but HTML uses different syntax (`&#xNN;`, named entities like `&nbsp;`) and threat model (XSS vs. XXE) |
| `url-parsing-security` | URL parsing, validation, and SSRF prevention — related because both secure external input, but URLs have a completely different attack surface |
| `input-validation` | General input validation patterns (allowlists, schema-based validation) — complementary to XML security as part of defense-in-depth |
| `api-security-patterns` | Broader API security including authentication, rate limiting, CORS — relevant when your API accepts XML request bodies and needs layered security |

---

## Live References

> Authoritative documentation, specifications, and vulnerability databases for XML security. The model follows markdown links at load time to resolve external references.

- [OWASP XXE Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XXE_Prevention_Cheat_Sheet.html) — Complete guide to XXE attack vectors, detection, and prevention across all major languages
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html) — MITRE's canonical definition and mitigation guidance for XXE vulnerabilities
- [W3C XML 1.0 Specification — Entities](https://www.w3.org/TR/xml/#sec-entity-dev) — The authoritative specification defining entity declarations, parameter entities, and external general entities
- [NIST SP 800-190: Application Container Security — XML Processing](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf) — NIST guidance on securing XML processing in containerized applications
- [OWASP XML External Entity (XXE) Prevention for Java](https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing) — Java-specific XXE prevention patterns including DocumentBuilderFactory and SAXParser hardening
- [libxml2 Security Documentation](https://gitlab.gnome.org/GNOME/libxml2/-/wikis/Security) — libxml2's own security guidance covering DTD handling, entity expansion limits, and parser configuration (used by PHP, Python lxml, Node.js xmldom)
- [W3C XML Schema Definition Language (XSD)](https://www.w3.org/XML/Schema) — Official W3C specification for XSD schema validation, the primary defense-in-depth mechanism against malformed or malicious XML
