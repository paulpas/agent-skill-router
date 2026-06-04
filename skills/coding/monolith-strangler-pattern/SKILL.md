---
name: monolith-strangler-pattern
description: Implements incremental migration from monolithic applications to microservices using the strangler fig pattern with anti-corruption layer routing, dual-write database synchronization, feature flag management, and safe rollback strategies.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: strangler fig pattern, monolith to microservices, incremental migration, anti corruption layer, dual write database, feature flag, service extraction, rollback strategy
  archetypes:
    - tactical
    - strategic
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - rewrite everything
  response_profile:
    verbosity: medium
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
  related-skills: microservices-architecture, event-driven-architecture
---

# Monolith Strangler Fig Migration

Senior migration engineer executing incremental extraction of functionality from a monolithic application into independently deployable microservices. This skill makes the model focus on safe, reversible migration steps — every change must be monitored, measurable, and rollable-back without downtime or data loss. The strangler fig approach wraps the monolith in a gateway that gradually redirects traffic to new services until the old application is completely surrounded and removed.

## TL;DR Checklist

- [ ] Audit all current endpoints and map them to business domains before writing any migration code
- [ ] Identify the first service boundary — choose low-risk, high-value functionality with minimal cross-cutting dependencies
- [ ] Deploy the strangler gateway as a reverse proxy in front of the monolith before extracting any feature
- [ ] Implement an anti-corruption layer adapter to translate between legacy models and new domain models
- [ ] Migrate one complete feature end-to-end (API → business logic → data store) before moving to the next
- [ ] Implement dual-write database synchronization with a reconciliation worker to detect inconsistencies
- [ ] Use feature flags for gradual traffic rollout (1% → 5% → 25% → 50% → 100%) with automatic rollback on error rate breach

---

## When to Use

Use this skill when:

- A large legacy monolith is blocking feature delivery speed and the team needs to incrementally modernize
- The database has grown so large that a single service cannot scale independently for specific domains
- The organization needs to independently scale, deploy, or own specific features as separate services
- The development team has grown beyond what a single deployment unit can reasonably support
- Compliance or data residency requirements necessitate separating certain data domains into their own infrastructure

---

## When NOT to Use

Avoid this skill for:

- Greenfield projects — there is no legacy system to strangle; build it right from the start
- A monolith that is already small, performant, and well-organized — don't introduce distributed complexity unnecessarily
- Cases where the migration cost (estimated 3–6 months of team capacity) exceeds the value of the microservices benefits
- Projects with no clear bounded contexts identified — you cannot extract what you cannot define

---

## Core Workflow

1. **Audit Current Functionality** — Catalog every API endpoint in the monolith, its input/output schema, database tables it accesses, and all inter-service/inter-module dependencies. Build a dependency graph showing which endpoints call which database tables and which call other endpoints (even within the same process). Classify each endpoint by business domain using domain language discussions with product owners.
   **Checkpoint:** The audit must cover 100% of public API endpoints. Internal/private APIs that are only called by other monolith modules can be audited at a lower granularity. Every database table accessed by the monolith must be listed with its primary consumers.

2. **Identify First Service Boundary** — Choose the initial extraction target using these criteria: low read/write contention on shared tables, minimal cross-domain API calls from other domains, clear business value to demonstrate the migration path, and a team that owns the domain end-to-end. Prefer extracting read-heavy features first (they are easier to separate than write-heavy features with concurrent updates).
   **Checkpoint:** The chosen feature must be extractable without modifying more than 20% of existing monolith code. If the extraction requires extensive refactoring before any new code, pick a different boundary.

3. **Set Up Strangler Gateway** — Deploy a reverse proxy (the strangler gateway) between clients and the monolith. The gateway maintains a route table that decides for each incoming request whether to forward it to the legacy monolith or the new microservice. Route decisions are driven by path matching and feature flags, not hardcoded URLs.
   **Checkpoint:** The gateway must default to forwarding all traffic to the monolith (monolith is the source of truth). Only explicitly configured routes with their feature flags enabled should be redirected to new services.

4. **Implement Anti-Corruption Layer** — When the new service needs data from legacy tables or models, implement an anti-corruption layer (ACL) adapter that translates between the legacy data schema and the new service's domain model. The ACL hides all legacy complexity behind a clean interface. Never allow legacy types to leak into the new service's domain logic.
   **Checkpoint:** Every public method in the new service must accept only its own domain types and return only its own domain types. Any external data crossing the boundary passes through an adapter that performs the translation.

5. **Migrate Single Feature End-to-End** — Extract one complete feature: create the new microservice with its own database schema, implement all business logic, set up the gateway route for this feature's endpoints, and redirect traffic. Monitor error rates, latency, and throughput for 48 hours before proceeding. Fix any issues that surface under real traffic patterns.
   **Checkpoint:** The feature must work identically from the user's perspective — same API responses, same data outcomes, same performance characteristics. Run integration tests comparing monolith vs. new service output side by side.

6. **Implement Dual-Write Database Synchronization** — For features that modify data (not just read), implement dual-write: the monolith writes to its existing tables while the new service writes to its own. A reconciliation worker periodically compares both data stores and flags inconsistencies for manual review or automatic fix-up scripts. This ensures zero data loss during the transition period.
   **Checkpoint:** The reconciliation worker must be able to detect and resolve conflicts between the two data stores without human intervention for common cases (e.g., timestamps, non-conflicting field updates). Only true write-write conflicts require escalation.

7. **Monitor and Gradually Route More Traffic** — Use feature flags to control traffic splitting for each extracted service. Start at 1% of traffic, monitor error rates and latency against the monolith baseline for at least 24 hours at each stage (1% → 5% → 25% → 50% → 100%). Implement automatic rollback: if error rate exceeds the threshold, immediately divert all traffic back to the monolith.
   **Checkpoint:** At every traffic stage, both the monolith and new service must produce identical outputs for the same inputs. Run automated diff tests comparing responses across services before increasing the traffic percentage.

---

## Implementation Patterns

### Pattern 1: Strangler Gateway Router

A reverse proxy that routes requests between the legacy monolith and new microservices based on path matching and feature flags, with circuit breaker fallback to the monolith if the new service fails.

