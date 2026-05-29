# Improvement Plan

Prioritized improvements for the agent-skill-router, derived from architecture research and benchmark analysis (200-query regression + 22-query vector search against 1201 skills across 49 categories).

> **Status:** Proposed · **Last updated:** 2026-05-29

---

## Priority Tiers

| Tier | Criteria | Count |
|------|----------|-------|
| **P0** | Crashes, data loss, or makes the router unreliable in production | 5 |
| **P1** | Meaningfully degrades routing quality or developer experience | 9 |
| **P2** | Nice-to-have improvements with lower impact | 4 |

---

## P0 — Critical (fix immediately)

### P0.1 Empty Query Returns 500 Instead of 400

**Observation:** `SafetyLayer.ts:75,129` correctly validates empty/malformed queries, but when validation fails it throws an `Error`. The `index.ts` catch block at line ~40 unconditionally sends HTTP 500 for any thrown error. This means empty query strings produce a 500 status instead of a proper 400 Bad Request.

**Impact:** Downstream clients (MCP bridge, API consumers) can't distinguish "your request was bad" from "the server crashed." The 2 FAIL results in the 200-query regression benchmark are both empty-query tests.

**Root cause:** Router's error handling doesn't discriminate between validation errors (400) and internal errors (500). The `Router.ts:204` catch block is a generic handler.

**Solution:**
1. Create a `ValidationError` class (or use a type/code field on Error) that `SafetyLayer` throws
2. In `index.ts` catch block, check `err.type === 'validation'` and send 400 instead of 500
3. Add a Fastify `preHandler` schema validation that rejects empty `task` fields before they reach the route handler

**Effort:** Small (1–2 files, ~20 lines changed)

---

### P0.2 Trigger Parsing Crash When YAML Produces an Array

**Observation:** `SkillRegistry.ts:1025` casts `triggers` as a string:
```typescript
const triggerStr = (nestedMeta.triggers as string) || '';
```
But YAML frontmatter can produce `triggers` as an array if formatted as a YAML list. Every other field (`contentTypes`, `archetypes`, `anti_triggers`) in the same vicinity has an `Array.isArray()` guard — only `triggers` lacks one.

**Impact:** Any skill with a YAML-list formatted `triggers` field crashes the skill parser with a type error, preventing that skill from being indexed. This affects auto-loading and search.

**Solution:** Add the same `Array.isArray()` guard pattern used by every other field:
```typescript
const triggerStr = Array.isArray(nestedMeta.triggers)
  ? nestedMeta.triggers.join(', ')
  : (nestedMeta.triggers as string) || '';
```

**Effort:** Trivial (1 line change in `SkillRegistry.ts:1025`)

---

### P0.3 Adversarial Input Bypass

**Observation:** `SafetyLayer.ts` has a `BLOCK_THRESHOLD = 2` pattern matching threshold. A query containing two malicious fragments will be blocked — but a query containing only one can bypass. The pattern list also lacks common injection vectors like SQL injection patterns (`' OR 1=1`, `; DROP TABLE`), XSS payloads (`<script>`, `javascript:`), and prompt injection patterns.

**Impact:** Router can be used as an open relay for adversarial queries. Combined with the lack of auth (P1.7), this is the most serious security gap.

**Solution:**
1. Lower `BLOCK_THRESHOLD` to 1 for high-severity patterns (injection, XSS, prompt leak)
2. Add pattern categories: SQL injection, XSS, prompt injection, path traversal
3. Consider adding a `Score < 0.05 → return empty results` guard so random/garbage queries return no matches instead of hallucinated skills

**Effort:** Medium (single file, ~30 lines added)

---

### P0.4 No Input Size Limits

**Observation:** The `/route` endpoint has no `bodyLimit` configured on the Fastify route. A client could POST a multi-megabyte task payload, consuming server memory and CPU for embedding generation on garbage input.

**Impact:** Denial-of-service vector. Metered embedding API costs could be wasted on oversized payloads.

**Solution:**
1. Add Fastify `bodyLimit: 10000` (10 KB) to the `/route` route options
2. Add a pre-validation in `SafetyLayer` that rejects payloads over 5,000 characters before they reach the embedding service
3. Truncate task descriptions at 2,000 characters before embedding (beyond that, additional text adds negligible semantic signal)

**Effort:** Small (2 files, ~10 lines changed)

---

### P0.5 No Authentication or Rate Limiting

**Observation:** All router endpoints are completely open — no API keys, no JWT, no rate limiting. Any process on the host (or any container on the Docker network) can call `/route`, `/skills`, `/reload` without restriction.

