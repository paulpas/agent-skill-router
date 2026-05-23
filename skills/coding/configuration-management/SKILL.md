---
name: configuration-management
description: Implements production configuration management with layered config resolution,
  secret rotation, dynamic reloading without downtime, drift detection, and validated
  environment-specific configuration trees for application systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: configuration management, config tree, layered config, secret rotation,
    Vault integration, dynamic reloading, hot reload, configuration drift, environment
    configs, config validation, sealed secrets, how do i manage application config,
    configuration drift detection, runtime config changes
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
  related-skills: coding-production-readiness, linux-configuration-management, cncf-consul,
    coding-security-review
------

# Configuration Management Framework

Implements production-grade configuration management that handles layered resolution, secret lifecycle management, dynamic reloading without service interruption, drift detection and reconciliation, and validated environment-specific configuration trees. This skill makes the model design configuration systems where changes propagate safely, secrets are never stored in plaintext, and every configuration change is auditable and reversible — treating configuration as deployable infrastructure rather than ad-hoc environment variables.

## TL;DR Checklist

- [ ] Define a layered config resolution order: defaults → env file → runtime overrides → feature flags
- [ ] Validate ALL configuration at startup — fail fast if required keys are missing or values are out of range
- [ ] Store secrets exclusively in a secret manager (Vault, AWS Secrets Manager) — never in code, YAML, or env files
- [ ] Implement dynamic reloading for non-secret config with graceful transition (no dropped requests)
- [ ] Add drift detection: compare running config against source-of-truth on a scheduled interval
- [ ] Log every configuration change with who/what changed it, the old value, and the new value

