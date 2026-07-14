---




name: testing-unit
description: Implements unit testing strategies using popular frameworks to ensure the smallest parts of your application work as intended.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: unit testing, unit tests, test strategies, test frameworks
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-integration, testing-contract, testing-end-to-end
  archetypes: tactical, generation
  anti_triggers: integration testing, e2e testing, performance testing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical




---





# Unit Testing

Implements unit testing strategies to verify that individual components or functions perform correctly. This skill emphasizes the development of isolated tests for small blocks of code, ensuring each part behaves as expected.

## When to Use
- When new functions are created in your codebase.
- During refactoring or optimization processes to maintain code quality.
- To include continuous testing in your CI/CD pipeline.

## Core Workflow
1. **Set Up Testing Framework**  
   Choose a testing framework appropriate for your programming language (e.g., `JUnit` for Java, `pytest` for Python).
   ```bash
   # For Python
   pip install pytest
   ```
2. **Write Test Cases**  
   Create test cases that cover various scenarios, including edge cases.
   ```python
   def test_add():
       assert add(1, 2) == 3
       assert add(-1, 1) == 0
   ```
3. **Run Tests and Check Results**  
   Execute the tests and review results to ensure all pass.
   ```bash
   pytest
   ```
4. **Refactor and Repeat**  
   Modify your code as necessary based on feedback and run tests again to ensure compliance.

## Implementation Patterns
### Pattern 1: Using Pytest
```python
import pytest

def add(x: int, y: int) -> int:
    return x + y

# This will be your test function

def test_add():
    assert add(1, 2) == 3
    assert add(-1, 1) == 0

if __name__ == '__main__':
    pytest.main()  
```

---

## TL;DR for Code Generation

- **One assertion per test** — Each test function should verify exactly one behavior. If a test fails, you know immediately what broke.
- **Use `@pytest.mark.parametrize`** — For testing multiple inputs/outputs, parametrize avoids repetitive test functions and makes edge cases visible.
- **Use fixtures for shared setup** — Extract common test dependencies (database connections, mock objects, config) into reusable fixtures rather than duplicating setup code.
- **Name tests by behavior, not implementation** — `test_withdraw_reduces_balance` not `test_withdraw_2`. Tests document the system's contract.
- **Keep tests fast** — A slow unit test suite discourages frequent runs. Mock I/O, use in-memory databases, and avoid network calls.

---

## Implementation Patterns

### Pattern 2: Using Pytest Fixtures

Fixtures provide a clean way to manage test dependencies and setup/teardown:

```python
import pytest

@pytest.fixture
def sample_data() -> dict:
    """Provide a reusable dictionary for tests."""
    return {"user": "alice", "items": [1, 2, 3]}

@pytest.fixture
def db_connection():
    """Simulate a database connection with cleanup."""
    conn = {"connected": True, "transactions": []}
    yield conn  # Test runs here, then teardown executes
    conn["connected"] = False

def test_sample_data_has_user(sample_data: dict):
    assert sample_data["user"] == "alice"

def test_sample_data_has_items(sample_data: dict):
    assert len(sample_data["items"]) == 3

def test_db_connection_active(db_connection: dict):
    assert db_connection["connected"] is True
```

### Pattern 3: Parameterized Tests

Parametrize runs the same test logic across multiple inputs, making edge cases explicit:

```python
import pytest

def multiply(x: int, y: int) -> int:
    return x * y

@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 6),
    (0, 5, 0),
    (-1, 5, -5),
    (10, 0, 0),
])
def test_multiply(a: int, b: int, expected: int):
    assert multiply(a, b) == expected
```

## Constraints
### MUST DO
- Write tests for each function created.
- Ensure code coverage is above 80%.

### MUST NOT DO
- Overlook edge cases in test scenarios.
- Implement testing logic within production code.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [pytest Official Documentation](https://docs.pytest.org/en/stable/)
- [pytest Assertions — Rewrite for Clarity](https://docs.pytest.org/en/stable/how-to/assert.html)
- [Writing Unit Tests with pytest](https://docs.pytest.org/en/stable/getting_started/tutorial.html)
- [pytest Fixtures for Dependency Injection](https://docs.pytest.org/en/stable/explanation/fixtures.html)
- [pytest Parametrize — Parameterized Unit Tests](https://docs.pytest.org/en/stable/how-to/parametrize.html)
