---
name: reasoning-techniques
description: Implements advanced reasoning methodologies (Chain-of-Thought, Tree-of-Thoughts, ReAct, Self-Correction, Graph of Debates, Program-Aided LLMs) for multi-step problem-solving in complex agent tasks.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: reasoning techniques, chain of thought, tree of thoughts, ReAct, self-correction, program-aided LLMs, how do i improve agent reasoning, GoD
  related-skills: prompt-chaining, reflection-loop, planning-patterns, multi-agent-collaboration
  archetypes: tactical, orchestration, generation
  anti_triggers:
    - simple lookup
    - one-liner answer
    - quick fact
    - trivial yes/no
    - brainstorming first pass
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Advanced Reasoning Techniques

Implements a suite of advanced reasoning methodologies that make an AI agent's internal thought process explicit, enabling structured multi-step problem-solving. This skill equips the model with Chain-of-Thought decomposition, Tree-of-Thoughts exploration, ReAct action loops, Self-Correction refinement, Graph of Debates collaboration, and Program-Aided Language Model execution — each applied to complex tasks requiring deeper analysis than a single-pass LLM response can provide.

## TL;DR Checklist

- [ ] Choose the right reasoning technique based on task complexity (CoT → ToT → ReAct → GoD)
- [ ] Allocate sufficient "thinking budget" per the Scaling Inference Law — more compute yields better results even from smaller models
- [ ] Make all intermediate reasoning steps explicit; never skip from problem to answer
- [ ] Interleave reasoning with external tool use (ReAct) when real-world data is needed
- [ ] Self-correct every output: draft → review against requirements → revise → final
- [ ] Offload deterministic computation (math, code execution) to PAL for accuracy
- [ ] Use GoD for high-stakes decisions requiring bias mitigation and consensus

---

## When to Use

Use this skill when:

- A problem requires **multi-step logical inference** that cannot be solved in a single pass (complex QA, math proofs, code debugging)
- The task involves **exploring multiple solution paths** before committing to an answer (strategic planning, architecture design)
- The agent must **interleave reasoning with tool use** — query databases, search the web, execute code, call APIs (ReAct paradigm)
- Output quality is critical and requires **iterative self-refinement** before final delivery (code generation, legal analysis, medical diagnosis support)
- A decision involves **significant ambiguity or bias risk**, requiring multiple perspectives to converge on a robust answer (Graph of Debates)
- The problem involves **deterministic computation** (arithmetic, data manipulation, algorithmic verification) where LLMs are unreliable

---

## When NOT to Use

Avoid this skill for:

- Simple lookup or single-step questions where direct answers suffice (e.g., "What is the capital of France?")
- Real-time latency-critical responses where thinking budget adds unacceptable delay
- Tasks with no logical decomposition value — trivial yes/no or one-line factual queries
- When you only need a creative draft without accuracy verification (brainstorming, copywriting first pass)

---

## Core Workflow

1. **Classify Task Complexity** — Determine whether the task needs basic CoT (linear steps), ToT (branching exploration), ReAct (tool-interleaved), or GoD (multi-agent debate). Apply the Scaling Inference Law: a smaller model with more thinking time often outperforms a large model with minimal reasoning. **Checkpoint:** Confirm the chosen technique matches task complexity before proceeding.

2. **Decompose Into Reasoning Steps** — Break the problem into a sequence of explicit intermediate steps (CoT) or generate multiple candidate reasoning paths at each branching point (ToT). Document each step's purpose and expected output. **Checkpoint:** Every decomposition step should be independently verifiable against the original requirements.

3. **Execute Reasoning With Appropriate Depth** — Run the selected technique: produce a thought-action-observation loop for ReAct, explore top-k branches with evaluation scoring for ToT, or generate candidate arguments for GoD nodes. Ensure each reasoning pass produces observable, checkable intermediate results. **Checkpoint:** All intermediate outputs are captured and can be audited.

4. **Self-Correction Pass** — Review every generated answer against the original requirements: accuracy (factual correctness), completeness (all aspects addressed), clarity (readable and concise), and tone alignment. Identify discrepancies, propose specific improvements, and generate a revised version. **Checkpoint:** The revised content addresses all identified weaknesses from step 3.

5. **Offload Deterministic Computation** — For any arithmetic, code execution, or data transformation within the reasoning chain, delegate to PAL: generate executable Python, run it in a sandboxed environment, and use the returned results in subsequent steps. **Checkpoint:** Code execution output matches the expected computation result; validate before incorporating into final answer.

6. **Synthesize Final Output** — Combine all validated intermediate results into a structured final answer with citations where applicable. For GoD, identify the most robust argument cluster based on verifiable knowledge or consensus strength. **Checkpoint:** Final output is coherent, complete, and traceable to explicit reasoning steps.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Chain-of-Thought (CoT) Decomposition

Chain-of-Thought prompting guides the model through a step-by-step internal monologue before producing an answer. This transforms a single difficult problem into a sequence of simpler, verifiable sub-steps. Implement CoT by defining a persona, specifying the number and nature of reasoning steps, and capturing both the thought process and final answer.

```python
from typing import Any


def build_cot_prompt(query: str, persona: str, step_count: int = 5) -> str:
    """Build a Chain-of-Thought prompt with structured reasoning steps.

    Args:
        query: The user's question or problem to solve.
        persona: The role/identity the model should adopt.
        step_count: Number of explicit reasoning steps (default 5).

    Returns:
        A formatted prompt that enforces step-by-step reasoning.
    """
    # Define step templates based on common reasoning patterns
    step_templates = [
        "Analyze the Query",           # Understand requirements
        "Formulate Approach",          # Plan the solution strategy
        "Execute Reasoning Step",      # Perform intermediate work
        "Validate Intermediate Result",# Check correctness so far
        "Synthesize Final Answer",     # Produce polished output
    ]

    steps_text = ""
    for i, step in enumerate(step_templates[:step_count], 1):
        steps_text += f"{i}. **{step}:** Describe what you should do at this stage.\n"

    prompt = f"""You are an {persona}. Your goal is to answer the user's question
comprehensively and accurately by thinking step-by-step.

Here's the process you must follow:

{steps_text}

**User Query:** "{query}"

**Agent's Thought Process (Internal CoT Output):**

"""
    return prompt


def execute_cot_reasoning(
    thought_process: list[str],
    query: str,
) -> dict[str, Any]:
    """Validate a Chain-of-Thought reasoning trace.

    Args:
        thought_process: List of intermediate reasoning steps produced by the model.
        query: The original user query for reference.

    Returns:
        Dict with 'valid' boolean, 'step_count', and 'gaps' found during review.
    """
    gaps: list[str] = []

    # Check 1: At least one thought step exists
    if len(thought_process) < 2:
        gaps.append("Insufficient reasoning depth — expected at least 2 steps")

    # Check 2: Each step references the query or previous step
    for idx, step in enumerate(thought_process):
        if idx == 0 and not any(kw in step.lower() for kw in ["query", "question", "user"]):
            gaps.append(f"Step 1 does not reference the original query")

    # Check 3: Final step should lead to a conclusion
    last_step = thought_process[-1].lower()
    if not any(kw in last_step for kw in ["conclusion", "final", "answer", "therefore", "result"]):
        gaps.append("Final step does not produce a clear conclusion")

    return {
        "valid": len(gaps) == 0,
        "step_count": len(thought_process),
        "gaps": gaps,
    }
```

