---
name: refactoring-techniques
description: Applies systematic refactoring techniques (extract method, introduce
  parameter object, replace conditional with polymorphism) to improve code readability
  and reduce complexity.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: refactoring, clean up code, reduce complexity, extract method, rename
    variable, improve readability, how do i refactor legacy code, technical debt,
    code smell
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
  related-skills: test-driven-development, software-testing-strategy, dry-principles
------
# Refactoring Techniques

Applies systematic refactoring transformations to improve code readability and reduce complexity without changing external behavior. Models this skill as a senior engineer who identifies code smells using concrete detection criteria, then applies small incremental transformations — each verified by tests — to guide legacy code toward clean architecture following SOLID and DRY principles.

## TL;DR Checklist

- [ ] Identify the specific code smell before choosing any refactoring technique
- [ ] Verify green tests exist before making any structural change — no safety net means no refactor
- [ ] Apply only one refactoring at a time, then commit after each verified change
- [ ] Never mix refactoring with feature work in the same commit or pull request
- [ ] Prefer Extract Method for long functions over inline parameter gymnastics
- [ ] Replace magic numbers and strings with named constants before extracting methods
- [ ] Verify behavior is unchanged by running the full test suite after each transformation

---

## When to Use

Use this skill when:

- A function exceeds 15–20 lines and has mixed responsibilities that obscure its purpose
- Multiple functions contain nearly identical code blocks (duplicated logic across modules)
- A class manages more than a single abstraction — it is doing too many unrelated things
- Conditional chains (`if/elif/else` or `switch/case`) grow unwieldy and map to domain categories
- Variable and function names are vague, making the code require paragraph-long comments to explain

---

## When NOT to Use

Avoid this skill when:

- The code is new (written in the last 24 hours) — premature optimization of fresh code wastes effort; let it stabilize first
- You are under a deadline and no tests exist — without a safety net, refactoring introduces regressions with no rollback path
- The code works correctly and is not causing maintenance pain — do not refactor "just because" the DRY principle sounds good

---

## Core Workflow

1. **Identify Code Smell** — Scan the code for concrete indicators from the catalog below. For each, note the exact line range and quantify the problem (e.g., "function is 67 lines", "three nearly identical blocks across files"). **Checkpoint:** You can point to specific lines that violate SOLID/DRY principles before proceeding.

2. **Verify Safety Net** — Confirm that tests cover the code you are about to change. If coverage is below 80% on the target module, write regression tests first (use `software-testing-strategy`). Run the full suite and verify it passes green. **Checkpoint:** `pytest` passes with no warnings or failures.

3. **Isolate the Change** — Create a dedicated branch named `refactor/<description>-<short-id>`. Make only one refactoring per commit. The goal is a single, reversible transformation that you can revert with `git revert <commit-hash>` if behavior changes unexpectedly. **Checkpoint:** `git status` shows only the files relevant to the single refactoring being applied.

4. **Apply One Technique at a Time** — Choose exactly one pattern from the catalog below and apply it completely. Do not start a second technique until the first is committed and tested. Common sequencing: rename variables → extract methods → introduce parameter objects → replace conditionals → consolidate classes. **Checkpoint:** After each commit, run tests and confirm behavior is identical (same outputs for same inputs).

5. **Verify Behavior Unchanged** — Run the full test suite (`pytest`). For modules without tests, compare outputs of key functions before and after using snapshot comparison or manual inspection. Check that no new lint errors were introduced. **Checkpoint:** All existing tests pass, linter is clean, and no behavioral differences detected.

6. **Commit and Review** — Commit with a conventional refactoring message: `refactor(<module>): extract <method_name> from <parent_function>`. Submit for peer review emphasizing that no behavior changed. Request reviewers who understand the original business logic to confirm correctness. **Checkpoint:** PR has approval, CI passes, branch is squashed into a clean linear history.

---

## Code Smells Catalog

A code smell is a surface indication that something may be wrong architecturally. Each entry below includes detection criteria — concrete patterns you should look for.

