---




name: single-responsibility
description: Detects and refactors classes that violate the Single Responsibility
  Principle by splitting multi-purpose modules into focused components with clear
  responsibility boundaries.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: single responsibility principle, SRP, god class, split class, cohesion, high coupling, module boundary, one reason to change high coupling
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
  related-skills: open-closed-principle, liskov-substitution-principle, interface-segregation-principle,
    dependency-inversion-principle, refactoring-techniques




---




# Single Responsibility Principle (SRP)

Acts as a senior software architect applying the Single Responsibility Principle to decompose bloated classes and modules into focused, cohesive units. Detects violations through concrete code smells — God classes, mixed concerns, high cyclomatic complexity — then refactors each into separate components with explicit responsibility boundaries.

## TL;DR Checklist

- [ ] Measure class size (> 200 lines is a strong SRP violation signal)
- [ ] Count public methods and verify none share a different business reason to change
- [ ] Identify every distinct concern in the class (data access, validation, formatting, external calls)
- [ ] Extract each concern into its own class with a descriptive name
- [ ] Wire dependencies through constructor injection — never module-level globals
- [ ] Verify cross-responsibility coupling is eliminated after extraction
- [ ] Run all existing tests to confirm behavior preservation

---

## When to Use

Use this skill when:

- A class exceeds 200 lines or has more than 6 public methods that touch different domains
- You encounter a "God class" (e.g., `OrderService` handling validation, persistence, email notifications, and payment processing)
- A single module imports from unrelated packages (e.g., both `sqlalchemy` and `boto3` in one file)
- Reviewing a pull request where changes to logging would require touching business logic
- Refactoring legacy code that grew organically without architectural boundaries

---

## When NOT to Use

Avoid over-applying SRP when:

- A class is genuinely simple (1–3 methods, all serving the same concern) — do not split a 50-line `Point` class into three files
- The extraction would create an explosion of tiny classes that increase navigation overhead more than it helps maintainability
- You are in early prototype stage where iteration speed outweighs architectural purity

---

## Core Workflow

1. **Scan for SRP violations** — Measure concrete signals: class size > 200 lines, public method count > 6 handling different concepts, imports from unrelated domains (e.g., persistence + networking + UI in one file), or cyclomatic complexity > 15. **Checkpoint:** Document every method and label its concern before making any changes.

2. **Classify each concern** — Group methods by the business reason they exist. Typical categories: data access / persistence, input validation, business rule enforcement, external API interaction, serialization / formatting, logging / telemetry, notification delivery. **Checkpoint:** Each group should have exactly one reason to change. If a group contains sub-groups, split further.

3. **Create responsibility boundaries** — Extract each concern group into its own class. Name the new class after what it does, not what it is (e.g., `OrderPaymentProcessor` not `OrderHelper`). Each class gets its own file under the same package. **Checkpoint:** The original class should now only orchestrate between extracted classes and contain zero direct business logic from the extracted concerns.

4. **Wire dependencies via constructor injection** — Pass each dependency explicitly through the constructor of the composing class. Never use module-level singletons, global state, or factory functions hidden inside methods. **Checkpoint:** Every dependency appears in `__init__` as a typed parameter with a protocol or abstract base interface.

5. **Verify no cross-responsibility coupling remains** — Run a static analysis check: ensure no extracted class imports modules used exclusively by another extracted concern (e.g., the logging class should not import `sqlalchemy`). Confirm all tests still pass. **Checkpoint:** Each class passes the "three-question test": (1) Does it have exactly one reason to change? (2) Can I describe its job in one sentence? (3) Would removing it break another responsibility?

---

## Implementation Patterns

### Pattern 1: Splitting a God Class

A God class accumulates every capability needed by a domain concept. The fix is to decompose into focused classes, each owning one concern.

