---
name: solid-anti-patterns
description: Detects and refactors SOLID anti-patterns in existing codebases — identifies SRP, OCP, LSP, ISP, and DIP violations through concrete code smells, then applies targeted refactoring patterns to restore clean architectural boundaries.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: solid anti-patterns, SOLID violations, refactoring SOLID, god class refactor, fragile base class, brittle hierarchy, tight coupling fix, interface pollution, dependency inversion violation, SRP violation, open closed violation, LSP violation, ISP violation, DIP refactoring, code smell detection, architectural debt
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - diagnostic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: single-responsibility, open-closed-principle, liskov-substitution-principle, interface-segregation-principle, dependency-inversion-principle
---

# SOLID Anti-Pattern Detection & Refactoring

Senior software architect diagnosing and remediating SOLID principle violations in existing codebases. This skill makes the model act as a diagnostician-engineer: scan messy code for concrete code smells, map each violation to its precise SOLID principle, then apply targeted refactoring patterns that restore clean architectural boundaries without breaking existing behavior.

## TL;DR Checklist

- [ ] Build a violation matrix listing every class found and which SOLID principle(s) it violates
- [ ] Classify each smell into SRP / OCP / LSP / ISP / DIP before choosing a fix
- [ ] Verify refactored components compile and pass tests independently at each step
- [ ] Run substitution safety checks for every LSP violation — no `isinstance` guards should remain in callers
- [ ] Trace import graphs inward after DIP refactoring — dependency arrows must point toward the domain layer
- [ ] Confirm that adding a new subtype requires zero modification to existing client code (OCP)

---

## When to Use

Use this skill when:

- A codebase feels brittle — small changes break unrelated modules, or every new feature requires editing the same central classes
- You inherit legacy code where `OrderService` handles validation, persistence, payment processing, and email notifications in one file
- Refactoring tests fail after adding a subclass because the parent class crashes with `NotImplementedError` from sibling subclasses
- Interfaces grow to 20+ methods that individual implementations use only 3–4 of (interface pollution)
- Business logic modules import `sqlite3`, `boto3`, and `smtplib` directly instead of depending on abstractions
- A code review flags "this class does too much" or "I can't test this without mocking the entire database"
- You are performing an architectural debt audit and need a systematic, principle-driven approach

---

## When NOT to Use

Avoid this skill for:

- **One-shot scripts and utility modules** — A script that reads CSV data and prints statistics has no SOLID violations; it is what it should be. Direct imports are correct here.
- **API surface design or HTTP endpoint structure** — That is an API architecture concern handled by separate skills (`api-design`, `rest-api-patterns`).
- **Runtime performance debugging** — Memory leaks, race conditions, and CPU hotspots are debugging tasks, not SOLID problems.
- **Early prototype / proof-of-concept code** — Where iteration speed outweighs architectural purity, accepting temporary violations is pragmatic. Refactor later when the design stabilizes.
- **As a replacement for basic naming or formatting** — Poor variable names and inconsistent indentation are style issues; they do not indicate SOLID principle violations.

---

## Core Workflow

1. **Scan for Code Smell Indicators** — Walk the codebase looking for concrete signals of each violation:

   - **SRP (God Class):** Classes exceeding 200 lines with >8 public methods, importing from unrelated packages (e.g., `sqlalchemy` AND `boto3` AND `smtplib` in one file), or methods that handle entirely different responsibilities.
   - **OCP (Modification-for-Extension):** Long conditional chains (`if type == "A"`, `elif type == "B"`) that require editing existing code to add new types. Factory classes with trivial dispatch logic that is actually an anti-pattern — the factory itself becomes the modification point.
   - **LSP (Substitution Breakage):** Base classes defining methods that specific subclasses override by raising `NotImplementedError` or returning default values that silently break contracts. Subclasses that weaken preconditions (accepting broader input) or fail to uphold postconditions (omitting required side effects).
   - **ISP (Interface Pollution):** Interfaces or ABCs with 15+ methods where most implementations use only 3–4. Clients forced to depend on methods they never call.
   - **DIP (Tight Coupling):** High-level business modules importing low-level concrete classes (`from infra.database import SQLiteConnection` inside a domain service). Constructor calls to concrete types scattered across multiple callers instead of injected from a single composition root.

   **Checkpoint:** Create a violation matrix as a Markdown table listing every class found, the specific methods/imports that indicate violations, and which SOLID principle(s) it violates. This matrix becomes your refactoring roadmap.

2. **Classify Violation Type** — Map each code smell to the precise SOLID principle violated. Do not lump all violations together — each principle requires a different remediation pattern:

   | Code Smell | Principle Violated | Typical Root Cause |
   |---|---|---|
   | God class (everything in one module) | SRP | No responsibility boundaries enforced; developers add methods as needs arise |
   | Conditional branching on type, modification needed for new types | OCP | Open/Closed not enforced — classes modified instead of extended |
   | Subclass crashes when substituted for parent | LSP | Weak preconditions in subclass or missing postcondition guarantees |
   | Interface with 15+ unused methods per implementation | ISP | Abstraction designed by implementation convenience, not client needs |
   | High-level module imports low-level concrete class | DIP | Dependency direction flows outward (policy → detail) instead of inward (detail → policy) |

   **Checkpoint:** Each violation must have: (a) the file path and line numbers, (b) a before code snippet showing the violation, (c) the violated principle clearly identified. Do not proceed to refactoring until every smell is classified — mixing remediation patterns for different principles causes cascading failures.

3. **Apply Targeted Refactoring Pattern** — For each violation, apply the correct remediation strategy. Work one principle at a time; do not attempt to fix SRP and DIP simultaneously on the same class:

   - **SRP → Split by Responsibility:** Extract each distinct concern into its own class with a descriptive name focused on what it does (`OrderPaymentProcessor` not `OrderHelper`). Use composition in the original class to coordinate between extracted classes. The orchestrator class should contain only coordination logic — zero direct business rules from extracted concerns.
   - **OCP → Strategy Dispatch:** Replace conditional branching on type with a strategy registry or polymorphic dispatch. New types register themselves; existing code remains untouched. If using protocols, ensure the new type structurally satisfies the protocol without modifying callers.
   - **LSP → Contract Alignment:** Override preconditions with equal-or-stronger constraints (never weaker). Add runtime assertion checks for contract safety when static analysis is insufficient. Remove any `raise NotImplementedError` patterns from subclasses — they are LSP violations in disguise.
   - **ISP → Interface Segregation:** Split bloated interfaces into client-specific smaller ones. Each client depends on the smallest interface that satisfies its needs. Use composition of multiple small interfaces where a class legitimately serves multiple roles.
   - **DIP → Abstraction Injection:** Define `Protocol` or `ABC` abstractions for every external dependency business logic needs. Move all `ConcreteClass()` instantiation out of business logic into the composition root (a single bootstrap module). Inject dependencies through constructor parameters — never globals, never function defaults that hide dependencies.

   **Checkpoint:** After each refactoring step, verify the component runs independently: run its unit tests in isolation, confirm no import errors, and ensure the public API surface has not changed (same method signatures, same return types). If tests break, the refactoring was not behavior-preserving — revert and adjust.

