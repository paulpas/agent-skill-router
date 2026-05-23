---
name: javascript-frontend-ecosystem
description: Implements monorepo architecture, build toolchain selection, module federation,
  and package health assessment for modern JavaScript frontend ecosystems to enable
  scalable multi-package development workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: monorepo setup, how do i set up a monorepo, module federation, micro-frontends,
    build toolchain migration, webpack to vite, turborepo vs nx
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
  related-skills: coding-frontend-testing-patterns, javascript-package-workflows,
    agent-task-routing
------

# JavaScript Frontend Ecosystem Architect

Implements monorepo architecture decisions, build toolchain selection, module federation for micro-frontends, and package health assessment across modern JavaScript frontend projects. When loaded, this skill makes the model act as a senior frontend infrastructure engineer — comparing toolchains with real metrics, writing concrete configuration files (turbo.json, vite.config.ts, webpack federation configs), generating dependency audit scripts, and providing migration strategies between build systems.

## TL;DR Checklist

- [ ] Determine monorepo scope: single-language (pnpm workspaces) vs multi-language (Nx/Turborepo)
- [ ] Select build tool based on project type: dev-server speed (Vite/esbuild) vs full bundling (Webpack/Rolldown)
- [ ] Configure workspace root with `pnpm-workspace.yaml` or `turbo.json` before adding any package
- [ ] Write explicit `package.json` `"workspaces"` arrays — never rely on auto-discovery without constraints
- [ ] For micro-frontends: define shared dependency versions in root, use Module Federation for runtime composition
- [ ] Audit dependency health: last publish date < 6 months, contributor count > 3, zero critical CVEs
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) when designing package boundaries and data flow

