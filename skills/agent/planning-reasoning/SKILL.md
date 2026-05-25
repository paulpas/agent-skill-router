---
name: planning-reasoning
description: Implements agent reasoning patterns (ReAct loop, chain-of-thought planning, self-reflection evaluation) for structured multi-step task execution with verification.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: ReAct, reasoning, chain of thought, plan execute, self reflection, task planning, step by step, agent reasoning, reasoning loop, task decomposition
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: tool-use-function-calling, memory-systems, multi-agent-orchestration
  archetypes:
  - tactical
  - orchestration
  anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture planning
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Planning & Reasoning Patterns

Implements structured reasoning patterns for AI agents — ReAct loop execution, chain-of-thought planning, self-reflection evaluation, and plan-and-execute decomposition with verification at every step. Loading this skill makes the model produce deterministic multi-step execution plans with explicit thought-action-observation cycles, validate intermediate results before proceeding, and apply self-reflection to catch errors early.

## TL;DR Checklist

- [ ] Decompose the task into discrete sub-tasks with clear inputs/outputs
- [ ] Execute each sub-task via a ReAct loop (Thought → Action → Observation → Evaluate)
- [ ] Validate every intermediate result before advancing to the next step
- [ ] Apply self-reflection after execution: score accuracy, completeness, and safety
- [ ] Roll back or re-execute if validation fails — never propagate broken state
- [ ] Synthesize final output only when all steps pass verification

---

## When to Use

Use this skill when:

- An agent must execute a multi-step task where intermediate results depend on prior outputs (e.g., data extraction → transformation → summarization)
- The problem requires reasoning before acting — the agent must plan, hypothesize, then act based on observations
- Error recovery is critical and the agent needs to self-evaluate its own output quality
- You are building an agent that uses tool calls where each tool's result influences the next decision (e.g., search → read → summarize → verify)

---

## When NOT to Use

Avoid this skill for:

- Simple one-step tasks that don't require decomposition (e.g., "what is 2+2?") — overhead outweighs benefit
- Real-time streaming responses where latency is paramount and planning steps add unacceptable delay
- Pure knowledge retrieval without tool interaction — a direct LLM call suffices

---

## Core Workflow

### Step 1: Decompose Task into Sub-tasks

Break the user's request into discrete, executable sub-tasks. Each sub-task must declare its **input schema**, **output schema**, and **success criteria**. Use chain-of-thought reasoning to identify dependencies between sub-tasks before executing anything.

```python
from dataclasses import dataclass
from enum import Enum
from typing import Any


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class SubTask:
    """A single executable unit within a larger plan."""
    id: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    success_criteria: list[str]
    depends_on: list[str] = None  # List of sub-task IDs this depends on

    def __post_init__(self):
        if self.depends_on is None:
            self.depends_on = []


@dataclass
class PlanGraph:
    """Directed acyclic graph of sub-tasks with dependency tracking."""
    sub_tasks: dict[str, SubTask]
    execution_order: list[str]

    @classmethod
    def build(cls, sub_tasks: list[SubTask]) -> "PlanGraph":
        """Topological sort to determine valid execution order."""
        graph = {st.id: st for st in sub_tasks}
        visited = set()
        order = []

        def visit(task_id: str):
            if task_id in visited:
                return
            visited.add(task_id)
            task = graph[task_id]
            for dep_id in task.depends_on:
                if dep_id not in graph:
                    raise ValueError(f"Unknown dependency: {dep_id}")
                visit(dep_id)
            order.append(task_id)

        for task_id in graph:
            visit(task_id)

        return cls(sub_tasks=graph, execution_order=order)
```

**Checkpoint:** Verify that the plan graph contains no cycles and every sub-task has at least one success criterion. If a dependency references a non-existent task, fail fast with a clear error message.

### Step 2: Execute ReAct Loop

For each sub-task in execution order, run a **Reasoning-Acting loop**. Each cycle produces a Thought (hypothesis of what to do next), an Action (tool call or decision), and an Observation (result). Limit cycles per sub-task to prevent infinite loops.

