---
name: make
description: Implements systematic build orchestration (Makefile, Nix, Bazel, Just)
  with dependency tracking, incremental compilation, phony targets, and cross-platform
  portability for reproducible software construction.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: make, build system, makefile, compilation, incremental build, build automation,
    justfile, phony targets
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
  related-skills: testing, refactoring, ci-cd-pipelines
------

# Build Orchestration & Make Patterns

Implements systematic build orchestration to transform source artifacts into reliable, reproducible outputs. A well-designed build system is not just a collection of commands — it is the contract between developers and the compilation pipeline, enforcing correctness through dependency tracking, incremental execution, and explicit phony target separation. Follow the Unix philosophy (KISS) by keeping recipes focused, transparent, and composable.

## TL;DR Checklist

- [ ] Define all non-file targets as `.PHONY` explicitly
- [ ] Use automatic variables (`$@`, `$<`, `$^`) to avoid hardcoding file paths
- [ ] Ensure incremental builds work (changed file triggers correct recompilation, unchanged files skipped)
- [ ] Separate build steps into logical targets (clean, test, deploy, install)
- [ ] Validate cross-platform compatibility or use platform-specific conditionals
- [ ] Document required tools and environment variables at the top