| Code Smell | Detection Criteria | Typical Fix |
|---|---|---|
| **Long Method** | Function exceeds 15–20 lines, contains multiple nested `if/else` blocks or loops, does more than one conceptual task | Extract Method — split into smaller, focused functions |
| **Large Class** | Class has more than 8 public methods, manages multiple distinct responsibilities, or its file exceeds 300 lines | Split by responsibility — extract cohesive groups into separate classes |
| **Duplicated Code** | Nearly identical code blocks appear in two or more locations (copy-paste detection shows >70% similarity) | Extract Method + Pull Up/Push Down depending on class hierarchy |
| **Feature Envy** | A method accesses more data from another class than from its own class, or contains `other.foo.bar.baz` chains longer than 2 levels | Move Method — relocate the function to the class whose data it prefers |
| **Data Clumps** | The same group of 3+ variables repeatedly appears together as parameters, fields, or dictionary keys across multiple functions | Introduce Parameter Object — consolidate into a dedicated class |
| **Switch Statements** | `if/elif/else` or `match/case` chains with more than 3 branches that select behavior based on type or category | Replace Conditional with Polymorphism — use subclass dispatch instead |
| **Primitive Obsession** | Strings, numbers, and booleans are used where domain-specific types would be clearer (e.g., bare strings for currency, magic number multipliers) | Introduce Domain Types — create small wrapper classes like `Currency`, `EmailAddress` |

---

## Refactoring Patterns

### Pattern 1: Extract Method

Decompose a long function into smaller, focused functions. Each extracted method should have a name that reveals its intent, making the original function read like a table of contents. This is the single most frequently used refactoring and the first one to reach for.

```python
# ❌ BAD: Long method that parses config, connects to DB, and runs report — three responsibilities in one
def process_report_request(request: dict) -> dict:
    """Process a report request from start to finish."""
    config_path = request.get("config_path", "/etc/app/report.conf")
    with open(config_path, "r") as f:
        lines = f.readlines()
    config = {}
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.strip().split("=", 1)
            config[key] = value

    db_host = config.get("db_host", "localhost")
    db_port = int(config.get("db_port", "5432"))
    db_name = config.get("db_name", "reports")
    connection_str = f"postgresql://{db_host}:{db_port}/{db_name}"

    results = []
    for metric_id in request.get("metrics", []):
        query = f"SELECT * FROM metrics WHERE id = {metric_id}"
        rows = execute_query(connection_str, query)
        for row in rows:
            results.append({
                "metric_id": metric_id,
                "value": row["value"],
                "timestamp": row["created_at"],
            })

    output = {"status": "ok", "count": len(results), "data": results}
    return output


# ✅ GOOD: Extracted into focused methods with clear responsibilities
from typing import Dict, List, Any


def load_config_from_file(config_path: str) -> dict[str, str]:
    """Load a key=value configuration file, ignoring comments and blank lines.

    Args:
        config_path: Filesystem path to the configuration file.

    Returns:
        Dictionary mapping configuration keys to string values.
    """
    config: Dict[str, str] = {}
    with open(config_path, "r") as f:
        for line in f:
            stripped = line.strip()
            if "=" in stripped and not stripped.startswith("#"):
                key, value = stripped.split("=", 1)
                config[key] = value
    return config


def build_connection_string(config: dict[str, str]) -> str:
    """Build a PostgreSQL connection string from parsed configuration.

    Args:
        config: Parsed configuration dictionary with db_host, db_port, db_name keys.

    Returns:
        A postgresql:// connection string.
    """
    db_host = config.get("db_host", "localhost")
    db_port = config.get("db_port", "5432")
    db_name = config.get("db_name", "reports")
    return f"postgresql://{db_host}:{db_port}/{db_name}"


def fetch_metric_results(connection_str: str, metric_ids: List[int]) -> List[dict[str, Any]]:
    """Execute queries for each metric ID and collect results.

    Args:
        connection_str: Database connection string.
        metric_ids: List of metric identifiers to query.

    Returns:
        List of result dictionaries with metric_id, value, and timestamp.
    """
    results: list[dict[str, Any]] = []
    for metric_id in metric_ids:
        query = f"SELECT * FROM metrics WHERE id = {metric_id}"
        rows = execute_query(connection_str, query)
        for row in rows:
            results.append({
                "metric_id": metric_id,
                "value": row["value"],
                "timestamp": row["created_at"],
            })
    return results


def process_report_request(request: dict) -> dict:
    """Process a report request by loading config, querying metrics, and returning results.

    Args:
        request: Dictionary containing config_path and metrics list.

    Returns:
        Response dictionary with status, count, and data entries.
    """
    config_path = request.get("config_path", "/etc/app/report.conf")
    config = load_config_from_file(config_path)
    connection_str = build_connection_string(config)
    metric_ids = request.get("metrics", [])

    results = fetch_metric_results(connection_str, metric_ids)

    return {"status": "ok", "count": len(results), "data": results}
```

