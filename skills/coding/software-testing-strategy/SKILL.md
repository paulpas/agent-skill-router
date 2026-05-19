---
name: software-testing-strategy
description: Implements comprehensive testing strategies (unit, integration, property-based, mocking, fixture design) to validate software correctness and prevent regressions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: testing strategy, unit test, integration test, property-based testing, test coverage, mocking, assertion, pytest, test suite design, how do i write tests
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: test-driven-development, refactoring-techniques, code-quality-policies
---

# Software Testing Strategy

Implements comprehensive testing strategies across the full stack to validate software correctness and prevent regressions. Models this skill as a senior QA engineer who designs test architectures, selects appropriate strategies per context, and writes production-grade test suites using pytest conventions with property-based discovery for edge case coverage.

## TL;DR Checklist

- [ ] Classify each target under unit, integration, or system-level testing
- [ ] Write one focused assertion per test function with descriptive names
- [ ] Use pytest fixtures for shared setup instead of repeating boilerplate in every test
- [ ] Apply property-based testing (hypothesis) on functions with complex input domains
- [ ] Mock external dependencies at boundaries; never mock the code under test
- [ ] Verify coverage meets minimum threshold (80%+ for critical paths, 60%+ overall)
- [ ] Organize conftest.py fixtures by scope (session > module > function) to reduce runtime

---

## When to Use

Use this skill when:

- Designing a test suite from scratch for a new module or microservice
- Refactoring legacy code that lacks tests and you need a safe landing zone
- Adding regression tests for a newly discovered bug to prevent reoccurrence
- Evaluating whether your current test strategy has the right balance of unit vs. integration tests
- Onboarding new engineers who need guidance on testing conventions and patterns

---

## When NOT to Use

Avoid this skill for:

- Writing documentation or user-facing guides — use `writing` skills instead
- Static analysis, linting, or type checking — those are compile-time concerns, not runtime tests
- Performance benchmarking or load testing — use dedicated profiling tools (e.g., pytest-benchmark, locust) rather than functional test patterns

---

## Core Workflow

1. **Assess Scope and Risk** — Identify which components require what level of test coverage. High-risk areas (payment processing, data mutations, authentication) demand thorough integration and property-based tests. Low-risk utilities (formatters, string helpers) need focused unit tests only. **Checkpoint:** Map each module to a risk tier before writing any test code.

2. **Select Strategies Per Tier** — Choose the appropriate testing strategy based on what you are validating:
   - Unit tests for isolated business logic and pure functions
   - Integration tests for database interactions, API endpoints, and cross-module workflows
   - Property-based tests for functions with complex input invariants (parsers, validators, formatters)
   - Contract tests for services communicating over networks or message queues
   **Checkpoint:** Every selected strategy must have a concrete test target identified.

3. **Implement Tests Following Conventions** — Write tests using pytest with the following patterns:
   - One assert per test function (or related asserts grouped tightly)
   - Test names follow `test_<subject>_<condition>_<expected>` convention
   - Use fixtures for setup, not helper functions that duplicate logic
   - Parameterize repetitive tests over input/output pairs
   **Checkpoint:** Each test must be independently runnable with `pytest -v`.

4. **Verify Coverage and Quality** — Run pytest with coverage reporting (`pytest --cov=src --cov-report=term-missing`). Check that:
   - Critical paths have 100% branch coverage
   - Overall line coverage meets the project threshold
   - No tests depend on execution order (no hidden fixture state leakage)
   **Checkpoint:** All green, coverage meets thresholds, `pytest --co` shows expected test count.

5. **Maintain Suite Organization** — Structure tests alongside source code (`tests/unit/`, `tests/integration/`). Keep `conftest.py` at each level with appropriately scoped fixtures. Avoid circular fixture dependencies and session-scoped state that couples unrelated tests. **Checkpoint:** Adding a new test to any module requires minimal or zero conftest modifications.

---

## Implementation Patterns

### Pattern 1: Unit Test Design (BAD vs. GOOD)

