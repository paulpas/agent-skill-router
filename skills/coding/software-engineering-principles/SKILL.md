---
name: software-engineering-principles
description: Applies core software engineering principles (modularity, separation
  of concerns, defensive programming, YAGNI) to produce maintainable, robust, and
  scalable code.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: software engineering, modular design, separation of concerns, defensive
    programming, KISS principle, YAGNI, clean architecture
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
  - examples
  - do-dont
  related-skills: coding-code-review, coding-testing, coding-error-handling, coding-refactoring
---
# Software Engineering Principles

Applies foundational engineering principles to guide daily development decisions, ensuring code is modular, maintainable, and resilient. This skill turns abstract best practices into concrete implementation choices.

## TL;DR Checklist

- [ ] Verify each module has a single, well-defined responsibility
- [ ] Confirm separation between data access, business logic, and presentation layers
- [ ] Apply defensive programming: validate all inputs at system boundaries
- [ ] Resist feature creep — ask "do we need this now?" (YAGNI) before adding complexity
- [ ] Prefer simple, readable solutions over clever, compact ones (KISS)
- [ ] Write tests that verify contracts, not implementation details
- [ ] Document the *why*, not the *what*

---

## When to Use

Use this skill when:

- Starting a new module, feature, or service from scratch
- Refactoring a tangled codebase to improve modularity and reduce coupling
- Conducting a code review where maintainability concerns arise
- Onboarding a developer and establishing engineering standards for the team
- Making architectural trade-offs between speed of delivery and long-term maintainability

---

## When NOT to Use

Avoid this skill for:

- One-off scripts or throwaway prototypes (overhead outweighs benefit)
- Performance-critical inner loops where micro-optimizations dominate (profile first, apply principles after)
- Situations with hard real-time constraints where simplicity in execution matters more than modularity

---

## Core Workflow

1. **Identify Natural Boundaries** — Analyze the problem domain to find logical modules. Each module should own its data and expose a minimal interface.
   **Checkpoint:** Can you describe this module's purpose in one sentence without mentioning internal implementation details?

2. **Apply Separation of Concerns** — Split code into layers: data persistence, business rules, and I/O (API/UI). Dependencies flow inward; never outward.
   **Checkpoint:** Does the business logic layer import anything from the data access or presentation layer? If yes, refactor.

3. **Design for Testability** — Inject dependencies rather than constructing them inside modules. Every public function should be callable with deterministic inputs.
   **Checkpoint:** Can you unit-test this module's core logic without spinning up a database, network, or file system?

4. **Enforce Defensive Boundaries** — Validate all external inputs at the system perimeter (API endpoints, CLI arguments, configuration files). Fail fast with clear error messages.
   **Checkpoint:** Are there any `try/except` blocks swallowing errors silently? If yes, replace with explicit validation or re-raise with context.

5. **Apply YAGNI and KISS** — Resist adding abstractions, generic interfaces, or "just in case" features. Implement only what is required for the current specification.
   **Checkpoint:** Would removing this abstraction change any existing behavior? If not, remove it.

6. **Review Coupling and Cohesion** — Measure how tightly modules are connected (coupling) versus how focused each module is (cohesion). High coupling + low cohesion = technical debt.
   **Checkpoint:** Can you swap out one module's implementation without touching more than three other modules?

---

## Implementation Patterns

### Pattern 1: Single Responsibility Modules

A module should have exactly one reason to change. Group related functionality together and keep unrelated concerns separate.

```python
# ❌ BAD: Violates single responsibility — handles parsing, validation, DB access, and formatting
class OrderProcessor:
    def process(self, raw_data):
        parsed = json.loads(raw_data)  # parsing concern
        if not self.validate(parsed):  # validation concern
            return None
        order_id = self.db.insert(parsed)  # persistence concern
        return f"Order {order_id} created"  # formatting concern

# ✅ GOOD: Separated concerns into focused modules
from dataclasses import dataclass

@dataclass
class Order:
    item_id: str
    quantity: int
    customer_email: str

class OrderParser:
    """Handles deserialization of raw data into Order objects."""
    def parse(self, raw_data: str) -> Order: ...

class OrderValidator:
    """Validates business rules for an Order instance."""
    def validate(self, order: Order) -> bool: ...

class OrderRepository:
    """Manages persistence of Order instances to the database."""
    def save(self, order: Order) -> str: ...

class OrderService:
    """Orchestrates parsing, validation, and persistence."""
    def __init__(self, parser: OrderParser, validator: OrderValidator, repository: OrderRepository):
        self.parser = parser
        self.validator = validator
        self.repository = repository

    def process(self, raw_data: str) -> str:
        order = self.parser.parse(raw_data)  # Step 1
        if not self.validator.validate(order):  # Step 2
            raise ValueError("Order validation failed")
        order_id = self.repository.save(order)  # Step 3
        return f"Order {order_id} created"     # Step 4 (formatting belongs here as the final output)
```

### Pattern 2: Defensive Programming with Explicit Validation

Never trust external input. Validate at system boundaries and fail loudly with actionable errors.

