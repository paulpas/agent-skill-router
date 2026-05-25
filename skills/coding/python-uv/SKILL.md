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

---

## When to Use

Use this skill when:

- Setting up a new Python project and wanting maximum dependency resolution speed (10-100x faster than pip/pip-tools/poetry)
- Managing dependency trees across multiple environments (local dev, CI/CD, production) with deterministic lockfiles
- Configuring uv workspaces for monorepo or multi-package Python projects
- Optimizing CI/CD pipelines where dependency installation time is a bottleneck
- Migrating from pip/requirements.txt, pip-tools, Poetry, or pdm to a faster alternative
- Integrating Python tooling (ruff, mypy, pytest) as uv-managed tools rather than project dependencies

## When NOT to Use

Avoid this skill for:

- Projects that already have an established Poetry or pdm workflow with no speed pressure — the migration effort may not justify the benefit
- Purely system-level Python management (e.g., OS package managers like apt/yum) — uv manages user-space environments only
- Non-standard build backends requiring custom hooks — uv uses standard PEP 517/621 tooling and may not support exotic build configurations

---

## Core Workflow

### Phase 1: Project Initialization

1. **Scaffold a new project** — Run `uv init <project-name>` to create a fully configured project with pyproject.toml, src layout, and a uv.lock file pre-generated.
   ```bash
   # Create a new project (auto-generates pyproject.toml + src/ layout)
   uv init my-service
   cd my-service

   # Project structure:
   # my-service/
   # ├── README.md
   # ├── pyproject.toml
   # └── src/my_service/__init__.py

   # For a script-style project (no package, just executable):
   uv init --script my-script.py
   ```

2. **Verify the generated pyproject.toml** — The scaffold creates a minimal but complete PEP 621 compliant configuration:
   ```toml
   [project]
   name = "my-service"
   version = "0.1.0"
   description = "Add your description here"
   readme = "README.md"
   requires-python = ">=3.12"
   dependencies = []

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"
   ```

### Phase 2: Dependency Management

3. **Add production and development dependencies** — Use `uv add` for all dependency operations. Dependencies are resolved atomically against PyPI, written to pyproject.toml, and the lockfile is updated in a single pass.
   ```bash
   # Add production dependency (latest compatible version)
   uv add httpx

   # Pin to specific version range
   uv add "pydantic>=2.5,<3"

   # Add development-only dependency
   uv add --dev pytest ruff mypy

   # Add with extras
   uv add "psycopg2-binary"

   # Add from git repository
   uv add "my-lib @ git+https://github.com/user/my-lib.git@main"

   # Add local path dependency (for workspace members)
   uv add ../shared-utils

   # Add optional/extra dependency
   uv add --optional async "httpx[socks]"
   ```

4. **Configure the complete project manifest** — Structure pyproject.toml with production dependencies, dev groups, optional features, and tool configurations:
   ```toml
   [project]
   name = "api-service"
   version = "1.0.0"
   description = "High-performance async API service"
   readme = "README.md"
   requires-python = ">=3.12"
   dependencies = [
       "httpx>=0.27",
       "pydantic>=2.5,<3",
       "sqlalchemy>=2.0,<3",
       "structlog>=24.1",
       "prometheus-client>=0.20",
   ]

   [project.optional-dependencies]
   postgres = ["asyncpg>=0.29"]
   cache = ["redis>=5.0"]

   [project.scripts]
   api-server = "api_service.cli:main"
   migrate-db = "api_service.db:migrate"

   [tool.uv]
   dev-dependencies = [
       "pytest>=8.0",
       "pytest-asyncio>=0.23",
       "pytest-cov>=5.0",
       "hypothesis>=6.90",
       "ruff>=0.4",
       "mypy>=1.8",
       "pre-commit>=3.5",
   ]

   [tool.uv.workspace]
   members = ["packages/*"]

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"
   ```

5. **Install/sync all dependencies** — `uv sync` resolves the lockfile and installs all dependencies into the project's virtual environment. This is the primary installation command, replacing pip install entirely.
   ```bash
   # Install ALL dependencies (production + dev) from lockfile
   uv sync

   # Production only (skip dev dependencies)
   uv sync --frozen  # Use exact versions from lockfile, no resolution

   # After adding/updating pyproject.toml without updating lock:
   uv lock              # Resolve and update lockfile
   uv sync              # Install resolved dependencies

   # Update a specific package to its latest version
   uv add --upgrade httpx
   uv add --upgrade-package "pydantic"

   # Remove a dependency entirely
   uv remove structlog
   ```

