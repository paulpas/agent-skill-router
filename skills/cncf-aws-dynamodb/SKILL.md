---
name: cncf-aws-dynamodb
description: Deploys managed NoSQL databases with DynamoDB for scalable, low-latency
  key-value storage, streams, and global tables with high availability and automatic
  replication.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: dynamodb, nosql, key-value store, dynamodb stream, global table, partition
    key, sort key, auto-scaling
  related-skills: cncf-aws-lambda, cncf-aws-kms, cncf-aws-cloudwatch
---


# DynamoDB (Amazon DynamoDB)

Deploy highly scalable, serverless NoSQL databases with low-latency performance, automatic replication, and sophisticated features like streams, global tables, and transactions.

## TL;DR Checklist

- [ ] Choose partition key for even data distribution (not sequential)
- [ ] Add sort key only if range queries needed
- [ ] Use on-demand billing for unpredictable workloads
- [ ] Use provisioned with auto-scaling for predictable traffic
- [ ] Enable point-in-time recovery for all production tables
- [ ] Enable TTL for automatic item expiration
- [ ] Configure DynamoDB Streams for change data capture
- [ ] Use Global Tables for multi-region active-active replication
- [ ] Enable encryption at rest (enabled by default)
- [ ] Implement query patterns before writing to avoid full table scans

---

## When to Use

Use DynamoDB when:

- Building applications requiring sub-millisecond latency
- NoSQL schema flexibility is beneficial
- Unlimited scaling is required
- Using mobile/IoT applications with offline sync
- Building real-time leaderboards or analytics
- Needing managed backups and high availability

---

## When NOT to Use

Avoid DynamoDB when:

- Requiring complex joins across multiple tables (use RDS instead)
- Data has strict relational integrity requirements
- Complex aggregations and analytics (use Athena instead)
- Strongly consistent transactions are critical (RDS better option)

---

## Purpose and Use Cases

**Primary Purpose:** Provide fully managed, serverless NoSQL database with unlimited throughput, millisecond latency, and automatic global replication.

**Common Use Cases:**

1. **Session Storage** — Store user sessions with automatic expiration
2. **Shopping Carts** — Ephemeral data with high write volume
3. **Real-time Leaderboards** — Sorted sets with frequent updates
4. **IoT Data** — High-volume sensor data with TTL
5. **User Profiles** — Flexible schema with rapid reads
6. **Event Stream** — DynamoDB Streams for change capture
7. **Caching Layer** — Application cache with automatic expiration

---

## Architecture Design Patterns

