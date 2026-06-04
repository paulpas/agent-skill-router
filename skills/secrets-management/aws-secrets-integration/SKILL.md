---
name: aws-secrets-integration
description: Implements AWS Secrets Manager for secure secret storage, management, and automatic rotation of credentials using AWS SDK for Python (Boto3).
license: MIT
compatibility: opencode
metadata:
  version: 1.1.1
  domain: coding
  triggers: aws secrets manager, boto3, secret management, automatic rotation, credential management
  archetypes: [implementation, secret management]
  anti_triggers: [hardcoded secrets]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
---

## Enhanced Content for AWS Secrets Manager Skill

### Overview of AWS Secrets Manager
AWS Secrets Manager is designed to help you protect access to your applications, services, and IT resources without the upfront investment and on-going maintenance costs of operating your own infrastructure. It enables easy and secure management of sensitive information such as API keys, passwords, and other credentials.

### Core Features:
- **Centralized Secrets Management**: Securely store all your secrets in one place.
- **Automatic Rotation**: Set up automatic rotations for credentials ensuring they stay up-to-date without any manual intervention.
- **Integration with IAM**: Utilize AWS Identity and Access Management (IAM) to enforce fine-grained access control.

### Security Best Practices:
1. **Utilize Encryption**: Secrets are encrypted at rest using AWS KMS, ensuring that they are protected from unauthorized access.
2. **Enable CloudTrail Monitoring**: Track who accessed secrets and when, enabling better security auditing.
3. **Implement Required Permissions**: Limit access to secrets based on the principle of least privilege, creating IAM policies that grant only necessary permissions.

### Common Use Cases for AWS Secrets Manager:
1. **Managing Database Credentials**: Automate credential rotation for databases, improving security and compliance.
2. **Storing API Keys**: Securely manage third-party API keys used within your application.
3. **IAM User Credentials**: Manage AWS IAM user credentials effectively.

### Example: How to Use AWS Secrets Manager with Boto3
```python
import boto3

# Create a new Secret
client = boto3.client('secretsmanager')
response = client.create_secret(
    Name='MyDatabaseSecret',
    SecretString='{"username":"admin", "password":"Password123"}'
)

# Retrieve a Secret
get_secret_value_response = client.get_secret_value(SecretId='MyDatabaseSecret')
print(get_secret_value_response['SecretString'])
```

### FAQs Regarding AWS Secrets Manager Functionality:
- **Can I define resource policies to control access to secrets?**  
Yes, you have the ability to define resource-based policies in Secrets Manager to control access.
- **How does automatic rotation work?**  
Automated rotations can be configured using AWS Lambda functions you provide for seamless updates.
- **What happens to my secrets during region outages?**  
AWS Secrets Manager provides redundancy through multi-region support, ensuring that secrets are available when needed.

By adopting best practices and prioritizing security, AWS Secrets Manager plays a crucial role in maintaining the integrity and confidentiality of sensitive information across your applications and services.

---

---

## Constraints

### MUST DO
- Configure all AWS resources with explicit tagging for cost allocation, ownership tracking, and compliance
- Use AWS SDK (Boto3) typed clients instead of resource API where type safety matters — prefer client() over resource()
- Implement error handling that distinguishes between retryable (Throttling, RequestLimitExceeded) and non-retryable errors
- Use IAM roles with least-privilege policies scoped to specific actions and resources, never wildcard permissions

### MUST NOT DO
- Do not hardcode AWS credentials — use IAM roles, environment variables, or AWS Secrets Manager
- Avoid unencrypted S3 buckets or RDS instances in production without explicit KMS encryption configuration
- Never launch EC2 instances without specifying a security group and subnet — always use VPC networking explicitly
- Do not use the default endpoint region — always specify the target region explicitly in all SDK calls


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [AWS Secrets Manager User Guide](https://docs.aws.amazon.com/secretsmanager/latest/userguide/)
- [Boto3 SecretsManager Client Reference](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/secretsmanager.html)
- [Secrets Manager Rotation Functions](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets.html)
- [AWS KMS Key Management for Secrets](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
- [IAM Policies for Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/securing_iam.html)