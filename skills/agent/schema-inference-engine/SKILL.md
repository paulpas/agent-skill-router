---
name: inference-engine
description: '"Inferences data schemas from actual data samples, generatingtyped data"
  structures and validation rules for data pipelines.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: data
  scope: schema
  output-format: schema
  triggers: data schema, schema discovery, schema inference, schema-inference-engine
  related-skills: add-new-skill, confidence-based-selector, goal-to-milestones, multi-skill-executor
---




# Schema Inference Engine (Data Schema Discovery)

> **Load this skill** when designing or modifying schema inference pipelines that analyze data samples to discover, infer, and validate data schemas for pipelines.

## TL;DR Checklist

When inferring data schemas:

- [ ] Analyze data samples to identify field types and patterns
- [ ] Handle missing and null values appropriately
- [ ] Detect nested structures and arrays
- [ ] Infer constraints (min/max, patterns, enums)
- [ ] Generate typed data structures with validation
- [ ] Create schema validation rules and documentation
- [ ] Track schema evolution over time
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Schema Inference Engine when:

- Discovering schemas from unknown data sources
- Generating types from API responses
- Validating incoming data against inferred schema
- Documenting data structures for pipelines
- Converting unstructured data to typed structures

---

## When NOT to Use

Avoid using Schema Inference Engine for:

- Known schemas with strict requirements
- Schema migration tasks
- Environments without data samples
- Tasks where schema is manually defined
- Real-time schema validation (use compiled schemas)

---

## Core Concepts

### Schema Inference Pipeline

```
Schema Inference Pipeline
├── Data Ingestion
│   ├── Sample Collection
│   ├── Data Parsing
│   └── Null Handling
├── Type Inference
│   ├── Primitive Types
│   ├── Nested Objects
│   └── Arrays/Lists
├── Constraint Inference
│   ├── Min/Max Values
│   ├── Pattern Matching
│   ├── Enum Values
│   └── Required Fields
├── Schema Generation
│   ├── Type Definitions
│   ├── Validation Rules
│   └── Documentation
└── Schema Validation
    ├── Schema Test
    ├── Data Validation
    └── Evolution Tracking
```

### Inferred Types

#### 1. Primitive Types

```
String: Text data
Number: Integer or floating-point
Boolean: True/false values
Null: Null/none values
```

#### 2. Complex Types

```
Object: Key-value pairs with properties
Array: Ordered list of values
Union: One of multiple possible types
Optional: May be present or absent
```

#### 3. Constraint Types

```
MinLength/MaxLength: String length limits
Minimum/Maximum: Numeric bounds
Pattern: Regex patterns
Enum: Limited set of values
Required: Field presence requirements
Unique: Array uniqueness
```

### Inference Strategies

#### 1. Heuristic-Based
```
Analyze data patterns → Apply heuristics → Infer types
Useful for: Quick inference, unknown data
```

#### 2. Statistical
```
Sample large dataset → Compute statistics → Infer types
Useful for: Large datasets, probability-based
```

#### 3. Hybrid
```
Combine heuristic and statistical approaches
Useful for: Most production scenarios
```

---

## Implementation Patterns

### Pattern 1: Primitive Type Inference

Infer primitive types from data samples:

