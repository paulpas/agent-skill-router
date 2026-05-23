---
name: hint-based-prompting
description: Applies subtle contextual hints instead of explicit step-by-step instructions
  to guide LLM output naturally, reducing token overhead and improving generation
  quality through framing rather than commanding.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hints, hint-based prompting, system hints, contextual guidance, token
    efficiency, prompt framing, how do i use hints in prompts, subtle prompting
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
  - do-dont
  - examples
  related-skills: prompt-engineer, instruction-engineering, agent-context-management,
    output-formatting
------

# Hint-Based Prompting for LLMs

Implements contextual hinting — using brief domain framing and environmental constraints instead of verbose explicit instructions — to guide LLM generation naturally while saving context window tokens. When this skill is active, the model replaces long constraint lists with precise scenario descriptions that make desired outputs feel inevitable rather than commanded.

## TL;DR Checklist

- [ ] Replace every 3+ sentence instruction with a single-sentence contextual hint
- [ ] Verify system prompt is under 100 words for hint-based skills
- [ ] Check that no hint contradicts an explicit instruction (explicit wins)
- [ ] Count tokens saved: aim for 40–70% reduction vs. verbose constraint list
- [ ] Pair hints with few-shot examples when format requirements are strict
- [ ] Test both versions on a sample task to confirm quality parity

