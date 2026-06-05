# Scaling Guide

This guide documents the performance characteristics and scaling limits of the Agent Skill Routing System.

---

## Current Scale

The system is tested and verified at **911+ skills**. All benchmarks below use the target scale of **10,000 skills** with **1536-dimensional embeddings**.

---

## Auto-Skill Creation Feature

The system includes an auto-skill creation feature that generates new `SKILL.md` files when no existing skill matches a routing query above a configurable confidence threshold.

### Architecture

| Component | Location | Purpose |
|---|---|---|
| `AutoSkillCreator` | `src/core/AutoSkillCreator.ts` | Orchestrates skill generation pipeline |
| `SkillCreationTracker` | `src/core/SkillCreationTracker.ts` | Persists and queries auto-created skill metadata |
| `POST /skill/create` | `src/index.ts:358-432` | Endpoint that triggers creation |
| `GET /skills/created` | `src/index.ts:433-455` | Lists all auto-created skills |

### Configuration

| Env Var | Default | Description |
|---|---|---|
| `AUTO_SKILL_CREATION_ENABLED` | `true` | Master switch for auto-creation when no good match exists |
| `AUTO_SKILL_CONFIDENCE_THRESHOLD` | `0.35` | Minimum routing confidence before triggering creation (0.0–1.0) |
| `AUTO_SKILL_MAX_RETRIES` | `3` | Maximum LLM retry attempts on generation failure (1–10) |
| `AUTO_SKILL_ENABLED` | `true` | Master switch for the MCP generation tool registration |

### Performance at Scale

- **Creation latency**: ~2–8 seconds per skill (LLM generation + validation)
- **Retry cost**: Each retry adds ~2–8s; with default 3 retries, worst case ~24s per failed creation
- **Persistence overhead**: ~50ms per created skill (JSON index append + cache update)
- **Storage impact**: Each auto-created skill adds ~3–10 KB to the skills directory

### Token Cost Management

Auto-skill creation consumes LLM tokens for generation. To manage costs at scale:

1. **Raise confidence threshold** (`AUTO_SKILL_CONFIDENCE_THRESHOLD=0.5`): Only create when queries are genuinely unmatched
2. **Disable auto-creation** (`AUTO_SKILL_CREATION_ENABLED=false`): Fall back to manual skill creation only
3. **Use smaller models** for generation (`AUTO_SKILL_MODEL=gpt-4o-mini`): Cheaper per-token but potentially lower quality

---

## Skill Validation Pipeline

The system enforces skill quality through a 3-phase pre-commit validation pipeline that runs before any `SKILL.md` is committed to the repository.

### Phase 1: Structural Checks

Runs `scripts/validate_skill_yaml.py` with 8 deterministic checks:

| # | Check | Severity |
|---|---|---|
| 1 | YAML frontmatter must parse correctly with `yaml.safe_load()` | Fatal |
| 2 | `name:` field MUST exactly match the directory name (kebab-case) | Fatal |
| 3 | `version:` field must be quoted — use `"1.0.0"` not `1.0.0` | Warning |
| 4 | Frontmatter delimiters must be exactly `---` (not more dashes) | Fatal |
| 5 | `name:` must appear on line 2, immediately after opening `---` | Fatal |
| 6 | Metadata block MUST include: `triggers`, `domain`, `role`, `scope`, `output-format` | Fatal |
| 7 | Triggers must have 3–8 comma-separated terms | Warning |
| 8 | Implementation/review skills MUST have `## Constraints` with `### MUST DO`/`### MUST NOT DO` | Fatal |

### Phase 2: Stub Detection

Runs bash-based static checks via `scripts/validate_skill.sh`:

- File must be ≥ 3,000 bytes of content (excluding frontmatter)
- No stub sentinel text: `"Implementing this specific pattern or feature"`
- At least 2 fenced code blocks with **real** code (for implementation skills)
- No generic workflow steps like `"Identify the use case"`, `"Apply the pattern"`, `"Validate and test"`
- Routing metadata fields (`archetypes`, `anti_triggers`, `response_profile`) must be present

### Phase 3: LLM Quality Check (Optional)

When `--llm` flag is passed, runs an LLM-based quality assessment on skill content depth, specificity, and usefulness.

### Bypass Mechanism

```bash
# Emergency bypass for the pre-commit hook validation
SKIP_SKILL_VALIDATE=1 git commit -m "..."
```

---

## Benchmarks (10K Skills × 1536d Embeddings)

