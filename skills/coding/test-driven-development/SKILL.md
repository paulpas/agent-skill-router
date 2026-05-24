---
name: test-driven-development
description: Implements test-driven development with red-green-refactor cycle, property-based testing, mocking strategies, and the test pyramid for behavior-first software design.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: test-driven development, tdd, red-green-refactor, property-based testing, mocking strategies, test pyramid, how do i write tests first, behavior-driven design
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: code-review, refactoring-techniques, software-testing-strategy
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
---

# Test-Driven Development (TDD)

Act as a senior TDD practitioner who enforces the strict red-green-refactor cycle, writing failing tests before implementation code to drive clean, well-designed architecture. This skill makes the model structure development around behavior specification — every line of production code must be preceded by a failing test that defines its expected behavior. Tests are not an afterthought; they are the design artifact that guides module boundaries, function signatures, and error handling paths.

## TL;DR Checklist

- [ ] Write the failing test first — no production code without a red test as justification
- [ ] Keep tests isolated with Arrange-Act-Assert structure and clear phase comments
- [ ] Name tests descriptively: `should_{behavior}_when_{condition}` or `raises_{error}_when_{condition}`
- [ ] Mock ONLY external dependencies — never mock internal methods you own
- [ ] Run the full test suite before every refactor to catch regressions immediately
- [ ] Add property-based tests for functions with complex input domains (validation, parsing)
- [ ] Never merge a green suite that contains commented-out or skipped tests

---

## When to Use

Use this skill when:

- Building new modules or functions where requirements are clear enough to state as test cases
- Refactoring legacy code without tests — write characterization tests first, then refactor
- Designing API surfaces, data validators, or business logic with well-defined input/output contracts
- Onboarding developers to a project that uses TDD as the default development rhythm
- Writing test infrastructure (mock factories, fixtures, property-based generators)

---

## When NOT to Use

Avoid this skill for:

- Exploratory prototyping or spike work where behavior is unknown — use rapid scripting instead
- UI pixel-perfect adjustments where visual regression tests are more appropriate than TDD cycles
- One-off scripts with no expected reuse, maintenance, or evolving requirements
- Situations where the overhead of test-first writing demonstrably blocks delivery on a critical path (use it on the next iteration)

---

## Core Workflow

### Phase 1: Red — Write the Failing Test

Begin each behavior unit by writing a minimal test case that expresses one specific expected outcome. Use the Arrange-Act-Assert pattern with explicit section comments separating each phase. The test must fail for the right reason — not a syntax error, but a genuine assertion failure or missing dependency.

1. **Arrange** — Set up inputs, fixtures, and any mocks.
2. **Act** — Invoke the function under test once.
3. **Assert** — Verify exactly one expected outcome per test. If multiple outcomes need checking, split into separate tests.

**Checkpoint:** Run this single test in isolation. Confirm it fails with a meaningful error (e.g., `AssertionError`, `NameError` for missing function) — not a confusing traceback. If the test passes on the first run, it is either testing nothing or the production code already exists.

### Phase 2: Green — Write Minimal Production Code

Write the absolute minimum code required to turn the failing test green. Resist the urge to add abstractions, interfaces, or elegant design. The simplest possible implementation that passes the test is correct for this cycle. Typical approaches: a hardcoded return for the happy path, a direct conditional, or a trivial function body.

**Checkpoint:** Run only the current failing test. Confirm it now passes. Do not run the full suite yet — you have not changed anything else.

### Phase 3: Refactor with Confidence

With the green signal as your safety net, improve the code. Remove duplicates, extract methods, rename variables, apply SOLID principles. If any test breaks during refactoring, revert and understand why.

**Checkpoint:** Run the full test suite. Every test must remain green before committing the refactor.

### Phase 4: Expand Test Coverage

After a behavior is implemented and clean, add edge cases for the same function before moving to new behaviors. Common additions:

- Empty inputs or `None` values
- Boundary values (zero, negative numbers, maximum lengths)
- Error conditions (invalid types, missing fields)
- Unexpected but realistic input shapes

**Checkpoint:** Every new edge-case test must fail first (red), then pass (green) when you extend the production code.

### Phase 5: Repeat for Next Behavior

Return to Step 1 for the next behavior requirement. Keep cycles small — each red-green-refactor should cover one atomic unit of behavior. A single function typically goes through 3–8 cycles depending on complexity and edge cases.

---

## Implementation Patterns

### Pattern 1: Basic TDD Cycle — Calculator Module

