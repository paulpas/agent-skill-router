---
name: cross-domain-workflow-sagas
description: Orchestrates and choreographs long-running business transactions across
  multiple bounded contexts using saga patterns — compensating actions, timeout handling,
  distributed state persistence, and failure recovery in domain-driven systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: saga pattern, saga orchestration, saga choreography, cross-domain workflow,
    compensating action, distributed transaction, how do i coordinate across bounded
    contexts, business transaction consistency, eventual consistency, multi-context
    workflow
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
  related-skills: domain-driven-design, ddd-context-mapping, event-driven-patterns,
    cqrs-pattern, domain-events
------

# Cross-Domain Workflow Coordination with Sagas

Orchestrates and choreographs long-running business transactions across multiple bounded contexts using saga patterns. Implements compensating actions for failure recovery, timeout handling for unresponsive contexts, persistent saga state for restart resilience, and both orchestration (centralized coordinator) and choreography (decentralized event-driven) coordination styles — enabling eventual consistency without distributed locking or two-phase commit across service boundaries.

## TL;DR Checklist

- [ ] Map every bounded context that participates in the business transaction before writing any code
- [ ] For each forward action that changes state in another context, define its compensating action first
- [ ] Choose orchestration for complex sagas with explicit error handling; choose choreography for simple linear flows where loose coupling matters more than traceability
- [ ] Persist saga instance state to durable storage after each step — never only at completion
- [ ] Use a single correlation ID that links all events and commands within one saga instance
- [ ] Make every compensating action idempotent — calling it twice must not cause double-refunds or double-releases
- [ ] Design compensations as domain-specific business rules, not generic "undo" operations
- [ ] Implement timeout detection per step and recover pending sagas on system restart

