---
name: framework-requirement-adoption
description: Translates framework requirements into production code architecture through configuration contract generation, type-system enforcement, lifecycle hook mapping, and phased integration patterns for zero-downtime framework adoption.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework requirement adoption, how do i adapt my code to a framework, configuration contract, type-system enforcement, lifecycle hook mapping, phased framework integration, framework requirements implementation, zero-downtime migration, architecture adaptation
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-requirements, framework-adoption-strategy, framework-application-methodology, modular-design
---

# Framework Requirement Adoption Engine

Translates framework requirements into production code architecture through configuration contract generation, type-system enforcement, lifecycle hook mapping, and phased integration patterns. When loaded, this skill makes the model act as a senior integration engineer who converts abstract framework requirements into concrete, typed, testable production code — ensuring zero-downtime migration through strangler-pattern boundaries and contract-first design.

## TL;DR Checklist

- [ ] Audit existing codebase to identify all hooks where framework requirements must be enforced
- [ ] Generate configuration contracts with schema validation (Pydantic, Zod, or equivalent)
- [ ] Map framework lifecycle hooks (init, startup, shutdown, request, teardown) to your architecture
- [ ] Build type-system enforcement layers that catch requirement violations at compile or import time
- [ ] Implement a strangler-pattern adapter for phased integration — never big-bang migration
- [ ] Add observability hooks: metrics, tracing, and structured logging aligned with framework conventions

---

## When to Use

Use this skill when:

- You have a selected framework's requirements document and need to translate them into concrete code architecture
- Migrating an existing service to adopt a new framework's lifecycle patterns (e.g., moving from raw WSGI to FastAPI dependency injection)
- Enforcing type safety, configuration validation, or security requirements that the framework mandates
- Implementing phased integration via adapter patterns to avoid big-bang migration risk
- A framework requires specific project structure, naming conventions, or module organization

---

## When NOT to Use

Avoid this skill for:

- Evaluating which framework to choose — use `framework-sourcing-strategy` for discovery and `framework-requirements` for selection
- Planning rollout phases and rollback procedures — use `framework-adoption-strategy` instead
- Learning a new framework's API surface through source code scanning — use `framework-application-methodology` instead
- Optimizing an already-integrated framework's runtime performance — use `framework-performance-tuning` instead

---

## Core Workflow

### 1. Requirement-to-Architecture Mapping

Take each requirement from the framework requirements document and map it to a concrete architectural concern. Classify every requirement as configuration, type enforcement, lifecycle hook, data model, or integration boundary. Build a traceability matrix linking requirements to code locations.

