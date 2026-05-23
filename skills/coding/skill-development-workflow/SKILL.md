---
name: skill-development-workflow
description: Implements the complete skill creation lifecycle from research through
  validation, including Python-based quality gates, stub detection, and automated
  compliance checking against SKILL_FORMAT_SPEC.md requirements.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: skill creation workflow, skill development, skill lifecycle, quality gate
    validation, skill validator, stub detection, skill compliance check, how do i
    create a skill, SKILL.md format, skill generation pipeline
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
  related-skills: coding-code-quality-policies, agent-skill-trigger-engineering
------

# Skill Development Workflow

Implements the complete skill creation lifecycle with automated quality gates to ensure every SKILL.md meets repository standards before commit. This skill provides Python-based validators that check file size, stub sentinels, code block counts, trigger diversity, and domain-specific structural requirements.

## TL;DR Checklist

- [ ] Run `validate_skill.sh` — must exit 0 (PASS)
- [ ] File is ≥ 3,000 bytes of content (excluding frontmatter)
- [ ] No stub sentinel: "IMPLEMENTING THIS SPECIFIC PATTERN OR FEATURE"
- [ ] At least 2 fenced code blocks for implementation skills
- [ ] Core Workflow uses domain-specific steps with checkpoints — no generic patterns
- [ ] `metadata.triggers` has 5–8 specific terms with both technical and conversational variants
- [ ] H1 title is human-readable, not the kebab-case name
- [ ] Description leads with an active verb and includes 1–2 domain-specific terms

