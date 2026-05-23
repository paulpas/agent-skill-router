---
name: anti-patterns
description: Catalogs and detects common software anti-patterns (god object, leaky
  abstraction, feature envy, shotgun surgery, cargo cult) to help developers recognize
  and refactor harmful code practices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: anti-pattern, god object, leaky abstraction, feature envy, shotgun surgery,
    cargo cult, code smell, refactoring, bad design, harmful patterns
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: design-patterns-and-principles, refactoring, code-review, modular-design
------

# Anti-Pattern Catalog & Detector

Reviews codebases to identify harmful design anti-patterns, categorizes them by severity, and provides concrete refactoring directions. An anti-pattern is a commonly used solution that produces negative consequences — it works but degrades maintainability, testability, or performance over time.

## TL;DR Checklist

- [ ] Identify the anti-pattern type and its specific manifestation in the code
- [ ] Assess severity: blocking (blocks new development), nagging (slows work), or cosmetic (annoying but functional)
- [ ] Provide concrete BEFORE/AFTER code comparison showing the fix
- [ ] Recommend the specific pattern or technique that addresses the root cause
- [ ] Note any cascading anti-patterns created by the first one

