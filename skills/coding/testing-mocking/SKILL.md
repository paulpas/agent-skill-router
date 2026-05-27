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

### Simple Mocking Example

```python
from unittest.mock import Mock, call

# Create a mock object
mock_service = Mock()

# Define the mock's behavior
mock_service.get_data.return_value = 'mocked data'

# Interaction with the mock
result = mock_service.get_data()

assert result == 'mocked data'
# Verify interaction
mock_service.get_data.assert_called_once()
```