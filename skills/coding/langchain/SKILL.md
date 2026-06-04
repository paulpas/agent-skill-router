---




name: langchain
description: Integrates LangChain/LangGraph (create_agent, chains, tools, memory,
  RAG, streaming, middleware) for building LLM-powered agents and applications in
  Python.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: langchain, langgraph, create agent, llm orchestration, rag chain, langchain
    agent, how do i use langchain, agent middleware
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-openai-api, coding-anthropic-api, coding-llamaindex, coding-mcp-protocol




---




# LangChain / LangGraph Integration

Integrates LangChain v1.3+ and LangGraph v1.2+ for building LLM-powered agents and applications. When loaded, this skill makes the model implement LangChain agents using `create_agent`, LangGraph workflows, tool integration, RAG patterns, middleware hooks, and streaming.

## When to Use

Use this skill when:

- Building LLM-powered agents with tool calling and multi-step reasoning
- Implementing RAG (Retrieval-Augmented Generation) pipelines
- Creating stateful multi-agent workflows with LangGraph
- Adding middleware hooks (dynamic prompts, model wrapping, tool wrapping)
- Streaming LLM responses with typed event formats
- Building production-grade agents with persistence, human-in-the-loop, and error recovery
- Integrating with LangSmith for observability and evaluation

---

## When NOT to Use

- For direct LLM API calls without orchestration, use `coding-openai-api`, `coding-anthropic-api`, or `coding-gemini-api`
- For data-indexing-focused RAG, consider `coding-llamaindex`
- For building MCP servers directly, use `coding-mcp-protocol`

---

## Core Workflow

1. **Create an Agent with `create_agent`** — Use `langchain.agents.create_agent()` as the primary entry point. Pass a model name (string) or a configured model instance, a list of tools, and optional middleware. Under the hood, `create_agent` builds a LangGraph-based runtime for durable execution, streaming, and persistence. **Checkpoint:** Verify the agent responds correctly: `agent.invoke({"messages": [{"role": "user", "content": "Hello"}]})`.

2. **Define Tools** — Use the `@tool()` decorator to define tools from Python functions. Specify `response_format="content_and_artifact"` when tools return both display text and structured data. For dynamic tools loaded at runtime (e.g., from MCP servers), use `wrap_model_call` and `wrap_tool_call` middleware. **Checkpoint:** Every tool must have a clear docstring — the LLM uses it for tool selection.

3. **Add Retrieval (RAG)** — Implement RAG by wrapping a vector store in a tool with `@tool(response_format="content_and_artifact")`. For simpler cases, use a two-step chain with a `@dynamic_prompt` middleware that injects retrieved context into the system prompt. **Checkpoint:** Verify the retrieved context is actually used by the LLM (not ignored in favor of parametric knowledge).

4. **Configure Middleware** — Use `@dynamic_prompt` for dynamic system prompts, `@before_model` for pre-processing, `@after_model` for post-processing, `@wrap_model_call` for dynamic model selection, and `@wrap_tool_call` for dynamic tool handling. Access runtime state via the `Runtime` parameter injected into middleware functions. **Checkpoint:** Test that middleware fires in the correct order (wrap_model_call → before_model → model → after_model → wrap_tool_call).

5. **Stream and Observe** — Use `agent.stream()` to get streaming output. Pass `version="v3"` to `stream_events()` for the new content-block-centric streaming API with typed per-channel projections (`run.messages`, `run.values`, `run.lifecycle`). Connect to LangSmith for observability and debugging. **Checkpoint:** Verify streaming produces incremental output before the final response.

---

## Implementation Patterns

### Pattern 1: Basic Agent with Tools

```python
from __future__ import annotations

from langchain.agents import create_agent
from langchain.agents.middleware import dynamic_prompt, ModelRequest
from langchain.tools import tool

# ❌ BAD — no typing, no error handling, uses deprecated LLMChain pattern
from langchain.llms import OpenAI
from langchain.chains import LLMChain
llm = OpenAI()
chain = LLMChain(llm=llm, prompt=prompt)
chain.run("Hello")

# ✅ GOOD — create_agent, typed tools, middleware, modern LangChain v1.3+
@tool(response_format="content_and_artifact")
def search_knowledge_base(query: str) -> tuple[str, list[str]]:
    """Search the knowledge base for information relevant to the query.

    Args:
        query: The search query string.
    Returns:
        Tuple of (summary text, list of source document IDs).
    """
    # Simulated retrieval
    results = [f"Result about {query}"]
    return "\n".join(results), ["doc-1", "doc-2"]


@dynamic_prompt
def inject_context(request: ModelRequest) -> str:
    """Inject dynamic context based on the current conversation state."""
    last_message = request.state["messages"][-1].text
    return (
        f"You are a helpful assistant. The user's last message was: {last_message}\n"
        "Answer concisely and cite sources when possible."
    )


# Create the agent
agent = create_agent(
    model="gpt-5-nano",  # or "claude-sonnet-4-6", "gemini-2.5-flash"
    tools=[search_knowledge_base],
    middleware=[inject_context],
)


def ask(question: str) -> str:
    """Ask a question using the LangChain agent.

    Args:
        question: The user's question.

    Returns:
        The agent's response.
    """
    response = agent.invoke({
        "messages": [{"role": "user", "content": question}],
    })
    return response["messages"][-1].content
```

