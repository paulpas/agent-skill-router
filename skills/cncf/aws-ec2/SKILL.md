---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys, configures, and auto-scales EC2 instances with load balancing"
  using best practices for high availability, security, and cost optimization in AWS
  compute environments.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-auto-scaling, aws-cloudformation, aws-cloudwatch, aws-iam
  role: reference
  scope: infrastructure
  triggers: ec2, compute instances, auto-scaling, load balancing, asg, launch template,
    instance types, ebs volumes
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
name: ec2
------
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

