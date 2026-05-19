---
name: framework-design
description: Translates framework constraints into concrete architectural blueprints with module structure, interface contracts, adapter wiring, data flow diagrams, and validation checklists that map every framework requirement to a design element.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework design, architectural blueprint, extension points, adapter pattern, interface contracts, composition root, framework integration
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, diagrams]
  related-skills: software-architecture, modular-design, error-handling, fastapi-patterns
---

# Framework Design Blueprint

Translates framework constraints into concrete architectural blueprints — producing module trees, interface contracts, adapter wiring strategies, data flow diagrams, and validation checklists that map every framework requirement to a corresponding design element. The model acts as a senior framework architect who reads the framework's contract, identifies extension points, and designs components that plug cleanly into its lifecycle without fighting its conventions.

## TL;DR Checklist

- [ ] Extract every lifecycle event and hook from the framework documentation before designing any module
- [ ] Map each framework constraint to a specific interface or module boundary
- [ ] Declare all cross-boundary contracts as protocols or abstract base classes in the innermost layer
- [ ] Build an adapter for every third-party dependency the framework requires (DB, cache, message broker)
- [ ] Construct a composition root that wires all adapters into the framework's injection container at startup
- [ ] Run the framework requirement → design element traceability matrix before writing any implementation

---

## When to Use

Use this skill when:

- Integrating an application into an existing framework (FastAPI, Django, Spring Boot, Rails, Express) and you need to map the framework's lifecycle hooks and extension points to your own module boundaries.
- Designing a plugin or extension system where external modules must conform to the host framework's lifecycle contracts without importing from it directly.
- Evaluating whether an existing codebase's architecture aligns with the framework's intended patterns — e.g., detecting where business logic leaked into middleware, controllers, or ORM models.
- Creating a microservice that wraps a monolithic framework's services through adapter modules while keeping domain logic framework-agnostic.
- Onboarding a team onto a new framework by producing wiring diagrams, interface contracts, and a dependency injection bootstrap strategy before any feature code is written.

---

## When NOT to Use

Avoid this skill for:

- Designing the internal structure of a single function or class — use `modular-design` or `software-design-principles` instead. Framework-level design creates unnecessary overhead for unit-scale concerns.
- Choosing which framework to adopt — use a requirements analysis or tech evaluation process first. This skill assumes the framework is already selected and you need to architect within it.
- Simple scripts, CLI tools, or data pipelines under ~500 lines that have no external dependencies beyond the standard library. Framework integration is overkill here.
- Codebase refactoring that doesn't involve framework constraints — if there's no framework lifecycle, extension points, or injection container to work with, use `refactoring-techniques` instead.

---

## Core Workflow

### Step 1: Extract Framework Lifecycle Constraints

Read the framework's documentation and source code to identify every lifecycle event, hook, middleware registration point, and dependency injection container it exposes. Categorize each by timing: **boot** (before the app starts), **request** (per HTTP request or message), **shutdown** (graceful teardown), or **background** (periodic/cron tasks). Record which components the framework *owns* versus which it *expects you to provide*.

**Checkpoint:** Build a constraint inventory table with columns: `event_name | timing_phase | framework_owns | my_contracts`. Every item in this table must trace back to a specific section of the framework's official documentation. If the framework doesn't document a hook, inspect its source code to confirm it exists and understand its invocation order.

### Step 2: Map Constraints to Interface Contracts

For each framework constraint that requires your implementation, declare an interface (Python `Protocol` or ABC) in your domain layer — not in the framework-aware module. The interface must express *what* the framework needs, not *how* it gets wired. Include method signatures that match the framework's invocation contract (parameter names, return types, exception behavior).

**Checkpoint:** Run a mental import audit — no inner-layer module should import from `framework_packages` or contain framework-specific type hints. Every interface must be testable with an in-memory mock. If a Protocol has a parameter typed as `FastAPI` or `django.db.models.QuerySet`, the contract leaks into the domain.

### Step 3: Identify Extension Points and Design Adapters

Map each framework extension point (middleware, signal handlers, command hooks, plugin registries) to an adapter class that implements the corresponding interface from Step 2. Adapters translate between the framework's native types and your domain contracts. They live in the outermost layer and must never be imported by domain or application modules.

**Checkpoint:** Every adapter must have a test that verifies it correctly marshals data between framework types and domain types. Run `python -c "from app.domain import *"` — if this command imports anything from the framework ecosystem, an adapter is leaking inward.

### Step 4: Generate Design Artifacts