```python
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class ReActStep:
    """A single cycle within the ReAct loop."""
    step_number: int
    thought: str
    action_type: str
    action_input: dict[str, Any]
    observation: str | None = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)


class ReActEngine:
    """Executes a ReAct (Reasoning + Acting) loop for a single sub-task.

    Each cycle: Thought → Action → Observation → Evaluate.
    Stops when success criteria are met or max_iterations is reached.
    """

    def __init__(self, max_iterations: int = 10):
        self.max_iterations = max_iterations

    def execute(
        self,
        sub_task: SubTask,
        agent_context: dict[str, Any],
        tool_executor: callable,
        reasoner: callable,
    ) -> list[ReActStep]:
        """Run the ReAct loop until the task succeeds or max iterations hit.

        Args:
            sub_task: The sub-task to execute.
            agent_context: Shared state across all sub-tasks (memory, results cache).
            tool_executor: Function that performs tool calls. Signature: tool_executor(tool_name, args) -> result.
            reasoner: LLM-based reasoning function. Signature: reasoner(context, steps) -> thought.

        Returns:
            List of ReActStep instances representing the full execution trace.

        Raises:
            MaxIterationsError: If the loop exceeds max_iterations without success.
        """
        steps: list[ReActStep] = []
        state = {
            "input": agent_context.get("inputs", {}).get(sub_task.id),
            "partial_results": [],
        }

        for iteration in range(1, self.max_iterations + 1):
            # Thought: reason about what to do next
            context_for_reasoning = {
                "sub_task": sub_task.description,
                "state": state,
                "steps_completed": len(steps),
                "success_criteria": sub_task.success_criteria,
            }
            thought = reasoner(context_for_reasoning, steps)

            # Action: decide and execute a tool call or direct answer
            action_type, action_input = self._parse_decision(thought)
            observation = None

            if action_type == "tool_call":
                tool_name = action_input.get("tool")
                tool_args = {k: v for k, v in action_input.items() if k != "tool"}
                observation = str(tool_executor(tool_name, tool_args))
                logger.debug(f"Iteration {iteration}: called {tool_name} with args={tool_args}")
            elif action_type == "final_answer":
                observation = action_input.get("answer", "")
            else:
                observation = f"Unexpected action type: {action_type}"

            step = ReActStep(
                step_number=iteration,
                thought=thought,
                action_type=action_type,
                action_input=action_input,
                observation=observation,
            )
            steps.append(step)

            # Evaluate: check success criteria
            if self._evaluate_success(step, state):
                logger.info(f"Sub-task {sub_task.id} succeeded after {iteration} iterations")
                return steps

        raise MaxIterationsError(
            f"Sub-task '{sub_task.id}' exceeded max_iterations ({self.max_iterations}) "
            f"without meeting success criteria. Last thought: {steps[-1].thought}"
        )

    def _parse_decision(self, thought: str) -> tuple[str, dict]:
        """Parse a reasoning step into an action decision.

        This is simplified — in production, use an LLM function-calling endpoint.
        """
        if "final" in thought.lower() or "answer" in thought.lower():
            return "final_answer", {"answer": thought}
        return "tool_call", {"tool": "next_action", "args": {}}

    def _evaluate_success(self, step: ReActStep, state: dict) -> bool:
        """Check if the current step meets any success criterion."""
        if step.action_type == "final_answer" and step.observation:
            state["partial_results"].append(step.observation)
            return True
        return False


class MaxIterationsError(Exception):
    """Raised when a ReAct loop exceeds its iteration budget."""
    pass
```

**Checkpoint:** After the ReAct loop completes, verify that at least one `final_answer` step exists. If the loop exited due to max_iterations, trigger Step 4 (Self-Reflection) to assess whether partial results are salvageable or if a re-execution with different parameters is needed.

### Step 3: Validate Step Output

Before advancing to the next sub-task, validate that each result matches its declared output schema and success criteria. If validation fails, attempt rollback of dependent steps.