4. **Verify Substitution Safety** — For LSP violations specifically, perform a formal substitution test:

   - For every subclass, pass an instance to code that expects the parent type and confirm it behaves identically on equivalent inputs.
   - Check that preconditions are not weakened: if parent accepts `x > 0`, subclass must also accept `x > 0` (it may additionally accept more, but never less).
   - Check that postconditions are not broken: if parent guarantees side effect X after method call, every subclass must produce X.
   - After refactoring, scan all caller code for `isinstance()` or `type()` checks — these are LSP smells indicating the subtype system is broken and callers resort to runtime type dispatching.

   **Checkpoint:** No `isinstance` type checks should be needed in caller code after refactoring. Every polymorphic call site must work correctly with all subclasses.

5. **Validate Dependency Direction** — For DIP violations, trace the import graph inward:

   - High-level modules (business logic, domain services) must only import from abstraction layers (`Protocols`, `ABCs`).
   - Low-level modules (database access, HTTP clients, file I/O, external API wrappers) implement those abstractions.
   - No circular imports allowed between domain and infrastructure layers.
   - A single composition root (e.g., `app/bootstrap.py` or `main.py`) wires all concrete implementations together at application startup.

   **Checkpoint:** Run a dependency analysis (`import graph` via `pip install importlab && importlab analyze .` or equivalent tool) to confirm all dependency arrows point toward the domain layer. Domain layer should import from zero concrete infrastructure modules.

6. **Run OCP Stress Test** — After refactoring, verify the Open/Closed property holds:

   - Identify a natural "new type" scenario relevant to the codebase (e.g., adding a new payment processor, a new shipping method, a new report format).
   - Implement it by creating only a new class — zero edits to existing classes should be required.
   - If the implementation requires modifying any existing caller, factory dispatch is still not clean enough: move the dispatch mechanism closer to the new type's registration point.

   **Checkpoint:** Successfully adding a new subtype required exactly one new file and one registration call. Zero existing files were modified.

---

## Implementation Patterns

### Pattern 1: SRP — God Class Decomposition

A God class accumulates every capability needed by a domain concept over years of incremental growth. The fix is to decompose into focused classes, each owning exactly one concern, coordinated by a lightweight orchestrator.

```python
# ❌ BAD — God class handling validation, persistence, payment, notifications, and reporting
class OrderService:
    def __init__(self):
        self.db = Database()  # Concrete coupling
        self.smtp_host = "smtp.company.com"
        self.stripe_key = os.environ["STRIPE_KEY"]

    def create_order(self, user_id: int, items: list[dict], address: str) -> dict:
        # Validation mixed with persistence
        if not items:
            raise ValueError("Must have items")

        order_id = uuid.uuid4()
        self.db.execute(
            "INSERT INTO orders (id, user_id, address, status) VALUES (?, ?, ?, ?)",
            order_id, user_id, address, "pending",
        )

        # Payment processing — concrete library imported inside method
        import stripe
        stripe.api_key = self.stripe_key
        charge = stripe.Charge.create(amount=1000, currency="usd", source="tok_123")
        if not charge.paid:
            self.db.execute("UPDATE orders SET status = ? WHERE id = ?", "failed", order_id)
            raise PaymentError("Payment declined")

        # Notification — SMTP hardcoded in the same class
        msg = f"Order {order_id} confirmed."
        with smtplib.SMTP(self.smtp_host) as server:
            server.sendmail("noreply@company.com", "user@email.com", msg)

        return {"order_id": order_id, "status": "confirmed"}

    def generate_report(self, start_date: date, end_date: date) -> str:
        # Reporting logic — completely unrelated to order creation
        rows = self.db.fetchall("SELECT * FROM orders WHERE created_at BETWEEN ? AND ?", start_date, end_date)
        return f"Orders from {start_date} to {end_date}: {len(rows)} total"

    def send_reminder(self, user_id: int) -> None:
        # Another unrelated concern — abandoned cart reminders
        ...
```

**Problems:** Validation logic cannot be reused without an Order instance. Persistence layer leaks into the public API making testing impossible. Payment library imported inside the method couples to Stripe directly. Notification code hardcodes SMTP configuration. Reporting and reminder methods are completely unrelated to order creation but live in the same class. This class has 4 reasons to change, violating SRP.

```python
# ✅ GOOD — Decomposed into focused classes with explicit responsibility boundaries
from __future__ import annotations

import uuid
from abc import abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Protocol


# --- Value object (self-contained validation) ---
@dataclass(frozen=True)
class OrderRequest:
    """Immutable value object representing a new order request."""
    user_id: int
    items: list[OrderItem]
    address: str

    def validate(self) -> None:
        """Validate invariants — self-contained, no external dependencies."""
        if not self.items:
            raise ValueError("Must have at least one item")
        for item in self.items:
            if item.quantity <= 0:
                raise ValueError(f"Invalid quantity for {item.sku}: must be positive")


@dataclass(frozen=True)
class OrderItem:
    sku: str
    quantity: int
    price: float


# --- Persistence concern ---
class OrderRepository(Protocol):
    @abstractmethod
    async def save_order(self, order_id: uuid.UUID, request: OrderRequest) -> None: ...

    @abstractmethod
    async def update_status(self, order_id: uuid.UUID, status: str) -> None: ...

    @abstractmethod
    async def fetch_by_date_range(self, start: date, end: date) -> list[dict]: ...


# --- Payment concern ---
class PaymentProvider(Protocol):
    @abstractmethod
    async def charge(self, amount_cents: int, currency: str, token: str) -> bool: ...


# --- Notification concern ---
class NotificationSender(Protocol):
    @abstractmethod
    async def send_order_confirmation(self, order_id: uuid.UUID, email: str) -> None: ...

    @abstractmethod
    async def send_cart_reminder(self, user_id: int) -> None: ...


# --- Orchestrator (one reason to change: the order-creation process) ---
class OrderService:
    """Coordinates order creation by delegating to focused components.

    This class has exactly one reason to change: the business process of
    creating an order. It does not validate, persist, charge, or notify directly.
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
        request.validate()  # Validation delegated to value object

        order_id = uuid.uuid4()

        try:
            await self._payment_provider.charge(
                amount_cents=int(request.items[0].price * 100),
                currency="usd",
                token="tok_placeholder",  # Token comes from request in real code
            )
        except PaymentError as exc:
            await self._repository.update_status(order_id, "failed")
            raise

        await self._repository.save_order(order_id, request)
        await self._notification_sender.send_order_confirmation(order_id, "user@email.com")
        return order_id

    async def generate_report(self, start: date, end: date) -> str:
        """Reporting delegated to repository — separate concern entirely."""
        rows = await self._repository.fetch_by_date_range(start, end)
        return f"Orders from {start} to {end}: {len(rows)} total"

    async def send_reminder(self, user_id: int) -> None:
        """Reminders delegated to notification sender — separate concern entirely."""
        await self._notification_sender.send_cart_reminder(user_id)


class PaymentError(Exception):
    pass
```

