---
name: terraform-sdk
description: Integrates with Terraform and OpenTofu via the HCP Terraform API (pyTFE),
  CDKTF Python bindings, and the Terraform Cloud API to manage providers, resources,
  state, and modules.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: terraform api, terraform cloud, cdktf python, terraform provider, opentofu,
    terraform state, terraform modules, hcp terraform
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
  related-skills: coding-kubernetes-api, coding-pulumi, coding-ansible-api
------

# Terraform/OpenTofu SDK & API Integration

Integrates with Terraform and OpenTofu using the HCP Terraform API (via `pyTFE`), the CDKTF Python SDK, and the Terraform Cloud/Enterprise REST API to programmatically manage providers, resources, state, workspaces, and modules.

## TL;DR for Code Generation

- [ ] Use `pyTFE` (`pytfe.TFEClient`) for HCP Terraform and Terraform Enterprise API operations
- [ ] For infrastructure-as-code in Python, prefer the CDKTF — `cdktf` with `cdktf get` to generate provider bindings
- [ ] Manage state via the Terraform Cloud API `workspaces` and `state-versions` endpoints
- [ ] Use the `tfe` Terraform provider if you need to manage Terraform Cloud resources in HCL
- [ ] Authenticate with a `TFE_TOKEN` environment variable or explicit `TFEConfig(token=...)`
- [ ] Use `Pulumi` (see `coding-pulumi` skill) as an alternative when you prefer native IaC over Terraform wrappers

