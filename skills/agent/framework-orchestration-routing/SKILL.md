---
name: framework-orchestration-routing
description: Orchestrates task routing across multiple AI frameworks (LangChain, LlamaIndex,
  CrewAI, AutoGen, MCP) by selecting the optimal framework for each subtask and composing
  cross-framework workflows with proper context bridges.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: framework orchestration routing, FOR, langchain, llamaindex, crewai, auto
    gen, multi agent orchestration, cross framework workflow, how do i choose ai framework,
    agent framework selection
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
  - diagrams
  related-skills: intelligent-skill-selection, confidence-based-selector, agent-architecture-patterns,
    workflow-patterns
------

# Framework Orchestration Routing (FOR)

Orchestrates task routing across multiple AI frameworks by selecting the optimal framework for each subtask and composing cross-framework workflows. When this skill is active, the model acts as a senior AI systems architect who evaluates framework capabilities against task requirements, designs cross-framework orchestration patterns, and implements context bridges between disparate systems.

## TL;DR Checklist

- [ ] Classify the task into a capability domain (RAG, multi-agent coordination, tool use, chaining)
- [ ] Map each subtask to the framework with strongest native support for that domain
- [ ] Design context bridge interfaces where frameworks exchange data
- [ ] Implement failure isolation — one framework's failure does not cascade to others
- [ ] Validate routing decisions against latency and cost constraints

