---
name: data-deduplication
description: Identifies and eliminates data-layer duplication (schema, ETL transformations, API responses, query patterns, configuration) using canonical source extraction to prevent inconsistent definitions across services and pipelines.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data deduplication, schema normalization, ETL pipeline dedup, API response standardization, query abstraction, configuration centralization, canonical data source, data model reuse, duplicate schema definitions, data layer DRY
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code-level refactoring
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: deduplication-patterns,data-modeling,dry-principles,refactoring-techniques,code-quality-metrics
---

# Data-Layer Deduplication

Identifies and eliminates data-layer duplication — schema definitions, transformation logic, API response shapes, query patterns, and configuration schemas — by extracting canonical sources. This skill teaches how to find duplicated data definitions across tables, models, pipelines, and endpoints, then consolidate them into single authoritative sources with zero breaking changes during migration.

## TL;DR Checklist

- [ ] Inventory every table, model, endpoint schema, and query that defines the same logical field
- [ ] Mark each field's claimed owner — only one definition may be canonical per domain
- [ ] Require ≥3 independent definitions before flagging as duplication candidate
- [ ] Extract shared schemas using backward-compatible dual-write (write-old + write-new) during transition
- [ ] Validate referential integrity after consolidation — no orphaned FK references or null cascades
- [ ] Update all API contract consumers before removing duplicate endpoint definitions

---

## When to Use

Use this skill when:

- You discover the same fields (e.g., `address`, `phone_number`, `email`) defined identically in 3+ tables, models, or serializers with drift over time
- ETL pipelines contain copy-pasted transformation logic for timestamp normalization, currency conversion, or country code mapping across ≥2 ingestion scripts
- API endpoints return differently-shaped pagination envelopes, error objects, or metadata fields making client integration brittle
- Report generation functions each reimplement the same complex JOIN/WHERE patterns with slight variations
- Multiple services independently validate identical configuration schemas (e.g., database URLs, feature flags) from scratch
- Data validation rules for emails, phone numbers, or identifiers appear in model layers, serializers, CLI handlers, and test fixtures — all with different regex or logic

## When NOT to Use

Avoid this skill for:

- Code-level duplication of functions or classes (use `deduplication-patterns` instead)
- Single-table normalization where fields belong within one entity's scope — that is database normalization, not deduplication
- One-off scripts or throwaway data processing pipelines where overhead outweighs benefit
- Scenarios where independent definitions serve genuinely different purposes (e.g., a billing address vs. shipping address are the same schema but separate instances)

---

## Core Workflow

1. **Map Data Ownership** — Inventory every table, model class, endpoint response schema, and query template that defines logical fields. For each field, record its location, definition source, and claimed owner. **Checkpoint:** Fields appearing in ≥3 places with independently written definitions are your duplication candidates.

2. **Identify Canonical Candidates** — Among duplicated fields, select which definition becomes canonical. Prefer the definition used by the most consumers or the one maintained by the owning domain team. If no clear owner exists, choose the simplest, most complete definition. **Checkpoint:** Document the chosen canonical source and update your data dictionary with a single authoritative reference for each deduplicated field.

3. **Assess Change Frequency** — Only consolidate definitions that have changed across ≥2 release cycles or are modified by >1 team iteration. Static, one-time schemas can remain duplicated without penalty. High-frequency-change fields create the strongest case for centralization. **Checkpoint:** If a field has been stable since initial deployment and has fewer than 2 consumers, defer consolidation — the coupling cost outweighs the benefit.

4. **Choose Consolidation Strategy** — Based on access patterns, pick the right extraction approach:
   - Schema duplication → Extract to shared type/class or reference entity with foreign key
   - Transformation duplication → Create composable transform pipeline with step functions
   - API response duplication → Build shared response envelope types and serializer base classes
   - Query duplication → Parameterize query builder functions that assemble common JOIN/WHERE clauses
   - Configuration duplication → Define a base config schema with per-service extension hooks
   
   **Checkpoint:** Every chosen strategy must support backward-compatible dual-write during the transition period.

5. **Execute Migration with Dual-Write** — For each consolidation: write to both old and new locations simultaneously, verify data parity, then remove readers from old paths one domain at a time. Run referential integrity checks (foreign key constraints, nullability, type compatibility) after every consumer switch. **Checkpoint:** No consumer should break mid-migration; run integration tests against the dual-write state before removing any old reader.

---

## Implementation Patterns

### Pattern 1: Schema Centralization

Define data models once as shared types or reference entities. All consumers import and reference the canonical definition rather than redefining identical fields locally. This eliminates schema drift where the same logical field evolves differently in separate services over time.

**BAD — Same user address duplicated across three tables/models:**

```python
# ❌ BAD: users.py — User model with inline address fields
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    address_line_1: Mapped[str]           # duplicated
    address_line_2: Mapped[str | None]   # duplicated
    city: Mapped[str]                     # duplicated
    state_province: Mapped[str]           # duplicated
    postal_code: Mapped[str]              # duplicated
    country_code: Mapped[str]             # duplicated


# ❌ BAD: orders.py — Order model repeats the same address fields
class Order(Base):
    __tablename__ = "orders"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    shipped_to_line_1: Mapped[str]        # duplicated with different naming
    shipped_to_line_2: Mapped[str | None] # duplicated with different naming
    shipped_to_city: Mapped[str]          # duplicated with different naming
    shipped_to_state: Mapped[str]         # duplicated with different naming
    shipped_to_zip: Mapped[str]           # duplicated with different naming
    shipped_to_country: Mapped[str]       # duplicated with different naming


# ❌ BAD: shipments.py — Shipment model yet again
class Shipment(Base):
    __tablename__ = "shipments"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    delivery_address_1: Mapped[str]       # duplicated with yet another naming
    delivery_address_2: Mapped[str | None]
    delivery_city: Mapped[str]
    delivery_state: Mapped[str]
    delivery_postal: Mapped[str]
    delivery_country: Mapped[str]
```

**GOOD — Address as a shared type, referenced everywhere:**

