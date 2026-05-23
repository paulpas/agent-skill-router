---
name: framework-adaptation
description: Evaluates and integrates new frameworks into existing projects using
  adapter patterns, progressive migration strategies, and dependency boundary isolation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework adaptation, library integration, new framework, dependency evaluation,
    tech stack upgrade, adapter pattern, facade pattern, progressive migration
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
  - examples
  - do-dont
  related-skills: version-migration, dependency-conflict-resolution, architecture-review
------

# Framework Adaptation & Integration

When loaded, this skill makes the model evaluate and integrate new frameworks into existing projects using adapter patterns, progressive migration strategies (Strangler Fig), and dependency boundary isolation. The model produces a dependency analysis, type-safe adapter interfaces, a step-by-step migration plan with feature flags for rollback, and a validation strategy using shadow reads or dual-write comparison.

## TL;DR Checklist

- [ ] Map current framework usage — identify every import, call site, and integration point in the codebase
- [ ] Evaluate peer dependency conflicts between old and new frameworks before writing any integration code
- [ ] Define an adapter interface that abstracts both old and new implementations behind a single type-safe contract
- [ ] Implement progressive migration using Strangler Fig — migrate one responsibility at a time behind feature flags
- [ ] Set up shadow read or dual write validation to compare outputs from both implementations side-by-side
- [ ] Document breaking changes and rollback criteria for every migration step before proceeding

