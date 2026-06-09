---
name: goal-setting-monitoring
description: Implements goal-oriented agent architectures with objective definition, LLM-based success criteria evaluation, iterative progress tracking, and max-iteration bounded refinement loops for proactive autonomous systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: goal setting, objective tracking, success criteria, progress monitoring, how do i set agent goals, autonomous objectives, goal evaluation, iterative refinement
  related-skills: planning-patterns,multi-agent-orchestration,closed-loop-delivery
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

# Goal Setting and Monitoring Pattern

Implements goal-oriented agent architectures that transform reactive agents into proactive systems. This skill makes the model define specific, measurable objectives; establish LLM-based success criteria evaluation; run iterative refinement loops with bounded max iterations; and continuously monitor progress against goals — enabling autonomous agents to self-assess performance, correct course, and reliably achieve high-level outcomes without constant human intervention.

## TL;DR Checklist

- [ ] Define each goal using SMART criteria: specific, measurable, achievable, relevant, time-bound
- [ ] Establish success criteria that are objective and evaluable (not subjective opinions)
- [ ] Implement a monitoring loop that evaluates progress after every action or iteration
- [ ] Enforce max-iteration limits on all refinement loops to prevent infinite execution
- [ ] Use LLM-based evaluation with clear True/False verdicts against defined success criteria
- [ ] Separate code generation from code review when using self-evaluation (multi-agent pattern)
- [ ] Track progress state and surface remaining gaps when budgets are exhausted
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) for boundary parsing, early exit, and fail-fast semantics

---

## When to Use

Use this skill when:

- An agent must operate autonomously toward a high-level objective without step-by-step human guidance (e.g., "build a trading bot that maximizes gains within risk limits")
- You need an agent to self-evaluate its output against quality benchmarks and iterate until goals are met (e.g., code generation, report writing, content creation)
- A multi-step task requires continuous progress monitoring and adaptive course correction based on intermediate results (e.g., customer support resolution, personalized learning adaptation)
- You are building autonomous systems that must detect when they are failing mid-task and either revise strategy or escalate (e.g., robotics navigation, project management assistants)
- An agent generates artifacts (code, documents, configurations) and needs a structured refinement loop with quality gates before final delivery
- You need to transform a reactive tool-calling agent into a proactive goal-seeking system that plans its own sub-objectives

---

## When NOT to Use

Avoid this skill for:

- Single-step operations with an immediately verifiable outcome — direct execution without monitoring overhead (e.g., "calculate 2 + 2", "format this JSON")
- Tasks where success criteria cannot be objectively defined or measured — you cannot evaluate progress against vague goals; clarify objectives first (use `query-feature-extraction` skill)
- Real-time latency-sensitive operations where the evaluation loop adds unacceptable overhead (sub-second API calls, live streaming inference)
- Highly regulated domains where autonomous self-evaluation is legally insufficient — human-in-the-loop review is mandatory and the agent should defer to that pattern instead
- Situations where the LLM cannot reasonably assess quality of its own output without external tools or data sources (e.g., "write code for this proprietary API") — provide ground-truth test harnesses before enabling self-evaluation

---

## Core Workflow

### Phase 1: Objective Definition

1. **Parse Intent and Define Goal Boundaries** — Extract the explicit objective from the request, then formalize it using SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound). If the user provides a vague goal, decompose it into concrete sub-goals with measurable success criteria. Identify the initial state (what exists at start), goal state (definition of done), and all constraints (budget, time, tool availability, domain rules). Reference `code-philosophy` early exit: if only one step is needed, skip monitoring entirely.
   **Checkpoint:** Can you articulate 3–7 measurable success criteria for the goal? If not, refine the goal before proceeding.

2. **Formulate Success Criteria** — Convert each sub-goal into an objective, evaluable criterion that can be verified programmatically or via LLM judgment. Prefer binary (True/False) verdicts over subjective scoring where possible. For code generation goals, include criteria like "handles edge cases", "functionally correct", "simple to understand", and "well-documented". For non-code goals, define equivalent measurable proxies (accuracy thresholds, latency limits, completeness checklists).
   **Checkpoint:** Does every success criterion have a clear pass/fail determination method? Are there no overlapping or contradictory criteria?