```python
from functools import reduce


def validate_output(
    sub_task: SubTask,
    result: str,
    context: dict[str, Any],
) -> tuple[bool, list[str]]:
    """Validate a sub-task's output against its schema and success criteria.

    Args:
        sub_task: The sub-task whose result is being validated.
        result: The string output from the ReAct loop's final_answer step.
        context: Shared agent context including results from prior sub-tasks.

    Returns:
        Tuple of (is_valid, list_of_validation_messages).
    """
    messages: list[str] = []
    is_valid = True

    # Check success criteria
    for criterion in sub_task.success_criteria:
        if not _check_criterion(criterion, result, context):
            messages.append(f"[FAIL] Criterion not met: '{criterion}'")
            is_valid = False
        else:
            messages.append(f"[PASS] Criterion met: '{criterion}'")

    # Check that dependent sub-task outputs are still consistent
    for dep_id in sub_task.depends_on:
        if dep_id in context.get("results", {}):
            dep_result = context["results"][dep_id]
            if not _check_dependency_consistency(dep_result, result):
                messages.append(f"[WARN] Output may be inconsistent with dependency '{dep_id}'")

    return is_valid, messages


def rollback_plan(
    plan: PlanGraph,
    failed_task_id: str,
    context: dict[str, Any],
) -> list[str]:
    """Roll back a sub-task and all tasks that depend on it.

    Args:
        plan: The PlanGraph containing all sub-tasks.
        failed_task_id: ID of the task that failed validation.
        context: Shared agent context with results to clean up.

    Returns:
        List of task IDs that were rolled back (including the failed one).
    """
    visited = set()

    def collect_dependents(task_id: str):
        if task_id in visited:
            return
        visited.add(task_id)
        for candidate_id, candidate_task in plan.sub_tasks.items():
            if task_id in candidate_task.depends_on:
                collect_dependents(candidate_id)

    collect_dependents(failed_task_id)

    # Clean up results from context
    results = context.get("results", {})
    cleaned = {k: v for k, v in results.items() if k not in visited}
    context["results"] = cleaned
    context["status"] = "rolled_back"

    return sorted(visited)


def _check_criterion(criterion: str, result: str, context: dict) -> bool:
    """Evaluate a single success criterion against the result string."""
    if "non-empty" in criterion.lower():
        return len(result.strip()) > 0
    if "length" in criterion.lower():
        try:
            parts = criterion.split()
            min_len = int(parts[-1])
            return len(result) >= min_len
        except (ValueError, IndexError):
            return True
    # Default: accept result as valid
    return True


def _check_dependency_consistency(dep_result: str, current_result: str) -> bool:
    """Heuristic check that the current result doesn't contradict dependencies."""
    if not dep_result or not current_result:
        return True
    # In production: use semantic similarity or structured comparison
    return len(current_result.strip()) > 0
```

**Checkpoint:** After validation, if `is_valid` is False and rollback occurred, proceed to Step 4 (Self-Reflection) to evaluate whether the failure is recoverable (e.g., retry with different tool parameters) or indicates a fundamental plan flaw requiring full re-decomposition.

### Step 4: Self-Reflect on Execution

After all sub-tasks complete (or after a rollback), run a structured self-reflection evaluation. Score the solution across accuracy, completeness, and safety dimensions. If any score falls below threshold, decide whether to re-execute or accept with notes.

