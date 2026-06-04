---




name: engineering-principle-conflicts
description: Resolves contradictions between SOLID, DRY, KISS, and YAGNI principles using a structured decision framework with trade-off analysis and domain-context scoring for architecture decisions.
license: MIT
compatibility: opencode
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
metadata:
  version: "1.0.0"
  domain: coding
  triggers: principle conflicts, SOLID contradictions, DRY fragility, KISS vs abstraction, YAGNI tradeoffs, SRP vs ISP, architecture decision framework, premature abstraction
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: engineering-principles, software-design-principles, design-patterns-and-principles, software-engineering-principles




---





# Engineering Principle Conflict Resolver

Senior engineer resolving contradictions between established software engineering principles. When SOLID rules, DRY, KISS, and YAGNI pull in opposite directions, this skill provides a structured framework to identify the lesser evil, measure trade-offs objectively, and make defensible architectural decisions rather than dogmatic ones.

## TL;DR Checklist

- [ ] Identify which two (or more) principles are in conflict before choosing a direction
- [ ] Score each option against domain-specific impact: team size, change frequency, platform maturity
- [ ] Prefer the violation that causes less structural damage — SRP broken is worse than DRY broken
- [ ] Document the trade-off decision with a brief rationale comment at the abstraction boundary
- [ ] When KISS and abstraction conflict, start simple and add structure only after two real use cases emerge

---

## When to Use

Use this skill when:

- Two or more established principles produce contradictory recommendations for the same design decision
- A code review debates whether to extract a shared interface (SRP/DRY) vs keep things simple (KISS)
- The team is stuck in "architecture astronaut" mode debating principle purity instead of shipping value
- A junior engineer asks "which principle should I follow?" when they conflict
- You need to justify an architectural choice that violates one principle to serve another more critical need
- Refactoring legacy code where all available options break at least one principle

---

## When NOT to Use

Avoid this skill for:

- Routine code organization where no principles actually conflict (just apply the strongest principle)
- First-time implementations with zero history — default to KISS and add structure when evidence demands it
- Security or compliance decisions — these have fixed requirements, not trade-off dilemmas
- Performance-critical paths where measurable metrics override principle concerns
- Situations where a design pattern directly solves the problem (use `design-patterns-and-principles` instead)

---

## Core Workflow

1. **Identify the Conflict** — Explicitly state which two (or more) principles contradict each other. Name them both. A conflict exists only when following Principle A makes violating Principle B unavoidable or significantly harder.
   **Checkpoint:** If you can satisfy both principles simultaneously, there is no conflict — apply both.

2. **Assess Domain Context** — Evaluate four contextual factors: (a) team size and experience level, (b) expected change frequency for this component, (c) platform maturity (new product vs stabilized system), (d) regulatory or operational constraints.
   **Checkpoint:** At least two of the four factors must influence the decision. If all are neutral, default to KISS.

3. **Score Each Option** — For every viable design option, score 1-5 against each conflicting principle and each domain factor from step 2. A score of 1 means "severely violates," 3 means "acceptable compromise," 5 means "fully satisfies."
   **Checkpoint:** The option with the highest total weighted score is the candidate. If scores are within 10%, the decision is contextual — see Step 4.

4. **Apply the Hierarchy of Damage** — When scores tie, use this default severity order (least damaging violation first): DRY < KISS < ISP < SRP < YAGNI < LSP. Breaking DRY creates maintenance overhead. Breaking LSP introduces runtime failures. This hierarchy is a tie-breaker, not an absolute rule.
   **Checkpoint:** Document why you are departing from the default hierarchy — unusual contexts may warrant reordering.

5. **Implement with Explicit Trade-off Acknowledgment** — Write code that satisfies one principle while acknowledging the violation in a concise comment at the abstraction boundary. Use a structured format: `# [PRINCIPLE] trade-off: <description>`.
   **Checkpoint:** The comment must state which principle is being sacrificed and why, not just "TODO refactor."

6. **Plan for Reversal** — Mark any deliberate principle violation with an evolution tag. If the context changes (team grows, requirements stabilize), the decision may need to be revisited. Tag code with `# EVOLVE: <condition>` where future engineers should re-evaluate.
   **Checkpoint:** Every deliberate violation must have a condition under which it would be revisited — never make an irreversible compromise.

---

## Principle Conflict Scenarios

### Conflict 1: SRP vs ISP (Single Responsibility vs Interface Segregation)

SRP says a class should have one reason to change. ISP says interfaces should be small and client-specific. These contradict when a single responsibility requires exposing many method signatures — ISP forces you to split the interface, but each fragment alone doesn't represent a complete "responsibility" that a client needs.

#### ❌ BAD — SRP Blindly Wins: Massive Interface with One Implementation

