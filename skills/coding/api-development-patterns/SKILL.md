---
name: api-development-patterns
description: Implements practical API development patterns including REST conventions,
  GraphQL design, error handling strategies, OpenAPI-first workflow, and versioning
  strategies for production-ready APIs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: api development, REST API design, GraphQL schema design, API error handling,
    OpenAPI spec, API versioning strategy, how do i build a production API, API conventions
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
  related-skills: api-design, rest-api-patterns, graphql-schema-design, api-security-patterns
------

# API Development Patterns

Implements practical patterns for building production-ready APIs that are consistent, resilient, and maintainable. When loaded, this skill makes the model act as a senior API engineer — designing RESTful endpoints, crafting GraphQL schemas, implementing robust error handling, managing API versioning strategies, and enforcing contract-first development workflows with OpenAPI specifications.

## TL;DR Checklist

- [ ] Design all APIs using an OpenAPI/Swagger spec first, then implement against it
- [ ] Follow consistent REST conventions: resource-oriented URLs, proper HTTP methods, status codes
- [ ] Implement structured error responses with error codes, messages, and context for debugging
- [ ] Version APIs explicitly (URI path versioning preferred) and maintain backward compatibility
- [ ] Add pagination, filtering, and sorting to all collection endpoints
- [ ] Include rate limiting headers and CORS configuration on all responses

