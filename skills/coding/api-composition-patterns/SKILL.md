---
name: api-composition-patterns
description: Implements API composition patterns for orchestrating concurrent calls across multiple microservices including parallel aggregation, timeout isolation, partial failure handling, circuit breaker per dependency, query fan-out, and schema transformation for unified client responses.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api composition, concurrent service calls, data aggregation, microservice orchestration, fan-out pattern, partial failure, how do i combine data from multiple services
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: bff-pattern, microservices-architecture, system-reliability-architecture
---

# API Composition Architect

I design and implement resilient aggregation layers that fan out to multiple microservices concurrently, collect partial results, apply fallbacks, and compose unified client responses. When loaded, the model produces composition logic where every upstream dependency has independent timeouts, circuit breakers, and failure recovery — never failing entirely when a single service is unavailable.

## TL;DR Checklist

- [ ] Fan out to all upstream services in parallel — never chain calls sequentially
- [ ] Set per-service timeouts (default 2s) and use a total composition timeout (default 5s)
- [ ] Implement circuit breakers per upstream dependency — don't share one breaker for all services
- [ ] Return partial results with fallback defaults when some services fail — never fail entirely
- [ ] Transform and normalize schemas from different microservice versions before combining
- [ ] Handle pagination composition: merge paginated sub-results into a single unified page

---

## When to Use

Use this skill when:

- A single client request requires data from 3+ microservices that must be combined into one response
- You need to reduce network round-trips by aggregating multiple service calls per client request
- Different upstream services have different SLAs and failure rates, requiring independent timeout and fallback policies
- You're building an aggregation layer (API gateway, BFF, or edge proxy) that composes data from backend services

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD operations where a single microservice owns the data end-to-end
- Real-time streaming or event-driven scenarios — use event sourcing or CQRS instead
- When all required data lives in a single service — don't compose when you could call one endpoint
- High-frequency hot paths with sub-millisecond latency budgets — composition overhead is unacceptable

---

## Core Workflow

1. **Map Dependencies** — For each client request, identify which microservices provide the needed data. Document each service's contract: HTTP/gRPC path, auth method, expected schema version, SLA (p50/p99 latency), and known failure modes. Build a dependency map before writing composition logic.

   **Checkpoint:** Every upstream service must have an assigned timeout budget that is strictly less than the total composition timeout. The sum of all individual timeouts should not exceed the total timeout — parallel execution is the point.

2. **Fan Out Concurrently** — Launch all upstream calls simultaneously using async/await or futures. Each call carries its own per-service timeout and circuit breaker state. Use a single shared HTTP client/session to avoid connection pool exhaustion across services.

   **Checkpoint:** All tasks are launched before awaiting any result. Sequential launches defeat the purpose of composition — latency must be max(service latencies), not sum().

3. **Collect Results** — Wait for all results using `asyncio.gather` with `return_exceptions=True`. Apply the total composition timeout via `asyncio.wait_for` or a session-level timeout. Classify each result as success, timeout, circuit-open, or exception. Never let one service's failure block collection of others' data.

   **Checkpoint:** After collection, every service that returned successfully must have its circuit breaker record a success. Every failed service records a failure — even timeouts count.

4. **Apply Fallbacks** — For each failed or missing service, apply the pre-configured fallback strategy. Strategies include: return a default value (e.g., `0` for counts, empty list for collections), serve stale cached data with a cache-miss marker, or omit the field entirely and let the client handle absence. Document which fallback each service uses.

   **Checkpoint:** The composed response must be structurally valid — every required field either has real data from an upstream service or a sensible default. A partial failure should produce a partially-populated but parseable response.

5. **Transform and Merge** — Normalize schemas from different microservice versions into a common internal representation. Apply client-specific field selection, filtering, and sorting. Compose the final unified response with consistent naming conventions, type coercion (e.g., string prices to floats), and pagination metadata if applicable.

   **Checkpoint:** The composed response must pass the downstream contract validation — fields match the expected schema, types are correct, and any missing-but-optional fields have their default values set rather than being `null`.

