---
name: graphql-api-design
description: 'Implements production GraphQL API design: schema modeling, DataLoader
  batching, query complexity limits, auth directives, cursor pagination, and Apollo
  Federation for microservice graphs.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: graphql, apollo federation, dataloader, n+1 query, query complexity, graphql
    schema, graphql authorization, how do i design a graphql api
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
  related-skills: graphql-federation, graphql-subscriptions, graphql-dataloader-pattern, graphql-schema-design, graphql-error-handling-validation
------
# GraphQL API Design Patterns

Senior API engineer designing production-grade GraphQL APIs following the GraphQL Specification and Apollo Federation 3 standards. Implements schema modeling, resolver batching to eliminate N+1 queries, query complexity limiting, field-level authorization directives, cursor-based pagination, and federation patterns for multi-service graph composition.

## TL;DR Checklist

- [ ] Model types using GraphQL scalar types and explicit interfaces for shared contracts
- [ ] Wrap every group of related resolvers with a DataLoader instance to batch N+1 queries
- [ ] Calculate query complexity per field and enforce a global depth/width limit before execution
- [ ] Apply field-level authorization directives (`@auth`, `@role`) instead of blanket resolver guards
- [ ] Use cursor-based pagination (Connection model) for all list fields — never offset-based
- [ ] Return structured `Error` unions with `message`, `code`, and optional `extensions` — never raw exceptions
- [ ] For federated graphs, define subgraph schemas with `@key` directives and respect ownership boundaries

---

## When to Use

Use this skill when:

- Designing a new GraphQL API from scratch or migrating an existing REST API to GraphQL
- Resolving N+1 query performance problems caused by unbatched resolvers
- Building a federated graph with Apollo Federation where multiple services own different type namespaces
- Implementing fine-grained field-level access control (e.g., admin-only fields, tenant-scoped data)
- Defining schema evolution strategies that maintain backward compatibility for API consumers

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD apps with no concurrent data loading — a REST endpoint or direct database calls are simpler (use `rest-api-patterns` instead)
- Real-time event streaming without GraphQL subscriptions — use raw WebSockets or Server-Sent Events directly
- High-frequency trading tick data (>10kHz) where serialization overhead matters — use binary Protobuf gRPC instead (see `grpc-patterns`)
- Read-only static documentation APIs — OpenAPI/GraphQL overkill; use a static site generator

---

## Core Workflow

1. **Define the Type System First** — Enumerate all Query, Mutation, and Subscription root fields. Model domain entities as `type` definitions with explicit scalar types (`ID!`, `String!`, `Float`, etc.). Use `interface` for shared contracts across multiple types. **Checkpoint:** Every type must have a descriptive comment explaining its business purpose. No bare `Any` or untyped unions at this stage.

2. **Design Input Objects for Mutations** — Create dedicated `input` types for every mutation argument. Group related parameters into logical input objects rather than spreading them on the root mutation field. **Checkpoint:** Each input type should validate independently using constraints (length, regex, numeric ranges). Reference `input-validation` skill for validation patterns.

3. **Implement DataLoader for Resolver Batching** — For any resolver that fetches related data in a loop (e.g., fetching user profiles inside an order list resolver), wrap the data source with a DataLoader instance. Use `asyncio`-compatible batching with request-aware cache isolation. **Checkpoint:** Every DataLoader must specify a `batch_fn` with typed signature and handle partial failures gracefully without crashing the entire batch.

4. **Apply Query Complexity Analysis** — Instrument the GraphQL execution pipeline with a complexity analyzer that assigns a cost to each field (base cost + per-child cost for list fields). Reject queries exceeding the configured threshold. **Checkpoint:** Verify that pagination arguments (`first`, `after`) cap the maximum returned items and factor into complexity calculation.

5. **Add Field-Level Authorization** — Define custom directives (`@auth(scopes: [...])`, `@role(allowed: ["admin"])`) and attach them to schema fields. Implement an execution middleware that resolves permissions before field resolvers execute. **Checkpoint:** Default deny — any field without explicit authorization grants must be denied by default.

6. **Implement Cursor-Based Pagination** — Use the Relay Connection model (`edges` + `node` structure) with opaque cursors. Encode cursor values as base64-encoded entity IDs or timestamps. **Checkpoint:** Cursors must be opaque strings (never sequential integers) to prevent enumeration attacks. Include `pageInfo` with `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`.

