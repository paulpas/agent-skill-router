---
name: python-uv
description: Manages Python projects with uv by Astral — ultra-fast dependency resolution,
  virtual environments, workspace/multirepo setup, build tools, and pip compatibility
  for modern Python development workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: uv, astral uv, python package manager, uv sync, uv lock, python project
    management, ultra-fast dependency resolution, pip compatibility, how do i manage
    python projects with uv, uv workspace, python virtual environment, uv init add
    run
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
  - config
  related-skills: coding-poetry, coding-package-ecosystem-navigator, coding-dependency-supply-chain-security
------

# uv — Ultra-Fast Python Package Manager

Manages Python projects with uv by Astral — the ultra-fast Python package and project manager written in Rust. Covers dependency resolution, virtual environment management, workspace/multirepo setup, build tool integration, CI/CD optimization, and pip compatibility layer for modern Python development workflows.

## TL;DR Checklist

- [ ] Use `uv init <project>` to scaffold a new project — generates pyproject.toml with src layout
- [ ] Always commit `uv.lock` for reproducible builds across environments and CI runners
- [ ] Use `uv add <pkg>` to install dependencies (never pip install in uv-managed projects)
- [ ] Pin Python version with `requires-python = ">=3.12"` in pyproject.toml
- [ ] Use `uv sync` instead of `pip install` — resolves and installs from lockfile atomically
- [ ] Use `uv run <command>` to execute scripts within the project's environment
- [ ] Configure workspaces with `[tool.uv.workspace]` for multi-package monorepo setups

