---
name: multi-tenant-domain-isolation
description: Implements multi-tenant domain isolation patterns (schema-per-tenant, row-level tenant scoping, isolated bounded contexts) to prevent data leakage and enforce strict tenant boundaries in SaaS applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: multi-tenant, tenant isolation, schema per tenant, row-level security, tenant boundary, saas architecture, how do i isolate tenants, data partitioning, bounded context per tenant
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
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
  related-skills: domain-driven-design, monolith-architecture, api-gateway-domain-routing
---

# Multi-Tenant Domain Isolation

Implements tenant isolation patterns — schema-per-tenant, row-level security (PostgreSQL RLS), shared-schema with explicit scoping, and bounded context separation via anti-corruption layers — to prevent data leakage and enforce strict tenant boundaries in SaaS applications.

## TL;DR Checklist

- [ ] Tenant ID is resolved from the request context before any database query
- [ ] Every query that touches shared tables includes a `WHERE tenant_id = :current_tenant` clause
- [ ] Schema-per-tenant mode uses connection-level `search_path` switching, not per-query schema qualification
- [ ] Row-level security policies are defined as database-level constraints, not application-level filters
- [ ] Anti-corruption layer wraps external domain boundaries with explicit mapping, never leaking foreign entity IDs into internal aggregates

---

## When to Use

- Building a SaaS platform where tenant data must never cross isolation boundaries
- Migrating a single-tenant application to multi-tenant architecture
- Meeting compliance requirements (SOC 2, HIPAA, GDPR) that mandate strict data partitioning
- Architecting bounded contexts where different domains serve different tenant sets independently

---

## When NOT to Use

- Single-tenant applications — schema-per-tenant adds unnecessary complexity
- Read-heavy analytics workloads spanning all tenants — use an analytical data warehouse instead
- Low-risk internal tools where a single database error does not expose sensitive customer data
- Applications with fewer than 50 tenants and no compliance requirements — shared-schema is sufficient

---

## Core Workflow

1. **Choose isolation level** — Evaluate tenant count, compliance requirements, and cost constraints to select between schema-per-tenant, row-level security, or shared-schema. Schema-per-tenant for regulated data, RLS for moderate scale, shared-schema for small deployments. **Checkpoint:** Document the decision with trade-offs in an ADR (Architecture Decision Record).

2. **Implement tenant context propagation** — Create a middleware layer that resolves `tenant_id` from HTTP headers, JWT claims, or subdomain prefix and injects it into every request-scoped context. **Checkpoint:** Verify that every handler receives `tenant_id` as a typed value, never as an unvalidated string.

3. **Apply database isolation** — Implement the chosen isolation strategy at the persistence layer. For schema-per-tenant, maintain a tenant-to-schema mapping table and use connection pooling with dynamic `search_path`. For RLS, define policies on every row-level table. For shared-schema, enforce scoping through ORM hooks and query interceptors.

4. **Add anti-corruption layers** — Where the application integrates external domains (payment processors, identity providers, third-party APIs), wrap those integrations with translation adapters that convert foreign entity IDs to internal tenant-scoped identifiers. **Checkpoint:** No foreign entity ID should appear in an internal aggregate root.

5. **Test isolation boundaries** — Write integration tests that verify cross-tenant data leakage is impossible under both happy-path and failure conditions (e.g., connection pool exhaustion, schema creation race).

---

## Implementation Patterns / Reference Guide

### Pattern 1: Schema-Per-Tenant with SQLAlchemy

Each tenant gets a dedicated PostgreSQL schema. The application switches the `search_path` on each connection to route queries to the correct schema. This provides the strongest isolation — a SQL injection in one tenant's data cannot access another tenant's tables.

