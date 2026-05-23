// TriggerMatchScorer — scores how well query words match skill trigger/tag lists,
// including acronym matching and substring/exact token matching.

/**
 * Score a single query against a skill's triggers and tags.
 * Returns a score in [0, 1].
 */
export class TriggerMatchScorer {
  /**
   * Acronym dictionary for common expansions.
   * Maps acronyms to their expanded forms.
   */
  static readonly ACRONYMS: Record<string, string[]> = {
    'k8s': ['kubernetes'],
    'kuberenetes': ['kubernetes'], // typo variant
    'postgres': ['postgresql', 'postgre sql'],
    'promql': ['prometheus query language'],
    'vwap': ['volume weighted average price'],
    'atr': ['average true range'],
    'rps': ['requests per second'],
    'qps': ['queries per second'],
    'tls': ['transport layer security', 'transport layer encryption'],
    'ssl': ['secure sockets layer', 'ssl tls certificate'],
    'api': ['application programming interface'],
    'sdk': ['software development kit'],
    'ci': ['continuous integration'],
    'cd': ['continuous deployment', 'continuous delivery'],
    'devops': ['development operations', 'dev ops'],
    'db': ['database'],
    'dns': ['domain name system', 'domain name resolution'],
    'ec2': ['elastic compute cloud', 'virtual server instance'],
    'iam': ['identity access management', 'identity and access management'],
    'gpu': ['graphics processing unit', 'accelerator'],
    'cpu': ['central processing unit', 'processor'],
    'ram': ['memory', 'random access memory'],
    'ssd': ['solid state drive', 'disk storage'],
    'hdd': ['hard disk drive', 'disk storage'],
    'podman': ['container runtime', 'container engine'],
    'helm': ['kubernetes package manager', 'chart management'],
    'istio': ['service mesh', 'mesh networking'],
    'etcd': ['distributed key value store', 'configuration store'],
    'grafana': ['dashboard visualization', 'metrics dashboard'],
    'alertmanager': ['alerting system', 'notification routing'],
  };

  /**
   * Score a query against triggers and tags.
   * Returns score in [0, 1].
   */
  static score(query: string, triggers: string[], tags: string[]): number {
    const allItems = [...triggers, ...tags];
    if (allItems.length === 0) return 0;

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return 0;

    let matchedTriggers = 0;
    let totalWeight = 0;

    for (const item of allItems) {
      const itemScore = this.scoreOneTrigger(item, queryTokens);
      totalWeight += 1;
      if (itemScore > 0) {
        // Count weighted contribution toward "matched" count
        matchedTriggers += itemScore;
      }
    }

    // Score = sum of match weights / total triggers, capped at 1.0
    return Math.min(1.0, matchedTriggers / totalWeight);
  }

  /**
   * Score how well a single trigger matches against query tokens.
   * Returns score in [0, 1] — 1 means full match, 0 means no match.
   */
  private static scoreOneTrigger(trigger: string, queryTokens: string[]): number {
    const normalizedTrigger = trigger.toLowerCase().trim();
    if (!normalizedTrigger) return 0;

    // Check 1: Exact token match — a query token exactly equals the whole trigger (or vice versa)
    for (const token of queryTokens) {
      if (token === normalizedTrigger) {
        return 2.0; // Exact match, weighted double
      }
    }

    // Check 2: Trigger is an acronym — check expanded forms against query tokens
    const expansions = this.ACRONYMS[normalizedTrigger];
    if (expansions) {
      for (const expansion of expansions) {
        for (const token of queryTokens) {
          if (token === expansion.toLowerCase()) {
            return 2.0; // Acronym fully expanded in query → exact match
          }
          // Query tokens that together form the expansion
          const expansionTokens = this.tokenize(expansion);
          if (expansionTokens.every(t => queryTokens.includes(t)) && expansionTokens.length > 1) {
            return 2.0;
          }
        }
      }
    }

    // Check 3: Query token is an acronym key — check if any trigger expansion appears in query tokens
    for (const [acronym, expansions] of Object.entries(this.ACRONYMS)) {
      if (queryTokens.includes(acronym.toLowerCase())) {
        for (const expansion of expansions) {
          if (normalizedTrigger.toLowerCase().includes(expansion.toLowerCase()) ||
              expansion.toLowerCase().includes(normalizedTrigger.toLowerCase())) {
            return 2.0;
          }
        }
      }
    }

    // Check 4: Substring match — a query token appears within the trigger string
    for (const token of queryTokens) {
      if (normalizedTrigger.includes(token)) {
        return 1.0; // Partial/token-level match
      }
      // Also check reverse: trigger appears as substring in concatenated query tokens
      const joinedQuery = queryTokens.join(' ');
      if (joinedQuery.includes(normalizedTrigger)) {
        return 1.5; // Trigger fully contained in query text → partial credit
      }
    }

    return 0;
  }

  /** Tokenize: lowercase, split on whitespace/punctuation, filter empty */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric with space
      .split(/\s+/)                    // split on whitespace
      .filter(t => t.length > 0);     // remove empty strings
  }
}
