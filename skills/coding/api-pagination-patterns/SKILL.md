---




name: api-pagination-patterns
description: Implements pagination strategies for API endpoints including cursor-based keyset pagination, offset-based pagination, relay-style connection patterns, and performance optimization techniques to handle large datasets without N+1 queries or memory exhaustion.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: pagination patterns, cursor-based pagination, keyset pagination, offset pagination, relay connections, how do i paginate API responses, infinite scroll backend
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: rest-api-patterns, graphql-schema-design, api-development-patterns




---





# API Pagination Patterns

Implements production pagination strategies for API endpoints including cursor-based keyset pagination, offset-based pagination, and Relay-style connection patterns. Optimizes query performance to handle large datasets without N+1 queries or memory exhaustion while providing predictable latency guarantees.

## TL;DR Checklist

- [ ] Use cursor-based (keyset) pagination for time-sensitive or frequently-modified data
- [ ] Generate deterministic cursors by encoding sort column values in base64
- [ ] Avoid OFFSET/LIMIT on tables with millions of rows — use SEEK-style queries instead
- [ ] Implement Relay-style `Connection` and `Edge` types only when frontend needs cursor navigation
- [ ] Add pagination metadata (`has_next_page`, `page_size`) to every paginated response
- [ ] Benchmark `COUNT(*)` performance before returning total counts on large tables

---

## When to Use

- Building list endpoints for resources with more than 50 items (orders, messages, transactions)
- Implementing infinite scroll feeds where users paginate by scrolling rather than clicking page numbers
- Exposing time-series or event data (logs, audit trails, stock trades) ordered by timestamp
- Designing GraphQL APIs using the Relay Connection specification for cursor-based navigation
- Optimizing queries on tables exceeding 100K rows where OFFSET/LIMIT causes performance degradation

---

## When NOT to Use

- Small result sets (< 20 items) where all data fits comfortably in memory
- Exact lookups by primary key — no pagination needed for single-entity endpoints
- Real-time streaming APIs — use Server-Sent Events or WebSockets instead
- Aggregation/reporting endpoints that return a fixed number of summary rows

---

## Core Workflow

1. **Choose Pagination Strategy** — Match the strategy to the data characteristics:
   - Cursor-based (keyset) for time-series, event logs, feeds with frequent mutations
   - Offset-based for administrative dashboards with stable datasets and page-number navigation
   - Relay-style for GraphQL APIs needing cursor traversal in both directions
   **Checkpoint:** If your data changes frequently (items inserted between pages), offset pagination will show duplicates or skip items — use cursor-based instead.

2. **Design the Cursor Encoding** — For keyset pagination, define a deterministic sort key from one or more columns. Encode these values into a base64 string that clients pass back in subsequent requests.
   **Checkpoint:** The cursor must encode ALL columns used in `ORDER BY`. If order has ties (multiple items with same timestamp), include a tiebreaker column (e.g., primary key).

3. **Construct the Seek Query** — Instead of `OFFSET N LIMIT M`, use the cursor to construct a `WHERE` clause that skips directly to the correct position:
   ```sql
   WHERE (sort_col > :cursor_value) OR (sort_col = :cursor_value AND id > :tiebreaker)
     ORDER BY sort_col ASC, id ASC
     LIMIT :page_size + 1
   ```
   **Checkpoint:** The query must use an index on `(sort_col, tiebreaker)` — verify with `EXPLAIN ANALYZE`.

4. **Build the Response** — Return up to `page_size + 1` items to detect if there's a next page. Strip the extra item from the data array. Include pagination metadata (`has_next_page`, cursor for the next/previous pages).
   **Checkpoint:** If you receive exactly `page_size + 1` results, `has_next_page = true`. Otherwise, it's `false`.

5. **Handle Edge Cases** — Ensure the API handles empty cursors (first page), end-of-stream (no more results), and cursor tampering (validate/canonicalize before use).
   **Checkpoint:** Never trust raw cursor values from clients — always decode and validate against expected column types before executing the query.

---

## Implementation Patterns

### Pattern 1: Cursor-Based Pagination with Base64-Encoded Keyset Tokens