```python
from dataclasses import dataclass, field


@dataclass
class ReflectionScore:
    """Quality score for a single evaluation dimension."""
    dimension: str  # e.g., "accuracy", "completeness", "safety"
    score: float     # 0.0 to 1.0
    rationale: str

    @property
    def passes(self) -> bool:
        return self.score >= 0.7


@dataclass
class SelfReflectionResult:
    """Aggregate self-reflection output."""
    scores: list[ReflectionScore] = field(default_factory=list)
    needs_rollback: bool = False
    re_execute_candidates: list[str] = field(default_factory=list)
    overall_quality: str = "unknown"  # "high", "medium", "low"

    @property
    def passes(self) -> bool:
        return all(s.passes for s in self.scores)

    @property
    def lowest_dimension(self) -> str | None:
        if not self.scores:
            return None
        return min(self.scores, key=lambda s: s.score).dimension


class SelfReflectionEvaluator:
    """Evaluates the quality of a completed agent execution.

    In production, this uses an LLM to score outputs. The example below
    shows both a heuristic fallback and the structure for LLM-based scoring.
    """

    def __init__(
        self,
        thresholds: dict[str, float] = None,
        reasoner: callable = None,
    ):
        # Default thresholds per dimension
        self.thresholds = thresholds or {
            "accuracy": 0.8,
            "completeness": 0.7,
            "safety": 0.9,
        }
        self.reasoner = reasoner

    def evaluate(
        self,
        plan: PlanGraph,
        execution_trace: list[list[ReActStep]],
        context: dict[str, Any],
    ) -> SelfReflectionResult:
        """Run structured self-reflection on completed execution.

        Args:
            plan: The original PlanGraph of sub-tasks.
            execution_trace: Per-sub-task ReAct step sequences (indexed by execution_order).
            context: Shared agent context with results.

        Returns:
            SelfReflectionResult with scores and recommendations.
        """
        all_results = {}
        for i, task_id in enumerate(plan.execution_order):
            if i < len(execution_trace):
                # Extract final answer from the last step
                steps = execution_trace[i]
                if steps:
                    last_step = steps[-1]
                    all_results[task_id] = last_step.observation or ""

        reflection = SelfReflectionResult()

        dimensions = ["accuracy", "completeness", "safety"]
        for dim in dimensions:
            score = self._score_dimension(dim, plan, all_results, context)
            reflection.scores.append(score)
            if score.score < self.thresholds.get(dim, 0.7):
                reflection.needs_rollback = True

        # Determine which tasks are candidates for re-execution
        for task_id in plan.execution_order:
            result = all_results.get(task_id, "")
            if not result or len(result.strip()) < 5:
                reflection.re_execute_candidates.append(task_id)

        # Set overall quality label
        avg_score = sum(s.score for s in reflection.scores) / max(len(reflection.scores), 1)
        if avg_score >= 0.85:
            reflection.overall_quality = "high"
        elif avg_score >= 0.65:
            reflection.overall_quality = "medium"
        else:
            reflection.overall_quality = "low"

        return reflection

    def _score_dimension(
        self,
        dimension: str,
        plan: PlanGraph,
        results: dict[str, str],
        context: dict,
    ) -> ReflectionScore:
        """Score a single quality dimension. Uses LLM reasoner if provided."""
        if self.reasoner:
            # Production path: ask the LLM to score
            prompt = self._build_scoring_prompt(dimension, plan, results)
            response = self.reasoner(prompt)
            return self._parse_llm_score(response, dimension)

        # Heuristic fallback
        all_text = " ".join(results.values())
        if dimension == "accuracy":
            # Check for obvious error markers
            error_markers = ["error", "failed", "unable", "could not"]
            confidence = 1.0 - sum(1 for m in error_markers if m in all_text.lower()) * 0.2
            return ReflectionScore(dimension, max(0.0, min(1.0, confidence)), f"Heuristic accuracy score based on error markers")
        elif dimension == "completeness":
            total_steps = len(plan.sub_tasks)
            completed_steps = sum(1 for v in results.values() if v and len(v.strip()) > 5)
            ratio = completed_steps / max(total_steps, 1)
            return ReflectionScore(dimension, ratio, f"Completed {completed_steps}/{total_steps} steps")
        else:
            # Safety — default high unless explicit risk markers found
            risk_markers = ["unsafe", "malicious", "exploit", "bypass"]
            confidence = 1.0 - sum(1 for m in risk_markers if m in all_text.lower()) * 0.25
            return ReflectionScore(dimension, max(0.0, min(1.0, confidence)), f"Heuristic safety score based on risk markers")

    def _build_scoring_prompt(self, dimension: str, plan: PlanGraph, results: dict) -> str:
        task_summaries = "\n".join(
            f"  - {tid}: {plan.sub_tasks[tid].description} → result length: {len(results.get(tid, ''))}"
            for tid in plan.execution_order
        )
        return (
            f"Evaluate execution quality on '{dimension}' dimension.\n\n"
            f"Tasks executed:\n{task_summaries}\n\n"
            f"Score from 0.0 to 1.0 where 1.0 is perfect. Return JSON: "
            f'{{"score": <float>, "rationale": "<string>"}}'
        )

    def _parse_llm_score(self, response: str, dimension: str) -> ReflectionScore:
        """Parse an LLM scoring response into a ReflectionScore."""
        try:
            import json
            parsed = json.loads(response.strip())
            return ReflectionScore(
                dimension=dimension,
                score=float(parsed["score"]),
                rationale=str(parsed.get("rationale", "")),
            )
        except (json.JSONDecodeError, KeyError, ValueError):
            # Fallback: assume medium quality if parsing fails
            return ReflectionScore(dimension, 0.5, f"Could not parse LLM response — heuristic fallback")
```

