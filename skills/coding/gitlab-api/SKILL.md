---




name: gitlab-api
description: Integrates with the GitLab REST API v4 and GraphQL API via python-gitlab
  to automate projects, merge requests, CI/CD pipelines, runners, and container registry
  management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gitlab api, python-gitlab, gitlab ci/cd, merge request automation, gitlab
    pipelines, gitlab runner, gitlab graphql, manage projects
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
  related-skills: coding-github-api, coding-bitbucket-api, coding-kubernetes-api




---




# GitLab API & python-gitlab Integration

Integrates with the GitLab REST API v4 and GraphQL API using the `python-gitlab` library to programmatically manage projects, groups, merge requests, CI/CD pipelines, runners, container registry, and GitLab Pages.

## TL;DR for Code Generation

- [ ] Authenticate with a personal access token (PAT) via `gitlab.Gitlab(url, token)` or config file
- [ ] Use the `gl.projects.get()`, `gl.groups.get()`, and `gl.runners.all()` patterns for resource access
- [ ] Enable pagination with `iterator=True` on list calls to auto-fetch all pages
- [ ] Handle `gitlab.exceptions.GitlabError` with specific subclasses for auth, not-found, and validation errors
- [ ] Use `gl.gitlab_cli()` for command-line style operations or the Python API for programmatic access
- [ ] Target both gitlab.com SaaS and self-managed instances by configuring `url` explicitly

---

## When to Use

Use this skill when:

- Automating project creation, group management, or member access across GitLab namespaces
- Building merge request approval workflows, automated code review bots, or merge train integrations
- Triggering, inspecting, or canceling CI/CD pipelines programmatically
- Managing GitLab CI runners (shared, group, or project-specific)
- Cleaning up container registry tags or managing GitLab Pages deployments
- Implementing GitLab GraphQL queries for complex, nested data extraction

---

## When NOT to Use

Avoid this skill for:

- Direct git operations (clone/push/fetch) — use `gitpython` or the `git` CLI instead
- Infrastructure-as-code for GitLab itself (use the `coding-terraform-sdk` skill with `gitlab terraform provider`)
- Simple webhook receivers that don't need to call the GitLab API back

---

## Core Workflow

1. **Authenticate and Initialize Client** — Create a `gitlab.Gitlab` instance with your GitLab URL and a personal access token. **Checkpoint:** Call `gl.auth()` to verify the token works and retrieve the authenticated user.

2. **Resolve Target Project or Group** — Use `gl.projects.get(namespace/repo)` or `gl.groups.get(group_id)` to obtain the resource handle. **Checkpoint:** Handle `GitlabGetError` (404) immediately if the resource is missing.

3. **Execute the Operation** — Call methods on the project handle: create MRs, list pipelines, trigger CI jobs, manage protected branches. **Checkpoint:** Inspect the returned object's `id`, `web_url`, or `status` fields.

4. **Handle Pagination** — For list endpoints, pass `iterator=True` and optionally `per_page` and `page` parameters. **Checkpoint:** Iterate fully — by default, GitLab returns 20 items per page.

5. **Error Handling** — Catch `gitlab.exceptions.GitlabOperationError` for mutation failures, `GitlabAuthenticationError` for bad tokens, and `GitlabListError` for pagination issues. **Checkpoint:** Log the `response_body` attribute from the exception for debugging.

---

## Implementation Patterns

### Pattern 1: Project Management and Merge Request Automation

