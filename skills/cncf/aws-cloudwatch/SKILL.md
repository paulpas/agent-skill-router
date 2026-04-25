---
name: cloudwatch
description: '"Configures CloudWatch monitoring with metrics, logs, alarms, and dashboards"
  for visibility into AWS resource performance, application health, and operational
  metrics.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloudwatch, monitoring, metrics, logs, alarms, dashboard, log insights,
    log groups
  related-skills: aws-auto-scaling, aws-dynamodb, aws-ec2, aws-eks
---




# CloudWatch (Amazon CloudWatch)

Monitor AWS resources with metrics, logs, and alarms. CloudWatch provides complete operational visibility into infrastructure performance, application health, and business metrics.

## TL;DR Checklist

- [ ] Enable detailed monitoring for all critical resources
- [ ] Create metric alarms with appropriate thresholds
- [ ] Set up log groups with appropriate retention
- [ ] Use CloudWatch Insights for log analysis
- [ ] Create dashboards for key operational metrics
- [ ] Set up composite alarms for complex conditions
- [ ] Enable CloudTrail integration for API auditing
- [ ] Use custom metrics for application-specific monitoring
- [ ] Implement log-based alarms for critical events
- [ ] Automate remediation via SNS/Lambda

---

## When to Use

Use CloudWatch when:

- Monitoring AWS resource metrics (EC2, RDS, Lambda, etc.)
- Aggregating application logs from multiple sources
- Creating operational dashboards
- Setting up alerts for anomalies or thresholds
- Analyzing application behavior and performance
- Compliance and audit trail requirements

---

## When NOT to Use

Avoid CloudWatch for:

- Complex data warehousing (use Athena instead)
- Real-time streaming analytics (use Kinesis instead)
- Long-term cost analysis (use Cost Explorer instead)

---

## Purpose and Use Cases

**Primary Purpose:** Provide centralized monitoring for AWS resources and applications with real-time metrics, logs, and alarms for operational visibility and automated response.

**Common Use Cases:**

1. **Resource Monitoring** — Track CPU, memory, disk usage
2. **Application Logging** — Aggregate logs from EC2, Lambda, containers
3. **Performance Dashboards** — Real-time operational visibility
4. **Alert and Response** — Auto-trigger remediation on critical events
5. **Compliance Auditing** — Log API calls and changes
6. **Cost Analysis** — Monitor billing and usage metrics

---

## Architecture Design Patterns

