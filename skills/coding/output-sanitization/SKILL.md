---
name: output-sanitization
description: Escapes, encodes, and sanitizes outbound data for safe rendering in HTML,
  SQL, CSV, URLs, shell commands, logs, and email to prevent injection attacks and
  data corruption.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: output sanitization, html escaping, sql escaping, csv quoting, url encoding,
    shell argument escaping, log sanitization, xss prevention, output encoding, context-specific
    escaping
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
  related-skills: input-validation, security-review, software-error-handling
------

# Output Sanitization Engineer

Escapes, encodes, and sanitizes outbound data for safe rendering in context-specific output channels. Every piece of data leaving your application — whether rendered as HTML in a browser, formatted into a SQL query string, written to a CSV file, encoded in a URL, or logged to stdout — must be transformed according to the security rules of its target context. Treat every external value that reaches your presentation layer as potentially dangerous and apply context-appropriate escaping before rendering. Follow OWASP's Context-Specific Output Encoding guidelines to prevent XSS, SQL injection through output paths, CSV injection, and command injection via shell-unsafe string construction.

## TL;DR Checklist

- [ ] Identify the exact rendering context (HTML body, HTML attribute, JavaScript, CSS, URL, CSV field, SQL query, shell command, log line, email body) before escaping
- [ ] Use a battle-tested library for your context — never roll your own encoder or regex-based sanitizer
- [ ] Apply escaping at the boundary where data crosses from safe internal representation to unsafe external format
- [ ] Never double-escape already-safe values — track which transformations have already been applied
- [ ] Validate output encoding produces expected results with adversarial test payloads for each context
- [ ] Log sanitized output metadata (encoding used, original length, escaped length) at DEBUG level only — never log the raw unsanitized payload

