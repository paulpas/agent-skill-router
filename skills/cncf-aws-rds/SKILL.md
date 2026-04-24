---
name: cncf-aws-rds
description: Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle,
  SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption
  for production-grade database infrastructure.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: rds, relational database, mysql, postgresql, multi-az, database failover,
    read replica, automated backup
  related-skills: cncf-aws-auto-scaling, cncf-aws-cloudformation, cncf-aws-cloudwatch,
    cncf-aws-iam
---


# RDS (Relational Database Service)

Deploy managed relational databases with automated administration, high availability, and advanced features like automated backups, read replicas, and multi-AZ failover.

## TL;DR Checklist

- [ ] Enable Multi-AZ deployment for production databases
- [ ] Configure automated backups with appropriate retention period (7-35 days)
- [ ] Create read replicas for read-heavy workloads and reporting
- [ ] Enable encryption at rest with AWS KMS
- [ ] Enable encryption in transit (SSL/TLS)
- [ ] Configure security groups with principle of least privilege
- [ ] Implement parameter groups for performance tuning
- [ ] Enable CloudWatch Enhanced Monitoring
- [ ] Implement automated failover testing
- [ ] Use database activity stream for audit logging
- [ ] Configure backup windows during low-traffic periods
- [ ] Enable deletion protection for production databases

---

## When to Use

Use RDS when:

- Running relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server)
- Requiring ACID compliance and transactions
- Needing managed backup, failover, and patching
- Building applications requiring complex queries and joins
- Requiring data consistency and referential integrity

---

## When NOT to Use

Avoid RDS when:

- Needing NoSQL document storage (use DynamoDB instead)
- Requiring unlimited horizontal scaling (use Aurora Serverless instead)
- Preferring self-managed databases for full control
- Working with graph databases (use Neptune instead)
- Needing time-series data storage (use TimeStream instead)

---

## Purpose and Use Cases

**Primary Purpose:** Provide fully managed relational database service with automatic administration, high availability, and security features.

**Common Use Cases:**

1. **OLTP Applications** — Transactional processing for web and mobile apps
2. **Data Warehousing** — Large analytical databases with complex queries
3. **Reporting Databases** — Read replicas for reporting and analytics
4. **Master-Slave Replication** — Data synchronization across regions
5. **Development Environments** — Quick database provisioning and teardown
6. **Legacy Application Migration** — Lift-and-shift of on-premises databases

