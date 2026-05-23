---
name: testing-unit-integration-e2e
description: Implements comprehensive testing strategies (unit, integration, contract,
  and end-to-end) with appropriate test doubles, isolation levels, and coverage thresholds
  for reliable software delivery.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: unit testing, integration testing, contract testing, end-to-end testing,
    e2e, test doubles, test isolation, smoke tests
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
  related-skills: testing-tdd, testing-mocking-stubs, code-review, testing-static-analysis
------

# Comprehensive Testing Strategies

Architects and writes layered test suites that isolate concerns, validate system boundaries, and prevent regressions across unit, integration, contract, and end-to-end layers. This skill enforces the test pyramid: many fast, narrow unit tests, fewer integration tests, and minimal end-to-end tests that cover user journeys.

## TL;DR Checklist

- [ ] Isolate unit tests from external dependencies (network, filesystem, database) using mocks or fakes
- [ ] Name unit tests using behavior: `test_user_login_fails_with_invalid_credentials`
- [ ] Use in-memory databases or test containers for integration tests — never the production database
- [ ] Write contract tests that validate service boundaries independently of implementation
- [ ] Restrict end-to-end tests to happy paths and critical failure scenarios only
- [ ] Configure CI coverage thresholds (e.g., 80% line coverage) and enforce as a quality gate
- [ ] Never use `sleep()` or arbitrary delays — use explicit waits, retries, or event polling

