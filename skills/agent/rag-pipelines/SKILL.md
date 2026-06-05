---




name: rag-pipelines
description: Implements RAG pipeline patterns (semantic chunking, hybrid search with BM25+vector, cross-encoder re-ranking, embedding selection) for retrieval-augmented document generation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: RAG, semantic chunking, hybrid search, BM25, cross-encoder rerank, embedding model, vector search, retrieval augmented generation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: memory-systems, tool-use-function-calling, planning-reasoning
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, vague ideation, simple keyword search, direct LLM generation without grounding]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# RAG Pipeline Patterns

Orchestrates document ingestion, retrieval, and response generation through a multi-stage pipeline that transforms raw documents into high-quality LLM-grounded answers. This skill makes the model design, implement, and tune each stage of a production RAG system — from intelligent chunking strategies through hybrid search and cross-encoder re-ranking to citation-aware response synthesis.

## TL;DR Checklist

- [ ] Choose chunking strategy (semantic splitting, sentence window, or recursive) based on document type
- [ ] Select embedding model matching quality/cost requirements for your domain
- [ ] Combine BM25 keyword search with vector similarity using weighted fusion
- [ ] Apply cross-encoder re-ranking to top-K retrieved chunks before synthesis
- [ ] Inject ranked context with citation markers into the generation prompt
- [ ] Verify generated claims against source text before returning to user

---

## When to Use

Use this skill when:

- Building a document question-answering system over a corpus of PDFs, Markdown, or text files
- A naive vector-search RAG produces low-quality answers due to poor context retrieval
- You need to support structured documents (reports, manuals, legal texts) where semantic boundaries matter more than fixed-size chunks
- Performance tuning is needed — optimizing hybrid search weights, re-ranking thresholds, or chunk overlap parameters

## When NOT to Use

Avoid this skill for:

- Simple keyword search over a small document set (use Elasticsearch directly without embeddings)
- Real-time streaming applications requiring sub-100ms total latency (re-ranking adds 50-200ms overhead per query)
- Generative tasks that don't require grounding in retrieved documents (no RAG needed — just LLM generation)
- Code repositories where syntax-aware chunking is required instead of semantic splitting

---

## Core Workflow

### Step 1: Chunk Documents Strategically

Choose a chunking strategy based on document structure and content type. For documents with natural topic boundaries (research papers, reports, legal contracts), use **semantic splitting** which identifies embedding dissimilarity peaks as split points. For documents where surrounding context matters (technical documentation, FAQ pages), use **sentence window parsing** which keeps each chunk small but preserves neighboring sentences. For unstructured text or log files, fall back to **recursive character splitting** with controlled overlap.

Key parameters:
- `chunk_size`: 256–1024 tokens depending on embedding model's context window and document density
- `overlap`: 10–30% of chunk size for semantic splitting; 20–50% for sentence windows to ensure cross-boundary coherence
- `separator`: Prefer hierarchical separators (`\n\n`, `\n`) over characters to maintain structural integrity

**Checkpoint:** Verify that each chunk contains at least one complete thought or paragraph — no chunk should split a sentence mid-clause. Run a sanity check: average chunk size should fall within 0.8x–1.2x the target chunk size, and no chunk should exceed 1.5x the target.

### Step 2: Generate Embeddings

Select an embedding model based on quality/cost/tradeoff analysis. For production systems requiring high retrieval accuracy, use models like `BGE-large-en-v1.5`, `text-embedding-3-large` (OpenAI), or `nomic-embed-text` for open-source alternatives. Batch embed all chunks — the optimal batch size depends on your embedding service's rate limits (typically 50–200 documents per call). Store embeddings in a vector index alongside chunk metadata (source file, page number, section heading) to enable filtered retrieval.

Key decisions:
- `dimensions`: Match or truncate to the downstream vector store's supported dimensionality
- `normalize`: Always normalize embeddings to unit length for cosine similarity — avoids scaling bias across models
- `metadata`: Attach `doc_id`, `chunk_idx`, `title`, and `section_path` to every chunk for provenance

