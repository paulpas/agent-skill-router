---




name: python-package-publishing
description: Builds, verifies, and publishes Python packages with hatchling, hatch-vcs
  dynamic versioning, twine checks, test pypi, and GitHub Actions release CI/CD.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: python package, publish to pypi, how do i publish a python package, build
    wheel sdist, pyproject.toml hatchling, twine check, test pypi, github actions
    release
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
  - config
  - examples
  - do-dont
  related-skills: coding/python-module-structure, modern-python-development, coding/software-delivery-pipelines




---




# Python Package Publishing Engine

Builds, verifies, and publishes production-ready Python packages using hatchling as the build backend, hatch-vcs for git-tag-driven dynamic versioning, twine for pre-upload verification, and GitHub Actions for automated release CI/CD. Handles wheel and sdist distribution creation, CLI entry points, optional dependency groups, and native extension builds.

## TL;DR Checklist

- [ ] Set `[build-system]` to `hatchling` with `requires-python >= 3.10`
- [ ] Configure `hatch-vcs` for git-tag-driven dynamic versioning — never hardcode versions
- [ ] Run `python -m build` to produce both `.whl` and `.tar.gz` artifacts
- [ ] Verify every artifact with `twine check dist/*` before uploading
- [ ] Publish to TestPyPI first with `twine upload --repository testpypi dist/*`, then PyPI
- [ ] Define CLI entry points under `[project.scripts]` for console commands
- [ ] Group optional dependencies under `[project.optional-dependencies]`
- [ ] Configure native extension build in `hatch_build.py` when C/C++/Rust extensions are needed

---

## When to Use

- Packaging a Python library or application for distribution on PyPI
- Setting up a CI/CD release pipeline that builds and publishes on git tags
- Adding CLI entry points so users can run your package as a command-line tool
- Organizing optional dependencies (e.g., `pip install mypkg[dev,ml,gpu]`)
- Building Python packages that include native extensions (C/C++/Rust)
- Migrating from `setup.py` / `setuptools` to modern `pyproject.toml` + hatchling

---

## When NOT to Use

- Internal-only tools not meant for public or private PyPI distribution — use direct `pip install -e .` in development
- Simple one-off scripts that don't need versioning, entry points, or dependency management
- Projects already using Poetry, PDM, or uv as their primary toolchain — those have their own packaging flows. This skill is specifically for hatchling-based workflows.

---

## Core Workflow

1. **Define pyproject.toml Metadata** — Configure project name, description, authors, license, Python version constraint, dependencies, and optional dependency groups under `[project]`. Declare the build system using `[build-system]` with `hatchling`.
   **Checkpoint:** Every required field (`name`, `version` or `dynamic = ["version"]`, `description`, `readme`, `requires-python`, `dependencies`) is present. No `setup.py` file exists.

2. **Configure Dynamic Versioning with hatch-vcs** — If using git-tag-driven versions, set `dynamic = ["version"]` under `[project]` and configure `[tool.hatch.version.source = "vcs"]`. Tag releases with `v1.2.3` format; the build system derives the version from the nearest annotated tag.
   **Checkpoint:** The nearest ancestor tag follows PEP 440-compliant version format (e.g., `v1.2.3`). No hardcoded version string exists in source files.

3. **Set Up CLI Entry Points** — Define console scripts under `[project.scripts]`. Each entry maps a command name to a module path: function pair. For GUI or package-level execution, also add `[project.scripts]` and `src/package/__main__.py`.
   **Checkpoint:** Every command listed under `[project.scripts]` resolves to an existing callable at runtime. Test with `pip install -e .` and run the command.

4. **Add Optional Dependency Groups** — Declare feature-specific dependencies under `[project.optional-dependencies]`. Each group key becomes a pip extras specifier: `pip install mypackage[dev,test]`. Name groups by their use case (`dev`, `test`, `docs`, `ml`, `gpu`).
   **Checkpoint:** No dependency appears in both `dependencies` and an optional group — that creates installation ambiguity.

