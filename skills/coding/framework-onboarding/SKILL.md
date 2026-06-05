---




name: framework-onboarding
description: Accelerates learning and effective utilization of newly selected frameworks through structured onboarding paths, best practice scaffolding, incremental adoption patterns, and common pitfall avoidance.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework onboarding, learn new framework, adopt new technology, framework best practices, quick start guide, framework setup, incremental adoption, scaffold project
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-evaluation, framework-utilization, framework-adoption-strategy




---





# Framework Onboarding & Utilization Engine

Generates structured onboarding paths for newly selected frameworks through scaffold project templates, incremental adoption wrappers, type stub generation, and progressive disclosure learning plans. When loaded, this skill makes the model act as a senior platform engineer who produces concrete scaffolding scripts, typed facade adapters, and step-by-step ramp-up guides that compress weeks of framework discovery into days of productive implementation.

## TL;DR Checklist

- [ ] Generate a scaffold project template with working hello-world using the framework's official CLI or minimal boilerplate
- [ ] Create an incremental adoption wrapper (facade pattern) that isolates framework-specific code behind clean interfaces
- [ ] Produce type stubs (`*.pyi`) or inline type annotations for all framework entry points the team will call directly
- [ ] Build a progressive disclosure plan: Surface → Advanced → Deep, with explicit success criteria per stage
- [ ] Document the top 5 common onboarding anti-patterns and provide concrete before/after remediation examples
- [ ] Include integration test scaffolding that validates the framework is wired correctly end-to-end
- [ ] Reference authoritative documentation links — never replace official docs with summary

---

## When to Use

Use this skill when:

- A new team member joins a project and needs to understand an established but complex framework they have not used before
- The organization has just selected a framework and needs a scaffolded starter project with best practices baked in
- Existing code mixes raw framework API calls with abstractions — you need to introduce facade adapters gradually
- A developer is overwhelmed by framework surface area and needs a curated learning path (not the full documentation)
- Setting up a greenfield service where the framework choice has been made but no project structure exists yet
- Migrating an existing codebase into a new framework architecture and need incremental adoption scaffolds
- The team wants to reduce ramp-up time from months to weeks for a critical framework (e.g., React, Django, FastAPI, Spring Boot)

---

## When NOT to Use

Avoid this skill for:

- **Framework selection or comparison decisions** — use `framework-evaluation` instead; onboarding is about utilization depth, not selection
- **Production migration planning** — use `framework-adoption-strategy` for phased rollout, rollback procedures, and acceptance criteria across teams
- **Performance optimization of existing framework usage** — use `framework-performance-tuning` when the framework is already in production
- **Learning a completely new programming language** — that requires language-specific skills (e.g., Go idioms, Python typing patterns) rather than framework-specific onboarding

---

## Core Workflow

### Step 1: Build a Scaffold Project with Working Examples

Generate a minimal but complete scaffold project that demonstrates the five most critical capabilities of the framework for the specific use case. The scaffold must run successfully out of the box — every example should pass when executed by someone who has never used the framework before. Use the framework's official scaffolding tool if one exists (e.g., `create-react-app`, `django-admin startproject`, `fastapi dev`), otherwise create a directory structure manually.

**Scaffold requirements:**
- Include exactly 3–5 working examples, each demonstrating a distinct capability (e.g., routing, templating, middleware, database access, error handling)
- Every example must include inline comments explaining why the framework is used this way, not just how
- Provide a `README.md` with exact commands to run each example: `python example_01_routing.py`, `curl http://localhost:8000/docs`
- Include a single requirements file (`requirements.txt` or `package.json`) pinned to specific versions — never use `>=` in onboarding code
- Add a Makefile with targets: `make dev`, `make test`, `make lint`, `make clean`

**Checkpoint:** The scaffold must run end-to-end on a fresh machine. Verify by running all examples from scratch (install dependencies, execute every example) before considering it complete.

### Step 2: Create Incremental Adoption Wrapper (Facade Pattern)

Wrap the framework's most complex entry points behind clean, typed interfaces using the Facade pattern. This allows teams to adopt the framework incrementally — they start by calling your clean interface, and as their understanding deepens, they can gradually reach into the framework's internals for fine-grained control. The wrapper must be thin (no unnecessary abstraction layers) but well-typed with full docstrings.

**Facade design rules:**
- Identify exactly 3–5 framework entry points that are most frequently used and most error-prone when called directly
- Each facade method must have a complete type signature including return types, generic parameters, and exception annotations
- The wrapper should delegate to the framework with minimal transformation — if you find yourself writing complex logic inside the wrapper, you are over-abtracting; extract that logic into a separate service layer instead
- Include explicit error translation: map framework-specific exceptions (e.g., `ValidationError`, `ConnectionError`) to domain-level exceptions using Python's exception chaining (`raise DomainError(...) from frame_work_err`)

