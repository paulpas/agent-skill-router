---
name: code-coverage-mutation-testing
description: Implements software engineering practices for code coverage analysis and mutation testing to enhance test suite effectiveness.
license: MIT
compatibility: opencode
metadata:
  archetypes: tactical, educational
  anti_triggers: generic tests, empty tests
  response_profile:
    verbosity: high
    directive_strength: high
    abstraction_level: operational

  version: "1.0.0"
  domain: coding
  triggers: code coverage, mutation testing, test suite effectiveness, code quality, testing strategies
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-best-practices, coding-testing-strategies
---

# Code Coverage and Mutation Testing

Implements practices for code coverage analysis and mutation testing, enhancing the effectiveness of your test suite to ensure high code quality.

## When to Use

- When aiming to improve your test suite's coverage and effectiveness.
- To ensure that your code performs as expected under various conditions.
- For analyzing untested paths and enhancing overall code quality.

## Core Workflow

1. **Set Up Coverage Tooling**  
   Integrate a coverage tool into your project. Common tools include Istanbul (for JavaScript) or Coverage.py for Python.
   
   ```bash
   # Example for setting up Coverage.py in Python
   pip install coverage
   ```  

2. **Run Your Tests and Collect Data**  
   Execute your test suite to collect coverage data.
   
   ```bash
   # Run coverage with pytest in Python
   coverage run -m pytest
   ```
   
3. **Analyze Coverage Reports**  
   Generate and review the coverage report to identify untested code sections.
   
   ```bash
   # Generate coverage report
   coverage report -m
   # Generate an HTML report for easier visualization
   coverage html
   ```  

4. **Implement Mutation Testing**  
   Use tools like Stryker or MutPy to perform mutation testing by introducing changes (mutations) to your code.
   
   ```bash
   # Example command for Stryker
   npx stryker run
   ```

5. **Evaluate and Enhance Tests**  
   Review mutation testing results to identify weaknesses in your test cases and improve them as necessary.

## Implementation Patterns

### Pattern 1: Coverage Analysis with Coverage.py

```python
from my_project import my_function

def test_my_function():
    assert my_function() == expected_result
```

### Pattern 2: Mutation Testing with Stryker

```javascript
//Example function in JavaScript
function add(a, b) {
    return a + b;
}
// Example test for mutation testing
describe('add', () => {
    it('should add two numbers', () => {
        expect(add(1, 2)).toEqual(3);
    });
});
```

## Constraints

### MUST DO
- Always analyze the coverage reports before enhancing the test suite.
- Incorporate mutation testing regularly to gauge the effectiveness of your tests.

### MUST NOT DO
- Rely solely on code coverage metrics without assessing test effectiveness.
- Ignore code sections flagged as untested during coverage analysis.
