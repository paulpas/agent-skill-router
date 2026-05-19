---
name: app-configuration-patterns
description: Implements layered configuration loading, secrets management abstraction, feature flag systems with percentage rollouts, and startup validation for production applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: configuration management, environment variables, feature flags, secrets management, config validation, .env files, yaml configuration, config overlay
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: security-review, deployment-patterns, software-design-principles
---

# Configuration Management for Production Applications

Implements layered configuration loading, secrets management abstraction, feature flag evaluation, and startup validation so production applications behave predictably across environments. When this skill is loaded, the model produces concrete configuration code — not abstract "use environment variables" advice.

## TL;DR Checklist

- [ ] Configuration uses a 4-layer precedence: defaults → config files → environment variables → secrets manager
- [ ] All secrets are injected via abstraction (Vault, AWS Secrets Manager, or env vars) — never hardcoded
- [ ] Feature flags support boolean toggles, percentage rollouts, and user-targeted variants
- [ ] Configuration is validated at startup with a single `Config.validate()` call that fails fast on missing required fields
- [ ] `.env` files are listed in `.gitignore` and never committed to version control
- [ ] Hot-reload mechanism exists for feature flags (not for secrets or infrastructure config)

---

## When to Use

- Setting up configuration for a new application or microservice
- Migrating from hardcoded settings to a structured configuration system
- Adding feature flag support for gradual rollout capabilities
- Implementing secrets management that works across local development and production
- Designing configuration validation that catches misconfigurations before the service starts

## When NOT to Use

- For single-use scripts with no persistence between runs — use function arguments instead
- When all configuration is truly static and never changes — a constants module suffices
- For A/B testing of UI elements — use your analytics platform's built-in experiment system, not a config flag
- When the team cannot commit to keeping `.env` out of version control

---

## Core Workflow

1. **Define Configuration Schema** — Create a typed dataclass or Pydantic model that declares every configuration parameter with its type, default value, and environment variable name. Group related settings into nested namespaces (database, cache, feature_flags). **Checkpoint:** Every required field must have either a meaningful default or an explicit marker indicating it requires an environment variable override.

2. **Implement Layered Loading** — Build a loader that merges configuration layers in order: built-in defaults → YAML/JSON config file(s) → environment variables → secrets manager values. Later layers override earlier ones. Use deep merging so partial config files don't overwrite entire sections. **Checkpoint:** Verify that environment variable names follow `APP_<SECTION>__<FIELD>` convention with double underscore for nested fields.

3. **Integrate Secrets Abstraction** — Create a secrets manager interface that abstracts the underlying provider (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, or plain env vars for development). The abstraction should support reading individual secrets and secret rotation without changing application code. **Checkpoint:** Confirm that no secret value is ever stored in memory longer than needed — clear references after use where possible.

4. **Validate at Startup** — Before the service starts accepting traffic, validate all required configuration fields are present and valid (e.g., database URL format, port range, SSL certificate paths). Fail immediately with a clear error message listing every invalid field. **Checkpoint:** Validation must run before any dependency initialization so you don't waste time starting services that will fail.

5. **Implement Feature Flag Evaluation** — Create a flag evaluation system that supports boolean toggles, percentage-based rollouts (hash-based for consistency), and user-targeted overrides. Evaluate flags with minimal overhead — cache results per request. **Checkpoint:** Percentage rollouts must be consistent per user ID within a single flag version — the same user always sees the same result.

---

## Implementation Patterns

### Pattern 1: Layered Configuration Loader with Deep Merge

Configuration loads from four layers in precedence order. Later layers override earlier ones using deep merge for nested dictionaries. Environment variables use double-underscore notation for nesting: `APP_DATABASE__HOST`.

```python
# ❌ BAD: Flat configuration with hardcoded defaults — no layering, no validation
DATABASE_URL = "postgresql://localhost:5432/mydb"
API_PORT = 8080
DEBUG = True
SECRET_KEY = "my-secret-key-123"  # Hardcoded secret!
FEATURE_NEW_CHECKOUT = False
```