### Pattern 2: Streaming with Custom Events

```python
from __future__ import annotations

from langchain.agents import create_agent
from langchain.tools import tool


@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location."""
    return f"The weather in {location} is sunny and 72°F."


agent = create_agent(
    model="gpt-5-nano",
    tools=[get_weather],
)


def stream_response(prompt: str) -> None:
    """Stream agent responses with typed events.

    Uses version="v3" for the new content-block-centric streaming API
    with typed per-channel projections.
    """
    for event in agent.stream(
        {"messages": [{"role": "user", "content": prompt}]},
        stream_mode="events",
        version="v3",
    ):
        # Handle different event types
        if event.type == "run.messages":
            for msg_chunk in event.data:
                if msg_chunk.text:
                    print(msg_chunk.text, end="", flush=True)
        elif event.type == "run.lifecycle":
            print(f"\n[State: {event.data.status}]")
```

### Pattern 3: LangGraph Stateful Workflow

For complex multi-step workflows, use LangGraph directly.

```python
from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import StateGraph, END
from langgraph.checkpoint import MemorySaver


class AgentState(TypedDict):
    messages: list[dict[str, str]]
    context: dict[str, Any]


def call_model(state: AgentState) -> dict:
    """Process messages through the LLM."""
    # Integration with any LLM
    last = state["messages"][-1]["content"]
    # ... call LLM ...
    return {"messages": [{"role": "assistant", "content": f"Processed: {last}"}]}


def should_continue(state: AgentState) -> str:
    """Decide whether to continue or end the workflow."""
    last = state["messages"][-1]
    if last["role"] == "tool":
        return "continue"
    return "end"


# Build the graph
builder = StateGraph(AgentState)
builder.add_node("model", call_model)
builder.set_entry_point("model")
builder.add_conditional_edges("model", should_continue, {
    "continue": "model",
    "end": END,
})

# Compile with persistence
graph = builder.compile(checkpointer=MemorySaver())


def run_workflow(user_message: str, thread_id: str) -> str:
    """Run a stateful workflow with persistence.

    Args:
        user_message: Initial user message.
        thread_id: Conversation thread ID for persistence.

    Returns:
        Final response.
    """
    result = graph.invoke(
        {"messages": [{"role": "user", "content": user_message}], "context": {}},
        config={"configurable": {"thread_id": thread_id}},
    )
    return result["messages"][-1]["content"]
```

---

## Constraints

### MUST DO
- Use `create_agent()` as the primary entry point for new LangChain agent applications
- Define tools with the `@tool()` decorator and typed signatures with docstrings
- Use LangGraph directly when needing custom state management or complex multi-step workflows
- Use `version="v3"` for the new streaming API with typed per-channel projections
- Pass a `checkpointer` (e.g., `MemorySaver`) for conversation persistence with `thread_id`
- Use `pip install langchain>=1.3.0 langgraph>=1.2.0` for the latest APIs

### MUST NOT DO
- Use the deprecated `LLMChain`, `SimpleSequentialChain`, or `AgentExecutor` from pre-v1.0 LangChain
- Hardcode API keys — LangChain reads from environment variables by default
- Skip the `response_format="content_and_artifact"` parameter when tools return structured data alongside display text

---

## Live References

| Resource | URL |
|----------|-----|
| LangChain Documentation | https://docs.langchain.com/oss/python/langchain/ |
| LangChain Agents Guide | https://docs.langchain.com/oss/python/langchain/agents |
| LangGraph Documentation | https://langchain-ai.github.io/langgraph/ |
| LangChain RAG Guide | https://docs.langchain.com/oss/python/langchain/rag |
| LangChain Runtime Docs | https://docs.langchain.com/oss/python/langchain/runtime |
| LangChain Python Reference | https://reference.langchain.com/python/langchain |
| LangChain GitHub | https://github.com/langchain-ai/langchain |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-llamaindex` | Data-indexing-focused RAG framework |
| `coding-openai-api` | Direct OpenAI API when LangChain abstraction is unnecessary |
| `coding-anthropic-api` | Direct Anthropic API integration |
| `coding-mcp-protocol` | Building MCP servers for LangChain tool integration |