Produce the concrete design documentation that engineers need to implement without ambiguity: module tree with layer annotations, interface contract specifications with typed signatures, wiring diagram showing which adapters plug into which framework hooks, and dependency injection configuration for the composition root. Each artifact must reference specific files and line numbers where interfaces are declared and implementations live.

**Checkpoint:** Trace every arrow in the wiring diagram back to a real import statement or function call. If an adapter claims to hook into a lifecycle event but no file registers that hook with the framework's registration API, the artifact is speculative — remove it or add the missing registration code.

### Step 5: Validate Against Framework Requirements

Run every requirement from the constraint inventory table (Step 1) through a traceability matrix. Each requirement must have: a corresponding interface in the domain layer, an adapter implementing that interface, and a wiring point in the composition root connecting them. Flag any orphan requirements (no design element), any orphan interfaces (no adapter implements them), and any adapters with no framework hook calling them.

**Checkpoint:** The traceability matrix must close — zero orphans on every side. If a requirement says "handle authentication before each request" and the matrix shows `AuthMiddlewareAdapter → AuthPort → register_middleware('auth')`, that's a closed loop. If any arrow is missing, the design is incomplete.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Framework Constraint Extraction via Introspection

Extract framework lifecycle constraints programmatically by inspecting the framework's hook registration APIs, middleware stack, and dependency injection container. This produces a machine-readable constraint inventory that drives all downstream design decisions. The function below demonstrates extracting FastAPI-style lifespan events and middleware requirements from a framework registry.

```python
"""Framework constraint extraction — translates framework internals into typed constraint records."""

from __future__ import annotations

import enum
import inspect
from dataclasses import dataclass, field
from typing import Any, Callable


class LifecyclePhase(enum.Enum):
    """When in the framework lifecycle a hook fires."""
    BOOT = "boot"          # Before any request handling starts
    REQUEST = "request"    # Per HTTP request / message processing
    SHUTDOWN = "shutdown"  # Graceful teardown before process exit
    BACKGROUND = "background"  # Periodic or cron-style tasks


class Ownership(enum.Enum):
    """Who is responsible for providing the implementation."""
    FRAMEWORK = "framework"       # Built-in behavior, cannot override
    MY_APPLICATION = "my_app"     # Must be implemented by application code
    BOTH = "both"                 # Framework provides default; can override


@dataclass(frozen=True)
class FrameworkConstraint:
    """A single framework requirement that the architecture must address."""

    event_name: str
    phase: LifecyclePhase
    ownership: Ownership
    description: str
    framework_api: str
    required_contracts: list[str] = field(default_factory=list)

    @property
    def requires_adapter(self) -> bool:
        return self.ownership in (Ownership.MY_APPLICATION, Ownership.BOTH)


@dataclass(frozen=True)
class ConstraintExtractionResult:
    """Complete inventory of framework constraints extracted from a framework instance."""

    constraints: list[FrameworkConstraint]
    unimplemented_contracts: set[str] = field(default_factory=set)

    def trace_missing(self, implemented_contracts: set[str]) -> list[str]:
        """Return constraint names where required contracts have no implementation."""
        orphans: list[str] = []
        for c in self.constraints:
            for contract in c.required_contracts:
                if contract not in implemented_contracts and contract not in self.unimplemented_contracts:
                    orphans.append(f"{c.event_name} → {contract}")
        return orphans


def extract_lifespan_constraints(
    framework_module: Any,
    app_instance: Any,
) -> ConstraintExtractionResult:
    """Extract lifespan (boot/shutdown) constraints from a FastAPI-style application.

    Inspects the app's event handlers and middleware stack to produce a structured
    constraint inventory. Adaptable to other frameworks by changing the inspection
    logic for their registration APIs.

    Args:
        framework_module: The framework module (e.g., fastapi) containing API definitions.
        app_instance: The instantiated application object.

    Returns:
        ConstraintExtractionResult with all identified constraints and missing contracts.
    """
    constraints: list[FrameworkConstraint] = []
    unimplemented: set[str] = set()

    # ── Extract lifespan event handlers ────────────────────────────
    if hasattr(app_instance, "router") and hasattr(app_instance.router, "events"):
        events = app_instance.router.events  # FastAPI-style event registry
        for event in events:
            if event.name == "startup":
                constraints.append(FrameworkConstraint(
                    event_name="lifespan_startup",
                    phase=LifecyclePhase.BOOT,
                    ownership=Ownership.BOTH,
                    description="Application startup sequence — run before serving requests",
                    framework_api="app.router.events[startup]",
                    required_contracts=["startup_handler"],
                ))
            elif event.name == "shutdown":
                constraints.append(FrameworkConstraint(
                    event_name="lifespan_shutdown",
                    phase=LifecyclePhase.SHUTDOWN,
                    ownership=Ownership.BOTH,
                    description="Application teardown — run after last request completes",
                    framework_api="app.router.events[shutdown]",
                    required_contracts=["shutdown_handler"],
                ))

    # ── Extract middleware registrations ───────────────────────────
    if hasattr(app_instance, "user_middleware"):
        for mw in app_instance.user_middleware:
            mw_class = mw.cls
            mw_name = getattr(mw_class, "__name__", str(mw_class))
            constraints.append(FrameworkConstraint(
                event_name=f"middleware_{mw_name}",
                phase=LifecyclePhase.REQUEST,
                ownership=Ownership.MY_APPLICATION if "custom" in mw_name.lower() else Ownership.FRAMEWORK,
                description=f"Middleware '{mw_name}' processes every request",
                framework_api=f"app.add_middleware({mw_name})",
            ))

    # ── Detect unimplemented contracts ─────────────────────────────
    all_required = set()
    for c in constraints:
        all_required.update(c.required_contracts)

    return ConstraintExtractionResult(
        constraints=constraints,
        unimplemented_contracts=all_required - {"startup_handler", "shutdown_handler"},
    )


# ── ❌ BAD: Constraints documented only as prose — no traceability ──────────

def extract_constraints_bad(framework_name: str) -> dict:
    """Extracts framework constraints as a simple list. No typed structure, no traceability."""
    return {
        "framework": framework_name,
        # Prose-only description — impossible to validate or cross-reference
        "notes": "Handles boot and shutdown events. Has middleware stack. Uses dependency injection."
    }


# ── ✅ GOOD: Structured constraints with typed contracts for traceability ───

def extract_constraints_good(
    framework_module: Any,
    app_instance: Any,
) -> ConstraintExtractionResult:
    """Extract structured, machine-readable constraint inventory.

    Every constraint has a name, phase classification, ownership model,
    and list of required domain contracts — enabling full traceability
    from framework requirement through interface declaration to adapter wiring.
    """
    return extract_lifespan_constraints(framework_module, app_instance)
```

