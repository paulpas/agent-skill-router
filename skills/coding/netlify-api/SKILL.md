---




name: netlify-api
description: Integrates Netlify services (Sites, Builds, Functions, Forms, Identity)
  using the Netlify REST API with Python, covering token-based authentication, site
  management, deployment workflows, and serverless function deployment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: netlify api, netlify python, netlify deployments, netlify functions, netlify
    forms, netlify sites, how do i use netlify api from python
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
  related-skills: vercel-api, cloudflare-api, aws-sdk




---




# Netlify API Integration Patterns

Integrates Netlify services using the Netlify REST API (`api.netlify.com/api/v1`) with Python. Covers Personal Access Token authentication, site creation and management, atomic deploys (file digest and ZIP methods), serverless function deployment, form submission handling, and build hook management patterns.

## TL;DR Checklist

- [ ] Use Netlify Personal Access Tokens from User Settings → Applications
- [ ] Use the REST API at `https://api.netlify.com/api/v1` with Bearer token auth
- [ ] Use the file digest method for deploys (SHA1 for files, SHA256 for functions)
- [ ] Use `POST /api/v1/sites/{site_id}/deploys` with ZIP body for simple deploys
- [ ] Use `POST /api/v1/hooks` to create build hooks for external deploy triggers
- [ ] Handle HTTP 401 (auth), 404 (not found), 422 (validation) errors explicitly
- [ ] Use `netlify-python` community SDK for higher-level abstractions

---

## When to Use

Use this skill when:

- Automating site creation and deployment from CI/CD pipelines
- Deploying serverless functions alongside static sites programmatically
- Managing multiple Netlify sites across teams from Python scripts
- Building custom deployment workflows that bypass Git integration
- Creating build hooks for external deployment triggers (webhooks)
- Handling form submissions and managing form data via API
- Automating site configuration (environment variables, redirects, headers)

---

## When NOT to Use

