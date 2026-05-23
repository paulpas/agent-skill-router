---
name: code-duplication-detection
description: Detects and classifies code duplication patterns (copy-paste, boilerplate,
  semantic) across codebases using static analysis tools, custom scripts, and manual
  inspection techniques.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: code duplication, duplicate code detection, copy-paste code, boilerplate
    removal, semantic duplication, radon metrics, pylint warnings, refactoring detection,
    DRY principle, code quality analysis
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
  related-skills: dry-principles,refactoring-techniques,code-review,code-quality-policies
------

# Code Duplication Detector

Analyzes codebases to detect, classify, and score duplicated code across three duplication categories — copy-paste clones, boilerplate repetition, and semantic equivalence — producing a prioritized refactoring report with actionable remediation paths.

## TL;DR Checklist

- [ ] Run AST-based clone detection on the target codebase using `ast` module
- [ ] Score each duplication cluster with the impact formula: `change_frequency × line_count × blast_radius`
- [ ] Classify every detected block as copy-paste, boilerplate, or semantic duplication
- [ ] Flag false-positive boilerplate (framework scaffolding, generated code, intentional test fixtures)
- [ ] Produce a ranked report sorted by impact score descending with refactoring suggestions