Unit tests validate isolated functions with no external dependencies. The key principle is one behavioral claim per test, with input and output that make the assertion obvious.

```python
# ❌ BAD: Multiple unrelated assertions, vague naming, no fixtures, mixed setup
def test_user():
    user = {"name": "Alice", "email": "alice@example.com"}
    assert len(user) > 0
    assert user["name"] == "Alice"
    assert "@" in user["email"]

# ❌ BAD: Asserting implementation detail (number of assertions) rather than behavior
def test_calculate_total():
    items = [{"price": 10.0, "qty": 2}, {"price": 5.0, "qty": 3}]
    total = sum(i["price"] * i["qty"] for i in items)
    assert total == 35.0
    # No assertion about the function itself — just re-implementing logic

# ✅ GOOD: One clear behavioral claim, descriptive name, typed inputs, docstring
from dataclasses import dataclass


@dataclass
class OrderItem:
    """Represents a single line item in an order."""

    price: float
    quantity: int
    tax_rate: float = 0.08

    @property
    def subtotal(self) -> float:
        return self.price * self.quantity

    @property
    def taxed_total(self) -> float:
        return self.subtotal * (1 + self.tax_rate)


def calculate_order_total(items: list[OrderItem], discount_pct: float = 0.0) -> float:
    """Calculate the final order total after applying optional discount.

    Args:
        items: List of order line items with prices and quantities.
        discount_pct: Discount percentage (0.0 to 1.0). Defaults to 0.0.

    Returns:
        The final total after tax and discount, rounded to 2 decimal places.
    """
    gross = sum(item.taxed_total for item in items)
    net = gross * (1 - discount_pct)
    return round(net, 2)


# Tests — each one asserts a single behavioral claim
class TestCalculateOrderTotal:
    """Tests for calculate_order_total function."""

    def test_returns_zero_for_empty_order(self) -> None:
        """An order with no items should total zero."""
        assert calculate_order_total([]) == 0.0

    def test_applies_tax_to_each_item_before_discount(self) -> None:
        """Tax is computed per-item; discount applies to the gross sum."""
        items = [OrderItem(price=100.0, quantity=2, tax_rate=0.10)]
        # Subtotal = 200, Taxed = 220, no discount => 220.0
        assert calculate_order_total(items) == 220.0

    def test_applies_percentage_discount_after_tax(self) -> None:
        """A 10% discount on $220 gross should yield $198.0."""
        items = [OrderItem(price=100.0, quantity=2, tax_rate=0.10)]
        assert calculate_order_total(items, discount_pct=0.10) == 198.0

    def test_rounds_to_two_decimal_places(self) -> None:
        """Results are always rounded to cents."""
        items = [OrderItem(price=33.33, quantity=3, tax_rate=0.05)]
        result = calculate_order_total(items)
        assert result == round(result, 2)
```

### Pattern 2: Integration Test Architecture

Integration tests validate that multiple components work together — typically database operations, API endpoints, or service-to-service calls. They require proper setup and teardown, often using test databases or containers.

