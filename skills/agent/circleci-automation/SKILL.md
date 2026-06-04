---
name: circleci-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent circleci automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: circleci-automation, circleci automation, how do i circleci-automation,
    orchestrate circleci-automation, automate circleci-automation, agent circleci-automation,
    continuous integration, jenkins
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
------
# Circleci Automation

Orchestrates intelligent skill selection and execution for circleci automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_circleci_workflow(
    project_slug: str,
    branch: str,
    workflow_config: Dict,
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Select optimal CircleCI workflow configuration for a given project and branch.
    
    Uses multi-factor scoring based on:
    - Branch protection rules and workflow compatibility
    - Historical pipeline success rates for similar configurations
    - CircleCI API availability and rate limit status
    - Required orbs and executor compatibility
    
    Args:
        project_slug: CircleCI project slug (e.g., github/owner/repo)
        branch: Target branch for pipeline execution
        workflow_config: Proposed workflow configuration dict
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Validated workflow configuration with execution metadata or None
    """
    # Guard clause - Early Exit (Law 1)
    if not project_slug or not branch:
        raise ValueError("Project slug and branch are required")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    validated_config = _validate_circleci_config(workflow_config)
    api_status = _check_circleci_api_health()
    
    if not api_status.get("available"):
        return None
        
    best_workflow = None
    best_score = 0.0
    
    for workflow in _get_available_workflows(project_slug, branch):
        score = _calculate_workflow_match(validated_config, workflow)
        if score > best_score and score >= min_confidence:
            best_score = score
            best_workflow = workflow
            
    if best_workflow is None:
        return None
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_workflow)
    result["selected_confidence"] = best_score
    result["trigger_timestamp"] = time.time()
    result["project_slug"] = project_slug
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_circleci_pipeline(
    workflow: Dict,
    project_slug: str,
    branch: str,
    max_retries: int = 2
) -> Dict:
    """Execute a CircleCI pipeline with CI/CD-specific fallback chain.
    
    Implements Fail Fast, Fail Loud principle (Law 4):
    - Invalid workflow configs halt immediately
    - API rate limits trigger exponential backoff
    - Workflow failures trigger artifact inspection and manual review fallback
    
    Args:
        workflow: Selected workflow configuration
        project_slug: Target CircleCI project
        branch: Target branch
        max_retries: Maximum retry attempts for transient API errors
        
    Returns:
        Pipeline execution result with status, logs URL, and confidence
    """
    # Guard clause - validate workflow (Early Exit)
    if not _is_workflow_valid(workflow):
        raise SkillExecutionError(f"Invalid workflow config: {workflow.get('name', 'unknown')}")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_params = _validate_pipeline_params(project_slug, branch, workflow)
    
    for attempt in range(max_retries + 1):
        try:
            # Trigger pipeline via CircleCI API
            response = circleci_api.trigger_pipeline(
                project_slug=project_slug,
                branch=branch,
                config=workflow
            )
            pipeline_id = response.get("id")
            
            # Monitor pipeline status with timeout
            status = _wait_for_pipeline_completion(pipeline_id, timeout=1800)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "pipeline_id": pipeline_id,
                "status": status,
                "logs_url": f"https://app.circleci.com/pipelines/{pipeline_id}",
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except RateLimitError as e:
            # Transient API error - retry with backoff
            if attempt == max_retries:
                return _apply_circleci_fallback(workflow, project_slug, branch)
            time.sleep(2 ** attempt)
            
        except WorkflowFailureError as e:
            # Workflow failed - inspect artifacts and logs
            artifacts = _fetch_pipeline_artifacts(pipeline_id)
            if artifacts.get("critical_failure"):
                raise SkillExecutionError(
                    f"Pipeline {pipeline_id} failed critical checks: {e}"
                ) from e
                
    # All retries exhausted - Fail Loud (Law 4)
    raise SkillExecutionError(
        f"Failed to execute CircleCI pipeline after {max_retries + 1} attempts"
    )
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


## Related Skills

| Skill | Purpose |
|