---
name: abstraction-design-patterns
description: Designs clean, maintainable abstractions using Protocols, ABCs, interfaces,
  and composition to reduce coupling while avoiding over-engineering and leaky abstractions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: abstraction design, interface design, Protocol pattern, over-abstraction,
    leaky abstraction, composition over inheritance, Rule of Three
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
  - do-dont
  - examples
  related-skills: dry-principles,dependency-inversion-principle,design-patterns-architecture,solid-principles
------
# Abstraction Design Patterns

Designs clean, maintainable abstractions using Python Protocols, ABCs, composition, and interface segregation to reduce coupling between modules while actively preventing over-engineering, leaky abstractions, and thin wrapper proliferation. Ensures every abstraction earns its existence by serving at least two real use cases or enabling verifiable test isolation.

## TL;DR Checklist

- [ ] Apply the Rule of Three: wait until a pattern repeats three times before abstracting
- [ ] Prefer structural typing (`typing.Protocol`) over nominal inheritance for new interfaces
- [ ] Name protocols from the consumer's perspective, not the provider's capability list
- [ ] Keep abstractions narrow — declare only the methods callers actually invoke
- [ ] Verify every abstraction has at least one test using a substitute implementation
- [ ] Audit existing abstractions quarterly: remove any with zero real usages
- [ ] Prefer composition over inheritance when combining behaviors (Strategy, Adapter, Decorator)
- [ ] Ask "what concrete details leak through this boundary?" before declaring an interface complete

---

## When to Use

Use this skill when:

- You have detected the same interface shape appearing in three or more unrelated modules and want a single named contract (`Protocol`/`ABC`) instead of scattered implicit agreements
- A class has five or more constructor dependencies that make unit testing painful — extract narrow Protocols so each dependency can be swapped independently
- Designing a new public API for a library module and you need to define a stable, versionable interface before writing implementations
- Refactoring a monolithic class into smaller pieces and need to determine which methods should become cross-cutting interfaces versus which should remain private
- A team member proposes creating an interface "just in case" we might need multiple implementations — evaluate whether the abstraction's cost (maintenance burden, indirection) exceeds its benefit
- Auditing an existing codebase for leaky abstractions where implementation details escape through public method signatures (e.g., exposing SQLAlchemy `Query` objects instead of plain dicts)

---

## When NOT to Use

Avoid creating new abstractions when:

- **Single use case, single implementation** — If only one class implements a concept and there is no testing or substitution need, a direct class is simpler than an interface plus wrapper
- **Prototyping or spike solutions** — Abstracting in a prototype that may be discarded wastes effort; concrete code evolves into abstractions organically through repeated use (Rule of Three)
- **Performance-critical inner loops** — Every level of indirection adds call overhead. Profile first; if protocol dispatch is the bottleneck, inline the specific implementation
- **When inheritance would solve it more directly** — If you have an "is-a" relationship with shared state and behavior across a hierarchy (e.g., `Dog`/`Cat` extending `Animal`), use ABCs or direct inheritance rather than extracting protocols for every method
- **To satisfy dogma** — Interfaces exist to reduce coupling, enable substitution, and clarify contracts. If none of those goals apply, the abstraction is dead weight

---

## Core Workflow

1. **Count real usage instances** — Before writing any interface, survey the codebase to determine how many distinct call sites consume this capability. Apply the Rule of Three: if fewer than three callers exist, keep the logic as direct methods or a simple function. If three or more callers share the same shape, proceed to step 2. **Checkpoint:** Document each caller with file path and method name. If you cannot find three genuine callers, do not create an abstraction yet — flag it for future review instead.

2. **Name from the consumer's perspective** — A Protocol's name should express what the consumer *needs*, not what the provider *does*. If `OrderProcessor` calls `save()`, `find_by_id()`, and `delete()` on data, name the protocol `DataRepository`, not `DatabaseAdapter`. **Checkpoint:** Read the Protocol docstring aloud from a caller's point of view — if it sounds like a capability list rather than a responsibility, rename it.

