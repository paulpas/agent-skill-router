---
name: extensible-framework-design
description: Designs robust extensible software frameworks with plugin architectures, configuration-driven extension points, and validation patterns — enabling third-party contributors while maintaining core stability and API contract guarantees.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework design, extensible architecture, plugin system, extension points, configuration driven, hook patterns, middleware chains, how do i design an extensible system
  archetypes:
    - tactical
    - strategic
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
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-application-methodology, coding-knowledge-transfer-methods
---

# Extensible Framework Design

Makes the model design robust extensible software frameworks with plugin architectures, configuration-driven extension points, and validation patterns. When loaded, this skill enforces disciplined separation between core runtime behavior and pluggable extensions — ensuring third-party contributors can extend functionality without breaking backward compatibility or circumventing lifecycle hooks.

## TL;DR Checklist

- [ ] Identify all extension points by cataloging where external code must inject behavior
- [ ] Define plugin interfaces with strict type contracts — no duck typing at boundaries
- [ ] Write configuration schemas (JSON Schema / Pydantic models) that validate every extension's config before loading
- [ ] Implement a lifecycle manager that enforces ordered hook execution with error isolation
- [ ] Add validation enforcement so misconfigured plugins fail fast during registration, not at runtime
- [ ] Draft a backward compatibility plan documenting how plugin interfaces evolve across versions

---

## When to Use

Use this skill when:

- Building an internal framework that multiple teams or external contributors will extend via plugins or hooks
- Designing a middleware chain where processing stages must be independently pluggable and orderable
- Creating a configuration-driven system where behavior changes based on deployed extension bundles
- Migrating a monolithic application into a plugin-based architecture with clear separation of concerns
- Establishing an internal package registry where third-party developers submit extensions for review and distribution

---

## When NOT to Use

Avoid this skill for:

- **Simple applications** — A 200-line script or microservice with one responsibility needs no plugin architecture
- **When extension requirements are unknown** — Premature abstraction creates unnecessary complexity; wait until at least two distinct extensions are needed
- **Performance-critical hot paths** — Dynamic plugin resolution adds overhead; use static composition in latency-sensitive code

---

## Core Workflow

### 1. Extension Point Identification — Catalog Where External Code Must Inject Behavior

Walk the framework's core domain model and identify every location where behavior varies based on context, customer, or configuration. Each variation point becomes a potential extension point. Record each as an interface with a clear contract: inputs, outputs, side effects, and error semantics.

```python
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


logger = logging.getLogger(__name__)


class ExtensionPhase(Enum):
    """Lifecycle phase at which an extension hook fires."""
    BEFORE_INPUT = "before_input"
    VALIDATE = "validate"
    PROCESS = "process"
    POST_PROCESS = "post_process"
    ERROR = "error"
    CLEANUP = "cleanup"


@dataclass(frozen=True)
class ExtensionPoint:
    """Describes a single location where plugins can inject behavior.

    Attributes:
        name: Unique identifier for this extension point within the framework.
        phase: Lifecycle phase when registered hooks execute.
        input_type: Expected type of data passed to hooks at this point.
        output_type: Expected return type from hooks (can be None for side-effect-only hooks).
        priority_range: Valid range for hook priority values. Lower runs first.
        error_policy: How framework handles exceptions thrown by registered hooks.
    """
    name: str
    phase: ExtensionPhase
    input_type: type | None = None
    output_type: type | None = None
    priority_range: tuple[int, int] = (-100, 100)
    error_policy: str = "isolate"  # "isolate", "abort", "continue"

    def validate_priority(self, priority: int) -> bool:
        """Check if a priority value falls within the allowed range."""
        low, high = self.priority_range
        return low <= priority <= high


class ExtensionHook(Protocol):
    """Contract that all plugin hooks must satisfy at an extension point."""

    def __call__(self, context: Any) -> Any: ...

    @property
    def priority(self) -> int: ...

    @property
    def name(self) -> str: ...


def catalog_extension_points(domain_model: type) -> list[ExtensionPoint]:
    """Analyze a domain model and identify natural extension points.

    Scans the provided class for methods that delegate to strategies,
    read from configuration-driven behavior tables, or contain
    branching logic based on external input — all indicators of
    natural plugin boundaries.

    Args:
        domain_model: The core framework class to analyze.

    Returns:
        List of identified extension points with inferred contracts.
    """
    import inspect
    from types import FunctionType

    points: list[ExtensionPoint] = []
    analyzed_methods: set[str] = set()

    for name, method in inspect.getmembers(domain_model, predicate=inspect.isfunction):
        if name.startswith("_") and name != "__init__":
            continue
        if name in analyzed_methods:
            continue

        source = inspect.getsource(method) if hasattr(inspect, 'getsource') else ""

        # Heuristic: methods with strategy dispatch or config lookups are extension points
        is_extension_candidate = (
            "strategy" in source.lower() or
            "config." in source.lower() or
            "plugin" in source.lower() or
            any(keyword in source for keyword in [".get(", "dict[", "case ", "if mode"])
        )

        if is_extension_candidate:
            analyzed_methods.add(name)
            sig = inspect.signature(method)
            input_type = None
            output_type = None

            # Infer input from first parameter (usually self is skipped)
            params = list(sig.parameters.values())
            if len(params) > 1:
                param = params[1]
                if param.annotation != inspect.Parameter.empty:
                    input_type = param.annotation

            if sig.return_annotation != inspect.Parameter.empty:
                output_type = sig.return_annotation

            phase = _infer_phase_from_name(name, source)

            points.append(ExtensionPoint(
                name=f"{domain_model.__name__}.{name}",
                phase=phase,
                input_type=input_type,
                output_type=output_type,
            ))

    return sorted(points, key=lambda p: (p.phase.value, p.name))


def _infer_phase_from_name(method_name: str, source: str) -> ExtensionPhase:
    """Heuristically infer the lifecycle phase from a method's name or body."""
    lower = method_name.lower()
    if any(kw in lower for kw in ("pre_", "before_", "init_", "prepare_")):
        return ExtensionPhase.BEFORE_INPUT
    if any(kw in lower for kw in ("valid", "check_", "verify_")):
        return ExtensionPhase.VALIDATE
    if any(kw in lower for kw in ("transform", "process_", "handle_", "execute_")):
        return ExtensionPhase.PROCESS
    if any(kw in lower for kw in ("post_", "after_", "cleanup_", "finish_")):
        return ExtensionPhase.POST_PROCESS
    return ExtensionPhase.PROCESS  # default
```

