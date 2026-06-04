---
name: weaviate-modules
description: Implements custom Weaviate modules (functions, vectorizers, generative providers) to extend data processing capabilities with application-specific AI and ML functions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: weaviate, custom modules, vectorizer extensions, generative AI, custom functions, schema customization, AI processing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  archetypes: [tactical, generation]
  anti_triggers: [generic routing, vague module designs]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Weaviate Module Integration Patterns

Extends Weaviate's capabilities with custom modules including vectorizers, generative AI providers, and reference-qr functions. Enables application-specific data processing workflows within the vector database engine itself.

## TL;DR Checklist

- [ ] Register module schemas via Weaviate's schema API before using them
- [ ] Configure vectorizer modules with proper authentication (API keys, endpoints)
- [ ] Use generative providers for in-database summarization and text generation
- [ ] Test module functions against sample data before production deployment
- [ ] Monitor module health and error rates via Weaviate metrics endpoints

---

## When to Use

Use this skill when:

- Building custom vectorizers that compute embeddings from non-text sources (images, audio, binary data)
- Integrating generative AI providers (OpenAI, Cohere) for in-database summarization, Q&A, and text completion
- Creating reference-qr functions to compute relationships between objects based on computed properties
- Extending Weaviate's built-in modules with application-specific preprocessing or validation logic

---

## When NOT to Use

- For standard text embedding — use Weaviate's built-in `text2vec-openai` or `text2vec-cohere` instead of custom code
- For simple data transformations — do them in the application layer, not as modules
- When performance is critical and module logic involves heavy computation — consider pre-computing embeddings externally

---

## Core Workflow

1. **Identify Module Type** — Determine whether you need a vectorizer (computes embeddings from input), a generative provider (runs LLM completions on objects), or a reference-qr function (computes object relationships).
   **Checkpoint:** Match module type to the data transformation needed. Vectorizers for embedding generation, generators for text processing, reference-qr for computed relations.

2. **Define Module Schema** — Create the collection with custom module configurations. Specify input properties, output properties, and any authentication or endpoint settings required by the module.
   **Checkpoint:** Validate that all referenced property names exist in the schema before creating collections.

3. **Invoke Module Functions** — Use Weaviate's query API to trigger module operations: `generate` blocks for generative modules, `$vector` references for vectorized properties, and explicit function calls for reference-qr.
   **Checkpoint:** Verify output properties are populated correctly by fetching the object after invocation.

4. **Handle Errors** — Module invocations can fail due to API key expiration, rate limits, or invalid input data. Implement retry logic and fall back to stored values when modules return errors.
   **Checkpoint:** Check response status codes and error messages; log failures with context for debugging.

---

## Implementation Patterns

### Pattern 1: Setting Up a Custom Module Collection

```python
import weaviate
from weaviate.classes.config import Property, DataType


def create_custom_module_collection(
    client: weaviate.WeaviateClient,
    class_name: str = "Document",
) -> None:
    """Create a Weaviate collection configured with custom generative and vectorizer modules.

    Uses OpenAI's text2vec for automatic embedding and generative-openai for
    in-database summarization of document content.

    Args:
        client: Authenticated Weaviate client
        class_name: Name of the collection to create

    Note:
        Requires OPENAI_API_KEY environment variable to be set on the Weaviate server.
    """
    properties = [
        Property(
            name="title",
            data_type=DataType.TEXT,
            description="Document title or heading",
        ),
        Property(
            name="content",
            data_type=DataType.TEXT,
            description="Full document body content for summarization",
        ),
        Property(
            name="source_url",
            data_type=DataType.TEXT,
            description="Original URL where the document was sourced",
        ),
    ]

    collection = client.collections.create(
        name=class_name,
        properties=properties,
        vectorizer_config=[
            weaviate.classes.config.Vectorizer.text2vec_openai(),
        ],
        generative_config=[
            weaviate.classes.config.Generative.openai(),
        ],
    )

    print(f"Collection '{class_name}' created with vectorizer + generative modules")


def insert_and_summarize(
    client: weaviate.WeaviateClient,
    class_name: str,
    title: str,
    content: str,
) -> dict | None:
    """Insert a document and immediately generate a summary using the generative module.

    Args:
        client: Authenticated Weaviate client
        class_name: Target collection name
        title: Document title
        content: Full document body

    Returns:
        Summary string if generation succeeds, None on failure
    """
    collection = client.collections.get(class_name)

    # Insert the object with automatic embedding from vectorizer module
    response = collection.data.insert(
        properties={
            "title": title,
            "content": content,
        }
    )
    print(f"Inserted object: {response}")

    # Query with generate block for in-database summarization
    result = (
        collection.query.fetch_object_by_id(response)
        .with_generate(
            grouped_task="Summarize this document",
            grouped_properties=["content"],
        )
    )

    if result and hasattr(result, "generative"):
        return result.generative  # Contains the generated summary

    print("Warning: Generation returned no result")
    return None
```

