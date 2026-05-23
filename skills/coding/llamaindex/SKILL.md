---
name: llamaindex
description: Integrates LlamaIndex (indexes, query engines, agents, workflows, document
  parsing, RAG pipelines) for building data-aware LLM applications in Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: llamaindex, llama index, rag pipeline, query engine, vector store index,
    llama parse, how do i use llamaindex, document agents
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
  related-skills: coding-langchain, coding-openai-api, coding-pinecone-api, coding-chroma
------

# LlamaIndex Integration

Integrates LlamaIndex (v0.14+) for building data-aware LLM applications with indexing, retrieval, query engines, agents, and workflows. When loaded, this skill makes the model implement LlamaIndex pipelines for RAG, document Q&A, structured data extraction, and multi-agent orchestration.

## When to Use

Use this skill when:

- Building RAG (Retrieval-Augmented Generation) applications over your own documents
- Implementing advanced document indexing strategies (vector, tree, keyword, hybrid)
- Creating query engines with custom retrievers, rerankers, and response synthesizers
- Building agentic applications with `FunctionAgent`, tool calling, and multi-agent workflows
- Using LlamaParse for agentic OCR and document parsing (100+ formats)
- Implementing complex query workflows with event-driven `Workflow` patterns
- Building multi-agent systems with `AgentWorkflow` or custom orchestrator patterns

