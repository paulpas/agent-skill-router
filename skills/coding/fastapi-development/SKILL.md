---
name: fastapi-development
description: Implements FastAPI application patterns including dependency injection,
  Pydantic v2 models, async handlers, JWT authentication, middleware chains, background
  tasks, and production deployment strategies for high-performance Python web services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: fastapi, fastapi development, dependency injection, pydantic v2, async
    endpoints, jwt authentication, fastapi middleware, background tasks, starlette,
    uvicorn, python web framework, fastapi production
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
  related-skills: django-best-practices
------

# FastAPI Development Guide

Senior FastAPI engineer building high-performance async web services using modern Python 3.10+ patterns, Pydantic v2, and production-grade deployment strategies. This skill covers the full stack — from project architecture and dependency injection to authentication, middleware, background processing, and containerized deployments.

## TL;DR Checklist

- [ ] Use lifespan events (async context managers) instead of `on_event("startup")` for initialization
- [ ] Define explicit return types with `Response` or typed Pydantic models on every endpoint
- [ ] Use `Depends()` for all shared resources (DB sessions, current user, config) — never instantiate them in handlers
- [ ] Annotate all function signatures with Python 3.10+ union syntax (`X | Y`) and type hints
- [ ] Use Pydantic v2 `@field_validator` / `@model_validator` — never deprecated v1 validators
- [ ] Keep business logic out of route handlers — delegate to service layer functions
- [ ] Use `TestClient(app)` with `app.dependency_overrides` for test isolation
- [ ] Configure CORS explicitly with allowed origins, methods, and credentials flags

