---
name: error-handling
description: Designs robust error handling in Go with custom error types, error wrapping,
  retry patterns, and failure recovery strategies for resilient applications.
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
  triggers: go error handling, go custom errors, go error wrapping, go retry, go sentinel
    errors, go error categories
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, concurrency-patterns, cloud-development
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Error Handling

Senior engineer designing robust error handling in Go with custom error types, error wrapping, retry patterns, and failure recovery. This skill covers creating meaningful error hierarchies and implementing resilience patterns.

## TL;DR Checklist

- [ ] Return errors explicitly — never ignore returned errors
- [ ] Wrap errors with context using `fmt.Errorf("...: %w", err)`
- [ ] Define sentinel errors for expected conditions using `var ErrX = errors.New("...")`
- [ ] Use `errors.Is()` and `errors.As()` for error inspection — never string comparison
- [ ] Implement retry with exponential backoff for transient failures
- [ ] Distinguish transient errors (retry) from permanent errors (fail fast)