### Pattern 2: Replace Long Parameter List with Parameter Object

When a function takes 4+ parameters that belong together (e.g., address components, database connection settings), consolidate them into a single object. This reduces signature noise and makes adding new fields a non-breaking change.

```python
# ❌ BAD: Seven parameters — difficult to read, hard to extend, easy to pass in wrong order
def send_notification(
    user_name: str,
    user_email: str,
    notification_type: str,
    message_body: str,
    priority: str,
    sender_name: str,
    reply_to_email: str,
) -> bool:
    """Send a notification with all parameters.

    Args:
        user_name: Recipient's display name.
        user_email: Recipient's email address.
        notification_type: Type of notification (email, sms, push).
        message_body: The content of the notification.
        priority: Priority level (low, medium, high).
        sender_name: Name of the sender.
        reply_to_email: Reply-to address for responses.

    Returns:
        True if sent successfully.
    """
    # ... implementation ...
    return True


# ✅ GOOD: Consolidated into a dedicated parameter object class
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class NotificationMessage:
    """Immutable container for all notification message data.

    Replaces a long list of individual parameters with a single,
    self-documenting object. New fields can be added without breaking
    existing callers.
    """

    recipient_name: str
    recipient_email: str
    notification_type: Literal["email", "sms", "push"]
    message_body: str
    priority: Literal["low", "medium", "high"] = "medium"
    sender_name: str = "System"
    reply_to_email: str = ""


def send_notification(message: NotificationMessage) -> bool:
    """Send a notification using the provided message configuration.

    Args:
        message: Complete notification configuration object.

    Returns:
        True if sent successfully, False otherwise.
    """
    # Implementation now works with a single, clear parameter
    subject = f"[{message.priority.upper()}] {message.notification_type.title()} Notification"
    body_lines = [
        f"To: {message.recipient_name} <{message.recipient_email}>",
        f"From: {message.sender_name}",
        "",
        message.message_body,
    ]
    # ... send logic using message fields ...
    return True


# Caller code is now self-documenting
def test_send_notification() -> None:
    """Verify notification sending with named arguments."""
    msg = NotificationMessage(
        recipient_name="Alice",
        recipient_email="alice@example.com",
        notification_type="email",
        message_body="Your order has shipped.",
        priority="high",
    )
    assert send_notification(msg) is True
```

### Pattern 3: Replace Conditional with Polymorphism

Eliminate long `if/elif/else` chains or `match/case` statements that select behavior based on type by using polymorphic dispatch. Each variant becomes a subclass that implements its own behavior, and the calling code simply calls the method without knowing which variant it is.

