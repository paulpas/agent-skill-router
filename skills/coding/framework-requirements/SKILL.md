---
name: framework-requirements
description: Configures and scaffolds project frameworks (frontend, backend, full-stack) with dependency resolution, environment validation, and CI/CD boilerplate integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework setup, project scaffolding, dependency configuration, boilerplate generation, environment validation, starter kits, tech stack selection
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: test-driven-development, software-design-principles, design-patterns-and-principles
---

# Project Framework Configurator

Configures and scaffolds project frameworks with dependency resolution, environment validation, and CI/CD boilerplate generation. The model acts as a senior build engineer, producing reproducible project foundations that enforce semantic versioning, secure dependency practices (OWASP auditing), and POSIX-compliant path conventions from the first commit.

## TL;DR Checklist

- [ ] Define language version constraints using semver ranges before generating any code
- [ ] Select framework based on documented requirements, not personal preference
- [ ] Generate lockfiles that pin exact transitive dependency versions
- [ ] Validate runtime environment (OS, interpreter, package manager) before proceeding
- [ ] Scaffold CI/CD pipelines with at least lint, test, and dependency audit steps

---

## When to Use

Use this skill when:

- Bootstrapping a new project from scratch and needing a production-ready scaffold
- Migrating an existing project to a new framework or language version
- Standardizing the starting template across a team or organization
- Setting up CI/CD for a project that lacks automated quality gates
- Resolving dependency conflicts by regenerating the lockfile with resolved versions
- Onboarding a developer who needs a validated, working environment setup

---

## When NOT to Use

Avoid this skill for:

- Modifying a single module within an existing scaffolded project (use modular-design or error-handling instead)
- Designing API contracts or data models — use architectural-patterns or domain-driven-design instead
- Debugging runtime crashes in a running application (use code-validation or debugging skills instead)
- Minor dependency bumps that do not require full environment revalidation

---

## Core Workflow

1. **Requirements Definition** — Gather project requirements: target platform, language version, framework type (frontend, backend, full-stack), deployment model (containerized, serverless, bare metal), and CI/CD expectations. Collect minimum/maximum version constraints for every runtime dependency using semver notation (`^2.0.0`, `~1.4.2`).
   **Checkpoint:** All version constraints must use valid semver ranges. Reject bare pinning (`=3.1.4`) unless a critical CVE fix requires it.

2. **Framework Selection** — Choose the framework based on requirements:
   - Backend: FastAPI (async Python), Express (Node.js), or Actix/Rocket (Rust)
   - Frontend: React/Next.js, Vue/Nuxt, SvelteKit, or Astro for content sites
   - Full-stack: Next.js, Remix, SvelteKit, or Nuxt for SSR-capable apps
   **Checkpoint:** Confirm the selected framework is maintained (last release within 12 months) and has active community support.

3. **Scaffolding** — Generate the project directory structure following established conventions. Use POSIX-compliant paths (`/src`, `/tests`, `/config`, `/docs`). Create a root `package.json` (Node), `pyproject.toml` (Python), or `Cargo.toml` (Rust) as the primary manifest. Include a `.gitignore` appropriate for the stack.
   **Checkpoint:** Verify no generated paths violate FHS conventions and that sensitive files (`.env`, `*.key`, `node_modules/`) are git-ignored.

4. **Dependency Resolution & Lockfile** — Resolve all dependencies to exact versions and write lockfiles (`package-lock.json`, `poetry.lock`, `Cargo.lock`). Run a dependency audit before committing:
   - Node: `npm audit --audit-level=moderate`
   - Python: `pip-audit --require-hashes` or `safety check`
   - Rust: `cargo audit` (via cargo-audit)
   **Checkpoint:** No vulnerabilities at `high` severity may block commit. Medium and low must be documented with mitigation notes in `SECURITY.md`.

5. **Environment Validation** — Produce a shell script that validates the developer's runtime environment against defined constraints (interpreter version, package manager availability, required system libraries). The script must exit non-zero if any requirement is unmet.
   **Checkpoint:** Every validation check must produce a descriptive error message and the script must run cleanly on both Linux and macOS.