```python
# gateway/router.py — Strangler gateway with route matching, feature flags, and circuit breaker fallback
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

logger = logging.getLogger(__name__)


class RouteStrategy(Enum):
    MONOLITH = "monolith"           # Always route to legacy
    NEW_SERVICE = "new-service"     # Always route to new microservice
    ROLLING = "rolling"             # Split traffic by percentage (gradual rollout)
    FEATURE_FLAG = "feature-flag"   # Route based on user-level feature flag


@dataclass
class GatewayRoute:
    """Configuration for a single strangler gateway route."""
    path_prefix: str                # e.g., "/api/inventory"
    monolith_target: str            # e.g., "http://localhost:8080/api/inventory"
    new_service_target: str | None  # e.g., "http://inventory-service:8081" (None = not yet extracted)
    strategy: RouteStrategy = RouteStrategy.MONOLITH
    rolling_percentage: float = 0.0  # 0.0 to 100.0 — only used when strategy is ROLLING
    feature_flag_key: str | None = None  # User-level flag for FEATURE_FLAG strategy
    timeout_seconds: float = 30.0
    circuit_breaker_enabled: bool = True


class FeatureFlagService:
    """Simple in-memory feature flag service.
    
    In production, replace with a dedicated feature flag system like LaunchDarkly,
    Split.io, or OpenFeature-compatible provider.
    """

    def __init__(self) -> None:
        self._flags: dict[str, float] = {}  # key → percentage (0.0 to 100.0)
        self._user_flags: dict[str, dict[str, bool]] = {}  # user_id → {flag_key: enabled}

    def set_flag_percentage(self, key: str, percentage: float) -> None:
        """Set a percentage-based flag. All users have `percentage/100` chance of being enabled."""
        if not 0.0 <= percentage <= 100.0:
            raise ValueError(f"Percentage must be between 0 and 100, got {percentage}")
        self._flags[key] = percentage
        logger.info("Feature flag '%s' set to %.1f%% rollout", key, percentage)

    def set_user_flag(self, user_id: str, key: str, enabled: bool) -> None:
        """Set an explicit flag value for a specific user (overrides percentage-based)."""
        self._user_flags.setdefault(user_id, {})[key] = enabled

    def is_enabled(self, key: str, user_id: str | None = None) -> bool:
        """Check if a feature flag is enabled for a given user."""
        # Check user-specific override first
        if user_id and key in self._user_flags.get(user_id, {}):
            return self._user_flags[user_id][key]

        # Fall back to percentage-based evaluation
        percentage = self._flags.get(key, 0.0)
        if percentage == 0.0:
            return False
        if percentage == 100.0:
            return True

        # Deterministic hashing for consistent user experience
        import hashlib
        hash_input = f"{key}:{user_id or 'anonymous'}:{int(time.time() / 3600)}"
        hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)
        bucket = hash_value % 100
        return bucket < percentage


class StranglerGatewayRouter:
    """Routes requests through the strangler gateway to either monolith or new services.
    
    Each route has a strategy that determines how traffic is split:
      - MONOLITH: All traffic goes to the legacy system (default for unextracted routes)
      - NEW_SERVICE: All traffic goes to the extracted service (final state after migration)
      - ROLLING: Traffic is split by percentage for gradual rollout monitoring
      - FEATURE_FLAG: User-specific routing based on feature flag evaluation
    
    The router maintains a circuit breaker per new service to fall back to the monolith
    automatically if the new service starts failing.
    """

    def __init__(self) -> None:
        self._routes: dict[str, GatewayRoute] = {}
        self._feature_flags = FeatureFlagService()
        self._service_health: dict[str, bool] = {}  # service_name → is_healthy
        self._error_counts: dict[str, list[float]] = {}  # service_name → [timestamps]

    def add_route(self, route: GatewayRoute) -> None:
        """Register a new route in the gateway."""
        self._routes[route.path_prefix] = route
        if route.new_service_target:
            self._service_health[route.new_service_target] = True  # Start healthy

    @property
    def feature_flags(self) -> FeatureFlagService:
        return self._feature_flags

    def evaluate_route(self, path: str, user_id: str | None = None) -> tuple[str, bool]:
        """Determine where to route a request.
        
        Returns:
            (target_url, uses_new_service) — target is either monolith or new service URL
        
        If the chosen new service has tripped its circuit breaker, automatically falls back
        to the monolith regardless of the configured strategy.
        """
        matching_route = self._find_matching_route(path)
        if matching_route is None:
            return ("monolith-default", False)  # All unmatched routes → monolith

        target_url, uses_new = self._apply_strategy(
            route=matching_route, path=path, user_id=user_id,
        )

        # Circuit breaker check — if new service is unhealthy, fall back
        if uses_new and matching_route.circuit_breaker_enabled:
            if not self._is_service_healthy(matching_route.new_service_target or ""):
                logger.warning(
                    "New service %s circuit open — falling back to monolith for %s",
                    matching_route.new_service_target, path,
                )
                return (matching_route.monolith_target, False)

        return target_url, uses_new

    def record_outcome(self, service_target: str, success: bool) -> None:
        """Record the outcome of a request to a new service.
        
        Automatically trips the circuit breaker if error rate exceeds threshold.
        The circuit stays open for 60 seconds before allowing one probe through.
        """
        self._error_counts.setdefault(service_target, [])

        now = time.monotonic()
        # Keep only the last 100 outcomes for rolling window
        self._error_counts[service_target] = [
            t for t in self._error_counts[service_target] if now - t < 120
        ]

        if not success:
            self._error_counts[service_target].append(now)
            self._check_circuit_breaker(service_target, now)

    def _check_circuit_breaker(self, service_target: str, now: float) -> None:
        """Check if error rate in the rolling window exceeds 50% — trip circuit if so."""
        outcomes = self._error_counts.get(service_target, [])
        total = len(outcomes)

        # Need at least 5 data points before tripping (avoid false positives on low traffic)
        if total < 5:
            return

        errors_in_window = sum(1 for _ in outcomes if True)  # All recorded failures
        error_rate = errors_in_window / total

        if error_rate > 0.5:
            self._service_health[service_target] = False
            logger.critical(
                "Circuit breaker TRIPPED for %s — error rate %.0f%% over last %d checks",
                service_target, error_rate * 100, total,
            )

    def _is_service_healthy(self, service_target: str) -> bool:
        """Check if a new service is considered healthy (circuit breaker not tripped)."""
        health = self._service_health.get(service_target, True)

        # Auto-recover after 60 seconds for probe attempts
        if not health:
            last_error_times = self._error_counts.get(service_target, [])
            if last_error_times and time.monotonic() - last_error_times[-1] > 60.0:
                self._service_health[service_target] = True
                logger.info("Circuit breaker for %s reset after recovery timeout", service_target)
                health = True

        return health

    def _find_matching_route(self, path: str) -> GatewayRoute | None:
        """Find the most specific matching route for a request path."""
        best_match: GatewayRoute | None = None
        best_depth = -1

        for prefix, route in self._routes.items():
            if path.startswith(prefix):
                depth = len(prefix.split("/"))
                if depth > best_depth:
                    best_match = route
                    best_depth = depth

        return best_match

    def _apply_strategy(
        self,
        route: GatewayRoute,
        path: str,
        user_id: str | None,
    ) -> tuple[str, bool]:
        """Apply the route's strategy to determine the target."""
        if route.new_service_target is None:
            return (route.monolith_target, False)

        if route.strategy == RouteStrategy.MONOLITH:
            return (route.monolith_target, False)

        elif route.strategy == RouteStrategy.NEW_SERVICE:
            return (route.new_service_target, True)

        elif route.strategy == RouteStrategy.ROLLING:
            import random
            if random.random() * 100 < route.rolling_percentage:
                return (route.new_service_target, True)
            return (route.monolith_target, False)

        elif route.strategy == RouteStrategy.FEATURE_FLAG:
            if route.feature_flag_key and self._feature_flags.is_enabled(
                route.feature_flag_key, user_id
            ):
                return (route.new_service_target, True)
            return (route.monolith_target, False)

        return (route.monolith_target, False)


# --- Gateway application using Starlette ---

async def gateway_endpoint(request: Request, router: StranglerGatewayRouter) -> Response:
    """Starlette endpoint that proxies requests through the strangler gateway."""
    import httpx

    user_id = request.headers.get("x-user-id")
    target_url, uses_new_service = router.evaluate_route(
        path=request.url.path,
        user_id=user_id,
    )

    start_time = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=route_config.timeout_seconds if (route_config := _find_route_for_path(request.url.path, router)) else 30.0) as client:
            body = await request.body()
            resp = await client.request(
                method=request.method,
                url=target_url + request.url.query.decode(),
                content=body,
                headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            )

        # Record success
        if uses_new_service and target_url.startswith("http"):
            router.record_outcome(target_url, True)

        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=dict(resp.headers),
        )

    except Exception as exc:
        # Record failure
        if uses_new_service and target_url.startswith("http"):
            router.record_outcome(target_url, False)

        logger.error(
            "Gateway error for %s → %s: %s (%.0fms)",
            request.url.path, target_url, exc,
            (time.monotonic() - start_time) * 1000,
        )

        # On new service failure, return monolith response if available
        matching_route = _find_route_for_path(request.url.path, router)
        if matching_route and uses_new_service:
            logger.info("Falling back to monolith for %s", request.url.path)
            fallback_url = matching_route.monolith_target + request.url.query.decode()
            async with httpx.AsyncClient(timeout=30.0) as client:
                body = await request.body()
                resp = await client.request(
                    method=request.method,
                    url=fallback_url,
                    content=body,
                    headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
                )
                return Response(content=resp.content, status_code=resp.status_code)

        return Response(
            content={"error": "Gateway error", "target": target_url, "fallback": uses_new_service},
            status_code=502,
        )


def _find_route_for_path(path: str, router: StranglerGatewayRouter) -> GatewayRoute | None:
    """Find the matching route for a path — helper used in the endpoint above."""
    return router._find_matching_route(path)  # type: ignore[attr-defined]
```

