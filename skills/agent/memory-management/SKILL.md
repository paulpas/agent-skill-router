---
name: memory-management
description: Manages agent memory across short-term (conversation buffers), long-term (vector stores, persistent databases), and procedural (learned patterns) layers to maintain stateful context across extended agent interactions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical, generation
  anti_triggers: brainstorming, vague ideation, long-form architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  triggers: memory management, conversation buffer, long-term memory, vector store, context persistence, how do i maintain agent state, BaseStore, SessionService
  related-skills: prompt-chaining, rag-patterns, learning-adaptation
---

# Memory Management Pattern

Manages agent memory across three layers — short-term (conversation buffers), long-term (vector stores and persistent databases), and procedural (learned patterns) — so that agents maintain coherent stateful context across extended, multi-turn interactions. This skill makes the model design, implement, and validate memory systems using Google ADK (SessionService, MemoryService), LangChain/LangGraph (ConversationBufferMemory, BaseStore), and managed services like Vertex AI Memory Bank.

## TL;DR Checklist

- [ ] Choose short-term store: `InMemorySessionService` for dev/testing, `DatabaseSessionService` or `VertexAiSessionService` for production
- [ ] Design state key hierarchy using prefixes (`user:`, `app:`, `temp:`) and update via `EventActions.state_delta` or `output_key` — never mutate `session.state` directly
- [ ] Wire long-term memory: `InMemoryMemoryService` for dev, `VertexAiRagMemoryService` for production with a Vertex AI RAG Corpus
- [ ] Implement procedural memory reflection node using `BaseStore` to update agent instructions from conversation history
- [ ] For managed persistence, initialize `VertexAiMemoryBankService` and call `add_session_to_memory()` after each session
- [ ] Validate all state changes are recorded in the event timeline and persisted correctly under the selected storage backend
- [ ] Ensure namespace organization follows `(user_id, application_context)` pattern for LangGraph BaseStore retrieval

---

## When to Use

Use this skill when:

- Building an agent that must maintain conversation coherence across multiple turns (chatbots, task-oriented agents)
- Designing state management for multi-step workflows where progress tracking is required between interactions
- Implementing personalization by storing and retrieving user preferences, past behaviors, or domain-specific knowledge
- Enabling agents to learn from past interactions through reflection-based procedural memory updates
- Integrating Retrieval Augmented Generation (RAG) as the agent's long-term knowledge base
- Architecting production-grade agent systems requiring persistent sessions across application restarts

---

## When NOT to Use

Avoid this skill for:

- Stateless, one-shot question answering where no history retention is needed — a simple prompt-response loop suffices
- High-throughput request processing where memory overhead per session exceeds available context windows without careful pruning
- Scenarios where all required data fits comfortably within a single LLM call's context window and no cross-session continuity matters
- Simple configuration lookups that do not evolve or accumulate knowledge over time — use a config service instead

---

## Core Workflow

1. **Select the Short-Term Memory Backend** — Choose `InMemorySessionService` for local development and testing, `DatabaseSessionService` with a configured `db_url` (e.g., SQLite or PostgreSQL) for production requiring persistent session storage, or `VertexAiSessionService` on Google Cloud Platform leveraging Vertex AI infrastructure. Initialize the service before creating any sessions. **Checkpoint:** Verify the chosen service's persistence guarantees match your deployment requirements — in-memory services lose all data on restart.

2. **Design the State Key Hierarchy** — Define a naming convention for session state keys using ADK prefixes: `user:` for data scoped to a specific user across all sessions, `app:` for application-wide shared data, and `temp:` for turn-scoped data that is not persistently stored. Organize keys with clear names reflecting their purpose (e.g., `user:login_count`, `task_status`, `temp:validation_needed`). Avoid deep nesting — use flat key-value pairs with basic serializable Python types. **Checkpoint:** Confirm every state key has an appropriate prefix and its value type is a string, number, boolean, list, or dictionary of these basics.

3. **Implement State Updates Through Proper Channels** — Use the `output_key` parameter on `LlmAgent` for saving final text responses into state (simplest approach), or build `EventActions.state_delta` dictionaries within tools for complex multi-key updates targeting specific scopes. Always call `session_service.append_event()` after modifying state to ensure changes are recorded in the event timeline and persisted by the backend. **Checkpoint:** Every state modification must flow through the runner's event append mechanism — no direct dictionary mutation should occur outside a tool or event action.

