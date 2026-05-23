---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git pr workflows git workflow with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-pr-workflows-git-workflow, git pr workflows git workflow, how do i
    git-pr-workflows-git-workflow, orchestrate git-pr-workflows-git-workflow, automate
    git-pr-workflows-git-workflow, agent git-pr-workflows-git-workflow
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
name: git-pr-workflows-git-workflow
------
# Git Pr Workflows Git Workflow

Orchestrates intelligent skill selection and execution for git pr workflows git workflow workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_pr_workflow_strategy(
    branch_name: str,
    target_branch: str,
    ci_status: str,
    review_requirements: List[str]
) -> Dict:
    """Evaluate the optimal Git PR workflow strategy based on current state.
    
    Applies Law 2 (Make Illegal States Unrepresentable) by validating
    branch states and CI results before selecting a workflow path.
    
    Args:
        branch_name: Source branch for the PR
        target_branch: Destination branch
        ci_status: Current CI pipeline status (passing, failing, pending)
        review_requirements: List of required reviewers or approval rules
        
    Returns:
        Strategy dict with workflow type, required actions, and confidence
    """
    # Guard clause - Early Exit (Law 1)
    if not branch_name or not target_branch:
        raise ValueError("Both source and target branches must be specified")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    workflow_state = _analyze_git_state(branch_name, target_branch)
    
    if ci_status == "failing":
        strategy = {
            "workflow_type": "fix_and_retest",
            "priority": "high",
            "confidence": 0.95,
            "next_action": "run_local_checks_and_push_fix"
        }
    elif "required_reviewer" in review_requirements and not workflow_state.get("approved"):
        strategy = {
            "workflow_type": "await_review",
            "priority": "medium",
            "confidence": 0.85,
            "next_action": "request_reviews_and_wait"
        }
    else:
        strategy = {
            "workflow_type": "auto_merge",
            "priority": "low",
            "confidence": 0.90,
            "next_action": "execute_merge_with_checks"
        }
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate inputs
    strategy["evaluated_at"] = time.time()
    strategy["branch_context"] = dict(workflow_state)
    return strategy
```


### Pattern 2: Execution with Fallback

```python
def execute_pr_workflow_step(
    strategy: Dict,
    repo_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a Git PR workflow step with resilience and fallback chains.
    
    Implements Fail Fast, Fail Loud (Law 4) for git operations:
    - Invalid branch states halt immediately
    - CI failures trigger local validation fallback
    - Merge blocks trigger manual review escalation
    
    Args:
        strategy: Evaluated workflow strategy from evaluate_pr_workflow_strategy
        repo_context: Repository configuration and authentication context
        max_retries: Maximum retry attempts for transient git/CI errors
        
    Returns:
        Execution result with PR URL, status, and audit metadata
    """
    # Guard clause - validate repo context (Early Exit)
    if not _is_repo_accessible(repo_context):
        raise GitWorkflowError("Repository is inaccessible or credentials invalid")
        
    workflow_type = strategy.get("workflow_type")
    result = {"success": False, "workflow_type": workflow_type}
    
    for attempt in range(max_retries + 1):
        try:
            if workflow_type == "fix_and_retest":
                pr_data = _push_fix_and_update_pr(repo_context, strategy)
            elif workflow_type == "await_review":
                pr_data = _request_reviews_and_monitor(repo_context, strategy)
            else:
                pr_data = _execute_safe_merge(repo_context, strategy)
                
            # Success - Atomic Predictability (Law 3)
            result.update({
                "success": True,
                "pr_url": pr_data.get("url"),
                "status": pr_data.get("state"),
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            })
            break
            
        except CIExecutionError as e:
            # Fail Fast - Don't proceed with failing CI (Law 4)
            if attempt == max_retries:
                return _apply_ci_fallback(repo_context, strategy, e)
            continue
            
        except MergeConflictError as e:
            # Transient conflict - try rebase fallback
            if attempt == max_retries:
                return _apply_merge_fallback(repo_context, strategy, e)
            continue
            
    if not result["success"]:
        raise GitWorkflowError(f"Workflow '{workflow_type}' exhausted retries")
        
    return result
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