---

### Pattern 2: OCP — Strategy Dispatch Instead of Conditional Branching

When code uses long `if/elif` chains to handle different types, it violates the Open/Closed Principle: every new type requires modifying existing code. The fix is strategy dispatch via a registry or polymorphic protocol implementation where new types register themselves.

```python
# ❌ BAD — Open/Closed violated: every new report format requires editing this function
def generate_report(data: list[dict], fmt: str) -> str:
    """Generate a report in the given format by branching on type."""
    if fmt == "csv":
        lines = [",".join(data[0].keys())]
        for row in data:
            lines.append(",".join(str(v) for v in row.values()))
        return "\n".join(lines)

    elif fmt == "json":
        import json
        return json.dumps(data, indent=2)

    elif fmt == "html":
        html = "<table><tr>"
        html += "".join(f"<th>{k}</th>" for k in data[0].keys())
        html += "</tr>"
        for row in data:
            html += "<tr>" + "".join(f"<td>{v}</td>" for v in row.values()) + "</tr>"
        html += "</table>"
        return html

    elif fmt == "markdown":
        lines = ["| " + " | ".join(data[0].keys()) + " |"]
        lines.append("| " + " | ".join("---" for _ in data[0]) + " |")
        for row in data:
            lines.append("| " + " | ".join(str(v) for v in row.values()) + " |")
        return "\n".join(lines)

    else:
        raise ValueError(f"Unknown format: {fmt}")  # Must modify this function to add a new format
```

**Problems:** Adding `pdf` or `xml` format requires editing the existing function body. The function grows unbounded as formats are added. Testing every format combination in one function is fragile. This directly violates OCP — the class/function is open for extension (you can add elif branches) but closed to modification, and those conditions force modification every time.

```python
# ✅ GOOD — Strategy dispatch: new formats register themselves, existing code untouched
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Any


class ReportFormat(ABC):
    """Abstract contract for report formatting strategies."""

    @abstractmethod
    def format(self, data: Sequence[dict[str, Any]]) -> str:
        """Render the data in this format's output representation."""
        ...

    @property
    @abstractmethod
    def extension(self) -> str:
        """File extension for this format (e.g., 'csv', 'json')."""
        ...


class CsvReportFormat(ReportFormat):
    def format(self, data: Sequence[dict[str, Any]]) -> str:
        headers = list(data[0].keys()) if data else []
        lines = [",".join(headers)]
        for row in data:
            lines.append(",".join(str(row.get(h, "")) for h in headers))
        return "\n".join(lines)

    @property
    def extension(self) -> str:
        return "csv"


class JsonReportFormat(ReportFormat):
    def format(self, data: Sequence[dict[str, Any]]) -> str:
        return json.dumps(data, indent=2)

    @property
    def extension(self) -> str:
        return "json"


class HtmlReportFormat(ReportFormat):
    def format(self, data: Sequence[dict[str, Any]]) -> str:
        if not data:
            return "<table></table>"
        headers = list(data[0].keys())
        rows_html = "".join(
            "<tr>" + "".join(f"<td>{row.get(h, '')}</td>" for h in headers) + "</tr>"
            for row in data
        )
        return f"<table><thead><tr>{''.join(f'<th>{h}</th>' for h in headers)}</thead><tbody>{rows_html}</tbody></table>"

    @property
    def extension(self) -> str:
        return "html"


# Registry — new formats self-register here; zero modification to existing callers needed
_FORMAT_REGISTRY: dict[str, ReportFormat] = {}


def register_format(fmt: ReportFormat) -> None:
    """Register a report format strategy. Called at module initialization."""
    _FORMAT_REGISTRY[fmt.extension] = fmt


# Auto-register built-in formats on import
for _cls in (CsvReportFormat, JsonReportFormat, HtmlReportFormat):
    register_format(_cls())


def generate_report(data: list[dict[str, Any]], fmt: str) -> str:
    """Generate a report by dispatching to the registered strategy.

    Adding a new format requires creating a class that implements ReportFormat
    and calling register_format() — zero changes to existing code paths.
    """
    strategy = _FORMAT_REGISTRY.get(fmt)
    if strategy is None:
        raise ValueError(f"Unknown format: {fmt}. Available: {list(_FORMAT_REGISTRY.keys())}")
    return strategy.format(data)
```

---

### Pattern 3: LSP — Substitution Safety & Contract Alignment

A subclass that breaks its parent's contract by weakening preconditions, strengthening postconditions, or raising unhandled exceptions violates the Liskov Substitution Principle. Callers expecting the parent type will crash when given the subclass instance.