```python
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class RequirementCategory(Enum):
    CONFIGURATION = "configuration"  # Settings, env vars, defaults
    TYPE_ENFORCEMENT = "type_enforcement"  # Type hints, schema validation
    LIFECYCLE_HOOK = "lifecycle_hook"  # Init, startup, shutdown, request lifecycle
    DATA_MODEL = "data_model"  # Models, schemas, serialization
    INTEGRATION_BOUNDARY = "integration_boundary"  # Adapters, gateways, interfaces
    OBSERVABILITY = "observability"  # Metrics, tracing, logging


@dataclass(frozen=True)
class Requirement:
    """A single framework requirement with architectural mapping."""
    id: str                          # Unique identifier (e.g., "REQ-001")
    description: str                 # Human-readable requirement text
    category: RequirementCategory
    priority: str = "should"         # must / should / could — MoSCoW
    target_code_location: str | None = None  # Where the requirement is enforced
    validation_method: str | None = None     # How it's verified (compile, runtime, test)


@dataclass(frozen=True)
class TraceabilityEntry:
    """Links a requirement to its architectural implementation."""
    requirement_id: str
    architecture_concern: str        # Which layer handles this requirement
    code_locations: list[str]        # File paths implementing this requirement
    test_coverage: bool = False      # Whether automated tests verify the enforcement


def map_requirements_to_architecture(
    requirements: list[Requirement],
    existing_codebase: Path,
) -> tuple[list[TraceabilityEntry], list[str]]:
    """Map framework requirements to concrete architectural concerns.

    Analyzes the existing codebase structure and assigns each requirement to
    the appropriate layer (config, models, middleware, endpoints, etc.).

    Args:
        requirements: Framework requirements extracted from the requirements document.
        existing_codebase: Root path of the project's source directory.

    Returns:
        (traceability_matrix, gaps) — matrix links requirements to code locations,
        gaps lists requirement IDs with no identified implementation target.
    """
    traceability: list[TraceabilityEntry] = []
    gaps: list[str] = []

    # Analyze existing codebase structure
    module_map: dict[str, list[str]] = {}  # category → list of file paths
    for py_file in sorted(existing_codebase.rglob("*.py")):
        rel_path = str(py_file.relative_to(existing_codebase))
        if "test" in rel_path or "__pycache__" in rel_path:
            continue
        if ".venv" in str(py_file) or "node_modules" in str(py_file):
            continue

        # Classify module by directory structure
        parts = py_file.relative_to(existing_codebase).parts
        module_category = parts[0] if len(parts) > 1 else "root"

        if module_category not in module_map:
            module_map[module_category] = []
        module_map[module_category].append(rel_path)

    # Map each requirement to the best-fitting code location
    config_categories = {"config", "settings", "env", "defaults"}
    model_categories = {"models", "schemas", "types", "entities"}
    lifecycle_categories = {"app", "main", "lifecycle", "hooks", "startup"}
    boundary_categories = {"adapters", "gateways", "interfaces", "ports", "clients"}

    for req in requirements:
        best_match: str | None = None
        target_files: list[str] = []

        if req.category == RequirementCategory.CONFIGURATION:
            for cat, files in module_map.items():
                if any(c in cat.lower() for c in config_categories):
                    best_match = "configuration layer"
                    target_files.extend(files[:3])  # Top 3 config files
                    break

        elif req.category == RequirementCategory.TYPE_ENFORCEMENT:
            for cat, files in module_map.items():
                if any(c in cat.lower() for c in model_categories):
                    best_match = "type/model layer"
                    target_files.extend(files[:3])
                    break

        elif req.category == RequirementCategory.LIFECYCLE_HOOK:
            for cat, files in module_map.items():
                if any(c in cat.lower() for c in lifecycle_categories):
                    best_match = "application lifecycle layer"
                    target_files.extend(files[:3])
                    break

        elif req.category == RequirementCategory.INTEGRATION_BOUNDARY:
            for cat, files in module_map.items():
                if any(c in cat.lower() for c in boundary_categories):
                    best_match = "integration boundary layer"
                    target_files.extend(files[:3])
                    break

        if best_match and target_files:
            traceability.append(TraceabilityEntry(
                requirement_id=req.id,
                architecture_concern=best_match,
                code_locations=target_files,
            ))
        else:
            gaps.append(req.id)

    return traceability, gaps


# Usage:
# reqs = [
#     Requirement("REQ-001", "All configuration must be validated at startup", RequirementCategory.CONFIGURATION, "must"),
#     Requirement("REQ-002", "Request payloads must conform to typed schemas", RequirementCategory.TYPE_ENFORCEMENT, "must"),
#     Requirement("REQ-003", "Graceful shutdown on SIGTERM within 5 seconds", RequirementCategory.LIFECYCLE_HOOK, "must"),
# ]
# matrix, gaps = map_requirements_to_architecture(reqs, Path("src"))
# if gaps:
#     print(f"⚠️  No implementation target found for requirements: {gaps}")
```

**Checkpoint:** Zero gaps should remain after mapping. Any requirement with no identified code location must either have its target created or be reclassified as "won't do" with documented justification.

### 2. Configuration Contract Generation

Generate typed configuration schemas that validate all framework-required settings at import or startup time. Use schema validation libraries appropriate to your language ecosystem (Pydantic v2 for Python, Zod for TypeScript, struct validator for Go). Fail fast with descriptive error messages containing the exact field name and expected type.