### Pattern 2: Adapter Pattern for Framework Extension Points (BAD vs. GOOD)

Adapters bridge the gap between framework-native types and your domain contracts. A well-designed adapter implements a single interface from the domain layer while translating framework-specific types (requests, responses, ORM models, event objects) into domain values. The key rule: adapters are outward-facing only — no inner module knows they exist.

```python
"""Adapter patterns for plugging domain logic into framework extension points."""

from __future__ import annotations

import dataclasses
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


# ─── Domain Contracts (innermost layer — no framework imports) ──────────────

@dataclass(frozen=True)
class UserSession:
    """Domain value object representing an authenticated user session."""
    user_id: str
    roles: tuple[str, ...]
    expires_at: float  # Unix timestamp


@dataclass(frozen=True)
class RequestContext:
    """Domain abstraction of an incoming request — framework-agnostic."""
    method: str
    path: str
    headers: dict[str, str]
    body: bytes
    session: UserSession | None = None


class AuthService(ABC):
    """Abstract authentication service — implemented by infrastructure adapters."""

    @abstractmethod
    def authenticate(self, credentials: dict[str, str]) -> UserSession:
        """Validate credentials and return a session. Raises on failure."""
        ...

    @abstractmethod
    def validate_session(self, token: str) -> UserSession | None:
        """Return session if valid, None if expired or tampered."""
        ...


class AuthorizationService(ABC):
    """Abstract authorization service — checks role-based access."""

    @abstractmethod
    def has_permission(self, session: UserSession, resource: str, action: str) -> bool:
        """Check if the session's roles permit the specified action on a resource."""
        ...


# ─── ❌ BAD: Adapter with no interface contract — tightly coupled to framework ─

class BadAuthMiddleware:
    """Anti-pattern: hard-coded dependency on Flask request objects, no abstraction."""

    def __init__(self, app):  # type: ignore[name-defined]
        self.app = app  # type: ignore[assignment]

    def process_request(self, request):  # type: ignore[arg-type]
        """Fragile: directly accesses Flask internals, no testable interface."""
        from flask import request as flask_req  # Framework leak!

        token = flask_req.headers.get("Authorization")  # type: ignore[union-attr]
        if not token:
            return {"error": "no token"}, 401  # Framework-specific response format!

        # Direct database query — no service layer, no abstraction
        user = db.users.find_one({"token": token})  # type: ignore[name-defined]
        if not user:
            return {"error": "invalid token"}, 403

        return self.app(request)


# ─── ✅ GOOD: Adapter implements domain interface — framework types translated cleanly ─

class FrameworkAuthService(AuthService):
    """Adapter that implements AuthService port using JWT tokens and Redis session store."""

    def __init__(self, jwt_secret: str, redis_client: object, token_ttl: int = 3600) -> None:  # noqa: ANN001
        self._jwt_secret = jwt_secret
        self._redis = redis_client
        self._token_ttl = token_ttl

    def authenticate(self, credentials: dict[str, str]) -> UserSession:
        """Validate username/password against the identity provider and return a session.

        Args:
            credentials: Dict with 'username' and 'password' keys.

        Returns:
            Authenticated UserSession with roles extracted from the identity provider.

        Raises:
            ValueError: If credentials are invalid.
        """
        import jwt  # JWT library — only imported inside adapter, never in domain layer

        username = credentials.get("username", "")
        password = credentials.get("password", "")

        if not username or not password:
            raise ValueError("Username and password are required")

        # Validate against identity provider (simplified — in production, use proper hashing)
        roles = self._fetch_roles_from_identity_provider(username, password)
        session_id = f"sess_{username}_{id(credentials)}"

        session_data = {
            "user_id": username,
            "roles": tuple(roles),
            "expires_at": __import__("time").time() + self._token_ttl,
        }
        # Store session in Redis — adapter handles persistence
        import json
        self._redis.setex(session_id, self._token_ttl, json.dumps(session_data))  # type: ignore[union-attr]

        return UserSession(
            user_id=username,
            roles=tuple(roles),
            expires_at=session_data["expires_at"],
        )

    def validate_session(self, token: str) -> UserSession | None:
        """Validate a session token by looking it up in Redis.

        Args:
            token: The JWT or session token string from the request header.

        Returns:
            UserSession if valid and not expired, None otherwise.
        """
        import json
        import time

        # First try as JWT
        if token.startswith("eyJ"):
            return self._validate_jwt(token)

        # Then try as Redis session ID
        session_bytes = self._redis.get(token)  # type: ignore[union-attr]
        if session_bytes is None:
            return None

        data = json.loads(session_bytes)
        if data["expires_at"] < time.time():
            self._redis.delete(token)  # type: ignore[union-attr]
            return None

        return UserSession(
            user_id=data["user_id"],
            roles=tuple(data["roles"]),
            expires_at=data["expires_at"],
        )

    def _validate_jwt(self, token: str) -> UserSession | None:
        """Validate a JWT token and reconstruct the session."""
        import jwt as pyjwt
        try:
            payload = pyjwt.decode(token, self._jwt_secret, algorithms=["HS256"])  # type: ignore[attr-defined]
            return UserSession(
                user_id=payload["user_id"],
                roles=tuple(payload.get("roles", [])),
                expires_at=payload["exp"],
            )
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):  # type: ignore[attr-defined]
            return None

    @staticmethod
    def _fetch_roles_from_identity_provider(username: str, password: str) -> list[str]:
        """Look up user roles from an identity provider (LDAP, OAuth, database)."""
        # In production: call LDAP server, OAuth2 provider, or query auth database.
        return ["user"]


class AuthMiddlewareAdapter:
    """Framework middleware adapter that wraps AuthService with HTTP request/response handling.

    This adapter translates framework-specific request objects into RequestContext,
    delegates to AuthService for authentication, and uses AuthorizationService for
    permission checks. It is the ONLY module in the application that imports framework types.
    """

    def __init__(self, auth_service: AuthService, authz_service: AuthorizationService) -> None:  # noqa: ANN001
        self._auth = auth_service
        self._authz = authz_service

    def build_context(self, token: str | None) -> RequestContext:
        """Build a framework-agnostic RequestContext from a session token.

        Args:
            token: JWT or session token from the request.

        Returns:
            Fully populated RequestContext with optional authenticated session.
        """
        session = self._auth.validate_session(token) if token else None
        return RequestContext(
            method="GET",  # Set by middleware layer using actual request data
            path="/",      # Set by middleware layer using actual request path
            headers={},    # Set by middleware layer from request.headers
            body=b"",       # Body available but not needed for auth check
            session=session,
        )

    def enforce_permission(self, context: RequestContext, resource: str, action: str) -> bool:
        """Check authorization for a request context against a resource/action pair.

        Args:
            context: The authenticated request context.
            resource: The resource being accessed (e.g., "orders", "users").
            action: The operation being performed (e.g., "create", "read", "update").

        Returns:
            True if the session's roles grant permission, False otherwise.
        """
        if context.session is None:
            return False
        return self._authz.has_permission(context.session, resource, action)
```

