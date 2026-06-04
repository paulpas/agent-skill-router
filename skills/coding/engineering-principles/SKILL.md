---
name: engineering-principles
description: Enforces core software engineering principles (SOLID, DRY, KISS, separation
  of concerns) to produce clean, maintainable, and scalable code architecture.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: engineering principles, SOLID, DRY, KISS, separation of concerns, code
    architecture, defensive programming, clean code
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
  related-skills: code-review, refactoring, test-driven-development
---
# Software Engineering Principles

This skill makes the model evaluate and produce code that adheres to foundational engineering principles. When active, it enforces Single Responsibility, DRY, KISS, Separation of Concerns, and Composition Over Inheritance across every implementation, review, or refactor — ensuring architecture decisions are intentional, modules have clear boundaries, and code reads like a well-organized system rather than an accident of convenience.

## TL;DR Checklist

- [ ] Every class has exactly one reason to change — verify by asking "what else could break this?"
- [ ] No duplicated logic exists in more than two places — extract shared behavior into a single function or module
- [ ] The simplest correct solution was chosen before reaching for abstractions, generics, or design patterns
- [ ] Each module owns one concern — data access doesn't contain business rules, UI code doesn't contain validation logic
- [ ] Interfaces use composition over deep inheritance hierarchies — favor `has-a` relationships over `is-a` chains longer than two levels
- [ ] All functions have typed signatures and docstrings describing inputs, outputs, and side effects
- [ ] Guard clauses handle edge cases at function entry before any positive logic begins

---

## When to Use

Use this skill when:

- Writing a new module or class and you need to decide how to structure responsibilities
- Reviewing existing code that feels tangled, overly nested, or hard to modify without breaking something else
- A pull request contains duplicated logic blocks, god classes with dozens of methods, or deeply inherited type hierarchies
- Onboarding a new developer and you want to establish consistent architectural expectations across the team
- Refactoring a legacy codebase where concerns are mixed (e.g., database queries interwoven with validation)
- Designing an API surface and you need to ensure each endpoint handler does one thing well

---

## When NOT to Use

Avoid this skill for:

- One-off scripts, throwaway prototypes, or hackathon code where maintainability is not a concern — use quick-and-dirty instead
- Performance-critical inner loops where abstraction overhead matters more than clean boundaries — use raw imperative code with a comment noting the tradeoff
- Learning exercises focused on mastering a specific pattern in isolation (e.g., studying decorator patterns) — use a pattern-specific skill instead
- Writing tests or test fixtures — these follow different conventions where duplication and tight coupling are sometimes acceptable for clarity

---

## Core Workflow

1. **Identify Responsibilities** — For each component under consideration, list every thing it does. Group related actions into logical units of work. **Checkpoint:** Each responsibility should be expressible as a single verb phrase (e.g., "validates input," "persists data," "sends notification"). If a component has three or more verb phrases, it needs splitting.

2. **Extract and Bound** — Move each identified responsibility into its own class, module, or function. Ensure the extracted unit has no dependencies on unrelated concerns. Apply guard clauses at every entry point to reject invalid inputs before processing begins. **Checkpoint:** The original component should be reduced to a coordinator that composes the extracted units, not a mini-framework containing residual logic.

3. **Eliminate Duplication** — Search for identical or near-identical logic blocks across the codebase. Apply Extract Method for repeated code within a single function, and Extract Class/Module for logic shared across multiple components. If the duplicated block appears in exactly two places, weigh whether extraction is worth it — sometimes duplication is acceptable; if it appears three or more times, always extract. **Checkpoint:** Running `git diff` against the original should show consolidated logic in one location replacing scattered copies.

4. **Simplify Before Abstracting** — For every abstraction (interface, base class, factory, generic type), ask: "Will this reduce complexity for a developer reading the code three months from now?" If the answer is no, remove the abstraction. Only introduce a pattern when there are at least two concrete use cases that would benefit. **Checkpoint:** The production code should be readable by a mid-level engineer without requiring them to trace through four layers of indirection to understand the data flow.

5. **Validate Structure** — Walk through the component from its public API downward. At each level, verify that callers only depend on abstractions they actually need (Interface Segregation), that dependencies are injected rather than hardcoded (Dependency Inversion), and that mutable state is minimized and localized. **Checkpoint:** A new team member should be able to add a third implementation of an interface by copying one existing implementation and changing one configuration value — no other code paths should need modification.

---

## Implementation Patterns

### Principle 1: Single Responsibility Principle (SRP)

