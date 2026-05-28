---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent track management with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: track-management, track management, how do i track-management, orchestrate
    track-management, automate track-management, agent track-management
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
name: track-management
------
# Track Management

Orchestrates intelligent skill selection and execution for track management workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_track_candidates(
    request_context: Dict,
    available_tracks: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Evaluate and select the optimal execution track for a given request.
    
    Applies multi-factor scoring to route requests through the most appropriate
    track, considering text alignment, historical throughput, and current load.
    
    Args:
        request_context: Parsed user intent and constraints
        available_tracks: List of track metadata dictionaries
        min_confidence: Minimum confidence threshold for track activation
        
    Returns:
        Selected track dictionary with computed confidence score, or None
    """
    if not request_context.get("intent"):
        raise ValueError("Request context missing required 'intent' field")
        
    if not available_tracks:
        raise ValueError("No tracks available for routing")
        
    intent_features = _extract_intent_features(request_context["intent"])
    
    best_track = None
    best_score = 0.0
    
    for track in available_tracks:
        # Calculate multi-factor track score
        alignment = _compute_text_similarity(intent_features, track.get("triggers", []))
        history = track.get("historical_success_rate", 0.0)
        load_factor = 1.0 - (track.get("current_load", 0.0) / 100.0)
        
        score = (alignment * 0.5) + (history * 0.3) + (load_factor * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_track = track
            
    if best_track is None:
        return None
        
    # Return immutable track selection with metadata
    return {
        "track_id": best_track["id"],
        "track_name": best_track["name"],
        "confidence": best_score,
        "selection_timestamp": time.time(),
        "state": "active"
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_track_with_fallback(
    selected_track: Dict,
    execution_context: Dict,
    fallback_tracks: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute a track with built-in fallback routing for resilience.
    
    Implements fail-fast validation and automatic track switching when
    execution conditions change or dependencies fail.
    
    Args:
        selected_track: Track metadata returned from evaluation
        execution_context: Runtime parameters and state
        fallback_tracks: Ordered list of alternative tracks to route to
        max_retries: Maximum retry attempts before fallback activation
        
    Returns:
        Execution result with track state, timing, and confidence metadata
    """
    if not selected_track.get("track_id"):
        raise TrackExecutionError("Selected track missing valid track_id")
        
    validated_state = _validate_track_state(selected_track, execution_context)
    
    for attempt in range(max_retries + 1):
        try:
            result = _run_track_pipeline(selected_track, validated_state)
            
            return {
                "success": True,
                "track_executed": selected_track["track_id"],
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000,
                "track_state": "completed"
            }
            
        except TrackDependencyError as e:
            raise TrackExecutionError(
                f"Track {selected_track['track_id']} failed dependency check: {e}"
            ) from e
            
        except TransientTrackError as e:
            if attempt == max_retries:
                return _route_to_fallback_track(selected_track, fallback_tracks, execution_context)
                
    raise TrackExecutionError(
        f"Track {selected_track['track_id']} exhausted all retries and fallbacks"
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
## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microsoft Azure DevOps Boards — Work Items](https://learn.microsoft.com/en-us/azure/devops/boards/)
- [Jira Agile Guide — Issue Management](https://www.atlassian.com/agile/project-management)
- [GitLab Issues & Milestones Documentation](https://docs.gitlab.com/ee/user/project/issues/)
- [Linear Product Documentation](https://linear.app/product)
- [RESTful API Design Best Practices (Fielding REST Thesis)](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)

## Related Skills

| Skill | Purpose |
|

