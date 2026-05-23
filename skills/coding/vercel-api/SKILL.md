---
name: vercel-api
description: Integrates Vercel services (Deployments, Projects, Edge Functions, Domains,
  Analytics) using the Vercel REST API and Python SDK with token-based authentication
  and deployment automation patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: vercel api, vercel python, vercel deployments, vercel edge functions,
    vercel projects, vercel domains, how do i use vercel api from python
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
  related-skills: cloudflare-api, netlify-api, aws-sdk
------

# Vercel API Integration Patterns

Integrates Vercel services using the Vercel REST API and `vercel-py` SDK. Covers API token authentication, project management, deployment creation (with file uploads), Edge Config management, domain configuration, and environment variable management with patterns for deployment status polling and rollback.

## TL;DR Checklist

- [ ] Use `VERCEL_TOKEN` environment variable with a Vercel API token from Account Settings
- [ ] Use `vercel-py` SDK for typed clients (Blob, Sandbox, OIDC) or direct REST API calls
- [ ] Use the REST API endpoints (`/v13/deployments`, `/v9/projects`) for deployment automation
- [ ] Poll deployment status via `GET /v13/deployments/{id}` until `readyState == "READY"`
- [ ] For custom Python backends, use `vercel.json` to configure Python Functions routing
- [ ] Handle `httpx.HTTPStatusError` with specific status codes for error recovery
- [ ] Manage environment variables via `POST /v10/projects/{id}/env`

