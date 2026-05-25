---
name: azure-sdk
description: Integrates Azure services (Resource Manager, Blob Storage, Cosmos DB,
  Functions, AKS, Key Vault) using the Azure SDK for Python with authentication and
  management patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: azure sdk, microsoft azure, azure blob storage, cosmos db, azure functions,
    resource management, how do i use azure from python
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
  related-skills: aws-sdk, google-cloud-sdk, oci-sdk
------
# Azure SDK for Python Integration Patterns

Integrates Microsoft Azure services using the Azure SDK for Python. Covers authentication with `DefaultAzureCredential`, resource management via `azure-mgmt-*` libraries, and client SDK patterns for Blob Storage, Cosmos DB, Functions, AKS, and Key Vault.

## TL;DR Checklist

- [ ] Use `DefaultAzureCredential` for authentication — it works across local dev and production
- [ ] Separate management plane (`azure-mgmt-*`) from data plane (`azure-*`) imports clearly
- [ ] Handle long-running operations (LROs) with `.result()` or `.wait()` pattern
- [ ] Store connection strings and keys in Azure Key Vault, never in code
- [ ] Use `BlobServiceClient` → `ContainerClient` → `BlobClient` hierarchy for Blob Storage
- [ ] Set resource group and location explicitly for every resource creation call

---

## When to Use

Use this skill when:

- Provisioning Azure resources (resource groups, storage accounts, VMs) via Python scripts
- Building applications that store or retrieve data from Blob Storage or Cosmos DB
- Deploying serverless functions to Azure Functions with Python runtimes
- Managing Azure Kubernetes Service (AKS) clusters programmatically
- Retrieving secrets from Azure Key Vault for application configuration
- Automating infrastructure management across Azure subscriptions

---

## When NOT to Use

- For declarative infrastructure-as-code with state management (use Bicep or Terraform)
- For one-off resource management tasks (use Azure CLI or Portal)
- When you need cross-platform resource orchestration (use Azure Resource Manager templates)
- For simple blob uploads that don't need programmatic control (use Azure Storage Explorer)

---

## Core Workflow

### 1. Authenticate with DefaultAzureCredential

Azure SDK uses a credential chain that works in local dev (Azure CLI, VS Code) and production (Managed Identity).

```python
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.storage import StorageManagementClient

# DefaultAzureCredential tries: env vars → managed identity → Azure CLI → VS Code
credential = DefaultAzureCredential()
subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

# Management plane clients (provisioning resources)
resource_client = ResourceManagementClient(credential, subscription_id)
storage_client = StorageManagementClient(credential, subscription_id)
```

**Checkpoint:** Verify authentication works early by calling a simple read operation (e.g., `resource_client.resource_groups.list()`). `DefaultAzureCredential` can fail silently if no authentication source is available.

### 2. Provision a Resource Group and Storage Account

Management operations use the `azure-mgmt-*` libraries with long-running operation (LRO) polling.

```python
from azure.mgmt.storage.models import StorageAccountCreateParameters


def provision_storage(
    rg_name: str,
    location: str,
    storage_name: str,
) -> str:
    """Create a resource group and storage account. Returns connection string."""
    # Step 1: Create resource group
    rg_result = resource_client.resource_groups.create_or_update(
        rg_name, {"location": location}
    )

    # Step 2: Check storage account name availability
    availability = storage_client.storage_accounts.check_name_availability(
        {"name": storage_name}
    )
    if not availability.name_available:
        raise ValueError(f"Storage account name '{storage_name}' is unavailable")

    # Step 3: Provision storage account (LRO — call .result() to wait)
    poller = storage_client.storage_accounts.begin_create(
        rg_name,
        storage_name,
        StorageAccountCreateParameters(
            location=location,
            kind="StorageV2",
            sku={"name": "Standard_LRS"},
        ),
    )
    account = poller.result()

    # Step 4: Retrieve access key
    keys = storage_client.storage_accounts.list_keys(rg_name, storage_name)
    primary_key = keys.keys[0].value

    return (
        f"DefaultEndpointsProtocol=https;"
        f"EndpointSuffix=core.windows.net;"
        f"AccountName={storage_name};"
        f"AccountKey={primary_key}"
    )
```

