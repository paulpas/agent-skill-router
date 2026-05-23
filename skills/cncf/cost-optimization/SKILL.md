---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements cloud cost optimization strategies (right-sizing, reserved
  instances, spot instances, multi-cloud comparison) for Kubernetes and cloud-native
  deployments.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-opencost, disaster-recovery, gcp-cloud-functions, gcp-deployment-manager
  role: implementation
  scope: implementation
  triggers: cost optimization, right sizing, reserved instances, spot instances, multi
    cloud costs, aws cost analysis, azure cost, gcp billing
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
  version: 1.0.0
name: cost-optimization
------
# Cloud Cost Optimization

Implements comprehensive cloud cost optimization strategies for Kubernetes clusters and multi-cloud deployments. Provides actionable recommendations for right-sizing, reserved instance procurement, spot instance strategy, and multi-cloud cost comparison.

## When to Use

Use this skill when:

- Planning or executing a cloud cost optimization initiative for Kubernetes deployments
- Evaluating right-sizing opportunities for workloads based on actual resource utilization
- Negotiating reserved instance or savings plan commitments with cloud providers
- Implementing spot instance or preemptible instance strategy for batch workloads
- Comparing costs across AWS, Azure, and GCP for multi-cloud deployment decisions
- Building automated cost optimization pipelines that analyze and apply recommendations