```python
# ❌ BAD: Switch statement that grows with every new shape — each addition risks breaking existing branches
def calculate_area(shape_type: str, **dimensions: float) -> float:
    """Calculate the area of a shape based on type and dimensions.

    Args:
        shape_type: One of 'circle', 'rectangle', 'triangle'.
        **dimensions: Shape-specific dimensions.

    Returns:
        The calculated area.
    """
    if shape_type == "circle":
        radius = dimensions.get("radius", 0)
        import math
        return math.pi * radius ** 2
    elif shape_type == "rectangle":
        width = dimensions.get("width", 0)
        height = dimensions.get("height", 0)
        return width * height
    elif shape_type == "triangle":
        base = dimensions.get("base", 0)
        height = dimensions.get("height", 0)
        return 0.5 * base * height
    else:
        raise ValueError(f"Unknown shape type: {shape_type}")


# ✅ GOOD: Polymorphic dispatch — new shapes add a subclass, not a branch
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Self


@dataclass(frozen=True)
class Shape(ABC):
    """Abstract base class for geometric shapes.

    Each subclass implements its own area calculation, eliminating
    the need for conditional dispatch in calling code.
    """

    @abstractmethod
    def area(self) -> float:
        """Calculate and return the area of this shape."""
        ...


@dataclass(frozen=True)
class Circle(Shape):
    """A circle defined by its radius."""

    radius: float

    def area(self) -> float:
        """Calculate the area using pi * r^2.

        Returns:
            The circle's area as a float.

        Raises:
            ValueError: If radius is negative.
        """
        if self.radius < 0:
            raise ValueError("Radius cannot be negative")
        return math.pi * self.radius ** 2


@dataclass(frozen=True)
class Rectangle(Shape):
    """A rectangle defined by its width and height."""

    width: float
    height: float

    def area(self) -> float:
        """Calculate the area using width * height.

        Returns:
            The rectangle's area as a float.
        """
        return self.width * self.height


@dataclass(frozen=True)
class Triangle(Shape):
    """A triangle defined by its base and height."""

    base: float
    height: float

    def area(self) -> float:
        """Calculate the area using 0.5 * base * height.

        Returns:
            The triangle's area as a float.
        """
        return 0.5 * self.base * self.height


def calculate_area(shape: Shape) -> float:
    """Calculate the area of any shape via polymorphic dispatch.

    Args:
        shape: Any concrete Shape subclass instance.

    Returns:
        The calculated area. No conditional logic needed —
        each shape knows how to compute its own area.
    """
    return shape.area()


# Usage is now clean and extensible
def test_calculate_area() -> None:
    """Verify polymorphic area calculation for all shape types."""
    assert calculate_area(Circle(radius=5.0)) == pytest.approx(78.5398)
    assert calculate_area(Rectangle(width=4.0, height=6.0)) == 24.0
    assert calculate_area(Triangle(base=10.0, height=3.0)) == 15.0
```

### Pattern 4: Introduce Null Object Pattern

Eliminate pervasive `if x is not None` checks throughout a codebase by introducing a Null Object that implements the same interface but provides safe default behavior. The caller never needs to check for null — it just uses the object normally.

```python
# ❌ BAD: Pervasive null checks everywhere the logger is used — every caller must remember to check
from typing import Any


class Logger:
    """A logging facade that may or may not be initialized."""

    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    def log(self, message: str, level: str = "info", **kwargs: Any) -> None:
        """Log a message at the specified level.

        Args:
            message: The log message to record.
            level: Log level (info, warning, error).
            **kwargs: Additional contextual data.
        """
        if self.enabled:
            print(f"[{level.upper()}] {message} | {kwargs}")  # noqa: T201 — example only


def process_order(order_id: str, logger: Logger) -> dict[str, Any]:
    """Process an order with optional logging.

    Args:
        order_id: The order identifier to process.
        logger: Logger instance (may be disabled).

    Returns:
        Processing result dictionary.
    """
    # Every caller must remember this check — it's easy to forget
    if logger is not None and logger.enabled:
        logger.log(f"Processing order {order_id}", "info")

    result = {"order_id": order_id, "status": "completed", "items": 3}

    if logger is not None and logger.enabled:
        logger.log(f"Order {order_id} completed with {result['items']} items", "debug")

    return result


# ✅ GOOD: NullObject provides safe default behavior — no null checks needed anywhere
from abc import ABC, abstractmethod


class Logger(ABC):
    """Abstract base defining the logging interface.

    Both the active logger and the null logger implement this interface,
    so callers never need null checks — they just call log() safely.
    """

    @abstractmethod
    def log(self, message: str, level: str = "info", **kwargs: Any) -> None: ...


class ActiveLogger(Logger):
    """Production logger that writes to console and/or file."""

    def __init__(self, output: str = "stdout") -> None:
        self.output = output

    def log(self, message: str, level: str = "info", **kwargs: Any) -> None:
        """Log a message at the specified level.

        Args:
            message: The log message to record.
            level: Log level (info, warning, error).
            **kwargs: Additional contextual data.
        """
        timestamp = __import__("datetime").datetime.now().isoformat()
        print(f"[{timestamp}] [{level.upper()}] {message} | {kwargs}")  # noqa: T201 — example only


class NullLogger(Logger):
    """No-op logger that silently discards all log calls.

    Use this when logging is disabled. Callers treat it identically
    to ActiveLogger — no conditional checks needed.
    """

    def log(self, message: str, level: str = "info", **kwargs: Any) -> None:
        """Discard the log message silently.

        Args:
            message: Ignored.
            level: Ignored.
            **kwargs: Ignored.
        """
        pass


def get_logger(enabled: bool = True) -> Logger:
    """Return an appropriate logger based on configuration.

    When disabled, returns NullLogger so callers never need to check for None.

    Args:
        enabled: Whether logging is active. Defaults to True.

    Returns:
        An ActiveLogger or NullLogger — both implement the same interface.
    """
    return ActiveLogger() if enabled else NullLogger()


def process_order(order_id: str, logger: Logger | None = None) -> dict[str, Any]:
    """Process an order with optional logging.

    Args:
        order_id: The order identifier to process.
        logger: Logger instance (may be None — replaced by NullLogger).

    Returns:
        Processing result dictionary.
    """
    # Caller gets a safe logger through factory — no None checks in business logic
    active_logger = logger if logger is not None else NullLogger()

    active_logger.log(f"Processing order {order_id}", "info")

    result = {"order_id": order_id, "status": "completed", "items": 3}

    active_logger.log(
        f"Order {order_id} completed with {result['items']} items", "debug"
    )

    return result


# Even a raw None from external config is handled safely at the boundary
def test_process_order_with_disabled_logging() -> None:
    """Calling with None should not raise — NullLogger handles it."""
    result = process_order("ORD-001", logger=None)
    assert result["status"] == "completed"
    assert result["items"] == 3
```

