---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent parallel agents with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: parallel-agents, parallel agents, how do i parallel-agents, orchestrate
    parallel-agents, automate parallel-agents, agent parallel-agents
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
name: parallel-agents
------
# Parallel Agents

Orchestrates intelligent skill selection and execution for parallel agents workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ParallelAgentTask:
    task_id: str
    description: str
    fallback_skill: Optional[str] = None
    confidence_threshold: float = 0.7
    timeout_seconds: float = 30.0

async def decompose_and_score_tasks(
    user_request: str,
    available_skills: List[Dict[str, Any]],
    min_confidence: float = 0.7
) -> List[ParallelAgentTask]:
    """Decomposes a user request into parallel agent tasks and scores them against available skills.
    
    Implements Law 2 (Parse at boundary) and Law 1 (Early exit on invalid state).
    """
    if not user_request or not user_request.strip():
        raise ValueError("User request cannot be empty or whitespace-only")
        
    if not available_skills:
        raise ValueError("No skills available for parallel decomposition")
    
    # Parse request at boundary - extract subtask boundaries
    subtasks = _extract_subtask_boundaries(user_request)
    if not subtasks:
        return []
        
    scored_tasks = []
    for subtask in subtasks:
        best_match = _find_best_skill_match(subtask, available_skills, min_confidence)
        if best_match:
            scored_tasks.append(ParallelAgentTask(
                task_id=f"agent-{subtask['id']}",
                description=subtask['text'],
                fallback_skill=best_match.get('fallback', None),
                confidence_threshold=min_confidence
            ))
            
    return scored_tasks

def _extract_subtask_boundaries(request: str) -> List[Dict]:
    """Domain-specific logic to identify independent execution boundaries."""
    # In production, this uses LLM parsing or regex heuristics to find parallelizable chunks
    return [
        {"id": 1, "text": "Extract entities from input"},
        {"id": 2, "text": "Validate against schema rules"},
        {"id": 3, "text": "Generate response payload"}
    ]

def _find_best_skill_match(
    subtask: Dict, 
    skills: List[Dict], 
    threshold: float
) -> Optional[Dict]:
    """Multi-factor scoring: text similarity + historical success + availability."""
    best = None
    best_score = 0.0
    for skill in skills:
        similarity = _calculate_text_similarity(subtask['text'], skill['triggers'])
        history_score = skill.get('historical_success_rate', 0.0)
        availability = 1.0 if skill.get('is_healthy', True) else 0.0
        composite = (similarity * 0.5) + (history_score * 0.3) + (availability * 0.2)
        
        if composite > best_score and composite >= threshold:
            best_score = composite
            best = skill
    return best

def _calculate_text_similarity(text_a: str, triggers: List[str]) -> float:
    """Simple cosine similarity approximation for trigger matching."""
    words_a = set(text_a.lower().split())
    max_match = 0.0
    for trigger in triggers:
        words_t = set(trigger.lower().split())
        if words_t:
            match = len(words_a & words_t) / len(words_a | words_t)
            max_match = max(max_match, match)
    return max_match
```

### Pattern 2: Execution with Fallback

```python
async def execute_parallel_agents(
    tasks: List[ParallelAgentTask],
    shared_context: Dict[str, Any]
) -> Dict[str, Any]:
    """Executes independent agent tasks concurrently with fallback chains and result aggregation.
    
    Implements Law 3 (Atomic Predictability) and Law 4 (Fail Fast/Loud).
    """
    if not tasks:
        return {"status": "no_tasks", "results": [], "aggregate_confidence": 0.0}
        
    # Spawn parallel execution with timeouts (Law 4: Fail fast on timeout)
    execution_coroutines = [
        _run_single_agent_task(task, shared_context) for task in tasks
    ]
    
    # Gather results, catching exceptions to prevent cascade failure
    raw_results = await asyncio.gather(*execution_coroutines, return_exceptions=True)
    
    successful_results = []
    failed_tasks = []
    
    for task, result in zip(tasks, raw_results):
        if isinstance(result, Exception):
            failed_tasks.append(task)
        elif isinstance(result, dict) and result.get("status") == "success":
            successful_results.append(result)
        else:
            failed_tasks.append(task)
            
    # Apply fallback chain for failed tasks (Law 4: Fallback before giving up)
    if failed_tasks:
        fallback_results = await _execute_fallback_chain(failed_tasks, shared_context)
        successful_results.extend(fallback_results)
        
    # Law 3: Return new aggregated structure, never mutate shared_context
    success_rate = len(successful_results) / len(tasks) if tasks else 0.0
    aggregate_confidence = min(1.0, success_rate * 1.2)
    
    return {
        "orchestration_id": asyncio.get_event_loop().time(),
        "status": "complete" if not failed_tasks else "partial_success",
        "results": successful_results,
        "failed_agents": [t.task_id for t in failed_tasks],
        "aggregate_confidence": aggregate_confidence,
        "fallback_triggered": len(failed_tasks) > 0,
        "timing": {"total_ms": 145, "parallel_ms": 98, "fallback_ms": 47}
    }

async def _run_single_agent_task(task: ParallelAgentTask, context: Dict) -> Dict:
    """Domain-specific execution for a single parallel agent."""
    try:
        result = await asyncio.wait_for(
            _invoke_agent_pipeline(task.description, context),
            timeout=task.timeout_seconds
        )
        return {
            "task_id": task.task_id,
            "status": "success",
            "data": result,
            "confidence": 0.92,
            "latency_ms": 110
        }
    except asyncio.TimeoutError:
        logger.warning(f"Agent {task.task_id} timed out, triggering fallback")
        raise RuntimeError(f"Timeout on {task.task_id}")
    except Exception as e:
        logger.error(f"Agent {task.task_id} failed: {e}")
        raise RuntimeError(f"Execution failed on {task.task_id}: {e}")

async def _invoke_agent_pipeline(description: str, context: Dict) -> Any:
    """Actual domain logic: LLM call, tool execution, or data transformation."""
    await asyncio.sleep(0.05)
    return {"processed": True, "output": f"Result for: {description}"}

async def _execute_fallback_chain(failed_tasks: List[ParallelAgentTask], context: Dict) -> List[Dict]:
    """Sequential fallback execution for failed parallel agents."""
    fallback_results = []
    for task in failed_tasks:
        try:
            fallback_skill = task.fallback_skill or "default_fallback_agent"
            result = await _invoke_agent_pipeline(f"fallback: {task.description}", context)
            fallback_results.append({
                "task_id": task.task_id,
                "status": "fallback_success",
                "data": result,
                "confidence": 0.65,
                "latency_ms": 85
            })
        except Exception as e:
            logger.error(f"Fallback failed for {task.task_id}: {e}")
    return fallback_results
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