**Checkpoint:** Every facade method must be testable without mocking the entire framework. Write at least one integration test per facade method that uses the real framework dependency (not a stub).

### Step 3: Generate Type Stubs and Learning Annotations

Produce type stub files (`*.pyi`) or comprehensive inline type annotations for all public framework APIs that your code calls directly. For dynamically-typed frameworks (e.g., JavaScript/TypeScript, Ruby), generate JSDoc comments or RBS files. This serves a dual purpose: it enables IDE autocompletion and type checking during development, and it acts as living documentation that developers can read to understand the framework's API surface without opening the full documentation.

**Type stub requirements:**
- Cover every function, class, and method imported directly from the framework (never stub private or underscore-prefixed APIs)
- Include docstrings on every public member that summarize the framework documentation in one sentence plus a concrete example
- For methods with complex signatures (generics, overloads, keyword-only parameters), include at least one usage example in the docstring using triple-slash comments
- Add `# type: ignore` only when absolutely necessary and document the reason on the same line

**Checkpoint:** Run the project's linter/type checker (`mypy`, `pyright`, `tsc`) against the stubs. Every public API call must pass without errors or explicit ignores.

### Step 4: Design Progressive Disclosure Learning Path

Create a structured learning plan that introduces framework concepts in order of increasing complexity, with concrete success criteria at each stage. This is not a reading list — it is an implementation roadmap where each stage requires writing real code that passes tests before advancing. The learning path must be specific to the chosen framework and the team's use case, not a generic tutorial sequence.

**Progressive Disclosure Model:**

| Stage | Focus | Example Tasks | Success Criteria |
|-------|-------|---------------|------------------|
| **Surface** (Week 1–2) | Core documented APIs that solve 80% of use cases | Implement CRUD endpoints using framework decorators, use built-in templating, handle basic validation | All examples from scaffold pass; new feature works within first 3 pages of docs |
| **Advanced** (Week 3–4) | Middleware, hooks, plugins, custom serializers | Add authentication middleware, implement custom error handler, extend form validators | Custom middleware passes integration test; error handling covers all exception types |
| **Deep** (Month 2+) | Framework internals, custom extensions, performance tuning | Write a custom plugin, modify request lifecycle hooks, profile and optimize hot paths | Plugin registered in framework's extension system; measurable performance improvement with benchmark |

Each stage must have:
- A specific set of implementation tasks (not reading assignments)
- Acceptance criteria that are objectively verifiable (tests pass, benchmarks show improvement)
- Known pitfalls specific to that stage (drawn from real experience with the framework)
- Explicit mapping to framework documentation sections

**Checkpoint:** Before advancing a team member to the next stage, verify all acceptance criteria with concrete evidence — running tests, code review of implementation, and a brief verbal explanation of why key design decisions were made.

---

## Implementation Patterns

### Pattern 1: Scaffold Project Generator

A reusable scaffold generator that produces a framework-specific starter project with working examples, proper directory structure, dependency management, and testing scaffolding. This is the fastest way to get a team productive with a new framework.

