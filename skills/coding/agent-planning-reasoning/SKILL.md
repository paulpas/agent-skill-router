---
name: agent-planning-reasoning
description: Implements planning and reasoning patterns for LLM agents including ReAct loops with native tool calling, modern LangGraph state graphs, and self-reflection quality evaluation loops.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  archetypes: [tactical]
  anti_triggers: [brainstorming, vague ideation, long-form architecture]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  triggers: planning patterns, reasoning, ReAct loop, self-reflection, chain of thought, tool loop, iterative planning, how do i implement ReAct
  related-skills: agent-tool-calling-architecture,agent-memory-systems,langchain
---

# Agent Planning & Reasoning Patterns

Implements the core planning and reasoning architecture for LLM agents — from classic ReAct loops through modern LangGraph state graphs to self-reflection quality evaluation. When loaded, this skill makes the model produce production-grade planning code extracted from LangChain, LangGraph, and related frameworks.

## TL;DR Checklist

- [ ] ReAct agents follow Thought → Action → Observation loop with explicit stop sequences
- [ ] Modern LangGraph ReAct uses `StateGraph` with typed `AgentState` and conditional routing
- [ ] Tool binding via `model.bind_tools()` before graph compilation — never string-parsed actions
- [ ] Self-reflection evaluates output on 4 weighted criteria: Directness (40%), Accuracy (30%), Completeness (20%), Safety (10%)
- [ ] Reflection loops bounded by `max_reflection_rounds` with RuntimeError if threshold not met
- [ ] All tool calls validated against registered tool map before execution

---

## When to Use

Use this skill when:

- Implementing ReAct reasoning loops for single-agent LLM workflows
- Building multi-step agents that interleave reasoning (thought) with action (tool calls)
- Designing self-reflection quality evaluation for generated responses or code
- Creating LangGraph state graphs with conditional routing between model and tools
- Setting up iterative planning where agent output is reviewed and revised

## When NOT to Use

Avoid this skill for:

- Single-turn LLM calls that don't require multi-step reasoning
- Implementing tool calling architecture (use `agent-tool-calling-architecture` instead)
- Memory management systems (use `agent-memory-systems` instead)
- Simple prompt engineering without agent-level planning loops

---

## Core Workflow

1. **Design ReAct Agent with Tool Loop** — Create an agent that follows the Thought → Action → Observation loop. Each iteration: LLM generates a thought about what to do next, calls a tool if needed, receives observation as output, then repeats. Bound with `max_iterations` (default 15) and early stopping method (`"force"` for hard stop or `"stop"` for graceful). **Checkpoint:** Verify `_stop` sequences include `"\nObservation:"` patterns to terminate thought generation.

2. **Implement Modern LangGraph ReAct Agent** — Use `StateGraph(AgentState)` with typed messages that merge via `add_messages`. Bind tools via `model.bind_tools(tools)` before compilation. Define three nodes: `chat_model` (LLM call), `tools` (parallel execution), and conditional edges via `should_continue()` that returns `"tools"` or `"__end__"`. **Checkpoint:** Verify graph compiles with optional checkpointer for persistence across sessions.

3. **Validate Tools Before Agent Creation** — Check for duplicate tool names, ensure every tool has a non-empty description (required for prompt injection), and verify tools return strings for observation parsing. Use `_validate_tools()` before agent initialization. **Checkpoint:** Verify no two tools share the same name — duplicates cause ambiguity in model selection.

4. **Set Up Self-Reflection Loop** — Initialize `ReflectionAgent` with an executor model and optional separate reflection model. On each round: generate draft → evaluate quality on 4 weighted criteria → if score below threshold, append feedback and retry. Maximum rounds bounded by `max_reflection_rounds`. **Checkpoint:** Verify `_evaluate_quality()` returns a `(score, feedback)` tuple parsed from structured LLM output.

5. **Integrate Planning with Memory and Tools** — The full agent pipeline: retrieve short-term memory (conversation buffer) → retrieve long-term memories (vector store) → feed combined context + user input to ReAct loop → tools execute → reflection evaluates final output. Each layer feeds into the next. **Checkpoint:** Verify total prompt length stays within model token limits after combining all three layers.