```python
"""schema_per_tenant.py — Schema-per-tenant isolation with SQLAlchemy."""
from __future__ import annotations

import threading
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker


class TenantResolver:
    """Resolves tenant_id to a database schema name."""

    def __init__(self, tenant_schema_map: dict[str, str]) -> None:
        self._map = tenant_schema_map

    @contextmanager
    def resolve(self, tenant_id: str) -> Iterator[None]:
        if tenant_id not in self._map:
            raise ValueError(f"Unknown tenant: {tenant_id}")

        local = threading.local()
        local.tenant_id = tenant_id
        try:
            yield
        finally:
            local.tenant_id = None  # type: ignore[attr-defined]

    def get_schema(self, tenant_id: str) -> str:
        return self._map[tenant_id]


class TenantSessionManager:
    """Manages per-tenant database sessions with schema routing."""

    def __init__(
        self,
        engine: create_engine,
        resolver: TenantResolver,
        pool_size: int = 10,
        max_overflow: int = 20,
    ) -> None:
        self._engine = engine
        self._resolver = resolver
        self._SessionFactory = sessionmaker(bind=engine)

        @event.listens_for(engine, "connection")
        def _set_search_path(dbapi_conn, _record) -> None:
            """Reset search_path when borrowing a connection from the pool."""
            dbapi_conn.execute("SET search_path TO public")

    def get_session(self, tenant_id: str) -> Session:
        session = self._SessionFactory()

        # Force all queries for this tenant into the correct schema
        session.execute(
            f"SET LOCAL search_path TO {self._resolver.get_schema(tenant_id)}, public"
        )

        return session

    @contextmanager
    def session_for(self, tenant_id: str) -> Iterator[Session]:
        session = self.get_session(tenant_id)
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# --- Usage ---
# resolver = TenantResolver({
#     "acme-corp": "tenant_acme_corp",
#     "globex": "tenant_globex",
# })
# manager = TenantSessionManager(engine, resolver)
# with manager.session_for("acme-corp") as session:
#     results = session.query(TenantModel).all()
```

**Why this works:** `SET LOCAL` binds the search_path to the current transaction only. If the query fails and rolls back, the schema context does not leak to subsequent transactions on the same connection.

### Pattern 2: PostgreSQL Row-Level Security (RLS)

Row-level security enforces tenant boundaries at the database engine level. Even if application code forgets to filter by `tenant_id`, PostgreSQL rejects the row. This is defense-in-depth — RLS protects against application bugs, not SQL injection in dynamic queries.

```sql
-- rls_policies.sql — Row-level security policies for multi-tenant tables.

-- Step 1: Enable RLS on every shared table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a session variable to hold the current tenant context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Define policies per table.
-- Each policy uses current_tenant_id(), which reads from the session variable
-- set by the application at connection time.

-- Orders: tenants can only see their own orders
CREATE POLICY tenant_isolation_orders ON orders
    USING (tenant_id = current_tenant_id());

-- Order items: inherits order-level isolation through join
CREATE POLICY tenant_isolation_order_items ON order_items
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
              AND o.tenant_id = current_tenant_id()
        )
    );

-- Users: tenants can only see their own users
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_tenant_id());

-- Admin bypass policy for platform operators (separate role)
CREATE POLICY admin_bypass_orders ON orders
    FOR ALL
    TO platform_admin
    USING (true);
```

```python
"""rls_middleware.py — Middleware that sets the tenant session variable."""
from __future__ import annotations

import uuid
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


class RLSContextMiddleware:
    """Injects tenant_id into PostgreSQL session for RLS enforcement."""

    def __init__(self, engine_url: str) -> None:
        self._engine = create_engine(engine_url)
        self._SessionFactory = sessionmaker(bind=self._engine)

    @contextmanager
    def rls_session(self, tenant_id: uuid.UUID) -> Iterator[Session]:
        """Open a session with RLS context set for the given tenant."""
        session = self._SessionFactory()
        try:
            session.execute(
                text("SELECT set_config('app.current_tenant', :tid, true)"),
                {"tid": str(tenant_id)},
            )
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# --- Usage ---
# tenant = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
# middleware = RLSContextMiddleware("postgresql://app@localhost/production")
# with middleware.rls_session(tenant) as session:
#     # This query is automatically filtered by the tenant_isolation_orders policy
#     orders = session.query(Order).all()
#     # A malicious `session.execute("SELECT * FROM users")` returns only current tenant's rows
```

### Pattern 3: Shared Schema with Explicit Scoping

For smaller deployments, a shared schema with an explicit `tenant_id` column on every table provides acceptable isolation when combined with ORM-level scoping. This is the lowest-cost option but requires discipline at the query layer.