### Phase 3: Environment and Tool Management

6. **Manage the virtual environment** — uv creates and manages a `.venv` directory automatically. No manual venv creation or activation needed. Use `uv run` to execute any command within the managed environment.
   ```bash
   # Run any command in the project's virtual environment
   uv run pytest tests/ --cov=src --cov-report=term-missing
   uv run ruff check .
   uv run mypy src/api_service/
   uv run api-server --host 0.0.0.0 --port 8000

   # Run Python with the correct interpreter and environment
   uv run python -c "import sys; print(sys.version)"

   # Sync ensures the venv matches pyproject.toml exactly
   uv sync

   # Remove the venv entirely (will be recreated on next sync)
   rm -rf .venv
   uv sync            # Fresh environment from scratch

   # Use a specific Python version (uv installs it automatically if needed)
   uv venv --python 3.12
   uv sync

   # List all installed packages in the current environment
   uv pip list
   ```

7. **Configure uv as a tool manager** — Separate tool installations from project dependencies using `uv tool install`. This keeps your virtual environment lean and allows running tools system-wide:
   ```bash
   # Install tools globally (separate from project dependencies)
   uv tool install ruff
   uv tool install mypy
   uv tool install pytest
   uv tool install pre-commit

   # Run a tool — available in PATH after install
   ruff check .
   mypy src/

   # Manage installed tools
   uv tool list          # Show all installed tools
   uv tool upgrade --all # Upgrade all tools to latest versions

   # Tools can also be run via `uvx` (cross-platform)
   uvx ruff check .
   uvx mypy src/

   # Install a specific version of a tool
   uv tool install pre-commit==3.5.0

   # Create a script that bundles a tool as a dependency
   cat > run-tests <<'EOF'
   #!/usr/bin/env -S uv run --with pytest --with pytest-cov
   pytest tests/ --cov=src
   EOF
   chmod +x run-tests
   ./run-tests           # Automatically installs pytest + pytest-cov into ephemeral venv
   ```

### Phase 4: Workspace (Monorepo) Setup

8. **Configure uv workspaces for multi-package projects** — Define a root pyproject.toml that declares workspace members, each with its own dependencies:
   ```toml
   # Root pyproject.toml
   [project]
   name = "monorepo"
   version = "0.1.0"
   requires-python = ">=3.12"
   dependencies = []

   [tool.uv.workspace]
   members = ["packages/*"]

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"
   ```

   Each workspace member has its own pyproject.toml:
   ```toml
   # packages/core/pyproject.toml
   [project]
   name = "api-core"
   version = "0.1.0"
   requires-python = ">=3.12"
   dependencies = [
       "pydantic>=2.5",
       "structlog>=24.1",
   ]

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"

   # packages/api/pyproject.toml
   [project]
   name = "api-server"
   version = "0.1.0"
   requires-python = ">=3.12"
   dependencies = [
       "httpx>=0.27",
       "sqlalchemy>=2.0",
       { include-group = "core", name = "api-core" },  # workspace reference
   ]

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"

   # packages/cli/pyproject.toml
   [project]
   name = "api-cli"
   version = "0.1.0"
   requires-python = ">=3.12"
   dependencies = [
       { include-group = "core", name = "api-core" },
       { include-group = "api", name = "api-server" },
   ]

   [project.scripts]
   api-cli = "api_cli.cli:main"

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"
   ```

   **Checkpoint:** Run `uv sync` from the workspace root — uv resolves all workspace members, creates a single unified lockfile with no inter-package version conflicts, and installs everything into one virtual environment.

### Phase 5: Build and Distribution

9. **Build distribution packages** — Generate wheel (.whl) and source distribution (sdist) artifacts using standard PEP 517/621 tooling:
   ```bash
   # Build both wheel and sdist into dist/ directory
   uv build

   # Output files:
   # dist/api_service-0.1.0-py3-none-any.whl
   # dist/api_service-0.1.0.tar.gz

   # Build only wheel (faster, preferred for PyPI upload)
   uv build --wheel

   # Verify the distribution before publishing
   twine check dist/*

   # Publish to PyPI
   uv publish --token $PYPI_TOKEN

   # Or use twine directly (works with any build backend)
   poetry build && twine check dist/* && twine upload dist/*
   ```

