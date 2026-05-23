---
name: package-ecosystem-navigator
description: Navigates package manager ecosystems (npm, PyPI, crates.io, Maven, Go
  modules) with health assessment, dependency auditing, registry configuration, and
  cross-platform migration strategies for making informed packaging decisions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: package manager, npm, pypi, crates.io, maven, go modules, cargo, pip,
    poetry, dependency management, registry health, how do i find packages, package
    ecosystem, lockfile, semver, version resolution
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
  - config
  - examples
  - do-dont
  related-skills: coding-dependency-supply-chain-security, coding-version-migration,
    coding-framework-requirements-validation, coding-tool-evaluation-workflow
------

# Package Ecosystem Navigator

Navigates package manager ecosystems to assess registry health, evaluate dependencies, configure registries, and plan cross-platform migrations. This skill makes the model analyze package availability, security posture, maintenance status, and version resolution strategies across npm, PyPI, crates.io, Maven, Go modules, and other major registries — enabling teams to make informed decisions about which packages to adopt and how to manage their dependency lifecycles.

## TL;DR Checklist

- [ ] Evaluate package health using activity metrics (last publish date, contributor count, issue response time)
- [ ] Check dependency graph for transitive risks and version conflicts before adding any package
- [ ] Configure lockfiles and pin dependencies at the most restrictive safe constraint level
- [ ] Verify package provenance (signatures, publisher verification, supply chain attestations)
- [ ] Map equivalent packages across ecosystems when evaluating migration paths
- [ ] Document rejection rationale for evaluated-but-rejected alternatives

