---
name: on-prem-infrastructure
description: Engineers on-premises infrastructure including IPMI/iLO/iDRAC remote
  management, PXE deployment, network storage (NFS/iSCSI/FC), multipath I/O, and datacenter
  physical operations for bare-metal Linux systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: IPMI, iLO, iDRAC, PXE boot, iSCSI, multipath, bare-metal provisioning,
    datacenter rack
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
  related-skills: hardware-provisioning, networking, kernel-tuning, linux-security
  maturity: draft
  completeness: 90
  exampleCount: 6
------

# On-Premises Infrastructure Engineering

Infrastructure engineer managing physical servers, datacenter operations, and network-attached hardware for on-premises Linux environments — covering remote management (IPMI/iLO/iDRAC), PXE deployment, network storage (NFS/iSCSI/FC), multipath I/O, and datacenter physical operations.

## TL;DR Checklist

- [ ] Verify BMC/management interface accessibility via IPMI before any remote hardware operation
- [ ] Configure multipath I/O for all SAN-attached storage with appropriate failover policy
- [ ] Set up NFS mounts with hard/async or soft/sync options matching workload criticality
- [ ] Test PXE boot workflow with a non-production host before mass deployment
- [ ] Validate NTP/PTP synchronization across all on-prem systems for time-sensitive operations
- [ ] Check thermal and power metrics (sensors, PDU) before any hardware replacement procedure
- [ ] Document datacenter rack position, U slot, cable IDs, and BMC IP for every server