### Phase 2: Iterative Execution Loop

3. **Execute Generation or Action** — Produce the first draft of the artifact or execute the initial set of actions toward the goal. This is the agent's primary production pass. Capture the full output for evaluation. If using a multi-agent pattern, have a dedicated generator agent (e.g., "Peer Programmer") produce the artifact while keeping generation and evaluation concerns separate.
   **Checkpoint:** Is the full output of this iteration captured and preserved for evaluation? Can it be reconstructed later if needed?

4. **Evaluate Against Success Criteria** — Pass the generated output to an evaluator (LLM-based judge or automated test harness) along with the success criteria. Request a structured verdict: True if all criteria are met, False with specific feedback on which criteria failed and why. When using self-evaluation by the same LLM that generated the code, recognize the inherent bias risk — prefer a separate reviewer agent for critical evaluation (the multi-agent "crew" pattern from the source material).
   **Checkpoint:** Do you have a clear verdict (True/False) with specific feedback on each criterion? Is the evaluation independent enough to be trustworthy?

### Phase 3: Refinement and Termination

5. **Refine Based on Feedback** — If the verdict is False, use the evaluator's feedback to identify what went wrong and produce a revised artifact. Feed both the previous iteration's output and the feedback into the next generation pass. This creates an iterative refinement loop where each cycle should close some gaps identified in the prior evaluation. Apply `code-philosophy` Parse Don't Validate at the boundary: parse evaluator feedback, trust validated critique internally.
   **Checkpoint:** Did the revision address every specific failure noted by the evaluator? If not, what remains and why?

6. **Check Iteration Budget and Terminate** — Before each refinement cycle, verify the current iteration count against the max-iteration budget (default: 5 iterations for code generation, configurable per domain). If all goals are met, stop and deliver the artifact. If the budget is exhausted with remaining failures, report what was achieved, list unresolved criteria explicitly, and either escalate to human review or apply a best-effort final pass. Never allow unbounded refinement loops.
   **Checkpoint:** Is the iteration count within the configured max? Are all remaining gaps clearly documented for downstream consumers?

---

┌───────────────────────────────────────────────────────────────────────────────┐
│                          Goal Setting & Monitoring Flow                         │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request: "Build a goal-oriented agent"
          ↓
  ┌─────────────────────┐
  │  Define SMART Goals  │
  │  (Specific, Measurable│
  │   Achievable, Relevant│
  │   Time-bound)         │
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐     ┌─────────────────────────┐
  │  Generate Artifact   │────▶│  Evaluate Against       │
  │  (Code/Doc/Config)   │     │  Success Criteria       │
  └──────────┬──────────┘     └──────────┬──────────────┘
             │                           │
             │                   Verdict? ──► True — STOP
             │                           │
             │                    False + Feedback
             │                           │
             │              ┌────────────▼────────────┐
             │              │  Iteration Budget       │
             │              │  Exhausted?             │
             │              │  Yes → Report gaps &    │
             │              │  escalate               │
             │              │  No  → Refine & loop     │
             │              └────────────┬────────────┘
             │                           │
             └───────────────────────────┘

---

## Implementation Patterns / Reference Guide

### Pattern 1: Single-Agent Goal-Driven Iterative Generation

Use this pattern when a single agent handles both generation and self-evaluation. This is the simplest form of goal monitoring — the agent produces output, evaluates it against criteria, and iterates. Suitable for lower-stakes tasks where self-bias in evaluation is acceptable. Mirrors the hands-on example from Chapter 11.

