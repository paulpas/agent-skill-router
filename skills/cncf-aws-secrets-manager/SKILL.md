---
name: cncf-aws-secrets-manager
description: Manages sensitive data with automatic encryption, rotation, and fine-grained
  access control for database passwords, API keys, and credentials.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: credential rotation, password rotation, secret management, secrets manager,
    sensitive data
  related-skills: cncf-aws-iam, cncf-aws-kms, cncf-aws-lambda, cncf-aws-ssm
---


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

---

## When to Use

Use Secrets Manager when:

- Storing database credentials
- Managing API keys and tokens
- Protecting OAuth tokens
- Storing SSH keys
- Managing TLS certificates
- Any sensitive credential management

---

## Purpose and Use Cases

**Primary Purpose:** Centralized, encrypted credential storage with automatic rotation and fine-grained access control.

**Common Use Cases:**

1. **Database Credentials** — RDS password rotation
2. **API Keys** — Third-party service authentication
3. **OAuth Tokens** — Automatic refresh and rotation
4. **SSH Keys** — Secure key storage
5. **TLS Certificates** — Certificate management

---

## Architecture Design Patterns

### Pattern 1: RDS Credential Rotation

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Database Secret
  DatabaseSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: prod/rds/password
      Description: RDS database password with automatic rotation
      SecretString: !Sub |
        {
          "username": "admin",
          "password": "ChangeMe123!",
          "host": "prod-database.c9akciq32.us-east-1.rds.amazonaws.com",
          "port": 5432,
          "dbname": "production",
          "engine": "postgres"
        }
      KmsKeyId: !Ref SecretsEncryptionKey

  # Rotation Lambda Function
  RotationLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: SecretsManagerRotation
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:DescribeSecret
                  - secretsmanager:GetSecretValue
                  - secretsmanager:PutSecretValue
                  - secretsmanager:UpdateSecretVersionStage
                Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:prod/*'
              - Effect: Allow
                Action:
                  - kms:Decrypt
                  - kms:GenerateDataKey
                Resource: !GetAtt SecretsEncryptionKey.Arn

  # Rotation Function
  RotationFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: rds-password-rotation
      Runtime: python3.11
      Handler: index.lambda_handler
      Role: !GetAtt RotationLambdaRole.Arn
      Timeout: 60
      Code:
        ZipFile: |
          import boto3
          import json
          import psycopg2
          import os
          
          secretsmanager = boto3.client('secretsmanager')
          
          def lambda_handler(event, context):
              service_client_id = event['ClientRequestToken']
              secret_id = event['SecretId']
              secret_version_stage = event['ClientRequestTokenStage']
              
              metadata = secretsmanager.describe_secret(SecretId=secret_id)
              versions = metadata["VersionIdsToStages"]
              
              if service_client_id not in versions:
                  secretsmanager.put_secret_value(
                      SecretId=secret_id,
                      ClientRequestToken=service_client_id,
                      SecretString=json.dumps({"password": os.urandom(32).hex()}),
                      VersionStages=['AWSPENDING']
                  )
              
              current_secret = secretsmanager.get_secret_value(
                  SecretId=secret_id,
                  VersionId=versions['AWSCURRENT'][0],
                  VersionStage='AWSCURRENT'
              )
              current = json.loads(current_secret['SecretString'])
              
              pending_secret = secretsmanager.get_secret_value(
                  SecretId=secret_id,
                  VersionId=service_client_id,
                  VersionStage='AWSPENDING'
              )
              pending = json.loads(pending_secret['SecretString'])
              
              # Connect and rotate password
              try:
                  conn = psycopg2.connect(
                      host=current['host'],
                      user=current['username'],
                      password=current['password'],
                      database=current['dbname']
                  )
                  cursor = conn.cursor()
                  
                  # Change password
                  cursor.execute(
                      f"ALTER USER {current['username']} PASSWORD %s",
                      (pending['password'],)
                  )
                  conn.commit()
                  cursor.close()
                  conn.close()
                  
                  # Finalize rotation
                  secretsmanager.update_secret_version_stage(
                      SecretId=secret_id,
                      VersionStage='AWSCURRENT',
                      MoveToVersionId=service_client_id,
                      RemoveFromVersionId=versions['AWSCURRENT'][0]
                  )
              except Exception as e:
                  raise Exception(f"Failed to rotate password: {str(e)}")
              
              return {'statusCode': 200}

  # Rotation Configuration
  SecretRotation:
    Type: AWS::SecretsManager::RotationRule
    Properties:
      SecretId: !Ref DatabaseSecret
      HostedZoneId: ''
      RotationLambdaARN: !GetAtt RotationFunction.Arn
      RotationRules:
        AutomaticallyAfterDays: 30

  # KMS Key for Encryption
  SecretsEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for Secrets Manager encryption
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow Secrets Manager
            Effect: Allow
            Principal:
              Service: secretsmanager.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
            Resource: '*'

  # CloudWatch Events for Rotation
  RotationEventRule:
    Type: AWS::Events::Rule
    Properties:
      Description: Alert on secret rotation
      EventPattern:
        source:
          - aws.secretsmanager
        detail-type:
          - AWS API Call via CloudTrail
        detail:
          eventSource:
            - secretsmanager.amazonaws.com
          eventName:
            - PutSecretValue
          requestParameters:
            secretId:
              - !Ref DatabaseSecret

Outputs:
  SecretArn:
    Value: !Ref DatabaseSecret
    Description: Secret ARN