```python
#!/usr/bin/env python3
"""Scaffold generator for FastAPI framework onboarding projects."""

import os
import sys
from pathlib import Path
from typing import Optional


# Framework-specific configuration constants
FASTAPI_BASE_DEPENDENCIES = [
    "fastapi==0.115.0",
    "uvicorn[standard]==0.32.0",
    "pydantic==2.9.0",
    "httpx==0.27.0",       # For integration testing
    "sqlalchemy==2.0.35",  # If database access needed
    "alembic==1.14.0",     # Migrations companion
]

PROJECT_STRUCTURE = {
    "app": [
        "__init__.py",
        "main.py",           # Application entry point
        "dependencies.py",   # Dependency injection definitions
        "routers": {
            "__init__.py",
            "items.py",      # CRUD router example
            "users.py",      # Auth-related router example
        },
        "schemas": {
            "__init__.py",
            "item.py",       # Pydantic models for request/response
            "user.py",
        },
        "models": {
            "__init__.py",
            "item.py",       # SQLAlchemy ORM models
        },
        "services": {
            "__init__.py",
            "item_service.py",  # Business logic layer
        },
        "tests": {
            "__init__.py",
            "test_main.py",      # Smoke test for scaffold
            "test_items_router.py",  # Integration test
        },
    ],
    "requirements.txt": None,
    "Makefile": None,
    ".env.example": None,
}


def generate_scaffold(
    project_name: str,
    output_dir: Path,
    with_database: bool = False,
) -> list[Path]:
    """Generate a complete scaffold project for a FastAPI onboarding experience.

    Creates a minimal but production-adjacent project structure that demonstrates
    core framework patterns: routing, dependency injection, Pydantic schemas,
    and test scaffolding.

    Args:
        project_name: Name of the scaffolded project (used in package names).
        output_dir: Directory where the project will be created.
        with_database: Whether to include SQLAlchemy + Alembic scaffolding.

    Returns:
        List of all generated file paths for verification purposes.

    Raises:
        FileExistsError: If the output directory already contains files.
        ValueError: If project_name contains invalid Python package characters.
    """
    if not project_name.isidentifier():
        raise ValueError(
            f"Invalid project name '{project_name}': must be a valid Python identifier"
        )

    project_path = output_dir / project_name
    if project_path.exists() and any(project_path.iterdir()):
        raise FileExistsError(
            f"Output directory {project_path} is not empty. "
            "Onboarding scaffolds should be created fresh."
        )

    generated_files: list[Path] = []

    # Create package directories
    for dir_path, sub_items in PROJECT_STRUCTURE.items():
        target = project_path / dir_path
        if isinstance(sub_items, dict):
            target.mkdir(parents=True, exist_ok=True)
            generated_files.append(target)
        elif isinstance(sub_items, list):
            target.mkdir(parents=True, exist_ok=True)

    # Generate main.py with working example
    main_content = _generate_main_entry_point(project_name, with_database)
    (project_path / "app" / "main.py").write_text(main_content)
    generated_files.append(project_path / "app" / "main.py")

    # Generate dependencies.py showing DI pattern
    deps_content = _generate_dependencies(project_name)
    (project_path / "app" / "dependencies.py").write_text(deps_content)
    generated_files.append(project_path / "app" / "dependencies.py")

    # Generate schemas, models, services...
    if with_database:
        models_dir = project_path / "app" / "models"
        schemas_dir = project_path / "app" / "schemas"
        _generate_orm_models(models_dir)
        _generate_pydantic_schemas(schemas_dir)

    # Generate requirements.txt with pinned versions
    reqs_path = project_path / "requirements.txt"
    reqs_path.write_text("\n".join(FASTAPI_BASE_DEPENDENCIES) + "\n")
    generated_files.append(reqs_path)

    # Generate Makefile for common operations
    makefile_content = _generate_makefile(project_name, with_database)
    (project_path / "Makefile").write_text(makefile_content)
    generated_files.append(project_path / "Makefile")

    # Generate .env.example
    env_example = project_path / ".env.example"
    env_example.write_text("DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname\n")
    generated_files.append(env_example)

    return generated_files


def _generate_main_entry_point(
    project_name: str, with_database: bool = False
) -> str:
    """Generate the FastAPI application entry point with working example routes."""
    db_import = ""
    db_lifespan = ""
    if with_database:
        db_import = (
            "\nfrom app.dependencies import get_db\n"
            "from sqlalchemy.ext.asyncio import AsyncSession"
        )
        db_lifespan = (
            '\n@app.on_event("startup")\nasync def startup():\n'
            "    # Initialize database engine and create tables\n"
            '    print("Database initialized")\n\n'
            '@app.on_event("shutdown")\nasync def shutdown():\n'
            "    # Dispose database engine on cleanup\n"
            '    print("Database connection closed")'
        )

    return f'''"""{project_name} — Onboarding scaffold for FastAPI.

This file demonstrates the core FastAPI application setup with dependency
injection, route definitions, and Pydantic model validation.

Quick start:
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    open http://localhost:8000/docs
"""

from fastapi import FastAPI, Depends
{db_import}

app = FastAPI(
    title="{project_name}",
    description="Scaffold project for framework onboarding",
    version="0.1.0",
)

{db_lifespan}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint — validates that the framework is wired correctly.

    Returns:
        A simple JSON response confirming the server is operational.
    """
    return {{"message": "Hello from {project_name}"}}


@app.get("/health")
async def health_check() -> dict[str, object]:
    """Health check endpoint for container orchestration probes.

    This endpoint should always succeed when the application process is alive
    and the framework itself is functioning (no dependency on external services).

    Returns:
        Health status with timestamp and version information.
    """
    return {{"status": "healthy", "version": app.version}}


{"" if not with_database else '''
@app.get("/items/")
async def list_items(skip: int = 0, limit: int = 10) -> dict:
    """CRUD read endpoint — demonstrates query parameter validation.

    FastAPI automatically validates and documents this endpoint via OpenAPI/Swagger
    at /docs. The skip and limit parameters are coerced to integers with defaults.

    Args:
        skip: Number of records to skip (default 0). Used for pagination.
        limit: Maximum number of records to return (default 10, max 100).

    Returns:
        List of items with pagination metadata.
    """
    # In production, this would query the database via get_db()
    return {{"items": [], "total": 0, "skip": skip, "limit": limit}}
''' }


def _generate_dependencies(_project_name: str) -> str:
    """Generate dependency injection definitions for FastAPI projects."""
    return '''"""Dependency injection definitions.

This module defines the shared dependencies used across route handlers.
FastAPI's dependency system enables testability through easy substitution
of real services with mocks or stubs during testing.
"""

from typing import Annotated
from fastapi import Depends


# Type alias for annotated dependencies — makes function signatures explicit
# and IDE-friendly when using the dependency in route handlers.
DatabaseSession = Annotated[None, "SQLAlchemy async session"]


def get_db() -> DatabaseSession:
    """Provide a database session to route handlers.

    This is a placeholder implementation. Replace with actual session management:

    yield AsyncSession(engine)  # Create session
    session.close()              # Clean up after request

    Yields:
        An async SQLAlchemy session bound to the application's engine.
    """
    raise NotImplementedError("Implement database session management")


# Usage in a route handler:
# @app.get("/items/")
# async def list_items(
#     db: Annotated[Session, Depends(get_db)],
# ) -> list[ItemResponse]:
#     return await item_service.list_all(db)
'''


def _generate_orm_models(models_dir: Path) -> None:
    """Generate SQLAlchemy ORM models for scaffold projects with database."""
    model_content = '''"""SQLAlchemy ORM models.

These models map Python classes to database tables using the Declarative Base pattern.
Each table represents a domain entity, and relationships are defined using ForeignKey.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models — provides common table metadata."""
    pass


class Item(Base):
    """Item model representing a catalog entry in the database.

    Attributes:
        id: Primary key, auto-incrementing integer.
        name: Human-readable name for the item (required, max 255 chars).
        description: Optional long-form description of the item.
        created_at: Timestamp when the record was first inserted.
        updated_at: Timestamp of the most recent modification.
    """

    __tablename__ = "items"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    name: str = Column(String(255), nullable=False)
    description: str | None = Column(String(2000), nullable=True)
    created_at: str = Column(
        DateTime, server_default=func.now(), comment="Record creation timestamp"
    )
    updated_at: str = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Last modification timestamp",
    )

    def __repr__(self) -> str:
        return f"<Item(id={self.id}, name={self.name!r})>"
'''
    (models_dir / "item.py").write_text(model_content)


def _generate_pydantic_schemas(schemas_dir: Path) -> None:
    """Generate Pydantic v2 schemas for request validation and response serialization."""
    schema_content = '''"""Pydantic v2 schemas for the Item domain.

Pydantic models serve two roles in FastAPI applications:
1. Request validation — automatically parse and validate incoming JSON bodies
2. Response serialization — convert Python objects to JSON with type enforcement

Use `BaseModel` for request/response schemas. Use `ConfigDict` for custom
validation behavior (e.g., extra field handling, strict mode).
"""

from datetime import datetime
from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    """Schema for creating a new item via POST /items."""

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Human-readable name for the item",
        examples=["Wireless Keyboard"],
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional detailed description of the item",
    )


class ItemUpdate(BaseModel):
    """Schema for updating an existing item via PATCH /items/{id}.

    All fields are optional — only provided fields will be updated.
    This is the standard pattern for partial updates (PATCH) vs full replacements (PUT).
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ItemResponse(BaseModel):
    """Schema for item responses returned by GET endpoints.

    Includes server-managed fields (id, timestamps) alongside user-provided data.
    Use `model_config = ConfigDict(from_attributes=True)` in Pydantic v2 to
    support ORM model conversion via `.model_validate()`.
    """

    id: int = Field(description="Unique database identifier for the item")
    name: str = Field(description="Human-readable name for the item")
    description: str | None = Field(default=None)
    created_at: datetime = Field(
        description="Timestamp when this record was first created"
    )
    updated_at: datetime = Field(
        description="Timestamp of the most recent update to this record"
    )

    model_config = {{"from_attributes": True}}


class ItemListResponse(BaseModel):
    """Paginated response wrapper for list endpoints.

    Provides consistent pagination metadata across all list endpoints,
    enabling frontend code to render page controls uniformly.
    """

    items: list[ItemResponse]
    total: int = Field(description="Total number of items matching the query")
    skip: int = Field(description="Number of records skipped (offset)")
    limit: int = Field(description="Maximum number of records per page")
'''
    (schemas_dir / "item.py").write_text(schema_content)


def _generate_makefile(project_name: str, with_database: bool) -> str:
    """Generate a Makefile with common operations for the scaffold project."""
    db_targets = ""
    if with_database:
        db_targets = '''alembic-init:
\talembic init alembic

alembic-migrate:
\talembic revision --autogenerate -m "Initial migration"

alembic-upgrade:
\talembic upgrade head

alembic-downgrade:
\talembic downgrade -1
'''
    return f'''.PHONY: dev test lint clean {{"alembic-init", "alembic-migrate", "alembic-upgrade", "alembic-downgrade"}}

dev:
\tuvicorn app.main:app --reload --port 8000

test:
\tpython -m pytest tests/ -v --tb=short

lint:
\t# Check type annotations and code style
\tpip install mypy ruff
\tmypy app/
\truff check app/

clean:
\trm -rf build/ dist/ *.egg-info .mypy_cache __pycache__
\tfind . -type d -name "__pycache__" -exec rm -rf {{}} +
{db_targets}'''


# Usage example (run from project root after scaffold generation):
#   python generate_scaffold.py my-service ./output --with-database
# Then:
#   cd output/my-service && pip install -r requirements.txt && make dev
```