```python
"""
Single-agent iterative goal-setting and monitoring loop.
Mirrors the autonomous AI code generation agent from Chapter 11.
The agent generates, self-evaluates against goals, and iterates
until all criteria are met or max iterations are exhausted.
"""

import os
import re
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class GoalState:
    """Tracks the state of goal-driven iteration."""
    use_case: str
    goals: list[str]
    max_iterations: int = 5
    current_iteration: int = 0
    best_artifact: str = ""
    remaining_gaps: list[str] = field(default_factory=list)


def generate_prompt(use_case: str, goals: list[str], previous_code: str = "", feedback: str = "") -> str:
    """Construct a generation prompt with use case, goals, and optional revision context.

    Args:
        use_case: The coding problem or task description.
        goals: List of quality criteria the output must satisfy.
        previous_code: Previous iteration's output for refinement context.
        feedback: Evaluator feedback identifying failures.

    Returns:
        A prompt string directing the LLM to generate or revise code.
    """
    if not use_case or not use_case.strip():
        raise ValueError("use_case cannot be empty")
    if not goals:
        raise ValueError("At least one goal must be defined")

    base_prompt = f"You are an AI coding agent. Write Python code for:\n\nUse Case: {use_case}\n\nYour goals are:\n"
    base_prompt += "\n".join(f"- {g.strip()}" for g in goals)

    if previous_code:
        base_prompt += f"\n\nPreviously generated code:\n```\n{previous_code}\n```\n"
    if feedback:
        base_prompt += f"\n\nFeedback on the previous version:\n{feedback}\nRevise to address these issues."

    base_prompt += "\n\nReturn only the revised Python code. Do not include comments or explanations outside the code."
    return base_prompt


def get_code_feedback(code: str, goals: list[str]) -> str:
    """Evaluate generated code against success criteria and produce structured feedback.

    Args:
        code: The code artifact to evaluate.
        goals: List of success criteria to check against.

    Returns:
        A feedback string identifying which criteria are met and which need improvement.
    """
    if not code or not code.strip():
        return "FAIL: No code provided for evaluation."
    if not goals:
        return "FAIL: No goals defined for evaluation."

    prompt = f"You are a Python code reviewer. Evaluate this code against the following goals:\n"
    prompt += "\n".join(f"- {g.strip()}" for g in goals)
    prompt += f"\n\nCode:\n```\n{code}\n```\n\nCritique each goal. Note if improvements are needed for clarity, correctness, edge case handling, or test coverage."
    return prompt


def goals_met(
    feedback_text: str,
    goals: list[str],
    llm: Any,
) -> bool:
    """Use the LLM to determine whether all success criteria are satisfied.

    Args:
        feedback_text: The evaluator's detailed feedback on the artifact.
        goals: List of original success criteria.
        llm: The LLM client instance with an invoke() method.

    Returns:
        True if all goals are met, False otherwise. Parses the LLM verdict as a boolean.
    """
    if not feedback_text or not goals:
        return False

    review_prompt = f"You are an AI reviewer.\n\nGoals:\n{chr(10).join(f'- {g.strip()}' for g in goals)}\n\nFeedback:\n\"\"\"\n{feedback_text}\n\"\"\"\n\nBased on the feedback, have ALL goals been met? Respond with only one word: True or False."
    response = llm.invoke(review_prompt)
    return response.content.strip().lower() == "true"


def clean_code_block(code: str) -> str:
    """Strip markdown code fences from LLM-generated code output.

    Args:
        code: Raw LLM response potentially wrapped in ```python ... ```.

    Returns:
        Cleaned code string without fence markers.
    """
    if not code:
        return ""
    lines = code.strip().splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def run_goal_agent(
    use_case: str,
    goals_input: str,
    llm: Any,
    max_iterations: int = 5,
) -> dict[str, Any]:
    """Run the main iterative goal-driven agent loop.

    Generates code, evaluates against goals, refines, and repeats until success
    or max iterations exhausted. Returns result metadata with the final artifact.

    Args:
        use_case: Description of the coding problem to solve.
        goals_input: Comma-separated list of quality goals/criteria.
        llm: The LLM client instance with an invoke() method.
        max_iterations: Maximum refinement cycles before forced termination.

    Returns:
        Dict with keys: 'success', 'artifacts', 'iteration_count', 'remaining_gaps'.
    """
    if not use_case or not goals_input:
        raise ValueError("Both use_case and goals_input are required")

    goals = [g.strip() for g in goals_input.split(",")]
    state = GoalState(
        use_case=use_case,
        goals=goals,
        max_iterations=max_iterations,
    )

    previous_code: str = ""
    feedback_text: str = ""

    for iteration in range(max_iterations):
        state.current_iteration = iteration + 1

        prompt = generate_prompt(use_case, goals, previous_code, feedback_text)
        llm_response = llm.invoke(prompt)
        code = clean_code_block(llm_response.content)

        # Evaluate against criteria using separate reviewer LLM call
        eval_prompt = get_code_feedback(code, goals)
        feedback_response = llm.invoke(eval_prompt)
        feedback_text = feedback_response.content.strip()
        success = goals_met(feedback_text, goals, llm)

        if success:
            state.best_artifact = code
            state.remaining_gaps = []
            break

        previous_code = code
        state.remaining_gaps = [g for g in goals if "not met" in feedback_text.lower()]

    return {
        "success": len(state.remaining_gaps) == 0,
        "artifact": state.best_artifact,
        "iteration_count": state.current_iteration,
        "remaining_gaps": state.remaining_gaps,
        "max_iterations_reached": state.current_iteration >= max_iterations and not success,
    }
```

