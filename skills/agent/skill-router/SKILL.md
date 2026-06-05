---




name: skill-router
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill router with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-router, skill router, how do i skill-router, orchestrate skill-router,
    automate skill-router, agent skill-router
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




# Skill Router

Orchestrates intelligent skill selection and execution for skill router workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_request(request: Dict, skill_registry: Dict[str, Dict]) -> Dict:
    """Route an incoming request to the optimal skill based on trigger matching and metadata scoring.
    
    Applies Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable):
    - Validates intent and registry upfront
    - Filters inactive/deprecated skills before scoring
    """
    if not request.get("intent") or not skill_registry:
        raise ValueError("Request intent and skill registry are required for routing")
    
    intent = request["intent"].lower()
    candidates = []
    
    for skill_name, manifest in skill_registry.items():
        if manifest.get("status") != "active":
            continue
            
        trigger_match = _calculate_trigger_overlap(intent, manifest.get("triggers", []))
        history_score = manifest.get("success_rate", 0.0) * 0.4
        load_penalty = manifest.get("current_load", 0.0) * 0.1
        
        composite_score = trigger_match * 0.5 + history_score + (1.0 - load_penalty) * 0.3
        
        if composite_score >= manifest.get("min_confidence", 0.6):
            candidates.append({
                "skill": skill_name,
                "score": composite_score,
                "manifest": manifest
            })
    
    if not candidates:
        return {"route": "fallback", "reason": "no_matching_skill"}
        
    candidates.sort(key=lambda x: x["score"], reverse=True)
    selected = candidates[0]
    
    return {
        "route": selected["skill"],
        "confidence": selected["score"],
        "params": request.get("params", {}),
        "metadata": {
            "timestamp": time.time(),
            "routing_keys": list(request.keys())
        }
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_routed_skill(route_result: Dict, skill_registry: Dict[str, Dict]) -> Dict:
    """Execute the routed skill with domain-specific fallback chaining.
    
    Applies Law 3 (Atomic Predictability) and Law 4 (Fail Fast, Fail Loud):
    - Validates handler existence before dispatch
    - Returns immutable result structures
    - Escalates routing failures explicitly
    """
    target_skill = route_result.get("route")
    if target_skill == "fallback":
        return _handle_no_match_fallback(route_result)
        
    manifest = skill_registry.get(target_skill)
    if not manifest:
        raise KeyError(f"Routed skill '{target_skill}' missing from registry")
        
    try:
        handler = manifest.get("handler")
        if not handler:
            raise RuntimeError(f"Skill '{target_skill}' has no registered handler")
            
        result = handler(**route_result.get("params", {}))
        
        _update_skill_metrics(target_skill, success=True)
        
        return {
            "status": "success",
            "skill_executed": target_skill,
            "output": result,
            "routing_metadata": route_result.get("metadata", {})
        }
        
    except TimeoutError:
        _update_skill_metrics(target_skill, success=False, reason="timeout")
        return _apply_routing_fallback(route_result, skill_registry, "timeout")
    except PermissionError as e:
        _update_skill_metrics(target_skill, success=False, reason="auth")
        return _escalate_to_admin(route_result, str(e))
    except Exception as e:
        _update_skill_metrics(target_skill, success=False, reason="unknown")
        return _apply_routing_fallback(route_result, skill_registry, "error")
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
| `parallel-skill-runner` | Handles parallel execution after the router selects multiple skills for a task |
| `confidence-based-selector` | Uses confidence scoring to rank and select the best skill after routing analysis |

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

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Vector Database Retrieval Patterns (Pinecone)](https://www.pinecone.io/learn/vector-search/) — Pinecone's guide to vector similarity search, the foundation of semantic skill matching
- [BM25 Information Retrieval Algorithm](https://en.wikipedia.org/wiki/Okapi_BM25) — Wikipedia article on BM25, the ranking function used in keyword-based skill matching
- [LangChain Semantic Router](https://python.langchain.com/docs/integrations/tools/langsmith/) — LangChain documentation on implementing semantic routing for LLM applications
- [Semantic Search with Embeddings (Hugging Face)](https://huggingface.co/docs/sentence_transformers/) — Hugging Face's guide to sentence embeddings for semantic matching tasks
- [Task Routing in Multi-Agent Systems (Microsoft AutoGen)](https://microsoft.github.io/autogen/stable/user-guide/agent-chat-user-guide/tutorial/directchat.html) — Microsoft AutoGen documentation on routing tasks across multiple agents