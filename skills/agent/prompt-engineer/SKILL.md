---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent prompt engineer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: prompt-engineer, prompt engineer, how do i prompt-engineer, orchestrate
    prompt-engineer, automate prompt-engineer, agent prompt-engineer
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
name: prompt-engineer
------
# Prompt Engineer

Orchestrates intelligent skill selection and execution for prompt engineer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_prompt_strategy(
    task_intent: str,
    available_templates: List[Dict],
    context_window: int,
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Select optimal prompt strategy based on intent, context constraints, and template metadata.
    
    Evaluates templates by:
    - Intent-to-template semantic alignment
    - Context window compatibility (input tokens + estimated output)
    - Historical success rate for similar task intents
    - Model capability match (e.g., function calling, JSON mode)
    
    Args:
        task_intent: Natural language description of the user's goal
        available_templates: List of prompt template metadata dicts
        context_window: Max tokens available for the target model
        min_confidence: Minimum alignment score threshold
        
    Returns:
        Selected strategy dict with resolved template, variables, and confidence
    """
    if not task_intent or not available_templates:
        raise ValueError("Task intent and templates are required")
        
    intent_features = _extract_intent_features(task_intent)
    best_strategy = None
    best_score = 0.0
    
    for template in available_templates:
        # Calculate semantic alignment and constraint fit
        alignment = _compute_semantic_alignment(intent_features, template["triggers"])
        token_estimate = _estimate_prompt_tokens(template, intent_features)
        window_fit = 1.0 if (token_estimate + template.get("max_output_tokens", 1024)) <= context_window else 0.0
        
        # Multi-factor scoring
        score = (alignment * 0.5) + (template.get("success_rate", 0.0) * 0.3) + (window_fit * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_strategy = template
            
    if best_strategy is None:
        return None
        
    # Atomic Predictability: Return resolved strategy without mutating original
    return {
        "template_id": best_strategy["id"],
        "resolved_prompt": _resolve_template_variables(best_strategy, intent_features),
        "estimated_tokens": _estimate_prompt_tokens(best_strategy, intent_features),
        "confidence": best_score,
        "model_requirements": best_strategy.get("model_features", [])
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_prompt_pipeline(
    strategy: Dict,
    execution_context: Dict,
    max_retries: int = 2,
    fallback_models: List[str] = None
) -> Dict:
    """Execute prompt pipeline with adaptive fallback for reliability.
    
    Implements Fail Fast, Fail Loud:
    - Validates context and token limits before API call
    - Handles rate limits, context overflow, and model errors
    - Falls back to summarized context or alternative models
    
    Args:
        strategy: Selected prompt strategy with resolved prompt and metadata
        execution_context: User inputs, conversation history, and system config
        max_retries: Retry attempts for transient API errors
        fallback_models: Ordered list of alternative models to try
        
    Returns:
        Execution result with response, token usage, and fallback metadata
    """
    if not strategy or not execution_context:
        raise ValueError("Strategy and execution context are required")
        
    # Parse & validate context (Law 2)
    validated_context = _validate_context(execution_context, strategy["estimated_tokens"])
    
    current_model = strategy.get("target_model", "default")
    fallback_chain = [current_model] + (fallback_models or [])
    
    for attempt in range(max_retries + 1):
        try:
            # Execute prompt with current model
            response = _call_llm_api(
                model=current_model,
                prompt=strategy["resolved_prompt"],
                context=validated_context,
                temperature=strategy.get("temperature", 0.1)
            )
            
            # Atomic Predictability: Return clean result
            return {
                "success": True,
                "model_used": current_model,
                "response": response,
                "tokens_used": response.get("usage", {}),
                "attempts": attempt + 1,
                "fallback_applied": False
            }
            
        except ContextOverflowError as e:
            # Fail Fast: Don't retry with same context
            raise PromptExecutionError(f"Context exceeds window: {str(e)}") from e
            
        except RateLimitError as e:
            if attempt == max_retries:
                return _apply_prompt_fallback(strategy, validated_context, fallback_chain)
            continue
            
        except ModelError as e:
            if attempt == max_retries:
                return _apply_prompt_fallback(strategy, validated_context, fallback_chain)
            continue
            
    raise PromptExecutionError(f"Prompt pipeline failed after {max_retries + 1} attempts")
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
| `prompt-optimization` | Provides prompt iteration techniques that complement the prompt engineering workflow |
| `testing-quality-methodologies` | Validates prompt outputs through systematic testing strategies |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Prompt Engineering Guide (Vik Paruchuri)](https://www.promptingguide.ai/) — Comprehensive guide covering zero-shot, few-shot, chain-of-thought, and advanced prompting techniques
- [OpenAI Prompt Engineering Guidelines](https://platform.openai.com/docs/guides/prompt-engineering) — Official OpenAI documentation on designing effective prompts for GPT models
- [Anthropic Prompt Engineering Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering) — Anthropic's best practices for system prompts and prompt design with Claude
- [PromptPerfect: Prompt Testing Platform](https://www.promptperfect.com/) — Platform documentation for testing and optimizing prompts across multiple LLM providers
- [Chain-of-Thought Prompting Elicits Reasoning in LLMs (Wei et al.)](https://arxiv.org/abs/2201.11903) — Foundational research on advanced prompting strategies for LLM reasoning