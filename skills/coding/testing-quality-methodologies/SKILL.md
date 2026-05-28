---
name: testing-quality-methodologies
description: Implements TDD and BDD methodologies for ensuring quality in software engineering with structured guidelines and practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: testing methodologies, test-driven development, behavior-driven development, automated testing, quality assurance, how do i implement TDD, how do i implement BDD
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-tdd, coding-bdd
  archetypes: tactical, educational
  anti_triggers: vague ideation, brainstorming
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Testing & Quality Methodologies in Software Engineering

Implementing TDD (Test-Driven Development) and BDD (Behavior-Driven Development) methodologies to ensure high-quality software through structured practices and guidelines.

## When to Use

- When quality assurance is a priority in the development process.
- To facilitate collaboration between stakeholders, domain experts, and developers.
- When aiming to reduce the costs of fixing bugs by catching issues early in the development lifecycle.

## Core Workflow

### TDD Workflow
1. **Write a test** — Create a test for a small feature or functionality that you want to implement.
2. **Run the test** — Execute the test to see it fail, confirming that the test is valid and the functionality isn't present.
3. **Implement the code** — Write the minimum amount of code necessary to pass the test.
4. **Run the tests** — Ensure all tests pass with the newly implemented code.
5. **Refactor** — Clean up the code while ensuring tests still pass.

### BDD Workflow
1. **Identify behavior** — Collaborate with stakeholders to identify behaviors that are expected from the software.
2. **Write scenarios** — Create specific scenarios in a natural language format that describes the behavior.
3. **Implement the scenarios** — Write code that implements the scenarios and verify that they function as expected.
4. **Run the scenarios** — Ensure all BDD scenarios pass as expected.
5. **Refactor** — Improve the implementation while keeping scenarios passing.

## Implementation Patterns

### TDD Example
```python
# Example Python TDD for adding two numbers

def add(a: int, b: int) -> int:
    return a + b

# Test case for TDD
import unittest

class TestAddFunction(unittest.TestCase):
    def test_add_positive_numbers(self):
        self.assertEqual(add(2, 3), 5)

if __name__ == '__main__':
    unittest.main()
```

### BDD Example
```python
# Example Python BDD using Behave

from behave import given, when, then

@given('a calculator')
def step_given_a_calculator(context):
    context.calculator = Calculator()

@when('I add {number1} and {number2}')
def step_when_i_add(context, number1, number2):
    context.result = context.calculator.add(int(number1), int(number2))

@then('the result should be {expected}')
def step_then_the_result_should_be(context, expected):
    assert context.result == int(expected)
```

## Constraints

### MUST DO
- Follow the specified workflows for TDD and BDD without deviation.
- Ensure that all tests/scenarios are clear, detailed, and cover edge cases.

### MUST NOT DO
- Avoid skipping any step in the TDD or BDD workflows.
- Do not ignore collaboration with stakeholders during the BDD process. 

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [PyTest Documentation](https://docs.pytest.org/en/stable/) — Official PyTest reference covering fixtures, parametrization, plugins, and assertion rewriting
- [pytest-xdist for Parallel Test Execution](https://pytest-xdist.readthedocs.io/) — PyTest plugin documentation for running tests in parallel across CPU cores
- [Cucumber BDD Framework](https://cucumber.io/docs/bdd/) — Official Cucumber documentation for behavior-driven development with Gherkin syntax
- [JUnit 5 Testing Guide (Oracle)](https://junit.org/junit5/docs/current/user-guide/) — JUnit 5 user guide for Java testing including assertions, parameterized tests, and extensions
- [Testing Taxonomy by James Bach](https://www.satisfice.com/testing-taxonomy) — James Bach's research on test categories (state-based, behavior-based, exploratory) and when to apply each
