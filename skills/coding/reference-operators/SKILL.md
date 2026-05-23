---
name: reference-operators
description: Implements reference (&) and address-of operators across C++, Rust, C#,
  and PHP for safe memory access, parameter passing, and pointer arithmetic.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: reference operator, address of, pass by reference, & operator, pointer,
    dangling reference, borrowed reference, mutable reference, C++ references, Rust
    lifetimes, PHP references, C# ref out, memory safety, rvalue reference
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
  related-skills: bitwise-masks,smart-pointers,lifetime-annotation
------

# Reference and Address-Of Operators

Implements reference (&) and address-of operators for safe memory access, parameter passing, and pointer arithmetic. These operators enable efficient data sharing across language boundaries while enforcing different safety guarantees depending on the target language.

## TL;DR Checklist

- [ ] Distinguish between `&` (reference/address-of), `*` (dereference), and `&&` (rvalue reference in C++)
- [ ] Prefer pass-by-reference (`const T&`) for large objects to avoid expensive copies
- [ ] Never return a reference to a local variable — this creates dangling references immediately
- [ ] In Rust: distinguish `&T` (immutable borrow) from `&mut T` (mutable borrow with exclusive access)
- [ ] In C++: use `const T&` for read-only access, non-const `T&` for intentional in-place modification

