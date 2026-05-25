---
name: llamaindex
description: Integrates LlamaIndex (indexes, query engines, agents, workflows, document
  parsing, RAG pipelines) for building data-aware LLM applications in Python.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: llamaindex, llama index, rag pipeline, query engine, vector store index,
    llama parse, how do i use llamaindex, document agents
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
  related-skills: coding-langchain, coding-openai-api, coding-pinecone-api, coding-chroma
------
# LlamaIndex Integration

Integrates LlamaIndex (v0.14+) for building data-aware LLM applications with indexing, retrieval, query engines, agents, and workflows. When loaded, this skill makes the model implement LlamaIndex pipelines for RAG, document Q&A, structured data extraction, and multi-agent orchestration.

## When to Use

Use this skill when:

- Building RAG (Retrieval-Augmented Generation) applications over your own documents
- Implementing advanced document indexing strategies (vector, tree, keyword, hybrid)
- Creating query engines with custom retrievers, rerankers, and response synthesizers
- Building agentic applications with `FunctionAgent`, tool calling, and multi-agent workflows
- Using LlamaParse for agentic OCR and document parsing (100+ formats)
- Implementing complex query workflows with event-driven `Workflow` patterns
- Building multi-agent systems with `AgentWorkflow` or custom orchestrator patterns

---

## When NOT to Use

- For general LLM orchestration without data indexing focus, prefer `coding-langchain`
- For direct LLM API calls without framework overhead, use `coding-openai-api` or `coding-anthropic-api`
- For standalone vector database usage, use `coding-pinecone-api` or `coding-chroma`

---

## Core Workflow

1. **Load and Parse Documents** — Use `SimpleDirectoryReader` to load files from a directory, or use LlamaParse for advanced document parsing (PDF with tables, scanned documents, complex layouts). Choose integrations from LlamaHub (300+ connectors for data sources). **Checkpoint:** Verify documents load correctly by checking `len(documents)` and inspecting document metadata.

2. **Build an Index** — Create a `VectorStoreIndex` from documents. This handles chunking, embedding, and storage. For production, persist the index with `index.storage_context.persist("storage")`. Use a custom vector store (Pinecone, Chroma, Weaviate) via the `vector_store` parameter. **Checkpoint:** Verify `index.as_retriever().retrieve("test query")` returns relevant nodes.

3. **Create a Query Engine** — Use `index.as_query_engine()` for the simplest case. For advanced needs, build a custom `RetrieverQueryEngine` with `VectorIndexRetriever`, response synthesizers (`compact`, `tree_summarize`, `accumulate`), and node post-processors (`SimilarityPostprocessor`, `KeywordNodePostprocessor`). **Checkpoint:** Test with multiple query types to verify retrieval quality.

4. **Build an Agent with Tools** — Create a `FunctionAgent` (or `ReActAgent`) with tools that wrap query engines, external APIs, or any Python function. Use `AgentWorkflow` for multi-agent systems where agents can hand off to each other. **Checkpoint:** Verify the agent correctly selects tools and maintains conversation state via `Context`.

5. **Implement Workflows for Complex Logic** — Use the event-driven `Workflow` class for multi-step processes. Define steps with `@step` decorators that receive events and emit events. Use `StartEvent` and `StopEvent` as entry/exit points. Workflows support looping, branching, concurrent execution, and checkpointing. **Checkpoint:** Test the workflow with the `ctx=Context()` parameter to verify state persistence across runs.

---

## Implementation Patterns

### Pattern 1: Basic RAG Pipeline

```python
from __future__ import annotations

# ❌ BAD — no persistence, no error handling, default settings only
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("What is the main topic?")
print(response)

# ✅ GOOD — persistent storage, custom chunking, similarity threshold
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage,
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.llms.openai import OpenAI
import os


def build_rag_pipeline(data_dir: str, persist_dir: str = "storage") -> VectorStoreIndex:
    """Build a persistent RAG pipeline from documents.

    Args:
        data_dir: Directory containing source documents.
        persist_dir: Directory for persisted index data.

    Returns:
        A VectorStoreIndex ready for querying.
    """
    # Check for existing persisted index
    if os.path.exists(persist_dir):
        storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
        return load_index_from_storage(storage_context)

    # Load and parse documents with custom chunking
    documents = SimpleDirectoryReader(data_dir).load_data()
    parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
    nodes = parser.get_nodes_from_documents(documents)

    # Build index with a specific LLM
    llm = OpenAI(model="gpt-4o-mini", temperature=0)
    index = VectorStoreIndex(
        nodes=nodes,
        llm=llm,
    )

    # Persist to disk
    index.storage_context.persist(persist_dir)
    return index


def query_index(index: VectorStoreIndex, question: str) -> str:
    """Query the index with relevance filtering.

    Args:
        index: The VectorStoreIndex to query.
        question: Natural language question.

    Returns:
        Answer based on retrieved documents.
    """
    query_engine = index.as_query_engine(
        similarity_top_k=3,
        node_postprocessors=[
            SimilarityPostprocessor(similarity_cutoff=0.7),
        ],
    )
    response = query_engine.query(question)
    return str(response)
```