---

### Pattern 2: Incremental Adoption Wrapper (Facade Pattern)

The Facade pattern wraps the framework's most complex entry points behind clean, well-typed interfaces. This allows teams to adopt incrementally — they start by calling your clean interface, and as understanding deepens, they can gradually reach into the framework's internals. The wrapper must be thin, typed, and thoroughly tested.

```python
"""Framework facade pattern for incremental adoption.

This module demonstrates how to wrap a framework's complex APIs behind simple,
typed interfaces that evolve with team understanding. The key principle is:
start with a thin layer, expand gradually as needs arise.

Anti-pattern: Creating an abstraction layer that duplicates the entire framework API.
This skill's pattern creates focused wrappers only around the entry points your team
actually uses frequently and finds error-prone when called directly.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import (
    Any,
    Generator,
    Generic,
    Protocol,
    TypeVar,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain exception hierarchy — framework exceptions are translated here
# ---------------------------------------------------------------------------

class FrameworkOnboardingError(Exception):
    """Base exception for framework onboarding operations."""


class FacadeInitializationError(FrameworkOnboardingError):
    """Raised when the framework cannot be initialized properly."""


class InvalidConfigurationError(FrameworkOnboardingError):
    """Raised when facade configuration does not meet requirements."""


# ---------------------------------------------------------------------------
# Protocol-based abstraction — defines what a framework adapter must provide
# ---------------------------------------------------------------------------

T = TypeVar("T")


class RepositoryProtocol(Protocol[T]):
    """Protocol defining the interface that framework-backed repositories must implement.

    Using a Protocol (structural subtyping) instead of ABC means concrete classes
    need not explicitly inherit from this protocol — they just need to provide
    the required methods with compatible signatures. This reduces boilerplate
    and makes the abstraction more resilient to framework changes.
    """

    @abstractmethod
    async def find_by_id(self, id: int) -> T | None: ...

    @abstractmethod
    async def find_all(
        self, skip: int = 0, limit: int = 10
    ) -> list[T]: ...

    @abstractmethod
    async def create(self, data: dict[str, Any]) -> T: ...

    @abstractmethod
    async def update(self, id: int, data: dict[str, Any]) -> T: ...

    @abstractmethod
    async def delete(self, id: int) -> bool: ...


# ---------------------------------------------------------------------------
# Typed result wrapper — eliminates error-code string checking and None returns
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Result(Generic[T]):
    """Success/failure wrapper that makes error handling explicit in return types.

    Usage:
        ok = Result.success(data={"items": [...]})
        err = Result.failure(error=InvalidConfigurationError("missing config"))

        if result.is_success:
            items = result.value["items"]
        else:
            logger.error(f"Operation failed: {result.error}")
    """
    _value: T | None = field(default=None)
    error: Exception | None = field(default=None)

    @classmethod
    def success(cls, value: T) -> Result[T]:
        """Create a successful result wrapper."""
        return cls(_value=value)

    @classmethod
    def failure(cls, error: Exception) -> Result[T]:
        """Create a failure result wrapper with the given exception."""
        return cls(error=error)

    @property
    def is_success(self) -> bool:
        """Whether this result represents a successful operation."""
        return self.error is None

    @property
    def value(self) -> T:
        """Access the success value — raises if this is a failure.

        Raises:
            FrameworkOnboardingError: If this Result was created via .failure().
        """
        if self.error is not None:
            raise FrameworkOnboardingError(
                f"Attempted to access value from failed Result: {self.error}"
            )
        assert self._value is not None  # type narrowing for type checker
        return self._value


# ---------------------------------------------------------------------------
# Facade implementation — wraps framework complexity behind clean interfaces
# ---------------------------------------------------------------------------

class FrameworkFacade(ABC):
    """Abstract base facade that all framework adapters must implement.

    Each concrete facade (e.g., FastAPIFacade, DjangoFacade) implements exactly
    the entry points its team uses most frequently and finds error-prone.

    Design principle: one method per distinct framework capability area. Do not
    create wrapper methods that merely re-document existing framework methods —
    only wrap when you add value through validation, error translation, or
    opinionated defaults.
    """

    def __init__(self) -> None:
        self._initialized = False

    @abstractmethod
    async def initialize(self) -> Result[None]:
        """Initialize the framework connection with proper error handling.

        Returns:
            Success when initialization completes without errors, failure
            wrapped in Result with a descriptive exception on any failure.
        """
        ...

    @property
    def is_initialized(self) -> bool:
        """Whether the facade has been successfully initialized."""
        return self._initialized


class ItemRepositoryFacade(FrameworkFacade, Generic[T]):
    """Facade for item-oriented repository operations.

    Wraps framework-specific database access patterns behind a simple,
    typed interface. Handles connection lifecycle, error translation,
    and pagination consistently across all CRUD operations.

    Example usage:
        facade = ItemRepositoryFacade(
            db_pool=database_pool,
            schema_class=ItemModel,
        )
        await facade.initialize()
        result = await facade.find_all(skip=0, limit=20)

        if result.is_success:
            for item in result.value:
                print(item.name)
        else:
            logger.error(f"Failed to load items: {result.error}")
    """

    def __init__(
        self,
        db_pool: Any,  # Replace with actual DB pool type (e.g., asyncpg.Pool)
        schema_class: type[T],
    ) -> None:
        super().__init__()
        self._db_pool = db_pool
        self._schema_class = schema_class

    async def initialize(self) -> Result[None]:
        """Initialize database connection pool with health check.

        Returns:
            Success if the connection pool is healthy, failure with
            FacadeInitializationError if not.
        """
        try:
            # Verify pool is reachable — framework-specific call wrapped in error handling
            async with self._db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
        except Exception as exc:
            logger.error(f"Failed to initialize database connection: {exc}")
            return Result.failure(
                FacadeInitializationError(
                    f"Database pool initialization failed: {exc}"
                )
            )

        self._initialized = True
        return Result.success(None)

    async def find_by_id(self, id: int) -> Result[T | None]:
        """Find a single item by its database identifier.

        Args:
            id: The primary key to look up. Must be positive.

        Returns:
            Result containing the item if found, or None if not found.
            Failure Result if the query itself failed (connection error, etc).

        Raises no exceptions — errors are wrapped in the Result return type.
        """
        if id < 1:
            return Result.failure(InvalidConfigurationError(f"Invalid ID: {id}"))

        try:
            # Framework-specific query — isolated inside the facade
            async with self._db_pool.acquire() as conn:
                row = await conn.fetchrow("SELECT * FROM items WHERE id = $1", id)
                if row is None:
                    return Result.success(None)
                item = self._schema_class.model_validate(dict(row))
                return Result.success(item)
        except Exception as exc:
            logger.exception(f"Database error finding item {id}")
            # Translate framework exception to domain-level error with chaining
            raise FrameworkOnboardingError(
                f"Failed to find item by ID {id}"
            ) from exc

    async def find_all(
        self, skip: int = 0, limit: int = 10
    ) -> Result[list[T]]:
        """Retrieve a paginated list of items.

        Args:
            skip: Number of records to skip (offset for pagination). Default 0.
            limit: Maximum number of records to return. Default 10, max 100.

        Returns:
            Result containing the list of items, or failure on database error.
        """
        if not (0 <= limit <= 100):
            return Result.failure(
                InvalidConfigurationError(
                    f"Limit must be between 0 and 100, got {limit}"
                )
            )

        try:
            async with self._db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM items ORDER BY id ASC LIMIT $1 OFFSET $2",
                    limit, skip,
                )
                items = [self._schema_class.model_validate(dict(row)) for row in rows]
                return Result.success(items)
        except Exception as exc:
            logger.exception("Database error listing items")
            raise FrameworkOnboardingError(
                "Failed to retrieve item list"
            ) from exc
```

