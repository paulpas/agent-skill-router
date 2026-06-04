---
name: clickup-api
description: Integrates with ClickUp API v2 to manage tasks, lists, spaces, folders,
  goals, time tracking, dashboards, and teams using clickup-python-sdk.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: clickup api, clickup tasks, clickup lists, clickup python, clickup automation,
    clickup time tracking, clickup custom fields
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
  related-skills: coding-asana-api, coding-monday-api, coding-atlassian-api
---

# ClickUp API Integration

Integrates with the ClickUp API v2 to programmatically manage tasks, lists, spaces, folders, goals, time tracking entries, dashboards, tags, teams, and custom fields using `clickup-python-sdk`.

## TL;DR for Code Generation

- Use `ClickupClient.init(user_token=...)` from `clickup_python_sdk` for REST-based access
- ClickUp API is hierarchical: Teams → Spaces → Folders → Lists → Tasks
- Always specify `include_closed` and `subtasks` parameters for accurate task listing
- Use custom field APIs to read/write typed task metadata beyond standard fields
- Time tracking requires both start/stop time and duration — use ISO 8601 durations
- Handle `clickup_python_sdk.exceptions.ClickUpException` for API-level errors
- The API uses standard REST pagination with `page` and `limit` query params

## When to Use

Use this skill when:

- Creating, updating, assigning, closing, or deleting ClickUp tasks
- Managing list structure: custom fields, tags, statuses, priorities, and assignees
- Organizing spaces and folders for team/project hierarchy
- Tracking time entries against tasks with start, stop, and duration
- Creating dashboards and views for reporting
- Automating recurring task creation from templates
- Syncing ClickUp tasks with external calendars, CRMs, or databases

## When NOT to Use

