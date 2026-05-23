---
name: perplexity-api
description: Integrates Perplexity AI API (Sonar chat completions, online search,
  multi-step queries) using the perplexity-openai Python SDK for real-time web-connected
  LLM responses.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: perplexity, perplexity ai, sonar, perplexity api, perplexity sonar, online
    LLM, how do i use perplexity, real-time search LLM
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
  related-skills: coding-openai-api, coding-anthropic-api, coding-pinecone-api
------

# Perplexity AI API Integration

Integrates Perplexity AI's Sonar API using the `perplexity-openai` Python SDK for real-time web-connected LLM completions. When loaded, this skill makes the model implement Perplexity API calls with proper authentication, streaming, and citation handling for online search-augmented responses.

## When to Use

Use this skill when:

- Building applications that need real-time web-connected LLM answers via Perplexity Sonar
- Implementing research assistants that cite web sources in responses
- Using Perplexity models for up-to-date information (current events, recent news, latest data)
- Building search-enhanced Q&A systems that don't need a separate RAG pipeline
- Using Sonar Pro for complex multi-step search queries with deeper context
- Applications requiring cited responses with source URLs and attribution

