---
name: aws-iam
description: Implements AWS IAM (Identity and Access Management) integration (Users,
  Roles, Policies, Groups, Access Keys, MFA, STS, Identity Center) using boto3 SDK
  with proper credential chain, policy validation, least privilege principle, and
  temporary credentials.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: aws iam, boto3 iam, aws roles, iam policies, sts assume role, aws access
    keys, aws mfa, how do i manage aws iam
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-entra-id-api, coding-okta-api, coding-vault-api
------

# AWS IAM Integration (Identity & Access Management)

Implements production-grade AWS IAM (Identity and Access Management) integration using the `boto3` Python SDK. When loaded, this skill makes the model implement IAM user lifecycle management (create, access keys, MFA), IAM groups and managed policies, IAM roles and trust policies, STS (Security Token Service) operations (AssumeRole, GetFederationToken, GetSessionToken), policy validation using IAM Access Analyzer, permission boundary enforcement, least privilege principle implementation, and credential chain best practices. All implementations follow AWS security best practices: use default credential provider chain, rotate access keys, enforce MFA for console and API access, use roles instead of long-term credentials, use permission boundaries, validate policies before deployment, and monitor access with CloudTrail.

## TL;DR Checklist

- [ ] Use boto3 with default credential chain (never hardcode credentials)
- [ ] `import boto3` then `iam = boto3.client('iam')` or `sts = boto3.client('sts')`
- [ ] Use resource-level APIs for simpler operations: `iam = boto3.resource('iam')`
- [ ] Always validate policies using `validate_policy()` or Access Analyzer
- [ ] Use `sts.assume_role()` for cross-account access instead of access keys
- [ ] Enforce MFA in trust policies with `aws:MultiFactorAuthPresent` condition
- [ ] Rotate access keys: create 2nd key, migrate apps, disable old, delete
- [ ] Use permission boundaries to delegate admin safely
- [ ] Use roles for EC2, Lambda, ECS (instance profiles, execution roles)
- [ ] Use `sts.get_caller_identity()` to verify which identity is being used
- [ ] Managed policies over inline policies for reusability and versioning
- [ ] Policy versions: keep max 5, delete old versions when creating new
- [ ] Trust policies: limit principals, use external IDs for third-party access