| Operation | Measured Time | Target | Verdict |
|---|---|---|---|
| Startup (cold, no cache) | ~30s (50 embedding API calls × ~500ms) | < 60s | ✅ |
| Startup (warm, cached) | < 1s | < 5s | ✅ |
| HNSW index build (10K skills, ef=50) | **28.6s** | < 120s | ✅ |
| HNSW single query (10K × 1536d) | **1.10ms** | < 5ms | ✅ |
| HNSW batch query (10 queries) | **19.8ms** (2ms avg) | < 50ms | ✅ |
| HNSW recall @ 20 (vs brute-force) | **96.0%** | > 90% | ✅ |
| Brute-force fallback single query | **20.2ms** | < 100ms | ✅ |
| Compression warmup (500 skills) | ~30s | < 60s | ✅ |

> **Note:** Tests run on modern x86-64 hardware. ARM (Apple Silicon) benchmarks are comparable.

---

## Architecture Component Scaling

| Component | Algorithmic Complexity | 10K Assessment | Bottleneck? |
|---|---|---|---|
| Embedding cache loading | O(n) async concurrent | ~100ms for 10K files | No |
| Embedding generation (API calls) | O(n/batchSize) | ~50 API calls for 10K | Cold start only |
| HNSW index build | O(n log n) | ~29-120s for 10K | Cold start only |
| HNSW search | O(log n) approximate | **~1ms** for 10K × 1536d | No |
| Vector similarity search (brute-force fallback) | O(n × d) | ~20ms for 10K × 1536d | Fallback only |
| BM25 indexing | O(n × avgDocLen) | ~2s for 10K | No |
| BM25 search | O(n) per query | ~5ms for 10K | No |
| MMR diversification | O(k²) where k=topK=10 | ~0.1ms | No |
| Compression cache (LRU) | O(1) get/set | ~0.01ms | No |
| In-memory Map lookup | O(1) average | ~0.001ms per skill | No |

---

## Approximate Nearest Neighbor Search (HNSW)

The system uses **HNSW (Hierarchical Navigable Small World)** graphs for approximate nearest neighbor search, replacing the previous KD-tree implementation.

### Why HNSW

KD-trees suffer from the **curse of dimensionality** at 1536 dimensions — splitting hyperplanes cannot prune effectively, making search O(n) with higher overhead than brute-force. HNSW handles high dimensions significantly better:

| Metric | KD-tree (at 1536d) | HNSW (at 1536d) | Improvement |
|---|---|---|---|
| Build time (10K skills) | Disabled (O(n²) bug) | 28.6s (ef=50) / ~120s (ef=200) | ✅ Functional |
| Search time (10K skills) | O(n) (no pruning) | **1.10ms** | 18× faster |
| Recall @ 20 | Exact (but slow) | **96.0%** (ef=50) / **~99%** (ef=200) | Approximate |

### HNSW Configuration

| Parameter | Default | Description |
|---|---|---|
| `HNSW_M` | 16 | Max bidirectional connections per element per layer |
| `HNSW_EF_CONSTRUCTION` | 200 | Candidate list size during index construction (higher = better recall, slower build) |
| `HNSW_EF_SEARCH` | 100 | Candidate list size during search (higher = better recall, slower query) |

### Performance Tuning

For faster builds during development:
```
HNSW_EF_CONSTRUCTION=50 HNSW_EF_SEARCH=50
```

For maximum recall in production:
```
HNSW_EF_CONSTRUCTION=200 HNSW_EF_SEARCH=200
```

### Recall Benchmarks

| Configuration | Recall @ 20 | Build Time (10K) | Query Time |
|---|---|---|---|
| efConstruction=50, efSearch=50 | 96.0% | ~29s | ~1.1ms |
| efConstruction=200, efSearch=100 | ~99% | ~120s | ~2-3ms |
| efConstruction=200, efSearch=200 | ~99.5% | ~120s | ~5ms |

> HNSW recall is measured against brute-force cosine similarity ground truth. 96% recall means 19.2 of the top-20 results match exact search. The hybrid scoring pipeline (BM25, triggers, archetypes) compensates for the ~4% positional difference.

---

## Memory Usage Estimates

| Component | Per 1K Skills | Per 10K Skills | Notes |
|---|---|---|---|
| Raw SKILL.md content | ~15 MB | ~150 MB | Variable, depends on skill size |
| Compressed content (Level 5) | ~3 MB | ~30 MB | ~80% reduction |
| Embeddings (1536d float32) | ~6 MB | ~60 MB | 4 bytes × 1536 ≈ 6KB per skill |
| BM25 index | ~1 MB | ~10 MB | Term frequency tables |
| MMR state | ~0.1 MB | ~0.1 MB | Fixed size (topK=10) |
| Total (compressed) | ~10 MB | ~100 MB | Excluding raw content |
| Total (uncompressed) | ~22 MB | ~220 MB | Full raw content |

> **Note:** The compression cache is bounded by `COMPRESSION_CACHE_SIZE_MB` (default: 1024 MB).

