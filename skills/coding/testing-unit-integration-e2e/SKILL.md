---




name: testing-unit-integration-e2e
description: Implements comprehensive testing strategies (unit, integration, contract,
  and end-to-end) with appropriate test doubles, isolation levels, and coverage thresholds
  for reliable software delivery.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: unit testing, integration testing, contract testing, end-to-end testing,
    e2e, test doubles, test isolation, smoke tests
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
  related-skills: testing-tdd, testing-mocking-stubs, code-review, testing-static-analysis




---




# Comprehensive Testing Strategies

Architects and writes layered test suites that isolate concerns, validate system boundaries, and prevent regressions across unit, integration, contract, and end-to-end layers. This skill enforces the test pyramid: many fast, narrow unit tests, fewer integration tests, and minimal end-to-end tests that cover user journeys.

## TL;DR Checklist

- [ ] Isolate unit tests from external dependencies (network, filesystem, database) using mocks or fakes
- [ ] Name unit tests using behavior: `test_user_login_fails_with_invalid_credentials`
- [ ] Use in-memory databases or test containers for integration tests — never the production database
- [ ] Write contract tests that validate service boundaries independently of implementation
- [ ] Restrict end-to-end tests to happy paths and critical failure scenarios only
- [ ] Configure CI coverage thresholds (e.g., 80% line coverage) and enforce as a quality gate
- [ ] Never use `sleep()` or arbitrary delays — use explicit waits, retries, or event polling

---

## When to Use

Use this skill when:

- Designing a test strategy for a new feature or service
- Reviewing an existing codebase for test gaps or misclassified tests
- Setting up CI/CD pipelines with appropriate test execution stages
- Mentoring junior engineers on testing best practices and test pyramid principles
- Refactoring code to improve testability (e.g., introducing dependency injection)
- Auditing flaky tests and implementing remediation strategies

---

## When NOT to Use

Avoid this skill for:

- Simple scripts with no business logic (a few assertions are sufficient)
- Rapid prototyping phases where formal tests would slow iteration
- Infrastructure-only deployments without application code (use infrastructure tests instead)
- One-off data migrations or ad-hoc scripts

---

## Core Workflow

1. **Define Test Pyramid Strategy** — Map every feature and boundary condition to the appropriate test layer. **Checkpoint:** Unit tests should constitute ~70% of the suite, integration tests ~20%, and E2E tests ~10%.

2. **Write Unit Tests** — Isolated, fast, deterministic tests for individual functions and classes. **Checkpoint:** Verify no network calls, no real database connections, no filesystem I/O, and no non-deterministic behavior (random, time-dependent without mocking).

3. **Write Integration Tests** — Validate interactions between two or more components using real or in-memory replacements. **Checkpoint:** Use test containers, in-memory databases, or test doubles for external services. Each integration test should exercise a real interaction path.

4. **Write Contract Tests** — Validate service boundaries and API contracts between services. **Checkpoint:** Consumer-driven contracts must pass independently without requiring the provider service to be running.

5. **Write E2E Tests** — Validate critical user journeys from the user's perspective. **Checkpoint:** Only cover happy paths and critical failure scenarios. Use stable selectors, explicit waits, and avoid brittle DOM-dependent assertions.

6. **Configure Coverage & Quality Gates** — Set coverage thresholds and enforce them in CI. **Checkpoint:** Coverage thresholds must be set per-module (not globally) to avoid gaming the metric. Never treat 100% coverage as a goal — focus on branch coverage for critical paths.

---

## Implementation Patterns

### Pattern 1: Unit Testing (Isolation & Mocking)

Unit tests must exercise a single unit of code in complete isolation from its dependencies. Use dependency injection to make dependencies substitutable, then apply test doubles (mocks, stubs, or fakes) to verify behavior.

```python
# ❌ BAD: Tight coupling makes the unit untestable
class PaymentService:
    def __init__(self):
        self.gateway = StripeGateway()          # Hard-coded dependency
        self.db = PostgreSQLConnection()         # Hard-coded dependency

    def process_refund(self, order_id: str, amount: float) -> bool:
        # Calls real network and real database — cannot test without them
        order = self.db.get_order(order_id)
        if order.status != "paid":
            return False
        self.gateway.refund(order.payment_token, amount)
        self.db.update_order_status(order_id, "refunded")
        return True
```

