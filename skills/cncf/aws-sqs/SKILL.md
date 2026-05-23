---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys managed message queues with SQS for asynchronous processing"
  decoupling services, and reliable message delivery with visibility timeout and dead-letter
  queues.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-lambda, aws-sns
  role: reference
  scope: infrastructure
  triggers: dead-letter queue, fifo queue, message deduplication, message queue, queue,
    queuing, sqs, visibility timeout
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
name: sqs
------
# SQS (Simple Queue Service)

Deploy managed message queues for asynchronous processing with guaranteed delivery, visibility timeout, and built-in dead-letter queue support.

## TL;DR Checklist

- [ ] Use FIFO queue when message order is critical
- [ ] Use Standard queue for high throughput when order doesn't matter
- [ ] Configure visibility timeout appropriately (match processing time)
- [ ] Enable message deduplication for FIFO
- [ ] Set up dead-letter queue for poison pill messages
- [ ] Use short polling to reduce costs (default)
- [ ] Encrypt messages with KMS for sensitive data
- [ ] Monitor queue depth and processing time
- [ ] Set message retention appropriately (4 days default)
- [ ] Use batch operations for better performance

