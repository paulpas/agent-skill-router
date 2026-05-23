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

