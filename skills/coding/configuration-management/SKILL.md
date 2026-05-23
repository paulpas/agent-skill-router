---
name: configuration-management
description: Implements production configuration management with layered config resolution, secret rotation, dynamic reloading without downtime, drift detection, and validated environment-specific configuration trees for application systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: configuration management, config tree, layered config, secret rotation, Vault integration, dynamic reloading, hot reload, configuration drift, environment configs, config validation, sealed secrets, how do i manage application config, configuration drift detection, runtime config changes
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-production-readiness, linux-configuration-management, cncf-consul, coding-security-review
---

# Configuration Management Framework

Implements production-grade configuration management that handles layered resolution, secret lifecycle management, dynamic reloading without service interruption, drift detection and reconciliation, and validated environment-specific configuration trees. This skill makes the model design configuration systems where changes propagate safely, secrets are never stored in plaintext, and every configuration change is auditable and reversible — treating configuration as deployable infrastructure rather than ad-hoc environment variables.

## TL;DR Checklist

- [ ] Define a layered config resolution order: defaults → env file → runtime overrides → feature flags
- [ ] Validate ALL configuration at startup — fail fast if required keys are missing or values are out of range
- [ ] Store secrets exclusively in a secret manager (Vault, AWS Secrets Manager) — never in code, YAML, or env files
- [ ] Implement dynamic reloading for non-secret config with graceful transition (no dropped requests)
- [ ] Add drift detection: compare running config against source-of-truth on a scheduled interval
- [ ] Log every configuration change with who/what changed it, the old value, and the new value

---

## When to Use

Use this skill when:

- Designing a configuration system for a distributed application that runs across multiple environments (dev, staging, production)
- Implementing secret rotation policies that rotate API keys, database credentials, or TLS certificates without service interruption
- Building dynamic configuration reloading so operators can tune parameters (feature flags, rate limits, timeouts) without redeploying services
- Detecting and correcting configuration drift between the source-of-truth repository and actual running configurations
- Consolidating scattered environment variables into a structured, typed, validated configuration tree
- Designing a feature flag system that controls behavior changes independently of code deployments

---

## When NOT to Use

Avoid this skill for:

- Simple scripts with no configuration needs — inline constants are fine for <10 line utilities
- Infrastructure-as-code provisioning (Terraform modules, Ansible playbooks) — use IaC-specific tools instead
- Database-level configuration (Postgresql.conf tuning, MySQL my.cnf) — use database-native tools
- Kubernetes native secrets and ConfigMaps as the sole storage mechanism in production — K8s native stores lack secret rotation, audit trails, and centralized management that a proper Vault-based system provides

---

## Core Workflow

1. **Define Configuration Schema** — Create typed configuration models with all required keys, optional keys, default values, validation constraints (min/max/regex), and type hints. Separate config into logical groups: database credentials, API keys, feature flags, runtime tuning parameters. Every field must have a clear purpose documented as a comment or docstring. **Checkpoint:** Run the schema against every environment's configuration file to verify all required fields are present and types match before deployment.

2. **Implement Layered Resolution** — Build a configuration resolver that merges layers in priority order (lowest to highest):
   - Layer 1: Compile-time defaults baked into the codebase
   - Layer 2: Environment-specific YAML/JSON config files (one per environment)
   - Layer 3: Secret manager references (Vault paths, AWS Secrets Manager ARNs) — resolved at runtime, never cached in plaintext across restarts longer than needed
   - Layer 4: Runtime overrides from environment variables or admin API calls
   **Checkpoint:** The merged configuration must pass schema validation. If any layer introduces an invalid value, the resolver must reject it with a specific error identifying the failing field and layer.

3. **Implement Secret Management** — Secrets (passwords, API keys, TLS private keys) are fetched from a dedicated secret manager at startup and refreshed on a configurable schedule. Never store secrets in config files, environment variables visible to all processes, or code repositories. Use short-lived tokens where possible. When rotating a secret, the system must support simultaneous old-and-new credential periods for zero-downtime rotation.

