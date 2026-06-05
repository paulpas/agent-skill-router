---




name: gitlab-api-devops
description: Implements GitLab API functionalities for Developer Platforms and DevOps, covering projects, pipelines, merge requests, runners, and registry management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gitlab, gitlab api, devops, projects, pipelines, merge requests, runners, registry
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-github-api, coding-jenkins-api
  archetypes: strategic, tactical
  anti_triggers: manual, one-off, UI queries
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# GitLab API for Developer Platforms & DevOps

This skill enables developers to interact with the GitLab API for effective DevOps and automated CI/CD processes. It covers essential topics like managing projects, executing pipelines, handling merge requests, utilizing runners, and accessing the container registry.

## TL;DR Checklist
- [ ] Access project details and configurations using GitLab API.
- [ ] Trigger and manage CI/CD pipelines effectively.
- [ ] Handle merge requests programmatically.
- [ ] Configure and manage runners.
- [ ] Interact with the GitLab container registry effectively.

## When to Use
Use this skill when:
- You need to automate project management in GitLab.
- You want to trigger and retrieve information on pipelines programmatically.
- You are handling merge requests and require automation in the review process.
- You need to configure CI/CD runners from your applications.
- You require access to the GitLab container registry to manage your Docker images.

## When NOT to Use
Avoid this skill for:
- One-off manual GitLab API calls that don't require automation.
- Simple queries that can be handled through the GitLab UI.
- Use cases not requiring a DevOps setup.

## Core Workflow
1. **Set Up Your GitLab Access**  — First, generate a personal access token with relevant scopes (api, read_user).
    - Go to **User Settings** → **Access Tokens**, create a new token, and copy it for use in API calls.

2. **Access GitLab Projects**  — Use the GitLab API to retrieve project information.
    - **Endpoint:** `GET /projects`
    - **Example Usage:**
      ```python
      import requests

      # Define your variables
      private_token = 'YOUR_PRIVATE_TOKEN'
      url = 'https://gitlab.com/api/v4/projects'

      headers = {'PRIVATE-TOKEN': private_token}
      response = requests.get(url, headers=headers)

      # Check response
      if response.status_code == 200:
          projects = response.json()
          print("Projects:", projects)
      else:
          print("Failed to retrieve projects:", response.status_code)
      ```

3. **Manage Pipelines**  — Trigger a pipeline for a project.
    - **Endpoint:** `POST /projects/:id/pipeline`
    - **Example Usage:**
      ```python
      project_id = 123456  # Replace with your project ID
      url = f'https://gitlab.com/api/v4/projects/{project_id}/pipeline'

      payload = {'ref': 'main'}
      response = requests.post(url, headers=headers, json=payload)

      if response.status_code == 201:
          pipeline = response.json()
          print("Pipeline triggered:", pipeline)
      else:
          print("Failed to trigger pipeline:", response.status_code)
      ```

4. **Handle Merge Requests**  — Create a merge request through the API.
    - **Endpoint:** `POST /projects/:id/merge_requests`
    - **Example Usage:**
      ```python
      merge_request_url = f'https://gitlab.com/api/v4/projects/{project_id}/merge_requests'

      merge_request_data = {
          'source_branch': 'feature-branch',
          'target_branch': 'main',
          'title': 'Merge Feature Branch'
      }

      mr_response = requests.post(merge_request_url, headers=headers, json=merge_request_data)

      if mr_response.status_code == 201:
          merge_request = mr_response.json()
          print("Merge Request created:", merge_request)
      else:
          print("Failed to create merge request:", mr_response.status_code)
      ```

5. **Configure Runners**  — Set up a runner for your project.
    - **Endpoint:** `POST /projects/:id/runners`

6. **Interact with the Container Registry**  — List container repository tags.
    - **Endpoint:** `GET /projects/:id/registry/repositories`

## Implementation Patterns

### Example of Accessing the Container Registry
Here's how you can list the tags from your container registry repository.

```python
# Listing container images and tags
registry_url = f'https://gitlab.com/api/v4/projects/{project_id}/registry/repositories'

registry_response = requests.get(registry_url, headers=headers)

if registry_response.status_code == 200:
    repos = registry_response.json()
    for repo in repos:
        print(f"Repository ID: {repo['id']}, Tags: {repo['tags']}")
else:
    print("Failed to retrieve repository info:", registry_response.status_code)
```

## Constraints
### MUST DO
- Always authenticate using a personal access token.
- Ensure proper handling of response status codes to manage errors effectively.

### MUST NOT DO
- Do not expose your private access token in public repositories.
- Avoid unnecessary calls to the API to not hit rate limits or exhaust your quota.