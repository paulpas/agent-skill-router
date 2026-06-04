---




name: agent-memory-systems
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent agent memory systems with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: agent-memory-systems, agent memory systems, how do i agent-memory-systems,
    orchestrate agent-memory-systems, automate agent-memory-systems, agent agent-memory-systems
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
version: "1.0.0"




---




# Agent Memory Systems

Orchestrates intelligent skill selection and execution for agent memory systems workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

### Pattern 1: Memory Retrieval & Relevance Scoring

```python
def retrieve_relevant_memories(
    query_context: str,
    memory_store: List[Dict],
    max_results: int = 5,
    relevance_threshold: float = 0.65
) -> List[Dict]:
    """Retrieve and rank memories based on semantic relevance and recency.
    
    Implements Law 2 (Parse at boundary) by validating query and memory structure.
    Implements Law 3 (Atomic Predictability) by returning fresh scored objects.
    """
    if not query_context or not memory_store:
        raise ValueError("Query context and memory store must be non-empty")
        
    query_embedding = _compute_embedding(query_context)
    scored_memories = []
    
    for memory in memory_store:
        # Calculate semantic similarity
        semantic_score = _cosine_similarity(query_embedding, memory["embedding"])
        
        # Apply temporal decay (Law 1: Early exit for stale memories)
        age_days = (time.time() - memory["created_at"]) / 86400
        decay_factor = max(0.1, 1.0 - (age_days * 0.05))
        
        # Combined relevance score
        relevance = semantic_score * decay_factor
        
        if relevance >= relevance_threshold:
            scored_memories.append({
                "id": memory["id"],
                "content": memory["content"],
                "relevance_score": round(relevance, 4),
                "age_days": round(age_days, 2),
                "source": memory.get("source", "unknown")
            })
            
    # Sort by relevance descending and return top results
    scored_memories.sort(key=lambda m: m["relevance_score"], reverse=True)
    return scored_memories[:max_results]
```


### Pattern 2: Context Window Management & Consolidation

```python
def manage_context_window(
    current_context: List[Dict],
    new_interaction: Dict,
    max_tokens: int = 4000,
    consolidation_strategy: str = "summarize"
) -> Dict:
    """Manage context window by integrating new interactions and consolidating old memories.
    
    Implements Law 4 (Fail Fast) by validating token counts and structure.
    Implements fallback chain for context overflow scenarios.
    """
    # Validate inputs at boundary
    if not current_context or not new_interaction.get("content"):
        raise ValueError("Context and new interaction must be valid")
        
    # Calculate current token usage
    current_tokens = _estimate_tokens(current_context)
    new_tokens = _estimate_tokens([new_interaction])
    
    if current_tokens + new_tokens <= max_tokens:
        # Direct append if within limits
        return {
            "status": "appended",
            "context": current_context + [new_interaction],
            "total_tokens": current_tokens + new_tokens,
            "action": "none"
        }
        
    # Fallback chain for overflow
    try:
        # Level 1: Summarize oldest memories
        consolidated = _summarize_oldest_memories(current_context, max_tokens - new_tokens)
        return {
            "status": "consolidated",
            "context": consolidated + [new_interaction],
            "total_tokens": _estimate_tokens(consolidated) + new_tokens,
            "action": "summarize"
        }
    except ContextOverflowError:
        # Level 2: Truncate to most recent critical memories
        critical_memories = _extract_critical_memories(current_context, max_tokens - new_tokens)
        return {
            "status": "truncated",
            "context": critical_memories + [new_interaction],
            "total_tokens": _estimate_tokens(critical_memories) + new_tokens,
            "action": "truncate"
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
|---|---|
| `hierarchical-agent-memory` | Multi-level memory architecture with episodic, semantic, and procedural stores |
| `agent-context-memory` | Short-term context window management and sliding window strategies |

---

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Memory Mechanisms in LLMs — arXiv (2307.05939)](https://arxiv.org/abs/2307.05939)
- [What Is Agent Memory — LangChain Blog](https://blog.langchain.dev/what-is-agent-memory/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Vector Databases for Agent Memory — Pinecone Guide](https://www.pinecone.io/learn/vector-databases/)
- [Long-Term Memory for LLMs — arXiv Survey](https://arxiv.org/abs/2307.06388)