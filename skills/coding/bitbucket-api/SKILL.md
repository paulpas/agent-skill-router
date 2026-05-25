---
name: bitbucket-api
description: Integrates with Bitbucket Cloud and Bitbucket Data Center REST APIs via
  atlassian-python-api to manage repositories, pull requests, pipelines, webhooks,
  and workspace settings.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: bitbucket api, atlassian-python-api, bitbucket cloud, bitbucket pipelines,
    pull request bitbucket, bitbucket webhooks, manage bitbucket repos, bitbucket
    data center
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
  related-skills: coding-github-api, coding-gitlab-api, coding-jenkins-api
------
# Bitbucket API & atlassian-python-api Integration

Integrates with Bitbucket Cloud (API v2) and Bitbucket Server/Data Center REST APIs using the `atlassian-python-api` library to manage repositories, pull requests, pipelines, branch restrictions, webhooks, and workspace administration.

## TL;DR for Code Generation

- [ ] Use `Cloud(username, password)` for Bitbucket Cloud or `Bitbucket(url, username, password)` for Bitbucket Server/Data Center
- [ ] Bitbucket Cloud provides an object-oriented API (`cloud.workspaces.each()`, `workspace.repositories.each()`)
- [ ] Bitbucket Server uses a functional API (`bitbucket.project_list()`, `bitbucket.get_repo()`)
- [ ] Authenticate with app passwords for Cloud (not your main account password)
- [ ] Pass `sort="-created_on"` to pipeline list calls to get recent builds first
- [ ] Handle `HTTPError` from the `requests` library for API error responses

---

## When to Use

Use this skill when:

- Automating repository creation, project administration, or branch permission management
- Building pull request workflows with automatic merge, approval, or CI triggers
- Querying Bitbucket Pipelines status, logs, and deployment results
- Managing webhooks for repository events (push, PR, pipeline status)
- Administering workspace or project-level user permissions and group access
- Creating or updating branch restrictions and default reviewers

---

## When NOT to Use

Avoid this skill for:

- Git clone/push/fetch operations (use `gitpython` or raw `git` CLI)
- Full CI/CD pipeline YAML authoring (use the Bitbucket Pipelines editor or `bitbucket-pipelines.yml`)
- Jira or Confluence operations (use the same `atlassian-python-api` but with `Jira` or `Confluence` classes)

---

## Core Workflow

1. **Authenticate — Cloud vs. Server** — For Cloud, use `Cloud(url="https://api.bitbucket.org", username, password)` with an app password. For Server, use `Bitbucket(url, username, password)`. **Checkpoint:** List workspaces or projects to confirm connectivity.

2. **Resolve Workspace and Repository** — For Cloud: `workspace = cloud.workspaces.get(slug)` then `repo = workspace.repositories.get(slug)`. For Server: `bitbucket.get_repo(project_key, repo_slug)`. **Checkpoint:** Verify the repository name matches and the `uuid` or `id` is present.

3. **Execute Operation** — Call the appropriate method: create a pull request, trigger a pipeline, add a webhook, or modify branch restrictions. **Checkpoint:** Confirm the response includes the expected object ID or URL.

4. **Handle Pagination** — Methods returning generators (`.each()`) handle pagination automatically. For raw REST, pass `pagelen=100` and handle the `next` URL from responses. **Checkpoint:** Ensure all pages are consumed — Cloud defaults to 50 items per page.

5. **Error Handling** — Catch `requests.exceptions.HTTPError` and inspect the status code. 401=bad auth, 403=insufficient permissions, 404=not found. **Checkpoint:** Log the response body for 400-level errors to see validation messages.

---

## Implementation Patterns

### Pattern 1: Bitbucket Cloud — Pull Request Management

