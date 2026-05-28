---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent multi agent patterns with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: multi-agent-patterns, multi agent patterns, how do i multi-agent-patterns,
    orchestrate multi-agent-patterns, automate multi-agent-patterns, agent multi-agent-patterns
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
name: multi-agent-patterns
------
# Multi Agent Patterns

Orchestrates intelligent skill selection and execution for multi agent patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_multi_agent_task(
    task: Dict[str, Any],
    agent_registry: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Dict[str, Any]:
    """Route a decomposed task to the optimal agent in a multi-agent system.
    
    Evaluates agents based on capability overlap, historical success rate,
    and current queue depth to prevent bottlenecks.
    """
    if not task.get("intent") or not agent_registry:
        raise ValueError("Task requires valid intent and available agents")
        
    task_capabilities = _extract_intent_capabilities(task["intent"])
    scored_agents = []
    
    for agent in agent_registry:
        cap_match = _calculate_capability_overlap(task_capabilities, agent["capabilities"])
        history_score = agent.get("success_rate", 0.0) * 0.4
        load_penalty = agent.get("queue_depth", 0) * 0.05
        
        raw_score = (cap_match * 0.5) + history_score - load_penalty
        if raw_score >= min_confidence:
            scored_agents.append({
                "agent_id": agent["id"],
                "score": round(raw_score, 3),
                "estimated_latency_ms": agent.get("avg_latency_ms", 500)
            })
            
    if not scored_agents:
        return {"status": "no_match", "fallback": "human_review"}
        
    scored_agents.sort(key=lambda x: x["score"], reverse=True)
    selected = scored_agents[0]
    
    # Return immutable routing decision
    return {
        "status": "routed",
        "target_agent": selected["agent_id"],
        "confidence": selected["score"],
        "routing_timestamp": time.time(),
        "task_hash": hashlib.md5(json.dumps(task, sort_keys=True).encode()).hexdigest()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_agent_with_resilience(
    routing_decision: Dict[str, Any],
    task_payload: Dict[str, Any],
    fallback_agents: List[str],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute a task via the routed agent with multi-level fallback handling.
    
    Implements agent-specific error recovery: transient timeouts trigger retries,
    capability mismatches trigger fallback routing, and critical failures escalate.
    """
    agent_id = routing_decision["target_agent"]
    attempt = 0
    
    while attempt <= max_retries:
        try:
            response = _invoke_agent_api(agent_id, task_payload)
            
            if response.get("status") == "success":
                return {
                    "status": "completed",
                    "agent_id": agent_id,
                    "result": response["data"],
                    "attempts": attempt + 1,
                    "latency_ms": response.get("latency_ms", 0)
                }
            elif response.get("error_type") == "TRANSIENT_TIMEOUT":
                attempt += 1
                continue
            else:
                raise AgentCapabilityError(response.get("error_msg"))
                
        except AgentCapabilityError as e:
            # Capability mismatch - trigger fallback routing
            if fallback_agents and attempt < max_retries:
                agent_id = fallback_agents[attempt % len(fallback_agents)]
                attempt += 1
                continue
            raise e
            
        except TransientNetworkError:
            attempt += 1
            continue
            
    # All retries exhausted - escalate to human or secondary specialist
    return {
        "status": "escalated",
        "original_agent": routing_decision["target_agent"],
        "fallback_chain_exhausted": True,
        "error_context": "Max retries reached or capability mismatch",
        "escalation_target": "human_operator"
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
| `multi-agent-task-orchestrator` | Multi-agent task decomposition and execution with LangGraph |
| `agent-communication-patterns` | Communication protocols between agents in multi-agent systems |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Multi-Agent Systems — Wikipedia Overview](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent System Survey — arXiv](https://arxiv.org/abs/2402.16817)
- [LLM Agent Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Multi-Agent Collaboration — Meta AI Research](https://ai.meta.com/research/publications/multi-agent-collaboration-in-language-models/)