### Pattern 3: Interface-First Design with Dependency Injection Wiring

Design components using interfaces first — declare all protocols and abstract classes before writing any implementation. The composition root at application startup wires concrete adapters into the dependency injection container, ensuring every lifecycle hook has a functioning adapter plugged in. This pattern keeps domain code completely isolated from framework concerns while providing clear wiring points for testing with in-memory stubs.

```python
"""Composition root: wires all adapters into the framework's DI container at startup."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


# ─── Domain Interfaces (declared before any implementation) ──────────────────

class UserRepository(Protocol):
    """Contract for user persistence — implemented by infrastructure adapter."""

    def find_by_id(self, user_id: str) -> dict | None: ...
    def create(self, user_data: dict) -> dict: ...


class NotificationService(Protocol):
    """Contract for sending notifications — email, SMS, push."""

    def send_welcome(self, user_id: str, email: str) -> None: ...
    def send_alert(self, user_id: str, message: str) -> None: ...


# ─── Domain Service (depends only on interfaces, never on implementations) ──

@dataclass
class RegistrationService:
    """Orchestrates the user registration workflow.

    Depends only on port abstractions — can be tested with in-memory stubs
    and wired to any persistence/notification backend at runtime.
    """

    users: UserRepository
    notifications: NotificationService
    max_registrations_per_email: int = 1

    def register(self, username: str, email: str, password: str) -> dict:
        """Register a new user with email verification flow.

        Args:
            username: Desired username (unique).
            email: Valid email address for notifications.
            password: User's chosen password (hashed by caller or via adapter).

        Returns:
            Created user record with ID and metadata.

        Raises:
            ValueError: If registration fails validation or email already in use.
        """
        # Validate uniqueness — depends on UserRepository interface
        existing = self.users.find_by_id(email)
        if existing:
            raise ValueError(f"Email {email} is already registered")

        # Create user record
        user_record = self.users.create({
            "username": username,
            "email": email,
            "password_hash": self._hash_password(password),
            "verified": False,
        })

        # Send welcome notification — depends on NotificationService interface
        self.notifications.send_welcome(user_record["id"], email)

        return user_record

    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash a password using bcrypt (imported locally to avoid framework coupling)."""
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()


# ─── ❌ BAD: Wiring done inline with framework-specific imports — not testable ──

def bad_wiring():
    """Anti-pattern: adapters created inline with framework dependencies mixed in."""
    from flask import Flask  # Framework leak throughout!
    from sqlalchemy import create_engine  # DB coupling everywhere!
    import smtplib  # SMTP directly in business logic!

    app = Flask(__name__)
    db = create_engine("postgresql://localhost/mydb")

    class BadRegistrationService:
        def register(self, username, email, password):
            # Direct ORM queries — no abstraction layer
            session = db.Session()  # type: ignore[name-defined]
            existing = session.query(User).filter(User.email == email).first()  # type: ignore[name-defined]
            if existing:
                raise ValueError("Email in use")

            user = User(username=username, email=email)  # type: ignore[name-defined]
            session.add(user)
            session.commit()

            # SMTP directly in service — can't test without a real mail server
            smtp = smtplib.SMTP("localhost")
            smtp.sendmail("noreply@example.com", email, "Welcome!")
            return user


# ─── ✅ GOOD: Composition root with clean DI wiring — fully testable ──────────

class Container:
    """Composition root that wires all concrete implementations for the application.

    This is the single entry point where framework-specific adapters are instantiated
    and injected into domain services. In production, this runs once at startup.
    During testing, swap in stubs or mocks by constructing a different Container.
    """

    def __init__(self) -> None:
        # ── Infrastructure adapters (framework-dependent) ────────────
        self.user_repo = SqlAlchemyUserRepository()  # type: ignore[name-defined]
        self.notification_service = EmailNotificationAdapter()  # type: ignore[name-defined]

        # ── Domain services (framework-agnostic, injected with adapters) ──
        self.registration_service = RegistrationService(
            users=self.user_repo,
            notifications=self.notification_service,
        )

    def for_testing(self) -> Container:
        """Return a test container with in-memory stubs — no framework dependencies."""
        from dataclasses import replace

        test_repo = _InMemoryUserRepository()  # type: ignore[name-defined]
        test_notifier = StubNotificationService()  # type: ignore[name-defined]
        test_service = RegistrationService(
            users=test_repo,
            notifications=test_notifier,
        )

        # Return a new container with swapped implementations
        test_container = Container.__new__(Container)
        test_container.user_repo = test_repo
        test_container.notification_service = test_notifier
        test_container.registration_service = test_service
        return test_container


class SqlAlchemyUserRepository:
    """SQLAlchemy adapter implementing UserRepository — lives in infrastructure layer."""

    def find_by_id(self, identifier: str) -> dict | None:
        # In production: query User table by email or username
        return {"id": "test-1", "username": identifier, "email": identifier}  # Stub for blueprint

    def create(self, user_data: dict) -> dict:
        # In production: INSERT into User table with hashed password
        return {"id": "new-user", **user_data, "verified": False}


class EmailNotificationAdapter:
    """Email adapter implementing NotificationService — infrastructure layer only."""

    def send_welcome(self, user_id: str, email: str) -> None:
        # In production: use sendgrid/smtp to send welcome email
        pass  # Implementation details stay in adapter

    def send_alert(self, user_id: str, message: str) -> None:
        # In production: send alert via chosen channel
        pass


class _InMemoryUserRepository:
    """In-memory UserRepository for fast, deterministic tests."""

    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def find_by_id(self, identifier: str) -> dict | None:
        return self._store.get(identifier)

    def create(self, user_data: dict) -> dict:
        user_id = f"user_{len(self._store)}"
        record = {"id": user_id, **user_data}
        self._store[identifier] = record
        return record


class StubNotificationService:
    """Stub NotificationService for tests — records calls instead of sending emails."""

    def __init__(self) -> None:
        self.sent_messages: list[dict] = []

    def send_welcome(self, user_id: str, email: str) -> None:
        self.sent_messages.append({"type": "welcome", "user_id": user_id, "to": email})

    def send_alert(self, user_id: str, message: str) -> None:
        self.sent_messages.append({"type": "alert", "user_id": user_id, "message": message})
```

