---
name: planning-patterns
description: Implements multi-step plan generation, iterative refinement, and dynamic task decomposition for proactive agent execution with self-correction.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: planning, multi-step plan, task decomposition, iterative refinement, dynamic planning, how do i plan complex tasks, CrewAI workflow, Google DeepResearch
  related-skills: prompt-chaining,multi-agent-orchestration,planning-with-files
  archetypes:
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Planning Pattern

Implements proactive planning patterns that transform reactive agents into strategic executors. This skill makes the model decompose high-level objectives into coherent sequences of interdependent sub-tasks, dynamically adapt plans based on intermediate results, and execute with self-correction loops — mirroring how advanced systems like CrewAI workflows and Google DeepResearch handle complex multi-step goals.

## TL;DR Checklist

- [ ] Decompose the objective into a directed graph of discrete, executable steps before any action
- [ ] Identify dependencies between steps and determine sequential vs parallel execution paths
- [ ] Generate intermediate checkpoints with validation criteria at each phase boundary
- [ ] Implement adaptive re-planning: if a step fails or produces unexpected output, re-evaluate and adjust remaining steps
- [ ] Maintain an execution log tracking which steps succeeded, failed, or required revision
- [ ] Synthesize final output by consolidating all intermediate results into the requested format
- [ ] Surface source transparency: cite data sources, queries executed, and reasoning traces

---

## When to Use

Use this skill when:

- A user request cannot be solved in a single action — it requires chaining multiple tools, agents, or steps (e.g., "write a competitive analysis report")
- You need to orchestrate workflows with interdependent sub-tasks where step N's output feeds into step N+1 (e.g., onboarding automation: create accounts → assign training → notify managers)
- The task involves exploratory research where the path forward is unknown until you gather intermediate data (e.g., "research market trends in AI healthcare")
- You are designing a CrewAI workflow, LangGraph pipeline, or any multi-agent system that requires explicit planning before execution
- A task demands iterative refinement — initial results must be evaluated, gaps identified, and subsequent searches/actions adjusted dynamically
- You need to explain your reasoning to the user before executing (DeepResearch-style plan approval)

## When NOT to Use

Avoid this skill for:

- Single-step tasks with a known solution path — use direct execution instead of planning overhead (e.g., "send this email", "format this string")
- Fixed, repeatable workflows where constraining the agent to a predetermined pipeline is safer and more reliable — rigid process automation has less uncertainty risk
- Vague or under-specified requests that lack a clear goal state — you cannot plan toward an undefined target; clarify first (use `query-feature-extraction` skill)
- Real-time latency-sensitive operations where planning overhead would degrade response time (sub-second API calls, live streaming)
- Tasks with fewer than 3 distinct sub-tasks — the planning infrastructure cost outweighs benefits for trivial decompositions

---

## Core Workflow

### Phase 1: Objective Deconstruction

1. **Parse Intent and Define State Boundaries** — Extract the explicit goal, implicit constraints (budget, time, tool availability), and both initial state (what you know) and goal state (what success looks like). If the request is ambiguous, ask clarifying questions before proceeding. Reference `code-philosophy` early exit: if the task is a single action, skip to direct execution.
   **Checkpoint:** Can you articulate the initial state, goal state, and at least 3 concrete constraints?

2. **Decompose Into Directed Sub-Tasks** — Break the high-level objective into discrete, executable steps arranged as a dependency graph. Each step must have: (a) a clear input requirement, (b) a specific tool or agent action, (c) a defined output contract. Mark each step as sequential (must complete before next), parallel (can execute simultaneously), or conditional (depends on prior result).
   **Checkpoint:** Does every step have a well-defined input → output transformation? Are parallel groups independent of each other?

### Phase 2: Plan Formulation and Review

3. **Generate Executable Execution Plan** — Construct a structured plan document containing: numbered steps with dependencies, expected tools per step, estimated complexity per step, and fallback strategies for known failure modes. Format the plan so a user can review and modify it before execution — this mirrors DeepResearch's collaborative plan-shaping approach.
   **Checkpoint:** Can a human reviewer understand, approve, or modify this plan without additional explanation?

4. **Identify Knowledge Gaps and Pre-Search Requirements** — Before executing, flag any information you do not yet have that is required by one or more steps. Design targeted queries or data-gathering actions to fill these gaps first. This mirrors Google DeepResearch's "identify knowledge gaps → refine queries" cycle.
   **Checkpoint:** Have you identified all unknowns? Is there a concrete action planned for each gap?

