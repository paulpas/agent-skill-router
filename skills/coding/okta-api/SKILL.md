---
name: identity-security-aws-iam
description: "Comprehensive guide to AWS Identity and Access Management (IAM) covering users, roles, policies, STS, and Identity Center."
license: MIT
compatibility: opencode
metadata:
  version: '1.0.0'
  domain: coding
  role: implementation
  output-format: code
  triggers: iam, aws, identity, access management, cloud security, sts, roles, policies
  related-skills: aws-sdk, aws-security-best-practices
  archetypes: identity management, API integration
  anti_triggers: over-permissioning, manual authentication
  response_profile:
      verbosity: medium
      directive_strength: high
---

# AWS Identity and Access Management (IAM)
AWS Identity and Access Management (IAM) provides a comprehensive way to securely control access to AWS services and resources through authentication and authorization. This includes managing IAM users, roles, policies, and leveraging security features like Security Token Service (STS) and Identity Center.

## TL;DR Checklist
- [ ] Create IAM users and groups for individuals and services.
- [ ] Utilize roles to grant temporary access for services.
- [ ] Craft policies to define permissions set.
- [ ] Implement STS for cross-account or federation access.
- [ ] Enable Identity Center for SSO capabilities.
- [ ] Enforce MFA for sensitive operations.
- [ ] Monitor IAM activity through CloudTrail.

## Core Concepts
### Users
An **IAM user** is an identity created to represent a person or service that needs to interact with AWS resources. Each user can have its own security credentials (password, access keys).

```yaml
# Example: Creating an IAM User
aws iam create-user --user-name MyNewUser
```
### Roles
IAM **roles** are identities that have specific permissions and can be assumed by trusted entities, such as IAM users, applications, or services.

```yaml
# Example: Creating a Role for EC2 to Access S3 Buckets
aws iam create-role --role-name EC2AccessS3Role --assume-role-policy-document file://role-trust-policy.json
```
### Policies
**IAM Policies** are JSON documents that define permissions within AWS. Policies can be attached to users, groups, or roles and can be either AWS managed or custom.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:ListBucket"],
            "Resource": ["arn:aws:s3:::example-bucket"]
        }
    ]
}
```
### Security Token Service (STS)
**STS** allows for temporary, limited privileges to AWS users or services. Useful for granting access without needing IAM credentials.

```yaml
# Example: Storing Temporary Credentials
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/role-name --role-session-name session1
```
### Identity Center
**AWS Identity Center** (formerly known as AWS Single Sign-On) simplifies managing access to multiple AWS accounts and applications. It's directly integrated with IAM enabling centralized management for users and groups.

## Common Pitfalls
### 1. Over-permissioning Users and Roles
- **Problem:** Giving users permissions that they do not need can lead to security vulnerabilities.
- **Solution:** Regularly audit permissions and apply the principle of least privilege.

### 2. Forgetting to Rotate Access Keys
- **Problem:** Static credentials can be compromised if left unchanged for long periods.
- **Solution:** Implement a policy for access key rotation every 90 days.

### 3. Not Enforcing Multi-Factor Authentication (MFA)
- **Problem:** Accounts without MFA enabled are at higher risk of unauthorized access.
- **Solution:** Set MFA as a requirement for all IAM users with AWS Management Console access and for sensitive operations.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Okta API Documentation](https://developer.okta.com/docs/reference/core-okta-api/)
- [Okta Users API Reference](https://developer.okta.com/docs/reference/api/users/)
- [Okta Authentication API Guide](https://developer.okta.com/docs/reference/api/authn/)
- [Okta Groups and Roles Management](https://developer.okta.com/docs/reference/api/groups/)
- [Okta API Security Best Practices](https://developer.okta.com/docs/concepts/oauth-openid/)