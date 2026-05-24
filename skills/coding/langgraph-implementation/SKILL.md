---
name: langgraph-implementation
description: Implements LangGraph stateful agent workflows including state graphs, conditional routing, checkpointing, human-in-the-loop approval, and persistence patterns for building reliable multi-step AI agent applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: langgraph, state graph, agent workflow, conditional routing, human in the loop, checkpointing, langchain graph, persistent agent, how do i build an ai agent workflow
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - high level architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: crewai-agent-workflows, autogen-conversational-patterns, framework-utilization
---

# LangGraph Implementation Patterns

Implements stateful AI agent workflows using LangGraph's declarative graph API. Builds reliable multi-step agents with explicit state machines, conditional routing, human-in-the-loop approval gates, and automatic checkpointing for replay and debugging.

## TL;DR Checklist

- [ ] Define `BaseModel`-typed state class with all fields needed across the workflow
- [ ] Register each node function with a clear signature accepting `(state: State) -> PartialState`
- [ ] Add edges between nodes using `add_edge(START, first_node)` and `add_edge(node, END)`
- [ ] Use `add_conditional_edges()` for branching logic with explicit routing functions returning string labels
- [ ] Enable checkpointing via `MemorySaver` or persistent checkpoint store for state recovery
- [ ] Add human-in-the-loop interruption point with `Command(resume=<value>)` pattern
- [ ] Run graph with `graph.invoke(initial_state, config={"configurable": {"thread_id": "..."}})`

---

## When to Use

Use this skill when:

- Building a multi-step AI agent that needs to maintain state across steps (retrieval reasoning generation)
- Implementing conditional branching based on LLM output or external tool results
- Requiring checkpoint replay capability for debugging or pausing resuming workflows
- Needing human-in-the-loop approval at specific decision points in the workflow
- Building agents that must survive process restarts with state persistence

## When NOT to Use

Avoid this skill for:

- Simple single-turn LLM calls — use `langchain` chains instead, no graph needed
- Pure parallel tool execution without state dependency — a simple `asyncio.gather` suffices
- Event-driven architectures requiring long-running async workers — use Temporal or Celery instead

---

## Core Workflow

1. **Define the State Schema** — Create a `TypedDict` or Pydantic model that captures every piece of state flowing through the graph. Use `Annotated` operators for merge strategies on fields that accumulate across nodes.

```python
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]  # Appends new messages
    context: str  # Last node write wins (default operator)
    decision: str | None  # Routing label set by reasoning node
    research_summary: str | None
```

2. **Implement Node Functions** — Each node is an async or sync function that receives the full state and returns a partial state dict. Nodes must be pure with respect to side effects (I/O goes in tools, not nodes).

```python
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from typing_extensions import TypedDict
import operator
from typing import Annotated, Sequence
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.message import add_messages

# Tool implementations
@tool
def search_web(query: str) -> str:
    """Search the web for current information."""
    return f"Results for: {query}"

@tool
def generate_report(context: str) -> str:
    """Generate a report from research context."""
    return f"Report based on: {context[:200]}..."

# Node functions
async def retriever_node(state: AgentState) -> dict:
    """Retrieve context by searching web based on user query."""
    last_message = state["messages"][-1]
    if isinstance(last_message, HumanMessage):
        query = last_message.content
        results = search_web.invoke({"query": query})
        return {"context": results.content, "messages": [AIMessage(content=f"Research: {results.content}")]}
    return {"messages": [AIMessage(content="No new input to retrieve")]}

# Conditional routing function
def route_after_retrieval(state: AgentState) -> str:
    """Decide next step based on research quality."""
    context = state.get("context", "")
    if len(context) > 50:
        return "generate"
    return "ask_followup"

# Build the graph
graph_builder = StateGraph(AgentState)
graph_builder.add_node("retriever", retriever_node)
graph_builder.add_node("generator", generate_report)
graph_builder.add_node("followup", lambda s: {"messages": [HumanMessage(content="Ask user for more info")]})

# Add edges
graph_builder.add_edge(START, "retriever")
graph_builder.add_conditional_edges(
    "retriever",
    route_after_retrieval,
    {"generate": "generator", "ask_followup": "followup"},
)
graph_builder.add_edge("generator", END)
graph_builder.add_edge("followup", END)

# Compile with checkpointing and human-in-the-loop
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
graph = graph_builder.compile(checkpointer=checkpointer)

# Execution
config = {"configurable": {"thread_id": "thread-1"}}
result = graph.invoke(
    {"messages": [HumanMessage(content="Latest AI trends")]},
    config=config,
)
```

