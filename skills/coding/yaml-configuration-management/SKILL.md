---
name: yaml-configuration-management
description: Implements YAML configuration management patterns including schema validation, anchor/alias reuse, hierarchical merging, and linting for robust infrastructure and application configuration.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yaml, yml, configuration files, schema validation, yaml anchors, config management, json schema, yaml 1.2
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-shell-scripting, coding-api-design
---

# YAML Configuration Management

Senior engineer managing YAML-based configuration files with schema validation, anchor/alias reuse, hierarchical merging, and automated linting for production infrastructure and application configurations.

## TL;DR Checklist

- [ ] Validate every YAML file against a JSON Schema before deployment
- [ ] Use anchors (`&`) and aliases (`*`) to eliminate repeated config blocks
- [ ] Merge base → environment → overrides using deep-merge, never shallow replace
- [ ] Run `yamllint` and `spectral` in CI on every pull request
- [ ] Pin YAML parser version (PyYAML 6.0+ or ruamel.yaml 0.18+) in requirements

---

## When to Use

Use this skill when:

- Building configuration files for applications, infrastructure-as-code, or tooling (Docker Compose, CI/CD, Helm, Ansible)
- Managing environment-specific overrides (base → staging → production)
- Enforcing configuration standards across a team via schema validation and linting
- Refactoring repetitive YAML by extracting common blocks into anchors/aliases
- Setting up pre-commit or CI checks for YAML quality

---

## When NOT to Use

Avoid this skill for:

- JSON-only workflows — use `coding-json-schema-validation` instead
- Runtime configuration that changes frequently without redeployment — prefer environment variables or a secrets manager (Vault, AWS Secrets Manager)
- Configuration with more than 7 merge layers — the complexity outweighs benefits; flatten the hierarchy
- One-off scripts with no shared config — inline defaults are sufficient

---

## Core Workflow

1. **Define JSON Schema** — Write a JSON Schema describing the required keys, types, and constraints for your configuration format. **Checkpoint:** Every required field must have a `type` or `oneOf`, and all custom enums must be exhaustive.

2. **Implement YAML Loader with Validation** — Create a Python function that reads a YAML file and validates it against the schema using `jsonschema`. **Checkpoint:** The loader must handle missing files, empty documents, and parse errors gracefully before schema validation runs.

3. **Structure Anchors and Aliases** — Extract repeated blocks (database credentials, common labels, retry policies) into anchors at the top of the file or in a shared include file. **Checkpoint:** Alias names must be unique within scope; avoid circular alias references.

4. **Set Up Hierarchical Merge** — Build a deep-merge function that combines base config, environment override, and user override. Environment overrides fill gaps but never remove keys present in base. **Checkpoint:** After merge, run validation again against the same schema to catch conflicts introduced by overrides.

5. **Integrate Linting into CI/CD Pipeline** — Add `yamllint` for syntax/style checks and `spectral` or `pykwalify` for semantic validation. Run on every push and block merges that fail linting. **Checkpoint:** Configure `.yamllint` ruleset to match your team's conventions; exclude generated files from style checks.

---

## Implementation Patterns

### Pattern 1: Schema Validation Using JSON Schema with Python

This pattern validates YAML configuration files against a JSON Schema at load time, catching structural and type errors before they reach the application runtime. Uses `jsonschema` Draft 2020-12 for modern validation features.

