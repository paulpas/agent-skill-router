---
name: engineering-tradeoffs
description: Evaluates competing engineering options using weighted decision matrices,
  reversibility analysis, and multi-criteria tradeoff frameworks to make defensible
  technical decisions under constraints.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: engineering tradeoffs, decision making under constraints, build vs buy,
    speed vs quality, technology selection, weighted decision matrix, tradeoff analysis,
    two-way door decisions, CAP theorem software
  archetypes:
  - orchestration
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
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
  related-skills: architecture-decision-records, design-pattern-selection, engineering-principles,
    technical-debt-management
------

# Engineering Tradeoff Analysis

Senior engineer facilitating structured tradeoff decisions when requirements conflict and no option is perfect. This skill makes the model act as a disciplined decision analyst — surfacing hidden assumptions, quantifying competing priorities, and producing recommendations with explicit reasoning that stakeholders can challenge or endorse.

## TL;DR Checklist

- [ ] Write the conflict explicitly: "We want X but X requires A while Y requires B"
- [ ] Classify all requirements: Non-negotiable → Strong Preference → Nice-to-have
- [ ] Classify decision reversibility: Two-way door (act fast) vs One-way door (deep analysis)
- [ ] Define success criteria BEFORE generating or evaluating any options
- [ ] Generate at least 3 distinct options — never present a binary choice
- [ ] Evaluate using weighted decision matrix with transparent scoring
- [ ] Make a call and document the reasoning, not just the outcome

