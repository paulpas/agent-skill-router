---
name: huggingface-api
description: Integrates Hugging Face APIs (Inference Client, Inference Endpoints,
  Transformers Pipeline, Datasets) for serverless and dedicated model inference with
  Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hugging face, huggingface, transformers, inference api, inference endpoints,
    pipelines, how do i use hugging face models, hf inference client
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
  related-skills: coding-openai-api, coding-replicate-api, coding-langchain
------

# Hugging Face API Integration

Integrates Hugging Face APIs for model inference using the `huggingface_hub` `InferenceClient`, dedicated Inference Endpoints, `transformers` pipelines, and `datasets` library. When loaded, this skill makes the model implement Hugging Face model inference with proper token management, task routing, batching, and error handling.

## When to Use

Use this skill when:

- Running inference on Hugging Face models via the serverless Inference API
- Deploying and managing dedicated Inference Endpoints for production workloads
- Using `transformers` pipelines for local or batch inference with Hugging Face models
- Loading and processing datasets with the `datasets` library for ML pipelines
- Building text classification, generation, embedding, or image analysis pipelines
- Using custom inference handlers for specialized model deployment
- Integrating Hugging Face models as LLM providers in agentic applications

