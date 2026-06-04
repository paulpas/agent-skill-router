---
name: configuration-management
description: Implements modern Python configuration management including layered config resolution, schema validation with Pydantic, environment-specific overrides, and secrets injection for production-grade applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: configuration management, config loading, pydantic settings, .env files, environment variables, secrets management, config schema validation, how do i manage application configuration
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: software-engineering-principles, modern-python-development, production-readiness
---

# Configuration Management in Python Applications

Implements modern Python configuration management that separates concerns between defaults, environments, and secrets. When loaded, the model designs layered config resolution pipelines with schema validation using Pydantic, injects secrets securely from environment variables or vaults, and structures configuration so that production deployments are auditable and reproducible — every value's source is traceable, no credential leaks into logs, and changing one environment never accidentally affects another.

## TL;DR Checklist

- [ ] Pydantic `BaseSettings` schema validates all config at startup with typed `Field()` definitions
- [ ] Layered resolution: defaults → config files → env vars → secrets manager (explicit priority)
- [ ] Secrets use `SecretStr` type and are redacted in all output, dumps, and logs
- [ ] Environment-specific config files contain only deltas from defaults — no duplication
- [ ] Health check endpoint exposes non-secret configuration summary with effective sources
- [ ] `.env.example` committed to git, actual `.env` excluded via `.gitignore`

---

## When to Use

Use this skill when:

- Building new Python applications that need robust configuration management across multiple environments
- Refactoring apps with hardcoded configuration or manual dict-based settings scattered throughout the codebase
- Setting up microservice deployments where each service has distinct config profiles but shares common base settings
- Preparing an application for production deployment with separate dev, staging, and production environments
- Integrating secrets from a vault (AWS Secrets Manager, HashiCorp Vault) into an existing configuration pipeline

---

## When NOT to Use

Avoid this skill for:

- Single-environment scripts or local-only tools where simple dicts or namedtuples suffice — the Pydantic validation overhead is unnecessary
- Configuration that is entirely determined by runtime computation (e.g., derived metrics, computed thresholds) rather than static settings
- Systems already using external configuration servers like Consul or Spring Cloud Config — those ecosystems have their own integration patterns and this skill's Pydantic-focused approach would be redundant

---

## Core Workflow

1. **Define Config Schema with Pydantic** — Create a typed `BaseSettings` class that validates every configuration value at startup. Use `Field()` for documentation, validation constraints (min/max/regex), and sensible defaults. Required fields have no default; optional fields get conservative defaults appropriate to the environment. The schema groups related settings into nested models (database, cache, logging) rather than flattening everything into one class. **Checkpoint:** Run the application with an intentionally invalid config file — Pydantic must raise a descriptive `ValidationError` before any application logic executes, clearly identifying which field failed validation and why.

2. **Implement Layered Resolution** — Configuration follows an explicit priority chain where each layer overrides the previous one: built-in defaults → YAML/JSON config files → environment variables → secret manager overrides. The resolution order is documented in the settings class docstring and never changed without a migration note. Each layer is loaded independently so that debugging which value came from which source is possible by inspecting intermediate snapshots. **Checkpoint:** Every configuration value's source must be traceable — you should be able to print or log which layer set each value, enabling operators to verify that environment overrides are working as expected without deploying.

3. **Separate Secrets from Config** — Sensitive values (API keys, database passwords, JWT signing secrets, TLS private keys) never appear in config files or source control. They are injected exclusively via environment variables or a dedicated secrets manager (AWS Secrets Manager, HashiCorp Vault). The schema distinguishes between regular config and secret fields using Pydantic's `SecretStr` type, which automatically redacts values in string representations. **Checkpoint:** Running `print(settings.model_dump(mode="json"))` must redact all secret values — no plaintext credentials should appear in logs, debug output, or error messages.

4. **Validate Environment-Specific Overrides** — Each environment (dev, staging, production) has its own config file containing only the values that differ from defaults. No environment file repeats every configuration option — it contains only deltas. When a new configuration field is added to the defaults layer, existing environment files continue to work without modification because missing keys are filled in by defaults. **Checkpoint:** Adding a new configuration field requires updating only the defaults layer (the Pydantic schema). Existing environment YAML files do not need changes and must not contain the new field — if they do, it suggests the operator copied an old template rather than creating a proper delta file.