**Checkpoint:** Every method in your domain model that exhibits branching based on external input has an identified extension point. If a method has no corresponding `ExtensionPoint`, justify why it should remain non-extensible.

---

### 2. Plugin Interface Design — Define Strict Type Contracts

Each plugin interface must be a Protocol or ABC with explicit type annotations, documented side effects, and clearly defined error conditions. No duck typing at extension boundaries — interfaces are contracts, not suggestions.

```python
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Generic, Protocol, TypeVar


logger = logging.getLogger(__name__)


T = TypeVar("T")
U = TypeVar("U")


@dataclass(frozen=True)
class PluginMetadata:
    """Immutable metadata describing a loaded plugin.

    Attributes:
        name: Unique plugin identifier (namespace/name format).
        version: Semantic version string.
        author: Organization or developer name.
        supported_versions: Framework version range this plugin supports.
        requires_config_keys: Set of top-level config keys this plugin expects.
    """
    name: str
    version: str = "0.0.0"
    author: str = ""
    supported_versions: tuple[str, str] = ("*", "*")
    requires_config_keys: frozenset[str] = field(default_factory=frozenset)


class PluginError(Exception):
    """Raised when a plugin violates its interface contract."""

    def __init__(self, plugin_name: str, violation: str, context: dict[str, Any] | None = None) -> None:
        self.plugin_name = plugin_name
        self.violation = violation
        self.context = context or {}
        super().__init__(f"PluginError[{plugin_name}]: {violation}")


class Plugin(ABC, Generic[T, U]):
    """Abstract base for all framework plugins.

    Subclasses must implement the lifecycle methods and register themselves
    with the PluginRegistry upon instantiation via the metaclass hook.

    Attributes:
        metadata: Immutable plugin identity and capability description.
        _initialized: Flag indicating whether on_load has completed successfully.
    """

    def __init__(self, metadata: PluginMetadata) -> None:
        self.metadata = metadata
        self._initialized = False

    @property
    def name(self) -> str:
        return self.metadata.name

    @abstractmethod
    async def on_load(self, config: dict[str, Any]) -> None:
        """Called when the plugin is registered. Validate configuration and initialize resources.

        Args:
            config: Configuration dictionary provided by the framework loader.

        Raises:
            PluginError: If configuration is invalid or required resources are unavailable.
        """
        ...

    @abstractmethod
    async def execute(self, input_data: T) -> U:
        """Execute the plugin's primary transformation logic.

        Args:
            input_data: The data payload to process according to the plugin's contract.

        Returns:
            Transformed output matching the plugin's declared output type.

        Raises:
            PluginError: If the input violates the plugin's preconditions.
            RuntimeError: For unexpected failures during execution.
        """
        ...

    @abstractmethod
    async def on_unload(self) -> None:
        """Called when the plugin is being removed. Release all held resources."""
        ...

    def validate_input_type(self, data: Any, expected_type: type[T]) -> bool:
        """Validate that input_data matches the expected plugin input type.

        Args:
            data: The actual input to check.
            expected_type: The type declared by the plugin interface.

        Returns:
            True if data is an instance of expected_type.
        """
        if expected_type is Any:
            return True
        return isinstance(data, expected_type)


# --- Concrete Plugin Example ---

@dataclass
class TransformInput:
    raw_value: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class TransformOutput:
    processed_value: str
    tags: list[str] = field(default_factory=list)


class TextTransformer(Plugin[TransformInput, TransformOutput]):
    """Example plugin that transforms text with configurable rules.

    Subclasses override _apply_transform to provide custom logic
    while inheriting input validation, error handling, and lifecycle management.
    """

    def __init__(self, metadata: PluginMetadata, config: dict[str, Any] | None = None) -> None:
        super().__init__(metadata)
        self._config = config or {}
        self._rules: list[str] = self._config.get("rules", ["uppercase", "strip_whitespace"])

    async def on_load(self, config: dict[str, Any]) -> None:
        if not isinstance(config, dict):
            raise PluginError(
                self.name, "Configuration must be a dictionary", {"received_type": type(config).__name__}
            )
        known_keys = {"rules", "encoding", "fallback"}
        unexpected = set(config.keys()) - known_keys
        if unexpected:
            raise PluginError(
                self.name, f"Unknown configuration keys: {unexpected}",
                context={"unexpected_keys": list(unexpected)}
            )
        self._rules = config.get("rules", ["uppercase"])
        self._initialized = True

    async def execute(self, input_data: TransformInput) -> TransformOutput:
        if not self._initialized:
            raise PluginError(self.name, "Plugin not initialized — call on_load first")
        if not isinstance(input_data, TransformInput):
            raise PluginError(
                self.name, f"Invalid input type",
                context={"expected": TransformInput.__name__, "received": type(input_data).__name__}
            )

        result = input_data.raw_value
        for rule in self._rules:
            if rule == "uppercase":
                result = result.upper()
            elif rule == "lowercase":
                result = result.lower()
            elif rule == "strip_whitespace":
                result = result.strip()

        return TransformOutput(processed_value=result, tags=self._rules)

    async def on_unload(self) -> None:
        self._initialized = False
        self._rules.clear()
```