```python
# ❌ BAD — Weakened precondition: subclass accepts negative numbers that break calculation
from typing import Union


class Calculator(ABC):
    @abstractmethod
    def add(self, a: int, b: int) -> int: ...

    @abstractmethod
    def divide(self, a: float, b: float) -> float:
        """Divide a by b. Raises ValueError if divisor is zero."""
        if b == 0:
            raise ValueError("Division by zero")
        return a / b


class SafeCalculator(Calculator):
    """Calculator that returns None instead of raising on division by zero.

    Problem: callers expecting ValueError (as documented in parent) will get None
    and likely crash with AttributeError when trying to use it. The contract is broken.
    """
    def add(self, a: int, b: int) -> int:
        return a + b

    def divide(self, a: float, b: float) -> float | None:
        # Weakened postcondition: parent guarantees float (or raises), this returns None
        if b == 0:
            return None  # Breaks caller contract — caller expects ValueError or float
        return a / b


class IntegerCalculator(Calculator):
    """Calculator that rejects non-integer input.

    Problem: precondition is weakened — parent accepts any int, but this subclass's
    add() silently converts floats to ints, changing behavior for valid parent inputs.
    """
    def add(self, a: Union[int, float], b: Union[int, float]) -> int:
        # Weakened precondition: parent says a,b are int; caller passes 1.5 (valid float)
        return int(a) + int(b)  # Silent data loss — breaks expected behavior

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Division by zero")
        return a / b


def run_calculations(calc: Calculator, operations: list[tuple[str, Any]]):
    """Generic function that works with ANY Calculator — this is the substitution test."""
    for op in operations:
        if op[0] == "add":
            result = calc.add(op[1], op[2])  # Expects int result per parent contract
            print(f"Add result: {result}")
        elif op[0] == "divide":
            try:
                result = calc.divide(op[1], op[2])
                print(f"Divide result: {result}")
            except ValueError:
                print("Division by zero caught")
```

**Problems:** `SafeCalculator` returns `None` for division-by-zero, breaking the contract that callers rely on to catch `ValueError`. The `run_calculations` function will crash with `AttributeError` when it tries to format `None` as a float. `IntegerCalculator` silently converts floats to ints, which violates the caller's expectation that valid parent inputs produce valid results.

```python
# ✅ GOOD — Contracts preserved: preconditions are not weakened, postconditions match parent
from abc import ABC, abstractmethod
from typing import Any


class Calculator(ABC):
    @abstractmethod
    def add(self, a: int, b: int) -> int: ...

    @abstractmethod
    def divide(self, a: float, b: float) -> float:
        """Divide a by b. Always returns float or raises ValueError on zero divisor."""
        if b == 0:
            raise ValueError("Division by zero")
        return a / b


class SafeCalculator(Calculator):
    """Calculator with safe division — preserves parent contract exactly.

    Instead of returning None, this subclass maintains the same pre/post conditions
    as the parent and uses composition internally to provide safety.
    """
    def __init__(self, allow_zero_division: bool = False) -> None:
        self._allow_zero = allow_zero_division

    def add(self, a: int, b: int) -> int:
        return a + b

    def divide(self, a: float, b: float) -> float:
        # Same precondition as parent (any float accepted), same postcondition (float or ValueError)
        if self._allow_zero and b == 0:
            return 0.0  # Explicitly safe path — not the default; caller must opt in
        if b == 0:
            raise ValueError("Division by zero")  # Same exception as parent
        return a / b


class IntegerCalculator(Calculator):
    """Calculator that works with integers only.

    Preconditions are equal to or stronger than parent: accepts int (which is compatible
    with float for arithmetic), and postconditions produce int results that are valid floats.
    """
    def add(self, a: int, b: int) -> int:
        # Same precondition as parent — only accepts ints
        return a + b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Division by zero")
        result = a / b
        # Postcondition preserved: always returns float
        assert isinstance(result, float), "divide() must return float"
        return result


# Verification: these calls all work identically regardless of which subclass is passed
def run_calculations(calc: Calculator, operations: list[tuple[str, Any]]) -> None:
    for op in operations:
        if op[0] == "add":
            result = calc.add(op[1], op[2])
            print(f"Add result: {result}")
        elif op[0] == "divide":
            try:
                result = calc.divide(op[1], op[2])
                print(f"Divide result: {result}")
            except ValueError:
                print("Division by zero caught")


# Test substitution: SafeCalculator works wherever Calculator is expected
safe = SafeCalculator()
run_calculations(safe, [("divide", 10.0, 0), ("add", 3, 4)])  # Works — contract preserved

int_calc = IntegerCalculator()
run_calculations(int_calc, [("divide", 10.0, 2), ("add", 3, 4)])  # Also works identically
```

---

### Pattern 4: ISP — Interface Segregation

When an interface grows large to accommodate all possible implementations, individual clients are forced to depend on methods they never use. The fix is to split the interface into focused client-specific protocols so each client depends only on what it actually needs.

```python
# ❌ BAD — Monolithic interface forcing unused methods on every implementation
from abc import ABC, abstractmethod


class Worker(ABC):
    """One giant interface that all workers must implement.

    Problem: a RemoteWorker doesn't need eat() or sleep(). A HumanWorker
    must stub these out with NotImplementedError, violating LSP as well.
    """
    @abstractmethod
    def work(self) -> str: ...

    @abstractmethod
    def eat(self) -> None: ...

    @abstractmethod
    def sleep(self) -> None: ...

    @abstractmethod
    def supervise(self, workers: list["Worker"]) -> None: ...

    @abstractmethod
    def report_progress(self) -> dict[str, Any]: ...


class HumanWorker(Worker):
    """Human worker implements everything — this makes sense."""
    def work(self) -> str:
        return "Working on tasks"

    def eat(self) -> None:
        print("Eating lunch")

    def sleep(self) -> None:
        print("Sleeping")

    def supervise(self, workers: list[Worker]) -> None:
        print("Managing team")

    def report_progress(self) -> dict[str, Any]:
        return {"status": "in_progress", "hours_worked": 8}


class RemoteWorker(Worker):
    """Robot/automated worker — eat() and sleep() are meaningless stubs.

    Problem: This is both ISP violation (uses methods it doesn't need) and LSP
    violation (stub methods that do nothing break the implied contract of work).
    """
    def work(self) -> str:
        return "Processing automated tasks"

    # These are empty stubs — they add zero value but are required by the interface
    def eat(self) -> None: pass  # No-op — violates ISP, client shouldn't depend on this
    def sleep(self) -> None: pass  # No-op — same problem

    def supervise(self, workers: list[Worker]) -> None:
        raise NotImplementedError("Robots cannot supervise humans")  # LSP violation too!

    def report_progress(self) -> dict[str, Any]:
        return {"status": "completed", "tasks_processed": 150}


class PartTimeWorker(Worker):
    """Part-time worker doesn't need supervision capability.

    Another ISP violation: must implement supervise() even though
    part-time workers never supervise anyone.
    """
    def work(self) -> str:
        return "Working part-time hours"

    def eat(self) -> None:
        print("Quick lunch break")

    def sleep(self) -> None:
        print("Resting at home")

    # Doesn't make sense for this role, but required by interface
    def supervise(self, workers: list[Worker]) -> None:
        pass  # Empty stub — ISP violation

    def report_progress(self) -> dict[str, Any]:
        return {"status": "partial", "hours_worked": 4}


def manage_team(team: list[Worker], manager: Worker) -> None:
    """This function could depend on a smaller Supervisory interface instead."""
    for worker in team:
        print(worker.work())
        # It never calls eat(), sleep(), or report_progress() — yet those are required
        manager.supervise(team)  # Fails at runtime for RemoteWorker!
```

