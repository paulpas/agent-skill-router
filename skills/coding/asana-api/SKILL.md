---




name: asana-api
description: Integrates with Asana API to manage tasks, projects, workspaces, goals,
  portfolios, and webhooks using the official asana Python SDK for work management
  automation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: asana api, asana python, asana tasks, asana projects, asana webhooks,
    asana sdk, asana automation
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
  related-skills: coding-clickup-api, coding-monday-api, coding-atlassian-api




---





# Asana API Integration

Integrates with the Asana API to programmatically manage tasks, projects, sections, portfolios, goals, workspaces, tags, time tracking, and webhooks using the official `asana` Python SDK.

## TL;DR for Code Generation

- Use `asana.Client.access_token()` with a personal access token for simple auth, or `asana.Client.oauth()` for OAuth 2.0
- All API methods are organized by resource: `client.tasks`, `client.projects`, `client.sections`, etc.
- Always specify `opt_fields` to control which fields are returned; Asana returns minimal fields by default
- Paginate with `?limit=` and `offset` — the SDK provides `.items` generators for transparent iteration
- Use `client.webhooks.create()` for push-based change notifications instead of polling
- Handle `asana.error.AsanaError` for typed error handling with status codes

## When to Use

Use this skill when:

- Creating, updating, assigning, or completing Asana tasks programmatically
- Managing project structure: sections, milestones, portfolios, and custom fields
- Creating and tracking goals with progress metrics
- Setting up webhooks to react to task changes in real time
- Migrating data from other tools into Asana
- Generating reports across projects and workspaces
- Automating recurring task creation and project template duplication

## When NOT to Use

- Storing large binary files (use cloud storage and attach links in task descriptions)
- Real-time collaborative editing (Asana is a task manager, not a document editor)
- High-frequency polling (use webhooks instead — Asana rate limits REST API calls)
- Running complex calculations on task data (export to a spreadsheet tool instead)

## Core Workflow

1. **Generate an Access Token** — Navigate to `https://app.asana.com/0/developer-console` and create a Personal Access Token. For multi-user apps, register an OAuth 2.0 app. **Checkpoint:** Verify the token with `client.users.get_user("me")`.

2. **Initialize the Client** — `client = asana.Client.access_token(token)`. Set `client.options["client_name"]` to identify your integration. **Checkpoint:** Call `client.users.get_user("me")` and print the name.

3. **Choose Resources and Fields** — Asana returns compact objects by default. Always specify `opt_fields` like `opt_fields="name,completed_at,assignee.name,due_on"` to include related data. **Checkpoint:** Verify the response dict includes the expected keys.

4. **Paginate Through Collections** — Use the auto-pagination generators: `client.tasks.find_all(project=project_gid, iterator=True)` yields tasks without manual offset tracking. **Checkpoint:** Confirm that calling `next()` on the iterator returns the expected item shape.

5. **Perform CRUD Operations** — Create tasks with `client.tasks.create_in_workspace()`, update with `client.tasks.update()`, comment with `client.tasks.add_comment()`. Each returns the affected object. **Checkpoint:** Re-fetch the task to verify the update persisted.

6. **Handle Errors** — Wrap in `try/except asana.error.AsanaError`. Check `e.status` for 401 (auth), 403 (forbidden), 404 (not found), 429 (rate limit). **Checkpoint:** Log `e.message` and the associated `e.response` body for debugging.

## Implementation Patterns

### Pattern 1: Create and Assign a Task

```python
import os
import asana
from asana.error import AsanaError

client = asana.Client.access_token(os.environ["ASANA_PAT"])
client.options["client_name"] = "deployment-automation"

def create_deployment_task(
    project_gid: str,
    title: str,
    assignee_gid: str,
    due_on: str,
) -> dict | None:
    """Create a deployment tracking task in an Asana project."""
    try:
        task = client.tasks.create_in_workspace(
            workspace_gid="123456789",
            params={
                "name": title,
                "assignee": assignee_gid,
                "projects": [project_gid],
                "due_on": due_on,
                "notes": "Automatically created by deployment pipeline.",
            },
        )
        return task
    except AsanaError as e:
        print(f"Failed to create task: {e.status} — {e.message}")
        return None

task = create_deployment_task(
    project_gid="1200000000001234",
    title="Deploy v2.5.0 to production",
    assignee_gid="1200000000005678",
    due_on="2026-06-01",
)
print(f"Created task: https://app.asana.com/0/0/{task['gid']}")
```

