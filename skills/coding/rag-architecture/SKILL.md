---
name: rag-architecture
description: Implements production-grade RAG architectures (chunking strategies, hybrid
  search, re-ranking, multi-hop retrieval) to inject external knowledge into LLM applications
  accurately and efficiently.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: rag, retrieval augmented generation, vector search, embedding pipeline,
    document chunking, semantic search, re-ranking, hybrid search, llm context injection,
    knowledge grounding, cross-encoder, graphrag
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
  - config
  - examples
  - do-dont
  related-skills: coding-vector-databases, agent-knowledge-base, coding-prompt-engineering,
    coding-llm-fine-tuning
---
# Retrieval-Augmented Generation (RAG) Architecture

Implements production-grade RAG pipelines that retrieve relevant external knowledge and inject it into LLM prompts for accurate, grounded responses. A modern RAG system is not a single component — it is an orchestrated pipeline of chunking policies, hybrid retrieval signals, cross-encoder re-ranking, and grounding validation loops that together prevent hallucination while preserving response latency under 2 seconds.

## TL;DR Checklist

- [ ] Choose chunking strategy aligned with document structure (semantic boundaries > recursive splitting > fixed-size)
- [ ] Implement hybrid search combining dense vector similarity with sparse lexical matching (BM25 or SPLADE)
- [ ] Apply cross-encoder re-ranking to top-k candidates before context assembly
- [ ] Validate retrieved relevance against query intent; fall back gracefully when no relevant context exists
- [ ] Track retrieval metrics: hit rate, mean reciprocal rank (MRR), grounding accuracy per response

---

## When to Use

Use this skill when:

- Building LLM applications that require accurate, up-to-date information from proprietary documents or external data sources
- Designing a knowledge retrieval layer for customer support bots, internal wikis, legal research assistants, or medical Q&A systems
- Evaluating whether RAG is preferable to fine-tuning (RAG wins when knowledge is dynamic, verifiable, or multi-source)
- Optimizing an existing RAG pipeline that suffers from hallucination, poor recall on domain-specific queries, or context window overflow
- Implementing multi-hop retrieval where a single-pass semantic search cannot answer the query with available documents

## When NOT to Use

Avoid this skill for:
- Static knowledge that fits entirely within a single LLM's pre-training context and never changes — use prompt engineering or fine-tuning instead
- Real-time event streams without a document corpus — consider event-driven architecture patterns first
- Simple keyword lookups on small datasets (< 10,000 documents) — rule-based full-text search is cheaper and more precise
- Low-latency inference requiring sub-50ms response times — the embedding + re-ranking pipeline typically adds 200–800ms

---

## Core Workflow

1. **Ingest & Chunk Documents** — Parse source documents into retrievable units. Select chunking strategy based on document structure: use layout-aware parsing for PDFs with tables, semantic boundary detection for prose articles, and recursive character splitting for mixed-content documents. Maintain 10–20% token overlap between chunks to preserve sentence continuity across boundaries.
   **Checkpoint:** Verify average chunk size falls within 200–500 tokens; if too small, the retriever loses context — if too large, the LLM window fills with irrelevant material.

2. **Generate & Store Embeddings** — Encode each chunk using a production embedding model (e.g., OpenAI `text-embedding-3-large` at 3072 dimensions, or open-source alternatives like `BGE-m3`). Store vectors in a vector database (Qdrant, Weaviate, Pinecone) alongside metadata filters for source document, timestamp, section type, and language.
   **Checkpoint:** Confirm embedding dimensionality matches your retriever configuration; batch-encode documents to reduce API latency and cost.

3. **Configure Hybrid Search** — Combine dense vector retrieval with sparse lexical search (BM25 or SPLADE). Fuse the two ranked lists using Reciprocal Rank Fusion (RRF) with k=60, or apply a learned weighting scheme (`α * vec_score + (1-α) * bm25_score`). Benchmark hybrid retrieval against pure vector on your gold-standard query set.
   **Checkpoint:** Hybrid search should improve recall by 15–30% over pure vector retrieval on domain-specific queries; if not, investigate whether BM25 stopwords or document vocabulary need tuning.

