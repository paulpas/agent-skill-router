---
name: best-practices
description: Enforces Go idioms and best practices including error handling, interface
  design, testing conventions, and code organization for maintainable applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go best practices, go idioms, golang conventions, go error handling, interface
    design, go naming, idiomatic go
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: modular-design, cloud-development, testing-strategies
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Best Practices

Senior engineer enforcing idiomatic Go conventions — writing clean, maintainable Go code that reads like well-structured English. This skill covers error handling, interface design, naming, package organization, and the conventions that make Go code predictable and reviewable.

## TL;DR Checklist

- [ ] Return errors explicitly; never ignore returned errors without intentional handling
- [ ] Design interfaces small and consumer-specific (interface segregation)
- [ ] Name packages after their purpose, not their type (e.g. `cache`, not `cachetypes`)
- [ ] Use `context.Context` for all operations that span request boundaries
- [ ] Write table-driven tests for every exported function
- [ ] Document exported symbols with `// Package doc` and `// Function doc` comments

