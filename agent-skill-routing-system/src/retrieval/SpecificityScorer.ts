// SpecificityScorer — measures how specialized a skill's content is
// versus being generic orchestration-level prose.

/**
 * Expanded set of common English words to filter out (stop words + filler).
 * Any token NOT in this set that also matches a known technical vocabulary
 * counts as a "technical" term.
 */
const ENGLISH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
  'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me',
  'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
  'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
  // Generic skill/implementation filler words
  'skill', 'use', 'implement', 'pattern', 'approach', 'good', 'best',
  'way', 'helps', 'provide', 'guide', 'important', 'make', 'get',
  'also', 'many', 'different', 'various', 'process', 'ensure',
  'useful', 'specific', 'feature', 'your', 'project', 'practices',
  'follow', 'correctly', 'everything', 'works', 'sure', 'help',
  'make', 'provides', 'covers', 'includes', 'based', 'across',
  'designed', 'achieve', 'automate', 'enable', 'support',
]);

/**
 * Common technical/domain vocabulary by category.
 */
const DOMAIN_VOCAB: Record<string, Set<string>> = {
  coding: new Set([
    'algorithm', 'data structure', 'array', 'linked list', 'tree', 'graph',
    'hash map', 'binary search', 'recursion', 'iteration', 'dynamic programming',
    'greedy', 'sorting', 'stack', 'queue', 'heap', 'trie', 'dijkstra',
    'bfs', 'dfs', 'mergesort', 'quicksort', 'complexity', 'time complexity',
    'space complexity', 'big o', 'polynomial', 'logarithmic', 'linear',
    'interface', 'abstract', 'class', 'function', 'method', 'module',
    'package', 'dependency', 'refactor', 'test', 'mock', 'stub',
    'singleton', 'factory', 'observer', 'strategy', 'adapter',
  ]),
  cncf: new Set([
    'kubernetes', 'container', 'pod', 'deployment', 'statefulset', 'daemonset',
    'service mesh', 'istio', 'ingress', 'egress', 'configmap', 'secret',
    'persistent volume', 'volume claim', 'namespace', 'node', 'cluster',
    'etcd', 'kubelet', 'kubectl', 'helm', 'prometheus', 'grafana',
    'alertmanager', 'servicemonitor', 'operator', 'crd', 'rbac', 'network policy',
    'service account', 'role binding', 'ingress controller', 'load balancer',
    'sidecar', 'init container', 'autoscaler', 'docker', 'containerd',
    'flux', 'argo', 'cilium', 'calico', 'envoy', 'vault', 'consul',
  ]),
  trading: new Set([
    'stop loss', 'trailing stop', 'atr', 'average true range', 'bollinger bands',
    'rsi', 'macd', 'vwap', 'volume weighted average price', 'moving average',
    'support level', 'resistance level', 'order book', 'bid ask spread',
    'limit order', 'market order', 'stop limit', 'futures', 'options',
    'crypto', 'bitcoin', 'ethereum', 'derivative', 'hedge', 'portfolio',
    'drawdown', 'sharpe ratio', 'alpha', 'beta', 'volatility', 'correlation',
    'backtest', 'signal', 'conviction', 'position sizing', 'risk management',
    'kelly criterion', 'expected value', 'variance', 'momentum',
  ]),
  agent: new Set([
    'orchestration', 'routing', 'dispatch', 'delegation', 'sub-agent',
    'tool calling', 'function calling', 'context window', 'prompt engineering',
    'agent loop', 'memory', 'planning', 'reasoning', 'reflection',
    'multi-agent', 'coordination', 'fallback', 'retry', 'timeout',
    'concurrency', 'parallel execution', 'agentic', 'autonomous',
  ]),
};

/**
 * Compute specificity score from skill content and metadata.
 * Higher = more specialized, Lower = more generic.
 * Returns [0, 1].
 */
