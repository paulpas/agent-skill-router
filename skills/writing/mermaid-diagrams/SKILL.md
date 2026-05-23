---
name: mermaid-diagrams
description: Creates clear, web-savvy MermaidJS diagrams (flowcharts, sequence diagrams,
  Gantt charts, and more) for Markdown documentation that renders beautifully on GitHub.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: writing
  triggers: mermaid, mermaidjs, diagram, flowchart, sequence diagram, how do i create
    a diagram, github markdown diagram, architecture diagram, diagram best practices
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: implementation
  output-format: report
  related-skills: technical-documentation
------

# MermaidJS Diagramming for GitHub Markdown

Teaches AI models to write clean, well-structured MermaidJS diagrams that render beautifully on GitHub's native Markdown viewer. Covers diagram type selection, syntax best practices, GitHub-specific constraints, and common pitfalls across 10+ diagram types — flowcharts, sequence diagrams, Gantt charts, mindmaps, and more.

## TL;DR Checklist

- [ ] Prefer `flowchart` over `graph` — `graph` is deprecated in Mermaid
- [ ] Keep diagrams under 20–25 nodes for readability on GitHub
- [ ] Use ASCII-safe characters only — no Unicode arrows (`→`), em dashes (`—`), or smart quotes
- [ ] Use `<br/>` (not `\n`) for line breaks inside node labels
- [ ] Label edges with transition descriptions — don't assume flow is obvious
- [ ] Use subgraphs to group related nodes when exceeding 10–15 nodes
- [ ] Put diagram-defining config in a YAML `