### Phase 3: Execution with Adaptive Re-Planning

5. **Execute Step-by-Step with Intermediate Validation** — Execute steps in dependency order. After each step, validate its output against the expected contract. Record success/failure/revision status. If validation fails, invoke adaptive re-planning: (a) analyze what went wrong, (b) adjust remaining steps if necessary, (c) continue from the current position or backtrack if a prerequisite was invalidated.
   **Checkpoint:** Is every step's output validated before proceeding to dependent steps? Are execution logs captured?

6. **Iterative Refinement Loop** — For tasks requiring exploratory research or multi-pass synthesis: after an initial pass, evaluate collected information for coverage gaps. Generate new queries targeting uncovered areas. Corroborate conflicting data points from different sources. Resolve discrepancies before proceeding to final synthesis. Repeat until no significant gaps remain or a maximum iteration budget is exhausted.
   **Checkpoint:** Have you checked for coverage completeness? Are contradictions resolved? Is the iteration count within bounds?

### Phase 4: Synthesis and Delivery

7. **Synthesize Final Output** — Consolidate all intermediate results into the requested output format. Structure the content into logical sections, identify major themes across sub-task results, and ensure coherent narrative flow. Include inline citations or references to source data wherever claims are made.
   **Checkpoint:** Does the final output match the user's requested format? Are all claims traceable to sources?

8. **Surface Transparency Artifacts** — Return not only the final deliverable but also: (a) the full execution plan and how it evolved, (b) the complete list of sources searched or consulted, (c) the reasoning traces for key decisions, and (d) any intermediate steps that were modified during adaptive re-planning. This enables user verification and debugging.
   **Checkpoint:** Can a reviewer trace every claim in the output back to its source and execution step?

---

## Implementation Patterns / Reference Guide

### Pattern 1: Sequential Planning with Validation Gates (CrewAI Style)

Use this pattern when steps have strict sequential dependencies and each step's output is a required input for the next. The plan generates, executes, and validates in a linear chain with explicit gate checks between steps.

```python
"""
Sequential planning workflow with validation gates.
Mirrors CrewAI's Process.sequential execution model.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "fail"
    REVISED = "revised"


@dataclass
class PlanStep:
    """A single executable step in a plan."""
    id: str
    description: str
    input_schema: dict[str, Any]
    output_contract: dict[str, Any]
    depends_on: list[str] = field(default_factory=list)
    execution_fn: Optional[callable] = None
    validation_fn: Optional[callable] = None
    status: StepStatus = StepStatus.PENDING

    def is_ready(self, completed_steps: set[str]) -> bool:
        """Check if all dependencies have succeeded."""
        return all(dep in completed_steps for dep in self.depends_on)


@dataclass
class ExecutionLog:
    """Tracks the complete execution history of a plan."""
    steps_executed: list[dict] = field(default_factory=list)
    revisions_made: list[dict] = field(default_factory=list)
    total_iterations: int = 0

    def record_step(self, step_id: str, status: StepStatus, result: Any = None, duration_ms: float = 0.0) -> None:
        self.steps_executed.append({
            "step_id": step_id,
            "status": status.value,
            "result_summary": str(result)[:500] if result else None,
            "duration_ms": round(duration_ms, 2),
        })


def execute_sequential_plan(steps: list[PlanStep], log: ExecutionLog) -> dict[str, Any]:
    """
    Execute steps in dependency order with validation gates.

    Returns a dict mapping step_id to validated output.
    Raises ValueError if an irreversible failure occurs.
    """
    results: dict[str, Any] = {}
    completed: set[str] = set()

    while len(completed) < len(steps):
        # Find next ready step
        ready_step: Optional[PlanStep] = None
        for step in steps:
            if step.status == StepStatus.PENDING and step.is_ready(completed):
                ready_step = step
                break

        if ready_step is None:
            raise RuntimeError(
                f"Deadlock: no pending step is ready. "
                f"Pending: {[s.id for s in steps if s.status == StepStatus.PENDING]}"
            )

        # Execute the step
        ready_step.status = StepStatus.RUNNING
        try:
            input_data = {dep: results[dep] for dep in ready_step.depends_on}
            output = ready_step.execution_fn(input_data)

            # Validation gate
            if ready_step.validation_fn and not ready_step.validation_fn(output):
                ready_step.status = StepStatus.FAILED
                log.record_step(ready_step.id, StepStatus.FAILED, duration_ms=0.0)
                raise ValueError(f"Validation failed for step '{ready_step.id}'")

            results[ready_step.id] = output
            ready_step.status = StepStatus.SUCCESS
            completed.add(ready_step.id)
            log.record_step(ready_step.id, StepStatus.SUCCESS, duration_ms=0.0)

        except Exception as exc:
            ready_step.status = StepStatus.FAILED
            log.record_step(ready_step.id, StepStatus.FAILED, result=str(exc))
            raise RuntimeError(f"Step '{ready_step.id}' failed: {exc}") from exc

    return results
```

