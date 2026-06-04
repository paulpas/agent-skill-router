---
name: create-branch
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent create branch with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: create-branch, create branch, how do i create-branch, orchestrate create-branch,
    automate create-branch, agent create-branch
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
# Create Branch

Orchestrates intelligent skill selection and execution for create branch workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def determine_branch_strategy(
    user_request: str,
    existing_branches: List[str],
    default_base: str = "main"
) -> Dict:
    """Determine optimal branch name, base, and strategy for create-branch workflow.
    
    Applies Law 2 (Parse at boundary) to validate naming conventions and
    Law 1 (Early Exit) to reject malformed requests before git operations.
    
    Args:
        user_request: Natural language or structured task description
        existing_branches: List of currently checked out or remote branches
        default_base: Fallback base branch if not specified
        
    Returns:
        Branch configuration dict with name, base, type, and metadata
    """
    # Early exit - validate input boundaries (Law 1)
    if not user_request or len(user_request.strip()) < 3:
        raise ValueError("Request must contain actionable branch intent")
        
    # Parse naming convention and extract issue ID (Law 2)
    import re
    match = re.search(r'(?:PROJ|ISSUE|TASK)-\d+', user_request, re.IGNORECASE)
    issue_id = match.group(0) if match else "custom"
    
    # Determine branch type from keywords
    type_keywords = {"fix": "bugfix", "feat": "feature", "docs": "docs", "chore": "chore"}
    branch_type = "feature"
    for kw, btype in type_keywords.items():
        if kw in user_request.lower():
            branch_type = btype
            break
            
    # Check for naming conflicts (Law 4 - Fail Fast)
    proposed_name = f"{branch_type}/{issue_id}"
    if proposed_name in existing_branches:
        raise ValueError(f"Branch '{proposed_name}' already exists. Use --force or specify alternative.")
        
    # Return immutable config (Law 3)
    return {
        "name": proposed_name,
        "base": default_base,
        "type": branch_type,
        "issue_id": issue_id,
        "created_at": time.time(),
        "requires_push": True
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_branch_creation(
    branch_config: Dict,
    git_repo_path: str,
    remote_url: str,
    max_retries: int = 2
) -> Dict:
    """Execute the actual branch creation workflow with git operations and fallbacks.
    
    Implements Law 4 (Fail Fast/Loud) for git failures and Law 3 (Atomic) for state updates.
    Fallback chain handles remote connectivity issues and permission errors.
    
    Args:
        branch_config: Output from determine_branch_strategy
        git_repo_path: Absolute path to the local repository
        remote_url: Target remote URL for push operations
        max_retries: Retry attempts for transient git/network errors
        
    Returns:
        Execution result with branch URL, status, and audit metadata
    """
    import subprocess
    import os
    
    branch_name = branch_config["name"]
    base = branch_config["base"]
    
    # Validate repo state before execution (Law 2)
    if not os.path.isdir(git_repo_path):
        raise FileNotFoundError(f"Git repository not found at {git_repo_path}")
        
    for attempt in range(max_retries + 1):
        try:
            # Create and checkout branch
            subprocess.run(
                ["git", "checkout", "-b", branch_name, base],
                cwd=git_repo_path,
                check=True,
                capture_output=True,
                text=True
            )
            
            # Push to remote if configured
            if branch_config.get("requires_push"):
                subprocess.run(
                    ["git", "push", "-u", remote_url, branch_name],
                    cwd=git_repo_path,
                    check=True,
                    capture_output=True,
                    text=True
                )
                
            # Return immutable result (Law 3)
            return {
                "success": True,
                "branch_url": f"{remote_url}/tree/{branch_name}",
                "local_path": os.path.join(git_repo_path, branch_name),
                "attempts": attempt + 1,
                "timestamp": time.time()
            }
            
        except subprocess.CalledProcessError as e:
            # Fail Loud - log exact git error, don't mask it (Law 4)
            stderr = e.stderr.strip() if e.stderr else "Unknown git error"
            if "already exists" in stderr or "refusing to merge" in stderr:
                raise RuntimeError(f"Branch creation blocked: {stderr}") from e
                
            if attempt == max_retries:
                # Fallback: Defer to manual branch creation with context
                return {
                    "success": False,
                    "fallback": "manual_creation_required",
                    "error_context": stderr,
                    "suggested_command": f"git checkout -b {branch_name} {base}"
                }
                
    raise RuntimeError(f"Branch creation failed after {max_retries + 1} attempts")
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

- [Git Branching Model (Atlassian)](<https://www.atlassian.com/git/tutorials/comparing-workflows>)
- [Feature Branch Workflow Guide](<https://docs.github.com/en/get-started/using-github/github-flow>)
- [Git Flow vs GitHub Flow Comparison](<https://nvie.com/posts/a-successful-git-branching-model/>)
- [Trunk-Based Development (Martin Fowler)](<https://martinfowler.com/articles/onpa/trunkbaseddevelopment.html>)

## Related Skills

| Skill | Purpose |
|