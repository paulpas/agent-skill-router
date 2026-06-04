---
name: cicd-automation-workflow-automate
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cicd automation workflow automate with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cicd-automation-workflow-automate, cicd automation workflow automate,
    how do i cicd-automation-workflow-automate, orchestrate cicd-automation-workflow-automate,
    automate cicd-automation-workflow-automate, agent cicd-automation-workflow-automate
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
# Cicd Automation Workflow Automate

Orchestrates intelligent skill selection and execution for cicd automation workflow automate workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def orchestrate_cicd_pipeline(
    pipeline_config: Dict[str, Any],
    target_env: str,
    branch_rules: List[Dict[str, str]]
) -> Dict[str, Any]:
    """Orchestrate CI/CD workflow by validating stages and selecting execution strategy.
    
    Applies 5 Laws of Elegant Defense:
    - Law 1: Early exit on missing pipeline config or invalid target environment
    - Law 2: Parse and validate pipeline structure before execution
    - Law 3: Return new execution plan without mutating original config
    - Law 4: Fail immediately on invalid stage dependencies or missing secrets
    """
    if not pipeline_config or "stages" not in pipeline_config:
        raise ValueError("Pipeline config must contain 'stages' definition")
        
    if target_env not in ("dev", "staging", "production"):
        raise ValueError(f"Invalid target environment: {target_env}")
        
    # Parse pipeline structure (Law 2)
    stages = pipeline_config["stages"]
    execution_plan = []
    
    for stage in stages:
        # Validate stage dependencies (Law 4)
        if "depends_on" in stage:
            for dep in stage["depends_on"]:
                if dep not in [s["name"] for s in stages]:
                    raise ValueError(f"Stage '{stage['name']}' depends on unknown stage '{dep}'")
                    
        # Select execution strategy based on environment rules (Law 1)
        strategy = _match_branch_rule(stage, branch_rules, target_env)
        if not strategy:
            strategy = "default_runner"
            
        execution_plan.append({
            "stage": stage["name"],
            "strategy": strategy,
            "timeout_minutes": stage.get("timeout", 30),
            "retry_policy": stage.get("retry", {"max_attempts": 2})
        })
        
    # Return new structure (Law 3)
    return {
        "pipeline_id": pipeline_config.get("id", "unknown"),
        "target_env": target_env,
        "execution_order": execution_plan,
        "validation_status": "passed"
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_cicd_stage(
    stage_config: Dict[str, Any],
    runner_pool: List[Dict[str, str]],
    artifact_store: Dict[str, Any]
) -> Dict[str, Any]:
    """Execute a CI/CD stage with environment-specific fallback chains.
    
    Implements Fail Fast, Fail Loud (Law 4) for pipeline execution:
    - Invalid runner states halt immediately
    - No silent stage skips or partial artifact commits
    
    Fallback chain for CI/CD:
    1. Retry stage on same runner with exponential backoff
    2. Failover to secondary runner pool
    3. Trigger manual approval gate if production deployment
    4. Rollback previous stage artifacts if critical failure
    """
    if not stage_config or "name" not in stage_config:
        raise ValueError("Stage config must contain 'name'")
        
    active_runners = [r for r in runner_pool if r.get("status") == "available"]
    if not active_runners:
        raise RuntimeError("No available CI/CD runners in pool")
        
    current_runner = active_runners[0]
    max_retries = stage_config.get("retry_policy", {}).get("max_attempts", 2)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute stage on selected runner
            result = _run_stage_on_runner(current_runner, stage_config)
            
            # Validate artifacts were produced (Law 4)
            if not result.get("artifacts") and stage_config.get("requires_artifacts"):
                raise RuntimeError(f"Stage '{stage_config['name']}' failed to produce required artifacts")
                
            # Store artifacts atomically (Law 3)
            artifact_store[f"{stage_config['name']}_v{attempt}"] = result["artifacts"]
            
            return {
                "stage": stage_config["name"],
                "status": "completed",
                "runner_used": current_runner["id"],
                "attempts": attempt + 1,
                "artifacts_stored": True
            }
            
        except RunnerOfflineError:
            if attempt == max_retries:
                return _failover_to_backup_runner(stage_config, runner_pool)
            continue
            
        except ArtifactValidationError as e:
            raise RuntimeError(f"Artifact validation failed for {stage_config['name']}: {e}") from e
            
    # All retries exhausted - Fail Loud
    raise RuntimeError(f"Stage '{stage_config['name']}' exhausted all runner retries")
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
| `closed-loop-delivery` | Delivery pipeline feedback and iteration patterns |

---

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

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Atlassian Git — Comparing Workflows](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [GitLab CI/CD Pipeline Configuration](https://docs.gitlab.com/ee/ci/yaml/)
- [Jenkins — Declarative Pipeline Syntax Reference](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [ArgoCD — GitOps Continuous Delivery for Kubernetes](https://argo-cd.readthedocs.io/en/stable/)