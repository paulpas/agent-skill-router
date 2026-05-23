---
name: pinecone-api
description: Integrates Pinecone vector database (serverless/pod indexes, upsert,
  query, hybrid search, inference, gRPC) using the pinecone Python SDK v9 for production
  vector search.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: pinecone, vector database, vector search, pinecone index, hybrid search,
    upsert vectors, how do i use pinecone, semantic search
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
  related-skills: coding-openai-api, coding-langchain, coding-llamaindex, coding-chroma,
    coding-weaviate-api
------

# Pinecone API Integration

Integrates Pinecone vector database using the `pinecone` Python SDK (v9.0+). When loaded, this skill makes the model implement Pinecone operations for creating and managing indexes, upserting and querying vectors, hybrid search, metadata filtering, and integrated inference.

## When to Use

Use this skill when:

- Building vector search applications for semantic search, recommendations, or RAG
- Creating and managing serverless or pod-based Pinecone indexes
- Implementing vector upsert, query, fetch, update, and delete operations
- Using hybrid search combining dense and sparse vectors
- Using Pinecones integrated inference API (embedding and reranking models)
- Working with namespaces for multi-tenant vector search
- Performing bulk imports from object storage (S3, GCS, Azure Blob)
- Using gRPC transport for high-throughput upsert workloads

