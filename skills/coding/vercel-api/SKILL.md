---
name: vercel-api
description: Integrates Vercel services (Deployments, Projects, Edge Functions, Domains, Analytics) using the Vercel REST API and Python SDK with token-based authentication and deployment automation patterns.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: vercel api, vercel python, vercel deployments, vercel edge functions, vercel projects, vercel domains, how do i use vercel api from python
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
  related-skills: cloudflare-api, netlify-api, aws-sdk
---

# Vercel API Integration Patterns
Integrates Vercel services using the Vercel REST API and `vercel-py` SDK. Covers API token authentication, project management, deployment creation (with file uploads), Edge Config management, domain configuration, and environment variable management with patterns for deployment status polling and rollback.

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


## TL;DR Checklist
- [ ] Use `VERCEL_TOKEN` environment variable with a Vercel API token from Account Settings
- [ ] Use `vercel-py` SDK for typed clients or direct REST API calls
- [ ] Use the REST API endpoints (`/v13/deployments`, `/v9/projects`) for deployment automation
- [ ] Poll deployment status via `GET /v13/deployments/{id}` until `readyState == "READY"`
- [ ] For custom Python backends, use `vercel.json` to configure Python Functions routing
- [ ] Handle `httpx.HTTPStatusError` with specific status codes for error recovery
- [ ] Manage environment variables via `POST /v10/projects/{id}/env`

---

## Core Workflow

### 1. Authentication and API Client Setup
Vercel API uses Bearer token authentication with team-scoped requests.
```python
import os
import httpx
from httpx import HTTPStatusError


class VercelClient:
    # HTTP client for Vercel REST API.

    BASE_URL = "https://api.vercel.com"

    def __init__(self, token: str | None = None, team_id: str | None = None):
        self.token = token or os.environ["VERCEL_TOKEN"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        self.params = {}
        if team_id:
            self.params["teamId"] = team_id

    def _request(self, method: str, path: str, **kwargs) -> dict:
        """Make an API request with error handling."""
        url = f"{self.BASE_URL}{path}"
        with httpx.Client() as client:
            try:
                response = client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=self.params,
                    **kwargs,
                )
                response.raise_for_status()
                return response.json()
            except HTTPStatusError as err:
                if err.response.status_code == 401:
                    raise PermissionError("Invalid Vercel API token") from err
                if err.response.status_code == 403:
                    raise PermissionError("Token lacks required scope") from err
                if err.response.status_code == 404:
                    raise ValueError(f"Resource not found at {path}") from err
                raise
```
**Checkpoint:** Generate a Vercel API token from Account Settings → Tokens. Test with `GET /v9/projects`. Use `teamId` query param for team-owned resources.

### 2. Project and Deployment Management
```python
class VercelProjectManager(VercelClient):
    # Manage Vercel projects and deployments.

    def list_projects(self) -> list[dict]:
        """List all accessible projects."""
        data = self._request("GET", "/v9/projects")
        return data.get("projects", [])

    def get_project(self, project_name: str) -> dict | None:
        """Get a project by name."""
        try:
            return self._request("GET", f"/v9/projects/{project_name}")
        except ValueError:
            return None

    def create_deployment(
        self,
        project_name: str,
        files: list[dict],
        project_settings: dict | None = None,
    ) -> dict:
        """Create a new deployment with file uploads."""
        payload = {
            "name": project_name,
            "files": files,
        }
        if project_settings:
            payload["projectSettings"] = project_settings

        return self._request("POST", "/v13/deployments", json=payload)

    def get_deployment(self, deployment_id: str) -> dict:
        """Get deployment details including readyState."""
        return self._request("GET", f"/v13/deployments/{deployment_id}")

    def list_deployments(
        self, project_id: str | None = None, limit: int = 10
    ) -> list[dict]:
        """List deployments with optional project filter."""
        params = {"limit": limit}
        if project_id:
            params["projectId"] = project_id

        data = self._request("GET", "/v6/deployments", params=params)
        return data.get("deployments", [])

    def cancel_deployment(self, deployment_id: str) -> dict:
        """Cancel a running deployment."""
        return self._request("PATCH", f"/v13/deployments/{deployment_id}/cancel")

    def delete_deployment(self, deployment_id: str) -> None:
        """Delete a deployment."""
        try:
            self._request("DELETE", f"/v13/deployments/{deployment_id}")
        except ValueError as err:
            if "404" in str(err):
                return  # Already deleted — idempotent
            raise

    def wait_for_deployment(
        self, deployment_id: str, timeout: int = 300, poll_interval: int = 5
    ) -> str:
        """Poll deployment until ready. Returns the deployment URL."""
        import time

        start = time.time()
        while time.time() - start < timeout:
            deployment = self.get_deployment(deployment_id)
            state = deployment.get("readyState", deployment.get("state"))

            if state == "READY":
                return deployment["url"]
            if state in ("ERROR", "CANCELED"):
                raise RuntimeError(
                    f"Deployment {deployment_id} failed with state: {state}"
                )

            time.sleep(poll_interval)
```
**Checkpoint:** Deployment states: `QUEUED` → `BUILDING` → `READY` or `ERROR`. The `readyState` field is the most reliable status indicator. Deployment URLs are `<random>.vercel.app`.

### 3. Environment Variable Management
```python
def set_environment_variable(
    client: VercelClient,
    project_id: str,
    key: str,
    value: str,
    target: list[str] | None = None,
) -> dict:
    """Set an environment variable on a project."""
    payload = {
        "key": key,
        "value": value,
        "type": "plain",  # "plain", "secret", or "encrypted"
    }
    if target:
        payload["target"] = target  # ["production"], ["preview"], ["development"]

    return client._request(
        "POST",
        f"/v10/projects/{project_id}/env",
        json=payload,
    )

def list_environment_variables(
    client: VercelClient, project_id: str
) -> list[dict]:
    """List all environment variables for a project."""
    data = client._request("GET", f"/v10/projects/{project_id}/env")
    return data.get("envs", [])
```
**Checkpoint:** Environment variable `target` controls which environments receive the variable: `[36development"]`, `[36preview"]`, `[36production"]`, or all three. Use `