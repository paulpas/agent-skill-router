---
name: graphql-api-design
description: 'Implements production GraphQL API design: schema modeling, DataLoader
  batching, query complexity limits, auth directives, cursor pagination, and Apollo
  Federation for microservice graphs.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: graphql, apollo federation, dataloader, n+1 query, query complexity, graphql
    schema, graphql authorization, how do i design a graphql api
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
  related-skills: rest-api-patterns, api-security-patterns, input-validation
------

# GraphQL API Design Patterns

Senior API engineer designing production-grade GraphQL APIs following the GraphQL Specification and Apollo Federation 3 standards. Implements schema modeling, resolver batching to eliminate N+1 queries, query complexity limiting, field-level authorization directives, cursor-based pagination, and federation patterns for multi-service graph composition.

## TL;DR Checklist

- [ ] Model types using GraphQL scalar types and explicit interfaces for shared contracts
- [ ] Wrap every group of related resolvers with a DataLoader instance to batch N+1 queries
- [ ] Calculate query complexity per field and enforce a global depth/width limit before execution
- [ ] Apply field-level authorization directives (`@auth`, `@role`) instead of blanket resolver guards
- [ ] Use cursor-based pagination (Connection model) for all list fields — never offset-based
- [ ] Return structured `Error` unions with `message`, `code`, and optional `extensions` — never raw exceptions
- [ ] For federated graphs, define subgraph schemas with `@key` directives and respect ownership boundaries

