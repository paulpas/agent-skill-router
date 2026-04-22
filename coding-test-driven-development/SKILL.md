---
name: coding-test-driven-development
description: Test-Driven Development (TDD) and Behavior-Driven Development (BDD) patterns with pytest, unit tests, mocking, and test pyramid principles
license: MIT
metadata:
  author: https://github.com/Jeffallan
  source: https://github.com/farmage/opencode-skills
  version: "1.0.0"
---

# Test-Driven Development (TDD)

Practice of writing tests before implementation code, ensuring 100% test coverage and robust error handling.

## When to Use This Skill

- Building new features with guaranteed correctness
- Refactoring existing code with confidence
- Adding tests to legacy codebases
- Setting up test infrastructure for a project
- Training teams on test-first methodology

## Core Workflow

1. **Red** — Write a failing test that defines the desired behavior
2. **Green** — Write minimal code to make the test pass
3. **Refactor** — Improve code quality while keeping tests green
4. **Repeat** — Continue the cycle for each feature

> **Test Pyramid**: More unit tests (fast, cheap), fewer integration/E2E tests (slow, expensive)

## Test Categories

### Unit Tests
- **Focus**: Single function/class in isolation
- **Speed**: Milliseconds
- **Coverage**: >90% of codebase
- **Tools**: pytest, unittest, Jest

### Integration Tests
- **Focus**: Component interactions
- **Speed**: Seconds
- **Coverage**: Critical paths
- **Tools**: pytest, Testcontainers

### End-to-End Tests
- **Focus**: User workflows
- **Speed**: Minutes
- **Coverage**: Critical user journeys
- **Tools**: Playwright, Selenium, Cypress

## Test Patterns

### 1. Arrange-Act-Assert (AAA)

```python
def test_calculate_discount():
    # Arrange
    calculator = PriceCalculator()
    items = [Item(100), Item(50)]
    
    # Act
    result = calculator.calculate_discount(items, 0.10)
    
    # Assert
    assert result == 15.0  # 15% of 150
```

### 2. Given-When-Then (BDD Style)

```python
def test_user_cannot_login_with_invalid_credentials():
    # Given
    user_repo = UserRepository()
    user_repo.save(User("john@example.com", "password123"))
    
    auth_service = AuthService(user_repo)
    
    # When
    result = auth_service.login("john@example.com", "wrongpassword")
    
    # Then
    assert result is None
```

### 3. Test Data Builders

```python
@dataclass
class UserBuilder:
    email: str = "test@example.com"
    password: str = "password123"
    is_active: bool = True
    
    def build(self) -> User:
        return User(self.email, self.password, self.is_active)
    
    def with_email(self, email: str) -> 'UserBuilder':
        self.email = email
        return self

# Usage
user = UserBuilder().with_email("john@example.com").build()
```

### 4. Mocking Patterns

```python
from unittest.mock import MagicMock, patch, call

# Mock external dependencies
def test_fetch_user_data():
    api_client = MagicMock()
    api_client.get_user.return_value = {"id": 1, "name": "John"}
    
    service = UserService(api_client)
    result = service.fetch_user_data(1)
    
    assert result["name"] == "John"
    api_client.get_user.assert_called_once_with(1)
```

## Test Structure

### File Organization

```
src/
├── module/
│   ├── __init__.py
│   ├── core.py
│   └── utils.py
tests/
├── unit/
│   ├── test_core.py
│   └── test_utils.py
├── integration/
│   ├── test_api.py
│   └── test_database.py
└── e2e/
    └── test_user_flow.py
```

### Conftest.py for Shared Fixtures

```python
import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_database():
    """Shared database mock for all tests."""
    db = MagicMock()
    db.connect.return_value = True
    return db

@pytest.fixture
def sample_user():
    """Sample user data for tests."""
    return {
        "id": 1,
        "email": "test@example.com",
        "name": "Test User"
    }

@pytest.fixture(autouse=True)
def setup_teardown(mock_database):
    """Automatic setup/teardown for each test."""
    # Setup
    mock_database.reset_mock()
    yield
    # Teardown (if needed)
```

## Test Quality Checklist

### Must Haves
- [ ] Test name describes what is being tested
- [ ] Test fails before implementation code is written
- [ ] Test asserts specific behavior, not implementation
- [ ] Tests are independent (no shared state)
- [ ] Tests use meaningful assertions
- [ ] Test fixtures are isolated per test

### Best Practices
- [ ] Test coverage >90% for new code
- [ ] No test depends on execution order
- [ ] External dependencies are mocked
- [ ] Test data is explicit and self-describing
- [ ] Test execution time <1 second per test

## Common Pitfalls

### 1. Testing Implementation, Not Behavior

```python
# BAD: Tests the method name
def test_calculate():
    assert calculator.calculate() is not None

# GOOD: Tests the behavior
def test_calculate_applies_discount():
    result = calculator.calculate(100, 0.10)
    assert result == 90.0
```

### 2. Test Pollution

```python
# BAD: Tests share state
test_list = []

def test_add_item():
    test_list.append(1)

def test_list_length():
    assert len(test_list) == 1  # Fails if test_add_item runs second

# GOOD: Each test has its own state
def test_add_item():
    test_list = []
    test_list.append(1)
    assert len(test_list) == 1
```

### 3. Over-Mocking

```python
# BAD: Mocking too much
def test_create_user():
    user_repo = MagicMock()
    user_repo.save = MagicMock()  # Over-mocking
    user_repo.find = MagicMock()
    
    service = UserService(user_repo)
    service.create_user("test@example.com")
    
    user_repo.save.assert_called()  # Tests the mock, not behavior

# GOOD: Test real implementation with mocked dependencies
def test_create_user():
    user_repo = InMemoryUserRepository()  # Real implementation
    service = UserService(user_repo)
    
    service.create_user("test@example.com")
    assert user_repo.count() == 1
```

## Output Template

When implementing TDD, provide:
1. **Test file structure** matching project conventions
2. **Failing tests** that describe expected behavior
3. **Implementation code** minimal to pass tests
4. **Test execution results** showing passing tests
5. **Coverage report** if applicable

## Knowledge Reference

- **pytest**: https://docs.pytest.org/
- **Test Pyramid**: https://martinfowler.com/bliki/TestPyramid.html
- **AAA Pattern**: http://c2.com/cgi/wiki? ArrangeActAssert
- **Mocking Best Practices**: https://docs.python-guide.org/writing/tests/
- **BDD**: https://dannorth.net/introducing-bdd/

## Code Examples

### Complete TDD Example

```python
# test_calculator.py
import pytest
from calculator import Calculator

class TestCalculator:
    def test_add_two_numbers(self):
        calc = Calculator()
        assert calc.add(2, 3) == 5
    
    def test_subtract_numbers(self):
        calc = Calculator()
        assert calc.subtract(5, 3) == 2
    
    def test_multiply_numbers(self):
        calc = Calculator()
        assert calc.multiply(4, 3) == 12
    
    def test_divide_by_zero_raises_error(self):
        calc = Calculator()
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            calc.divide(10, 0)

# calculator.py
class Calculator:
    """Simple calculator with basic operations."""
    
    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        return a + b
    
    def subtract(self, a: float, b: float) -> float:
        """Subtract b from a."""
        return a - b
    
    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers."""
        return a * b
    
    def divide(self, a: float, b: float) -> float:
        """Divide a by b."""
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
```