```python
# ✅ GOOD: Dependency injection enables full isolation with mocks
from typing import Protocol
from dataclasses import dataclass

@dataclass
class Order:
    order_id: str
    status: str
    payment_token: str
    amount: float

class PaymentGateway(Protocol):
    """External payment gateway contract for dependency injection."""
    def refund(self, token: str, amount: float) -> bool: ...

class OrderRepository(Protocol):
    """External data access contract for dependency injection."""
    def get_order(self, order_id: str) -> Order | None: ...
    def update_order_status(self, order_id: str, status: str) -> None: ...

class PaymentService:
    """Processes payments and refunds with pluggable dependencies."""

    def __init__(
        self,
        gateway: PaymentGateway,
        repository: OrderRepository,
    ) -> None:
        self._gateway = gateway
        self._repository = repository

    def process_refund(self, order_id: str, amount: float) -> bool:
        """Process a refund for a paid order.

        Args:
            order_id: The unique identifier of the order to refund.
            amount: The refund amount. Must not exceed the original order total.

        Returns:
            True if the refund was processed successfully.
        """
        order = self._repository.get_order(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found")
        if order.status != "paid":
            return False
        if amount > order.amount:
            raise ValueError(f"Refund amount {amount} exceeds order total {order.amount}")

        success = self._gateway.refund(order.payment_token, amount)
        if success:
            self._repository.update_order_status(order_id, "refunded")
        return success


# ---- Test with unittest.mock (pytest-compatible) ----
import unittest
from unittest.mock import MagicMock, patch

class TestPaymentServiceRefund(unittest.TestCase):

    def setUp(self) -> None:
        self.mock_gateway = MagicMock(spec=PaymentGateway)
        self.mock_repo = MagicMock(spec=OrderRepository)
        self.service = PaymentService(
            gateway=self.mock_gateway,
            repository=self.mock_repo,
        )

    def test_process_refund_succeeds_for_paid_order(self) -> None:
        # Arrange
        order = Order(order_id="ord-123", status="paid", payment_token="tok_abc", amount=99.99)
        self.mock_repo.get_order.return_value = order
        self.mock_gateway.refund.return_value = True

        # Act
        result = self.service.process_refund("ord-123", 50.0)

        # Assert
        self.assertTrue(result)
        self.mock_gateway.refund.assert_called_once_with("tok_abc", 50.0)
        self.mock_repo.update_order_status.assert_called_once_with("ord-123", "refunded")

    def test_process_refund_returns_false_for_non_paid_order(self) -> None:
        # Arrange
        order = Order(order_id="ord-123", status="shipped", payment_token="tok_abc", amount=99.99)
        self.mock_repo.get_order.return_value = order

        # Act
        result = self.service.process_refund("ord-123", 50.0)

        # Assert
        self.assertFalse(result)
        self.mock_gateway.refund.assert_not_called()
        self.mock_repo.update_order_status.assert_not_called()

    def test_process_refund_raises_for_amount_exceeding_total(self) -> None:
        # Arrange
        order = Order(order_id="ord-123", status="paid", payment_token="tok_abc", amount=99.99)
        self.mock_repo.get_order.return_value = order

        # Act & Assert
        with self.assertRaises(ValueError) as ctx:
            self.service.process_refund("ord-123", 200.0)
        self.assertIn("exceeds order total", str(ctx.exception))
```

**Key principles demonstrated:**
- Protocol-based interfaces for dependencies (works with `unittest.mock`, `pytest`, and TypeScript interfaces)
- `setUp` method for consistent test fixture creation
- Clear arrange-act-assert structure
- Negative tests verify error paths are exercised
- No standard library or third-party library is mocked

---

### Pattern 2: Integration Testing (Real Dependencies)

Integration tests validate that components work together correctly using real or near-real dependencies. Use in-memory databases, test containers, or temporary file stores. Never point integration tests at a shared development database.

```python
# ❌ BAD: Integration test that silently uses production database
class TestOrderServiceIntegration:
    """Integration test — but it's dangerous and non-reproducible."""

    def test_create_order(self):
        # No setup/teardown — leaves stale data in production DB
        service = OrderService(db=ProductionDatabase())
        result = service.create_order(user_id=1, items=[("widget", 3)])
        assert result.status == "created"
        # No teardown — test data persists across runs and other tests
```

