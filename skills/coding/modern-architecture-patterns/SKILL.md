---




name: modern-architecture-patterns
description: Implements hexagonal architecture, BFF, feature flags, CQRS with event sourcing, API composition, and sidecar patterns for building modular, observable distributed systems.
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
metadata:
  version: "1.0.0"
  domain: coding
  triggers: hexagonal architecture, ports and adapters, backends-for-frontends, bff pattern, feature flags, CQRS event sourcing, sidecar pattern, how do i design scalable systems
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: structural-design-patterns,cqrs-pattern,microservice-resilience-patterns,domain-driven-design,clean-architecture




---





# Modern Architecture Patterns

Implements modern software architecture patterns to build modular, deployable, and observable distributed systems. When loaded, the model applies hexagonal architecture for domain isolation, backend-for-frontend for client-tailored APIs, feature flags for safe deployments, CQRS with event sourcing for auditability, API composition for unified data aggregation, and sidecar patterns for cross-cutting concern separation — following SOLID principles throughout.

## TL;DR Checklist

- [ ] Define port interfaces (abstract contracts) before writing any implementation
- [ ] Verify dependency graph flows inward: infrastructure → application → domain
- [ ] Register all adapters in a DI container at the system composition root
- [ ] Apply the Dependency Rule — no domain module may import an infrastructure module
- [ ] Enforce cross-cutting concern isolation via decorators or middleware layers
- [ ] Implement feature flags with audit logging before rolling out behavioral changes
- [ ] Separate command (write) and query (read) models when writes and reads have different scaling needs
- [ ] Materialize read projections asynchronously from the event store

---

## When to Use

Use this skill when:

- Designing a new system or refactoring an existing one that requires clear architectural boundaries between domain logic and infrastructure concerns
- Building a microservice or distributed system where different client types (web, mobile, partner APIs) need tailored data shapes
- Need to deploy behavioral changes safely without code rollbacks (feature flags/toggles)
- Working with systems that require full audit trails of state mutations — financial ledgers, order management, compliance-sensitive applications
- Read and write workloads have different scaling characteristics (e.g., heavy analytics queries on write-heavy transactional data)
- Adding cross-cutting concerns (logging, retries, circuit breaking) without polluting business logic

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with a single client type — layered architecture is sufficient; hexagonal architecture adds unnecessary indirection
- Monolithic apps where the cost of introducing BFFs and API composition outweighs benefits
- Prototypes or proof-of-concepts where speed matters more than architectural purity
- Systems with no cross-cutting concerns that need separation (no retries, no circuit breakers)
- Projects under extreme time pressure where event sourcing projection lag would cause user-visible inconsistencies

---

## Core Workflow

1. **Map Domain Boundaries** — Identify bounded contexts using domain-driven design techniques. Define aggregate roots and their invariants. **Checkpoint:** Each bounded context should have a single responsible team and its own deployment boundary.

2. **Define Port Interfaces** — For each domain capability, write abstract interfaces that describe what the domain needs, not how it gets it (repository contracts, external service calls, message publishing). **Checkpoint:** Interfaces must be framework-free — no SQLAlchemy models, no HTTP types, no ORM decorators in port signatures.

3. **Implement Adapters** — Write concrete implementations that satisfy each port: database adapters using your persistence technology, HTTP clients for external services, message queue publishers. Register them in a DI container at the composition root. **Checkpoint:** Verify that the domain core has zero imports from adapter packages.

4. **Select Cross-Cutting Pattern** — Decide which patterns apply per context: use BFF when multiple client types need different data shapes, feature flags for gradual rollouts, CQRS when read/write scaling diverges, sidecar pattern for shared infrastructure concerns. **Checkpoint:** Each decision must have a documented trade-off analysis.

5. **Wire the Composition Root** — Assemble ports and adapters using dependency injection. Ensure the main entry point is thin — it only wires dependencies and starts execution; all business logic flows through port interfaces. **Checkpoint:** The composition root should be under 200 lines and contain no business logic.

---

## Implementation Patterns

### Pattern 1: Hexagonal Architecture (Ports & Adapters)

Hexagonal architecture (also called ports and adapters) isolates the domain core from infrastructure by inverting dependencies. The domain defines abstract ports — interfaces it needs. Infrastructure provides concrete adapter implementations that plug into those ports. This ensures business logic is testable without databases, message queues, or HTTP servers.

**Core principle:** Dependencies point inward. Infrastructure depends on domain; domain does not depend on infrastructure.

#### BAD: Coupled Domain with Framework Types

```python
# ❌ BAD: Domain knows about SQLAlchemy — impossible to test without a database
from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import declarative_base, Session

Base = declarative_base()

class OrderEntity(Base):  # Domain concept leaking into ORM layer
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    customer_email = Column(String(255))
    total_cents = Column(Integer)
    status = Column(String(50))


class OrderService:  # Tightly coupled to specific ORM session
    def __init__(self, db_session: Session):  # Depends on concrete type
        self.db = db_session

    def place_order(self, customer_email: str, total_cents: int) -> dict:
        order = OrderEntity(
            customer_email=customer_email,
            total_cents=total_cents,
            status="pending",
        )
        self.db.add(order)
        self.db.commit()
        return {"id": order.id, "status": order.status}  # Leaks ORM entity
```

This design is fragile because:
- The domain model IS the persistence model — you cannot test without a database
- Swapping from SQLAlchemy to Postgres requires rewriting the service layer
- Business rules are entangled with SQL schema definitions

#### GOOD: Pure Domain with Port Abstractions

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ---- DOMAIN CORE (no imports from infrastructure) ----

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"


@dataclass(frozen=True)
class Money:
    """Immutable monetary value with currency code."""
    amount_cents: int
    currency: str = "USD"

    @property
    def dollars(self) -> float:
        return self.amount_cents / 100

    def is_positive(self) -> bool:
        return self.amount_cents > 0


@dataclass(frozen=True)
class OrderId:
    """Value object representing a unique order identifier."""
    value: str


@dataclass
class Order:
    """Aggregate root for the Order bounded context.

    Encapsulates all order invariants: valid email, positive total,
    status transitions follow defined state machine rules.
    """
    order_id: OrderId
    customer_email: str
    total: Money
    status: OrderStatus = field(default=OrderStatus.PENDING)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def confirm(self) -> None:
        if self.status != OrderStatus.PENDING:
            raise ValueError(
                f"Cannot confirm order in '{self.status.value}' state. "
                f"Allowed transitions from PENDING."
            )
        self.status = OrderStatus.CONFIRMED

    def cancel(self) -> None:
        if self.status == OrderStatus.SHIPPED:
            raise ValueError("Cannot cancel a shipped order.")
        self.status = OrderStatus.CANCELLED

    @property
    def is_active(self) -> bool:
        return self.status in (OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED)


# ---- PORTS (abstract contracts — still no infrastructure) ----

class OrderRepository(ABC):
    """Port: how the domain persists and retrieves orders."""

    @abstractmethod
    def save(self, order: Order) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: OrderId) -> Optional[Order]: ...

    @abstractmethod
    def find_active_by_email(self, email: str) -> list[Order]: ...


class EmailNotificationPort(ABC):
    """Port: how the domain sends external notifications."""

    @abstractmethod
    def send_order_confirmation(self, order: Order) -> None: ...


# ---- ADAPTERS (infrastructure — implements ports) ----

from sqlalchemy.orm import Session as SqlSession  # Only adapters import infrastructure


class SqlAlchemyOrderRepository(OrderRepository):
    """Concrete adapter: persists orders via SQLAlchemy."""

    def __init__(self, session: SqlSession) -> None:
        self._session = session

    def save(self, order: Order) -> None:
        entity = _map_to_entity(order)
        self._session.add(entity)
        self._session.flush()

    def find_by_id(self, order_id: OrderId) -> Optional[Order]:
        entity = self._session.get(_OrderEntity, order_id.value)
        return _map_from_entity(entity) if entity else None

    def find_active_by_email(self, email: str) -> list[Order]:
        entities = (
            self._session.query(_OrderEntity)
            .filter(
                _OrderEntity.customer_email == email,
                _OrderEntity.status.in_(["pending", "confirmed", "shipped"]),
            )
            .all()
        )
        return [_map_from_entity(e) for e in entities]


class InMemoryOrderRepository(OrderRepository):
    """Test double: keeps orders in a dictionary. Used in unit tests."""

    def __init__(self) -> None:
        self._store: dict[str, Order] = {}

    def save(self, order: Order) -> None:
        self._store[order.order_id.value] = order

    def find_by_id(self, order_id: OrderId) -> Optional[Order]:
        return self._store.get(order_id.value)

    def find_active_by_email(self, email: str) -> list[Order]:
        return [
            o for o in self._store.values()
            if o.customer_email == email and o.is_active
        ]


# ---- DOMAIN SERVICE (orchestrates ports — still pure domain logic) ----

