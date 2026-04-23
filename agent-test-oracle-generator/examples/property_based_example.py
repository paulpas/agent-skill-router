"""
Property-based oracle generation example.

This example demonstrates:
1. Property-based testing with multiple random inputs
2. Invariant verification across data structures
3. Comparison oracles for cross-implementation validation
"""

import sys

sys.path.insert(0, "/home/paulpas/git/skills/agent-test-oracle-generator")

from typing import List, Dict, Any, Callable
from dataclasses import dataclass
import random

from reference.oracle_generator import (
    generate_spec_oracle,
    Requirement,
    TestOracle,
    OracleStatus,
    property_oracle,
    generate_boundary_oracles,
    StateTransition,
    generate_state_oracle,
)


@dataclass
class PropertyOracleResult:
    """Result of property-based oracle testing."""

    property_name: str
    total_tests: int
    passed: int
    failed: int
    details: List[Dict[str, Any]]


def property_test(
    property_name: str,
    property_func: Callable[[Any], bool],
    generate_input: Callable[[], Any],
    iterations: int = 100,
) -> PropertyOracleResult:
    """
    Run property-based testing and return structured results.
    """
    results = property_oracle(
        property_func=property_func,
        generate_input=generate_input,
        iterations=iterations,
    )

    passed = sum(results)
    failed = len(results) - passed

    return PropertyOracleResult(
        property_name=property_name,
        total_tests=iterations,
        passed=passed,
        failed=failed,
        details=[
            {"test": i + 1, "input": generate_input(), "passed": results[i]}
            for i in range(min(5, iterations))
        ],
    )


def test_sorting_properties():
    """Test sorting function with various properties."""

    def quicksort(arr: List[int]) -> List[int]:
        """Pure quicksort implementation."""
        if len(arr) <= 1:
            return arr
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return quicksort(left) + middle + quicksort(right)

    def output_is_sorted(arr: List[int]) -> bool:
        """Property: quicksort output is in non-decreasing order."""
        sorted_arr = quicksort(arr)
        return (
            all(sorted_arr[i] <= sorted_arr[i + 1] for i in range(len(sorted_arr) - 1))
            if len(sorted_arr) > 1
            else True
        )

    def generates_same_length(arr: List[int]) -> bool:
        """Property: output has same length as input."""
        return len(quicksort(arr)) == len(arr)

    def preserves_elements(arr: List[int]) -> bool:
        """Property: output contains same elements as input."""
        sorted_arr = quicksort(arr)
        return sorted(sorted_arr) == sorted(arr)

    def generate_test_array() -> List[int]:
        """Generate random test array with deterministic seed."""
        rng = random.Random(42)
        size = rng.randint(0, 20)
        return [rng.randint(-100, 100) for _ in range(size)]

    print("=" * 60)
    print("Sorting Function - Property-Based Oracles")
    print("=" * 60)

    tests = [
        ("output_is_sorted", output_is_sorted),
        ("same_length", generates_same_length),
        ("preserves_elements", preserves_elements),
    ]

    for prop_name, prop_func in tests:
        result = property_test(
            property_name=prop_name,
            property_func=prop_func,
            generate_input=generate_test_array,
            iterations=50,
        )

        symbol = "✅" if result.failed == 0 else "❌"
        print(f"\n{symbol} Property: {prop_name}")
        print(f"  Tests: {result.total_tests}")
        print(f"  Passed: {result.passed}")
        print(f"  Failed: {result.failed}")

        if result.details:
            print("  Sample tests:")
            for detail in result.details[:3]:
                sample_symbol = "✅" if detail["passed"] else "❌"
                print(
                    f"    {sample_symbol} {detail['input'][:5]}..."
                    if len(detail["input"]) > 5
                    else f"    {sample_symbol} {detail['input']}"
                )

        assert result.failed == 0, f"Property {prop_name} failed {result.failed} tests"

    print("\n✅ All sorting properties verified!")