**BAD — Goal evaluation without iteration limits:**

```python
# ❌ BAD — No max-iteration cap means the agent can run forever if
# it never satisfies all criteria. This wastes tokens and creates
# unbounded cost. The feedback loop has no termination condition.

def run_unbounded_goal_agent(use_case: str, goals: list[str]) -> str:
    code = ""
    # Infinite loop — no iteration budget, no escape hatch
    while True:
        llm_response = llm.invoke(generate_prompt(use_case, goals, code, feedback))
        code = clean_code_block(llm_response.content)
        feedback = get_code_feedback(code, goals)
        if goals_met(feedback, goals):
            break  # Only exit if LLM says True — but LLM may never say True
    return code  # May never reach here
```

**GOOD — Goal evaluation with bounded iterations and gap reporting:**

```python
# ✅ GOOD — Every refinement loop has a hard iteration cap. When the
# budget is exhausted, remaining gaps are reported to the user so they
# know exactly what was not resolved. The agent also produces its best
# effort artifact even when full success wasn't achieved.

def run_bounded_goal_agent(
    use_case: str,
    goals: list[str],
    llm: Any,
    max_iterations: int = 5,
) -> dict[str, Any]:
    """Run goal-driven iteration with bounded refinement loop and gap reporting."""
    code = ""
    previous_code = ""
    feedback_text = ""

    for iteration in range(max_iterations):
        prompt = generate_prompt(use_case, goals, previous_code, feedback_text)
        llm_response = llm.invoke(prompt)
        code = clean_code_block(llm_response.content)

        # Self-evaluate — recognize inherent bias when same LLM generates and reviews
        eval_prompt = get_code_feedback(code, goals)
        feedback_response = llm.invoke(eval_prompt)
        feedback_text = feedback_response.content.strip()

        if goals_met(feedback_text, goals, llm):
            return {
                "success": True,
                "artifact": code,
                "iterations_used": iteration + 1,
                "remaining_gaps": [],
            }

        previous_code = code

    # Budget exhausted — report best effort with gaps
    return {
        "success": False,
        "artifact": code,
        "iterations_used": max_iterations,
        "remaining_gaps": [g for g in goals if "not met" in feedback_text.lower()],
    }
```

### Pattern 2: Multi-Agent Crew with Separated Roles (Generation vs. Evaluation)

Use this pattern when evaluation quality matters and the same LLM generating code should not be the sole evaluator. This separates concerns into distinct agent roles: a Peer Programmer for generation, a Code Reviewer for objective evaluation, and optionally a Test Writer for automated validation. Mirrors the multi-agent crew architecture from Chapter 11 where the Code Reviewer acts as an independent judge rather than the same agent producing the output.

