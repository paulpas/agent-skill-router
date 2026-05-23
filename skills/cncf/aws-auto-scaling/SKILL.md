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