```python
# ❌ BAD — God class handling validation, persistence, payment, and notifications
class OrderService:
    def __init__(self):
        self.db = Database()
        self.api_key = os.environ["STRIPE_KEY"]
        self.smtp_host = "smtp.company.com"

    def create_order(self, user_id: int, items: list[dict], address: str) -> dict:
        # Validation
        if not items or len(items) == 0:
            raise ValueError("Order must contain at least one item")
        for item in items:
            if item.get("quantity", 0) <= 0:
                raise ValueError(f"Invalid quantity for {item['sku']}")

        # Persistence
        order_id = uuid.uuid4()
        self.db.execute(
            "INSERT INTO orders (id, user_id, address, status) VALUES (?, ?, ?, ?)",
            order_id, user_id, address, "pending",
        )
        for item in items:
            self.db.execute(
                "INSERT INTO order_items (order_id, sku, quantity, price) VALUES (?, ?, ?, ?)",
                order_id, item["sku"], item["quantity"], item["price"],
            )

        # Payment processing (external API call)
        import stripe
        charge = stripe.Charge.create(
            amount=int(items[0]["price"] * 100),
            currency="usd",
            source=items[0].get("payment_token"),
        )
        if not charge.paid:
            self.db.execute("UPDATE orders SET status = ? WHERE id = ?", "failed", order_id)
            raise PaymentError("Payment declined")

        # Notification
        import smtplib
        msg = f"Your order {order_id} has been confirmed."
        with smtplib.SMTP(self.smtp_host) as server:
            server.sendmail("noreply@company.com", "user@email.com", msg)

        return {"order_id": order_id, "status": "confirmed"}

    def cancel_order(self, order_id: str) -> None:
        # More business logic mixed with persistence and notification
        ...
```

**Problems:** Validation logic cannot be reused without an Order. Persistence layer leaks into the public API. Payment library imported inside the method makes testing impossible. Notification code couples to SMTP configuration stored as a module-level string.

