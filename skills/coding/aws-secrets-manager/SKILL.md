---
name: aws-secrets-manager
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
---

## AWS Secrets Manager: Comprehensive Guide
AWS Secrets Manager is a critical service that aids in securely managing sensitive information such as passwords, secrets, and API keys. This guide covers best practices, implementation steps, and relevant examples.

### Key Features:
- **Centralized Secret Management**: Use Secrets Manager to store all your sensitive information in one location, enhancing security and management.
- **Automatic Credential Rotation**: Simplify secret rotation without manual user intervention, integrating seamlessly with other AWS services.
- **IAM Integration**: Utilize AWS Identity and Access Management (IAM) for robust security by defining fine-grained access permissions.

### Security Best Practices:
1. **Use Encryption at Rest**: AWS Secrets Manager automatically encrypts secrets at rest using AWS KMS, improving data security considerably.
2. **Access Monitoring with CloudTrail**: Track access requests with AWS CloudTrail to maintain compliance and audit logs.
3. **Implement Least Privilege Access**: Define least privilege access policies using IAM, only granting permissions necessary for users or roles.
4. **Security Audit Practices**: Regularly audit services that access your secrets, ensuring that only those who need access retain permissions.

### Example: Using AWS Secrets Manager with Boto3
```python
import boto3

# Create a Secrets Manager client
client = boto3.client('secretsmanager')

# Create a new secret
client.create_secret(
    Name='MyDatabaseSecret',
    SecretString='{"username":"admin", "password":"Password123"}'
)

# Retrieve the secret
get_secret_value_response = client.get_secret_value(SecretId='MyDatabaseSecret')
print(get_secret_value_response['SecretString'])
```

### FAQ:
- **Can IAM roles be used with Lambda functions?**  
Yes! AWS Lambda functions can assume IAM roles for dynamic permission management.
- **How is secret access tracked?**  
AWS CloudTrail provides logging for all secret accesses and actions taken on the secrets.
- **What types of secrets can be managed?**  
AWS Secrets Manager can store API keys, database credentials, and any sensitive information that needs management.

By implementing AWS Secrets Manager, organizations can securely manage sensitive information while automating key management processes and complying with organizational security policies. Maximizing the utilization of AWS services enables better governance, reducing security risks significantly.

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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/)
- [Secrets Manager Getting Started](https://docs.aws.amazon.com/secretsmanager/latest/userguide/sec_manager_chap.html)
- [Automatic Secret Rotation Guide](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Boto3 Secrets Manager Client Reference](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/secretsmanager.html)
- [Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)