4. **Wire Long-Term Memory for Cross-Session Knowledge** — Initialize `InMemoryMemoryService` for testing, or deploy `VertexAiRagMemoryService` configured with a Vertex AI RAG Corpus resource name and retrieval parameters (`similarity_top_k`, `vector_distance_threshold`) for production. Use the service's `add_session_to_memory()` to persist session content and `search_memory()` to retrieve relevant past information during agent inference. **Checkpoint:** Validate that `search_memory()` returns semantically relevant results within the configured distance threshold before routing them into the agent's prompt context.

5. **Implement Procedural Memory via Reflection** — Create a LangGraph node that retrieves current instructions from `BaseStore`, invokes an LLM to reflect on conversation history, and saves refined instructions back to the store under a dedicated namespace like `("agent_instructions",)`. The call-model node then fetches these updated instructions before generating responses. **Checkpoint:** After each reflection cycle, verify the stored instructions contain actionable refinements rather than redundant or degraded versions of the original prompt.

6. **Deploy Managed Memory Bank (Optional Production Path)** — Initialize `VertexAiMemoryBankService` with project, location, and agent engine ID. After each session completes, call `add_session_to_memory(session)` so Gemini models asynchronously extract key facts and user preferences. Memories are tagged with `USER_ID` and `APP_NAME` for accurate retrieval, and stored in a scope-organized persistent store that resolves contradictions automatically. **Checkpoint:** Confirm the Memory Bank is retrieving consolidated memories during new sessions and that user-specific data isolation holds across different `user_id` values.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Google ADK Session with Prefix-Based State Management

Use this pattern when building stateful conversational agents that need to track per-user, per-app, and turn-scoped data within a single chat thread. The key insight is that session state operates as a dictionary where prefixes define scope and persistence semantics.

```python
from google.adk.sessions import DatabaseSessionService, Session
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.genai.types import Content, Part


def create_production_session_service(db_url: str) -> DatabaseSessionService:
    """Create a persistent session service backed by a managed database.

    Args:
        db_url: Database connection string (e.g., 'postgresql://user:pass@host/db').

    Returns:
        Configured DatabaseSessionService instance.
    """
    return DatabaseSessionService(db_url=db_url)


def log_user_login(state: dict, user_id: str, login_count: int) -> dict:
    """Update session state upon a user login event using prefix-scoped keys.

    This tool encapsulates all state changes related to a user login,
    keeping logic co-located with the action it represents.

    Args:
        state: Current session state dictionary provided by ToolContext.
        user_id: Identifier for the logging-in user.
        login_count: Current login count from state or default of 0.

    Returns:
        Dict confirming success with updated login metadata.
    """
    new_count = login_count + 1
    state["user:login_count"] = new_count
    state["user:last_login_ts"] = __import__("time").time()
    state["task_status"] = "active"
    state["temp:validation_needed"] = True

    return {
        "status": "success",
        "message": f"User login tracked. Total logins: {new_count}.",
    }


def run_stateful_agent(
    db_url: str,
    app_name: str,
    user_id: str,
    session_id: str,
) -> dict:
    """End-to-end flow creating a persistent session and running an agent.

    Args:
        db_url: Database URL for the SessionService backend.
        app_name: Application identifier for routing sessions.
        user_id: Unique user identifier.
        session_id: Unique session thread identifier.

    Returns:
        The final session state after agent processing.
    """
    session_service = create_production_session_service(db_url)
    greeting_agent = LlmAgent(
        name="Greeter",
        model="gemini-2.0-flash",
        instruction="Generate a short, friendly greeting.",
        output_key="last_greeting",
    )

    runner = Runner(
        agent=greeting_agent,
        app_name=app_name,
        session_service=session_service,
    )

    session = session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
        state={"user:login_count": 0, "task_status": "idle"},
    )

    user_message = Content(parts=[Part(text="Hello")])

    for event in runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=user_message,
    ):
        if event.is_final_response():
            break

    updated_session: Session = session_service.get_session(
        app_name, user_id, session_id
    )
    return updated_session.state
```

