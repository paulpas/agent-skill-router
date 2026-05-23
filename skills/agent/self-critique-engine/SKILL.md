---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent self critique engine with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: self-critique-engine, self critique engine, how do i self-critique-engine,
    orchestrate self-critique-engine, automate self-critique-engine, agent self-critique-engine
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
name: self-critique-engine
------
# Self Critique Engine

Orchestrates intelligent skill selection and execution for self critique engine workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def run_self_critique(
    agent_output: Dict[str, Any],
    original_request: str,
    critique_dimensions: List[str] = None
) -> Dict[str, Any]:
    """Run the self-critique engine against an agent's output.
    
    Evaluates the output against the 5 Laws of Elegant Defense and 
    configurable critique dimensions. Returns a structured critique report
    with pass/fail status, confidence scores, and remediation steps.
    """
    if critique_dimensions is None:
        critique_dimensions = ["safety", "correctness", "efficiency", "adherence"]
    
    # Law 1 & 2: Guard clauses and immutable parsing
    if not agent_output or not original_request:
        raise ValueError("Self-critique requires both agent_output and original_request")
        
    critique_report = {
        "status": "pending",
        "dimensions_scored": {},
        "remediation_steps": [],
        "confidence": 0.0,
        "timestamp": time.time()
    }
    
    # Law 3: Atomic scoring - never mutate original output
    for dim in critique_dimensions:
        score = _evaluate_dimension(dim, agent_output, original_request)
        critique_report["dimensions_scored"][dim] = score
        
        if score < 0.5:
            critique_report["remediation_steps"].append(
                f"Refine {dim}: {generate_refinement_prompt(dim, agent_output)}"
            )
            
    # Law 4: Fail fast on critical violations
    if critique_report["dimensions_scored"].get("safety", 1.0) < 0.3:
        critique_report["status"] = "critical_failure"
        critique_report["confidence"] = 0.95
        return critique_report
        
    # Calculate aggregate confidence
    avg_score = sum(critique_report["dimensions_scored"].values()) / len(critique_dimensions)
    critique_report["confidence"] = avg_score
    critique_report["status"] = "passed" if avg_score >= 0.7 else "needs_revision"
    
    return critique_report
```


### Pattern 2: Execution with Fallback

```python
def apply_critique_routing(
    critique_report: Dict[str, Any],
    fallback_strategies: List[str] = None
) -> Dict[str, Any]:
    """Route execution based on self-critique results.
    
    Implements the fallback chain based on critique confidence and status.
    Routes to retry, alternative skill, or human escalation.
    """
    if fallback_strategies is None:
        fallback_strategies = ["adjust_parameters", "try_alternative_skill", "human_escalation"]
        
    status = critique_report.get("status", "unknown")
    confidence = critique_report.get("confidence", 0.0)
    
    # Law 1: Early exit for clear outcomes
    if status == "passed" and confidence >= 0.8:
        return {
            "action": "proceed",
            "output": critique_report.get("agent_output"),
            "confidence": confidence
        }
        
    if status == "critical_failure":
        return {
            "action": "escalate",
            "reason": "Safety or critical constraint violation detected",
            "remediation": critique_report.get("remediation_steps", [])
        }
        
    # Law 2 & 3: Parse fallback chain and apply atomically
    for strategy in fallback_strategies:
        if strategy == "adjust_parameters":
            adjusted_context = _reconstruct_context(critique_report)
            return {
                "action": "retry",
                "strategy": strategy,
                "context": adjusted_context,
                "max_retries": 2
            }
        elif strategy == "try_alternative_skill":
            return {
                "action": "route_to_alternative",
                "fallback_skill": _select_alternative_skill(critique_report),
                "reason": f"Confidence {confidence} below threshold"
            }
            
    # Law 4: Fail loud if all strategies exhausted
    return {
        "action": "human_escalation",
        "reason": "All automated fallback strategies exhausted",
        "critique_summary": critique_report
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