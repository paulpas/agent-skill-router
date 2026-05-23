---
name: replicate-api
description: Integrates Replicate API (models, predictions, trainings, webhooks) using
  the replicate Python SDK for running and fine-tuning open-source AI models in the
  cloud.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: replicate, replicate api, replicate predictions, replicate training, replicate
    webhook, how do i use replicate, run open source models
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
  related-skills: coding-huggingface-api, coding-openai-api, coding-stabilityai-api
------

# Replicate API Integration

Integrates Replicate API using the `replicate` Python SDK for running and fine-tuning open-source AI models in the cloud. When loaded, this skill makes the model implement Replicate API calls for running predictions (sync and async), training/fine-tuning models, handling webhooks, and managing model deployments.

## When to Use

Use this skill when:

- Running open-source AI models via Replicate (Llama, Mistral, Stable Diffusion, Whisper, etc.)
- Implementing async predictions with polling for long-running model inference
- Fine-tuning / training models on custom datasets through Replicates training API
- Using webhooks for asynchronous notification when predictions complete
- Deploying custom models as Replicate deployments for production use
- Building applications that need access to a wide variety of open-source models without managing GPU infrastructure

