---
name: anthropic-api
description: Integrates Anthropic Claude API (Messages API, Tool Use, MCP Connector,
  Computer Use, Batches) using the anthropic Python SDK with streaming and error handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: anthropic, claude, claude api, messages api, tool use, mcp connector,
    how do i use claude api, anthropic bedrock
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
  related-skills: coding-openai-api, coding-aws-bedrock, coding-mcp-protocol
------

# Anthropic Claude API Integration

Integrates Anthropic Claude models (Claude Opus 4, Sonnet 4, Haiku 3.5) using the `anthropic` Python SDK. When loaded, this skill makes the model implement Claude API calls with proper Messages API patterns, tool use (function calling), MCP connector integration, streaming, and error handling.

## When to Use

Use this skill when:

- Building applications that call Anthropic Claude models (Opus, Sonnet, Haiku)
- Implementing tool use / function calling with Claude
- Integrating MCP (Model Context Protocol) servers with the Claude API MCP connector
- Using streaming responses for real-time applications
- Building multi-turn conversations with Claude
- Using platform integrations (Bedrock, Vertex AI, Foundry)
- Implementing Computer Use for desktop automation

