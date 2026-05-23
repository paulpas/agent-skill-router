---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages sensitive data with automatic encryption, rotation, and fine-grained"
  access control for database passwords, API keys, and credentials.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-iam, aws-kms, aws-lambda, aws-ssm
  role: reference
  scope: infrastructure
  triggers: credential rotation, password rotation, secret management, secrets manager,
    sensitive data
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
name: secrets-manager
------
# Secrets Manager

Manage sensitive credentials with automatic encryption, rotation, and fine-grained access control across AWS services and applications.

## TL;DR Checklist

- [ ] Store all credentials in Secrets Manager (never hardcode)
- [ ] Enable automatic rotation for database credentials
- [ ] Use Lambda for custom rotation logic
- [ ] Encrypt secrets with customer-managed KMS keys
- [ ] Implement resource-based policies for access
- [ ] Monitor secret access via CloudTrail
- [ ] Test rotation procedures before production
- [ ] Use secret tags for organization and access control
- [ ] Enable CloudWatch events for rotation alerts
- [ ] Replicate secrets to secondary regions for DR

