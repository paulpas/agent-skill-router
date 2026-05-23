---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides Object storage with versioning, lifecycle policies, and integration
  to other Azure services
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-cdn, azure-key-vault, azure-monitor, azure-rbac
  role: reference
  scope: infrastructure
  triggers: blob storage, object storage, azure storage, storage account, blob, how
    do i store files, s3, file storage
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
name: blob-storage
------
# Azure Blob Storage

Deploy and manage azure blob storage infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

