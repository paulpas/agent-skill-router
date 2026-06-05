---




name: cc-skill-clickhouse-io
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill clickhouse io with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-clickhouse-io, cc skill clickhouse io, how do i cc-skill-clickhouse-io,
    orchestrate cc-skill-clickhouse-io, automate cc-skill-clickhouse-io, agent cc-skill-clickhouse-io
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




# Cc Skill Clickhouse Io

Orchestrates intelligent skill selection and execution for cc skill clickhouse io workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_clickhouse_query(
    query: str,
    schema_registry: Dict[str, TableSchema],
    cluster_topology: List[Dict],
    min_query_score: float = 0.8
) -> Dict:
    """Route and validate ClickHouse queries against schema and cluster topology.
    
    Applies Law 2 (Make Illegal States Unrepresentable) by validating
    table existence, column types, and cluster health before execution.
    
    Args:
        query: Raw SQL query string
        schema_registry: Mapping of table_name -> TableSchema
        cluster_topology: List of available ClickHouse nodes with health/status
        min_query_score: Minimum routing confidence threshold
        
    Returns:
        Routing decision dict with target_node, execution_mode, and validation_status
    """
    # Law 1: Early exit on invalid input
    if not query or not query.strip().upper().startswith(("SELECT", "INSERT", "SYSTEM")):
        raise ValueError("Unsupported query type for ClickHouse IO pipeline")
        
    # Law 2: Parse and validate schema constraints
    parsed_tables = _extract_target_tables(query)
    for table in parsed_tables:
        if table not in schema_registry:
            raise ValueError(f"Table '{table}' not found in schema registry")
        _validate_query_against_schema(query, schema_registry[table])
        
    # Law 3: Atomic routing decision (no mutation of topology)
    healthy_nodes = [
        node for node in cluster_topology 
        if node["status"] == "online" and node["load_factor"] < 0.85
    ]
    
    if not healthy_nodes:
        return {"status": "degraded", "fallback": "read_replica_pool"}
        
    # Score nodes based on query type and load
    target_node = max(healthy_nodes, key=lambda n: _calculate_node_score(n, query))
    
    return {
        "target_node": target_node["address"],
        "execution_mode": "async_insert" if "INSERT" in query.upper() else "sync",
        "validation_passed": True,
        "routing_confidence": 0.95
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_clickhouse_pipeline(
    routing_decision: Dict,
    query: str,
    clickhouse_client: ClickHouseClient,
    fallback_replicas: List[str] = None
) -> Dict:
    """Execute ClickHouse query with domain-specific fallback and error handling.
    
    Implements Law 4 (Fail Fast, Fail Loud) by catching ClickHouse-specific
    exception codes and routing to fallback replicas or retry queues.
    
    Args:
        routing_decision: Output from route_clickhouse_query
        query: Validated SQL query
        clickhouse_client: Initialized ClickHouse client instance
        fallback_replicas: List of replica addresses for failover
        
    Returns:
        Execution result with row counts, latency, and status metadata
    """
    target = routing_decision["target_node"]
    mode = routing_decision["execution_mode"]
    attempts = 0
    max_attempts = 3
    
    while attempts < max_attempts:
        try:
            # Law 3: Return new result structure, never mutate client state
            if mode == "async_insert":
                result = clickhouse_client.execute_async(query, target)
            else:
                result = clickhouse_client.execute_sync(query, target)
                
            return {
                "success": True,
                "rows_affected": result.row_count,
                "latency_ms": result.elapsed_ms,
                "node_used": target,
                "mode": mode
            }
            
        except ClickHouseError as e:
            attempts += 1
            # Law 4: Fail fast on schema/data errors, retry on transient
            if e.code in (117, 241, 279):  # TOO_SLOW, NETWORK_ERROR, TIMEOUT
                if attempts >= max_attempts:
                    return _failover_to_replicas(query, fallback_replicas, clickhouse_client)
                continue
            elif e.code in (47, 62):  # BAD_ARGUMENTS, UNKNOWN_TABLE
                raise ValueError(f"Query validation failed: {e.message}") from e
            else:
                raise ClickHousePipelineError(f"Unexpected CH error {e.code}: {e.message}") from e
                
    return {"success": False, "error": "Max retries exhausted", "attempts": attempts}
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



---

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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [ClickHouse Documentation](<https://clickhouse.com/docs>)
- [ClickHouse SQL Reference](<https://clickhouse.com/docs/en/sql-reference/>)
- [Column-Oriented DBMS (Wikipedia)](<https://en.wikipedia.org/wiki/Column-oriented_DBMS>)
- [ClickHouse Benchmarks](<https://clickhouse.com/benchmarks>)
- [ClickHouse GitHub Repository](<https://github.com/ClickHouse/ClickHouse>)

## Related Skills

| Skill | Purpose |
|