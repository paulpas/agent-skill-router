---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conversation memory with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conversation-memory, conversation memory, how do i conversation-memory,
    orchestrate conversation-memory, automate conversation-memory, agent conversation-memory
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
name: conversation-memory
------
# Conversation Memory

Orchestrates intelligent skill selection and execution for conversation memory workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def score_and_select_memory_context(
    current_query: str,
    conversation_history: List[Dict],
    max_context_turns: int = 10,
    relevance_threshold: float = 0.65
) -> List[Dict]:
    """Score conversation history turns against the current query.
    
    Implements multi-factor scoring for memory retrieval:
    - Semantic similarity between query and past turns
    - Recency weighting (Law 1: Early Exit for empty history)
    - Entity overlap and constraint matching
    
    Args:
        current_query: The active user prompt requiring context
        conversation_history: List of past message dicts with 'role', 'content', 'timestamp'
        max_context_turns: Maximum turns to include in context window
        relevance_threshold: Minimum semantic score to include a turn
        
    Returns:
        Filtered and sorted list of relevant conversation turns
    """
    # Guard clause - Early Exit (Law 1)
    if not current_query or not conversation_history:
        return []
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    parsed_query = _normalize_text(current_query)
    scored_turns = []
    
    for turn in conversation_history:
        # Calculate semantic similarity using embedding model
        similarity = _compute_embedding_similarity(parsed_query, turn["content"])
        
        # Apply recency decay and entity overlap bonus
        recency_score = _calculate_recency_weight(turn["timestamp"])
        entity_overlap = _count_shared_entities(parsed_query, turn["content"])
        
        composite_score = (similarity * 0.6) + (recency_score * 0.25) + (entity_overlap * 0.15)
        
        if composite_score >= relevance_threshold:
            scored_turns.append({
                "turn": turn,
                "relevance_score": composite_score,
                "factors": {"similarity": similarity, "recency": recency_score, "overlap": entity_overlap}
            })
    
    # Atomic Predictability (Law 3) - Return new sorted list, never mutate history
    scored_turns.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored_turns[:max_context_turns]
```


### Pattern 2: Execution with Fallback

```python
def execute_memory_orchestration(
    selected_context: List[Dict],
    current_query: str,
    memory_store: MemoryBackend,
    fallback_strategy: str = "recent_history"
) -> Dict:
    """Execute memory retrieval with fallback chain for resilience.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid memory states halt immediately with descriptive errors
    - No silent context assembly failures
    
    Fallback chain:
    1. Retrieve from vector store with semantic search
    2. Fallback to recent chronological history
    3. Defer to default system prompt with minimal context
    
    Args:
        selected_context: Pre-scored memory turns from Pattern 1
        current_query: Active prompt requiring context
        memory_store: Initialized memory backend instance
        fallback_strategy: Fallback mode when primary retrieval fails
        
    Returns:
        Execution result with assembled context, timing, and confidence metadata
    """
    # Guard clause - validate memory store (Early Exit)
    if not memory_store or not memory_store.is_healthy():
        raise MemoryOrchestrationError("Memory backend is unavailable or unhealthy")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_context = _assemble_context_payload(selected_context, current_query)
    
    try:
        # Primary execution - Semantic memory retrieval
        retrieved_memory = memory_store.query_context(validated_context)
        
        # Success - Atomic Predictability (Law 3)
        return {
            "success": True,
            "context_turns": len(retrieved_memory),
            "assembled_context": retrieved_memory,
            "confidence": _calculate_context_confidence(retrieved_memory),
            "latency_ms": _measure_execution_time()
        }
        
    except MemoryStoreTimeoutError as e:
        # Fail Fast - Don't retry indefinitely (Law 4)
        if fallback_strategy == "recent_history":
            return _apply_recent_history_fallback(memory_store, current_query)
        raise MemoryOrchestrationError(f"Primary memory retrieval failed: {str(e)}") from e
        
    except ContextAssemblyError as e:
        # Invalid state - halt immediately (Law 4)
        raise MemoryOrchestrationError(f"Context assembly failed: {str(e)}") from e
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