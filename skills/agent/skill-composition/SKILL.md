---
name: skill-composition
description: Composes multiple specialized skills into coherent workflows using sequential
  chains, parallel fan-out/fan-in, conditional branching, and error-isolation patterns
  for reliable multi-step task execution.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: skill composition, skill chaining, multi-skill workflow, parallel fan-out,
    fan-in pattern, state management between skills, error handling between skills,
    orchestration patterns, how do i combine multiple skills
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: orchestration
  output-format: code
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: parallel-skill-runner, task-decomposition-engine, intelligent-skill-selection,
    skill-router-system
---
# Skill Composition Framework

Composes multiple specialized skills into coherent, reliable workflows. When loaded, this skill makes the model act as a senior orchestration engineer — designing, implementing, and debugging multi-skill workflows that chain sequential steps, fan out to parallel branches, handle errors gracefully at each boundary, and manage state across skill invocations. This skill bridges the gap between selecting individual skills (handled by intelligent-skill-selection) and executing them as a coordinated system.

## TL;DR Checklist

- [ ] Classify the workflow topology: sequential chain, parallel fan-out/fan-in, conditional branching, or hybrid
- [ ] Define the shared state schema that flows between skills before writing any invocation logic
- [ ] Choose an error strategy per edge: retry with backoff, skip-and-log, fallback-to-default, or abort-upstream
- [ ] Implement circuit-breaker guards for expensive or flaky downstream skills
- [ ] Add observability: record entry/exit timestamps, intermediate state snapshots, and failure reasons at every boundary

---

## When to Use

Use this skill when:

- A single task requires the output of multiple specialized skills (e.g., code-review + security-review + test-oracle-generator)
- You need to coordinate parallel execution of independent skills where results converge before the next phase
- Skills have dependency relationships — one skill's output becomes another's input, and failures must be handled at boundaries
- You are designing a multi-step workflow that includes human-in-the-loop approval gates between automated skill steps
- You need to optimize cost/latency by batching independent skills or caching intermediate results

---

## When NOT to Use

Avoid this skill for:

- Single-skill tasks that any one specialized skill can handle end-to-end — do not add composition overhead unnecessarily
- One-off scripts or throwaway automation where long-term maintainability does not matter
- Situations where all steps are strictly sequential with no convergence points — use task-decomposition-engine for simple linear chains

---

## Core Workflow

1. **Classify the Topology** — Map the task to one of five composition patterns:
   - Sequential Chain: A → B → C (each step depends on prior output)
   - Parallel Fan-Out/Fan-In: Task splits into A, B, C running concurrently; results merge at a reduction step
   - Conditional Branching: If Skill A outputs category X, route to branch B1; else route to B2
   - Fan-Out with Error Isolation: Parallel branches run independently; failures in one branch do not abort others — failed branches return sentinel values or partial results
   - Human-in-the-Loop Gate: Automated skills run up to a decision point, then pause for human input before continuing

   **Checkpoint:** Draw the flow on paper (or as an ASCII diagram). Identify every edge and label it with its data type and error strategy. If you cannot describe each edge's contract in one sentence, refine the decomposition.

2. **Define Shared State Schema** — Before invoking any skill, define the JSON schema (or type signature) that flows between skills:
   - Input schema: what each skill needs from upstream
   - Output schema: what each skill produces for downstream
   - Shared context: data available to all skills without explicit passing (project root, config, authentication state)

   **Checkpoint:** Every edge in the flow diagram has a typed contract. No implicit data leaks between skills through side channels.

3. **Choose Error Strategies Per Edge** — For every edge A → B, decide one of four strategies:
   - Retry-With-Backoff: Retry up to N times with exponential backoff (useful for flaky APIs)
   - Skip-and-Log: Pass a sentinel/default value downstream, log the failure, continue workflow
   - Fallback-to-Default: Substitute a known-good default result from a fallback skill
   - Abort-Upstream: Propagate the error upward; cancel all pending siblings and terminate

   **Checkpoint:** No edge is left with an implicit error strategy. Every edge has exactly one documented strategy in the flow definition.

4. **Implement the Orchestrator** — Write the coordinator code that:
   - Parses the topology definition into executable steps
   - Manages concurrency (semaphore-controlled parallelism, dependency tracking)
   - Applies the chosen error strategy at each boundary
   - Collects and merges intermediate results according to the reduction function

   **Checkpoint:** The orchestrator is data-driven (reads a JSON/YAML definition), not hardcoded per workflow. Swapping skills or adding branches requires only configuration changes, not code changes.

