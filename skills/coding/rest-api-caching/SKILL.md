---
name: rest-api-caching
description: Implements HTTP caching strategies for REST APIs including Cache-Control
  header design, ETag/conditional GET, stale-while-revalidate patterns, cache key
  construction, Vary header configuration, and invalidation strategies to reduce latency
  and server load.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: http caching, cache-control, etag, conditional request, stale-while-revalidate,
    304 not modified, rest api caching, vary header
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
  related-skills: fastapi-patterns, rest-api-patterns, system-design-fundamentals,
    performance-optimization
------

# HTTP Caching for REST APIs

Implements production-grade HTTP caching strategies to reduce latency, decrease server load, and improve client experience. When active, this skill makes the model design Cache-Control header policies, build ETag-based conditional GET flows with 304 responses, configure stale-while-revalidate and stale-if-error for resilient serving, construct correct cache keys, apply Vary headers for content negotiation, and choose between no-cache and no-store based on data sensitivity.

## TL;DR Checklist

- [ ] Every cacheable response includes a Cache-Control header with explicit max-age
- [ ] ETag is generated for resources that change independently of wall-clock time
- [ ] 304 Not Modified is returned when If-None-Match / If-Modified-Since match
- [ ] Vary header lists all request headers that affect response content (Accept-Encoding, Accept-Language, Accept)
- [ ] no-cache means "cache but validate"; no-store means "never cache" — do not confuse them
- [ ] stale-while-revalidate serves fresh content while refreshing in the background; stale-if-error serves stale during upstream failure
- [ ] User-specific data is always marked private or uses no-store — never public

