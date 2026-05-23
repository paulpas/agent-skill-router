---
name: google-cloud-sdk
description: Integrates Google Cloud services (Compute Engine, Cloud Storage, BigQuery,
  Cloud Functions, GKE, Pub/Sub) using the Google Cloud Python client libraries with
  authentication and resource patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: google cloud sdk, gcp python, cloud storage, bigquery, compute engine,
    pub sub, how do i use google cloud from python
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
  related-skills: aws-sdk, azure-sdk, cloudflare-api
------

# Google Cloud SDK (GCP) Integration Patterns

Integrates Google Cloud Platform services using the idiomatic Python client libraries. Covers authentication via application-default credentials, resource patterns for Compute Engine, Cloud Storage, BigQuery, Cloud Functions, GKE, and Pub/Sub, with consistent error handling and pagination.

## TL;DR Checklist

- [ ] Install individual service libraries (`google-cloud-storage`, `google-cloud-bigquery`) — never install the monolithic `google-cloud` package
- [ ] Use `google.auth.default()` or `ADC` (Application Default Credentials) for authentication
- [ ] Enable APIs per-service in the GCP Console before using client libraries
- [ ] Handle `google.api_core.exceptions.*` with specific error codes (NotFound, AlreadyExists, Forbidden)
- [ ] Use `@retry.Retry()` decorator for transient failures (rate limits, timeouts)
- [ ] Set explicit `project_id` on clients — never rely on default project resolution in production

