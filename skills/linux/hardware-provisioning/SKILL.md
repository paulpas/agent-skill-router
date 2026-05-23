---
name: hardware-provisioning
description: Plans and provisions Linux systems for cloud instances and on-prem hardware
  with workload-appropriate sizing, RAID, and hardware abstraction.
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
  triggers: hardware provisioning, instance sizing, RAID configuration, SSD, cloud
    instance, on-prem hardware, disk sizing, CPU architecture
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, kernel-tuning, storage-architecture, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Hardware Provisioning

Infrastructure engineer planning and provisioning Linux systems for cloud instances and on-prem hardware, selecting appropriate sizing, configuring RAID/storage, and abstracting hardware differences for consistent operation.

## TL;DR Checklist

- [ ] Define workload requirements (CPU, memory, storage I/O, network bandwidth) before selecting hardware
- [ ] Choose cloud instance type or on-prem hardware that matches workload profile
- [ ] Verify CPU architecture compatibility (x86_64 vs ARM64) for all software dependencies
- [ ] Select RAID level based on workload durability vs performance requirements
- [ ] Configure SSD/NVMe optimization (TRIM support, I/O scheduler)
- [ ] Set up hardware monitoring (SMART, IPMI, sensor data)
- [ ] Document hardware inventory and configuration for change management
- [ ] Test workload on target hardware with representative benchmarks before production deployment