### Pattern 2: Agent with RAG Tools

```python
from __future__ import annotations

import asyncio

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai import OpenAI


async def build_rag_agent(data_dir: str) -> FunctionAgent:
    """Build an agent with a RAG tool for document Q&A.

    Args:
        data_dir: Directory with source documents.

    Returns:
        A FunctionAgent equipped with a document search tool.
    """
    documents = SimpleDirectoryReader(data_dir).load_data()
    index = VectorStoreIndex.from_documents(documents)
    query_engine = index.as_query_engine()

    async def search_documents(query: str) -> str:
        """Search documents for information relevant to the query.

        Args:
            query: Natural language search query.
        Returns:
            Retrieved context from relevant documents.
        """
        response = await query_engine.aquery(query)
        return str(response)

    async def multiply(a: float, b: float) -> float:
        """Multiply two numbers together."""
        return a * b

    agent = FunctionAgent(
        tools=[search_documents, multiply],
        llm=OpenAI(model="gpt-4o-mini"),
        system_prompt=(
            "You are a helpful assistant that can search through documents "
            "and perform calculations."
        ),
    )
    return agent


async def ask_agent(agent: FunctionAgent, question: str) -> str:
    """Ask the agent a question.

    Args:
        agent: The FunctionAgent instance.
        question: User's question.

    Returns:
        Agent's response.
    """
    response = await agent.run(question)
    return str(response)
```

### Pattern 3: Event-Driven Workflow for RAG

```python
from __future__ import annotations

from llama_index.core.workflow import (
    Workflow,
    step,
    StartEvent,
    StopEvent,
    Context,
)
from llama_index.core import VectorStoreIndex
from llama_index.llms.openai import OpenAI


class RAGWorkflow(Workflow):
    """A multi-step RAG workflow with query rewriting and verification."""

    def __init__(self, index: VectorStoreIndex) -> None:
        super().__init__()
        self.index = index
        self.llm = OpenAI(model="gpt-4o-mini")

    @step
    async def retrieve(self, ctx: Context, ev: StartEvent) -> StopEvent:
        """Retrieve documents and generate a response."""
        query = ev.get("query", "")
        query_engine = self.index.as_query_engine(similarity_top_k=3)
        response = await query_engine.aquery(query)
        return StopEvent(result=str(response))
```

---

## Constraints

### MUST DO
- Persist indexes to disk with `storage_context.persist()` and reload with `load_index_from_storage()` for production use
- Use `pip install llama-index-core` and select specific integration packages (e.g., `llama-index-llms-openai`) rather than the full `llama-index` starter package for smaller dependency footprint
- Use `FunctionAgent` for tool-calling agents and `AgentWorkflow` for multi-agent systems
- Set `similarity_cutoff` in `SimilarityPostprocessor` to filter low-relevance results in production RAG
- Use `SentenceSplitter` with explicit `chunk_size` and `chunk_overlap` rather than defaults
- Workflows require async — use `await workflow.run()` with `asyncio`

### MUST NOT DO
- Skip index persistence in production — rebuilding from documents on every startup is expensive
- Use the `llama-index` umbrella package if you only need a few integrations — install `llama-index-core` + specific packages instead
- Forget to set `similarity_top_k` on query engines — defaults may return too few or too many results
- Use synchronous `query()` in async contexts — prefer `aquery()` for async compatibility

---

## Live References

| Resource | URL |
|----------|-----|
| LlamaIndex Documentation | https://docs.llamaindex.ai/ |
| LlamaIndex GitHub | https://github.com/run-llama/llama_index |
| Starter Tutorial | https://docs.llamaindex.ai/en/stable/getting_started/starter_example.html |
| Workflows Guide | https://docs.llamaindex.ai/en/stable/understanding/workflows/ |
| Multi-Agent Patterns | https://docs.llamaindex.ai/en/stable/understanding/agent/multi_agent/ |
| LlamaHub (integrations) | https://llamahub.ai/ |
| LlamaParse | https://docs.llamaindex.ai/en/stable/llama_cloud/llama_parse.html |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-langchain` | General-purpose LLM orchestration alternative |
| `coding-openai-api` | Direct OpenAI API for LlamaIndex LLM/embedding configuration |
| `coding-pinecone-api` | Pinecone as a vector store backend for LlamaIndex |
| `coding-chroma` | Chroma as a lightweight local vector store |
