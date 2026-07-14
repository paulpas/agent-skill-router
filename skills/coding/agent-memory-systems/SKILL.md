---
name: agent-memory-systems
description: Implements memory systems for LLM agents including conversation buffers, windowed context, bounded model context management, and vector store-backed long-term memory retrieval with embeddings.
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
  triggers: memory systems, conversation buffer, windowed memory, long-term memory, vector store embeddings, context management, conversation history, how do i manage agent memory
  related-skills: agent-tool-calling-architecture,agent-planning-reasoning,langchain
---

# Agent Memory Systems

Implements the three-layer memory architecture for LLM agents — short-term conversation buffering, bounded windowed context management, and long-term vector store retrieval with embeddings. When loaded, this skill makes the model produce production-grade memory system code extracted from LangChain, AutoGen, and LlamaIndex patterns.

## TL;DR Checklist

- [ ] Short-term memory uses `ChatMemory` backend with configurable human/AI prefixes
- [ ] Windowed memory enforces bounded size after each `save_context()` call via `k * 2` message cap
- [ ] Model context objects are passed explicitly to agents — never pass full conversation history on each call
- [ ] Long-term memory store uses embedding-based semantic similarity with configurable relevance threshold
- [ ] Vector store queries return only results above `relevance_threshold` (default 0.7)
- [ ] Max tool iterations bounded in assistant agent context to prevent infinite loops

---

## When to Use

Use this skill when:

- Implementing conversation history management for an LLM agent
- Needing bounded context windows to stay within model token limits
- Designing long-term memory with vector store-backed semantic retrieval
- Building multi-turn agents that need both recent context and factual recall
- Integrating AutoGen-style `ChatCompletionContext` objects into agent workflows

## When NOT to Use

Avoid this skill for:

- Single-turn LLM calls with no conversation history needed
- Simple prompt templates without stateful memory management
- Implementing tool calling architecture (use `agent-tool-calling-architecture` instead)
- Planning and reasoning patterns (use `agent-planning-reasoning` instead)

---

## Core Workflow

1. **Initialize Short-Term Memory with Conversation Buffer** — Create a memory backend (in-memory or database-backed `BaseChatMemory`) and wrap it in `ConversationBufferMemory`. Set `human_prefix`, `ai_prefix`, `memory_key` for prompt injection, and `return_messages=True` for raw message objects. **Checkpoint:** Verify `load_memory_variables()` returns the full conversation under the configured key.

2. **Enforce Bounded Context with Windowed Memory** — Use `ConversationBufferWindowMemory` with parameter `k` (number of turns to retain). After each `save_context()`, check if message count exceeds `k * 2`. If so, clear and re-add only the most recent messages. This provides bounded memory usage with recency bias. **Checkpoint:** Verify that buffer property always returns at most `k * 2` messages regardless of total conversation length.

3. **Configure Model Context Objects (AutoGen Pattern)** — Create an `AssistantAgent` with explicit `model_context` parameter. Use `UnboundedChatCompletionContext()` for unlimited history or subclass for bounded behavior. Set `max_tool_iterations` to prevent infinite tool-call loops. Only pass NEW messages to `on_messages()`, not the full conversation. **Checkpoint:** Verify `_execute_tool_loop()` respects `max_tool_iterations` and falls back with a message when limit is reached.

4. **Set Up Long-Term Memory with Vector Store Embeddings** — Initialize `LongTermMemoryStore` with an embedding model, vector store backend (Pinecone, Weaviate, Qdrant, pgvector), and similarity threshold. Call `add_memory()` to store factual information. Retrieve via `retrieve_memories(query, relevance_threshold)` which performs semantic similarity search. **Checkpoint:** Verify that only results with `score >= relevance_threshold` are returned.

5. **Integrate Memory into Agent Execution** — Inject conversation buffer and retrieved long-term memories into the prompt before each LLM call. The pattern: load recent context (windowed memory) → retrieve relevant long-term facts → combine into single system prompt or message sequence. **Checkpoint:** Verify total token count stays within model limits after combining short-term + long-term memory.

---

## Implementation Patterns