**BAD — Direct answer without reasoning trace:**

```
Question: What is 15% tip on $84.50?
Answer: $12.68
```

❌ No reasoning visible. Cannot verify correctness. Single-pass hallucination risk high.

**GOOD — CoT with explicit intermediate computation:**

```
Question: What is 15% tip on $84.50?

**Agent's Thought Process:**
Thought 1 (Analyze): Need to calculate 15% of $84.50 for the tip amount.
Thought 2 (Plan): Convert percentage to decimal (0.15), multiply by base amount.
Thought 3 (Compute): 84.50 * 0.15 = 12.675
Thought 4 (Round): Round to nearest cent: $12.68
Thought 5 (Validate): Check — 10% of 84.50 is 8.45, 5% is 4.225, sum = 12.675 → rounds to 12.68. Correct.

**Final Answer:** The tip is $12.68
```

✅ Each step verifiable. Rounding logic explicit. Cross-validation included.

---

### Pattern 2: Tree-of-Thoughts (ToT) Exploration

Tree-of-Thoughts extends CoT by branching at each reasoning step into multiple candidate thoughts, evaluating each branch before committing. This enables backtracking and exploration of alternative strategies — critical for tasks where the first obvious path may be suboptimal.

```python
from typing import Any


class ThoughtNode:
    """A single node in a Tree-of-Thoughts reasoning tree.

    Attributes:
        thought: The reasoning content at this node.
        score: Evaluation score (0.0-1.0) of this thought's promise.
        children: List of child nodes generated from this thought.
        parent: Reference to the parent ThoughtNode, or None for root.
    """

    def __init__(self, thought: str, parent: "ThoughtNode | None" = None) -> None:
        self.thought: str = thought
        self.score: float = 0.0
        self.children: list["ThoughtNode"] = []
        self.parent: ThoughtNode | None = parent

    def add_child(self, child: "ThoughtNode") -> None:
        """Add a child node and link parent reference."""
        child.parent = self
        self.children.append(child)

    def to_path(self) -> list[str]:
        """Trace this node's ancestry back to root as a complete reasoning path."""
        path: list[str] = []
        node: ThoughtNode | None = self
        while node is not None:
            path.append(node.thought)
            node = node.parent
        return list(reversed(path))


class TreeOfThoughts:
    """Tree-of-Thoughts reasoning engine for exploring multiple solution paths.

    Implements breadth-first exploration with evaluation and pruning at each depth level.
    """

    def __init__(
        self,
        problem: str,
        branches_per_step: int = 3,
        max_depth: int = 4,
    ) -> None:
        self.problem: str = problem
        self.branches_per_step: int = branches_per_step
        self.max_depth: int = max_depth
        self.root: ThoughtNode | None = None

    def generate_candidates(
        self,
        parent_node: ThoughtNode,
        depth: int,
    ) -> list[ThoughtNode]:
        """Generate candidate thoughts branching from a parent node.

        In production, this would call an LLM with the problem context plus
        the parent's thought. Here we demonstrate the structure.

        Args:
            parent_node: The ThoughtNode to branch from.
            depth: Current depth in the tree.

        Returns:
            List of new ThoughtNode candidates.
        """
        if depth >= self.max_depth:
            return []

        # Production: call LLM with prompt like:
        # "Given problem '{self.problem}' and parent thought: {parent_node.thought}
        #  Generate {self.branches_per_step} candidate next thoughts."
        candidates: list[ThoughtNode] = []
        for i in range(self.branches_per_step):
            child = ThoughtNode(
                thought=f"[Branch {i+1}] Consider an alternative approach...",
                parent=parent_node,
            )
            candidates.append(child)

        return candidates

    def evaluate_thought(
        self,
        node: ThoughtNode,
        depth: int,
    ) -> float:
        """Score a thought's promise of leading to a correct solution.

        Production evaluation uses heuristics or an LLM judge that considers:
        - Logical coherence with parent and problem statement
        - Diversity from sibling thoughts
        - Alignment with known constraints
        - Progress toward solvable sub-problems

        Args:
            node: The ThoughtNode to evaluate.
            depth: Current tree depth.

        Returns:
            Score between 0.0 (dead end) and 1.0 (highly promising).
        """
        # Production: implement real evaluation heuristics
        score = 0.5  # Placeholder — replace with actual evaluation logic
        return score

    def solve(self) -> list[str] | None:
        """Execute the full Tree-of-Thoughts reasoning process.

        Returns:
            The best reasoning path as a list of thought strings, or None if no path found.
        """
        self.root = ThoughtNode(thought=f"Problem: {self.problem}")

        # BFS-level exploration
        current_level: list[ThoughtNode] = [self.root]

        for depth in range(1, self.max_depth + 1):
            next_level: list[ThoughtNode] = []

            for node in current_level:
                candidates = self.generate_candidates(node, depth)
                for candidate in candidates:
                    score = self.evaluate_thought(candidate, depth)
                    candidate.score = score
                    node.add_child(candidate)
                    next_level.append(candidate)

            if not next_level:
                break

            # Prune: keep only top-k branches at each level
            next_level.sort(key=lambda n: n.score, reverse=True)
            current_level = next_level[: self.branches_per_step]

        # Find best leaf and trace its path
        if not current_level:
            return None

        best_node = max(current_level, key=lambda n: n.score)
        return best_node.to_path()
```

**BAD — Linear CoT on a problem requiring backtracking:**

```
Problem: Plan a 3-day trip to Tokyo on $1500 budget.
→ Day 1: Visit Shibuya, Shinjuku, Akihabara (assumes all fits in one day)
→ Day 2: Visit Asakusa, Ueno, TeamLab (assumes no travel time)
→ Day 3: Day trip to Nikko (misses Tokyo attractions entirely)
```

❌ No exploration of alternatives. No budget verification at each step. One path only.

**GOOD — ToT with branching and pruning:**

```
Problem: Plan a 3-day trip to Tokyo on $1500 budget.

Branch A (Geographic clustering): Group by neighborhoods → score: 0.82
  → Sub-branch A1: Day 1 (West Tokyo), Day 2 (East Tokyo), Day 3 (Day trips)
    → Budget check: hotels $600, food $240, transit $60, activities $200 = $1100 ✓

Branch B (Thematic clustering): Group by interest type → score: 0.71
  → Sub-branch B1: Culture Day, Food Day, Tech/Shopping Day
    → Budget check: hotels $600, food $300, transit $80, activities $250 = $1230 ✓

Branch C (Temporal optimization): Morning/evening split → score: 0.65
  → Higher complexity, marginal benefit over A or B

Decision: Follow Branch A → geographic clustering with budget buffer ($400 remaining)
```

✅ Explores 3 distinct strategies. Scores each objectively. Validates constraints. Selects best path with justification.

