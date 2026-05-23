---
name: user-memory-system
description: Implements multi-layer user memory systems (episodic, semantic, procedural)
  for AI agents to retain context across sessions, enable personalization, and build
  long-term relationships with individual users.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: user memory, long-term memory, episodic memory, semantic memory, procedural
    memory, session persistence, memory retrieval, how do i remember user context,
    persistent AI, cross-session memory
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
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
  related-skills: ai-persona-design, personalized-behavior, conversation-memory
------

# User Memory System for AI Agents

Implements multi-layer memory systems enabling AI agents to retain context across sessions. Covers episodic memory (what happened), semantic memory (facts and knowledge), procedural memory (how to do things), and temporal decay mechanisms. A well-architected memory system is the foundation of genuine personalization — without it, every interaction starts from zero.

## TL;DR Checklist

- [ ] Design three memory layers: episodic (events), semantic (facts), procedural (habits)
- [ ] Implement MemoryItem with type discriminator, timestamps, and TTL for automatic decay
- [ ] Create a MemoryStore that handles CRUD operations across all memory layers
- [ ] Add relevance scoring so the agent retrieves only contextually useful memories
- [ ] Implement temporal decay — old memories fade in importance unless reinforced
- [ ] Build a retrieval system that scores memories by recency, importance, and query relevance
- [ ] Apply privacy constraints — never store PII without explicit consent; allow memory deletion