A class or function should have exactly one reason to change. If you can describe more than one motive for modifying a component, it violates SRP.

#### ❌ BAD — God Class Handling Multiple Concerns

```python
class UserService:
    """Handles user management, validation, persistence, and email notifications."""

    def create_user(self, data: dict) -> dict:
        # Validation — if validation logic changes, this method changes
        if not data.get("email"):
            raise ValueError("Email is required")
        if "@" not in data["email"]:
            raise ValueError("Invalid email format")
        if len(data.get("password", "")) < 8:
            raise ValueError("Password must be at least 8 characters")

        # Persistence — if database schema changes, this method changes
        conn = self._get_db_connection()  # Direct DB coupling
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (data["email"], hash_password(data["password"]), datetime.now())
        )
        conn.commit()
        user_id = cursor.lastrowid

        # Notification — if notification service changes, this method changes
        self._send_welcome_email(data["email"])  # Side effect buried in creation logic

        return {"user_id": user_id, "status": "created"}

    def _get_db_connection(self) -> Any: ...  # Internal DB detail leaks into business logic
    def _send_welcome_email(self, email: str) -> None: ...  # Notification concern mixed in
```

**Why this fails:** Adding a new validation rule changes the method. Switching from SMTP to an email API changes the method. Changing the database driver changes the method. Three reasons to change = three responsibilities crammed together.

#### ✅ GOOD — Responsibilities Separated Into Focused Units

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class CreateUserRequest:
    """Immutable request payload for user creation."""
    email: str
    password: str
    display_name: str = ""


@dataclass
class UserCreatedEvent:
    """Domain event raised when a user is successfully created."""
    user_id: int
    email: str
    created_at: datetime


class UserValidator:
    """Validates CreateUserRequest payloads. Changes only when validation rules change."""

    MIN_PASSWORD_LENGTH: int = 8

    def validate(self, request: CreateUserRequest) -> None:
        """Validate all fields; raises ValueError with descriptive message on failure."""
        if not request.email or "@" not in request.email:
            raise ValueError(f"Invalid email address: {request.email!r}")
        if len(request.password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {self.MIN_PASSWORD_LENGTH} characters"
            )
        if not request.display_name.strip():
            raise ValueError("Display name is required")


class UserRepository:
    """Persists User entities to the database. Changes only when storage details change."""

    def __init__(self, connection_string: str) -> None:
        self._connection_string = connection_string

    def create(self, request: CreateUserRequest) -> UserCreatedEvent:
        """Insert a new user record and return the created event. Pure persistence logic."""
        # Implementation uses connection_string → DB driver coupling stays isolated here
        hashed_password = _hash_password(request.password)  # Local helper only
        now = datetime.now()

        # ... database insert using self._connection_string ...

        return UserCreatedEvent(
            user_id=123,  # Would be actual lastrowid from DB
            email=request.email,
            created_at=now,
        )


class EmailNotifier:
    """Sends welcome emails. Changes only when notification logic or provider changes."""

    def __init__(self, smtp_host: str, smtp_port: int = 587) -> None:
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port

    def send_welcome(self, recipient_email: str, display_name: str) -> None:
        """Send a welcome email via SMTP. All notification details live here."""
        # ... SMTP connection and message construction ...
        pass


class UserService:
    """Coordinates user creation by composing focused units. Changes only when the workflow changes."""

    def __init__(
        self,
        validator: UserValidator,
        repository: UserRepository,
        notifier: EmailNotifier,
    ) -> None:
        self._validator = validator
        self._repository = repository
        self._notifier = notifier

    def create_user(self, request: CreateUserRequest) -> UserCreatedEvent:
        """Create a new user through the standard workflow. Single orchestration point."""
        # Step 1: Validate — if rules change, only Validator changes
        self._validator.validate(request)

        # Step 2: Persist — if storage changes, only Repository changes
        event = self._repository.create(request)

        # Step 3: Notify — if email provider changes, only Notifier changes
        self._notifier.send_welcome(request.email, request.display_name)

        return event
```

**Why this works:** Each class has exactly one reason to change. To add a new validation rule, you modify `UserValidator` alone. To switch from SMTP to SendGrid, you modify `EmailNotifier` alone. `UserService` is a thin coordinator — if the workflow changes (e.g., add SMS notification), you add a new dependency without touching the existing units.

---

### Principle 2: DRY — Don't Repeat Yourself

Every piece of knowledge must have a single, unambiguous, authoritative representation within the system. Duplication breeds inconsistency: change logic in one place and forget another.

#### ❌ BAD — Scattered Duplicate Logic

```python
def calculate_order_total(items: list[dict]) -> float:
    """Calculate total for a regular order."""
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    tax_rate = 0.08
    tax = subtotal * tax_rate
    discount = 0.0  # No discount for regular orders
    return round(subtotal + tax - discount, 2)


