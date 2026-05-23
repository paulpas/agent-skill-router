---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent memory systems with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: memory-systems, memory systems, how do i memory-systems, orchestrate memory-systems,
    automate memory-systems, agent memory-systems
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
name: memory-systems
------
# Memory Systems

Orchestrates intelligent skill selection and execution for memory systems workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_memory_retrieval_strategy(
    query: str,
    available_strategies: List[Dict],
    context_window_limit: int = 4096,
    min_relevance: float = 0.75
) -> Optional[Dict]:
    """Select optimal memory retrieval strategy based on query characteristics.
    
    Evaluates semantic, keyword, and temporal retrieval methods against
    current context window constraints and historical retrieval accuracy.
    
    Args:
        query: User prompt or system instruction requiring memory context
        available_strategies: List of memory retrieval strategy configs
        context_window_limit: Max tokens allowed for retrieved context
        min_relevance: Minimum vector similarity threshold
        
    Returns:
        Selected strategy dict with execution parameters or None
    """
    # Guard clause - Early Exit (Law 1)
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")
        
    if not available_strategies:
        raise ValueError("No memory retrieval strategies configured")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    query_tokens = len(query.split())
    
    best_strategy = None
    best_score = 0.0
    
    for strategy in available_strategies:
        # Multi-factor scoring: semantic match, temporal relevance, window fit
        semantic_score = _compute_vector_similarity(query, strategy.get("index_id"))
        temporal_score = _assess_temporal_relevance(query, strategy.get("time_window"))
        window_fit = 1.0 - (query_tokens / context_window_limit) if context_window_limit > 0 else 0.0
        
        composite = (semantic_score * 0.5) + (temporal_score * 0.3) + (window_fit * 0.2)
        
        if composite > best_score and composite >= min_relevance:
            best_score = composite
            best_strategy = strategy
    
    if best_strategy is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_strategy)
    result["selected_relevance"] = best_score
    result["estimated_tokens"] = query_tokens
    result["strategy_timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_memory_retrieval(
    strategy: Dict,
    query: str,
    max_fallbacks: int = 2
) -> Dict:
    """Execute memory retrieval with domain-specific fallback chain.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid states halt immediately with descriptive errors
    - Graceful degradation through memory retrieval fallbacks
    
    Fallback chain:
    1. Primary vector search
    2. Fallback to keyword/BM25 search
    3. Fallback to recent context window
    4. Return empty context with warning if all fail
    
    Args:
        strategy: Selected memory retrieval configuration
        query: Search query
        max_fallbacks: Maximum fallback attempts before giving up
        
    Returns:
        Retrieval result with context chunks, confidence, and fallback metadata
    """
    # Guard clause - validate strategy (Early Exit)
    if not strategy.get("index_id"):
        raise MemoryRetrievalError("Strategy missing required index_id")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_strategy = _normalize_strategy_config(strategy)
    
    fallback_chain = [
        ("vector_search", _vector_search),
        ("keyword_search", _keyword_search),
        ("recent_context", _recent_context_window)
    ]
    
    current_idx = 0
    attempts = 0
    
    while current_idx < len(fallback_chain) and attempts <= max_fallbacks:
        method_name, method_fn = fallback_chain[current_idx]
        try:
            results = method_fn(query, validated_strategy)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "method_used": method_name,
                "context_chunks": results,
                "confidence": _calculate_context_confidence(results),
                "fallbacks_used": attempts,
                "latency_ms": time.time() * 1000
            }
            
        except VectorIndexError as e:
            # Fail Fast - Index unavailable, move to next fallback (Law 4)
            current_idx += 1
            attempts += 1
            continue
            
        except ContextWindowExceededError as e:
            # Transient constraint - adjust parameters and retry
            validated_strategy["max_chunks"] = validated_strategy.get("max_chunks", 5) // 2
            attempts += 1
            continue
    
    # All fallbacks exhausted - Fail Loud (Law 4)
    return {
        "success": False,
        "method_used": fallback_chain[-1][0] if fallback_chain else "none",
        "context_chunks": [],
        "confidence": 0.0,
        "fallbacks_used": attempts,
        "error": "Memory retrieval exhausted all fallback strategies"
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