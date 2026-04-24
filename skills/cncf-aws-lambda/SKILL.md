---
name: cncf-aws-lambda
description: Deploys serverless event-driven applications with Lambda functions, triggers,
  layers, and VPC integration for cost-effective, auto-scaling compute without server
  management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: lambda, serverless, event-driven, lambda function, api gateway, s3 trigger,
    sqs, dynamodb stream
  related-skills: cncf-aws-iam, cncf-aws-sqs, cncf-aws-dynamodb, cncf-aws-cloudwatch
---


# Lambda (AWS Lambda)

Deploy serverless event-driven applications that scale automatically with pay-per-use pricing, VPC integration, and sophisticated trigger and layer management.

## TL;DR Checklist

- [ ] Use concurrency limits to prevent runaway scaling
- [ ] Configure dead-letter queues (DLQ) for failed invocations
- [ ] Set appropriate timeout and memory (controls CPU/speed)
- [ ] Use Lambda Layers for shared code and libraries
- [ ] Enable X-Ray tracing for distributed tracing
- [ ] Implement structured logging for CloudWatch Insights
- [ ] Use environment variables or Secrets Manager for configuration
- [ ] Set up VPC endpoints if accessing VPC resources
- [ ] Monitor duration and throttling via CloudWatch
- [ ] Use provisioned concurrency for high-traffic functions

---

## When to Use

Use Lambda when:

- Building event-driven applications (S3, SNS, SQS, DynamoDB Streams)
- Creating REST APIs with API Gateway
- Processing data asynchronously
- Running scheduled tasks (EventBridge)
- Building microservices with short-lived workloads
- Needing automatic scaling without capacity planning

---

## When NOT to Use

Avoid Lambda when:

- Long-running workloads (batch jobs > 15 minutes, use EC2/ECS)
- Needing persistent state or network connections
- Running legacy applications requiring OS access
- Requiring real-time latency (cold starts add overhead)

---

## Purpose and Use Cases

**Primary Purpose:** Provide serverless compute enabling automatic scaling, pay-per-use pricing, and event-driven architectures without server management.

**Common Use Cases:**

1. **REST APIs** — API Gateway + Lambda for microservices
2. **Data Processing** — S3 triggers for image resizing, log analysis
3. **Event Processing** — SNS/SQS async processing
4. **Scheduled Jobs** — EventBridge cron triggers
5. **Stream Processing** — DynamoDB Streams, Kinesis triggers
6. **File Operations** — S3 object transformations

---

## Architecture Design Patterns

