---
description: Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption for production-grade database infrastructure.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: 1.0.0\n  domain: cncf\n  output-format: manifests\n  role: implementation\n  scope: infrastructure\n  triggers: aws rds, relational database, mysql, postgresql, automated backup, multi-az, read replica\n  related-skills: aws-sdk, aws-cloudwatch, aws-kms\n  archetypes: educational, tactical\n  anti_triggers: mismanaged storage, weak security\n  response_profile: high\n---\nname: aws-rds
description: "Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption for production-grade database infrastructure."
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  output-format: manifests
  role: implementation
  scope: infrastructure
  triggers: aws rds, relational database, mysql, postgresql, automated backup, multi-az, read replica
  related-skills: aws-sdk, aws-cloudwatch, aws-kms
---
description: Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption for production-grade database infrastructure.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: 1.0.0\n  domain: cncf\n  output-format: manifests\n  role: implementation\n  scope: infrastructure\n  triggers: aws rds, relational database, mysql, postgresql, automated backup, multi-az, read replica\n  related-skills: aws-sdk, aws-cloudwatch, aws-kms\n  archetypes: educational, tactical\n  anti_triggers: mismanaged storage, weak security\n  response_profile: high\n---\n# AWS RDS (Relational Database Service)
Deploy managed relational databases with automated administration, high availability, and advanced features such as automated backups, read replicas, and multi-AZ failover.

## TL;DR Checklist
- [ ] Enable Multi-AZ deployment for production databases
- [ ] Configure automated backups with an appropriate retention period (7-35 days)
- [ ] Create read replicas for read-heavy workloads and reporting
- [ ] Enable encryption at rest with AWS KMS
- [ ] Enable encryption in transit (SSL/TLS)
- [ ] Configure security groups with the principle of least privilege
- [ ] Implement parameter groups for performance tuning
- [ ] Enable CloudWatch Enhanced Monitoring
- [ ] Implement automated failover testing
- [ ] Use database activity stream for audit logging
- [ ] Configure backup windows during low-traffic periods
- [ ] Enable deletion protection for production databases

## Purpose and Use Cases
**Primary Purpose:** Provide a fully managed relational database service with automatic administration, high availability, and security features.

**Common Use Cases:**
1. **OLTP Applications** — Transactional processing for web and mobile apps.
2. **Data Warehousing** — Large analytical databases with complex queries.
3. **Reporting Databases** — Read replicas for reporting and analytics.
4. **Master-Slave Replication** — Data synchronization across regions.
5. **Development Environments** — Quick database provisioning and teardown.
6. **Legacy Application Migration** — Lift-and-shift of on-premises databases.

