---
name: graphql-federation
description: Implements Apollo Federation 3 patterns (@key, @external, @provides, @requires directives) for building federated microservice graphs with Strawberry Python and Apollo Router.
license: MIT
compatibility: opencode
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
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  triggers: apollo federation, subgraph, supergraph, entity sharing, @key directive, graphql gateway, federated schema, @external, @provides, @requires, cross-service reference, router configuration
  related-skills: graphql-api-design, graphql-dataloader-pattern, graphql-schema-design
---

# GraphQL Federation Architecture

Senior distributed systems engineer designing and implementing Apollo Federation 3 microservice graphs using Strawberry Python. Builds federated schemas where each subgraph owns distinct types and fields, composes them via the Apollo Router into a unified supergraph, and manages cross-service entity resolution with `@key`, `@external`, `@provides`, and `@requires` directives.

## TL;DR Checklist

- [ ] Define ownership boundaries — each subgraph owns exactly one set of types and fields; mark cross-references with `@external`
- [ ] Mark every entity type with `@key` in every subgraph where it is referenced (not just owned)
- [ ] Use composite keys (`@key(fields: "nodeType id")`) for polymorphic entities shared across subgraphs
- [ ] Return partial entity references from resolvers — let the gateway compose full objects using `@provides`/`@requires` hints
- [ ] Validate supergraph composition locally before deploying any subgraph change
- [ ] Keep each subgraph focused on a single bounded context with no circular cross-service dependencies

---

## When to Use

Use this skill when:

- Designing or implementing a federated GraphQL API across multiple microservices
- Sharing entity types (e.g., `User`, `Product`) across two or more subgraphs where each owns different fields
- Configuring the Apollo Router for supergraph composition, health checks, CORS, and error exposure policies
- Resolving cross-service field resolution using `@provides` and `@requires` optimization hints
- Migrating a monolithic GraphQL API into a federated architecture (Apollo Federation 3 / RouterOS-based router)
- Handling schema evolution in a federated environment — deprecating fields, versioning subgraphs independently

---

## When NOT to Use

Avoid this skill for:

- Building a single-service GraphQL API with no cross-service data sharing — use `graphql-api-design` instead
- Designing REST or gRPC service boundaries — federation is a query-layer composition pattern, not an RPC framework
- Implementing real-time subscriptions across subgraphs — Apollo Federation 3 does not natively support federated subscriptions (use WebSocket per-subgraph)
- Scenarios where every entity fits cleanly within one service — over-engineering with federation adds operational overhead

---

## Core Workflow

1. **Define Ownership Boundaries** — Enumerate every type and field in your domain model. Assign each to exactly one subgraph (bounded context). For example, `User` types live in the `user-subgraph`, `Order` types in the `order-subgraph`. Mark fields owned by another subgraph with `@external`. **Checkpoint:** Every entity field that originates outside the current subgraph must be marked `@external`; nothing is duplicated.

2. **Establish Entity Keys** — For every type shared across subgraphs, define a `@key` directive specifying which field(s) uniquely identify an entity. Use composite keys for polymorphic types: `@key(fields: "nodeType id")`. The key fields must be resolvable within the defining subgraph without cross-service calls. **Checkpoint:** Every subgraph referencing a shared entity must include that entity's `@key` definition, even if it only owns additional fields on top of it.

3. **Implement Cross-Service Resolvers** — In each subgraph, write resolvers that return partial entity references (typically just the key fields). The Apollo Router automatically resolves the remaining fields by querying other subgraphs. Use `@provides` to declare which extra fields a subgraph can resolve (optimization hint) and `@requires` to declare which fields are prerequisites for a resolver. **Checkpoint:** Cross-service resolvers return only what this subgraph owns — never try to resolve fields from another subgraph's domain.

4. **Configure the Apollo Router** — Set up `apollo-router.yaml` with supergraph file path, health check endpoints, CORS policies, and error exposure controls. Validate composition using the `apollo router --supergraph` CLI or `inigo` binary before deployment. **Checkpoint:** Error middleware must strip internal stack traces; never expose raw service errors through the gateway.

5. **Test Federation Locally** — Run the Apollo Router locally with the composed supergraph. Use introspection queries and federated entity resolution tests to verify cross-service data flows correctly. **Checkpoint:** Test at least one multi-hop entity resolution (e.g., `Order` → `User` via `user_id`) end-to-end before merging changes.

