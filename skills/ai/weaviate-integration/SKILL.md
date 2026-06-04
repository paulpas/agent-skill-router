---
name: weaviate-integration
description: Integrates Weaviate with external services and tools for AI applications, handling bidirectional data synchronization, API connectivity patterns, and error management for seamless interoperability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: weaviate, vector database, integration, API connectivity, data synchronization, AI applications, interop
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  archetypes: [tactical, generation]
  anti_triggers: [generic routing, vague integration patterns]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Weaviate Integration Patterns

Integrates Weaviate with external services and tools for AI applications. Handles bidirectional data synchronization, API connectivity, schema mapping, error management, and event-driven updates for seamless interoperability between Weaviate's vector database and application data sources.

## TL;DR Checklist

- [ ] Initialize a Weaviate client with proper authentication (API key or OAuth)
- [ ] Define the target collection schema before importing external data
- [ ] Handle batch operations efficiently — use `batch_refs` for bulk inserts
- [ ] Implement retry logic with exponential backoff for API failures
- [ ] Validate external data against Weaviate class schemas before insertion

---

## When to Use

Use this skill when:

- Connecting Weaviate to external APIs for real-time data synchronization (REST, GraphQL)
- Building bidirectional sync pipelines between databases and Weaviate vector collections
- Integrating AI/ML pipelines that feed embeddings into Weaviate from external model services
- Migrating existing data stores into Weaviate's vector database with schema transformation

---

## When NOT to Use

- For simple key-value lookups — use Redis or Memcached instead of a full vector database
- When you only need text search without semantic similarity — Elasticsearch or OpenSearch may be more appropriate
- For high-frequency, low-latency OLTP workloads — Weaviate is optimized for analytics and AI workloads

---

## Core Workflow

1. **Initialize Client** — Connect to Weaviate using the appropriate authentication method (API key, OAuth2, or no auth for local dev). Set proper timeouts and retry configuration.
   **Checkpoint:** Verify connectivity with `client.is_ready()` before proceeding.

2. **Define Target Schema** — Map external data sources to Weaviate classes and properties. Define which properties are indexed for search (`indexFilterable`, `indexVector`) and which are stored as metadata only.
   **Checkpoint:** Ensure vectorizer modules (e.g., `text2vec-openai`) are configured if embedding generation is delegated to Weaviate.

3. **Execute Data Sync** — Fetch data from the external service, transform into Weaviate-compatible objects (properties + optional vectors), and batch-insert using the Weaviate client's batch API.
   **Checkpoint:** Validate object schemas against the target class definition before insertion. Handle partial failures gracefully with per-item error tracking.

4. **Implement Error Handling** — Wrap all external API calls and Weaviate operations in try/except blocks with specific handling for HTTP errors, rate limits (429), and schema validation failures. Log errors with context for debugging.
   **Checkpoint:** Verify retry logic activates on transient failures but does not retry on schema/validation errors.

5. **Maintain Sync State** — Track the last sync timestamp or cursor to avoid reprocessing unchanged data. Implement idempotent upserts using Weaviate's `on_conflict` feature for collections with unique identifiers.
   **Checkpoint:** Periodically verify row counts between source and destination to detect data drift.

---

## Implementation Patterns

### Pattern 1: Connecting to External Service and Importing Data

