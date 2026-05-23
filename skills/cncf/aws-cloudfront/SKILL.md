---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures CloudFront CDN for global content distribution with edge
  caching" DDoS protection, and SSL/TLS termination for improved performance and security.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-route53, aws-s3
  role: reference
  scope: infrastructure
  triggers: cloudfront, cdn, content distribution, edge caching, ddos protection,
    waf, ssl termination, content delivery
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
name: cloudfront
------
# CloudFront (Amazon CloudFront)

Distribute content globally with edge caching, DDoS protection, and SSL/TLS termination for improved performance and security.

## TL;DR Checklist

- [ ] Use CloudFront for all static content (CSS, JS, images)
- [ ] Set appropriate cache TTLs based on content type
- [ ] Enable compression for text content
- [ ] Use Origin Access Identity (OAI) for S3 buckets
- [ ] Enable WAF for DDoS and attack protection
- [ ] Implement cache invalidation strategy
- [ ] Monitor cache hit ratio and improve
- [ ] Use SSL/TLS for all distributions
- [ ] Enable query string and cookie forwarding selectively
- [ ] Set up CloudWatch metrics and alarms

