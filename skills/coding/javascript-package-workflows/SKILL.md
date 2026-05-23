---
name: javascript-package-workflows
description: Automates JavaScript/TypeScript package publishing with semantic-release,
  conventional commits, CI/CD workflows, and private registry configuration for npm.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: semantic-release, conventional commits, npm publish workflow, how do i
    publish a npm package, changelog automation, private npm registry, .npmrc setup,
    changesets, monorepo publishing, release automation
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
  related-skills: coding-javascript-frontend-ecosystem, coding-semver-automation,
    coding-software-delivery-pipelines
------

# JavaScript Package Publishing Workflows

Automates version bumps, changelog generation, and package publishing for npm packages using semantic-release, conventional commits, and CI/CD pipelines. When loaded, this skill makes the model act as a senior JavaScript infrastructure engineer — writing complete `package.json` exports configurations, configuring semantic-release with GitHub Actions, setting up private registries, and designing publish workflows for single-package and monorepo projects.

## TL;DR Checklist

- [ ] Define `"exports"` field in `package.json` with explicit ESM and CJS entry points — never rely on `"main"` alone
- [ ] Configure semantic-release at the repository root (single package) or workspace level (monorepo) before any commit
- [ ] Use conventional commits (`feat:`, `fix:`, `chore:`) to drive changelog entries and semver bumping
- [ ] Store `NPM_TOKEN` in CI secrets — never hardcode tokens in `.npmrc` files committed to version control
- [ ] Add `"prepublishOnly"` script that runs the full test/typecheck/build pipeline before any publish
- [ ] For monorepos, choose changesets for independent versioning per package or semantic-release with `lerna bootstrap` for coordinated releases
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense): parse token configs at boundaries, fail fast on missing secrets, design data flow from registry config inward

