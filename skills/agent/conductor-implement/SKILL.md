---
name: conductor-implement
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor implement with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-implement, conductor implement, how do i conductor-implement,
    orchestrate conductor-implement, automate conductor-implement, agent conductor-implement
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
# Conductor Implement

Orchestrates intelligent skill selection and execution for conductor implement workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
class ConductorOrchestrator:
    """Domain-specific orchestrator for conductor-implement workflows."""
    
    def score_and_select(self, request: str, registry: list[dict]) -> dict | None:
        """Multi-factor skill selection with dependency validation and audit logging."""
        if not request or not registry:
            raise ValueError("Request and skill registry are required")
        
        # Law 2: Parse at boundary before scoring
        parsed = self._parse_request(request)
        best_match = None
        best_score = 0.0
        
        for skill in registry:
            # Law 1: Early exit for disabled/deprecated skills
            if skill.get("status") in ("disabled", "deprecated"):
                continue
            
            # Multi-factor scoring: text similarity + historical success + availability
            text_score = self._cosine_similarity(parsed["intent"], skill["triggers"])
            history_score = skill.get("success_rate", 0.0)
            availability_score = 1.0 if skill.get("available") else 0.0
            
            # Weighted composite score with configurable thresholds
            composite = (text_score * 0.5) + (history_score * 0.3) + (availability_score * 0.2)
            
            if composite > best_score and composite >= 0.7:
                # Law 3: Return new structure, never mutate registry
                best_match = {
                    "skill_id": skill["id"],
                    "score": round(composite, 3),
                    "dependencies": skill.get("requires", []),
                    "confidence": composite,
                    "selection_context": parsed["entities"]
                }
                best_score = composite
                
        # Audit log selection decision
        self._log_selection(best_match, parsed)
        return best_match
```


### Pattern 2: Execution with Fallback

```python
class ConductorOrchestrator:
    # ... (previous method) ...
    
    def execute_with_fallback_chain(self, selected: dict, context: dict) -> dict:
        """Domain-specific execution with 2-level fallback and confidence tracking."""
        skill_id = selected["skill_id"]
        attempts = 0
        
        # Fallback chain: Primary -> Alternative -> Human Escalation
        fallback_targets = [
            {"id": skill_id, "type": "primary"},
            {"id": selected.get("alternative_skill"), "type": "alternative"},
            {"id": "human_operator", "type": "escalation"}
        ]
        
        for target in fallback_targets:
            attempts += 1
            try:
                # Law 4: Fail fast on invalid state
                if not self._validate_context(context, target["id"]):
                    raise InvalidStateError(f"Context mismatch for {target['id']}")
                    
                result = self._invoke_skill(target["id"], context)
                
                # Update confidence based on execution outcome
                self._update_confidence_score(target["id"], success=True)
                
                return {
                    "status": "success",
                    "executed_skill": target["id"],
                    "result": result,
                    "attempts": attempts,
                    "audit": self._log_execution(target["id"], attempts)
                }
                
            except TransientError:
                continue # Proceed to next fallback level
            except InvalidStateError as e:
                # Law 4: Fail loud, don't patch bad data
                self._log_execution(target["id"], attempts, error=str(e))
                raise ExecutionFailedError(f"Invalid state at {target['id']}: {e}") from e
                
        # All fallbacks exhausted
        self._log_execution("fallback_exhausted", attempts)
        raise ExecutionFailedError(f"All fallback chains failed for {skill_id}")
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
- Parse user request into structured task specifications before dispatching to downstream agents
- Implement a state machine for each conductor phase with explicit entry/exit conditions and transition logs
- Validate implement outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for implement results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Netflix Conductor Documentation](<https://netflix.github.io/conductor/>)
- [Conductor Workflow SDK](<https://netflix.github.io/conductor/sdk/>)
- [Workflow Orchestration Patterns (Martin Fowler)](<https://martinfowler.com/articles/choreographyVsOrchestration.html>)
- [Temporal.io Documentation](<https://docs.temporal.io/>)
- [Apache Airflow Conductor Pattern](<https://airflow.apache.org/docs/>)

## Related Skills

| Skill | Purpose |
|