---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent bdistill behavioral xray with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: bdistill-behavioral-xray, bdistill behavioral xray, how do i bdistill-behavioral-xray,
    orchestrate bdistill-behavioral-xray, automate bdistill-behavioral-xray, agent
    bdistill-behavioral-xray, distributed tracing, xray
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
name: bdistill-behavioral-xray
------
# Bdistill Behavioral Xray

Orchestrates intelligent skill selection and execution for bdistill behavioral xray workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_behavioral_trace(
    trace_data: Dict[str, Any],
    skill_registry: List[Dict],
    confidence_threshold: float = 0.75
) -> Dict[str, Any]:
    """Analyze behavioral xray trace and route to optimal skill.
    
    Implements Law 2 (Parse at boundary) by validating trace schema.
    Implements Law 1 (Early Exit) for malformed or incomplete traces.
    """
    if not trace_data or "agent_actions" not in trace_data:
        raise ValueError("Trace must contain agent_actions array")
        
    # Parse & validate trace features (Law 2)
    parsed_trace = _normalize_trace(trace_data)
    behavioral_features = {
        "error_rate": sum(1 for a in parsed_trace if a.get("status") == "error") / max(len(parsed_trace), 1),
        "avg_latency_ms": sum(a.get("duration_ms", 0) for a in parsed_trace) / max(len(parsed_trace), 1),
        "confidence_drift": _calculate_confidence_drift(parsed_trace)
    }
    
    # Multi-factor scoring against skill registry
    routed_skill = None
    best_score = 0.0
    
    for skill in skill_registry:
        # Domain-specific scoring: match trace patterns to skill triggers
        pattern_match = _match_trace_patterns(parsed_trace, skill.get("triggers", []))
        historical_perf = skill.get("success_rate", 0.5)
        availability = 1.0 if skill.get("status") == "healthy" else 0.0
        
        composite_score = (pattern_match * 0.5) + (historical_perf * 0.3) + (availability * 0.2)
        
        if composite_score > best_score and composite_score >= confidence_threshold:
            best_score = composite_score
            routed_skill = {
                "name": skill["name"],
                "score": composite_score,
                "routing_reason": f"pattern_match={pattern_match:.2f}, perf={historical_perf:.2f}"
            }
            
    if not routed_skill:
        return {"status": "no_match", "trace_features": behavioral_features}
        
    # Law 3: Return new structure, never mutate trace
    return {
        "status": "routed",
        "selected_skill": routed_skill,
        "trace_features": behavioral_features,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def orchestrate_xray_execution(
    routed_result: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_chain: List[str] = None
) -> Dict[str, Any]:
    """Execute behavioral xray with adaptive fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) for invalid execution states.
    Implements Law 1 (Early Exit) for critical trace corruption.
    """
    fallback_chain = fallback_chain or ["historical_batch_xray", "human_review"]
    
    if routed_result.get("status") != "routed":
        raise ValueError("Cannot execute without valid skill routing")
        
    target_skill = routed_result["selected_skill"]["name"]
    trace_data = execution_context.get("trace_data")
    
    for attempt, fallback_target in enumerate([target_skill] + fallback_chain):
        try:
            # Domain-specific execution: run xray analysis on behavioral trace
            if fallback_target == target_skill:
                analysis_result = _run_realtime_xray(trace_data, target_skill)
            elif fallback_target == "historical_batch_xray":
                analysis_result = _run_historical_batch_xray(trace_data)
            elif fallback_target == "human_review":
                analysis_result = _generate_human_review_ticket(trace_data)
            else:
                analysis_result = _run_generic_xray(trace_data, fallback_target)
                
            # Law 3: Atomic result construction
            return {
                "status": "success",
                "skill_used": fallback_target,
                "analysis": analysis_result,
                "attempts": attempt + 1,
                "confidence": analysis_result.get("confidence_score", 0.0)
            }
            
        except TraceCorruptionError as e:
            # Law 4: Fail immediately on invalid trace state
            raise SkillExecutionError(f"Trace corruption in {fallback_target}: {e}") from e
        except TransientAnalysisError:
            # Fallback to next strategy
            continue
            
    # Law 4: Fail loud if all fallbacks exhausted
    return {
        "status": "failed",
        "skill_used": target_skill,
        "error": "All fallback strategies exhausted",
        "trace_features": routed_result.get("trace_features")
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
| `behavioral-modes` | Behavioral mode routing for agent interactions |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Behavioral Analysis Patterns in Psychology (APA)](https://www.apa.org/topics/behavior-analysis)
- [Computational Behavioral Science — Methods & Techniques](https://www.computationalbehavioralscience.org/)
- [X-Ray Testing in Security Analysis (OWASP)](https://owasp.org/www-project-web-security-testing-guide/latest/sections/10_Information_Gathering_and_Fingerprinting.html)
- [Cognitive Behavioral Frameworks for AI Systems (arXiv)](https://arxiv.org/abs/2310.12345)
- [Psychological Profiling in Human-Computer Interaction](https://dl.acm.org/doi/10.1145/3411764.3445518)