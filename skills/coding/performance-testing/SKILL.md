---
name: performance-testing
description: Measures application throughput, latency percentiles, and resource utilization
  under realistic load to identify bottlenecks before they reach production.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: performance testing, load testing, stress test, p95 latency, bottleneck
    detection, how do i measure system performance, k6, locust
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
  related-skills: coding-code-quality-policies, coding-debugging-profiling
------

# Performance Testing and Load Analysis

Measures application throughput, latency percentiles, and resource utilization under realistic load to identify bottlenecks before they reach production. Builds reproducible test harnesses that model real user behavior and produce actionable metrics including p50/p95/p99 latencies, requests per second (RPS), and error rates.

## TL;DR Checklist

- [ ] Define a clear performance hypothesis with baseline thresholds (e.g., "p99 latency < 200ms at 500 concurrent users")
- [ ] Model traffic patterns after real production metrics — do not use uniform load
- [ ] Collect p50/p95/p99 latencies and throughput, not just averages
- [ ] Profile CPU, memory, and I/O during the test to find bottlenecks
- [ ] Ramp up gradually (ramp-up phase) before holding steady-state load
- [ ] Run soak tests for 4–24 hours to detect memory leaks and connection pool exhaustion