```python
# ✅ GOOD: Layered configuration with deep merge and validation
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


class SecretsProvider(Protocol):
    """Abstraction for secrets management systems."""

    def get(self, key: str) -> str | None:
        """Retrieve a secret by its key name.

        Args:
            key: The secret identifier (e.g., 'database.password').

        Returns:
            The secret value, or None if the key does not exist.
        """
        ...


class EnvVarSecretsProvider:
    """Reads secrets from environment variables — suitable for development."""

    def __init__(self, prefix: str = "SECRET_") -> None:
        self._prefix = prefix

    def get(self, key: str) -> str | None:
        """Map 'database.password' → os.environ.get('SECRET_DATABASE_PASSWORD')."""
        env_key = f"{self._prefix}{key.upper().replace('.', '_')}"
        return os.environ.get(env_key)


@dataclass(frozen=True)
class ConfigValidationError:
    """Represents a single configuration validation failure."""

    field: str
    message: str


@dataclass
class DatabaseConfig:
    """Database connection configuration.

    Attributes:
        host: Database server hostname or IP address.
        port: Database server port number.
        name: Database schema name.
        user: Connection username.
        password: Connection password — loaded from secrets manager.
        pool_size: Number of connections in the connection pool (1-20).
        ssl_mode: SSL/TLS mode: 'disable', 'prefer', 'require', or 'verify-full'.
    """

    host: str = "localhost"
    port: int = 5432
    name: str = "app_db"
    user: str = "app_user"
    password: str = ""
    pool_size: int = 10
    ssl_mode: str = "prefer"

    def __post_init__(self) -> None:
        if not (1 <= self.pool_size <= 20):
            raise ValueError(f"pool_size must be between 1 and 20, got {self.pool_size}")
        valid_modes = {"disable", "prefer", "require", "verify-full"}
        if self.ssl_mode not in valid_modes:
            raise ValueError(f"ssl_mode must be one of {valid_modes}, got {self.ssl_mode}")


@dataclass
class FeatureFlagConfig:
    """Feature flag system configuration.

    Attributes:
        enabled: Whether the feature flag system is active.
        cache_ttl_seconds: How long to cache flag evaluation results.
    """

    enabled: bool = True
    cache_ttl_seconds: int = 60


@dataclass
class AppConfig:
    """Top-level application configuration with layered loading support.

    Attributes:
        app_name: Application identifier used in logs and metrics.
        environment: Current deployment environment ('development', 'staging', 'production').
        debug: Enable debug mode (stack traces, verbose logging).
        database: Database connection settings.
        feature_flags: Feature flag system settings.
    """

    app_name: str = "my-application"
    environment: str = "development"
    debug: bool = False
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    feature_flags: FeatureFlagConfig = field(default_factory=FeatureFlagConfig)

    def validate(self) -> list[ConfigValidationError]:
        """Validate all configuration fields and return any errors.

        Returns:
            List of validation errors — empty if configuration is valid.
        """
        errors: list[ConfigValidationError] = []

        if not self.app_name.strip():
            errors.append(ConfigValidationError("app_name", "Must not be empty"))

        valid_envs = {"development", "staging", "production"}
        if self.environment not in valid_envs:
            errors.append(
                ConfigValidationError(
                    "environment", f"Must be one of {valid_envs}"
                )
            )

        if not self.database.password and self.environment == "production":
            errors.append(
                ConfigValidationError(
                    "database.password", "Required in production environment"
                )
            )

        return errors


class ConfigLoader:
    """Loads configuration from multiple layers with deep merge precedence.

    Layer precedence (lowest to highest):
      1. Built-in defaults (dataclass default values)
      2. YAML/JSON config file(s)
      3. Environment variables
      4. Secrets manager values
    """

    def __init__(self, config_file: Path | None = None) -> None:
        self._config_file = config_file
        self._secrets_provider: SecretsProvider | None = None

    def with_secrets(self, provider: SecretsProvider) -> ConfigLoader:
        """Attach a secrets provider as the highest-precedence layer.

        Args:
            provider: Any object implementing the SecretsProvider protocol.

        Returns:
            self for method chaining.
        """
        self._secrets_provider = provider
        return self

    def load(self) -> AppConfig:
        """Load and merge configuration from all layers.

        Returns:
            Fully merged AppConfig instance with validated defaults.

        Raises:
            FileNotFoundError: If the specified config file does not exist.
        """
        # Layer 1: Built-in defaults
        config = self._deep_merge(
            {},
            {
                "app_name": "my-application",
                "environment": "development",
                "debug": False,
                "database": {
                    "host": "localhost",
                    "port": 5432,
                    "name": "app_db",
                    "user": "app_user",
                    "password": "",
                    "pool_size": 10,
                    "ssl_mode": "prefer",
                },
                "feature_flags": {"enabled": True, "cache_ttl_seconds": 60},
            },
        )

        # Layer 2: Config file overrides (YAML or JSON)
        if self._config_file and self._config_file.exists():
            file_config = self._load_config_file(self._config_file)
            config = self._deep_merge(config, file_config)

        # Layer 3: Environment variable overrides
        env_config = self._load_environment_variables()
        config = self._deep_merge(config, env_config)

        # Layer 4: Secrets manager (highest precedence for secrets only)
        if self._secrets_provider:
            secret_config = self._load_secrets()
            config = self._deep_merge(config, secret_config)

        return self._dict_to_config(config)

    @staticmethod
    def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
        """Recursively merge two dictionaries. Values in override take precedence."""
        result = base.copy()
        for key, value in override.items():
            if (
                key in result
                and isinstance(result[key], dict)
                and isinstance(value, dict)
            ):
                result[key] = ConfigLoader._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    @staticmethod
    def _load_config_file(path: Path) -> dict[str, Any]:
        """Load configuration from a YAML or JSON file."""
        if path.suffix in (".yaml", ".yml"):
            import yaml

            with open(path) as f:
                return yaml.safe_load(f) or {}
        elif path.suffix == ".json":
            with open(path) as f:
                return json.load(f)
        else:
            raise ValueError(f"Unsupported config file format: {path.suffix}")

    @staticmethod
    def _load_environment_variables() -> dict[str, Any]:
        """Parse environment variables matching APP_* convention into nested dict.

        Convention: APP_<SECTION>__<FIELD> → {"section": {"field": value}}
        Double underscore separates nested levels. Single values (no underscore)
        are placed at the top level under their key name.
        """
        result: dict[str, Any] = {}
        prefix = "APP_"

        for env_key, env_value in os.environ.items():
            if not env_key.startswith(prefix):
                continue

            # Remove prefix and split remaining path by double underscore
            remainder = env_key[len(prefix) :]
            parts = remainder.lower().replace("_", "__").split("__")

            current = result
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = ConfigLoader._coerce_type(env_value)

        return result

    @staticmethod
    def _load_secrets() -> dict[str, Any]:
        """Load secret values from the secrets provider.

        Returns:
            Dict mapping secret keys to their resolved values.
        """
        raise NotImplementedError(
            "Set a SecretsProvider via ConfigLoader.with_secrets() before calling load()"
        )

    @staticmethod
    def _coerce_type(value: str) -> Any:
        """Attempt to coerce string environment variable to appropriate Python type."""
        if value.lower() in ("true", "yes"):
            return True
        if value.lower() in ("false", "no"):
            return False
        try:
            return int(value)
        except ValueError:
            pass
        try:
            return float(value)
        except ValueError:
            pass
        return value

    @staticmethod
    def _dict_to_config(d: dict[str, Any]) -> AppConfig:
        """Convert a nested dictionary to an AppConfig instance."""
        db_dict = d.get("database", {})
        ff_dict = d.get("feature_flags", {})

        return AppConfig(
            app_name=d.get("app_name", "my-application"),
            environment=d.get("environment", "development"),
            debug=d.get("debug", False),
            database=DatabaseConfig(**db_dict),
            feature_flags=FeatureFlagConfig(**ff_dict),
        )
```

