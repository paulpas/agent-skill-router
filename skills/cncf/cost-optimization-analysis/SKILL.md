---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Cloud cost optimization analysis including AWS Cost Explorer, Azure Cost
  Management, and GCP Billing with right-sizing recommendations and optimization strategies
  for multi-cloud environments
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-database-admin, cncf-cost-optimization, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: aws cost explorer, azure cost analysis, gcp billing, cloud cost optimization,
    right-sizing recommendations, spot instance strategy, reserved instance optimization,
    cost allocation
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
name: cost-optimization-analysis
------
# Cloud Cost Optimization Analysis

Implements comprehensive multi-cloud cost optimization strategies including AWS Cost Explorer analysis, Azure Cost Management analysis, GCP Billing analysis, right-sizing recommendations, spot instance optimization, reserved instance planning, and cost allocation frameworks. This skill enables data-driven decisions to reduce cloud infrastructure costs while maintaining performance and reliability.

## TL;DR Checklist

- [ ] Collect and normalize cost data from all cloud providers using their respective APIs and CLI tools
- [ ] Identify idle and underutilized resources (right-sizing candidates)
- [ ] Analyze spot instance eligibility and implement spot placement strategies
- [ ] Plan reserved instance purchases based on historical usage patterns
- [ ] Implement cost allocation tagging and chargeback models
- [ ] Set up automated alerts for budget thresholds and anomalies
- [ ] Optimize storage tiers based on access patterns
- [ ] Document optimization recommendations and track ROI

