---
name: tool-evaluation-workflow
description: Applies a structured evaluation framework to select tools, libraries,
  and frameworks based on technical fit, community health, security posture, performance
  benchmarks, and total cost of ownership for software projects.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: tool evaluation, library selection, framework comparison, proof of concept,
    technology assessment, how do i evaluate tools, build vs buy decision, dependency
    management
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: implementation
  scope: implementation
  output-format: analysis
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: dependency-inversion-principle, refactoring-techniques, modular-design
------

# Tool and Framework Evaluation Workflow

Applies a structured evaluation framework to select tools, libraries, and frameworks for project adoption. This skill makes the model define measurable criteria, score candidates against weighted dimensions, execute focused proof-of-concept tests, review security posture, and produce a data-driven recommendation with documented trade-offs and migration planning.

## TL;DR Checklist

- [ ] Document every requirement as testable/verifiable — no vague preferences like "good performance"
- [ ] Build shortlist with at least 3 candidates including one wild card (unconventional but viable option)
- [ ] Score each candidate on weighted criteria totaling 100%, using evidence not opinion
- [ ] Execute proof-of-concept for top 2 candidates exercising the core use case under realistic conditions
- [ ] Review security: CVE history, license compatibility (OSI), supply chain risks — no copyleft conflicts
- [ ] Produce evaluation report with scored comparison, risk assessment, and phased rollout plan