3. **Extract the minimal method set** — List every method and property a caller invokes on the concrete type. Remove anything the caller does *not* use in this context. A Protocol should be narrower than any implementation class. **Checkpoint:** Run structural subtyping verification (`isinstance(check, MyProtocol)` or `mypy --strict`) to confirm all implementations provide exactly the declared methods — no more, no fewer (though extra methods on implementations are harmless).

4. **Decide: Protocol vs ABC** — Use `typing.Protocol` when you need structural typing (duck typing with static type checking) and implementations may come from third-party code or unrelated hierarchies. Use `abc.ABC` when you need shared default method implementations, protected state, or nominal inheritance within a single package's class hierarchy. **Checkpoint:** If two or more implementations cannot share a base class (e.g., one is a dataclass from another module), Protocol is the only viable choice.

5. **Implement with composition** — Where multiple capabilities must be combined (e.g., a cache layer wrapping a database repository), use composition rather than deep inheritance chains. Each component implements a narrow Protocol and delegates to its dependency. **Checkpoint:** The resulting class hierarchy should not exceed two levels of nesting. If it does, replace inheritance with injected dependencies.

6. **Verify testability** — Write at least one test for each consumer that uses a minimal fake implementation of the Protocol (a dataclass with methods, or `unittest.mock.MagicMock(spec=MyProtocol)`). Verify the test runs without external side effects. **Checkpoint:** If writing a test requires configuring environment variables or network mocks to switch implementations, you have not fully separated concerns — move configuration to the composition root.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Rule of Three — When to Extract an Interface vs. Keep Direct Code

Creating abstractions too early introduces indirection without benefit. The Rule of Three states: wait until you see a pattern used three times in genuinely different contexts before extracting a named interface. Below is a real-world example showing the progression from direct code → premature abstraction → justified abstraction at the third usage.

```python
# ❌ BAD — Premature abstraction: two call sites do not justify an interface.
# Cost: extra module, naming overhead, indirection for minimal benefit.
from abc import ABC, abstractmethod


class UserRepository(ABC):
    """Abstract user repository — extracted before a third use case existed."""

    @abstractmethod
    def get_by_id(self, user_id: int) -> dict | None: ...

    @abstractmethod
    def get_by_email(self, email: str) -> dict | None: ...

    @abstractmethod
    def save(self, user: dict) -> None: ...


class SqlUserRepository(UserRepository):
    def __init__(self, db_url: str) -> None:
        self.db_url = db_url

    def get_by_id(self, user_id: int) -> dict | None:
        # SQL implementation
        return {}

    def get_by_email(self, email: str) -> dict | None:
        # SQL implementation
        return None

    def save(self, user: dict) -> None:
        # SQL implementation
        pass


class UserService:
    """Only two call sites — no need for the Repository abstraction yet."""

    def __init__(self) -> None:
        self.repo = SqlUserRepository("sqlite:///app.db")  # Direct coupling is fine at this scale

    def get_user(self, user_id: int) -> dict | None:
        return self.repo.get_by_id(user_id)


# ✅ GOOD — Third use case arrives (AdminDashboard), now the abstraction earns its keep.
# The third context reveals that UserService and AdminDashboard need testability separately.
from typing import Protocol


class UserRepository(Protocol):
    """Contract for user data access — named from consumer perspective."""

    def get_by_id(self, user_id: int) -> dict | None: ...
    def get_by_email(self, email: str) -> dict | None: ...
    def save(self, user: dict) -> None: ...
    def list_active(self, limit: int = 50) -> list[dict]: ...


class SqlUserRepository:
    """Concrete implementation — no longer an ABC subclass."""

    def __init__(self, db_url: str) -> None:
        self.db_url = db_url

    def get_by_id(self, user_id: int) -> dict | None:
        # SQL implementation
        return {"id": user_id, "email": f"user{user_id}@example.com"}

    def get_by_email(self, email: str) -> dict | None:
        return None

    def save(self, user: dict) -> None:
        pass

    def list_active(self, limit: int = 50) -> list[dict]:
        return [{"id": i, "email": f"active{i}@example.com"} for i in range(limit)]


class UserService:
    """Now depends on Protocol — testable with any implementation."""

    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    def get_user(self, user_id: int) -> dict | None:
        return self.repo.get_by_id(user_id)


class AdminDashboard:
    """Third consumer — the abstraction now reduces coupling for a second team."""

    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    def render_active_users(self) -> list[dict]:
        return self.repo.list_active(limit=100)


# Composition root wires everything at startup
def build_application(db_url: str) -> tuple[UserService, AdminDashboard]:
    repo = SqlUserRepository(db_url)
    return UserService(repo), AdminDashboard(repo)
```

