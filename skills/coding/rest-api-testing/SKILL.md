---
name: rest-api-testing
description: Tests REST API endpoints comprehensively including unit tests, integration
  tests, contract validation against OpenAPI spec, idempotency checks, error-path
  coverage, pagination boundary conditions, and load testing with Locust.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: rest api testing, contract testing, openapi spec validation, pytest fastapi,
    http method testing, idempotency test, locust load test, api integration test,
    swagger schema validation, 304 not modified test, rest endpoint test
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
  related-skills: fastapi-patterns, rest-api-patterns, test-driven-development, code-validation,
    api-security-patterns
------

# REST API Testing

Tests REST API endpoints comprehensively across unit, integration, contract, idempotency, error-path, pagination boundary, and load testing dimensions. Produces a pytest-based test suite that validates observable behavior — status codes, response shapes, side effects, and schema compliance — against the OpenAPI specification.

## TL;DR Checklist

- [ ] Every endpoint has tests for success (20x) AND all documented error paths (4xx, 5xx)
- [ ] Error responses conform to RFC 7807 Problem Details format (`type`, `title`, `status` present)
- [ ] PUT and DELETE endpoints are verified idempotent; POST is explicitly tested as non-idempotent
- [ ] OpenAPI schema validation runs in CI at least once per pipeline
- [ ] Pagination tested with empty collection, single item, last page, and cursor-after-last conditions
- [ ] Cacheable endpoints include `Cache-Control` and `ETag` header assertions
- [ ] Auth paths covered: missing token (401), invalid token, expired token, insufficient permissions (403)
- [ ] Load test validates API behavior at 80% of expected peak RPS

