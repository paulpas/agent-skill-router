---
name: domain-modeling
description: Analyzes business domains to extract ubiquitous language, identify bounded
  contexts, map core/supporting/generic subdomains, and produce domain maps that guide
  software architecture decisions before implementation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain modeling, ubiquitous language, bounded context, subdomain classification,
    domain map, how do i understand the domain, strategic design
  archetypes:
  - diagnostic
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
  role: reference
  scope: implementation
  output-format: analysis
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: domain-driven-design, software-design-principles, framework-requirements
------

# Domain Modeling Framework

Senior architect performing deep business domain analysis to extract shared vocabulary, identify bounded context boundaries, classify subdomains by strategic importance, and produce domain maps that directly inform software architecture. This skill operates at the strategic layer of DDD — understanding *what* the business does before deciding *how* to build it. It is complementary to `domain-driven-design` which covers tactical patterns like aggregates, value objects, and entities applied after the domain has been modeled.

## TL;DR Checklist

- [ ] Interview stakeholders and extract a structured dictionary of domain terms with single definitions
- [ ] Identify bounded contexts by clustering concepts that share a consistent meaning and responsibility
- [ ] Classify every subdomain as core, supporting, or generic to guide build-vs-buy decisions
- [ ] Draw a context map showing relationships between bounded contexts (Customer/Supplier, Conformist, ACL, etc.)
- [ ] Document the ubiquitous language dictionary and distribute it to all team members before coding begins
- [ ] Validate each bounded context boundary by confirming no concept has conflicting definitions within a single context
- [ ] Produce a domain map that directly informs module boundaries, team assignments, and technology choices

