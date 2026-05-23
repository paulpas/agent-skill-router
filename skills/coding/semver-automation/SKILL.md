---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Automating semantic versioning in Git repositories for version
  bumping, changelog generation, and release automation using conventional commits
  and to"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: cve-dependency-management, git-advanced, git-branching-strategies,
    javascript-package-workflows
  role: implementation
  scope: implementation
  triggers: semantic versioning, semver, version bumping, conventional commits, semantic-release,
    changelog automation, release automation, git tags
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
name: automation
------
# Semantic Versioning Automation

Implementation guide for automating semantic versioning in Git repositories using conventional commits and release automation tools like semantic-release, including version bumping, changelog generation, and release workflows.

## TL;DR Checklist

- [ ] Establish conventional commit format (feat:, fix:, BREAKING CHANGE:) for all commits
- [ ] Configure semantic-release or similar tool in CI/CD pipeline
- [ ] Set up automatic version bumping based on commit types
- [ ] Generate changelogs automatically from commit messages
- [ ] Create and push Git tags for each release
- [ ] Publish artifacts and update version files automatically