**Impact:** Arbitrary skill reloads, denial-of-service via `/skills` enumeration, and usage of embedding API credits by unauthorized callers.

**Solution:**
1. Add an `API_KEY` environment variable. When set, require `Authorization: Bearer <key>` on all endpoints via a Fastify `onRequest` hook
2. Add rate limiting via `@fastify/rate-limit` (default: 60 req/min per IP)
3. Add a CORS origin whitelist (default: `localhost:*` and `opencode://*`)

**Effort:** Medium (1–2 files, ~40 lines)

---

## P1 — High Priority

### P1.1 Narrow Score Spreads

**Observation:** The vector similarity (50%) and BM25 (20%) weighted hybrid consistently produces tiny confidence spreads between top skills:
- "docker containers": top 5 skills within 0.010 points
- "prometheus config": 0.001 points apart
- Average spread between #1 and #5: 0.012 points

**Impact:** The router cannot reliably differentiate between genuinely relevant and tangentially relevant skills. Users get inconsistent results depending on minor embedding noise.

**Root cause:** The BM25 weight (0.20) is too low to separate skills with overlapping vocabulary. The trigger match weight (0.15) relies on exact keyword matches which are rare in natural language task descriptions.

**Solution:**
1. Increase `RETRIEVAL_BM25_WEIGHT` from 0.20 to 0.30
2. Introduce a specificity boost factor: skills with >=6 trigger terms that match at least 2 query terms get a 1.2× multiplier to their final score
3. Consider post-processing: if top N skills are within 0.015 of each other, fall back to LLM reranking (it already exists as `LLM_RANKING_ENABLED`)

**Effort:** Small (config changes, ~10 lines in Router.ts)

---

### P1.2 Low RelevantMatchRate (22.7%)

**Observation:** When a query like "deploy to kubernetes" is the task, the vector search benchmark shows that on average only 22.7% of the top 22 retrieved skills share the domain prefix of the top-ranked skill. This indicates the embedding model struggles to cluster related skills.

**Impact:** Users get a mix of unrelated skills in their results. The MMR (Maximum Marginal Relevance) diversification at lambda=0.7 helps some, but the base semantic signal is weak.

**Root cause:** Domain-prefix heuristic is too strict (e.g., `cncf-kubernetes` and `coding-kubernetes-deployments` are different domains). Additionally, the embedding model may not have enough training data for the skill domain taxonomy.

**Solution:**
1. Add a domain-aware reranking step: after initial retrieval, check if retrieved skills share a domain prefix with the best match and boost them by 1.1×
2. Consider switching from a generic embedding model to a fine-tuned one on the skill corpus (or a domain-specific model like `BAAI/bge-large-en-v1.5`)
3. Evaluate replacing the strict domain prefix heuristic with k-means clustering on the embeddings themselves to discover natural skill groupings

**Effort:** Medium (single file, ~40 lines)

---

### P1.3 Short / Meaningless Query Routing

**Observation:** Single-character and common-word queries produce plausible-sounding but incorrect results:
- `k` → `risk-kelly-criterion` (confidence 0.284)
- `the` → `anthro-claude-api` (confidence 0.076)
- `go` → `go-network-context` (confidence 0.183)

**Impact:** When the MCP bridge auto-routes, short ambiguous queries can load completely irrelevant skills. This erodes user trust in auto-routing.

**Root cause:** No minimum query length or minimum confidence threshold. The router tries to route everything. The embedding model produces non-zero vectors even for noise input.

**Solution:**
1. Add `MIN_QUERY_LENGTH = 3` in SafetyLayer — reject queries shorter than 3 characters with a clear error message
2. Add `MIN_CONFIDENCE_THRESHOLD = 0.15` — if the top skill's confidence is below 0.15, return empty results (or an explicit "query too ambiguous" message)
3. Add a "stop word" filter: queries consisting entirely of common English stop words should return empty results

**Effort:** Small (2 files, ~20 lines)

---

### P1.4 No Misspelling / Fuzzy Handling

**Observation:** The router has zero tolerance for typos or misspellings:
- `kubernetees` → routes to `kubescape` instead of `kubernetes`
- `postresql` → low-confidence routing to unrelated skills
- `promethues` → no close match found

**Impact:** Users who make common typos get wrong results. In the 200-query benchmark, misspelled queries are a primary cause of WARN results.

**Root cause:** BM25 is exact-match only. The embedding model is not fine-tuned on domain typos.

**Solution:**
1. Add a Levenshtein pre-processing step: for query terms with no BM25 match, try fuzzy matching against the top-100 skill names from the BM25 index
2. Generate "typo variants" at index time for common misspellings (store as extra trigger terms)
3. Consider a lightweight prefix-trie autocomplete on skill names for the API layer