4. **Implement Dynamic Reloading** — Non-secret configuration changes should be hot-reloadable without service restart. Use a file watcher or config server subscription to detect changes, apply them atomically (swap the entire config object), and notify running components of the change via an update channel. For stateful operations (e.g., open database connections), coordinate with the config change to close stale connections before applying new values. **Checkpoint:** After a reload completes, verify the old configuration object is fully dereferenced — no dangling references in active request handlers.

5. **Implement Drift Detection** — On a scheduled interval (e.g., every 5 minutes), compare the running configuration against the source-of-truth stored in version control or a config repository. Detect: missing keys, extra unknown keys, value mismatches between expected and actual, secret rotation staleness (last rotated > 90 days ago). When drift is detected, log a warning with the specific differences. Optionally auto-reconcile by applying the source-of-truth config — but require explicit configuration for this mode since automatic reconciliation can mask intentional local overrides.

6. **Audit Every Change** — Log all configuration changes with: timestamp, operator/user identity, change type (new value, updated value, rotated secret), field path, old value (redacted for secrets), new value (redacted for secrets). Store audit logs in an immutable append-only store. For critical config changes (security credentials, network endpoints, rate limits), require dual-approval workflow before applying.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Layered Configuration Resolution with Validation

```python
import os
import logging
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ConfigSchema:
    """Typed configuration schema with validation constraints."""
    required_keys: set = field(default_factory=set)
    default_values: dict = field(default_factory=dict)
    validators: dict = field(default_factory=dict)
    secret_paths: set = field(default_factory=set)


@dataclass
class ConfigSnapshot:
    """Immutable configuration snapshot with metadata."""
    values: dict
    loaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    source_hash: str = ""

    def fingerprint(self) -> str:
        return hashlib.sha256(str(sorted(self.values.items())).encode()).hexdigest()[:16]


class ConfigurationResolver:
    """Resolves layered configuration with validation and secret support.

    Layers (lowest to highest priority):
      1. Compile-time defaults
      2. Environment config files (YAML/JSON)
      3. Secret manager references
      4. Runtime overrides (env vars, API calls)
    """

    def __init__(self, schema: ConfigSchema, secret_provider=None):
        self._schema = schema
        self._secret_provider = secret_provider
        self._layers: list[dict] = []
        self._current_snapshot: Optional[ConfigSnapshot] = None

    def register_layer(self, layer_name: str, values: dict) -> None:
        """Register a configuration layer with a priority name."""
        self._layers.append({"name": layer_name, "values": values})
        # Sort layers by registration order (first registered = lowest priority)

    def resolve(self) -> ConfigSnapshot:
        """Resolve all layers into a validated configuration snapshot.

        Raises ValueError if required keys are missing or validators fail.
        """
        merged = {}

        # Merge layers in order (later layers override earlier ones)
        for layer in sorted(self._layers, key=lambda l: self._layers.index(l)):
            layer_values = dict(layer["values"])
            
            # Resolve secret references before merging
            if self._secret_provider:
                for path in self._schema.secret_paths:
                    if path in layer_values and isinstance(layer_values[path], str):
                        if layer_values[path].startswith("vault://"):
                            secret_name = layer_values[path].replace("vault://", "")
                            resolved = self._secret_provider.fetch(secret_name)
                            layer_values[path] = resolved

            merged.update(layer_values)

        # Apply defaults for missing keys
        for key, default in self._schema.default_values.items():
            merged.setdefault(key, default)

        # Validate required keys
        missing = self._schema.required_keys - set(merged.keys())
        if missing:
            raise ValueError(f"Missing required configuration keys: {sorted(missing)}")

        # Run validators
        for key, validator_fn in self._schema.validators.items():
            if key in merged:
                try:
                    merged[key] = validator_fn(merged[key])
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Validation failed for '{key}': {e}") from e

        snapshot = ConfigSnapshot(
            values=merged,
            source_hash=hashlib.sha256(str(sorted(merged.items())).encode()).hexdigest(),
        )
        self._current_snapshot = snapshot
        logger.info("Configuration resolved with %d keys", len(merged))
        return snapshot

    @property
    def current(self) -> Optional[ConfigSnapshot]:
        return self._current_snapshot
```

