---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"FastAPI application structure with typed error hierarchy, global exception"
  handlers, CORS middleware, request timing, and lifecycle events'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: application, cloud infrastructure, fastapi patterns, fastapi-patterns,
    structure, typed
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
name: patterns
------
# Skill: coding-fastapi-patterns

# FastAPI application structure with typed error hierarchy, global exception handlers, CORS middleware, request timing, and lifecycle events

## Role / Purpose

This skill covers the canonical pattern for structuring a FastAPI application in a trading platform. It focuses on a typed error hierarchy with structured JSON responses, separation of application-level errors from framework-level errors, middleware for timing, CORS setup, health check endpoints, and router organization.

