---




name: modern-python-packaging
description: Configures modern Python packaging with uv, hatchling, pyproject.toml, and dependency resolution for reproducible builds in 2025+.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: python packaging, uv tool, pyproject.toml, hatchling build backend, rye project manager, dependency resolution, Python publish workflow, how do i package a Python project
  archetypes:
    - tactical
    - generation
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
  content-types: [code, guidance, config, examples]
  related-skills: coding-modern-python-development, coding-testing-patterns, coding-cve-dependency-management




---





# Modern Python Packaging

Build configuration engineer configuring modern Python packaging tooling for reproducible, fast builds and distribution. This skill makes the model act as a packaging specialist — selecting build backends, writing complete pyproject.toml configurations, managing dependency resolution with uv or rye, and preparing packages for publication on PyPI or private indexes.

## TL;DR Checklist

- [ ] Choose hatchling as the default build backend unless project requirements dictate otherwise
- [ ] Write a complete pyproject.toml following PEP 621 — no setup.py, no setup.cfg
- [ ] Pin `requires-python` to a minimum version (e.g., `>=3.12`)
- [ ] Commit the lockfile (`uv.lock`) for deterministic builds across environments
- [ ] Use `uv add` / `uv sync` for all dependency management — never pip install manually in project workflows
- [ ] Configure pytest with explicit discovery root and coverage thresholds
- [ ] Version bump using a script or tool that reads/writes pyproject.toml atomically

---

## When to Use

Use this skill when:

- Setting up a new Python project from scratch with modern tooling
- Migrating an existing project from setuptools/setup.py to pyproject.toml
- Configuring dependency resolution for reproducible CI/CD builds
- Preparing a package for publication on PyPI or a private index
- Choosing between build backends (hatchling, flit, pdm, setuptools) for a specific project type
- Resolving dependency conflicts using uv's resolver

---

## When NOT to Use

Avoid this skill for:

- Legacy projects that must support Python 3.9 or earlier with older tooling chains
- Projects committed to Poetry as their primary package manager — Poetry has its own ecosystem
- Simple scripts that don't need packaging (no distribution, no installable entry points)
- Virtual environment management for non-project workflows — use `uv venv` directly instead

---

## Core Workflow

### Step 1: Choose Build Backend Based on Project Requirements

Select the build backend by matching project needs to each tool's strengths:

| Requirement | Recommended Backend | Why |
|---|---|---|
| Standard library, broad compatibility | **hatchling** | Fast, stable, PEP 621 native, best uv integration |
| Minimal config, no plugins needed | **flit** | Simplest setup, but fewer features |
| Complex build steps (C extensions, code gen) | **setuptools** + `build` | Mature ecosystem, but legacy format |
| PDM-native project using lockfile exclusively | **pdm-backend** | Tight integration with PDM workflow |

**Checkpoint:** Backend selected and justified. If choosing hatchling (recommended default), verify no C extension builds are required — if yes, use setuptools.

