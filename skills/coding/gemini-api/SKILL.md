---
name: gemini-api
description: Integrates Google Gemini API (Gemini 2.5 Pro/Flash, Function Calling,
  Vertex AI) using the google-genai Python SDK with content generation, streaming,
  and grounding.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: gemini, gemini api, vertex ai, google genai, function calling, gemini
    2.5 flash, how do i use gemini api, grounding
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
  related-skills: coding-openai-api, coding-anthropic-api, coding-langchain
------

# Google Gemini API Integration

Integrates Google Gemini models (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 3 Flash) using the `google-genai` Python SDK. When loaded, this skill makes the model implement Gemini API calls with content generation, function calling, streaming, grounding, and Vertex AI configuration.

## When to Use

Use this skill when:

- Building applications with Google Gemini models via the Gemini Developer API
- Deploying Gemini models on Vertex AI with Google Cloud integration
- Implementing function calling (tool use) with Gemini models
- Using Google Search grounding for factually grounded responses
- Building chat sessions with multi-turn conversation support
- Migrating from the legacy `vertexai` SDK to the new `google-genai` SDK