```python
import os
import gitlab
from gitlab.exceptions import GitlabCreateError, GitlabGetError

def create_merge_request_with_approvers(
    project_path: str,
    source_branch: str,
    target_branch: str,
    title: str,
    description: str,
    approver_ids: list[int] | None = None,
) -> dict:
    """Create a merge request and optionally assign approvers.

    Args:
        project_path: Full project path (e.g., "my-group/my-project").
        source_branch: Feature branch name.
        target_branch: Destination branch (usually "main" or "master").
        title: MR title.
        description: MR description in Markdown.
        approver_ids: GitLab user IDs for required approvers.

    Returns:
        Dict with MR ID, web URL, and merge status.

    Raises:
        GitlabCreateError: If MR creation fails due to validation.
        GitlabGetError: If the project is not found.
    """
    token = os.environ["GITLAB_TOKEN"]
    gl = gitlab.Gitlab("https://gitlab.com", token)

    try:
        project = gl.projects.get(project_path)
    except GitlabGetError:
        raise RuntimeError(f"Project '{project_path}' not found. Verify the path and your access permissions.")

    mr = project.mergerequests.create({
        "source_branch": source_branch,
        "target_branch": target_branch,
        "title": title,
        "description": description,
        "remove_source_branch": True,
    })

    # Assign approvers if provided (GitLab Premium/Ultimate feature)
    if approver_ids:
        try:
            mr.approvals.set_approvers(approver_ids=approver_ids)
        except GitlabCreateError:
            # Silently continue — approver assignment may not be available
            # on Free tier or self-managed without license
            pass

    return {
        "id": mr.id,
        "web_url": mr.web_url,
        "state": mr.state,
        "merge_status": mr.merge_status,
    }
```

### Pattern 2: CI/CD Pipeline Trigger and Status Polling

```python
import time
import os
import gitlab
from gitlab.exceptions import GitlabError

def trigger_pipeline_and_wait(
    project_path: str,
    branch: str = "main",
    variables: dict | None = None,
    poll_interval: int = 10,
    timeout: int = 600,
) -> dict:
    """Trigger a GitLab CI/CD pipeline and poll until completion.

    Args:
        project_path: Full project path.
        branch: Target branch for the pipeline.
        variables: Optional CI/CD variables to pass to the pipeline.
        poll_interval: Seconds between status checks.
        timeout: Maximum seconds to wait for pipeline completion.

    Returns:
        Dict with pipeline ID, status, and web URL.

    Raises:
        TimeoutError: If the pipeline does not complete within timeout.
        GitlabError: If pipeline creation or status retrieval fails.
    """
    gl = gitlab.Gitlab("https://gitlab.com", os.environ["GITLAB_TOKEN"])
    project = gl.projects.get(project_path)

    pipeline = project.pipelines.create({
        "ref": branch,
        "variables": [
            {"key": k, "value": v}
            for k, v in (variables or {}).items()
        ],
    })

    start = time.monotonic()
    while pipeline.status in ("pending", "running", "created"):
        if time.monotonic() - start > timeout:
            raise TimeoutError(
                f"Pipeline {pipeline.id} did not complete within {timeout}s. "
                f"Last status: {pipeline.status}"
            )
        time.sleep(poll_interval)
        pipeline.refresh()

    return {
        "id": pipeline.id,
        "web_url": pipeline.web_url,
        "status": pipeline.status,
        "duration": pipeline.duration,
        "finished_at": pipeline.finished_at,
    }
```

### Pattern 3: Container Registry Tag Cleanup

```python
from datetime import datetime, timedelta, timezone
import os
import gitlab
from gitlab.exceptions import GitlabError

def cleanup_old_registry_tags(
    project_path: str,
    keep_last: int = 10,
    max_age_days: int = 30,
) -> list[str]:
    """Delete container registry tags older than max_age_days, keeping
    at least keep_last recent tags.

    Args:
        project_path: Full repository path.
        keep_last: Minimum number of most recent tags to preserve.
        max_age_days: Delete tags older than this many days.

    Returns:
        List of deleted tag names.
    """
    gl = gitlab.Gitlab("https://gitlab.com", os.environ["GITLAB_TOKEN"])
    project = gl.projects.get(project_path)

    try:
        tags = project.repositories_tags.list(iterator=True)
    except GitlabError as exc:
        raise RuntimeError(
            f"Failed to list registry tags for {project_path}: {exc}"
        ) from exc

    sorted_tags = sorted(
        tags,
        key=lambda t: datetime.fromisoformat(t.created_at),
        reverse=True,
    )

    # Always keep the most recent tags
    keep_set = set(t.name for t in sorted_tags[:keep_last])
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    deleted: list[str] = []

    for tag in sorted_tags:
        if tag.name in keep_set:
            continue
        created = datetime.fromisoformat(tag.created_at)
        if created < cutoff:
            try:
                tag.delete()
                deleted.append(tag.name)
            except GitlabError:
                pass  # Tag might be protected or locked

    return deleted
```

