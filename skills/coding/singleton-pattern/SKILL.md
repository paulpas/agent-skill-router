---
name: singleton-pattern
description: Implements the GoF Singleton pattern for controlled object lifecycle management in Python using module-level singletons, metaclass-based enforcement, threading-safe lazy initialization, and async-compatible variants.
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: singleton pattern, module-level singleton, metaclass singleton, thread-safe singleton, lazy initialization singleton, object lifecycle management, how do i ensure single instance
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: dependency-inversion-principle, factory-method, creational-design-patterns
---

# Singleton Pattern

Senior Python engineer implementing singleton patterns for controlled object lifecycle management. This skill makes the model choose the most Pythonic singleton approach for each scenario — from natural module-level singletons to metaclass-enforced, thread-safe lazy-initialized, and async-compatible variants — while avoiding anti-patterns that violate DIP and create testing difficulties.

## TL;DR Checklist

- [ ] Prefer module-level variables as the default singleton — they are free, thread-safe, and Pythonic
- [ ] Use metaclass-based singletons when you need strict enforcement at the class level with subclassing control
- [ ] Apply `threading.Lock` only when lazy initialization requires it; module imports are already thread-safe
- [ ] Never use a singleton for mutable shared state — inject dependencies via DI instead
- [ ] Provide a context manager variant when cleanup (close, flush) is required on shutdown

---

## When to Use

Use this skill when:

- You need exactly one instance of a configuration store that must be accessible throughout the application
- A connection pool or registry should exist as a single shared resource across the process
- A logger wrapper must centralize log routing and formatting through one object
- You are building a plugin registry where all plugins register against the same global store
- The singleton holds immutable or read-mostly state that is safe for concurrent access

---

## When NOT to Use

Avoid this skill for:

- Any mutable shared state — use explicit dependency injection instead (violates DIP)
- Objects that need different configurations in tests — singletons are hard to mock and replace
- Creating objects that hold database connections without lifecycle management — use a factory or context manager
- When the "single instance" constraint is only needed in one place — pass the object explicitly

---

## Core Workflow

1. **Evaluate Module-Level Singleton First** — Before reaching for any pattern, ask: can this be a module-level variable? Module imports are thread-safe in CPython (GIL prevents race during import). This is always the simplest and most Pythonic approach. **Checkpoint:** If the object has no `__init__` parameters that change at runtime, module level is sufficient.

2. **Choose Singleton Variant Based on Requirements** — Match the variant to your constraints:
   - Simple + thread-safe → Module-level (preferred)
   - Class-level + subclass control → Metaclass-based
   - Lazy init + threads → `threading.Lock` inside `__new__`
   - Async application → `asyncio.Lock` in async context
   - Needs cleanup → Context manager wrapper

3. **Implement Thread Safety** — If lazy initialization is needed, use a double-checked locking pattern with `threading.Lock`. The lock should be acquired only during the initial creation; subsequent calls skip the lock entirely. **Checkpoint:** Verify that two threads calling concurrently do not create two instances.

4. **Handle Async Scenarios** — In async code, use `asyncio.Lock` instead of `threading.Lock`. Be aware that asyncio is single-threaded by default but can run multiple event loops or use thread pools. **Checkpoint:** Ensure the async singleton works correctly when awaited from different tasks.

5. **Provide Context Manager Support** — For singletons with resources (connections, file handles), implement `__enter__`/`__exit__` or wrap in a context manager for deterministic cleanup. **Checkpoint:** Resource acquisition and release must be idempotent and safe to call multiple times.

---

## Implementation Patterns

### Pattern 1: Module-Level Singleton (Pythonic Default)

The simplest, most Pythonic singleton is just a module-level variable. No patterns, no magic — just import the module and use its global state.

```python
"""app_config.py — Module-level singleton for application configuration."""

from __future__ import annotations


class _Config:
    """Internal configuration store. Not meant to be instantiated directly."""

    def __init__(self) -> None:
        self._settings: dict[str, object] = {}
        self._initialized = False

    def load(self, settings: dict[str, object]) -> None:
        """Load configuration settings. Idempotent — safe to call multiple times.

        Args:
            settings: Dictionary of configuration key-value pairs.
        """
        if not isinstance(settings, dict):
            raise TypeError(f"Expected dict, got {type(settings).__name__}")
        self._settings = settings.copy()
        self._initialized = True

    def get(self, key: str, default: object = None) -> object:
        """Get a configuration value by key.

        Args:
            key: Configuration key to look up.
            default: Fallback value if key is not found.

        Returns:
            The configuration value or default.
        """
        return self._settings.get(key, default)

    def get_required(self, key: str) -> object:
        """Get a required configuration value, raising on missing keys.

        Args:
            key: Required configuration key.

        Returns:
            The configuration value.

        Raises:
            KeyError: If the key is not present in loaded settings.
        """
        if not self._initialized or key not in self._settings:
            raise KeyError(f"Required config missing: {key!r}")
        return self._settings[key]

    @property
    def is_loaded(self) -> bool:
        """Check whether configuration has been loaded."""
        return self._initialized


# Module-level singleton — automatically created at import time.
# Thread-safe by virtue of Python's GIL during module import.
config = _Config()
```

### Pattern 2: Metaclass Singleton with Subclass Control (BAD vs. GOOD)

The BAD approach uses a simple class-level attribute that can be accidentally re-assigned. The GOOD approach uses a metaclass to enforce single-instance semantics at the class level while preventing accidental instantiation.