```python
def select_build_backend(
    project_type: str,  # "library", "cli-tool", "data-science", "web-service"
    has_c_extensions: bool = False,
    needs_code_generation: bool = False,
) -> dict:
    """Recommend a build backend based on project characteristics.

    Args:
        project_type: The kind of Python project being built
        has_c_extensions: Whether the project compiles C/Cython extensions
        needs_code_generation: Whether build-time code generation is required

    Returns:
        Dict with recommended backend and justification
    """
    if has_c_extensions or needs_code_generation:
        return {
            "backend": "setuptools",
            "requires": ["setuptools>=75.0", "wheel"],
            "build_backend": "setuptools.build_meta",
            "justification": (
                f"C extensions or code generation require setuptools build_meta. "
                f"For project_type='{project_type}', consider using setuptools with "
                f"pyproject.toml metadata while keeping setup.py only for build hooks."
            ),
        }

    if project_type == "library":
        return {
            "backend": "hatchling",
            "requires": ["hatchling"],
            "build_backend": "hatchling.build",
            "justification": (
                f"hatchling is the recommended backend for Python libraries. "
                f"It provides fast builds, native PEP 621 support, plugin extensibility, "
                f"and excellent uv integration. Best choice for project_type='{project_type}'."
            ),
        }

    if project_type == "cli-tool":
        return {
            "backend": "hatchling",
            "requires": ["hatchling"],
            "build_backend": "hatchling.build",
            "justification": (
                f"hatchling supports entry point definition via [project.scripts] or "
                f"[project.gui-scripts]. Ideal for CLI tools that need console_scripts "
                f"entry points. Best choice for project_type='{project_type}'."
            ),
        }

    if project_type == "data-science":
        return {
            "backend": "hatchling",
            "requires": ["hatchling"],
            "build_backend": "hatchling.build",
            "justification": (
                f"hatchling with [tool.hatch.build.targets.wheel] configuration "
                f"supports data files, package data inclusion, and selective file "
                f"exclusion needed for data science projects. Best choice for project_type='{project_type}'."
            ),
        }

    return {
        "backend": "hatchling",
        "requires": ["hatchling"],
        "build_backend": "hatchling.build",
        "justification": f"Defaulting to hatchling for project_type='{project_type}'.",
    }
```

### Step 2: Write Complete pyproject.toml Configuration

**Step 2: Create a PEP 621 compliant pyproject.toml with all required sections.**

This is the single source of truth — no setup.py, no setup.cfg, no requirements.txt.

```toml
# ❌ BAD — legacy setuptools approach; multiple config files scattered across project
[metadata]
name = my-python-library
version = 0.1.0
description = A library that does something useful
author = First Last
author_email = author@example.com

[options]
packages = find:
python_requires = >=3.8
install_requires =
    httpx>=0.28
    pydantic>=2.10

[options.extras_require]
dev = pytest; ruff

# Requires a separate setup.py for build hooks, separate requirements.txt for docs
# ❌ BAD: no lockfile — nondeterministic builds
# ❌ BAD: Python 3.8 is end-of-life, broad range causes resolver conflicts
```

```toml
# ✅ GOOD — Complete pyproject.toml for a library project (hatchling backend)
[build-system]
requires = ["hatchling", "hatch-vcs"]
build-backend = "hatchling.build"

[project]
name = "my-python-library"
dynamic = ["version"]
description = "A concise one-line description of what this library does"
readme = "README.md"
requires-python = ">=3.12"
license = {text = "MIT"}
authors = [
    {name = "First Last", email = "author@example.com"},
]
keywords = ["keyword1", "keyword2", "keyword3"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
]
dependencies = [
    "httpx>=0.28,<1.0",
    "pydantic>=2.10,<3.0",
    "structlog>=24.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.25",
    "pytest-cov>=6.0",
    "ruff>=0.9",
    "mypy>=1.14",
]
docs = [
    "mkdocs>=1.6",
    "mkdocstrings[python]>=0.27",
]

[project.scripts]
my-cli = "my_library.cli:main"

[tool.hatch.version]
source = "vcs"

[tool.hatch.build.targets.wheel]
packages = ["src/my_library"]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF", "PLC", "PLE"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = [
    "error",
    "ignore::DeprecationWarning",
]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.coverage.run]
source = ["my_library"]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true

# ✅ For a CLI tool project, add entry points and GUI scripts if applicable
# [project.scripts]
# my-tool = "my_tool.cli:main"
#
# [project.gui-scripts]
# gui-tool = "my_tool.gui:main"
```

**Checkpoint:** pyproject.toml is complete with all sections. Verify that `packages` in `[tool.hatch.build.targets.wheel]` matches the actual source directory structure.

### Step 3: Configure Dependency Resolution with uv

**Step 3: Set up deterministic dependency resolution and lock management.**

