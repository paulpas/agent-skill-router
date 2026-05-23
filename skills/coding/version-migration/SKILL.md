---
name: version-migration
description: Manages framework and library version upgrades through systematic breakage
  analysis, automated refactoring scripts, and progressive migration with zero-downtime
  rollback strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: version migration, major version upgrade, breaking changes, framework
    upgrade, deprecation migration, API breakage, automated refactoring, semver upgrade
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
  related-skills: framework-adaptation, dependency-conflict-resolution, architecture-review
------

# Version Migration & Upgrade Manager

Senior engineer conducting systematic version migrations of frameworks, libraries, and dependencies when breaking changes occur. When loaded, this skill makes the model analyze changelogs for breakage, inventories deprecated APIs, generates automated refactoring scripts, and orchestrates progressive migration with regression testing at every step.

## TL;DR Checklist

- [ ] Parse full CHANGELOG.md or release notes for BREAKING and DEPRECATED sections before touching any code
- [ ] Run type-checker (mypy, tsc) against the new dependency version to find signature mismatches pre-migration
- [ ] Generate deprecation inventory mapping every deprecated API call to its replacement and target removal version
- [ ] Apply automated codemods for mechanical changes (renames, import moves, renamed exports) before manual refactoring
- [ ] Run full test suite after each migration step — not just at the end — catch regressions early
- [ ] Verify behavioral parity in staging with canary deployment strategy before promoting to production