### Pattern 2: Secret Rotation with Zero-Downtime Transition (BAD vs. GOOD)

```python
import time
import threading
from typing import Callable, Optional
from datetime import datetime, timezone


# BAD — Naive secret rotation causes brief outages during transition
class BadSecretRotator:
    """Naive approach: immediately replaces the old credential.
    Any in-flight requests using the old credential will fail."""

    def __init__(self):
        self._secret = None

    def rotate(self, new_secret: str) -> None:
        # Immediate replacement — risk of dropping active connections
        self._secret = new_secret  # type: ignore


# GOOD — Dual-credential window ensures zero-downtime rotation
class ZeroDowntimeSecretRotator:
    """Maintains old and new credentials simultaneously during a grace period.

    Rotation workflow:
    1. Fetch new credential from secret manager
    2. Store both old and new (new is primary)
    3. Wait for grace period (e.g., 60 seconds for active connections to drain)
    4. Discard old credential after grace period expires

    During the grace period, both credentials are accepted by downstream services
    that support simultaneous credential windows.
    """

    def __init__(self, secret_name: str, manager, grace_period_seconds: int = 120):
        self._secret_name = secret_name
        self._manager = manager
        self._grace_period = grace_period_seconds
        self._lock = threading.Lock()
        
        # Current credential state
        self._old_credential: Optional[str] = None
        self._new_credential: Optional[str] = None
        self._primary: Optional[str] = None  # Currently active credential
        self._rotation_start: Optional[datetime] = None

    @property
    def current_credential(self) -> Optional[str]:
        """Return the currently active credential for use by clients."""
        with self._lock:
            if self._primary is None:
                return None
            # If grace period expired, old credential was already cleaned up
            return self._primary

    def rotate(self) -> None:
        """Execute a zero-downtime secret rotation.

        1. Fetch new credential from manager
        2. Set it as primary (both accepted during grace period)
        3. Schedule cleanup of old credential after grace period
        """
        with self._lock:
            if self._secret_name not in self._manager.available:
                raise RuntimeError(f"Secret '{self._secret_name}' not available in manager")

            new_value = self._manager.fetch(self._secret_name)
            
            if self._primary is not None:
                # There's an existing credential — keep it as old
                self._old_credential = self._primary

            self._new_credential = new_value
            self._primary = new_value
            self._rotation_start = datetime.now(timezone.utc)

        # Schedule old credential cleanup after grace period
        if self._old_credential is not None:
            timer = threading.Timer(
                self._grace_period,
                self._cleanup_old_credential,
            )
            timer.daemon = True
            timer.start()

        logger.info(
            "Secret rotation started for %s (grace period: %ds)",
            self._secret_name, self._grace_period,
        )

    def _cleanup_old_credential(self) -> None:
        """Remove old credential after grace period expires."""
        with self._lock:
            if self._old_credential is not None and self._new_credential == self._primary:
                logger.info("Grace period expired — cleaning up old credential for %s", self._secret_name)
                self._old_credential = None

    def accept_credential(self, credential: str) -> bool:
        """Check if an incoming credential is valid (either current or old during grace).

        Used by downstream services to validate connections. Returns True if the
        credential matches either the current primary or the old credential
        (during grace period).
        """
        with self._lock:
            return credential == self._primary or (
                self._old_credential is not None and credential == self._old_credential
            )

    def get_rotation_status(self) -> dict:
        """Return current rotation state for monitoring."""
        with self._lock:
            return {
                "has_current": self._primary is not None,
                "has_old_credential": self._old_credential is not None,
                "rotation_started": self._rotation_start.isoformat() if self._rotation_start else None,
                "grace_remaining_seconds": (
                    max(0, self._grace_period - (datetime.now(timezone.utc) - self._rotation_start).total_seconds())
                    if self._rotation_start else self._grace_period
                ),
            }
```

