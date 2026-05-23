---
name: storage-architecture
description: Designs and implements Linux storage architectures for cloud block storage
  and on-prem SAN/NAS with performance and durability guarantees.
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
  triggers: storage architecture, LVM, filesystem, XFS, ext4, btrfs, cloud storage,
    NVMe, mount options, storage monitoring
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: hardware-provisioning, resource-management, kernel-tuning, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Storage Architecture

Storage engineer designing and implementing Linux storage architectures for cloud block storage and on-prem SAN/NAS, selecting appropriate filesystems, configuring LVM, optimizing mount options, and monitoring storage health for performance and durability.

## TL;DR Checklist

- [ ] Select filesystem based on workload requirements (XFS for large files, ext4 for compatibility, btrfs for snapshots)
- [ ] Configure LVM volumes with appropriate PE size, striping, and mirroring
- [ ] Apply mount options optimized for the workload type (noatime, nodiratime, barrier settings)
- [ ] Enable TRIM/discard for SSD/NVMe storage and configure periodic fstrim
- [ ] Set up storage monitoring for IOPS, throughput, latency, and capacity
- [ ] Configure cloud block storage with appropriate IOPS and throughput profiles
- [ ] Implement backup strategy with filesystem-appropriate tools (xfsdump, e2backup, btrfs send/receive)
- [ ] Validate storage performance with fio benchmarks before production deployment

