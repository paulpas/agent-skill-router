---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures identity and access management with IAM users, roles, policies"
  and MFA for secure, least-privilege access control across AWS resources and services.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudformation, aws-ec2, aws-ecr, aws-eks
  role: reference
  scope: infrastructure
  triggers: iam, identity management, access control, iam role, iam policy, mfa, least
    privilege, service role
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
# IAM (Identity and Access Management)

Configure fine-grained identity and access management with users, roles, policies, and MFA for secure, least-privilege access across all AWS services.

## TL;DR Checklist

- [ ] Create dedicated IAM roles for each workload/service
- [ ] Apply principle of least privilege to all policies
- [ ] Never use root account for daily operations
- [ ] Enable MFA for all human users
- [ ] Use cross-account roles for multi-account architectures
- [ ] Implement service roles for EC2, Lambda, RDS
- [ ] Enforce assume role conditions (IP, time-based)
- [ ] Monitor role usage with CloudTrail
- [ ] Audit unused roles and permissions regularly
- [ ] Use resource-based policies for cross-service access

