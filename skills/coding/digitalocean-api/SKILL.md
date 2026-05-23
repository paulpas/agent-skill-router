---
name: digitalocean-api
description: Integrates DigitalOcean services (Droplets, Spaces, Kubernetes, App Platform, Databases) using the PyDo Python client with token-based authentication and resource management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: digitalocean api, pydo, digitalocean python, droplets, spaces object storage, digitalocean kubernetes, app platform, how do i use digitalocean from python
  role: implementation
  scope: implementation
  output-format: code
  related-skills: aws-sdk, linode-api, cloudflare-api
---

# DigitalOcean API (PyDo) Integration Patterns

Integrates DigitalOcean services using the official PyDo Python client library. Covers token-based authentication, Droplet lifecycle management, Spaces (S3-compatible object storage), Kubernetes cluster provisioning, and App Platform deployments with DigitalOcean-specific pagination and action-waiting patterns.

## TL;DR Checklist

- [ ] Use `pydo.Client(token=...)` with a Personal Access Token (PAT) from the DigitalOcean control panel
- [ ] Set the `DIGITALOCEAN_TOKEN` environment variable for local development
- [ ] Use `client.droplets.create(body=...)` with a dict-based request body
- [ ] Wait for action completion using `client.actions.get()` with polling after resource creation
- [ ] For Spaces, use the S3-compatible API via `boto3` with DigitalOcean endpoint
- [ ] Use `client.kubernetes.create_cluster(body=...)` for DOKS clusters
- [ ] Handle `pydo.HttpResponseError` with status code checks for error recovery

---

## When to Use

Use this skill when:

- Provisioning and managing Droplets (virtual machines) from Python automation scripts
- Building CI/CD pipelines that deploy applications to DigitalOcean App Platform
- Managing Spaces object storage buckets for static assets and backups
- Creating and scaling DigitalOcean Kubernetes (DOKS) clusters programmatically
- Automating database cluster creation (PostgreSQL, MySQL, Redis) via API
- Implementing snapshot-based backup workflows for Droplets and volumes

---

## When NOT to Use

- For declarative infrastructure management (use Terraform DigitalOcean provider instead)
- For one-off operations via CLI (use `doctl` command-line tool)
- When you need to manage Docker registries or container images (use `doctl registry`)
- For simple Spaces file uploads that aren't programmatic (use Cyberduck or similar)

---

## Core Workflow

### 1. Authentication and Client Initialization

PyDo authenticates with a DigitalOcean Personal Access Token.

```python
import os
from pydo import Client
from pydo.http import HttpResponseError

# Initialize client with PAT from environment variable
token = os.environ.get("DIGITALOCEAN_TOKEN")
if not token:
    raise RuntimeError(
        "Set DIGITALOCEAN_TOKEN environment variable with your PAT"
    )

client = Client(token=token)
# Optional: set custom timeout for long-running operations
# Client(token=token, timeout=180)
```

**Checkpoint:** Verify connectivity with `client.droplets.list()`. A successful response returns a dict with a `droplets` key. Catch `HttpResponseError` with status 401 for token issues.

### 2. Droplet Creation with Action Waiting

Droplet creation is asynchronous — the initial call returns immediately, and actions must be polled to completion.

```python
import time


class DropletManager:
    """Manage DigitalOcean Droplets with action-waiting."""

    def __init__(self, token: str):
        self.client = Client(token=token)

    def create_droplet(
        self,
        name: str,
        region: str = "nyc1",
        size: str = "s-1vcpu-1gb",
        image: str = "ubuntu-24-04-x64",
        ssh_keys: list[str] | None = None,
    ) -> dict:
        """Create a Droplet and wait for it to become active."""
        req = {
            "name": name,
            "region": region,
            "size": size,
            "image": image,
        }
        if ssh_keys:
            req["ssh_keys"] = ssh_keys

        try:
            resp = self.client.droplets.create(body=req)
            droplet = resp["droplet"]

            # Wait for the creation action to complete
            action_id = resp["links"]["actions"][0]["id"]
            self._wait_for_action(action_id)

            return self.client.droplets.get(droplet["id"])["droplet"]

        except HttpResponseError as err:
            if err.status_code == 422:
                raise ValueError(
                    f"Invalid Droplet configuration: {err.error}"
                ) from err
            if err.status_code == 429:
                raise RuntimeError("API rate limited — retry with backoff") from err
            raise

    def _wait_for_action(self, action_id: int, timeout: int = 300) -> dict:
        """Poll for action completion. Raises TimeoutError if not completed."""
        start = time.time()
        while time.time() - start < timeout:
            resp = self.client.actions.get(action_id=action_id)
            status = resp["action"]["status"]
            if status == "completed":
                return resp["action"]
            if status == "errored":
                raise RuntimeError(
                    f"Action {action_id} failed: {resp['action']}"
                )
            time.sleep(5)  # Poll interval
        raise TimeoutError(f"Action {action_id} did not complete in {timeout}s")

    def list_droplets(self) -> list[dict]:
        """List all Droplets with pagination."""
        try:
            resp = self.client.droplets.list()
            return resp.get("droplets", [])
        except HttpResponseError as err:
            raise RuntimeError(
                f"Failed to list Droplets: {err.error}"
            ) from err

    def delete_droplet(self, droplet_id: int) -> None:
        """Delete a Droplet by ID."""
        try:
            self.client.droplets.delete(droplet_id=droplet_id)
        except HttpResponseError as err:
            if err.status_code == 404:
                return  # Already deleted — idempotent
            raise
```

