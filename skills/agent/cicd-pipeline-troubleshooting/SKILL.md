---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves CI/CD pipeline failures with actionable debugging
  commands for GitHub Actions, GitLab CI, and build optimization patterns.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cicd-pipeline-debugging, cncf-argocd, cncf-flux, cncf-tekton
  role: implementation
  scope: implementation
  triggers: ci cd troubleshooting, pipeline failure, build cache, parallel build,
    artifact resolution, github actions, gitlab ci, how do i debug pipelines
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: cicd-pipeline-troubleshooting
------
# CI/CD Pipeline Troubleshooting

Debugs and resolves CI/CD pipeline failures with actionable diagnostics, cache optimization strategies, and build optimization techniques for GitHub Actions, GitLab CI, and other CI platforms.

## TL;DR Checklist

- [ ] Check job status and exit codes before assuming code issues
- [ ] Review cache hit/miss patterns and adjust cache keys appropriately
- [ ] Validate artifact paths and permissions before downstream jobs
- [ ] Compare build times across pipeline runs to identify bottlenecks
- [ ] Enable debug logging only when necessary to avoid log noise
- [ ] Verify runner availability and resource constraints
- [ ] Test pipeline locally with act or gitlab-runner before committing