**Checkpoint:** After embedding generation, verify that no chunk has a null or near-zero embedding (magnitude < 0.01). Re-embed any failed batches with exponential backoff (1s → 2s → 4s). Confirm vector store accepts all embeddings by running a test similarity query against the first 100 documents.

### Step 3: Build Hybrid Search Retriever

Combine BM25 keyword matching with vector similarity search using weighted linear fusion. Pure vector search misses exact keyword matches and synonyms; pure BM25 fails at semantic understanding. The hybrid approach scores each chunk on both methods, normalizes to [0, 1], then computes: `hybrid_score = alpha * bm25_normalized + (1 - alpha) * vector_similarity`. Tune `alpha` based on your corpus — technical manuals with precise terminology benefit from higher BM25 weight (0.4–0.6), while general-purpose document QA works well with balanced weights (0.3–0.4).

Implementation: query both the BM25 index and the vector store independently for top-K results, then merge using reciprocal rank fusion (RRF) or weighted score fusion. RRF is more robust when BM25 and vector scores are on incomparable scales.

**Checkpoint:** After tuning alpha, run evaluation queries against a gold-standard QA dataset. If hybrid recall@K exceeds either individual method by less than 3%, the corpus may be uniform enough that single-method search suffices — document this finding.

### Step 4: Re-Rank Results

Take the top-K (typically 10–20) results from hybrid search and pass them through a cross-encoder re-ranker. Cross-encoders evaluate the query-chunk pair jointly using full attention, producing far more accurate relevance scores than bi-encoders used in embedding. Popular models: `BGE-Reranker-v2-m3` (open-source, 500M params), `jina-reranker-v2-base-multilingual`, or an LLM-as-a-judge approach for domain-specific ranking where you prompt the model to score each chunk's relevance on a 1–5 scale.

After re-ranking, filter out chunks below a relevance threshold (typically > 0.3 for normalized cross-encoder scores) and select the top-N (typically 3–8) for synthesis. This stage is the single biggest accuracy improvement in production RAG — expect 10–25% recall@K gains over un-ranked retrieval.

**Checkpoint:** Verify re-ranking latency fits your SLO. A typical BGE-Reranker processes 10 chunks against a query in ~80ms on CPU; add this overhead to your total response budget and communicate it to consumers of the RAG service.

### Step 5: Synthesize Response

Inject the ranked, filtered context chunks into the LLM generation prompt with structured citation markers. Use a prompt template that explicitly instructs the model to ground its answer in the provided sources and cite them by index. Include instructions for handling partial answers — if retrieved context is insufficient, the model should state "I don't have enough information" rather than hallucinate.

Post-processing: after generation, perform a lightweight claim verification pass — extract key claims from the answer and check that each can be traced to at least one source chunk. Flag any unverified claims for review.

**Checkpoint:** Verify that every citation in the generated response points to an actual retrieved chunk (no phantom citations). Check that the answer length is proportional to the query complexity — overly terse or verbose answers often indicate prompt template issues.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Semantic Splitter Node Parser

Uses cosine dissimilarity between adjacent sentence groups to detect topic boundaries. Sentences with high embedding similarity belong to the same topic; a sharp dissimilarity spike indicates a topic transition where chunk splitting should occur.

