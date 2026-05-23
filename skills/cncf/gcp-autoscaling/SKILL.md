---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides Automatically scales compute resources based on metrics like
  CPU and custom signals"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-load-balancing, gcp-cloud-monitoring, gcp-compute-engine,
    gcp-gke gcp-gke
  role: reference
  scope: infrastructure
  triggers: autoscaling, auto-scaling, scaling, horizontal scaling, vertical scaling
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
name: autoscaling
------
# Google Cloud Autoscaling

Deploy and manage google cloud autoscaling infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