```python
import weaviate
from weaviate.classes.config import Property, DataType
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def create_weaviate_client(
    url: str = "http://localhost:8080",
    api_key: str | None = None,
) -> weaviate.WeaviateClient:
    """Create and authenticate a Weaviate client.

    Args:
        url: Weaviate server URL (default: local instance)
        api_key: Optional API key for authentication

    Returns:
        Authenticated WeaviateClient instance

    Raises:
        weaviate.exceptions.WeaviateConnectionError: If the server is unreachable
    """
    client = weaviate.WeaviateClient(
        connection_params=weaviate.connect.base.ConnectionParams.from_url(url),
        auth_credentials=(
            weaviate.auth.AuthApiKey(api_key) if api_key else None
        ),
        additional_config=weaviate.config.AdditionalConfig(
            timeout=weaviate.config.Timeout(init=10, query=30, insert=120)
        ),
    )

    client.connect()  # Raises WeaviateConnectionError if unreachable

    return client


def create_collection_if_not_exists(
    client: weaviate.WeaviateClient,
    class_name: str,
    properties: list[Property],
    vectorizer: str = "text2vec-openai",
) -> None:
    """Create a Weaviate collection if it doesn't already exist.

    Args:
        client: Authenticated Weaviate client
        class_name: Name of the collection to create
        properties: List of property definitions with DataType and index settings
        vectorizer: Vectorizer module name (e.g., "text2vec-openai", "none")

    Note:
        Uses a simple try/except pattern since weaviate-py v3 does not expose
        a direct "collection exists" check. The retry handles concurrent creation.
    """
    try:
        client.collections.create(
            name=class_name,
            properties=properties,
            vectorizer_config=[weaviate.classes.config.Vectorizer.text2vec_openai()],
            # Alternatively, use `vector_config=None` for no automatic embedding
        )
    except weaviate.exceptions.UnexpectedStatusCodeError as e:
        if "already exists" not in str(e).lower():
            raise


def sync_external_data(
    client: weaviate.WeaviateClient,
    class_name: str,
    external_api_url: str,
    batch_size: int = 100,
) -> dict[str, int]:
    """Fetch data from an external API and batch-insert into Weaviate.

    Args:
        client: Authenticated Weaviate client
        class_name: Target collection name
        external_api_url: REST API endpoint returning JSON array of objects
        batch_size: Number of items per batch (default: 100)

    Returns:
        Summary dict with 'inserted', 'failed', and 'total' counts

    Raises:
        requests.HTTPError: If the external API returns a non-2xx status
        weaviate.exceptions.WeaviateInsertManyError: On batch insert failures
    """
    import requests

    response = requests.get(external_api_url)
    response.raise_for_status()
    data_items = response.json()

    collection = client.collections.get(class_name)
    result = {"inserted": 0, "failed": 0, "total": len(data_items)}

    # Process in batches for efficiency and resilience
    for i in range(0, len(data_items), batch_size):
        batch = data_items[i : i + batch_size]

        try:
            objects_to_insert = []
            for item in batch:
                # Transform external format → Weaviate property dict
                props = {
                    "title": item.get("name", ""),
                    "description": item.get("description", ""),
                    "source_id": item["id"],  # Unique identifier
                    "external_url": item.get("url", ""),
                }
                objects_to_insert.append({"properties": props})

            collection.data.insert_many(objects_to_insert)
            result["inserted"] += len(objects_to_insert)

        except Exception as e:
            print(f"Batch {i // batch_size} failed: {e}")
            result["failed"] += len(batch)

    return result
```

### Pattern 2: Bidirectional Data Sync with Webhooks

```python
import requests


def setup_weaviate_webhook(
    weaviate_url: str,
    api_key: str,
    webhook_url: str,
    class_name: str,
) -> dict:
    """Register a Weaviate module to push object events to an external webhook.

    This enables real-time notification when objects are created, updated, or deleted
    in the target collection, supporting event-driven architectures.

    Args:
        weaviate_url: Base URL of the Weaviate server
        api_key: API key with admin permissions
        webhook_url: External endpoint to receive webhook events
        class_name: Collection name to monitor

    Returns:
        Webhook registration response from Weaviate

    Note:
        Requires the weaviate-http-extensions module. Configure via REST API.
    """
    headers = {
        "X-Auth-Token": api_key,
        "Content-Type": "application/json",
    }

    webhook_config = {
        "className": class_name,
        "url": webhook_url,
        "events": ["CREATE", "UPDATE", "DELETE"],
    }

    response = requests.post(
        f"{weaviate_url}/v1/schema/{class_name}/webhooks",
        headers=headers,
        json=webhook_config,
    )
    response.raise_for_status()
    return response.json()


def handle_webhook_event(event: dict) -> None:
    """Process a Weaviate webhook event and update downstream systems.

    Args:
        event: Parsed webhook payload containing object metadata, action type,
               and timestamps. Structure varies by event type (create/update/delete).
    """
    action = event.get("action")  # "CREATE", "UPDATE", "DELETE"
    class_name = event.get("className")
    object_id = event.get("id")

    if action == "DELETE":
        # Remove from cache, invalidate derived data
        print(f"Object deleted: {class_name}/{object_id}")
        return

    # For CREATE/UPDATE: fetch full object and process
    import weaviate  # noqa — client already initialized at module level

    obj = client.collections.get(class_name).query.fetch_object_by_id(object_id)
    props = obj.properties if obj else {}
    print(f"Object {action}: {class_name}/{object_id} = {props}")
```

---

## Constraints

### MUST DO
- Always validate external data against the Weaviate class schema before batch insertion
- Use batch operations (`insert_many`, `batch_refs`) for bulk imports — single inserts are 10x slower
- Implement exponential backoff retry logic (3 retries, base delay 1s) for transient API failures
- Track sync state with source IDs to enable idempotent upserts and detect data drift
- Set explicit timeouts on all Weaviate client operations to prevent hangs

### MUST NOT DO
- Insert objects without a unique identifier property — queries by ID will be unreliable
- Use synchronous single-object inserts in production loops — always batch them
- Skip error handling for partial batch failures — use `insert_many` with per-item error tracking
- Store raw embeddings directly if Weaviate's built-in vectorizers can compute them server-side

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Weaviate Python Client Documentation](https://weaviate.io/developers/weaviate/client-libraries/python)
- [Weaviate API Reference](https://weaviate.io/developers/api-reference/)
- [Batch Operations Guide](https://weaviate.io/developers/weaviate/api-reference/batch)
- [Schema Design Best Practices](https://weaviate.io/developers/weaviate/starter-guide/schema)
- [Vectorizer Modules Reference](https://weaviate.io/developers/weaviate/module-ref/vectorizers)
