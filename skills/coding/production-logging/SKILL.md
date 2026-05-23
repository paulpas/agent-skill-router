---
name: production-logging
description: Implements production logging practices including structured logging,
  log level management, context propagation, correlation IDs, sensitive data redaction,
  and log aggregation patterns for actionable observability in software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: production logging, structured logging, correlation ID, context propagation,
    log aggregation, how do i add logging to my app, sensitive data redaction, json
    logging
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
  related-skills: observability-patterns, software-error-handling, engineering-principles
------

# Production Logging Patterns

Implements production-grade logging practices to make systems debuggable and observable. This skill covers structured JSON logging, context propagation with correlation IDs, sensitive data redaction, tiered log level strategies, and log aggregation patterns — ensuring every log entry carries the right information at the right severity for real-time monitoring and post-incident debugging.

## TL;DR Checklist

- [ ] Configure structured JSON logger via `logging.config.dictConfig` with consistent field schema
- [ ] Inject correlation ID into every log call using a context or thread-local mechanism
- [ ] Route sensitive fields (passwords, tokens, PII) through a redaction filter before output
- [ ] Set DEBUG level per-component in production; reserve full DEBUG for local/dev environments
- [ ] Ensure every exception log includes traceback, correlation ID, and contextual state
- [ ] Verify log output is valid JSON parseable by aggregation tools (Fluentd, Datadog, ELK)