5. **Add Observability Hooks** — At every skill boundary, record:
   - Entry timestamp and exit timestamp (for latency profiling)
   - Input summary (sanitized, no secrets)
   - Output summary (or error message if the edge failed)
   - The chosen error strategy and whether it was applied

   **Checkpoint:** Given only the observability log for any past run, you can reconstruct exactly what happened at every step, including which strategies fired.

---

## Composition Patterns / Reference Guide

### Pattern 1: Sequential Chain

Skills execute in order. Each skill's output becomes the next skill's input. This is the simplest topology — use it when steps are strictly dependent and parallelism provides no benefit.

```python
from dataclasses import dataclass, field
from typing import Any, Callable

@dataclass
class ChainContext:
    """Shared mutable state passed through a sequential skill chain."""
    input_data: dict[str, Any]
    results: dict[str, Any] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=lambda: {
        "start_time": None,
        "end_time": None,
        "steps_executed": 0,
    })

# --- Orchestrator ---

class SequentialChain:
    """Executes skills in strict sequence. Aborts on first failure."""

    def __init__(self, steps: list[tuple[str, Callable[[dict], dict]]]):
        # steps = [(skill_name, skill_callable), ...]
        self.steps = steps

    def execute(self, initial_input: dict) -> ChainContext:
        ctx = ChainContext(input_data=initial_input)
        ctx.metadata["start_time"] = _now_iso()

        for name, fn in self.steps:
            try:
                result = fn(ctx.results if name != self.steps[0][0] else initial_input)
                ctx.results[name] = result
                ctx.metadata["steps_executed"] += 1
                log_step(name, "success", ctx.results[name])
            except SkillError as e:
                _handle_chain_failure(e, name, ctx, abort_upstream=True)
                break

        ctx.metadata["end_time"] = _now_iso()
        return ctx


class SkillError(Exception):
    """Raised when a skill invocation fails and the caller must decide how to recover."""
    def __init__(self, skill_name: str, message: str, recoverable: bool = True):
        self.skill_name = skill_name
        self.message = message
        self.recoverable = recoverable
        super().__init__(f"{skill_name}: {message}")
```

### Pattern 2: Parallel Fan-Out/Fan-In

Independent skills run concurrently. Results are merged by a reduction function. Use this when steps have no data dependencies between them and the total wall-clock time is dominated by slow operations (API calls, model inference).

**Decision rule:** Only parallelize when individual skill latency exceeds 500ms AND there are no inter-step data dependencies. For sub-500ms skills, sequential execution reduces context-switching overhead and simplifies debugging.

```python
import asyncio
from collections import defaultdict

@dataclass
class FanOutResult:
    """Aggregated result from a parallel fan-out/fan-in pattern."""
    success: dict[str, Any] = field(default_factory=dict)
    failures: dict[str, Exception] = field(default_factory=dict)
    partial_results: dict[str, Any] = field(default_factory=dict)

async def fan_out_fan_in(
    tasks: list[tuple[str, Callable[..., Awaitable[Any]]]],
    *,
    max_concurrency: int = 5,
    error_strategy: str = "abort",
    fallback_values: dict[str, Any] | None = None,
) -> FanOutResult:
    """Execute independent skill invocations in parallel.

    Args:
        tasks: List of (name, coroutine_factory) tuples. Each factory
               takes the shared context and returns an awaitable result.
        max_concurrency: Semaphore cap on concurrent executions.
        error_strategy: One of 'abort', 'skip-and-continue', 'collect-all'.
        fallback_values: Optional dict mapping skill names to their default
                         results when skip-and-continue is used.

    Returns:
        FanOutResult with success/failures/partial_results split.
    """
    fallback_values = fallback_values or {}
    semaphore = asyncio.Semaphore(max_concurrency)
    result_lock = asyncio.Lock()

    async def _bounded(name, fn):
        async with semaphore:
            try:
                return name, await fn(), None
            except Exception as e:
                return name, None, e

    coros = [asyncio.create_task(_bounded(name, fn)) for name, fn in tasks]
    raw_results = await asyncio.gather(*coros, return_exceptions=False)

    success = {}
    failures = {}
    partial = {}

    for name, result, err in raw_results:
        if err is None and result is not None:
            success[name] = result
        elif error_strategy == "abort":
            failures[name] = err
            break  # stop processing remaining tasks
        elif error_strategy == "skip-and-continue":
            partial[name] = fallback_values.get(name, _make_sentinel(name))
        else:  # collect-all
            failures[name] = err if err else SkillError(name, "returned None")

    return FanOutResult(success=success, failures=failures, partial_results=partial)


def _make_sentinel(skill_name: str) -> dict:
    """Return a typed sentinel for use as a fallback partial result."""
    return {"_sentinel": True, "_skill": skill_name, "_reason": "upstream_failure"}

async def _now_iso() -> str: ...
def log_step(name: str, status: str, data: Any): ...
```