### Pattern 1: Short-Term Memory — Conversation Buffer

The simplest form of memory — keeps every message in a list and injects them into future prompts. Use for short conversations only; for long conversations, use windowed or summary memory to manage context limits.

```python
# Source: langchain-ai/langchain — libs/langchain/langchain_classic/memory/buffer.py
"""Conversation buffer memory - stores entire conversation history."""

from typing import Any

from langchain_core.messages import BaseMessage, get_buffer_string


class ConversationBufferMemory:
    """Basic memory that stores the entire conversation history.

    This is the simplest form of memory — it keeps every message in a list
    and injects them into future prompts. Use this for short conversations.

    For long conversations, use ConversationBufferWindowMemory or
    ConversationSummaryMemory instead to manage context window limits.
    """

    def __init__(
        self,
        chat_memory: "BaseChatMemory",
        *,
        human_prefix: str = "Human",
        ai_prefix: str = "AI",
        memory_key: str = "history",
        return_messages: bool = False,
    ) -> None:
        """Initialize the conversation buffer memory.

        Args:
            chat_memory: Storage backend for messages (in-memory, database, etc.)
            human_prefix: Label for human messages in formatted string.
            ai_prefix: Label for AI messages in formatted string.
            memory_key: Key to use when injecting into chain inputs.
            return_messages: If True, return raw message objects; else format as string.
        """
        self.chat_memory = chat_memory
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix
        self.memory_key = memory_key
        self.return_messages = return_messages

    @property
    def buffer(self) -> str | list[BaseMessage]:
        """Current conversation buffer, as string or message list."""
        messages = self.chat_memory.messages
        if self.return_messages:
            return messages
        return get_buffer_string(
            messages,
            human_prefix=self.human_prefix,
            ai_prefix=self.ai_prefix,
        )

    def load_memory_variables(self, inputs: dict[str, Any]) -> dict[str, Any]:
        """Return the current conversation history as a memory variable."""
        return {self.memory_key: self.buffer}

    def save_context(
        self, inputs: dict[str, Any], outputs: dict[str, str]
    ) -> None:
        """Add new interaction to the conversation history.

        Args:
            inputs: User input dict (typically has 'input' key).
            outputs: AI output dict (typically has 'output' or 'response' key).
        """
        human_msg = HumanMessage(content=inputs["input"])
        ai_msg = AIMessage(content=outputs["output"])
        self.chat_memory.add_messages([human_msg, ai_msg])

    def clear(self) -> None:
        """Clear all stored conversation history."""
        self.chat_memory.clear()
```

### Pattern 2: Windowed Memory — Bounded Context

Keeps only the last k turns of a conversation. If the number of messages exceeds `k * 2`, oldest messages are dropped. This provides bounded memory usage with recency bias — recent context is more relevant than older context in most dialogues.

```python
# Source: langchain-ai/langchain — libs/langchain/langchain_classic/memory/buffer_window.py
"""Windowed conversation memory - keeps only the last K turns."""

from typing import Any

from langchain_core.messages import BaseMessage, get_buffer_string


class ConversationBufferWindowMemory:
    """Keeps only the last k turns of a conversation.

    If the number of messages exceeds k * 2, oldest messages are dropped.
    This provides bounded memory usage with recency bias — recent context
    is more relevant than older context in most dialogues.

    Args:
        k: Number of turns to retain. Each turn = 1 human + 1 AI message.
           Total messages kept = k * 2.
    """

    def __init__(
        self,
        chat_memory: "BaseChatMemory",
        *,
        k: int = 5,
        human_prefix: str = "Human",
        ai_prefix: str = "AI",
        memory_key: str = "history",
    ) -> None:
        """Initialize windowed memory.

        Args:
            chat_memory: Underlying message storage backend.
            k: Number of conversation turns to retain. Default 5 (10 messages).
            human_prefix: Label for human messages in formatted output.
            ai_prefix: Label for AI messages in formatted output.
            memory_key: Key name when injecting into chain inputs.
        """
        self.chat_memory = chat_memory
        self.k = k
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix
        self.memory_key = memory_key

    @property
    def buffer(self) -> str | list[BaseMessage]:
        """Last k turns of conversation history."""
        messages = self.chat_memory.messages
        # Keep last k * 2 messages (k human + k AI exchanges)
        recent = messages[-self.k * 2:] if self.k > 0 else []
        return get_buffer_string(
            recent,
            human_prefix=self.human_prefix,
            ai_prefix=self.ai_prefix,
        )

    def save_context(
        self, inputs: dict[str, Any], outputs: dict[str, str]
    ) -> None:
        """Add new interaction and enforce window bounds."""
        human_msg = HumanMessage(content=inputs["input"])
        ai_msg = AIMessage(content=outputs["output"])
        self.chat_memory.add_messages([human_msg, ai_msg])

        # Enforce window after each save — drop oldest if over limit
        messages = self.chat_memory.messages
        if len(messages) > self.k * 2:
            self.chat_memory.clear()
            self.chat_memory.add_messages(messages[-self.k * 2:])
```

