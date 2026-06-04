---
name: rest-api-pagination-filtering
description: Implements pagination patterns including cursor-based keyset pagination for large datasets, offset-based pagination for small collections, query parameter filtering, field selection sparse fieldsets, and sorting conventions for REST API collections.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: cursor-based pagination, offset pagination, keyset pagination, API filtering, sparse fieldsets, pagination envelope, how do i paginate a REST API, collection filtering API
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
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
  related-skills: rest-api-resource-modeling, rest-api-caching
---

# Pagination and Filtering Specialist

Implements pagination strategies optimized for dataset size — cursor-based keyset pagination for large datasets and activity feeds, offset-based pagination with link headers for small admin collections. When active, the model designs request parameter validation (opaque cursors, bounded limits), constructs pagination envelopes with has_more indicators, implements query parameter filtering with exact-match defaults and operator-based ranges, supports sorting via dash-prefix descending convention, and adds sparse fieldset support via ?fields= query parameters.

## TL;DR Checklist

- [ ] Choose cursor-based pagination for >10K records or activity feeds; offset-based for <10K admin collections
- [ ] Validate limit with min/max bounds (default 20, min 1, max 100) to prevent runaway queries
- [ ] Include has_more flag in pagination envelope — clients must check this before requesting the next page
- [ ] Use operator-based filters (?age[gte]=18, ?status=in_stock,backorder) rather than individual parameters
- [ ] Sort descending with dash prefix (?sort=-created_at,name) — no dash means ascending
- [ ] Support field selection sparse fieldsets via ?fields=id,name,email to reduce payload size

---

## When to Use

Use this skill when:

- Designing pagination for a collection endpoint (`/users`, `/orders`, `/transactions`)
- Choosing between cursor-based and offset-based pagination based on dataset size and access patterns
- Implementing query parameter filtering with operator support (gte, lte, in, contains)
- Adding sorting capabilities to list endpoints with configurable field order and direction
- Implementing sparse fieldsets so clients can request only the fields they need
- Building admin dashboards that need offset-based pagination with total counts

---

## When NOT to Use

Avoid this skill for:

- **Single-resource endpoints** (`/users/{id}`) — these return one resource, no pagination needed
- **Search endpoints** that use full-text search or Elasticsearch — these have their own pagination conventions (from/size parameters)
- **Real-time streams** (WebSockets, Server-Sent Events) — streaming uses push-based delivery, not request/response pagination

---

## Core Workflow

1. **Choose Pagination Strategy Based on Dataset Size** — For datasets exceeding 10K records or feeds accessed by offset (activity timelines, notification histories): use cursor-based keyset pagination where the cursor encodes a sort value for resuming from a position. For small collections (<10K) like admin dashboards where clients need to jump to arbitrary pages: use offset-based pagination with total count and page links.
   **Checkpoint:** Cursor-based pagination cannot efficiently support "jump to page 5" — if that's a client requirement, use offset-based instead.

2. **Implement Request Parameter Validation** — Define strict bounds for all pagination parameters. The `limit` parameter must have a minimum (1) and maximum (100) value with a sensible default (20). For cursor-based pagination, the cursor is an opaque base64-encoded string — clients should not need to parse it.
   **Checkpoint:** Every endpoint must reject requests with limit > max_limit or malformed cursors with 400 Bad Request before executing any database query.

3. **Design Pagination Envelope Structure** — For cursor-based: `{ items: [...], has_more: bool, next_cursor: str | null }`. For offset-based: `{ items: [...], total: int, page: int, per_page: int, _links: { self, first, prev, next, last } }`. Include `_links` following RFC 5988 Web Linking semantics where applicable.
   **Checkpoint:** The `has_more` flag must accurately reflect whether additional items exist beyond the current page — an incorrect has_more value causes data loss on the client side.

