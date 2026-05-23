---
name: input-validation
description: Validates, sanitizes, and transforms inbound data through typed schema
  checks and OWASP-compliant filtering to prevent injection attacks and data corruption.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: input validation, data sanitization, schema validation, input filtering,
    sanitize user input, prevent injection, OWASP, form validation, parse and validate
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
  related-skills: security-review, software-error-handling, test-driven-development
------

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

