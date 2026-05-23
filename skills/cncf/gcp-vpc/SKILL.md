---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides networking with subnets, firewall rules, and VPC peering for
  secure cloud infrastructure"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-dns, gcp-cloud-load-balancing, gcp-cloud-sql, gcp-compute-engine
  role: reference
  scope: infrastructure
  triggers: vpc, virtual private cloud, networking, subnets, firewall, vpc peering,
    availability zones, network segmentation
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
name: vpc
------
# Google Virtual Private Cloud

Deploy and manage google virtual private cloud infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