4. **Add Filtering via Query Parameters** — Default to exact-match filtering (`?status=pending`). Support operator-based ranges for numeric and date fields (`?age[gte]=18`, ?created_at[gte]=2025-01-01). Support array filters for multi-value matching (`?status=in_stock,backorder` or `?role=admin,user`).
   **Checkpoint:** Every filter parameter must have a documented type and supported operators — clients should not guess which fields support range queries.

5. **Implement Sorting with Dash-Prefix Convention** — Use `-field_name` for descending order and `field_name` for ascending (default). Multiple sort fields are comma-separated: `?sort=-created_at,name`. The most recently created items appear first by default for timestamp-based collections.
   **Checkpoint:** Invalid sort field names must return 400 Bad Request with a list of valid sort fields — never silently ignore unknown sort parameters.

6. **Add Field Selection Sparse Fieldset Support** — Allow clients to request only specific fields via `?fields=id,name,email`. The server returns only the requested fields, reducing bandwidth for large resource objects. If no ?fields parameter is provided, return all fields (full representation).
   **Checkpoint:** The response must never include unrequested fields — even computed or derived fields should be excluded if not in the fields list.

---

## Implementation Patterns

### Pattern 1: Cursor-Based Keyset Pagination (BAD vs. GOOD)

Cursor-based pagination encodes the last item's sort values into an opaque token. This avoids the performance and correctness problems of offset pagination on large datasets where rows may be added or removed between page requests.

