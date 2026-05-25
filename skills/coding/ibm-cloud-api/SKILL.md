---
name: ibm-cloud-api
description: Integrates IBM Cloud services (Watson AI, Cloud Foundry, Kubernetes Service,
  Cloud Object Storage) using IBM Cloud SDK for Python with IAM authentication and
  service patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ibm cloud, watson api, ibm cloud sdk, cloud object storage, ibm kubernetes,
    cloud foundry, how do i use ibm cloud from python
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
  related-skills: aws-sdk, azure-sdk, oci-sdk
------
# IBM Cloud API & Watson SDK Integration Patterns

Integrates IBM Cloud services using the `ibm-cloud-sdk-core` authenticators and service SDKs. Covers IAM authentication patterns, Watson AI services (Assistant, Natural Language Understanding), Cloud Object Storage (COS), IBM Cloud Kubernetes Service (IKS), and Cloud Foundry resource management with the `ibm_boto3` and `ibm_watson` libraries.

## TL;DR Checklist

- [ ] Use `IAMAuthenticator` from `ibm_cloud_sdk_core` for service authentication
- [ ] Install specific service packages (`ibm-watson`, `ibm-cos-sdk`) — granular, not monolithic
- [ ] Handle `ApiException` with specific error codes for Watson services
- [ ] Use `ibm_boto3` for Cloud Object Storage (S3-compatible API)
- [ ] Set service URLs explicitly — IBM Cloud services have regional endpoints
- [ ] Use `VCAP_SERVICES` environment variable for Cloud Foundry-deployed apps
- [ ] Use context managers for COS client lifecycle

---

## When to Use

Use this skill when:

- Building AI-powered applications using Watson services (Assistant, NLU, Speech, Vision)
- Managing IBM Cloud Object Storage buckets with S3-compatible API
- Automating Kubernetes cluster provisioning on IBM Cloud Kubernetes Service (IKS)
- Deploying Cloud Foundry applications and managing service bindings
- Querying IBM Cloud resource instances and managing IAM service IDs
- Implementing natural language processing with Watson Natural Language Understanding

---

## When NOT to Use

- For declarative infrastructure (use Terraform or IBM Cloud Schematics)
- For one-off CLI operations (use `ibmcloud` CLI)
- When you need raw REST API access without SDK overhead (use direct HTTP calls)
- For COS operations in non-Python environments (use AWS S3 SDK with COS endpoint)

---

## Core Workflow

### 1. IAM Authentication and Client Setup

IBM Cloud SDK uses a core authentication library with pluggable authenticators.

```python
import os
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson import AssistantV2
from ibm_cloud_sdk_core import ApiException

# IAM API key-based authentication (preferred)
authenticator = IAMAuthenticator(
    apikey=os.environ["IBM_CLOUD_API_KEY"],
    url="https://iam.cloud.ibm.com",  # IAM token endpoint
)

# Watson Assistant service example
assistant = AssistantV2(
    version="2024-05-01",
    authenticator=authenticator,
)
assistant.set_service_url(os.environ["WATSON_ASSISTANT_URL"])
```

**Checkpoint:** Verify auth with a simple call: `assistant.list_assistants()`. Catch `ApiException` with status code 401 for invalid API keys.

### 2. Watson Assistant Session and Message

```python
class WatsonAssistant:
    """Manage Watson Assistant sessions and send messages."""

    def __init__(self, assistant_id: str, api_key: str, service_url: str):
        authenticator = IAMAuthenticator(apikey=api_key)
        self.assistant = AssistantV2(
            version="2024-05-01",
            authenticator=authenticator,
        )
        self.assistant.set_service_url(service_url)
        self.assistant_id = assistant_id
        self.session_id = None

    def create_session(self) -> str:
        """Create a new conversation session."""
        try:
            response = self.assistant.create_session(
                assistant_id=self.assistant_id
            )
            self.session_id = response.get_result()["session_id"]
            return self.session_id
        except ApiException as err:
            raise RuntimeError(
                f"Failed to create Assistant session: {err.message}"
            ) from err

    def send_message(self, text: str) -> dict:
        """Send a user message and get the assistant response."""
        if not self.session_id:
            self.create_session()

        try:
            response = self.assistant.message(
                assistant_id=self.assistant_id,
                session_id=self.session_id,
                input={"message_type": "text", "text": text},
            )
            return response.get_result()
        except ApiException as err:
            raise RuntimeError(
                f"Assistant message failed: {err.message}"
            ) from err

    def delete_session(self) -> None:
        """Clean up the session."""
        if self.session_id:
            try:
                self.assistant.delete_session(
                    assistant_id=self.assistant_id,
                    session_id=self.session_id,
                )
            except ApiException:
                pass  # Session may already be expired
            self.session_id = None
```

