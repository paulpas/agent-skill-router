---
name: ai-framework-selector
description: Evaluates and selects the optimal AI agent framework (LangChain, CrewAI,
  LlamaIndex, DSPy, Microsoft Agent Framework) for a project based on capability requirements,
  production constraints, and team expertise.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: ai framework selection, which ai framework to use, langchain vs crewai,
    choose ai agent framework, framework comparison, build custom vs use framework,
    AI agent tooling, how do i pick an ai framework, LLM framework evaluation
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
  - diagrams
  related-skills: framework-selection, framework-orchestration-routing, orchestration-frameworks,
    agent-architecture-patterns
------

# AI Agent Framework Selector

Selects the optimal AI agent framework for a project by evaluating capability requirements against the current ecosystem of production-grade frameworks. When this skill is active, the model acts as a senior AI systems architect who analyzes project requirements, scores available frameworks against those requirements, and produces a defensible selection rationale with implementation guidance.

## TL;DR Checklist

- [ ] Extract explicit requirements (RAG, multi-agent, tool use) and implicit constraints (team expertise, budget, deployment target)
- [ ] Classify each requirement into capability domains: RAG/retrieval, multi-agent coordination, tool execution, chain composition, parallel processing, prompt optimization
- [ ] Score all candidate frameworks against each domain using the capability matrix (1–10 scale with justification)
- [ ] Validate the top choice meets ALL hard constraints; disqualify if any hard constraint fails
- [ ] Assess vendor lock-in risk for the winning framework and document mitigation strategies
- [ ] Produce a selection report with scored comparison, trade-off analysis, and phased implementation plan

