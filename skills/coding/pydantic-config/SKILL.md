---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Pydantic-based configuration management with frozen models, nested
  hierarchy" TOML/env parsing, and module-level singleton'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: configuration, management, pydantic config, pydantic-based, pydantic-config
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
name: config
------
# Skill: coding-pydantic-config

# Pydantic-based configuration management with frozen models, nested hierarchy, TOML/env parsing, and module-level singleton

## Role / Purpose

This skill covers the canonical pattern for application configuration in a trading system using Pydantic v2. Configuration is parsed once at the application boundary (from TOML or environment), validated, and frozen into an immutable singleton. All downstream code reads trusted, typed config values — never raw strings or unchecked dicts.