```python
# This class has one responsibility: manage all user operations.
# But the interface is bloated because ISP is ignored.
class UserManager:
    """Handles all user-related operations in one class with one responsibility."""

    def __init__(self) -> None:
        self._db = DatabaseConnection()  # One responsibility, but...

    # Every client that needs only auth has to depend on ALL these methods.
    # ISP violation: clients are forced to depend on methods they never call.
    def create_user(self, email: str, password: str) -> int: ...
    def update_profile(self, user_id: int, data: dict) -> bool: ...
    def delete_user(self, user_id: int) -> bool: ...
    def authenticate(self, email: str, password: str) -> int | None: ...
    def reset_password(self, user_id: int) -> bool: ...
    def get_permissions(self, user_id: int) -> list[str]: ...
    def assign_role(self, user_id: int, role: str) -> bool: ...
    def revoke_role(self, user_id: int, role: str) -> bool: ...
    def log_activity(self, user_id: int, action: str) -> bool: ...
    def get_audit_log(self, user_id: int, since: datetime) -> list[dict]: ...


# AuthController depends on create_user and update_profile — it never needs delete or audit.
# But the interface forces this dependency anyway. This is ISP violation in action.
class AuthController:
    def __init__(self, user_manager: UserManager) -> None:
        self._manager = user_manager

    def login(self, email: str, password: str) -> int | None:
        return self._manager.authenticate(email, password)  # Only needs this one method


# UserService depends on create_user and delete_user — it never authenticates or audits.
# Yet the contract says it COULD do those things too. Interface pollution.
class UserService:
    def __init__(self, user_manager: UserManager) -> None:
        self._manager = user_manager

    def register(self, email: str, password: str) -> int:
        return self._manager.create_user(email, password)  # Only needs this one method
```

**Why this is bad:** `AuthController` depends on `UserManager`'s full interface — it could accidentally call `delete_user()` or `get_audit_log()`. The contract promises more than the client needs. ISP violation creates fragile dependencies and misleading APIs.

#### ✅ GOOD — ISP Wins: Split Interfaces, Keep Implementation Cohesive

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


# === SMALL, CLIENT-SPECIFIC INTERFACES (ISP) ===

@dataclass(frozen=True)
class CreateUserRequest:
    email: str
    password: str


@dataclass(frozen=True)
class AuthCredentials:
    email: str
    password: str


class UserCreation(ABC):
    """Interface for creating users only. Minimal contract."""

    @abstractmethod
    def create(self, request: CreateUserRequest) -> int: ...


class UserAuthentication(ABC):
    """Interface for authenticating users only. Minimal contract."""

    @abstractmethod
    def authenticate(self, creds: AuthCredentials) -> int | None: ...


class UserProfileManagement(ABC):
    """Interface for updating user profiles. No creation, no auth, no deletion."""

    @abstractmethod
    def update_profile(self, user_id: int, data: dict) -> bool: ...


class UserDeletion(ABC):
    """Interface for deleting users only."""

    @abstractmethod
    def delete(self, user_id: int) -> bool: ...


# === IMPLEMENTATION COMPOSES ALL INTERFACES (SRP preserved within implementation) ===

class UserManager:
    """Single responsibility: coordinate all user operations.
    
    # [SRP] trade-off: This class implements multiple small interfaces from ISP,
    # but they all serve the single responsibility of user lifecycle management.
    # The interfaces are client-facing; the class is the unified implementation.
    """

    def __init__(self, database: DatabaseConnection) -> None:
        self._db = database

    # UserCreation
    def create(self, request: CreateUserRequest) -> int:
        hashed = _hash_password(request.password)
        user_id = self._db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (request.email, hashed),
        )
        return user_id

    # UserAuthentication
    def authenticate(self, creds: AuthCredentials) -> int | None:
        user = self._db.fetch_one(
            "SELECT id FROM users WHERE email = ?", (creds.email,)
        )
        if user and _verify_password(user["id"], creds.password):
            return user["id"]
        return None

    # UserProfileManagement
    def update_profile(self, user_id: int, data: dict) -> bool:
        fields = ", ".join(f"{k} = ?" for k in data)
        values = list(data.values()) + [user_id]
        return self._db.execute(f"UPDATE users SET {fields} WHERE id = ?", values)

    # UserDeletion
    def delete(self, user_id: int) -> bool:
        return self._db.execute("DELETE FROM users WHERE id = ?", (user_id,))


# === CONTROLLERS DEPEND ONLY ON THEIR NEEDED INTERFACES ===

class AuthController:
    # AuthController depends only on UserAuthentication — clean ISP.
    def __init__(self, auth: UserAuthentication) -> None:
        self._auth = auth

    def login(self, email: str, password: str) -> int | None:
        return self._auth.authenticate(AuthCredentials(email, password))


class RegistrationController:
    # RegistrationController depends only on UserCreation — clean ISP.
    def __init__(self, creator: UserCreation) -> None:
        self._creator = creator

    def register(self, email: str, password: str) -> int:
        return self._creator.create(CreateUserRequest(email, password))