```python
import os
from atlassian.bitbucket import Cloud
from requests.exceptions import HTTPError


def create_pull_request(
    workspace_slug: str,
    repo_slug: str,
    source_branch: str,
    destination_branch: str,
    title: str,
    description: str = "",
    close_source_branch: bool = True,
) -> dict:
    """Create a pull request in Bitbucket Cloud.

    Args:
        workspace_slug: Workspace identifier (e.g., "my-company").
        repo_slug: Repository name (e.g., "backend-api").
        source_branch: Feature branch to merge from.
        destination_branch: Target branch to merge into.
        title: Pull request title.
        description: Pull request description in Markdown.
        close_source_branch: Auto-close source branch after merge.

    Returns:
        Dict with PR ID, links, and state.

    Raises:
        RuntimeError: If authentication fails or the PR cannot be created.
    """
    cloud = Cloud(
        url="https://api.bitbucket.org",
        username=os.environ["BITBUCKET_USERNAME"],
        password=os.environ["BITBUCKET_APP_PASSWORD"],
    )

    try:
        workspace = cloud.workspaces.get(workspace_slug)
        repo = workspace.repositories.get(repo_slug)
    except HTTPError as exc:
        status = exc.response.status_code
        if status == 404:
            raise RuntimeError(
                f"Repository '{workspace_slug}/{repo_slug}' not found."
            ) from exc
        raise RuntimeError(
            f"Failed to access Bitbucket resources: HTTP {status}"
        ) from exc

    try:
        pr = repo.pullrequests.create(
            title=title,
            description=description,
            source={"branch": {"name": source_branch}},
            destination={"branch": {"name": destination_branch}},
            close_source_branch=close_source_branch,
        )
    except HTTPError as exc:
        body = exc.response.text
        raise RuntimeError(
            f"Pull request creation failed: HTTP {exc.response.status_code} — {body}"
        ) from exc

    return {
        "id": pr.id,
        "title": pr.title,
        "state": pr.state,
        "links": {"html": pr.links["html"]["href"]},
    }
```

### Pattern 2: Bitbucket Pipelines — Trigger and Monitor

```python
import time
import os
from atlassian.bitbucket import Cloud
from requests.exceptions import HTTPError


def trigger_pipeline_and_get_result(
    workspace_slug: str,
    repo_slug: str,
    branch: str = "main",
    poll_interval: int = 15,
    timeout: int = 900,
) -> dict:
    """Trigger a Bitbucket Pipeline and wait for completion.

    Args:
        workspace_slug: Workspace identifier.
        repo_slug: Repository name.
        branch: Branch to run the pipeline on.
        poll_interval: Seconds between status checks.
        timeout: Maximum seconds to wait.

    Returns:
        Dict with pipeline UUID, state, and result.

    Raises:
        TimeoutError: If the pipeline doesn't complete in time.
    """
    cloud = Cloud(
        url="https://api.bitbucket.org",
        username=os.environ["BITBUCKET_USERNAME"],
        password=os.environ["BITBUCKET_APP_PASSWORD"],
    )
    repo = cloud.workspaces.get(workspace_slug).repositories.get(repo_slug)

    # Trigger the pipeline for the given branch
    pipeline = repo.pipelines.create(
        body={
            "target": {
                "type": "pipeline_ref_target",
                "ref_type": "branch",
                "ref_name": branch,
            }
        }
    )
    pipeline_uuid = pipeline.uuid

    # Poll for completion
    start = time.monotonic()
    while True:
        if time.monotonic() - start > timeout:
            raise TimeoutError(
                f"Pipeline {pipeline_uuid} did not complete within {timeout}s."
            )
        time.sleep(poll_interval)
        # Re-fetch the pipeline object to get updated state
        for p in repo.pipelines.each(sort="-created_on"):
            if p.uuid == pipeline_uuid:
                state = p.state
                if state["type"] != "PIPELINE_STATE_IN_PROGRESS":
                    return {
                        "uuid": pipeline_uuid,
                        "state": state["type"],
                        "result": state.get("result", {}).get("type"),
                        "duration_seconds": p.duration_in_seconds,
                    }
                break
```

### Pattern 3: Bitbucket Server — Project and Repository Admin