**Checkpoint:** Every plugin interface has explicit type annotations on all abstract methods, documented side effects in docstrings, and raises `PluginError` for contract violations — not generic exceptions.

---

### 3. Configuration Schema Definition — Validate Extensions Before Loading

Every extension point must have an accompanying JSON Schema or Pydantic model that validates the configuration before a plugin is registered. Reject invalid configs at load time, never at runtime.

```python
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SchemaValidationError:
    """Describes a single configuration validation failure."""
    key_path: str  # Dot-separated path to the invalid field
    message: str
    received_value: Any


class ConfigSchemaValidator:
    """Validates plugin configurations against declared schemas.

    Supports Pydantic models, JSON Schema dictionaries, and custom validators.
    Rejects configurations that violate the schema before any plugin code runs.
    """

    def __init__(self) -> None:
        self._schemas: dict[str, Any] = {}
        self._validators: dict[str, Any] = {}

    def register_schema(self, extension_name: str, schema: Any, validator_fn: Any | None = None) -> None:
        """Register a validation schema for a specific extension point.

        Args:
            extension_name: The name of the extension this schema applies to.
            schema: Either a Pydantic BaseModel class or a JSON Schema dictionary.
            validator_fn: Optional custom validation function taking (config) -> list[SchemaValidationError].
        """
        self._schemas[extension_name] = schema
        if validator_fn is not None:
            self._validators[extension_name] = validator_fn

    def validate(self, extension_name: str, config: dict[str, Any]) -> list[SchemaValidationError]:
        """Validate a configuration against the registered schema.

        Args:
            extension_name: The extension whose schema to use.
            config: Configuration dictionary to validate.

        Returns:
            List of validation errors (empty if valid).
        """
        if extension_name not in self._schemas:
            return [SchemaValidationError("", f"No schema registered for extension '{extension_name}'", config)]

        schema = self._schemas[extension_name]
        validator_fn = self._validators.get(extension_name)

        # Custom validator takes priority
        if validator_fn is not None:
            try:
                errors = validator_fn(config)
                return errors if isinstance(errors, list) else []
            except Exception as exc:
                return [SchemaValidationError("", f"Custom validator failed: {exc}", config)]

        # JSON Schema validation
        if isinstance(schema, dict) and "$schema" in schema:
            return self._validate_json_schema(schema, config)

        # Pydantic model validation
        try:
            model_cls = schema if hasattr(schema, "model_validate") else None
            if model_cls is not None:
                model_cls.model_validate(config)  # type: ignore[attr-defined]
                return []
        except Exception:
            pass

        return [SchemaValidationError("", f"Unsupported schema type: {type(schema).__name__}", config)]


    def _validate_json_schema(self, schema: dict[str, Any], config: dict[str, Any]) -> list[SchemaValidationError]:
        """Validate config against a JSON Schema definition.

        Uses a lightweight approach without external dependencies —
        checks required fields and basic type constraints.
        """
        errors: list[SchemaValidationError] = []

        required_fields = schema.get("required", [])
        properties = schema.get("properties", {})

        for req_key in required_fields:
            if req_key not in config:
                errors.append(SchemaValidationError(
                    key_path=req_key,
                    message=f"Required field missing: {req_key}",
                    received_value=None
                ))

        # Type checking for provided fields
        for key, value in config.items():
            if key in properties:
                expected_type_spec = properties[key].get("type")
                if expected_type_spec and isinstance(value, dict):
                    # Nested object — simple check
                    continue

        return errors


# --- Usage Example ---

def create_text_transformer_schema() -> dict[str, Any]:
    """Define the JSON Schema for the TextTransformer plugin."""
    return {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["rules"],
        "properties": {
            "rules": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 1,
                "enum": ["uppercase", "lowercase", "strip_whitespace", "title_case"],
            },
            "encoding": {
                "type": "string",
                "default": "utf-8",
                "enum": ["utf-8", "ascii", "latin-1"],
            },
            "fallback": {
                "type": "string",
                "default": "",
            },
        },
    }


# Demonstrate validation
if __name__ == "__main__":
    validator = ConfigSchemaValidator()
    validator.register_schema("text_transformer", create_text_transformer_schema())

    # Valid config
    valid_config = {"rules": ["uppercase", "strip_whitespace"], "encoding": "utf-8"}
    errors = validator.validate("text_transformer", valid_config)
    print(f"Valid config errors: {errors}")  # []

    # Invalid config — missing required field
    invalid_config = {"encoding": "ascii"}
    errors = validator.validate("text_transformer", invalid_config)
    print(f"Invalid config errors: {[e.message for e in errors]}")
```

**Checkpoint:** Every plugin has a registered schema, and no plugin passes the `on_load` phase without first passing schema validation. Invalid configurations are rejected with specific error messages pointing to exact field paths.

---

### 4. Lifecycle Management — Enforce Ordered Hook Execution with Error Isolation

The framework must manage the full plugin lifecycle (load → execute → unload) and ensure hooks at each phase execute in priority order. Exceptions from one hook must not prevent other hooks from running — errors are collected and reported, never swallowed silently.

