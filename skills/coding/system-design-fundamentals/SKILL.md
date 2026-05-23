---
name: system-design-fundamentals
description: Implements production system design patterns including capacity planning,
  multi-tier caching strategies, load balancing algorithms, rate limiting, CDN placement
  decisions, database sharding strategies, and circuit breaker implementations for
  scalable distributed applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: system design, capacity planning, cache strategy, load balancing, rate
    limiting, CDN placement, database sharding, circuit breaker, how do i design a
    scalable system, request estimation, traffic scaling, horizontal scaling
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
  related-skills: microservices-architecture, distributed-systems-architecture, event-driven-patterns
------

# System Design Fundamentals

Designs scalable production systems by applying proven patterns for capacity estimation, multi-tier caching, load balancing, request rate limiting, CDN strategy, database scaling, and failure isolation. When loaded, the model acts as a senior systems architect who translates requirements into concrete architectural decisions backed by numerical estimates, code patterns, and operational considerations.

## TL;DR Checklist

- [ ] Calculate requests-per-second capacity before choosing any infrastructure component
- [ ] Implement multi-tier caching (client → edge → app → database) with explicit invalidation strategies
- [ ] Choose load balancing algorithm based on session affinity and backend heterogeneity
- [ ] Add rate limiting at API gateway layer using token bucket or sliding window counters
- [ ] Place static assets behind CDN; cache dynamic content at edge for repeatable requests
- [ ] Shard databases by natural partition key; use consistent hashing for rebalance safety
- [ ] Deploy circuit breakers on every inter-service call with configurable thresholds