```python
# ✅ GOOD — Decomposed into focused classes with explicit boundaries
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class OrderRequest:
    """Immutable value object representing a new order request."""
    user_id: int
    items: list[OrderItem]
    address: str

    def validate(self) -> None:
        """Validate invariants — self-contained business rule."""
        if not self.items:
            raise ValueError("Order must contain at least one item")
        for item in self.items:
            if item.quantity <= 0:
                raise ValueError(f"Invalid quantity for {item.sku}")


@dataclass(frozen=True)
class OrderItem:
    sku: str
    quantity: int
    price: float


# --- Persistence layer (only concern: data access) ---
class OrderRepository(Protocol):
    async def save_order(self, order_id: uuid.UUID, request: OrderRequest) -> None: ...
    async def update_status(self, order_id: uuid.UUID, status: str) -> None: ...


class SqlOrderRepository:
    """Persists orders and order items to a relational database."""

    def __init__(self, connection_string: str) -> None:
        self._connection_string = connection_string

    async def save_order(self, order_id: uuid.UUID, request: OrderRequest) -> None:
        from sqlalchemy.ext.asyncio import AsyncSession
        async with AsyncSession() as session:
            await session.execute(
                "INSERT INTO orders (id, user_id, address, status) VALUES (:id, :uid, :addr, :status)",
                {"id": order_id, "uid": request.user_id, "addr": request.address, "status": "pending"},
            )
            for item in request.items:
                await session.execute(
                    "INSERT INTO order_items (order_id, sku, quantity, price) VALUES (:oid, :sku, :qty, :p)",
                    {"oid": order_id, "sku": item.sku, "qty": item.quantity, "p": item.price},
                )
            await session.commit()

    async def update_status(self, order_id: uuid.UUID, status: str) -> None:
        from sqlalchemy.ext.asyncio import AsyncSession
        async with AsyncSession() as session:
            await session.execute(
                "UPDATE orders SET status = :status WHERE id = :id",
                {"status": status, "id": order_id},
            )
            await session.commit()


# --- Payment processing (only concern: external API interaction) ---
class PaymentProvider(Protocol):
    async def charge(self, amount_cents: int, currency: str, token: str) -> bool: ...


class StripePaymentProvider:
    """Handles charging via Stripe's REST API."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def charge(self, amount_cents: int, currency: str, token: str) -> bool:
        import stripe
        stripe.api_key = self._api_key
        try:
            charge = await stripe.AsyncCharge.create(
                amount=amount_cents,
                currency=currency,
                source=token,
            )
            return bool(charge.get("paid", False))
        except stripe.error.StripeError as exc:
            raise PaymentError(f"Stripe charge failed: {exc}") from exc


class PaymentError(Exception):
    """Raised when a payment provider rejects a charge."""
    pass


# --- Notification delivery (only concern: sending notifications) ---
class NotificationSender(Protocol):
    async def send_order_confirmation(self, order_id: uuid.UUID, recipient_email: str) -> None: ...


class SmtpNotificationSender:
    """Sends email notifications via SMTP."""

    def __init__(self, host: str, port: int = 587, sender: str = "noreply@company.com") -> None:
        self._host = host
        self._port = port
        self._sender = sender

    async def send_order_confirmation(self, order_id: uuid.UUID, recipient_email: str) -> None:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(f"Your order {order_id} has been confirmed.")
        msg["Subject"] = "Order Confirmed"
        msg["From"] = self._sender
        msg["To"] = recipient_email

        with smtplib.SMTP(self._host, self._port) as server:
            server.starttls()
            await server.sendmail(self._sender, recipient_email, msg.as_string())


# --- Orchestrator (only concern: coordinating responsibilities) ---
class OrderService:
    """Orchestrates order creation by delegating to focused components.

    This class has exactly one reason to change: the business process of
    creating an order. It does not perform validation, persistence, payment,
    or notification directly.
    """

    def __init__(
        self,
        repository: OrderRepository,
        payment_provider: PaymentProvider,
        notification_sender: NotificationSender,
    ) -> None:
        self._repository = repository
        self._payment_provider = payment_provider
        self._notification_sender = notification_sender

    async def create_order(self, request: OrderRequest) -> uuid.UUID:
        """Create an order by delegating to responsible components."""
        # Validation — delegated to the value object itself
        request.validate()

        order_id = uuid.uuid4()

        # Persistence — delegated to repository
        await self._repository.save_order(order_id, request)

        # Payment — delegated to payment provider
        total_cents = int(sum(item.price for item in request.items) * 100)
        paid = await self._payment_provider.charge(
            amount_cents=total_cents,
            currency="usd",
            token=request.items[0].get("payment_token", ""),
        )

        if not paid:
            await self._repository.update_status(order_id, "failed")
            raise PaymentError("Payment declined")

        # Notification — delegated to notification sender
        await self._notification_sender.send_order_confirmation(
            order_id=order_id,
            recipient_email=f"user_{request.user_id}@example.com",
        )

        return order_id
```

**Result:** Four extractable classes with single responsibilities. The `OrderService` orchestrator is now 30 lines — easily understood by scanning the method names alone. Each dependency is injectable and testable with mocks.

---

### Pattern 2: Separating Data Access from Business Logic

When ORM queries or SQL are mixed with business validation, you cannot test business rules without spinning up a database. Extract the data access layer behind a repository interface.

```python
# ❌ BAD — Business logic and ORM queries entangled
class UserService:
    def __init__(self):
        self.engine = create_engine("sqlite:///app.db")

    def register_user(self, username: str, email: str, password: str) -> int:
        from werkzeug.security import generate_password_hash

        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        if "@" not in email:
            raise ValueError("Invalid email format")

        hashed = generate_password_hash(password)

        with self.engine.connect() as conn:
            # Check for existing user (data access mixed with validation)
            result = conn.execute(
                "SELECT id FROM users WHERE username = ? OR email = ?",
                (username, email),
            )
            if result.fetchone():
                raise ValueError("Username or email already registered")

            # Insert user
            result = conn.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, hashed),
            )
            user_id = result.lastrowid
            conn.commit()

        # Send welcome email (another unrelated concern in same method)
        self._send_welcome_email(email)

        return user_id

    def _send_welcome_email(self, email: str) -> None:
        import smtplib
        msg = "Welcome!"
        with smtplib.SMTP("localhost") as s:
            s.sendmail("noreply@app.com", email, msg)
```

**Problems:** Cannot test `register_user` without a database file. Password hashing utility mixed into business method. Welcome email logic hidden as a private method on the same class. Email sending code duplicates SMTP boilerplate everywhere it appears.

