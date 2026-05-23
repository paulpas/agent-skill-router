---
name: type-safety-enforcement
description: Enforces type safety across codebases using static analysis, runtime
  validation schemas, and strict typing patterns to prevent data flow errors.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: type safety, type narrowing, strict mode, type guards, static typing,
    runtime validation, mypy, pyright, typescript strict, zod schema
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
  related-skills: testing-error-handling, api-contract-testing
------

# Type Safety Enforcement

Enforces type safety across Python and TypeScript codebases by configuring strict static analyzers, defining runtime validation schemas at system boundaries, and applying discriminated unions with custom type guards throughout application logic. This skill prevents silent data corruption, implicit `any` proliferation, and unvalidated external inputs from reaching core business logic.

## TL;DR Checklist

- [ ] Enable strict mode flags in mypy.ini / tsconfig.json before writing new code
- [ ] Define Pydantic v2 or Zod schemas at every API boundary — no raw dicts past the perimeter
- [ ] Use discriminated unions with a literal `type`/`kind` field for multi-state data structures
- [ ] Implement custom type guards (`isX()` functions) before branching on union members
- [ ] Add type-check gates to CI (mypy, pyright, or tsc --noEmit) and treat errors as failures
- [ ] Never widen to `any` — fix the root cause or use a typed wrapper with explicit comments

