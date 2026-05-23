---
name: langchain
description: Integrates LangChain/LangGraph (create_agent, chains, tools, memory,
  RAG, streaming, middleware) for building LLM-powered agents and applications in
  Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: langchain, langgraph, create agent, llm orchestration, rag chain, langchain
    agent, how do i use langchain, agent middleware
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
  related-skills: coding-openai-api, coding-anthropic-api, coding-llamaindex, coding-mcp-protocol
------

# LangChain / LangGraph Integration

Integrates LangChain v1.3+ and LangGraph v1.2+ for building LLM-powered agents and applications. When loaded, this skill makes the model implement LangChain agents using `create_agent`, LangGraph workflows, tool integration, RAG patterns, middleware hooks, and streaming.

## When to Use

Use this skill when:

- Building LLM-powered agents with tool calling and multi-step reasoning
- Implementing RAG (Retrieval-Augmented Generation) pipelines
- Creating stateful multi-agent workflows with LangGraph
- Adding middleware hooks (dynamic prompts, model wrapping, tool wrapping)
- Streaming LLM responses with typed event formats
- Building production-grade agents with persistence, human-in-the-loop, and error recovery
- Integrating with LangSmith for observability and evaluation

