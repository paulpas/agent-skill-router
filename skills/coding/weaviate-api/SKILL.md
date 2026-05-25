---
name: weaviate-api
description: Integrates Weaviate vector database (v4 Python client, collections, vector
  search, hybrid, generative modules, GraphQL) for AI-powered search applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: weaviate, vector database, weaviate client, hybrid search, generative
    search, weaviate graphql, how do i use weaviate, vector collections
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
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-pinecone-api, coding-chroma, coding-openai-api, coding-langchain
------
# Weaviate API Integration

Integrates Weaviate vector database using the `weaviate-client` Python SDK (v4.21+). When loaded, this skill makes the model implement Weaviate operations for collection management, vector and hybrid search, generative search, batch import, and data modeling with the v4 collections API.

## When to Use

Use this skill when:

- Building vector search applications with Weaviate's hybrid (vector + keyword) search
- Using Weaviate's generative search modules (OpenAI, Cohere, Anthropic, etc.) for RAG
- Implementing multi-vector search with named vectors and hybrid queries
- Building AI-powered search with automatic vectorization modules
- Using Weaviate's GraphQL API directly for advanced query patterns
- Managing multi-tenant collections with tenant activity statuses (ACTIVE, INACTIVE, OFFLOADED)
- Using Weaviate modules for text2vec, generative, reranker, and image search

---

## When NOT to Use

- For Pinecone-specific features (serverless auto-scaling, pod-based indexes), use `coding-pinecone-api`
- For Chroma's local in-memory simplicity, use `coding-chroma`
- For generating embeddings, use `coding-openai-api` or Weaviate's built-in modules

---

## Core Workflow

1. **Connect to Weaviate** — Use `weaviate.connect_to_wcs()` (Weaviate Cloud Services), `connect_to_local()`, `connect_to_custom()`, or `connect_to_embedded()` for local development. The v4 client requires Weaviate server v1.23.6+. **Checkpoint:** Verify connectivity: `client.is_ready()` must return `True`.

2. **Create a Collection** — Use `client.collections.create()` with a name, `vector_config` (use `Configure.Vectors.text2vec_*()` for auto-vectorization or `.self_provided()` for your own vectors), and properties with data types. The v4 API uses Python-native dataclass support for type-safe data operations. **Checkpoint:** Verify the collection exists with `client.collections.exists("CollectionName")`.

3. **Import Data in Batches** — Use `collection.data.insert_many()` for synchronous batch import or `collection.data.ingest()` for async streaming support. For large datasets, use `collection.data.insert()` in a loop with periodic commits. **Checkpoint:** Verify vector count with `collection.aggregate.over_all(total_count=True)`.

4. **Query with Vector, Hybrid, and Generative Search** — Use `collection.query.near_text()` for vector search, `.hybrid()` for hybrid (vector + BM25), and `.bm25()` for keyword search. For RAG, use `collection.generate.near_text()` which runs a generative module on the search results. **Checkpoint:** For generative search, verify the generative module is configured on the collection before querying.

5. **Use Filtering and Aggregation** — Apply metadata filters with `wvc.Filter.by_property()`. Use comparison operators (Equal, GreaterThan, LessThan, etc.) and logical operators (And, Or). Use `collection.aggregate` for aggregations including `over_all`, `group_by`, and `total_count`. **Checkpoint:** Test filters return the expected subset of results.

---

## Implementation Patterns

### Pattern 1: Connect, Create Collection, and Import

```python
from __future__ import annotations

import weaviate
import weaviate.classes as wvc
from weaviate.classes.config import Property, DataType, Configure

# ❌ BAD — uses v3 client API, manual GraphQL, no type safety
import weaviate
client = weaviate.Client("http://localhost:8080")
client.schema.create_class({"class": "Document", "properties": []})

# ✅ GOOD — v4 collections API, typed, proper connection management
client = weaviate.connect_to_local()  # connects to localhost:8080


class DocumentCollection:
    """Manage a Weaviate collection for documents."""

    @staticmethod
    def create(name: str = "Document") -> None:
        """Create a collection with auto-vectorization via Ollama.

        Args:
            name: Collection name.
        """
        client.collections.create(
            name=name,
            vector_config=Configure.Vectors.text2vec_ollama(
                model="nomic-embed-text",
            ),
            properties=[
                Property(name="title", data_type=DataType.TEXT),
                Property(name="content", data_type=DataType.TEXT),
                Property(name="category", data_type=DataType.TEXT),
                Property(name="views", data_type=DataType.INT),
            ],
        )

    @staticmethod
    def import_documents(documents: list[dict]) -> int:
        """Import documents with automatic vectorization.

        Args:
            documents: List of dicts with title, content, category, views keys.

        Returns:
            Number of successfully imported objects.
        """
        collection = client.collections.get("Document")
        response = collection.data.insert_many(documents)
        if response.has_errors:
            print(f"Failed imports: {len(response.errors)}")
        return len(response.uuids) if response.uuids else 0
```

