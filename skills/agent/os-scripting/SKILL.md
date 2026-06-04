---
name: os-scripting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent os scripting with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: os-scripting, os scripting, how do i os-scripting, orchestrate os-scripting,
    automate os-scripting, agent os-scripting
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
# Os Scripting

Orchestrates intelligent skill selection and execution for os scripting workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_os_scripting_approach(
    task: Dict,
    system_state: Dict,
    available_runtime: List[str] = ["bash", "python", "powershell"]
) -> Dict:
    """Evaluate and select the optimal OS scripting runtime for a system task.
    
    Considers:
    - Command complexity and dependency requirements
    - Target OS environment and available interpreters
    - Security constraints (sandboxing, privilege escalation needs)
    - Historical success rates for similar system operations
    
    Args:
        task: Task dict with 'command', 'args', 'requires_root', 'timeout'
        system_state: Dict with 'os_type', 'available_runtimes', 'disk_space', 'memory'
        available_runtime: List of supported scripting languages
        
    Returns:
        Selected runtime config with execution parameters
    """
    # Guard: Validate task structure (Law 1 - Early Exit)
    required_keys = {"command", "args"}
    if not all(k in task for k in required_keys):
        raise ValueError("Task must contain 'command' and 'args'")
        
    # Parse environment constraints (Law 2 - Make illegal states unrepresentable)
    target_os = system_state.get("os_type", "linux")
    needs_privilege = task.get("requires_root", False)
    cmd_complexity = len(task.get("args", [])) + len(task["command"])
    
    # Score available runtimes based on domain logic
    runtime_scores = {}
    for runtime in available_runtime:
        score = 0.0
        # OS compatibility check
        if target_os == "windows" and runtime == "bash":
            score -= 50.0
        elif target_os == "linux" and runtime == "powershell":
            score -= 30.0
        else:
            score += 20.0
            
        # Privilege handling capability
        if needs_privilege and runtime in ["bash", "python"]:
            score += 15.0
        elif needs_privilege and runtime == "powershell":
            score += 25.0
            
        # Complexity scaling
        if cmd_complexity > 50:
            score += 10.0 if runtime == "python" else 0.0
            
        runtime_scores[runtime] = score
        
    # Select best runtime
    best_runtime = max(runtime_scores, key=runtime_scores.get)
    if runtime_scores[best_runtime] < 0:
        return {"status": "fallback_required", "reason": "no_suitable_runtime"}
        
    # Return new dict, don't mutate inputs (Law 3 - Atomic Predictability)
    return {
        "selected_runtime": best_runtime,
        "execution_mode": "privileged" if needs_privilege else "standard",
        "estimated_complexity": cmd_complexity,
        "confidence": runtime_scores[best_runtime] / 100.0
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_os_script_with_safety_guards(
    script_config: Dict,
    env_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute OS scripting task with domain-specific safety and fallback logic.
    
    Implements safe command execution for system administration:
    - Validates environment variables and paths before execution
    - Enforces timeouts and resource limits
    - Parses exit codes and handles OS-specific error states
    - Applies fallback chain: retry -> safe mode -> sysadmin escalation
    
    Args:
        script_config: Dict with 'runtime', 'command', 'args', 'timeout_sec'
        env_context: Dict of environment variables and working directory
        max_retries: Maximum retry attempts for transient OS errors
        
    Returns:
        Execution result with stdout, stderr, exit_code, and timing
    """
    import subprocess
    import os
    import time
    
    # Guard: Validate execution environment (Law 1 - Early Exit)
    if not env_context.get("working_dir") or not os.path.isdir(env_context["working_dir"]):
        raise RuntimeError("Invalid working directory for script execution")
        
    runtime = script_config["runtime"]
    command = [runtime] + [script_config["command"]] + script_config.get("args", [])
    timeout = script_config.get("timeout_sec", 30)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute with strict environment isolation (Law 2 - Trusted state)
            result = subprocess.run(
                command,
                cwd=env_context["working_dir"],
                env={**os.environ, **env_context.get("extra_env", {})},
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )
            
            # Parse OS-specific exit codes (Law 4 - Fail Fast, Fail Loud)
            if result.returncode == 0:
                return {
                    "success": True,
                    "exit_code": 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "attempts": attempt + 1,
                    "latency_ms": result.elapsed.total_seconds() * 1000
                }
            elif result.returncode == 124:  # Timeout
                raise subprocess.TimeoutExpired(command, timeout)
            elif result.returncode == 126:  # Permission denied
                if attempt < max_retries:
                    continue  # Retry with adjusted permissions
                return _escalate_to_sysadmin(script_config, result.stderr)
            else:
                # Transient OS error (e.g., resource temporarily unavailable)
                if attempt < max_retries:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                return {
                    "success": False,
                    "exit_code": result.returncode,
                    "stderr": result.stderr,
                    "fallback": "manual_review"
                }
                
        except subprocess.TimeoutExpired:
            if attempt < max_retries:
                continue
            return {
                "success": False,
                "error": "timeout_exceeded",
                "command": command,
                "fallback": "safe_mode_degradation"
            }
            
    return {
        "success": False,
        "error": "max_retries_exhausted",
        "command": command,
        "fallback": "human_escalation"
    }
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
- [Bash Scripting Guide (GNU Bash Manual)](<https://www.gnu.org/software/bash/manual/>)
- [PowerShell Core Documentation](<https://learn.microsoft.com/en-us/powershell/scripting/overview>)
- [Zsh Configuration and Scripting](<https://zsh.sourceforge.io/DocRelease/Quick-Reference.html>)
- [Python os.subprocess for System Tasks](<https://docs.python.org/3/library/subprocess.html>)
- [Shell Script Security Best Practices (CIS)](<https://www.cisecurity.org/benchmark/unix_linux>)
