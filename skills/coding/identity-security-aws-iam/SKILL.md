---
name: identity-security-aws-iam
description: "Comprehensive guide to AWS Identity and Access Management (IAM) covering users, roles, policies, STS, and Identity Center."
license: MIT
compatibility: opencode
metadata:
  archetypes: identity management, cloud security
  anti_triggers: over-permissioning, manual intervention
  response_profile:
      verbosity: medium
      directive_strength: high

  version: '1.0.0'
  domain: coding
  role: implementation
  output-format: code
  triggers: iam, aws, identity, access management, cloud security, sts, roles, policies
  related-skills: aws-sdk, aws-security-best-practices
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

---
## Purpose and Use Cases
**Primary Purpose:** Provide centralized identity and access management for AWS resources, ensuring that users and services have the appropriate permissions while adhering to the principle of least privilege.

### Common Use Cases
1. **User Management** — Grant environmentally specific permissions to users ensuring timely authorizations.
2. **Role Assumption** — Allow AWS services or other accounts to assume roles with permissions tailored to specific tasks.
3. **Policy Enforcement** — Define fine-grained permissions to regulate what actions can be performed on resources.
4. **Cross-Account Access** — Securely share resources and permissions between AWS accounts using roles.
5. **Federated Access Management** — Access AWS resources using Single Sign-On (SSO) or federated identities.
6. **Audit and Compliance** — Ensure compliance using CloudTrail logs to monitor IAM activities.

---
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

---
## Implementation Patterns
### Pattern 1: Creating IAM User and Role
```yaml
# Create an IAM User
aws iam create-user --user-name newUser

# Create a Policy
aws iam create-policy --policy-name ReadOnlyS3Policy --policy-document file://read-only-s3-policy.json

# Attaching IAM Policy to User
aws iam attach-user-policy --user-name newUser --policy-arn arn:aws:iam::aws:policy/ReadOnlyS3Policy

# Create a Role for EC2 Instances
aws iam create-role --role-name EC2AccessRole --assume-role-policy-document file://ec2-role-trust-policy.json

# Attach Policy to Role
aws iam attach-role-policy --role-name EC2AccessRole --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```
### Pattern 2: Role for Lambda with Specific Permissions
```yaml
# Create a Role for Lambda Function
aws iam create-role --role-name LambdaExecutionRole --assume-role-policy-document file://lambda-trust-policy.json

# Attach Policy
aws iam attach-role-policy --role-name LambdaExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Permissions to DynamoDB
aws iam create-policy --policy-name DynamoDBAccessPolicy --policy-document file://dynamodb-access-policy.json
```  
---
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
## Best Practices
- **Implement MFA:** Enable MFA for all root and IAM users for added security.
- **Use Roles for EC2 Instances:** Instead of storing credentials on EC2 instances, assign a role.
- **Leverage IAM Policies Efficiently:** Regularly review and refine IAM policies to maintain security integrity.
- **Audit IAM Usage:** Use AWS CloudTrail to log and monitor IAM activity for compliance purposes.

---
## Conclusion
AWS IAM is a crucial component of security and identity management in the cloud. By adhering to best practices such as the principle of least privilege, continuous monitoring, and periodic audits, organizations can effectively protect their resources and manage identities efficiently.