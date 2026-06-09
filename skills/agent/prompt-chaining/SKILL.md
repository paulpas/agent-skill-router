---
name: prompt-chaining
description: Implements sequential prompt chaining patterns (linear LCEL pipelines, LangGraph stateful flows, Google ADK primitives) to decompose complex reasoning into reliable multi-step agent workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: prompt chaining, sequential prompts, LCEL pipeline, LangGraph state, multi-step reasoning, chain of prompts, how do i break down complex tasks, pipeline pattern
  related-skills: framework-orchestration-routing, dispatching-parallel-agents, multi-agent-orchestration
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

# Prompt Chaining Pattern

Implements sequential prompt chaining — a divide-and-conquer strategy that breaks complex LLM tasks into focused, ordered sub-tasks where each step's output feeds the next. This skill makes the model design reliable pipelines using LangChain LCEL, LangGraph stateful graphs, and Google ADK primitives to produce accurate, debuggable multi-step agent workflows.

## TL;DR Checklist

- [ ] Decompose the task into sequential sub-tasks, each with a single focused responsibility
- [ ] Use structured output (JSON) between chain steps to prevent format drift
- [ ] Assign distinct roles at each stage for better model focus and traceability
- [ ] Validate intermediate outputs before passing them to downstream prompts
- [ ] Implement guard clauses at every boundary using `code-philosophy` principles
- [ ] Keep context windows tight — inject only what the next step needs, nothing more
- [ ] Add a final validation/review step as the last link in every chain

---

## When to Use

Use this skill when:

- A task requires multiple distinct processing stages (summarize → extract → format → validate)
- The cognitive load of a single prompt causes instruction neglect or contextual drift
- You need structured intermediate results for debugging or downstream consumption
- Building an agentic system that must plan, reason, and act across sequential steps
- Converting unstructured text into validated structured data through iterative refinement
- Composing content generation workflows (outline → draft sections → review)

---

## When NOT to Use

Avoid this skill for:

- Simple single-step tasks — a one-shot prompt is simpler and faster than a chain
- Tasks where all steps are independent — use `dispatching-parallel-agents` instead
- Latency-sensitive paths where each LLM call adds unacceptable overhead
- Queries that can be answered from a single data point without decomposition

---

## Core Workflow

1. **Decompose the Task into Focused Sub-Tasks** — Analyze the complex goal and identify natural breaking points where one operation completes before the next begins. Each sub-task should have a single, well-defined responsibility. Assign a distinct role to each step (e.g., "Market Analyst" for summarization, "Data Extractor" for field identification, "Documentation Writer" for final output). **Checkpoint:** Every sub-task must be expressible as one clear prompt instruction; if not, split further.

2. **Define Structured Contracts Between Steps** — For each transition point in the chain, specify the exact output format the producing step must return and the exact input schema the consuming step expects. Use JSON or XML schemas rather than free-text to eliminate ambiguity. Document required fields, types, and constraints. **Checkpoint:** No downstream step should need to parse or interpret unstructured text from an upstream step.

3. **Build the Chain Using Framework Primitives** — Implement the pipeline using your chosen framework. For linear sequences, use LangChain LCEL (`prompt | llm | output_parser`). For stateful flows with conditional branching, use LangGraph `StateGraph` with typed state and node transitions. For Google ADK, compose prompts into multi-step reasoning flows using built-in primitives. **Checkpoint:** The chain compiles without errors and each node has a clearly defined input/output signature.

4. **Insert Validation and Error Handling Between Steps** — Add deterministic logic between LLM calls to validate outputs, enforce format constraints, and trigger re-extraction or fallback behavior when intermediate results are malformed. Use guard clauses at every boundary to reject invalid state early. **Checkpoint:** Every step that can fail has a defined fallback: retry with a refined prompt, skip with defaults, or abort the chain.

5. **Execute the Chain with Observability** — Run the complete pipeline end-to-end, capturing timing, inputs, outputs, and errors at each stage. Log the full trace so you can replay individual steps in isolation during debugging. Use `temperature=0` for deterministic chains and reserve higher temperatures only for creative generation steps. **Checkpoint:** The chain produces a valid final output within acceptable latency for production use.