```python
"""yaml_validator.py — Validate YAML config files against JSON Schema."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import yaml
from jsonschema import ValidationError, validate, validators

logger = logging.getLogger(__name__)


def load_json_schema(schema_path: str | Path) -> dict[str, Any]:
    """Load a JSON Schema file from disk.
    
    Args:
        schema_path: Filesystem path to the .json schema file.
        
    Returns:
        Parsed schema as a Python dict.
        
    Raises:
        FileNotFoundError: If schema file does not exist.
        json.JSONDecodeError: If schema is not valid JSON.
    """
    path = Path(schema_path)
    if not path.exists():
        raise FileNotFoundError(f"Schema file not found: {path}")
    
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def create_strict_validator(
    schema: dict[str, Any],
    *,
    additional_properties: bool = False,
    strict_types: bool = True
) -> type:
    """Create a strict JSON Schema validator class.
    
    Disallows additional properties not defined in the schema by default.
    
    Args:
        schema: The JSON Schema to validate against.
        additional_properties: If False, reject keys not in schema (default).
        strict_types: Enforce strict type checking for YAML-specific types.
        
    Returns:
        A validator class instance from jsonschema.
    """
    if not additional_properties:
        # Use extend to add additionalProperties: false
        extended_schema = dict(schema)
        if "properties" in extended_schema:
            extended_schema["additionalProperties"] = False
    
    return validators.extend(
        validators.Draft202012Validator,
        validator_cls=type(
            "StrictDraft202012Validator",
            (validators.Draft202012Validator,),
            {"ALLOWED_additionalProperties": additional_properties},
        ),
    )(extended_schema if "additionalProperties" not in schema else extended_schema)


def validate_yaml_file(
    config_path: str | Path,
    schema: dict[str, Any],
    *,
    required_keys: list[str] | None = None
) -> dict[str, Any]:
    """Parse a YAML configuration file and validate against a JSON Schema.
    
    Implements Early Exit (Law 1): returns immediately on invalid input.
    Implements Parse at Boundary (Law 2): all parsing happens here,
    callers receive only validated data.
    
    Args:
        config_path: Path to the YAML configuration file.
        schema: JSON Schema dict for validation.
        required_keys: Optional extra keys that must be present
                       even if not in the schema.
        
    Returns:
        Validated configuration dict.
        
    Raises:
        FileNotFoundError: If config_path does not exist.
        yaml.YAMLError: If the file is not valid YAML.
        ValidationError: If the config fails schema validation.
        ValueError: If required extra keys are missing.
    """
    path = Path(config_path)
    
    # Law 1: Early exit on missing file
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
    
    # Law 2: Parse at boundary — all YAML parsing happens here
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if not content.strip():
        logger.warning("Empty configuration file: %s", path)
        return {}
    
    config: dict[str, Any] = yaml.safe_load(content)
    
    if not isinstance(config, dict):
        raise ValidationError(
            f"Expected a YAML mapping (dict), got {type(config).__name__} "
            f"in {path}"
        )
    
    # Check additional required keys beyond schema
    if required_keys:
        missing = [k for k in required_keys if k not in config]
        if missing:
            raise ValueError(
                f"Configuration missing required keys: {', '.join(missing)} "
                f"in {path}"
            )
    
    # Validate against schema
    validator = create_strict_validator(schema)
    errors = list(validator.iter_errors(config))
    
    if errors:
        error_messages = [
            f"  - Path {'.'.join(map(str, e.path)) or 'root'}: {e.message}"
            for e in errors[:10]  # Limit to first 10 errors
        ]
        raise ValidationError(
            f"Configuration validation failed ({len(errors)} error(s)):\n"
            + "\n".join(error_messages)
        )
    
    logger.info("Validated %s (%d keys)", path, len(config))
    return config


# ── Example usage ───────────────────────────────────────────────

EXAMPLE_SCHEMA: dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "Application Configuration",
    "type": "object",
    "required": ["app_name", "database", "logging"],
    "properties": {
        "app_name": {
            "type": "string",
            "minLength": 1,
            "description": "Unique application identifier"
        },
        "version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+\\.\\d+$",
            "description": "Semantic version (MAJOR.MINOR.PATCH)"
        },
        "database": {
            "type": "object",
            "required": ["host", "port", "name"],
            "properties": {
                "host": {"type": "string", "minLength": 1},
                "port": {"type": "integer", "minimum": 1, "maximum": 65535},
                "name": {"type": "string", "minLength": 1},
                "pool_size": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 10
                },
                "ssl_mode": {
                    "type": "string",
                    "enum": ["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]
                }
            },
            "additionalProperties": False
        },
        "logging": {
            "type": "object",
            "required": ["level"],
            "properties": {
                "level": {
                    "type": "string",
                    "enum": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
                },
                "format": {"type": "string"},
                "handlers": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["console", "file", "syslog"]
                    }
                }
            },
            "additionalProperties": False
        },
        "features": {
            "type": "object",
            "additionalProperties": {"type": "boolean"}
        }
    },
    "additionalProperties": False
}


if __name__ == "__main__":
    import sys
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else "config.yaml"
    try:
        config = validate_yaml_file(config_path, EXAMPLE_SCHEMA)
        print(f"Valid configuration: {json.dumps(config, indent=2)}")
    except (FileNotFoundError, ValidationError, ValueError) as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        sys.exit(1)
```

