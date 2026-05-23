// IntentDecomposer — Decompose queries into weighted intent fragments for multi-dimensional retrieval.

/**
 * A single extracted intent fragment with its normalized weight.
 */
export interface IntentFragment {
  /** The extracted intent term (e.g. "security", "kubernetes") */
  intent: string;
  /** Normalized importance [0, 1]; all weights in a query sum to 1.0 */
  weight: number;
}

/**
 * Result of decomposing a query into weighted fragments.
 */
export interface DecomposedQuery {
  /** The original (normalized) query text */
  originalQuery: string;
  /** Ordered list of intent fragments, sorted by weight descending */
  fragments: IntentFragment[];
}

/** Known domain names for intent matching against skill categories. */
const DOMAINS = [
  'coding', 'cncf', 'trading', 'agent', 'go', 'linux',
  'programming', 'writing', 'electical-engineering', 'maker',
] as const;

/**
 * Keyword-to-domain mapping. Each keyword maps to one or more domains.
 * When a keyword is found in the query, the associated domain(s) become intent fragments.
 */
const KEYWORD_MAP: Record<string, string[]> = {
  // coding domain keywords
  'rust': ['coding'],
  'typescript': ['coding'],
  'javascript': ['coding'],
  'python': ['coding'],
  'go': ['coding', 'go'],
  'golang': ['coding', 'go'],
  'refactoring': ['coding'],
  'testing': ['coding'],
  'unit test': ['coding'],
  'integration test': ['coding'],
  'tdd': ['coding'],
  'code review': ['coding'],
  'code quality': ['coding'],
  'code-review': ['coding'],
  'software engineering': ['coding'],
  'clean code': ['coding'],
  'design pattern': ['coding'],
  // cncf domain keywords
  'kubernetes': ['cncf'],
  'k8s': ['cncf'],
  'docker': ['cncf'],
  'helm': ['cncf'],
  'prometheus': ['cncf'],
  'istio': ['cncf'],
  'service mesh': ['cncf'],
  'container orchestration': ['cncf'],
  'microservices': ['cncf'],
  'kafka': ['cncf'],
  'etcd': ['cncf'],
  'coredns': ['cncf'],
  'calico': ['cncf'],
  // trading domain keywords
  'trading': ['trading'],
  'crypto': ['trading'],
  'cryptocurrency': ['trading'],
  'bitcoin': ['trading'],
  'ethereum': ['trading'],
  'stop loss': ['trading'],
  'stop-loss': ['trading'],
  'bollinger bands': ['trading'],
  'rsi': ['trading'],
  'macd': ['trading'],
  'vwap': ['trading'],
  'order book': ['trading'],
  'market making': ['trading'],
  'arbitrage': ['trading'],
  'defi': ['trading'],
  'uniswap': ['trading'],
  // agent domain keywords
  'agent': ['agent'],
  'orchestration': ['agent'],
  'routing': ['agent'],
  'delegation': ['agent'],
  'multi-agent': ['agent'],
  'task decomposition': ['agent'],
  'tool use': ['agent'],
  'function calling': ['agent'],
  // linux domain keywords
  'linux': ['linux'],
  'systemd': ['linux'],
  'bash': ['linux'],
  'shell scripting': ['linux'],
  'cron': ['linux'],
  'iptables': ['linux'],
  'kernel': ['linux'],
  'networking': ['linux', 'cncf'],
  // programming domain keywords
  'algorithm': ['programming'],
  'data structure': ['programming'],
  'dynamic programming': ['programming'],
  'graph traversal': ['programming'],
  'sorting algorithm': ['programming'],
  'search algorithm': ['programming'],
  'time complexity': ['programming'],
  // writing domain keywords
  'documentation': ['writing'],
  'technical writing': ['writing'],
  'api docs': ['writing'],
  'readme': ['writing'],
};

/**
 * Intent category keyword mapping (non-domain intents).
 * Each intent name maps to a list of synonymous trigger phrases.
 */
const INTENT_MAP: Record<string, string[]> = {
  'security': ['security', 'vulnerability', 'owasp', 'audit', 'compliance', 'sast', 'dast'],
  'performance': ['performance', 'optimization', 'latency', 'speed', 'throughput', 'bottleneck'],
  'debugging': ['debug', 'bug', 'fix', 'error', 'trace', 'investigate', 'diagnose'],
  'design': ['design', 'architect', 'pattern', 'structure', 'architecture'],
  'testing': ['test', 'testing', 'unit test', 'integration test', 'mock', 'coverage'],
  'deployment': ['deploy', 'deployment', 'ci/cd', 'pipeline', 'dockerize', 'containerize'],
  'monitoring': ['monitoring', 'observability', 'metrics', 'logging', 'tracing', 'alerting'],
  'authentication': ['auth', 'authentication', 'authorization', 'oauth', 'jwt', 'sso'],
  'scaling': ['scaling', 'scale', 'horizontal scaling', 'load balancing', 'auto-scaling'],
};

