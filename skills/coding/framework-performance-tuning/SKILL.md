---
name: framework-performance-tuning
description: Optimizes framework runtime performance through profiling-driven bottleneck
  analysis, caching strategies, connection pooling, async concurrency patterns, and
  memory management to reduce latency and increase throughput in production applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework performance, performance tuning, optimize framework, profiling
    application, connection pooling, caching strategy, async optimization, memory
    management, reduce latency, increase throughput, framework benchmarking, slow
    endpoint
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
  related-skills: framework-utilization, framework-selection, observability-patterns
------

# Framework Performance Tuner

Optimizes framework runtime performance through profiling-driven bottleneck analysis, caching strategies, connection pooling, async concurrency patterns, and memory management. The model acts as a senior performance engineer, producing actionable optimization plans backed by measured benchmarks rather than guesswork. This skill applies the 5 Laws of Elegant Defense: validate inputs before processing, make illegal states unrepresentable, fail fast with descriptive errors, return new data structures, and guide data naturally through the optimization pipeline.

## TL;DR Checklist

- [ ] Profile first — never optimize without baseline measurements from real traffic or realistic load
- [ ] Identify the single slowest endpoint or query before applying any optimization
- [ ] Add caching at the correct layer (response, query, fragment) and set appropriate TTLs
- [ ] Configure connection pools with `min`/`max` settings matched to your concurrency profile
- [ ] Convert synchronous I/O-bound code to async where the framework supports it
- [ ] Set memory limits and implement heap profiling for long-running processes
- [ ] Benchmark before and after every change — document the delta

