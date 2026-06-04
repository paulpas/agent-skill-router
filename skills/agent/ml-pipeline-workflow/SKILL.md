---
name: ml-pipeline-workflow
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent ml pipeline workflow with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: ml-pipeline-workflow, ml pipeline workflow, how do i ml-pipeline-workflow,
    orchestrate ml-pipeline-workflow, automate ml-pipeline-workflow, agent ml-pipeline-workflow
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
# Ml Pipeline Workflow

Orchestrates intelligent skill selection and execution for ml pipeline workflow workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_ml_pipeline_step(
    task_spec: Dict,
    available_steps: List[Dict],
    hardware_constraints: Dict
) -> Optional[Dict]:
    """Select optimal ML pipeline step based on task type, data schema, and hardware.
    
    Evaluates steps using multi-factor scoring:
    - Task compatibility (classification vs regression vs clustering)
    - Data schema alignment (feature types, dimensionality)
    - Hardware fit (GPU memory, CPU cores, storage I/O)
    - Historical performance on similar datasets
    
    Args:
        task_spec: ML task configuration (type, data_path, target_column)
        available_steps: List of ML step metadata (framework, algorithm, resource_req)
        hardware_constraints: Current system resources (gpu_mem_gb, cpu_cores)
        
    Returns:
        Selected step metadata or None if no compatible step exists
    """
    # Guard clause - Early Exit (Law 1)
    if not task_spec.get("task_type") or not available_steps:
        raise ValueError("Task type and available steps are required")
        
    best_step = None
    best_score = 0.0
    
    for step in available_steps:
        # Check hardware compatibility first (Make Illegal States Unrepresentable - Law 2)
        if step["resource_req"]["gpu_mem_gb"] > hardware_constraints.get("gpu_mem_gb", 0):
            continue
            
        # Calculate compatibility score
        task_match = _match_task_type(task_spec["task_type"], step["supported_tasks"])
        schema_match = _validate_schema(task_spec.get("features", []), step["required_schema"])
        perf_history = step.get("historical_rmse", 1.0) if task_spec["task_type"] == "regression" else 1.0 - step.get("historical_accuracy", 0.0)
        
        score = (task_match * 0.4) + (schema_match * 0.3) + (perf_history * 0.3)
        
        if score > best_score:
            best_score = score
            best_step = step
            
    if best_step is None:
        return None
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    return {
        **best_step,
        "selection_score": best_score,
        "selected_at": datetime.utcnow().isoformat(),
        "hardware_profile": hardware_constraints
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_ml_step_with_fallback(
    step_config: Dict,
    run_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute ML pipeline step with resilience patterns for training/evaluation.
    
    Implements ML-specific fallback chain:
    1. Retry with original hyperparameters
    2. Fallback to simplified model architecture (e.g., linear vs neural net)
    3. Use cached/precomputed features if training fails
    4. Defer to human review for critical model validation failures
    
    Args:
        step_config: ML step configuration (algorithm, hyperparams, data_path)
        run_context: Execution context (session_id, output_dir, metrics_tracker)
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with model artifacts, metrics, and fallback metadata
    """
    # Guard clause - validate config (Early Exit)
    if not step_config.get("algorithm"):
        raise ValueError("Algorithm specification is required for execution")
        
    validated_config = _normalize_ml_config(step_config)
    output_dir = run_context.get("output_dir", "/tmp/ml_run")
    
    for attempt in range(max_retries + 1):
        try:
            # Execute training/evaluation pipeline
            artifacts, metrics = _run_ml_pipeline(validated_config, output_dir)
            
            # Validate model quality (Fail Fast on poor performance - Law 4)
            if metrics.get("validation_loss", float('inf')) > run_context.get("max_acceptable_loss", 1.0):
                raise ModelQualityError(f"Validation loss {metrics['validation_loss']} exceeds threshold")
                
            return {
                "success": True,
                "step_executed": validated_config["algorithm"],
                "artifacts_path": artifacts,
                "metrics": metrics,
                "attempts": attempt + 1,
                "latency_sec": time.time() - run_context.get("start_time", time.time())
            }
            
        except OutOfMemoryError as e:
            # Fallback: Reduce batch size or switch to CPU
            if attempt < max_retries:
                validated_config["batch_size"] = max(1, validated_config.get("batch_size", 32) // 2)
                continue
            return _apply_ml_fallback(validated_config, run_context, "memory_overflow")
            
        except ConvergenceError as e:
            # Fallback: Adjust learning rate or switch algorithm
            if attempt < max_retries:
                validated_config["learning_rate"] *= 0.5
                continue
            return _apply_ml_fallback(validated_config, run_context, "convergence_failure")
            
    # All retries exhausted - Fail Loud (Law 4)
    raise PipelineExecutionError(f"ML step {validated_config['algorithm']} failed after {max_retries + 1} attempts")
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
- [MLflow Experiment Tracking and Pipeline Orchestration](<https://mlflow.org/docs/latest/>)
- [Apache Airflow ML Pipeline Guide](<https://airflow.apache.org/docs/apache-airflow/stable/tutorial_operator.html>)
- [Kubeflow ML Pipeline on Kubernetes](<https://www.kubeflow.org/docs/components/pipelines/v2/overview/>)
- [DVC (Data Version Control) for ML Pipelines](<https://dvc.org/doc/user-guide/data-and-project-files/versioning-data-in-experiments>)
- [Scikit-learn Pipeline API](<https://scikit-learn.org/stable/modules/compose.html#pipeline-pipelines>)
