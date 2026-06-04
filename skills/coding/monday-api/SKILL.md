---
name: monday-api
description: Integrates with monday.com API using GraphQL queries to manage boards,
  items, groups, columns, updates, workspaces, and webhooks via monday-api-python-sdk.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: monday api, monday.com, monday boards, monday items, monday graphql, monday
    python, monday automation
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
  related-skills: coding-asana-api, coding-clickup-api, coding-notion-api
---

# Monday.com API Integration

Integrates with the monday.com API to programmatically manage boards, items, groups, columns, updates, workspaces, tags, and webhooks using the official `monday-api-python-sdk` library with GraphQL queries.

## TL;DR for Code Generation

- Use `MondayClient(token=...)` from `monday_sdk` — monday.com uses GraphQL internally
- All operations use pre-built service modules: `client.boards`, `client.items`, `client.groups`, `client.columns`, `client.workspaces`
- monday.com has both rate limits and **complexity limits** — always monitor `complexity` in responses
- Set a board scope and item limit to stay within complexity budgets
- Use the `API-Version` header (e.g., `"2026-01"`) for quarterly API versioning
- Handle `MondayApiException` for structured error recovery

## When to Use

Use this skill when:

- Creating, updating, or archiving boards and items programmatically
- Managing item column values (text, date, status, numeric, people, file, etc.)
- Moving items between groups and boards
- Creating subitems and linking related items
- Setting up webhooks for item creation, update, and deletion events
- Automating board creation from templates for recurring projects
- Building custom dashboards or exporting board data to external systems

## When NOT to Use

- Real-time collaborative document editing (monday.com is a work OS, not a document editor)
- Large-scale ETL with millions of records (use mondayDB or export API instead)
- High-frequency polling (use webhooks — complexity budget makes polling expensive)
- Anonymous or unauthenticated access — every request requires an API token

## Core Workflow

1. **Get an API Token** — Navigate to `https://{subdomain}.monday.com/apps` → "Developer" → "API" → "API Tokens" and generate a personal token. **Checkpoint:** Verify the token works with `client.boards.query(limit=1)`.

2. **Initialize the Client** — `client = MondayClient(token=os.environ["MONDAY_TOKEN"])`. Optionally set `debug_mode=True` during development to see raw GraphQL queries. **Checkpoint:** Call `client.workspaces.query()` to confirm connectivity.

3. **Query Boards and Items** — Use `client.boards.query()` with `board_ids` or filters. Fetch items with `client.items.query()`. Always specify the `fields` parameter to limit the returned data. **Checkpoint:** Verify the response contains the expected field values.

4. **Mutate Data** — Create items with `client.items.create_item()`, update column values with `client.items.change_column_values()`, move items with `client.items.move_to_board()`. **Checkpoint:** Re-query the item to confirm the mutation persisted.

5. **Monitor Complexity** — Each response includes a `complexity` field. Keep per-query complexity below your tier's limit. If you hit `ComplexityLimitExceeded`, wait and retry with smaller queries. **Checkpoint:** Log `query_complexity` after each operation.

6. **Handle Errors** — Wrap in `try/except MondayApiException` for API errors, `ComplexityLimitExceeded` for complexity limits. **Checkpoint:** Log the `status_code` and `response_body` for debugging.

## Implementation Patterns

### Pattern 1: Query Boards and Items

```python
import os
from monday_sdk import MondayClient

client = MondayClient(token=os.environ["MONDAY_TOKEN"])

def get_board_items(board_id: int, limit: int = 50) -> list[dict]:
    """Fetch items from a monday.com board with specified fields."""
    response = client.boards.query(
        board_ids=board_id,
        items_page_limit=limit,
        fields="id name state items { id name column_values { id text value } }",
    )
    boards = response.get("data", {}).get("boards", [])
    if not boards:
        return []
    return boards[0].get("items", [])

items = get_board_items(987654321)
for item in items:
    print(f"Item: {item['name']} (ID: {item['id']})")
```

### Pattern 2: Create an Item with Column Values

