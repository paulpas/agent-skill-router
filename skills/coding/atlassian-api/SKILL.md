---
name: atlassian-api
description: Integrates with Atlassian suite (Jira, Confluence, Bitbucket, Rovo, Forge)
  using atlassian-python-api to automate issue tracking, documentation, and code management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: jira api, confluence api, bitbucket api, atlassian python, jira automation,
    confluence pages, atlassian forge
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
  related-skills: coding-microsoft-graph-api, coding-google-workspace-api, coding-asana-api
------

# Atlassian API Integration

Integrates with the Atlassian ecosystem — Jira (issue tracking), Confluence (documentation), Bitbucket (Git hosting), Rovo (AI search), and Forge (serverless apps) — using the `atlassian-python-api` library to automate development workflows across planning, coding, and documentation.

## TL;DR for Code Generation

- Use `Jira`, `Confluence`, and `Bitbucket` classes from `atlassian-python-api` v4.0+
- Authenticate with personal access tokens (cloud) or basic auth (server) — prefer PATs in production
- Jira uses JQL for issue queries; Confluence uses CQL for content search
- Paginate with `start`/`limit` parameters (Jira) or `cursor`-based paging (Confluence cloud)
- Use Jira's `update` method with field dicts for partial updates — avoid full object replacement
- Handle `requests.exceptions.HTTPError` for API errors, differentiate 401 (auth), 403 (permissions), 404 (not found)

## When to Use

Use this skill when:

- Creating, querying, updating, or transitioning Jira issues
- Fetching and updating Confluence pages, attachments, and spaces
- Automating Bitbucket pull request reviews and repository management
- Building Forge apps that extend Atlassian products
- Synchronizing Jira issues with external databases or spreadsheets
- Generating release notes from Jira issues and Confluence pages
- Cross-referencing code commits (Bitbucket) with tickets (Jira) in automated pipelines

## When NOT to Use

- Real-time issue updates (use Jira webhooks or Forge event handlers instead of polling)
- Bulk-importing thousands of issues in a single request — batch in chunks of 50
- Replacing Bitbucket Pipelines for CI/CD (use the pipeline API only for triggers/status)
- Accessing Jira Server with expired certificates or unsupported TLS versions

## Core Workflow

1. **Choose Authentication Method** — For Jira Cloud, generate an API token from `https://id.atlassian.com/manage/api-tokens`. For Confluence Cloud, use the same token with the appropriate subdomain. **Checkpoint:** Verify the token works with `jira.get_user()`.

2. **Initialize the Client** — Instantiate `Jira(url=..., token=...)` or `Confluence(url=..., token=...)`. Always specify the full instance URL (e.g., `https://your-domain.atlassian.net`). **Checkpoint:** Call `jira.get_project(project_key)` to validate connectivity.

3. **Construct JQL or CQL Query** — For Jira, build a JQL string with project, status, assignee, and date filters. For Confluence, use CQL for space/page filtering. **Checkpoint:** Run the query with `limit=1` first to confirm syntax.

4. **Execute and Paginate** — Use `jira.jql(query, start=0, limit=50)` and check the `total` field. Increment `start` by `limit` until all results are consumed. **Checkpoint:** Verify the `issues` list is non-empty and contains expected fields.

5. **Process Results** — Iterate over issues or pages. Map `fields` to your data model. For updates, use `jira.update_issue_field(issue_key, fields=...)` with a dict of only changed fields. **Checkpoint:** Confirm the update by re-fetching the issue.

6. **Handle Errors** — Wrap API calls in `try/except requests.exceptions.HTTPError`. For 429 (rate limit), parse `Retry-After` header and wait. For 401, refresh credentials. **Checkpoint:** Log structured error output with request ID.

## Implementation Patterns

### Pattern 1: Query Jira Issues with JQL