### Pattern 4: Framework Requirement Traceability Matrix

Generate a validation matrix that maps every framework requirement to its corresponding design element. This closes the loop between Step 1 (constraint extraction) and Steps 2-5 (design and wiring), ensuring no requirement is orphaned — neither requirements without implementations nor interfaces with no callers.

```python
"""Traceability matrix for validating framework requirement → design element mapping."""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class TraceabilityEntry:
    """One row in the framework requirement traceability matrix.

    Each entry links a framework constraint to its domain contract,
    implementation adapter, and wiring point.
    """

    requirement_id: str           # e.g., "REQ-001"
    requirement_description: str  # Human-readable description of what the framework demands
    phase: str                    # boot | request | shutdown | background
    domain_contract: str | None   # Interface name (Protocol/ABC) implementing this requirement
    adapter_name: str | None      # Adapter class that bridges framework types to the contract
    wiring_point: str | None      # Where it gets registered in the framework (API call, decorator)
    test_strategy: str | None     # How to verify the implementation works end-to-end

    @property
    def is_complete(self) -> bool:
        return all(v is not None for v in (self.domain_contract, self.adapter_name, self.wiring_point))


@dataclass
class TraceabilityMatrix:
    """Complete mapping from framework requirements to design elements.

    Provides validation queries to detect orphans and gaps.
    """

    entries: list[TraceabilityEntry] = field(default_factory=list)

    def add_entry(self, entry: TraceabilityEntry) -> None:
        self.entries.append(entry)

    def find_orphan_requirements(self) -> list[str]:
        """Return requirement IDs with no corresponding design element."""
        orphans: list[str] = []
        for entry in self.entries:
            if not entry.is_complete:
                orphans.append(f"{entry.requirement_id}: '{entry.requirement_description}' — "
                              f"missing contracts={not entry.domain_contract}, "
                              f"adapters={not entry.adapter_name}, "
                              f"wiring={not entry.wiring_point}")
        return orphans

    def find_orphan_contracts(self, declared_contracts: set[str]) -> list[str]:
        """Return contract names that no adapter implements."""
        implemented = {e.domain_contract for e in self.entries if e.domain_contract}
        unused = declared_contracts - implemented
        return list(unused)

    def find_orphan_adapters(self, registered_hooks: set[str]) -> list[str]:
        """Return adapter names that no framework hook calls."""
        wired = {e.wiring_point for e in self.entries if e.wiring_point}
        orphaned = registered_hooks - wired
        return list(orphaned)

    def report(self) -> str:
        """Generate a human-readable validation report."""
        lines: list[str] = []
        orphans = self.find_orphan_requirements()
        status = "✅ CLOSED" if not orphans else f"⚠️  {len(orphans)} orphan(s)"

        lines.append(f"Framework Requirement Traceability Matrix — {status}")
        lines.append("=" * 72)

        for entry in self.entries:
            marker = "✓" if entry.is_complete else "✗"
            lines.append(f"  [{marker}] {entry.requirement_id}: {entry.requirement_description}")
            lines.append(f"       Contract: {entry.domain_contract or 'UNDEFINED'}")
            lines.append(f"       Adapter:  {entry.adapter_name or 'UNDEFINED'}")
            lines.append(f"       Wiring:   {entry.wiring_point or 'UNDEFINED'}")
            lines.append("")

        return "\n".join(lines)


# ── Example: Building a traceability matrix for a FastAPI application ────────

def build_traceability_matrix() -> TraceabilityMatrix:
    """Build the complete traceability matrix for a FastAPI-based API gateway.

    Maps each framework requirement (lifespan events, middleware, dependency injection)
    to domain contracts, adapters, and wiring points. This matrix is the final validation
    step before implementation begins — every entry must be complete before any code is written.
    """
    matrix = TraceabilityMatrix()

    matrix.add_entry(TraceabilityEntry(
        requirement_id="REQ-001",
        requirement_description="FastAPI lifespan startup event — initialize database connections",
        phase="boot",
        domain_contract="DatabaseConnectionFactory",
        adapter_name="AsyncPgDatabaseConnectionAdapter",
        wiring_point="app.on_event('startup') / @asynccontextmanager(lifespan)",
        test_strategy="Integration test: start app, verify connection pool has active connections, shut down app cleanly",
    ))

    matrix.add_entry(TraceabilityEntry(
        requirement_id="REQ-002",
        requirement_description="FastAPI lifespan shutdown event — close all database connections",
        phase="shutdown",
        domain_contract="DatabaseConnectionFactory",
        adapter_name="AsyncPgDatabaseConnectionAdapter",
        wiring_point="app.on_event('shutdown') / @asynccontextmanager(lifespan)",
        test_strategy="Integration test: shut down app, verify all pooled connections are closed, no resource leaks",
    ))

    matrix.add_entry(TraceabilityEntry(
        requirement_id="REQ-003",
        requirement_description="Request-level authentication — validate JWT on every protected endpoint",
        phase="request",
        domain_contract="AuthService",
        adapter_name="FastAPITokenAuthMiddleware",
        wiring_point="@app.middleware('http') + get_current_user() dependency",
        test_strategy="Unit test: pass invalid/expired JWT → 401; valid JWT with sufficient roles → 200",
    ))

    matrix.add_entry(TraceabilityEntry(
        requirement_id="REQ-004",
        requirement_description="Request-level authorization — check roles against endpoint permissions",
        phase="request",
        domain_contract="AuthorizationService",
        adapter_name="FastAPI RBAC Dependency",
        wiring_point="@app.get('/admin', dependencies=[Depends(require_role('admin'))])",
        test_strategy="Unit test: user with 'user' role accessing '/admin' → 403; user with 'admin' role → 200",
    ))

    matrix.add_entry(TraceabilityEntry(
        requirement_id="REQ-005",
        requirement_description="Structured logging — log every request with correlation ID",
        phase="request",
        domain_contract="LoggingService",
        adapter_name="StructLogLoggingAdapter",
        wiring_point="@app.middleware('http') + structlog.configure()",
        test_strategy="Integration test: send request, verify log output contains correlation_id and status_code",
    ))

    return matrix


# ── ✅ GOOD: Validation runs before implementation begins ─────────────────────

def validate_design_is_complete(matrix: TraceabilityMatrix) -> bool:
    """Return True only if every framework requirement has a complete design mapping.

    This is the gate check — do not proceed to implementation until this returns True.
    Any False result means the architect must go back and fill in missing contracts,
    adapters, or wiring points before writing code.
    """
    orphans = matrix.find_orphan_requirements()
    if orphans:
        print("❌ Cannot proceed — orphan requirements detected:")
        for o in orphans:
            print(f"   {o}")
        return False

    print("✅ Design is complete — all framework requirements have corresponding design elements.")
    return True


# ── ❌ BAD: No traceability — requirements exist only in conversation ─────────

def bad_validation() -> None:
    """Anti-pattern: assumes the design is complete without systematic verification."""
    print("Design looks good, let's start coding!")  # No verification, no safety net
```

