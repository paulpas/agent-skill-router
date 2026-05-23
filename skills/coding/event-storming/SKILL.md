---
name: event-storming
description: Facilitates collaborative EventStorming workshops to discover bounded
  contexts, map domain events, identify aggregates and commands, and produce visual
  business process models for domain-driven design projects.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event storming, eventstorming, domain discovery, workshop facilitation,
    bounded context, domain events, sticky notes, collaborative modeling
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
  - diagrams
  related-skills: ddd-context-mapping, ddd-tactical-patterns, event-driven-patterns,
    architecture-decision-records
------

# EventStorming Facilitator

Facilitates collaborative EventStorming workshops to discover bounded contexts, map domain events, identify aggregates and commands, and produce visual business process models for domain-driven design projects.

EventStorming is not a documentation exercise — it is a **discovery workshop** where developers, domain experts, product owners, and stakeholders collaboratively build a shared understanding of the business domain through visual mapping on a physical or virtual timeline. The output is a living artifact that captures how the business actually works, revealing hidden complexity, conflicting terminology, and integration boundaries.

## TL;DR Checklist

- [ ] Set up EventBoard with timeline axis (left-to-right temporal flow)
- [ ] Start with domain events in orange sticky notes — these drive everything
- [ ] Layer commands in blue, aggregates in yellow, actors in purple, systems in green
- [ ] Identify hotspots (many events converging), pain points (errors shown in red), and external systems
- [ ] Draw bounded context boundaries around clusters of related events
- [ ] Name every aggregate after the noun it represents and mark its read/write operations
- [ ] Document all decisions, open questions, and action items before closing the session

