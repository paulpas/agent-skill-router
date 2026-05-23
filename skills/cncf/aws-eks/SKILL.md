---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys managed Kubernetes clusters with EKS for container orchestration"
  auto-scaling, networking, and integrations with AWS services for production Kubernetes
  workloads.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudwatch, aws-ecr, aws-iam, aws-vpc
  role: reference
  scope: infrastructure
  triggers: eks, container orchestration, k8s, cluster, pods, namespaces, ingress,
    kubernetes namespace
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
name: eks
------
# EKS (Elastic Kubernetes Service)

Deploy and manage production-grade Kubernetes clusters with automatic control plane updates, high availability, and deep AWS service integration.

## TL;DR Checklist

- [ ] Use managed node groups for automatic scaling
- [ ] Enable multiple AZs for high availability
- [ ] Configure RBAC with IAM Roles for Service Accounts (IRSA)
- [ ] Use AWS Load Balancer Controller for ingress
- [ ] Enable cluster logging to CloudWatch
- [ ] Configure network policies for security
- [ ] Use Fargate for serverless pods
- [ ] Enable Pod Security Policy or Pod Security Standards
- [ ] Monitor cluster metrics with CloudWatch
- [ ] Regular cluster and node updates