**Checkpoint:** Sessions expire after 5-60 minutes of inactivity (configurable). Always create a new session for long idle periods. Delete sessions after use to avoid billing.

### 3. Cloud Object Storage (S3-Compatible)

IBM Cloud Object Storage uses an S3-compatible API via `ibm_boto3`.

```python
import ibm_boto3
from ibm_botocore.client import Config
from ibm_botocore.exceptions import ClientError


class COSManager:
    """Manage IBM Cloud Object Storage with S3-compatible API."""

    def __init__(self, api_key: str, service_instance_id: str, endpoint_url: str):
        self.client = ibm_boto3.client(
            "s3",
            ibm_api_key_id=api_key,
            ibm_service_instance_id=service_instance_id,
            config=Config(signature_version="oauth"),
            endpoint_url=endpoint_url,
        )

    def create_bucket(self, bucket_name: str, location: str = "us-south") -> bool:
        """Create a COS bucket. Returns True if created, False if exists."""
        try:
            self.client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": location},
            )
            return True
        except ClientError as err:
            if err.response["Error"]["Code"] == "BucketAlreadyOwnedByYou":
                return False  # Idempotent success
            raise

    def upload_object(self, bucket_name: str, key: str, data: bytes) -> str:
        """Upload bytes to COS. Returns the object URL."""
        try:
            self.client.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=data,
            )
            return f"cos://{bucket_name}/{key}"
        except ClientError as err:
            raise RuntimeError(
                f"Failed to upload {key} to {bucket_name}: {err}"
            ) from err

    def list_objects(self, bucket_name: str) -> list[str]:
        """List all object keys in a bucket."""
        try:
            response = self.client.list_objects(Bucket=bucket_name)
            if "Contents" not in response:
                return []
            return [obj["Key"] for obj in response["Contents"]]
        except ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchBucket":
                return []
            raise

    def get_object(self, bucket_name: str, key: str) -> bytes:
        """Download an object's content as bytes."""
        try:
            response = self.client.get_object(Bucket=bucket_name, Key=key)
            return response["Body"].read()
        except ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchKey":
                raise FileNotFoundError(
                    f"Object cos://{bucket_name}/{key} not found"
                ) from err
            raise
```

**Checkpoint:** COS endpoints are region-specific (e.g., `s3.us-south.cloud-object-storage.appdomain.cloud`). Use the correct endpoint for the bucket's location. Use `oauth` signature version for IAM-based auth.

### 4. Watson Natural Language Understanding

```python
from ibm_watson import NaturalLanguageUnderstandingV1
from ibm_watson.natural_language_understanding_v1 import Features, EntitiesOptions, KeywordsOptions


def analyze_text(
    api_key: str,
    service_url: str,
    text: str,
) -> dict:
    """Extract entities and keywords from text using Watson NLU."""
    authenticator = IAMAuthenticator(apikey=api_key)
    nlu = NaturalLanguageUnderstandingV1(
        version="2024-05-01",
        authenticator=authenticator,
    )
    nlu.set_service_url(service_url)

    try:
        response = nlu.analyze(
            text=text,
            features=Features(
                entities=EntitiesOptions(sentiment=True, limit=5),
                keywords=KeywordsOptions(sentiment=True, limit=5),
            ),
        ).get_result()
        return response
    except ApiException as err:
        raise RuntimeError(
            f"NLU analysis failed: {err.message}"
        ) from err
```

---

## Implementation Patterns

### Pattern 1: IBM Cloud Kubernetes Cluster Management

```python
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator


def list_clusters(api_key: str, resource_group_id: str) -> list[dict]:
    """List IKS clusters in a resource group."""
    # IBM Cloud Kubernetes API uses the container service endpoint
    import requests

    iam_auth = IAMAuthenticator(apikey=api_key)
    token = iam_auth.token_manager.get_token()

    headers = {"Authorization": f"Bearer {token}"}
    params = {"X-Auth-Resource-Group": resource_group_id} if resource_group_id else {}

    response = requests.get(
        "https://containers.cloud.ibm.com/global/v2/clusters",
        headers=headers,
        params=params,
    )
    response.raise_for_status()
    return response.json()
```

### Pattern 2: Cloud Foundry App Deployment

