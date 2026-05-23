---
name: component-architecture
description: Designs reusable component architectures using compound components, headless
  UI patterns, render props, and composition over inheritance for maintainable, testable
  codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: component architecture, compound components, headless ui, render props,
    component composition, container presentational pattern, component hooks, how
    do i design reusable components, component library design, UI composition
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
  related-skills: design-pattern-selection,abstraction-design-patterns,solid-principles
------

# Component Architecture Patterns

Designs reusable, testable component architectures using compound components, headless UI patterns, render props, and composition over inheritance. Separates concerns between data flow (container) and rendering logic (presentational), enabling libraries where behavior is decoupled from presentation.

## TL;DR Checklist

- [ ] Define a clear public API surface — every exported function/class has a documented purpose
- [ ] Use composition over inheritance — build feature combinations via props/children, not deep class hierarchies
- [ ] Separate state management from rendering — container components own data, presentational components receive it
- [ ] Prefer compound components for related UI elements that share implicit state (e.g., Tabs/TabsPanel)
- [ ] Build headless primitives when you need logic without styling constraints (like Radix UI)
- [ ] Use render props or function-as-child when you need flexible rendering control
- [ ] Extract shared event communication into an event bus — never tightly couple unrelated components
- [ ] Write unit tests for each component's public API in isolation

