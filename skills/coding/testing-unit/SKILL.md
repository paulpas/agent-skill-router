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

## Constraints
### MUST DO
- Write tests for each function created.
- Ensure code coverage is above 80%.

### MUST NOT DO
- Overlook edge cases in test scenarios.
- Implement testing logic within production code.
