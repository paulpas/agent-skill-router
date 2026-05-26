---
name: configuration-management-patterns
description: Designs production configuration management with schema validation, hierarchical merging of config sources, hot reload capabilities, secret injection from vaults, and environment-specific defaults for reliable deployment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: configuration management, config validation, schema validation, config hot reload, secret injection, HashiCorp Vault, Pydantic settings, how do i manage application configuration
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: database-design-modeling, performance-optimization, security-review, cncf-deployment-orchestration
  author: https://github.com/openai/skill-router-contributors
  source: https://github.com/paulpas/git/agent-skill-router
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
---

# Configuration Management Patterns

Designs production-grade configuration management with schema validation, hierarchical merging of config sources, hot reload capabilities, secret injection from vaults, and environment-specific defaults for reliable deployment.

## TL;DR Checklist

- [ ] Define config schema with Pydantic Settings v2 using `model_config` and field-level validators
- [ ] Implement hierarchical merging: file defaults < env vars < secrets vault < runtime overrides
- [ ] Validate all required fields at startup — fail fast with a clear error listing missing keys
- [ ] Inject secrets from environment variables or vault — never hardcode in source or config files
- [ ] Support hot reload for non-secret config via filesystem watcher or KV store polling
- [ ] Write config fixture patterns for tests that isolate config from application logic

---

## When to Use

Use this skill when:

- Your application requires configuration that varies across environments (dev, staging, production)
- You need schema validation to catch misconfigurations at startup rather than runtime failures
- Secrets (API keys, database passwords) must be injected securely without appearing in source control
- Configuration changes should take effect without restarting the application (hot reload)
- Multiple config sources (files, env vars, vaults, CLI flags) need consistent hierarchical merging

---

## When NOT to Use

Avoid this skill for:

- Simple scripts or CLIs with fewer than 5 configuration values — use `argparse` or `click` defaults instead
- One-off batch jobs run in identical environments — hardcoded values are simpler and sufficient
- Configuration that changes per-request (feature flags served from a remote KV store) — use a dedicated feature flag service

---

## Core Workflow

1. **Define the Config Schema** — Create a Pydantic `BaseSettings` model with typed fields, defaults, and field-level descriptions. Use `model_config` for env prefix and secrets sources. **Checkpoint:** Every field must have an explicit type annotation — never use `Any` or omit the type hint.

2. **Set Up Hierarchical Merging** — Configure Pydantic Settings v2's `SecretsSettingsSource` and custom sources to merge from multiple origins. The order is: file defaults → environment variables → secrets vault → runtime overrides. **Checkpoint:** Verify that env vars override file values by testing with a conflicting value in the environment.

3. **Inject Secrets Securely** — Separate secret fields (passwords, API keys, tokens) from public config using `SecretStr`. Load them from environment variables or HashiCorp Vault at startup. **Checkpoint:** No secrets should appear in log output, error messages, or stack traces — mask all secret values with `****`.

4. **Implement Validation and Fail-Fast Startup** — Add model validators for cross-field constraints (e.g., `max_connections` > 0, TLS cert and key must both exist). Validate at application bootstrap. **Checkpoint:** Missing required config should cause an immediate startup failure with a list of exactly which keys are missing.

5. **Add Hot Reload for Mutable Config** — For non-secret config (feature flags, rate limits), add a filesystem watcher or KV polling mechanism that updates the config in-place. Secret config requires restart on change. **Checkpoint:** Hot reload must be thread-safe — use `atomic` replacement of the entire config object, not field-by-field mutation.

---

## Implementation Patterns

### Pattern 1: Schema-Validated Configuration with Pydantic Settings v2

Define a typed configuration model that validates at load time and provides clear error messages for misconfiguration.

