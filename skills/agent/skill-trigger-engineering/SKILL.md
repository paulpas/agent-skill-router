---
name: skill-trigger-engineering
description: Designs and calibrates trigger keywords for OpenCode skill auto-loading
  using two-tier strategy combining technical precision with conversational language
  to maximize skill discoverability while minimizing false positives.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill triggers, trigger engineering, auto-loading, skill discovery, trigger
    calibration, keyword matching, how do i design triggers, conversational discovery,
    two-tier trigger strategy, trigger testing
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
  related-skills: coding-skill-development-workflow, agent-confidence-based-selector,
    agent-task-routing
------

# Skill Trigger Engineering

Designs and calibrates trigger keywords that drive skill auto-loading in OpenCode. Applies a two-tier strategy combining technical precision with conversational accessibility to maximize skill discoverability while minimizing false-positive activations across all conversation contexts.

## TL;DR Checklist

- [ ] Triggers include 5–8 specific terms (3 minimum, 8 maximum)
- [ ] Primary product/concept name is always included as first trigger
- [ ] At least one technical term AND at least one conversational phrase present
- [ ] No ultra-generic single-word triggers like `code`, `data`, `risk`, `pattern`
- [ ] Trigger phrases sound like natural conversation — could they appear in a Slack message?
- [ ] Triggers follow domain-specific guidelines for the target domain
- [ ] Both hyphenated and non-hyphenated variants included where relevant

