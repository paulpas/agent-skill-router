---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures S3 object storage with versioning, lifecycle policies, encryption"
  and access controls for durable, scalable data storage with cost optimization in
  AWS.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudformation, aws-cloudfront, aws-iam, aws-kms
  role: reference
  scope: infrastructure
  triggers: s3, object storage, bucket, versioning, lifecycle policy, s3 access, static
    website, object expiration
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
name: s3
------
# S3 (Simple Storage Service)

Configure durable, scalable object storage with versioning, lifecycle management, and encryption. S3 provides unlimited, cost-effective storage for any data type with sophisticated access controls.

## TL;DR Checklist

- [ ] Enable versioning for data protection and rollback
- [ ] Configure lifecycle policies to transition old objects to cheaper storage classes
- [ ] Enable encryption at rest (SSE-S3, SSE-KMS, or client-side)
- [ ] Implement bucket policies with principle of least privilege
- [ ] Enable block public access for all buckets by default
- [ ] Enable MFA delete for critical buckets
- [ ] Configure access logging to CloudWatch or another bucket
- [ ] Use S3 Object Lock for compliance requirements
- [ ] Enable CloudTrail logging for API audit trail
- [ ] Configure intelligent tiering for automatic cost optimization