```python
# ✅ GOOD — Repository isolates data access; service owns only business rules
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class UserCredentials:
    """Immutable value object for user registration."""
    username: str
    email: str
    password: str

    def validate(self) -> None:
        if len(self.username) < 3:
            raise ValueError("Username must be at least 3 characters")
        if "@" not in self.email or "." not in self.email.split("@")[-1]:
            raise ValueError("Invalid email format")


class UserAlreadyExistsError(ValueError):
    """Raised when registration fails due to duplicate username or email."""
    pass


# --- Data access layer ---
class UserRepository(Protocol):
    """Abstraction over user persistence. The service depends on this interface,
    not on SQLAlchemy directly."""

    async def find_by_username(self, username: str) -> uuid.UUID | None: ...
    async def find_by_email(self, email: str) -> uuid.UUID | None: ...
    async def create_user(self, username: str, email: str, password_hash: str) -> uuid.UUID: ...


class SqlUserRepository:
    """SQLAlchemy-backed user repository implementation."""

    def __init__(self, engine_url: str) -> None:
        self._engine_url = engine_url

    async def find_by_username(self, username: str) -> uuid.UUID | None:
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        engine = create_async_engine(self._engine_url)
        async with AsyncSession(engine) as session:
            result = await session.execute(
                "SELECT id FROM users WHERE username = :username", {"username": username}
            )
            row = result.fetchone()
            return uuid.UUID(row[0]) if row else None

    async def find_by_email(self, email: str) -> uuid.UUID | None:
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        engine = create_async_engine(self._engine_url)
        async with AsyncSession(engine) as session:
            result = await session.execute(
                "SELECT id FROM users WHERE email = :email", {"email": email}
            )
            row = result.fetchone()
            return uuid.UUID(row[0]) if row else None

    async def create_user(self, username: str, email: str, password_hash: str) -> uuid.UUID:
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        user_id = uuid.uuid4()
        engine = create_async_engine(self._engine_url)
        async with AsyncSession(engine) as session:
            await session.execute(
                "INSERT INTO users (id, username, email, password_hash) VALUES (:uid, :uname, :email, :hash)",
                {"uid": user_id, "uname": username, "email": email, "hash": password_hash},
            )
            await session.commit()
        return user_id


# --- Business logic layer (no database knowledge) ---
class UserService:
    """Manages user lifecycle — validation, uniqueness checks, and registration.

    Has exactly one reason to change: the user registration business process.
    Does not know about SQLAlchemy, SMTP, or any infrastructure concern.
    """

    def __init__(
        self,
        repository: UserRepository,
        notification_sender: NotificationSender,
    ) -> None:
        self._repository = repository
        self._notification_sender = notification_sender

    async def register_user(self, credentials: UserCredentials) -> uuid.UUID:
        """Register a new user after validation and uniqueness checks."""
        # Validation — delegated to value object
        credentials.validate()

        # Uniqueness check — delegated to repository abstraction
        existing = await self._repository.find_by_username(credentials.username)
        if existing is not None:
            raise UserAlreadyExistsError(f"Username already taken: {credentials.username}")

        existing = await self._repository.find_by_email(credentials.email)
        if existing is not None:
            raise UserAlreadyExistsError(f"Email already registered: {credentials.email}")

        # Business rule: hash password before persistence
        from werkzeug.security import generate_password_hash
        hashed = generate_password_hash(credentials.password)

        # Delegation — persist via repository
        user_id = await self._repository.create_user(
            credentials.username,
            credentials.email,
            hashed,
        )

        # Notification — delegated to separate component
        await self._notification_sender.send_welcome_email(credentials.email)

        return user_id
```

**Result:** `UserService` can be tested with a simple in-memory mock of `UserRepository`. The business rules are pure and testable without any database dependency. Infrastructure concerns (SQLAlchemy, SMTP) are isolated in their own classes.

---

### Pattern 3: Extracting External API Handling (Adapter Pattern)

When external service calls (payment gateways, email providers, analytics SDKs) are mixed with domain logic, the code becomes brittle and untestable. Extract an adapter class that owns the HTTP interaction, protocol details, and error translation.