```python
"""Semantic document splitter that detects topic boundaries via embedding dissimilarity."""

from dataclasses import dataclass, field
from typing import List, Tuple
import numpy as np


@dataclass
class SemanticSplitterConfig:
    """Configuration for semantic chunking strategy."""
    group_size: int = 3          # Number of sentences to embed per group before comparison
    threshold_percentile: float = 90.0  # Split at dissimilarity values above this percentile
    sentence_window_size: int = 2      # Surrounding sentences preserved around split point


@dataclass
class ChunkBoundary:
    """Marks a detected boundary between document topics."""
    index: int                 # Sentence index where the split occurs
    dissimilarity_score: float  # Cosine dissimilarity at this boundary
    left_topic_preview: str    # Last sentence of preceding chunk for context
    right_topic_preview: str   # First sentence of following chunk for context


def cosine_dissimilarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine dissimilarity (1 - cosine similarity)."""
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 1.0  # Max dissimilarity for zero vectors
    cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    return 1.0 - float(cos_sim)


def semantic_split_chunks(
    sentences: List[str],
    embedder,
    config: SemanticSplitterConfig = None
) -> List[dict]:
    """Split a document into semantically coherent chunks by detecting topic boundaries.

    Embeds sentence groups, computes pairwise cosine dissimilarity between adjacent groups,
    identifies split points at high-dissimilarity thresholds, and produces chunks that
    preserve natural topic boundaries rather than arbitrary token counts.

    Args:
        sentences: List of individual sentences from the document.
        embedder: An object with an `embed(texts)` method returning np.ndarray of shape (N, D).
        config: Chunking configuration controlling sensitivity and context windows.

    Returns:
        List of dicts with keys: 'text' (chunk content), 'start_sentence', 'end_sentence'.

    Raises:
        ValueError: If sentences list is empty or embedder returns unexpected dimensions.
    """
    if not sentences:
        raise ValueError("Cannot split an empty document — provide at least one sentence")
    if config is None:
        config = SemanticSplitterConfig()

    # Group sentences and compute embeddings in batches
    groups: List[np.ndarray] = []
    for i in range(0, len(sentences), config.group_size):
        group_text = " ".join(sentences[i:i + config.group_size])
        embedding = embedder.embed([group_text])[0]  # Shape: (D,)
        if embedding.shape[0] == 0:
            raise ValueError(f"Embedder returned empty vector for sentences {i}-{i+config.group_size}")
        groups.append(embedding)

    if len(groups) < 2:
        return [{"text": " ".join(sentences), "start_sentence": 0, "end_sentence": len(sentences)}]

    # Compute dissimilarity between adjacent group centroids
    dissimilarities = []
    for i in range(len(groups) - 1):
        dissim = cosine_dissimilarity(groups[i], groups[i + 1])
        dissimilarities.append(dissim)

    # Determine threshold from empirical distribution
    threshold = float(np.percentile(dissimilarities, config.threshold_percentile))

    # Identify split points where dissimilarity exceeds the threshold
    boundaries: List[ChunkBoundary] = []
    for i, dissim in enumerate(dissimilarities):
        if dissim > threshold:
            boundaries.append(ChunkBoundary(
                index=i * config.group_size + config.group_size,
                dissimilarity_score=dissim,
                left_topic_preview=sentences[max(0, i * config.group_size - 1)],
                right_topic_preview=sentences[min(len(sentences) - 1, (i + 1) * config.group_size)]
            ))

    # If no boundaries found (uniform document), fall back to fixed-size splitting
    if not boundaries:
        return _fallback_recursive_split(sentences, config)

    # Build chunks bounded by detected topic transitions
    chunks = []
    prev_end = 0
    for boundary in boundaries:
        chunk_sentences = sentences[prev_end:boundary.index]
        if len(chunk_sentences) > 1:
            chunks.append({
                "text": " ".join(chunk_sentences),
                "start_sentence": prev_end,
                "end_sentence": boundary.index - 1,
                "boundary_score": boundary.dissimilarity_score
            })
        prev_end = boundary.index

    # Final chunk from last boundary to end
    if prev_end < len(sentences):
        chunks.append({
            "text": " ".join(sentences[prev_end:]),
            "start_sentence": prev_end,
            "end_sentence": len(sentences) - 1
        })

    return chunks


def _fallback_recursive_split(
    sentences: List[str],
    config: SemanticSplitterConfig
) -> List[dict]:
    """Fallback: split into fixed-size chunks when no semantic boundaries detected."""
    target_size = max(config.group_size * 2, 5)
    chunks = []
    for i in range(0, len(sentences), target_size):
        chunk = sentences[i:i + target_size]
        if chunk:
            chunks.append({
                "text": " ".join(chunk),
                "start_sentence": i,
                "end_sentence": min(i + len(chunk) - 1, len(sentences) - 1)
            })
    return chunks


# ---------------------------------------------------------------
# BAD vs GOOD: Chunking Strategy Comparison
# ---------------------------------------------------------------

"""
❌ BAD — Naive recursive character splitting on a legal contract:

Split at fixed 500-char boundaries regardless of section structure.
Result: A clause gets cut mid-sentence, "Force Majeure" definition spans two chunks,
and the vector embedding for each chunk is incoherent (partial thought).

    "Article 7 - Force Majeure. Neither party shall be liable for delays caused by events
    beyond reasonable control including but not limited to acts of God, war, terrorism, pandemics,
    government restrictions, labor disputes, transportation failures, utilities interruption,"
    [CHUNK BREAK at comma — incomplete list]

✅ GOOD — Semantic splitting on the same contract:

Detects section headers and clause boundaries via embedding dissimilarity.
Each chunk contains complete articles or clauses with intact definitions.

    Chunk 1: "Article 7 - Force Majeure. Neither party shall be liable for delays caused by events
    beyond reasonable control including but not limited to acts of God, war, terrorism, pandemics,
    government restrictions, labor disputes, transportation failures, utilities interruption."
    
    Chunk 2: "Section 7.1 Definitions. 'Acts of God' means natural disasters... 'Government
    Restrictions' means any executive order..."
"""
```

