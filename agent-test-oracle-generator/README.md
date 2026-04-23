# agent-test-oracle-generator

Implementation repository for the `agent-test-oracle-generator` skill.

This skill generates deterministic, production-grade test oracles and expected outputs for testing code by analyzing specifications, requirements, and implementation intent.

## Structure

```
agent-test-oracle-generator/
├── SKILL.md                    # Skill specification (main file)
├── reference/                  # Reference implementations
│   ├── oracle_generator.py     # Core oracle generation patterns
│   └── test_oracle.py          # Test utilities
└── examples/                   # Usage examples
    ├── basic_example.py        # Basic usage examples
    └── property_based_example.py  # Property-based testing examples
```

## Quick Start

```bash
# Run basic examples
cd examples
python3 basic_example.py

# Run property-based examples
python3 property_based_example.py
```

## Core Patterns

The skill implements 5 key patterns:

1. **Specification-Driven Oracle** - Parse requirements and generate oracles
2. **Property-Based Oracle** - Test mathematical properties across inputs
3. **Reference Implementation Oracle** - Compare against trusted implementation
4. **Boundary Oracle** - Test edge cases and boundary conditions
5. **State Transition Oracle** - Validate state machine transitions

## Examples

### Basic Example

```python
from reference.oracle_generator import generate_spec_oracle, Requirement

requirement = Requirement(
    id="TEST-001",
    description="Add two numbers",
    inputs={"a": 5, "b": 3},
    expected_outputs={"result": 8},
    constraints=["returns integer"]
)

def add(a: int, b: int) -> int:
    return a + b

oracle = generate_spec_oracle(requirement, add, 5, 3)
print(f"Status: {oracle.status.value}")  # pass
```

### Property-Based Example

```python
from reference.oracle_generator import property_oracle

def is_sorted(arr: List[int]) -> bool:
    return all(arr[i] <= arr[i+1] for i in range(len(arr)-1))

results = property_oracle(
    property_func=lambda x: is_sorted(sorted(x)),
    generate_input=lambda: [random.randint(0, 100) for _ in range(10)],
    iterations=100
)
```

## Running Tests

```bash
# Run reference implementation
python3 reference/oracle_generator.py

# Run all examples
python3 examples/basic_example.py
python3 examples/property_based_example.py
```

## Versioning

- Follows semantic versioning
- Version history tracked in `SKILL.md`

## License

MIT
