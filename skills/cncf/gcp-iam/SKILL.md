---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages identity and access control with service accounts, roles, and"
  fine-grained permissions.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-rbac, gcp-cloud-kms, gcp-cloud-sql, gcp-compute-engine
  role: reference
  scope: infrastructure
  triggers: iam, identity access management, service account, roles, permissions,
    access control, kubernetes service, container orchestration
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
name: iam
------
# Google Cloud IAM

Deploy and manage google cloud iam infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

