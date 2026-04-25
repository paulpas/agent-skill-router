---
name: oracle-generator
description: '"Generates test oracles and expected outputs for testing code by analyzing"
  specifications, requirements, and implementation intent to create accurate, comprehensive
  test validation data.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: testing
  scope: quality
  output-format: test-spec
  triggers: expected output, test oracle, test validation, test-oracle, enterprise
    database, oracle
  related-skills: add-new-skill, confidence-based-selector, goal-to-milestones, multi-skill-executor
---






# Test Oracle Generator

Generate deterministic, production-grade test oracles and expected outputs for validating code behavior. This skill enables automated test validation by analyzing specifications, requirements, and implementation intent to create comprehensive, accurate test validation data.

## TL;DR Checklist

- [ ] Parse specification at boundary, validate input structure before processing
- [ ] Guard clauses handle edge cases at function start (early exit)
- [ ] Return new data structures, never mutate input state (atomic predictability)
- [ ] Fail fast with descriptive errors for invalid inputs or ambiguous requirements
- [ ] Names read like English: `generateExpectedOutput`, `validateTestOracle`
- [ ] All oracles are deterministic: same input → same output every time
- [ ] Include positive, negative, and boundary test cases for comprehensive coverage
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

| Use Case | Description |
|----------|-------------|
| **Automated Test Generation** | Generate expected outputs for unit, integration, and E2E tests based on requirements |
| **Test Validation** | Create oracle data to validate implementation correctness without manual test case design |
| **Behavioral Specification** | Translate product requirements into executable test oracles for CI/CD pipelines |
| **Regression Testing** | Establish baseline expected outputs to detect unintended behavior changes |
| **Test Data Generation** | Create realistic test input-output pairs for mocking external dependencies |
| **Contract Testing** | Define expected API responses or service outputs for contract validation |

## When NOT to Use

| Scenario | Reason |
|----------|--------|
| **Black-box black magic** | Don't use for testing code you don't understand or can't analyze |
| **Non-deterministic systems** | Avoid for systems with external randomness (timezone, network, random seeds) |
| **Exploratory testing** | Not for ad-hoc experimentation where requirements are undefined |
| **Performance testing** | This skill generates logical oracles, not performance benchmarks |
| **Security adversarial testing** | Don't use for penetration testing or vulnerability discovery |

---

## Core Concepts

### Test Oracle Definition

A **test oracle** is a mechanism for determining whether a system under test produced the correct result. It answers: *"What should this code have returned?"*

```plaintext
+----------------+     +------------------+     +------------------+
|   Specification| --> |  Test Oracle     | --> |  Expected Output |
|   / Requirements|     |  Generator       |     |  / Validation    |
+----------------+     +------------------+     +------------------+
                                           |
                                           v
                                   +------------------+
                                   |  Test Execution  |
                                   |  + Oracle Check  |
                                   +------------------+
```

### Oracle Generation Pipeline

```plaintext
Specification (Natural Language)
    ↓ [Parse]
Structured Requirements (Typed)
    ↓ [Analyze Implementation Intent]
Behavioral Model (State Machine)
    ↓ [Generate Cases]
Test Oracle (Expected Output + Conditions)
```

### Types of Test Oracles

| Type | Example | Use Case |
|------|---------|----------|
| **Functional Oracle** | `sum([1,2,3]) === 6` | Pure functions, deterministic algorithms |
| **State Oracle** | `db.records === 5` | Database operations, state changes |
| **Temporal Oracle** | `duration < 100ms` | Performance boundaries |
| **Comparative Oracle** | `result === referenceImplementation()` | Regression testing, cross-platform |
| **Statistical Oracle** | `errorRate < 0.01` | Probabilistic systems, ML models |

### Determinism Matrix

```plaintext
Input + Implementation → Output
        ↓
    Deterministic? → YES → Oracle: exact expected value
        ↓ NO
    Non-deterministic? → YES → Oracle: range/constraints
        ↓ NO
    Unpredictable? → Use mocking/stubbing instead
```

---

## Implementation Patterns

### Pattern 1: Specification-Driven Oracle Generation

Parse requirements and generate oracles that validate implementation against specification.

