---
name: azure-sdk
description: Integrates Azure services (Resource Manager, Blob Storage, Cosmos DB,
  Functions, AKS, Key Vault) using the Azure SDK for Python with authentication and
  management patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: azure sdk, microsoft azure, azure blob storage, cosmos db, azure functions,
    resource management, how do i use azure from python
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
  related-skills: aws-sdk, google-cloud-sdk, oci-sdk
------

# Azure SDK for Python Integration Patterns

Integrates Microsoft Azure services using the Azure SDK for Python. Covers authentication with `DefaultAzureCredential`, resource management via `azure-mgmt-*` libraries, and client SDK patterns for Blob Storage, Cosmos DB, Functions, AKS, and Key Vault.

## TL;DR Checklist

- [ ] Use `DefaultAzureCredential` for authentication — it works across local dev and production
- [ ] Separate management plane (`azure-mgmt-*`) from data plane (`azure-*`) imports clearly
- [ ] Handle long-running operations (LROs) with `.result()` or `.wait()` pattern
- [ ] Store connection strings and keys in Azure Key Vault, never in code
- [ ] Use `BlobServiceClient` → `ContainerClient` → `BlobClient` hierarchy for Blob Storage
- [ ] Set resource group and location explicitly for every resource creation call

