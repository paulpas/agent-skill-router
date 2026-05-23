---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures DNS routing with Route 53 for domain registration, health"
  checks, failover, and traffic management with private hosted zones.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudfront, aws-cloudwatch, aws-elb, cni
  role: reference
  scope: infrastructure
  triggers: cname, dns, domain, failover, health check, hosted zone, route 53, traffic
    policy
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
name: route53
------
# Route 53 (Amazon Route 53)

Configure DNS routing, domain management, and health checks with support for failover, weighted routing, and geolocation-based policies.

## TL;DR Checklist

- [ ] Use health checks for failover routing
- [ ] Implement weighted routing for gradual traffic shifts
- [ ] Use geolocation routing for regional optimization
- [ ] Configure private hosted zones for internal DNS
- [ ] Enable query logging for DNS analysis
- [ ] Monitor health check status with CloudWatch
- [ ] Use traffic policies for complex routing
- [ ] Implement TTL appropriately (short for failover)
- [ ] Test failover procedures regularly
- [ ] Monitor query count and latency