```python
# ✅ GOOD: models/address.py — Single canonical address definition
from dataclasses import dataclass, field
from typing import ClassVar


@dataclass(frozen=True)
class Address:
    """Canonical address model used across all domain entities."""
    
    line_1: str
    line_2: str | None = None
    city: str
    state_province: str
    postal_code: str
    country_code: str  # ISO 3166-1 alpha-2, e.g., "US", "GB"
    
    _country_codes: ClassVar[set[str]] = {
        "US", "CA", "GB", "DE", "FR", "JP", "AU", "IN", "BR", "MX"
    }
    
    def validate(self) -> list[str]:
        """Return validation errors. Empty list means valid."""
        errors: list[str] = []
        if not self.line_1.strip():
            errors.append("line_1 is required")
        if self.country_code and self.country_code.upper() not in self._country_codes:
            errors.append(f"Invalid country code: {self.country_code}")
        return errors


# ✅ GOOD: models/user.py — User references Address via FK or nested type
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    address_id: Mapped[int | None] = mapped_column(
        ForeignKey("addresses.id"), nullable=True
    )
    
    # ORM relationship to the canonical Address entity
    address: Mapped["Address"] = relationship(back_populates="user")


class Order(Base):
    __tablename__ = "orders"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    billing_address_id: Mapped[int] = mapped_column(ForeignKey("addresses.id"))
    shipping_address_id: Mapped[int] = mapped_column(ForeignKey("addresses.id"))
    
    billing_address: Mapped["Address"] = relationship(
        foreign_keys=[billing_address_id]
    )
    shipping_address: Mapped["Address"] = relationship(
        foreign_keys=[shipping_address_id]
    )


# ✅ GOOD: SQL migration — canonical address table created once
"""
CREATE TABLE addresses (
    id            SERIAL PRIMARY KEY,
    line_1        VARCHAR(255) NOT NULL,
    line_2        VARCHAR(255),
    city          VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code   VARCHAR(20)  NOT NULL,
    country_code  CHAR(2)      NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE users ADD COLUMN address_id REFERENCES addresses(id);
ALTER TABLE orders ADD COLUMN billing_address_id REFERENCES addresses(id);
ALTER TABLE orders ADD COLUMN shipping_address_id REFERENCES addresses(id);
"""
```

**When to apply:** When ≥2 entities need the same logical fields, and those fields share validation rules. The canonical entity becomes the single source of truth for address format, validation, and storage.

---

### Pattern 2: Transformation Pipeline Abstraction

Extract common ETL/ELT transformation steps into composable step functions. Instead of duplicating timestamp normalization, currency conversion, or locale formatting across every ingestion script, define a pipeline framework where each step is a reusable transform function applied in a fixed sequence.

**BAD — Timestamp normalization repeated across five ingestion scripts:**

```python
# ❌ BAD: ingest_users.py — ad-hoc timestamp parsing
import re


def parse_user_row(row: dict) -> dict:
    """Ingest a single user row with inline timestamp parsing."""
    raw = row["created_at"]
    # Pattern 1: ISO 8601 with timezone
    if "T" in raw and "+" in raw:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    # Pattern 2: US date format (inconsistent!)
    elif re.match(r"\d{2}/\d{2}/\d{4}", raw):
        dt = datetime.strptime(raw, "%m/%d/%Y").replace(
            tzinfo=timezone.utc
        )
    # Pattern 3: Unix timestamp
    elif raw.isdigit():
        dt = datetime.fromtimestamp(int(raw), tz=timezone.utc)
    else:
        raise ValueError(f"Unparseable date: {raw}")
    
    row["created_at"] = dt.isoformat()
    return row


# ❌ BAD: ingest_orders.py — same logic, slightly different implementation
import re


def parse_order_row(row: dict) -> dict:
    """Ingest a single order row with inline timestamp parsing."""
    raw = row["order_date"]
    if "T" in raw and "+" in raw:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    elif re.match(r"\d{2}-\d{2}-\d{4}", raw):  # different format!
        dt = datetime.strptime(raw, "%m-%d-%Y").replace(
            tzinfo=timezone.utc
        )
    elif raw.isdigit():
        dt = datetime.fromtimestamp(int(raw), tz=timezone.utc)
    else:
        raise ValueError(f"Unparseable date: {raw}")
    
    row["order_date"] = dt  # inconsistent return type — some scripts return string
    return row


# ❌ BAD: ingest_products.py — third implementation with yet another bug
def parse_product_row(row: dict) -> dict:
    raw = row["created_at"]
    try:
        dt = datetime.fromisoformat(raw)  # no timezone handling, crashes on Z suffix
    except ValueError:
        dt = datetime.now()  # silent fallback to now() — data loss!
    return row
```

**GOOD — Centralized transform pipeline with composable step functions:**

```python
# ✅ GOOD: transforms/pipeline.py — Single canonical transformation framework
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class TransformStep:
    """A named transformation function that converts input to output."""
    
    name: str
    func: Callable[[dict], dict]
    
    def __call__(self, record: dict) -> dict:
        return self.func(record)


@dataclass
class TransformPipeline:
    """Composable ETL pipeline. Steps execute sequentially in order."""
    
    steps: list[TransformStep] = field(default_factory=list)
    
    def add(self, step: TransformStep) -> "TransformPipeline":
        """Chain a new step onto the pipeline."""
        self.steps.append(step)
        return self
    
    def run(self, record: dict) -> dict:
        """Execute all steps sequentially on the input record."""
        for step in self.steps:
            try:
                record = step(record)
            except Exception as exc:
                raise TransformError(
                    f"Step '{step.name}' failed on record: {exc}"
                ) from exc
        return record


def normalize_timestamp(record: dict, target_field: str = "created_at") -> dict:
    """Normalize a timestamp field to UTC ISO 8601 string.
    
    Handles ISO 8601 with timezone, US date format (MM/DD/YYYY),
    Unix timestamps, and fails on unrecognized formats.
    
    Args:
        record: Input data row containing the timestamp field.
        target_field: Key name of the timestamp in the record dict.
    
    Returns:
        Record dict with the timestamp converted to ISO 8601 UTC string.
    
    Raises:
        ValueError: If the timestamp cannot be parsed by any known format.
    """
    raw = record.get(target_field)
    if raw is None:
        return record
    
    dt: datetime | None = None
    
    # Format 1: ISO 8601 (with or without timezone offset)
    if isinstance(raw, str) and "T" in raw:
        normalized = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
    
    # Format 2: US date MM/DD/YYYY
    elif isinstance(raw, str) and re.match(r"\d{2}/\d{2}/\d{4}", raw):
        dt = datetime.strptime(raw, "%m/%d/%Y").replace(tzinfo=timezone.utc)
    
    # Format 3: Unix timestamp (integer or numeric string)
    elif isinstance(raw, (int, float)):
        dt = datetime.fromtimestamp(float(raw), tz=timezone.utc)
    elif isinstance(raw, str) and raw.isdigit():
        dt = datetime.fromtimestamp(int(raw), tz=timezone.utc)
    
    if dt is None:
        raise ValueError(
            f"Cannot parse timestamp '{raw}' for field '{target_field}'"
        )
    
    record[target_field] = dt.astimezone(timezone.utc).isoformat()
    return record


# Usage in any ingestion script — zero duplicate parsing logic:
users_pipeline = TransformPipeline()
users_pipeline.add(TransformStep("normalize_timestamp", normalize_timestamp))

orders_pipeline = TransformPipeline()
orders_pipeline.add(
    TransformStep("normalize_order_date", 
                  lambda r: normalize_timestamp(r, "order_date"))
)


# Each ingestion script imports and uses the shared pipeline:
# from transforms.pipeline import users_pipeline
# parsed_row = users_pipeline.run(raw_row)
```