**Checkpoint:** After self-reflection, if `needs_rollback` is True or `re_execute_candidates` is non-empty, identify which sub-tasks to retry. Use the reflection rationale to adjust parameters (e.g., increase max_iterations, change tool selection) before re-execution.

### Step 5: Compile Final Answer

Synthesize results from all verified sub-tasks into a coherent final output. Include execution provenance for traceability.

```python
@dataclass
class FinalAnswer:
    """Structured final answer with execution provenance."""
    content: str
    execution_provenance: dict[str, Any]
    quality_assessment: SelfReflectionResult | None = None
    warnings: list[str] = field(default_factory=list)


def compile_final_answer(
    plan: PlanGraph,
    execution_trace: list[list[ReActStep]],
    reflection: SelfReflectionResult,
    context: dict[str, Any],
) -> FinalAnswer:
    """Synthesize all verified sub-task results into a final answer.

    Args:
        plan: The PlanGraph of sub-tasks.
        execution_trace: Per-sub-task ReAct step sequences.
        reflection: Self-reflection evaluation result.
        context: Shared agent context.

    Returns:
        FinalAnswer with synthesized content and provenance metadata.
    """
    components = []
    warnings = []

    for i, task_id in enumerate(plan.execution_order):
        if i < len(execution_trace) and execution_trace[i]:
            last_step = execution_trace[i][-1]
            sub_task = plan.sub_tasks[task_id]
            status = "completed" if last_step.action_type == "final_answer" else "incomplete"

            components.append({
                "task": task_id,
                "description": sub_task.description,
                "status": status,
                "result": last_step.observation or "[no output]",
                "iterations_used": len(execution_trace[i]),
            })

    if reflection.re_execute_candidates:
        warnings.append(
            f"Tasks were re-executed or failed: {', '.join(reflection.re_execute_candidates)}"
        )

    if reflection.overall_quality == "low":
        warnings.append("Overall execution quality is LOW — review recommended")

    provenance = {
        "plan_task_count": len(plan.sub_tasks),
        "execution_steps_total": sum(len(s) for s in execution_trace),
        "sub_task_results": components,
        "quality_score": reflection.overall_quality,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    # Build human-readable summary
    summary_parts = [f"Executed {plan.execution_order.__len__()} sub-tasks."]
    for comp in components:
        status_emoji = "✅" if comp["status"] == "completed" else "⚠️"
        summary_parts.append(
            f"  {status_emoji} [{comp['task']}] {comp['description']}: "
            f"{comp['result'][:100]}..." if len(comp['result']) > 100
            else f"  {status_emoji} [{comp['task']}] {comp['description']}: {comp['result']}"
        )

    return FinalAnswer(
        content="\n".join(summary_parts),
        execution_provenance=provenance,
        quality_assessment=reflection,
        warnings=warnings,
    )
```

---

## Implementation Patterns

### Pattern 1: ReAct Loop with Tool Integration

A production-ready ReAct engine that integrates with an arbitrary tool registry. Handles concurrent tool calls and tracks reasoning state across cycles.