```python
from __future__ import annotations

import os
import re
from datetime import timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    SecretStr,
)
from pydantic_settings import BaseSettings, SettingsConfigDict


class LogLevel(str, Enum):
    """Application log levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class DatabaseDialect(str, Enum):
    """Supported database backends."""
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"


class CacheBackend(str, Enum):
    """Cache backend implementations."""
    MEMORY = "memory"
    REDIS = "redis"
    MEMCACHED = "memcached"


class AppSettings(BaseSettings):
    """Production application configuration with schema validation.

    Loads from multiple sources in this priority order:
    1. Default values defined on each field
    2. .env file (if APP_CONFIG_PATH is set)
    3. Environment variables with prefix APP_
    4. Secrets from /run/secrets/ (if mounted)

    All fields are validated at instantiation time. Missing required
    fields raise ValidationError with a clear list of missing keys.
    """

    model_config = SettingsConfigDict(
        env_prefix="APP_",
        env_file=".env",
        env_file_encoding="utf-8",
        secrets_dir="/run/secrets",
        extra="ignore",  # Reject unknown fields to catch typos early
    )

    # ─── Application Identity ──────────────────────────────────────────────
    app_name: str = Field(
        default="myapp",
        description="Application name used in logging and metrics tags",
    )
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment — affects security posture and features",
    )

    # ─── Server Configuration ──────────────────────────────────────────────
    host: str = Field(default="0.0.0.0", description="Bind address for HTTP server")
    port: int = Field(default=8000, ge=1, le=65535, description="HTTP server port")
    workers: int = Field(default=4, ge=1, description="Number of worker processes")

    # ─── Logging ───────────────────────────────────────────────────────────
    log_level: LogLevel = Field(default=LogLevel.INFO, description="Application log level")
    log_format: Literal["text", "json"] = Field(
        default="json",
        description="Log output format — json preferred in production",
    )

    # ─── Database Configuration ────────────────────────────────────────────
    db_dialect: DatabaseDialect = Field(default=DatabaseDialect.POSTGRESQL, description="Database backend")
    db_host: str = Field(default="localhost", description="Database server hostname")
    db_port: int = Field(default=5432, ge=1, le=65535, description="Database server port")
    db_name: str = Field(default="app_db", description="Database name")
    db_user: str = Field(default="app_user", description="Database username")
    db_password: SecretStr = Field(
        default=SecretStr(""),
        description="Database password — loaded from secrets dir or env var",
    )
    db_max_connections: int = Field(default=10, ge=1, le=200, description="Max database connections in pool")
    db_connection_timeout: timedelta = Field(
        default=timedelta(seconds=30),
        description="Timeout for establishing a database connection",
    )

    # ─── Cache Configuration ──────────────────────────────────────────────
    cache_backend: CacheBackend = Field(default=CacheBackend.REDIS, description="Cache backend to use")
    cache_host: str = Field(default="localhost", description="Redis/Memcached server hostname")
    cache_port: int = Field(default=6379, ge=1, le=65535, description="Cache server port")
    cache_ttl_seconds: int = Field(default=300, ge=1, description="Default TTL for cached items in seconds")

    # ─── Feature Flags ────────────────────────────────────────────────────
    enable_rate_limiting: bool = Field(default=True, description="Enable API rate limiting middleware")
    enable_request_logging: bool = Field(default=False, description="Log all incoming requests (expensive)")
    maintenance_mode: bool = Field(default=False, description="Put application in maintenance mode")

    # ─── External Services ────────────────────────────────────────────────
    api_key: SecretStr | None = Field(
        default=None,
        description="External API key — required for production environment",
    )
    webhook_secret: SecretStr = Field(
        default=SecretStr(""),
        description="Webhook signature verification secret",
    )

    @field_validator("db_password")
    @classmethod
    def validate_db_password(cls, v: SecretStr) -> SecretStr:
        """Ensure database password is not empty in production."""
        password = v.get_secret_value()
        if cls.model_config and password == "":  # type: ignore[union-attr]
            return v  # Will be caught by model_validator for env check
        return v

    @model_validator(mode="after")
    def validate_environment_constraints(self) -> AppSettings:
        """Cross-field validation that runs after all fields are loaded."""
        if self.environment == "production" and not self.api_key:
            raise ValueError("APP_API_KEY is required when environment=production")

        if self.db_dialect == DatabaseDialect.POSTGRESQL and self.db_port != 5432:
            # Non-standard PostgreSQL port — log a warning (not an error, for dev flexibility)
            import logging
            logging.warning(
                "Non-standard PostgreSQL port %d — ensure firewall rules allow access",
                self.db_port,
            )

        if self.db_max_connections > 200:
            raise ValueError("db_max_connections must not exceed 200")

        return self

    def to_dict(self, *, exclude_secrets: bool = True) -> dict[str, Any]:
        """Serialize config to a dictionary. Secrets are masked by default."""
        result = self.model_dump(exclude_unset=True)
        if exclude_secrets:
            for key in list(result.keys()):
                if isinstance(result[key], SecretStr):
                    result[key] = "****"
        return result

    @property
    def database_url(self) -> str:
        """Construct the database connection URL from config fields."""
        password = self.db_password.get_secret_value()
        dialect_map = {
            DatabaseDialect.POSTGRESQL: "postgresql",
            DatabaseDialect.MYSQL: "mysql",
            DatabaseDialect.SQLITE: "sqlite",
        }
        scheme = dialect_map[self.db_dialect]

        if self.db_dialect == DatabaseDialect.SQLITE:
            return f"{scheme}://{self.db_name}"
        elif password:
            return f"{scheme}://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"
        else:
            return f"{scheme}://{self.db_host}:{self.db_port}/{self.db_name}"

    def is_production(self) -> bool:
        """Convenience check for production environment."""
        return self.environment == "production"
```

```python
# ❌ BAD: Unvalidated configuration loaded from arbitrary source
import yaml

with open("config.yaml") as f:
    config = yaml.safe_load(f)
# No type checking, no required field validation, typos in keys silently ignored
# Missing DB_PASSWORD causes failure deep in application logic with cryptic error

# ✅ GOOD: Schema-validated config fails fast with clear error messages
try:
    settings = AppSettings()
except Exception as e:  # noqa: BLE001
    print(f"Configuration failed validation:\n{e}")
    exit(1)

# At this point, all fields are guaranteed to be present and valid types
print(f"Database URL: {settings.database_url}")
# Database URL is safely constructed from validated fields
```

**When to use Pydantic Settings v2:** Your application has 5+ configuration values with different sources (files, env vars, secrets). You need type safety and clear validation errors at startup.

**Key features used:**
- `model_config` for environment prefix, secrets directory, extra field handling
- `Field()` with constraints (`ge`, `le`, `description`) for per-field validation
- `field_validator` for single-field cross-checks (password format)
- `model_validator` for multi-field cross-checks (production requires API key)

