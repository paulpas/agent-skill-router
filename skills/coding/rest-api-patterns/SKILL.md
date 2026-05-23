---
name: rest-api-patterns
description: Implements RESTful API design patterns including resource modeling, HTTP
  method dispatching, structured error responses per RFC 7807, pagination, filtering,
  versioning, and HATEOAS for production-quality APIs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: REST API, RESTful design, RFC 7807, HTTP methods, API versioning, HATEOAS,
    pagination
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
  related-skills: fastapi-patterns, grpc-patterns, code-validation, input-validation,
    frontend-api-integration-patterns
------

# REST API Design Patterns

Implements production-grade RESTful API design following Richardson Maturity Model Level 2+ principles. Models resources as named entities with proper HTTP method dispatching, structured error responses per RFC 7807 Problem Details, consistent pagination and filtering conventions, explicit versioning strategies, HATEOAS hypermedia links where beneficial, and authentication/authorization patterns that integrate cleanly with the resource model.

## TL;DR Checklist

- [ ] Name resources with plural nouns (e.g., `/users`, not `/getUser`)
- [ ] Use correct HTTP methods: GET for reads, POST for creation, PUT for full replace, PATCH for partial update, DELETE for removal
- [ ] Return appropriate 2xx/4xx/5xx status codes — never return 200 for errors
- [ ] Format error responses as RFC 7807 Problem Details objects with `type`, `title`, `status`, and `detail` fields
- [ ] Paginate all collection endpoints; prefer cursor-based pagination for large datasets, offset-based for simple cases
- [ ] Support filtering with query parameters (e.g., `?status=active&role=admin`) and sorting with `?sort=-created_at,name`
- [ ] Version the API explicitly (prefer URL path `/v1/` or Accept header media type)
- [ ] Include HATEOAS `_links` in resource responses where navigation state machines are useful
- [ ] Require authentication on all endpoints; apply authorization checks at the resource level

