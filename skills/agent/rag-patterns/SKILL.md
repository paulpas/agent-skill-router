---
name: rag-patterns
description: Implements Retrieval-Augmented Generation patterns (chunking strategies, embedding-based vector search, semantic vs keyword retrieval, RAG pipelines) to ground LLM outputs in authoritative external knowledge sources.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: RAG, retrieval augmented generation, vector search, semantic search, chunking strategies, embeddings, knowledge retrieval, how do i ground LLM outputs in facts
  related-skills: memory-management, prompt-chaining, evaluation-monitoring
---

# Retrieval-Augmented Generation (RAG) Pattern

Implements RAG pipelines to ground LLM outputs in authoritative external knowledge sources. This skill makes the model design, build, and troubleshoot retrieval-augmented generation systems that combine embedding-based vector search with language model generation to produce accurate, verifiable answers from proprietary or real-time data.

## TL;DR Checklist

- [ ] Chunk documents using semantic boundaries (sections, paragraphs), not arbitrary character counts
- [ ] Generate embeddings with a production-grade model (e.g., `text-embedding-3-large`, `BGE-m3`)
- [ ] Store vectors in a purpose-built vector store (Weaviate, Qdrant, Milvus, pgvector, FAISS)
- [ ] Implement hybrid retrieval: combine semantic similarity search with BM25 keyword matching
- [ ] Add source citations to every RAG response for verifiability
- [ ] Set a similarity or distance threshold to reject irrelevant retrievals
- [ ] Test retrieval quality independently from generation quality

---

## When to Use

Use this skill when:

- Building a Q&A system over internal documents (HR policies, technical manuals, product specs)
- An LLM needs access to real-time or frequently updated information not in its training data
- You need to reduce hallucination by grounding answers in verifiable sources with citations
- Designing an enterprise search chatbot that answers employee questions from company wikis
- Implementing customer support automation that pulls from FAQs, support tickets, and product documentation
- Creating a research assistant that synthesizes information across multiple documents

---

## When NOT to Use

Avoid this skill for:

- **Simple factual questions** with no domain-specific knowledge (use direct LLM prompting or Google Search)
- **Fully closed-domain tasks** where the answer fits within the LLM's context window without retrieval
- **Real-time API calls** as the primary data source (use function calling / tool use instead of RAG)
- **Graph-structured relationship queries** requiring traversing entity connections (use GraphRAG or graph databases directly)
- **Ultra-low-latency requirements** where embedding lookup adds unacceptable overhead (>200ms penalty)

---

## Core Workflow

### Step 1: Ingest and Chunk the Knowledge Base

Load raw documents and split them into chunks using a strategy that preserves semantic context. Never use pure character-count chunking for technical or structured content. Prefer heading-aware, sentence-boundary, or recursive splitting.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

def chunk_documents(
    raw_text: str,
    document_type: str = "generic",
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[str]:
    """Chunk documents using a strategy appropriate for the content type.

    Args:
        raw_text: The full text to chunk.
        document_type: One of 'generic', 'markdown', 'code', 'legal'.
        chunk_size: Target size in characters per chunk.
        chunk_overlap: Overlap between consecutive chunks for context continuity.

    Returns:
        A list of string chunks ready for embedding.
    """
    if document_type == "markdown":
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ]
        splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
        documents = splitter.split_text(raw_text)
        return [doc.page_content for doc in documents]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(raw_text)
    return chunks
```

**Checkpoint:** Verify that each chunk is self-contained enough to make sense when retrieved in isolation. A chunk should never begin mid-sentence or reference a paragraph it doesn't contain (e.g., avoid "As shown above..." without the referenced content).

### Step 2: Generate and Store Embeddings

Convert each text chunk into a high-dimensional vector using an embedding model. Store these vectors in a vector database that supports efficient nearest-neighbor search. Choose your vector store based on deployment needs: managed (Pinecone, Weaviate Cloud), open-source self-hosted (Qdrant, Milvus), or embedded (FAISS, Chroma).

```python
from typing import List
import numpy as np
import os
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


