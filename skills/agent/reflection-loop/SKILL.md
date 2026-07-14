---
name: reflection-loop
description: Implements self-correction feedback loops (execution → evaluation/critique → refinement) to iteratively improve agent outputs through producer-critic collaboration and automated quality gates.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: reflection, self-correction, critic agent, feedback loop, producer-critic, quality gate, how do i improve agent output, iterative refinement
  related-skills: prompt-chaining, agentic-evaluation, self-critique-engine, tool-use-function-calling
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-pass generation
    - low-stakes content
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Reflection Loop Pattern

Implements self-correction feedback loops where an agent evaluates its own output or a separate critic agent reviews it against criteria, then refines the result iteratively until quality thresholds are met or maximum iterations are reached. This skill makes the model construct Producer-Critic collaboration architectures that catch errors, improve accuracy, and produce higher-quality outputs than single-pass generation.

## TL;DR Checklist

- [ ] Define clear evaluation criteria before starting the loop
- [ ] Separate producer (generation) and critic (evaluation) into distinct roles or prompts
- [ ] Maintain conversation history across iterations for context preservation
- [ ] Set termination conditions: max iterations AND/OR quality threshold
- [ ] Parse all inputs at boundaries; trust validated state internally (code-philosophy Law 2)
- [ ] Fail fast with descriptive errors on invalid intermediate states (code-philosophy Law 4)
- [ ] Log each iteration's critique and refinement for auditability

---

## When to Use

Use this skill when:

- **Code generation requires accuracy checks** — an agent writes functions, classes, or scripts that need correctness verification before deployment
- **Content quality matters more than speed** — blog posts, documentation, marketing copy where polished output is worth the extra LLM calls
- **Multi-step reasoning needs error correction** — logic puzzles, architecture plans, or strategy documents where intermediate steps can introduce contradictions
- **Summarization demands completeness** — long document summaries that must capture all key points without hallucination
- **Debugging complex code** — an agent proposes fixes but needs a reviewer to verify they don't introduce regressions
- **Conversational coherence across turns** — chatbots or assistants that must review prior responses against updated context

## When NOT to Use

Avoid this skill for:

- **Real-time / latency-sensitive tasks** — the extra LLM calls per iteration add 2×–3× latency; not suitable for interactive real-time systems
- **Simple one-shot generation** — generating a greeting, formatting a table, or answering straightforward factual questions does not need reflection overhead
- **Low-stakes content** — internal notes, quick drafts, or throwaway outputs where perfection is unnecessary cost
- **Already deterministic pipelines** — if the output can be validated with code-level checks (unit tests, linters), prefer those over expensive LLM critiques

---

## Core Workflow

1. **Initialize the producer prompt and evaluation criteria** — Define the original task for the Producer agent and establish explicit quality criteria the Critic will use. Criteria must cover: factual accuracy, adherence to requirements, code correctness (if applicable), style/tone, and completeness. **Checkpoint:** Verify that evaluation criteria are specific, measurable, and cover all non-negotiable requirements from the original task before proceeding.

2. **Execute — Producer generates initial output** — Invoke the Producer agent with the task prompt. On first iteration, this produces raw content; on subsequent iterations, the Producer receives both its prior output and the Critic's feedback to refine. Maintain a running message history that includes: the original task, every produced version, and every critique. **Checkpoint:** Confirm the Producer produced syntactically valid output (for code: no syntax errors from the parser; for text: non-empty content). If invalid, halt and report the error rather than feeding broken output into critique.

3. **Evaluate — Critic reviews against criteria** — Invoke the Critic agent with a separate system prompt that establishes a distinct persona (e.g., "senior software engineer," "meticulous fact-checker"). Feed the Critic both the original task and the current Producer output. Require structured feedback: a list of specific issues, severity levels (critical/major/minor), and actionable improvement suggestions. The Critic must also be able to signal completion with a sentinel phrase (e.g., `CODE_IS_PERFECT`, `APPROVED`). **Checkpoint:** Validate that the Critic's response is parseable — contains either the sentinel phrase for approval or a structured list of critiques. If unparseable, treat as "needs refinement" and retry.