```python
# ❌ BAD: Offset-based pagination that breaks under concurrent writes
from fastapi import FastAPI, Query
import base64
import json

app = FastAPI()


@app.get("/transactions")
def list_transactions_bad(
    offset: int = 0,
    limit: int = 20,
):
    """Offset pagination fails when rows are inserted/deleted between requests.

    If a transaction is deleted after the client reads offset=40, limit=20,
    the next request (offset=60) skips one row — data inconsistency.
    Also extremely slow on large datasets because OFFSET 100000 forces the
    database to scan and discard 100K rows before returning results.
    """
    # In production: db.query("SELECT * FROM transactions ORDER BY created_at LIMIT %s OFFSET %s", limit, offset)
    return {"items": [], "offset": offset}


# ✅ GOOD: Cursor-based keyset pagination with base64-encoded opaque tokens

from fastapi import FastAPI, Query, HTTPException
import base64
import json
from typing import Any
from datetime import datetime

app = FastAPI()

# Pagination configuration constants
DEFAULT_LIMIT = 20
MIN_LIMIT = 1
MAX_LIMIT = 100


def encode_cursor(items: list[dict[str, Any]], sort_field: str = "created_at") -> str | None:
    """Encode the last item's sort value into an opaque base64 cursor.

    The cursor encodes [sort_value, resource_id] so it can resume from
    the exact position after the last returned item. Clients must treat
    this as an opaque string — never parse or modify it.

    Args:
        items: List of resources returned in the current page.
        sort_field: The field used for keyset pagination (must be indexed).

    Returns:
        Base64-encoded cursor string, or None if no more pages exist.
    """
    if not items:
        return None

    last_item = items[-1]
    # Encode as [sort_value, id] — the sort value enables keyset resume,
    # the ID ensures uniqueness when multiple items share the same sort value
    cursor_data = json.dumps([last_item.get(sort_field), last_item["id"]])
    return base64.urlsafe_b64encode(cursor_data.encode()).decode()


def decode_cursor(cursor: str) -> dict[str, Any]:
    """Decode an opaque cursor into its sort values for database queries.

    Raises HTTPException(400) if the cursor is malformed or expired.

    Args:
        cursor: Base64-encoded cursor string from a previous response.

    Returns:
        Dict with 'sort_value' and 'id' extracted from the cursor.
    """
    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        sort_value, item_id = json.loads(decoded)
        return {"sort_value": sort_value, "item_id": int(item_id)}
    except (base64.binascii.Error, json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid cursor format: {e}. Cursor must be a valid base64 encoding.",
        )


@app.get("/transactions")
def list_transactions_cursor(
    limit: int = Query(DEFAULT_LIMIT, ge=MIN_LIMIT, le=MAX_LIMIT, description="Number of items per page"),
    after: str | None = Query(None, alias="after", description="Opaque cursor to resume from a position"),
):
    """GET /transactions — Cursor-based keyset pagination.

    The 'after' parameter is an opaque base64 token returned in the previous response's
    next_cursor field. Clients should never construct or modify this value.

    Returns has_more=true if additional items exist beyond this page.
    Returns next_cursor pointing to the following page, or null on the final page.
    """
    # Validate cursor format before querying the database
    cursor_params = None
    if after:
        cursor_params = decode_cursor(after)

    # Build query with keyset pagination (WHERE clause uses cursor values)
    # In production: use parameterized SQL or ORM equivalent
    # SELECT * FROM transactions WHERE (created_at, id) > (:sort_value, :item_id) ORDER BY created_at, id LIMIT :limit
    sort_field = "created_at"

    if cursor_params:
        items = db_query_transactions_keyset(
            sort_value=cursor_params["sort_value"],
            item_id=cursor_params["item_id"],
            limit=limit,
        )
    else:
        items = db_query_transactions_keyset(
            sort_value=None,
            item_id=None,
            limit=limit,
        )

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]  # Trim to exact limit

    next_cursor = encode_cursor(items, sort_field) if has_more else None

    return {
        "items": items,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "_meta": {
            "cursor_based": True,
            "limit_applied": limit,
            "sort_field": sort_field,
        },
    }


# --- Simulated database queries ---

def db_query_transactions_keyset(sort_value: str | None, item_id: int | None, limit: int) -> list[dict]:
    """Simulate keyset-paginated database query. In production, this would be real SQL."""
    return [{"id": i, "amount": 100.0, "created_at": f"2025-01-{i:02d}T00:00:00Z"} for i in range(limit + (1 if sort_value is None else 0))]


# --- Example client interaction ---

"""
Request 1: GET /transactions?limit=5
Response:
{
  "items": [{"id": 1, ...}, {"id": 2, ...}, {"id": 3, ...}, {"id": 4, ...}, {"id": 5, ...}],
  "has_more": true,
  "next_cursor": "WyIyMDI1LTAxLTA1VDAwOjAwOjAwWiIsIDVd",
  "_meta": {"cursor_based": true, "limit_applied": 5}
}

Request 2: GET /transactions?limit=5&after=WyIyMDI1LTAxLTA1VDAwOjAwOjAwWiIsIDVd
Response (resumes from after item id=5):
{
  "items": [{"id": 6, ...}, {"id": 7, ...}, {"id": 8, ...}, {"id": 9, ...}, {"id": 10, ...}],
  "has_more": true,
  "next_cursor": "WyIyMDI1LTAxLTEwVDAwOjAwOjAwWiIsIDEwXQ==",
}

Request 3 (final page):
{
  "items": [{"id": 11, ...}],
  "has_more": false,
  "next_cursor": null,
}
"""
```

### Pattern 2: Offset-Based Pagination with Link Headers (BAD vs. GOOD)

Offset-based pagination is appropriate for smaller datasets (<10K records) where clients need to jump to arbitrary pages (e.g., admin dashboards, search results). It provides total counts and RFC 5988 Web Linking headers for easy navigation.

