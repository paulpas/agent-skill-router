---
name: web-applications
description: Builds production Go web applications with HTTP handlers, routing, middleware,
  template rendering, and REST API design following idiomatic Go patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go web, go http, go router, go middleware, go rest api, go templates,
    go websocket
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cloud-development, best-practices, database-patterns, modular-design
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Web Applications

Senior web engineer building production Go web applications with idiomatic HTTP handling, clean routing, reusable middleware, template rendering, and RESTful API design. This skill covers everything from basic handlers to WebSocket connections.

## TL;DR Checklist

- [ ] Handlers accept `(http.ResponseWriter, *http.Request)` — never store request globally
- [ ] Use explicit routers (chi, mux, or net/http.ServeMux) — never rely on DefaultServerMux in production
- [ ] Middleware composes cleanly using the `func(http.Handler) http.Handler` pattern
- [ ] JSON responses have consistent structure with status codes and error messages
- [ ] Template rendering uses `html/template` for XSS protection
- [ ] All external calls (DB, APIs) use context with deadlines

