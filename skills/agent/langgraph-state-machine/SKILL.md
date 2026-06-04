---
name: langgraph-state-machine
description: Implements LangGraph state machine architecture with typed state graphs, conditional routing, checkpoint-based persistence, and human-in-the-loop interrupt patterns for building deterministic AI agent workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: langgraph, state machine, StateGraph, checkpointing, time travel, human in the loop, durable execution, state transitions
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: tool-use-function-calling, multi-agent-orchestration, langgraph, durable-execution
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# LangGraph State Machine Architecture

Implements LangGraph's state machine pattern for building deterministic, fault-tolerant AI agent workflows. This skill teaches how to define typed state schemas, wire nodes and conditional edges, configure checkpointers for durable execution, and implement human-in-the-loop interrupts — the core primitives of LangGraph 1.x+ that turn ad-hoc LLM chains into production-grade orchestrators.

## TL;DR Checklist

- [ ] Define a `TypedDict` or Pydantic state schema with all fields that flow between nodes
- [ ] Use reducer functions (`operator.add`) for any accumulator fields (messages, logs)
- [ ] Register nodes with `add_node()` before wiring edges
- [ ] Set entry point with `set_entry_point()` and exit with `END`
- [ ] Configure a checkpointer (MemorySaver or SqliteSaver) when persistence is required
- [ ] Add conditional edges for branching logic based on state values
- [ ] Implement interrupt points using `interrupt()` for human review gates

---

## When to Use

Use this skill when:

- Building AI agent workflows that require deterministic control flow (branching, loops, retries)
- You need checkpoint-based durability so a crashed workflow can resume from its last node
- Your agents require human-in-the-loop approval at specific decision points
- You are replacing a fragile chain of sequential LLM calls with a state machine
- You need time-travel debugging — rewinding to any previous checkpoint to inspect or replay state

## When NOT to Use

Avoid this skill for:

- Simple one-shot LLM calls with no branching logic — use LangChain's `ChatPromptTemplate` instead
- Real-time inference paths where checkpointer overhead is unacceptable (in-memory only, no persistence)
- Pure streaming chat interfaces that don't need stateful workflows (use FastAPI + SSE directly)

---

## Core Workflow

### 1. Define the Typed State Schema

Every LangGraph workflow starts with a state schema. Use `TypedDict` for simplicity or Pydantic models for validation. Fields can be plain values or reducers for accumulating data across nodes.

```python
from typing import TypedDict, Annotated, Sequence, Literal
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage


class AgentState(TypedDict):
    """Shared state flowing through all graph nodes."""

    # Accumulator: each node appends messages; reducer merges them
    messages: Annotated[Sequence[BaseMessage], operator.add]

    # Branch decision field — read by conditional edges
    next_step: Literal["tools", "reviewer", "finish"]

    # Plain scalar fields updated by individual nodes
    tool_results: dict[str, str]
    confidence: float
    requires_human_review: bool
```

**Checkpoint:** The `messages` field uses `operator.add` as a reducer — this is how LangGraph accumulates conversation history across all nodes. Without a reducer, each node would overwrite the entire state.

### 2. Define Nodes as Pure Functions

Each node is a function that receives the current state and returns an updated state delta (partial dict). Keep nodes pure — no side effects beyond returning new state values.

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import TypedDict


class PlanningState(TypedDict):
    task_description: str
    plan: str
    steps_completed: list[str]
    messages: Annotated[list[dict], operator.add]


def planner_node(state: PlanningState) -> dict:
    """LLM generates a structured execution plan from the task description.

    Args:
        state: Contains the raw task_description.

    Returns:
        Partial state update with 'plan' and initial 'messages'.
    """
    # Pure function: read from state, return delta only
    system_prompt = (
        "You are an expert planner. Break the given task into numbered, "
        "executable steps. Return ONLY a JSON array of step descriptions."
    )

    response = llm.generate([  # noqa: F821 — assumes LLM client bound in scope
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Task: {state['task_description']}"),
    ])

    plan_text = response.content.strip()

    return {
        "plan": plan_text,
        "messages": [AIMessage(content=f"Plan generated:\n{plan_text}")],
        "steps_completed": [],  # Initialize empty list
    }