---

### Pattern 2: Protocol-Based Design — Narrow Interfaces Named from the Consumer's View

Protocols express "what I need" rather than "what you provide." This pattern shows how to derive narrow protocols by examining actual caller behavior instead of guessing at future needs. The key insight: callers dictate interfaces, not implementers.

```python
# ❌ BAD — Fat interface designed around provider capabilities, not consumer needs.
# Every new caller inherits unused methods; testing requires stubbing everything.
from typing import Protocol


class DataProvider(Protocol):
    """Fat interface: includes every method the implementation happens to have."""

    def get_by_id(self, id: int) -> dict | None: ...
    def get_all(self) -> list[dict]: ...
    def filter(self, field: str, value: any) -> list[dict]: ...
    def count(self) -> int: ...
    def save(self, record: dict) -> None: ...
    def delete(self, id: int) -> bool: ...
    def export_csv(self, records: list[dict], path: str) -> None: ...
    def import_csv(self, path: str) -> list[dict]: ...
    def backup(self) -> str: ...
    def restore(self, backup_id: str) -> bool: ...


class ReportGenerator:
    """Only needs get_by_id and save — forced to carry the entire DataProvider interface."""

    def __init__(self, data_provider: DataProvider) -> None:
        self.provider = data_provider  # Overly broad dependency

    def generate_report_for_user(self, user_id: int) -> dict:
        # Only uses get_by_id — rest of DataProvider is dead weight here
        user = self.provider.get_by_id(user_id)
        return {"user": user, "report_data": []}


# ✅ GOOD — Narrow protocols extracted per consumer need.
# Each caller declares exactly what it requires; implementations provide all of them.


class UserRetriever(Protocol):
    """What ReportGenerator actually needs from the data layer."""

    def get_by_id(self, id: int) -> dict | None: ...


class RecordPersister(Protocol):
    """What another consumer might need — just persistence, no retrieval."""

    def save(self, record: dict) -> None: ...
    def delete(self, id: int) -> bool: ...


# Concrete class satisfies ALL narrow protocols simultaneously (structural subtyping)
class SqlDataStore:
    """One implementation, multiple protocol contracts."""

    def get_by_id(self, id: int) -> dict | None:
        return {"id": id, "name": "Sample"}

    def get_all(self) -> list[dict]:
        return []

    def save(self, record: dict) -> None:
        pass

    def delete(self, id: int) -> bool:
        return True


class ReportGeneratorV2:
    """Depends only on UserRetriever — zero coupling to persistence or export logic."""

    def __init__(self, retriever: UserRetriever) -> None:
        self.retriever = retriever

    def generate_report_for_user(self, user_id: int) -> dict:
        user = self.retriever.get_by_id(user_id)
        return {"user": user, "report_data": []}


class DataCleanupService:
    """Another consumer that needs only persistence — no retrieval."""

    def __init__(self, persister: RecordPersister) -> None:
        self.persister = persister

    def archive_old_records(self, ids_to_delete: list[int]) -> int:
        deleted = 0
        for record_id in ids_to_delete:
            if self.persister.delete(record_id):
                deleted += 1
        return deleted


# Composition root resolves the appropriate concrete store to each narrow contract
def build_application() -> tuple[ReportGeneratorV2, DataCleanupService]:
    store: UserRetriever & RecordPersister = SqlDataStore()
    return ReportGeneratorV2(store), DataCleanupService(store)
```

---

