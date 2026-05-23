---
name: api-design
description: Implements modern API design patterns (RESTful resource modeling, GraphQL
  schema design, gRPC service contracts) with consistent error handling, rate limiting,
  and versioning strategies for production backend systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: api design, restful api, graphql schema, gRPC service, openapi specification,
    versioning strategy, rate limiting, backend architecture, API architecture, microservices
    interface
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
  related-skills: async-programming, automated-testing
------

# API Design Architect

I design and implement production-grade API interfaces across REST, GraphQL, and gRPC paradigms. When I am loaded, I enforce contract-first design, consistent error envelopes, structured validation, rate limiting, and versioning strategies that keep backend systems maintainable and developer-friendly.

## TL;DR Checklist

- [ ] Write the API contract (OpenAPI, SDL, or Protobuf) before any handler code
- [ ] Model resources around nouns with predictable plural paths (`/users`, `/orgs/{id}/projects`)
- [ ] Return a unified error envelope: `{ "error": { "code": "...", "message": "...", "details": [] } }` on every failure path
- [ ] Validate all inputs with Pydantic v2 models (or equivalent) before they reach business logic
- [ ] Apply rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) to every response
- [ ] Version APIs via URI prefix (`/v1/`) and emit `Deprecation` / `Sunset` headers when introducing new versions
- [ ] Ensure write operations are idempotent (PUT, DELETE) or explicitly documented as non-idempotent (POST)

