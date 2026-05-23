---
name: mcp-protocol
description: Implements Model Context Protocol (MCP) servers and clients using the
  mcp Python SDK (FastMCP, resources, tools, prompts, transports) for LLM tool integration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mcp, model context protocol, mcp server, fastmcp, mcp tools, mcp resources,
    how do i build an mcp server, mcp python sdk
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
  related-skills: coding-anthropic-api, coding-langchain, coding-openai-api
------

# Model Context Protocol (MCP) Integration

Implements MCP (Model Context Protocol) servers and clients using the `mcp` Python SDK (v1.25+). When loaded, this skill makes the model build MCP servers that expose tools, resources, and prompts to LLM applications using FastMCP, with support for stdio, SSE, and Streamable HTTP transports.

## When to Use

Use this skill when:

- Building MCP servers that expose tools, resources, or prompts to LLM applications (Claude Desktop, VS Code, AI IDEs)
- Creating MCP clients that connect to remote servers and consume tools
- Integrating external APIs as MCP tools for agent access
- Exposing database schemas, file contents, or API responses as MCP resources
- Defining reusable prompt templates for LLM interaction patterns
- Deploying MCP servers with Streamable HTTP transport for remote access
- Building custom tool integrations for Claude Desktop or other MCP hosts

