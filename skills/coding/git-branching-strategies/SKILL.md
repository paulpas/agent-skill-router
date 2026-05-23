---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Git branching models including Git Flow, GitHub Flow, Trunk-Based Development"
  and feature flag strategies for CI/CD pipelines'
license: MIT
maturity: stable
metadata:
  author: https://github.com/Jeffallan
  domain: coding
  output-format: code
  related-skills: git-advanced, semver-automation
  role: implementation
  scope: implementation
  source: https://github.com/farmage/opencode-skills
  triggers: git branching strategies, git repository, git-branching-strategies, github,
    including, models, version control
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
name: branching-strategies
------
# Git Branching Strategies

Patterns for managing code changes through branches, merges, and feature flags in collaborative development environments.

## When to Use This Skill

- Setting up version control workflow for a new team
- Choosing a branching strategy for a project
- Implementing CI/CD with proper branching
- Training teams on Git best practices
- Resolving merge conflict patterns

## Branching Models Overview

| Model | Branches | Release Cadence | Best For |
|