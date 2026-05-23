---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides Distributes traffic across instances with automatic failover
  and health checking"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-autoscaling, gcp-cloud-cdn, gcp-cloud-dns, gcp-cloud-monitoring
  role: reference
  scope: infrastructure
  triggers: load balancing, traffic distribution, load balancer, health checks, traffic
    routing, elb
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
name: cloud-load-balancing
------
# Google Cloud Load Balancing

Deploy and manage google cloud load balancing infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