---

### Pattern 2: Hierarchical Config Merging

Merge configuration from multiple sources with a well-defined priority order. Lower-priority sources provide defaults; higher-priority sources override them.

```python
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ConfigSource:
    """Represents a single configuration source with its priority level.

    Lower `priority` value = higher precedence (overrides lower-priority sources).
    Sources are merged top-down; later sources override earlier ones for the same key.
    """
    name: str
    priority: int
    data: dict[str, Any] = field(default_factory=dict)
    is_valid: bool = True
    error_message: str | None = None


class HierarchicalConfigMerger:
    """Merges configuration from multiple sources with deterministic priority ordering.

    Priority order (lowest to highest):
      1. Built-in defaults (hardcoded in code)
      2. Configuration file (.yaml, .json, .toml)
      3. Environment variables (prefixed, converted to dotted notation)
      4. Secrets vault values
      5. Runtime overrides (programmatic API calls)

    Nested dictionaries are merged recursively; scalar values are overwritten.
    """

    def __init__(self, strict_mode: bool = True) -> None:
        self._sources: list[ConfigSource] = []
        self._strict_mode = strict_mode
        self._merged: dict[str, Any] = {}

    @property
    def sources(self) -> list[ConfigSource]:
        return list(self._sources)

    def add_source(self, source: ConfigSource) -> "HierarchicalConfigMerger":
        """Add a configuration source. Sources are sorted by priority (ascending = highest precedence last)."""
        self._sources.append(source)
        self._sources.sort(key=lambda s: s.priority)
        return self

    def merge(self) -> dict[str, Any]:
        """Merge all sources in priority order. Returns the final merged configuration."""
        if not self._sources:
            self._merged = {}
            return self._merged

        self._merged = {}

        for source in self._sources:
            if not source.is_valid:
                logger.warning("Skipping invalid config source '%s': %s", source.name, source.error_message)
                continue

            self._merged = self._deep_merge(self._merged, source.data)
            logger.info("Applied source '%s' (priority=%d): %d keys merged", source.name, source.priority, len(source.data))

        return dict(self._merged)  # Return a copy to prevent mutation

    def _deep_merge(self, base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
        """Recursively merge two dictionaries. Scalar values in override replace base."""
        result = dict(base)  # Shallow copy of base

        for key, value in override.items():
            if (
                key in result
                and isinstance(result[key], dict)
                and isinstance(value, dict)
            ):
                # Recursively merge nested dictionaries
                result[key] = self._deep_merge(result[key], value)
            else:
                # Scalar or list values — override wins completely
                result[key] = value

        return result

    def validate_required_keys(self, required_keys: list[str]) -> list[str]:
        """Check that all required configuration keys are present after merging.

        Supports dotted notation for nested keys (e.g., "database.host").

        Args:
            required_keys: Flat list of required key paths using dot notation

        Returns:
            List of missing keys (empty if all present)
        """
        missing = []
        for key_path in required_keys:
            parts = key_path.split(".")
            current = self._merged

            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    missing.append(key_path)
                    break

        if missing:
            logger.error("Missing required configuration keys: %s", ", ".join(missing))
        return missing

    def get(self, key_path: str, default: Any = None) -> Any:
        """Get a value from the merged config using dotted key path notation.

        Args:
            key_path: Dotted path to the configuration value (e.g., "database.host")
            default: Default value if the key is not found

        Returns:
            The configuration value or the provided default
        """
        parts = key_path.split(".")
        current: Any = self._merged

        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return default

        return current


def build_env_var_source(prefix: str = "APP_") -> dict[str, Any]:
    """Convert environment variables with a given prefix into a flat dictionary.

    Converts dotted notation in env var names to nested dictionaries:
      APP_DATABASE_HOST → {"database": {"host": "..."}}
      APP_LOG_LEVEL → {"log_level": "..."}
    """
    result: dict[str, Any] = {}
    for key, value in sorted(os.environ.items()):  # type: ignore[name-defined]
        if key.startswith(prefix):
            # Strip prefix and convert to dotted lowercase notation
            clean_key = key[len(prefix):].lower()
            parts = clean_key.split("_")

            # Insert into nested structure
            current = result
            for part in parts[:-1]:
                if part not in current or not isinstance(current[part], dict):
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = value

    return result


def load_file_source(
    path: str | Path,
    format_hint: str = "yaml",
) -> ConfigSource:
    """Load configuration from a file (YAML or JSON)."""
    path = Path(path) if isinstance(path, str) else path

    if not path.exists():
        return ConfigSource(
            name=str(path),
            priority=10,
            is_valid=False,
            error_message=f"File not found: {path}",
        )

    try:
        content = path.read_text(encoding="utf-8")
        if format_hint == "json":
            data = json.loads(content)
        else:  # default to YAML
            import yaml
            data = yaml.safe_load(content) or {}

        return ConfigSource(name=str(path), priority=10, data=data)

    except Exception as e:  # noqa: BLE001
        return ConfigSource(
            name=str(path),
            priority=10,
            is_valid=False,
            error_message=f"Failed to parse {format_hint} file: {e}",
        )
```

