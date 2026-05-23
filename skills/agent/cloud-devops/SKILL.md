---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cloud devops with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cloud-devops, cloud devops, how do i cloud-devops, orchestrate cloud-devops,
    automate cloud-devops, agent cloud-devops
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
name: cloud-devops
------
# Cloud Devops

Orchestrates intelligent skill selection and execution for cloud devops workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_cloud_deployment_path(
    infrastructure_state: Dict,
    available_devops_skills: List[Dict],
    cloud_provider: str = "aws"
) -> Optional[Dict]:
    """Evaluate and select the optimal cloud devops skill for infrastructure changes.
    
    Scores skills based on:
    - Infrastructure state compatibility (Terraform state, K8s manifests)
    - Cloud provider region availability and cost constraints
    - Historical deployment success rates for similar infrastructure changes
    - Required IAM permissions and service quotas
    
    Args:
        infrastructure_state: Current state of target infrastructure
        available_devops_skills: List of cloud devops skill metadata
        cloud_provider: Target cloud provider (aws, gcp, azure)
        
    Returns:
        Selected skill with deployment context or None if no safe path exists
    """
    if not infrastructure_state or not available_devops_skills:
        raise ValueError("Infrastructure state and skill registry must be populated")
        
    # Validate infrastructure state before scoring (Law 2)
    validated_state = _validate_infrastructure_state(infrastructure_state, cloud_provider)
    
    best_skill = None
    best_score = 0.0
    
    for skill in available_devops_skills:
        # Calculate compatibility score based on infrastructure type
        infra_match = _calculate_infra_compatibility(validated_state, skill)
        # Factor in historical deployment success
        history_score = skill.get("deployment_success_rate", 0.0) * 0.4
        # Check cloud provider region availability
        region_score = _check_region_availability(skill.get("supported_regions", []), cloud_provider)
        
        composite_score = (infra_match * 0.5) + (history_score * 0.3) + (region_score * 0.2)
        
        if composite_score > best_score and composite_score >= 0.75:
            best_score = composite_score
            best_skill = skill
            
    if best_skill is None:
        return None
        
    # Return immutable deployment context (Law 3)
    return {
        "skill": dict(best_skill),
        "deployment_context": validated_state,
        "confidence": best_score,
        "provider": cloud_provider
    }
```


### Pattern 2: Execution with Fallback

```python
def orchestrate_cloud_deployment(
    deployment_plan: Dict,
    max_retries: int = 2,
    fallback_strategy: str = "blue-green"
) -> Dict:
    """Orchestrate cloud infrastructure deployment with resilient fallback chains.
    
    Implements cloud-native resilience patterns:
    - Validates Terraform/K8s manifests before execution
    - Retries transient cloud API errors (rate limits, throttling)
    - Falls back to alternative deployment strategy or region
    - Triggers manual approval for critical production changes
    
    Args:
        deployment_plan: Infrastructure change specification
        max_retries: Maximum retry attempts for transient failures
        fallback_strategy: Fallback deployment method (blue-green, canary, manual)
        
    Returns:
        Deployment result with state, timing, and rollback information
    """
    # Pre-flight validation (Law 1 & 2)
    if not _validate_manifests(deployment_plan.get("manifests", [])):
        raise CloudDeploymentError("Invalid infrastructure manifests detected")
        
    for attempt in range(max_retries + 1):
        try:
            # Execute cloud provider API / Terraform / Kubectl
            result = _apply_infrastructure_changes(deployment_plan)
            
            # Verify post-deployment state
            if _verify_deployment_health(result["deployment_id"]):
                return {
                    "status": "success",
                    "deployment_id": result["deployment_id"],
                    "attempts": attempt + 1,
                    "rollback_url": result.get("rollback_url"),
                    "timestamp": time.time()
                }
                
        except CloudRateLimitError:
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            return _trigger_fallback_deployment(deployment_plan, fallback_strategy)
            
        except CloudStateConflictError as e:
            # Fail fast on state conflicts (Law 4)
            raise CloudDeploymentError(f"State conflict during deployment: {e}") from e
            
    # All retries exhausted
    return _trigger_fallback_deployment(deployment_plan, fallback_strategy)
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