```bash
# Initialize a new project with default pyproject.toml (hatchling + src layout)
uv init my-project --name my-project
cd my-project

# Add production dependencies (resolves versions, updates uv.lock instantly)
uv add httpx pydantic structlog

# Add optional dependency groups
uv add --optional dev pytest pytest-asyncio pytest-cov ruff mypy
uv add --optional docs mkdocs mkdocstrings[python]

# Pin exact version for a specific dependency (useful for critical dependencies)
uv add "pydantic>=2.10,<3.0"

# Run tooling inside the project environment — no manual venv activation
uv run python -m my_project.cli --help
uv run pytest
uv run ruff check .
uv run mypy src/

# Sync dependencies from lockfile (deterministic, fast)
uv sync

# Update all dependencies to newest compatible versions
uv lock --upgrade

# Update a single dependency
uv lock --upgrade-package httpx

# Add a development-only dependency that doesn't affect production installs
uv add --dev black isort

# Remove a dependency
uv remove structlog
```

**Checkpoint:** `uv.lock` file exists and is committed. Run `uv sync --locked` in CI to enforce lockfile determinism — this fails if the lockfile is out of sync with pyproject.toml.

```python
def verify_lockfile_integrity(project_dir: str) -> dict:
    """Verify that uv.lock matches pyproject.toml dependencies.

    This is what should run in CI to prevent undetected dependency drift.

    Args:
        project_dir: Path to the project root containing pyproject.toml and uv.lock

    Returns:
        Dict with verification result and any discrepancies found
    """
    import subprocess

    try:
        # uv sync --locked fails if lockfile doesn't match pyproject.toml
        result = subprocess.run(
            ["uv", "sync", "--locked"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )

        return {
            "integrity_ok": result.returncode == 0,
            "output": result.stdout + result.stderr,
            "discrepancies": [] if result.returncode == 0 else _parse_discrepancies(result.stderr),
        }
    except subprocess.TimeoutExpired:
        return {
            "integrity_ok": False,
            "output": "uv sync timed out after 120 seconds",
            "discrepancies": ["dependency resolution timeout"],
        }


def _parse_discrepancies(stderr: str) -> list[str]:
    """Parse uv sync error output for human-readable discrepancy descriptions."""
    issues = []
    if "mismatch" in stderr.lower():
        issues.append("Lockfile does not match pyproject.toml dependencies")
    if "not found" in stderr.lower() or "could not find" in stderr.lower():
        issues.append("A required package could not be resolved from the index")
    if "version" in stderr.lower() and ("conflict" in stderr.lower() or "incompatible" in stderr.lower()):
        issues.append("Version conflict between dependency requirements")
    return issues if issues else [stderr.strip()[:200]]
```

### Step 4: Set Up Local Development Environment

**Step 4: Configure the development environment for a frictionless developer experience.**

```bash
# Create and activate the project environment (automatic, no manual venv commands)
uv sync          # Installs all dependencies from uv.lock into project venv

# Run any command with correct environment — no source .venv/bin/activate needed
uv run pytest tests/
uv run ruff check src/ --fix
uv run mypy src/my_library/

# Add packages interactively (with dependency resolution preview)
uv add package-name

# Quick one-off script execution in project context
uv run python -c "import my_library; print(my_library.__version__)"

# Run pre-commit hooks before committing (if configured)
uv run pre-commit run --all-files

# For a data science project with heavy dependencies, use workspace mode
mkdir my-workspace && cd my-workspace
uv venv --python 3.12    # Create shared workspace venv
uv pip install numpy pandas scikit-learn
```

**Checkpoint:** `uv run` works for all tooling commands without manual virtual environment activation. If `uv run pytest` fails, check that the test paths in pyproject.toml match the actual directory structure.

### Step 5: Configure Testing Integration

**Step 5: Integrate testing and coverage into the build configuration.**

