---
name: poetry
description: Manages Python project dependencies, virtual environments, building,
  and publishing using Poetry — covering dependency resolution, lockfiles, workspaces,
  plugin system, and migration from pip.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: poetry, python package manager, pyproject.toml, poetry lock, virtual environment,
    dependency management, Python publishing, PyPI upload, poetry workspaces, how
    do i manage python dependencies, pip migration, lockfile, python packaging
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
  related-skills: coding-python-uv, coding-package-ecosystem-navigator, coding-dependency-supply-chain-security
------

# Poetry — Python Package & Dependency Manager

Manages Python project dependencies, virtual environments, building, and publishing using Poetry. Covers dependency resolution strategies, lockfile management, workspace/multirepo setup, plugin architecture, and migration from pip/requirements.txt workflows.

## TL;DR Checklist

- [ ] Use `pyproject.toml` with `[tool.poetry]` section — no `setup.py`, no `requirements.txt`
- [ ] Always commit `poetry.lock` for reproducible builds in production and CI
- [ ] Use `poetry add <pkg>` to install dependencies (never pip install directly in Poetry-managed venvs)
- [ ] Pin Python version with `requires-python` in pyproject.toml
- [ ] Use named dependency groups (`group.dev.dependencies`) for dev-only packages
- [ ] Use `poetry run` or `poetry shell` to execute commands within the virtual environment
- [ ] Run `poetry lock --no-update` after manual pyproject.toml edits (never edit poetry.lock manually)