6. **Review and Refine the Output** — As the final link, run a review step that validates the complete result against quality criteria: completeness of required fields, consistency with upstream data, appropriate tone/format for the consumer. Reject results that fail validation and optionally loop back to earlier steps for re-processing. **Checkpoint:** The final output meets all acceptance criteria before being returned to the caller.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Linear Extraction Pipeline (LangChain LCEL)

A linear pipeline where raw text flows through sequential transformation stages. Each stage uses LangChain Expression Language (LCEL) to compose prompts, models, and output parsers into a single invocable chain.

```python
"""Linear prompt chaining pipeline for structured data extraction."""

import json
from typing import Any, Dict, Optional

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


def build_extraction_pipeline(
    model_name: str = "gpt-4o",
    temperature: float = 0.0,
) -> Any:
    """Builds a two-stage extraction pipeline using LCEL.

    Stage 1 extracts free-text specifications from unstructured input.
    Stage 2 transforms the extracted text into a typed JSON object.

    Args:
        model_name: OpenAI model identifier.
        temperature: Sampling temperature — use 0.0 for deterministic pipelines.

    Returns:
        An invocable LCEL chain accepting {"text_input": str} and returning a JSON string.
    """
    # Law 1 (Early Exit): Validate parameters at the boundary
    if temperature < 0.0 or temperature > 1.0:
        raise ValueError(f"temperature must be in [0.0, 1.0], got {temperature}")

    llm = ChatOpenAI(model=model_name, temperature=temperature)

    # Stage 1: Free-text extraction with role assignment
    extract_prompt = ChatPromptTemplate.from_template(
        "You are a Technical Data Extractor. "
        "Extract the specifications from the following text.\n"
        "Return each specification on its own line in the format:\n"
        "  cpu: <description>\n"
        "  memory: <description>\n"
        "  storage: <description>\n\n"
        "Text to analyze:\n{text_input}"
    )

    # Stage 2: Structured transformation into typed JSON
    transform_prompt = ChatPromptTemplate.from_template(
        "You are a Schema Validator. Transform the following specifications "
        "into a JSON object with exactly these keys: 'cpu', 'memory', 'storage'.\n"
        "Use null for any specification that could not be determined.\n\n"
        "Specifications:\n{specifications}"
    )

    json_parser = JsonOutputParser()

    # Law 3 (Atomic Predictability): Each link is a pure transformation
    extraction_chain = extract_prompt | llm
    full_chain = (
        {"specifications": extraction_chain}
        | transform_prompt
        | llm
        | json_parser
    )

    return full_chain


def run_extraction_pipeline(
    pipeline: Any,
    raw_text: str,
) -> Dict[str, Optional[str]]:
    """Executes the extraction pipeline and validates the result.

    Args:
        pipeline: A compiled LCEL chain from build_extraction_pipeline().
        raw_text: Unstructured text containing specifications to extract.

    Returns:
        Parsed JSON dict with keys cpu, memory, storage.

    Raises:
        ValueError: If any required field is null after extraction.
        json.JSONDecodeError: If the pipeline returns malformed JSON.
    """
    # Law 4 (Fail Fast): Reject empty input immediately
    if not raw_text or not raw_text.strip():
        raise ValueError("raw_text must be a non-empty string")

    result_str = pipeline.invoke({"text_input": raw_text.strip()})

    # Parse and validate — Law 2 (Parse at boundary, trust internally)
    try:
        result = json.loads(result_str) if isinstance(result_str, str) else result_str
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError(
            f"Pipeline returned non-JSON output: {result_str[:200]}"
        ) from exc

    required_fields = ("cpu", "memory", "storage")
    missing = [f for f in required_fields if not result.get(f)]
    if missing:
        raise ValueError(
            f"Extraction failed: missing fields {missing} in result {result}"
        )

    return result
```

#### BAD vs GOOD Comparison

