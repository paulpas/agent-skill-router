---
name: async-runtime
description: Implements and analyzes Rust async runtime patterns including tokio,
  async-std, and custom executors for high-performance concurrent systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  triggers: rust async, tokio, async-std, futures, executor, concurrency, non-blocking
    io, async runtime
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - diagrams
  related-skills: programming/concurrency-patterns, programming/error-handling
------

# Rust Async Runtime Patterns

Guides the implementation, selection, and optimization of async runtimes in Rust, focusing on executor architecture, task scheduling, and I/O multiplexing. This skill enables the model to design high-performance concurrent systems using `tokio`, `async-std`, or custom executors while adhering to Rust's zero-cost abstraction principles.

## TL;DR Checklist

- [ ] Select runtime based on workload (tokio for I/O bound, async-std for stdlib alignment, custom for embedded)
- [ ] Isolate blocking operations using `spawn_blocking` or `tokio::task::spawn_blocking`
- [ ] Implement explicit cancellation via `JoinHandle::abort()` and `select!` macros
- [ ] Verify executor thread count matches CPU cores for mixed workloads
- [ ] Profile async task scheduling latency with `tracing` and runtime metrics