**BAD — Planning without validation gates:**

```python
# ❌ BAD — Executes all steps blindly with no intermediate validation.
# If step 2 produces malformed data, step 3 will fail catastrophically
# and the entire plan is lost with no trace of what went wrong.

def execute_plan_badly(steps: list[PlanStep]) -> dict[str, Any]:
    results = {}
    for step in steps:
        input_data = {dep: results[dep] for dep in step.depends_on}
        # No validation, no error handling, no logging
        output = step.execution_fn(input_data)
        results[step.id] = output  # Will fail if step doesn't exist yet
    return results
```

**GOOD — Planning with validation gates and execution log:**

```python
# ✅ GOOD — Each step is validated before the next one starts.
# Failures are caught early, logged, and include enough context for debugging.
# The plan can be retried from any point without restarting from scratch.

def execute_plan_with_gates(steps: list[PlanStep], max_retries: int = 3) -> dict[str, Any]:
    log = ExecutionLog()
    results: dict[str, Any] = {}
    completed: set[str] = set()

    for attempt in range(max_retries):
        log.total_iterations = attempt + 1
        success = True

        while len(completed) < len(steps):
            ready_step = find_next_ready(steps, completed)
            if not ready_step:
                break

            try:
                output = execute_and_validate(ready_step, results)
                results[ready_step.id] = output
                completed.add(ready_step.id)
                log.record_step(ready_step.id, StepStatus.SUCCESS)
            except Exception as e:
                success = False
                log.record_step(ready_step.id, StepStatus.FAILED, result=str(e))
                break  # Retry outer loop

        if success:
            return results

    raise RuntimeError(f"Plan failed after {max_retries} iterations. Log: {log.steps_executed}")
```

### Pattern 2: Dynamic Query Generation with Knowledge-Gap Resolution (DeepResearch Style)

Use this pattern when the task requires exploratory research or information gathering where you do not know in advance what data is needed. The plan generates queries, evaluates collected results for coverage gaps, and iteratively refines subsequent queries — mirroring Google DeepResearch's adaptive search-and-filter cycle.

