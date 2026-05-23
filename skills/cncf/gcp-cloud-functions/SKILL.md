---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Deploys serverless functions triggered by events with automatic scaling
  and GCP service integration
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-monitoring, gcp-cloud-tasks, gcp-container-registry, gcp-secret-manager
  role: reference
  scope: infrastructure
  triggers: cloud functions, serverless, functions, event-driven, function deployment,
    eventbridge, kubernetes deployment, container orchestration
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
name: cloud-functions
------
# Google Cloud Functions

Deploy and manage google cloud functions infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