4. **Cross-Encoder Re-Ranking** — Pass the top-20 hybrid-retrieved chunks through a cross-encoder re-ranker (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2` or `BAAI/bge-reranker-large`). This model evaluates query-chunk pairs individually using attention, producing fine-grained relevance scores. Trim to top-5 before context assembly.
   **Checkpoint:** Re-ranking adds 50–150ms latency per query; cache re-ranker results for identical queries and batch-process multiple queries through the cross-encoder for throughput.

5. **Assemble Context & Generate** — Format re-ranked chunks into a structured prompt template. Include source citations, chunk metadata, and explicit system instructions that ground the model in retrieved context while prohibiting fabrication. Ensure total assembled context stays within the model's context window with at least 20% headroom for the response.
   **Checkpoint:** Measure end-to-end retrieval + generation latency; if exceeding 2 seconds, reduce top-k from hybrid search from 20 to 10 or switch to a faster cross-encoder.

6. **Validate Grounding & Audit** — Post-process model output to detect hallucination indicators: ungrounded factual claims, contradictions between chunks, or references to information not present in retrieved context. Log retrieval metadata (query, retrieved IDs, relevance scores, latency) alongside generation results for continuous pipeline optimization.
   **Checkpoint:** Flag any response with grounding confidence below 0.6 for human review or automatic fallback to "insufficient information" messaging.

---

## Implementation Patterns

### Pattern 1: Chunking Strategies — BAD vs. GOOD

Naive fixed-size splitting destroys semantic boundaries and degrades retrieval quality more than embedding model choice ever will.

```python
# ❌ BAD — Fixed-size character splitting tears paragraphs, tables, and code blocks apart
def naive_chunk(text: str, chunk_size: int = 500) -> list[str]:
    """Naive character-splitting that ignores document structure."""
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

# ✅ GOOD — Recursive character splitting with semantic-aware separators preserves structure
from langchain.text_splitter import RecursiveCharacterTextSplitter

def production_chunking(
    text: str,
    chunk_size: int = 400,
    chunk_overlap: int = 50,
) -> list[str]:
    """Recursive splitting that respects paragraph boundaries and code fences."""
    splitter = RecursiveCharacterTextSplitter(
        separators=[
            "\n\n",       # Paragraph boundary (highest priority)
            "\n",         # Line break
            ". ",         # Sentence end
            " ",          # Word boundary
            "",           # Character fallback
        ],
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        keep_separator=True,
    )
    docs = splitter.create_documents([text])
    return [doc.page_content for doc in docs]

# ✅ GOOD — Layout-aware PDF parsing keeps tables intact and extracts headings as metadata
def layout_aware_chunking(file_path: str) -> list[dict[str, str]]:
    """Parse PDF with table awareness — never split a table across chunks."""
    from unstructured.partition.pdf import partition_pdf
    
    elements = partition_pdf(
        filename=file_path,
        strategy="hi_res",
        infer_table_structure=True,
    )
    
    chunks: list[dict[str, str]] = []
    for elem in elements:
        if elem.category == "Table":
            # Keep entire tables intact — tables are atomic retrieval units
            chunks.append({
                "content": f"TABLE:\n{elem.metadata.text_as_html}",
                "metadata": {"type": "table", "page": elem.metadata.page_number},
            })
        elif elem.category == "Title":
            # Attach heading to following content for better context
            pass  # Heading prepended in next iteration
        else:
            chunked = production_chunking(elem.text)
            chunks.extend({
                "content": chunk,
                "metadata": {"type": elem.category.lower(), "page": elem.metadata.page_number},
            } for chunk in chunked)
    
    return chunks
```

### Pattern 2: Hybrid Search with Reciprocal Rank Fusion

Fuses dense vector and sparse lexical signals into a single ranked list without requiring per-document score normalization.

```python
import numpy as np
from collections import defaultdict


def reciprocal_rank_fusion(
    vector_results: list[str],
    bm25_results: list[str],
    k: float = 60.0,
) -> list[tuple[str, float]]:
    """Fuse two independently ranked result lists using Reciprocal Rank Fusion.
    
    RRF is the standard fusion method because it does not require score normalization —
    each document's rank position in both lists is sufficient. Higher fused score = 
    more consistently ranked across both retrieval signals.
    
    Args:
        vector_results: Chunk IDs ranked by dense vector similarity (descending).
        bm25_results: Chunk IDs ranked by BM25 lexical relevance (descending).
        k: RRF smoothing parameter (60 is standard from Robertson et al., 2009).
    
    Returns:
        List of (chunk_id, fused_score) tuples sorted by descending score.
    """
    rrf_scores: dict[str, float] = defaultdict(float)
    
    # Rank position i contributes 1 / (i + k) to the fused score
    for rank, doc_id in enumerate(vector_results):
        rrf_scores[doc_id] += 1.0 / (rank + k)
    
    for rank, doc_id in enumerate(bm25_results):
        rrf_scores[doc_id] += 1.0 / (rank + k)
    
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)


