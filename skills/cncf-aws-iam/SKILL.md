---
name: cncf-aws-iam
description: Configures identity and access management with IAM users, roles, policies,
  and MFA for secure, least-privilege access control across AWS resources and services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: iam, identity management, access control, iam role, iam policy, mfa, least
    privilege, service role
  related-skills: cncf-aws-cloudformation, cncf-aws-ec2, cncf-aws-ecr, cncf-aws-eks
---


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

---

## When to Use

Use IAM when:

- Managing access to AWS resources for users and services
- Implementing least-privilege security model
- Building multi-account architectures
- Enabling federated access (SAML, OIDC)
- Delegating permissions to applications and EC2 instances
- Implementing role-based access control (RBAC)

---

## When NOT to Use

Avoid IAM for:

- Authenticating applications (use Cognito instead)
- Managing database users (use database-native auth)
- Application-level authorization (implement in application code)

---

## Purpose and Use Cases

**Primary Purpose:** Provide centralized identity and access management for AWS resources with fine-grained, least-privilege permissions.

**Common Use Cases:**

1. **User Access Control** — Grant developers, ops, and admins appropriate permissions
2. **Cross-Account Access** — Enable one account to access resources in another
3. **Service-to-Service Auth** — EC2, Lambda, ECS access other AWS services
4. **Federated Access** — SAML/OIDC integration with corporate directories
5. **API Authentication** — Programmatic access with access keys
6. **Role-Based Access** — Different permissions for different teams/functions

---

## Architecture Design Patterns

