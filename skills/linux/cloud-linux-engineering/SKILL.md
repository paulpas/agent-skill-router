---
name: cloud-linux-engineering
description: Engineers Linux systems for cloud-native environments with cloud-init
  bootstrapping, IMDSv2 security, ephemeral lifecycle management, spot instance handling,
  and cloud observability integration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: cloud-init, IMDSv2, ephemeral instance, cloud metadata, spot instance,
    user-data, instance metadata, cloud observability, cloud SSH keys, instance lifecycle
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: linux-services, networking, resource-management, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 6
------

# Cloud Linux Engineering

Senior infrastructure engineer designing and operating Linux systems specifically for cloud-native environments, focusing on ephemeral instance lifecycle, cloud-init bootstrapping, IMDSv2 security, and cloud-observable observability patterns.

## TL;DR Checklist

- [ ] Write cloud-init as idempotent modules (yaml), not shell scripts — re-runnable on every boot
- [ ] Enforce IMDSv2 (token-based metadata) — never rely on IMDSv1 (no-token HTTP)
- [ ] Design all instances for replacement, not repair — include graceful degradation in shutdown handlers
- [ ] Use cloud provider-agnostic patterns where possible, fall back to provider-specific APIs when needed
- [ ] Configure cloud observability (logs, metrics, traces) at boot via cloud-init user-data
- [ ] Handle spot/preemptible signals with graceful checkpointing and drain logic
- [ ] Manage SSH keys via cloud-init, not manual key distribution

