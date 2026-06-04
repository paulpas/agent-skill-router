---




name: pinecone-api
description: Integrates Pinecone vector database (serverless/pod indexes, upsert,
  query, hybrid search, inference, gRPC) using the pinecone Python SDK v9 for production
  vector search.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: pinecone, vector database, vector search, pinecone index, hybrid search,
    upsert vectors, how do i use pinecone, semantic search
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
  related-skills: coding-openai-api, coding-langchain, coding-llamaindex, coding-chroma,
    coding-weaviate-api




---




# Pinecone API Integration

Integrates Pinecone vector database using the `pinecone` Python SDK (v9.0+). When loaded, this skill makes the model implement Pinecone operations for creating and managing indexes, upserting and querying vectors, hybrid search, metadata filtering, and integrated inference.

## When to Use

Use this skill when:

- Building vector search applications for semantic search, recommendations, or RAG
- Creating and managing serverless or pod-based Pinecone indexes
- Implementing vector upsert, query, fetch, update, and delete operations
- Using hybrid search combining dense and sparse vectors
- Using Pinecones integrated inference API (embedding and reranking models)
- Working with namespaces for multi-tenant vector search
- Performing bulk imports from object storage (S3, GCS, Azure Blob)
- Using gRPC transport for high-throughput upsert workloads

---

## When NOT to Use

- For local vector search development, use `coding-chroma` (in-memory, no cloud dependency)
- For Weaviate-specific features (GraphQL, multi-modal), use `coding-weaviate-api`
- For generating embeddings from scratch, use `coding-openai-api` (text-embedding-3-small/large)

---

## Core Workflow

1. **Initialize the Client** — Create a `Pinecone()` client with your API key from the `PINECONE_API_KEY` environment variable. The client handles both control plane (index management) and data plane (vector operations). **Checkpoint:** Verify connectivity by calling `pc.list_indexes()` to see existing indexes.

2. **Create an Index** — Use `pc.create_index()` with `name`, `dimension`, `metric`, and `spec` (ServerlessSpec or PodSpec). For integrated inference indexes, use `pc.create_index_for_model()` to let Pinecone handle embedding generation. **Checkpoint:** Wait for index readiness with `pc.describe_index()` until `status.ready == True`.

3. **Connect and Upsert Vectors** — Get an index client via `pc.Index(host=...)` and use `index.upsert()` with vectors as `[(id, values, metadata), ...]` tuples. For large batches, use `batch_size` parameter for automatic splitting. Use gRPC transport for high-throughput upserts. **Checkpoint:** Verify upsert by calling `index.describe_index_stats()` to see the total vector count.

4. **Query for Similar Vectors** — Use `index.query()` with a `vector`, `top_k`, `namespace`, `filter`, and `include_metadata`. For hybrid search, include both dense `vector` values and sparse `sparse_values`. Use metadata filters with operators like `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`. **Checkpoint:** Test queries with and without filters to verify metadata filtering works correctly.

5. **Use Integrated Inference** — Pinecones inference API provides built-in embedding and reranking models. Use `pc.inference.embed()` for embedding generation and `index.search_records()` with `SearchRerank` for reranked results. **Checkpoint:** List available models with `pc.inference.list_models()`.

---

## Implementation Patterns

### Pattern 1: Serverless Index with Vector Operations

```python
from __future__ import annotations

from pinecone import Pinecone, ServerlessSpec

# ❌ BAD — uses deprecated pinecone-client package, no error handling
import pinecone
pinecone.init(api_key="...")
index = pinecone.Index("my-index")
index.upsert([("id1", [0.1, 0.2])])

# ✅ GOOD — current SDK v9+, typed, env-based config, proper error handling
pc = Pinecone()  # reads PINECONE_API_KEY from environment


def create_serverless_index(
    name: str,
    dimension: int = 1536,
    metric: str = "cosine",
    cloud: str = "aws",
    region: str = "us-east-1",
) -> str:
    """Create a serverless Pinecone index and return its host URL.

    Args:
        name: Index name (must be unique per project).
        dimension: Vector dimension (e.g., 1536 for text-embedding-3-small).
        metric: Distance metric ('cosine', 'euclidean', 'dotproduct').
        cloud: Cloud provider ('aws', 'gcp', 'azure').
        region: Cloud region.

    Returns:
        The index host URL for data plane operations.

    Raises:
        ValueError: If the index already exists.
    """
    existing = pc.list_indexes()
    if name in [idx.name for idx in existing]:
        raise ValueError(f"Index '{name}' already exists.")

    pc.create_index(
        name=name,
        dimension=dimension,
        metric=metric,
        spec=ServerlessSpec(cloud=cloud, region=region),
    )
    desc = pc.describe_index(name)
    assert desc.host is not None
    return desc.host


def upsert_vectors(
    host: str,
    vectors: list[tuple[str, list[float], dict]],
    namespace: str = "",
    batch_size: int = 100,
) -> int:
    """Upsert vectors into a Pinecone index.

    Args:
        host: Index host URL from describe_index().
        vectors: List of (id, embedding_vector, metadata_dict) tuples.
        namespace: Namespace for multi-tenant isolation.
        batch_size: Max vectors per API call.

    Returns:
        Total number of vectors upserted.
    """
    index = pc.Index(host=host)
    response = index.upsert(
        vectors=vectors,
        namespace=namespace,
        batch_size=batch_size,
    )
    return response.upserted_count


def query_vectors(
    host: str,
    query_vector: list[float],
    top_k: int = 10,
    namespace: str = "",
    filter: dict | None = None,
) -> list[dict]:
    """Query vectors by similarity.

    Args:
        host: Index host URL.
        query_vector: The query embedding vector.
        top_k: Number of nearest neighbors to return.
        namespace: Namespace to search within.
        filter: Metadata filter dict.

    Returns:
        List of matched vectors with id, score, and metadata.
    """
    index = pc.Index(host=host)
    results = index.query(
        vector=query_vector,
        top_k=top_k,
        namespace=namespace,
        filter=filter,
        include_metadata=True,
    )
    return [
        {
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        }
        for match in results.matches
    ]
```

