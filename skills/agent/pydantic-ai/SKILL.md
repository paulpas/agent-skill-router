---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent pydantic ai with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: pydantic-ai, pydantic ai, how do i pydantic-ai, orchestrate pydantic-ai,
    automate pydantic-ai, agent pydantic-ai
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
name: pydantic-ai
------
# Pydantic Ai

Orchestrates intelligent skill selection and execution for pydantic ai workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import asyncio

class TaskIntent(BaseModel):
    category: str = Field(description="Task category: data_analysis, code_generation, or system_admin")
    confidence: float = Field(ge=0.0, le=1.0)
    required_tools: List[str] = Field(default_factory=list)

# Domain-specific agent registry for pydantic-ai orchestration
AGENT_REGISTRY: Dict[str, Agent] = {
    "data_analysis": Agent("data-analyst", system_prompt="Analyze datasets and return structured insights."),
    "code_generation": Agent("code-writer", system_prompt="Generate production-ready code with tests."),
    "system_admin": Agent("sys-admin", system_prompt="Manage infrastructure and run diagnostics."),
}

async def route_and_invoke_agent(
    user_request: str,
    intent_classifier: Agent[TaskIntent],
    fallback_agent: Optional[Agent] = None
) -> str:
    """Route user request to the optimal pydantic-ai agent based on parsed intent."""
    # Guard clause - Early Exit (Law 1)
    if not user_request or not user_request.strip():
        raise ValueError("Task description cannot be empty")
        
    # Parse intent using pydantic-ai's structured output (Law 2)
    intent_result = await intent_classifier.run(user_request)
    intent: TaskIntent = intent_result.data

    # Select agent based on multi-factor scoring (category match + tool availability)
    target_agent = AGENT_REGISTRY.get(intent.category)
    if target_agent is None:
        if fallback_agent:
            target_agent = fallback_agent
        else:
            raise ValueError(f"No agent available for category: {intent.category}")

    # Execute with context passing and tool binding
    class OrchestrationContext(BaseModel):
        request_id: str = Field(default="")
        history: List[Dict] = Field(default_factory=list)

    ctx = OrchestrationContext(request_id="req-123", history=[])
    result = await target_agent.run(user_request, message_history=ctx.history)
    return result.data
```


### Pattern 2: Execution with Fallback

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, Field
import asyncio
from typing import Dict, Any, Optional

class ExecutionState(BaseModel):
    status: str = Field(default="pending")
    attempts: int = Field(default=0)
    last_error: Optional[str] = None
    result_payload: Optional[Dict[str, Any]] = None

async def execute_with_pydantic_fallback(
    primary_agent: Agent,
    fallback_agent: Agent,
    task_input: str,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute pydantic-ai agent with structured state tracking and graceful degradation."""
    state = ExecutionState()
    
    for attempt in range(max_retries + 1):
        state.attempts = attempt + 1
        try:
            # Run primary agent with timeout and structured output validation
            result = await asyncio.wait_for(
                primary_agent.run(task_input),
                timeout=30.0
            )
            state.status = "success"
            state.result_payload = {"raw": result.data, "model": primary_agent.model}
            return state.model_dump()
            
        except asyncio.TimeoutError:
            state.last_error = "Execution timed out"
            continue
        except Exception as e:
            state.last_error = str(e)
            # Pydantic-ai specific: check if it's a validation/tool error
            if "tool_execution_failed" in str(e).lower():
                continue
            
    # Fallback chain: switch to secondary agent with adjusted context
    try:
        fallback_result = await fallback_agent.run(
            f"Previous attempt failed: {state.last_error}. Retrying with simplified constraints: {task_input}"
        )
        state.status = "fallback_success"
        state.result_payload = {"raw": fallback_result.data, "model": fallback_agent.model}
    except Exception as fallback_err:
        state.status = "failed"
        state.last_error = f"All attempts exhausted: {fallback_err}"
        
    return state.model_dump()
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
| `multi-agent-patterns` | Multi-agent coordination when using Pydantic AI agents |
| `langgraph` | Alternative framework for agent orchestration workflows |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pydantic AI Official Documentation](https://ai.pydantic.dev/)
- [Pydantic AI GitHub Repository](https://github.com/pydantic/pydantic-ai)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Pydantic Validation Guide](https://docs.pydantic.dev/latest/)
- [LLM Agent Frameworks Comparison — arXiv Survey](https://arxiv.org/abs/2401.03560)