### Pattern 3: AutoGen Model Context Management

Modern agents use explicit model context objects that track conversation history and provide bounded window management. The `AssistantAgent` maintains its own internal context — never pass the full conversation history on each call.

```python
# Source: microsoft/autogen — python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import (
    Any,
    AsyncGenerator,
    Awaitable,
    Callable,
    Dict,
    List,
    Optional,
    Sequence,
    TypeVar,
)

from autogen_core import CancellationToken, Component, FunctionCall
from autogen_core.memory import Memory
from autogen_core.model_context import (
    ChatCompletionContext,
    UnboundedChatCompletionContext,
)
from autogen_core.models import (
    AssistantMessage,
    ChatCompletionClient,
    CreateResult,
    FunctionExecutionResult,
    FunctionExecutionResultMessage,
    LLMMessage,
    SystemMessage,
)
from autogen_core.tools import BaseTool, FunctionTool, ToolResult
from pydantic import BaseModel, Field


class AssistantAgentConfig(BaseModel):
    """Declarative configuration for the assistant agent."""

    name: str
    model_client: ComponentModel
    tools: List[ComponentModel] | None = None
    handoffs: List[HandoffBase | str] | None = None
    model_context: ComponentModel | None = None
    memory: List[ComponentModel] | None = None
    description: str
    system_message: str | None = None
    reflect_on_tool_use: bool
    tool_call_summary_format: str
    max_tool_iterations: int = Field(default=1, ge=1)


class AssistantAgent(BaseChatAgent, Component[AssistantAgentConfig]):
    """An agent that provides assistance with tool use.

    State Management:
    - The agent maintains its own conversation history via model_context
    - Do NOT pass entire conversation history on each call — only new messages
    - max_tool_iterations controls how many sequential tool-call loops run

    Tool Call Behavior:
    - If model returns no tool calls → response returned as TextMessage
    - When reflect_on_tool_use=True → another inference after tool results
    - Multiple parallel tool calls are executed concurrently when supported
    """

    def __init__(
        self,
        name: str,
        model_client: ChatCompletionClient,
        *,
        tools: Sequence[BaseTool] = (),
        handoffs: Sequence[HandoffBase | str] = (),
        model_context: ChatCompletionContext | None = None,
        memory: Sequence[Memory] = (),
        description: str = "An agent",
        system_message: str | None = "You are a helpful AI assistant.",
        reflect_on_tool_use: bool = True,
        tool_call_summary_format: str = "{response}",
        max_tool_iterations: int = 1,
    ) -> None:
        """Initialize assistant agent.

        Args:
            name: Unique identifier for this agent in a multi-agent team.
            model_client: LLM client for chat completion calls.
            tools: Tools available for the model to invoke via function calling.
            handoffs: Other agents this agent can transfer control to.
            model_context: Conversation history store. Defaults to unbounded.
            memory: External memory systems (vector stores, knowledge bases).
            description: Shown to other agents when selecting speakers.
            system_message: Initial system prompt for the conversation.
            reflect_on_tool_use: If True, make another LLM call after tool results.
            tool_call_summary_format: How to summarize tool call results.
            max_tool_iterations: Max sequential tool-call loops (prevents infinite loops).
        """
        self._name = name
        self._model_client = model_client
        self._tools = list(tools)
        self._handoffs = list(handoffs)
        self._model_context = model_context or UnboundedChatCompletionContext()
        self._memory = list(memory)
        self._description = description
        self._system_message = system_message
        self._reflect_on_tool_use = reflect_on_tool_use
        self._max_tool_iterations = max_tool_iterations

    async def on_messages(
        self,
        messages: Sequence[BaseChatMessage],
        cancellation_token: CancellationToken | None = None,
    ) -> Response:
        """Handle a sequence of messages. Only NEW messages should be passed.

        The agent maintains its own internal context. Do not pass the full
        conversation history on each call.

        Args:
            messages: New messages since last invocation.
            cancellation_token: Optional token for aborting long operations.

        Returns:
            Response with final chat_message as the agent's reply.
        """
        # Add new messages to internal context
        for msg in messages:
            await self._model_context.add_message(msg)

        # Execute tool call iteration loop
        response = await self._execute_tool_loop(cancellation_token)

        return Response(
            chat_message=response.chat_message,
            inner_messages=response.inner_messages or [],
        )

    async def _execute_tool_loop(
        self, cancellation_token: CancellationToken | None
    ) -> Response:
        """Run the tool call loop up to max_tool_iterations.

        Loop pattern:
        1. Build conversation from context + system message
        2. Call LLM with tools bound
        3. If tool calls returned → execute them, add results to context
        4. Repeat until text response or max iterations reached
        """
        inner_messages: list[BaseAgentEvent] = []

        for _iteration in range(self._max_tool_iterations):
            # Build full conversation for the LLM call
            conversation = await self._model_context.get_messages()
            all_messages: list[LLMMessage] = [SystemMessage(content=self._system_message)]
            all_messages.extend(conversation)

            # Call the model with tools
            result = await self._model_client.create(
                all_messages,
                tools=self._tools,
                cancellation_token=cancellation_token,
            )

            if result.content:
                # Text response — done
                text_msg = TextMessage(
                    content=result.content[0].text or "",
                    source=self._name,
                )
                await self._model_context.add_message(text_msg)
                return Response(chat_message=text_msg, inner_messages=inner_messages)

            # Tool calls returned — execute them
            if result.call_events:
                tool_results = []
                for call in result.call_events:
                    if isinstance(call, FunctionCall):
                        execution = await self._execute_single_tool_call(call)
                        tool_results.append(execution)

                # Add results to context for next iteration
                execution_msg = FunctionExecutionResultMessage(
                    contents=tool_results
                )
                await self._model_context.add_message(execution_msg)
                inner_messages.extend(tool_results)

        # Max iterations reached without text response
        fallback_msg = TextMessage(
            content=f"Reached maximum tool iterations ({self._max_tool_iterations}).",
            source=self._name,
        )
        return Response(chat_message=fallback_msg, inner_messages=inner_messages)

    async def _execute_single_tool_call(self, call: FunctionCall) -> ToolCallExecutionEvent:
        """Execute a single function/tool call by name and arguments."""
        tool = next((t for t in self._tools if isinstance(t, FunctionTool) and t.name == call.name), None)
        if tool is None:
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=f"Unknown tool: {call.name}", tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )

        try:
            result = await tool.run_json(call.args, cancellation_token=None)
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=str(result), tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )
        except Exception as e:
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=f"Error: {e}", tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )
```

