---
name: ascii-diagram
description: Generates clear, readable ASCII diagrams in Excalidraw-style for flowcharts,
  sequence diagrams, and state diagrams to visualize processes, interactions, and
  system states.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: ascii diagram, excalidraw style, flowchart, sequence diagram, state diagram,
    diagram generation, visual explanation, process flow, system architecture
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: code-review, documentation, feature-research
------

# ASCII Diagram Generator (Excalidraw Style)

Creates clean, readable ASCII diagrams that mimic the visual style of Excalidraw for technical documentation, architecture visualization, and process explanation.

## When to Use

Use this skill when:

- Explaining complex processes or workflows to team members
- Documenting system architecture or data flows
- Creating visual representations for technical specifications
- Illustrating user interactions or API call sequences
- Visualizing state machines or application states
- Needing lightweight, text-based diagrams that work anywhere (Markdown, terminals, etc.)

## Core Workflow

1. **Identify Diagram Type** — Determine if you need a flowchart, sequence diagram, or state diagram based on what you're visualizing
2. **Define Elements** — List all components, actors, states, or steps that need to be included
3. **Establish Relationships** — Map out how elements connect, interact, or transition between each other
4. **Apply Styling Conventions** — Use consistent box styles, arrow types, and spacing for clarity
5. **Review for Readability** — Ensure the diagram is understandable at a glance with proper alignment and labeling

## Implementation Patterns

### Pattern 1: Flowchart Diagrams

Use rounded boxes for processes, diamonds for decisions, and parallelograms for input/output.

```
+