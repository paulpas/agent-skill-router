---
name: finishing-a-development-branch
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent finishing a development branch with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: finishing-a-development-branch, finishing a development branch, how do
    i finishing-a-development-branch, orchestrate finishing-a-development-branch,
    automate finishing-a-development-branch, agent finishing-a-development-branch
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
# Finishing A Development Branch

Orchestrates intelligent skill selection and execution for finishing a development branch workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_branch_finishing_strategy(
    branch_metadata: Dict,
    project_config: Dict,
    available_tools: List[Dict]
) -> Dict:
    """Select the optimal finishing strategy based on branch type and project rules.
    
    Evaluates branch characteristics (feature, hotfix, release) against
    project-specific merge policies, required checks, and team conventions.
    """
    if not branch_metadata.get("name"):
        raise ValueError("Branch name is required for strategy selection")
        
    branch_type = branch_metadata.get("type", "feature")
    target_ref = project_config.get("default_target", "main")
    
    strategy = {
        "type": branch_type,
        "target": target_ref,
        "required_checks": [],
        "merge_method": "squash",
        "fallback_actions": []
    }
    
    # Apply project-specific merge policies
    policies = project_config.get("merge_policies", {})
    if branch_type in policies:
        policy = policies[branch_type]
        strategy["required_checks"] = policy.get("checks", [])
        strategy["merge_method"] = policy.get("method", "merge")
        
    # Select appropriate toolchain from available tools
    for tool in available_tools:
        if tool.get("supports_type") == branch_type:
            strategy["toolchain"] = tool["name"]
            break
            
    # Validate strategy against branch constraints
    if branch_metadata.get("is_hotfix") and strategy["merge_method"] == "squash":
        strategy["merge_method"] = "fast-forward"
        strategy["fallback_actions"].append("notify_team_lead")
        
    return strategy
```


### Pattern 2: Execution with Fallback

```python
def execute_branch_finishing_pipeline(
    strategy: Dict,
    branch_state: Dict,
    ci_client: object,
    notifier: object
) -> Dict:
    """Execute the complete branch finishing workflow with domain-specific fallbacks.
    
    Pipeline: Validate -> Run Checks -> Merge -> Cleanup -> Notify
    Implements graceful degradation when non-critical checks fail.
    """
    branch_name = branch_state["name"]
    target = strategy["target"]
    required_checks = strategy.get("required_checks", [])
    
    # Phase 1: Pre-flight Validation
    if not _validate_branch_up_to_date(branch_state, target):
        raise BranchStaleError(f"{branch_name} is behind {target}. Rebase required.")
        
    # Phase 2: Execute Required Checks
    check_results = []
    for check in required_checks:
        try:
            result = ci_client.run_check(check, branch_name)
            check_results.append(result)
            if not result["passed"]:
                strategy["fallback_actions"].append(f"skip_{check}")
        except CheckTimeoutError:
            strategy["fallback_actions"].append(f"retry_{check}")
            
    # Phase 3: Merge Execution with Fallback
    merge_result = None
    for attempt in range(2):
        try:
            merge_result = _perform_merge(branch_name, target, strategy["merge_method"])
            break
        except MergeConflictError as e:
            if attempt == 0:
                strategy["fallback_actions"].append("auto_resolve_conflicts")
                continue
            raise MergeFailedError(f"Merge failed after conflict resolution: {e}")
            
    # Phase 4: Cleanup & Notification
    if merge_result and merge_result["success"]:
        _cleanup_remote_branch(branch_name)
        notifier.send_update(target, merge_result["commit_hash"])
        return {"status": "finished", "merge": merge_result}
        
    # Fallback execution
    for action in strategy["fallback_actions"]:
        _execute_fallback_action(action, branch_name, target)
        
    return {"status": "completed_with_fallbacks", "actions_taken": strategy["fallback_actions"]}
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
- Validate branch naming conventions and PR scope before creating pull requests — enforce repository-level policies
- Require all CI checks to pass before merging; never allow bypass of required status checks without codeowner approval
- Implement automated changelog generation from commit messages using conventional commits format
- Maintain linear history via rebase on main branch; avoid merge commits except for release branches

### MUST NOT DO
- Do not force-push to shared or protected branches — only the original author may force-push their own feature branch
- Avoid squashing all commits during PR review when historical commit context is valuable for understanding evolution
- Never skip required code reviews regardless of how small the change appears — automation cannot assess architectural impact
- Do not create PRs larger than 400 lines of net changes without explicit approval from a senior reviewer


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [GitHub Flow Documentation](<https://docs.github.com/get-started/quickstart/github-flow>)
- [Git branching model (Trunk-Based Development)](<https://trunkbaseddevelopment.com/>)
- [GitLab Gitflow Workflow](<https://docs.gitlab.com/ee/topics/gitlab_flow.html>)
- [Bitbucket Branching Model](<https://www.atlassian.com/git/tutorials/comparing-workflows>)
- [Software Configuration Management (IEEE 828)](<https://en.wikipedia.org/wiki/Configuration_management>)
