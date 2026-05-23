---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Async pub/sub event bus with typed events, mixed sync/async dispatch"
  and singleton initialization for trading systems'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: async, event bus, event-bus, events, typed, eventbridge, event routing
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
  version: 1.0.0
name: bus
------
# Skill: coding-event-bus

# Async pub/sub event bus with typed events, mixed sync/async dispatch, and singleton initialization for trading systems

## Role / Purpose

This skill covers the canonical pattern for building an internal event bus in a trading system. It handles typed event dispatch, separates sync and async handler registries, and enforces a module-level singleton so the bus is initialized once and accessed safely throughout the application.

