---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent parallel skill runner with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: parallel-skill-runner, parallel skill runner, how do i parallel-skill-runner,
    orchestrate parallel-skill-runner, automate parallel-skill-runner, agent parallel-skill-runner
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
name: parallel-skill-runner
------
# Parallel Skill Runner

Orchestrates intelligent skill selection and execution for parallel skill runner workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_parallel_candidates(
    task: str,
    candidate_skills: List[SkillMetadata],
    historical_registry: Dict[str, HistoricalRecord]
) -> List[RankedSkill]:
    """Score and rank skills for parallel dispatch based on multi-factor metrics.
    
    Applies Law 2 (Parse at boundary) by validating inputs upfront.
    Returns immutable ranked list for deterministic routing.
    """
    if not task or not candidate_skills:
        raise ValueError("Task and candidate_skills must be non-empty")
        
    parsed_task = _parse_intent_and_entities(task)
    ranked = []
    
    for skill in candidate_skills:
        if not _is_skill_available(skill):
            continue
            
        text_match = _cosine_similarity(parsed_task.terms, skill.trigger_terms)
        history = historical_registry.get(skill.id, HistoricalRecord())
        success_rate = history.success_count / max(history.total_runs, 1)
        availability_score = _get_current_load_score(skill.endpoint)
        
        composite_score = (0.4 * text_match) + (0.4 * success_rate) + (0.2 * availability_score)
        
        ranked.append(RankedSkill(
            skill=skill,
            confidence=composite_score,
            expected_latency_ms=_estimate_latency(skill, parsed_task)
        ))
        
    ranked.sort(key=lambda x: x.confidence, reverse=True)
    return ranked
```


### Pattern 2: Execution with Fallback

```python
async def run_parallel_with_fallback(
    ranked_skills: List[RankedSkill],
    task_context: Dict,
    fallback_map: Dict[str, List[str]],
    timeout_seconds: float = 30.0
) -> ParallelExecutionResult:
    """Execute top N skills in parallel with per-skill fallback chains.
    
    Implements Law 4 (Fail Fast/Loud) by isolating failures and applying fallbacks.
    Returns aggregated results without mutating original context.
    """
    if not ranked_skills:
        raise ParallelExecutionError("No skills available for parallel execution")
        
    selected = ranked_skills[:3] # Execute top 3 in parallel
    tasks = []
    
    for ranked in selected:
        tasks.append(_execute_single_skill_with_fallback(
            skill=ranked.skill,
            context=task_context,
            fallback_chain=fallback_map.get(ranked.skill.id, []),
            timeout=timeout_seconds
        ))
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    aggregated = ParallelExecutionResult(
        success_count=0,
        failed_count=0,
        results=[],
        fallbacks_triggered=[]
    )
    
    for ranked, result in zip(selected, results):
        if isinstance(result, Exception):
            aggregated.failed_count += 1
            aggregated.fallbacks_triggered.append(ranked.skill.id)
        else:
            aggregated.success_count += 1
            aggregated.results.append(result)
            
    return aggregated
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
| `agent-confidence-based-selector` | Provides the confidence-based selection layer that this parallel runner orchestrates across multiple candidates |
| `agent-task-routing` | Handles sequential task routing — use this when tasks must be ordered rather than parallelized |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenAI Agent Design Patterns (Microsoft)](https://microsoft.github.io/autogen/stable/user-guide/agent-design/design-patterns.html) — Standard patterns for agent orchestration including parallel execution
- [LangGraph Parallel Branches](https://langchain-ai.github.io/langgraph/concepts/high_level/#parallel-processing) — Documentation on implementing parallel processing workflows in LangGraph
- [Multi-Agent Orchestration with CrewAI](https://docs.crewai.com/how-to/Parallel-Processing/) — Guide to parallel task execution across multiple AI agents
- [CAMEL Communication Framework](https://www.camel-ai.org/) — Research on multi-agent communication and coordination patterns
- [LLM Powered Autonomous Agents (Liao et al.)](https://arxiv.org/abs/2307.11765) — Foundational paper on LLM-based autonomous agent architectures