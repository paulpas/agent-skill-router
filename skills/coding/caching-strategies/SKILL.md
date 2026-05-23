---
name: caching-strategies
description: Implements caching strategies (cache-aside, write-through, write-behind,
  multi-tier architecture, stampede prevention) for high-performance data access layers
  with consistency guarantees.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cache stampede, LRU eviction, write-through, TTL-based, cache invalidation,
    multi-tier cache, thundering herd, how do i speed up my app
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
  related-skills: system-design-fundamentals,data-intensive-systems,performance-optimization
------

# Caching Strategy Architect

Designs and implements high-performance caching layers that balance read speed, write consistency, and memory efficiency. The model evaluates access patterns, data volatility, and failure domains to select the right combination of cache patterns — cache-aside for read-heavy workloads, write-through or write-behind for consistency-sensitive paths, multi-tier architectures for latency-critical systems, and stampede prevention for hot-key resilience.

## TL;DR Checklist

- [ ] Profile read/write ratio before choosing a cache pattern
- [ ] Select TTL based on data staleness tolerance, not arbitrary defaults
- [ ] Implement LRU or LFU eviction with bounded memory footprint
- [ ] Add mutex-based locking or probabilistic early expiration to prevent cache stampede
- [ ] Separate L1 (in-process) from L2 (remote) caches by latency tier
- [ ] Define explicit invalidation strategy per data type (TTL vs. event-driven vs. write-through)

