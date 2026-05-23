---
name: chroma
description: Integrates Chroma vector database (collections, embeddings, query, metadata
  filtering, persistence) using the chromadb Python SDK for local and server-based
  vector search.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: chroma, chromadb, vector database, embedding store, similarity search,
    chroma collection, how do i use chroma, local vector search
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
  related-skills: coding-openai-api, coding-pinecone-api, coding-weaviate-api, coding-langchain,
    coding-llamaindex
------

# Chroma Integration

Integrates Chroma vector database using the `chromadb` Python SDK. When loaded, this skill makes the model implement Chroma operations for creating and managing collections, adding and querying documents, metadata filtering, embedding functions, and persistence.

## When to Use

Use this skill when:

- Building local vector search applications with in-memory or persistent storage
- Prototyping RAG pipelines before scaling to production vector databases
- Using Chroma as a local embedding store for testing and development
- Building applications that need a simple, lightweight vector database without cloud dependencies
- Running Chroma in server mode for distributed access
- Using custom embedding functions with collections
- Implementing metadata filtering and document filtering in vector search