```python
from dataclasses import dataclass, field
from typing import Any


# ✅ GOOD: Pydantic v2 configuration contract with validation at construction
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field, field_validator, ValidationError

    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False


if HAS_PYDANTIC:
    class FrameworkConfig(BaseSettings):
        """Type-enforced configuration contract for framework requirements.

        All settings are validated at construction time. Missing required fields
        or incorrect types raise ValidationError with field-level error details.
        Follows Fail Fast (Law 4) — invalid config halts before any application logic.
        """
        model_config = SettingsConfigDict(
            env_prefix="APP_",
            env_file=".env",
            extra="forbid",  # Reject unknown config keys — catches typos early
        )

        # Core framework settings
        app_name: str = Field(default="api-service", min_length=1, max_length=64)
        debug_mode: bool = Field(default=False)
        log_level: str = Field(default="INFO")
        environment: str = Field(default="development")

        # Database requirement (if framework mandates it)
        database_url: str = Field(..., description="PostgreSQL connection string")
        database_pool_size: int = Field(default=5, ge=1, le=100)
        database_max_overflow: int = Field(default=10, ge=0, le=200)

        # Security requirement (if framework mandates it)
        secret_key: str = Field(..., min_length=32)
        cors_origins: list[str] = Field(default_factory=list)
        rate_limit_enabled: bool = Field(default=True)
        rate_limit_requests: int = Field(default=100, ge=1)
        rate_limit_window_seconds: int = Field(default=60, ge=1)

        # Lifecycle hooks
        shutdown_timeout_seconds: float = Field(default=5.0, gt=0)
        startup_health_check_path: str = Field(default="/health")

        @field_validator("log_level")
        @classmethod
        def validate_log_level(cls, v: str) -> str:
            valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
            if v.upper() not in valid_levels:
                raise ValueError(
                    f"Invalid log level '{v}'. Must be one of: {', '.join(sorted(valid_levels))}"
                )
            return v.upper()

        @field_validator("cors_origins")
        @classmethod
        def validate_cors_origins(cls, v: list[str]) -> list[str]:
            """Validate CORS origins are proper URLs."""
            for origin in v:
                if not origin.startswith(("http://", "https://")):
                    raise ValueError(f"CORS origin must be a URL: {origin}")
            return v

        @field_validator("database_url")
        @classmethod
        def validate_database_url(cls, v: str) -> str:
            """Ensure database URL uses PostgreSQL dialect."""
            if not v.startswith(("postgresql://", "postgresql+asyncpg://")):
                raise ValueError(
                    f"Database URL must use PostgreSQL protocol. Got: {v.split(':')[0] if ':' in v else v}"
                )
            return v


# ❌ BAD: Untyped dictionary config with no validation — fails silently
bad_config = {
    "app_name": 123,                  # Wrong type — accepted silently
    "debug_mode": "yes",             # String instead of bool — accepted
    "database_url": None,            # Required field missing — crashes later
    "unknown_field": "typo_in_key",  # Typos accepted — no feedback
}


def load_config_failsafe() -> FrameworkConfig:
    """Load framework configuration with fail-fast validation.

    Returns validated config or raises descriptive ValidationError.
    Follows Early Exit (Law 1) — returns on first validation failure.
    Follows Parse Don't Validate (Law 2) — Pydantic handles parsing at boundary.
    """
    try:
        return FrameworkConfig()
    except ValidationError as e:
        errors = {}
        for err in e.errors():
            field_path = " -> ".join(str(p) for p in err["loc"])
            errors[field_path] = err["msg"]

        raise RuntimeError(
            f"Configuration validation failed for {len(errors)} field(s):\n" +
            "\n".join(f"  {field}: {msg}" for field, msg in sorted(errors.items()))
        ) from e
else:
    # Fallback for environments without Pydantic — use dict with basic checks
    class FrameworkConfig:
        """Minimal fallback config when Pydantic is unavailable."""
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                if not isinstance(key, str) or not key.isupper():
                    raise TypeError(f"Configuration keys must be UPPER_SNAKE_CASE: {key}")
                setattr(self, key, value)

        def __repr__(self):
            attrs = ", ".join(f"{k}={getattr(self, k)!r}" for k in sorted(dir(self)) if not k.startswith("_"))
            return f"FrameworkConfig({attrs})"


# Usage:
# config = load_config_failsafe()
# print(f"Running {config.app_name} in {config.environment}")
```

**Checkpoint:** Configuration must fail at import/parse time, not at runtime. Any missing required field or type mismatch should produce an error message containing the exact field name and expected format — no stack traces without context.

### 3. Lifecycle Hook Mapping

Map framework lifecycle hooks (initialization, startup, request handling, shutdown) to your application's architectural layers. Build a typed hook registry that enforces execution order and dependency resolution between hooks.