class AdminUserService:
    # Admin service needs both creation and deletion — but not auth or profile management.
    def __init__(self, creator: UserCreation, deleter: UserDeletion) -> None:
        self._creator = creator
        self._deleter = deleter

    def bulk_import(self, emails: list[str], default_password: str) -> list[int]:
        return [
            self._creator.create(CreateUserRequest(email, default_password))
            for email in emails
        ]

    def terminate_account(self, user_id: int) -> bool:
        return self._deleter.delete(user_id)
```

**Why this works:** Each interface has exactly the methods its clients need. `AuthController` literally cannot call `delete()`. The implementation (`UserManager`) still has a single responsibility — managing users — but the contracts are properly segregated. This is the rare case where ISP wins over a naive reading of SRP: splitting interfaces doesn't split responsibilities, it splits concerns.

---

### Conflict 2: DRY vs KISS (Don't Repeat Yourself vs Keep It Simple)

DRY demands extracting shared logic into a single abstraction. KISS demands simplicity and avoiding unnecessary complexity. The conflict arises when you extract code too early — the abstraction exists for only one use case, or the generalization introduces parameters and branches that make the simple case harder to understand.

#### ❌ BAD — DRY Blindly Wins: Premature Abstraction Creates Indirection Overhead

```python
# Four different callers need slightly different "format a value" logic.
# DRY says: extract it once. But the differences are small and domain-specific.

class FormatterFactory:
    """Factory that creates formatters — but we only need ONE formatter right now."""

    _registry: dict[str, type["ValueFormatter"]] = {}

    @classmethod
    def register(cls, name: str, formatter_class: type["ValueFormatter"]) -> None:
        cls._registry[name] = formatter_class

    @classmethod
    def create(cls, name: str) -> "ValueFormatter":
        if name not in cls._registry:
            raise KeyError(f"Unknown formatter: {name}")
        return cls._registry[name]()


class ValueFormatter(ABC):
    """Abstract base for value formatters — 100 lines of boilerplate for 3 simple cases."""

    @abstractmethod
    def format(self, value: float) -> str: ...

    @abstractmethod
    def get_name(self) -> str: ...


class PercentageFormatter(ValueFormatter):
    def __init__(self, decimals: int = 1) -> None:
        self._decimals = decimals

    def format(self, value: float) -> str:
        return f"{value:.{self._decimals}f}%"

    def get_name(self) -> str:
        return "percentage"


class CurrencyFormatter(ValueFormatter):
    def __init__(self, symbol: str = "$", decimals: int = 2) -> None:
        self._symbol = symbol
        self._decimals = decimals

    def format(self, value: float) -> str:
        return f"{self._symbol}{value:.{self._decimals}f}"

    def get_name(self) -> str:
        return "currency"


class UnitFormatter(ValueFormatter):
    def __init__(self, unit: str = "", decimals: int = 0) -> None:
        self._unit = unit
        self._decimals = decimals

    def format(self, value: float) -> str:
        return f"{value:.{self._decimals}f}{self._unit}"

    def get_name(self) -> str:
        return "unit"


# Registration boilerplate — only needed because of the factory pattern.
# If you need to understand how percentage formatting works, you trace through
# three classes and a factory registry instead of reading one function.
FormatterFactory.register("percentage", PercentageFormatter)
FormatterFactory.register("currency", CurrencyFormatter)
FormatterFactory.register("unit", UnitFormatter)


def render_metric(key: str, value: float, fmt_type: str = "percentage") -> str:
    """Render a metric value with formatting — but goes through factory + ABC for what's one match statement."""
    formatter = FormatterFactory.create(fmt_type)  # Factory indirection
    formatted = formatter.format(value)             # Virtual dispatch
    return f"{key}: {formatted}"                    # Simple output after complex setup


# If tax_rate changes, you change the default in CurrencyFormatter.
# But to understand that, you need to find the registry, trace through ABC,
# and navigate factory pattern — for a function that does simple string formatting.
```

**Why this is bad:** Four different format types exist, but they are each three lines of logic. The factory adds five classes, an abstract base, a registry, and indirection for what could be one straightforward function. DRY was applied prematurely — there's no duplication because each caller passes different parameters to the same simple operation.

#### ✅ GOOD — KISS Wins: Simple Function With Pattern Match, Evolvable Later

```python
from enum import Enum, auto


class FormatType(Enum):
    """Supported value formatting modes. Extend only when a second real use case appears."""
    PERCENTAGE = auto()
    CURRENCY = auto()
    UNIT = auto()
    RAW = auto()


