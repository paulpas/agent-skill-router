---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Manages container image repositories with ECR for secure storage, scanning"
  replication, and integration with EKS, ECS, and Lambda for container deployments.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-eks, aws-iam, aws-kms, cubefs
  role: reference
  scope: infrastructure
  triggers: container registry, container security, containers, docker images, ecr,
    image repository, image scanning, vulnerability scanning
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
name: ecr
------
# ECR (Elastic Container Registry)

Manage container images securely with vulnerability scanning, lifecycle policies, replication, and integration with container orchestration services.

## TL;DR Checklist

- [ ] Enable image scanning for vulnerability detection
- [ ] Configure lifecycle policies to manage image versions
- [ ] Use image tags for versioning (not latest)
- [ ] Enable cross-region replication for disaster recovery
- [ ] Implement pull-through cache for upstream registries
- [ ] Encrypt images at rest with KMS
- [ ] Use repository policies to control access
- [ ] Monitor image push/pull with CloudTrail
- [ ] Set up resource cleanup for untagged images
- [ ] Implement image signing for integrity verification