```python
"""
Multi-agent goal-setting pattern with separated generation and evaluation roles.
Mirrors the "crew of AI agents" approach from Chapter 11: Peer Programmer,
Code Reviewer, Test Writer, Documenter, Prompt Refiner.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AgentRole(Enum):
    PEER_PROGRAMMER = "peer_programmer"
    CODE_REVIEWER = "code_reviewer"
    TEST_WRITER = "test_writer"
    DOCUMENTER = "documenter"
    PROMPT_REFINER = "prompt_refiner"


@dataclass
class GoalCriterion:
    """A single evaluable success criterion for goal monitoring."""
    id: str
    description: str
    eval_method: str  # "llm_judgment", "automated_test", "manual_check"
    weight: float = 1.0  # Relative importance of this criterion

    def __lt__(self, other: "GoalCriterion") -> bool:
        return self.weight > other.weight


@dataclass
class EvaluationResult:
    """Structured result from the evaluation phase."""
    overall_pass: bool
    criterion_results: list[dict]  # [{criterion_id, passed, notes}]
    feedback: str
    confidence: float = 0.0  # Confidence in the evaluation

    def unmet_criteria(self) -> list[str]:
        return [r["criterion_id"] for r in self.criterion_results if not r["passed"]]


@dataclass
class GoalOrchestrator:
    """Coordinates multi-agent goal-driven execution with evaluation loop."""
    goals: list[GoalCriterion]
    max_iterations: int = 5
    current_iteration: int = 0
    best_artifact: str = ""
    evaluation_log: list[EvaluationResult] = field(default_factory=list)

    def evaluate_with_separate_reviewer(
        self,
        artifact: str,
        reviewer_fn: callable,
    ) -> EvaluationResult:
        """Evaluate the artifact using a dedicated reviewer agent.

        This is the critical separation: the evaluator is independent from
        the generator, reducing self-bias in goal assessment.

        Args:
            artifact: The generated code or content to evaluate.
            reviewer_fn: Function that performs objective evaluation and returns verdict.

        Returns:
            Structured EvaluationResult with per-criterion pass/fail status.
        """
        if not artifact or not self.goals:
            return EvaluationResult(
                overall_pass=False,
                criterion_results=[],
                feedback="No artifact or goals provided for evaluation.",
            )

        # Build evaluation prompt from all criteria
        eval_instructions = "\n".join(
            f"- [{g.id}] {g.description} (weight: {g.weight}, method: {g.eval_method})"
            for g in self.goals
        )

        review_prompt = (
            f"You are an independent code reviewer. Evaluate this artifact "
            f"against the following success criteria:\n\n{eval_instructions}\n\n"
            f"Artifact:\n```\n{artifact}\n```\n\n"
            f"For each criterion, state: PASSED or FAILED with specific reason."
        )

        # Call the separate reviewer agent
        review_output = reviewer_fn(review_prompt)
        return self._parse_evaluation(review_output)

    def _parse_evaluation(self, raw_review: str) -> EvaluationResult:
        """Parse a raw LLM review into structured EvaluationResult.

        Uses regex-based parsing to extract per-criterion verdicts from the
        reviewer's free-text response. Falls back to keyword matching for
        simplicity; in production, use structured output or function calling.
        """
        criterion_results = []
        lines = raw_review.splitlines()

        for goal in self.goals:
            # Search for this criterion's verdict in the review text
            passed = False
            notes = ""
            for line in lines:
                stripped = line.strip().upper()
                if f"[{goal.id}]" in line or goal.id.replace("-", " ") in line.lower():
                    if "PASSED" in stripped or "PASS" in stripped:
                        passed = True
                    elif "FAILED" in stripped or "FAIL" in stripped:
                        passed = False
                    notes = line.strip()[:200]

            criterion_results.append({
                "criterion_id": goal.id,
                "passed": passed,
                "notes": notes,
            })

        overall_pass = all(r["passed"] for r in criterion_results)
        return EvaluationResult(
            overall_pass=overall_pass,
            criterion_results=criterion_results,
            feedback=raw_review[:1000],
        )

    def run_multi_agent_loop(
        self,
        generator_fn: callable,
        reviewer_fn: callable,
        use_case: str,
    ) -> dict[str, Any]:
        """Execute the multi-agent goal-setting loop with separated roles.

        Each iteration: Peer Programmer generates → Code Reviewer evaluates →
        if failures identified, feedback is fed back to the generator for revision.

        Args:
            generator_fn: Function that generates code/content given a prompt.
            reviewer_fn: Function that independently evaluates against criteria.
            use_case: The problem description being solved.

        Returns:
            Result dict with artifact, success status, iteration count, and gaps.
        """
        previous_artifact = ""
        feedback_text = ""

        for iteration in range(self.max_iterations):
            self.current_iteration = iteration + 1

            # Peer Programmer generates
            gen_prompt = f"Use case: {use_case}\n\nGoals:\n{chr(10).join(f'- {g.description}' for g in self.goals)}\n"
            if previous_artifact:
                gen_prompt += f"\nPrevious attempt feedback: {feedback_text}\nRevise to address issues."

            artifact = generator_fn(gen_prompt)

            # Code Reviewer evaluates (SEPARATE from generator)
            eval_result = self.evaluate_with_separate_reviewer(artifact, reviewer_fn)
            self.evaluation_log.append(eval_result)

            if eval_result.overall_pass:
                self.best_artifact = artifact
                break

            previous_artifact = artifact
            feedback_text = eval_result.feedback

        return {
            "success": len(self.evaluation_log) > 0 and self.evaluation_log[-1].overall_pass,
            "artifact": self.best_artifact,
            "iterations_used": self.current_iteration,
            "remaining_gaps": (self.evaluation_log[-1].unmet_criteria() if self.evaluation_log else []),
        }
```