### Pattern 2: Hybrid Search with Filters

```python
from __future__ import annotations

import weaviate
from weaviate.classes.query import Filter, QueryReference

client = weaviate.connect_to_local()


def hybrid_search(
    query: str,
    collection_name: str = "Document",
    alpha: float = 0.5,
    category_filter: str | None = None,
    top_k: int = 10,
) -> list[dict]:
    """Run a hybrid search combining vector and keyword (BM25) scores.

    Args:
        query: Natural language search query.
        collection_name: Collection to search.
        alpha: Vector vs. keyword weight (0=keyword only, 1=vector only).
        category_filter: Optional category to filter by.
        top_k: Maximum results.

    Returns:
        List of matched objects with scores and properties.
    """
    collection = client.collections.get(collection_name)

    # Build filter if specified
    where_filter = None
    if category_filter:
        where_filter = Filter.by_property("category").equal(category_filter)

    response = collection.query.hybrid(
        query=query,
        alpha=alpha,
        limit=top_k,
        filters=where_filter,
        return_metadata=wvc.query.MetadataQuery(score=True, distance=True),
    )

    return [
        {
            "id": str(obj.uuid),
            "score": obj.metadata.score,
            "distance": obj.metadata.distance,
            "properties": obj.properties,
        }
        for obj in response.objects
    ]
```

### Pattern 3: Generative Search (RAG with LLM)

```python
from __future__ import annotations

import weaviate
from weaviate.classes.config import Configure

# Requires a generative module (e.g., OpenAI) configured on the collection
client = weaviate.connect_to_local()

# Create collection with both vectorizer and generative module
collection_config = {
    "name": "RAGDocument",
    "vector_config": Configure.Vectors.text2vec_openai(),
    "generative_config": Configure.Generative.openai(),
}

if not client.collections.exists("RAGDocument"):
    client.collections.create(**collection_config)  # type: ignore


def generative_search(query: str, prompt: str | None = None) -> str:
    """Search and generate a response using Weaviate's generative module.

    The generative module takes retrieved objects and uses an LLM
    to produce a grounded response.

    Args:
        query: Natural language search query.
        prompt: Optional custom prompt (uses default if None).

    Returns:
        Generated response grounded in retrieved documents.
    """
    collection = client.collections.get("RAGDocument")

    response = collection.generate.near_text(
        query=query,
        limit=5,
        grouped_task=prompt or "Summarize the retrieved information to answer the query.",
    )

    if response.generated:
        return response.generated

    return "No response generated."
```

---

## Constraints

### MUST DO
- Use the v4 Python client (`weaviate-client>=4.21.0`) with the collections API — the v3 client is deprecated
- Use `client.collections.create()` with `Configure.Vectors.*` for auto-vectorization or `.self_provided()` for custom vectors
- Check `client.is_ready()` before any operation
- Use `collection.data.insert_many()` for batch imports and check `response.has_errors` for failed objects
- Use `wvc.query.MetadataQuery(score=True)` to get relevance scores in search results
- Use `Filter.by_property().equal()`, `.greater_than()`, etc. for metadata filtering

### MUST NOT DO
- Use the v3 `client.schema.create_class()` or `client.data_object.create()` pattern — these are the old API
- Use `Configure.NamedVectors` (v4.15-) — use `Configure.Vectors` (v4.16+) instead
- Skip `connect_to_embedded()` for local development — it automatically downloads and starts Weaviate
- Assume all generative modules are available — check module availability in the Weaviate instance configuration

---

## Live References

| Resource | URL |
|----------|-----|
| Weaviate Python Client Docs | https://weaviate-python-client.readthedocs.io/ |
| Weaviate Documentation | https://weaviate.io/developers/weaviate |
| Python Client API Reference | https://weaviate-python-client.readthedocs.io/en/stable/weaviate.html |
| Weaviate Collections Guide | https://weaviate.io/developers/weaviate/manage-data/collections |
| Hybrid Search Guide | https://weaviate.io/developers/weaviate/search/hybrid |
| Generative Search Guide | https://weaviate.io/developers/weaviate/search/generative |
| Weaviate Python Client GitHub | https://github.com/weaviate/weaviate-python-client |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-pinecone-api` | Alternative vector database (Pinecone) |
| `coding-chroma` | Local in-memory vector database |
| `coding-openai-api` | OpenAI embeddings and generative models for Weaviate modules |
| `coding-langchain` | LangChain vector store integration with Weaviate |
