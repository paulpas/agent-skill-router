---
name: git-advanced-workflows
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git advanced workflows with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-advanced-workflows, git advanced workflows, how do i git-advanced-workflows,
    orchestrate git-advanced-workflows, automate git-advanced-workflows, agent git-advanced-workflows
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
# Git Advanced Workflows

Orchestrates intelligent skill selection and execution for git advanced workflows workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_git_workflow(
    request: str,
    repo_state: Dict[str, Any],
    strategy_map: Dict[str, Callable]
) -> Dict[str, Any]:
    """Map a natural language git request to a concrete advanced workflow.
    
    Handles common advanced patterns: rebase, cherry-pick, bisect, interactive squash.
    Validates repository state before committing to a strategy.
    
    Args:
        request: Natural language description of the git operation
        repo_state: Current repository metadata (branch, commits, remotes)
        strategy_map: Mapping of intents to git execution functions
        
    Returns:
        Workflow plan with strategy, prerequisites, and fallback actions
        
    Raises:
        ValueError: If request is empty or repo state violates workflow constraints
    """
    # Guard clause - Early Exit (Law 1)
    if not request.strip():
        raise ValueError("Git workflow request cannot be empty")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    intent = _parse_git_intent(request)
    current_branch = repo_state.get("current_branch", "HEAD")
    has_unpushed = repo_state.get("has_unpushed_commits", False)
    is_detached = repo_state.get("is_detached_head", False)
    
    # Validate state constraints for advanced workflows
    if intent == "rebase" and is_detached:
        raise ValueError("Cannot rebase from detached HEAD state")
    if intent == "rebase" and has_unpushed and not repo_state.get("allow_force_push", False):
        raise ValueError("Rebase requires force push; set allow_force_push=True or use merge")
        
    # Select strategy based on intent and repo state
    strategy = strategy_map.get(intent)
    if not strategy:
        return {"status": "unrecognized_intent", "suggested": ["merge", "cherry-pick", "revert"]}
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate repo_state
    return {
        "workflow": intent,
        "strategy": strategy.__name__,
        "prerequisites": _check_prerequisites(intent, repo_state),
        "fallback_actions": ["git reset --hard", "git checkout -"],
        "confidence": 0.95 if intent in strategy_map else 0.4
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_git_workflow(
    workflow_plan: Dict[str, Any],
    repo_path: str,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute an advanced git workflow with built-in conflict resolution fallbacks.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid states halt immediately with descriptive errors
    - No silent failures or partial results
    
    Fallback chain:
    1. Retry with original parameters
    2. Abort and switch to alternative strategy (e.g., merge instead of rebase)
    3. Defer to human operator for manual conflict resolution
    
    Args:
        workflow_plan: Resolved workflow plan from Pattern 1
        repo_path: Absolute path to the git repository
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with success status, output, and timing metadata
        
    Raises:
        GitWorkflowError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate plan (Early Exit)
    if not workflow_plan.get("strategy"):
        raise GitWorkflowError("No execution strategy provided in workflow plan")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_plan = _validate_git_plan(workflow_plan, repo_path)
    
    for attempt in range(max_retries + 1):
        try:
            result = subprocess.run(
                validated_plan["command"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "workflow_executed": validated_plan["strategy"],
                "output": result.stdout,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.lower()
            if "conflict" in stderr or "not fast-forward" in stderr:
                # Transient conflict - try fallback
                if attempt == max_retries:
                    return _apply_git_fallback(validated_plan, repo_path)
                continue
            else:
                # Fail Fast - Don't try to patch bad data (Law 4)
                raise GitWorkflowError(f"Git command failed: {stderr}") from e
                
    # All retries exhausted - Fail Loud (Law 4)
    raise GitWorkflowError(f"Failed to execute {validated_plan['strategy']} after {max_retries + 1} attempts")
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
- [Git Documentation - Advanced Operations](<https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History>)
- [GitHub Flow vs GitFlow (Atlassian)](<https://www.atlassian.com/git/tutorials/comparing-workflows>)
- [Git Rebase Interactive Workflow](<https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History#_interactive_rebase>)
- [Bisect for Binary Search Debugging (Git Docs)](<https://git-scm.com/docs/git-bisect>)
- [Cherry-Pick in Git (Pro Git Book)](<https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History#_cherry_pick>)