10. **Integrate into CI/CD pipelines** — Optimize for speed by using frozen lockfile installs and uv's cache:
    ```yaml
    # .github/workflows/ci.yml
    name: CI
    on: [push, pull_request]

    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4

          - name: Install uv
            uses: astral-sh/setup-uv@v3
            with:
              python-version: "3.12"

          # Fast dependency resolution from cached lockfile
          - name: Sync dependencies
            run: uv sync --frozen

          # Run tests with correct environment
          - name: Run tests
            run: uv run pytest tests/ --cov=src --cov-report=xml

          - name: Lint
            run: uv run ruff check .

          - name: Type check
            run: uv run mypy src/
    ```

---

## Implementation Patterns

### Pattern 1: Complete pyproject.toml for a Production Microservice

```toml
[project]
name = "data-pipeline"
version = "2.0.0"
description = "High-throughput async data processing pipeline with configurable connectors"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.28,<1.0",
    "pydantic>=2.10,<3",
    "structlog>=24.3",
    "click>=8.1",
    "pyyaml>=6.0",
]

[project.optional-dependencies]
s3 = ["boto3>=1.35"]
redis = ["redis>=5.0,<6"]
postgres = ["asyncpg>=0.30"]

[project.scripts]
pipeline = "data_pipeline.cli:main"
migrate = "data_pipeline.db:migrate"

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "pytest-cov>=5.0",
    "hypothesis>=6.110",
    "ruff>=0.8",
    "mypy>=1.11",
    "pre-commit>=4.0",
]

[tool.uv.sources]
# Override a dependency to use a local path (for development)
pydantic = { path = "../pydantic", editable = true }

# Use a specific index URL for private packages
boto3 = { index = "private-pypi" }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### Pattern 2: Dependency Resolution — BAD vs. GOOD Version Constraints

```toml
# ❌ BAD — Overly loose constraints cause non-deterministic builds across environments
[project]
dependencies = [
    "requests",              # No version pin at all!
    "httpx>=0.20",           # Too wide a range — may pull breaking changes in 0.x
    "pydantic==1.0.0",       # Exact pin without upper bound — blocks any update ever
]

# ❌ BAD — Using pip-style version specifiers (no uv awareness of resolution strategy)
dependencies = [
    "httpx~=0.27",           # PEP 440 compatible release is fine, but ~ syntax can be confusing
    "pydantic^2.5",          # ^ syntax is not valid in PEP 440 — will fail resolution!
]

# ✅ GOOD — PEP 440 compliant constraints with sensible version ranges
[project]
dependencies = [
    "httpx>=0.28,<1.0",     # Allow minor/patch updates within major version
    "pydantic>=2.10,<3",     # Major version boundary for API stability
    "structlog>=24.1.0",     # Specific minimum with no upper bound (safe for well-maintained libs)
]

# ❌ BAD — Conflicting version constraints across the workspace
[project]
name = "service-a"
dependencies = ["httpx>=0.28"]

[project]
name = "service-b"  
dependencies = ["httpx==0.27.0"]  # Hard conflict with service-a!

# ✅ GOOD — Aligned constraints via workspace-level minimum
[project]
name = "service-a"
dependencies = ["httpx>=0.28,<1.0"]

[project]
name = "service-b"
dependencies = ["httpx>=0.28,<1.0"]  # Same constraint — uv resolves to highest compatible
```

### Pattern 3: pip Compatibility Layer (Drop-in Replacement)

uv provides a full `pip install` compatibility interface, making it a drop-in replacement for any script using pip:

```bash
# uv acts as a direct pip replacement — same commands, faster resolution
uv pip install httpx pydantic
uv pip install -r requirements.txt
uv pip freeze > current-deps.txt

# Sync a requirements file exactly (replaces pip-sync from pip-tools)
uv pip sync requirements.txt

# Install from requirements.txt with constraints file
uv pip install -r requirements.txt -c constraints.txt

# Use uv as pip in Docker builds (direct replacement, no venv needed):
# FROM python:3.12-slim
# RUN curl -LsSf https://astral.sh/uv/install.sh | sh
# COPY requirements.txt .
# RUN uv pip install --system -r requirements.txt