```python
"""shared_tenant_scoping.py — ORM-level tenant scoping for shared-schema deployments."""
from __future__ import annotations

import uuid
from typing import Generic, TypeVar

from sqlalchemy import Column, ForeignKey, String, UUID, create_engine
from sqlalchemy.orm import Session, DeclarativeBase, Mapped, relationship, scoped_session, sessionmaker


class Base(DeclarativeBase):
    pass


class TenantScopedModel(Base):
    """Base model that requires a tenant_id column on every table."""

    __abstract__ = True

    tenant_id: Mapped[uuid.UUID] = Column(UUID(as_uuid=True), nullable=False)


# --- Domain Models ---
class Company(TenantScopedModel):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = Column(String(255), nullable=False)
    domain: Mapped[str] = Column(String(255), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="company")


class User(TenantScopedModel):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = Column(String(255), unique=True, nullable=False)
    company_id: Mapped[uuid.UUID] = Column(UUID(as_uuid=True), ForeignKey("companies.id"))

    company: Mapped["Company"] = relationship(back_populates="users")


# --- Tenant-scoped query helper ---
class TenantQuery:
    """Wraps a SQLAlchemy session to enforce tenant scoping on every query."""

    def __init__(self, session: Session, tenant_id: uuid.UUID) -> None:
        if not tenant_id:
            raise ValueError("tenant_id is required for shared-schema mode")
        self._session = session
        self._tenant_id = tenant_id

    def scoped(self, model: type[TenantScopedModel]) -> "ScopedQuery":
        return ScopedQuery(self._session, model, self._tenant_id)


class ScopedQuery:
    """Auto-appends WHERE tenant_id = :current_tenant to every query."""

    def __init__(self, session: Session, model: type[TenantScopedModel], tenant_id: uuid.UUID) -> None:
        self._session = session
        self._model = model
        self._tenant_id = tenant_id

    def all(self) -> list[TenantScopedModel]:
        return (
            self._session.query(self._model)
            .filter(self._model.tenant_id == self._tenant_id)
            .all()
        )

    def first(self) -> TenantScopedModel | None:
        return (
            self._session.query(self._model)
            .filter(self._model.tenant_id == self._tenant_id)
            .first()
        )

    def filter_by(self, **kwargs) -> list[TenantScopedModel]:
        conditions = [self._model.tenant_id == self._tenant_id] + [
            getattr(self._model, k) == v for k, v in kwargs.items()
        ]
        return self._session.query(self._model).filter(*conditions).all()


# --- ❌ BAD: Tenant ID can be accidentally omitted ---
def get_orders_bad(session: Session, company_id: uuid.UUID):
    """No tenant scoping — if the same DB session serves multiple tenants, this leaks data."""
    return session.query(Order).filter_by(company_id=company_id).all()


# --- ✅ GOOD: Explicit scoping enforces isolation ---
def get_orders_good(session: Session, tenant_id: uuid.UUID):
    """Every query is forced through the scoped layer."""
    tenant_q = TenantQuery(session, tenant_id)
    return tenant_q.scoped(Company).all()
```

### Pattern 4: Anti-Corruption Layer for Bounded Contexts

When integrating external services (payment gateways, identity providers), wrap them with an anti-corruption layer that translates foreign identifiers into your internal domain model. This prevents the external domain's terminology and entity shapes from contaminating your aggregates.