A complete red-green-refactor walkthrough building a simple calculator module from scratch, demonstrating how each cycle drives the design.

```python
"""calculator.py — Built entirely through TDD cycles."""

from typing import Union


Number = Union[int, float]


class CalculatorError(Exception):
    """Base exception for calculator operations."""
    pass


class DivisionByZeroError(CalculatorError):
    """Raised when division by zero is attempted."""
    pass


def add(a: Number, b: Number) -> Number:
    """Add two numbers together.
    
    TDD Cycle 1 (Red): Test expects 'add(2, 3) == 5' with no existing function.
    TDD Cycle 1 (Green): Minimal implementation to pass the test.
    TDD Cycle 2 (Refactor): Extract constants and add type safety.
    """
    if not isinstance(a, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(a).__name__}")
    if not isinstance(b, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(b).__name__}")
    
    return a + b


def subtract(a: Number, b: Number) -> Number:
    """Subtract b from a.
    
    TDD Cycle 1 (Red): Test expects 'subtract(10, 4) == 6'.
    Production code written only after the failing test exists.
    """
    if not isinstance(a, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(a).__name__}")
    if not isinstance(b, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(b).__name__}")
    
    return a - b


def divide(a: Number, b: Number) -> float:
    """Divide a by b with explicit zero-check.
    
    TDD Cycle 1 (Red): Test expects 'divide(10, 2) == 5.0'
    TDD Cycle 2 (Red): Test expects 'divide(10, 0)' raises DivisionByZeroError
    TDD Cycle 2 (Green): Added zero-check guard before the division operation.
    """
    if b == 0:
        raise DivisionByZeroError("Cannot divide by zero")
    
    return float(a) / float(b)


def multiply(a: Number, b: Number) -> Number:
    """Multiply two numbers.
    
    TDD Cycle 1 (Red): Test expects 'multiply(-3, 4) == -12' (negative numbers).
    The implementation handles negatives naturally — no special case needed.
    """
    if not isinstance(a, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(a).__name__}")
    if not isinstance(b, (int, float)):
        raise TypeError(f"Expected numeric type, got {type(b).__name__}")
    
    return a * b


__all__ = ["CalculatorError", "DivisionByZeroError", "add", "subtract", "divide", "multiply"]
```

**Corresponding test file demonstrating the TDD cycle:**

```python
"""tests/test_calculator.py — Tests written BEFORE production code."""

import pytest
from calculator import add, subtract, divide, CalculatorError, DivisionByZeroError


class TestAdd:
    """Tests for the add function, written before it exists."""

    def test_add_two_positive_integers(self) -> None:
        """Cycle 1 Red → Green: basic happy path."""
        # Arrange
        a: int = 2
        b: int = 3
        
        # Act
        result = add(a, b)
        
        # Assert
        assert result == 5

    def test_add_negative_numbers(self) -> None:
        """Cycle 2 Red → Green: negative number edge case."""
        assert add(-1, -1) == -2

    def test_add_floats(self) -> None:
        """Cycle 3 Red → Green: floating point inputs."""
        assert add(1.5, 2.5) == 4.0

    def test_add_raises_type_error_on_string(self) -> None:
        """Cycle 4 Red → Green: type safety guard."""
        with pytest.raises(TypeError, match="Expected numeric type"):
            add("not a number", 3)


class TestDivide:
    """Tests for divide — includes the zero-division case that drives defensive coding."""

    def test_divide_evenly(self) -> None:
        assert divide(10, 2) == 5.0

    def test_divide_returns_float_result(self) -> None:
        """The function must always return float, even for clean divisions."""
        result = divide(10, 5)
        assert isinstance(result, float)

    def test_divide_by_zero_raises_specific_error(self) -> None:
        """This failing test forces the zero-check in production code."""
        with pytest.raises(DivisionByZeroError, match="Cannot divide by zero"):
            divide(10, 0)


class TestSubtract:
    def test_subtract_positive_result(self) -> None:
        assert subtract(10, 4) == 6

    def test_subtract_negative_result(self) -> None:
        """Edge case: result goes below zero."""
        assert subtract(3, 7) == -4

    def test_subtract_self_returns_zero(self) -> None:
        """Boundary case: any value minus itself is zero."""
        assert subtract(42.0, 42.0) == 0.0
```

### Pattern 2: Property-Based Testing with Hypothesis