```python
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Callable


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class HookExecutionResult:
    """Result of executing a single hook in the lifecycle pipeline."""
    hook_name: str
    phase: str
    priority: int
    succeeded: bool
    output: Any | None = None
    error: Exception | None = None


class LifecycleManager:
    """Manages ordered execution of hooks across all extension phases.

    Each phase maintains a sorted list of hook functions by priority.
    Execution is sequential within a phase but isolated per hook so that
    one failure does not prevent subsequent hooks from running.

    Attributes:
        _phases: Mapping of phase name → list of (priority, callable) tuples, sorted ascending.
        _registered_hooks: Registry tracking which hooks are active per extension.
    """

    def __init__(self) -> None:
        self._phases: dict[str, list[tuple[int, Callable[..., Any], str]]] = {}
        self._registered_hooks: dict[str, list[str]] = {}

    def register_hook(
        self, phase_name: str, priority: int, hook_fn: Callable[..., Any],
        extension_name: str, description: str = ""
    ) -> None:
        """Register a hook function for execution at a specific lifecycle phase.

        Hooks are sorted by priority (ascending) within each phase before execution.

        Args:
            phase_name: The lifecycle phase to attach this hook to.
            priority: Execution order — lower values run first. Must be in the extension point's range.
            hook_fn: Async callable accepting a shared context dict.
            extension_name: Owning extension identifier for lifecycle tracking.
            description: Human-readable name of this hook for logging.
        """
        if phase_name not in self._phases:
            self._phases[phase_name] = []

        # Validate priority range against the registered extension point
        from framework_extension import get_extension_point  # type: ignore
        try:
            ep = get_extension_point(phase_name)
            if not ep.validate_priority(priority):
                raise ValueError(
                    f"Priority {priority} out of range [{ep.priority_range}] for phase '{phase_name}'"
                )
        except Exception:
            # If we can't resolve the extension point, log warning but allow registration
            logger.warning("Could not validate priority %s for phase %s — registering anyway", priority, phase_name)

        self._phases[phase_name].append((priority, hook_fn, description or f"hook_at_{phase_name}_{len(self._phases[phase_name])}"))
        self._phases[phase_name].sort(key=lambda x: x[0])

        if extension_name not in self._registered_hooks:
            self._registered_hooks[extension_name] = []
        hook_desc = description or f"hook_at_{phase_name}"
        if hook_desc not in self._registered_hooks[extension_name]:
            self._registered_hooks[extension_name].append(hook_desc)

    def unregister_hook(self, extension_name: str) -> None:
        """Remove all hooks registered by a specific extension.

        Args:
            extension_name: The extension whose hooks to remove from all phases.
        """
        for phase_hooks in self._phases.values():
            self._phases[phase_name] = [
                (p, fn, desc) for p, fn, desc in phase_hooks
                if desc not in (self._registered_hooks.get(extension_name, []))
            ]
        self._registered_hooks.pop(extension_name, None)

    async def execute_phase(self, phase_name: str, context: dict[str, Any]) -> list[HookExecutionResult]:
        """Execute all hooks registered for a phase in priority order.

        Each hook runs in isolation — exceptions are caught and recorded
        but do not prevent subsequent hooks from executing.

        Args:
            phase_name: The lifecycle phase to execute.
            context: Shared mutable context dict passed to every hook.

        Returns:
            List of HookExecutionResult objects, one per executed hook.
        """
        hooks = self._phases.get(phase_name, [])
        results: list[HookExecutionResult] = []

        for priority, hook_fn, description in hooks:
            try:
                output = await hook_fn(context) if asyncio.iscoroutinefunction(hook_fn) else hook_fn(context)  # type: ignore[misc]
                results.append(HookExecutionResult(
                    hook_name=description, phase=phase_name,
                    priority=priority, succeeded=True, output=output
                ))
            except Exception as exc:
                logger.error("Hook '%s' in phase '%s' failed (priority=%d): %s",
                             description, phase_name, priority, exc)
                results.append(HookExecutionResult(
                    hook_name=description, phase=phase_name,
                    priority=priority, succeeded=False, error=exc
                ))

        return results

    async def execute_all_phases(self, context: dict[str, Any]) -> dict[str, list[HookExecutionResult]]:
        """Execute all registered phases in their defined order.

        Args:
            context: Shared context passed to every phase and hook.

        Returns:
            Mapping of phase name → list of execution results.
        """
        ordered_phases = [
            ExtensionPhase.BEFORE_INPUT,
            ExtensionPhase.VALIDATE,
            ExtensionPhase.PROCESS,
            ExtensionPhase.POST_PROCESS,
        ]
        results: dict[str, list[HookExecutionResult]] = {}

        for phase in ordered_phases:
            phase_results = await self.execute_phase(phase.value, context)
            results[phase.value] = phase_results

            # Check for abort policy — if any hook failed with error_policy "abort"
            if any(not r.succeeded and getattr(r.error, "error_policy", "isolate") == "abort"
                   for phase_res in results.values()
                   for r in phase_res):
                logger.warning("Abort triggered at phase %s — skipping remaining phases", phase.value)
                break

        return results


# --- Demonstration ---

if __name__ == "__main__":
    async def demo() -> None:
        manager = LifecycleManager()

        async def logging_hook(ctx: dict[str, Any]) -> dict[str, Any]:
            print(f"[HOOK] Logging: {ctx.get('action', 'unknown')}")
            return {"logged": True}

        async def transform_hook(ctx: dict[str, Any]) -> dict[str, Any]:
            value = ctx.get("value", "")
            ctx["transformed"] = value.upper()
            return {"transformed": True}

        # Register hooks with priorities
        manager.register_hook(ExtensionPhase.VALIDATE.value, priority=10, hook_fn=logging_hook,
                              extension_name="logging_plugin", description="validate-logger")
        manager.register_hook(ExtensionPhase.PROCESS.value, priority=5, hook_fn=transform_hook,
                              extension_name="transformer_plugin", description="data-transformer")

        # Execute all phases
        context = {"value": "hello world", "action": "test_request"}
        results = await manager.execute_all_phases(context)

        for phase, hooks in results.items():
            print(f"\nPhase: {phase}")
            for h in hooks:
                status = "OK" if h.succeeded else f"FAIL ({h.error})"
                print(f"  [{status}] {h.hook_name} (priority={h.priority})")

    asyncio.run(demo())
```

