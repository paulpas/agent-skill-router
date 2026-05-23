---
name: typescript-generics-types
description: Implements TypeScript generics, conditional types, mapped types, template
  literal types, and type-level programming patterns for compile-time type transformations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: generics, type parameters, conditional types, infer keyword, mapped types,
    template literal types, keyof
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
  related-skills: typescript-intersection-types,type-safety-enforcement
------


# TypeScript Generics and Type-Level Programming

Implements generic type declarations, conditional types with `infer`, mapped types with key remapping, template literal types, and recursive type-level programming to create compile-time type transformations that enforce correctness before runtime.

## TL;DR for Code Generation

- [ ] Constrain type parameters with `<T extends Constraint>` so the compiler knows what properties are available on `T`
- [ ] Use `infer` in nested positions (e.g., `infer E[]`, `infer A, infer B`) to extract inner types from complex signatures
- [ ] Apply mapped types with `as KeyRemap` (`K extends Filter ? never : K`) for custom property filtering and renaming
- [ ] Use template literal types for compile-time string computation (event names, path segments, API route keys)
- [ ] Ensure recursive conditional types have a base case to prevent infinite expansion (check termination on primitives)

