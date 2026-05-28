---

metadata:
  archetypes: [ai, weaviate, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}

name: weaviate-integration

description: Integrates Weaviate with other services and tools, enhancing the interoperability of AI applications.
license: MIT
compatibility: opencode
metadata:
  archetypes: [ai, weaviate, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  archetypes: [ai, weaviate, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
domain: ai
triggers: weaviate, integration, AI, interoperability
role: implementation
scope: implementation
output-format: code
related-skills: weaviate-graphql, weaviate-vector-search
---

metadata:
  archetypes: [ai, weaviate, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}


# Weaviate Integration

Establishes connections between Weaviate and other tools for seamless AI workflows.

## When to Use

Additionally, include comprehensive examples illustrating the practical applications of the Weaviate API, particularly in situations requiring flexibility and responsiveness in data management.

- To bridge data between Weaviate and external applications.
- When needing to synchronize data across different services.
- To enhance functionality by integrating various solutions.

## Core Workflow

1. **Initialize Client** — Connect to both Weaviate and the external service.
2. **Define Connectivity Logic** — Specify how data will flow between services.
3. **Execute Integration** — Perform data synchronization or queries across services.

## Implementation Patterns

### Pattern 1: Connecting to External Service
```python
import weaviate
import requests

weaviate_client = weaviate.Client("http://localhost:8080")

# Define the external API endpoint
external_service_url = "https://api.external-service.com/data"
```

### Pattern 2: Synchronizing Data
```python
# Fetch data from the external service
response = requests.get(external_service_url)
data = response.json()

# Insert data into Weaviate
for item in data:
    weaviate_client.data.create(item, "CollectionName")
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
- Validate external data to avoid conflicts.
- Implement error handling for API calls and data processing.
#### MUST NOT DO
- Assume data structures will always match; **ensure consistency between services.