### Pattern 3: Dynamic Configuration Reloader with Graceful Transition

```python
import json
import logging
import hashlib
import time
from pathlib import Path
from typing import Callable, Optional
from datetime import datetime, timezone
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass
class ConfigChange:
    """Describes a configuration change detected by the reloader."""
    field_path: str
    old_value: any
    new_value: any
    changed_at: datetime
    changed_by: str

    def to_log_entry(self) -> dict:
        return {
            "timestamp": self.changed_at.isoformat(),
            "field": self.field_path,
            "old_value": self._redact_if_secret(self.old_value),
            "new_value": self._redact_if_secret(self.new_value),
            "changed_by": self.changed_by,
        }

    @staticmethod
    def _redact_if_secret(value: any) -> str:
        if isinstance(value, str) and len(value) > 4:
            return value[:2] + "****" + value[-2:]
        return str(value)


class ConfigReloader:
    """Hot-reloads non-secret configuration with atomic swap and component notifications.

    Watches a configuration file for changes using checksum comparison.
    When changes are detected, validates the new config, swaps atomically,
    and notifies all registered listeners of the update.
    """

    def __init__(
        self,
        config_path: str,
        validator: Callable[[dict], bool],
        notify_fn: Optional[Callable[[ConfigChange], None]] = None,
        check_interval_seconds: float = 2.0,
    ):
        self._config_path = Path(config_path)
        self._validator = validator
        self._notify_fn = notify_fn or (lambda _: None)
        self._check_interval = check_interval_seconds
        self._current_config: dict = {}
        self._current_hash = ""
        self._running = False
        self._listeners: list[Callable[[dict], None]] = []

    def register_listener(self, callback: Callable[[dict], None]) -> None:
        """Register a component to receive updated configuration."""
        self._listeners.append(callback)

    def start(self) -> None:
        """Start watching for configuration changes. Runs until stop() is called."""
        self._running = True
        logger.info("Config reloader started for %s", self._config_path)

        while self._running:
            try:
                new_hash = self._compute_file_hash()
                if new_hash != self._current_hash:
                    self._apply_new_config()
            except FileNotFoundError:
                logger.warning("Configuration file not found: %s", self._config_path)
            except Exception as e:
                logger.error("Config reload failed: %s", e)

            time.sleep(self._check_interval)

    def stop(self) -> None:
        """Stop the config watcher."""
        self._running = False

    def _compute_file_hash(self) -> str:
        data = self._config_path.read_text()
        return hashlib.sha256(data.encode()).hexdigest()

    def _apply_new_config(self) -> None:
        """Validate and apply new configuration atomically."""
        data = self._config_path.read_text()
        new_config = json.loads(data)

        if not self._validator(new_config):
            logger.error("New configuration failed validation — ignoring change")
            return

        # Detect which fields actually changed
        old_keys = set(self._current_config.keys())
        new_keys = set(new_config.keys())

        for key in old_keys | new_keys:
            old_val = self._current_config.get(key)
            new_val = new_config.get(key)
            if old_val != new_val:
                change = ConfigChange(
                    field_path=key,
                    old_value=old_val,
                    new_value=new_val,
                    changed_at=datetime.now(timezone.utc),
                    changed_by="auto-reloader",
                )
                self._notify_fn(change)

        # Atomic swap
        self._current_config = dict(new_config)
        self._current_hash = hashlib.sha256(data.encode()).hexdigest()

        # Notify all listeners
        for listener in self._listeners:
            try:
                listener(dict(self._current_config))
            except Exception as e:
                logger.error("Config listener notification failed: %s", e)

        logger.info("Configuration updated with %d keys", len(new_config))


class ConfigurationDriftDetector:
    """Detects and reports drift between running config and source-of-truth."""

    def __init__(self, source_getter: Callable[[], dict], running_getter: Callable[[], dict], 
                 reconciler: Optional[Callable[[dict], bool]] = None):
        self._source_getter = source_getter
        self._running_getter = running_getter
        self._reconciler = reconciler

    def check_drift(self, auto_reconcile: bool = False) -> list[dict]:
        """Compare running config against source-of-truth. Returns list of drift entries."""
        source_config = self._source_getter()
        running_config = self._running_getter()

        drifts = []

        all_keys = set(source_config.keys()) | set(running_config.keys())
        for key in sorted(all_keys):
            in_source = key in source_config
            in_running = key in running_config

            if not in_source and in_running:
                drifts.append({
                    "type": "extra_key_in_running",
                    "field": key,
                    "message": f"Key '{key}' exists in running config but not in source-of-truth",
                    "value": str(running_config[key]),
                })
            elif in_source and not in_running:
                drifts.append({
                    "type": "missing_key_from_source",
                    "field": key,
                    "message": f"Key '{key}' is in source-of-truth but missing from running config",
                    "expected_value": str(source_config[key]),
                })
            elif source_config[key] != running_config[key]:
                drifts.append({
                    "type": "value_mismatch",
                    "field": key,
                    "message": f"Value of '{key}' differs between source and running config",
                    "expected_value": str(source_config[key]),
                    "actual_value": str(running_config[key]),
                })

        if drifts and auto_reconcile and self._reconciler:
            logger.warning("Drift detected (%d issues) — attempting reconciliation", len(drifts))
            success = self._reconciler(source_config)
            if not success:
                logger.error("Reconciliation failed — drift remains")

        return drifts
```

