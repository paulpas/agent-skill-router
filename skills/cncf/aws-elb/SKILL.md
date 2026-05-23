---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures Elastic Load Balancing (ALB, NLB, Classic) for distributing"
  traffic across instances with health checks, SSL termination, and cross-AZ failover.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-ec2, aws-route53, aws-vpc
  role: reference
  scope: infrastructure
  triggers: elb, load balancer, alb, nlb, application load balancer, health check,
    ssl termination, traffic distribution
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
name: elb
------
# Elastic Load Balancing (ELB)

Distribute traffic across EC2 instances with health checks, SSL/TLS termination, and automatic failover for high availability and scalability.

## TL;DR Checklist

- [ ] Use Application Load Balancer (ALB) for HTTP/HTTPS (most common)
- [ ] Use Network Load Balancer (NLB) for extreme performance (millions of RPS)
- [ ] Distribute targets across multiple AZs for high availability
- [ ] Configure health checks with appropriate thresholds
- [ ] Use sticky sessions only for stateful applications
- [ ] Terminate SSL/TLS at load balancer (not instances)
- [ ] Enable connection draining for graceful shutdown
- [ ] Monitor target health and latency metrics
- [ ] Use security groups to restrict ingress to LB only
- [ ] Configure appropriate idle timeout