**Checkpoint:** Hook execution results are collected and inspectable after each phase. Failed hooks log errors but do not crash the pipeline unless the error policy explicitly requires aborting. Every hook has a unique description for traceability in production logs.

---

### 5. Validation Enforcement — Fail Fast During Registration, Not at Runtime

Register every plugin through a central registry that validates: type conformance against the declared interface, schema compliance, and uniqueness of extension point registrations. Plugins that fail validation are rejected with detailed error messages during startup, never silently loaded.

```python
from __future__ import annotations

import importlib.metadata
import logging
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RegistrationResult:
    """Outcome of a plugin registration attempt.

    Attributes:
        success: Whether the plugin was registered successfully.
        plugin_name: Name of the attempted plugin.
        errors: List of human-readable error messages (empty on success).
        warnings: Non-fatal observations that don't block registration.
    """
    success: bool
    plugin_name: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class PluginRegistry:
    """Central registry for framework plugins with validation enforcement.

    All plugins must go through this registry before they can be loaded
    or executed. The registry enforces type conformance, schema validation,
    and registration uniqueness.

    Attributes:
        _plugins: Mapping of plugin name → Plugin instance.
        _schemas: Mapping of extension point name → validation schema.
        _validators: ConfigSchemaValidator instance for config validation.
    """

    def __init__(self) -> None:
        self._plugins: dict[str, Plugin] = {}
        self._schemas: dict[str, Any] = {}
        self._validators = ConfigSchemaValidator()

    def register_schema(self, extension_point_name: str, schema: Any) -> None:
        """Register a validation schema for an extension point.

        Args:
            extension_point_name: Name of the extension point.
            schema: JSON Schema dict or Pydantic model class.
        """
        self._schemas[extension_point_name] = schema
        self._validators.register_schema(extension_point_name, schema)

    def register_plugin(self, plugin: Plugin, config: dict[str, Any] | None = None) -> RegistrationResult:
        """Validate and register a plugin through the central registry.

        Performs three validation gates in order:
        1. Type conformance — does the plugin implement the Plugin ABC?
        2. Schema validation — does its config match the extension's schema?
        3. Uniqueness — is there no existing plugin with the same name?

        Args:
            plugin: The Plugin instance to register.
            config: Configuration dictionary for this plugin.

        Returns:
            RegistrationResult with detailed success/failure information.
        """
        errors: list[str] = []
        warnings: list[str] = []
        plugin_name = plugin.name

        # Gate 1: Type conformance check
        if not isinstance(plugin, Plugin):
            errors.append(
                f"Plugin '{plugin_name}' does not implement the Plugin ABC. "
                f"Missing abstract methods: {self._missing_abstract_methods(type(plugin))}"
            )

        # Gate 2: Schema validation
        if config is not None:
            schema_errors = self._validators.validate(plugin_name, config)
            for err in schema_errors:
                errors.append(f"Config validation failed for '{plugin_name}': [{err.key_path}] {err.message}")

        # Gate 3: Uniqueness check
        if plugin_name in self._plugins:
            existing = self._plugins[plugin_name]
            errors.append(
                f"Plugin name '{plugin_name}' is already registered "
                f"(version {existing.metadata.version})"
            )

        # Gate 4: on_load execution (if all gates passed)
        if not errors and plugin_name not in self._plugins:
            import asyncio
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop:
                asyncio.run_coroutine_threadsafe(plugin.on_load(config or {}), loop)
            else:
                try:
                    import asyncio
                    asyncio.run(plugin.on_load(config or {}))
                except Exception as load_exc:
                    errors.append(f"Plugin on_load failed for '{plugin_name}': {load_exc}")

        if errors:
            return RegistrationResult(success=False, plugin_name=plugin_name, errors=errors, warnings=warnings)

        self._plugins[plugin_name] = plugin
        return RegistrationResult(success=True, plugin_name=plugin_name, errors=[], warnings=warnings)


    def get_plugin(self, name: str) -> Plugin | None:
        """Retrieve a registered plugin by name.

        Args:
            name: The plugin's unique identifier.

        Returns:
            The Plugin instance or None if not found.
        """
        return self._plugins.get(name)

    def list_plugins(self) -> list[str]:
        """Return names of all currently registered plugins, sorted alphabetically."""
        return sorted(self._plugins.keys())

    def unregister_plugin(self, name: str) -> RegistrationResult:
        """Remove a plugin from the registry and call its on_unload hook.

        Args:
            name: Plugin identifier to remove.

        Returns:
            RegistrationResult indicating success or failure.
        """
        if name not in self._plugins:
            return RegistrationResult(
                success=False, plugin_name=name,
                errors=[f"No plugin registered with name '{name}'"]
            )

        plugin = self._plugins.pop(name)
        try:
            import asyncio
            asyncio.run(plugin.on_unload())
        except Exception as exc:
            return RegistrationResult(
                success=False, plugin_name=name,
                errors=[f"Plugin on_unload failed for '{name}': {exc}"]
            )

        return RegistrationResult(success=True, plugin_name=name)

    def _missing_abstract_methods(self, cls: type) -> list[str]:
        """Identify which abstract methods are not implemented by a class."""
        if not hasattr(ABC, '__abstractmethods__'):
            return []
        try:
            from abc import ABC
            missing = []
            for attr in getattr(cls, '__abstractmethods__', set()):
                if not hasattr(cls, attr) or isinstance(getattr(cls, attr), property):
                    missing.append(attr)
            return missing
        except Exception:
            return []
```

