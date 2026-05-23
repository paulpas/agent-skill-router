---
name: google-cloud-sdk
description: Integrates Google Cloud services (Compute Engine, Cloud Storage, BigQuery, Cloud Functions, GKE, Pub/Sub) using the Google Cloud Python client libraries with authentication and resource patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: google cloud sdk, gcp python, cloud storage, bigquery, compute engine, pub sub, how do i use google cloud from python
  role: implementation
  scope: implementation
  output-format: code
  related-skills: aws-sdk, azure-sdk, cloudflare-api
---

# Google Cloud SDK (GCP) Integration Patterns

Integrates Google Cloud Platform services using the idiomatic Python client libraries. Covers authentication via application-default credentials, resource patterns for Compute Engine, Cloud Storage, BigQuery, Cloud Functions, GKE, and Pub/Sub, with consistent error handling and pagination.

## TL;DR Checklist

- [ ] Install individual service libraries (`google-cloud-storage`, `google-cloud-bigquery`) — never install the monolithic `google-cloud` package
- [ ] Use `google.auth.default()` or `ADC` (Application Default Credentials) for authentication
- [ ] Enable APIs per-service in the GCP Console before using client libraries
- [ ] Handle `google.api_core.exceptions.*` with specific error codes (NotFound, AlreadyExists, Forbidden)
- [ ] Use `@retry.Retry()` decorator for transient failures (rate limits, timeouts)
- [ ] Set explicit `project_id` on clients — never rely on default project resolution in production

---

## When to Use

Use this skill when:

- Provisioning Compute Engine instances or managing GKE clusters from Python
- Building data pipelines using BigQuery for analytics and Cloud Storage for data lakes
- Implementing event-driven architectures with Cloud Functions and Pub/Sub
- Storing and retrieving objects in Cloud Storage buckets with fine-grained access control
- Querying large datasets with BigQuery using the Python client library
- Managing Cloud Functions deployment and configuration programmatically

---

## When NOT to Use

- For declarative infrastructure management (use Terraform or Deployment Manager)
- For ad-hoc CLI operations (use `gcloud` CLI directly)
- When you need multi-cloud resource abstraction (use cross-cloud libraries instead)
- For streaming analytics that requires real-time processing (use Dataflow/Apache Beam)

---

## Core Workflow

### 1. Authentication and Client Initialization

GCP client libraries use Application Default Credentials (ADC) which resolve credentials from the environment.

```python
import os
from google.cloud import storage
from google.cloud import bigquery
from google.api_core import exceptions
from google.api_core import retry

# ADC resolves in order: GOOGLE_APPLICATION_CREDENTIALS env var → gcloud auth
# → attached service account (GCE, GKE, Cloud Functions)
project_id = os.environ["GOOGLE_CLOUD_PROJECT"]

# Instantiate clients — they pick up ADC automatically
storage_client = storage.Client(project=project_id)
bigquery_client = bigquery.Client(project=project_id)
```

**Checkpoint:** Run `gcloud auth application-default login` locally. Verify with a simple `storage_client.list_buckets()` call. Catch `exceptions.DefaultCredentialsError` early.

### 2. Cloud Storage Bucket and Object Operations

```python
from google.cloud.storage import Blob


class StorageManager:
    """Manage GCS buckets and objects with consistent error handling."""

    def __init__(self, project_id: str):
        self.client = storage.Client(project=project_id)

    def create_bucket(self, bucket_name: str, location: str = "US") -> storage.Bucket:
        """Create a bucket. Idempotent — returns existing if already present."""
        try:
            bucket = self.client.create_bucket(bucket_name, location=location)
            return bucket
        except exceptions.Conflict:
            # Bucket already exists — fetch and return
            return self.client.get_bucket(bucket_name)

    @retry.Retry(predicate=retry.if_transient_error)
    def upload_object(self, bucket_name: str, blob_name: str, data: bytes) -> str:
        """Upload bytes to a blob with automatic retry on transient errors."""
        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_string(data)
        return blob.public_url

    def list_objects(self, bucket_name: str, prefix: str = "") -> list[Blob]:
        """List objects with optional prefix filter (pagination handled)."""
        bucket = self.client.bucket(bucket_name)
        blobs = self.client.list_blobs(bucket_name, prefix=prefix)
        return list(blobs)

    def download_object(self, bucket_name: str, blob_name: str) -> bytes:
        """Download a blob's content as bytes."""
        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        try:
            return blob.download_as_bytes()
        except exceptions.NotFound:
            raise FileNotFoundError(
                f"Blob gs://{bucket_name}/{blob_name} not found"
            ) from None
```