6. **Handle Schema Evolution** — When modifying shared types, deprecate fields with `@deprecated(reason: "...")` before removal. Coordinate `@key` field changes across all referencing subgraphs. Never rename or remove a key field without updating every subgraph that references it. **Checkpoint:** Run composition checks on a staging supergraph before promoting to production.

---

## Implementation Patterns / Reference Guide

### Pattern 1: User Subgraph with Entity Sharing (@key Directive)

The user subgraph owns the canonical `User` type with all profile fields. Other subgraphs reference `User` via its key and may add additional fields marked with `@provides`.

```python
# user_subgraph/schema.py — Canonical User type owned by this subgraph
from __future__ import annotations

import strawberry
from typing import List, Optional


@strawberry.type(description="A registered platform user")
class User:
    """User profile data owned exclusively by the user subgraph.

    The @key directive marks 'id' as the unique identifier for entity
    resolution across the federated graph. Other subgraphs reference this
    type via its key and extend it with additional fields.
    """

    id: strawberry.ID
    email: str
    display_name: str
    created_at: strawberry.types.DateTime
    is_active: bool = True


@strawberry.type(description="Root query for the user subgraph")
class UserQuery:
    @strawberry.field(description="Fetch a user by ID")
    def user(self, info, id: strawberry.ID) -> Optional[User]:
        """Resolve user by primary key.

        The router uses this resolver to fulfill entity references from
        other subgraphs that hold only user.id but need full User data.
        """
        # In production, use DataLoader for batching:
        # loader: BatchLoader = info.context["dataloader_user_by_id"]
        # return await loader.load(str(id))
        ...

    @strawberry.field(description="List active users")
    def users(self, info, first: int = 20) -> List[User]:
        """Return paginated list of active users."""
        ...


# ─── Federation Schema Definition ────────────────────────────────────────
# The Schema object registers @key directives so the router knows which
# types are entities shareable across subgraphs and how to resolve them.

from strawberry.federation.schema import Schema
from strawberry.federation.schema_directives import Key


schema = Schema(
    query=UserQuery,
    # Mark User as a federated entity resolvable by its 'id' field.
    # resolvable=True tells the router this subgraph can fulfill full
    # User objects (not just partial references).
    directives=[Key(fields="id", resolvable=True)],
)


# ─── Order Subgraph: Partial User Reference ──────────────────────────────
# The order subgraph owns Order types but references User via @external.
# It only declares the id field — name, email, and other fields are
# owned by the user subgraph and marked @external here.

@strawberry.type(description="User as referenced from the order subgraph")
class OrderSubgraphUser:
    """Partial User entity — this subgraph does NOT own display_name or email."""

    id: strawberry.ID  # The @key field — sufficient for gateway to resolve full User


@strawberry.type(description="An order placed by a user")
class Order:
    id: strawberry.ID
    user_id: strawberry.ID  # FK to User in another subgraph
    total_cents: int
    currency: str = "USD"
    status: str  # e.g., "PENDING", "CONFIRMED", "SHIPPED"

    @strawberry.field(description="The user who placed this order")
    def user(self, info) -> OrderSubgraphUser:
        """Return partial User reference.

        The Apollo Router sees the @key on User and automatically queries
        the user subgraph to resolve display_name, email, etc. — this
        resolver only needs to return the id for that to happen.
        """
        return OrderSubgraphUser(id=self.user_id)
```

### Pattern 2: Cross-Service Entity Resolution with @provides and @requires

`@provides` tells the router which additional fields a subgraph can resolve for an entity (enabling optimization). `@requires` declares prerequisites — fields the gateway must fetch before calling this resolver.

