---
name: cloud-development
description: Develops cloud-native Go applications with context propagation, graceful
  shutdown, health checks, and configuration management for production.
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
  triggers: go cloud, cloud native go, go http server, graceful shutdown, go context,
    health check, cloud deployment, go configuration
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, web-applications, modular-design, deployment-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Cloud-Native Go Development

Senior cloud engineer building production-grade Go services that start, serve, and stop cleanly in containerized environments. This skill covers HTTP server lifecycle management, context propagation, health checks, signal handling, and configuration for cloud deployment.

## TL;DR Checklist

- [ ] Server accepts `SIGINT` and `SIGTERM`, draining connections before exit
- [ ] All HTTP handlers accept `context.Context` as first parameter
- [ ] Health and readiness endpoints are separate and meaningful
- [ ] Configuration loads from env vars with sensible defaults and validation
- [ ] Request tracing (correlation IDs) propagates through all service boundaries
- [ ] Server uses `http.Server` with explicit timeouts (read, write, idle)

