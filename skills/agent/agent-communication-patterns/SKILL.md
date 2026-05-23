---
name: agent-communication-patterns
description: Implements inter-agent communication patterns (message passing, event-driven
  coordination, shared memory protocols, RPC-style calls, structured JSON messaging)
  for reliable multi-agent systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: agent communication, message passing, event driven, shared memory, rpc
    calls, multi agent coordination, inter agent messaging, message queue agents,
    structured messaging, agent to agent communication, agent messaging protocol
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
  - do-dont
  - examples
  related-skills: ai-agent-safety,multi-agent-patterns,task-decomposition-engine
------

# Agent Communication Patterns

Implements reliable inter-agent communication mechanisms for multi-agent systems. This skill makes the model design and build message passing, event-driven coordination, shared-memory state exchange, and RPC-style request-response protocols that enable agents to coordinate without tight coupling, race conditions, or silent data corruption.

Inter-agent communication is the connective tissue of any multi-agent system — it determines whether agents collaborate productively or produce cascading failures through mismatched expectations, lost messages, and unhandled error states. Every communication pattern carries trade-offs in latency, consistency, fault tolerance, and implementation complexity that must be matched to the agent's operational requirements.

## TL;DR Checklist

- [ ] Define a JSON message schema with required fields and types before writing any agent logic
- [ ] Choose communication pattern (message passing, event-driven, shared memory, RPC) based on latency and consistency needs
- [ ] Implement typed message/event classes — never use raw dicts for inter-agent data exchange
- [ ] Add timeouts, retries, and error propagation to all synchronous communication paths
- [ ] Version all message schemas; reject unknown fields with explicit validation errors
- [ ] Log every sent and received message with correlation IDs for full traceability