```python
import asyncio
from dataclasses import dataclass, field


@dataclass
class ToolRegistry:
    """Registry of available tools for the ReAct engine."""
    tools: dict[str, callable] = field(default_factory=dict)

    def register(self, name: str, fn: callable):
        """Register a tool function with the registry."""
        self.tools[name] = fn

    async def call(self, name: str, **kwargs) -> Any:
        """Dispatch a tool call, supporting both sync and async tools."""
        fn = self.tools.get(name)
        if not fn:
            raise ToolNotFoundError(f"Tool '{name}' not registered")

        result = fn(**kwargs)
        # Await if the tool is async
        if asyncio.iscoroutine(result):
            return await result
        return result


class ToolNotFoundError(Exception):
    pass


async def run_react_loop(
    initial_query: str,
    registry: ToolRegistry,
    max_iterations: int = 10,
) -> FinalAnswer:
    """Run a full ReAct loop with tool integration.

    This is the main entry point for agent execution using the ReAct pattern.
    It decomposes the query into a plan, executes sub-tasks via ReAct loops,
    validates results, and compiles a final answer.

    Args:
        initial_query: The user's original task description.
        registry: ToolRegistry with all available tools.
        max_iterations: Maximum ReAct cycles per sub-task.

    Returns:
        FinalAnswer with synthesized result and provenance.
    """
    engine = ReActEngine(max_iterations=max_iterations)

    # Phase 1: Plan — decompose query into sub-tasks
    # In production, use an LLM to generate SubTask instances
    plan = PlanGraph.build([
        SubTask(
            id="extract",
            description="Extract relevant information from the query context",
            input_schema={"query": str},
            output_schema={"extracted_data": list[dict]},
            success_criteria=["non-empty result", "length > 10"],
        ),
        SubTask(
            id="process",
            description="Process and transform the extracted data",
            input_schema={"raw_data": list[dict]},
            output_schema={"processed": dict},
            success_criteria=["non-empty result", "contains key 'result'"],
            depends_on=["extract"],
        ),
        SubTask(
            id="verify",
            description="Verify the processed result against quality criteria",
            input_schema={"processed_data": dict},
            output_schema={"verification": str},
            success_criteria=["non-empty result", "length > 5"],
            depends_on=["process"],
        ),
    ])

    context: dict[str, Any] = {"inputs": {}, "results": {}}
    execution_trace: list[list[ReActStep]] = [[] for _ in plan.execution_order]

    # Phase 2: Execute each sub-task via ReAct loop
    for i, task_id in enumerate(plan.execution_order):
        sub_task = plan.sub_tasks[task_id]
        context["inputs"][task_id] = {
            "query": initial_query,
            "prior_results": {dep: context["results"].get(dep) for dep in sub_task.depends_on},
        }

        try:
            steps = engine.execute(
                sub_task=sub_task,
                agent_context=context,
                tool_executor=lambda name, args: asyncio.get_event_loop().run_until_complete(
                    registry.call(name, **args)
                ),
                reasoner=_default_reasoner,
            )
            execution_trace[i] = steps

            # Phase 3: Validate
            is_valid, messages = validate_output(sub_task, steps[-1].observation or "", context)
            logger.info(f"Validation for '{task_id}': {messages}")

            if not is_valid:
                rolled_back = rollback_plan(plan, task_id, context)
                logger.warning(f"Rollback triggered for '{task_id}': rolled back {rolled_back}")

        except MaxIterationsError as e:
            logger.error(f"ReAct loop failed for '{task_id}': {e}")
            execution_trace[i] = [ReActStep(step_number=0, thought=str(e), action_type="error", action_input={})]

    # Phase 4: Self-reflection
    evaluator = SelfReflectionEvaluator()
    reflection = evaluator.evaluate(plan, execution_trace, context)

    # Phase 5: Compile final answer
    return compile_final_answer(plan, execution_trace, reflection, context)


def _default_reasoner(context: dict, steps: list[ReActStep]) -> str:
    """Default reasoning function — in production, replace with an LLM call."""
    if not steps:
        return f"Starting task. I need to analyze the input and determine which tool to call first."
    last = steps[-1]
    if last.action_type == "final_answer":
        return f"Final answer reached: {last.observation}"
    return f"After observing '{last.observation[:50]}...', I should proceed with the next action."
```

### Pattern 2: Self-Reflection Multi-Dimension Evaluator

A quality scoring system that evaluates agent outputs across accuracy, completeness, and safety. Uses an LLM scorer for nuanced evaluation with deterministic fallbacks.