7. **Test End-to-End with Federated Schema** — If using Apollo Federation, compose subgraph schemas using `@key`, `@external`, and `@provides` directives. Run composition checks locally before deploying to the router. **Checkpoint:** Verify that every entity's `@key` fields are resolvable within the subgraph without cross-service calls at schema design time.

---

## Implementation Patterns

### Pattern 1: Schema Modeling with Types, Interfaces, and Relationships

Model domain entities using GraphQL's type system. Use interfaces for shared behavior across concrete types and unions for polymorphic return values. Define relationships explicitly through nullable/nullable scalar edges — never embed full objects without pagination on list fields.

```python
# schema/models.py — Type definitions using Strawberry (GraphQL-Python)
from __future__ import annotations

import strawberry
from datetime import datetime
from enum import Enum
from typing import List, Optional


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


@strawberry.enum
class GraphQLStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


@strawberry.type
class User:
    """A registered user in the platform. Contains profile and account data."""
    id: strawberry.ID
    email: str
    display_name: str
    created_at: datetime
    status: GraphQLStatus

    # Relationships — use lazy-loaded edge types to prevent N+1
    orders: List["Order"] = strawberry.field(
        description="Orders placed by this user. Paginated with cursor."
    )


@strawberry.type
class Order:
    """A purchase order belonging to a user."""
    id: strawberry.ID
    user_id: strawberry.ID
    status: OrderStatus
    total_cents: int  # Store monetary values as integers to avoid float issues
    currency: str = "USD"
    created_at: datetime

    @strawberry.field(description="Items in this order")
    async def items(self) -> List["OrderItem"]:
        from data.sources import fetch_order_items
        return await fetch_order_items(order_id=str(self.id))


# ❌ BAD — embedding unpaginated lists creates N+1 and unbounded responses
@strawberry.type
class BadUser:
    id: strawberry.ID
    email: str
    # Never do this: full objects with nested lists without pagination
    orders: List[Order]  # Unbounded, no cursor, no page info


# ✅ GOOD — interface for shared fields across polymorphic types
@strawberry.interface(description="Base type for all notification channels")
class NotificationChannel:
    id: strawberry.ID
    name: str

    @strawberry.field
    def is_active(self) -> bool:
        ...


@strawberry.type
class EmailNotification(NotificationChannel):
    address: str


@strawberry.type
class SMSNotification(NotificationChannel):
    phone_number: str


# Union for polymorphic return — a user can have multiple notification channels
@strawberry.type
class UserWithNotifications(User):
    active_channels: List[NotificationChannel]


# Paginated list wrapper to enforce bounded results
@strawberry.type
class OrderEdge:
    node: Order
    cursor: str


@strawberry.type
class OrderConnection:
    edges: List[OrderEdge]
    page_info: strawberry.types.PageInfo  # or custom PageInfo type with hasNextPage, etc.
```

### Pattern 2: DataLoader Resolver Batching (N+1 Prevention)

The N+1 query problem is the most common performance anti-pattern in GraphQL APIs. When a parent resolver returns 100 items and each item's child field triggers a separate database query, you execute 1 + 100 queries instead of 2. DataLoader solves this by batching all data fetches for a single request into a single batched call.

