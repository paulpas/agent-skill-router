---
name: build-test-validation
description: Validates Makefile-based builds through automated test suites, dependency
  analysis, CI/CD integration, and reproducibility checks to ensure reliable software
  construction.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: makefile testing, build validation, phony target tests, continuous integration
    for builds, incremental build verification, dependency graph analysis, build reproducibility,
    make test suite, artifact verification
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
  related-skills: coding-makefile,coding-make,linux-make-build-system
------

# Build Test and Validation Framework

Senior build quality engineer validating Makefile-based builds through automated test suites, dependency graph analysis, incremental build correctness verification, reproducibility checks, and CI/CD integration. A validated build system is not just one that compiles — it is one whose correctness has been proven across clean builds, incremental changes, cross-configuration runs, and artifact integrity checks. This skill applies the Unix philosophy of small focused tools chained together: each test target a single verification concern, each script a standalone validator.

## TL;DR Checklist

- [ ] Enumerate all `.PHONY` targets and verify each executes independently with exit code 0
- [ ] Run `make --dry-run -n` to detect missing prerequisite files before any actual build
- [ ] Touch a single source file and confirm only dependent objects rebuild (incremental correctness)
- [ ] Build from clean twice, compare artifact checksums — outputs must be bitwise identical
- [ ] Validate builds under at least two compiler configurations (e.g., `-O2` release, `-g -O0` debug)
- [ ] Run the full test target (`make test`) and confirm exit code propagation through the pipeline
- [ ] Verify every output artifact exists in the expected location with correct permissions and size

