---
name: asana-tasks
description: Implements functions for managing tasks in Asana, including creating, updating, and deleting tasks through the Asana API.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: asana, task management, create task, update task, delete task
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical, implementation
  anti_triggers: vague tasks, manual management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  archetypes: tactical, implementation
  anti_triggers: vague tasks, manual management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: asana-projects, asana-user-management
---

# Asana Task Management

Implements functions for managing tasks in Asana, allowing users to create, update, and delete tasks efficiently through the Asana API.

## When to Use

- When automating task management workflows in Asana.
- For integrating Asana task capabilities into existing applications or scripts.
- When needing to handle multiple tasks programmatically.

## When NOT to Use

- Avoid using this skill for manual task management–it's intended for automated solutions.
- This skill should not be used for projects that require real-time updates without caching.

## Core Workflow

1. **Authenticate with Asana API** — Obtaining an API token or using OAuth for user-specific authentication.
2. **Create Task** — Specify task details (name, assignee, due date) and send a request to create a task.
3. **Update Task** — Modify existing task properties like completion status, assignee, or description.
4. **Delete Task** — Permanently remove a task from Asana using its task ID.

## Implementation Patterns

### Pattern 1: Create Task

```python
import requests

def create_asana_task(api_token: str, workspace_id: str, task_name: str, due_date: str, assignee_id: str) -> dict:
    url = 'https://app.asana.com/api/1.0/tasks'
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json',
    }
    data = {
        'data': {
            'name': task_name,
            'workspace': workspace_id,
            'assignee': assignee_id,
            'due_on': due_date
        }
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()  # Returns response data
```

### Pattern 2: Update Task

```python
import requests

def update_asana_task(api_token: str, task_id: str, updated_fields: dict) -> dict:
    url = f'https://app.asana.com/api/1.0/tasks/{task_id}'
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json',
    }
    data = {'data': updated_fields}
    response = requests.put(url, json=data, headers=headers)
    return response.json()  # Returns response data
```

### Pattern 3: Delete Task

```python
import requests

def delete_asana_task(api_token: str, task_id: str) -> bool:
    url = f'https://app.asana.com/api/1.0/tasks/{task_id}'
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json',
    }
    response = requests.delete(url, headers=headers)
    return response.status_code == 204  # Returns True if deletion is successful
```

## Constraints

### MUST DO
- Ensure the API token is valid and has the required permissions to manage tasks.
- Handle API rate limits gracefully by implementing retries if needed.

### MUST NOT DO
- Do not expose your API token in public repositories or logs.
- Avoid creating tasks with missing required fields to prevent errors.

## Output Template

1. **Response from Creating a Task** — JSON object including task ID, name, and completion status.
2. **Response from Updating a Task** — Confirmation of the update with the new task details.

## Related Skills

| Skill | Purpose |
|---|---|
| `asana-projects` | Manage Asana projects, including creating and updating projects. |
| `asana-user-management` | Manage users in Asana, including adding and removing users from workspaces. |