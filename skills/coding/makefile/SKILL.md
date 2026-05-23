---
name: makefile
description: Implements Makefile best practices for build automation including phony
  targets, pattern rules, variable scoping, and cross-platform compatibility to streamline
  software build processes.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: makefile, make, build automation, phony targets, pattern rules, build
    system, make command, cross-platform make
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
  related-skills: shell-scripting, docker-compose, ci-cd-pipelines
------

# Makefile Build System

Build system engineer implementing reliable, maintainable Makefiles that automate compilation, testing, and deployment workflows. Every Makefile should be idempotent, portable, and self-documenting — treating build logic with the same rigor as application code.

## TL;DR Checklist

- [ ] Declare all non-file targets as `.PHONY`
- [ ] Use `:=` for immediate assignment, `?=` for defaults, `+=` for appending
- [ ] Implement pattern rules (`%.o: %.c`) instead of repeating commands
- [ ] Use automatic variables (`$@`, `$<`, `$^`, `$*`) instead of hardcoding filenames
- [ ] Provide a `help` target listing all available commands
- [ ] Test Makefile on at least two platforms (Linux, macOS/BSD)
- [ ] Never hardcode compiler flags — parameterize with sensible defaults