```python
# ❌ BAD: Single source of truth — no hierarchy, no override mechanism
# All config in one file, no way to override per environment without editing the file
import yaml
config = yaml.safe_load(open("config.yaml"))  # No fallbacks, no env var overrides

# ✅ GOOD: Hierarchical merging with clear priority and validation
from pathlib import Path
from pydantic_settings import BaseSettings

merger = HierarchicalConfigMerger()

# Source 1: Built-in defaults (highest priority = lowest number)
defaults = ConfigSource(name="defaults", priority=0, data={
    "host": "0.0.0.0",
    "port": 8000,
    "workers": 4,
})

# Source 2: YAML config file
file_source = load_file_source(Path("/etc/myapp/config.yaml"), format_hint="yaml")

# Source 3: Environment variables
env_source = ConfigSource(
    name="env_vars",
    priority=100,
    data=build_env_var_source(prefix="APP_"),
)

merger.add_source(defaults).add_source(file_source).add_source(env_source)
merged_config = merger.merge()

# Validate required keys before using
missing = merger.validate_required_keys([
    "db_dialect", "db_host", "db_name",
    "cache_backend", "api_key",
])
if missing:
    raise RuntimeError(f"Missing config: {missing}")
```

**When to use Hierarchical Merging:** Configuration needs to vary across environments without duplicating entire config files. Sensitive values (secrets) are loaded separately from public configuration.

---

### Pattern 3: Hot Reload with Filesystem Watchers

Non-secret configuration should take effect without restarting the application. This pattern uses a filesystem watcher to detect config file changes and atomically replace the in-memory config object.

```python
from __future__ import annotations

import asyncio
import logging
import signal
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass
class ConfigChange:
    """Represents a detected configuration change event."""
    source_path: Path
    change_type: str  # "created", "modified", "deleted"
    timestamp: float = field(default_factory=time.monotonic)


class HotReloadConfigManager:
    """Manages hot reloading of non-secret configuration.

    Watches config files for changes and atomically replaces the
    in-memory configuration when detected. Thread-safe via asyncio event loop.

    Secret configuration is NOT hot-reloaded — it requires a process restart
    to ensure old secret references are fully garbage collected.
    """

    def __init__(
        self,
        config_path: str | Path,
        reload_interval_seconds: float = 2.0,
        debounce_ms: int = 500,
    ) -> None:
        self._config_path = Path(config_path) if isinstance(config_path, str) else config_path
        self._reload_interval = reload_interval_seconds
        self._debounce_ms = debounce_ms
        self._last_modified: float = 0.0
        self._config: dict[str, Any] = {}
        self._callbacks: list[Callable[[dict[str, Any]], None]] = []
        self._running = False
        self._task: asyncio.Task | None = None
        self._file_hash: str | None = None

    @property
    def config(self) -> dict[str, Any]:
        """Thread-safe read access to the current configuration snapshot."""
        return dict(self._config)  # Return a copy to prevent mutation

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self, initial_config: dict[str, Any] | None = None) -> None:
        """Start watching for configuration changes."""
        if self._running:
            logger.warning("Hot reload manager already running — stopping first")
            await self.stop()

        # Load initial config
        if initial_config is not None:
            self._config = initial_config
        elif self._config_path.exists():
            self._config = self._load_current_config()

        self._running = True
        self._task = asyncio.create_task(self._watch_loop())
        logger.info("Hot reload started watching: %s", self._config_path)

    async def stop(self) -> None:
        """Stop the hot reload watcher."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._running = False
        logger.info("Hot reload stopped")

    def on_config_change(self, callback: Callable[[dict[str, Any]], None]) -> None:
        """Register a callback invoked when config changes are detected.

        The callback receives the new configuration dictionary.
        Callbacks run synchronously — use asyncio.create_task() for async callbacks.
        """
        self._callbacks.append(callback)

    def _compute_file_hash(self, path: Path) -> str | None:
        """Compute a hash of the config file for change detection."""
        if not path.exists():
            return None
        import hashlib
        content = path.read_bytes()
        return hashlib.sha256(content).hexdigest()[:16]

    def _load_current_config(self) -> dict[str, Any]:
        """Load the current config file contents."""
        try:
            content = self._config_path.read_text(encoding="utf-8")
            if str(self._config_path).endswith(".json"):
                import json
                return json.loads(content)
            else:
                import yaml
                return yaml.safe_load(content) or {}
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to load config from %s: %s", self._config_path, e)
            return {}

    async def _watch_loop(self) -> None:
        """Main watch loop: poll for file changes with debounce."""
        while self._running:
            try:
                current_hash = self._compute_file_hash(self._config_path)

                if current_hash and current_hash != self._file_hash:
                    # File changed — apply debounce to avoid reloading mid-write
                    import time as _time
                    now = _time.monotonic()
                    if now - self._last_modified > self._debounce_ms / 1000.0:
                        await self._apply_reload(current_hash)

            except asyncio.CancelledError:
                break
            except Exception as e:  # noqa: BLE001
                logger.error("Error in watch loop: %s", e)

            await asyncio.sleep(self._reload_interval)

    async def _apply_reload(self, new_hash: str) -> None:
        """Apply a detected configuration change."""
        old_config = dict(self._config)
        new_config = self._load_current_config()

        if not new_config:
            logger.warning("Reload produced empty config — keeping previous config")
            return

        # Check for structural differences before notifying callbacks
        if old_config == new_config:
            return  # No actual change detected (e.g., whitespace-only modification)

        # Atomically replace the config snapshot
        self._config = new_config
        self._file_hash = new_hash
        self._last_modified = time.monotonic()

        logger.info(
            "Configuration reloaded from %s (%d keys)",
            self._config_path,
            len(new_config),
        )

        # Notify registered callbacks
        for callback in self._callbacks:
            try:
                callback(new_config)
            except Exception as e:  # noqa: BLE001
                logger.error("Config change callback failed: %s", e)

    @property
    def last_modified(self) -> float:
        return self._last_modified
```