### Pattern 3: Conditional Branching

After an upstream skill produces a result, the next step depends on that result's content. This requires routing logic between branches and consistent output schemas so downstream skills see a uniform interface regardless of which branch executed.

```python
from enum import Enum

class AnalysisResult(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    PASS = "pass"

async def conditional_branch(
    upstream_result: dict,
    branches: dict[str, Callable[..., Awaitable[Any]]],
) -> dict:
    """Route to exactly one branch based on upstream skill output.

    All branches MUST produce the same output schema so that downstream
    skills receive a consistent interface regardless of which path taken.
    """
    severity = upstream_result.get("risk_level", AnalysisResult.PASS.value)

    if severity not in branches:
        raise ValueError(f"No branch defined for risk_level='{severity}'")

    branch_fn = branches[severity]
    return await branch_fn(upstream_result)


# Example usage — all branches produce {"action": str, "detail": str}
branches_map = {
    "critical": lambda ctx: _run_critical_remediation(ctx),
    "warning":  lambda ctx: _run_warning_review(ctx),
    "pass":     lambda ctx: _return_clean_pass(ctx),
}

result = await conditional_branch(review_output, branches_map)
assert set(result.keys()) == {"action", "detail"}  # guaranteed schema
```

### Pattern 4: Fan-Out with Error Isolation

Parallel branches execute independently. A failure in one branch does NOT abort others — instead, that branch returns a partial/sentinel result and the reducer merges whatever is available. Use this when partial results are more valuable than total failure.

**Decision rule:** Choose error isolation over fan-out/fan-in when downstream consumers can meaningfully use partial results (e.g., "3 of 4 lint checks passed" is still useful even if one check failed).

```python
async def fan_out_isolated(
    tasks: list[tuple[str, Callable[..., Awaitable[Any]]]],
    *,
    max_concurrency: int = 5,
) -> dict[str, Any]:
    """Parallel execution where each task's result is collected independently.

    No single failure aborts the others. Each task gets its own try/except
    and produces either a real result or a sentinel error record.

    Returns:
        Flat dict of skill_name -> result_or_error for every input task.
    """
    semaphore = asyncio.Semaphore(max_concurrency)
    results: dict[str, Any] = {}
    errors: list[Exception] = []

    async def _run(name: str, fn: Callable) -> tuple[str, Any]:
        async with semaphore:
            try:
                return name, await fn()
            except Exception as e:
                errors.append(e)
                return name, {
                    "_error": True,
                    "_skill": name,
                    "_exception_type": type(e).__name__,
                    "_message": str(e),
                }

    coros = [asyncio.create_task(_run(name, fn)) for name, fn in tasks]
    awaited = await asyncio.gather(*coros, return_exceptions=False)

    for name, result in awaited:
        results[name] = result

    return results  # always returns ALL keys, even failed ones


# Example: running three independent lint checks on a codebase
lint_tasks = [
    ("security_audit",     lambda: run_security_scan(project_dir)),
    ("type_checking",      lambda: run_type_checker(project_dir)),
    ("dependency_audit",   lambda: check_dependencies()),
]

results = await fan_out_isolated(lint_tasks)

# Consumer can process each independently — failed checks have _error=True
for skill_name, outcome in results.items():
    if outcome.get("_error"):
        log.warn(f"Lint check {skill_name} failed: {outcome['_message']}")
    else:
        process_result(skill_name, outcome)
```

### Pattern 5: Human-in-the-Loop Gate

Automated skills execute up to a decision point. The workflow pauses, presenting the accumulated findings to a human operator. Upon approval or rejection, execution resumes with the human's input as the next skill's input. Use this for high-stakes decisions (security remediation, deployment approvals, content publishing).