def embed_and_store(
    chunks: List[str],
    embedding_model: str = "text-embedding-3-large",
    vector_store_type: str = "qdrant",
    collection_name: str = "knowledge_base",
    host: str | None = None,
    port: int = 6333,
) -> Qdrant:
    """Embed document chunks and store vectors in a vector database.

    Args:
        chunks: List of text chunks to embed.
        embedding_model: OpenAI embedding model identifier.
        vector_store_type: Backend ('qdrant', 'faiss', 'weaviate').
        collection_name: Name for the vector collection/table.
        host: Qdrant server hostname (None for local).
        port: Qdrant server port.

    Returns:
        The configured vector store instance.
    """
    embeddings = OpenAIEmbeddings(model=embedding_model)

    if vector_store_type == "qdrant":
        client = QdrantClient(host=host, port=port)
        # Create collection with cosine distance for semantic search
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
        )
        vectorstore = Qdrant(
            client=client,
            collection_name=collection_name,
            embeddings=embeddings,
        )
    elif vector_store_type == "faiss":
        from langchain_community.vectorstores import FAISS

        vectorstore = FAISS.from_texts(chunks, embeddings)
    else:
        raise ValueError(f"Unsupported vector store: {vector_store_type}")

    # Upsert all chunks at once
    if vector_store_type != "faiss":
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        vectorstore.add_texts(chunks, ids=ids)

    return vectorstore
```

**Checkpoint:** Confirm the vector store contains exactly as many vectors as there are chunks. Run a test query to verify embeddings are searchable — the top result should be semantically relevant, not just lexically overlapping.

### Step 3: Implement Hybrid Retrieval

Combine semantic (embedding-based) search with BM25 keyword search for more robust retrieval. Pure semantic search misses exact matches on technical terms, acronyms, and proper nouns. Pure BM25 misses paraphrased or conceptually similar queries. Hybrid retrieval captures both.

```python
from typing import List, Tuple
import os
from langchain.retrievers import ContextualCompressionRetriever, MultiQueryRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document


def build_hybrid_retriever(
    vectorstore,
    embedding_model: OpenAIEmbeddings,
    k_semantic: int = 5,
    k_bm25: int = 5,
    alpha: float = 0.6,
) -> object:
    """Build a hybrid retriever combining semantic and BM25 keyword search.

    Args:
        vectorstore: A LangChain-compatible vector store instance.
        embedding_model: The embedding model used during ingestion.
        k_semantic: Number of top results from semantic search.
        k_bm25: Number of top results from BM25 retrieval.
        alpha: Weight for semantic score (1-alpha is BM25 weight).

    Returns:
        A combined retriever that returns deduplicated, re-ranked results.
    """
    # Semantic retriever from vector store
    semantic_retriever = vectorstore.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": k_semantic, "score_threshold": 0.5},
    )

    # BM25 retriever built on the same document corpus
    all_docs: List[Document] = []
    for i in range(vectorstore._collection.count().total):
        payload = vectorstore._collection.scroll(
            limit=1, offset=i, with_payload=True
        )[0][0].payload if hasattr(vectorstore._collection, 'scroll') else {}
        all_docs.append(Document(page_content=payload.get("text", "")))

    bm25_retriever = BM25Retriever.from_documents(all_docs)
    bm25_retriever.k = k_bm25

    # Use Reciprocal Rank Fusion (RRF) for combining scores
    from langchain.retrievers import EnsembleRetriever

    ensemble = EnsembleRetriever(
        retrievers=[semantic_retriever, bm25_retriever],
        weights=[alpha, 1.0 - alpha],
    )
    return ensemble
```

**Checkpoint:** Run a test query where the user uses different wording than the source documents (e.g., "furry pet" vs "domestic cat"). Verify the BM25-only retriever fails while the hybrid retriever succeeds, proving semantic search is contributing value.

### Step 4: Build the RAG Pipeline with Prompt Augmentation

Construct the generation pipeline that retrieves relevant chunks, formats them into a prompt, and sends the augmented query to the LLM. The prompt template must instruct the model to use ONLY the retrieved context and cite sources.

```python
from typing import TypedDict, Annotated
import operator
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser


class RAGState(TypedDict):
    """State machine for the RAG pipeline."""
    question: str
    documents: Annotated[list, operator.add]
    generation: str
    sources: Annotated[list, operator.add]


