---
name: systematic-debugging
description: Applies a structured debugging methodology (binary search, logging strategy,
  stack trace analysis, five whys root cause) to isolate bugs and find root causes
  in production and development codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: systematic debugging, root cause analysis, stack trace, binary search
    debugging, production outage, how do i debug systematically, five whys, bug isolation
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
  related-skills: engineering-principles, software-error-handling, code-validation
------

# Systematic Debugging Methodology

Applies a structured, repeatable debugging methodology to isolate bugs and find root causes in software systems. When active, this skill makes the model act as a senior debug engineer — using binary search on commit history or code paths, designing targeted logging strategies, analyzing stack traces with context recovery, and drilling into root causes with the five whys technique rather than applying blind fixes.

## TL;DR Checklist

- [ ] Reproduce the issue consistently before writing any fix — no patching ghosts
- [ ] Isolate the boundary between "works" and "doesn't work" using binary search on commits or code paths
- [ ] Design logging with a clear hypothesis: what specific state variable or condition do you need to observe?
- [ ] Analyze stack traces top-down but reason bottom-up — the crash is a symptom, not the disease
- [ ] Apply five whys at least once per bug to avoid treating surface symptoms as root causes
- [ ] Verify the fix by confirming the original hypothesis was correct and no regressions were introduced
- [ ] Add regression test or automated check that would have caught this failure mode

