---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures automatic scaling of compute resources (EC2, RDS, DynamoDB"
  Lambda) based on demand metrics with scaling policies and lifecycle hooks.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-dynamodb, aws-ec2, aws-rds
  role: reference
  scope: infrastructure
  triggers: asg, auto-scaling, dynamic scaling, scaling policy, scheduled scaling,
    target tracking
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  version: 1.0.0
name: auto-scaling
------
# Auto Scaling

Configure automatic resource scaling based on demand metrics with target tracking policies, scheduled scaling, and lifecycle hooks.

## TL;DR Checklist

- [ ] Use target tracking policies (CPU, ALB request count)
- [ ] Set appropriate min/max capacity bounds
- [ ] Implement cooldown periods to prevent thrashing
- [ ] Configure lifecycle hooks for graceful shutdown
- [ ] Monitor scaling activity with CloudWatch
- [ ] Test scaling policies under realistic load
- [ ] Use predictive scaling for recurring patterns
- [ ] Implement step scaling for gradual increases
- [ ] Regular capacity planning and review
- [ ] Set up alarms for scaling failures

---

## When to Use

Use Auto Scaling when:

- Capacity needs fluctuate with demand
- Building cost-optimized infrastructure
- Requiring high availability with failover
- Running variable workloads

---

## Purpose and Use Cases

**Primary Purpose:** Automatically adjust compute capacity based on demand metrics, optimizing cost and ensuring availability.

**Common Use Cases:**

1. **Web Applications** — Scale EC2 with traffic
2. **Batch Processing** — Scale on job backlog
3. **Database Replicas** — Scale read capacity
4. **API Services** — Scale on request rate

---

## Architecture Design Patterns

### Pattern 1: EC2 Auto Scaling with Target Tracking

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Auto Scaling Group
  ApplicationASG:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      AutoScalingGroupName: app-asg
      LaunchTemplate:
        LaunchTemplateId: lt-0123456789abcdef0
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      MinSize: 2
      MaxSize: 10
      DesiredCapacity: 3
      VPCZoneIdentifier:
        - subnet-0123456789abcdef0
        - subnet-0123456789abcdef1
        - subnet-0123456789abcdef2
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
      TargetGroupARNs:
        - arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/0123456789abcdef0
      Tags:
        - Key: Name
          Value: app-instance
          PropagateAtLaunch: true

  # Target Tracking Scaling Policy
  CPUScalingPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AutoScalingGroupName: !Ref ApplicationASG
      PolicyType: TargetTrackingScaling
      TargetTrackingConfiguration:
        PredefinedMetricSpecification:
          PredefinedMetricType: ASGAverageCPUUtilization
        TargetValue: 70
        ScaleOutCooldown: 60
        ScaleInCooldown: 300

  # ALB Request Count Policy
  RequestCountPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AutoScalingGroupName: !Ref ApplicationASG
      PolicyType: TargetTrackingScaling
      TargetTrackingConfiguration:
        PredefinedMetricSpecification:
          PredefinedMetricType: ALBRequestCountPerTarget
          ResourceLabel: !Sub 'app/my-load-balancer/0123456789abcdef0'
        TargetValue: 1000
        ScaleOutCooldown: 60
        ScaleInCooldown: 300

  # Lifecycle Hook for Graceful Shutdown
  TerminationHook:
    Type: AWS::AutoScaling::LifecycleHook
    Properties:
      AutoScalingGroupName: !Ref ApplicationASG
      LifecycleTransition: autoscaling:EC2_INSTANCE_TERMINATING
      DefaultResult: CONTINUE
      HeartbeatTimeout: 300
      NotificationTargetARN: !GetAtt TerminationQueue.Arn
      RoleARN: !GetAtt ASGRole.Arn

  TerminationQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 300

  ASGRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: autoscaling.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: PublishToSNS
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - sqs:SendMessage
                Resource: !GetAtt TerminationQueue.Arn

  # CloudWatch Alarms
  ScalingActivityAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: asg-scaling-failure
      MetricName: GroupTerminatingInstances
      Namespace: AWS/AutoScaling
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: AutoScalingGroupName
          Value: !Ref ApplicationASG
```

**Key Elements:**
- Auto Scaling Group with min/max bounds
- Target tracking for CPU utilization
- Request count scaling for ALB
- Lifecycle hooks for graceful shutdown
- CloudWatch alarms for failures

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Policies** | Target tracking (simpler than step scaling) |
| **Cooldown** | Prevent thrashing with appropriate delays |
| **Lifecycle** | Hooks for graceful instance termination |
| **Monitoring** | CloudWatch metrics and alarms |
| **Testing** | Load test scaling policies |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-ec2` | Instances in Auto Scaling Group |
| `cncf-aws-cloudwatch` | Scaling metrics and alarms |
| `cncf-aws-elb` | Health checks and target groups |
---

## Core Workflow

1. **Assess Requirements** — Understand the use case, scale, integration needs, and existing infrastructure. **Checkpoint:** Document requirements, constraints, and success criteria.

2. **Design Architecture** — Plan component interactions, data flow, and deployment strategy using cloud-native best practices. **Checkpoint:** Verify the architecture addresses all requirements and follows CNCF conventions.

3. **Implement & Configure** — Create manifests, configurations, and deployment scripts. Include resource limits, health checks, and observability hooks. **Checkpoint:** Validate all YAML against schema and test in a staging environment.

4. **Deploy & Monitor** — Apply manifests to the cluster, verify component health, and confirm observability is working. **Checkpoint:** Confirm all pods/services are running, probes passing, and metrics/alerts configured.

---

## Constraints

### MUST DO
- Include at least one complete working YAML manifest example
- Note when content is auto-generated vs. manually verified
- Reference relevant CNCF project documentation

### MUST NOT DO
- Deploy manifests without testing in a staging environment first
- Use deprecated API versions (e.g., apps/v1beta1)
- Omit resource limits and requests in Kubernetes manifests
