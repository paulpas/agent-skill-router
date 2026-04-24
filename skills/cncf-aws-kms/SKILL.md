---
name: cncf-aws-kms
description: Manages encryption keys with AWS KMS for data protection at rest and
  in transit, key rotation, and compliance with encryption standards across all AWS
  services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cmk, customer-managed key, data encryption, encryption, key management,
    key rotation, kms
  related-skills: cncf-aws-s3, cncf-aws-rds, cncf-aws-dynamodb, cncf-aws-iam
---


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

---

## When to Use

Use KMS when:

- Encrypting sensitive data (PII, credentials, intellectual property)
- Meeting compliance requirements (HIPAA, PCI-DSS, SOC 2)
- Controlling who can decrypt specific data
- Auditing encryption operations via CloudTrail
- Separating encryption key management from data access

---

## When NOT to Use

Avoid KMS for:

- Non-sensitive data (public content)
- High-volume encryption (consider S3 managed encryption)
- Real-time encryption of streaming data (performance sensitive)

---

## Purpose and Use Cases

**Primary Purpose:** Provide centralized, audited encryption key management with fine-grained access control and compliance capabilities.

**Common Use Cases:**

1. **Data Encryption** — Protect sensitive data at rest in S3, RDS, DynamoDB
2. **Credential Protection** — Encrypt secrets and passwords
3. **Compliance** — Meet regulatory encryption requirements
4. **Access Control** — Control who can decrypt specific data
5. **Audit Trail** — CloudTrail logging of all encryption operations
6. **Key Rotation** — Automatic annual key rotation

---

## Architecture Design Patterns

### Pattern 1: Customer-Managed Key with Automatic Rotation

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Customer-Managed Key
  DataEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Customer-managed key for sensitive data encryption
      EnableKeyRotation: true  # Automatic annual rotation
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          # Enable IAM user permissions
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          # Allow services to use the key for encryption
          - Sid: Allow AWS Services
            Effect: Allow
            Principal:
              Service:
                - s3.amazonaws.com
                - rds.amazonaws.com
                - dynamodb.amazonaws.com
                - lambda.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
              - 'kms:CreateGrant'
            Resource: '*'
          # Allow specific IAM role to use the key
          - Sid: Allow Application Role to Encrypt/Decrypt
            Effect: Allow
            Principal:
              AWS: arn:aws:iam::123456789012:role/ApplicationRole
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
              - 'kms:DescribeKey'
            Resource: '*'
          # Allow key administrators
          - Sid: Allow Key Administrators
            Effect: Allow
            Principal:
              AWS: arn:aws:iam::123456789012:role/AdminRole
            Action:
              - 'kms:Create*'
              - 'kms:Describe*'
              - 'kms:Enable*'
              - 'kms:List*'
              - 'kms:Put*'
              - 'kms:Update*'
              - 'kms:Revoke*'
              - 'kms:Disable*'
              - 'kms:Get*'
              - 'kms:Delete*'
              - 'kms:ScheduleKeyDeletion'
              - 'kms:CancelKeyDeletion'
            Resource: '*'
          # Deny usage from root account (security best practice)
          - Sid: Deny Unauthenticated Access
            Effect: Deny
            Principal: '*'
            Action: 'kms:*'
            Resource: '*'
            Condition:
              StringEquals:
                aws:PrincipalType: 'Anonymous'

  # Key Alias
  DataEncryptionKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/data-encryption-prod
      TargetKeyId: !Ref DataEncryptionKey

  # CloudWatch Alarm for Key Disable
  KeyDisabledAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: kms-key-disabled
      MetricName: UserErrorCount
      Namespace: AWS/KMS
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: Key ID
          Value: !Ref DataEncryptionKey

Outputs:
  KeyId:
    Value: !Ref DataEncryptionKey
    Description: KMS Key ID
  KeyArn:
    Value: !GetAtt DataEncryptionKey.Arn
    Description: KMS Key ARN
  KeyAlias:
    Value: !Ref DataEncryptionKeyAlias
    Description: KMS Key Alias
```

**Key Elements:**
- Customer-managed key (not AWS-managed)
- Automatic annual key rotation enabled
- Least-privilege key policy
- Service-specific permissions
- Admin role separation
- Audit logging enabled (default)

### Pattern 2: Multi-Service Encryption with Separate Keys

```yaml
Resources:
  # S3 Encryption Key
  S3EncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Key for S3 bucket encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow S3 to Use Key
            Effect: Allow
            Principal:
              Service: s3.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
            Resource: '*'

  # RDS Encryption Key
  RDSEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Key for RDS database encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow RDS to Use Key
            Effect: Allow
            Principal:
              Service: rds.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
              - 'kms:CreateGrant'
            Resource: '*'

  # DynamoDB Encryption Key
  DynamoDBEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Key for DynamoDB table encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow DynamoDB to Use Key
            Effect: Allow
            Principal:
              Service: dynamodb.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
            Resource: '*'

  # Aliases
  S3KeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/s3-encryption
      TargetKeyId: !Ref S3EncryptionKey

  RDSKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/rds-encryption
      TargetKeyId: !Ref RDSEncryptionKey

  DynamoDBKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/dynamodb-encryption
      TargetKeyId: !Ref DynamoDBEncryptionKey
