---
name: ampersand-operator
description: Implements bitwise AND operations, address/reference resolution, and
  memory pointer manipulation using & operator across C, C++, Rust, Python ctypes,
  and Go for low-level programming.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: '&, ampersand operator, bitwise AND, address of, flag checking, bitmask,
    pointer manipulation'
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
  related-skills: coding-bitwise-operations, coding-error-handling
------

# Ampersand (&) Operator Reference

This skill teaches how to correctly use the `&` (ampersand) operator across multiple programming languages for bitwise AND operations on integer types, address-of / reference binding in systems languages (C, C++, Rust), and set intersection in Python. When loaded, this skill makes the model produce correct, idiomatic code that respects language-specific semantics, avoids precedence pitfalls, and handles memory safety explicitly.

## TL;DR Checklist

- [ ] Distinguish bitwise AND (`&`) from logical AND (`&&` / `and`) before writing any expression
- [ ] Use parentheses around every `&` in mixed-operator expressions to avoid precedence bugs (e.g., `(flags & MASK) != 0`)
- [ ] For flag checking, compare the result against zero rather than against the flag constant itself
- [ ] Always pair address-of (`&var`) with a corresponding dereference (`*ptr`) and nil/NULL check before use
- [ ] In Rust, respect borrowing rules: immutable `&T` coexists freely; mutable `&mut T` requires exclusive access
- [ ] Validate that bitmask operations stay within the expected integer width (e.g., 8-bit, 16-bit, 32-bit) to avoid silent truncation
- [ ] For Python, remember `&` on sets performs intersection while `&` on ints performs bitwise AND — never mix types in a single expression

