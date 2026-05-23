---
name: performance-optimization
description: Identifies and eliminates performance bottlenecks through systematic
  profiling (cProfile, py-spy, memory_profiler), Big-O complexity analysis, algorithmic
  optimization, and benchmark-driven validation to reduce latency and resource usage.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: performance optimization, code profiling, bottleneck analysis, cProfile,
    py-spy, Big O complexity, memory leak detection, slow code, latency reduction,
    how do i make my code faster, benchmarking, time complexity, p95 latency
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
  related-skills: framework-performance-tuning, performance-testing, systematic-debugging,
    memoization-cache-patterns
------

# Performance Optimization Framework

Identifies and eliminates performance bottlenecks through systematic profiling, Big-O complexity analysis, algorithmic optimization techniques, and benchmark-driven validation. When loaded, this skill makes the model act as a senior performance engineer — measuring before optimizing, isolating hot paths with CPU and memory profilers, analyzing algorithmic complexity, applying targeted optimizations, and proving improvement with controlled benchmarks. This skill applies the 5 Laws of Elegant Defense: validate inputs before processing, make illegal states unrepresentable, fail fast with descriptive errors, return new data structures where applicable, and guide data naturally through optimization pipelines.

## TL;DR Checklist

- [ ] Measure current performance baseline — record p50/p95/p99 latencies, CPU usage, memory footprint before touching any code
- [ ] Profile the actual hot path with cProfile (CPU) and memory_profiler (memory), not guesswork
- [ ] Identify top 1–3 bottlenecks consuming >80% of execution time using profiler output sorted by cumulative time
- [ ] Analyze Big-O complexity per function — identify functions that scale worse than O(n log n) in tight loops
- [ ] Apply the least invasive optimization first (O(n) → O(log n) before rewriting to C extensions)
- [ ] Benchmark the optimized code against the baseline under identical load conditions
- [ ] Verify no regression in correctness — run all existing tests after each optimization

