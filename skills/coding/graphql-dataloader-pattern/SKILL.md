---
name: graphql-dataloader-pattern
description: Implements the DataLoader batching and caching pattern to solve GraphQL
  N+1 query problems with per-request loader instances, batch functions, and memoization
  for efficient data access.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: dataloader, graphql n-plus-one, batch loading, aiodataloader, graphql
    performance, load per request, graphql batching
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
  related-skills: graphql-schema-design, graphql-error-handling-validation, graphql-federation, graphql-subscriptions
------
# DataLoader Batching Pattern

Implements the DataLoader pattern to solve GraphQL N+1 query problems by batching and caching data fetches per request. Creates request-scoped loader instances with typed batch functions, memoization across resolver calls, and explicit cache invalidation via `.prime()` and `.clear()` after mutations.

## TL;DR Checklist

- [ ] Every DataLoader is instantiated fresh at the start of each HTTP request — never shared as a global singleton
- [ ] Batch functions accept a list of keys and return results in the exact same order (index-aligned list)
- [ ] Missing keys resolve to `None` (cached) to prevent repeated cache misses from causing repeated failures
- [ ] Use `.prime(key, value)` after mutations to update the loader cache within the same request lifecycle
- [ ] Use `.clear(key)` after mutations to evict stale cached values when mutation effects may affect downstream queries
- [ ] Wrap batch function execution in try/catch and return `None` for individual missing keys without crashing the entire batch
- [ ] Profile with `EXPLAIN ANALYZE` to verify batched queries reduce database round-trips, not just client-side latency

---

## When to Use

Use this skill when:

- A resolver returns a list of parent entities and child resolvers each fetch related data independently (the classic N+1 pattern)
- You observe query execution logs showing hundreds of nearly-identical SQL queries within a single GraphQL request
- Multiple resolvers within the same request need to fetch the same entity by ID (e.g., both `Order.user` and `Order.billingAddress` need the same user object)
- You are building a subscription or mutation that modifies data followed by a query in the same request cycle, requiring cache consistency
- Database round-trip count is a measurable bottleneck — DataLoader has overhead and should not be used for trivial single-row lookups

---

## When NOT to Use

Avoid this skill for:

- Simple queries that only need one database row per field — the batching overhead outweighs benefits for O(1) lookups
- Reading data that changes between resolvers within the same request (stale cache risk without careful `.clear()` usage)
- Cross-service or cross-process data fetching where each source has its own batching semantics — adapt DataLoader locally at each service boundary
- Real-time subscription streams that push updates asynchronously — DataLoader is request-scoped and does not survive beyond a single execution context

---

## Core Workflow

### 1. Identify N+1 Queries by Analyzing Resolver Call Trees

Start with the query from the client side. Walk through each field and its resolvers to find patterns where one resolver returns N items and each item's child field triggers an independent database query. The telltale sign in execution logs: one `SELECT` for parents, then N nearly-identical `SELECT`s for children.

**Checkpoint:** For every resolver that returns a list type (e.g., `List[Order]`), check if any nested field on that type fetches related data. If so, that nesting is an N+1 candidate requiring a DataLoader.

### 2. Design Batch Functions That Accept Keys List and Return Values in Same Order

A batch function receives a list of keys (e.g., `[user_id_1, user_id_2, ..., user_id_N]`) and must return a list of values with the same length, where `results[i]` corresponds to `keys[i]`. The results list must be index-aligned with the input keys. Missing keys resolve to `None`, not skipped entries.

**Checkpoint:** Write the batch function as a pure async function: `async def batch_fn(keys: Sequence[str]) -> Sequence[Optional[T]]:` — no side effects, deterministic ordering, and handles empty input lists gracefully.

### 3. Implement Per-Request DataLoader Instance — NEVER Shared Across Requests

Each incoming HTTP request gets its own DataLoader instance with a fresh cache. If you share a single DataLoader across requests, cached values from one request will leak into another, returning stale or incorrect data. In Strawberry, this is typically done via a context factory that creates loaders during request initialization.

**Checkpoint:** Verify in your test suite that two concurrent requests with different user IDs return different results even if they query the same entity — proving cache isolation between requests.

### 4. Handle Missing Keys with None (Cached to Prevent Repeated Failures)

When a batch function cannot find an entity for a given key, the result at that index must be `None`, not omitted, not an exception. DataLoader caches this `None` result so subsequent loads of the same key do not re-query the database. This is essential for graceful handling of foreign keys where referenced entities may have been deleted.