### Pattern 3: Avoiding Over-Abstraction — Thin Wrapper Anti-Pattern

The thin wrapper anti-pattern occurs when a method simply delegates to another method with no added logic. Each extra layer of indirection increases cognitive load without adding value. This pattern shows how to detect and eliminate wrappers that exist only for "future extensibility."

```python
# ❌ BAD — Chain of thin wrappers, each adding zero business value.
# A caller must navigate four method calls to reach actual logic.
class DatabaseAdapter:
    def execute_query(self, sql: str, params: tuple = ()) -> list[dict]:
        """Actual database execution."""
        print(f"Executing: {sql}")  # Simulated DB call
        return []

    def get_user_records(self) -> list[dict]:
        """Thin wrapper — just passes through to execute_query with no added logic."""
        return self.execute_query("SELECT * FROM users")

    def fetch_all_users(self) -> list[dict]:
        """Another thin wrapper — delegates to the previous wrapper."""
        return self.get_user_records()

    def retrieve_every_user(self) -> list[dict]:
        """Yet another thin wrapper — no transformation, just another name."""
        return self.fetch_all_users()


class UserService:
    """Thin wrapper on top of thin wrappers — four levels deep for one SQL query."""

    def __init__(self, adapter: DatabaseAdapter) -> None:
        self.adapter = adapter

    def get_all_users(self) -> list[dict]:
        return self.adapter.retrieve_every_user()  # Adds nothing


# ✅ GOOD — Single layer of indirection with clear purpose.
# Direct method access where no transformation or policy is added.


class UserDatabase:
    """Concrete database operations — named by responsibility, not as a generic adapter."""

    def fetch_all_users(self) -> list[dict]:
        """Execute user retrieval query directly — one step from intent to execution."""
        print("Executing: SELECT * FROM users")  # Simulated DB call
        return []


class UserServiceV2:
    """Direct dependency on the operation we need — no wrapper chain."""

    def __init__(self, db: UserDatabase) -> None:
        self.db = db

    def get_all_users(self) -> list[dict]:
        return self.db.fetch_all_users()  # One hop: intent → execution


# When a thin wrapper IS justified — when it adds semantic clarity or future extension point.
class CachingUserDatabase:
    """Thin wrapper that ADDS value through caching — justified indirection."""

    def __init__(self, backend: UserDatabase) -> None:
        self.backend = backend
        self._cache: dict[int, dict] = {}

    def fetch_all_users(self) -> list[dict]:
        """Adds caching logic on top of the base operation — not a pure passthrough."""
        if not self._cache:
            self._cache = {u["id"]: u for u in self.backend.fetch_all_users()}
        return list(self._cache.values())
```

---

### Pattern 4: Leaky Abstractions — Identifying and Fixing Detail Escape

A leaky abstraction occurs when implementation details escape through an interface boundary, forcing callers to know about internal structures. Common symptoms: public methods returning framework objects (`Query`, `Response`), signatures exposing storage formats (JSON strings, byte arrays), or error types specific to one implementation. This pattern shows how to audit and seal leaks.