4. **Decide — Apply termination conditions** — Check whether the loop should continue or terminate: (a) If Critic returned the approval sentinel → terminate successfully. (b) If max iterations reached → terminate with current best output but log a warning that quality threshold was not met. (c) Otherwise → continue to refinement. **Checkpoint:** Log the termination reason explicitly: "approved at iteration N" or "max iterations (N) reached without approval."

5. **Refine — Producer incorporates feedback** — If continuing, append the Critic's structured feedback to message history and instruct the Producer to apply all critiques. The Producer must acknowledge which issues were fixed and note any it intentionally chose not to address (with justification). **Checkpoint:** Verify the refined output differs from the prior version in ways that address the Critic's specific points. If no meaningful changes occurred, increment a stall counter and terminate if it exceeds 2 consecutive stalls.

6. **Iterate or deliver** — Return to step 3 with the updated message history. Repeat until one of the termination conditions triggers. On delivery, output both the final version and a summary of all critiques received across iterations. **Checkpoint:** Before returning results, confirm the final output passes at least all critical-severity critiques. If any critical issues remain unaddressed, flag them in the delivery summary for human review.

---

## Implementation Patterns / Reference Guide

### Pattern 1: LangChain LCEL Reflection Loop (Code Generation)

This is the canonical implementation using LangChain Expression Language. It iteratively generates and refines a Python function through Producer-Critic collaboration with conversation history management.

```python
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY not found in .env file.")

llm = ChatOpenAI(model="gpt-4o", temperature=0.1)


def run_reflection_loop(
    task_prompt: str,
    max_iterations: int = 3,
    approval_sentinel: str = "CODE_IS_PERFECT"
) -> dict:
    """
    Execute a Producer-Critic reflection loop to iteratively improve code.

    Args:
        task_prompt: The original task description for the Producer agent.
        max_iterations: Maximum number of generate-critique-refine cycles.
        approval_sentinel: Phrase the Critic returns when output meets all criteria.

    Returns:
        dict with keys 'final_code', 'iterations', 'critiques', and 'termination_reason'.
    """
    message_history: list = [HumanMessage(content=task_prompt)]
    critiques_log: list[str] = []
    final_output: str = ""

    for i in range(max_iterations):
        iteration_num = i + 1

        # --- Stage 1: Producer generates or refines ---
        if i == 0:
            response = llm.invoke(message_history)
        else:
            message_history.append(
                HumanMessage(content="Please refine the code using the critiques provided.")
            )
            response = llm.invoke(message_history)

        final_output = response.content
        message_history.append(response)  # Preserve conversation history

        # --- Stage 2: Critic evaluates ---
        reflector_prompt = [
            SystemMessage(content="""\
You are a senior software engineer and an expert in Python.
Your role is to perform a meticulous code review.
Critically evaluate the provided code based on the original task requirements.
Look for bugs, style issues, missing edge cases, and areas for improvement.
If the code is perfect and meets all requirements, respond with the single phrase 'CODE_IS_PERFECT'.
Otherwise, provide a bulleted list of your critiques with severity levels.\
"""),
            HumanMessage(content=f"Original Task:\n{task_prompt}\n\nCode to Review:\n{final_output}")
        ]
        critique_response = llm.invoke(reflector_prompt)
        critique = critique_response.content

        # --- Stage 3: Evaluate termination condition ---
        if approval_sentinel in critique:
            critiques_log.append(critique)
            return {
                "final_code": final_output,
                "iterations": iteration_num,
                "critiques": critiques_log,
                "termination_reason": f"approved at iteration {iteration_num}"
            }

        critiques_log.append(critique)
        message_history.append(
            HumanMessage(content=f"Critique of the previous code:\n{critique}")
        )

    # Max iterations reached without approval
    return {
        "final_code": final_output,
        "iterations": max_iterations,
        "critiques": critiques_log,
        "termination_reason": f"max iterations ({max_iterations}) reached without approval"
    }


# Example usage:
task = """\
Create a Python function named calculate_factorial.
1. Accept a single integer `n` as input.
2. Calculate its factorial (n!).
3. Include a clear docstring explaining what the function does.
4. Handle edge cases: factorial of 0 is 1.
5. Raise ValueError if n is negative.\
"""

result = run_reflection_loop(task, max_iterations=3)
print(f"Final code after {result['iterations']} iterations:\n{result['final_code']}")
```

