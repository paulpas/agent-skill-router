---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Creates Infrastructure as Code templates with CloudFormation for reproducible"
  versioned, automated deployments of entire AWS infrastructure stacks.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-ec2, aws-iam, aws-rds, aws-s3
  role: reference
  scope: infrastructure
  triggers: cloudformation, infrastructure as code, iac, cloudformation template,
    stack, aws template, yaml, json
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
name: cloudformation
------
# CloudFormation

Design and deploy complete AWS infrastructure as code using templates, enabling version control, repeatable deployments, and automated stack management.

## TL;DR Checklist

- [ ] Use YAML format for templates (more readable than JSON)
- [ ] Parameterize templates for reusability across environments
- [ ] Use Outputs to expose important resource values
- [ ] Implement change sets before updating production stacks
- [ ] Version control all templates in Git
- [ ] Use DependsOn for explicit resource dependencies
- [ ] Implement rollback on update failure
- [ ] Create separate templates for modularity (nested stacks)
- [ ] Use stack policies to prevent accidental resource deletion
- [ ] Tag all resources for cost allocation and management