### Pattern 2: Hybrid BM25 + Vector Retriever

Combines two complementary retrieval methods using reciprocal rank fusion (RRF), which is more robust than score-based linear fusion when the ranking distributions differ significantly between BM25 and vector similarity.

```python
"""Hybrid retriever fusing BM25 keyword search with dense vector similarity using RRF."""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class HybridRetrieverConfig:
    """Configuration for hybrid retrieval fusion strategy."""
    rrf_k: float = 60.0            # RRF constant — higher = more weight to top ranks
    bm25_weight: float = 0.4       # Weight for BM25 score in linear fallback (unused when RRF active)
    vector_weight: float = 0.6     # Weight for vector score in linear fallback (unused when RRF active)
    top_k_initial: int = 20        # Fetch this many from each method before merging
    top_k_final: int = 8           # Return this many after fusion and filtering


@dataclass
class RankedChunk:
    """A single document chunk with composite relevance score."""
    chunk_id: str
    text: str
    bm25_score: float = 0.0
    vector_score: float = 0.0
    rrf_score: float = 0.0
    source_file: Optional[str] = None
    page_number: Optional[int] = None


class HybridRetriever:
    """Combines BM25 and vector search with RRF fusion for production-quality retrieval."""

    def __init__(
        self,
        bm25_index,
        vector_store,
        config: HybridRetrieverConfig = None
    ):
        """Initialize hybrid retriever with both backend indices.

        Args:
            bm25_index: An index supporting .search(query, k) returning list of (doc_id, score).
            vector_store: An object supporting .similarity_search(query_embedding, k).
            config: Fusion parameters controlling rank weighting and output size.
        """
        if config is None:
            config = HybridRetrieverConfig()
        self.bm25_index = bm25_index
        self.vector_store = vector_store
        self.config = config

    def hybrid_search(
        self,
        query: str,
        query_embedding: Optional[np.ndarray] = None,
        filters: Optional[Dict[str, str]] = None
    ) -> List[RankedChunk]:
        """Execute hybrid retrieval by fusing BM25 and vector results via RRF.

        Runs both retrievers independently for top_K_initial, applies reciprocal rank fusion
        to combine rankings into a single score, then returns the final top-K ranked chunks
        sorted by descending relevance.

        Args:
            query: The natural language search query.
            query_embedding: Pre-computed embedding for vector store lookup. Generated if None.
            filters: Optional metadata filters (e.g., {"source_type": "pdf"}).

        Returns:
            List of RankedChunk objects sorted by RRF score, length <= top_k_final.
        """
        if not query.strip():
            return []

        # Retrieve from both backends independently
        bm25_results = self._get_bm25_results(query)
        vector_results = self._get_vector_results(query, query_embedding)

        # Merge via Reciprocal Rank Fusion
        fused_scores: Dict[str, float] = {}

        for rank, (doc_id, _) in enumerate(bm25_results):
            fused_scores[doc_id] = fused_scores.get(doc_id, 0.0) + self.config.rrf_k / (rank + 1 + self.config.rrf_k)

        for rank, (doc_id, _) in enumerate(vector_results):
            fused_scores[doc_id] = fused_scores.get(doc_id, 0.0) + self.config.rrf_k / (rank + 1 + self.config.rrf_k)

        # Sort by composite RRF score descending and build result objects
        sorted_docs = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
        ranked_chunks = []
        for doc_id, rrf_score in sorted_docs[:self.config.top_k_final]:
            bm25_score = self._lookup_score(doc_id, bm25_results)
            vector_score = self._lookup_score(doc_id, vector_results)

            ranked_chunks.append(RankedChunk(
                chunk_id=doc_id,
                text=self._fetch_chunk_text(doc_id),
                bm25_score=bm25_score,
                vector_score=vector_score,
                rrf_score=round(rrf_score, 4)
            ))

        return ranked_chunks

    def _get_bm25_results(self, query: str) -> List[Tuple[str, float]]:
        """Delegate to BM25 backend with optional metadata filtering."""
        results = self.bm25_index.search(query, k=self.config.top_k_initial * 2)
        # Normalize scores to [0, 1] using max-score scaling
        max_score = max((s for _, s in results), default=1.0) or 1.0
        return [(doc_id, score / max_score) for doc_id, score in results]

    def _get_vector_results(
        self,
        query: str,
        embedding: Optional[np.ndarray] = None
    ) -> List[Tuple[str, float]]:
        """Generate embedding if needed, then query vector store."""
        if embedding is None:
            embedding = self.vector_store.embedder.embed([query])[0]
        results = self.vector_store.search(vector=embedding, k=self.config.top_k_initial)
        return [(r.doc_id, r.score) for r in results]

    @staticmethod
    def _lookup_score(doc_id: str, results: List[Tuple[str, float]]) -> float:
        """Extract a specific document's score from ranked result list."""
        for did, score in results:
            if did == doc_id:
                return score
        return 0.0

    @staticmethod
    def _fetch_chunk_text(doc_id: str) -> str:
        """Retrieve chunk text from the document store by ID.
        
        In production, this reads from a persistent store (database, cache).
        For demonstration, returns a placeholder that would be replaced by actual retrieval.
        """
        # Placeholder — real implementation queries document_store.get(doc_id)
        raise NotImplementedError("Implement against your document storage backend")
```

