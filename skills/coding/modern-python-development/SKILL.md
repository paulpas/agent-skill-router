---
name: modern-python-development
description: Implements modern Python 3.10+ development practices including structural
  union types, TypeAlias, Self, ParamSpec, TaskGroup structured concurrency, httpx
  async patterns, and pyproject.toml-based project structure with uv.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: python typing, python 3.12, python 3.11, TypeAlias, ParamSpec, asyncio
    TaskGroup, structured concurrency, pyproject.toml, uv package manager, httpx async,
    python project structure, self type, override decorator, modern python, python
    best practices 2026
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
  related-skills: python-testing-strategies, go-concurrency-patterns, python-package-publishing
------

# Modern Python Development (3.10+)

Implements modern Python development practices for Python 3.10 through 3.13+, covering structural union types, explicit type aliases, fluent interface patterns with Self, decorator signature preservation with ParamSpec, TaskGroup structured concurrency, httpx async I/O, and pyproject.toml-based project structure with uv as the package manager.

## TL;DR Checklist

- [ ] Use `X | Y` for unions instead of `typing.Union[X, Y]`
- [ ] Use `TypeAlias` annotation for all type aliases — never bare assignment
- [ ] Use `Self` (PEP 673) for fluent interface method return types
- [ ] Use `@override` (PEP 698) on every class method override
- [ ] Use `ParamSpec` + `Concatenate` to preserve function signatures through decorators
- [ ] Replace `asyncio.create_task()` fire-and-forget with `asyncio.TaskGroup`
- [ ] Wrap all timeout logic in `asyncio.timeout()` context manager — never `wait_for()`
- [ ] Offload blocking I/O with `asyncio.to_thread()` — never run sync code on the event loop
- [ ] Use httpx for async HTTP — never requests inside async functions
- [ ] Structure projects with single pyproject.toml and uv (no requirements.txt, no setup.py)