def tool_execution_node(state: PlanningState) -> dict:
    """Execute the planned steps using available tools.

    Args:
        state: Contains 'plan' with steps to execute and current messages.

    Returns:
        Partial state update with execution results appended to messages.
    """
    # Parse plan into individual steps (in production, use structured output)
    lines = [l.strip() for l in state["plan"].split("\n") if l.strip()]

    executed_steps: list[str] = []
    results: list[str] = []

    for step_idx, step_desc in enumerate(lines[:5], 1):  # Max 5 steps
        tool_result = execute_tool(step_desc)  # noqa: F821 — tool executor bound in scope
        results.append(f"Step {step_idx}: {tool_result}")
        executed_steps.append(step_desc)

    return {
        "steps_completed": executed_steps,
        "messages": [AIMessage(content="Execution complete.\n" + "\n".join(results))],
    }


def execute_tool(description: str) -> str:
    """Simulated tool execution — in production, call actual tools here."""
    # Placeholder for web_search, code_interpreter, file_read, etc.
    return f"Result of executing: {description}"
```

**Checkpoint:** Nodes must be pure functions. They read from `state` and return a delta dict — never modify global state or mutate the input state object.

### 3. Wire the Graph with Nodes and Edges

Connect nodes using directed edges. Conditional edges use a routing function to decide which node to visit next based on current state.

```python
from langgraph.graph import StateGraph, END, START


def route_after_execution(state: PlanningState) -> Literal["finish", "reviewer"]:
    """Route to reviewer if the plan had more than 3 steps, otherwise finish."""
    if len(state["steps_completed"]) > 3:
        return "reviewer"
    return "finish"


# Build the graph
workflow = StateGraph(PlanningState)

# Register nodes
workflow.add_node("planner", planner_node)
workflow.add_node("executor", tool_execution_node)
workflow.add_node("reviewer", lambda s: {"messages": [AIMessage(content="Review passed")], "steps_completed": list(s["steps_completed"])})

# Wire edges: START → planner (entry point)
workflow.set_entry_point("planner")

# Edge from planner to executor (always execute after planning)
workflow.add_edge("planner", "executor")

# Conditional edge from executor → finish or reviewer
workflow.add_conditional_edges(
    "executor",
    route_after_execution,
    {
        "finish": END,
        "reviewer": "reviewer",
    },
)

# Reviewer → END (terminal state)
workflow.add_edge("reviewer", END)

# Compile the graph into an executable app
app = workflow.compile()
```

**Checkpoint:** The graph must have exactly one entry point (`set_entry_point`) and edges that can reach `END` from every node. An unreachable node is a bug; a node with no outgoing edges (except to END or conditional) causes deadlocks.

### 4. Add Checkpointing for Durable Execution

Enable persistence by passing a checkpointer during compilation. This allows interrupt/resume, time-travel debugging, and crash recovery.

```python
from langgraph.checkpoint.memory import MemorySaver


def build_graph_with_persistence() -> StateGraph:
    """Build the same graph but with in-memory checkpointing.

    In production, replace MemorySaver with SqliteSaver or PostgresSaver
    for durable persistence across process restarts.
    """
    workflow = StateGraph(PlanningState)
    workflow.add_node("planner", planner_node)
    workflow.add_node("executor", tool_execution_node)
    workflow.add_node("reviewer", lambda s: {"messages": [AIMessage(content="Review passed")], "steps_completed": list(s["steps_completed"])})

    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "executor")
    workflow.add_conditional_edges("executor", route_after_execution, {"finish": END, "reviewer": "reviewer"})
    workflow.add_edge("reviewer", END)

    # Checkpointer enables: time-travel, interrupts, crash recovery
    checkpointer = MemorySaver()
    compiled = workflow.compile(checkpointer=checkpointer)

    return compiled