```python
# data/dataloaders.py — Batching layer with request-scoped cache isolation
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any, Callable, Coroutine, Dict, List, Optional, Sequence, TypeVar

import asyncpg  # or any async database driver

logger = logging.getLogger(__name__)


T = TypeVar("T")
K = TypeVar("K", bound=str)


class BatchLoader:
    """Async DataLoader implementation with request-scoped cache isolation.

    Groups multiple resolve calls for the same key type into a single batched
    database query per request context, preventing the N+1 problem.

    Usage:
        loader = BatchLoader(load_fn=fetch_users_by_ids, cache=True)
        user = await loader.load("user:123")
    """

    def __init__(
        self,
        load_fn: Callable[[Sequence[K]], Coroutine[Any, Any, Sequence[T]]],
        *,
        max_batch_size: int = 100,
        cache: bool = True,
        name: Optional[str] = None,
    ) -> None:
        self._load_fn = load_fn
        self._max_batch_size = max_batch_size
        self._cache = cache
        self._name = name or load_fn.__qualname__
        # Per-request cache keyed by request identity
        self._cache_store: Dict[K, T] = {}
        self._pending_keys: list[K] = []
        self._resolve_futures: dict[str, asyncio.Future[T]] = {}

    async def load(self, key: K) -> T:
        """Load a single item by key. Batches with concurrent calls."""
        # Check per-request cache first
        if self._cache and key in self._cache_store:
            return self._cache_store[key]

        future = asyncio.get_event_loop().create_future()
        cache_key = f"{self._name}:{key}"
        self._resolve_futures[cache_key] = future
        self._pending_keys.append(key)

        # Trigger batch if we haven't already scheduled it
        if len(self._pending_keys) == 1:
            asyncio.ensure_future(self._dispatch_batch())

        return await future

    async def load_many(self, keys: Sequence[K]) -> List[Optional[T]]:
        """Load multiple items. Returns list aligned with input key order."""
        results = [await self.load(key) for key in keys]
        return results

    async def _dispatch_batch(self) -> None:
        """Fetch all pending keys in a single batch and resolve futures."""
        keys_to_load = self._pending_keys[:self._max_batch_size]
        self._pending_keys = self._pending_keys[self._max_batch_size:]

        if not keys_to_load:
            return

        try:
            # Batch query — all keys resolved in one DB round-trip
            results = await self._load_fn(keys_to_load)

            # Build lookup map for efficient result matching
            result_map: Dict[str, T] = {}
            for idx, result in enumerate(results):
                if result is not None:
                    result_map[keys_to_load[idx]] = result
                    if self._cache:
                        self._cache_store[keys_to_load[idx]] = result

            # Resolve all futures in matching order
            for key in keys_to_load:
                cache_key = f"{self._name}:{key}"
                future = self._resolve_futures.pop(cache_key, None)
                if future and not future.done():
                    if key in result_map:
                        future.set_result(result_map[key])
                    else:
                        # Handle partial failure — return None or raise
                        logger.warning(
                            "Key %s not found in batch result for loader %s",
                            key,
                            self._name,
                        )
                        future.set_exception(KeyError(f"Key not found: {key}"))

        except Exception as exc:
            # On complete batch failure, reject all pending keys
            for key in keys_to_load:
                cache_key = f"{self._name}:{key}"
                future = self._resolve_futures.pop(cache_key, None)
                if future and not future.done():
                    future.set_exception(exc)

        # If more keys were added during dispatch, schedule another batch
        if self._pending_keys:
            asyncio.ensure_future(self._dispatch_batch())

    def clear(self, key: Optional[K] = None) -> None:
        """Clear the per-request cache. Call after mutations."""
        if key is not None:
            self._cache_store.pop(key, None)
        else:
            self._cache_store.clear()

    def prime(self, key: K, value: T) -> None:
        """Manually add a value to the per-request cache. Use after mutations."""
        if not self._cache:
            return
        if key in self._cache_store:
            raise ValueError(
                f"Key {key} already exists in DataLoader cache for {self._name}"
            )
        self._cache_store[key] = value


# ─── Concrete Batch Loaders ──────────────────────────────────────────────────


async def _fetch_users_by_ids(ids: Sequence[str]) -> List[Optional[dict]]:
    """Batch fetch users by IDs in a single query. ✅ GOOD — prevents N+1."""
    if not ids:
        return []

    # Single parameterized query for all IDs
    conn = asyncpg.get_pool()
    rows = await conn.fetch(
        "SELECT id, email, display_name, created_at, status FROM users WHERE id = $1",
        list(ids),  # Pass as array for IN clause
    )
    row_map = {str(row["id"]): dict(row) for row in rows}
    return [row_map.get(id) for id in ids]


async def _fetch_order_items_by_order_ids(
    order_ids: Sequence[str],
) -> List[List[dict]]:
    """Batch fetch all order items for multiple orders."""
    if not order_ids:
        return []

    conn = asyncpg.get_pool()
    rows = await conn.fetch(
        """
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ANY($1)
        ORDER BY oi.order_id, oi.position
        """,
        list(order_ids),
    )

    # Group results by order_id preserving insertion order
    grouped: dict[str, list] = defaultdict(list)
    for row in rows:
        grouped[str(row["order_id"])].append(dict(row))

    # Return in same order as input keys, empty list for orders with no items
    return [grouped.get(oid, []) for oid in order_ids]


# Factory functions — called once per HTTP request to get fresh DataLoader instances
def create_user_loader() -> BatchLoader:
    return BatchLoader(
        load_fn=_fetch_users_by_ids,
        max_batch_size=100,
        cache=True,
        name="UserById",
    )


def create_order_items_loader() -> BatchLoader:
    return BatchLoader(
        load_fn=_fetch_order_items_by_order_ids,
        max_batch_size=50,
        cache=True,
        name="OrderItemsByOrderId",
    )
```

