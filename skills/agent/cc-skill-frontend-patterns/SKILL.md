---
name: cc-skill-frontend-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill frontend patterns with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-frontend-patterns, cc skill frontend patterns, how do i cc-skill-frontend-patterns,
    orchestrate cc-skill-frontend-patterns, automate cc-skill-frontend-patterns, agent
    cc-skill-frontend-patterns
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
# Cc Skill Frontend Patterns

Orchestrates intelligent skill selection and execution for cc skill frontend patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_frontend_pattern(
    user_intent: str,
    available_patterns: List[Dict],
    viewport: Dict,
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Route user intent to the optimal frontend UI pattern.
    
    Evaluates patterns based on layout compatibility, state hydration requirements,
    and historical render success rates for the target viewport.
    
    Args:
        user_intent: Natural language description of the desired UI interaction
        available_patterns: List of registered UI pattern metadata (e.g., dashboard, form, chat)
        viewport: Current device/browser dimensions and capabilities
        min_confidence: Minimum match threshold for pattern selection
        
    Returns:
        Selected pattern configuration with routing metadata, or None
    """
    if not user_intent or not available_patterns:
        raise ValueError("Intent and pattern registry must be populated")
        
    intent_features = _parse_intent_features(user_intent)
    best_pattern = None
    best_score = 0.0
    
    for pattern in available_patterns:
        layout_compat = _check_viewport_compatibility(pattern["layout_schema"], viewport)
        state_match = _calculate_state_hydration_score(intent_features, pattern["state_schema"])
        history_score = pattern.get("render_success_rate", 0.0)
        
        composite_score = (layout_compat * 0.4) + (state_match * 0.4) + (history_score * 0.2)
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_pattern = pattern
            
    if best_pattern is None:
        return None
        
    return {
        "pattern_id": best_pattern["id"],
        "config": best_pattern["default_config"],
        "routing_score": best_score,
        "viewport_matched": layout_compat,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def render_with_fallback(
    pattern_config: Dict,
    component_state: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute frontend pattern rendering with graceful degradation.
    
    Handles component mounting, state hydration, and applies fallback UI skeletons
    or alternative patterns when hydration fails or network requests timeout.
    
    Args:
        pattern_config: Selected UI pattern configuration
        component_state: Initial state payload for the component
        max_retries: Maximum hydration attempts before fallback
        
    Returns:
        Render result with DOM diff, hydration status, and fallback metadata
    """
    if not pattern_config or not component_state:
        raise ValueError("Pattern config and component state are required")
        
    pattern_id = pattern_config["pattern_id"]
    fallback_chain = pattern_config.get("fallback_patterns", [])
    
    for attempt in range(max_retries + 1):
        try:
            # Mount component and hydrate state
            dom_snapshot = _mount_component(pattern_id, component_state)
            hydration_status = _verify_hydration(dom_snapshot, component_state)
            
            if hydration_status == "stable":
                return {
                    "rendered": True,
                    "pattern": pattern_id,
                    "dom_hash": dom_snapshot["hash"],
                    "attempts": attempt + 1,
                    "latency_ms": _measure_render_time()
                }
                
        except HydrationMismatchError as e:
            # State mismatch - fail fast, don't patch DOM
            raise RenderError(f"Hydration failed for {pattern_id}: {e}") from e
            
        except NetworkTimeoutError:
            if attempt == max_retries:
                return _apply_fallback_ui(pattern_config, fallback_chain, component_state)
                
    return {
        "rendered": False,
        "error": "Max retries exceeded",
        "fallback_applied": True,
        "timestamp": time.time()
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

- [CSS Grid Layout Module (MDN)](<https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout>)
- [React Documentation](<https://react.dev/reference/react>)
- [Web Components Specification (W3C)](<https://dev.w3.org/html5/shadow-dom/>)
- [Accessibility Guidelines WCAG 2.1](<https://www.w3.org/WAI/WCAG21/quickref/>)
- [Component-Driven Development Storybook](<https://storybook.js.org/docs/react/get-started/introduction>)

## Related Skills

| Skill | Purpose |
|