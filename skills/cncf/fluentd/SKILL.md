---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Fluentd unified logging layer for collecting, transforming, and routing"
  log data in cloud-native environments'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  role: reference
  scope: infrastructure
  triggers: fluentd, log collection, log routing, logging, unified logging, cloudwatch,
    log forwarding, monitoring
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
name: fluentd
------
  related-skills: cncf-aws-cloudwatch, cncf-azure-monitor, cncf-cortex, cncf-gcp-autoscaling




## Tutorial

This tutorial will guide you through installing, configuring, and using Fluentd for centralized logging collection.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS)
- `kubectl` configured to access your cluster
- Basic understanding of logging concepts and Kubernetes architecture
- A logging destination (Elasticsearch, Fluentd, S3, etc.)

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Check cluster version
kubectl version --client --short
```