**Checkpoint:** Storage account creation can take 2-5 minutes. The `.result()` call blocks until complete. Use `begin_create` with `.wait()` for fire-and-forget scenarios.

### 3. Use Blob Storage Data Plane Client

After provisioning, use data plane clients (`azure-storage-blob`) to work with stored data.

```python
from azure.storage.blob import BlobServiceClient, ContainerClient


class BlobManager:
    """Manages blob upload, download, and listing operations."""

    def __init__(self, connection_string: str):
        self.service = BlobServiceClient.from_connection_string(connection_string)

    def upload_file(
        self, container_name: str, blob_name: str, data: bytes
    ) -> str:
        """Upload bytes to a blob. Returns the blob URL."""
        container_client = self.service.get_container_client(container_name)
        try:
            container_client.create_container()  # No-op if already exists
        except Exception:
            pass  # Container already exists

        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(data, overwrite=True)
        return blob_client.url

    def list_blobs(self, container_name: str) -> list[str]:
        """List all blob names in a container."""
        container_client = self.service.get_container_client(container_name)
        return [blob.name for blob in container_client.list_blobs()]

    def download_blob(self, container_name: str, blob_name: str) -> bytes:
        """Download a blob's content as bytes."""
        blob_client = self.service.get_blob_client(
            container=container_name, blob=blob_name
        )
        return blob_client.download_blob().readall()
```

**Checkpoint:** Connection strings contain account keys — treat them as secrets. Use `azure.storage.blob.aio` for async scenarios.

### 4. Cosmos DB Operations with SQL API

Use the `azure-cosmos` library for NoSQL document operations.

```python
from azure.cosmos import CosmosClient, PartitionKey, exceptions


class CosmosManager:
    """Manages Cosmos DB databases, containers, and items."""

    def __init__(self, url: str, key: str):
        self.client = CosmosClient(url, credential=key)

    def create_database_if_not_exists(self, db_name: str):
        """Create a database if it doesn't already exist."""
        try:
            return self.client.create_database(db_name)
        except exceptions.CosmosResourceExistsError:
            return self.client.get_database_client(db_name)

    def create_container_if_not_exists(
        self, db_name: str, container_name: str, partition_key: str
    ):
        """Create a container with a partition key."""
        database = self.create_database_if_not_exists(db_name)
        try:
            return database.create_container(
                id=container_name,
                partition_key=PartitionKey(path=f"/{partition_key}"),
            )
        except exceptions.CosmosResourceExistsError:
            return database.get_container_client(container_name)

    def upsert_item(
        self, db_name: str, container_name: str, item: dict
    ) -> dict:
        """Insert or replace an item. Item must include 'id' field."""
        container = self.client.get_database_client(db_name).get_container_client(
            container_name
        )
        return container.upsert_item(item)

    def query_items(
        self, db_name: str, container_name: str, query: str, params: list[dict] | None = None
    ) -> list[dict]:
        """Query items using SQL-like syntax."""
        container = self.client.get_database_client(db_name).get_container_client(
            container_name
        )
        items = container.query_items(
            query=query,
            parameters=params or [],
            enable_cross_partition_query=True,
        )
        return list(items)
```

---

## Implementation Patterns

### Pattern 1: Key Vault Secret Retrieval

```python
from azure.keyvault.secrets import SecretClient


def get_secret(vault_url: str, secret_name: str) -> str:
    """Retrieve a secret from Azure Key Vault using DefaultAzureCredential."""
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=vault_url, credential=credential)

    try:
        secret = client.get_secret(secret_name)
        return secret.value
    except Exception as err:
        raise RuntimeError(
            f"Failed to retrieve secret '{secret_name}' from {vault_url}"
        ) from err
```

### Pattern 2: Deploy Azure Function (Zip Deploy)

