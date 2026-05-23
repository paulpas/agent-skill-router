---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent message queue troubleshooting for Kafka, RabbitMQ,
  SQS, and NATS clusters with diagnostic commands, dead letter handling, and backlog
  resolution
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-nats
  role: implementation
  scope: implementation
  triggers: message queue troubleshooting, kafka cluster, rabbitmq queues, dead letter,
    sqs visibility, message backlog, nats streaming, how do i debug queues
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: message-queue-troubleshooting
------
# Message Queue Troubleshooting

Diagnoses and resolves issues across Kafka, RabbitMQ, SQS, and NATS message queues with real diagnostic commands, dead letter queue analysis, visibility timeout fixes, and backlog handling strategies.

## TL;DR Checklist

- [ ] Check cluster health before investigating individual queues
- [ ] Verify consumer group status and lag metrics
- [ ] Inspect dead letter queues for error patterns
- [ ] Validate visibility timeout settings against processing duration
- [ ] Analyze message backlog trends before scaling
- [ ] Confirm network connectivity to queue brokers
- [ ] Review broker logs for warnings and errors
- [ ] Test with sample messages after fixes