### Pattern 3: Cross-Encoder Re-Ranking Pipeline

Takes the top-K candidates from initial hybrid retrieval and re-scores them with a cross-encoder model that evaluates query-chunk pairs jointly, dramatically improving relevance precision.

```python
"""Cross-encoder re-ranking pipeline for post-retrieval relevance refinement."""

from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np


@dataclass
class ReRankResult:
    """A chunk after cross-encoder re-scoring with its new rank."""
    chunk_id: str
    text: str
    original_rrf_score: float
    reranker_score: float
    new_rank: int
    source_file: Optional[str] = None


class CrossEncoderReranker:
    """Re-ranks retrieved document chunks using a cross-encoder relevance model.

    Unlike the bi-encoder embedding models used during indexing, cross-encoders
    process each (query, chunk) pair through the full transformer with bidirectional
    attention, producing fine-grained relevance scores that capture subtle semantic
    relationships between the specific query and each candidate chunk.
    """

    def __init__(self, model_name: str = "BGE-Reranker-v2-m3", max_chunks: int = 20):
        """Initialize reranker with a pre-loaded cross-encoder model.

        Args:
            model_name: HuggingFace model identifier for the cross-encoder.
                       Options: 'BGE-Reranker-v2-m3', 'jina-reranker-v2-base-multilingual'.
            max_chunks: Maximum number of chunks to rerank (enforced by hybrid retriever's top_k_initial).
        """
        self.model_name = model_name
        self.max_chunks = max_chunks
        self._model = None  # Lazy-loaded via transformers pipeline

    def re_rank(
        self,
        query: str,
        chunks: List[RankedChunk],
        threshold: float = 0.3,
        top_n: int = 8
    ) -> List[ReRankResult]:
        """Re-rank retrieved chunks and filter below-relevance-threshold results.

        Takes up to max_chunks from the initial retrieval, scores each (query, chunk) pair
        with the cross-encoder, assigns new ranks based on reranker scores, filters out
        low-scoring results, and returns the final ranked subset for response synthesis.

        Args:
            query: The original user query for relevance evaluation.
            chunks: Initial retrieval results from hybrid search (should be ≤ max_chunks).
            threshold: Minimum reranker score to include — chunks below are discarded.
            top_n: Maximum number of chunks to return after re-ranking.

        Returns:
            List of ReRankResult objects with new ranks, sorted by reranker_score descending.
            Length <= min(top_n, count_above_threshold).
        """
        if not query.strip() or not chunks:
            return []

        # Limit to max_chunks for computational efficiency
        candidate_chunks = chunks[:self.max_chunks]

        # Prepare pairs for cross-encoder batch inference
        pairs = [(query, chunk.text) for chunk in candidate_chunks]
        scores = self._predict_relevance(pairs)

        # Attach scores to results and sort by reranker score descending
        ranked_results: List[ReRankResult] = []
        for i, (chunk, score) in enumerate(zip(candidate_chunks, scores)):
            if score >= threshold:
                ranked_results.append(ReRankResult(
                    chunk_id=chunk.chunk_id,
                    text=chunk.text,
                    original_rrf_score=chunk.rrf_score,
                    reranker_score=round(float(score), 4),
                    new_rank=0,  # Set below after sorting
                    source_file=getattr(chunk, 'source_file', None)
                ))

        # Sort by reranker score and assign ranks
        ranked_results.sort(key=lambda r: r.reranker_score, reverse=True)
        for rank, result in enumerate(ranked_results[:top_n], start=1):
            result.new_rank = rank

        return ranked_results

    def _predict_relevance(self, pairs: List[Tuple[str, str]]) -> np.ndarray:
        """Run cross-encoder batch inference on query-chunk pairs.

        Uses HuggingFace transformers pipeline for efficient batched scoring.
        Each pair is tokenized jointly and passed through the transformer;
        the output logit is sigmoid-transformed to a [0, 1] relevance probability.

        Args:
            pairs: List of (query_text, chunk_text) tuples.

        Returns:
            np.ndarray of shape (N,) with float32 scores in [0, 1].
        """
        # Lazy-load the model on first call
        if self._model is None:
            self._load_model()

        outputs = self._model(pairs)
        return np.array(outputs, dtype=np.float32)

    def _load_model(self):
        """Lazy-load cross-encoder model from HuggingFace hub."""
        try:
            from transformers import pipeline
            self._model = pipeline(
                "text-classification",
                model=self.model_name,
                tokenizer=self.model_name,
                device=0 if self._has_gpu() else -1  # GPU if available, CPU otherwise
            )
        except ImportError as e:
            raise RuntimeError(
                f"transformers package required for cross-encoder reranking: {e}"
            )

    @staticmethod
    def _has_gpu() -> bool:
        """Check for GPU availability via PyTorch."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False


# ---------------------------------------------------------------
# LLM-based Alternative Reranker (when cross-encoder models unavailable)
# ---------------------------------------------------------------

def rerank_with_llm(
    query: str,
    chunks: List[RankedChunk],
    llm_client,
    top_n: int = 6
) -> List[ReRankResult]:
    """Rerank chunks by prompting an LLM to score each chunk's relevance.

    Uses structured output (JSON) from the LLM to get consistent numeric scores.
    Slower than cross-encoder but domain-adaptable — works well when your corpus
    uses specialized terminology that general reranker models haven't seen.

    Args:
        query: User search query.
        chunks: Candidate chunks from initial retrieval.
        llm_client: LLM client supporting structured JSON output.
        top_n: Number of top-ranked chunks to return.

    Returns:
        List of ReRankResult sorted by LLM-assigned relevance score descending.
    """
    if not query.strip() or not chunks:
        return []

    chunk_descriptions = [
        f"[{i+1}] (source: {getattr(c, 'source_file', 'unknown')}) {c.text[:500]}"
        for i, c in enumerate(chunks[:15])  # Cap at 15 chunks to stay within context window
    ]

    prompt = f"""Evaluate each document chunk's relevance to the query. Return JSON with scores 1-5.

Query: {query}

Chunks to evaluate:
{chr(10).join(chunk_descriptions)}

Return format: {{{{"scores": {{{{"chunk_1": <score>, "chunk_2": <score>, ...}}}}}}}}
"""

    response = llm_client.generate(prompt, response_format="json")
    parsed = response.get("scores", {})

    results = []
    for i, chunk in enumerate(chunks[:len(parsed)]):
        score = float(parsed.get(f"chunk_{i+1}", 0))
        if score >= 3:  # Only keep chunks rated "relevant" or above
            results.append(ReRankResult(
                chunk_id=chunk.chunk_id,
                text=chunk.text,
                original_rrf_score=chunk.rrf_score,
                reranker_score=score / 5.0,  # Normalize to [0, 1]
                new_rank=0
            ))

    results.sort(key=lambda r: r.reranker_score, reverse=True)
    for rank, result in enumerate(results[:top_n], start=1):
        result.new_rank = rank

    return results


# ---------------------------------------------------------------
# BAD vs GOOD: Embedding Model Selection
# ---------------------------------------------------------------

"""
❌ BAD — Using the same embedding model for all document types:

    # One model fits all — ignores domain mismatch
    embeddings = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=chunks  # Works fine for blog posts, fails for code
    )
    # Legal contracts with precise terminology get poor retrieval because
    # text-embedding-3-small was trained on web pages, not legal text.

✅ GOOD — Domain-aware model selection:

    def select_embedding_model(doc_type: str, budget: str) -> str:
        """Choose embedding model matching document domain and cost constraints."""
        if doc_type == "legal":
            return "legal-bert-embedding" if budget == "low" else "text-embedding-3-large"
        elif doc_type == "code":
            return "all-minilm-l6-v2-code" if budget == "low" else "text-embedding-3-large"
        elif doc_type == "scientific":
            return "sciBERT-embeddings"
        return "text-embedding-3-small"  # Default for general text
        
    # Each document type gets an embedding model optimized for its domain vocabulary,
    # producing chunks whose vector representations capture the right semantic signals.
"""
```