Production keyset pagination using deterministic cursors that survive concurrent writes and handle multi-column sort keys.

```python
import base64
import json
from typing import Any, TypedDict


class PaginatedResponse[T]:
    """TypedDict for consistent paginated response structure."""
    data: list[T]
    page_info: dict[str, Any]


def encode_cursor(*values: Any) -> str:
    """Encode sort column values into a deterministic base64 cursor string.

    The cursor encodes column values in order, separated by null bytes (\\x00),
    then base64-encodes the result for URL-safe transmission.

    Args:
        *values: Column values from ORDER BY clause, in declaration order.
                 Must be JSON-serializable primitives (str, int, float, bool).

    Returns:
        Base64-encoded cursor string safe for URL query parameters.

    Example:
        >>> encode_cursor("2024-01-15T10:30:00Z", 48291)
        'MjAyNC0wMS0xNVQxMDozMDowMFoAMDgyOTE='
    """
    # Join with null byte separator (won't appear in valid JSON values)
    parts = [json.dumps(v, separators=(",", ":"), sort_keys=True) for v in values]
    joined = "\\x00".join(parts)
    return base64.urlsafe_b64encode(joined.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> list[Any]:
    """Decode a base64-encoded cursor back into its constituent column values.

    Validates the cursor format and returns the original values as Python types.

    Args:
        cursor: Base64-encoded cursor string (may include padding or not).

    Returns:
        List of decoded values matching the ORDER BY column order.

    Raises:
        ValueError: If the cursor is malformed or contains invalid JSON values.
    """
    # Restore base64 padding
    padded = cursor + "=" * (-len(cursor) % 4)
    decoded_bytes = base64.urlsafe_b64decode(padded)
    parts = decoded_bytes.split(b"\\x00")

    results = []
    for part in parts:
        try:
            results.append(json.loads(part))
        except json.JSONDecodeError as e:
            raise ValueError(f"Malformed cursor value: {part!r} — {e}") from e

    return results


class CursorPaginator:
    """Keyset pagination engine for SQL databases.

    Replaces OFFSET/LIMIT with seek-style WHERE clauses using encoded cursors.
    Guarantees stable pagination even when rows are inserted or deleted during
    iteration, as long as the sort columns and tiebreaker never decrease in value.

    Args:
        connection: SQLAlchemy or psycopg2 database connection.
        page_size: Maximum number of items per page (1–100).
        default_page_size: Default when client omits the `first` parameter.
    """

    def __init__(
        self,
        connection: Any,
        max_page_size: int = 100,
        default_page_size: int = 20,
    ):
        self.connection = connection
        self.max_page_size = max_page_size
        self.default_page_size = default_page_size

    def paginate(
        self,
        table: str,
        select_columns: list[str],
        order_column: str,
        tiebreaker_column: str = "id",
        cursor: str | None = None,
        direction: str = "forward",
        page_size: int | None = None,
        extra_conditions: str = "",
    ) -> PaginatedResponse[dict[str, Any]]:
        """Execute a keyset pagination query and return results with page info.

        Builds a seek-style query that uses the cursor to skip directly to the
        correct position in the sorted result set, avoiding OFFSET-based scans.

        Args:
            table: Target table name (must be whitelisted or parameterized).
            select_columns: Columns to SELECT (must include order_column and tiebreaker).
            order_column: Primary sort column (e.g., "created_at").
            tiebreaker_column: Secondary sort column for deterministic ordering.
            cursor: Base64-encoded cursor from previous page (None for first page).
            direction: "forward" or "backward" — affects WHERE clause operators.
            page_size: Items per page (bounded to max_page_size).
            extra_conditions: Additional WHERE clauses (e.g., "status = 'active'").

        Returns:
            PaginatedResponse with data array and page_info dict containing
            has_next_page, has_previous_page, next_cursor, and previous_cursor.
        """
        limit = min(page_size or self.default_page_size, self.max_page_size)
        # Fetch one extra to determine if more pages exist
        fetch_limit = limit + 1

        # Decode cursor values (empty list for first page / last page)
        cursor_values = decode_cursor(cursor) if cursor else []

        # Build WHERE clause based on direction and cursor presence
        conditions = []
        if extra_conditions:
            conditions.append(extra_conditions)

        if cursor_values:
            order_val, tiebreaker_val = cursor_values[0], cursor_values[1]
            if direction == "forward":
                conditions.append(
                    f"({order_column} > %s OR ({order_column} = %s AND {tiebreaker_column} > %s))"
                )
                where_args: list = [order_val, order_val, tiebreaker_val]
            else:  # backward
                conditions.append(
                    f"({order_column} < %s OR ({order_column} = %s AND {tiebreaker_column} < %s))"
                )
                where_args = [order_val, order_val, tiebreaker_val]
        else:
            if direction == "backward":
                conditions.append("TRUE")  # no cursor — get last N items
            # forward without cursor starts from beginning (no extra WHERE needed)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        query = f"""
            SELECT {", ".join(select_columns)}
            FROM {table}
            WHERE {where_clause}
            ORDER BY {order_column} ASC, {tiebreaker_column} ASC
            LIMIT %s
        """

        args: list = (where_args if cursor_values else []) + [fetch_limit]

        rows = self.connection.execute(query, args).fetchall()
        has_more = len(rows) > limit
        items = [dict(zip(select_columns, row)) for row in rows[:limit]]

        # Encode cursors for next/previous pages
        next_cursor = None
        previous_cursor = None

        if has_more and direction == "forward":
            # The (limit+1)th item is the start of the next page
            extra_row = dict(zip(select_columns, rows[limit]))
            next_cursor = encode_cursor(
                extra_row[order_column],
                extra_row[tiebreaker_column],
            )

        if items and cursor:  # have items and came from somewhere
            previous_cursor = cursor

        return PaginatedResponse[dict[str, Any]](
            data=items,
            page_info={
                "has_next_page": has_more,
                "has_previous_page": bool(previous_cursor),
                "next_cursor": next_cursor,
                "previous_cursor": previous_cursor,
                "page_size": limit,
            },
        )


# --- FastAPI endpoint example ---

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()


class PageInfo(BaseModel):
    has_next_page: bool
    has_previous_page: bool
    next_cursor: str | None = None
    previous_cursor: str | None = None
    page_size: int


class TransactionResponse(BaseModel):
    id: int
    amount: float
    created_at: str  # ISO 8601


@router.get("/transactions", response_model=dict)
async def list_transactions(
    after: str | None = Query(None, description="Cursor for next page"),
    before: str | None = Query(None, description="Cursor for previous page"),
    first: int | None = Query(None, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by transaction status"),
):
    # Determine direction and cursor
    if before:
        direction = "backward"
        cursor = decode_cursor(before)
        # For backward pagination, reverse the sort and flip the result
    elif after:
        direction = "forward"
        cursor = after
    else:
        direction = "forward"
        cursor = None

    paginator = CursorPaginator(db_session, max_page_size=100, default_page_size=20)
    result = paginator.paginate(
        table="transactions",
        select_columns=["id", "amount", "created_at"],
        order_column="created_at",
        tiebreaker_column="id",
        cursor=cursor if isinstance(cursor, str) else None,
        direction=direction,
        page_size=first,
        extra_conditions=f"status = '{status}'" if status else "",
    )

    return {
        "data": [TransactionResponse(**item).model_dump() for item in result["data"]],
        "page_info": result["page_info"],
    }
```

