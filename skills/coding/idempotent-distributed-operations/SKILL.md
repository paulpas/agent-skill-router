---
name: idempotent-distributed-operations
description: Implements idempotency patterns for distributed microservice systems
  including idempotency keys, request deduplication, optimistic concurrency control,
  and idempotent handlers to ensure exactly-once semantics in event-driven architectures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: idempotency, idempotent, idempotency key, request deduplication, exactly
    once, duplicate detection, optimistic concurrency, idempotent handler, outbox
    pattern, race condition prevention
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
  related-skills: microservice-resilience-patterns, microservices-architecture, event-driven-patterns,
    database-design-modeling
------

# Idempotent Distributed Operations

Implements idempotency guarantees across distributed microservice systems by combining request-level deduplication via idempotency keys, optimistic concurrency control with version vectors, idempotent event consumers, and database-level unique constraints — ensuring that repeated execution of the same operation never produces side effects beyond the first application.

## TL;DR Checklist

- [ ] Assign a stable `idempotency_key` (UUIDv7 or ULID) to every external request before processing
- [ ] Store idempotency keys in a database with a unique constraint and check before executing business logic
- [ ] Add an `updated_at` version column to mutable tables and validate it matches the expected value on write
- [ ] Wrap event consumers in a try/except that handles duplicate detection without retrying already-successful operations
- [ ] Enforce UNIQUE constraints at the database level for natural deduplication (e.g., composite unique on resource_id + operation_type)