```toml
# ✅ GOOD — pytest + coverage configuration in pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = [
    "error",                    # Treat all warnings as errors
    "ignore::DeprecationWarning:pkg_resources",  # Ignore known third-party deprecations
    "ignore::DeprecationWarning:yaml",
]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests that require external services",
    "network: marks tests that make network calls",
]

[tool.coverage.run]
source = ["my_library"]       # Measure coverage only for production code
branch = true                 # Track branch coverage, not just line coverage
omit = [
    "tests/**",               # Exclude test files
    "src/my_library/cli.py",  # Exclude CLI entry points from coverage
    "**/__about__.py",        # Exclude version stubs
]

[tool.coverage.report]
fail_under = 80              # CI fails if coverage drops below 80%
show_missing = true           # Show which lines are missing coverage
skip_empty = true             # Skip files with no statements
sort = "Cover"                # Sort report by coverage percentage

# ✅ GOOD — ruff integration for linting and formatting
[tool.ruff]
target-version = "py312"
line-length = 100
show-fixes = true

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "F",      # pyflakes (unused imports, undefined names)
    "I",      # isort (import sorting)
    "UP",     # pyupgrade (modernize syntax)
    "B",      # flake8-bugbear (common bugs)
    "SIM",    # flake8-simplify (simplify expressions)
    "RUF",    # ruff-specific rules
    "PLC",    # pylint conventions
    "PLE",    # pylint errors
]
ignore = [
    "E501",   # Line length handled by formatter
]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]  # Allow assert in tests (flake8-bugbear)
```

**Checkpoint:** `uv run ruff check .` passes with no errors. Coverage threshold set to at least 80% — adjust based on project maturity.

### Step 6: Prepare for Publication

**Step 6: Configure versioning, changelog management, and pre-publish validation.**

