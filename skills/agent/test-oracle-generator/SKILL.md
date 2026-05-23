---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent test oracle generator with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: test-oracle-generator, test oracle generator, how do i test-oracle-generator,
    orchestrate test-oracle-generator, automate test-oracle-generator, agent test-oracle-generator,
    enterprise database, oracle
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
name: test-oracle-generator
------
# Test Oracle Generator

Orchestrates intelligent skill selection and execution for test oracle generator workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_oracle_strategy(
    code_context: Dict[str, Any],
    available_strategies: List[Dict],
    min_oracle_confidence: float = 0.75
) -> Optional[Dict]:
    """Select the optimal oracle generation strategy for a given code context.
    
    Scores strategies based on:
    - Language/framework compatibility
    - Historical oracle accuracy for similar code patterns
    - Current test coverage gaps
    - Computational cost vs. precision tradeoff
    
    Args:
        code_context: Parsed AST, function signatures, and dependency graph
        available_strategies: List of oracle generation strategy metadata
        min_oracle_confidence: Minimum confidence threshold for selection
        
    Returns:
        Selected strategy dict with scoring metadata, or None
    """
    if not code_context.get("source_code") or not available_strategies:
        raise ValueError("Missing source code or available strategies")
        
    # Extract code features for scoring
    code_features = _extract_code_features(code_context)
    best_strategy = None
    best_score = 0.0
    
    for strategy in available_strategies:
        # Calculate multi-factor score
        lang_match = 1.0 if strategy["supported_languages"] & code_features["languages"] else 0.0
        history_score = strategy.get("historical_accuracy", 0.0)
        coverage_gap_score = _calculate_coverage_gap_impact(code_features["coverage_map"])
        
        composite_score = (0.4 * lang_match) + (0.4 * history_score) + (0.2 * coverage_gap_score)
        
        if composite_score > best_score and composite_score >= min_oracle_confidence:
            best_score = composite_score
            best_strategy = strategy
            
    if best_strategy is None:
        return None
        
    # Return immutable result with scoring metadata
    return {
        "strategy": best_strategy["name"],
        "score": best_score,
        "timestamp": time.time(),
        "code_features_hash": hashlib.md5(json.dumps(code_features, sort_keys=True).encode()).hexdigest()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_oracle_generation(
    strategy: Dict,
    test_context: Dict[str, Any],
    max_fallback_attempts: int = 2
) -> Dict[str, Any]:
    """Execute oracle generation with adaptive fallback chain.
    
    Implements the 5 Laws of Elegant Defense:
    - Fails fast on invalid test context
    - Validates generated oracles against static analysis
    - Returns new oracle structures without mutating inputs
    - Logs full execution trace for auditability
    
    Fallback chain:
    1. Retry with adjusted precision parameters
    2. Switch to alternative strategy (e.g., LLM -> Property-Based)
    3. Defer to human reviewer if confidence < 0.6
    
    Args:
        strategy: Selected oracle generation strategy metadata
        test_context: Test inputs, expected behavior specs, and environment config
        max_fallback_attempts: Maximum fallback transitions before escalation
        
    Returns:
        Oracle generation result with assertions, confidence score, and trace
    """
    if not _validate_test_context(test_context):
        raise OracleGenerationError("Invalid test context: missing inputs or specs")
        
    current_strategy = strategy
    fallback_chain = strategy.get("fallback_strategies", [])
    
    for attempt in range(max_fallback_attempts + 1):
        try:
            # Execute the selected oracle generation pipeline
            raw_oracles = _run_oracle_pipeline(current_strategy, test_context)
            
            # Validate oracles against static analysis baseline
            validated_oracles = _validate_oracle_integrity(raw_oracles, test_context)
            confidence = _calculate_oracle_confidence(validated_oracles)
            
            if confidence >= strategy.get("min_confidence_threshold", 0.7):
                return {
                    "status": "success",
                    "oracles": validated_oracles,
                    "confidence": confidence,
                    "strategy_used": current_strategy["name"],
                    "attempts": attempt + 1,
                    "trace_id": generate_trace_id()
                }
                
            # Low confidence - trigger fallback
            if attempt < max_fallback_attempts and fallback_chain:
                current_strategy = fallback_chain.pop(0)
                continue
                
        except OracleValidationFailedError as e:
            raise OracleGenerationError(f"Oracle validation failed: {e}") from e
            
    # All fallbacks exhausted - escalate to human review
    return {
        "status": "deferred",
        "reason": "Low confidence oracles after all fallbacks",
        "oracles": validated_oracles if 'validated_oracles' in locals() else [],
        "confidence": confidence if 'confidence' in locals() else 0.0,
        "requires_human_review": True,
        "trace_id": generate_trace_id()
    }
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