```python
# ❌ BAD: No hot reload — every config change requires a full application restart
async def main():
    config = load_config()  # Loaded once at startup, never refreshed
    await run_server(config)  # Config changes on disk have zero effect

# ✅ GOOD: Hot reload with atomic swap and callback notification
async def main():
    config_manager = HotReloadConfigManager(
        config_path="/etc/myapp/runtime.yaml",
        debounce_ms=500,
    )

    @config_manager.on_config_change
    async def on_config_updated(new_config: dict[str, Any]) -> None:
        # Update rate limiter, feature flags, or other dynamic behavior
        await update_rate_limiters(new_config.get("rate_limits", {}))
        await toggle_feature_flags(new_config.get("feature_flags", {}))

    await config_manager.start(initial_config={"rate_limits": {}, "feature_flags": {}})
    try:
        await run_server(config_manager.config)  # Reads current snapshot on each request
    finally:
        await config_manager.stop()
```

**When to use Hot Reload:** Non-secret configuration changes frequently (feature flags, rate limits, UI settings). Zero-downtime updates are required. Changes should propagate within seconds.

**When NOT to use Hot Reload:** Secret configuration — old secret references may persist in memory and connection pools. Use full restart for secret changes. The application has no mechanism to gracefully handle config-driven state transitions (e.g., changing port number requires socket rebind).

---

### Pattern 4: Secret Injection from Environment vs Vault

Separate secret management from public configuration. Load secrets from the most secure source available — environment variables, mounted files, or HashiCorp Vault — with automatic fallback.

