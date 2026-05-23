---
name: ai-llm-framework-ecosystem
description: Evaluates AI/LLM framework ecosystems (LangChain, LlamaIndex, CrewAI,
  DSPy, Microsoft Agent Framework) using structured scoring across capability domains
  to guide production project architecture decisions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ai framework selection, llm orchestration, langchain vs llamaindex, agentic
    workflow, how do i choose an ai framework, prompt engineering framework, AI agent
    platform, RAG architecture
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
  related-skills: coding-architecture-patterns, coding-design-patterns, coding-testing-strategies,
    coding-dependency-management
------

# AI/LLM Framework Ecosystem Navigator

Evaluates AI/LLM framework ecosystems using structured scoring across capability domains to guide production-grade project architecture decisions. When loaded, this skill makes the model analyze requirements against LangChain, LlamaIndex, CrewAI, DSPy, and Microsoft Agent Framework, then produce a ranked recommendation with vendor lock-in assessment and migration strategy.

## TL;DR Checklist

- [ ] Define the AI project's capability requirements across all 8 domains (memory, orchestration, RAG, agents, evaluation, observability, deployment, data handling)
- [ ] Score each candidate framework against every domain using weighted scoring (0-10 scale with justification)
- [ ] Calculate vendor lock-in risk by assessing abstraction depth, proprietary extensions, and migration cost
- [ ] Evaluate ecosystem health: release cadence, community size, enterprise backing, and breaking change history
- [ ] Produce a ranked recommendation with tiebreaker rules for equal scores
- [ ] Generate dependency configuration (pyproject.toml) and CI pipeline template matching the chosen framework
- [ ] Document migration path and fallback strategy if the primary framework degrades

