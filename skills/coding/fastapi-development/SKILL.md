---
name: fastapi-development
description: Implements FastAPI application patterns including dependency injection, Pydantic v2 models, async handlers, JWT authentication, middleware chains, background tasks, and production deployment strategies for high-performance Python web services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: fastapi, dependency injection, pydantic v2, async endpoints, jwt authentication, fastapi middleware, uvicorn, python web framework
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
  related-skills: django-best-practices
------
# FastAPI Development Guide
Senior FastAPI engineer building high-performance async web services using modern Python 3.10+ patterns, Pydantic v2, and production-grade deployment strategies. This skill covers the full stack — from project architecture and dependency injection to authentication, middleware, background processing, and containerized deployments.
---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## TL;DR Checklist
- [ ] Use lifespan events (async context managers) instead of `on_event("startup")` for initialization
- [ ] Define explicit return types with `Response` or typed Pydantic models on every endpoint
- [ ] Use `Depends()` for all shared resources (DB sessions, current user, config) — never instantiate them in handlers
- [ ] Annotate all function signatures with Python 3.10+ union syntax (`X | Y`) and type hints
- [ ] Use Pydantic v2 `@field_validator` / `@model_validator` — never deprecated v1 validators
- [ ] Keep business logic out of route handlers — delegate to service layer functions
- [ ] Use `TestClient(app)` with `app.dependency_overrides` for test isolation
- [ ] Configure CORS explicitly with allowed origins, methods, and credentials flags
---
## Core Workflow
Scaffold Project Structure: Create `app/` directory with `main.py`, `core/` (settings, config), `models/` (database models or Pydantic schemas), `routers/` (API route groups), `services/` (business logic), and `deps/` (shared dependencies). Use a factory function `create_app()` to construct the FastAPI instance. **Checkpoint:** Verify that the app starts with `uvicorn app.main:app --reload` without import errors.; Configure Lifespan & Dependencies: Implement async lifespan context managers for startup/shutdown lifecycle events (database pool creation, cache connections). Register all shared dependencies using `Depends()` in routers. **Checkpoint:** Confirm that database sessions are properly closed on shutdown via the lifespan manager.; Define Pydantic v2 Request/Response Models: Create typed request schemas with `@field_validator` for custom validation rules and response schemas matching your API contract. Use validation groups (`mode="python" vs "json"`) when input sources differ. **Checkpoint:** Run model schema dump via `app.openapi()` to verify generated OpenAPI spec matches your intended API surface.; Implement Route Handlers with Dependency Injection: Write route functions that receive injected dependencies (DB sessions, current user, config). Delegate business logic to service-layer functions. Never instantiate database connections or call external services directly in handlers. **Checkpoint:** Verify every handler has explicit return type annotations and uses only injected dependencies.; Build Middleware Chain & Exception Handlers: Add Starlette middleware for cross-cutting concerns (request timing, CORS, auth). Register custom exception handlers to translate framework exceptions into structured JSON responses. **Checkpoint:** Test that unhandled exceptions produce consistent error payloads with `status_code`, `detail`, and optional `errors` fields.; Write Tests with Dependency Overrides: Use `TestClient(app)` with `app.dependency_overrides` to mock database sessions, external API calls, and authentication dependencies. Write both synchronous test functions (with `TestClient`) and async tests (with `httpx.AsyncClient`). **Checkpoint:** Verify that dependency overrides are scoped to the client session and don't leak into other tests.; Package & Deploy: Build a multi-stage Dockerfile based on Python slim image. Configure Uvicorn with appropriate worker count (`--workers` for multiple cores), access logging, and graceful shutdown timeout. Expose health check endpoints for container orchestrators. **Checkpoint:** Validate that `curl /health` returns 200 and the container exits cleanly on SIGTERM within the configured timeout.
---
## Implementation Patterns
### Pattern 1: Project Structure & App Factory
Recommended directory layout for a production FastAPI application with separation of concerns, lifecycle management, and clean app construction:
```
myapi/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── .env                       # Never committed; loaded by python-dotenv
│
└── app/
    ├── __init__.py
    ├── main.py                # App factory + lifespan events
    ├── core/
    │   ├── __init__.py
    │   ├── config.py          # Pydantic-settings configuration
    │   ├── security.py        # JWT utilities, password hashing
    │   └── exceptions.py      # Custom exception classes & handlers
    ├── models/
    │   ├── __init__.py
    │   ├── schemas.py         # Pydantic request/response schemas
    │   └── base.py            # Shared model mixins
    ├── routers/
    │   ├── __init__.py
    │   ├── users.py           # User-related endpoints
    │   └── orders.py          # Order management endpoints
    ├── services/
    │   ├── __init__.py
    │   ├── user_service.py    # Business logic for users
    │   └── order_service.py   # Business logic for orders
    ├── deps/
    │   ├── __init__.py
    │   └── database.py        # DB session dependency
    └── middleware/
        ├── __init__.py
        └── timing.py          # Request timing middleware
```
**App factory with lifespan events (`app/main.py`):**
```python
"""FastAPI application factory with async lifespan management."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.middleware.timing import TimingMiddleware
from app.routers import users, orders


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: startup and shutdown resources."""
    # Startup: initialize database connection pool, cache client, etc.
    print(f"[startup] Initializing services for environment: {settings.environment}")

    # Example: create DB connection pool on startup
    from app.deps.database import engine, Base, init_db
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[startup] Database tables ready")

    yield  # Application runs here

    # Shutdown: close pools, flush buffers, etc.
    await engine.dispose()
    print("[shutdown] All resources released")


def create_app() -> FastAPI:
    """Factory function that constructs and configures the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="High-performance API service",
        docs_url="/docs" if settings.debug else None,   # Swagger UI disabled in prod
        redoc_url="/redoc" if settings.debug else None,  # ReDoc disabled in prod
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    # CORS middleware — must be added before other middleware that modifies response
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        max_age=600,  # Cache preflight for 10 minutes
    )

    # Request timing middleware (Starlette)
    app.add_middleware(TimingMiddleware)

    # Prometheus metrics instrumentation
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # Custom exception handlers
    register_exception_handlers(app)

    # Register routers
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(orders.router, prefix="/api/v1/orders", tags=["orders"])

    return app


app = create_app()


# Health check endpoint — required for container orchestration probes
@app.get("/health", tags=["operations"])
async def health_check() -> dict:
    """Return 200 when the service is healthy. Used by Kubernetes liveness/readiness probes."""
    return {"status": "ok", "environment": settings.environment}
```
**Pydantic Settings configuration (`app/core/config.py`):**
```python
"""Application settings using pydantic-settings for type-safe environment loading."""
from functools import cached_property
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Silently ignore unknown env vars
    )

    # Application identity
    app_name: str = "My FastAPI Service"
    version: str = "0.1.0"
    environment: str = Field(default="development", pattern="^(development|staging|production)$")
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: list[str] = Field(default=["http://localhost:3000"], min_length=1)

    # Database — PostgreSQL connection string from environment
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/myapi",
        description="Async database URL compatible with SQLAlchemy 2.0 + asyncpg",
    )

    # JWT configuration
    jwt_secret_key: str = Field(..., description="Secret key for signing JWT tokens")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Security
    secret_key: str = Field(..., min_length=32, description="General-purpose secret key (>= 32 chars)")

    @cached_property
    def is_production(self) -> bool:
        """Convenience property to check if running in production environment."""
        return self.environment == "production"


# Singleton settings instance — loaded once at import time
settings = Settings()
```
---
### Pattern 2: Dependency Injection System
FastAPI's dependency injection is its killer feature. It enables testable, reusable, and cleanly-scoped resource management. This pattern covers function deps, class-based deps with setup/teardown, scanning (nested depends), override for testing, and caching behavior.
```python
# app/deps/database.py — Database session dependency with proper cleanup
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents deferred load issues after commit
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and guarantee cleanup on exit.

    This is the canonical dependency for injecting DB sessions into endpoints.
    The session is rolled back on exception and closed regardless of outcome.
    """
    session: AsyncSession = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
```
**Class-based dependency with setup/teardown (`app/deps/cache.py`):**
```python
# app/deps/cache.py — Cache connection with lifecycle management
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends

from app.core.config import settings


class CacheDependency:
    """Class-based dependency for managing Redis connection lifecycle.

    __init__ runs once at construction (fast, no I/O).
    __call__ runs per-request and returns the actual resource.
    Async cleanup in the generator handles teardown.
    """

    def __init__(self) -> None:
        # Only store config — do NOT open connections here
        self._url = f"redis://:{settings.redis_password}@{settings.redis_host}:{settings.redis_port}/0"  # noqa: E501

    async def __call__(self) -> AsyncGenerator[aioredis.Redis, None]:
        """Create Redis connection per-request and close on exit."""
        client: aioredis.Redis = aioredis.from_url(
            self._url,
            encoding="utf-8",
            decode_responses=True,
        )
        try:
            yield client
        finally:
            await client.aclose()


# Singleton instance — reused across requests for efficiency
cache_dep = CacheDependency()
```
**Dependency scanning with nested Depends and caching (`app/routers/users.py`):**
```python
# app/routers/users.py — Endpoints using dependency scanning
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr

from app.deps.database import get_db_session
from app.deps.cache import cache_dep
from app.models.schemas import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    create_user as _create_user,
    get_user_by_id as _get_user_by_id,
    update_user as _update_user,
)
from app.core.security import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserRead, summary="Get user by ID")
async def read_user(
    user_id: int,
    db=Depends(get_db_session),
    cache=Depends(cache_dep),
) -> UserRead:
    """Fetch a user, checking the cache first via dependency scanning."""
    # Dependency scanning: get both db session and cache instance
    cache_key = f"user:{user_id}"
    cached = await cache.aget(cache_key)

    if cached is not None:
        from pydantic.json import model_validate_json
        return model_validate_json(UserRead, cached)  # Fast path: return cached

    user = await _get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Cache the result for 5 minutes
    import json
    await cache.setex(cache_key, 300, UserRead.model_dump_json(user))
    return user


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(
    user_data: UserCreate,
    db=Depends(get_db_session),
) -> UserRead:
    """Create a new user with validated input from Pydantic model."""
    # Business logic is in the service layer — never inline in handlers
    user = await _create_user(db, user_data)

    # Invalidate any existing cache for this email
    cache = await cache_dep.__call__()  # Get fresh instance for invalidation
    async with cache:
        await cache.delete(f"user:{user.email}")

    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user_endpoint(
    user_id: int,
    updates: UserUpdate,
    current_user=Depends(get_current_active_user),  # Auth dependency
    db=Depends(get_db_session),
) -> UserRead:
    """Update an existing user. Only the owner or admin can modify."""
    updated = await _update_user(db, user_id, updates)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated
```
**Dependency override for testing (`tests/conftest.py`):**
```python
# tests/conftest.py — Test fixtures with dependency injection overrides
import pytest
from collections.abc import AsyncGenerator
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="session")
def app() -> FastAPI:
    """Session-scoped test application instance."""
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> AsyncGenerator[TestClient, None]:
    """Test client with dependency overrides for isolated testing.

    Overrides replace real database sessions and cache connections with
    in-memory test doubles. Dependencies are scoped to this client only.
    """
    # Override the database session dependency
    async def override_get_db():
        """Provide an in-memory SQLite session for testing."""
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from app.models.base import Base

        test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)  # noqa: E501
        session: AsyncSession = session_factory()
        try:
            yield session
        finally:
            await session.close()
            await test_engine.dispose()

    from app.main import app as real_app
    real_app.dependency_overrides[get_db_session] = override_get_db
    real_app.dependency_overrides[cache_dep.__call__] = lambda: _mock_cache()  # type: ignore[arg-type]

    with TestClient(real_app) as test_client:
        yield test_client

    # Clean overrides after each test
    real_app.dependency_overrides.clear()
```
**BAD vs. GOOD: When NOT to over-engineer DI:**
```python
# ❌ BAD: Over-engineering — creating a dependency for something that is just a constant
class SettingsDependency:
    """Don't do this. Settings are already a module-level singleton."""
    def __call__(self) -> Settings:
        return settings  # Unnecessary class wrapper


def bad_endpoint(settings: Settings = Depends(SettingsDependency())) -> dict:
    return {"env": settings.environment}


# ✅ GOOD: Use the singleton directly — no dependency wrapper needed
def good_endpoint() -> dict:
    from app.core.config import settings
    return {"env": settings.environment}


# ❌ BAD: Inline business logic that should be in a service layer
async def bad_handler(db: AsyncSession = Depends(get_db_session)) -> dict:
    # This is 20 lines of business logic crammed into a route handler — unmaintainable
    users = await db.execute(select(User).where(User.is_active == True))
    active_users = [u for u in users.scalars().all() if u.last_login > days_ago(30)]
    result = {"count": len(active_users), "recent": [...]}
    return result


# ✅ GOOD: Delegate to a service function — handler is thin and declarative
async def good_handler(db: AsyncSession = Depends(get_db_session)) -> dict:
    active_count, recent_list = await user_service.get_active_users_last_30_days(db)
    return {"count": active_count, "recent": recent_list}
```
---
### Pattern 3: Pydantic v2 Model Patterns
Pydantic v2 is a fundamental rewrite from v1 with breaking changes. Key differences: `model_config` replaces `class Config`, `@field_validator` replaces `@validator`, and validation groups (`mode="python" vs "json"`) handle different input contexts.
```python
# app/models/schemas.py — Pydantic v2 request and response schemas
from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserRole(str, Enum):
    """Valid user roles in the system."""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class UserCreate(BaseModel):
    """Schema for creating a new user. Used for POST /users request body."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "email": "alice@example.com",
                    "username": "alice",
                    "password": "SecureP@ss123!",
                    "full_name": "Alice Developer",
                },
            ],
        },
    )

    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)

    @field_validator("username")
    @classmethod
    def username_no_leading_trailing(cls, v: str) -> str:
        stripped = v.strip()
        if stripped != v:
            raise ValueError("username must not have leading or trailing whitespace")
        return stripped

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        """Enforce password complexity: at least one uppercase, one lowercase, one digit."""
        if not any(c.isupper() for c in v):
            raise ValueError("password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user. All fields optional for PATCH-style updates."""

    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: UserRole | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_blank_update(cls, data: Any) -> Any:
        """Reject requests where all fields are None or empty — nothing to update."""
        if isinstance(data, dict):
            if not any(v is not None and v != "" for v in data.values()):
                raise ValueError("At least one field must be provided for update")
        return data


class UserRead(BaseModel):
    """Schema for reading user data. Used for GET /users/{id} response."""

    model_config = ConfigDict(from_attributes=True)  # SQLAlchemy ORM-compatible

    id: int
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class PasswordChange(BaseModel):
    """Schema for changing password with current and new password validation."""

    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "PasswordChange":
        """Ensure the new password is different from the current one."""
        if self.current_password == self.new_password:
            raise ValueError("new_password must differ from current_password")
        return self
```
**Nested models with validation groups:**
```python
# app/models/schemas.py — Nested request/response models

from pydantic import ValidationError


class Address(BaseModel):
    """Address nested model used in user profile and order contexts."""

    street: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=50)
    postal_code: str = Field(pattern=r"^\d{5}(-\d{4})?$")  # US ZIP+4 format
    country: str = Field(default="US", pattern=r"^[A-Z]{2}$")


class OrderCreate(BaseModel):
    """Schema for creating an order with nested address."""

    items: list[dict[str, Any]] = Field(min_length=1, description="List of items to order")
    shipping_address: Address
    billing_address: Address | None = None
    notes: str | None = Field(default=None, max_length=500)


class OrderResponse(BaseModel):
    """Full order response including nested address data."""

    id: int
    status: str
    total_amount: float
    items_count: int
    shipping_address: Address
    billing_address: Address | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Validation groups example — validate differently based on input source
class ProductCreate(BaseModel):
    """Product creation schema with validation groups."""

    name: str
    price: float
    description: str | None = None

    @field_validator("price", mode="before")
    @classmethod
    def ensure_positive(cls, v: float) -> float:
        """Validate that price is positive — used for both JSON and Python input."""
        if v < 0:
            raise ValueError("price must be non-negative")
        return v

    @field_validator("price", mode="after")
    @classmethod
    def round_price(cls, v: float) -> float:
        """Round price to 2 decimal places for currency precision."""
        return round(v, 2)


# JSON Schema output example — FastAPI uses this for OpenAPI documentation
def dump_json_schema() -> dict:
    """Dump the generated JSON schema for external consumption (e.g., API clients)."""
    return OrderCreate.model_json_schema(mode="json")

# Example output:
# {
#   "$defs": {
#     "Address": {
#       "properties": {
#         "street": {"maxLength": 300, "minLength": 5, "title": "Street", "type": "string"},
#         "city": {"maxLength": 100, "minLength": 2, "title": "City", "type": "string"},
#         ...
#       },
#       "required": ["street", "city", "state", "postal_code"],
#       "title": "Address",
#       "type": "object"
#     }
#   },
#   "properties": {
#     "items": {"items": {"type": "object"}, "minItems": 1, "title": "Items", "type": "array"},
#     "shipping_address": {"$ref": "#/$defs/Address"},
#     ...
#   },
#   "required": ["items", "shipping_address"],
#   "title": "OrderCreate",
#   "type": "object"
# }
```
---
### Pattern 4: Authentication & Authorization
JWT-based authentication with OAuth2 password flow, role-based access control, and token refresh. This pattern shows complete authentication infrastructure.
```python
# app/core/security.py — JWT utilities and OAuth2 password flow
import base64
import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from app.core.config import settings

# Password hashing — bcrypt with auto-rounds
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 token URL dependency — FastAPI uses this to generate the Swagger UI flow
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token with configurable expiration.

    Args:
        subject: The identifier to encode in the token (e.g., user ID or email).
        expires_delta: Optional custom expiry. Defaults to settings value.

    Returns:
        Signed JWT token string.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)

    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,  # Subject — typically user identifier
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def create_refresh_token(subject: str) -> str:
    """Create a long-lived refresh token for obtaining new access tokens."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with auto-calculated rounds."""
    return pwd_context.hash(password)
```
**Auth dependency for extracting the current user:**
```python
# app/core/auth.py — Authentication & authorization dependencies
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token, oauth2_scheme
from app.deps.database import get_db_session
from app.models.base import User  # SQLAlchemy user model


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Extract and validate the current user from the Authorization Bearer token.

    Returns None if the token is invalid (endpoint decides whether to reject).
    Use get_current_active_user() for endpoints that require authentication.
    """
    payload = decode_token(token)
    subject: str = payload.get("sub")

    if subject is None or payload.get("type") != "access":
        return None

    result = await db.execute(select(User).where(User.id == int(subject)))
    user = result.scalar_one_or_none()
    return user


async def get_current_active_user(
    current_user: User | None = Depends(get_current_user),
) -> User:
    """Require an authenticated, active user. Rejects unauthenticated requests."""
    if current_user is None or not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated or account is inactive",
        )
    return current_user


# Role-based access control — dependency that checks user role
def require_role(required_role: str):
    """Return a dependency that checks the current user has at least the required role.

    Usage: @router.get("/admin/endpoint", dependencies=[Depends(require_role("admin"))])
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        role_hierarchy = {"viewer": 1, "user": 2, "admin": 3}
        user_level = role_hierarchy.get(current_user.role.value, 0)
        required_level = role_hierarchy.get(required_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{required_role}' role or higher",
            )
        return current_user

    return role_checker


# Token refresh endpoint pattern
from fastapi import APIRouter, Request

auth_router = APIRouter(prefix="/auth", tags=["authentication"])


@auth_router.post("/token")
async def login_for_access_token(
    request: Request,
) -> dict[str, str]:
    """OAuth2 password flow — exchange credentials for access + refresh tokens."""
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    # Authenticate user against database (simplified — real code queries DB)
    user = await authenticate_user(username, password)  # noqa: F821 — defined elsewhere
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@auth_router.post("/refresh")
async def refresh_access_token(request: Request) -> dict[str, str]:
    """Refresh an expired access token using a valid refresh token."""
    form_data = await request.form()
    refresh_token = form_data.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        subject = payload["sub"]
        new_access_token = create_access_token(subject=subject)
        return {"access_token": new_access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


async def authenticate_user(username: str, password: str) -> User | None:
    """Authenticate user credentials against the database. Simplified for this example."""
    # In real code: query DB, compare hashed passwords with verify_password()
    return None  # Placeholder
```
---
### Pattern 5: Middleware Chain Construction
FastAPI uses Starlette's ASGI middleware infrastructure. Understand the difference between Starlette middleware (wrap each request) and ASGI middleware (wrap the entire application stack). Proper ordering matters — CORS must come before auth, timing before response generation.
```python
# app/middleware/timing.py — Request timing middleware using Starlette's Middleware base class
import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TimingMiddleware(BaseHTTPMiddleware):
    """Add X-Request-Time header with request processing duration in milliseconds.

    Uses BaseHTTPMiddleware which wraps individual requests but runs within the ASGI scope.
    Suitable for per-request logic like timing, logging, and basic auth checks.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000

        # Add timing header to the response
        response.headers["X-Request-Time"] = f"{process_time:.2f}ms"

        # Log request details (in production, use structured JSON logging)
        if process_time > 100:  # Warn for slow requests (>100ms)
            print(
                f"[slow] {request.method} {request.url.path} 
                f"— {process_time:.2f}ms — {response.status_code}"
            )

        return response


# Alternative: ASGI middleware (runs at the application level, not per-request wrapped)
# This is more performant but has less request context access.
class AppLevelMiddleware:
    """ASGI-level middleware for high-performance concerns like gzip compression."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Check Accept-Encoding and set gzip header — applied before response body is generated
        headers = dict(scope.get("headers", []))
        accepts_gzip = b"application/gzip" in headers.get(b"accept-encoding", b"")

        if accepts_gzip:
            # In production, use a proper middleware like django-compressor or starlette's GZipMiddleware
            pass  # Placeholder — real implementation compresses response body
```
**CORS configuration and custom exception handler middleware:**
```python
# app/core/exceptions.py — Global exception handlers for structured error responses
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class APIError(Exception):
    """Base application error with structured response payload."""

    def __init__(self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: dict | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail or {}


class NotFoundError(APIError):
    def __init__(self, resource: str, identifier: str | None = None):
        msg = f"{resource} not found"
        if identifier:
            msg += f": {identifier}"
        super().__init__(
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"resource": resource, "identifier": identifier},
        )


class AuthenticationError(APIError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI application.

    These handlers intercept exceptions before they reach Starlette's default
    error handler, producing consistent JSON error responses.
    """

    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "status_code": exc.status_code,
                    "detail": exc.detail,
                },
            },
        )

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
        """Convert Pydantic validation errors into structured API error responses.

        This is critical — FastAPI automatically returns 422 for validation failures,
        but this handler structures the response to match the API's error format.
        """
        errors = []
        for error in exc.errors():
            loc = " -> ".join(str(l) for l in error.get("loc", ()))
            errors.append({
                "field": loc,
                "message": error["msg"],
                "type": error["type"],
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "message": "Validation failed",
                    "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "errors": errors,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all handler for unexpected errors. Never expose internal details in production."""
        # In production, log the full traceback internally but return a generic message externally
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Unhandled exception in %s %s", request.method, request.url.path)

        is_prod = request.headers.get("x-environment") == "production"

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "message": "Internal server error" if is_prod else str(exc),
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "detail": {} if is_prod else {"exception_type": type(exc).__name__},
                },
            },
        )
```
---
### Pattern 6: Background Tasks & Celery Integration
FastAPI's built-in `BackgroundTasks` for simple jobs (emails, webhook calls) and Celery integration for heavier workloads with retry logic.
```python
# app/services/background.py — Background task implementations
import asyncio
from typing import Any

import httpx
from fastapi import BackgroundTasks

from app.core.config import settings


def send_welcome_email(email: str, username: str) -> None:
    """Send a welcome email via SMTP. Runs in background thread pool.

    This function executes in a separate thread — it is NOT async.
    FastAPI runs sync functions in an executor thread pool by default.
    """
    # In production: use an actual email library with templates
    print(f"[email] Would send welcome to {email} for user '{username}'")


async def deliver_webhook(url: str, payload: dict[str, Any]) -> None:
    """Deliver a webhook asynchronously using httpx.AsyncClient.

    Use this when the background operation is I/O-bound and benefits from async.
    Must be registered with add_event_handler or called via BackgroundTasks with sync wrapper.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            import logging
            logging.getLogger(__name__).error(
                "Webhook delivery failed to %s: %s", url, exc
            )


def create_background_webhook_task(url: str, payload: dict[str, Any]) -> None:
    """Wrap the async webhook in a sync function for FastAPI BackgroundTasks.

    FastAPI's BackgroundTasks.add_callback only accepts sync functions,
    so we wrap async work using asyncio.run() in a thread.
    """
    import asyncio
    import threading

    def _run_async():
        asyncio.run(deliver_webhook(url, payload))

    thread = threading.Thread(target=_run_async)
    thread.start()


# Celery integration pattern for heavy workloads
celery_app_config = {
    "broker_url": settings.celery_broker_url,  # redis:// or amqp://
    "result_backend": settings.celery_result_backend,
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "timezone": "UTC",
    "enable_utc": True,
    "task_track_started": True,  # Required for retry with ETA
    "worker_max_tasks_per_child": 100,  # Prevent memory leaks
}


# Example Celery task definition (defined in a separate celery_tasks.py module)
def order_processing_task(order_id: int, user_id: int) -> dict[str, Any]:
    """Heavy order processing — invoicing, inventory reservation, shipping label generation.

    This function runs on a Celery worker, not the FastAPI process.
    Use it when processing takes more than ~500ms or involves multiple external services.
    """
    # In production: implement actual processing logic with retry decorators
    return {"order_id": order_id, "status": "processing", "steps_completed": ["validated"]}


# Retry decorator example for Celery tasks
"""
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
import logging

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_payment(self, payment_id: int, amount: float) -> dict:
    '''Process payment with retry on transient failures.'''  
    try:
        from app.services.payment_gateway import charge
        result = charge(payment_id, amount)
        return {"payment_id": payment_id, "status": "completed", "transaction_id": result["id"]}
    except PaymentGatewayTimeout as exc:
        # Retry on transient failures with exponential backoff
        logging.warning("Payment gateway timeout for %s, retrying...", payment_id)
        raise self.retry(exc=exc, countdown=self.request.retries * 30)
    except PaymentGatewayError as exc:
        # Do not retry on permanent failures — fail immediately
        raise MaxRetriesExceededError(f"Permanent payment error: {exc}") from exc
"""
```
```
.... continued ...
```