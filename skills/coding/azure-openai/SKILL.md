---
name: azure-openai
description: Integrates Azure OpenAI Service (GPT deployments, Responses API, Content
  Filters, Entra ID auth, Assistants) using the OpenAI SDK with Azure v1 endpoint
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: azure openai, azure openai service, azure gpt, azure responses api, content
    filters, azure openai deployment, how do i use azure openai, microsoft foundry
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
  related-skills: coding-openai-api, coding-aws-bedrock, coding-langchain
------

# Azure OpenAI Service Integration

Integrates Azure OpenAI Service using the `openai` Python SDK with the Azure v1 API endpoint. When loaded, this skill makes the model implement Azure OpenAI calls with proper authentication (API key and Entra ID), the Responses API, content filter handling, and deployment management.

## When to Use

Use this skill when:

- Deploying and calling OpenAI models through Microsoft Azure OpenAI Service
- Using the new Azure OpenAI v1 API (stable, no `api-version` parameter needed)
- Implementing Entra ID (formerly Azure AD) token-based authentication
- Handling Azure OpenAI content filters and responsible AI configurations
- Building with GPT-5+ and newer models that require the Responses API on Azure
- Migrating from `AzureOpenAI()` client to the standard `OpenAI()` client with v1 endpoint
- Working with Azure Foundry model catalog (DeepSeek, Grok, etc. via OpenAI SDK)