class OrderService:
    """Business logic orchestrating ports. No infrastructure knowledge."""

    def __init__(
        self,
        repository: OrderRepository,
        notification: EmailNotificationPort,
    ) -> None:
        self._repository = repository
        self._notification = notification

    def place_order(self, customer_email: str, total_cents: int) -> Order:
        if not customer_email or "@" not in customer_email:
            raise ValueError("Invalid customer email")
        money = Money(total_cents)
        if not money.is_positive():
            raise ValueError("Order total must be positive")

        order = Order(
            order_id=OrderId(value=f"ORD-{customer_email[:4]}-{id(order):06d}"),
            customer_email=customer_email,
            total=money,
        )
        self._repository.save(order)
        return order

    def confirm_order(self, order_id: OrderId) -> Order:
        order = self._repository.find_by_id(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found")
        order.confirm()
        self._repository.save(order)
        self._notification.send_order_confirmation(order)
        return order
```

**Trade-off analysis:** Hexagonal architecture introduces indirection that adds ~20-30% more code than a monolithic service. Use it when:
- You need testability without infrastructure (most services after month 1)
- You expect to swap technologies (e.g., migrate from MySQL to PostgreSQL)
- Multiple teams share the domain layer

Skip it for scripts, one-off tools, or applications with zero technology evolution expectations.

**Practical note:** Start with a simple layered architecture if you are unsure. Introduce hexagonal boundaries when you first need to swap an infrastructure dependency in tests — that is the natural trigger point.

---

### Pattern 2: Backend-for-Frontend (BFF)

The Backend-for-Frontend pattern creates a dedicated API layer tailored to specific client types (web app, mobile app, partner integrations). Each BFF composes data from multiple downstream microservices and returns exactly the shape the client needs, eliminating over-fetching, under-fetching, and client-side glue logic.

**Core principle:** One API surface per client type, not one API per microservice exposed to all clients.

#### BAD: Exposing Raw Microservice APIs to All Clients

```python
# ❌ BAD: Web frontend must make 5 separate calls to build a dashboard page
# GET /users/{id}            → user profile
# GET /orders?user_id={id}   → order history (paginated, needs manual client-side merge)
# GET /recommendations?user_id={id}  → product recs (different auth token needed)
# GET /inventory?sku_ids=[...]  → stock check on recommended products
# GET /notifications?user_id={id}  → unread count

# Client-side glue:
class BadDashboardClient:
    async def load_dashboard(self, user_id: str):
        profile = await self.user_service.get(user_id)
        orders = await self.order_service.list(user_id, page=1, limit=50)
        recs = await self.recommendation_service.get(user_id)

        # Client must merge and reshape data from different sources
        # Different auth strategies: OAuth for user service, API key for recommendations
        dashboard = {
            "profile": profile,  # Contains fields mobile doesn't need
            "recent_orders": [order["items"][:3] for order in orders],  # Manual slicing
            "recommendations": recs.get("items", [])[:10],  # Manual limit
            # No way to atomically fail — if recommendations is down, dashboard is half-broken
        }
        return dashboard
```

This design forces every client to understand the entire microservice topology and handle partial failures gracefully. Mobile gets bloated payloads from web-tailored endpoints.

#### GOOD: Dedicated BFF Per Client Type

```python
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import asyncio


# ---- CLIENT-TAILORED RESPONSE SHAPES ----

class ClientType(Enum):
    WEB = "web"
    MOBILE = "mobile"
    PARTNER_API = "partner_api"


@dataclass
class OrderSummary:
    """Lean order representation — shared across clients."""
    order_id: str
    total_cents: int
    currency: str
    status: str
    item_count: int
    placed_at: str


@dataclass
class UserProfile:
    user_id: str
    display_name: str
    email: str
    tier: str
    avatar_url: Optional[str] = None


@dataclass
class RecommendationItem:
    product_id: str
    title: str
    price_cents: int
    confidence_score: float
    image_url: Optional[str] = None


@dataclass
class WebDashboardResponse:
    """Full dashboard payload — web clients get rich data."""
    user: UserProfile
    recent_orders: list[OrderSummary]
    recommendations: list[RecommendationItem]
    unread_notifications: int
    account_balance_cents: int
    active_promotions: list[str]


@dataclass
class MobileDashboardResponse:
    """Lean dashboard — mobile clients get minimal payload to conserve bandwidth."""
    user: UserProfile
    recent_orders: list[OrderSummary]
    recommendations: list[RecommendationItem]
    has_notifications: bool  # boolean flag, not full notification list


# ---- DOWNSTREAM SERVICE PORTS (hexagonal ports) ----

class UserServicePort(ABC):
    @abstractmethod
    async def get_profile(self, user_id: str) -> UserProfile: ...


class OrderServicePort(ABC):
    @abstractmethod
    async def get_recent_orders(self, user_id: str, limit: int) -> list[OrderSummary]: ...


class RecommendationServicePort(ABC):
    @abstractmethod
    async def get_recommendations(self, user_id: str, limit: int) -> list[RecommendationItem]: ...


class NotificationServicePort(ABC):
    @abstractmethod
    async def get_unread_count(self, user_id: str) -> int: ...

    @abstractmethod
    async def has_notifications(self, user_id: str) -> bool: ...


class BalanceServicePort(ABC):
    @abstractmethod
    async def get_balance_cents(self, user_id: str) -> int: ...


# ---- BFF COMPOSITION LAYER ----

class WebBffService:
    """Backend-for-Frontend serving the web dashboard client.

    Composes data from 5 downstream services into a single response.
    Runs queries in parallel to minimize latency.
    """

    def __init__(
        self,
        user_service: UserServicePort,
        order_service: OrderServicePort,
        recommendation_service: RecommendationServicePort,
        notification_service: NotificationServicePort,
        balance_service: BalanceServicePort,
    ) -> None:
        self._user = user_service
        self._orders = order_service
        self._recs = recommendation_service
        self._notifications = notification_service
        self._balance = balance_service

    async def get_dashboard(self, user_id: str) -> WebDashboardResponse:
        """Fetch all dashboard data in parallel, with fallback for non-critical paths."""
        try:
            tasks = [
                asyncio.create_task(self._user.get_profile(user_id)),
                asyncio.create_task(self._orders.get_recent_orders(user_id, limit=10)),
                asyncio.create_task(self._recs.get_recommendations(user_id, limit=10)),
                asyncio.create_task(self._notifications.get_unread_count(user_id)),
                asyncio.create_task(self._balance.get_balance_cents(user_id)),
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Extract individual results with error handling per task
            user, orders, recs, unread_count, balance = (
                _extract_result(r) for r in results
            )
        except Exception as e:
            raise DashboardServiceError(f"Failed to compose dashboard: {e}") from e

        promotions = await self._try_get_promotions(user_id)  # Best-effort

        return WebDashboardResponse(
            user=user,
            recent_orders=orders[:5],
            recommendations=recs[:10],
            unread_notifications=unread_count,
            account_balance_cents=balance,
            active_promotions=promotions,
        )


class MobileBffService:
    """Lean BFF for mobile — omits non-essential data paths."""

    def __init__(
        self,
        user_service: UserServicePort,
        order_service: OrderServicePort,
        recommendation_service: RecommendationServicePort,
        notification_service: NotificationServicePort,
    ) -> None:
        self._user = user_service
        self._orders = order_service
        self._recs = recommendation_service
        self._notifications = notification_service

    async def get_dashboard(self, user_id: str) -> MobileDashboardResponse:
        """Mobile dashboard — no balance, no promotions, simplified notifications."""
        try:
            tasks = [
                asyncio.create_task(self._user.get_profile(user_id)),
                asyncio.create_task(self._orders.get_recent_orders(user_id, limit=5)),
                asyncio.create_task(self._recs.get_recommendations(user_id, limit=5)),
                asyncio.create_task(self._notifications.has_notifications(user_id)),
            ]
            user, orders, recs, has_notifs = await asyncio.gather(*tasks)
        except Exception as e:
            raise DashboardServiceError(f"Failed to compose mobile dashboard: {e}") from e

        return MobileDashboardResponse(
            user=user,
            recent_orders=orders,
            recommendations=recs,
            has_notifications=has_notifs,
        )


# ---- HELPERS ----

class DashboardServiceError(Exception):
    """Raised when dashboard composition fails due to critical source unavailability."""


def _extract_result(result: object) -> object:
    if isinstance(result, Exception):
        raise result
    return result


async def _try_get_promotions(user_id: str) -> list[str]:
    """Best-effort promotion fetch — returns empty list on any failure.

    Non-critical path; web dashboard degrades gracefully without promotions.
    This is the BFF's responsibility to isolate client from downstream fragility.
    """
    try:
        # In production, call self._promotion_service.get_active(user_id)
        return ["SUMMER2025"]  # Placeholder for actual call
    except Exception:
        return []
```

**Trade-off analysis:** BFF adds a new service per client type, increasing operational overhead by 1-2 services. Use it when:
- Different clients need substantially different data shapes (web vs mobile)
- Client requires data from 3+ microservices to compose one screen
- You want to shield clients from downstream service evolution

Skip it for single-client apps or where one REST API suffices for all consumers. A well-designed API gateway can sometimes replace a BFF for simple cases.

**Practical note:** Start with one BFF for your primary client (usually web). Add mobile and partner BFFs only when the existing endpoints start causing measurable issues — large payloads on mobile, missing fields in partner integrations. The pattern pays for itself when composition complexity grows beyond 3 downstream calls per endpoint.

---

### Pattern 3: Feature Flag / Toggle Pattern

Feature flags enable behavioral changes to be toggled without code deployment. They support gradual rollouts (percentage-based), audience targeting (user-based), time-based schedules, and kill switches for emergency disables. Combined with audit logging, they provide safe, reversible production changes.

**Core principle:** Every behavioral change controlled by a flag must have an associated expiry date or owner who reviews its usage. Stale flags are technical debt that obscures system behavior.

#### BAD: Hardcoded Boolean Checks With No Lifecycle Management

```python
# ❌ BAD: Inline booleans scattered across codebase — impossible to audit
def process_payment(amount_cents: int, user_id: str) -> dict:
    # Where is this defined? Who owns it? When does it expire?
    USE_NEW_CHECKOUT = True  # Hardcoded — never goes away

    if USE_NEW_CHECKOUT:
        return _process_via_new_gateway(amount_cents, user_id)
    else:
        return _process_via_legacy_gateway(amount_cents, user_id)


def calculate_discount(order_total: float, user_tier: str) -> float:
    # Multiple inline flags with no central registry
    ENABLE_VIP_DISCOUNT = True
    USE_AI_PRICING = False

    if not ENABLE_VIP_DISCOUNT:
        return order_total * 0.10  # Old flat rate

    if user_tier == "gold" or user_tier == "platinum":
        base_discount = 0.25 if not USE_AI_PRICING else _ai_calculated_discount(order_total)
        return order_total * (1 - base_discount)
    return order_total
```

Problems with this approach:
- No way to toggle flags in production without redeploying code
- No audit trail — you cannot answer "who enabled this and when?"
- No expiry mechanism — flags accumulate as zombie code that nobody remembers
- Tests run both branches simultaneously, creating unpredictable behavior

#### GOOD: Centralized Flag Engine With Strategies And Audit Logging

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


# ---- DOMAIN MODEL FOR FEATURE FLAGS ----

class RolloutStrategy(Enum):
    """How traffic is distributed across flag states."""
    ALL_ON = "all_on"
    ALL_OFF = "all_off"
    PERCENTAGE = "percentage"           # X% of users see the new behavior
    USER_BASED = "user_based"           # Specific user IDs or segments
    TIME_BASED = "time_based"           # On/off during specific windows
    A/B_TEST = "ab_test"                # Percentage split with experiment tracking


@dataclass(frozen=True)
class FlagCondition:
    """A single condition that must evaluate to True for the flag to be ON."""
    strategy: RolloutStrategy
    parameter: Any  # Varies by strategy: int for percentage, list[str] for user IDs

    @property
    def is_always_on(self) -> bool:
        return self.strategy == RolloutStrategy.ALL_ON

    @property
    def is_always_off(self) -> bool:
        return self.strategy == RolloutStrategy.ALL_OFF


@dataclass
class FeatureFlag:
    """Central feature flag definition with lifecycle metadata."""
    key: str
    description: str
    owner: str  # Team or individual responsible for this flag
    conditions: list[FlagCondition]
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Required — no permanent flags
    is_enabled: bool = True               # Kill switch
    environment: str = "production"       # Environment-scoped

    def validate(self) -> None:
        """Ensure flag meets governance requirements."""
        if not self.key or not self.description:
            raise ValueError("Flag key and description are required")
        if not self.owner:
            raise ValueError("Every flag must have an owner")
        if self.expires_at and self.expires_at < datetime.utcnow():
            raise ValueError(f"Flag '{self.key}' has expired")


# ---- AUDIT LOGGING ----

@dataclass(frozen=True)
class FlagAuditEvent:
    """Immutable record of every flag evaluation for traceability."""
    timestamp: datetime
    flag_key: str
    user_id: Optional[str]
    evaluated_value: bool
    reason: str  # Why the flag was ON or OFF


# ---- FLAG EVALUATION ENGINE ----

class FlagStore(ABC):
    """Port: storage and retrieval of feature flags."""

    @abstractmethod
    def get_flag(self, key: str) -> Optional[FeatureFlag]: ...

    @abstractmethod
    def set_flag_state(self, key: str, is_enabled: bool, reason: str = "") -> None: ...


class InMemoryFlagStore(FlagStore):
    """Concrete in-memory implementation for tests and simple deployments."""

    def __init__(self) -> None:
        self._flags: dict[str, FeatureFlag] = {}

    def get_flag(self, key: str) -> Optional[FeatureFlag]:
        return self._flags.get(key)

    def set_flag_state(self, key: str, is_enabled: bool, reason: str = "") -> None:
        if key in self._flags:
            flag = self._flags[key]
            flag.is_enabled = is_enabled
        # In production, this would persist to a database or config service


class FlagEvaluator:
    """Evaluates feature flags with rollout strategies and audit logging.

    Thread-safe evaluation with deterministic user hashing for percentage-based rollouts.
    """

    def __init__(self, flag_store: FlagStore) -> None:
        self._store = flag_store
        self._audit_log: list[FlagAuditEvent] = []

    def is_enabled(
        self,
        flag_key: str,
        user_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> bool:
        """Evaluate a feature flag for a specific user context.

        Evaluation order:
        1. Check if flag exists and is globally enabled (kill switch)
        2. Evaluate conditions based on rollout strategy
        3. Log the evaluation result to the audit trail
        """
        flag = self._store.get_flag(flag_key)

        # Guard: flag not found or globally disabled
        if flag is None or not flag.is_enabled:
            self._audit_log.append(FlagAuditEvent(
                timestamp=datetime.utcnow(),
                flag_key=flag_key,
                user_id=user_id,
                evaluated_value=False,
                reason="flag_not_found_or_disabled",
            ))
            return False

        # Validate governance rules
        try:
            flag.validate()
        except ValueError as e:
            self._audit_log.append(FlagAuditEvent(
                timestamp=datetime.utcnow(),
                flag_key=flag_key,
                user_id=user_id,
                evaluated_value=False,
                reason=f"governance_violation: {e}",
            ))
            return False

        # Evaluate against each condition — all must pass (AND logic)
        for condition in flag.conditions:
            if not self._evaluate_condition(condition, user_id, metadata or {}):
                self._audit_log.append(FlagAuditEvent(
                    timestamp=datetime.utcnow(),
                    flag_key=flag_key,
                    user_id=user_id,
                    evaluated_value=False,
                    reason=f"condition_failed: {condition.strategy.value}",
                ))
                return False

        # All conditions passed — flag is ON
        self._audit_log.append(FlagAuditEvent(
            timestamp=datetime.utcnow(),
            flag_key=flag_key,
            user_id=user_id,
            evaluated_value=True,
            reason="all_conditions_met",
        ))
        return True

    def get_audit_log(self) -> list[FlagAuditEvent]:
        """Return the evaluation audit trail for this session."""
        return list(self._audit_log)

    # ---- STRATEGY EVALUATORS ----

    def _evaluate_condition(
        self,
        condition: FlagCondition,
        user_id: Optional[str],
        metadata: dict[str, Any],
    ) -> bool:
        """Evaluate a single rollout strategy condition."""
        match condition.strategy:
            case RolloutStrategy.ALL_ON:
                return True
            case RolloutStrategy.ALL_OFF:
                return False
            case RolloutStrategy.PERCENTAGE:
                percentage = condition.parameter  # type: ignore[assignment]
                if user_id is None:
                    return False
                return self._hash_to_percentage(user_id) <= percentage

            case RolloutStrategy.USER_BASED:
                allowed_users = set(condition.parameter)  # type: ignore[arg-type]
                if user_id is None:
                    return False
                return user_id in allowed_users

            case RolloutStrategy.TIME_BASED:
                start = metadata.get("start_time")
                end = metadata.get("end_time")
                now = datetime.utcnow()
                if start and now < start:
                    return False
                if end and now > end:
                    return False
                return True

            case RolloutStrategy.A_B_TEST:
                group = condition.parameter  # type: ignore[assignment]
                if user_id is None:
                    return False
                bucket = self._hash_to_bucket(user_id)
                return bucket == group

            case _:
                return False

    @staticmethod
    def _hash_to_percentage(user_id: str) -> int:
        """Deterministic hash to [0, 99] for percentage-based rollouts."""
        return abs(hash(user_id)) % 100

    @staticmethod
    def _hash_to_bucket(user_id: str) -> int:
        """Deterministic hash to group A or B (0 or 1)."""
        return abs(hash(user_id)) % 2


# ---- USAGE EXAMPLE IN BUSINESS CODE ----

class PaymentProcessor:
    """Business code that delegates behavioral decisions to the flag engine.

    The service has zero knowledge of how flags are stored — it only calls
    evaluator.is_enabled() with a flag key and user context.
    """

    def __init__(self, flag_evaluator: FlagEvaluator) -> None:
        self._flags = flag_evaluator

    def process(self, amount_cents: int, user_id: str) -> dict:
        if self._flags.is_enabled("use_new_checkout_gateway", user_id=user_id):
            return self._process_via_new_gateway(amount_cents, user_id)
        else:
            return self._process_via_legacy_gateway(amount_cents, user_id)

    def _process_via_new_gateway(self, amount_cents: int, user_id: str) -> dict:
        # New checkout flow — can be toggled without redeployment
        return {"status": "processed", "gateway": "new", "amount_cents": amount_cents}

    def _process_via_legacy_gateway(self, amount_cents: int, user_id: str) -> dict:
        # Legacy checkout flow — deprecated but still active for some users
        return {"status": "processed", "gateway": "legacy", "amount_cents": amount_cents}
```

**Trade-off analysis:** Feature flags add complexity to code paths (every flag introduces a branch). Use them when:
- You need to toggle behavior in production without deploys
- Running A/B tests or gradual percentage rollouts
- Building kill switches for high-risk features

Skip them for simple on/off configuration that rarely changes — environment variables and config files are lighter weight. Never use flags as a substitute for proper configuration management.

**Practical note:** Every flag must have an `expires_at` date. Set it to 30 days after creation. Add automated cleanup that disables expired flags and alerts their owners. Stale flags make debugging impossible because the code paths diverge permanently.

---

### Pattern 4: CQRS with Event Sourcing Projections

Command Query Responsibility Segregation (CQRS) separates write operations (commands) from read operations (queries). When combined with event sourcing, every state mutation is stored as an immutable sequence of events. Read projections are built asynchronously by replaying these events into optimized materialized views. This pattern enables full audit trails, temporal queries, and independently scaling read and write models.

**Core principle:** Commands mutate state through events; queries read from denormalized projections that are derived from those events. The event store is the single source of truth — projections are disposable and rebuildable.

#### BAD: Monolithic ORM Model With All Reads and Writes Mixed

```python
# ❌ BAD: Single model handles both complex writes and optimized reads
class OrderModel(Base):  # SQLAlchemy model serves dual role
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    status = Column(String(20))
    items = Column(JSON)  # JSON blob — hard to query individually
    customer_id = Column(Integer)
    total_cents = Column(Integer)
    updated_at = Column(DateTime)

class OrderRepository:
    """Tries to serve every read pattern from one model."""
    def get_order(self, order_id: int):  # Simple lookup — fine
        return self.session.query(OrderModel).get(order_id)

    def get_orders_with_items_by_customer(
        self, customer_id: int  # Requires JOIN with separate items table
    ):
        # Needs eager loading to avoid N+1 — performance degrades fast
        return (
            self.session.query(OrderModel)
            .options(joinedload(OrderModel.items))
            .filter(OrderModel.customer_id == customer_id)
            .all()
        )

    def get_daily_revenue_report(self):  # Aggregation query on same table
        # This query scans the entire table and groups — competes with OLTP queries
        return (
            self.session.query(
                func.date(OrderModel.updated_at).label("day"),
                func.sum(OrderModel.total_cents).label("revenue")
            )
            .group_by("day")
            .all()
        )

    def place_order(self, ...):  # Write logic mixed into same repository
        pass  # Would contain validation, state transitions, persistence — all intertwined
```

This design fails when:
- Read queries compete with write transactions for the same database connection pool
- You need to audit who changed what and when — the model only stores current state
- Read and write scaling needs diverge (read-heavy analytics on write-heavy transactional data)
- Complex invariants span multiple aggregates

#### GOOD: CQRS With Event Sourcing And Projection-Based Reads

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


# ---- EVENT SOURCING CORE (immutable events) ----

class DomainEvent:
    """Base class for all domain events. Immutable and timestamped."""

    def __init__(self, aggregate_id: str, occurred_at: Optional[datetime] = None):
        self.aggregate_id = aggregate_id
        self.occurred_at = occurred_at or datetime.utcnow()


@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    """Event: an order was created with initial state."""
    customer_email: str
    total_cents: int
    currency: str = "USD"


@dataclass(frozen=True)
class OrderItemsAdded(DomainEvent):
    """Event: items were added to an existing order (before confirmation)."""
    item_count: int
    additional_cents: int


@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    """Event: order moved to confirmed state."""
    confirmed_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class OrderCancelled(DomainEvent):
    """Event: order was cancelled."""
    reason: str
    cancelled_at: datetime = field(default_factory=datetime.utcnow)


# ---- AGGREGATE ROOT (rebuilds state from events) ----

class AggregateRoot:
    """Base class providing event sourcing infrastructure for aggregates."""

    def __init__(self, aggregate_id: str):
        self.aggregate_id = aggregate_id
        self._domain_events: list[DomainEvent] = []  # Uncommitted events

    @abstractmethod
    def apply_event(self, event: DomainEvent) -> None: ...

    def record_event(self, event: DomainEvent) -> None:
        """Record an event for later persistence and emit."""
        self.apply_event(event)
        self._domain_events.append(event)

    @property
    def domain_events(self) -> list[DomainEvent]:
        """Return uncommitted events to be persisted."""
        return list(self._domain_events)

    def clear_pending_events(self) -> None:
        """Clear committed events after persistence."""
        self._domain_events.clear()


class Order(AggregateRoot):
    """Aggregate root that reconstructs state from events.

    State is never set directly — it is always derived from applying events.
    This ensures the event store is the single source of truth.
    """

    def __init__(self, aggregate_id: str) -> None:
        super().__init__(aggregate_id)
        self.customer_email = ""
        self.total_cents = 0
        self.status = "pending"
        self.confirmed_at: Optional[datetime] = None
        self.cancelled_at: Optional[datetime] = None

    # ---- COMMAND METHODS (these generate events, do not persist) ----

    def create(
        self,
        customer_email: str,
        total_cents: int,
        currency: str = "USD",
    ) -> None:
        if not customer_email or "@" not in customer_email:
            raise ValueError("Invalid customer email")
        if total_cents <= 0:
            raise ValueError("Total must be positive")

        self.customer_email = customer_email
        self.total_cents = total_cents
        self.currency = currency
        self.record_event(OrderCreated(
            aggregate_id=self.aggregate_id,
            customer_email=customer_email,
            total_cents=total_cents,
            currency=currency,
        ))

    def confirm(self) -> None:
        if self.status != "pending":
            raise ValueError(f"Cannot confirm order in '{self.status}' state")
        self.status = "confirmed"
        self.confirmed_at = datetime.utcnow()
        self.record_event(OrderConfirmed(aggregate_id=self.aggregate_id))

    def cancel(self, reason: str) -> None:
        if self.status == "shipped":
            raise ValueError("Cannot cancel a shipped order")
        self.status = "cancelled"
        self.cancelled_at = datetime.utcnow()
        self.record_event(OrderCancelled(
            aggregate_id=self.aggregate_id,
            reason=reason,
        ))

    # ---- EVENT APPLICATION (reconstructs state from each event type) ----

    def apply_event(self, event: DomainEvent) -> None:
        match event:
            case OrderCreated():
                self.customer_email = event.customer_email
                self.total_cents = event.total_cents
                self.currency = event.currency
                self.status = "pending"

            case OrderItemsAdded():
                self.total_cents += event.additional_cents

            case OrderConfirmed():
                self.status = "confirmed"
                self.confirmed_at = event.confirmed_at

            case OrderCancelled():
                self.status = "cancelled"
                self.cancelled_at = event.cancelled_at


# ---- EVENT STORE (port + concrete implementation) ----

class EventStore(ABC):
    """Port: persists and retrieves event streams by aggregate ID."""

    @abstractmethod
    def append_events(self, aggregate_id: str, events: list[DomainEvent]) -> int:
        """Append uncommitted events. Returns the new stream version."""
        ...

    @abstractmethod
    def load_stream(
        self, aggregate_id: str, from_version: int = 0
    ) -> tuple[list[DomainEvent], int]:
        """Load all events from a specific version onward. Returns (events, current_version)."""
        ...


class InMemoryEventStore(EventStore):
    """In-memory event store for testing and prototyping."""

    def __init__(self) -> None:
        self._streams: dict[str, list[tuple[DomainEvent, int]]] = {}  # agg_id -> [(event, version)]

    def append_events(self, aggregate_id: str, events: list[DomainEvent]) -> int:
        if aggregate_id not in self._streams:
            self._streams[aggregate_id] = []

        current_version = len(self._streams[aggregate_id])
        for i, event in enumerate(events):
            self._streams[aggregate_id].append((event, current_version + i + 1))

        return current_version + len(events)

    def load_stream(
        self, aggregate_id: str, from_version: int = 0
    ) -> tuple[list[DomainEvent], int]:
        if aggregate_id not in self._streams:
            return [], 0

        events = [ev for ev, ver in self._streams[aggregate_id] if ver > from_version]
        current_version = max((ver for _, ver in self._streams[aggregate_id]), default=0)
        return events, current_version


# ---- COMMAND SIDE (write model) ----

class OrderCommandHandler:
    """Handles commands that mutate order state.

    Commands create and persist events. The read model is updated asynchronously.
    """

    def __init__(self, event_store: EventStore) -> None:
        self._event_store = event_store

    def create_order(self, aggregate_id: str, email: str, total_cents: int) -> Order:
        order = Order(aggregate_id=aggregate_id)
        order.create(email, total_cents)

        # Persist events atomically
        version = self._event_store.append_events(aggregate_id, order.domain_events)
        order.clear_pending_events()

        # In production: publish domain events to an event bus here
        return order

    def confirm_order(self, aggregate_id: str) -> Order:
        events, _ = self._event_store.load_stream(aggregate_id)
        order = Order(aggregate_id)
        for event in events:
            order.apply_event(event)

        order.confirm()
        version = self._event_store.append_events(aggregate_id, order.domain_events)
        order.clear_pending_events()
        return order


# ---- QUERY SIDE (projection — read model) ----

@dataclass
class OrderProjectionRow:
    """Materialized view row optimized for common query patterns."""
    order_id: str
    customer_email: str
    status: str
    total_cents: int
    confirmed_at: Optional[str] = None  # ISO format for JSON serialization
    cancelled_at: Optional[str] = None


class OrderProjectionStore(ABC):
    """Port: stores and queries materialized projections."""

    @abstractmethod
    def upsert(self, row: OrderProjectionRow) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: str) -> Optional[OrderProjectionRow]: ...

    @abstractmethod
    def find_by_customer_email(self, email: str) -> list[OrderProjectionRow]: ...

    @abstractmethod
    def find_all_in_status(self, status: str) -> list[OrderProjectionRow]: ...


class InMemoryProjectionStore(OrderProjectionStore):
    """In-memory projection for testing."""

    def __init__(self) -> None:
        self._by_id: dict[str, OrderProjectionRow] = {}
        self._by_email: dict[str, list[OrderProjectionRow]] = {}

    def upsert(self, row: OrderProjectionRow) -> None:
        self._by_id[row.order_id] = row
        if row.customer_email not in self._by_email:
            self._by_email[row.customer_email] = []
        existing = [r for r in self._by_email[row.customer_email] if r.order_id != row.order_id]
        self._by_email[row.customer_email] = existing + [row]

    def find_by_id(self, order_id: str) -> Optional[OrderProjectionRow]:
        return self._by_id.get(order_id)

    def find_by_customer_email(self, email: str) -> list[OrderProjectionRow]:
        return list(self._by_email.get(email, []))

    def find_all_in_status(self, status: str) -> list[OrderProjectionRow]:
        return [r for r in self._by_id.values() if r.status == status]


class ProjectionRebuilder:
    """Applies domain events to rebuild projection rows asynchronously.

    In production, this runs as a background worker that consumes the event bus.
    For testing, it can be invoked synchronously.
    """

    def __init__(self, projection_store: OrderProjectionStore) -> None:
        self._store = projection_store

    def handle_event(self, event: DomainEvent) -> None:
        """Rebuild projection row from a single domain event."""
        match event:
            case OrderCreated():
                row = OrderProjectionRow(
                    order_id=event.aggregate_id,
                    customer_email=event.customer_email,
                    status="pending",
                    total_cents=event.total_cents,
                )
                self._store.upsert(row)

            case OrderConfirmed():
                existing = self._store.find_by_id(event.aggregate_id)
                if existing:
                    existing.status = "confirmed"
                    existing.confirmed_at = event.confirmed_at.isoformat() if isinstance(event.confirmed_at, datetime) else event.confirmed_at
                    self._store.upsert(existing)

            case OrderCancelled():
                existing = self._store.find_by_id(event.aggregate_id)
                if existing:
                    existing.status = "cancelled"
                    existing.cancelled_at = event.cancelled_at.isoformat() if isinstance(event.cancelled_at, datetime) else event.cancelled_at
                    self._store.upsert(existing)

    def rebuild_all(self, events: list[DomainEvent]) -> None:
        """Rebuild projections from a batch of events (e.g., after system restart)."""
        for event in events:
            self.handle_event(event)


# ---- QUERY HANDLER (read model — isolated from writes) ----

class OrderQueryHandler:
    """Handles read queries against materialized projections.

    Has no knowledge of the write side, events, or command handlers.
    Operates purely on denormalized projection data.
    """

    def __init__(self, projection_store: OrderProjectionStore) -> None:
        self._store = projection_store

    def get_order(self, order_id: str) -> Optional[OrderProjectionRow]:
        return self._store.find_by_id(order_id)

    def get_customer_orders(self, email: str) -> list[OrderProjectionRow]:
        return self._store.find_by_customer_email(email)

    def get_orders_in_status(self, status: str) -> list[OrderProjectionRow]:
        return self._store.find_all_in_status(status)
```

**Trade-off analysis:** CQRS with event sourcing significantly increases code complexity — every command must produce events, projections must be maintained, and consistency is eventually rather than immediately guaranteed. Use it when:
- You need a complete audit trail of all state mutations (financial compliance, healthcare)
- Read and write workloads have different scaling characteristics (e.g., 10:1 read/write ratio)
- You need temporal queries ("what was the state on date X?")
- Multiple aggregates need to react to the same events via a pub/sub system

Skip it for simple CRUD apps where eventual consistency would confuse users and audit requirements are minimal.

**Practical note:** Start with CQRS without event sourcing — separate command and query handlers but keep the same data store. If you then find you need audit trails or temporal queries, add event sourcing on top. Adding ES to an existing CQRS system is cleaner than adding CQRS to an existing ES system.

---

### Pattern 5: API Composition Pattern

The API composition pattern aggregates responses from multiple microservice endpoints into a single unified response at the application layer. Unlike GraphQL which requires schema changes and separate tooling, API composition uses standard REST endpoints and composes them in code using concurrent HTTP calls with per-endpoint timeout and fallback strategies.

**Core principle:** Each downstream service owns its data model and exposes clean REST endpoints. The composition layer orchestrates calls concurrently, handles partial failures gracefully, and returns a unified response shaped for the caller.

#### BAD: Client-Side Composition With No Resilience

```python
# ❌ BAD: Each client duplicates the composition logic with no error handling
async def get_user_with_orders(client: httpx.AsyncClient, user_id: str):
    # Sequential calls — latency adds up linearly
    profile = await client.get(f"/users/{user_id}")  # 50ms
    orders = await client.get(f"/orders?user_id={user_id}")  # 80ms
    preferences = await client.get(f"/preferences/user/{user_id}")  # 40ms

    return {
        "profile": profile.json(),
        "orders": orders.json()["items"],
        "preferences": preferences.json(),
        # What happens if /preferences is down? The entire response fails.
        # No timeout → request hangs indefinitely if service is slow.
    }


async def get_dashboard_data(client: httpx.AsyncClient, user_id: str):
    """Another client duplicating composition with its own logic."""
    tasks = [
        client.get(f"/users/{user_id}"),
        client.get(f"/orders/latest/{user_id}"),
        client.get(f"/notifications/count?user_id={user_id}"),
        client.get(f"/analytics/profile/{user_id}"),
        # No individual timeouts — one slow service blocks everything
    ]
    responses = await asyncio.gather(*tasks)

    # All-or-nothing: if analytics is down, dashboard fails entirely
    return {
        "profile": responses[0].json(),
        "orders": responses[1].json(),
        "notification_count": responses[2].json()["count"],
        "analytics": responses[3].json(),
        # Client has no way to get partial data
    }
```

Problems:
- Composition logic is duplicated across every client (web, mobile, batch jobs)
- No per-service timeout — a single slow service blocks the entire response
- All-or-nothing failure model — one unavailable service breaks everything
- No fallback or default values for degraded responses

#### GOOD: Centralized Composition With Concurrency And Fallbacks

```python
from dataclasses import dataclass, field
from typing import Any, Optional
import httpx
import asyncio


@dataclass
class CompositionResult[T]:
    """Generic wrapper that captures success or partial failure of a composition step."""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    timeout_ms: int = 0

    @property
    def is_degraded(self) -> bool:
        return not self.success and self.data is not None


@dataclass
class UserProfileResponse:
    user_id: str
    display_name: str
    email: str
    tier: str


@dataclass
class OrderSummaryResponse:
    order_id: str
    total_cents: int
    status: str
    placed_at: str


@dataclass
class NotificationCountResponse:
    unread_count: int


@dataclass
class AnalyticsSummaryResponse:
    page_views_last_30d: int
    last_login: str


@dataclass
class DashboardAggregateResponse:
    """Unified response composed from multiple microservice endpoints."""
    user: UserProfileResponse
    recent_orders: list[OrderSummaryResponse] = field(default_factory=list)
    notifications_count: int = 0
    analytics: Optional[AnalyticsSummaryResponse] = None
    degraded_sources: list[str] = field(default_factory=list)

    @property
    def is_fully_available(self) -> bool:
        return len(self.degraded_sources) == 0


class ServiceClient(ABC):
    """Abstract port for downstream microservice clients."""

    def __init__(self, base_url: str, timeout_ms: int = 3000):
        self.base_url = base_url
        self.timeout_ms = timeout_ms

    @property
    @abstractmethod
    def service_name(self) -> str: ...

    @abstractmethod
    async def fetch(self) -> Any: ...


class UserServiceClient(ServiceClient):
    """HTTP client for the User microservice."""

    @property
    def service_name(self) -> str:
        return "user-service"

    def __init__(self, base_url: str, user_id: str, timeout_ms: int = 3000):
        super().__init__(base_url, timeout_ms)
        self.user_id = user_id

    async def fetch(self) -> UserProfileResponse:
        """Fetch user profile from the user service."""
        url = f"{self.base_url}/users/{self.user_id}"
        async with httpx.AsyncClient(timeout=httpx.Timeout(seconds=self.timeout_ms / 1000)) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return UserProfileResponse(
                user_id=data["id"],
                display_name=data["display_name"],
                email=data["email"],
                tier=data.get("tier", "free"),
            )


class OrderServiceClient(ServiceClient):
    """HTTP client for the Order microservice."""

    @property
    def service_name(self) -> str:
        return "order-service"

    def __init__(self, base_url: str, user_id: str, limit: int = 5, timeout_ms: int = 3000):
        super().__init__(base_url, timeout_ms)
        self.user_id = user_id
        self.limit = limit

    async def fetch(self) -> list[OrderSummaryResponse]:
        """Fetch recent orders for the user."""
        url = f"{self.base_url}/orders/latest"
        params = {"user_id": self.user_id, "limit": self.limit}
        async with httpx.AsyncClient(timeout=httpx.Timeout(seconds=self.timeout_ms / 1000)) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            items = response.json().get("items", [])
            return [
                OrderSummaryResponse(
                    order_id=item["id"],
                    total_cents=item["total_cents"],
                    status=item["status"],
                    placed_at=item["placed_at"],
                )
                for item in items[: self.limit]
            ]


class NotificationServiceClient(ServiceClient):
    """HTTP client for the Notification microservice."""

    @property
    def service_name(self) -> str:
        return "notification-service"

    def __init__(self, base_url: str, user_id: str, timeout_ms: int = 2000):
        super().__init__(base_url, timeout_ms)
        self.user_id = user_id

    async def fetch(self) -> NotificationCountResponse:
        """Fetch unread notification count."""
        url = f"{self.base_url}/notifications/count"
        params = {"user_id": self.user_id}
        async with httpx.AsyncClient(timeout=httpx.Timeout(seconds=self.timeout_ms / 1000)) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return NotificationCountResponse(unread_count=data.get("count", 0))


class AnalyticsServiceClient(ServiceClient):
    """HTTP client for the Analytics microservice (best-effort, non-critical)."""

    @property
    def service_name(self) -> str:
        return "analytics-service"

    def __init__(self, base_url: str, user_id: str, timeout_ms: int = 1500):
        super().__init__(base_url, timeout_ms)
        self.user_id = user_id

    async def fetch(self) -> AnalyticsSummaryResponse:
        """Fetch analytics summary — fails gracefully if service is unavailable."""
        url = f"{self.base_url}/analytics/profile/{self.user_id}"
        async with httpx.AsyncClient(timeout=httpx.Timeout(seconds=self.timeout_ms / 1000)) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return AnalyticsSummaryResponse(
                page_views_last_30d=data.get("page_views", 0),
                last_login=data.get("last_login", ""),
            )


class ApiResponseCompositionError(Exception):
    """Raised when all composition sources fail."""


class DashboardApiComposer:
    """Composes multiple microservice responses into a unified dashboard response.

    Executes all service calls concurrently with individual timeouts.
    Partial failures degrade gracefully — the caller gets whatever data was available.
    """

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url

    async def compose_dashboard(
        self,
        user_id: str,
        order_limit: int = 5,
    ) -> DashboardAggregateResponse:
        """Compose dashboard data from all downstream services concurrently.

        Strategy:
        - Critical sources (user, orders, notifications) are required — return error if all fail
        - Non-critical sources (analytics) are best-effort — silently degrade on failure
        - Each call has an individual timeout to prevent cascade delays
        """
        # Create service clients with appropriate timeouts
        critical_tasks = [
            UserServiceClient(self.base_url, user_id, timeout_ms=3000),
            OrderServiceClient(self.base_url, user_id, limit=order_limit, timeout_ms=3000),
            NotificationServiceClient(self.base_url, user_id, timeout_ms=2000),
        ]

        # Execute critical sources concurrently with error isolation
        results: list[CompositionResult] = await asyncio.gather(
            *(self._execute_with_error_handling(client) for client in critical_tasks),
            return_exceptions=True,
        )

        user_result, orders_result, notifications_result = results

        # Build response from successful results
        degraded_sources = []
        for r in results:
            if r.is_degraded or not r.success:
                degraded_sources.append(r.error or "unknown")

        # Parse individual results
        user = user_result.data if isinstance(user_result.data, UserProfileResponse) else None
        orders = orders_result.data if isinstance(orders_result.data, list) else []
        notifications = notifications_result.data

        if not user:
            raise ApiResponseCompositionError(
                f"All critical sources failed for user {user_id}. "
                f"Degraded: {degraded_sources}"
            )

        # Non-critical source (analytics) — best effort, never fails the overall response
        analytics_client = AnalyticsServiceClient(self.base_url, user_id, timeout_ms=1500)
        analytics_result = await self._execute_with_error_handling(analytics_client)

        analytics: Optional[AnalyticsSummaryResponse] = None
        if analytics_result.success and isinstance(analytics_result.data, AnalyticsSummaryResponse):
            analytics = analytics_result.data
        elif analytics_result.is_degraded:
            degraded_sources.append("analytics (partial)")

        return DashboardAggregateResponse(
            user=user,
            recent_orders=orders or [],
            notifications_count=(
                notifications.unread_count if isinstance(notifications, NotificationCountResponse) else 0
            ),
            analytics=analytics,
            degraded_sources=degraded_sources,
        )

    async def _execute_with_error_handling(self, client: ServiceClient) -> CompositionResult[Any]:
        """Execute a single service call with timeout and error wrapping."""
        start_time = asyncio.get_event_loop().time() * 1000

        try:
            data = await asyncio.wait_for(
                client.fetch(),
                timeout=client.timeout_ms / 1000,
            )
            elapsed = int(asyncio.get_event_loop().time() * 1000 - start_time)
            return CompositionResult(success=True, data=data, timeout_ms=elapsed)

        except asyncio.TimeoutError:
            return CompositionResult(
                success=False,
                error=f"timeout after {client.timeout_ms}ms from {client.service_name}",
            )

        except httpx.HTTPStatusError as e:
            return CompositionResult(
                success=False,
                error=f"HTTP {e.response.status_code} from {client.service_name}: {e}",
            )

        except httpx.RequestError as e:
            return CompositionResult(
                success=False,
                error=f"request error from {client.service_name}: {e}",
            )

        except Exception as e:
            return CompositionResult(
                success=False,
                error=f"unexpected error from {client.service_name}: {type(e).__name__}: {e}",
            )
```

**Trade-off analysis:** API composition adds network hops compared to a single monolithic endpoint — each additional service call introduces latency and failure surface area. Use it when:
- Data comes from 3+ independently deployed services with different owners
- You need to preserve service boundaries (not merge services into one)
- Different teams own the downstream APIs and cannot share schemas

Skip it for data that lives in a single database — a well-designed REST endpoint on the owning service is simpler than composing HTTP calls.

**Practical note:** Always set per-service timeouts shorter than your overall API timeout budget (e.g., 3s per service with 10s total budget). Use circuit breakers for non-critical services so repeated failures do not exhaust connection pools. The analytics example demonstrates the best-effort pattern: degrade silently rather than fail the entire response.

---

### Pattern 6: Sidecar Pattern

The sidecar pattern wraps a primary service with a decorator that handles cross-cutting concerns (logging, metrics, retries, circuit breaking) without polluting business logic. The decorator intercepts calls before they reach the core and after they return, applying infrastructure-level behaviors transparently. This keeps the domain pure while ensuring consistent observability and resilience.

**Core principle:** Infrastructure concerns are implemented as decorators that wrap service interfaces at runtime — not via inheritance, base classes, or framework annotations in the domain layer.

#### BAD: Cross-Cutting Concerns Scattered As Framework Annotations

```python
# ❌ BAD: Business logic polluted with infrastructure concerns
from flask import Flask, jsonify  # Imports web framework into business layer
import logging
import time


class OrderController:
    """Every method repeats the same logging, timing, and error handling patterns."""
    logger = logging.getLogger(__name__)

    @app.route("/orders/<order_id>")  # Hard dependency on Flask routing
    def get_order(self, order_id: str):
        start = time.time()  # Timing duplicated across every method

        try:
            self.logger.info(f"Fetching order {order_id}")  # Logging duplicated
            order = self.order_service.get(order_id)  # Business logic
            result = {"order": serialize(order)}
            return jsonify(result), 200

        except OrderNotFound:
            self.logger.warning(f"Order {order_id} not found")  # Error handling repeated
            return jsonify({"error": "not_found"}), 404

        except Exception as e:
            self.logger.error(f"Unexpected error for order {order_id}: {e}")  # Generic catch-all
            return jsonify({"error": "internal_error"}), 500
        finally:
            elapsed = time.time() - start  # Timing finally block duplicated
            self.logger.info(f"GET /orders/{order_id} took {elapsed:.3f}s")


class OrderController2:  # Another controller, same duplication pattern
    logger = logging.getLogger(__name__)

    @app.route("/orders", methods=["POST"])
    def create_order(self):
        start = time.time()
        try:
            self.logger.info("Creating new order")
            data = request.json
            order = self.order_service.create(data)
            return jsonify({"order": serialize(order)}), 201
        except ValueError as e:
            self.logger.warning(f"Validation error: {e}")
            return jsonify({"error": str(e)}), 400
        finally:
            elapsed = time.time() - start
```

This design violates separation of concerns:
- Every new endpoint requires copying the same logging, timing, and error handling boilerplate
- The service class depends on Flask (cannot be tested or reused outside HTTP)
- Adding metrics, retries, or circuit breaking requires modifying every single method
- Business logic authors must understand infrastructure patterns

#### GOOD: Sidecar Decorator That Wraps Service Interfaces Transparently

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
import logging
import random
import time
import asyncio
from typing import Any, Callable, TypeVar


# ---- DOMAIN TYPES (pure — no infrastructure imports) ----

T = TypeVar("T")

@dataclass
class Order:
    """Pure domain value object."""
    order_id: str
    customer_email: str
    total_cents: int
    status: str


class OrderNotFound(Exception):
    """Raised when a requested order ID does not exist in the store."""


# ---- SERVICE PORT (domain abstraction) ----

class OrderServicePort(ABC):
    """Interface that the sidecar decorates. Domain code depends on this, not implementations."""

    @abstractmethod
    def get_order(self, order_id: str) -> Order: ...

    @abstractmethod
    def create_order(self, customer_email: str, total_cents: int) -> Order: ...


class InMemoryOrderService(OrderServicePort):
    """Simple in-memory implementation for illustration."""

    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    def get_order(self, order_id: str) -> Order:
        order = self._orders.get(order_id)
        if order is None:
            raise OrderNotFound(f"Order {order_id} not found")
        return order

    def create_order(self, customer_email: str, total_cents: int) -> Order:
        import uuid
        order_id = f"ORD-{uuid.uuid4().hex[:8]}"
        order = Order(
            order_id=order_id,
            customer_email=customer_email,
            total_cents=total_cents,
            status="pending",
        )
        self._orders[order_id] = order
        return order


# ---- SIDECHAIN CONCERN TYPES ----

class LogLevel(Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior."""
    failure_threshold: int = 5          # Failures before opening circuit
    recovery_timeout: timedelta = timedelta(seconds=30)  # Wait before half-open
    half_open_max_calls: int = 1         # Test calls in half-open state


# ---- LOGGING SIDECAR ----

def with_logging(
    service_name: str,
    logger: Optional[logging.Logger] = None,
    log_level: LogLevel = LogLevel.INFO,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Sidecar decorator: logs entry/exit of every decorated method.

    Records method name, arguments (redacted for sensitive data), return type, and duration.
    """
    _logger = logger or logging.getLogger(f"sidecar.{service_name}")

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            method_name = func.__qualname__
            args_repr = _sanitize_args(args, kwargs)

            _logger.log(
                self=_get_log_level(log_level),
                msg=f"▶ {method_name} called with args={args_repr}",
            )

            start = time.monotonic()
            try:
                result = func(*args, **kwargs)
                duration = time.monotonic() - start
                _logger.log(
                    self=_get_log_level(log_level),
                    msg=f"◀ {method_name} completed successfully in {duration:.4f}s → {type(result).__name__}",
                )
                return result

            except Exception as e:
                duration = time.monotonic() - start
                _logger.error(
                    f"✗ {method_name} failed after {duration:.4f}s: {type(e).__name__}: {e}",
                    exc_info=True,
                )
                raise

        return wrapper
    return decorator


def _sanitize_args(args: tuple, kwargs: dict) -> str:
    """Redact sensitive information from argument logging."""
    sensitive_keys = {"password", "token", "secret", "api_key", "credit_card"}
    safe_kwargs = {
        k: "***REDACTED***" if any(s in k.lower() for s in sensitive_keys) else v
        for k, v in kwargs.items()
    }
    args_str = ", ".join(repr(a) for a in args[:3])  # Limit to first 3 positional args
    kwargs_str = ", ".join(f"{k}={repr(v)}" for k, v in safe_kwargs.items())
    parts = [args_str] + ([kwargs_str] if kwargs_str else [])
    return f"({', '.join(parts)})"


def _get_log_level(level: LogLevel) -> int:
    """Convert LogLevel enum to logging level integer."""
    mapping = {
        LogLevel.DEBUG: logging.DEBUG,
        LogLevel.INFO: logging.INFO,
        LogLevel.WARNING: logging.WARNING,
        LogLevel.ERROR: logging.ERROR,
    }
    return mapping[level]


# ---- METRICS SIDECAR ----

@dataclass
class MetricsSnapshot:
    """Immutable snapshot of request metrics for a service method."""
    method_name: str
    call_count: int = 0
    error_count: int = 0
    total_duration_ms: float = 0.0
    max_duration_ms: float = 0.0
    last_error: Optional[str] = None

    @property
    def error_rate(self) -> float:
        return self.error_count / self.call_count if self.call_count > 0 else 0.0

    @property
    def avg_duration_ms(self) -> float:
        return (self.total_duration_ms / self.call_count) if self.call_count > 0 else 0.0


class MetricsCollector:
    """Thread-safe metrics collector that tracks per-method statistics."""

    def __init__(self) -> None:
        self._snapshots: dict[str, MetricsSnapshot] = {}
        import threading
        self._lock = threading.Lock()

    def record(self, method_name: str, duration_ms: float, success: bool, error: Optional[str] = None) -> None:
        with self._lock:
            if method_name not in self._snapshots:
                self._snapshots[method_name] = MetricsSnapshot(method_name=method_name)

            snap = self._snapshots[method_name]
            snap.call_count += 1
            snap.total_duration_ms += duration_ms
            snap.max_duration_ms = max(snap.max_duration_ms, duration_ms)

            if not success:
                snap.error_count += 1
                snap.last_error = error

    def get_snapshot(self, method_name: str) -> MetricsSnapshot:
        with self._lock:
            return self._snapshots.get(method_name, MetricsSnapshot(method_name=method_name))

    def get_all_snapshots(self) -> dict[str, MetricsSnapshot]:
        with self._lock:
            return dict(self._snapshots)


def with_metrics(
    method_name: str,
    collector: MetricsCollector,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Sidecar decorator: records call count, latency, and error rate per method."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            start = time.monotonic()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.monotonic() - start) * 1000
                collector.record(method_name, duration_ms, success=True)
                return result

            except Exception as e:
                duration_ms = (time.monotonic() - start) * 1000
                collector.record(method_name, duration_ms, success=False, error=str(e))
                raise

        return wrapper
    return decorator


# ---- RETRY SIDECAR ----

def with_retry(
    max_retries: int = 3,
    base_delay_ms: float = 100.0,
    backoff_multiplier: float = 2.0,
    retryable_exceptions: Optional[tuple[type, ...]] = None,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Sidecar decorator: retries failed calls with exponential backoff.

    Only retries on specified exception types (defaults to Exception).
    The delay between retries grows exponentially: base_delay * multiplier^attempt.
    """
    if retryable_exceptions is None:
        retryable_exceptions = (Exception,)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None

            for attempt in range(max_retries + 1):  # +1 because first try is not a retry
                try:
                    return func(*args, **kwargs)

                except retryable_exceptions as e:
                    last_exception = e

                    if attempt >= max_retries:
                        break  # No more retries — re-raise

                    delay_ms = base_delay_ms * (backoff_multiplier ** attempt)
                    time.sleep(delay_ms / 1000.0)

            raise last_exception  # type: ignore[misc]

        return wrapper
    return decorator


# ---- CIRCUIT BREAKER SIDECAR ----

class CircuitBreakerState(Enum):
    CLOSED = "closed"          # Normal operation — requests flow through
    OPEN = "open"              # Failures exceeded threshold — requests are rejected
    HALF_OPEN = "half_open"    # Testing recovery — limited requests allowed


class CircuitBreaker:
    """Circuit breaker state machine for protecting against cascading failures."""

    def __init__(self, config: CircuitBreakerConfig) -> None:
        self._config = config
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._half_open_calls = 0

    @property
    def state(self) -> CircuitBreakerState:
        if self._state == CircuitBreakerState.OPEN:
            if (
                self._last_failure_time is not None and
                datetime.utcnow() - self._last_failure_time >= self._config.recovery_timeout
            ):
                self._transition_to(CircuitBreakerState.HALF_OPEN)
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def record_success(self) -> None:
        """A call succeeded — reset counters and close the circuit."""
        if self._state == CircuitBreakerState.HALF_OPEN:
            self._transition_to(CircuitBreakerState.CLOSED)
            self._failure_count = 0
        else:
            self._failure_count = 0

    def record_failure(self) -> None:
        """A call failed — increment counter and potentially open the circuit."""
        self._failure_count += 1
        self._last_failure_time = datetime.utcnow()

        if self._state == CircuitBreakerState.HALF_OPEN:
            self._transition_to(CircuitBreakerState.OPEN)
        elif self._failure_count >= self._config.failure_threshold:
            self._transition_to(CircuitBreakerState.OPEN)

    def _transition_to(self, new_state: CircuitBreakerState) -> None:
        if new_state == CircuitBreakerState.HALF_OPEN:
            self._half_open_calls = 0
        elif new_state == CircuitBreakerState.CLOSED:
            self._failure_count = 0
        self._state = new_state


def with_circuit_breaker(
    name: str,
    circuit_breaker: CircuitBreaker,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Sidecar decorator: enforces circuit breaker policy on decorated calls."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            # Check state before executing
            if circuit_breaker.state == CircuitBreakerState.OPEN:
                raise CircuitOpenError(
                    f"Circuit breaker '{name}' is OPEN — rejecting request "
                    f"(failures: {circuit_breaker.failure_count})"
                )

            if circuit_breaker.state == CircuitBreakerState.HALF_OPEN:
                circuit_breaker._half_open_calls += 1  # Accessing protected for sidecar
                if circuit_breaker._half_open_calls > circuit_breaker._config.half_open_max_calls:
                    raise CircuitOpenError(
                        f"Circuit breaker '{name}' half-open call limit reached"
                    )

            try:
                result = func(*args, **kwargs)
                circuit_breaker.record_success()
                return result

            except Exception as e:
                circuit_breaker.record_failure()
                raise

        return wrapper
    return decorator


class CircuitOpenError(Exception):
    """Raised when the circuit breaker is open and requests are rejected."""


# ---- COMPOSING SIDECARS ON A SERVICE (composition root) ----

def build_decorated_order_service(
    raw_service: OrderServicePort,
    metrics_collector: MetricsCollector,
    logger: logging.Logger,
) -> OrderServicePort:
    """Composition root: applies all sidecar decorators to a service implementation.

    Decorator order matters — outermost layer handles first:
    1. Logging (records the entire lifecycle including inner failures)
    2. Metrics (records latency and error counts per method)
    3. Retry (retries transient failures before circuit breaker sees them)
    4. Circuit Breaker (stops calls if downstream is consistently failing)

    This stack ensures every call is logged, measured, resilient to transient errors,
    and protected from cascading failures — without any of these concerns appearing
    in the OrderServicePort interface or its implementations.
    """
    service = raw_service

    # Layer 4: Circuit breaker (innermost protection)
    cb_config = CircuitBreakerConfig(
        failure_threshold=5,
        recovery_timeout=timedelta(seconds=30),
        half_open_max_calls=1,
    )
    cb = CircuitBreaker(cb_config)
    service = _apply_sidecars(service, cb)

    # Layer 3: Retry (wraps the circuit breaker — retries happen before CB counts them)
    service = _apply_sidecars(service, None, with_retry(max_retries=2, base_delay_ms=100))

    # Layer 2: Metrics (wraps retry — measures actual wall-clock time including retries)
    service = _apply_sidecars(service, metrics_collector, with_metrics)

    # Layer 1: Logging (outermost — sees everything from outside in)
    service = _apply_sidecars(service, logger, with_logging)

    return service


def _apply_sidecars(
    service: OrderServicePort,
    metrics_collector: Optional[MetricsCollector],
    *decorators: Callable[[Callable[..., Any]], Callable[..., Any]],
) -> OrderServicePort:
    """Apply a stack of sidecar decorators to all methods on a service port."""
    for method_name in dir(service):
        if method_name.startswith("_"):
            continue
        original_method = getattr(service, method_name)
        if not callable(original_method):
            continue

        # Build stacked decorator from outermost to innermost
        decorated = original_method
        for decorator in decorators:
            decorated = decorator(  # type: ignore[call-arg]
                func=decorated,
                name=f"{service.__class__.__name__}.{method_name}" if hasattr(decorator, '__name__') else None,
                logger=logging.getLogger(f"sidecar.{service.__class__.__name__}") if 'logger' in str(decorator) else None,
                method_name=method_name if metrics_collector is not None else None,
                collector=metrics_collector,
            )

        setattr(service, method_name, decorated)

    return service


# ---- USAGE: Composition root creates the fully instrumented service ----

def create_application():
    """Application composition root — thin, contains no business logic."""
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)

    metrics = MetricsCollector()

    # Create raw (undecorated) service
    raw_service = InMemoryOrderService()

    # Wrap with sidecars — all cross-cutting concerns applied at runtime
    order_service: OrderServicePort = build_decorated_order_service(
        raw_service=raw_service,
        metrics_collector=metrics,
        logger=logger,
    )

    return order_service, metrics
```

**Trade-off analysis:** The sidecar decorator stack adds indirection that makes debugging slightly harder (stack traces go through decorators). Use it when:
- Multiple services share the same cross-cutting concerns (logging, metrics, retries)
- You want to keep the domain layer completely free of infrastructure types
- Cross-cutting behavior needs to change without modifying domain code

Skip it for small projects with one or two services — direct instrumentation is simpler and faster. The decorator stack pays for itself when 3+ services need the same observability patterns.

**Practical note:** Decorator ordering matters critically. Put logging outermost (it sees everything), metrics next (measures actual wall-clock time), retry below metrics (so retries are counted as one call), and circuit breaker innermost (protects against consistently failing services). This order ensures each layer observes the full effect of the layers inside it.

---

## Constraints

### MUST DO
- Define port interfaces (abstract contracts) before writing any adapter implementation — ports define what the domain needs, not how infrastructure delivers it
- Register all adapters in a composition root using dependency injection — never use `import` to reach into infrastructure from domain code
- Apply the Dependency Rule: domain layer has zero imports from infrastructure layers; all dependencies point inward (infrastructure → application → domain)
- Give every feature flag an expiry date and owner — stale flags are technical debt that hides actual system behavior
- Separate command and query models when reads and writes have different scaling requirements — share no tables, indexes, or ORM models between them
- Set individual timeouts on every HTTP call in API composition layers — cascading timeouts cause total service unavailability
- Make the circuit breaker outermost protection: log → metrics → retry → circuit breaker (innermost) — this ordering ensures each layer observes the full effect of what is inside it

### MUST NOT DO
- Never put ORM models, HTTP types, or database query objects in domain interfaces — ports must be framework-free
- Do not use feature flags as a substitute for configuration management — config belongs in environment variables or config services; flags belong in code that changes behavior
- Never bypass circuit breakers with bare `try/except: pass` blocks — they exist to prevent cascading failures across the system
- Do not mix event sourcing projections with the write model — projections must be rebuildable from the event store alone
- Do not expose raw microservice APIs directly to clients when different clients need different data shapes — use BFF or API composition
- Never skip the composition root — direct instantiation of infrastructure in domain code is how architecture decay happens

---

## Related Skills

| Skill | Purpose |
|---|---|
| `structural-design-patterns` | GoF design patterns (strategy, observer, factory) that complement architectural patterns at the component level |
| `cqrs-pattern` | Deep dive into CQRS with advanced projections, snapshotting, and saga orchestration for complex workflows |
| `microservice-resilience-patterns` | Resilience patterns (bulkhead, retry, circuit breaker, timeout) that work alongside sidecar implementations |
| `domain-driven-design` | Bounded contexts, aggregate design, and event storming — provides the foundation for choosing where to apply hexagonal architecture |
| `clean-architecture` | Robert C. Martin's layered architecture with use cases as the central organizing principle — alternative or complement to hexagonal |

---

## Live References

> Authoritative documentation links for these architectural patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Hexagonal Architecture (Port & Adapter)](https://alistair.cockburn.us/hexagonal-architecture/) — Alistair Cockburn's original exposition on ports and adapters
- [Backend-for-Frontend Pattern](https://samnewman.io/patterns/architectural/bff/) — Sam Newman's BFF pattern explanation
- [CQRS Pattern (Microsoft Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/design-patterns/cqrs-pattern) — Microsoft's CQRS guidance with implementation patterns
- [Event Sourcing](https://microservices.io/patterns/data/event-sourcing.html) — Microservices.io event sourcing pattern reference
- [Feature Flags Best Practices](https://launchdarkly.com/blog/feature-flags-best-practices/) — LaunchDarkly's guide to flag lifecycle management
- [API Composition vs GraphQL](https://samnewman.io/patterns/api_design/composition/) — Newman on when to compose vs. use a query language