**Effort:** Medium (2–3 files, ~60 lines)

---

### P1.5 Cold Start Latency

**Observation:** First query after restart takes ~672ms vs steady-state ~19ms. The HNSW index is built synchronously on startup from raw skill vectors.

**Impact:** Poor user experience on the first interaction after any restart. Restarts happen during updates (`/reload`), container recreation, and pod rescheduling.

**Root cause:** HNSW index construction is done in `initializeAsync()` during app startup, blocking the ready signal. No index file is persisted (P1.6).

**Solution:**
1. Warm up the embedding service with a "health check query" during `initializeAsync()` so the first user query doesn't pay cold-start penalty
2. Shift HNSW construction to a background promise that doesn't block the ready check (serve via linear scan until HNSW is ready)
3. Add a startup banner to `/health` indicating whether warmup is complete

**Effort:** Small (1 file, ~15 lines)

---

### P1.6 HNSW Not Persisted

**Observation:** The HNSW index is rebuilt from scratch on every restart. For 1201 skills with 1536-dimensional vectors, this takes ~150ms — not terrible, but unnecessary.

**Impact:** Slight delay on every restart. More importantly, the MMR cache and query statistics are also lost (cold start for adaptive weighting).

**Solution:**
1. Serialize the HNSW index to a file (e.g., `data/hnsw-index.bin`) on shutdown (`SIGTERM` handler)
2. On startup, check for the serialized index and load it if the skill set hash matches (store content-addressed hash of `skills.json`)
3. Add a `--rebuild-index` CLI flag to force fresh index generation

**Effort:** Medium (2 files, ~50 lines)

---

### P1.7 Score Spread Anomaly: Near-Identical Scores for Different Skills

**Observation:** Skills with completely different capabilities produce nearly identical scores:
- `kubernetes-monitoring-logging` (0.973)
- `grafana-prometheus` (0.971)
- `prometheus` (0.970)
All three within 0.003 points of each other for a monitoring-related query.

**Impact:** The #1 result is essentially random among top candidates. The router cannot express preference between genuinely different approaches.

**Root cause:** Vector similarity dominates the hybrid score (50% weight). Three different skill descriptions about related-but-different tools produce similar embeddings because they share vocabulary ("metrics", "alerts", "dashboard").

**Solution:**
1. Add a vocabulary-diversity penalty: if two skills share >60% of their non-stop-word tokens, apply a diversity penalty to the second one (beyond what MMR already does)
2. Reintroduce the archetype match signal at higher weight — if the query is "diagnostic" and the skill is "reference", that mismatch should matter more
3. Consider category penalties: cross-category skills should have a small penalty unless the query explicitly bridges categories

**Effort:** Medium (1–2 files, ~35 lines)

---

### P1.8 Kotlin Skill YAML Crash

**Observation:** A skill containing `**Q:**` in its YAML frontmatter causes repeated `BAD_ALIAS` warnings from the YAML parser. This doesn't crash the app (warnings are non-fatal) but corrupts the skill's metadata.

**Impact:** Affected skills may have missing or truncated metadata. Index quality degrades silently.

**Root cause:** The double-asterisk pattern `**Q:**` is interpreted by the YAML parser as an alias marker (`*Q`). The frontmatter parsing library is not configured to reject or escape this.

**Solution:**
1. Add a YAML pre-processing step that escapes `*` characters in string values before parsing
2. Alternatively, configure the YAML parser to disallow aliases (`yaml.safeLoad` with `schema: yaml.DEFAULT_SCHEMA` — but actually that already disables aliases; check the actual parser settings)
3. Catch `BAD_ALIAS` warnings specifically and log the affected skill name for manual fix

**Effort:** Small (1 file, ~10 lines)

---

### P1.9 Token Counters Not Surfaced

**Observation:** `LLMRanker.ts` tracks `inputTokens` and `outputTokens` counters for LLM reranking calls, but these metrics are never included in `RouteResponse`. You can't tell how many tokens were consumed by reranking.

**Impact:** No visibility into LLM reranking costs. If `LLM_RANKING_ENABLED` is true, you can't monitor spend or detect anomalies.

**Solution:**
1. Add `tokensConsumed: { totalInput: number; totalOutput: number }` to the `RouteResponse` type
2. Surface the counters in the `/route` response body
3. Add a cumulative token counter endpoint (`/stats/tokens`) for monitoring

**Effort:** Small (2 files, ~20 lines)

---

## P2 — Nice-to-Have

### P2.1 Embedding Cache Not Implemented