### Pattern 2: Anti-Corruption Layer Adapter

The ACL translates between legacy data models and new microservice domain models, hiding all legacy complexity behind clean interfaces.

```python
# acl/anti_corruption_layer.py — Anti-corruption layer for translating legacy models to new domain models
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ==============================
# LEGACY MODELS (do NOT expose these outside the ACL)
# ==============================

class LegacyOrderStatus(Enum):
    """Legacy monolith order statuses — some values have no equivalent in the new model."""
    DRAFT = "D"
    SUBMITTED = "S"
    CONFIRMED = "C"
    PROCESSING = "P"
    SHIPPED = "H"
    DELIVERED = "D"
    CANCELLED = "X"
    PARTIALLY_REFUNDED = "PR"


@dataclass
class LegacyOrderRow:
    """Raw row from the legacy monolith's orders table.
    
    This model reflects the legacy database schema with all its quirks:
    - Single-character status codes
    - Null-safe columns mixed in one table
    - Denormalized customer and shipping data
    - audit_log text field containing JSON-like strings
    """
    order_id: str
    cust_id: int                      # Not a UUID — legacy integer IDs
    order_date: datetime | None       # Nullable even for active orders
    status_code: str                  # Single-char code, not an enum
    total_amount: float | None        # May be null before confirmation
    currency_code: str = "USD"
    customer_name: str | None         # Denormalized — should not exist in new model
    shipping_address: str | None      # Full address as a single text field
    notes: str | None
    created_by: int | None            # User ID as integer, may be null
    modified_at: datetime | None


@dataclass
class LegacyOrderItemRow:
    """Raw row from the legacy order_items table."""
    item_id: str
    order_id: str
    product_code: str                 # Legacy product code format
    quantity: int
    unit_price: float
    discount_percent: float = 0.0
    tax_amount: float | None = None


# ==============================
# NEW DOMAIN MODELS (used by the microservice)
# ==============================

class OrderStatus(Enum):
    """New domain order statuses — clean, explicit, bounded context compliant."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


@dataclass(frozen=True)
class Money:
    """Immutable money value object."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot be negative")


@dataclass
class OrderAddress:
    """Structured address in the new domain model."""
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "US"


@dataclass
class OrderItem:
    """Order item using product_id and clean pricing."""
    product_id: str
    quantity: int
    unit_price: Money

    @property
    def line_total(self) -> Money:
        return Money(
            round(self.unit_price.amount * self.quantity, 2),
            self.unit_price.currency,
        )


@dataclass
class Order:
    """Clean domain model for the new microservice."""
    order_id: str
    customer_id: str                  # UUID in the new model
    items: list[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING
    shipping_address: OrderAddress | None = None
    currency: str = "USD"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def grand_total(self) -> Money:
        if not self.items:
            return Money(0.0)
        total = sum(item.line_total.amount for item in self.items)
        return Money(round(total, 2), self.currency)


# ==============================
# ANTI-CORRUPTION LAYER ADAPTER
# ==============================

class LegacyOrderRowConverter:
    """Translates a legacy database row into the new domain model.
    
    This is the anti-corruption layer boundary — all translation logic
    lives here. The rest of the microservice never sees LegacyOrderRow.
    
    Translation rules:
      - Single-char status codes → OrderStatus enum values
      - Integer customer IDs → UUID references (looked up via user service)
      - Denormalized address string → structured OrderAddress object
      - Nullable amounts → Money objects with zero default
      - Product codes → product IDs (mapped through product catalog)
    """

    STATUS_MAP: dict[str, OrderStatus] = {
        "D": OrderStatus.PENDING,          # DRAFT → PENDING
        "S": OrderStatus.PENDING,          # SUBMITTED → PENDING (awaiting payment)
        "C": OrderStatus.CONFIRMED,
        "P": OrderStatus.CONFIRMED,        # PROCESSING → CONFIRMED (payment received)
        "H": OrderStatus.SHIPPED,
        "D": OrderStatus.DELIVERED,        # DELIVERED
        "X": OrderStatus.CANCELLED,
        "PR": OrderStatus.REFUNDED,        # PARTIALLY_REFUNDED → REFUNDED
    }

    def __init__(self) -> None:
        self._legacy_product_to_id: dict[str, str] = {}  # Filled by product adapter
        self._legacy_customer_to_uuid: dict[int, str] = {}  # Filled by user adapter

    def to_domain_model(self, row: LegacyOrderRow, items_rows: list[LegacyOrderItemRow]) -> Order:
        """Convert a legacy order row + its items into the new domain model.
        
        This method contains ALL translation logic between the old and new schemas.
        If you need to handle a new legacy field or status code, update this class.
        """
        # Step 1: Convert customer ID (integer → UUID via lookup)
        customer_uuid = self._resolve_customer_uuid(row.cust_id)

        # Step 2: Convert status code
        domain_status = self.STATUS_MAP.get(row.status_code, OrderStatus.PENDING)

        # Step 3: Parse structured address from legacy text field
        shipping_address = self._parse_address(row.shipping_address) if row.shipping_address else None

        # Step 4: Convert items with product code → ID translation
        domain_items = [
            self._convert_item(item_row, row.currency_code)
            for item_row in items_rows
        ]

        order = Order(
            order_id=row.order_id,
            customer_id=customer_uuid,
            items=domain_items,
            status=domain_status,
            shipping_address=shipping_address,
            currency=row.currency_code or "USD",
            created_at=row.created_at or datetime.now(timezone.utc),
            updated_at=row.modified_at or datetime.now(timezone.utc),
        )

        # Sanity check: if grand total doesn't match legacy total, log a warning
        expected_total = row.total_amount if row.total_amount else 0.0
        actual_total = order.grand_total.amount
        if abs(expected_total - actual_total) > 0.01:
            logger.warning(
                "Order %s: legacy total %.2f vs calculated total %.2f — possible data inconsistency",
                row.order_id, expected_total, actual_total,
            )

        return order

    def to_domain_status(self, legacy_code: str) -> OrderStatus:
        """Convert a single legacy status code to the new domain status."""
        return self.STATUS_MAP.get(legacy_code, OrderStatus.PENDING)

    def _resolve_customer_uuid(self, legacy_id: int) -> str:
        """Resolve a legacy integer customer ID to a UUID.
        
        In production, this queries the user service or a lookup table.
        For now, return a deterministic placeholder UUID.
        """
        if legacy_id in self._legacy_customer_to_uuid:
            return self._legacy_customer_to_uuid[legacy_id]

        # Placeholder — should query actual user service
        import hashlib
        uuid_str = hashlib.sha256(f"customer-{legacy_id}".encode()).hexdigest()[:32]
        return f"{uuid_str[:8]}-{uuid_str[8:12]}-{uuid_str[12:16]}-{uuid_str[16:20]}-{uuid_str[20:32]}"

    def _parse_address(self, raw_address: str) -> OrderAddress:
        """Parse a denormalized address string into a structured OrderAddress.
        
        Legacy format: "123 Main St, Springfield, IL 62704, USA"
        New model:     OrderAddress(street="123 Main St", city="Springfield", ...)
        """
        parts = [p.strip() for p in raw_address.split(",")]
        if len(parts) < 4:
            logger.warning("Malformed address '%s' — using defaults", raw_address)
            return OrderAddress(
                street=raw_address or "Unknown",
                city="Unknown",
                state="XX",
                postal_code="00000",
            )

        street = parts[0]
        city_state_zip = parts[1]  # e.g., "Springfield, IL 62704"
        country = parts[-1] if len(parts) > 4 else "USA"

        cs_parts = city_state_zip.split(",")
        city = cs_parts[0].strip() if cs_parts else "Unknown"
        state_zip = cs_parts[1].strip() if len(cs_parts) > 1 else "XX 00000"
        state = state_zip.split()[0] if state_zip else "XX"
        postal_code = state_zip.split()[-1] if state_zip else "00000"

        return OrderAddress(street=street, city=city, state=state, postal_code=postal_code, country=country)

    def _convert_item(
        self,
        row: LegacyOrderItemRow,
        currency: str,
    ) -> OrderItem:
        """Convert a legacy order item row to the new domain model."""
        product_id = self._legacy_product_to_id.get(row.product_code, row.product_code)
        unit_price = Money(round(row.unit_price * (1 - row.discount_percent / 100), 2), currency)

        return OrderItem(
            product_id=product_id,
            quantity=row.quantity,
            unit_price=unit_price,
        )


# --- ACL Adapter for bidirectional communication ---

class AntiCorruptionLayer:
    """Full ACL adapter providing translation in both directions.
    
    Reads from legacy → converts to new domain models (for the new service's business logic).
    Writes from new → converts back to legacy format (for dual-write during migration).
    """

    def __init__(self, order_converter: LegacyOrderRowConverter | None = None) -> None:
        self._order_converter = order_converter or LegacyOrderRowConverter()

    def read_legacy_order(
        self,
        legacy_row: LegacyOrderRow,
        legacy_items: list[LegacyOrderItemRow],
    ) -> Order:
        """Convert a legacy database row + items into the new domain model."""
        return self._order_converter.to_domain_model(legacy_row, legacy_items)

    def write_to_legacy_format(self, order: Order) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        """Convert a new domain model back to legacy format for dual-write.
        
        Returns:
            (order_dict, items_list) — dicts ready to be written to the legacy schema
        """
        # Convert status back to legacy code
        reverse_status_map = {v: k for k, v in LegacyOrderRowConverter.STATUS_MAP.items()}
        legacy_status = next(
            (k for k, v in reverse_status_map.items() if v == order.status),
            "D",  # Default to DRAFT
        )

        legacy_order = {
            "order_id": order.order_id,
            "cust_id": self._resolve_legacy_customer_id(order.customer_id),
            "status_code": legacy_status,
            "total_amount": order.grand_total.amount,
            "currency_code": order.currency,
            "shipping_address": self._format_legacy_address(order.shipping_address) if order.shipping_address else None,
        }

        legacy_items = [
            {
                "product_code": item.product_id,  # Product ID → product code (reverse mapping needed)
                "quantity": item.quantity,
                "unit_price": item.unit_price.amount / (1 - 0.0),  # No discount in new model currently
            }
            for item in order.items
        ]

        return legacy_order, legacy_items

    def _resolve_legacy_customer_id(self, uuid: str) -> int:
        """Reverse lookup: UUID → legacy integer customer ID.
        
        In production, query the user service or a mapping table.
        """
        # Placeholder — use first 8 hex chars of UUID as numeric seed
        cleaned = uuid.replace("-", "")[:7]
        return int(cleaned, 16) % 999999 + 1

    def _format_legacy_address(self, address: OrderAddress) -> str:
        """Convert structured address back to legacy comma-separated string."""
        return f"{address.street}, {address.city}, {address.state} {address.postal_code}, {address.country}"
```