def test_fibonacci_properties():
    """Test Fibonacci function with mathematical properties."""

    def fibonacci(n: int) -> int:
        """Calculate nth Fibonacci number."""
        if n <= 0:
            return 0
        if n == 1:
            return 1
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b

    def fibonacci_recursive(n: int) -> int:
        """Slow but correct recursive implementation for comparison."""
        if n <= 0:
            return 0
        if n == 1:
            return 1
        return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)

    def sum_of_fibs_property(n: int) -> bool:
        """Property: sum(F(0)..F(n)) = F(n+2) - 1."""
        if n < 0:
            return True  # Skip negative
        left = sum(fibonacci(i) for i in range(n + 1))
        right = fibonacci(n + 2) - 1
        return left == right

    def fib_growth_property(n: int) -> bool:
        """Property: F(n) >= F(n-1) for n >= 1."""
        if n <= 1:
            return True
        return fibonacci(n) >= fibonacci(n - 1)

    def generate_fib_input() -> int:
        """Generate test input for Fibonacci."""
        rng = random.Random(42)
        return rng.randint(0, 30)

    print("\n" + "=" * 60)
    print("Fibonacci Function - Mathematical Properties")
    print("=" * 60)

    tests = [
        ("sum_property", sum_of_fibs_property),
        ("growth_property", fib_growth_property),
    ]

    for prop_name, prop_func in tests:
        result = property_test(
            property_name=prop_name,
            property_func=prop_func,
            generate_input=generate_fib_input,
            iterations=30,
        )

        symbol = "✅" if result.failed == 0 else "❌"
        print(f"\n{symbol} Property: {prop_name}")
        print(f"  Tests: {result.total_tests}")
        print(f"  Passed: {result.passed}")
        print(f"  Failed: {result.failed}")

        assert result.failed == 0, f"Property {prop_name} failed"

    # Cross-implementation comparison
    print("\n" + "-" * 60)
    print("Cross-Implementation Comparison")
    print("-" * 60)

    test_values = [0, 1, 5, 10, 20, 30]
    all_match = True
    for n in test_values:
        fast_result = fibonacci(n)
        slow_result = fibonacci_recursive(n)
        match = fast_result == slow_result
        symbol = "✅" if match else "❌"
        print(f"{symbol} F({n}): iterative={fast_result}, recursive={slow_result}")
        all_match = all_match and match

    assert all_match, "Implementation results should match"
    print("\n✅ All Fibonacci properties verified!")


def test_state_machine_oracles():
    """Generate oracles for a simple state machine."""

    print("\n" + "=" * 60)
    print("State Machine - State Transition Oracles")
    print("=" * 60)

    # Define valid state transitions
    state_transitions = {
        "IDLE": ["CONNECTING"],
        "CONNECTING": ["CONNECTED", "ERROR"],
        "CONNECTED": ["DISCONNECTING", "RECEIVING"],
        "RECEIVING": ["TRANSMITTING", "ERROR"],
        "TRANSMITTING": ["RECEIVING", "IDLE"],
        "DISCONNECTING": ["IDLE"],
        "ERROR": ["IDLE"],
    }

    # Define valid transitions
    transitions = [
        StateTransition("IDLE", "connect", "CONNECTING"),
        StateTransition("CONNECTING", "connected", "CONNECTED"),
        StateTransition("CONNECTING", "error", "ERROR"),
        StateTransition("CONNECTED", "receive", "RECEIVING"),
        StateTransition("CONNECTED", "disconnect", "DISCONNECTING"),
        StateTransition("RECEIVING", "transmit", "TRANSMITTING"),
        StateTransition("TRANSMITTING", "idle", "IDLE"),
        StateTransition("ERROR", "reset", "IDLE"),
    ]

    invalid_transitions = [
        StateTransition("IDLE", "receive", "RECEIVING"),  # Can't receive while idle
        StateTransition("CONNECTED", "connect", "CONNECTING"),  # Already connected
    ]

    oracle = generate_state_oracle(transitions, state_transitions)

    print(f"\n✅ State machine oracle generated")
    print(f"  Valid states: {len(oracle['valid_states'])}")
    print(f"  Valid transitions: {len(oracle['transitions'])}")

    # Validate transitions
    valid_state_set = set(state_transitions.keys())
    for t in transitions:
        assert t.from_state in valid_state_set
        assert t.to_state in valid_state_set

    # Validate invalid transitions
    for inv in invalid_transitions:
        if inv.to_state in state_transitions.get(inv.from_state, []):
            raise ValueError(
                f"Invalid transition is actually valid: {inv.from_state} -> {inv.to_state}"
            )

    print("\n✅ All state transitions validated!")