6. **CI/CD Boilerplate Generation** — Create CI configuration files for at least one pipeline (GitHub Actions, GitLab CI, or CircleCI). The pipeline must include: dependency install, lint/type-check, test execution, and a dependency audit stage. For containerized projects, add a Docker build stage.
   **Checkpoint:** Every CI job must have explicit `runs-on` targets and pinned action versions (e.g., `actions/setup-node@v4`). Never use floating references like `actions/checkout@main`.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Environment Validation Script

A shell script that validates the runtime environment before any framework commands run. Uses `set -euo pipefail` for strict error handling, checks interpreter versions against semver constraints, and produces color-coded pass/fail output.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
readonly MIN_NODE_VERSION="20.0.0"
readonly MIN_PYTHON_VERSION="3.11.0"
readonly REQUIRED_TOOLS=("node" "npm" "git")

# ── Helpers ────────────────────────────────────────────────────
pass()   { printf "\e[32m✓\e[0m  %s\n" "$*"; }
fail()   { printf "\e[31m✗\e[0m  %s\n" "$*" >&2; ERRORS=$((ERRORS + 1)); }
info()   { printf "       %s\n" "$*"; }

ERRORS=0

# ── Version comparison (semver-aware) ─────────────────────────
version_gte() {
    # Returns 0 if $1 >= $2 using semver semantics
    local -a v1=("${1//./ }") v2=("${2//./ }")
    for ((i = 0; i < 3; i++)); do
        local a=${v1[i]:-0} b=${v2[i]:-0}
        if ((a > b)); then return 0; fi
        if ((a < b)); then return 1; fi
    done
    return 0  # equal => gte
}

# ── Validate required tools ───────────────────────────────────
for tool in "${REQUIRED_TOOLS[@]}"; do
    if command -v "$tool" &>/dev/null; then
        pass "Found $tool ($(command -v "$tool"))"
    else
        fail "Missing required tool: $tool"
    fi
done

# ── Validate Node.js version ─────────────────────────────────
if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/^v//')
    if version_gte "$NODE_VER" "$MIN_NODE_VERSION"; then
        pass "Node.js $NODE_VER >= $MIN_NODE_VERSION"
    else
        fail "Node.js $NODE_VER < minimum $MIN_NODE_VERSION"
    fi
fi

# ── Validate Python version (if pyproject.toml exists) ───────
if [[ -f "pyproject.toml" ]]; then
    if command -v python3 &>/dev/null; then
        PY_VER=$(python3 --version | awk '{print $2}')
        if version_gte "$PY_VER" "$MIN_PYTHON_VERSION"; then
            pass "Python $PY_VER >= $MIN_PYTHON_VERSION"
        else
            fail "Python $PY_VER < minimum $MIN_PYTHON_VERSION"
        fi
    fi
fi

# ── Summary ───────────────────────────────────────────────────
if ((ERRORS > 0)); then
    printf "\n\e[31mEnvironment validation failed: %d error(s)\e[0m\n" "$ERRORS" >&2
    exit 1
fi

pass "All environment checks passed"
```

### Pattern 2: Dependency Resolution & Lockfile Strategy (BAD vs. GOOD)

Proper dependency resolution produces deterministic builds through lockfiles and pinned versions. The following example demonstrates the contrast between fragile ad-hoc management and robust semver-based resolution with auditing.

```python
# ── ❌ BAD: No lockfile, no version pinning, no audit ─────────

import subprocess

def install_deps(project_dir: str) -> None:
    """Install dependencies without any version control or audit."""
    os.chdir(project_dir)
    # Floating dependency versions — non-deterministic builds
    subprocess.check_call(["npm", "install"])  # uses ^1.0.0 from package.json
    subprocess.check_call(["pip", "install", "-r", "requirements.txt"])
    print("Dependencies installed")


# ── ✅ GOOD: Lockfile resolution, semver pinning, audit gate ──

import hashlib
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DependencyResult(NamedTuple):
    """Structured result of a dependency resolution pass."""
    success: bool
    packages_resolved: int
    vulnerabilities_found: int
    lockfile_path: str
    errors: list[str]

    @property
    def is_secure(self) -> bool:
        return self.success and self.vulnerabilities_found == 0


