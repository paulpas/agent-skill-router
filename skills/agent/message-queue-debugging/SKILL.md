---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Debugs Kafka, RabbitMQ, and SQS message queues with consumer lag analysis,
  dead letter handling, and message flow troubleshooting for distributed systems
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-database-admin, agent-message-queue-troubleshooting, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: kafka troubleshooting, rabbitmq debugging, sqs issues, message queue problems,
    dead letter queues, consumer lag, message backlog, queue monitoring
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
name: message-queue-debugging
------
# Message Queue Debugging

Debugs distributed message queue systems including Kafka, RabbitMQ, and SQS — identifies consumer lag, dead letter queue issues, message backlogs, and flow bottlenecks to restore reliable message delivery.

