---
name: software-design-principles
description: Implements core software design principles (SOLID, DRY, KISS, dependency
  injection) to create maintainable, scalable, and modular codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software design principles, SOLID, DRY, KISS, dependency injection, clean
    architecture, modular design
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
  related-skills: refactoring, test-driven-development, code-review
------
# Software Design Principles

Applies foundational software design principles to guide architecture decisions, enforce maintainable structure, and prevent technical debt. This skill makes the model evaluate existing code and design new systems against established engineering standards, ensuring every module, class, and function follows SOLID, DRY, and KISS rules with practical dependency injection patterns.

## TL;DR for Code Generation

- [ ] Every class or module must have exactly one reason to change — if two unrelated features require edits in the same file, split it
- [ ] Depend on abstractions (Protocols, ABCs, traits) not concrete classes — inject interfaces via constructors
- [ ] Eliminate duplication by extracting shared logic into a single source of truth with explicit, typed function signatures
- [ ] Prefer composition over inheritance — keep inheritance depth at 2 levels or less, use strategy injection for behavior variation
- [ ] Resist premature abstraction — only introduce factories, decorators, or generic wrappers when a second concrete implementation actually exists

---

## When to Use

Use this skill when:

- Architecting a new module, service, or library from scratch and establishing its structural boundaries
- Reviewing code that exhibits tight coupling, God classes (>300 lines with >8 responsibilities), or fragile base class hierarchies
- Refactoring legacy systems where adding features requires risky changes in unrelated areas due to hidden dependencies
- Conducting design discussions where trade-offs between flexibility (abstraction) and simplicity (direct code) need explicit evaluation
- Onboarding developers who need alignment with project-level architecture standards and coding conventions

---

## When NOT to Use

Avoid this skill for:

- **One-off scripts or throwaway prototypes** — Elegance is irrelevant; use a simple linear script without classes or abstractions. (Use `testing-patterns` for prototype validation instead.)
- **Performance-critical inner loops** — Abstraction overhead in hot paths (e.g., real-time rendering, high-frequency data processing) should be measured and justified with benchmarks before applying design patterns. (Use `web-performance-optimization` or profiling skills first.)
- **UI/UX layout and presentation decisions** — This skill addresses structural design, not visual layer concerns like component hierarchy or state management in the view layer. (Use `frontend-design` for those concerns.)

---

## Core Workflow

1. **Audit Current Structure** — Map module-to-module dependencies using import graphs and class instantiation patterns. Identify God classes (>300 lines, >8 responsibilities), circular imports, and direct concrete class coupling across layers. **Checkpoint:** Every file should have exactly one reason to change. If two unrelated features cause changes in the same file, mark it for splitting.

2. **Evaluate Against SOLID** — Systematically check each class or module against the five principles: **S**RP (single responsibility boundary clearly defined), **O**CP (extend via new implementations without modifying source), **L**SP (subtypes honor base contract preconditions and postconditions), **I**SP (clients are not forced to depend on unused methods), **D**IP (high-level modules depend on abstractions, not low-level concretions). **Checkpoint:** No high-level business logic should import low-level implementation details — the dependency arrow must point inward toward abstraction.

3. **Filter Through KISS and YAGNI** — Strip away every factory, strategy pattern, or generic wrapper that does not solve a current concrete problem. Ask: "Will this pattern be needed in the next release?" If no, implement it plainly with direct instantiation and explicit logic. **Checkpoint:** Every abstraction must have at least two existing callers — if only one place uses it, inline it back to direct code.

4. **Enforce Composition Over Inheritance** — Replace deep inheritance trees (>2 levels) with composable objects. Use dependency injection to assemble behavior at runtime through strategy interfaces rather than compile-time class hierarchies. **Checkpoint:** Verify that swapping a component does not require modifying the consumer's source code.

5. **Validate and Document Public Contracts** — Generate architecture decision records (ADRs) for non-obvious design choices. Ensure all public interfaces have explicit typed signatures, clear preconditions, postconditions, and documented error paths with usage examples. **Checkpoint:** A new developer should be able to implement a correct consumer of any public API without reading the internal implementation.

---

## Implementation Patterns

### Pattern 1: Single Responsibility — Separating Concerns

When a class handles multiple distinct responsibilities (e.g., business logic + persistence), split each responsibility into its own module with explicit dependency injection.