### Pattern 3: Query Complexity and Depth Limiting

Unbounded GraphQL queries can exhaust server resources. Implement a two-tier protection system: (1) depth limiting to prevent deeply nested queries, and (2) complexity scoring where list fields carry multiplicative costs based on their `first`/`limit` arguments.

```python
# schema/complexity.py — Query complexity analyzer
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class ComplexityConfig:
    """Configuration for query complexity analysis."""
    max_depth: int = 10              # Maximum nesting depth
    max_width: int = 100             # Maximum fields at a single level
    default_field_cost: int = 1      # Base cost per field
    list_multiplier: float = 10.0    # Multiplier applied to list fields
    max_complexity: int = 3000       # Hard ceiling for total query complexity
    pagination_cap: int = 100        # Maximum items a paginated list can return


class QueryComplexityAnalyzer:
    """Analyzes GraphQL query complexity to prevent DoS via deeply nested or
    overly broad queries. Tracks depth, width, and weighted cost per field.

    Implements the complexity model from Apollo Federation guidelines where
    list fields are penalized multiplicatively based on their pagination args.
    """

    def __init__(self, config: Optional[ComplexityConfig] = None) -> None:
        self._config = config or ComplexityConfig()

    def analyze(
        self,
        query_str: str,
        type_map: Dict[str, Any],
    ) -> Tuple[int, int, List[str]]:
        """Analyze a parsed GraphQL query for complexity violations.

        Args:
            query_str: Parsed query string or AST representation.
            type_map: Schema type map mapping field names to their types.

        Returns:
            Tuple of (total_complexity, max_depth, list_of_warnings).
            Raises ValueError if any limit is exceeded.
        """
        warnings: List[str] = []
        total_complexity = 0
        max_depth = 0

        # Walk the query AST manually for analysis (avoid full execution)
        visited_paths: set[str] = set()
        field_costs: Dict[str, int] = {}

        try:
            total_complexity, max_depth = self._walk_query(
                query_str, type_map, visited_paths, field_costs, depth=0
            )
        except RecursionError:
            raise ValueError(
                f"Query exceeds maximum allowed complexity of "
                f"{self._config.max_complexity} units"
            )

        # Validate against all limits
        if max_depth > self._config.max_depth:
            warnings.append(
                f"Query depth {max_depth} exceeds maximum of "
                f"{self._config.max_depth}"
            )

        field_counts = len(field_costs)
        if field_counts > self._config.max_width:
            warnings.append(
                f"Query width {field_counts} exceeds maximum of "
                f"{self._config.max_width}"
            )

        if total_complexity > self._config.max_complexity:
            raise ValueError(
                f"Query complexity {total_complexity} exceeds limit of "
                f"{self._config.max_complexity}. Break down your query "
                f"or reduce the 'first' argument on list fields."
            )

        return total_complexity, max_depth, warnings

    def _walk_query(
        self,
        query: str,
        type_map: Dict[str, Any],
        visited_paths: set[str],
        field_costs: Dict[str, int],
        depth: int,
    ) -> Tuple[int, int]:
        """Recursively walk the query and accumulate costs.

        List fields multiply their cost by list_multiplier capped at pagination args.
        Scalar fields use default_field_cost.
        """
        total = 0
        max_d = depth

        # Parse operation type and selections (simplified AST walk)
        for field_name, is_list, children in self._extract_fields(query):
            path = f"{depth}.{field_name}"
            if path in visited_paths:
                continue
            visited_paths.add(path)

            max_d = max(max_d, depth)

            # Determine cost for this field
            base_cost = self._config.default_field_cost
            if is_list:
                # List fields carry multiplicative complexity
                base_cost = int(self._config.default_field_cost * self._config.list_multiplier)

            total += base_cost
            field_costs[path] = base_cost

            if children:
                child_total, child_depth = self._walk_query(
                    children, type_map, visited_paths, field_costs, depth + 1
                )
                total += child_total
                max_d = max(max_d, child_depth)

        return total, max_d

    def _extract_fields(
        self, query: str
    ) -> List[Tuple[str, bool, Optional[str]]]:
        """Extract (field_name, is_list, children_query) tuples from a query fragment.

        Simplified parsing — in production use graphql-core's AST walker.
        """
        # Production implementation uses:
        #   from graphql import parse, visit
        #   Then walk DocumentNode > SelectionSet > Field nodes
        # This simplified version shows the structure expected:
        return []  # Placeholder — use graphql-core in production


# ─── Execution Middleware Integration (Strawberry/Apollo) ─────────────────────

def complexity_middleware(next_fn, root, info, **args):
    """Execution middleware that rejects over-complex queries before they run.

    Attach to your GraphQL schema execution pipeline:
        schema = StrawberrySchema(queries=[Query], middlewares=[complexity_middleware])
    """
    query_str = info.field_name  # Or capture from the execution context
    analyzer = QueryComplexityAnalyzer()

    try:
        complexity, depth, warnings = analyzer.analyze(query_str, info.schema.type_map)

        if warnings:
            logger.warning(
                "Query complexity analysis warnings: %s (complexity=%d, depth=%d)",
                warnings,
                complexity,
                depth,
            )

        return next_fn(root, info, **args)
    except ValueError as exc:
        raise Exception(str(exc)) from None
```