### Pattern 5: Decompose Conditional Complex Expressions

Simplify complex boolean expressions by extracting named variables or functions that describe the condition's intent. This turns unreadable one-liners into self-documenting code where each component has a clear name.

```python
# ❌ BAD: One enormous boolean expression with no readable names
def is_eligible_for_discount(customer: dict) -> bool:
    """Determine if customer qualifies for any discount."""
    return (
        customer.get("loyalty_years", 0) > 3
        and customer.get("purchase_count", 0) > 50
        and not customer.get("is_fraud_flagged", False)
        and sum(oi["price"] * oi["quantity"] for oi in customer.get("cart_items", [])) > 100
        and customer.get("account_status", "") == "active"
        and len(customer.get("last_logins", [])) == 0
        or (customer.get("vip_tier", 0) >= 2 and sum(oi["price"] * oi["quantity"] for oi in customer.get("cart_items", [])) > 50)
    )


# ✅ GOOD: Decomposed into named intermediate expressions
from datetime import datetime, timedelta
from typing import List, Dict, Any

CartItem = Dict[str, Any]


def cart_total(cart_items: List[Dict[str, Any]]) -> float:
    """Calculate the total value of all items in the cart.

    Args:
        cart_items: List of cart item dictionaries with price and quantity keys.

    Returns:
        The sum of price * quantity for all items, rounded to 2 decimals.
    """
    return round(
        sum(item["price"] * item["quantity"] for item in cart_items), 2
    )


def is_account_active(customer: dict) -> bool:
    """Check whether the customer account is in active status.

    Args:
        customer: Customer record with account_status field.

    Returns:
        True if account_status is 'active'.
    """
    return customer.get("account_status", "") == "active"


def has_no_recent_login(customer: dict) -> bool:
    """Check that the customer has not logged in within the last 90 days.

    Args:
        customer: Customer record with last_logins list of ISO date strings.

    Returns:
        True if there are no logins in the past 90 days, or no login history at all.
    """
    last_logins = customer.get("last_logins", [])
    if not last_logins:
        return True

    latest_login = max(
        datetime.fromisoformat(login) for login in last_logins
    )
    return (datetime.now() - latest_login) > timedelta(days=90)


def is_high_loyalty_customer(customer: dict) -> bool:
    """Check if the customer has 3+ years of loyalty and 50+ purchases.

    Args:
        customer: Customer record with loyalty_years and purchase_count fields.

    Returns:
        True if both loyalty thresholds are exceeded.
    """
    return (
        customer.get("loyalty_years", 0) > 3
        and customer.get("purchase_count", 0) > 50
    )


def has_min_cart_threshold(customer: dict, threshold: float = 100.0) -> bool:
    """Check if the cart total meets the minimum discount threshold.

    Args:
        customer: Customer record with cart_items list.
        threshold: Minimum cart total required. Defaults to 100.0.

    Returns:
        True if cart total meets or exceeds the threshold.
    """
    return cart_total(customer.get("cart_items", [])) >= threshold


def is_vip_eligible(customer: dict, vip_threshold: float = 50.0) -> bool:
    """Check VIP discount eligibility based on tier and cart minimum.

    Args:
        customer: Customer record with vip_tier and cart_items fields.
        vip_threshold: Minimum cart total for VIP discounts. Defaults to 50.0.

    Returns:
        True if customer is Tier 2+ AND meets the VIP cart threshold.
    """
    return (
        customer.get("vip_tier", 0) >= 2
        and has_min_cart_threshold(customer, vip_threshold)
    )


def is_eligible_for_discount(customer: dict) -> bool:
    """Determine if a customer qualifies for any discount based on their profile.

    A customer qualifies if they meet the standard loyalty requirements (high_loyalty
    + active account + no fraud flag + min cart threshold) OR are a VIP member.

    Args:
        customer: Customer record with all relevant profile fields.

    Returns:
        True if the customer meets any discount qualification path.
    """
    is_not_fraudulent = not customer.get("is_fraud_flagged", False)

    standard_path = (
        is_high_loyalty_customer(customer)
        and is_account_active(customer)
        and is_not_fraudulent
        and has_min_cart_threshold(customer)
    )

    vip_path = is_vip_eligible(customer)

    return standard_path or vip_path


# Now each condition is self-documenting and independently testable
def test_is_eligible_for_discount_standard_path() -> None:
    """Standard path: high loyalty, active, clean record, sufficient cart."""
    customer = {
        "loyalty_years": 5,
        "purchase_count": 100,
        "is_fraud_flagged": False,
        "account_status": "active",
        "cart_items": [{"price": 25.0, "quantity": 5}],  # Total = $125
        "last_logins": [],
    }
    assert is_eligible_for_discount(customer) is True


def test_is_eligible_for_discount_vip_path() -> None:
    """VIP path: tier 3 customer with even a small cart."""
    customer = {
        "loyalty_years": 1,
        "purchase_count": 10,
        "is_fraud_flagged": False,
        "account_status": "active",
        "cart_items": [{"price": 10.0, "quantity": 6}],  # Total = $60
        "last_logins": [],
        "vip_tier": 3,
    }
    assert is_eligible_for_discount(customer) is True


def test_is_eligible_for_discount_fraud_blocked() -> None:
    """Fraud flag blocks all discount paths regardless of other qualifications."""
    customer = {
        "loyalty_years": 10,
        "purchase_count": 500,
        "is_fraud_flagged": True,
        "account_status": "active",
        "cart_items": [{"price": 25.0, "quantity": 10}],
        "last_logins": [],
    }
    assert is_eligible_for_discount(customer) is False
```