3. **Implement Human-in-the-Loop Pattern** — Use `langgraph.types.Command` to pause execution and await human input at specific points in the workflow.

```python
from langgraph.types import Command
from typing import Literal

async def reasoning_node(state: AgentState) -> Command[Literal["approve", "revise"]]:
    """Reason about results and request human approval."""
    context = state.get("context", "")
    
    # LLM reasoning step
    reasoning = await llm.ainvoke([
        SystemMessage(content="Analyze the research and recommend a course of action."),
        HumanMessage(content=context),
    ])
    
    needs_approval = "important decision" in reasoning.content.lower() or \
                     state.get("research_summary") is None
    
    if needs_approval:
        return Command(
            goto="human_review",
            update={"decision": reasoning.content},
        )
    
    return Command(goto="generate_report", update={"decision": reasoning.content})

async def human_review_node(state: AgentState) -> dict:
    """Wait for human input and resume the graph."""
    # This node is an interruption point — execution pauses here
    # Human provides feedback via graph.invoke(resume=...)
    return {"human_feedback": "approved"}

# Add the human review edge
graph_builder.add_edge("reasoning", "human_review")
graph_builder.add_conditional_edges(
    "human_review",
    lambda state: "approve" if state.get("decision") == "important" else "revise",
    {"approve": END, "revise": "retriever"},  # Loop back to retrieve
)
```

4. **Implement Persistent Checkpointing** — For production workflows, replace `MemorySaver` with a database-backed checkpointer to survive process restarts and enable state replay.

```python
from langgraph.checkpoint.postgres import PostgresSaver
import psycopg2

conn_str = "postgresql://user:pass@localhost:5432/agents"
db_conn = psycopg2.connect(conn_str)
checkpointer = PostgresSaver(db_conn)

# Initialize tables (run once)
checkpointer.setup()

graph = graph_builder.compile(checkpointer=checkpointer)

# Save state at specific points for later replay
snapshot = checkpointer.get_tuple({"configurable": {"thread_id": "thread-1"}})
if snapshot:
    print(f"Last saved step: {snapshot.metadata}")

# Resume from a specific checkpoint
graph.invoke(None, config={"configurable": {"thread_id": "thread-1", "checkpoint_id": snapshot.checkpoint.id}})
```

## Implementation Patterns

### Pattern 1: Fan-out / Fan-in Parallel Execution

Use parallel nodes to execute independent tasks simultaneously, then merge results. LangGraph supports fan-out via multiple edges from one node and fan-in by having multiple nodes write to shared state fields with merge operators.

```python
from langgraph.graph import StateGraph, START, END
import operator

class ResearchState(TypedDict):
    queries: list[str]
    results: Annotated[dict, operator.or_]  # Merges dicts from parallel nodes
    final_report: str | None

async def research_node(state: ResearchState) -> dict:
    """Perform one piece of research."""
    idx = state.get("next_query_idx", 0)
    if idx >= len(state["queries"]):
        return {}
    query = state["queries"][idx]
    result = await search_tool.ainvoke({"query": query})
    return {f"results_{idx}": result.content, "next_query_idx": idx + 1}

async def consolidate(state: ResearchState) -> dict:
    """Merge parallel research results into a final report."""
    all_results = {k: v for k, v in state["results"].items() if v}
    prompt = "\n".join(all_results.values())
    report = await llm.ainvoke([HumanMessage(content=f"Synthesize: {prompt}")])
    return {"final_report": report.content}

graph = StateGraph(ResearchState)
graph.add_node("research", research_node)
graph.add_node("consolidate", consolidate)
graph.add_edge(START, "research")
graph.add_edge("research", "consolidate")
graph.add_edge("consolidate", END)
compiled = graph.compile()

# Run with multiple parallel queries
result = compiled.invoke({"queries": ["AI trends 2025", "LLM benchmarks", "Agent frameworks"]})
```

### Pattern 2: State Machine with Loop Detection

Implement explicit state transitions with loop detection to prevent infinite recursion when conditional edges create cycles.

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

class ApprovalState(TypedDict):
    proposal: str
    reviewer_feedback: list[str]
    revision_count: int
    approved: bool

MAX_REVISIONS = 3