---

## Constraints

### MUST DO
- **Extract framework constraints before designing any module** — read the official documentation first, then inspect source code for undocumented hooks. Every lifecycle event (boot, request, shutdown, background) must be catalogued with its invocation order and parameter signature before declaring a single interface.
- **Declare interfaces in the domain layer, implementations in adapters** — all `Protocol` and ABC definitions must live in modules that have zero imports from the framework package. If a Protocol references a framework-specific type (e.g., `starlette.requests.Request`), move it to the adapter layer and redesign as a domain value object.
- **Build composition root at the application boundary** — wire all concrete adapters into the DI container in a single entry point file (`main.py`, `app.py`, or `__init__.py`). This file is the only location where framework-specific adapter instantiations occur. All inner modules receive dependencies via constructor injection.
- **Generate the traceability matrix as a validation gate** — every framework requirement from your constraint inventory must map to exactly one domain contract, one adapter implementation, and one wiring point. Zero orphans on any side before writing implementation code. Use `TraceabilityMatrix` (Pattern 4) to automate this check.
- **Design adapters with explicit type marshalling** — every adapter must document how framework-native types are converted to domain types at the boundary and back again. No raw framework objects should escape the adapter into application logic.

### MUST NOT DO
- **Let framework types leak into domain modules** — if a domain class has a parameter typed as `Request`, `HttpResponse`, `QuerySet`, or any framework-specific type, refactor immediately. Domain code must be fully testable without starting the web server or connecting to the database.
- **Create adapters that implement multiple unrelated frameworks** — each adapter class corresponds to one extension point in one framework. An adapter should not contain logic for both Flask middleware and Django signals — duplicate as needed with separate adapter classes following a shared domain interface.
- **Skip the traceability matrix validation** — proceeding to implementation with orphan requirements (no design element) or orphan interfaces (no adapter) leads to untestable code, missing functionality, and late-stage refactoring that breaks existing wiring.
- **Hardcode adapter configurations inside adapters** — connection strings, timeout values, retry counts, and feature flags must come from the composition root's configuration injection, not from constants inside adapter classes. Adapters are infrastructure plumbing; configuration belongs at the boundary.
- **Use global singleton state for adapters or services** — dependency injection via constructor parameters is the only supported wiring pattern. Global state (`current_app`, thread-local storage, module-level variables) prevents testing and creates hidden coupling between components.