---

### Pattern 3: ReAct (Reason + Act) Loop

ReAct interleaves reasoning thoughts with concrete tool actions, forming a Thought → Action → Observation cycle. This enables agents to dynamically gather information, verify assumptions, and adapt plans based on real-world feedback — essential for research, debugging, and any task requiring external data.

```python
from typing import Any


class ReActStep:
    """A single step in the ReAct reasoning loop.

    Attributes:
        step_number: Sequential step index (1-based).
        thought: The agent's internal reasoning at this step.
        action_name: Name of the tool/action to execute.
        action_input: Arguments passed to the action.
        observation: Result returned from the action execution (None if not yet executed).
    """

    def __init__(self, step_number: int) -> None:
        self.step_number: int = step_number
        self.thought: str = ""
        self.action_name: str = ""
        self.action_input: dict[str, Any] = {}
        self.observation: str | None = None


def run_react_loop(
    goal: str,
    available_tools: dict[str, callable],
    max_steps: int = 10,
) -> dict[str, Any]:
    """Execute a ReAct reasoning loop with tool-interleaved action.

    Args:
        goal: The task the agent must accomplish.
        available_tools: Mapping of tool names to executable functions.
        max_steps: Maximum number of Thought-Action-Observation cycles.

    Returns:
        Dict with 'final_answer', 'steps' (list of ReActStep), and 'terminated_early' bool.
    """
    steps: list[ReActStep] = []
    current_step_idx: int = 1
    terminated_early: bool = False

    while current_step_idx <= max_steps:
        step = ReActStep(step_number=current_step_idx)

        # --- THOUGHT Phase: Reason about what to do next ---
        all_obs = [s.observation for s in steps if s.observation is not None]
        context = f"Goal: {goal}\nPrevious observations:\n" + "\n".join(all_obs)
        step.thought = _generate_thought(context, available_tools, current_step_idx)

        # Check if the thought indicates a "finish" action
        if _is_finish_thought(step.thought):
            step.action_name = "finish"
            step.action_input = {"answer": _extract_final_answer(step.thought)}
            step.observation = None
            steps.append(step)
            terminated_early = True
            break

        # --- ACTION Phase: Select and execute a tool ---
        action_name, action_input = _select_action(
            step.thought, available_tools, current_step_idx
        )
        step.action_name = action_name
        step.action_input = action_input

        # Execute the tool (production: use proper sandboxed execution)
        if action_name in available_tools:
            try:
                result = available_tools[action_name](**action_input)
                step.observation = str(result)
            except Exception as e:
                step.observation = f"ERROR: {type(e).__name__}: {e}"
        else:
            step.observation = f"ERROR: Tool '{action_name}' not found in available tools."

        steps.append(step)
        current_step_idx += 1

    # If we hit max steps without finishing, produce a best-effort answer
    if not terminated_early and steps:
        last_thought = steps[-1].thought
        final_answer = _extract_best_effort_answer(goal, steps, last_thought)
    else:
        final_answer = steps[-1].action_input.get("answer", "Could not reach conclusion.")

    return {
        "final_answer": final_answer,
        "steps": steps,
        "terminated_early": terminated_early,
        "total_steps": len(steps),
    }


def _generate_thought(context: str, tools: dict[str, callable], step_num: int) -> str:
    """Generate the next reasoning thought given context and available tools.

    Production: call an LLM with system prompt + history.
    """
    tool_names = ", ".join(tools.keys())
    return (
        f"[Thought {step_num}] Given goal and observations so far, "
        f"consider actions: [{tool_names}]. Determine next step."
    )


def _is_finish_thought(thought: str) -> bool:
    """Check if the thought indicates the agent is ready to produce a final answer."""
    return any(kw in thought.lower() for kw in ["final answer", "conclusion", "ready to finish", "i know the answer"])


def _extract_final_answer(thought: str) -> str:
    """Extract the proposed final answer from a finish thought."""
    # Production: use more robust extraction (e.g., regex or LLM parsing)
    return f"Based on reasoning steps, the answer is provided in the thought."


def _select_action(
    thought: str, tools: dict[str, callable], step_num: int
) -> tuple[str, dict[str, Any]]:
    """Select which tool to execute and with what arguments.

    Production: an LLM selects the action based on the thought.
    """
    return "search", {"query": "relevant query"}


def _extract_best_effort_answer(
    goal: str, steps: list[ReActStep], final_thought: str
) -> str:
    """Produce a best-effort answer when max steps reached without explicit finish."""
    observations = [s.observation for s in steps if s.observation]
    return (
        f"Best effort answer for '{goal}': "
        f"After {len(steps)} steps, accumulated observations: {'; '.join(observations[-3:])}"
    )
```

**BAD — Non-interactive single-pass with assumed facts:**

```
Question: What is the current stock price of AAPL and its P/E ratio?
Answer: AAPL trades around $190 with a P/E ratio of approximately 31.
```

❌ No verification against live data. Numbers may be stale or hallucinated. No tool use shown.

**GOOD — ReAct with actual tool calls:**

```
[Thought 1] Need current AAPL stock price and P/E ratio. These are live financial data points. I should query a financial API.

<Action> search(query="AAPL current stock price")
<Observation> AAPL: $227.57 (as of 2026-06-08)

[Thought 2] Got the current price: $227.57. Now need P/E ratio — this is also live data. Query financial database.

<Action> search(query="AAPL trailing twelve months P/E ratio")
<Observation> AAPL TTM P/E: 34.82 (source: Yahoo Finance, updated 2026-06-08)

[Thought 3] I have both data points: Price = $227.57, P/E = 34.82. I can now provide a complete answer with source attribution.

<Finish> The current stock price of AAPL is $227.57 (as of June 8, 2026), with a trailing twelve-month P/E ratio of 34.82.
```

✅ Each step verified against live data. Source attribution included. No assumptions. Clear tool-action-observation trace.

---

### Pattern 4: Self-Correction (Self-Refinement) Loop

Self-correction integrates quality control directly into the agent's content generation pipeline. The agent drafts an initial output, critiques it against original requirements across multiple dimensions, proposes concrete improvements, and produces a revised version. This iterative refinement loop is critical for high-stakes outputs.

