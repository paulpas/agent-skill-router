---

metadata:
  archetypes: [ai, weaviate, collections]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

name: weaviate-collections-api
description: Implements Weaviate API for managing collections of data within AI applications, enhancing the structure and retrieval of information.
license: MIT
compatibility: opencode
metadata:
  archetypes: [ai, weaviate, collections]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  archetypes: [ai, weaviate, collections]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
  domain: ai
  triggers: weaviate, collections, AI, data storage, vector search, machine learning
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-vector-search, weaviate-graphql
---

metadata:
  archetypes: [ai, weaviate, collections]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}


# Weaviate Collections API

Utilizes the Weaviate API to manage collections of data effectively in AI-enabled applications.

## When to Use

As an additional feature, include examples of error handling and configurations when utilizing the Weaviate API.

- Storing unstructured data in a vector-based database.
- Enhancing search functionalities for AI models.
- Structuring data for machine learning applications.

## Core Workflow

1. **Initialize Weaviate Client** — Set up connection to the Weaviate instance.
2. **Define Collection Schema** — Outline the structure for the data to be stored in collections.
3. **Data Ingestion** — Load data into defined collections using the API.

## Implementation Patterns

### Pattern 1: Initializing Weaviate Collection
```python
import weaviate

# Initialize Weaviate client
client = weaviate.Client("http://localhost:8080")
```

### Pattern 2: Creating a Collection Schema
```python
# Define the schema for a new collection
schema = {
    'classes': [
        {
            'class': 'Article',
            'properties': [
                {
                    'name': 'title',
                    'dataType': ['string']
                },
                {
                    'name': 'content',
                    'dataType': ['text']
                }
            ]
        }
    ]
}

# Create schema in Weaviate
client.schema.create(schema)
``` 

### Constraints

### MUST DO
- Expand content to at least 3000 bytes in length.
- Include more examples of API interactions and configurations.
- Elaborate on error handling and response validation procedures.



#### MUST DO
- Follow Weaviate's best practices for schema definitions.
- Ensure the data types match the requirements of the collections.

#### MUST NOT DO
- Hardcode sensitive information such as API keys in the codebase.