**Checkpoint:** Add a test case where a parent entity references a child that no longer exists in the database. Verify the resolver returns `None` without raising and without logging error-level noise.

### 5. Use `.prime()` After Mutations to Update Cache Within Same Request

When a mutation creates or updates an entity, subsequent queries in the same request may need the freshly-mutated data. Call `loader.prime(key, new_value)` after the mutation completes so that resolvers reading this key get the updated value from cache rather than stale cached data or a fresh database query.

**Checkpoint:** After every CREATE or UPDATE mutation, identify which entities are affected and prime the relevant DataLoaders with their new values before returning to the client.

### 6. Use `.clear(key)` After Mutations to Evict Stale Cached Values

When a mutation deletes an entity or modifies data in a way that may invalidate cached results for other keys, call `loader.clear(key)` to evict that specific key from cache (or `loader.clear()` to evict the entire cache). This is safer than `.prime()` when you cannot predict what new values downstream queries will need.

**Checkpoint:** For DELETE mutations, always clear the relevant loader cache entry. For UPDATE mutations that change indexed fields (e.g., changing a user's status), prefer `.clear()` over `.prime()` to avoid returning stale data from partially-updated cache states.

---

## Implementation Patterns

### Pattern 1: Batch Function That Maintains Key Ordering

The batch function must return results in the exact same order as the input keys. Using dictionaries or sets without ordering guarantees is the most common bug in DataLoader implementations. Always map results back to key indices explicitly.

```python
# ✅ GOOD — Batch function returns list aligned with input key order
import asyncio
from typing import Any, Dict, List, Optional, Sequence, Tuple

import asyncpg


async def batch_load_users_by_ids(
    user_ids: Sequence[str],
) -> List[Optional[dict]]:
    """Batch load users by their IDs. Returns results aligned to input key order.

    For each key in user_ids, the corresponding result at the same index is:
    - A dict of user columns if found
    - None if no user exists with that ID

    This function executes exactly ONE database query regardless of the
    number of keys provided (up to the pool's connection limit).
    """
    if not user_ids:
        return []

    # Single parameterized query for all requested IDs using PostgreSQL ANY()
    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, email, display_name, status, created_at
            FROM users
            WHERE id = ANY($1)
            """,
            list(user_ids),  # Pass as Python array for PostgreSQL ANY() operator
        )

    # Build a lookup map: id -> row dict for O(1) retrieval
    row_map: Dict[str, dict] = {str(row["id"]): dict(row) for row in rows}

    # Return results in the EXACT same order as input keys.
    # Missing IDs get None (cached by DataLoader to prevent repeated misses).
    results: List[Optional[dict]] = []
    for user_id in user_ids:
        results.append(row_map.get(user_id, None))  # None for missing keys

    return results


# ❌ BAD — Returning a dict or using set loses ordering guarantee
async def bad_batch_load_users_by_ids(
    user_ids: Sequence[str],
) -> Dict[str, Optional[dict]]:
    """Returns a dictionary keyed by ID — wrong return type for DataLoader.

    DataLoader expects a list where index i corresponds to key i in the input.
    A dict has no inherent ordering and DataLoader will not know how to match
    results back to their original keys.
    """
    if not user_ids:
        return {}

    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, email, display_name FROM users WHERE id = ANY($1)",
            list(user_ids),
        )

    # Wrong! DataLoader will crash or return wrong values because it expects
    # a list in key order, not a dict.
    return {str(row["id"]): dict(row) for row in rows}


# ❌ BAD — Skipping missing keys breaks index alignment
async def bad_batch_load_users_with_skips(
    user_ids: Sequence[str],
) -> List[Optional[dict]]:
    """Only returns results for found users, skipping missing ones.

    If input is ['1', '2', '3'] and only '1' and '3' exist, this returns
    [row_for_1, row_for_3] — only 2 items for 3 keys. DataLoader will crash
    with an index out-of-range error or return row_for_3 as the result for key '2'.
    """
    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, email FROM users WHERE id = ANY($1)",
            list(user_ids),
        )

    # BUG: Only includes found users, breaking index alignment
    return [dict(row) for row in rows]  # Missing keys silently dropped


# ✅ GOOD — Batch function with error isolation per key
async def batch_load_users_with_isolated_errors(
    user_ids: Sequence[str],
) -> List[Optional[dict]]:
    """Batch load users with per-key error handling.

    If one key causes an exception, only that key's result is None.
    Other keys still resolve successfully from the same batch query.
    This prevents a single bad key from crashing the entire batch.
    """
    if not user_ids:
        return []

    results: List[Optional[dict]] = [None] * len(user_ids)  # Pre-allocate with None

    try:
        async with asyncpg.get_pool().acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, email, display_name FROM users WHERE id = ANY($1)",
                list(user_ids),
            )

        row_map: Dict[str, dict] = {str(row["id"]): dict(row) for row in rows}
        for idx, user_id in enumerate(user_ids):
            results[idx] = row_map.get(user_id, None)

    except Exception as exc:
        # If the entire batch fails, log and let all keys resolve to None.
        # DataLoader will cache these Nones, preventing repeated queries.
        import logging
        logging.error("Batch user load failed for %d keys: %s", len(user_ids), exc)
        # results already initialized with None — no change needed

    return results
```

### Pattern 2: Per-Request Instantiation via Context Factory

In Strawberry, DataLoader instances must be created fresh per request. The standard pattern is to build a context object during middleware setup that contains all loaders for the request. Resolvers access loaders through `info.context`.

```python
# ✅ GOOD — Request-scoped DataLoader factory in Strawberry
import strawberry
from typing import Dict, Optional


class RequestContext:
    """Per-request container holding all DataLoader instances.

    This object is created once at the start of each GraphQL execution
    and lives for the entire request lifetime. Each request gets a fresh
    instance with empty caches — no data leaks between requests.
    """

    def __init__(self) -> None:
        # Initialize loaders lazily or eagerly — eager is simpler for correctness
        self.user_loader: DataLoader = DataLoader(
            load_fn=batch_load_users_by_ids,
            max_batch_size=100,
            cache=True,
            name="UserById",
        )
        self.order_loader: DataLoader = DataLoader(
            load_fn=batch_load_orders_by_user_ids,
            max_batch_size=50,
            cache=True,
            name="OrdersByUserId",
        )
        self.product_loader: DataLoader = DataLoader(
            load_fn=batch_load_products_by_ids,
            max_batch_size=200,
            cache=True,
            name="ProductById",
        )


@strawberry.type
class Query:
    @strawberry.field(description="Get user by global ID")
    async def user(self, info, id: strawberry.ID) -> Optional["User"]:
        # Access the per-request loader through context — never a global singleton
        ctx: RequestContext = info.context
        user_data = await ctx.user_loader.load(str(id))

        if user_data is None:
            return None  # Not found — graceful, not an exception

        return User(
            id=strawberry.ID(user_data["id"]),
            email=user_data["email"],
            display_name=user_data["display_name"],
            created_at=user_data["created_at"],
        )


# ❌ BAD — Global singleton DataLoader shared across all requests
_global_user_loader: Optional[DataLoader] = None


def get_user_loader() -> DataLoader:
    """Global singleton — cache data from request #1 leaks into request #2."""
    global _global_user_loader
    if _global_user_loader is None:
        _global_user_loader = DataLoader(
            load_fn=batch_load_users_by_ids,
            cache=True,  # ⚠️ Cached user from a previous request may still be in here!
        )
    return _global_user_loader


@strawberry.type
class BadQuery:
    @strawberry.field(description="Get user by ID — uses global loader")
    async def user(self, info, id: strawberry.ID) -> Optional["User"]:
        # This loader is shared across requests. User '1' from request A
        # might still be cached when request B tries to load it.
        loader = get_user_loader()
        return await loader.load(str(id))


# ✅ GOOD — Strawberry middleware that creates per-request context
def create_context_factory():
    """Factory that Strawberry calls for each incoming request."""

    async def context_factory(root, info, **args):
        # Fresh RequestContext with fresh DataLoaders for every request
        return RequestContext()

    return context_factory


# Wire up in your app initialization:
# schema = strawberry.Schema(
#     query=Query,
#     extensions=[
#         GraphQLPersistenceErrorExtension(),  # Your error handling extension
#     ],
# )
#
# app.add_middleware(..., context_value=create_context_factory())
```

### Pattern 3: Using `.prime()` for Mutation Cache Updates

After a mutation creates or modifies an entity, downstream queries in the same request may read from cache. Without `.prime()`, they get stale data (or hit the database). Prime the loader with the new value so subsequent reads within the same request are consistent.

```python
# ✅ GOOD — Prime cache after CREATE mutation
import strawberry


@strawberry.type
class Mutation:
    @strawberry.mutation(description="Create a new user")
    async def create_user(
        self,
        info,
        input: "CreateUserInput",
    ) -> "User":
        # Execute the database INSERT
        new_user = await database.insert_user(
            email=input.email,
            display_name=input.display_name,
        )

        # Prime the user loader so subsequent queries in this request
        # get the freshly-created user from cache instead of querying DB again.
        ctx: RequestContext = info.context
        ctx.user_loader.prime(
            str(new_user.id),
            {
                "id": new_user.id,
                "email": new_user.email,
                "display_name": new_user.display_name,
                "status": "active",
                "created_at": new_user.created_at,
            },
        )

        return User(
            id=strawberry.ID(new_user.id),
            email=new_user.email,
            display_name=new_user.display_name,
            created_at=new_user.created_at,
        )


# ✅ GOOD — Prime multiple loaders after mutation that affects related data
@strawberry.type
class Mutation:
    @strawberry.mutation(description="Create an order with items")
    async def create_order(
        self,
        info,
        input: "CreateOrderInput",
    ) -> "Order":
        # Create the order and its line items atomically
        order = await database.insert_order(
            user_id=input.user_id,
            items=input.items,
            shipping_address=input.shipping_address,
        )

        # Prime the order loader — subsequent queries for this order in same request
        ctx: RequestContext = info.context
        ctx.order_loader.prime(
            str(order.id),
            {
                "id": order.id,
                "user_id": order.user_id,
                "total_cents": order.total_cents,
                "status": "pending",
                "items": input.items,
            },
        )

        # Prime the user loader — the user's cached profile doesn't change, but
        # we prime it to avoid a redundant DB query if resolvers access user data.
        ctx.user_loader.prime(
            str(order.user_id),
            None,  # We don't have the full user object; clear instead (see Pattern 4)
        )

        return order


# ❌ BAD — No cache update after mutation, downstream queries get stale data
@strawberry.type
class BadMutation:
    @strawberry.mutation(description="Create a new user")
    async def create_user(
        self,
        info,
        input: "CreateUserInput",
    ) -> "User":
        # Insert into database...
        new_user = await database.insert_user(
            email=input.email, display_name=input.display_name,
        )

        # Returns to client with no cache update. If the response includes nested
        # fields that trigger resolvers reading from the user loader, those resolvers
        # will either hit the DB again or return stale cached data.
        return User(
            id=strawberry.ID(new_user.id),
            email=new_user.email,
            display_name=new_user.display_name,
            created_at=new_user.created_at,
        )
```

### Pattern 4: Error Handling in Batch Functions — Missing Keys vs Failures

Batch functions must distinguish between "key not found" (return `None`) and "batch query failed" (catch exception, log it, return `None` for all keys). Crashing the batch on a single missing key defeats the entire purpose of DataLoader.

```python
# ✅ GOOD — Batch function with proper error handling for both missing keys
# and database failures
import logging
from typing import Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)


async def batch_load_orders_with_proper_errors(
    order_ids: Sequence[str],
) -> List[Optional[dict]]:
    """Batch load orders handling missing keys and DB errors gracefully.

    Strategy:
    - Missing key → None at that index (cached by DataLoader)
    - Database error → None for ALL keys in the batch (logged, not raised)
    - Partial results → Found keys get their data, missing keys get None
    """
    if not order_ids:
        return []

    # Pre-allocate result list with None — this is what gets returned whether
    # we succeed or fail. DataLoader will cache each None individually.
    results: List[Optional[dict]] = [None] * len(order_ids)

    try:
        async with asyncpg.get_pool().acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT o.id, o.user_id, o.status, o.total_cents, o.created_at
                FROM orders o
                WHERE o.id = ANY($1)
                """,
                list(order_ids),
            )

        # Build lookup map from returned rows
        row_map: Dict[str, dict] = {}
        for row in rows:
            row_map[str(row["id"])] = {
                "id": str(row["id"]),
                "user_id": str(row["user_id"]),
                "status": row["status"],
                "total_cents": int(row["total_cents"]),
                "created_at": row["created_at"],
            }

        # Fill results maintaining key order — None for missing IDs
        for idx, order_id in enumerate(order_ids):
            results[idx] = row_map.get(order_id, None)

    except asyncpg.PostgresError as db_exc:
        # Database error — cannot retrieve ANY results. Log the error and
        # let all keys resolve to None (cached). This prevents thundering herd
        # where every resolver retries the same failed query repeatedly.
        logger.error(
            "Database batch error loading %d order IDs: %s",
            len(order_ids),
            db_exc,
            exc_info=True,  # Include stack trace in server logs only
        )
        # results already [None, None, ..., None] — no change needed

    except Exception as non_db_exc:
        # Unexpected error — same strategy: fail safely with Nones
        logger.critical(
            "Unexpected error in order batch loader for %d IDs: %s",
            len(order_ids),
            non_db_exc,
            exc_info=True,
        )

    return results


# ❌ BAD — Raising an exception on a single missing key crashes the whole batch
async def bad_batch_load_orders_with_crash(
    order_ids: Sequence[str],
) -> List[dict]:
    """Crashes if any requested order is not found.

    This violates the fundamental DataLoader contract: missing keys must
    resolve to None, not raise. Raising an exception during batch execution
    causes ALL pending loads for this batch to fail — even keys that exist.
    """
    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, user_id FROM orders WHERE id = ANY($1)",
            list(order_ids),
        )

    row_map: Dict[str, dict] = {str(row["id"]): dict(row) for row in rows}

    # CRASH: KeyError raised for any missing order ID. This kills the entire
    # batch and all resolvers waiting on it, even for orders that exist.
    return [row_map[oid] for oid in order_ids]  # KeyError if any oid is missing


# ❌ BAD — Returning dict without index alignment
async def bad_batch_load_orders_as_dict(
    order_ids: Sequence[str],
) -> Dict[str, dict]:
    """Returns a dictionary instead of an ordered list.

    DataLoader.load() expects batch_fn to return a list where results[i]
    corresponds to keys[i]. A dictionary has no positional guarantee and
    will cause mismatched or incorrect results.
    """
    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, user_id FROM orders WHERE id = ANY($1)",
            list(order_ids),
        )
    return {str(row["id"]): dict(row) for row in rows}  # Wrong return type


# ✅ GOOD — Complete DataLoader pattern with batch function + per-request
# instantiation + cache invalidation after mutations
@strawberry.type
class Mutation:
    @strawberry.mutation(description="Update order status")
    async def update_order_status(
        self,
        info,
        order_id: strawberry.ID,
        new_status: "OrderStatus",
    ) -> "Order":
        # Mutate the database
        updated = await database.update_order_status(str(order_id), new_status)

        ctx: RequestContext = info.context

        # Clear this specific key from cache — the order data has changed,
        # and we don't want stale data returned by downstream resolvers.
        ctx.order_loader.clear(str(order_id))

        # Prime with the updated value if we know it
        ctx.order_loader.prime(
            str(order_id),
            {
                "id": str(order_id),
                "user_id": updated.user_id,
                "status": new_status.value,
                "total_cents": updated.total_cents,
                "created_at": updated.created_at,
            },
        )

        return Order(
            id=strawberry.ID(order_id),
            status=new_status,
            total_cents=updated.total_cents,
        )
```

### Pattern 5: Composite Key Batch Loading for Multi-Column Joins

Some queries require composite keys (e.g., fetching items by `(order_id, product_id)` pairs). DataLoader supports this through tuple keys and appropriate batch functions.

```python
from typing import Dict, List, Optional, Sequence, Tuple


async def batch_load_order_items_by_keys(
    keys: Sequence[Tuple[str, str]],  # (order_id, product_id) pairs
) -> List[List[dict]]:
    """Batch load order items for multiple (order_id, product_id) key pairs.

    Returns a list of lists: results[i] contains all items matching
    keys[i]. Empty list means no items found — not None, because the
    caller expects a list type, not an optional value.
    """
    if not keys:
        return []

    # Build composite key lookup: (order_id, product_id) -> list of items
    async with asyncpg.get_pool().acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT oi.order_id, oi.product_id, oi.quantity, p.name as product_name, p.price_cents
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE (oi.order_id, oi.product_id) = ANY($1::text[])
            """,
            [list(k) for k in keys],  # PostgreSQL array of arrays
        )

    # Group by composite key preserving input order
    item_map: Dict[Tuple[str, str], List[dict]] = {key: [] for key in keys}
    for row in rows:
        key = (str(row["order_id"]), str(row["product_id"]))
        if key in item_map:
            item_map[key].append({
                "product_name": row["product_name"],
                "quantity": int(row["quantity"]),
                "price_cents": int(row["price_cents"]),
            })

    # Return results aligned to input key order
    return [item_map.get(key, []) for key in keys]


# Usage in resolver:
@strawberry.type
class OrderItemKeyLoader(DataLoader):
    """DataLoader specialized for composite (order_id, product_id) keys."""

    async def load(self, order_id: str, product_id: str) -> List[dict]:
        return await super().load((order_id, product_id))
```

---

## Constraints

### MUST DO

1. **Always create a fresh DataLoader instance per request** — Use middleware or context factories to instantiate loaders at request start and discard them at request end. Never use global singletons, class-level caches, or module-level loader variables. This is the single most important rule of DataLoader.

2. **Batch functions must return results in exact index alignment with input keys** — `results[i]` must correspond to `keys[i]`. Missing keys resolve to `None`, not skipped entries, not exceptions. Use a pre-allocated list or explicit index mapping to guarantee ordering.

3. **Handle individual missing keys with `None`, never raise for them** — If the database has no row for a given key, return `None` at that index. DataLoader caches this `None` to prevent repeated lookups. Raising an exception for a single missing key crashes the entire batch for all keys.

4. **Prime or clear cache after mutations affecting cached data** — After CREATE: call `.prime(key, value)` so downstream reads get fresh data. After DELETE: call `.clear(key)` to evict stale entries. After UPDATE: either `.clear()` then let resolvers re-fetch, or `.prime()` with the new value if you have it.

5. **Profile batch queries with EXPLAIN ANALYZE** — Verify that your batch function actually reduces database round-trips. A well-written batch function for 100 keys should execute exactly ONE SQL query (using `IN (...)` or `ANY($1)`), not N queries hidden behind a loop.

### MUST NOT DO

1. **Never share DataLoader instances across HTTP requests** — Cached data from request #1 will leak into request #2, returning stale or unauthorized data. This is the most critical rule and the most commonly violated one.

2. **Never return dictionaries, sets, or any unordered structure from batch functions** — DataLoader expects a list where positional index maps to input key position. A dict has no guaranteed ordering and will cause silent data corruption.

3. **Never skip `.clear()` or `.prime()` after mutations that affect downstream queries** — Without cache management, mutations silently corrupt cached data for subsequent resolvers in the same request. This causes inconsistent response data that is extremely difficult to debug.

4. **Never use DataLoader for single-row lookups with no batching benefit** — If a field only ever fetches one row per resolver call (e.g., `User.country` maps to a simple foreign key lookup), the overhead of batching exceeds any benefit. Use direct database calls instead.

5. **Never swallow batch function exceptions silently** — If the entire batch query fails, log at ERROR level with full stack trace (server logs only) and resolve all keys to `None`. Do not crash the GraphQL response or expose internal errors to clients.

---

## Output Template

When implementing or reviewing a DataLoader pattern, produce:

1. **N+1 Analysis Report** — For each resolver returning lists, identify nested fields that cause N+1 queries with estimated query counts (e.g., "Order.items → 3 resolvers × 50 orders = 150 queries reduced to 3")
2. **Batch Function Implementations** — Complete async functions accepting `Sequence[K]` and returning `Sequence[Optional[T]]` with index-aligned results, error handling, and database batch queries
3. **DataLoader Instance Registry** — Table of every loader: name, key type, batch function, max batch size, cache strategy, and which resolvers use it
4. **Cache Invalidation Plan** — Map each mutation to the DataLoaders that need `.clear()` or `.prime()` calls after execution
5. **Per-Request Context Factory** — Complete context class with loader initialization and middleware wiring for Strawberry

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-schema-design` | Design the schema structure that determines which fields will have N+1 patterns |
| `graphql-error-handling-validation` | Handle validation errors and exceptions that occur during batch data fetching |
| `graphql-federation` | DataLoader is essential inside every federated subgraph to prevent N+1 queries across service boundaries |
| `graphql-subscriptions` | Batch-associate data with subscription events (e.g., loading user profiles alongside chat messages) |

---

## References

- **DataLoader (Facebook/GraphQL)**: https://github.com/graphql/dataloader — The canonical JavaScript implementation and specification for the batching pattern, including all semantics around caching, `.prime()`, `.clear()`, and error handling
- **Strawberry DataLoader Integration**: https://strawberry.rocks/docs/guides/context#custom-context — Strawberry-specific patterns for request-scoped context and DataLoader wiring
- **N+1 Query Anti-Pattern (AWS)**: https://aws.amazon.com/blogs/database/solving-the-n1-query-problem-in-graphql/ — Detailed analysis of N+1 in GraphQL with SQL-level profiling strategies using `EXPLAIN ANALYZE`
- **Relay Connection Specification**: https://relay.dev/docs/guides/connection-specification/ — Cursor pagination model that complements DataLoader when batching paginated list fields
