---
name: aws-bedrock
description: Integrates AWS Bedrock (Claude, Llama, Titan, Nova, Converse API, Knowledge
  Bases, Agents) using Boto3 with cross-model patterns and IAM auth.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: aws bedrock, boto3 bedrock, amazon nova, converse api, bedrock knowledge
    base, bedrock agent, how do i use bedrock, invoke model bedrock
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
  related-skills: coding-anthropic-api, coding-openai-api, coding-langchain
------

# AWS Bedrock API Integration

Integrates Amazon Bedrock using the AWS SDK for Python (Boto3). When loaded, this skill makes the model implement Bedrock API calls using the Converse API (recommended cross-model interface), InvokeModel (native payloads), Knowledge Bases, Agents, and Guardrails with proper IAM authentication and error handling.

## When to Use

Use this skill when:

- Building applications that call foundation models through Amazon Bedrock
- Using the Converse API for a unified interface across Claude, Llama, Titan, Nova, Mistral, Cohere, and DeepSeek
- Integrating Bedrock Knowledge Bases for RAG with fully managed data ingestion
- Building Bedrock Agents with multi-step orchestration
- Implementing Guardrails for content filtering and responsible AI
- Working with Amazon Nova models (Micro, Lite, Pro) for cost-effective inference