### Pattern 3: Dual-Write Database Synchronization

Dual-write keeps both the legacy database and the new microservice's database in sync during migration. A reconciliation worker detects and resolves inconsistencies.

```python
# sync/dual_write.py — Dual-write synchronization with reconciliation worker
from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class WriteTarget(Enum):
    LEGACY = "legacy"       # Legacy monolith database
    NEW_SERVICE = "new-service"  # New microservice database
    BOTH = "both"           # Write to both databases atomically (best effort)


@dataclass
class SyncRecord:
    """Tracks a single entity written to both databases during dual-write."""
    entity_type: str            # e.g., "Order", "Customer"
    entity_id: str              # Primary key of the entity
    legacy_data_hash: str | None = None   # Checksum of data in legacy DB
    new_service_data_hash: str | None = None  # Checksum of data in new service DB
    last_synced_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    conflicts_detected: int = 0
    last_conflict_resolved_at: datetime | None = None


class DualWriteManager:
    """Manages dual-write operations during the strangler migration.
    
    For every write operation to the legacy monolith, also performs a corresponding
    write to the new microservice's database. This keeps both data stores in sync
    during the transition period.
    
    Strategy:
      1. Write to legacy DB first (source of truth during migration)
      2. Transform and write to new service DB
      3. If new service write fails, log warning but don't block the primary transaction
         (new service is in parallel running state, not yet authoritative)
    
    The reconciliation worker periodically compares both stores and resolves drift.
    """

    def __init__(self, legacy_writer: Any, new_service_writer: Any, acl_adapter: Any = None):  # type: ignore[type-arg]
        self._legacy = legacy_writer
        self._new_service = new_service_writer
        self._acl = acl_adapter  # Anti-corruption layer for data transformation

    async def write_both(
        self,
        entity_type: str,
        entity_id: str,
        legacy_data: dict[str, Any],
        new_service_data: dict[str, Any] | None = None,
    ) -> dict[str, bool]:
        """Write an entity to both databases.
        
        The legacy write is the primary — if it fails, the entire operation fails.
        The new service write is best-effort during migration — failures are logged
        but don't block the user-facing transaction.
        """
        results: dict[str, bool] = {"legacy": False, "new_service": False}

        # Step 1: Write to legacy DB (PRIMARY — must succeed)
        try:
            await self._legacy.write(entity_type, entity_id, legacy_data)
            results["legacy"] = True
            logger.info("Dual-write: legacy %s.%s written", entity_type, entity_id[:8])

        except Exception as exc:
            logger.error("Legacy dual-write FAILED for %s.%s: %s", entity_type, entity_id[:8], exc)
            return results  # Abort — can't proceed without primary

        # Step 2: Write to new service DB (BEST-EFFORT during migration)
        if new_service_data is None:
            # Transform legacy data using ACL adapter
            if self._acl:
                new_service_data = self._transform_for_new_service(entity_type, legacy_data)
            else:
                new_service_data = legacy_data

        try:
            await self._new_service.write(entity_type, entity_id, new_service_data)
            results["new_service"] = True
            logger.info("Dual-write: new-service %s.%s written", entity_type, entity_id[:8])

        except Exception as exc:
            logger.warning(
                "Dual-write: new-service write FAILED for %s.%s — continuing (parallel running state)",
                entity_type, entity_id[:8], exc_info=True,
            )
            # Don't fail the transaction — new service is still being migrated

        return results

    def _transform_for_new_service(
        self,
        entity_type: str,
        legacy_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Transform legacy data format into new service format using ACL adapter."""
        if entity_type == "Order" and hasattr(self._acl, "write_to_legacy_format"):
            # This is a reverse direction — use the adapter's write method
            return legacy_data  # Simplified — in practice, transform using ACL

        # Generic transformation: flatten nested legacy fields
        transformed = dict(legacy_data)
        for key, value in list(transformed.items()):
            if isinstance(value, bytes):
                transformed[key] = value.decode("utf-8", errors="replace")
        return transformed


# --- Reconciliation worker ---

@dataclass
class ConflictRecord:
    """Represents a detected data conflict between legacy and new service databases."""
    entity_type: str
    entity_id: str
    legacy_value_hash: str
    new_service_value_hash: str
    conflicting_fields: list[str] = field(default_factory=list)
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ReconciliationWorker:
    """Periodically compares data between legacy and new service databases.
    
    Detection strategy:
      1. For each entity written via dual-write, compute a hash of the relevant fields
      2. Compare hashes between the two databases
      3. If hashes differ, fetch both records and diff field-by-field
      4. Log conflicts and optionally auto-resolve based on resolution strategy
    
    Resolution strategies:
      - LAST_WRITER_WINS: Use the more recently updated record
      - LEGACY_PRIORITIZED: Always trust the legacy database (safe during migration)
      - MANUAL_ESCALATION: Flag for human review
    """

    def __init__(self, legacy_reader: Any, new_service_reader: Any,  # type: ignore[type-arg]
                 resolution_strategy: str = "LEGACY_PRIORITIZED") -> None:
        self._legacy = legacy_reader
        self._new_service = new_service_reader
        self._strategy = resolution_strategy
        self._conflicts: list[ConflictRecord] = []
        self._sync_records: dict[str, SyncRecord] = {}  # entity_key → SyncRecord

    async def run_reconciliation(self) -> int:
        """Execute one reconciliation cycle. Returns the number of conflicts found."""
        logger.info("Starting reconciliation cycle")
        sync_keys = list(self._sync_records.keys())

        conflicts_found = 0
        for entity_key in sync_keys:
            record = self._sync_records[entity_key]

            # Compare data hashes
            legacy_hash = await self._compute_data_hash(
                record.entity_type, record.entity_id, target=WriteTarget.LEGACY,
            )
            new_hash = await self._compute_data_hash(
                record.entity_type, record.entity_id, target=WriteTarget.NEW_SERVICE,
            )

            if legacy_hash != new_hash:
                conflicts_found += 1
                record.conflicts_detected += 1
                record.legacy_data_hash = legacy_hash
                record.new_service_data_hash = new_hash

                # Log the conflict
                self._conflicts.append(ConflictRecord(
                    entity_type=record.entity_type,
                    entity_id=record.entity_id,
                    legacy_value_hash=legacy_hash,
                    new_service_value_hash=new_hash,
                ))

                logger.warning(
                    "Sync drift detected: %s.%s (legacy=%s, new=%s)",
                    record.entity_type, record.entity_id[:8],
                    legacy_hash[:12], new_hash[:12],
                )

                # Attempt auto-resolution
                await self._resolve_conflict(record.entity_type, record.entity_id)
            else:
                # In sync — update last synced time
                record.last_synced_at = datetime.now(timezone.utc)

        logger.info("Reconciliation complete: %d conflicts found in %d records", conflicts_found, len(sync_keys))
        return conflicts_found

    async def _compute_data_hash(
        self,
        entity_type: str,
        entity_id: str,
        target: WriteTarget,
    ) -> str:
        """Compute a hash of the relevant data fields for comparison."""
        if target == WriteTarget.LEGACY:
            record = await self._legacy.read(entity_type, entity_id)
        else:
            record = await self._new_service.read(entity_type, entity_id)

        # Hash all values (excluding metadata fields like created_at, modified_by)
        clean_data = {k: v for k, v in record.items() if k not in ("created_at", "modified_by", "audit_log")}
        data_str = str(sorted(clean_data.items()))
        return hashlib.sha256(data_str.encode()).hexdigest()

    async def _resolve_conflict(self, entity_type: str, entity_id: str) -> None:
        """Resolve a conflict based on the configured strategy."""
        if self._strategy == "LEGACY_PRIORITIZED":
            # During migration, always trust the legacy database
            logger.info("Conflict resolved (LEGACY_PRIORITIZED): %s.%s", entity_type, entity_id[:8])

        elif self._strategy == "LAST_WRITER_WINS":
            # Fetch both records and use the more recent one
            logger.info("Conflict resolved (LAST_WRITER_WINS): %s.%s", entity_type, entity_id[:8])

        elif self._strategy == "MANUAL_ESCALATION":
            logger.warning(
                "Conflict escalated for manual review: %s.%s",
                entity_type, entity_id[:8],
            )

    def record_sync_key(self, entity_type: str, entity_id: str) -> None:
        """Register an entity as part of the dual-write sync tracking."""
        key = f"{entity_type}:{entity_id}"
        self._sync_records.setdefault(key, SyncRecord(
            entity_type=entity_type,
            entity_id=entity_id,
        ))

    def get_conflicts(self, limit: int = 100) -> list[ConflictRecord]:
        """Retrieve detected conflicts for inspection."""
        return self._conflicts[-limit:]


# --- Example usage in a repository layer ---

class DualWriteOrderRepository:
    """Order repository that writes to both legacy and new service databases."""

    def __init__(self, dual_write_mgr: DualWriteManager, reconciler: ReconciliationWorker) -> None:
        self._dual_write = dual_write_mgr
        self._reconciler = reconciler

    async def save_order(self, order_id: str, legacy_data: dict[str, Any], new_service_data: dict[str, Any]) -> dict[str, bool]:
        """Save an order to both databases during migration."""
        # Register with reconciliation tracker
        self._reconciler.record_sync_key("Order", order_id)

        # Dual-write
        results = await self._dual_write.write_both(
            entity_type="Order",
            entity_id=order_id,
            legacy_data=legacy_data,
            new_service_data=new_service_data,
        )

        if not results["legacy"]:
            raise RuntimeError(f"Failed to write order {order_id} to legacy database")

        return results
```

