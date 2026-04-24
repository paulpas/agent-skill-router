---
name: cncf-aws-ec2
description: Deploys, configures, and auto-scales EC2 instances with load balancing,
  using best practices for high availability, security, and cost optimization in AWS
  compute environments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: ec2, compute instances, auto-scaling, load balancing, asg, launch template,
    instance types, ebs volumes
  related-skills: cncf-aws-auto-scaling, cncf-aws-cloudformation, cncf-aws-cloudwatch,
    cncf-aws-elb
---


# EC2 (Elastic Compute Cloud)

Deploy, configure, and scale virtual compute instances on AWS with high availability, automatic scaling, and integrated load balancing. EC2 is the foundational compute service for running applications in AWS.

## TL;DR Checklist

- [ ] Choose appropriate instance type for workload (t3 for burstable, c5 for compute-optimized, m5 for general-purpose)
- [ ] Use Auto Scaling Groups with proper min/max/desired capacity
- [ ] Configure security groups with principle of least privilege
- [ ] Enable detailed CloudWatch monitoring
- [ ] Use IMDSv2 for instance metadata security
- [ ] Implement health checks and lifecycle policies
- [ ] Encrypt EBS volumes by default
- [ ] Use launch templates instead of launch configurations

---

## When to Use

Use EC2 when:

- Running application servers, web servers, or batch processing workloads
- Requiring full OS-level control and custom software installation
- Building auto-scaling infrastructure with custom health checks
- Integrating with load balancers for application distribution
- Running stateful workloads that require persistent storage
- Needing predictable, granular performance control

---

## When NOT to Use

Avoid EC2 when:

- Building simple, event-driven serverless applications (use Lambda instead)
- Needing fully managed Kubernetes clusters (use EKS instead)
- Running stateless microservices that scale to zero (use Fargate instead)
- Requiring minimal infrastructure management overhead
- Running short-lived, infrequent workloads (use Lambda for lower cost)

---

## Purpose and Use Cases

**Primary Purpose:** Provide scalable, resizable compute capacity in the cloud with full control over OS, networking, and performance tuning.

**Common Use Cases:**

1. **Web Server Tier** — Host application servers for web applications with auto-scaling
2. **Batch Processing** — Run data processing jobs with Spot instances for cost optimization
3. **Database Servers** — Run self-managed databases (MySQL, PostgreSQL) with EBS storage
4. **High-Performance Computing** — Run compute-intensive workloads on GPU or CPU-optimized instances
5. **Development and Testing** — Launch environments on-demand with quick teardown

---

## Architecture Design Patterns

### Pattern 1: Auto-Scaling Web Application

```yaml
# Launch Template - defines instance configuration
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        ImageId: ami-0c55b159cbfafe1f0
        InstanceType: t3.medium
        KeyName: my-key-pair
        SecurityGroupIds:
          - sg-0123456789abcdef0
        IamInstanceProfile:
          Arn: arn:aws:iam::123456789012:instance-profile/EC2-App-Role
        UserData:
          Fn::Base64: |
            #!/bin/bash
            yum update -y
            yum install -y httpd
            systemctl start httpd
        TagSpecifications:
          - ResourceType: instance
            Tags:
              - Key: Name
                Value: web-app-instance
              - Key: Environment
                Value: production
        BlockDeviceMappings:
          - DeviceName: /dev/xvda
            Ebs:
              VolumeSize: 100
              VolumeType: gp3
              DeleteOnTermination: true
              Encrypted: true

  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      MinSize: 2
      MaxSize: 10
      DesiredCapacity: 3
      VPCZoneIdentifier:
        - subnet-0123456789abcdef0
        - subnet-0123456789abcdef1
        - subnet-0123456789abcdef2
      TargetGroupARNs:
        - arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web-app/0123456789abcdef0
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
      Tags:
        - Key: Name
          Value: web-app-asg
          PropagateAtLaunch: true

  ScaleUpPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AdjustmentType: ChangeInCapacity
      AutoScalingGroupName: !Ref AutoScalingGroup
      Cooldown: 300
      ScalingAdjustment: 2

  ScaleDownPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AdjustmentType: ChangeInCapacity
      AutoScalingGroupName: !Ref AutoScalingGroup
      Cooldown: 300
      ScalingAdjustment: -1

  CPUHighAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmDescription: Scale up when CPU > 70%
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 70
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: AutoScalingGroupName
          Value: !Ref AutoScalingGroup
      AlarmActions:
        - !Ref ScaleUpPolicy

  CPULowAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmDescription: Scale down when CPU < 25%
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 25
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: AutoScalingGroupName
          Value: !Ref AutoScalingGroup
      AlarmActions:
        - !Ref ScaleDownPolicy
```

