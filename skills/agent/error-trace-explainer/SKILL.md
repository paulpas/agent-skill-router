---
name: error-trace-explainer
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent error trace explainer with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: error-trace-explainer, error trace explainer, how do i error-trace-explainer,
    orchestrate error-trace-explainer, automate error-trace-explainer, agent error-trace-explainer
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
# Error Trace Explainer

Orchestrates intelligent skill selection and execution for error trace explainer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_trace_patterns(
    raw_trace: str,
    known_error_db: List[Dict],
    severity_threshold: float = 0.6
) -> Dict:
    """Analyze raw error trace against known patterns and severity metrics.
    
    Implements multi-factor scoring for trace explanation:
    - Stack frame depth and module relevance
    - Exception type matching against known failure modes
    - Historical resolution success rate for similar traces
    
    Args:
        raw_trace: Raw exception traceback string
        known_error_db: Database of known error patterns with metadata
        severity_threshold: Minimum confidence to auto-explain
        
    Returns:
        Structured analysis with matched patterns, severity, and explanation draft
    """
    # Guard clause - Early Exit (Law 1)
    if not raw_trace or not raw_trace.strip():
        raise ValueError("Trace cannot be empty")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    parsed_frames = _parse_stack_frames(raw_trace)
    if not parsed_frames:
        return {"status": "unparseable", "frames": []}
        
    matched_patterns = []
    for pattern in known_error_db:
        score = _calculate_trace_similarity(parsed_frames, pattern)
        if score >= severity_threshold:
            matched_patterns.append({
                "pattern_id": pattern["id"],
                "confidence": score,
                "root_cause": pattern["root_cause"],
                "suggested_fix": pattern["resolution_steps"]
            })
            
    # Atomic Predictability (Law 3) - Return new dict
    return {
        "trace_id": hashlib.md5(raw_trace.encode()).hexdigest()[:8],
        "frame_count": len(parsed_frames),
        "matched_patterns": sorted(matched_patterns, key=lambda x: x["confidence"], reverse=True),
        "auto_explainable": len(matched_patterns) > 0,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def generate_trace_explanation(
    analysis_result: Dict,
    context: Dict,
    fallback_strategy: str = "human_review"
) -> Dict:
    """Generate human-readable trace explanation with resilience fallbacks.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Unknown traces route to fallback immediately
    - No partial explanations returned
    
    Fallback chain:
    1. Use matched pattern explanation
    2. Fallback to generic debugging guide
    3. Route to human expert with full trace context
    
    Args:
        analysis_result: Output from analyze_trace_patterns
        context: User environment details (OS, framework, version)
        fallback_strategy: Routing strategy for unhandled traces
        
    Returns:
        Structured explanation with confidence, steps, and metadata
    """
    # Guard clause - validate analysis (Early Exit)
    if not analysis_result.get("auto_explainable"):
        return _route_to_fallback(analysis_result, context, fallback_strategy)
        
    # Parse context - Ensure trusted state (Law 2)
    env_context = _normalize_environment(context)
    
    primary_pattern = analysis_result["matched_patterns"][0]
    
    try:
        explanation = _construct_explanation(
            pattern=primary_pattern,
            frames=analysis_result.get("frames", []),
            env=env_context
        )
        
        # Success - Atomic Predictability (Law 3)
        return {
            "success": True,
            "trace_id": analysis_result["trace_id"],
            "explanation": explanation["text"],
            "confidence": primary_pattern["confidence"],
            "suggested_fixes": primary_pattern["suggested_fix"],
            "generated_at": time.time()
        }
        
    except TemplateError as e:
        # Fail Fast - Don't patch malformed explanations (Law 4)
        return _route_to_fallback(analysis_result, context, fallback_strategy)
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
- [Python Traceback Documentation](<https://docs.python.org/3/library/traceback.html>)
- [Stack Overflow Error Debugging Guide](<https://stackoverflow.blog/2024/09/16/better-error-messages-for-developers/>)
- [ELK Stack for Log Analysis](<https://www.elastic.co/elasticsearch>)
- [Sentry Error Tracking Documentation](<https://docs.sentry.io/product/error-monitoring/>)
- [OpenTelemetry Error Context](<https://opentelemetry.io/docs/concepts/signals/traces/>)
