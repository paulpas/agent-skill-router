---
name: asana-projects
license: MIT
compatibility: opencode
metadata:
  archetypes: task management, project management
  anti_triggers: manual management, overcomplication
  response_profile:
      verbosity: medium
      directive_strength: high

  version: "1.0.0"
  domain: coding
  triggers: asana, project management, tasks, team collaboration, API integration
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding/asana-tasks
---

# Asana Projects Management

Implements functionalities for managing projects and tasks within Asana using its API.

## TL;DR Checklist
- [ ] Use structured logging for API calls.
- [ ] Ensure compliance with Asana’s API rate limits.
- [ ] Handle project creation with detailed task descriptions and stakeholders.
- [ ] Regularly update task statuses to reflect progress.
- [ ] Utilize section and project IDs for accurate task assignments.

## When to Use
Use this skill when:
- You need to create and manage Asana projects programmatically.
- Assigning tasks to members and tracking their progress is essential.
- Integrating Asana with another tool for task management or reporting.

## When NOT to Use
Avoid this skill for:
- Managing extremely large teams with complex permissions.
- Non-API-based Asana integrations (use their native UI for one-off tasks).

## Core Workflow
1. **Initialize the API Client**: Set up your connection to Asana using your API key.
2. **Create a Project**: Use the Asana API to create a new project by providing necessary metadata (name, workspace).
3. **Manage Tasks**: Add tasks to your projects, ensuring each task has detailed descriptions and due dates.
4. **Update Task Statuses**: Regularly check and update task statuses based on team progress and deadlines.
5. **Retrieve Task Data**: Use the API to fetch task updates and log this information.

## Implementation Patterns
### Pattern 1: Project Creation
```python
import requests

def create_project(workspace_id: str, project_name: str, api_token: str):
    url = 'https://app.asana.com/api/1.0/projects'
    headers = {'Authorization': f'Bearer {api_token}'}
    data = {'data': {'name': project_name, 'workspace': workspace_id}}
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

### Pattern 2: Adding Tasks to a Project
```python
import requests

def add_task(project_id: str, task_name: str, api_token: str):
    url = f'https://app.asana.com/api/1.0/tasks'
    headers = {'Authorization': f'Bearer {api_token}'}
    data = {'data': {'name': task_name, 'projects': [project_id]}}
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

## Constraints
### MUST DO
- Always implement error handling for API responses.
- Validate input for task names and project details to prevent errors.
- Regularly monitor API limits and handle rate-limiting errors gracefully.

### MUST NOT DO
- Do not hardcode sensitive information such as API tokens directly in scripts.
- Avoid overwhelming the API with successive calls in a short period.

## Output Template
When utilizing this skill, the output should include structured responses detailing project creation, task assignments, and overall team progress tracking.