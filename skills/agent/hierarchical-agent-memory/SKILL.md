---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent hierarchical agent memory with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: hierarchical-agent-memory, hierarchical agent memory, how do i hierarchical-agent-memory,
    orchestrate hierarchical-agent-memory, automate hierarchical-agent-memory, agent
    hierarchical-agent-memory
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
name: hierarchical-agent-memory
------
# Hierarchical Agent Memory

Orchestrates intelligent skill selection and execution for hierarchical agent memory workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_memory_layer(
    query: str,
    agent_state: Dict[str, Any],
    memory_store: MemoryBackend,
    min_relevance: float = 0.65
) -> Optional[MemoryChunk]:
    """Select the optimal memory layer for a given query based on hierarchical scoring.
    
    Evaluates short-term buffer, long-term vector store, and episodic cache using:
    - Semantic similarity to query
    - Temporal decay factor (recency weighting)
    - Agent confidence in stored context
    - Cross-layer consistency checks
    
    Args:
        query: User or agent query string
        agent_state: Current agent context including confidence scores and active tasks
        memory_store: Backend interface for hierarchical memory access
        min_relevance: Minimum relevance threshold for selection
        
    Returns:
        Selected MemoryChunk with metadata, or None if below threshold
    """
    # Law 1: Early exit on invalid state
    if not query or not isinstance(query, str):
        raise ValueError("Query must be a non-empty string")
    if not memory_store.is_healthy():
        raise MemoryUnavailableError("Memory backend is currently unavailable")
        
    # Law 2: Parse & validate inputs immutably
    parsed_query = _normalize_query(query)
    temporal_weight = _calculate_recency_decay(agent_state.get("session_start"))
    
    candidates = []
    for layer in ["short_term", "long_term", "episodic"]:
        if not memory_store.has_layer(layer):
            continue
            
        raw_results = memory_store.search(layer, parsed_query, top_k=3)
        for chunk in raw_results:
            relevance = _compute_multi_factor_score(
                semantic=_embed_similarity(parsed_query, chunk.text),
                temporal=temporal_weight * chunk.timestamp_weight,
                confidence=agent_state.get("memory_confidence", 0.8)
            )
            if relevance >= min_relevance:
                candidates.append({
                    "chunk": chunk,
                    "layer": layer,
                    "score": relevance,
                    "source_trace": f"{layer}:{chunk.id}"
                })
                
    if not candidates:
        return None
        
    # Law 3: Return new structure, never mutate agent_state
    best = max(candidates, key=lambda x: x["score"])
    return {
        "selected_layer": best["layer"],
        "memory_chunk": best["chunk"],
        "relevance_score": best["score"],
        "selection_context": {
            "query_hash": hashlib.md5(parsed_query.encode()).hexdigest(),
            "timestamp": time.time(),
            "fallback_eligible": len(candidates) > 1
        }
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_memory_retrieval(
    selected_memory: Dict[str, Any],
    agent_context: Dict[str, Any],
    fallback_strategy: str = "cascade"
) -> Dict[str, Any]:
    """Execute memory retrieval with a structured fallback chain for hierarchical systems.
    
    Implements resilient memory access:
    1. Direct layer retrieval (primary)
    2. Cross-layer semantic expansion (secondary)
    3. Default context window fallback (tertiary)
    4. Explicit error state with audit logging (final)
    
    Args:
        selected_memory: Output from select_memory_layer
        agent_context: Full agent state including task history and constraints
        fallback_strategy: Routing strategy for degraded states
        
    Returns:
        Enriched context dictionary with retrieved memory and execution metadata
    """
    # Law 1: Guard clause for required fields
    required_keys = {"selected_layer", "memory_chunk", "relevance_score"}
    if not required_keys.issubset(selected_memory.keys()):
        raise MemoryRetrievalError("Incomplete memory selection metadata")
        
    layer = selected_memory["selected_layer"]
    chunk = selected_memory["memory_chunk"]
    
    # Law 4: Fail fast on corrupted or inaccessible memory
    if not _validate_memory_integrity(chunk):
        raise CorruptedMemoryError(f"Memory chunk {chunk.id} failed integrity check")
        
    try:
        # Primary execution: Fetch full context from selected layer
        enriched_context = _merge_memory_into_context(chunk, agent_context)
        
        # Law 3: Return immutable result
        return {
            "status": "success",
            "layer_used": layer,
            "context": enriched_context,
            "metadata": {
                "latency_ms": time.time() * 1000,
                "confidence_boost": selected_memory["relevance_score"] * 0.15,
                "audit_id": uuid4().hex
            }
        }
        
    except MemoryTimeoutError:
        # Fallback 1: Cascade to alternative layer
        if fallback_strategy == "cascade":
            alt_layer = _select_alternative_layer(layer)
            alt_chunk = _fetch_from_layer(alt_layer, chunk.query_hash)
            if alt_chunk:
                return execute_memory_retrieval({
                    "selected_layer": alt_layer,
                    "memory_chunk": alt_chunk,
                    "relevance_score": 0.5
                }, agent_context, "cascade")
                
    except MemoryAccessDeniedError:
        # Fallback 2: Use default context window
        return {
            "status": "fallback",
            "layer_used": "default_context",
            "context": _load_default_context(agent_context),
            "metadata": {
                "latency_ms": time.time() * 1000,
                "confidence_boost": 0.0,
                "audit_id": uuid4().hex,
                "reason": "access_denied"
            }
        }
        
    # Law 4: Fail loud with full context
    raise MemoryRetrievalError(
        f"Failed to retrieve memory for layer {layer} after fallback attempts"
    )
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
|---|---|
| `agent-memory-systems` | Broader memory architectures including vector stores and retrieval strategies |
| `agent-context-memory` | Short-term context window management layered on top of hierarchical memory |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Memory Mechanisms in LLMs — arXiv (2307.05939)](https://arxiv.org/abs/2307.05939)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [What Is Agent Memory — LangChain Blog](https://blog.langchain.dev/what-is-agent-memory/)
- [RAG vs. Fine-Tuning for Knowledge — arXiv Survey](https://arxiv.org/abs/2312.10997)
- [Agent Memory Architectures — Microsoft AI Research](https://www.microsoft.com/en-us/research/project/language-models-for-agents/)