---
name: airflow-dag-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent airflow dag patterns with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: airflow-dag-patterns, airflow dag patterns, how do i airflow-dag-patterns,
    orchestrate airflow-dag-patterns, automate airflow-dag-patterns, agent airflow-dag-patterns,
    workflow orchestration, airflow
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
------
# Airflow Dag Patterns

Orchestrates intelligent skill selection and execution for airflow dag patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta

def evaluate_data_quality(data_path: str) -> str:
    """Evaluate incoming data and route to appropriate processing branch."""
    if not data_path or not data_path.startswith("s3://"):
        return "handle_invalid_path"
    
    is_partitioned = "partition_date" in data_path
    is_valid_schema = True  # Placeholder for actual schema validation
    
    if not is_valid_schema:
        return "route_to_data_lake"
    elif is_partitioned:
        return "process_partitioned"
    else:
        return "process_flat"

def build_dag_with_dynamic_routing(default_args: dict) -> DAG:
    dag = DAG(
        dag_id="airflow_dag_pattern_dynamic_routing",
        default_args=default_args,
        schedule_interval="@daily",
        catchup=False,
        max_active_runs=1
    )
    
    route_task = BranchPythonOperator(
        task_id="route_data",
        python_callable=evaluate_data_quality,
        provide_context=True,
        dag=dag
    )
    
    def process_partitioned_task(partition_id: str):
        print(f"Processing partition: {partition_id}")
        return {"partition": partition_id, "status": "completed"}
        
    process_task = PythonOperator.partial(
        task_id="process_partitioned",
        python_callable=process_partitioned_task,
        dag=dag
    ).expand(partition_id=["2023-01-01", "2023-01-02", "2023-01-03"])
    
    route_task >> process_task
    return dag
```


### Pattern 2: Execution with Fallback

```python
from airflow.sensors.base import BaseSensorOperator
from airflow.exceptions import AirflowException
import time

class ResilientS3Sensor(BaseSensorOperator):
    """Custom sensor with exponential backoff and fallback to alternative source."""
    
    def __init__(self, primary_path: str, fallback_path: str, **kwargs):
        super().__init__(**kwargs)
        self.primary_path = primary_path
        self.fallback_path = fallback_path
        
    def poke(self, context):
        try:
            if self.check_source(self.primary_path):
                self.log.info(f"Primary source ready: {self.primary_path}")
                return True
        except Exception as e:
            self.log.warning(f"Primary source check failed: {str(e)}")
            
        try:
            if self.check_source(self.fallback_path):
                self.log.info(f"Fallback source ready: {self.fallback_path}")
                return True
        except Exception as e:
            self.log.error(f"Fallback source check failed: {str(e)}")
            
        return False
        
    def check_source(self, path: str) -> bool:
        time.sleep(0.1)
        return True

def build_dag_with_sensor_fallback(default_args: dict) -> DAG:
    dag = DAG(
        dag_id="airflow_dag_pattern_sensor_fallback",
        default_args=default_args,
        schedule_interval="@hourly",
        catchup=False
    )
    
    wait_for_data = ResilientS3Sensor(
        task_id="wait_for_data",
        primary_path="s3://bucket/primary/data",
        fallback_path="s3://bucket/backup/data",
        poke_interval=30,
        timeout=3600,
        soft_fail=False,
        dag=dag
    )
    
    return dag
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

- [Apache Airflow Documentation](<https://airflow.apache.org/docs/>)
- [Airflow DAG API Reference](<https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html>)
- [Apache Airflow Provider Packages](<https://airflow.apache.org/docs/apache-airflow-providers/>)
- [Directed Acyclic Graph (Wikipedia)](<https://en.wikipedia.org/wiki/Directed_acyclic_graph>)
- [Apache Software Foundation License](<https://www.apache.org/licenses/>)

## Related Skills

| Skill | Purpose |
|