### Pattern 1: Least-Privilege IAM Roles for Application Services

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # IAM Role for EC2 Application Servers
  EC2ApplicationRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: app-ec2-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                aws:SourceAccount: !Ref 'AWS::AccountId'
      Tags:
        - Key: Purpose
          Value: ec2-application

  # Policy: Read S3 bucket for application data
  EC2S3ReadPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: ec2-s3-read
      Roles:
        - !Ref EC2ApplicationRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ListBucket
            Effect: Allow
            Action:
              - s3:ListBucket
            Resource: arn:aws:s3:::app-data-bucket
            Condition:
              StringLike:
                s3:prefix: 
                  - configs/
                  - assets/
          - Sid: GetObjects
            Effect: Allow
            Action:
              - s3:GetObject
              - s3:GetObjectVersion
            Resource: arn:aws:s3:::app-data-bucket/configs/*
          - Sid: DenyUnencryptedTransport
            Effect: Deny
            Action: s3:*
            Resource: '*'
            Condition:
              Bool:
                aws:SecureTransport: 'false'

  # Policy: Write logs to CloudWatch
  EC2CloudWatchLogsPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: ec2-cloudwatch-logs
      Roles:
        - !Ref EC2ApplicationRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: CreateLogGroup
            Effect: Allow
            Action:
              - logs:CreateLogGroup
              - logs:CreateLogStream
            Resource: arn:aws:logs:*:*:log-group:/app/production:*
          - Sid: PutLogEvents
            Effect: Allow
            Action: logs:PutLogEvents
            Resource: arn:aws:logs:*:*:log-group:/app/production:*

  # Policy: Write metrics to CloudWatch
  EC2CloudWatchMetricsPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: ec2-cloudwatch-metrics
      Roles:
        - !Ref EC2ApplicationRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: PutMetricData
            Effect: Allow
            Action: cloudwatch:PutMetricData
            Resource: '*'
            Condition:
              StringLike:
                cloudwatch:namespace: 'app/production'

  # Instance Profile (required for EC2 role)
  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2ApplicationRole

  # IAM Role for Lambda Function
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: app-lambda-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # Policy: Lambda writes to DynamoDB
  LambdaDynamoDBPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: lambda-dynamodb-write
      Roles:
        - !Ref LambdaExecutionRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: WriteToDynamoDBTable
            Effect: Allow
            Action:
              - dynamodb:PutItem
              - dynamodb:UpdateItem
            Resource: arn:aws:dynamodb:*:*:table/app-events

  # Policy: Lambda reads from SQS queue
  LambdaSQSReadPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: lambda-sqs-read
      Roles:
        - !Ref LambdaExecutionRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ReadFromSQS
            Effect: Allow
            Action:
              - sqs:ReceiveMessage
              - sqs:DeleteMessage
              - sqs:GetQueueAttributes
            Resource: arn:aws:sqs:*:*:app-queue

  # Policy: Lambda access to KMS for decryption
  LambdaKMSPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: lambda-kms-decrypt
      Roles:
        - !Ref LambdaExecutionRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: DecryptWithKMS
            Effect: Allow
            Action:
              - kms:Decrypt
              - kms:DescribeKey
            Resource: arn:aws:kms:*:*:key/*
            Condition:
              StringEquals:
                kms:ViaService: 
                  - dynamodb.us-east-1.amazonaws.com
                  - sqs.us-east-1.amazonaws.com
```

**Key Elements:**
- Separate roles for different services (EC2, Lambda, ECS)
- Least-privilege policies with explicit resource ARNs
- Deny policies for insecure transport
- Service-specific trust relationships
- Conditions to limit when roles can be assumed
- No wildcard permissions on sensitive resources

### Pattern 2: Cross-Account Role for Multi-Account Architecture

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Trust relationship: allow another account to assume role
  CrossAccountRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: cross-account-access-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          # Allow specific AWS account
          - Sid: AllowAnotherAccountAssume
            Effect: Allow
            Principal:
              AWS: arn:aws:iam::987654321098:root
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: 'UniqueExternalId123'
          # Allow specific role in another account
          - Sid: AllowSpecificRoleAssume
            Effect: Allow
            Principal:
              AWS: arn:aws:iam::987654321098:role/cross-account-automation
            Action: sts:AssumeRole
            Condition:
              IpAddress:
                aws:SourceIp: 
                  - 10.0.0.0/8  # VPN range

  # Policy: Allow reading from S3 across accounts
  CrossAccountS3Policy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: cross-account-s3-read
      Roles:
        - !Ref CrossAccountRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ReadSharedBucket
            Effect: Allow
            Action:
              - s3:ListBucket
              - s3:GetObject
            Resource:
              - arn:aws:s3:::shared-data-bucket
              - arn:aws:s3:::shared-data-bucket/*
            Condition:
              StringLike:
                s3:prefix:
                  - shared-prefix/

  # Resource-based policy on S3 bucket for cross-account access
  CrossAccountS3BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: shared-data-bucket
      PolicyText:
        Version: '2012-10-17'
        Statement:
          - Sid: AllowCrossAccountAccess
            Effect: Allow
            Principal:
              AWS: arn:aws:iam::987654321098:role/cross-account-access-role
            Action:
              - s3:ListBucket
              - s3:GetObject
            Resource:
              - arn:aws:s3:::shared-data-bucket
              - arn:aws:s3:::shared-data-bucket/*
```

**Key Elements:**
- External ID for additional security
- IP-based conditions for role assumption
- Specific account and role principals
- Resource-based policies for S3 bucket access
- Scoped to specific prefixes/resources

### Pattern 3: User IAM Policies with MFA Enforcement

```yaml
Resources:
  # Developer User
  DeveloperUser:
    Type: AWS::IAM::User
    Properties:
      UserName: john.developer
      Tags:
        - Key: Team
          Value: engineering
        - Key: Role
          Value: developer

  # Developer Group
  DeveloperGroup:
    Type: AWS::IAM::Group
    Properties:
      GroupName: developers

  # Add user to group
  DeveloperGroupMembership:
    Type: AWS::IAM::UserToGroupAdditionType
    Properties:
      GroupName: !Ref DeveloperGroup
      Users:
        - !Ref DeveloperUser

  # Policy: Developers can assume dev role with MFA
  DeveloperPolicyWithMFA:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: developer-assume-dev-role
      Groups:
        - !Ref DeveloperGroup
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: AssumeDevRoleWithMFA
            Effect: Allow
            Action: sts:AssumeRole
            Resource: arn:aws:iam::*:role/developer-access-role
            Condition:
              Bool:
                aws:MultiFactorAuthPresent: 'true'
          - Sid: AllowMFADeviceManagement
            Effect: Allow
            Action:
              - iam:CreateVirtualMFADevice
              - iam:DeleteVirtualMFADevice
              - iam:ListMFADevices
              - iam:ResyncMFADevice
            Resource: !Sub 'arn:aws:iam::${AWS::AccountId}:mfa/${aws:username}'
          - Sid: DenyUnprotectedActions
            Effect: Deny
            Action: iam:*
            Resource: '*'
            Condition:
              Bool:
                aws:MultiFactorAuthPresent: 'false'

  # Developer Access Role (to be assumed)
  DeveloperAccessRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: developer-access-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: sts:AssumeRole
            Condition:
              Bool:
                aws:MultiFactorAuthPresent: 'true'

  # Developer permissions
  DeveloperPermissions:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: developer-permissions
      Roles:
        - !Ref DeveloperAccessRole
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: EC2DevelopmentAccess
            Effect: Allow
            Action:
              - ec2:Describe*
              - ec2:Get*
            Resource: '*'
          - Sid: EC2ManageDevInstances
            Effect: Allow
            Action:
              - ec2:RunInstances
              - ec2:TerminateInstances
              - ec2:RebootInstances
            Resource: 
              - arn:aws:ec2:*:*:instance/*
            Condition:
              StringEquals:
                aws:ResourceTag/Environment: 'development'
```

**Key Elements:**
- User and group management
- MFA required for sensitive actions
- Role assumption requires MFA authentication
- Self-service MFA device management
- Environment-based resource access control

---

## Integration Approaches

### 1. Integration with Federated Identity

IAM + SAML/OIDC enables:
- Corporate directory integration (Active Directory, Okta)
- Single sign-on (SSO)
- Just-in-time (JIT) provisioning
- Simplified user lifecycle management

### 2. Integration with Security Token Service (STS)

STS provides:
- Temporary credentials for role assumption
- Cross-account access
- SAML/OIDC federation
- Token duration control

### 3. Integration with CloudTrail

IAM + CloudTrail provides:
- API call auditing
- User activity tracking
- Compliance investigation
- Security incident response

### 4. Integration with AWS Organizations

Organizations + IAM enables:
- Centralized policy management
- Service control policies (SCPs)
- Cross-account automation
- Hierarchical access control

---

## Common Pitfalls

### ❌ Pitfall 1: Using Root Account for Daily Operations

**Problem:** Root has unrestricted access; if compromised, entire account is at risk.

**Solution:**
- Create dedicated IAM admin user with MFA
- Lock away root account credentials
- Use MFA for root account (enable CloudTrail monitoring)
- Never share root credentials

### ❌ Pitfall 2: Overly Permissive Policies

**Problem:** Wildcard permissions violate least-privilege; increase blast radius of compromise.

**Solution:**
- Use specific resource ARNs instead of wildcards
- Grant only actions needed for function
- Use resource tags to scope permissions
- Regular policy audits and cleanup

### ❌ Pitfall 3: Long-Lived Access Keys

**Problem:** Static access keys cannot be rotated; if exposed, compromise persists.

**Solution:**
- Use temporary credentials via role assumption
- Rotate access keys every 90 days
- Use IAM Access Analyzer to find unused credentials
- Monitor access key usage in CloudTrail

### ❌ Pitfall 4: Missing MFA

**Problem:** Password compromise alone grants access; no second factor.

**Solution:**
- Enforce MFA for all human users
- Require MFA for sensitive actions (IAM, billing)
- Hardware keys for highest security
- U2F for phishing resistance

### ❌ Pitfall 5: Hardcoded Credentials

**Problem:** Credentials in code can be accidentally committed; exposed in repositories.

**Solution:**
- Use IAM roles instead of access keys
- Store secrets in Secrets Manager
- Use environment variables for configuration
- Scan code for credential patterns

### ❌ Pitfall 6: No Access Review Process

**Problem:** Users accumulate permissions over time; orphaned accounts still have access.

**Solution:**
- Regular access reviews (quarterly minimum)
- Use IAM Access Analyzer to find unused resources
- Document role purposes and required permissions
- Automate permission cleanup

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Principle of Least Privilege** | Grant only required permissions; deny by default |
| **Role-Based Access** | Use roles instead of attaching policies to users |
| **MFA** | Enforce for human users and sensitive operations |
| **Credentials** | Use temporary credentials; rotate access keys quarterly |
| **Auditing** | Enable CloudTrail; review access regularly |
| **Cross-Account** | Use roles + external IDs for secure delegation |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-secrets-manager` | Secure credential and secret storage |
| `cncf-aws-kms` | Encryption key management and policies |
| `cncf-aws-cloudwatch` | Monitor IAM activity and events |
| `cncf-aws-vpc` | Network-level access control |