---

### Pattern 2: Feature Flag Evaluation with Percentage Rollouts

Feature flags support three evaluation modes: always-on/off (boolean), percentage-based rollout (consistent per user ID via hashing), and targeted overrides (specific user IDs or segments).

```python
# ❌ BAD: Simple boolean flag — no rollout capability, no audit trail
NEW_CHECKOUT_ENABLED = os.environ.get("NEW_CHECKOUT", "false").lower() == "true"
if NEW_CHECKOUT_ENABLED:
    use_new_checkout_flow()
else:
    use_legacy_checkout_flow()
```

```python
# ✅ GOOD: Full feature flag system with boolean, percentage, and targeted evaluation
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class FlagVariant(Enum):
    """Possible states for a feature flag variant."""

    ON = "on"
    OFF = "off"
    PERCENTAGE = "percentage"
    TARGETED = "targeted"


@dataclass
class FlagRule:
    """A single rule within a feature flag evaluation.

    Attributes:
        variant: The type of evaluation this rule performs.
        percentage: For PERCENTAGE variants — rollout percentage (0-100).
        target_user_ids: For TARGETED variants — set of user IDs to enable for.
        target_segments: For TARGETED variants — segments like 'beta_testers'.
    """

    variant: FlagVariant
    percentage: int = 0
    target_user_ids: set[str] = field(default_factory=set)
    target_segments: set[str] = field(default_factory=set)


@dataclass
class FeatureFlag:
    """Feature flag definition with rules and metadata.

    Attributes:
        name: Unique flag identifier (e.g., 'new_checkout_flow').
        description: Human-readable purpose of this flag.
        enabled: Whether the entire flag is active (all other rules ignored if False).
        default_variant: Variant returned when no rule matches the user.
        rules: Ordered list of evaluation rules — first match wins.
    """

    name: str
    description: str
    enabled: bool = True
    default_variant: FlagVariant = FlagVariant.OFF
    rules: list[FlagRule] = field(default_factory=list)

    def evaluate(self, user_id: str | None = None, segments: set[str] | None = None) -> FlagVariant:
        """Evaluate this flag for a specific user.

        Evaluation order:
          1. If flag is disabled globally → OFF
          2. First matching rule wins (ordered list)
             - TARGETED rules match by user_id or segment membership
             - PERCENTAGE rules use consistent hashing on user_id
          3. Fall through to default_variant

        Args:
            user_id: Unique user identifier for per-user evaluation.
            segments: User's assigned segments (e.g., {'beta_testers'}).

        Returns:
            FlagVariant indicating whether the feature is ON or OFF for this user.
        """
        if not self.enabled:
            return FlagVariant.OFF

        segments = segments or set()

        for rule in self.rules:
            if rule.variant == FlagVariant.TARGETED:
                if user_id and user_id in rule.target_user_ids:
                    return FlagVariant.ON
                if rule.target_segments & segments:
                    return FlagVariant.ON

            elif rule.variant == FlagVariant.PERCENTAGE:
                if user_id:
                    hash_value = self._hash_percentage(user_id, rule.percentage)
                    if hash_value < rule.percentage:
                        return FlagVariant.ON

        return self.default_variant

    @staticmethod
    def _hash_percentage(user_id: str, percentage: int) -> int:
        """Compute a consistent 0-99 hash value for a user ID.

        Uses SHA256 hashing to ensure the same user always gets the same
        bucket within a given percentage setting. This provides consistent
        rollout — a user sees the same feature on every page load.

        Args:
            user_id: The unique user identifier string.
            percentage: Rollout percentage (0-100) used as hash upper bound.

        Returns:
            Integer in range [0, 99] representing the bucket.
        """
        hash_bytes = hashlib.sha256(f"flag:{user_id}".encode()).digest()
        hash_int = int.from_bytes(hash_bytes[:4], byteorder="big")
        return hash_int % 100


class FeatureFlagService:
    """Manages feature flags with evaluation, caching, and percentage rollout.

    Thread-safe for concurrent flag evaluation during request handling.
    Flag definitions are loaded at startup from a config source (file, database,
    or remote service) and cached for the duration of the process.
    """

    def __init__(self, flags: dict[str, FeatureFlag] | None = None) -> None:
        self._flags: dict[str, FeatureFlag] = flags or {}
        self._cache: dict[tuple[str, str], tuple[FlagVariant, float]] = {}
        self._cache_ttl_seconds: int = 60

    def register_flag(self, flag: FeatureFlag) -> None:
        """Register a feature flag definition.

        Args:
            flag: The flag to register. Will replace any existing flag with the same name.
        """
        self._flags[flag.name] = flag

    def evaluate(
        self,
        flag_name: str,
        user_id: str | None = None,
        segments: set[str] | None = None,
    ) -> FlagVariant:
        """Evaluate a registered feature flag for a specific user.

        Results are cached per (flag_name, user_id) pair to avoid re-evaluating
        the same flag for the same user within the cache TTL window.

        Args:
            flag_name: The name of the flag to evaluate.
            user_id: Unique user identifier (required for percentage flags).
            segments: User's segment memberships.

        Returns:
            FlagVariant — ON or OFF.

        Raises:
            KeyError: If the flag_name is not registered.
        """
        if flag_name not in self._flags:
            raise KeyError(f"Feature flag '{flag_name}' not registered")

        # Check cache for anonymous users (no caching since no user_id)
        if user_id:
            cache_key = (flag_name, user_id)
            cached_result, cached_time = self._cache.get(cache_key, (None, 0))
            if cached_result is not None and (time.time() - cached_time) < self._cache_ttl_seconds:
                return cached_result

        result = self._flags[flag_name].evaluate(user_id=user_id, segments=segments)

        # Cache the result for subsequent calls
        if user_id:
            self._cache[(flag_name, user_id)] = (result, time.time())

        return result

    def is_enabled(
        self,
        flag_name: str,
        user_id: str | None = None,
        segments: set[str] | None = None,
    ) -> bool:
        """Convenience method: returns True if the flag variant is ON.

        Args:
            flag_name: The name of the flag to evaluate.
            user_id: Unique user identifier for percentage-based flags.
            segments: User's segment memberships.

        Returns:
            True if the feature is enabled for this user, False otherwise.
        """
        return self.evaluate(flag_name, user_id=user_id, segments=segments) == FlagVariant.ON


# --- Example Usage ---

def setup_flags() -> FeatureFlagService:
    """Create and register all application feature flags."""
    service = FeatureFlagService()

    # Boolean flag — always on or off globally
    service.register_flag(
        FeatureFlag(
            name="maintenance_mode",
            description="Global maintenance mode — disables non-essential features",
            enabled=True,
            default_variant=FlagVariant.OFF,
        )
    )

    # Percentage rollout flag — 25% of users see new checkout
    service.register_flag(
        FeatureFlag(
            name="new_checkout_flow",
            description="New streamlined checkout with fewer steps",
            enabled=True,
            default_variant=FlagVariant.OFF,
            rules=[
                FlagRule(
                    variant=FlagVariant.PERCENTAGE,
                    percentage=25,  # 25% of users get the new flow
                )
            ],
        )
    )

    # Targeted flag — specific users and beta segment
    service.register_flag(
        FeatureFlag(
            name="dark_mode_ui",
            description="Dark mode user interface option",
            enabled=True,
            default_variant=FlagVariant.OFF,
            rules=[
                FlagRule(
                    variant=FlagVariant.TARGETED,
                    target_user_ids={"user-12345", "user-67890"},
                    target_segments={"beta_testers", "internal"},
                )
            ],
        )
    )

    return service
```

