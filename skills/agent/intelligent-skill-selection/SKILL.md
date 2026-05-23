---
name: intelligent-skill-selection
description: Evaluates incoming tasks against available skills using semantic matching,
  confidence thresholds, and contextual filters to route work to the optimal capability
  with automatic fallback handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill selection, task routing, choosing the right skill, semantic matching,
    confidence threshold, adaptive routing, agent dispatch, fallback strategy
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
  - do-dont
  - diagrams
  related-skills: dependency-graph-builder, parallel-skill-runner, dynamic-replanner
------

# Intelligent Skill Selection Framework

Orchestrates task-to-skill mapping by evaluating intent, domain constraints, and confidence scores to dispatch work to the most appropriate capability, ensuring accurate routing with built-in fallback mechanisms.

## TL;DR Checklist

- [ ] Extract core intent and domain from user request
- [ ] Filter skill pool by domain relevance and availability
- [ ] Calculate semantic similarity score for top candidates
- [ ] Apply confidence threshold (default 0.75) — skip if below
- [ ] Select highest-scoring skill or trigger fallback chain
- [ ] Log routing decision with scores and reasoning