---

## Output Template

When applying this skill to produce a framework design blueprint, the output must contain:

1. **Constraint Inventory** — Table of all extracted framework lifecycle events with columns: `event_name | phase | ownership | framework_api`. Every row must trace to a documented framework hook or source-code discovery.

2. **Interface Contract Specifications** — Typed Protocol or ABC definitions for every domain contract derived from the constraint inventory. Include docstrings explaining what each method does, its parameters, return types, and exceptions raised.

3. **Adapter Registry** — List of adapter classes mapping to each framework extension point. For each adapter: name, implemented interface, framework type it translates, and test strategy for verifying marshalling correctness.

4. **Module Tree with Layer Annotations** — ASCII directory structure showing which files live in the domain layer, application layer, infrastructure/adapter layer, and composition root. Annotate imports between layers to verify dependency direction (outer → inner, never reverse).

5. **Wiring Diagram** — Text diagram showing how adapters plug into framework hooks. Include: `framework_hook → adapter → interface → domain_service` chains with concrete file paths and function names at each node.

6. **Traceability Matrix Report** — Full matrix output from the validation system, listing every requirement with its contract, adapter, wiring point, and completion status (✓ or ✗). Must report zero orphans before implementation proceeds.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-architecture` | Provides broader architectural pattern selection (layered, hexagonal, event-driven) that informs framework-level design decisions and module boundary strategy. |
| `modular-design` | Complements this skill by guiding the decomposition of individual modules once framework boundaries are established — focuses on cohesion, coupling, and module APIs within your domain layer. |
| `error-handling` | Ensures error handling strategies align with framework conventions — defines how errors propagate from adapters through domain services to the framework's response layer. |
| `fastapi-patterns` | Framework-specific implementation guidance for FastAPI applications — use this alongside framework-design when building FastAPI backends to get concrete patterns for routing, dependency injection, and lifecycle management. |

---

> 📖 skill(local cache): software-architecture, modular-design, error-handling, fastapi-patterns