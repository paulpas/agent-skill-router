---
name: skill-router-system
description: Implements and configures the AI agent skill routing system for auto-loading,
  trigger matching, confidence scoring, and skills-index generation across orchestration
  layers.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill router, auto-routing, trigger matching, skills-index, agent dispatch,
    adaptive routing, prompt injection, task routing
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
  related-skills: confidence-based-selector, parallel-skill-runner, dependency-graph-builder
------

# Agent Skill Router System

Configures and maintains the AI agent skill routing infrastructure that automatically matches conversational triggers to specialized skill documents, manages the skills-index registry, and ensures reliable auto-loading of contextual expertise. This system enforces deterministic fallback chains, prevents routing drift, and aligns all dispatch logic with The 5 Laws of Elegant Defense (see `code-philosophy`).

## TL;DR Checklist

- [ ] Validate YAML frontmatter compliance and trigger count (3–8 terms)
- [ ] Verify skills-index.json is rebuilt after any skill addition or removal
- [ ] Test trigger matching against conversational variants before enabling auto-load
- [ ] Configure fallback routing for low-confidence matches (< 0.65 threshold)
- [ ] Ensure all orchestration flows reference code-philosophy constraints

