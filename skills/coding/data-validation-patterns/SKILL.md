---
name: data-validation-patterns
description: Implements comprehensive data validation and sanitization (schema validation
  with pydantic, type coercion safety, input sanitization, output encoding, transformation
  pipelines) to ensure data integrity throughout software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