---

### Pattern 3: Type Stub Generation for Learning

Type stubs (`*.pyi`) serve as a dual-purpose learning tool: they provide IDE autocompletion during development and act as executable documentation that developers can read to understand the framework's API. This is especially valuable for dynamically-typed frameworks where the full documentation may be sparse or disorganized.

```python
# FastAPI type stub for onboarding — demonstrates what a .pyi file looks like
# Place this as: app/stubs/fastapi_stubs.pyi (or use mypy's --custom-typeshed-dir)

"""Type stubs for commonly-used FastAPI constructs during framework onboarding.

These stubs document the exact signatures and return types of framework APIs
that new team members will interact with most frequently. They serve as:
1. IDE autocompletion support (configure mypy to find these stubs)
2. Living documentation that is always in sync with actual imports
3. A learning resource — read the docstrings to understand framework behavior

Install with: pip install types-fastapi or configure mypy's --custom-typeshed-dir
"""

# This file demonstrates what real type stubs look like for onboarding purposes.
# In production, use the official `types-<framework>` packages from PyPI:
#   pip install types-fastapi types-pydantic types-sqlalchemy

from typing import Any, Callable, Coroutine, TypeVar, overload


T = TypeVar("T")  # Generic type variable for return types


def FastAPI(
    *,
    title: str = ...,
    description: str = ...,
    version: str = ...,
    openapi_url: str | None = ...,
    docs_url: str | None = ...,
) -> Any: ...


@overload
def get(path: str, **kwargs: Any) -> Callable[[Callable[..., T]], Callable[..., Coroutine[Any, Any, T]]]: ...
@overload
def get(path: str) -> Callable[[Callable[..., T]], Callable[..., Coroutine[Any, Any, T]]]: ...

@overload
def post(path: str, **kwargs: Any) -> Callable[[Callable[..., T]], Callable[..., Coroutine[Any, Any, T]]]: ...
@overload
def post(path: str) -> Callable[[Callable[..., T]], Callable[..., Coroutine[Any, Any, T]]]: ...

def Depends(dependency: Callable[..., T]) -> Any: ...


class BaseModel:
    """Pydantic v2 base model with field-level validation."""

    def __init__(self, **data: Any) -> None: ...
    @classmethod
    def model_validate(cls, obj: Any) -> Any: ...

    class Config:
        from_attributes: bool = True  # Enables ORM model conversion


class Field:
    """Pydantic field with validation constraints and documentation."""

    def __init__(
        self,
        default: Any = ...,
        default_factory: Callable[..., Any] | None = ...,
        alias: str | None = ...,
        title: str | None = ...,
        description: str | None = ...,
        examples: list[Any] | None = ...,
        min_length: int | None = ...,
        max_length: int | None = ...,
        ge: int | float | None = ...,
        le: int | float | None = ...,
    ) -> None: ...
```

