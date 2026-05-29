#!/usr/bin/env -S bun run
/**
 * Agent Skill Router - Vector Search Benchmark Script
 * 
 * Benchmarks the vector search functionality including:
 * - Query latency (ms)
 * - KD-tree search vs linear search comparison
 * - Token usage statistics
 * - Result quality (top 5 skill names)
 */

import { Router, RouterConfig, SkillDefinition } from './agent-skill-routing-system/src/index.js';

// ============================================================================
// Configuration
// ============================================================================

const SKILLS_DIR = '../../skills';
const NUM_ITERATIONS = 5; // Number of times to run each query for averaging
const MAX_RESULTS = 5;

// Benchmark queries with varying lengths and complexity
const BENCHMARK_QUERIES = [
  // ── Technical queries ──────────────────────────────────────────────────────
  'stop loss crypto',
  'How do I implement a stop loss for cryptocurrency trading?',
  'What is the best way to run a Kubernetes pod with persistent storage and network policies?',
  'Explain how to write a Python unit test with mock objects and assertions',
  'How do I configure Prometheus for Kubernetes monitoring with service discovery?',
  'Implement a TWAP execution algorithm for crypto trading with volume weighting and slippage control',
  'What are the best practices for code review in a team environment?',

  // ── Adversarial / short queries ────────────────────────────────────────────
  'k8s',
  'go concurrency',
  'fix bug now',
  '!@#$%^&*()',

  // ── Conversational queries ─────────────────────────────────────────────────
  'how do i deploy my app to the cloud',
  'teach me about docker containers',
  'help me understand kubernetes networking',
  'what is the best way to store data',
  'i need to protect my trading bot from losing too much money',

  // ── Multi-intent queries ───────────────────────────────────────────────────
  'deploy python trading bot to kubernetes and monitor with prometheus',
  'write a go microservice with postgres, redis, and kubernetes',
  'implement rate limiting and circuit breaker patterns in a trading engine',

  // ── Long / detailed queries ────────────────────────────────────────────────
  'I have a production Kubernetes cluster running nginx ingress where pods are randomly getting OOMKilled every 4 hours, I need to debug this, adjust resource limits, set up proper horizontal pod autoscaling',
  'Implement a complete algorithmic trading system with data ingestion, technical indicators, signal generation, position sizing, stop loss, backtesting, and deployment',
  'Design a multi-agent AI system where one agent handles code review, another handles testing, and a third handles documentation generation, coordinating through a shared task queue',
];

// ============================================================================
// Benchmark Data Structures
// ============================================================================

interface QueryResult {
  query: string;
  latencyMs: number;
  hnswLatencyMs?: number;
  linearLatencyMs?: number;
  inputTokens: number;
  outputTokens: number;
  candidateCount: number;
  topSkillConfidence: number;
  scoreSpread: number;
  relevantDomains: string[];
  topSkills: string[];
  scores: number[];
}

interface BenchmarkSummary {
  totalQueries: number;
  avgLatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgCandidates: number;
  avgScoreSpread: number;
  avgTopConfidence: number;
  relevantMatchRate: number;
  latencyDistribution: {
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  tokenDistribution: {
    inputMin: number;
    inputMax: number;
    outputMin: number;
    outputMax: number;
  };
  scoreDistribution: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, index)];
}

/**
 * Format milliseconds to readable string
 */
function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

/**
 * Format tokens to readable string
 */
function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * Calculate statistics from array
 */