**Checkpoint:** Action IDs are returned in `resp["links"]["actions"]` for creation operations. Always wait for `completed` status before using the resource. The `_wait_for_action` pattern applies to most state-changing DO API calls.

### 3. Kubernetes Cluster (DOKS) Provisioning

```python
class KubernetesManager:
    """Manage DigitalOcean Kubernetes clusters."""

    def __init__(self, token: str):
        self.client = Client(token=token)

    def create_cluster(
        self,
        name: str,
        region: str = "nyc1",
        version: str = "1.30.6-do.0",
        node_count: int = 3,
        node_size: str = "s-2vcpu-4gb",
    ) -> dict:
        """Create a Kubernetes cluster with a single node pool."""
        req = {
            "name": name,
            "region": region,
            "version": version,
            "node_pools": [
                {
                    "size": node_size,
                    "count": node_count,
                    "name": f"{name}-pool",
                }
            ],
        }

        try:
            resp = self.client.kubernetes.create_cluster(body=req)
            return resp["kubernetes_cluster"]
        except HttpResponseError as err:
            if err.status_code == 422:
                raise ValueError(
                    f"Invalid cluster config: {err.error}"
                ) from err
            raise

    def get_kubeconfig(self, cluster_id: str) -> str:
        """Retrieve kubeconfig for a cluster (uses raw HTTPS due to PyDo bug)."""
        from http.client import HTTPSConnection

        conn = HTTPSConnection("api.digitalocean.com")
        conn.request(
            "GET",
            f"/v2/kubernetes/clusters/{cluster_id}/kubeconfig",
            headers={"Authorization": f"Bearer {self.client._token}"},
        )
        response = conn.getresponse()
        if response.status != 200:
            raise RuntimeError(f"Failed to get kubeconfig: {response.status}")
        return response.read().decode("utf-8")
```

**Checkpoint:** `get_kubeconfig` returns YAML content. PyDo has a known issue deserializing YAML responses — use the raw HTTPS approach shown above. Cluster creation takes 5-15 minutes.

### 4. Spaces (S3-Compatible Object Storage)

DigitalOcean Spaces uses an S3-compatible API accessible via standard `boto3`.

```python
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


class SpacesManager:
    """Manage DigitalOcean Spaces using S3-compatible API."""

    def __init__(self, token: str, region: str = "nyc3"):
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{region}.digitaloceanspaces.com",
            aws_access_key_id=token,  # Spaces Access Key
            aws_secret_access_key=token,  # Spaces Secret Key
            config=Config(
                signature_version="s3v4",
                region_name=region,
                connect_timeout=10,
                read_timeout=30,
            ),
        )

    def create_bucket(self, bucket_name: str) -> bool:
        """Create a Space (bucket). Returns True if created."""
        try:
            self.client.create_bucket(Bucket=bucket_name)
            return True
        except ClientError as err:
            if err.response["Error"]["Code"] == "BucketAlreadyExists":
                return False
            raise

    def upload_file(
        self, bucket_name: str, key: str, data: bytes, acl: str = "private"
    ) -> str:
        """Upload data to a Space. Returns the object URL."""
        self.client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=data,
            ACL=acl,
        )
        return f"{self.client._endpoint.url}/{bucket_name}/{key}"

    def list_objects(self, bucket_name: str) -> list[str]:
        """List all object keys in a Space."""
        try:
            response = self.client.list_objects_v2(Bucket=bucket_name)
            return [obj["Key"] for obj in response.get("Contents", [])]
        except ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchBucket":
                return []
            raise
```

**Checkpoint:** Spaces uses a different auth model than DO API tokens. You need a Spaces Access Key and Secret Key (created separately in the DO Control Panel). Always use `s3v4` signature version.

---

## Implementation Patterns

### Pattern 1: App Platform Deployment