```python
"""
Dynamic query generation with knowledge-gap resolution.
Mirrors Google DeepResearch's iterative research loop.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ResearchQuery:
    """A single search query generated dynamically based on gaps."""
    id: str
    query_text: str
    priority: int  # Higher = more urgent to resolve
    targets_gap: str  # Which knowledge gap this addresses

    def __lt__(self, other: "ResearchQuery") -> bool:
        return self.priority > other.priority  # Sort by descending priority


@dataclass
class KnowledgeGap:
    """A piece of information we need but do not have."""
    id: str
    description: str
    required_for_steps: list[str]
    confidence: float = 0.0  # How likely our current data covers this

    def __repr__(self) -> str:
        status = "COVERED" if self.confidence >= 0.9 else "UNRESOLVED"
        return f"Gap({self.id}, confidence={self.confidence:.2f}, status={status})"


@dataclass
class ResearchResult:
    """A single search result with source metadata for transparency."""
    query_id: str
    content: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    relevance_score: float = 0.0

    @property
    def citation(self) -> str:
        """Generate a citable reference string."""
        if self.source_url and self.source_title:
            return f"[{self.source_title}]({self.source_url})"
        return "[uncited source]"


@dataclass
class ResearchPlan:
    """Manages the iterative research loop with gap tracking."""

    initial_query: str
    gaps: list[KnowledgeGap] = field(default_factory=list)
    queries: list[ResearchQuery] = field(default_factory=list)
    results: list[ResearchResult] = field(default_factory=list)
    sources_consulted: list[dict] = field(default_factory=list)

    def identify_gaps(self, available_data: dict[str, Any]) -> list[KnowledgeGap]:
        """
        Analyze what we have and identify remaining information gaps.

        This is the core of the iterative refinement loop:
        evaluate collected data → find coverage holes → generate new queries.
        """
        gaps = []

        for step_id in available_data.get("required_steps", []):
            if not available_data.get(step_id, {}).get("data"):
                gap = KnowledgeGap(
                    id=f"gap-{step_id}",
                    description=f"Missing data required by execution step '{step_id}'",
                    required_for_steps=[step_id],
                    confidence=0.0,
                )
                gaps.append(gap)

        return gaps

    def generate_queries(self, gaps: list[KnowledgeGap]) -> list[ResearchQuery]:
        """
        Convert knowledge gaps into concrete search queries.

        Uses gap descriptions to formulate targeted queries that maximize
        information yield per query — reducing wasted searches on covered areas.
        """
        queries = []
        for i, gap in enumerate(sorted(gaps, key=lambda g: len(g.required_for_steps), reverse=True)):
            queries.append(ResearchQuery(
                id=f"query-{i}",
                query_text=gap.description,
                priority=len(gap.required_for_steps),  # Prioritize gaps affecting more steps
                targets_gap=gap.id,
            ))
        return queries

    def execute_search_loop(
        self,
        search_fn: callable,
        max_iterations: int = 10,
        min_confidence_threshold: float = 0.9,
    ) -> dict[str, Any]:
        """
        Main iterative research loop: search → evaluate gaps → refine queries → repeat.

        Mirrors Google DeepResearch's managed long-running process that
        iteratively queries sources, identifies knowledge gaps, and resolves them.
        """
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Step 1: Identify remaining gaps based on what we know
            self.gaps = self.identify_gaps(
                available_data={"required_steps": list(range(10))}
            )

            # Step 2: Stop if all gaps are covered
            uncovered = [g for g in self.gaps if g.confidence < min_confidence_threshold]
            if not uncovered:
                break

            # Step 3: Generate targeted queries for uncovered gaps
            self.queries = self.generate_queries(uncovered)

            # Step 4: Execute queries (simulated with search_fn)
            for query in sorted(self.queries, key=lambda q: q.priority, reverse=True):
                search_results = search_fn(query.query_text)
                for result in search_results:
                    result_obj = ResearchResult(
                        query_id=query.id,
                        content=result.get("content", ""),
                        source_url=result.get("url"),
                        source_title=result.get("title"),
                        relevance_score=result.get("relevance", 0.0),
                    )
                    self.results.append(result_obj)

                    # Mark gap as partially or fully resolved
                    for gap in uncovered:
                        if gap.id == query.targets_gap:
                            gap.confidence = min(1.0, gap.confidence + 0.3)

                    self.sources_consulted.append({
                        "query": query.query_text,
                        "result": result_obj.citation,
                        "step_iteration": iteration,
                    })

        return {
            "iterations_used": iteration,
            "total_sources": len(self.sources_consulted),
            "remaining_gaps": [g for g in self.gaps if g.confidence < 0.9],
            "results_summary": {r.query_id: r.content[:200] for r in self.results},
        }
```

**BAD — Static research with no gap detection:**

```python
# ❌ BAD — Executes a fixed set of queries without evaluating whether
# the results actually cover all needed information. This wastes tokens
# on redundant searches and risks producing incomplete reports.

def static_research_badly(topics: list[str]) -> list[dict]:
    results = []
    for topic in topics:
        # Just run the same query template — no adaptation
        result = search(f"What is {topic}")
        results.append(result)
    return results  # No gap analysis, no iterative refinement
```

**GOOD — Dynamic research with gap-driven query generation:**