### Pattern 2: Google ADK Sequential Agent Pipeline

Google's Agent Development Kit provides a structured approach using `SequentialAgent` and `LlmAgent`. This pattern separates generation and review into distinct agent instances with typed state management.

```python
from google.adk.agents import SequentialAgent, LlmAgent


def build_review_pipeline() -> SequentialAgent:
    """
    Build a Producer-Critic pipeline using Google ADK agents.

    Returns:
        A SequentialAgent that generates content then evaluates it.
    """
    # Producer agent: generates initial draft
    generator = LlmAgent(
        name="DraftWriter",
        description="Generates initial draft content on a given subject.",
        instruction="Write a short, informative paragraph about the user's subject. "
                    "Be factual, well-structured, and cite any specific claims.",
        output_key="draft_text"
    )

    # Critic agent: evaluates the draft for accuracy and completeness
    reviewer = LlmAgent(
        name="FactChecker",
        description="Reviews a given text for factual accuracy and provides structured critique.",
        instruction="""\
You are a meticulous fact-checker.
1. Read the text provided in the state key 'draft_text'.
2. Carefully verify the factual accuracy of all claims.
3. Your final output must be a dictionary containing two keys:
   - "status": A string, either "ACCURATE" or "INACCURATE".
   - "reasoning": A string explaining your status, citing specific issues if found.\
""",
        output_key="review_output"
    )

    # Sequential execution ensures generator runs before reviewer
    review_pipeline = SequentialAgent(
        name="WriteAndReview_Pipeline",
        sub_agents=[generator, reviewer]
    )
    return review_pipeline


def execute_reflection_cycle(pipeline: SequentialAgent, subject: str) -> dict:
    """
    Run a single reflection cycle through the ADK pipeline.

    Args:
        pipeline: The configured SequentialAgent pipeline.
        subject: The topic for the producer to write about.

    Returns:
        dict with 'draft_text' and 'review_output' from the pipeline state.
    """
    # Run the pipeline with the subject as input
    result = pipeline.run(user_content=subject)

    draft = result.get("draft_text", "")
    review = result.get("review_output", {})

    return {
        "draft_text": draft,
        "status": review.get("status"),
        "reasoning": review.get("reasoning")
    }


# Usage:
pipeline = build_review_pipeline()
cycle_result = execute_reflection_cycle(pipeline, "The impact of quantum computing on cryptography")

if cycle_result["status"] == "INACCURATE":
    # Feed critique back to a new producer for refinement
    print(f"Needs revision: {cycle_result['reasoning']}")
else:
    print(f"Approved draft:\n{cycle_result['draft_text']}")
```

### BAD vs GOOD: Critic Prompt Design

The quality of the entire reflection loop depends on how well the Critic is prompted. A weak critic produces unactionable feedback that causes the Producer to stall.

```python
# ❌ BAD — Vague critic prompt produces useless critiques
bad_critic_prompt = """\
Review this code and give feedback.\
"""

# The producer receives: "Consider improving your code."
# No specificity → no refinement → infinite stalls.


# ✅ GOOD — Structured critic prompt with explicit criteria
good_critic_prompt = [
    SystemMessage(content="""\
You are a senior Python engineer performing a code review.
Evaluate the code against these criteria:
1. CORRECTNESS: Does the code produce correct results for all specified inputs?
2. EDGE CASES: Are edge cases (empty input, zero, negative numbers) handled?
3. ERROR HANDLING: Are invalid inputs rejected with clear exceptions?
4. DOCSTRING: Is there a docstring explaining purpose, parameters, and return value?
5. TYPE HINTS: Do function signatures include type annotations?

For each criterion, respond with either:
- PASS: <reason>
- FAIL: <specific issue> <suggested fix>

If all criteria pass, respond with the single phrase: CODE_IS_PERFECT\
"""),
    HumanMessage(content="Review this code:\n{code}")
]

# The producer receives actionable, criterion-specific feedback.
# Each FAIL includes a suggested fix → meaningful refinement every iteration.
```