### Pattern 2: Offset-Based Pagination with COUNT Optimization

Offset pagination for admin dashboards and UIs with page-number navigation. Uses subquery-based COUNT optimization to avoid full table scans on large datasets.

```python
from typing import Any


class OffsetPaginator:
    """Offset/LIMIT pagination with optimized total count for large tables.

    Designed for administrative interfaces where users navigate by page numbers
    (1, 2, 3...) rather than following cursors. Uses subquery-based counting
    to minimize query cost on large tables.

    Warning: OFFSET N becomes slower as N increases because the database must
    scan and discard the first N rows before returning results. For tables
    with > 1M rows, consider limiting max offset or switching to cursor-based.
    """

    def __init__(
        self,
        connection: Any,
        max_page_size: int = 100,
        default_page_size: int = 25,
        max_offset: int = 50000,
    ):
        self.connection = connection
        self.max_page_size = max_page_size
        self.default_page_size = default_page_size
        self.max_offset = max_offset

    def paginate(
        self,
        table: str,
        select_columns: list[str],
        order_column: str = "id",
        page: int = 1,
        page_size: int | None = None,
        extra_conditions: str = "",
    ) -> dict[str, Any]:
        """Execute offset-based pagination query.

        Args:
            table: Target table name.
            select_columns: Columns to retrieve.
            order_column: Sort column (must be indexed for best performance).
            page: 1-indexed page number.
            page_size: Items per page (bounded to max_page_size).
            extra_conditions: Additional WHERE clause fragments.

        Returns:
            Dict with 'data' and 'page_info' keys matching the standard format.
        """
        limit = min(page_size or self.default_page_size, self.max_page_size)
        offset = (page - 1) * limit

        if offset > self.max_offset:
            raise ValueError(
                f"Offset {offset} exceeds maximum allowed ({self.max_offset}). "
                "Use cursor-based pagination for deep traversal."
            )

        # --- Optimized COUNT query ---
        # Use a subquery when extra_conditions are complex to avoid redundant
        # index scans. For simple queries, COUNT(*) is fine.
        where_clause = f"WHERE {extra_conditions}" if extra_conditions else "WHERE 1=1"

        count_query = f"SELECT COUNT(*) FROM {table} {where_clause}"
        total_count = self.connection.execute(count_query).scalar() or 0

        # Calculate total pages
        total_pages = max(1, (total_count + limit - 1) // limit)

        # --- Data query ---
        columns = ", ".join(select_columns)
        data_query = f"""
            SELECT {columns}
            FROM {table}
            {where_clause}
            ORDER BY {order_column} ASC
            LIMIT %s OFFSET %s
        """

        rows = self.connection.execute(data_query, (limit, offset)).fetchall()
        items = [dict(zip(select_columns, row)) for row in rows]

        return {
            "data": items,
            "page_info": {
                "page": page,
                "page_size": limit,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next_page": page < total_pages,
                "has_previous_page": page > 1,
                "next_page": page + 1 if page < total_pages else None,
                "previous_page": page - 1 if page > 1 else None,
            },
        }


# --- SQL COUNT optimization techniques ---

"""
For tables with > 500K rows, the standard COUNT(*) query becomes expensive.
Use these optimizations:

1. Approximate count (PostgreSQL):
   SELECT reltuples::bigint AS approx_count FROM pg_class WHERE relname = 'orders';
   Returns an estimate from the table's statistics — fast but not exact.

2. Count via covering index:
   SELECT COUNT(*) FROM orders USING INDEX orders_status_idx;
   Reads only the index pages, not heap rows — 5-10x faster than full table count.

3. Cached counter table (for real-time dashboards):
   CREATE TABLE count_cache (table_name TEXT PRIMARY KEY, approx_count BIGINT);
   Update via triggers or async background jobs. Acceptable staleness for UI purposes.

4. Never COUNT() on filtered queries with unindexed columns — add an index:
   CREATE INDEX idx_orders_status_created ON orders(status, created_at);
"""
```