**When to apply:** When ≥2 ingestion scripts or ETL jobs share the same transformation logic (timestamp parsing, currency conversion, locale formatting, ID normalization). Extract into a pipeline framework so new ingestors compose steps rather than reimplement them.

---

### Pattern 3: API Response Canonicalization

Standardize response structures across all API endpoints using shared envelope types for pagination, errors, and metadata. Instead of each endpoint returning differently-shaped responses, every endpoint uses the same envelope schema enforced by base classes or generic types.

**BAD — Each endpoint returns a different shape:**

```python
# ❌ BAD: users_view.py — Users endpoint with custom response shape
class UsersView(APIView):
    def get(self, request):
        users = User.objects.all()
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 20))
        start = (page - 1) * per_page
        
        return Response({
            "results": list(users[start:start + per_page].values()),
            # Inconsistent key: uses "total" not "count"
            "total": users.count(),
            # Pagination uses different field names than other endpoints
            "has_more": start + per_page < users.count(),
        })


# ❌ BAD: orders_view.py — Orders endpoint with yet another shape
class OrdersView(APIView):
    def get(self, request):
        orders = Order.objects.all()
        # Different pagination approach — uses offset/limit directly
        offset = int(request.GET.get("offset", 0))
        limit = int(request.GET.get("limit", 50))
        
        return Response({
            "data": list(orders[offset:offset + limit].values()),
            "meta": {
                "total_count": orders.count(),     # nested under meta
                "page": offset // limit + 1,       # nested under meta
            },
            # No error shape defined here — errors just return {"detail": "..."}
        })


# ❌ Bad: products_view.py — Products endpoint returns yet differently
class ProductsView(APIView):
    def get(self, request):
        products = Product.objects.all()
        
        return Response({
            "items": list(products.values()),      # uses "items" key
            "pagination": {                         # fully nested pagination object
                "page": 1,
                "perPage": 25,                      # camelCase! inconsistent
                "totalPages": (products.count() + 24) // 25,
                "hasNextPage": products.count() > 25,
            },
        })


# ❌ BAD: Error responses are also inconsistent across the API
# Users endpoint:  {"errors": [{"field": "email", "message": "invalid"}]}
# Orders endpoint: {"detail": "Validation failed"}
# Products endpoint: {"error": "Not found"} — no field info at all
```

**GOOD — Shared response envelope types used by every endpoint:**

```python
# ✅ GOOD: api/envelopes.py — Canonical response shapes for the entire API
from typing import Generic, TypeVar, ClassVar
from pydantic import BaseModel, Field


T = TypeVar("T")


class ApiError(BaseModel):
    """Canonical error response shape used by all endpoints."""
    
    code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error description")
    field: str | None = Field(default=None, description="Field that caused the error")
    details: dict | None = Field(default=None)


class ErrorResponse(BaseModel):
    """Standard error envelope — every 4xx/5xx returns this shape."""
    
    errors: list[ApiError] = Field(
        default_factory=list,
        description="List of validation or runtime errors"
    )
    
    def add_error(
        self, code: str, message: str, field: str | None = None, details: dict | None = None
    ) -> None:
        """Add a single error to the response."""
        self.errors.append(ApiError(code=code, message=message, field=field, details=details))


class PaginatedResponse(BaseModel, Generic[T]):
    """Canonical paginated list envelope used by every list endpoint.
    
    All endpoints return identical pagination structure so client libraries
    can be written once and work across all resources.
    """
    
    items: list[T] = Field(description="Page of results")
    total_count: int = Field(description="Total number of matching records")
    page: int = Field(description="Current page number (1-based)")
    page_size: int = Field(description="Number of items per page")
    has_next: bool = Field(description="Whether more pages exist after this one")
    
    @classmethod
    def from_queryset(
        cls,
        queryset,
        item_serializer,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> "PaginatedResponse":
        """Build a paginated response from a Django ORM queryset."""
        total_count = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        
        return cls(
            items=[item_serializer(item).model_dump() for item in items],
            total_count=total_count,
            page=page,
            page_size=page_size,
            has_next=start + page_size < total_count,
        )


class ApiResponse(BaseModel, Generic[T]):
    """Universal response envelope with optional data payload and metadata."""
    
    success: bool = True
    data: T | None = None
    pagination: PaginatedResponse | None = None
    errors: list[ApiError] | None = None
    
    @classmethod
    def for_list(
        cls,
        queryset,
        item_serializer,
        page: int = 1,
        page_size: int = 20,
    ) -> "ApiResponse":
        """Convenience constructor for paginated list responses."""
        return cls(
            data=None,
            pagination=PaginatedResponse.from_queryset(
                queryset, item_serializer, page=page, page_size=page_size
            ),
        )


# ✅ GOOD: users_view.py — Endpoint uses canonical envelope
class UsersView(APIView):
    serializer = UserSerializer  # assume this is defined elsewhere
    
    def get(self, request):
        users = User.objects.all()
        page = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("per_page", 20))
        
        response = ApiResponse.for_list(
            queryset=users,
            item_serializer=self.serializer,
            page=page,
            page_size=page_size,
        )
        
        return Response(response.model_dump(), status=status.HTTP_200_OK)

    def post(self, request):
        errors = ErrorResponse()
        email = request.data.get("email", "")
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
            errors.add_error("INVALID_FORMAT", "Email must be a valid email address", field="email")
        
        if errors.errors:
            return Response(errors.model_dump(), status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # ... create user logic ...
```