```python
from dataclasses import dataclass
from typing import Any, List, Optional
from datetime import datetime
import re


@dataclass
class InferredType:
    type: str  # string, number, boolean, null, object, array
    nullable: bool
    constraints: dict
    samples: List[Any]


def infer_primitive_type(values: List[Any]) -> InferredType:
    """Infer primitive type from a list of values."""
    if not values:
        return InferredType(
            type="null",
            nullable=True,
            constraints={},
            samples=[]
        )
    
    # Remove nulls for type detection
    non_null_values = [v for v in values if v is not None]
    has_nulls = len(non_null_values) < len(values)
    
    if not non_null_values:
        return InferredType(
            type="null",
            nullable=True,
            constraints={},
            samples=values
        )
    
    # Try to infer type
    inferred = infer_single_type(non_null_values[0])
    
    # Validate against all values
    for value in non_null_values:
        if not is_compatible(value, inferred):
            inferred = "string"  # Fall back to string for mixed types
    
    return InferredType(
        type=inferred,
        nullable=has_nulls,
        constraints=infer_constraints(non_null_values, inferred),
        samples=values
    )


def infer_single_type(value: Any) -> str:
    """Infer type for a single value."""
    if value is None:
        return "null"
    
    if isinstance(value, bool):
        return "boolean"
    
    if isinstance(value, (int, float)):
        return "number"
    
    if isinstance(value, str):
        return "string"
    
    if isinstance(value, (list, tuple)):
        return "array"
    
    if isinstance(value, dict):
        return "object"
    
    return "string"


def is_compatible(value: Any, target_type: str) -> bool:
    """Check if value is compatible with target type."""
    if value is None:
        return True
    
    if target_type == "boolean":
        return isinstance(value, bool)
    
    if target_type == "number":
        return isinstance(value, (int, float))
    
    if target_type == "string":
        return isinstance(value, str)
    
    if target_type == "array":
        return isinstance(value, (list, tuple))
    
    if target_type == "object":
        return isinstance(value, dict)
    
    return True
```

### Pattern 2: Nested Object Inference

Infer schemas for nested objects:

```python
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Property:
    name: str
    type_info: InferredType
    required: bool
    description: str = ""


@dataclass
class ObjectSchema:
    type: str = "object"
    properties: Dict[str, Property]
    required: List[str]


def infer_object_schema(objects: List[dict]) -> ObjectSchema:
    """Infer schema for nested objects."""
    if not objects:
        return ObjectSchema(properties={}, required=[])
    
    # Collect all keys
    all_keys = set()
    for obj in objects:
        all_keys.update(obj.keys())
    
    # Infer types for each key
    properties = {}
    for key in all_keys:
        values = [obj.get(key) for obj in objects]
        type_info = infer_primitive_type(values)
        
        # Check if key is required (present in all objects)
        required = all(key in obj for obj in objects)
        
        properties[key] = Property(
            name=key,
            type_info=type_info,
            required=required
        )
    
    required_keys = [k for k, p in properties.items() if p.required]
    
    return ObjectSchema(
        properties=properties,
        required=required_keys
    )


def infer_nested_schema(data: Any) -> Any:
    """Recursively infer schema for nested data."""
    if data is None:
        return {"type": "null", "nullable": True}
    
    if isinstance(data, bool):
        return {"type": "boolean"}
    
    if isinstance(data, (int, float)):
        return {"type": "number", "subtype": "integer" if isinstance(data, int) else "float"}
    
    if isinstance(data, str):
        return {"type": "string"}
    
    if isinstance(data, list):
        if not data:
            return {"type": "array", "items": {"type": "any"}}
        
        # Infer items type
        item_types = [infer_nested_schema(item) for item in data[:10]]  # Sample items
        
        # Find common type
        common_type = find_common_type(item_types)
        
        return {"type": "array", "items": common_type}
    
    if isinstance(data, dict):
        properties = {}
        required = []
        
        for key, value in data.items():
            properties[key] = infer_nested_schema(value)
            if value is not None:
                required.append(key)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    return {"type": "unknown"}
```

### Pattern 3: Constraint Inference

Infer validation constraints from data:

```python
from dataclasses import dataclass
from typing import List, Optional
import re


@dataclass
class Constraints:
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    pattern: Optional[str] = None
    enum: Optional[List[str]] = None
    unique: bool = False
    min_items: Optional[int] = None
    max_items: Optional[int] = None


def infer_constraints(values: List[Any], type_hint: str = None) -> Constraints:
    """Infer constraints from data samples."""
    constraints = Constraints()
    
    if not values:
        return constraints
    
    non_null_values = [v for v in values if v is not None]
    
    if not non_null_values:
        return constraints
    
    if type_hint == "string" or isinstance(non_null_values[0], str):
        constraints.min_length = min(len(str(v)) for v in non_null_values)
        constraints.max_length = max(len(str(v)) for v in non_null_values)
        
        # Check for pattern (email, URL, etc.)
        patterns = [
            (r'^[\w\.-]+@[\w\.-]+\.\w+$', 'email'),
            (r'^(https?://)?([\w\-]+\.)+[\w\-]+(/[\w\-./?%&=]*)?$', 'url'),
        ]
        for pattern, name in patterns:
            if all(re.match(pattern, str(v)) for v in non_null_values):
                constraints.pattern = pattern
                break
        
        # Check for enum (only if few unique values)
        unique_values = set(str(v) for v in non_null_values)
        if len(unique_values) <= 10 and len(unique_values) < len(non_null_values) * 0.5:
            constraints.enum = sorted(list(unique_values))
    
    elif type_hint == "number" or isinstance(non_null_values[0], (int, float)):
        constraints.minimum = min(non_null_values)
        constraints.maximum = max(non_null_values)
        
        # Check if all are integers
        if all(isinstance(v, int) for v in non_null_values):
            constraints.subtype = "integer"
    
    elif isinstance(non_null_values[0], list):
        constraints.min_items = min(len(v) for v in non_null_values)
        constraints.max_items = max(len(v) for v in non_null_values)
        
        # Check for unique arrays
        if all(len(set(v)) == len(v) for v in non_null_values):
            constraints.unique = True
    
    return constraints
```

### Pattern 4: Schema Validation

Validate data against inferred schema:

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ValidationError:
    field: str
    message: str
    value: Any
    expected_type: str


def validate_data(
    data: dict,
    schema: ObjectSchema
) -> List[ValidationError]:
    """Validate data against schema."""
    errors = []
    
    # Check required fields
    for field in schema.required:
        if field not in data:
            errors.append(ValidationError(
                field=field,
                message="Required field missing",
                value=None,
                expected_type="any"
            ))
    
    # Validate each field
    for field, prop in schema.properties.items():
        if field in data:
            value = data[field]
            type_info = prop.type_info
            
            # Type check
            if not is_valid_type(value, type_info.type, type_info.constraints):
                errors.append(ValidationError(
                    field=field,
                    message=f"Expected {type_info.type}",
                    value=value,
                    expected_type=type_info.type
                ))
            
            # Constraint checks
            if type_info.type == "string" and isinstance(value, str):
                if type_info.constraints.get("min_length") and len(value) < type_info.constraints["min_length"]:
                    errors.append(ValidationError(
                        field=field,
                        message="String too short",
                        value=value,
                        expected_type=f"min_length={type_info.constraints['min_length']}"
                    ))
                
                if type_info.constraints.get("max_length") and len(value) > type_info.constraints["max_length"]:
                    errors.append(ValidationError(
                        field=field,
                        message="String too long",
                        value=value,
                        expected_type=f"max_length={type_info.constraints['max_length']}"
                    ))
                
                if type_info.constraints.get("pattern") and not re.match(type_info.constraints["pattern"], value):
                    errors.append(ValidationError(
                        field=field,
                        message="Does not match pattern",
                        value=value,
                        expected_type=f"pattern={type_info.constraints['pattern']}"
                    ))
                
                if type_info.constraints.get("enum") and value not in type_info.constraints["enum"]:
                    errors.append(ValidationError(
                        field=field,
                        message="Invalid enum value",
                        value=value,
                        expected_type=f"enum={type_info.constraints['enum']}"
                    ))
            
            elif type_info.type == "number" and isinstance(value, (int, float)):
                if type_info.constraints.get("minimum") and value < type_info.constraints["minimum"]:
                    errors.append(ValidationError(
                        field=field,
                        message="Value below minimum",
                        value=value,
                        expected_type=f"minimum={type_info.constraints['minimum']}"
                    ))
                
                if type_info.constraints.get("maximum") and value > type_info.constraints["maximum"]:
                    errors.append(ValidationError(
                        field=field,
                        message="Value above maximum",
                        value=value,
                        expected_type=f"maximum={type_info.constraints['maximum']}"
                    ))
    
    return errors


