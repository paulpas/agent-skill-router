---
name: cohere-api
description: Integrates Cohere API (Generate, Embed, Rerank, Classify, Chat, Tool
  Use) using the cohere Python SDK for NLP, search, and RAG applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cohere, cohere api, cohere embed, cohere rerank, cohere generate, cohere
    chat, how do i use cohere, cohere classify
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
  related-skills: coding-openai-api, coding-mistral-api, coding-pinecone-api, coding-langchain
------

# Cohere API Integration

Integrates Cohere API using the `cohere` Python SDK for embedding, reranking, classification, generation, chat with tool use, and multilingual NLP. When loaded, this skill makes the model implement Cohere API calls with proper authentication, error handling, and batch processing.

## When to Use

Use this skill when:

- Generating embeddings with Cohere's `embed-multilingual-v3.0` or `embed-english-v3.0` for multilingual semantic search
- Reranking search results with Cohere's rerank endpoint for improved RAG accuracy
- Building classification models with Cohere's Classify endpoint (few-shot)
- Using Cohere's Chat API with tool use (function calling) for conversational AI
- Generating text with Cohere's Generate API for content creation
- Building multilingual search applications across 100+ languages
- Implementing command-following models (Command R/R+) for RAG workflows

