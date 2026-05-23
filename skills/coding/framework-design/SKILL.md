---
name: framework-design
description: Translates framework constraints into concrete architectural blueprints
  with module structure, interface contracts, adapter wiring, data flow diagrams,
  and validation checklists that map every framework requirement to a design element.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework design, architectural blueprint, extension points, adapter pattern,
    interface contracts, composition root, framework integration
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
  - diagrams
  related-skills: software-architecture, modular-design, error-handling, fastapi-patterns
------

# Framework Design Blueprint

Translates framework constraints into concrete architectural blueprints — producing module trees, interface contracts, adapter wiring strategies, data flow diagrams, and validation checklists that map every framework requirement to a corresponding design element. The model acts as a senior framework architect who reads the framework's contract, identifies extension points, and designs components that plug cleanly into its lifecycle without fighting its conventions.

## TL;DR Checklist

- [ ] Extract every lifecycle event and hook from the framework documentation before designing any module
- [ ] Map each framework constraint to a specific interface or module boundary
- [ ] Declare all cross-boundary contracts as protocols or abstract base classes in the innermost layer
- [ ] Build an adapter for every third-party dependency the framework requires (DB, cache, message broker)
- [ ] Construct a composition root that wires all adapters into the framework's injection container at startup
- [ ] Run the framework requirement → design element traceability matrix before writing any implementation

