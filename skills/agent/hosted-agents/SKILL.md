---
name: hosted-agents
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent hosted agents with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: hosted-agents, hosted agents, how do i hosted-agents, orchestrate hosted-agents,
    automate hosted-agents, agent hosted-agents
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
# Hosted Agents

Orchestrates intelligent skill selection and execution for hosted agents workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_hosted_agent(
    task_payload: Dict,
    available_agents: List[Dict],
    routing_config: Dict
) -> Dict:
    """Route a task to the optimal hosted agent endpoint.
    
    Evaluates hosted agents based on:
    - Task type compatibility (code, analysis, generation, etc.)
    - Current queue depth and estimated wait time
    - Model capability tags matching task requirements
    - Cost constraints and rate limit status
    
    Args:
        task_payload: Parsed task with type, complexity, and constraints
        available_agents: List of hosted agent metadata with capabilities
        routing_config: Thresholds for latency, cost, and fallback triggers
        
    Returns:
        Selected agent configuration with routing metadata
    """
    if not task_payload.get("task_type"):
        raise ValueError("Task type is required for agent routing")
        
    task_type = task_payload["task_type"]
    max_wait = routing_config.get("max_wait_seconds", 30)
    cost_cap = routing_config.get("cost_cap_per_request", 0.05)
    
    candidates = []
    for agent in available_agents:
        # Check capability match
        if task_type not in agent.get("supported_types", []):
            continue
            
        # Check operational status
        if agent.get("status") != "healthy":
            continue
            
        # Calculate routing score
        wait_penalty = max(0, agent.get("queue_depth", 0) - max_wait)
        cost_factor = agent.get("cost_per_call", 0) / cost_cap if cost_cap > 0 else 0
        
        score = (1.0 / (1.0 + wait_penalty)) * (1.0 / (1.0 + cost_factor))
        candidates.append({
            "agent_id": agent["id"],
            "endpoint": agent["endpoint"],
            "score": score,
            "estimated_wait": agent.get("queue_depth", 0) * agent.get("avg_process_time", 1.0)
        })
        
    if not candidates:
        return {"fallback": "human_review", "reason": "no_compatible_agents"}
        
    # Sort by score descending and return best match
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_hosted_agent_workflow(
    agent_config: Dict,
    task_data: Dict,
    execution_policy: Dict
) -> Dict:
    """Execute a task against a hosted agent with async polling and fallback.
    
    Manages the full lifecycle:
    - Submit task to agent endpoint
    - Poll for completion with exponential backoff
    - Handle transient failures and model-specific errors
    - Trigger fallback chain on timeout or critical failure
    
    Args:
        agent_config: Selected agent routing metadata
        task_data: Validated task payload ready for submission
        execution_policy: Retry limits, timeout thresholds, fallback rules
        
    Returns:
        Execution result with status, output, and timing metadata
    """
    submission_url = f"{agent_config['endpoint']}/submit"
    max_polls = execution_policy.get("max_poll_attempts", 10)
    base_delay = execution_policy.get("poll_base_delay", 2.0)
    
    # Submit task and get tracking ID
    response = requests.post(submission_url, json=task_data, timeout=10)
    response.raise_for_status()
    tracking_id = response.json()["tracking_id"]
    
    # Poll for completion
    for attempt in range(max_polls):
        status_url = f"{agent_config['endpoint']}/status/{tracking_id}"
        status_resp = requests.get(status_url, timeout=5)
        status_resp.raise_for_status()
        status_data = status_resp.json()
        
        if status_data["state"] == "completed":
            return {
                "status": "success",
                "agent_id": agent_config["agent_id"],
                "output": status_data["result"],
                "latency_ms": attempt * base_delay * 1000,
                "poll_attempts": attempt + 1
            }
        elif status_data["state"] == "failed":
            raise AgentExecutionError(f"Agent {agent_config['agent_id']} failed: {status_data.get('error')}")
            
        time.sleep(base_delay * (2 ** attempt))
        
    # Timeout reached - trigger fallback chain
    fallback_agents = execution_policy.get("fallback_agents", [])
    if fallback_agents:
        return execute_hosted_agent_workflow(fallback_agents[0], task_data, execution_policy)
        
    return {
        "status": "deferred",
        "agent_id": agent_config["agent_id"],
        "reason": "timeout_exceeded",
        "tracking_id": tracking_id,
        "requires_human_review": True
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
- [OpenAI Agents SDK Documentation](<https://openai.github.io/openai-agents-python/>)
- [Anthropic Claude API for Agents](<https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview>)
- [Google Gemini for Agent Development](<https://ai.google.dev/gemini-api/docs>)
- [Agent Hosting Platforms Comparison](<https://langchain-ai.github.io/langgraph/cloud/>)
- [LLM API Cost Optimization Guide](<https://www.anthropic.com/research/build-with-claude-cost-analysis>)
