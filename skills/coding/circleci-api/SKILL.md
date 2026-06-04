---
name: circleci-api
description: Integrates with the CircleCI REST API v2 to manage pipelines, workflows,
  jobs, contexts, environment variables, project settings, and orb configurations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: circleci api, circleci python, circleci pipelines, circleci workflows,
    circleci orb, circleci contexts, circleci jobs, circleci v2 api
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
  related-skills: coding-github-api, coding-jenkins-api, coding-gitlab-api
------
# CircleCI API v2 Integration

Integrates with the CircleCI REST API v2 to programmatically manage pipelines, workflows, jobs, contexts, environment variables, project settings, SSH keys, and orbs. Supports both the `circleci.py` Python wrapper and direct API calls.

## TL;DR for Code Generation

- [ ] Authenticate with a CircleCI Personal API Token sent as the `Circle-Token` header
- [ ] Use the v2 API at `https://circleci.com/api/v2/` — v1 is deprecated for most endpoints
- [ ] Project slug format is `{vcs_type}/{org}/{repo}` (e.g., `gh/my-org/my-repo`)
- [ ] Handle pagination with the `next_page_token` field in API v2 responses
- [ ] Use contexts for shared environment variables across projects
- [ ] Use `circleci.py` library for a higher-level Python interface

---

## When to Use

Use this skill when:

- Triggering pipelines programmatically from external tools or CI/CD coordination scripts
- Monitoring workflow and job status across multiple CircleCI projects
- Managing contexts and environment variables for secure parameter sharing
- Collecting pipeline metrics, test results, and artifact URLs for reporting
- Automating project settings, SSH key management, and checkout configuration
- Publishing, managing, or testing CircleCI orbs

---

## When NOT to Use

Avoid this skill for:

