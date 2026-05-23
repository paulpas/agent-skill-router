---
name: airtable-api
description: Integrates with Airtable API to manage bases, tables, records, attachments,
  webhooks, and automations using pyairtable for Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: airtable api, pyairtable, airtable records, airtable bases, airtable python,
    airtable automation, airtable webhooks
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
  related-skills: coding-google-workspace-api, coding-notion-api, coding-asana-api
------

# Airtable API Integration

Integrates with the Airtable API to programmatically manage bases, tables, records, attachments, webhooks, comments, and automations using `pyairtable` (formerly `airtable-python-wrapper`).

## TL;DR for Code Generation

- Use `pyairtable.Api` for multiple-base access, `pyairtable.Base` for a single base, or `pyairtable.Table` for direct table operations
- Personal Access Tokens (PATs) are preferred over API keys — they support scoped permissions
- Airtable returns max 100 records per page — paginate with `offset` parameter
- Use the formula query syntax (Airtable Formula) for server-side record filtering
- Attachments are managed via the `"attachments"` field type with URL uploads
- Handle `pyairtable.exceptions.AirtableError` for API-level errors

## When to Use

Use this skill when:

- Creating, reading, updating, or deleting Airtable records
- Querying tables with formulas, sorts, and field filters
- Uploading attachments to attachment-type fields from URLs
- Managing bases, table schema, and field definitions
- Setting up webhooks for real-time record change notifications
- Syncing Airtable with external databases, CRMs, or spreadsheets
- Building automation triggers that react to Airtable changes

## When NOT to Use

- High-volume transactional workloads (Airtable has rate limits of 5 req/s per base)
- Large-scale data warehousing (use a real database — Airtable caps at 500K records per base)
- Relational data requiring complex joins (Airtable supports linked records, not SQL JOINs)
- Binary file storage (upload files to S3/GCS and link to Airtable via URL)

## Core Workflow

1. **Generate a Personal Access Token** — Go to `https://airtable.com/create/tokens` and create a PAT with scopes for `data.records:read`, `data.records:write`, `schema.bases:read`, etc. **Checkpoint:** Verify the token with `Api().who_am_i()`.

2. **Initialize the API Client** — Use `api = pyairtable.Api(os.environ["AIRTABLE_TOKEN"])` for multi-base access, or `Table(api_key, base_id, table_name)` for direct access. **Checkpoint:** Call `api.get_base(base_id)` to verify connectivity.

3. **Choose Table and Query** — Construct an `Table` object. Use `table.all(formula=...)` for filtered queries, `table.get(record_id)` for single records. Apply `sort` and `fields` params. **Checkpoint:** Run a small query with `max_records=1` to validate the formula syntax.

4. **Pagination** — Use `table.all()` with `page_size=100` (max). The method handles pagination internally with the `offset` token. For manual control, iterate with `iterate()` or `page_size` params. **Checkpoint:** Verify the total record count matches expectations.

5. **CRUD Operations** — Create records with `table.create(fields_dict)`, update with `table.update(record_id, fields_dict)`, delete with `table.delete(record_id)`. Use `table.batch_create()` and `table.batch_update()` for bulk operations (max 10 per batch). **Checkpoint:** Re-fetch the record to confirm value persistence.

6. **Handle Errors** — Wrap in `try/except AirtableError`. Check `e.status` for 401 (auth), 403 (forbidden), 404 (not found), 422 (validation error), 429 (rate limit). **Checkpoint:** For 429, parse `Retry-After` header and implement backoff.

## Implementation Patterns

### Pattern 1: Query Records with Formula

```python
import os
from pyairtable import Api

api = Api(os.environ["AIRTABLE_TOKEN"])

def find_records_by_status(base_id: str, table_name: str, status: str) -> list[dict]:
    """Find all records in a table matching a status."""
    table = api.table(base_id, table_name)
    records = table.all(
        formula=f"{{Status}} = '{status}'",
        sort=["CreatedAt desc"],
        fields=["Name", "Status", "Assignee", "DueDate"],
    )
    return records

tasks = find_records_by_status("appABC123", "Tasks", "In Progress")
for record in tasks:
    fields = record["fields"]
    print(f"{fields.get('Name')} — due: {fields.get('DueDate')}")
```