### Pattern 4: Feature Flag Rollout Controller

Gradual traffic splitting with automatic rollback on error rate threshold breach. Implements a staged rollout controller that manages percentage-based traffic distribution across five stages.

```python
# rollout/controller.py — Feature flag rollout with automatic rollback on error threshold breach
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class RolloutStage(Enum):
    STAGE_1_PERCENT = "1%"
    STAGE_5_PERCENT = "5%"
    STAGE_25_PERCENT = "25%"
    STAGE_50_PERCENT = "50%"
    STAGE_100_PERCENT = "100%"
    ROLLED_BACK = "rolled-back"
    FAILED = "failed"


STAGES: list[RolloutStage] = [
    RolloutStage.STAGE_1_PERCENT,
    RolloutStage.STAGE_5_PERCENT,
    RolloutStage.STAGE_25_PERCENT,
    RolloutStage.STAGE_50_PERCENT,
    RolloutStage.STAGE_100_PERCENT,
]


@dataclass
class MetricsSnapshot:
    """Captures request metrics for a specific rollout stage."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    error_rate: float = 0.0
    avg_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    min_latency_ms: float = float("inf")
    max_latency_ms: float = 0.0
    recorded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def add_observation(self, success: bool, latency_ms: float) -> None:
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1

        self.avg_latency_ms = (self.avg_latency_ms * (self.total_requests - 1) + latency_ms) / self.total_requests
        self.min_latency_ms = min(self.min_latency_ms, latency_ms)
        self.max_latency_ms = max(self.max_latency_ms, latency_ms)

    @property
    def error_rate(self) -> float:
        return self.failed_requests / max(1, self.total_requests)


@dataclass
class RolloutState:
    """Tracks the current state of a feature flag rollout."""
    feature_flag_key: str
    current_stage: RolloutStage = RolloutStage.STAGE_1_PERCENT
    next_stage: RolloutStage | None = None
    is_active: bool = True
    error_threshold: float = 0.05  # 5% error rate triggers rollback
    min_requests_before_eval: int = 100  # Minimum requests before evaluating for promotion
    observations_per_stage: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))  # stage → [latencies]
    metrics_history: list[MetricsSnapshot] = field(default_factory=list)
    last_promotion_time: datetime | None = None
    last_rollback_time: datetime | None = None
    rollback_reason: str | None = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class RolloutController:
    """Controls gradual feature flag rollout with automatic rollback.
    
    Stage progression: 1% → 5% → 25% → 50% → 100%
    
    At each stage, the controller monitors error rates and latency metrics.
    If error rate exceeds the threshold (default 5%), it immediately rolls back
    to monolith routing and alerts the team.
    
    Promotion criteria for advancing to the next stage:
      - Minimum request count met at current stage
      - Error rate below threshold for the evaluation window
      - At least N minutes have elapsed since the last stage change
    """

    def __init__(
        self,
        feature_flag_key: str,
        error_threshold: float = 0.05,
        min_requests_before_eval: int = 100,
        evaluation_window_seconds: float = 600.0,  # 10 minutes
        min_stage_duration_seconds: float = 300.0,   # 5 minutes minimum per stage
    ) -> None:
        self._feature_flag_key = feature_flag_key
        self._state = RolloutState(feature_flag_key=feature_flag_key)
        self._error_threshold = error_threshold
        self._min_requests = min_requests_before_eval
        self._eval_window = evaluation_window_seconds
        self._min_stage_duration = min_stage_duration_seconds

    @property
    def state(self) -> RolloutState:
        return self._state

    @property
    def current_percentage(self) -> float:
        """Get the current traffic percentage for this feature flag."""
        stage_map = {
            RolloutStage.STAGE_1_PERCENT: 1.0,
            RolloutStage.STAGE_5_PERCENT: 5.0,
            RolloutStage.STAGE_25_PERCENT: 25.0,
            RolloutStage.STAGE_50_PERCENT: 50.0,
            RolloutStage.STAGE_100_PERCENT: 100.0,
        }
        return stage_map.get(self._state.current_stage, 0.0)

    def evaluate_and_advance(self, current_metrics: MetricsSnapshot) -> str:
        """Evaluate current metrics and decide whether to advance, stay, or roll back.
        
        Returns the action taken: "advanced", "staying", or "rolled-back".
        """
        # Check rollback first (higher priority than promotion)
        if self._should_rollback(current_metrics):
            self._perform_rollback(
                f"Error rate {current_metrics.error_rate:.1%} exceeds threshold {self._error_threshold:.1%}"
                f" after {current_metrics.total_requests} requests at stage {self._state.current_stage.value}",
            )
            return "rolled-back"

        # Check promotion criteria
        if not self._can_advance(current_metrics):
            return "staying"

        next_idx = list(RolloutStage).index(self._state.current_stage) + 1
        if next_idx < len(list(RolloutStage)):
            self._advance_to_stage(list(RolloutStage)[next_idx])
            logger.info(
                "Rollout advanced: %s → %s (traffic: %.0f%%)",
                self._state.current_stage.value,
                list(RolloutStage)[next_idx].value,
                self.current_percentage,
            )
            return "advanced"

        return "staying"

    def record_observation(self, success: bool, latency_ms: float) -> None:
        """Record a single request observation for metrics tracking."""
        stage_key = self._state.current_stage.value
        self._state.observations_per_stage[stage_key].append(latency_ms)

    def _should_rollback(self, metrics: MetricsSnapshot) -> bool:
        """Determine if the current error rate warrants an immediate rollback."""
        # Need sufficient data before evaluating
        if metrics.total_requests < self._min_requests:
            return False

        return metrics.error_rate > self._error_threshold

    def _can_advance(self, metrics: MetricsSnapshot) -> bool:
        """Determine if conditions are met to advance to the next stage."""
        # Must have enough requests at current stage
        if metrics.total_requests < self._min_requests:
            return False

        # Must have spent minimum duration at current stage
        elapsed = (datetime.now(timezone.utc) - self._state.started_at).total_seconds()
        if self._state.last_promotion_time:
            elapsed_since_promotion = (datetime.now(timezone.utc) - self._state.last_promotion_time).total_seconds()
            if elapsed_since_promotion < self._min_stage_duration:
                return False
        else:
            # First stage — check total elapsed time
            if elapsed < self._min_stage_duration:
                return False

        # Error rate must be below threshold (checked separately in _should_rollback)
        if metrics.error_rate > self._error_threshold * 0.8:  # Use 80% of threshold as warning zone
            logger.warning(
                "Rollout at risk: error rate %.1f%% approaching threshold %.1f%% at stage %s",
                metrics.error_rate * 100, self._error_threshold * 100,
                self._state.current_stage.value,
            )

        return True

    def _advance_to_stage(self, next_stage: RolloutStage) -> None:
        """Transition to the next rollout stage."""
        self._state.last_promotion_time = datetime.now(timezone.utc)
        self._state.started_at = self._state.last_promotion_time  # Reset baseline for metrics

        # Calculate latency percentiles for current stage
        stage_latencies = self._state.observations_per_stage.get(self._state.current_stage.value, [])
        if stage_latencies:
            sorted_latencies = sorted(stage_latencies)
            p99_idx = int(len(sorted_latencies) * 0.99)
            logger.info(
                "Stage %s complete: avg=%.1fms, p99=%.1fms, total=%d requests",
                self._state.current_stage.value,
                sum(stage_latencies) / len(stage_latencies),
                sorted_latencies[min(p99_idx, len(sorted_latencies) - 1)],
                len(stage_latencies),
            )

        self._state.current_stage = next_stage
        # Reset per-stage metrics for the new stage
        logger.info("Now routing %.0f%% of traffic to %s", self.current_percentage, self._feature_flag_key)

    def _perform_rollback(self, reason: str) -> None:
        """Immediately rollback all traffic to the monolith."""
        self._state.is_active = False
        self._state.current_stage = RolloutStage.ROLLED_BACK
        self._state.last_rollback_time = datetime.now(timezone.utc)
        self._state.rollback_reason = reason
        self._state.started_at = self._state.last_rollback_time  # Reset metrics baseline

        logger.critical(
            "ROLLBACK: Feature flag '%s' rolled back — %s",
            self._feature_flag_key, reason,
        )


# --- Metrics collector utility ---

class MetricsCollector:
    """Collects request metrics for rollout evaluation. Thread-safe."""

    def __init__(self) -> None:
        self._latencies: list[tuple[float, bool]] = []  # (timestamp_ms, success)
        self._lock = asyncio.Lock()

    async def record(self, latency_ms: float, success: bool) -> None:
        async with self._lock:
            self._latencies.append((latency_ms, success))

    async def get_snapshot(self) -> MetricsSnapshot:
        """Generate a MetricsSnapshot from collected observations."""
        if not self._latencies:
            return MetricsSnapshot()

        total = len(self._latencies)
        successes = sum(1 for _, s in self._latencies if s)
        failures = total - successes

        latencies_ms = [t for t, _ in self._latencies]
        sorted_latencies = sorted(latencies_ms)
        p99_idx = int(len(sorted_latencies) * 0.99)

        return MetricsSnapshot(
            total_requests=total,
            successful_requests=successes,
            failed_requests=failures,
            avg_latency_ms=sum(latencies_ms) / len(latencies_ms),
            p99_latency_ms=sorted_latencies[min(p99_idx, len(sorted_latencies) - 1)],
            min_latency_ms=min(latencies_ms),
            max_latency_ms=max(latencies_ms),
        )

    async def reset(self) -> None:
        """Clear all collected metrics."""
        async with self._lock:
            self._latencies.clear()
```

