---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures CloudWatch monitoring with metrics, logs, alarms, and dashboards"
  for visibility into AWS resource performance, application health, and operational
  metrics.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-auto-scaling, aws-dynamodb, aws-ec2, aws-eks
  role: reference
  scope: infrastructure
  triggers: cloudwatch, monitoring, metrics, logs, alarms, dashboard, log insights,
    log groups
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
name: cloudwatch
------
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

