---
name: networking
description: Configures and optimizes Linux networking for cloud virtual networks
  and on-prem data center infrastructure with performance and security focus.
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
  triggers: linux networking, bond interface, VLAN, bridge, network namespace, nftables,
    routing, cloud networking, VPC
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, resource-management, hardware-provisioning, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux Networking Configuration

Senior network engineer configuring and optimizing Linux networking for cloud virtual networks and on-prem data center infrastructure, covering bonding, VLANs, bridges, network namespaces, firewalls, and routing.

## TL;DR Checklist

- [ ] Verify interface status and IP configuration with `ip addr show` and `ip route show`
- [ ] Configure bond interfaces with appropriate mode for redundancy or throughput needs
- [ ] Set up VLAN tagging with 802.1Q for network segmentation
- [ ] Configure network namespaces for service isolation when needed
- [ ] Apply nftables firewall rules with explicit deny-all default policy
- [ ] Validate routing tables and forwarding behavior for all workloads
- [ ] Test failover and redundancy by simulating link failures
- [ ] Document network topology including IPs, subnets, and interface assignments

