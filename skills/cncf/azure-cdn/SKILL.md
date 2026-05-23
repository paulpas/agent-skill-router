---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides Content delivery network for caching and global content distribution
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-blob-storage, azure-monitor
  role: reference
  scope: infrastructure
  triggers: cdn, content delivery, content distribution, caching, global delivery,
    cloudfront, elasticache, redis
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
name: cdn
------
# Azure CDN

Deploy and manage azure cdn infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

