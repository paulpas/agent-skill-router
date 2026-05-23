---
name: code-quality-metrics
description: Analyzes software quality using static analysis metrics including cyclomatic
  complexity, maintainability index, code duplication detection, technical debt estimation,
  and coverage thresholds for engineering teams.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: code quality metrics, cyclomatic complexity, maintainability index, code
    duplication, static analysis, technical debt, sonarqube, pylint metrics, flake8,
    mypy strict, coverage thresholds, dead code detection, how do i measure code quality,
    complexity analysis
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
  related-skills: coding-static-analysis-tools, coding-code-review, coding-refactoring-techniques,
    coding-type-safety-enforcement
------

# Code Quality Metrics & Analysis

Analyzes software quality using measurable static analysis metrics — cyclomatic complexity, maintainability index, code duplication, technical debt estimation, and coverage thresholds. This skill configures tooling (radon, pylint, ruff, mypy, coverage.py) and defines quantitative quality gates that teams enforce in CI/CD pipelines.

## TL;DR Checklist

- [ ] Cyclomatic complexity per function stays below 10 (warning threshold: 5)
- [ ] Maintainability Index is above 20 for all files (SonarQube scale, max 100)
- [ ] Code duplication detected by radon or similar tool is below 3% of total lines
- [ ] Test coverage threshold set per-project (default: 80% line coverage minimum)
- [ ] All quality metrics run automatically in CI with clear pass/fail output
- [ ] Technical debt is estimated and tracked as a trend, not a single snapshot
- [ ] Flake8/pylint/ruff violations are categorized by severity before setting thresholds