**Observation:** The `embedding-cache/` directory exists but only caches query embeddings, not skill embeddings. Every startup re-embeds all skills.

**Impact:** Adds ~200ms to startup time (1201 skills × 1536d embeddings). Not critical but wasteful.

**Solution:** Cache skill embeddings keyed by `(skillName, version)` so only new/modified skills need re-embedding on restart.

**Effort:** Small (1 file, ~25 lines)

---

### P2.2 Access Log Limitations

**Observation:** The `/access-log` endpoint keeps at most 100 entries in memory and has no persistence. Entries are lost on restart.

**Impact:** Cannot audit past routing history. The 100-entry cap means high-traffic deployments lose visibility into early-session routing decisions.

**Solution:**
1. Increase cap to 1,000 or make it configurable via `ACCESS_LOG_CAP` env var
2. Add optional log-to-disk with a simple JSON-lines rotation (keep last 10 files, 1MB each)
3. Surface aggregated stats (most-routed skills, average confidence, error rate) at `/stats` instead of raw entries

**Effort:** Medium (2 files, ~40 lines)

---

### P2.3 GitHub Index URL Hardcoded

**Observation:** `SkillRegistry.ts:initializeAsync()` hardcodes `paulpas/skills` as the GitHub source for the skills index. Other URLs can't be configured.

**Impact:** Forking the repo requires patching this value. CI/CD deployments with private mirrors must modify source code.

**Solution:**
1. Extract to `SKILL_INDEX_URL` environment variable
2. Keep `paulpas/agent-skill-router` as the default

**Effort:** Trivial (1 line, 10 seconds)

---

### P2.4 Domain Coverage Gaps

**Observation:** Skill distribution is heavily skewed:
- `agent`: 230 skills
- `cncf`: 171 skills
- `trading`: 83 skills
- `coding`: 82 skills
- `go`: 12 skills
- `linux`: 10 skills
- `programming`: 4 skills
- `writing`: 1 skill

Domains like `programming`, `writing`, and `security` (zero dedicated skills) are severely underrepresented. The RelevantMatchRate of 22.7% is partly low because a "programming" query has very few programming-domain skills to match against.

**Impact:** Users asking about algorithms, technical writing, or security fundamentals get poor routing results even when the router works perfectly.

**Solution:** Create new skills in under-represented domains. Priority targets:
- `programming`: dynamic programming, sorting algorithms, graph algorithms, time complexity
- `writing`: documentation style, API reference writing, markdown authoring
- `security`: common vulnerability patterns, OWASP Top 10, secure coding (beyond SAST/DAST tooling)

**Effort:** Large (multiple PRs, not code changes — content creation)

---

## Implementation Order

### Phase 1 (this sprint)
1. P0.2 Trigger parsing array crash (1 line)
2. P0.1 Empty query → 400 (20 lines)
3. P0.5 Auth + rate limiting (40 lines)
4. P0.4 Input size limits (10 lines)
5. P0.3 Adversarial input hardening (30 lines)

### Phase 2 (next sprint)
1. P1.3 Short query rejection (20 lines)
2. P1.1 Score spread (BM25 weight + specificity boost) (10 lines)
3. P1.4 Misspelling handling (60 lines)
4. P1.9 Token counters surfaced (20 lines)

### Phase 3
1. P1.2 RelevantMatchRate improvement (40 lines)
2. P1.7 Score spread anomaly (35 lines)
3. P1.5 Cold start + P1.6 HNSW persistence (65 lines)
4. P1.8 Kotlin YAML fix (10 lines)

### Phase 4
1. P2.1 Embedding cache (25 lines)
2. P2.2 Access log improvements (40 lines)
3. P2.3 GitHub URL configurable (1 line)
4. P2.4 Domain coverage (content, not code)

---

## Appendix: Benchmark Baseline

### 200-Query Regression
| Metric | Value |
|--------|-------|
| Total queries | 200 |
| PASS | 170 (85.0%) |
| WARN | 28 (14.0%) |
| FAIL | 2 (1.0%) |
| Categories tested | 10 |
| Active skills | 1,201 |

### 22-Query Vector Search
| Metric | Value |
|--------|-------|
| Avg latency | 19.37ms |
| P50 latency | 18.6ms |
| P95 latency | 25.8ms |
| P99 latency | 26.2ms |
| HNSW vs linear | 1.65× faster |
| Avg score spread (#1-#5) | 0.012 |
| RelevantMatchRate | 22.7% |

### Environment
- **Node:** v22.x
- **Skills:** 1,201 across 49 categories
- **Embedding dims:** 1536
- **Index type:** HNSW (efConstruction=200, M=16)
- **MMR lambda:** 0.7
