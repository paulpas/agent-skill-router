---
name: api-versioning-strategies
description: Implements API versioning strategies (URL path, Accept header, query
  parameter, media type) to manage backward compatibility, deprecation timelines,
  and migration paths while maintaining stable contracts for consumers.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: api versioning, url path versioning, accept header, breaking changes,
    api deprecation, sunset header, backward compatibility, api migration, stripe
    api versioning, github api version, twilio api version, how do i version my api,
    rest api lifecycle, api contract stability
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
  related-skills: api-design, input-validation, code-review, security-review
------

# API Versioning Strategies

Manages the full API versioning lifecycle — choosing a versioning strategy, classifying breaking vs. compatible changes, deprecating old versions gracefully, and guiding consumers through migrations with zero downtime.

## TL;DR Checklist

- [ ] Choose URL path versioning for public APIs (most discoverable); Accept header for internal/B2B APIs
- [ ] Classify every change as BREAKING or COMPATIBLE before release
- [ ] Always include `Deprecation` and `Sunset` headers when serving deprecated versions
- [ ] Support dual-version operation during migration windows (minimum 90 days)
- [ ] Never remove a field from responses — mark it deprecated, keep returning it for the sunset period
- [ ] Never make an optional field required in an existing endpoint