```python
import threading
from typing import TypeVar, Generic


# ❌ BAD — Simple attribute-based singleton is easy to break
class BadConfigStore:
    _instance = None  # Any code can do: BadConfigStore._instance = something_else()

    def __init__(self) -> None:
        # This runs every time someone calls BadConfigStore() — silent bug!
        self._data: dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> "BadConfigStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


# ✅ GOOD — Metaclass enforces single instance and blocks direct construction
T = TypeVar("T")


class SingletonMeta(type, Generic[T]):
    """Thread-safe metaclass that ensures exactly one instance per class.

    Usage:
        class MyService(ServiceBase, metaclass=SingletonMeta):
            pass
    """

    _instances: dict[type, object] = {}
    _locks: dict[type, threading.Lock] = {}

    def __call__(cls, *args: object, **kwargs: object) -> T:
        """Override class instantiation to return the singleton instance."""
        if cls not in cls._instances:
            lock = cls._locks.setdefault(cls, threading.Lock())
            with lock:
                # Double-checked locking — verify after acquiring lock
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]  # type: ignore[return-value]

    @classmethod
    def reset(cls, target_class: type | None = None) -> None:
        """Reset singleton instances for testing purposes.

        Args:
            target_class: Specific class to reset, or None to reset all.

        Raises:
            TypeError: If called during production (use only in tests).
        """
        if target_class is not None:
            cls._instances.pop(target_class, None)
            cls._locks.pop(target_class, None)
        else:
            cls._instances.clear()
            cls._locks.clear()


class ConnectionPool(metaclass=SingletonMeta):
    """Thread-safe singleton connection pool using metaclass enforcement.

    Direct instantiation is blocked — always use the class name to get the instance.
    """

    def __init__(self) -> None:
        self._connections: list[object] = []
        self._max_size: int = 10
        self._closed: bool = False

    def acquire(self) -> object:
        """Acquire a connection from the pool.

        Returns:
            A database connection object.

        Raises:
            RuntimeError: If the pool is closed or no connections available.
        """
        if self._closed:
            raise RuntimeError("ConnectionPool is closed")
        if not self._connections:
            self._connections.append({"id": len(self._connections) + 1, "active": True})
        conn = self._connections[-1]
        return conn

    def release(self, connection: object) -> None:
        """Release a connection back to the pool."""
        if isinstance(connection, dict):
            connection["active"] = False

    def close(self) -> None:
        """Close all connections and release resources."""
        self._closed = True
        self._connections.clear()

    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (use only in tests)."""
        SingletonMeta.reset(cls)
```

### Pattern 3: Async-Safe Lazy Singleton with Context Manager

For async applications that need lazy initialization and deterministic cleanup, combine an `asyncio.Lock`-protected factory with context manager semantics.

```python
import asyncio
from contextlib import asynccontextmanager
from typing import Optional


class AsyncCache:
    """Async-safe singleton cache with lazy initialization and cleanup.

    Usage as context manager:
        async with get_async_cache() as cache:
            value = await cache.get(key)
    """

    _instance: Optional["AsyncCache"] = None
    _lock: Optional[asyncio.Lock] = None
    _initialized: bool = False

    def __init__(self) -> None:
        self._cache: dict[str, object] = {}
        self._ttl_seconds: float = 300.0
        self._access_times: dict[str, float] = {}

    async def get(self, key: str) -> Optional[object]:
        """Retrieve a value from the cache.

        Args:
            key: Cache key to look up.

        Returns:
            Cached value, or None if not found or expired.
        """
        if key in self._cache and self._is_valid(key):
            self._access_times[key] = asyncio.get_event_loop().time()
            return self._cache[key]
        return None

    async def set(self, key: str, value: object) -> None:
        """Store a value in the cache with TTL.

        Args:
            key: Cache key.
            value: Value to cache.
        """
        self._cache[key] = value
        self._access_times[key] = asyncio.get_event_loop().time()

    def _is_valid(self, key: str) -> bool:
        """Check if a cached entry has not expired."""
        import time
        return (time.monotonic() - self._access_times.get(key, 0)) < self._ttl_seconds

    async def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
        self._access_times.clear()

    async def shutdown(self) -> None:
        """Clean up resources. Safe to call multiple times."""
        await self.clear()
        AsyncCache._instance = None
        AsyncCache._initialized = False


@asynccontextmanager
async def get_async_cache() -> AsyncGenerator[AsyncCache, None]:
    """Context manager for getting the async cache singleton.

    Yields:
        The singleton AsyncCache instance, ensuring lazy initialization
        and clean shutdown via asyncio.Lock protection.
    """
    if not AsyncCache._initialized or AsyncCache._instance is None:
        if AsyncCache._lock is None:
            AsyncCache._lock = asyncio.Lock()
        async with AsyncCache._lock:
            # Double-checked lock for async safety
            if not AsyncCache._initialized or AsyncCache._instance is None:
                AsyncCache._instance = AsyncCache()
                AsyncCache._initialized = True

    cache = AsyncCache._instance
    assert cache is not None
    yield cache

    # Cleanup on context exit
    await cache.shutdown()


# Usage example (not executed — illustrative):
# async with get_async_cache() as cache:
#     await cache.set("user:123", {"name": "Alice"})
#     value = await cache.get("user:123")

from contextlib import asynccontextmanager
from typing import AsyncGenerator
