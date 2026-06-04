---




name: cloudflare-api
description: Integrates Cloudflare services (DNS, Workers, R2, KV, Pages, Zero Trust,
  WAF) using the official Cloudflare Python SDK with API token authentication and
  resource management patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: cloudflare api, cloudflare python, workers ai, cloudflare dns, r2 object
    storage, kv namespace, zero trust, how do i use cloudflare api from python
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
  related-skills: aws-sdk, vercel-api, google-cloud-sdk




---




# Cloudflare API Integration Patterns

Integrates Cloudflare services using the official `cloudflare` Python SDK (v5.x). Covers API token authentication, DNS record management, Workers script deployment, KV namespace operations, R2 object storage, Pages project management, and Zero Trust configuration with the SDK's typed client design.

## TL;DR Checklist

- [ ] Use `Cloudflare(api_token=...)` with an API token from the Cloudflare dashboard
- [ ] Use typed resources: `client.dns.records`, `client.workers.scripts`, `client.kv.namespaces`
- [ ] Handle `cloudflare.APIStatusError` with status code branching for error recovery
- [ ] Use `client.zones.list()` to discover zone IDs for DNS operations
- [ ] Use `SyncV4PagePaginationArray` and `SyncCursorLimitPagination` for paginated responses
- [ ] Use `AsyncCloudflare` with `async with` for concurrent operations
- [ ] Use Workers runtime SDK (`workers-py`) for deploying Python Workers

---

## When to Use

Use this skill when:

- Managing DNS records across multiple domains from Python automation
- Deploying and updating Cloudflare Workers scripts (JavaScript and Python)
- Reading and writing data to Workers KV for distributed key-value storage
- Storing and serving objects from R2 object storage (S3-compatible)
- Managing Pages projects for static site deployments
- Configuring Zero Trust Access policies and WAF rules programmatically
- Automating cache purge, SSL/TLS, and zone settings management

---

## When NOT to Use

- For one-off zone configuration (use the Cloudflare Dashboard)
- For large-scale DNS migration (use zone import/export features)
- For infrastructure-as-code at scale (use Terraform Cloudflare provider)
- When you need real-time analytics streaming (use Cloudflare Analytics API with GraphQL)

---

## Core Workflow

### 1. Authentication and Client Initialization

Cloudflare SDK v5.x uses API tokens for authentication with typed resource accessors.

```python
import os
from cloudflare import Cloudflare
from cloudflare import APIStatusError

# API token — created in Cloudflare Dashboard with specific permissions
token = os.environ.get("CLOUDFLARE_API_TOKEN")
if not token:
    raise RuntimeError("Set CLOUDFLARE_API_TOKEN environment variable")

# Synchronous client
client = Cloudflare(api_token=token)

# Async client (for concurrent operations)
# from cloudflare import AsyncCloudflare
# client = AsyncCloudflare(api_token=token)
```

**Checkpoint:** Verify connectivity: `client.zones.list()`. A successful response returns zones or an empty list. Catch `APIStatusError` with status 401 for invalid tokens. Use `client.zones.list()` to find zone IDs.

### 2. DNS Record Management

```python
class DNSManager:
    """Manage Cloudflare DNS records across zones."""

    def __init__(self, token: str):
        self.client = Cloudflare(api_token=token)

    def get_zone_id(self, domain: str) -> str:
        """Find zone ID by domain name."""
        zones = list(self.client.zones.list(name=domain))
        if not zones:
            raise ValueError(f"Zone '{domain}' not found in your account")
        return zones[0].id

    def create_dns_record(
        self,
        zone_name: str,
        record_type: str,
        name: str,
        content: str,
        ttl: int = 120,
        proxied: bool = True,
    ) -> dict:
        """Create or update a DNS record. Returns the record data."""
        zone_id = self.get_zone_id(zone_name)

        try:
            record = self.client.dns.records.create(
                zone_id=zone_id,
                type=record_type,
                name=name,
                content=content,
                ttl=ttl,
                proxied=proxied,
            )
            return {"id": record.id, "name": record.name, "content": record.content}

        except APIStatusError as err:
            if err.status_code == 409:
                # Record already exists — try to update it
                return self._update_existing_record(
                    zone_id, record_type, name, content, ttl, proxied
                )
            raise

    def _update_existing_record(
        self, zone_id: str, record_type: str, name: str,
        content: str, ttl: int, proxied: bool,
    ) -> dict:
        """Find and update an existing DNS record."""
        records = list(
            self.client.dns.records.list(
                zone_id=zone_id, type=record_type, name=name
            )
        )
        if not records:
            raise ValueError(f"No existing {record_type} record found for {name}")

        record = self.client.dns.records.update(
            zone_id=zone_id,
            dns_record_id=records[0].id,
            content=content,
            ttl=ttl,
            proxied=proxied,
        )
        return {"id": record.id, "name": record.name, "content": record.content}

    def list_records(self, zone_name: str, record_type: str | None = None) -> list[dict]:
        """List DNS records, optionally filtered by type."""
        zone_id = self.get_zone_id(zone_name)

        params = {"zone_id": zone_id}
        if record_type:
            params["type"] = record_type

        records = list(self.client.dns.records.list(**params))
        return [
            {"id": r.id, "name": r.name, "type": r.type, "content": r.content}
            for r in records
        ]
```

