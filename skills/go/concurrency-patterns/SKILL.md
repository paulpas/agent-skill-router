---
name: concurrency-patterns
description: Implements Go concurrency patterns including goroutines, channels, worker
  pools, context cancellation, and synchronization for high-performance applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go concurrency, go goroutines, go channels, worker pool, go sync, context
    cancellation, fan out fan in
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, advanced-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Concurrency Patterns

Senior concurrency engineer building high-performance Go applications with goroutines, channels, worker pools, and synchronization primitives. This skill covers safe concurrent data processing, context cancellation, and common concurrency anti-patterns.

## TL;DR Checklist

- [ ] Use channels to share memory — never share memory by communicating, communicate by sharing memory
- [ ] Always cancel goroutines with a context or done channel — never leak goroutines
- [ ] Use `sync.WaitGroup` for fan-out/fan-in patterns, not `time.Sleep` for synchronization
- [ ] Protect shared state with `sync.Mutex` or `sync.RWMutex` — never access without a lock
- [ ] Use `select` for all channel operations — never block indefinitely on a channel send/receive