```python
def cf_push(
    api_endpoint: str,
    org: str,
    space: str,
    app_name: str,
    manifest_path: str,
) -> None:
    """Push a Cloud Foundry application using the CF CLI via subprocess."""
    import subprocess
    import sys

    commands = [
        ["cf", "api", api_endpoint],
        ["cf", "target", "-o", org, "-s", space],
        ["cf", "push", app_name, "-f", manifest_path],
    ]

    for cmd in commands:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"CF command failed: {' '.join(cmd)}\n{result.stderr}"
            )
```

### BAD vs GOOD: Watson Error Handling

```python
# ❌ BAD — Catching base Exception loses error context
from ibm_watson import AssistantV2
assistant = AssistantV2(version="2024-05-01", authenticator=authenticator)
try:
    assistant.create_session(assistant_id="abc123")
except Exception as e:
    print(f"Error: {e}")

# ✅ GOOD — Catch ApiException with specific codes
from ibm_cloud_sdk_core import ApiException

try:
    session = assistant.create_session(assistant_id="abc123")
except ApiException as err:
    if err.code == 404:
        raise ValueError(f"Assistant 'abc123' not found") from err
    if err.code == 429:
        raise RuntimeError("Rate limit exceeded — retry with backoff") from err
    if err.code == 401:
        raise PermissionError("Invalid API key or expired token") from err
    raise
```

### BAD vs GOOD: COS Bucket Creation

```python
# ❌ BAD — No location constraint, no error handling
client = ibm_boto3.client("s3", ...)
client.create_bucket(Bucket="my-bucket")

# ✅ GOOD — Location constraint + idempotent handling
def ensure_bucket(client, name: str, location: str = "us-south") -> None:
    try:
        client.create_bucket(
            Bucket=name,
            CreateBucketConfiguration={"LocationConstraint": location},
        )
    except ClientError as err:
        if err.response["Error"]["Code"] in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            return  # Expected: bucket exists
        raise

ensure_bucket(client, "my-bucket", "us-south")
```

---

## Constraints

### MUST DO
- Use `IAMAuthenticator` for all IBM Cloud SDK authentication — API key is the primary auth mechanism
- Set service URLs explicitly after client creation — default URLs may not match your region
- Handle `ApiException` (Watson) and `ClientError` (COS) with specific HTTP codes for each service
- Use `ibm_boto3` (not `boto3`) for COS — it supports IAM-based `oauth` signature
- Use `get_result()` on Watson responses to access the parsed JSON payload
- Use resource groups to scope service instances for IAM access control

### MUST NOT DO
- Hardcode API keys in source code — use environment variables or a secrets manager
- Use `boto3` (vanilla) for COS — it doesn't support IBM IAM OAuth tokens
- Forget to call `set_service_url` — SDKs default to `https://api.us-south.assistant.watson.cloud.ibm.com` which may be wrong
- Use synchronous sessions for long-running Watson conversations — sessions expire
- Ignore Watson API version dates — always set an explicit version string

---

## Output Template

When implementing an IBM Cloud SDK integration, structure your output as:

1. **Authentication** — `IAMAuthenticator` creation from API key
2. **Client Setup** — Service client with version and service URL
3. **Operation** — API call with service-specific parameters
4. **Error Handling** — `ApiException` or `ClientError` with code branching
5. **Response Parsing** — `.get_result()` for Watson, standard dict access for COS
6. **Cleanup** — Session deletion (Watson) or client close

---

## Related Skills

| Skill | Purpose |
|---|---|
| `aws-sdk` | AWS SDK patterns (COS shares S3-compatible API) |
| `azure-sdk` | Azure SDK patterns |
| `oci-sdk` | Oracle Cloud SDK patterns |
| `google-cloud-sdk` | Google Cloud SDK patterns |

---

## Live References

- [IBM Cloud SDK Core (Python)](https://github.com/IBM/python-sdk-core) — Core authentication library
- [IBM Watson Python SDK](https://github.com/watson-developer-cloud/python-sdk) — Watson service client library
- [IBM Cloud Object Storage Python SDK](https://github.com/IBM/ibm-cos-sdk-python) — COS S3-compatible SDK
- [IBM Cloud SDK Common](https://github.com/IBM/ibm-cloud-sdk-common) — SDK usage patterns across languages
- [IBM Cloud API Documentation](https://cloud.ibm.com/apidocs) — All IBM Cloud service APIs
- [IBM Cloud IAM Authentication](https://cloud.ibm.com/docs/account?topic=account-iamoverview) — IAM service ID management
- [Cloud Object Storage Endpoints](https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-endpoints) — Regional endpoint reference