**BAD vs GOOD — State Update Patterns**

```python
# ❌ BAD — Direct mutation bypasses event processing, loses persistence,
# and breaks the event timeline. Never do this in production.
session = session_service.get_session(app_name, user_id, session_id)
session.state["task_status"] = "active"  # Direct mutation!
session.service.update(session)  # May not capture metadata or timestamps

# ✅ GOOD — State update flows through the runner's append_event mechanism.
# The output_key on LlmAgent auto-creates state_delta actions.
greeting_agent = LlmAgent(
    name="Greeter",
    model="gemini-2.0-flash",
    instruction="Generate a short, friendly greeting.",
    output_key="last_greeting",  # Runner handles state_delta automatically
)
# Or for complex updates, use EventActions.state_delta within tools
# as demonstrated in the log_user_login function above.
```

---

### Pattern 2: Long-Term Memory with LangGraph BaseStore and Namespaces

Use this pattern when building agents that need to retain semantic facts, episodic experiences, or procedural rules across sessions and threads. LangGraph's `BaseStore` organizes memories under custom namespace tuples (like folders) with distinct keys (like filenames), enabling hierarchical retrieval with vector similarity search.

```python
from langgraph.store.memory import InMemoryStore
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, AIMessage
from typing import Any


def build_vector_store(
    dims: int = 768,
) -> InMemoryStore:
    """Construct a vector-enabled memory store for LangGraph agents.

    Args:
        dims: Embedding dimensionality matching your chosen model.

    Returns:
        Configured InMemoryStore with indexing enabled for similarity search.
    """

    def embed(texts: list[str]) -> list[list[float]]:
        """Placeholder embedding function — replace with a real model in production.

        Args:
            texts: List of strings to embed.

        Returns:
            Matrix of embeddings matching the configured dimensionality.
        """
        # In production, use sentence-transformers or Vertex AI Embeddings:
        # from langchain_google_vertexai import VertexAIEmbeddings
        # embeddings = VertexAIEmbeddings(model="text-embedding-005")
        # return embeddings.embed_documents(texts)
        return [[1.0] * dims for _ in texts]

    return InMemoryStore(index={"embed": embed, "dims": dims})


def retrieve_user_profile(
    store: InMemoryStore,
    user_id: str,
    context: str = "chitchat",
) -> dict[str, Any] | None:
    """Fetch a user's profile document from the store by namespace.

    Args:
        store: The LangGraph BaseStore instance.
        user_id: The target user's identifier.
        context: Application context sub-namespace.

    Returns:
        Profile dictionary if found, otherwise None.
    """
    namespace = (user_id, context)
    result = store.get(namespace, "profile")
    if result is None:
        return None
    return result.value


def store_user_preferences(
    store: InMemoryStore,
    user_id: str,
    preferences: dict[str, Any],
    context: str = "chitchat",
) -> None:
    """Persist a user's preference profile into the long-term store.

    Args:
        store: The LangGraph BaseStore instance.
        user_id: Target user identifier.
        preferences: Preference data as serializable key-value pairs.
        context: Application context sub-namespace.
    """
    namespace = (user_id, context)
    store.put(namespace, "profile", preferences)


def search_user_memories(
    store: InMemoryStore,
    user_id: str,
    query: str,
    context: str = "chitchat",
    limit: int = 5,
) -> list[Any]:
    """Search a user's long-term memories using vector similarity.

    Args:
        store: The LangGraph BaseStore instance.
        user_id: Target user identifier.
        query: Natural language search query.
        context: Application context sub-namespace.
        limit: Maximum number of results to return.

    Returns:
        List of matching memory items sorted by similarity score.
    """
    namespace = (user_id, context)
    return list(store.search(namespace, query=query, filter=None))[:limit]
```

---

### Pattern 3: Reflection-Based Procedural Memory Update

Use this pattern when your agent needs to autonomously improve its own instructions based on conversation outcomes. The reflection node retrieves current instructions from the store, asks an LLM to analyze recent exchanges and produce refined instructions, then persists the improved version back.