def generate_rag_response(
    query: str,
    retriever,
    llm: ChatOpenAI | None = None,
    max_context_chunks: int = 4,
) -> dict[str, object]:
    """Execute a single RAG query through retrieval and generation.

    Args:
        query: The user's question or prompt.
        retriever: A LangChain-compatible retriever (semantic, BM25, or hybrid).
        llm: The language model for generation. Defaults to GPT-4o.
        max_context_chunks: Maximum number of retrieved chunks to include.

    Returns:
        Dict with 'answer', 'sources' (list of source metadata), and 'context_used'.
    """
    if llm is None:
        llm = ChatOpenAI(model="gpt-4o", temperature=0)

    # Step A: Retrieve relevant documents
    docs = retriever.invoke(query)
    top_docs = docs[:max_context_chunks]

    # Step B: Format context with source citations
    context_parts: list[str] = []
    sources: list[dict] = []
    for i, doc in enumerate(top_docs):
        source_ref = f"[Source {i+1}]"
        content = f"{source_ref} {doc.page_content}"
        context_parts.append(content)

        # Extract available metadata
        source_meta = {
            "index": i + 1,
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", None),
        }
        sources.append(source_meta)

    context_str = "\n\n".join(context_parts)

    # Step C: Build augmented prompt
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are a factual, precise assistant. Answer the user's question
using ONLY the provided context snippets. If the context does not contain enough
information to answer confidently, say so explicitly — do NOT hallucinate or make up
details. Cite your sources using the [Source N] markers provided in the context.

If you encounter conflicting information across sources, note the conflict and
prefer the more authoritative or recent source.

Keep answers concise and directly relevant to the question."""),
        ("human", """Question: {question}

Context:
{context}