```python
# ❌ BAD — Abstraction leaks SQLAlchemy Query objects into the service layer.
# Callers must know about SQLAlchemy's lazy evaluation, join semantics, and eager loading.
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, Session, query


Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    email = Column(String(200))


class UserRepository:
    """Supposed to be a clean data access boundary — but leaks ORM internals."""

    def __init__(self, engine) -> None:
        self.engine = engine

    def find_active_users(self, limit: int = 10) -> query.Query:
        """LEAK: Returns raw SQLAlchemy Query object.
        Caller must know about .limit(), .filter(), .options(eagerload())."""
        session = Session(self.engine)
        return session.query(User).filter(User.active == True).limit(limit)

    def save_user(self, user_dict: dict) -> Base:
        """LEAK: Returns the SQLAlchemy model instance.
        Caller now depends on ORM internals (user.id, user.__dict__)."""
        session = Session(self.engine)
        user = User(**user_dict)
        session.add(user)
        session.commit()
        return user  # Exposes internal ORM object


# Usage — caller is now coupled to SQLAlchemy:
# repo = UserRepository(engine)
# users = repo.find_active_users(10)
# for u in users:  # Must understand this is a lazy Query, not a list
#     print(u.name)  # May trigger unexpected database round-trip (N+1)


# ✅ GOOD — Abstraction boundary sealed: only plain data crosses the perimeter.
class UserRepositoryV2:
    """Clean data access — callers receive plain dicts, never ORM internals."""

    def __init__(self, engine) -> None:
        self.engine = engine

    def find_active_users(self, limit: int = 10) -> list[dict]:
        """Returns a plain list of dictionaries — no framework objects escape."""
        from sqlalchemy import select

        with Session(self.engine) as session:
            stmt = select(User).filter(User.active == True).limit(limit)
            results = session.execute(stmt).scalars().all()
            return [
                {"id": u.id, "name": u.name, "email": u.email}
                for u in results
            ]

    def save_user(self, name: str, email: str) -> int:
        """Returns a plain integer (the new user's ID) — no ORM object exposure."""
        with Session(self.engine) as session:
            user = User(name=name, email=email)
            session.add(user)
            session.commit()
            session.refresh(user)
            return user.id  # Return only the scalar identifier


# Usage — caller has zero knowledge of SQLAlchemy:
# repo = UserRepositoryV2(engine)
# users = repo.find_active_users(10)  # Already a list, no lazy evaluation surprises
# for u in users:
#     print(u["name"])  # Standard dict access
# new_id = repo.save_user("Alice", "alice@example.com")  # Plain int return


# --- Additional leak types and their fixes ---

# LEAK TYPE 2: Error types specific to one implementation escape
class BadErrorLeak:
    def fetch_data(self, url: str) -> dict:
        """LEAK: Raises httpx.HTTPStatusError — callers must import httpx."""
        import httpx
        response = httpx.get(url)
        response.raise_for_status()  # Exposes httpx exceptions to caller
        return response.json()


class GoodErrorSealed:
    """Fixes error leak by translating framework exceptions to domain errors."""

    def fetch_data(self, url: str) -> dict:
        import httpx

        try:
            response = httpx.get(url, timeout=5.0)
            response.raise_for_status()
        except httpx.TimeoutException:
            raise ConnectionError(f"Request to {url} timed out after 5 seconds")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise LookupError(f"Resource not found at {url}")
            elif exc.response.status_code >= 500:
                raise RuntimeError(f"Server error from {url}: {exc.response.status_code}")
            else:
                raise ValueError(f"Bad response from {url}: {exc.response.status_code}")

        return response.json()


# LEAK TYPE 3: Signature exposes serialization format
class BadFormatLeak:
    def load_config(self, path: str) -> str:
        """LEAK: Returns JSON string — caller must know to json.loads() it."""
        with open(path) as f:
            return f.read()  # String type tells nothing about content structure


class GoodFormatSealed:
    """Fixes format leak by returning typed data, not raw text."""

    def load_config(self, path: str) -> dict:
        import json

        with open(path, encoding="utf-8") as f:
            return json.load(f)  # Return parsed structure — caller trusts the contract
```

---

### Pattern 5: Composition Over Inheritance — Combining Behaviors Without Deep Hierarchies

When you need multiple capabilities (e.g., logging + caching + persistence), inheritance chains become brittle. The deeper the hierarchy, the harder it is to reason about method resolution order and override behavior. Composition delegates to injected components, each implementing a narrow Protocol.