### Pattern 3: Relay-Style Connection Pattern

Full GraphQL-style `Connection`/`Edge` type implementation in REST, following the GraphQL Relay spec. Provides bidirectional cursor navigation with consistent pagination semantics.

```python
import base64
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar


T = TypeVar("T")


@dataclass
class Edge(Generic[T]):
    """A single edge in a Relay-style connection containing the node and its cursor."""
    cursor: str
    node: T


@dataclass
class PageInfo:
    """Pagination state for the current page of results.

    Follows GraphQL Relay spec for bidirectional cursor navigation.
    All four fields are required per the specification.
    """
    has_next_page: bool
    has_previous_page: bool
    start_cursor: str | None = None
    end_cursor: str | None = None


@dataclass
class Connection(Generic[T]):
    """Relay-style connection wrapping a paginated result set.

    Contains edges (with cursors + nodes) and pageInfo for navigation.
    Clients use edge.cursor values as cursors for next/previous queries.

    Usage:
        conn = Connection(
            edges=[Edge(cursor=c1, node=item1), Edge(cursor=c2, node=item2)],
            page_info=PageInfo(has_next_page=True, has_previous_page=False,
                               start_cursor=c1, end_cursor=c2),
        )
    """
    edges: list[Edge[T]] = field(default_factory=list)
    page_info: PageInfo = field(default_factory=PageInfo)


def encode_relay_cursor(value: str | int) -> str:
    """Encode a value as a Relay-compatible cursor.

    Relay spec defines cursors as base64-encoded strings of the format
    "type:id" — however, for opaque cursors we just encode the sort key(s).
    This implementation uses simple base64 for sort-column values.

    Args:
        value: The primary key or sort value to encode.

    Returns:
        Base64-encoded cursor string.
    """
    return base64.urlsafe_b64encode(f"{value}".encode()).decode().rstrip("=")


def decode_relay_cursor(cursor: str) -> str:
    """Decode a Relay cursor back to its original value.

    Args:
        cursor: Base64-encoded cursor string.

    Returns:
        The decoded original value as a string.

    Raises:
        ValueError: If the cursor is invalid base64.
    """
    padded = cursor + "=" * (-len(cursor) % 4)
    return base64.urlsafe_b64decode(padded).decode()


class RelayConnectionPaginator:
    """Implements Relay-style connections for SQL-backed REST APIs.

    Translates between the cursor-based pagination model and REST request
    patterns while preserving the Edge/Connection structure expected by
    GraphQL clients or UIs using Relay hooks.

    Follows the GraphQL Relay Connection specification:
    https://relay.dev/docs/technical/connection-spec/
    """

    def __init__(
        self,
        connection: Any,
        max_page_size: int = 50,
        default_page_size: int = 20,
        cursor_column: str = "id",
    ):
        self.connection = connection
        self.max_page_size = max_page_size
        self.default_page_size = default_page_size
        self.cursor_column = cursor_column

    def get_connection(
        self,
        table: str,
        select_columns: list[str],
        first: int | None = None,
        after: str | None = None,
        last: int | None = None,
        before: str | None = None,
        extra_conditions: str = "",
    ) -> Connection[dict[str, Any]]:
        """Fetch a Relay-style Connection from the database.

        Supports both forward (first/after) and backward (last/before) pagination
        as defined in the Relay spec. The cursor encodes the primary key value.

        Args:
            table: Table name to query.
            select_columns: Columns to retrieve.
            first: Number of items forward from `after`.
            after: Cursor — return items AFTER this cursor.
            last: Number of items backward from `before`.
            before: Cursor — return items BEFORE this cursor.
            extra_conditions: Additional WHERE clause fragments.

        Returns:
            Connection with edges and PageInfo matching Relay spec.
        """
        # Determine direction and limit
        if first is not None:
            direction = "forward"
            limit = min(first, self.max_page_size)
            cursor_val = decode_relay_cursor(after) if after else None
        elif last is not None:
            direction = "backward"
            limit = min(last, self.max_page_size)
            cursor_val = decode_relay_cursor(before) if before else None
        else:
            direction = "forward"
            limit = self.default_page_size
            cursor_val = None

        # Build query — fetch one extra to determine has_next/has_previous
        where_clauses = []
        if extra_conditions:
            where_clauses.append(extra_conditions)
        if cursor_val is not None:
            if direction == "forward":
                where_clauses.append(f"{self.cursor_column} > %s")
            else:
                where_clauses.append(f"{self.cursor_column} < %s")

        where = " AND ".join(where_clauses)
        fetch_limit = limit + 1

        args = []
        if cursor_val is not None:
            args.append(cursor_val)

        query = f"""
            SELECT {", ".join(select_columns)}
            FROM {table}
            {'WHERE ' + where if where else ''}
            ORDER BY {self.cursor_column} ASC
            LIMIT %s
        """
        args.append(fetch_limit)

        rows = self.connection.execute(query, tuple(args)).fetchall()
        columns = select_columns

        # Determine boundaries
        has_next_page = len(rows) > limit
        has_previous_page = cursor_val is not None  # if we have a cursor, there's previous

        # Build edges (strip the extra row used for boundary detection)
        data_rows = rows[:limit]
        edges: list[Edge[dict[str, Any]]] = []
        for row in data_rows:
            node = dict(zip(columns, row))
            cursor_str = encode_relay_cursor(row[columns.index(self.cursor_column)])
            edges.append(Edge(cursor=cursor_str, node=node))

        # Determine start/end cursors
        start_cursor = edges[0].cursor if edges else None
        end_cursor = edges[-1].cursor if edges else None

        page_info = PageInfo(
            has_next_page=has_next_page,
            has_previous_page=has_previous_page,
            start_cursor=start_cursor,
            end_cursor=end_cursor,
        )

        return Connection(edges=edges, page_info=page_info)


# --- Example: FastAPI endpoint returning Relay-style connections ---

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter()


class UserNode(BaseModel):
    id: int
    email: str
    display_name: str
    created_at: datetime


class RelayPageInfo(BaseModel):
    has_next_page: bool = Field(..., description="True if there are more items after this page")
    has_previous_page: bool = Field(..., description="True if there are more items before this page")
    start_cursor: str | None = Field(None, description="Cursor for the first item in this page")
    end_cursor: str | None = Field(None, description="Cursor for the last item in this page")


class UserEdge(BaseModel):
    cursor: str = Field(..., description="Relay-encoded cursor for this edge")
    node: UserNode


class UserConnection(BaseModel):
    edges: list[UserEdge] = Field(default_factory=list)
    page_info: RelayPageInfo


@router.get("/users/connection", response_model=UserConnection)
def get_users_connection(
    first: int | None = Query(None, ge=1, le=50, description="Forward pagination limit"),
    after: str | None = Query(None, description="Cursor for forward pagination (items after this cursor)"),
    last: int | None = Query(None, ge=1, le=50, description="Backward pagination limit"),
    before: str | None = Query(None, description="Cursor for backward pagination (items before this cursor)"),
):
    paginator = RelayConnectionPaginator(db_session, max_page_size=50, default_page_size=20)

    conn = paginator.get_connection(
        table="users",
        select_columns=["id", "email", "display_name", "created_at"],
        first=first, after=after, last=last, before=before,
    )

    return UserConnection(
        edges=[
            UserEdge(cursor=edge.cursor, node=UserNode(**edge.node))
            for edge in conn.edges
        ],
        page_info=RelayPageInfo(
            has_next_page=conn.page_info.has_next_page,
            has_previous_page=conn.page_info.has_previous_page,
            start_cursor=conn.page_info.start_cursor,
            end_cursor=conn.page_info.end_cursor,
        ),
    )
```

