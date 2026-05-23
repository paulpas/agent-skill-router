---
name: linux-security
description: Hardens Linux systems against common attack vectors with security baselines,
  access controls, and audit frameworks for cloud and on-prem environments.
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
  triggers: linux security, hardening, CIS benchmark, SELinux, AppArmor, SSH hardening,
    file integrity, audit framework
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, resource-management, networking, hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Security Hardening

Security engineer hardening Linux systems against common attack vectors with security baselines, mandatory access controls, SSH hardening, file integrity monitoring, and audit frameworks for cloud and on-prem environments.

## TL;DR Checklist

- [ ] Apply OS-specific security baseline (CIS benchmark or equivalent)
- [ ] Harden SSH configuration with key-based authentication and disabled root login
- [ ] Configure SELinux or AppArmor in enforcing mode for all workloads
- [ ] Set up auditd with rules for security-relevant events
- [ ] Configure file integrity monitoring for critical system files
- [ ] Apply firewall rules with explicit deny-all default policy
- [ ] Disable unnecessary services and network ports
- [ ] Configure automatic security updates and patch management

