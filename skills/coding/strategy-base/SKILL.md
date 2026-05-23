---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Abstract base strategy pattern with initialization guards, typed abstract"
  methods, and conviction scoring integration'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: abstract, initialization, pattern, strategy base, strategy-base
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
  version: 1.0.0
name: base
------
# Skill: coding-strategy-base

# Abstract base strategy pattern with initialization guards, typed abstract methods, and conviction scoring integration

## Role / Purpose

This skill covers the canonical pattern for a base trading strategy class in Python. `BaseStrategy(ABC)` enforces a contract that every concrete strategy must fulfill: validate its own identity at construction, initialize exactly once, generate signals from candle data, respond to signal events, and score signals with a multi-factor conviction engine.

