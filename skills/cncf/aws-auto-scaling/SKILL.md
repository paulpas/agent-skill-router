---
name: auto-scaling
description: '"Configures automatic scaling of compute resources (EC2, RDS, DynamoDB"
  Lambda) based on demand metrics with scaling policies and lifecycle hooks.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: asg, auto-scaling, dynamic scaling, scaling policy, scheduled scaling,
    target tracking
  related-skills: aws-cloudwatch, aws-dynamodb, aws-ec2, aws-rds
---




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
