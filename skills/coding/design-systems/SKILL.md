---
name: design-systems
description: Implements production design systems with design token architecture,
  component theming, accessibility standards, documentation patterns, and cross-platform
  consistency for scalable UI ecosystems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design system, design tokens, theming, accessibility, a11y, component
    library, UI kit, design language, style guide, token architecture, cross-platform
    consistency
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
  related-skills: component-architecture, api-design, engineering-principles
------

# Design Systems Architecture

Implements production-grade design systems that provide a unified visual language across web, mobile, and desktop platforms. This skill makes the model architect design token hierarchies, build accessible component libraries with theming support, and enforce cross-platform consistency through typed token adapters.

## TL;DR Checklist

- [ ] Organize tokens into primitive (atomic) → semantic (role-based) → alias (component-specific) layers
- [ ] Type all tokens with TypeScript interfaces — never ship untyped design values
- [ ] Map semantic tokens to CSS custom properties for runtime theme switching
- [ ] Verify all color pairs meet WCAG 2.2 AA contrast ratios (4.5:1 text, 3:1 large text)
- [ ] Include focus-visible styles and skip-nav patterns in every component
- [ ] Support prefers-reduced-motion and reduced-transparency for platform accessibility
- [ ] Use a single token source mapped to platform-specific adapters (web → CSS vars, RN → JS objects)
- [ ] Document components with prop tables, usage guidelines, and explicit do/don't examples