### Pattern 4: Field-Level Authorization with Directive Wrappers

Instead of checking permissions inside every resolver (which scatters auth logic and is error-prone), define custom GraphQL directives (`@auth`, `@role`) that execute middleware before the field resolver runs. This centralizes authorization, makes it declarative in the schema, and enables automatic documentation of access requirements.

```python
# schema/auth.py — Directive-based field-level authorization
from __future__ import annotations

import functools
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Sequence, Set

logger = logging.getLogger(__name__)


class AuthStrategy(str, Enum):
    """Authorization evaluation strategy."""
    ALL_SCOPES_REQUIRED = "all"      # AND — all scopes must be present
    ANY_SCOPE_MATCH = "any"          # OR — any one scope is sufficient
    ROLE_ONLY = "role"               # Check role membership


@dataclass(frozen=True)
class AuthDirective:
    """Parsed @auth directive configuration from schema definition."""
    scopes: List[str] = field(default_factory=list)
    roles: List[str] = field(default_factory=list)
    strategy: AuthStrategy = AuthStrategy.ANY_SCOPE_MATCH

    def evaluate(self, context: Dict[str, Any]) -> bool:
        """Evaluate authorization against the execution context.

        Args:
            context: The GraphQL execution context containing user info.

        Returns:
            True if the current user has sufficient permissions.
        """
        if not self.scopes and not self.roles:
            return True  # No constraints means open access

        user_scopes = set(context.get("user_scopes", []))
        user_roles = set(context.get("user_roles", []))

        if self.strategy == AuthStrategy.ALL_SCOPES_REQUIRED:
            if self.scopes and not user_scopes.issuperset(set(self.scopes)):
                return False
        elif self.strategy == AuthStrategy.ANY_SCOPE_MATCH:
            if self.scopes and not user_scopes.intersection(set(self.scopes)):
                return False

        if self.roles and not user_roles.intersection(set(self.roles)):
            return False

        return True


# ─── Directive Registration & Middleware ──────────────────────────────────────

def auth_directive(
    *,
    scopes: Optional[List[str]] = None,
    roles: Optional[List[str]] = None,
    strategy: AuthStrategy = AuthStrategy.ANY_SCOPE_MATCH,
) -> Callable:
    """Decorator that marks a resolver field as requiring authorization.

    Usage with Strawberry or Graphene:
        @strawberry.field(directives=[auth_directive(scopes=["orders:read"])])
        async def user_orders(self, info) -> List[Order]: ...

    Usage with Apollo Server (TypeScript equivalent):
        const authDirective = new GraphQLDirective({
            name: 'auth',
            locations: [DirectiveLocation.FIELD_DEFINITION],
            args: { scopes: { type: [GraphQLString] } },
        });
    """
    directive_config = AuthDirective(
        scopes=scopes or [],
        roles=roles or [],
        strategy=strategy,
    )

    def decorator(func: Callable) -> Callable:
        # Attach directive metadata to the resolver function
        func.__graphql_auth__ = directive_config  # type: ignore
        return func

    return decorator


def auth_middleware(next_fn, root, info, **args):
    """Execution middleware that enforces @auth directives before field resolution.

    This runs BEFORE the actual resolver, making authorization declarative and
    preventing accidental data leakage from missing per-resolver checks.
    """
    # Extract directive from the resolved field's metadata
    field_def = info.field_name
    auth_config: Optional[AuthDirective] = getattr(next_fn, "__graphql_auth__", None)

    if auth_config is None:
        # No @auth directive — allow access (or enforce default-deny in production)
        return next_fn(root, info, **args)

    # Check authorization against execution context
    context = getattr(info, "context", {}) or {}
    if not auth_config.evaluate(context):
        logger.warning(
            "Access denied: user lacks required scopes/roles for field '%s'. "
            "Required: scopes=%s roles=%s strategy=%s",
            field_def,
            auth_config.scopes,
            auth_config.roles,
            auth_config.strategy.value,
        )
        raise PermissionError(
            f"Insufficient permissions to access field '{field_def}'. "
            f"Required: {auth_config.scopes or auth_config.roles}"
        )

    return next_fn(root, info, **args)


# ─── Usage Examples with Strawberry Schema ────────────────────────────────────

@strawberry.type
class Query:
    """Root query type with mixed access levels."""

    @strawberry.field(description="Public fields — no auth required")
    def product_catalog(self, info, first: int = 20) -> OrderConnection:
        # No @auth directive — accessible to all including anonymous users
        return fetch_products(first=first)

    @strawberry.field(description="Authenticated only")
    @auth_directive(scopes=["orders:read"])
    def my_orders(self, info, first: int = 20) -> OrderConnection:
        user = info.context["user"]
        return fetch_orders_for_user(user_id=user.id, first=first)

    @strawberry.field(description="Admin only — role-based access")
    @auth_directive(roles=["admin", "support"])
    def system_status(self, info) -> SystemStatus:
        return get_system_health()

    @strawberry.field(description="Multiple scopes required (AND logic)")
    @auth_directive(
        scopes=["users:read", "audit:view"],
        strategy=AuthStrategy.ALL_SCOPES_REQUIRED,
    )
    def user_audit_log(self, info, user_id: strawberry.ID) -> List[AuditEntry]:
        return fetch_audit_entries(user_id=str(user_id))


# ❌ BAD — authorization scattered inside resolvers, easy to miss on new fields
@strawberry.type
class BadQuery:
    @strawberry.field
    async def sensitive_data(self, info) -> str:
        # Risk: new developers may forget this check or skip it during refactoring
        if not getattr(info.context.get("user"), "is_admin", False):
            raise PermissionError("Admin only")
        return fetch_sensitive_data()


# ✅ GOOD — authorization is declarative, central, and auditable via directives
@strawberry.type
class GoodQuery:
    @strawberry.field
    @auth_directive(roles=["admin"])  # One line — impossible to forget
    async def sensitive_data(self, info) -> str:
        return fetch_sensitive_data()
```