def format_value(
    value: float,
    fmt_type: FormatType = FormatType.PERCENTAGE,
    symbol: str = "$",
    unit: str = "",
    decimals: int | None = None,
) -> str:
    """
    Format a numeric value using the specified format type.

    Simple one-function solution handles all formatting modes. No factory, no ABC,
    no registry. If you need to understand how percentage formatting works,
    read this function — that's it.

    Args:
        value: The numeric value to format.
        fmt_type: The formatting mode to apply.
        symbol: Currency symbol (used only when fmt_type is CURRENCY).
        unit: Unit suffix (used only when fmt_type is UNIT).
        decimals: Decimal precision. Auto-selected per type if None.

    Returns:
        The formatted string representation.

    Raises:
        ValueError: If fmt_type is unknown or parameters are incompatible.
    """
    # Guard clause — fail fast with clear error message
    if not isinstance(value, (int, float)):
        raise TypeError(f"Expected numeric value, got {type(value).__name__}")

    if decimals is None:
        match fmt_type:
            case FormatType.PERCENTAGE:
                decimals = 1
            case FormatType.CURRENCY:
                decimals = 2
            case FormatType.UNIT:
                decimals = 0
            case FormatType.RAW:
                decimals = 6

    # Direct dispatch — no factory, no indirection, no virtual methods.
    # One function, one control flow graph. Read it top to bottom and understand everything.
    match fmt_type:
        case FormatType.PERCENTAGE:
            return f"{value:.{decimals}f}%"
        case FormatType.CURRENCY:
            return f"{symbol}{value:.{decimals}f}"
        case FormatType.UNIT:
            return f"{value:.{decimals}f}{unit}"
        case FormatType.RAW:
            return f"{value:.{decimals}f}"
        case _:
            raise ValueError(f"Unknown format type: {fmt_type}")


def render_metric(key: str, value: float, fmt_type: FormatType = FormatType.PERCENTAGE) -> str:
    """Render a metric with its formatted value. Direct and obvious."""
    formatted = format_value(value, fmt_type=fmt_type)
    return f"{key}: {formatted}"


# If you later need a fifth format type (e.g., scientific notation),
# you add one enum value and one match arm — no factory registration,
# no new class, no architectural ceremony. Evolution is cheap because the structure is simple.

# Usage — clean and direct:
print(render_metric("Growth", 12.5))           # "Growth: 12.5%"
print(render_metric("Revenue", 4999.00))        # "Revenue: $4,999.00"
print(render_metric("Distance", 150.7, FormatType.UNIT, unit=" km"))  # "Distance: 150.7km"
```

**Why this works:** The problem is simple — format a number in different ways. One function with an enum and pattern matching handles it cleanly. When the fifth format type arrives, you add one line. The cost of adding a new formatter (one match arm) is lower than the cost of understanding the factory (five classes, registry, ABC). DRY was correctly deferred because there was no actual duplication — just parameter variation on simple logic.

---

### Conflict 3: YAGNI vs Extensibility Needs

YAGNI says "you aren't going to need it" — don't build abstractions for future use cases that haven't been specified. But experienced engineers recognize patterns where the next use case is almost certain. The conflict: build the abstraction now and risk over-engineering, or wait until it's needed and deal with refactoring pain.

#### ❌ BAD — YAGNI Blindly Wins: Refactoring Pain When Next Use Case Arrives

```python
# Early stage: only CSV export is needed for reports.
# YAGNI says: don't build an export framework. Just write a CSV function.

def generate_report_csv(report_data: list[dict], filename: str) -> str:
    """Generate a CSV report file. Works fine until someone needs JSON or PDF."""
    import csv
    import io

    output = io.StringIO()
    if not report_data:
        raise ValueError("Report data is empty")

    writer = csv.DictWriter(output, fieldnames=report_data[0].keys())
    writer.writeheader()
    writer.writerows(report_data)

    with open(filename, "w", newline="") as f:
        f.write(output.getvalue())

    return filename


# Six months later: product team requests JSON export for their dashboard.
# The CSV function has to be refactored into something reusable — but it wasn't designed for that.
# You end up copying the logic and modifying it, which violates DRY anyway.

def generate_report_json(report_data: list[dict], filename: str) -> str:
    """Now you need this too — but it's almost identical to CSV generation above."""
    import json

    with open(filename, "w") as f:
        json.dump(report_data, f, indent=2, default=str)

    return filename


# Now the reporting module has duplicated "validate data is non-empty" logic,
# duplicated "write to file" logic, and duplicated "return filename" logic.
# Three months later: they want Excel export too. You're starting to see the pattern.


class ReportExporter:
    """Retrofitted export framework — built after the pain point proved itself."""

    def __init__(self, report_data: list[dict]) -> None:
        if not report_data:
            raise ValueError("Report data is empty")  # Same validation as CSV function above
        self._data = report_data

    def export_csv(self, filename: str) -> str:
        import csv
        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=self._data[0].keys())
        writer.writeheader()
        writer.writerows(self._data)
        with open(filename, "w", newline="") as f:
            f.write(output.getvalue())
        return filename

    def export_json(self, filename: str) -> str:
        with open(filename, "w") as f:
            json.dump(self._data, f, indent=2, default=str)
        return filename