**Key Elements:**
- Launch Template encapsulates instance configuration
- User Data bootstraps application installation
- Auto Scaling Group manages capacity across multiple AZs
- ELB health checks ensure only healthy instances receive traffic
- CloudWatch alarms trigger scaling policies based on CPU utilization
- Encrypted EBS volumes for data protection
- IAM instance profile grants permissions to application

### Pattern 2: Spot Instance Strategy for Cost Optimization

```yaml
Resources:
  SpotFleetRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: spotfleet.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole

  SpotFleetRequest:
    Type: AWS::EC2::SpotFleet
    Properties:
      SpotFleetRequestConfigData:
        AllocationStrategy: lowestPrice
        IamFleetRole: !GetAtt SpotFleetRole.Arn
        LaunchSpecifications:
          - ImageId: ami-0c55b159cbfafe1f0
            InstanceType: t3.medium
            KeyName: my-key-pair
            SpotPrice: '0.0416'
            SubnetId: subnet-0123456789abcdef0
            WeightedCapacity: 1
          - ImageId: ami-0c55b159cbfafe1f0
            InstanceType: t3.large
            KeyName: my-key-pair
            SpotPrice: '0.0832'
            SubnetId: subnet-0123456789abcdef0
            WeightedCapacity: 2
        TargetCapacity: 4
        Type: maintain
        ValidFrom: !Sub 
          - '${ISO8601Date}'
          - ISO8601Date: !GetAtt SpotFleetTimestamp.Timestamp
        TerminateInstancesWithExpiration: true
```

**Key Elements:**
- Multiple instance type options provide flexibility
- LowestPrice strategy optimizes cost
- WeightedCapacity allows different instance types to contribute to target capacity
- Spot instances reduce compute costs by 70-90%

### Pattern 3: Security-Hardened Instance Configuration

```yaml
Resources:
  InstanceSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group with principle of least privilege
      VpcId: vpc-0123456789abcdef0
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS from anywhere
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: HTTP from anywhere
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: Allow all outbound traffic

  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2InstanceRole

  EC2InstanceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
      Policies:
        - PolicyName: CloudWatchLogs
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: arn:aws:logs:*:*:*

  HardenedInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1f0
      InstanceType: t3.medium
      IamInstanceProfile: !Ref EC2InstanceProfile
      SecurityGroupIds:
        - !Ref InstanceSecurityGroup
      MetadataOptions:
        HttpEndpoint: enabled
        HttpTokens: required
        HttpPutResponseHopLimit: 1
      BlockDeviceMappings:
        - DeviceName: /dev/xvda
          Ebs:
            VolumeSize: 50
            VolumeType: gp3
            DeleteOnTermination: true
            Encrypted: true
      Monitoring: true
      Tags:
        - Key: Name
          Value: hardened-instance
```

**Security Features:**
- IMDSv2 enforced (HttpTokens: required)
- CloudWatch detailed monitoring enabled
- IAM role with SSM access for secure shell access
- Encrypted EBS volumes
- Security group with least privilege ingress rules
- CloudWatch Logs integration for audit trails

---

## Integration Approaches

### 1. Integration with Load Balancers

EC2 instances work with Elastic Load Balancing (ALB, NLB, Classic ELB) for:
- Distributing traffic across instances
- Health checks and automatic failover
- SSL/TLS termination
- Cross-AZ load balancing

