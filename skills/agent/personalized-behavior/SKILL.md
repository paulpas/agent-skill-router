---
name: personalized-behavior
description: Implements personalized AI agent behavior by learning and adapting to
  individual user preferences, communication styles, expertise levels, and interaction
  history for tailored responses.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: personalized behavior, adaptive agent, user preferences, communication
    style, expertise level, tailored responses, how do i customize ai agent, user
    profiling
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
  related-skills: personal-workflow-framework,conversation-memory,hierarchical-agent-memory
------

# Personalized AI Agent Behavior

Implements personalized AI agent behavior by adapting responses to individual users based on learned preferences, communication styles, expertise levels, and interaction history. The model acts as a user-aware assistant that continuously refines its output format, tone, depth, and complexity to match each user's evolving needs and expectations.

## TL;DR Checklist

- [ ] Build or load a UserProfile containing explicit style and preference fields
- [ ] Classify communication style (direct, explanatory, visual, structured) before responding
- [ ] Adjust response depth based on expertise_level (beginner → expert scale)
- [ ] Store interaction history with timestamps for pattern recognition over sessions
- [ ] Apply early-exit guard clauses when profile data is missing or stale
- [ ] Return a new ProfileSnapshot after every significant interaction
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) in all persistence logic

