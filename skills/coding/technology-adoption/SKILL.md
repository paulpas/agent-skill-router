---
name: technology-adoption
description: Maps concrete project requirements to specific technology recommendations
  using domain-driven decision matrices, adoption risk scoring, and phased rollout
  strategies for selecting and leveraging technologies effectively.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: technology adoption, tech stack choice, how do i choose technology, select
    framework for my project, pick the right tool, technology decision, framework
    recommendation, technology leverage, ecosystem navigation, adoption strategy
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
  related-skills: framework-selection, framework-utilization, software-architecture,
    hexagonal-architecture
------

# Technology Adoption and Leverage Framework

Maps concrete project requirements to specific technology recommendations using domain-driven decision matrices, adoption risk scoring, and phased rollout strategies. This skill helps teams choose technologies that match their actual needs (not hype) and then leverage them effectively by working with the ecosystem rather than against it.

## TL;DR Checklist

- [ ] Define 3-5 concrete requirements that constrain technology choices (NOT "scalable" or "maintainable")
- [ ] Map each requirement to specific technical capabilities, not brand names
- [ ] Score candidates using the adoption risk matrix — maturity, team fit, ecosystem health, lock-in potential
- [ ] Verify at least one production reference exists for the top candidate in your project domain
- [ ] Plan a phased rollout: spike → prototype → limited pilot → full adoption with rollback criteria
- [ ] Identify the 2-3 framework-specific patterns that unlock 80% of its value — ignore the rest initially