```python
from atlassian import Bitbucket
import os


def create_project_with_repo(
    project_key: str,
    project_name: str,
    repo_name: str,
    is_private: bool = True,
) -> dict:
    """Create a Bitbucket Server project and repository.

    Args:
        project_key: Short project key (e.g., "OPS").
        project_name: Human-readable project name.
        repo_name: Repository slug (kebab-case).
        is_private: Whether the repo should be private.

    Returns:
        Dict with project and repository keys.
    """
    bitbucket = Bitbucket(
        url=os.environ["BITBUCKET_SERVER_URL"],
        username=os.environ["BITBUCKET_USERNAME"],
        password=os.environ["BITBUCKET_PASSWORD"],
    )

    # Create the project
    try:
        project = bitbucket.create_project(project_key, project_name)
    except HTTPError as exc:
        if exc.response.status_code == 409:
            project = bitbucket.project(project_key)
        else:
            raise

    # Create the repository within the project
    try:
        repo = bitbucket.create_repo(
            project_key=project_key,
            repo=repo_name,
            is_private=is_private,
        )
    except HTTPError as exc:
        if exc.response.status_code == 409:
            repo = bitbucket.get_repo(project_key, repo_name)
        else:
            raise

    return {
        "project_key": project["key"],
        "repo_name": repo["slug"],
        "clone_url": repo["links"]["clone"][0]["href"],
    }
```

### BAD vs GOOD: Pipeline Status Polling

```python
# ❌ BAD — no timeout, tight loop, no error handling
def poll_pipeline_bad(repo, uuid):
    while True:
        for p in repo.pipelines.each():
            if p.uuid == uuid:
                if p.state["type"] != "PIPELINE_STATE_IN_PROGRESS":
                    return p.state
        time.sleep(1)  # Too frequent, may hit rate limits

# ✅ GOOD — timeout, exponential backoff, error handling
import time

def poll_pipeline_good(
    repo,
    pipeline_uuid: str,
    timeout: int = 600,
) -> dict:
    """Poll a Bitbucket pipeline until completion with timeout.

    Uses exponential backoff to avoid rate limiting.
    """
    start = time.monotonic()
    backoff = 5

    while time.monotonic() - start < timeout:
        try:
            for p in repo.pipelines.each(sort="-created_on"):
                if p.uuid == pipeline_uuid:
                    state_type = p.state["type"]
                    if state_type != "PIPELINE_STATE_IN_PROGRESS":
                        return {
                            "uuid": pipeline_uuid,
                            "state": state_type,
                            "result": p.state.get("result", {}).get("type"),
                            "duration": p.duration_in_seconds,
                        }
                    break
        except HTTPError as exc:
            if exc.response.status_code == 429:
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
                continue
            raise
        time.sleep(10)  # Normal poll interval

    raise TimeoutError(f"Pipeline {pipeline_uuid} did not complete in {timeout}s.")
```

## MUST DO

- Use app passwords for Bitbucket Cloud authentication (Settings → Access Management → App Passwords)
- Grant app passwords only the scopes needed (repo, pull request, pipeline)
- Use the object-oriented Cloud API (`Cloud` class) for Bitbucket Cloud and the functional API (`Bitbucket` class) for Server/DC
- Pass `sort="-created_on"` when listing pipelines to get the most recent first
- Set a reasonable timeout (>= 600s) when polling pipeline results
- Check 409 Conflict responses to handle idempotent resource creation

## MUST NOT DO

- Never use your main Bitbucket password for API access — always use app passwords
- Do not hardcode workspace or repository slugs in application code
- Avoid polling pipelines without backoff — Bitbucket rate-limits at 1000 requests/hour
- Never log or print pipeline variables or authentication tokens
- Do not assume pagination is complete without checking the `next` page link

## Live References

- [atlassian-python-api Documentation](https://atlassian-python-api.readthedocs.io/)
- [atlassian-python-api GitHub Repository](https://github.com/atlassian-api/atlassian-python-api)
- [Bitbucket Cloud REST API v2](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/)
- [Bitbucket Server/Data Center REST API](https://developer.atlassian.com/server/bitbucket/rest/)
- [Bitbucket Cloud Pipelines API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pipelines/)
- [Bitbucket App Passwords Documentation](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)
- [Bitbucket Webhook Events Reference](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-webhooks/)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-github-api` | GitHub API with PyGithub for repository and PR automation |
| `coding-gitlab-api` | GitLab API with python-gitlab for CI/CD and MR management |
| `coding-jenkins-api` | Jenkins automation for cross-platform CI/CD orchestration |