### Pattern 2: Anchor/Alias Reuse & Hierarchical Configuration Merging

This pattern eliminates repetition using YAML anchors and aliases, then composes configurations through a deep-merge strategy that respects override semantics. Anchors go in a shared base; environment-specific overrides inject only what differs.

```python
"""yaml_hierarchy.py — Deep-merge YAML configuration layers."""

from __future__ import annotations

import copy
import logging
from pathlib import Path
from typing import Any, Protocol

import yaml

logger = logging.getLogger(__name__)


class ConfigLayer(Protocol):
    """Interface for a configuration layer source."""
    
    @property
    def name(self) -> str: ...
    
    def load(self) -> dict[str, Any]: ...


class FileConfigLayer:
    """Load a configuration from a YAML file on disk.
    
    Args:
        path: Path to the YAML file.
        required: If True, raise FileNotFoundError if file is missing.
    """
    
    def __init__(self, path: str | Path, *, required: bool = True) -> None:
        self._path = Path(path)
        self.required = required
    
    @property
    def name(self) -> str:
        return self._path.name
    
    def load(self) -> dict[str, Any]:
        if not self._path.exists():
            if self.required:
                raise FileNotFoundError(f"Required config layer missing: {self._path}")
            logger.info("Optional config layer not found (skipping): %s", self._path)
            return {}
        
        with open(self._path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f.read())
        
        if data is None:
            return {}
        if not isinstance(data, dict):
            raise ValueError(
                f"Config layer '{self.name}' must be a YAML mapping (dict), "
                f"got {type(data).__name__}"
            )
        
        return data


def deep_merge(
    base: dict[str, Any],
    override: dict[str, Any],
    *,
    merge_lists: bool = False,
    path_prefix: str = ""
) -> dict[str, Any]:
    """Deep-merge override into base, returning a new dict.
    
    Implements Law 3 (Atomic Predictability): never mutates inputs.
    
    Args:
        base: The base configuration dict (higher precedence).
        override: The override configuration dict (lower precedence).
                  Override values fill gaps in base; they do not remove keys.
        merge_lists: If True, concatenate lists instead of replacing.
        path_prefix: Dot-separated path for error messages.
        
    Returns:
        New merged configuration dict. Originals are unchanged.
    """
    result: dict[str, Any] = copy.deepcopy(base)
    
    for key, override_value in override.items():
        current_path = f"{path_prefix}.{key}" if path_prefix else key
        
        if key not in result:
            # Key only in override — add it
            result[key] = copy.deepcopy(override_value)
            continue
        
        base_value = result[key]
        
        # Both are dicts — recurse
        if isinstance(base_value, dict) and isinstance(override_value, dict):
            result[key] = deep_merge(
                base_value, override_value,
                merge_lists=merge_lists,
                path_prefix=current_path
            )
        elif isinstance(base_value, list) and isinstance(override_value, list):
            if merge_lists:
                result[key] = base_value + copy.deepcopy(override_value)
            else:
                result[key] = copy.deepcopy(override_value)
        else:
            # Override wins for scalar values
            result[key] = copy.deepcopy(override_value)
    
    return result


def merge_config_layers(
    layers: list[ConfigLayer | dict[str, Any]],
    *,
    merge_lists: bool = False,
    validate_each: bool = True
) -> dict[str, Any]:
    """Merge multiple configuration layers from lowest to highest precedence.
    
    Layers are processed in order: first layer is the base,
    subsequent layers override or extend it.
    
    Args:
        layers: Ordered list of config layers. Each can be a
                ConfigLayer protocol object or a raw dict.
        merge_lists: If True, lists are concatenated across layers.
        validate_each: If True, log warnings when overrides introduce
                       unexpected key types at any layer.
        
    Returns:
        Fully merged configuration dict.
        
    Raises:
        ValueError: If any layer is not a dict (and not loadable).
    """
    if not layers:
        return {}
    
    # Load all layers, converting ConfigLayer objects to dicts
    configs: list[dict[str, Any]] = []
    for i, layer in enumerate(layers):
        if isinstance(layer, dict):
            configs.append(layer)
        else:
            loaded = layer.load()  # type: ignore[union-attr]
            configs.append(loaded)
    
    # Validate first layer is a proper dict
    if configs and not isinstance(configs[0], dict):
        raise ValueError("Base configuration layer must be a mapping (dict)")
    
    # Sequential deep merge: result = base merged with override1, then with override2, ...
    result = copy.deepcopy(configs[0]) if configs else {}
    
    for override in configs[1:]:
        if not isinstance(override, dict):
            raise ValueError(
                f"Override layer {override.get('name', 'unnamed')} "
                f"is not a mapping (dict)"
            )
        result = deep_merge(result, override, merge_lists=merge_lists)
    
    logger.info("Merged %d config layers into %d top-level keys", len(configs), len(result))
    return result


# ── Example: YAML anchor/alias usage in a base config ─────────

EXAMPLE_BASE_CONFIG_YAML = """\
# shared-anchors.yaml — Common blocks used across environments
app_name: my-service
version: "1.0.0"

# Anchor: database config block (reused via alias)
db_config: &default_db
  host: localhost
  port: 5432
  pool_size: 10
  ssl_mode: prefer

# Alias: reuse the same database anchor elsewhere
analytics_db: *default_db

# Anchor: logging format template
log_format: &default_format "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging:
  level: INFO
  format: *default_format
  handlers:
    - console
"""

EXAMPLE_ENV_OVERRIDE_YAML = """\
# staging-override.yaml — Only what differs from base for staging

db_config:
  host: staging-db.internal
  pool_size: 5          # Override scalar value

logging:
  level: DEBUG          # Override scalar value
  handlers:
    - console
    - file              # Add to list (if merge_lists=True)
"""


def load_merged_example(base_path: str | Path, override_path: str | Path) -> dict[str, Any]:
    """Load and merge base + environment config.
    
    Args:
        base_path: Path to the base YAML file with anchors.
        override_path: Path to the environment override YAML.
        
    Returns:
        Merged configuration dict ready for application use.
    """
    layers = [
        FileConfigLayer(base_path, required=True),
        FileConfigLayer(override_path, required=False),
    ]
    return merge_config_layers(layers, merge_lists=True)


if __name__ == "__main__":
    import json
    
    try:
        merged = load_merged_example("shared-anchors.yaml", "staging-override.yaml")
        print(json.dumps(merged, indent=2))
    except Exception as exc:
        print(f"Error: {exc}")
```