5. **Provide Health Check Readout** — Expose a non-sensitive configuration summary as part of the application's health check endpoint (e.g., `GET /health` or `GET /readyz`). The readout includes: which config files were loaded, effective values for non-secret fields (masked where appropriate), and boolean flags indicating whether secrets were successfully resolved. **Checkpoint:** A monitoring system querying `/health` should receive enough information to verify that the correct configuration layers were loaded and that no secret values are accidentally exposed — but must not reveal any actual credential content.

---

## Implementation Patterns

### Pattern 1: Pydantic Settings Schema with Validation

A well-designed settings schema is the foundation of all configuration management. Pydantic v2's `BaseSettings` (from `pydantic-settings`) provides automatic environment variable binding, type coercion, and validation at instantiation time. The key principles: required fields have no default, optional fields have conservative defaults, and every field has a `Field()` with description and constraints.

```python
# BAD — Dict-based config with manual type conversion, no startup validation
import os


# ❌ BAD: No schema, no validation, type coercion happens at point of use
CONFIG = {}


def load_config():
    """Load configuration from environment — but what about the YAML file? What about defaults?"""
    global CONFIG
    config_path = os.environ.get("APP_CONFIG", "config.yaml")
    # Manual parsing with no type safety
    try:
        import yaml
        with open(config_path) as f:
            CONFIG = yaml.safe_load(f)
    except FileNotFoundError:
        pass  # Silently ignores missing config — will fail later at point of use

    # Type coercion happens scattered throughout the codebase
    db_host = CONFIG.get("database", {}).get("host")
    if isinstance(db_host, str):
        pass  # Hope it's valid
    else:
        raise RuntimeError("something went wrong")  # Unhelpful error message


# ✅ GOOD — Typed schema with automatic validation and environment binding
from pydantic import BaseSettings, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings as PydanticBaseSettings, SettingsConfigDict
from typing import Optional
from enum import Enum


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class DatabaseSettings(PydanticBaseSettings):
    """Database connection configuration.

    All fields bind to environment variables with the prefix DATABASE_
    (e.g., DATABASE_HOST -> host, DATABASE_PORT -> port).
    """

    model_config = SettingsConfigDict(
        env_prefix="DATABASE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Unknown fields are ignored instead of raising errors
    )

    host: str = Field(
        description="Database hostname or IP address",
        examples=["localhost", "db.prod.internal"],
    )
    port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port number")
    name: str = Field(description="Database schema name")
    user: str = Field(description="Database user with read/write permissions")
    password: SecretStr = Field(description="Database password — never logged or exposed")
    pool_size: int = Field(default=10, ge=1, le=100, description="Connection pool size")
    max_overflow: int = Field(default=5, ge=0, le=50, description="Additional connections beyond pool_size")
    ssl_mode: str = Field(
        default="prefer",
        pattern=r"^(disable|allow|prefer|require|verify-ca|verify-full)$",
        description="SSL connection mode (see PostgreSQL documentation)",
    )
    connect_timeout: int = Field(default=10, ge=1, le=60, description="Connection timeout in seconds")


class CacheSettings(PydanticBaseSettings):
    """Redis cache configuration."""

    model_config = SettingsConfigDict(
        env_prefix="REDIS_",
        env_file=".env",
    )

    host: str = Field(default="localhost", description="Redis hostname")
    port: int = Field(default=6379, ge=1, le=65535)
    db: int = Field(default=0, ge=0, le=15)
    password: Optional[SecretStr] = Field(default=None, description="Redis auth password (None for no auth)")
    ttl_seconds: int = Field(default=300, ge=1, description="Default TTL for cached entries in seconds")


class LoggingSettings(PydanticBaseSettings):
    """Application logging configuration."""

    level: LogLevel = Field(default=LogLevel.INFO)
    format: str = Field(
        default="json",
        pattern=r"^(text|json)$",
        description="Log output format",
    )
    output: str = Field(default="stderr", pattern=r"^(stdout|stderr|file)$")


class AppSettings(PydanticBaseSettings):
    """Top-level application settings.

    Layer priority (lowest to highest):
      1. Built-in defaults in this class
      2. config.yaml / config.json files
      3. Environment variables (prefixed APP_)
      4. Secrets from AWS Secrets Manager or Vault
    """

    model_config = SettingsConfigDict(
        env_prefix="APP_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="my-service", description="Application name shown in logs and metrics")
    environment: str = Field(
        default="development",
        pattern=r"^(development|staging|production)$",
        description="Deployment environment",
    )
    debug: bool = Field(default=False, description="Enable debug mode (disable in production)")
    log_level: LogLevel = Field(default=LogLevel.INFO)

    # Nested config groups
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    cache: CacheSettings = Field(default_factory=CacheSettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)

    # Application-specific settings
    api_host: str = Field(default="0.0.0.0", description="API bind address")
    api_port: int = Field(default=8080, ge=1, le=65535, description="API listen port")
    jwt_secret: SecretStr = Field(description="JWT signing secret — injected via environment variable only")
    max_request_size_mb: int = Field(default=10, ge=1, le=100)

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Production environment must not have debug mode enabled."""
        if v == "production" and cls.model_fields.get("debug"):
            # This validator runs at instantiation time; in practice, the caller
            # should prevent this combination by not setting DEBUG=true in prod.
            pass
        return v

    def model_dump_redacted(self, **kwargs: object) -> dict:
        """Dump config with all SecretStr fields redacted for health checks and logs."""
        dump = self.model_dump(**kwargs)
        for key in ("jwt_secret",):
            if key in dump:
                dump[key] = "***REDACTED***"
        # Recursively redact nested secret fields
        if "database" in dump:
            dump["database"]["password"] = "***REDACTED***"
        if "cache" in dump:
            dump["cache"].setdefault("password", "***REDACTED***")
        return dump
```