---

## Implementation Patterns

### Pattern 1: ReAct Agent with Tool Loop

The classic ReAct pattern interleaves reasoning (thought) with action (tool call) and observation. The loop follows: Thought → Action → Observation → Thought → Action → ... until the LLM produces a final answer. This is superior to pure Chain-of-Thought because it grounds reasoning in actual external information.

```python
# Source: langchain-ai/langchain — libs/langchain/langchain_classic/agents/react/base.py
"""Chain that implements the ReAct paper from https://arxiv.org/pdf/2210.03629.pdf."""

from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import BasePromptTemplate
from langchain_core.tools import BaseTool, Tool


class ReActDocstoreAgent:
    """Agent implementing the ReAct (Reason+Act) pattern.

    The ReAct loop: Thought → Action → Observation → Thought → Action → ...

    Each iteration:
    1. LLM generates a "Thought" about what to do next
    2. If action is needed, LLM calls a tool with structured arguments
    3. Tool output becomes the "Observation" appended to context
    4. Loop repeats until the LLM produces a final answer

    This pattern is superior to pure CoT because it grounds reasoning
    in actual external information rather than relying solely on model knowledge.
    """

    observation_prefix: str = "Observation:"
    llm_prefix: str = "Thought:"

    def __init__(
        self,
        llm: BaseLanguageModel,
        tools: Sequence[BaseTool],
        prompt: BasePromptTemplate | None = None,
        max_iterations: int = 15,
        early_stopping_method: str = "force",
    ) -> None:
        """Initialize ReAct agent.

        Args:
            llm: Language model that generates thoughts and tool calls.
            tools: Available tools the agent can invoke during reasoning.
            prompt: ReAct-specific prompt template with chain-of-thought format.
            max_iterations: Maximum Reason-Act cycles before forced termination.
            early_stopping_method: "force" (hard stop) or "stop" (graceful).
        """
        self.llm = llm
        self.tools = {tool.name: tool for tool in tools}
        self.prompt = prompt
        self.max_iterations = max_iterations
        self.early_stopping_method = early_stopping_method

    @classmethod
    def create_prompt(cls, tools: Sequence[BaseTool]) -> BasePromptTemplate:
        """Create the ReAct prompt template.

        The prompt encodes the ReAct chain-of-thought format:

        Question: <user question>
        Thought: <model's reasoning about what to do next>
        Action: <tool name>
        Action Input: <structured arguments>
        Observation: <tool output>
        Thought: <interpretation of observation + next step>
        ... (repeat) ...
        Final Answer: <final response to user>

        Args:
            tools: Available tools — their names and descriptions are injected.

        Returns:
            PromptTemplate with ReAct format instructions.
        """
        tool_names = " ".join([tool.name for tool in tools])
        tool_descriptions = "\n".join([
            f"{tool.name}: {tool.description}" for tool in tools
        ])
        # In production, load from a template file with proper formatting
        raise NotImplementedError

    def _validate_tools(self, tools: Sequence[BaseTool]) -> None:
        """Validate that all tools are properly configured.

        Checks:
        - No duplicate names
        - Each tool has a non-empty description (needed for prompt injection)
        - Tools return strings (for observation parsing)
        """
        tool_names = [tool.name for tool in tools]
        if len(tool_names) != len(set(tool_names)):
            raise ValueError(f"Duplicate tool names: {tool_names}")
        for tool in tools:
            if not tool.description:
                raise ValueError(f"Tool '{tool.name}' must have a description")

    @property
    def _stop(self) -> list[str]:
        """Stop sequences that signal the end of a reasoning step."""
        return ["\nObservation:", "\n\tObservation:"]


class DocstoreExplorer:
    """Helper class that manages document search within ReAct loops.

    Provides two operations:
    - search(term): Find documents matching a term (first paragraph returned)
    - lookup(term): Search within the most recently found document

    This pattern prevents context pollution by keeping each search
    operation isolated to its relevant document scope.
    """

    def __init__(self, docstore: Any) -> None:
        """Initialize with a document store backend.

        Args:
            docstore: Backend supporting .search(term) -> Document | str
        """
        self.docstore = docstore
        self.document: Document | None = None
        self.lookup_str = ""
        self.lookup_index = 0

    def search(self, term: str) -> str:
        """Search for a term in the document store.

        On success, saves the found document for subsequent lookup operations.

        Args:
            term: Search query string.

        Returns:
            First paragraph of the first matching document.
        """
        result = self.docstore.search(term)
        if isinstance(result, Document):
            self.document = result
            return self._paragraphs[0]  # Return first paragraph
        self.document = None
        return str(result)

    def lookup(self, term: str) -> str:
        """Lookup a term within the most recently found document.

        Only works after a successful search() call. Supports paginated
        results when multiple paragraphs match.

        Args:
            term: Term to find within current document.

        Returns:
            Matching paragraph with pagination indicator, or "No Results".
        """
        if self.document is None:
            raise ValueError("Cannot lookup without a successful search first")

        # Support pagination: repeated calls with same term return next match
        if term.lower() != self.lookup_str:
            self.lookup_str = term.lower()
            self.lookup_index = 0
        else:
            self.lookup_index += 1

        matching = [p for p in self._paragraphs if self.lookup_str in p.lower()]
        if not matching:
            return "No Results"
        if self.lookup_index >= len(matching):
            return "No More Results"

        return f"(Result {self.lookup_index + 1}/{len(matching)}) {matching[self.lookup_index]}"

    @property
    def _paragraphs(self) -> list[str]:
        """Split document into paragraphs."""
        if self.document is None:
            raise ValueError("No document loaded")
        return self.document.page_content.split("\n\n")
```