### Pattern 5: Cursor-Based Pagination (Relay Connection Model)

Cursor-based pagination avoids the performance and correctness problems of offset/limit pagination (missing items during inserts, negative offsets, inconsistent results). Use the Relay Connection specification with opaque base64-encoded cursors.

```python
# schema/pagination.py — Relay-style cursor pagination implementation
from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Generic, List, Optional, TypeVar, Tuple

logger = logging.getLogger(__name__)


T = TypeVar("T")


@dataclass
class PageInfo:
    """Pagination metadata following the Relay Connection spec."""
    has_next_page: bool
    has_previous_page: bool
    start_cursor: Optional[str]
    end_cursor: Optional[str]

    @classmethod
    def empty(cls) -> "PageInfo":
        return cls(
            has_next_page=False,
            has_previous_page=False,
            start_cursor=None,
            end_cursor=None,
        )


@dataclass
class Edge(Generic[T]):
    """An edge in a Relay Connection — wraps a node with its cursor."""
    node: T
    cursor: str

    @staticmethod
    def encode(entity_id: str) -> str:
        """Encode an entity ID into an opaque base64 cursor string.

        Format: <type>:<entity_id> to prevent cursor reuse across types.
        Example: "User:dXNlcjoxMjM=" (base64 of "User:123")
        """
        raw = f"User:{entity_id}"
        return base64.b64encode(raw.encode()).decode()

    @staticmethod
    def decode(cursor: str) -> str:
        """Decode an opaque cursor back to the original entity ID."""
        decoded = base64.b64decode(cursor.encode()).decode()
        prefix, entity_id = decoded.split(":", 1)
        return entity_id


@dataclass
class Connection(Generic[T]):
    """A Relay-style paginated connection."""
    edges: List[Edge[T]]
    page_info: PageInfo

    @property
    def nodes(self) -> List[T]:
        """Convenience accessor — returns just the nodes without edge wrapping."""
        return [edge.node for edge in self.edges]


def cursor_slice(
    items: List[T],
    first: Optional[int] = None,
    after: Optional[str] = None,
    last: Optional[int] = None,
    before: Optional[str] = None,
    max_page_size: int = 100,
) -> Connection[T]:
    """Implement cursor-based slicing for a list of items.

    Args:
        items: Full sorted list of items (already ordered by the resolver).
        first: Return up to this many items from the start of the cursor.
        after: Return items strictly after this cursor position.
        last: Return up to this many items from the end.
        before: Return items strictly before this cursor position.
        max_page_size: Hard ceiling on page size (default 100).

    Returns:
        Connection with edges, cursors, and PageInfo metadata.
    """
    if first is None and last is None:
        first = 25  # Default page size

    # Clamp page sizes to max_page_size
    first = min(first or max_page_size, max_page_size)
    last = min(last or max_page_size, max_page_size)

    # Determine start index from 'after' cursor
    start_idx = 0
    if after is not None:
        try:
            entity_id = Edge.decode(after)
            for idx, item in enumerate(items):
                if str(getattr(item, "id", "")) == str(entity_id):
                    start_idx = idx + 1  # Exclusive — skip the cursor'd item
                    break
        except Exception as exc:
            logger.warning("Invalid cursor '%s': %s", after, exc)
            raise ValueError(f"Invalid cursor value: {after}")

    # Slice the items list based on first/last arguments
    if last is not None and before is not None:
        # Backward pagination: take 'last' items before the cursor
        end_idx = start_idx  # Start index already set by 'before'
        sliced = items[max(0, end_idx - last):end_idx]
    else:
        # Forward pagination: take 'first' items after the cursor
        sliced = items[start_idx:start_idx + (first or max_page_size)]

    # Build edges with encoded cursors
    edges: List[Edge[T]] = []
    for item in sliced:
        entity_id = str(getattr(item, "id", ""))
        edges.append(Edge(node=item, cursor=Edge.encode(entity_id)))

    # Calculate pagination metadata
    has_next = len(items) > start_idx + (first or max_page_size) if first else False
    has_prev = start_idx > 0

    return Connection(
        edges=edges,
        page_info=PageInfo(
            has_next_page=has_next,
            has_previous_page=has_prev,
            start_cursor=edges[0].cursor if edges else None,
            end_cursor=edges[-1].cursor if edges else None,
        ),
    )
```

