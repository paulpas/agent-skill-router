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

### Simple Stubbing Example

```python
from unittest.mock import patch

# Patch a method in the external service
@patch('external_service.get_data')
def test_function(mock_get_data):
    # Define the stub behavior
    mock_get_data.return_value = 'stubbed data'
    
    # Call the function that uses the stubbed service
    result = function_that_calls_external()
    
    assert result == "expected response based on 'stubbed data'"
```