```python
# ❌ BAD: Silent failure, implicit assumptions, no validation
def calculate_discount(price, code):
    discounts = {"SAVE10": 0.10, "SAVE20": 0.20}
    return price * (1 - discounts[code])  # KeyError if code is invalid, wrong type crashes silently

# ✅ GOOD: Explicit validation, clear error contracts, fails fast
from typing import Final

VALID_DISCOUNT_CODES: Final = {"SAVE10", "SAVE20"}

class ValidationError(Exception):
    """Raised when input violates business rules."""
    pass

def calculate_discount(price: float, code: str) -> float:
    """Apply a discount code to a price. Returns the final price after discount.
    
    Args:
        price: Original price (must be positive).
        code: Discount code (must be one of the valid codes).
        
    Returns:
        Final price as a float, rounded to 2 decimal places.
        
    Raises:
        ValidationError: If inputs are invalid or the code is unrecognized.
    """
    if not isinstance(price, (int, float)) or price <= 0:
        raise ValidationError(f"Price must be a positive number, got: {price}")
    if not isinstance(code, str):
        raise ValidationError(f"Discount code must be a string, got: {type(code).__name__}")
    
    discount_rate = VALID_DISCOUNT_CODES.get(code)
    if discount_rate is None:
        raise ValidationError(f"Invalid discount code: '{code}'. Valid codes: {', '.join(sorted(VALID_DISCOUNT_CODES))}")
    
    return round(price * (1 - discount_rate), 2)
```

### Pattern 3: Dependency Injection for Testability

Inject dependencies through constructors or function parameters rather than importing them directly. This enables testing in isolation and swapping implementations.

```python
# ❌ BAD: Tight coupling to external service — impossible to unit test without network access
class NotificationService:
    def send(self, user_email: str, message: str) -> bool:
        # Directly creates a connection every time
        import smtplib
        server = smtplib.SMTP("smtp.example.com")
        server.login("app@example.com", "password")  # credentials hardcoded
        server.sendmail("noreply@example.com", user_email, message)
        return True

# ✅ GOOD: Dependency injection — email sender is swapped at runtime (production vs. test)
from abc import ABC, abstractmethod
import smtplib

class EmailSender(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None: ...

class SmtpEmailSender(EmailSender):
    def __init__(self, host: str = "smtp.example.com", port: int = 587):
        self.host = host
        self.port = port
        
    def send(self, to: str, subject: str, body: str) -> None:
        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login("app@example.com", "password")
            server.sendmail("noreply@example.com", to, f"Subject: {subject}\n\n{body}")

class InMemoryEmailSender(EmailSender):
    """No-op sender for testing. Stores sent emails in memory."""
    def __init__(self):
        self.sent_emails: list[dict] = []
        
    def send(self, to: str, subject: str, body: str) -> None:
        self.sent_emails.append({"to": to, "subject": subject, "body": body})

class NotificationService:
    def __init__(self, sender: EmailSender):
        self.sender = sender  # Decoupled from concrete implementation
        
    def notify(self, user_email: str, message: str) -> None:
        if not user_email or "@" not in user_email:
            raise ValidationError(f"Invalid email address: {user_email}")
        self.sender.send(user_email, "Notification", message)
```

---

## Constraints

### MUST DO
- Give each module a single, clearly documented responsibility (one-sentence test)
- Validate all external inputs at system boundaries before they enter business logic
- Inject dependencies via constructor or function parameters; never instantiate collaborators inside methods
- Write unit tests that verify contracts with mocks/stubs — no real I/O in unit tests
- Prefer composition over inheritance for reusing behavior
- Document the *why* behind non-obvious decisions; don't document what the code does (the code speaks for itself)
- Keep functions small: if a function exceeds 30 lines, ask whether it's doing too much

### MUST NOT DO
- Build abstractions for problems you don't have yet (YAGNI) — generic interfaces that are only ever used once are dead weight
- Use exceptions for control flow in performance-critical paths — validate first, then execute
- Silently swallow errors with bare `except:` or `pass` blocks — always log or re-raise with context
- Hardcode configuration values (ports, endpoints, credentials) inside application logic — externalize to config files or environment variables
- Mix persistence queries with business logic in the same function — keep data access and domain rules separate
- Rely on implicit type coercion — use explicit type hints and runtime validation for public interfaces

---

## Output Template

When applying this skill to review or implement code, produce:

1. **Architecture Assessment** — How well does the code follow separation of concerns? List any violations.
2. **Coupling & Cohesion Score** — Rate each module's cohesion (high/medium/low) and identify cross-module dependencies that could be reduced.
3. **Defensive Programming Gaps** — Point out unvalidated inputs, silent error handling, or implicit assumptions.
4. **YAGNI/KISS Review** — Flag abstractions, generic interfaces, or features that are not required by the current spec.
5. **Refactoring Recommendations** — Concrete, ordered steps to improve modularity with estimated effort per step.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Apply these principles during peer review to catch architectural drift early |
| `coding-testing` | Complementary testing strategies that verify engineering contracts and module boundaries |
| `coding-error-handling` | Deep dive into error handling patterns that complement defensive programming |
| `coding-refactoring` | Practical techniques for untangling high-coupling, low-cohesion codebases |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — Software Engineering Principles](https://en.wikipedia.org/wiki/Software_engineering_principles)
- [IEEE 730 — IEEE Standard for Software Quality Assurance Processes](https://standards.ieee.org/standard/730-2014.html)
- [ISO/IEC/IEEE 15288 — Systems and Software Engineering — Life Cycle Processes](https://www.iso.org/standard/65694.html)
- [Robert Martin — Clean Architecture: Principles of Software Design](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles by Robert C. Martin](https://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod)