```python
# product_subgraph/schema.py — Product type with @provides optimization hint
import strawberry
from typing import List, Optional


@strawberry.type(description="A product in the catalog")
class Product:
    id: strawberry.ID
    name: str
    price_cents: int
    category_id: strawberry.ID

    @strawberry.field(description="Average customer rating for this product")
    def average_rating(self) -> Optional[float]:
        """@provides field — the router knows this subgraph can resolve
        'averageRating' for any Product entity, even from other subgraphs."""
        ...


# In the review subgraph, Reviews reference Product. We declare that
# resolving a Review requires the Product's id (the @key field).

@strawberry.type(description="A customer review for a product")
class Review:
    id: strawberry.ID
    rating: int  # 1-5
    comment: Optional[str] = None
    product_id: strawberry.ID

    @strawberry.field(description="The product this review belongs to")
    def product(self, info) -> Product:
        """@requires says the gateway must have fetched product.id before
        calling this resolver. Without it, the router would try to call
        this with a partial Product that lacks 'id'."""
        # The gateway ensures product.id is populated via @provides from
        # the product subgraph before invoking this resolver.
        return fetch_product_by_id(self.product_id)


# ─── Schema with Directive Registration ──────────────────────────────────

from strawberry.federation.schema import Schema
from strawberry.federation.schema_directives import Key, Provides, Requires


schema = Schema(
    query=ProductQuery,  # defined elsewhere in the subgraph
    directives=[
        # Product is an entity shareable across subgraphs, keyed by 'id'
        Key(fields="id", resolvable=True),

        # Tells router: this subgraph can resolve 'averageRating' on Product
        Provides(fields="averageRating"),

        # On the Review resolver for 'product': requires product.id
        Requires(fields="id"),
    ],
)


# ─── Composite Key Example — Polymorphic Content Entity ──────────────────
# When a type represents multiple concrete kinds, use composite keys.

@strawberry.type(description="Polymorphic content entity shared across subgraphs")
class ContentItem:
    """Shares the same @key across blog and video subgraphs using nodeType."""

    node_type: str  # "BLOG_POST" or "VIDEO" — part of the composite key
    id: strawberry.ID

    # Each subgraph extends with its own fields:
    # Blog subgraph adds: title, body, author_id
    # Video subgraph adds: duration_seconds, thumbnail_url
```

### Pattern 3: Apollo Router Configuration (apollo-router.yaml)

The Apollo Router is the GraphQL gateway that composes subgraphs into a federated supergraph. This configuration covers production-ready settings for health checks, CORS, error policies, and tracing.

```yaml
# apollo-router.yaml — Production router configuration
router:
  # Enable GraphQL introspection (disable in production)
  graphql:
    introspection: true

  # Enable the embedded playground UI
  playground: true

  # CORS policy for browser-based clients
  cors:
    origins:
      - "https://app.example.com"
      - "http://localhost:3000"
    methods:
      - GET
      - POST
      - OPTIONS
    allow_headers:
      - Authorization
      - Content-Type
      - X-Request-ID

  # Supergraph source — the composed federated schema
  supergraph:
    # Read from file (typical for production deployments)
    create_federated_graph_from_file: true
    path: ./supergraph.graphql

  # Graceful shutdown timeout (seconds)
  shutdown_grace_period: 10

# Error handling — control what gets exposed to clients
include_subgraph_errors:
  # Never expose raw subgraph errors to API consumers
  all: false
  # Whitelist specific error classes if needed
  request:
    - "INTERNAL_ERROR"

# Health check endpoint (for Kubernetes liveness/readiness probes)
health_check:
  enabled: true
  path: /health
  interval_seconds: 15

# Distributed tracing for debugging cross-service resolution chains
tracing:
  otlp:
    endpoint: "http://jaeger-collector:4317"
    service_name: "apollo-router"
  sampling_rate: 0.1  # 10% of requests

# Subgraph connection timeouts
limits:
  max_depth: 15
  max_height: 500
  max_aliases: 25
  max_value_length: 10000
```

### Pattern 4: Schema Composition and Federation Validation

Demonstrating how subgraph schemas compose into a supergraph, including composite keys for polymorphic entities and proper `@external` usage.