# Usage with thread-safe checkpointing
def run_workflow(task_description: str) -> dict:
    """Execute the workflow with a dedicated thread ID for isolated state."""
    app = build_graph_with_persistence()

    config = {
        "configurable": {
            "thread_id": "session-001",  # Isolates state per user session
        }
    }

    result = app.invoke(
        {"task_description": task_description, "messages": []},
        config=config,
    )

    return {
        "plan": result["plan"],
        "steps_completed": result["steps_completed"],
        "final_messages": [m.content for m in result["messages"]],
    }
```

### 5. Implement Human-in-the-Loop Interrupts

LangGraph's `interrupt()` function pauses graph execution at a specified node, returning control to the caller. The human can review state, provide input, and resume execution from the interrupt point — not from the beginning.

```python
from langgraph.types import interrupt


def human_review_node(state: PlanningState) -> dict:
    """Pause for human approval before proceeding to final output.

    This node is where a human reviewer inspects results and either
    approves (resume) or requests changes (rewind).

    Args:
        state: Full workflow state including execution results.

    Returns:
        State delta with human feedback incorporated.
    """
    # Interrupt — pauses graph, returns control to caller
    approval = interrupt(
        {
            "type": "human_approval",
            "context": {
                "plan": state["plan"],
                "steps_completed": state["steps_completed"],
                "last_messages": [m.content for m in state["messages"][-3:]],
            },
            "options": ["approve", "revise", "reject"],
        }
    )

    # After human responds, continue with their decision
    if approval["action"] == "approve":
        return {
            "messages": [AIMessage(content="Approved by human reviewer.")],
        }
    elif approval["action"] == "revise":
        # Return a delta that tells the graph to re-execute executor
        state["next_step"] = "executor"
        return {"requires_human_review": True}
    else:  # reject
        return {
            "messages": [AIMessage(content="Task rejected by human reviewer.")],
        }


# Wiring the interrupt node
workflow.add_node("human_review", human_review_node)
workflow.add_edge("executor", "human_review")
workflow.add_conditional_edges(
    "human_review",
    lambda s: END,  # Always ends after review — revise is handled by a loop back to executor
    {"review": "human_review"},
)
```

**Checkpoint:** `interrupt()` returns synchronously with the human's response. The graph does NOT resume automatically — your calling code must invoke `app.invoke()` again with the updated thread config to continue from the interrupt point.

### 6. Time-Travel Debugging

With checkpointing enabled, you can retrieve any past state snapshot and re-invoke the graph from that checkpoint — effectively rewinding time for debugging or A/B comparison.

```python
import json


def debug_workflow(task_description: str) -> dict:
    """Run workflow with full checkpoint history for debugging."""
    app = build_graph_with_persistence()

    config = {"configurable": {"thread_id": "debug-001"}}

    # First run — generates all checkpoints
    initial_result = app.invoke(
        {"task_description": task_description, "messages": []},
        config=config,
    )

    # Retrieve checkpoint history
    from langgraph.checkpoint.base import get_checkpoint_id

    checkpoint_history = list(app.list_checkpoints(config))

    # Re-invoke from a specific past checkpoint (time travel)
    if len(checkpoint_history) >= 2:
        previous_config = {
            "configurable": {
                "thread_id": "debug-001",
                "checkpoint_id": checkpoint_history[-2]["id"],
            }
        }

        # Replay from the second-to-last checkpoint with modified input
        replay_result = app.invoke(
            {"task_description": task_description + " [REPLAY]", "messages": []},
            config=previous_config,
        )

        return {
            "initial": {"plan": initial_result["plan"]},
            "replay": {"plan": replay_result["plan"]},
            "checkpoint_count": len(checkpoint_history),
        }

    return {"plan": initial_result["plan"], "checkpoint_count": len(checkpoint_history)}


