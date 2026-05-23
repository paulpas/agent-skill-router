---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides Content delivery network for caching and globally distributing
  content with low latency
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-load-balancing, gcp-cloud-monitoring, gcp-cloud-storage,
    gcp-compute-engine gcp-compute-engine
  role: reference
  scope: infrastructure
  triggers: cloud cdn, cdn, content delivery, caching, global distribution, cloudfront,
    elasticache, redis
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
name: cloud-cdn
------
# Google Cloud CDN

Deploy and manage google cloud cdn infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

