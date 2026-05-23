---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys and manages virtual machine instances with auto-scaling, instance
  groups, and integration with GCP services for IaaS workloads"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-autoscaling, gcp-cloud-cdn, gcp-cloud-dns, gcp-cloud-monitoring
  role: reference
  scope: infrastructure
  triggers: compute engine, gce, virtual machine, vm, auto-scaling, instance group
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
name: compute-engine
------
# Google Compute Engine

Deploy and manage google compute engine infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

