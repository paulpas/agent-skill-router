---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides Stores objects with versioning, lifecycle policies, access
  control, and integration with other GCP services"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-cdn, gcp-cloud-kms, gcp-cloud-monitoring
  role: reference
  scope: infrastructure
  triggers: cloud storage, gcs, object storage, bucket, versioning, storage lifecycle,
    how do i store files, s3
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
name: cloud-storage
------
# Google Cloud Storage

Deploy and manage google cloud storage infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

