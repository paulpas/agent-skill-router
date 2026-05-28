---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent query optimizer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: query-optimizer, query optimizer, how do i query-optimizer, orchestrate
    query-optimizer, automate query-optimizer, agent query-optimizer
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
name: query-optimizer
------
# Query Optimizer

Orchestrates intelligent skill selection and execution for query optimizer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def optimize_query_route(query: str, skill_registry: List[Dict], query_history: List[Dict]) -> Dict:
    """Analyze query intent and route to optimal skill handler.
    
    Extracts query features, scores available skills against query characteristics,
    and returns routing decision with confidence metrics.
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")
    
    # Parse query features (Law 2: Make illegal states unrepresentable)
    features = _parse_query_features(query)
    
    best_match = None
    best_score = 0.0
    
    for skill in skill_registry:
        # Calculate multi-factor score: intent match, historical success, latency
        intent_score = _calculate_intent_similarity(features["intent"], skill["triggers"])
        history_score = _get_historical_success_rate(skill["name"], query_history)
        availability_score = 1.0 if skill["status"] == "healthy" else 0.0
        
        composite_score = (intent_score * 0.5) + (history_score * 0.3) + (availability_score * 0.2)
        
        if composite_score > best_score:
            best_score = composite_score
            best_match = {
                "skill_name": skill["name"],
                "confidence": composite_score,
                "routing_params": skill.get("routing_config", {}),
                "fallback_chain": skill.get("fallback_handlers", [])
            }
    
    if best_score < 0.65:
        return {"status": "low_confidence", "fallback_to": "generic_parser", "query": query}
        
    return {"status": "routed", "target": best_match, "timestamp": time.time()}
```


### Pattern 2: Execution with Fallback

```python
def execute_optimized_query(route_decision: Dict, query_context: Dict) -> Dict:
    """Execute routed query with adaptive fallback chain.
    
    Handles execution, monitors for transient failures, and applies
    query-specific fallback strategies based on error type and confidence.
    """
    target_skill = route_decision.get("target")
    if not target_skill:
        raise ValueError("No valid route decision provided")
        
    execution_params = {**query_context, **target_skill["routing_params"]}
    
    for attempt in range(3):
        try:
            result = _invoke_skill_handler(target_skill["skill_name"], execution_params)
            return {
                "status": "success",
                "skill": target_skill["skill_name"],
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
        except QueryTimeoutError:
            # Fallback 1: Retry with adjusted timeout
            execution_params["timeout"] = execution_params.get("timeout", 5) * 1.5
        except SchemaMismatchError:
            # Fallback 2: Switch to compatible skill from fallback chain
            fallback_skill = target_skill.get("fallback_chain", [])[attempt]
            if fallback_skill:
                target_skill["skill_name"] = fallback_skill
                execution_params = {**query_context, **target_skill["routing_params"]}
                continue
            else:
                raise QueryExecutionError("All fallback handlers exhausted") from None
        except Exception as e:
            # Fail fast on invalid state
            raise QueryExecutionError(f"Invalid query state: {str(e)}") from e
            
    return {"status": "failed", "error": "Max retries exceeded", "query": query_context.get("raw_query")}
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
| `postgresql-optimization` | PostgreSQL-specific optimization techniques that work alongside general query optimization |
| `nosql-data-modeling` | NoSQL query patterns and data modeling strategies for non-relational databases |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [MySQL EXPLAIN Output Explanation](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html) — Official MySQL documentation on reading query execution plans
- [PostgreSQL Documentation: EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) — Official PostgreSQL guide to analyzing query execution plans
- [Database Query Optimization Techniques (ACM Computing Surveys)](https://dl.acm.org/doi/10.1145/3636957) — Research paper on modern query optimization algorithms and techniques
- [Citus: Distributed PostgreSQL Query Optimization](https://www.citusdata.com/blog/2023/10/05/how-citus-improves-postgres-query-performance/) — Guide to distributed query optimization with Citus
- [Query Planner and Optimizer (Oracle Docs)](https://docs.oracle.com/cd/B19306_01/server.102/b14211/optplan.htm) — Oracle's comprehensive documentation on relational database query planning and optimization