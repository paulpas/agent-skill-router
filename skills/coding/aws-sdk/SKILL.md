---
name: aws-sdk
description: Integrates AWS services (EC2, S3, Lambda, DynamoDB, RDS) using Boto3
  SDK with patterns for resource management, error handling, pagination, and IAM authentication.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: aws sdk, boto3, amazon web services, s3 bucket, ec2 instance, dynamodb
    table, lambda function, how do i use aws from python
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: azure-sdk, google-cloud-sdk, oci-sdk
------

# AWS SDK (Boto3) Integration Patterns

Integrates AWS services using the Boto3 SDK for Python. Covers credential management, service clients, resource APIs, pagination, waiters, and error handling across EC2, S3, Lambda, DynamoDB, and RDS.

## TL;DR Checklist

- [ ] Use `boto3.client()` for low-level service APIs and `boto3.resource()` for high-level abstractions
- [ ] Configure credentials via AWS IAM roles (preferred) or shared credential files
- [ ] Always handle `ClientError` with specific error codes, not generic exceptions
- [ ] Use paginators for list operations that may return large result sets
- [ ] Use waiters to poll for resource state transitions instead of manual loops
- [ ] Enable retry mode (`max_attempts`, `retry_mode`) for production workloads
- [ ] Set region explicitly; never rely on default region resolution in production