```python
def create_app(
    token: str,
    app_spec: dict,
) -> dict:
    """Create a DigitalOcean App Platform app from an app spec."""
    client = Client(token=token)

    try:
        resp = client.apps.create(body=app_spec)
        return resp["app"]
    except HttpResponseError as err:
        if err.status_code == 422:
            raise ValueError(
                f"Invalid app spec: {err.error.message}"
            ) from err
        raise


def create_app_spec(
    name: str,
    repo_url: str,
    region: str = "nyc",
) -> dict:
    """Generate an App Platform spec for a Python web service."""
    return {
        "spec": {
            "name": name,
            "region": region,
            "services": [
                {
                    "name": "web",
                    "github": {
                        "repo": repo_url,
                        "branch": "main",
                    },
                    "run_command": "gunicorn app:app",
                    "http_port": 8000,
                    "instance_size_slug": "professional-xs",
                    "instance_count": 1,
                }
            ],
        }
    }
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Swallow all errors without distinction
from pydo import Client
client = Client(token="mytoken")
try:
    resp = client.droplets.create(body={...})
except Exception:
    print("Failed to create droplet")

# ✅ GOOD — Handle specific HTTP status codes
from pydo.http import HttpResponseError

try:
    resp = client.droplets.create(body={...})
except HttpResponseError as err:
    if err.status_code == 401:
        raise PermissionError("Invalid or expired DO API token") from err
    if err.status_code == 422:
        # Validation error — the request body has issues
        raise ValueError(f"Invalid request: {err.error}") from err
    if err.status_code == 429:
        raise RuntimeError("Rate limited — slow down") from err
    raise  # Unexpected error
```

### BAD vs GOOD: Action Waiting

```python
# ❌ BAD — No action waiting, assumes resource is ready immediately
resp = client.droplets.create(body={...})
droplet_id = resp["droplet"]["id"]
# Droplet may not be ready yet!

# ✅ GOOD — Wait for action completion before proceeding
resp = client.droplets.create(body={...})
action_id = resp["links"]["actions"][0]["id"]
# Poll actions.get() until status == "completed"
wait_for_action(client, action_id)
droplet = client.droplets.get(droplet_id)["droplet"]
```

---

## Constraints

### MUST DO
- Use Personal Access Tokens (PAT) with the least privilege scope needed for the operation
- Wait for action completion after any resource creation (Droplet, volume, snapshot) before using the resource
- Handle `HttpResponseError` with status code branching: 401 (auth), 404 (not found), 422 (validation), 429 (rate limit)
- Use `client.actions.get()` to poll action status — DO is eventually consistent
- Set `DIGITALOCEAN_TOKEN` environment variable for development — never hardcode tokens
- Use Spaces Access Keys (not DO API tokens) for S3-compatible Spaces operations

### MUST NOT DO
- Hardcode API tokens in source code — use environment variables or a secrets manager
- Assume resources are ready immediately after creation — always wait for action completion
- Use DO API tokens for Spaces authentication — they use a separate credential system
- Use `list_objects_v2` without checking for `Contents` key — empty buckets return no contents
- Ignore rate limiting (429) — implement exponential backoff for production automation

---

## Output Template

When implementing a DigitalOcean API integration, structure your output as:

1. **Client Initialization** — `Client(token=...)` with PAT from env var
2. **Resource Creation** — Dict-based request body with required parameters
3. **Action Waiting** — Poll `actions.get()` until `status == "completed"`
4. **Error Handling** — `HttpResponseError` with status code branching
5. **Data Operations** — Spaces via S3-compatible `boto3` client
6. **Return Value** — Parsed response dict with relevant fields

---

## Related Skills

| Skill | Purpose |
|---|---|
| `linode-api` | Linode/Akamai cloud API patterns |
| `aws-sdk` | AWS SDK patterns (Spaces uses S3-compatible API) |
| `cloudflare-api` | Cloudflare API for DNS and edge services |
| `vercel-api` | Vercel deployment API patterns |

---

## Live References

- [PyDo Python Client Documentation](https://docs.digitalocean.com/reference/pydo/reference/) — Official DO Python SDK reference
- [PyDo GitHub Repository](https://github.com/digitalocean/pydo) — Source code and examples
- [DigitalOcean API Reference](https://docs.digitalocean.com/reference/api/) — Complete REST API documentation
- [Spaces S3 API Reference](https://docs.digitalocean.com/products/spaces/reference/) — Spaces S3-compatible endpoints
- [DOKS API Reference](https://docs.digitalocean.com/products/kubernetes/reference/api/) — Kubernetes API endpoints
- [DigitalOcean Python Examples](https://github.com/digitalocean/pydo/tree/main/examples) — Example scripts for Droplets, volumes, and more
- [doctl Reference](https://docs.digitalocean.com/reference/doctl/) — DO CLI tool (complementary)
