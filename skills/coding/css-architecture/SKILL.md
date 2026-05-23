---
name: css-architecture
description: Architects scalable CSS systems using cascade layers (@layer), native
  nesting, :has() selector, container queries, Tailwind v4 @theme directives, and
  BEM naming for maintainable, production-ready frontend styling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: css architecture, css modules, bem naming, tailwind css v4, container
    queries, :has selector, css nesting, @layer cascade, how do i organize stylesheets,
    responsive components, utility-first css, scroll-driven animations, view transitions
    api, css custom properties, css specificity management
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
  - config
  - examples
  - do-dont
  related-skills: design-systems, component-architecture, frontend-philosophy
------

# CSS Architecture for Modern Frontend Systems

Architect scalable, maintainable CSS systems using native CSS features and established architectural patterns. This skill makes the model organize cascade layers with `@layer`, leverage browser-native selectors (`:has()`, nesting, container queries), structure BEM naming conventions, integrate Tailwind v4's CSS-first approach, and write scoped styles that avoid specificity wars and maintenance debt.

## TL;DR Checklist

- [ ] Define `@layer` order (reset → base → components → utilities) for explicit cascade control
- [ ] Replace preprocessor nesting with native CSS `&` nesting (97%+ browser support)
- [ ] Use container queries over viewport media queries for component-level responsiveness
- [ ] Apply BEM naming: `.block__element--modifier` with scope to prevent class leakage
- [ ] Configure Tailwind v4 with `@theme` in CSS instead of `tailwind.config.js`
- [ ] Use `:has()` selector for parent-state styling without JavaScript
- [ ] Document layer overrides — every `!important` must be justified and tracked