**When to apply:** When your API has ≥3 endpoints that shape their responses differently — different pagination keys, inconsistent error formats, or mixed success/error conventions. A shared envelope type eliminates the need for every client to handle multiple response shapes.

---

### Pattern 4: Query Abstraction Layer

Extract complex repeated SQL query patterns into parameterized builder functions or CTE-based reusable queries. Instead of duplicating JOIN + WHERE chains across report generation functions, define a query assembly layer that composes shared fragments with service-specific filters.

**BAD — Same JOIN pattern duplicated across four report functions:**

```sql
-- ❌ BAD: reports/sales.py — Each function reimplements the same JOINs
SELECT o.id, o.total, u.name, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN addresses a ON a.id = o.shipping_address_id
WHERE o.created_at >= '2024-01-01' AND o.created_at < '2025-01-01'
  AND o.status != 'cancelled'
  AND u.country_code = 'US'
ORDER BY o.total DESC;

-- ❌ BAD: reports/refunds.py — Same JOINs, slightly different WHERE clause
SELECT r.id, r.amount, u.name, u.email
FROM refunds r
JOIN orders o ON o.id = r.order_id
JOIN users u ON u.id = o.user_id
JOIN addresses a ON a.id = o.shipping_address_id   -- same join, duplicated
WHERE r.created_at >= '2024-01-01' AND r.created_at < '2025-01-01'
  AND o.status != 'cancelled'                     -- same filter, duplicated
  AND u.country_code = 'US'                       -- same filter, duplicated
ORDER BY r.amount DESC;

-- ❌ BAD: reports/deliveries.py — Yet another copy with a new twist
SELECT d.id, d.tracking_number, o.total, u.name
FROM deliveries d
JOIN orders o ON o.id = d.order_id
JOIN users u ON u.id = o.user_id                   -- again, same join chain
JOIN addresses a ON a.id = o.shipping_address_id   -- and again
WHERE d.status = 'delivered'
  AND o.created_at >= '2024-06-01'                 -- different date range!
  AND u.country_code IN ('US', 'CA')               -- different country filter!
ORDER BY d.delivered_at;

-- ❌ BAD: reports/analytics.py — Fourth copy with yet more duplication
SELECT o.id, o.total, u.name, u.email, a.city, a.state_province
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN addresses a ON a.id = o.shipping_address_id
WHERE o.status != 'cancelled'
  AND o.created_at >= NOW() - INTERVAL '12 months'
  AND u.country_code IN ('US', 'CA', 'GB')
GROUP BY o.id, u.name, u.email, a.city, a.state_province
HAVING COUNT(*) > 1;
```

**GOOD — Parameterized query builder that assembles the common parts:**

