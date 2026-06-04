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

---



### Pattern 2: Geocoding with Retry and Caching

```python
import logging
import time
from dataclasses import dataclass
from typing import Optional


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GeoResult:
    """Parsed geocoding result."""
    formatted_address: str
    latitude: float
    longitude: float
    place_id: str | None = None

    @property
    def location_str(self) -> str:
        return f"{self.latitude}, {self.longitude}"


class GeocodingClient:
    """Geocoding client with retry logic."""

    def __init__(self, api_key: str, max_retries: int = 3):
        self._api_key = api_key
        self._max_retries = max_retries

    def geocode(self, address: str) -> GeoResult:
        """Geocode an address string with retries."""
        last_error = None
        for attempt in range(1, self._max_retries + 1):
            try:
                response = self._call_geocoding_api(address)
                return self._parse_response(response)
            except Exception as e:
                last_error = e
                if attempt < self._max_retries:
                    time.sleep(2 ** attempt)
        raise ConnectionError(f"Geocoding failed after {self._max_retries} retries")

    def _call_geocoding_api(self, address: str) -> dict:
        """Call the Google Geocoding API."""
        # In production: requests.get(f"https://maps.googleapis.com/maps/api/geocode/json?address=...")
        return {"results": [{"formatted_address": "1600 Amphitheatre Pkwy",
                            "geometry": {"location": {"lat": 37.422, "lng": -122.085}}}],
                "status": "OK"}

    def _parse_response(self, response: dict) -> GeoResult:
        """Validate and parse API response."""
        if response.get("status") != "OK":
            raise ValueError(f"Geocoding API error: {response.get('status')}")
        result = response["results"][0]
        loc = result["geometry"]["location"]
        return GeoResult(
            formatted_address=result["formatted_address"],
            latitude=loc["lat"],
            longitude=loc["lng"],
        )
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

---

## When to Use

Use this skill when:

- Converting addresses to geographic coordinates (geocoding)
- Converting coordinates to human-readable addresses (reverse geocoding)
- Calculating driving, walking, bicycling, or transit directions
- Finding places (restaurants, businesses, landmarks) by location or search
- Calculating distances and travel times between multiple points
- Looking up time zones for specific coordinates
- Getting elevation data for points or paths
- Generating static map images for reports or emails
- Implementing address autocomplete in forms
- Validating and standardizing postal addresses
- Optimizing routes with multiple waypoints
- Calculating travel time estimates for logistics

---

## When NOT to Use

- For Mapbox-specific features — use `coding-mapbox-api` instead
- For OpenStreetMap data (consider Nominatim, Overpass API instead)
- For client-side browser applications (use Google Maps JavaScript API directly)
- For mobile apps (use Google Maps SDK for Android/iOS)
- For geocoding entire databases (consider batch geocoding services)
- When you need free/unlimited usage (Google Maps is paid after free tier)
- For real-time traffic only (consider other traffic data providers)

---

## Core Workflow

1. **Initialize Client** — Create Google Maps client:
   - `googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))`
   - Set timeouts, retry configuration as needed
   
   **Checkpoint:** Verify with a simple geocode call for a known address.

2. **Geocoding** — Convert between addresses and coordinates:
   - Forward: `gmaps.geocode("1600 Amphitheatre Parkway, Mountain View, CA")`
   - Reverse: `gmaps.reverse_geocode((37.4220, -122.0841))`
   - Use `components` parameter for region/country filtering
   
   **Checkpoint:** Extract `formatted_address` and `geometry.location` from results.

3. **Directions** — Calculate routes:
   - `gmaps.directions("Seattle, WA", "San Francisco, CA", mode="driving")`
   - Modes: `driving`, `walking`, `bicycling`, `transit`
   - Waypoints: `waypoints=[...]` for multi-stop routes
   - Options: `alternatives=True`, `avoid=["tolls", "highways"]`, `departure_time`
   
   **Checkpoint:** Extract `legs[].duration.value` (seconds) and `legs[].distance.value` (meters).

4. **Places** — Search for businesses and points of interest:
   - Nearby: `gmaps.places_nearby(location=(lat, lng), radius=1000, type="restaurant")`
   - Text: `gmaps.places(query="coffee shops in Seattle")`
   - Find Place: `gmaps.find_place(input="Space Needle", input_type="textquery")`
   - Place Details: `gmaps.place(place_id, fields=["name", "formatted_address", "rating"])`
   
   **Checkpoint:** Use `place_id` from search to get full details (separate charge).

5. **Distance Matrix** — Get distances for multiple origin-destination pairs:
   - `gmaps.distance_matrix(origins=["Seattle", "Portland"], destinations=["San Francisco", "Los Angeles"])`
   - Returns matrix of `duration` and `distance` for each pair
   - Useful for logistics, delivery time estimation
   
   **Checkpoint:** Results are in `rows[].elements[]` matching origins→destinations order.

6. **Handle Errors & Rate Limits** — Implement proper error handling:
   - `ApiError`: Generic API error (check status field)
   - `_OverQueryLimit`: Rate limit exceeded
   - `_ApiError` with `status="ZERO_RESULTS"`: No results found
   - Use exponential backoff for retryable errors
   
   **Checkpoint:** Rate limit handling includes jittered exponential backoff.

---

## Implementation Patterns

### Pattern 1: Google Maps Client Initialization (BAD vs GOOD)

```python
"""Google Maps Platform client initialization patterns.

Key concepts:
- googlemaps: Official Google Maps Python SDK (github.com/googlemaps/google-maps-services-python)
- API Key: From Google Cloud Console → Maps Platform → Credentials
- Enable APIs: Geocoding API, Directions API, Places API, Distance Matrix API, etc.
- Rate Limits: Standard tier ~50 QPS, varies by API
- Pricing: Pay-as-you-go, $200 free credit/month
- Caching: Google allows caching geocoding results for up to 30 days (check TOS)

Environment variables:
    GOOGLE_MAPS_API_KEY: Your Google Maps API key
    GOOGLE_MAPS_QUERY_RATE: Optional queries per second rate limit
"""

from __future__ import annotations

import os
import json
import time
import logging
from typing import Any, Optional, List, Dict, Tuple, TypeVar, Callable, Generator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from functools import wraps
from decimal import Decimal

logger = logging.getLogger(__name__)

# Try to import googlemaps
try:
    import googlemaps
    from googlemaps import exceptions as gmaps_exc
    GOOGLE_MAPS_AVAILABLE = True
except ImportError:
    GOOGLE_MAPS_AVAILABLE = False
    logger.warning("googlemaps not installed. Run: pip install googlemaps")


# ===================================================================
# ❌ BAD — hardcoded key, no error handling, no caching, client-side exposure
# ===================================================================

def bad_gmaps_init() -> Any:
    """❌ BAD: Don't do any of these things."""
    if not GOOGLE_MAPS_AVAILABLE:
        raise ImportError("googlemaps library required")
    
    # ❌ Hardcoded API key! Never commit this!
    # ❌ This would be visible in version control history
    gmaps = googlemaps.Client(key="AIzaSyDaGmWKa4JsXZ...")
    
    # ❌ No timeout configuration
    # ❌ No retry configuration
    # ❌ No error handling
    # ❌ No result caching (wastes API calls, money)
    # ❌ Using synchronous client in async context without consideration
    # ❌ Would expose key if used client-side (use HTTP referrer restrictions + proxy)
    
    return gmaps