```

**Key Elements:**
- Separate keys per service/data type
- Service-specific permissions
- Alias for easy reference
- Rotation enabled on all keys

### Pattern 3: Grant-Based Access Control

```yaml
Resources:
  # Lambda Function Role
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole

  # Grant for Lambda to decrypt
  LambdaDecryptGrant:
    Type: AWS::KMS::Grant
    Properties:
      KeyId: !Ref DataEncryptionKey
      GranteePrincipal: !GetAtt LambdaExecutionRole.Arn
      Operations:
        - Decrypt
        - GenerateDataKey
        - DescribeKey
      Constraints:
        EncryptionContextSubset:
          Department: Finance  # Only decrypt Finance department data

  # EC2 Instance Role
  EC2InstanceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole

  # Grant for EC2 to decrypt
  EC2DecryptGrant:
    Type: AWS::KMS::Grant
    Properties:
      KeyId: !Ref DataEncryptionKey
      GranteePrincipal: !GetAtt EC2InstanceRole.Arn
      Operations:
        - Decrypt
      Constraints:
        EncryptionContextEquals:
          DataType: CustomerData  # Only decrypt customer data
```

**Key Elements:**
- Grant-based access (fine-grained, temporary)
- Context-based constraints (only decrypt specific data)
- Grantee principal receives decrypt permission
- More flexible than key policy

---

## Integration Approaches

### 1. Integration with S3

S3 + KMS enables:
- Server-side encryption with customer-managed keys
- Bucket-wide encryption policy
- CloudTrail logging of decrypt operations

### 2. Integration with RDS

RDS + KMS enables:
- Database encryption at rest with CMK
- Key rotation without downtime
- Cross-region replica encryption

### 3. Integration with Secrets Manager

Secrets Manager + KMS provides:
- Automatic encryption of secrets
- Key rotation tied to secret rotation
- Fine-grained access to secrets

### 4. Integration with CloudTrail

CloudTrail + KMS enables:
- Audit trail of all encryption operations
- Compliance evidence
- Access pattern analysis

---

## Common Pitfalls

### ❌ Pitfall 1: Using AWS-Managed Keys

**Problem:** Cannot control who can decrypt; cannot audit usage patterns.

**Solution:**
- Use customer-managed keys (CMK) for sensitive data
- AWS-managed keys acceptable for general-purpose encryption

### ❌ Pitfall 2: Overly Permissive Key Policy

**Problem:** Too many principals can decrypt sensitive data.

**Solution:**
- Grant permissions only to specific principals
- Use encryption context to add constraints
- Principle of least privilege

### ❌ Pitfall 3: Root Account Can Decrypt

**Problem:** Compromised AWS account = compromised data.

**Solution:**
- Deny root account decrypt permission explicitly
- Use separate keys for different data sensitivity levels
- Admin accounts only for key management, not data access

### ❌ Pitfall 4: No Key Rotation

**Problem:** Compromised key remains in use indefinitely.

**Solution:**
- Enable automatic key rotation (annual default)
- Manually rotate keys on compromise
- Monitor rotation status in CloudTrail

### ❌ Pitfall 5: Single Key for All Services

**Problem:** Compromise of one service affects all data.

**Solution:**
- Separate keys by service and data sensitivity
- Use multi-service approach with distinct keys
- Reduces blast radius of compromise

### ❌ Pitfall 6: No Key Usage Monitoring

**Problem:** Cannot detect suspicious decrypt patterns.

**Solution:**
- Enable CloudTrail logging (automatic)
- Set up alarms for unusual activity
- Regular audit of CloudTrail logs

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Key Type** | Customer-managed keys for sensitive data |
| **Rotation** | Enable automatic annual rotation |
| **Policy** | Least privilege; deny root account |
| **Context** | Use encryption context for constraints |
| **Monitoring** | CloudTrail logging; alert on anomalies |
| **Multi-region** | Multi-region keys for disaster recovery |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-s3` | S3 encryption with KMS |
| `cncf-aws-rds` | Database encryption with KMS |
| `cncf-aws-dynamodb` | DynamoDB encryption with KMS |
| `cncf-aws-secrets-manager` | Secret encryption with KMS |
