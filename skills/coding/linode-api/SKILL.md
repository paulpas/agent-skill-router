---
name: linode-api
description: Integrates Linode/Akamai Cloud services (Instances, Object Storage, LKE
  Kubernetes, NodeBalancers) using the linode_api4 Python SDK with token-based authentication
  and model-driven resource patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: linode api, akamai cloud, linode python, linode instances, linode kubernetes,
    nodebalancer, object storage, how do i use linode api from python
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
  related-skills: digitalocean-api, aws-sdk, cloudflare-api
------
# Linode/Akamai Cloud API Integration Patterns

Integrates Linode (Akamai Connected Cloud) services using the official `linode_api4` Python SDK. Covers Personal Access Token authentication, Linode Instance lifecycle, Object Storage (S3-compatible), Linode Kubernetes Engine (LKE) cluster management, and NodeBalancer configuration with the SDK's model-driven design and filtering system.

## TL;DR Checklist

- [ ] Use `LinodeClient(token)` with a Personal Access Token from the Cloud Manager
- [ ] Use grouped accessors: `client.linode.instances()`, `client.lke.clusters()`, `client.networking.nodebalancers()`
- [ ] Use model attributes for filtering: `Instance.region == "us-east"`
- [ ] Handle `ApiError` with specific HTTP status codes for error recovery
- [ ] Use `client.linode.instance_create()` for provisioning Linodes with root password auto-generation
- [ ] Use `client.lke.cluster_create()` for managed Kubernetes clusters

---

## When to Use

Use this skill when:

- Provisioning and managing Linode virtual machine instances from Python
- Building automated deployment workflows that need compute, storage, and networking
- Creating and scaling LKE (Linode Kubernetes Engine) clusters for containerized workloads
- Managing NodeBalancers for load-balanced application deployments
- Implementing automated backup and snapshot strategies for Linode instances
- Storing and retrieving objects in Object Storage buckets

---

## When NOT to Use

- For declarative infrastructure management (use Terraform Linode provider)
- For one-off CLI operations (use `linode-cli`)
- When you need infrastructure abstraction across multiple cloud providers (use cross-cloud libraries)
- For simple DNS record management at scale (use the API directly or terraform)

---

## Core Workflow

### 1. Authentication and Client Initialization

`linode_api4` authenticates with a Personal Access Token (PAT) and returns model objects.

```python
import os
from linode_api4 import LinodeClient, LinodeLoginClient
from linode_api4.errors import ApiError

# Create the API client with a PAT
token = os.environ.get("LINODE_TOKEN")
if not token:
    raise RuntimeError("Set LINODE_TOKEN environment variable")

# Global client — recommended for most use cases
client = LinodeClient(token)
```

**Checkpoint:** Verify connectivity: `client.linode.instances()`. A successful call returns a `PaginatedList` object. Catch `ApiError` with status 401 for invalid tokens.

### 2. Linode Instance Lifecycle

The SDK uses model objects and grouped accessors for all resource operations.

```python
class LinodeManager:
    """Manage Linode instances with model-driven API."""

    def __init__(self, token: str):
        self.client = LinodeClient(token)

    def create_instance(
        self,
        label: str,
        region: str = "us-east",
        image: str = "linode/ubuntu24.04",
        type_code: str = "g6-nanode-1",
        authorized_keys: list[str] | None = None,
    ) -> tuple:
        """Create a Linode instance. Returns (instance, root_password)."""
        try:
            instance, password = self.client.linode.instance_create(
                ltype=type_code,
                region=region,
                image=image,
                label=label,
                authorized_keys=authorized_keys,
            )
            return instance, password

        except ApiError as err:
            if err.status == 400:
                raise ValueError(
                    f"Invalid instance configuration: {err}"
                ) from err
            if err.status == 429:
                raise RuntimeError("API rate limited — retry later") from err
            raise

    def list_instances(self, region: str | None = None) -> list:
        """List instances, optionally filtered by region."""
        from linode_api4 import Instance

        try:
            if region:
                return list(
                    self.client.linode.instances(
                        Instance.region == region
                    )
                )
            return list(self.client.linode.instances())

        except ApiError as err:
            raise RuntimeError(
                f"Failed to list instances: {err}"
            ) from err

    def get_instance(self, instance_id: int):
        """Get an instance by ID."""
        from linode_api4 import Instance

        return Instance(self.client, instance_id)

    def delete_instance(self, instance_id: int) -> None:
        """Delete an instance by ID."""
        from linode_api4 import Instance

        try:
            inst = Instance(self.client, instance_id)
            inst.delete()
        except ApiError as err:
            if err.status == 404:
                return  # Already deleted
            raise
```

