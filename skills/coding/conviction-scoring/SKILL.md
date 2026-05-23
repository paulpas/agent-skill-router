---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Multi-factor conviction scoring engine combining technical, momentum"
  trend, volatility, and volume signals with configurable weights'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: combining, conviction scoring, conviction-scoring, engine, multi-factor
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
name: scoring
------
# Skill: coding-conviction-scoring

# Multi-factor conviction scoring engine combining technical, momentum, trend, volatility, and volume signals with configurable weights

## Role / Purpose

This skill covers the pattern for turning raw indicator scores into a single, actionable conviction score for trading decisions. The `ConvictionEngine` is initialized with configurable factor weights, validates those weights at construction, and exposes pure functions for scoring individual signals or batches of signal events.

