---
name: skill-ecosystem-design
description: Designs interconnected skill networks with dependency graphs, reciprocal
  relationships, layered capabilities, and cross-domain bridges to maximize discoverability
  and create coherent capability clusters for AI agent systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill ecosystem, skill network, skill dependencies, skill relationships,
    layered skills, cross-domain skills, how do i design skill networks, reciprocal
    skills, skill clusters, capability mapping
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
  - diagrams
  - do-dont
  related-skills: agent-skill-trigger-engineering, coding-skill-lifecycle-management,
    agent-skill-router, agent-confidence-based-selector
------

# Skill Ecosystem Design

Designs interconnected skill networks where each skill reinforces and discovers others through reciprocal relationships, layered capabilities, and cross-domain bridges. This skill creates coherent capability clusters that guide agents from foundational concepts to specialized execution patterns, maximizing auto-loading discovery while preventing trigger overlap between related skills.

## TL;DR Checklist

- [ ] Every skill lists 2–4 reciprocal related-skills (no isolated skills)
- [ ] Skills are organized in layers: foundational → tactical → emergency/advanced
- [ ] Trigger terms follow two-tier strategy (technical + conversational) with no overlap between siblings
- [ ] Cross-domain bridges use adjacent tech bridge terms to connect skill families
- [ ] Dependency graph has no circular references; each skill is a stepping stone to the next
- [ ] Hierarchy: foundational → tactical → specialized — user journey flows naturally

