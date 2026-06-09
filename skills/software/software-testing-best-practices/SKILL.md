---




name: software-testing-best-practices
description: Explains various software testing methodologies including unit testing, integration testing, and system testing with best practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: software
  triggers: unit testing, integration testing, system testing, testing methodologies, testing frameworks
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-architecture-overview, software-development-lifecycle
  archetypes: tactical
  anti_triggers: manual tests, ad-hoc testing
  response_profile: { verbosity: high, directive_strength: high, abstraction_level: tactical }




---





# Software Testing Best Practices

This skill covers the best practices in software testing methodologies, helping teams to implement rigorous testing strategies throughout the software lifecycle.

## When to Use
- During the development phase when verifying functionality.
- For quality assurance before deploying software to production.
- When implementing automated testing solutions.

## Core Workflow

1. **Select Testing Framework**  
   Choose a framework suitable for the project based on language and requirements. For example, choose JUnit for Java, or NUnit for .NET applications.

2. **Implement Unit Tests**  
   Write unit tests to validate individual components.
   Example in Python using unittest framework:
   ```python
   import unittest
   
   class TestSum(unittest.TestCase):
       def test_sum(self):
           self.assertEqual(sum([1, 2, 3]), 6)
   
   if __name__ == '__main__':
       unittest.main()
   ```

3. **Create Integration Tests**  
   Validate interactions between multiple components.
   Example using pytest for integration tests:
   ```python
   # test_integration.py
   def test_integration():
       assert function_a() == expected_output
   ```
   
4. **System Testing**  
   Conduct system tests to verify the complete and integrated software product. This includes regression testing and performance testing.

5. **Continuous Testing**  
   Integrate tests into the CI/CD pipeline for ongoing verification throughout the development lifecycle.
   Example command to run tests in Docker:
   ```bash
   docker run mytestcontainer pytest
   ```

## Implementation Patterns

### Example of Automated Test with CI/CD
```yaml
# GitHub Actions workflow for automated testing
name: Run Tests
on:
  push:
    branches:
      - main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'
      - run: |
          pip install -r requirements.txt
          pytest
```  

---

## TL;DR for Code Generation

- **Follow the test pyramid** — Write many fast unit tests (60%+), fewer integration tests, and a handful of critical E2E tests. This balances speed with confidence.
- **Automate every layer** — Every new feature should include tests at the unit, integration, and where appropriate, E2E level.
- **Use realistic test data** — Avoid fake or placeholder data. Use production-like fixtures that expose edge cases early.
- **Run tests in CI, block on failures** — A failing test suite should block merging. No exceptions.
- **Keep tests independent** — Tests must be runnable in any order and in parallel. Shared mutable state is the #1 cause of flaky tests.

---

## Implementation Patterns

### Example: Integration Test with Testcontainers

Testcontainers spins up real service dependencies (PostgreSQL, Redis, etc.) inside Docker containers for true integration testing:

```python
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text

@pytest.fixture(scope="module")
def postgres_container():
    """Spin up a real PostgreSQL instance in Docker."""
    with PostgresContainer("postgres:16-alpine") as pg:
        engine = create_engine(pg.get_connection_url())
        # Run migrations
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)"))
            conn.execute(text("INSERT INTO users (name) VALUES ('Alice')"))
        yield engine

def test_database_query(postgres_container):
    """Verify we can query the real database."""
    with postgres_container.begin() as conn:
        result = conn.execute(text("SELECT name FROM users"))
        names = [row[0] for row in result]
    
    assert "Alice" in names
    assert len(names) == 1
```

## Constraints

### MUST DO
- Ensure all tests are automated as much as possible.
- Implement clear documentation for testing procedures.

### MUST NOT DO
- Overlook edge cases in unit tests.
- Skip writing tests for new features; testing should be integral.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [ASTM G196 — Verification & Validation Guide](https://www.astm.org/g196-03e1)
- [IEEE 829 — Software Test Documentation Standard](https://standards.ieee.org/standard/829-2008.html)
- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/)
- [pytest Official Guide](https://docs.pytest.org/en/stable/)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)