```python
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Any


class HookPhase(Enum):
    """Application lifecycle phases in execution order."""
    INIT = 0          # Framework initialization — before any user request
    CONFIGURE = 1     # Configuration loading and validation
    PREPARE = 2       # Resource preparation (DB pools, caches, connections)
    STARTUP = 3       # Application fully ready to serve requests
    SHUTDOWN_PRE = 4  # Graceful shutdown initiated — stop accepting new work
    SHUTDOWN = 5      # Clean up resources — drain connections, flush buffers


@dataclass(frozen=True)
class LifecycleHook:
    """A single lifecycle hook with ordering and dependency metadata."""
    name: str
    phase: HookPhase
    handler: Callable[..., Any] | None = None
    priority: int = 0                  # Lower numbers execute first within same phase
    dependencies: tuple[str, ...] = ()  # Other hook names this hook depends on

    def __call__(self) -> Any:
        """Invoke the hook handler if registered."""
        if self.handler is None:
            raise RuntimeError(f"Hook '{self.name}' has no handler registered")
        return self.handler()


class LifecycleRegistry:
    """Typed registry for framework lifecycle hooks with dependency resolution.

    Enforces execution order based on phases and priorities. Detects circular
    dependencies at registration time (Fail Fast, Law 4).
    """

    def __init__(self) -> None:
        self._hooks: dict[str, LifecycleHook] = {}
        self._execution_order: list[LifecycleHook] = []

    def register(
        self,
        name: str,
        phase: HookPhase,
        handler: Callable[..., Any],
        priority: int = 0,
        depends_on: tuple[str, ...] = (),
    ) -> "LifecycleRegistry":
        """Register a lifecycle hook with dependency metadata.

        Args:
            name: Unique identifier for this hook.
            phase: Lifecycle phase in which this hook executes.
            handler: Async or sync callable to execute.
            priority: Execution order within the same phase (lower first).
            depends_on: Names of other hooks that must complete before this one.

        Returns:
            self for method chaining.

        Raises:
            ValueError: If a dependency references an unregistered hook.
        """
        if name in self._hooks:
            raise ValueError(f"Hook '{name}' already registered")

        # Validate dependencies exist at registration time (Fail Fast)
        for dep_name in depends_on:
            if dep_name not in self._hooks and dep_name != name:
                raise ValueError(
                    f"Hook '{name}' depends on '{dep_name}', which is not yet registered. "
                    f"Register '{dep_name}' first."
                )

        self._hooks[name] = LifecycleHook(
            name=name, phase=phase, handler=handler, priority=priority, dependencies=depends_on,
        )
        return self

    def execute_phase(self, phase: HookPhase) -> dict[str, Any]:
        """Execute all hooks for a given phase in dependency-resolved order.

        Returns:
            Mapping of hook name → result from each handler execution.
        """
        phase_hooks = sorted(
            [h for h in self._hooks.values() if h.phase == phase],
            key=lambda h: (h.priority, h.name),
        )

        results: dict[str, Any] = {}
        completed: set[str] = set()

        for hook in phase_hooks:
            # Resolve dependencies
            for dep_name in hook.dependencies:
                if dep_name not in completed and dep_name != hook.name:
                    raise RuntimeError(
                        f"Hook '{hook.name}' dependency '{dep_name}' did not complete successfully"
                    )

            try:
                result = hook()
                # Handle async handlers
                if asyncio.iscoroutine(result):
                    results[hook.name] = await result
                else:
                    results[hook.name] = result
                completed.add(hook.name)
            except Exception as e:
                raise RuntimeError(f"Hook '{hook.name}' failed in phase {phase.name}: {e}") from e

        return results

    def execute_all(self) -> dict[str, dict[str, Any]]:
        """Execute all phases in lifecycle order.

        Returns:
            Nested mapping of phase → hook_results.
        """
        all_results: dict[str, dict[str, Any]] = {}

        for phase in HookPhase:
            if phase.name.startswith("SHUTDOWN") and "SHUTDOWN" not in [p.name for p in HookPhase]:
                # Shutdown runs in reverse
                continue
            results = self.execute_phase(phase)
            all_results[phase.name] = results

        # Reverse-phase shutdown
        for phase in reversed([p for p in HookPhase if p.name.startswith("SHUTDOWN")]):
            results = self.execute_phase(phase)
            all_results[phase.name] = results

        return all_results


# Usage — register hooks following framework lifecycle:
registry = LifecycleRegistry()

registry.register(
    "load_config",
    HookPhase.CONFIGURE,
    handler=lambda: load_config_failsafe(),
    priority=0,
)

registry.register(
    "init_db_pool",
    HookPhase.PREPARE,
    handler=lambda: print("Database pool initialized"),
    priority=1,
    depends_on=("load_config",),  # Must load config before connecting
)

registry.register(
    "health_check_ready",
    HookPhase.STARTUP,
    handler=lambda: print(f"Server ready — health check at /health"),
    priority=0,
    depends_on=("init_db_pool",),
)
```

