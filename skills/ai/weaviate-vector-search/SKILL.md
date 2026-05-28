---

metadata:
  archetypes: [ai, weaviate, vector-search]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

name: weaviate-vector-search
description: Implements vector search capabilities of the Weaviate API, allowing efficient and scalable retrieval of relevant data for AI applications.
license: MIT
compatibility: opencode
metadata:
  archetypes: [ai, weaviate, vector-search]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  archetypes: [ai, weaviate, vector-search]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
  domain: ai
  triggers: weaviate, vector search, AI, retrieval, machine learning
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-collections-api, weaviate-graphql
---

metadata:
  archetypes: [ai, weaviate, vector-search]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}


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

# Perform vector searchesults = client.query.get("Article").with_near_vector({"vector": query_vector}).with_limit(5).do()

# Process results
for result in results["data"]["Get"]["Article"]:
    print(result)
``` 

### Constraints

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