```python
from typing import Any, Callable, Dict, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

class OracleStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"

@dataclass(frozen=True)
class TestOracle:
    name: str
    expected: Any
    actual: Any
    status: OracleStatus
    conditions: List[str]
    
@dataclass(frozen=True)
class Requirement:
    id: str
    description: str
    inputs: Dict[str, Any]
    expected_outputs: Dict[str, Any]
    constraints: List[str]

def generate_spec_oracle(
    requirement: Requirement,
    implementation: Callable[..., Any],
    *args, **kwargs
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
    expected_result = requirement.expected_outputs
    
    try:
        actual_result = implementation(*args, **kwargs)
        matches = actual_result == expected_result
        status = OracleStatus.PASS if matches else OracleStatus.FAIL
        
        return TestOracle(
            name=f"spec-{requirement.id}",
            expected=expected_result,
            actual=actual_result,
            status=status,
            conditions=requirement.constraints
        )
    except Exception as e:
        return TestOracle(
            name=f"spec-{requirement.id}",
            expected=expected_result,
            actual=str(e),
            status=OracleStatus.ERROR,
            conditions=requirement.constraints
        )

# Usage
requirement = Requirement(
    id="REQ-001",
    description="Calculate sum of array",
    inputs={"arr": [1, 2, 3]},
    expected_outputs={"result": 6},
    constraints=["non-negative", "integer"]
)

def sum_arr(arr: List[int]) -> int:
    return sum(arr)

oracle = generate_spec_oracle(requirement, sum_arr, [1, 2, 3])
```

---

### Pattern 2: Property-Based Oracle Generation

Generate oracles from mathematical properties and invariants.

```python
from typing import List, Callable, Any
from functools import wraps

def property_oracle(
    property_func: Callable[..., bool],
    generate_input: Callable[[], Any],
    iterations: int = 100
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

# Example: List sorting property
def is_sorted(arr: List[int]) -> bool:
    """Property: sorted array is in non-decreasing order"""
    return all(arr[i] <= arr[i+1] for i in range(len(arr)-1))

def generate_random_int_array(size: int = 10) -> List[int]:
    import random
    return [random.randint(0, 100) for _ in range(size)]

def quicksort(arr: List[int]) -> List[int]:
    """Pure implementation"""
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Generate oracle: does sort() satisfy the "is_sorted" property?
results = property_oracle(
    property_func=lambda x: is_sorted(quicksort(x)),
    generate_input=lambda: generate_random_int_array(5),
    iterations=10
)
assert all(results), "Quicksort failed to satisfy sorted property"
```

---

### Pattern 3: Reference Implementation Oracle

Use a trusted reference implementation to validate alternative implementations.

```python
from typing import Protocol, runtime_checkable
from abc import abstractmethod

@runtime_checkable
class ReferenceImplementation(Protocol):
    @abstractmethod
    def execute(self, input_data: Any) -> Any:
        ...

def generate_reference_oracle(
    reference: ReferenceImplementation,
    implementation: Callable[[Any], Any],
    test_cases: List[Any]
) -> List[TestOracle]:
    """
    Generate oracles by comparing against reference implementation.
    
    Law 4: Fail Fast - raise on reference implementation errors
    """
    if not test_cases:
        raise ValueError("Test cases cannot be empty")
    if not isinstance(reference, ReferenceImplementation):
        raise TypeError("Reference must implement ReferenceImplementation protocol")
    
    oracles = []
    for idx, test_case in enumerate(test_cases):
        try:
            # Reference implementation (trusted)
            expected = reference.execute(test_case)
            
            # New implementation (to validate)
            actual = implementation(test_case)
            
            oracles.append(TestOracle(
                name=f"ref-test-{idx}",
                expected=expected,
                actual=actual,
                status=OracleStatus.PASS if actual == expected else OracleStatus.FAIL,
                conditions=[f"Input: {test_case}"]
            ))
        except Exception as e:
            oracles.append(TestOracle(
                name=f"ref-test-{idx}",
                expected=None,
                actual=str(e),
                status=OracleStatus.ERROR,
                conditions=[f"Input: {test_case}"]
            ))
    
    return oracles

# Example: Floating-point comparison reference
class StandardMathRef:
    def execute(self, input_data: Dict[str, float]) -> float:
        import math
        return math.sqrt(input_data["x"] ** 2 + input_data["y"] ** 2)

class ApproximateMath:
    """Hypotenuse approximation"""
    def execute(self, input_data: Dict[str, float]) -> float:
        x, y = input_data["x"], input_data["y"]
        return (x + y) * 0.85  # Approximation

reference = StandardMathRef()
approx = ApproximateMath()

test_inputs = [
    {"x": 3.0, "y": 4.0},  # 5.0
    {"x": 5.0, "y": 12.0},  # 13.0
    {"x": 8.0, "y": 15.0},  # 17.0
]

oracles = generate_reference_oracle(reference, approx.execute, test_inputs)
```

