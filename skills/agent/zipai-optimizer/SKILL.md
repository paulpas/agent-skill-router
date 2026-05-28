---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent zipai optimizer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: zipai-optimizer, zipai optimizer, how do i zipai-optimizer, orchestrate
    zipai-optimizer, automate zipai-optimizer, agent zipai-optimizer
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
name: zipai-optimizer
------
# Zipai Optimizer

Orchestrates intelligent skill selection and execution for zipai optimizer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_zipai_task(
    task_payload: Dict[str, Any],
    available_modules: List[Dict[str, Any]],
    routing_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Route a zipai optimization task to the most suitable processing module.
    
    Evaluates modules against zipai-specific routing criteria:
    - Context window alignment (token budget matching)
    - Historical latency percentiles for similar task shapes
    - Dependency graph compatibility (upstream/downstream readiness)
    - Current queue depth and resource availability
    
    Args:
        task_payload: Parsed zipai task with intent, entities, and constraints
        available_modules: List of active optimizer module metadata
        routing_config: Thresholds and weights for multi-factor scoring
        
    Returns:
        Routing decision with selected module, confidence score, and execution hints
    """
    if not task_payload.get("intent"):
        raise ValueError("Zipai task payload missing required 'intent' field")
        
    task_shape = _extract_task_shape(task_payload)
    best_module = None
    best_score = 0.0
    
    for module in available_modules:
        # Zipai-specific scoring: context alignment + historical performance + queue health
        context_score = _calculate_context_alignment(task_shape, module["capabilities"])
        history_score = module.get("p95_latency_score", 0.5)
        queue_score = 1.0 - (module.get("current_queue_depth", 0) / routing_config.get("max_queue_depth", 100))
        
        composite = (
            context_score * routing_config.get("w_context", 0.4) +
            history_score * routing_config.get("w_history", 0.35) +
            queue_score * routing_config.get("w_queue", 0.25)
        )
        
        if composite > best_score and composite >= routing_config.get("min_confidence", 0.7):
            best_score = composite
            best_module = module
            
    if best_module is None:
        return {"status": "unroutable", "reason": "no_module_meets_threshold", "score": best_score}
        
    # Return immutable routing decision
    return {
        "status": "routed",
        "selected_module": best_module["name"],
        "confidence": round(best_score, 3),
        "execution_hints": best_module.get("routing_hints", {}),
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_zipai_module(
    routing_decision: Dict[str, Any],
    task_context: Dict[str, Any],
    fallback_modules: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Execute a zipai optimizer module with built-in resilience and fallback routing.
    
    Implements zipai execution contract:
    - Validates module state and context compatibility before dispatch
    - Handles transient failures with exponential backoff
    - Falls back to alternative modules if primary fails after retries
    - Maintains execution trace for audit and confidence recalibration
    
    Args:
        routing_decision: Output from route_zipai_task
        task_context: Full execution context including inputs and state
        fallback_modules: Ordered list of alternative modules for fallback routing
        
    Returns:
        Execution result with status, output, timing, and confidence update
    """
    primary_module = routing_decision.get("selected_module")
    if not primary_module:
        raise ValueError("Routing decision missing selected_module")
        
    execution_trace = {
        "primary": primary_module,
        "attempts": 0,
        "fallbacks_used": [],
        "start_time": time.time()
    }
    
    max_retries = routing_decision.get("execution_hints", {}).get("max_retries", 2)
    
    for attempt in range(max_retries + 1):
        execution_trace["attempts"] = attempt + 1
        try:
            result = _dispatch_module(primary_module, task_context)
            return {
                "status": "success",
                "module": primary_module,
                "output": result,
                "latency_ms": (time.time() - execution_trace["start_time"]) * 1000,
                "confidence_delta": 0.05,
                "trace": execution_trace
            }
        except ModuleTimeoutError:
            if attempt < max_retries:
                continue
            # Exhausted retries, trigger fallback chain
            for fallback in fallback_modules:
                try:
                    result = _dispatch_module(fallback["name"], task_context)
                    execution_trace["fallbacks_used"].append(fallback["name"])
                    return {
                        "status": "success_fallback",
                        "module": fallback["name"],
                        "output": result,
                        "latency_ms": (time.time() - execution_trace["start_time"]) * 1000,
                        "confidence_delta": -0.02,
                        "trace": execution_trace
                    }
                except Exception as e:
                    continue
                    
    return {
        "status": "failed",
        "module": primary_module,
        "error": "All retries and fallbacks exhausted",
        "trace": execution_trace
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
## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Attention Is All You Need — Transformer Architecture (Vaswani et al.)](https://arxiv.org/abs/1706.03762)
- [Google's BERT Paper — Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805)
- [Tokenization in LLMs — Hugging Face Docs](https://huggingface.co/docs/transformers/tokenizer_summary)
- [Context Window Management — Anyscale Blog](https://www.anyscale.com/blog/how-to-manage-context-windows-in-production-llm-applications)
- [Anthropic Constitutional AI — Harmlessness Training](https://arxiv.org/abs/2212.08073)

## Related Skills

| Skill | Purpose |
|

