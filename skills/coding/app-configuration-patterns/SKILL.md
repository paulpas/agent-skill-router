---
name: app-configuration-patterns
description: Implements layered configuration loading, secrets management abstraction,
  feature flag systems with percentage rollouts, and startup validation for production
  applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: configuration management, environment variables, feature flags, secrets
    management, config validation, .env files, yaml configuration, config overlay
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
  related-skills: security-review, deployment-patterns, software-design-principles
------

# Configuration Management for Production Applications

Implements layered configuration loading, secrets management abstraction, feature flag evaluation, and startup validation so production applications behave predictably across environments. When this skill is loaded, the model produces concrete configuration code — not abstract "use environment variables" advice.

## TL;DR Checklist

- [ ] Configuration uses a 4-layer precedence: defaults → config files → environment variables → secrets manager
- [ ] All secrets are injected via abstraction (Vault, AWS Secrets Manager, or env vars) — never hardcoded
- [ ] Feature flags support boolean toggles, percentage rollouts, and user-targeted variants
- [ ] Configuration is validated at startup with a single `Config.validate()` call that fails fast on missing required fields
- [ ] `.env` files are listed in `.gitignore` and never committed to version control
- [ ] Hot-reload mechanism exists for feature flags (not for secrets or infrastructure config)