---

### Pattern 4: BAD vs GOOD — Framework Adoption Anti-Patterns

Understanding what NOT to do is as important as knowing the right patterns. These anti-patterns are the most common mistakes seen when teams onboard to new frameworks.

**Anti-Pattern 1: The Frankenstein (Partial Adoption)**

Mixing raw framework API calls with custom abstractions, resulting in code that is harder to understand than either approach alone.

```python
# ❌ BAD — Frankenstein anti-pattern
# Mixed raw framework calls + custom logic = unmaintainable spaghetti
@app.route("/items")
def get_items():
    # Raw database connection outside the framework's ORM
    import psycopg2
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items ORDER BY id DESC LIMIT 10")

    # Custom JSON serialization instead of using framework's built-in
    result = []
    for row in cursor.fetchall():
        result.append({
            "id": row[0],           # Index-based access — fragile
            "name": row[1],         # Magic column positions
            # Manually formatting dates outside framework helpers
            "created": str(row[4])  # Inconsistent date formatting
        })

    return jsonify(result)  # Flask's jsonify mixed with raw psycopg2

# ✅ GOOD — Framework-native approach
@app.get("/items/", response_model=list[ItemResponse])
async def list_items(
    skip: Annotated[int, Query(ge=0, description="Pagination offset")] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ItemResponse]:
    """Return paginated items using framework-native patterns.

    Benefits:
    - Pydantic handles response serialization and validation automatically
    - SQLAlchemy ORM provides type-safe database access
    - FastAPI generates OpenAPI documentation from type hints
    - Query parameters are validated by the framework before reaching business logic
    """
    result = await db.execute(
        select(Item).order_by(Item.id.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()
```

