---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides Managed Kubernetes cluster with automatic scaling, networking,
  and GCP service integration"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-autoscaling, gcp-cloud-monitoring, gcp-container-registry, gcp-vpc
  role: reference
  scope: infrastructure
  triggers: gke, kubernetes, container orchestration, k8s, managed kubernetes
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
name: gke
------
# Google Kubernetes Engine

Deploy and manage google kubernetes engine infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

