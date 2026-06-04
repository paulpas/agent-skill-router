---
name: stacktrace-root-cause
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent stacktrace root cause with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: stacktrace-root-cause, stacktrace root cause, how do i stacktrace-root-cause,
    orchestrate stacktrace-root-cause, automate stacktrace-root-cause, agent stacktrace-root-cause
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
# Stacktrace Root Cause

Orchestrates intelligent skill selection and execution for stacktrace root cause workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
import re
from dataclasses import dataclass
from typing import List, Optional, Dict

@dataclass
class StackFrame:
    module: str
    function: str
    line: int
    file: str
    is_root_cause: bool = False

def parse_stacktrace(raw_trace: str) -> List[StackFrame]:
    """Parse raw stacktrace string into structured frames.
    Identifies root cause by finding the deepest application-level frame
    that matches known error signatures or exception types.
    """
    if not raw_trace or not raw_trace.strip():
        raise ValueError("Stacktrace cannot be empty")

    frames = []
    frame_pattern = re.compile(r"^\s*at\s+([\w.$]+)\.([\w$]+)\(([^:]+):(\d+)\)")

    for line in raw_trace.splitlines():
        match = frame_pattern.match(line)
        if match:
            module, func, file, line_num = match.groups()
            frames.append(StackFrame(
                module=module,
                function=func,
                line=int(line_num),
                file=file
            ))

    if not frames:
        return []

    # Identify root cause: typically the deepest frame before framework wrappers
    for i in range(len(frames) - 1, -1, -1):
        frame = frames[i]
        if any(frame.module.startswith(prefix) for prefix in ("java.", "javax.", "sun.", "org.springframework.", "com.google.")):
            continue
        frames[i].is_root_cause = True
        break

    return frames
```


### Pattern 2: Execution with Fallback

```python
def analyze_root_cause(frames: List[StackFrame], error_context: Dict) -> Dict:
    """Analyze parsed stacktrace frames to determine root cause and generate fix recommendations.
    Matches frames against known error signatures and applies domain-specific heuristics.
    """
    if not frames:
        return {"status": "unparsable", "message": "No valid frames found"}

    root_frame = next((f for f in frames if f.is_root_cause), frames[-1])
    error_type = error_context.get("exception_type", "UnknownError")
    signature_key = f"{root_frame.module}.{root_frame.function}"

    known_issues = _lookup_error_signature(signature_key, error_type)
    if known_issues:
        return {
            "status": "matched",
            "root_cause": known_issues["description"],
            "suggested_fix": known_issues["fix"],
            "confidence": known_issues["confidence"],
            "affected_module": root_frame.module,
            "file": root_frame.file,
            "line": root_frame.line
        }

    # Fallback heuristic analysis for unknown errors
    return {
        "status": "heuristic_analysis",
        "root_cause": f"Unrecognized error in {root_frame.module}.{root_frame.function}",
        "suggested_fix": "Review recent changes to the affected module. Check for null references, boundary condition failures, or dependency version mismatches.",
        "confidence": 0.65,
        "affected_module": root_frame.module,
        "file": root_frame.file,
        "line": root_frame.line
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
|---|---|
| `runtime-log-analyzer` | Correlates stack traces with runtime log patterns for comprehensive root cause analysis |
| `incident-response` | Triggers incident response workflows when root cause analysis identifies critical issues |

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

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Stack Trace Analysis Guide (Mozilla Developer Network)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Debugging_overview#stack_traces) — MDN's guide to understanding and analyzing JavaScript stack traces
- [Java Stack Trace Tutorial (Oracle)](https://docs.oracle.com/javase/tutorial/essential/environment/exceptions.html) — Oracle's documentation on Java exception handling and stack trace analysis
- [Python Exception Handling and Tracebacks](https://docs.python.org/3/tutorial/errors.html#tracebacks) — Python official docs on understanding tracebacks and exception chains
- [Root Cause Analysis Methodology (IBM)](https://www.ibm.com/think/topics/root-cause-analysis) — IBM's comprehensive guide to systematic root cause analysis techniques
- [Google SRE: Debugging Stack Traces](https://sre.google/sre-workbook/debugging/) — Google SRE workbook chapter on debugging with stack traces and error logs