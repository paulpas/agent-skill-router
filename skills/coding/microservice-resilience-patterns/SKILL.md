---
name: microservice-resilience-patterns
description: Implements production-ready resilience patterns (circuit breaker, retry
  with exponential backoff, bulkhead isolation, timeout enforcement, graceful fallback)
  to prevent cascading failures in distributed microservice systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: circuit breaker, retry pattern, bulkhead pattern, resilience, fault tolerance,
    timeout handling, graceful degradation, fallback strategy, cascading failure,
    exponential backoff
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
  related-skills: microservices-architecture, idempotent-distributed-operations, observability-patterns,
    event-driven-patterns
------

# Microservice Resilience Patterns

Implements production-ready resilience patterns to prevent cascading failures in distributed microservice systems. When loaded, this skill makes the model design, implement, and validate circuit breakers, retry strategies with jitter, bulkhead isolation, timeout enforcement, and graceful degradation mechanisms — all tailored to the specific failure modes of the target architecture.

## TL;DR Checklist

- [ ] Implement a three-state circuit breaker (Closed → Open → Half-Open) with configurable thresholds
- [ ] Add retry logic with exponential backoff and jitter using `random.uniform` for avalanche prevention
- [ ] Isolate critical paths via bulkhead pools — separate thread/executor per downstream dependency
- [ ] Enforce hard timeouts on all inter-service calls; never use infinite waits
- [ ] Provide meaningful fallback responses that degrade gracefully, not silently fail