Property-based tests define invariants (properties that must always hold) rather than specific input-output pairs. The Hypothesis library generates hundreds of random test cases automatically. This is essential for validators, parsers, and any function where edge cases are numerous or hard to enumerate manually.

```python
"""tests/test_data_validator.py — Property-based tests using Hypothesis."""

from hypothesis import given, settings, strategies as st
from hypothesis.strategies import composite
import pytest


# ---------------------------------------------------------------------------
# Production code under test (written AFTER the property was specified)
# ---------------------------------------------------------------------------

def validate_email(email: str) -> bool:
    """Validate an email address format using structural properties.
    
    Property tested: a valid email must contain exactly one '@' with 
    non-empty local and domain parts, and the domain must contain '.'.
    """
    if not isinstance(email, str):
        raise TypeError("Email must be a string")
    
    parts = email.split("@")
    if len(parts) != 2:
        return False
    
    local, domain = parts
    
    # Local part: non-empty, no spaces
    if not local or " " in local:
        return False
    
    # Domain: must contain at least one dot, non-empty parts
    domain_parts = domain.split(".")
    if len(domain_parts) < 2:
        return False
    
    for dp in domain_parts:
        if not dp:
            return False
    
    return True


def normalize_whitespace(text: str) -> str:
    """Collapse multiple whitespace characters into a single space and strip.
    
    Property tested: normalizing twice yields the same result as normalizing once
    (idempotent property).
    """
    if not isinstance(text, str):
        raise TypeError("Text must be a string")
    
    return " ".join(text.split())


# ---------------------------------------------------------------------------
# Test strategies — define the input space, Hypothesis explores it
# ---------------------------------------------------------------------------

@composite
def valid_emails(draw) -> str:
    """Generate structurally valid email addresses for property tests."""
    local_chars = draw(st.text(alphabet=st.characters(allow_punctuation=True, min_size=1, max_size=1)))
    local_part = f"{local_chars}{draw(st.from_regex(r'[a-z0-9._+]', min_size=1))}"
    domain_label = draw(st.from_regex(r'[a-z0-9]', min_size=1))
    top_level = draw(st.just("com") | st.just("org") | st.just("net"))
    return f"{local_part}@{domain_label}.{top_level}"


# ---------------------------------------------------------------------------
# Property tests — invariants that must hold for ALL generated inputs
# ---------------------------------------------------------------------------

class TestEmailValidationProperties:
    """Test structural properties of email validation, not individual cases."""

    @given(valid_emails())
    @settings(max_examples=100)
    def test_valid_email_pattern_passes(self, email: str) -> None:
        """Property: any email generated by our valid strategy must pass validation."""
        assert validate_email(email) is True

    @given(st.text(min_size=1))
    @settings(max_examples=50)
    def test_email_without_at_sign_fails(self, text: str) -> None:
        """Property: any string without '@' fails email validation."""
        if "@" not in text:
            assert validate_email(text) is False

    @given(st.text(min_size=1))
    @settings(max_examples=50)
    def test_multiple_at_signs_fail(self, local_part: str) -> None:
        """Property: email with multiple '@' signs fails validation."""
        bad_email = f"{local_part}@domain.com@extra"
        if "@" in local_part or bad_email.count("@") > 1:
            assert validate_email(bad_email) is False

    def test_type_error_on_non_string(self) -> None:
        """Edge case: non-string input raises TypeError."""
        with pytest.raises(TypeError, match="Email must be a string"):
            validate_email(12345)  # type: ignore


class TestWhitespaceNormalizationProperties:
    """Test idempotent property of normalize_whitespace."""

    @given(st.text(alphabet=st.characters(blacklist_categories=("Zl", "Cc"), min_size=0), max_size=50))
    @settings(max_examples=100)
    def test_idempotent_property(self, text: str) -> None:
        """Property: normalizing an already-normalized string is a no-op.
        
        This catches regressions where the function changes behavior on subsequent calls.
        """
        first = normalize_whitespace(text)
        second = normalize_whitespace(first)
        assert first == second

    @given(st.text(min_size=1))
    @settings(max_examples=50)
    def test_multiple_spaces_collapse_to_one(self, text: str) -> None:
        """Property: the result must never contain double spaces."""
        result = normalize_whitespace(text)
        assert "  " not in result

    @given(st.text(min_size=1))
    @settings(max_examples=50)
    def test_leading_trailing_whitespace_stripped(self, text: str) -> None:
        """Property: the result is always stripped of leading/trailing space."""
        result = normalize_whitespace(text)
        assert result == result.strip()

    def test_type_error_on_non_string_input(self) -> None:
        with pytest.raises(TypeError, match="Text must be a string"):
            normalize_whitespace(None)  # type: ignore
```

