---
name: skill-quality-metrics
description: Scores SKILL.md files across seven dimensions (content depth, code quality,
  trigger design, structural completeness, constraint specificity, domain compliance,
  stub resistance) using a Python-based calculator for objective quality assessment.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: skill quality metrics, skill scoring, quality rubric, skill evaluation
    framework, skill health score, how do i measure skill quality, skill audit checklist,
    skill grading system
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
  related-skills: coding-skill-testing-validation, coding-skill-lifecycle-management,
    agent-skill-optimizer
------

# Skill Quality Metrics Framework

Scores SKILL.md files across seven measurable dimensions using a weighted rubric system. When loaded, this skill makes the model act as a quality auditor — evaluating skills objectively against quantifiable criteria, producing a numerical score with breakdown by dimension and actionable improvement recommendations.

## TL;DR Checklist

- [ ] Compute content depth score (word count, code blocks, examples)
- [ ] Evaluate code block quality (typed signatures, docstrings, guard clauses, real implementations)
- [ ] Score trigger design (technical vs conversational balance, specificity calibration)
- [ ] Verify structural completeness (all required sections present per domain rules)
- [ ] Check constraint specificity (each rule testable by inspection, no abstract principles)
- [ ] Confirm domain compliance (agent has ASCII flow diagram, cncf has YAML manifests, etc.)
- [ ] Run stub resistance scan (zero sentinel phrases, zero generic workflow patterns)
- [ ] Produce final weighted score with per-dimension breakdown and improvement actions

