---
name: orchestration-frameworks
description: Designs and implements orchestration frameworks for multi-agent systems
  including LangGraph, AutoGen, CrewAI, Temporal, and Prefect with workflow patterns,
  state management, and fault tolerance.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: orchestration framework, multi-agent system, agent coordination, workflow
    engine, langgraph, autogen, crewai, temporal, task orchestration, agent routing
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - diagrams
  related-skills: task-decomposition-engine, parallel-skill-runner, confidence-based-selector
------

# Orchestration Framework Engineering

Architects and implements orchestration frameworks that coordinate multi-agent systems, manage workflow state, and handle fault tolerance. You design the control plane that determines how agents delegate tasks, share context, and recover from failures.

## TL;DR Checklist

- [ ] Map agent capabilities to available tools before selecting an orchestration pattern
- [ ] Design explicit state machine for multi-step workflows — never rely on implicit ordering
- [ ] Implement circuit breaker pattern for all inter-agent communication paths
- [ ] Define fallback routing for every branching point with at least one alternative path
- [ ] Select framework based on workload type: synchronous (LangGraph) vs asynchronous (Temporal) vs collaborative (CrewAI)
- [ ] Instrument every step with structured logging, trace IDs, and latency metrics
- [ ] Test failure injection before deploying to production