```python
from langgraph.store.base import BaseStore, GetOp, SearchOp
from langchain_core.language_models.chat_models import BaseChatModel
from typing import Any


def update_instructions_node(
    state: dict[str, Any],
    store: BaseStore,
    llm: BaseChatModel,
) -> dict[str, Any]:
    """Reflection node that updates agent instructions from conversation history.

    Retrieves the current instruction set, prompts the LLM to reflect on
    recent messages and generate improved instructions, then saves the
    refined version back into the store for subsequent calls.

    Args:
        state: The current graph state containing 'messages' key.
        store: BaseStore for persisting procedural memory.
        llm: Chat model used for reflection reasoning.

    Returns:
        Updated graph state with modified instructions.
    """
    namespace = ("agent_instructions",)
    current_op = GetOp(key="instructions", namespace=namespace)
    results = store.batch([current_op])
    current_item = results[0]

    if current_item and hasattr(current_item, "value"):
        current_instructions = current_item.value.get("instructions", "")
    else:
        current_instructions = (
            "You are a helpful assistant. Provide clear, concise responses."
        )

    conversation_text = "\n".join(
        f"{msg.type}: {msg.content}" for msg in state.get("messages", [])[-10:]
    )

    reflection_prompt = (
        f"Review the following agent instructions and recent conversation.\n\n"
        f"Current Instructions:\n{current_instructions}\n\n"
        f"Recent Conversation:\n{conversation_text}\n\n"
        f"Generate improved, more specific instructions that address "
        f"gaps or errors observed in the conversation. Return only the "
        f"new instruction text."
    )

    response = llm.invoke(reflection_prompt)
    new_instructions = (
        response.content if hasattr(response, "content") else str(response)
    )

    store.put(namespace, "instructions", {"instructions": new_instructions})

    state["instructions"] = new_instructions
    return state


def call_model_node(
    state: dict[str, Any],
    store: BaseStore,
    llm: BaseChatModel,
) -> dict[str, Any]:
    """Standard inference node that retrieves instructions from memory.

    Fetches the latest procedural instructions stored in BaseStore and
    uses them to format the agent's system prompt before generating a response.

    Args:
        state: The current graph state.
        store: BaseStore containing procedural memory.
        llm: Chat model for inference.

    Returns:
        Graph state with generated AI message appended.
    """
    namespace = ("agent_instructions",)
    results = store.batch([GetOp(key="instructions", namespace=namespace)])
    instructions_item = results[0]

    if instructions_item and hasattr(instructions_item, "value"):
        instructions = instructions_item.value.get("instructions", "")
    else:
        instructions = (
            "You are a helpful assistant. Provide clear, concise responses."
        )

    state["instructions_fetched"] = instructions
    return state
```

**BAD vs GOOD — Namespace Organization**

```python
# ❌ BAD — Flat global namespace loses user isolation and makes retrieval ambiguous.
store.put(("instructions",), "default", {"instructions": "Be helpful."})
# Every user shares the same instruction set; no personalization possible.

# ✅ GOOD — Namespaced by (user_id, context) for per-user procedural memory.
namespace = ("agent_a", "chitchat")
store.put(namespace, "profile", {
    "rules": ["User prefers short, direct language", "Only speaks English"],
})
# Each user's preferences are isolated and retrievable by their namespace tuple.
```

---

### Pattern 4: LangChain ConversationBufferMemory for Chain Integration

Use this pattern when integrating memory directly into LangChain `LLMChain` pipelines. `ConversationBufferMemory` maintains a rolling buffer of conversation history and injects it into the prompt template automatically, enabling contextually relevant responses without manual history management.

