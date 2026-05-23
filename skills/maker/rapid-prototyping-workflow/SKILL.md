---
name: rapid-prototyping-workflow
description: Implements rapid prototyping workflows (code mocks, breadboard hardware,
  physical models, wireframes) with decision matrices and build-test-learn cycles
  to validate concepts quickly.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: maker
  triggers: rapid prototyping, quick prototype, proof of concept, iterative design,
    mockup, wireframe, how do i quickly test an idea
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
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
  - config
  - examples
  - do-dont
  related-skills: digital-fabrication, maker-safety-practices
------

# Rapid Prototyping Workflow

Implements rapid prototyping workflows to go from raw idea to verified concept through structured build-test-learn cycles. Models select the right fidelity level, choose appropriate build methods (software mockups, hardware breadboards, physical models), run focused validation tests, and make data-driven go/no-go/pivot decisions.

## TL;DR Checklist

- [ ] Define what specifically you need to learn or validate before building anything
- [ ] Choose the lowest viable fidelity that can answer your core question
- [ ] Build only ONE primary user interaction path — no edge cases yet
- [ ] Write test scenarios BEFORE starting construction so success criteria are clear
- [ ] Test with at least 3 real users or measurable conditions, not just yourself
- [ ] Collect quantifiable data: time-on-task, error rate, completion rate, satisfaction score (1–5)
- [ ] Run the Go/No-Go/Pivot decision matrix against your test results
- [ ] Archive all raw test data and notes for the next iteration