```python
# ❌ BAD — Deep inheritance chain with fragile MRO and hidden dependencies.
# Adding logging requires creating another subclass in the middle of the hierarchy.
class BaseRepository:
    def __init__(self, db_url: str) -> None:
        self.db_url = db_url

    def get_by_id(self, id: int) -> dict | None:
        return {"id": id}


class CachedRepository(BaseRepository):
    """Adds caching — but is now a subclass that must call super() correctly."""

    def __init__(self, db_url: str, cache_ttl: int = 300) -> None:
        super().__init__(db_url)
        self._cache: dict[int, dict] = {}
        self.cache_ttl = cache_ttl

    def get_by_id(self, id: int) -> dict | None:
        if id in self._cache:
            return self._cache[id]
        result = super().get_by_id(id)  # Fragile super() call
        if result:
            self._cache[id] = result
        return result


class LoggedCachedRepository(CachedRepository):
    """Adds logging — yet another layer of indirection in the chain."""

    def __init__(self, db_url: str, cache_ttl: int = 300) -> None:
        super().__init__(db_url, cache_ttl)

    def get_by_id(self, id: int) -> dict | None:
        print(f"Fetching user {id}")  # Invasive side effect inside the method
        return super().get_by_id(id)


class TracedLoggedCachedRepository(LoggedCachedRepository):
    """Another layer — now we have four levels of get_by_id, each adding indirection."""

    def __init__(self, db_url: str, cache_ttl: int = 300) -> None:
        super().__init__(db_url, cache_ttl)

    def get_by_id(self, id: int) -> dict | None:
        print(f"[TRACE] LoggedCachedRepository.get_by_id({id})")
        return super().get_by_id(id)


# To add caching to a different base (e.g., APIRepository), you must duplicate the entire chain.
# To test CachedRepository in isolation, you must mock LoggedCachedRepository's super() chain.


# ✅ GOOD — Composition with narrow Protocols: each capability is a standalone component.
from dataclasses import dataclass, field
from typing import Protocol


class DataStore(Protocol):
    """The base capability everyone composes around."""

    def get_by_id(self, id: int) -> dict | None: ...


class CacheBackend(Protocol):
    """Optional caching capability — any component that provides get/set works."""

    def get(self, key: str) -> object | None: ...
    def set(self, key: str, value: object, ttl: int = 300) -> None: ...


class Logger(Protocol):
    """Optional logging capability — just needs an info() method with string args."""

    def info(self, message: str) -> None: ...


# Concrete base implementation (no inheritance needed for its own protocol conformance)
class SqlDataStore:
    """Simple data store — implements DataStore protocol by structural subtyping."""

    def __init__(self, db_url: str) -> None:
        self.db_url = db_url

    def get_by_id(self, id: int) -> dict | None:
        return {"id": id, "name": f"User {id}"}


class InMemoryCache:
    """Concrete cache — implements CacheBackend protocol."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[object, float]] = {}

    def get(self, key: str) -> object | None:
        if key in self._store:
            value, expires_at = self._store[key]
            import time
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: object, ttl: int = 300) -> None:
        import time
        self._store[key] = (value, time.time() + ttl)


# Composed layer — caching decorator on any DataStore
class CachingDataStore:
    """Wraps any DataStore with caching — uses composition, not inheritance."""

    def __init__(self, store: DataStore, cache: CacheBackend | None = None) -> None:
        self.store = store
        self.cache = cache or InMemoryCache()

    def get_by_id(self, id: int) -> dict | None:
        cache_key = f"entity:{id}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached  # type: ignore[return-value]

        result = self.store.get_by_id(id)
        if result is not None:
            self.cache.set(cache_key, result)
        return result


# Composed layer — logging decorator on any DataStore
class LoggingDataStore:
    """Wraps any DataStore with logging — zero coupling to specific implementations."""

    def __init__(self, store: DataStore, logger: Logger | None = None) -> None:
        self.store = store
        self.logger = logger or ConsoleLogger()

    def get_by_id(self, id: int) -> dict | None:
        self.logger.info(f"Fetching entity {id}")
        return self.store.get_by_id(id)


class ConsoleLogger:
    """Minimal logger — just needs info(), error() for the LoggingDataStore protocol."""

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def error(self, message: str) -> None:
        print(f"[ERROR] {message}", flush=True)


# Full composition — stack decorators in any order at the composition root.
def build_application(db_url: str) -> LoggingDataStore:
    """Stack capabilities through composition, not inheritance."""
    base: DataStore = SqlDataStore(db_url)
    cached: DataStore = CachingDataStore(base)       # Add caching layer
    logged: DataStore = LoggingDataStore(cached)      # Add logging on top
    return logged                                     # Caller sees one clean interface
```

