---
name: agent-context-management
description: Implements context window management, sliding window strategies, and
  persistent memory patterns to maintain AI agent coherence across long interactions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: context window, agent memory, sliding window, session state, prompt optimization,
    rag, token management, long conversation history
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: agent-conversation-summarizer, agent-task-decomposition-engine,
    agent-reasoning-framework
------

# Agent Context & Memory Manager

Manages AI agent context windows and implements memory patterns to maintain coherence, reduce token waste, and preserve critical state across extended interactions.

## TL;DR Checklist

- [ ] Calculate current token budget before appending new messages
- [ ] Apply sliding window or hierarchical summarization based on conversation length
- [ ] Persist structured session state to external storage when exceeding context limits
- [ ] Strip low-value system prompts and deprecated instructions from active context
- [ ] Validate that retrieved memory chunks directly support the current task
- [ ] Log token usage metrics for every context rotation cycle

