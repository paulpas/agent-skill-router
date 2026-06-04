---
name: testing-mocking
description: Implements mocking strategies for unit testing by providing controlled, predictable interactions with dependencies.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mocking, test doubles, mock objects, unit testing, how do I mock
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-stubbing, testing-test-doubles
  archetypes:
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Mocking Strategies

Implements strategies for creating mock objects to test interactions in unit tests without relying on real dependencies.

## When to Use

- When you need controlled, predictable interactions in your unit tests.
- When testing components that have external dependencies (like databases or APIs).
- When verifying that certain methods are called with expected parameters.

## Core Workflow

1. **Identify Dependency** — Determine which external service or component needs to be mocked.
2. **Create Mock** — Utilize a mocking framework to create a mock object of the dependent service.
3. **Define Behavior** — Specify the behavior of the mock to return expected results during the test.
4. **Verify Interactions** — Use assertions to ensure that the mock was interacted with as expected during the test execution.

## Implementation Patterns

### Pattern 1: Basic Mock Creation and Behavior Definition

```python
from unittest.mock import Mock, MagicMock, call


def test_mock_basic_behavior():
    """Demonstrate basic mock creation and return value setup."""
    # Create a mock service dependency
    mock_service = Mock()
    mock_service.get_user.return_value = {"id": 1, "name": "Alice", "email": "alice@example.com"}

    # Call the method under test (which uses the mocked dependency)
    result = fetch_user(mock_service, 1)

    # Assert the result is correct
    assert result == {"id": 1, "name": "Alice", "email": "alice@example.com"}
    # Verify the mock was called correctly
    mock_service.get_user.assert_called_once_with(1)


def fetch_user(user_service, user_id: int) -> dict:
    """Simulated function under test."""
    return user_service.get_user(user_id)


def test_mock_multiple_calls():
    """Verify call order and arguments across multiple invocations."""
    mock_api = Mock()
    mock_api.fetch_orders.side_effect = [
        [{"id": 101, "total": 50.0}],
        [{"id": 102, "total": 75.0}],
    ]

    result = process_orders(mock_api)

    assert len(result) == 2
    assert mock_api.fetch_orders.call_count == 2
    # Verify exact call sequence
    mock_api.fetch_orders.assert_has_calls([call(), call()])


def process_orders(api_client):
    """Simulated function that processes multiple orders."""
    orders = api_client.fetch_orders()
    return [{"processed": True, **order} for order in orders]
```

### Pattern 2: Mocking with Side Effects and Exception Simulation

```python
from unittest.mock import patch, MagicMock
import time


def test_mock_side_effect():
    """Use side_effect to simulate dynamic or stateful behavior."""
    mock_counter = Mock()
    call_count = [0]

    def increment_side_effect(*args, **kwargs):
        call_count[0] += 1
        return {"count": call_count[0], "status": "success"}

    mock_counter.get_status.side_effect = increment_side_effect

    # Each call returns an incremented value
    assert mock_counter.get_status() == {"count": 1, "status": "success"}
    assert mock_counter.get_status() == {"count": 2, "status": "success"}
    assert mock_counter.get_status.call_count == 3


def test_mock_exception_simulation():
    """Mock a dependency to raise exceptions for error path testing."""
    with patch("myapp.payment_service.charge") as mock_charge:
        mock_charge.side_effect = ConnectionError("Payment gateway unreachable")

        try:
            checkout({"item": "widget", "qty": 1})
        except ConnectionError as e:
            assert str(e) == "Payment gateway unreachable"
        else:
            assert False, "Expected ConnectionError to be raised"


def test_mock_return_value_generator():
    """Use a generator for side_effect to simulate exhaustion after N calls."""
    mock_db = Mock()
    mock_db.query.side_effect = iter([
        [{"id": 1}, {"id": 2}],
        [],  # Simulates running out of results
    ])

    page1 = get_results(mock_db)
    assert len(page1) == 2

    page2 = get_results(mock_db)
    assert len(page2) == 0


# --- Example: Full integration test with mocking ---

def test_user_registration_flow():
    """Integration-style test using multiple mocks for the full registration flow."""
    with patch("myapp.services.email_service.send_welcome") as mock_email, \
         patch("myapp.services.auth_service.create_token") as mock_token, \
         patch("myapp.models.user.User.create") as mock_user_create:

        # Configure mock behaviors
        mock_user_create.return_value = {"id": "usr_123", "email": "new@example.com"}
        mock_token.return_value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        mock_email.return_value = True

        # Execute the registration flow
        result = register_user("new@example.com", "SecurePass123!")

        # Verify all interactions
        assert result["status"] == "success"
        assert result["token"] == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        mock_user_create.assert_called_once()
        mock_email.assert_called_once_with("new@example.com")
        mock_token.assert_called_once()
```

## Constraints

### MUST DO
- Write unit tests that cover the happy path, boundary conditions, and failure modes for each function
- Use parameterized tests to cover multiple input combinations without duplicating test logic
- Mock external dependencies (APIs, databases, file system) with strict interface contracts — never mock implementation details
- Maintain a minimum of 80% code coverage for critical paths; prioritize path coverage over line coverage

### MUST NOT DO
- Do not write tests that test the standard library or framework behavior — test your code, not their code
- Avoid fragile tests that depend on implementation details (exact method call order, string formatting) instead of observable outcomes
- Never include network calls, database writes, or file system operations in unit tests — use mocks and fixtures
- Do not name tests with vague descriptions like 'test_function' — each test name should describe the scenario being verified


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [unittest.mock — Python Official Docs](https://docs.python.org/3/library/unittest.mock.html)
- [Mock Objects in Testing (Martin Fowler)](https://martinfowler.com/articles/mocksArentStubs.html)
- [pytest-mock Plugin Documentation](https://pytest-mock.readthedocs.io/en/latest/)
- [MagicMock vs Mock — When to Use Each](https://docs.python.org/3/library/unittest.mock.html#magicspecifying-allowed-methods-and-attributes)
- [Side Effects and Return Values in unittest.mock](https://docs.python.org/3/library/unittest.mock.html#side-effects)
```