---

### Pattern 6: ABCs for Invariant Enforcement — When Shared State Requires Nominal Inheritance

Protocols are ideal for structural typing, but sometimes you need shared default implementations, protected state, or behavioral contracts that enforce a class invariant (e.g., "every subclass must call `super().__init__()` to initialize the connection pool"). ABCs handle these cases where Protocol falls short.

```python
# Scenario: All database backends MUST initialize a connection pool and MUST close it.
# A Protocol cannot enforce that subclasses follow this lifecycle — only an ABC can.
from abc import ABC, abstractmethod
import threading


class DatabaseConnection(ABC):
    """Abstract base for database connections with enforced lifecycle."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._pool_size: int = 0
        self._is_open: bool = False
        self._lock = threading.Lock()
        self._open_pool()

    def _open_pool(self) -> None:
        """Shared setup — all subclasses get a properly initialized pool."""
        with self._lock:
            self._pool_size = 10
            self._is_open = True

    @abstractmethod
    def execute_query(self, sql: str, params: tuple = ()) -> list[dict]:
        """Every subclass MUST implement query execution."""

    @abstractmethod
    def begin_transaction(self) -> "Transaction":
        """Every subclass MUST support transaction management."""

    def close(self) -> None:
        """Shared teardown — callers can rely on this method existing."""
        with self._lock:
            self._is_open = False
            self._pool_size = 0
            print(f"Closed connection to {self._dsn}")

    @property
    def is_open(self) -> bool:
        """Shared state — all subclasses inherit consistent pool status tracking."""
        return self._is_open


# Concrete implementations focus solely on the abstract methods.
# Lifecycle management (pool creation, closing) comes for free.
class PostgresConnection(DatabaseConnection):
    """PostgreSQL implementation — only implements what's unique to PostgreSQL."""

    def execute_query(self, sql: str, params: tuple = ()) -> list[dict]:
        print(f"[Postgres] Executing: {sql}")
        return []

    def begin_transaction(self) -> "Transaction":
        return Transaction(self)


class SQLiteConnection(DatabaseConnection):
    """SQLite implementation — shares the same lifecycle, different query syntax."""

    def execute_query(self, sql: str, params: tuple = ()) -> list[dict]:
        print(f"[SQLite] Executing: {sql}")
        return []

    def begin_transaction(self) -> "Transaction":
        return Transaction(self)


class Transaction:
    """Shared transaction wrapper — created by any DatabaseConnection subclass."""

    def __init__(self, connection: DatabaseConnection) -> None:
        self.connection = connection
        print(f"Transaction started on {connection._dsn}")

    def commit(self) -> None:
        print(f"Transaction committed on {self.connection._dsn}")

    def rollback(self) -> None:
        print(f"Transaction rolled back on {self.connection._dsn}")


# ✅ Verification: mypy + runtime enforcement prevent incomplete implementations.
class BrokenConnection(DatabaseConnection):
    """This will fail at instantiation — missing required abstract methods."""
    pass  # TypeError: Can't instantiate abstract class BrokenConnection with abstract method execute_query
```

---

## Constraints

### MUST DO

- **Apply the Rule of Three**: Do not create a named interface (`Protocol` or `ABC`) until you have observed three genuine, distinct call sites that share the same capability shape. Before that, direct methods and functions are simpler and cheaper.

- **Name protocols from the consumer's perspective**: The name should describe what the consumer *achieves* through the interface (`UserRepository`, `DataRetriever`), not what the provider *implements internally* (`DatabaseAdapter`, `SqlConnectionWrapper`).

- **Extract narrow interfaces**: A protocol should declare only the methods that callers actually invoke. If a concrete class has twenty methods but a consumer uses three, the protocol declares exactly those three — no more.

- **Prefer `typing.Protocol` for structural typing**: When implementations come from different modules, third-party code, or need duck-typing behavior, use Protocol. Reserve ABCs for cases requiring shared default implementations, protected state, or lifecycle enforcement.