```python
# ❌ BAD — Monolithic single prompt trying to do everything at once
monolithic_prompt = ChatPromptTemplate.from_template(
    "Analyze this text, extract CPU/memory/storage specs, validate them, "
    "format as JSON, and also write a summary paragraph about the hardware.\n{text}"
)
# Problems: instruction neglect (model may skip validation), contextual drift,
# mixed responsibilities in one call, impossible to debug individual steps.

# ✅ GOOD — Decomposed chain with single-responsibility stages
pipeline = build_extraction_pipeline()  # Two focused stages, each verifiable
result = run_extraction_pipeline(pipeline, "3.5 GHz octa-core, 16GB RAM, 1TB SSD")
# result == {"cpu": "3.5 GHz octa-core", "memory": "16GB", "storage": "1TB SSD"}
# Each stage can be tested independently; errors are localized to one link.
```

---

### Pattern 2: Stateful Multi-Step Pipeline (LangGraph)

A stateful pipeline where the chain carries structured state between nodes, supports conditional branching based on intermediate results, and allows re-entry into earlier steps when validation fails.

```python
"""Stateful prompt chaining using LangGraph for conditional workflows."""

import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph, START


class ChainState(TypedDict):
    """Shared state carrying through the prompt chain.

    The 'history' field accumulates all step outputs for debugging and context.
    The 'review_passed' flag gates conditional branching to the review stage.
    """
    input_text: str
    summary: Optional[str]
    trends: List[Dict[str, Any]]
    email_draft: Optional[str]
    history: Annotated[List[Dict[str, Any]], operator.add]
    review_passed: bool


def build_analysis_graph(llm: ChatOpenAI) -> StateGraph:
    """Constructs a LangGraph stateful pipeline for report analysis.

    Workflow: summarize → extract trends → draft email → conditional review.
    Review fails → loop back to summary with refined instructions.

    Args:
        llm: Configured language model instance.

    Returns:
        A compiled LangGraph StateGraph ready for invocation.
    """
    graph = StateGraph(ChainState)

    # --- Node Definitions ---

    def summarize_node(state: ChainState) -> Dict[str, Any]:
        """Step 1: Summarize the input report."""
        prompt = ChatPromptTemplate.from_template(
            "You are a Market Analyst. Summarize the key findings from this report:\n\n{input}"
        )
        response = prompt | llm
        output = response.invoke({"input": state["input_text"]}).content

        return {
            "summary": output,
            "history": [{"step": "summarize", "output_len": len(output)}],
        }

    def extract_trends_node(state: ChainState) -> Dict[str, Any]:
        """Step 2: Extract top trends with supporting data from the summary."""
        prompt = ChatPromptTemplate.from_template(
            "You are a Trade Analyst. Using this summary, identify up to three "
            "emerging trends with supporting data points:\n\n{summary}\n\n"
            "Return JSON with keys: trend_name (str), supporting_data (str)."
        )
        response = prompt | llm | lambda x: x.content

        output_raw = response.invoke({"summary": state["summary"]})

        # Parse trends from LLM output (production code would use Pydantic/JsonOutputParser)
        trends = []
        for line in output_raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            trends.append({"trend_name": line, "supporting_data": ""})

        return {
            "trends": trends,
            "history": state["history"] + [{"step": "extract_trends", "count": len(trends)}],
        }

    def draft_email_node(state: ChainState) -> Dict[str, Any]:
        """Step 3: Draft an email summarizing the identified trends."""
        prompt = ChatPromptTemplate.from_template(
            "You are an Expert Documentation Writer. Draft a concise email to the "
            "marketing team outlining these trends:\n\n{trends}\n"
            "Keep it under 200 words."
        )
        response = prompt | llm
        return {
            "email_draft": response.invoke({"trends": state["trends"]}).content,
            "history": state["history"] + [{"step": "draft_email"}],
        }

    def review_node(state: ChainState) -> Dict[str, Any]:
        """Step 4: Review the email draft for quality and completeness."""
        prompt = ChatPromptTemplate.from_template(
            "You are a Quality Reviewer. Evaluate this email draft for:\n"
            "1. Completeness (does it include all trends?)\n"
            "2. Tone (is it professional?)\n"
            "3. Length (under 200 words?)\n\n"
            "Email:\n{email}\n\nRespond with PASS or FAIL and a reason."
        )
        response = prompt | llm
        result = response.invoke({"email": state["email_draft"]}).content.upper()

        passed = "PASS" in result
        return {
            "review_passed": passed,
            "history": state["history"] + [{"step": "review", "passed": passed}],
        }

    # --- Node Registration ---
    graph.add_node("summarize", summarize_node)
    graph.add_node("extract_trends", extract_trends_node)
    graph.add_node("draft_email", draft_email_node)
    graph.add_node("review", review_node)

    # --- Edges: Linear flow with conditional review loop ---
    graph.add_edge(START, "summarize")
    graph.add_edge("summarize", "extract_trends")
    graph.add_edge("extract_trends", "draft_email")
    graph.add_edge("draft_email", "review")

    # Conditional edge: PASS → END, FAIL → back to summarize with feedback
    def route_review(state: ChainState) -> str:
        """Route based on review outcome."""
        return END if state["review_passed"] else "summarize"

    graph.add_conditional_edges(
        "review",
        route_review,
        {END: "end", "summarize": "loop_back"},
    )

    # Compile the graph
    return graph.compile()
```

