---




name: mapbox-api
description: Implements Mapbox API integration (Geocoding, Directions, Maps, Search,
  using mapbox-sdk Python SDK with access token authentication, forward/reverse geocoding,
  route calculation, static maps, isochrones, map tiles, and Mapbox REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mapbox, mapbox api, mapbox-sdk, mapbox geocoding, mapbox directions, mapbox static maps, mapbox isochrones, how do i integrate with mapbox static maps
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




---




# Mapbox Platform API Integration

Implements production-grade Mapbox integration using the `mapbox-sdk` Python SDK and Mapbox REST API. When loaded, this skill makes the model implement geocoding (Mapbox Geocoding API), directions and route optimization (Mapbox Directions API, Optimization API), static map generation (Mapbox Static Images API), isochrones (reachability analysis), search with autocomplete (Mapbox Search Box API), and map tiles. All implementations follow Mapbox best practices: use `MAPBOX_ACCESS_TOKEN` from environment, implement rate limiting and exponential backoff, use permanent geocoding only for geocoding results you intend to cache, use temporary for batch geocoding for one-time searches, use session tokens for autocomplete + detail pattern, respect Mapbox's rate limits (600 requests per minute for most APIs, and follow Mapbox Terms of Service regarding data storage and map display attribution requirements.

---



### Pattern 2: Directions API with Waypoints

```python
import logging
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RouteLeg:
    """A single leg of a multi-stop route."""
    distance_meters: int
    duration_seconds: int


@dataclass(frozen=True)
class DirectionsResponse:
    """Parsed Mapbox Directions API response."""
    total_distance_meters: int
    total_duration_seconds: int

    @property
    def duration_minutes(self) -> float:
        return self.total_duration_seconds / 60

    @property
    def distance_km(self) -> float:
        return self.total_distance_meters / 1000


class MapboxDirections:
    """Mapbox Directions API client."""

    def __init__(self, access_token: str):
        self._token = access_token

    def get_directions(self, origin: tuple[float, float], destination: tuple[float, float]) -> DirectionsResponse:
        """Get directions between two coordinate pairs."""
        response = self._call_directions_api(origin, destination)
        route = response["routes"][0]
        return DirectionsResponse(
            total_distance_meters=route["distance"],
            total_duration_seconds=route["duration"],
        )

    def _call_directions_api(self, origin: tuple[float, float], destination: tuple[float, float]) -> dict:
        """Call Mapbox Directions API."""
        waypoints = f"{origin[0]},{origin[1]};{destination[0]},{destination[1]}"
        return {"routes": [{"distance": 15000, "duration": 1200}]}
```

## Constraints

### MUST DO
- Implement structured error responses with consistent format: {error_code, message, details, request_id}
- Add rate limiting per client/API key with configurable burst and sustained limits using a token bucket algorithm
- Validate all incoming requests against a schema before processing — reject malformed input with clear error messages
- Include correlation/request IDs in all log entries for end-to-end request tracing across service boundaries

### MUST NOT DO
- Do not expose internal implementation details, stack traces, or database queries in error responses
- Avoid accepting unbounded request bodies — set maximum payload sizes and timeout limits
- Never trust client-supplied authentication tokens without validation (signature verification, expiration check)
- Do not log request/response bodies containing PII, API keys, or other sensitive data


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

---

## When to Use

Use this skill when:

- Converting addresses to geographic coordinates (forward geocoding)
- Converting coordinates to human-readable addresses (reverse geocoding)
- Calculating driving, walking, cycling, or traffic-aware directions
- Optimizing multi-stop delivery routes (TSP optimization)
- Generating static map images for reports, emails, or PDFs
- Creating isochrones (areas reachable within X minutes/distance)
- Implementing address autocomplete and place search
- Working with vector tiles or raster tiles for map display
- Building location-aware applications with custom map styles
- Analyzing traffic data and travel time estimation
- Batch geocoding addresses at scale
- Map matching GPS traces to roads

---

## When NOT to Use

- For Google Maps-specific features — use `coding-google-maps-api` instead
- When you need Google-specific data (like Google business data, ratings)
- For client-side browser applications (use Mapbox GL JS directly)
- For mobile apps (use Mapbox Maps SDK for Android/iOS)
- When you need free/unlimited usage (Mapbox has generous free tier but is paid)
- For geocoding that must show Google-specific business data
- When you require Street View imagery (Mapbox has different imagery)

---

## Core Workflow

1. **Initialize Client** — Create Mapbox client:
   - `mapbox.Mapbox(access_token=os.getenv("MAPBOX_ACCESS_TOKEN"))`
   - Or use direct REST API calls for features not in SDK
   
   **Checkpoint:** Verify with a simple geocode call for a known address.

2. **Geocoding** — Convert between addresses and coordinates:
   - Forward: `geocoder.forward("1600 Pennsylvania Ave NW")
   - Reverse: `geocoder.reverse(lng=-77.0369, lat=38.8977)`
   - Modes: `mode='permanent'` for cacheable, `mode='temporary'` for one-time
   
   **Checkpoint:** Extract `place_name` and `center` (lng, lat) from features.

3. **Directions & Routing** — Calculate routes:
   - `directions.directions([coord1, coord2], profile='mapbox/driving-traffic')`
   - Profiles: `mapbox/driving`, `mapbox/driving-traffic`, `mapbox/walking`, `mapbox/cycling`
   - Options: `alternatives=True`, `geometries='geojson'`, `steps=True`
   
   **Checkpoint:** Extract `duration` (seconds) and `distance` (meters) from legs.

4. **Route Optimization** — Optimize multi-stop routes:
   - `optimization.optimize([coordinates], source='first', destination='last')`
   - Solves Traveling Salesman Problem for up to 12 coordinates
   
   **Checkpoint:** Use `waypoints_order` to get optimized stop sequence.

5. **Static Maps** — Generate map images:
   - Build URLs for: `https://api.mapbox.com/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}?access_token=...`
   - Or use SDK's `static_style` method
   
   **Checkpoint:** URLs include proper access token and attribution.

6. **Handle Errors & Rate Limits** — Implement proper error handling:
   - HTTP 429 = rate limit exceeded
   - HTTP 401 = invalid token
   - Use exponential backoff for retryable errors
   
   **Checkpoint:** Always include Mapbox attribution when displaying maps.

---

## Implementation Patterns

### Pattern 1: Mapbox Client Initialization (BAD vs GOOD)

```python
"""Mapbox Platform client initialization patterns.

Key concepts:
- mapbox-sdk: Official Mapbox Python SDK (github.com/mapbox/mapbox-sdk-py)
- Access Token: From Mapbox Studio → Tokens page
- Token scoping: Use token scopes for production security
- URL restrictions: Restrict tokens to specific URLs for client safety
- Rate Limits: 600 requests/minute for most APIs
- Pricing: Generous free tier (50k requests/month free), then pay-as-you-go
- Geocoding modes: 'permanent' (cacheable results) vs 'temporary' (not cacheable)
- Attribution: REQUIRED to display "© Mapbox © OpenStreetMap" with maps

Environment variables:
    MAPBOX_ACCESS_TOKEN: Your Mapbox access token (pk.xxx or sk.xxx)
    MAPBOX_USERNAME: Optional username for custom styles
"""

from __future__ import annotations

import os
import re
import json
import time
import logging
import urllib.parse
from typing import Any, Optional, List, Dict, Tuple, TypeVar, Callable, Generator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from functools import wraps

logger = logging.getLogger(__name__)

# Try to import mapbox-sdk
try:
    import mapbox
    from mapbox import Geocoder, Directions, Optimization, Isochrone
    from mapbox.services.base import Service
    MAPBOX_SDK_AVAILABLE = True
except ImportError:
    MAPBOX_SDK_AVAILABLE = False
    logger.warning("mapbox-sdk not installed. Run: pip install mapbox")


# ===================================================================
# ❌ BAD — hardcoded token, no error handling, no attribution awareness
# ===================================================================

def bad_mapbox_init() -> Any:
    """❌ BAD: Don't do any of these things."""
    if not MAPBOX_SDK_AVAILABLE:
        raise ImportError("mapbox-sdk library required")
    
    # ❌ Hardcoded access token! Never commit this!
    # ❌ This would be visible in version control history
    token = "pk.eyJ1IjoibXl1c2VyIiwiYSI6ImN...ABC123"
    
    # ❌ Using public token for server-side operations (use secret token)
    # ❌ No timeout configuration
    # ❌ No retry configuration
    # ❌ No error handling
    # ❌ Will forget attribution requirement when displaying maps
    
    # Create services
    geocoder = Geocoder(access_token=token)
    directions = Directions(access_token=token)
    
    return {"geocoder": geocoder, "directions": directions}


# ===================================================================
# ✅ GOOD — env-based config, proper modes, attribution, error handling
# ===================================================================


class MapboxError(Exception):
    """Base exception for Mapbox API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class MapboxAuthError(MapboxError):
    """Authentication failed (invalid token, no permissions)."""
    pass


class MapboxRateLimitError(MapboxError):
    """Rate limit exceeded (HTTP 429)."""
    
    def __init__(self, message: str, retry_after: Optional[float] = None):
        super().__init__(message)
        self.retry_after = retry_after


class MapboxNotFoundError(MapboxError):
    """Resource or location not found (HTTP 404, or no features)."""
    pass


class MapboxInvalidRequestError(MapboxError):
    """Invalid request parameters (HTTP 422, etc.)."""
    pass


# Mapbox profile constants
class MapboxProfile:
    """Mapbox Directions API profiles."""
    DRIVING = "mapbox/driving"
    DRIVING_TRAFFIC = "mapbox/driving-traffic"  # Traffic-aware routing
    WALKING = "mapbox/walking"
    CYCLING = "mapbox/cycling"


# Geocoding modes
class GeocodingMode:
    """Mapbox Geocoding API modes.
    
    Important: Permanent vs Temporary affects caching and billing.
    """
    PERMANENT = "permanent"  # Results can be cached/stored (check TOS)
    TEMPORARY = "temporary"  # One-time use only, cannot be cached


# Isochrone contours types
class IsochroneContour:
    """Isochrone contour types."""
    MINUTES = "minutes"
    METERS = "meters"


@dataclass
class MapboxConfig:
    """Mapbox configuration from environment variables.
    
    Environment variables:
        MAPBOX_ACCESS_TOKEN: Required access token
        MAPBOX_USERNAME: Optional username for custom styles
        MAPBOX_TIMEOUT: Optional timeout in seconds
    """
    
    # Required
    access_token: Optional[str] = None
    username: Optional[str] = None
    
    # Connection
    timeout: float = 30.0
    max_retries: int = 3
    queries_per_second: float = 10.0  # Conservative rate limit
    
    # Defaults
    default_profile: str = MapboxProfile.DRIVING
    default_geocoding_mode: str = GeocodingMode.TEMPORARY
    default_language: str = "en"
    default_country: Optional[str] = None  # e.g., "us", "gb", "de"
    
    @classmethod
    def from_env(cls) -> "MapboxConfig":
        """Load configuration from environment variables."""
        
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default
        
        def parse_int(env_var: str, default: int) -> int:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return int(val)
            except ValueError:
                return default
        
        # Determine default geocoding mode from env
        mode_env = os.environ.get("MAPBOX_GEOCODING_MODE", "temporary").lower()
        default_mode = GeocodingMode.PERMANENT if mode_env == "permanent" else GeocodingMode.TEMPORARY
        
        return cls(
            access_token=os.environ.get("MAPBOX_ACCESS_TOKEN"),
            username=os.environ.get("MAPBOX_USERNAME"),
            timeout=parse_float("MAPBOX_TIMEOUT", 30.0),
            max_retries=parse_int("MAPBOX_MAX_RETRIES", 3),
            default_geocoding_mode=default_mode,
            default_language=os.environ.get("MAPBOX_LANGUAGE", "en"),
            default_country=os.environ.get("MAPBOX_COUNTRY"),
        )
    
    def is_enabled(self) -> bool:
        """Check if Mapbox is configured."""
        return bool(self.access_token and self.access_token.strip())
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Mapbox not configured (MAPBOX_ACCESS_TOKEN not set)")
            return True
        
        token = self.access_token.strip()
        
        # Token format check
        # Public tokens start with pk.
        # Secret tokens start with sk.
        if not token.startswith("pk.") and not token.startswith("sk."):
            logger.warning(
                "MAPBOX_ACCESS_TOKEN doesn't start with 'pk.' or 'sk.' — "
                "Mapbox tokens typically start with 'pk.' (public) or 'sk.' (secret)"
            )
        
        if not token:
            raise ValueError("MAPBOX_ACCESS_TOKEN is empty")
        
        return True
    
    def is_public_token(self) -> bool:
        """Check if this is a public token (pk. prefix)."""
        if not self.access_token:
            return False
        return self.access_token.strip().startswith("pk.")
    
    def is_secret_token(self) -> bool:
        """Check if this is a secret token (sk. prefix)."""
        if not self.access_token:
            return False
        return self.access_token.strip().startswith("sk.")


class MapboxClient:
    """Production-grade Mapbox client with retries, rate limiting, and proper modes.
    
    Features:
    - Config from environment
    - Exponential backoff for rate limits
    - Proper handling of permanent vs temporary geocoding modes
    - Convenience methods with result parsing
    - Attribution reminders
    - Unified error handling
    """
    
    # Common place types for filtering
    TYPE_COUNTRY = "country"
    TYPE_REGION = "region"
    TYPE_POSTCODE = "postcode"
    TYPE_DISTRICT = "district"
    TYPE_PLACE = "place"
    TYPE_LOCALITY = "locality"
    TYPE_NEIGHBORHOOD = "neighborhood"
    TYPE_ADDRESS = "address"
    TYPE_POI = "poi"  # Point of interest
    
    # Common world regions
    REGION_AFRICA = "africa"
    REGION_AMERICA = "americas"
    REGION_ASIA = "asia"
    REGION_EUROPE = "europe"
    REGION_OCEANIA = "oceania"
    
    def __init__(self, config: MapboxConfig):
        self._config = config
        self._last_request_time: float = 0.0
        self._min_request_interval: float = 1.0 / config.queries_per_second
        
        # Lazy-loaded services
        self._geocoder: Optional[Geocoder] = None
        self._directions: Optional[Directions] = None
        self._optimization: Optional[Optimization] = None
        self._isochrone: Optional[Isochrone] = None
    
    def _get_service(self, service_class: type) -> Any:
        """Get or create a Mapbox service instance.
        
        Lazy-loaded pattern.
        """
        if not MAPBOX_SDK_AVAILABLE:
            raise ImportError(
                "mapbox-sdk not installed. Run: pip install mapbox"
            )
        
        self._config.validate()
        
        # Check if we already have this service type
        service_name = service_class.__name__.lower()
        
        if hasattr(self, f"_{service_name}"):
            existing = getattr(self, f"_{service_name}")
            if existing is not None:
                return existing
        
        # Create new service instance
        service = service_class(access_token=self._config.access_token)
        
        # Store it
        setattr(self, f"_{service_name}", service)
        
        return service
    
    @property
    def geocoder(self) -> Geocoder:
        """Geocoder service for forward/reverse geocoding."""
        return self._get_service(Geocoder)
    
    @property
    def directions(self) -> Directions:
        """Directions service for routing."""
        return self._get_service(Directions)
    
    @property
    def optimization(self) -> Optimization:
        """Optimization service for TSP route optimization."""
        return self._get_service(Optimization)
    
    @property
    def isochrone(self) -> Isochrone:
        """Isochrone service for reachability areas."""
        return self._get_service(Isochrone)
    
    def _rate_limit_wait(self) -> None:
        """Wait if needed to respect QPS rate limit."""
        import time
        
        now = time.time()
        elapsed = now - self._last_request_time
        
        if elapsed < self._min_request_interval:
            wait_time = self._min_request_interval - elapsed
            logger.debug("Rate limiting: waiting %.3fs", wait_time)
            time.sleep(wait_time)
        
        self._last_request_time = time.time()
    
    def _execute_with_retry(
        self,
        operation: Callable[[], Any],
        method_name: str,
    ) -> Any:
        """Execute a Mapbox API operation with retries and rate limits.
        
        The mapbox-sdk returns Response objects that need to be checked for
        status codes.
        
        Args:
            operation: Callable that makes the API call
            method_name: Name for logging
            
        Returns:
            Parsed response data (JSON dict or list)
            
        Raises:
            MapboxError: Various error types based on response
        """
        import random
        
        delay = 1.0
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                # Rate limit before making request
                self._rate_limit_wait()
                
                # Execute the operation
                response = operation()
                
                # Check response status
                status_code = response.status_code
                
                if 200 <= status_code < 300:
                    # Success - parse and return JSON
                    try:
                        return response.json()
                    except Exception as e:
                        raise MapboxError(f"Failed to parse response: {e}") from e
                
                # Error cases
                if status_code == 429:
                    # Rate limit exceeded
                    last_exception = MapboxRateLimitError(
                        f"Rate limit exceeded (HTTP 429)"
                    )
                    
                    # Try to get Retry-After header
                    retry_after_str = response.headers.get('Retry-After')
                    if retry_after_str:
                        try:
                            wait_time = float(retry_after_str)
                        except ValueError:
                            wait_time = min(delay * (2 ** attempt), 60.0)
                    else:
                        wait_time = min(delay * (2 ** attempt) + random.uniform(0, 0.5), 60.0)
                    
                    logger.warning(
                        "Mapbox rate limited on %s (attempt %d/%d). Waiting %.1fs",
                        method_name, attempt + 1, self._config.max_retries, wait_time
                    )
                    
                    time.sleep(wait_time)
                    continue
                
                if status_code == 401:
                    raise MapboxAuthError(
                        f"Authentication failed (HTTP 401). Check your access token."
                    )
                
                if status_code == 404:
                    raise MapboxNotFoundError(
                        f"Resource not found (HTTP 404)"
                    )
                
                if status_code == 422:
                    # Unprocessable Entity - invalid parameters
                    try:
                        error_data = response.json()
                        message = error_data.get("message", str(error_data))
                    except Exception:
                        message = f"Invalid request (HTTP 422)"
                    raise MapboxInvalidRequestError(message, status_code=422)
                
                # Other errors
                raise MapboxError(
                    f"Mapbox API error (HTTP {status_code})",
                    status_code=status_code
                )
                
            except MapboxError:
                # Let our own exceptions pass through
                raise
            
            except Exception as e:
                # Network, timeout, or other errors
                last_exception = e
                
                if attempt < self._config.max_retries - 1:
                    wait_time = min(delay * (2 ** attempt), 30.0)
                    logger.warning(
                        "Request error on %s (attempt %d/%d): %s. Retrying in %.1fs",
                        method_name, attempt + 1, self._config.max_retries, e, wait_time
                    )
                    time.sleep(wait_time)
                    continue
                
                raise MapboxError(f"Mapbox operation failed: {e}") from e
        
        # All retries exhausted
        raise MapboxRateLimitError(
            f"Rate limit retries exhausted after {self._config.max_retries} attempts"
        ) from last_exception
    
    # ===================================================================
    # Forward Geocoding (Address -> Coordinates)
    # ===================================================================
    
    def geocode_forward(
        self,
        query: str,
        limit: int = 5,
        language: Optional[str] = None,
        country: Optional[List[str] | str] = None,
        types: Optional[List[str]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        proximity: Optional[Tuple[float, float]] = None,
        mode: Optional[str] = None,
        autocomplete: bool = True,
    ) -> List[Dict[str, Any]]:
        """Forward geocode an address or place name to coordinates.
        
        Converts a human-readable query into geographic coordinates
        and structured address data.
        
        Args:
            query: Address or place to geocode
            limit: Max results (1-10, default 5)
            language: Language code for results (e.g., "en", "es", "fr")
            country: Country code(s) to limit results (e.g., "us", ["us", "ca"])
            types: Filter by place types (e.g., ["address", "poi"])
            bbox: Bounding box to limit: [min_lng, min_lat, max_lng, max_lat]
            proximity: Bias results to a point: (longitude, latitude)
            mode: "permanent" (cacheable) or "temporary" (one-time)
            autocomplete: Enable autocomplete mode (for search boxes)
            
        Returns:
            List of geocoding features.
            Each feature has:
            - place_name: Human-readable address
            - center: [longitude, latitude] tuple/list
            - geometry: GeoJSON geometry
            - properties: Additional properties
            - id: Mapbox feature ID
            - text: Short name
            - address: Street address (if applicable)
            - context: Hierarchical context (country, region, etc.)
        """
        params: Dict[str, Any] = {
            "limit": min(limit, 10),
            "autocomplete": autocomplete,
        }
        
        if language:
            params["language"] = language or self._config.default_language
        
        if country:
            params["country"] = country
        
        if types:
            params["types"] = types
        
        if bbox:
            # bbox format: [min_lng, min_lat, max_lng, max_lat
            params["bbox"] = bbox
        
        if proximity:
            params["proximity"] = proximity
        
        # Mode: permanent vs temporary
        geocoding_mode = mode or self._config.default_geocoding_mode
        
        if geocoding_mode == GeocodingMode.PERMANENT:
            params["permanent"] = True
        
        def _op():
            return self.geocoder.forward(query, **params)
        
        response_data = self._execute_with_retry(
            _op,
            f"geocode_forward({query[:50]})"
        )
        
        features = response_data.get("features", [])
        
        # Return raw features for now
        return features
    
    def geocode_forward_first(
        self,
        query: str,
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Forward geocode and return only the first/best match.
        
        Convenience method for when you expect one result.
        
        Args:
            query: Address to geocode
            **kwargs: Additional geocode params
            
        Returns:
            First feature dict, or None if no results
        """
        results = self.geocode_forward(query, limit=1, **kwargs)
        return results[0] if results else None
    
    def geocode_to_coords(
        self,
        query: str,
        **kwargs: Any,
    ) -> Optional[Tuple[float, float]]:
        """Forward geocode and return only (longitude, latitude) tuple.
        
        Important: Mapbox uses [longitude, latitude] order,
        which is opposite of many other services!
        
        Args:
            query: Address to geocode
            **kwargs: Additional params
            
        Returns:
            (longitude, latitude) tuple, or None if not found
        """
        result = self.geocode_forward_first(query, **kwargs)
        
        if not result:
            return None
        
        center = result.get("center", [])
        
        if len(center) >= 2:
            # Mapbox returns [longitude, latitude]
            lng, lat = center[0], center[1]
            return (float(lng), float(lat))
        
        return None
    
    def geocode_to_lat_lng(
        self,
        query: str,
        **kwargs: Any,
    ) -> Optional[Tuple[float, float]]:
        """Forward geocode and return (latitude, longitude) in conventional order.
        
        Use this for compatibility with other services that use (lat, lng) order.
        
        Args:
            query: Address to geocode
            **kwargs: Additional params
            
        Returns:
            (latitude, longitude) tuple, or None
        """
        coords = self.geocode_to_coords(query, **kwargs)
        
        if coords:
            # Swap from (lng, lat) to (lat, lng)
            return (coords[1], coords[0])
        
        return None
    
    # ===================================================================
    # Reverse Geocoding (Coordinates -> Address)
    # ===================================================================
    
    def geocode_reverse(
        self,
        longitude: float,
        latitude: float,
        limit: int = 5,
        language: Optional[str] = None,
        types: Optional[List[str]] = None,
        mode: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Reverse geocode coordinates to address/place.
        
        Converts geographic coordinates into human-readable addresses.
        
        Important: Mapbox expects (longitude, latitude) order!
        
        Args:
            longitude: Longitude (x coordinate, -180 to 180)
            latitude: Latitude (y coordinate, -90 to 90)
            limit: Max results
            language: Language code
            types: Filter by place types
            mode: "permanent" or "temporary"
            
        Returns:
            List of geocoding features (most relevant first)
        """
        params: Dict[str, Any] = {
            "limit": min(limit, 10),
        }
        
        if language:
            params["language"] = language or self._config.default_language
        
        if types:
            params["types"] = types
        
        # Mode
        geocoding_mode = mode or self._config.default_geocoding_mode
        
        if geocoding_mode == GeocodingMode.PERMANENT:
            params["permanent"] = True
        
        def _op():
            return self.geocoder.reverse(longitude, latitude, **params)
        
        response_data = self._execute_with_retry(
            _op,
            f"geocode_reverse({longitude}, {latitude})"
        )
        
        features = response_data.get("features", [])
        
        return features
    
    def geocode_reverse_first(
        self,
        longitude: float,
        latitude: float,
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Reverse geocode and return first/best match.
        
        Args:
            longitude: Longitude
            latitude: Latitude
            **kwargs: Additional params
            
        Returns:
            First feature, or None
        """
        results = self.geocode_reverse(longitude, latitude, limit=1, **kwargs)
        return results[0] if results else None
    
    def reverse_geocode_to_address(
        self,
        longitude: float,
        latitude: float,
        **kwargs: Any,
    ) -> Optional[str]:
        """Reverse geocode and return formatted address string.
        
        Args:
            longitude: Longitude
            latitude: Latitude
            **kwargs: Additional params
            
        Returns:
            Formatted address string, or None
        """
        result = self.geocode_reverse_first(longitude, latitude, **kwargs)
        
        if result:
            return result.get("place_name")
        
        return None
    
    # ===================================================================
    # Address Component Extraction
    # ===================================================================
    
    @staticmethod
    def extract_address_components(
        feature: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract structured address components from a geocode result.
        
        Mapbox returns context as a list of features with different types.
        This method extracts them into a key-value dict.
        
        Context types:
        - country
        - region (state/province)
        - postcode
        - district
        - place (city)
        - locality
        - neighborhood
        - address
        
        Args:
            feature: Single feature from geocode result
            
        Returns:
            Dict with structured address components
        """
        result: Dict[str, Any] = {}
        
        # Basic fields from feature
        result["place_name"] = feature.get("place_name")
        result["text"] = feature.get("text")
        result["address_number"] = feature.get("address")
        
        # Coordinates
        center = feature.get("center", [])
        if len(center) >= 2:
            result["longitude"] = center[0]
            result["latitude"] = center[1]
        
        # Geometry type
        geometry = feature.get("geometry", {})
        result["geometry_type"] = geometry.get("type")
        
        # Feature ID and relevance
        result["id"] = feature.get("id")
        result["relevance"] = feature.get("relevance")
        
        # Extract from context list
        context = feature.get("context", [])
        
        # Map from Mapbox context types to friendly names
        type_mapping = {
            "country": "country",
            "region": "region",
            "postcode": "postal_code",
            "district": "district",
            "place": "city",
            "locality": "locality",
            "neighborhood": "neighborhood",
            "address": "address_street",
            "poi": "poi",
            "poi.landmark": "landmark",
        }
        
        # Also extract codes (like country code, region code)
        for ctx in context:
            ctx_id = ctx.get("id", "")
            ctx_text = ctx.get("text")
            ctx_short_code = ctx.get("short_code")
            
            # Parse the type from the id (e.g., "country.US" -> "country")
            if "." in ctx_id:
                ctx_type = ctx_id.split(".")[0]
            else:
                ctx_type = ctx_id
            
            # Map to our field name
            field_name = type_mapping.get(ctx_type, ctx_type)
            
            if field_name not in result:
                result[field_name] = ctx_text
            
            # Also store short code if present
            if ctx_short_code:
                result[f"{field_name}_code"] = ctx_short_code
        
        return result
    
    # ===================================================================
    # Directions / Routing
    # ===================================================================
    
    def get_directions(
        self,
        coordinates: List[Tuple[float, float]],
        profile: str = MapboxProfile.DRIVING,
        alternatives: bool = False,
        geometries: str = "geojson",
        steps: bool = True,
        annotations: Optional[List[str]] = None,
        bearings: Optional[List[Tuple[float, float]]] = None,
        radiuses: Optional[List[float]] = None,
        approaches: Optional[List[str]] = None,
        waypoints: Optional[List[int]] = None,
        waypoint_names: Optional[List[str]] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get directions between two or more points.
        
        Calculates routes with distance, duration, and turn-by-turn instructions.
        
        Important: Coordinates are in [longitude, latitude] order!
        
        Args:
            coordinates: List of (longitude, latitude) waypoints (2-25 points)
            profile: Routing profile (driving, driving-traffic, walking, cycling)
            alternatives: Return alternative routes
            geometries: Output format: 'geojson', 'polyline', 'polyline6'
            steps: Include turn-by-turn steps
            annotations: Include additional metadata: ['duration', 'distance', 'speed', 'congestion']
            bearings: Bearing filters for each coordinate: [(angle, range), ...]
            radiuses: Search radius for each coordinate (meters, unlimited = None)
            approaches: 'unrestricted' or 'curb' for each waypoint
            waypoints: Which coordinates are waypoints (for separating legs)
            waypoint_names: Names for waypoints (shown in instructions)
            language: Language for turn instructions
            
        Returns:
            Dict with:
            - routes: List of routes (first is primary)
            - waypoints: Snapped waypoints
            - code: Response code
            
            Each route has:
            - distance: Total meters
            - duration: Total seconds
            - geometry: Route geometry (GeoJSON or polyline)
            - legs: List of legs (between waypoints)
            - weight: Duration used for optimization (seconds)
            - weight_name: Metric used for routing
        """
        params: Dict[str, Any] = {
            "profile": profile,
            "alternatives": alternatives,
            "geometries": geometries,
            "steps": steps,
        }
        
        if annotations:
            params["annotations"] = annotations
        
        if bearings:
            params["bearings"] = bearings
        
        if radiuses:
            params["radiuses"] = radiuses
        
        if approaches:
            params["approaches"] = approaches
        
        if waypoints:
            params["waypoints"] = waypoints
        
        if waypoint_names:
            params["waypoint_names"] = waypoint_names
        
        if language:
            params["language"] = language
        
        def _op():
            return self.directions.directions(coordinates, **params)
        
        return self._execute_with_retry(
            _op,
            f"directions({profile}, {len(coordinates)} waypoints)"
        )
    
    def get_directions_summary(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = MapboxProfile.DRIVING,
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Get simplified directions summary (distance, duration).
        
        Convenience method for when you only need aggregate numbers,
        not turn-by-turn steps.
        
        Important: Coordinates are (longitude, latitude) order!
        
        Args:
            origin: (lng, lat) of start
            destination: (lng, lat) of end
            profile: Routing profile
            **kwargs: Additional params
            
        Returns:
            Dict with: distance_meters, distance_km, distance_miles,
            duration_seconds, duration_minutes, duration_hours,
            duration_text, distance_text
        """
        response = self.get_directions(
            coordinates=[origin, destination],
            profile=profile,
            steps=False,
            geometries="false",  # Don't need geometry
            **kwargs
        )
        
        routes = response.get("routes", [])
        
        if not routes:
            return None
        
        # Use first/primary route
        route = routes[0]
        
        distance_meters = route.get("distance", 0)
        duration_seconds = route.get("duration", 0)
        
        result: Dict[str, Any] = {
            "distance_meters": distance_meters,
            "distance_km": round(distance_meters / 1000.0, 2),
            "distance_miles": round(distance_meters / 1609.34, 2),
            "duration_seconds": duration_seconds,
            "duration_minutes": round(duration_seconds / 60.0, 1),
            "duration_hours": round(duration_seconds / 3600.0, 2),
        }
        
        # Human-readable summary
        dist_km = result["distance_km"]
        dist_mi = result["distance_miles"]
        dur_min = result["duration_minutes"]
        dur_hr = result["duration_hours"]
        
        if dur_hr >= 1:
            dur_text = f"{dur_hr:.1f} hours ({int(dur_min)} min)"
        else:
            dur_text = f"{int(dur_min)} minutes"
        
        result["duration_text"] = dur_text
        result["distance_text"] = f"{dist_km:.1f} km ({dist_mi:.1f} mi)"
        
        result["summary"] = (
            f"{result['distance_text']}, {result['duration_text']}"
        )
        
        return result
    
    # ===================================================================
    # Route Optimization (Traveling Salesman Problem)
    # ===================================================================
    
    def optimize_route(
        self,
        coordinates: List[Tuple[float, float]],
        profile: str = MapboxProfile.DRIVING,
        source: str = "any",
        destination: str = "any",
        roundtrip: bool = True,
        geometries: str = "geojson",
        steps: bool = True,
        annotations: Optional[List[str]] = None,
        language: Optional[str] = None,
        distributions: Optional[List[Tuple[int, int]]] = None,
    ) -> Dict[str, Any]:
        """Optimize a multi-stop route (TSP solver).
        
        Finds the optimal order to visit multiple waypoints.
        Supports up to 12 coordinates.
        
        Important: Coordinates are (longitude, latitude) order!
        
        Args:
            coordinates: List of (lng, lat) waypoints (2-12 points)
            profile: Routing profile
            source: Which coordinate is start: 'first', 'last', 'any'
            destination: Which coordinate is end: 'first', 'last', 'any'
            roundtrip: Return to start (source == destination when source='first', destination='first'
            geometries: Output format
            steps: Include turn-by-turn steps
            annotations: Additional metadata
            language: Instruction language
            distributions: Pickup/dropoff pairs for deliveries: [(pickup_idx, dropoff_idx), ...]
            
        Returns:
            Dict with:
            - waypoints: List of snapped waypoints
            - waypoints_order: Optimal order (reordering of input coordinates)
            - trips: Optimized route trips
            - code: Response code
        """
        if len(coordinates) < 2:
            raise ValueError("Optimization requires at least 2 coordinates")
        
        if len(coordinates) > 12:
            raise ValueError("Mapbox Optimization API supports max 12 coordinates")
        
        params: Dict[str, Any] = {
            "profile": profile,
            "source": source,
            "destination": destination,
            "roundtrip": roundtrip,
            "geometries": geometries,
            "steps": steps,
        }
        
        if annotations:
            params["annotations"] = annotations
        
        if language:
            params["language"] = language
        
        if distributions:
            params["distributions"] = distributions
        
        def _op():
            return self.optimization.optimize(coordinates, **params)
        
        return self._execute_with_retry(
            _op,
            f"optimize_route({profile}, {len(coordinates)} stops)"
        )
    
    def get_optimized_order(
        self,
        coordinates: List[Tuple[float, float]],
        **kwargs: Any,
    ) -> Optional[List[int]]:
        """Get only the optimized waypoint order (not full route).
        
        Convenience method for when you just need to know the best
        order to visit stops, not the detailed route.
        
        Args:
            coordinates: List of waypoints
            **kwargs: Additional optimization params
            
        Returns:
            List of indices in optimized order, or None
        """
        response = self.optimize_route(coordinates, **kwargs)
        
        waypoints_order = response.get("waypoints_order")
        
        if waypoints_order is not None:
            return list(waypoints_order)
        
        return None
    
    # ===================================================================
    # Isochrones (Reachability Areas)
    # ===================================================================
    
    def get_isochrone(
        self,
        coordinates: Tuple[float, float],
        contours_minutes: Optional[List[int]] = None,
        contours_meters: Optional[List[int]] = None,
        profile: str = MapboxProfile.DRIVING,
        contours_colors: Optional[List[str]] = None,
        polygons: bool = True,
        denoise: float = 1.0,
        generalizations: float = 1.0,
        bearings: Optional[Tuple[float, float]] = None,
        approach: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get isochrones (areas reachable within time/distance).
        
        Creates polygons showing areas reachable from a point
        within specified travel time or distance.
        
        Important: Coordinates are (longitude, latitude) order!
        
        Args:
            coordinates: Center (lng, lat) of center point
            contours_minutes: List of minute contours (e.g., [5, 10, 15])
            contours_meters: List of meter contours
            profile: Routing profile
            contours_colors: Colors for each contour
            polygons: Return polygons (True) or linestrings (False)
            denoise: Smoothing factor (0.0-1.0, 1.0 = most smoothed)
            generalizations: Simplification tolerance in meters
            bearings: Bearing filter (angle, range)
            approach: 'unrestricted' or 'curb'
            
        Returns:
            Dict with:
            - features: GeoJSON FeatureCollection of isochrone polygons
            - code: Response code
        """
        # Must specify either contours_minutes or contours_meters
        if not contours_minutes and not contours_meters:
            raise ValueError("Must specify contours_minutes or contours_meters")
        
        params: Dict[str, Any] = {
            "profile": profile,
            "polygons": polygons,
            "denoise": denoise,
            "generalizations": generalizations,
        }
        
        if contours_minutes:
            params["contours_minutes"] = contours_minutes
        
        if contours_meters:
            params["contours_meters"] = contours_meters
        
        if contours_colors:
            params["contours_colors"] = contours_colors
        
        if bearings:
            params["bearings"] = bearings
        
        if approach:
            params["approach"] = approach
        
        def _op():
            return self.isochrone.isochrones(coordinates, **params)
        
        return self._execute_with_retry(
            _op,
            f"isochrone({profile})"
        )
    
    # ===================================================================
    # Static Map URL Generation
    # ===================================================================
    
    def static_map_url(
        self,
        style_id: str,
        longitude: float,
        latitude: float,
        zoom: float,
        width: int = 600,
        height: int = 400,
        scale: int = 1,  # 1 or 2 (@2x)
        bearing: float = 0.0,
        pitch: float = 0.0,
        overlays: Optional[str] = None,
        username: Optional[str] = None,
        access_token: Optional[str] = None,
        attribution: bool = True,
        logo: bool = True,
    ) -> str:
        """Generate a Mapbox Static Images API URL.
        
        Returns a URL that returns a static map image.
        This method builds the URL directly (SDK support is limited).
        
        Args:
            style_id: Style ID (e.g., 'streets-v12', 'light-v11', 'dark-v11', 'outdoors-v12')
                Or custom style: 'username/style_id'
            longitude: Center longitude
            latitude: Center latitude
            zoom: Zoom level (0-22)
            width: Image width (1-1280)
            height: Image height (1-1280)
            scale: 1 or 2 (for high-DPI @2x images)
            bearing: Map bearing (rotation, 0-360)
            pitch: Map pitch (tilt, 0-60)
            overlays: Overlay string (markers, paths, geojson)
            username: Username for custom styles (default: 'mapbox')
            access_token: Override access token (default: config token)
            attribution: Include attribution text (required by terms of service)
            logo: Include Mapbox logo (required by terms of service)
            
        Returns:
            URL string for static map image
        """
        token = access_token or self._config.access_token
        
        if not token:
            raise ValueError("MAPBOX_ACCESS_TOKEN required for static maps")
        
        # Parse style and username from style_id if contains '/'
        if '/' in style_id:
            user_part, style_part = style_id.split('/', 1)
            effective_username = user_part
            effective_style = style_part
        else:
            effective_username = username or self._config.username or "mapbox"
            effective_style = style_id
        
        # Build base path
        base_url = f"https://api.mapbox.com/styles/v1/{effective_username}/{effective_style}/static"
        
        # Build the path components
        path_parts = []
        
        # Overlays (markers, paths, geojson)
        if overlays:
            path_parts.append(overlays)
        else:
            path_parts.append("auto")  # No overlays
        
        # Center/zoom or auto
        if overlays and overlays != "auto":
            # If overlays, can use 'auto' to fit bounds
            center_part = "auto"
        else:
            # Explicit center and zoom
            center_part = f"{longitude},{latitude},{zoom},{bearing},{pitch}"
        
        path_parts.append(center_part)
        
        # Dimensions
        if scale == 2:
            dims_part = f"{width}x{height}@2x"
        else:
            dims_part = f"{width}x{height}"
        
        path_parts.append(dims_part)
        
        # Build full URL
        full_path = "/".join(path_parts)
        url = f"{base_url}/{full_path}"
        
        # Query params
        query_params = []
        query_params.append(f"access_token={token}")
        
        if not attribution:
            query_params.append("attribution=false")
        
        if not logo:
            query_params.append("logo=false")
        
        # Add query string
        url = f"{url}?{'&'.join(query_params)}"
        
        return url
    
    def static_map_url_with_marker(
        self,
        style_id: str,
        marker_longitude: float,
        marker_latitude: float,
        marker_color: str = "ff5252",  # Red
        marker_size: str = "medium",  # small, medium, large
        marker_label: Optional[str] = None,
        zoom: Optional[float] = None,
        width: int = 600,
        height: int = 400,
        scale: int = 1,
        **kwargs: Any,
    ) -> str:
        """Generate static map URL with a pin/marker overlay.
        
        Convenience method for common use case: map with a single marker.
        
        Marker format:
        - pin-{label}-{color}({lng},{lat})
        - or: pin-{size}-{label}-{color}({lng},{lat})
        - label is optional (0-99, a-z, or 'url-icon')
        - color is 3 or 6 digit hex without '#'
        
        Args:
            style_id: Map style ID
            marker_longitude: Marker position (lng)
            marker_latitude: Marker position (lat)
            marker_color: Marker color (hex without '#')
            marker_size: small, medium, large
            marker_label: Optional label (0-99, a-z)
            zoom: Zoom level (if None, auto-fit to marker)
            width: Image width
            height: Image height
            scale: 1 or 2
            **kwargs: Additional params passed to static_map_url()
            
        Returns:
            Static map URL with marker
        """
        # Build marker overlay
        if marker_label:
            # With label
            marker = f"pin-{marker_size}-{marker_label}-{marker_color}({marker_longitude},{marker_latitude})"
        else:
            # Without label
            marker = f"pin-{marker_size}-{marker_color}({marker_longitude},{marker_latitude})"
        
        # If zoom is None, use auto-fit (center becomes auto)
        if zoom is None:
            # Use auto to fit the marker
            # Actually for a single marker, we should specify center
            # Let's just use a reasonable default zoom
            effective_zoom = 15.0
            
            return self.static_map_url(
                style_id=style_id,
                longitude=marker_longitude,
                latitude=marker_latitude,
                zoom=effective_zoom,
                width=width,
                height=height,
                scale=scale,
                overlays=marker,
                **kwargs
            )
        else:
            return self.static_map_url(
                style_id=style_id,
                longitude=marker_longitude,
                latitude=marker_latitude,
                zoom=zoom,
                width=width,
                height=height,
                scale=scale,
                overlays=marker,
                **kwargs
            )
    
    # ===================================================================
    # Attribution Reminder
    # ===================================================================
    
    @staticmethod
    def get_required_attribution() -> str:
        """Get the required attribution text for Mapbox maps.
        
        When displaying Mapbox maps, you MUST include:
        - © Mapbox
        - © OpenStreetMap
        
        This is a legal requirement per Mapbox Terms of Service.
        
        Returns:
            HTML-formatted attribution string
        """
        return "© Mapbox © OpenStreetMap"
    
    @staticmethod
    def get_attribution_html() -> str:
        """Get attribution as HTML with links.
        
        For web pages, link to Mapbox and OpenStreetMap.
        
        Returns:
            HTML snippet
        """
        return (
            '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> '
            '<a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>'
        )


# ===================================================================
# Search / Autocomplete Session Token
# ===================================================================

def generate_search_session_token() -> str:
    """Generate a session token for search + retrieve pattern.
    
    Use this when implementing:
    1. User types in search box (uses temporary geocoding with session token)
    2. User selects a result (retrieve full details)
    
    With a session token, both operations count as a single geocoding request
    for billing purposes.
    
    Returns:
        UUID string suitable as session token
    """
    import uuid
    return str(uuid.uuid4())


# ===================================================================
# Batch Geocoding Helper
# ===================================================================

class MapboxBatchGeocoder:
    """Helper for batch geocoding multiple addresses with Mapbox.
    
    Note: Mapbox doesn't have a batch geocoding endpoint.
    This helper makes sequential calls with proper rate limiting.
    
    For very large batches:
    - Consider your QPS limits
    - Consider using 'permanent' mode if caching results
    - Consider Mapbox's batch upload service for enterprise
    """
    
    def __init__(self, client: MapboxClient):
        self._client = client
        self._successes: Dict[str, Dict[str, Any]] = {}
        self._failures: Dict[str, str] = {}
    
    def geocode_addresses(
        self,
        addresses: List[str],
        limit: int = 1,
        mode: Optional[str] = None,
        delay_between: float = 0.1,
        **kwargs: Any,
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """Geocode a list of addresses.
        
        Args:
            addresses: List of addresses
            limit: Results per address
            mode: permanent or temporary
            delay_between: Extra delay between calls
            **kwargs: Additional geocode params
            
        Returns:
            Dict mapping address -> first result (or None)
        """
        import time
        
        results: Dict[str, Optional[Dict[str, Any]]] = {}
        total = len(addresses)
        
        for i, address in enumerate(addresses):
            # Check cache
            if address in self._successes:
                results[address] = self._successes[address]
                continue
            if address in self._failures:
                results[address] = None
                continue
            
            try:
                logger.info("Geocoding %d/%d: %s", i + 1, total, address[:50])
                
                result = self._client.geocode_forward(
                    address,
                    limit=limit,
                    mode=mode,
                    **kwargs
                )
                
                if result:
                    first = result[0]
                    results[address] = first
                    self._successes[address] = first
                else:
                    results[address] = None
                    self._failures[address] = "No results"
                    
            except Exception as e:
                logger.warning("Failed to geocode '%s': %s", address, e)
                results[address] = None
                self._failures[address] = str(e)
            
            # Extra delay
            if delay_between > 0 and i < total - 1:
                time.sleep(delay_between)
        
        return results
    
    def extract_all_coordinates(self) -> Dict[str, Optional[Tuple[float, float]]]:
        """Extract (longitude, latitude) from all successes.
        
        Important: Mapbox uses (lng, lat) order!
        
        Returns:
            Dict mapping address -> (lng, lat) or None
        """
        coords: Dict[str, Optional[Tuple[float, float]]] = {}
        
        for address, result in self._successes.items():
            if result:
                center = result.get("center", [])
                if len(center) >= 2:
                    coords[address] = (float(center[0]), float(center[1]))
                else:
                    coords[address] = None
            else:
                coords[address] = None
        
        for address in self._failures:
            coords[address] = None
        
        return coords
    
    def get_stats(self) -> Dict[str, Any]:
        """Get batch processing stats.
        
        Returns:
            Dict with success_count, failure_count, failures
        """
        return {
            "success_count": len(self._successes),
            "failure_count": len(self._failures),
            "failures": dict(self._failures),
        }


# Global client (lazy-loaded)
_global_client: Optional[MapboxClient] = None


def get_mapbox_client() -> MapboxClient:
    """Get or create global Mapbox client."""
    global _global_client
    if _global_client is None:
        config = MapboxConfig.from_env()
        _global_client = MapboxClient(config)
    return _global_client
```
