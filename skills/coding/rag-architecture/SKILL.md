---
name: rag-architecture
description: Implements production-grade RAG architectures (chunking strategies, hybrid
  search, re-ranking, multi-hop retrieval) to inject external knowledge into LLM applications
  accurately and efficiently.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: rag, retrieval augmented generation, vector search, embedding pipeline,
    document chunking, semantic search, re-ranking, hybrid search, llm context injection,
    knowledge grounding, cross-encoder, graphrag
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
  - config
  - examples
  - do-dont
  related-skills: coding-vector-databases, agent-knowledge-base, coding-prompt-engineering,
    coding-llm-fine-tuning
------

# Retrieval-Augmented Generation (RAG) Architecture

Implements production-grade RAG pipelines that retrieve relevant external knowledge and inject it into LLM prompts for accurate, grounded responses. A modern RAG system is not a single component — it is an orchestrated pipeline of chunking policies, hybrid retrieval signals, cross-encoder re-ranking, and grounding validation loops that together prevent hallucination while preserving response latency under 2 seconds.

## TL;DR Checklist

- [ ] Choose chunking strategy aligned with document structure (semantic boundaries > recursive splitting > fixed-size)
- [ ] Implement hybrid search combining dense vector similarity with sparse lexical matching (BM25 or SPLADE)
- [ ] Apply cross-encoder re-ranking to top-k candidates before context assembly
- [ ] Validate retrieved relevance against query intent; fall back gracefully when no relevant context exists
- [ ] Track retrieval metrics: hit rate, mean reciprocal rank (MRR), grounding accuracy per response