---

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

  # Custom Option Group for Enhanced Features
  DBOptionGroup:
    Type: AWS::RDS::OptionGroup
    Properties:
      OptionGroupDescription: Option group for PostgreSQL production
      EngineName: postgres
      MajorEngineVersion: '14'
      Tags:
        - Key: Name
          Value: prod-postgres-options

  # Primary Database Instance
  PrimaryDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
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
      OptionGroupName: !Ref DBOptionGroup
      
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
      
      # Performance Insights
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      PerformanceInsightsKMSKeyId: !GetAtt DBEncryptionKey.Arn
      
      # Enhanced Monitoring
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      
      # Activity Stream (Audit)
      EnableActivityStream: true
      ActivityStreamKmsKeyId: !GetAtt DBEncryptionKey.Arn
      ActivityStreamMode: async
      
      EnableBacktrackSecurityGroupIngress: true
      Tags:
        - Key: Name
          Value: prod-postgres-primary
        - Key: Environment
          Value: production

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
        - Key: Environment
          Value: production

  # Read Replica 2 - Different AZ (for geo-redundancy)
  ReadReplica2:
    Type: AWS::RDS::DBInstance
    Properties:
      SourceDBInstanceIdentifier: !Ref PrimaryDatabase
      DBInstanceIdentifier: prod-postgres-replica-2
      DBInstanceClass: db.r6i.xlarge
      AvailabilityZone: us-east-1c  # Different from primary
      PubliclyAccessible: false
      Tags:
        - Key: Name
          Value: prod-postgres-replica-2
        - Key: Environment
          Value: production

  # DB Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS in private subnets
      SubnetIds:
        - subnet-0123456789abcdef0  # Private subnet 1
        - subnet-0123456789abcdef1  # Private subnet 2
        - subnet-0123456789abcdef2  # Private subnet 3
      Tags:
        - Key: Name
          Value: prod-db-subnets

  # Security Group
  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for RDS PostgreSQL
      VpcId: vpc-0123456789abcdef0
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: sg-0123456789abcdef0  # App servers
          Description: PostgreSQL from app servers
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: Allow all outbound traffic
      Tags:
        - Key: Name
          Value: prod-db-sg

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
          - Sid: Allow RDS to use the key
            Effect: Allow
            Principal:
              Service: rds.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
              - 'kms:CreateGrant'
            Resource: '*'

  DBEncryptionKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: alias/rds-prod-encryption
      TargetKeyId: !Ref DBEncryptionKey

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

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: RDS-Connections-High
      AlarmDescription: Alert when database connections exceed 400
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 1
      Threshold: 400
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref PrimaryDatabase
```

**Key Elements:**
- Multi-AZ deployment with automatic failover
- Read replicas in same and different AZs
- Automated backups with 30-day retention
- Custom parameter group for performance tuning
- KMS encryption at rest
- IAM database authentication
- Enhanced monitoring (60-second granularity)
- Activity stream for audit logging
- Performance Insights for analysis
- CloudWatch alarms for proactive monitoring
- Deletion protection on primary

### Pattern 2: Aurora PostgreSQL Serverless (Auto-Scaling)

```yaml
Resources:
  AuroraCluster:
    Type: AWS::RDS::DBCluster
    DeletionPolicy: Snapshot
    Properties:
      Engine: aurora-postgresql
      EngineVersion: 13.7
      EngineMode: provisioned
      DatabaseName: production
      MasterUsername: admin
      MasterUserPassword: !Sub '{{resolve:secretsmanager:aurora-password:SecretString:password}}'
      
      # Auto Scaling
      EnableAutoMinorVersionUpgrade: true
      BackupRetentionPeriod: 30
      PreferredBackupWindow: '03:00-04:00'
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
      
      # High Availability
      AvailabilityZones:
        - us-east-1a
        - us-east-1b
        - us-east-1c
      
      # Networking
      DBSubnetGroupName: !Ref AuroraSubnetGroup
      VpcSecurityGroupIds:
        - !Ref AuroraSecurityGroup
      
      # Security
      StorageEncrypted: true
      KmsKeyId: !GetAtt AuroraEncryptionKey.Arn
      EnableIAMDatabaseAuthentication: true
      EnableCloudwatchLogsExports:
        - postgresql
      DeletionProtection: true
      
      # Backtrack (point-in-time recovery)
      BacktrackWindow: 72
      
      Tags:
        - Key: Environment
          Value: production

  # Primary Database Instance
  AuroraPrimaryInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: aurora-primary
      DBInstanceClass: db.r6g.2xlarge
      Engine: aurora-postgresql
      DBClusterIdentifier: !Ref AuroraCluster
      PubliclyAccessible: false
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn

  # Read Replica Instance
  AuroraReplicaInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: aurora-replica
      DBInstanceClass: db.r6g.xlarge
      Engine: aurora-postgresql
      DBClusterIdentifier: !Ref AuroraCluster
      PubliclyAccessible: false
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn

  # Auto Scaling Target
  AuroraScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 16
      MinCapacity: 2
      ResourceId: !Sub 'cluster:${AuroraCluster}'
      RoleARN: !Sub 'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/rds.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_RDSCluster'
      ScalableDimension: rds:cluster:DesiredReplicas
      ServiceNamespace: rds

  # Scaling Policy - CPU
  AuroraScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: aurora-cpu-scaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref AuroraScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70
        PredefinedMetricSpecification:
          PredefinedMetricType: RDSReaderAverageCPUUtilization
```

**Key Elements:**
- Aurora Multi-Master cluster for high availability
- Automatic replica scaling based on CPU
- Point-in-time recovery (Backtrack)
- Shared storage across instances
- Read-only replicas handle queries
- Auto failover within cluster

### Pattern 3: Cross-Region Read Replica for Disaster Recovery

```yaml
Resources:
  # Primary Region Database
  PrimaryDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: prod-primary
      Engine: postgres
      EngineVersion: 14.7
      DBInstanceClass: db.r6i.2xlarge
      AllocatedStorage: 500
      MasterUsername: admin
      MasterUserPassword: !Sub '{{resolve:secretsmanager:rds-password:SecretString:password}}'
      
      MultiAZ: true
      BackupRetentionPeriod: 30
      StorageEncrypted: true
      
      EnableCloudwatchLogsExports:
        - postgresql
      DeletionProtection: true

  # Cross-Region Read Replica
  CrossRegionReadReplica:
    Type: AWS::RDS::DBInstance
    Properties:
      SourceDBInstanceIdentifier: !Sub 'arn:aws:rds:us-east-1:${AWS::AccountId}:db:prod-primary'
      DBInstanceIdentifier: prod-replica-us-west-2
      DBInstanceClass: db.r6i.2xlarge
      PubliclyAccessible: false
      Tags:
        - Key: Name
          Value: prod-replica-us-west-2
        - Key: Environment
          Value: production