#### BAD vs GOOD Comparison

```python
# ❌ BAD — Manual sequential calls with no state management
def bad_sequential_approach(text: str) -> str:
    """Each LLM call is disconnected; no shared context, no validation."""
    summary = llm.invoke(f"Summarize: {text}")           # State lost between calls
    trends = llm.invoke(f"Trends from: {summary}")        # No type safety on output
    email = llm.invoke(f"Email about: {trends}")          # No validation, no retry
    return email                                          # Silent failure possible

# ❌ Problems: No shared state between calls, no structured contracts,
#   impossible to re-run a single step in isolation, no feedback loop.

# ✅ GOOD — StateGraph with typed state and conditional edges
graph = build_analysis_graph(ChatOpenAI(temperature=0))
state = ChainState(
    input_text="Market research report text...",
    summary=None, trends=[], email_draft=None,
    history=[], review_passed=False,
)
final_state = graph.invoke(state)
# Each step's output is captured in typed state; review failure loops back automatically.
```

---

### Pattern 3: Google ADK Multi-Step Reasoning Flow

Google Agent Developer Kit primitives for composing prompts into multi-step reasoning flows using the `ContextualizedPrompt` and `Agent` composition model.

```python
"""Multi-step reasoning pipeline using Google ADK primitives."""

from typing import Any, Dict, List, Optional

try:
    from google.adk.agents import LlmAgent
    from google.adk.prompts import ContextualizedPrompt
except ImportError:  # Graceful degradation when ADK is not installed
    class LlmAgent:
        """Stub for environments without Google ADK."""
        def __init__(self, *args, **kwargs): pass
    ContextualizedPrompt = None


def build_adk_analysis_pipeline() -> List[LlmAgent]:
    """Constructs a Google ADK pipeline for sequential report analysis.

    Each agent is a focused step in the chain. The output of one agent
    becomes part of the context passed to the next agent.

    Returns:
        A list of LlmAgent instances representing the chain stages.
        Invoke them sequentially with intermediate results.
    """
    # Step 1: Role-assignments improve focus and traceability
    summarizer = LlmAgent(
        name="market_summarizer",
        model="gemini-2.0-flash",
        prompt=ContextualizedPrompt(
            content=(
                "You are a Market Analyst specializing in trend identification. "
                "Read the following report and produce a concise summary of key findings."
            ),
            context_sources=[],  # Will be populated at runtime with report text
        ),
    )

    extractor = LlmAgent(
        name="trend_extractor",
        model="gemini-2.0-flash",
        prompt=ContextualizedPrompt(
            content=(
                "You are a Trade Analyst. Given this summary, identify up to three "
                "emerging trends with specific supporting data points."
            ),
            context_sources=[],  # Will be populated at runtime with summary output
        ),
    )

    writer = LlmAgent(
        name="email_writer",
        model="gemini-2.0-flash",
        prompt=ContextualizedPrompt(
            content=(
                "You are an Expert Documentation Writer. Draft a professional email "
                "to the marketing team summarizing the identified trends."
            ),
            context_sources=[],  # Will be populated at runtime with trend output
        ),
    )

    return [summarizer, extractor, writer]


def run_adk_chain(agents: List[LlmAgent], report_text: str) -> Dict[str, Any]:
    """Executes the ADK pipeline sequentially, passing context between stages.

    Args:
        agents: The list of LlmAgent instances from build_adk_analysis_pipeline().
        report_text: The raw report to analyze.

    Returns:
        Dict containing summary, trends, and email_draft.

    Raises:
        ValueError: If any stage produces empty or invalid output.
    """
    if not agents:
        raise ValueError("agents list must contain at least one agent")

    # Law 1 (Early Exit): Validate input
    if not report_text or not report_text.strip():
        raise ValueError("report_text must be non-empty")

    context_accumulator = report_text
    results: Dict[str, Any] = {"raw_report": report_text}

    for i, agent in enumerate(agents):
        # Law 2 (Parse at boundary): Validate each stage's output before passing on
        if not context_accumulator or not isinstance(context_accumulator, str):
            raise ValueError(f"Stage {i}: upstream output is invalid")

        try:
            response = agent.generate_content(context_accumulator)
            stage_output = getattr(response, "text", str(response))
        except Exception as exc:
            raise RuntimeError(f"Stage {i} ({agent.name}) failed: {exc}") from exc

        if not stage_output or not stage_output.strip():
            raise ValueError(f"Stage {i} ({agent.name}) returned empty output")

        context_accumulator = stage_output

    results["final_output"] = context_accumulator
    return results
```

