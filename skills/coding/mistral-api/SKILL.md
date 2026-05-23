---
name: mistral-api
description: Integrates Mistral AI API (Chat, Embeddings, Function Calling, Codestral,
  Agents) using the mistralai Python SDK for LLM and code generation applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mistral, mistral ai, mistral api, codestral, mistral chat, mistral embeddings,
    how do i use mistral, le chat
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
  related-skills: coding-openai-api, coding-cohere-api, coding-langchain
------

# Mistral AI API Integration

Integrates Mistral AI API using the `mistralai` Python SDK for chat completions, embeddings, function calling, code generation (Codestral), and agent building. When loaded, this skill makes the model implement Mistral API calls with proper authentication, streaming, and error handling.

## When to Use

Use this skill when:

- Building chat applications with Mistral models (Mistral Large, Mistral Small, Mistral Nemo)
- Generating code with Codestral for AI-assisted programming
- Creating embeddings with Mistral's embedding model for semantic search
- Implementing function calling / tool use with Mistral models
- Building agents that use Mistral as the reasoning engine
- Using Mistral's Agents API for managed agent deployment
- Streaming responses for real-time applications