5. **Configure Native Extension Builds** — If your package includes C/C++/Rust extensions, create a `hatch_build.py` file in the project root. Hatchling calls functions in this file at build time to compile extensions. Use `Extension` classes and `get_extensions()` or `get_config()` hooks.
   **Checkpoint:** Extensions compile against the correct Python include paths and ABI. The built extension is present in the wheel under the expected package path.

6. **Build Distributions** — Run `python -m build` from the project root. This produces a `.whl` (wheel) for the current platform and a `.tar.gz` (source distribution) compatible with all platforms. Verify both artifacts exist in `dist/`.
   **Checkpoint:** Both `dist/*.whl` and `dist/*.tar.gz` are present. Check wheel metadata with `python -m zipfile -l dist/*.whl | head -20`.

7. **Verify with Twine** — Run `twine check dist/*` to validate long description rendering on PyPI, check for missing metadata, and ensure no insecure package contents. Fix any warnings or errors before uploading.
   **Checkpoint:** `twine check` reports zero errors and zero warnings. Review the rendered README preview at https://pypi.org/help/#rendered-readme.

8. **Publish to TestPyPI First** — Upload to TestPyPI using an API token (not a password) via `twine upload --repository testpypi dist/*`. Install from TestPyPI in a clean environment to verify: `pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ mypackage`.
   **Checkpoint:** The package installs cleanly from TestPyPI and all entry points, imports, and optional features work.

9. **Publish to Production PyPI** — After confirming the TestPyPI install works, publish to production: `twine upload dist/*` (or use API tokens with `--repository pypi`). Never skip the TestPyPI step for new packages or major version bumps.
   **Checkpoint:** The package appears on https://pypi.org/project/<your-package>/. Verify downloads and metadata are correct.

10. **Automate Release CI/CD** — Configure GitHub Actions to build, verify, and publish on git tags matching `v*`. Use the `pypa/gh-action-pypi-publish` action for secure uploads with PyPI API token stored in secrets.
    **Checkpoint:** Pushing a tag `v1.2.3` triggers the workflow, which builds artifacts, runs tests, publishes to TestPyPI, and then PyPI on merge to main.

---

## Implementation Patterns

### Pattern 1: Complete pyproject.toml with hatch-vcs Dynamic Versioning

This is the canonical `pyproject.toml` for a publishable Python package using hatchling as the build backend with git-tag-driven versioning. Replace placeholder values with your project metadata.

```toml
[build-system]
requires = ["hatchling", "hatch-vcs"]
build-backend = "hatchling.build"

[project]
name = "my-package"
dynamic = ["version"]
description = "A production-ready Python package with CLI entry points and optional features"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"
license-files = ["LICENSE"]
authors = [
    { name = "Jane Developer", email = "jane@example.com" },
]
keywords = ["python", "package", "cli", "tool"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Operating System :: OS Independent",
]
dependencies = [
    "click>=8.1",
    "pydantic>=2.0,<3",
    "httpx>=0.27",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=4.1",
    "ruff>=0.4",
    "mypy>=1.10",
    "types-click>=7.1",
]
test = [
    "httpx>=0.27",
    "pytest-asyncio>=0.23",
]
docs = [
    "sphinx>=7.0",
    "sphinx-rtd-theme>=2.0",
    "myst-parser>=2.0",
]
ml = [
    "numpy>=1.26",
    "pandas>=2.2",
    "scikit-learn>=1.4",
]

[project.scripts]
mycli = "my_package.cli:main"
mytool = "my_package.commands.run:execute"

[project.gui-scripts]
mygui = "my_package.gui:main"

[tool.hatch.version]
source = "vcs"

[tool.hatch.version.raw-options]
version_scheme = "post-release"
local_scheme = "no-local-version"

[tool.hatch.build.targets.wheel]
packages = ["src/my_package"]

[tool.hatch.build.targets.sdist]
# Include test data and docs in source distribution
include = [
    "/src",
    "/tests",
    "/README.md",
    "/LICENSE",
]

[tool.hatch.metadata]
allow-direct-references = true
```