```python
def evaluate_with_llm(
    task_description: str,
    final_result: str,
    llm_client: callable,
    dimensions: list[str] = None,
) -> list[ReflectionScore]:
    """Evaluate a final result using an LLM scorer across multiple dimensions.

    Args:
        task_description: What the agent was asked to accomplish.
        final_result: The agent's final output string.
        llm_client: Callable that takes (prompt, model) -> parsed JSON response.
        dimensions: Quality dimensions to evaluate. Defaults to accuracy/completeness/safety.

    Returns:
        List of ReflectionScore instances with scores and rationales.

    Raises:
        ScoringError: If the LLM client returns unparseable responses.
    """
    if dimensions is None:
        dimensions = ["accuracy", "completeness", "safety"]

    scores = []
    for dim in dimensions:
        prompt = (
            f"Task: {task_description}\n\n"
            f"Agent output:\n{final_result}\n\n"
            f"Score the '{dim}' of this output on a scale from 0.0 to 1.0.\n"
            f"Return ONLY valid JSON with exactly two keys: 'score' (float 0-1) and "
            f"'rationale' (string explaining the score in 1-2 sentences).\n"
            f"No markdown, no code blocks — raw JSON only."
        )

        try:
            response = llm_client(prompt, model="gpt-4")
            parsed = _parse_json_response(response)
            scores.append(ReflectionScore(
                dimension=dim,
                score=float(parsed["score"]),
                rationale=str(parsed["rationale"]),
            ))
        except (KeyError, ValueError, TypeError) as e:
            # Deterministic fallback when LLM scoring fails
            scores.append(ReflectionScore(
                dimension=dim,
                score=0.5,
                rationale=f"LLM scoring failed ({type(e).__name__}) — using heuristic fallback",
            ))

    return scores


def _parse_json_response(response: str) -> dict:
    """Extract JSON from an LLM response, handling markdown wrapping."""
    cleaned = response.strip()
    # Remove markdown code block wrappers
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1])
    return json.loads(cleaned)


class ScoringError(Exception):
    """Raised when LLM scoring produces invalid results."""
    pass
```

### Pattern 3: Plan-and-Execute with Rollback

Shows task decomposition into a dependency graph with automatic rollback on failure, ensuring broken intermediate state never propagates forward.

