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

### Using Test Doubles Example

```python
class FakeService:
    def get_data(self):
        return 'fake data'

# Example usage in a test

def test_function_using_fake():
    fake_service = FakeService()
    result = function_using_service(fake_service)
    
    assert result == "expected response based on 'fake data'"

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Test Double (Martin Fowler — Bliki)](https://martinfowler.com/bliki/TestDouble.html)
- [Mock vs Stub vs Fake — Comprehensive Guide](https://www.baeldung.com/cs/test-doubles-stubs-mocks-fakes)
- [Python unittest.mock — Mock, MagicMock, PropertyMock](https://docs.python.org/3/library/unittest.mock.html)
- [Test Doubles in xUnit Test Patterns (Gérard Meszaros)](https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Testing/dp/0131495054)
- [When to Use Each Test Double Type](https://codeopinion.com/stubs-mocks-spies-and-fakes-whats-the-difference/)
```