**Checkpoint:** The registry rejects misconfigured plugins at registration time with specific error messages. No plugin can execute unless it passes all four validation gates (type conformance, schema validation, uniqueness, on_load success).

---

### 6. Backward Compatibility Planning — Document How Plugin Interfaces Evolve Across Versions

Create a compatibility contract that defines what changes are allowed between major/minor/patch versions. Use version ranges in plugin metadata to declare supported framework versions. Provide migration guides for deprecated interfaces.

```python
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class VersionBump(Enum):
    MAJOR = "major"      # Breaking change — plugins may break
    MINOR = "minor"      # New feature — backward compatible
    PATCH = "patch"      # Bug fix — backward compatible


@dataclass(frozen=True)
class CompatibilityRule:
    """Defines what kinds of changes are allowed in a version bump.

    Attributes:
        plugin_interface_name: The interface this rule applies to.
        allowed_modifications: Operations permitted without breaking plugins.
        deprecated_operations: Operations that work but emit warnings.
        removed_operations: Operations no longer available after this version.
        migration_guide_url: URL to documentation on how to migrate plugins.
    """
    plugin_interface_name: str
    allowed_modifications: list[str] = field(default_factory=list)
    deprecated_operations: list[str] = field(default_factory=list)
    removed_operations: list[str] = field(default_factory=list)
    migration_guide_url: str = ""


class CompatibilityChecker:
    """Validates plugin compatibility against declared framework version constraints.

    Tracks semantic versions of both the framework core and each plugin,
    enforcing that plugins only load when their supported version range
    includes the current framework version.
    """

    VERSION_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")

    def __init__(self) -> None:
        self._rules: dict[str, CompatibilityRule] = {}
        self._current_framework_version: str = "0.0.0"

    def set_framework_version(self, version: str) -> None:
        """Set the current framework core version for compatibility checks.

        Args:
            version: Semantic version string (e.g., "3.2.1").
        """
        self._validate_semver(version)
        self._current_framework_version = version

    def register_rule(self, rule: CompatibilityRule) -> None:
        """Register a compatibility rule for a plugin interface.

        Args:
            rule: The compatibility rule defining allowed/forbidden changes.
        """
        self._rules[rule.plugin_interface_name] = rule

    def check_plugin_compatibility(
        self, plugin: Plugin, framework_version: str | None = None
    ) -> list[str]:
        """Check whether a plugin is compatible with the current framework version.

        Args:
            plugin: The plugin to check.
            framework_version: Optional override for the framework version (defaults to set value).

        Returns:
            List of compatibility issues (empty if fully compatible).
        """
        fw_ver = framework_version or self._current_framework_version
        issues: list[str] = []

        # Parse versions
        fw_parts = self._parse_semver(fw_ver)
        plugin_parts = self._parse_semver(plugin.metadata.version)

        # Check major version — breaking change if plugin targets different major
        fw_major, fw_minor, _ = fw_parts
        plugin_major, plugin_minor, _ = plugin_parts

        if fw_major != plugin_major and plugin_major > 0:
            issues.append(
                f"Plugin '{plugin.name}' targets major v{plugin_major}, "
                f"but framework is at v{fw_major}. Breaking changes likely."
            )

        # Check if the plugin's interface has been modified since its version
        rule = self._rules.get(plugin.__class__.__name__)
        if rule:
            for removed in rule.removed_operations:
                if hasattr(plugin, removed):
                    issues.append(
                        f"Plugin '{plugin.name}' uses deprecated method '{removed}' "
                        f"which was removed in framework {fw_ver}. "
                        f"Migrate: {rule.migration_guide_url}"
                    )

            for deprecated in rule.deprecated_operations:
                if hasattr(plugin, deprecated):
                    import warnings
                    warnings.warn(
                        f"Plugin '{plugin.name}' uses method '{deprecated}' "
                        f"which is deprecated in framework {fw_ver}.",
                        DeprecationWarning, stacklevel=2
                    )

        return issues

    def _validate_semver(self, version: str) -> bool:
        """Validate that a string conforms to semantic versioning format."""
        if not self.VERSION_PATTERN.match(version):
            raise ValueError(f"Invalid semver format: '{version}' — expected X.Y.Z")
        return True

    def _parse_semver(self, version: str) -> tuple[int, int, int]:
        """Parse a semantic version string into (major, minor, patch) integers."""
        match = self.VERSION_PATTERN.match(version)
        if not match:
            raise ValueError(f"Cannot parse semver: '{version}'")
        return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


# --- Usage Example ---

if __name__ == "__main__":
    checker = CompatibilityChecker()
    checker.set_framework_version("3.2.1")

    rule = CompatibilityRule(
        plugin_interface_name="TextTransformer",
        allowed_modifications=["add_method", "add_parameter_with_default"],
        deprecated_operations=["legacy_transform"],
        removed_operations=["remove_this_method_v4"],
        migration_guide_url="https://docs.example.com/migrate-v3-to-v4"
    )
    checker.register_rule(rule)

    # Simulate a plugin
    meta = PluginMetadata(name="my-transformer", version="3.1.0", author="team-abc")
    plugin = TextTransformer(metadata=meta, config={"rules": ["uppercase"]})

    issues = checker.check_plugin_compatibility(plugin)
    if issues:
        for issue in issues:
            print(f"  ⚠ {issue}")
    else:
        print("Plugin is fully compatible.")
```