---

## Constraints

### MUST DO

1. **Always use hybrid search** (BM25 + vector) in production — never rely on a single retrieval method. The combined approach catches both exact keyword matches and semantically related content.

2. **Apply cross-encoder re-ranking** after initial retrieval before synthesis. This is the single highest-ROI optimization for RAG quality — expect 10–25% improvement in answer accuracy per evaluation benchmarks (RAGAS, DeepEval).

3. **Attach provenance metadata to every chunk** (`source_file`, `page_number`, `section_path`). Citations are meaningless without verifiable source information. Include this metadata in both the vector store and the response output.

4. **Validate embedding dimensions match your vector store** before ingestion. Mismatched dimensions cause silent failures — always verify with a test query against 10 seeded documents.

5. **Normalize all hybrid search scores to [0, 1]** before fusion. RRF avoids this problem, but if using linear weight fusion, unnormalized BM25 and vector scores will be incomparable.

6. **Use sentence-level or semantic boundaries for splitting**, never pure character-count splits, on structured documents (contracts, manuals, reports). Character splits fragment coherent units and produce poor embeddings.

7. **Always verify generated claims against source text** — run a post-processing check that extracts key assertions from the answer and confirms each is traceable to at least one retrieved chunk.

### MUST NOT DO

1. **Never chunk without overlap** — chunks sharing boundary context (10–30% overlap) prevent information loss where topic transitions span sentence boundaries. A gap between chunks means a bridging concept gets lost entirely.

