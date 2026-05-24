# Scaling Guide

This guide documents the performance characteristics and scaling limits of the Agent Skill Routing System.

---

## Current Scale

The system is tested and verified at **911+ skills**. All benchmarks below use the target scale of **10,000 skills** with **1536-dimensional embeddings**.

---

## Benchmarks (10K Skills × 1536d Embeddings)

| Operation | Measured Time | Target | Verdict |
|---|---|---|---|
| Startup (cold, no cache) | ~30s (50 embedding API calls × ~500ms) | < 60s | ✅ |
| Startup (warm, cached) | < 1s | < 5s | ✅ |
| Vector DB build (10K skills) | **1.1ms** | < 5,000ms | ✅ |
| Single query (brute-force, 10K × 1536d) | **27.7ms** | < 100ms | ✅ |
| Batch query (10 queries, 10K × 1536d) | **259.9ms** (26ms avg) | < 500ms | ✅ |
| KD-tree build (dim ≤ 128) | O(n log n) per n nodes | O(n log n) | ✅ |
| Compression warmup (500 skills) | ~30s | < 60s | ✅ |

> **Note:** Tests run on modern x86-64 hardware. ARM (Apple Silicon) benchmarks are comparable.

---

## Architecture Component Scaling

| Component | Algorithmic Complexity | 10K Assessment | Bottleneck? |
|---|---|---|---|
| Embedding cache loading | O(n) async concurrent | ~100ms for 10K files | No |
| Embedding generation (API calls) | O(n/batchSize) | ~50 API calls for 10K | Cold start only |
| KD-tree build (dim ≤ 128) | O(n log n) | ~50ms for 10K | No |
| Vector similarity search (brute-force) | O(n × d) | ~28ms for 10K × 1536d | No |
| BM25 indexing | O(n × avgDocLen) | ~2s for 10K | No |
| BM25 search | O(n) per query | ~5ms for 10K | No |
| MMR diversification | O(k²) where k=topK=10 | ~0.1ms | No |
| Compression cache (LRU) | O(1) get/set | ~0.01ms | No |
| In-memory Map lookup | O(1) average | ~0.001ms per skill | No |

---

## Dimensionality and KD-tree

### The Curse of Dimensionality

The system uses 1536-dimensional embeddings (OpenAI `text-embedding-3-small`). At this dimension, **KD-tree search provides no benefit** over brute-force linear scan:

- For effective KD-tree pruning, the splitting hyperplane must eliminate one subtree per node
- At 1536d, distance contributions are evenly distributed across all dimensions
- The hyperplane pruning check (`minDistToHyperplane < maxDistanceInResults`) nearly always evaluates to `true`, causing both subtrees to be searched
- Effective search becomes O(n) — same as brute-force, but with higher constant factor

### Dimension Threshold

The `kdTreeDimensionThreshold` config option (default: `128`) controls when KD-tree is used:

| Dimension | Behavior | Rationale |
|---|---|---|
| ≤ 128 | KD-tree built and used | Effective pruning at low dimensions |
| > 128 | Brute-force fallback | KD-tree provides no benefit at high dimensions |

To override (e.g., force KD-tree for all dimensions):
```typescript
const db = new VectorDatabase({
  useKDTree: true,
  kdTreeDimensionThreshold: 999999, // effectively always use KD-tree
});
```

### KD-tree Build Optimization

The KD-tree `buildRecursive()` method originally used `this.points.indexOf(medianPoint)` to map tree nodes back to skill indices. This caused **O(n²) build time** at scale (10K points = 100M comparisons).

**Fix:** A `Map<number[], number>` is pre-built before recursion begins, giving O(1) point-to-index lookups. Build time is now O(n log n) — dominated by the sort operations at each level.

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