### Pattern 2: Native Extension Build with hatch_build.py

When your package includes compiled extensions (C, C++, Rust), hatchling uses a build hook file to invoke the compiler. This pattern shows a C extension building against the Python C API with proper include paths and ABI flags.

```python
# hatch_build.py — Called by hatchling during `python -m build`

import os
import sys
from pathlib import Path

from hatchling.build import ConfigurablePlugin
from hatchling.plugin import hookimpl


class ExtensionBuilder(ConfigurablePlugin):
    """Builds native C extensions for my_package."""

    def get_sources(self, target_type, target_id, config):
        """Provide source files for the wheel build."""
        if target_type != "wheel":
            return []

        ext_dir = Path("src/my_package/_native")
        if not ext_dir.exists():
            return []

        return list(ext_dir.glob("*.c")) + [Path("src/my_package/_native/CMakeLists.txt")]

    @hookimpl
    def build_wheel(self, wheel_directory, config_settings=None, data=None):
        """Build C extensions into the wheel directory before packaging."""
        from setuptools import Extension, setup
        from setuptools.command.build_ext import build_ext

        ext = Extension(
            "my_package._native.core",
            sources=["src/my_package/_native/core.c"],
            include_dirs=[
                sys.base_prefix + "/include/python" + str(sys.version_info.major) + "." + str(sys.version_info.minor),
                "src/my_package/_native/include",
            ],
            define_macros=[("Py_LIMITED_API", "0x030A0000")],  # ABI-stable for Python 3.10+
        )

        # Compile extension in-place so it can be copied into the wheel
        setup(
            ext_modules=[ext],
            script_args=["build_ext", "--inplace"],
        )

        return super().build_wheel(wheel_directory, config_settings, data)


def build(hook_config, build_context):
    """Entry point called by hatchling at build time."""
    builder = ExtensionBuilder(hook_config or {})
    return builder.build_wheel(
        wheel_directory=build_context.context_dir / "dist",
        config_settings=None,
        data=None,
    )
```

### Pattern 3: CLI Entry Point Implementation (BAD vs. GOOD)

Proper CLI setup requires an entry point module that handles argument parsing, error handling, and a clean return code. Avoid putting all logic at the top level of `__init__.py`.

```python
# ❌ BAD — monolithic cli.py with no error handling, no exit codes
import click

@click.command()
def mycli():
    from my_package.core import run
    result = run()
    print(result)

if __name__ == "__main__":
    mycli()
```

