---
name: python-module-structure
description: Designs and organizes Python package directory structures, __init__.py export patterns, type stubs (.pyi), pyproject.toml metadata, and import management following PEP 420 and PEP 561 conventions for production packages.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: python module, python package, __init__.py, module structure, pyproject.toml, type stubs, .pyi, circular imports
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-requirements, engineering-principles, dry-principles, code-quality-policies, pydantic-models
---

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

---

## When to Use

Use this skill when:

- Starting a new Python project and you need to decide on the initial directory layout
- Refactoring an existing package that has grown disorganized or has circular imports
- Setting up type stubs (.pyi) for a library that needs to support strict type checkers
- Preparing a package for PyPI distribution with proper `pyproject.toml` metadata
- Restructuring a monolithic module into logically separated sub-modules
- Migrating from `setup.py` to modern `pyproject.toml` build system
- Debugging import errors caused by circular dependencies or incorrect `__init__.py` exports

---

## When NOT to Use

Avoid this skill for:

- Single-script projects — a flat `.py` file is sufficient (don't over-engineer one-file tools)
- Jupyter Notebook projects — the execution model doesn't benefit from package structure
- Temporary scripts or prototypes where import organization has no value
- Framework-specific layouts (e.g., Django apps, FastAPI projects with their own conventions) — follow the framework's project template instead

---

## Core Workflow

1. **Choose Layout Strategy** — Decide between `src/` layout and flat layout. For any package intended for distribution or with more than 3 modules, use `src/` layout. For single-file scripts, skip packaging entirely. **Checkpoint:** If the project has subpackages, `src/` layout is mandatory to prevent accidental imports of non-installed code during development.

2. **Define Module Responsibilities** — List all logical components and assign each to a file. Each file must have one clear responsibility: one main class + its helpers, or one cohesive group of related functions. **Checkpoint:** No file exceeds 300 lines without sub-packages; if it does, split by feature area.

3. **Create `__init__.py` Files** — Set up top-level and sub-package `__init__.py` files that define public APIs via `__all__`. Use lazy imports (`from .module import ClassName`) rather than eager ones to avoid circular import issues. **Checkpoint:** Every public symbol is listed in `__all__`; nothing else leaks to `import *` consumers (even though star imports are discouraged).

4. **Resolve Import Dependencies** — Map the import graph between modules. Identify and break any circular dependencies by introducing a shared base module, lazy imports, or restructuring. **Checkpoint:** The import graph is a DAG (directed acyclic graph) — run `python -c "import my_package"` to verify no import errors at runtime.

5. **Add Type Stubs (If Needed)** — For complex public interfaces where type inference from source code is insufficient, create `.pyi` stub files in the same directory or as a separate typed distribution package. **Checkpoint:** Stub files must match the runtime interface exactly — any mismatch causes silent type errors at check time that are extremely hard to debug.

6. **Configure `pyproject.toml`** — Add package metadata, dependencies, build system declaration, and optional entry points. Use modern tools (`setuptools`, `hatchling`, or `pdm-backend`) instead of `setup.py`. **Checkpoint:** Run `pip install -e .` to verify the package installs in development mode without errors.

7. **Validate Distribution** — Build a wheel and check its contents with `build` and `twine check`. Verify that `__init__.py`, stub files, and data files are included correctly. **Checkpoint:** `python -m build --wheel` succeeds and `twine check dist/*` reports no warnings.

---

## Implementation Patterns

### Pattern 1: __init__.py Export Management (BAD vs. GOOD)

The `__init__.py` file defines the public API of a package. Star imports (`from .module import *`) are explicitly forbidden by PEP 8 and cause unpredictable namespace pollution. Always use explicit `__all__` with individual imports.

```python
# ❌ BAD: Star imports — pollutes namespace, hides missing symbols, breaks type checkers
# my_package/__init__.py
from .models import *          # What gets imported? Depends on models.__all__ or module contents
from .utils import *           # Duplicate names silently override each other!
from .api import *             # Hard to trace where a symbol comes from
import os, sys, json           # Accidentally leaks stdlib names into package namespace

# Users see unpredictable behavior:
import my_package
print(my_package.SomeClass)    # Which module does this come from? Nobody knows.
my_package.unknown_symbol      # Surprisingly works because star imports leaked it!

# ✅ GOOD: Explicit __all__ with individual imports — clear, type-checkable, maintainable
# my_package/__init__.py
"""Top-level package that exposes the public API."""

from my_package.models.user import User, UserCreate, UserUpdate
from my_package.api.routes import router
from my_package.utils.validators import validate_email, validate_phone

__all__ = [
    "User",
    "UserCreate",
    "UserUpdate",
    "router",
    "validate_email",
    "validate_phone",
]

# __all__ controls:
# 1. What `from my_package import *` exposes (even though star imports are discouraged)
# 2. What symbol browsers/IDEs discover
# 3. What is included in API documentation generators
```

For lazy loading of large dependencies to avoid startup cost, use conditional imports inside functions:

```python
# ✅ GOOD: Lazy import pattern for expensive-to-load modules
# my_package/__init__.py

__all__ = ["User", "router"]


def _get_user_class():
    """Lazily load User class only when first accessed."""
    from my_package.models.user import User
    return User


class __LazyUser:
    """Proxy that lazily loads the real User class on first attribute access."""

    def __getattr__(self, name: str):
        User = _get_user_class()
        return getattr(User, name)

    def __repr__(self) -> str:
        User = _get_user_class()
        return repr(User)


# Expose a lazy proxy that behaves like the real class
User = __LazyUser()  # type: ignore[assignment]
```

### Pattern 2: Complete Package Directory Layout with src/ Structure

The `src/` layout is the gold standard for Python packages. It prevents two common bugs: (1) importing from the source tree instead of the installed package during development, and (2) accidentally including test data in distributions.

```
my_package/                          # Project root (NOT a Python package)
├── pyproject.toml                   # Build config, dependencies, metadata
├── README.md                        # Package description
├── LICENSE                          # MIT, Apache 2.0, etc.
├── tests/                           # Test files (not included in distribution)
│   ├── __init__.py
│   ├── conftest.py                  # pytest fixtures shared across tests
│   ├── test_models.py
│   └── test_api.py
└── src/                             # Source tree (the actual Python package lives here)
    └── my_package/                  # Actual package directory
        ├── __init__.py              # Public API: __all__ exports, lazy loading
        ├── __main__.py              # Entry point for `python -m my_package`
        ├── models/                  # Sub-package: data models and schemas
        │   ├── __init__.py          # Exports User, Order, etc.
        │   ├── user.py              # User model class + related schemas
        │   └── order.py             # Order model class
        ├── api/                     # Sub-package: HTTP routes / handlers
        │   ├── __init__.py          # Creates and configures FastAPI router
        │   ├── routes.py            # Route definitions (GET, POST, etc.)
        │   └── dependencies.py      # Auth dependency, current_user factory
        ├── utils/                   # Sub-package: shared utilities
        │   ├── __init__.py          # Exports validate_email, etc.
        │   ├── validators.py        # Input validation functions
        │   └── formatting.py        # Date/string formatting helpers
        └── core/                    # Sub-package: domain logic
            ├── __init__.py          # Exposes main service classes
            └── engine.py            # Core business logic implementation
```

Each `__init__.py` follows the explicit export pattern:

```python
# src/my_package/models/__init__.py
"""Data models for users and orders."""

from my_package.models.user import User, UserCreate, UserUpdate
from my_package.models.order import Order, OrderCreate

__all__ = [
    "User",
    "UserCreate",
    "UserUpdate",
    "Order",
    "OrderCreate",
]
```

```python
# src/my_package/__main__.py
"""Entry point for running the package as a module: python -m my_package."""

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(prog="my_package", description="My awesome Python package")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    args = parser.parse_args(argv)

    if args.verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    from my_package.core.engine import run_engine
    return run_engine()


if __name__ == "__main__":
    sys.exit(main())
```

### Pattern 3: Type Stub Files (.pyi) for Public Interfaces

Type stub files provide type annotations without requiring the runtime implementation to have them. They are essential when publishing libraries that need to support `mypy --strict` or when the source code uses dynamic patterns that type checkers cannot infer.

```python
# src/my_package/core/engine.py (runtime source — may lack annotations)
class Engine:
    def __init__(self, config):
        self.config = config
        self._running = False

    def run(self, iterations=None):
        results = []
        for i in range(iterations or 100):
            results.append(process(i))
        return results

    @property
    def status(self):
        return "running" if self._running else "stopped"


def create_engine(config_path: str) -> Engine:
    ...
```

```python
# src/my_package/core/engine.pyi (type stub — must match runtime interface exactly)
"""Type stubs for my_package.core.engine.

This file provides type annotations without requiring changes to the
runtime source code. Type checkers read this file instead of .py
when --strict mode is enabled and a corresponding .pyi exists.
"""

from typing import Any, Sequence


class Engine:
    """Core processing engine for the my_package application."""

    def __init__(self, config: dict[str, Any]) -> None: ...
    #                    ^^^^^^^^^^^^^^^^  ^^^^^
    #                    Required type      Runtime uses 'Any' but we tighten it

    def run(self, iterations: int | None = None) -> list[Any]: ...
    #                     ^^^^^^^^^^          ^^^^^^^^^
    #                     Optional via Union   Return type specified

    @property
    def status(self) -> str: ...
    #                  ^^^ Runtime returns string but doesn't annotate it

    def close(self) -> None: ...  # Stub can add methods the runtime has but source omits


def create_engine(config_path: str) -> Engine: ...
#                 ^^^^^^^^^^^^^^      ^^^^^^
#                 Runtime annotates     Stub restates for clarity in public API
```

For packages distributed on PyPI, place stub files either alongside the source (`engine.pyi` next to `engine.py`) or in a separate `-stubs` package following PEP 561:

```
my_package/                    # Main package (runtime)
├── pyproject.toml
└── src/my_package/
    └── core/
        ├── __init__.py
        └── engine.py          # Runtime implementation

my_package-stubs/              # Separate stub distribution (optional, PEP 561)
├── pyproject.toml
├── mypy.ini                   # Optional: strict mypy config for stubs
└── src/my_package/
    └── core/
        ├── __init__.pyi       # Stub for __init__.py public exports
        └── engine.pyi         # Stub for engine module types
```

### Pattern 4: pyproject.toml Metadata and Build Configuration

Modern Python packaging uses `pyproject.toml` exclusively. `setup.py` is legacy — it cannot express optional dependencies, dynamic metadata, or build system requirements declaratively.

```toml
# pyproject.toml — Modern Python project configuration

[build-system]
requires = ["hatchling", "hatch-vcs"]
build-backend = "hatchling.build"

[project]
name = "my-package"
dynamic = ["version"]
description = "A production-ready Python package demonstrating proper structure."
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.10"
authors = [
    {name = "Developer Name", email = "dev@example.com"},
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Software Development :: Libraries :: Python Modules",
]
dependencies = [
    "pydantic>=2.0,<3.0",
    "httpx>=0.25,<1.0",
    "structlog>=24.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=4.0",
    "mypy>=1.8",
    "ruff>=0.3",
    "httpx>=0.25",
]
docs = [
    "sphinx>=7.0",
    "sphinx-rtd-theme>=2.0",
]

[project.scripts]
my-package = "my_package.__main__:main"

[tool.hatch.version]
source = "vcs"

[tool.hatch.build.targets.wheel]
packages = ["src/my_package"]

[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"

[tool.ruff]
target-version = "py310"
line-length = 100
```

---

## Constraints

### MUST DO

- Use `src/` layout for all packages intended for distribution or with more than 3 modules
- Declare public API explicitly via `__all__` in every `__init__.py` — never use star imports
- Keep each `.py` file focused on a single responsibility — split files exceeding ~300 lines by feature area
- Use Google-style docstrings consistently: one-line summary, detailed description, Args section, Returns/Yields/Raises sections
- Resolve all circular imports before committing — use lazy imports inside functions as a last resort
- Declare dependencies in `pyproject.toml` `[project.dependencies]` — never maintain `setup.py` for new projects
- Use absolute imports from the installed package name (`from my_package.models.user import User`) not relative imports within sub-packages (except in `__init__.py`)

### MUST NOT DO

- Never use `from .module import *` — it pollutes the namespace, breaks type checkers, and hides symbol origins
- Never place source code directly at the project root without `src/` prefix during development — this masks installation bugs
- Never create circular imports between modules at the same package level (e.g., `models/user.py` importing from `api/routes.py` while routes imports from models)
- Never expose internal helper modules through `__init__.py` — only export what is part of the public API
- Never omit `__init__.py` from sub-packages unless you intentionally want a namespace package (PEP 420)
- Never use `setup.py` for new projects — use `pyproject.toml` with a modern build backend (hatchling, setuptools, pdm-backend)

---

## Output Template

When restructuring or creating Python packages with this skill active, produce:

1. **Directory Structure Diagram** — ASCII tree showing the proposed layout including `src/`, `tests/`, sub-packages, and entry points
2. **Module Responsibility Map** — Table mapping each file to its responsibility (class name or function group it contains)
3. **`__init__.py` Contents** — Full content for each `__init__.py` with explicit `__all__` exports listed
4. **Import Dependency Graph** — List of import relationships between modules, flagged for any circular dependencies
5. **`pyproject.toml` Snippet** — Build system config, dependencies, optional-dependencies, and entry points
6. **Stub File Recommendations** — Which public interfaces need `.pyi` stubs and why (missing annotations, dynamic patterns)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements` | Determines which framework dependencies and constraints apply to the project structure |
| `engineering-principles` | General software engineering principles that inform module boundaries and cohesion |
| `dry-principles` | DRY application in Python — avoiding duplication across modules without over-abstraction |
| `code-quality-policies` | Linting, formatting, and type-checking configuration that integrates with package structure |
| `pydantic-models` | Pydantic v2 model patterns for data validation in package models layer |

---

## References

- [PEP 420 — Implicit Namespace Packages](https://peps.python.org/pep-0420/) — Zero-`__init__.py` namespace packages
- [PEP 561 — Distributing and Ingesting Type Stubs](https://peps.python.org/pep-0561/) — Stub file distribution on PyPI
- [PEP 517 / PEP 621 — Build System and Project Metadata](https://peps.python.org/pep-0621/) — `pyproject.toml` project metadata format
- [Google Python Style Guide — Docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) — Recommended docstring convention
- [Python Packaging User Guide](https://packaging.python.org/) — Official packaging reference

---

> 📖 skill: python-module-structure