```python
"""anti_corruption_layer.py — Translates external domain concepts into internal aggregates."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol


class PaymentGatewayError(Exception):
    """Raised when the external payment service returns an unrecoverable error."""
    pass


# --- External Domain: Payment Gateway (Stripe-like API) ---
@dataclass
class ExternalCustomer:
    """Represents a customer from the external payment gateway domain."""
    stripe_id: str           # e.g., "cus_ABC123DEF456"
    email: str
    name: str
    default_payment_method: str | None = None


@dataclass
class ExternalPaymentIntent:
    """Represents a payment from the external domain."""
    intent_id: str           # e.g., "pi_1ABC2DEF3"
    customer_stripe_id: str
    amount_cents: int
    currency: str            # "usd", "eur"
    status: str              # "succeeded", "pending", "requires_payment_method"


class ExternalPaymentGateway(Protocol):
    """Interface to the actual payment gateway implementation (Stripe SDK, etc.)."""

    def create_customer(self, email: str, name: str) -> ExternalCustomer: ...
    def create_payment_intent(self, customer_stripe_id: str, amount_cents: int, currency: str) -> ExternalPaymentIntent: ...
    def confirm_payment(self, intent_id: str) -> ExternalPaymentIntent: ...


# --- Internal Domain ---
class PaymentStatus(Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REQUIRED_ACTION = "requires_action"


@dataclass
class InternalPaymentMethod:
    """Internal representation of a payment method — no foreign IDs leak here."""
    token: str               # Opaque token, never exposes gateway-specific IDs
    last_four: str | None = None
    brand: str | None = None


@dataclass
class InternalCustomer:
    """Clean internal customer aggregate — no Stripe knowledge."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    email: str = ""
    name: str = ""
    payment_methods: list[InternalPaymentMethod] = field(default_factory=list)

    def add_payment_method(self, method: InternalPaymentMethod) -> None:
        self.payment_methods.append(method)


@dataclass
class InternalPayment:
    """Clean internal payment aggregate."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    customer_id: uuid.UUID = field(default_factory=uuid.uuid4)
    amount_cents: int = 0
    currency: str = "usd"
    status: PaymentStatus = PaymentStatus.PENDING

    def mark_succeeded(self) -> None:
        self.status = PaymentStatus.SUCCEEDED


# --- Anti-Corruption Layer: Translator ---
class PaymentGatewayTranslator:
    """Converts between external payment gateway domain and internal bounded context."""

    def __init__(self, gateway: ExternalPaymentGateway) -> None:
        self._gateway = gateway

    # ---- Customer translation ----

    def register_external_customer(self, email: str, name: str) -> InternalCustomer:
        """Create an external customer and translate to internal domain."""
        external = self._gateway.create_customer(email, name)
        return InternalCustomer(
            id=self._generate_internal_id(),  # Deterministic mapping in production
            email=external.email,
            name=external.name,
        )

    def map_external_payment_method_to_internal(
        self, external: ExternalCustomer
    ) -> InternalPaymentMethod:
        """Translate a gateway payment method into an opaque internal token."""
        if not external.default_payment_method:
            raise ValueError("External customer has no default payment method")

        # Never expose the gateway's card fingerprint or brand directly.
        # In production, tokenize this through your own vault.
        return InternalPaymentMethod(
            token=self._tokenize_payment_method(external.default_payment_method),
            last_four=external.email[-4:],  # Placeholder — use real extraction in production
        )

    # ---- Payment intent translation ----

    def create_internal_payment(
        self, internal_customer: InternalCustomer, amount_cents: int, currency: str
    ) -> InternalPayment:
        """Create a payment intent in the external gateway, translate to internal aggregate."""
        # 1. Create external intent
        intent = self._gateway.create_payment_intent(
            customer_stripe_id="placeholder",  # Would be mapped from internal_customer in production
            amount_cents=amount_cents,
            currency=currency,
        )

        # 2. Translate status to internal enum
        status_map = {
            "succeeded": PaymentStatus.SUCCEEDED,
            "pending": PaymentStatus.PENDING,
            "requires_payment_method": PaymentStatus.REQUIRED_ACTION,
            "canceled": PaymentStatus.FAILED,
        }
        mapped_status = status_map.get(intent.status, PaymentStatus.FAILED)

        # 3. Return internal aggregate with no gateway knowledge
        return InternalPayment(
            id=self._generate_internal_id(),
            customer_id=internal_customer.id,
            amount_cents=intent.amount_cents,
            currency=intent.currency,
            status=mapped_status,
        )

    def confirm_and_translate(self, external_intent: ExternalPaymentIntent) -> PaymentStatus:
        """Confirm an external payment and return the mapped internal status."""
        confirmed = self._gateway.confirm_payment(external_intent.intent_id)
        status_map = {
            "succeeded": PaymentStatus.SUCCEEDED,
            "pending": PaymentStatus.PENDING,
        }
        return status_map.get(confirmed.status, PaymentStatus.FAILED)

    # ---- Internal helpers (no external knowledge) ----

    def _generate_internal_id(self) -> uuid.UUID:
        return uuid.uuid4()

    def _tokenize_payment_method(self, raw_method: str) -> str:
        """In production, call your own tokenization service here."""
        import hashlib
        return hashlib.sha256(raw_method.encode()).hexdigest()[:32]


# --- ❌ BAD: External IDs leak into the internal aggregate ---
@dataclass
class BadPaymentAggregate:
    """This leaks Stripe's domain model into the internal boundary."""
    stripe_intent_id: str       # ❌ Foreign entity ID in internal domain
    customer_stripe_id: str     # ❌ Another foreign ID
    amount_cents: int


# --- ✅ GOOD: Anti-corruption layer contains external knowledge ---
@dataclass
class GoodPaymentAggregate:
    """Clean aggregate with no external domain contamination."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)   # ✅ Internal identifier
    customer_id: uuid.UUID = field(default_factory=uuid.uuid4)  # ✅ Internal reference
    amount_cents: int = 0                               # ✅ Domain-relevant data
```

