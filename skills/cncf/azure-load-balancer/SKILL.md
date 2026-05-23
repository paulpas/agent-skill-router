---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides Distributes traffic across VMs with health probes and rule-based
  routing
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-monitor, azure-scale-sets, azure-traffic-manager, azure-virtual-networks
  role: reference
  scope: infrastructure
  triggers: load balancer, load balancing, traffic distribution, health checks, routing,
    elb, route53, dns
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
name: load-balancer
------
# Azure Load Balancer

Deploy and manage azure load balancer infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