### Pattern 4: Long-Term Memory with Vector Store Embeddings

Modern agents store factual memories in vector stores and retrieve them based on semantic similarity to the current context. On each conversation turn, relevant past memories are retrieved via embedding-based search and injected into the context window.

```python
# Source: AI Agent Research 2026 — Long-Term Memory with Vector Store Embeddings pattern
from typing import List, Optional, Sequence, Any
from llama_index.core.schema import BaseNode, Document, NodeWithScore, QueryBundle
from llama_index.core.base.embeddings.base import BaseEmbedding


class LongTermMemoryStore:
    """Stores factual memories in a vector store and retrieves them by semantic similarity.

    Pattern: On each conversation turn, relevant past memories are retrieved via
    embedding-based search and injected into the context window.
    """

    def __init__(
        self,
        embed_model: BaseEmbedding,
        vector_store: Any,  # VectorStore from any supported backend
        similarity_top_k: int = 5,
        embedding_dim: int = 1536,
    ) -> None:
        """Initialize long-term memory store.

        Args:
            embed_model: Embedding model for encoding queries and stored memories.
            vector_store: Backend storage (Pinecone, Weaviate, Qdrant, pgvector, etc.)
            similarity_top_k: Number of top results to retrieve per query.
            embedding_dim: Dimension of the embedding vectors.
        """
        self.embed_model = embed_model
        self.vector_store = vector_store
        self.similarity_top_k = similarity_top_k

    def add_memory(self, content: str, metadata: Optional[dict] = None) -> str:
        """Store a new memory in the vector store.

        Args:
            content: The factual content to store.
            metadata: Optional tags (source, timestamp, category).

        Returns:
            Memory ID for later retrieval or update.
        """
        doc = Document(text=content, metadata=metadata or {})
        nodes = self.embed_model.get_text_embedding_batch([content])
        node_id = f"mem_{len(self._get_all_memories())}"
        self.vector_store.add([node_id], [nodes[0]], [{"content": content}])
        return node_id

    def retrieve_memories(
        self, query: str, relevance_threshold: float = 0.7
    ) -> List[str]:
        """Retrieve relevant memories based on semantic similarity to the query.

        Args:
            query: The current conversation context or question.
            relevance_threshold: Minimum similarity score to include a result.

        Returns:
            List of relevant memory content strings, sorted by similarity.
        """
        query_embedding = self.embed_model.get_query_embedding(query)
        results = self.vector_store.query(
            query_embedding=query_embedding,
            top_k=self.similarity_top_k,
        )
        return [
            r.text for r in results
            if r.score is not None and r.score >= relevance_threshold
        ]

    def _get_all_memories(self) -> List[Document]:
        """Return all stored memories (for management operations)."""
        # Implementation depends on vector store backend
        raise NotImplementedError
```

