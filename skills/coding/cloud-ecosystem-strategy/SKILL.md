---
name: cloud-ecosystem-strategy
description: Strategizes cross-cloud ecosystem navigation (AWS, Azure, GCP) with vendor
  lock-in analysis, interoperability patterns, cost optimization frameworks, and multi-cloud
  architecture decision making.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cloud ecosystem, aws, azure, gcp, multi-cloud, hybrid cloud, vendor lock-in,
    cloud migration, cross-cloud, how do i choose cloud provider, cloud strategy,
    cloud interoperability, cost optimization, cloud architecture decision
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
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: coding-cloud-native-architecture, coding-platform-engineering, coding-technology-adoption,
    coding-cost-optimization-patterns
------

# Cloud Ecosystem Strategy

Strategizes cross-cloud ecosystem navigation across AWS, Azure, and GCP with vendor lock-in analysis, interoperability patterns, cost optimization frameworks, and multi-cloud architecture decisions. This skill makes the model evaluate cloud provider capabilities, identify cross-cloud equivalencies, design for portability, and create migration strategies that minimize disruption while maximizing the benefits of each provider's unique services.

## TL;DR Checklist

- [ ] Map all application requirements to specific service categories (compute, storage, networking, managed services)
- [ ] Score each cloud provider against requirements using weighted criteria with explicit rationale
- [ ] Identify vendor lock-in risks for every managed service used — prefer open standards where possible
- [ ] Design interoperability boundaries between clouds when using multi-cloud patterns
- [ ] Model cost projections across providers including data transfer egress fees and long-term commitments
- [ ] Create migration runbooks with rollback procedures for cloud transitions