```python
# ✅ GOOD — Queries are generated based on identified knowledge gaps.
# Each iteration evaluates whether new information resolved the gaps.
# The loop terminates when coverage is sufficient or budget is exhausted.
# Every source is tracked for transparency and citation.

def dynamic_research_good(
    research_scope: str,
    required_sections: list[str],
    search_fn: callable,
    max_iterations: int = 10,
) -> dict[str, Any]:
    plan = ResearchPlan(initial_query=research_scope)

    # Seed initial gaps from the scope
    for section in required_sections:
        plan.gaps.append(KnowledgeGap(
            id=f"section-{section}",
            description=f"Information needed for section: {section}",
            required_for_steps=[section],
        ))

    # Run the iterative loop
    return plan.execute_search_loop(
        search_fn=search_fn,
        max_iterations=max_iterations,
        min_confidence_threshold=0.9,
    )
```

### Pattern 3: Plan Revision After Intermediate Failure (Adaptive Re-Planning)

When an execution step fails, do not abandon the entire plan. Analyze the failure, determine if remaining steps are still achievable with a modified approach, and continue from where you left off.

```python
"""
Adaptive re-planning: recover from failures without restarting.
"""


def adapt_after_failure(
    failed_step_id: str,
    error: Exception,
    completed_steps: dict[str, Any],
    remaining_steps: list[PlanStep],
) -> tuple[list[PlanStep], bool]:
    """
    Attempt to generate an adapted plan after a step failure.

    Returns (adapted_steps, is_recovery_possible).
    If recovery is not possible, returns the original remaining steps
    and False, signaling the caller to abort.
    """
    error_type = type(error).__name__

    # Strategy 1: Retry with adjusted parameters
    if "timeout" in str(error).lower() or "rate_limit" in str(error).lower():
        for step in remaining_steps:
            if step.id == failed_step_id:
                step.execution_fn = retry_with_backoff(step.execution_fn, base_delay=2.0)
                return remaining_steps, True

    # Strategy 2: Skip and mark partial if the step is non-critical
    # (only safe for steps whose output is not a hard dependency)
    critical_deps = find_dependents(failed_step_id, remaining_steps)
    if not critical_deps:
        for step in remaining_steps:
            if step.id == failed_step_id:
                step.status = StepStatus.REVISED
                completed_steps[failed_step_id] = {"status": "partial", "error": str(error)}
                return [s for s in remaining_steps if s.id != failed_step_id], True

    # Strategy 3: No known recovery — abort
    return [], False


def find_dependents(step_id: str, steps: list[PlanStep]) -> list[str]:
    """Find all steps that depend on the given step."""
    dependents = []
    for step in steps:
        if step_id in step.depends_on:
            dependents.append(step.id)
    return dependents


def retry_with_backoff(fn: callable, base_delay: float = 1.0, max_retries: int = 3) -> callable:
    """Wrap a function with exponential backoff retry logic."""
    import time

    def wrapped(*args, **kwargs):
        for attempt in range(max_retries):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if "timeout" not in str(e).lower() and "rate_limit" not in str(e).lower():
                    raise
                delay = base_delay * (2 ** attempt)
                time.sleep(delay)
        raise RuntimeError(f"All {max_retries} retries exhausted")

    return wrapped
```

---

## Constraints

### MUST DO

1. **Decompose before executing** — Never begin task execution without first generating and documenting a structured plan. The plan must list each step, its inputs/outputs, dependencies, and execution order (sequential or parallel). This is the core distinction between reactive and proactive agent behavior.

2. **Validate outputs at phase boundaries** — After completing any group of steps, validate that intermediate results meet expected contracts before proceeding. Do not cascade errors by pushing malformed data into dependent steps. Reference `code-philosophy` Parse Don't Validate: parse at boundaries (step I/O), trust validated internals.

3. **Track execution transparency** — Always maintain and return: (a) the plan as executed (not just planned), (b) the complete list of sources queried or consulted, (c) reasoning traces for any major deviations from the original plan. This enables user verification and debugging.

4. **Implement iterative refinement with bounds** — When using dynamic query generation or gap-driven research, always enforce a maximum iteration budget (default: 10 iterations). Never allow unbounded loops. Report remaining gaps when the budget is exhausted so the user knows what was not resolved.

5. **Handle failures adaptively, not catastrophically** — When a step fails, analyze whether the failure is recoverable (retry with backoff), bypassable (non-critical path), or fatal (core dependency chain broken). Only abort when recovery is genuinely impossible. Reference `code-philosophy` Fail Fast: halt with descriptive errors for truly unrecoverable states.

6. **Structure final output for synthesis** — Consolidate all intermediate results into the requested output format. Identify major themes, organize content into logical sections, ensure coherent narrative flow, and include inline citations or source references for every substantive claim.