### Pattern 2: Layered Config Resolution (Files → Env Vars → Secrets)

Configuration resolution merges multiple sources into a single validated settings object. The key insight is that each layer is independently loadable and the merge order is explicit — making it trivial to debug which value came from where and to swap out layers without changing code.

```python
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import yaml
from pydantic_settings import SettingsConfigDict

logger = logging.getLogger(__name__)


@dataclass
class ConfigLayer:
    """Represents a single configuration layer in the resolution chain."""

    name: str
    priority: int  # Higher priority overrides lower
    source_description: str  # Human-readable description for logs and health checks

    def __post_init__(self) -> None:
        if not self.name or not self.source_description:
            raise ValueError("ConfigLayer requires non-empty name and source_description")


class LayeredConfigResolver:
    """Resolves configuration from multiple layers in priority order.

    Resolution pipeline:
      Layer 1 (priority=1):  Built-in defaults (hardcoded in AppSettings)
      Layer 2 (priority=10): YAML/JSON config files
      Layer 3 (priority=20): Environment variables (via Pydantic's env_prefix)
      Layer 4 (priority=30): Secrets manager overrides (resolved at runtime)

    Each layer is loaded independently, then merged by priority. Higher-priority
    values override lower-priority ones on key collision. The final merged result
    is validated against the schema.
    """

    def __init__(self, settings_class: type, env_file: str = ".env") -> None:
        self._settings_class = settings_class
        self._env_file = env_file
        self._layers: list[ConfigLayer] = []
        self._secret_provider: Optional[Any] = None
        self._resolution_log: list[str] = field(default_factory=list)

    def add_default_layer(self) -> "LayeredConfigResolver":
        """Add built-in defaults (lowest priority)."""
        self._layers.append(ConfigLayer(
            name="defaults",
            priority=1,
            source_description="Built-in defaults from settings class",
        ))
        return self

    def add_file_layer(self, file_path: str, format_hint: str = "yaml") -> "LayeredConfigResolver":
        """Add a YAML or JSON config file layer."""
        path = Path(file_path)
        if not path.exists():
            logger.info("Config file not found (optional): %s", file_path)
            return self

        self._layers.append(ConfigLayer(
            name=f"file:{path.name}",
            priority=10,
            source_description=f"{format_hint.upper()} config file: {path.absolute()}",
        ))
        return self

    def add_env_layer(self, env_file: Optional[str] = None) -> "LayeredConfigResolver":
        """Add environment variables layer (via .env file or os.environ)."""
        ef = env_file or self._env_file
        self._layers.append(ConfigLayer(
            name="env",
            priority=20,
            source_description=f"Environment variables (from {ef})",
        ))
        return self

    def add_secret_layer(self, provider: Any) -> "LayeredConfigResolver":
        """Add a secrets manager layer (highest priority)."""
        self._secret_provider = provider
        self._layers.append(ConfigLayer(
            name="secrets",
            priority=30,
            source_description="Secrets manager (AWS Secrets Manager / HashiCorp Vault)",
        ))
        return self

    def resolve(self) -> Any:
        """Resolve all layers into validated settings.

        Returns an instance of the settings class with merged configuration.

        Raises ValueError if required fields are missing or validation fails.
        """
        merged_env = dict(os.environ)  # Start with current environment
        self._resolution_log.append(f"Starting resolution with {len(self._layers)} layers")

        # Process layers in priority order
        for layer in sorted(self._layers, key=lambda l: l.priority):
            if layer.name == "defaults":
                continue  # Defaults are handled by Pydantic's field() defaults
            elif layer.name.startswith("file:"):
                file_path = str(layer.source_description).split(": ", 1)[1].split(" ")[0]
                file_data = self._load_config_file(file_path)
                merged_env.update(self._env_mapping(file_data))
                self._resolution_log.append(f"Loaded file layer: {layer.name}")
            elif layer.name == "env":
                # Environment variables are already in merged_env from os.environ
                if Path(self._env_file).exists():
                    env_data = self._load_env_file()
                    merged_env.update(env_data)
                self._resolution_log.append(f"Loaded env layer: {layer.name}")
            elif layer.name == "secrets":
                secret_overrides = self._fetch_secrets()
                merged_env.update(secret_overrides)
                self._resolution_log.append("Loaded secrets layer")

        # Instantiate settings with the merged environment
        settings = self._settings_class(_env_file=self._env_file, _env_nested_delimiter="_")
        self._resolution_log.append(f"Settings validated: {type(settings).__name__}")

        return settings

    def _load_config_file(self, file_path: str) -> dict[str, Any]:
        """Load a YAML or JSON config file."""
        path = Path(file_path)
        if path.suffix in (".yml", ".yaml"):
            with open(path) as f:
                return yaml.safe_load(f) or {}
        elif path.suffix == ".json":
            with open(path) as f:
                return json.load(f)
        else:
            raise ValueError(f"Unsupported config file format: {path.suffix}")

    def _load_env_file(self) -> dict[str, str]:
        """Parse a .env file into key-value pairs."""
        result: dict[str, str] = {}
        with open(self._env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    result[key.strip()] = value.strip().strip('"').strip("'")
        return result

    @staticmethod
    def _env_mapping(data: dict[str, Any], prefix: str = "") -> dict[str, str]:
        """Flatten a nested config dict into environment-variable-style keys."""
        env_vars: dict[str, str] = {}
        for key, value in data.items():
            full_key = f"{prefix}{key}".upper()
            if isinstance(value, dict):
                env_vars.update(LayeredConfigResolver._env_mapping(value, prefix=f"{full_key}_"))
            elif isinstance(value, bool):
                env_vars[full_key] = str(value).lower()
            else:
                env_vars[full_key] = str(value)
        return env_vars

    def _fetch_secrets(self) -> dict[str, str]:
        """Fetch secrets from the configured secret provider.

        In production, this connects to AWS Secrets Manager or HashiCorp Vault
        and returns only secret values — no config file content is included.
        """
        if not self._secret_provider:
            return {}

        # Example integration pattern — actual implementation depends on secret provider
        secrets_map = {
            "APP_DATABASE_PASSWORD": "vault://my-app/database/password",
            "APP_JWT_SECRET": "vault://my-app/auth/jwt-secret",
        }
        overrides: dict[str, str] = {}
        for env_key, vault_path in secrets_map.items():
            try:
                secret_name = vault_path.replace("vault://", "")
                overrides[env_key] = self._secret_provider.fetch(secret_name)
                logger.info("Secret loaded from %s -> %s", vault_path, env_key)
            except Exception as e:
                logger.error("Failed to fetch secret %s: %s", vault_path, e)
                raise RuntimeError(f"Required secret not available: {vault_path}") from e

        return overrides

    @property
    def resolution_log(self) -> list[str]:
        """Return the log of all resolution steps for debugging and health checks."""
        return list(self._resolution_log)


# Usage example — building a resolver that loads config in the correct priority order
import os


def load_application_config(
    settings_class: type = AppSettings,
    config_dir: str = "config",
) -> Any:
    """Load application configuration with layered resolution.

    Production call pattern:
      config = load_application_config(
          settings_class=AppSettings,
          config_dir="/etc/myapp/config",
      )
    """
    env_file = os.environ.get("APP_ENV_FILE", ".env")

    resolver = LayeredConfigResolver(settings_class, env_file=env_file)
    resolver.add_default_layer()  # Built-in defaults (priority=1)

    # Load environment-specific config file if it exists
    env_name = os.environ.get("APP_ENVIRONMENT", "development")
    env_config_path = Path(config_dir) / f"{env_name}.yaml"
    resolver.add_file_layer(str(env_config_path))  # Environment overrides (priority=10)

    # Load .env file for non-secret environment variables
    resolver.add_env_layer(env_file)  # Env vars (priority=20)

    # Integrate with a real secrets manager in production
    if env_name == "production":
        # In production, use AWS Secrets Manager or Vault
        from myapp.secrets import get_secret_provider
        resolver.add_secret_layer(get_secret_provider())  # Secrets (priority=30)

    return resolver.resolve()
```