```python
# ❌ BAD — Violates SRP: PaymentProcessor mixes business validation,
# external payment charging, and database persistence in one class
from datetime import datetime

class PaymentProcessor:
    """Handles orders, charges a gateway, and persists records — three reasons to change."""

    def __init__(self):
        self.db = SQLiteConnection("payments.db")  # Tight coupling to concrete DB
        self.gateway = StripeGateway(api_key="sk_live_...")  # Hard-coded provider

    def process(self, order_id: int, amount: float) -> bool:
        """Validates order, charges gateway, writes to DB — three responsibilities."""
        order = self.db.get("orders", order_id)
        if not order or order.status != "confirmed":
            raise ValueError(f"Order {order_id} is not confirmed")

        payment_record = {
            "order_id": order_id,
            "amount": amount,
            "status": "pending",
            "timestamp": datetime.now().isoformat(),
        }
        self.db.insert("payments", payment_record)  # Persistence concern

        response = self.gateway.charge(amount)  # External API concern
        if response.success:
            payment_record["status"] = "completed"
            payment_record["transaction_id"] = response.transaction_id
            self.db.update("payments", payment_record)  # More persistence
        else:
            payment_record["status"] = "failed"
            payment_record["error"] = response.error
            self.db.update("payments", payment_record)

        return response.success


# ✅ GOOD — SRP enforced: each class has one responsibility, injected dependencies
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Protocol
import logging

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    """Immutable result of a payment operation."""
    success: bool
    transaction_id: str | None = None
    error_message: str | None = None


class PaymentGateway(Protocol):
    """Abstract contract for any payment provider."""

    def charge(self, amount: float, currency: str = "USD") -> PaymentResult: ...


class PaymentRepository(Protocol):
    """Abstract contract for persisting payment records."""

    def save(self, record: dict) -> None: ...
    def update_status(self, order_id: int, status: str, **extra: object) -> None: ...


class OrderValidator:
    """Single responsibility: validates order eligibility for payment."""

    def __init__(self, order_repo: PaymentRepository):
        self.order_repo = order_repo

    def validate_for_payment(self, order_id: int) -> bool:
        """Check that an order is confirmed and not already paid."""
        order = self.order_repo.save({"id": order_id})  # Read-through for validation
        if order is None or order.get("status") != "confirmed":
            return False
        return True


class PaymentProcessor:
    """Single responsibility: orchestrates payment flow using injected abstractions."""

    def __init__(
        self,
        gateway: PaymentGateway,
        repository: PaymentRepository,
        validator: OrderValidator,
    ):
        self.gateway = gateway
        self.repository = repository
        self.validator = validator

    def process(self, order_id: int, amount: float, currency: str = "USD") -> PaymentResult:
        """Orchestrate payment with clear step boundaries."""
        if not self.validator.validate_for_payment(order_id):
            return PaymentResult(success=False, error_message="Order not eligible")

        result = self.gateway.charge(amount, currency)

        record = {
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "completed" if result.success else "failed",
        }
        if result.transaction_id:
            record["transaction_id"] = result.transaction_id
        if result.error_message:
            record["error"] = result.error_message

        self.repository.save(record)
        return result
```

### Pattern 2: Dependency Inversion and Interface Segregation — Clean Abstractions

When a client is forced to depend on methods it does not use, split fat interfaces into focused contracts. High-level modules should never import low-level details.