```python
# ✅ GOOD: Integration test with proper setup/teardown using in-memory SQLite
import sqlite3
import tempfile
from pathlib import Path
from typing import Iterator
import pytest


class InMemoryOrderDB:
    """Lightweight in-memory database for integration testing."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        """Create the required schema on connection."""
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                total_cents INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL REFERENCES orders(id),
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price_cents INTEGER NOT NULL
            );
        """)

    def create_order(self, user_id: int, items: list[tuple[str, int]]) -> dict:
        """Create an order with items. Returns the created order dict."""
        cursor = self._conn.cursor()
        cursor.execute(
            "INSERT INTO orders (user_id, status, total_cents) VALUES (?, 'pending', 0)",
            (user_id,),
        )
        order_id = cursor.lastrowid
        total = 0
        for product_name, quantity in items:
            unit_price = _product_price(product_name)  # Known pricing
            total += unit_price * quantity
            cursor.execute(
                "INSERT INTO order_items (order_id, product_name, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
                (order_id, product_name, quantity, unit_price),
            )
        cursor.execute("UPDATE orders SET total_cents = ? WHERE id = ?", (total, order_id))
        self._conn.commit()
        return {"id": order_id, "user_id": user_id, "status": "pending", "total_cents": total}

    def get_order(self, order_id: int) -> dict | None:
        """Retrieve an order by ID."""
        cursor = self._conn.cursor()
        cursor.execute("SELECT id, user_id, status, total_cents FROM orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "user_id": row[1], "status": row[2], "total_cents": row[3]}


def _product_price(product_name: str) -> int:
    """Lookup product price in cents — deterministic for testing."""
    prices = {"widget": 1999, "gadget": 4999, "doohickey": 799}
    return prices.get(product_name, 0)


# ---- Test fixtures using pytest ----
@pytest.fixture
def order_db() -> Iterator[InMemoryOrderDB]:
    """Provide an in-memory SQLite database for each test, cleaned up after."""
    conn = sqlite3.connect(":memory:")
    db = InMemoryOrderDB(conn)
    try:
        yield db
    finally:
        conn.close()


class TestOrderServiceIntegration:
    """Integration tests for order creation with real SQL operations."""

    def test_create_order_with_items(self, order_db: InMemoryOrderDB) -> None:
        # Arrange
        items = [("widget", 2), ("gadget", 1)]

        # Act
        order = order_db.create_order(user_id=42, items=items)

        # Assert
        assert order["user_id"] == 42
        assert order["status"] == "pending"
        assert order["total_cents"] == (1999 * 2) + (4999 * 1)  # 8997

    def test_retrieve_created_order(self, order_db: InMemoryOrderDB) -> None:
        # Arrange
        order_db.create_order(user_id=1, items=[("doohickey", 1)])

        # Act
        result = order_db.get_order(1)

        # Assert
        assert result is not None
        assert result["total_cents"] == 799

    def test_get_nonexistent_order_returns_none(self, order_db: InMemoryOrderDB) -> None:
        # Act
        result = order_db.get_order(999)

        # Assert
        assert result is None
```

**Key principles demonstrated:**
- In-memory database replaces production DB for deterministic, fast integration tests
- `@pytest.fixture` with `yield` provides setup and guaranteed teardown
- Each test gets a fresh database — no state leakage between tests
- Test data is fully controlled (no random or external dependencies)

---

### Pattern 3: Contract Testing (Consumer-Driven)

Contract tests validate the interface between services independently of implementation. They ensure that changes to a provider service do not break its consumers. Use consumer-driven contracts where the consumer defines expected request/response patterns.

```python
# ❌ BAD: Integration test that tests the provider's full implementation
# This couples consumer tests to provider internals and is fragile
def test_provider_full_integration():
    """Tests the entire provider service — too broad and tightly coupled."""
    response = requests.post("http://provider:8080/users", json={"name": "Alice"})
    assert response.status_code == 200
    # Tests all response fields including ones the consumer doesn't care about
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "Alice"
    assert data["created_at"] is not None       # Provider-internal detail
    assert data["updated_at"] is not None       # Provider-internal detail
    assert data["metadata"]["version"] == 1     # Provider-internal detail
```