async def review_node(state: ApprovalState) -> dict:
    """Simulate reviewer providing feedback."""
    if state["revision_count"] < MAX_REVISIONS:
        return {"reviewer_feedback": [f"Feedback on revision {state['revision_count']}"]}
    return {"approved": True}

async def revise_node(state: ApprovalState) -> dict:
    """Revise proposal based on feedback or accept rejection."""
    if state["revision_count"] >= MAX_REVISIONS:
        return {"approved": False}
    
    revised = f"{state['proposal']}\n\nAddressed: {state['reviewer_feedback'][-1]}"
    return {"proposal": revised, "revision_count": state["revision_count"] + 1}

graph = StateGraph(ApprovalState)
graph.add_node("review", review_node)
graph.add_node("revise", revise_node)
graph.add_edge(START, "review")
graph.add_conditional_edges(
    "review",
    lambda s: "revise" if not s["approved"] else "__end__",
    {"revise": "revise", "__end__": END},
)
# revise -> review creates a loop bounded by MAX_REVISIONS check in revise_node

compiled = graph.compile()
```

### Pattern 3: Subgraph Decomposition for Complex Workflows

Break large graphs into reusable subgraphs to keep individual graph definitions manageable and enable composition.

```python
from langgraph.graph import StateGraph, START, END

# Subgraph: Document Processing Pipeline
class DocProcessState(TypedDict):
    raw_text: str
    cleaned: str | None
    extracted_entities: list[str] | None

async def clean_text(state: DocProcessState) -> dict:
    """Remove noise and normalize text."""
    return {"cleaned": state["raw_text"].strip().replace("\r\n", "\n")}

async def extract_entities(state: DocProcessState) -> dict:
    """Extract named entities from cleaned text."""
    entities = await nlp_tool.ainvoke({"text": state["cleaned"]})
    return {"extracted_entities": entities}

doc_subgraph = StateGraph(DocProcessState)
doc_subgraph.add_node("clean", clean_text)
doc_subgraph.add_node("extract", extract_entities)
doc_subgraph.add_edge(START, "clean")
doc_subgraph.add_edge("clean", "extract")
doc_subgraph.add_edge("extract", END)
compiled_doc_subgraph = doc_subgraph.compile()

# Main Graph using the subgraph as a node
class MainState(TypedDict):
    documents: list[str]
    processed_results: list[dict] | None
    summary: str | None

async def process_documents(state: MainState) -> dict:
    """Run document processing subgraph for each document."""
    results = []
    for doc in state["documents"]:
        result = await compiled_doc_subgraph.ainvoke({"raw_text": doc})
        results.append(result)
    return {"processed_results": results}

main_graph = StateGraph(MainState)
main_graph.add_node("process", process_documents)
main_graph.add_edge(START, "process")
main_graph.add_edge("process", END)
main_app = main_graph.compile()
```

## Constraints

### MUST DO
- Always define state schema with explicit merge operators (`Annotated` with `add_messages`, `operator.add`, etc.) for fields written by multiple nodes
- Use `START` and `END` sentinel nodes — every graph must have an entry edge from `START` and exit edges to `END`
- Implement checkpointing in production workflows using database-backed checkpointer (PostgreSQL, SQLite)
- Add explicit loop termination conditions when conditional edges create cycles in the graph
- Log graph execution with `thread_id` for replay — always pass config with `"configurable": {"thread_id": "..."}`
- Name edge labels consistently and document the routing logic in docstrings for conditional edges

### MUST NOT DO
- Do NOT put LLM calls or tool invocations directly as node functions without wrapping them in proper error handling and timeout guards
- Do NOT mutate the state dict directly inside nodes — always return a new partial state dict from `invoke()` or `ainvoke()`
- Do NOT skip checkpointing in workflows that run for more than 30 seconds or involve human-in-the-loop steps
- Do NOT create cycles without explicit termination conditions — unbounded loops cause infinite execution and resource exhaustion
- Do NOT share mutable objects across threads — each graph invocation gets its own state instance, but shared checkpointer storage must be thread-safe

## Related Skills

| Skill | Purpose |
|---|---|
| `crewai-agent-workflows` | Role-based multi-agent collaboration with task delegation and autonomous tool use |
| `autogen-conversational-patterns` | Conversational multi-agent chat groups for iterative problem solving |
| `framework-utilization` | General framework adoption strategy and learning patterns applicable to any framework |