```python
# ✅ GOOD: queries/report_builder.py — Canonical query assembly layer
from dataclasses import dataclass, field
from datetime import date


@dataclass
class ReportFilters:
    """Shared filter criteria used across all order-related reports."""
    
    start_date: date | None = None
    end_date: date | None = None
    status_exclude: list[str] = field(default_factory=lambda: ["cancelled"])
    countries: list[str] | None = None
    
    def build_where_clauses(self) -> tuple[list[str], list[str]]:
        """Build parameterized WHERE clauses and their values.
        
        Returns:
            Tuple of (clause_strings, param_values) for safe query execution.
        """
        clauses: list[str] = []
        params: list[str] = []
        
        if self.start_date is not None:
            clauses.append("o.created_at >= %s")
            params.append(self.start_date.isoformat())
        
        if self.end_date is not None:
            clauses.append("o.created_at < %s")
            params.append(self.end_date.isoformat())
        
        if self.status_exclude:
            placeholders = ", ".join(f"%s" for _ in self.status_exclude)
            clauses.append(f"o.status NOT IN ({placeholders})")
            params.extend(self.status_exclude)
        
        if self.countries:
            placeholders = ", ".join(f"%s" for _ in self.countries)
            clauses.append(f"u.country_code IN ({placeholders})")
            params.extend(self.countries)
        
        return clauses, params
    
    def build_joins(self) -> str:
        """Return the canonical JOIN chain used by all order reports."""
        return (
            "JOIN users u ON u.id = o.user_id "
            "JOIN addresses a ON a.id = o.shipping_address_id"
        )


class ReportQueryBuilder:
    """Assembles parameterized report queries from shared fragments.
    
    Each report specifies its SELECT columns and any report-specific
    WHERE clauses, while the query builder handles all common JOINs
    and filters.
    """
    
    @staticmethod
    def build(
        select_columns: list[str],
        base_table: str = "orders o",
        extra_filters: list[str] | None = None,
        extra_params: list[str] | None = None,
        group_by: list[str] | None = None,
        having_clause: str | None = None,
        order_by: str | None = None,
        limit: int | None = None,
        filters: ReportFilters | None = None,
    ) -> tuple[str, list[str]]:
        """Build a complete parameterized report query.
        
        Args:
            select_columns: Columns to SELECT (e.g., ["o.id", "o.total"]).
            base_table: Base table with alias (default: "orders o").
            extra_filters: Report-specific WHERE clauses beyond shared filters.
            extra_params: Values for report-specific filters.
            group_by: GROUP BY columns if aggregating.
            having_clause: HAVING clause for post-aggregation filter.
            order_by: ORDER BY clause.
            limit: Optional LIMIT value.
            filters: Shared ReportFilters instance with date/status/country constraints.
        
        Returns:
            Tuple of (sql_string, param_values) ready for cursor.execute().
        
        Raises:
            ValueError: If select_columns is empty or filters are inconsistent.
        """
        if not select_columns:
            raise ValueError("select_columns must contain at least one column")
        
        # Shared JOINs — defined once, used everywhere
        join_clause = ""
        where_clauses: list[str] = []
        params: list[str] = []
        
        joins_and_filters = ReportFilters() if filters is None else filters
        
        # Build WHERE clauses from shared filters
        shared_where, shared_params = joins_and_filters.build_where_clauses()
        where_clauses.extend(shared_where)
        params.extend(shared_params)
        
        # Add report-specific filters on top
        if extra_filters:
            where_clauses.extend(extra_filters)
            params.extend(extra_params or [])
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
        
        query = (
            f"SELECT {', '.join(select_columns)}\n"
            f"FROM {base_table}\n"
            f"{joins_and_filters.build_joins() if not joins_and_filters == ReportFilters() else ''}\n"
            f"WHERE {where_sql}"
        )
        
        if group_by:
            query += f"\nGROUP BY {', '.join(group_by)}"
        
        if having_clause:
            query += f"\nHAVING {having_clause}"
        
        if order_by:
            query += f"\nORDER BY {order_by}"
        
        if limit is not None:
            query += f"\nLIMIT %s"
            params.append(str(limit))
        
        return query, params


# ✅ GOOD: reports/sales.py — Uses the shared builder, zero JOIN duplication
def generate_sales_report(
    start_date: date, end_date: date, countries: list[str] | None = None
) -> tuple[str, list[str]]:
    """Generate sales report using canonical query builder.
    
    Only specifies what differs: SELECT columns and date range.
    All JOINs, status exclusion, and country filtering are handled
    by the shared QueryQueryBuilder layer.
    """
    filters = ReportFilters(
        start_date=start_date,
        end_date=end_date,
        countries=countries,
    )
    
    return ReportQueryBuilder.build(
        select_columns=["o.id", "o.total", "u.name", "u.email"],
        order_by="o.total DESC",
        limit=1000,
        filters=filters,
    )


# ✅ GOOD: reports/refunds.py — Same builder, zero JOIN duplication
def generate_refund_report(
    start_date: date, end_date: date, countries: list[str] | None = None
) -> tuple[str, list[str]]:
    """Generate refund report using canonical query builder."""
    filters = ReportFilters(
        start_date=start_date,
        end_date=end_date,
        countries=countries,
    )
    
    return ReportQueryBuilder.build(
        select_columns=["r.id", "r.amount", "u.name", "u.email"],
        base_table="refunds r",  # different base table
        extra_filters=["o.status != %s"],  # extra filter on the joined orders table
        extra_params=["cancelled"],
        order_by="r.amount DESC",
        filters=filters,
    )


# ✅ GOOD: reports/analytics.py — Same builder with aggregation
def generate_order_analytics(
    months_back: int = 12, countries: list[str] | None = None
) -> tuple[str, list[str]]:
    """Generate order analytics with grouping and having clause."""
    filters = ReportFilters(
        start_date=date.today().replace(month=max(1, date.today().month - months_back % 12 + 1)) if months_back <= 12 else None,
        countries=countries,
    )
    
    return ReportQueryBuilder.build(
        select_columns=["o.id", "o.total", "u.name", "a.city", "a.state_province"],
        group_by=["o.id", "u.name", "a.city", "a.state_province"],
        having_clause="COUNT(*) > 1",
        filters=filters,
    )
```

**When to apply:** When ≥2 query functions share the same JOIN chains or WHERE filter patterns but differ in SELECT columns, date ranges, or additional filters. The query builder handles all common fragments so report functions only specify their unique parts.

---

### Pattern 5: Configuration Schema Normalization

Eliminate duplicated configuration validation by defining a base schema that every service extends. Instead of each service parsing and validating its own config from scratch with overlapping field definitions, use a shared base schema with per-service extension hooks for environment-specific overrides.

**BAD — Each service validates config independently:**

```python
# ❌ BAD: services/analytics/config.py — Validates its own config
import os
from dataclasses import dataclass


@dataclass
class AnalyticsConfig:
    """Analytics service configuration — validates everything from scratch."""
    
    @classmethod
    def from_env(cls) -> "AnalyticsConfig":
        db_host = os.environ.get("ANALYTICS_DB_HOST", "")
        if not db_host or "@" in db_host:
            raise ValueError("ANALYTICS_DB_HOST must be a valid hostname")
        
        db_port_str = os.environ.get("ANALYTICS_DB_PORT", "5432")
        try:
            db_port = int(db_port_str)
            if not (1 <= db_port <= 65535):
                raise ValueError(f"Invalid port: {db_port}")
        except ValueError as exc:
            raise ValueError(f"ANALYTICS_DB_PORT must be integer 1-65535, got: {exc}")
        
        db_name = os.environ.get("ANALYTICS_DB_NAME", "")
        if not db_name:
            raise ValueError("ANALYTICS_DB_NAME is required")
        
        api_timeout_str = os.environ.get("ANALYTICS_API_TIMEOUT", "30")
        try:
            api_timeout = int(api_timeout_str)
            if api_timeout < 1 or api_timeout > 300:
                raise ValueError(f"Timeout must be 1-300s, got: {api_timeout}")
        except ValueError as exc:
            raise ValueError(f"ANALYTICS_API_TIMEOUT invalid: {exc}")
        
        return cls(
            db_host=db_host,
            db_port=db_port,
            db_name=db_name,
            api_timeout=api_timeout,
        )


# ❌ BAD: services/billing/config.py — Same validation pattern, different variable names
import os
from dataclasses import dataclass


@dataclass
class BillingConfig:
    """Billing service configuration — re-validates identical fields from scratch."""
    
    @classmethod
    def from_env(cls) -> "BillingConfig":
        db_host = os.environ.get("BILLING_DB_HOST", "")
        if not db_host or "@" in db_host:
            raise ValueError("BILLING_DB_HOST must be a valid hostname")  # same logic!
        
        db_port_str = os.environ.get("BILLING_DB_PORT", "5432")
        try:
            db_port = int(db_port_str)
            if not (1 <= db_port <= 65535):
                raise ValueError(f"Invalid port: {db_port}")  # same logic!
        except ValueError as exc:
            raise ValueError(f"BILLING_DB_PORT must be integer 1-65535: {exc}")  # same logic!
        
        db_name = os.environ.get("BILLING_DB_NAME", "")
        if not db_name:
            raise ValueError("BILLING_DB_NAME is required")  # same logic!
        
        api_timeout_str = os.environ.get("BILLING_API_TIMEOUT", "30")
        try:
            api_timeout = int(api_timeout_str)
            if api_timeout < 1 or api_timeout > 300:
                raise ValueError(f"Timeout must be 1-300s, got: {api_timeout}")  # same logic!
        except ValueError as exc:
            raise ValueError(f"BILLING_API_TIMEOUT invalid: {exc}")  # same logic!
        
        # Plus billing-specific fields...
        stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
        if not stripe_key.startswith("sk_"):
            raise ValueError("STRIPE_SECRET_KEY must start with sk_")
        
        return cls(
            db_host=db_host,
            db_port=db_port,
            db_name=db_name,
            api_timeout=api_timeout,
            stripe_key=stripe_key,
        )


# ❌ BAD: services/inventory/config.py — Third copy of the same validation logic
import os
from dataclasses import dataclass


@dataclass
class InventoryConfig:
    @classmethod
    def from_env(cls) -> "InventoryConfig":
        db_host = os.environ.get("INVENTORY_DB_HOST", "")
        if not db_host or "@" in db_host:  # SAME validation, AGAIN
            raise ValueError("INVENTORY_DB_HOST must be a valid hostname")
        
        db_port_str = os.environ.get("INVENTORY_DB_PORT", "5432")
        try:
            db_port = int(db_port_str)
            if not (1 <= db_port <= 65535):  # SAME validation, AGAIN
                raise ValueError(f"Invalid port: {db_port}")
        except ValueError as exc:
            raise ValueError(f"INVENTORY_DB_PORT invalid: {exc}")
        
        db_name = os.environ.get("INVENTORY_DB_NAME", "")
        if not db_name:  # SAME validation, AGAIN
            raise ValueError("INVENTORY_DB_NAME is required")
        
        api_timeout_str = os.environ.get("INVENTORY_API_TIMEOUT", "30")
        try:
            api_timeout = int(api_timeout_str)
            if api_timeout < 1 or api_timeout > 300:  # SAME validation, AGAIN
                raise ValueError(f"Timeout must be 1-300s, got: {api_timeout}")
        except ValueError as exc:
            raise ValueError(f"INVENTORY_API_TIMEOUT invalid: {exc}")
        
        return cls(...)
```