---

## Constraints

### MUST DO
- Always resolve `tenant_id` from the request context before any database operation — never trust client-supplied tenant identifiers in query parameters
- For schema-per-tenant, use `SET LOCAL search_path` within transactions, not `SET` at the connection level, to prevent cross-tenant leakage on pooled connections
- For RLS, enable RLS on every table and add a `FORCE ROW LEVEL SECURITY` clause — do not rely on application-level filters alone
- Add an `admin_bypass` policy only for explicitly defined platform-admin roles, never for general authenticated users
- Wrap all external service integrations with anti-corruption layers that map foreign identifiers to opaque internal tokens

### MUST NOT DO
- Never store `tenant_id` in a client-side cookie or JWT claim that a tenant could modify to access another tenant's data — validate server-side against the tenant-to-user mapping
- Never concatenate tenant IDs into SQL strings for schema qualification without validating the schema name against a allowlist of known tenant schemas
- Never skip RLS policies by connecting with a superuser role in application code — use least-privilege database roles
- Never return raw external entity IDs (Stripe customer ID, Auth0 user ID) in API responses within internal-bounded endpoints
- Never use `SELECT *` on shared-schema tables without an explicit WHERE clause filtering by tenant_id

---

## Output Template

When this skill is active, your output must contain:

1. **Isolation Strategy Recommendation** — State which pattern (schema-per-tenant, RLS, shared-schema) fits the described deployment, with a one-sentence justification based on tenant count and compliance requirements.

2. **Implementation Code** — Complete, typed Python code or SQL that implements the requested isolation pattern. Include all imports, type annotations, and error handling. No `pass` bodies or TODO placeholders.

3. **Boundary Test Cases** — At least two test cases demonstrating isolation: one for a correct-scoped query and one for an attempted cross-tenant query that must fail.

4. **Failure Mode Analysis** — Document one specific failure mode (connection pool exhaustion, schema creation race, RLS policy misconfiguration) and how the implementation handles it.

---

## Live References

1. [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
2. [SQLAlchemy Session Scoping Patterns](https://docs.sqlalchemy.org/en/20/orm/session_partitioning.html)
3. [Martin Fowler — Anti-Corruption Layer](https://martinfowler.com/bliki/AntiCorruptionLayer.html)
4. [AWS Well-Architected Framework — Multi-Tenant Architecture](https://docs.aws.amazon.com/wellarchitected/latest/multitenancy-pillar/welcome.html)
5. [NIST SP 800-144 — Guidelines on Security and Privacy in Public Cloud Computing (tenant isolation)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-144.pdf)
6. [Prisma Multi-Tenant Data Modeling](https://www.prisma.io/docs/guides/multi-prisma-servers/multi-tenancy-strategies)
7. [PostgreSQL Search Path Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-gateway-domain-routing` | Routes external domain requests to the correct tenant context before data isolation applies |
| `domain-driven-design` | Provides bounded context definitions that inform where anti-corruption layers are needed |
| `monolith-architecture` | Guides initial multi-tenant design decisions for monolithic SaaS applications |
