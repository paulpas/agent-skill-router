"""
Reference implementation for test oracle generator patterns.
"""

from typing import Any, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import random


class OracleStatus(Enum):
    """Status of a test oracle execution."""

    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


@dataclass(frozen=True)
class TestOracle:
    """A single test oracle."""

    name: str
    expected: Any
    actual: Any
    status: OracleStatus
    conditions: List[str]


@dataclass(frozen=True)
class Requirement:
    """A parsed requirement specification."""

    id: str
    description: str
    inputs: Dict[str, Any]
    expected_outputs: Dict[str, Any]
    constraints: List[str]


def generate_spec_oracle(
    requirement: Requirement, implementation: Callable[..., Any], *args, **kwargs
) -> TestOracle:
    """
    Generate oracle from specification requirements.

    Law 1: Early Exit - guard clauses for invalid inputs
    Law 2: Parse, Don't Validate - require typed inputs
    """
    if not requirement.id:
        raise ValueError("Requirement ID is required")
    if not callable(implementation):
        raise TypeError("Implementation must be callable")

    # Parse inputs at boundary
    parsed_input = requirement.inputs
    # Extract expected result - support both flat values and dict with "result" key
    expected_outputs = requirement.expected_outputs
    expected_result = expected_outputs.get("result", expected_outputs)

    try:
        actual_result = implementation(*args, **kwargs)
        matches = actual_result == expected_result
        status = OracleStatus.PASS if matches else OracleStatus.FAIL

        return TestOracle(
            name=f"spec-{requirement.id}",
            expected=expected_result,
            actual=actual_result,
            status=status,
            conditions=requirement.constraints,
        )
    except Exception as e:
        return TestOracle(
            name=f"spec-{requirement.id}",
            expected=expected_result,
            actual=str(e),
            status=OracleStatus.ERROR,
            conditions=requirement.constraints,
        )
    except Exception as e:
        return TestOracle(
            name=f"spec-{requirement.id}",
            expected=expected_result,
            actual=str(e),
            status=OracleStatus.ERROR,
            conditions=requirement.constraints,
        )


def property_oracle(
    property_func: Callable[..., bool],
    generate_input: Callable[[], Any],
    iterations: int = 100,
) -> List[bool]:
    """
    Generate oracles by testing properties across multiple inputs.

    Law 3: Atomic Predictability - property_func must be pure
    """
    if iterations < 1:
        raise ValueError("Iterations must be positive")
    if not callable(property_func):
        raise TypeError("Property function must be callable")

    results = []
    for _ in range(iterations):
        test_input = generate_input()
        # Atomic: property_func is pure, no side effects
        result = property_func(test_input)
        results.append(result)

    return results


@dataclass
class StateTransition:
    """A state machine transition."""

    from_state: str
    action: str
    to_state: str
    conditions: List[str] = None


def generate_state_oracle(
    transitions: List[StateTransition], state_transitions: Dict[str, List[str]]
) -> Dict[str, Any]:
    """
    Generate oracle for state transition validation.

    Law 4: Fail Fast - raise on invalid transition specifications
    """
    valid_states = set(state_transitions.keys())

    for transition in transitions:
        if transition.from_state not in valid_states:
            raise ValueError(f"Invalid from_state: {transition.from_state}")
        if transition.to_state not in valid_states:
            raise ValueError(f"Invalid to_state: {transition.to_state}")

    return {
        "transitions": [
            {"from": t.from_state, "action": t.action, "to": t.to_state}
            for t in transitions
        ],
        "valid_states": list(valid_states),
    }