# ===================================================================
# ✅ GOOD — env-based config, timeouts, retries, caching, error handling
# ===================================================================


class GoogleMapsError(Exception):
    """Base exception for Google Maps API errors."""
    
    def __init__(self, message: str, status: Optional[str] = None):
        super().__init__(message)
        self.status = status


class GoogleMapsAuthError(GoogleMapsError):
    """Authentication failed (invalid key, API not enabled, etc.)."""
    pass


class GoogleMapsRateLimitError(GoogleMapsError):
    """Rate limit exceeded (OVER_QUERY_LIMIT)."""
    
    def __init__(self, message: str, retry_after: Optional[float] = None):
        super().__init__(message)
        self.retry_after = retry_after


class GoogleMapsZeroResultsError(GoogleMapsError):
    """Query returned no results (ZERO_RESULTS)."""
    pass


class GoogleMapsInvalidRequestError(GoogleMapsError):
    """Invalid request parameters (INVALID_REQUEST)."""
    pass


# Map Google Maps status codes to our exceptions
GOOGLE_MAPS_STATUS_ERRORS = {
    "OVER_QUERY_LIMIT": GoogleMapsRateLimitError,
    "REQUEST_DENIED": GoogleMapsAuthError,
    "ZERO_RESULTS": GoogleMapsZeroResultsError,
    "INVALID_REQUEST": GoogleMapsInvalidRequestError,
    "UNKNOWN_ERROR": GoogleMapsError,
    "NOT_FOUND": GoogleMapsZeroResultsError,
    "MAX_ROUTE_LENGTH_EXCEEDED": GoogleMapsInvalidRequestError,
    "MAX_WAYPOINTS_EXCEEDED": GoogleMapsInvalidRequestError,
}


@dataclass
class GoogleMapsCacheEntry:
    """Cache entry for Google Maps API results."""
    
    result: Any
    cached_at: datetime
    ttl_seconds: int = 86400 * 30  # 30 days default (Google allows this for geocoding)
    
    def is_valid(self) -> bool:
        """Check if this cache entry is still valid."""
        now = datetime.now(timezone.utc)
        expires_at = self.cached_at + timedelta(seconds=self.ttl_seconds)
        return now < expires_at


@dataclass
class GoogleMapsConfig:
    """Google Maps configuration from environment variables.
    
    Environment variables:
        GOOGLE_MAPS_API_KEY: Required API key
        GOOGLE_MAPS_TIMEOUT: Optional timeout in seconds (default 30)
        GOOGLE_MAPS_RETRIES: Optional max retries (default 3)
        GOOGLE_MAPS_ENABLE_CACHE: Enable result caching (default true)
        GOOGLE_MAPS_CACHE_TTL_DAYS: Cache TTL in days (default 30)
    """
    
    # Required
    api_key: Optional[str] = None
    
    # Connection config
    timeout: float = 30.0
    connect_timeout: float = 10.0
    max_retries: int = 3
    queries_per_second: float = 10.0  # Conservative rate limit
    
    # Caching
    enable_cache: bool = True
    cache_ttl_days: int = 30  # Google allows 30 days for geocoding
    
    @classmethod
    def from_env(cls) -> "GoogleMapsConfig":
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
        
        def parse_bool(env_var: str, default: bool) -> bool:
            val = os.environ.get(env_var)
            if val is None:
                return default
            return val.lower() in ("1", "true", "yes", "on")
        
        return cls(
            api_key=os.environ.get("GOOGLE_MAPS_API_KEY"),
            timeout=parse_float("GOOGLE_MAPS_TIMEOUT", 30.0),
            max_retries=parse_int("GOOGLE_MAPS_RETRIES", 3),
            queries_per_second=parse_float("GOOGLE_MAPS_QUERY_RATE", 10.0),
            enable_cache=parse_bool("GOOGLE_MAPS_ENABLE_CACHE", True),
            cache_ttl_days=parse_int("GOOGLE_MAPS_CACHE_TTL_DAYS", 30),
        )
    
    def is_enabled(self) -> bool:
        """Check if Google Maps is configured."""
        return bool(self.api_key)
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Google Maps not configured (GOOGLE_MAPS_API_KEY not set)")
            return True
        
        if not self.api_key or not self.api_key.strip():
            raise ValueError("GOOGLE_MAPS_API_KEY is empty")
        
        # Basic key format check (Google keys start with "AIza")
        if not self.api_key.startswith("AIza"):
            logger.warning(
                "GOOGLE_MAPS_API_KEY doesn't start with 'AIza' — "
                "Google Maps API keys typically start with 'AIza'"
            )
        
        return True


