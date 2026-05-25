---
name: framework-adaptation
description: Evaluates and integrates new frameworks into existing projects using
  adapter patterns, progressive migration strategies, and dependency boundary isolation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework adaptation, library integration, new framework, dependency evaluation,
    tech stack upgrade, adapter pattern, facade pattern, progressive migration
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
  related-skills: version-migration, dependency-conflict-resolution, architecture-review
------
# Framework Adaptation & Integration

When loaded, this skill makes the model evaluate and integrate new frameworks into existing projects using adapter patterns, progressive migration strategies (Strangler Fig), and dependency boundary isolation. The model produces a dependency analysis, type-safe adapter interfaces, a step-by-step migration plan with feature flags for rollback, and a validation strategy using shadow reads or dual-write comparison.

## TL;DR Checklist

- [ ] Map current framework usage — identify every import, call site, and integration point in the codebase
- [ ] Evaluate peer dependency conflicts between old and new frameworks before writing any integration code
- [ ] Define an adapter interface that abstracts both old and new implementations behind a single type-safe contract
- [ ] Implement progressive migration using Strangler Fig — migrate one responsibility at a time behind feature flags
- [ ] Set up shadow read or dual write validation to compare outputs from both implementations side-by-side
- [ ] Document breaking changes and rollback criteria for every migration step before proceeding

---

## When to Use

Use this skill when:

- Integrating a new ORM (e.g., replacing SQLAlchemy with Prisma, or Sequelize with Drizzle) into an existing project that has active database operations
- Replacing a deprecated library with a modern alternative without rewriting the entire module — for example, swapping `moment.js` for `date-fns` across a large codebase
- Adding a new AI/ML framework (LangChain, LlamaIndex) to a service that does not currently use ML but needs it as a capability
- Evaluating whether a newer major version of a dependency should replace the current one mid-sprint without risking regressions
- Adopting a new HTTP client (e.g., migrating from `axios` to `ofetch` or `ky`) across a service with dozens of API calls

---

## When NOT to Use

Avoid this skill for:

- The project is in a code freeze or actively responding to a critical production incident — defer framework changes until stability returns
- The candidate framework has not reached stable release (pre-1.0 libraries without strong community backing and active maintenance)
- Simple configuration changes can solve the problem — do not introduce new dependencies for config-level fixes; use environment variables or configuration files instead
- You are replacing the entire tech stack — in that case, plan a full rewrite or greenfield project instead of incremental adaptation

---

## Core Workflow

### 1. Dependency Impact Analysis

Map every usage of the current framework across the codebase before making changes.

**Actions:**
- Run a grep/search for all imports and requires of the old framework — capture file paths and line numbers
- Identify integration points: where framework types enter your domain layer, where raw framework responses are exposed to the outside world
- Classify each usage by risk level:
  - **Critical**: Handles user input or financial data (e.g., database ORM calls in transaction handlers)
  - **High**: Core business logic that affects downstream services
  - **Medium**: Internal tooling, admin panels, or non-user-facing utilities
  - **Low**: Logging, telemetry, or optional features

**Checkpoint:** You have a complete map of every import site and its risk classification. No usage should be undiscovered.

### 2. Compatibility Matrix Evaluation

Build a version compatibility matrix between the old and new frameworks.

**Actions:**
- List the current framework's version range and all peer dependency constraints from `package.json` or `requirements.txt`
- Check the new framework's requirements against those constraints — look for version conflicts on shared dependencies (e.g., both frameworks requiring different versions of a serialization library)
- Identify polyfills or shims needed for missing features in the target framework version
- Review the new framework's changelog for breaking changes in each major version since your current one

**Checkpoint:** You have identified all dependency conflicts and resolved them — no transitive version collisions remain.

### 3. Adapter Interface Design

Define a type-safe abstraction layer BEFORE writing any integration code. This is the most critical step — it isolates domain logic from framework-specific APIs.

**Actions:**
- Extract the operations your domain code actually needs from the framework (not all of its methods — only the ones you use)
- Define an interface or abstract class that captures these operations with strong typing
- Ensure both old and new implementations satisfy this interface identically — same method signatures, same return types, same error contracts

**Checkpoint:** Both the existing implementation and a stub of the new implementation compile/type-check against this interface. If they do not, revise the interface until they do.