# The refactored class is better than the standalone functions — but it was built reactively.
# A proactively designed framework would have been cleaner and wouldn't require migrating existing callers.
```

**Why this is bad:** YAGNI prevented building the export abstraction, which resulted in code duplication when the second format was needed, followed by a reactive refactoring that produced an imperfect solution. The cost of building the abstraction upfront (one hour) was far less than the cost of duplicating and refactoring later (four hours across three team members).

#### ✅ GOOD — Balanced Approach: Interface-First, Lightweight Implementation

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Protocol


# === EXTENSIBILITY BOUNDARY: Define the contract first, implement what's needed now. ===

class ReportFormat(Protocol):
    """Contract for any report export format.
    
    # [YAGNI] trade-off: Defining this protocol now adds minimal overhead (4 lines)
    # but prevents duplication when additional formats are needed later.
    # The cost of an interface is near-zero; the cost of duplicating logic is high.
    """

    @abstractmethod
    def export(self, data: list[dict], output_path: Path) -> Path: ...


class CsvReportFormatter:
    """CSV export implementation — the only format needed right now."""

    def export(self, data: list[dict], output_path: Path) -> Path:
        if not data:
            raise ValueError("Report data is empty")

        import csv

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        return output_path


class JsonReportFormatter:
    """JSON export implementation — added when the second format was actually requested."""

    def export(self, data: list[dict], output_path: Path) -> Path:
        import json

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(data, f, indent=2, default=str)
        return output_path


@dataclass(frozen=True)
class ReportExportRequest:
    """Immutable request object for report export operations."""
    data: list[dict]
    format_name: str = "csv"  # Default — change when a second real use case appears
    output_dir: Path = field(default_factory=Path.cwd / "exports")


class ReportExporter:
    """Orchestrates report exports using the strategy pattern.
    
    The exporter itself was built at the same time as CSV because:
    1) The contract (ReportFormat protocol) costs almost nothing to define
    2) The orchestration logic (path handling, validation) is shared across formats
    3) Adding a new format later requires zero changes to this class
    
    # [YAGNI] trade-off: We built the orchestrator alongside CSV because the
    # shared logic (validation, path management, error handling) would have been
    # duplicated regardless. The strategy pattern itself was deferred until the
    # second format arrived — we only needed one formatter at first.
    """

    def __init__(self) -> None:
        # Registry starts empty — formatters are added as they're implemented
        self._formatters: dict[str, ReportFormat] = {}

    def register(self, name: str, formatter: ReportFormat) -> None:
        """Register a format implementation. Called once per format at startup."""
        if name in self._formatters:
            raise ValueError(f"Format already registered: {name}")
        self._formatters[name] = formatter

    def export(self, request: ReportExportRequest) -> Path:
        """Export report data using the specified format.
        
        Validation and path management are shared — this is why the orchestrator
        existed even before there were two formats.
        """
        if not request.data:
            raise ValueError("Report data is empty")

        formatter = self._formatters.get(request.format_name)
        if formatter is None:
            available = ", ".join(sorted(self._formatters.keys()))
            raise KeyError(
                f"Unknown format: {request.format_name!r}. "
                f"Available formats: {available}"
            )

        output_path = request.output_dir / f"report_{request.format_name}.csv"
        # Note: filename extension doesn't change per-format; caller handles that.
        return formatter.export(request.data, output_path)


# === USAGE — Simple for single format, extensible for multiple ===

exporter = ReportExporter()
exporter.register("csv", CsvReportFormatter())
# No JSON formatter yet — YAGNI respected: it wasn't built until needed.

# When JSON is actually requested (6 months later):
# 1) Implement JsonReportFormatter (8 lines of code)
# 2) Call exporter.register("json", JsonReportFormatter()) at startup
# 3) No changes to ReportExporter or CsvReportFormatter required
# Total effort: ~15 minutes. Zero refactoring of existing code.

# Current usage — no unnecessary complexity for single-format case:
request = ReportExportRequest(
    data=[{"name": "Q1 Revenue", "value": 49990.00}],
    format_name="csv",
)
result_path = exporter.export(request)
```

**Why this works:** The protocol was defined immediately (near-zero cost), the orchestrator was built alongside CSV because its shared logic (validation, path handling) justified it regardless of format count, but the second format implementation was deferred until actually needed. This respects YAGNI for implementations while providing extensibility through contracts — the sweet spot between dogmatic YAGNI and over-engineering.

---

### Conflict 4: LSP vs SRP (Liskov Substitution vs Single Responsibility)

LSP says a subclass must be usable wherever its base class is expected, without surprising behavior. SRP says each class should have one reason to change. These conflict when a specialized subclass needs methods that don't make sense for the base class — overriding a base method with `NotImplementedError` or raising exceptions violates LSP.

