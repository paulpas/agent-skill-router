---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent andruia niche intelligence with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: andruia-niche-intelligence, andruia niche intelligence, how do i andruia-niche-intelligence,
    orchestrate andruia-niche-intelligence, automate andruia-niche-intelligence, agent
    andruia-niche-intelligence
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
name: andruia-niche-intelligence
------
# Andruia Niche Intelligence

Orchestrates intelligent skill selection and execution for andruia niche intelligence workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_niche_intelligence(
    request: Dict[str, Any],
    niche_registry: List[Dict[str, Any]],
    confidence_threshold: float = 0.75
) -> Dict[str, Any]:
    """Route requests through niche intelligence pipeline.
    
    Applies Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable)
    to validate niche context before scoring.
    """
    if not request.get("context") or not request.get("intent"):
        raise ValueError("Missing required niche context or intent")
        
    # Law 2: Parse and normalize niche features at boundary
    normalized_request = _normalize_niche_features(request)
    
    scored_candidates = []
    for niche in niche_registry:
        # Law 3: Atomic scoring without mutating registry
        match_score = _calculate_niche_alignment(normalized_request, niche)
        historical_success = niche.get("success_rate", 0.0)
        combined_confidence = (match_score * 0.6) + (historical_success * 0.4)
        
        if combined_confidence >= confidence_threshold:
            scored_candidates.append({
                "niche_id": niche["id"],
                "confidence": combined_confidence,
                "routing_priority": niche.get("priority", 1)
            })
            
    if not scored_candidates:
        return {"status": "no_match", "fallback_required": True}
        
    # Law 1: Early exit if only one viable niche
    if len(scored_candidates) == 1:
        return {"selected_niche": scored_candidates[0], "status": "routed"}
        
    # Return sorted candidates for multi-path routing
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)
    return {"selected_niche": scored_candidates[0], "alternatives": scored_candidates[1:], "status": "routed"}
```


### Pattern 2: Execution with Fallback

```python
def execute_niche_workflow(
    selected_niche: Dict[str, Any],
    workflow_context: Dict[str, Any],
    fallback_registry: Dict[str, List[str]]
) -> Dict[str, Any]:
    """Execute niche intelligence workflow with domain-aware fallbacks.
    
    Implements Law 4 (Fail Fast, Fail Loud) and Law 3 (Atomic Predictability).
    """
    niche_id = selected_niche["niche_id"]
    attempt_count = 0
    max_attempts = selected_niche.get("max_retries", 2)
    
    while attempt_count <= max_attempts:
        try:
            # Law 2: Validate workflow state before execution
            validated_state = _validate_workflow_state(workflow_context, niche_id)
            
            # Execute niche-specific logic
            result = _invoke_niche_engine(niche_id, validated_state)
            
            # Law 3: Return immutable result structure
            return {
                "niche_id": niche_id,
                "status": "success",
                "result": result,
                "attempts": attempt_count + 1,
                "confidence_delta": _calculate_confidence_update(result)
            }
            
        except NicheValidationError as e:
            # Law 4: Fail immediately on invalid state
            raise WorkflowExecutionError(f"Niche {niche_id} state invalid: {e}") from e
            
        except TransientNicheError as e:
            attempt_count += 1
            if attempt_count > max_attempts:
                # Law 1: Early exit to fallback chain
                return _trigger_niche_fallback(niche_id, fallback_registry, workflow_context)
                
    # Fallback exhausted
    return _escalate_to_human_operator(niche_id, workflow_context)
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
| `andruia-consultant` | AI consulting and strategy workflows |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Harvard Business Review — Building a Niche Strategy (Porter)](https://hbr.org/1985/01/whathas-strategy)
- [MIT Sloan — Competitive Advantage Through Specialization](https://mitsloan.mit.edu/ideas-made-to-matter/articles/competitive-strategy)
- [Niche Market Intelligence Frameworks (Forrester Research)](https://www.forrester.com/report/)
- [Blue Ocean Strategy — Value Innovation & Niche Creation](https://www.blueoceanstrategy.com/)
- [Harvard Business School — Data-Driven Niche Market Analysis](https://www.hbs.edu/research/Pages/default.aspx)