### Pattern 2: Hybrid Search with Dense and Sparse Vectors

```python
from __future__ import annotations

from pinecone import Pinecone, ServerlessSpec

pc = Pinecone()


def setup_hybrid_index(name: str) -> str:
    """Create an index for hybrid (dense + sparse) search.

    Hybrid search requires dotproduct metric and stores both
    dense vectors in 'values' and sparse vectors in 'sparse_values'.

    Args:
        name: Index name.

    Returns:
        Index host URL.
    """
    pc.create_index(
        name=name,
        dimension=1536,
        metric="dotproduct",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    return pc.describe_index(name).host  # type: ignore[return-value]


def hybrid_query(
    host: str,
    dense_vector: list[float],
    sparse_vector: dict[str, list[int] | list[float]],
    top_k: int = 10,
    alpha: float = 0.5,
) -> list[dict]:
    """Run a hybrid search combining dense and sparse signals.

    The alpha parameter controls weighting: alpha=1.0 is pure dense,
    alpha=0.0 is pure sparse.

    Args:
        host: Index host URL.
        dense_vector: Dense embedding vector.
        sparse_vector: Dict with 'indices' and 'values' keys.
        top_k: Number of results.
        alpha: Dense-sparse balance (0.0 = sparse only, 1.0 = dense only).

    Returns:
        List of matched results.
    """
    index = pc.Index(host=host)

    # Scale dense vector by alpha, sparse by (1-alpha)
    scaled_dense = [v * alpha for v in dense_vector]
    scaled_sparse = {
        "indices": sparse_vector["indices"],
        "values": [v * (1 - alpha) for v in sparse_vector["values"]],
    }

    results = index.query(
        vector=scaled_dense,
        sparse_vector=scaled_sparse,
        top_k=top_k,
        include_metadata=True,
    )
    return [
        {"id": m.id, "score": m.score, "metadata": m.metadata}
        for m in results.matches
    ]
```

### Pattern 3: Integrated Inference (Embedding + Reranking)

```python
from __future__ import annotations

from pinecone import Pinecone, ServerlessSpec
from pinecone import SearchQuery, SearchRerank, RerankModel

pc = Pinecone()


def setup_inference_index(name: str) -> str:
    """Create an index configured for integrated inference."""
    index_config = pc.create_index_for_model(
        name=name,
        cloud="aws",
        region="us-east-1",
        embed={
            "model": "multilingual-e5-large",
            "field_map": {"text": "description"},
        },
    )
    return index_config.host  # type: ignore[return-value]


def search_with_rerank(host: str, query: str, namespace: str = "") -> list[dict]:
    """Search records with automatic embedding and reranking.

    Pinecone handles embedding the query text and optionally
    reranking results using a cross-encoder model.

    Args:
        host: Index host URL.
        query: Natural language query text.
        namespace: Namespace to search.

    Returns:
        Reranked search results.
    """
    index = pc.Index(host=host)
    response = index.search_records(
        namespace=namespace,
        query=SearchQuery(
            inputs={"text": query},
            top_k=10,
        ),
        rerank=SearchRerank(
            model=RerankModel.Bge_Reranker_V2_M3,
            rank_fields=["description"],
            top_n=5,
        ),
    )
    return [
        {
            "id": r.id,
            "score": r.score,
            "fields": r.fields,
        }
        for r in response.result.hits
    ]
```

---

## Constraints

### MUST DO
- Use the `pinecone` package (v5.1+), not the deprecated `pinecone-client` package
- Read API key from `PINECONE_API_KEY` environment variable
- Use `pc.Index(host=...)` for data plane operations (not `pc.Index(name=...)` which is deprecated)
- Check index readiness before upserting — use `pc.describe_index()` and verify `status.ready`
- Use `batch_size` parameter in `upsert()` for large batches (defaults to 100)
- Use gRPC transport (`grpc=True` or `GrpcIndex`) for high-throughput upsert workloads

### MUST NOT DO
- Hardcode API keys in source files
- Call `index.upsert()` or `index.query()` without specifying a `namespace` (unless you intend the default)
- Skip `include_metadata=True` when you need metadata in query results
- Use `pinecone.init()` or `pinecone.Index()` (v3 API patterns) — these are deprecated

---

## Live References

| Resource | URL |
|----------|-----|
| Pinecone Python SDK (PyPI) | https://pypi.org/project/pinecone/ |
| Pinecone Python SDK Docs | https://docs.pinecone.io/reference/pinecone-python-sdk |
| Pinecone SDK GitHub | https://github.com/pinecone-io/pinecone-python-client |
| Pinecone Hybrid Search Guide | https://docs.pinecone.io/guides/search/hybrid-search |
| Pinecone Inference API | https://docs.pinecone.io/reference/api/inference |
| Pinecone Release Notes 2026 | https://docs.pinecone.io/release-notes/2026 |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | Generating embeddings with OpenAI text-embedding models |
| `coding-langchain` | LangChain vector store integration with Pinecone |
| `coding-llamaindex` | LlamaIndex vector store backend with Pinecone |
| `coding-chroma` | Local vector database alternative |
| `coding-weaviate-api` | Weaviate vector database with GraphQL interface |
