---
name: resource-management
description: Manages Linux system resources using cgroups v2, namespaces, and systemd
  for workload isolation and resource guarantees in cloud and on-prem environments.
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
  triggers: cgroups, resource management, cpu limit, memory limit, systemd resource,
    OOM, workload isolation, resource quota
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, hardware-provisioning, linux-services, storage-architecture
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Resource Management with cgroups and systemd

Senior systems engineer configuring and managing Linux resources using cgroups v2, namespaces, and systemd to isolate workloads and guarantee resource allocation across cloud and on-prem environments.

## TL;DR Checklist

- [ ] Verify cgroups v2 is enabled (`cat /sys/fs/cgroup/cgroup.controllers`)
- [ ] Assign workloads to dedicated cgroup hierarchies by service or tenant
- [ ] Set CPU limits using `cpu.max` (quota/period) and memory limits using `memory.max`
- [ ] Configure I/O bandwidth limits with `io.max` for block devices
- [ ] Apply systemd resource directives in unit files for managed services
- [ ] Set OOM scoring and memory pressure handlers for critical services
- [ ] Monitor resource utilization with `systemd-cgtop` and cgroup stat tools
- [ ] Validate resource isolation by running stress tests within cgroups

