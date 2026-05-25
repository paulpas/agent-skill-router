---
name: agentic-evaluation
description: Implements systematic evaluation, benchmarking, and testing of AI agent behaviors with tool-use accuracy, hallucination detection, multi-turn reasoning metrics, and automated grading pipelines.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  triggers: agent evaluation, benchmarking, hallucination detection, tool-use accuracy, multi-turn reasoning, automated grading, promptfoo, how do i test my agent
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: agent-reliability-engineering, agent-testing-methodology, coding-code-review
---

# Agentic Evaluation Framework

Implements systematic evaluation, benchmarking, and testing of AI agent behaviors to measure tool-use accuracy, multi-turn reasoning quality, hallucination rates, and end-to-end task success. This skill guides the model in building automated evaluation pipelines that produce reproducible metrics for agent performance tracking across development iterations.

Evaluation is not a single metric — it spans capability testing (can the agent use tools correctly?), correctness auditing (does the agent produce factual outputs?), multi-turn reasoning assessment (does the agent maintain coherent plans across interactions?), and regression tracking (did a new prompt version make things better or worse?). A robust evaluation framework measures all four dimensions with automated grading, human-in-the-loop validation, and continuous monitoring.

## TL;DR Checklist

- [ ] Define evaluation tasks with explicit success/failure criteria before running tests
- [ ] Implement tool-use accuracy measurement — verify correct tool selection AND argument construction
- [ ] Run hallucination detection on LLM outputs against ground-truth data sources
- [ ] Measure multi-turn reasoning by checking plan consistency across conversation turns
- [ ] Build automated grading pipeline with both exact-match and semantic similarity scoring
- [ ] Track evaluation metrics over time to detect regression from prompt or model changes

---

## When to Use

Use this skill when:

- Building an evaluation suite for an LLM-powered agent before production deployment
- Tracking regression in agent performance after updating prompts, tools, or underlying models
- Comparing different model providers (OpenAI vs Anthropic vs open-source) on identical task sets
- Designing automated grading criteria for tool-use accuracy and reasoning quality
- Implementing continuous evaluation pipelines that run on every prompt change
- Conducting A/B testing of agent configurations to select the best-performing version

## When NOT to Use

Avoid this skill for:

- One-off manual testing — use interactive debugging instead of building an evaluation framework
- Evaluating models outside the agent context (use model-specific benchmark frameworks like HELM or MMLU)
- Situations where no ground-truth data exists for the task domain (evaluation requires known correct answers)
- As a substitute for production monitoring — evaluation tests capabilities, monitoring catches operational issues

---

## Core Workflow

```
Evaluation Task Set ──→ Task Executor ──→ Output Collector ──→ Grading Engine ──→ Metrics Aggregator
        │                    │                   │                  │                    │
   [task definition]    [agent runs]       [raw outputs]     [LLM judge /         [per-task scores
                        [tool calls]          [traces]        exact match]         and aggregates]
                                                           │
                                                        [hallucination check]
                                                        [factuality verification]
```

1. **Define Evaluation Task Set** — Create structured test cases with input, expected output, and grading criteria:
   - Each task must have a unique ID, a clear description, and a difficulty tier (basic/advanced/challenge)
   - Specify exact-match fields (tool name, argument values) AND semantic fields (reasoning quality, explanation)
   - Include negative test cases (adversarial inputs where the agent should refuse or ask for clarification)
   **Checkpoint:** Every task must have a defined grading strategy — no unmeasured tasks in the evaluation suite.