```python
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/admin/users")
def list_admin_users(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page (max 100)"),
):
    """GET /admin/users — Offset-based pagination with RFC 5988 Link headers.

    Designed for admin dashboards where users need to jump between pages freely.
    Returns total count so clients can compute the total number of pages.
    Includes _links following JSON API conventions and Link HTTP header per RFC 5988.
    """
    # Validate parameters (FastAPI Query validation handles bounds)
    offset = (page - 1) * per_page

    # In production: count all records, then slice with OFFSET/LIMIT
    total = db_count_users()
    items = db_query_users_offset(offset, per_page)

    total_pages = max(1, (total + per_page - 1) // per_page)  # Ceiling division
    has_prev = page > 1
    has_next = page < total_pages

    base_url = "/admin/users"
    links: dict[str, str] = {
        "self": f"{base_url}?page={page}&per_page={per_page}",
        "first": f"{base_url}?page=1&per_page={per_page}",
    }
    if has_prev:
        links["prev"] = f"{base_url}?page={page - 1}&per_page={per_page}"
    if has_next:
        links["next"] = f"{base_url}?page={page + 1}&per_page={per_page}"
    links["last"] = f"{base_url}?page={total_pages}&per_page={per_page}"

    # Build response with _links
    response_data = {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "_links": links,
    }

    response = JSONResponse(content=response_data)

    # Set RFC 5988 Link header alongside _links in body
    link_header_parts = [f'<{url}>; rel="{rel}"' for rel, url in links.items() if rel != "self"]
    if link_header_parts:
        response.headers["Link"] = ", ".join(link_header_parts)

    return response


# --- Link header format example (RFC 5988) ---

"""
GET /admin/users?page=2&per_page=25 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Link: <https://api.example.com/admin/users?page=1&per_page=25>; rel="prev",
      <https://api.example.com/admin/users?page=3&per_page=25>; rel="next",
      <https://api.example.com/admin/users?page=40&per_page=25>; rel="last"

{
  "items": [...],
  "total": 987,
  "page": 2,
  "per_page": 25,
  "total_pages": 40,
  "_links": {
    "self": "/admin/users?page=2&per_page=25",
    "prev": "/admin/users?page=1&per_page=25",
    "next": "/admin/users?page=3&per_page=25",
    "first": "/admin/users?page=1&per_page=25",
    "last": "/admin/users?page=40&per_page=25"
  }
}
"""


def db_count_users() -> int:
    """Simulate total count query. In production, use COUNT(*) or EXPLAIN analysis."""
    return 987


def db_query_users_offset(offset: int, per_page: int) -> list[dict]:
    """Simulate paginated query with OFFSET/LIMIT. In production: SELECT * FROM users LIMIT $1 OFFSET $2."""
    return [{"id": i, "name": f"User {i}"} for i in range(offset + 1, offset + per_page + 1)]


# --- When NOT to use offset pagination: large datasets ---

"""
❌ BAD on datasets > 100K rows:
   SELECT * FROM events ORDER BY created_at LIMIT 50 OFFSET 500000
   This forces the database engine to scan and discard 500K rows before returning 50.
   Performance degrades linearly with offset — page 1 is fast, page 10000 is slow.

✅ GOOD alternative for large datasets: cursor-based pagination (see Pattern 1).
"""
```

### Pattern 3: Query Parameter Filtering and Sorting (BAD vs. GOOD)

Filtering uses operator-based query parameters (`?age[gte]=18`, `?status=in_stock,backorder`), sorting uses dash-prefix descending convention (`?sort=-created_at,name`), and field selection uses sparse fieldsets via `?fields=id,name,email`.

