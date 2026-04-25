---
name: code-validation
description: Validates pipeline stages and returns config status strings (valid_config/invalid_config) using guard clauses and the 5 Laws of Elegant Defense
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: validation, code validation, pipeline validation, config status, input validation, validate pipeline, pipeline stages
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-error-handling, m0-foundation
---

# Pipeline Stage Validator

Validates pipeline stages against allowed configuration and returns 'valid_config' if all stages are in the allowed set, or 'invalid_config' otherwise.

## When to Use

- Validating pipeline stages against allowed configurations (e.g., build, test, deploy, notify)
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

### Pattern 3: Case-Insensitive Pipeline Validation

Handles validation where case should be ignored for pipeline stages.

```python
def validate_pipeline_case_insensitive(stages: list[str]) -> str:
    """Validate pipeline stages with case-insensitive matching."""
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    if not stages:
        return "valid_config"
    
    allowed_lower = {s.lower() for s in ALLOWED_STAGES}
    invalid = [stage for stage in stages if stage.lower() not in allowed_lower]
    if invalid:
        return "invalid_config"
    
    return "valid_config"
```

### Pattern 4: Pipeline Stage Validation Core Pattern

Validates pipeline stages and returns a configuration status string. Follows the 5 Laws of Elegant Defense.

```python
def validate_pipeline(stages: list[str]) -> str:
    """Validate pipeline stages and return config status.
    
    Returns "valid_config" if all stages are valid, "invalid_config" otherwise.
    """
    ALLOWED_STAGES = {"build", "test", "deploy", "notify"}
    
    # Guard clause: empty list is valid (no stages to validate)
    if not stages:
        return "valid_config"
    
    # Parse: identify invalid stages at boundary
    invalid = [stage for stage in stages if stage not in ALLOWED_STAGES]
    
    # Fail Fast: return invalid_config immediately if any invalid stages found
    if invalid:
        return "invalid_config"
    
    # Atomic Predictability: pure function, same input always yields same output
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
- Use guard clauses for early return on edge cases
- Use Sets for O(1) lookup performance
- Keep ALLOWED_STAGES constant at the top of the function

### MUST NOT DO
- Raise exceptions for invalid stages (return "invalid_config" instead)
- Mutate input or use hidden state
- Use list lookup for allowed set (use Sets)
- Hardcode allowed values deep in logic

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-error-handling` | Complementary skill for designing descriptive error messages and failure modes |
| `m0-foundation` | APEX Trading Platform foundation patterns including the 5 Laws of Elegant Defense |
