---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent ask questions if underspecified with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: ask-questions-if-underspecified, ask questions if underspecified, how
    do i ask-questions-if-underspecified, orchestrate ask-questions-if-underspecified,
    automate ask-questions-if-underspecified, agent ask-questions-if-underspecified
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
name: ask-questions-if-underspecified
------
# Ask Questions If Underspecified

Orchestrates intelligent skill selection and execution for ask questions if underspecified workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

### Pattern 1: Request Completeness & Question Generation

```python
def assess_request_completeness(
    user_input: str,
    required_fields: List[str],
    ambiguity_threshold: float = 0.6
) -> Dict:
    """Assess if a user request is underspecified and generate clarifying questions.
    
    Implements Law 2 (Parse at boundary) by validating input against schema.
    Implements Law 1 (Early Exit) by returning immediately if fully specified.
    
    Args:
        user_input: Raw text from the user
        required_fields: List of expected parameters/entities
        ambiguity_threshold: Confidence score below which a field is considered ambiguous
        
    Returns:
        Dict with 'is_complete', 'missing_fields', 'ambiguous_fields', 'clarifying_questions'
    """
    # Early exit if input is empty (Law 1)
    if not user_input or not user_input.strip():
        return {
            "is_complete": False,
            "missing_fields": required_fields,
            "ambiguous_fields": [],
            "clarifying_questions": ["Please provide a complete request."]
        }
    
    # Parse and extract entities (Law 2)
    extracted = _extract_entities(user_input)
    missing = [f for f in required_fields if f not in extracted]
    ambiguous = [f for f in extracted if extracted[f].get("confidence", 1.0) < ambiguity_threshold]
    
    # Early exit if fully specified
    if not missing and not ambiguous:
        return {"is_complete": True, "missing_fields": [], "ambiguous_fields": [], "clarifying_questions": []}
    
    # Generate domain-specific clarifying questions
    questions = []
    for field in missing:
        questions.append(f"What is the value for '{field}'?")
    for field in ambiguous:
        questions.append(f"Could you clarify the expected format/value for '{field}'?")
        
    # Return new structure (Law 3)
    return {
        "is_complete": False,
        "missing_fields": missing,
        "ambiguous_fields": ambiguous,
        "clarifying_questions": questions
    }
```


### Pattern 2: Clarification Routing & Fallback

```python
def route_underspecified_request(
    assessment: Dict,
    conversation_history: List[Dict],
    max_clarification_rounds: int = 3
) -> Dict:
    """Route underspecified requests through clarification or fallback chains.
    
    Implements Law 4 (Fail Fast/Loud) by escalating after max rounds.
    Implements adaptive fallback based on conversation context.
    
    Args:
        assessment: Output from assess_request_completeness
        conversation_history: Previous turns to avoid repetitive questions
        max_clarification_rounds: Threshold before deferring to human/simpler path
        
    Returns:
        Routing decision with action, payload, and metadata
    """
    # Guard clause - validate assessment structure
    if not assessment.get("is_complete"):
        # Check if we've exceeded clarification rounds
        clarification_count = sum(1 for turn in conversation_history if turn.get("type") == "clarification")
        if clarification_count >= max_clarification_rounds:
            # Fallback: Defer to human or simplified execution path
            return {
                "action": "defer_to_human",
                "reason": "Max clarification rounds exceeded",
                "payload": {"original_request": assessment.get("clarifying_questions")},
                "metadata": {"fallback_level": 2, "confidence": 0.3}
            }
        
        # Fallback Level 1: Retry with simplified/rephrased questions
        simplified_questions = _simplify_questions(assessment.get("clarifying_questions", []))
        return {
            "action": "ask_clarification",
            "reason": "Request underspecified",
            "payload": {"questions": simplified_questions},
            "metadata": {"fallback_level": 1, "confidence": 0.8}
        }
    
    # Fully specified - proceed to execution pipeline
    return {
        "action": "proceed_to_execution",
        "reason": "Request complete",
        "payload": {"validated_context": _build_execution_context(assessment)},
        "metadata": {"fallback_level": 0, "confidence": 0.95}
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
| `behavioral-modes` | Behavioral mode selection for agent conversations |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Self-Consistency Improves Chain of Thought Reasoning (Huang et al.)](https://arxiv.org/abs/2203.11171)
- [PromptingGuide — Self-Consistency Technique](https://www.promptingguide.ai/techniques/self_consistency)
- [LLM Prompt Engineering for Clarification (LangChain Blog)](https://blog.langchain.dev/prompt-engineering/)
- [Clarifying Ambiguity in LLM Interactions (ACL Anthology)](https://aclanthology.org/2023.findings-acl.678/)
- [Interactive Questioning Strategies for AI Assistants](https://arxiv.org/abs/2310.05029)