- Writing `.circleci/config.yml` pipeline definitions (this is YAML configuration, not API usage)
- Local development and testing of CircleCI configs (use the CircleCI CLI or `circleci config validate`)
- Docker container building (use `coding-docker-api` or CircleCI's built-in Docker executor)
- Infrastructure-as-code (use `coding-terraform-sdk` or `coding-pulumi`)

---

## Core Workflow

1. **Authenticate** — Get a Personal API Token from CircleCI User Settings → Personal API Tokens. Pass it as the `Circle-Token` HTTP header. **Checkpoint:** Verify the token by calling `GET /api/v2/me` which returns the authenticated user.

2. **Trigger a Pipeline** — POST to `/api/v2/project/{project_slug}/pipeline` with a branch or tag reference. **Checkpoint:** Capture the returned `id` and `number` — you'll need them for status polling.

3. **Monitor Workflows and Jobs** — GET `/api/v2/pipeline/{id}/workflow` to list workflows, then GET `/api/v2/workflow/{id}/job` to list jobs within a workflow. **Checkpoint:** Track workflow status: running → success/failed/canceled. Track job status: blocked, running, success, failed, canceled, on_hold.

4. **Retrieve Results** — Get job artifacts via `/api/v2/project/{slug}/{job_number}/artifacts`, test metadata, and log output. **Checkpoint:** Verify artifact URLs are downloadable (they require authentication).

5. **Error Handling** — Handle HTTP 401 (bad token), 404 (project or pipeline not found), and 429 (rate limited). CircleCI v2 rate limits vary by plan. **Checkpoint:** Respect the `X-RateLimit-Remaining` header and back off appropriately.

---

## Implementation Patterns

### Pattern 1: Trigger Pipeline and Poll Workflows

```python
import os
import time
import requests
from requests.exceptions import HTTPError, ConnectionError


class CircleCIAPI:
    """Minimal client for the CircleCI REST API v2."""

    BASE_URL = "https://circleci.com/api/v2"

    def __init__(self, token: str | None = None):
        self.token = token or os.environ["CIRCLE_TOKEN"]
        self.session = requests.Session()
        self.session.headers.update({
            "Circle-Token": self.token,
            "Accept": "application/json",
        })

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.BASE_URL}{path}"
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
        except HTTPError as exc:
            status = exc.response.status_code
            body = exc.response.text[:300]
            if status == 401:
                raise RuntimeError(
                    "CircleCI authentication failed. Check your CIRCLE_TOKEN."
                ) from exc
            if status == 404:
                raise RuntimeError(
                    f"CircleCI resource not found at {path}: {body}"
                ) from exc
            raise RuntimeError(
                f"CircleCI API error {status} on {method} {path}: {body}"
            ) from exc
        return response.json()

    def trigger_pipeline(
        self,
        project_slug: str,
        branch: str = "main",
        parameters: dict | None = None,
    ) -> dict:
        """Trigger a new pipeline on the given project/branch.

        Args:
            project_slug: e.g., "gh/my-org/my-repo".
            branch: Git branch to run the pipeline on.
            parameters: Pipeline parameters defined in config.yml.

        Returns:
            Pipeline object with id, number, and state.
        """
        payload: dict = {"branch": branch}
        if parameters:
            payload["parameters"] = parameters

        return self._request(
            "POST",
            f"/project/{project_slug}/pipeline",
            json=payload,
        )

    def get_pipeline_workflows(
        self,
        pipeline_id: str,
    ) -> list[dict]:
        """Get all workflows for a pipeline."""
        result = self._request("GET", f"/pipeline/{pipeline_id}/workflow")
        return result.get("items", [])

    def get_workflow_jobs(
        self,
        workflow_id: str,
    ) -> list[dict]:
        """Get all jobs within a workflow."""
        result = self._request("GET", f"/workflow/{workflow_id}/job")
        return result.get("items", [])

    def wait_for_pipeline(
        self,
        project_slug: str,
        pipeline_id: str,
        poll_interval: int = 15,
        timeout: int = 1800,
    ) -> dict:
        """Wait for a pipeline and all its workflows to complete.

        Args:
            project_slug: Project identifier.
            pipeline_id: Pipeline ID from trigger_pipeline.
            poll_interval: Seconds between status checks.
            timeout: Maximum seconds to wait.

        Returns:
            Dict with pipeline status, workflow details, and duration.
        """
        start = time.monotonic()

        while time.monotonic() - start < timeout:
            workflows = self.get_pipeline_workflows(pipeline_id)
            all_done = all(
                w["status"] in ("success", "failed", "canceled", "error", "on_hold")
                for w in workflows
            )

            if all_done:
                return {
                    "pipeline_id": pipeline_id,
                    "workflows": [
                        {
                            "id": w["id"],
                            "name": w["name"],
                            "status": w["status"],
                        }
                        for w in workflows
                    ],
                    "elapsed_seconds": time.monotonic() - start,
                }

            time.sleep(poll_interval)

        raise TimeoutError(
            f"Pipeline {pipeline_id} did not complete within {timeout}s."
        )
```

### Pattern 2: Manage Contexts and Environment Variables

```python
import os
from circleci import CircleCI  # Requires: pip install circleci.py


def create_context_and_set_vars(
    context_name: str,
    environment_vars: dict[str, str],
    owner_id: str,
) -> dict:
    """Create a CircleCI context and populate it with environment variables.

    Args:
        context_name: Name for the new context.
        environment_vars: Dict of env var names to values.
        owner_id: The ID of the organization or group that owns the context.

    Returns:
        Dict with context ID, name, and created variable names.

    Raises:
        RuntimeError: If creation or variable population fails.
    """
    api = CircleCI(api_key=os.environ["CIRCLE_TOKEN"])

    # Create the context
    try:
        context = api.create_context(context_name, owner_id)
    except Exception as exc:
        # Context might already exist
        if "already exists" in str(exc).lower():
            context = {"id": None, "name": context_name}
        else:
            raise RuntimeError(
                f"Failed to create context '{context_name}': {exc}"
            ) from exc

    context_id = context.get("id", "")
    created_vars: list[str] = []

    # Set environment variables in the context
    for var_name, var_value in environment_vars.items():
        try:
            api.add_context_env_var(
                context_id=context_id or context_name,
                env_var=var_name,
                value=var_value,
            )
            created_vars.append(var_name)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to set context variable '{var_name}': {exc}"
            ) from exc

    return {
        "context_name": context_name,
        "context_id": context_id,
        "variables_set": created_vars,
    }
```

### Pattern 3: Retrieve Artifacts from a Job

```python
import os
import requests
from requests.exceptions import HTTPError


def download_job_artifacts(
    project_slug: str,
    job_number: int,
    download_dir: str = "./artifacts",
) -> list[str]:
    """Download all artifacts from a specific CircleCI job.

    Args:
        project_slug: e.g., "gh/my-org/my-repo".
        job_number: Job number (visible in the CircleCI UI).
        download_dir: Local directory to save artifacts.

    Returns:
        List of downloaded file paths.
    """
    token = os.environ["CIRCLE_TOKEN"]
    headers = {"Circle-Token": token}
    base_url = f"https://circleci.com/api/v2/project/{project_slug}/{job_number}/artifacts"

    response = requests.get(base_url, headers=headers)
    try:
        response.raise_for_status()
    except HTTPError as exc:
        raise RuntimeError(
            f"Failed to fetch artifacts for {project_slug} job #{job_number}: "
            f"HTTP {exc.response.status_code}"
        ) from exc

    data = response.json()
    artifacts = data.get("items", [])
    os.makedirs(download_dir, exist_ok=True)

    downloaded: list[str] = []
    for artifact in artifacts:
        url = artifact["url"]
        path = artifact.get("path", artifact.get("filename", "unknown"))
        local_path = os.path.join(download_dir, os.path.basename(path))

        dl_response = requests.get(url, headers=headers)
        try:
            dl_response.raise_for_status()
        except HTTPError as exc:
            raise RuntimeError(
                f"Failed to download artifact '{path}' from {url}: "
                f"HTTP {exc.response.status_code}"
            ) from exc

        with open(local_path, "wb") as f:
            f.write(dl_response.content)
        downloaded.append(local_path)

    return downloaded
```

### BAD vs GOOD: CircleCI Pipeline Workflow

```python
# ❌ BAD — no timeout, ignores workflow-level status, no pagination handling
def trigger_bad(project_slug):
    api = CircleCIAPI()
    pipeline = api.trigger_pipeline(project_slug, "main")
    workflows = api.get_pipeline_workflows(pipeline["id"])
    return workflows  # May return incomplete results

# ✅ GOOD — structured, handles all states, paginated, timed
def trigger_good(
    project_slug: str,
    branch: str,
    timeout: int = 1800,
) -> dict:
    """Trigger a pipeline and block until all workflows finish.

    Uses the CircleCIAPI client from Pattern 1 above.
    """
    api = CircleCIAPI()
    pipeline = api.trigger_pipeline(project_slug, branch)

    pipeline_id = pipeline["id"]
    pipeline_number = pipeline["number"]

    result = api.wait_for_pipeline(project_slug, pipeline_id, timeout=timeout)
    result["pipeline_number"] = pipeline_number

    # Check for failures
    failed_workflows = [
        w for w in result["workflows"]
        if w["status"] in ("failed", "error", "canceled")
    ]
    if failed_workflows:
        failed_names = [w["name"] for w in failed_workflows]
        raise RuntimeError(
            f"Pipeline #{pipeline_number} completed with "
            f"failed workflows: {', '.join(failed_names)}"
        )

    return result
```

## MUST DO

- Store the CircleCI Personal API Token in the `CIRCLE_TOKEN` environment variable
- Use the v2 API base URL (`https://circleci.com/api/v2/`) for all new integrations
- Use `next_page_token` from response bodies to paginate through large result sets
- Pass project slug in the `{vcs_type}/{org}/{repo}` format (e.g., `gh/myorg/myrepo`)
- Use pipeline parameters defined in the `.circleci/config.yml` to parameterize triggers
- Poll workflow status at reasonable intervals (15s minimum) to avoid rate limiting

## MUST NOT DO

- Never share or commit CircleCI API tokens — revoke compromised tokens immediately in User Settings
- Do not use project API tokens with v2 API — they are not supported; use Personal API Tokens instead
- Avoid polling jobs more frequently than every 10 seconds — use CircleCI webhooks for event-driven flows
- Never ignore pipeline parameter validation — invalid parameters cause silent pipeline failures
- Do not assume all workflows complete — handle `canceled`, `on_hold`, and `error` states explicitly

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

- [CircleCI API v2 Reference](https://circleci.com/docs/api/v2/)
- [CircleCI API v2 — Trigger Pipeline](https://circleci.com/docs/api/v2/#tag/Pipeline/operation/triggerPipeline)
- [CircleCI API v2 — Get Workflow Jobs](https://circleci.com/docs/api/v2/#tag/Workflow/operation/getWorkflowJobs)
- [CircleCI API v2 — Contexts](https://circleci.com/docs/api/v2/#tag/Context)
- [circleci.py Python Library](https://github.com/levlaz/circleci.py)
- [CircleCI Orbs Registry](https://circleci.com/developer/orbs)
- [CircleCI Personal API Tokens](https://circleci.com/docs/api/#authentication)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-github-api` | GitHub API for triggering CircleCI pipelines via commits |
| `coding-jenkins-api` | Jenkins API as an alternative CI/CD automation platform |
| `coding-gitlab-api` | GitLab CI/CD for comparison with CircleCI workflows |
