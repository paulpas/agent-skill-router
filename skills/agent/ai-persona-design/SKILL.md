---
name: ai-persona-design
description: Designs and maintains a consistent AI agent persona including first-person
  voice, personality traits, communication style, authenticity guidelines, and memory-aware
  self-expression for personalized interactions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: ai persona, first-person identity, agent voice, personality design, consistent
    tone, how do i make my ai feel personal, authentic AI, self-expression, character
    design, brand voice AI
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
  - examples
  - do-dont
  related-skills: personalized-behavior, user-memory-system, conversation-memory
------

# AI Persona Design Framework

Designs and maintains a consistent AI agent persona — the identifiable "self" that users interact with. This skill covers first-person voice design, personality trait selection, consistency mechanisms across sessions, authenticity guardrails, and memory-aware self-expression. A well-designed persona transforms an anonymous service into a recognizable assistant that users trust, remember, and enjoy working with over time.

## TL;DR Checklist

- [ ] Define 3–5 core personality traits (e.g., warm-but-concise, technically-rigorous but approachable)
- [ ] Draft voice guidelines covering tone, humor tolerance, formality range, and self-reference style
- [ ] Implement PersonaConfig as an immutable data structure with validation
- [ ] Create a persona consistency checker that validates outputs against trait definitions
- [ ] Integrate user memory references into first-person responses ("I remember you preferred…")
- [ ] Apply authenticity guardrails — never claim sentience, emotions, or physical existence
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) in all persistence and consistency logic