```python
# ❌ BAD: No isolation between tests, shared mutable state, no cleanup
import sqlite3


def get_db():
    """Creates a connection to the global database."""
    return sqlite3.connect("production.db")  # Points at production!


def test_create_user():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Alice", "a@b.com"))
    db.commit()
    # No cleanup — subsequent tests pollute shared state

# ❌ BAD: Tests depend on external network calls to a live service
def test_payment_flow():
    response = requests.post("https://api.stripe.com/v1/charges", ...)  # Real API call!
    assert response.status_code == 200


# ✅ GOOD: SQLite in-memory database with proper teardown via fixtures
import sqlite3
from typing import Iterator

import pytest


@pytest.fixture(scope="module")
def db_connection() -> Iterator[sqlite3.Connection]:
    """Provide an isolated in-memory SQLite database for the test module.

    Yields a connection to a fresh in-memory database with schema initialized,
    then closes it when the module tests are complete.
    """
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        );
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_cents INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    yield conn
    conn.close()


def create_user(db_connection: sqlite3.Connection, name: str, email: str) -> int:
    """Insert a user and return the generated ID.

    Args:
        db_connection: Active database connection.
        name: User's display name.
        email: User's unique email address.

    Returns:
        The newly created user's primary key ID.

    Raises:
        sqlite3.IntegrityError: If email already exists.
    """
    cursor = db_connection.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
    db_connection.commit()
    return cursor.lastrowid


def get_user_by_email(db_connection: sqlite3.Connection, email: str) -> dict | None:
    """Fetch a user record by email address.

    Args:
        db_connection: Active database connection.
        email: The email to look up.

    Returns:
        Dictionary with user fields, or None if not found.
    """
    cursor = db_connection.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    if row is None:
        return None
    return {"id": row[0], "name": row[1], "email": row[2]}


def test_create_and_retrieve_user(db_connection: sqlite3.Connection) -> None:
    """Verify that inserting a user allows retrieval by email."""
    user_id = create_user(db_connection, "Alice", "alice@example.com")
    assert user_id is not None

    user = get_user_by_email(db_connection, "alice@example.com")
    assert user is not None
    assert user["name"] == "Alice"
    assert user["email"] == "alice@example.com"


def test_duplicate_email_raises_integrity_error(db_connection: sqlite3.Connection) -> None:
    """Inserting a duplicate email should raise IntegrityError."""
    create_user(db_connection, "Alice", "alice@example.com")
    with pytest.raises(sqlite3.IntegrityError):
        create_user(db_connection, "Bob", "alice@example.com")  # Same email
```

### Pattern 3: Property-Based Testing with hypothesis Library

Property-based testing discovers edge cases by generating thousands of random inputs that must satisfy declared invariants. Use it for functions with complex input validation logic.

```python
from typing import List
from hypothesis import given, strategies as st
from hypothesis.strategies import composite


@composite
def sorted_lists_of_integers(draw, min_value: int = -100, max_value: int = 100) -> List[int]:
    """Generate a non-empty list of integers sorted in ascending order.

    Args:
        draw: Hypothesis draw function.
        min_value: Lower bound for generated integers.
        max_value: Upper bound for generated integers.

    Returns:
        A strategy producing sorted lists within the specified range.
    """
    raw = draw(st.lists(st.integers(min_value, max_value), min_size=1))
    return sorted(raw)


def bubble_sort(items: list[int]) -> list[int]:
    """Return a new sorted list using the bubble sort algorithm.

    Args:
        items: Unsorted list of integers.

    Returns:
        A new list with elements in ascending order. Original is unmodified.
    """
    result = list(items)  # Defensive copy
    n = len(result)
    for i in range(n):
        for j in range(0, n - i - 1):
            if result[j] > result[j + 1]:
                result[j], result[j + 1] = result[j + 1], result[j]
    return result


class TestBubbleSort:
    """Property-based tests that verify sorting invariants."""

    @given(st.lists(st.integers(), min_size=1))
    def test_output_is_sorted(self, sample: list[int]) -> None:
        """Every output list must be in ascending order."""
        result = bubble_sort(sample)
        for i in range(len(result) - 1):
            assert result[i] <= result[i + 1]

    @given(st.lists(st.integers(), min_size=1))
    def test_preserves_length(self, sample: list[int]) -> None:
        """Sorting must not change the number of elements."""
        result = bubble_sort(sample)
        assert len(result) == len(sample)

    @given(st.lists(st.integers(), min_size=1))
    def test_preserves_element_counts(self, sample: list[int]) -> None:
        """Sorting is a permutation — same elements, same counts."""
        result = bubble_sort(sample)
        assert sorted(sample) == result

    @given(st.lists(st.integers(-50, 50), min_size=1))
    def test_idempotent(self, sample: list[int]) -> None:
        """Sorting an already-sorted list produces the same result."""
        first_pass = bubble_sort(sample)
        second_pass = bubble_sort(first_pass)
        assert first_pass == second_pass


def parse_iso_date(date_string: str) -> dict[str, int]:
    """Parse an ISO 8601 date string (YYYY-MM-DD) into components.

    Args:
        date_string: Date in YYYY-MM-DD format.

    Returns:
        Dictionary with keys 'year', 'month', 'day'.

    Raises:
        ValueError: If the string does not match ISO 8601 format.
    """
    import datetime

    try:
        d = datetime.date.fromisoformat(date_string)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Invalid ISO date format: {date_string}") from exc
    return {"year": d.year, "month": d.month, "day": d.day}


class TestParseIsoDate:
    """Property tests for ISO date parsing."""

    @given(st.integers(1970, 2099), st.integers(1, 12), st.integers(1, 28))
    def test_round_trip_with_valid_dates(self, year: int, month: int, day: int) -> None:
        """A valid date round-trips through parsing."""
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        result = parse_iso_date(date_str)
        assert result["year"] == year
        assert result["month"] == month
        assert result["day"] == day

    @given(st.text(min_size=1).filter(lambda s: "invalid" in s.lower()))
    def test_rejects_invalid_strings(self, invalid_input: str) -> None:
        """Strings containing 'invalid' should not be valid dates."""
        with pytest.raises(ValueError):
            parse_iso_date(invalid_input)
```