### 4. Strangler Fig Implementation

Migrate incrementally — one responsibility or endpoint at a time using the Strangler Fig pattern.

**Actions:**
- Identify the first boundary to strangle: pick a single module, route group, or data access layer (start with LOW or MEDIUM risk)
- Implement the new framework's adapter behind the interface defined in Step 3
- Wire both implementations behind a feature flag (see Pattern 2) — default to the old implementation until validated
- Run dual-write or shadow-read validation on the migrated boundary before flipping the flag

**Checkpoint:** The migrated boundary produces identical output from both implementations under your test suite. Do not flip the feature flag until this is confirmed.

### 5. Feature Flag Toggle & Progressive Rollout

Gate every framework switch behind a feature flag to enable immediate rollback.

**Actions:**
- Implement a configuration-driven router that selects between old and new implementations based on an environment variable or config key
- Start with a canary rollout: route 1% of traffic, then 5%, 25%, 50%, 100% — monitoring error rates at each step
- Define rollback triggers: if error rate increases by more than the defined threshold (e.g., >0.5% p99 latency increase), revert immediately
- Keep the old implementation code in place until ALL traffic has been validated on the new one for at least 48 hours

**Checkpoint:** Feature flags are in place, rollback procedure is tested, and monitoring alerts are configured for both implementations.

### 6. Decommission & Verify

Remove legacy code only after full migration is confirmed.

**Actions:**
- Remove the old framework's adapter implementation and its feature flag branch
- Uninstall or downgrade the old framework from dependencies — run `npm audit`, `pip check`, or equivalent to verify no hidden transitive pulls remain
- Update integration tests to target only the new implementation
- Document the migration in architecture decision records (ADRs) with before/after comparison

**Checkpoint:** The codebase contains zero imports of the old framework. All tests pass against the new implementation exclusively.

---

## Implementation Patterns

### Pattern 1: Adapter Interface Pattern

The adapter interface isolates domain logic from framework-specific APIs. Both old and new implementations must satisfy this contract identically. This pattern ensures that switching frameworks only requires swapping the concrete implementation — zero changes to calling code.

**TypeScript Example — Data Store Adapter:**

```typescript
/**
 * Type-safe adapter interface for data store operations.
 * Domain logic depends on this interface, not on any specific framework.
 */
interface DataStoreAdapter {
  /** Retrieve a value by key. Returns null if the key does not exist. */
  get<T = unknown>(key: string): Promise<T | null>;

  /** Store a value under the given key with optional TTL in seconds. */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /** Delete a key. Resolves even if the key does not exist. */
  delete(key: string): Promise<void>;

  /** Check whether a key exists without fetching its value. */
  exists(key: string): Promise<boolean>;

  /** Bulk retrieve multiple keys in a single call. */
  mget<T = unknown>(keys: string[]): Promise<(T | null)[]>;
}

/** Legacy implementation using ioredis (existing Redis client). */
class LegacyRedisAdapter implements DataStoreAdapter {
  constructor(private readonly client: RedisClient) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new DataStoreError(`Invalid JSON for key "${key}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    const rawValues = await this.client.mget(keys);
    return rawValues.map((raw): T | null => {
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null; // Best-effort: skip corrupted entries
      }
    });
  }
}

