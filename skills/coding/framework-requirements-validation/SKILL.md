---
name: framework-requirements-validation
description: Validates code against framework conventions (React Hooks rules, Next.js
  App Router patterns, Django checks) and enforces build tool configuration compliance
  through automated linting pipelines and CI integration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework validation, eslint plugin react hooks, next.js linting rules,
    django check command, framework compliance, build tool config validation, biome
    linting, vite config check, tsconfig patterns, code conventions checker
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
  related-skills: framework-utilization, framework-requirements, code-validation,
    build-test-validation
------

# Framework Requirements Validation

Validates that application code conforms to framework-specific conventions and that build tool configurations are correct. This skill combines runtime schema validation of configuration files with automated linting pipelines that enforce ecosystem rules — React Hooks exhaustive-deps, Next.js App Router patterns, Django deployment checks, and modern toolchain compliance via Biome and ESLint.

## TL;DR Checklist

- [ ] Configure framework-specific ESLint plugins (e.g., `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`) with convention rules at `error` level
- [ ] Validate build tool configs programmatically using Zod schemas — never rely on visual inspection alone
- [ ] Set up a CI pipeline stage that runs `biome check --write`, `eslint .`, and `tsc --noEmit` sequentially before merge
- [ ] Audit the codebase by running framework-native check commands (`python manage.py check --deploy`, Next.js `next lint`)
- [ ] Generate a compliance report with violation counts per category (critical/warning/info) and track trends across PRs