---

## Implementation Patterns

### Pattern 1: Concurrent Fan-Out with Timeout Isolation

Fan out to all upstream microservices simultaneously, each with its own timeout budget. Use a shared total timeout that bounds the entire composition. Handle partial results so the client always gets a valid response even when some services fail.

```python
"""Concurrent API composition with per-service timeout isolation."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import aiohttp

logger = logging.getLogger(__name__)


class ServiceState(str, Enum):
    """Tracks the health state of each upstream service."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass(frozen=True)
class ServiceTimeoutConfig:
    """Timeout configuration for a single upstream microservice."""

    timeout_seconds: float = 2.0
    fallback_on_timeout: bool = True


@dataclass
class ComposedProductDetail:
    """Unified product detail combining data from multiple microservices."""

    id: str
    name: str
    price: float
    inventory_count: int = -1
    stock_state: ServiceState = ServiceState.UNHEALTHY
    reviews: list[dict[str, Any]] = field(default_factory=list)
    recommendations: list[dict[str, Any]] = field(default_factory=list)

    @property
    def is_in_stock(self) -> bool:
        return self.inventory_count > 0

    @property
    def has_reviews(self) -> bool:
        return len(self.reviews) >= 1


async def compose_product_detail(
    product_id: str,
    session: aiohttp.ClientSession,
    base_url: str = "http://api-gateway.internal",
    total_timeout: float = 5.0,
) -> ComposedProductDetail:
    """Compose a complete product detail by aggregating data from multiple microservices concurrently.

    Each upstream service has its own timeout budget. If any service times out or fails,
    the composition continues with fallback defaults for that service's contribution.
    The total operation is bounded by `total_timeout`.

    Args:
        product_id: The product identifier to compose data for.
        session: Shared aiohttp ClientSession for all upstream calls.
        base_url: Base URL prefix for upstream service endpoints.
        total_timeout: Maximum total wall-clock time for the entire composition.

    Returns:
        A ComposedProductDetail with available data and fallback defaults for unavailable services.

    Raises:
        asyncio.TimeoutError: If the total composition timeout expires before any result is collected.
    """
    service_configs: dict[str, ServiceTimeoutConfig] = {
        "catalog": ServiceTimeoutConfig(timeout_seconds=2.0),
        "inventory": ServiceTimeoutConfig(timeout_seconds=1.5),
        "reviews": ServiceTimeoutConfig(timeout_seconds=2.0),
        "recommendations": ServiceTimeoutConfig(timeout_seconds=2.0),
    }

    async def _fetch_service(
        service_name: str, endpoint: str, timeout_secs: float
    ) -> tuple[str, dict[str, Any] | None]:
        """Fetch a single upstream service with its specific timeout.

        Returns a (service_name, data) tuple. Data is None on failure.
        """
        url = f"{base_url}{endpoint}"
        logger.debug("Fan-out: fetching %s from %s (timeout=%.1fs)", service_name, url, timeout_secs)
        try:
            async with asyncio.timeout(timeout_secs):
                async with session.get(url) as resp:
                    if resp.status == 404:
                        return service_name, {}
                    data = await resp.json()
                    return service_name, data
        except (asyncio.TimeoutError, aiohttp.ClientError, OSError) as exc:
            logger.warning("Service %s failed: %s", service_name, exc)
            return service_name, None

    # Build fan-out tasks dictionary
    base_url = "http://api-gateway.internal"
    tasks: list[asyncio.Task[tuple[str, dict[str, Any] | None]]] = [
        asyncio.create_task(_fetch_service(
            "catalog", f"/catalog/products/{product_id}", service_configs["catalog"].timeout_seconds,
        )),
        asyncio.create_task(_fetch_service(
            "inventory", f"/stock/check?product={product_id}", service_configs["inventory"].timeout_seconds,
        )),
        asyncio.create_task(_fetch_service(
            "reviews", f"/reviews/list?product={product_id}&limit=5", service_configs["reviews"].timeout_seconds,
        )),
        asyncio.create_task(_fetch_service(
            "recommendations",
            f"/recommendations/for-product/{product_id}?limit=3",
            service_configs["recommendations"].timeout_seconds,
        )),
    ]

    # Wait for all tasks with total timeout — bounded by a single deadline
    try:
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=total_timeout,
        )
    except asyncio.TimeoutError:
        logger.error("Composition timed out after %.1fs", total_timeout)
        # Cancel any still-running tasks
        for task in tasks:
            task.cancel()
        results = [None] * len(tasks)

    # Collect successful results keyed by service name
    service_data: dict[str, Optional[dict[str, Any]]] = {}
    failed_services: list[str] = []

    for task, (service_name, data) in zip(tasks, results):
        if isinstance(data, Exception) or data is None:
            failed_services.append(service_name)
            service_data[service_name] = None
        else:
            service_data[service_name] = data

    # Apply fallbacks and build composed response
    catalog = service_data.get("catalog") or {}
    inventory = service_data.get("inventory") or {}
    reviews_raw = service_data.get("reviews") or {}
    recommendations_raw = service_data.get("recommendations") or {}

    stock_state = ServiceState.HEALTHY if "inventory" not in failed_services else ServiceState.DEGRADED
    if len(failed_services) > 2:
        stock_state = ServiceState.UNHEALTHY

    return ComposedProductDetail(
        id=product_id,
        name=catalog.get("name", "Unknown Product"),
        price=float(catalog.get("price", 0)),
        inventory_count=int(inventory.get("count", -1)) if isinstance(inventory, dict) else -1,
        stock_state=stock_state,
        reviews=(
            [r for r in reviews_raw.get("items", []) if isinstance(r, dict)]
            if isinstance(reviews_raw, dict)
            else []
        ),
        recommendations=(
            [r for r in recommendations_raw.get("items", []) if isinstance(r, dict)]
            if isinstance(recommendations_raw, dict)
            else []
        ),
    )
```