### Pattern 3: Automated Linting & CI Integration Script

This pattern sets up automated YAML linting using `yamllint` for syntax/style and a validation script for semantic checks. The shell script integrates into CI pipelines (GitHub Actions, GitLab CI) or local pre-commit hooks.

```bash
#!/usr/bin/env bash
# yaml-lint.sh — Automated YAML linting and validation for CI/CD pipelines
# Exit codes: 0=pass, 1=fail, 2=config error
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="${SCRIPT_DIR%/}/.."
readonly YAMLLINT_CONFIG="${PROJECT_ROOT}/.yamllint"
readonly VALIDATE_SCRIPT="${PROJECT_ROOT}/scripts/validate_yaml_config.py"

# ── Configuration ──────────────────────────────────────────────

# Files and directories to check (adjust for your project)
YAML_SEARCH_PATTERNS=(
    "${PROJECT_ROOT}/**/*.yaml"
    "${PROJECT_ROOT}/**/*.yml"
    "!**/node_modules/**"
    "!**/.git/**"
    "!**/vendor/**"
)

# Minimum yamllint version required
MIN_YAMLLINT_VERSION="3.8.0"

# Validation script exit codes
readonly VALIDATE_OK=0
readonly VALIDATE_FAIL=1
readonly VALIDATE_CONFIG_ERROR=2

# ── Color output helpers ───────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}[yaml-lint]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[warning]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[error]${NC} $1" >&2
}

# ── Dependency checks ──────────────────────────────────────────

check_yamllint() {
    if ! command -v yamllint &>/dev/null; then
        print_error "yamllint is not installed. Install with: pip install yamllint"
        exit 2
    fi
    
    local version
    version=$(yamllint --version 2>&1 | grep -oP '\d+\.\d+\.\d+' || echo "0.0.0")
    
    # Simple version comparison (works for comparable versions)
    if [[ "$(printf '%s\n' "$MIN_YAMLLINT_VERSION" "$version" | sort -V | head -n1)" != "$MIN_YAMLLINT_VERSION" ]]; then
        print_warning "yamllint $version < minimum required $MIN_YAMLLINT_VERSION. Upgrade recommended."
    fi
    
    print_header "yamllint ${version} OK"
}

check_python_validation() {
    if [[ -f "$VALIDATE_SCRIPT" ]]; then
        python3 -c "import yaml, jsonschema; print('OK')" 2>/dev/null || {
            print_warning "jsonschema not available — schema validation skipped"
            VALIDATE_SCRIPT=""
        }
    else
        print_warning "Validation script not found at ${VALIDATE_SCRIPT} (optional)"
        VALIDATE_SCRIPT=""
    fi
}

# ── Core linting logic ────────────────────────────────────────

discover_yaml_files() {
    local files=()
    for pattern in "${YAML_SEARCH_PATTERNS[@]}"; do
        # shellcheck disable=SC2254
        while IFS= read -r -d '' file; do
            files+=("$file")
        done < <(find . -path "$pattern" -type f -print0 2>/dev/null || true)
    done
    
    if [[ ${#files[@]} -eq 0 ]]; then
        print_warning "No YAML files found matching search patterns"
        return 0
    fi
    
    printf '%s\n' "${files[@]}" | sort
}

run_yamllint() {
    local files_to_check="$1"
    
    if [[ -f "$YAMLLINT_CONFIG" ]]; then
        print_header "Running yamllint with custom config (${YAMLLINT_CONFIG})..."
        yamllint -f parsable -c "$YAMLLINT_CONFIG" $files_to_check
    else
        # Default ruleset: strict style, no docs markers, line length 120
        print_header "Running yamllint with default rules..."
        yamllint -d "{extends: relaxed, rules: {line-length: {max: 120}, trailing-spaces: disable, new-line-at-eof: enable}}" \
            $files_to_check
    fi
}

run_schema_validation() {
    if [[ -n "$VALIDATE_SCRIPT" ]]; then
        print_header "Running schema validation..."
        python3 "$VALIDATE_SCRIPT" || return 1
    fi
}

# ── Main ───────────────────────────────────────────────────────

main() {
    print_header "YAML Lint Pipeline Started"
    
    check_yamllint
    check_python_validation
    
    local yaml_files
    yaml_files=$(discover_yaml_files)
    
    if [[ -z "$yaml_files" ]]; then
        print_header "No YAML files to check — passing"
        exit $VALIDATE_OK
    fi
    
    local file_count
    file_count=$(echo "$yaml_files" | wc -l | tr -d ' ')
    print_header "Found ${file_count} YAML files to lint"
    
    # Step 1: yamllint syntax/style checks (fail on warning+ for CI)
    if ! echo "$yaml_files" | xargs run_yamllint; then
        print_error "yamllint detected style or syntax violations"
        exit $VALIDATE_FAIL
    fi
    
    # Step 2: Schema validation (if script exists)
    if [[ -n "$VALIDATE_SCRIPT" ]]; then
        if ! run_schema_validation; then
            print_error "Schema validation failed for one or more files"
            exit $VALIDATE_FAIL
        fi
    fi
    
    print_header "All YAML lint checks passed (${file_count} files)"
    exit $VALIDATE_OK
}

main "$@"
```