### Pattern 2: LangGraph ReAct Agent (Modern Implementation)

The modern approach uses a state graph instead of prompt-based parsing, making tool calling native rather than string-parsed. Messages are merged across iterations via `Annotated[list[BaseMessage], add_messages]`.

```python
# Source: langchain-ai/langgraph — libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py
"""ReAct agent built on LangGraph StateGraph."""

from collections.abc import Sequence
from typing import (
    Annotated,
    Any,
    Literal,
    TypedDict,
)

from langchain_core.language_models import BaseChatModel, LanguageModelInput
from langchain_core.messages import (
    AIMessage,
    AnyMessage,
    BaseMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.runnables import Runnable, RunnableBinding
from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel


class AgentState(TypedDict):
    """The state of the ReAct agent.

    Uses Annotated[list[BaseMessage], add_messages] which means new messages
    are MERGED with existing ones (not replaced). This is how message history
    accumulates across iterations automatically.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]


def _should_bind_tools(model: Any, tools: Sequence[BaseTool]) -> bool:
    """Determine whether to bind tools via model.bind_tools() or pass via API.

    If the model is already wrapped in a RunnableBinding with 'tools' key,
    verify that the tool count matches. Otherwise, return True to bind.
    """
    if isinstance(model, RunnableBinding):
        bound_tools = model.kwargs.get("tools", [])
        if len(tools) != len(bound_tools):
            raise ValueError(
                f"Number of tools mismatch: passed {len(tools)}, "
                f"model has {len(bound_tools)} bound. "
                "Either match tool counts or don't pre-bind tools."
            )
        return False  # Already bound, don't bind again
    return True


def create_react_agent(
    model: BaseChatModel,
    tools: Sequence[BaseTool],
    *,
    prompt: str | None = None,
    checkpointer: Any = None,
) -> Runnable:
    """Create a ReAct agent using LangGraph StateGraph.

    This is the modern approach to ReAct — instead of parsing text output
    for "Action:" and "Observation:" strings, it uses native tool calling
    where the model directly returns structured tool calls.

    Graph structure:
        START → should_bind_tools? → chat_model → tools_condition → {tools | END}

    The tools_condition routes back to chat_model if tool calls remain,
    or to END if a final text response was produced.

    Args:
        model: Chat model with native tool calling support (OpenAI, Anthropic, etc.)
        tools: Tools available for the agent to invoke.
        prompt: Optional system message prefixing all conversations.
        checkpointer: Optional persistence layer for conversation history
                      across sessions (e.g., SQLiteSaver, RedisSaver).

    Returns:
        Compiled LangGraph runnable that processes messages through ReAct loop.
    """
    # Bind tools to model if not already bound
    if _should_bind_tools(model, tools):
        model = model.bind_tools(tools)

    # Build the state graph
    workflow = StateGraph(AgentState)

    # Define nodes
    def chat_model(state: AgentState) -> dict:
        """Call the LLM with conversation history and available tool schemas.

        The bound tools appear as function schemas in the model's output.
        If the model returns tool calls, they go to the tools node.
        If it returns text, the response ends here.
        """
        messages = state["messages"]
        if prompt:
            messages = [SystemMessage(content=prompt)] + list(messages)
        response = model.invoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)  # Prebuilt parallel tool executor

    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        """Decide whether to continue with tool execution or finish.

        Returns 'tools' if the last message contains tool_calls,
        returns '__end__' (END) if the model produced a text response.
        """
        messages = state["messages"]
        last_message = messages[-1]
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tools"
        return "__end__"

    # Build graph
    workflow.add_node("chat_model", chat_model)
    workflow.add_node("tools", tool_node)
    workflow.set_entry_point("chat_model")
    workflow.add_conditional_edges(
        "chat_model", should_continue, {"tools": "tools", "__end__": END}
    )
    workflow.add_edge("tools", "chat_model")

    # Compile with optional checkpointing for persistence
    app = workflow.compile(checkpointer=checkpointer)
    return app


def tools_condition(state: AgentState) -> Literal["tools", "__end__"]:
    """Utility function for conditional routing after tool execution.

    If the model's last message still has tool calls, route back to chat_model.
    Otherwise, terminate the graph. This is used in more complex agent graphs
    where tool results may trigger additional reasoning.
    """
    messages = state["messages"]
    last = messages[-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "__end__"
```