```python
from typing import Any


class SelfCorrectionPass:
    """A single self-correction evaluation pass over generated content.

    Attributes:
        original_prompt: The initial user requirements.
        draft_content: The content being evaluated.
        discrepancies: List of identified issues with severity and type.
        improvements: List of concrete proposed fixes.
    """

    def __init__(self, original_prompt: str, draft_content: str) -> None:
        self.original_prompt: str = original_prompt
        self.draft_content: str = draft_content
        self.discrepancies: list[dict[str, str]] = []
        self.improvements: list[dict[str, str]] = []

    def evaluate(
        self,
        dimensions: list[str] | None = None,
    ) -> list[dict[str, str]]:
        """Evaluate content across multiple quality dimensions.

        Args:
            dimensions: Quality criteria to check (default: all 6 dimensions).

        Returns:
            List of discrepancy dicts with 'dimension', 'issue', and 'severity' keys.
        """
        if dimensions is None:
            dimensions = [
                "accuracy",       # Factual correctness
                "completeness",   # All requirements addressed
                "clarity",        # Readable and unambiguous
                "tone",           # Matches desired style
                "engagement",     # Captures attention
                "conciseness",    # No unnecessary verbosity
            ]

        self.discrepancies = []

        for dim in dimensions:
            issues = self._check_dimension(dim)
            self.discrepancies.extend(issues)

        return self.discrepancies

    def propose_improvements(self) -> list[dict[str, str]]:
        """Generate specific improvement proposals based on identified discrepancies.

        Returns:
            List of improvement dicts with 'dimension', 'issue', and 'action' keys.
        """
        self.improvements = []
        for disc in self.discrepancies:
            improvement = {
                "dimension": disc["dimension"],
                "issue": disc["issue"],
                "action": self._generate_fix_action(disc),
            }
            self.improvements.append(improvement)

        return self.improvements

    def _check_dimension(self, dimension: str) -> list[dict[str, str]]:
        """Check content against a single quality dimension.

        Production: call an LLM with the content + dimension-specific rubric.
        """
        findings: list[dict[str, str]] = []

        if dimension == "accuracy":
            # Check for factual claims that should be verified
            if any(kw in self.draft_content.lower() for kw in ["2024", "2025"]):
                findings.append({
                    "dimension": "accuracy",
                    "issue": "Contains date-specific claims that may be outdated.",
                    "severity": "high",
                })

        elif dimension == "completeness":
            # Check if key entities from the prompt are mentioned
            prompt_entities = self.original_prompt.split()[:10]
            missing = [e for e in prompt_entities if e.lower() not in self.draft_content.lower()]
            if len(missing) > 3:
                findings.append({
                    "dimension": "completeness",
                    "issue": f"May be missing key topics from original prompt: {', '.join(missing[:3])}",
                    "severity": "high",
                })

        elif dimension == "clarity":
            if len(self.draft_content.split()) > 500 and "." not in self.draft_content[-100:]:
                findings.append({
                    "dimension": "clarity",
                    "issue": "Content appears to lack a proper conclusion.",
                    "severity": "medium",
                })

        return findings

    def _generate_fix_action(self, discrepancy: dict[str, str]) -> str:
        """Generate a concrete fix action for a given discrepancy.

        Production: an LLM generates specific rewrite suggestions.
        """
        return f"Revise content to address {discrepancy['issue'].lower()}."


def apply_self_correction(
    original_prompt: str,
    draft_content: str,
    max_iterations: int = 3,
) -> dict[str, Any]:
    """Apply a self-correction loop: draft → evaluate → improve → revise.

    Args:
        original_prompt: The user's original requirements.
        draft_content: The initial content draft to refine.
        max_iterations: Maximum refinement cycles before accepting the result.

    Returns:
        Dict with 'revised_content', 'iterations', and 'final_discrepancies'.
    """
    current_content = draft_content
    all_discrepancies: list[dict[str, str]] = []

    for iteration in range(max_iterations):
        evaluator = SelfCorrectionPass(original_prompt, current_content)
        discrepancies = evaluator.evaluate()

        if not discrepancies:
            # Content passes all checks — no further refinement needed
            break

        all_discrepancies = discrepancies
        improvements = evaluator.propose_improvements()

        # Production: LLM rewrites content applying all improvement suggestions
        current_content = _apply_improvements(current_content, improvements)

    return {
        "revised_content": current_content,
        "iterations": len(all_discrepancies) > 0 or iteration + 1,
        "final_discrepancies": all_discrepancies,
        "converged": len(all_discrepancies) == 0,
    }


def _apply_improvements(content: str, improvements: list[dict[str, str]]) -> str:
    """Apply improvement suggestions to content.

    Production: call LLM with content + each improvement action for rewrite.
    """
    return f"[Revised] {content} — improved per {len(improvements)} suggestions."
```

**BAD — Single-pass output with no quality gate:**

```
Original Prompt: "Write a short, engaging social media post (max 150 characters) announcing 'GreenTech Gadgets', a new eco-friendly product line."

Output: "We have new products. They are green and techy. Buy GreenTech Gadgets now!"
```

❌ Not engaging (generic language). Doesn't highlight eco-friendly benefit explicitly. Weak call to action. No hashtags for reach. Character count ok but quality is low.

**GOOD — Self-corrected output after evaluation loop:**

```
Iteration 1 — Evaluation:
  [accuracy] OK — no factual claims to verify
  [completeness] ISSUE — product name present but "eco-friendly" not emphasized as benefit
  [engagement] ISSUE — generic verbs ("have", "are"), passive voice
  [tone] ISSUE — lacks excitement appropriate for a product launch
  [conciseness] OK — under 150 characters

Iteration 2 — Improvements Applied:
  → Replace weak verbs with active, exciting ones
  → Explicitly mention "eco-friendly" as the key selling point
  → Add relevant hashtags and emoji for engagement
  → Strengthen call to action

Revised Output:
"🌱 Discover GreenTech Gadgets! Our new eco-friendly line blends innovation
with sustainability. Go green, go smart! Shop now! #EcoFriendly #GreenTech"
(148 characters — within limit)

Iteration 3 — Evaluation: All dimensions pass. Converged.
```

✅ Each iteration addresses specific weaknesses. Final output is polished, on-brief, and ready for use.

---

### Pattern 5: Program-Aided Language Models (PAL)

PALs offload deterministic computation from the LLM to a code execution engine. The LLM generates Python code as an intermediate reasoning scaffold, the code executes to produce precise results, and the agent incorporates those results into its final answer. This eliminates arithmetic errors and ensures computational accuracy.