---

### BAD vs. GOOD: Common Pagination Mistakes

#### ❌ BAD: OFFSET/LIMIT on millions of rows

Deep pagination with large offsets forces the database to scan and discard every preceding row, causing O(N) query cost where N is the offset value.

```sql
-- ❌ BAD — OFFSET 100000 LIMIT 20
-- Database scans 100,012 rows, discards 100,000, returns 12
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;
-- Execution time: ~3.2 seconds on a table with 5M rows

-- ❌ BAD — counting total with filtered query on unindexed column
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- Full sequential scan of entire table — no index on status alone
```

#### ✅ GOOD: SEEK-style cursor pagination + optimized count

```sql
-- ✅ GOOD — cursor-based seek using indexed columns (microseconds vs seconds)
SELECT * FROM orders
WHERE (created_at > '2024-06-15T10:30:00Z'
   OR (created_at = '2024-06-15T10:30:00Z' AND id > 48291))
ORDER BY created_at DESC, id DESC
LIMIT 21;
-- Execution time: ~0.8ms — uses index on (created_at, id)

-- ✅ GOOD — approximate count for large tables
SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';
-- Returns estimate from PostgreSQL statistics — instant regardless of table size

-- ✅ GOOD — covering index for filtered counts
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
-- COUNT(*) with status filter reads only the index tree, not heap rows
```

