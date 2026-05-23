---
name: auth-credentials
description: Implements agent authentication, credential management, capability-based
  access control, JWT identity verification, and human-in-the-loop authorization gates
  for production-safe AI agent systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: agent auth, credential management, JWT identity, capability-based access
    control, tool authorization, secret rotation, human approval gate, agent authentication,
    scoped credentials, JIT provisioning, inter-agent auth
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
  scope: infrastructure
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: ai-agent-safety, multi-agent-patterns, framework-orchestration-routing,
    agent-reliability-engineering
------

# Agent Authentication & Credential Manager

Implements authentication, credential management, and authorization patterns that protect agent systems from credential leaks, unauthorized tool use, and privilege escalation. When loaded, this skill makes the model design secure identity and access layers for AI agents operating in production environments.

## TL;DR Checklist

- [ ] Use scoped credential providers — never expose raw API keys to agents
- [ ] Implement JIT (just-in-time) credential provisioning with short TTLs
- [ ] Enforce capability-based access control (CBAC) on every tool call
- [ ] Generate JWT agent identities for inter-agent communication
- [ ] Place human-in-the-loop approval gates on high-risk operations
- [ ] Log all auth events with agent_id, action, and outcome to a structured audit log