def resolve_node_dependencies(project_root: Path, audit_level: str = "moderate") -> DependencyResult:
    """Resolve Node.js dependencies with lockfile and security audit.
    
    Produces deterministic builds by regenerating package-lock.json
    from exact versions and running npm audit.
    
    Args:
        project_root: Path to the project root directory.
        audit_level: Minimum severity to report (low, moderate, serious, high).
    
    Returns:
        DependencyResult with resolution status and vulnerability count.
    
    Raises:
        FileNotFoundError: If package.json does not exist.
        subprocess.CalledProcessError: If npm install fails.
    """
    errors: list[str] = []
    lockfile_path = str(project_root / "package-lock.json")

    if not (project_root / "package.json").exists():
        raise FileNotFoundError(f"package.json not found in {project_root}")

    # Step 1: Resolve and generate lockfile
    try:
        subprocess.run(
            ["npm", "install", "--ignore-scripts", "--no-audit"],
            cwd=str(project_root),
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Lockfile generated: %s", lockfile_path)
    except subprocess.CalledProcessError as exc:
        errors.append(f"npm install failed: {exc.stderr}")
        return DependencyResult(False, 0, 0, lockfile_path, errors)

    # Step 2: Count resolved packages from lockfile
    with open(lockfile_path, "r") as f:
        lock_data = json.load(f)
    packages = set()
    for pkg_name in lock_data.get("packages", {}):
        if pkg_name and not pkg_name.startswith("node_modules/"):
            packages.add(pkg_name)

    # Step 3: Run security audit
    vulnerabilities = 0
    try:
        result = subprocess.run(
            ["npm", "audit", "--audit-level", audit_level, "--json"],
            cwd=str(project_root),
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            vulnerabilities = 0
        elif result.stdout.strip():
            audit_json = json.loads(result.stdout)
            vulnerabilities = audit_json.get("metadata", {}).get("vulnerabilities", {})
            total_vulns = sum(vulnerabilities.values())
            logger.warning("Found %d vulnerabilities at or above %s severity",
                           total_vulns, audit_level)
    except (json.JSONDecodeError, subprocess.TimeoutExpired):
        errors.append("Audit output could not be parsed")

    return DependencyResult(
        success=len(errors) == 0,
        packages_resolved=len(packages),
        vulnerabilities_found=vulnerabilities,
        lockfile_path=lockfile_path,
        errors=errors,
    )


def verify_lockfile_integrity(project_root: Path) -> bool:
    """Verify that the lockfile has not been tampered with by checking its hash.
    
    Compares the current lockfile against a stored expected hash to detect
    unauthorized modifications between commits.
    
    Args:
        project_root: Path to the project root directory.
    
    Returns:
        True if lockfile integrity is confirmed.
    """
    lockfile_path = project_root / "package-lock.json"
    expected_hash_file = project_root / ".lockfile.hash"

    if not lockfile_path.exists():
        return False

    # Compute SHA-256 of current lockfile
    current_hash = hashlib.sha256(lockfile_path.read_bytes()).hexdigest()

    if expected_hash_file.exists():
        expected_hash = expected_hash_file.read_text().strip()
        return current_hash == expected_hash

    # First run — store the hash for future comparisons
    expected_hash_file.write_text(current_hash + "\n")
    logger.info("Lockfile hash stored: %s", current_hash[:16])
    return True
```

### Pattern 3: Framework Configuration Boilerplate

Production framework configuration with typed settings, environment variable loading, and schema validation using Pydantic. This pattern applies to backend services where configuration is a critical operational concern.

```python
"""Framework configuration module with validated settings and environment support."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, ValidationError


# ── Configuration Models ───────────────────────────────────────

class DatabaseConfig(BaseModel):
    """Database connection configuration with schema validation."""

    host: str = Field(default="localhost", description="Database hostname")
    port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port")
    name: str = Field(default="app_db", description="Database name")
    user: str = Field(default="app_user", description="Database user")
    pool_size: int = Field(default=5, ge=1, le=100, description="Connection pool size")
    ssl_mode: str = Field(default="prefer", pattern="^(disable|allow|prefer|require|verify-ca|verify-full)$")


class ServerConfig(BaseModel):
    """HTTP server configuration."""

    host: str = Field(default="0.0.0.0", description="Bind address")
    port: int = Field(default=8000, ge=1024, le=65535, description="Listen port")
    workers: int = Field(default=4, ge=1, le=32, description="Worker process count")
    log_level: str = Field(default="info", pattern="^(debug|info|warning|error|critical)$")


class ProjectConfig(BaseModel):
    """Top-level project configuration with environment-aware loading."""

    app_name: str = Field(default="framework-project")
    version: str = Field(default="0.1.0", description="Semantic version string")
    debug: bool = Field(default=False, description="Enable debug mode")
    database: DatabaseConfig = field(default_factory=DatabaseConfig)  # type: ignore[assignment]
    server: ServerConfig = field(default_factory=ServerConfig)      # type: ignore[assignment]

    class Config:
        """Pydantic config for environment variable loading."""
        env_prefix = "APP_"
        extra = "ignore"


# ── Configuration Loader ───────────────────────────────────────

@dataclass
class ConfigLoader:
    """Loads and validates configuration from multiple sources.
    
    Resolution order (highest to lowest priority):
      1. Explicit kwargs passed to load()
      2. Environment variables (APP_<KEY>)
      3. .env file in project root
      4. Default values defined in models
    """

    project_root: Path
    env_file: Optional[Path] = None

    def load(self, **overrides) -> ProjectConfig:
        """Load and validate the full project configuration.
        
        Args:
            **overrides: Key-value pairs that override all other sources.
        
        Returns:
            Validated ProjectConfig instance.
        
        Raises:
            ValidationError: If any configuration field fails validation.
        """
        # Build environment dict from .env file if present
        env_dict = self._load_env_file()

        # Merge sources: overrides > env vars > defaults
        merged = {**os.environ, **env_dict}
        for key, value in overrides.items():
            upper_key = f"APP_{key.upper()}"
            if isinstance(value, str):
                merged[upper_key] = value
            else:
                # Non-string values bypass env prefix
                pass

        config_data = {k.replace("APP_", "").lower(): v for k, v in merged.items()}
        return ProjectConfig(**config_data)

    def _load_env_file(self) -> dict[str, str]:
        """Read .env file and return key-value pairs."""
        if self.env_file is None:
            self.env_file = self.project_root / ".env"

        if not self.env_file.exists():
            return {}

        env_dict: dict[str, str] = {}
        for line in self.env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            # Strip optional quotes from value
            value = value.strip().strip("\"'")
            env_dict[key.strip()] = value

        return env_dict


# ── Usage Example ──────────────────────────────────────────────

def create_config(project_dir: Optional[str] = None) -> ProjectConfig:
    """Factory function to load configuration from the current directory.
    
    Args:
        project_dir: Override the project root. Defaults to CWD.
    
    Returns:
        Validated and merged ProjectConfig.
    """
    root = Path(project_dir) if project_dir else Path.cwd()
    loader = ConfigLoader(project_root=root)
    return loader.load(debug=os.getenv("DEBUG", "false").lower() == "true")
```

### Pattern 4: GitHub Actions CI/CD Pipeline Boilerplate

Production-grade CI configuration with pinned action versions, parallel stages, and security scanning. This template covers Node.js/Python full-stack projects; adapt as needed for other stacks.

```yaml
# ── .github/workflows/ci.yml ───────────────────────────────────
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"
  PYTHON_VERSION: "3.12"

jobs:
  # ── Stage 1: Dependency & Lint (parallel) ────────────────────
  lint-node:
    name: "Node.js — lint & type-check"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci --ignore-scripts

      - name: Run linting
        run: npm run lint

      - name: TypeScript check
        run: npx tsc --noEmit

  lint-python:
    name: "Python — lint & type-check"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Run linting
        run: ruff check src/ tests/

      - name: Type check
        run: mypy src/ --strict

  # ── Stage 2: Tests (depends on lint) ────────────────────────
  test-node:
    name: "Node.js — tests"
    runs-on: ubuntu-latest
    needs: [lint-node]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          fail_ci_if_error: false

  test-python:
    name: "Python — tests"
    runs-on: ubuntu-latest
    needs: [lint-python]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Run tests
        run: pytest tests/ --cov=src --cov-report=xml -v

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          fail_ci_if_error: false

  # ── Stage 3: Security Audit (runs after tests) ───────────────
  security-audit:
    name: "Security — dependency audit"
    runs-on: ubuntu-latest
    needs: [test-node, test-python]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: npm audit
        run: |
          npm ci --ignore-scripts
          npm audit --audit-level=high

      - name: Python pip-audit
        uses: pypa/gh-action-pip-audit@v1.0.8
        with:
          inputs: requirements.txt
          fail-on-vulnerability: true
```

---

## Constraints

### MUST DO

- Use semver (`^` for compatible, `~` for patch-level) for all version constraints in manifest files — never use floating tags like `latest` or `*`
- Generate deterministic lockfiles by pinning transitive dependencies to exact versions
- Run OWASP-compatible dependency auditing (npm audit, pip-audit, cargo audit) before considering a scaffold production-ready
- Include a `.gitignore` that covers all platform-specific build artifacts (`node_modules/`, `__pycache__/`, `.venv/`, `.DS_Store`) and secrets files
- Reference POSIX path conventions in generated project structures — use `/src`, `/tests`, `/config`, `/docs` at the project root
- Produce environment validation scripts with `set -euo pipefail`, proper quoting of all variable expansions, and descriptive error messages for every check
- Pin all CI action references to specific versions (e.g., `actions/checkout@v4`) — never use branch names or omit versions
- Generate at least one BAD vs. GOOD example pair in the Implementation Patterns section when domain-appropriate
- Validate that generated code includes type hints and docstrings for every public function and class

### MUST NOT DO

- Hardcode absolute file paths or assume a specific operating system without fallbacks — use `pathlib` or cross-platform shell constructs
- Omit lockfiles in generated scaffolds — non-deterministic builds are unacceptable in production workflows
- Use magic numbers for version thresholds, timeout values, or retry counts — define them as named constants at module top level
- Generate CI pipelines that install dependencies without caching — always configure cache keys
- Create scaffold scripts that silently ignore failed checks — every validation failure must exit non-zero with a clear message
- Reference outdated framework versions or projects that have been deprecated (check GitHub release dates)
- Mix dependency managers in a single ecosystem (e.g., npm and yarn in the same Node.js project, pip and poetry for the same Python project)
- Generate configuration files containing real secrets or API keys — use environment variable placeholders instead

---

## Output Template

When applying this skill to scaffold a project, produce:

1. **Requirements Summary** — Language/framework selection rationale with semver constraints for each dependency category (runtime, dev, build tooling)
2. **Directory Structure** — ASCII tree showing the generated project layout with FHS/POSIX-compliant paths
3. **Configuration Files** — Complete manifest files (`package.json`, `pyproject.toml`, `Cargo.toml`) with resolved version ranges
4. **Lockfile Strategy** — Description of which lockfiles are included and how transitive dependencies are pinned, plus audit command
5. **Environment Validation Script** — The complete shell script with version checks for all runtime requirements
6. **CI/CD Pipeline Configuration** — Full pipeline file (YAML) with lint, test, security audit stages and pinned action versions
7. **Security Notes** — List of known vulnerabilities at medium+ severity with mitigation plan, or "No vulnerabilities found" if clean

---

## Related Skills

| Skill                       | Purpose                                                                 |
|-----------------------------|-------------------------------------------------------------------------|
| `test-driven-development`   | Define test infrastructure alongside framework scaffolding for test-first projects |
| `software-design-principles`| Apply SOLID and other design principles when structuring the scaffolded project |
| `design-patterns-and-principles` | Establish architectural patterns and structural conventions within the scaffold |

---

> 📖 skill(local cache): test-driven-development, modular-design, error-handling