```python
# ❌ BAD — Fat interface forces all implementors to provide unused methods
# A NotificationService that only needs email delivery must still implement SMS and push
from abc import ABC, abstractmethod


class NotificationService(ABC):
    """Client forced to implement deliver_sms() and deliver_push() even for email-only use."""

    @abstractmethod
    def send(self, recipient: str, message: str) -> bool: ...

    @abstractmethod
    def deliver_email(self, to: str, subject: str, body: str) -> bool: ...

    @abstractmethod
    def deliver_sms(self, phone: str, message: str) -> bool: ...

    @abstractmethod
    def deliver_push(self, device_token: str, title: str, body: str) -> bool: ...


class EmailOnlyNotifier(NotificationService):
    """Violates ISP: must stub unused methods with NotImplementedError."""

    def send(self, recipient: str, message: str) -> bool:
        return self.deliver_email(recipient, "Notification", message)

    def deliver_email(self, to: str, subject: str, body: str) -> bool:
        # Real SMTP logic here
        return True

    def deliver_sms(self, phone: str, message: str) -> bool:
        raise NotImplementedError("Email notifier cannot send SMS")  # LSP violation!

    def deliver_push(self, device_token: str, title: str, body: str) -> bool:
        raise NotImplementedError("Email notifier cannot push")  # LSP violation!


# ✅ GOOD — ISP: each interface is small and client-specific. DIP: depends on abstractions.
from dataclasses import dataclass
import smtplib
from email.mime.text import MIMEText
from typing import Protocol


@dataclass
class EmailMessage:
    """Strongly-typed email envelope."""
    to: str
    subject: str
    body: str


class EmailTransport(Protocol):
    """Narrow contract: only what an email sender needs."""

    def send(self, message: EmailMessage) -> bool: ...


class SMTPTransport:
    """Concrete low-level implementation of EmailTransport."""

    def __init__(self, host: str = "smtp.example.com", port: int = 587) -> None:
        self.host = host
        self.port = port

    def send(self, message: EmailMessage) -> bool:
        """Send email via SMTP — a low-level concern hidden behind abstraction."""
        msg = MIMEText(message.body)
        msg["Subject"] = message.subject
        msg["To"] = message.to
        # Real SMTP connection logic would go here
        return True


class SMSTransport(Protocol):
    """Narrow contract: only what an SMS sender needs."""

    def send(self, phone: str, text: str) -> bool: ...


# High-level service depends on abstractions, not concrete classes
class NotificationService:
    """Orchestrates notifications by composing injected transport strategies."""

    def __init__(
        self,
        email_transport: EmailTransport | None = None,
        sms_transport: SMSTransport | None = None,
    ) -> None:
        self.email_transport = email_transport or SMTPTransport()
        self.sms_transport = sms_transport

    def send_email(self, recipient: str, subject: str, body: str) -> bool:
        """Send via email transport — caller never sees SMTP details."""
        msg = EmailMessage(to=recipient, subject=subject, body=body)
        return self.email_transport.send(msg)

    def send_sms(self, phone: str, text: str) -> bool:
        """Send via SMS transport — returns False if no SMS transport configured."""
        if self.sms_transport is None:
            raise RuntimeError("SMS transport not configured")
        return self.sms_transport.send(phone, text)
```

### Pattern 3: Eliminating Duplication via DRY — Extracting a Single Source of Truth

When identical or near-identical logic appears across multiple functions or classes, extract it into a single shared function with configurable parameters that captures the variation points.

