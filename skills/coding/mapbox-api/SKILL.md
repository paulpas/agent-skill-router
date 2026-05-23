---
name: mapbox-api
description: Implements Mapbox API integration (Geocoding, Directions, Maps, Search,
  using mapbox-sdk Python SDK with access token authentication, forward/reverse geocoding,
  route calculation, static maps, isochrones, map tiles, and Mapbox REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mapbox, mapbox api, mapbox-sdk, mapbox geocoding, mapbox directions, mapbox
    static maps, mapbox isochrones, how do i integrate with mapbox, map integration
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
  related-skills: coding-google-maps-api, coding-aws-route-53
------

# Mapbox Platform API Integration

Implements production-grade Mapbox integration using the `mapbox-sdk` Python SDK and Mapbox REST API. When loaded, this skill makes the model implement geocoding (Mapbox Geocoding API), directions and route optimization (Mapbox Directions API, Optimization API), static map generation (Mapbox Static Images API), isochrones (reachability analysis), search with autocomplete (Mapbox Search Box API), and map tiles. All implementations follow Mapbox best practices: use `MAPBOX_ACCESS_TOKEN` from environment, implement rate limiting and exponential backoff, use permanent geocoding only for geocoding results you intend to cache, use temporary for batch geocoding for one-time searches, use session tokens for autocomplete + detail pattern, respect Mapbox's rate limits (600 requests per minute for most APIs, and follow Mapbox Terms of Service regarding data storage and map display attribution requirements.

## TL;DR Checklist

- [ ] Use `mapbox-sdk` Python SDK with `MAPBOX_ACCESS_TOKEN` env var
- [ ] Get access token from Mapbox Studio → Tokens
- [ ] Geocoding: `geocoder.forward(address) for forward, `geocoder.reverse(lng, lat)` for reverse
- [ ] Directions: `directions.directions(features, profile='mapbox/driving')`
- [ ] Optimization: `optimization.optimize(coordinates)` for route optimization
- [ ] Static Maps: Generate URLs with `static_style` or REST API
- [ ] Isochrones: `isochrones.isochrones` for reachability areas
- [ ] Geocoding modes: Use `permanent` (cacheable) vs `temporary` (not cacheable)
- [ ] Autocomplete session: Use session token for search + retrieve pattern
- [ ] Rate limits: 600 req/min standard, varies by API and tier
- [ ] ALWAYS include Mapbox attribution when displaying maps
- [ ] Never expose tokens client-side (use scoped tokens + URL restrictions)