# For virtual environments with pip compatibility:
uv venv .venv
source .venv/bin/activate  # Or use `uv run` to skip activation entirely
uv pip install httpx pydantic
```

### Pattern 4: CI/CD Optimization — From 4 Minutes to 30 Seconds

```bash
# ❌ SLOW — Standard pip + requirements.txt flow (typical CI time)
pip install --upgrade pip          # ~5 seconds
pip install -r requirements.txt    # ~2-3 minutes (slow resolution)
pip install pytest ruff mypy       # Additional packages: ~1 minute
pytest tests/                      # Run tests

# ✅ FAST — uv flow (typical CI time)
curl -LsSf https://astral.sh/uv/install.sh | sh  # ~2 seconds (cached by setup-uv action)
uv sync --frozen                                 # ~5-10 seconds (uses pre-cached resolution)
uv run pytest tests/ --cov=src                   # Execute in managed venv

# Even faster: cache the uv cache directory between CI runs
# In GitHub Actions:
# - uses: actions/cache@v4
#   with:
#     path: ~/.cache/uv
#     key: ${{ runner.os }}-uv-${{ hashFiles('uv.lock') }}
```

---

## Constraints

### MUST DO
- Commit `uv.lock` to version control — this is the single source of truth for reproducible builds across all environments and CI runners
- Use `requires-python = ">=X.Y"` to pin the minimum Python version in pyproject.toml (e.g., `">=3.12"`)
- Use PEP 440 version specifiers (`>=`, `<`, `~=`) — never use Poetry's `^` or `~` syntax (those are not valid PEP 440)
- Run `uv sync --frozen` in CI to enforce exact lockfile versions without network resolution
- Use `uv run <command>` for all project commands — never manually activate `.venv` or rely on system Python
- Separate tool installations (`uv tool install`) from project dependencies to keep environments lean
- Validate distributions with `twine check dist/*` before publishing to any registry
- Pin `requires-python` consistently across all workspace member packages

### MUST NOT DO
- Edit `uv.lock` manually — always regenerate with `uv lock`, even after single dependency changes
- Mix `pip install` directly with uv-managed environments — this bypasses the lockfile and corrupts the dependency tree
- Commit pyproject.toml without a matching uv.lock — future builds will be non-deterministic
- Use Poetry's `^` version constraint syntax in pyproject.toml — uv follows PEP 440, not Poetry's resolver
- Run `uv pip install` inside an active virtual environment — use `uv sync` at the project root instead
- Remove uv.lock to "fix" dependency conflicts — adjust version constraints in pyproject.toml and re-resolve with `uv lock`

---

## Output Template

When configuring or auditing a uv-managed project, produce:

1. **Dependency Audit** — List all production and dev dependencies with resolved versions from uv.lock, flagging any overly loose version constraints or potential conflicts
2. **pyproject.toml Review** — Validate structure: presence of `[project]`, `requires-python`, dependency lists, tool configurations, build-system specification
3. **Lockfile Consistency Check** — Verify uv.lock matches pyproject.toml; report if manual edits may have drifted the lockfile from the manifest
4. **Workspace Analysis** — For monorepo setups: confirm all workspace members declared in `[tool.uv.workspace]`, cross-references use proper dependency specifications, no inter-package conflicts
5. **CI/CD Pipeline Audit** — Confirm `uv sync --frozen` is used, cache configuration for `.cache/uv` exists, and tool installations are separated from project dependencies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `poetry` | Poetry alternative — different resolver and plugin ecosystem but similar workflow patterns |
| `package-ecosystem-navigator` | General package manager ecosystem comparison (npm, pypi, cargo, pip-tools) |
| `dependency-supply-chain-security` | Dependency security auditing, CVE scanning, and supply chain protections |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [uv Documentation](https://docs.astral.sh/uv/)
- [uv Project Management Guide](https://docs.astral.sh/uv/guides/projects/)
- [uv Workspaces (Monorepo Support)](https://docs.astral.sh/uv/workspaces/)
- [uv Tool Management](https://docs.astral.sh/uv/guides/tools/)
- [PEP 621 — Storing Project Metadata in pyproject.toml](https://peps.python.org/pep-0621/)
- [PEP 440 — Version Specification and Comparison](https://peps.python.org/pep-0440/)
- [Twine — PyPI Package Upload Tool](https://twine.readthedocs.io/)
