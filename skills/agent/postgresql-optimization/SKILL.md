---




name: postgresql-optimization
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent postgresql optimization with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: postgresql-optimization, postgresql optimization, how do i postgresql-optimization,
    orchestrate postgresql-optimization, automate postgresql-optimization, agent postgresql-optimization,
    postgres, postgresql
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
version: "1.0.0"




---




# Postgresql Optimization

Orchestrates intelligent skill selection and execution for postgresql optimization workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_slow_queries(db_connection, threshold_ms=1000):
    """Analyze pg_stat_statements to identify queries exceeding threshold.
    Applies Law 1 (Early Exit) by validating connection and threshold.
    """
    if not db_connection or threshold_ms <= 0:
        raise ValueError("Invalid database connection or threshold")
    
    query = """
        SELECT queryid, query, calls, total_exec_time, mean_exec_time,
               rows, shared_blks_hit, shared_blks_read
        FROM pg_stat_statements
        WHERE mean_exec_time > %s
        ORDER BY mean_exec_time DESC
        LIMIT 50;
    """
    cursor = db_connection.cursor()
    cursor.execute(query, (threshold_ms,))
    slow_queries = cursor.fetchall()
    
    optimized_results = []
    for row in slow_queries:
        queryid, query_text, calls, total, mean, rows, hits, reads = row
        # Law 3: Return new structures, never mutate inputs
        analysis = {
            "queryid": queryid,
            "mean_exec_time_ms": round(mean, 2),
            "calls": calls,
            "io_efficiency": round(hits / (hits + reads) * 100, 2) if (hits + reads) > 0 else 0,
            "recommendations": []
        }
        # Law 2: Make illegal states unrepresentable
        if analysis["io_efficiency"] < 80:
            analysis["recommendations"].append("Consider adding covering indexes to reduce disk I/O")
        if mean > 5000:
            analysis["recommendations"].append("Query exceeds 5s threshold; review EXPLAIN ANALYZE output")
        optimized_results.append(analysis)
        
    cursor.close()
    return optimized_results
```


### Pattern 2: Execution with Fallback

```python
def apply_postgres_tuning(db_connection, tuning_profile: Dict, dry_run: bool = True):
    """Apply PostgreSQL configuration tuning with safe fallback mechanisms.
    Implements Law 4 (Fail Fast) by validating profile and using transactions.
    """
    required_keys = {"shared_buffers", "work_mem", "effective_cache_size"}
    if not required_keys.issubset(tuning_profile.keys()):
        raise ValueError("Tuning profile missing required keys: shared_buffers, work_mem, effective_cache_size")
    
    safe_defaults = {
        "shared_buffers": "256MB",
        "work_mem": "4MB",
        "effective_cache_size": "1GB"
    }
    
    try:
        cursor = db_connection.cursor()
        # Law 1: Early exit on validation
        if dry_run:
            return {"status": "dry_run", "proposed_changes": tuning_profile, "rollback_command": "SELECT pg_reload_conf()"}
        
        # Execute tuning with transaction safety
        cursor.execute("BEGIN")
        for key, value in tuning_profile.items():
            cursor.execute(f"ALTER SYSTEM SET {key} = %s", (value,))
        cursor.execute("SELECT pg_reload_conf()")
        cursor.execute("COMMIT")
        
        return {"status": "success", "applied_profile": tuning_profile, "timestamp": time.time()}
        
    except psycopg2.errors.ConfigurationLimitExceeded:
        # Law 4: Fail loud, apply fallback
        return _apply_safe_fallback(db_connection, safe_defaults)
    except Exception as e:
        cursor.execute("ROLLBACK")
        raise RuntimeError(f"Tuning failed: {str(e)}") from e
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
| `query-optimizer` | Provides general query optimization techniques applicable to PostgreSQL workloads |
| `schema-inference-engine` | Helps design efficient schemas that support optimized query patterns in PostgreSQL |

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [PostgreSQL Documentation: Query Performance](https://www.postgresql.org/docs/current/performance-tips.html) — Official PostgreSQL documentation on query performance optimization
- [PostgreSQL Documentation: EXPLAIN and ANALYZE](https://www.postgresql.org/docs/current/using-explain.html) — Official guide to using EXPLAIN for query plan analysis
- [PgTune: PostgreSQL Configuration Tuner](https://pgtune.leopard.in.ua/) — Community tool for generating optimized postgresql.conf based on server specifications
- [PostgreSQL Index Types (B-tree, GiST, GIN, BRIN)](https://www.postgresql.org/docs/current/indexes-types.html) — Official documentation on choosing the right index type for query patterns
- [Hyperlight: PostgreSQL Query Optimization Guide](https://hyperskill.org/guides/postgres/optimization) — Comprehensive guide to query optimization techniques and execution plan tuning