```python
from typing import Any


def execute_pal_pipeline(
    problem: str,
    llm_generate_code: callable,
    code_executor: callable,
) -> dict[str, Any]:
    """Execute a Program-Aided Language Model reasoning pipeline.

    The LLM generates executable Python code to solve computational sub-problems.
    Code is executed in a sandboxed environment and results are incorporated back.

    Args:
        problem: The original problem statement requiring computation.
        llm_generate_code: Function that takes (problem, partial_result) and returns Python code.
        code_executor: Function that executes Python code safely and returns result string.

    Returns:
        Dict with 'problem', 'generated_code', 'execution_output', 'verified_result'.
    """
    # Step 1: LLM generates computation code
    generated_code = llm_generate_code(problem, partial_result=None)

    # Step 2: Execute the generated code in a sandboxed environment
    execution_output = code_executor(generated_code)

    # Step 3: Validate and extract the result
    verified_result = _validate_pal_output(execution_output, problem)

    return {
        "problem": problem,
        "generated_code": generated_code.strip(),
        "execution_output": execution_output,
        "verified_result": verified_result,
    }


def build_pal_math_solver() -> dict[str, Any]:
    """Construct a PAL pipeline for mathematical problem solving.

    Returns:
        A configured PAL executor with code generation and execution logic.
    """

    def generate_math_code(problem: str, partial_result: Any | None) -> str:
        """Generate Python code to solve a mathematical sub-problem.

        Production: this function calls an LLM with the problem statement
        and returns valid Python using sympy or standard arithmetic.
        """
        # Example: PAL generates code for a compound interest calculation
        code = """
import math

principal = 10000
rate = 0.07  # 7% annual interest
time_years = 5
compounding_periods = 12  # monthly

# Compound interest formula: A = P(1 + r/n)^(nt)
amount = principal * (1 + rate / compounding_periods) ** (compounding_periods * time_years)
interest_earned = amount - principal

print(f"Final amount: ${amount:.2f}")
print(f"Interest earned: ${interest_earned:.2f}")
"""
        return code.strip()

    def execute_code(code: str) -> str:
        """Execute Python code in a sandboxed environment.

        Production: use RestrictedPython, Docker sandbox, or similar
        to prevent arbitrary code execution.
        """
        # Example output for the compound interest problem above:
        return "Final amount: $14176.25\nInterest earned: $4176.25"

    result = execute_pal_pipeline(
        problem="Calculate the compound interest on $10,000 at 7% annual rate over 5 years, compounded monthly.",
        llm_generate_code=generate_math_code,
        code_executor=execute_code,
    )
    return result


def build_pal_code_debugger() -> dict[str, Any]:
    """Construct a PAL pipeline for programmatic code debugging.

    Generates and runs test cases to identify bugs in provided code.
    """

    def generate_test_code(buggy_code: str, problem_description: str) -> str:
        """Generate Python test harness to exercise buggy code.

        Production: LLM generates tests based on the problem specification
        and the buggy implementation's interface.
        """
        return """
# Test cases for the sorting function under investigation
from typing import list

def run_tests(sort_func):
    results = []

    # Test 1: Normal case — mixed integers
    test_input = [3, 1, 4, 1, 5, 9, 2, 6]
    expected = sorted(test_input)
    actual = sort_func(test_input.copy())
    results.append({"test": "normal_case", "pass": actual == expected, "actual": actual})

    # Test 2: Edge case — empty list
    test_input = []
    actual = sort_func(test_input.copy())
    results.append({"test": "empty_list", "pass": actual == [], "actual": actual})

    # Test 3: Edge case — single element
    test_input = [42]
    actual = sort_func(test_input.copy())
    results.append({"test": "single_element", "pass": actual == [42], "actual": actual})

    # Test 4: Already sorted list
    test_input = [1, 2, 3, 4, 5]
    actual = sort_func(test_input.copy())
    results.append({"test": "already_sorted", "pass": actual == [1,2,3,4,5], "actual": actual})

    # Test 5: All same elements
    test_input = [7, 7, 7, 7]
    actual = sort_func(test_input.copy())
    results.append({"test": "all_same", "pass": actual == [7,7,7,7], "actual": actual})

    for r in results:
        status = "PASS" if r["pass"] else "FAIL"
        print(f"[{status}] {r['test']}: expected={expected if r['test']=='normal_case' else 'N/A'}, got={r['actual']}")

# Run all tests
run_tests(sort_func)
"""
        return code.strip()

    # Execute and analyze results
    test_output = """[PASS] normal_case: expected=[1, 1, 2, 3, 4, 5, 6, 9], got=[1, 1, 2, 3, 4, 5, 6, 9]
[PASS] empty_list: expected=N/A, got=[]
[FAIL] single_element: expected=N/A, got=[]
[PASS] already_sorted: expected=N/A, got=[1, 2, 3, 4, 5]
[PASS] all_same: expected=N/A, got=[7, 7, 7, 7]"""

    # Analyze: Test 3 fails — single element list returns empty instead of [42]
    # Bug likely in a condition checking `if len(arr) > 1` that skips single-element case
    return {
        "problem": "Find bugs in the provided sorting function using test-driven debugging",
        "test_code": generate_test_code("# buggy sort implementation", ""),
        "test_results": test_output,
        "diagnosis": "Bug identified: Single-element list returns empty (Test 3 FAIL). Check guard clause that requires len(arr) > 1.",
    }


def _validate_pal_output(
    execution_output: str,
    problem: str,
) -> str | None:
    """Validate that PAL code execution produced a reasonable result.

    Args:
        execution_output: Raw output from code execution.
        problem: Original problem for context.

    Returns:
        Validated result string, or None if execution failed.
    """
    if not execution_output or "Error" in execution_output or "Traceback" in execution_output:
        return None
    return execution_output.strip()
```

**BAD — LLM does math directly (hallucination-prone):**

```
Problem: A rectangle has width 17.35m and length 24.82m. Calculate the area and perimeter.

LLM Answer: Area = 430.71 square meters. Perimeter = 84.34 meters.
```

❌ LLMs are notoriously bad at arithmetic. Numbers may be plausible but wrong. No verification mechanism.

**GOOD — PAL generates and executes code for precise computation:**

```
Problem: A rectangle has width 17.35m and length 24.82m. Calculate the area and perimeter.

Generated Python Code:
    width = 17.35
    length = 24.82
    area = width * length
    perimeter = 2 * (width + length)
    print(f"Area: {area:.2f} m²")
    print(f"Perimeter: {perimeter:.2f} m")

Execution Output:
    Area: 430.62 m²
    Perimeter: 84.34 m

Verified Result: Area = 430.62 m², Perimeter = 84.34 m
```

✅ Deterministic computation via code execution. No arithmetic hallucination. Exact results with proper rounding. Code is auditable and reproducible.

---

### Pattern 6: Graph of Debates (GoD) Framework

Graph of Debates structures multi-agent reasoning as a dynamic, non-linear network where arguments are nodes connected by "supports" or "refutes" edges. This moves beyond linear debate chains to a richer topology that can dynamically branch, converge, and identify the most robust argument cluster.

