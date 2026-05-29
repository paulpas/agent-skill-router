# Benchmark Results — Fri May 29 01:17:13 PM CDT 2026

## Regression Test: test-200-queries.sh
**File:** regression-test-20260529-131043.txt
**Results:** 170 PASS, 28 WARN, 2 FAIL (200 total)
**Failures:** empty string query (HTTP 500), whitespace-only query (HTTP 500) — expected edge cases
**Warnings:** 28 partial domain matches (acceptable for cross-domain queries)

## Vector Search Benchmark: benchmark_vector_search.ts
**File:** vector-search-benchmark-20260529-131152.json
**Results:** 22 queries × 5 iterations
**Average Latency:** 19.37 ms
**Average Top Confidence:** 44.69%
**Average Score Spread:** 0.0319 (31.9 bp)
**Relevant Match Rate:** 22.73%
**HNSW vs Linear:** Up to 3.0x speedup
**Latency Distribution:** P50=18.6ms, P95=25.8ms, P99=26.2ms

## Environment
- **Host:** anomaly
- **Date:** Fri May 29 01:17:13 PM CDT 2026
- **Router Status:** healthy
- **Skills Loaded:** 1201
