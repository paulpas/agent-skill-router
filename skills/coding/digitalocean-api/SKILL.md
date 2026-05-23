---
name: digitalocean-api
description: Integrates DigitalOcean services (Droplets, Spaces, Kubernetes, App Platform,
  Databases) using the PyDo Python client with token-based authentication and resource
  management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: digitalocean api, pydo, digitalocean python, droplets, spaces object storage,
    digitalocean kubernetes, app platform, how do i use digitalocean from python
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
  related-skills: aws-sdk, linode-api, cloudflare-api
------

# DigitalOcean API (PyDo) Integration Patterns

Integrates DigitalOcean services using the official PyDo Python client library. Covers token-based authentication, Droplet lifecycle management, Spaces (S3-compatible object storage), Kubernetes cluster provisioning, and App Platform deployments with DigitalOcean-specific pagination and action-waiting patterns.

## TL;DR Checklist

- [ ] Use `pydo.Client(token=...)` with a Personal Access Token (PAT) from the DigitalOcean control panel
- [ ] Set the `DIGITALOCEAN_TOKEN` environment variable for local development
- [ ] Use `client.droplets.create(body=...)` with a dict-based request body
- [ ] Wait for action completion using `client.actions.get()` with polling after resource creation
- [ ] For Spaces, use the S3-compatible API via `boto3` with DigitalOcean endpoint
- [ ] Use `client.kubernetes.create_cluster(body=...)` for DOKS clusters
- [ ] Handle `pydo.HttpResponseError` with status code checks for error recovery

