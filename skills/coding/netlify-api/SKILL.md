---
name: netlify-api
description: Integrates Netlify services (Sites, Builds, Functions, Forms, Identity)
  using the Netlify REST API with Python, covering token-based authentication, site
  management, deployment workflows, and serverless function deployment.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: netlify api, netlify python, netlify deployments, netlify functions, netlify
    forms, netlify sites, how do i use netlify api from python
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
  related-skills: vercel-api, cloudflare-api, aws-sdk
------

# Netlify API Integration Patterns

Integrates Netlify services using the Netlify REST API (`api.netlify.com/api/v1`) with Python. Covers Personal Access Token authentication, site creation and management, atomic deploys (file digest and ZIP methods), serverless function deployment, form submission handling, and build hook management patterns.

## TL;DR Checklist

- [ ] Use Netlify Personal Access Tokens from User Settings → Applications
- [ ] Use the REST API at `https://api.netlify.com/api/v1` with Bearer token auth
- [ ] Use the file digest method for deploys (SHA1 for files, SHA256 for functions)
- [ ] Use `POST /api/v1/sites/{site_id}/deploys` with ZIP body for simple deploys
- [ ] Use `POST /api/v1/hooks` to create build hooks for external deploy triggers
- [ ] Handle HTTP 401 (auth), 404 (not found), 422 (validation) errors explicitly
- [ ] Use `netlify-python` community SDK for higher-level abstractions