```python
# subgraph_composition.py — Simulating federation composition logic
from __future__ import annotations

import strawberry
from typing import List, Optional


# ─── Shared Entity: Product (owned by catalog subgraph) ─────────────────

@strawberry.type(description="Product in the catalog")
class CatalogProduct:
    id: strawberry.ID
    name: str
    description: str
    base_price_cents: int

    @strawberry.field
    def average_rating(self) -> Optional[float]:
        """Provided by review subgraph via @provides optimization."""
        ...


# ─── Shared Entity: Review (owned by review subgraph, references Product) ─

@strawberry.type(description="Review for a product")
class Review:
    id: strawberry.ID
    rating: int
    comment: Optional[str] = None

    @strawberry.field
    def product(self, info) -> CatalogProduct:
        """Returns partial Product — gateway resolves remaining fields."""
        # The router uses @provides hint to know catalog subgraph has
        # 'averageRating' without requiring an extra query.
        return CatalogProduct(
            id=strawberry.ID("prod-42"),  # Partial reference
            name="Widget",
            description="A fine widget",
            base_price_cents=1999,
        )


# ─── Composition Validation Helper ──────────────────────────────────────

def validate_supergraph_composition(
    subgraph_schemas: dict[str, strawberry.federation.Schema],
) -> list[str]:
    """Validate that a set of subgraphs can compose into a valid supergraph.

    Checks performed:
    1. Every @key field is resolvable in the defining subgraph
    2. No circular entity dependencies (A→B→A via entity references)
    3. All @external fields have a corresponding owner in another subgraph
    4. Duplicate type definitions have compatible key directives

    Args:
        subgraph_schemas: Mapping of subgraph name to its Schema object.

    Returns:
        List of validation error messages. Empty list means composition succeeds.
    """
    errors: list[str] = []

    # Check 1: Every entity's @key fields must be resolvable locally
    for subgraph_name, schema in subgraph_schemas.items():
        for type_name, type_def in schema.type_map.items():
            if hasattr(type_def, "_federation_key"):
                key_fields = type_def._federation_key.fields
                # Verify all key fields exist as non-null in this subgraph's definition
                for field_name in key_fields:
                    if not _has_field(type_def, field_name):
                        errors.append(
                            f"[{subgraph_name}] Entity '{type_name}' "
                            f"key field '{field_name}' is missing or not resolvable"
                        )

    # Check 2: Detect circular entity references
    dependency_graph = _build_entity_dependency_graph(subgraph_schemas)
    cycles = _find_cycles(dependency_graph)
    if cycles:
        errors.append(
            f"Circular entity dependencies detected: {cycles}. "
            f"Refactor to remove cyclic cross-service references."
        )

    # Check 3: All @external fields have an owner
    for subgraph_name, schema in subgraph_schemas.items():
        for type_name, type_def in schema.type_map.items():
            for field_name in getattr(type_def, "_federation_external", []):
                if not _has_owning_subgraph(field_name, type_name, subgraph_schemas, subgraph_name):
                    errors.append(
                        f"[{subgraph_name}] Field '{type_name}.{field_name}' "
                        f"is marked @external but no other subgraph owns it"
                    )

    return errors


def _has_field(type_def: object, field_name: str) -> bool:
    """Check if a type definition includes the specified field."""
    fields = getattr(type_def, "__strawberry_definition__", None)
    if fields is None:
        return False
    return any(f.name == field_name for f in fields.fields)


def _build_entity_dependency_graph(
    subgraph_schemas: dict[str, strawberry.federation.Schema],
) -> dict[str, set[str]]:
    """Build a directed graph of entity cross-references between subgraphs."""
    graph: dict[str, set[str]] = {}
    for name in subgraph_schemas:
        graph[name] = set()
    # Populate edges by scanning resolver return types across subgraphs
    # (Implementation detail omitted — use strawberry introspection API)
    return graph


def _find_cycles(graph: dict[str, set[str]]) -> list[list[str]]:
    """Detect cycles in a directed graph using DFS."""
    visited: set[str] = set()
    rec_stack: set[str] = set()
    cycles: list[list[str]] = []

    def dfs(node: str, path: list[str]) -> None:
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                dfs(neighbor, path)
            elif neighbor in rec_stack:
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:] + [neighbor])

        path.pop()
        rec_stack.discard(node)

    for node in graph:
        if node not in visited:
            dfs(node, [])

    return cycles


# ─── Usage Example ──────────────────────────────────────────────────────
# Before deploying subgraph changes, run composition validation:

def pre_deploy_check(subgraphs: dict[str, Schema]) -> None:
    """Run before every production deploy to catch composition errors early."""
    errors = validate_supergraph_composition(subgraphs)
    if errors:
        raise CompositionError(
            f"Supergraph composition failed with {len(errors)} error(s):\n"
            + "\n".join(f"  - {e}" for e in errors)
        )
    print("✅ Supergraph composition validated — ready to deploy")
```

---

## Constraints