### Pattern 4: Mocking Strategy (BAD vs. GOOD)

Mocking isolates the code under test from external dependencies. The guiding principle: mock at the boundary of your system, never mock the thing you are testing.

```python
# ❌ BAD: Mocking the code under test defeats the purpose entirely
from unittest.mock import patch


def calculate_discount(price: float, category: str) -> float:
    """Apply category-based discount logic."""
    if category == "premium":
        return price * 0.9
    elif category == "bulk":
        return price * 0.85
    return price


# ❌ BAD: Mocking the function you're testing — asserts on the mock, not real behavior
def test_calculate_discount_bad():
    with patch("__main__.calculate_discount", return_value=90.0):
        result = calculate_discount(100.0, "premium")
        assert result == 90.0  # Asserting on your mock's hardcoded return value

# ❌ BAD: Mocking internal implementation details instead of external interfaces
def test_bad_internal_mock():
    with patch.object(Order, "_apply_tax", return_value=110.0):
        order = Order(100.0)
        result = order.calculate_total()  # You're mocking the function you want to test!
        assert result == 110.0


# ✅ GOOD: Mock external dependencies (HTTP client, database, file system) at boundaries
from dataclasses import dataclass
from datetime import datetime

import requests


@dataclass
class PriceRecord:
    """A price record fetched from an external pricing service."""

    symbol: str
    price: float
    currency: str = "USD"
    last_updated: datetime | None = None


def fetch_current_price(symbol: str, api_base_url: str = "https://api.example.com") -> PriceRecord:
    """Fetch the current price for a trading symbol from the pricing service.

    Args:
        symbol: Trading symbol to look up (e.g., 'AAPL').
        api_base_url: Base URL of the pricing API.

    Returns:
        PriceRecord with the fetched price data.

    Raises:
        ConnectionError: If the API is unreachable.
        ValueError: If the response contains an error status.
    """
    url = f"{api_base_url}/prices/{symbol}"
    response = requests.get(url, timeout=10)
    if response.status_code != 200:
        raise ValueError(f"Pricing API returned {response.status_code}: {response.text}")

    data = response.json()
    return PriceRecord(
        symbol=symbol,
        price=float(data["price"]),
        currency=data.get("currency", "USD"),
        last_updated=datetime.fromisoformat(data["last_updated"]),
    )


class TestFetchCurrentPrice:
    """Tests for fetch_current_price using proper mock boundaries."""

    def test_returns_parsed_price_record_on_success(self, requests_mock) -> None:  # type: ignore[name-defined]
        """Successful API response should produce a PriceRecord with correct values."""
        requests_mock.get(
            "https://api.example.com/prices/AAPL",
            json={"price": "178.50", "currency": "USD", "last_updated": "2026-01-15T10:30:00"},
            status_code=200,
        )

        record = fetch_current_price("AAPL")

        assert record.symbol == "AAPL"
        assert record.price == 178.50
        assert record.currency == "USD"
        assert record.last_updated is not None

    def test_raises_on_error_status_code(self, requests_mock) -> None:  # type: ignore[name-defined]
        """Non-200 responses should raise ValueError with the response body."""
        requests_mock.get(
            "https://api.example.com/prices/INVALID",
            json={"error": "symbol not found"},
            status_code=404,
        )

        with pytest.raises(ValueError) as exc_info:
            fetch_current_price("INVALID")

        assert "404" in str(exc_info.value)

    def test_uses_timeout_parameter(self, requests_mock) -> None:  # type: ignore[name-defined]
        """API calls should include a reasonable timeout."""
        requests_mock.get(
            "https://api.example.com/prices/TSLA",
            json={"price": "250.0", "currency": "USD", "last_updated": "2026-01-15T10:30:00"},
            status_code=200,
        )

        fetch_current_price("TSLA")
        last_call = requests_mock.last_request  # type: ignore[attr-defined]
        assert last_call is not None
```