```python
@dataclass
class ApprovalRequest:
    """Structured request submitted to a human operator for decision."""
    context_summary: str          # Sanitized summary of findings
    proposed_action: dict        # What the automated skills recommend
    confidence_score: float      # 0.0–1.0 aggregate confidence across skills
    deadline_iso: str            # When approval expires (prevents stale approvals)
    human_feedback: str | None = None
    approved: bool | None = None


async def human_gate(
    gate_name: str,
    request: ApprovalRequest,
    timeout_seconds: int = 3600,
) -> bool:
    """Wait for human approval or rejection.

    Returns True if approved, False if rejected or expired.

    In production, this would integrate with Slack, email, or a web UI
    rather than blocking synchronously. The key contract is that the
    gate returns exactly one boolean decision plus optional feedback.
    """
    deadline = _now_iso()  # actual timestamp when request expires
    request.deadline_iso = deadline

    # In production: post to Slack channel, wait for reaction/SlashCommand
    human_response = await submit_to_operator(gate_name, request)

    approved = human_response.approved and not expired(deadline)
    return approved


# Example workflow: code-review -> security-review -> human_gate -> deploy
async def deploy_workflow(project_dir: str):
    review = await run_code_review(project_dir)
    security = await run_security_scan(project_dir)

    combined = {
        "code_findings": review.get("findings", []),
        "security_findings": security.get("vulnerabilities", []),
        "aggregate_risk": compute_risk_score(review, security),
    }

    approval = ApprovalRequest(
        context_summary=f"Risk score: {combined['aggregate_risk']:.1f}",
        proposed_action={"action": "deploy", "target": project_dir},
        confidence_score=0.82,
    )

    if await human_gate("deploy-approval", approval):
        return await run_deployment(project_dir)
    else:
        raise WorkflowAborted("Human gate rejected deployment")
```

---

## State Management Patterns

### Shared Context Dictionary

The simplest pattern — pass a single mutable dict through all skills. Works for small workflows with few steps.

**Use when:** Fewer than 5 sequential steps, no parallelism, state is flat (no nested structures).

```python
@dataclass
class WorkflowState:
    """Typed shared state for a skill composition workflow."""
    project_dir: str
    config: dict[str, Any]
    artifacts: dict[str, Any] = field(default_factory=dict)  # skill outputs collected here
    metadata: WorkflowMetadata = field(default_factory=WorkflowMetadata)

@dataclass
class WorkflowMetadata:
    run_id: str = ""
    started_at: float | None = None
    completed_at: float | None = None
    step_results: list[dict] = field(default_factory=list)
```

### State Isolation by Branch

In fan-out patterns, each parallel branch gets a COPY of the shared context at the time it spawns. Branches mutate their own copy independently. The reducer merges copies afterward.

**Use when:** Parallel branches write to state (e.g., each runs a different test suite and appends results). Prevents race conditions without locks.

```python
import copy

def spawn_isolated_branch(base_state: WorkflowState) -> WorkflowState:
    """Create an isolated copy of shared state for a parallel branch."""
    return copy.deepcopy(base_state)

# In orchestrator:
states = [spawn_isolated_branch(shared_state) for _ in parallel_tasks]
results = await asyncio.gather(*(run_task(s) for s in states))
merged_state = merge_branch_states(shared_state, results)
```

### Stateless (Pure Function) Pattern

Skills produce output but do not mutate shared state. Instead, each skill receives its inputs explicitly and returns a new value. The orchestrator threads values through the chain.

**Use when:** Skills are deterministic, idempotent, and have no side effects beyond their return value. This is the preferred pattern for testing and reproducibility.

```python
def process_review(
    code: str,
    security_findings: list[dict],
) -> dict:
    """Pure function: takes explicit inputs, returns deterministic output."""
    issues = analyze_code(code)
    # Merge with upstream security findings (explicitly passed, not shared state)
    all_issues = list(issues) + list(security_findings)
    return {
        "total_issues": len(all_issues),
        "by_severity": group_by_severity(all_issues),
        "recommendations": generate_recommendations(all_issues),
    }
```

---

## Error Handling Strategies

### Circuit Breaker Pattern

Prevents cascading failures when a downstream skill is persistently unhealthy. After N consecutive failures, the circuit opens and all subsequent calls return immediately with a fallback — no waiting on the failing service.

**Use when:** Calling external APIs, LLM providers, or database services that can experience extended outages. Always pair with a health-check endpoint.

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing fast — skip calls entirely
    HALF_OPEN = "half_open" # Testing recovery — allow one trial call

@dataclass
class CircuitBreaker:
    skill_name: str
    failure_threshold: int = 5        # Failures before opening
    recovery_timeout: float = 30.0    # Seconds before half-open
    expected_latency_ms: float = 2000  # Timeout per call

    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float | None = None

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.HALF_OPEN:
            return True  # Allow one trial call
        # OPEN state — check recovery timeout
        if (self.last_failure_time and
            time.time() - self.last_failure_time >= self.recovery_timeout):
            self.state = CircuitState.HALF_OPEN
            return True
        return False

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN


class CircuitOpenError(SkillError):
    """Raised when the circuit breaker is open and calls are rejected."""
    def __init__(self, skill_name: str, failure_count: int):
        super().__init__(skill_name, f"circuit open after {failure_count} failures", recoverable=False)


