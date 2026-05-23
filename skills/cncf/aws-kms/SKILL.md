---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages encryption keys with AWS KMS for data protection at rest and"
  in transit, key rotation, and compliance with encryption standards across all AWS
  services.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-dynamodb, aws-ecr, aws-iam, aws-rds
  role: reference
  scope: infrastructure
  triggers: cmk, customer-managed key, data encryption, encryption, key management,
    key rotation, kms
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
name: kms
------
# KMS (AWS Key Management Service)

Manage encryption keys and control data encryption at rest and in transit with centralized key management, automatic rotation, and compliance controls.

## TL;DR Checklist

- [ ] Use customer-managed keys (CMK) for sensitive data
- [ ] Enable automatic key rotation (annual)
- [ ] Implement key policies following least privilege
- [ ] Monitor key usage with CloudTrail
- [ ] Separate keys by data sensitivity and service
- [ ] Use multi-region keys for disaster recovery
- [ ] Never allow root account to use key
- [ ] Grant permissions only to specific principals
- [ ] Enable key rotation audit logging
- [ ] Test key failover procedures