def hybrid_retrieve(
    query: str,
    vector_store,
    bm25_index,
    top_k: int = 20,
) -> list[str]:
    """Execute hybrid retrieval and return chunk IDs ranked by RRF fusion."""
    # Dense vector retrieval
    vec_docs = vector_store.similarity_search_with_score(query, k=top_k)
    vec_ids = [doc.metadata["chunk_id"] for doc, _score in vec_docs]
    
    # Sparse BM25 retrieval
    bm25_docs = bm25_index.search(query, top_n=top_k)
    bm25_ids = [doc.id for doc in bm25_docs]
    
    # Fuse and return ranked IDs
    fused = reciprocal_rank_fusion(vec_ids, bm25_ids, k=60.0)
    return [doc_id for doc_id, _score in fused[:top_k]]
```

### Pattern 3: Cross-Encoder Re-Ranking

Cross-encoders achieve 10–20% NDCG improvement over bi-encoders by attending to query-chunk interactions — at the cost of O(n) inference per candidate set.

```python
from sentence_transformers import CrossEncoder
from typing import tuple


class ReRanker:
    """Production re-ranker using cross-encoder architecture."""
    
    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3"):
        self.model = CrossEncoder(model_name)
        self._cache: dict[str, list[tuple[str, float]]] = {}
    
    def rerank(
        self,
        query: str,
        chunks: list[str],
        top_n: int = 5,
        use_cache: bool = True,
    ) -> list[tuple[str, float]]:
        """Re-rank candidate chunks by query relevance.
        
        Args:
            query: The user's original search query.
            chunks: List of retrieved chunk texts to re-rank.
            top_n: Number of highest-scoring chunks to return.
            use_cache: If True, skip re-ranking for queries seen before.
        
        Returns:
            List of (chunk_text, relevance_score) tuples sorted descending.
        """
        cache_key = query.strip().lower()
        
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key][:top_n]
        
        # Cross-encoder processes all pairs simultaneously (batched inference)
        pairs = [(query, chunk) for chunk in chunks]
        scores = self.model.predict(pairs)
        
        ranked = sorted(
            zip(chunks, scores),
            key=lambda x: x[1],
            reverse=True,
        )
        
        result = [(text, float(score)) for text, score in ranked[:top_n]]
        
        if use_cache:
            self._cache[cache_key] = ranked
        
        return result


# Usage example:
# reranker = ReRanker("BAAI/bge-reranker-v2-m3")
# top_chunks = reranker.rerank(query, retrieved_chunks, top_n=5)
```

### Pattern 4: Grounded Generation with Citation Template

Structures context injection to minimize hallucination and enable source verification.

```python
from typing import NamedTuple


class RetrievedChunk(NamedTuple):
    """Structured representation of a retrieved and re-ranked chunk."""
    text: str
    relevance_score: float
    source_id: str
    section_title: str = ""


def assemble_grounded_prompt(
    query: str,
    chunks: list[RetrievedChunk],
    system_instruction: str | None = None,
) -> dict[str, str]:
    """Assemble a grounded LLM prompt with explicit source citations.
    
    The system instruction enforces grounding constraints. Context is formatted
    with source labels so the model can cite specific chunks in its response.
    
    Args:
        query: User's question.
        chunks: Pre-ranked retrieved chunks (already trimmed to top-k).
        system_instruction: Custom grounding instructions; uses default if None.
    
    Returns:
        Dict with 'system' and 'user' keys for API call.
    """
    default_system = """\
Answer the user's question using ONLY the provided context below.
If the context does not contain sufficient information to answer, reply:
"I cannot answer based on available information."
Do NOT fabricate facts or infer beyond what the context explicitly states.
Cite your sources using [Source {id}] notation after each factual claim."""

    system = system_instruction or default_system
    
    # Format chunks with source identifiers
    context_parts = []
    for idx, chunk in enumerate(chunks):
        label = f"[Source {idx + 1}] (relevance: {chunk.relevance_score:.3f})"
        header = f"{label}"
        if chunk.section_title:
            header += f" — {chunk.section_title}"
        context_parts.append(f"{header}\n{chunk.text}")
    
    full_context = "\n\n---\n\n".join(context_parts)
    user_prompt = f"Context:\n{full_context}\n\nQuestion: {query}"
    
    return {"system": system, "user": user_prompt}