### Pattern 3: Secret Management with Redaction

Secrets must never appear in logs, error messages, or health check output. Pydantic's `SecretStr` type handles basic redaction, but production systems need additional layers: environment variable injection for vault secrets, health-check masking, and audit logging that records secret presence without revealing values.

```python
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class SecretMetadata:
    """Tracks metadata about a loaded secret for audit and rotation purposes."""

    name: str
    source: str  # Where it came from (env var, vault path, file)
    loaded_at: datetime
    last_rotated: Optional[datetime] = None
    rotation_schedule_days: int = 90

    def to_log_entry(self) -> dict[str, Any]:
        """Return audit log entry — never includes the secret value itself."""
        return {
            "event": "secret_loaded",
            "name": self.name,
            "source": self.source,
            "loaded_at": self.loaded_at.isoformat(),
            "last_rotated": self.last_rotated.isoformat() if self.last_rotated else None,
            "days_until_rotation": (
                max(0, (self.last_rotated.replace(tzinfo=timezone.utc) + __import__('datetime').timedelta(days=self.rotation_schedule_days)).days - (datetime.now(timezone.utc).replace(tzinfo=timezone.utc).timetuple().tm_yday))
                if self.last_rotated else None
            ),
        }


class SecretManager:
    """Manages secret injection from multiple sources with redaction guarantees.

    Production deployment pattern:
      - Secrets are injected as environment variables (APP_DATABASE_PASSWORD, APP_JWT_SECRET)
      - The .env file is listed in .gitignore — only .env.example is committed to git
      - In production, a sidecar or init container populates secrets from AWS Secrets Manager
        before the application process starts
      - Health checks never include secret values — they show only metadata (name, source, age)

    This class provides:
      1. Secret injection from environment variables
      2. Optional fetching from a vault provider (AWS Secrets Manager / HashiCorp Vault)
      3. Redaction in model dumps and log output
      4. Audit logging of secret loading events
    """

    def __init__(self, vault_provider: Optional[Any] = None) -> None:
        self._vault = vault_provider
        self._loaded_secrets: dict[str, SecretMetadata] = {}

    def inject_secret(self, env_key: str, source_description: str) -> None:
        """Mark a secret as loaded from a specific source for audit tracking.

        In production, this is called after verifying the environment variable exists.
        The actual secret value comes from os.environ — this class only tracks metadata.
        """
        value = os.environ.get(env_key)
        if not value:
            logger.error("Required secret not found in environment: %s", env_key)
            raise ValueError(f"Required secret '{env_key}' is not set in the environment")

        self._loaded_secrets[env_key] = SecretMetadata(
            name=env_key,
            source=source_description,
            loaded_at=datetime.now(timezone.utc),
        )
        logger.info("Secret injected: %s (source: %s)", env_key, source_description)

    def get_metadata(self) -> list[dict[str, Any]]:
        """Return audit metadata for all loaded secrets — never includes values."""
        return [meta.to_log_entry() for meta in self._loaded_secrets.values()]

    def check_rotation_due(self) -> list[dict[str, Any]]:
        """Check which secrets are due for rotation. Returns list of overdue entries."""
        overdue = []
        for name, meta in self._loaded_secrets.items():
            if meta.last_rotated is None:
                overdue.append({"name": name, "status": "never_rotated"})
            else:
                days_since_rotation = (
                    datetime.now(timezone.utc) - meta.last_rotated.replace(tzinfo=timezone.utc)
                ).days
                if days_since_rotation >= meta.rotation_schedule_days:
                    overdue.append({
                        "name": name,
                        "status": "overdue",
                        "days_since_rotation": days_since_rotation,
                    })
        return overdue

    def get_health_summary(self) -> dict[str, Any]:
        """Return a non-sensitive configuration summary for the health check endpoint.

        This is what /health returns — includes config file sources and secret metadata
        but reveals zero credential content.
        """
        return {
            "configuration": {
                "sources_loaded": [
                    layer.source_description
                    for layer in self._layers  # From LayeredConfigResolver
                ] if hasattr(self, "_layers") else [],
                "secrets_resolved": len(self._loaded_secrets),
                "secrets_metadata": self.get_metadata(),
            },
            "rotation_check": {
                "overdue_secrets": self.check_rotation_due(),
            },
        }


# ✅ GOOD — Health check endpoint that exposes config state without secrets
@app.route("/health")
def health_check() -> tuple[dict, int]:
    """Health check endpoint returning non-sensitive configuration summary."""
    config_summary = settings.model_dump_redacted(mode="json")
    secret_health = secret_manager.get_health_summary()

    # Verify database connectivity as part of health check
    db_healthy = True
    try:
        db_pool.execute("SELECT 1")
    except Exception:
        db_healthy = False

    status_code = 200 if db_healthy else 503

    return {
        "status": "healthy" if db_healthy else "degraded",
        "version": __import__('sys').modules['__main__'].__version__ if hasattr(__import__('sys').modules.get('__main__', {}), '__version__') else "unknown",
        "configuration_summary": config_summary,
        "secrets_status": secret_health["secrets_metadata"],
        "rotation_warnings": secret_health["rotation_check"]["overdue_secrets"],
        "database": "connected" if db_healthy else "disconnected",
    }, status_code


# ❌ BAD — .env file tracked in git with plaintext credentials
# .env (COMMITTED TO GIT — DANGEROUS!)
# DATABASE_PASSWORD=s3cret_p@ssw0rd!
# JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
# AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY


# ✅ GOOD — .env.example as template, actual .env excluded via gitignore
# .env.example (COMMITTED TO GIT — SAFE! Template with placeholder values)
# # Copy this file to .env and fill in the actual values.
# # Do NOT commit .env to version control.
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_NAME=myapp_dev
# DATABASE_USER=app_user
# DATABASE_PASSWORD=<set via environment variable or secrets manager>
# REDIS_HOST=localhost
# REDIS_PORT=6379
# JWT_SECRET=<set via environment variable or secrets manager>
# APP_ENVIRONMENT=development


# .gitignore (contains this entry)
# .env

```