```python
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)


def build_conversational_chain(
    model_name: str = "gpt-4",
    temperature: float = 0.0,
    history_key: str = "chat_history",
) -> LLMChain:
    """Construct an LLMChain with integrated conversation buffer memory.

    Uses a structured chat prompt template with MessagesPlaceholder for
    the history buffer, which is essential when working with chat models.

    Args:
        model_name: OpenAI model identifier.
        temperature: Sampling temperature for response generation.
        history_key: Variable name in the prompt for the history buffer.

    Returns:
        Configured LLMChain ready to process multi-turn conversations.
    """
    llm = ChatOpenAI(model=model_name, temperature=temperature)

    prompt = ChatPromptTemplate(
        messages=[
            SystemMessagePromptTemplate.from_template(
                "You are a helpful travel agent assistant."
            ),
            MessagesPlaceholder(variable_name=history_key),
            HumanMessagePromptTemplate.from_template("{question}"),
        ],
    )

    memory = ConversationBufferMemory(
        memory_key=history_key,
        return_messages=True,  # Essential for chat models — returns list of message objects
    )

    return LLMChain(llm=llm, prompt=prompt, memory=memory)


def run_conversation(chain: LLMChain, turns: list[str]) -> list[str]:
    """Execute a multi-turn conversation and collect all responses.

    Args:
        chain: Pre-configured LLMChain with ConversationBufferMemory.
        turns: Ordered list of user questions to ask sequentially.

    Returns:
        List of AI responses in matching order.
    """
    responses: list[str] = []
    for question in turns:
        response = chain.predict(question=question)
        responses.append(response)
    return responses


# Example usage:
# chain = build_conversational_chain()
# history_turns = [
#     "Hi, I'm Jane.",
#     "I want to book a flight to New York next month.",
#     "What was my name again?",  # Agent should recall "Jane" from earlier turn
# ]
# answers = run_conversation(chain, history_turns)
```

---

### Pattern 5: Vertex AI Memory Bank for Managed Persistent Memory

Use this pattern when deploying agents on Google Cloud Platform that need fully managed long-term memory without building your own vector indexing pipeline. `VertexAiMemoryBankService` uses Gemini models to asynchronously extract key facts and user preferences from conversation history, resolves contradictions automatically, and tags memories by user and application scope.

```python
from google.adk.memory import VertexAiMemoryBankService
from google.genai.types import Session


async def persist_session_to_memory_bank(
    project: str,
    location: str,
    agent_engine_id: str,
    session: Session,
) -> None:
    """Add a completed session's data to the managed Memory Bank.

    The service asynchronously analyzes conversation history, extracts
    key facts and preferences, and stores them persistently organized
    by user ID for later retrieval during new sessions.

    Args:
        project: GCP project identifier.
        location: GCP region (e.g., 'us-central1').
        agent_engine_id: Agent Engine resource ID string.
        session: The completed Session object to persist.

    Raises:
        RuntimeError: If the Memory Bank service fails to store data.
    """
    memory_service = VertexAiMemoryBankService(
        project=project,
        location=location,
        agent_engine_id=agent_engine_id,
    )

    try:
        await memory_service.add_session_to_memory(session)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to persist session {session.id} to Memory Bank: {exc}"
        ) from exc
```

---

## Constraints