def is_valid_type(value: Any, type_hint: str, constraints: dict) -> bool:
    """Check if value matches type hint."""
    if value is None:
        return constraints.get("nullable", False)
    
    if type_hint == "string":
        return isinstance(value, str)
    
    if type_hint == "number":
        return isinstance(value, (int, float))
    
    if type_hint == "boolean":
        return isinstance(value, bool)
    
    if type_hint == "array":
        return isinstance(value, (list, tuple))
    
    if type_hint == "object":
        return isinstance(value, dict)
    
    if type_hint == "null":
        return value is None
    
    return True
```

### Pattern 5: Schema Documentation Generator

Generate documentation for inferred schemas:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class SchemaDocumentation:
    title: str
    description: str
    schema: dict
    examples: List[dict]
    constraints: List[dict]


def generate_documentation(
    schema: ObjectSchema,
    sample_data: List[dict],
    title: str = "Data Schema Documentation",
    description: str = "Automatically generated schema documentation"
) -> SchemaDocumentation:
    """Generate human-readable schema documentation."""
    schema_dict = object_to_json_schema(schema)
    
    # Find good examples (valid, representative)
    examples = find_representative_examples(sample_data, schema, max_examples=3)
    
    return SchemaDocumentation(
        title=title,
        description=description,
        schema=schema_dict,
        examples=examples,
        constraints=collect_all_constraints(schema)
    )


def object_to_json_schema(schema: ObjectSchema) -> dict:
    """Convert schema to JSON Schema format."""
    properties = {}
    
    for name, prop in schema.properties.items():
        prop_schema = type_info_to_json_schema(prop.type_info)
        if prop.required:
            properties[name] = prop_schema
        else:
            properties[name] = prop_schema
            # Mark as optional
            properties[f"{name}_optional"] = {"anyOf": [prop_schema, {"type": "null"}]}
    
    result = {
        "type": "object",
        "properties": properties,
        "required": schema.required
    }
    
    return result


def type_info_to_json_schema(type_info: InferredType) -> dict:
    """Convert InferredType to JSON Schema."""
    schema = {"type": type_info.type}
    
    if type_info.constraints:
        for key, value in type_info.constraints.items():
            if key in ("min_length", "max_length", "minimum", "maximum", "pattern", "enum"):
                schema[key] = value
    
    if type_info.type == "array" and "items" in type_info.constraints:
        schema["items"] = {"type": type_info.constraints["items"]}
    
    return schema


def collect_all_constraints(schema: ObjectSchema) -> List[dict]:
    """Collect all constraints from schema."""
    constraints = []
    
    for name, prop in schema.properties.items():
        if prop.type_info.constraints:
            for constraint, value in prop.type_info.constraints.items():
                constraints.append({
                    "field": name,
                    "constraint": constraint,
                    "value": value
                })
    
    return constraints


def find_representative_examples(
    data: List[dict],
    schema: ObjectSchema,
    max_examples: int = 3
) -> List[dict]:
    """Find representative examples from data."""
    valid_examples = []
    
    for item in data:
        errors = validate_data(item, schema)
        if not errors:
            valid_examples.append(item)
            if len(valid_examples) >= max_examples:
                break
    
    return valid_examples[:max_examples]
```

---

## Common Patterns

### Pattern 1: Schema Comparison

Compare schemas for evolution tracking:

```python
def compare_schemas(
    old_schema: ObjectSchema,
    new_schema: ObjectSchema
) -> List[dict]:
    """Compare two schemas for changes."""
    changes = []
    
    old_props = {k: v for k, v in old_schema.properties.items()}
    new_props = {k: v for k, v in new_schema.properties.items()}
    
    # Check for removed fields
    for key in old_props:
        if key not in new_props:
            changes.append({
                "type": "removed",
                "field": key,
                "old_type": old_props[key].type_info.type
            })
    
    # Check for added fields
    for key in new_props:
        if key not in old_props:
            changes.append({
                "type": "added",
                "field": key,
                "new_type": new_props[key].type_info.type
            })
    
    # Check for type changes
    for key in old_props:
        if key in new_props:
            old_type = old_props[key].type_info.type
            new_type = new_props[key].type_info.type
            if old_type != new_type:
                changes.append({
                    "type": "type_change",
                    "field": key,
                    "old_type": old_type,
                    "new_type": new_type
                })
    
    return changes
```

