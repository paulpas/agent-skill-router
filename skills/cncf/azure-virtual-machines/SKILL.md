---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys and manages VMs with auto-scaling, availability sets, and integration"
  with Azure services.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-automation, azure-monitor, azure-rbac, azure-scale-sets
  role: reference
  scope: infrastructure
  triggers: virtual machines, vm, azure vm, compute, instance types, scaling, ec2,
    servers
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
name: virtual-machines
------
# Azure Virtual Machines

Deploy and manage azure virtual machines infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