### Pattern 2: Per-Dependency Circuit Breaker (BAD vs. GOOD)

A single shared circuit breaker means one flaky service blocks all downstream calls from every other service. Instead, maintain independent state per dependency with configurable failure thresholds and recovery timeouts.

```python
"""Circuit breaker pattern with per-dependency isolation."""

from __future__ import annotations

import asyncio
import time
import threading
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class BreakerState(str, Enum):
    """Circuit breaker state machine transitions."""

    CLOSED = "closed"        # Normal: requests flow through
    OPEN = "open"            # Failing: requests are blocked, fallback used
    HALF_OPEN = "half_open"  # Probing: allow limited test requests


@dataclass(frozen=True)
class BreakerConfig:
    """Configuration for a single service's circuit breaker."""

    failure_threshold: int = 5       # Failures before opening
    recovery_timeout: float = 30.0   # Seconds before half-open transition
    half_open_max_calls: int = 1     # Test calls allowed in half-open state


class CircuitBreaker:
    """Stateful circuit breaker for a single upstream dependency.

    Thread-safe implementation using lock-based synchronization.
    Transitions: CLOSED -> OPEN on threshold breach,
                 OPEN -> HALF_OPEN after recovery timeout,
                 HALF_OPEN -> CLOSED on success, HALF_OPEN -> OPEN on failure.
    """

    __slots__ = (
        "_failure_count",
        "_success_count",
        "_last_failure_time",
        "_state",
        "_half_open_calls",
        "_lock",
        "_config",
    )

    def __init__(self, config: BreakerConfig | None = None) -> None:
        self._config = config or BreakerConfig()
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = 0.0
        self._state = BreakerState.CLOSED
        self._half_open_calls = 0
        self._lock = threading.RLock()

    @property
    def state(self) -> BreakerState:
        """Current breaker state with automatic OPEN -> HALF_OPEN transition."""
        with self._lock:
            if self._state == BreakerState.OPEN:
                elapsed = time.monotonic() - self._last_failure_time
                if elapsed >= self._config.recovery_timeout:
                    logger.info(
                        "Circuit breaker half-open for %s (recovered after %.1fs)",
                        self._config, elapsed,
                    )
                    self._state = BreakerState.HALF_OPEN
                    self._half_open_calls = 0
            return self._state

    def allow_request(self) -> bool:
        """Check if a request should be allowed through the breaker."""
        return self.state != BreakerState.OPEN

    def record_success(self) -> None:
        """Record a successful upstream call — resets failure count, may close breaker."""
        with self._lock:
            if self._state == BreakerState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self._config.half_open_max_calls:
                    self._close()
            elif self._state == BreakerState.CLOSED:
                # Reset consecutive failure counter on success
                self._failure_count = max(0, self._failure_count - 1)

    def record_failure(self) -> None:
        """Record a failed upstream call — increments counter, may open breaker."""
        with self._lock:
            self._last_failure_time = time.monotonic()
            if self._state == BreakerState.HALF_OPEN:
                # Failed probe test — reopen immediately
                logger.warning("Circuit breaker reopened for %s (half-open probe failed)", self)
                self._state = BreakerState.OPEN
            elif self._state == BreakerState.CLOSED:
                self._failure_count += 1
                if self._failure_count >= self._config.failure_threshold:
                    logger.warning(
                        "Circuit breaker OPEN for %s (%d consecutive failures)",
                        self, self._failure_count,
                    )
                    self._state = BreakerState.OPEN

    def _close(self) -> None:
        """Transition to CLOSED state — reset all counters."""
        self._state = BreakerState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        logger.info("Circuit breaker CLOSED for %s (recovered)", self)


# ❌ BAD: Single shared breaker trips for every upstream service
class BadServiceRouter:
    """❌ BAD — one circuit breaker shared across all services.

    If the reviews service is flaky, the catalog and inventory breakers trip too,
    causing cascading failures even though catalog/inventory are healthy.
    """

    def __init__(self) -> None:
        self._global_breaker = CircuitBreaker(  # type: ignore[assignment]
            config=BreakerConfig(failure_threshold=5),
        )

    async def call(self, service_name: str, url: str, session: aiohttp.ClientSession) -> dict[str, Any] | None:
        if not self._global_breaker.allow_request():
            raise RuntimeError(f"Global circuit OPEN — blocking all services including healthy ones like {service_name}")

        try:
            async with asyncio.timeout(2.0):
                async with session.get(url) as resp:
                    data = await resp.json()
                    self._global_breaker.record_success()
                    return data
        except Exception:
            self._global_breaker.record_failure()
            raise


# ✅ GOOD: Independent breaker per upstream dependency
class ServiceRouter:
    """Routes composed requests with independent circuit breakers per service.

    Each microservice gets its own failure threshold, recovery timeout, and state machine.
    A flaky reviews service will never trip the breaker for catalog or inventory.
    """

    def __init__(self) -> None:
        self._breakers: dict[str, CircuitBreaker] = {
            "catalog": CircuitBreaker(BreakerConfig(failure_threshold=5, recovery_timeout=30.0)),
            "inventory": CircuitBreaker(BreakerConfig(failure_threshold=3, recovery_timeout=15.0)),
            "reviews": CircuitBreaker(BreakerConfig(failure_threshold=10, recovery_timeout=60.0)),
            "recommendations": CircuitBreaker(BreakerConfig(failure_threshold=8, recovery_timeout=45.0)),
        }

    async def call_with_breaker(
        self, service_name: str, url: str, session: aiohttp.ClientSession
    ) -> Optional[dict[str, Any]]:
        """Call an upstream service through its dedicated circuit breaker.

        Args:
            service_name: Name of the upstream service (must be in router config).
            url: Full endpoint URL for the upstream call.
            session: Shared aiohttp ClientSession.

        Returns:
            Parsed JSON response from the upstream service, or None if the circuit is open.

        Raises:
            ValueError: If service_name has no registered circuit breaker.
        """
        breaker = self._breakers.get(service_name)
        if breaker is None:
            raise ValueError(f"No circuit breaker configured for service: {service_name}")

        if not breaker.allow_request():
            logger.warning("Circuit OPEN for %s — returning fallback", service_name)
            return {"error": "circuit_open", "fallback": True, "service": service_name}

        try:
            async with asyncio.timeout(2.0):
                async with session.get(url) as resp:
                    data = await resp.json()
                    breaker.record_success()
                    return data
        except Exception:
            breaker.record_failure()
            raise
```