### Pattern 6: Rename to Reveal Intent

Rename variables, functions, and classes so that their purpose is evident from the name alone. A good name eliminates the need for comments explaining what the code does. Use this when names are vague, use abbreviations, or describe implementation details instead of intent.

```python
# ❌ BAD: Names that communicate nothing about purpose — require reading implementation to understand
def proc(d, n):
    """Process data."""
    if n > 0:
        t = d * (1 + 0.08)
        r = {"out": t, "ok": True}
    else:
        r = {"out": 0.0, "ok": False}
    return r


class c:
    def __init__(self, i, e):
        self.id = i
        self.eml = e

    def calc(self, p, q):
        if p < 0 or q < 0:
            raise ValueError("Invalid")
        return p * q


# ✅ GOOD: Names that reveal intent at a glance — implementation details are hidden

def calculate_taxed_total(price: float) -> dict[str, float | bool]:
    """Calculate the final price including tax with validation.

    Args:
        price: The pre-tax price of the item. Must be non-negative.

    Returns:
        Dictionary with 'total' (tax-inclusive price) and 'valid' (always True).

    Raises:
        ValueError: If price is negative.
    """
    if price < 0:
        raise ValueError(f"Price must be non-negative, got {price}")

    tax_rate: float = 0.08
    total = price * (1 + tax_rate)
    return {"total": round(total, 2), "valid": True}


class Customer:
    """Represents a customer in the system.

    Attributes:
        id: Unique customer identifier.
        email: Customer's primary email address.
    """

    def __init__(self, customer_id: int, email: str) -> None:
        """Initialize a customer record.

        Args:
            customer_id: Unique numeric identifier for the customer.
            email: Valid email address for the customer.
        """
        self.id = customer_id
        self.email = email

    def validate_email(self) -> bool:
        """Validate that the customer's email contains a proper domain.

        Returns:
            True if the email contains exactly one '@' symbol and has text on both sides.
        """
        parts = self.email.split("@")
        return len(parts) == 2 and all(len(part) > 0 for part in parts)


# Before/after comparison for method renaming

# ❌ BAD: Generic verb names that don't indicate what is being done
class OrderProcessor:
    def handle(self, order_id: str) -> dict: ...
    def validate(self, order_id: str) -> bool: ...
    def submit(self, order_id: str) -> bool: ...
    def cancel(self, order_id: str) -> None: ...


# ✅ GOOD: Intent-revealing names that describe the business action

class OrderProcessor:
    """Handles the complete lifecycle of an order.

    Each method name describes the specific business operation being performed.
    """

    def load_order_by_id(self, order_id: str) -> dict | None:
        """Fetch the order record from the database by its ID.

        Args:
            order_id: The unique order identifier to look up.

        Returns:
            Order dictionary if found, or None if not found.
        """
        ...

    def verify_order_eligibility(self, order_id: str) -> bool:
        """Check whether the order can be processed (not cancelled, not refunded).

        Args:
            order_id: The unique order identifier to check.

        Returns:
            True if the order is in a processable state.
        """
        ...

    def dispatch_order(self, order_id: str) -> bool:
        """Send the order to the fulfillment system for shipping.

        Args:
            order_id: The unique order identifier to dispatch.

        Returns:
            True if dispatch was accepted by the fulfillment system.
        """
        ...

    def void_order(self, order_id: str) -> None:
        """Cancel and void an order before it is dispatched.

        Args:
            order_id: The unique order identifier to void.

        Raises:
            RuntimeError: If the order has already been dispatched.
        """
        ...
```

