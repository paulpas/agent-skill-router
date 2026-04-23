"""
Basic example: Generating test oracles for a simple calculator function.

This example demonstrates:
1. Specification-driven oracle generation
2. Property-based validation
3. Boundary condition testing
"""

from typing import List, Dict, Any
import sys

sys.path.insert(0, "/home/paulpas/git/skills/agent-test-oracle-generator")

from reference.oracle_generator import (
    generate_spec_oracle,
    Requirement,
    TestOracle,
    OracleStatus,
    generate_boundary_oracles,
    property_oracle,
)


def test_calculator_example():
    """Example: Generate oracles for a calculator's add function."""

    # Define the requirement specification
    requirement = Requirement(
        id="CALC-001",
        description="Add two numbers and return the sum",
        inputs={"a": 5, "b": 3},
        expected_outputs={"result": 8},
        constraints=["returns integer", "a + b = b + a (commutative)"],
    )

    # Define the implementation
    def add(a: int, b: int) -> int:
        """Add two integers."""
        return a + b

    # Generate specification oracle
    oracle = generate_spec_oracle(requirement, add, 5, 3)

    print("=" * 60)
    print("Calculator Add Function - Oracle Generation")
    print("=" * 60)
    print(f"\nRequirement ID: {requirement.id}")
    print(f"Description: {requirement.description}")
    print(f"\nOracle Name: {oracle.name}")
    print(f"Expected: {oracle.expected}")
    print(f"Actual: {oracle.actual}")
    print(f"Status: {oracle.status.value}")
    print(f"Conditions: {', '.join(oracle.conditions)}")

    assert oracle.status == OracleStatus.PASS, "Addition should produce correct result"
    print("\n✅ Oracle passed - implementation is correct!")


def test_sum_function_oracles():
    """Generate comprehensive oracles for a sum function."""

    def sum_function(numbers: List[int]) -> int:
        """Sum a list of integers."""
        return sum(numbers)

    # Define test requirements
    requirements = [
        Requirement(
            id="SUM-001",
            description="Sum empty list",
            inputs={"numbers": []},
            expected_outputs={"result": 0},
            constraints=["returns zero for empty list"],
        ),
        Requirement(
            id="SUM-002",
            description="Sum single element",
            inputs={"numbers": [42]},
            expected_outputs={"result": 42},
            constraints=["returns the element"],
        ),
        Requirement(
            id="SUM-003",
            description="Sum multiple positive integers",
            inputs={"numbers": [1, 2, 3, 4, 5]},
            expected_outputs={"result": 15},
            constraints=["correct sum"],
        ),
        Requirement(
            id="SUM-004",
            description="Sum with negative numbers",
            inputs={"numbers": [-1, 1, -2, 2]},
            expected_outputs={"result": 0},
            constraints=["cancels opposites"],
        ),
    ]

    print("\n" + "=" * 60)
    print("Sum Function - Multiple Oracles")
    print("=" * 60)

    oracles = []
    for req in requirements:
        oracle = generate_spec_oracle(req, sum_function, req.inputs["numbers"])
        oracles.append(oracle)
        status_symbol = "✅" if oracle.status == OracleStatus.PASS else "❌"
        print(f"\n{status_symbol} {oracle.name}")
        print(f"  Description: {req.description}")
        print(f"  Input: {req.inputs['numbers']}")
        print(f"  Expected: {oracle.expected}")
        print(f"  Status: {oracle.status.value}")

    # Verify all oracles pass
    all_pass = all(o.status == OracleStatus.PASS for o in oracles)
    assert all_pass, (
        f"Some oracles failed: {[o.name for o in oracles if o.status != OracleStatus.PASS]}"
    )
    print(f"\n✅ All {len(oracles)} oracles passed!")


def test_boundary_oracles():
    """Generate oracles for boundary conditions."""

    def safe_divide(numerator: float, denominator: float) -> float:
        """Divide two numbers, handling division by zero."""
        if denominator == 0:
            raise ValueError("Cannot divide by zero")
        return numerator / denominator

    print("\n" + "=" * 60)
    print("Safe Divide Function - Boundary Oracles")
    print("=" * 60)

    # Generate boundary oracles for denominator
    boundary_oracles = generate_boundary_oracles(
        func=lambda d: safe_divide(10, d), param_range=(-1.0, 1.0), boundary_points=5
    )

    for oracle in boundary_oracles:
        status_symbol = "✅" if oracle.status == OracleStatus.PASS else "❌"
        print(f"\n{status_symbol} {oracle.name}")
        print(f"  Value: {oracle.conditions[0]}")
        print(f"  Conditions: {oracle.conditions[1]}")
        print(f"  Status: {oracle.status.value}")
        if oracle.actual:
            print(f"  Result: {oracle.actual}")

    print(f"\n✅ Generated {len(boundary_oracles)} boundary oracles")


def test_property_oracles():
    """Generate property-based oracles."""

    def is_palindrome(s: str) -> bool:
        """Check if string is a palindrome."""
        return s == s[::-1]

    def generate_test_string() -> str:
        """Generate a random test string (deterministic with seed)."""
        import random

        rng = random.Random(42)
        words = ["racecar", "level", "python", "madam", "test"]
        return rng.choice(words)

    # Property: palindrome check should return True for palindromic strings
    property_func = lambda s: is_palindrome(s)

    print("\n" + "=" * 60)
    print("Palindrome Function - Property-Based Oracles")
    print("=" * 60)

    results = property_oracle(
        property_func=property_func, generate_input=generate_test_string, iterations=20
    )

    passed = sum(results)
    total = len(results)

    print(f"\nProperty: is_palindrome(s) should return True")
    print(f"Test cases: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success rate: {passed / total * 100:.1f}%")

    assert all(results), "All property tests should pass"
    print("\n✅ All property oracles passed!")


if __name__ == "__main__":
    test_calculator_example()
    test_sum_function_oracles()
    test_boundary_oracles()
    test_property_oracles()

    print("\n" + "=" * 60)
    print("✅ All examples completed successfully!")
    print("=" * 60)