**Checkpoint:** Bucket names must be globally unique across all GCP. Use `create_bucket` in a try/except for `Conflict` for idempotent creation.

### 3. BigQuery Query Execution

```python
from google.cloud.bigquery import QueryJobConfig, ScalarQueryParameter


class BigQueryAnalytics:
    """Execute BigQuery queries with parameterization and result handling."""

    def __init__(self, project_id: str):
        self.client = bigquery.Client(project=project_id)

    def run_query(self, query: str, params: list[ScalarQueryParameter] | None = None) -> list[dict]:
        """Run a SQL query and return results as list of dicts."""
        job_config = QueryJobConfig()
        if params:
            job_config.query_parameters = params

        query_job = self.client.query(query, job_config=job_config)
        results = query_job.result()  # Waits for job completion

        return [dict(row.items()) for row in results]

    def create_dataset_if_not_exists(self, dataset_id: str, location: str = "US") -> str:
        """Create a BigQuery dataset if it doesn't exist."""
        dataset_ref = bigquery.Dataset(f"{self.client.project}.{dataset_id}")
        dataset_ref.location = location
        try:
            self.client.create_dataset(dataset_ref)
        except exceptions.Conflict:
            pass  # Dataset already exists
        return dataset_id

    def insert_rows(
        self, dataset_id: str, table_id: str, rows: list[dict]
    ) -> list[dict]:
        """Insert rows into a table. Returns errors list (empty on success)."""
        table_ref = f"{self.client.project}.{dataset_id}.{table_id}"
        errors = self.client.insert_rows_json(table_ref, rows)
        return errors
```

**Checkpoint:** BigQuery queries cost money based on data scanned. Always use `WHERE` clauses and select only needed columns. Use `jobs.get` to monitor query costs.

### 4. Pub/Sub Publishing and Subscription

```python
from google.cloud import pubsub_v1


class PubSubManager:
    """Publish messages and manage subscriptions."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.publisher = pubsub_v1.PublisherClient()
        self.subscriber = pubsub_v1.SubscriberClient()

    def publish_message(
        self, topic_id: str, data: bytes, **attrs: str
    ) -> str:
        """Publish a message with optional attributes. Returns message ID."""
        topic_path = self.publisher.topic_path(self.project_id, topic_id)
        future = self.publisher.publish(topic_path, data, **attrs)
        return future.result()  # Blocks until published

    def create_subscription(
        self, topic_id: str, subscription_id: str
    ) -> str:
        """Create a pull subscription for a topic."""
        topic_path = self.publisher.topic_path(self.project_id, topic_id)
        sub_path = self.subscriber.subscription_path(
            self.project_id, subscription_id
        )

        try:
            subscription = self.subscriber.create_subscription(
                name=sub_path, topic=topic_path
            )
            return subscription.name
        except exceptions.AlreadyExists:
            return sub_path
```

---

## Implementation Patterns

### Pattern 1: Compute Engine Instance Management

```python
from google.cloud import compute_v1
from google.api_core.extended_operation import ExtendedOperation


def wait_for_extension(operation: ExtendedOperation) -> None:
    """Block until a compute operation completes."""
    operation.result(timeout=300)


def create_instance(
    project_id: str,
    zone: str,
    instance_name: str,
    machine_type: str = "n1-standard-1",
) -> compute_v1.Instance:
    """Create a Compute Engine instance with default settings."""
    instance_client = compute_v1.InstancesClient()

    # Get the latest Debian 11 image
    image_client = compute_v1.ImagesClient()
    image = image_client.get_from_family(
        project="debian-cloud", family="debian-11"
    )

    instance = compute_v1.Instance()
    instance.name = instance_name
    instance.machine_type = (
        f"zones/{zone}/machineTypes/{machine_type}"
    )
    instance.disks = [
        compute_v1.AttachedDisk(
            boot=True,
            auto_delete=True,
            initialize_params=compute_v1.AttachedDiskInitializeParams(
                source_image=image.self_link,
            ),
        )
    ]
    instance.network_interfaces = [
        compute_v1.NetworkInterface(
            network="global/networks/default",
            access_configs=[compute_v1.AccessConfig(
                name="External NAT",
                type_="ONE_TO_ONE_NAT",
            )],
        )
    ]

    operation = instance_client.insert(
        project=project_id, zone=zone, instance_resource=instance
    )
    wait_for_extension(operation)

    return instance_client.get(
        project=project_id, zone=zone, instance=instance_name
    )
```

