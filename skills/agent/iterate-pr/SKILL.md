---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent iterate pr with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: iterate-pr, iterate pr, how do i iterate-pr, orchestrate iterate-pr, automate
    iterate-pr, agent iterate-pr
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
name: iterate-pr
------
# Iterate Pr

Orchestrates intelligent skill selection and execution for iterate pr workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_skill(
    task_description: str,
    available_skills: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Select the most appropriate PR iteration skill for a given task.
    
    Uses a multi-factor scoring algorithm that considers:
    - PR state and CI status alignment with skill triggers
    - Historical success rate for similar PR iteration tasks
    - Current system load and skill availability
    
    Args:
        task_description: Natural language description of the PR iteration task
        available_skills: List of PR iteration skill metadata dictionaries
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Selected skill dictionary or None if no match meets threshold
        
    Raises:
        ValueError: If task_description is empty or available_skills is empty
    """
    # Guard clause - Early Exit (Law 1)
    if not task_description or not task_description.strip():
        raise ValueError("Task description cannot be empty")
        
    if not available_skills:
        raise ValueError("No PR iteration skills available for selection")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    pr_context = _extract_pr_context(task_description)
    
    best_skill = None
    best_score = 0.0
    
    for skill in available_skills:
        score = _calculate_pr_iteration_score(pr_context, skill)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_skill = skill
    
    if best_skill is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_skill)
    result["selected_confidence"] = best_score
    result["selection_timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_with_fallback(
    skill: Dict,
    task_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a PR iteration skill with fallback chain for resilience.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid PR states halt immediately with descriptive errors
    - No silent failures or partial commit results
    
    Fallback chain:
    1. Retry with adjusted linting/formatting parameters
    2. Try alternative PR skill (e.g., switch from auto-fix to manual prompt)
    3. Defer to human operator (for critical architectural changes)
    
    Args:
        skill: Selected PR iteration skill metadata
        task_context: Execution context including PR URL and diff data
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, commit hash, confidence)
        
    Raises:
        SkillExecutionError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate skill (Early Exit)
    if not _is_pr_skill_valid(skill):
        raise SkillExecutionError(f"Invalid PR iteration skill: {skill.get('name', 'unknown')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_context = _validate_and_parse_pr_context(task_context, skill)
    
    for attempt in range(max_retries + 1):
        try:
            result = _execute_pr_skill_direct(skill, validated_context)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "skill_executed": skill["name"],
                "commit_hash": result.get("commit_hash"),
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except PRMergeError as e:
            # Fail Fast - Don't try to patch merged PRs (Law 4)
            raise SkillExecutionError(
                f"PR is merged or closed: {str(e)}"
            ) from e
            
        except CICheckFailure as e:
            # Transient CI error - try fallback
            if attempt == max_retries:
                return _apply_pr_fallback_chain(skill, validated_context)
    
    # All retries exhausted - Fail Loud (Law 4)
    raise SkillExecutionError(
        f"Failed to execute PR iteration {skill['name']} after {max_retries + 1} attempts"
    )
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
- [Iterative Development Methodology (Wikipedia)](<https://en.wikipedia.org/wiki/Iterative_and_incremental_development>)
- [Continuous Integration Best Practices](<https://www.thoughtworks.com/radar/techniques/continuous-integration>)
- [Pull Request Review Cycles (Google Engineering)](<https://google.github.io/eng-practices/review/coder/>)
- [Agile Retrospectives for Process Improvement](<https://www.scrum.org/resources/blog/write-effective-retrospective-action-items>)
- [Feedback Loop Design in Software Development](<https://martinfowler.com/bliki/FeedbackLoop.html>)