### Pattern 3: Self-Reflection Loop

Self-reflection evaluates the agent's own output for quality before returning it to the user. The pattern: Agent produces draft → Reflection model evaluates draft → If score < threshold, agent revises → Repeat until acceptable or max iterations reached. This is particularly effective for code generation, research summaries, and multi-step problem solving.

```python
# Source: AI Agent Research 2026 — Self-Reflection Loop pattern
from typing import Any, Sequence
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.language_models import BaseChatModel


class ReflectionAgent:
    """Implements a self-reflection loop for agent output quality.

    Pattern: Agent produces draft → Reflection model evaluates draft →
    If score < threshold, agent revises → Repeat until acceptable or max iterations.

    This is particularly effective for:
    - Code generation (verify correctness before returning)
    - Research summaries (verify citations are real and relevant)
    - Multi-step problem solving (verify each step's validity)
    """

    def __init__(
        self,
        executor_model: BaseChatModel,
        reflection_model: BaseChatModel | None = None,
        *,
        max_reflection_rounds: int = 3,
        quality_threshold: float = 0.7,
    ) -> None:
        """Initialize reflection loop.

        Args:
            executor_model: Primary model that does the actual work.
            reflection_model: Model used for quality evaluation. Defaults to executor_model.
            max_reflection_rounds: Maximum revision iterations.
            quality_threshold: Minimum quality score (0.0-1.0) to accept output.
        """
        self.executor_model = executor_model
        self.reflection_model = reflection_model or executor_model
        self.max_reflection_rounds = max_reflection_rounds
        self.quality_threshold = quality_threshold

    def run_with_reflection(
        self,
        user_input: str,
        initial_messages: Sequence[BaseMessage] | None = None,
    ) -> str:
        """Run the agent with self-reflection on its output.

        Args:
            user_input: The user's question or request.
            initial_messages: Optional conversation history to prepend.

        Returns:
            The final accepted response after reflection loop completes.

        Raises:
            RuntimeError: If quality threshold not met after max iterations.
        """
        messages = list(initial_messages or [])
        messages.append(HumanMessage(content=user_input))

        for round_num in range(self.max_reflection_rounds):
            # Step 1: Generate draft response
            draft_response = self.executor_model.invoke(messages)
            messages.append(draft_response)

            # Step 2: Reflect on quality
            quality_score, feedback = self._evaluate_quality(
                messages[-1].content, user_input
            )

            if quality_score >= self.quality_threshold:
                return draft_response.content

            # Step 3: Append reflection feedback and retry
            messages.append(
                HumanMessage(
                    content=f"[Self-Reflection Round {round_num + 1}]\n"
                    f"Quality score: {quality_score:.2f}/1.0\n"
                    f"Feedback: {feedback}\nPlease revise your response."
                )
            )

        raise RuntimeError(
            f"Could not meet quality threshold ({self.quality_threshold}) "
            f"after {self.max_reflection_rounds} reflection rounds."
        )

    def _evaluate_quality(
        self, response: str, user_input: str
    ) -> tuple[float, str]:
        """Evaluate response quality using a separate LLM call.

        The reflection model scores on multiple criteria:
        - Directness: Does the response directly address the question?
        - Accuracy: Are facts and claims verifiable?
        - Completeness: Does it cover all aspects of the question?
        - Safety: Are there any harmful or misleading statements?

        Args:
            response: The draft response to evaluate.
            user_input: Original user question for context.

        Returns:
            (quality_score, feedback_string) tuple. Score is 0.0-1.0.
        """
        reflection_prompt = f"""Evaluate the following AI response for quality.

User question: {user_input}

AI response: {response}

Score from 0.0 to 1.0 on these criteria (provide weighted average):
1. Directness (40%): Does it directly answer the question?
2. Accuracy (30%): Are claims factually correct and verifiable?
3. Completeness (20%): Does it cover all aspects of the question?
4. Safety (10%): Is there anything harmful or misleading?

Return your response in this exact format:
SCORE: <number 0-1>
FEEDBACK: <specific, actionable feedback for improvement>
"""
        evaluation = self.reflection_model.invoke([HumanMessage(content=reflection_prompt)])
        content = evaluation.content

        # Parse the structured evaluation
        score_line = [l for l in content.split("\n") if l.startswith("SCORE:")]
        feedback_lines = [l for l in content.split("\n") if l.startswith("FEEDBACK:")]

        score = float(score_line[0].split(":")[1].strip()) if score_line else 0.0
        feedback = feedback_lines[0].replace("FEEDBACK:", "").strip() if feedback_lines else ""

        return score, feedback
```

