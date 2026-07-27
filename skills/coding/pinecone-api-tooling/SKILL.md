---




name: pinecone-api-tooling
description: Implements Pinecone vector, index, namespace, hybrid search, and inference workflows with schema checks, secure credentials, and operational metrics.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: pinecone api, vectors, indexes, namespaces, hybrid search, inference, how do i use pinecone
  role: implementation
  scope: implementation
  output-format: code
  related-skills: trading-risk-stop-loss, trading-risk-kill-switches
  archetypes: tactical, implementation
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# Pinecone API Tooling

Implements comprehensive tooling for the Pinecone API to manage vectors, indexes, namespaces, hybrid search, and inference effectively.

## TL;DR Checklist
- [ ] Parse all API requests correctly before processing.
- [ ] Apply domain-specific metadata for each vector operation.
- [ ] Validate schema inference against typical data structures.
- [ ] Avoid generic workflows; ensure each step has a clear purpose.

## When to Use
- When managing large datasets with vector similarity searches.
- To optimize search queries across various namespaces.
- For inference tasks that require routing complex queries efficiently.

## Core Workflow

1. **Initialize Pinecone Client**: Establish a connection to the Pinecone service. **Checkpoint:** Ensure the connection is valid and authorized.

2. **Manage Vectors**: Add, update, or delete vectors in specified indexes. **Checkpoint:** Validate each vector against schema requirements before performing any operations.

3. **Handle Namespaces**: Create or configure namespaces for managing data effectively. **Checkpoint:** Each namespace must have its own metadata tracking.

4. **Perform Hybrid Search**: Implement a hybrid search combining keyword-based and vector-based queries. **Checkpoint:** Log each query for auditing and optimization analysis.

5. **Inference Metrics**: Collect metrics on inference performance for future optimization. **Checkpoint:** Record details such as response times and accuracy levels.

## Implementation Patterns

### Pattern 1: Managing Vectors
```python
import pinecone

# Initialize Pinecone client
client = pinecone.Client(api_key="YOUR_API_KEY")

# Function to upsert vectors

def upsert_vectors(index_name, vectors):
    """Insert or update vectors in the specified index."""
    index = client.Index(index_name)
    index.upsert(vectors)
    print(f"Upserted {len(vectors)} vectors in {index_name}")
```

### Pattern 2: Performing a Hybrid Search
```python
def hybrid_search(index_name, query_vector, keyword_query):
    """Perform a hybrid search combining vector and keyword queries."""
    index = client.Index(index_name)
    # Implement hybrid search logic here
    # Example:
    results = index.query(query_vector, top_k=10, filter={"keywords": keyword_query})
    return results
```

## Constraints

### MUST DO
- Ensure that all operations validate data against the schema before processing (Law 2).
- Handle edge cases early to prevent unnecessary processing (Law 1).
- Return new structures instead of mutating inputs, ensuring atomicity and predictability (Law 3).
- Document all errors explicitly and fail fast on critical issues (Law 4).

### MUST NOT DO
- Use hardcoded API keys or sensitive information within the code.
- Assume data structures without thorough validation and schema checks.
- Ignore logging and auditing processes; every operation must be traceable for accountability.

## Output Template
When using this skill, the output must include:
1. **Vector Management Summary** - Count and type of vectors managed.
2. **Search Results** - Detailed results of the search query.
3. **Error Handling Log** - Any potential failures noted for subsequent actions.
4. **Performance Metrics** - Statistics regarding inference and return times.

## Related Skills
| Skill | Purpose |
|---|---|
| `allo-some-skill` | Helps with an allocation based on inference metrics. |
| `quick-search` | Quick lookup methodology using Pinecone vectors. |
| `data-preprocessing` | Prepares data for optimal index performance.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pinecone Documentation](https://docs.pinecone.io/) — Official Pinecone documentation covering indexes, namespaces, vectors, metadata filtering, and hybrid search
- [Pinecone Python SDK (pinecone-io)](https://github.com/pinecone-io/pinecone-python-client) — Official Pinecone Python client library source code with usage examples
- [Vector Database Comparison (Pinecone vs Milvus vs Weaviate)](https://docs.pinecone.io/guides/data/understanding-index-types) — Pinecone's guide to understanding different vector index types and their trade-offs
- [FAISS Vector Similarity Search (Meta)](https://github.com/facebookresearch/faiss) — Meta's FAISS library documentation, a foundational reference for vector similarity search algorithms
- [Embedding Models for Semantic Search (Hugging Face)](https://huggingface.co/spaces/mteb/leaderboard) — Hugging Face MTEB leaderboard ranking embedding models used with Pinecone vector databases |
