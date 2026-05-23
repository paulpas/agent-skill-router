---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Provides managed relational databases (MySQL, PostgreSQL) with automated
  backups, replication, and encryption"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-cloud-kms, gcp-cloud-monitoring, gcp-iam, gcp-vpc
  role: reference
  scope: infrastructure
  triggers: cloud sql, relational database, mysql, postgresql, managed database, postgres,
    sql database
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
name: cloud-sql
------
# Google Cloud SQL

Deploy and manage google cloud sql infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