```python
from typing import Any


class DebateNode:
    """A single argument node in a Graph of Debates.

    Attributes:
        content: The argument text (claim or counter-claim).
        node_id: Unique identifier for this node.
        claim_type: Whether this node presents a 'claim', 'support', or 'refutation'.
        evidence: List of verifiable evidence items supporting this argument.
        confidence: Confidence score based on evidence strength and consensus (0.0-1.0).
        children: Nodes that support or refute this one.
    """

    def __init__(self, node_id: int, content: str, claim_type: str = "claim") -> None:
        self.node_id: int = node_id
        self.content: str = content
        self.claim_type: str = claim_type  # 'claim', 'support', or 'refutation'
        self.evidence: list[str] = []
        self.confidence: float = 0.5
        self.children: list["DebateNode"] = []
        self.parent_ids: list[int] = []

    def add_evidence(self, evidence_item: str) -> None:
        """Add a verifiable evidence item to this argument."""
        self.evidence.append(evidence_item)


class DebateGraph:
    """Graph of Debates (GoD) framework for multi-agent collaborative reasoning.

    Arguments form nodes; edges represent 'supports' or 'refutes' relationships.
    A conclusion emerges from the most robust, well-supported argument cluster.
    """

    def __init__(self) -> None:
        self.nodes: dict[int, DebateNode] = {}
        self.next_id: int = 0
        self.support_edges: list[tuple[int, int]] = []  # (parent_id, child_id)
        self.refutes_edges: list[tuple[int, int]] = []

    def add_argument(
        self,
        content: str,
        claim_type: str = "claim",
        evidence: list[str] | None = None,
    ) -> int:
        """Add a new argument node to the debate graph.

        Args:
            content: The argument text.
            claim_type: 'claim', 'support', or 'refutation'.
            evidence: Optional verifiable evidence items.

        Returns:
            The node ID assigned to this argument.
        """
        node = DebateNode(self.next_id, content, claim_type)
        if evidence:
            node.evidence = evidence.copy()
        self.nodes[self.next_id] = node
        self.next_id += 1
        return self.next_id - 1

    def link_support(self, supporter_id: int, supported_id: int) -> None:
        """Add a 'supports' edge between two nodes."""
        self.support_edges.append((supporter_id, supported_id))
        if supported_id in self.nodes:
            self.nodes[supported_id].children.append(self.nodes[supporter_id])

    def link_refutes(self, refuter_id: int, refuted_id: int) -> None:
        """Add a 'refutes' edge between two nodes."""
        self.refutes_edges.append((refuter_id, refuted_id))
        if refuted_id in self.nodes:
            self.nodes[refuted_id].children.append(self.nodes[refuter_id])

    def evaluate_node_confidence(self, node_id: int) -> float:
        """Evaluate the confidence of a node based on its evidence and supporting arguments.

        Confidence is computed from:
        - Number and quality of direct evidence items (verifiable vs anecdotal)
        - Strength of supporting argument cluster
        - Absence of successful refutations

        Args:
            node_id: The node to evaluate.

        Returns:
            Confidence score between 0.0 and 1.0.
        """
        if node_id not in self.nodes:
            return 0.0

        node = self.nodes[node_id]

        # Base confidence from evidence count
        evidence_score = min(len(node.evidence) * 0.25, 0.75)

        # Bonus for supporting arguments
        support_count = sum(1 for p, c in self.support_edges if c == node_id)
        support_bonus = min(support_count * 0.1, 0.2)

        # Penalty for successful refutations
        refute_count = sum(1 for r, f in self.refutes_edges if f == node_id)
        refute_penalty = min(refute_count * 0.15, 0.5)

        confidence = evidence_score + support_bonus - refute_penalty
        return max(0.0, min(confidence, 1.0))

    def find_best_argument_cluster(self) -> list[int]:
        """Identify the most robust and well-supported cluster of arguments.

        The winning cluster is determined by:
        - Highest aggregate confidence across interconnected nodes
        - Strongest evidence backing
        - Consensus among multiple supporting arguments (multi-model agreement)

        Returns:
            List of node IDs forming the best argument cluster.
        """
        # Evaluate all nodes
        for node_id in self.nodes:
            self.nodes[node_id].confidence = self.evaluate_node_confidence(node_id)

        # Find the connected component with highest aggregate confidence
        # Simplified: return nodes with confidence > threshold, sorted by score
        threshold = 0.3
        strong_nodes = [
            (nid, node.confidence)
            for nid, node in self.nodes.items()
            if node.confidence >= threshold
        ]
        strong_nodes.sort(key=lambda x: x[1], reverse=True)

        # Return top cluster members
        return [nid for nid, _ in strong_nodes[:5]]

    def get_debate_summary(self) -> dict[str, Any]:
        """Generate a structured summary of the debate graph.

        Returns:
            Dict with argument counts, best cluster, and confidence scores.
        """
        all_ids = list(self.nodes.keys())
        claims = [nid for nid in all_ids if self.nodes[nid].claim_type == "claim"]
        supports = [nid for nid in all_ids if self.nodes[nid].claim_type == "support"]
        refutations = [nid for nid in all_ids if self.nodes[nid].claim_type == "refutation"]

        best_cluster = self.find_best_argument_cluster()

        return {
            "total_arguments": len(all_ids),
            "claims": len(claims),
            "supports": len(supports),
            "refutations": len(refutations),
            "support_edges": len(self.support_edges),
            "refutes_edges": len(self.refutes_edges),
            "best_cluster_nodes": best_cluster,
            "cluster_details": [
                {
                    "node_id": nid,
                    "content": self.nodes[nid].content[:100],
                    "confidence": round(self.nodes[nid].confidence, 2),
                    "evidence_count": len(self.nodes[nid].evidence),
                }
                for nid in best_cluster
            ],
        }
```

**Example: GoD for a technical decision (framework selection)**

```python
def build_framework_debate_graph() -> dict[str, Any]:
    """Demonstrate a GoD framework for evaluating React vs. Svelte vs. Vue."""
    graph = DebateGraph()

    # Claim 1: React has the largest ecosystem and job market
    node_r_eco = graph.add_argument(
        "React has the largest JavaScript ecosystem, most packages, and highest job demand.",
        claim_type="claim",
        evidence=["NPM package registry stats (2026)", "Stack Overflow Developer Survey 2026", "Indeed job posting volume"],
    )

    # Support for Claim 1
    graph.add_argument(
        "React's ecosystem includes Next.js, React Query, Zustand — covering full-stack needs.",
        claim_type="support",
        evidence=["NPM weekly downloads: next@14.x > 10M", "React documentation: 30M monthly visitors"],
    ).__dict__

    # Claim 2: Svelte offers better developer experience with less boilerplate
    node_s_dx = graph.add_argument(
        "Svelte provides superior developer experience with zero runtime overhead and minimal boilerplate.",
        claim_type="claim",
        evidence=["Compile-time transformation (no virtual DOM)", "SvelteKit full-stack framework maturity"],
    )

    # Support for Claim 2
    graph.add_argument(
        "Svelte apps have smaller bundle sizes and faster initial load times in benchmarks.",
        claim_type="support",
        evidence=["BundlePhobia analysis: Svelte < 3KB gzipped vs React > 40KB with dependencies"],
    )

    # Refutation of Claim 1 (React's size is a liability for performance-critical apps)
    graph.add_argument(
        "React's ecosystem bloat increases bundle size and learning curve for small teams.",
        claim_type="refutation",
        evidence=["Lighthouse performance scores favor lightweight frameworks"],
    )

    # Claim 3: Vue offers the best middle ground (learning curve + features)
    node_v_mid = graph.add_argument(
        "Vue provides an optimal balance between React's ecosystem and Svelte's simplicity.",
        claim_type="claim",
        evidence=["Vue 3 Composition API maturity", "Nuxt 3 SSR/SSG capabilities"],
    )

    # Link relationships
    graph.link_support(supporter_id=graph.add_argument(
        "Vue's official tooling (Vite, Pinia, Vue Router) is cohesive and well-maintained.",
        claim_type="support",
    ), supported_id=node_v_mid)

    graph.link_refutes(refuter_id=graph.add_argument(
        "Svelte compiles away framework overhead; React must ship a runtime to every user.",
        claim_type="refutation",
    ), refuted_id=node_r_eco)

    summary = graph.get_debate_summary()
    return {
        "framework_selection_debate": summary,
        "winning_cluster": [nid for nid in summary["best_cluster_nodes"]],
    }
```

