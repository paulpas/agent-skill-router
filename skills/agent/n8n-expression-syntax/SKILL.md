---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent n8n expression syntax with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: n8n-expression-syntax, n8n expression syntax, how do i n8n-expression-syntax,
    orchestrate n8n-expression-syntax, automate n8n-expression-syntax, agent n8n-expression-syntax
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  version: 1.0.0
name: n8n-expression-syntax
------
# N8N Expression Syntax

Orchestrates intelligent skill selection and execution for n8n expression syntax workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def parse_n8n_expression(
    expression: str,
    available_context: Dict[str, Any],
    strict_mode: bool = True
) -> Dict[str, Any]:
    """Parse and validate an n8n expression string.
    
    Handles n8n-specific syntax: {{ $json.field }}, {{ $node['NodeName'].json.field }},
    {{ $now }}, {{ $item('data', 0).id }}, and arithmetic/logic operations.
    
    Args:
        expression: Raw n8n expression string (e.g., "{{ $json.status == 'active' }}")
        available_context: Current workflow context (nodes, items, parameters)
        strict_mode: If True, raises on undefined paths; if False, returns None for missing
        
    Returns:
        Parsed AST-like dict with tokens, resolved values, and validation status
        
    Raises:
        ValueError: If expression is empty or malformed
    """
    # Guard clause - Early Exit (Law 1)
    if not expression or not expression.strip():
        raise ValueError("Expression cannot be empty")
        
    # Extract expression body from {{ }} delimiters
    match = re.match(r'^\{\{\s*(.+?)\s*\}\}$', expression.strip())
    if not match:
        raise ValueError("Invalid n8n expression format: missing {{ }} delimiters")
        
    inner_expr = match.group(1)
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    tokens = _tokenize_n8n_expression(inner_expr)
    resolved = _resolve_n8n_tokens(tokens, available_context, strict_mode)
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate context
    result = {
        "original": expression,
        "parsed_tokens": tokens,
        "resolved_value": resolved,
        "is_valid": True,
        "strict_mode": strict_mode,
        "timestamp": time.time()
    }
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_n8n_expression(
    parsed_expr: Dict[str, Any],
    workflow_context: Dict[str, Any],
    fallback_strategy: str = "default"
) -> Dict[str, Any]:
    """Execute a validated n8n expression with fallback handling.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid node references halt immediately with descriptive errors
    - Missing fields return None or configured default instead of crashing
    
    Fallback chain:
    1. Retry with expanded context (if node data is still loading)
    2. Try alternative expression path (if primary path fails)
    3. Defer to static value or error string (for critical workflows)
    
    Args:
        parsed_expr: Output from parse_n8n_expression
        workflow_context: Full workflow state including all node outputs
        fallback_strategy: 'default', 'retry', 'static', or 'error'
        
    Returns:
        Execution result with metadata (success, timing, resolved_value)
        
    Raises:
        ValueError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate parsed expression (Early Exit)
    if not parsed_expr.get("is_valid"):
        raise ValueError(f"Cannot execute invalid expression: {parsed_expr.get('original')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_context = _normalize_workflow_context(workflow_context)
    
    attempts = 0
    max_attempts = 2 if fallback_strategy == "retry" else 1
    
    for attempt in range(max_attempts):
        try:
            result = _evaluate_n8n_ast(parsed_expr["parsed_tokens"], validated_context)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "expression": parsed_expr["original"],
                "resolved_value": result,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency(),
                "fallback_used": False
            }
            
        except UndefinedPathError as e:
            # Fail Fast - Don't try to patch bad data (Law 4)
            if fallback_strategy == "static":
                return {"success": True, "resolved_value": None, "fallback_used": True}
            raise ValueError(f"Undefined path in expression: {str(e)}") from e
            
        except ContextLoadingError as e:
            # Transient error - try fallback
            if attempt == max_attempts - 1:
                return {"success": False, "error": str(e), "fallback_used": True}
    
    # All retries exhausted - Fail Loud (Law 4)
    raise ValueError(f"Failed to resolve expression after {max_attempts} attempts")
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [n8n Expression Language Documentation](<https://docs.n8n.io/integrations/builtin/reference/expression-language/>)
- [n8n Function Item Expressions](<https://docs.n8n.io/code/expression-language/>)
- [n8n Date and Time Functions](<https://docs.n8n.io/integrations/builtin/reference/date-functions/>)
- [JQ Query Language for Data Transformation](<https://jqlang.github.io/jq/manual/>)
- [n8n Conditional Logic with Expressions](<https://docs.n8n.io/workflows/expressions/>)
