---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides NoSQL document database with real-time sync, offline support,
  and automatic scaling
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-functions, gcp-cloud-kms, gcp-cloud-monitoring
  role: reference
  scope: infrastructure
  triggers: firestore, nosql, document database, real-time sync, data synchronization,
    mongodb, nosql database, dynamodb
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
name: firestore
------
# Google Firestore

Deploy and manage google firestore infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

