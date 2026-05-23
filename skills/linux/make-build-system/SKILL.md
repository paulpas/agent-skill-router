---
name: make-build-system
description: Implements GNU Make build automation including dependency graphs, phony
  targets, variable scoping, pattern rules, and cross-compilation for reproducible
  software builds.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: makefile, GNU make, build automation, incremental builds, phony targets,
    make variables, dependency graph, cross-compilation
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
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
  - config
  - do-dont
  related-skills: linux-services, coding-test-driven-development
------

# GNU Make Build System

Implements reproducible, incremental software builds using GNU Make. Makefiles are not just lists of commands — they are declarative dependency graphs that encode build logic, variable scoping rules, and platform detection to automate compilation, testing, packaging, and deployment workflows.

## TL;DR Checklist

- [ ] Define all non-file targets as `phony` if they don't produce files with that exact name
- [ ] Use explicit pattern rules (`%.o: %.c`) instead of hardcoded recipes
- [ ] Separate build variables by scope (global vs target-specific)
- [ ] Validate dependency graphs for correctness before committing Makefiles
- [ ] Use automatic variables ($@, $<, $?^) to keep recipes DRY
- [ ] Test builds with `make -n` (dry-run) and `make clean` before automation