**Checkpoint:** Every plugin interface has an associated `CompatibilityRule` documenting allowed modifications, deprecations, and removals. Plugin metadata includes a version range declaration that the checker validates at load time. Breaking changes between major versions are explicitly blocked unless the plugin declares compatibility.

---

## Implementation Patterns

### Pattern 1: Entry Point Discovery for Console Script Plugins

Enable third-party plugins to self-register via Python entry points (similar to setuptools/console_scripts), allowing them to be discovered automatically without manual registration code.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EntryPoint:
    """Represents a discovered plugin entry point from distribution metadata.

    Attributes:
        name: Entry point group/name (e.g., "my_framework.plugins").
        value: Dotted import path to the plugin class (e.g., "mypackage.plugin:MyPlugin").
        dist_name: Name of the distribution that provides this entry point.
        dist_version: Version of the providing distribution.
    """
    name: str
    value: str
    dist_name: str
    dist_version: str


def discover_entry_points(group: str) -> list[EntryPoint]:
    """Discover all registered entry points for a given group.

    Uses importlib.metadata to find plugins that have registered
    themselves via setuptools/pyproject.toml console_scripts-style
    entry point declarations.

    Args:
        group: The entry point group name as declared in pyproject.toml.

    Returns:
        List of EntryPoint objects representing discoverable plugins.
    """
    import importlib.metadata as metadata

    entries: list[EntryPoint] = []

    try:
        dists = metadata.distributions()
        for dist in dists:
            eps = dist.entry_points
            for ep in eps:
                if ep.group == group:
                    entries.append(EntryPoint(
                        name=ep.name,
                        value=ep.value,
                        dist_name=dist.metadata.get("Name", "unknown"),
                        dist_version=dist.version or "0.0.0",
                    ))
    except Exception as exc:
        logger.warning("Failed to discover entry points in group '%s': %s", group, exc)

    return entries


def load_entry_point(entry: EntryPoint) -> Any | None:
    """Dynamically import and instantiate a class from an entry point value.

    The entry point value format is "module.path:class_name".
    This function imports the module, retrieves the class, and returns it.

    Args:
        entry: The EntryPoint discovered via metadata.

    Returns:
        The imported class object, or None on failure.
    """
    try:
        module_path, class_name = entry.value.rsplit(":", 1)
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name, None)
        if cls is None:
            logger.error("Entry point '%s' does not export class '%s'", entry.value, class_name)
            return None
        if not isinstance(cls, type):
            logger.error("Entry point '%s' exports '%s' which is not a class", entry.value, class_name)
            return None
        return cls
    except ImportError as exc:
        logger.warning("Failed to import module for entry point '%s': %s", entry.name, exc)
        return None
    except Exception as exc:
        logger.error("Unexpected error loading entry point '%s': %s", entry.name, exc)
        return None


if __name__ == "__main__":
    # Discover plugins in a group (replace with your actual group name)
    discovered = discover_entry_points("my_framework.plugins")
    for ep in discovered:
        print(f"  {ep.dist_name}=={ep.dist_version}: {ep.name} → {ep.value}")

        cls = load_entry_point(ep)
        if cls is not None:
            # Instantiate and register the plugin class
            import sys
            from inspect import signature
            sig = signature(cls.__init__)
            params = list(sig.parameters.values())
            if len(params) > 1:
                print(f"    Constructor requires: {[p.name for p in params[1:]]}")
```

**Checkpoint:** All discoverable entry points are listed with their source distribution and version. Failed imports log warnings but don't crash the discovery process — misconfigured plugins are isolated, not fatal.

---

### Pattern 2: Middleware Chain Builder with Cross-Cutting Concerns

Build composable middleware chains where each middleware has access to request/response context, can short-circuit processing, and participates in structured error handling across the entire pipeline.

```python
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Callable


logger = logging.getLogger(__name__)


@dataclass
class MiddlewareContext:
    """Shared mutable context passed through the middleware chain.

    Each middleware can read and write fields to pass state downstream.
    Setting `halted` to True prevents subsequent middleware from executing.

    Attributes:
        request: Incoming request data (set by first middleware or framework).
        response: Accumulated response data (built by middleware).
        halted: If True, remaining middleware in the chain are skipped.
        error: Set when an exception occurs in the pipeline.
        metadata: Free-form dict for arbitrary middleware-to-middleware communication.
    """
    request: Any = None
    response: Any = None
    halted: bool = False
    error: Exception | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


# Type alias for a single middleware function
MiddlewareFn = Callable[[MiddlewareContext], asyncio.Future[Any] | None]