def validate_grounding(
    response: str,
    chunks: list[RetrievedChunk],
) -> dict:
    """Post-hoc validation that detects ungrounded claims in the model response.
    
    Returns a grounding audit dict with confidence score and flagged issues.
    In production, this should use an LLM-as-judge for nuanced evaluation.
    """
    issues = []
    has_citations = any(f"[Source {i+1}]" in response for i in range(len(chunks)))
    
    if not has_citations:
        issues.append("Response contains factual claims without source citations")
    
    # Simple heuristic: check for hedging language when no sources cited
    confident_phrases = ["is definitely", "clearly states", "proves that"]
    if not has_citations:
        for phrase in confident_phrases:
            if phrase in response.lower():
                issues.append(f"Confident phrasing without citations: '{phrase}'")
    
    grounding_confidence = 1.0 - (len(issues) * 0.35)
    grounding_confidence = max(0.0, min(1.0, grounding_confidence))
    
    return {
        "grounding_confidence": round(grounding_confidence, 3),
        "has_citations": has_citations,
        "issues": issues,
        "needs_review": grounding_confidence < 0.6,
    }
```

---

## Constraints

### MUST DO
- Always combine vector search with BM25/lexical search — hybrid retrieval consistently outperforms pure vector by 15–30% recall on production datasets
- Use cross-encoder re-ranking before context injection into the LLM — it corrects semantic drift from bi-encoder retrievers and is the single highest-impact optimization for accuracy
- Maintain chunk overlap of 10–20% to preserve sentence and paragraph continuity across chunk boundaries
- Enforce grounding constraints in system prompts — explicitly forbid fabrication and require source citations for factual claims
- Log retrieval metadata on every query: original query, retrieved chunk IDs, relevance scores, re-ranker latency, grounding confidence — this data is essential for continuous pipeline optimization

### MUST NOT DO
- Never retrieve all available chunks and dump them into the context window — this overwhelms the model's attention mechanism and degrades output quality (the "lost in the middle" phenomenon)
- Do not use naive fixed-size character splitting on structured documents (PDFs, HTML, legal contracts) — it tears apart semantic units like tables, definitions, and code blocks
- Avoid synchronous embedding generation on every query — embed once during ingestion, store permanently, and only generate embeddings for new/updated documents
- Do not skip re-ranking — bi-encoder cosine similarity is insufficient for production-grade retrieval where domain terminology diverges from general language
- Never expose raw retrieved chunks to end users without citation metadata — grounding transparency builds trust and enables user-level verification

---

## Output Template

When implementing or auditing a RAG pipeline, produce the following structured output:

1. **Retrieval Architecture** — Chunking strategy (with separator list), embedding model name and dimension, vector database type, hybrid search weights (α for vector, 1-α for BM25)
2. **Re-Ranking Configuration** — Cross-encoder model selected, top-N selection threshold from hybrid results, caching policy for re-ranker
3. **Context Assembly Schema** — Prompt template structure with source citation format, context window budget allocation (chunk text vs. system instruction vs. response headroom)
4. **Evaluation Plan** — Gold-standard query set size and domain coverage, metrics to track (MRR@k, hit rate@k, grounding accuracy), target latency budgets per pipeline stage
5. **Fallback Behavior** — Defined actions when retrieval confidence < 0.6 or no chunks exceed relevance threshold: escalate to human agent, return "insufficient information" with suggested follow-up queries, or trigger multi-hop secondary retrieval

---

## Related Skills

| Skill                     | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `coding-vector-databases` | Select and operate vector stores (Qdrant, Weaviate, Pinecone, Chroma)   |
| `agent-knowledge-base`    | Use RAG retrieval outputs within multi-agent orchestration and reasoning flows |
| `coding-prompt-engineering` | System prompt design patterns for grounding, instruction following, and output constraints |
| `coding-llm-fine-tuning`  | Compare when fine-tuning is preferable to RAG for domain adaptation     |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LangChain Document Transformers & Text Splitting](https://python.langchain.com/docs/modules/data_connection/document_transformers/)
- [OpenAI Embeddings API Reference](https://platform.openai.com/docs/guides/embeddings)
- [Sentence Transformers CrossEncoder Documentation](https://sbert.net/docs/cross_encoder/usage/querying.html)
- [Reciprocal Rank Fusion (RRF) — Robertson et al. 2009](https://www.cs.otago.ac.nz/homepages/andrew/papers/2017.pdf)
- [Hybrid Search with Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/hybrid-search.html)
- [GraphRAG: Knowledge Graphs for LLM Reasoning (Microsoft Research)](https://www.microsoft.com/en-us/research/blog/graphrag-improving-on-rag/)
