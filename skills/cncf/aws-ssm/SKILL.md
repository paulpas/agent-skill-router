---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages EC2 instances and on-premises servers with AWS Systems Manager"
  for configuration management, patch management, and secure shell access without
  SSH keys.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-ec2, aws-iam, aws-secrets-manager
  role: reference
  scope: infrastructure
  triggers: configuration management, parameter store, patch management, session manager,
    ssm, systems manager, ansible, automation
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
name: ssm
------
# SSM (AWS Systems Manager)

Manage configuration, patches, and secure shell access for EC2 instances and on-premises servers without SSH keys or bastion hosts.

## TL;DR Checklist

- [ ] Install SSM agent on all instances (pre-installed on recent AMIs)
- [ ] Create IAM role with AmazonSSMManagedInstanceCore policy
- [ ] Use Session Manager for secure shell access (no SSH keys)
- [ ] Enable CloudTrail logging of Session Manager sessions
- [ ] Use Parameter Store for application configuration
- [ ] Enable Patch Manager for automated patching
- [ ] Implement maintenance windows for patch deployment
- [ ] Use State Manager for configuration compliance
- [ ] Monitor session and patch activity
- [ ] Configure session recording to S3 for audit