# Dump checkpoint state for inspection
def inspect_checkpoint(app: StateGraph, thread_id: str) -> str:
    """Print human-readable state at each checkpoint in a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    checkpoints = list(app.list_checkpoints(config))

    output_lines = [f"=== Checkpoint History for {thread_id} ({len(checkpoints)} total) ==="]

    for i, cp in enumerate(checkpoints):
        state = app.get_state(cp["config"])
        if hasattr(state, "values"):
            vals = state.values  # type: ignore
        else:
            vals = state

        output_lines.append(f"\n--- Checkpoint {i + 1} ---")
        output_lines.append(f"  plan: {vals.get('plan', 'N/A')[:80]}...")
        output_lines.append(f"  steps_completed: {len(vals.get('steps_completed', []))}")
        msg_count = len(vals.get("messages", []))
        output_lines.append(f"  messages: {msg_count} entries")

    return "\n".join(output_lines)
```

---

## Implementation Patterns

### Pattern 1: Subgraph Composition (Nested Graphs)

LangGraph supports subgraphs — individual graphs that run as nodes within a parent graph. This enables modular multi-agent architectures where each agent is its own state machine.

```python
from langgraph.graph import StateGraph, START, END


class ResearcherState(TypedDict):
    query: str
    sources: list[str]
    summary: str


def search_node(state: ResearcherState) -> dict:
    """Perform web search and extract source URLs."""
    results = perform_web_search(state["query"])  # noqa: F821
    return {
        "sources": [r["url"] for r in results[:5]],
        "summary": f"Found {len(results)} sources for '{state['query']}'.",
    }


def research_subgraph() -> StateGraph:
    """Build a subgraph for the Researcher agent."""
    workflow = StateGraph(ResearcherState)

    workflow.add_node("search", search_node)
    workflow.set_entry_point("search")
    workflow.add_edge("search", END)

    return workflow.compile()


# In parent graph, use the subgraph as a regular node:
# parent_workflow.add_node("researcher", research_subgraph())
```

**Checkpoint:** Subgraphs must have their own entry point and exit to END. They receive the parent's state fields that match their schema — mismatched fields are silently dropped.

### Pattern 2: Conditional Retry with State-Based Routing

Implement automatic retry logic by routing back to a previous node when certain conditions are detected in the state.

```python
def quality_check_node(state: AgentState) -> dict:
    """Evaluate output quality and route based on confidence score.

    If confidence < 0.5, routes back to the tool execution node for retry.
    If confidence >= 0.5 but < 0.8, sends to human review.
    If confidence >= 0.8, finishes successfully.
    """
    # In production, use an LLM-based quality evaluator
    confidence = evaluate_output_quality(state["messages"][-1].content)

    return {
        "confidence": confidence,
        "next_step": (
            "finish" if confidence >= 0.8
            else ("reviewer" if confidence >= 0.5 else "executor")
        ),
    }


def route_after_quality_check(state: AgentState) -> Literal["finish", "reviewer", "executor"]:
    """Conditional routing based on quality confidence."""
    return state["next_step"]


# Wire the retry loop into the parent graph
workflow.add_node("quality_check", quality_check_node)
workflow.add_conditional_edges(
    "quality_check",
    route_after_quality_check,
    {
        "finish": END,       # High confidence → done
        "reviewer": "reviewer",   # Medium → human review
        "executor": "executor",   # Low → retry execution
    },
)
```

**Checkpoint:** The retry edge (`"executor" → executor`) creates a cycle in the graph. Ensure you have a maximum iteration limit or confidence threshold to prevent infinite loops.

### Pattern 3: Streaming Output with Event-Based Processing

LangGraph supports streaming node outputs incrementally, which is essential for long-running workflows where users want to see progress in real-time.

```python
from typing import AsyncIterator


async def stream_workflow(task_description: str) -> AsyncIterator[dict]:
    """Execute the workflow and yield state snapshots as each node completes."""
    app = build_graph_with_persistence()

    config = {"configurable": {"thread_id": "stream-001"}}

    # astream_events provides granular, event-based streaming
    async for event in app.astream_events(
        {"task_description": task_description, "messages": []},
        config=config,
        version="v2",
    ):
        kind = event["event"]
        data = event.get("data", {})

        if kind == "on_chain_start" and "name" in event:
            yield {
                "type": "node_start",
                "node": event["name"],
                "info": data.get("input", {}),
            }
        elif kind == "on_chat_model_stream":
            # Stream LLM token output incrementally
            yield {
                "type": "llm_token",
                "content": data["chunk"].content if hasattr(data["chunk"], "content") else str(data["chunk"]),
            }
        elif kind == "on_chain_end" and "name" in event:
            yield {
                "type": "node_complete",
                "node": event["name"],
            }

        # Handle interrupt events for human-in-the-loop
        elif kind == "on_intervention":
            intervention = data.get("interrupts", [])
            if intervention:
                yield {
                    "type": "human_interrupt",
                    "context": intervention[0],
                }
```

---

## Constraints

### MUST DO

- **Define a typed state schema** — Use `TypedDict` with explicit fields. Never pass raw dicts without a documented schema between nodes. This is the single most important pattern in LangGraph.
- **Use reducers for accumulator fields** — Any field that multiple nodes need to append to (messages, logs, errors) must use an annotation like `Annotated[list, operator.add]`. Without this, later nodes overwrite earlier data.
- **Make illegal states unrepresentable** — Use `Literal` types for branching fields (`next_step: Literal["tools", "reviewer", "finish"]`). The type system prevents invalid routing decisions at compile time.
- **Set max recursion steps** — Always configure `"recursion_limit"` in the config to prevent infinite loops from conditional edges that cycle back to previous nodes. Default is 25.
- **Thread-isolate checkpoints** — Each concurrent user session must use a unique `thread_id`. Sharing thread IDs between sessions causes state corruption.

### MUST NOT DO

- **Never mutate the input state dict in nodes** — Nodes return a delta; LangGraph merges deltas. Mutating `state["messages"]` directly inside a node is undefined behavior.
- **Never skip the checkpointer when implementing human-in-the-loop** — Without checkpointing, interrupts cannot resume from where they left off. The graph will restart from the beginning.
- **Never use unbounded recursive conditional edges** — A cycle of conditional edges without a terminating condition causes infinite loops. Always have a confidence threshold or max retry count.
- **Never call `app.invoke()` from multiple threads with the same thread_id** — Checkpoint state is not thread-safe across concurrent invocations to the same thread. Use one thread_id per independent execution.

---

## TL;DR for Code Generation

- State schema = `TypedDict` with explicit fields and reducers for accumulators
- Nodes = pure functions: `state -> dict(delta)` — no side effects, no mutation
- Edges = directed connections; conditional edges use routing functions returning `Literal["node_name", END]`
- Checkpointer = `MemorySaver()` for dev, `SqliteSaver("checkpoints.db")` for production
- Interrupt = `interrupt({...})` in a node function — pauses execution, returns human response
- Time travel = `app.list_checkpoints(config)` → pick checkpoint_id → `app.invoke(..., config={...checkpoint_id: ...})`
- Recursion limit = set `"recursion_limit": 50` in config to prevent infinite loops

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Tool calling patterns used by nodes within LangGraph state machines |
| `multi-agent-orchestration` | Supervisor-worker and group chat patterns that can be implemented as subgraphs |
| `durable-execution` | General durable execution patterns applicable beyond LangGraph (temporal, trigger.dev) |
| `langgraph` | LangGraph orchestration routing skill for skill selection within workflows |

## Live References

> Authoritative documentation links for LangGraph. The model follows markdown links at load time to resolve external references and inline content.

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph State Machines Tutorial](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)
- [Checkpointing & Persistence](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [Human-in-the-Loop Patterns](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)
- [Subgraphs (Nested Graphs)](https://langchain-ai.github.io/langgraph/concepts/multi_agent/#subgraphs)