2. **Do not skip the re-ranking step** to save latency in non-trivial applications. The ~80ms CPU cost of BGE-Reranker is negligible compared to the LLM generation time and dramatically improves answer quality. Only skip re-ranking for rapid prototyping or ultra-simple queries against small corpora (< 100 documents).

3. **Do not use raw BM25 TF-IDF scores directly with vector cosine similarity** in linear fusion — they operate on completely different scales. Either use RRF (which is scale-invariant) or normalize each method's scores independently.

4. **Never return hallucinated citations** — if the LLM generates a source reference that doesn't correspond to any retrieved chunk, strip it from the output and flag the response for review. Phantom citations destroy user trust irreparably.

5. **Do not embed queries using the same model without re-embedding** — embedding models drift conceptually over time as training data evolves. Re-embed the existing corpus periodically (quarterly) when switching embedding versions, or the vector index becomes stale relative to live query embeddings.

6. **Never use a single chunk size for all document types** — legal contracts (dense, clause-structured) need 512-token chunks with large overlap; blog posts (loose paragraphs) work well at 1024 tokens with minimal overlap; code files need syntax-aware chunking entirely separate from semantic splitting.

---

## Output Template

When applying this skill, produce the following structured output:

1. **Chunking Strategy Decision** — Document type, chosen strategy (semantic/sentence-window/recursive), chunk size, overlap percentage, and justification for the choice.

