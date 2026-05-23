---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent linux troubleshooting with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: linux-troubleshooting, linux troubleshooting, how do i linux-troubleshooting,
    orchestrate linux-troubleshooting, automate linux-troubleshooting, agent linux-troubleshooting
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
name: linux-troubleshooting
------
# Linux Troubleshooting

Orchestrates intelligent skill selection and execution for linux troubleshooting workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_system_state(
    command_outputs: Dict[str, str],
    thresholds: Dict[str, float]
) -> Dict[str, Any]:
    """Analyze raw Linux command outputs to identify resource bottlenecks and service failures.
    
    Maps raw stdout/stderr from diagnostic commands to structured findings.
    Handles common failure patterns: disk full, OOM, high load, network drops.
    
    Args:
        command_outputs: Dict mapping command names to their raw output strings
        thresholds: Dict of warning/critical thresholds (e.g., {'disk_usage': 0.9, 'load_avg': 4.0})
        
    Returns:
        Structured findings with severity, affected components, and recommended actions
    """
    findings = []
    
    # Parse disk usage from df output
    if "df -h" in command_outputs:
        for line in command_outputs["df -h"].splitlines():
            if line.startswith("/dev/"):
                parts = line.split()
                mount = parts[5]
                usage_pct = float(parts[4].rstrip('%'))
                if usage_pct > thresholds.get("disk_usage", 0.9):
                    findings.append({
                        "component": "filesystem",
                        "mount": mount,
                        "severity": "critical" if usage_pct > 0.95 else "warning",
                        "message": f"Disk usage at {usage_pct}% on {mount}",
                        "action": f"Clean up {mount} or expand volume"
                    })
                    
    # Parse memory from free output
    if "free -m" in command_outputs:
        for line in command_outputs["free -m"].splitlines():
            if line.startswith("Mem:"):
                total, used, _, _, _, _ = map(float, line.split()[1:7])
                mem_pct = used / total if total > 0 else 0
                if mem_pct > thresholds.get("memory_usage", 0.85):
                    findings.append({
                        "component": "memory",
                        "severity": "critical" if mem_pct > 0.95 else "warning",
                        "message": f"Memory usage at {mem_pct:.1%}",
                        "action": "Check for memory leaks or increase swap"
                    })
                    
    # Parse load average from uptime
    if "uptime" in command_outputs:
        load_line = command_outputs["uptime"]
        loads = [float(x) for x in load_line.split("load average:")[1].split(",")]
        if loads[0] > thresholds.get("load_avg", 4.0):
            findings.append({
                "component": "cpu",
                "severity": "warning",
                "message": f"System load average: {loads[0]:.2f}",
                "action": "Identify CPU-bound processes with top or htop"
            })
            
    return {"findings": findings, "status": "critical" if any(f["severity"] == "critical" for f in findings) else "healthy"}
```


### Pattern 2: Execution with Fallback

```python
def execute_diagnostic_chain(
    service_name: str,
    fallback_commands: List[str],
    timeout: int = 10
) -> Dict[str, Any]:
    """Execute a targeted diagnostic chain for a failing Linux service.
    
    Implements a fallback execution strategy:
    1. Primary: systemctl status + journalctl -u
    2. Fallback 1: Check specific log files in /var/log/
    3. Fallback 2: Network/port verification if service is network-facing
    
    Args:
        service_name: Name of the systemd service to diagnose
        fallback_commands: List of alternative diagnostic commands to run if primary fails
        timeout: Maximum seconds to wait for each command execution
        
    Returns:
        Diagnostic report with exit codes, output snippets, and root cause hypothesis
    """
    import subprocess
    
    primary_commands = [
        f"systemctl status {service_name}",
        f"journalctl -u {service_name} --no-pager -n 50"
    ]
    
    results = {"service": service_name, "commands_executed": [], "hypothesis": None}
    
    for cmd in primary_commands + fallback_commands:
        try:
            proc = subprocess.run(
                cmd.split(),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            results["commands_executed"].append({
                "command": cmd,
                "exit_code": proc.returncode,
                "stdout_snippet": proc.stdout[:500],
                "stderr_snippet": proc.stderr[:500]
            })
            
            # Early exit on success or critical error
            if proc.returncode == 0 and "active (running)" in proc.stdout:
                results["hypothesis"] = "Service is healthy; issue may be transient or configuration-related"
                break
            elif proc.returncode != 0 and "failed" in proc.stderr.lower():
                results["hypothesis"] = f"Service {service_name} failed to start. Check logs for dependency or permission errors."
                break
                
        except subprocess.TimeoutExpired:
            results["commands_executed"].append({
                "command": cmd,
                "error": "timeout",
                "message": f"Command timed out after {timeout}s"
            })
        except FileNotFoundError:
            results["commands_executed"].append({
                "command": cmd,
                "error": "missing_binary",
                "message": f"Command not found: {cmd}"
            })
            
    return results
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