---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements DRY (Don't Repeat Yourself) principle enforcement through
  pattern recognition, code duplication detection, and refactoring guidance for clean
  maintainable codebases
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: clean-code, code-refactoring-refactor-clean, code-review
  role: implementation
  scope: implementation
  triggers: dry principle, don't repeat yourself, code duplication, refactoring, code
    duplication detection, refactoring guidance, maintainable code, code reuse
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
name: dry-principles
------
# DRY Principle Enforcer

Implements DRY (Don't Repeat Yourself) principle enforcement by identifying semantic duplication patterns, providing actionable refactoring strategies, and guiding developers toward maintainable codebases where knowledge and logic exist in exactly one place.

## TL;DR Checklist

- [ ] Identify semantic duplication (same intent, different syntax)
- [ ] Distinguish syntactic similarity from true duplication
- [ ] Apply extraction strategies (function, class, mixin, template method)
- [ ] Preserve single source of truth for business logic
- [ ] Verify refactoring doesn't create hidden coupling
- [ ] Update documentation when abstracting duplicated logic
- [ ] Test thoroughly after extraction to maintain behavior