async def call_with_circuit(
    cb: CircuitBreaker,
    skill_fn: Callable[..., Awaitable[Any]],
    *args, **kwargs
) -> Any:
    """Execute a skill call through a circuit breaker guard."""
    if not cb.can_execute():
        raise CircuitOpenError(cb.skill_name, cb.failure_count)

    try:
        result = await asyncio.wait_for(
            skill_fn(*args, **kwargs),
            timeout=cb.expected_latency_ms / 1000.0
        )
        cb.record_success()
        return result
    except Exception as e:
        cb.record_failure()
        raise
```

### Retry With Exponential Backoff

Retry transient failures (network timeouts, rate limits) with increasing delays. Use jitter to prevent thundering herd when many parallel instances retry simultaneously.

**Use when:** The failure is likely transient and the skill is idempotent or has safe retry semantics. Never use for non-idempotent write operations without a deduplication key.

```python
import random
import asyncio

async def retry_with_backoff(
    fn: Callable[..., Awaitable[Any]],
    *,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter_range: float = 0.5,
    retryable_exceptions: tuple[type[Exception], ...] | None = None,
) -> Any:
    """Retry a skill invocation with exponential backoff and jitter."""
    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except Exception as e:
            last_error = e

            if retryable_exceptions and not isinstance(e, retryable_exceptions):
                raise  # Non-retryable — fail immediately

            if attempt == max_retries:
                break  # No more retries

            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * jitter_range)
            await asyncio.sleep(delay + jitter)

    raise last_error  # Exhausted all retries with the last exception
```

---

## Constraints

### MUST DO
- Define shared state schema before writing any orchestration code — never let data flow through implicit global variables or file paths
- Choose exactly one error strategy per edge and document it in the flow definition — never leave an edge without a strategy
- Implement circuit breakers for any skill that calls external services (APIs, databases, LLM providers)
- Record observability data at every boundary: timestamps, input summaries, output summaries or errors
- Keep composition code data-driven — read workflow definitions from JSON/YAML, not hardcoded per-workflow
- Use typed schemas (dataclasses, Pydantic models) for all inter-skill data contracts

### MUST NOT DO
- Mix error strategies on the same edge — one edge gets one strategy, applied consistently
- Allow skills to mutate global shared state without locks when running in parallel branches — use deep copies instead
- Hardcode skill invocation order in the orchestrator logic — always read from a workflow definition file
- Skip observability "to save performance" — composition debugging requires boundary-level logs
- Use blanket except Exception with silent swallowing at any boundary — always log or re-raise
- Parallelize skills that have implicit data dependencies (e.g., two skills both writing to the same temp file)

---

## Output Template

When designing or reviewing a multi-skill composition, produce:

1. **Topology Classification** — Which of the 5 patterns applies (sequential, fan-out/fan-in, conditional, error-isolated, human-gate), with justification
2. **Flow Diagram** — ASCII diagram showing all skills as nodes and edges, each labeled with data type and error strategy
3. **State Schema** — The typed contract for shared state between each pair of connected skills
4. **Error Strategy Matrix** — Table listing every edge with its chosen strategy (retry/skip/fallback/abort) and the fallback value when applicable
5. **Circuit Breaker Configuration** — For any edge calling external services: threshold, recovery timeout, expected latency

---

## Related Skills

| Skill | Purpose |
|---|---|
| `parallel-skill-runner` | Executes independent skills in parallel with concurrency control |
| `task-decomposition-engine` | Decomposes complex tasks into sub-tasks suitable for skill routing |
| `intelligent-skill-selection` | Routes individual tasks to the best matching skill |
| `skill-router-system` | Infrastructure for managing skill auto-loading and trigger matching |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [LangGraph Sequential and Parallel Patterns](https://langchain-ai.github.io/langgraph/concepts/orchestration/) — Official LangGraph documentation on composing chains of agents with sequential, parallel, and conditional flows
- [Temporal Workflow Orchestration](https://docs.temporal.io/workflows) — Temporal's documentation for building reliable multi-step workflows with fault tolerance
- [Apache Airflow DAG Patterns](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html) — Apache Airflow documentation on defining complex task dependencies and orchestration flows
- [Choreography vs Orchestration (Microsoft Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/orchestration-choreography) — Microsoft's comparison of orchestration patterns for distributed systems
- [Saga Pattern for Distributed Transactions (Martin Fowler)](https://martinfowler.com/articles/saga.html) — Fowler's reference on the Saga pattern for managing multi-step distributed workflows
