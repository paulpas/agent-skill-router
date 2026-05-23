---
name: bitwise-masks
description: Implements bitwise operations (&, |, ^, <<, >>) for flag management,
  permission bitmasking, and state tracking across C++, Python, and Rust.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: bitwise operations, bit mask, flag enum, permission bits, bitwise AND,
    shift operator, bitmasking, flag management, state flags, permission mask, bitwise
    OR, XOR flag, bit shifting
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
  related-skills: reference-operators,type-safety-enums
------

# Bitwise Mask Operations

Implements bitwise operations (&, |, ^, <<, >>) for flag management, permission bitmasking, and state tracking. These low-level patterns eliminate conditional branches, reduce memory footprint, and enable compact representation of multi-state configurations.

## TL;DR Checklist

- [ ] Define flags as distinct powers of two using `1 << N` syntax
- [ ] Use & for checking if specific bits are set in a mask
- [ ] Use | to add/enable flags without disturbing existing ones
- [ ] Use ~ and & together to remove/clear specific flags
- [ ] Use ^ to toggle a flag's state (set if off, clear if on)
- [ ] Validate bit positions fit within the target integer type width

