---
name: openai-api
description: Integrates OpenAI API (GPT-5, Responses API, Embeddings, DALL-E 3, Whisper,
  Realtime) using the openai Python SDK v2.38+ with proper error handling and async
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: openai, gpt-5, responses api, chat completions, function calling, openai
    embeddings, how do i use the openai api, text-embedding-3-large
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
  related-skills: coding-anthropic-api, coding-azure-openai, coding-langchain
------

# OpenAI API Integration

Integrates OpenAIs GPT-5, GPT-5-mini, GPT-5-nano, GPT-4o, and embedding models using the `openai` Python SDK (v2.38+). When loaded, this skill makes the model implement OpenAI API calls with proper client initialization, error handling, streaming, async patterns, and the new Responses API.

## When to Use

Use this skill when:

- Building applications that call OpenAI chat, completion, embedding, image generation, or transcription APIs
- Implementing function calling / tool use with OpenAI GPT models
- Working with the Responses API (recommended for GPT-5+ models)
- Integrating OpenAI embeddings for vector search or RAG pipelines
- Handling streaming responses, async clients, or batch processing
- Implementing structured outputs with JSON schema responses