**GOOD — GoD produces a nuanced recommendation with evidence trails:**

```
Debate Summary:
  Total arguments: 5 | Claims: 3 | Supports: 2 | Refutations: 2
  Support edges: 2 | Refutes edges: 1

Best Argument Cluster (confidence-scored):
  [Node 0] "React has the largest JavaScript ecosystem..." — confidence: 0.75
    Evidence: NPM stats, Stack Overflow Survey, Indeed job volume
  [Node 4] "Vue provides an optimal balance between React's ecosystem and Svelte's simplicity." — confidence: 0.65
    Evidence: Composition API maturity, Nuxt 3 SSR capabilities
  [Node 1] "React's ecosystem includes Next.js, React Query..." — confidence: 0.60
    Evidence: 10M+ weekly downloads, 30M monthly doc visitors

Conclusion: For enterprise teams with hiring needs → React (highest ecosystem confidence).
For performance-critical apps → Svelte (refutation supported by benchmark evidence).
For balanced teams wanting growth path → Vue (mid-range confidence, low risk).
```

✅ Non-linear argument structure. Confidence scoring from evidence. Multiple valid conclusions based on context. Transparent evidence trail for each position.

---

### Pattern 7: Deep Research with LangGraph Reflection Loop

Deep Research exemplifies advanced reasoning in production: an autonomous agent that decomposes a complex query, performs iterative web searches, identifies knowledge gaps, refines its approach, and synthesizes a cited report. The LangGraph state machine orchestrates this multi-stage process with explicit reflection nodes.

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict


class OverallState(TypedDict):
    """Shared state for the Deep Research agent graph.

    Attributes:
        query: The original user research question.
        search_queries: List of queries generated for web searching.
        collected_articles: Dict mapping URL to article summary content.
        knowledge_gaps: Identified gaps requiring follow-up research.
        final_answer: Synthesized research report with citations.
    """

    query: str
    search_queries: list[str]
    collected_articles: dict[str, str]
    knowledge_gaps: list[str]
    final_answer: str | None


def generate_query(state: OverallState) -> OverallState:
    """Generate initial search queries based on the research question.

    Decomposes a complex query into 3-5 targeted search strings,
    each targeting a different subtopic or angle.
    """
    # Production: call LLM to decompose query into search strategies
    return {
        "search_queries": [
            f"{state['query']} overview",
            f"{state['query']} latest research 2026",
            f"{state['query']} use cases examples",
        ],
    }


def web_research(state: OverallState) -> OverallState:
    """Execute web searches for each generated query and collect results.

    For each search query, performs a Google Search API call and
    extracts article summaries with source URLs.
    """
    collected = {}
    for query in state.get("search_queries", []):
        # Production: google_search(query=query) → list of results
        articles = [{"url": f"https://example.com/{query.replace(' ', '-')}", "summary": f"Summary for '{query}'"}]
        for article in articles:
            collected[article["url"]] = article["summary"]

    return {"collected_articles": {**state.get("collected_articles", {}), **collected}}


def reflection(state: OverallState) -> OverallState:
    """Analyze collected research and identify knowledge gaps.

    Reviews all gathered articles, cross-references them for contradictions,
    and identifies subtopics that need deeper investigation.
    """
    articles = state.get("collected_articles", {})

    # Production: LLM reviews articles and produces gap analysis
    gaps = []
    if len(articles) < 5:
        gaps.append(f"Insufficient articles found ({len(articles)}). Need more diverse sources.")

    return {"knowledge_gaps": gaps}


def evaluate_research(state: OverallState) -> str:
    """Determine whether to continue researching or finalize the answer.

    Returns "web_research" if knowledge gaps exist, "finalize_answer" otherwise.
    """
    gaps = state.get("knowledge_gaps", [])
    articles = state.get("collected_articles", {})

    # Continue searching if we have identified gaps or insufficient sources
    if gaps or len(articles) < 5:
        return "web_research"
    return "finalize_answer"


def finalize_answer(state: OverallState) -> OverallState:
    """Synthesize all collected research into a structured report with citations.

    Combines findings from all articles, resolves contradictions between sources,
    and produces a final answer directly addressing the original query.
    """
    articles = state.get("collected_articles", {})

    # Production: LLM synthesizes a coherent research report
    report_lines = [f"# Research Report: {state['query']}\n"]
    for url, summary in articles.items():
        report_lines.append(f"- {summary} [{url}]")

    return {"final_answer": "\n".join(report_lines)}


def build_deep_research_graph() -> StateGraph:
    """Construct the Deep Research LangGraph state machine.

    Graph topology:
      START → generate_query → web_research → reflection → [continue?] → finalize_answer → END
                                         ↑              ↓
                                    (loop back if gaps remain)

    Returns:
        A compiled LangGraph StateGraph for deep research execution.
    """
    builder = StateGraph(OverallState, config_schema=dict)

    builder.add_node("generate_query", generate_query)
    builder.add_node("web_research", web_research)
    builder.add_node("reflection", reflection)
    builder.add_node("finalize_answer", finalize_answer)

    # Entry point: start with query generation
    builder.add_edge(START, "generate_query")

    # Generate queries → research (with parallel branches possible)
    builder.add_conditional_edges(
        "generate_query",
        lambda s: "web_research" if s.get("search_queries") else "finalize_answer",
        {"web_research": "web_research"},
    )

    # Research → reflection (sequential for correctness)
    builder.add_edge("web_research", "reflection")

    # Reflection decides: loop back to research or finalize
    builder.add_conditional_edges(
        "reflection",
        evaluate_research,
        {"web_research": "web_research", "finalize_answer": "finalize_answer"},
    )

    # Finalize → END
    builder.add_edge("finalize_answer", END)

    return builder.compile(name="deep-research-agent")
```

---

### Pattern 8: Scaling Inference Law for Resource Allocation

The Scaling Inference Law states that an LLM's performance predictably improves with increased computational resources allocated during inference time — not training. This means a smaller model given more "thinking steps" often outperforms a larger model with minimal reasoning. Apply this law to make cost-effective decisions about model selection and thinking budget.

```python
from typing import Any