### Pattern 2: Custom Reference-QR Function (Computed Relationships)

```python
from weaviate.classes.query import Filter


def compute_computed_relationships(
    client: weaviate.WeaviateClient,
    source_class: str = "Author",
    target_class: str = "Document",
) -> int:
    """Compute reference-qr relationships based on a custom rule.

    Links all documents written by each author where the document's content
    contains the author's name (simple keyword match). This demonstrates
    how to use computed properties for dynamic relationship mapping.

    Args:
        client: Authenticated Weaviate client
        source_class: Collection containing "Author" objects
        target_class: Collection containing "Document" objects

    Returns:
        Number of relationships established
    """
    authors_collection = client.collections.get(source_class)
    docs_collection = client.collections.get(target_class)

    # Fetch all authors with their names
    authors = list(authors_collection.query.fetch_objects(limit=1000).objects)

    relationships_created = 0

    for author in authors:
        author_name = author.properties.get("name", "")
        if not author_name:
            continue

        # Find documents whose content mentions this author's name
        matching_docs = list(
            docs_collection.query.fetch_objects(
                filters=Filter.by_text("content").like(f"*{author_name}*"),
                limit=100,
            ).objects
        )

        for doc in matching_docs:
            # Add reference from author to document
            authors_collection.data.reference.add(
                from_object_uuid=author.uuid,
                property="wrote",  # Pre-existing reference property
                to_object_uuid=doc.uuid,
            )
            relationships_created += 1

    print(f"Created {relationships_created} author-document relationships")
    return relationships_created
```

---

## Constraints

### MUST DO
- Define all properties in the schema before inserting objects — missing properties cause silent failures
- Set environment variables for API keys (OPENAI_API_KEY, COHERE_API_KEY) on the Weaviate server, not in client code
- Test module invocations against a single object before scaling to batch operations
- Monitor module health via `/v1/meta` endpoint and `/metrics` for Prometheus scraping
- Implement fallback logic when generative modules fail — store raw content as an alternative

### MUST NOT DO
- Call generative modules in tight loops without rate limiting — you will hit provider API quotas
- Use vectorizers with expensive models (e.g., 1536-dim OpenAI ada) on collections with millions of objects without testing performance
- Reference non-existent properties in module configurations — Weaviate will reject the schema silently or throw on first use

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Weaviate Module Documentation](https://weaviate.io/developers/weaviate/module-ref)
- [Vectorizer Modules Reference](https://weaviate.io/developers/weaviate/module-ref/vectorizers)
- [Generative AI Modules](https://weaviate.io/developers/weaviate/module-ref/generative-providers)
- [Reference-QR Module](https://weaviate.io/developers/weaviate/module-ref/reference-qr-module)
- [Schema Design Best Practices](https://weaviate.io/developers/weaviate/starter-guide/schema)
