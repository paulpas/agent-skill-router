---
name: ddd-command-pattern
description: Implements DDD command pattern — command definitions, typed command handlers,
  command bus routing, use case orchestration with validation, and Unit of Work transaction
  coordination within bounded contexts.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: command pattern, ddd command handler, command bus, how do i implement
    commands, use case orchestration, command validation, cqrs command side, write
    model handlers, transaction coordination
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
  related-skills: domain-driven-design, ddd-tactical-patterns, cqrs-pattern, event-sourcing-pattern
------

# DDD Command Pattern

Implements the Command pattern within DDD bounded contexts — command definitions as immutable value objects, typed command handlers with validation and orchestration, a lightweight command bus for routing, and Unit of Work transaction coordination. This skill focuses on write operations within bounded contexts where commands mutate domain state through aggregate roots. Use this skill when building use case handlers that coordinate between user input, domain logic, and persistence within a single bounded context.

This skill complements `domain-driven-design` (core DDD tactical patterns), `ddd-tactical-patterns` (Specification Pattern, Domain Services, Aggregate Factories), and `cqrs-pattern` (full CQRS with separate read models). Use this skill specifically for command-side implementation: defining commands, building handlers, routing through a command bus, and coordinating transactions.

## TL;DR Checklist

- [ ] Define Commands as immutable dataclasses (not domain events) describing INTENDED actions — each command maps to one use case
- [ ] Create typed CommandHandler classes that validate input, invoke aggregate methods, and persist changes through repository interfaces
- [ ] Implement a lightweight CommandBus that routes commands to the correct handler by inspecting command type
- [ ] Validate command input before invoking domain logic — fail fast with descriptive errors from application layer, not domain exceptions
- [ ] Use Unit of Work to coordinate transactions across multiple repositories within a single command handler
- [ ] Publish domain events AFTER state mutation inside aggregate methods; let the handler persist them through the UoW

