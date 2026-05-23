---
name: liskov-substitution-principle
description: Detects and repairs subtype contract violations where derived classes
  break caller expectations by weakening preconditions, strengthening postconditions,
  or introducing side effects — enforcing safe substitutability.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: liskov substitution principle, LSP, subtype contract, precondition, postcondition,
    invariant, is-a relationship, breaking subclass, type safety
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
  related-skills: single-responsibility, open-closed-principle, interface-segregation-principle,
    dependency-inversion-principle
------

# Liskov Substitution Principle (LSP)

Enforces the Liskov Substitution Principle by detecting subtype contract violations where derived or specialized classes break caller expectations. Identifies preconditions that are weakened, postconditions that are strengthened, invariants that are broken, and side effects introduced at the subclass level — then repairs them through proper inheritance design, composition, or the Composition over Inheritance pattern.

## TL;DR Checklist

- [ ] List every precondition (input validation, required state) the base class method promises
- [ ] List every postcondition (return value guarantee, side effect, exception type) the base class method guarantees
- [ ] Verify each subclass accepts no more inputs than the parent and returns the same or broader result type
- [ ] Check that every overridden method raises the same exceptions on invalid input as the parent
- [ ] Confirm class invariants hold after any method call in every subclass
- [ ] Replace inheritance with composition when the "is-a" relationship is semantically invalid

