---
name: security-architecture
description: Designs secure system architecture with threat modeling (STRIDE), defense-in-depth
  layers, zero-trust principles, and authentication patterns for production systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: security architecture, threat modeling, STRIDE, defense in depth, zero
    trust, authentication architecture, authorization design, how do i secure a system
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
  related-skills: coding-api-security-patterns, coding-code-review, coding-dependency-supply-chain-security
------

# Security Architecture Patterns

Designs secure system architecture by applying threat modeling (STRIDE methodology), defense-in-depth layering, zero-trust principles, and robust authentication/authorization patterns. When loaded, the model acts as a senior security architect — analyzing system boundaries, identifying threats, and producing concrete architectural safeguards aligned with OWASP standards.

## TL;DR Checklist

- [ ] Run STRIDE analysis on every external data boundary before implementation
- [ ] Define at least three defense layers (network, application, data) for critical systems
- [ ] Treat every request as untrusted — implement zero-trust validation at each layer
- [ ] Separate authentication from authorization concerns with distinct middleware components
- [ ] Apply input validation at the API boundary; never trust downstream consumers
- [ ] Ensure secrets are injected via environment variables, not hardcoded or committed
- [ ] Add structured security audit logging for every authN/authZ decision

