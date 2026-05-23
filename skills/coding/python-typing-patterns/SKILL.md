---
name: python-typing-patterns
description: Implements advanced Python typing patterns including generic classes,
  Protocol structural subtyping, TypeVar bounds and constraints, variance annotations,
  and composite type construction for robust static analysis.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: python generics, typing patterns, Protocol structural subtyping, TypeVar
    bounds, Generic classes, covariance contravariance, TypeAliasType, runtime type
    inspection, mypy advanced typing, pyright protocols
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
  related-skills: python-modern-development, type-safety-enforcement
------

# Python Advanced Typing Patterns

Implements advanced static typing constructs — Generic classes, Protocol structural subtyping, TypeVar bounds and constraints, variance annotations, composite type construction, and runtime type inspection — to catch type errors at development time in Python codebases.

## TL;DR Checklist

- [ ] Use `Generic[T]` for class-level type parameters; prefer `bound=` over multiple `TypeVar`s when one type suffices
- [ ] Define Protocols for structural subtyping instead of forcing inheritance hierarchies
- [ ] Annotate covariance (`covariant=True`) on return-only types and contravariance (`contravariant=True`) on argument-only types
- [ ] Prefer `TypedDict` over `dict[str, Any]` for structured dictionary contracts
- [ ] Use `Literal` types to constrain string/enum values at the type level
- [ ] Apply `TypeGuard` / `TypeIs` for custom narrowing in conditional branches
- [ ] Combine runtime validation (Pydantic) with static types for production-grade safety

