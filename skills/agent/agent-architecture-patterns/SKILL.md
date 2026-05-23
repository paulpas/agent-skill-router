---
name: agent-architecture-patterns
description: Implements structural design patterns for AI agent systems including
  monolithic, multi-agent, hierarchical, and event-driven architectures with state
  management and security primitives.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: agent architecture, multi-agent system, design patterns, pub-sub messaging,
    circuit breakers, state management, event-driven architecture, service discovery,
    fault tolerance
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
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
  - config
  - examples
  - do-dont
  related-skills: agent-context-management, workflow-patterns, dispatching-parallel-agents,
    hierarchical-agent-memory
------

# Agent Architecture Patterns

Implements structural design patterns for building robust, scalable AI agent systems. This skill guides the model in selecting and applying the right architecture pattern based on complexity, communication needs, and fault tolerance requirements of the agent system.

Agent architecture is not a single choice — it is a layered decision spanning system topology (monolithic vs distributed), communication protocols (request-reply, pub-sub, event streaming), state management strategies, lifecycle management, and security primitives that together determine whether an agent system scales gracefully or collapses under load.

## TL;DR Checklist

- [ ] Choose architecture topology based on task complexity and isolation requirements
- [ ] Implement message routing with explicit handler registration for each agent type
- [ ] Set up state manager with serialization before any cross-agent state access
- [ ] Register lifecycle hooks (startup, shutdown, recovery) in correct priority order
- [ ] Configure circuit breakers with domain-specific thresholds per external dependency
- [ ] Validate security: authentication at entry points, authorization at action boundaries