### Pattern 3: Mocking External Dependencies (BAD vs. GOOD)

Mocking is the most misunderstood part of TDD. The core principle: **mock only what you do not control**. You own internal code — test it by calling it directly. You do not own databases, HTTP clients, or third-party APIs — mock those to isolate your unit under test.

#### ❌ BAD: Over-Mocking Everything

This example shows the most common anti-patterns: mocking things you own, mocking implementation details, and creating fragile tests that break when internal refactoring changes nothing about external behavior.

```python
"""tests/bad_mocking.py — Anti-pattern examples of over-mocking."""

import unittest
from unittest.mock import Mock, patch


class UserService:
    """Service with internal methods that should NOT be mocked."""

    def __init__(self) -> None:
        self._cache: dict = {}

    def _normalize_name(self, name: str) -> str:
        """Internal helper — part of the logic you own. Do NOT mock this."""
        return name.strip().title()

    def _validate_age(self, age: int) -> bool:
        """Internal validation — part of the logic you own. Do NOT mock this."""
        return 0 <= age <= 150

    def create_user(self, name: str, age: int) -> dict:
        """Create a user record after normalization and validation."""
        normalized = self._normalize_name(name)
        if not self._validate_age(age):
            raise ValueError(f"Invalid age: {age}")
        
        user_id = len(self._cache) + 1
        self._cache[user_id] = {"id": user_id, "name": normalized, "age": age}
        return self._cache[user_id]


class TestBadMocking(unittest.TestCase):
    """Demonstrates common mocking mistakes."""

    def test_overmock_internal_method(self) -> None:
        # BAD: _normalize_name is an internal method we own.
        # Mocking it tests nothing about our code — it just verifies the mock works.
        with patch.object(UserService, "_normalize_name", return_value="Test User"):
            service = UserService()
            result = service.create_user("  alice  ", 30)
        
        assert result["name"] == "Test User"  # Tests the mock, not our normalization

    def test_overmock_validation(self) -> None:
        # BAD: _validate_age is internal logic. If we remove validation entirely,
        # this test still passes because it was never testing real behavior.
        with patch.object(UserService, "_validate_age", return_value=True):
            service = UserService()
            result = service.create_user("bob", 200)  # Invalid age! Test doesn't catch it
        
        assert result["age"] == 200  # BUG: invalid user created, test passes

    def test_mocking_return_value_without_implementation(self) -> None:
        # BAD: Creating a mock object and asserting on its return values.
        # The mock always returns what you configured — it is not testing anything.
        mock_repo = Mock()
        mock_repo.save.return_value = {"id": 1, "saved": True}
        
        assert mock_repo.save() == {"id": 1, "saved": True}  # Trivially true

    def test_mocking_dependencies_you_own(self) -> None:
        # BAD: Mocking a logger that is a standard library object.
        # Just let it write to stderr — the important thing is whether code runs.
        with patch("logging.Logger.info"):
            import logging
            logger = logging.getLogger()
            logger.info("message")  # Silenced but nothing was tested
```

#### ✅ GOOD: Strategic Mocking of External Dependencies Only

This example shows correct mocking: only external, uncontrolled dependencies are mocked. Internal methods are tested by exercising them through public APIs. The test verifies observable behavior, not internal calls.