```python
# ❌ BAD — Payment gateway logic embedded in order processing
class OrderProcessor:
    def process_order(self, order_id: str, amount: float, card_token: str) -> dict:
        import httpx

        # Direct HTTP call mixed with business logic
        headers = {
            "Authorization": f"Bearer {os.environ['STRIPE_SECRET_KEY']}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        payload = {
            "amount": int(amount * 100),
            "currency": "usd",
            "source": card_token,
            "description": f"Order {order_id}",
        }

        try:
            response = httpx.post(
                "https://api.stripe.com/v1/charges",
                headers=headers,
                json=payload,
                timeout=30.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 402:
                return {"status": "failed", "reason": "card_declined"}
            return {"status": "error", "reason": str(exc)}

        charge_data = response.json()
        success = charge_data.get("paid", False)

        if success:
            # Business logic entangled with HTTP response parsing
            self._update_order_status(order_id, "paid")
            self._log_transaction(
                order_id=order_id,
                amount=amount,
                provider="stripe",
                transaction_id=charge_data["id"],
            )
            return {"status": "success", "transaction_id": charge_data["id"]}

        return {"status": "failed", "reason": "payment_not_charged"}
```

**Problems:** Hardcoded Stripe API URL and auth header construction inside business method. HTTP status code interpretation mixed into domain logic. Transaction logging co-located with payment flow. Impossible to unit test without mocking `httpx` globally. Changing from Stripe to another provider requires touching the order processor.

```python
# ✅ GOOD — Adapter isolates all external API concerns
from __future__ import annotations

import enum
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


class PaymentStatus(enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    ERROR = "error"


@dataclass(frozen=True)
class ChargeResult:
    """Immutable result from a charge attempt."""
    status: PaymentStatus
    transaction_id: str | None = None
    error_reason: str | None = None

    @property
    def is_success(self) -> bool:
        return self.status == PaymentStatus.SUCCESS


# --- External API adapter interface ---
class PaymentGateway(Protocol):
    """Abstraction for external payment providers.

    The order processor depends on this protocol, not on any specific provider's SDK.
    """

    async def charge(self, amount_cents: int, currency: str, source_token: str) -> ChargeResult: ...


# --- Stripe-specific implementation (isolated in its own file) ---
class StripeGateway(PaymentGateway):
    """Stripe REST API adapter. Owns all knowledge of Stripe's protocol."""

    def __init__(self, api_key: str, base_url: str = "https://api.stripe.com/v1") -> None:
        self._api_key = api_key
        self._base_url = base_url

    async def charge(self, amount_cents: int, currency: str, source_token: str) -> ChargeResult:
        import httpx

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        payload = {
            "amount": amount_cents,
            "currency": currency,
            "source": source_token,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self._base_url}/charges",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 402:
                return ChargeResult(status=PaymentStatus.FAILED, error_reason="card_declined")
            return ChargeResult(status=PaymentStatus.ERROR, error_reason=str(exc))
        except httpx.RequestError as exc:
            return ChargeResult(status=PaymentStatus.ERROR, error_reason=f"network_error: {exc}")

        data = response.json()
        return ChargeResult(
            status=PaymentStatus.SUCCESS,
            transaction_id=data.get("id"),
        )


# --- PayPal-specific implementation (another file) ---
class PayPalGateway(PaymentGateway):
    """PayPal REST API adapter. Zero knowledge of Stripe's protocol."""

    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret

    async def charge(self, amount_cents: int, currency: str, source_token: str) -> ChargeResult:
        # PayPal-specific protocol implementation goes here
        # ... (completely isolated from Stripe knowledge)
        pass


# --- Domain logic (no external API knowledge) ---
class OrderProcessor:
    """Processes orders by delegating payment to an adapter.

    Has exactly one reason to change: the order processing workflow.
    Does not know which payment provider is used or how it works.
    """

    def __init__(
        self,
        gateway: PaymentGateway,
        status_updater: OrderStatusUpdater,
        transaction_logger: TransactionLogger,
    ) -> None:
        self._gateway = gateway
        self._status_updater = status_updater
        self._transaction_logger = transaction_logger

    async def process_payment(self, order_id: str, amount: float, card_token: str) -> ChargeResult:
        """Attempt payment through the configured gateway and react to the result."""
        amount_cents = int(amount * 100)
        result = await self._gateway.charge(
            amount_cents=amount_cents,
            currency="usd",
            source_token=card_token,
        )

        if result.is_success:
            await self._status_updater.update(order_id, status="paid")
            await self._transaction_logger.log(
                order_id=order_id,
                amount=amount,
                provider="payment_gateway",  # Generic — does not reveal Stripe/PayPal
                transaction_id=result.transaction_id,
            )

        return result
```