**BAD — Same agent both generates and evaluates (self-bias):**

```python
# ❌ BAD — The same LLM that writes the code also judges its quality.
# This creates a fundamental evaluation bias: the model tends to rate
# its own output more favorably than an independent reviewer would.
# Over multiple iterations, this leads to premature convergence on
# solutions that fail objective criteria but pass the self-assessment.

def biased_goal_loop(use_case: str, goals: list[str]) -> str:
    code = ""
    for i in range(10):
        # Same model generates AND evaluates — inherent bias
        llm_response = llm.invoke(generate_code_prompt(use_case, goals, code))
        code = clean_code_block(llm_response.content)

        # Self-evaluation by the same LLM that produced the code
        verdict = llm.invoke(f"Does this code meet {goals}? Reply True/False")
        if "true" in verdict.content.lower():
            return code  # May pass self-biased check but fail real criteria
    return code  # Returns best effort after budget exhausted
```

**GOOD — Multi-agent crew with independent reviewer (Chapter 11 pattern):**

```python
# ✅ GOOD — Uses a dedicated Code Reviewer agent separate from the
# Peer Programmer. The reviewer has no incentive to inflate scores and
# provides honest, objective feedback that drives genuine improvement.
# This architecture is described in Chapter 11 as significantly improving
# evaluation quality over single-agent self-review.

def crew_based_goal_loop(
    use_case: str,
    goals: list[str],
    generator_fn: callable,      # Peer Programmer agent
    reviewer_fn: callable,       # Code Reviewer agent (independent)
    test_writer_fn: callable = None,  # Optional Test Writer agent
    max_iterations: int = 5,
) -> dict[str, Any]:
    """Multi-agent goal loop with separated generation and evaluation."""
    orchestrator = GoalOrchestrator(
        goals=[GoalCriterion(id=f"goal-{i}", description=g) for i, g in enumerate(goals)],
        max_iterations=max_iterations,
    )

    return orchestrator.run_multi_agent_loop(
        generator_fn=generator_fn,
        reviewer_fn=reviewer_fn,
        use_case=use_case,
    )
```

### Pattern 3: SMART Goal Definition with Structured Criteria

Use this pattern when you need to transform a high-level objective into concrete, measurable success criteria before starting any agent execution. Ensures goals follow the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound) and produces an evaluation-ready criterion list.

