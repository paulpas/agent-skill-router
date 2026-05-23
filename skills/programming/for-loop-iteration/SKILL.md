---
name: for-loop-iteration
description: Teaches idiomatic for loop patterns across Python, JavaScript, Go, C/C++,
  Rust, and shell scripting with anti-patterns, common pitfalls, and best practices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  triggers: for loop, iteration, loop patterns, enumerate, range, iterator, list comprehension,
    index-based loop, how do i iterate over a collection
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - diagrams
  related-skills: algorithms, sorting-algorithms
------

# For Loop Iteration Patterns

Teaches idiomatic for loop iteration patterns across multiple programming languages, helping you choose the right iteration style for each language and problem. Covers index-based loops, range-based iteration, iterator protocols, list comprehensions, and shell scripting loops — with BAD vs GOOD comparisons and language-specific anti-patterns.

## TL;DR Checklist

- [ ] Choose the most idiomatic loop construct for the target language (e.g., `for...of` in JS, `range()` in Python)
- [ ] Prefer iterating over values directly instead of indices when index is not needed
- [ ] Avoid modifying a collection while iterating — collect changes and apply after
- [ ] Guard against off-by-one errors by verifying boundary conditions explicitly
- [ ] Use language-native iterators (enumerate, zip, range, iterators) before manual counters