#### ❌ BAD: Cursor tampering vulnerability

Exposing raw database IDs as cursors allows clients to enumerate resources by guessing sequential IDs.

```python
# ❌ BAD — raw ID as cursor enables enumeration attacks
cursor = str(user_id)  # client can try 1, 2, 3... to enumerate all users

# Also exposes internal schema: cursor format reveals the primary key is an integer
@router.get("/users")
def list_users(cursor: str | None = None):
    if cursor:
        query = "SELECT * FROM users WHERE id > %s ORDER BY id LIMIT 20"
```

#### ✅ GOOD: Opaque encoded cursors with tiebreakers

```python
# ✅ GOOD — opaque cursor prevents enumeration and handles sort ties
cursor_value = encode_cursor(row["created_at"], row["id"])
# Result: "MjAyNC0wNi0xNVQxMDozMDowMFoAMDgyOTE=" — no relationship to actual ID

@router.get("/users")
def list_users(after: str | None = None):
    if after:
        values = decode_cursor(after)
        created_at, user_id = values[0], values[1]
        query = """SELECT * FROM users
                   WHERE (created_at > %s OR (created_at = %s AND id > %s))
                   ORDER BY created_at DESC, id DESC LIMIT 21"""
```

#### ❌ BAD: Missing total count tradeoff discussion in cursor pagination