#### ❌ BAD — SRP Blindly Wins: NotImplemented Overrides Break Substitution

```python
from abc import ABC, abstractmethod


class PaymentProcessor(ABC):
    """Base payment processor — designed to have one responsibility per subclass."""

    @abstractmethod
    def process_payment(self, amount: float) -> str: ...

    @abstractmethod
    def refund(self, transaction_id: str, amount: float) -> bool: ...

    @abstractmethod
    def schedule_recurring(self, customer_id: str, interval: str) -> str: ...


class CreditCardProcessor(PaymentProcessor):
    """Processes credit card payments. Has everything the base contract requires."""

    def process_payment(self, amount: float) -> str:
        return f"CC charge: ${amount:.2f}"

    def refund(self, transaction_id: str, amount: float) -> bool:
        return True  # Credit cards support refunds natively

    def schedule_recurring(self, customer_id: str, interval: str) -> str:
        # Credit card processors CAN do recurring billing, but it's a different
        # concern from one-time payments. SRP says this should be in a separate class.
        # But LSP (via the base class) requires this method to exist and work.
        return f"Recurring scheduled for customer {customer_id}"


class CryptocurrencyProcessor(PaymentProcessor):
    """Processes cryptocurrency payments. Crypto has fundamental differences."""

    def process_payment(self, amount: float) -> str:
        return f"TX pending: ${amount:.2f}"

    def refund(self, transaction_id: str, amount: float) -> bool:
        # Cryptocurrency transactions are IRREVERSIBLE on most chains.
        # We can't actually refund — we must issue a separate credit.
        # But the base class says we CAN refund, which is a lie.
        # Option A: Override with NotImplementedError → LSP violation!
        # Option B: Pretend to refund and create fake transaction IDs → data integrity risk.
        raise NotImplementedError(
            "Cryptocurrency refunds not supported — use issue_credit() instead"
        )

    def schedule_recurring(self, customer_id: str, interval: str) -> str:
        # Crypto payments can't be automatically recurring because each transaction
        # requires explicit blockchain confirmation. But the base contract demands it.
        raise NotImplementedError(
            "Recurring crypto payments not supported — requires manual renewal"
        )


# When calling code expects any PaymentProcessor to support refund():
def handle_order_cancel(order: Order, processor: PaymentProcessor) -> bool:
    """Cancel an order and process the refund."""
    # This works for CreditCardProcessor but CRASHES for CryptocurrencyProcessor.
    # LSP violation: CryptocurrencyProcessor cannot be substituted where
    # PaymentProcessor is expected without breaking the contract.
    return processor.refund(order.transaction_id, order.total)


# The fix in production code becomes ugly:
def handle_order_cancel_safe(order: Order, processor: PaymentProcessor) -> bool:
    """Try to cancel — but must handle LSP-violating subclasses gracefully."""
    try:
        return processor.refund(order.transaction_id, order.total)
    except NotImplementedError:
        # Workaround for LSP violations caused by SRP-driven class design.
        # This is defensive code that shouldn't be needed if principles were aligned.
        return False  # Silently fails — bad UX and hard to debug


# The real issue: the base class contract is too broad. It assumes all payment
# processors share the same capabilities, which no single abstraction can capture
# without becoming a god interface (ISP violation) or forcing broken overrides (LSP).
```

**Why this is bad:** `CryptocurrencyProcessor` breaks LSP by raising `NotImplementedError` on methods inherited from `PaymentProcessor`. Call code must add try/except workarounds. The base class contract made assumptions about capability that aren't universally true. SRP pushed toward specialized classes, but the inheritance hierarchy didn't accommodate those specializations safely.

#### ✅ GOOD — LSP Wins: Smaller Base Contract With Capability Protocols

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass


class PaymentProcessor(ABC):
    """Base payment processor with MINIMAL guaranteed contract.
    
    # [LSP] trade-off: The base class only requires process_payment because that's the
    # ONLY capability all payment processors share. Refunds and recurring billing are
    # optional capabilities expressed through separate protocols, not base methods.
    This makes LSP violation impossible — subclasses can't promise what they can't deliver.
    """

    @abstractmethod
    def process_payment(self, amount: float) -> str: ...


class RefundCapable(ABC):
    """Optional capability: this processor supports refunds."""

    @abstractmethod
    def refund(self, transaction_id: str, amount: float) -> bool: ...


class RecurringCapable(ABC):
    """Optional capability: this processor supports recurring billing."""

    @abstractmethod
    def schedule_recurring(self, customer_id: str, interval: str) -> str: ...


# === IMPLEMENTATIONS EXPLICITLY DECLARE THEIR CAPABILITIES ===

