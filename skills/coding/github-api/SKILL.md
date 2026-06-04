---
name: github-api
description: Integrates with the GitHub REST API and GraphQL API via PyGithub and Octokit to manage repositories, issues, pull requests, Actions workflows, and Copilot metrics.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: github api, octokit, pygithub, github rest api, github graphql, manage repositories, github actions, pull request automation
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
  related-skills: coding-gitlab-api, coding-bitbucket-api, coding-jenkins-api
------
# GitHub API & Octokit Integration
Integrates with GitHub's REST API v3 and GraphQL API v4 to automate repository management, issue tracking, pull request workflows, Actions pipelines, and Copilot usage analytics. Use PyGithub for Python projects or Octokit for JavaScript/TypeScript projects.
## TL;DR for Code Generation
- [ ] Authenticate with a fine-grained personal access token (PAT) — never use passwords or legacy tokens
- [ ] Use `github.Auth.Token()` for PyGithub or `new Octokit({ auth })` for Octokit.js
- [ ] Handle pagination explicitly with `get_paginated()` or `for async of` iterators
- [ ] Wrap API calls in try/except for `github.GithubException` or `octokit.RequestError`
- [ ] Set a user-agent header identifying your application for rate-limit tracking
- [ ] Respect rate limits — check `get_rate_limit()` before bulk operations
- [ ] Use GraphQL for complex nested queries; use REST for bulk list operations
---
## Core Workflow
1. **Authenticate and Create Client:** Instantiate `Github(auth=Auth.Token(token))` or `new Octokit({ auth })`. **Checkpoint:** Verify the token has the correct scopes (repo, workflow, admin:org) for your operations.
2. **Identify Target Resources:** Resolve owner and repo names from environment variables, CLI arguments, or webhook payloads. Use `g.get_repo("owner/repo")` or `octokit.rest.repos.get({ owner, repo })`. **Checkpoint:** Confirm the repository exists and is accessible with a 200 response.
3. **Execute API Operation:** Call the appropriate endpoint: create an issue, merge a PR, trigger a workflow dispatch, or list artifacts. **Checkpoint:** Validate the response status code and inspect returned object IDs.
4. **Handle Pagination:** Iterate over paginated results using `repo.get_issues(state='all')` or `octokit.paginate()` for list endpoints. **Checkpoint:** Ensure you consume all pages, not just the first page (default 30 items).
5. **Error Handling and Retry:** Catch `GithubException` or `RequestError`, inspect status codes (401=bad auth, 403=rate limit, 404=not found, 422=validation), and implement exponential backoff for 503s. **Checkpoint:** Log the request ID from error headers for debugging.
---
## Implementation Patterns
### Pattern 1: PyGithub — Repository Management
```python
import os
from github import Github, Auth

def sync_fork(
    upstream_owner: str,
    upstream_repo: str,
    fork_owner: str | None = None,
) -> dict:
    """Sync a fork with its upstream repository using PyGithub.

    Args:
        upstream_owner: Owner of the upstream repository.
        upstream_repo: Name of the upstream repository.
        fork_owner: Owner of the fork (defaults to authenticated user).

    Returns:
        Dict with merge status and commit SHA.

    Raises:
        GithubException: If authentication fails or repo is unreachable.
    """
    token = os.environ["GITHUB_TOKEN"]
    g = Github(auth=Auth.Token(token))

    upstream = g.get_repo(f"{upstream_owner}/{upstream_repo}")
    fork = g.get_repo(f"{fork_owner or g.get_user().login}/{upstream_repo}")

    # Get the default branch from upstream
    default_branch = upstream.default_branch
    upstream_branch = upstream.get_branch(default_branch)
    fork_branch = fork.get_branch(default_branch)

    if upstream_branch.commit.sha == fork_branch.commit.sha:
        return {"status": "already_synced", "sha": fork_branch.commit.sha}

    # Merge upstream into fork
    merge_result = fork.merge(upstream_branch.commit.sha)
    return {
        "status": "merged" if merge_result.merged else "conflict",
        "sha": merge_result.sha,
        "message": merge_result.message,
    }
```
### Pattern 2: GitHub Actions — Trigger Workflow Dispatch
```python
import os
import requests

def trigger_workflow(
    owner: str,
    repo: str,
    workflow_file: str,
    ref: str = "main",
    inputs: dict | None = None,
) -> int:
    """Trigger a GitHub Actions workflow_dispatch event.

    Returns the workflow run ID if triggered successfully.

    Raises:
        requests.HTTPError: If the API returns a non-204 status.
    """
    token = os.environ["GITHUB_TOKEN"]
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow_file}/dispatches"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "agent-skill-router/1.0",
    }
    payload: dict = {"ref": ref}
    if inputs:
        payload["inputs"] = inputs

    response = requests.post(url, headers=headers, json=payload)
    # workflow_dispatch returns 204 No Content on success
    if response.status_code != 204:
        response.raise_for_status()
    # Parse the Location header to extract the run ID
    runs_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs"
    runs_response = requests.get(
        f"{runs_url}?event=workflow_dispatch&per_page=1",
        headers=headers,
    )
    runs_response.raise_for_status()
    runs_data = runs_response.json()
    if runs_data["total_count"] > 0:
        return runs_data["workflow_runs"][0]["id"]
    msg = "Workflow was dispatched but no run ID could be resolved."
    raise RuntimeError(msg)
```
### Pattern 3: Octokit.js — Issue Comment and PR Merge
```javascript
import { Octokit } from "@octokit/rest";

/**
 * Merge a pull request after posting a review comment.
 */
async function mergePrWithComment(
  owner, repo, pullNumber, comment
) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Post a review comment on the PR
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: comment,
  });

  // Merge the PR using squash strategy
  const result = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
    merge_method: "squash",
  });

  if (result.data.merged) {
    console.log(`PR #${pullNumber} merged: ${result.data.sha}`);
  } else {
    throw new Error(`PR merge failed: ${result.data.message}`);
  }
}
```
### BAD vs GOOD: Error Handling
```python
# ❌ BAD — silent failure, no type hints, no context
def create_issue(repo, title):
    try:
        repo.create_issue(title=title, body="")
        return True
    except:
        return False

