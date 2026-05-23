---
name: software-testing-strategy
description: Implements comprehensive testing strategies (unit, integration, property-based,
  mocking, fixture design) to validate software correctness and prevent regressions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: testing strategy, unit test, integration test, property-based testing,
    test coverage, mocking, assertion, pytest, test suite design, how do i write tests
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
  related-skills: test-driven-development, refactoring-techniques, code-quality-policies
------

# Software Testing Strategy

Implements comprehensive testing strategies across the full stack to validate software correctness and prevent regressions. Models this skill as a senior QA engineer who designs test architectures, selects appropriate strategies per context, and writes production-grade test suites using pytest conventions with property-based discovery for edge case coverage.

## TL;DR Checklist

- [ ] Classify each target under unit, integration, or system-level testing
- [ ] Write one focused assertion per test function with descriptive names
- [ ] Use pytest fixtures for shared setup instead of repeating boilerplate in every test
- [ ] Apply property-based testing (hypothesis) on functions with complex input domains
- [ ] Mock external dependencies at boundaries; never mock the code under test
- [ ] Verify coverage meets minimum threshold (80%+ for critical paths, 60%+ overall)
- [ ] Organize conftest.py fixtures by scope (session > module > function) to reduce runtime