### Pattern 2: Schema Union

Merge multiple schemas:

```python
def merge_schemas(schemas: List[ObjectSchema]) -> ObjectSchema:
    """Merge multiple schemas into a union schema."""
    if not schemas:
        return ObjectSchema(properties={}, required=[])
    
    all_keys = set()
    for schema in schemas:
        all_keys.update(schema.properties.keys())
    
    properties = {}
    for key in all_keys:
        types = []
        required = False
        
        for schema in schemas:
            if key in schema.properties:
                types.append(schema.properties[key].type_info.type)
                if schema.properties[key].required:
                    required = True
        
        # Use first type if all match, otherwise use union
        type_info = infer_union_type(types)
        
        properties[key] = Property(
            name=key,
            type_info=type_info,
            required=required
        )
    
    return ObjectSchema(properties=properties, required=[])
```

### Pattern 3: Schema Evolution

Track schema evolution over time:

```python
def track_schema_evolution(
    historical_schemas: List[ObjectSchema]
) -> dict:
    """Track schema evolution over time."""
    if not historical_schemas:
        return {"trend": "unknown", "changes": []}
    
    changes = []
    for i in range(1, len(historical_schemas)):
        diff = compare_schemas(historical_schemas[i-1], historical_schemas[i])
        changes.extend(diff)
    
    return {
        "total_changes": len(changes),
        "by_type": count_change_types(changes),
        "most_recent": historical_schemas[-1],
        "trend": determine_evolution_trend(changes)
    }
```

---

## Common Mistakes

### Mistake 1: Over-Inferencing

**Wrong:**
```python
# ❌ Inferring specific types when data is mixed
sample = ["hello", 123, true]
type_info = infer_primitive_type(sample)
# Would infer "string" and lose information
```

**Correct:**
```python
# ✅ Use union types for mixed data
sample = ["hello", 123, true]
type_info = infer_primitive_type(sample)
if multiple_types_detected(type_info.samples):
    type_info.type = "union"  # Use union type
```

### Mistake 2: Not Handling Nulls

**Wrong:**
```python
# ❌ Ignoring null values in type inference
type_info = infer_primitive_type(values)
# Nulls might be common, affecting nullable flag
```

**Correct:**
```python
# ✅ Properly handle nulls
non_nulls = [v for v in values if v is not None]
has_nulls = len(non_nulls) < len(values)
type_info.nullable = has_nulls
type_info = infer_primitive_type(non_nulls)
```

### Mistake 3: Not Validating Inferred Schema

**Wrong:**
```python
# ❌ Using inferred schema without validation
schema = infer_schema(sample_data)
data = load_new_data()
# No validation of schema against new data
```

**Correct:**
```python
# ✅ Validate inferred schema
schema = infer_schema(sample_data)
errors = validate_data(new_data, schema)
if errors:
    adjust_schema(schema, errors)
# Iterate to improve schema
```

### Mistake 4: Over-Constraining Schemas

**Wrong:**
```python
# ❌ Setting strict constraints from small sample
sample = ["value1", "value2", "value3"]
constraints = infer_constraints(sample)
constraints.enum = ["value1", "value2", "value3"]
# Too restrictive, may exclude valid values
```

**Correct:**
```python
# ✅ Use reasonable constraints
sample = ["value1", "value2", "value3"]
constraints = infer_constraints(sample)
# Check if enum is reasonable (few unique values)
if len(unique_values) <= 10:
    constraints.enum = sorted(unique_values)
else:
    constraints.enum = None  # Don't constrain
```

### Mistake 5: Not Tracking Evolution

**Wrong:**
```python
# ❌ Not tracking schema changes over time
schema_v1 = infer_schema(data_v1)
schema_v2 = infer_schema(data_v2)
# No way to know what changed between versions
```

