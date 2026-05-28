---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent ai agent development with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: ai-agent-development, ai agent development, how do i ai-agent-development,
    orchestrate ai-agent-development, automate ai-agent-development, agent ai-agent-development
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
name: ai-agent-development
------
# Ai Agent Development

Orchestrates intelligent skill selection and execution for ai agent development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_agent_skill_pool(
    request: AgentRequest,
    skill_registry: List[SkillMetadata],
    historical_metrics: Dict[str, float]
) -> Optional[RankedSkill]:
    """Evaluate available agent skills using multi-factor scoring for AI development tasks.
    
    Implements Law 2 (Parse at boundary) by validating request structure first.
    Calculates weighted scores based on trigger overlap, historical success rate,
    and dependency health status.
    """
    if not request.intent or not skill_registry:
        raise ValueError("Request intent and skill registry are required")
        
    scored_candidates = []
    for skill in skill_registry:
        # Law 3: Return new structures, never mutate registry
        trigger_match = _calculate_semantic_overlap(request.intent, skill.triggers)
        history_score = historical_metrics.get(skill.id, 0.5)
        dep_health = _check_dependency_status(skill.dependencies)
        
        # Weighted multi-factor scoring
        composite_score = (
            0.4 * trigger_match +
            0.35 * history_score +
            0.25 * dep_health
        )
        
        if composite_score >= 0.65:
            scored_candidates.append(RankedSkill(
                skill=skill,
                confidence=composite_score,
                breakdown={"trigger": trigger_match, "history": history_score, "deps": dep_health}
            ))
            
    scored_candidates.sort(key=lambda x: x.confidence, reverse=True)
    return scored_candidates[0] if scored_candidates else None
```


### Pattern 2: Execution with Fallback

```python
def run_agent_skill_with_resilience(
    skill: RankedSkill,
    execution_context: Dict,
    fallback_registry: List[SkillMetadata]
) -> ExecutionResult:
    """Execute an AI agent skill with a structured fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by immediately halting on invalid states.
    Applies a 2-level fallback: parameter adjustment -> alternative skill -> human escalation.
    """
    if not _validate_execution_context(execution_context, skill.skill.schema):
        raise InvalidStateError(f"Context violates {skill.skill.id} schema requirements")
        
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            result = skill.skill.executor(execution_context)
            _update_confidence_score(skill.skill.id, success=True)
            return ExecutionResult(
                success=True,
                skill_id=skill.skill.id,
                output=result,
                confidence=skill.confidence,
                attempts=attempts + 1
            )
        except SchemaValidationError as e:
            raise InvalidStateError(f"Hard validation failure in {skill.skill.id}: {e}") from e
        except TransientAgentError as e:
            attempts += 1
            if attempts > max_attempts:
                break
            execution_context = _adjust_parameters_for_retry(execution_context, e)
            
    # Fallback chain exhausted
    alt_skill = _find_alternative_skill(fallback_registry, skill.skill.id)
    if alt_skill:
        return run_agent_skill_with_resilience(alt_skill, execution_context, fallback_registry)
        
    _log_critical_failure(skill.skill.id, execution_context)
    raise SkillExecutionError(f"All fallbacks exhausted for {skill.skill.id}. Escalating to human operator.")
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
| `agent-confidence-based-selector` | Intelligent skill selection with multi-factor scoring and fallback chains |
| `agent-task-routing` | Routing tasks to the most appropriate specialized skills |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LLM Agents Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Survey of LLM-Based Agents — Stanford HAI](https://arxiv.org/abs/2308.11432)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph Multi-Agent Documentation](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [Agent Architecture Patterns — Microsoft AI Research](https://www.microsoft.com/en-us/research/project/language-models-for-agents/)