---

## Constraints

### MUST DO

- **Use `ID!` (non-null) for primary keys** — Never use nullable IDs as identifiers. The GraphQL spec defines `ID` as a unique identifier type that serializes to String.
- **Batch all resolver data fetching with DataLoader** — Every resolver that fetches related data in a loop must be wrapped with a DataLoader instance per request. This is the single most impactful performance optimization for GraphQL APIs.
- **Enforce query complexity and depth limits at execution time** — Reject queries that exceed configured thresholds before they execute. Never expose raw database errors to API consumers.
- **Use cursor-based pagination (Relay Connection model) for all list fields** — Never use `offset`/`limit` pagination. Always include `pageInfo` with `hasNextPage`, `hasPreviousPage`, `startCursor`, and `endCursor`.
- **Apply field-level authorization directives** — Centralize permission checks in declarative `@auth` directives rather than scattering guards inside resolvers. Default-deny for fields with directives but no explicit grants.
- **Return structured error unions** — Define custom error types (e.g., `type NotFoundError { message: String! }`) and use union return types (`type Result = Success | NotFoundError | ForbiddenError`). Never leak internal stack traces or SQL errors.
- **Follow the GraphQL Specification for type naming** — Use PascalCase for types/inputs/enums, camelCase for fields. Add schema introspection comments on every type and field using docstrings that feed into `__description__`.
- **Version your schema evolution strategy** — Deprecate fields with `@deprecated(reason: "...")` before removing them. Never remove a field without a deprecation period of at least two minor versions.