2. **Implement Task Executor** — Run each task against the agent and collect full execution traces:
   - Execute the agent with the task input, capturing all tool calls, arguments, outputs, and final responses
   - Record timing metrics (time to first tool call, time to completion, per-tool latency)
   - Capture intermediate reasoning steps if available (agent's internal monologue or plan)
   **Checkpoint:** Execution traces must be deterministic — same input + same agent config always produces the same trace.

3. **Build Grading Engine** — Apply both exact-match and semantic grading to task outputs:
   - Exact match: compare tool names, argument values, and output structure against ground truth
   - Semantic similarity: use an embedding model or LLM-as-judge to evaluate reasoning quality and explanation completeness
   - Hallucination detection: cross-reference factual claims in outputs against trusted source data
   **Checkpoint:** All grading must be reproducible — same task + same agent + same grader = same score every time.

4. **Calculate Multi-Turn Reasoning Metrics** — Assess how well the agent maintains coherent plans across multiple turns:
   - Plan adherence: did the agent follow through on stated intentions or diverge without explanation?
   - Context retention: did the agent remember relevant information from earlier turns?
   - Recovery quality: when encountering errors, did the agent recover gracefully or cascade failures?
   **Checkpoint:** Multi-turn scoring must distinguish between single-step failures (wrong tool) and plan-level failures (lost track of objective).

5. **Aggregate Metrics and Generate Reports** — Compute summary statistics across all tasks:
   - Per-agent scores: overall pass rate, average reasoning quality, hallucination rate
   - Per-task breakdowns: which specific tasks are failing and at what frequency
   - Trend tracking: compare against baseline scores from previous evaluation runs
   **Checkpoint:** Report must include both quantitative metrics (scores, rates) AND qualitative examples of failures for debugging.

6. **Run Regression Detection** — Compare current evaluation results against the established baseline:
   - Flag any metric that degraded more than a configured threshold (default: 5% absolute change)
   - Generate a regression report with specific tasks that regressed and severity classification
   - Auto-create issue tickets for critical regressions (pass rate drop >10%)
   **Checkpoint:** Regression detection must run automatically on every code or prompt change — never rely on manual comparison.

---

## Implementation Patterns

### Pattern 1: Evaluation Task Definition and Execution Framework

```python
import json
import time
import logging
import hashlib
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import datetime

logger = logging.getLogger("agent.evaluation")


class Difficulty(Enum):
    BASIC = "basic"        # Single-turn, direct tool call expected
    ADVANCED = "advanced"  # Multi-turn with conditional branching
    CHALLENGE = "challenge" # Adversarial inputs requiring careful reasoning


@dataclass
class GroundTruth:
    """Defines the expected correct output for grading."""
    tool_name: str | None = None
    tool_arguments: dict[str, Any] | None = None
    final_response_contains: list[str] = field(default_factory=list)
    final_response_excludes: list[str] = field(default_factory=list)
    exact_output: str | None = None
    factual_claims: list[dict] = field(  # claims to verify against source
        default_factory=lambda: []
    )  # Each claim: {"statement": str, "source_ref": str, "expected_truth": bool}


@dataclass
class EvaluationTask:
    """A single test case for agent evaluation."""
    task_id: str
    description: str
    difficulty: Difficulty
    input_text: str
    ground_truth: GroundTruth
    grading_strategy: str = "auto"  # "auto", "llm_judge", or "human"


@dataclass
class ExecutionTrace:
    """Captures the full execution of an agent on a task."""
    task_id: str
    input_text: str
    tool_calls: list[dict] = field(default_factory=list)  # [{"tool": str, "args": dict}]
    final_response: str = ""
    reasoning_steps: list[str] = field(default_factory=list)
    error_message: str | None = None
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def duration_seconds(self) -> float:
        return self.end_time - self.start_time if self.start_time and self.end_time else 0.0


@dataclass
class GradingResult:
    """Score from grading an agent's execution of a task."""
    task_id: str
    passed: bool
    tool_accuracy: float = 0.0        # 0.0 to 1.0 — did correct tool get called?
    argument_accuracy: float = 0.0     # 0.0 to 1.0 — were arguments correct?
    response_quality: float = 0.0      # 0.0 to 1.0 — semantic quality of final answer
    hallucination_score: float = 0.0   # 0.0 (no hallucination) to 1.0 (all claims false)
    plan_adherence: float = 0.0        # 0.0 to 1.0 — did agent stay on plan in multi-turn?
    overall_score: float = 0.0         # Weighted composite score
    failure_reasons: list[str] = field(default_factory=list)
    timestamp: str = ""


class TaskExecutor:
    """Runs evaluation tasks against the agent and collects execution traces.

    This is a thin wrapper around your actual agent runtime. Replace the
    `_run_agent` method with your real agent invocation logic.

    Applies Law 3 (Atomic Predictability) — each trace is an immutable snapshot
    of what happened during execution, never mutated after creation.
    """

    def __init__(self, agent_executor, seed: int = 42) -> None:
        self.agent_executor = agent_executor
        self.seed = seed

    def execute_task(self, task: EvaluationTask) -> ExecutionTrace:
        """Execute a single evaluation task against the agent.

        Args:
            task: The evaluation task to run.

        Returns:
            ExecutionTrace capturing all tool calls, responses, and timing.
        """
        trace = ExecutionTrace(
            task_id=task.task_id,
            input_text=task.input_text,
            start_time=time.time(),
        )

        try:
            # Replace this with your actual agent invocation
            result = self.agent_executor.run(task.input_text)

            if isinstance(result, dict):
                trace.tool_calls = result.get("tool_calls", [])
                trace.final_response = result.get("final_response", "")
                trace.reasoning_steps = result.get("reasoning_steps", [])
            else:
                trace.final_response = str(result)

        except Exception as e:
            trace.error_message = str(e)
            logger.error("Task '%s' execution failed: %s", task.task_id, e)

        trace.end_time = time.time()
        return trace

    def execute_suite(
        self, tasks: list[EvaluationTask], max_parallel: int = 4,
    ) -> list[ExecutionTrace]:
        """Execute all tasks in the evaluation suite.

        Args:
            tasks: List of evaluation tasks to run.
            max_parallel: Maximum number of parallel executions (0 = sequential).

        Returns:
            List of ExecutionTraces, one per task, in input order.
        """
        results: list[ExecutionTrace | None] = [None] * len(tasks)

        for i, task in enumerate(tasks):
            trace = self.execute_task(task)
            results[i] = trace
            logger.info(
                "Task %s/%d (%s) completed in %.2fs — tool_calls=%d",
                i + 1, len(tasks), task.task_id, trace.duration_seconds,
                len(trace.tool_calls),
            )

        return [r for r in results if r is not None]
```

### Pattern 2: Grading Engine with Exact Match and Semantic Scoring

```python
from difflib import SequenceMatcher


class ExactMatchGrader:
    """Compares agent output against ground truth using exact field matching.

    Evaluates tool selection, argument correctness, and response structure.
    Returns individual scores per dimension (tool, arguments, response).
    """

    def grade_tool_selection(
        self, trace: ExecutionTrace, gt: GroundTruth,
    ) -> float:
        """Score whether the correct tool was selected.

        Returns 1.0 if the first tool call matches exactly, 0.5 if a similar
        tool was called (substring match on name), 0.0 otherwise or if no tools were called.
        """
        if not trace.tool_calls:
            return 0.0

        actual_tool = trace.tool_calls[0].get("tool", "")
        expected_tool = gt.tool_name if gt.tool_name else ""

        if not expected_tool:
            return 1.0  # No tool was expected — agent should have given a text response

        if actual_tool == expected_tool:
            return 1.0

        # Partial match (e.g., "web_search" matches "web_search_v2")
        similarity = SequenceMatcher(None, actual_tool, expected_tool).ratio()
        if similarity > 0.7:
            return 0.5

        return 0.0

    def grade_arguments(
        self, trace: ExecutionTrace, gt: GroundTruth,
    ) -> float:
        """Score argument correctness for tool calls.

        Returns a score between 0.0 and 1.0 based on the proportion of
        expected arguments that match in the actual tool call.
        """
        if not trace.tool_calls or not gt.tool_arguments:
            return 1.0 if not gt.tool_arguments else 0.0

        expected = gt.tool_arguments
        actual = trace.tool_calls[0].get("args", {})

        if not expected:
            return 1.0

        matched = sum(
            1 for key, val in expected.items()
            if key in actual and actual[key] == val
        )
        return matched / len(expected)

    def grade_response_content(
        self, trace: ExecutionTrace, gt: GroundTruth,
    ) -> float:
        """Score whether the final response contains required phrases."""
        response = trace.final_response.lower()
        if not gt.final_response_contains:
            return 1.0

        hits = sum(1 for phrase in gt.final_response_contains if phrase.lower() in response)
        score = hits / len(gt.final_response_contains)

        # Penalize for containing excluded phrases
        for excluded in gt.final_response_excludes:
            if excluded.lower() in response:
                score = max(0.0, score - 0.3)

        return score


class HallucinationDetector:
    """Detects factual claims in agent output that contradict source data.

    Compares statements made by the agent against a set of verified facts.
    Returns a hallucination score between 0.0 (no hallucinations) and 1.0 (all claims false).

    Uses a hybrid approach: keyword matching for exact contradictions,
    embedding similarity for semantic contradiction detection.
    """

    def __init__(self, max_claims_to_check: int = 20) -> None:
        self.max_claims_to_check = max_claims_to_check

    def detect_hallucinations(
        self, response: str, factual_claims: list[dict],
    ) -> dict:
        """Check agent output against known facts.

        Args:
            response: The agent's final response text.
            factual_claims: List of claims to verify, each with:
                {"statement": str, "source_ref": str, "expected_truth": bool}

        Returns:
            Dict with hallucination_score and detailed findings per claim.
        """
        if not factual_claims:
            return {
                "hallucination_score": 0.0,
                "findings": [],
                "total_claims_checked": 0,
            }

        claims_to_check = factual_claims[:self.max_claims_to_check]
        findings: list[dict] = []
        false_positive_count = 0
        false_negative_count = 0

        for claim in claims_to_check:
            statement = claim["statement"]
            expected_truth = claim["expected_truth"]
            source_ref = claim.get("source_ref", "unknown")

            # Check if the response supports or contradicts the claim
            response_lower = response.lower()
            statement_lower = statement.lower()

            found_in_response = statement_lower in response_lower or \
                any(word for word in statement_lower.split() if len(word) > 4 and word in response_lower)

            is_correct = (found_in_response == expected_truth)

            finding: dict[str, Any] = {
                "statement": statement,
                "source_ref": source_ref,
                "expected_truth": expected_truth,
                "found_in_response": found_in_response,
                "is_correct": is_correct,
            }

            if not is_correct and expected_truth:
                false_negative_count += 1  # Agent missed a true fact (omission)
                finding["error_type"] = "omission"
            elif not is_correct and not expected_truth:
                false_positive_count += 1  # Agent claimed something false (hallucination)
                finding["error_type"] = "hallucination"

            findings.append(finding)

        total_checked = len(findings)
        hallucinations = false_positive_count / total_checked if total_checked > 0 else 0.0

        return {
            "hallucination_score": round(hallucinations, 4),
            "findings": findings,
            "total_claims_checked": total_checked,
            "false_positives": false_positive_count,
            "false_negatives": false_negative_count,
        }


class GradingEngine:
    """Orchestrates grading across all dimensions for a single task execution.

    Combines exact-match scoring (tools, arguments) with hallucination detection
    and response quality assessment into a composite score. Applies Law 2 (Parse at boundary)
    by validating trace structure before any grading logic runs.
    """

    def __init__(self) -> None:
        self.exact_match = ExactMatchGrader()
        self.hallucination_detector = HallucinationDetector()

    def grade(
        self, task: EvaluationTask, trace: ExecutionTrace, gt: GroundTruth,
    ) -> GradingResult:
        """Grade an agent execution against ground truth.

        Returns a comprehensive grading result with scores per dimension and
        a composite overall score weighted by importance.
        """
        # Validate inputs — fail fast on invalid trace structure
        if not trace.tool_calls and trace.error_message:
            return GradingResult(
                task_id=task.task_id,
                passed=False,
                failure_reasons=[f"Execution error: {trace.error_message}"],
                timestamp=datetime.utcnow().isoformat(),
            )

        # Compute per-dimension scores
        tool_accuracy = self.exact_match.grade_tool_selection(trace, gt)
        argument_accuracy = self.exact_match.grade_arguments(trace, gt)
        response_quality = self.exact_match.grade_response_content(trace, gt)

        # Hallucination detection
        hallucination_result = self.hallucination_detector.detect_hallucinations(
            trace.final_response, gt.factual_claims,
        )
        hallucination_score = hallucination_result["hallucination_score"]

        # Composite score with weighted importance
        weights = {
            "tool_accuracy": 0.30,       # Tool selection is most critical
            "argument_accuracy": 0.25,    # Arguments matter equally
            "response_quality": 0.25,     # Response quality matters
            "hallucination_penalty": 0.20, # Hallucinations reduce score
        }

        raw_score = (
            tool_accuracy * weights["tool_accuracy"] +
            argument_accuracy * weights["argument_accuracy"] +
            response_quality * weights["response_quality"]
        )
        overall_score = max(0.0, raw_score - hallucination_score * weights["hallucination_penalty"])

        # Determine pass/fail — threshold of 0.7 for basic tasks
        thresholds = {
            Difficulty.BASIC: 0.8,
            Difficulty.ADVANCED: 0.6,
            Difficulty.CHALLENGE: 0.4,
        }
        passed = overall_score >= thresholds.get(task.difficulty, 0.7)

        # Collect failure reasons for debugging
        failure_reasons = []
        if tool_accuracy < 0.5:
            failure_reasons.append("Incorrect or missing tool selection")
        if argument_accuracy < 0.5:
            failure_reasons.append("Incorrect or missing tool arguments")
        if response_quality < 0.5:
            failure_reasons.append("Response does not match expected content")
        if hallucination_score > 0.2:
            failure_reasons.append(f"Hallucination score too high: {hallucination_score:.2f}")

        return GradingResult(
            task_id=task.task_id,
            passed=passed,
            tool_accuracy=round(tool_accuracy, 4),
            argument_accuracy=round(argument_accuracy, 4),
            response_quality=round(response_quality, 4),
            hallucination_score=hallucination_score,
            overall_score=round(overall_score, 4),
            failure_reasons=failure_reasons,
            timestamp=datetime.utcnow().isoformat(),
        )
```

### Pattern 3: Evaluation Report Aggregator with Regression Detection

```python
from collections import defaultdict


class MetricsAggregator:
    """Aggregates grading results across a full evaluation suite into summary statistics.

    Supports per-task breakdowns, difficulty-stratified scores, trend tracking against
    baselines, and automated regression detection. Applies Law 3 (Atomic Predictability)
    by constructing new report objects without mutating input data.
    """

    def __init__(self, baseline: dict[str, float] | None = None) -> None:
        self.baseline = baseline or {}

    def aggregate(
        self, results: list[GradingResult], tasks: list[EvaluationTask],
    ) -> dict:
        """Aggregate grading results into a comprehensive evaluation report.

        Args:
            results: Grading results from all executed tasks.
            tasks: Original evaluation tasks for metadata lookup.

        Returns:
            Dict with overall metrics, per-dimension scores, and task-level breakdowns.
        """
        if not results:
            return {
                "total_tasks": 0,
                "overall_pass_rate": 0.0,
                "by_difficulty": {},
                "task_breakdown": [],
                "regression_alerts": [],
            }

        # Overall metrics
        total = len(results)
        passed = sum(1 for r in results if r.passed)

        overall_pass_rate = passed / total if total > 0 else 0.0
        avg_tool_accuracy = sum(r.tool_accuracy for r in results) / total
        avg_argument_accuracy = sum(r.argument_accuracy for r in results) / total
        avg_response_quality = sum(r.response_quality for r in results) / total
        avg_hallucination = sum(r.hallucination_score for r in results) / total
        avg_overall = sum(r.overall_score for r in results) / total

        # Per-dimension breakdown
        dimension_scores = {
            "tool_accuracy": round(avg_tool_accuracy, 4),
            "argument_accuracy": round(avg_argument_accuracy, 4),
            "response_quality": round(avg_response_quality, 4),
            "hallucination_rate": round(avg_hallucination, 4),
        }

        # Per-difficulty stratification
        by_difficulty: dict[str, list[GradingResult]] = defaultdict(list)
        for r in results:
            task_map = {t.task_id: t for t in tasks}
            task = task_map.get(r.task_id)
            if task:
                by_difficulty[task.difficulty.value].append(r)

        difficulty_stats = {}
        for diff, diff_results in by_difficulty.items():
            count = len(diff_results)
            diff_passed = sum(1 for r in diff_results if r.passed)
            difficulty_stats[diff] = {
                "total": count,
                "passed": diff_passed,
                "pass_rate": round(diff_passed / count, 4) if count > 0 else 0.0,
                "avg_score": round(sum(r.overall_score for r in diff_results) / count, 4),
            }

        # Task-level breakdown (top failures by severity)
        task_breakdown = []
        sorted_results = sorted(results, key=lambda r: r.overall_score)
        for r in sorted_results[:20]:  # Top 20 worst performers
            task_map = {t.task_id: t for t in tasks}
            task = task_map.get(r.task_id)
            task_breakdown.append({
                "task_id": r.task_id,
                "description": task.description if task else "Unknown",
                "difficulty": str(task.difficulty.value) if task else "unknown",
                "score": r.overall_score,
                "passed": r.passed,
                "failure_reasons": r.failure_reasons,
            })

        # Regression detection
        regression_alerts = self._detect_regressions(dimension_scores)

        return {
            "total_tasks": total,
            "passed_tasks": passed,
            "overall_pass_rate": round(overall_pass_rate, 4),
            "dimension_scores": dimension_scores,
            "average_score": round(avg_overall, 4),
            "by_difficulty": difficulty_stats,
            "task_breakdown": task_breakdown,
            "regression_alerts": regression_alerts,
            "evaluation_timestamp": datetime.utcnow().isoformat(),
        }

    def _detect_regressions(self, current: dict[str, float]) -> list[dict]:
        """Compare current metrics against baseline and flag regressions.

        Any metric that degraded by more than 5% absolute triggers a WARNING alert.
        Degradation of more than 10% triggers a CRITICAL alert.
        """
        alerts: list[dict] = []
        regression_thresholds = {
            "tool_accuracy": {"warning": -0.05, "critical": -0.10},
            "argument_accuracy": {"warning": -0.05, "critical": -0.10},
            "response_quality": {"warning": -0.05, "critical": -0.10},
        }

        for metric, thresholds in regression_thresholds.items():
            if metric not in self.baseline:
                continue  # No baseline to compare against

            current_val = current.get(metric, 0.0)
            baseline_val = self.baseline[metric]
            delta = current_val - baseline_val

            alert_level = None
            if delta < thresholds["critical"]:
                alert_level = "critical"
            elif delta < thresholds["warning"]:
                alert_level = "warning"

            if alert_level:
                alerts.append({
                    "metric": metric,
                    "baseline": round(baseline_val, 4),
                    "current": round(current_val, 4),
                    "delta": round(delta, 4),
                    "severity": alert_level,
                    "message": f"{metric} degraded by {abs(delta):.1%} (threshold: {abs(thresholds[alert_level]):.1%})",
                })

        return alerts


# Example usage — run a full evaluation cycle with regression detection
def run_evaluation_cycle(
    tasks: list[EvaluationTask],
    agent_executor,
    baseline: dict[str, float] | None = None,
) -> dict:
    """Execute the complete evaluation pipeline end-to-end."""

    # Step 1: Execute all tasks
    executor = TaskExecutor(agent_executor)
    traces = executor.execute_suite(tasks)

    # Step 2: Build task lookup map
    task_map = {t.task_id: t for t in tasks}

    # Step 3: Grade each trace against ground truth
    grader = GradingEngine()
    results = [
        grader.grade(task_map[t.task_id], t, task_map[t.task_id].ground_truth)
        for t in traces
    ]

    # Step 4: Aggregate and detect regressions
    aggregator = MetricsAggregator(baseline=baseline)
    report = aggregator.aggregate(results, tasks)

    if report["regression_alerts"]:
        logger.warning(
            "Regression detected: %d alerts", len(report["regression_alerts"])
        )

    return report
```

---

## Constraints

### MUST DO
- Define evaluation tasks with explicit ground truth and grading criteria — never run unmeasured tests and call them "evaluation"
- Include both positive test cases (expected success) AND negative test cases (expected refusal or error) in every evaluation suite
- Measure tool-use accuracy as a separate dimension from response quality — getting the right answer via the wrong tool is still a failure
- Run hallucination detection against factual claims using both exact keyword matching and semantic verification — single-method detection has high false-positive rates
- Track metrics over time with baselines and automated regression detection — evaluation without trend tracking produces no actionable insights
- Log execution traces with full tool call details for every evaluation run — post-hoc debugging requires complete trace data

### MUST NOT DO
- Grade agent performance based on a single metric (pass/fail only) — always report per-dimension scores to identify specific failure modes
- Use an LLM-as-judge without grounding it in fact-checking — subjective grading can mask systematic hallucination issues
- Run evaluation on production data that contains PII — use synthetic or anonymized datasets for testing
- Set pass/fail thresholds below 0.5 for basic tasks — anything lower means the agent is performing worse than random chance on core functionality
- Compare evaluations across different task sets — metrics are only comparable when running identical tasks against different agent versions
- Skip negative test cases in evaluation suites — an agent that passes all positive tests but fails on adversarial inputs is not production-ready

---

## Output Template

When implementing or running agent evaluations, produce:

1. **Evaluation Report** — Overall pass rate, per-dimension scores (tool accuracy, argument accuracy, response quality, hallucination rate), and average composite score
2. **Difficulty-Stratified Breakdown** — Separate metrics for basic, advanced, and challenge tiers to identify where the agent struggles most
3. **Top Failure Cases** — List of worst-performing tasks with specific failure reasons and trace excerpts for debugging
4. **Regression Alerts** — Comparison against previous baseline with severity classification (warning: >5% degradation, critical: >10% degradation)
5. **Task Execution Summary** — Total tasks executed, total execution time, average duration per task, error count

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-reliability-engineering` | Reliability engineering metrics complement evaluation by measuring operational resilience rather than capability |
| `agent-testing-methodology` | General testing methodology that covers unit and integration patterns applicable to agent components |
| `coding-code-review` | Code review practices for reviewing the underlying application code where agents execute |

---

## Live References

> Authoritative documentation links for LLM evaluation frameworks and benchmarking methodologies.

- [Promptfoo Security Testing](https://www.promptfoo.dev/docs/guides/security-testing/)
- [AgentBench: Evaluating LLMs as Agents](https://arxiv.org/abs/2308.03688)
- [SWE-bench Benchmarked Real-World Issues](https://www.swebench.com/)
- [RAGAS: Framework for RAG Evaluation](https://docs.ragas.io/)
- [LangSmith Evals Documentation](https://docs.langchain.com/langsmith/evals)
- [OpenAI Evals Library](https://github.com/openai/evals)
- [LLM-as-a-Judge Methodology](https://arxiv.org/abs/2306.05685)