### Pattern 5: Test Fixtures and Parameterization

Pytest fixtures provide a powerful dependency injection mechanism for test setup. Use `conftest.py` to share fixtures across tests, parametrize repetitive cases, and scope fixtures appropriately (session > package > module > function).

```python
# File: tests/conftest.py
"""Root-level pytest fixtures shared across all test modules."""

from typing import Iterator

import pytest


@pytest.fixture(scope="session")
def sample_products() -> list[dict]:
    """Provide a fixed set of product data for the entire test session.

    This fixture is session-scoped because the product catalog does not change
    during testing and creating it once saves significant time.
    """
    return [
        {"id": 1, "name": "Laptop", "price": 999.99, "category": "electronics"},
        {"id": 2, "name": "Coffee Mug", "price": 12.50, "category": "kitchen"},
        {"id": 3, "name": "Headphones", "price": 79.95, "category": "electronics"},
    ]


@pytest.fixture(scope="function")
def fresh_cart() -> dict:
    """Provide an empty shopping cart for each test function.

    Function-scoped ensures no state leaks between tests.
    """
    return {"items": [], "discount_code": None}


@pytest.fixture(scope="module")
def authenticated_user() -> dict:
    """Simulate an authenticated user session for module-level tests.

    Module-scoped to avoid re-authenticating for every test in the same file.
    """
    return {
        "user_id": 42,
        "email": "tester@example.com",
        "roles": ["customer", "reviewer"],
        "session_token": "tok_test_abc123",
    }


# File: tests/test_cart.py
"""Tests demonstrating fixture usage and parameterization."""

from typing import Tuple

import pytest


def add_item_to_cart(cart: dict, product: dict, quantity: int = 1) -> None:
    """Add an item to the shopping cart.

    Args:
        cart: The cart dictionary with 'items' key.
        product: Product dictionary with id, name, price, and category.
        quantity: Number of units to add. Defaults to 1.
    """
    existing = next((i for i in cart["items"] if i["product_id"] == product["id"]), None)
    if existing:
        existing["quantity"] += quantity
    else:
        cart["items"].append({
            "product_id": product["id"],
            "name": product["name"],
            "price": product["price"],
            "quantity": quantity,
        })


def calculate_cart_total(cart: dict) -> float:
    """Calculate the total price of all items in the cart.

    Args:
        cart: The cart dictionary containing 'items' list.

    Returns:
        Total price rounded to 2 decimal places.
    """
    subtotal = sum(
        item["price"] * item["quantity"] for item in cart["items"]
    )
    return round(subtotal, 2)


class TestAddItemToCart:
    """Tests for add_item_to_cart using parameterized inputs."""

    def test_adds_new_item_to_empty_cart(
        self, fresh_cart: dict, sample_products: list[dict]
    ) -> None:
        """Adding to an empty cart should create a new item entry."""
        laptop = sample_products[0]
        add_item_to_cart(fresh_cart, laptop)

        assert len(fresh_cart["items"]) == 1
        assert fresh_cart["items"][0]["quantity"] == 1
        assert fresh_cart["items"][0]["name"] == "Laptop"

    def test_increments_quantity_for_existing_item(
        self, fresh_cart: dict, sample_products: list[dict]
    ) -> None:
        """Adding same product twice should increase quantity, not duplicate."""
        laptop = sample_products[0]
        add_item_to_cart(fresh_cart, laptop)
        add_item_to_cart(fresh_cart, laptop)

        assert len(fresh_cart["items"]) == 1
        assert fresh_cart["items"][0]["quantity"] == 2

    @pytest.mark.parametrize(
        "product_idx,quantity,expected_total",
        [
            (0, 1, 999.99),     # Laptop, qty 1
            (1, 3, 37.50),      # Coffee Mug, qty 3
            (2, 2, 159.90),     # Headphones, qty 2
            (0, 1, 999.99),     # Single item — total equals line item
        ],
    )
    def test_calculates_total_correctly_for_various_items(
        self,
        fresh_cart: dict,
        sample_products: list[dict],
        product_idx: int,
        quantity: int,
        expected_total: float,
    ) -> None:
        """Cart total should correctly multiply price by quantity for each item."""
        product = sample_products[product_idx]
        add_item_to_cart(fresh_cart, product, quantity)

        assert calculate_cart_total(fresh_cart) == expected_total


class TestMultipleItemsTotal:
    """Tests with fixture composition — mixing fixtures and parametrization."""

    def test_cart_with_mixed_items(
        self, fresh_cart: dict, sample_products: list[dict]
    ) -> None:
        """Cart with multiple different items sums each line correctly."""
        laptop = sample_products[0]  # $999.99 x 1 = $999.99
        mug = sample_products[1]     # $12.50 x 4 = $50.00
        headphones = sample_products[2]  # $79.95 x 1 = $79.95

        add_item_to_cart(fresh_cart, laptop)
        add_item_to_cart(fresh_cart, mug, quantity=4)
        add_item_to_cart(fresh_cart, headphones)

        expected = round(999.99 + (12.50 * 4) + 79.95, 2)
        assert calculate_cart_total(fresh_cart) == expected
```

