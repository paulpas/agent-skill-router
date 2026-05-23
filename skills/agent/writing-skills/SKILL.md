---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent writing skills with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: writing-skills, writing skills, how do i writing-skills, orchestrate writing-skills,
    automate writing-skills, agent writing-skills
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
name: writing-skills
------
# Writing Skills

Orchestrates intelligent skill selection and execution for writing skills workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_writing_skill(
    request: Dict[str, Any],
    available_writing_skills: List[Dict],
    style_guide: Dict[str, Any]
) -> Optional[Dict]:
    """Select optimal writing skill based on tone, format, and audience requirements.
    
    Evaluates writing-specific factors:
    - Tone alignment (formal, conversational, technical, persuasive)
    - Format requirements (markdown, HTML, plain text, structured JSON)
    - Audience complexity and domain expertise level
    - Historical readability scores and engagement metrics
    
    Args:
        request: User writing request with tone, format, and audience fields
        available_writing_skills: List of writing skill metadata
        style_guide: Active style guide configuration
        
    Returns:
        Selected writing skill with confidence score and applied style rules
    """
    if not request.get("content") or not request.get("tone"):
        raise ValueError("Writing request requires 'content' and 'tone' fields")
        
    target_tone = request["tone"].lower()
    target_format = request.get("format", "markdown")
    audience_level = request.get("audience_level", "general")
    
    best_match = None
    best_score = 0.0
    
    for skill in available_writing_skills:
        tone_match = _calculate_tone_similarity(target_tone, skill.get("supported_tones", []))
        format_compatible = target_format in skill.get("supported_formats", [])
        audience_fit = _assess_audience_compatibility(audience_level, skill.get("target_audience"))
        
        # Weighted scoring for writing-specific criteria
        score = (tone_match * 0.4) + (format_compatible * 0.3) + (audience_fit * 0.3)
        score *= skill.get("historical_readability_score", 0.8)
        
        if score > best_score:
            best_score = score
            best_match = skill
            
    if best_score < 0.65:
        return None
        
    # Apply style guide rules to selected skill
    result = dict(best_match)
    result["applied_style_rules"] = style_guide.get("rules", [])
    result["confidence"] = round(best_score, 3)
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_writing_task(
    selected_skill: Dict,
    writing_context: Dict,
    fallback_styles: List[str] = ["neutral", "simple"]
) -> Dict:
    """Execute writing pipeline with style-aware fallback chain.
    
    Implements writing-specific resilience:
    - Validates tone/format constraints before generation
    - Falls back to simpler style guides on readability failure
    - Routes sensitive/complex content to human review
    - Tracks engagement and clarity metrics for adaptive learning
    
    Args:
        selected_skill: Output from select_writing_skill
        writing_context: Raw content, audience, and formatting requirements
        fallback_styles: Ordered list of alternative tone/style guides
        
    Returns:
        Generated text with metadata (readability, tone_match, fallback_used)
    """
    content = writing_context.get("content", "").strip()
    if not content:
        raise ValueError("Writing context requires non-empty content")
        
    current_style = selected_skill.get("applied_style_rules", [])
    fallback_index = 0
    
    while True:
        try:
            # Assemble prompt with style constraints
            prompt = _build_writing_prompt(content, current_style, writing_context)
            
            # Execute generation
            generated_text = _run_generation_model(prompt, selected_skill["model_endpoint"])
            
            # Post-process: readability & tone validation
            readability_score = _calculate_flesch_kincaid(generated_text)
            tone_match = _measure_tone_alignment(generated_text, writing_context["tone"])
            
            if readability_score < 40 or tone_match < 0.6:
                raise ReadabilityFailure(f"Score: {readability_score}, Tone: {tone_match}")
                
            return {
                "success": True,
                "output": generated_text,
                "readability_score": readability_score,
                "tone_match": tone_match,
                "fallback_used": fallback_index > 0,
                "skill_used": selected_skill["name"]
            }
            
        except ReadabilityFailure as e:
            if fallback_index >= len(fallback_styles):
                raise WritingExecutionError("All style fallbacks exhausted") from e
            current_style = _apply_style_override(fallback_styles[fallback_index])
            fallback_index += 1
            
        except SensitiveContentError:
            return {
                "success": False,
                "requires_human_review": True,
                "reason": "Content flagged for compliance review",
                "original_context": writing_context
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