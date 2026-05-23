---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys managed NoSQL databases with DynamoDB for scalable, low-latency"
  key-value storage, streams, and global tables with high availability and automatic
  replication.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-auto-scaling, aws-cloudwatch, aws-kms, aws-lambda
  role: reference
  scope: infrastructure
  triggers: dynamodb, nosql, key-value store, dynamodb stream, global table, partition
    key, sort key, auto-scaling
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
name: dynamodb
------
# DynamoDB (Amazon DynamoDB)

Deploy highly scalable, serverless NoSQL databases with low-latency performance, automatic replication, and sophisticated features like streams, global tables, and transactions.

## TL;DR Checklist

- [ ] Choose partition key for even data distribution (not sequential)
- [ ] Add sort key only if range queries needed
- [ ] Use on-demand billing for unpredictable workloads
- [ ] Use provisioned with auto-scaling for predictable traffic
- [ ] Enable point-in-time recovery for all production tables
- [ ] Enable TTL for automatic item expiration
- [ ] Configure DynamoDB Streams for change data capture
- [ ] Use Global Tables for multi-region active-active replication
- [ ] Enable encryption at rest (enabled by default)
- [ ] Implement query patterns before writing to avoid full table scans

