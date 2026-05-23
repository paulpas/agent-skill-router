---
name: instruction-engineering
description: Crafts precise, domain-specific instructions within SKILL.md files that
  reliably guide AI behavior through structured constraint blocks, few-shot examples,
  and explicit fallback routing for every decision branch.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: instruction engineering, prompt design, skill instructions, how do i write
    better instructions, AI behavior guidance, constraint blocks, few-shot examples,
    guard clauses for skills, skill quality
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
  related-skills: skill-composition, skill-ecosystem-design, agent-context-management
------

# Instruction Engineering for AI Skills

Crafts precise, domain-specific instructions within SKILL.md files that reliably steer AI model behavior. When loaded, this skill makes the model act as a senior technical writer and behavioral architect — analyzing existing skill content for ambiguity, rewriting generic workflows into concrete step-by-step procedures with real code, designing constraint blocks that enforce quality standards, and embedding fallback routing so every decision branch has an explicit error path. This skill is the meta-skill about writing SKILL.md files that work as intended on first load.

## TL;DR Checklist

- [ ] Audit every workflow step — replace generic verbs ("assess", "evaluate") with domain-specific operations
- [ ] Embed at least one BAD vs. GOOD example pair per implementation skill to show contrast
- [ ] Write constraints as short imperative sentences, not explanations — rules belong in MUST DO/MUST NOT DO
- [ ] Add **Checkpoint** notes after every step where verification is critical before proceeding
- [ ] Design explicit fallback paths for each branching decision (no silent fall-through)
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) when instruction logic involves data flow decisions
- [ ] Validate file size ≥ 3000 bytes and at least 2 fenced code blocks with real implementations