---

## Constraints

### MUST DO
- Use layered configuration with clear precedence: defaults → files → env vars → secrets manager
- Validate all required configuration at startup before any dependency initialization
- Store secret values separately from regular configuration — never in config files committed to git
- Use `.env` files only for local development — never commit them to version control (add to `.gitignore`)
- Name environment variables with clear prefix: `APP_<SECTION>__<FIELD>` for nested config
- Feature flag percentage rollouts must be deterministic — same user_id always gets same result via hashing
- Cache feature flag evaluation results to avoid re-computation within a request lifecycle
- Fail fast on invalid configuration — do not silently fall back to defaults for required fields
- Document every configuration field with its purpose, type, default value, and environment variable name

### MUST NOT DO
- Hardcode API keys, passwords, tokens, or connection strings in source code
- Use `os.environ['REQUIRED_VAR']` without a default — use `.get()` with validation instead
- Store secrets in plain text config files (.yaml, .json) committed to version control
- Implement percentage rollouts using `random.random()` — it produces inconsistent results across restarts
- Load all feature flag definitions on every request without caching — causes unnecessary overhead
- Use boolean-only flags for user-facing features that need gradual rollout
- Put high-cardinality data (user IDs, IPs) in configuration field names or metric labels

---

## Output Template

When implementing or reviewing configuration management code, produce:

1. **Configuration Schema** — Typed dataclass or Pydantic model with all fields, defaults, and environment variable mappings
2. **Layer Order Specification** — Explicit precedence order from lowest to highest priority
3. **Validation Rules** — All field-level validation constraints (type, range, required) with error messages
4. **Secrets Abstraction** — Interface definition showing how secrets are loaded independently of regular config
5. **Feature Flag Definitions** — Each flag's name, purpose, evaluation rules, and rollout percentage

---

## Related Skills

| Skill                    | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `security-review`        | Audit configuration for exposed secrets and insecure defaults |
| `deployment-patterns`    | Coordinate config changes across environments during deployments |
| `software-design-principles` | Design clean boundaries between configuration consumers and loaders |