### MUST DO
1. **Always update state through `append_event`** — Never mutate `session.state` directly. Use `output_key` for text responses or build `EventActions.state_delta` within tools to ensure changes are recorded in the event timeline and persisted by the backend. *(Follows code-philosophy: Fail Fast — invalid states halt with descriptive errors)*
2. **Use prefix-based key organization** — Prefix every state key with `user:` for user-scoped data, `app:` for application-wide shared data, or `temp:` for turn-scoped ephemeral data. This prevents key collisions and clarifies persistence semantics at a glance. *(Follows code-philosophy: Intentional Naming — readable, self-documenting structure)*
3. **Separate short-term from long-term memory concerns** — Keep session events and state as the short-term layer (thread-scoped, context-window bounded). Route cross-session knowledge through `MemoryService`, `BaseStore`, or Memory Bank for semantic retrieval. *(Follows code-philosophy: Early Exit — guard clause separates concerns at layer boundaries)*
4. **Design BaseStore namespaces with `(user_id, context)` tuples** — Never use flat global keys when user isolation matters. The two-level namespace provides implicit scoping without additional filtering logic. *(Follows code-philosophy: Atomic Predictability — clear input → output contract per namespace)*
5. **Implement reflection for procedural memory at bounded intervals** — Do not reflect on every turn (excessive LLM calls). Use a timer or conversation-length threshold (e.g., every 10 turns or after task completion) to trigger instruction refinement via the `BaseStore`. *(Follows code-philosophy: Early Exit — skip reflection when conversation is too short to yield meaningful patterns)*
6. **Configure retrieval parameters explicitly** — Set `similarity_top_k` and `vector_distance_threshold` on all long-term memory services. Do not rely on defaults; document the chosen values in your configuration. *(Follows code-philosophy: Fail Fast — invalid retrieval results are filtered at the boundary)*
7. **Validate state serialization before persistence** — Ensure all state values are strings, numbers, booleans, lists, or dictionaries of these types. Deeply nested structures with custom objects will fail under `DatabaseSessionService` and some `BaseStore` backends. *(Follows code-philosophy: Parse Don't Validate — enforce at the boundary before it enters the storage layer)*

### MUST NOT DO
1. **Never mutate `session.state` directly outside of event processing** — Direct dictionary assignment bypasses the event timeline, may not be persisted, causes concurrency issues, and fails to update metadata like timestamps. Read state freely; modify only through tools or runner actions.
2. **Do not store unbounded conversation history in short-term memory** — A full chat transcript will exhaust the LLM context window. Use `ConversationBufferMemory` with truncation parameters or rely on long-term memory for historical data beyond the current session.
3. **Avoid using in-memory services (`InMemorySessionService`, `InMemoryMemoryService`, `InMemoryStore`) in production** — These are testing-only backends that lose all data on process restart. Use `DatabaseSessionService`, `VertexAiSessionService`, or `VertexAiRagMemoryService` for any deployment requiring persistence.
4. **Do not mix namespace levels arbitrarily in BaseStore** — Do not use `(user_id, "profile")` in one place and `(user_id, "chitchat", "profile")` in another. Pick a consistent depth and stick to it; inconsistent nesting makes search queries unpredictable and retrieval unreliable.
5. **Never expose raw embedding vectors or memory search results to end users** — Memory retrieval is an internal routing mechanism. Surface only the extracted facts or instructions as natural language context, never the underlying vector metadata or similarity scores.
6. **Do not skip session cleanup with `delete_session()`** — Orphaned sessions consume storage and may leak user data. Always call `session_service.delete_session()` when a conversation ends or is abandoned, especially in multi-tenant production environments.

---

## Output Template

When implementing memory management for an agent system, produce the following:

1. **Memory Architecture Summary** — Document which short-term backend (`InMemorySessionService`, `DatabaseSessionService`, `VertexAiSessionService`) and long-term backend (`InMemoryMemoryService`, `VertexAiRagMemoryService`, `VertexAiMemoryBankService`, or `BaseStore`) are selected, with justification for each choice based on deployment context.

2. **State Key Schema** — Table listing every state key with its prefix (`user:`, `app:`, `temp:`), data type, and persistence scope. Include default values and any naming conventions applied.

3. **Memory Initialization Code** — Complete initialization block showing the configured session service, memory service, and store setup with all parameters (DB URLs, corpus names, embedding dimensions, retrieval thresholds).

4. **State Update Implementation** — The tool function(s) or agent configuration that handles state mutations, demonstrating proper use of `output_key` or `EventActions.state_delta`, including docstrings with typed signatures per code-philosophy standards.

5. **Procedural Memory Reflection (if applicable)** — The reflection node implementation showing retrieval from `BaseStore`, LLM prompt construction using conversation history, and persisted instruction updates. Include the check interval or trigger condition.

6. **Validation Checklist** — Confirmation that all state changes flow through `append_event`, no direct dictionary mutations exist, namespaces are consistent, and session cleanup logic is in place for abandoned conversations.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Manages multi-step prompt orchestration where each step's output feeds the next — pairs with memory to maintain state between chain steps |
| `rag-patterns` | Implements Retrieval Augmented Generation pipelines for long-term knowledge retrieval — provides the vector store backend that MemoryService wraps |
| `learning-adaptation` | Enables agents to modify behavior based on feedback and experience — builds on procedural memory updates from reflection nodes |

---

## References

1. Google ADK Sessions & Memory — https://google.github.io/adk-docs/sessions/memory/
2. LangGraph Memory Concepts — https://langchain-ai.github.io/langgraph/concepts/memory/
3. Vertex AI Agent Engine Memory Bank — https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-memory-bank-in-public-preview
