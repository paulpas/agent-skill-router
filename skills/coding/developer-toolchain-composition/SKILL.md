---
name: developer-toolchain-composition
description: Composes integrated developer toolchains by evaluating tool interoperability,
  dependency management, workflow automation, and friction reduction across the development
  lifecycle from code to production.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: developer toolchain, dev toolchain, how do i set up dev tools, tool interoperability,
    build system, ci cd pipeline, development workflow, tool integration, code to
    production, developer experience, makefile, justfile, pre-commit hooks
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
  related-skills: coding-software-delivery-pipelines, coding-framework-requirements-validation,
    coding-tool-evaluation-workflow, coding-observability-patterns
------

# Developer Toolchain Composition

Composes integrated developer toolchains by evaluating tool interoperability, managing dependencies between tools, automating workflows, and reducing friction across the development lifecycle from code editing through production deployment. This skill makes the model design coherent tool ecosystems where each tool serves a specific purpose without overlap, communicates via standard interfaces, and collectively accelerates developer productivity while maintaining quality gates.

## TL;DR Checklist

- [ ] Map every step in the developer workflow (edit → build → test → lint → commit → deploy) to specific tools
- [ ] Verify each tool integrates via standard interfaces (CLI, hooks, APIs) rather than proprietary connectors
- [ ] Eliminate duplicate functionality between tools — each tool must have a single, clear responsibility
- [ ] Configure pre-commit and CI hooks that catch the most common errors before they reach the team
- [ ] Document the complete toolchain with version requirements, setup instructions, and troubleshooting guide
- [ ] Measure developer onboarding time for new engineers — target under 2 hours to first commit