### BAD vs GOOD: Termination Logic

Improper termination either wastes tokens on unnecessary iterations or accepts substandard output.

```python
# ❌ BAD — No termination condition; infinite loop risk
for i in range(100):  # Arbitrary large number, no quality gate
    code = producer(message_history)
    critique = critic(code)
    message_history.append(critique)
    if "perfect" in critique.lower():  # Loose string match on lowercase
        break  # May never trigger due to case mismatch

# ✅ GOOD — Explicit termination with dual conditions and stall detection
def run_safe_reflection(
    task: str,
    max_iterations: int = 5,
    approval_sentinel: str = "CODE_IS_PERFECT",
    stall_threshold: int = 2
) -> dict:
    """Reflection loop with robust termination logic."""
    message_history = [HumanMessage(content=task)]
    critique_count = 0
    consecutive_stalls = 0

    for i in range(max_iterations):
        # Producer generates
        code = _produce(message_history) if i == 0 else _refine(message_history)
        message_history.append(HumanMessage(content=code))

        # Critic evaluates
        critique = _critique(task, code)
        message_history.append(HumanMessage(content=f"Critique:\n{critique}"))

        # Check approval
        if approval_sentinel in critique:
            return {"output": code, "iterations": i + 1, "reason": "approved"}

        # Detect stalls — no meaningful change between iterations
        if critique_count > 0 and code == _last_code:
            consecutive_stalls += 1
        else:
            consecutive_stalls = 0

        if consecutive_stalls >= stall_threshold:
            return {
                "output": code,
                "iterations": i + 1,
                "reason": f"stalled after {consecutive_stalls} identical iterations"
            }

        critique_count += 1
        _last_code = code

    return {"output": code, "iterations": max_iterations, "reason": "max iterations"}
```

---

## Constraints

### MUST DO