**Result:** Switching from Stripe to PayPal requires only creating a new `PaymentGateway` implementation. The `OrderProcessor` is completely unaware of which provider it uses. Each gateway can be tested independently with its own mock HTTP server or test doubles.

---

### Pattern 4: Isolating Logging and Telemetry Concerns

When logging, metrics collection, and monitoring code are scattered throughout business methods, every log format change requires touching dozens of files. Extract a dedicated telemetry layer that owns all observability concerns.

```python
# ❌ BAD — Logging mixed into every business method
class ReportGenerator:
    def __init__(self):
        self.db = get_db_connection()

    def generate_sales_report(self, start_date: str, end_date: str) -> dict:
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"Generating report for {start_date} to {end_date}")
            results = self.db.execute(
                "SELECT product, SUM(quantity), SUM(amount) FROM sales WHERE date BETWEEN ? AND ? GROUP BY product",
                (start_date, end_date),
            ).fetchall()

            if not results:
                logger.warning(f"No data found for range {start_date} to {end_date}")
                return {"entries": [], "row_count": 0}

            # Formatting logic mixed with data retrieval
            formatted = [
                {"product": row[0], "total_quantity": row[1], "total_amount": round(row[2], 2)}
                for row in results
            ]

            logger.info(f"Report generated: {len(formatted)} rows")
            return {"entries": formatted, "row_count": len(formatted)}

        except Exception as exc:
            logger.error(f"Report generation failed: {exc}", exc_info=True)
            raise ReportGenerationError(f"Failed to generate report: {exc}") from exc

    def export_report(self, report_data: dict, format_type: str) -> str:
        import json
        import logging
        logger = logging.getLogger(__name__)

        try:
            if format_type == "json":
                output = json.dumps(report_data, indent=2, default=str)
            elif format_type == "csv":
                lines = [",".join(report_data.get("entries", [{}]).keys())]
                for entry in report_data.get("entries", []):
                    lines.append(",".join(str(v) for v in entry.values()))
                output = "\n".join(lines)
            else:
                logger.error(f"Unsupported format: {format_type}")
                raise ValueError(f"Unsupported format: {format_type}")

            logger.info(f"Report exported as {format_type}")
            return output

        except Exception as exc:
            logger.error(f"Export failed for format {format_type}: {exc}")
            raise ExportError(f"Export failed: {exc}") from exc
```

**Problems:** Every method repeats `import logging` and logger instantiation. Log message formats are duplicated across methods (e.g., "Report generated / Report exported"). Metrics collection would require adding counters to every method. Changing the log level format touches all business logic files.