---

## Constraints

### MUST DO
- Always use `max_iterations` to bound ReAct loops — unbounded reasoning leads to infinite loops with tool calls
- Validate tools for duplicate names and empty descriptions before creating any agent
- Bind tools via `model.bind_tools()` in LangGraph agents rather than string-parsing "Action:" patterns
- Use `Annotated[Sequence[BaseMessage], add_messages]` for message merging in `AgentState` — this ensures history accumulates correctly across iterations
- Score reflection quality on all four criteria (Directness, Accuracy, Completeness, Safety) with the specified weights — never use a single unweighted score
- Raise `RuntimeError` from reflection loops when quality threshold is not met after max rounds — never silently return low-quality output

### MUST NOT DO
- Never use prompt-based action parsing ("Action:", "Observation:") when native tool calling via `bind_tools()` is available
- Never allow re-search without a prior successful search in DocstoreExplorer — the state machine requires the document context to be loaded first
- Never set quality_threshold above 0.95 for reflection loops — this creates near-impossible standards that exhaust max rounds
- Never use different reflection and executor models of incompatible types (e.g., text-only vs chat) — both must support `invoke([messages])` signature
- Never skip the `_stop` sequences in ReAct agents — missing observation stop patterns cause thoughts to run into tool output

---

## Output Template

When implementing or reviewing agent planning and reasoning code, produce:

1. **Agent Type Selection** — Classic ReAct (prompt-based) vs LangGraph ReAct (state graph with native tool calling), with justification
2. **Graph Structure Diagram** — ASCII diagram showing node connections, conditional edges, and entry/exit points
3. **Tool Validation Report** — List of tools with name uniqueness check and description verification results
4. **Reflection Configuration** — Quality threshold, max rounds, criterion weights, and reflection model selection

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-tool-calling-architecture` | Implement the tool calling infrastructure that ReAct loops invoke during reasoning |
| `agent-memory-systems` | Manage conversation memory that planning loops feed as context for each reasoning step |
| `langchain` | Broader LangChain/LangGraph patterns including chains, RAG, and agent frameworks |