7. **Respect tool and API constraints** — When generating queries or planning tool usage, account for rate limits, token budgets, and concurrent request limits. Queue parallel-safe steps but respect per-tool concurrency caps to avoid throttling or bans.

8. **Align with the 5 Laws of Elegant Defense (code-philosophy)** — Design plans where data flows naturally through each step's pipeline (Early Exit: skip unnecessary work), parse all external inputs at step boundaries (Parse Don't Validate), keep each step's logic pure and testable (Atomic Predictability), surface errors with full context (Fail Fast), and name every planning variable after its intent, not its type (Intentional Naming).

### MUST NOT DO

1. **Do not plan tasks that are single-step operations** — If the entire objective can be accomplished by one tool call or action, skip planning entirely. Planning overhead on trivial tasks wastes tokens and adds latency with zero benefit.

2. **Do not hardcode plans for dynamic problems** — Never write a static sequence of actions for a problem whose solution space changes based on intermediate results. Use the Dynamic Query Generation pattern instead. Static plans for exploratory tasks produce incomplete or stale outputs.

3. **Do not skip gap analysis before executing queries** — Running blind searches without first identifying what information you need produces redundant results, wasted resources, and coverage holes. Always generate a gap list first, then target queries at specific gaps.

4. **Do not return final output without source transparency** — Never deliver research or analysis results without accompanying source citations, query traces, or reasoning documentation. Users must be able to verify claims independently. Omitting this breaks trust and auditability.

5. **Do not allow unbounded iterative loops** — Every refinement loop must have a hard iteration cap (configurable default: 10). Never let a dynamic planning process run indefinitely. Time-box exploration and report what was not completed.

6. **Do not present plans as immutable scripts** — A plan is a hypothesis about how to solve a problem, not a rigid command sequence. The moment new information invalidates part of the plan, revise it. Communicate revisions clearly to the user so they understand why the approach changed.

---

## Output Template

When this skill is active, structure your response using the following template:

### 1. Plan Overview
- **Objective:** [Restate the user's goal in one sentence]
- **Initial State:** [What you know at start — tools available, data already present, constraints]
- **Goal State:** [Definition of success — what the final deliverable looks like]
- **Approach:** [Sequential / Parallel / Hybrid execution strategy and why]

### 2. Execution Plan
Present steps as a numbered table:

| # | Step | Dependencies | Tool/Agent | Input → Output | Validation |
|---|------|-------------|------------|----------------|------------|
| 1  | [description] | — | [tool] | [input_schema] → [output_contract] | [criteria] |
| 2  | [description] | [1] | [tool] | ... | ... |

### 3. Knowledge Gaps (if applicable)
List identified gaps with confidence levels and the queries planned to resolve them:

| Gap ID | Description | Confidence | Resolution Query | Status |
|--------|-------------|------------|-------------------|--------|
| gap-1 | [what is missing] | [0.0–1.0] | [targeted query text] | PENDING |

### 4. Execution Summary
After running the plan, provide:

- **Steps executed:** N / M completed successfully
- **Iterations used:** N of max_budget (for iterative research)
- **Sources consulted:** List all URLs/titles accessed
- **Revisions made:** [If any step was modified during execution, describe what changed and why]
- **Remaining gaps:** [If budget was exhausted before full coverage, list unresolved items]

### 5. Final Deliverable
The actual requested output (report, analysis, code, summary), properly structured with:
- Section headers matching the user's requested format
- Inline citations or source references for every factual claim
- Coherent narrative flow synthesized from intermediate results

### 6. Transparency Artifacts (API users)
- Full reasoning trace for any non-obvious decisions
- All web search queries executed and their responses
- Code interpreter outputs if tools were used
- The evolved plan (original vs final) showing all revisions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `prompt-chaining` | Chains discrete agent calls in a pipeline — planning patterns sit above this as the orchestrator that decides WHEN to chain and IN WHAT ORDER |
| `multi-agent-orchestration` | Manages multiple concurrent agents — planning provides the task decomposition and dependency graph that orchestration distributes across agents |
| `planning-with-files` | Handles file-system-based state persistence for long-running plans — complements this skill by providing durable execution tracking |

> 📖 skill(local cache): prompt-chaining, multi-agent-orchestration, planning-with-files