```python
# ✅ GOOD — Telemetry is a dedicated dependency injected into each component
from __future__ import annotations

import enum
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


# --- Telemetry interface (owns ALL observability concerns) ---
class TelemetryService(ABC):
    """Abstraction over logging, metrics, and tracing.

    All business classes depend on this protocol for observability.
    Switching from console logging to structured JSON logs or OpenTelemetry
    requires changing only the implementation, not every business class.
    """

    @abstractmethod
    def info(self, message: str, **extra: Any) -> None: ...
    @abstractmethod
    def warning(self, message: str, **extra: Any) -> None: ...
    @abstractmethod
    def error(self, message: str, exc: Exception | None = None, **extra: Any) -> None: ...
    @abstractmethod
    def timing(self, operation: str, duration_seconds: float, **extra: Any) -> None: ...


class ConsoleTelemetryService(TelemetryService):
    """Console-based telemetry for development. Uses Python's logging module."""

    def __init__(self, name: str = "app", level: int = logging.INFO) -> None:
        self._logger = logging.getLogger(name)
        self._logger.setLevel(level)

        # Handler configuration — infrastructure detail owned here
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)-5s %(message)s"
        )
        handler.setFormatter(formatter)
        self._logger.addHandler(handler)

    def info(self, message: str, **extra: Any) -> None:
        self._logger.info(f"{message} | {extra}")

    def warning(self, message: str, **extra: Any) -> None:
        self._logger.warning(f"{message} | {extra}")

    def error(self, message: str, exc: Exception | None = None, **extra: Any) -> None:
        if exc:
            self._logger.error(f"{message} | {extra}", exc_info=True)
        else:
            self._logger.error(f"{message} | {extra}")

    def timing(self, operation: str, duration_seconds: float, **extra: Any) -> None:
        self._logger.info(f"[timing] {operation}: {duration_seconds:.4f}s | {extra}")


class OpenTelemetryService(TelemetryService):
    """Production telemetry using OpenTelemetry.

    Swappable at runtime — business code remains unchanged.
    """

    def __init__(self, tracer_name: str = "app") -> None:
        from opentelemetry import trace
        self._tracer = trace.get_tracer(tracer_name)

    def info(self, message: str, **extra: Any) -> None:
        self._tracer.get_span().add_event(message, attributes=extra)

    def warning(self, message: str, **extra: Any) -> None:
        self._tracer.get_span().add_event(message, attributes={**extra, "level": "WARNING"})

    def error(self, message: str, exc: Exception | None = None, **extra: Any) -> None:
        if exc:
            self._tracer.get_span().record_exception(exc)
        self._tracer.get_span().add_event(message, attributes={**extra, "level": "ERROR"})

    def timing(self, operation: str, duration_seconds: float, **extra: Any) -> None:
        with self._tracer.start_as_current_span(f"timing.{operation}"):
            pass  # Metric recording handled by OTel SDK


# --- Context manager for automatic timing ---
@dataclass
class TimedOperation:
    """Context manager that records operation duration via telemetry."""
    operation_name: str
    telemetry: TelemetryService

    def __enter__(self) -> TimedOperation:
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args: Any) -> None:
        duration = time.perf_counter() - self._start
        self._telemetry.timing(self.operation_name, duration)


# --- Business component (no logging code directly) ---
@dataclass(frozen=True)
class ReportRequest:
    start_date: str
    end_date: str


class ReportGenerationError(Exception):
    pass


class ReportExporterError(Exception):
    pass


class ReportGenerator:
    """Generates and exports reports.

    Has exactly one reason to change: the report generation workflow.
    Logging, metrics, and timing are delegated to TelemetryService.
    """

    def __init__(
        self,
        data_source: ReportDataSource,
        telemetry: TelemetryService = field(default_factory=lambda: ConsoleTelemetryService("report_gen")),
    ) -> None:
        self._data_source = data_source
        self._telemetry = telemetry

    def generate_report(self, request: ReportRequest) -> dict[str, Any]:
        """Generate a sales report for the given date range."""
        with TimedOperation("generate_report", self._telemetry):
            try:
                self._telemetry.info(
                    "Report generation started",
                    start_date=request.start_date,
                    end_date=request.end_date,
                )

                raw_results = self._data_source.fetch_sales_data(
                    request.start_date, request.end_date,
                )

                if not raw_results:
                    self._telemetry.warning(
                        "No data found",
                        start_date=request.start_date,
                        end_date=request.end_date,
                    )
                    return {"entries": [], "row_count": 0}

                formatted = [
                    {
                        "product": row["product"],
                        "total_quantity": row["quantity"],
                        "total_amount": round(row["amount"], 2),
                    }
                    for row in raw_results
                ]

                self._telemetry.info(
                    "Report generated successfully",
                    rows=len(formatted),
                )
                return {"entries": formatted, "row_count": len(formatted)}

            except Exception as exc:
                self._telemetry.error("Report generation failed", exc=exc)
                raise ReportGenerationError(f"Failed to generate report: {exc}") from exc

    def export_report(
        self, report_data: dict[str, Any], format_type: str
    ) -> str:
        """Export report data as JSON or CSV."""
        try:
            if format_type == "json":
                import json
                output = json.dumps(report_data, indent=2, default=str)
            elif format_type == "csv":
                entries = report_data.get("entries", [{}])
                if not entries:
                    return ""
                header = ",".join(entries[0].keys())
                rows = [",".join(str(v) for v in entry.values()) for entry in entries]
                output = "\n".join([header] + rows)
            else:
                self._telemetry.error(f"Unsupported export format: {format_type}")
                raise ValueError(f"Unsupported format: {format_type}")

            self._telemetry.info(
                "Report exported",
                format=format_type,
                size=len(output),
            )
            return output

        except Exception as exc:
            self._telemetry.error("Export failed", exc=exc)
            raise ReportExporterError(f"Export failed: {exc}") from exc
```