```python
# ✅ GOOD — structured CLI with error handling, exit codes, and graceful degradation
"""Command-line interface for my-package.

Entry point registered via [project.scripts] in pyproject.toml:
    mycli = "my_package.cli:main"
"""

import sys
import logging
from typing import NoReturn

import click

logger = logging.getLogger("my_package.cli")


def _die(message: str, code: int = 1) -> NoReturn:
    """Print an error message to stderr and exit with the given code."""
    click.echo(f"Error: {message}", err=True)
    sys.exit(code)


@click.group()
@click.version_option(package_name="my-package")
@click.option("--verbose", "-v", is_flag=True, help="Enable debug logging.")
@click.option("--quiet", "-q", is_flag=True, help="Suppress all non-error output.")
@click.pass_context
def main(ctx: click.Context, verbose: bool, quiet: bool) -> None:
    """my-package — production CLI tool."""
    ctx.ensure_object(dict)

    if verbose and quiet:
        _die("Cannot use both --verbose and --quiet simultaneously.", code=2)

    level = logging.DEBUG if verbose else (logging.WARNING if quiet else logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


@main.command()
@click.argument("input_path", type=click.Path(exists=True, dir_okay=False))
@click.option("--output", "-o", type=click.Path(writable=True), default=None)
@click.option("--format", "fmt", type=click.Choice(["json", "csv", "yaml"]), default="json")
@click.pass_context
def process(ctx: click.Context, input_path: str, output: str | None, fmt: str) -> int:
    """Process an input file and write results."""
    from my_package.core import Engine

    try:
        engine = Engine()
        result = engine.process(input_path, format_type=fmt)
    except FileNotFoundError as exc:
        _die(f"Input file not found: {input_path}")
    except ValueError as exc:
        _die(f"Invalid input data: {exc}")

    if output:
        result.to_file(output)
        click.echo(f"Wrote results to {output}", err=bool(ctx.obj.get("verbose")))
    else:
        click.echo(result.serialize(fmt))

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

### Pattern 4: GitHub Actions Release CI/CD Pipeline

This workflow builds and publishes the package on every git tag that matches `v*`. It uses a two-stage publish: first to TestPyPI for validation, then to production PyPI after manual approval.

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: read

jobs:
  build-and-test:
    name: Build and test on Python ${{ matrix.python }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python: ["3.10", "3.11", "3.12", "3.13"]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for hatch-vcs to find tags

      - name: Set up Python ${{ matrix.python }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}

      - name: Install build dependencies
        run: |
          python -m pip install --upgrade pip
          pip install build twine hatch-vcs

      - name: Build distributions
        run: python -m build

      - name: Verify with twine
        run: twine check dist/*

      - name: Run tests
        run: |
          pip install -e ".[dev,test]"
          pytest tests/ --cov=my_package --cov-report=xml -q

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml

  publish-testpypi:
    needs: build-and-test
    name: Publish to TestPyPI
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for trusted publishing
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install build tools
        run: pip install build twine

      - name: Build
        run: python -m build

      - name: Upload to TestPyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          repository-url: https://test.pypi.org/legacy/
          verbose: true
          print-hash: true

  publish-pypi:
    needs: publish-testpypi
    name: Publish to Production PyPI
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      id-token: write  # Trusted publishing via PyPI trusted publishers
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install build tools
        run: pip install build twine

      - name: Build and publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          verbose: true
          print-hash: true
```

### Pattern 5: Publishing via API Token (Manual Flow)

For manual publishing outside CI, use a `~/.pypirc` configuration file with an API token instead of a username/password. This is the recommended approach since PyPI deprecated password-based authentication.

```ini
# ~/.pypirc — store in your home directory, permissions 600
[testpypi]
    repository = https://test.pypi.org/legacy/
    # Token starts with pypi-
    password = pypi-AgEIcHlwaS5vcmc.e7Bb...

[pypi]
    repository = https://upload.pypi.org/legacy/
    # Token starts with pypi-
    password = pypi-AgEIcHlwaS5vcmc.x9Yz...
```

Publish commands using the token:

```bash
# Build both wheel and sdist
python -m build

# Verify before upload — fix any issues here
twine check dist/*

# Publish to TestPyPI first (validate install, entry points, metadata)
twine upload --repository testpypi dist/*

# After confirming TestPyPI works, publish to production PyPI
twine upload dist/*
```

---

## Constraints

### MUST DO
- Always use `dynamic = ["version"]` with `hatch-vcs` — never hardcode version numbers in `pyproject.toml` or source files
- Run `twine check dist/*` on every artifact before uploading to any registry
- Publish to TestPyPI first for new packages or major version bumps
- Tag releases with `v` prefix (e.g., `git tag -a v1.2.3 -m "Release 1.2.3" && git push origin v1.2.3`)
- Set `requires-python = ">=X.Y"` to match your minimum supported Python version
- Include both wheel and sdist in every release — users on exotic platforms may need the source distribution
- Define entry points under `[project.scripts]` for every CLI command, not inside `__init__.py`
- Use API tokens (starting with `pypi-`) instead of usernames and passwords for twine authentication
- Include a `LICENSE` file that matches the license declared in `pyproject.toml`
- Set `allow-direct-references = false` unless you have an explicit reason to allow them
- Document optional dependency groups clearly so users know `pip install mypkg[dev,test]` is valid

