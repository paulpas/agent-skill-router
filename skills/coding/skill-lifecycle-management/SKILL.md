---
name: skill-lifecycle-management
description: Manages the complete lifecycle of SKILL.md files including versioning
  strategies, deprecation workflows, retirement criteria, migration plans, and automated
  drift detection to keep skills current across the repository.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: skill lifecycle, skill versioning, skill deprecation, skill retirement,
    how do i manage skills, skill migration, deprecated skills, skill health monitoring,
    skill drift detection, maturity tracking
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
  - examples
  - do-dont
  related-skills: coding-skill-development-workflow, agent-skill-trigger-engineering,
    coding-code-quality-policies
------

# Skill Lifecycle Management

Manages the complete lifecycle of SKILL.md files from initial creation through versioning, deprecation, retirement, and migration. This skill provides structured processes for maintaining skill health, detecting content drift over time, and ensuring backward compatibility when skills evolve across versions.

## TL;DR Checklist

- [ ] Assign semantic version (MAJOR.MINOR.PATCH) on every change
- [ ] Document breaking changes in a CHANGELOG entry per skill
- [ ] Run `validate_skill.sh` before marking any skill stable or beta
- [ ] Deprecation requires minimum 2 minor releases of warning before retirement
- [ ] Migration plan must include backward-compatible fallback for deprecated triggers
- [ ] Retired skills are moved to `.archive/` not deleted — preserves git history