### Pattern 1: High-Volume Application Table with Auto-Scaling

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Application Table
  ApplicationDataTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: application-data
      BillingMode: PROVISIONED
      AttributeDefinitions:
        - AttributeName: UserId
          AttributeType: S
        - AttributeName: Timestamp
          AttributeType: N
        - AttributeName: Status
          AttributeType: S
      KeySchema:
        - AttributeName: UserId
          KeyType: HASH  # Partition Key
        - AttributeName: Timestamp
          KeyType: RANGE  # Sort Key
      # Provisioned throughput (initial)
      ProvisionedThroughputput:
        ReadCapacityUnits: 100
        WriteCapacityUnits: 100
      # Global Secondary Index for status queries
      GlobalSecondaryIndexes:
        - IndexName: StatusIndex
          KeySchema:
            - AttributeName: Status
              KeyType: HASH
            - AttributeName: Timestamp
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput:
            ReadCapacityUnits: 50
            WriteCapacityUnits: 50
      # Local Secondary Index for alternative sort
      LocalSecondaryIndexes:
        - IndexName: UserRegionIndex
          KeySchema:
            - AttributeName: UserId
              KeyType: HASH
            - AttributeName: Status
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      # Point-in-time recovery
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      # Encryption
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS
        KMSMasterKeyId: !GetAtt DynamoDBEncryptionKey.Arn
      # Time to live
      TimeToLiveSpecification:
        AttributeName: ExpirationTime
        Enabled: true
      # Streams for change capture
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      # Tags
      Tags:
        - Key: Application
          Value: main
        - Key: Environment
          Value: production

  # Auto-Scaling for Read Capacity
  ReadAutoScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 40000
      MinCapacity: 100
      ResourceId: !Sub 'table/${ApplicationDataTable}'
      RoleARN: !Sub 'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable'
      ScalableDimension: dynamodb:table:ReadCapacityUnits
      ServiceNamespace: dynamodb

  ReadScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: ddb-read-scaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref ReadAutoScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBReadCapacityUtilization
        ScaleOutCooldown: 60
        ScaleInCooldown: 300

  # Auto-Scaling for Write Capacity
  WriteAutoScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 40000
      MinCapacity: 100
      ResourceId: !Sub 'table/${ApplicationDataTable}'
      RoleARN: !Sub 'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable'
      ScalableDimension: dynamodb:table:WriteCapacityUnits
      ServiceNamespace: dynamodb

  WriteScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: ddb-write-scaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref WriteAutoScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBWriteCapacityUtilization
        ScaleOutCooldown: 60
        ScaleInCooldown: 300

  # Auto-Scaling for GSI Read Capacity
  GSIReadAutoScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 10000
      MinCapacity: 50
      ResourceId: !Sub 'table/${ApplicationDataTable}/index/StatusIndex'
      RoleARN: !Sub 'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable'
      ScalableDimension: dynamodb:index:ReadCapacityUnits
      ServiceNamespace: dynamodb

  GSIReadScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: ddb-gsi-read-scaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref GSIReadAutoScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBReadCapacityUtilization

  # KMS Encryption Key
  DynamoDBEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for DynamoDB encryption
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow DynamoDB to use the key
            Effect: Allow
            Principal:
              Service: dynamodb.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
            Resource: '*'

  # CloudWatch Alarms
  ReadThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: DDB-Read-Throttle
      MetricName: ReadThrottleEvents
      Namespace: AWS/DynamoDB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: TableName
          Value: !Ref ApplicationDataTable

  WriteThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: DDB-Write-Throttle
      MetricName: WriteThrottleEvents
      Namespace: AWS/DynamoDB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: TableName
          Value: !Ref ApplicationDataTable

  UserErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: DDB-User-Errors
      MetricName: UserErrors
      Namespace: AWS/DynamoDB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: TableName
          Value: !Ref ApplicationDataTable

Outputs:
  TableName:
    Value: !Ref ApplicationDataTable
    Description: DynamoDB table name
  TableArn:
    Value: !GetAtt ApplicationDataTable.Arn
    Description: DynamoDB table ARN
  StreamArn:
    Value: !GetAtt ApplicationDataTable.StreamArn
    Description: DynamoDB Streams ARN
```

**Key Elements:**
- Partition key (UserId) for even distribution
- Sort key (Timestamp) for range queries
- Global Secondary Index for status queries
- Local Secondary Index for alternative sorting
- Provisioned throughput with auto-scaling
- Point-in-time recovery enabled
- TTL for automatic item expiration
- DynamoDB Streams for change capture
- KMS encryption at rest
- CloudWatch alarms for throttling and errors

### Pattern 2: On-Demand Billing for Unpredictable Workloads

```yaml
Resources:
  # Cache Table with On-Demand Billing
  CacheTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: application-cache
      BillingMode: PAY_PER_REQUEST  # On-demand
      AttributeDefinitions:
        - AttributeName: CacheKey
          AttributeType: S
      KeySchema:
        - AttributeName: CacheKey
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: ExpirationTime
        Enabled: true
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      SSESpecification:
        SSEEnabled: true
      Tags:
        - Key: BillingModel
          Value: on-demand
