---
name: disaster-recovery
description: Implements comprehensive disaster recovery planning for Kubernetes clusters
  with backup strategies, recovery procedures, cross-region replication, RPO/RTO planning,
  and validation workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: disaster recovery, backup strategy, recovery procedures, cross region
    replication, rpo rto, backup validation, how do i plan dr
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cncf-argocd, cncf-velero
------

# Disaster Recovery Planning for Kubernetes Clusters

Implements comprehensive disaster recovery planning for Kubernetes clusters with backup strategies, recovery procedures, cross-region replication, RPO/RTO planning, and validation workflows.

## When to Use

Use this disaster recovery skill when:

- Planning or reviewing a Kubernetes cluster disaster recovery strategy
- Implementing backup and recovery procedures for production workloads
- Designing cross-region replication for high availability
- Calculating and validating Recovery Point Objective (RPO) and Recovery Time Objective (RTO)
- Setting up backup validation and recovery testing workflows
- Creating runbooks for incident response and recovery scenarios