```python
"""tests/good_mocking.py — Correct mocking patterns for TDD."""

import unittest
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime


class UserRepository:
    """External dependency: database access layer we do not control directly."""

    def find_by_id(self, user_id: int) -> dict | None:
        raise NotImplementedError

    def save(self, user: dict) -> dict:
        raise NotImplementedError


class EmailService:
    """External dependency: third-party email API we do not control.
    
    This SHOULD be mocked in unit tests because it makes network calls,
    costs money per call, and has its own test suite.
    """

    def send_welcome_email(self, email: str, name: str) -> bool:
        raise NotImplementedError


class UserService:
    """Service that depends on external repositories and third-party APIs."""

    def __init__(
        self,
        repo: UserRepository,
        email_service: EmailService,
    ) -> None:
        # Dependencies injected via constructor — designed for testability.
        self._repo = repo
        self._email_service = email_service

    def register_user(self, name: str, email: str) -> dict:
        """Register a new user, save to repository, and send welcome email.
        
        Returns the created user record. Sends a welcome email asynchronously.
        """
        if not name or not name.strip():
            raise ValueError("Name cannot be empty")
        if "@" not in email:
            raise ValueError("Invalid email address")

        user = {
            "name": name.strip().title(),
            "email": email.lower(),
            "created_at": datetime.utcnow().isoformat(),
        }
        
        saved = self._repo.save(user)
        
        # External call — mocked in tests
        try:
            self._email_service.send_welcome_email(saved["email"], saved["name"])
        except ConnectionError:
            # Email delivery failure is non-fatal for registration
            pass
        
        return saved


class TestUserServiceGoodMocking(unittest.TestCase):
    """Correct mocking: only external dependencies are mocked."""

    def setUp(self) -> None:
        self.mock_repo = Mock(spec=UserRepository)
        self.mock_email = Mock(spec=EmailService)
        self.service = UserService(
            repo=self.mock_repo,
            email_service=self.mock_email,
        )

    def test_register_user_calls_repository_save(self) -> None:
        """GOOD: Verify the interaction with the external dependency.
        
        The mock_repo is NOT one of our objects — it represents a database.
        We assert that save was called with the correct user dict shape.
        """
        self.mock_repo.save.return_value = {
            "id": 1,
            "name": "Alice Smith",
            "email": "alice@example.com",
            "created_at": "2026-01-15T10:30:00",
        }

        result = self.service.register_user("  alice  ", "ALICE@EXAMPLE.COM")

        # Assert observable behavior, not implementation details
        self.assertEqual(result["name"], "Alice Smith")
        self.assertEqual(result["email"], "alice@example.com")
        
        # Verify the external dependency was invoked correctly
        self.mock_repo.save.assert_called_once()
        saved_args = self.mock_repo.save.call_args[0][0]
        self.assertIn("created_at", saved_args)

    def test_register_user_sends_welcome_email(self) -> None:
        """GOOD: Verify the email service is called with correct parameters."""
        self.mock_repo.save.return_value = {
            "id": 1,
            "name": "Bob Jones",
            "email": "bob@example.com",
            "created_at": "2026-01-15T10:30:00",
        }

        self.service.register_user("bob jones", "bob@example.com")

        # Assert the external email call happened with correct arguments
        self.mock_email.send_welcome_email.assert_called_once_with(
            "bob@example.com", "Bob Jones"
        )

    def test_register_user_with_empty_name_raises_error(self) -> None:
        """GOOD: Test internal validation without mocking any of our own code.
        
        This exercises the real name validation logic — no mocking involved.
        The mock repo and email service are never called because validation
        fails first (short-circuit), which is exactly correct.
        """
        with self.assertRaises(ValueError) as ctx:
            self.service.register_user("  ", "nobody@example.com")

        self.assertIn("Name cannot be empty", str(ctx.exception))
        
        # Verify the mocks were never touched — validation short-circuited early
        self.mock_repo.save.assert_not_called()
        self.mock_email.send_welcome_email.assert_not_called()

    def test_register_user_with_invalid_email_raises_error(self) -> None:
        """GOOD: Test email format validation directly."""
        with self.assertRaises(ValueError) as ctx:
            self.service.register_user("Charlie", "not-an-email")

        self.assertIn("Invalid email", str(ctx.exception))
        self.mock_repo.save.assert_not_called()

    def test_email_failure_does_not_cancel_registration(self) -> None:
        """GOOD: Mock the email service to raise, verify registration still succeeds.
        
        This tests the error-handling behavior of our service when an external
        dependency fails — exactly the kind of scenario mocking reveals.
        """
        self.mock_repo.save.return_value = {
            "id": 1,
            "name": "Dave Lee",
            "email": "dave@example.com",
            "created_at": "2026-01-15T10:30:00",
        }
        self.mock_email.send_welcome_email.side_effect = ConnectionError(
            "SMTP server unreachable"
        )

        result = self.service.register_user("dave lee", "dave@example.com")

        # Registration succeeds despite email failure
        self.assertEqual(result["name"], "Dave Lee")
        self.mock_repo.save.assert_called_once()


class TestSpyPattern(unittest.TestCase):
    """Using unittest.mock.create_autospec to create realistic mocks.
    
    A spy records calls and can verify call order, argument types, and
    that specific methods were invoked the expected number of times.
    """

    def test_user_service_lifecycle_with_spy(self) -> None:
        """Use a spy (autospec mock) to verify the full registration flow."""
        repo_mock = MagicMock(spec=UserRepository)
        email_mock = MagicMock(spec=EmailService)

        repo_mock.save.return_value = {
            "id": 1, "name": "Eve", "email": "eve@example.com",
            "created_at": "2026-05-01T00:00:00",
        }

        svc = UserService(repo=repo_mock, email_service=email_mock)
        result = svc.register_user("eve", "EVE@EXAMPLE.COM")

        # Verify call order and arguments on all external dependencies
        repo_calls = repo_mock.save.call_args_list
        email_calls = email_mock.send_welcome_email.call_args_list

        self.assertEqual(len(repo_calls), 1)
        self.assertEqual(len(email_calls), 1)

        # Assert the saved user contains expected fields
        saved_user = repo_calls[0][0][0]
        self.assertEqual(saved_user["name"], "Eve")
        self.assertEqual(saved_user["email"], "eve@example.com")

        # Assert email was sent with correct recipient and name
        email_arg = email_calls[0][0]
        self.assertEqual(email_arg[0], "eve@example.com")
        self.assertEqual(email_arg[1], "Eve")
```