```

**Key Elements:**
- PAY_PER_REQUEST billing (no capacity planning)
- Suitable for unpredictable, spiky traffic
- No auto-scaling needed
- TTL for cache expiration

### Pattern 3: Global Table for Multi-Region Active-Active

```yaml
Resources:
  # Primary Table in us-east-1
  GlobalPrimaryTable:
    Type: AWS::DynamoDB::GlobalTable
    Properties:
      GlobalTableName: user-sessions
      BillingMode: PAY_PER_REQUEST
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS
        KMSMasterKeyId: !GetAtt DynamoDBEncryptionKey.Arn
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      AttributeDefinitions:
        - AttributeName: SessionId
          AttributeType: S
        - AttributeName: UserId
          AttributeType: S
      KeySchema:
        - AttributeName: SessionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: UserIdIndex
          KeySchema:
            - AttributeName: UserId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      Replicas:
        - Region: us-east-1
          PointInTimeRecoverySpecification:
            PointInTimeRecoveryEnabled: true
          Tags:
            - Key: Region
              Value: us-east-1
        - Region: eu-west-1
          PointInTimeRecoverySpecification:
            PointInTimeRecoveryEnabled: true
          Tags:
            - Key: Region
              Value: eu-west-1
        - Region: ap-southeast-1
          PointInTimeRecoverySpecification:
            PointInTimeRecoveryEnabled: true
          Tags:
            - Key: Region
              Value: ap-southeast-1
      TimeToLiveSpecification:
        AttributeName: ExpirationTime
        Enabled: true
```

**Key Elements:**
- Global Tables for active-active replication
- Automatic replication across regions
- Local reads and writes with sub-millisecond latency
- Eventual consistency across regions
- TTL prevents stale session data accumulation

---

## Integration Approaches

### 1. Integration with Lambda

Lambda + DynamoDB enables:
- Serverless application backends
- Trigger Lambda on table changes (Streams)
- Event-driven processing

### 2. Integration with DynamoDB Streams

Streams provide:
- Change data capture for downstream processing
- Real-time synchronization
- Cross-table event propagation
- Audit logging

### 3. Integration with Kinesis

DynamoDB + Kinesis enables:
- Real-time analytics on table changes
- Stream processing and aggregation
- Integration with data lakes

### 4. Integration with S3 via Lambda

Lambda processes stream events to:
- Export table data to S3 (backups)
- Integrate with data warehouse
- Archive historical data

---

## Common Pitfalls

### ❌ Pitfall 1: Sequential Partition Keys

**Problem:** Sequential IDs as partition key causes hot partitions and throttling.

**Solution:**
- Use random/uniformly distributed keys (UUIDs, hashed values)
- Avoid timestamps as leading key component
- Use write sharding for high-volume scenarios

### ❌ Pitfall 2: Inefficient Query Patterns

**Problem:** Full table scans instead of key-value lookups waste throughput.

**Solution:**
- Design queries before schema design
- Use partition and sort keys for queries
- Create Global Secondary Indexes for alternative access patterns
- Use Query instead of Scan when possible

### ❌ Pitfall 3: Over-Provisioning Capacity

**Problem:** Fixed provisioned capacity is wasted if traffic varies.

**Solution:**
- Use on-demand billing for unpredictable workloads
- Enable auto-scaling for provisioned tables
- Analyze CloudWatch metrics to right-size capacity

### ❌ Pitfall 4: No Point-in-Time Recovery

**Problem:** Accidental deletes are permanent; no recovery option.

**Solution:**
- Enable point-in-time recovery on all production tables
- Test restore procedures quarterly
- Document recovery runbooks

### ❌ Pitfall 5: Large Item Sizes

**Problem:** Items larger than 10 KB waste throughput; poor performance.

**Solution:**
- Keep items small (< 10 KB ideally)
- Store large data in S3; reference from DynamoDB
- Normalize data across multiple items

### ❌ Pitfall 6: Hot Partition Tokens

**Problem:** Uneven traffic distribution causes throttling on some partitions.

**Solution:**
- Use write sharding (add random suffix to key)
- Spread reads across replicas
- Monitor partition usage via CloudWatch

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Partition Key** | Random/uniform distribution; no sequential keys |
| **Queries** | Design query patterns before schema; use indexes |
| **Billing** | On-demand for unpredictable; provisioned with scaling for predictable |
| **Recovery** | Enable PITR; test restores; TTL for automatic cleanup |
| **Streams** | Enable for change capture; integrate with Lambda |
| **Security** | KMS encryption; restricted IAM policies |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-lambda` | Event-driven processing on stream changes |
| `cncf-aws-iam` | Fine-grained access control to tables |
| `cncf-aws-kms` | Encryption key management |
| `cncf-aws-cloudwatch` | Table monitoring and alarms |
