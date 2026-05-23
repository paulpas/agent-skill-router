---
name: skill-lifecycle-management
description: Manages the full lifecycle of OpenCode AI skills including versioning
  strategies, deprecation workflows, backward compatibility checks, and retirement
  procedures for the agent-skill-router system.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill lifecycle, versioning strategy, skill deprecation, backward compatibility,
    skill retirement, migration guide, how do i sunset a skill
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
  - config
  - diagrams
  related-skills: skill-engineering, skill-router-system, skill-audit
------

# Skill Lifecycle Manager

Orchestrates the complete lifecycle of OpenCode AI skills from initial creation through versioning, deprecation, backward compatibility validation, and retirement — ensuring every skill evolves without breaking existing auto-routing pipelines.

## TL;DR Checklist

- [ ] Parse SKILL.md frontmatter and extract current version before any change
- [ ] Classify the change type (MAJOR / MINOR / PATCH) using semantic versioning rules
- [ ] Update `metadata.version` in frontmatter to match the classified bump
- [ ] Run backward compatibility check against all skills listing this one in `related-skills`
- [ ] If deprecating, write a migration guide and update related-skills cross-references
- [ ] Regenerate README catalog with `python3 scripts/generate_readme.py`