---

## Constraints

### MUST DO
- Name every test function `test_<descriptive_name>` so pytest discovers it and failure messages are readable
- Use pytest fixtures for all shared setup — never duplicate setup logic in individual tests
- Apply property-based testing (hypothesis) on functions with complex input domains such as parsers, validators, and formatters
- Mock external dependencies (HTTP clients, databases, file systems) at system boundaries using `pytest-mock` or similar
- Scope fixtures appropriately: `session` for immutable data, `module` for shared resources, `function` for mutable state
- Include docstrings on all test classes and modules explaining what behavior is being validated
- Use `@pytest.mark.parametrize` for testing multiple input/output pairs instead of duplicating test functions
- Write assertions that check observable behavior, not internal implementation details or variable values
- Keep tests independent — no test should depend on the execution order of another test

### MUST NOT DO
- Never mock the code under test — mocking your own function defeats the purpose of testing it
- Never use `time.sleep()` in tests — use proper async patterns, event loops, or mocks for time-dependent logic
- Never hardcode environment-specific values (production URLs, API keys, file paths) in test fixtures
- Never skip tests with bare `pytest.skip()` — use `@pytest.mark.skipif(condition, reason="...")` for conditional skipping
- Never assert on exception messages unless they are part of the public contract — use `pytest.raises` to verify error types only
- Never write tests that depend on execution order by sharing mutable state in module-level variables or session-scoped fixtures without isolation
- Never disable coverage for "known gaps" without a tracked ticket explaining the rationale

---

## Related Skills

| Skill | Purpose |
|---|---|
| `test-driven-development` | Complementary approach — write tests before code to drive design decisions |
| `refactoring-techniques` | Refactor production code safely when you have a solid test suite as safety net |
| `code-quality-policies` | Establish linting, type checking, and static analysis gates that complement runtime tests |
