---
name: system-hints-design
description: Constructs layered system hints for agent architectures — identity, context,
  constraint, and behavioral hint layers — with provider-specific patterns for Anthropic,
  OpenAI, and Google Gemini.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: system hints, system prompt design, agent behavior control, context layering,
    hint architecture, how do i design better system prompts, tool-use hints, multi-agent
    hints
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
  - do-dont
  related-skills: hint-based-prompting, instruction-engineering, ai-agent-safety,
    agent-context-management
------

# System Hints Design for AI Agents

Constructs layered system hints that serve as the primary behavioral control surface in multi-turn, tool-using agent architectures. The model designs hint systems organized into four structural layers — identity, context, constraint, and behavioral hint — with provider-specific implementations for Anthropic's system prompt parameter, OpenAI's messages array convention, and Google Gemini's system_instruction field.

## TL;DR Checklist

- [ ] Structure every system message across four layers: identity → context → constraint → hints
- [ ] Place hard constraints before behavioral hints so the model parses them first
- [ ] Use provider-native parameters (Anthropic `system`, OpenAI `role=system`, Gemini `system_instruction`) — never pass them in user messages
- [ ] Embed tool-use guidance as preference hints, not exhaustive tool catalogs
- [ ] Apply safety through contextual hints (assume PII, require disclaimers) alongside explicit guardrails
- [ ] Resolve hint/instruction conflicts by ensuring behavioral hints reinforce, never contradict, role definitions
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) when designing constraint layers — parse at boundaries, fail fast on invalid state, guide data naturally