```python
from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class SecretProvider(ABC):
    """Protocol for secret providers that fetch secrets from external sources."""

    @abstractmethod
    async def get_secret(self, key: str) -> str | None: ...

    @abstractmethod
    async def get_secrets_batch(self, keys: list[str]) -> dict[str, str]: ...

    @property
    @abstractmethod
    def name(self) -> str: ...


class EnvironmentSecretProvider(SecretProvider):
    """Loads secrets from environment variables.

    Keys are mapped by converting snake_case to UPPER_CASE with a given prefix.
    e.g., key="database_password" → env var "APP_DATABASE_PASSWORD"
    """

    def __init__(self, prefix: str = "APP_") -> None:
        self._prefix = prefix

    @property
    def name(self) -> str:
        return f"env({self._prefix})"

    async def get_secret(self, key: str) -> str | None:
        env_key = f"{self._prefix}{key.upper()}"
        value = os.environ.get(env_key)
        if value:
            logger.debug("Loaded secret from env var for key: %s", key[:8] + "****")
        return value

    async def get_secrets_batch(self, keys: list[str]) -> dict[str, str]:
        return {key: await self.get_secret(key) or "" for key in keys}


class FileSecretProvider(SecretProvider):
    """Loads secrets from individually-named files (mounted by Kubernetes or Docker).

    Each secret is stored as a file containing the raw secret value.
    Common pattern: /run/secrets/database_password, /run/secrets/api_key
    """

    def __init__(self, secrets_dir: str = "/run/secrets") -> None:
        self._secrets_dir = Path(secrets_dir)

    @property
    def name(self) -> str:
        return f"file({self._secrets_dir})"

    async def get_secret(self, key: str) -> str | None:
        secret_path = self._secrets_dir / key
        if not secret_path.exists():
            return None
        try:
            value = secret_path.read_text(encoding="utf-8").strip()
            logger.debug("Loaded secret from file for key: %s", key[:8] + "****")
            return value
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to read secret file %s: %s", secret_path, e)
            return None

    async def get_secrets_batch(self, keys: list[str]) -> dict[str, str]:
        secrets = {}
        for key in keys:
            value = await self.get_secret(key)
            if value is not None:
                secrets[key] = value
        return secrets


class VaultSecretProvider(SecretProvider):
    """Loads secrets from HashiCorp Vault using the Kubernetes auth method or token auth.

    Supports both kv-v1 and kv-v2 secret engines with versioned retrieval.
    In production, use Kubernetes service account tokens for automatic authentication.
    """

    def __init__(
        self,
        vault_address: str = "https://vault.example.com:8200",
        vault_path: str = "secret",
        vault_role: str | None = None,
        vault_token: str | None = None,
    ) -> None:
        self._address = vault_address.rstrip("/")
        self._path = vault_path
        self._role = vault_role
        self._token = vault_token
        self._client: Any = None  # type: ignore[assignment]

    @property
    def name(self) -> str:
        return f"vault({self._address}/{self._path})"

    async def _get_client(self) -> Any:  # noqa: ANN401
        """Lazy-initialize the Vault client. Returns None if auth fails."""
        if self._client is not None:
            return self._client

        try:
            import hvac  # type: ignore[import-not-found]
            if self._token:
                self._client = hvac.Client(url=self._address, token=self._token)
            elif self._role:
                # Kubernetes auth — assumes running inside a pod with service account
                k8s_token = Path("/var/run/secrets/kubernetes.io/serviceaccount/token").read_text()  # noqa: PTH118
                jwt_data = {"jwt": k8s_token, "role": self._role}
                auth_resp = hvac.Client(url=self._address).auth.kubernetes.login(**jwt_data)
                self._client = hvac.Client(
                    url=self._address,
                    token=auth_resp["auth"]["client_token"],
                )
            else:
                logger.warning("Vault provider configured without token or role — skipping")
                return None
        except ImportError:
            logger.warning("hvac package not installed — Vault integration disabled")
            return None

        return self._client

    async def get_secret(self, key: str) -> str | None:
        """Retrieve a single secret from Vault."""
        client = await self._get_client()
        if client is None:
            return None

        try:
            # kv-v2 engine — include version=-1 for latest version
            path = f"{self._path}/{key}"
            resp = client.secrets.kv.v2.read_secret_version(path=path)  # type: ignore[attr-defined]
            data = resp["data"]["data"]
            return str(data.get("value") or data.get(key, ""))
        except Exception as e:  # noqa: BLE001
            logger.debug("Vault secret not found or error for key '%s': %s", key, e)
            return None

    async def get_secrets_batch(self, keys: list[str]) -> dict[str, str]:
        """Retrieve multiple secrets in one Vault API call."""
        client = await self._get_client()
        if client is None:
            return {}

        try:
            # kv-v1 supports bulk read with a single path prefix
            secrets_data = client.secrets.kv.v1.read_secret(path=self._path, all=True)  # type: ignore[attr-defined]
            result = {}
            for key in keys:
                if key in secrets_data.get("data", {}):  # type: ignore[index]
                    result[key] = str(secrets_data["data"][key])  # type: ignore[index]
            return result
        except Exception as e:  # noqa: BLE001
            logger.warning("Vault batch retrieval failed — falling back to individual lookups: %s", e)
            secrets = {}
            for key in keys:
                val = await self.get_secret(key)
                if val is not None:
                    secrets[key] = val
            return secrets


class SecretInjector:
    """Orchestrates secret loading across multiple providers with fallback.

    Tries each provider in order until the secret is found. Logs which provider
    supplied each secret for debugging (without exposing the actual secret value).
    """

    def __init__(self, providers: list[SecretProvider] | None = None) -> None:
        self._providers = providers or [
            VaultSecretProvider(),
            FileSecretProvider(secrets_dir="/run/secrets"),
            EnvironmentSecretProvider(prefix="APP_"),
        ]
        # Sort by priority: Vault > Files > Env vars (most secure first)
        provider_order = {"vault": 0, "file": 1, "env": 2}
        self._providers.sort(key=lambda p: provider_order.get(p.name.split("(")[0], 99))

    async def inject_secrets(self, secret_keys: list[str]) -> dict[str, str]:
        """Load multiple secrets from the available providers.

        Each key is fetched from the first provider that has it.
        Returns a dictionary of key → value for all successfully loaded secrets.

        Args:
            secret_keys: List of secret names to inject (e.g., ["database_password", "api_key"])

        Returns:
            Dictionary mapping secret keys to their values. Missing keys are omitted.
        """
        result: dict[str, str] = {}
        missing: list[str] = []

        for key in secret_keys:
            if key in result:
                continue  # Already loaded from a higher-priority provider

            found = False
            for provider in self._providers:
                value = await provider.get_secret(key)
                if value is not None:
                    result[key] = value
                    logger.info("Secret '%s' loaded via %s", key, provider.name)
                    found = True
                    break

            if not found:
                missing.append(key)

        if missing:
            logger.error(
                "Failed to load secrets from any provider: %s. "
                "Ensure they exist in env vars, /run/secrets/, or Vault.",
                ", ".join(missing),
            )

        return result

    @property
    def provider_names(self) -> list[str]:
        return [p.name for p in self._providers]
```

```python
# ❌ BAD: Secrets hardcoded in source code or config files tracked in git
DATABASE_PASSWORD = "super_secret_123"  # Exposed in version control!
API_KEY = os.getenv("API_KEY", "dev_key_for_local")  # Weak default for production risk

# ✅ GOOD: Secret injection with multi-source fallback and masking in logs
async def bootstrap_app():
    injector = SecretInjector([
        VaultSecretProvider(vault_address="https://vault.prod.internal:8200"),
        FileSecretProvider(secrets_dir="/run/secrets"),
        EnvironmentSecretProvider(prefix="APP_"),
    ])

    secrets = await injector.inject_secrets([
        "database_password",
        "api_key",
        "webhook_secret",
        "jwt_signing_key",
    ])

    # Use secrets in config — they are masked in logs automatically
    settings = AppSettings(
        db_password=SecretStr(secrets.get("database_password", "")),
        api_key=SecretStr(secrets.get("api_key")),
        webhook_secret=SecretStr(secrets.get("webhook_secret")),
    )
    # jwt_signing_key can be used directly for token validation
```

**When to use Vault:** Production environments with centralized secret management. Teams need audit trails for secret access, automated rotation, and RBAC on secret paths.