def calculate_subscription_total(items: list[dict]) -> float:
    """Calculate total for a subscription — duplicated logic."""
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    tax_rate = 0.08  # Same rate, but if it changes, this must be updated too
    tax = subtotal * tax_rate
    discount = subtotal * 0.15  # Subscribers get 15% off — but discount calc is inline
    return round(subtotal + tax - discount, 2)


def calculate_wholesale_total(items: list[dict]) -> float:
    """Calculate total for wholesale — more duplicated logic."""
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    tax_rate = 0.08  # Same hardcoded value again
    tax = subtotal * tax_rate
    discount = subtotal * 0.25  # Wholesale gets 25% — another inline calc
    return round(subtotal + tax - discount, 2)


# If tax_rate changes to 0.10, all three functions must be updated.
# If it's missed in one place, billing is wrong and bugs are hard to find.
```

#### ✅ GOOD — Single Source of Truth for Shared Calculations

```python
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class DiscountType(Enum):
    """Supported discount categories."""
    NONE = 0
    PERCENTAGE = 1
    FLAT = 2


@dataclass(frozen=True)
class OrderCalculation:
    """Immutable result of order calculation — single output shape everywhere."""
    subtotal: float
    tax: float
    discount_amount: float
    total: float

    @property
    def savings(self) -> float:
        """How much the customer saved relative to undiscounted price."""
        return self.discount_amount


class TaxProvider(Protocol):
    """Abstraction over tax rate logic — enables testing and environment switching."""

    def get_rate(self, region: str) -> float: ...


class DefaultTaxProvider:
    """Default tax provider with configurable rates by region."""

    RATES: dict[str, float] = {
        "default": 0.08,
        "ca": 0.0725,
        "ny": 0.08,
        "tx": 0.0625,
    }

    def get_rate(self, region: str) -> float:
        """Return the tax rate for a given region; falls back to default."""
        return self.RATES.get(region, self.RATES["default"])


def calculate_subtotal(items: list[dict]) -> float:
    """Sum of price * quantity across all items. Single entry point for this calculation."""
    return sum(item["price"] * item["quantity"] for item in items)


def calculate_discount(
    subtotal: float,
    discount_type: DiscountType = DiscountType.NONE,
    rate: float = 0.0,
    flat_amount: float = 0.0,
) -> float:
    """Apply a discount based on type. No if/else sprawl — dispatch by enum."""
    match discount_type:
        case DiscountType.PERCENTAGE:
            return round(subtotal * rate, 2)
        case DiscountType.FLAT:
            return min(flat_amount, subtotal)  # Don't discount more than the order
        case DiscountType.NONE:
            return 0.0


def calculate_order(
    items: list[dict],
    region: str = "default",
    tax_provider: TaxProvider | None = None,
    discount_type: DiscountType = DiscountType.NONE,
    discount_rate: float = 0.0,
    discount_flat: float = 0.0,
) -> OrderCalculation:
    """
    Calculate a complete order total.

    All callers use this single function — no duplicated subtotal/tax/discount logic anywhere.
    Changing tax rates or discount formulas requires editing only this function and its helpers.
    """
    # Resolve tax provider (supports dependency injection for testing)
    provider = tax_provider or DefaultTaxProvider()
    tax_rate = provider.get_rate(region)

    # Calculate each component in isolation
    subtotal = calculate_subtotal(items)
    discount_amount = calculate_discount(
        subtotal, discount_type, discount_rate, discount_flat
    )
    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax - discount_amount, 2)

    return OrderCalculation(
        subtotal=subtotal,
        tax=tax,
        discount_amount=discount_amount,
        total=total,
    )


# Usage — consistent across regular orders, subscriptions, and wholesale:
order_total = calculate_order(
    items=[{"price": 29.99, "quantity": 2}, {"price": 14.50, "quantity": 1}],
    region="ca",
    discount_type=DiscountType.PERCENTAGE,
    discount_rate=0.15,
)