```python
# ✅ GOOD: Consumer-driven contract — defines what the consumer actually needs
import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CreateUserContract:
    """Defines the contract between a consumer and a user service provider."""

    # Request contract
    request_method: str = "POST"
    request_path: str = "/users"
    request_body_schema: dict = field(default_factory=lambda: {
        "type": "object",
        "required": ["name"],
        "properties": {
            "name": {"type": "string", "minLength": 1},
        },
    })

    # Response contract — only the fields the consumer uses
    expected_status_code: int = 201
    response_fields: list[str] = field(default_factory=lambda: ["id", "name"])
    response_id_type: str = "string"
    response_name_type: str = "string"

    def validate_request(self, method: str, path: str, body: dict) -> list[str]:
        """Validate a request against the contract. Returns list of violations."""
        violations: list[str] = []
        if method != self.request_method:
            violations.append(f"Expected method {self.request_method}, got {method}")
        if path != self.request_path:
            violations.append(f"Expected path {self.request_path}, got {path}")
        if "name" not in body:
            violations.append("Request body missing required field: name")
        elif not isinstance(body["name"], str) or len(body["name"]) == 0:
            violations.append("Request field 'name' must be a non-empty string")
        return violations

    def validate_response(self, status_code: int, body: dict) -> list[str]:
        """Validate a response against the contract. Returns list of violations."""
        violations: list[str] = []
        if status_code != self.expected_status_code:
            violations.append(f"Expected status {self.expected_status_code}, got {status_code}")
        for field_name in self.response_fields:
            if field_name not in body:
                violations.append(f"Response missing required field: {field_name}")
        return violations


class ContractTestRunner:
    """Executes contract tests between a consumer and a provider."""

    def __init__(self, contract: CreateUserContract) -> None:
        self.contract = contract

    def run_consumer_test(self) -> dict[str, Any]:
        """Simulate a consumer making a request and validate the contract."""
        # Consumer makes a request to the provider
        import requests
        response = requests.post(
            "http://localhost:8080/users",
            json={"name": "Alice"},
        )

        # Validate against consumer-defined contract
        request_violations = self.contract.validate_request(
            response.request.method, response.request.path_url, {"name": "Alice"}
        )
        response_violations = self.contract.validate_response(
            response.status_code, response.json()
        )

        return {
            "request_valid": len(request_violations) == 0,
            "response_valid": len(response_violations) == 0,
            "request_violations": request_violations,
            "response_violations": response_violations,
        }


# ---- Unit test the contract validator itself ----
class TestContractValidation(unittest.TestCase):

    def setUp(self) -> None:
        self.contract = CreateUserContract()

    def test_request_validates_correctly(self) -> None:
        # Arrange
        body = {"name": "Alice"}
        method = "POST"
        path = "/users"

        # Act
        violations = self.contract.validate_request(method, path, body)

        # Assert
        self.assertEqual(violations, [])

    def test_request_missing_name_fails(self) -> None:
        # Arrange
        body = {}
        method = "POST"
        path = "/users"

        # Act
        violations = self.contract.validate_request(method, path, body)

        # Assert
        self.assertIn("Request body missing required field: name", violations)

    def test_response_validates_correctly(self) -> None:
        # Arrange
        body = {"id": "usr-001", "name": "Alice"}

        # Act
        violations = self.contract.validate_response(201, body)

        # Assert
        self.assertEqual(violations, [])

    def test_response_missing_id_fails(self) -> None:
        # Arrange
        body = {"name": "Alice"}

        # Act
        violations = self.contract.validate_response(201, body)

        # Assert
        self.assertIn("Response missing required field: id", violations)
```

**Key principles demonstrated:**
- Consumer defines the contract, not the provider — prevents over-coupling
- Contract validation is unit-testable independently of any service running
- Only consumer-relevant response fields are validated
- Violation messages are actionable and specific

---

### Pattern 4: End-to-End Testing (User Journeys)

E2E tests validate complete user journeys from the user's perspective. They are the most expensive to run and maintain, so limit them to critical paths. Use stable selectors, explicit waits, and the Page Object Model to prevent brittleness.

```python
# ❌ BAD: E2E test that depends on exact DOM structure and arbitrary waits
def test_user_registration_flow():
    """Brittle E2E test — breaks on any CSS class or timing change."""
    driver = webdriver.Chrome()
    driver.get("http://localhost:3000/register")
    driver.implicitly_wait(5)                       # Arbitrary sleep
    time.sleep(2)                                    # Hard-coded delay
    driver.find_element(By.CSS_SELECTOR, ".container div:nth-child(2) input")
    driver.find_element(By.CSS_SELECTOR, ".container div:nth-child(3) input")
    driver.find_element(By.CSS_SELECTOR, "form button.btn-primary")
    driver.find_element(By.CSS_SELECTOR, ".container div:nth-child(2) input").send_keys("test@test.com")
    driver.find_element(By.CSS_SELECTOR, ".container div:nth-child(3) input").send_keys("Password1!")
    driver.find_element(By.CSS_SELECTOR, "form button.btn-primary").click()
    assert "Dashboard" in driver.title               # Fragile assertion
    driver.quit()
```

