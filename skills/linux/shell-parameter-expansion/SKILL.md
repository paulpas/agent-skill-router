---
name: shell-parameter-expansion
description: Applies bash parameter expansion operators (default values, error messages,
  substitution, pattern matching, case modification) to write robust shell scripts
  that safely handle unset variables and edge cases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: bash parameter expansion, ${VAR:-default}, variable default value, shell
    variable substitution, pattern matching shell, case modification, how do i handle
    unset variables, bash safe defaults, ${##pattern}, ${VAR:?error}, shell scripting
    safety
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
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
  - config
  - examples
  - do-dont
  related-skills: linux-services, coding-output-sanitization, linux-shell-process-management
------

# Shell Parameter Expansion Patterns

Applies bash parameter expansion operators to write robust shell scripts that safely handle unset variables, provide defaults, detect errors early, perform pattern matching and substitution, and modify case — all without spawning subprocesses. These built-in expansions execute in the current shell process with zero external command overhead, making them faster than alternatives like `sed`, `awk`, or `[ -z "$VAR" ]` conditional checks. This skill covers every expansion operator (`:-`, `:=`, `:?`, `:+`, `#`, `##`, `%`, `%%`, `//`, `~`, `${!prefix*}`), their precedence, and practical patterns for configuration loading, path manipulation, string processing, and defensive scripting idioms.

## TL;DR Checklist

- [ ] Use `${VAR:-default}` (not `${VAR-default}`) to substitute when the variable is empty OR unset — empty strings are a common source of bugs in shell scripts
- [ ] Use `${VAR:?error message}` at script entry points to fail fast on missing required arguments instead of continuing with undefined behavior downstream
- [ ] Use `${##pattern}` (greedy) and `${%pattern}` (non-greedy suffix) for path manipulation — never use `basename`/`dirname` subprocesses when parameter expansion suffices
- [ ] Use `${VAR,,}` / `${VAR^^}` for case modification instead of `tr '[:upper:]' '[:lower:]'` — single builtin, zero subprocess overhead
- [ ] Always quote expansion results (`"${VAR:-default}"`) to prevent word splitting and globbing on values containing spaces or wildcards
- [ ] Combine multiple expansions in a single variable reference where appropriate (e.g., `${VAR^^:-UNKNOWN}` is NOT valid — expand inner first: `"${VAR^^}"` then apply default)