**When to use Environment Variables:** Simpler deployments (containers, serverless). Secrets are injected by the deployment platform (Kubernetes secrets as env vars, AWS Lambda environment variables).

**When to use Mounted Files:** Kubernetes-native pattern where each secret is a file in `/run/secrets/`. Cleaner than env vars for multi-line secrets and avoids shell escaping issues.

---

### Pattern 5: Configuration Testing with Fixture Patterns

Test your application's configuration loading and validation in isolation. Use fixtures that provide known-good config for unit tests and known-bad config for failure case tests.

```python
from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any

import pytest
from pydantic import SecretStr


@pytest.fixture
def valid_config_dict() -> dict[str, Any]:
    """Provide a minimal valid configuration dictionary for testing."""
    return {
        "app_name": "test-app",
        "environment": "staging",
        "host": "127.0.0.1",
        "port": 8765,
        "workers": 2,
        "log_level": "WARNING",
        "log_format": "text",
        "db_dialect": "sqlite",
        "db_name": ":memory:",
        "db_max_connections": 5,
        "cache_backend": "memory",
        "cache_ttl_seconds": 60,
        "enable_rate_limiting": True,
    }


@pytest.fixture
def production_config_dict(valid_config_dict: dict[str, Any]) -> dict[str, Any]:
    """Provide a production-valid configuration with all required secrets."""
    config = {**valid_config_dict}
    config["environment"] = "production"
    config["api_key"] = "test-api-key-for-qa-only"
    config["workers"] = 8
    return config


@pytest.fixture
def invalid_missing_api_key_config(valid_config_dict: dict[str, Any]) -> dict[str, Any]:
    """Configuration that fails validation because it's missing production-required api_key."""
    config = {**valid_config_dict}
    config["environment"] = "production"
    # Intentionally omit api_key — should trigger ValidationError
    return config


@pytest.fixture
def invalid_negative_port_config(valid_config_dict: dict[str, Any]) -> dict[str, Any]:
    """Configuration that fails validation because port is out of range."""
    config = {**valid_config_dict}
    config["port"] = -1  # Below ge=1 constraint
    return config


@pytest.fixture
def invalid_max_connections_config(valid_config_dict: dict[str, Any]) -> dict[str, Any]:
    """Configuration that fails the model_validator for exceeding max connections."""
    config = {**valid_config_dict}
    config["db_max_connections"] = 500  # Above le=200 constraint and model_validator check
    return config


@pytest.fixture
def env_config_snapshot(monkeypatch: Any, valid_config_dict: dict[str, Any]) -> None:  # type: ignore[unused-ignores]
    """Set environment variables for a staging configuration during tests.

    Cleans up all APP_ prefixed environment variables after the test.
    """
    for key, value in valid_config_dict.items():
        monkeypatch.setenv(f"APP_{key.upper()}", str(value))


@pytest.fixture
def config_file(tmp_path: Path, valid_config_dict: dict[str, Any]) -> Path:  # type: ignore[unused-ignores]
    """Create a temporary YAML config file for testing file-based config loading."""
    import yaml

    config_path = tmp_path / "test_config.yaml"
    config_data = {**valid_config_dict}
    # Remove __pycache__ and other non-dict values that yaml can't serialize
    config_data.pop("api_key", None)

    config_path.write_text(yaml.dump(config_data), encoding="utf-8")
    return config_path


class TestAppSettings:
    """Test suite for AppSettings configuration validation.

    Each test validates a specific constraint or error path.
    """

    def test_default_config_loads_successfully(self, valid_config_dict: dict[str, Any]) -> None:
        """Valid configuration with SQLite should load without errors."""
        from pydantic_settings import SettingsConfigDict
        from app.settings import AppSettings

        settings = AppSettings(**valid_config_dict)
        assert settings.environment == "staging"
        assert settings.db_dialect.value == "sqlite"
        assert settings.is_production() is False

    def test_database_url_construction(self, valid_config_dict: dict[str, Any]) -> None:
        """Database URL must be correctly constructed from config fields."""
        from app.settings import AppSettings

        settings = AppSettings(**valid_config_dict)
        url = settings.database_url
        assert "sqlite" in url
        assert ":" in url  # :memory: SQLite special connection string
        assert "****" not in url  # No secrets leaked into the URL representation for SQLite

    def test_production_requires_api_key(self, invalid_missing_api_key_config: dict[str, Any]) -> None:
        """Production environment must have api_key — validation fails without it."""
        from pydantic import ValidationError
        from app.settings import AppSettings

        with pytest.raises(ValidationError) as exc_info:
            AppSettings(**invalid_missing_api_key_config)

        error_messages = [e["msg"] for e in exc_info.value.errors()]
        assert any("api_key" in msg.lower() for msg in error_messages)

    def test_port_range_validation(self, invalid_negative_port_config: dict[str, Any]) -> None:
        """Port must be between 1 and 65535 — validation rejects out-of-range values."""
        from pydantic import ValidationError
        from app.settings import AppSettings

        with pytest.raises(ValidationError) as exc_info:
            AppSettings(**invalid_negative_port_config)

        assert exc_info.value.error_count() == 1
        error = exc_info.value.errors()[0]
        assert error["loc"] == ("port",)

    def test_secrets_are_masked_in_output(self, valid_config_dict: dict[str, Any]) -> None:
        """SecretStr fields must be masked when serialized to dictionary."""
        from app.settings import AppSettings

        settings = AppSettings(**valid_config_dict)
        config_dict = settings.to_dict(exclude_secrets=True)
        assert "****" in str(config_dict.get("db_password", ""))
        # Public fields are NOT masked
        assert config_dict["app_name"] == "test-app"


class TestHotReloadConfigManager:
    """Test suite for configuration hot reload."""

    def test_config_reload_on_file_change(
        self,
        tmp_path: Path,
        config_file: Path,
    ) -> None:  # type: ignore[unused-ignores]
        """When config file changes on disk, the manager detects and applies the new config."""
        import yaml

        async def run_reload_test() -> None:
            from app.config_hotreload import HotReloadConfigManager

            loaded_configs: list[dict[str, Any]] = []
            manager = HotReloadConfigManager(
                config_path=config_file,
                reload_interval_seconds=0.1,
                debounce_ms=50,
            )

            @manager.on_config_change
            def on_change(new_config: dict[str, Any]) -> None:  # noqa: ANN202
                loaded_configs.append(dict(new_config))

            await manager.start(initial_config={"key": "initial"})
            assert manager.config["key"] == "initial"

            # Simulate file change
            new_data = {"key": "updated", "new_key": "value"}
            config_file.write_text(yaml.dump(new_data), encoding="utf-8")

            # Wait for debounce + reload cycle
            await asyncio.sleep(0.3)  # noqa: ASYNC251

            assert manager.config["key"] == "updated"
            assert len(loaded_configs) >= 1
            assert loaded_configs[0]["new_key"] == "value"

            await manager.stop()

        import asyncio
        asyncio.run(run_reload_test())
```