### BAD vs GOOD: Error Handling and Pagination

```python
# ❌ BAD — no pagination, no error handling, hardcoded values
def list_projects_bad():
    gl = gitlab.Gitlab("https://gitlab.com", "MY_TOKEN")
    projects = gl.projects.list()  # Only gets first 20!
    for p in projects:
        print(p.name)

# ✅ GOOD — iterator for full pagination, typed, descriptive errors
from gitlab.exceptions import GitlabAuthenticationError, GitlabListError

def list_all_project_names(url: str, token: str) -> list[str]:
    """List all project names the authenticated user can access.

    Args:
        url: GitLab instance URL (e.g., "https://gitlab.com").
        token: Personal access token with read_api scope.

    Returns:
        Sorted list of full project paths.

    Raises:
        GitlabAuthenticationError: If the token is invalid.
        GitlabListError: If pagination fails.
    """
    if not url or not token:
        raise ValueError("GitLab URL and token are required.")

    gl = gitlab.Gitlab(url, token)
    try:
        gl.auth()
    except GitlabAuthenticationError:
        raise RuntimeError(
            "GitLab authentication failed. Verify your token has 'read_api' scope."
        )

    try:
        projects = gl.projects.list(iterator=True, per_page=100)
    except GitlabListError as exc:
        raise RuntimeError(
            f"Failed to retrieve project list: {exc}"
        ) from exc

    return sorted([p.path_with_namespace for p in projects])
```

## MUST DO

- Use personal access tokens with the minimum required scopes (read_api, read_repository, write_repository)
- Call `gl.auth()` immediately after creating the Gitlab client to validate credentials
- Always pass `iterator=True` when calling list endpoints to paginate through all results
- Store GitLab URL and token in environment variables (`GITLAB_URL`, `GITLAB_TOKEN`)
- Use project path (namespace/repo) instead of project ID for readability and portability
- Check pipeline job logs via `pipeline.jobs.list()` for failure diagnostics

## MUST NOT DO

- Never embed tokens in code or configuration files committed to version control
- Avoid calling `gl.projects.list()` without `iterator=True` for production workflows
- Do not swallow `GitlabError` exceptions — always log the error details
- Never use admin credentials for routine API operations
- Do not poll pipelines without a timeout — always set a maximum wait duration

---

## Constraints

### MUST DO
- Implement structured error responses with consistent format: {error_code, message, details, request_id}
- Add rate limiting per client/API key with configurable burst and sustained limits using a token bucket algorithm
- Validate all incoming requests against a schema before processing — reject malformed input with clear error messages
- Include correlation/request IDs in all log entries for end-to-end request tracing across service boundaries

### MUST NOT DO
- Do not expose internal implementation details, stack traces, or database queries in error responses
- Avoid accepting unbounded request bodies — set maximum payload sizes and timeout limits
- Never trust client-supplied authentication tokens without validation (signature verification, expiration check)
- Do not log request/response bodies containing PII, API keys, or other sensitive data


## Live References

- [python-gitlab Documentation](https://python-gitlab.readthedocs.io/en/stable/)
- [python-gitlab GitHub Repository](https://github.com/python-gitlab/python-gitlab)
- [GitLab REST API v4 Reference](https://docs.gitlab.com/ee/api/api_resources.html)
- [GitLab GraphQL API](https://docs.gitlab.com/ee/api/graphql/)
- [GitLab CI/CD Pipeline API](https://docs.gitlab.com/ee/api/pipelines.html)
- [GitLab Container Registry API](https://docs.gitlab.com/ee/api/container_registry.html)
- [GitLab Merge Request Approvals API](https://docs.gitlab.com/ee/api/merge_request_approvals.html)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-github-api` | GitHub API with PyGithub and Octokit |
| `coding-bitbucket-api` | Bitbucket Cloud API with atlassian-python-api |
| `coding-kubernetes-api` | Kubernetes client-python for deploying to GitLab-managed clusters |