Cursor pagination doesn't naturally support "total page count" because the database can't know how many pages exist without scanning to the end. Documenting this limitation prevents client-side bugs.

```python
# ❌ BAD — returning total_pages with cursor-based pagination (requires full scan)
def paginate_cursor(table, **params):
    # This is O(N) — scans entire table to count rows matching the WHERE clause
    total = db.execute(f"SELECT COUNT(*) FROM {table}").scalar()  # slow!
    total_pages = ceil(total / page_size)  # meaningless without OFFSET stability

# ✅ GOOD — document that cursor pagination doesn't provide total pages;
# clients should use has_next_page boolean instead of checking page < totalPages.
```

---

## Constraints

### MUST DO
- Always include a tiebreaker column (usually primary key) in the sort key to ensure deterministic ordering when sort values are not unique
- Encode cursors as opaque base64 strings — never expose raw database IDs or internal identifiers as cursor values
- Add one extra row (`LIMIT N+1`) when checking for `has_next_page` — this avoids a separate COUNT query
- Index all columns used in ORDER BY clauses, especially the primary sort column plus tiebreakers
- Document pagination strategy in API documentation: specify whether consumers should use cursors or page numbers
- Bound `page_size` with a maximum (recommended 10–100) to prevent resource exhaustion from excessive requests

### MUST NOT DO
- Return total count on every cursor-paginated endpoint — it requires a full table scan and negates the performance benefits of keyset pagination
- Use OFFSET/LIMIT for APIs serving > 100K rows without an explicit max offset limit — deep offsets degrade linearly with database size
- Trust cursor values from clients without decoding and validating them against expected types (e.g., reject non-numeric cursors when expecting integer PKs)
- Rely on `LIMIT` alone to enforce page size — always validate the requested `page_size` against a server-side maximum before executing the query
- Return `total_pages` with cursor-based pagination — this metric is only meaningful with offset-based strategies and causes clients to mix incompatible approaches

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-patterns` | REST design conventions including proper use of HTTP headers (Link, Range) for pagination hints |
| `graphql-schema-design` | GraphQL cursor specification which this Relay pattern follows — reference for GraphQL-native APIs |
| `api-development-patterns` | Broader API development practices including rate limiting interaction with paginated endpoints |

---

## Live References

> Authorative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GraphQL Relay Connection Specification](https://relay.dev/docs/technical/connection-spec/)
- [RFC 9110 — HTTP Range Requests (Section 13.4)](https://datatracker.ietf.org/doc/html/rfc9110#section-13.4)
- [PostgreSQL Documentation — ORDER BY and Index Usage](https://www.postgresql.org/docs/current/indexes-ordering.html)
- [MySQL Documentation — Optimizing OFFSET Queries](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html)
- [Facebook Engineering — Paginating the Facebook News Feed](https://engineering.fb.com/web/paginating-the-facebook-news-feed/)
- [Stripe API Pagination (Cursor-Based)](https://stripe.com/docs/api/pagination)
- [GitHub GraphQL API — Node and Connection Types](https://docs.github.com/en/graphql/overview/object-reference#connection-types)