```

**Key Elements:**
- Cross-region read replica for DR
- Can be promoted to standalone database
- Asynchronous replication (slight lag expected)
- Different region provides geographic redundancy

---

## Integration Approaches

### 1. Integration with Secrets Manager

RDS + Secrets Manager provides:
- Automatic credential rotation
- Secure password storage
- Fine-grained access control
- Audit logging of access

### 2. Integration with IAM Database Authentication

IAM + RDS enables:
- Token-based authentication (15-minute tokens)
- No password management
- Centralized access control
- Audit trail in CloudTrail

### 3. Integration with Lambda

Lambda + RDS for:
- Serverless data processing
- Event-driven database operations
- Query results in S3
- Log analysis and alerts

### 4. Integration with CloudWatch

RDS CloudWatch integration provides:
- Real-time performance metrics
- Enhanced monitoring with 60-second granularity
- Performance Insights for bottleneck analysis
- Custom alarms for proactive response

### 5. Integration with CloudFormation

Infrastructure as code for databases:
- Reproducible database deployments
- Version control for schema changes
- Automated backups and failover
- Stack-level RBAC

---

## Common Pitfalls

### ❌ Pitfall 1: Single-AZ Deployment in Production

**Problem:** AZ failure causes database downtime; no automatic failover.

**Solution:**
- Always enable Multi-AZ for production databases
- Automatic failover to standby in different AZ
- Minimal downtime (typically 1-2 minutes)
- Higher availability SLA

### ❌ Pitfall 2: Weak Database Credentials

**Problem:** Default or simple passwords are easily guessed; unauthorized access.

**Solution:**
- Store passwords in Secrets Manager (encrypted)
- Use strong, randomly generated passwords
- Enable IAM database authentication
- Rotate credentials regularly (Secrets Manager auto-rotation)

### ❌ Pitfall 3: No Read Replicas for Reporting

**Problem:** Reporting queries impact production database performance.

**Solution:**
- Create read replicas specifically for reporting
- Direct reporting queries to replicas
- Isolates production from analytics load
- Can scale replicas independently

### ❌ Pitfall 4: Insufficient Backup Retention

**Problem:** Cannot recover deleted data beyond backup window.

**Solution:**
- Set appropriate retention period (7-30 days minimum)
- Test restore procedures regularly
- Copy backups to different region for DR
- Use automated backup + manual snapshots

### ❌ Pitfall 5: No Encryption

**Problem:** Data at rest is unencrypted; fails compliance.

**Solution:**
- Enable encryption at rest (KMS)
- Enable encryption in transit (SSL/TLS)
- Use customer-managed KMS keys
- Enable activity stream for audit

### ❌ Pitfall 6: Wrong Instance Type

**Problem:** Oversizing wastes money; undersizing causes performance issues.

**Solution:**
- Analyze workload patterns (CPU, memory, IOPS)
- Use Performance Insights to identify bottlenecks
- Right-size instances based on utilization
- Consider compute-optimized vs. memory-optimized

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Availability** | Multi-AZ deployments with automated failover |
| **Backups** | Automated backups with 30-day retention + cross-region copies |
| **Security** | Encryption at rest + in transit; IAM authentication; VPC isolation |
| **Performance** | Read replicas for scaling; Performance Insights for tuning |
| **Monitoring** | Enhanced monitoring (60s); CloudWatch alarms; Activity Stream |
| **Cost** | Right-size instances; use read-only replicas efficiently |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-vpc` | Network configuration for database isolation |
| `cncf-aws-iam` | Database user and role management |
| `cncf-aws-kms` | Encryption key management for databases |
| `cncf-aws-cloudwatch` | Database monitoring and alerting |
| `cncf-aws-secrets-manager` | Secure credential storage and rotation |
