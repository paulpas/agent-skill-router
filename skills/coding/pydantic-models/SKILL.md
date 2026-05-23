---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"''Pydantic frozen data models for trading: enums, annotated constraints"
  field/model validators, and computed properties'''
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: enums, frozen, pydantic models, pydantic-models, trading
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
name: models
------
# Skill: coding-pydantic-models

# Pydantic frozen data models for trading: enums, annotated constraints, field/model validators, and computed properties

## Role / Purpose

This skill covers how to define immutable, self-validating data models for a trading system using Pydantic v2. Every model enforces its own invariants at construction time. Once created, a model object is trusted — no downstream code needs to re-validate its fields.