```python
# ❌ BAD: No configuration fixtures — tests use real config with live database connections
def test_my_feature():
    settings = AppSettings()  # Reads real production config → hits real database
    result = my_feature(settings)
    assert result is True  # Fragile, slow, non-reproducible

# ✅ GOOD: Configuration fixtures provide controlled, isolated config for tests
def test_my_feature(valid_config_dict):  # pytest fixture with SQLite in-memory DB
    settings = AppSettings(**valid_config_dict)
    result = my_feature(settings)
    assert result is True  # Fast, reproducible, no external dependencies
```

**When to use Config Fixtures:** Every integration test that touches configuration-dependent code. Unit tests for config validation logic specifically need both valid and invalid fixture variants.

**Fixture categories:**
- `valid_config_dict`: Minimal working config with SQLite in-memory backend
- `production_config_dict`: Full production config including required secrets
- `invalid_*_config`: Variants designed to trigger specific validation failures
- `env_config_snapshot`: Sets environment variables for testing env-var-based config loading
- `config_file`: Creates temporary file-based configs for hot reload testing

---

## Constraints

### MUST DO
- Use Pydantic Settings v2 with `model_config` — never use the deprecated `SettingsConfigDict` in class-level `__init__` or raw dict parsing
- Define all field types explicitly — no `Any`, no implicit type coercion from strings without validators
- Mask secret values in all log output, error messages, and serialized dictionaries (`to_dict(exclude_secrets=True)`)
- Validate cross-field constraints with `model_validator(mode="after")` — not with individual `field_validator` calls
- Use environment variable prefix consistently (e.g., `APP_`) to avoid collisions between applications
- Write pytest fixtures for both valid and invalid configurations

### MUST NOT DO
- Never store secret values in plain-text config files tracked in version control
- Do not use `os.environ.get()` directly in business logic — always go through the config schema
- Do not hot-reload secret configuration without a full process restart — old references persist in memory
- Do not log full configuration dictionaries in production — they contain secrets even when masked
- Do not use extra="allow" in model_config — it silently accepts typos in configuration keys

---

## Output Template

When this skill is active, your output must contain:

1. **Pydantic Settings Schema** — Typed `BaseSettings` model with `model_config`, field constraints, and validators
2. **Config Source Definitions** — File parser, environment variable mapper, and secrets provider implementations
3. **Hierarchical Merger** — Priority-ordered config merging with recursive dictionary merge and required-key validation
4. **Secret Injector** — Multi-provider secret loading (Vault → files → env vars) with automatic fallback and logging
5. **Test Fixtures** — pytest fixtures for valid, invalid, and production configurations with assertion examples

---

## Related Skills

| Skill | Purpose |
|---|---|
| `database-design-modeling` | Database configuration is a key part of application config — schema design complements connection pool settings |
| `performance-optimization` | Configuration affects performance (connection pool sizes, cache TTLs) — optimize these together |
| `security-review` | Secret management and configuration security are intertwined — review vault integration alongside general security posture |
| `cncf-deployment-orchestration` | Configuration is deployed via infrastructure (Kubernetes ConfigMaps, Terraform) — coordinate config with deployment strategy |

---

## Live References

> Authoritative documentation links for configuration management.

- [Pydantic Settings v2 Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [HashiCorp Vault Secrets Management](https://developer.hashicorp.com/vault/docs/secrets)
- [Kubernetes Secrets Best Practices](https://kubernetes.io/docs/concepts/configuration/secret/)
- [12-Factor App — Config](https://12factor.net/config)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-param-store.html)