2. **Embedding Configuration** — Selected model name, dimensions, normalization status, batch size, vector store type, and any domain-specific model alternatives evaluated.

3. **Hybrid Retrieval Parameters** — BM25 weight, vector weight (or RRF k value), top_k_initial per method, top_k_final after fusion, and evaluation results if a gold-standard QA set is available.

4. **Re-ranking Configuration** — Cross-encoder model name, relevance threshold, GPU/CPU deployment mode, estimated latency overhead, and whether an LLM-based alternative was considered.

5. **Synthesis Prompt Template** — The full prompt template used to inject ranked context into the LLM, including citation formatting instructions and grounding constraints.

6. **Quality Verification Plan** — How retrieved answers will be evaluated (RAGAS fidelity/relevance/context precision metrics, human review process for edge cases).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `memory-systems` | Long-term memory stores and retrieval patterns that complement RAG — vector databases, knowledge graphs, and episodic memory for multi-turn conversations with a single user. |
| `tool-use-function-calling` | When retrieved context is insufficient, use tool calling to fetch additional data from APIs or databases as a fallback before falling back to the LLM's parametric knowledge. |
| `planning-reasoning` | Complex queries often need multi-step retrieval — decompose compound questions into sub-queries, retrieve for each, then synthesize a combined answer using planning strategies. |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [How to Implement RAG with LangChain — LangChain Blog](https://blog.langchain.dev/how-to-implement-rag-with-langchain-and-opensearch/)
- [LangChain RAG Documentation](https://python.langchain.com/docs/use_cases/question_answering/quickstart/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [RAG Evaluation Frameworks — arXiv Survey (2404.13781)](https://arxiv.org/abs/2404.13781)
- [Hybrid Search with BM25 and Vector Embeddings — Pinecone Guide](https://www.pinecone.io/learn/hybrid-search/)
