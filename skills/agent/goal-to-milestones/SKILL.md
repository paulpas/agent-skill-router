---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent goal to milestones with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: goal-to-milestones, goal to milestones, how do i goal-to-milestones, orchestrate
    goal-to-milestones, automate goal-to-milestones, agent goal-to-milestones
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
name: goal-to-milestones
------
# Goal To Milestones

Orchestrates intelligent skill selection and execution for goal to milestones workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def decompose_and_assign_milestones(
    goal: str,
    skill_registry: List[Dict],
    constraints: Dict[str, Any]
) -> List[Dict]:
    """Decompose a high-level goal into actionable milestones and assign optimal skills.
    
    Applies Law 2 (Parse at boundary) by validating goal structure and constraints upfront.
    Uses Law 3 (Atomic Predictability) to return immutable milestone objects.
    """
    if not goal or not skill_registry:
        raise ValueError("Goal and skill registry are required for decomposition")
        
    # Parse goal into phases based on domain heuristics
    phases = _extract_goal_phases(goal)
    milestones = []
    
    for phase in phases:
        # Score available skills against phase requirements
        phase_skills = []
        for skill in skill_registry:
            match_score = _calculate_phase_match(phase, skill)
            if match_score >= constraints.get("min_skill_match", 0.6):
                phase_skills.append({
                    "skill_id": skill["id"],
                    "phase": phase,
                    "match_score": match_score,
                    "estimated_effort": skill.get("effort_hours", 1)
                })
        
        # Assign best skill per phase (Law 1: Early exit if no match)
        if not phase_skills:
            milestones.append({
                "phase": phase,
                "status": "blocked",
                "fallback_required": True,
                "assigned_skill": None
            })
        else:
            best = max(phase_skills, key=lambda x: x["match_score"])
            milestones.append({
                "phase": phase,
                "status": "pending",
                "assigned_skill": best["skill_id"],
                "match_score": best["match_score"],
                "dependencies": []
            })
            
    return milestones
```


### Pattern 2: Execution with Fallback

```python
def execute_milestone_chain(
    milestones: List[Dict],
    skill_executor: Callable,
    progress_tracker: Dict
) -> Dict:
    """Execute milestones sequentially with dependency resolution and adaptive fallback.
    
    Implements Law 4 (Fail Fast, Fail Loud) by halting on critical phase failures.
    Updates confidence scores dynamically based on execution outcomes.
    """
    completed_milestones = []
    current_confidence = 0.8
    
    for i, milestone in enumerate(milestones):
        if milestone["status"] == "blocked":
            # Law 1: Early exit for unresolvable phases
            progress_tracker["halted_at"] = i
            progress_tracker["confidence"] = current_confidence
            return progress_tracker
            
        try:
            result = skill_executor(milestone["assigned_skill"], milestone["phase"])
            
            # Law 3: Return new state, never mutate original milestone
            completed_milestones.append({
                "phase": milestone["phase"],
                "status": "completed",
                "result_hash": hash(str(result)),
                "execution_time_ms": result.get("latency", 0)
            })
            
            # Adaptive confidence update (Law 5: Elegant Defense)
            current_confidence *= (0.9 if result.get("success", True) else 0.5)
            
        except SkillTimeoutError:
            # Fallback: Retry with adjusted parameters for this specific milestone
            retry_result = skill_executor(milestone["assigned_skill"], milestone["phase"], retry=True)
            completed_milestones.append({
                "phase": milestone["phase"],
                "status": "completed_retry",
                "result_hash": hash(str(retry_result))
            })
        except CriticalFailureError as e:
            # Law 4: Fail loud, record exact failure point
            progress_tracker["error"] = str(e)
            progress_tracker["confidence"] = current_confidence
            progress_tracker["completed_milestones"] = completed_milestones
            return progress_tracker
            
    progress_tracker["milestones"] = completed_milestones
    progress_tracker["confidence"] = current_confidence
    progress_tracker["status"] = "goal_achieved"
    return progress_tracker
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
- [OKR Framework (Objectives and Key Results)](<https://www.atlassian.com/agile/project-management/okrs>)
- [Milestone Planning Best Practices (PMI)](<https://www.pmi.org/learning/library/project-milestones-6679>)
- [Agile Sprint Planning Guide](<https://www.scrum.org/resources/blog/how-write-effective-user-stories-agile>)
- [WBS for Milestone Breakdown](<https://en.wikipedia.org/wiki/Work_breakdown_structure>)
- [SMART Goals Framework](<https://en.wikipedia.org/wiki/SMART_criteria>)