export class SpecificityScorer {
  /**
   * Compute specificity score using technical term density + domain vocabulary ratio.
   */
  static compute(
    _skillName: string,
    description: string,
    tags: string[],
    rawContent?: string
  ): number {
    // Combine description and first 2000 chars of raw content
    const combined = [description];
    if (rawContent) {
      combined.push(rawContent.slice(0, 2000));
    }

    const fullText = [...tags, ...combined].join(' ');

    // Technical density from description + raw content
    const technicalDensity = this.computeTechnicalDensity(combined.join(' '));

    // Domain vocabulary ratio from tags + full text
    const domainRatio = this.computeDomainVocabularyRatio(fullText);

    // Weighted combination: technical density is primary, domain ratio is secondary
    return Math.min(1.0, technicalDensity * 0.7 + domainRatio * 0.3);
  }

  /**
   * Compute technical term density: terms matching known vocab / non-stop-word terms.
   */
  static computeTechnicalDensity(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = this.tokenize(text);
    if (tokens.length === 0) return 0;

    // Filter out stop words and generic filler words
    const meaningfulTokens = tokens.filter(t => !ENGLISH_STOP_WORDS.has(t));
    if (meaningfulTokens.length === 0) return 0;

   // Build word-level domain vocab set (individual words from multi-word terms)
    const vocabWords = this.buildVocabWordSet();

   // Count terms that match any known technical vocabulary
    let techTermCount = 0;
    for (const token of meaningfulTokens) {
      if (vocabWords.has(token)) {
        techTermCount++;
      } else {
        // Heuristic: words with mixed case, numbers, or specific patterns count as technical
        // e.g., "Kubernetes", "ATR-based", "3.14", "PromQL"
        const isCapitalizedOrMixed = token !== token.toLowerCase() && /[A-Z]/.test(token);
        const hasNumbersOrHyphen = /[0-9-]/.test(token) && token.length > 2;
        if (isCapitalizedOrMixed || hasNumbersOrHyphen) {
          techTermCount += 0.5; // Partial credit for heuristic-matched technical terms
        } else {
          techTermCount += 0.1; // Small credit for remaining meaningful words
        }
      }
    }

    const total = meaningfulTokens.length;
    // For very short texts (1-3 terms), apply a dampening factor since
    // single technical words shouldn't score as high as rich technical prose
    if (total <= 3) {
      return Math.min(1.0, techTermCount / total) * 0.5;
    }

    return Math.min(1.0, techTermCount / total);
  }

  /**
   * Compute domain vocabulary ratio: how many terms belong to known domain vocabularies.
   */
  static computeDomainVocabularyRatio(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = this.tokenize(text);
    if (tokens.length === 0) return 0;

    // Filter out stop words first
    const meaningfulTokens = tokens.filter(t => !ENGLISH_STOP_WORDS.has(t));
    if (meaningfulTokens.length === 0) return 0;

  let domainMatchCount = 0;

    // Use word-level domain vocab set for matching
    const vocabWords = this.buildVocabWordSet();

    for (const token of meaningfulTokens) {
      if (vocabWords.has(token)) {
        domainMatchCount++;
      }
    }

    return domainMatchCount / meaningfulTokens.length;
  }

  /**
   * Compute noun entropy (less entropy = more focused/specific domain).
   * Shannon entropy over token frequency distribution, normalized to [0, 1].
   */
  static computeNounEntropy(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = this.tokenize(text);
    if (tokens.length === 0) return 0;

    // Count token frequencies
    const freqMap = new Map<string, number>();
    for (const token of tokens) {
      freqMap.set(token, (freqMap.get(token) ?? 0) + 1);
    }

    const totalTokens = tokens.length;
    let entropy = 0;

    for (const [, count] of freqMap) {
      const p = count / totalTokens;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize: divide by log2(N) to get [0, 1] range
    const maxEntropy = Math.log2(freqMap.size);
    if (maxEntropy === 0) return 0;

    return entropy / maxEntropy;
  }

  /** Tokenize: lowercase, split on non-alphanumeric and hyphens */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric (including hyphens) with space
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Build a set of individual words from all domain vocab terms for substring matching.
   * E.g., "bollinger bands" → {bollinger, bands}
   */
  private static buildVocabWordSet(): Set<string> {
    const wordSet = new Set<string>();
    for (const vocab of Object.values(DOMAIN_VOCAB)) {
      for (const term of vocab) {
        // Split multi-word terms into individual words
        const words = this.tokenize(term);
        for (const w of words) {
          wordSet.add(w);
        }
      }
    }
    return wordSet;
  }
}
