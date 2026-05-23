---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Manages DNS with health checks, traffic routing, and low-latency resolution
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-load-balancing, gcp-cloud-monitoring, gcp-compute-engine,
    gcp-vpc gcp-vpc
  role: reference
  scope: infrastructure
  triggers: cloud dns, dns, domain name, health checks, traffic routing, route53,
    domain management
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
name: cloud-dns
------
# Google Cloud DNS

Deploy and manage google cloud dns infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