- Real-time collaborative editing (ClickUp is a task/project manager, not a real-time doc editor)
- Large-scale data export (use ClickUp's CSV/Excel export or dedicated ETL integration)
- Anonymous or unauthenticated access (every request requires a valid API token)
- Replacing ClickUp Automations (use ClickUp's built-in automation rules where possible)

## Core Workflow

1. **Generate an API Token** — Go to `https://app.clickup.com/settings/apps` and create a Personal API Token. Copy the `pk_xxxxxxxx` token. **Checkpoint:** Verify the token with `client.get_teams()`.

2. **Initialize the Client** — `client = ClickupClient.init(user_token=os.environ["CLICKUP_TOKEN"])`. The SDK provides both sync and async client access. **Checkpoint:** Call `client.get_teams()` and print team names.

3. **Navigate Hierarchy** — From team → spaces → folders → lists → tasks. Use `client.get_spaces(team_id=...)`, `client.get_folders(space_id=...)`, `client.get_lists(folder_id=...)`, `client.get_tasks(list_id=...)`. **Checkpoint:** Confirm each level returns the expected resources.

4. **Create or Update Tasks** — Use `client.create_task(list_id=..., name=..., ...)` for new tasks. Use `client.update_task(task_id=..., ...)` for partial updates. Custom fields require `client.set_custom_field()`. **Checkpoint:** Re-fetch the task to confirm the mutation persisted.

5. **Track Time** — Use `client.start_timer(task_id=...)` and `client.stop_timer(task_id=...)` for time tracking. Create manual time entries with `client.create_time_entry()`. **Checkpoint:** Verify the time entry appears in the ClickUp task.

6. **Handle Errors** — Wrap API calls in `try/except ClickUpException`. Check the `status_code` for 401 (auth), 403 (permissions), 404 (not found), 429 (rate limit). **Checkpoint:** Log `response.json()` when available for API-side errors.

## Implementation Patterns

### Pattern 1: List Tasks with Custom Fields

```python
import os
from clickup_python_sdk.api import ClickupClient

client = ClickupClient.init(user_token=os.environ["CLICKUP_TOKEN"])

def list_open_tasks(list_id: str) -> list[dict]:
    """Fetch all open tasks from a ClickUp list."""
    tasks = client.get_tasks(
        list_id=list_id,
        include_closed=False,
        subtasks=True,
        order_by="due_date",
    )
    return tasks if tasks else []

tasks = list_open_tasks("123456789")
for task in tasks:
    print(f"Task: {task.name} | Due: {task.due_date} | Assignee: {task.assignees}")
```

### Pattern 2: Create a Task with Custom Fields

```python
def create_tracked_task(
    list_id: str,
    name: str,
    description: str,
    priority: int = 3,
    assignees: list[int] | None = None,
    due_date: int | None = None,
) -> dict:
    """Create a ClickUp task with priority, assignees, and due date."""
    params = {
        "name": name,
        "description": description,
        "priority": priority,  # 1=urgent, 2=high, 3=normal, 4=low
        "assignees": assignees or [],
    }
    if due_date:
        params["due_date"] = due_date  # Unix timestamp in milliseconds
    task = client.create_task(list_id=list_id, **params)
    return task

# Create a high-priority task due tomorrow (Unix ms)
import time
due = int((time.time() + 86400) * 1000)
task = create_tracked_task(
    list_id="123456789",
    name="Fix login timeout bug",
    description="Users report 502 errors on login after 60s idle.",
    priority=2,
    assignees=[12345],
    due_date=due,
)
print(f"Created task: {task.id} — {task.url}")
```

### Pattern 3: Time Tracking

```python
from datetime import datetime, timezone

def log_time_entry(
    task_id: str,
    duration_minutes: int,
    description: str,
    billable: bool = True,
) -> dict:
    """Log a manual time entry against a ClickUp task."""
    start_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    duration_ms = duration_minutes * 60 * 1000

    try:
        entry = client.create_time_entry(
            task_id=task_id,
            start=start_ms,
            duration=duration_ms,
            description=description,
            billable=billable,
        )
        return entry
    except Exception as e:
        print(f"Failed to log time: {e}")
        raise

log_time_entry("abc123_task", 45, "Code review and merge", billable=True)
```

### Pattern 4: BAD vs GOOD — Task Updates

```python
# ❌ BAD — fetches entire task object, modifies, re-posts
task = client.get_task(task_id="abc123")
task.name = "Updated Name"
task.description = "Updated desc"
client.update_task(task_id="abc123", name=task.name, description=task.description)

# ✅ GOOD — partial update with only changed fields
client.update_task(
    task_id="abc123",
    name="Updated Name",
    description="Updated desc",
)
```

### Pattern 5: BAD vs GOOD — Error Handling

```python
# ❌ BAD — bare except, loses API error details
try:
    client.get_task(task_id="nonexistent")
except Exception as e:
    print("Error:", e)

# ✅ GOOD — typed ClickUp exception
from clickup_python_sdk.exceptions import ClickUpException

def safe_get_task(task_id: str) -> dict | None:
    """Fetch a task with resilient error handling."""
    try:
        return client.get_task(task_id=task_id)
    except ClickUpException as e:
        status = getattr(e, "status_code", 0)
        if status == 404:
            print(f"Task {task_id} not found.")
            return None
        if status == 429:
            print("Rate limited — retry later.")
            return None
        print(f"ClickUp API error (status {status}): {e}")
        return None
```

## Constraints

### MUST DO
- Use environment variables for the API token — never hardcode it
- Always set `include_closed=False` unless you specifically need archived tasks
- Use Unix timestamps in milliseconds for all date/time parameters
- Paginate task lists with `page` and `limit` params (max 100 per page)
- Verify custom field IDs and types before writing values

### MUST NOT DO
- Assume task IDs are human-readable — they are opaque strings
- Poll tasks for real-time updates (use ClickUp webhooks instead)
- Create duplicate tagging structures — check existing tags first
- Use personal tokens in client-side or public applications

## Output Template

Every integration function should expose:

1. **Client Initialization** — `ClickupClient.init(user_token=...)` with token from env
2. **Hierarchy Navigation** — Team → Space → Folder → List → Task resolution
3. **Mutation** — Task creation/update with typed parameters
4. **Time Tracking** — Start/stop or manual time entry with ISO 8601 duration
5. **Error Handling** — `try/except ClickUpException` with status-specific recovery

## Related Skills

| Skill | Purpose |
|