## Architecture Design Patterns
### Pattern 1: Multi-AZ Production Database with Read Replicas
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Custom Parameter Group for PostgreSQL
  DBParameterGroup:
    Type: AWS::RDS::DBParameterGroup
    Properties:
      Description: Custom parameter group for production PostgreSQL
      Family: postgres14
      Parameters:
        max_connections: 500
        shared_buffers: 262144  # 2GB for db.r6i.2xlarge
        effective_cache_size: 524288  # 4GB
        maintenance_work_mem: 16384  # 64MB
        random_page_cost: 1.1  # SSD-friendly
        effective_io_concurrency: 200
        log_statement: 'mod'  # Log DDL and DML
        log_min_duration_statement: 1000  # Log queries > 1 second
      Tags:
        - Key: Name
          Value: prod-postgres-params

  # Primary Database Instance
  PrimaryDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: prod-postgres-primary
      Engine: postgres
      EngineVersion: 14.7
      DBInstanceClass: db.r6i.2xlarge
      AllocatedStorage: 500
      StorageType: gp3
      Iops: 3000
      DBName: production
      MasterUsername: admin
      MasterUserPassword: !Sub '{{resolve:secretsmanager:rds-password:SecretString:password}}'
      DBParameterGroupName: !Ref DBParameterGroup

      # High Availability
      MultiAZ: true
      BackupRetentionPeriod: 30
      BackupWindow: '03:00-04:00'
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'

      # Networking
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      PubliclyAccessible: false

      # Security
      StorageEncrypted: true
      KmsKeyId: !GetAtt DBEncryptionKey.Arn
      EnableIAMDatabaseAuthentication: true
      EnableCloudwatchLogsExports:
        - postgresql
      DeletionProtection: true

      # Activity Stream (Audit)
      EnableActivityStream: true
      ActivityStreamKmsKeyId: !GetAtt DBEncryptionKey.Arn
      ActivityStreamMode: async
      Tags:
        - Key: Name
          Value: prod-postgres-primary

  # Read Replica 1 - Same AZ (for backups/reporting)
  ReadReplica1:
    Type: AWS::RDS::DBInstance
    Properties:
      SourceDBInstanceIdentifier: !Ref PrimaryDatabase
      DBInstanceIdentifier: prod-postgres-replica-1
      DBInstanceClass: db.r6i.xlarge
      PubliclyAccessible: false
      Tags:
        - Key: Name
          Value: prod-postgres-replica-1

  # DB Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS in private subnets
      SubnetIds:
        - subnet-0123456789abcdef0  # Private subnet 1
        - subnet-0123456789abcdef1  # Private subnet 2
      Tags:
        - Key: Name
          Value: prod-db-subnets

  # KMS Key for Encryption
  DBEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for RDS encryption
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'

  # IAM Role for Enhanced Monitoring
  RDSMonitoringRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: monitoring.rds.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole

  # CloudWatch Alarms
  DatabaseCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: RDS-CPU-High
      AlarmDescription: Alert when RDS CPU exceeds 80%
      MetricName: CPUUtilization
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref PrimaryDatabase
```
### Key Elements:
- Multi-AZ deployment with automatic failover
- Read replicas in the same and different AZs
- Automated backups with a 30-day retention
- Custom parameter group for performance tuning

### Pattern 2: Aurora PostgreSQL Serverless (Auto-Scaling)
```yaml
...
```
### Key Elements:
- Aurora Multi-Master cluster for high availability
- Automatic replica scaling based on CPU

## Integration Approaches
### 1. Integration with Secrets Manager
RDS + Secrets Manager provides:
- Automatic credential rotation
- Secure password storage
- Fine-grained access control
- Audit logging of access
### 2. Integration with IAM Database Authentication
IAM + RDS enables:
- Token-based authentication
- No password management
- Centralized access control
- Audit trail in CloudTrail
### 3. Integration with Lambda
Lambda + RDS for:
- Serverless data processing
- Event-driven database operations
### 4. Integration with CloudWatch
RDS CloudWatch integration provides:
- Real-time performance metrics
- Enhanced monitoring
### 5. Integration with CloudFormation
Infrastructure as code for databases:
- Reproducible database deployments

## Common Pitfalls
### ❌ Pitfall 1: Single-AZ Deployment in Production
**Problem:** AZ failure causes database downtime; no automatic failover.
### ❌ Pitfall 2: Weak Database Credentials
**Problem:** Default or simple passwords are easily guessed; unauthorized access.
### ❌ Pitfall 3: No Read Replicas for Reporting
**Problem:** Reporting queries impact production database performance.

### Best Practices Summary
| Category | Best Practice |
|---|---|
| Availability | Multi-AZ deployments with automated failover |
| Backups | Automated backups with a 30-day retention |
| Security | Encryption at rest + in transit; IAM authentication; VPC isolation |
| Performance | Read replicas for scaling; Performance Insights for tuning |
| Monitoring | CloudWatch alarms; Enhanced monitoring |

## Core Workflow
1. **Assess Requirements:** Understand the use case, scale, integration needs, and existing infrastructure. **Checkpoint:** Document requirements, constraints, and success criteria.; 2. **Design Architecture:** Plan component interactions, data flow using best practices. **Checkpoint:** Verify the architecture addresses all requirements.; 3. **Implement & Configure:** Create manifests and scripts. **Checkpoint:** Validate YAML against schema.; 4. **Deploy & Monitor:** Apply manifests, verify health, and confirm observability is working. **Checkpoint:** Confirm all pods/services are running.---
description: Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption for production-grade database infrastructure.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: 1.0.0\n  domain: cncf\n  output-format: manifests\n  role: implementation\n  scope: infrastructure\n  triggers: aws rds, relational database, mysql, postgresql, automated backup, multi-az, read replica\n  related-skills: aws-sdk, aws-cloudwatch, aws-kms\n  archetypes: educational, tactical\n  anti_triggers: mismanaged storage, weak security\n  response_profile: high\n---\n## Constraints
### MUST DO
- Include at least one complete working YAML manifest example
- Reference relevant CNCF project documentation
### MUST NOT DO
- Deploy manifests without testing in a staging environment first
- Use deprecated API versions (e.g., apps/v1beta1)
---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html)
- [API Reference or Getting Started](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDatabaseInstance.html)
- [Configuration Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.AmazonRDS.CommonIssues.html)
- [Common Patterns or Tutorials](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)