- **Separate concerns**: Use distinct system prompts or separate agents for Producer and Critic. Never have the same prompt both generate and evaluate — cognitive bias produces missed errors (Chapter 4 principle).
- **Define evaluation criteria upfront**: Before the first iteration, specify what the Critic will check. Criteria must be measurable and cover all non-negotiable requirements. Reference `code-philosophy` Law 2 (Parse Don't Validate) by parsing critique responses into structured formats.
- **Maintain conversation history**: Every iteration builds on prior context. Append task prompt, produced code/text, and critiques to the message history. Without memory, each reflection is a self-contained event with no cumulative improvement (Chapter 4 insight).
- **Set dual termination conditions**: Always combine max iterations with a quality threshold (approval sentinel phrase). Max iterations alone wastes tokens on diminishing returns; quality threshold alone risks infinite loops if the Critic never converges on approval.
- **Log every iteration**: Record the critique, the refinement decision, and the termination reason. This enables post-hoc analysis of loop effectiveness and helps tune `max_iterations` per task type.
- **Parse Critic output**: Validate that critiques are structured (bulleted list or sentinel phrase). Unparseable critiques should be treated as "needs refinement" rather than halting the entire loop — fail fast on invalid states but don't assume failure.
- **Reference code-philosophy in implementations**: Apply Law 1 (Early Exit) by checking termination conditions before each iteration, and Law 4 (Fail Fast) by rejecting malformed Critic responses immediately.

### MUST NOT DO

- **Run reflection without a max iteration cap**: Every loop must have an upper bound. Unbounded reflection risks context window overflow, API rate limits, and infinite loops on tasks the model cannot self-correct.
- **Use a single agent for both roles with the same prompt**: The same system prompt will evaluate its own work with the same biases it used to generate it. At minimum, use two different prompts; preferably two separate agents or LLM calls.
- **Accept a Critic response of "looks good" without structured criteria**: Vague approval provides no signal and masks unaddressed issues. The Critic must explicitly state what passes and what fails against defined criteria.
- **Skip conversation history management**: Discarding prior iterations loses cumulative improvement context. Each refinement should see the full lineage: task → v1 critique → v2 critique → ... → current version.
- **Ignore stall detection**: If the Producer's output stops changing between iterations, continue iterating is wasteful. Detect and halt on consecutive identical outputs to avoid token waste.
- **Run reflection for every LLM call indiscriminately**: Reflection has measurable cost — each iteration adds 2× LLM calls (one produce, one critique). Use judgment: skip it for simple tasks where single-pass output quality is sufficient.

---

## Output Template

When executing a reflection loop, structure your output as follows:

```
=== REFLECTION LOOP RESULT ===

Final Output:
{the last produced code or text}

Iterations: {N}
Termination Reason: {approved at iteration N | max iterations reached | stalled}

Critique Summary:
  Iteration 1: {severity} - {key issue found} → {how it was addressed}
  Iteration 2: {severity} - {key issue found} → {how it was addressed}
  ...

Remaining Issues (if any):
  - {issue} [CRITICAL/MAJOR/MINOR] — flagged for human review
```

For code generation specifically, include a diff-style note showing what changed between the last two versions to verify the Producer actually addressed the Critic's feedback.

---

## Trade-offs and Considerations

### Cost vs. Quality Trade-off

Each reflection iteration adds approximately 2× the LLM cost of a single pass (one generate call + one critique call). For high-stakes outputs, this cost is justified. For low-stakes content, the overhead outweighs the benefit. Use these guidelines:

| Output Type | Recommended Iterations | Acceptable Without Reflection? |
|---|---|---|
| Production code | 2–4 | No — always reflect on code that touches business logic |
| Documentation | 1–3 | Sometimes — for internal docs, single pass may suffice |
| Marketing copy | 2–5 | Rarely — quality directly impacts user perception |
| Quick drafts / notes | 0 | Yes — reflection overhead is not justified |

### Latency Impact

Reflection loops add linear latency proportional to the number of iterations. Each iteration requires two LLM calls plus token processing for the expanded conversation history. For interactive applications, consider:

- Using a lower `max_iterations` (2–3) in production to bound latency
- Running reflection asynchronously with a "generate now, refine later" pattern
- Pre-computing critiques for known-good patterns and caching results

### Context Window Management

With each iteration, conversation history grows by roughly the size of the output plus the critique. For long outputs (full source files, lengthy documents), this can exhaust context windows after just a few iterations. Mitigate by:

- Using a rolling window that keeps only the original task + latest output + latest critique
- Summarizing older critiques rather than preserving full text
- Switching to a stateful graph framework (LangGraph) for complex multi-agent workflows

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Sequential task execution — reflection loops are a specialized form of chained prompting with conditional branching |
| `agentic-evaluation` | Quality assessment criteria definition — use this skill to establish the evaluation metrics that feed into your Critic prompt |
| `self-critique-engine` | Alternative self-reflection approach — when you need a single agent performing self-review rather than producer-critic separation |
| `tool-use-function-calling` | External validation — combine reflection with tool calls (linters, compilers) for hybrid code verification that reduces LLM-only critique cost |

---

## References

1. Training Language Models to Self-Correct via Reinforcement Learning — https://arxiv.org/abs/2409.12917
2. LangChain Expression Language (LCEL) Documentation — https://python.langchain.com/docs/introduction/
3. LangGraph Documentation — https://www.langchain.com/langgraph
4. Google Agent Developer Kit (ADK) Documentation — https://google.github.io/adk-docs/agents/multi-agents/