**Problems:** `RemoteWorker` stubs `eat()` and `sleep()` as no-ops — clients depending on `Worker` can call these methods but they have no effect. The `supervise()` method raises `NotImplementedError` for robots, breaking LSP. `PartTimeWorker` must implement `supervise()` even though part-time workers never supervise anyone. Every new worker type must implement all 5 methods regardless of relevance. This is classic interface pollution.

```python
# ✅ GOOD — Segregated interfaces: each client depends only on what it uses
from abc import ABC, abstractmethod
from typing import Any


# Small protocol for the core capability every worker has
class Workable(ABC):
    """Only concern: performing work. Every worker must implement this."""
    @abstractmethod
    def work(self) -> str: ...

    @abstractmethod
    def report_progress(self) -> dict[str, Any]: ...


# Small protocol for human-specific needs
class HumanCapable(ABC):
    """Only concern: basic human biological needs. Not needed by automated workers."""
    @abstractmethod
    def eat(self) -> None: ...

    @abstractmethod
    def sleep(self) -> None: ...


# Small protocol for management role
class Supervisory(ABC):
    """Only concern: managing other workers. Only managers implement this."""
    @abstractmethod
    def supervise(self, workers: list[Workable]) -> None: ...


# HumanWorker composes both Workable + HumanCapable + Supervisory — it has all capabilities
class HumanWorker(Workable, HumanCapable, Supervisory):
    """Full-featured human worker with all capabilities."""
    def work(self) -> str:
        return "Working on tasks"

    def eat(self) -> None:
        print("Eating lunch")

    def sleep(self) -> None:
        print("Sleeping")

    def supervise(self, workers: list[Workable]) -> None:
        for w in workers:
            print(f"  {w.work()}")

    def report_progress(self) -> dict[str, Any]:
        return {"status": "in_progress", "hours_worked": 8}


# RemoteWorker only implements Workable — no pollution from human-specific or supervisory concerns
class RemoteWorker(Workable):
    """Automated worker — only needs to work and report. No biological needs, no supervision."""
    def __init__(self, tasks: list[str] | None = None) -> None:
        self._tasks = tasks or []

    def work(self) -> str:
        processed = len(self._tasks) if self._tasks else 0
        return f"Processing {processed} automated tasks"

    def report_progress(self) -> dict[str, Any]:
        return {"status": "completed", "tasks_processed": len(self._tasks)}


class PartTimeWorker(Workable, HumanCapable):
    """Part-time worker — works and has biological needs, but never supervises anyone."""
    def work(self) -> str:
        return "Working part-time hours"

    def eat(self) -> None:
        print("Quick lunch break")

    def sleep(self) -> None:
        print("Resting at home")

    def report_progress(self) -> dict[str, Any]:
        return {"status": "partial", "hours_worked": 4}


# Client functions depend on the smallest interface they actually use
def process_work(available: list[Workable]) -> None:
    """Process all workers' work — only needs Workable interface."""
    for worker in available:
        result = worker.work()
        print(f"Result: {result}")
        progress = worker.report_progress()
        print(f"Progress: {progress}")


def feed_workers(employees: list[HumanCapable]) -> None:
    """Feed human workers — only needs HumanCapable interface."""
    for employee in employees:
        employee.eat()


def manage_team(team: list[Workable], manager: Supervisory) -> None:
    """Manage a team with a supervisor. Only needs Supervisory + Workable."""
    for worker in team:
        print(worker.work())
    manager.supervise(team)  # Safe — every Supervisory must implement this


# Demonstrate: only HumanWorker can supervise (not RemoteWorker or PartTimeWorker)
human = HumanWorker()
remote = RemoteWorker(tasks=["task_a", "task_b"])
part_time = PartTimeWorker()

process_work([human, remote, part_time])  # Works — all implement Workable
feed_workers([human, part_time])  # Works — both implement HumanCapable
manage_team([remote, part_time], human)  # Works — human implements Supervisory
# manage_team([remote], remote)  # Type error — RemoteWorker doesn't implement Supervisory!
```

---

### Pattern 5: DIP — Dependency Injection with Protocols

When high-level business logic directly imports and instantiates low-level concrete classes, it violates the Dependency Inversion Principle. The fix is to define abstractions (Protocols) that the business logic depends on, while low-level modules implement those abstractions. All instantiation moves to a single composition root.

```python
# ❌ BAD — Business logic tightly coupled to concrete implementations
from __future__ import annotations

import json
import os
import smtplib
from datetime import datetime
from typing import Any


class OrderService:
    """Order service that depends directly on concrete infrastructure classes.

    Problems: cannot test without real database, real SMTP server, real filesystem.
    Every caller must replicate the same concrete initialization logic.
    Dependency direction is outward: business logic → infrastructure (violates DIP).
    """
    def __init__(self):
        # Concrete instantiation hidden inside __init__ — callers cannot substitute
        self.db = Database()  # from infra.database import Database — concrete coupling
        self.email_sender = EmailService("smtp.company.com", "noreply@company.com")
        self.file_writer = FileWriter("/var/log/orders/")
        self.config = json.loads(open(os.path.join(os.getcwd(), "config.json")).read())

    def create_order(self, user_id: int, items: list[dict]) -> dict[str, Any]:
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Business logic mixed with concrete I/O
        self.db.execute(
            "INSERT INTO orders (id, user_id, status) VALUES (?, ?, ?)",
            order_id, user_id, "created",
        )

        # Direct email sending inside business method — cannot test without SMTP server
        self.email_sender.send(
            to="user@email.com",
            subject=f"Order {order_id} Created",
            body=f"Your order has been created with {len(items)} items.",
        )

        # Direct file logging inside business logic — couples business rule to filesystem layout
        log_entry = f"{datetime.now()} | Order {order_id} created for user {user_id}\n"
        self.file_writer.append("activity.log", log_entry)

        return {"order_id": order_id, "status": "created"}


# These concrete classes live in infrastructure packages — business logic should NOT import them
class Database:
    def execute(self, query: str, *args): ...  # Concrete SQL implementation

class EmailService:
    def __init__(self, host: str, sender: str): ...
    def send(self, to: str, subject: str, body: str): ...  # Concrete SMTP implementation

class FileWriter:
    def __init__(self, base_path: str): ...
    def append(self, filename: str, content: str): ...  # Concrete filesystem implementation
```

