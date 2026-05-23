---
name: testing-strategies
description: Implements comprehensive testing strategies for Go including unit tests,
  integration tests, benchmarks, table-driven tests, and mock patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go testing, go unit test, go benchmark, go mock, table driven test, go
    integration test, go fuzzing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, modular-design, database-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Testing Strategies

Senior QA engineer implementing comprehensive testing strategies for Go applications. This skill covers table-driven tests, mocking, benchmarks, integration testing, and fuzzing following Go's native testing conventions.

## TL;DR Checklist

- [ ] Every exported function has at least one test case (happy path + error path)
- [ ] Use table-driven tests for functions with multiple input/output combinations
- [ ] Mock interfaces — never mock concrete types
- [ ] Use `t.Parallel()` for independent tests that don't share state
- [ ] Run `go test -race` on all tests to detect data races
- [ ] Separate unit tests (fast, no I/O) from integration tests (slow, with I/O)

