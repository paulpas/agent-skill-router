---

metadata:
  archetypes: [ai, weaviate, graphql]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

name: weaviate-graphql
description: Implements the GraphQL capabilities of the Weaviate API, enabling flexible querying options for managing AI datasets efficiently.
license: MIT
compatibility: opencode
metadata:
  archetypes: [ai, weaviate, graphql]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  archetypes: [ai, weaviate, graphql]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
  domain: ai
  triggers: weaviate, GraphQL, AI, query language, database management
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-collections-api, weaviate-vector-search
---

metadata:
  archetypes: [ai, weaviate, graphql]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}


# Weaviate GraphQL API

This skill utilizes the GraphQL interface of the Weaviate API for dynamic querying of datasets related to AI applications. It covers advanced querying techniques, error handling, and response validation procedures to enhance user interactions.

## When to Use

- When needing complex queries that require filtering, sorting, or selecting specific fields.
- To manipulate data in Weaviate collections using GraphQL syntax.
- For gaining insights from AI-driven datasets dynamically.

## Core Workflow

1. **Initialize Weaviate Client** — Connect to the Weaviate instance.
2. **Create GraphQL Query** — Formulate the GraphQL query.
3. **Execute Query** — Send and retrieve data through the Weaviate API.

## Implementation Patterns

### Pattern 1: Formulating a GraphQL Query
```python
import weaviate

client = weaviate.Client("http://localhost:8080")

# Define a GraphQL query
query = "{\n  Get {\n    Article {\n      title\n      content\n    }\n  }\n}" 
```
### Pattern 2: Executing a GraphQL Query
```python
# Send the query to Weaviate API
response = client.query.raw(query)

# Handle response
print(response)
``` 

### Constraints

### MUST DO
- Expand content to at least 3000 bytes in length.
- Provide concrete examples of how GraphQL queries can be structured and executed with error handling and validation.

### MUST DO
- Expand content to at least 3000 bytes in length.
- Include additional examples of error handling and response validation.


### MUST DO
- Expand content to at least 3000 bytes in length.
- Include more examples of API interactions and configurations.
- Elaborate on error handling and response validation procedures.



#### MUST DO
- Familiarize with Weaviate's GraphQL schema for meaningful queries.
- Validate responses to ensure compliance with expected structures.

#### MUST NOT DO
- Use arbitrary or poorly-structured GraphQL queries; ensure clarity and precision.