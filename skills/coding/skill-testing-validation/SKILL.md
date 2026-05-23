---
name: skill-testing-validation
description: Implements testing strategies for verifying AI skill quality including
  content validation, trigger matching tests, integration checks, and automated regression
  detection.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  triggers: skill testing, validation, quality assurance, test automation, regression
    detection, trigger matching, how do i test skills, code review for skills, skill
    audit
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
  related-skills: coding-code-review, agent-skill-ecosystem-design
------

# Skill Testing and Validation Framework

Teaches systematic testing strategies for verifying AI skill (SKILL.md) quality — from static content validation and trigger matching to integration smoke tests and automated regression detection. Follows SOLID and DRY principles applied to skill content design.

## TL;DR Checklist

- [ ] Run `./scripts/validate_skill.sh` against target SKILL.md — all checks must pass
- [ ] Verify frontmatter parses as valid YAML with every required field present
- [ ] Test trigger matching: simulate 10+ real user queries and confirm correct skill load
- [ ] Execute integration smoke test in a sandboxed OpenCode session
- [ ] Capture content metrics (byte count, code blocks, section presence) for baseline
- [ ] Register skill in regression test suite before committing any change
- [ ] Review trigger precision — ensure no trigger fires on unrelated conversations

