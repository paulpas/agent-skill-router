---
name: kernel-tuning
description: Tunes Linux kernel parameters for workload optimization across cloud
  VMs and bare metal with hardware-aware adjustments for CPU, memory, and network
  performance.
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
  triggers: kernel tuning, sysctl, NUMA, interrupt affinity, page cache, TCP tuning,
    kernel parameters, performance tuning
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, hardware-provisioning, storage-architecture,
    linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Kernel Tuning for Linux Systems

Senior Linux engineer tuning kernel parameters to optimize system performance for specific workloads across cloud virtual machines and bare metal servers. Applies hardware-aware adjustments for CPU topology, memory architecture, and network stacks.

## TL;DR Checklist

- [ ] Audit current sysctl values with `sysctl -a` before any changes
- [ ] Measure baseline performance with workload-appropriate benchmarks
- [ ] Apply kernel parameters in staging before production deployment
- [ ] Verify NUMA topology with `numactl --hardware` and align workloads accordingly
- [ ] Configure interrupt affinity based on CPU core distribution
- [ ] Test TCP parameter changes under realistic network load
- [ ] Persist tuned parameters via `/etc/sysctl.d/` drop-in files
- [ ] Monitor post-change metrics to confirm improvement and no regressions