**GOOD — Shared base config schema with per-service extensions:**

```python
# ✅ GOOD: config/schema.py — Canonical base configuration schema
import os
from dataclasses import dataclass, field, fields as dataclass_fields
from typing import Any, ClassVar


@dataclass
class BaseConfig:
    """Canonical shared configuration schema for all microservices.
    
    Every service extends this class and adds only its own fields.
    Validation logic lives in one place — the validate() method below.
    Environment-specific overrides are supported via the environment_name field.
    """
    
    # Shared fields present in every service
    db_host: str
    db_port: int
    db_name: str
    api_timeout: int
    
    # Metadata for environment-aware configuration loading
    environment_name: str = "development"
    
    _VALID_PORT_RANGE: ClassVar[tuple[int, int]] = (1, 65535)
    _TIMEOUT_RANGE: ClassVar[tuple[int, int]] = (1, 300)
    
    @classmethod
    def from_env(cls) -> "BaseConfig":
        """Load configuration from environment variables.
        
        Extracts shared fields using the service-specific prefix pattern:
        <SERVICE>_DB_HOST, <SERVICE>_DB_PORT, etc.
        
        Returns:
            Fully validated config instance for this service.
        
        Raises:
            ValueError: If any required field fails validation.
        """
        service_prefix = cls._get_service_prefix()
        
        db_host = os.environ.get(f"{service_prefix}_DB_HOST", "").strip()
        db_port_str = os.environ.get(f"{service_prefix}_DB_PORT", "5432").strip()
        db_name = os.environ.get(f"{service_prefix}_DB_NAME", "").strip()
        api_timeout_str = os.environ.get(f"{service_prefix}_API_TIMEOUT", "30").strip()
        
        # Parse shared values first
        try:
            db_port = cls._parse_int(db_port_str, f"{service_prefix}_DB_PORT")
        except ValueError as exc:
            raise ValueError(str(exc))
        
        try:
            api_timeout = cls._parse_int(api_timeout_str, f"{service_prefix}_API_TIMEOUT")
        except ValueError as exc:
            raise ValueError(str(exc))
        
        config = cls(
            db_host=db_host,
            db_port=db_port,
            db_name=db_name,
            api_timeout=api_timeout,
            environment_name=os.environ.get("APP_ENV", "development"),
        )
        
        # Run full validation including service-specific fields
        errors = config.validate()
        if errors:
            raise ValueError(f"Configuration validation failed:\n" + "\n".join(errors))
        
        return config
    
    @classmethod
    def _get_service_prefix(cls) -> str:
        """Extract service prefix from class name (e.g., 'AnalyticsConfig' → 'ANALYTICS')."""
        name = cls.__name__.removesuffix("Config")
        return name.upper()
    
    @staticmethod
    def _parse_int(value: str, field_name: str) -> int:
        """Parse and validate an integer environment variable."""
        if not value.isdigit():
            raise ValueError(f"{field_name} must be a positive integer, got: {value!r}")
        return int(value)
    
    def validate(self) -> list[str]:
        """Validate all configuration fields. Returns empty list if valid.
        
        Checks hostname format, port range, timeout bounds, and
        delegates to service-specific validate_override() hooks.
        
        Returns:
            List of human-readable validation error messages.
        """
        errors: list[str] = []
        
        if not self.db_host or "@" in self.db_host:
            errors.append("db_host must be a valid hostname without @ symbol")
        
        if not (self._VALID_PORT_RANGE[0] <= self.db_port <= self._VALID_PORT_RANGE[1]):
            errors.append(f"db_port must be between {self._VALID_PORT_RANGE[0]} and {self._VALID_PORT_RANGE[1]}")
        
        if not self.db_name:
            errors.append("db_name is required")
        
        if not (self._TIMEOUT_RANGE[0] <= self.api_timeout <= self._TIMEOUT_RANGE[1]):
            errors.append(f"api_timeout must be between {self._TIMEOUT_RANGE[0]} and {self._TIMEOUT_RANGE[1]} seconds")
        
        # Allow subclass to add its own validation rules
        errors.extend(self.validate_override())
        
        return errors
    
    def validate_override(self) -> list[str]:
        """Override in subclasses to add service-specific validation.
        
        Returns empty list by default (no additional rules).
        """
        return []


# ✅ GOOD: services/analytics/config.py — Extends base, adds only analytics-specific fields
from dataclasses import dataclass


@dataclass
class AnalyticsConfig(BaseConfig):
    """Analytics service configuration — extends shared schema with analytics-only fields."""
    
    # Service-specific field
    warehouse_connection_string: str = ""
    batch_size: int = 500
    
    def validate_override(self) -> list[str]:
        errors: list[str] = []
        if self.warehouse_connection_string and "://" not in self.warehouse_connection_string:
            errors.append("warehouse_connection_string must include a protocol scheme (e.g., postgres://)")
        if not (1 <= self.batch_size <= 10000):
            errors.append(f"batch_size must be between 1 and 10000, got: {self.batch_size}")
        return errors


# ✅ GOOD: services/billing/config.py — Extends base, adds only billing-specific fields
@dataclass
class BillingConfig(BaseConfig):
    """Billing service configuration — extends shared schema with billing-only fields."""
    
    stripe_secret_key: str = ""
    webhook_signing_secret: str = ""
    
    def validate_override(self) -> list[str]:
        errors: list[str] = []
        if self.stripe_secret_key and not self.stripe_secret_key.startswith("sk_"):
            errors.append("stripe_secret_key must start with sk_")
        if self.webhook_signing_secret and len(self.webhook_signing_secret) < 16:
            errors.append("webhook_signing_secret must be at least 16 characters")
        return errors


# Usage in any service — zero duplicated validation logic:
# config = AnalyticsConfig.from_env()   # validates everything, shared + specific
# config = BillingConfig.from_env()     # same pattern, different fields
```