/**
 * IntentDecomposer — splits a natural language query into weighted intent fragments
 * so that the routing pipeline can retrieve from multiple dimensions.
 */
export class IntentDecomposer {
  /** Known domains for intent matching against skill categories. */
  static readonly DOMAINS = [...DOMAINS];

  /** Keyword-to-domain mapping used during decomposition. */
  static readonly KEYWORD_MAP = { ...KEYWORD_MAP };

  /** Intent category keyword mapping used during decomposition. */
  static readonly INTENT_MAP = { ...INTENT_MAP };

  /**
   * Decompose a query into weighted intent fragments.
   *
   * Algorithm:
   * 1. Tokenize query (lowercase, split on whitespace/punctuation)
   * 2. Check each token and multi-word span against KEYWORD_MAP and INTENT_MAP
   * 3. Collect matches with raw counts
   * 4. Normalize weights so they sum to 1.0
   * 5. Fallback: if no keywords matched, treat the whole query as a single intent
   */
  static decompose(query: string): DecomposedQuery {
    const trimmed = query.trim();
    if (!trimmed) {
      return { originalQuery: '', fragments: [] };
    }

    // --- Phase 1: Multi-word keyword matching (longest match first) ---
    const rawFragments = new Map<string, number>();
    const lowerQuery = trimmed.toLowerCase();

    // Sort keys by length descending to prefer longer matches
    const sortedKeywords = [...Object.keys(KEYWORD_MAP)].sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      if (!lowerQuery.includes(keyword.toLowerCase())) continue;

      // Count occurrences in the query
      let count = 0;
      let startIndex = 0;
      const lowerKeyword = keyword.toLowerCase();
      while ((startIndex = lowerQuery.indexOf(lowerKeyword, startIndex)) !== -1) {
        count++;
        startIndex += lowerKeyword.length;
      }

      // Map keyword to domains and add as fragments
      const domains = KEYWORD_MAP[keyword] ?? [];
      for (const domain of domains) {
        rawFragments.set(domain, (rawFragments.get(domain) ?? 0) + count);
      }
    }

    // --- Phase 2: Intent category matching ---
    // Build reverse lookup: trigger phrase → intent name
    const phraseToIntent = new Map<string, string>();
    for (const [intentName, phrases] of Object.entries(INTENT_MAP)) {
      for (const phrase of phrases) {
        const lowerPhrase = phrase.toLowerCase();
        // Prefer longer phrases (avoid "test" matching inside "testing")
        if (!phraseToIntent.has(lowerPhrase) || lowerPhrase.length > phraseToIntent.get(lowerPhrase)!.length) {
          phraseToIntent.set(lowerPhrase, intentName);
        }
      }
    }

    // Check each trigger phrase in the query
    const sortedPhrases = [...phraseToIntent.keys()].sort((a, b) => b.length - a.length);
    for (const phrase of sortedPhrases) {
      if (!lowerQuery.includes(phrase)) continue;

      let count = 0;
      let startIndex = 0;
      while ((startIndex = lowerQuery.indexOf(phrase, startIndex)) !== -1) {
        count++;
        startIndex += phrase.length;
      }

      if (count > 0) {
        const intentName = phraseToIntent.get(phrase)!;
        rawFragments.set(intentName, (rawFragments.get(intentName) ?? 0) + count);
      }
    }

    // --- Phase 3: Single-word fallback matching ---
    if (rawFragments.size === 0) {
      // Fallback: tokenize and match individual words
      const tokens = trimmed.toLowerCase().split(/[\s,;:.!?/\\]+/).filter(Boolean);
      for (const token of tokens) {
        // Check keyword map single-word entries
        if (KEYWORD_MAP[token]) {
          for (const domain of KEYWORD_MAP[token]) {
            rawFragments.set(domain, (rawFragments.get(domain) ?? 0) + 1);
          }
        }
      }
    }

    // --- Phase 4: Fallback to single intent if nothing matched ---
    if (rawFragments.size === 0) {
      return {
        originalQuery: trimmed,
        fragments: [{ intent: trimmed.slice(0, 64), weight: 1.0 }],
      };
    }

    // --- Phase 5: Normalize weights to sum to 1.0 ---
    const totalWeight = [...rawFragments.values()].reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      return {
        originalQuery: trimmed,
        fragments: [{ intent: trimmed.slice(0, 64), weight: 1.0 }],
      };
    }

    const fragments: IntentFragment[] = [];
    for (const [intent, rawWeight] of rawFragments) {
      fragments.push({
        intent,
        weight: round(rawWeight / totalWeight, 4),
      });
    }

    // Sort by weight descending, then alphabetically for stability
    fragments.sort((a, b) => b.weight - a.weight || a.intent.localeCompare(b.intent));

    return { originalQuery: trimmed, fragments };
  }
}

/** Round to `digits` decimal places. */
function round(v: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(v * factor) / factor;
}