# If tax changes to 0.10, only DefaultTaxProvider.RATES needs updating.
```

**Why this works:** The calculation logic exists in exactly one place. Adding a new order type means passing different parameters — not copying and pasting three lines of subtotal/tax/discount code into a new function. The `OrderCalculation` dataclass provides a consistent output shape that every caller understands.

---

### Principle 3: KISS — Keep It Simple, Stupid

The simplest solution that correctly solves the problem is always preferable to a complex one. Complexity should be earned by evidence, not anticipation. Over-engineering hides bugs in indirection.

#### ❌ BAD — Unnecessary Abstraction Over Simple Logic

```python
from abc import ABC, abstractmethod
from typing import Any


class Formatter(ABC):
    """Abstract base class for formatters."""

    @abstractmethod
    def format(self, data: dict) -> str: ...


class UpperFormatter(Formatter):
    """Uppercase formatter — but we only need this ONE place."""

    def format(self, data: dict) -> str:
        return str(data).upper()


class LowerFormatter(Formatter):
    """Lowercase formatter — same, one usage."""

    def format(self, data: dict) -> str:
        return str(data).lower()


class TitleFormatter(Formatter):
    """Title case formatter."""

    def format(self, data: dict) -> str:
        return str(data).title()


class FormatterFactory:
    """Factory that creates formatters based on a string key."""

    _registry: dict[str, type[Formatter]] = {}

    @classmethod
    def register(cls, name: str, formatter_class: type[Formatter]) -> None:
        cls._registry[name] = formatter_class

    @classmethod
    def create(cls, name: str) -> Formatter:
        if name not in cls._registry:
            raise KeyError(f"Unknown formatter: {name}")
        return cls._registry[name]()


# Registration boilerplate — only needed because of the factory pattern
FormatterFactory.register("upper", UpperFormatter)
FormatterFactory.register("lower", LowerFormatter)
FormatterFactory.register("title", TitleFormatter)


def process_name(raw_name: str, mode: str = "upper") -> str:
    """Process a name string — but uses factory + abstract class for what could be one if statement."""
    formatter = FormatterFactory.create(mode)  # 2 layers of indirection
    return formatter.format({"name": raw_name})  # Wrapping simple string in dict


# To change how "upper" works, you must:
# 1. Find UpperFormatter class
# 2. Modify its format method
# 3. Trust that the factory registry hasn't been corrupted somewhere else
```

#### ✅ GOOD — Simple Direct Function for Simple Problem

```python
def normalize_name(raw_name: str, mode: str = "upper") -> str:
    """
    Normalize a name string using simple case transformation.

    This is a single function handling three modes. No factory, no inheritance,
    no registration boilerplate. If you need to understand how "title" works,
    read this one function. That's it.

    Args:
        raw_name: The input string to normalize.
        mode: One of 'upper', 'lower', or 'title'. Defaults to 'upper'.

    Returns:
        The normalized string in the requested case.

    Raises:
        ValueError: If mode is not one of the supported values.
    """
    # Guard clause for invalid input — fail fast, clear error
    if not raw_name:
        return ""

    match mode:
        case "upper":
            return raw_name.upper()
        case "lower":
            return raw_name.lower()
        case "title":
            return raw_name.title()
        case _:
            raise ValueError(
                f"Unsupported normalization mode: {mode!r}. "
                f"Expected one of: upper, lower, title."
            )


# Usage — direct and obvious. No factory, no interfaces to trace.
name = normalize_name("john doe", mode="title")  # → "John Doe"
```

**Why this works:** The problem was simple (apply a case transformation). A simple solution (one function with pattern matching) is correct and maintainable. The original approach added five classes, an abstract base, a factory, and registry management to solve what could be done in six lines. When the only caller needs "upper," you had to create three other formatter classes "just in case." KISS isn't about avoiding design patterns entirely — it's about not using them until the problem genuinely demands them.

---

### Principle 4: Separation of Concerns

Distinct concerns should be isolated in distinct modules, functions, or classes. Data access logic must not leak into business rules. Presentation logic must not leak into domain models. Each layer communicates through stable contracts and knows nothing about layers above it.

#### ❌ BAD — Concerns Mixed Across Layers

```python
class UserController:
    """MIXED: HTTP handling, validation, business logic, and database access in one class."""

    def __init__(self) -> None:
        self.conn = sqlite3.connect("app.db")  # DB connection created on demand

    def get_user(self, request: dict) -> dict:
        """HTTP handler that contains SQL queries and business logic."""
        user_id = request["id"]

        # SQL query directly in the HTTP handler
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))  # SQL leaks up
        row = cursor.fetchone()

        if not row:
            return {"error": "User not found"}  # Error format mixed with data shape

        # Business logic in the HTTP handler — why is a controller doing auth checks?
        if row["role"] != "admin" and request.get("viewing_admin_panel"):
            return {"error": "Insufficient permissions"}  # Authorization mixed in

        # Formatting response here — presentation concern belongs to serializer/view
        return {
            "id": row["id"],
            "email": row["email"],
            "display_name": f"{row['first_name']} {row['last_name']}",  # Formatting mixed in
            "created_at": row["created_at"].strftime("%Y-%m-%d"),  # Date formatting here
        }

    def create_user(self, request: dict) -> dict:
        """Another method mixing validation, persistence, and response."""
        # Validation in the controller — should be a dedicated validator
        if not request.get("email"):
            return {"error": "Email required"}  # Same error format as above

        if not request.get("password") or len(request["password"]) < 8:
            return {"error": "Invalid password"}  # Validation mixed with response shaping

        # Hashing password in the controller — should be a domain service
        password_hash = hash_password(request["password"])  # Where is this defined?

        # Insert in the controller — persistence belongs to repository
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (request["email"], password_hash),
        )
        self.conn.commit()

        return {"id": cursor.lastrowid}  # Different response shape than errors — inconsistency