---

### Pattern 4: Boundary Oracle Generation

Generate oracles testing edge cases and boundary conditions.

```python
from typing import Tuple, Callable
import math

def generate_boundary_oracles(
    func: Callable[..., Any],
    param_range: Tuple[float, float],
    boundary_points: int = 5
) -> List[TestOracle]:
    """
    Generate oracles for boundary conditions.
    
    Law 2: Parse, Don't Validate - require valid range specification
    """
    if param_range[0] >= param_range[1]:
        raise ValueError("Range must have distinct bounds")
    if boundary_points < 2:
        raise ValueError("At least 2 boundary points required")
    
    # Parse range into boundary values
    min_val, max_val = param_range
    points = []
    
    # Include exact boundaries
    points.extend([min_val, max_val])
    
    # Include interior boundary points
    step = (max_val - min_val) / (boundary_points - 2)
    for i in range(1, boundary_points - 1):
        points.append(min_val + i * step)
    
    oracles = []
    for val in points:
        try:
            result = func(val)
            oracles.append(TestOracle(
                name=f"boundary-{val:.4f}",
                expected=None,  # No known expected value, just validate no crash
                actual=result,
                status=OracleStatus.PASS if not math.isnan(result) else OracleStatus.FAIL,
                conditions=[f"Value: {val:.4f}", "Within valid domain"]
            ))
        except (ValueError, ZeroDivisionError) as e:
            oracles.append(TestOracle(
                name=f"boundary-{val:.4f}",
                expected="Error expected",
                actual=str(e),
                status=OracleStatus.PASS,  # Error is expected at boundary
                conditions=[f"Value: {val:.4f}", "Domain boundary"]
            ))
    
    return oracles

# Example: Square root function boundaries
def sqrt_func(x: float) -> float:
    if x < 0:
        raise ValueError("Cannot compute sqrt of negative number")
    return math.sqrt(x)

boundaries = generate_boundary_oracles(
    func=sqrt_func,
    param_range=(0.0, 100.0),
    boundary_points=6
)

# Verify all boundary tests pass (either valid result or expected error)
assert all(o.status in [OracleStatus.PASS] for o in boundaries)
```

---

### Pattern 5: State Transition Oracle

Generate oracles for state machine or stateful system validation.

```python
from typing import Dict, Any, Set, List, Optional
from enum import Enum, auto
from dataclasses import dataclass, field

class State(Enum):
    INITIAL = auto()
    PROCESSING = auto()
    COMPLETE = auto()
    ERROR = auto()

@dataclass
class StateTransition:
    from_state: State
    action: str
    to_state: State
    conditions: Set[str] = field(default_factory=set)

@dataclass
class StateOracle:
    transitions: List[StateTransition]
    invalid_transitions: List[StateTransition]

def generate_state_oracle(
    transitions: List[StateTransition],
    invalid_transitions: List[StateTransition],
    state_transitions: Dict[State, Set[State]]
) -> StateOracle:
    """
    Generate oracles for state transition validation.
    
    Law 4: Fail Fast - raise on invalid transition specifications
    """
    # Validate all states exist
    valid_states = set(state_transitions.keys())
    
    for transition in transitions:
        if transition.from_state not in valid_states:
            raise ValueError(f"Invalid from_state: {transition.from_state}")
        if transition.to_state not in valid_states:
            raise ValueError(f"Invalid to_state: {transition.to_state}")
    
    # Validate no invalid transitions are actually valid
    for invalid in invalid_transitions:
        if invalid.to_state in state_transitions.get(invalid.from_state, set()):
            raise ValueError(
                f"Transition {invalid.from_state} -> {invalid.to_state} "
                "is valid, not invalid"
            )
    
    return StateOracle(
        transitions=transitions,
        invalid_transitions=invalid_transitions
    )

# Example: File operation state machine
state_machine = {
    State.INITIAL: {State.PROCESSING, State.ERROR},
    State.PROCESSING: {State.COMPLETE, State.ERROR},
    State.COMPLETE: set(),
    State.ERROR: {State.INITIAL}
}

transitions = [
    StateTransition(State.INITIAL, "open_file", State.PROCESSING),
    StateTransition(State.PROCESSING, "process_data", State.COMPLETE),
    StateTransition(State.PROCESSING, "error_occurred", State.ERROR),
    StateTransition(State.ERROR, "retry", State.INITIAL),
]

invalid = [
    StateTransition(State.COMPLETE, "edit_file", State.PROCESSING),
    StateTransition(State.ERROR, "process_data", State.COMPLETE),
]

oracle = generate_state_oracle(transitions, invalid, state_machine)

def validate_state_transition(
    current_state: State,
    action: str,
    oracle: StateOracle
) -> bool:
    """Validate if transition is permitted by oracle"""
    valid_transitions = {
        (t.from_state, t.action): t.to_state 
        for t in oracle.transitions
    }
    
    key = (current_state, action)
    return key in valid_transitions

# Usage
assert validate_state_transition(State.INITIAL, "open_file", oracle) == True
assert validate_state_transition(State.COMPLETE, "edit_file", oracle) == False
```

