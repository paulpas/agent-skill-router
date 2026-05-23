---
name: platform-engineering
description: Designs internal developer platforms (IDPs) with golden paths, self-service
  infrastructure portals, template-driven deployments, and developer experience metrics
  to reduce cognitive load and accelerate feature delivery.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: platform engineering, internal developer platform, IDP, golden paths,
    self-service infrastructure, Backstage.io, developer experience metrics, how do
    i build a developer platform
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
  - examples
  - do-dont
  related-skills: coding-cloud-native-architecture, cncf-kubernetes, coding-software-delivery-pipelines,
    coding-security-review
------

# Platform Engineering Framework

Acting as a platform engineer who designs and implements internal developer platforms that reduce cognitive load and accelerate feature delivery. This skill makes the model create self-service infrastructure solutions, golden path templates, platform team operating models, and Developer Experience metrics — treating developers as the product whose friction is systematically eliminated.

## TL;DR Checklist

- [ ] Define the platform product's user personas and their top 3 pain points before designing any solution
- [ ] Implement at least one golden path template per common workload type (web service, API, data pipeline)
- [ ] Ensure self-service capabilities cover: provisioning, configuration, observability setup, and deployment
- [ ] Measure Developer Experience metrics (dORA metrics + custom friction scores) before and after platform changes
- [ ] Document every template with examples, constraints, upgrade paths, and when NOT to use it
- [ ] Review each platform capability against the 80/20 rule — does it solve the majority of cases or just niche ones?