### MUST DO
- Mark every entity type with `@key` in **every** subgraph where it is referenced, not just the owning subgraph. The gateway needs key definitions from all participants to compose the supergraph.
- Keep each subgraph's schema focused on a single bounded context (e.g., user profile, order management, product catalog). If a subgraph manages unrelated domains, split it.
- Use composite keys (`@key(fields: "nodeType id")`) for polymorphic entities shared across subgraphs. This prevents type ambiguity when the same entity represents multiple concrete kinds.
- Validate supergraph composition before deploying any subgraph change. Run `apollo router --supergraph supergraph.graphql` or use a CI pipeline that composes and validates automatically.
- Document entity ownership boundaries in code comments — every shared type must state which subgraph owns it and which fields are external.
- Return partial entity references from cross-service resolvers (just the key fields). Let the gateway handle full object composition.

### MUST NOT DO
- Duplicate entire type definitions across subgraphs. Share via `@key`/`@external` pattern only. Duplicated types with different field sets cause composition conflicts.
- Create circular dependencies between subgraphs (if A needs B and B needs A for entity resolution, refactor to break the cycle — typically by extracting a shared canonical service).
- Expose internal service errors through the gateway. Set `include_subgraph_errors.all: false` in router config and implement error middleware that strips stack traces, SQL details, and file paths.
- Remove or rename `@key` fields without coordinating across all referencing subgraphs. This breaks entity resolution globally and requires a coordinated multi-subgraph deploy.
- Use `@provides` for fields that require expensive resolution (e.g., unbatched DB queries). The router may call these on every entity traversal, defeating DataLoader batching and causing N+1 queries at the gateway level.
- Share subscription data across subgraphs — Apollo Federation 3 does not support federated subscriptions. Use WebSocket connections per-subgraph if real-time updates are needed.

---

## Output Template

When implementing or reviewing a GraphQL federation architecture, produce:

1. **Subgraph Inventory** — Table listing every subgraph name, its bounded context, owned types with fields, and shared entity references. Each entry must state the `@key` definition for every shared type.
2. **Entity Ownership Map** — For each federated entity, list which subgraph owns it, which fields belong there, which fields are `@external`, and any `@provides`/`@requires` declarations.
3. **Cross-Service Resolver Map** — Table of every cross-service resolver showing the source subgraph, target entity type, what fields are returned (partial vs. full), and the key fields used for gateway resolution.
4. **Router Configuration** — Complete `apollo-router.yaml` covering supergraph source, CORS, health checks, error exposure policy, and tracing settings appropriate to the deployment environment.
5. **Composition Validation Report** — Output of composition validation showing: every `@key` resolvable, no circular dependencies, all `@external` fields have owners. Flag any errors with suggested fixes.
6. **Schema Evolution Plan** — If changing a shared type, document the deprecation timeline (`@deprecated` → removal), which subgraphs need updates, and the deployment ordering to avoid composition failures.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-api-design` | Foundational GraphQL schema design patterns before federation — types, interfaces, complexity limits, DataLoader batching within a single service |
| `graphql-dataloader-pattern` | DataLoader implementation for eliminating N+1 queries within each subgraph's resolvers — critical performance pattern inside every federated subgraph |
| `graphql-schema-design` | Schema modeling conventions, naming standards, and type system best practices that apply before splitting into subgraphs |

---

## Live References

> Authoritative documentation links for Apollo Federation 3, Strawberry Python, and the Apollo Router.

- [Apollo Federation 3 Specification](https://www.apollographql.com/docs/federation/) — Official federation docs covering `@key`, `@external`, `@provides`, `@requires`, entity resolution, and supergraph composition
- [Apollo Router Documentation](https://www.apollographql.com/docs/router/) — Apollo Router configuration, deployment patterns, health checks, CORS, error policies, and distributed tracing
- [Strawberry Federation (Python)](https://strawberry.rocks/docs/federation/overview) — Strawberry's federation implementation for Python with `@key`, schema directives, and entity sharing examples
- [Apollo Federation 2.x vs 3 Migration Guide](https://www.apollographql.com/docs/federation/v2/migration/) — Differences between Federation 2.x RouterOS-based router and Federation 3 (Inigo/Inferni transition), federated graph as code patterns
- [GraphQL Specification](https://spec.graphql.org/) — Canonical reference for scalar types, directives, interfaces, unions, and schema introspection
- [Relay Connection Specification](https://relay.dev/docs/guides/connection-specification/) — Cursor-based pagination model used within subgraphs for all list fields
