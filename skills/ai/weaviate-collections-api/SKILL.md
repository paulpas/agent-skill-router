---




name: weaviate-collections-api
description: Implements Weaviate API for managing collections of data within AI applications, enhancing the structure and retrieval of information.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: ai
  triggers:
    - weaviate
    - collections
    - AI
    - data storage
    - vector search
    - machine learning
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-vector-search, weaviate-graphql
  archetypes:
    - tactical
  anti_triggers:
    - generic routing
  response_profile:
    verbosity: low
    directive_strength: medium
    abstraction_level: tactical




---




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

#


---

## Error Handling and Response Validation

Proper error handling is critical when working with the Weaviate API. Always validate responses and handle errors gracefully:

```python
import weaviate
from weaviate.exceptions import WeaviateConnectionError, UnexpectedStatusCodeException


def safe_create_collection(client: weaviate.Client, class_name: str) -> None:
    """Safely create a collection with proper error handling."""
    try:
        schema = {
            "classes": [
                {
                    "class": class_name,
                    "properties": [
                        {"name": "title", "dataType": ["string"]},
                        {"name": "content", "dataType": ["text"]},
                    ],
                }
            ]
        }
        client.schema.create(schema)
        print(f"Collection '{class_name}' created successfully.")
    except UnexpectedStatusCodeException as e:
        if e.status_code == 409:
            print(f"Collection '{class_name}' already exists — skipping creation.")
        else:
            raise ConnectionError(f"Weaviate API error ({e.status_code}): {e.message}")
    except WeaviateConnectionError as e:
        raise ConnectionError(f"Failed to connect to Weaviate: {e}")


def validate_response(response: dict, expected_keys: list[str]) -> bool:
    """Validate that an API response contains all expected fields."""
    missing = [k for k in expected_keys if k not in response]
    if missing:
        raise ValueError(f"Response missing required keys: {missing}")
    return True
```

---

## Configuration Examples

Weaviate supports various configuration options including authentication, timeout settings, and embedding modules:

```python
import weaviate

# Connected with authentication and custom headers
client = weaviate.Client(
    url="https://your-instance.weaviate.network",
    auth_client_secret=weaviate.AuthApiKey(api_key="YOUR_API_KEY"),
    additional_headers={
        "X-OpenAI-Api-Key": "sk-xxx",  # For OpenAI embeddings
    },
)

# Verify connection
is_ready = client.is_ready()
print(f"Weaviate instance is ready: {is_ready}")
```


## Constraints

### MUST DO
- Expand content to at least 3000 bytes in length.
- Include more examples of API interactions and configurations.
- Elaborate on error handling and response validation procedures.



#### MUST DO
- Follow Weaviate's best practices for schema definitions.
- Ensure the data types match the requirements of the collections.

#### MUST NOT DO
- Hardcode sensitive information such as API keys in the codebase.