---




name: testing-stubbing
description: Implements stubbing techniques for unit testing by replacing parts of the system under test with pre-defined responses.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: stubbing, test doubles, stub objects, unit testing, how do I stub
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-mocking, testing-test-doubles
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





# Stubbing Techniques

Implements techniques for creating stubs to provide controlled responses in testing scenarios.

## When to Use

- When the code under test needs to interact with external systems that are not available.
- When you want to isolate your tests from unpredictable behaviors.
- When specific return values are required for certain calls during the tests.

## Core Workflow

1. **Identify Dependency** — Locate the external service that requires stubbing.
2. **Create Stub** — Use a stubbing framework or manual implementation to create a stub object.
3. **Define Response** — Set the predefined response for the stub to return when called during tests.
4. **Execute Test** — Run your test case and ensure it interacts with the stub as intended.

## Implementation Patterns

### Pattern 1: Stubbing External Services with Context Managers

```python
from unittest.mock import patch, MagicMock


def test_database_query_with_stub():
    """Stub a database layer to return predictable results without hitting the DB."""
    mock_result = [{"id": 1, "name": "Widget A"}, {"id": 2, "name": "Widget B"}]

    with patch("myapp.db.query") as mock_db:
        mock_db.return_value = mock_result

        result = list_active_widgets()

        assert len(result) == 2
        assert result[0]["name"] == "Widget A"
        # Verify the query was called with correct arguments
        mock_db.assert_called_once_with("SELECT * FROM widgets WHERE active = TRUE")


def test_http_request_with_stub():
    """Stub an HTTP client to return predefined responses for API testing."""
    stubbed_response = {
        "status_code": 200,
        "json": lambda: {"users": [{"id": 1, "role": "admin"}]},
    }

    with patch("requests.get") as mock_get:
        mock_get.return_value = MagicMock(**stubbed_response)

        result = fetch_admin_users()

        assert len(result) == 1
        assert result[0]["role"] == "admin"
        mock_get.assert_called_once_with("https://api.example.com/users?role=admin")


def list_active_widgets():
    """Simulated function that queries a database."""
    from myapp.db import query
    return query("SELECT * FROM widgets WHERE active = TRUE")


def fetch_admin_users():
    """Simulated function that calls an external API."""
    import requests
    resp = requests.get("https://api.example.com/users?role=admin")
    return resp.json()["users"]
```

### Pattern 2: Stubbing with Default Values and Parameterized Tests

```python
import pytest
from unittest.mock import patch, MagicMock


# Fixture that provides a stubbed environment for all tests in this module
@pytest.fixture
def api_stubber():
    """Return a configured stubber context manager for API calls."""
    def _stubber(endpoint: str, response_data: dict, status_code: int = 200):
        stub_response = {
            "status_code": status_code,
            "json": lambda: response_data,
        }
        with patch("requests.get") as mock_get:
            mock_get.return_value = MagicMock(**stub_response)
            yield mock_get

    return _stubber


def test_login_success(api_stubber):
    """Stub the authentication endpoint to simulate a successful login."""
    stub_response_data = {"token": "abc123", "expires_in": 3600}
    with api_stubber("/auth/login", stub_response_data) as mock_get:
        token = authenticate("user@example.com", "password")
        assert token == "abc123"


def test_login_failure(api_stubber):
    """Stub the authentication endpoint to simulate an invalid credential response."""
    stub_response_data = {"error": "invalid_credentials"}
    with api_stubber("/auth/login", stub_response_data, status_code=401) as mock_get:
        with pytest.raises(Exception, match="Authentication failed"):
            authenticate("bad@example.com", "wrong_password")


def test_file_read_with_stub():
    """Stub the file system to test parsing logic without touching real files."""
    stub_content = "id,name,value\n1,alpha,100\n2,beta,200"

    with patch("builtins.open", MagicMock()) as mock_file:
        mock_file.return_value.__enter__.return_value.read.return_value = stub_content

        result = parse_csv_data("/path/to/data.csv")

        assert len(result) == 2
        assert result[1]["name"] == "beta"


def authenticate(email: str, password: str) -> str:
    """Simulated authentication function."""
    import requests
    resp = requests.post("https://api.example.com/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        raise Exception("Authentication failed")
    return resp.json()["token"]


def parse_csv_data(filepath: str) -> list[dict]:
    """Simulated CSV parser that reads from a file."""
    import csv
    from io import StringIO
    with open(filepath) as f:
        reader = csv.DictReader(StringIO(f.read()))
        return list(reader)
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

- [unittest — Test Doubles (Python Docs)](https://docs.python.org/3/library/unittest.html#test-double)
- [Stub vs Mock vs Fake (Martin Fowler)](https://martinfowler.com/articles/mocksArentStubs.html)
- [pytest-stubber Plugin](https://github.com/vprokhorov81/pytest-stubber)
- [Python Stubbing with unittest.mock.patch](https://docs.python.org/3/library/unittest.mock.html#patch)
- [Test Doubles in TDD — Types and Use Cases](https://www.baeldung.com/cs/test-doubles-stubs-mocks-fakes)
```