**Checkpoint:** All dependencies must resolve without circular references. If a dependency cannot be satisfied within the same lifecycle phase, the hook should raise immediately rather than proceeding in an invalid state.

### 4. Strangler-Pattern Adapter for Phased Integration

Implement adapter classes that bridge existing code to new framework interfaces. This enables gradual migration — old and new code coexist during the transition period, with no downtime. The adapter pattern ensures type compatibility while the underlying implementation shifts.

```python
from abc import ABC, abstractmethod
from typing import TypeVar, Generic


T = TypeVar("T")


class Adapter(ABC, Generic[T]):
    """Base adapter for strangler-pattern framework integration.

    Adapters bridge legacy code to new framework interfaces. They maintain the same
    external API surface while delegating to either old or new implementations
    based on a configurable feature flag. This enables zero-downtime migration.
    """

    @abstractmethod
    def adapt(self, input_data: T) -> T:
        """Transform legacy interface calls to framework-compatible form."""
        ...

    @property
    @abstractmethod
    def is_legacy(self) -> bool:
        """Whether this adapter currently routes to the legacy implementation."""
        ...


class UserRepositoryAdapter(Adapter[dict]):
    """Strangler adapter for migrating from raw SQL to ORM.

    During transition, read operations use the legacy SQL layer while
    write operations gradually shift to the new ORM via a toggle flag.
    """

    def __init__(
        self,
        legacy_query: Callable[[str], list[dict]],
        orm_model,
        toggle_legacy_reads: bool = True,
    ) -> None:
        self._legacy_query = legacy_query
        self._orm_model = orm_model
        self._toggle_legacy_reads = toggle_legacy_reads

    def adapt(self, input_data: dict) -> dict:
        """Route to legacy or ORM based on current migration phase.

        Follows Early Exit (Law 1): returns immediately after the first
        matching path without unnecessary branching.
        """
        action = input_data.get("action")

        if action == "find_all":
            return self._get_all()
        elif action == "find_by_id":
            user_id = input_data["id"]
            if self._toggle_legacy_reads:
                results = self._legacy_query(f"SELECT * FROM users WHERE id = {user_id}")
                return results[0] if results else {}
            else:
                return self._orm_model.find_by_id(user_id)
        elif action == "create":
            return self._create_new(input_data["data"])
        elif action == "update":
            return self._update_new(input_data["id"], input_data["data"])
        elif action == "delete":
            return self._delete_new(input_data["id"])

        raise ValueError(f"Unknown repository action: {action}")

    @property
    def is_legacy(self) -> bool:
        return self._toggle_legacy_reads

    def _get_all(self) -> list[dict]:
        if self._toggle_legacy_reads:
            return self._legacy_query("SELECT * FROM users")
        return [row.__dict__ for row in self._orm_model.find_all()]

    def _create_new(self, data: dict) -> dict:
        # Write operations already use ORM — reads migrate first
        instance = self._orm_model(**data)
        return instance.to_dict()

    def _update_new(self, user_id: int, data: dict) -> dict:
        instance = self._orm_model.find_by_id(user_id)
        if not instance:
            raise KeyError(f"User {user_id} not found")
        for key, value in data.items():
            setattr(instance, key, value)
        return instance.to_dict()

    def _delete_new(self, user_id: int) -> bool:
        return self._orm_model.delete(user_id)


class FeatureToggle:
    """Simple toggle for gradual feature migration without framework dependency.

    Tracks migration progress per feature and provides methods to query whether
    a feature has fully migrated or is still in dual-run mode.
    """

    def __init__(self) -> None:
        self._features: dict[str, float] = {}  # name → percentage (0.0–1.0)

    def set_progress(self, feature: str, progress: float) -> None:
        """Set migration progress for a feature (0.0 = legacy, 1.0 = fully migrated)."""
        if not 0.0 <= progress <= 1.0:
            raise ValueError(f"Progress must be between 0.0 and 1.0, got {progress}")
        self._features[feature] = progress

    def get_progress(self, feature: str) -> float:
        return self._features.get(feature, 0.0)

    @property
    def all_migrated(self) -> bool:
        """Check if ALL tracked features are at 100% migration."""
        return all(p >= 1.0 for p in self._features.values()) if self._features else False

    def to_dict(self) -> dict[str, float]:
        return dict(self._features)


# Usage — phased migration:
toggle = FeatureToggle()
repo_adapter = UserRepositoryAdapter(
    legacy_query=lambda sql: [{"id": 1, "name": "legacy_user"}],
    orm_model=None,  # Replace with actual ORM model
    toggle_legacy_reads=True,  # Phase 1: reads still on legacy
)

# After testing phase complete:
# repo_adapter._toggle_legacy_reads = False  # Phase 2: reads migrated to ORM
# toggle.set_progress("user_repository", 0.5)  # Track migration progress
```