**Anti-Pattern 2: Wrapper Hell (Over-Abstraction)**

Creating multiple layers of indirection that add zero value beyond re-documenting the framework's own API.

```python
# ❌ BAD — Wrapper hell (5 layers deep for a simple operation)
class ItemRepositoryInterface(Protocol): ...                    # Layer 1: Protocol
class BaseRepository(ABC): ...                                  # Layer 2: Abstract base
class SQLAlchemyItemRepo(BaseRepository, ItemRepositoryInterface): ...  # Layer 3: Adapter
class CachedItemRepo:                                           # Layer 4: Cache wrapper
    def __init__(self, repo: ItemRepositoryInterface): ...
    async def find_all(self):                                   # Just adds caching
        if cached := self._cache.get("all"): return cached
        data = await self.repo.find_all()                       # One extra hop
        self._cache.set("all", data)
        return data

# ✅ GOOD — Single thin facade that wraps only the error-prone parts
class ItemRepositoryFacade:
    """Thin wrapper providing validation and consistent error handling.

    This facade does NOT duplicate the framework API. It ONLY adds value where:
    1. Framework exceptions need translation to domain errors
    2. Validation logic applies consistently across all access paths
    3. Connection lifecycle management needs centralization
    """
```

---

## Constraints

### MUST DO
- Always start with a scaffold project that runs successfully out of the box — no hypothetical code, no `pass` bodies
- Generate typed interfaces (`*.pyi` or inline type annotations) for every framework entry point your team calls directly
- Wrap only the 3–5 most error-prone framework entry points in facades; do not create abstraction layers that duplicate the entire API surface
- Include a progressive disclosure learning path with concrete implementation tasks and objectively verifiable success criteria at each stage (Surface → Advanced → Deep)
- Provide BAD vs. GOOD examples for every anti-pattern identified — never just list problems without remediation
- Reference authoritative framework documentation links in a dedicated section (5–7 links minimum); your onboarding material supplements, never replaces, official docs
- Write integration tests that validate the scaffold project works with real dependencies (not mocked frameworks)

