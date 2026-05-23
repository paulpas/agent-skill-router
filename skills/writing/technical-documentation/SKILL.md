---
name: technical-documentation
description: Writes clear, structured technical documentation including READMEs, API
  docs, getting-started guides, and architectural overviews following industry conventions
  and developer experience best practices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: writing
  triggers: technical documentation, how do i write docs, README, API documentation,
    getting started guide, architecture overview, developer experience, docs-as-code,
    documentation structure, markdown docs
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: implementation
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: humanizer
------

# Technical Documentation Writer

Writes clear, structured, and actionable technical documentation that helps developers understand, adopt, and use software effectively. Covers READMEs, API references, getting-started guides, and architectural overviews using proven conventions.

## TL;DR Checklist

- [ ] Lead with the "why" — users need to know what this project does before how it works
- [ ] Use progressive disclosure: basics first, advanced topics behind links or in separate pages
- [ ] Every code example must be complete enough to copy-paste and run (or clearly indicate what's omitted)
- [ ] Include both "quick start" (5 minutes) and "deep dive" sections
- [ ] Cross-reference related concepts within the docs rather than expecting users to search elsewhere
- [ ] Use consistent terminology — don't swap between "server", "backend", "API endpoint", and "service" for the same thing