---

## Constraints

### MUST DO
- Define a typed configuration schema with explicit default values, required fields, and validators before any code uses configuration values
- Store all secrets in a dedicated secret manager (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager) — never in YAML files, environment variables visible to non-secret services, or code repositories
- Validate the entire resolved configuration at startup — fail loudly if any required value is missing or any validator rejects a value
- Implement atomic configuration swaps during hot-reload — never leave components with partial config updates
- Log every configuration change with timestamp, field path, operator identity, old and new values (redacted for secrets)
- Run drift detection at least every 5 minutes against the source-of-truth configuration store

### MUST NOT DO
- Store plaintext secrets in any configuration file — YAML, JSON, .env, or equivalent
- Use environment variables as the primary secret storage mechanism — they are visible to all processes in the same namespace and lack audit trails
- Apply configuration changes without validation — invalid configs cause silent failures that are harder to debug than startup crashes
- Reload configuration inside a request handler — always queue updates between requests or use a barrier pattern
- Manually edit running server configurations via SSH — every change must go through the configuration management system for auditability and reproducibility

---

## Output Template

When designing or reviewing a configuration management system, produce:

1. **Configuration Schema** — Typed data model with all fields, types, defaults, constraints, and secret path definitions
2. **Layer Resolution Map** — Priority order of all config layers with example values per layer
3. **Secret Management Plan** — Secret provider, rotation schedule, grace period duration, credential acceptance logic during rotation
4. **Dynamic Reload Strategy** — Change detection mechanism (file watcher / HTTP polling / config server), atomic swap approach, listener notification pattern
5. **Drift Detection Schedule** — Check interval, auto-reconcile settings, alerting on detected drift
6. **Audit Log Format** — Structured log schema for configuration changes including all required fields

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-production-readiness` | Configuration deployment criteria and operational checks before production |
| `linux-configuration-management` | System-level configuration (Ansible, Puppet, Chef) complementing application config |
| `cncf-consul` | Service discovery and distributed configuration at the infrastructure level |
| `coding-security-review` | Security review of configuration systems to prevent secret leakage |

---

## Live References

> Authoritative documentation links for configuration management. The model follows markdown links at load time to resolve external references and inline content.

- [HashiCorp Vault Secrets Management Documentation](https://developer.hashicorp.com/vault/docs)
- [Python Dynaconf Configuration Framework](https://www.dynaconf.com/)
- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Configuration Drift Detection Best Practices](https://martinfowler.com/bliki/InfrastructureAsCode.html)
- [Zero-Downtime Secret Rotation Patterns](https://www.vaultproject.io/docs/secrets/transit/transit-overview)