**Correct:**
```python
# ✅ Track schema evolution
schema_v1 = infer_schema(data_v1)
schema_v2 = infer_schema(data_v2)
changes = compare_schemas(schema_v1, schema_v2)
record_evolution(changes)
# Maintain change history
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for data samples
- [ ] **Parsed State:** Raw data parsed into typed structures
- [ ] **Purity:** Inference functions are pure
- [ ] **Fail Loud:** Invalid data formats throw descriptive errors
- [ ] **Readability:** Schema documentation reads like specification

### Testing

- [ ] Unit tests for primitive type inference
- [ ] Integration tests for nested object inference
- [ ] Constraint inference tests
- [ ] Schema validation tests
- [ ] Documentation generation tests

### Security

- [ ] Data samples sanitized before analysis
- [ ] No arbitrary code execution in inference
- [ ] Schema access controlled
- [ ] Validation rules validated
- [ ] Example data anonymized

### Performance

- [ ] Efficient sampling for large datasets
- [ ] Concurrent inference for multiple fields
- [ ] Cached inference results
- [ ] Incremental schema updates
- [ ] Memory-efficient streaming for large data

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `data-quality-validator` | Validate data against schema |
| `resource-optimizer` | Optimize schema inference |
| `ci-cd-pipeline-analyzer` | Validate data pipeline schemas |
| `latency-analyzer` | Measure inference performance |
| `infra-drift-detector` | Track schema evolution |

### Core Dependencies

- **Inferencer:** Type and constraint inference
- **Validator:** Schema validation
- **Documenter:** Documentation generation
- **Comparator:** Schema comparison
- **Tracker:** Evolution tracking

### External Resources

- [JSON Schema Specification](https://json-schema.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)

---

## Implementation Tracking

### Agent Schema Inference Engine - Core Patterns

| Task | Status |
|------|--------|
| Primitive type inference | ✅ Complete |
| Nested object inference | ✅ Complete |
| Constraint inference | ✅ Complete |
| Schema validation | ✅ Complete |
| Documentation generator | ✅ Complete |
| Schema comparison | ✅ Complete |
| Schema merging | ✅ Complete |
| Evolution tracking | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Primitive type inference
- Nested object inference
- Constraint inference
- Schema validation
- Documentation generation

### 1.1.0 (Planned)
- JSON Schema generation
- CSV/schema inference
- API response schema inference
- Schema evolution tracking

### 2.0.0 (Future)
- ML-based type inference
- Auto-adjusting constraints
- Schema version management
- Cross-format support

---

## Implementation Prompt (Execution Layer)

When implementing the Schema Inference Engine skill, use this prompt for code generation:

```
Create a Schema Inference Engine implementation following these requirements:

1. Core Classes:
   - InferredType: Type with constraints and samples
   - Property: Object property definition
   - ObjectSchema: Complete object schema
   - ValidationError: Validation error details
   - SchemaDocumentation: Human-readable documentation

2. Key Methods:
   - infer_primitive_type(values): Inference for primitives
   - infer_object_schema(objects): Nested object schemas
   - infer_nested_schema(data): Recursive schema inference
   - infer_constraints(values, type_hint): Validation constraints
   - validate_data(data, schema): Data validation
   - is_valid_type(value, type_hint, constraints): Type checking
   - generate_documentation(schema, samples, title, desc): Documentation

3. Data Structures:
   - InferredType with type, nullable, constraints, samples
   - Property with name, type_info, required, description
   - ObjectSchema with properties and required fields
   - ValidationError with field, message, value, expected
   - Constraints with min/max, pattern, enum, unique flags

4. Inference Strategies:
   - Heuristic: Pattern-based inference
   - Statistical: Sample-based with probabilities
   - Hybrid: Combined approach
   - Iterative: Refine with validation

5. Configuration Options:
   - max_enum_values: Maximum for enum inference
   - min_sample_size: Minimum samples for inference
   - nullable_threshold: Null ratio for nullable flag
   - pattern_detection: Enable pattern inference
   - enum_detection: Enable enum inference

6. Output Features:
   - JSON Schema compatible output
   - Type definitions
   - Validation constraints
   - Documentation
   - Example data

7. Error Handling:
   - Empty data handling
   - Mixed type fallback
   - Partial inference
   - Graceful degradation
   - Comprehensive logging

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw data into typed structures
- Pure inference functions
- Fail fast on invalid data
- Clear names for all components
```
