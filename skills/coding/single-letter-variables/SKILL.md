---
name: single-letter-variables
description: Analyzes variable names to detect ambiguous single-letter identifiers
  and recommends readable alternatives based on scope, context, and language conventions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: single letter variables, naming conventions, code readability, variable
    names, a b c d x y z, ambiguous identifiers, code review
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
  related-skills: code-review, refactoring-legacy-code, dry-principles
------

# Single-Letter Variable Naming Conventions

Evaluates whether variable names are descriptive enough for their scope and context, flagging ambiguous single-letter identifiers that degrade readability while preserving legitimate shorthand uses in tight loops, math formulas, and iterators.

## TL;DR Checklist

- [ ] Flag every `a`, `b`, `x`, `y` used outside a loop header or math expression
- [ ] Check variable scope — names with function-level scope must be self-documenting
- [ ] Replace business-domain variables with meaningful nouns (e.g., `user_id` over `a`)
- [ ] Preserve `i`, `j`, `k` in nested loops, `x`, `y`, `z` in coordinate geometry, `e` in exception handling
- [ ] Verify parameter names describe intent, not just type (`amount_usd` vs `x`)
- [ ] Ensure multi-language codebases follow language-specific conventions (PEP 8, ESLint rules)