```python
# ❌ BAD: No filtering, no sorting — clients must fetch everything locally
from fastapi import FastAPI

app = FastAPI()


@app.get("/products")
def get_products_bad():
    """Returns ALL products with no filtering or pagination.

    Client receives 50,000 product records when it only needs red shirts in size M.
    No sorting — returned in arbitrary database order.
    No field selection — every product returns all 47 fields even if the client
    only displays id, name, and price.
    """
    return {"items": []}


# ✅ GOOD: Complete filtering, sorting, and field selection system

from fastapi import FastAPI, Query, HTTPException
import re
from typing import Any

app = FastAPI()

# Whitelist of filterable fields with their types
FILTERABLE_FIELDS: dict[str, str] = {
    "id": "uuid",
    "name": "string",
    "status": "enum:pending,confirmed,shipped,delivered,cancelled",
    "price": "decimal",
    "quantity": "integer",
    "created_at": "datetime",
    "updated_at": "datetime",
    "category": "string",
    "tags": "array",
}

# Whitelist of sortable fields with defaults
SORTABLE_FIELDS: dict[str, str] = {
    "id": "ASC",
    "name": "ASC",
    "price": "DESC",
    "quantity": "DESC",
    "created_at": "DESC",
    "updated_at": "DESC",
}

# Whitelist of all response fields (for sparse fieldset)
RESPONSE_FIELDS: list[str] = [
    "id", "name", "email", "status", "price", "quantity",
    "category", "tags", "created_at", "updated_at",
]


def parse_filter_params(filters: dict[str, Any]) -> dict[str, Any]:
    """Parse and validate filter query parameters.

    Supports three filter modes:
      1. Exact match: ?status=pending → WHERE status = 'pending'
      2. Operator-based: ?price[gte]=10&price[lte]=100 → WHERE price BETWEEN 10 AND 100
      3. Array/in operator: ?status=in_stock,backorder → WHERE status IN ('in_stock', 'backorder')

    Args:
        filters: Raw dict of filter parameters extracted from query strings.

    Returns:
        Validated and normalized filter dict ready for database query construction.

    Raises:
        HTTPException(400) if a filter field is not in the whitelist or uses unsupported operators.
    """
    validated: dict[str, Any] = {}

    for param, value in filters.items():
        # Check for operator notation: ?price[gte]=10
        match = re.match(r'^([a-z_]+)\[(gte|lte|gt|lt|in|contains|not_in)\]$', param)
        if match:
            field_name, operator = match.group(1), match.group(2)
            if field_name not in FILTERABLE_FIELDS:
                raise HTTPException(status_code=400, detail=f"Unknown filter field: {field_name}")

            # Validate value type based on field type
            field_type = FILTERABLE_FIELDS[field_name]
            if operator == "in" and isinstance(value, str):
                validated[field_name] = {"operator": "in", "values": [v.strip() for v in value.split(",")]}
            elif operator in ("gte", "lte", "gt", "lt"):
                try:
                    validated[field_name] = {"operator": operator, "value": float(value)}
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Numeric value required for {field}[{operator}]")
            else:
                validated[field_name] = {"operator": operator, "value": value}

        elif param in FILTERABLE_FIELDS:
            # Exact match — no operator means = comparison
            validated[param] = {"operator": "=", "value": value}
        else:
            raise HTTPException(status_code=400, detail=f"Unknown filter field: {param}")

    return validated


def parse_sort_params(sort_str: str | None) -> list[tuple[str, str]]:
    """Parse sort query parameter into a list of (field, direction) tuples.

    Supports comma-separated fields with optional dash prefix for descending:
      ?sort=-created_at,name → [("created_at", "DESC"), ("name", "ASC")]
      ?sort=price → [("price", "DESC")]  # Default direction from SORTABLE_FIELDS

    Args:
        sort_str: Raw sort parameter value from the query string.

    Returns:
        List of (field_name, direction) tuples sorted by priority order.

    Raises:
        HTTPException(400) if an unknown sort field is requested.
    """
    if not sort_str or not sort_str.strip():
        # Default sorting: most recently created first
        return [("created_at", "DESC")]

    result = []
    for part in sort_str.split(","):
        part = part.strip()
        descending = part.startswith("-")
        field_name = part.lstrip("-")

        if field_name not in SORTABLE_FIELDS:
            valid_fields = ", ".join(sorted(SORTABLE_FIELDS.keys()))
            raise HTTPException(
                status_code=400,
                detail=f"Unknown sort field: {field_name}. Valid fields: {valid_fields}",
            )

        # Explicit descending takes priority; otherwise use the field's default direction
        direction = "DESC" if descending else SORTABLE_FIELDS[field_name]
        result.append((field_name, direction))

    return result


def apply_field_selection(data: dict[str, Any], requested_fields: str | None) -> dict[str, Any]:
    """Filter response fields based on the ?fields= query parameter (sparse fieldset).

    If no ?fields parameter is provided, returns all fields (full representation).
    If ?fields is provided, returns only the requested fields in the specified order.

    Args:
        data: The full resource dict to filter.
        requested_fields: Comma-separated field names from ?fields= query param.

    Returns:
        Dict containing only the requested fields, preserving input order.
    """
    if not requested_fields or not requested_fields.strip():
        return data  # No filtering — return all fields

    requested = [f.strip() for f in requested_fields.split(",") if f.strip()]

    invalid_fields = [f for f in requested if f not in RESPONSE_FIELDS]
    if invalid_fields:
        valid_list = ", ".join(RESPONSE_FIELDS)
        raise HTTPException(
            status_code=400,
            detail=f"Unknown fields: {', '.join(invalid_fields)}. Valid fields: {valid_list}",
        )

    return {field: data[field] for field in requested if field in data}


# --- Complete endpoint with all filtering features ---

@app.get("/products")
def list_products(
    # Filtering parameters
    status: str | None = Query(None, description="Filter by product status"),
    price_min: float | None = Query(None, alias="price[gte]", description="Minimum price (inclusive)"),
    price_max: float | None = Query(None, alias="price[lte]", description="Maximum price (inclusive)"),
    category: str | None = Query(None, description="Filter by category name"),
    tags: str | None = Query(None, description="Filter by status values (comma-separated: in_stock,backorder)"),

    # Sorting parameter
    sort: str | None = Query(None, description="Sort fields with optional dash prefix for descending. Example: -created_at,name"),

    # Pagination parameters
    page: int = Query(1, ge=1, description="Page number (offset-based pagination)"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page (max 100)"),

    # Field selection sparse fieldset
    fields: str | None = Query(None, description="Comma-separated field names to include. Example: id,name,price,status"),
):
    """GET /products — Full-featured collection endpoint with filtering, sorting, pagination, and field selection.

    Filtering examples:
      ?status=pending                                    → exact match on status
      ?price[gte]=10&price[lte]=100                     → price between 10 and 100
      ?category=electronics                              → filter by category
      ?tags=in_stock,backorder                           → status in (in_stock, backorder)

    Sorting examples:
      ?sort=-created_at                                  → newest first (default)
      ?sort=price                                        → price ascending (field default)
      ?sort=-created_at,name                             → newest first, then alphabetical by name

    Field selection examples:
      ?fields=id,name,price                              → return only id, name, price
      (no ?fields)                                       → return all fields

    Pagination example:
      ?page=3&per_page=50                                → page 3, 50 items per page
    """
    # Build filter dict from query parameters
    filter_params = {}
    if status is not None:
        filter_params["status"] = status
    if price_min is not None:
        filter_params["price[gte]"] = str(price_min)
    if price_max is not None:
        filter_params["price[lte]"] = str(price_max)
    if category is not None:
        filter_params["category"] = category
    if tags is not None:
        filter_params["tags"] = tags

    # Validate filters against whitelist
    validated_filters = parse_filter_params(filter_params) if filter_params else {}

    # Parse and validate sort parameters
    sort_order = parse_sort_params(sort)

    # Execute paginated query with filters and sort
    offset = (page - 1) * per_page
    items = db_query_products(validated_filters, sort_order, offset, per_page)

    # Apply field selection sparse fieldset
    items = [apply_field_selection(item, fields) for item in items]

    total = db_count_products_with_filters(validated_filters)
    total_pages = max(1, (total + per_page - 1) // per_page)
    has_next = page < total_pages

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "_links": {
            "self": f"/products?page={page}&per_page={per_page}",
            "first": "/products?page=1&per_page={}".format(per_page),
        },
    }


def db_query_products(filters: dict, sort_order: list[tuple[str, str]], offset: int, per_page: int) -> list[dict]:
    """Simulate database query with filters, sorting, and pagination."""
    return [{"id": f"p-{i}", "name": f"Product {i}"} for i in range(offset, min(offset + per_page, 50))]


def db_count_products_with_filters(filters: dict) -> int:
    """Simulate total count query with filter application."""
    return 500
```