class AdminService:
    """Another class that also has direct DB access — duplication and coupling."""

    def get_all_users(self) -> list[dict]:
        conn = sqlite3.connect("app.db")  # Another direct connection!
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")  # SQL query again, same pattern
        return cursor.fetchall()  # Returns raw rows — caller must format
```

**Why this fails:** The controller mixes HTTP concerns with business logic and data access. Two classes both create direct DB connections. Error responses have inconsistent shapes. Formatting happens at the layer that knows nothing about presentation conventions. Changing the database means changing every method in these classes. Adding a new API version requires duplicating or heavily modifying existing code.

#### ✅ GOOD — Concerns Separated Into Distinct Layers

```python
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Protocol


# === DOMAIN LAYER (no framework dependencies) ===

@dataclass
class User:
    """Domain entity representing a user. Pure data with no I/O knowledge."""
    id: int
    email: str
    password_hash: str  # Never stores raw passwords
    first_name: str
    last_name: str
    role: str = "user"
    created_at: datetime = datetime.min

    @property
    def display_name(self) -> str:
        """Computed property — formatting stays with the entity, not the controller."""
        return f"{self.first_name} {self.last_name}"


class UserRepository(Protocol):
    """Repository interface — domain layer depends on abstraction, not implementation."""

    def get_by_id(self, user_id: int) -> User | None: ...
    def create(self, user: User) -> int: ...
    def list_all(self) -> list[User]: ...


# === APPLICATION LAYER (orchestrates use cases) ===

class CreateUserCommand:
    """Use case for creating a user. Coordinates validation and persistence."""

    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    def execute(self, email: str, password: str, first_name: str, last_name: str) -> int:
        """Create a new user through the canonical flow. Returns the new user ID."""
        # Validation (guard clause — fail fast on invalid input)
        if not email or "@" not in email:
            raise InvalidInputError("Valid email is required")
        if len(password) < 8:
            raise InvalidInputError("Password must be at least 8 characters")

        # Domain entity creation — business rules live here, not in the controller
        user = User(
            id=0,  # Will be set by repository
            email=email.lower().strip(),  # Canonical normalization
            password_hash=_hash_password(password),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
        )

        # Persistence delegated to repository — implementation unknown to this layer
        return self._repository.create(user)


class UserQueryService:
    """Read-side use cases for user data."""

    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    def get_user(self, user_id: int) -> User | None:
        """Retrieve a user by ID. Returns None if not found — no exception for missing entities."""
        return self._repository.get_by_id(user_id)

    def list_users(self) -> list[User]:
        """List all users. No filtering or formatting here — that's a presentation concern."""
        return self._repository.list_all()


# === INFRASTRUCTURE LAYER (implements protocols, handles I/O) ===

class SqliteUserRepository:
    """Concrete repository implementing UserRepository with SQLite persistence."""

    def __init__(self, connection_string: str) -> None:
        self._connection_string = connection_string

    def get_by_id(self, user_id: int) -> User | None:
        """Fetch a single user by ID. SQL lives here — domain layer knows nothing about it."""
        # ... sqlite3 query with parameterized statement ...
        return User(  # Maps DB row to domain entity
            id=1, email="john@example.com", password_hash="$2b$...",
            first_name="John", last_name="Doe", created_at=datetime.now(),
        )

    def create(self, user: User) -> int:
        """Insert a new user. Returns the generated ID."""
        # ... INSERT query using self._connection_string ...
        return 123

    def list_all(self) -> list[User]:
        """Fetch all users as domain entities."""
        # ... SELECT query ...
        return [User(
            id=1, email="john@example.com", password_hash="$2b$...",
            first_name="John", last_name="Doe",
        )]


