---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Establishing policies for maintaining a clean codebase including
  code standards, linting, formatting, testing requirements, cyclomatic complexity
  limi"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: architectural-patterns, git-advanced
  role: implementation
  scope: implementation
  triggers: code quality, clean code, linting, code formatting, testing policies,
    cyclomatic complexity, code standards, automated enforcement
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
name: quality-policies
------
# Code Quality Policies

Implementation guide for establishing and enforcing code quality standards in repositories, including linting configuration, code formatting rules, testing requirements, complexity limits, and automated policy enforcement through CI/CD pipelines.

## TL;DR Checklist

- [ ] Define coding standards (naming, structure, style) for team's language/framework
- [ ] Configure linters to enforce standards automatically (ESLint, Black, Pylint)
- [ ] Set code formatter configuration (Prettier, Black, gofmt) as source of truth
- [ ] Define minimum test coverage threshold (typically 70-80%)
- [ ] Set cyclomatic complexity limits per function (typically ≤10)
- [ ] Enforce policies in pre-commit hooks and CI/CD pipeline
- [ ] Document standards in CONTRIBUTING.md and automate as much as possible

