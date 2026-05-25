---
name: vercel-api
description: Integrates Vercel services (Deployments, Projects, Edge Functions, Domains,
  Analytics) using the Vercel REST API and Python SDK with token-based authentication
  and deployment automation patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: vercel api, vercel python, vercel deployments, vercel edge functions,
    vercel projects, vercel domains, how do i use vercel api from python
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
------
# Vercel API Integration Patterns

Integrates Vercel services using the Vercel REST API and `vercel-py` SDK. Covers API token authentication, project management, deployment creation (with file uploads), Edge Config management, domain configuration, and environment variable management with patterns for deployment status polling and rollback.

## TL;DR Checklist

- [ ] Use `VERCEL_TOKEN` environment variable with a Vercel API token from Account Settings
- [ ] Use `vercel-py` SDK for typed clients (Blob, Sandbox, OIDC) or direct REST API calls
- [ ] Use the REST API endpoints (`/v13/deployments`, `/v9/projects`) for deployment automation
- [ ] Poll deployment status via `GET /v13/deployments/{id}` until `readyState == "READY"`
- [ ] For custom Python backends, use `vercel.json` to configure Python Functions routing
- [ ] Handle `httpx.HTTPStatusError` with specific status codes for error recovery
- [ ] Manage environment variables via `POST /v10/projects/{id}/env`

---

## When to Use

Use this skill when:

- Automating deployments from CI/CD pipelines (GitHub Actions, Jenkins, etc.)
- Managing multiple Vercel projects and teams programmatically
- Deploying Python ASGI/WSGI applications (FastAPI, Flask, Django) to Vercel Functions
- Configuring custom domains and environment variables across projects
- Implementing preview deployment workflows for testing and review
- Managing Edge Config for distributed, low-latency configuration storage
- Using Vercel Blob storage for file upload and serving

---

## When NOT to Use

- For one-off manual deployments (use Vercel CLI: `vercel deploy`)
- When Git integration handles deployments automatically (use the Git-based workflow)
- For infrastructure-as-code at scale (use Terraform Vercel provider)
- When you need real-time deployment logs (use Vercel Dashboard)

---

## Core Workflow

### 1. Authentication and API Client Setup

Vercel API uses Bearer token authentication with team-scoped requests.

```python
import os
import httpx
from httpx import HTTPStatusError


class VercelClient:
    """HTTP client for Vercel REST API."""

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
    """Manage Vercel projects and deployments."""

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

        raise TimeoutError(f"Deployment {deployment_id} not ready in {timeout}s")
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

**Checkpoint:** Environment variable `target` controls which environments receive the variable: `["production"]`, `["preview"]`, `["development"]`, or all three. Use `"secret"` type for sensitive values.

### 4. Domain and Custom URL Management

```python
class VercelDomainManager(VercelClient):
    """Manage project domains and aliases."""

    def add_domain(self, project_id: str, domain: str) -> dict:
        """Add a custom domain to a project."""
        return self._request(
            "POST",
            f"/v10/projects/{project_id}/domains",
            json={"name": domain},
        )

    def list_domains(self, project_id: str) -> list[dict]:
        """List domains for a project."""
        data = self._request(
            "GET", f"/v10/projects/{project_id}/domains"
        )
        return data.get("domains", [])

    def remove_domain(self, project_id: str, domain: str) -> None:
        """Remove a domain from a project."""
        try:
            self._request(
                "DELETE",
                f"/v10/projects/{project_id}/domains/{domain}",
            )
        except ValueError as err:
            if "404" in str(err):
                return  # Already removed — idempotent
            raise
```

---

## Implementation Patterns

### Pattern 1: Python FastAPI Deployment to Vercel

```python
# vercel.json — configure Python routes
vercel_config = {
    "functions": {
        "api/**/*.py": {
            "runtime": "python3.12",
            "maxDuration": 30,
        }
    },
    "routes": [
        {"src": "/api/(.*)", "dest": "/api/$1"},
    ],
}


# app.py — FastAPI entrypoint
def generate_fastapi_app():
    """Generate a minimal FastAPI application for Vercel deployment."""
    return '''
from fastapi import FastAPI

app = FastAPI()

@app.get("/api")
async def root():
    return {"status": "ok"}

@app.get("/api/items")
async def list_items():
    return {"items": ["foo", "bar", "baz"]}
'''