### Pattern 2: Cloud Function Deployment

```python
def deploy_cloud_function(
    project_id: str,
    location: str,
    function_name: str,
    entry_point: str,
    source_archive_url: str,
) -> None:
    """Deploy a Cloud Function from a GCS-source archive."""
    functions_client = cloudfunctions_v1.CloudFunctionsServiceClient()

    function = cloudfunctions_v1.CloudFunction()
    function.name = (
        f"projects/{project_id}/locations/{location}/functions/{function_name}"
    )
    function.entry_point = entry_point
    function.runtime = "python310"
    function.source_archive_url = source_archive_url
    function.https_trigger = cloudfunctions_v1.HttpsTrigger()

    operation = functions_client.create_function(
        location=f"projects/{project_id}/locations/{location}",
        function=function,
    )
    response = operation.result()
    return response
```

### BAD vs GOOD: Error Handling

```python
# ❌ BAD — Blind retry on all exceptions, doesn't distinguish transient from permanent
from google.cloud import storage
client = storage.Client()
try:
    bucket = client.create_bucket("my-bucket")
except Exception:
    time.sleep(1)
    bucket = client.create_bucket("my-bucket")

# ✅ GOOD — Use google.api_core.Retry for transient, handle specific codes for permanent
from google.api_core import exceptions, retry

client = storage.Client()

@retry.Retry(predicate=retry.if_transient_error)
def create_bucket_safe(name: str, location: str = "US"):
    """Create bucket with retry on transient errors only."""
    try:
        return client.create_bucket(name, location=location)
    except exceptions.Conflict:
        # Bucket exists — not an error for idempotent callers
        return client.get_bucket(name)
    except exceptions.Forbidden as err:
        raise PermissionError(
            f"Not authorized to create bucket '{name}'"
        ) from err

create_bucket_safe("my-unique-bucket-name")
```

---

## Constraints

### MUST DO
- Install individual service packages (`google-cloud-storage`, `google-cloud-bigquery`) separately to minimize dependencies
- Use `@retry.Retry(predicate=retry.if_transient_error)` for idempotent operations to handle rate limits
- Set `GOOGLE_CLOUD_PROJECT` environment variable or pass `project` explicitly to all clients
- Handle `exceptions.NotFound`, `exceptions.Conflict` (409), `exceptions.Forbidden` (403) with specific recovery logic
- Enable each GCP API in the console before using client libraries (APIs are disabled by default)
- Use `client.list_*()` methods for listing resources — they handle pagination automatically

### MUST NOT DO
- Install the monolithic `google-cloud` package — always install granular per-service libraries
- Hardcode service account JSON key paths in source code — use `GOOGLE_APPLICATION_CREDENTIALS` env var
- Ignore BigQuery query costs — always preview data size with `dry_run=True` before executing
- Poll for operation completion manually — use `.result()` on the returned operation object
- Share service account keys across environments — use separate service accounts per environment

---

## Output Template

When implementing a GCP SDK integration, structure your output as:

1. **Client Initialization** — Per-service client with project and ADC
2. **Resource Creation** — Idempotent creation with Conflict/AlreadyExists handling
3. **Data Operations** — Upload/download/query with typed return values
4. **Retry Configuration** — `@retry.Retry` for transient failures
5. **Error Handling** — Specific `google.api_core.exceptions.*` cases
6. **Cleanup** — Close clients if using gRPC-based clients (pubsub, bigquery)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `aws-sdk` | AWS SDK integration patterns |
| `azure-sdk` | Azure SDK integration patterns |
| `bigquery-api` | BigQuery-specific query optimization patterns |
| `cloudflare-api` | Cloudflare API for DNS, Workers, and edge compute |

---

## Live References

- [Google Cloud Python Client Libraries](https://github.com/googleapis/google-cloud-python) — All GCP Python client library sources
- [Cloud Storage Python Client](https://docs.cloud.google.com/python/docs/reference/storage/latest) — Storage client reference
- [BigQuery Python Client](https://docs.cloud.google.com/python/docs/reference/bigquery/latest) — BigQuery client reference
- [Compute Engine Python Client](https://docs.cloud.google.com/python/docs/reference/compute/latest) — Compute Engine API reference
- [Pub/Sub Python Client](https://docs.cloud.google.com/python/docs/reference/pubsub/latest) — Pub/Sub client reference
- [GCP Python Docs Samples](https://github.com/GoogleCloudPlatform/python-docs-samples) — Official code examples
- [Authentication Overview](https://cloud.google.com/docs/authentication/application-default-credentials) — ADC setup guide