### Pattern 1: REST API with API Gateway and Lambda

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # IAM Role for Lambda
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
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
      Policies:
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:Query
                  - dynamodb:Scan
                Resource: arn:aws:dynamodb:*:*:table/Users

  # Lambda Function
  APIFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: api-handler
      Runtime: python3.11
      Handler: index.lambda_handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 30
      MemorySize: 256
      ReservedConcurrentExecutions: 100
      Environment:
        Variables:
          TABLE_NAME: Users
          LOG_LEVEL: INFO
      Code:
        ZipFile: |
          import json
          import boto3
          import os
          import logging
          from datetime import datetime
          
          logger = logging.getLogger()
          logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))
          
          dynamodb = boto3.resource('dynamodb')
          table = dynamodb.Table(os.environ['TABLE_NAME'])
          
          def lambda_handler(event, context):
              """Handle API Gateway requests"""
              try:
                  method = event['httpMethod']
                  path = event['path']
                  
                  logger.info(f"Received {method} {path}")
                  
                  if method == 'POST' and path == '/users':
                      return create_user(event)
                  elif method == 'GET' and path.startswith('/users/'):
                      user_id = path.split('/')[-1]
                      return get_user(user_id)
                  else:
                      return error_response(404, "Not found")
                      
              except Exception as e:
                  logger.error(f"Error: {str(e)}", exc_info=True)
                  return error_response(500, "Internal server error")
          
          def create_user(event):
              """Create new user"""
              try:
                  body = json.loads(event.get('body', '{}'))
                  user_id = body.get('id')
                  name = body.get('name')
                  
                  if not user_id or not name:
                      return error_response(400, "Missing required fields")
                  
                  table.put_item(
                      Item={
                          'id': user_id,
                          'name': name,
                          'created_at': datetime.utcnow().isoformat()
                      }
                  )
                  
                  return success_response(201, {'user_id': user_id})
              except Exception as e:
                  logger.error(f"Error creating user: {str(e)}")
                  return error_response(500, "Failed to create user")
          
          def get_user(user_id):
              """Get user by ID"""
              try:
                  response = table.get_item(Key={'id': user_id})
                  
                  if 'Item' not in response:
                      return error_response(404, "User not found")
                  
                  return success_response(200, response['Item'])
              except Exception as e:
                  logger.error(f"Error getting user: {str(e)}")
                  return error_response(500, "Failed to get user")
          
          def success_response(status_code, data):
              return {
                  'statusCode': status_code,
                  'headers': {'Content-Type': 'application/json'},
                  'body': json.dumps(data)
              }
          
          def error_response(status_code, message):
              return {
                  'statusCode': status_code,
                  'headers': {'Content-Type': 'application/json'},
                  'body': json.dumps({'error': message})
              }
      Layers:
        - !Ref DependenciesLayer
      TracingConfig:
        Mode: Active
      Tags:
        - Key: Application
          Value: api

  # Lambda Layer for Dependencies
  DependenciesLayer:
    Type: AWS::Lambda::LayerVersion
    Properties:
      LayerName: api-dependencies
      Description: Shared dependencies for API functions
      Content:
        ZipFile: |
          # In production, use S3 or Code property
      CompatibleRuntimes:
        - python3.11

  # DLQ for Failed Invocations
  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: api-dlq
      MessageRetentionPeriod: 1209600  # 14 days

  # API Gateway REST API
  RestAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: api
      Description: REST API
      EndpointConfiguration:
        Types:
          - REGIONAL

  # Resource: /users
  UsersResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref RestAPI
      ParentId: !GetAtt RestAPI.RootResourceId
      PathPart: users

  # Resource: /users/{userId}
  UserResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref RestAPI
      ParentId: !Ref UsersResource
      PathPart: '{userId}'

  # POST /users
  CreateUserMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref RestAPI
      ResourceId: !Ref UsersResource
      HttpMethod: POST
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${APIFunction.Arn}/invocations'

  # GET /users/{userId}
  GetUserMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref RestAPI
      ResourceId: !Ref UserResource
      HttpMethod: GET
      AuthorizationType: NONE
      RequestParameters:
        method.request.path.userId: true
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${APIFunction.Arn}/invocations'

  # API Gateway permission for Lambda
  APIGatewayInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref APIFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${RestAPI}/*/*'

  # API Deployment
  APIDeployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn:
      - CreateUserMethod
      - GetUserMethod
    Properties:
      RestApiId: !Ref RestAPI
      StageName: prod

  # CloudWatch Log Group
  LambdaLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/${APIFunction}'
      RetentionInDays: 14

  # CloudWatch Alarms
  LambdaDurationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: Lambda-Duration-High
      MetricName: Duration
      Namespace: AWS/Lambda
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 25000  # 25 seconds
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref APIFunction

  LambdaErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: Lambda-Errors
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref APIFunction

  LambdaThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: Lambda-Throttle
      MetricName: Throttles
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref APIFunction

Outputs:
  APIEndpoint:
    Value: !Sub 'https://${RestAPI}.execute-api.${AWS::Region}.amazonaws.com/prod'
    Description: API Gateway endpoint URL

  FunctionArn:
    Value: !GetAtt APIFunction.Arn
    Description: Lambda function ARN
```

**Key Elements:**
- Lambda function with proper IAM role and permissions
- Environment variables for configuration
- Lambda Layers for code reuse
- Reserved concurrency to prevent overscaling
- X-Ray tracing for debugging
- Structured logging for CloudWatch Insights
- API Gateway with CORS and request validation
- DLQ for failed invocations
- CloudWatch alarms for duration, errors, throttles

### Pattern 2: Async Processing with SQS and DLQ

```yaml
Resources:
  # SQS Queue
  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: processing-queue
      VisibilityTimeout: 300
      MessageRetentionPeriod: 86400
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: processing-dlq
      MessageRetentionPeriod: 1209600

  # Lambda for Processing
  ProcessorFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: queue-processor
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt ProcessorRole.Arn
      Timeout: 300
      MemorySize: 512
      Code:
        ZipFile: |
          import json
          import logging
          
          logger = logging.getLogger()
          logger.setLevel(logging.INFO)
          
          def handler(event, context):
              """Process SQS messages"""
              processed = []
              failed = []
              
              for record in event['Records']:
                  try:
                      body = json.loads(record['body'])
                      logger.info(f"Processing: {body}")
                      
                      # Process the message
                      result = process_item(body)
                      processed.append(result)
                      
                  except Exception as e:
                      logger.error(f"Failed to process: {str(e)}")
                      failed.append(record['messageId'])
              
              return {
                  'statusCode': 200,
                  'processed': len(processed),
                  'failed': len(failed)
              }
          
          def process_item(item):
              # Business logic here
              return item

  ProcessorRole:
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
        - PolicyName: SQSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sqs:ReceiveMessage
                  - sqs:DeleteMessage
                  - sqs:GetQueueAttributes
                Resource: !GetAtt ProcessingQueue.Arn

  # Event Source Mapping (SQS -> Lambda)
  EventSourceMapping:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      EventSourceArn: !GetAtt ProcessingQueue.Arn
      FunctionName: !Ref ProcessorFunction
      BatchSize: 10
      MaximumBatchingWindowInSeconds: 5
      FunctionResponseTypes:
        - ReportBatchItemFailures
      ScalingConfig:
        MaximumConcurrency: 10
```

**Key Elements:**
- SQS queue with automatic DLQ routing
- Event source mapping for Lambda
- Batch processing with failure tracking
- MaximumConcurrency to limit parallelism
- Proper error handling and logging

### Pattern 3: VPC Lambda with Database Access

```yaml
Resources:
  # Lambda in VPC accessing RDS
  VPCFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: vpc-db-function
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt VPCFunctionRole.Arn
      VpcConfig:
        SecurityGroupIds:
          - sg-0123456789abcdef0
        SubnetIds:
          - subnet-0123456789abcdef0
          - subnet-0123456789abcdef1
      Environment:
        Variables:
          DB_HOST: prod-database.c9akciq32.us-east-1.rds.amazonaws.com
          DB_USER: admin
          DB_PASSWORD: !Sub '{{resolve:secretsmanager:rds-password:SecretString:password}}'
          DB_NAME: production
      Code:
        ZipFile: |
          import psycopg2
          import os
          
          def handler(event, context):
              conn = psycopg2.connect(
                  host=os.environ['DB_HOST'],
                  user=os.environ['DB_USER'],
                  password=os.environ['DB_PASSWORD'],
                  database=os.environ['DB_NAME']
              )
              
              cursor = conn.cursor()
              cursor.execute("SELECT COUNT(*) FROM users")
              count = cursor.fetchone()[0]
              
              cursor.close()
              conn.close()
              
              return {'statusCode': 200, 'count': count}

  VPCFunctionRole:
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
        - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
```

**Key Elements:**
- VPC configuration for private subnet access
- ENI creation for database connectivity
- Security group for database access
- Secrets Manager for password management

---

## Integration Approaches

### 1. Integration with API Gateway

Lambda + API Gateway creates:
- REST and HTTP APIs
- Request/response transformation
- Request validation
- CORS support

### 2. Integration with EventBridge

EventBridge + Lambda enables:
- Scheduled cron jobs
- Event-driven processing
- Cross-service event routing
- Third-party integrations

### 3. Integration with S3 Events

S3 + Lambda triggers:
- Image transformations
- Log processing
- File validation
- Data pipeline workflows

### 4. Integration with DynamoDB Streams

DynamoDB Streams + Lambda enables:
- Real-time data synchronization
- Cross-service event propagation
- Cache invalidation
- Audit logging

---

## Common Pitfalls

### ❌ Pitfall 1: No Timeout Configuration

**Problem:** Function hangs indefinitely; Lambda charged until timeout.

**Solution:**
- Set appropriate timeout (default 3s, max 900s)
- Account for database connection time
- Monitor duration metrics

### ❌ Pitfall 2: Unlimited Concurrency

**Problem:** Lambda scales infinitely; causes runaway costs and downstream throttling.

**Solution:**
- Set ReservedConcurrentExecutions
- Account for concurrent database connections
- Monitor throttle metrics

### ❌ Pitfall 3: No Dead Letter Queue

**Problem:** Failed invocations silently discarded; no way to retry.

**Solution:**
- Configure DLQ for async invocations
- Monitor DLQ for failures
- Implement retry logic with exponential backoff

### ❌ Pitfall 4: Cold Start Delays

**Problem:** New instances incur latency; affects user experience.

**Solution:**
- Reduce code size and dependencies
- Use Provisioned Concurrency for critical functions
- Optimize imports and initialization

### ❌ Pitfall 5: Hardcoded Secrets

**Problem:** Database passwords visible in code; security breach.

**Solution:**
- Use environment variables
- Store in Secrets Manager
- Use IAM roles for AWS service access

### ❌ Pitfall 6: No X-Ray Tracing

**Problem:** Slow requests hard to debug; no visibility into downstream services.

**Solution:**
- Enable X-Ray tracing
- Instrument HTTP clients and AWS SDK
- Analyze service maps for bottlenecks

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Concurrency** | Set reserved concurrency; use provisioned for critical functions |
| **Error Handling** | Use DLQ; implement retries; log errors |
| **Timeout** | Set appropriate timeout; account for downstream services |
| **Secrets** | Use Secrets Manager; never hardcode |
| **Monitoring** | Enable X-Ray; set CloudWatch alarms |
| **Layers** | Use layers for shared code and dependencies |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-iam` | Lambda execution roles and permissions |
| `cncf-aws-sqs` | Async invocation with queues |
| `cncf-aws-dynamodb` | Event source from DynamoDB Streams |
| `cncf-aws-cloudwatch` | Function monitoring and logging |
