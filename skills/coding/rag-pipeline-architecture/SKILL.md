---
name: rag-pipeline-architecture
description: Implements production-quality RAG pipelines combining semantic document chunking, hybrid BM25+vector search, cross-encoder and LLM-based re-ranking, and reciprocal rank fusion for maximum retrieval quality.
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
  triggers: rag pipeline, retrieval augmented generation, semantic chunking, hybrid search, BM25, cross-encoder rerank, vector store embeddings, how do i build a RAG system
  related-skills: agent-memory-systems,agent-tool-calling-architecture,prometheus-querying
---

# RAG Pipeline Architecture

Implements production-quality Retrieval-Augmented Generation (RAG) pipelines that retrieve relevant context from external documents and inject it into the LLM prompt. When loaded, this skill makes the model produce state-of-the-art RAG code using semantic chunking, hybrid BM25+vector search, cross-encoder re-ranking, and reciprocal rank fusion — extracted from LlamaIndex production patterns.

## TL;DR Checklist

- [ ] Use semantic chunking (SentenceCombination dissimilarity breakpoints) or sentence-window parsing — never fixed-size character splits
- [ ] Always combine BM25 keyword retrieval with vector search via Reciprocal Rank Fusion (RRF, k=60.0)
- [ ] Apply cross-encoder re-ranking (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`) on top-k candidates before LLM
- [ ] Embed only the core sentence, not window context — exclude `window_metadata_key` from embedding via `excluded_embed_metadata_keys`
- [ ] Set `top_k_retrieval` to ~50 for broad recall, `top_k_rerank` to 5–10 to match LLM context budget
- [ ] Include relevance threshold filtering (default 0.7) when retrieving memories from vector stores

---

## When to Use

Use this skill when:

- Building a RAG system that retrieves relevant documents for LLM answer generation
- Needing semantic-aware document chunking instead of naive fixed-size splits
- Implementing hybrid search combining keyword (BM25) and semantic (vector) retrieval
- Adding cross-encoder or LLM-based re-ranking to improve context quality before the LLM
- Designing production-quality document ingestion pipelines with vector store backends

## When NOT to Use

Avoid this skill for:

- Simple lookup queries that don't require external document retrieval
- Implementing conversation memory or agent context management (use `agent-memory-systems` instead)
- Setting up tool calling architecture for agents (use `agent-tool-calling-architecture` instead)
- Single-document QA where no retrieval pipeline is needed

---

## Core Workflow

1. **Choose a Chunking Strategy** — For most use cases, use `SemanticSplitterNodeParser` which computes cosine dissimilarity between adjacent sentence groups and splits at high-dissimilarity breakpoints (default 95th percentile). For precision-critical queries where exact sentences matter, use `SentenceWindowNodeParser` which embeds single sentences but stores surrounding context in metadata. **Checkpoint:** Verify that each node represents a coherent topic boundary — not a mid-thought split.

2. **Build Hybrid Retrievers** — Initialize both a `VectorIndexRetriever` (semantic search) and a `BM25Retriever` (keyword search) configured with the same `similarity_top_k` (typically 50). The vector retriever captures semantic meaning; BM25 captures exact term matches, proper nouns, and technical terminology. **Checkpoint:** Verify both retrievers return results for an identical query string.

3. **Combine Results with Reciprocal Rank Fusion** — Use RRF formula: `score(doc) = sum(1 / (k + rank_of_doc_in_list_i))` where k=60.0. Weight each retriever's contribution (default [0.5, 0.5]). This produces a single ranked list without requiring normalized scores across retrievers. **Checkpoint:** Verify that documents appearing in both lists receive higher fused scores than those in only one.

4. **Re-rank with Cross-Encoder** — Pass the combined candidate list to `SentenceTransformerRerank` (e.g., model `cross-encoder/ms-marco-MiniLM-L-6-v2`) which computes attention-based relevance scores between the query and each document pair. Return only `top_n` results (typically 5–10). **Checkpoint:** Verify reranked results have higher semantic alignment with the query than the pre-rank candidates.

5. **Assemble LLM Prompt** — Inject reranked context documents into a structured prompt, then call the LLM. If no reranked results exist, return a fallback message rather than hallucinating an answer. **Checkpoint:** Verify that the prompt contains only the top-k reranked contexts and respects LLM token limits.

---

## Implementation Patterns

### Pattern 1: Semantic Document Chunking

Semantic chunking uses embeddings to find natural boundaries between topics instead of splitting by fixed character count. Sentences are embedded in sliding windows, cosine dissimilarity is computed between adjacent groups, and breakpoints above a percentile threshold trigger splits. This produces chunks that align with topic boundaries, dramatically improving retrieval quality.

```python
# Source: run-llama/llama_index — semantic_splitter.py
"""Semantic splitter node parser — splits documents at topic boundaries."""

from typing import Any, Callable, List, Optional, Sequence, TypedDict
import numpy as np

from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.core.node_parser import NodeParser
from llama_index.core.node_parser.text.utils import split_by_sentence_tokenizer
from llama_index.core.schema import BaseNode, Document


class SentenceCombination(TypedDict):
    """Group of sentences evaluated for semantic similarity."""
    sentence: str
    index: int
    combined_sentence: str
    combined_sentence_embedding: List[float]


class SemanticSplitterNodeParser(NodeParser):
    """Splits documents into semantically coherent nodes.

    Algorithm:
    1. Split document into sentences using sentence tokenizer
    2. Embed each sentence (or buffer of N sentences)
    3. Calculate cosine similarity between adjacent sentence groups
    4. Identify breakpoints where dissimilarity exceeds threshold percentile
    5. Group sentences between breakpoints into nodes

    Args:
        embed_model: Embedding model for computing sentence representations.
        buffer_size: Number of sentences to group before comparing (1=sentence-level).
        breakpoint_percentile_threshold: Dissimilarity percentile that triggers a split.
    """

    sentence_splitter: Callable[[str], List[str]] = Field(
        default_factory=split_by_sentence_tokenizer,
        exclude=True,
    )
    embed_model: BaseEmbedding = Field(
        description="The embedding model used for semantic comparison."
    )
    buffer_size: int = Field(default=1, gt=0)
    breakpoint_percentile_threshold: int = Field(default=95, ge=0, le=100)

    @classmethod
    def from_defaults(
        cls,
        embed_model: Optional[BaseEmbedding] = None,
        breakpoint_percentile_threshold: int = 95,
        buffer_size: int = 1,
        sentence_splitter: Optional[Callable[[str], List[str]]] = None,
    ) -> "SemanticSplitterNodeParser":
        """Create parser with defaults.

        Args:
            embed_model: Defaults to OpenAI text-embedding-3-small.
            breakpoint_percentile_threshold: Split threshold (0–100). Lower = more splits.
            buffer_size: Sentences to group before comparing similarity.
            sentence_splitter: Custom sentence splitting function.
        """
        sentence_splitter = sentence_splitter or split_by_sentence_tokenizer()
        from llama_index.embeddings.openai import OpenAIEmbedding
        embed_model = embed_model or OpenAIEmbedding()

        return cls(
            embed_model=embed_model,
            breakpoint_percentile_threshold=breakpoint_percentile_threshold,
            buffer_size=buffer_size,
            sentence_splitter=sentence_splitter,
        )

    def build_semantic_nodes_from_documents(
        self, documents: Sequence[Document]
    ) -> List[BaseNode]:
        """Build semantically coherent nodes from raw documents.

        For each document: split sentences → compute embeddings per group →
        calculate dissimilarity between adjacent groups → find breakpoints →
        group sentences between breakpoints into nodes.

        Args:
            documents: Documents to parse into semantic nodes.

        Returns:
            List of BaseNode objects with text content and metadata.
        """
        all_nodes: List[BaseNode] = []
        for doc in documents:
            sentences = self.sentence_splitter(doc.text)
            if not sentences:
                continue

            # Compute embeddings for sentence groups
            sentence_embeddings: List[List[float]] = []
            for i in range(0, len(sentences), self.buffer_size):
                group_sentences = sentences[i:i + self.buffer_size]
                combined = " ".join(group_sentences)
                embedding = self.embed_model.get_text_embedding(combined)
                sentence_embeddings.append(embedding)

            if len(sentence_embeddings) <= 1:
                # Single chunk — no splitting needed
                all_nodes.extend(
                    self.build_nodes_from_splits([doc.text], doc)
                )
                continue

            # Compute cosine dissimilarity between adjacent groups
            dissimilarities = []
            for i in range(len(sentence_embeddings) - 1):
                emb_a = np.array(sentence_embeddings[i])
                emb_b = np.array(sentence_embeddings[i + 1])
                similarity = np.dot(emb_a, emb_b) / (
                    np.linalg.norm(emb_a) * np.linalg.norm(emb_b)
                )
                dissimilarities.append(1.0 - similarity)

            # Find breakpoints above threshold percentile
            threshold = np.percentile(
                dissimilarities, self.breakpoint_percentile_threshold
            )
            breakpoints = [i for i, d in enumerate(dissimilarities) if d >= threshold]

            # Split sentences at breakpoints into nodes
            split_indices = [0] + [bp + 1 for bp in breakpoints] + [len(sentences)]
            text_splits = [
                " ".join(sentences[split_indices[i]:split_indices[i + 1]])
                for i in range(len(split_indices) - 1)
            ]

            nodes = self.build_nodes_from_splits(text_splits, doc)
            all_nodes.extend(nodes)

        return all_nodes
```

### Pattern 2: Sentence Window Node Parser

Alternative to semantic splitting — splits at sentence boundaries and stores surrounding context in metadata. Each node contains exactly one sentence (embedded for precision), while the window metadata provides broader context for LLM prompts. Used with a "recursive retriever" that first retrieves by window context, then zooms into the specific sentence.

```python
# Source: run-llama/llama_index — sentence_window_parser.py
"""Sentence window node parser — each node is a single sentence with window context."""

from typing import Callable, List, Optional, Sequence

from llama_index.core.node_parser import NodeParser
from llama_index.core.node_parser.text.utils import split_by_sentence_tokenizer
from llama_index.core.schema import BaseNode, Document

DEFAULT_WINDOW_SIZE = 3
DEFAULT_WINDOW_METADATA_KEY = "window"
DEFAULT_OG_TEXT_METADATA_KEY = "original_text"


class SentenceWindowNodeParser(NodeParser):
    """Splits documents at sentence boundaries with surrounding context windows.

    Each node contains exactly one sentence. Metadata includes:
    - window: The sentence plus N sentences before and after (context for LLM)
    - original_text: The exact sentence (for precise display)

    Key insight: embed ONLY the single sentence for precision vector matching,
    but store context in metadata so the retriever fetches broader context
    for the LLM prompt while returning the precise sentence as the result.

    Args:
        window_size: Number of surrounding sentences to include in metadata.
    """

    sentence_splitter: Callable[[str], List[str]] = Field(
        default_factory=split_by_sentence_tokenizer, exclude=True
    )
    window_size: int = Field(default=DEFAULT_WINDOW_SIZE, gt=0)

    @classmethod
    def from_defaults(
        cls,
        sentence_splitter: Optional[Callable[[str], List[str]]] = None,
        window_size: int = DEFAULT_WINDOW_SIZE,
    ) -> "SentenceWindowNodeParser":
        """Create parser with defaults."""
        return cls(
            sentence_splitter=sentence_splitter or split_by_sentence_tokenizer(),
            window_size=window_size,
        )

    def build_window_nodes_from_documents(
        self, documents: Sequence[Document]
    ) -> List[BaseNode]:
        """Build sentence-level nodes with surrounding context windows.

        For each document: split sentences → create one node per sentence →
        add window metadata with surrounding sentences → exclude window from embedding.

        Args:
            documents: Documents to parse into sentence-level nodes.

        Returns:
            List of BaseNode objects, each containing one sentence with window metadata.
        """
        all_nodes: List[BaseNode] = []
        for doc in documents:
            text_splits = self.sentence_splitter(doc.text)
            nodes = self.build_nodes_from_splits(text_splits, doc)

            # Add window context to each node's metadata
            for i, node in enumerate(nodes):
                start_idx = max(0, i - self.window_size)
                end_idx = min(i + self.window_size + 1, len(nodes))
                window_nodes = nodes[start_idx:end_idx]

                window_text = " ".join(n.text for n in window_nodes)
                node.metadata[DEFAULT_WINDOW_METADATA_KEY] = window_text
                node.metadata[DEFAULT_OG_TEXT_METADATA_KEY] = node.text

                # Exclude window from embedding — embed only the core sentence
                node.excluded_embed_metadata_keys.extend([
                    DEFAULT_WINDOW_METADATA_KEY,
                    DEFAULT_OG_TEXT_METADATA_KEY,
                ])
                node.excluded_llm_metadata_keys.extend([
                    DEFAULT_WINDOW_METADATA_KEY,
                    DEFAULT_OG_TEXT_METADATA_KEY,
                ])

            all_nodes.extend(nodes)

        return all_nodes
```

### Pattern 3: Hybrid Search — BM25 + Vector Store

BM25 keyword retrieval excels at exact term matching (proper nouns, technical terms, specific facts), while vector search captures semantic meaning. Used in combination with reciprocal rank fusion to combine their independent rankings into a single ranked list without requiring normalized scores.

```python
# Source: run-llama/llama_index — bm25 retriever integration
"""BM25 keyword retriever for hybrid search alongside vector retrieval."""

from typing import List, Optional
import bm25s
import Stemmer

from llama_index.core.base.base_retriever import BaseRetriever
from llama_index.core.constants import DEFAULT_SIMILARITY_TOP_K
from llama_index.core.schema import BaseNode, NodeWithScore, QueryBundle


class BM25Retriever(BaseRetriever):
    """BM25-based keyword retriever for hybrid search.

    BM25 is a bag-of-words ranking function that excels at:
    - Exact term matching (proper nouns, technical terms)
    - Short query retrieval
    - Finding specific facts and figures

    Used in combination with vector search — results from both are combined
    using Reciprocal Rank Fusion (RRF) for final ranking.

    Args:
        nodes: Documents to index before querying.
        similarity_top_k: Maximum results to return per query.
    """

    def __init__(
        self,
        nodes: Optional[List[BaseNode]] = None,
        similarity_top_k: int = DEFAULT_SIMILARITY_TOP_K,
    ) -> None:
        self.stemmer = Stemmer.Stemmer("english")
        self.similarity_top_k = similarity_top_k

        if nodes is not None:
            # Build BM25 inverted index from node texts
            self.corpus = [
                {"text": node.get_content(), "node_id": node.node_id}
                for node in nodes
            ]
            tokenizer = bm25s.Tokenization(stemmer=self.stemmer.stem, stopwords=None)
            self.bm25 = bm25s.BM25(tokenizer=tokenizer)
            texts = [doc["text"] for doc in self.corpus]
            self.bm25.fit(texts)
        else:
            raise ValueError("Must provide nodes or an existing BM25 object")

    def retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Retrieve documents using BM25 keyword matching.

        Args:
            query_bundle: Contains the query string and any filters.

        Returns:
            Ranked list of NodeWithScore objects with BM25 scores.
        """
        query_text = query_bundle.query_str
        query_tokens = bm25s.tokenize(
            [query_text], stemmer=self.stemmer.stem,
        )

        ranked_documents, scores = self.bm25.retrieve(
            query_tokens, k=self.similarity_top_k
        )

        nodes: List[NodeWithScore] = []
        for doc_idx, score in zip(ranked_documents[0], scores[0]):
            corpus_item = self.corpus[doc_idx]
            node_id = corpus_item.get("node_id")
            node = self._get_node_by_id(node_id)
            if node:
                nodes.append(NodeWithScore(node=node, score=float(score)))

        return sorted(nodes, key=lambda x: x.score or 0, reverse=True)

    def _get_node_by_id(self, node_id: str) -> Optional[BaseNode]:
        """Look up a BaseNode by its ID from the corpus."""
        for item in self.corpus:
            if item.get("node_id") == node_id:
                return item.get("_node_obj")
        return None
```

### Pattern 4: Cross-Encoder Re-Ranking

After initial retrieval (BM25 + vectors), a cross-encoder reranker re-scores all candidates. Unlike bi-encoders that embed documents and queries independently, cross-encoders process the `[query, document]` pair through a single transformer model with full attention between all token pairs, producing much higher quality relevance scores.

```python
# Source: run-llama/llama_index — sbert_rerank.py
"""Cross-encoder reranking using SentenceTransformers CrossEncoder models."""

from typing import List, Optional

from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import MetadataMode, NodeWithScore, QueryBundle


class SentenceTransformerRerank(BaseNodePostprocessor):
    """Cross-encoder reranker using sentence-transformers.

    Unlike bi-encoders (embed documents and queries independently),
    cross-encoders process the [query, document] pair through a single
    transformer model, computing attention between all token pairs. This
    produces much higher quality relevance scores at O(n*m) cost.

    Use pattern: Retrieve ~50 candidates via BM25+vector → Rerank top 10–20
    with cross-encoder before passing to LLM.

    Args:
        model: CrossEncoder model name (e.g., "cross-encoder/ms-marco-MiniLM-L-6-v2").
        top_n: Number of highest-scoring results to keep after reranking.
        device: Computation device ("cpu", "cuda").
    """

    DEFAULT_MODEL = "cross-encoder/stsb-distilroberta-base"

    def __init__(
        self,
        top_n: int = 2,
        model: str = DEFAULT_MODEL,
        device: Optional[str] = None,
        keep_retrieval_score: bool = False,
        trust_remote_code: bool = True,
    ) -> None:
        """Initialize the cross-encoder reranker.

        Recommended models:
        - "cross-encoder/ms-marco-MiniLM-L-6-v2" — fast, good quality (default)
        - "BAAI/bge-reranker-large" — higher quality, slower
        """
        from sentence_transformers import CrossEncoder
        device = self._infer_torch_device() if device is None else device

        self.top_n = top_n
        self.model = model
        self.device = device
        self.keep_retrieval_score = keep_retrieval_score

        self._model = CrossEncoder(
            model,
            max_length=512,
            device=device,
            trust_remote_code=trust_remote_code,
        )

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """Re-score retrieved nodes using cross-encoder relevance scores.

        This is the critical step in a high-quality RAG pipeline:
        1. Fast retriever returns ~50 candidates via BM25 + vector search
        2. Cross-encoder re-scores ALL candidates with deep attention
        3. Top N results are returned to the LLM

        Args:
            nodes: Pre-retrieved nodes with initial scores.
            query_bundle: The original query for context matching.

        Returns:
            Re-ranked list containing only top_n highest-scoring nodes.
        """
        if query_bundle is None:
            raise ValueError("Query bundle must be provided for reranking.")
        if not nodes:
            return []

        # Build (query, document_text) pairs for batch scoring
        query_and_nodes = [
            (
                query_bundle.query_str,
                node.node.get_content(metadata_mode=MetadataMode.EMBED),
            )
            for node in nodes
        ]

        # Score all pairs in a single model inference (batch processing)
        scores = self._model.predict(query_and_nodes)

        assert len(scores) == len(nodes), "Score count must match node count"

        # Apply cross-encoder scores to nodes
        for node, score in zip(nodes, scores):
            if self.keep_retrieval_score:
                node.node.metadata["retrieval_score"] = node.score
            node.score = score

        # Return top N results sorted by relevance score (descending)
        ranked = sorted(
            nodes, key=lambda x: -x.score if x.score else 0
        )[: self.top_n]

        return ranked
```

### Pattern 5: Reciprocal Rank Fusion for Hybrid Combining

The industry-standard method for combining heterogeneous retrievers (BM25 + vector search). RRF does not require normalized scores — each list contributes based on rank position only. This is the critical fusion step in any production RAG pipeline.

```python
"""Reciprocal Rank Fusion (RRF) for combining BM25 and vector retrieval results."""

from typing import Dict, List


def reciprocal_rank_fusion(
    result_lists: List[List["NodeWithScore"]],
    ranks_weights: List[float],
    k: float = 60.0,
) -> List["NodeWithScore"]:
    """Combine multiple ranked result lists using Reciprocal Rank Fusion.

    RRF formula: score(document) = sum(weight_i / (k + rank_of_doc_in_list_i))
    where k is a tuning constant (typically 60). This method does not require
    normalized scores across retrievers — each list contributes based purely
    on rank position, making it ideal for combining BM25 and vector results.

    Args:
        result_lists: Multiple sorted result lists from different retrievers
                      (e.g., vector search results + BM25 results).
        ranks_weights: Weight for each retriever's contribution. Should sum to 1.0.
                       Example: [0.5, 0.5] for equal weighting.
        k: RRF tuning constant. Lower values (e.g., 20) emphasize top ranks more;
           standard value is 60.0.

    Returns:
        Combined list of NodeWithScore with fused RRF scores, sorted descending.
    """
    rrf_scores: Dict[str, float] = {}

    for results, weight in zip(result_lists, ranks_weights):
        for rank, node_with_score in enumerate(results, start=1):
            node_id = node_with_score.node.node_id
            current_score = rrf_scores.get(node_id, 0.0)
            rrf_scores[node_id] = current_score + weight / (k + rank)

    # Sort by fused score descending and map back to NodeWithScore objects
    sorted_nodes = sorted(
        rrf_scores.items(), key=lambda x: x[1], reverse=True
    )

    id_to_node = {n.node.node_id: n for sublist in result_lists for n in sublist}
    combined: List["NodeWithScore"] = []
    for node_id, score in sorted_nodes:
        if node_id in id_to_node:
            entry = id_to_node[node_id]
            entry.score = score
            combined.append(entry)

    return combined
```

---

## Complete RAG Pipeline Assembly

Putting all patterns together into a production-quality pipeline:

```python
# Source: synthesis of LlamaIndex production patterns
"""Production-quality RAG pipeline — full assembly."""

from typing import Any, List, Optional

from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.retrievers import VectorIndexRetriever, BM25Retriever
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.core.schema import QueryBundle, NodeWithScore, HumanMessage
from llama_index.embeddings.openai import OpenAIEmbedding


class ProductionRAGPipeline:
    """Production-quality RAG pipeline combining chunking, hybrid search, and re-ranking.

    Pipeline stages:
    1. Document ingestion → Semantic chunking or sentence-window parsing
    2. Embedding generation → text-embedding-3-small (or local equivalent)
    3. Storage → Vector store + BM25 inverted index (hybrid retrieval)
    4. Query time → Hybrid search (BM25 + vector) → Cross-encoder rerank → LLM

    This is the state-of-the-art RAG pipeline as of 2025–2026, used by production
    systems at scale. The combination consistently outperforms any single technique.
    """

    def __init__(
        self,
        vector_store: Any,
        embedding_model: Optional[OpenAIEmbedding] = None,
        reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k_retrieval: int = 50,
        top_k_rerank: int = 10,
        chunk_strategy: str = "semantic",
    ) -> None:
        """Initialize the RAG pipeline.

        Args:
            vector_store: Backend for storing embeddings (Qdrant, Pinecone, Weaviate).
            embedding_model: Text embedding model. Defaults to OpenAI text-embedding-3-small.
            reranker_model: Cross-encoder model name for re-ranking.
            top_k_retrieval: Candidates from initial hybrid retrieval (~50 for best recall).
            top_k_rerank: Final count after re-ranking (match LLM context budget).
            chunk_strategy: "semantic", "sentence_window", or "recursive".
        """
        self.vector_store = vector_store
        self.embedding_model = embedding_model or OpenAIEmbedding(
            model="text-embedding-3-small"
        )
        self.top_k_retrieval = top_k_retrieval
        self.top_k_rerank = top_k_rerank
        self.chunk_strategy = chunk_strategy

        self.vector_retriever = VectorIndexRetriever(
            vector_store=vector_store,
            embedding_model=self.embedding_model,
            similarity_top_k=top_k_retrieval,
        )

        self.reranker = SentenceTransformerRerank(
            model=reranker_model,
            top_n=top_k_rerank,
            device="cuda" if __import__("torch").cuda.is_available() else "cpu",
            keep_retrieval_score=True,
        )

    def ingest_documents(self, documents: List[Any]) -> None:
        """Ingest and chunk documents into vector store + BM25 index.

        Args:
            documents: List of Document objects to ingest.
        """
        if self.chunk_strategy == "semantic":
            parser = SemanticSplitterNodeParser.from_defaults(
                embed_model=self.embedding_model,
                breakpoint_percentile_threshold=95,
            )
        elif self.chunk_strategy == "sentence_window":
            parser = SentenceWindowNodeParser.from_defaults(window_size=3)
        else:
            from llama_index.core.node_parser.text import TokenTextSplitter
            parser = TokenTextSplitter(chunk_size=1024, chunk_overlap=200)

        nodes = parser.parse_nodes_from_documents(documents)

        for node in nodes:
            embedding = self.embedding_model.get_text_embedding(node.text)
            self.vector_store.add(
                ids=[node.node_id],
                embeddings=[embedding],
                payloads=[{"text": node.text, **node.metadata}],
            )

        self.bm25_retriever = BM25Retriever(nodes=nodes)

    def query(self, user_query: str) -> str:
        """Execute a full RAG query through all pipeline stages.

        Flow: hybrid retrieval → RRF fusion → cross-encoder rerank → LLM prompt.

        Args:
            user_query: Natural language question to answer.

        Returns:
            Generated answer based on retrieved context, or fallback message.
        """
        query_bundle = QueryBundle(query_str=user_query)

        # Stage 1: Parallel hybrid retrieval
        vector_results = self.vector_retriever.retrieve(query_bundle)
        bm25_results = self.bm25_retriever.retrieve(query_bundle)

        # Stage 2: RRF fusion to combine results
        combined = reciprocal_rank_fusion(
            [vector_results, bm25_results],
            ranks_weights=[0.5, 0.5],
        )

        # Stage 3: Cross-encoder re-ranking for precise relevance scoring
        reranked = self.reranker.postprocess_nodes(combined, query_bundle)

        if not reranked:
            return "I don't have enough information to answer this question."

        # Stage 4: Build prompt and generate answer
        context_text = "\n\n---\n\n".join(
            node.node.get_content() for node in reranked[: self.top_k_rerank]
        )

        prompt = f"""Use the following context to answer the question. If the context
doesn't contain relevant information, say so.

Context:
{context_text}

Question: {user_query}

Answer:"""

        response = self.llm.invoke([HumanMessage(content=prompt)])
        return response.content
```

---

## Constraints

### MUST DO
- Always use semantic chunking or sentence-window parsing — never fixed-size character splits that break topic boundaries mid-thought
- Combine BM25 keyword search with vector retrieval via Reciprocal Rank Fusion (RRF, k=60.0) — vector-only search misses exact terms and proper nouns
- Apply cross-encoder re-ranking on all candidate results before passing to the LLM — this is the single biggest quality improvement for RAG pipelines
- Embed only the core sentence, not window context — exclude `window_metadata_key` from embedding via `excluded_embed_metadata_keys`
- Keep `top_k_rerank` small (5–10) to fit within LLM context windows while maintaining high relevance
- Use modern embedding models: `text-embedding-3-small` (OpenAI) or `bge-large-en` (open source) — avoid outdated models

### MUST NOT DO
- Use fixed-size character chunking (e.g., 512-char splits) as the default strategy — it fragments coherent context
- Skip re-ranking entirely in production pipelines — raw BM25+vector results consistently underperform reranked results
- Embed window context or metadata into vectors — this pollutes semantic similarity with non-query-relevant text
- Pass more than 10–15 retrieved chunks to the LLM — dilutes attention and wastes tokens on irrelevant context
- Use a single retriever without hybrid fusion — BM25 catches what vectors miss (exact terms, names, dates)

---

## Output Template

When this skill is active, produce:

1. **Pipeline Architecture Diagram** — ASCII art showing document flow: ingestion → chunking → embedding → storage → retrieval → fusion → reranking → LLM
2. **Chunking Strategy Recommendation** — Semantic vs sentence-window vs recursive with justification based on the use case
3. **Complete Code Implementation** — Production-ready Python classes following the patterns above with proper type hints and docstrings
4. **Hyperparameter Recommendations** — Specific values for `top_k_retrieval`, `top_k_rerank`, `breakpoint_percentile_threshold`, RRF `k` constant, and reranker model selection

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-memory-systems` | Long-term vector memory retrieval — shares the same embedding + vector store patterns |
| `agent-tool-calling-architecture` | Tool calling for agents — RAG context injection often feeds into tool-augmented agents |

> 📖 skill(local cache): agent-memory-systems, agent-tool-calling-architecture
