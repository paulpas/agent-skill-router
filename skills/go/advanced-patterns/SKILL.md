---
name: advanced-patterns
description: Applies advanced Go patterns including generics, reflection, functional
  options, and metaprogramming for performance-critical and framework-level code.
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
  triggers: go generics, go reflection, go unsafe, go functional options, go option
    pattern, go compile time, go metaprogramming
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, modular-design, concurrency-patterns, database-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Advanced Go Patterns

Senior Go engineer applying advanced language features for framework-level and performance-critical code. This skill covers generics, reflection, functional options, compile-time assertions, and safe metaprogramming.

## TL;DR Checklist

- [ ] Use generics for type-safe collections and algorithms — prefer over interfaces when possible
- [ ] Use the functional options pattern for constructors with many optional parameters
- [ ] Use `go:embed` for compile-time asset inclusion — never hardcode file paths
- [ ] Use `type _ interface{}` compile-time assertions to verify interface satisfaction
- [ ] Avoid reflection unless necessary — it bypasses the type system and is slow
- [ ] Never use `unsafe` unless you fully understand the memory layout and aliasing rules

