---
name: memoization-cache-patterns
description: Implements application-level caching and memoization patterns (LRU/LFU
  caches, TTL strategies, cache invalidation, write-through/write-back, stampede prevention)
  for performance optimization in Python systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: memoization, cache pattern, LRU cache, LFU cache, cache invalidation,
    TTL strategy, write-through, cache stampede, function decorator, how do i speed
    up slow functions
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
  related-skills: framework-performance-tuning, software-error-handling, observability-patterns,
    pydantic-models
------

# Memoization & Cache Patterns

Implements production-grade caching and memoization strategies to eliminate redundant computation and I/O. When active, this skill makes the model design cache layers with correct invalidation semantics, choose between in-memory and distributed caches based on access patterns, prevent stampedes with mutex-based serialization, and implement write-through or write-back strategies that match consistency requirements. Grounded in SOLID principles — the Open/Closed Principle ensures cache implementations are swappable without changing calling code, and the Single Responsibility Principle isolates caching logic into dedicated layers.

## TL;DR Checklist

- [ ] Choose cache type (memoization vs LRU vs LFU) based on access pattern: uniform = LRU, zipfian = LFU
- [ ] Set TTL with jitter to prevent thundering herd on expiry
- [ ] Implement stampede prevention (singleflight/mutex) for every expensive cached lookup
- [ ] Tag cache keys with version prefixes when data schema changes
- [ ] Instrument hit/miss rate and evict count — optimize only what metrics show is hot
- [ ] Use `functools.lru_cache` for pure function memoization; build custom caches for stateful or distributed needs

