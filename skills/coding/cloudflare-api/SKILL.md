---
name: cloudflare-api
description: Integrates Cloudflare services (DNS, Workers, R2, KV, Pages, Zero Trust,
  WAF) using the official Cloudflare Python SDK with API token authentication and
  resource management patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cloudflare api, cloudflare python, workers ai, cloudflare dns, r2 object
    storage, kv namespace, zero trust, how do i use cloudflare api from python
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
  related-skills: aws-sdk, vercel-api, google-cloud-sdk
------

# Cloudflare API Integration Patterns

Integrates Cloudflare services using the official `cloudflare` Python SDK (v5.x). Covers API token authentication, DNS record management, Workers script deployment, KV namespace operations, R2 object storage, Pages project management, and Zero Trust configuration with the SDK's typed client design.

## TL;DR Checklist

- [ ] Use `Cloudflare(api_token=...)` with an API token from the Cloudflare dashboard
- [ ] Use typed resources: `client.dns.records`, `client.workers.scripts`, `client.kv.namespaces`
- [ ] Handle `cloudflare.APIStatusError` with status code branching for error recovery
- [ ] Use `client.zones.list()` to discover zone IDs for DNS operations
- [ ] Use `SyncV4PagePaginationArray` and `SyncCursorLimitPagination` for paginated responses
- [ ] Use `AsyncCloudflare` with `async with` for concurrent operations
- [ ] Use Workers runtime SDK (`workers-py`) for deploying Python Workers