**Problems:** `OrderService.__init__` directly creates `Database`, `EmailService`, and `FileWriter` instances. There is no way to pass in mocks or test doubles. Every caller must either import these concrete classes too (spreading the coupling) or instantiate them the same way as OrderService does. Adding a new notification channel requires modifying `OrderService.create_order()` — violating OCP as well as DIP. The dependency direction flows from business logic outward to infrastructure, inverting the correct pattern.

```python
# ✅ GOOD — Abstractions defined by the consumer; details implemented separately; wired at bootstrap
from __future__ import annotations

import json
import os
from abc import abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol


# --- Abstraction layer: Protocols defined from the business logic's perspective ---
class OrderRepository(Protocol):
    """Business logic only needs to persist orders — how it's stored is an implementation detail."""

    @abstractmethod
    async def save_order(self, order_id: str, user_id: int, items: list[dict]) -> None: ...

    @abstractmethod
    async def update_status(self, order_id: str, status: str) -> None: ...


class NotificationSender(Protocol):
    """Business logic only needs to send notifications — the transport mechanism is irrelevant."""

    @abstractmethod
    async def send_order_confirmation(self, order_id: str, user_id: int, items: list[dict]) -> None: ...


class ActivityLogger(Protocol):
    """Business logic only needs to log activity — file path and format are implementation concerns."""

    @abstractmethod
    async def log_activity(self, event: str) -> None: ...


# --- OrderService: depends ONLY on abstractions ---
@dataclass(frozen=True)
class OrderRequest:
    user_id: int
    items: list[dict]


class OrderService:
    """Order service depending entirely on abstractions.

    This class can be fully unit-tested by passing mock implementations of each protocol.
    It knows nothing about databases, SMTP servers, or filesystem paths.
    """

    def __init__(
        self,
        repository: OrderRepository,
        notifier: NotificationSender,
        logger: ActivityLogger,
    ) -> None:
        # Dependencies injected — no hidden concrete dependencies anywhere
        self._repository = repository
        self._notifier = notifier
        self._logger = logger

    async def create_order(self, request: OrderRequest) -> str:
        """Create an order by delegating to injected abstractions.

        Business rules only — all I/O is abstracted away.
        """
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        await self._repository.save_order(order_id, request.user_id, request.items)
        await self._notifier.send_order_confirmation(order_id, request.user_id, request.items)
        await self._logger.log_activity(
            f"Order {order_id} created for user {request.user_id}"
        )

        return order_id


# --- Infrastructure implementations: these implement the Protocols defined above ---
class SqlOrderRepository:
    """Concrete database implementation — lives in infra.database package."""

    def __init__(self, connection_string: str) -> None:
        self._connection_string = connection_string

    async def save_order(self, order_id: str, user_id: int, items: list[dict]) -> None:
        # Actual SQLAlchemy or sqlite3 code lives here — hidden from business logic
        print(f"Saving order {order_id} to {self._connection_string}")

    async def update_status(self, order_id: str, status: str) -> None:
        pass


class SmtpNotificationSender:
    """Concrete SMTP email implementation."""

    def __init__(self, host: str, sender: str) -> None:
        self._host = host
        self._sender = sender

    async def send_order_confirmation(self, order_id: str, user_id: int, items: list[dict]) -> None:
        print(f"Sending email from {self._sender} for order {order_id}")


class FileActivityLogger:
    """Concrete filesystem logging implementation."""

    def __init__(self, log_directory: str) -> None:
        self._log_directory = log_directory

    async def log_activity(self, event: str) -> None:
        print(f"Logging activity to {self._log_directory}: {event}")


# --- Composition Root: single place that wires everything together ---
async def bootstrap() -> OrderService:
    """Build the object graph by wiring abstractions to concrete implementations.

    This is the ONLY place in the application that knows about concrete classes.
    All other code depends only on Protocols.
    """
    config_path = os.path.join(os.getcwd(), "config.json")
    with open(config_path) as f:
        config = json.load(f)

    repository = SqlOrderRepository(config["database"]["connection_string"])
    notifier = SmtpNotificationSender(
        host=config["email"]["smtp_host"],
        sender=config["email"]["sender"],
    )
    logger = FileActivityLogger(config["logging"]["directory"])

    return OrderService(
        repository=repository,
        notifier=notifier,
        logger=logger,
    )


# --- Usage: only the bootstrap function creates concrete types ---
async def main() -> None:
    service = await bootstrap()
    request = OrderRequest(user_id=42, items=[{"sku": "WIDGET-1", "quantity": 2}])
    order_id = await service.create_order(request)
    print(f"Created order: {order_id}")
```

---

### Pattern 6: Cross-Principle Refactoring — The Ripple Effect

Real-world codebases often have multiple SOLID violations in the same class. Addressing one principle's violation may expose or resolve violations of other principles. This pattern demonstrates a systematic approach to tackling interrelated violations without breaking existing behavior.

