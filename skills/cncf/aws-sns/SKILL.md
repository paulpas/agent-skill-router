---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys managed pub/sub messaging with SNS for asynchronous notifications"
  across services, mobile push, email, and Lambda integrations.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-lambda, aws-sqs
  role: reference
  scope: infrastructure
  triggers: messaging, notifications, pub/sub, publish subscribe, sns, subscription,
    topic
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
name: sns
------
# SNS (Simple Notification Service)

Deploy scalable publish-subscribe messaging for asynchronous notifications, mobile push, email delivery, and event-driven architecture.

## TL;DR Checklist

- [ ] Use SNS for broad fan-out messaging (one message to many subscribers)
- [ ] Combine with SQS for persistent queue + notification
- [ ] Enable message filtering at subscriber level
- [ ] Use message attributes for efficient filtering
- [ ] Enable FIFO topics for ordered, deduplicated messages
- [ ] Set up dead-letter queues for failed deliveries
- [ ] Encrypt topics and messages with KMS
- [ ] Monitor delivery and failed message count
- [ ] Use topic policies to control access
- [ ] Test notification delivery before production

