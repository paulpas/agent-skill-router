---
name: git-hooks-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git hooks automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-hooks-automation, git hooks automation, how do i git-hooks-automation,
    orchestrate git-hooks-automation, automate git-hooks-automation, agent git-hooks-automation
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
# Git Hooks Automation

Orchestrates intelligent skill selection and execution for git hooks automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def validate_and_install_hooks(
    hook_type: str,
    config: Dict[str, Any],
    repo_path: str
) -> Dict[str, Any]:
    """Validate and install a git hook with safety checks.
    
    Implements the 5 Laws of Elegant Defense:
    - Law 1: Early exit on invalid hook types or missing repo
    - Law 2: Parse config into immutable structures
    - Law 3: Return new hook script content without mutating original config
    - Law 4: Fail immediately if hook script contains dangerous commands
    """
    # Guard clause - Early Exit (Law 1)
    valid_hooks = {"pre-commit", "pre-push", "commit-msg", "post-commit"}
    if hook_type not in valid_hooks:
        raise ValueError(f"Unsupported hook type: {hook_type}. Must be one of {valid_hooks}")
    
    if not os.path.isdir(repo_path):
        raise FileNotFoundError(f"Repository path does not exist: {repo_path}")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    hook_config = {
        "type": hook_type,
        "commands": config.get("commands", []),
        "timeout": config.get("timeout", 30),
        "allow_bypass": config.get("allow_bypass", False)
    }
    
    # Atomic Predictability (Law 3) - Generate hook script without mutating config
    hook_script = _generate_hook_script(hook_config)
    hook_path = os.path.join(repo_path, ".git", "hooks", hook_type)
    
    # Fail Fast - Validate script safety (Law 4)
    if _contains_dangerous_patterns(hook_script):
        raise SecurityError("Hook script contains potentially dangerous patterns")
    
    # Write hook and set executable
    os.makedirs(os.path.dirname(hook_path), exist_ok=True)
    with open(hook_path, "w") as f:
        f.write(hook_script)
    os.chmod(hook_path, 0o755)
    
    return {
        "hook_type": hook_type,
        "path": hook_path,
        "status": "installed",
        "commands": hook_config["commands"],
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_hook_with_fallback(
    hook_path: str,
    staged_files: List[str],
    env_context: Dict[str, str],
    max_retries: int = 1
) -> Dict[str, Any]:
    """Execute a git hook with staged file validation and fallback handling.
    
    Implements the 5 Laws of Elegant Defense:
    - Law 1: Early exit if hook script is missing or not executable
    - Law 2: Parse staged files into immutable list for validation
    - Law 3: Return new result dict without mutating env_context
    - Law 4: Fail immediately on syntax errors or permission denied
    """
    # Guard clause - Early Exit (Law 1)
    if not os.path.isfile(hook_path) or not os.access(hook_path, os.X_OK):
        raise HookExecutionError(f"Hook not found or not executable: {hook_path}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_files = [os.path.abspath(f) for f in staged_files if os.path.isfile(f)]
    if not validated_files:
        return {"status": "skipped", "reason": "No valid staged files", "timestamp": time.time()}
    
    for attempt in range(max_retries + 1):
        try:
            # Execute hook with staged files passed via stdin or args
            result = subprocess.run(
                [hook_path] + validated_files,
                capture_output=True,
                text=True,
                timeout=60,
                env={**os.environ, **env_context}
            )
            
            # Success - Atomic Predictability (Law 3)
            return {
                "status": "passed",
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "attempts": attempt + 1,
                "timestamp": time.time()
            }
            
        except subprocess.TimeoutExpired:
            # Fail Fast - Don't hang indefinitely (Law 4)
            if attempt == max_retries:
                return _apply_hook_fallback(hook_path, validated_files, "timeout")
            continue
            
        except PermissionError as e:
            raise HookExecutionError(f"Permission denied executing hook: {e}") from e
    
    # All retries exhausted - Fail Loud (Law 4)
    return _apply_hook_fallback(hook_path, validated_files, "max_retries_exceeded")
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
- [Git Hooks Documentation](<https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks>)
- [Husky Git Hooks for JavaScript Projects](<https://typicode.github.io/husky/>)
- [Pre-commit Framework (Python)](<https://pre-commit.com/>)
- [Lint-Staged for Pre-Commit Linting](<https://github.com/okonet/lint-staged>)
- [Commitlint Conventional Commits](<https://commitlint.js.org/>)