---

## Common Patterns

### Pattern 1: Oracle Composition

Combine multiple oracles for comprehensive validation.

```python
from typing import List
from dataclasses import dataclass

@dataclass
class CompositeOracle:
    name: str
    oracles: List[TestOracle]
    
    @property
    def status(self) -> OracleStatus:
        """Overall status: FAIL if any fail, SKIP if all skip, else PASS"""
        statuses = [o.status for o in self.oracles]
        
        if any(s == OracleStatus.ERROR for s in statuses):
            return OracleStatus.ERROR
        if any(s == OracleStatus.FAIL for s in statuses):
            return OracleStatus.FAIL
        if all(s == OracleStatus.SKIP for s in statuses):
            return OracleStatus.SKIP
        return OracleStatus.PASS
    
    @property
    def summary(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "total": len(self.oracles),
            "pass": sum(1 for o in self.oracles if o.status == OracleStatus.PASS),
            "fail": sum(1 for o in self.oracles if o.status == OracleStatus.FAIL),
            "error": sum(1 for o in self.oracles if o.status == OracleStatus.ERROR),
            "skip": sum(1 for o in self.oracles if o.status == OracleStatus.SKIP),
            "overall": self.status.value
        }

# Usage
composite = CompositeOracle(
    name="sum_function_oracles",
    oracles=[spec_oracle, property_oracle, boundary_oracle]
)
```

### Pattern 2: Oracle Regression Detection

Detect behavior changes across versions.

```python
from typing import Dict, Any

class OracleRegistry:
    """Store and compare oracles across versions"""
    
    def __init__(self):
        self.baseline: Dict[str, Any] = {}
        self.current: Dict[str, Any] = {}
    
    def register_baseline(self, name: str, oracle: TestOracle) -> None:
        """Register baseline oracle from trusted version"""
        self.baseline[name] = oracle
    
    def register_current(self, name: str, oracle: TestOracle) -> None:
        """Register current oracle to compare"""
        self.current[name] = oracle
    
    def detect_regression(self, name: str) -> Optional[Dict[str, Any]]:
        """Detect if current differs from baseline"""
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

# Usage
registry = OracleRegistry()
registry.register_baseline("sum_test", baseline_oracle)
registry.register_current("sum_test", current_oracle)

regression = registry.detect_regression("sum_test")
if regression:
    print(f"Regression detected: {regression}")
```

---

## Common Mistakes

### Mistake 1: Non-Deterministic Oracle Generation

❌ **Incorrect** - Uses random values without seeding:
```python
import random

def bad_generate_oracle():
    # Random seed changes each run
    value = random.randint(0, 100)
    return {"expected": value * 2}
```

✅ **Correct** - Deterministic with explicit seed:
```python
import random

def good_generate_oracle(seed: int = 42) -> Dict[str, int]:
    # Deterministic with seed parameter
    rng = random.Random(seed)
    value = rng.randint(0, 100)
    return {"expected": value * 2, "seed": seed}
```

---

### Mistake 2: Over-Specification

❌ **Incorrect** - Oracle is too specific, brittle to implementation:
```python
def bad_oracle():
    # Tightly couples to internal implementation
    expected = {
        "items": [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}],
        "count": 2,
        "metadata": {"timestamp": "2024-01-01T00:00:00Z"}
    }
```