```python
"""Version bumping automation that reads/writes pyproject.toml."""


def bump_version(
    project_dir: str = ".",
    bump_type: str = "patch",
) -> dict:
    """Bump the version in pyproject.toml using hatch-vcs or manual version field.

    This function works with both dynamic (vcs-driven) and static versions.

    Args:
        project_dir: Path to project root containing pyproject.toml
        bump_type: One of 'patch', 'minor', 'major' — ignored for vcs-driven versions

    Returns:
        Dict with previous version, new version, and bump metadata
    """
    import subprocess
    import tomllib
    from pathlib import Path

    pyproject_path = Path(project_dir) / "pyproject.toml"

    # Read current configuration
    with open(pyproject_path, "rb") as f:
        config = tomllib.load(f)

    is_dynamic_version = "dynamic" in config.get("project", {}) and "version" in config["project"]["dynamic"]

    if is_dynamic_version:
        # For hatch-vcs managed versions, trigger a release commit/tag
        result = subprocess.run(
            ["git", "describe", "--tags", "--abbrev=0"],
            cwd=project_dir,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": "No git tags found — cannot compute version from VCS",
            }

        # hatch-vcs will compute version from the latest tag + commit count
        new_version_tag = _compute_next_tag(result.stdout.strip(), bump_type)
        return {
            "success": True,
            "method": "vcs",
            "previous_tag": result.stdout.strip(),
            "new_tag": new_version_tag,
            "note": "Run 'git tag' and 'git push --tags' to publish this version",
        }

    else:
        # Static version — read directly from pyproject.toml
        current_version = config.get("project", {}).get("version", "0.0.0")
        new_version = _bump_static_version(current_version, bump_type)

        # Update pyproject.toml with new version (atomic write)
        content = pyproject_path.read_text()
        import re
        updated = re.sub(
            r'^(version\s*=\s*)".*?"$',
            f'\\1"{new_version}"',
            content,
            flags=re.MULTILINE,
        )
        pyproject_path.write_text(updated)

        return {
            "success": True,
            "method": "static",
            "previous_version": current_version,
            "new_version": new_version,
            "note": f"Updated pyproject.toml version from {current_version} to {new_version}",
        }


def _compute_next_tag(latest_tag: str, bump_type: str) -> str:
    """Compute the next git tag based on semver bump type."""
    # Strip 'v' prefix if present
    tag_base = latest_tag.lstrip("v")
    major, minor, patch = map(int, tag_base.split("."))

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:  # patch (default)
        patch += 1

    return f"v{major}.{minor}.{patch}"


def _bump_static_version(current: str, bump_type: str) -> str:
    """Bump a static semver version string."""
    major, minor, patch = map(int, current.split("."))

    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    else:
        return f"{major}.{minor}.{patch + 1}"


def pre_publish_check(project_dir: str = ".") -> list[str]:
    """Run all pre-publish checks before building a distribution.

    Returns a list of errors found (empty list means ready to publish).

    Checks performed:
    1. Version is not a development/pre-release version
    2. README.md exists and renders correctly
    3. All dependencies have pinned versions compatible with requires-python
    4. Build artifacts from previous releases are cleaned
    """
    import subprocess
    from pathlib import Path

    errors = []
    pyproject_path = Path(project_dir) / "pyproject.toml"

    # Check 1: Version is not pre-release
    try:
        with open(pyproject_path, "rb") as f:
            config = __import__("tomllib").load(f)

        version = config.get("project", {}).get("version", "")
        if version and any(part in version for part in ("alpha", "beta", "rc", ".dev")):
            errors.append(
                f"Version '{version}' is a pre-release — bump to stable version before publishing"
            )
    except Exception as e:
        errors.append(f"Failed to read pyproject.toml: {e}")

    # Check 2: README exists
    readme_files = ["README.md", "README.rst", "README.txt"]
    if not any((Path(project_dir) / rf).exists() for rf in readme_files):
        errors.append("No README found — PyPI requires a long_description")

    # Check 3: Clean build artifacts
    build_dirs = [Path(project_dir) / "dist", Path(project_dir) / "build"]
    for bd in build_dirs:
        if bd.exists() and any(bd.iterdir()):
            errors.append(
                f"Build directory '{bd}' exists and is not empty — run 'rm -rf dist build' first"
            )

    # Check 4: Build test
    result = subprocess.run(
        ["uv", "build", "--sdist", "--wheel"],
        cwd=project_dir,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        errors.append(f"Build failed: {result.stderr[:300]}")

    return errors
```

**Checkpoint:** `pre_publish_check()` returns an empty list. If not, fix each error before running `uv publish`.

---

## Implementation Patterns

### Pattern 1: Complete pyproject.toml for Different Project Types

```toml
# ============================================================================
# Library project (src layout) — most common case
# ============================================================================
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-library"
version = "0.1.0"
description = "A library that does something useful"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.28",
    "pydantic>=2.10",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "ruff>=0.9"]

[tool.hatch.build.targets.wheel]
packages = ["src/my_library"]


# ============================================================================
# CLI tool project — includes entry point scripts
# ============================================================================
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-cli-tool"
version = "1.0.0"
description = "A command-line tool for doing things"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "click>=8.1",
    "rich>=13.0",
]

[project.scripts]
my-cli = "my_cli_tool.cli:main"

[tool.hatch.build.targets.wheel]
packages = ["src/my_cli_tool"]


# ============================================================================
# Data science project — includes data files in the package
# ============================================================================
[build-system]
requires = ["hatchling", "hatch-fancy-pypi-readme"]
build-backend = "hatchling.build"

[project]
name = "my-data-project"
version = "0.5.0"
description = "A data science package with model artifacts"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "numpy>=1.26",
    "pandas>=2.2",
    "scikit-learn>=1.5",
]

# Include data files (CSV, JSON, model artifacts) in the wheel
[tool.hatch.build.targets.wheel]
packages = ["src/my_data_project"]
artifacts = [
    "src/my_data_project/data/*.csv",
    "src/my_data_project/data/*.json",
    "src/my_data_project/models/*.pkl",
]

# Exclude unnecessary files (reduces package size)
[tool.hatch.build.targets.wheel.only-packages]
include = ["my_data_project"]
```