### MUST NOT DO
- Never create wrapper layers that add zero value beyond re-documenting existing framework methods — if the wrapper is thinner than the framework's own docs, it is not a wrapper, it is an anti-pattern
- Never use `pass`, `return {}`, `# TODO`, or any placeholder code in scaffold examples — every line must be functional
- Never present onboarding as a linear documentation reading exercise — each stage must require writing real code that passes tests
- Never skip the incremental adoption wrapper pattern for frameworks with complex entry points (ORMs, routers, middleware systems) — teams will get stuck calling framework internals directly
- Never provide unpinned dependency versions in scaffold `requirements.txt` or `package.json` — always use exact versions (`==`) for reproducible onboarding
- Never skip the "When NOT to Use" section — onboarding overhead is real and must be weighed against actual need

---

## Live References

> Authoritative documentation links for software onboarding and developer experience. The model follows markdown links at load time to resolve external references and inline content.

- [Nielsen Norman Group — Onboarding Users into Software](https://www.nngroup.com/articles/onboarding-users-software/) — UX research on progressive disclosure, user education patterns, and reducing time-to-value for new software adopters
- [Martin Fowler — Framework Onboarding](https://martinfowler.com/articles/frameworkOnboarding.html) — Technical strategies for introducing new frameworks to teams including scaffolding, convention adoption, and gradual migration
- [Google's Developer Documentation Best Practices](https://developers.google.com/style) — Writing guidelines for documentation that enables developers to onboard quickly with clear examples and progressive complexity
- [ReadTheDocs — Project Documentation Hosting](https://docs.readthedocs.io/en/stable/) — Platform for hosting framework documentation with versioning, search, and cross-linking capabilities
- [Docusaurus — Modern Documentation Framework](https://docusaurus.io/docs) — React-based documentation site generator used by major open-source projects for onboarding documentation |

---

## Output Template

When this skill is loaded, the model's output must contain:

1. **Scaffold Project** — A runnable starter project with 3–5 working examples demonstrating core capabilities, complete with `requirements.txt` (pinned versions), `Makefile`, and inline documentation
2. **Facade Wrappers** — Thin, typed wrapper classes (using Protocol or ABC) for the 3–5 most error-prone framework entry points, with full type signatures and docstrings
3. **Type Stubs** — `.pyi` stub files or comprehensive inline annotations for all directly-imported framework APIs, serving as both IDE support and learning documentation
4. **Progressive Learning Path** — A structured plan mapping Surface → Advanced → Deep stages with specific implementation tasks, acceptance criteria, known pitfalls, and documentation references per stage
5. **Anti-Pattern Catalog** — The top 3–5 onboarding anti-patterns relevant to the chosen framework, each with BAD vs. GOOD code comparison and explicit remediation steps
6. **Integration Test Scaffolding** — Working test files that validate the scaffold runs correctly using real (not mocked) framework dependencies