**Checkpoint:** Zone ID is different from the domain name. Always discover it via `client.zones.list()`. DNS record creation with `proxied=True` enables Cloudflare's proxy (orange cloud).

### 3. Workers KV Operations

```python
class KVManager:
    """Manage Workers KV namespaces and key-value pairs."""

    def __init__(self, token: str, account_id: str):
        self.client = Cloudflare(api_token=token)
        self.account_id = account_id

    def list_namespaces(self) -> list[dict]:
        """List all KV namespaces."""
        return list(
            self.client.kv.namespaces.list(account_id=self.account_id)
        )

    def create_namespace(self, title: str) -> str:
        """Create a KV namespace. Returns the namespace ID."""
        ns = self.client.kv.namespaces.create(
            account_id=self.account_id,
            title=title,
        )
        return ns.id

    def put_value(self, namespace_id: str, key: str, value: str) -> None:
        """Set a KV value (string). Values can be up to 25 MB."""
        self.client.kv.namespaces.values.update(
            account_id=self.account_id,
            namespace_id=namespace_id,
            key_name=key,
            value=value,
        )

    def get_value(self, namespace_id: str, key: str) -> str | None:
        """Get a KV value by key. Returns None if not found."""
        try:
            value = self.client.kv.namespaces.values.get(
                account_id=self.account_id,
                namespace_id=namespace_id,
                key_name=key,
            )
            return value
        except APIStatusError as err:
            if err.status_code == 404:
                return None  # Key not found — return None
            raise

    def list_keys(self, namespace_id: str) -> list[str]:
        """List all keys in a namespace."""
        keys = list(
            self.client.kv.namespaces.keys.list(
                account_id=self.account_id,
                namespace_id=namespace_id,
            )
        )
        return [k.name for k in keys]

    def delete_key(self, namespace_id: str, key: str) -> None:
        """Delete a key from KV."""
        try:
            self.client.kv.namespaces.values.delete(
                account_id=self.account_id,
                namespace_id=namespace_id,
                key_name=key,
            )
        except APIStatusError as err:
            if err.status_code == 404:
                return  # Already deleted — idempotent
            raise
```

**Checkpoint:** KV namespace operations require the account ID (not zone ID). Find it in the Cloudflare Dashboard under "My Profile" → "API Tokens". KV values are eventually consistent — writes may take a few seconds to propagate globally.

### 4. R2 Object Storage Operations

```python
class R2Manager:
    """Manage R2 object storage buckets and objects."""

    def __init__(self, token: str, account_id: str):
        self.client = Cloudflare(api_token=token)
        self.account_id = account_id

    def create_bucket(self, bucket_name: str) -> bool:
        """Create an R2 bucket."""
        try:
            self.client.r2.buckets.create(
                account_id=self.account_id,
                name=bucket_name,
            )
            return True
        except APIStatusError as err:
            if err.status_code == 409:
                return False  # Bucket already exists
            raise

    def list_buckets(self) -> list[dict]:
        """List all R2 buckets."""
        buckets = list(
            self.client.r2.buckets.list(account_id=self.account_id)
        )
        return [
            {"name": b.name, "created": b.creation_date}
            for b in buckets
        ]
```

**Checkpoint:** R2 is S3-compatible for data operations but management (bucket CRUD) is via the Cloudflare SDK. For object upload/download, use the S3-compatible API with R2 credentials.

---

## Implementation Patterns

### Pattern 1: Workers Script Deployment

```python
def deploy_worker(
    token: str,
    account_id: str,
    script_name: str,
    script_content: str,
    route: str | None = None,
    zone_id: str | None = None,
) -> dict:
    """Upload and deploy a Workers script. Optionally add a route."""
    client = Cloudflare(api_token=token)

    # Upload the script
    script = client.workers.scripts.update(
        account_id=account_id,
        script_name=script_name,
        content=script_content,
    )

    # Add a route if specified
    if route and zone_id:
        client.workers.routes.create(
            zone_id=zone_id,
            pattern=route,
            script=script_name,
        )

    return {"id": script.id, "etag": script.etag}
```