---

## Constraints

### MUST DO
- Always bound conversation memory with windowed or summary strategies for sessions exceeding 10 turns
- Use `model_context` objects in AutoGen agents instead of passing full message lists — the agent maintains its own internal state
- Set `max_tool_iterations` to prevent infinite tool-call loops (default 1, increase only if multi-step reasoning is required)
- Store long-term memories with rich metadata (source, timestamp, category) for targeted retrieval
- Filter retrieved memories by `relevance_threshold` to avoid context pollution from irrelevant facts
- Always check embedding dimensionality matches between storage and query models

### MUST NOT DO
- Never accumulate unlimited conversation history without bounded windowing — this will exceed model context windows
- Never pass the full conversation history on each `on_messages()` call in AutoGen — only pass NEW messages
- Never skip metadata when storing long-term memories — untagged memories are impossible to filter by source or category
- Never set `relevance_threshold` below 0.5 — too-low thresholds return noise that pollutes the context window
- Never mix bounded and unbounded context strategies within the same agent without explicit management

---

## Output Template

When designing or reviewing agent memory systems, produce:

1. **Memory Backend Selection** — Justification for chosen backend (in-memory vs database, LangChain `ChatMessageHistory` vs AutoGen `ChatCompletionContext`)
2. **Bounded Window Configuration** — Value of `k` with reasoning based on model context window size and expected conversation length
3. **Long-Term Memory Architecture** — Vector store backend choice, embedding model, similarity threshold, and retrieval strategy
4. **Integration Diagram** — ASCII diagram showing how short-term buffer, windowed memory, and long-term store combine into the final prompt context

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-tool-calling-architecture` | Implement the tool calling layer that agents use after retrieving relevant memories |
| `langchain` | Broader LangChain/LangGraph patterns including chains, RAG, and agent frameworks |
| `agent-planning-reasoning` | Plan reasoning loops (ReAct, self-reflection) that consume memory as context |