**Result:** All logging lives in `TelemetryService`. Switching from console to OpenTelemetry requires only changing which implementation is injected. The `ReportGenerator` methods are shorter, cleaner, and easier to read because they contain no logging boilerplate. Metrics collection can be added centrally by modifying the telemetry implementation.

---

## Constraints

### MUST DO
- Split any class that has more than one distinct business capability into separate classes or modules
- Give each new class a name that reflects its single responsibility — use action-oriented nouns (`OrderPaymentProcessor`, `SalesReportFormatter`) not vague labels
- Inject dependencies via constructor parameters with explicit type hints, never via module-level globals, singletons, or factory functions hidden inside methods
- Define a protocol or abstract base interface for every extracted dependency before implementing it — the composing class depends on the abstraction
- Document each class's responsibility in its docstring as one sentence answering "What does this class do?"
- Place each new class in its own file under the same package, with the filename matching the class name

### MUST NOT DO
- Create classes with names like `Utils`, `Helper`, `Manager`, `Processor`, or `Service` that accumulate unrelated functions — these are just God classes with different labels
- Extract methods into the same file just because — if it serves a different concern, give it its own file and class
- Leave coupling between responsibilities hidden through shared mutable state (class-level variables, global dicts)
- Extract at the method level when the extracted method still touches multiple concerns — extract the entire concern, not individual methods
- Use dependency injection to pass ten parameters into one constructor — if you need that many dependencies, the composing class has its own SRP violation

---

## Output Template

When analyzing and refactoring code for SRP compliance, produce:

1. **Violation Report** — For each class examined: file path, line count, public method count, list of distinct concerns detected (with rationale for grouping)
2. **Proposed Decomposition** — ASCII diagram showing how the current class maps to new classes and their dependency relationships
3. **Extracted Class Definitions** — Full code for each new class with: type hints, docstrings describing the single responsibility, protocol/interface definitions where applicable
4. **Composing Class Rewrite** — The refactored orchestrator class showing constructor injection of all extracted dependencies, with zero direct business logic from extracted concerns
5. **Migration Notes** — List any callers that need updating due to changed method signatures or new dependency requirements
6. **Verification Checklist** — Confirm each extracted class passes the three-question test (one reason to change, one-sentence description, removing it does not break another concern)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `open-closed-principle` | Once classes are split by responsibility, apply OCP to make each class open for extension but closed for modification |
| `liskov-substitution-principle` | After extracting interfaces/protocols, ensure all implementations are substitutable without breaking callers |
| `interface-segregation-principle` | When a protocol has methods a client doesn't use, split it — closely related to SRP's boundary discipline |
| `dependency-inversion-principle` | High-level modules should depend on abstractions — the natural next step after splitting responsibilities into classes |
| `refactoring-techniques` | General refactoring catalog including extract class, move method, and introduce parameter object patterns |

---

*The Single Responsibility Principle is not about keeping classes small for its own sake — it is about giving each unit of code exactly one reason to change. When a bug report, feature request, or security advisory touches only one aspect of a system, you should be able to locate and fix that aspect by modifying only the class responsible for it.*