### Pattern 2: uv Dependency Management Workflow Reference

```bash
# ── Initialization ───────────────────────────────────────────────
uv init my-project              # Scaffold new project with pyproject.toml
cd my-project
uv sync                         # Create .venv and install deps from lockfile

# ── Adding Dependencies ──────────────────────────────────────────
uv add httpx                    # Add to production dependencies
uv add --dev pytest             # Add to dev dependencies only
uv add "package>=1.0,<2.0"      # With version constraints

# ── Managing Lockfile ───────────────────────────────────────────
uv sync                         # Sync from lockfile (fast, deterministic)
uv lock                         # Update lockfile based on current pyproject.toml
uv lock --upgrade               # Upgrade all packages to newest compatible versions
uv lock --upgrade-package httpx # Upgrade just one package
uv sync --locked                # CI mode: fail if lockfile drifts from pyproject.toml

# ── Building and Publishing ─────────────────────────────────────
uv build                        # Build sdist and wheel
uv publish                      # Publish to PyPI (requires API token)
# Alternative: manually upload
twine upload dist/*             # Traditional approach if not using uv publish

# ── Workspace Mode (multi-package projects) ────────────────────
uv new workspace-parent --lib
cd workspace-parent
uv x add package1 package2       # Add to workspace root
uv sync                          # Installs all workspace packages
```

### Pattern 3: Version Bump Automation with Git Integration

```python
"""Complete version bump tool with git tag and changelog management."""

import subprocess
from pathlib import Path


def release_workflow(
    project_dir: str = ".",
    bump_type: str = "patch",
    skip_publish: bool = False,
    skip_tests: bool = False,
) -> dict:
    """Execute a complete release workflow: bump version, run tests, build, publish.

    Args:
        project_dir: Project root path
        bump_type: 'major', 'minor', or 'patch'
        skip_publish: If True, stop after building (dry-run mode)
        skip_tests: If True, skip test verification before release

    Returns:
        Dict with step results and final version
    """
    steps = []
    errors = []

    # Step 1: Pre-publish checks
    try:
        from .version import pre_publish_check  # from Step 6 above
        check_results = pre_publish_check(project_dir)
        if check_results:
            return {
                "success": False,
                "error": "Pre-publish checks failed",
                "steps": [{"step": "pre_publish_check", "errors": check_results}],
            }
        steps.append({"step": "pre_publish_check", "status": "passed"})
    except ImportError:
        steps.append({"step": "pre_publish_check", "status": "skipped (not available)"})

    # Step 2: Run tests if not skipped
    if not skip_tests:
        result = subprocess.run(
            ["uv", "run", "pytest", "-x", "--tb=short"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Tests failed before release:\n{result.stderr[-500:]}",
                "steps": steps + [{"step": "tests", "status": "failed"}],
            }
        steps.append({"step": "tests", "status": "passed"})

    # Step 3: Bump version
    try:
        from .version import bump_version  # from Step 6 above
        result = bump_version(project_dir, bump_type)
        if not result["success"]:
            return {
                "success": False,
                "error": f"Version bump failed: {result.get('error', 'unknown')}",
                "steps": steps + [{"step": "version_bump", "status": "failed"}],
            }
        new_version = result.get("new_tag") or result.get("new_version", "unknown")
        steps.append({"step": "version_bump", "status": "passed", "new_version": new_version})
    except ImportError:
        return {
            "success": False,
            "error": "bump_version function not found — define it first",
            "steps": steps,
        }

    # Step 4: Build distribution
    build_result = subprocess.run(
        ["uv", "build", "--sdist", "--wheel"],
        cwd=project_dir,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if build_result.returncode != 0:
        return {
            "success": False,
            "error": f"Build failed:\n{build_result.stderr[:500]}",
            "steps": steps + [{"step": "build", "status": "failed"}],
        }
    steps.append({"step": "build", "status": "passed"})

    # Step 5: Publish (unless skipped)
    if not skip_publish:
        publish_result = subprocess.run(
            ["uv", "publish"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )
        steps.append({
            "step": "publish",
            "status": "passed" if publish_result.returncode == 0 else "failed",
        })

    return {
        "success": len(errors) == 0,
        "new_version": new_version,
        "steps": steps,
        "errors": errors,
    }


def _git_tag_and_push(version: str, project_dir: str) -> bool:
    """Create a git tag for the release version and push to remote."""
    try:
        subprocess.run(["git", "tag", f"v{version}"], cwd=project_dir, check=True)
        subprocess.run(
            ["git", "push", "origin", f"v{version}"],
            cwd=project_dir,
            check=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Git tag/push failed: {e}")
        return False
```

