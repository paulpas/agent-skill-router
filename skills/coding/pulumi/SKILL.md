---
name: pulumi
description: Integrates with the Pulumi Python SDK and Automation API to manage stacks,
  resources, programs, ESC (Environments, Secrets, and Configuration), and deployment
  orchestration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: pulumi python, pulumi automation api, pulumi sdk, pulumi stacks, pulumi
    esc, infrastructure as code python, pulumi program, pulumi deploy
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
  - do-dont
  - examples
  related-skills: coding-terraform-sdk, coding-kubernetes-api, coding-docker-api
------

# Pulumi Python SDK & Automation API Integration

Integrates with Pulumi using the official Python SDK (`pulumi`) and Automation API (`pulumi.automation`) to define cloud infrastructure as Python code, manage stacks, orchestrate deployments, handle secrets with ESC, and build self-service infrastructure platforms.

## TL;DR for Code Generation

- [ ] Use `pulumi.export()` for stack outputs and `pulumi.Config()` for stack configuration
- [ ] Always call `.apply()` on `Output[T]` values — never access them synchronously
- [ ] Use the Automation API (`LocalWorkspace` + `InlineProgram`) for programmatic infrastructure management
- [ ] Pass configuration via `StackConfig` objects or `config` dicts, not environment variables
- [ ] Use `pulumi.ResourceOptions` for parent/child relationships, depends_on, and protection
- [ ] Install Pulumi CLI separately — the Python SDK requires it for state management and deployment
- [ ] Use `pulumi.StackReference` to share outputs between stacks

