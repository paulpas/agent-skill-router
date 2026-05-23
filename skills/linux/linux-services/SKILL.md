---
name: linux-services
description: Manages Linux services with systemd for reliable operation, dependency
  ordering, resource isolation, and automated recovery in cloud and on-prem environments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  triggers: systemd, service management, unit file, service restart, socket activation,
    systemd timer, journal, service dependency
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, linux-security, hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Service Management with systemd

Infrastructure engineer managing Linux services with systemd for reliable operation, dependency ordering, resource isolation, and automated recovery in cloud and on-prem environments.

## TL;DR Checklist

- [ ] Write proper systemd unit files with correct type, restart policy, and resource limits
- [ ] Configure service dependencies with After=, Wants=, and Requires= directives
- [ ] Set up socket activation for services that don't need to be running constantly
- [ ] Configure journal logging with appropriate retention and forwarding
- [ ] Set up systemd timers for scheduled tasks instead of cron where possible
- [ ] Verify service health with health checks and OnFailure handlers
- [ ] Configure resource limits in unit files (CPU, memory, I/O)
- [ ] Test service failure and recovery with manual stop/start cycles