# === PRESENTATION LAYER (HTTP handlers — thin, delegates to application layer) ===

class UserHttpHandler:
    """Thin HTTP handler. No business logic, no SQL, no validation. Pure routing."""

    def __init__(self, command: CreateUserCommand, query: UserQueryService) -> None:
        self._command = command
        self._query = query

    def get_user(self, request: dict) -> dict:
        """Handle GET /users/{id} — delegates all logic to the query service."""
        user_id = int(request["id"])  # Only type coercion belongs here
        user = self._query.get_user(user_id)

        if not user:
            return {"status": 404, "error": "User not found"}

        return {"status": 200, "data": asdict(user)}  # Serialization at the edge

    def create_user(self, request: dict) -> dict:
        """Handle POST /users — delegates validation and persistence."""
        try:
            user_id = self._command.execute(
                email=request["email"],
                password=request["password"],
                first_name=request["first_name"],
                last_name=request["last_name"],
            )
            return {"status": 201, "data": {"id": user_id}}
        except InvalidInputError as exc:
            return {"status": 400, "error": str(exc)}


# Custom exception — not mixing built-in exceptions with domain errors
class InvalidInputError(Exception):
    """Domain error for invalid user input. Separated from HTTP status codes."""
    pass
```

**Why this works:** Each layer has a single concern and communicates through stable contracts. The domain layer (`User`, `UserRepository`) knows nothing about HTTP, SQL, or frameworks. The infrastructure layer (`SqliteUserRepository`) is a concrete implementation that can be swapped for PostgreSQL, Redis, or an in-memory version for tests. The presentation layer (`UserHttpHandler`) is a thin router — if you need to add a GraphQL endpoint, you write a new handler using the same application-layer services.

---

### Principle 5: Composition Over Inheritance

Prefer composing objects from small, focused units over building deep inheritance hierarchies. Inheritance couples subclasses to their parent's implementation details; composition only couples through explicit interfaces. A class should `has-a` relationship with its collaborators rather than `is-a` relationship forcing it into rigid type hierarchies.

#### ❌ BAD — Deep and Brittle Inheritance Hierarchy

```python
class Shape:
    """Base shape — but adds methods that don't make sense for all subclasses."""

    def __init__(self, color: str = "black") -> None:
        self.color = color  # Not all shapes have color (e.g., mathematical objects)

    def area(self) -> float:
        """Must be implemented by subclasses — but what if they share no common shape logic?"""
        raise NotImplementedError

    def perimeter(self) -> float:
        """Same issue — not all 'shapes' have a perimeter."""
        raise NotImplementedError

    def draw(self) -> None:
        """Concrete implementation that assumes canvas rendering. Breaks in CLI environments."""
        print(f"Drawing {self.__class__.__name__} in {self.color}")  # Hardcoded output


class Circle(Shape):
    """Circle inherits everything from Shape, even things it doesn't need."""

    def __init__(self, radius: float, color: str = "black") -> None:  # Must pass color up
        super().__init__(color=color)  # Forced to accept a parameter it may ignore
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius


class Rectangle(Shape):
    """Rectangle — another subclass forced into the Shape hierarchy."""

    def __init__(self, width: float, height: float, color: str = "black") -> None:
        super().__init__(color=color)
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

    def perimeter(self) -> float:
        return 2 * (self.width + self.height)


# The problem compounds with multiple inheritance scenarios:
class FilledShape(Shape):
    """Trying to add 'filled' vs 'outline' — but this creates a diamond pattern."""

    def __init__(self, color: str, filled: bool = True) -> None:
        super().__init__(color=color)  # Which super? Shape or Circle? Ambiguity!
        self.filled = filled