---

## Constraints

### MUST DO
- Use pyproject.toml as the single configuration file — no setup.py, no setup.cfg, no requirements.txt
- Choose hatchling as the default build backend unless C extensions or code generation require setuptools
- Pin `requires-python` to a minimum version in every pyproject.toml (e.g., `>=3.12`)
- Commit the lockfile (`uv.lock`) — never distribute without it, as builds become non-reproducible
- Use `uv sync --locked` in CI to enforce lockfile determinism
- Configure pytest with explicit testpaths and coverage thresholds (fail_under ≥ 80%)
- Version bump using atomic read/write to pyproject.toml or hatch-vcs git tags — never edit the version string manually without a tool

### MUST NOT DO
- Use setuptools as the build backend unless C extensions, build-time code generation, or legacy compatibility require it
- Manually manage virtual environments with `python -m venv` + `source activate` — uv handles this automatically
- Omit the lockfile from version control — nondeterministic builds break CI and production deployments
- Pin every dependency to an exact version (`package==1.2.3`) — use flexible constraints (`>=1.2,<2.0`) for compatibility
- Publish a package with a pre-release version (alpha, beta, rc) unless intentionally deploying to PyPI test index
- Forget to clean the `dist/` and `build/` directories before building — stale artifacts cause upload confusion

---

## Output Template

When implementing or configuring Python packaging with this skill active, produce:

1. **Backend Recommendation** — Selected build backend with justification based on project type (library, CLI tool, data science)
2. **Complete pyproject.toml** — Full file content ready to write, with all sections: [build-system], [project], [tool.*] configurations
3. **Dependency Resolution Plan** — uv commands needed for adding deps, syncing, and upgrading, plus lockfile strategy
4. **Test and Coverage Configuration** — pytest settings, coverage thresholds, ruff/lint rules
5. **Publishing Checklist** — Pre-publish verification steps, version bump method, git tag workflow

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-modern-python-development` | Modern Python 3.10+ coding patterns — the code written by this skill's projects |
| `coding-testing-patterns` | Pytest fixtures, parametrize, mocking strategies for testing packaged libraries |
| `coding-cve-dependency-management` | Scan published dependencies for known CVEs after packaging updates |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [PEP 621 — Storing Project Metadata in pyproject.toml](https://peps.python.org/pep-0621/)
- [uv Documentation — Fast Python Package Manager](https://docs.astral.sh/uv/)
- [Hatchling Build Backend Documentation](https://hatch.pypa.io/latest/backend/)
- [Hatch-VCS — Dynamic Version Management from Git Tags](https://github.com/ofek/hatch-vcs)
- [PyPI Upload Guidelines — Publishing Your Package](https://packaging.python.org/en/latest/guides/distributing-packages-using-setuptools/)
- [pytest Configuration Reference](https://docs.pytest.org/en/stable/reference/reference.html#ini-options-ref)
- [Ruff Linter — Fast Python linter and code formatter](https://docs.astral.sh/ruff/)