```python
# ❌ BAD — Multiple SOLID violations in one class
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from typing import Any


class ProductService:
    """Product service with SRP + DIP + ISP violations stacked together.

    SRP Violation: handles CRUD, pricing, notifications, and reporting.
    DIP Violation: directly imports and uses sqlite3 (concrete).
    ISP Violation: implements a monolithic IProductService that forces
    every consumer to depend on notification methods even when they don't need them.
    """
    def __init__(self):
        # DIP violation: concrete database coupling hidden in init
        conn = sqlite3.connect(os.path.expanduser("~/products.db"))
        self.conn = conn

    def add_product(self, name: str, price: float, category: str) -> int:
        # SRP violation: business logic + persistence mixed
        if price < 0:
            raise ValueError("Price cannot be negative")
        cursor = self.conn.execute(
            "INSERT INTO products (name, price, category) VALUES (?, ?, ?)",
            name, price, category,
        )
        self.conn.commit()
        # Notification mixed into business method — SRP violation
        self._send_notification(f"Product '{name}' added")
        return cursor.lastrowid

    def update_price(self, product_id: int, new_price: float) -> None:
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        self.conn.execute(
            "UPDATE products SET price = ? WHERE id = ?", new_price, product_id
        )
        self.conn.commit()
        self._send_notification(f"Product {product_id} price updated to {new_price}")

    def delete_product(self, product_id: int) -> None:
        # Another SRP violation: deletion mixed with notification
        self.conn.execute("DELETE FROM products WHERE id = ?", product_id)
        self.conn.commit()
        self._send_notification(f"Product {product_id} deleted")

    def get_all_products(self, category: str | None = None) -> list[dict[str, Any]]:
        if category:
            cursor = self.conn.execute(
                "SELECT * FROM products WHERE category = ?", (category,)
            )
        else:
            cursor = self.conn.execute("SELECT * FROM products")
        return [
            {"id": row[0], "name": row[1], "price": row[2], "category": row[3]}
            for row in cursor.fetchall()
        ]

    def generate_inventory_report(self) -> dict[str, Any]:
        # SRP violation: reporting logic mixed into product service
        rows = self.conn.execute("SELECT * FROM products").fetchall()
        total_value = sum(row[2] for row in rows)
        return {
            "total_products": len(rows),
            "total_inventory_value": total_value,
            "average_price": total_value / len(rows) if rows else 0,
        }

    # ISP violation: every consumer must depend on this method even if they don't need it
    def _send_notification(self, message: str) -> None:
        print(f"[NOTIFICATION] {message}")


class IProductService(ABC):
    """Monolithic interface — ISP violation: clients depending on CRUD
    are forced to know about notification and reporting methods."""

    @abstractmethod
    def add_product(self, name: str, price: float, category: str) -> int: ...

    @abstractmethod
    def update_price(self, product_id: int, new_price: float) -> None: ...

    @abstractmethod
    def delete_product(self, product_id: int) -> None: ...

    @abstractmethod
    def get_all_products(self, category: str | None = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    def generate_inventory_report(self) -> dict[str, Any]: ...

    @abstractmethod
    def send_notification(self, message: str) -> None: ...  # Every caller must depend on this
```

```python
# ✅ GOOD — Systematically decomposed by each SOLID principle
from __future__ import annotations

import sqlite3
from abc import abstractmethod
from dataclasses import dataclass
from typing import Any, Protocol


# --- Step 1: ISP — Define small client-specific interfaces ---

class ProductCrud(Protocol):
    """Interface for clients that only need CRUD operations."""

    @abstractmethod
    async def add_product(self, name: str, price: float, category: str) -> int: ...

    @abstractmethod
    async def update_price(self, product_id: int, new_price: float) -> None: ...

    @abstractmethod
    async def delete_product(self, product_id: int) -> None: ...

    @abstractmethod
    async def get_all_products(self, category: str | None = None) -> list[dict[str, Any]]: ...


class Reportable(Protocol):
    """Interface for clients that only need reporting."""

    @abstractmethod
    async def generate_inventory_report(self) -> dict[str, Any]: ...


class Notifiable(Protocol):
    """Interface for clients that listen for product lifecycle events."""

    @abstractmethod
    async def on_product_created(self, product_id: int, name: str) -> None: ...

    @abstractmethod
    async def on_price_updated(self, product_id: int, new_price: float) -> None: ...

    @abstractmethod
    async def on_product_deleted(self, product_id: int) -> None: ...


# --- Step 2: DIP — Define abstraction for persistence layer ---

class ProductRepository(Protocol):
    """Abstraction that the service depends on — how data is stored is an implementation detail."""

    @abstractmethod
    async def create(self, name: str, price: float, category: str) -> int: ...

    @abstractmethod
    async def update_price(self, product_id: int, new_price: float) -> None: ...

    @abstractmethod
    async def remove(self, product_id: int) -> None: ...

    @abstractmethod
    async def list_all(self, category: str | None = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def compute_inventory_stats(self) -> dict[str, float]: ...


# --- Step 3: SRP — Separate concerns into focused classes ---

@dataclass(frozen=True)
class ProductCreatedEvent:
    product_id: int
    name: str


@dataclass(frozen=True)
class PriceUpdatedEvent:
    product_id: int
    new_price: float


@dataclass(frozen=True)
class ProductDeletedEvent:
    product_id: int


# --- Persistence implementation (low-level detail, implements repository protocol) ---

class SqlProductRepository:
    """SQL-based product persistence — lives in infra.product package."""

    def __init__(self, database_path: str) -> None:
        self._database_path = database_path

    async def create(self, name: str, price: float, category: str) -> int:
        conn = sqlite3.connect(self._database_path)
        try:
            cursor = conn.execute(
                "INSERT INTO products (name, price, category) VALUES (?, ?, ?)",
                name, price, category,
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    async def update_price(self, product_id: int, new_price: float) -> None:
        conn = sqlite3.connect(self._database_path)
        try:
            conn.execute(
                "UPDATE products SET price = ? WHERE id = ?", new_price, product_id
            )
            conn.commit()
        finally:
            conn.close()

    async def remove(self, product_id: int) -> None:
        conn = sqlite3.connect(self._database_path)
        try:
            conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
            conn.commit()
        finally:
            conn.close()

    async def list_all(self, category: str | None = None) -> list[dict[str, Any]]:
        conn = sqlite3.connect(self._database_path)
        try:
            query = "SELECT id, name, price, category FROM products"
            params: tuple[Any, ...] = ()
            if category:
                query += " WHERE category = ?"
                params = (category,)
            cursor = conn.execute(query, params)
            return [
                {"id": row[0], "name": row[1], "price": row[2], "category": row[3]}
                for row in cursor.fetchall()
            ]
        finally:
            conn.close()

    async def compute_inventory_stats(self) -> dict[str, float]:
        conn = sqlite3.connect(self._database_path)
        try:
            rows = conn.execute("SELECT price FROM products").fetchall()
            total_value = sum(row[0] for row in rows)
            return {
                "total_products": len(rows),
                "total_inventory_value": total_value,
                "average_price": total_value / len(rows) if rows else 0.0,
            }
        finally:
            conn.close()


# --- Notification handler (low-level detail, implements Notifiable protocol) ---

class ConsoleNotificationHandler:
    """Handles product lifecycle notifications by printing to console."""

    async def on_product_created(self, product_id: int, name: str) -> None:
        print(f"[EVENT] Product created: ID={product_id}, name='{name}'")

    async def on_price_updated(self, product_id: int, new_price: float) -> None:
        print(f"[EVENT] Price updated: ID={product_id}, new_price={new_price}")

    async def on_product_deleted(self, product_id: int) -> None:
        print(f"[EVENT] Product deleted: ID={product_id}")


# --- Service implementations (high-level policy, depends only on abstractions) ---

class ProductServiceCrud(ProductCrud):
    """CRUD operations — one reason to change: product data management."""

    def __init__(self, repository: ProductRepository) -> None:
        self._repository = repository

    async def add_product(self, name: str, price: float, category: str) -> int:
        if price < 0:
            raise ValueError("Price cannot be negative")
        return await self._repository.create(name, price, category)

    async def update_price(self, product_id: int, new_price: float) -> None:
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        await self._repository.update_price(product_id, new_price)

    async def delete_product(self, product_id: int) -> None:
        await self._repository.remove(product_id)

    async def get_all_products(self, category: str | None = None) -> list[dict[str, Any]]:
        return await self._repository.list_all(category)


class ProductServiceReporting(Reportable):
    """Reporting operations — one reason to change: inventory analytics."""

    def __init__(self, repository: ProductRepository) -> None:
        self._repository = repository

    async def generate_inventory_report(self) -> dict[str, Any]:
        return await self._repository.compute_inventory_stats()


class ProductServiceNotifications(Notifiable):
    """Notification dispatch — one reason to change: event broadcasting."""

    def __init__(self, handlers: list[Notifiable]) -> None:
        self._handlers = handlers

    async def on_product_created(self, product_id: int, name: str) -> None:
        for handler in self._handlers:
            await handler.on_product_created(product_id, name)

    async def on_price_updated(self, product_id: int, new_price: float) -> None:
        for handler in self._handlers:
            await handler.on_price_updated(product_id, new_price)

    async def on_product_deleted(self, product_id: int) -> None:
        for handler in self._handlers:
            await handler.on_product_deleted(product_id)


# --- Composition Root ---

async def bootstrap_product_service(db_path: str) -> dict[str, object]:
    """Wire abstractions to concrete implementations at the composition root."""
    repository = SqlProductRepository(db_path)
    notifier = ProductServiceNotifications([ConsoleNotificationHandler()])
    crud_service = ProductServiceCrud(repository)
    report_service = ProductServiceReporting(repository)

    return {
        "crud": crud_service,
        "reporting": report_service,
        "notifications": notifier,
    }


# --- Usage: client code depends only on the specific interface it needs ---

async def main() -> None:
    services = await bootstrap_product_service("~/products.db")

    # Client that only needs CRUD — zero dependency on notification or reporting concerns
    crud: ProductCrud = services["crud"]
    product_id = await crud.add_product("Widget", 29.99, "electronics")
    print(f"Added product with ID: {product_id}")

    # Client that only needs reporting — zero dependency on CRUD or notification concerns
    reports: Reportable = services["reporting"]
    report = await reports.generate_inventory_report()
    print(f"Inventory report: {report}")
```