# pyproject.toml
pyproject_toml = """
[project]
name = "my-vercel-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]",
]
"""
```

### Pattern 2: Edge Config Management

```python
class EdgeConfigManager:
    """Manage Edge Config for distributed configuration."""

    def __init__(self, token: str, edge_config_id: str):
        self.client = VercelClient(token=token)
        self.edge_config_id = edge_config_id

    def get_item(self, key: str) -> dict | None:
        """Get an item from Edge Config."""
        try:
            return self.client._request(
                "GET",
                f"/v1/edge-config/{self.edge_config_id}/items/{key}",
            )
        except ValueError:
            return None

    def upsert_items(self, items: dict[str, dict]) -> dict:
        """Batch upsert items in Edge Config."""
        payload = [
            {"key": key, "value": value, "type": "json"}
            for key, value in items.items()
        ]
        return self.client._request(
            "PATCH",
            f"/v1/edge-config/{self.edge_config_id}/items",
            json={"items": payload},
        )

    def delete_item(self, key: str) -> None:
        """Delete an item from Edge Config."""
        try:
            self.client._request(
                "DELETE",
                f"/v1/edge-config/{self.edge_config_id}/items/{key}",
            )
        except ValueError:
            pass  # Already deleted
```

### BAD vs GOOD: Deployment

```python
# ❌ BAD — No status polling, assumes deployment is instant
client = VercelClient(token)
deploy = client.create_deployment("my-project", files)
print(f"Deployed to: {deploy.get('url')}")  # URL may be None!

# ✅ GOOD — Poll for READY status
client = VercelClient(token)
deploy = client.create_deployment("my-project", files)
deploy_id = deploy["id"]
url = client.wait_for_deployment(deploy_id)
print(f"Deployed to: https://{url}")
```

### BAD vs GOOD: File Upload Encoding

```python
# ❌ BAD — Plain text for binary files
content = open("image.png", "r").read()
file_entry = {"file": "image.png", "data": content}

# ✅ GOOD — Base64 encoding with explicit encoding field
import base64

with open("image.png", "rb") as f:
    encoded = base64.b64encode(f.read()).decode("utf-8")

file_entry = {
    "file": "image.png",
    "data": encoded,
    "encoding": "base64",
}
```

---

## Constraints

### MUST DO
- Use Vercel API tokens (not deployment tokens or OAuth) for programmatic access
- Poll `GET /v13/deployments/{id}` until `readyState == "READY"` before announcing a deployment
- Use `teamId` query parameter for team-owned projects — tokens are user-scoped by default
- Base64-encode binary file content in deployment uploads with `"encoding": "base64"`
- Use `target` parameter when setting environment variables to scope them to environments
- Use `vercel.json` to configure Python runtime paths and settings for serverless functions

### MUST NOT DO
- Hardcode API tokens in source code — use environment variables or a secrets manager
- Assume deployments are complete when the API returns — always poll for `READY` state
- Use the same token for personal and team projects without specifying `teamId`
- Upload files without specifying encoding — Vercel assumes UTF-8 text by default
- Forget to include `Content-Type: application/json` header — all REST endpoints require it

---

## Output Template

When implementing a Vercel API integration, structure your output as:

1. **Client Initialization** — HTTP client with Bearer token and optional `teamId`
2. **Project Management** — List/get projects, set env vars
3. **Deployment** — Upload files, create deployment, poll for `READY` state
4. **Domain Configuration** — Add/remove/list custom domains
5. **Environment Management** — Set, list, and manage environment variables per target
6. **Error Handling** — HTTP status codes: 401 (auth), 403 (scope), 404 (not found)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `netlify-api` | Netlify deployment API (complementary platform) |
| `cloudflare-api` | Cloudflare API for DNS and edge services |
| `aws-sdk` | AWS SDK patterns (Lambda + API Gateway similar to Vercel Functions) |
| `google-cloud-sdk` | Google Cloud SDK (Cloud Functions similar pattern) |

---

## Live References

- [Vercel REST API Reference](https://vercel.com/docs/rest-api) — Official API documentation
- [Vercel Python SDK (vercel-py)](https://github.com/vercel/vercel-py) — Python SDK for Blob, Sandbox, OIDC
- [Vercel Python Runtime Docs](https://vercel.com/docs/functions/runtimes/python) — Python Functions deployment guide
- [Vercel FastAPI Deployment Guide](https://vercel.com/docs/frameworks/backend/fastapi) — FastAPI on Vercel
- [Vercel API Endpoints Reference](https://vercel.com/docs/rest-api/endpoints) — All endpoint details
- [@vercel/sdk (TypeScript)](https://github.com/vercel/sdk) — Official TypeScript SDK (reference for endpoint shapes)
- [Vercel OIDC Tokens](https://vercel.com/docs/security/vercel-oidc) — OIDC authentication for deployments
