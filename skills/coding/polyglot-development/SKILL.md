---
name: polyglot-development
description: Implements language selection heuristics, polyglot monorepo patterns,
  and cross-language communication protocols for multi-language software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: polyglot, multi-language, language selection, go vs typescript, rust vs
    python, monorepo build, cross-language communication, protocol buffer, interop
    patterns, which language to use
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
  related-skills: framework-selection, system-architecture, data-encoding, design-patterns-and-principles
------

# Polyglot Development — Language Selection and Cross-Language Integration

Architects and engineers applying language selection heuristics to assign the optimal programming language to each component of a multi-language system, then implementing robust cross-language communication patterns (gRPC/Protobuf, REST/JSON, message queues) between those components. When loaded, this skill makes the model produce a language assignment rationale and working integration code for every inter-component boundary.

## TL;DR Checklist

- [ ] Assign each component a primary language based on its workload characteristics
- [ ] Document the rationale using the strength matrix (Table 1) for every choice
- [ ] Define inter-component contracts with Protobuf or JSON Schema before writing implementation code
- [ ] Implement a language-agnostic error propagation pattern across all boundaries
- [ ] Configure the build system to compile and test all language targets in one command