```python
# ✅ GOOD: Stable E2E test with semantic selectors, explicit waits, and page objects
from __future__ import annotations

import time as _time_module
from dataclasses import dataclass
from typing import Any

# Use selenium for real browser automation
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.common.action_chains import ActionChains
    _SELENIUM_AVAILABLE = True
except ImportError:
    _SELENIUM_AVAILABLE = False


@dataclass
class RegistrationPage:
    """Page Object for the user registration flow.

    Encapsulates all locators and interactions for the registration page.
    This isolates test logic from DOM structure changes.
    """

    driver: Any  # Selenium WebDriver

    # Semantic locators — stable across CSS/class changes
    _EMAIL_FIELD = (By.ID, "email")
    _PASSWORD_FIELD = (By.ID, "password")
    _SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    _ERROR_MESSAGE = (By.CSS_SELECTOR, ".error-banner")
    _SUCCESS_BANNER = (By.CSS_SELECTOR, ".success-banner")

    def navigate(self, base_url: str) -> None:
        """Navigate to the registration page."""
        self.driver.get(f"{base_url}/register")
        # Wait for the email field to be present
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located(self._EMAIL_FIELD),
        )

    def fill_email(self, email: str) -> RegistrationPage:
        """Fill in the email field."""
        field = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located(self._EMAIL_FIELD),
        )
        field.clear()
        field.send_keys(email)
        return self

    def fill_password(self, password: str) -> RegistrationPage:
        """Fill in the password field."""
        field = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located(self._PASSWORD_FIELD),
        )
        field.clear()
        field.send_keys(password)
        return self

    def submit(self) -> RegistrationPage:
        """Submit the registration form."""
        button = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable(self._SUBMIT_BUTTON),
        )
        button.click()
        return self

    def get_error_message(self) -> str | None:
        """Return the error message text, or None if not present."""
        try:
            element = WebDriverWait(self.driver, 2).until(
                EC.presence_of_element_located(self._ERROR_MESSAGE),
            )
            return element.text
        except Exception:
            return None

    def is_success_visible(self) -> bool:
        """Return True if a success banner is visible."""
        try:
            element = WebDriverWait(self.driver, 2).until(
                EC.visibility_of_element_located(self._SUCCESS_BANNER),
            )
            return element.is_displayed()
        except Exception:
            return False


@dataclass
class RegistrationTest:
    """End-to-end test suite for the user registration journey."""

    base_url: str = "http://localhost:3000"

    def _create_driver(self) -> Any:
        """Create a WebDriver instance with consistent settings."""
        if not _SELENIUM_AVAILABLE:
            raise RuntimeError("selenium package is required for E2E tests")
        options = webdriver.ChromeOptions()
        options.add_argument("--headless")               # Run without GUI in CI
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Chrome(options=options)
        driver.implicitly_wait(0)                        # Use explicit waits only
        return driver

    def test_successful_registration(self) -> bool:
        """Happy path: new user registers and sees success message."""
        driver = self._create_driver()
        try:
            page = RegistrationPage(driver)
            page.navigate(self.base_url)
            page.fill_email("newuser@example.com").fill_password("SecurePass1!").submit()

            success = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located(page._SUCCESS_BANNER),
            )
            return success.is_displayed()
        finally:
            driver.quit()

    def test_duplicate_email_rejection(self) -> bool:
        """Failure path: attempting to register with an existing email shows an error."""
        driver = self._create_driver()
        try:
            page = RegistrationPage(driver)
            page.navigate(self.base_url)
            page.fill_email("existing@example.com").fill_password("SecurePass1!").submit()

            error_msg = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located(page._ERROR_MESSAGE),
            )
            return "already registered" in error_msg.text.lower()
        finally:
            driver.quit()

    def test_weak_password_rejection(self) -> bool:
        """Failure path: password too short shows validation error."""
        driver = self._create_driver()
        try:
            page = RegistrationPage(driver)
            page.navigate(self.base_url)
            page.fill_email("unique@example.com").fill_password("abc").submit()

            error_msg = page.get_error_message()
            return error_msg is not None and ("password" in error_msg.lower())
        finally:
            driver.quit()


# ---- Usage: run in CI or locally ----
if __name__ == "__main__":
    suite = RegistrationTest(base_url="http://localhost:3000")
    print(f"Happy path: {'PASS' if suite.test_successful_registration() else 'FAIL'}")
    print(f"Duplicate email: {'PASS' if suite.test_duplicate_email_rejection() else 'FAIL'}")
    print(f"Weak password: {'PASS' if suite.test_weak_password_rejection() else 'FAIL'}")
```

