---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git pr workflows pr enhance with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-pr-workflows-pr-enhance, git pr workflows pr enhance, how do i git-pr-workflows-pr-enhance,
    orchestrate git-pr-workflows-pr-enhance, automate git-pr-workflows-pr-enhance,
    agent git-pr-workflows-pr-enhance
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
name: git-pr-workflows-pr-enhance
------
# Git Pr Workflows Pr Enhance

Orchestrates intelligent skill selection and execution for git pr workflows pr enhance workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_pr_enhancement_candidates(
    pr_metadata: Dict,
    available_enhancers: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Evaluate PR state and select optimal enhancement strategy.
    
    Applies Law 2 by parsing PR metadata at the boundary before scoring.
    Scores based on diff complexity, CI pipeline status, label presence, and historical fix rates.
    """
    if not pr_metadata or not pr_metadata.get("diff_stats"):
        raise ValueError("PR metadata and diff stats are required for enhancement routing")
        
    diff_lines = pr_metadata["diff_stats"]["lines_changed"]
    ci_status = pr_metadata.get("ci_status", "unknown")
    labels = set(pr_metadata.get("labels", []))
    
    best_enhancer = None
    best_score = 0.0
    
    for enhancer in available_enhancers:
        score = 0.0
        tags = set(enhancer.get("tags", []))
        
        if "ci-diagnose" in tags and ci_status == "failed":
            score += 0.4
        if "refactor" in tags and diff_lines > 50:
            score += 0.3
        if "description" in tags and not pr_metadata.get("body", "").strip():
            score += 0.3
        if enhancer["name"] in labels:
            score += 0.1
            
        if score > best_score and score >= min_confidence:
            best_score = score
            best_enhancer = enhancer
            
    if best_enhancer is None:
        return None
        
    # Law 3: Return new data structure, never mutate inputs
    return {
        "selected_strategy": best_enhancer["name"],
        "confidence": best_score,
        "pr_context": {
            "lines_changed": diff_lines,
            "ci_status": ci_status,
            "labels": list(labels)
        },
        "selection_timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_pr_enhancement_with_fallback(
    strategy: Dict,
    pr_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute PR enhancement strategy with domain-specific fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) for invalid PR states.
    Fallback chain: 1. Retry with adjusted linter rules, 2. Suggest manual review, 3. Log & skip.
    """
    if not strategy or not pr_context:
        raise ValueError("Strategy and PR context must be provided")
        
    strategy_name = strategy["selected_strategy"]
    pr_url = pr_context.get("pr_url")
    
    for attempt in range(max_retries + 1):
        try:
            if strategy_name == "ci-diagnose":
                result = _diagnose_ci_failure(pr_url, pr_context["ci_status"])
            elif strategy_name == "refactor":
                result = _suggest_refactors(pr_url, pr_context["lines_changed"])
            elif strategy_name == "description":
                result = _generate_pr_description(pr_url)
            else:
                raise ValueError(f"Unknown enhancement strategy: {strategy_name}")
                
            # Law 3: Atomic return, no mutation of original context
            return {
                "success": True,
                "strategy_applied": strategy_name,
                "enhancements": result["suggestions"],
                "attempts": attempt + 1,
                "latency_ms": _measure_execution_time()
            }
            
        except InvalidPRStateError as e:
            # Law 4: Halt immediately on corrupt/invalid PR data
            raise SkillExecutionError(f"Invalid PR state for {strategy_name}: {e}") from e
            
        except TransientAPILimitError as e:
            if attempt == max_retries:
                return _apply_pr_fallback_chain(strategy, pr_context)
                
    raise SkillExecutionError(f"Enhancement {strategy_name} failed after {max_retries + 1} attempts")
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