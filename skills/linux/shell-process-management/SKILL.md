---
name: shell-process-management
description: Manages Linux background processes, parallel execution, and job control
  using &, jobs, fg, bg, wait, xargs -P, and GNU parallel for shell scripting.
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
  - config
  - do-dont
  triggers: shell background processes, parallel execution, job control, fg bg jobs
    wait, xargs P flag, background shell, process management
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-services, linux-filesystem
------

# Linux Shell Process Management

Infrastructure engineer managing Linux background processes, parallel execution, and interactive job control using shell builtins (`&`, `jobs`, `fg`, `bg`, `wait`), signal handling with `trap`, batch parallelism with `xargs -P`, and GNU `parallel` for efficient multi-core work distribution.

## TL;DR Checklist

- [ ] Use `set -euo pipefail` in every shell script to catch failures early
- [ ] Capture PIDs immediately after backgrounding with `$!` and store them for later management
- [ ] Always trap `SIGTERM`, `SIGHUP`, and `SIGINT` before spawning background workers that create temp files or locks
- [ ] Use `wait $PID` (not bare `wait`) to detect individual background process exit codes
- [ ] Prefer `xargs -P` for simple parallel file operations; prefer GNU `parallel` for complex multi-stage pipelines
- [ ] Never ignore the exit status of background processes — always collect and report failures
- [ ] Use PID files with atomic writes (`mktemp + mv`) for daemons that must survive session logout