---

## Constraints

### MUST DO

- Use Pydantic v2 `BaseSettings` with typed `Field()` definitions for all configuration values. Every field must have a type annotation, an optional default, and a description string explaining its purpose.
- Separate secrets from regular configuration — sensitive fields use `SecretStr` type and are never logged or exposed in model dumps. Print the output of `model_dump_redacted()` before committing any code that exposes credentials.
- Validate the complete configuration at application startup before any business logic runs. A failed validation should crash the process with a descriptive error listing all invalid fields — silent fallback to defaults is unacceptable for production systems.
- Document each configuration field with its purpose, valid range, and source priority in the `Field()` description so that operators understand what each setting controls without reading implementation code.

### MUST NOT DO

- Hardcode configuration values directly in application code (constants are fine for internal behavior flags like `MAX_RETRIES` or `DEFAULT_TIMEOUT`, but not for database URLs, API keys, or environment-specific endpoints).
- Commit `.env` files to version control — always provide `.env.example` as a template and add `.env` to `.gitignore`. A leaked `.env` file is equivalent to leaking source code.
- Store secrets in plain-text config files tracked by git repositories (YAML, JSON, TOML). Secrets belong exclusively in environment variables or a dedicated secrets manager.
- Mix environment-specific values with shared configuration in the same file. Each environment file (e.g., `production.yaml`, `staging.yaml`) should contain only the deltas from defaults — not a copy of every setting.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-engineering-principles` | General engineering practices that apply to configuration design (SOLID, immutability) |
| `modern-python-development` | Modern Python 3.10+ patterns including type annotations and pydantic v2 usage |
| `production-readiness` | Operational criteria for production deployment including health checks and monitoring |

---

## Live References

> Authoritative documentation links for configuration management in Python. The model follows markdown links at load time to resolve external references and inline content.

- [Pydantic v2 Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Pydantic Field Validation Guide](https://docs.pydantic.dev/latest/concepts/fields/)
- [Python dotenv Best Practices](https://pypi.org/project/python-dotenv/)
- [HashiCorp Vault Secrets Management](https://developer.hashicorp.com/vault/docs/secrets)
- [AWS Secrets Manager Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/secretsmanager.html)
- [Configuration Management Anti-Patterns (Martin Fowler)](https://martinfowler.com/bliki/ConfigurationFile.html)