**Checkpoint:** The adapter must maintain the exact same external API as both legacy and new implementations. No caller should be aware of the migration state — this isolation ensures rollback is always possible without code changes.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Type-System Enforcement Layer (BAD vs GOOD)

```python
# ❌ BAD: Dynamic validation at runtime with opaque error messages
def bad_request_handler(request):
    """Accepts any JSON — type errors only surface deep in business logic."""
    data = request.get_json()  # Returns dict[Any, Any] — no type safety

    name = data["name"]           # KeyError if missing — generic error
    age = int(data["age"])        # ValueError if wrong type — opaque message
    email = data["email"]         # No format validation — garbage accepted

    return {"user": f"{name} is {age} years old"}


# ✅ GOOD: Typed schema with compile-time hints and runtime validation
from typing import Optional  # Python 3.10+ preferred: from types import UnionType

class CreateUserRequest:
    """Typed request model — all framework requirements enforced at boundary."""

    __slots__ = ("name", "age", "email", "role")

    def __init__(self, name: str, age: int, email: str, role: Optional[str] = None) -> None:
        # Early Exit (Law 1): validate and fail fast before any processing
        if not name or not name.strip():
            raise ValueError("name is required and must be a non-empty string")

        if len(name) > 64:
            raise ValueError(f"name must be at most 64 characters, got {len(name)}")

        if not isinstance(age, int) or age < 0 or age > 150:
            raise ValueError(f"age must be an integer between 0 and 150, got {type(age).__name__}: {age}")

        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError(f"email must be a valid email address, got: {email}")

        allowed_roles = {"user", "admin", "moderator"}
        if role is not None and role.lower() not in allowed_roles:
            raise ValueError(
                f"role must be one of {', '.join(sorted(allowed_roles))}, got: {role}"
            )

        self.name = name.strip()
        self.age = age
        self.email = email.lower().strip()
        self.role = role.lower() if role else "user"

    def to_dict(self) -> dict[str, str | int]:
        return {"name": self.name, "age": self.age, "email": self.email, "role": self.role}


def good_request_handler(request_body: dict) -> dict:
    """Accepts typed requests — violations caught immediately with field-level errors."""
    try:
        validated = CreateUserRequest(
            name=request_body.get("name"),
            age=request_body.get("age"),
            email=request_body.get("email"),
            role=request_body.get("role"),
        )
    except ValueError as e:
        return {"error": "validation_failed", "details": str(e)}

    return {"status": "created", "user": validated.to_dict()}


# Usage:
# result = good_request_handler({"name": "  Alice  ", "age": 30, "email": "alice@example.com"})
# # → {"status": "created", "user": {"name": "Alice", "age": 30, "email": "alice@example.com", "role": "user"}}
```

### Pattern 2: Configuration Contract with Schema Validation (BAD vs GOOD)