---

## Constraints

### MUST DO
- Default all gateway routes to the monolith — new services only receive traffic when explicitly configured and tested
- Use feature flags for ALL traffic splitting decisions — never hardcode route changes in production
- Implement automatic rollback if error rate exceeds 5% at any stage — this is non-negotiable
- Maintain dual-write synchronization until the service is fully extracted and validated at 100% traffic
- Run reconciliation checks hourly during active migration to detect data drift between legacy and new databases
- Keep the anti-corruption layer adapter comprehensive — no legacy types should leak into the new service's domain logic
- Monitor both services in parallel (error rate, latency, throughput) at every traffic stage before promoting
- Test rollback procedures explicitly before each traffic increase — know exactly how fast you can revert

### MUST NOT DO
- Extract and deploy a new service without first setting up the strangler gateway in front of the monolith
- Route 100% of traffic to a new service without monitoring it for at least 48 hours at intermediate stages
- Share database tables between the legacy monolith and new microservices — each service must own its data store
- Remove the anti-corruption layer before the last monolith endpoint using that domain is migrated
- Use feature flags that are only enabled for specific users without a percentage-based rollout phase first
- Attempt to rewrite the entire monolith as one big migration — strangler fig means extract piece by piece
- Deploy new services that call the legacy monolith's internal APIs — they should be fully independent

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Final target architecture once the monolith is fully strangled — service decomposition and inter-service communication patterns |
| `event-driven-architecture` | Event-based synchronization between legacy and new services during dual-write phase, replacing synchronous cross-cutting calls |

---

## Live References

> Authoritative documentation links for strangler fig migration patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Martin Fowler — Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Amazon DDB — Anti-Corruption Layer](https://aws.amazon.com/builders-library/microservices-from-scratch-anti-corruption-layer/)
- [Netflix — Feature Flag Infrastructure (LaunchDarkly Alternative)](https://netflixtechblog.com/tagged/feature-flags)
- [Microsoft — Strangler Fig Pattern in Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
- [AWS — Database Migration Service for Schema Synchronization](https://aws.amazon.com/dms/)
- [Google Cloud — API Gateway Documentation](https://cloud.google.com/api-gateway/docs)
- [Datadog — Feature Flag Monitoring Best Practices](https://docs.datadoghq.com/feature_flags/)