```python
import os
from atlassian import Jira

jira = Jira(
    url="https://your-domain.atlassian.net",
    token=os.environ["ATLASSIAN_API_TOKEN"],
)

def find_open_bugs(project_key: str, max_results: int = 100) -> list[dict]:
    """Find open bug tickets in a project, ordered by priority."""
    jql = (
        f'project = "{project_key}" '
        f'AND issuetype = Bug '
        f'AND status NOT IN (Done, Closed, Resolved) '
        f'ORDER BY priority DESC, created ASC'
    )
    issues = []
    start = 0
    while True:
        results = jira.jql(jql, start=start, limit=50)
        issues.extend(results.get("issues", []))
        if start + 50 >= results.get("total", 0):
            break
        start += 50
    return issues

bugs = find_open_bugs("PROJ")
for issue in bugs:
    key = issue["key"]
    summary = issue["fields"]["summary"]
    priority = issue["fields"]["priority"]["name"]
    print(f"[{priority}] {key}: {summary}")
```

### Pattern 2: Create a Confluence Page

```python
from atlassian import Confluence

confluence = Confluence(
    url="https://your-domain.atlassian.net/wiki",
    token=os.environ["ATLASSIAN_API_TOKEN"],
)

def publish_release_notes(space_key: str, parent_id: int | None, title: str, body_html: str) -> dict:
    """Create or update a Confluence page with release notes."""
    status = confluence.create_page(
        space=space_key,
        title=title,
        body=body_html,
        parent_id=parent_id,
        representation="storage",
    )
    return status

# HTML body in Confluence Storage Format
html_content = (
    "<h1>Release v2.5.0</h1>"
    "<ul><li>PROJ-123: Fixed login timeout</li>"
    "<li>PROJ-456: Added export feature</li></ul>"
)
publish_release_notes("ENG", 987654, "Release v2.5.0 Notes", html_content)
```

### Pattern 3: Transition a Jira Issue

```python
def transition_issue(issue_key: str, target_status: str) -> bool:
    """Transition a Jira issue to the target status by resolution name."""
    transitions = jira.get_transitions(issue_key)
    target_id = None
    for t in transitions.get("transitions", []):
        if t["name"].lower() == target_status.lower():
            target_id = t["id"]
            break
    if not target_id:
        print(f"Transition '{target_status}' not available for {issue_key}")
        return False
    jira.transition_issue(issue_key, target_id)
    return True

transition_issue("PROJ-789", "In Review")
```

### Pattern 4: BAD vs GOOD — Updating Issues

```python
# ❌ BAD — fetches entire issue only to update one field
issue = jira.get_issue("PROJ-123")
issue["fields"]["description"] = "Updated description"
jira.update_issue("PROJ-123", issue)

# ✅ GOOD — targeted field update, minimal payload
jira.update_issue_field("PROJ-123", fields={"description": "Updated description"})
```

### Pattern 5: BAD vs GOOD — Pagination

```python
# ❌ BAD — no pagination, assumes all results fit in one page
results = jira.jql("project = PROJ ORDER BY key")
all_issues = results["issues"]

# ✅ GOOD — paginated loop respecting total count
def get_all_issues(jql_query: str, batch_size: int = 50) -> list[dict]:
    """Paginate through all JQL results."""
    collected = []
    start = 0
    while True:
        page = jira.jql(jql_query, start=start, limit=batch_size)
        collected.extend(page.get("issues", []))
        total = page.get("total", 0)
        if start + batch_size >= total:
            break
        start += batch_size
    return collected
```

## Constraints

### MUST DO
- Use API tokens over passwords for all Atlassian Cloud instances
- Always paginate JQL and CQL results with `start`/`limit` or cursor-based paging
- Use `jira.update_issue_field()` for partial updates — never send full issue objects
- Handle 429 rate limits with exponential backoff and `Retry-After` header parsing

### MUST NOT DO
- Commit API tokens to version control — use environment variables or secrets manager
- Assume Jira issue IDs are sequential or predictable
- Use Confluence Storage Format for simple content (use `representation="wiki"` instead)
- Run JQL queries without a `project` filter — can scan entire instance

## Output Template

Every integration function should expose:

1. **Authentication** — `Jira(url, token)` or `Confluence(url, token)` instantiation
2. **Query/Command** — JQL/CQL string or targeted method call
3. **Pagination** — Loop with `start`/`limit` for Jira or cursor for Confluence cloud
4. **Data Mapping** — Extract fields from Atlassian response dicts to your domain model
5. **Error Handling** — `try/except requests.exceptions.HTTPError` with status-specific recovery

## Related Skills

| Skill | Purpose |
|