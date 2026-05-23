---
name: oci-sdk
description: Integrates Oracle Cloud Infrastructure services (Compute, Object Storage,
  Autonomous DB, Functions) using the OCI Python SDK with config-based authentication
  and resource management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: oracle cloud, oci sdk, oci python, oracle cloud infrastructure, autonomous
    database, object storage, how do i use oci from python
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
  related-skills: aws-sdk, azure-sdk, ibm-cloud-api
------

# Oracle Cloud Infrastructure (OCI) SDK Integration Patterns

Integrates Oracle Cloud Infrastructure services using the OCI Python SDK. Covers config-based authentication, Compute instance management, Object Storage CRUD, Autonomous Database operations, and Functions (FaaS) invocation with OCI-specific patterns for pagination, tagging, and composite operations.

## TL;DR Checklist

- [ ] Use `oci.config.from_file()` to load the SDK config — never hardcode credentials in source
- [ ] Initialize service clients with the config dict: `oci.core.ComputeClient(config)`
- [ ] Handle `oci.exceptions.ServiceError` with specific HTTP status codes
- [ ] Use composite operations (`ComputeClientCompositeOperations`) for multi-step provisioning
- [ ] Use pagination with `has_next_page` / `next_page` for list operations
- [ ] Use resource principals for OCI Functions and OKE workloads (no config file needed)

