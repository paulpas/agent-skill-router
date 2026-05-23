---
name: google-maps-api
description: Implements Google Maps Platform API integration (Geocoding, Directions,
  Places, Distance Matrix, Time Zone, Elevation, using googlemaps Python SDK with
  API key authentication, address geocoding, route calculation, place search, distance
  matrix, and Google Maps REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: google maps, google maps api, googlemaps, geocoding, directions api, places
    api, distance matrix, how do i integrate with google maps, map integration
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
  related-skills: coding-mapbox-api, coding-aws-route-53
------

# Google Maps Platform API Integration

Implements production-grade Google Maps Platform integration using the `googlemaps` Python SDK and Google Maps REST API. When loaded, this skill makes the model implement geocoding (address → coordinates, coordinates → address), directions and route calculation with waypoints, places search (nearby, text, find place), distance matrix for multiple origins/destinations, time zone lookup by coordinates, elevation data, static maps, and street view imagery. All implementations follow Google Maps best practices: use `GOOGLE_MAPS_API_KEY` from environment, implement rate limiting and exponential backoff, cache geocoding results to reduce API calls, use session tokens for Place Autocomplete to control costs, handle API errors gracefully, and respect Google's Terms of Service regarding data storage and caching.

## TL;DR Checklist

- [ ] Use `googlemaps` Python SDK with API key from `GOOGLE_MAPS_API_KEY` env var
- [ ] Get API key from Google Cloud Console → Maps Platform → Credentials
- [ ] Enable required APIs: Geocoding API, Directions API, Places API, etc.
- [ ] Geocoding: `gmaps.geocode(address)` for forward, `gmaps.reverse_geocode((lat, lng))` for reverse
- [ ] Directions: `gmaps.directions(origin, destination, mode='driving')`
- [ ] Places: `gmaps.places_nearby()`, `gmaps.places()`, `gmaps.find_place()`
- [ ] Distance Matrix: `gmaps.distance_matrix(origins, destinations, mode='driving')`
- [ ] Time Zone: `gmaps.timezone((lat, lng))`
- [ ] Elevation: `gmaps.elevation((lat, lng))` or along path
- [ ] Cache geocoding results with reasonable TTL (30+ days per Google TOS)
- [ ] Use session tokens for Place Autocomplete + Place Details (single charge)
- [ ] Rate limits: 50 QPS standard, varies by API and billing tier
- [ ] Never expose API keys in client-side code (use restriction + proxy)

