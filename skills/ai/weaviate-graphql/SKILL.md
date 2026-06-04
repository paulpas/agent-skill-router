---




name: weaviate-graphql
description: Implements the GraphQL capabilities of the Weaviate API, enabling flexible querying options for managing AI datasets efficiently.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: ai
  triggers:
    - weaviate
    - GraphQL
    - AI
    - query language
    - database management
  role: implementation
  scope: implementation
  output-format: code
  related-skills: weaviate-collections-api, weaviate-vector-search
  archetypes:
    - tactical
  anti_triggers:
    - generic routing
  response_profile:
    verbosity: low
    directive_strength: medium
    abstraction_level: tactical




---




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

#


---

## Error Handling and Validation

Always validate GraphQL responses and handle API errors gracefully:

```python
import weaviate
from weaviate.exceptions import UnexpectedStatusCodeException


def safe_execute_query(client, query_str):
    """Execute a GraphQL query with error handling."""
    try:
        response = client.query.raw(query_str)
        return response
    except UnexpectedStatusCodeException as e:
        print(f"GraphQL query failed with status {e.status_code}: {e.message}")
        raise
    except Exception as e:
        print(f"Unexpected error during GraphQL execution: {e}")
        raise


def search_articles_by_author(client, author_name, limit=10):
    """Search articles filtered by author name using GraphQL."""
    query = f"""{{
      Get {{
        Article(
          where: {{{{
            path: ["author"]
            operator: Like
            valueText: "{author_name}"
          }}}}
        ) {{
          title
          content
          author
        }}
        limit: {limit}
      }}
    }}"""
    return safe_execute_query(client, query)
```

---

## Response Parsing Patterns

Parse GraphQL responses efficiently for downstream use:

```python
def parse_search_results(response):
    """Extract and validate search results from a GraphQL response."""
    if not response or "data" not in response:
        raise ValueError("Invalid response format")

    articles = response["data"].get("Article", [])
    parsed = []
    for article in articles:
        entry = {
            "title": article.get("title", ""),
            "content": article.get("content", ""),
            "author": article.get("author", ""),
        }
        if not entry["title"]:
            continue  # Skip entries without a title
        parsed.append(entry)

    return parsed
```


## Constraints

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