**Checkpoint:** `instance_create` returns a tuple `(Instance, root_password)`. The root password is only returned once during creation — save it securely. If `authorized_keys` is provided, password auth is disabled.

### 3. LKE (Linode Kubernetes Engine) Cluster Management

```python
class LKEManager:
    """Manage Linode Kubernetes Engine clusters."""

    def __init__(self, token: str):
        self.client = LinodeClient(token)

    def create_cluster(
        self,
        label: str,
        region: str,
        node_type: str,
        node_count: int = 3,
    ) -> object:
        """Create an LKE cluster with one node pool."""
        try:
            # Get the first available kube version
            kube_version = self.client.lke.versions()[0]

            cluster = self.client.lke.cluster_create(
                region=region,
                label=label,
                kube_version=kube_version,
                node_pools=[
                    self.client.lke.node_pool(
                        node_type, node_count
                    )
                ],
            )
            return cluster

        except ApiError as err:
            if err.status == 400:
                raise ValueError(
                    f"Invalid cluster configuration: {err}"
                ) from err
            raise

    def get_kubeconfig(self, cluster_id: int) -> str:
        """Download kubeconfig for a cluster."""
        from linode_api4 import LKECluster

        cluster = LKECluster(self.client, cluster_id)
        kubeconfig = cluster.kubeconfig
        return kubeconfig  # Returns kubeconfig YAML string

    def list_clusters(self) -> list:
        """List all LKE clusters."""
        try:
            return list(self.client.lke.clusters())
        except ApiError as err:
            raise RuntimeError(
                f"Failed to list clusters: {err}"
            ) from err
```

**Checkpoint:** `lke.cluster_create` is a long-running operation. The SDK handles polling internally. Kubeconfig is returned as a YAML string — write it to a file for `kubectl` use.

### 4. Object Storage (S3-Compatible)

Linode Object Storage uses an S3-compatible API.

```python
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


class ObjectStorageManager:
    """Manage Linode Object Storage using S3-compatible API."""

    def __init__(self, access_key: str, secret_key: str, region: str = "us-east-1"):
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{region}.linodeobjects.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(
                signature_version="s3v4",
                region_name=region,
                connect_timeout=10,
                read_timeout=30,
            ),
        )

    def create_bucket(self, bucket_name: str) -> bool:
        """Create an Object Storage bucket."""
        try:
            self.client.create_bucket(Bucket=bucket_name)
            return True
        except ClientError as err:
            if err.response["Error"]["Code"] == "BucketAlreadyExists":
                return False
            raise

    def upload_object(self, bucket_name: str, key: str, data: bytes) -> str:
        """Upload data to Object Storage."""
        try:
            self.client.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=data,
                ACL="private",
            )
            return f"https://{bucket_name}.{self.client.meta.endpoint_url.host}/{key}"
        except ClientError as err:
            raise RuntimeError(
                f"Failed to upload {key}: {err}"
            ) from err

    def list_objects(self, bucket_name: str, prefix: str = "") -> list[str]:
        """List objects with optional prefix."""
        kwargs = {"Bucket": bucket_name}
        if prefix:
            kwargs["Prefix"] = prefix

        try:
            response = self.client.list_objects_v2(**kwargs)
            return [obj["Key"] for obj in response.get("Contents", [])]
        except ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchBucket":
                return []
            raise
```

**Checkpoint:** Object Storage requires separate access keys created in the Linode Cloud Manager. Use the S3-compatible endpoint format: `https://{region}.linodeobjects.com`.

---

## Implementation Patterns

### Pattern 1: NodeBalancer Configuration

```python
def create_nodebalancer(
    client: LinodeClient,
    label: str,
    region: str,
    backend_ips: list[str],
    port: int = 80,
) -> object:
    """Create a NodeBalancer with a backend configuration."""
    from linode_api4 import NodeBalancer

    try:
        nb = client.nodebalancer_create(region=region, label=label)
        config = nb.config_create(
            port=port,
            protocol="http",
            algorithm="roundrobin",
            check="http",
            check_path="/health",
        )

        for ip in backend_ips:
            config.node_create(
                address=f"{ip}:{port}",
                label=f"backend-{ip}",
                weight=1,
            )

        return nb
    except ApiError as err:
        raise RuntimeError(
            f"Failed to create NodeBalancer: {err}"
        ) from err
```

### Pattern 2: Instance with Filtering (SQLAlchemy-Style)

