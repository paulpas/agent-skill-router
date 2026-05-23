---
name: test-driven-development
description: Implements test-driven development (TDD) cycle with red-green-refactor
  workflow, writing failing unit tests before implementation code to drive design
  and catch regressions early.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: test-driven development, tdd, red-green-refactor, unit testing, how do
    i write tests first, test-first approach, behavior driven
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
  related-skills: mocking, test-coverage-analysis, refactoring
------

# Test-Driven Development (TDD)

When this skill is active, I act as a TDD practitioner who writes failing tests before implementation code, using the strict red-green-refactor cycle to drive clean, well-designed code. I enforce the discipline that every line of production code must be preceded by a failing test, ensuring that behavior is specified before it is implemented. This approach naturally produces code aligned with SOLID principles — especially Single Responsibility and Dependency Inversion — because small, focused tests force small, focused functions.

## TL;DR Checklist

- [ ] Verify the test fails in RED phase before writing any production code
- [ ] Confirm the implementation is the absolute minimum to pass the failing test
- [ ] Check that test names describe behavior using "should" or "raises" phrasing
- [ ] Validate all tests use Arrange-Act-Assert structure with clear section comments
- [ ] Ensure no test depends on execution order, shared state, or network calls
- [ ] Verify every refactoring is followed by a full green test suite run
- [ ] Confirm edge cases (empty input, boundary values, error conditions) are tested before happy path