```python
"""
SMART goal definition pattern for transforming vague objectives
into structured, evaluable success criteria.
"""

from dataclasses import dataclass


@dataclass
class SMARTGoal:
    """A goal defined using the SMART framework."""
    objective: str              # The high-level objective
    specific_criteria: list[str]  # What exactly must be done
    measurable_metric: str      # How we measure success (binary or numeric)
    achievable: bool             # Whether the goal is realistically attainable
    relevant_context: str       # Why this goal matters in context
    time_bound: int | None = None  # Iteration budget or deadline, if applicable

    @property
    def evaluation_prompt(self) -> str:
        """Generate a structured evaluation prompt from SMART criteria."""
        return (
            f"Objective: {self.objective}\n"
            f"Specific Criteria:\n" + "\n".join(f"- {c}" for c in self.specific_criteria) + "\n"
            f"Measurable Metric: {self.measurable_metric}\n"
            f"Achievable: {'Yes' if self.achievable else 'No'}\n"
            f"Relevant Context: {self.relevant_context}\n"
            f"Time Bound: {'{self.time_bound} iterations' if self.time_bound else 'Unlimited'}"
        )


def define_smart_goals(use_case: str, raw_goals: list[str]) -> list[SMARTGoal]:
    """Convert a list of raw goal descriptions into structured SMART criteria.

    Args:
        use_case: The overarching task or problem being addressed.
        raw_goals: Unstructured goal descriptions from the user or system.

    Returns:
        List of SMARTGoal objects with parsed, structured criteria ready for evaluation.
    """
    if not use_case or not raw_goals:
        raise ValueError("Both use_case and raw_goals are required")

    goals = []
    for idx, raw_goal in enumerate(raw_goals):
        # Parse goal type to determine measurable metric
        goal_lower = raw_goal.lower()
        if "correct" in goal_lower or "functional" in goal_lower:
            metric = "All assertions pass with no errors"
        elif "simple" in goal_lower or "clean" in goal_lower:
            metric = "No nested logic deeper than 3 levels, functions < 20 lines"
        elif "edge case" in goal_lower:
            metric = "Handles None, empty, zero, negative, and overflow inputs"
        elif "test" in goal_lower or "covered" in goal_lower:
            metric = "All public functions have corresponding test cases"
        else:
            metric = f"Passes criteria check for '{raw_goal}'"

        goals.append(SMARTGoal(
            objective=use_case,
            specific_criteria=[raw_goal.strip()],
            measurable_metric=metric,
            achievable=True,
            relevant_context=use_case,
        ))

    return goals
```

---

## Constraints

### MUST DO

1. **Define goals using SMART criteria before execution** — Never start an agent loop with a vague or subjective objective. Every goal must have: a specific description, a measurable pass/fail metric, and a bounded iteration budget. This is the foundational discipline that makes monitoring possible. Reference `code-philosophy` Early Exit: if you cannot define measurable criteria, stop and clarify before proceeding.

2. **Enforce max-iteration limits on ALL refinement loops** — Every goal evaluation loop must have a hard cap (default: 5 iterations for code generation, configurable per domain). Never allow unbounded self-improvement cycles. This is the single most important guardrail against infinite cost. Report remaining gaps explicitly when the budget is exhausted rather than silently returning partial results.

3. **Separate generation from evaluation in high-stakes scenarios** — When the cost of false positives (accepting substandard output) is high, use a multi-agent crew pattern with an independent reviewer. The Code Reviewer agent must have no relationship to the Peer Programmer that produced the artifact. This directly addresses the self-bias risk documented in Chapter 11.

4. **Parse evaluator feedback at the boundary** — When receiving evaluation results from an LLM judge or test harness, parse the structured output before trusting it internally. Do not feed raw unvalidated evaluation text into generation prompts. Reference `code-philosophy` Parse Don't Validate: parse at boundaries (evaluation I/O), trust validated critique internally.

5. **Track and surface remaining gaps when budgets are exhausted** — When a refinement loop hits its iteration cap without full success, clearly report which specific criteria were met and which remain unmet. Do not hide partial failures. This enables downstream consumers to make informed decisions about escalation or manual review.

6. **Use binary verdicts where possible** — For LLM-based evaluation, prefer True/False responses over graded scores (e.g., 7/10). Binary decisions are easier to parse programmatically, create cleaner termination logic, and reduce evaluator subjectivity. Only use numeric scoring when no reliable binary proxy exists.

