---
name: framework-requirements
description: Configures and scaffolds project frameworks (frontend, backend, full-stack)
  with dependency resolution, environment validation, and CI/CD boilerplate integration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework setup, project scaffolding, dependency configuration, boilerplate
    generation, environment validation, starter kits, tech stack selection
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
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: test-driven-development, software-design-principles, design-patterns-and-principles
------

# Project Framework Configurator

Configures and scaffolds project frameworks with dependency resolution, environment validation, and CI/CD boilerplate generation. The model acts as a senior build engineer, producing reproducible project foundations that enforce semantic versioning, secure dependency practices (OWASP auditing), and POSIX-compliant path conventions from the first commit.

## TL;DR Checklist

- [ ] Define language version constraints using semver ranges before generating any code
- [ ] Select framework based on documented requirements, not personal preference
- [ ] Generate lockfiles that pin exact transitive dependency versions
- [ ] Validate runtime environment (OS, interpreter, package manager) before proceeding
- [ ] Scaffold CI/CD pipelines with at least lint, test, and dependency audit steps

