---
name: bash-tui-menu
description: Implements robust interactive Bash TUI menus with dialog widgets, safe
  selection handling, cancel paths, and non-interactive fallbacks.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: bash tui menu, dialog command, interactive shell script, terminal menu,
    checklist radiolist, how do i make bash menus, ncurses dialog
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
  related-skills: shell-parameter-expansion, shell-command-chaining, shell-process-management,
    output-formatting
------

# Bash TUI Menu Builder

Implements production-ready interactive Bash terminal interfaces using the `dialog` command and the concrete Bash-Dialog example patterns. This skill makes the model design menus that are safe under `set -euo pipefail`, preserve cancel/ESC semantics, clean up the terminal, and remain scriptable through non-interactive fallbacks.

## TL;DR for Code Generation

- [ ] Detect `dialog` and an attached TTY before rendering; provide a CLI/env fallback when either is missing.
- [ ] Under `set -e`, capture widget output inside an `if choice=$(dialog --stdout ...); then status=0; else status=$?; fi` block so Cancel, ESC, Extra, and errors cannot abort before status handling.
- [ ] Treat exit code `0` as OK/Yes, `1` as Cancel/No, `3` as Extra, and `255` as ESC unless the script intentionally remaps `DIALOG_*` variables.
- [ ] Build menu/checklist/radiolist options as Bash arrays and pass them as `"${options[@]}"`; never concatenate untrusted labels into one command string.
- [ ] Use `trap` for `INT`, `TERM`, and `EXIT` cleanup so temp files and alternate-screen artifacts do not survive aborts.
- [ ] Validate selected tags with a `case` statement or allowlist before running commands; menu text is not authorization.
- [ ] Keep UI functions thin: collect choices in TUI functions, execute side effects in testable worker functions.