class CreditCardProcessor(PaymentProcessor, RefundCapable, RecurringCapable):
    """Full-featured processor: handles everything the base and optional capabilities require."""

    def process_payment(self, amount: float) -> str:
        return f"CC charge: ${amount:.2f}"

    def refund(self, transaction_id: str, amount: float) -> bool:
        # Native refund support — no LSP risk because caller checks for capability first
        return True

    def schedule_recurring(self, customer_id: str, interval: str) -> str:
        return f"Recurring scheduled for customer {customer_id} at {interval}"


class CryptocurrencyProcessor(PaymentProcessor):
    """Minimal processor: only guarantees payment processing.
    
    No LSP violation possible — we don't override anything from the base class,
    and optional capabilities simply aren't declared. Clean separation of concerns
    between SRP (specialized implementation) and LSP (minimal guaranteed contract).
    """

    def process_payment(self, amount: float) -> str:
        return f"TX pending: ${amount:.2f}"


class BankTransferProcessor(PaymentProcessor, RefundCapable):
    """Bank transfers support refunds but not recurring billing."""

    def process_payment(self, amount: float) -> str:
        return f"ACH transfer: ${amount:.2f}"

    def refund(self, transaction_id: str, amount: float) -> bool:
        # Bank refunds take 3-5 business days — different from instant CC refunds
        return True


# === CALL CODE USES CAPABILITY CHECKS — NOT BASE CLASS ASSUMPTIONS ===

def handle_order_cancel(order: Order, processor: PaymentProcessor) -> str | None:
    """Cancel an order and process the refund if supported.
    
    Instead of assuming all processors can refund (LSP violation), check
    for the capability explicitly. This is safe with any implementation.
    """
    if isinstance(processor, RefundCapable):
        return processor.refund(order.transaction_id, order.total)
    return "Refund not supported by this payment method"


def create_subscription(customer: Customer, amount: float, interval: str, processor: PaymentProcessor) -> str | None:
    """Create a recurring subscription if the processor supports it."""
    if isinstance(processor, RecurringCapable):
        return processor.schedule_recurring(customer.id, interval)
    return "Recurring billing not available for this payment method"


# === ADDING A NEW PROCESSOR IS SAFE BY CONSTRUCTION ===

class StablecoinProcessor(PaymentProcessor, RefundCapable):
    """Stablecoins support payments and on-chain refunds via smart contract."""

    def process_payment(self, amount: float) -> str:
        return f"USDC transfer: ${amount:.2f}"

    def refund(self, transaction_id: str, amount: float) -> bool:
        # On-chain refund — different mechanism than CC but same capability interface
        return True

    # No RecurringCapable — stablecoin recurring requires additional infrastructure
    # that doesn't exist yet. No pressure to implement it because the base contract
    # doesn't demand it. LSP is preserved.


# Composition of capabilities through multiple inheritance is safe here because:
# 1) PaymentProcessor (base) has only ONE abstract method — process_payment
# 2) Each capability protocol is independently composable — no diamond problem
# 3) A new processor can pick exactly the capabilities it supports
# 4) Call code checks isinstance() rather than trusting the base contract blindly
```

**Why this works:** The base class has a minimal, universally true contract. Optional capabilities are separate protocols that implementations opt into. `CryptocurrencyProcessor` doesn't override anything it can't support — it inherits cleanly from `PaymentProcessor`. Call code uses `isinstance` checks instead of trusting base class promises. LSP is preserved because substitution always works; SRP is preserved because each capability protocol has a single reason to change.

---

## Conflict Resolution Framework

When principles disagree, apply this decision process in order:

### Step 1 — Name the Conflict Precisely

Write it out explicitly: "Principle A says X, Principle B says Y, and doing both for this component is impractical." Vague conflicts lead to vague decisions. Example: "SRP wants one class per responsibility, but ISP wants small interfaces — yet each responsibility exposes ten methods that no single client needs all at once."

### Step 2 — Assess the Four Context Factors

| Factor | Question | High Impact When... |
|--------|----------|---------------------|
| **Team size** | How many developers touch this code? | >3 people → favor clarity over cleverness; ≤2 → favor simplicity |
| **Change frequency** | How likely is this component to change soon? | High → invest in structure; Low → keep it simple and defer |
| **Platform maturity** | Is this a prototype or a stabilized system? | Prototype → KISS dominates; Stabilized → DRY/SRP dominate |
| **Regulatory / operational** | Are there compliance or SLA constraints? | Yes → overrides principle debates entirely |

Score each factor as HIGH, MEDIUM, or LOW for your specific context. The factors with HIGH impact should receive extra weight in the decision.

### Step 3 — Evaluate Options Against Impact

For each design option:
1. How many principles does it violate? (fewer is better)
2. How severe are the violations? (see hierarchy below)
3. What's the cost of reversing this decision later? (low reversal cost favors waiting)

### Step 4 — Apply Default Severity Hierarchy (Tie-Breaker Only)

When options score equally, use this default ordering from least to most damaging violation:

```
DRY < KISS < ISP < SRP < YAGNI < LSP
```

| Violation | Why It's Ranked This Way |
|-----------|--------------------------|
| **DRY** (least damaging) | Duplication is annoying but never breaks functionality. Easy to fix later. |
| **KISS** | Extra abstraction costs development time but doesn't affect correctness. |
| **ISP** | Bloated interfaces create fragile dependencies but don't cause runtime failures. |
| **SRP** | God classes accumulate bugs and become unmaintainable over time. Structural damage. |
| **YAGNI** | Building for unproven needs wastes time on features nobody uses. Resource waste. |
| **LSP** (most damaging) | Broken substitution causes runtime crashes, incorrect behavior, and subtle bugs that are hard to reproduce. |

**Important:** This hierarchy is a DEFAULT for typical software projects. Domain-specific factors may override it — e.g., in financial systems, SRP violations (regulatory reporting mixed with trading logic) may rank higher than LSP.

### Step 5 — Document the Trade-Off

Every deliberate principle violation should have a comment explaining:
- Which principle was sacrificed
- Why it was the right choice for this context
- Under what condition future engineers should reconsider

```python
class PaymentProcessor:
    def process_payment(self, amount: float) -> str:
        # [DRY] trade-off: This 3-line validation repeats in CreditCardProcessor,
        # BankTransferProcessor, and CryptocurrencyProcessor. Extracting it to a
        # shared utility would add indirection for logic that rarely changes.
        if amount <= 0:
            raise ValueError("Payment amount must be positive")
