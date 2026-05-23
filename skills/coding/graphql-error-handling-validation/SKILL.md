---
name: graphql-error-handling-validation
description: Implements GraphQL error handling and input validation using typed error
  result unions, Pydantic v2 field validation, error code enums, and middleware-level
  exception handling for production APIs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: graphql error handling, graphql validation, input validation, pydantic
    graphql, strawberry errors, graphql error codes, graphql middleware
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
  related-skills: graphql-schema-design, graphql-dataloader-pattern
------

# GraphQL Error Handling and Validation

Implements production-grade GraphQL error handling and input validation using typed result unions, Pydantic v2 field-level constraints, machine-readable error code enums, and middleware-level exception handlers. Ensures clients receive structured, actionable errors while server internals remain fully shielded.

## TL;DR Checklist

- [ ] Design every mutation return type as a discriminated union of `SuccessResult` and typed error variants (`NotFoundError`, `ValidationError`, `UnauthorizedError`)
- [ ] Apply Pydantic v2 `@model_validator` and `@field_validator` on Strawberry input types for automatic validation before resolvers execute
- [ ] Define an `ErrorCode` enum with machine-readable codes (e.g., `USER_NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`) for client-side error routing
- [ ] Implement middleware-level exception handlers that log stack traces to server logs and return user-friendly structured GraphQL errors
- [ ] Never expose internal stack traces, database connection strings, SQL queries, or file paths in any client-facing error response
- [ ] Support partial success in batch operations by returning `PartialSuccessResult` with both successful items and per-item error details

