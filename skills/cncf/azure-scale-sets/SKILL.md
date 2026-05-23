---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages auto-scaling VM groups with load balancing and health management"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-load-balancer, azure-monitor, azure-virtual-machines, azure-virtual-networks
  role: reference
  scope: infrastructure
  triggers: scale sets, vmss, auto-scaling, scaling, vm groups, autoscaling
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  version: 1.0.0
name: scale-sets
------
# Azure Virtual Machine Scale Sets

Deploy and manage azure virtual machine scale sets infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

