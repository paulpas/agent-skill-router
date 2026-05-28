---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git pushing with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-pushing, git pushing, how do i git-pushing, orchestrate git-pushing,
    automate git-pushing, agent git-pushing
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
name: git-pushing
------
# Git Pushing

Orchestrates intelligent skill selection and execution for git pushing workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_git_state_and_select_strategy(
    repo_path: str,
    branch: str,
    remote: str,
    force_allowed: bool = False
) -> Dict[str, Any]:
    """Analyze local/remote git state and select optimal push strategy.
    
    Implements Law 2 (Parse at boundary) by validating repo state before execution.
    Returns a strategy dict with confidence scores for each push method.
    """
    import subprocess
    from pathlib import Path
    
    if not Path(repo_path).joinpath(".git").exists():
        raise ValueError(f"Not a git repository: {repo_path}")
        
    # Parse current state
    local_head = subprocess.check_output(["git", "-C", repo_path, "rev-parse", "HEAD"]).decode().strip()
    remote_head = subprocess.check_output(
        ["git", "-C", repo_path, "rev-parse", f"{remote}/{branch}"],
        stderr=subprocess.DEVNULL
    ).decode().strip()
    
    uncommitted = subprocess.check_output(
        ["git", "-C", repo_path, "diff", "--stat"], stderr=subprocess.DEVNULL
    ).decode().strip()
    
    # Calculate strategy scores
    strategies = []
    if local_head == remote_head:
        strategies.append({"method": "skip", "confidence": 1.0, "reason": "Already up to date"})
    elif local_head in subprocess.check_output(["git", "-C", repo_path, "merge-base", "--all", local_head, remote_head]).decode():
        strategies.append({"method": "normal", "confidence": 0.95, "reason": "Fast-forward possible"})
    else:
        strategies.append({"method": "rebase", "confidence": 0.85, "reason": "Diverged history"})
        if force_allowed:
            strategies.append({"method": "force", "confidence": 0.6, "reason": "Force push available"})
            
    # Return highest confidence strategy that meets threshold
    best = max(strategies, key=lambda s: s["confidence"])
    if best["confidence"] < 0.5:
        return {"strategy": "queue", "confidence": 0.0, "reason": "State ambiguous, defer to manual review"}
        
    return best
```


### Pattern 2: Execution with Fallback

```python
def execute_git_push_with_fallback(
    strategy: Dict[str, Any],
    repo_path: str,
    branch: str,
    remote: str,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute git push with domain-specific fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by catching specific git exit codes
    and routing to appropriate fallback strategies.
    """
    import subprocess
    import time
    
    def run_git(args: list) -> str:
        result = subprocess.run(args, capture_output=True, text=True)
        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, args, result.stdout, result.stderr)
        return result.stdout
        
    for attempt in range(max_retries + 1):
        try:
            if strategy["method"] == "skip":
                return {"success": True, "action": "skipped", "message": "Remote already current"}
                
            cmd = ["git", "-C", repo_path, "push", remote, branch]
            if strategy["method"] == "force":
                cmd.extend(["--force-with-lease"])
                
            output = run_git(cmd)
            return {
                "success": True,
                "action": strategy["method"],
                "output": output.strip(),
                "attempts": attempt + 1,
                "timestamp": time.time()
            }
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.lower()
            if "non-fast-forward" in stderr and strategy["method"] == "normal":
                strategy["method"] = "rebase"
                strategy["confidence"] = 0.7
                continue
            elif "refusing to merge unrelated histories" in stderr:
                strategy["method"] = "normal"
                cmd = ["git", "-C", repo_path, "push", remote, branch, "--allow-unrelated-histories"]
                output = run_git(cmd)
                return {"success": True, "action": "normal", "output": output.strip(), "attempts": attempt + 1}
            elif attempt == max_retries:
                return {
                    "success": False,
                    "error": "Push rejected after retries",
                    "stderr": e.stderr,
                    "fallback": "queue_for_manual_review"
                }
            time.sleep(0.5 * (attempt + 1))
            
    return {"success": False, "error": "Max retries exceeded", "fallback": "queue_for_manual_review"}
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Git Push Documentation](<https://git-scm.com/docs/git-push>)
- [GitHub Flow - Pushing to Remote](<https://docs.github.com/en/get-started/quickstart/github-flow>)
- [Git Rebase vs Merge Decision](<https://www.atlassian.com/git/tutorials/merging-vs-rebasing>)
- [Pushing Protected Branches (GitHub Docs)](<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>)
- [Git Remote Management](<https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes>)