### Pattern 3: Query Parameter Translation and Schema Normalization

Clients send one unified query. Microservices each expect differently-shaped queries with different parameter names, filtering conventions, and sorting fields. The composition layer must translate and normalize both directions.

```python
"""Query translation between client-facing API and microservice-specific schemas."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


# --- Client-facing schema (what the external API receives) ---

@dataclass
class ClientSearchRequest:
    """Normalized search request from an external client."""

    query: str
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    sort_by: str = "relevance"  # "relevance", "price_asc", "price_desc", "newest"
    page: int = 1
    per_page: int = 20

    def __post_init__(self) -> None:
        if self.page < 1:
            self.page = 1
        if self.per_page < 1 or self.per_page > 100:
            self.per_page = 20


# --- Microservice-specific query schemas ---

@dataclass
class CatalogQuery:
    """Query shaped for the catalog microservice."""

    text_query: str
    category_id: Optional[int] = None
    price_min: float = 0.0
    price_max: float = float("inf")
    sort_field: str = "relevance_score"
    page: int = 1
    page_size: int = 20


@dataclass
class InventoryQuery:
    """Query shaped for the inventory microservice."""

    search_text: Optional[str] = None
    category_filter: Optional[str] = None
    in_stock_only: bool = True
    warehouse_ids: list[str] = field(default_factory=lambda: ["WH-PRIMARY"])
    page: int = 1
    page_size: int = 20


@dataclass
class ReviewsQuery:
    """Query shaped for the reviews microservice."""

    product_id: Optional[str] = None
    category_filter: Optional[str] = None
    min_rating: float = 0.0
    limit: int = 10
    sort_order: str = "newest"


def translate_search_request(client_req: ClientSearchRequest) -> tuple[CatalogQuery, InventoryQuery, ReviewsQuery]:
    """Translate a single client search into three differently-shaped service queries.

    The catalog service needs numeric category IDs and different sort field names.
    The inventory service only filters by text + category (not price).
    The reviews service is product-id based but accepts category fallback.

    Args:
        client_req: The unified client-facing search request.

    Returns:
        Tuple of (catalog_query, inventory_query, reviews_query) ready for fan-out.
    """
    sort_field_map: dict[str, str] = {
        "price_asc": "price",
        "price_desc": "-price",
        "newest": "created_at",
        "relevance": "relevance_score",
    }

    catalog_query = CatalogQuery(
        text_query=client_req.query,
        category_id=_resolve_category_id(client_req.category) if client_req.category else None,
        price_min=client_req.min_price or 0.0,
        price_max=client_req.max_price or float("inf"),
        sort_field=sort_field_map.get(client_req.sort_by, "relevance_score"),
        page=client_req.page,
        page_size=client_req.per_page,
    )

    inventory_query = InventoryQuery(
        search_text=client_req.query if client_req.query else None,
        category_filter=client_req.category,
        in_stock_only=True,  # Always filter to stock for search results
        page=client_req.page,
        page_size=client_req.per_page,
    )

    reviews_query = ReviewsQuery(
        category_filter=client_req.category,
        limit=min(client_req.per_page * 2, 50),  # Fetch extras for merging
        sort_order="newest",
    )

    return catalog_query, inventory_query, reviews_query


# --- Schema normalization: upstream responses to unified format ---

def normalize_catalog_response(raw: dict[str, Any], query: CatalogQuery) -> list[dict[str, Any]]:
    """Normalize a catalog microservice response to internal product representation.

    Handles different schema versions from the catalog service (v1 vs v2 API changes).
    """
    products = []
    items = raw.get("data", {}).get("items", raw.get("items", []))

    for item in items:
        # Handle both v1 {price, name} and v2 {pricing: {amount}, title} schemas
        if "pricing" in item:
            price = float(item["pricing"]["amount"])
            name = item.get("title", item.get("name", "Unknown"))
        else:
            price = float(item.get("price", 0))
            name = item.get("name", "Unknown")

        products.append({
            "id": str(item.get("id", "")),
            "name": name,
            "price": round(price, 2),
            "category_id": item.get("category_id"),
            "slug": item.get("slug", ""),
        })

    return products


def normalize_and_merge(
    catalog_products: list[dict[str, Any]],
    inventory_raw: dict[str, Any],
) -> list[dict[str, Any]]:
    """Merge catalog data with stock info into a unified product list.

    Joins by product ID and enriches each product with stock availability.

    Args:
        catalog_products: Normalized products from the catalog service.
        inventory_raw: Raw inventory response containing per-product stock levels.

    Returns:
        Unified product list with stock fields added to each product.
    """
    # Build a lookup map from inventory response
    stock_map: dict[str, int] = {}
    for item in inventory_raw.get("inventory", []):
        prod_id = str(item.get("product_id", ""))
        if prod_id:
            stock_map[prod_id] = item.get("quantity", 0)

    results = []
    for product in catalog_products:
        stock_qty = stock_map.get(product["id"], 0)
        results.append({
            **product,
            "in_stock": stock_qty > 0,
            "stock_level": stock_qty,
        })

    return results


def _resolve_category_id(category_name: str) -> Optional[int]:
    """Resolve a category name to its numeric ID.

    In production this would query a category lookup service or cache.
    For composition patterns, it's a helper function that can be replaced with
    an actual async call to the catalog/category endpoint.
    """
    category_lookup: dict[str, int] = {
        "electronics": 101,
        "clothing": 202,
        "home-garden": 303,
        "books": 404,
    }
    return category_lookup.get(category_name.lower().replace(" ", "-"))


# ❌ BAD: Sequential calls — each waits for the previous one to finish
async def bad_composed_search(client_req: ClientSearchRequest, session: Any) -> list[dict]:
    """❌ BAD — sequential HTTP calls add latency linearly.

    If catalog takes 2s, inventory 1.5s, and reviews 2s, the total is 5.5s.
    With parallel fan-out, total would be max(2, 1.5, 2) = 2s.
    """
    # Step 1: Get catalog products
    async with session.get(f"/catalog/search?q={client_req.query}") as resp:
        catalog_data = await resp.json()

    # Step 2: Get inventory (waits for catalog to finish first!)
    product_ids = [p["id"] for p in catalog_data.get("items", [])]
    async with session.get(f"/inventory?ids={','.join(product_ids)}") as resp:
        inventory_data = await resp.json()

    # Step 3: Get reviews (waits for inventory to finish too!)
    reviews_data = {}
    for pid in product_ids[:5]:
        async with session.get(f"/reviews?product={pid}") as resp:
            reviews_data[pid] = await resp.json()

    # Merge sequentially
    return [{**p, "stock": inventory_data.get(p["id"], 0)} for p in catalog_data["items"]]


# ✅ GOOD: Concurrent fan-out with translation and normalization
async def good_composed_search(
    client_req: ClientSearchRequest, session: Any
) -> list[dict[str, Any]]:
    """✅ GOOD — all upstream calls in parallel, results normalized and merged.

    Total latency is determined by the slowest single service call, not the sum.
    Schema normalization handles version differences between microservices.
    """
    catalog_query, inventory_query, reviews_query = translate_search_request(client_req)

    # Fan out to all three services simultaneously
    tasks = {
        "catalog": session.get(
            f"/catalog/search?q={catalog_query.text_query}&cat={catalog_query.category_id}&sort={catalog_query.sort_field}",
        ),
        "inventory": session.get(
            f"/inventory?text={inventory_query.search_text}&stock_only=true",
        ),
        "reviews": session.get(
            f"/reviews/category={reviews_query.category_filter}&limit={reviews_query.limit}",
        ),
    }

    # Wait for all — total timeout bounds the composition
    async with asyncio.timeout(5.0):
        catalog_resp, inventory_resp, reviews_resp = await asyncio.gather(*tasks.values())

    catalog_data = await catalog_resp.json()
    inventory_data = await inventory_resp.json()
    reviews_data = await reviews_resp.json()

    # Normalize schemas before merging
    products = normalize_catalog_response(catalog_data, catalog_query)
    return normalize_and_merge(products, inventory_data)
```

