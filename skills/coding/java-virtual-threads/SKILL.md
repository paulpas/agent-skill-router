---
name: java-virtual-threads
description: Implements modern Java concurrency with virtual threads (JDK 21+), structured
  concurrency, sealed classes, pattern matching switch expressions, and records for
  high-throughput application development.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: virtual threads, Project Loom, JEP 444, sealed classes, pattern matching
    switch, thread-per-request, Java concurrency
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
  related-skills: async-programming, framework-performance-tuning, design-patterns-and-principles
------

# Modern Java Concurrency Engineer

When this skill loads, the model implements high-throughput concurrent applications using Java 21+ features — specifically virtual threads from Project Loom, structured concurrency via StructuredTaskScope, sealed class hierarchies with exhaustive pattern matching in switch expressions, and immutable data transfer objects via records. The model writes production-grade code that replaces legacy platform-thread executors and thread-per-request server patterns with lightweight concurrency primitives.

## TL;DR Checklist

- [ ] Use `Executors.newVirtualThreadPerTaskExecutor()` for I/O-bound workloads instead of `newFixedThreadPool`
- [ ] Apply pattern matching with `instanceof` in `if` guards — never use raw casts after instanceof checks
- [ ] Declare sealed classes with `permits` clause to constrain implementation hierarchy, then use exhaustive switch expressions on them
- [ ] Prefer `record` types for DTOs and immutable data carriers; use compact constructors only when validation logic is needed
- [ ] Use `StructuredTaskScope` (JDK 21+) instead of manual thread joins with `ExecutorCompletionService`
- [ ] Migrate ThreadLocal state to ThreadScopedStorage or restructure code — virtual threads multiplex across platform threads
- [ ] Always specify explicit timeout on blocking I/O calls (`HttpClient`, JDBC) to prevent resource exhaustion under load