### MUST NOT DO
- Never publish to PyPI without running tests and twine verification first
- Never commit API tokens, credentials, or secrets to the repository
- Never use hardcoded versions that must be manually incremented on every release
- Never skip TestPyPI publishing for new package names or major version bumps (1.0.0 → 2.0.0)
- Never publish a package whose `long_description` fails twine rendering checks
- Never include test data, `.git` directories, or cache files in the source distribution
- Never use `[tool.setuptools]` alongside `[build-system] hatchling` — choose one build backend
- Never forget to run with `fetch-depth: 0` in CI when using hatch-vcs (tags will not be found)
- Never publish with `--skip-existing` without verifying the upload actually succeeded — silent skips cause corrupted releases
- Never use `setup.py` alongside `pyproject.toml` with hatchling — hatchling does not read setup.py

---

## Output Template

When implementing or auditing a Python package for publishing, produce:

1. **pyproject.toml Audit** — Verify all required `[project]` fields are present and correctly formatted. Confirm `[build-system]` declares `hatchling`. Check that `dynamic = ["version"]` is set with hatch-vcs configured under `[tool.hatch.version]`. List any missing or misconfigured fields.

2. **Distribution Verification Report** — Run `python -m build` and `twine check dist/*`. Document the list of artifacts produced, their sizes, and whether verification passed. Flag any warnings about missing classifiers, license files, or long description rendering issues.

3. **Entry Point Audit** — List all commands defined under `[project.scripts]` and verify each resolves to an existing callable. Test by installing the package in editable mode (`pip install -e .`) and executing each command. Report any broken entry points with the exact resolution path.

4. **CI/CD Pipeline Review** — Evaluate the GitHub Actions workflow (or equivalent). Confirm: checkout fetches all tags, build runs `python -m build`, twine verification passes before upload, TestPyPI publish runs first, and production PyPI uses trusted publishing via `id-token: write`.

5. **Optional Dependencies Matrix** — List each `[project.optional-dependencies]` group with its packages, note any cross-group overlaps, and verify that installing each group individually does not cause conflicts or unexpected transitive pulls.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding/python-module-structure` | Organize your package directory layout and `__init__.py` exports before building for distribution |
| `modern-python-development` | Ensure your code follows Python 3.10+ typing, project structure, and tooling best practices that packaging builds on top of |
| `coding/software-delivery-pipelines` | Extend beyond PyPI publishing to Docker images, container registries, and multi-platform deployment workflows |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Hatchling Documentation](https://hatch.pypa.io/latest/) — Official build backend docs: configuration, build hooks, targets, plugins
- [hatch-vcs Documentation](https://hatch.pypa.io/latest/version/vcs/) — Git-tag-driven dynamic versioning with PEP 440 compliance
- [Python Packaging User Guide](https://packaging.python.org/en/latest/) — Canonical PyPA guidance on packaging, distribution, and publishing
- [twine Documentation](https://twine.readthedocs.io/en/stable/) — Secure PyPI uploads, verification, and repository configuration
- [PyPI Trusted Publishers (GitHub Actions)](https://docs.pypi.org/trusted-publishers/using-a-publisher/) — OIDC-based authentication for CI/CD publishing without API tokens
- [PEP 621 — Storing Project Metadata in pyproject.toml](https://peps.python.org/pep-0621/) — Specification for project metadata format used by hatchling
- [Python Packaging Authority: Building and Distributing Packages](https://packaging.python.org/en/latest/tutorials/packaging-projects/) — Step-by-step tutorial for creating distributable packages