7. **Reference `code-philosophy` (5 Laws of Elegant Defense) throughout** — Design the monitoring loop so that: data flows naturally from generation → evaluation → refinement (Early Exit: skip evaluation if only one step needed), all external evaluator responses are parsed at boundaries (Parse Don't Validate), each evaluation pass is a pure function from artifact + criteria to verdict (Atomic Predictability), invalid evaluation states halt with descriptive errors (Fail Fast), and every variable in the loop reflects its intent (Intentional Naming).

8. **Log complete iteration history for auditability** — Record every generation, evaluation, and revision cycle including: the artifact produced, the evaluation prompt used, the evaluator's full output, the verdict, and which criteria passed/failed. This enables debugging goal convergence issues and is essential for production systems where autonomous decisions must be explainable.

### MUST NOT DO

1. **Do not allow unbounded refinement loops** — Every iterative evaluation loop must have a hard max-iteration cap configured at system setup time. Never let an agent refine indefinitely. An infinite loop is the most critical anti-pattern in goal monitoring — it wastes tokens, incurs unbounded cost, and can create runaway agents that never terminate.

2. **Do not use the same LLM for generation and evaluation without acknowledging bias** — Self-evaluation by the same model that produced the artifact has inherent bias toward accepting its own output. If you must use a single agent, acknowledge this limitation explicitly in your output and add additional verification steps (e.g., automated test execution).

3. **Do not define goals that cannot be objectively evaluated** — Vague goals like "make it good" or "improve quality" are impossible to monitor. Every criterion must have a clear pass/fail determination method, whether via LLM verdict, automated test, or human check. If you cannot evaluate it, you cannot monitor progress toward it.

4. **Do not silently return partial results when iteration budget is exhausted** — When max iterations are reached without full success, always surface the remaining unmet criteria explicitly. Do not present a partial artifact as complete. The consumer of your output must know what was and was not achieved.

5. **Do not skip evaluation after every generation pass** — Never generate an artifact and immediately return it without checking against the defined criteria. Even if you expect success, the evaluation step is the monitoring mechanism that gives the pattern its purpose. Skipping it reduces the agent to simple reactive execution with no goal awareness.

6. **Do not hardcode iteration limits without domain consideration** — While 5 iterations is a sensible default for code generation, different domains may need different budgets (e.g., trading bot backtesting may require more evaluation cycles). Configure max_iterations based on domain requirements, not as a universal constant.

---

## Output Template

When this skill is active, structure your response using the following template:

### 1. Objective Definition
- **High-Level Goal:** [The user's objective restated clearly]
- **SMART Criteria Breakdown:** List each goal with its specific description, measurable metric, and iteration budget
- **Success Verdict Method:** How each criterion will be evaluated (LLM judgment / automated test / manual check)

### 2. Iteration Log
Present each refinement cycle as a numbered entry:

| Iteration | Artifact Summary | Evaluation Prompt Used | Verdict (T/F) | Unmet Criteria |
|-----------|-----------------|----------------------|---------------|----------------|
| 1 | [brief description of what was produced] | [key prompt elements] | True/False | [list if failed] |
| 2 | ... | ... | True/False | ... |

### 3. Final Result
- **Success:** Yes / No (partial)
- **Iterations Used:** N of max_budget
- **Artifact:** [The final generated code/content, or "partial" with summary if budget exhausted]
- **Remaining Gaps:** [List any criteria not met, if applicable]
- **Escalation Required:** Yes / No (if gaps remain and user needs to know)

### 4. Transparency Notes (for production systems)
- Full evaluation prompts and responses for each iteration
- Confidence score on the final verdict
- Any self-bias acknowledgments (if single-agent pattern was used)
- Recommendation for manual review if applicable

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `planning-patterns` | Goal-setting monitoring sits atop planning — planning decomposes objectives into steps, goal-setting monitors whether those steps collectively achieve the objective |
| `multi-agent-orchestration` | Multi-agent crews (Peer Programmer + Code Reviewer) are a natural application of goal monitoring with separated generation and evaluation roles |
| `closed-loop-delivery` | Closed-loop delivery provides the broader orchestration framework; goal-setting-monitoring is the specific evaluation-and-refinement mechanism within that loop |

> 📖 skill(local cache): planning-patterns, multi-agent-orchestration, closed-loop-delivery
