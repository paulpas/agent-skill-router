---
name: skill-scanner
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill scanner with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-scanner, skill scanner, how do i skill-scanner, orchestrate skill-scanner,
    automate skill-scanner, agent skill-scanner
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
# Skill Scanner

Orchestrates intelligent skill selection and execution for skill scanner workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def scan_and_route_task(task_input: str, skill_registry: dict) -> dict:
    """Scan available skills and route task to the best matching handler.
    
    Implements multi-factor scoring: trigger overlap, historical success, and dependency health.
    """
    # Parse and normalize input
    normalized_task = task_input.strip().lower()
    if not normalized_task:
        raise ValueError("Empty task input provided to scanner")
        
    # Extract semantic features for matching
    task_tokens = set(normalized_task.split())
    candidates = []
    
    for skill_name, metadata in skill_registry.items():
        # Calculate trigger overlap score
        skill_triggers = set(t.lower() for t in metadata.get("triggers", []))
        overlap = len(task_tokens & skill_triggers) / max(len(task_tokens), len(skill_triggers))
        
        # Factor in historical success rate
        history_score = metadata.get("success_rate", 0.0) * 0.4
        
        # Factor in dependency health
        deps_healthy = all(
            skill_registry.get(dep, {}).get("status") == "active" 
            for dep in metadata.get("dependencies", [])
        )
        dep_score = 0.3 if deps_healthy else 0.0
        
        total_score = (overlap * 0.5) + history_score + dep_score
        candidates.append({
            "name": skill_name,
            "score": round(total_score, 3),
            "metadata": metadata
        })
        
    # Sort by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Apply minimum confidence threshold
    best_match = candidates[0] if candidates else None
    if best_match and best_match["score"] >= 0.65:
        return {
            "selected_skill": best_match["name"],
            "confidence": best_match["score"],
            "fallback_candidates": [c["name"] for c in candidates[1:3] if c["score"] > 0.4]
        }
        
    return {"selected_skill": None, "confidence": 0.0, "fallback_candidates": []}
```


### Pattern 2: Execution with Fallback

```python
def execute_with_skill_fallback(task: str, initial_skill: dict, fallback_chain: list) -> dict:
    """Execute the selected skill with a domain-specific fallback chain.
    
    Implements the 5 Laws of Elegant Defense:
    - Fail fast on invalid skill state
    - Retry with parameter adjustments before switching skills
    - Escalate to human if confidence drops below threshold
    """
    execution_state = {
        "task": task,
        "current_skill": initial_skill["name"],
        "attempts": 0,
        "confidence_history": []
    }
    
    # Validate skill state before execution
    if initial_skill.get("status") != "active":
        raise RuntimeError(f"Skill {initial_skill['name']} is not active")
        
    try:
        # Attempt execution with current skill
        result = _invoke_skill_handler(initial_skill, task)
        execution_state["success"] = True
        execution_state["result"] = result
        return execution_state
        
    except TransientDependencyError as e:
        # Fallback Level 1: Retry with adjusted parameters/timeouts
        execution_state["attempts"] += 1
        adjusted_skill = {**initial_skill, "timeout": initial_skill.get("timeout", 30) * 2}
        return execute_with_skill_fallback(task, adjusted_skill, fallback_chain)
        
    except SkillMismatchError as e:
        # Fallback Level 2: Switch to next candidate in fallback chain
        if fallback_chain:
            next_skill = fallback_chain.pop(0)
            execution_state["fallback_triggered"] = True
            return execute_with_skill_fallback(task, next_skill, fallback_chain)
            
    # Fallback Level 3: Escalate if chain exhausted
    execution_state["success"] = False
    execution_state["escalation_required"] = True
    execution_state["reason"] = "All fallback skills exhausted"
    return execution_state
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
| `skill-audit` | Performs detailed quality audits after the scanner identifies skills that need attention |
| `skill-observability` | Uses observability data to guide scanner focus on high-impact skill areas |

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

- [Code Scanning with GitHub Advanced Security](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning) — GitHub's documentation on automated code scanning for vulnerabilities
- [Directory Traversal Patterns in Python (os.walk)](https://docs.python.org/3/library/os.html#os.walk) — Python's os module documentation for filesystem traversal operations
- [AST Parsing for Static Analysis](https://docs.python.org/3/library/ast.html) — Python AST module documentation for programmatic code analysis
- [Markdown Parser Libraries (CommonMark)](https://commonmark.org/) — CommonMark-compatible Markdown parsing libraries for processing SKILL.md files
- [JSON Schema Validation with AJV](https://ajv.js.org/) — JSON Schema validation library documentation for validating structured data formats