---

## Constraints

### MUST DO
- Decompose tasks so each step has exactly one responsibility — if a prompt does two things, split it (Law 4: Fail Fast)
- Use structured output formats (JSON schemas) at every inter-step boundary to prevent ambiguity and enable deterministic parsing (Law 2: Parse at Boundary)
- Assign distinct roles at each stage of the chain for better model focus, clearer traceability, and easier debugging
- Validate intermediate outputs with guard clauses before passing them downstream — never assume the previous step succeeded cleanly (Law 1: Early Exit)
- Use `temperature=0.0` for deterministic extraction/transformation chains; reserve higher temperatures only for creative generation steps
- Include a final validation or review step as the last link in every chain to catch upstream errors that propagated through
- Keep context windows tight — inject only what the next step needs, never dump the full conversation history into each prompt

### MUST NOT DO
- Chain together more than 6–8 LLM calls without a strong justification — each additional call multiplies latency and error risk
- Pass free-text between steps when structured data would work — this invites contextual drift and parsing ambiguity
- Skip intermediate validation "for performance" — silent errors propagate and amplify down the chain (Law 4: Fail Fast)
- Use magic numbers for retry counts or temperature values — make them configurable and documented
- Re-invoke upstream stages on failure without a clear, deterministic re-prompting strategy — this creates infinite loops
- Ignore latency budgets — if a chain exceeds acceptable response time, parallelize independent sub-tasks using `dispatching-parallel-agents`

---

## Output Template

When implementing a prompt chain, produce:

1. **Chain Blueprint** — A diagram or list showing each stage, its role, input schema, and output schema
2. **Framework Implementation** — Complete, typed code for the chosen framework (LCEL, LangGraph, or ADK)
3. **Validation Contracts** — JSON schemas or type annotations defining expected outputs at each boundary
4. **Error Handling Strategy** — Defined fallback behavior for each stage (retry, skip with defaults, abort chain)
5. **Testing Plan** — Individual step tests plus full-chain integration test with sample inputs and expected outputs

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [LangChain LCEL Documentation](https://python.langchain.com/v0.2/docs/core_modules/expression_language/)
- [LangGraph Stateful Graphs](https://langchain-ai.github.io/langgraph/)
- [Google ADK Agent Developer Kit](https://cloud.google.com/vertex-ai/generative-ai/docs/agentic-app-framework)
- [Prompt Engineering Guide — Chaining Prompts](https://www.promptingguide.ai/techniques/chaining)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-orchestration-routing` | Routes tasks across agent frameworks when chaining alone is insufficient |
| `dispatching-parallel-agents` | Parallelizes independent sub-tasks that don't have sequential dependencies |
| `multi-agent-orchestration` | Coordinates multiple specialized agents when a single chain becomes too complex |