### Pattern 2: List Tasks with Custom Fields

```python
def list_project_tasks(project_gid: str) -> list[dict]:
    """List all tasks in a project with their custom field values."""
    tasks = []
    try:
        for task in client.tasks.find_all(
            project=project_gid,
            iterator=True,
            opt_fields="name,completed_at,assignee.name,custom_fields.name,custom_fields.display_value",
        ):
            tasks.append(task)
    except AsanaError as e:
        print(f"Error fetching tasks: {e}")
    return tasks

tasks = list_project_tasks("1200000000001234")
for t in tasks:
    cf_values = {
        cf["name"]: cf["display_value"]
        for cf in t.get("custom_fields", [])
    }
    print(f"{t['name']} — assignee: {t.get('assignee', {}).get('name', 'unassigned')} — {cf_values}")
```

### Pattern 3: Add a Comment to a Task

```python
def add_task_comment(task_gid: str, comment_text: str) -> dict:
    """Append a comment to an Asana task."""
    return client.tasks.add_comment(
        task_gid=task_gid,
        params={"text": comment_text},
    )

add_task_comment("1200000000009999", "Deployment verified — all checks passed.")
```

### Pattern 4: Create a Webhook

```python
def register_webhook(resource_gid: str, target_url: str) -> dict:
    """Register a webhook to receive change events for a project."""
    webhook = client.webhooks.create(
        resource=resource_gid,
        target=target_url,
    )
    print(f"Webhook created: {webhook['gid']}")
    print(f"Respond with 200 OK to {target_url}?verify={webhook['gid']}")
    return webhook

# Example: receive notifications for all task changes in a project
register_webhook("1200000000001234", "https://my-app.com/webhooks/asana")
```

### Pattern 5: BAD vs GOOD — Error Handling

```python
# ❌ BAD — bare except, no status differentiation
try:
    task = client.tasks.create_in_workspace(workspace_gid="123", params={"name": "Bad"})
except Exception as e:
    print("Something went wrong:", e)

# ✅ GOOD — typed AsanaError with status-based recovery
from asana.error import AsanaError, RateLimitError, NotFoundError

def safe_create_task(workspace_gid: str, params: dict) -> dict | None:
    """Create a task with resilient error handling."""
    try:
        return client.tasks.create_in_workspace(workspace_gid=workspace_gid, params=params)
    except RateLimitError as e:
        retry_after = int(e.response.headers.get("Retry-After", "5"))
        print(f"Rate limited — retry after {retry_after}s")
        return None
    except NotFoundError:
        print(f"Workspace {workspace_gid} not found — check permissions")
        return None
    except AsanaError as e:
        print(f"Asana API error {e.status}: {e.message}")
        return None
```

## Constraints

### MUST DO
- Always specify `opt_fields` — Asana returns minimal fields by default
- Use iterator-based pagination (`iterator=True`) for large collections
- Register webhooks for event-driven integrations instead of polling
- Use workspace-level operations when tasks span multiple projects
- Store the PAT in a secrets manager or environment variable

### MUST NOT DO
- Hardcode workspace or project GIDs — discover them via API or configuration
- Assume task GIDs are sequential — they are random strings
- Poll for task updates when webhooks are available
- Use `opt_fields` without validating the field names against the API docs

## Output Template

Every integration function should expose:

1. **Client Setup** — `Client.access_token()` with token from env
2. **Resource Method** — `client.tasks.*`, `client.projects.*`, etc.
3. **Field Selection** — `opt_fields` parameter for sparse responses
4. **Pagination** — `iterator=True` generator or manual offset loop
5. **Error Handling** — `try/except AsanaError` with status-specific logic

## Related Skills

| Skill | Purpose |
|