✅ **Correct** - Focuses on observable behavior:
```python
def good_oracle():
    # Specifies required fields, allows flexibility
    expected = {
        "items": Any[List[Dict[str, Any]]],
        "count": IsInt(gte=0),
        "metadata": {"timestamp": IsDatetime()}
    }
```

---

### Mistake 3: Missing Edge Case Coverage

❌ **Incorrect** - Only tests happy path:
```python
def bad_oracle():
    return {
        "test": "happy_path",
        "input": [1, 2, 3],
        "expected": 6
    }
```

✅ **Correct** - Comprehensive edge cases:
```python
def good_oracle():
    return [
        {"name": "empty", "input": [], "expected": 0},
        {"name": "single", "input": [5], "expected": 5},
        {"name": "negative", "input": [-1, 1], "expected": 0},
        {"name": "large", "input": [1000000, 2000000], "expected": 3000000},
    ]
```

---

### Mistake 4: Hidden Mutations

❌ **Incorrect** - Oracle mutates state:
```python
def bad_oracle(cache={}):
    # Mutates global cache
    cache["count"] = cache.get("count", 0) + 1
    return {"count": cache["count"]}
```

✅ **Correct** - Oracle is pure:
```python
def good_oracle():
    # Returns new data structure, no mutation
    def compute_count():
        return 1  # Deterministic calculation
    return {"count": compute_count()}
```

---

### Mistake 5: Poor Oracle Naming

❌ **Incorrect** - Unclear purpose:
```python
def test1():
    # What is being tested?
    x = [1, 2, 3]
    return sum(x) == 6
```

✅ **Correct** - Intent-clear naming:
```python
def test_sum_empty_array_returns_zero():
    assert sum([]) == 0

def test_sum_positive_integers():
    assert sum([1, 2, 3]) == 6

def test_sum_with_negative_values():
    assert sum([-1, 1]) == 0
```

---

## Adherence Checklist

### Code Review Checklist
- [ ] **Early Exit**: All validation at function start with guard clauses
- [ ] **Parsed State**: Inputs parsed into trusted types at boundary
- [ ] **Atomic Predictability**: Functions return new data, no hidden mutations
- [ ] **Fail Fast**: Invalid inputs raise descriptive errors immediately
- [ ] **Intentional Naming**: Function/variable names read like English
- [ ] **No Debug Statements**: No print, console.log, debugger remaining
- [ ] **Type Hints**: All public functions have return type annotations
- [ ] **Documentation**: Public functions have clear docstrings

### Testing Checklist
- [ ] **Positive Cases**: At least one passing test per oracle
- [ ] **Negative Cases**: Tests for invalid inputs and edge cases
- [ ] **Boundary Cases**: Min/max, empty, null, and boundary values tested
- [ ] **Determinism**: Oracles produce same result on repeated runs
- [ ] **Composability**: Oracles can be combined into composite oracles
- [ ] **Regression Detection**: Baseline oracles can detect behavior changes

### Security Checklist
- [ ] **No Secrets**: No hardcoded credentials or sensitive data
- [ ] **Input Sanitization**: External inputs validated before processing
- [ ] **Type Safety**: Strict type checking prevents type confusion attacks
- [ ] **Resource Limits**: PreventsDoS through iteration limits

### Performance Checklist
- [ ] **No Unbounded Recursion**: Iteration limits for recursive generation
- [ ] **Efficient Algorithms**: O(n) or better where possible
- [ ] **Memory Management**: Oracles don't retain references unnecessarily

---

## References

### Related Skills
| Skill | Purpose |
|-------|---------|
| `code-philosophy` | Foundational 5 Laws of Elegant Defense |
| `code-review` | Methodology for reviewing generated oracles |
| `plan-protocol` | Implementation planning for oracle generation |
| `plan-review` | Reviewing oracle generation plans |

### Dependencies
| Library | Purpose |
|---------|---------|
| `typing` | Type hints for oracle structures |
| `dataclasses` | Immutable oracle data structures |
| `enum` | Status enumerations |

