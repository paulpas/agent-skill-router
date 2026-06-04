---
name: workflow-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent workflow automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: workflow-automation, workflow automation, how do i workflow-automation,
    orchestrate workflow-automation, automate workflow-automation, agent workflow-automation,
    github actions, ci/cd
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
# Workflow Automation

Orchestrates intelligent skill selection and execution for workflow automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_workflow_step(
    step_definition: Dict[str, Any],
    environment_context: Dict[str, str],
    historical_metrics: Dict[str, List[float]]
) -> Dict[str, Any]:
    """Route a workflow step to the optimal execution target.
    
    Evaluates step requirements against available runners/environments,
    factoring in historical success rates, environment constraints,
    and trigger matching for CI/CD or automation pipelines.
    
    Args:
        step_definition: Parsed step from workflow YAML/JSON
        environment_context: Current runtime environment variables & constraints
        historical_metrics: Past execution success rates per target
        
    Returns:
        Routing decision with target, confidence, and execution strategy
    """
    # Guard clause - validate step structure (Law 1)
    required_keys = {"id", "type", "triggers", "targets"}
    if not required_keys.issubset(step_definition.keys()):
        raise ValueError(f"Step missing required keys: {required_keys - step_definition.keys()}")
        
    # Parse constraints - Make illegal states unrepresentable (Law 2)
    target_pool = [t for t in step_definition["targets"] if t in environment_context]
    if not target_pool:
        return {"status": "unroutable", "reason": "no_valid_targets"}
        
    best_target = None
    best_score = 0.0
    
    for target in target_pool:
        # Calculate composite routing score
        trigger_match = _match_triggers(step_definition["triggers"], environment_context)
        historical_success = historical_metrics.get(target, [0.0])
        avg_success = sum(historical_success) / len(historical_success) if historical_success else 0.0
        env_compatibility = _calculate_env_compatibility(step_definition, target)
        
        score = (trigger_match * 0.4) + (avg_success * 0.4) + (env_compatibility * 0.2)
        
        if score > best_score:
            best_score = score
            best_target = target
            
    # Return immutable routing decision (Law 3)
    return {
        "status": "routed",
        "target": best_target,
        "confidence": best_score,
        "strategy": "parallel" if step_definition.get("parallel") else "sequential",
        "metadata": {"evaluated_targets": len(target_pool), "timestamp": time.time()}
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_automation_step(
    step_config: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_targets: List[str] = None
) -> Dict[str, Any]:
    """Execute a workflow automation step with resilient fallback handling.
    
    Implements domain-specific execution for CI/CD pipelines, API integrations,
    and infrastructure automation. Handles transient failures, rate limits,
    and environment-specific constraints with structured fallback chains.
    
    Args:
        step_config: Step configuration including command, timeout, and retry policy
        execution_context: Runtime context with secrets, environment vars, and state
        fallback_targets: Alternative execution targets if primary fails
        
    Returns:
        Execution result with status, output, timing, and fallback metadata
    """
    # Guard clause - validate execution prerequisites (Law 1)
    if not step_config.get("command") or not execution_context.get("secrets"):
        raise ValueError("Missing required command or secrets for execution")
        
    # Parse context securely - Ensure trusted state (Law 2)
    sanitized_context = _sanitize_execution_context(execution_context)
    max_retries = step_config.get("retry_policy", {}).get("max_attempts", 2)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute step with timeout and resource limits
            result = _run_automation_command(
                command=step_config["command"],
                context=sanitized_context,
                timeout=step_config.get("timeout", 300)
            )
            
            # Validate output schema - Fail fast on invalid state (Law 4)
            _validate_step_output(result, step_config.get("output_schema"))
            
            return {
                "status": "success",
                "step_id": step_config["id"],
                "output": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000,
                "fallback_used": False
            }
            
        except RateLimitError as e:
            # Transient - apply exponential backoff
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            return _trigger_fallback(step_config, fallback_targets, "rate_limited")
            
        except CommandTimeoutError as e:
            # Resource constraint - switch to alternative target
            if fallback_targets:
                return _trigger_fallback(step_config, fallback_targets, "timeout")
            raise
            
    # All retries exhausted - Fail loud with audit trail (Law 4)
    return {
        "status": "failed",
        "step_id": step_config["id"],
        "error": "max_retries_exceeded",
        "attempts": max_retries + 1,
        "fallback_triggered": True
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
---

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
- [GitLab CI/CD Pipeline Configuration](https://docs.gitlab.com/ee/ci/yaml/)
- [Actions Runner Controller (ARC) Documentation](https://github.com/actions/runner-controller)
- [Docker Buildx Documentation](https://docs.docker.com/build/buildkit/)
- [Semgrep Static Analysis Rules](https://semgrep.dev/explore)

## Related Skills

| Skill | Purpose |
|