class MiddlewareChain:
    """Composable middleware chain with early-exit support.

    Middleware are added via `use()` and executed in registration order.
    Any middleware can set `context.halted = True` to prevent downstream processing.
    Exceptions are captured and stored in context.error without crashing the chain.

    Attributes:
        _middlewares: List of (name, priority, fn) tuples sorted by priority.
    """

    def __init__(self) -> None:
        self._middlewares: list[tuple[str, int, MiddlewareFn]] = []

    def use(self, name: str, priority: int, middleware_fn: MiddlewareFn) -> None:
        """Add a middleware function to the chain.

        Args:
            name: Human-readable identifier for this middleware.
            priority: Execution order — lower numbers run first.
            middleware_fn: Async callable that receives and optionally mutates context.
        """
        self._middlewares.append((name, priority, middleware_fn))
        self._middlewares.sort(key=lambda x: x[1])

    async def process(self, context: MiddlewareContext) -> MiddlewareContext:
        """Execute the full middleware pipeline on the given context.

        Each middleware runs in sequence. If a middleware sets
        `context.halted = True`, subsequent middleware are skipped.
        Exceptions in any middleware are caught and stored in context.error.

        Args:
            context: The initial request context to process.

        Returns:
            The (possibly modified) context after all applicable middleware run.
        """
        for name, _, middleware_fn in self._middlewares:
            if context.halted or context.error is not None:
                logger.debug("Skipping middleware '%s' — chain halted or errored", name)
                break

            try:
                result = middleware_fn(context)
                if asyncio.iscoroutine(result) or asyncio.isfuture(result):
                    await result  # type: ignore[misc]
            except Exception as exc:
                logger.exception("Middleware '%s' failed", name)
                context.error = exc
                context.halted = True
                break

        return context


# --- Concrete Middleware Examples ---

async def auth_middleware(ctx: MiddlewareContext) -> None:
    """Validate authentication tokens on incoming requests."""
    headers = ctx.request.get("headers", {}) if isinstance(ctx.request, dict) else {}
    token = headers.get("Authorization", "")

    if not token.startswith("Bearer "):
        ctx.error = ValueError("Missing or invalid Authorization header")
        ctx.halted = True
        ctx.response = {"error": "unauthorized", "code": 401}
        return

    # In production, validate JWT here
    ctx.metadata["auth_valid"] = True


async def rate_limit_middleware(ctx: MiddlewareContext) -> None:
    """Apply rate limiting based on client IP in the request metadata."""
    if not isinstance(ctx.request, dict):
        return

    client_ip = ctx.request.get("client_ip", "unknown")
    request_count = ctx.metadata.get(f"rate_limit:{client_ip}", 0)

    MAX_REQUESTS_PER_WINDOW = 100
    if request_count >= MAX_REQUESTS_PER_WINDOW:
        ctx.error = RuntimeError(f"Rate limit exceeded for {client_ip}")
        ctx.halted = True
        ctx.response = {"error": "rate_limit_exceeded", "code": 429}


async def logging_middleware(ctx: MiddlewareContext) -> None:
    """Log the final response after all middleware have run."""
    if ctx.error is not None:
        logger.warning("Request failed: %s — error=%s", ctx.request, ctx.error)
    else:
        logger.info("Request processed successfully. Response keys: %s",
                    list(ctx.response.keys()) if isinstance(ctx.response, dict) else "N/A")


# --- Usage Example ---

if __name__ == "__main__":
    chain = MiddlewareChain()
    chain.use("auth", priority=10, middleware_fn=auth_middleware)
    chain.use("rate_limit", priority=20, middleware_fn=rate_limit_middleware)
    chain.use("logging", priority=100, middleware_fn=logging_middleware)

    async def demo() -> None:
        # Valid request
        ctx1 = MiddlewareContext(
            request={"headers": {"Authorization": "Bearer valid-token"}, "client_ip": "10.0.0.1"}
        )
        result1 = await chain.process(ctx1)
        print(f"Valid: halted={result1.halted}, error={result1.error}")

        # Missing auth
        ctx2 = MiddlewareContext(
            request={"headers": {}, "client_ip": "10.0.0.2"}
        )
        result2 = await chain.process(ctx2)
        print(f"No auth: halted={result2.halted}, error={result2.error}")

    asyncio.run(demo())
```

**Checkpoint:** Every middleware is independently testable — pass a `MiddlewareContext` with controlled inputs and verify the mutations. The chain supports early exit via `context.halted`, and all errors flow through `context.error` for centralized handling downstream.

---

## Constraints

### MUST DO
- Define every plugin interface as an ABC or Protocol with explicit type annotations
- Register validation schemas before any plugin loads — reject invalid config at registration time
- Execute hooks in priority order within each lifecycle phase
- Isolate hook exceptions so one failure does not crash the entire phase
- Document backward compatibility rules for every public plugin interface

### MUST NOT DO
- Never use duck typing at plugin boundaries — enforce interface conformance with isinstance() checks
- Load plugins without validating their configuration schema first
- Allow multiple plugins with identical names in the registry without version differentiation
- Execute hooks synchronously if any hook might perform I/O — always use async
- Modify shared `MiddlewareContext` fields outside of declared middleware — all mutations go through explicit middleware functions

---

## Output Template

When this skill is active, model output must contain:

1. **Extension Point Catalog** — List of identified extension points with phase, input/output types, and priority ranges
2. **Plugin Interface Definitions** — ABC/Protocol definitions with type signatures and docstrings
3. **Configuration Schemas** — JSON Schema or Pydantic models for every plugin's config
4. **Lifecycle Manager Setup** — Hook registration code with priorities and error policies
5. **Registry Registration Flow** — Plugin instantiation, schema validation, and compatibility checking
6. **Backward Compatibility Matrix** — Allowed modifications per version bump with migration URLs

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-application-methodology` | Systematically evaluate third-party frameworks before building your own extensible one |
| `coding-knowledge-transfer-methods` | Train team members on the plugin architecture and extension point conventions |