class InferenceBudget:
    """Manages computational resource allocation for reasoning tasks per the Scaling Inference Law.

    The Scaling Inference Law states: a smaller model with more inference-time compute
    often outperforms a larger model with minimal reasoning steps. This class implements
    the trade-off optimization between model size, response latency, and operational cost.
    """

    def __init__(self) -> None:
        self.max_steps: int = 10          # Maximum reasoning steps allowed
        self.max_tokens_thought: int = 2048  # Token budget for thought generation
        self.max_latency_ms: int = 30000  # Hard latency cap in milliseconds
        self.cost_per_step_usd: float = 0.001  # Cost per reasoning step

    def allocate_for_task(
        self,
        task_complexity: str,
        model_size_param: int,
    ) -> dict[str, Any]:
        """Allocate an optimal thinking budget based on task complexity and model size.

        Args:
            task_complexity: 'simple', 'moderate', 'complex', or 'very_complex'.
            model_size_param: Relative model size parameter (small=1, medium=2, large=4).

        Returns:
            Allocation dict with steps, tokens, expected_latency_ms, and estimated_cost_usd.
        """
        complexity_factors = {
            "simple": 2,
            "moderate": 5,
            "complex": 8,
            "very_complex": 10,
        }

        base_steps = complexity_factors.get(task_complexity, 3)

        # Scaling Inference Law: smaller models need MORE steps to compensate
        # A model of param=1 with 8 steps can outperform param=4 with 2 steps
        if model_size_param <= 1:
            # Small model — allocate extra thinking budget
            adjusted_steps = min(base_steps + 3, self.max_steps)
        elif model_size_param <= 2:
            # Medium model — moderate allocation
            adjusted_steps = min(base_steps + 1, self.max_steps)
        else:
            # Large model — can trust single-pass with minimal reasoning
            adjusted_steps = max(2, base_steps - 2)

        estimated_tokens = adjusted_steps * (self.max_tokens_thought // 2)
        estimated_latency_ms = adjusted_steps * 1500 + 500
        estimated_cost_usd = adjusted_steps * self.cost_per_step_usd

        return {
            "task_complexity": task_complexity,
            "model_size": model_size_param,
            "allocated_steps": adjusted_steps,
            "estimated_thought_tokens": estimated_tokens,
            "expected_latency_ms": min(estimated_latency_ms, self.max_latency_ms),
            "estimated_cost_usd": round(estimated_cost_usd, 4),
            "strategy": self._decide_strategy(model_size_param, adjusted_steps),
        }

    def _decide_strategy(
        self,
        model_size: int,
        steps_allocated: int,
    ) -> str:
        """Decide the reasoning strategy based on available resources.

        Returns the recommended technique and approach string.
        """
        if model_size >= 4 and steps_allocated <= 3:
            return "Large model + minimal reasoning → CoT (linear chain)"
        elif model_size >= 2 and steps_allocated >= 5:
            return "Medium model + substantial thinking → ToT (branching exploration)"
        elif steps_allocated >= 8:
            return "Extended inference budget → ReAct (tool-interleaved) or GoD (multi-agent)"
        else:
            return "Baseline → CoT with Self-Correction pass"
```

---

## Constraints

### MUST DO
1. **Always decompose complex problems before answering** — Never skip from a problem statement directly to a conclusion. Make the intermediate reasoning steps explicit and verifiable. Reference the code-philosophy laws: parse inputs, validate at boundaries, use early-exit guard clauses in your reasoning trace.

2. **Apply the Scaling Inference Law** — Allocate more "thinking budget" for harder problems. A smaller model with 8 reasoning steps outperforms a large model with 1 step on complex tasks. Balance model size against reasoning depth.

3. **Self-correct every output before finalizing** — Run at least one critique pass checking accuracy, completeness, clarity, and tone. Propose specific fixes, not vague critiques. Revise and deliver the improved version.

4. **Offload deterministic computation to code execution (PAL)** — For any arithmetic, data transformation, or algorithmic verification, generate executable Python code and use its output. Never trust LLMs for multi-step math.

5. **Use ReAct when external information is needed** — If the task requires current data, live API results, or user-specific context, interleave reasoning with tool calls. Capture each observation and incorporate it into subsequent thoughts.

6. **Trace all conclusions back to explicit reasoning steps** — Every final answer must be derivable from the intermediate steps shown. No "magic leaps" where the model skips from step 1 directly to step 5. This enables debugging and user trust.

7. **For GoD, evaluate argument clusters by evidence strength** — Confidence is derived from: (a) verifiable evidence items per node, (b) number of supporting arguments in the cluster, (c) absence of successful refutations, and (d) consensus across multiple independent arguments.

8. **Adopt the right technique for the task's complexity** — Simple queries get CoT or direct answers. Multi-path exploration gets ToT. Tool-dependent tasks get ReAct. Bias-critical decisions get GoD. The skill must match the problem.

### MUST NOT DO
1. **Never produce an answer without showing your work** — A conclusion without intermediate steps is unverifiable and untrustworthy. Even when using PAL, show the generated code and its output.

2. **Do not use reasoning techniques for simple queries** — Don't force CoT on "What is 2+2?" or ReAct for "Set my alarm for 7am." This wastes tokens, adds latency, and confuses users.

3. **Never skip the self-correction pass on high-stakes outputs** — Code generation, legal analysis, medical information, and financial advice must go through at least one critique-and-revise cycle before being delivered.

4. **Do not trust LLM-generated arithmetic or multi-step calculations** — Always use PAL for numerical results. A hallucinated number in a reasoning chain invalidates all downstream conclusions.

5. **Never let GoD degenerate into a linear debate chain** — If only two nodes argue back and forth, you have CoD (Chain of Debates), not GoD. Ensure the graph has branching structure with multiple argument lines that can converge or diverge independently.

6. **Do not exceed the allocated thinking budget without justification** — The Scaling Inference Law requires deliberate resource allocation. If a task needs more steps than planned, document why and assess whether the additional cost is justified by improved accuracy.

---

## Output Template

When this skill is active, structure your response as follows:

1. **Reasoning Technique Selection** — State which technique(s) you are using (CoT / ToT / ReAct / Self-Correction / GoD / PAL) and why it matches the task complexity.

2. **Explicit Reasoning Trace** — Show each intermediate step clearly labeled (Thought 1, Thought 2, etc.). For ReAct, show the complete Thought → Action → Observation cycle. For ToT, show candidate branches with scores.

3. **Self-Correction Review** — List identified discrepancies across dimensions (accuracy, completeness, clarity, tone), proposed improvements, and confirmation that revisions were applied.

4. **PAL Execution (if applicable)** — Show the generated code, its execution output, and a brief note on how the result was incorporated into the final answer.

5. **Final Answer** — The polished, comprehensive response incorporating all validated intermediate results. Include citations for GoD argument clusters or Deep Research reports.

6. **Technique Summary** — One-line summary of the reasoning process: technique used, steps taken, and key confidence indicators.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Composes multiple prompts into multi-stage pipelines that feed into each reasoning technique |
| `reflection-loop` | Implements iterative self-refinement cycles for continuous improvement in agentic workflows |
| `planning-patterns` | Designs multi-step execution plans that reasoning techniques decompose and execute upon |
| `multi-agent-collaboration` | Coordinates multiple agents working together — the organizational layer for GoD frameworks |

---

## References

1. Wei et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models."
2. Yao et al. (2023). "Tree of Thoughts: Deliberate Problem Solving with Large Language Models."
3. Gao et al. (2023). "Program-Aided Language Models."
4. Yao et al. (2023). "ReAct: Synergizing Reasoning and Acting in Language Models."
5. Inference Scaling Laws: An Empirical Analysis of Compute-Optimal Inference for LLM Problem-Solving, 2024.
6. Multi-Agent Design: Optimizing Agents with Better Prompts and Topologies, https://arxiv.org/abs/2502.02533 (MASS framework).