---

## Constraints

### MUST DO
- Fan out all upstream calls in parallel — never chain sequential HTTP calls for data aggregation
- Set per-service timeouts (not just a total timeout) to isolate slow services from the composition budget
- Implement circuit breakers independently per upstream dependency with service-specific failure thresholds
- Return partial results when some services fail — compose what you have, don't fail entirely
- Transform and normalize schemas from different microservice versions before combining results
- Use a shared HTTP client/session for all fan-out calls to avoid connection pool exhaustion

### MUST NOT DO
- Make sequential HTTP calls to multiple services (latency adds up: 2s × 5 = 10s vs max(2s) = 2s)
- Use a single shared circuit breaker for all upstream services (one flaky service trips the breaker for everything)
- Return raw microservice responses directly without schema normalization and field selection
- Set timeouts that are longer than your total composition budget (per-service timeout < total timeout)

---

## Output Template

When implementing an API composition layer, produce:

1. **Dependency Map** — Table listing every upstream service with its HTTP/gRPC endpoint path, auth requirements, expected schema version, SLA (p50/p99), assigned timeout budget, and failure mode handling
2. **Fan-Out Implementation** — Python code for concurrent aggregation with per-service timeouts, shared session, and `asyncio.gather` collection with `return_exceptions=True`
3. **Circuit Breaker Configuration** — Per-service breaker settings table: service name, failure threshold, recovery timeout, half-open test calls count, with justification for each value based on service criticality
4. **Fallback Strategy** — For each upstream service: the fallback behavior (default value, stale cache, omit field), the conditions that trigger it (timeout, circuit open, HTTP error code), and how the client can detect partial failures
5. **Query Translation Layer** — Functions mapping the unified client request schema to each microservice's query shape, including sort field remapping, parameter name translation, and pagination normalization

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `bff-pattern` | BFF layer uses API composition to aggregate data — this skill provides the underlying orchestration mechanics |
| `microservices-architecture` | Understanding microservice decomposition informs which services to compose and their boundaries |
| `system-reliability-architecture` | Circuit breakers, retries, and health checks from reliability patterns apply directly to composition layers |

---

## Live References

> Authoritative documentation for API composition patterns, async HTTP clients, and distributed systems resilience.

- [Google SRE Book — Dependency Timeouts](https://sre.google/sre-bookbook/timeouts/)
- [Netflix Concurrency Limits](https://github.com/Netflix/concurrency-limits) — Dynamic rate limiting per dependency
- [Aiohttp Documentation](https://docs.aiohttp.org/) — Async HTTP client with timeout support
- [AWS Resilience Pattern — Circuit Breaker](https://aws.amazon.com/builders-library/circuit-break-pattern/)
- [Martin Fowler — Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) — Original circuit breaker pattern article
- [Python asyncio documentation — wait_for and gather](https://docs.python.org/3/library/asyncio-task.html#asyncio.wait_for)