```

### Step 6 — Plan the Reversal Condition

Tag code where the context might change and the decision should be revisited:

```python
# EVOLVE: If a third report format is requested, extract export logic into
# the strategy pattern defined in ReportExporter. Currently deferred per KISS.
def generate_csv_report(data: list[dict], filename: str) -> str: ...
```

---

## Constraints

### MUST DO
- Always name both conflicting principles explicitly before attempting resolution — never debate "the right approach" without identifying the specific tension
- Use the four context factors (team size, change frequency, platform maturity, regulatory constraints) as weighted inputs to every conflict decision — never decide in a vacuum
- Apply the severity hierarchy only as a tie-breaker after scoring options against actual domain factors
- Add a trade-off comment at the abstraction boundary whenever you deliberately violate a principle — state which principle and why
- Plan a reversal condition (`# EVOLVE:` tag) for every deliberate violation so future context changes can be accommodated
- Prefer composition over inheritance when resolving LSP vs SRP conflicts — capability protocols are safer than deep class hierarchies
- When KISS vs abstraction is the conflict, start with the simple solution and add structure only after two real use cases justify it

### MUST NOT DO
- Claim that one principle is "more important" than another in all situations — context determines which principle takes priority
- Add try/except `NotImplementedError` as a workaround for LSP violations — this is defensive coding around a design mistake, not a solution
- Create factories, abstract base classes, or registry patterns when two concrete implementations would suffice — premature abstraction is the #1 source of principle conflicts
- Leave deliberate principle violations undocumented — future engineers will inherit your trade-off without understanding why you made it
- Use "it's just a small violation" to dismiss structural damage — DRY violations compound exponentially; SRP violations create unmaintainable modules
- Apply YAGNI dogmatically in team environments where features are planned in multi-quarter roadmaps — predictability is a valid signal for early abstraction

---

## Related Skills

| Skill | Purpose |
|---|---|
| `engineering-principles` | Foundational coverage of SOLID, DRY, KISS, and separation of concerns when no conflicts exist — use this to understand each principle in isolation before navigating contradictions |
| `software-design-principles` | Broader design principle guidance including dependency injection and modular architecture — useful when a principle conflict involves architectural structure beyond code organization |
| `design-patterns-and-principles` | GoF design patterns that may resolve underlying conflicts by providing proven structural solutions — use when the conflict can be eliminated entirely through pattern selection |
| `software-engineering-principles` | Engineering discipline guidance including YAGNI and defensive programming — complementary when YAGNI vs extensibility is the core tension in your decision |

---

## Live References

> Authoritative references for software engineering principles and their practical application.

- [SOLID Principles Overview](https://en.wikipedia.org/wiki/SOLID)
- [DRY Principle (Martin Fowler)](https://martinfowler.com/bliki/DRY.html)
- [KISS Principle in Software Engineering](https://en.wikipedia.org/wiki/KISS_principle)
- [YAGNI Principle (Extreme Programming)](https://martinfowler.com/bliki/Yagni.html)
- [Liskov Substitution Principle - Barbara Liskov's Original Paper](https://research.microsoft.com/en-us/um/people/liskov/pubs/osdi94.pdf)
- [Interface Segregation Principle - Robert C. Martin](https://www.robertcmartin.com/articles/should-i-implement-an-interface-or-subclass)