### 2. Integration with Auto Scaling

Auto Scaling Groups:
- Automatically launch/terminate instances based on demand
- Distribute instances across multiple AZs for high availability
- Support scheduled scaling and dynamic scaling policies
- Integrate with CloudWatch metrics for scaling triggers

### 3. Integration with CloudWatch

CloudWatch provides:
- EC2 metric collection (CPU, network, disk)
- Custom metrics from applications
- Alarms to trigger scaling actions
- Logs for application and system diagnostics

### 4. Integration with Systems Manager

AWS Systems Manager enables:
- Session Manager for secure shell access without SSH keys
- Patch Manager for automated OS patching
- Parameter Store for application configuration
- State Manager for configuration management

### 5. Integration with IAM

IAM roles provide:
- Secure credential management for applications
- Fine-grained permissions for AWS API access
- Temporary credentials (auto-rotated)
- Cross-account access capabilities

---

## Common Pitfalls

### ❌ Pitfall 1: Choosing Wrong Instance Type

**Problem:** Oversizing instances wastes money; undersizing causes performance issues.

**Solution:**
- Analyze workload requirements (CPU, memory, network)
- Use t3 instances (burstable) for variable workloads
- Use c5/c6 (compute-optimized) for CPU-intensive workloads
- Use m5/m6 (general-purpose) for balanced workloads
- Use Compute Optimizer to analyze instance fit

### ❌ Pitfall 2: No Auto Scaling

**Problem:** Manual instance management doesn't handle traffic spikes; over-provisioning increases costs.

**Solution:**
- Always use Auto Scaling Groups for production workloads
- Set appropriate target tracking policies (CPU, ALB request count)
- Test scaling policies under load before going live

### ❌ Pitfall 3: Security Group Rules Too Permissive

**Problem:** Overly open security groups increase attack surface.

**Solution:**
- Use principle of least privilege
- Restrict ingress to only required ports and sources
- Use security groups as virtual firewalls
- Regularly audit security group rules

### ❌ Pitfall 4: Not Monitoring Instance Health

**Problem:** Instances fail silently; unhealthy instances continue receiving traffic.

**Solution:**
- Enable detailed CloudWatch monitoring
- Use ELB health checks (not just EC2 status checks)
- Configure CloudWatch alarms for critical metrics
- Set up log aggregation and analysis

### ❌ Pitfall 5: Unencrypted EBS Volumes

**Problem:** Data at rest is exposed to unauthorized access.

**Solution:**
- Enable EBS encryption by default in account settings
- Use AWS KMS keys for encryption (customer-managed keys for sensitive data)
- Encrypt snapshots and volumes used for backups

### ❌ Pitfall 6: Using Launch Configurations Instead of Launch Templates

**Problem:** Launch configurations are deprecated; limited versioning.

**Solution:**
- Always use Launch Templates for new deployments
- Templates support versioning, mixed instance types, and advanced options
- Migrate existing Launch Configurations to Templates

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Instance Selection** | Use right-sized instances; leverage Compute Optimizer for recommendations |
| **Availability** | Distribute across 3+ AZs; use Auto Scaling Groups with min >= 2 |
| **Security** | IMDSv2, encrypted EBS, IAM roles, least-privilege security groups |
| **Monitoring** | Enable detailed CloudWatch monitoring; set up alarms for key metrics |
| **Cost** | Use Spot instances for fault-tolerant workloads; right-size instances |
| **Scaling** | Use target tracking policies; avoid manual scaling |
| **Updates** | Use Systems Manager Patch Manager for OS patching |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-elb` | Load balance traffic across EC2 instances |
| `cncf-aws-vpc` | Configure networking for EC2 instances |
| `cncf-aws-iam` | Manage EC2 instance permissions |
| `cncf-aws-cloudwatch` | Monitor EC2 metrics and logs |
| `cncf-aws-auto-scaling` | Configure dynamic scaling policies |
| `cncf-aws-cloudformation` | Infrastructure as code for EC2 resources |
