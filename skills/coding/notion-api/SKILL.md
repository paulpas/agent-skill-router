---
name: notion-api
description: Integrates with Notion API to manage pages, databases, blocks, search,
  and comments using notion-client for Python with typed property access and pagination.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: notion api, notion pages, notion databases, notion-client, notion python,
    notion integration, notion blocks
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
  related-skills: coding-google-workspace-api, coding-atlassian-api, coding-airtable-api
------

# Notion API Integration

Integrates with the Notion API to programmatically create and update pages, query databases, manipulate blocks, perform searches, and manage comments using `notion-client` (the Python SDK for the official Notion API).

## TL;DR for Code Generation

- Use `notion_client.Client` with an integration token from the Notion Integrations dashboard
- Always call `databases.query()` with typed `filter` and `sorts` dicts — Notion requires structured queries
- Use `pages.update()` with `properties` dict for partial page updates
- Paginate with `has_more` / `next_cursor` — Notion returns max 100 results per page
- Append block children via `blocks.children.append()`, not through page update
- Handle `notion_client.errors.APIResponseError` for permission, validation, and rate-limit errors

## When to Use

Use this skill when:

- Creating, reading, updating, or archiving Notion pages
- Querying Notion databases with filters (text, date, select, multi-select, formula)
- Appending or modifying page content (blocks: paragraphs, headings, lists, code, embeds)
- Searching across pages and databases with full-text search
- Adding or listing page comments and discussions
- Synchronizing Notion databases with external data sources (CRM, spreadsheets, APIs)
- Building self-updating documentation portals backed by Notion

## When NOT to Use

- High-frequency real-time sync (Notion has rate limits — use webhook alternatives or queue updates)
- File storage (upload files to a dedicated store and embed links in Notion)
- Large-scale ETL (Notion query performance degrades beyond 10K+ records per database)
- Replacing a traditional relational database (Notion is designed for flexible content, not ACID compliance)
- Anonymous API access — Notion requires an integration token or OAuth for every request

## Core Workflow

1. **Create an Integration** — Go to `https://www.notion.so/my-integrations` and create a new internal integration. Copy the "Internal Integration Secret" token. **Checkpoint:** Verify the integration is shared with the target page or database (the "Connections" menu in Notion).

2. **Initialize the Client** — `client = Client(auth=os.environ["NOTION_TOKEN"])`. The client wraps `httpx` and handles authentication. **Checkpoint:** Call `client.search(query="")` with an empty query to list accessible pages.

3. **Query a Database** — Use `client.databases.query(database_id=..., filter=..., sorts=...)`. Build filters using the Notion filter structure: `{"property": "Status", "select": {"equals": "Done"}}`. **Checkpoint:** Verify the response contains `results` and parse `has_more` for pagination.

4. **Create or Update a Page** — Create with `client.pages.create(parent=..., properties=...)`. Update with `client.pages.update(page_id=..., properties=...)`. Map Python types to Notion property types. **Checkpoint:** Confirm the page URL is accessible in the browser.

5. **Manipulate Blocks** — Fetch blocks with `client.blocks.children.list(block_id=...)`. Append with `client.blocks.children.append(block_id=..., children=[...])`. Each child is a typed dict. **Checkpoint:** Verify the new block renders at the correct position in the page.

6. **Handle Errors** — Wrap in `try/except APIResponseError`. Check `error.code` for `unauthorized` (401), `restricted_resource` (403), `conflict_error` (409), `rate_limited` (429). **Checkpoint:** Log the `error.cursor` if available for debugging.

## Implementation Patterns

### Pattern 1: Query a Database with Filters

```python
import os
from notion_client import Client

notion = Client(auth=os.environ["NOTION_TOKEN"])

def query_completed_tasks(database_id: str, days: int = 7) -> list[dict]:
    """Fetch tasks completed within the last N days from a Notion database."""
    from datetime import datetime, timedelta

    cutoff = datetime.now() - timedelta(days=days)

    results = notion.databases.query(
        database_id=database_id,
        filter={
            "and": [
                {"property": "Status", "select": {"equals": "Done"}},
                {
                    "property": "Completed Date",
                    "date": {"on_or_after": cutoff.strftime("%Y-%m-%d")},
                },
            ]
        },
        sorts=[{"property": "Completed Date", "direction": "descending"}],
    )
    return results.get("results", [])
```

### Pattern 2: Create a Page in a Database

```python
def create_task_page(
    database_id: str,
    title: str,
    status: str = "To Do",
    priority: str | None = None,
) -> dict:
    """Add a new task page to a Notion database."""
    properties = {
        "Title": {"title": [{"text": {"content": title}}]},
        "Status": {"select": {"name": status}},
    }
    if priority:
        properties["Priority"] = {"select": {"name": priority}}

    return notion.pages.create(
        parent={"database_id": database_id},
        properties=properties,
    )

task = create_task_page("db123abc", "Fix login timeout", "In Progress", "High")
print(f"Created page: {task['url']}")
```

### Pattern 3: Append Blocks to a Page

```python
def append_code_block(page_id: str, code: str, language: str = "python") -> dict:
    """Append a code block to an existing Notion page."""
    return notion.blocks.children.append(
        block_id=page_id,
        children=[
            {
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"type": "text", "text": {"content": code}}],
                    "language": language,
                },
            }
        ],
    )

code_snippet = 'print("Hello, Notion!")\ndef deploy():\n    pass'
append_code_block("page456xyz", code_snippet, "python")
```

### Pattern 4: BAD vs GOOD — Property Updates

```python
# ❌ BAD — replaces entire properties dict, can delete other fields
notion.pages.update(page_id="abc", properties={"Status": {"select": {"name": "Done"}}})

# ✅ GOOD — fetches current, merges status update only
def update_page_status(page_id: str, status: str) -> dict:
    """Update only the Status property of a page."""
    return notion.pages.update(
        page_id=page_id,
        properties={"Status": {"select": {"name": status}}},
    )
```

### Pattern 5: BAD vs GOOD — Pagination

```python
# ❌ BAD — assumes single page, misses data
results = notion.databases.query(database_id="db123")
all_pages = results["results"]

# ✅ GOOD — paginates through all results
def query_all(database_id: str, **kwargs) -> list[dict]:
    """Paginate through all database results."""
    all_results = []
    start_cursor = None
    while True:
        response = notion.databases.query(
            database_id=database_id,
            start_cursor=start_cursor,
            **kwargs,
        )
        all_results.extend(response.get("results", []))
        if not response.get("has_more"):
            break
        start_cursor = response.get("next_cursor")
    return all_results
```

## Constraints

### MUST DO
- Use environment variables or secret managers for the Notion integration token
- Always paginate database queries — Notion caps at 100 items per response
- Share each integration with the specific pages/databases it needs (least privilege)
- Validate property names and types match the database schema before writing
- Use `rich_text` array structure (not a plain string) for text properties

### MUST NOT DO
- Hardcode page IDs or database IDs — use configuration or environment variables
- Poll Notion for changes (no webhook API exists yet — use a sync layer or poll sparingly)
- Assume property values always exist — check for `None` before accessing
- Use the token in client-side code where it can be extracted

## Output Template

Every integration function should expose:

1. **Client Initialization** — `Client(auth=token)` with token from environment
2. **Query or Command** — Typed database query or page update structure
3. **Pagination** — `has_more`/`next_cursor` loop for list endpoints
4. **Data Transformation** — Map Notion property types to Python types
5. **Error Handling** — `try/except APIResponseError` with `error.code` differentiation

## Related Skills

| Skill | Purpose |
|