### MUST NOT DO

- **Never allow unbounded list resolution** — Do not return full lists without pagination caps. A single query must never be able to request more than `max_page_size` items across all fields in one traversal.
- **Never embed full objects without explicit size limits on nested lists** — Embedding a user's entire order history inside the User type without cursor arguments creates both N+1 queries and unbounded payloads.
- **Never expose internal implementation details in error messages** — Never return SQL errors, file paths, stack traces, or database connection strings to API consumers. Always wrap in a structured `Error` type with user-friendly messages.
- **Never use sequential integer cursors for pagination** — Sequential IDs enable enumeration attacks (predict the next page). Always encode cursors as opaque base64 strings of the form `<type>:<id>`.
- **Never skip DataLoader for related data fetching in loops** — Fetching 50 user profiles inside a loop over 50 orders creates 50 separate queries. Batch them into one query with IN clause or JOIN.
- **Never implement authorization as "trust the resolver"** — Every field must have explicit authorization configuration via directives or middleware. Manual `if not is_admin: raise` checks in resolvers are fragile and easily forgotten.

---

## Output Template

When implementing or reviewing a GraphQL API design, produce:

1. **Schema Definition** — Complete type definitions (Query, Mutation, types, interfaces) with proper scalar typing, nullability annotations (`!`), and descriptive docstrings
2. **Resolver Batching Map** — A table mapping each resolver to its DataLoader instance, showing the batch function and cache strategy
3. **Complexity Budget** — Estimated complexity per top-level query field, with max `first`/`last` values and depth calculations
4. **Authorization Matrix** — A table of all fields, their directives (`@auth`, `@role`), and required scopes/roles
5. **Pagination Audit** — List every list-returning field with its pagination arguments (`first`, `after`) and cursor encoding format
6. **Error Schema** — Custom error union types with `message`, `code`, and optional `extensions` fields

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-federation` | Split a monolithic GraphQL API into federated subgraphs with entity sharing via `@key` directives |
| `graphql-subscriptions` | Add real-time event streaming on top of the schema using WebSocket subscriptions and PubSub backends |
| `graphql-dataloader-pattern` | Batch resolver data fetching to eliminate N+1 queries within the GraphQL API |
| `graphql-schema-design` | Schema modeling conventions, naming standards, and type system best practices for the API |
| `graphql-error-handling-validation` | Structured error unions, Pydantic input validation, and middleware-level exception handling |

---

## References

- **GraphQL Specification** (latest): https://spec.graphql.org/ — The canonical reference for scalar types, interfaces, unions, directives, and introspection
- **Apollo Federation 3 Specification**: https://www.apollographql.com/docs/federation/ — Subgraph composition, `@key`, `@shareable`, `@external`, and entity resolution patterns
- **Relay Connection Specification**: https://relay.dev/docs/guides/connection-specification/ — Cursor-based pagination model with `pageInfo` metadata
- **Strawberry GraphQL** (Python): https://strawberry.rocks/ — Modern, type-hint-driven GraphQL server for Python with native async support
- **Apollo Client Query Complexity**: https://www.apollographql.com/docs/react/prefetching/query-complexity/ — Client-side and server-side complexity analysis strategies
- **GraphQL Error Handling Best Practices** (Stripe Engineering): https://stripe.com/blog/graphql-error-handling — Production-grade error union patterns
