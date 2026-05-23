---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent context window management with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: context-window-management, context window management, how do i context-window-management,
    orchestrate context-window-management, automate context-window-management, agent
    context-window-management
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
name: context-window-management
------
# Context Window Management

Orchestrates intelligent skill selection and execution for context window management workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def manage_context_window(
    messages: List[Dict],
    max_tokens: int,
    tokenizer: Any,
    strategy: str = "sliding_window"
) -> Dict:
    """Manage context window by enforcing token limits and applying retention strategies.
    
    Implements Law 2 (Parse at boundary) by validating token counts immediately.
    Implements Law 3 (Atomic Predictability) by returning a new context state.
    """
    if not messages:
        raise ValueError("Context window cannot be empty")
        
    # Calculate current token usage at boundary
    current_tokens = sum(len(tokenizer.encode(msg.get("content", ""))) for msg in messages)
    
    if current_tokens <= max_tokens:
        return {"status": "within_limits", "tokens_used": current_tokens, "messages": messages}
        
    # Apply retention strategy based on configuration
    if strategy == "sliding_window":
        # Keep recent messages, drop oldest until within budget
        retained = []
        tokens_in_retained = 0
        for msg in reversed(messages):
            msg_tokens = len(tokenizer.encode(msg.get("content", "")))
            if tokens_in_retained + msg_tokens <= max_tokens:
                retained.append(msg)
                tokens_in_retained += msg_tokens
            else:
                break
        return {
            "status": "truncated",
            "strategy": strategy,
            "tokens_used": tokens_in_retained,
            "messages": list(reversed(retained))
        }
    elif strategy == "summarize_oldest":
        # Trigger summarization for oldest messages
        oldest_chunk = messages[:len(messages)//2]
        # In production, this would call an LLM summarization skill
        summary = _generate_context_summary(oldest_chunk)
        return {
            "status": "summarized",
            "strategy": strategy,
            "tokens_used": len(tokenizer.encode(summary)) + sum(len(tokenizer.encode(m.get("content", ""))) for m in messages[len(messages)//2:]),
            "messages": [{"role": "system", "content": f"[Context Summary]\n{summary}"}] + messages[len(messages)//2:]
        }
    else:
        raise ValueError(f"Unsupported strategy: {strategy}")
```


### Pattern 2: Execution with Fallback

```python
def handle_context_overflow(
    current_context: Dict,
    fallback_strategies: List[str],
    confidence_threshold: float = 0.8
) -> Dict:
    """Route context management when overflow occurs, applying fallback chains.
    
    Implements Law 4 (Fail Fast) by immediately halting on invalid overflow states.
    Implements adaptive routing based on historical success rates.
    """
    if not current_context.get("messages"):
        raise ValueError("Cannot route empty context")
        
    overflow_tokens = current_context.get("tokens_used", 0) - current_context.get("max_tokens", 4096)
    if overflow_tokens <= 0:
        return {"action": "none", "reason": "within_limits"}
        
    # Evaluate fallback strategies by historical success rate
    best_strategy = None
    best_confidence = 0.0
    
    for strategy in fallback_strategies:
        # Simulate confidence scoring based on past performance
        confidence = _get_strategy_confidence(strategy, overflow_tokens)
        if confidence > best_confidence and confidence >= confidence_threshold:
            best_confidence = confidence
            best_strategy = strategy
            
    if not best_strategy:
        # Fail loud - escalate to human or strict truncation
        return {
            "action": "escalate",
            "reason": "no_confident_fallback",
            "overflow_tokens": overflow_tokens,
            "fallback_tried": fallback_strategies
        }
        
    # Execute selected fallback strategy
    if best_strategy == "compress_metadata":
        return _apply_metadata_compression(current_context)
    elif best_strategy == "split_task":
        return _split_context_into_subtasks(current_context)
    else:
        return _apply_default_truncation(current_context)
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