---

## Token Usage & Tracking

The system manages token consumption through the skill compression subsystem, which reduces each SKILL.md before embedding it into LLM context windows.

### Compression Levels and Token Impact

| Level | Technique | Est. Savings | Use Case |
|---|---|---|---|
| 0 | No compression (original) | 0% | Debugging, small skill sets (<1K) |
| 1–2 | Remove blank lines/comments | ~5% | Minimal reduction needed |
| 3–4 | Collapse "Core Workflow" to paragraph | ~28% | Default production setting |
| 5 | Remove related-skills table | ~35% | Aggressive token savings |
| 6 | Remove markdown formatting | ~42% | High-density content needed |
| 7+ | Remove code examples, abbreviate sections | 55–85% | Extreme scale (>5K skills) |

### Token Budget Planning

For a given number of skills and compression level:

| Skills | Level 0 (raw) | Level 4 (default) | Level 6 (aggressive) |
|---|---|---|---|
| 1,000 | ~15 MB (~10K tokens) | ~3 MB (~2K tokens) | ~1.5 MB (~1K tokens) |
| 10,000 | ~150 MB (~100K tokens) | ~30 MB (~20K tokens) | ~15 MB (~10K tokens) |
| 50,000 | ~750 MB (~500K tokens) | ~150 MB (~100K tokens) | ~75 MB (~50K tokens) |

> **Note:** Token estimates assume ~650 chars per token. Actual values vary by content type (code vs prose).

### Cost Management at Scale

1. **Compression warmup** pre-compresses top N skills so first requests are fast:
   - `COMPRESSION_WARMUP_SKILLS=500` (default): ~30s for 500 skills
   - Higher values = more pre-warmed skills but longer startup
2. **Adaptive TTL** keeps frequently accessed skills in cache longer:
   - Hot skills: 30 min TTL, Cold skills: 60 min TTL
3. **Lazy writes** debounce compression output to reduce I/O pressure

---

## Startup Time

### Cold Start (no cached embeddings)

First-time startup requires generating embeddings via API calls:
- **10K skills** → ~50 API calls (batch size 200) × ~500ms = ~25s
- **1K skills** → ~5 API calls × ~500ms = ~2.5s

The server becomes available immediately (port bound), while embeddings generate in the background. `/health` returns `ready: false` until complete.

### Warm Start (cached embeddings)

If the embedding cache directory (`~/.embedding-cache/`) persists between restarts:
- **10K skills** → < 1s startup (async file reads, no API calls)
- Cache survives Docker container restarts if a volume is mounted

### Compression Warmup

On startup, the top N skills are pre-compressed into the cache:
- `COMPRESSION_WARMUP_SKILLS=500` (default): ~30s for 500 skills
- `COMPRESSION_WARMUP_SKILLS=0`: Disables warmup (faster startup, slower first request)
- Warmup runs asynchronously and does not block server readiness

---

## Configuration for Scaling

| Env Var | Default | Recommendation at 10K |
|---|---|---|
| `MAX_SKILLS` | (unlimited) | Set to 10000 to cap memory |
| `COMPRESSION_CACHE_SIZE_MB` | 1024 | Keep default (1GB covers 10K skills) |
| `COMPRESSION_WARMUP_SKILLS` | 500 | 500 for 10K (5% is a good ratio) |
| `COMPRESSION_BATCH_SIZE` | 10 | 10-20 for 10K |
| `EMBEDDING_BATCH_SIZE` | 100 | Keep default |
| `SKILL_SYNC_INTERVAL` | 3600 | Keep default (1 hour) |

---

## When to Re-Benchmark

Re-run the 10K benchmark suite when:
- Changing the embedding provider (dimension changes)
- Adding new retrieval components
- Changing the similarity algorithm
- Deploying to new hardware

Run:
```bash
cd agent-skill-routing-system
npx jest --testPathPattern="10k.benchmark" --verbose
```

---

## Known Limits

| Limit | Value | Notes |
|---|---|---|
| Tested skills | 10,000 | Benchmarked and verified |
| Max skills (in-memory) | ~50,000 | Memory-bound (~1GB for full content) |
| Max skills (compression cache) | ~100,000 | Cache-size bound at 1024MB default |
| Max embedding dimension | 1536 | text-embedding-3-small, configurable |
| Max query throughput | ~38 queries/s (10K skills) | Brute-force at 1536d |

Beyond these limits, consider:
- **Sharding** skills across multiple router instances by domain
- **Product Quantization (PQ)** for compressed vector search (ANN)
- **Approximate Nearest Neighbor (ANN)** libraries (e.g., FAISS, Annoy)
- **External vector database** (Pinecone, Weaviate, Qdrant)
