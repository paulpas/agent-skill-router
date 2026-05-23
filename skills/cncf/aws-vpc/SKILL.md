---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures Virtual Private Clouds with subnets, route tables, NAT gateways"
  security groups, and network ACLs for secure, isolated network infrastructure on
  AWS.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudformation, aws-ec2, aws-eks, aws-elb
  role: reference
  scope: infrastructure
  triggers: vpc, virtual private cloud, subnet, route table, security group, nat gateway,
    network acl, vpn
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
name: vpc
------
# VPC (Virtual Private Cloud)

Design and configure isolated cloud networks with subnets, route tables, security groups, and advanced networking features for secure, scalable infrastructure.

## TL;DR Checklist

- [ ] Use multiple availability zones for high availability
- [ ] Separate public and private subnets by function
- [ ] Use NAT gateways for private subnet egress (not NAT instances)
- [ ] Configure security groups as stateful firewalls
- [ ] Use network ACLs for stateless, subnet-level filtering
- [ ] Enable VPC Flow Logs for network traffic analysis
- [ ] Configure route tables with specific routes (no overly broad routes)
- [ ] Use VPC endpoints for private AWS service access
- [ ] Enable DNS hostnames and DNS resolution
- [ ] Plan IP address space with non-overlapping CIDRs

