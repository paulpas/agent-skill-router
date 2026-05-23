---
name: feature-flags-progressive-delivery
description: Implements feature flag systems with progressive delivery, A/B testing,
  and gradual rollout strategies for safe application-level feature deployment without
  code changes.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: feature flags, progressive delivery, canary release, A/B testing, flag
    management, gradual rollout, feature toggle, percentage rollout, how do i safely
    roll out new features, experiment flags
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
  - do-dont
  related-skills: secure-release-pipeline, software-delivery-pipelines, microservice-resilience-patterns
------

# Feature Flag Progressive Delivery

Implements feature flag systems for controlled, progressive delivery of application features — enabling safe rollouts, A/B testing, and instant rollbacks without redeploying code.

## TL;DR Checklist

- [ ] Choose the right flag type (release toggle, experiment, permissioning, or operation toggle)
- [ ] Implement boolean evaluation with a fallback to `false` when the flag service is unreachable
- [ ] Start rollouts at 1% and scale to 10% → 50% → 100% over monitored intervals
- [ ] Set up error-rate and latency monitoring for each rollout bucket
- [ ] Schedule cleanup of stale flags within 90 days of full release
- [ ] Document every flag's owner, purpose, and expiration in code comments