```python
import os
from typing import Any


# ❌ BAD: Environment variable access scattered throughout code — no validation center
def bad_service_setup():
    """Every module reads its own env vars — no centralized validation or error reporting."""
    db_host = os.environ.get("DB_HOST", "localhost")       # Silent default — might be wrong
    db_port = int(os.environ["DB_PORT"])                    # Crashes with KeyError if missing
    api_key = os.environ.get("API_KEY")                     # None accepted — crashes later
    workers = os.getenv("WORKERS", "4")                     # String not converted to int

    # Connection established with potentially invalid config
    return {"host": db_host, "port": db_port, "workers": workers}


# ✅ GOOD: Centralized config contract with validation at load time
def good_service_setup() -> dict[str, Any]:
    """Load and validate all service configuration from a single contract.

    Follows Fail Fast (Law 4): raises RuntimeError with field-level error details
    if any required configuration is missing or invalid. No application code runs
    until the entire config is verified.
    """
    errors: list[str] = []

    def get_required(name: str) -> str:
        value = os.environ.get(name)
        if not value:
            errors.append(f"Missing required environment variable: {name}")
        return value or ""

    # Load all config through the contract
    db_host = get_required("DB_HOST")
    db_port_str = get_required("DB_PORT")
    api_key = get_required("API_KEY")

    # Validate derived values
    try:
        db_port = int(db_port_str) if db_port_str else 0
        if not (1 <= db_port <= 65535):
            errors.append(f"DB_PORT must be 1–65535, got: {db_port}")
    except ValueError:
        errors.append(f"DB_PORT must be an integer, got: '{db_port_str}'")

    if len(api_key) < 32:
        errors.append(f"API_KEY must be at least 32 characters, got {len(api_key)}")

    # Fail Fast: halt before any service initialization
    if errors:
        error_list = "\n".join(f"  • {err}" for err in errors)
        raise RuntimeError(
            f"Configuration validation failed ({len(errors)} error(s)):\n{error_list}"
        )

    return {
        "database": {"host": db_host, "port": db_port},
        "api_key_set": len(api_key) > 0,
    }


# Usage:
# config = good_service_setup()  # Raises RuntimeError on any missing/invalid var
```

---

## Constraints

### MUST DO
- Generate typed configuration contracts with validation at import time — never accept runtime surprises
- Map every framework requirement to a concrete code location with traceability entries
- Implement lifecycle hooks with explicit dependency ordering and fail-fast on unresolved dependencies
- Use the strangler-pattern adapter for migration — no big-bang rewrites that risk downtime
- Enforce type safety at boundaries: parse at the edge, trust internally (Atomic Predictability, Law 3)
- Add observability hooks (metrics, tracing, structured logging) aligned with framework conventions
- Document all architectural decisions in ADR format when deviating from framework defaults
- Write unit tests for every configuration validation rule and lifecycle hook handler

### MUST NOT DO
- Mix legacy and framework code in the same module — use adapters to maintain clear boundaries
- Accept untyped dictionaries as request/response payloads without a schema layer at the boundary
- Skip shutdown hooks — resource leaks from missing teardown are production incidents waiting to happen
- Use magic numbers for timeout, retry, or batch sizes — make all thresholds configurable via the config contract
- Register lifecycle hooks with circular dependencies — validate dependency graph at registration time
- Migrate more than one feature area simultaneously during phased adoption — each adapter should be independently testable
- Bypass configuration validation to "quick fix" a startup issue in production

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements` | Provides the structured requirements document that this skill translates into code architecture |
| `framework-adoption-strategy` | Plans the rollout phases that determine when each adapter pattern is activated during migration |
| `framework-application-methodology` | Scans framework source code to understand extension points that inform lifecycle hook mapping |
| `modular-design` | Provides architectural principles for maintaining clean boundaries between legacy and framework code |

---

## Live References

> Authoritative documentation links for framework requirement adoption. The model follows markdown links at load time to resolve external references and inline content.

- [Pydantic v2 Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Strangler Fig Pattern (Martin Fowler)](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Configuration Management Best Practices](https://12factor.net/config)
- [Dependency Injection Principles](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Graceful Shutdown Patterns](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/multi-container-microservice-net-applications/gracefully-shutdown-aspnet-core-containers)