# ✅ GOOD — typed, specific exceptions, meaningful error message
from github import GithubException

def create_issue(
    repo_full_name: str,
    title: str,
    body: str = "",
    labels: list[str] | None = None,
) -> dict:
    """Create a GitHub issue and return its URL and number.

    Raises:
        GithubException: With status code and error message from the API.
    """
    token = os.environ["GITHUB_TOKEN"]
    g = Github(auth=Auth.Token(token))
    repo = g.get_repo(repo_full_name)

    try:
        issue = repo.create_issue(
            title=title,
            body=body,
            labels=labels or [],
        )
        return {"number": issue.number, "url": issue.html_url}
    except GithubException as exc:
        status = exc.status
        msg = exc.data.get("message", "Unknown error")
        raise RuntimeError(
            f"Failed to create issue in {repo_full_name}: "
            f"HTTP {status} — {msg}"
        ) from exc
```
## MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic
## MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes
## References
- [PyGithub Documentation](https://pygithub.readthedocs.io/en/stable/introduction.html)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub GraphQL API Documentation](https://docs.github.com/en/graphql)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [GitHub Actions: Workflows](https://docs.github.com/en/actions)
- [Managing Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub Copilot](https://docs.github.com/en/copilot)
---
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


## Related Skills
| Skill | Purpose |
|---|---|
| `coding-gitlab-api` | GitLab API with python-gitlab for projects/pipelines/MRs |
| `coding-bitbucket-api` | Bitbucket Cloud API with atlassian-python-api |
| `coding-jenkins-api` | Jenkins automation for job/build/plugin management |