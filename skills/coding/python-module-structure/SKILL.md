---
name: python-module-structure
description: Designs and organizes Python package directory structures, __init__.py
  export patterns, type stubs (.pyi), pyproject.toml metadata, and import management
  following PEP 420 and PEP 561 conventions for production packages.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: python module, python package, __init__.py, module structure, pyproject.toml,
    type stubs, .pyi, circular imports
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
  related-skills: framework-requirements, engineering-principles, dry-principles,
    code-quality-policies, pydantic-models, python-package-publishing
------

# Python Module & Package Structure Manager

Designs and organizes Python package directory structures, `__init__.py` export patterns, type stub files (.pyi), pyproject.toml metadata, and import management following PEP 420 (namespace packages) and PEP 561 (package typing) conventions. Ensures every module has a single responsibility, imports are managed to avoid circular dependencies, public APIs are explicitly declared via `__all__`, and distributable packages include proper metadata for PyPI publishing.

## TL;DR Checklist

- [ ] Use `src/` layout for all new projects (`src/my_package/` instead of flat `my_package/`)
- [ ] Declare public API with `__all__` in every `__init__.py` — never use `from .module import *`
- [ ] Keep each `.py` file to a single responsibility (one main class, one group of related functions)
- [ ] Avoid circular imports by using lazy imports inside functions or restructuring modules
- [ ] Use Google-style docstrings consistently across all public functions and classes
- [ ] Declare all dependencies in `pyproject.toml` under `[project.dependencies]` — no `setup.py`
- [ ] Add `.pyi` stub files for complex public interfaces when type inference is insufficient
- [ ] Create sub-packages only when a module group has 5+ files or distinct conceptual boundaries

