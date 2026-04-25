---
name: sns
description: '"Deploys managed pub/sub messaging with SNS for asynchronous notifications"
  across services, mobile push, email, and Lambda integrations.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: messaging, notifications, pub/sub, publish subscribe, sns, subscription,
    topic
  related-skills: aws-cloudwatch, aws-lambda, aws-sqs
---




# SNS (Simple Notification Service)

Deploy scalable publish-subscribe messaging for asynchronous notifications, mobile push, email delivery, and event-driven architecture.

## TL;DR Checklist

- [ ] Use SNS for broad fan-out messaging (one message to many subscribers)
- [ ] Combine with SQS for persistent queue + notification
- [ ] Enable message filtering at subscriber level
- [ ] Use message attributes for efficient filtering
- [ ] Enable FIFO topics for ordered, deduplicated messages
- [ ] Set up dead-letter queues for failed deliveries
- [ ] Encrypt topics and messages with KMS
- [ ] Monitor delivery and failed message count
- [ ] Use topic policies to control access
- [ ] Test notification delivery before production

---

## When to Use

Use SNS when:

- Notifying multiple services of an event (fan-out)
- Broadcasting alerts or notifications
- Sending emails or mobile push notifications
- Triggering multiple Lambda functions from one event
- Building event-driven architectures

---

## When NOT to Use

Avoid SNS when:

- Requiring message ordering and persistence (use SQS instead)
- Building point-to-point communication (use SQS alone)
- Needing exactly-once delivery guarantees

---

## Purpose and Use Cases

**Primary Purpose:** Provide scalable pub/sub messaging for event notifications with multiple transport options (email, SMS, Lambda, SQS).

**Common Use Cases:**

1. **Alarm Notifications** — CloudWatch alarms trigger SNS for email/SMS
2. **Event Broadcasting** — Application event triggers multiple subscribers
3. **Mobile Push** — Send push notifications to mobile apps
4. **Email Delivery** — Transactional emails to users
5. **Fan-Out Pattern** — One message delivered to many services

---

## Architecture Design Patterns

### Pattern 1: SNS Topic with Multiple Subscribers

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # SNS Topic
  ApplicationEventsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: application-events
      DisplayName: Application Events
      KmsMasterKeyId: alias/aws/sns  # Encryption
      Tags:
        - Key: Purpose
          Value: event-broadcasting

  # Topic Policy
  TopicPolicy:
    Type: AWS::SNS::TopicPolicy
    Properties:
      Topics:
        - !Ref ApplicationEventsTopic
      PolicyText:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: 
                - lambda.amazonaws.com
                - events.amazonaws.com
            Action:
              - SNS:Publish
            Resource: !Ref ApplicationEventsTopic
          - Effect: Deny
            Principal: '*'
            Action: SNS:*
            Resource: !Ref ApplicationEventsTopic
            Condition:
              Bool:
                aws:SecureTransport: 'false'

  # Email Subscription
  EmailSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: email
      TopicArn: !Ref ApplicationEventsTopic
      Endpoint: ops-team@example.com

  # SQS Queue Subscription (with dead-letter)
  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: events-dlq

  EventsQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: application-events
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  QueueSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: sqs
      TopicArn: !Ref ApplicationEventsTopic
      Endpoint: !GetAtt EventsQueue.Arn
      RawMessageDelivery: true
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn

  # Queue Policy to allow SNS
  QueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues:
        - !Ref EventsQueue
      PolicyText:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: sns.amazonaws.com
            Action: sqs:SendMessage
            Resource: !GetAtt EventsQueue.Arn
            Condition:
              ArnEquals:
                aws:SourceArn: !Ref ApplicationEventsTopic

  # Lambda Subscription
  EventProcessorFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: event-processor
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt LambdaRole.Arn
      Code:
        ZipFile: |
          import json
          import logging
          
          logger = logging.getLogger()
          
          def handler(event, context):
              logger.info(f"Received event: {json.dumps(event)}")
              # Process event
              return {'statusCode': 200}

  LambdaRole:
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

  LambdaSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: lambda
      TopicArn: !Ref ApplicationEventsTopic
      Endpoint: !GetAtt EventProcessorFunction.Arn
      FilterPolicy:
        EventType:
          - OrderCreated
          - PaymentProcessed

  # Permission for SNS to invoke Lambda
  SNSLambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref EventProcessorFunction
      Action: lambda:InvokeFunction
      Principal: sns.amazonaws.com
      SourceArn: !Ref ApplicationEventsTopic

  # CloudWatch Alarms
  MessageNotDeliveredAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: sns-message-not-delivered
      MetricName: NotificationsFailed
      Namespace: AWS/SNS
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: TopicName
          Value: !GetAtt ApplicationEventsTopic.TopicName