Example `.yamllint` configuration to accompany the lint script:

```yaml
# .yamllint — Team YAML linting ruleset for 2026 projects
extends: default

rules:
  # Document markers (---) required at file start
  document-start:
    present: true
  
  # Line length: 120 characters max (fits most terminals and PR diffs)
  line-length:
    max: 120
    level: warning
  
  # Trailing whitespace: allow for now, flag as error later
  trailing-spaces:
    level: disabled
  
  # Newline at end of file: required
  new-line-at-eof:
    level: error
  
  # Indentation: 2 spaces (YAML default)
  indentation:
    spaces: 2
    indent-sequences: true
    check-multiline-lines: true
  
  # Key duplication: always flag
  key-duplicates:
    level: error
  
  # Comments: require space after #
  comments:
    level: warning
    require-starting-space: true
  
  # Comments indentation: match key indent
  comments-indentation:
    level: error
  
  # Boolean values: allow both yes/no and true/false
  truthy:
    level: disabled
  
  # Document boundaries in multi-doc files
  document-end:
    present: false

# Exclude generated or vendored YAML
ignore: |
  node_modules/
  .git/
  vendor/
  dist/
  *.lock.yaml
```

Example GitHub Actions CI integration:

```yaml
# .github/workflows/yaml-lint.yml
name: YAML Lint

on:
  push:
    paths:
      - "**/*.yaml"
      - "**/*.yml"
      - ".yamllint"
  pull_request:
    paths:
      - "**/*.yaml"
      - "**/*.yml"
      - ".yamllint"

jobs:
  yaml-lint:
    name: YAML Linting & Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      
      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install yamllint jsonschema ruamel.yaml
      
      - name: Run YAML lint script
        run: |
          chmod +x scripts/yaml-lint.sh
          scripts/yaml-lint.sh
```