**When to apply:** When ≥2 services independently define and validate the same set of configuration fields (database URLs, timeouts, feature flags). A shared base schema ensures validation rules stay consistent across all services.

---

### Pattern 6: Data Validation Rules Centralization

Unify data validation logic that appears in model layers, API serializers, CLI handlers, and test fixtures. Instead of implementing email format checking or phone number validation independently in each layer, define a single rule registry that is applied at every boundary with consistent results.

**BAD — Email validation implemented three different ways:**

```python
# ❌ BAD: models/user.py — Model layer uses one regex
import re


class User(Base):
    __tablename__ = "users"
    
    email: Mapped[str]
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Model-layer email validation."""
        # Pattern A: allows + and dots, requires domain
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        return bool(re.match(pattern, email))


# ❌ BAD: api/serializers.py — Serializer uses a different regex
from pydantic import BaseModel, field_validator


class UserSerializer(BaseModel):
    email: str
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Serializer-layer email validation — DIFFERENT RULE."""
        # Pattern B: rejects addresses with dots in local part
        pattern = r"^[a-zA-Z0-9_-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$"  # no dots or + allowed!
        if not re.match(pattern, v):
            raise ValueError("Invalid email format")
        return v.lower()


# ❌ BAD: api/handlers.py — CLI handler uses a third implementation
def handle_user_registration(data: dict) -> tuple[bool, str]:
    """CLI handler email validation — THIRD DIFFERENT RULE."""
    email = data.get("email", "")
    
    # Pattern C: rejects subdomains entirely
    if "@" not in email or "." not in email.split("@")[1]:
        return False, "Invalid email"
    
    local_part = email.split("@")[0]
    if len(local_part) < 3:
        return False, "Email too short"
    
    # No check on domain format at all — silently accepts invalid domains
    return True, "OK"


# ❌ BAD: tests/test_user.py — Tests use a fourth validation for fixtures
def build_test_user(email: str | None = None) -> dict:
    """Test fixture builder with its own email generation."""
    if email is None:
        # No validation at all — just concatenates random strings
        email = f"test{random.randint(1,9999)}@example.com"
    
    return {"email": email}  # passes through whatever was provided


# Result: a user with "user.name+tag@example.co.uk" might pass the model check,
# fail the serializer check (dots in local part), and succeed the CLI handler
# — all for the same input. Inconsistent validation leads to data corruption.
```

**GOOD — Single rule registry applied at every layer:**

