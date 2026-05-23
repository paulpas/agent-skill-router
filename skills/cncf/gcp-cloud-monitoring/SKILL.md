---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Monitors GCP resources with metrics, logging, and alerting for operational
  visibility"'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: gcp-autoscaling, gcp-cloud-cdn, gcp-cloud-dns, gcp-cloud-functions
  role: reference
  scope: infrastructure
  triggers: cloud monitoring, monitoring, logging, observability, metrics, alerting,
    cloudwatch, grafana
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
name: cloud-monitoring
------
# Google Cloud Monitoring

Deploy and manage google cloud monitoring infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

