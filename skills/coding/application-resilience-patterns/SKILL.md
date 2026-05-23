---
name: application-resilience-patterns
description: Implements application-layer resilience patterns including exponential
  backoff with jitter, circuit breakers, timeout management, fallback mechanisms,
  and rate limiters for handling external service failures gracefully.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: application resilience, retry with backoff, circuit breaker pattern, timeout
    management, fallback mechanism, rate limiter, token bucket, graceful degradation,
    external service failure, how do i handle API failures, idempotency keys
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
  - config
  - do-dont
  related-skills: microservice-resilience-patterns, systematic-debugging, distributed-systems-architecture
------

# Application Resilience Patterns

Implements application-layer resilience patterns for handling external service failures gracefully — ensuring your application remains functional when downstream dependencies degrade or fail.

## TL;DR Checklist

- [ ] Implement exponential backoff with random jitter for all retry logic
- [ ] Deploy circuit breakers around every external API call with configurable thresholds
- [ ] Set per-call timeouts and propagate deadlines through the request chain
- [ ] Define fallback responses (cached data, defaults, cached partial results) for critical paths
- [ ] Apply rate limiting with token bucket or sliding window algorithms
- [ ] Use idempotency keys for all retried operations on external APIs