---

## Constraints

### MUST DO
- **Choose the correct pagination strategy**: cursor-based for >10K records or activity feeds where offset jumps would be slow; offset-based for admin dashboards and small collections (<10K) where page jumping is needed.
- **Validate all pagination parameters**: limit must have min=1 and max=100 (or domain-appropriate max); page must be ge=1; cursor must be valid base64. Reject invalid parameters with 400 Bad Request before executing any query.
- **Include has_more flag** in every cursor-based response — this is the authoritative signal for whether the client should request the next page. Never omit it.
- **Use operator-based filtering syntax** (`?field[operator]=value`) for range queries and exact-match defaults for simple equality filters. Document all supported operators per field.
- **Apply sort with dash-prefix convention**: `-field` means descending, `field` means ascending (or use the field's default direction). Return 400 for unknown sort fields with a list of valid options.

### MUST NOT DO
- **Use OFFSET on datasets >10K rows** — offset pagination degrades linearly with page number; the database must scan and discard all preceding rows. Use cursor-based instead.
- **Allow unlimited limit values** — always enforce a maximum (typically 100) to prevent runaway queries that overload the database and return excessive payload sizes.
- **Return total count with cursor-based pagination** — counting total rows in a large dataset is expensive and unnecessary for keyset pagination; has_more is sufficient.
- **Include unrequested fields in sparse fieldset responses** — if a client specifies `?fields=id,name`, never include `email` or `created_at` even if the database returned them.
- **Silently ignore invalid filter or sort parameters** — always return 400 with specific error messages listing valid options, never silently filter out unknown parameters.

---

## Output Template

When implementing or reviewing REST API pagination and filtering with this skill active, produce:

1. **Pagination Strategy Decision** — State whether cursor-based or offset-based pagination is used, with justification based on expected dataset size and client access patterns.

2. **Parameter Specification Table**:

   | Parameter | Type | Required? | Default | Min | Max | Description |
   |---|---|---|---|---|---|---|
   | `limit`/`per_page` | integer | no | 20 | 1 | 100 | Items per page |
   | `after` (cursor) | string | no | — | — | — | Opaque cursor token |
   | `page` | integer | no | 1 | 1 | — | Page number (offset mode) |
   | `sort` | string | no | `-created_at` | — | — | Sort fields with direction |

3. **Filter Operator Reference** — List every filterable field with its supported operators and value types:

   | Field | Type | Operators | Example |
   |---|---|---|---|
   | `status` | enum | `=`, `in` | `?status=pending` |
   | `price` | decimal | `gte`, `lte`, `gt`, `lt` | `?price[gte]=10` |

4. **Pagination Envelope Schema** — Show the complete response structure with all envelope fields and `_links`.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-resource-modeling` | Pagination applies to collection endpoints defined by the resource model; cursor-based pagination works best with stable sort keys in the resource design |
| `rest-api-caching` | Cached paginated responses need cache keys that incorporate pagination parameters — different pages produce different cache entries |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [RFC 5988 — Web Linking](https://www.rfc-editor.org/rfc/rfc5988.html) — Defines the Link HTTP header format used in offset-based pagination for prev/next/first/last navigation
- [JSON:API Pagination Specification](https://jsonapi.org/format/#fetching-pagination) — Industry-standard pagination envelope with `page[number]`, `page[size]`, and `links` objects
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm) — Relay-compliant cursor pagination using base64-encoded cursors, widely adopted as an industry alternative to URL-based pagination
- [PostgreSQL LIMIT/OPTIMIZATION](https://www.postgresql.org/docs/current/queries-limit.html) — How PostgreSQL handles LIMIT/OFFSET queries and optimization strategies for large offset values

> 📖 skill(local cache): rest-api-pagination-filtering
