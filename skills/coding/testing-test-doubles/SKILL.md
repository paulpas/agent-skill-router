---
name: testing-test-doubles
description: Provides an overview and implementation of test doubles including mocks, stubs, and fakes for comprehensive testing strategies.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: test doubles, mocks, stubs, fakes, unit testing, how do I use test doubles
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-mocking, testing-stubbing
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

# Test Doubles in Testing

Introduces the concept of test doubles and how to implement them effectively in unit testing.

## When to Use

- When you want to isolate specific components in your tests.
- To replace complex dependencies with simpler, predictable objects.
- To simulate behavior without the overhead and unpredictability of real implementations.

## Core Workflow

1. **Select Type** — Determine whether to use a mock, stub, or fake based on test requirements.
2. **Implement Test Double** — Create the appropriate test double in your test code.
3. **Use in Tests** — Replace real dependencies with your test double in the tests.
4. **Validate Behavior** — Use assertions to verify the interactions and responses from the test double.

## Implementation Patterns

### Pattern 1: Implementing All Test Double Types (Stub, Mock, Fake, Spy)

```python
from unittest.mock import Mock, MagicMock
import time
from typing import Protocol


# --- Define the interface under test ---

class NotificationService(Protocol):
    """Interface that our code depends on."""

    def send(self, message: str, recipient: str) -> bool: ...


# --- 1. STUB: Provides canned responses without tracking interactions ---

class EmailStub:
    """Stub that returns predictable results without recording calls."""

    def send(self, message: str, recipient: str) -> bool:
        # Simulate success/failure based on input (not actual email sending)
        if "@" not in recipient:
            return False
        return True


# --- 2. FAKE: Lightweight working implementation (not production-ready) ---

class InMemoryNotificationStore:
    """Fake notification store using in-memory data structures.
    Works for testing but would lose all data on restart."""

    def __init__(self) -> None:
        self._sent: list[dict] = []

    def send(self, message: str, recipient: str) -> bool:
        if "@" not in recipient:
            return False
        self._sent.append({"message": message, "recipient": recipient})
        return True

    @property
    def sent_count(self) -> int:
        return len(self._sent)


# --- 3. MOCK: Records interactions for verification ---

def test_with_mock(notification_service: NotificationService) -> None:
    """Use a mock to verify that the correct method was called."""
    mock = Mock(spec=NotificationService)
    mock.send.return_value = True

    # Run code under test
    result = process_notification(mock, "Hello", "user@example.com")

    # Verify interactions
    assert result is True
    mock.send.assert_called_once_with("Hello", "user@example.com")


def process_notification(service: NotificationService, message: str, recipient: str) -> bool:
    """Simulated function that sends a notification."""
    return service.send(message, recipient)


# --- 4. SPY: Wraps a real implementation and records interactions ---

class NotificationSpy:
    """Spy that delegates to the fake but also records call details."""

    def __init__(self) -> None:
        self._fake = InMemoryNotificationStore()
        self.calls: list[dict] = []

    def send(self, message: str, recipient: str) -> bool:
        self.calls.append({"message": message, "recipient": recipient, "time": time.time()})
        return self._fake.send(message, recipient)


def test_with_spy() -> None:
    """Use a spy to verify both behavior and results from a fake implementation."""
    spy = NotificationSpy()

    result = process_notification(spy, "Welcome!", "new@example.com")

    assert result is True
    assert spy.calls[0]["message"] == "Welcome!"
    assert spy._fake.sent_count == 1
```

### Pattern 2: Choosing the Right Test Double Strategy

```python
from unittest.mock import patch, Mock
import pytest


# --- Strategy Decision Matrix ---
# Use STUB when: You need a specific return value and don't care about call verification
# Use FAKE when: You need working behavior but can't use the production implementation
# Use MOCK when: You need to verify specific interactions (call count, arguments)
# Use SPY when: You need both fake behavior AND interaction verification


def test_stub_strategy():
    """Stub is best when you only care about return values."""
    stub = EmailStub()

    # Stub provides deterministic output for any input
    assert stub.send("Hello", "valid@test.com") is True
    assert stub.send("Hello", "invalid") is False


def test_fake_strategy():
    """Fake is best when you need stateful behavior without external deps."""
    store = InMemoryNotificationStore()

    # Fake maintains internal state like a real implementation
    store.send("Msg 1", "a@test.com")
    store.send("Msg 2", "b@test.com")
    assert store.sent_count == 2


def test_mock_strategy():
    """Mock is best when verifying exact interaction contracts."""
    mock = Mock(spec=NotificationService)
    mock.send.return_value = True

    process_notification(mock, "Test", "test@example.com")
    mock.send.assert_called_once_with("Test", "test@example.com")


def test_spy_strategy():
    """Spy is best when you need both behavior and interaction evidence."""
    spy = NotificationSpy()

    result = process_notification(spy, "Hi", "spy@test.com")

    assert result is True  # Fake behavior works
    assert len(spy.calls) == 1  # Spy recorded the interaction


# --- Example: Full test suite showing all four types ---

class PaymentGateway:
    """Production payment gateway (slow, expensive to call)."""

    def charge(self, amount: float) -> dict:
        time.sleep(0.5)  # Simulate network latency
        return {"status": "completed", "transaction_id": "txn_123"}


class TestPaymentProcessing:
    """Demonstrates choosing the right test double for each scenario."""

    def test_charge_success_with_stub(self):
        """Use a stub when testing happy-path return values."""
        stub = Mock()
        stub.charge.return_value = {"status": "completed", "transaction_id": "txn_456"}

        result = process_payment(stub, 99.99)
        assert result["status"] == "completed"

    def test_charge_insufficient_funds_with_spy(self):
        """Use a spy when testing both behavior and state changes."""
        spy = NotificationSpy()

        try:
            # Stub the gateway to fail with insufficient funds
            with patch("myapp.gateway.PaymentGateway") as mock_cls:
                mock_cls.return_value.charge.side_effect = ValueError("Insufficient funds")
                process_payment(mock_cls.return_value, 999.99)
        except ValueError:
            pass  # Expected failure

        # Spy confirmed that error handling path was triggered
        assert len(spy.calls) == 0  # No notification sent on failure


def process_payment(gateway, amount: float) -> dict:
    """Simulated payment processing function."""
    result = gateway.charge(amount)
    return {"amount": amount, **result}
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

- [Test Double (Martin Fowler — Bliki)](https://martinfowler.com/bliki/TestDouble.html)
- [Mock vs Stub vs Fake — Comprehensive Guide](https://www.baeldung.com/cs/test-doubles-stubs-mocks-fakes)
- [Python unittest.mock — Mock, MagicMock, PropertyMock](https://docs.python.org/3/library/unittest.mock.html)
- [Test Doubles in xUnit Test Patterns (Gérard Meszaros)](https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Testing/dp/0131495054)
- [When to Use Each Test Double Type](https://codeopinion.com/stubs-mocks-spies-and-fakes-whats-the-difference/)
```