### Pattern 1: Comprehensive Monitoring Dashboard

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # CloudWatch Dashboard
  OperationalDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: production-operations
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  [ "AWS/EC2", "CPUUtilization", { "stat": "Average" } ],
                  [ ".", "NetworkIn", { "stat": "Sum" } ],
                  [ ".", "NetworkOut", { "stat": "Sum" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "EC2 Instance Metrics"
              }
            },
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  [ "AWS/Lambda", "Invocations", { "stat": "Sum" } ],
                  [ ".", "Errors", { "stat": "Sum" } ],
                  [ ".", "Duration", { "stat": "Average" } ],
                  [ ".", "Throttles", { "stat": "Sum" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Lambda Function Metrics"
              }
            },
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  [ "AWS/RDS", "CPUUtilization", { "stat": "Average" } ],
                  [ ".", "DatabaseConnections", { "stat": "Average" } ],
                  [ ".", "ReadLatency", { "stat": "Average" } ],
                  [ ".", "WriteLatency", { "stat": "Average" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "RDS Database Metrics"
              }
            },
            {
              "type": "log",
              "properties": {
                "query": "fields @timestamp, @message, @duration, status | stats count() as error_count by status",
                "region": "${AWS::Region}",
                "title": "Application Errors (Last Hour)"
              }
            }
          ]
        }

  # Log Group for Application Logs
  ApplicationLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /app/production
      RetentionInDays: 30

  # Log Stream
  ApplicationLogStream:
    Type: AWS::Logs::LogStream
    Properties:
      LogGroupName: !Ref ApplicationLogGroup
      LogStreamName: api-server

  # Metric Filter for Errors
  ErrorMetricFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[time, request_id, level = "ERROR", ...]'
      LogGroupName: !Ref ApplicationLogGroup
      MetricTransformations:
        - MetricName: ApplicationErrors
          MetricNamespace: /app/production
          MetricValue: '1'
          DefaultValue: 0

  # Metric Alarm - High Error Rate
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: app-high-error-rate
      AlarmDescription: Alert when error rate exceeds 10 per minute
      MetricName: ApplicationErrors
      Namespace: /app/production
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSErrorTopic

  # SNS Topic for Notifications
  SNSErrorTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: app-errors

  SNSEmailSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: email
      TopicArn: !Ref SNSErrorTopic
      Endpoint: ops-team@example.com

  # Composite Alarm - Multiple Conditions
  CriticalHealthAlarm:
    Type: AWS::CloudWatch::CompositeAlarm
    Properties:
      AlarmName: critical-health
      AlarmRule: !Sub |
        ALARM(${HighErrorRateAlarm}) OR 
        ALARM(${HighLatencyAlarm}) OR 
        ALARM(${DatabaseConnectionsAlarm})
      ActionsEnabled: true
      AlarmActions:
        - !Ref SNSErrorTopic

  # Metric Alarm - High Database Latency
  HighLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: db-high-latency
      MetricName: ReadLatency
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 50  # 50ms
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: prod-database

  # Metric Alarm - Database Connections High
  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: db-high-connections
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 1
      Threshold: 400
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: prod-database

  # Anomaly Detector for CPU
  CPUAnomalyDetector:
    Type: AWS::CloudWatch::AnomalyDetector
    Properties:
      Namespace: AWS/EC2
      MetricName: CPUUtilization
      Stat: Average

  # Anomaly Alarm
  CPUAnomalyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: ec2-cpu-anomaly
      ComparisonOperator: LessThanLowerOrGreaterThanUpperThreshold
      EvaluationPeriods: 1
      Metrics:
        - Id: m1
          ReturnData: true
          MetricStat:
            Metric:
              Namespace: AWS/EC2
              MetricName: CPUUtilization
              Dimensions:
                - Name: InstanceId
                  Value: i-0123456789abcdef0
            Period: 300
            Stat: Average
        - Id: ad1
          Expression: ANOMALY_DETECTOR(m1, 2)
      ThresholdMetricId: ad1
      AlarmActions:
        - !Ref SNSErrorTopic

  # Log-Based Alarm - Fatal Errors
  FatalErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: app-fatal-error
      MetricName: FatalErrorCount
      Namespace: /app/production
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref SNSErrorTopic

  # Metric for Fatal Errors
  FatalErrorMetricFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[time, request_id, level = "FATAL", ...]'
      LogGroupName: !Ref ApplicationLogGroup
      MetricTransformations:
        - MetricName: FatalErrorCount
          MetricNamespace: /app/production
          MetricValue: '1'
          DefaultValue: 0

  # Custom Metric Filter - Request Duration
  DurationMetricFilter:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[time, request_id, level, message, duration = *ms]'
      LogGroupName: !Ref ApplicationLogGroup
      MetricTransformations:
        - MetricName: RequestDuration
          MetricNamespace: /app/production
          MetricValue: '$duration'
          DefaultValue: 0

  # Insight Query - Top Errors
  # Saved query: fields @timestamp, @message | stats count() by @message

Outputs:
  DashboardURL:
    Value: !Sub 'https://console.aws.amazon.com/cloudwatch/home?region=${AWS::Region}#dashboards:name=production-operations'
    Description: CloudWatch Dashboard URL

  LogGroupName:
    Value: !Ref ApplicationLogGroup
    Description: Application log group name

  ErrorAlarmName:
    Value: !Ref HighErrorRateAlarm
    Description: High error rate alarm name
```

**Key Elements:**
- Operational dashboard with key metrics
- Log groups with appropriate retention
- Metric filters for extracting metrics from logs
- Composite alarms for complex conditions
- Anomaly detection for behavioral analysis
- SNS integration for notifications
- Log-based alarms for event detection

### Pattern 2: Detailed Monitoring with Custom Metrics

```yaml
Resources:
  # Custom Namespace for Application
  CustomMetricNamespace:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: custom-metrics
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  [ "MyApplication", "OrdersProcessed", { "stat": "Sum" } ],
                  [ ".", "OrderValue", { "stat": "Average" } ],
                  [ ".", "ProcessingTime", { "stat": "Average" } ],
                  [ ".", "ErrorRate", { "stat": "Average" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS::Region}",
                "title": "Business Metrics"
              }
            }
          ]
        }

  # Business Metric Alarm
  OrderProcessingAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: low-order-processing
      MetricName: OrdersProcessed
      Namespace: MyApplication
      Statistic: Sum
      Period: 3600
      EvaluationPeriods: 1
      Threshold: 100  # Less than 100 orders per hour
      ComparisonOperator: LessThanThreshold
      AlarmActions:
        - !Ref SNSAlertTopic

  SNSAlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: app-alerts
