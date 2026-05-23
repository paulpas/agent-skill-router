---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent network diagnostics with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: network-diagnostics, network diagnostics, how do i network-diagnostics,
    orchestrate network-diagnostics, automate network-diagnostics, agent network-diagnostics
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
name: network-diagnostics
------
# Network Diagnostics

Orchestrates intelligent skill selection and execution for network diagnostics workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_diagnostic_tool(
    target: str,
    available_tools: List[Dict],
    min_latency_threshold: float = 0.5
) -> Optional[Dict]:
    """Select optimal network diagnostic tool based on target type and constraints.
    
    Applies Law 2 (Parse at boundary) by validating target and tool metadata.
    Applies Law 1 (Early Exit) for invalid inputs or missing tools.
    Returns immutable tool selection with confidence scoring.
    
    Args:
        target: IP address or hostname to diagnose
        available_tools: List of diagnostic tool metadata (e.g., ping, traceroute, nmap)
        min_latency_threshold: Maximum acceptable baseline latency in seconds
        
    Returns:
        Selected tool dictionary or None if no tool meets threshold
    """
    # Law 1: Early exit on invalid input
    if not target or not isinstance(target, str):
        raise ValueError("Target must be a non-empty string")
    if not available_tools:
        raise ValueError("No diagnostic tools available for selection")
        
    # Law 2: Parse and validate at boundary
    is_ipv6 = ":" in target
    target_features = {
        "is_ip": _is_ip(target),
        "is_ipv6": is_ipv6,
        "target": target
    }
    
    best_tool = None
    best_score = 0.0
    
    for tool in available_tools:
        # Domain-specific scoring: match tool capabilities to target features
        score = _calculate_diagnostic_score(target_features, tool)
        
        if score > best_score and score >= min_latency_threshold:
            best_score = score
            best_tool = tool
            
    if best_tool is None:
        return None
        
    # Law 3: Atomic Predictability - Return new dict, don't mutate
    result = dict(best_tool)
    result["selection_confidence"] = best_score
    result["selection_timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_diagnostic_pipeline(
    tool: Dict,
    target: str,
    fallback_chain: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute network diagnostics with adaptive fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud):
    - Invalid states halt immediately with descriptive errors
    - No silent failures or partial results
    
    Fallback chain:
    1. Retry with adjusted parameters (e.g., increase timeout)
    2. Try alternative diagnostic tool from fallback_chain
    3. Defer to manual inspection (for critical infrastructure)
    
    Args:
        tool: Selected diagnostic tool metadata
        target: Hostname or IP to diagnose
        fallback_chain: List of alternative tools/methods
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, timing, confidence)
    """
    # Law 1: Guard clause - validate tool
    if not tool or not tool.get("executable"):
        raise ValueError(f"Invalid diagnostic tool: {tool.get('name', 'unknown')}")
        
    # Law 2: Parse context - Ensure trusted state
    validated_target = _validate_target_format(target)
    
    for attempt in range(max_retries + 1):
        try:
            # Domain-specific execution: run actual diagnostic command
            result = _run_diagnostic_command(tool["executable"], validated_target, tool.get("args", []))
            
            # Law 3: Atomic Predictability
            return {
                "success": True,
                "tool_executed": tool["name"],
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except subprocess.TimeoutExpired:
            # Transient error - try fallback
            if attempt == max_retries:
                return _apply_diagnostic_fallback(tool, validated_target, fallback_chain)
        except PermissionError as e:
            # Fail Fast - Don't try to patch bad permissions (Law 4)
            raise ValueError(f"Permission denied for {tool['name']}: {str(e)}") from e
            
    # All retries exhausted - Fail Loud (Law 4)
    raise RuntimeError(f"Failed to execute {tool['name']} after {max_retries + 1} attempts")
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