---
name: software-error-handling
description: Implements structured error handling (custom exception hierarchies, retry
  with backoff, circuit breaker, graceful degradation) for resilient, diagnosable,
  and recoverable software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: error handling, exception design, retry logic, circuit breaker, graceful
    degradation, error recovery, resilience patterns, how do i handle errors in software
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
  related-skills: software-engineering-principles, refactoring-techniques, software-testing-strategy,
    observability-patterns
------

# Error Handling & Resilience Patterns

Implements systematic, production-grade error handling that distinguishes between recoverable and unrecoverable failures, provides actionable error messages, and implements resilience patterns (retry with backoff, circuit breaker, fallback) to keep systems functional under adverse conditions. Grounded in SOLID principles — particularly the Open/Closed Principle for extensibility and the Single Responsibility Principle so error handling code is isolated from business logic.

## TL;DR Checklist

- [ ] Define a custom exception hierarchy rooted at `ApplicationError` with domain-specific subclasses
- [ ] Tag every exception as recoverable or unrecoverable using metadata (not bare exceptions)
- [ ] Implement retry with exponential backoff and jitter — never fixed intervals
- [ ] Deploy a circuit breaker before every external dependency call (API, database, file I/O)
- [ ] Provide graceful degradation / fallback for every critical path, even if degraded output
- [ ] Attach structured context (correlation ID, operation, payload hash) to every error log
- [ ] Never swallow exceptions — at minimum, log and wrap them in a domain exception