### Pattern 2: Purge Cache Across a Zone

```python
def purge_zone_cache(token: str, zone_name: str) -> bool:
    """Purge all cached content for a zone."""
    from cloudflare import Cloudflare

    client = Cloudflare(api_token=token)
    zones = list(client.zones.list(name=zone_name))

    if not zones:
        raise ValueError(f"Zone '{zone_name}' not found")

    try:
        client.cache.purge(zone_id=zones[0].id, everything=True)
        return True
    except APIStatusError as err:
        raise RuntimeError(
            f"Cache purge failed: {err.status_code}"
        ) from err
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Catch-all exception handling
from cloudflare import Cloudflare
client = Cloudflare(api_token="token")
try:
    client.dns.records.create(zone_id="...", type="A", name="www", content="1.2.3.4")
except Exception as e:
    print(f"DNS creation failed: {e}")

# ✅ GOOD — Handle specific API error status codes
from cloudflare import APIStatusError

try:
    client.dns.records.create(zone_id="...", type="A", name="www", content="1.2.3.4")
except APIStatusError as err:
    if err.status_code == 400:
        raise ValueError(f"Invalid DNS record: {err.body}") from err
    if err.status_code == 409:
        # Record already exists — handle idempotently
        pass
    if err.status_code == 403:
        raise PermissionError("Token lacks DNS write permission") from err
    raise
```

### BAD vs GOOD: Pagination

```python
# ❌ BAD — Assumes single page of results
zones = client.zones.list()
for zone in zones:
    print(zone.name)

# ✅ GOOD — Iterate over all pages (SDK handles pagination transparently)
zones = list(client.zones.list())  # Collect all results
for zone in zones:
    print(zone.name)
```

---

## Constraints

### MUST DO
- Use API tokens (scoped) instead of Global API Key for all operations — tokens have limited permissions
- Handle `APIStatusError` with specific status codes: 400 (validation), 403 (permissions), 404 (not found), 409 (conflict), 429 (rate limit)
- Use `list()` to fully consume paginated responses — SDK transparently pages through results
- Use `AsyncCloudflare` with `async with` for concurrent multi-zone operations
- Cache discovered zone IDs — they don't change and looking them up adds latency
- Use environment variables for API tokens — never hardcode credentials

### MUST NOT DO
- Use Global API Key when API tokens are available — tokens are more secure and scoped
- Assume DNS records are unique — multiple records of the same type and name can exist (e.g., for load balancing)
- Poll for KV consistency — KV is eventually consistent; design for it
- Hardcode zone IDs or account IDs — discover them at runtime for portability
- Forget to set `proxied=True` when you want Cloudflare CDN/security features on DNS records

---

## Output Template

When implementing a Cloudflare API integration, structure your output as:

1. **Client Initialization** — `Cloudflare(api_token=...)` with typed resource accessors
2. **Resource Discovery** — Find zone IDs via `client.zones.list()` or account IDs as needed
3. **CRUD Operations** — Create/Read/Update/Delete via typed resource methods
4. **Error Handling** — `APIStatusError` with status code branching for recovery
5. **Pagination** — Use `list()` to consume all pages from paginated responses
6. **Async** — Use `AsyncCloudflare` for concurrent operations across zones

---

## Related Skills

| Skill | Purpose |
|---|---|
| `aws-sdk` | AWS SDK patterns (R2 S3-compatible + Workers similar to Lambda) |
| `vercel-api` | Vercel deployment API (complementary edge compute) |
| `google-cloud-sdk` | Google Cloud SDK patterns |
| `digitalocean-api` | DigitalOcean API patterns |

---

## Live References

- [Cloudflare Python SDK Documentation](https://developers.cloudflare.com/api/python/) — Official SDK reference (v5.x)
- [Cloudflare Python SDK GitHub](https://github.com/cloudflare/cloudflare-python) — Source code and changelog
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/) — Complete REST API reference
- [Workers Python Runtime Docs](https://developers.cloudflare.com/workers/languages/python/) — Python Workers guide
- [KV API Reference](https://developers.cloudflare.com/api/operations/workers-kv-namespace-list-namespaces) — KV namespace operations
- [R2 API Reference](https://developers.cloudflare.com/r2/api/) — R2 object storage API
- [Cloudflare Workers SDK (workers-py)](https://github.com/cloudflare/workers-sdk/tree/main/packages/workers-py) — Workers Python runtime SDK
