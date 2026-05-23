---
name: weaviate-api
description: Integrates Weaviate vector database (v4 Python client, collections, vector
  search, hybrid, generative modules, GraphQL) for AI-powered search applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: weaviate, vector database, weaviate client, hybrid search, generative
    search, weaviate graphql, how do i use weaviate, vector collections
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
  related-skills: coding-pinecone-api, coding-chroma, coding-openai-api, coding-langchain
------

# Weaviate API Integration

Integrates Weaviate vector database using the `weaviate-client` Python SDK (v4.21+). When loaded, this skill makes the model implement Weaviate operations for collection management, vector and hybrid search, generative search, batch import, and data modeling with the v4 collections API.

## When to Use

Use this skill when:

- Building vector search applications with Weaviate's hybrid (vector + keyword) search
- Using Weaviate's generative search modules (OpenAI, Cohere, Anthropic, etc.) for RAG
- Implementing multi-vector search with named vectors and hybrid queries
- Building AI-powered search with automatic vectorization modules
- Using Weaviate's GraphQL API directly for advanced query patterns
- Managing multi-tenant collections with tenant activity statuses (ACTIVE, INACTIVE, OFFLOADED)
- Using Weaviate modules for text2vec, generative, reranker, and image search

