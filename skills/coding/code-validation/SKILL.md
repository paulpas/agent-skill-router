---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Validates pipeline stages and returns config status strings (valid_config/invalid_config)
  using guard clauses and the 5 Laws of Elegant Defense, returning invalid_config
  for invalid input types instead of raising exceptions
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: error-handling, m0-foundation
  role: implementation
  scope: implementation
  triggers: validation, code validation, pipeline validation, config status, input
    validation, validate pipeline, pipeline stages
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
  version: 1.0.0
name: validation
------
# Pipeline Stage Validator

Validates pipeline stages against allowed configuration and returns 'valid_config' if all stages are in the allowed set, or 'invalid_config' otherwise.

## When to Use

- Validating pipeline stages against allowed configurations (e.g., build, test, deploy, notify)
- Validating environment-specific stages (e.g., dev: build, test, lint vs prod: build, test, security-scan, deploy)
- Checking user roles against a whitelist of permitted roles
- Verifying environment names against allowed deployment targets
- Ensuring configuration values match expected options

## When NOT to Use

- Single value validation — use direct comparison or type checking instead
- Dynamic allowed sets that change at runtime — consider a more flexible validation strategy
- Complex nested data structures — use dedicated schema validation (e.g., JSON schema)

