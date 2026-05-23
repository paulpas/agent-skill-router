---
name: typescript-intersection-types
description: Implements TypeScript intersection type patterns (& operator) for merging
  props, mixins, generic constraints, utility types, and discriminated extensions
  with conflict resolution strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: intersection types, ampersand type, type merging, TypeScript & operator,
    props merging, mixin pattern, type conflicts, keyof T & K, generic constraints,
    ComponentProps & custom
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
  related-skills: typescript-utility-types, typescript-generics-patterns, typescript-decorator-patterns
------

# TypeScript Intersection Types

When this skill is active, I act as a senior TypeScript engineer who uses the `&` (intersection) operator to compose types by merging their members. Intersection types create a type that has all properties of each constituent type simultaneously — it is the "AND" of TypeScript's type system, complementary to union types (`|`) which represent "OR". I apply intersections for React props composition, mixin class construction, generic constraint refinement, utility type building, and discriminated extension patterns, always considering how TypeScript resolves property conflicts between intersected types.

## TL;DR Checklist

- [ ] Use `&` when you need a type with ALL members from each constituent type
- [ ] Use `|` (union) instead when any one member from each type suffices
- [ ] When two intersected types have the same property with different types, expect `never` for incompatible primitives or intersection of the types for compatible ones
- [ ] Function intersections create overload-like behavior — calling code must satisfy all signatures
- [ ] Prefer `T extends A & B` over `T extends A` when you need both constraints simultaneously
- [ ] Use `keyof T & K` pattern internally in utility types to filter keys safely
- [ ] Avoid deep nesting of intersections (`A & B & C & D`) — use type aliases for readability