```python
import zipfile
from io import BytesIO
from azure.mgmt.web import WebSiteManagementClient
from azure.mgmt.web.models import Site


def deploy_function_app(
    rg_name: str,
    function_app_name: str,
    location: str,
    zip_file_path: str,
) -> None:
    """Create or update a Function App and deploy code via ZIP."""
    web_client = WebSiteManagementClient(credential, subscription_id)

    # Create or update the function app
    web_client.web_apps.create_or_update(
        rg_name,
        function_app_name,
        Site(location=location, kind="functionapp"),
    )

    # Deploy via Kudu ZIP deploy endpoint
    deploy_url = (
        f"https://{function_app_name}.scm.azurewebsites.net"
        f"/api/zipdeploy"
    )

    with open(zip_file_path, "rb") as f:
        # Use requests or Azure SDK's built-in deploy method
        # This requires the publish credentials
        pass  # See production implementation below
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Catching base Exception loses error context and type
from azure.cosmos import CosmosClient
client = CosmosClient(url, credential=key)
try:
    client.create_database("mydb")
except Exception:
    print("Database creation failed")

# ✅ GOOD — Catch specific Cosmos exceptions, re-raise unexpected
from azure.cosmos import CosmosClient, exceptions

client = CosmosClient(url, credential=key)
try:
    client.create_database("mydb")
except exceptions.CosmosResourceExistsError:
    pass  # Expected: database already exists — idempotent
except exceptions.CosmosHttpResponseError as err:
    if err.status_code == 429:
        # Rate limited — implement retry with backoff
        raise  # After retry exhausted
    raise
```

### BAD vs GOOD: Resource Management

```python
# ❌ BAD — No polling for long-running operations
storage_client.storage_accounts.create(
    rg_name, storage_name,
    {"location": "westus", "kind": "StorageV2", "sku": {"name": "Standard_LRS"}}
)

# ✅ GOOD — Use begin_create with poller for LROs
poller = storage_client.storage_accounts.begin_create(
    rg_name, storage_name,
    StorageAccountCreateParameters(
        location="westus",
        kind="StorageV2",
        sku={"name": "Standard_LRS"},
    )
)
account = poller.result()  # Blocks until completion
```

---

## Constraints

### MUST DO
- Use `DefaultAzureCredential` as the primary authentication strategy — handles local dev and production seamlessly
- Handle `CosmosResourceExistsError` and `ResourceNotFoundError` explicitly for idempotent operations
- Use `begin_create` / `begin_create_or_update` for management operations and call `.result()` to wait
- Use connection strings or Key Vault references for storage access — never hardcode keys
- Set `enable_cross_partition_query=True` for Cosmos DB queries that span partitions
- Import from `azure.mgmt.*` for management and `azure.*` for data plane separately

### MUST NOT DO
- Catch the base `Exception` class around Azure SDK calls — catch `HttpResponseError` or specific subclasses
- Hardcode subscription IDs, connection strings, or account keys in source code
- Forget to call `.result()` on LRO pollers — operations won't complete without it
- Assume resource names are globally available — always verify with `check_name_availability` for storage
- Mix management plane and data plane patterns — they have different client hierarchies and auth schemes

---

## Output Template

When implementing an Azure SDK integration, structure your output as:

1. **Authentication** — `DefaultAzureCredential` setup with fallback notes
2. **Client Initialization** — Management or data plane client with subscription/URL
3. **Resource Provisioning** — LRO pattern with `begin_create` + `.result()`
4. **Data Operations** — CRUD via data plane client hierarchy
5. **Error Handling** — Specific exception types with recovery or re-raise
6. **Cleanup** — Close clients or use async context managers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `aws-sdk` | AWS SDK integration patterns |
| `google-cloud-sdk` | Google Cloud SDK integration patterns |
| `oci-sdk` | Oracle Cloud Infrastructure SDK patterns |
| `ibm-cloud-api` | IBM Cloud API integration patterns |

---

## Live References

- [Azure SDK for Python Documentation](https://learn.microsoft.com/en-us/azure/developer/python/sdk) — Official SDK overview
- [Azure Identity Library](https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme) — `DefaultAzureCredential` reference
- [Azure Storage Blob Client Library](https://github.com/Azure/azure-sdk-for-python/tree/main/sdk/storage/azure-storage-blob) — Blob SDK with examples
- [Azure Cosmos DB SQL API SDK](https://learn.microsoft.com/en-us/python/api/overview/azure/cosmos-readme) — Cosmos DB client reference
- [Azure SDK Python Management Samples](https://github.com/Azure-Samples/azure-samples-python-management) — Complete management examples
- [Azure SDK Release Notes](https://azure.github.io/azure-sdk/releases/2026-01/python.html) — Latest SDK versions and changelogs
- [Azure Functions Python Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python) — Functions runtime reference
