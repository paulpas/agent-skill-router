---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Markdown best practices for OpenCode skills - syntax rules,
  common pitfalls, and coding practices for documentation consistency"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: humanizer, null
  role: implementation
  scope: implementation
  triggers: markdown best practices, markdown-best-practices, opencode, skills, syntax
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
name: best-practices
------
# Markdown Best Practices Skill

A comprehensive guide to writing clean, consistent, and maintainable Markdown documentation for the APEX Trading Platform.

## Purpose

Why markdown best practices matter for documentation quality:

- **Consistency**: Uniform formatting across all documentation makes content easier to scan and understand
- **Maintainability**: Well-structured Markdown is easier to update, refactor, and migrate
- **Collaboration**: Clear standards reduce friction when multiple authors contribute
- **Tooling Compatibility**: Proper syntax ensures compatibility with converters, parsers, and generators
- **Longevity**: Standards-compliant Markdown remains usable as tools and platforms evolve

## Syntax Rules

### GitHub Flavored Markdown (GFM)

- Use `#` through `######` for headings (one space after `#`)
- Use `