function stats(arr: number[]): { min: number; max: number; avg: number; median: number } {
  if (arr.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const args = process.argv.slice(2);
const jsonMode = args.includes('--json') || (args.includes('--format') && args[args.indexOf('--format') + 1] === 'json');

// ============================================================================
// Domain Helpers
// ============================================================================

/**
 * Extract domain prefix from a skill name (e.g. "trading-risk-stop-loss" → "trading")
 */
function extractDomain(skillName: string): string {
  const idx = skillName.indexOf('-');
  return idx === -1 ? skillName : skillName.substring(0, idx);
}

/**
 * Heuristic: infer expected domains from a query based on keywords.
 * Returns an array of domain strings the query likely relates to.
 */
function expectedDomains(query: string): string[] {
  const q = query.toLowerCase();
  const domains: string[] = [];
  if (/\b(trad|crypto|stop loss|position sizing|twap|backtest|algo trading|slippage|risk)\b/.test(q)) {
    domains.push('trading');
  }
  if (/\b(kubernetes|k8s|pod|deploy|nginx|helm|container|docker|statefulset|horizontal pod autoscal|oomkill|ingress)\b/.test(q)) {
    domains.push('cncf');
  }
  if (/\b(python|unit test|code review|go\b|golang|microservice|postgres|redis|rate limit|circuit breaker|oauth|jwt|react|mock|assertion)\b/.test(q)) {
    domains.push('coding');
  }
  if (/\b(prometheus|monitoring|grafana|alert|metric)\b/.test(q)) {
    domains.push('cncf');
  }
  if (/\b(database|store data|sql|nosql)\b/.test(q)) {
    domains.push('coding');
  }
  if (/\b(agent|multi-agent|orchestrat|workflow|coordinat)\b/.test(q)) {
    domains.push('agent');
  }
  if (/\b(go\b|golang|goroutine|channel)\b/.test(q)) {
    domains.push('go');
  }
  if (/\b(linux|bash|systemd|unix)\b/.test(q)) {
    domains.push('linux');
  }
  return domains;
}

/**
 * Check whether a skill name is plausibly relevant to the given query
 * by comparing its domain prefix against expected domains.
 */
function isSkillRelevant(skillName: string, query: string): boolean {
  const skillDomain = extractDomain(skillName);
  const expected = expectedDomains(query);
  // If we couldn't infer any domain for the query, be lenient
  if (expected.length === 0) return true;
  return expected.includes(skillDomain);
}

// ============================================================================
// JSON Output Formatter
// ============================================================================

function outputJSON(results: QueryResult[], summary: BenchmarkSummary): void {
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalQueries: results.length,
      numIterations: NUM_ITERATIONS,
      maxResults: MAX_RESULTS,
    },
    results: results.map((r) => ({
      query: r.query,
      latencyMs: Math.round(r.latencyMs * 100) / 100,
      hnswLatencyMs: r.hnswLatencyMs !== undefined ? Math.round(r.hnswLatencyMs * 100) / 100 : null,
      linearLatencyMs: r.linearLatencyMs !== undefined ? Math.round(r.linearLatencyMs * 100) / 100 : null,
      speedupFactor: (r.hnswLatencyMs !== undefined && r.linearLatencyMs !== undefined && r.linearLatencyMs > 0)
        ? Math.round((r.linearLatencyMs / r.hnswLatencyMs) * 100) / 100
        : null,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      candidateCount: r.candidateCount,
      topSkillConfidence: r.topSkillConfidence,
      scoreSpread: r.scoreSpread,
      relevantDomains: r.relevantDomains,
      topSkills: r.topSkills,
      scores: r.scores.map((s) => Math.round(s * 10000) / 10000),
    })),
    summary: {
      totalQueries: summary.totalQueries,
      avgLatencyMs: Math.round(summary.avgLatencyMs * 100) / 100,
      avgInputTokens: Math.round(summary.avgInputTokens),
      avgOutputTokens: Math.round(summary.avgOutputTokens),
      avgCandidates: Math.round(summary.avgCandidates),
      avgScoreSpread: Math.round(summary.avgScoreSpread * 10000) / 10000,
      avgTopConfidence: Math.round(summary.avgTopConfidence * 10000) / 10000,
      relevantMatchRate: Math.round(summary.relevantMatchRate * 10000) / 10000,
      latencyDistribution: summary.latencyDistribution,
      tokenDistribution: summary.tokenDistribution,
      scoreDistribution: summary.scoreDistribution,
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// Main Benchmark Function
// ============================================================================

async function runBenchmark(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Agent Skill Router - Vector Search Benchmark               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Initialize router
  console.log('Initializing Router...');
  const config: RouterConfig = {
    skillsDirectory: SKILLS_DIR,
    embedding: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
    },
    llm: {
      model: 'gpt-4o-mini',
      maxCandidates: 20,
    },
    execution: {
      maxSkills: MAX_RESULTS,
      timeoutMs: 30000,
    },
    safety: {
      enablePromptInjectionFilter: false, // Disable for benchmarking
      requireSchemaValidation: false,
    },
    observability: {
      level: 'warn', // Reduce log noise
      includePayloads: false,
    },
  };

  const router = new Router(config);
  await router.initialize();

  console.log(`✓ Router initialized with ${router.getStats().totalSkills} skills\n`);

  // Run benchmarks
  const results: QueryResult[] = [];

  for (const query of BENCHMARK_QUERIES) {
    console.log(`\n🔍 Query: "${query}"`);
    console.log(`   Length: ${query.length} chars, ${query.split(/\s+/).length} tokens`);
    console.log(`   Iterations: ${NUM_ITERATIONS}`);

    const latencies: number[] = [];
    const inputTokensList: number[] = [];
    const outputTokensList: number[] = [];
    const candidateCounts: number[] = [];
    const topSkillsSet = new Set<string>();
    const scoresList: number[][] = [];
    let hnswMs: number | undefined;
    let linearMs: number | undefined;

    for (let i = 0; i < NUM_ITERATIONS; i++) {
      // Route the task
      const response = await router.routeTask({
        task: query,
        constraints: {
          maxSkills: MAX_RESULTS,
        },
      });

      const latencyMs = response.latencyMs;
      latencies.push(latencyMs);

      // Estimate per-request tokens from the LLM ranker
      const llmRanker = (router as any).llmRanker;
      const inputTokens = llmRanker?.getInputTokens?.() || 0;
      const outputTokens = llmRanker?.getOutputTokens?.() || 0;

      inputTokensList.push(inputTokens);
      outputTokensList.push(outputTokens);

      candidateCounts.push(response.candidatePool.length);

      // Track top skills
      response.selectedSkills.forEach((skill) => {
        topSkillsSet.add(skill.name);
      });

      scoresList.push(response.selectedSkills.map((s) => s.score));

      // On the last iteration, attempt to time HNSW vs linear search directly
      if (i === NUM_ITERATIONS - 1) {
        try {
          const vdb = (router as any).vectorDatabase;
          const embedService = (router as any).embeddingService;
          if (vdb && embedService?.generateEmbedding) {
            const embedResp = await embedService.generateEmbedding(query);
            const embedding = embedResp.embedding;

            // Time HNSW search (default path)
            const hStart = Date.now();
            await vdb.search(embedding, 20);
            hnswMs = Date.now() - hStart;

            // Time linear search (temporarily disable HNSW)
            const origHNSW = vdb.config.useHNSW;
            vdb.config.useHNSW = false;
            const lStart = Date.now();
            await vdb.search(embedding, 20);
            linearMs = Date.now() - lStart;
            vdb.config.useHNSW = origHNSW;
          }
        } catch {
          // Instrumentation not available — leave hnswMs / linearMs undefined
        }
      }

      console.log(`   Iter ${i + 1}: ${formatMs(latencyMs)}, Input: ${formatTokens(inputTokens)}, Output: ${formatTokens(outputTokens)}`);
    }

    // Calculate averages for this query
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const avgInputTokens = inputTokensList.reduce((a, b) => a + b, 0) / inputTokensList.length;
    const avgOutputTokens = outputTokensList.reduce((a, b) => a + b, 0) / outputTokensList.length;
    const avgCandidates = candidateCounts.reduce((a, b) => a + b, 0) / candidateCounts.length;
    const avgScores = scoresList.reduce((acc, scores) => acc.concat(scores), []);

    // Quality metrics from the last iteration's scores
    const lastScores = scoresList.length > 0 ? scoresList[scoresList.length - 1] : [];
    const topConf = lastScores.length > 0 ? lastScores[0] : 0;
    const spread = lastScores.length > 1 ? lastScores[0] - lastScores[1] : 0;

    // Extract unique domains from all skills seen across iterations
    const relevantDomains = Array.from(topSkillsSet)
      .map(extractDomain)
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .slice(0, MAX_RESULTS);

    results.push({
      query,
      latencyMs: avgLatency,
      hnswLatencyMs: hnswMs,
      linearLatencyMs: linearMs,
      inputTokens: Math.round(avgInputTokens),
      outputTokens: Math.round(avgOutputTokens),
      candidateCount: Math.round(avgCandidates),
      topSkillConfidence: Math.round(topConf * 10000) / 10000,
      scoreSpread: Math.round(spread * 10000) / 10000,
      relevantDomains,
      topSkills: Array.from(topSkillsSet).slice(0, MAX_RESULTS),
      scores: avgScores,
    });

    // Reset LLM token counters for next query
    (router as any).llmRanker?.resetTokenCounters?.();
  }

  // Calculate summary statistics
  const summary = calculateSummary(results);

  // Print results
  printResults(results, summary);
}

// ============================================================================
// Summary Calculation
// ============================================================================

function calculateSummary(results: QueryResult[]): BenchmarkSummary {
  const latencies = results.map((r) => r.latencyMs);
  const inputTokens = results.map((r) => r.inputTokens);
  const outputTokens = results.map((r) => r.outputTokens);
  const candidates = results.map((r) => r.candidateCount);
  const scoreSpreads = results.map((r) => r.scoreSpread);
  const topConfidences = results.map((r) => r.topSkillConfidence);
  const topScores = results.map((r) => r.scores.length > 0 ? r.scores[0] : 0);

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const scoreDist = stats(topScores);

  // Compute relevantMatchRate: fraction of queries where top skill domain
  // matches at least one expected domain for that query
  let matches = 0;
  for (const r of results) {
    if (r.topSkills.length > 0 && isSkillRelevant(r.topSkills[0], r.query)) {
      matches++;
    }
  }

  return {
    totalQueries: results.length,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    avgInputTokens: inputTokens.reduce((a, b) => a + b, 0) / inputTokens.length,
    avgOutputTokens: outputTokens.reduce((a, b) => a + b, 0) / outputTokens.length,
    avgCandidates: candidates.reduce((a, b) => a + b, 0) / candidates.length,
    avgScoreSpread: scoreSpreads.length > 0
      ? scoreSpreads.reduce((a, b) => a + b, 0) / scoreSpreads.length
      : 0,
    avgTopConfidence: topConfidences.length > 0
      ? topConfidences.reduce((a, b) => a + b, 0) / topConfidences.length
      : 0,
    relevantMatchRate: results.length > 0 ? matches / results.length : 0,
    latencyDistribution: {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p50: percentile(sortedLatencies, 50),
      p95: percentile(sortedLatencies, 95),
      p99: percentile(sortedLatencies, 99),
    },
    tokenDistribution: {
      inputMin: Math.min(...inputTokens),
      inputMax: Math.max(...inputTokens),
      outputMin: Math.min(...outputTokens),
      outputMax: Math.max(...outputTokens),
    },
    scoreDistribution: scoreDist,
  };
}

// ============================================================================
// Result Printing
// ============================================================================

function printResults(results: QueryResult[], summary: BenchmarkSummary): void {
  // ── JSON mode: dump structured output and exit ────────────────────────────
  if (jsonMode) {
    outputJSON(results, summary);
    return;
  }

  // ── Per-query results ─────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('QUERY RESULTS');
  console.log('─'.repeat(80));

  for (const result of results) {
    const label = `${result.query.substring(0, 55)}${result.query.length > 55 ? '...' : ''}`;
    console.log(`\nQuery: "${label}"`);
    console.log(`  Latency:            ${formatMs(result.latencyMs)}`);
    console.log(`  Input/Output Tokens: ${formatTokens(result.inputTokens)} / ${formatTokens(result.outputTokens)}`);
    console.log(`  Candidates:         ${result.candidateCount}`);
    console.log(`  Top Skill Confidence: ${(result.topSkillConfidence * 100).toFixed(2)}%`);
    console.log(`  Score Spread (#1-#2): ${(result.scoreSpread * 10000).toFixed(2)}bp`);
    console.log(`  Relevant Domains:   ${result.relevantDomains.join(', ') || '(none)'}`);

    if (result.hnswLatencyMs !== undefined && result.linearLatencyMs !== undefined) {
      const speedup = result.linearLatencyMs / result.hnswLatencyMs;
      console.log(`  HNSW vs Linear:     ${formatMs(result.hnswLatencyMs)} vs ${formatMs(result.linearLatencyMs)} (${speedup.toFixed(2)}x faster)`);
    }

    console.log(`  Top Skills:`);
    result.topSkills.forEach((skill, i) => {
      const relevant = isSkillRelevant(skill, result.query) ? '✓' : '✗';
      console.log(`    ${i + 1}. ${skill}  [${relevant}]`);
    });
  }

  // ── Summary statistics ────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('─'.repeat(80));

  console.log(`\nTotal Queries:          ${summary.totalQueries}`);
  console.log(`Average Latency:        ${formatMs(summary.avgLatencyMs)}`);
  console.log(`  Min/Max:              ${formatMs(summary.latencyDistribution.min)} / ${formatMs(summary.latencyDistribution.max)}`);
  console.log(`  P50/P95/P99:          ${formatMs(summary.latencyDistribution.p50)} / ${formatMs(summary.latencyDistribution.p95)} / ${formatMs(summary.latencyDistribution.p99)}`);

  console.log(`\nAverage Input Tokens:   ${formatTokens(summary.avgInputTokens)}`);
  console.log(`  Range:                ${formatTokens(summary.tokenDistribution.inputMin)} - ${formatTokens(summary.tokenDistribution.inputMax)}`);

  console.log(`\nAverage Output Tokens:  ${formatTokens(summary.avgOutputTokens)}`);
  console.log(`  Range:                ${formatTokens(summary.tokenDistribution.outputMin)} - ${formatTokens(summary.tokenDistribution.outputMax)}`);

  console.log(`\nAverage Candidates:     ${Math.round(summary.avgCandidates)}`);

  // New quality summary metrics
  console.log(`\nAverage Score Spread:  ${(summary.avgScoreSpread * 10000).toFixed(2)}bp`);
  console.log(`Average Top Confidence: ${(summary.avgTopConfidence * 100).toFixed(2)}%`);
  console.log(`Relevant Match Rate:    ${(summary.relevantMatchRate * 100).toFixed(1)}%`);

  console.log(`\nScore Distribution (top scores):`);
  console.log(`  Min:                  ${(summary.scoreDistribution.min * 100).toFixed(2)}%`);
  console.log(`  Max:                  ${(summary.scoreDistribution.max * 100).toFixed(2)}%`);
  console.log(`  Avg:                  ${(summary.scoreDistribution.avg * 100).toFixed(2)}%`);
  console.log(`  Median:               ${(summary.scoreDistribution.median * 100).toFixed(2)}%`);

  // ── HNSW vs Linear performance comparison ─────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('HNSW vs LINEAR SEARCH COMPARISON');
  console.log('─'.repeat(80));

  const queriesWithTiming = results.filter(
    (r) => r.hnswLatencyMs !== undefined && r.linearLatencyMs !== undefined
  );

  if (queriesWithTiming.length > 0) {
    const avgHnsw = queriesWithTiming.reduce((s, r) => s + r.hnswLatencyMs!, 0) / queriesWithTiming.length;
    const avgLinear = queriesWithTiming.reduce((s, r) => s + r.linearLatencyMs!, 0) / queriesWithTiming.length;
    const maxSpeedup = Math.max(
      ...queriesWithTiming.map((r) => r.linearLatencyMs! / r.hnswLatencyMs!)
    );

    console.log(`  Queries measured:     ${queriesWithTiming.length}`);
    console.log(`  Average HNSW:         ${formatMs(avgHnsw)}`);
    console.log(`  Average Linear:       ${formatMs(avgLinear)}`);
    console.log(`  Average Speedup:      ${(avgLinear / avgHnsw).toFixed(2)}x`);
    console.log(`  Max Speedup:          ${maxSpeedup.toFixed(2)}x`);
    console.log(`  Method:               HNSW (approx. nearest neighbor) vs brute-force O(n)`);
  } else {
    console.log('  HNSW comparison not available (instrumentation requires');
    console.log('  access to VectorDatabase and EmbeddingService internals).');
    console.log('  The VectorDatabase.search() method supports both:');
    console.log('  - HNSW: O(log n) approximate nearest neighbor');
    console.log('  - Linear:  O(n) brute-force similarity calculation');
    console.log('  Current config: useHNSW is enabled by default');
  }

  // ── Token usage breakdown ─────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('TOKEN USAGE STATISTICS');
  console.log('─'.repeat(80));

  const totalTokens = summary.avgInputTokens + summary.avgOutputTokens;
  console.log(`Average Total Tokens:   ${formatTokens(totalTokens)}`);
  console.log(`  Input:                ${((summary.avgInputTokens / totalTokens) * 100).toFixed(1)}%`);
  console.log(`  Output:               ${((summary.avgOutputTokens / totalTokens) * 100).toFixed(1)}%`);

  // ── Cost estimation ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('COST ESTIMATION (OpenAI pricing - text-embedding-3-small + gpt-4o-mini)');
  console.log('─'.repeat(80));

  // $0.02 / 1M input tokens, $0.06 / 1M output tokens for gpt-4o-mini
  // $0.02 / 1M for text-embedding-3-small
  const avgInputCost = (summary.avgInputTokens / 1_000_000) * 0.02;
  const avgOutputCost = (summary.avgOutputTokens / 1_000_000) * 0.06;
  const embeddingCost = (summary.avgInputTokens / 1_000_000) * 0.02; // Approximate
  const totalCost = (avgInputCost + avgOutputCost + embeddingCost) * summary.totalQueries;

  console.log(`Average Input Cost:     $${avgInputCost.toFixed(6)}`);
  console.log(`Average Output Cost:    $${avgOutputCost.toFixed(6)}`);
  console.log(`Average Embedding Cost: $${embeddingCost.toFixed(6)}`);
  console.log(`Total Estimated Cost:   $${totalCost.toFixed(6)} (${summary.totalQueries} queries)`);
  console.log(`Cost per Query:         $${(totalCost / summary.totalQueries).toFixed(6)}`);

  // ── Recommendations ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('─'.repeat(80));

  console.log(`
1. Consider enabling embedding caching if queries have overlap
2. For production, use a smaller embedding model for initial filtering
3. Consider caching LLM rankings for repeated queries
4. Monitor token usage - current average: ${formatTokens(totalTokens)} tokens/query
5. HNSW provides O(log n) search vs O(n) linear - significant for large skill sets
6. Track relevantMatchRate to identify trigger coverage gaps
7. Watch scoreSpread — narrow spreads indicate ambiguous routing
`);

  console.log('\n✓ Benchmark complete!\n');
}

// Run the benchmark
runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