def generate_boundary_oracles(
    func: Callable[[float], float],
    param_range: Tuple[float, float],
    boundary_points: int = 5,
) -> List[TestOracle]:
    """
    Generate oracles for boundary conditions.

    Law 2: Parse, Don't Validate - require valid range specification
    """
    if param_range[0] >= param_range[1]:
        raise ValueError("Range must have distinct bounds")
    if boundary_points < 2:
        raise ValueError("At least 2 boundary points required")

    min_val, max_val = param_range
    points = [min_val, max_val]

    step = (max_val - min_val) / (boundary_points - 2)
    for i in range(1, boundary_points - 1):
        points.append(min_val + i * step)

    oracles = []
    for val in points:
        try:
            result = func(val)
            import math

            status = OracleStatus.PASS if not math.isnan(result) else OracleStatus.FAIL
            oracles.append(
                TestOracle(
                    name=f"boundary-{val:.4f}",
                    expected=None,
                    actual=result,
                    status=status,
                    conditions=[f"Value: {val:.4f}", "Within valid domain"],
                )
            )
        except (ValueError, ZeroDivisionError) as e:
            oracles.append(
                TestOracle(
                    name=f"boundary-{val:.4f}",
                    expected="Error expected",
                    actual=str(e),
                    status=OracleStatus.PASS,
                    conditions=[f"Value: {val:.4f}", "Domain boundary"],
                )
            )

    return oracles


class OracleRegistry:
    """Store and compare oracles across versions."""

    def __init__(self):
        self.baseline: Dict[str, Any] = {}
        self.current: Dict[str, Any] = {}

    def register_baseline(self, name: str, oracle: TestOracle) -> None:
        """Register baseline oracle from trusted version."""
        self.baseline[name] = oracle

    def register_current(self, name: str, oracle: TestOracle) -> None:
        """Register current oracle to compare."""
        self.current[name] = oracle

    def detect_regression(self, name: str) -> Optional[Dict[str, Any]]:
        """Detect if current differs from baseline."""
        if name not in self.baseline:
            return {"error": f"Baseline not found: {name}"}
        if name not in self.current:
            return {"error": f"Current not found: {name}"}

        baseline_oracle = self.baseline[name]
        current_oracle = self.current[name]

        if baseline_oracle.status != OracleStatus.PASS:
            return {"warning": "Baseline oracle was not passing"}

        if baseline_oracle.expected != current_oracle.expected:
            return {"regression": "Expected output changed"}
        if current_oracle.status != OracleStatus.PASS:
            return {"regression": f"Current failed: {current_oracle.name}"}

        return None


# Example usage
if __name__ == "__main__":
    # Example 1: Specification-driven oracle
    requirement = Requirement(
        id="REQ-001",
        description="Calculate sum of array",
        inputs={"arr": [1, 2, 3]},
        expected_outputs={"result": 6},
        constraints=["non-negative", "integer"],
    )

    def sum_arr(arr: List[int]) -> int:
        return sum(arr)

    oracle = generate_spec_oracle(requirement, sum_arr, [1, 2, 3])
    print(f"Specification Oracle: {oracle.name} - {oracle.status.value}")

    # Example 2: Property-based oracle
    def is_sorted(arr: List[int]) -> bool:
        return all(arr[i] <= arr[i + 1] for i in range(len(arr) - 1))

    def generate_random_int_array(size: int = 10) -> List[int]:
        rng = random.Random(42)  # Deterministic
        return [rng.randint(0, 100) for _ in range(size)]

    results = property_oracle(
        property_func=lambda x: is_sorted(sorted(x)),
        generate_input=lambda: generate_random_int_array(5),
        iterations=10,
    )
    print(f"Property Oracle: {sum(results)}/{len(results)} passed")

    # Example 3: State oracle
    state_machine = {
        "INITIAL": ["PROCESSING", "ERROR"],
        "PROCESSING": ["COMPLETE", "ERROR"],
        "COMPLETE": [],
        "ERROR": ["INITIAL"],
    }

    transitions = [
        StateTransition("INITIAL", "open_file", "PROCESSING"),
        StateTransition("PROCESSING", "process_data", "COMPLETE"),
    ]

    state_oracle = generate_state_oracle(transitions, state_machine)
    print(f"State Oracle: {len(state_oracle['transitions'])} transitions defined")
