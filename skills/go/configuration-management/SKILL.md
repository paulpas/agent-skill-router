---
name: configuration-management
description: Manages application configuration in Go with environment variables, YAML/JSON
  parsing, validation, defaults, and hierarchy for multi-environment deployments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go configuration, go config, go env vars, go yaml config, go config validation,
    go secret management
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, deployment-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Configuration Management

Senior platform engineer implementing robust configuration management for Go applications. This skill covers environment variables, YAML/JSON parsing, validation, defaults, secret handling, and multi-environment configuration hierarchy.

## TL;DR Checklist

- [ ] Configuration is loaded into a struct — never access env vars directly in business logic
- [ ] Validation runs at load time — startup fails fast with a clear error message
- [ ] Defaults are explicit and documented in the struct tags or code
- [ ] Secrets are loaded from environment or a secrets manager — never from config files
- [ ] Configuration is immutable after loading — use a `*Config` pointer, not a struct with setters
- [ ] Multi-environment configs are merged: defaults → file → env vars → overrides