```python
# ❌ BAD — Three nearly-identical validation functions duplicated throughout the codebase
# Each has the same structure: check input, format error, return bool/exception
def validate_email(email: str) -> bool:
    if not email or "@" not in email:
        raise ValueError("Invalid email")
    if len(email) > 254:
        raise ValueError("Email too long")
    if " " in email:
        raise ValueError("Email contains spaces")
    return True


def validate_phone(phone: str) -> bool:
    if not phone or len(phone) < 10:
        raise ValueError("Invalid phone")
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) != 10:
        raise ValueError("Phone must have 10 digits")
    if not digits.startswith(("1", "4", "6", "7", "8", "9")):
        raise ValueError("Invalid country code prefix")
    return True


def validate_zip_code(zip_code: str) -> bool:
    if not zip_code or len(zip_code) < 5:
        raise ValueError("Invalid zip code")
    digits = "".join(c for c in zip_code if c.isdigit())
    if len(digits) != 5:
        raise ValueError("Zip must have 5 digits")
    return True


# ✅ GOOD — DRY enforced: single validation engine with strategy functions
# that capture format-specific rules, eliminating three copies of the same pattern
from dataclasses import dataclass
from typing import Callable, Protocol


@dataclass
class ValidationError:
    """Structured validation error with field-level detail."""
    field: str
    value: str
    reason: str

    def __str__(self) -> str:
        return f"Validation failed for '{self.field}': {self.reason}"


class ValueRule(Protocol):
    """Abstract contract for a single validation rule on one field."""

    def validate(self, field_name: str, value: str) -> ValidationError | None: ...


class EmailValidator:
    """Encapsulates all email-specific rules in one reusable validator."""

    def __init__(self) -> None:
        self.rules: list[ValueRule] = [
            _NotEmptyRule(),
            _MaxLenRule(254),
            _NoSpacesRule(),
            _ContainsAtSignRule(),
        ]

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        for rule in self.rules:
            error = rule.validate(field_name, value)
            if error is not None:
                return error
        return None


class PhoneValidator:
    """Encapsulates all phone-specific rules in one reusable validator."""

    def __init__(self) -> None:
        self.rules: list[ValueRule] = [
            _NotEmptyRule(),
            _MinDigitsRule(10),
            _CountryCodePrefixRule("146789"),
        ]

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        cleaned = "".join(c for c in value if c.isdigit())
        for rule in self.rules:
            error = rule.validate(field_name, cleaned)
            if error is not None:
                return error
        return None


class ZipCodeValidator:
    """Encapsulates all zip-code-specific rules in one reusable validator."""

    def __init__(self) -> None:
        self.rules: list[ValueRule] = [
            _NotEmptyRule(),
            _ExactDigitsRule(5),
        ]

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        cleaned = "".join(c for c in value if c.isdigit())
        for rule in self.rules:
            error = rule.validate(field_name, cleaned)
            if error is not None:
                return error
        return None


# ── Shared rule implementations (the single source of truth for rule logic) ──

class _NotEmptyRule(ValueRule):
    """Shared: rejects empty or whitespace-only values."""

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        if not value or not value.strip():
            return ValidationError(field=field_name, value=value, reason="Value is required")
        return None


class _MaxLenRule(ValueRule):
    """Shared: enforces maximum string length."""

    def __init__(self, max_length: int) -> None:
        self.max_length = max_length

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        if len(value) > self.max_length:
            return ValidationError(
                field=field_name,
                value=value,
                reason=f"Must be at most {self.max_length} characters",
            )
        return None


class _NoSpacesRule(ValueRule):
    """Shared: rejects values containing whitespace."""

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        if " " in value:
            return ValidationError(field=field_name, value=value, reason="Contains disallowed spaces")
        return None


class _ContainsAtSignRule(ValueRule):
    """Shared: verifies presence of '@' character."""

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        if "@" not in value:
            return ValidationError(field=field_name, value=value, reason="Missing '@' character")
        return None


class _MinDigitsRule(ValueRule):
    """Shared: enforces minimum digit count after stripping non-digits."""

    def __init__(self, min_digits: int) -> None:
        self.min_digits = min_digits

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        digits = "".join(c for c in value if c.isdigit())
        if len(digits) < self.min_digits:
            return ValidationError(
                field=field_name,
                value=value,
                reason=f"Must contain at least {self.min_digits} digits",
            )
        return None


class _ExactDigitsRule(ValueRule):
    """Shared: enforces exact digit count after stripping non-digits."""

    def __init__(self, expected_digits: int) -> None:
        self.expected_digits = expected_digits

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        digits = "".join(c for c in value if c.isdigit())
        if len(digits) != self.expected_digits:
            return ValidationError(
                field=field_name,
                value=value,
                reason=f"Must be exactly {self.expected_digits} digits",
            )
        return None


class _CountryCodePrefixRule(ValueRule):
    """Shared: verifies the first digit is in an allowed set."""

    def __init__(self, allowed_prefixes: str) -> None:
        self.allowed_prefixes = set(allowed_prefixes)

    def validate(self, field_name: str, value: str) -> ValidationError | None:
        if not value or not value[0] in self.allowed_prefixes:
            return ValidationError(
                field=field_name,
                value=value,
                reason=f"Invalid country code prefix (allowed: {self.allowed_prefixes})",
            )
        return None
```

---

## Constraints

### MUST DO
- Enforce Single Responsibility by splitting any class or module with more than one distinct business capability into separate files
- Depend exclusively on abstractions (Protocols, ABCs, traits, interfaces) — inject concrete implementations via constructor parameters
- Keep inheritance depth at 2 levels maximum; replace deeper hierarchies with composition and injected strategy objects
- Apply YAGNI ruthlessly — only introduce a factory, decorator, or generic wrapper when a second concrete implementation actually exists in the codebase
- Document all public interfaces with explicit typed signatures, preconditions, postconditions, and documented error contracts

### MUST NOT DO
- Create "Manager", "Helper", "Util", or "Service" classes that accumulate unrelated functions across multiple domains
- Use inheritance to share code between sibling classes — extract the shared logic into a standalone module or use composition instead
- Implement factory patterns for simple object creation when direct constructor calls produce clearer, more readable code
- Add abstraction layers preemptively ("because it might be needed later") without a current concrete requirement driving the design
- Violate LSP by overriding methods in subclasses to raise `NotImplementedError`, return default values that break contracts, or add unexpected side effects

---

## Related Skills

| Skill | Purpose |
|---|---|
| `refactoring` | Systematic technique for incrementally improving code structure without changing external behavior |
| `test-driven-development` | Establishes correctness guarantees before implementation, ensuring design decisions serve testability |
| `code-review` | Catches SOLID and DRY violations during PR reviews before they reach production |