```python
from linode_api4 import Instance
from linode_api4 import and_, or_


def find_instances_by_tags(client: LinodeClient, tags: list[str]) -> list:
    """Find instances matching all specified tags."""
    from functools import reduce

    filters = [Instance.tags.contains(tag) for tag in tags]
    combined = reduce(and_, filters)

    return list(client.linode.instances(combined))


def find_production_web_servers(client: LinodeClient) -> list:
    """Find instances tagged 'production' and 'web'."""
    return list(
        client.linode.instances(
            and_(
                Instance.tags.contains("production"),
                Instance.tags.contains("web"),
                Instance.status == "running",
            )
        )
    )
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Catch-all exception handling
from linode_api4 import LinodeClient
client = LinodeClient("token")
try:
    inst, pw = client.linode.instance_create(...)
except Exception as e:
    print(f"Creation failed: {e}")

# ✅ GOOD — Specific ApiError with status code handling
from linode_api4.errors import ApiError

try:
    inst, pw = client.linode.instance_create(...)
except ApiError as err:
    if err.status == 400:
        # Validation error — fix the request
        raise ValueError(f"Bad request: {err}") from err
    if err.status == 429:
        # Rate limit — implement backoff
        raise RuntimeError("Rate limited") from err
    if err.status == 403:
        raise PermissionError("Token lacks required scopes") from err
    raise
```

### BAD vs GOOD: Instance Deletion

```python
# ❌ BAD — No error handling for already-deleted instances
instance = client.load(Instance, 12345)
instance.delete()

# ✅ GOOD — Handle 404 for idempotent deletion
from linode_api4 import Instance
from linode_api4.errors import ApiError

try:
    instance = Instance(client, 12345)
    instance.delete()
except ApiError as err:
    if err.status == 404:
        pass  # Already deleted — intended outcome
    else:
        raise
```

---

## Constraints

### MUST DO
- Use Personal Access Tokens with scoped permissions — create separate tokens for read-only and write operations
- Use the grouped API pattern: `client.linode.*`, `client.lke.*`, `client.networking.*` for intuitive access
- Use model-based filtering (`Instance.region == "us-east"`) instead of manual filtering
- Handle `ApiError` with specific status codes: 400 (validation), 403 (permissions), 404 (not found), 429 (rate limit)
- Generate Object Storage access keys separately from the main API token (S3-compatible API uses different auth)
- Use `client.linode.instance_create()` which auto-generates passwords instead of manual disk/profile/config setup

### MUST NOT DO
- Hardcode API tokens in source code — use environment variables or a secrets manager
- Assume successful operations — every API call can fail (quotas, rate limits, permissions)
- Forget to save the root password from `instance_create` — it's only returned once
- Use the API token for Object Storage S3 operations — they use separate access/secret key pairs
- Mix synchronous and async patterns in the same client — `linode_api4` is synchronous

---

## Output Template

When implementing a Linode API integration, structure your output as:

1. **Client Initialization** — `LinodeClient(token)` creation
2. **Resource Access** — Grouped API call (`client.linode.*`, `client.lke.*`)
3. **Model Construction** — Create resources using SDK-provided constructors
4. **Error Handling** — `ApiError` with status code branching
5. **Filtering** — Model attribute filters for collection queries
6. **Return Value** — Model objects with typed properties and methods

---

## Related Skills

| Skill | Purpose |
|---|---|
| `digitalocean-api` | DigitalOcean API patterns (similar VM + K8s model) |
| `aws-sdk` | AWS SDK patterns (Object Storage S3-compatible API) |
| `cloudflare-api` | Cloudflare API for DNS and edge services |
| `linode-api` | Self-reference for Linode-specific patterns |

---

## Live References

- [linode_api4 Python SDK Documentation](https://linode-api4.readthedocs.io/en/latest/) — Official SDK reference
- [linode_api4 GitHub Repository](https://github.com/linode/linode_api4-python) — Source code and examples
- [Linode API v4 Reference](https://techdocs.akamai.com/linode-api/reference/api) — Complete REST API documentation
- [Linode Object Storage Endpoints](https://techdocs.akamai.com/linode-api/reference/object-storage) — S3-compatible endpoint reference
- [LKE Documentation](https://www.linode.com/docs/products/compute/kubernetes/) — Linode Kubernetes Engine guides
- [Getting Started with linode_api4](https://www.linode.com/docs/products/tools/api/guides/python/) — Quickstart tutorial
- [Linode CLI Reference](https://www.linode.com/docs/products/tools/cli/) — Complementary CLI tool
