---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Debugging patterns for GitHub Actions, GitLab CI, Jenkins and other CI/CD
  systems including log analysis, runner issues, cache problems, and workflow optimization
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cicd-pipeline-troubleshooting, cncf-argocd, cncf-tekton
  role: implementation
  scope: implementation
  triggers: github actions debugging, gitlab ci troubleshooting, jenkins pipeline,
    ci cd failures, build errors, workflow debugging, pipeline logs, runner issues
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
name: cicd-pipeline-debugging
------
# CI/CD Pipeline Debugging

Debugging complex CI/CD pipelines across GitHub Actions, GitLab CI, Jenkins, and other systems. Provides systematic approaches to diagnose build failures, test errors, cache problems, runner issues, and workflow optimization challenges with actionable debugging commands and real-world examples.

## TL;DR Checklist

- [ ] Extract and analyze complete pipeline logs from the beginning of failure
- [ ] Check runner status, logs, and resource constraints
- [ ] Verify environment variables and secrets are correctly configured
- [ ] Inspect cache operations: hits, misses, corruption, and expiration
- [ ] Reproduce the failure locally using the same Docker image and steps
- [ ] Use step-level debugging with debug mode enabled (set -x, ACTIONS_RUNNER_DEBUG)
- [ ] Check for timing issues: race conditions, parallel execution conflicts
- [ ] Review recent changes: workflow modifications, dependency updates, infrastructure changes

