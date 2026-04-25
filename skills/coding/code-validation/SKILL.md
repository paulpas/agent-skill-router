---
name: validation
description: Validates pipeline stages and returns config status strings (valid_config/invalid_config)
  using guard clauses and the 5 Laws of Elegant Defense, returning invalid_config
  for invalid input types instead of raising exceptions
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: validation, code validation, pipeline validation, config status, input
    validation, validate pipeline, pipeline stages
  role: implementation
  scope: implementation
  output-format: code
  related-skills: error-handling, m0-foundation
---


# Pipeline Stage Validator

Validates pipeline stages against allowed configuration and returns 'valid_config' if all stages are in the allowed set, or 'invalid_config' otherwise.

## When to Use

- Validating pipeline stages against allowed configurations (e.g., build, test, deploy, notify)
- Validating environment-specific stages (e.g., dev: build, test, lint vs prod: build, test, security-scan, deploy)
- Checking user roles against a whitelist of permitted roles
- Verifying environment names against allowed deployment targets
- Ensuring configuration values match expected options

## When NOT to Use

- Single value validation — use direct comparison or type checking instead
- Dynamic allowed sets that change at runtime — consider a more flexible validation strategy
- Complex nested data structures — use dedicated schema validation (e.g., JSON schema)

---

## Core Workflow

1. **Parse Input** — Accept the list of strings and allowed set as parameters. Use Sets for O(1) lookup.
2. **Guard Clause** — Return early if input list is empty (nothing to validate).
3. **Find Invalid Items** — Identify which items are not in the allowed set.
4. **Fail Fast** — Return "invalid_config" immediately if invalid items exist.
5. **Return Valid Config** — Return "valid_config" if validation passes.

---

## Implementation Patterns

### Pattern 1: Basic Pipeline Validation with Loop

Validates pipeline stages against a fixed set of allowed stages using a guard clause and early exit. This pattern uses a loop with immediate return on first invalid item.

```python
def validate_pipeline(stages: list[str]) -> str:
    """Validate pipeline stages and return config status.
    
    Returns "valid_config" if all stages are in allowed set, "invalid_config" otherwise.
    """
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    # Guard clause: empty list is valid (nothing to validate)
    if not stages:
        return "valid_config"
    
    # Early exit: return immediately on first invalid stage
    for stage in stages:
        if stage not in ALLOWED_STAGES:
            return "invalid_config"
    
    return "valid_config"
```

| ❌ BAD | ✅ GOOD |
|--------|---------|
| Uses list for allowed set (`["build", "test", ...]`) | Uses set for O(1) lookup (`{"build", "test", ...}`) |
| No guard clause for empty list | Returns "valid_config" for empty list |
| Missing type hints | Explicit return type annotation (`-> str`) |
| Loop continues after finding invalid (late return) | Early return on first invalid stage |

### Pattern 2: Pipeline Stage Validation with Config Status

Similar to Pattern 1 but uses list comprehension for filtering invalid stages, then checks if any remain. Demonstrates an alternative style while maintaining guard clause and early return.

**Performance Note:** This pattern always iterates through all stages to build the `invalid` list (even if the first item is invalid), which is less efficient than Pattern 1's early return approach. Use Pattern 1 when performance is critical and you expect early invalid items.

```python
def validate_pipeline_comprehension(stages: list[str]) -> str:
    """Validate pipeline stages using list comprehension for filtering.
    
    Returns "valid_config" if all stages are in allowed set, "invalid_config" otherwise.
    """
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    # Guard clause: empty list is valid (nothing to validate)
    if not stages:
        return "valid_config"
    
    # Parse: identify all invalid stages at boundary
    invalid = [stage for stage in stages if stage not in ALLOWED_STAGES]
    
    # Fail Fast: return invalid_config immediately if any invalid stages found
    if invalid:
        return "invalid_config"
    
    return "valid_config"
```

### Pattern 3: Case-Insensitive Pipeline Validation

Handles validation where case should be ignored for pipeline stages. The `allowed_lower` set comprehension creates a lowercase set for O(1) lookup performance.

```python
def validate_pipeline_case_insensitive(stages: list[str]) -> str:
    """Validate pipeline stages with case-insensitive matching."""
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    if not stages:
        return "valid_config"
    
    # Parse: create lowercase set for O(1) lookup (comprehension creates set, not list)
    allowed_lower = {s.lower() for s in ALLOWED_STAGES}
    # Check each stage: O(1) lookup in set
    for stage in stages:
        if stage.lower() not in allowed_lower:
            return "invalid_config"
    
    return "valid_config"
```

### Pattern 4: Pipeline Stage Validation with Input Validation