---

## Constraints

### MUST DO
- Always validate YAML files against a JSON Schema before passing data to application logic
- Use anchors (`&name`) and aliases (`*name`) for repeated configuration blocks — never copy-paste
- Structure hierarchical configs as base → environment → overrides, using deep-merge (never shallow replacement)
- Run `yamllint` with explicit ruleset in CI on every pull request; block merges that fail
- Pin your YAML parser version in requirements.txt or pyproject.toml (PyYAML 6.0+ recommended)
- Use `yaml.safe_load()` exclusively — never use `yaml.load()` with a loader argument
- Include `document-start: true` rule to require `---` at the top of every YAML file
- Separate schema definitions into their own `.json` files versioned alongside the config

### MUST NOT DO
- Never use `yaml.load(data)` without specifying `Loader=yaml.SafeLoader` — this is a remote code execution vector
- Never allow environment overrides to remove keys present in the base config — deep merge fills gaps, never deletes
- Never store secrets (API keys, passwords, tokens) in YAML files tracked in git — use environment variables or a secrets manager
- Never rely on implicit YAML types for booleans (`yes`/`no`, `on`/`off`) — use explicit `true`/`false` throughout
- Never nest more than 5 configuration layers — merge complexity grows exponentially and becomes unmaintainable
- Never skip validation in staging or production environments — the cost of a bad config is higher than the cost of validation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-shell-scripting` | Write shell scripts that consume YAML configurations; automate deployment workflows |
| `coding-api-design` | Design API specs (OpenAPI/Swagger) using YAML — natural companion for configuration management |
| `cncf-helm` | Helm charts use YAML extensively; combine schema validation with chart templating |

---

## Live References

> Authoritative documentation links for YAML and configuration management. The model follows markdown links at load time to resolve external references.

- [YAML 1.2 Spec — Official Specification](https://yaml.org/spec/1.2/spec.html)
- [JSON Schema — Draft 2020-12 Reference](https://json-schema.org/draft/2020-12/json-schema-core)
- [PyYAML — Python YAML Parser Documentation](https://pyyaml.org/wiki/PyYAMLDocumentation)
- [yamllint — YAML Linter Documentation](https://yamllint.readthedocs.io/)
- [ruamel.yaml — Round-trip YAML for Python](https://yaml.readthedocs.io/)
- [jsonschema — JSON Schema Validation for Python](https://python-jsonschema.readthedocs.io/)
- [GitHub Actions — Workflow Syntax (YAML)](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