---

## Constraints

### MUST DO
- Always verify the full test suite passes green before starting a refactoring — never refactor without a safety net
- Apply exactly one refactoring transformation per commit — atomic, reversible changes enable safe incremental progress
- Never mix refactoring with feature additions in the same commit — they create separate concerns that are hard to review and revert
- Use Extract Method as the first and most frequently applied technique for any function exceeding 15–20 lines
- Rename variables and functions so their intent is obvious without reading the implementation — a name should answer "why" not just "what"
- Replace magic numbers and strings with named constants before extracting methods from code containing them
- Verify behavioral equivalence after each transformation by running tests or comparing function outputs against known inputs
- Prefer composition over deep inheritance hierarchies when replacing conditionals — extract method objects rather than creating fragile class trees

### MUST NOT DO
- Never perform refactoring in production without a test suite covering the changed code — untested refactoring is gambling with correctness
- Never refactor code that has not been modified or causing pain for more than 24 months — it likely works fine and change creates risk
- Never rename a public API surface without updating all callers and documenting the breaking change — internal-only renames are safe, public ones require coordination
- Never combine multiple unrelated refactorings into a single large commit — this creates an unreviewable diff and makes git blame useless
- Never introduce inheritance purely to eliminate a conditional — prefer polymorphism only when the class hierarchy already exists and makes sense
- Never use "FIXME" or "TODO" comments as justification for leaving bad code — if it's bad enough to comment, refactor it now

---

## Related Skills

| Skill | Purpose |
|---|---|
| `test-driven-development` | Write tests before refactoring to establish a safety net — TDD makes refactoring safe and fast |
| `software-testing-strategy` | Design comprehensive test suites that cover the behavior you must preserve during refactoring |
| `dry-principles` | Understand when duplication is real (warranting extraction) vs. coincidental (not worth collapsing) to avoid over-refactoring |