```python
def execute_plan_with_rollback(
    sub_tasks: list[SubTask],
    tool_executor: callable,
    reasoner: callable,
    max_iterations: int = 10,
) -> dict[str, Any]:
    """Execute a plan with automatic rollback on any sub-task failure.

    This function builds a PlanGraph from the provided sub-tasks, executes each
    in dependency order via ReAct loops, and rolls back all downstream tasks
    if any upstream task fails validation.

    Args:
        sub_tasks: List of SubTask definitions with dependencies declared.
        tool_executor: Callable that performs tool calls.
        reasoner: Callable for reasoning at each ReAct step.
        max_iterations: Max ReAct cycles per sub-task.

    Returns:
        Dict with keys: 'results' (dict of task_id -> output), 'failed_at' (task_id or None),
        'rollback_performed' (bool), and 'plan' (the built PlanGraph).

    Raises:
        ValueError: If the dependency graph contains cycles.
    """
    try:
        plan = PlanGraph.build(sub_tasks)
    except RecursionError:
        raise ValueError("Dependency cycle detected in sub-tasks")

    engine = ReActEngine(max_iterations=max_iterations)
    results: dict[str, Any] = {}
    failed_at: str | None = None
    rollback_performed = False

    for task_id in plan.execution_order:
        if failed_at is not None:
            # Stop processing — downstream tasks will be rolled back
            continue

        sub_task = plan.sub_tasks[task_id]

        # Build inputs from upstream results
        upstream_inputs = {
            dep: results.get(dep) for dep in sub_task.depends_on if dep in results
        }

        try:
            steps = engine.execute(
                sub_task=sub_task,
                agent_context={"inputs": {"prior_results": upstream_inputs}},
                tool_executor=tool_executor,
                reasoner=reasoner,
            )

            # Validate output
            is_valid, messages = validate_output(sub_task, steps[-1].observation or "", results)

            if not is_valid:
                failed_at = task_id
                rollback_performed = True
                rolled_back = rollback_plan(plan, task_id, {"results": results})
                logger.warning(f"Task '{task_id}' validation failed. Rolled back: {rolled_back}")
                continue

            results[task_id] = steps[-1].observation or ""

        except MaxIterationsError as e:
            failed_at = task_id
            rollback_performed = True
            rolled_back = rollback_plan(plan, task_id, {"results": results})
            logger.error(f"Task '{task_id}' hit max iterations. Rolled back: {rolled_back}")

    return {
        "results": results,
        "failed_at": failed_at,
        "rollback_performed": rollback_performed,
        "plan": plan,
    }


# --- BAD vs GOOD Example Pair ---

def _bad_react_without_max_iterations(query: str) -> str:
    """❌ BAD — No iteration limit in ReAct loop. Can run forever."""

    steps = []
    while True:  # Infinite loop! No max iterations, no exit condition.
        thought = reasoner(query, steps)
        action, args = parse_action(thought)
        observation = tool.call(action, args)
        steps.append({"thought": thought, "action": action, "observation": observation})

        if is_done(observation):  # What if the tool never produces a definitive answer?
            return observation

    # This function has no escape hatch — if `is_done()` never returns True,
    # it loops forever consuming tokens and API calls.


def _good_react_with_max_iterations(query: str, max_iters: int = 10) -> FinalAnswer:
    """✅ GOOD — ReAct loop with iteration limit, validation, and self-reflection."""

    engine = ReActEngine(max_iterations=max_iters)
    steps = engine.execute(
        sub_task=SubTask(
            id="answer",
            description=f"Answer the query: {query}",
            input_schema={"query": str},
            output_schema={"answer": str},
            success_criteria=["non-empty result"],
        ),
        agent_context={},
        tool_executor=safe_tool_call,
        reasoner=reasoner,
    )

    # Self-reflect before returning
    reflection = SelfReflectionEvaluator().evaluate(
        plan=PlanGraph.build([steps[0].__dict__]),  # Simplified for example
        execution_trace=[steps],
        context={},
    )

    if not reflection.passes:
        return FinalAnswer(
            content="I was unable to produce a high-quality answer. Please rephrase your query.",
            execution_provenance={"quality": reflection.overall_quality},
            quality_assessment=reflection,
            warnings=["Self-reflection flagged low quality"],
        )

    return compile_final_answer(
        plan=PlanGraph.build([]),  # Simplified
        execution_trace=[steps],
        reflection=reflection,
        context={},
    )
```

---

## Constraints

### MUST DO

1. Always decompose complex tasks into explicit sub-tasks with declared inputs, outputs, and success criteria before executing anything
2. Limit every ReAct loop to a configurable max_iterations (default 10) — never allow unbounded reasoning loops
3. Validate each sub-task's output against its success criteria before advancing to the next step
4. Run self-reflection on every completed execution — always score accuracy, completeness, and safety
5. Implement rollback logic so that any failed sub-task triggers cleanup of all dependent results
6. Maintain an execution trace (full ReAct history) for every sub-task — this enables debugging and auditability
7. Use chain-of-thought reasoning explicitly: the agent's thought at each step must be recorded, not implicit

### MUST NOT DO

1. Never execute a sub-task without first verifying that all its dependencies have succeeded
2. Never skip self-reflection — even "simple" tasks should get a quick quality check before returning output
3. Never allow an ReAct loop to run indefinitely — max_iterations is a hard limit, not a soft suggestion
4. Never propagate broken or unvalidated intermediate state to downstream sub-tasks
5. Never use the agent's own reasoning as ground truth for validation — always verify against objective criteria
6. Never collapse multiple sub-tasks into a single monolithic tool call when decomposition adds clarity and safety
7. Never return a final answer without recording execution provenance (task count, iterations used, quality score)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Provides the tool integration layer that ReAct loops invoke; pair this with ReAct for complete agent execution |
| `memory-systems` | Supplies short-term and long-term memory mechanisms that the reasoning engine reads from and writes to during execution |
| `multi-agent-orchestration` | Extends single-agent planning to coordinated multi-agent plans where each agent runs its own ReAct loop with shared goals |

---

*This skill implements deterministic, verifiable reasoning patterns for AI agents. Every execution should be traceable through its full thought-action-observation history.*