```python
from datetime import datetime

def create_tracking_item(
    board_id: int,
    group_id: str,
    item_name: str,
    status: str = "In Progress",
) -> dict:
    """Create an item on a monday.com board with initial column values."""
    response = client.items.create_item(
        board_id=board_id,
        group_id=group_id,
        item_name=item_name,
        column_values={
            "status": {"label": status},
            "date": {"date": datetime.now().strftime("%Y-%m-%d")},
            "text": "Created via API automation",
        },
    )
    return response.get("data", {})

result = create_tracking_item(
    board_id=987654321,
    group_id="group_abc123",
    item_name="Deploy v2.5.0",
    status="Working on it",
)
print(f"Created item: {result}")
```

### Pattern 3: Update Multiple Column Values

```python
def complete_item(item_id: int, completion_note: str) -> dict:
    """Mark an item as done and add a completion note."""
    response = client.items.change_multiple_column_values(
        item_id=item_id,
        column_values={
            "status": {"label": "Done"},
            "text": completion_note,
        },
    )
    return response

complete_item(123456789, "Deployment completed successfully on 2026-05-23.")
```

### Pattern 4: BAD vs GOOD — Complexity Management

```python
# ❌ BAD — no complexity monitoring, may exceed budget silently
response = client.boards.query(board_ids=123, items_page_limit=500)
items = response["data"]["boards"][0]["items"]

# ✅ GOOD — monitors complexity and limits query scope
def safe_query_boards(board_id: int, complexity_limit: int = 10_000_000) -> list[dict]:
    """Query a board with explicit complexity budget tracking."""
    response = client.boards.query(
        board_ids=board_id,
        items_page_limit=25,  # smaller page = lower complexity
        fields="id name items (limit 25) { id name }",
    )
    complexity = response.get("complexity", {})
    query_complexity = complexity.get("after", 0)
    if query_complexity > complexity_limit:
        print(f"Warning: query complexity {query_complexity} exceeds limit {complexity_limit}")
    if "errors" in response:
        for err in response["errors"]:
            if "ComplexityLimitExceeded" in str(err):
                print("Complexity limit hit — reduce page size or query scope")
                return []
    return response.get("data", {}).get("boards", [])
```

### Pattern 5: BAD vs GOOD — Error Handling

```python
# ❌ BAD — catches all exceptions, loses error context
try:
    client.items.create_item(board_id=0, group_id="x", item_name="test")
except Exception as e:
    print("Failed:", e)

# ✅ GOOD — typed exception handling
from monday_sdk import MondayApiException

def create_item_safe(board_id: int, group_id: str, item_name: str) -> dict | None:
    """Create an item with typed error handling."""
    try:
        response = client.items.create_item(
            board_id=board_id, group_id=group_id, item_name=item_name
        )
        if "errors" in response:
            print(f"API errors: {response['errors']}")
            return None
        return response
    except MondayApiException as e:
        print(f"monday.com API error (status {e.status_code}): {e}")
        return None
```

## Constraints

### MUST DO
- Monitor `complexity` in every response — stay below your plan's complexity budget
- Limit `items_page_limit` to 25-50 for regular queries to keep complexity low
- Use webhooks for change notifications instead of polling
- Specify explicit `fields` parameter — wildcard fields (`items { * }`) waste complexity
- Use the `API-Version` header to target a specific quarterly API version

### MUST NOT DO
- Exceed the complexity budget — reduce page size or use more specific queries
- Hardcode board IDs or group IDs — discover them via API or configuration
- Assume GraphQL field availability across API versions — version-lock your requests
- Poll items for real-time updates when webhooks are available
- Skip error response parsing — monday.com returns errors in the GraphQL response body

## Output Template

Every integration function should expose:

1. **Client Initialization** — `MondayClient(token=...)` with token from env
2. **Resource Method** — `client.boards.*`, `client.items.*`, `client.groups.*`
3. **Field Specification** — GraphQL field strings for sparse responses
4. **Mutation** — Typed column values for item creation/updates
5. **Error Handling** — `try/except MondayApiException` with complexity monitoring

## Related Skills

| Skill | Purpose |
|