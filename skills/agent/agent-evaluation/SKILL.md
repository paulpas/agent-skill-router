---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent agent evaluation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: agent-evaluation, agent evaluation, how do i agent-evaluation, orchestrate
    agent-evaluation, automate agent-evaluation, agent agent-evaluation
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
name: agent-evaluation
------
# Agent Evaluation

Orchestrates intelligent skill selection and execution for agent evaluation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_agent_output(
    agent_response: str,
    evaluation_criteria: List[Dict],
    benchmark_data: Dict
) -> Dict:
    """Score an agent's output against multi-factor evaluation criteria.
    
    Implements the 5 Laws of Elegant Defense for evaluation:
    - Early exit on malformed responses or missing criteria
    - Immutable scoring state to prevent cross-contamination
    - Fail fast on unresolvable safety/alignment checks
    
    Args:
        agent_response: Raw output from the evaluated agent
        evaluation_criteria: List of metrics to evaluate (e.g., accuracy, safety, law_adherence)
        benchmark_data: Reference data for comparison scoring
        
    Returns:
        Evaluation result with per-metric scores and overall confidence
    """
    if not agent_response or not evaluation_criteria:
        raise ValueError("Agent response and criteria are required for evaluation")
        
    # Parse and normalize response for evaluation (Law 2)
    normalized_response = _normalize_text(agent_response)
    scores = {}
    
    for criterion in evaluation_criteria:
        metric_name = criterion["name"]
        try:
            # Domain-specific scoring logic
            if metric_name == "law_adherence":
                scores[metric_name] = _score_law_compliance(normalized_response, benchmark_data)
            elif metric_name == "accuracy":
                scores[metric_name] = _calculate_accuracy(normalized_response, benchmark_data.get("ground_truth"))
            else:
                scores[metric_name] = _default_metric_score(normalized_response, criterion)
        except UnresolvableMetricError:
            # Fail fast on unresolvable metrics (Law 4)
            scores[metric_name] = {"score": 0.0, "status": "pending_review", "reason": "requires_human_judgment"}
            
    # Atomic Predictability (Law 3) - Return fresh evaluation object
    return {
        "evaluation_id": generate_uuid(),
        "scores": scores,
        "overall_confidence": _compute_weighted_average(scores),
        "timestamp": time.time(),
        "status": "complete"
    }
```


### Pattern 2: Execution with Fallback

```python
def run_evaluation_pipeline(
    evaluation_task: Dict,
    agent_outputs: List[Dict],
    fallback_strategies: Dict
) -> Dict:
    """Execute multi-agent evaluation with domain-specific fallback chains.
    
    Orchestrates the evaluation workflow while applying Elegant Defense principles:
    - Validates evaluation scope and agent availability before scoring
    - Applies fallback scoring when direct metrics fail
    - Maintains immutable evaluation state across pipeline stages
    
    Args:
        evaluation_task: Task definition containing criteria, weights, and scope
        agent_outputs: List of agent responses to evaluate
        fallback_strategies: Mapping of metric names to fallback methods
        
    Returns:
        Comprehensive evaluation report with scores, fallback usage, and audit trail
    """
    # Guard clause - validate evaluation scope (Early Exit)
    if not evaluation_task.get("criteria") or not agent_outputs:
        raise EvaluationPipelineError("Missing criteria or agent outputs for evaluation")
        
    report = {
        "task_id": evaluation_task["id"],
        "agent_evaluations": [],
        "fallback_applied": [],
        "audit_log": []
    }
    
    for output in agent_outputs:
        try:
            # Execute domain-specific evaluation
            eval_result = evaluate_agent_output(
                output["response"],
                evaluation_task["criteria"],
                output.get("benchmark_context", {})
            )
            report["agent_evaluations"].append(eval_result)
            
        except MetricResolutionError as e:
            # Apply evaluation-specific fallback (Law 4)
            fallback_method = fallback_strategies.get(e.metric_name, "heuristic_estimate")
            fallback_result = _apply_evaluation_fallback(output, fallback_method)
            report["fallback_applied"].append({
                "agent": output["id"],
                "metric": e.metric_name,
                "strategy": fallback_method
            })
            report["agent_evaluations"].append(fallback_result)
            
        report["audit_log"].append({
            "agent_id": output["id"],
            "status": "completed",
            "timestamp": time.time()
        })
        
    # Finalize report with immutable state
    report["summary"] = _generate_evaluation_summary(report["agent_evaluations"])
    return report
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
| `agentic-evaluation` | Systematic quality evaluation of agent behaviors and outputs |
| `agent-reliability-engineering` | Reliability metrics and failure rate tracking for production agents |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Evaluating LLMs — arXiv Survey (2311.18760)](https://arxiv.org/abs/2311.18760)
- [Open LLM Leaderboard — Hugging Face](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [AgentBench: Evaluating LLMs as Agents — arXiv](https://arxiv.org/abs/2308.03688)
- [LLM Evaluation Benchmarks — Stanford HELM](https://crfm.stanford.edu/helm/latest/)