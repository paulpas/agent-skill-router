---
name: software-delivery-pipelines
description: Implements CI/CD pipelines with build automation, test orchestration,
  blue-green/canary deployments, artifact management, and environment promotion for
  reliable software delivery.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: CI/CD pipeline, continuous integration, continuous deployment, deployment
    strategy, blue-green deployment, canary release, how do i set up CI/CD
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
  - examples
  related-skills: secure-release-pipeline, test-driven-development, semver-automation,
    git-branching-strategies, python-package-publishing, javascript-package-workflows
------

# Software Delivery Pipeline Manager

Implements CI/CD pipeline patterns including build automation, test orchestration, deployment strategies (blue-green, canary, rolling), artifact management, and environment promotion to move code reliably from commit to production.

## TL;DR Checklist

- [ ] Define all stages: build → test → deploy with explicit success criteria per stage
- [ ] Configure parallel test execution with caching for sub-10-minute feedback loops
- [ ] Select deployment strategy matching risk tolerance (blue-green, canary, or rolling)
- [ ] Set up environment promotion gates with manual approval for production
- [ ] Pin all tool versions and container base images in pipeline definitions
- [ ] Implement artifact retention policy (e.g., 90 days, max 100 builds)
- [ ] Ensure every deploy produces an auditable record: commit SHA, artifacts, timestamp

