---
name: skill-engineering
description: Designs high-fidelity OpenCode AI skills with precision trigger engineering,
  stub-free validation frameworks, and domain-specific constraint patterns for the
  agent-skill-router system.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill design, trigger engineering, SKILL.md crafting, stub detection,
    skill generation, agent skill routing, how do i create a skill
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
  - guidance
  - examples
  - do-dont
  - config
  related-skills: coding-code-review, agent-task-routing, coding-security-review
------

# Skill Engineering Framework

Designs high-fidelity OpenCode AI skills with precision trigger engineering, stub-free validation frameworks, and domain-specific constraint patterns. When loaded, this skill makes the model act as a senior skill architect — reviewing, creating, or refining SKILL.md files to meet the zero-tolerance quality standards of the agent-skill-router system.

## TL;DR Checklist

- [ ] Verify YAML frontmatter: all required fields present, `name` matches directory kebab-case exactly
- [ ] Check description starts with active verb, includes 1–2 domain terms, stays under ~200 characters
- [ ] Validate triggers: 5–8 terms blending technical precision (e.g., `stop loss`, `PromQL`) with conversational discovery (e.g., `how do i limit losses`)
- [ ] Confirm file is ≥ 3,000 bytes and contains zero instances of the stub sentinel phrase
- [ ] Ensure Core Workflow has numbered steps with **Checkpoint:** notes — no generic "identify → apply → validate" patterns
- [ ] Include at least 2 real code blocks with actual implementations (not placeholders like `# TODO`)
- [ ] Provide BAD vs GOOD comparison pair(s) relevant to the domain
- [ ] Add MUST DO / MUST NOT DO constraints that are actionable and specific (no "follow best practices")