- For standard Git-connected sites (use Netlify's automatic Git integration)
- For one-off manual operations (use Netlify CLI or Dashboard)
- For large-scale infrastructure-as-code (use Terraform or Netlify's team settings)
- When you need real-time deploy logs (use Netlify Dashboard or CLI)

---

## Core Workflow

### 1. Authentication and API Client

Netlify REST API uses Bearer token authentication with Personal Access Tokens.

```python
import os
import httpx
from httpx import HTTPStatusError


class NetlifyClient:
    """HTTP client for the Netlify REST API."""

    BASE_URL = "https://api.netlify.com/api/v1"

    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get("NETLIFY_TOKEN")
        if not self.token:
            raise RuntimeError(
                "Set NETLIFY_TOKEN environment variable with your PAT"
            )
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs) -> dict | list:
        """Make an API request with error handling."""
        url = f"{self.BASE_URL}{path}"
        with httpx.Client() as client:
            try:
                response = client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    **kwargs,
                )
                response.raise_for_status()
                return response.json()
            except HTTPStatusError as err:
                if err.response.status_code == 401:
                    raise PermissionError(
                        "Invalid or expired Netlify PAT"
                    ) from err
                if err.response.status_code == 404:
                    raise ValueError(
                        f"Resource not found: {path}"
                    ) from err
                if err.response.status_code == 422:
                    raise ValueError(
                        f"Validation error: {err.response.text}"
                    ) from err
                raise
```

**Checkpoint:** Create a PAT at User Settings → Applications → Personal Access Tokens. Test with `GET /sites`. A successful response returns a list of sites.

### 2. Site Management

```python
class SiteManager(NetlifyClient):
    """Manage Netlify sites."""

    def list_sites(self) -> list[dict]:
        """List all sites accessible to the token."""
        result = self._request("GET", "/sites")
        return result if isinstance(result, list) else []

    def get_site(self, site_id: str) -> dict:
        """Get site details by ID."""
        try:
            return self._request("GET", f"/sites/{site_id}")
        except ValueError:
            raise FileNotFoundError(f"Site '{site_id}' not found") from None

    def create_site(
        self,
        name: str,
        custom_domain: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Create a new Netlify site."""
        payload: dict = {"name": name}
        if custom_domain:
            payload["custom_domain"] = custom_domain
        if password:
            payload["password"] = password

        return self._request("POST", "/sites", json=payload)

    def create_site_in_team(self, account_slug: str, name: str) -> dict:
        """Create a site in a specific team account."""
        return self._request(
            "POST",
            f"/{account_slug}/sites",
            json={"name": name},
        )

    def update_site(self, site_id: str, updates: dict) -> dict:
        """Update site configuration."""
        return self._request("PATCH", f"/sites/{site_id}", json=updates)

    def delete_site(self, site_id: str) -> None:
        """Delete a site."""
        try:
            self._request("DELETE", f"/sites/{site_id}")
        except ValueError:
            pass  # Already deleted — idempotent
```

**Checkpoint:** Site names are used for the Netlify subdomain (`{name}.netlify.app`). They must be globally unique across all Netlify users. Set `force_ssl: true` in updates to enable HTTPS.

### 3. Atomic Deploy (File Digest Method)

The file digest method uploads a manifest of files, then only uploads files Netlify doesn't already have.

```python
import hashlib
import os


class DeployManager(NetlifyClient):
    """Manage Netlify deployments."""

    def _hash_file(self, filepath: str) -> str:
        """Compute SHA1 hash (files) or SHA256 (functions) for deploy digest."""
        sha = hashlib.sha1()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha.update(chunk)
        return sha.hexdigest()

    def _build_file_digest(self, directory: str) -> list[dict]:
        """Build a file digest manifest for a directory."""
        files = []
        for root, dirs, filenames in os.walk(directory):
            for filename in filenames:
                filepath = os.path.join(root, filename)
                relpath = os.path.relpath(filepath, directory)
                files.append({
                    "path": relpath,
                    "sha1": self._hash_file(filepath),
                    "size": os.path.getsize(filepath),
                })
        return files

    def create_deploy(self, site_id: str, directory: str) -> dict:
        """Create a deploy using file digest method."""
        files = self._build_file_digest(directory)

        # Step 1: Send the digest — Netlify responds with required uploads
        result = self._request(
            "POST",
            f"/sites/{site_id}/deploys",
            json={"files": {f["path"]: f["sha1"] for f in files}},
        )

        deploy_id = result["id"]
        required = result.get("required", [])

        # Step 2: Upload files that Netlify doesn't have
        if required:
            for file_entry in files:
                if file_entry["path"] in required:
                    self._upload_deploy_file(
                        deploy_id, file_entry["path"], directory
                    )

        # Step 3: Wait for deploy to complete
        return self._wait_for_deploy(deploy_id)

    def _upload_deploy_file(
        self, deploy_id: str, file_path: str, base_dir: str
    ) -> None:
        """Upload a single file to a pending deploy."""
        full_path = os.path.join(base_dir, file_path)
        url = f"/deploys/{deploy_id}/files/{file_path}"

        with httpx.Client() as client:
            with open(full_path, "rb") as f:
                response = client.put(
                    f"{self.BASE_URL}{url}",
                    headers={"Authorization": f"Bearer {self.token}"},
                    content=f.read(),
                )
                response.raise_for_status()

    def _wait_for_deploy(
        self, deploy_id: str, timeout: int = 300
    ) -> dict:
        """Poll deploy until it's ready."""
        import time

        start = time.time()
        while time.time() - start < timeout:
            deploy = self._request("GET", f"/deploys/{deploy_id}")
            state = deploy.get("state")
            if state == "ready":
                return deploy
            if state in ("error", "canceled"):
                raise RuntimeError(
                    f"Deploy {deploy_id} failed with state: {state}"
                )
            time.sleep(3)

        raise TimeoutError(f"Deploy {deploy_id} not ready in {timeout}s")

    def list_deploys(self, site_id: str) -> list[dict]:
        """List all deploys for a site."""
        result = self._request("GET", f"/sites/{site_id}/deploys")
        return result if isinstance(result, list) else []
```

**Checkpoint:** The file digest method requires two API calls: first `POST` the manifest, then `PUT` only the required files. Functions use SHA256 instead of SHA1. Upload function files to `/deploys/{id}/functions/{name}`.

### 4. ZIP Deploy Method (Simpler Alternative)

```python
def deploy_zip(self, site_id: str, zip_path: str) -> dict:
    """Deploy a ZIP file containing the entire site."""
    url = f"{self.BASE_URL}/sites/{site_id}/deploys"
    with httpx.Client() as client:
        with open(zip_path, "rb") as f:
            response = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/zip",
                },
                content=f.read(),
            )
            response.raise_for_status()
            return self._wait_for_deploy(response.json()["id"])
```

---

## Implementation Patterns

### Pattern 1: Serverless Function Deployment

```python
import zipfile
from io import BytesIO


class FunctionsManager(NetlifyClient):
    """Deploy Netlify Functions."""

    def deploy_function(
        self, site_id: str, function_name: str, source_code: str
    ) -> dict:
        """Deploy a JavaScript/Python serverless function."""
        # Step 1: Create a pending deploy
        deploy = self._request(
            "POST",
            f"/sites/{site_id}/deploys",
            json={"files": {}},  # No static files, just functions
        )
        deploy_id = deploy["id"]

        # Step 2: Create function as ZIP
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(
                f"{function_name}.js",
                source_code,
            )
        zip_buffer.seek(0)

        # Step 3: Upload function
        url = f"{self.BASE_URL}/deploys/{deploy_id}/functions/{function_name}"
        with httpx.Client() as client:
            response = client.put(
                url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/zip",
                },
                content=zip_buffer.getvalue(),
            )
            response.raise_for_status()

        return self._wait_for_deploy(deploy_id)
```

### Pattern 2: Build Hook Trigger

```python
def create_build_hook(
    client: NetlifyClient,
    site_id: str,
    title: str,
    branch: str = "main",
) -> dict:
    """Create a build hook that triggers a deploy."""
    return client._request(
        "POST",
        f"/sites/{site_id}/build_hooks",
        json={"title": title, "branch": branch},
    )


def trigger_build_hook(hook_url: str) -> bool:
    """Trigger a deploy via a build hook URL (no auth needed)."""
    import httpx

    try:
        response = httpx.post(hook_url)
        response.raise_for_status()
        return True
    except httpx.HTTPStatusError as err:
        raise RuntimeError(
            f"Build hook trigger failed: {err.response.status_code}"
        ) from err


def list_build_hooks(client: NetlifyClient, site_id: str) -> list[dict]:
    """List all build hooks for a site."""
    return client._request("GET", f"/sites/{site_id}/build_hooks")
```

### Pattern 3: Environment Variables Management

```python
def set_env_var(
    client: NetlifyClient,
    site_id: str,
    key: str,
    value: str,
    scopes: list[str] | None = None,
) -> dict:
    """Set an environment variable for a site."""
    payload = {
        "key": key,
        "value": value,
    }
    if scopes:
        payload["scopes"] = scopes  # e.g., ["builds", "functions", "runtime"]

    return client._request(
        "POST",
        f"/sites/{site_id}/env",
        json=payload,
    )


def list_env_vars(client: NetlifyClient, site_id: str) -> list[dict]:
    """List all environment variables for a site."""
    return client._request("GET", f"/sites/{site_id}/env")
```

### BAD vs GOOD: File Digest Deployment

```python
# ❌ BAD — Uploads all files every time, even if unchanged
def naive_deploy(site_id: str, directory: str):
    files = {}
    for f in os.listdir(directory):
        with open(os.path.join(directory, f), "rb") as fh:
            files[f] = fh.read()

    requests.post(
        f"https://api.netlify.com/api/v1/sites/{site_id}/deploys",
        headers={"Authorization": "Bearer token"},
        json={"files": files},
    )

# ✅ GOOD — Uses digest to upload only changed files
def efficient_deploy(client: NetlifyClient, site_id: str, directory: str):
    deploy_mgr = DeployManager(token=client.token)
    deploy = deploy_mgr.create_deploy(site_id, directory)
    print(f"Deployed: https://{deploy['ssl_url']}")
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Generic except, no error type distinction
try:
    response = httpx.get(
        "https://api.netlify.com/api/v1/sites",
        headers={"Authorization": "Bearer token"},
    )
except Exception as e:
    print(f"Error: {e}")

# ✅ GOOD — Handle specific HTTP errors with recovery
from httpx import HTTPStatusError

try:
    response = httpx.get(url, headers=headers)
    response.raise_for_status()
except HTTPStatusError as err:
    if err.response.status_code == 401:
        raise PermissionError("Netlify token is invalid or expired") from err
    if err.response.status_code == 404:
        raise FileNotFoundError(f"Site not found") from err
    if err.response.status_code == 422:
        raise ValueError(f"Validation error: {err.response.text}") from err
    raise
```

---

## Constraints

### MUST DO
- Use Personal Access Tokens (PAT) for API authentication — never use OAuth tokens in scripts
- Use the file digest method for deploys (SHA1 for static files, SHA256 for functions) — it only uploads changed files
- Use the ZIP deploy method for simple single-file deployments or first-time deploys
- Poll deploy state until `"ready"` before announcing deployment completion
- Handle HTTP 401 (invalid token), 404 (not found), and 422 (validation) errors specifically
- Store API tokens in environment variables — never hardcode in source

### MUST NOT DO
- Use PATs with more permissions than needed — create scoped tokens for specific operations
- Upload all files on every deploy — always use the digest method for efficiency
- Assume deploys complete instantly — always poll for `ready` state
- Use the same token for personal and team operations without the account slug
- Forget to ZIP serverless functions before uploading — Netlify requires zipped function code

---

## Output Template

When implementing a Netlify API integration, structure your output as:

1. **Client Initialization** — HTTP client with Bearer token auth
2. **Site Management** — Create, list, get, update, delete sites
3. **Deploy** — File digest method: POST manifest → PUT missing files → poll for ready
4. **Functions** — ZIP function code → PUT to deploy → poll completion
5. **Build Hooks** — Create hooks, trigger via webhook URL (no auth)
6. **Environment Variables** — Set/list env vars per site
7. **Error Handling** — HTTP status codes with specific recovery

---

## Related Skills

| Skill | Purpose |
|---|---|
| `vercel-api` | Vercel deployment API (complementary platform) |
| `cloudflare-api` | Cloudflare API for DNS and edge services |
| `aws-sdk` | AWS SDK patterns (Lambda similar to Netlify Functions) |
| `digitalocean-api` | DigitalOcean API patterns (App Platform similar) |

---

## Live References

- [Netlify API Documentation](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/) — Official API getting started guide
- [Netlify OpenAPI Spec](https://open-api.netlify.com/) — Complete API reference
- [Netlify Python SDK (netlify-python)](https://github.com/cbrews/netlify-python) — Community Python client library
- [Netlify Functions API Reference](https://docs.netlify.com/build/functions/api/) — Serverless function deployment API
- [Netlify REST API Reference (Unofficial)](https://netlify.rest/) — Curated API endpoint reference
- [Netlify CLI Reference](https://docs.netlify.com/cli/get-started/) — Complementary CLI tool
- [Netlify Deploy API Guide](https://docs.netlify.com/api-and-cli-guides/api-guides/deploy-with-api/) — Deploy workflow details
