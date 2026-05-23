---
name: ai-agent-safety
description: Implements guardrails, safety checks, hallucination detection, prompt
  injection defense, and output validation for autonomous AI agents to prevent misuse,
  unauthorized actions, and unreliable behavior.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: ai agent safety, hallucination detection, prompt injection, output validation,
    tool call safety, guardrails, autonomous agent safety, AI safety
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
  related-skills: agent-context-management,self-critique-engine,risk-value-at-risk
------

# AI Agent Safety & Guardrails

Implements guardrails, safety checks, hallucination detection, prompt injection defense, and output validation for autonomous AI agents — ensuring every tool call, generated response, and decision path is verified against defined constraints before execution to prevent misuse, unauthorized actions, and unreliable behavior.

## TL;DR Checklist

- [ ] Validate all inputs through a prompt injection detector before passing to the agent core
- [ ] Enforce scoped tool permissions using a least-privilege access control policy
- [ ] Cross-reference every factual claim against at least one trusted source before emitting
- [ ] Wrap autonomous action chains in circuit breaker logic with safety metric tracking
- [ ] Sanitize all outputs through an output validator that checks for leakage and formatting
- [ ] Log every guardrail decision (pass/fail, reason, confidence) for auditability