---

## Constraints

### MUST DO

- Build a violation matrix before refactoring — map every class to specific SOLID principles it violates with concrete evidence (file paths, line numbers, code snippets)
- Address one principle at a time — fix SRP violations before tackling DIP on the same class; mixing remediation patterns causes cascading failures
- Preserve the public API surface during refactoring — method signatures must remain compatible so existing callers do not break; use wrapper adapters if signatures genuinely need to change
- Inject dependencies through constructor parameters only — never hide dependencies in function defaults, global state, or lazy initialization inside methods
- Name extracted classes after their responsibility, not their data (`OrderPaymentProcessor` not `OrderHelper`)
- Define Protocols from the consumer's perspective — name interfaces based on what the client needs to do, not how the implementation works
- Remove all `isinstance()` and `type()` checks from polymorphic call sites after LSP refactoring — these indicate broken subtype contracts
- Run isolation tests after each step — verify the refactored component works independently before proceeding to the next violation

### MUST NOT DO

- Apply OCP strategy dispatch where simple function composition would suffice — not every conditional needs a pattern; reserve strategy dispatch for genuinely extensible type hierarchies
- Extract interfaces from every class automatically — DIP only requires abstractions when substitution is plausible or testing demands it. Over-extraction creates "interface bloat" that violates ISP in reverse
- Replace concrete coupling with another form of coupling — Singleton patterns, global registries, and module-level factories are DIP violations in disguise; use explicit injection instead
- Leave `raise NotImplementedError` in abstract method implementations — this is an LSP violation masquerading as polymorphism; every implementation must fulfill its contract
- Refactor a class to fewer than two responsibilities just to claim SRP compliance — a small, cohesive class that does one thing well does not need splitting
- Change behavior during refactoring — the goal is architectural improvement, not feature changes. All existing tests must pass without modification

---

## Related Skills

| Skill | Purpose |
|---|---|
| `single-responsibility` | Deep dive into SRP — god class detection and decomposition patterns |
| `open-closed-principle` | Strategy dispatch, registry-based extensibility, and polymorphic extension patterns |
| `liskov-substitution-principle` | Contract alignment, pre/postcondition analysis, and substitution safety verification |
| `interface-segregation-principle` | Interface splitting by client role, Protocol design from consumer perspective |
| `dependency-inversion-principle` | Dependency injection containers, Protocol-based abstractions, composition root wiring |

---

## Live References

> Authoritative documentation links for SOLID principles and refactoring patterns. The model follows markdown links at load time to resolve external references.

- [SOLID: The First 5 Principles of Object Oriented Design](https://medium.com/@cscotess/s-o-l-i-d-the-first-five-principles-of-object-oriented-design-a34de1fb7245)
- [Refactoring.Guru — SOLID Principles](https://refactoring.guru/design-patterns/#lang=python)
- [Python Data Model — Protocols and Structural Subtyping](https://docs.python.org/3/library/typing.html#typing.Protocol)
- [Clean Architecture by Robert C. Martin (SOLID foundation)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Python ABC Module Documentation](https://docs.python.org/3/library/abc.html)
- [Refactoring — Improving the Design of Existing Code (Fowler, Martin)](https://martinfowler.com/books/refactoring.html)
- [Python Testing with unittest and pytest](https://docs.python.org/3/library/unittest.html)