/** New implementation using redis v4 client with typed commands. */
class ModernRedisAdapter implements DataStoreAdapter {
  constructor(private readonly client: RedisClient) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(key, { EXAT: undefined });
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new DataStoreError(`Invalid JSON for key "${key}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const opts: Record<string, number> = {};
    if (ttlSeconds) opts.EX = ttlSeconds;
    await this.client.set(key, serialized, Object.keys(opts).length > 0 ? opts : undefined);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    const rawValues = await this.client.mGet(keys);
    return rawValues.map((raw): T | null => {
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    });
  }
}

/** Custom error type for data store failures. */
class DataStoreError extends Error {
  constructor(message: string, public readonly key?: string) {
    super(message);
    this.name = 'DataStoreError';
  }
}
```

**Why this works:** Domain code calls `store.get<T>("user:123")` without knowing whether it hits Redis v3 or v4 APIs. Swapping implementations is a single-line change in the dependency injection container — no touching of business logic.

---

### Pattern 2: Progressive Migration with Feature Flags

Feature-gated framework switching enables gradual rollout and instant rollback. The router pattern above lets you migrate one responsibility at a time without affecting other parts of the system.

**Python Example — Framework Router with Lazy Imports:**

```python
"""
FrameworkRouter: Routes calls between legacy and new framework implementations
behind feature flags. Supports lazy loading to avoid importing the new framework
when it is not active, keeping startup time unaffected.
"""

from __future__ import annotations

import os
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Protocol


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MigrationConfig:
    """Configuration controlling framework migration state."""
    enabled: bool = False                # Master switch for new framework
    canary_percentage: int = 0          # 0-100 traffic split to new framework
    shadow_mode: bool = True            # Run both implementations, compare silently
    rollback_threshold_error_rate: float = 0.005  # Roll back if error rate exceeds this
    rollback_threshold_latency_p99_ms: float = 200.0  # Roll back if p99 latency exceeds this

    @property
    def uses_new_framework(self) -> bool:
        """Determine whether a request should use the new framework."""
        if not self.enabled:
            return False
        if self.canary_percentage == 0:
            return False
        import random
        return random.randint(1, 100) <= self.canary_percentage


class DataStoreProtocol(Protocol):
    """Type-safe protocol defining the data store contract."""

    @abstractmethod
    async def get(self, key: str) -> Any | None: ...

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...


class FrameworkRouter:
    """Routes calls between legacy and new framework implementations.

    Usage:
        router = FrameworkRouter(legacy=LegacyStore(), modern=ModernStore(), config=config)
        data = await router.get("user:123")  # Automatically routes based on flags
    """

    def __init__(
        self,
        legacy: DataStoreProtocol,
        *,
        modern: DataStoreProtocol | None = None,
        config: MigrationConfig | None = None,
    ) -> None:
        self._legacy = legacy
        self._modern = modern
        self._config = config or MigrationConfig()

    @property
    def config(self) -> MigrationConfig:
        return self._config

    @config.setter
    def config(self, value: MigrationConfig) -> None:
        # Atomic replacement to avoid race conditions in concurrent code
        self._config = value

    def _should_use_new(self) -> bool:
        """Check feature flags and canary configuration."""
        return self._config.uses_new_framework

    async def get(self, key: str) -> Any | None:
        """Retrieve a value, routing through old or new framework based on flags.

        In shadow mode, both implementations are called but only the legacy result is returned.
        Results from both are compared and logged for validation.
        """
        if self._modern is not None and self._config.shadow_mode:
            return await self._shadow_read(key)

        if self._should_use_new() and self._modern:
            logger.info("Routing to new framework for key '%s'", key)
            return await self._modern.get(key)

        return await self._legacy.get(key)

    async def _shadow_read(self, key: str) -> Any | None:
        """Execute both implementations and compare results silently.

        Returns the legacy result (production path) but logs discrepancies
        from the new framework for validation purposes.
        """
        import asyncio

        legacy_result = await self._legacy.get(key)

        # Run modern implementation concurrently without blocking
        if self._modern:
            try:
                modern_future = asyncio.ensure_future(self._modern.get(key))
                # Give shadow read a short timeout so it doesn't slow down requests
                modern_result = await asyncio.wait_for(modern_future, timeout=1.0)

                if legacy_result != modern_result:
                    logger.warning(
                        "Shadow divergence detected for key '%s': legacy=%r, modern=%r",
                        key, legacy_result, modern_result,
                    )
            except asyncio.TimeoutError:
                logger.error("Modern implementation timed out during shadow read for key '%s'", key)
            except Exception:
                logger.exception("Modern implementation failed during shadow read for key '%s'", key)

        return legacy_result

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Dual-write to both implementations for validation."""
        await self._legacy.set(key, value, ttl_seconds)

        if self._modern and self._config.shadow_mode:
            try:
                # Shadow writes do not affect request latency — fire and forget with timeout
                import asyncio
                await asyncio.wait_for(self._modern.set(key, value, ttl_seconds), timeout=0.5)
            except Exception:
                logger.exception("Shadow write failed for key '%s'", key)

    async def delete(self, key: string) -> None:
        """Delete from both implementations to keep them in sync."""
        await self._legacy.delete(key)
        if self._modern:
            await self._modern.delete(key)


class LegacyStore(DataStoreProtocol):
    """Legacy data store implementation (e.g., existing Redis client)."""

    async def get(self, key: str) -> Any | None:
        # Placeholder — actual implementation uses the legacy Redis client
        raise NotImplementedError("Replace with real legacy Redis client call")

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        raise NotImplementedError("Replace with real legacy Redis client call")

    async def delete(self, key: str) -> None:
        raise NotImplementedError("Replace with real legacy Redis client call")


class ModernStore(DataStoreProtocol):
    """New data store implementation (e.g., upgraded Redis client v4)."""

    async def get(self, key: str) -> Any | None:
        # Placeholder — actual implementation uses the modern Redis v4 client
        raise NotImplementedError("Replace with real modern Redis v4 client call")

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        raise NotImplementedError("Replace with real modern Redis v4 client call")

    async def delete(self, key: str) -> None:
        raise NotImplementedError("Replace with real modern Redis v4 client call")
```

**Rollout Sequence:**

| Phase | `enabled` | `canary_percentage` | `shadow_mode` | Action |
|-------|-----------|---------------------|---------------|--------|
| 1 — Validation | `false` | 0 | `true` | Shadow read only, compare outputs |
| 2 — Canary (1%) | `true` | 1 | `true` | 1% traffic to new framework, shadow read on rest |
| 3 — Canary (10%) | `true` | 10 | `false` | 10% live traffic, no shadow |
| 4 — Scaling | `true` | 50 | `false` | Scale up if error rates remain stable |
| 5 — Full | `true` | 100 | `false` | All traffic on new framework |
| 6 — Decommission | `true` | 100 | `false` | Remove legacy implementation after 48h |

---

### Pattern 3: Shadow Read / Dual Write Validation

Shadow read validation compares outputs from both implementations side-by-side BEFORE routing any traffic to the new framework. This catches logic differences, serialization mismatches, and edge cases without impacting users.

**Python Example — Side-by-Side Comparison with Divergence Tracking:**

```python
"""
OutputValidator: Compares results from legacy and new framework implementations
to detect divergences during shadow validation. Tracks error rates, latency deltas,
and data differences for migration go/no-go decisions.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class ValidationReport:
    """Aggregate validation results from a shadow read session."""
    total_comparisons: int = 0
    matches: int = 0
    mismatches: list[MismatchRecord] = field(default_factory=list)
    legacy_errors: int = 0
    modern_errors: int = 0
    avg_legacy_latency_ms: float = 0.0
    avg_modern_latency_ms: float = 0.0

    @property
    def match_rate(self) -> float:
        if self.total_comparisons == 0:
            return 1.0
        return self.matches / self.total_comparisons

    @property
    def divergence_rate(self) -> float:
        if self.total_comparisons == 0:
            return 0.0
        return len(self.mismatches) / self.total_comparisons

    def is_ready_for_production(self, tolerance: float = 0.99) -> bool:
        """Decide whether the new framework is ready based on match rate."""
        return (
            self.match_rate >= tolerance
            and self.modern_errors <= self.legacy_errors
        )


@dataclass
class MismatchRecord:
    """Records a single divergence between legacy and new framework outputs."""
    key: str
    legacy_repr: str
    modern_repr: str
    difference_type: str  # 'value', 'type', 'missing_key', 'extra_key'

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "legacy_repr": self.legacy_repr[:500],  # Truncate for log safety
            "modern_repr": self.modern_repr[:500],
            "difference_type": self.difference_type,
        }


class OutputValidator:
    """Validates new framework outputs against legacy implementation.

    Usage during migration:
        validator = OutputValidator()
        # After each shadow read batch:
        report = validator.generate_report()
        if report.is_ready_for_production():
            flip_feature_flag()
    """

    def __init__(self, max_mismatches_to_log: int = 100) -> None:
        self._mismatches: list[MismatchRecord] = []
        self._legacy_latencies: list[float] = []
        self._modern_latencies: list[float] = []
        self._max_log = max_mismatches_to_log

    async def compare(
        self,
        key: str,
        legacy_getter: Any,
        modern_getter: Any,
    ) -> bool:
        """Execute a shadow read comparison between legacy and new implementations.

        Args:
            key: The data key being compared.
            legacy_getter: Async callable returning legacy result.
            modern_getter: Async callable returning new framework result.

        Returns:
            True if outputs match, False if divergent.
        """
        start = time.monotonic()

        try:
            legacy_result = await legacy_getter()
        except Exception as exc:
            logger.warning("Legacy getter failed for key '%s': %s", key, exc)
            self._legacy_errors += 1
            return False

        legacy_latency_ms = (time.monotonic() - start) * 1000

        modern_start = time.monotonic()

        try:
            modern_result = await modern_getter()
        except Exception as exc:
            logger.warning("Modern getter failed for key '%s': %s", key, exc)
            self._modern_errors += 1
            return False

        modern_latency_ms = (time.monotonic() - modern_start) * 1000

        # Track latencies
        self._legacy_latencies.append(legacy_latency_ms)
        self._modern_latencies.append(modern_latency_ms)

        # Compare results
        if self._results_match(legacy_result, modern_result):
            self._matches += 1
            return True
        else:
            self._log_mismatch(key, legacy_result, modern_result)
            return False

    def _results_match(self, legacy: Any, modern: Any) -> bool:
        """Compare two results for equality. Handles None, primitives, and dicts."""
        if legacy is None and modern is None:
            return True
        if legacy is None or modern is None:
            return False
        if type(legacy) != type(modern):
            return False
        if isinstance(legacy, dict):
            return self._dicts_equal(legacy, modern)
        return legacy == modern

    def _dicts_equal(self, a: dict, b: dict) -> bool:
        """Deep compare two dicts, handling nested structures."""
        if set(a.keys()) != set(b.keys()):
            return False
        for k in a:
            if not self._results_match(a[k], b[k]):
                return False
        return True

    def _log_mismatch(self, key: str, legacy: Any, modern: Any) -> None:
        """Record and log a divergence between implementations."""
        if len(self._mismatches) >= self._max_log:
            logger.warning(
                "Divergence limit reached (%d), skipping further mismatch logs for key '%s'",
                self._max_log, key,
            )
            return

        difference_type = self._classify_difference(legacy, modern)

        record = MismatchRecord(
            key=key,
            legacy_repr=self._safe_repr(legacy),
            modern_repr=self._safe_repr(modern),
            difference_type=difference_type,
        )
        self._mismatches.append(record)
        logger.warning(
            "Divergence for key '%s' [%s]: legacy=%r | modern=%r",
            key, difference_type, record.legacy_repr, record.modern_repr,
        )

    def _classify_difference(self, legacy: Any, modern: Any) -> str:
        """Classify the type of divergence between two results."""
        if legacy is None or modern is None:
            return "null_mismatch"
        if isinstance(legacy, dict):
            legacy_keys = set(legacy.keys())
            modern_keys = set(modern.keys())
            missing = legacy_keys - modern_keys
            extra = modern_keys - legacy_keys
            if missing:
                return f"missing_keys:{','.join(sorted(missing))}"
            if extra:
                return f"extra_keys:{','.join(sorted(extra))}"
        return "value_mismatch"

    @staticmethod
    def _safe_repr(value: Any, max_len: int = 200) -> str:
        """Safely convert a value to string for logging (truncate if too long)."""
        try:
            import json
            serialized = json.dumps(value, default=str, sort_keys=True)
        except (TypeError, ValueError):
            serialized = repr(value)
        return serialized[:max_len]

    def generate_report(self) -> ValidationReport:
        """Generate a validation report for go/no-go decision."""
        avg_legacy = (
            sum(self._legacy_latencies) / len(self._legacy_latencies)
            if self._legacy_latencies else 0.0
        )
        avg_modern = (
            sum(self._modern_latencies) / len(self._modern_latencies)
            if self._modern_latencies else 0.0
        )

        return ValidationReport(
            total_comparisons=self._matches + len(self._mismatches),
            matches=self._matches,
            mismatches=self._mismatches[-10:],  # Last 10 for the report
            legacy_errors=getattr(self, '_legacy_errors', 0),
            modern_errors=getattr(self, '_modern_errors', 0),
            avg_legacy_latency_ms=round(avg_legacy, 2),
            avg_modern_latency_ms=round(avg_modern, 2),
        )


# --- Usage Example ---

async def run_shadow_validation(validator: OutputValidator, legacy_store: Any, modern_store: Any, keys: list[str]) -> ValidationReport:
    """Run shadow validation across a set of keys and generate a go/no-go report."""
    tasks = [
        validator.compare(key, lambda k=key: legacy_store.get(k), lambda k=key: modern_store.get(k))
        for key in keys
    ]
    await asyncio.gather(*tasks)
    report = validator.generate_report()

    logger.info(
        "Shadow validation complete: %d matches, %d divergences, match_rate=%.4f, ready=%s",
        report.matches, len(report.mismatches), report.match_rate, report.is_ready_for_production(),
    )
    return report
```

**When to Flip the Flag:** Use `report.is_ready_for_production(tolerance=0.99)` — require at least 99% match rate across a representative sample of keys. If the remaining 1% divergences are non-critical (e.g., timestamp formatting differences that do not affect business logic), proceed with a documented exception.

---

## Constraints

### MUST DO
- Isolate framework-specific code behind adapter interfaces — never let framework APIs leak into domain logic or business rules
- Support rollback on every migration step via feature flags and dual-write validation — if you cannot roll back, do not deploy
- Document breaking changes between old and new frameworks before beginning integration — maintain a migration checklist of API differences
- Write integration tests that compare output from both implementations side-by-side — these tests are the safety net for the entire migration
- Use lazy imports for framework code behind feature flags — do not add startup cost for unused code paths

### MUST NOT DO
- Rewrite the entire module to use the new framework in a single change — always use progressive migration with one boundary at a time
- Import the new framework at module level if it will only be used behind a feature flag — use `import` inside functions or dynamic imports instead
- Assume API compatibility between versions — check the changelog for every major version transition and test each breaking change explicitly
- Remove the old implementation until ALL code paths have been verified against the new one — keep both implementations in parallel until decommission
- Skip shadow validation even if you "trust" the new framework — empirical comparison catches edge cases human review misses

---

## Output Template

When applying this skill, produce the following deliverables:

1. **Dependency Analysis** — A structured map of current framework usage showing every import site, integration point, and risk classification (Critical / High / Medium / Low). Include file paths, line numbers, and whether the usage involves user-facing data or internal tooling.

2. **Adapter Interface Specification** — A type-safe interface definition (TypeScript interfaces or Python protocols/ABCs) that captures every operation your domain code needs from the framework. Include both a legacy stub and a new-framework stub implementation to verify the contract works for both sides.

3. **Migration Plan** — A step-by-step progressive rollout plan using the Strangler Fig pattern. Each step must include: the boundary being migrated, the feature flag configuration (`enabled`, `canary_percentage`, `shadow_mode`), and explicit rollback criteria (error rate threshold, p99 latency threshold).

4. **Validation Strategy** — A shadow read or dual-write comparison approach using an `OutputValidator`-style pattern. Specify the sample of keys/requests to validate, the tolerance threshold for divergence (default 1% max), and the go/no-go decision procedure based on match rate.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `version-migration` | Upgrade within a single framework (e.g., Express 4 → Express 5) without introducing adapter layers |
| `dependency-conflict-resolution` | Resolve peer dependency and transitive version conflicts when integrating multiple new packages |
| `architecture-review` | Evaluate whether a framework change is the right architectural decision before investing in migration |

---

## Live References

- **React Migration Guide (v16 → v18)**: https://react.dev/blog/2022/03/08/react-18-upgrade-guide
- **Express.js v4 to v5 Migration**: https://expressjs.com/en/guide/migrating-5.html
- **FastAPI Documentation**: https://fastapi.tiangolo.com/tutorial/
- **Django 5.x Release Notes & Migration**: https://docs.djangoproject.com/en/5.1/releases/5.0/
- **Strangler Fig Pattern (Martin Fowler)**: https://martinfowler.com/bliki/StranglerFigApplication.html
- **Adapter Design Pattern (GoF)**: https://refactoring.guru/design-patterns/adapter
- **Feature Flags Best Practices (LaunchDarkly Blog)**: https://launchdarkly.com/blog/the-importance-of-feature-flags-in-devops-and-cicd/

---

*This skill follows the Strangler Fig pattern for framework migration, adapter pattern for boundary isolation, and progressive rollout with feature flags for safe deployment. Every step must include a rollback path — if you cannot undo a change, do not make it.*