def test_data_structure_oracles():
    """Generate oracles for data structure operations."""

    print("\n" + "=" * 60)
    print("Data Structures - Operation Oracles")
    print("=" * 60)

    # Oracle for stack operations
    def stack_oracle() -> List[TestOracle]:
        """Generate oracles for stack behavior."""

        class Stack:
            def __init__(self):
                self._data = []

            def push(self, item):
                self._data.append(item)

            def pop(self):
                if not self._data:
                    raise IndexError("Stack is empty")
                return self._data.pop()

            def peek(self):
                if not self._data:
                    raise IndexError("Stack is empty")
                return self._data[-1]

            def is_empty(self):
                return len(self._data) == 0

            def size(self):
                return len(self._data)

        stack = Stack()
        oracles = []

        # Test 1: Empty stack
        oracles.append(
            TestOracle(
                name="stack_empty_initially",
                expected=True,
                actual=stack.is_empty(),
                status=OracleStatus.PASS if stack.is_empty() else OracleStatus.FAIL,
                conditions=["Stack should be empty initially"],
            )
        )

        # Test 2: Push and size
        stack.push(42)
        oracles.append(
            TestOracle(
                name="stack_size_after_push",
                expected=1,
                actual=stack.size(),
                status=OracleStatus.PASS if stack.size() == 1 else OracleStatus.FAIL,
                conditions=["Size should be 1 after single push"],
            )
        )

        # Test 3: Peek
        oracles.append(
            TestOracle(
                name="stack_peek",
                expected=42,
                actual=stack.peek(),
                status=OracleStatus.PASS if stack.peek() == 42 else OracleStatus.FAIL,
                conditions=["Peek should return top element"],
            )
        )

        # Test 4: Pop
        popped = stack.pop()
        oracles.append(
            TestOracle(
                name="stack_pop",
                expected=42,
                actual=popped,
                status=OracleStatus.PASS if popped == 42 else OracleStatus.FAIL,
                conditions=["Pop should return top element"],
            )
        )

        # Test 5: Stack after pop
        oracles.append(
            TestOracle(
                name="stack_empty_after_pop",
                expected=True,
                actual=stack.is_empty(),
                status=OracleStatus.PASS if stack.is_empty() else OracleStatus.FAIL,
                conditions=["Stack should be empty after pop"],
            )
        )

        # Test 6: Pop empty stack
        try:
            stack.pop()
            oracles.append(
                TestOracle(
                    name="stack_pop_empty_error",
                    expected="Error expected",
                    actual=None,
                    status=OracleStatus.ERROR,
                    conditions=["Pop empty stack should raise error"],
                )
            )
        except IndexError:
            oracles.append(
                TestOracle(
                    name="stack_pop_empty_error",
                    expected="IndexError",
                    actual="IndexError",
                    status=OracleStatus.PASS,
                    conditions=["Pop empty stack should raise IndexError"],
                )
            )

        return oracles

    stack_oracles = stack_oracle()
    for oracle in stack_oracles:
        symbol = "✅" if oracle.status == OracleStatus.PASS else "❌"
        print(f"\n{symbol} {oracle.name}")
        print(f"  Expected: {oracle.expected}")
        print(f"  Status: {oracle.status.value}")

    all_pass = all(o.status == OracleStatus.PASS for o in stack_oracles)
    assert all_pass, "All stack oracles should pass"
    print(f"\n✅ All {len(stack_oracles)} stack oracles passed!")


if __name__ == "__main__":
    test_sorting_properties()
    test_fibonacci_properties()
    test_state_machine_oracles()
    test_data_structure_oracles()

    print("\n" + "=" * 60)
    print("✅ All property-based examples completed!")
    print("=" * 60)
