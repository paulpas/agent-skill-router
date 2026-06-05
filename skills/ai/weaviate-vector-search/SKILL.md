---




name: weaviate-vector-search
description: Implements vector search capabilities of the Weaviate API, allowing efficient and scalable retrieval of relevant data for AI applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: ai
  triggers:
    - weaviate
    - vector search
    - AI
    - retrieval
    - machine learning
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-collections-api, weaviate-graphql
  archetypes:
    - tactical
  anti_triggers:
    - generic routing
  response_profile:
    verbosity: low
    directive_strength: medium
    abstraction_level: tactical




---




# Weaviate Vector Search

Leverages the vector search functionality of the Weaviate API to retrieve relevant data efficiently in AI applications.

## When to Use

In addition, provide more illustrative examples showing the power of vector searches through Weaviate's API, particularly in AI-driven applications.

- Searching for similar items based on embeddings from AI models.
- Enabling semantic search capabilities in applications.
- Efficiently querying large datasets using vector representations.

## Core Workflow

1. **Setup Connection** — Establish a connection to the Weaviate service.
2. **Perform Vector Search** — Use vectors to retrieve relevant data.
3. **Handle Search Results** — Parse and utilize the retrieved data.

## Implementation Patterns

### Pattern 1: Connecting to Weaviate
```python
import weaviate

# Initialize client for Weaviate
client = weaviate.Client("http://localhost:8080")
```

### Pattern 2: Executing a Vector Search
```python
# Define the query vector
query_vector = [0.15, 0.30, 0.25, ...]  # Example values

# Perform vector search
esults = client.query.get("Article").with_near_vector({"vector": query_vector}).with_limit(5).do()

# Process results
for result in results["data"]["Get"]["Article"]:
    print(result)
``` 

#


---

## Error Handling and Advanced Queries

Always handle API errors gracefully when performing vector searches:

```python
import weaviate
from weaviate.exceptions import UnexpectedStatusCodeException


def safe_vector_search(client, collection_name, query_vector, limit=5):
    """Perform a vector search with proper error handling."""
    try:
        results = (
            client.query.get(collection_name, ["title", "content"])
            .with_near_vector({"vector": query_vector})
            .with_limit(limit)
            .do()
        )
        return results
    except UnexpectedStatusCodeException as e:
        print(f"Vector search failed: status {e.status_code} - {e.message}")
        raise


def hybrid_search(client, collection_name, text_query, vector_query, limit=5):
    """Perform a hybrid (text + vector) search combining keyword and semantic matching."""
    results = (
        client.query.get(collection_name, ["title", "content"])
        .with_bm25(query=text_query)
        .with_near_vector({"vector": vector_query})
        .with_limit(limit)
        .do()
    )
    return results
```

---

## Vector Similarity Thresholds

Control search results quality with similarity thresholds:

```python
def thresholded_search(client, collection_name, query_vector, limit=5, minimum_similarity=0.7):
    """Search with a minimum similarity threshold to filter out weak matches."""
    results = (
        client.query.get(collection_name, ["title", "content"])
        .with_near_vector({"vector": query_vector})
        .with_limit(limit)
        .do()
    )

    filtered = []
    for item in results.get("data", {}).get("Get", {}).get(collection_name, []):
        certainty = item.get("_additional", {}).get("certainty", 0.0)
        if certainty >= minimum_similarity:
            filtered.append(item)

    print(f"Returned {len(filtered)} results above threshold {minimum_similarity}")
    return filtered
```


## Constraints

### MUST DO
- Expand content to at least 3000 bytes in length.
- Include additional examples of error handling and response validation.


### MUST DO
- Expand content to at least 3000 bytes in length.
- Include more examples of API interactions and configurations.
- Elaborate on error handling and response validation procedures.



#### MUST DO
- Ensure vectors used are derived from proper AI model outputs.
- Keep vector dimensions consistent with the models used.

#### MUST NOT DO
- Use fixed or hardcoded values for vectors; **must be dynamic or parameterized.**