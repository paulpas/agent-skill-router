---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements Pulumi infrastructure as code using Python, TypeScript, and
  Go for cloud provisioning with state management, stacks, backends, and cross-cloud
  provisioning
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-aws-cloudformation, cncf-helm, cncf-terraform
  role: implementation
  scope: infrastructure
  triggers: pulumi, iac, infrastructure as code, pulumi python, pulumi typescript,
    how do i deploy infrastructure, crossplane, cloudformation
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
name: pulumi
------
# Pulumi Infrastructure as Code

Implements Pulumi infrastructure as code using Python, TypeScript, and Go programming languages for cloud provisioning with state management, stacks, backends, and multi-cloud infrastructure support.

## TL;DR Checklist

- [ ] Use Pulumi's native language SDKs (Python, TypeScript, Go) instead of YAML/JSON
- [ ] Configure state backend (S3, Azure Blob, GCS, or Pulumi Cloud) for team collaboration
- [ ] Implement stack-specific configurations for dev/staging/production environments
- [ ] Use Pulumi's resource dependencies for automatic ordering
- [ ] Leverage Pulumi's preview functionality with `pulumi preview` before applying
- [ ] Implement proper tagging strategy across all cloud resources
- [ ] Use Pulumi's secrets management for sensitive values
- [ ] Implement programmatic resource creation with loops and conditionals