```python
# ✅ GOOD: validation/rules.py — Canonical validation rule registry
from dataclasses import dataclass
from collections.abc import Callable
from typing import Any


@dataclass(frozen=True)
class ValidationRule:
    """A single named validation rule with a check function and error message."""
    
    name: str
    check: Callable[[Any], bool]
    message: str
    
    def validate(self, value: Any) -> str | None:
        """Run the rule check. Returns None if valid, error string otherwise."""
        if not self.check(value):
            return self.message
        return None


@dataclass(frozen=True)
class ValidationResult:
    """Result of running all rules against a value."""
    
    is_valid: bool
    errors: list[tuple[str, str]]  # (rule_name, error_message)
    
    @property
    def error_summary(self) -> str:
        """Human-readable summary of all failures."""
        return "; ".join(msg for _, msg in self.errors)


class RuleRegistry:
    """Central registry of validation rules shared across all layers.
    
    Each rule is registered once and can be composed into named groups
    (e.g., "email", "phone", "currency") applied at model, serializer,
    handler, or test boundary.
    """
    
    _rules: dict[str, list[ValidationRule]] = {}
    _global_rules: list[ValidationRule] = []
    
    @classmethod
    def register(cls, group: str, rule: ValidationRule) -> None:
        """Register a validation rule under a named group.
        
        Args:
            group: Logical grouping (e.g., "email", "phone_number").
            rule: The validation rule to register.
        """
        if group not in cls._rules:
            cls._rules[group] = []
        cls._rules[group].append(rule)
    
    @classmethod
    def add_global(cls, rule: ValidationRule) -> None:
        """Register a rule applied to every validation group."""
        cls._global_rules.append(rule)
    
    @classmethod
    def validate(cls, group: str, value: Any) -> ValidationResult:
        """Run all rules in a group against a value.
        
        Args:
            group: Rule group name (e.g., "email").
            value: Value to validate.
        
        Returns:
            ValidationResult with pass/fail and any error messages.
        """
        errors: list[tuple[str, str]] = []
        
        rules = cls._rules.get(group, [])
        for rule in rules:
            err = rule.validate(value)
            if err is not None:
                errors.append((rule.name, err))
        
        # Apply global rules too
        for rule in cls._global_rules:
            err = rule.validate(value)
            if err is not None and (rule.name, err) not in errors:
                errors.append((rule.name, err))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
        )


# --- Define canonical rules at module load time ---

RuleRegistry.register("email", ValidationRule(
    name="required",
    check=lambda v: isinstance(v, str) and len(v.strip()) > 0,
    message="Email is required",
))

RuleRegistry.register("email", ValidationRule(
    name="format",
    check=lambda v: isinstance(v, str) and bool(re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$", v)),
    message="Email must be a valid address (e.g., user@domain.com)",
))

RuleRegistry.register("phone_number", ValidationRule(
    name="format",
    check=lambda v: isinstance(v, str) and bool(re.match(r"^\+?[1-9]\d{1,14}$", v)),
    message="Phone must be E.164 format (e.g., +14155551234)",
))


# --- Usage in every layer — identical validation everywhere ---

# ✅ GOOD: models/user.py — Model uses canonical registry
class User(Base):
    __tablename__ = "users"
    
    email: Mapped[str]
    
    @classmethod
    def validate_email(cls, email: str) -> ValidationResult:
        """Validate email using the canonical rule registry."""
        return RuleRegistry.validate("email", email)


# ✅ GOOD: api/serializers.py — Serializer uses the SAME registry
class UserSerializer(BaseModel):
    email: str
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        result = RuleRegistry.validate("email", v)
        if not result.is_valid:
            raise ValueError(result.error_summary)
        return v.lower().strip()


# ✅ GOOD: api/handlers.py — Handler uses the SAME registry
def handle_user_registration(data: dict) -> tuple[bool, str]:
    email = data.get("email", "")
    result = RuleRegistry.validate("email", email)
    if not result.is_valid:
        return False, result.error_summary
    return True, "OK"


# ✅ GOOD: tests/test_user.py — Tests use the SAME registry for fixtures
def build_test_user(email: str | None = None) -> dict:
    """Test fixture builder — validates before returning."""
    if email is None:
        email = f"test{random.randint(1000, 9999)}@example.com"
    
    result = RuleRegistry.validate("email", email)
    if not result.is_valid:
        raise ValueError(f"Test fixture email failed validation: {result.error_summary}")
    
    return {"email": email}


# All four layers now enforce identical rules. Change the regex in one place,
# and every layer gets the update automatically. Zero divergence possible.
```

**When to apply:** When ≥2 layers (models, serializers, handlers, tests) each implement their own version of the same validation rule with different logic or regex patterns. A shared registry ensures consistent enforcement across all boundaries.

---

## Constraints

### MUST DO

- Run schema migrations with backward-compatible dual-write during transition: write to both old and new locations simultaneously before removing readers from either path
- Document the canonical source of truth for each data element in the data dictionary — every deduplicated field must have exactly one authoritative definition with a link to its source
- Update API contract consumers before removing duplicate endpoint definitions — ensure all clients can handle the canonical shape before deprecating legacy shapes
- Verify referential integrity after consolidation: run foreign key constraint checks, nullability audits, and type compatibility verification against all consumer code paths
- Preserve per-environment overrides in centralized configuration: shared base schemas must not hardcode environment-specific values like production database URLs or staging feature flags

### MUST NOT DO

- Extract shared schemas that serve only one caller pair — this creates unnecessary coupling without reducing duplication risk; deduplication requires ≥2 consumers of the same definition
- Remove validation at the API layer hoping the model layer covers it — defense-in-depth is required; apply the canonical rule registry at every boundary independently
- Centralize configuration without per-environment override support — shared config schemas must allow environment-specific values (e.g., `db_host` differs between dev, staging, and production)
- Deduplicate data that changes infrequently across ≤1 team iteration — if a definition has been stable for years and is used by only one service, the coupling overhead outweighs the benefit

---

## Output Template

When applying this skill to audit or refactor a codebase, produce:

1. **Duplication Inventory** — Table of all duplicated data elements with: field name, locations (table/model/endpoint), definition divergence status (identical vs. drifted), and consumer count
2. **Canonical Source Selection** — For each duplication candidate, identify the chosen canonical definition with rationale (most consumers, owning team, simplest form)
3. **Consolidation Strategy Mapping** — For each deduplicated element, specify the pattern applied: schema centralization, transform pipeline, response envelope, query builder, config base class, or rule registry
4. **Migration Plan** — Step-by-step dual-write migration schedule with consumer groups ordered by risk and impact, including rollback criteria for each step
5. **Integrity Verification Results** — Post-migration FK constraint checks, nullability audit results, and type compatibility confirmation across all affected consumer code paths

---

## Related Skills

| Skill | Purpose |
|---|---|
| `deduplication-patterns` | Code-level DRY (extract method, template method, strategy) for function/class duplication — use alongside this skill when both data and code layers have duplication |
| `data-modeling` | Data modeling fundamentals (normalization, ER diagrams, domain-driven design) — foundational knowledge before consolidating schemas |
| `dry-principles` | The DRY principle in software engineering — conceptual framework that guides when deduplication creates value vs. unnecessary coupling |
| `refactoring-techniques` | Safe refactoring patterns (extract class, move method, replace temp with query) — applies to code-level changes during data consolidation migrations |
| `code-quality-metrics` | Measure duplication metrics (Cognitive Complexity, DRY score, cyclomatic complexity) — use before and after deduplication to quantify improvement |

---

## Live References

> Authoritative documentation for data-layer design, ETL patterns, and schema migration best practices.

- [Martin Fowler — Extract Method](https://martinfowler.com/articles/refactoring.html)
- [Data Warehouse Toolkit — Dimensional Modeling (Kimball)](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/dimensional-modeling-technique/)
- [SQLAlchemy 2.0 ORM Mapped Classes Documentation](https://docs.sqlalchemy.org/en/20/orm/declaration_styles.html)
- [Apache Airflow — Pipeline Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)
- [Django REST Framework — Serialization](https://www.django-rest-framework.org/api-guide/serializers/)
- [Pydantic v2 — Validation and Serialization](https://docs.pydantic.dev/latest/)