Validates pipeline stages with explicit type checking at function entry. This pattern demonstrates the 5 Laws of Elegant Defense with Parse Don't Validate principle. **Note:** Returns "invalid_config" for invalid input rather than raising exceptions, following the "Fail Fast" law with graceful degradation.

```python
from typing import Any

def validate_pipeline_strict(stages: Any) -> str:
    """Validate pipeline stages with input validation and early exit.
    
    Returns "valid_config" if all stages are valid, "invalid_config" otherwise.
    Handles any input type gracefully, returning "invalid_config" for non-list or non-string items.
    
    Args:
        stages: Pipeline stages to validate (any type handled gracefully)
        
    Returns:
        "valid_config" if all stages are in allowed set or list is empty,
        "invalid_config" if input is invalid or contains invalid stages
    """
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    # Parse: validate input type at boundary (Parse, Don't Validate)
    # If input is not a list, return invalid_config instead of raising exception
    if not isinstance(stages, list):
        return "invalid_config"
    
    # Guard clause: empty list is valid (nothing to validate)
    if not stages:
        return "valid_config"
    
    # Parse: identify non-string items at boundary
    for i, stage in enumerate(stages):
        if not isinstance(stage, str):
            return "invalid_config"
    
    # Parse: identify invalid stages at boundary
    for stage in stages:
        if stage not in ALLOWED_STAGES:
            return "invalid_config"
    
    # Atomic Predictability: pure function, same input always yields same output
    return "valid_config"
```

### Pattern 5: None Handling with Explicit Guard Clauses

Demonstrates how to handle None input explicitly with clear guard clauses. This pattern shows how to gracefully handle common edge cases without raising exceptions. **Note:** Type checking is split into a separate condition to avoid TypeError when checking `stage not in ALLOWED_STAGES` on non-string items.

```python
def validate_pipeline_with_none_handling(stages: list[str] | None) -> str:
    """Validate pipeline stages with explicit None handling.
    
    Returns "valid_config" if all stages are valid, "invalid_config" otherwise.
    
    Args:
        stages: Optional list of pipeline stage names (None treated as empty list)
        
    Returns:
        "valid_config" if stages is None, empty, or all stages valid,
        "invalid_config" if any stage is not in allowed set
    """
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    # Guard clause: None or empty list both return valid_config (nothing to validate)
    if stages is None or not stages:
        return "valid_config"
    
    # Parse: identify invalid stages at boundary (separate type check to avoid TypeError)
    for stage in stages:
        if not isinstance(stage, str):
            return "invalid_config"
        if stage not in ALLOWED_STAGES:
            return "invalid_config"
    
    return "valid_config"
```

---

## Output Template

The function must return exactly one of two status strings:

| Condition | Return Value | Description |
|---|---|---|
| All stages in the input list are valid (empty list or all in allowed set) | `"valid_config"` | Pipeline configuration is valid |
| Any stage is not in the allowed set | `"invalid_config"` | Pipeline configuration contains invalid stages |

---

## Constraints

### MUST DO
- Return "valid_config" for valid pipeline stages (empty list or all in allowed set)
- Return "invalid_config" for any invalid stages found
- Use guard clauses for early return on edge cases (empty list, invalid input type, non-string items)
- Use Sets for O(1) lookup performance
- Keep ALLOWED_STAGES constant at the top of the function
- Validate input types at function entry when using Parse, Don't Validate approach
- Check each stage is a string and return "invalid_config" if non-string items are found

### MUST NOT DO
- Raise exceptions for invalid stages (return "invalid_config" instead for validation errors)
- Mutate input or use hidden state
- Use list lookup for allowed set (use Sets)
- Hardcode allowed values deep in logic
- Process non-string items in the stages list

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-error-handling` | Complementary skill for designing descriptive error messages and failure modes |
| `m0-foundation` | APEX Trading Platform foundation patterns including the 5 Laws of Elegant Defense |

---

> **Note:** These examples should be used as constants passed to a parameterized function. For production use, define these as configurable constants and pass them as parameters to validation functions.

## Environment-Specific Configuration Examples

### Default Pipeline Stages

```python
DEFAULT_ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
```

### Development Environment

```python
DEV_ALLOWED_STAGES = {"build", "test", "lint", "type-check"}
```

### Production Environment

```python
PROD_ALLOWED_STAGES = {"build", "test", "security-scan", "deploy", "notify"}
```

### Staging Environment

```python
STAGING_ALLOWED_STAGES = {"build", "test", "deploy", "smoke-test", "notify"}
```

---

## Config Status Constants

| Status | Meaning | Operational Impact |
|---|---|---|
| `"valid_config"` | All stages are in the allowed set | Pipeline proceeds to next stage |
| `"invalid_config"` | At least one stage is not allowed | Pipeline halts, error logged |
