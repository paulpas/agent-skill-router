---
name: api-gateway-design
description: Designs API gateway patterns for request routing, rate limiting, authentication,
  response caching, and request aggregation across microservice architectures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: API gateway, api-gateway, request routing, rate limiting, auth proxy,
    API aggregation, load balancing, backend for frontend, BFF pattern, how do i route
    requests
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
  - examples
  - config
  - do-dont
  related-skills: integration-patterns, rest-api-patterns, microservice-resilience-patterns,
    grpc-patterns
------

# API Gateway Design

Designs and implements API gateway patterns that serve as the single entry point for client requests, handling routing, authentication, rate limiting, caching, and request aggregation across microservice architectures. Covers both centralized gateways (Kong, NGINX) and code-level implementations (FastAPI-based).

## TL;DR Checklist

- [ ] Define route table with clear path-to-service mapping rules
- [ ] Implement rate limiting per-client or per-endpoint with configurable quotas
- [ ] Add authentication middleware that validates tokens before routing requests
- [ ] Configure response caching for idempotent GET endpoints with appropriate TTLs
- [ ] Set up request aggregation to reduce client round-trips for multi-service calls
- [ ] Enable structured logging with correlation IDs for distributed tracing