Outputs:
  TopicArn:
    Value: !Ref ApplicationEventsTopic
    Description: SNS Topic ARN
```

**Key Elements:**
- SNS topic for event publishing
- Email subscription for notifications
- SQS queue subscription for persistent queuing
- Lambda subscription with filter policies
- Dead-letter queue for failed deliveries
- Topic policy for secure access
- Alarms for delivery failures

### Pattern 2: FIFO Topic for Ordered Processing

```yaml
Resources:
  # FIFO Topic
  OrderEventsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: order-events.fifo
      FifoTopic: true
      ContentBasedDeduplication: false
      DisplayName: Order Events

  # FIFO Queue Subscription
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-processing.fifo
      FifoQueue: true
      ContentBasedDeduplication: false
      VisibilityTimeout: 300

  OrderQueueSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: sqs
      TopicArn: !Ref OrderEventsTopic
      Endpoint: !GetAtt OrderQueue.Arn
```

**Key Elements:**
- FIFO topic for ordered message processing
- Deduplication via MessageDeduplicationId
- GroupId for ordered delivery
- FIFO queue for persistent ordered queuing

---

## Integration Approaches

### 1. Integration with CloudWatch

CloudWatch + SNS enables:
- Automated alert delivery
- Multi-channel notifications (email, SMS, Lambda)
- Action orchestration

### 2. Integration with EventBridge

EventBridge + SNS enables:
- Event-driven messaging
- Complex event routing
- Cross-service event propagation

### 3. Integration with SQS

SNS + SQS provides:
- Reliable message delivery
- Decoupling of producers and consumers
- Persistent message storage

### 4. Integration with Lambda

SNS + Lambda enables:
- Event-driven function invocation
- Message filtering
- Serverless event processing

---

## Common Pitfalls

### ❌ Pitfall 1: No Dead-Letter Queue

**Problem:** Failed deliveries are silently discarded.

**Solution:**
- Configure DLQ for queue subscriptions
- Monitor DLQ for failures
- Implement retry logic

### ❌ Pitfall 2: Overly Broad Subscriptions

**Problem:** All subscribers receive all messages; wasted processing.

**Solution:**
- Use filter policies to restrict messages
- Filter on message attributes
- Only process relevant events

### ❌ Pitfall 3: SNS as Queue

**Problem:** No guarantee all messages delivered if subscribers offline.

**Solution:**
- Combine SNS + SQS for persistence
- SNS for fan-out; SQS for queuing

### ❌ Pitfall 4: No Encryption

**Problem:** Messages transmitted unencrypted; data exposure risk.

**Solution:**
- Enable KMS encryption
- Use secure transport (HTTPS only)

### ❌ Pitfall 5: Missing Alarms

**Problem:** Delivery failures go undetected.

**Solution:**
- Set alarms for NotificationsFailed metric
- Monitor DLQ queue depth
- Alert on message loss

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Filtering** | Use message attributes and filter policies |
| **Reliability** | Combine with SQS for persistence |
| **Security** | KMS encryption; restrict topic policy |
| **Ordering** | Use FIFO topic for ordered messages |
| **Monitoring** | Alarms on delivery failures; DLQ monitoring |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-sqs` | Persistent queuing with SNS fan-out |
| `cncf-aws-lambda` | Lambda subscriptions and processing |
| `cncf-aws-cloudwatch` | CloudWatch alarm notifications |