- **Seal abstraction boundaries**: No framework objects (`Query`, `Response`, `Cursor`), no raw serialization formats (`str` containing JSON), and no implementation-specific exceptions should escape public method signatures. Return plain dicts, lists, scalars, or domain types.

- **Design for testability**: Every Protocol must have at least one consumer test that uses a minimal fake implementation (a dataclass with methods or `MagicMock(spec=Protocol)`). If you cannot write a test without configuring infrastructure, the abstraction is incomplete.

- **Prefer composition over inheritance chains**: Stack capabilities through injected components and decorator-like wrappers rather than deep class hierarchies. A three-level inheritance chain should trigger an automatic review for extraction into separate Protocols.

- **Audit abstractions quarterly**: Identify any Protocol, ABC, or interface with fewer than two real implementations — if no second implementation is plausible and no test substitutes it, remove the abstraction and restore direct code.

### MUST NOT DO

- **Create interfaces "just in case"**: An interface that has zero concrete implementations beyond one serves no purpose other than adding indirection cost. Defer until a genuine substitution need exists.

- **Let implementation details leak through signatures**: Do not return `sqlalchemy.orm.Query` objects, HTTP `Response` instances, byte arrays, or raw file handles from public API methods. Translate to plain data structures at the boundary.

- **Name methods after internal operations**: A method called `execute_raw_sql()` leaks implementation choice; `find_active_users()` expresses intent. Public interfaces should never mention SQL, JSON, caching, network calls, or storage formats.

- **Build fat interfaces to be "flexible"**: Including every conceivable method on a Protocol to avoid future refactoring creates the Interface Segregation violation — each consumer pays the cost of stubbing unused methods during testing.

- **Replace inheritance with abstraction when inheritance is simpler**: If you have `Dog` and `Cat` sharing state and behavior in an `Animal` hierarchy, use direct class inheritance with ABCs. Do not extract a `LivingThing` Protocol with ten methods just to be "flexible."

- **Use wrapper chains without added logic**: A method that calls `super().method()` or `self.delegator.method()` without transformation, caching, logging, or policy decision is a thin wrapper anti-pattern — remove it.

---

## Output Template

When applying this skill, structure your analysis and recommendations as follows:

1. **Abstraction Audit** — List every existing interface (`Protocol`, `ABC`, abstract class) with its implementation count, call site locations, and whether it meets the Rule of Three threshold. Flag any with zero or one implementation.

2. **Leak Detection Report** — For each public method in identified abstractions, document whether framework objects, raw formats, or implementation-specific types escape through the signature. Include the specific leak type (framework object, serialization format, error type).

3. **Refactoring Recommendation** — For each abstraction that fails the audit:
   - If over-abstracted: propose removing the interface and restoring direct code with file references
   - If leaky: show the sealed version with translated return types and wrapped exceptions
   - If thin-wrapper chain: propose collapsing into a single meaningful method or adding substantive logic

4. **New Abstraction Design** — When creating new interfaces:
   - State which caller(s) triggered the Rule of Three threshold
   - Show the narrow Protocol with only declared methods
   - Provide at least one concrete implementation and one test fake
   - Document the composition root wiring

5. **Risk Assessment** — Identify any refactoring that may break existing callers due to changed return types, and provide migration steps (adapter pattern, deprecation cycle).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `dry-principles` | DRY finds duplication; abstraction-design-patterns creates the abstractions that eliminate it. Together they form the complete deduplication workflow: detect → abstract → verify. |
| `dependency-inversion-principle` | DIP provides the architectural reason to create interfaces (separating high-level policy from low-level detail); this skill provides the mechanical patterns for creating clean, narrow interfaces using Protocols and ABCs. |
| `design-patterns-architecture` | Broader catalog of design patterns including Strategy, Adapter, Decorator, and Facade — many of which are composition-based alternatives to over-engineered abstractions described in this skill. |
| `solid-principles` | SRP, ISP, and OCP provide the theoretical foundation for why abstractions exist and how they should be bounded; this skill translates those principles into concrete Python Protocols, ABCs, and compositional patterns. |