**Key principles demonstrated:**
- **Page Object Model:** All locators and interactions are encapsulated in `RegistrationPage`
- **Explicit waits only:** No `time.sleep()` or implicit waits — uses `WebDriverWait` with `expected_conditions`
- **Semantic selectors:** `By.ID`, semantic class names — resilient to CSS restructuring
- **Headless in CI:** `--headless` flag ensures tests run without display in CI environments
- **Try/finally teardown:** Driver always quits, even on test failure
- **Only critical paths:** Three tests covering happy path and two critical failure modes

---

## Constraints

### MUST DO
- Maintain the test pyramid ratio: ~70% unit tests, ~20% integration tests, ~10% E2E tests
- Use meaningful test names that describe behavior: `test_user_login_fails_with_invalid_credentials`, not `test_login_1`
- Isolate unit tests from all external dependencies (network, filesystem, real database)
- Use in-memory databases or test containers for integration tests — never point at shared production infrastructure
- Write contract tests that validate only the fields the consumer actually uses
- Restrict E2E tests to critical user journeys and failure scenarios
- Configure CI coverage thresholds (e.g., 80% line coverage, 70% branch coverage on critical modules)
- Use explicit waits in E2E tests — never `time.sleep()` or implicit waits for synchronization
- Use the Page Object Model for E2E tests to encapsulate locators and interactions

### MUST NOT DO
- Mock the standard library or third-party libraries you don't own — use real implementations instead
- Write brittle E2E tests that depend on exact DOM structure, CSS class names, or element order
- Mix test layers — no network calls, no real database connections, and no filesystem I/O in unit tests
- Use `sleep()`, `time.sleep()`, or arbitrary delays for synchronization (use retries, explicit waits, or event polling)
- Commit flaky tests to the main branch without a tracking issue and remediation plan
- Use shared mutable state between tests — each test must be fully independent and reversible
- Set 100% coverage as a goal — focus on branch coverage for critical business logic paths instead
- Test implementation details — test behavior, not how the code achieves it

---

## Output Template

When applying this skill to design or review a test strategy, produce the following:

1. **Test Layer Mapping** — A table showing which components/boundaries are covered by each test layer (unit, integration, contract, E2E) with rationale for layer assignment.

2. **Unit Test Example** — A complete unit test with proper mocking, dependency injection, and clear arrange-act-assert structure. Include both positive and negative test cases.

3. **Integration Test Example** — A complete integration test with setup/teardown fixtures, using in-memory databases or test containers. Include a test fixture definition.

4. **Contract Test Example** — Consumer-driven contract definition with request/response validation. Include the contract validator as a standalone unit-testable component.

5. **E2E Test Example** — A stable end-to-end test using the Page Object Model with explicit waits, semantic selectors, and proper teardown. Cover one happy path and one critical failure path.

6. **CI Configuration Snippet** — A CI configuration showing test execution stages (unit → integration → contract → E2E), coverage thresholds, and failure gates. Example format:

```yaml
# Example GitHub Actions CI pipeline
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      python-version: ["3.11", "3.12"]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: ${{ matrix.python-version }}

    # Stage 1: Unit tests (fast, parallel)
    - name: Run unit tests
      run: pytest tests/unit --cov=src --cov-report=term-missing --cov-fail-under=80

    # Stage 2: Integration tests (requires test containers)
    - name: Run integration tests
      run: pytest tests/integration --cov=src --cov-report=term-missing --cov-fail-under=60

    # Stage 3: Contract tests (consumer-driven)
    - name: Run contract tests
      run: pytest tests/contract

    # Stage 4: E2E tests (slowest, run last)
    - name: Run E2E tests
      run: pytest tests/e2e
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `testing-tdd` | Red-green-refactor workflow for test-driven development |
| `testing-mocking-stubs` | Advanced techniques for test doubles, fakes, and spies |
| `code-review` | Review test coverage, assertions, and edge case handling |
| `testing-static-analysis` | Linting, type checking, and pre-commit quality gates |

> 📖 skill(local cache): testing-unit-integration-e2e