# If you later want a shape that has an outline but no fill AND is animated,
# you'd need another class. The hierarchy explodes combinatorially.
# There's no way to reuse just the 'draw' behavior independently of Shape.
```

#### ✅ GOOD — Composable Behaviors Through Explicit Interfaces

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Protocol


# === BEHAVIOR PROTOCOLS (small, focused, independently composable) ===

class AreaCalculation(Protocol):
    """Protocol for anything that can calculate its area."""

    def calculate_area(self) -> float: ...


class PerimeterCalculation(Protocol):
    """Protocol for anything that can calculate its perimeter."""

    def calculate_perimeter(self) -> float: ...


class Renderable(Protocol):
    """Protocol for objects that know how to render themselves in a specific context."""

    def render(self, context: str) -> str: ...


# === BEHAVIOR IMPLEMENTATIONS (mix-in style, but using explicit composition) ===

class CircleGeometry:
    """Circle area and perimeter — standalone behavior, no base class required."""

    def __init__(self, radius: float) -> None:
        if radius <= 0:
            raise ValueError("Radius must be positive")
        self._radius = radius

    def calculate_area(self) -> float:
        """Area of a circle: πr²."""
        return 3.141592653589793 * self._radius ** 2

    def calculate_perimeter(self) -> float:
        """Perimeter of a circle: 2πr."""
        return 2 * 3.141592653589793 * self._radius


class RectangleGeometry:
    """Rectangle area and perimeter — also standalone."""

    def __init__(self, width: float, height: float) -> None:
        if width <= 0 or height <= 0:
            raise ValueError("Dimensions must be positive")
        self._width = width
        self._height = height

    def calculate_area(self) -> float:
        """Area of a rectangle: width × height."""
        return self._width * self._height

    def calculate_perimeter(self) -> float:
        """Perimeter of a rectangle: 2(w + h)."""
        return 2 * (self._width + self._height)


# === RENDERING BEHAVIORS ===

class CanvasRenderer:
    """Renders objects to an ASCII canvas context."""

    def render(self, object_name: str, context: str = "canvas") -> str:
        return f"[CANVAS] {object_name}"


class ConsoleRenderer:
    """Renders objects to a console log context."""

    def render(self, object_name: str, context: str = "console") -> str:
        return f"[CONSOLE] >> {object_name}"


class PdfRenderer:
    """Renders objects for PDF output."""

    def render(self, object_name: str, context: str = "pdf") -> str:
        return f"<PDF><shape>{object_name}</PDF>"


# === COMPOSED SHAPES (objects built from behaviors, not inheriting from a base) ===

@dataclass
class Circle:
    """A circle composed of geometry and rendering behaviors. No inheritance needed."""
    radius: float = field(init=False)  # Set by post_init after validation
    _renderer: Renderable = field(repr=False)

    def __post_init__(self) -> None:
        self.radius = self._geometry._radius  # Forward from geometry component

    @classmethod
    def with_canvas(cls, radius: float) -> "Circle":
        """Factory: create a circle rendered to canvas."""
        return cls(_geometry=CircleGeometry(radius), _renderer=CanvasRenderer())

    @classmethod
    def with_console(cls, radius: float) -> "Circle":
        """Factory: create a circle rendered to console."""
        return cls(_geometry=CircleGeometry(radius), _renderer=ConsoleRenderer())

    def __init__(self, _geometry: CircleGeometry | None = None, _renderer: Renderable | None = None) -> None:
        if _geometry is not None:
            object.__setattr__(self, "_geometry", _geometry)
        else:
            self._geometry = CircleGeometry(1.0)

        if _renderer is not None:
            object.__setattr__(self, "_renderer", _renderer)
        else:
            self._renderer = ConsoleRenderer()

    @property
    def geometry(self) -> CircleGeometry:
        """Expose the geometry component for direct access if needed."""
        return self._geometry

    def area(self) -> float:
        """Delegate to geometry component."""
        return self._geometry.calculate_area()

    def perimeter(self) -> float:
        """Delegate to geometry component."""
        return self._geometry.calculate_perimeter()

    def render(self, context: str = "canvas") -> str:
        """Delegate rendering to the injected renderer."""
        return self._renderer.render(f"Circle(r={self.radius})")


@dataclass
class Rectangle:
    """A rectangle composed of geometry and rendering behaviors."""

    _geometry: RectangleGeometry = field(default_factory=lambda: RectangleGeometry(1.0, 1.0))
    _renderer: Renderable = field(default_factory=CanvasRenderer, repr=False)

    @property
    def width(self) -> float:
        return self._geometry._width

    @property
    def height(self) -> float:
        return self._geometry._height

    def area(self) -> float:
        return self._geometry.calculate_area()

    def perimeter(self) -> float:
        return self._geometry.calculate_perimeter()

    def render(self, context: str = "canvas") -> str:
        return self._renderer.render(f"Rectangle({self.width}x{self.height})")


# Usage — flexible composition without inheritance constraints
circle_canvas = Circle.with_canvas(radius=5.0)
print(circle_canvas.area())           # 78.54
print(circle_canvas.render("canvas")) # [CANVAS] Circle(r=5.0)

circle_console = Circle.with_console(radius=3.0)
print(circle_console.render("console")) # [CONSOLE] >> Circle(r=3.0)

# Want a circle that renders to PDF? Just inject a different renderer:
pdf_circle = Circle(
    _geometry=CircleGeometry(radius=2.0),
    _renderer=PdfRenderer()
)
print(pdf_circle.render("pdf"))  # <PDF><shape>Circle(r=2.0)</PDF>

# No hierarchy explosion. Adding a new render context means creating one Renderer, not modifying Shape.
# Adding a new shape means creating its Geometry class and composing it. Independent change paths.
```

