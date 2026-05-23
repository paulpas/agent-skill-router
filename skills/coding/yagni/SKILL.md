---
name: yagni
description: Applies the You-Aren't-Gonna-Need-It principle to prevent over-engineering
  by identifying and eliminating premature abstractions, unused features, and speculative
  complexity from software designs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: yagni, you aren't gonna need it, don't build it now, over-engineering,
    premature abstraction, speculative features, kill unused code, remove complexity
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
  related-skills: kiss-principle, dht-technical-debt, progressive-enhancement, emergent-design
------

# YAGNI — You Aren't Gonna Need It

Senior engineer applying the YAGNI principle to eliminate premature abstractions, speculative features, and unnecessary complexity from codebases. YAGNI is not about avoiding architecture entirely — it's about letting requirements drive design decisions, not hypothetical future scenarios.

## TL;DR Checklist

- [ ] Question every abstraction: "What specific requirement demands this interface right now?"
- [ ] Remove unused feature flags, dead code paths, and speculative APIs before committing
- [ ] Prefer concrete implementations until a second caller proves the need for abstraction
- [ ] Flag complex designs that solve problems no one has encountered yet
- [ ] Replace multi-layered interfaces with single-purpose structs/functions when only one use case exists