```

**Key Elements:**
- Custom namespace for business metrics
- Application publishes metrics via CloudWatch API
- Alarms on business KPIs (orders, revenue, errors)

### Pattern 3: CloudWatch Insights for Log Analysis

```yaml
# Example queries for CloudWatch Insights:

# Find top 10 slowest requests
fields @timestamp, @duration, @message
| filter ispresent(@duration)
| stats count() as count, avg(@duration) as avg_duration by @message
| sort avg_duration desc
| limit 10

# Error rate by endpoint
fields @timestamp, @message, status, endpoint
| filter status >= 400
| stats count() as error_count, count() * 100.0 / sum(count()) as error_rate by endpoint
| sort error_rate desc

# Database query performance
fields @timestamp, query, duration
| filter duration > 1000
| stats count() as slow_queries, avg(duration) as avg_duration by query
| sort slow_queries desc

# User activity timeline
fields @timestamp, user_id, action
| stats count() as action_count by user_id, action
| sort @timestamp desc
```

**Key Elements:**
- Powerful query language (similar to SQL)
- Real-time analysis of logs
- Statistical aggregations and grouping
- Performance trend analysis
- Ad-hoc troubleshooting

---

## Integration Approaches

### 1. Integration with SNS

CloudWatch + SNS enables:
- Email/SMS notifications
- Lambda trigger on alarm state change
- Third-party service integration (PagerDuty, Slack)

### 2. Integration with Lambda

CloudWatch + Lambda enables:
- Automated remediation
- Event-driven workflows
- Metric computation and aggregation

### 3. Integration with X-Ray

X-Ray + CloudWatch provides:
- Distributed tracing visualization
- Service performance analysis
- Bottleneck identification

### 4. Integration with EventBridge

EventBridge + CloudWatch enables:
- Event-driven automation
- Complex event routing
- Cross-service workflow orchestration

---

## Common Pitfalls

### ❌ Pitfall 1: No Alarms

**Problem:** Issues detected manually; slow response time.

**Solution:**
- Set alarms for all critical metrics
- Composite alarms for complex conditions
- Test alarm notifications regularly

### ❌ Pitfall 2: Insufficient Log Retention

**Problem:** Cannot analyze historical data; compliance violations.

**Solution:**
- Set appropriate retention (7-30 days for production)
- Archive to S3 for long-term retention
- Use Athena for cost-effective historical querying

### ❌ Pitfall 3: No Baseline Metrics

**Problem:** Cannot detect anomalies without baseline.

**Solution:**
- Enable anomaly detection for key metrics
- Establish baseline from historical data
- Regular threshold reviews

### ❌ Pitfall 4: Alert Fatigue

**Problem:** Too many alarms cause alert fatigue; important alerts ignored.

**Solution:**
- Tune thresholds based on actual behavior
- Use composite alarms for related conditions
- Only alert on actionable issues

### ❌ Pitfall 5: No Log Aggregation

**Problem:** Logs scattered across multiple sources; difficult to correlate.

**Solution:**
- Aggregate logs from all sources to CloudWatch
- Use consistent log format (JSON recommended)
- Add request IDs for correlation

### ❌ Pitfall 6: Missing Context in Logs

**Problem:** Log messages lack context; hard to debug.

**Solution:**
- Include request ID, user ID, operation context
- Structured logging (JSON) for parsing
- Appropriate log levels (DEBUG, INFO, WARN, ERROR)

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Metrics** | Detailed monitoring; custom metrics for business KPIs |
| **Alarms** | Set thresholds; composite alarms; test notifications |
| **Logs** | Aggregate from all sources; consistent format |
| **Retention** | Appropriate retention; archive for long-term |
| **Insights** | Regular analysis; save queries for patterns |
| **Dashboards** | Key operational metrics; shared across team |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-ec2` | Monitor instance metrics |
| `cncf-aws-lambda` | Monitor function invocations and errors |
| `cncf-aws-rds` | Monitor database performance |
| `cncf-aws-dynamodb` | Monitor table throughput and latency |
