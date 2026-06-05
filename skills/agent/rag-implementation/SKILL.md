---




name: rag-implementation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent rag implementation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: rag-implementation, rag implementation, how do i rag-implementation, orchestrate
    rag-implementation, automate rag-implementation, agent rag-implementation
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
version: "1.0.0"




---




# Rag Implementation

Orchestrates intelligent skill selection and execution for rag implementation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def select_rag_pipeline(
    query: str,
    document_metadata: List[Dict],
    config: Dict
) -> Dict:
    """Select optimal RAG pipeline configuration based on query complexity and document type.
    
    Evaluates document structure (PDF, markdown, code) and query intent to choose:
    - Chunking strategy (semantic, hierarchical, or code-aware)
    - Embedding model (lightweight vs. high-accuracy)
    - Vector store parameters (top_k, similarity metric)
    
    Args:
        query: User's natural language question
        document_metadata: List of dicts with doc_type, size, language
        config: Global RAG configuration overrides
        
    Returns:
        Pipeline configuration dict with selected components
    """
    if not query or not document_metadata:
        raise ValueError("Query and document metadata are required for RAG pipeline selection")
        
    doc_type = _infer_dominant_doc_type(document_metadata)
    query_complexity = _assess_query_complexity(query)
    
    if doc_type == "code" or query_complexity == "high":
        pipeline = {
            "chunker": "code_aware_recursive",
            "chunk_size": 512,
            "overlap": 50,
            "embedder": "text-embedding-3-large",
            "vector_store": "faiss",
            "top_k": 8,
            "reranker": True
        }
    elif doc_type == "pdf":
        pipeline = {
            "chunker": "semantic_pdf",
            "chunk_size": 1024,
            "overlap": 200,
            "embedder": "text-embedding-3-small",
            "vector_store": "pinecone",
            "top_k": 5,
            "reranker": False
        }
    else:
        pipeline = {
            "chunker": "recursive_text",
            "chunk_size": 768,
            "overlap": 150,
            "embedder": "text-embedding-3-small",
            "vector_store": "chroma",
            "top_k": 5,
            "reranker": False
        }
        
    pipeline["selection_reason"] = f"doc_type={doc_type}, complexity={query_complexity}"
    return pipeline
```


### Pattern 2: Execution with Fallback

```python
def execute_rag_query(
    query: str,
    pipeline_config: Dict,
    vector_store_client: Any,
    llm_client: Any
) -> Dict:
    """Execute RAG retrieval and generation with hybrid fallback chain.
    
    Implements resilient RAG execution:
    1. Primary: Embed query -> Vector search -> Rerank -> LLM generate
    2. Fallback 1: Keyword/BM25 search if vector search returns low confidence
    3. Fallback 2: Direct LLM call with query only if retrieval fails completely
    
    Args:
        query: User question
        pipeline_config: Output from select_rag_pipeline
        vector_store_client: Initialized vector database client
        llm_client: Initialized LLM client
        
    Returns:
        Dict with answer, sources, confidence, and fallback_used
    """
    sources = []
    confidence = 0.0
    fallback_used = False
    
    try:
        # Primary execution: Vector retrieval
        query_embedding = llm_client.embed(query)
        results = vector_store_client.search(
            vector=query_embedding, 
            top_k=pipeline_config["top_k"],
            metric="cosine"
        )
        
        if results and results[0].score > 0.65:
            sources = results
            confidence = results[0].score
        else:
            # Fallback 1: Keyword search
            sources = vector_store_client.keyword_search(query, top_k=5)
            fallback_used = True
            confidence = 0.5 if sources else 0.0
            
    except VectorStoreConnectionError:
        # Fallback 2: Direct LLM generation
        sources = []
        confidence = 0.2
        fallback_used = True
        
    # Construct prompt and generate
    context_text = "\n\n".join([doc.content for doc in sources])
    prompt = f"Context:\n{context_text}\n\nQuestion: {query}\nAnswer:"
    
    try:
        answer = llm_client.generate(prompt, temperature=0.1)
        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "fallback_used": fallback_used,
            "latency_ms": _measure_latency()
        }
    except LLMTimeoutError:
        raise RAGExecutionError("LLM generation timed out after fallback chain")
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|---|---|
| `rag-pipelines` | Full RAG pipeline design with hybrid retrieval and re-ranking |
| `agent-context-management` | Managing retrieved context within agent conversation windows |

---

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [RAG — Paul Graham Essay](https://paulgraham.com/rags.html)
- [LangChain RAG Tutorial — Pinecone Docs](https://www.pinecone.io/learn/series/langchain/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [RAG Evaluation Frameworks — arXiv Survey](https://arxiv.org/abs/2404.13781)
- [Vector Search and Embeddings Guide — Pinecone](https://www.pinecone.io/learn/vector-databases/)