Answer (cite sources):"""),
    ])

    # Step D: Generate response
    chain = prompt_template | llm | StrOutputParser()
    answer = chain.invoke({"question": query, "context": context_str})

    return {
        "answer": answer,
        "sources": sources,
        "context_used": len(top_docs),
    }
```

**Checkpoint:** Verify the response includes source citations matching the `[Source N]` markers in the output. Check that the model does NOT fabricate facts when context is insufficient — it should explicitly state uncertainty rather than guessing.

### Step 5: Implement Source Validation and Conflict Resolution (Agentic RAG)

For production-grade RAG, add an agentic layer that validates source quality, reconciles contradictions, and detects knowledge gaps. This step transforms a passive retrieval pipeline into an active reasoning system.

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ValidationResult:
    """Result of source validation by the agentic layer."""
    is_authoritative: bool
    confidence: float  # 0.0 to 1.0
    notes: str
    conflicts_detected: list[str]


def validate_sources_and_reconcile(
    retrieved_docs: list[object],
    query: str,
) -> list[object]:
    """Validate retrieved sources for authority and reconcile conflicts.

    This function acts as a reasoning gatekeeper that filters, prioritizes, and
    reconciles retrieved documents before they reach the LLM generation step.

    Args:
        retrieved_docs: List of Document objects from retrieval.
        query: The original user query for context.

    Returns:
        A filtered and prioritized list of validated document chunks.
    """
    if not retrieved_docs:
        return []

    # Strategy 1: Filter by metadata age — prefer recent documents
    authoritative_docs: list[object] = []
    outdated_docs: list[object] = []

    for doc in retrieved_docs:
        source_date = doc.metadata.get("date", None)
        if source_date:
            try:
                doc_dt = datetime.fromisoformat(source_date)
                days_old = (datetime.now() - doc_dt).days
                if days_old > 365:
                    outdated_docs.append(doc)
                else:
                    authoritative_docs.append(doc)
            except (ValueError, TypeError):
                authoritative_docs.append(doc)
        else:
            # No date metadata — include but flag for review
            authoritative_docs.append(doc)

    # Strategy 2: Detect and resolve contradictions within similar chunks
    conflicts: list[str] = []
    if len(authoritative_docs) > 1:
        # Check for overlapping content with differing claims
        # In practice, use an LLM call to detect factual conflicts
        conflicts.append(
            "Cross-reference overlapping documents for factual consistency"
        )

    # Strategy 3: Identify knowledge gaps — if top-k scores are low, signal external tool use
    top_score = retrieved_docs[0].metadata.get("score", 0.0) if retrieved_docs else 0.0
    gap_detected = top_score < 0.5

    if gap_detected:
        conflicts.append(
            "Low retrieval confidence — consider activating a web search tool"
        )

    # Return authoritative documents, filtering out outdated ones
    result = authoritative_docs[:4]  # Limit to top 4 validated chunks
    return result
```

**Checkpoint:** Confirm the agentic layer correctly filters out outdated documents when date metadata is present. Verify that low-confidence retrievals trigger a knowledge gap signal rather than passing stale or irrelevant context to the LLM.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Google ADK + Vertex AI RAG Corpus (Managed Cloud)

Use Google's Agent Development Kit with a managed RAG corpus for production deployments on GCP. This pattern handles indexing, embedding generation, and retrieval automatically.

```python
from google.adk.memory import VertexAiRagMemoryService
from google.adk.agents import Agent


# Configuration constants
RAG_CORPUS_RESOURCE_NAME = (
    "projects/your-gcp-project-id/"
    "locations/us-central1/"
    "ragCorpora/your-corpus-id"
)

# Maximum similar results to retrieve per query
SIMILARITY_TOP_K: int = 5

# Maximum allowed semantic distance (0.0 = identical, 1.0 = unrelated)
VECTOR_DISTANCE_THRESHOLD: float = 0.7


def build_vertex_rag_agent(
    agent_name: str = "research_assistant",
    model_id: str = "gemini-2.0-flash-exp",
    instruction: str = "",
) -> Agent:
    """Build an ADK agent with Vertex AI RAG memory service attached.

    Args:
        agent_name: Identifier for the agent.
        model_id: Google model to use for generation.
        instruction: System prompt for the agent.

    Returns:
        Configured Agent instance with integrated RAG retrieval.
    """
    memory_service = VertexAiRagMemoryService(
        rag_corpus=RAG_CORPUS_RESOURCE_NAME,
        similarity_top_k=SIMILARITY_TOP_K,
        vector_distance_threshold=VECTOR_DISTANCE_THRESHOLD,
    )

    agent = Agent(
        name=agent_name,
        model=model_id,
        instruction=instruction or "Answer using factual information from the knowledge base.",
        memory_service=memory_service,
    )
    return agent
```

### Pattern 2: Google Search as RAG (Quick Start)

The simplest form of RAG — use a search tool to ground LLM outputs in real-time web results. Ideal for public-domain information that changes frequently.

```python
from google.adk.tools import google_search
from google.adk.agents import Agent


def build_search_grounding_agent(
    agent_name: str = "web_researcher",
    model_id: str = "gemini-2.0-flash-exp",
) -> Agent:
    """Build an agent that grounds answers in live Google Search results.

    Args:
        agent_name: Identifier for the agent.
        model_id: The Google model to use.

    Returns:
        Agent with Google Search tool enabled.
    """
    agent = Agent(
        name=agent_name,
        model=model_id,
        instruction=(
            "You research topics using Google Search. Always cite your search results. "
            "If searches yield no relevant results, state that explicitly."
        ),
        tools=[google_search],
    )
    return agent
```

### Pattern 3: LangChain + LangGraph State Machine RAG (Production Pipeline)

A full production pipeline using LangGraph's state machine to manage the retrieval → generation flow. This pattern is shown in detail in the Core Workflow above; here is the compact graph assembly for quick reference.

```python
from langgraph.graph import StateGraph, END


def assemble_rag_graph(retriever, llm) -> object:
    """Assemble a LangGraph workflow for RAG with explicit nodes and edges.

    Args:
        retriever: A configured retriever (semantic, BM25, or hybrid).
        llm: An initialized ChatOpenAI or equivalent LLM instance.

    Returns:
        Compiled LangGraph application ready to stream responses.
    """
    workflow = StateGraph(RAGState)

    # Define nodes
    def retrieve_node(state: RAGState) -> dict:
        docs = retriever.invoke(state["question"])
        return {"documents": docs, "question": state["question"], "generation": ""}

    def generate_node(state: RAGState) -> dict:
        context = "\n\n".join([doc.page_content for doc in state["documents"]])
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Answer using only the provided context. Cite sources."),
            ("human", "Question: {question}\nContext:\n{context}\nAnswer:"),
        ])
        answer = (prompt | llm | StrOutputParser()).invoke({
            "question": state["question"],
            "context": context,
        })
        return {"generation": answer, "sources": [d.metadata for d in state["documents"]]}

    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("generate", generate_node)

    # Build the pipeline graph
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()


def run_rag_query(app: object, question: str) -> None:
    """Execute a query against the compiled RAG graph and stream output.

    Args:
        app: The compiled LangGraph application.
        question: The user's question.
    """
    print(f"\n--- Query: {question} ---")
    for event in app.stream({"question": question}):
        node_name = list(event.keys())[0]
        result = event[node_name]
        if "generation" in result:
            print(f"\n[Answer]\n{result['generation']}\n")
        elif "documents" in result:
            doc_count = len(result["documents"])
            print(f"[Retrieved {doc_count} documents]")
```

### Pattern 4: GraphRAG for Complex Interconnected Knowledge

Use when the query requires synthesizing information across multiple documents or understanding relationships between entities (e.g., financial analysis, gene-disease connections).

```python
# GraphRAG is implemented via libraries such as Microsoft's GraphRAG package.
# This pattern reference shows the architectural approach rather than a full implementation,
# since GraphRAG requires constructing a knowledge graph from source documents first.

from dataclasses import dataclass
from typing import List


@dataclass
class GraphRAGQueryResult:
    """Result from a GraphRAG query over a knowledge graph."""
    answer: str
    supporting_nodes: List[str]  # Entity IDs that supported the answer
    relationships_traversed: int  # Number of edges traversed during reasoning
    source_documents: List[str]  # Original documents linked to the entities


def design_graph_rag_architecture(
    source_documents: List[str],
    graph_engine: str = "neo4j",
) -> dict:
    """Design the architecture for a GraphRAG system.

    This is an architectural blueprint — full implementation requires
    graph construction, entity extraction, and relationship mapping from
    unstructured text.

    Args:
        source_documents: List of document paths or text content.
        graph_engine: Target graph database (neo4j, neo4j, Amazon Neptune).

    Returns:
        Architecture specification dict with pipeline stages.
    """
    return {
        "pipeline": [
            {"stage": "ingest", "action": "Parse documents and extract entities"},
            {"stage": "extract", "action": "Run LLM-based entity/relation extraction"},
            {"stage": "build_graph", "action": f"Store in {graph_engine} graph database"},
            {"stage": "embed", "action": "Generate vector embeddings for each node and edge"},
            {"stage": "query", "action": "Navigate graph + perform vector search for answer"},
            {"stage": "synthesize", "action": "Combine graph traversal results into final answer"},
        ],
        "graph_engine": graph_engine,
        "tradeoffs": {
            "advantages": [
                "Synthesizes fragmented information across documents",
                "Understands explicit entity relationships",
                "Superior for complex, multi-hop queries",
            ],
            "disadvantages": [
                "Significantly higher implementation complexity",
                "Requires expertise in graph database design and NLP",
                "Higher latency than vector-only RAG",
                "Graph quality is entirely dependent on extraction accuracy",
            ],
        },
    }
```

### BAD vs GOOD: Chunking Strategies

```python
# ❌ BAD — Pure character-count chunking destroys semantic context
from langchain.text_splitter import CharacterTextSplitter

bad_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=0)
# This may split a paragraph mid-sentence or separate a heading from its content.
bad_chunks = bad_splitter.split_text(large_document)


# ✅ GOOD — Recursive chunking with meaningful separators preserves structure
from langchain.text_splitter import RecursiveCharacterTextSplitter

good_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    separators=[  # Try splitting in this order: paragraphs → sentences → spaces
        "\n\n",       # Paragraph boundary
        "\n",         # Line boundary
        ". ",         # Sentence boundary
        " ",          # Word boundary
        "",           # Character-level (last resort)
    ],
)
good_chunks = good_splitter.split_text(large_document)
# Each chunk respects natural text boundaries and retains context.
```

### BAD vs GOOD: Retrieval Without Thresholds

```python
# ❌ BAD — No relevance threshold returns irrelevant noise to the LLM
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 10})
docs = retriever.invoke("What is the company's vacation policy?")
# Top-10 results may include low-similarity documents that confuse the model.


# ✅ GOOD — Similarity score threshold filters out irrelevant chunks
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"k": 5, "score_threshold": 0.6},
)
docs = retriever.invoke("What is the company's vacation policy?")
# Only documents with meaningful semantic similarity are returned.
# The threshold prevents noise from contaminating the LLM context window.
```

---

## Constraints

### MUST DO

1. **Use heading-aware or recursive chunking** for structured documents — never pure character-count splitting (violates *Early Exit*: bad chunking is a fatal error that no downstream fix can repair).
2. **Set a similarity or distance threshold** on every retriever to prevent irrelevant context from reaching the LLM (implements *Fail Fast*: reject weak retrievals immediately).
3. **Include source citations** in every RAG response using `[Source N]` markers — this is non-negotiable for verifiability and trust.
4. **Reference `code-philosophy` laws**: Design data flow so that document ingestion → embedding → retrieval → generation follows the *Parse Don't Validate* principle — validate at chunk boundaries, not at every intermediate step.
5. **Use production-grade embedding models** (`text-embedding-3-large`, `BGE-m3`) — do not use outdated or placeholder embeddings for any deployment targeting real users.
6. **Implement hybrid retrieval** (semantic + BM25) when the knowledge base contains technical terminology, acronyms, proper nouns, or code snippets that pure semantic search may miss.
7. **Add an agentic validation layer** for production systems: validate source recency, detect conflicts, and signal knowledge gaps before generation.
8. **Test retrieval quality independently** from generation — use metrics like Hit@K and NDCG on a held-out question-document pair set before measuring end-to-end answer quality.

### MUST NOT DO

1. **Never feed entire documents** into the LLM without chunking — this wastes tokens, overloads context windows, and degrades retrieval precision.
2. **Do not skip source validation** in production — passing outdated, low-confidence, or contradictory documents to the LLM directly increases hallucination risk.
3. **Never rely on a single retrieval method** (semantic-only or BM25-only) for general-purpose knowledge bases — hybrid approaches consistently outperform either alone.
4. **Do not use generic trigger keywords** like `code`, `data`, or `pattern` as your only retrieval signals — always anchor to domain-specific content identifiers.
5. **Never allow the LLM to answer without explicit instruction** to cite sources — an uncited RAG response is indistinguishable from a hallucination.
6. **Do not ignore latency overhead** — RAG adds embedding computation, vector search I/O, and context assembly time. Profile end-to-end latency and set SLA expectations.

---

## Output Template

When implementing a RAG pipeline using this skill, your output must contain:

1. **Ingestion Design** — Chunking strategy chosen, chunk size/overlap parameters, separator hierarchy
2. **Embedding Configuration** — Model identifier, vector dimensions, vector store type and connection details
3. **Retrieval Configuration** – Similarity metric, threshold value, k-value, hybrid weights (semantic vs BM25)
4. **Pipeline Diagram** — ASCII flow: `User Query → Embed Query → Retrieve Chunks → Validate Sources → Augment Prompt → Generate Answer`
5. **Prompt Template** — The exact system prompt and user prompt templates used for augmentation, including citation instructions
6. **Source Citation Format** — The convention used to reference retrieved documents in the final answer
7. **Error Handling** — How the pipeline handles: empty retrievals, low-confidence retrievals, knowledge gaps, source contradictions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `memory-management` | Complementary long-term memory patterns for agents that persist conversation context across sessions |
| `prompt-chaining` | Decompose complex queries into multi-step prompt sequences when single-pass RAG is insufficient |
| `evaluation-monitoring` | Evaluate RAG pipeline quality with retrieval metrics (Hit@K, NDCG) and answer quality benchmarks |

---

## References

1. Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. https://arxiv.org/abs/2005.11401
2. Google Cloud Vertex AI RAG Corpus. https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/manage-your-rag-corpus
3. Retrieval-Augmented Generation with Graphs (GraphRAG). https://arxiv.org/abs/2501.00309
4. LangChain and LangGraph: Retieval-Augmented Generation Implementation. https://medium.com/data-science/retrieval-augmented-generation-rag-from-theory-to-langchain-implementation-4e9bd5f6a4f2
