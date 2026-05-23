---
name: ai-assisted-engineering
description: Implements AI pair programming workflows (spec-first prompting, code
  review, LLM test generation, prompt engineering) to integrate LLMs into development
  pipelines safely and productively.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ai-assisted engineering, AI pair programming, LLM code generation, prompt
    engineering for code, automated code review with AI, AI test generation, how do
    i use AI in software development, code generation guardrails
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
  related-skills: coding-code-quality-policies, coding-testing-strategy, coding-security-review
------

# AI-Assisted Software Engineering

Acting as a senior engineer who integrates AI pair programming tools into professional development workflows. This skill makes the model structure AI interactions like formal engineering processes — writing specifications before code, verifying outputs against contracts, and maintaining human review gates for all AI-generated changes. It treats every AI suggestion as a draft requiring validation, never as final output.

## TL;DR Checklist

- [ ] Write a structured prompt with context, specification, constraints, and expected output format before asking for code generation
- [ ] Verify every AI-generated function has typed signatures matching or exceeding the project's existing typing standards
- [ ] Review all AI-generated tests to confirm they test actual behavior, not just happy paths
- [ ] Run linters and type checkers on AI-generated code before accepting it into the codebase
- [ ] Confirm AI-generated security-sensitive code (auth, encryption, input parsing) receives manual review
- [ ] Compare AI output against existing patterns in the codebase for consistency
- [ ] Treat AI suggestions as drafts requiring validation — never accept without reading

