---
name: software-documentation
description: Writes authoritative technical documentation (API references, inline
  docstrings, READMEs, developer guides) using modern standards like OpenAPI 3.1,
  Google/NumPy docstring formats, and MkDocs/Docusaurus static site generators.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software documentation, API docs, docstrings, README writing, developer
    guides, OpenAPI, MkDocs, Docusaurus, technical writing for developers, how do
    i document code, Sphinx, type stubs, mypy stubs, py.typed
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
  - config
  related-skills: coding-api-design, coding-code-review, coding-type-safety-enforcement,
    coding-static-analysis-tools
------

# Technical Documentation for Software

Writes authoritative technical documentation that developers actually read and rely on. This skill produces API references with typed signatures, inline docstrings following Google/NumPy conventions, README files with usage examples, and developer guides structured for discoverability — all aligned to current 2025-2026 tooling standards.

## TL;DR Checklist

- [ ] Every public function has a docstring with typed parameters, return type, and exceptions
- [ ] API documentation uses OpenAPI 3.1 spec with security schemes and example responses
- [ ] README includes quick start section runnable in under 5 minutes
- [ ] Developer guides use "how-to" structure: problem - solution - code - explanation
- [ ] Inline comments explain why, not what - the code expresses what
- [ ] Cross-reference all docstring Args, Returns, and Raises sections with actual signatures
- [ ] Use consistent terminology across README, API docs, and inline documentation

