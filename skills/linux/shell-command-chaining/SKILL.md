---
name: shell-command-chaining
description: Implements shell command chaining patterns using &&, ||, and ; operators
  for conditional execution, validation gates, fallback chains, and safe sequential
  workflows in bash scripts.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: shell command chaining, && operator, || operator, semicolon in bash, conditional
    command execution, fallback chain, AND list OR list, short-circuit evaluation,
    how do i chain commands reliably
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-shell-process-management, shell-parameter-expansion
------

# Shell Command Chaining and Conditional Execution

Implements reliable sequential and conditional command execution patterns using `&&` (AND-list), `||` (OR-list), and `;` (semicolon) operators in bash scripts. Teaches how to build validation gates, fallback chains, safe cleanup sequences, and deployment pipelines that behave predictably under `set -e`.

## TL;DR Checklist

- [ ] Use `&&` for dependent steps — second command runs only if the first exits 0
- [ ] Use `||` for fallback/alternative paths — second command runs only if the first fails
- [ ] Use `;` when you want unconditional sequential execution, ignoring all exit codes
- [ ] Never rely on `A && B || C` as a true ternary — if A succeeds and B fails, C runs unexpectedly
- [ ] Remember that commands inside `&&` / `||` chains are exempt from `set -e` (errexit)
- [ ] Quote all variable expansions in chained commands: `[[ -f "$file" ]] && cp "$file" "$dest"`

