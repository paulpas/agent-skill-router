---
name: aws-ec2

description: Comprehensive skill for managing and deploying AWS EC2 instances, including scaling, security group configuration, and SDK usage examples.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: "1.0.0"\n  domain: cncf\n  triggers: aws ec2, ec2 instances, aws sdk, scaling, security groups, instance management\n  archetypes: educational, tactical\n  related-skills: aws-iam, aws-sdk, aws-s3\n  output-format: code\n  role: implementation\n  scope: infrastructure\n  anti_triggers: vague concepts, misconfigured instances\n  response_profile: medium\n---\ndescription: Comprehensive skill for managing and deploying AWS EC2 instances, including scaling, security group configuration, and SDK usage examples.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: aws ec2, ec2 instances, aws sdk, scaling, security groups, instance management
  archetypes:
    - educational
    - tactical
  related-skills: aws-iam, aws-sdk, aws-s3
  output-format: code
  role: implementation
  scope: infrastructure
---

# AWS EC2 Management Skill

Deploy, configure, and manage Elastic Compute Cloud (EC2) instances on AWS with scalable architectures and rigorous security practices. This skill will cover:

## TL;DR Checklist
- [ ] Choose the appropriate EC2 instance types for workloads.
- [ ] Implement Auto Scaling Groups for managing instance scaling.
- [ ] Configure security groups with the principle of least privilege.
- [ ] Understand how to manage instances using the AWS SDK (Boto3).

---

## Purpose and Use Cases
* **Primary Purpose**: Provide scalable computation capacity in the cloud while allowing users to manage infrastructure through comprehensive SDK usage.
* **Common Use Cases**:
  1. Hosting web applications in a highly available configuration.
  2. Running background processing workloads and batch jobs.
  3. Developing and testing applications in scalable environments.
  4. Implementing data analytics workflows using compute clusters.

---

## Architecture Design Patterns
### Pattern 1: Launch and Manage EC2 Instances
```python
import boto3
from botocore.exceptions import ClientError

def launch_instance(ami_id, instance_type='t2.micro', key_name='my-key', security_group='my-sg'):
    ec2 = boto3.resource('ec2')
    try:
        instance = ec2.create_instances(
            ImageId=ami_id,
            MinCount=1,
            MaxCount=1,
            InstanceType=instance_type,
            KeyName=key_name,
            SecurityGroups=[security_group]
        )
        print(f'Instance created: {instance[0].id}')  # Log instance ID
        return instance[0].id
    except ClientError as e:
        print(f'Error occurred: {e}')

# Example usage
launch_instance('ami-12345678', 't2.micro', 'my-key', 'my-sg')
```

### Pattern 2: Configure Security Groups
```python
def create_security_group(group_name, description, vpc_id):
    ec2 = boto3.client('ec2')
    try:
        response = ec2.create_security_group(GroupName=group_name,
                                               Description=description,
                                               VpcId=vpc_id)
        sg_id = response['GroupId']
        print(f'Security Group {sg_id} created successfully')
        return sg_id
    except ClientError as e:
        print(e)

# Example usage
create_security_group('MySecurityGroup', 'My security group for EC2 instances', 'vpc-12345678')
```

### Pattern 3: Scaling EC2 Instances with Auto Scaling
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  LaunchConfiguration:
    Type: AWS::AutoScaling::LaunchConfiguration
    Properties:
      ImageId: ami-12345678
      InstanceType: t2.micro
      SecurityGroups:
        - my-sg
      KeyName: my-key

  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      LaunchConfigurationName: !Ref LaunchConfiguration
      MinSize: 1
      MaxSize: 10
      DesiredCapacity: 2
      VPCZoneIdentifier:
        - subnet-12345678
      Tags:
        - Key: Name
          Value: MyEC2Instance
          PropagateAtLaunch: true

  ScalingPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AutoScalingGroupName: !Ref AutoScalingGroup
      PolicyType: SimpleScaling
      ScalingAdjustment: 1
      Cooldown: 300

```

---

## Integration Approaches
1. **Load Balancing**: EC2 instances can be integrated with Elastic Load Balancing (ELB) for optimized routing of traffic.
2. **Auto Scaling**: Use Auto Scaling Groups to automatically adjust capacity based on load.
3. **CloudWatch Monitoring**: Monitor EC2 metrics with CloudWatch to ensure performance and health.
4. **IAM Roles**: Use IAM to define permissions for EC2 instances securely.

---

## Common Pitfalls
### ❌ Misconfigured Security Groups
**Solution**: Always configure security groups with the principle of least privilege and routinely audit them.
### ❌ Indiscriminate Scaling
**Solution**: Tune your Auto Scaling policies carefully to match your application load patterns.
### ❌ Not Using Tags
**Solution**: Tag instances for better resource management and reporting.

---

## Best Practices
- **Select the Right Instance Type**: Use the right instance types based on workload requirements.
- **Scale Wisely**: Always implement Auto Scaling for production workloads to handle changes in traffic.
- **Monitor**: Utilize CloudWatch for real-time monitoring and alarms on the health of EC2 instances.
- **Optimize Costs**: Regularly analyze your usage and consider using Reserved Instances or Spot Instances for cost savings.

---

## Conclusion
Using AWS EC2 enables powerful cloud-based computing at scale. This skill provides essential patterns and practices to manage and deploy EC2 instances effectively.