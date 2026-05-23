---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys serverless event-driven applications with Lambda functions,
  triggers" layers, and VPC integration for cost-effective, auto-scaling compute without
  server management.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-dynamodb, aws-iam, aws-secrets-manager
  role: reference
  scope: infrastructure
  triggers: lambda, serverless, event-driven, lambda function, api gateway, s3 trigger,
    sqs, dynamodb stream
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
name: lambda
------
# Lambda (AWS Lambda)

Deploy serverless event-driven applications that scale automatically with pay-per-use pricing, VPC integration, and sophisticated trigger and layer management.

## TL;DR Checklist

- [ ] Use concurrency limits to prevent runaway scaling
- [ ] Configure dead-letter queues (DLQ) for failed invocations
- [ ] Set appropriate timeout and memory (controls CPU/speed)
- [ ] Use Lambda Layers for shared code and libraries
- [ ] Enable X-Ray tracing for distributed tracing
- [ ] Implement structured logging for CloudWatch Insights
- [ ] Use environment variables or Secrets Manager for configuration
- [ ] Set up VPC endpoints if accessing VPC resources
- [ ] Monitor duration and throttling via CloudWatch
- [ ] Use provisioned concurrency for high-traffic functions