### Pattern 2: Create and Update Records

```python
def create_task_record(
    base_id: str,
    table_name: str,
    name: str,
    status: str = "To Do",
    assignee: str | None = None,
    priority: str = "Medium",
) -> dict:
    """Create a new task record in an Airtable table."""
    table = api.table(base_id, table_name)
    fields = {
        "Name": name,
        "Status": status,
        "Priority": priority,
    }
    if assignee:
        fields["Assignee"] = [assignee]  # linked record field expects array of record IDs
    return table.create(fields)

def update_task_status(base_id: str, table_name: str, record_id: str, status: str) -> dict:
    """Update only the status field of a record."""
    table = api.table(base_id, table_name)
    return table.update(record_id, {"Status": status})

record = create_task_record(
    "appABC123", "Tasks",
    "Review Q1 report",
    status="To Do",
    priority="High",
)
print(f"Created record: {record['id']}")

update_task_status("appABC123", "Tasks", record["id"], "In Progress")
```

### Pattern 3: Batch Update Records

```python
def batch_update_assignments(
    base_id: str,
    table_name: str,
    updates: list[tuple[str, str]],
) -> list[dict]:
    """Batch update multiple records (max 10 at a time)."""
    table = api.table(base_id, table_name)
    records = [
        {"id": record_id, "fields": {"Status": new_status}}
        for record_id, new_status in updates[:10]
    ]
    return table.batch_update(records)

# Example: mark 5 tasks as done in a single batch call
batch = [
    ("recABC001", "Done"),
    ("recABC002", "Done"),
    ("recABC003", "In Progress"),
]
batch_update_assignments("appABC123", "Tasks", batch)
```

### Pattern 4: Upload Attachment from URL

```python
def attach_file_to_record(
    base_id: str,
    table_name: str,
    record_id: str,
    field_name: str,
    url: str,
    filename: str | None = None,
) -> dict:
    """Upload an attachment to a record's attachment field from a URL."""
    table = api.table(base_id, table_name)
    return table.update(
        record_id,
        {
            field_name: [
                {
                    "url": url,
                    "filename": filename or url.split("/")[-1],
                }
            ]
        },
    )

attach_file_to_record(
    "appABC123", "Tasks", "recABC001",
    "Attachments",
    "https://example.com/report-q1.pdf",
    "Q1-Report.pdf",
)
```

### Pattern 5: BAD vs GOOD — Error Handling

```python
# ❌ BAD — catches all exceptions, can mask validation errors
try:
    table.create({"Name": "Bad task", "Status": "InvalidStatus"})
except Exception as e:
    print("Failed:", e)

# ✅ GOOD — typed AirtableError with validation insight
from pyairtable.exceptions import AirtableError

def safe_create_record(table, fields: dict) -> dict | None:
    """Create a record with typed error recovery."""
    try:
        return table.create(fields)
    except AirtableError as e:
        status = e.status if hasattr(e, "status") else 0
        if status == 422:
            print(f"Validation error — check field names and types: {e}")
        elif status == 429:
            print("Rate limited — consider batching or reducing frequency.")
        else:
            print(f"Airtable error {status}: {e}")
        return None
```

## Constraints

### MUST DO
- Use Personal Access Tokens (PATs) with scoped permissions — avoid legacy API keys
- Always paginate with `table.all()` — it handles `offset` internally
- Batch writes with `batch_create()` and `batch_update()` (max 10 per batch)
- Use Airtable Formula syntax for server-side filtering
- Validate field names and types against the table schema before writing

### MUST NOT DO
- Exceed 5 requests per second per base — implement client-side rate limiting
- Assume field values are always present — check for `None` before accessing
- Use linked record IDs from different bases (they are base-scoped)
- Store PATs in client-side code or version control

## Output Template

Every integration function should expose:

1. **API Initialization** — `Api(token)` or `Table(token, base_id, table_name)` from env
2. **Query** — Formula-based `table.all()` with sort and field selections
3. **Pagination** — Built-in via `table.all()` or manual `offset` for custom logic
4. **Mutation** — `table.create()`, `table.update()`, `table.batch_*()` operations
5. **Error Handling** — `try/except AirtableError` with status-specific logic

## Related Skills

| Skill | Purpose |
|