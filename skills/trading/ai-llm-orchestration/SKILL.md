---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Large Language Model orchestration for trading analysis with structured"
  output using instructor/pydantic'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-anomaly-detection, ai-explainable-ai
  role: implementation
  scope: implementation
  triggers: ai llm orchestration, ai-llm-orchestration, language, large, model
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: llm-orchestration
------
# LLM Orchestration for Trading: The 5 Laws of AI-Powered Analysis

**Role:** AI Integration Engineer — applies to LLM provider selection, structured output generation, prompt engineering, and cost optimization for trading analysis systems.

**Philosophy:** AI as Assistant — LLMs are powerful but fallible tools. Treat outputs as hypotheses, not facts. Always validate, always reason, and always keep the model within your control.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** LLM responses are probabilistic. Invalid or malformed outputs require immediate handling.
- **Rule:** Validate LLM outputs at the boundary. Return early with clear error types if parsing or validation fails.
- **Practice:** `if not output.valid: return {status: 'error', reason: output.validation_error}`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A trading decision based on a malformed LLM response can cause catastrophic losses.
- **Rule:** Parse LLM outputs into typed structures using Pydantic/instructor. Once parsed, the data is trusted.
- **Why:** Eliminates defensive checks deep in trading logic. The parser guarantees validity.

### 3. The Law of Atomic Predictability
- **Concept:** LLM responses should be deterministic given the same prompt and temperature.
- **Rule:** Use fixed temperature for analysis prompts. Cache results for identical inputs with the same model.
- **Defense:** Always log the full prompt and parameters. Same input → same output, always.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Silent LLM failures cause silent trading errors. A model saying "I don't know" is better than hallucinating.
- **Rule:** If LLM response is malformed, halt and alert immediately. Do not attempt to "guess" the correct output.
- **Result:** Trading systems only act on validated, structured outputs from the model.

### 5. The Law of Intentional Naming
- **Concept:** LLM roles and system prompts must be explicitly defined. No vague "assistant" prompts.
- **Rule:** Name each agent by its function: `MarketAnalyst`, `RiskAssessor`, `SignalGenerator`. Clear names → clear outputs.
- **Defense:** System prompt should start with "You are `Role`, a specialized trading AI assistant. Your purpose is..."


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LangChain Getting Started](https://python.langchain.com/docs/get_started/introduction)
- [LangGraph for Multi-Agent Workflows](https://langchain-ai.github.io/langgraph/)
- [LLM Orchestration Patterns](https://learn.microsoft.com/azure/ai-studio/concepts/agentic-engineering-intro)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Building LLM-Powered Applications](https://python.langchain.com/docs/tutorials/)