**Why this works:** Behaviors are composed explicitly rather than inherited implicitly. Adding a new rendering context (e.g., SVG) requires one new `SvgRenderer` class — no changes to `Circle` or `Rectangle`. Adding a new shape requires its geometry class and composition — no risk of breaking existing subclasses. Each component is independently testable, swapable, and reusable.

---

## Constraints

### MUST DO
- Apply guard clauses at the start of every function to handle invalid inputs before positive logic begins
- Use Python type hints on all function signatures (parameters and return types) — no untyped functions in production code
- Include docstrings describing the function's purpose, parameters, return value, and any side effects or exceptions raised
- Keep functions under 30 lines of logic; if longer, extract sub-functions that each do one thing well
- Inject dependencies via constructor arguments rather than importing modules inside method bodies — enables testing and swapping implementations
- Name classes with nouns (`OrderProcessor`, `EmailValidator`) and functions with verb phrases (`calculate_total`, `validate_input`) to make the code read like English sentences
- Prefer small, focused protocols and interfaces over large base classes — a protocol should be implementable in fewer than 50 lines

### MUST NOT DO
- Create classes that manage more than one responsibility — if a class name contains "and" or "or," split it
- Copy-paste code blocks between functions even once without asking whether they share common logic
- Nest control flow deeper than three levels (if → for → if) — extract the inner block into a named function with a descriptive name
- Use inheritance chains longer than two levels (e.g., `A → B → C → D`) — flatten by composing behaviors instead
- Mix I/O operations (database queries, network calls, file writes) with pure business logic in the same function
- Write functions that have side effects and return values simultaneously — choose one: a function either returns data or performs an action, not both

---

## Output Template

When producing code under this skill, always structure output as follows:

1. **Principle Identification** — State which principle(s) the code demonstrates and why. Reference the specific pattern (SRP, DRY, KISS, SoC, or Composition).
2. **Code Example** — Provide complete, runnable Python code with type hints and docstrings. Include both a BAD example (showing the anti-pattern) and a GOOD example (showing the correct approach) when applicable.
3. **Explanation** — Briefly explain what changed between the BAD and GOOD versions and why the change improves maintainability. Focus on the architectural reasoning, not just syntax.
4. **Tradeoff Note** — Identify any tradeoff introduced by the principle (e.g., more files but clearer boundaries, or less abstraction but harder extensibility). State when this tradeoff is acceptable.
5. **Refactoring Checklist** — Provide 2-3 concrete next steps the reader can take to apply this principle to their own codebase. Make each step specific enough to act on immediately.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Use when reviewing existing code to identify violations of these principles; provides a structured review methodology with severity classification |
| `refactoring` | Use when improving legacy code that violates these principles; provides step-by-step refactoring strategies (Extract Method, Extract Class, Replace Temp) |
| `test-driven-development` | Use when writing tests alongside implementation; TDD naturally enforces SRP and SoC by requiring small, testable units from the start |
| `design-patterns-and-principles` | Use when you need deeper pattern knowledge (Observer, Strategy, Factory) that builds on these core principles for specific structural problems |

> Note: The related skills (`code-review`, `refactoring`, `test-driven-development`) should list `engineering-principles` in their `metadata.related-skills` field for reciprocity. Ensure bidirectional linkage so users discover this skill when exploring complementary capabilities.

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia: Software Engineering Principles](https://en.wikipedia.org/wiki/Software_engineering_principles)
- [SOLID Principles — Robert C. Martin](https://web.archive.org/web/20220419163603/https://medium.com/@patrickcollins/solid-principles-explained-in-simple-and-simple-terms-877c17e5f0fc)
- [Martin Fowler — Refactoring Catalog](https://martinfowler.com/refactoring/)
- [Google Engineering Practices — Code Quality](https://google.github.io/eng-practices/review/)
- [Clean Architecture — Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
