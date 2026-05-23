---
name: skill-audit
description: Systematically audits OpenCode AI skills for quality compliance including
  trigger effectiveness analysis, content depth assessment, cross-reference integrity
  verification, and automated stub detection scoring.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill audit, quality check, trigger effectiveness, skill assessment, stub
    detection, skill review, how do i evaluate a skill
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: skill-engineering, skill-router-system, skill-lifecycle-management,
    coding-code-review
------

# Skill Audit Framework

Reviews and scores OpenCode AI skills against the repository quality standards. Produces structured audit reports with pass/fail verdicts per dimension and an overall quality score from 0 to 100.

## TL;DR Checklist

- [ ] Parse SKILL.md frontmatter and validate all required fields exist
- [ ] Score trigger quality (0–20 points) using two-tier strategy validation
- [ ] Assess content depth — file size, code blocks, workflow specificity
- [ ] Verify cross-reference integrity — related-skills reciprocity check
- [ ] Run stub detection against the five zero-tolerance checks
- [ ] Calculate overall score and produce the structured audit report

