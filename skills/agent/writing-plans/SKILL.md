---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent writing plans with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: writing-plans, writing plans, how do i writing-plans, orchestrate writing-plans,
    automate writing-plans, agent writing-plans
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
name: writing-plans
------
# Writing Plans

Orchestrates intelligent skill selection and execution for writing plans workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def generate_writing_plan(
    request: Dict[str, Any],
    available_templates: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Generate an optimal writing plan based on request parameters.
    
    Evaluates content type, audience, tone, and length constraints against
    available writing templates to produce a structured execution plan.
    
    Args:
        request: User writing prompt with metadata (audience, tone, length, format)
        available_templates: Pre-defined writing plan templates
        min_confidence: Minimum match score required for plan selection
        
    Returns:
        Structured writing plan dict or None if no suitable template matches
    """
    if not request.get("prompt") or not request.get("audience"):
        raise ValueError("Writing plan requires 'prompt' and 'audience' fields")
        
    parsed_request = _normalize_writing_request(request)
    best_plan = None
    best_score = 0.0
    
    for template in available_templates:
        score = _calculate_plan_fit(parsed_request, template)
        if score > best_score and score >= min_confidence:
            best_score = score
            best_plan = template
            
    if best_plan is None:
        return None
        
    # Construct immutable plan structure
    return {
        "plan_id": str(uuid.uuid4()),
        "template": best_plan["name"],
        "sections": _generate_section_outline(parsed_request, best_plan),
        "constraints": parsed_request["constraints"],
        "confidence": best_score,
        "created_at": datetime.now().isoformat()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_writing_plan(
    plan: Dict[str, Any],
    context: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute a structured writing plan with resilience mechanisms.
    
    Generates content section-by-section according to the plan. Implements
    fallback strategies when specific sections fail or exceed token limits.
    
    Args:
        plan: Validated writing plan structure
        context: Execution context (drafts, references, style guides)
        max_retries: Maximum retries per section before fallback
        
    Returns:
        Completed writing document with execution metadata
    """
    if not plan.get("sections"):
        raise ValueError("Writing plan contains no sections to execute")
        
    draft = {"title": context.get("title", "Untitled"), "sections": []}
    execution_log = []
    
    for section in plan["sections"]:
        for attempt in range(max_retries + 1):
            try:
                content = _generate_section_content(section, context)
                draft["sections"].append({
                    "heading": section["heading"],
                    "content": content,
                    "word_count": len(content.split())
                })
                execution_log.append({"section": section["heading"], "status": "success", "attempt": attempt + 1})
                break
                
            except TokenLimitError:
                if attempt == max_retries:
                    # Fallback: Generate condensed version
                    content = _generate_condensed_section(section, context)
                    draft["sections"].append({"heading": section["heading"], "content": content, "word_count": len(content.split()), "fallback": True})
                    execution_log.append({"section": section["heading"], "status": "fallback", "attempt": attempt + 1})
                    break
            except GenerationError as e:
                execution_log.append({"section": section["heading"], "status": "failed", "error": str(e)})
                if attempt == max_retries:
                    raise PlanExecutionError(f"Failed to generate section: {section['heading']}") from e
                    
    return {
        "document": draft,
        "metadata": {
            "total_sections": len(draft["sections"]),
            "fallbacks_applied": sum(1 for s in draft["sections"] if s.get("fallback")),
            "execution_log": execution_log
        }
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
|