### External Resources
- [The Art of Software Testing](https://www.wiley.com/en-us/The+Art+of+Software+Testing%2C+3rd+Edition-p-9781118438508) - Comprehensive testing theory
- [Property-Based Testing with PropEr](https://learnyousomeerlang.com/propertesting) - Property-based oracle generation
- [Oxford Oracle Definition](https://www.cs.ox.ac.uk/files/583/OracleDefinitions.pdf) - Formal oracle definitions

---

## Implementation Tracking

| Task | Status | Date |
|------|--------|------|
| Draft initial skill specification | ✅ Complete | 2026-04-23 |
| Load code-philosophy for guidance | ✅ Complete | 2026-04-23 |
| Define 14-section structure | ✅ Complete | 2026-04-23 |
| Implement Pattern 1: Specification-Driven | ✅ Complete | 2026-04-23 |
| Implement Pattern 2: Property-Based | ✅ Complete | 2026-04-23 |
| Implement Pattern 3: Reference Implementation | ✅ Complete | 2026-04-23 |
| Implement Pattern 4: Boundary Oracle | ✅ Complete | 2026-04-23 |
| Implement Pattern 5: State Transition | ✅ Complete | 2026-04-23 |
| Add Common Patterns section | ✅ Complete | 2026-04-23 |
| Document Common Mistakes | ✅ Complete | 2026-04-23 |
| Create Adherence Checklist | ✅ Complete | 2026-04-23 |
| Save to SKILL.md | ✅ Complete | 2026-04-23 |

---

## Version History

| Version | Status | Date | Changes |
|---------|--------|------|---------|
| 1.0.0 | Planned | 2026-04-23 | Initial release with 5 patterns |
| 1.1.0 | Future | 2026-Q2 | Add ML model oracles pattern |
| 1.2.0 | Future | 2026-Q3 | Add financial calculation oracles |
| 1.3.0 | Future | 2026-Q4 | Add distributed system oracles |
| 2.0.0 | Future | 2027-Q1 | Breaking changes, API cleanup |

### Roadmap
```
2026-Q2: ML oracles + Financial patterns
2026-Q3: Financial oracles + Security patterns  
2026-Q4: Distributed systems + Performance patterns
2027-Q1: v2.0.0 with breaking changes
```

---

## Implementation Prompt (Execution Layer)

**System Context:** You are `agent-test-oracle-generator`, a production-grade test oracle generation agent. Your purpose is to generate deterministic, comprehensive test oracles that validate code behavior against specifications.

**Core Mission:** Generate production-grade test oracles following the 5 Laws of Elegant Defense from code-philosophy.

### Requirements

1. **Parse Specification at Boundary**
   - Accept specification in natural language or structured format
   - Validate input structure before processing
   - Reject ambiguous or incomplete specifications

2. **Generate Oracle Structure**
   - Include: name, expected, actual, status, conditions
   - Support: functional, state, temporal, comparative, statistical oracles
   - Ensure determinism: same input → same output every time

3. **Fail Fast on Ambiguity**
   - If specification is unclear, request clarification
   - If implementation intent is unclear, reject generation
   - Never guess or assume behavior

4. **Atomic Predictability**
   - Return new data structures, never mutate inputs
   - Functions must be pure where possible
   - Same input parameters → same oracle every time

5. **Intentional Naming**
   - Oracles named like: `test_sum_empty_array_returns_zero`
   - Include: scenario, input condition, expected outcome
   - Avoid: `test1`, `oracle_a`, `case_x`

### Output Format

```python
# Return as structured data, not code
{
    "oracles": [
        {
            "name": "oracle_name",
            "expected": "expected_value_or_structure",
            "actual": "implementation_call",
            "status": "pass|fail|skip|error",
            "conditions": ["constraint1", "constraint2"]
        }
    ],
    "metadata": {
        "generated_at": "timestamp",
        "spec_version": "1.0.0",
        "deterministic": true
    }
}
```

### Laws Enforcement

| Law | Enforcement |
|-----|-------------|
| Early Exit | Validation before any oracle generation |
| Parse, Don't Validate | Specification parsed to typed structure |
| Atomic Predictability | No mutable state in generated oracles |
| Fail Fast | Reject ambiguous specifications immediately |
| Intentional Naming | All oracles named descriptively |

### Example Execution

**Input:** "Generate oracles for a function that calculates factorial"

**Output:** Production-grade oracles:
```python
[
    {"name": "factorial_zero_returns_one", "input": 0, "expected": 1},
    {"name": "factorial_one_returns_one", "input": 1, "expected": 1},
    {"name": "factorial_positive_returns_correct", "input": 5, "expected": 120},
    {"name": "factorial_negative_raises_error", "input": -1, "expected": "ValueError"},
]
```

**Execute.**