class GoogleMapsClient:
    """Production-grade Google Maps client with caching, retries, and rate limiting.
    
    Features:
    - Config from environment
    - Exponential backoff for rate limits
    - Configurable result caching (respects Google TOS)
    - Rate limiting (QPS control)
    - Unified error handling with meaningful exceptions
    - Convenience methods with result parsing
    """
    
    # Common travel modes
    MODE_DRIVING = "driving"
    MODE_WALKING = "walking"
    MODE_BICYCLING = "bicycling"
    MODE_TRANSIT = "transit"
    
    # Common place types (partial list)
    PLACE_ACCOUNTING = "accounting"
    PLACE_AIRPORT = "airport"
    PLACE_AMUSEMENT_PARK = "amusement_park"
    PLACE_AQUARIUM = "aquarium"
    PLACE_ART_GALLERY = "art_gallery"
    PLACE_ATM = "atm"
    PLACE_BAKERY = "bakery"
    PLACE_BANK = "bank"
    PLACE_BAR = "bar"
    PLACE_BEAUTY_SALON = "beauty_salon"
    PLACE_BICYCLE_STORE = "bicycle_store"
    PLACE_BOOK_STORE = "book_store"
    PLACE_BOWLING_ALLEY = "bowling_alley"
    PLACE_BUS_STATION = "bus_station"
    PLACE_CAFE = "cafe"
    PLACE_CAMPGROUND = "campground"
    PLACE_CAR_DEALER = "car_dealer"
    PLACE_CAR_RENTAL = "car_rental"
    PLACE_CAR_REPAIR = "car_repair"
    PLACE_CAR_WASH = "car_wash"
    PLACE_CASINO = "casino"
    PLACE_CEMETERY = "cemetery"
    PLACE_CHURCH = "church"
    PLACE_CITY_HALL = "city_hall"
    PLACE_CLOTHING_STORE = "clothing_store"
    PLACE_CONVENIENCE_STORE = "convenience_store"
    PLACE_COURTHOUSE = "courthouse"
    PLACE_DENTIST = "dentist"
    PLACE_DEPARTMENT_STORE = "department_store"
    PLACE_DOCTOR = "doctor"
    PLACE_ELECTRICIAN = "electrician"
    PLACE_ELECTRONICS_STORE = "electronics_store"
    PLACE_EMBASSY = "embassy"
    PLACE_FIRE_STATION = "fire_station"
    PLACE_FLORIST = "florist"
    PLACE_FUNERAL_HOME = "funeral_home"
    PLACE_FURNITURE_STORE = "furniture_store"
    PLACE_GAS_STATION = "gas_station"
    PLACE_GYM = "gym"
    PLACE_HAIR_CARE = "hair_care"
    PLACE_HARDWARE_STORE = "hardware_store"
    PLACE_HINDU_TEMPLE = "hindu_temple"
    PLACE_HOME_GOODS_STORE = "home_goods_store"
    PLACE_HOSPITAL = "hospital"
    PLACE_INSURANCE_AGENCY = "insurance_agency"
    PLACE_JEWELRY_STORE = "jewelry_store"
    PLACE_LAUNDRY = "laundry"
    PLACE_LAWYER = "lawyer"
    PLACE_LIBRARY = "library"
    PLACE_LIQUOR_STORE = "liquor_store"
    PLACE_LOCAL_GOVERNMENT_OFFICE = "local_government_office"
    PLACE_LOCKSMITH = "locksmith"
    PLACE_LODGING = "lodging"
    PLACE_MEAL_DELIVERY = "meal_delivery"
    PLACE_MEAL_TAKEAWAY = "meal_takeaway"
    PLACE_MOSQUE = "mosque"
    PLACE_MOVIE_RENTAL = "movie_rental"
    PLACE_MOVIE_THEATER = "movie_theater"
    PLACE_MOVING_COMPANY = "moving_company"
    PLACE_MUSEUM = "museum"
    PLACE_NIGHT_CLUB = "night_club"
    PLACE_PAINTER = "painter"
    PLACE_PARK = "park"
    PLACE_PARKING = "parking"
    PLACE_PET_STORE = "pet_store"
    PLACE_PHARMACY = "pharmacy"
    PLACE_PHYSIOTHERAPIST = "physiotherapist"
    PLACE_PLUMBER = "plumber"
    PLACE_POLICE = "police"
    PLACE_POST_OFFICE = "post_office"
    PLACE_REAL_ESTATE_AGENCY = "real_estate_agency"
    PLACE_RESTAURANT = "restaurant"
    PLACE_ROOFING_CONTRACTOR = "roofing_contractor"
    PLACE_RV_PARK = "rv_park"
    PLACE_SCHOOL = "school"
    PLACE_SHOE_STORE = "shoe_store"
    PLACE_SHOPPING_MALL = "shopping_mall"
    PLACE_SPA = "spa"
    PLACE_STADIUM = "stadium"
    PLACE_STORAGE = "storage"
    PLACE_STORE = "store"
    PLACE_SUBWAY_STATION = "subway_station"
    PLACE_SUPERMARKET = "supermarket"
    PLACE_SYNAGOGUE = "synagogue"
    PLACE_TAXI_STAND = "taxi_stand"
    PLACE_TRAIN_STATION = "train_station"
    PLACE_TRAVEL_AGENCY = "travel_agency"
    PLACE_UNIVERSITY = "university"
    PLACE_VETERINARY_CARE = "veterinary_care"
    PLACE_ZOO = "zoo"
    
    # Avoid parameters
    AVOID_TOLLS = "tolls"
    AVOID_HIGHWAYS = "highways"
    AVOID_FERRIES = "ferries"
    AVOID_INDOOR = "indoor"
    
    # Transit modes
    TRANSIT_MODE_BUS = "bus"
    TRANSIT_MODE_SUBWAY = "subway"
    TRANSIT_MODE_TRAIN = "train"
    TRANSIT_MODE_TRAM = "tram"
    TRANSIT_MODE_RAIL = "rail"
    
    # Traffic models
    TRAFFIC_MODEL_BEST_GUESS = "best_guess"
    TRAFFIC_MODEL_OPTIMISTIC = "optimistic"
    TRAFFIC_MODEL_PESSIMISTIC = "pessimistic"
    
    def __init__(self, config: GoogleMapsConfig):
        self._config = config
        self._client: Optional[googlemaps.Client] = None
        self._cache: Dict[str, GoogleMapsCacheEntry] = {}  # Simple in-memory cache
        self._last_request_time: float = 0.0
        self._min_request_interval: float = 1.0 / config.queries_per_second
    
    def _get_client(self) -> googlemaps.Client:
        """Get or create the Google Maps client.
        
        Lazy-loaded.
        """
        if not GOOGLE_MAPS_AVAILABLE:
            raise ImportError(
                "googlemaps not installed. Run: pip install googlemaps"
            )
        
        self._config.validate()
        
        if self._client is None:
            self._client = googlemaps.Client(
                key=self._config.api_key,
                timeout=self._config.timeout,
                connect_timeout=self._config.connect_timeout,
                retry_over_query_limit=True,  # Basic retry in SDK
            )
            logger.info("Google Maps client initialized")
        
        return self._client
    
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
    
    def _get_cache_key(self, method: str, args: tuple, kwargs: dict) -> str:
        """Generate a cache key for an API call.
        
        Simple but effective: combine method name with normalized args.
        """
        import hashlib
        
        # Normalize args for consistent caching
        key_parts = [method]
        
        for arg in args:
            if isinstance(arg, (list, tuple)):
                # Normalize coordinate tuples
                if len(arg) == 2 and all(isinstance(x, (int, float, str)) for x in arg):
                    # Coordinates: normalize to (lat, lng) strings with 6 decimals
                    try:
                        lat, lng = float(arg[0]), float(arg[1])
                        key_parts.append(f"({lat:.6f},{lng:.6f})")
                        continue
                    except (ValueError, TypeError):
                        pass
            key_parts.append(str(arg))
        
        # Include relevant kwargs
        cacheable_kwargs = {}
        for key, value in kwargs.items():
            if key in ("mode", "language", "region", "components", "avoid", 
                      "units", "departure_time", "arrival_time",
                      "traffic_model", "transit_mode", "transit_routing_preference",
                      "radius", "type", "keyword", "rankby"):
                cacheable_kwargs[key] = value
        
        if cacheable_kwargs:
            key_parts.append(str(sorted(cacheable_kwargs.items())))
        
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get a result from cache if available and valid."""
        if not self._config.enable_cache:
            return None
        
        entry = self._cache.get(cache_key)
        
        if entry and entry.is_valid():
            logger.debug("Cache hit for key: %s...", cache_key[:16])
            return entry.result
        
        if entry:
            # Expired, remove
            del self._cache[cache_key]
        
        return None
    
    def _store_in_cache(self, cache_key: str, result: Any) -> None:
        """Store a result in cache."""
        if not self._config.enable_cache:
            return
        
        entry = GoogleMapsCacheEntry(
            result=result,
            cached_at=datetime.now(timezone.utc),
            ttl_seconds=self._config.cache_ttl_days * 86400,
        )
        
        self._cache[cache_key] = entry
        logger.debug("Cached result for key: %s...", cache_key[:16])
    
    def _execute_with_retry(
        self,
        operation: Callable[[], Any],
        method_name: str,
        cache_key: Optional[str] = None,
        cacheable: bool = True,
    ) -> Any:
        """Execute a Google Maps API operation with caching, retries, and rate limits.
        
        Args:
            operation: Callable that makes the API call
            method_name: Name for logging
            cache_key: Cache key (if None, no caching for this call)
            cacheable: Whether this result can be cached
            
        Returns:
            API response (parsed)
            
        Raises:
            GoogleMapsError: Various error types based on response
        """
        import random
        
        # Check cache first if applicable
        if cacheable and cache_key:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached
        
        # Rate limit before making request
        self._rate_limit_wait()
        
        delay = 1.0
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                # Get client each time (handles lazy init)
                client = self._get_client()
                
                # Execute the operation
                result = operation()
                
                # The googlemaps SDK returns parsed JSON directly
                # It raises exceptions for error statuses
                
                # Cache if cacheable
                if cacheable and cache_key:
                    self._store_in_cache(cache_key, result)
                
                return result
                
            except gmaps_exc._OverQueryLimit as e:
                last_exception = e
                
                wait_time = min(
                    delay * (2 ** attempt) + random.uniform(0, 0.5),
                    60.0
                )
                
                logger.warning(
                    "Google Maps rate limited on %s (attempt %d/%d). Waiting %.1fs",
                    method_name, attempt + 1, self._config.max_retries, wait_time
                )
                
                time.sleep(wait_time)
                continue
            
            except gmaps_exc.ApiError as e:
                # Extract status if available
                status = getattr(e, "status", None)
                message = str(e)
                
                # Map to our exception types
                error_class = GOOGLE_MAPS_STATUS_ERRORS.get(status, GoogleMapsError)
                
                # Some cases are retryable
                if status == "UNKNOWN_ERROR" and attempt < self._config.max_retries - 1:
                    last_exception = e
                    wait_time = min(delay * (2 ** attempt), 30.0)
                    logger.warning(
                        "Google Maps UNKNOWN_ERROR on %s (attempt %d/%d). Retrying in %.1fs",
                        method_name, attempt + 1, self._config.max_retries, wait_time
                    )
                    time.sleep(wait_time)
                    continue
                
                raise error_class(message, status=status) from e
            
            except Exception as e:
                # Non-API exceptions (network, timeout, etc.)
                last_exception = e
                
                if attempt < self._config.max_retries - 1:
                    wait_time = min(delay * (2 ** attempt), 30.0)
                    logger.warning(
                        "Request error on %s (attempt %d/%d): %s. Retrying in %.1fs",
                        method_name, attempt + 1, self._config.max_retries, e, wait_time
                    )
                    time.sleep(wait_time)
                    continue
                
                raise GoogleMapsError(f"Google Maps operation failed: {e}") from e
        
        # All retries exhausted
        raise GoogleMapsRateLimitError(
            f"Rate limit retries exhausted after {self._config.max_retries} attempts"
        ) from last_exception
    
    # ===================================================================
    # Geocoding
    # ===================================================================
    
    def geocode(
        self,
        address: str,
        components: Optional[Dict[str, str]] = None,
        bounds: Optional[Tuple[Tuple[float, float], Tuple[float, float]]] = None,
        region: Optional[str] = None,
        language: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Geocode an address to coordinates.
        
        Converts a human-readable address to geographic coordinates
        (latitude/longitude) and complete address components.
        
        Args:
            address: Address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
            components: Component filtering (e.g., {"country": "US", "locality": "Seattle"})
            bounds: Optional viewport bias ((southwest_lat, southwest_lng), (northeast_lat, northeast_lng))
            region: Region code (e.g., "us", "uk") for biasing
            language: Language code for results (e.g., "en", "es", "fr")
            
        Returns:
            List of geocoding results (usually 1 for specific addresses)
            Each result has: formatted_address, geometry.location (lat/lng),
            address_components, place_id, types, etc.
            
        Raises:
            GoogleMapsZeroResultsError: If no results found
        """
        kwargs: Dict[str, Any] = {}
        if components:
            kwargs["components"] = components
        if bounds:
            kwargs["bounds"] = bounds
        if region:
            kwargs["region"] = region
        if language:
            kwargs["language"] = language
        
        def _op():
            return self._get_client().geocode(address, **kwargs)
        
        cache_key = self._get_cache_key("geocode", (address,), kwargs)
        
        return self._execute_with_retry(_op, f"geocode({address[:50]})", cache_key=cache_key)
    
    def geocode_first(
        self,
        address: str,
        components: Optional[Dict[str, str]] = None,
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Geocode and return only the first result, or None.
        
        Convenience method for when you expect exactly one match.
        
        Args:
            address: Address to geocode
            components: Component filtering
            **kwargs: Additional geocode parameters
            
        Returns:
            First result dict, or None if no results
        """
        try:
            results = self.geocode(address, components=components, **kwargs)
            return results[0] if results else None
        except GoogleMapsZeroResultsError:
            return None
    
    def geocode_to_coords(
        self,
        address: str,
        components: Optional[Dict[str, str]] = None,
        **kwargs: Any,
    ) -> Optional[Tuple[float, float]]:
        """Geocode address and return only (latitude, longitude) tuple.
        
        Args:
            address: Address to geocode
            components: Component filtering
            **kwargs: Additional parameters
            
        Returns:
            (lat, lng) tuple, or None if not found
        """
        result = self.geocode_first(address, components=components, **kwargs)
        
        if not result:
            return None
        
        geometry = result.get("geometry", {})
        location = geometry.get("location", {})
        
        lat = location.get("lat")
        lng = location.get("lng")
        
        if lat is not None and lng is not None:
            return (float(lat), float(lng))
        
        return None
    
    def reverse_geocode(
        self,
        location: Tuple[float, float],
        result_type: Optional[List[str]] = None,
        location_type: Optional[List[str]] = None,
        language: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Reverse geocode coordinates to address.
        
        Converts latitude/longitude to human-readable addresses.
        
        Args:
            location: (latitude, longitude) tuple
            result_type: Filter by result types (e.g., ["street_address", "premise"])
            location_type: Filter by location type (["rooftop", "approximate"])
            language: Language code for results
            
        Returns:
            List of address results (most relevant first)
        """
        kwargs: Dict[str, Any] = {}
        if result_type:
            kwargs["result_type"] = result_type
        if location_type:
            kwargs["location_type"] = location_type
        if language:
            kwargs["language"] = language
        
        def _op():
            return self._get_client().reverse_geocode(location, **kwargs)
        
        cache_key = self._get_cache_key("reverse_geocode", (location,), kwargs)
        
        return self._execute_with_retry(_op, f"reverse_geocode({location})", cache_key=cache_key)
    
    def reverse_geocode_first(
        self,
        location: Tuple[float, float],
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Reverse geocode and return first result.
        
        Args:
            location: (lat, lng) tuple
            **kwargs: Additional parameters
            
        Returns:
            First result, or None
        """
        try:
            results = self.reverse_geocode(location, **kwargs)
            return results[0] if results else None
        except GoogleMapsZeroResultsError:
            return None
    
    def reverse_geocode_to_address(
        self,
        location: Tuple[float, float],
        **kwargs: Any,
    ) -> Optional[str]:
        """Reverse geocode and return formatted address string.
        
        Args:
            location: (lat, lng) tuple
            **kwargs: Additional parameters
            
        Returns:
            Formatted address string, or None
        """
        result = self.reverse_geocode_first(location, **kwargs)
        
        if result:
            return result.get("formatted_address")
        
        return None
    
    # ===================================================================
    # Address Components Extraction
    # ===================================================================
    
    @staticmethod
    def extract_address_components(
        geocode_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract structured address components from a geocode result.
        
        Converts the address_components list into a key-value dict
        with common fields like street_number, route, locality, etc.
        
        Args:
            geocode_result: Single result from geocode() or reverse_geocode()
            
        Returns:
            Dict with keys like: street_number, route, locality (city),
            administrative_area_level_1 (state), postal_code, country, etc.
        """
        components = geocode_result.get("address_components", [])
        result: Dict[str, Any] = {}
        
        # Map Google's types to common field names
        type_mapping = {
            "street_number": "street_number",
            "route": "street",
            "locality": "city",
            "administrative_area_level_1": "state",
            "administrative_area_level_2": "county",
            "postal_code": "postal_code",
            "postal_code_suffix": "postal_code_suffix",
            "country": "country",
            "sublocality": "sublocality",
            "neighborhood": "neighborhood",
            "premise": "premise",
            "subpremise": "subpremise",
            "floor": "floor",
            "room": "room",
        }
        
        for comp in components:
            types = comp.get("types", [])
            long_name = comp.get("long_name")
            short_name = comp.get("short_name")
            
            for google_type, field_name in type_mapping.items():
                if google_type in types:
                    result[field_name] = long_name
                    result[f"{field_name}_short"] = short_name
                    break
        
        # Also add formatted and geometry
        result["formatted_address"] = geocode_result.get("formatted_address")
        result["place_id"] = geocode_result.get("place_id")
        
        geometry = geocode_result.get("geometry", {})
        location = geometry.get("location", {})
        if location:
            result["latitude"] = location.get("lat")
            result["longitude"] = location.get("lng")
        
        # Also extract viewport if present
        viewport = geometry.get("viewport", {})
        if viewport:
            northeast = viewport.get("northeast", {})
            southwest = viewport.get("southwest", {})
            result["viewport"] = {
                "northeast": {"lat": northeast.get("lat"), "lng": northeast.get("lng")},
                "southwest": {"lat": southwest.get("lat"), "lng": southwest.get("lng")},
            }
        
        return result
    
    # ===================================================================
    # Directions
    # ===================================================================
    
    def directions(
        self,
        origin: str | Tuple[float, float],
        destination: str | Tuple[float, float],
        mode: str = "driving",
        waypoints: Optional[List[str | Tuple[float, float]]] = None,
        alternatives: bool = False,
        avoid: Optional[List[str]] = None,
        language: Optional[str] = None,
        units: Optional[str] = None,
        region: Optional[str] = None,
        departure_time: Optional[int | datetime] = None,
        arrival_time: Optional[int | datetime] = None,
        optimize_waypoints: bool = False,
        traffic_model: Optional[str] = None,
        transit_mode: Optional[List[str]] = None,
        transit_routing_preference: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get directions from origin to destination.
        
        Calculates directions and distance/duration for routes.
        
        Args:
            origin: Start address or (lat, lng) tuple
            destination: End address or (lat, lng) tuple
            mode: Travel mode: 'driving', 'walking', 'bicycling', 'transit'
            waypoints: List of intermediate waypoints
            alternatives: Return multiple alternative routes
            avoid: Features to avoid: ['tolls', 'highways', 'ferries', 'indoor']
            language: Language code for instructions
            units: 'metric' or 'imperial'
            region: Region code for biasing
            departure_time: Departure time (for traffic-based duration)
            arrival_time: Arrival time (for transit)
            optimize_waypoints: Let Google optimize waypoint order
            traffic_model: Traffic model: 'best_guess', 'optimistic', 'pessimistic'
            transit_mode: Transit modes: ['bus', 'subway', 'train', 'tram', 'rail']
            transit_routing_preference: 'less_walking' or 'fewer_transfers'
            
        Returns:
            List of route dicts with legs, steps, distance, duration
        """
        kwargs: Dict[str, Any] = {}
        if waypoints:
            kwargs["waypoints"] = waypoints
        if alternatives:
            kwargs["alternatives"] = alternatives
        if avoid:
            kwargs["avoid"] = avoid
        if language:
            kwargs["language"] = language
        if units:
            kwargs["units"] = units
        if region:
            kwargs["region"] = region
        if departure_time:
            if isinstance(departure_time, datetime):
                kwargs["departure_time"] = int(departure_time.timestamp())
            else:
                kwargs["departure_time"] = departure_time
        if arrival_time:
            if isinstance(arrival_time, datetime):
                kwargs["arrival_time"] = int(arrival_time.timestamp())
            else:
                kwargs["arrival_time"] = arrival_time
        if optimize_waypoints:
            kwargs["optimize_waypoints"] = optimize_waypoints
        if traffic_model:
            kwargs["traffic_model"] = traffic_model
        if transit_mode:
            kwargs["transit_mode"] = transit_mode
        if transit_routing_preference:
            kwargs["transit_routing_preference"] = transit_routing_preference
        
        # Build cache key from essential params
        cache_kwargs = {k: v for k, v in kwargs.items() 
                        if k not in ("departure_time", "arrival_time")}
        
        def _op():
            return self._get_client().directions(
                origin,
                destination,
                mode=mode,
                **kwargs
            )
        
        cache_key = self._get_cache_key(
            f"directions_{mode}", 
            (str(origin), str(destination)),
            cache_kwargs
        )
        
        # Directions are less cacheable due to traffic, but allow if explicitly cached
        return self._execute_with_retry(
            _op,
            f"directions({mode})",
            cache_key=cache_key,
            cacheable=self._config.enable_cache and departure_time is None
        )
    
    def get_directions_summary(
        self,
        origin: str | Tuple[float, float],
        destination: str | Tuple[float, float],
        mode: str = "driving",
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """Get simplified directions summary (distance, duration).
        
        Convenience method for when you only need the aggregate numbers,
        not the detailed turn-by-turn steps.
        
        Args:
            origin: Start
            destination: End
            mode: Travel mode
            **kwargs: Additional directions params
            
        Returns:
            Dict with: distance_meters, distance_text,
            duration_seconds, duration_text,
            duration_in_traffic_seconds (if departure_time set)
        """
        routes = self.directions(origin, destination, mode=mode, **kwargs)
        
        if not routes:
            return None
        
        # Use first route
        route = routes[0]
        legs = route.get("legs", [])
        
        if not legs:
            return None
        
        # Sum all legs (for multi-waypoint routes)
        total_distance_meters = 0
        total_duration_seconds = 0
        total_duration_traffic_seconds: Optional[int] = None
        
        for leg in legs:
            distance = leg.get("distance", {})
            total_distance_meters += distance.get("value", 0)
            
            duration = leg.get("duration", {})
            total_duration_seconds += duration.get("value", 0)
            
            # Duration in traffic (only when departure_time set)
            duration_traffic = leg.get("duration_in_traffic")
            if duration_traffic:
                if total_duration_traffic_seconds is None:
                    total_duration_traffic_seconds = 0
                total_duration_traffic_seconds += duration_traffic.get("value", 0)
        
        # Use first leg for human-readable text (or build our own)
        first_leg = legs[0]
        
        result: Dict[str, Any] = {
            "distance_meters": total_distance_meters,
            "distance_km": round(total_distance_meters / 1000.0, 2),
            "distance_miles": round(total_distance_meters / 1609.34, 2),
            "duration_seconds": total_duration_seconds,
            "duration_minutes": round(total_duration_seconds / 60.0, 1),
            "duration_hours": round(total_duration_seconds / 3600.0, 2),
            "distance_text": first_leg.get("distance", {}).get("text", ""),
            "duration_text": first_leg.get("duration", {}).get("text", ""),
        }
        
        if total_duration_traffic_seconds is not None:
            result["duration_in_traffic_seconds"] = total_duration_traffic_seconds
            result["duration_in_traffic_minutes"] = round(total_duration_traffic_seconds / 60.0, 1)
            result["duration_in_traffic_hours"] = round(total_duration_traffic_seconds / 3600.0, 2)
            
            # Traffic delay
            delay_seconds = total_duration_traffic_seconds - total_duration_seconds
            result["traffic_delay_seconds"] = delay_seconds
            result["traffic_delay_minutes"] = round(delay_seconds / 60.0, 1)
        
        # Summary string
        if total_duration_traffic_seconds:
            result["summary"] = (
                f"{result['distance_text']} ({result['distance_km']:.1f} km / {result['distance_miles']:.1f} mi), "
                f"{result['duration_in_traffic_minutes']:.0f} min with traffic "
                f"(vs {result['duration_minutes']:.0f} min typical)"
            )
        else:
            result["summary"] = (
                f"{result['distance_text']} ({result['distance_km']:.1f} km / {result['distance_miles']:.1f} mi), "
                f"{result['duration_minutes']:.0f} min"
            )
        
        return result
    
    # ===================================================================
    # Distance Matrix
    # ===================================================================
    
    def distance_matrix(
        self,
        origins: List[str | Tuple[float, float]],
        destinations: List[str | Tuple[float, float]],
        mode: str = "driving",
        language: Optional[str] = None,
        avoid: Optional[List[str]] = None,
        units: Optional[str] = None,
        departure_time: Optional[int | datetime] = None,
        arrival_time: Optional[int | datetime] = None,
        traffic_model: Optional[str] = None,
        transit_mode: Optional[List[str]] = None,
        transit_routing_preference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get travel distance/duration for multiple origin-destination pairs.
        
        More efficient than calling directions() for each pair when you have
        multiple origins or destinations.
        
        Args:
            origins: List of origin addresses or coordinates
            destinations: List of destination addresses or coordinates
            mode: Travel mode
            language: Language code
            avoid: Features to avoid
            units: 'metric' or 'imperial'
            departure_time: For traffic estimation
            arrival_time: For transit
            traffic_model: Traffic model
            transit_mode: Transit modes
            transit_routing_preference: Transit preference
            
        Returns:
            Dict with:
            - origin_addresses: List of resolved origin addresses
            - destination_addresses: List of resolved destination addresses
            - rows: List per origin, each with 'elements' per destination
              Each element has: status, distance (value+text), duration (value+text)
        """
        kwargs: Dict[str, Any] = {}
        if language:
            kwargs["language"] = language
        if avoid:
            kwargs["avoid"] = avoid
        if units:
            kwargs["units"] = units
        if departure_time:
            if isinstance(departure_time, datetime):
                kwargs["departure_time"] = int(departure_time.timestamp())
            else:
                kwargs["departure_time"] = departure_time
        if arrival_time:
            if isinstance(arrival_time, datetime):
                kwargs["arrival_time"] = int(arrival_time.timestamp())
            else:
                kwargs["arrival_time"] = arrival_time
        if traffic_model:
            kwargs["traffic_model"] = traffic_model
        if transit_mode:
            kwargs["transit_mode"] = transit_mode
        if transit_routing_preference:
            kwargs["transit_routing_preference"] = transit_routing_preference
        
        def _op():
            return self._get_client().distance_matrix(
                origins,
                destinations,
                mode=mode,
                **kwargs
            )
        
        # Distance matrix is often time-sensitive, less cacheable
        return self._execute_with_retry(
            _op,
            f"distance_matrix({mode})",
            cacheable=False
        )
    
    # ===================================================================
    # Places
    # ===================================================================
    
    def places_nearby(
        self,
        location: Tuple[float, float],
        radius: Optional[int] = None,  # meters
        keyword: Optional[str] = None,
        language: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        name: Optional[str] = None,
        open_now: bool = False,
        rank_by: Optional[str] = None,  # 'prominence' or 'distance'
        place_type: Optional[str] = None,
        page_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Search for places near a location.
        
        Find businesses, restaurants, landmarks, etc. near coordinates.
        
        Important: Either radius OR rank_by='distance' is required.
        You cannot use both radius and rank_by='distance'.
        
        Args:
            location: (lat, lng) center point
            radius: Search radius in meters (max 50000 = 50km)
            keyword: Term to match (e.g., "restaurant", "coffee")
            language: Language code
            min_price: Minimum price level (0-4)
            max_price: Maximum price level (0-4)
            name: Name to match
            open_now: Only return places open now
            rank_by: 'prominence' (default) or 'distance'
            place_type: Restrict to a type (e.g., "restaurant", "gas_station")
            page_token: For pagination (from next_page_token in previous response)
            
        Returns:
            Dict with 'results', 'next_page_token', 'html_attributions'
        """
        kwargs: Dict[str, Any] = {}
        
        if page_token:
            # When using page_token, other params are ignored except key
            kwargs["page_token"] = page_token
        else:
            if radius:
                kwargs["radius"] = radius
            if keyword:
                kwargs["keyword"] = keyword
            if language:
                kwargs["language"] = language
            if min_price is not None:
                kwargs["min_price"] = min_price
            if max_price is not None:
                kwargs["max_price"] = max_price
            if name:
                kwargs["name"] = name
            if open_now:
                kwargs["open_now"] = open_now
            if rank_by:
                kwargs["rank_by"] = rank_by
            if place_type:
                kwargs["type"] = place_type
        
        def _op():
            return self._get_client().places_nearby(location, **kwargs)
        
        # Places search is not typically cached
        return self._execute_with_retry(
            _op,
            f"places_nearby({keyword or place_type or 'all'})",
            cacheable=False
        )
    
    def places(
        self,
        query: str,
        location: Optional[Tuple[float, float]] = None,
        radius: Optional[int] = None,
        language: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        open_now: bool = False,
        place_type: Optional[str] = None,
        region: Optional[str] = None,
        page_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Text-based place search.
        
        Search for places using a text query (e.g., "restaurants in Seattle").
        
        Args:
            query: Text search query
            location: Optional (lat, lng) for biasing
            radius: Optional radius for location biasing
            language: Language code
            min_price: Min price level
            max_price: Max price level
            open_now: Only open places
            place_type: Restrict to type
            region: Region code
            page_token: Pagination token
            
        Returns:
            Dict with 'results', 'next_page_token', 'html_attributions'
        """
        kwargs: Dict[str, Any] = {}
        
        if page_token:
            kwargs["page_token"] = page_token
        else:
            if location:
                kwargs["location"] = location
            if radius:
                kwargs["radius"] = radius
            if language:
                kwargs["language"] = language
            if min_price is not None:
                kwargs["min_price"] = min_price
            if max_price is not None:
                kwargs["max_price"] = max_price
            if open_now:
                kwargs["open_now"] = open_now
            if place_type:
                kwargs["type"] = place_type
            if region:
                kwargs["region"] = region
        
        def _op():
            return self._get_client().places(query, **kwargs)
        
        return self._execute_with_retry(
            _op,
            f"places({query[:30]})",
            cacheable=False
        )
    
    def find_place(
        self,
        input_text: str,
        input_type: str = "textquery",
        fields: Optional[List[str]] = None,
        location_bias: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Find a place by name or phone number.
        
        Most efficient for looking up a specific place when you know
        the name or phone number.
        
        Args:
            input_text: Search text (name, address, or phone)
            input_type: 'textquery' or 'phonenumber'
            fields: List of fields to return (e.g., ['name', 'formatted_address'])
            location_bias: Bias results: 'ipbias', 'point:lat,lng', 
                           'circle:radius@lat,lng', 'rect:southwest_lat,southwest_lng|northeast_lat,northeast_lng'
            language: Language code
            
        Returns:
            Dict with 'candidates', 'status'
        """
        # Default fields if not specified
        if fields is None:
            fields = ["name", "formatted_address", "place_id", "geometry", "rating"]
        
        kwargs: Dict[str, Any] = {}
        if location_bias:
            kwargs["location_bias"] = location_bias
        if language:
            kwargs["language"] = language
        
        def _op():
            return self._get_client().find_place(
                input_text,
                input_type,
                fields=fields,
                **kwargs
            )
        
        return self._execute_with_retry(
            _op,
            f"find_place({input_text[:30]})",
            cacheable=False
        )
    
    def place(
        self,
        place_id: str,
        fields: Optional[List[str]] = None,
        language: Optional[str] = None,
        reviews_no_translations: bool = False,
        reviews_sort: Optional[str] = None,
        session_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get detailed information about a specific place.
        
        Uses the Places API (Place Details).
        
        Important: This call is billed by the fields you request.
        Only request the fields you actually need.
        
        Common fields (not exhaustive):
        - address_component, adr_address, business_status,
        - curbside_pickup, current_opening_hours, delivery, dine_in,
        - editorial_summary, formatted_address, formatted_phone_number,
        - geometry, icon, icon_background_color, icon_mask_base_uri,
        - international_phone_number, name, opening_hours,
        - permanently_closed, photos, place_id, plus_code,
        - price_level, rating, reference, reviews,
        - secondary_opening_hours, types, url,
        - user_ratings_total, utc_offset, vicinity,
        - website, wheelchair_accessible_entrance
        
        Args:
            place_id: Place ID from search results
            fields: List of fields to return
            language: Language code
            reviews_no_translations: If True, don't translate reviews
            reviews_sort: 'most_relevant' or 'newest'
            session_token: Session token for Place Autocomplete + Details flow
            
        Returns:
            Dict with 'result' (place details), 'html_attributions'
        """
        # Default fields
        if fields is None:
            fields = [
                "name", "formatted_address", "formatted_phone_number",
                "geometry", "rating", "user_ratings_total",
                "price_level", "types", "website", "url",
                "vicinity", "opening_hours",
            ]
        
        kwargs: Dict[str, Any] = {}
        if language:
            kwargs["language"] = language
        if reviews_no_translations:
            kwargs["reviews_no_translations"] = reviews_no_translations
        if reviews_sort:
            kwargs["reviews_sort"] = reviews_sort
        if session_token:
            kwargs["session_token"] = session_token
        
        def _op():
            return self._get_client().place(
                place_id,
                fields=fields,
                **kwargs
            )
        
        return self._execute_with_retry(
            _op,
            f"place_details({place_id[:16]}...)",
            cacheable=True,
            cache_key=f"place_{place_id}_{','.join(sorted(fields))}"
        )
    
    # ===================================================================
    # Time Zone
    # ===================================================================
    
    def timezone(
        self,
        location: Tuple[float, float],
        timestamp: Optional[int | datetime] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get the time zone for a location.
        
        Args:
            location: (lat, lng) tuple
            timestamp: Time for DST calculation (default: now)
            language: Language code
            
        Returns:
            Dict with:
            - dstOffset: DST offset in seconds
            - rawOffset: Standard offset in seconds
            - status: Status code
            - timeZoneId: Time zone ID (e.g., "America/Los_Angeles")
            - timeZoneName: Human-readable name
        """
        if timestamp is None:
            timestamp = int(datetime.now(timezone.utc).timestamp())
        elif isinstance(timestamp, datetime):
            timestamp = int(timestamp.timestamp())
        
        kwargs: Dict[str, Any] = {}
        if language:
            kwargs["language"] = language
        
        def _op():
            return self._get_client().timezone(location, timestamp, **kwargs)
        
        cache_key = self._get_cache_key("timezone", (location,), {"ts": timestamp // 86400})  # Cache by day
        
        return self._execute_with_retry(_op, f"timezone({location})", cache_key=cache_key)
    
    # ===================================================================
    # Elevation
    # ===================================================================
    
    def elevation(
        self,
        locations: List[Tuple[float, float]] | Tuple[float, float],
    ) -> List[Dict[str, Any]]:
        """Get elevation for one or more locations.
        
        Args:
            locations: Single (lat, lng) tuple or list of tuples
            
        Returns:
            List of elevation results:
            - elevation: Elevation in meters
            - location: Dict with 'lat', 'lng'
            - resolution: Approximate error in meters
        """
        # Normalize to list
        if isinstance(locations, tuple) and len(locations) == 2:
            locations = [locations]
        
        def _op():
            return self._get_client().elevation(locations)
        
        cache_key = self._get_cache_key("elevation", (str(locations),), {})
        
        return self._execute_with_retry(_op, f"elevation({len(locations)} pts)", cache_key=cache_key)
    
    def elevation_along_path(
        self,
        path: List[Tuple[float, float]] | str,
        samples: int,
    ) -> List[Dict[str, Any]]:
        """Get elevation along a path at regular intervals.
        
        Useful for calculating elevation profile of a route.
        
        Args:
            path: List of (lat, lng) waypoints, or encoded polyline string
            samples: Number of sample points along path
            
        Returns:
            List of elevation results along the path
        """
        def _op():
            return self._get_client().elevation_along_path(path, samples)
        
        return self._execute_with_retry(
            _op,
            f"elevation_along_path({samples} samples)",
            cacheable=True,
            cache_key=f"elevation_path_{hash(str(path))}_{samples}"
        )
    
    # ===================================================================
    # Static Maps
    # ===================================================================
    
    def static_map_url(
        self,
        center: str | Tuple[float, float],
        zoom: int,
        size: Tuple[int, int] = (600, 400),
        scale: Optional[int] = None,
        format: Optional[str] = None,
        maptype: Optional[str] = None,
        language: Optional[str] = None,
        region: Optional[str] = None,
        markers: Optional[List[Dict[str, Any]]] = None,
        path: Optional[Dict[str, Any]] = None,
        visible: Optional[List[str | Tuple[float, float]]] = None,
        style: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generate a Google Static Maps URL.
        
        Creates a URL that returns a static map image.
        No SDK call needed - just URL construction.
        
        Args:
            center: Center address or (lat, lng)
            zoom: Zoom level (0-21+)
            size: Image (width, height) in pixels (max 640x640)
            scale: 1 or 2 (for high-DPI displays)
            format: 'png', 'png8', 'png32', 'gif', 'jpg', 'jpg-baseline'
            maptype: 'roadmap', 'satellite', 'terrain', 'hybrid'
            language: Language code
            region: Region code
            markers: List of marker definitions
            path: Path definition
            visible: Locations to ensure visibility
            style: Map styling
            
        Returns:
            URL string for the static map image
        """
        if not self._config.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY required for static maps")
        
        # Build base URL
        params: List[str] = []
        
        # Center/zoom or visible
        if visible:
            visible_strs = []
            for v in visible:
                if isinstance(v, tuple):
                    visible_strs.append(f"{v[0]},{v[1]}")
                else:
                    visible_strs.append(str(v))
            params.append(f"visible={'|'.join(visible_strs)}")
        else:
            # Center
            if isinstance(center, tuple):
                center_str = f"{center[0]},{center[1]}"
            else:
                center_str = str(center)
            params.append(f"center={center_str}")
            params.append(f"zoom={zoom}")
        
        # Size
        params.append(f"size={size[0]}x{size[1]}")
        
        # Optional params
        if scale:
            params.append(f"scale={scale}")
        if format:
            params.append(f"format={format}")
        if maptype:
            params.append(f"maptype={maptype}")
        if language:
            params.append(f"language={language}")
        if region:
            params.append(f"region={region}")
        
        # Markers
        if markers:
            for marker in markers:
                parts = []
                if "color" in marker:
                    parts.append(f"color:{marker['color']}")
                if "label" in marker:
                    parts.append(f"label:{marker['label']}")
                if "size" in marker:
                    parts.append(f"size:{marker['size']}")
                if "icon" in marker:
                    parts.append(f"icon:{marker['icon']}")
                
                # Add locations
                locations = marker.get("locations", [])
                loc_strs = []
                for loc in locations:
                    if isinstance(loc, tuple):
                        loc_strs.append(f"{loc[0]},{loc[1]}")
                    else:
                        loc_strs.append(str(loc))
                
                if loc_strs:
                    marker_str = "|".join(parts + loc_strs)
                    params.append(f"markers={marker_str}")
        
        # Path
        if path:
            parts = []
            if "weight" in path:
                parts.append(f"weight:{path['weight']}")
            if "color" in path:
                parts.append(f"color:{path['color']}")
            if "fillcolor" in path:
                parts.append(f"fillcolor:{path['fillcolor']}")
            if "geodesic" in path:
                parts.append(f"geodesic:{path['geodesic']}")
            
            # Add points or polyline
            if "points" in path:
                point_strs = []
                for p in path["points"]:
                    if isinstance(p, tuple):
                        point_strs.append(f"{p[0]},{p[1]}")
                    else:
                        point_strs.append(str(p))
                parts.extend(point_strs)
            elif "polyline" in path:
                parts.append(f"enc:{path['polyline']}")
            
            if parts:
                params.append(f"path={'|'.join(parts)}")
        
        # Style
        if style:
            for style_def in style:
                style_parts = []
                if "feature" in style_def:
                    style_parts.append(f"feature:{style_def['feature']}")
                if "element" in style_def:
                    style_parts.append(f"element:{style_def['element']}")
                if "rules" in style_def:
                    for rule, val in style_def["rules"].items():
                        style_parts.append(f"{rule}:{val}")
                
                if style_parts:
                    params.append(f"style={'|'.join(style_parts)}")
        
        # API key (always last for safety)
        params.append(f"key={self._config.api_key}")
        
        # Build URL
        query_string = "&".join(params)
        return f"https://maps.googleapis.com/maps/api/staticmap?{query_string}"


# ===================================================================
# Session Token Generator for Place Autocomplete
# ===================================================================

def generate_place_session_token() -> str:
    """Generate a session token for Place Autocomplete.
    
    Session tokens allow you to group Place Autocomplete requests
    with a Place Details request for billing purposes.
    
    Without a session:
    - Autocomplete: $ per character typed
    - Place Details: $ separately
    
    With a session:
    - All Autocomplete + 1 Place Details = single charge
    
    Usage:
    1. Generate token at start of user search session
    2. Pass to autocomplete_client.get_prediction(..., session_token=token)
    3. Pass same token to client.place(place_id, ..., session_token=token)
    4. Generate new token for next search session
    
    Returns:
        UUID string suitable as session token
    """
    import uuid
    return str(uuid.uuid4())


# ===================================================================
# Geocoding Batch Helper
# ===================================================================

class GeocodingBatchHelper:
    """Helper for batch geocoding multiple addresses.
    
    Respects rate limits and provides caching.
    
    Important: Google doesn't have a batch geocoding API endpoint.
    This helper makes sequential calls with rate limiting.
    
    For large batches (1000+ addresses), consider:
    - Google Maps Geocoding API has QPS limits
    - Consider Google's Geocoding API Premium plan for higher quotas
    - Consider alternative services for very large batches
    """
    
    def __init__(self, client: GoogleMapsClient):
        self._client = client
        self._results: Dict[str, Dict[str, Any]] = {}
        self._failures: Dict[str, str] = {}
    
    def geocode_addresses(
        self,
        addresses: List[str],
        components: Optional[Dict[str, str]] = None,
        delay_between: float = 0.1,
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """Geocode a list of addresses.
        
        Args:
            addresses: List of addresses to geocode
            components: Component filtering for all
            delay_between: Delay between requests (in addition to client rate limit)
            
        Returns:
            Dict mapping address -> result (or None if failed)
        """
        import time
        
        results: Dict[str, Optional[Dict[str, Any]]] = {}
        
        total = len(addresses)
        
        for i, address in enumerate(addresses):
            # Check if already processed
            if address in self._results:
                results[address] = self._results[address]
                continue
            if address in self._failures:
                results[address] = None
                continue
            
            try:
                logger.info("Geocoding %d/%d: %s", i + 1, total, address[:50])
                
                result = self._client.geocode_first(address, components=components)
                
                if result:
                    results[address] = result
                    self._results[address] = result
                else:
                    results[address] = None
                    self._failures[address] = "No results"
                    
            except Exception as e:
                logger.warning("Failed to geocode '%s': %s", address, e)
                results[address] = None
                self._failures[address] = str(e)
            
            # Extra delay if configured
            if delay_between > 0 and i < total - 1:
                time.sleep(delay_between)
        
        return results
    
    def extract_all_coordinates(self) -> Dict[str, Optional[Tuple[float, float]]]:
        """Extract coordinates from all successful geocodes.
        
        Returns:
            Dict mapping address -> (lat, lng) or None
        """
        coords: Dict[str, Optional[Tuple[float, float]]] = {}
        
        for address, result in self._results.items():
            if result:
                geometry = result.get("geometry", {})
                location = geometry.get("location", {})
                lat = location.get("lat")
                lng = location.get("lng")
                if lat is not None and lng is not None:
                    coords[address] = (float(lat), float(lng))
                else:
                    coords[address] = None
            else:
                coords[address] = None
        
        for address in self._failures:
            coords[address] = None
        
        return coords
    
    def get_stats(self) -> Dict[str, Any]:
        """Get batch processing statistics.
        
        Returns:
            Dict with success_count, failure_count, failure_details
        """
        return {
            "success_count": len(self._results),
            "failure_count": len(self._failures),
            "failures": dict(self._failures),
        }


# Global client (lazy-loaded)
_global_client: Optional[GoogleMapsClient] = None


def get_google_maps_client() -> GoogleMapsClient:
    """Get or create global Google Maps client."""
    global _global_client
    if _global_client is None:
        config = GoogleMapsConfig.from_env()
        _global_client = GoogleMapsClient(config)
    return _global_client
```