---

## Constraints

### MUST DO
- Write the test first — never write production code before a failing test exists. The test is the specification; without it, you are writing blind.
- Name tests descriptively using `should_{behavior}_when_{condition}` or `raises_{error}_when_{condition}` prefix so test failure output tells you exactly which contract was broken.
- Keep tests isolated — no shared state between tests, no order dependency, no network calls or database writes in unit tests. Each test must pass when run alone or as part of a suite.
- Use Arrange-Act-Assert with clear section comments (`# Arrange`, `# Act`, `# Assert`) separating each phase so the test intent is readable at a glance.
- Mock ONLY external dependencies (databases, APIs, filesystem, third-party services) — never mock internal methods you own. Test your own logic by calling it directly through public interfaces.
- Run the full test suite on every refactor to catch regressions immediately. The green suite is your safety net — do not remove it or bypass it.
- Write property-based tests for functions with complex input domains (validators, parsers, formatters) where enumerating all edge cases manually is error-prone or incomplete.
- Assert behavior and observable state only — never assert that a private method was called with specific arguments unless that contract is part of the public interface.

### MUST NOT DO
- Write production code without a failing test as justification. Every function, class, or module must have at least one red test preceding its implementation.
- Mock classes that you own — extract interfaces via dependency injection instead. If you need to mock it, the responsibility belongs in a collaborator, not your own class.
- Assert implementation details — assert behavior and observable state only. Checking `mock.method.call_count` is acceptable for external dependencies but never for internal methods.
- Use magic numbers in tests — define constants or use parameterized values with descriptive names so test failures are self-documenting.
- Skip edge case tests because the happy path "works". The value of TDD is discovering boundary conditions and error paths that unit testing reveals before they reach production.
- Merge a green suite that contains commented-out, `@pytest.mark.skip`, or `TODO` tests. A passing test suite must be fully executable and meaningful.
- Write tests that are fragile to refactoring — if changing internal method names causes test failures, your tests are asserting implementation rather than behavior.

---

## Output Template

When the TDD skill is active, produce outputs in this structure:

1. **Failing Test (RED)** — The minimal test case with full Arrange-Act-Assert structure and descriptive name. State why it should fail.
2. **Minimal Implementation (GREEN)** — The simplest code that passes the current test. No abstractions, no refactoring yet — just enough to turn red green.
3. **Refactor Notes** — Specific improvements made with the green suite as safety net. List each transformation applied.
4. **Edge Cases Added** — New test cases for boundaries, errors, and unexpected inputs that emerged during the cycle.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Review TDD test suites for coverage gaps, fragile assertions, and mocking anti-patterns |
| `coding-refactoring-techniques` | Refactor legacy code safely — use characterization tests before structural changes |
| `coding-testing-strategy` | Design the overall testing approach (unit, integration, E2E) that TDD fits into via the test pyramid |

---

## Live References

> Authoritative documentation for TDD patterns, testing tools, and Python best practices.

- [Python unittest Documentation](https://docs.python.org/3/library/unittest.html)
- [pytest Official Documentation](https://docs.pytest.org/en/stable/)
- [Hypothesis Property-Based Testing Library](https://hypothesis.readthedocs.io/en/latest/)
- [PyUnit / xUnit Pattern (Test-Driven Development by Kent Beck)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [The Test Pyramid (Martin Fowler)](https://martinfowler.com/articles/practical-test-pyramid.html)
