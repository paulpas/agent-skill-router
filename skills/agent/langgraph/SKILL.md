---
name: langgraph
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent langgraph with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: langgraph, langgraph, how do i langgraph, orchestrate langgraph, automate
    langgraph, agent langgraph
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
# Langgraph

Orchestrates intelligent skill selection and execution for langgraph workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Literal, List, Dict, Optional
import numpy as np

class OrchestrationState(TypedDict):
    user_request: str
    available_skills: List[Dict]
    selected_skill: Optional[Dict]
    confidence_score: float
    execution_result: Optional[Dict]
    fallback_chain: List[str]
    error_trace: Optional[str]

def route_to_skill(state: OrchestrationState) -> Literal["skill_router", "fallback_handler", "human_review"]:
    """LangGraph router implementing multi-factor skill selection (Laws 1-3)."""
    request = state["user_request"]
    skills = state["available_skills"]
    
    # Law 1: Early exit on invalid state
    if not request or not skills:
        return "fallback_handler"
        
    best_match = None
    max_score = 0.0
    
    for skill in skills:
        # Multi-factor scoring: text similarity + historical success + availability
        text_sim = _compute_embedding_similarity(request, skill["triggers"])
        hist_success = skill.get("historical_success_rate", 0.5)
        availability = 1.0 if skill.get("is_healthy", False) else 0.0
        
        score = (0.5 * text_sim) + (0.3 * hist_success) + (0.2 * availability)
        if score > max_score:
            max_score = score
            best_match = skill
            
    # Law 2: Make illegal states unrepresentable - enforce threshold
    if max_score < 0.7:
        return "fallback_handler"
        
    # Law 3: Return new state, never mutate inputs
    state["selected_skill"] = best_match
    state["confidence_score"] = max_score
    return "execute_skill"
```


### Pattern 2: Execution with Fallback

```python
def execute_skill_node(state: OrchestrationState) -> OrchestrationState:
    """LangGraph node executing the selected skill with fallback chain (Laws 4-5)."""
    skill = state["selected_skill"]
    context = {"request": state["user_request"], "skill_config": skill}
    
    try:
        # Execute domain-specific skill logic
        result = skill["handler"](context)
        state["execution_result"] = result
        # Law 5: Update confidence scores after execution for learning
        state["confidence_score"] = min(1.0, state["confidence_score"] * 1.1)
        return state
        
    except InvalidStateError as e:
        # Law 4: Fail Fast, Fail Loud - halt immediately with descriptive error
        state["error_trace"] = str(e)
        return "fallback_handler"
        
    except TransientError as e:
        # Retry with adjusted parameters
        context["retry_count"] = context.get("retry_count", 0) + 1
        if context["retry_count"] < 2:
            return "execute_skill"
        state["error_trace"] = str(e)
        return "fallback_handler"

def fallback_handler_node(state: OrchestrationState) -> OrchestrationState:
    """Implements 2-level fallback chain: alternative skill -> human review."""
    if state.get("fallback_chain"):
        alt_skill_name = state["fallback_chain"].pop(0)
        # Route back to router with updated context
        state["user_request"] = f"Retry with fallback: {state['user_request']}"
        return "skill_router"
        
    # Defer to human operator for critical tasks
    state["execution_result"] = {"status": "deferred", "reason": "all fallbacks exhausted"}
    return "human_review"
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
| `multi-agent-task-orchestrator` | Multi-agent coordination using LangGraph's state machines |
| `parallel-agents` | Parallel agent execution patterns within LangGraph workflows |

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

- [LangGraph Official Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Agents Tutorial](https://python.langchain.com/docs/tutorials/agents/)
- [LangGraph Multi-Agent Patterns](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [LangGraph State Machine Guide](https://langchain-ai.github.io/langgraph/concepts/high_level/)
- [Building Agent Workflows — LangChain Blog](https://blog.langchain.dev/)